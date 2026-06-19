/* =========================================================
   Stewybear — moteur audio (100% synthèse Web Audio, aucun fichier)
   - Musique « maison » accueillante
   - Musique « jeu » stressante
   - Bruits de pas quand Stewy marche
   - Crépitement du feu
   ========================================================= */
(function () {
  const Sound = {
    ctx: null,
    master: null,
    musicBus: null,
    sfxBus: null,
    enabled: true,
    currentTrack: null,
    noiseBuf: null,
    fire: null,
    ambience: null,
    _schedId: null,
    _nextTime: 0,
    _step: 0,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this.enabled = false;
        return;
      }
      this.ctx = new AC();

      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.7;
      this.sfxBus.connect(this.master);

      // tampon de bruit blanc réutilisable (pas, crépitement, lit du feu)
      const n = Math.floor(this.ctx.sampleRate * 1.5);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    },

    resume() {
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },

    setEnabled(on) {
      this.enabled = on;
      if (this.master) {
        this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.04);
      }
      try {
        localStorage.setItem("stewy-sound", on ? "1" : "0");
      } catch (e) {
        /* ignore */
      }
    },

    /* --- briques sonores --- */
    tone(time, freq, dur, opt) {
      opt = opt || {};
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      o.type = opt.type || "triangle";
      o.frequency.value = freq;

      const g = ctx.createGain();
      const peak = opt.gain == null ? 0.2 : opt.gain;
      const a = opt.attack == null ? 0.01 : opt.attack;
      const r = opt.release == null ? 0.2 : opt.release;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(peak, time + a);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur + r);

      let head = g;
      if (opt.filter) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = opt.filter;
        o.connect(f);
        f.connect(g);
      } else {
        o.connect(g);
      }
      g.connect(opt.bus || this.musicBus);
      o.start(time);
      o.stop(time + dur + r + 0.05);
      return head;
    },

    noiseBurst(time, dur, opt) {
      opt = opt || {};
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = opt.filterType || "bandpass";
      f.frequency.value = opt.freq || 1500;
      f.Q.value = opt.Q || 1;
      const g = ctx.createGain();
      const peak = opt.gain || 0.2;
      g.gain.setValueAtTime(peak, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(f);
      f.connect(g);
      g.connect(opt.bus || this.sfxBus);
      src.start(time);
      src.stop(time + dur + 0.03);
    },

    /* --- effets --- */
    _stepAt(t) {
      this.noiseBurst(t, 0.09, { freq: 1100, Q: 0.7, gain: 0.16, bus: this.sfxBus });
      this.tone(t, 72, 0.07, { type: "sine", gain: 0.22, attack: 0.005, release: 0.05, bus: this.sfxBus });
    },
    step() {
      if (!this.ctx) return;
      this._stepAt(this.ctx.currentTime);
    },
    steps(n) {
      if (!this.ctx) return;
      const base = this.ctx.currentTime;
      for (let i = 0; i < (n || 1); i++) this._stepAt(base + i * 0.17);
    },
    jump() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.tone(t, 320, 0.14, { type: "square", gain: 0.08, attack: 0.005, release: 0.08, filter: 1400, bus: this.sfxBus });
    },

    /* --- crépitement du feu --- */
    startFire() {
      if (!this.ctx || this.fire) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.value = 0.022;
      src.connect(lp);
      lp.connect(g);
      g.connect(this.sfxBus);
      src.start();

      this.fire = { src, g, timer: null, stopped: false };
      const crackle = () => {
        if (!this.fire || this.fire.stopped) return;
        const t = this.ctx.currentTime;
        this.noiseBurst(t, 0.035, {
          filterType: "highpass",
          freq: 1700,
          gain: 0.02 + Math.random() * 0.045,
          bus: this.sfxBus,
        });
        this.fire.timer = window.setTimeout(crackle, 220 + Math.random() * 620);
      };
      crackle();
    },
    stopFire() {
      if (!this.fire) return;
      this.fire.stopped = true;
      window.clearTimeout(this.fire.timer);
      try {
        this.fire.src.stop();
      } catch (e) {
        /* déjà arrêté */
      }
      this.fire = null;
    },

    /* --- ambiance d'environnement : couche continue (drone/vent/hum) + accents
       ponctuels aléatoires (gouttes, cris, bips…), configurés dans AMBIENCE --- */
    startAmbience(id) {
      this.stopAmbience();
      if (!this.ctx) return;
      const def = AMBIENCE[id];
      if (!def) return;
      const ctx = this.ctx;
      let src, node;
      if (def.bed.kind === "noise") {
        src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = def.bed.filter || "lowpass";
        f.frequency.value = def.bed.freq;
        if (def.bed.Q) f.Q.value = def.bed.Q;
        src.connect(f);
        node = f;
      } else {
        src = ctx.createOscillator();
        src.type = def.bed.type || "sine";
        src.frequency.value = def.bed.freq;
        if (def.bed.lpf) {
          const f = ctx.createBiquadFilter();
          f.type = "lowpass";
          f.frequency.value = def.bed.lpf;
          src.connect(f);
          node = f;
        } else {
          node = src;
        }
      }
      const g = ctx.createGain();
      g.gain.value = def.bed.gain;
      node.connect(g);
      g.connect(this.sfxBus);
      src.start();

      const amb = { src, g, stopped: false, timer: null };
      this.ambience = amb;
      const [lo, hi] = def.every;
      const fire = () => {
        if (!this.ambience || this.ambience.stopped) return;
        def.accent.call(this, this.ctx.currentTime);
        amb.timer = window.setTimeout(fire, lo + Math.random() * (hi - lo));
      };
      amb.timer = window.setTimeout(fire, 300 + Math.random() * 700);
    },
    stopAmbience() {
      if (!this.ambience) return;
      this.ambience.stopped = true;
      window.clearTimeout(this.ambience.timer);
      try {
        this.ambience.src.stop();
      } catch (e) {
        /* déjà arrêté */
      }
      this.ambience = null;
    },

    /* --- séquenceur musique --- */
    _sched() {
      const def = TRACKS[this.currentTrack];
      if (!def) {
        this._nextTime = this.ctx.currentTime;
        return;
      }
      while (this._nextTime < this.ctx.currentTime + 0.12) {
        def.tick.call(this, this._step % def.length, this._nextTime);
        this._nextTime += def.stepDur;
        this._step += 1;
      }
    },
    _startScheduler() {
      if (this._schedId) return;
      this._nextTime = this.ctx.currentTime + 0.06;
      this._schedId = window.setInterval(() => this._sched(), 25);
    },
    _stopScheduler() {
      if (this._schedId) {
        window.clearInterval(this._schedId);
        this._schedId = null;
      }
    },
    setTrack(name) {
      this.currentTrack = name;
      this._step = 0;
      if (this.ctx) this._nextTime = this.ctx.currentTime + 0.06;
      this._startScheduler();
    },

    playHouse() {
      this.init();
      if (!this.ctx) return;
      this.resume();
      this.stopAmbience();
      this.setTrack("house");
      this.startFire();
    },
    playGame() {
      this.init();
      if (!this.ctx) return;
      this.resume();
      this.stopFire();
      this.stopAmbience();
      this.setTrack("game");
    },
    // Musique + ambiance propres à un environnement du donjon (sewers, city, …).
    // Repli sur la musique « game » générique si l'environnement est inconnu.
    playFloor(id) {
      this.init();
      if (!this.ctx) return;
      this.resume();
      this.stopFire();
      this.setTrack(TRACKS["floor:" + id] ? "floor:" + id : "game");
      this.startAmbience(id);
    },
    stopMusic() {
      this.currentTrack = null;
      this._stopScheduler();
      this.stopFire();
      this.stopAmbience();
    },
  };

  /* --- définitions des deux morceaux --- */
  const TRACKS = {
    // Accueillante : progression douce vi–IV–I–V en do majeur, nappe chaude + mélodie clairsemée
    house: {
      stepDur: 0.5,
      length: 16,
      chords: [
        [220.0, 261.63, 329.63], // Am
        [174.61, 220.0, 261.63], // F
        [261.63, 329.63, 392.0], // C
        [196.0, 246.94, 293.66], // G
      ],
      melody: { 6: 329.63, 13: 392.0 },
      tick(i, time) {
        if (i % 4 === 0) {
          const chord = TRACKS.house.chords[((i / 4) | 0) % 4];
          chord.forEach((f) =>
            this.tone(time, f, 1.95, {
              type: "triangle",
              gain: 0.05,
              attack: 0.5,
              release: 1.4,
              filter: 760,
              bus: this.musicBus,
            })
          );
        }
        const m = TRACKS.house.melody[i];
        if (m) {
          this.tone(time, m, 0.85, {
            type: "sine",
            gain: 0.035,
            attack: 0.06,
            release: 0.75,
            bus: this.musicBus,
          });
        }
      },
    },

    // Stressante : la mineur rapide, arpège tendu + basse pulsée + note dissonante
    game: {
      stepDur: 0.14,
      length: 16,
      arp: [220.0, 261.63, 329.63, 440.0, 329.63, 261.63, 329.63, 440.0],
      tick(i, time) {
        const arp = TRACKS.game.arp;
        this.tone(time, arp[i % arp.length], 0.12, {
          type: "sawtooth",
          gain: 0.04,
          attack: 0.005,
          release: 0.08,
          filter: 1800,
          bus: this.musicBus,
        });
        if (i % 4 === 0) {
          const bass = i % 8 === 0 ? 110.0 : 146.83;
          this.tone(time, bass, 0.26, {
            type: "square",
            gain: 0.07,
            attack: 0.005,
            release: 0.12,
            filter: 600,
            bus: this.musicBus,
          });
        }
        if (i % 8 === 6) {
          this.tone(time, 466.16, 0.16, {
            type: "sawtooth",
            gain: 0.045,
            attack: 0.005,
            release: 0.1,
            filter: 2200,
            bus: this.musicBus,
          });
        }
      },
    },
  };

  /* --- Musique propre à chaque environnement du donjon -----------------
     Générateur paramétré : basse pulsée + motif mélodique sur une gamme +
     nappe et accent optionnels. Chaque chapitre a sa couleur (tempo, gamme,
     timbre) pour une atmosphère distincte. (0 dans `mel` = silence rythmé) */
  function floorTrack(cfg) {
    return {
      stepDur: cfg.stepDur,
      length: cfg.length || 16,
      tick(i, time) {
        const c = cfg;
        if (c.bass && i % c.bassEvery === 0) {
          const f = c.bass[((i / c.bassEvery) | 0) % c.bass.length];
          if (f) this.tone(time, f, c.bassDur, { type: c.bassWave, gain: c.bassGain, attack: 0.005, release: c.bassRel, filter: c.bassFilter, bus: this.musicBus });
        }
        if (c.mel && i % c.melEvery === 0) {
          const f = c.mel[((i / c.melEvery) | 0) % c.mel.length];
          if (f) this.tone(time, f, c.melDur, { type: c.melWave, gain: c.melGain, attack: c.melAtt, release: c.melRel, filter: c.melFilter, bus: this.musicBus });
        }
        if (c.pad && i % (c.padEvery || c.length) === 0) {
          const chord = c.pad[((i / (c.padEvery || c.length)) | 0) % c.pad.length];
          chord.forEach((f) => this.tone(time, f, c.padDur || 2, { type: c.padWave || "triangle", gain: c.padGain || 0.03, attack: c.padAtt || 0.4, release: c.padRel || 1.2, filter: c.padFilter || 700, bus: this.musicBus }));
        }
        if (c.accent && i % (c.length || 16) === c.accent.at) {
          this.tone(time, c.accent.freq, c.accent.dur || 0.3, { type: c.accent.wave || "sawtooth", gain: c.accent.gain || 0.04, attack: 0.005, release: 0.2, filter: c.accent.filter || 2000, bus: this.musicBus });
        }
      },
    };
  }

  // Égouts : lent, caverneux, hanté (la mineur, basses profondes, gouttes mélodiques)
  TRACKS["floor:sewers"] = floorTrack({
    stepDur: 0.34,
    bass: [110.0, 87.31, 98.0, 110.0], bassEvery: 8, bassDur: 1.4, bassWave: "triangle", bassGain: 0.06, bassFilter: 360, bassRel: 0.8,
    mel: [220.0, 0, 261.63, 0, 329.63, 0, 246.94, 0], melEvery: 2, melDur: 0.5, melWave: "sine", melGain: 0.032, melFilter: 900, melAtt: 0.04, melRel: 0.5,
    pad: [[164.81, 220.0, 261.63]], padEvery: 16, padDur: 4, padGain: 0.022, padFilter: 500,
  });
  // Ville : nuit désolée, mélancolique (descente mineure, basse carrée régulière)
  TRACKS["floor:city"] = floorTrack({
    stepDur: 0.26,
    bass: [110.0, 146.83, 130.81, 98.0], bassEvery: 4, bassDur: 0.5, bassWave: "square", bassGain: 0.05, bassFilter: 500, bassRel: 0.15,
    mel: [329.63, 293.66, 261.63, 246.94, 261.63, 293.66, 220.0, 246.94], melEvery: 2, melDur: 0.3, melWave: "triangle", melGain: 0.035, melFilter: 1400, melAtt: 0.02, melRel: 0.25,
  });
  // Zoo : étrange, clairsemé, intervalles larges (triton dissonant en accent)
  TRACKS["floor:zoo"] = floorTrack({
    stepDur: 0.32,
    bass: [98.0, 116.54, 87.31, 98.0], bassEvery: 8, bassDur: 1.2, bassWave: "triangle", bassGain: 0.05, bassFilter: 400, bassRel: 0.7,
    mel: [220.0, 0, 0, 349.23, 0, 0, 311.13, 0], melEvery: 2, melDur: 0.6, melWave: "sine", melGain: 0.03, melFilter: 1100, melAtt: 0.05, melRel: 0.6,
    accent: { at: 14, freq: 415.3, wave: "sawtooth", gain: 0.03, dur: 0.4, filter: 1600 },
  });
  // Ferme : folk mineur plus rapide, énergie fiévreuse (pentatonique nerveuse)
  TRACKS["floor:farm"] = floorTrack({
    stepDur: 0.2,
    bass: [146.83, 110.0, 130.81, 110.0], bassEvery: 4, bassDur: 0.32, bassWave: "square", bassGain: 0.05, bassFilter: 600, bassRel: 0.12,
    mel: [293.66, 329.63, 392.0, 329.63, 293.66, 261.63, 293.66, 0], melEvery: 2, melDur: 0.2, melWave: "triangle", melGain: 0.035, melFilter: 1600, melAtt: 0.01, melRel: 0.16,
  });
  // Hôpital : froid, clinique, oppressant (aigus chromatiques, basse sinus grave)
  TRACKS["floor:hospital"] = floorTrack({
    stepDur: 0.3,
    bass: [123.47, 116.54, 110.0, 123.47], bassEvery: 8, bassDur: 1.3, bassWave: "sine", bassGain: 0.045, bassFilter: 300, bassRel: 0.8,
    mel: [659.25, 0, 622.25, 0, 0, 587.33, 0, 0], melEvery: 2, melDur: 0.35, melWave: "sine", melGain: 0.028, melFilter: 2600, melAtt: 0.01, melRel: 0.3,
    accent: { at: 12, freq: 698.46, wave: "triangle", gain: 0.025, dur: 0.5, filter: 3000 },
  });
  // Labo : finale rapide, mécanique, tendue (arpège diminué, basse chromatique)
  TRACKS["floor:lab"] = floorTrack({
    stepDur: 0.13,
    bass: [110.0, 110.0, 103.83, 110.0], bassEvery: 4, bassDur: 0.24, bassWave: "square", bassGain: 0.07, bassFilter: 600, bassRel: 0.1,
    mel: [220.0, 261.63, 311.13, 369.99, 311.13, 261.63, 311.13, 415.3], melEvery: 1, melDur: 0.11, melWave: "sawtooth", melGain: 0.04, melFilter: 2000, melAtt: 0.005, melRel: 0.07,
    accent: { at: 8, freq: 466.16, wave: "sawtooth", gain: 0.045, dur: 0.16, filter: 2400 },
  });

  /* --- Ambiances par environnement : `bed` = couche continue, `accent` =
     son ponctuel rejoué à intervalle aléatoire dans la plage `every` (ms) --- */
  const AMBIENCE = {
    sewers: {
      bed: { kind: "noise", filter: "lowpass", freq: 240, gain: 0.02 },
      every: [600, 1900],
      accent(t) { // goutte d'eau
        this.tone(t, 760 + Math.random() * 520, 0.05, { type: "sine", gain: 0.05, attack: 0.002, release: 0.16, bus: this.sfxBus });
      },
    },
    city: {
      bed: { kind: "noise", filter: "bandpass", freq: 480, Q: 0.5, gain: 0.022 },
      every: [1400, 3600],
      accent(t) { // rafale de vent
        this.noiseBurst(t, 0.6, { filterType: "bandpass", freq: 280 + Math.random() * 240, Q: 0.6, gain: 0.02, bus: this.sfxBus });
      },
    },
    zoo: {
      bed: { kind: "noise", filter: "lowpass", freq: 300, gain: 0.016 },
      every: [2400, 6000],
      accent(t) { // cri animal lointain (glissando descendant)
        const ctx = this.ctx;
        const o = ctx.createOscillator(); o.type = "sawtooth";
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.03, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.frequency.setValueAtTime(320 + Math.random() * 120, t);
        o.frequency.exponentialRampToValueAtTime(170, t + 0.55);
        const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1300;
        o.connect(f); f.connect(g); g.connect(this.sfxBus);
        o.start(t); o.stop(t + 0.62);
      },
    },
    farm: {
      bed: { kind: "noise", filter: "bandpass", freq: 420, Q: 0.4, gain: 0.02 },
      every: [1600, 4200],
      accent(t) { // craquement de bois
        this.tone(t, 80 + Math.random() * 40, 0.4, { type: "sawtooth", gain: 0.022, attack: 0.04, release: 0.32, filter: 480, bus: this.sfxBus });
      },
    },
    hospital: {
      bed: { kind: "osc", type: "sine", freq: 120, gain: 0.014 },
      every: [1300, 1500],
      accent(t) { // bip de moniteur cardiaque
        this.tone(t, 1760, 0.08, { type: "sine", gain: 0.03, attack: 0.002, release: 0.06, bus: this.sfxBus });
      },
    },
    lab: {
      bed: { kind: "osc", type: "sawtooth", freq: 58, lpf: 200, gain: 0.012 },
      every: [600, 1500],
      accent(t) { // bip électronique glitché
        this.tone(t, 380 + Math.random() * 1300, 0.04, { type: "square", gain: 0.025, attack: 0.002, release: 0.03, filter: 3200, bus: this.sfxBus });
      },
    },
  };

  // pause l'audio quand l'onglet est masqué
  document.addEventListener("visibilitychange", () => {
    if (!Sound.ctx) return;
    if (document.hidden) {
      Sound.ctx.suspend();
    } else if (Sound.enabled) {
      Sound.ctx.resume();
    }
  });

  window.Sound = Sound;
})();
