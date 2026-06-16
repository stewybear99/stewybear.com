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
      this.setTrack("house");
      this.startFire();
    },
    playGame() {
      this.init();
      if (!this.ctx) return;
      this.resume();
      this.stopFire();
      this.setTrack("game");
    },
    stopMusic() {
      this.currentTrack = null;
      this._stopScheduler();
      this.stopFire();
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
