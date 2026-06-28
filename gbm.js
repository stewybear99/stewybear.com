/* =========================================================
   GRAND BEAR MAFIA (GBM) — mini-jeu 3D « bac à sable » style GTA
   ---------------------------------------------------------
   Un ours-mafieux dans une petite ville low-poly. On marche,
   on monte en voiture, on conduit, on braque des banques en
   douce… et la police (des ours-flics) débarque selon le
   niveau de recherche (les « étoiles »).

   Tout est volontairement cubique et simple : pas d'ombres,
   matériaux Lambert, bâtiments en InstancedMesh, collisions
   AABB maison (pas de moteur physique). Le jeu vit dans son
   PROPRE canevas / sa propre scène Three.js, séparé de la
   chambre 3D du site (scene3d.js).

   API exposée au site : window.GBM = { open, close, isOpen, setLang }
   ========================================================= */
import * as THREE from "https://esm.sh/three@0.160.0";

(function () {
  "use strict";

  /* =======================================================
     1. État global du jeu
     ======================================================= */
  const G = {
    inited: false, // la scène 3D est-elle déjà construite ?
    open: false, // l'overlay est-il affiché ?
    state: "menu", // "menu" | "play" | "pause" | "over"
    mode: "foot", // "foot" (à pied) | "drive" (en voiture)
    lang: "fr",
    rafId: 0,
    clock: null,
    // Trois.js
    renderer: null,
    scene: null,
    camera: null,
    // Acteurs
    player: null, // { obj, pos, heading, vel, radius, walkPhase }
    car: null, // voiture actuellement conduite (ou null)
    world: { blockers: [], cars: [], heists: [], cops: [] },
    // Caméra
    camYaw: 0,
    camLook: new THREE.Vector3(),
    // Jeu
    cash: 0,
    wanted: 0, // 0..5 étoiles
    sinceCrime: 999, // secondes depuis le dernier délit (sert à faire baisser les étoiles)
    bustTimer: 0, // temps passé au contact de la police
    copTimer: 0, // cadence d'apparition des flics
    heisting: null, // marqueur de braquage en cours
    heistProg: 0, // progression du braquage 0..1
    nearCarMsgShown: false,
  };

  // Palette cubique (réchauffée, façon « San Andreas » de nuit).
  const COL = {
    ground: 0x20242e,
    road: 0x14161d,
    line: 0xb9a14a,
    sidewalk: 0x3a3f4b,
    sky: 0x141826,
    fog: 0x141826,
    bear: 0x8a5a30,
    bearDark: 0x6e4422,
    bearBelly: 0xd7a166,
    ink: 0x140f0b,
    carBodies: [0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22, 0xecf0f1],
    cop: 0x1b2a4a,
    copLight: 0x3a4f7a,
    buildings: [0x4a4f5c, 0x5a4438, 0x415049, 0x55505f, 0x6a5340, 0x3f4a5a, 0x4f4646],
    heist: 0xffc23a,
    moneyGreen: 0x3fbf6f,
  };

  // Dimensions de la ville.
  const CELL = 26; // taille d'une « case » (bâtiment + route autour)
  const GRID = 7; // GRID x GRID cases
  const HALF = (GRID * CELL) / 2; // demi-largeur du monde
  const BOUND = HALF - 2; // limite jouable (on ne sort pas de la ville)

  /* =======================================================
     2. Références DOM + petits utilitaires
     ======================================================= */
  const $ = (sel) => document.querySelector(sel);
  let el = {}; // rempli à l'init (les éléments existent dès le chargement du module)

  function grabDom() {
    el = {
      section: $(".gbm-game"),
      canvas: $(".gbm-canvas"),
      close: $(".gbm-close"),
      hud: $(".gbm-hud"),
      stars: $(".gbm-stars"),
      cash: $(".gbm-cash-val"),
      heist: $(".gbm-heist"),
      heistFill: $(".gbm-heist-fill"),
      heistLabel: $(".gbm-heist-label"),
      hint: $(".gbm-hint-bottom"),
      start: $(".gbm-start"),
      pause: $(".gbm-pause"),
      over: $(".gbm-over"),
      overTitle: $(".gbm-over-title"),
      overMsg: $(".gbm-over-msg"),
      play: $(".gbm-play"),
      resume: $(".gbm-resume"),
      retry: $(".gbm-retry"),
      quit: $(".gbm-quit"),
      quit2: $(".gbm-quit2"),
      title: $(".gbm-title"),
      sub: $(".gbm-sub"),
      controls: $(".gbm-controls"),
      foot: $(".gbm-foot"),
    };
  }

  // Petit son d'effet via le moteur audio du site (window.Sound).
  function sfx(freq, dur, opt) {
    const S = window.Sound;
    if (!S || !S.enabled || !S.ctx) return;
    S.tone(S.ctx.currentTime, freq, dur, Object.assign({ bus: S.sfxBus, gain: 0.16 }, opt || {}));
  }
  function noise(dur, opt) {
    const S = window.Sound;
    if (!S || !S.enabled || !S.ctx || !S.noiseBuf) return;
    S.noiseBurst(S.ctx.currentTime, dur, Object.assign({ bus: S.sfxBus }, opt || {}));
  }

  // Interpolation d'angle au plus court chemin (gère le passage ±π).
  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* =======================================================
     3. Internationalisation (textes du jeu)
     ======================================================= */
  const I18N = {
    fr: {
      title: "GRAND BEAR MAFIA",
      sub: "Un ours. Une ville. Des braquages.",
      play: "Jouer",
      pause: "Pause",
      resume: "Reprendre",
      quit: "Quitter",
      retry: "Rejouer",
      busted: "ARRÊTÉ !",
      bustedMsg: "La police t'a coffré. Butin perdu : $",
      footHint: "ZQSD/Flèches · E voiture · Espace braquer · Échap pause",
      controls: [
        "ZQSD / Flèches : se déplacer",
        "E : monter / descendre d'une voiture",
        "Espace : braquer (dans une zone) · frein en voiture",
        "Échap : pause",
      ],
      hintFoot: "Trouve une zone dorée 💰 et braque-la. Monte en voiture avec E.",
      hintNearCar: "Appuie sur E pour monter dans la voiture",
      hintDrive: "Tu conduis ! E pour descendre. Espace = frein.",
      hintHeistZone: "Reste ici et maintiens Espace pour braquer 💰",
      hintHeisting: "Braquage en cours… ne bouge pas !",
      hintWanted: "Recherché ! Sème les flics pour faire baisser les étoiles.",
      heistDone: "Braquage réussi ! +$",
    },
    en: {
      title: "GRAND BEAR MAFIA",
      sub: "A bear. A city. Some heists.",
      play: "Play",
      pause: "Pause",
      resume: "Resume",
      quit: "Quit",
      retry: "Play again",
      busted: "BUSTED!",
      bustedMsg: "The cops nabbed you. Loot lost: $",
      footHint: "WASD/Arrows · E car · Space rob · Esc pause",
      controls: [
        "WASD / Arrows: move",
        "E: enter / exit a car",
        "Space: rob (inside a zone) · brake in a car",
        "Esc: pause",
      ],
      hintFoot: "Find a golden zone 💰 and rob it. Hop in a car with E.",
      hintNearCar: "Press E to get in the car",
      hintDrive: "You're driving! E to exit. Space = brake.",
      hintHeistZone: "Stay here and hold Space to rob 💰",
      hintHeisting: "Robbing… don't move!",
      hintWanted: "Wanted! Lose the cops to drop your stars.",
      heistDone: "Heist done! +$",
    },
    es: {
      title: "GRAND BEAR MAFIA",
      sub: "Un oso. Una ciudad. Atracos.",
      play: "Jugar",
      pause: "Pausa",
      resume: "Continuar",
      quit: "Salir",
      retry: "Jugar de nuevo",
      busted: "¡ATRAPADO!",
      bustedMsg: "La poli te pilló. Botín perdido: $",
      footHint: "WASD/Flechas · E coche · Espacio atracar · Esc pausa",
      controls: [
        "WASD / Flechas: moverse",
        "E: entrar / salir de un coche",
        "Espacio: atracar (en una zona) · freno en coche",
        "Esc: pausa",
      ],
      hintFoot: "Busca una zona dorada 💰 y atrácala. Sube a un coche con E.",
      hintNearCar: "Pulsa E para subir al coche",
      hintDrive: "¡Estás conduciendo! E para bajar. Espacio = freno.",
      hintHeistZone: "Quédate aquí y mantén Espacio para atracar 💰",
      hintHeisting: "Atracando… ¡no te muevas!",
      hintWanted: "¡Buscado! Despista a la poli para bajar estrellas.",
      heistDone: "¡Atraco logrado! +$",
    },
  };
  const T = (k) => (I18N[G.lang] && I18N[G.lang][k]) || I18N.fr[k] || k;

  function applyTexts() {
    if (!el.title) return;
    el.title.textContent = T("title");
    if (el.sub) el.sub.textContent = T("sub");
    if (el.play) el.play.textContent = T("play");
    if (el.resume) el.resume.textContent = T("resume");
    if (el.retry) el.retry.textContent = T("retry");
    if (el.quit) el.quit.textContent = T("quit");
    if (el.quit2) el.quit2.textContent = T("quit");
    if (el.foot) el.foot.textContent = T("footHint");
    if (el.heistLabel) el.heistLabel.textContent = T("hintHeisting");
    if (el.controls) {
      el.controls.innerHTML = "";
      T("controls").forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        el.controls.appendChild(p);
      });
    }
    // Le titre de l'écran de fin est géré dynamiquement (BUSTED / etc.).
    if (el.pause) {
      const pt = el.pause.querySelector(".gbm-title");
      if (pt) pt.textContent = T("pause");
    }
  }

  /* =======================================================
     4. Matériaux & géométries partagés (réutilisés partout)
     ======================================================= */
  const GEO = { box: new THREE.BoxGeometry(1, 1, 1) };
  const matCache = new Map();
  function mat(color, opts) {
    opts = opts || {};
    const key = color + "|" + (opts.emissive || 0) + "|" + (opts.transparent ? 1 : 0);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshLambertMaterial({
      color,
      emissive: opts.emissive || 0x000000,
      transparent: !!opts.transparent,
      opacity: opts.opacity == null ? 1 : opts.opacity,
    });
    matCache.set(key, m);
    return m;
  }

  // Petit cube positionné (équivalent du helper box() de room.js).
  function box(w, h, d, color, x, y, z, parent, opts) {
    const m = new THREE.Mesh(GEO.box, mat(color, opts));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  /* =======================================================
     5. Construction de la ville
     ======================================================= */
  function buildWorld() {
    const scene = G.scene;
    G.world = { blockers: [], cars: [], heists: [], cops: [] };

    // Sol global
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF * 2 + 40, HALF * 2 + 40),
      mat(COL.ground)
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Routes : une grande grille de bandes sombres entre les cases.
    const roadMat = mat(COL.road);
    const roadW = CELL * 0.42; // largeur de chaussée
    for (let i = 0; i <= GRID; i++) {
      const c = -HALF + i * CELL;
      // route horizontale (le long de X)
      const rh = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, roadW), roadMat);
      rh.rotation.x = -Math.PI / 2;
      rh.position.set(0, 0.02, c);
      scene.add(rh);
      // route verticale (le long de Z)
      const rv = new THREE.Mesh(new THREE.PlaneGeometry(roadW, HALF * 2), roadMat);
      rv.rotation.x = -Math.PI / 2;
      rv.position.set(c, 0.02, 0);
      scene.add(rv);
    }
    // Lignes blanches au centre des routes horizontales (déco).
    const lineMat = mat(COL.line, { emissive: COL.line });
    for (let i = 0; i <= GRID; i++) {
      const c = -HALF + i * CELL;
      for (let x = -HALF + 3; x < HALF; x += 6) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.4), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, 0.03, c);
        scene.add(dash);
      }
    }

    // Bâtiments : un par case (avec quelques cases laissées vides = placettes).
    // On les fabrique en InstancedMesh pour tenir des dizaines de blocs sans
    // peser sur la perf.
    const footprint = CELL * 0.58; // côté du bâtiment
    const candidates = [];
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        // case centrée entre deux routes
        const cx = -HALF + CELL / 2 + i * CELL;
        const cz = -HALF + CELL / 2 + j * CELL;
        // ~20 % de placettes vides + on évite de boucher pile le centre (spawn)
        const isCenter = i === (GRID >> 1) && j === (GRID >> 1);
        if (isCenter) continue;
        if (pseudoRand(i * 31 + j * 7) < 0.18) continue;
        candidates.push({ cx, cz, i, j });
      }
    }

    const inst = new THREE.InstancedMesh(GEO.box, mat(0xffffff), candidates.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const colObj = new THREE.Color();
    candidates.forEach((c, idx) => {
      const r = pseudoRand(c.i * 13 + c.j * 17 + 1);
      const h = 6 + r * 22; // hauteur du bâtiment
      pos.set(c.cx, h / 2, c.cz);
      sc.set(footprint, h, footprint);
      m4.compose(pos, q, sc);
      inst.setMatrixAt(idx, m4);
      colObj.set(COL.buildings[(c.i * 3 + c.j) % COL.buildings.length]);
      inst.setColorAt(idx, colObj);
      // Collision : rectangle AABB au sol (étendu plus tard du rayon de l'acteur).
      const half = footprint / 2;
      G.world.blockers.push({
        minX: c.cx - half,
        maxX: c.cx + half,
        minZ: c.cz - half,
        maxZ: c.cz + half,
      });
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    scene.add(inst);

    // Quelques voitures garées sur les routes.
    const carSlots = [
      [-HALF + CELL, 0, -HALF + CELL * 1.5],
      [HALF - CELL, 0, -HALF + CELL * 2.5],
      [-HALF + CELL * 2.5, 0, HALF - CELL],
      [HALF - CELL * 1.5, 0, HALF - CELL * 2.5],
      [0, 0, -CELL],
    ];
    carSlots.forEach((s, k) => {
      const color = COL.carBodies[k % COL.carBodies.length];
      const car = makeCar(color, false);
      car.pos.set(s[0], 0, s[2]);
      car.heading = k % 2 ? Math.PI / 2 : 0;
      syncCar(car);
      G.world.cars.push(car);
    });

    // Marqueurs de braquage : cylindres dorés posés sur des INTERSECTIONS de
    // routes (zones dégagées : les coordonnées -HALF + k*CELL tombent pile sur
    // une route, jamais dans un bâtiment).
    const heistSpots = [
      [-HALF + 2 * CELL, -HALF + 2 * CELL],
      [HALF - 2 * CELL, HALF - 2 * CELL],
      [-HALF + 2 * CELL, HALF - 2 * CELL],
      [HALF - 2 * CELL, -HALF + 2 * CELL],
    ];
    heistSpots.forEach((s) => addHeist(s[0], s[1]));

    // Lune décorative au loin (clin d'œil au reste du site).
    box(8, 8, 8, COL.heist, -HALF, 40, -HALF, scene, { emissive: 0x4a3a10 });
  }

  // Générateur pseudo-aléatoire déterministe (pour que la ville soit stable).
  function pseudoRand(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function addHeist(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    // anneau au sol
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 0.2, 16),
      mat(COL.heist, { emissive: 0x6a4e00, transparent: true, opacity: 0.5 })
    );
    ring.position.y = 0.1;
    g.add(ring);
    // colonne de lumière
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 10, 12, 1, true),
      mat(COL.heist, { emissive: 0x6a4e00, transparent: true, opacity: 0.18 })
    );
    beam.position.y = 5;
    g.add(beam);
    // petit sac de billets flottant
    const bag = box(1.4, 1.4, 1.4, COL.moneyGreen, 0, 2, 0, g, { emissive: 0x10401f });
    G.scene.add(g);
    G.world.heists.push({ obj: g, beam, bag, x, z, radius: 3, cooldown: 0, reward: 800 + Math.floor(pseudoRand(x + z) * 1200) });
  }

  /* =======================================================
     6. Modèles : ours, voiture, flic
     ======================================================= */
  function makeBear(furColor) {
    const g = new THREE.Group();
    const body = box(1.3, 1.2, 0.95, furColor, 0, 1.0, 0, g);
    box(0.75, 0.85, 0.45, COL.bearBelly, 0, 0.95, 0.34, g); // ventre (devant = +z)
    const head = box(1.0, 0.95, 0.95, furColor, 0, 1.95, 0.05, g);
    box(0.32, 0.32, 0.22, COL.bearDark, -0.42, 2.45, 0.05, g); // oreille G
    box(0.32, 0.32, 0.22, COL.bearDark, 0.42, 2.45, 0.05, g); // oreille D
    box(0.46, 0.36, 0.28, COL.bearBelly, 0, 1.82, 0.5, g); // museau
    box(0.13, 0.13, 0.1, COL.ink, -0.24, 2.05, 0.52, g); // œil G
    box(0.13, 0.13, 0.1, COL.ink, 0.24, 2.05, 0.52, g); // œil D
    box(0.14, 0.1, 0.1, COL.ink, 0, 1.88, 0.66, g); // truffe
    // pattes animées
    const legL = box(0.4, 0.85, 0.45, COL.bearDark, -0.32, 0.42, 0, g);
    const legR = box(0.4, 0.85, 0.45, COL.bearDark, 0.32, 0.42, 0, g);
    // bras
    const armL = box(0.3, 0.8, 0.35, furColor, -0.78, 1.05, 0, g);
    const armR = box(0.3, 0.8, 0.35, furColor, 0.78, 1.05, 0, g);
    g.userData.limbs = { legL, legR, armL, armR, head, body };
    return g;
  }

  function makeCar(color, isCop) {
    const g = new THREE.Group();
    box(2.0, 0.7, 4.0, color, 0, 0.55, 0, g); // châssis
    box(1.7, 0.7, 2.2, color, 0, 1.15, -0.2, g); // cabine
    // vitres
    box(1.5, 0.5, 2.0, 0x0a0e16, 0, 1.2, -0.2, g, { emissive: 0x05080f });
    // roues
    const wy = 0.45;
    box(0.5, 0.7, 0.7, COL.ink, -1.0, wy, 1.3, g);
    box(0.5, 0.7, 0.7, COL.ink, 1.0, wy, 1.3, g);
    box(0.5, 0.7, 0.7, COL.ink, -1.0, wy, -1.3, g);
    box(0.5, 0.7, 0.7, COL.ink, 1.0, wy, -1.3, g);
    // phares avant (+z = avant)
    box(0.4, 0.25, 0.15, 0xffe08a, -0.6, 0.6, 2.0, g, { emissive: 0x6a5a20 });
    box(0.4, 0.25, 0.15, 0xffe08a, 0.6, 0.6, 2.0, g, { emissive: 0x6a5a20 });
    if (isCop) {
      // gyrophare
      box(0.5, 0.3, 0.5, 0xff3b30, -0.35, 1.6, -0.2, g, { emissive: 0x661010 });
      box(0.5, 0.3, 0.5, 0x3b7bff, 0.35, 1.6, -0.2, g, { emissive: 0x102066 });
    }
    G.scene.add(g);
    return {
      obj: g,
      pos: new THREE.Vector3(),
      heading: 0,
      speed: 0,
      radius: 2.0,
      isCop,
      bustContact: 0,
    };
  }

  function syncCar(car) {
    car.obj.position.copy(car.pos);
    car.obj.rotation.y = car.heading;
  }

  /* =======================================================
     7. Entrées clavier
     ======================================================= */
  const keys = {};
  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    keys[k] = true;
    // touches qui font défiler/agir le navigateur : on bloque pendant le jeu
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (k === "escape") togglePause();
    if (k === "e") tryEnterExit();
  }
  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }
  // Vecteur d'intention (gauche/droite, avant/arrière) lu depuis les touches.
  function readInput() {
    const left = keys["arrowleft"] || keys["a"] || keys["q"]; // AZERTY: Q = gauche
    const right = keys["arrowright"] || keys["d"];
    const up = keys["arrowup"] || keys["w"] || keys["z"]; // AZERTY: Z = avant
    const down = keys["arrowdown"] || keys["s"];
    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      z: (up ? 1 : 0) - (down ? 1 : 0),
      brake: !!keys[" "],
    };
  }

  /* =======================================================
     8. Collisions (cercle d'acteur vs rectangles AABB)
     ======================================================= */
  // Déplace une position d'acteur en bloquant sur les bâtiments, axe par axe
  // (pour qu'on « glisse » le long des murs au lieu de se coller).
  function moveCollide(pos, dx, dz, radius) {
    pos.x += dx;
    for (const b of G.world.blockers) {
      if (pos.x > b.minX - radius && pos.x < b.maxX + radius && pos.z > b.minZ - radius && pos.z < b.maxZ + radius) {
        // on ressort selon X (l'axe qu'on vient de bouger)
        pos.x = dx > 0 ? b.minX - radius : b.maxX + radius;
      }
    }
    pos.z += dz;
    for (const b of G.world.blockers) {
      if (pos.x > b.minX - radius && pos.x < b.maxX + radius && pos.z > b.minZ - radius && pos.z < b.maxZ + radius) {
        pos.z = dz > 0 ? b.minZ - radius : b.maxZ + radius;
      }
    }
    // limites du monde
    pos.x = clamp(pos.x, -BOUND, BOUND);
    pos.z = clamp(pos.z, -BOUND, BOUND);
  }

  /* =======================================================
     9. Entrer / sortir d'une voiture (touche E)
     ======================================================= */
  function nearestCar(maxDist) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const c of G.world.cars) {
      if (c.isCop) continue;
      const dx = c.pos.x - G.player.pos.x;
      const dz = c.pos.z - G.player.pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  function tryEnterExit() {
    if (G.state !== "play") return;
    if (G.mode === "foot") {
      const c = nearestCar(5);
      if (c) {
        G.mode = "drive";
        G.car = c;
        G.player.obj.visible = false;
        G.camYaw = c.heading;
        sfx(180, 0.12, { type: "square", gain: 0.12 });
      }
    } else {
      // descendre : l'ours réapparaît à gauche de la voiture
      const c = G.car;
      const ox = Math.cos(c.heading); // côté gauche (perpendiculaire à l'avant)
      const oz = -Math.sin(c.heading);
      G.player.pos.set(c.pos.x + ox * 2.6, 0, c.pos.z + oz * 2.6);
      G.player.pos.x = clamp(G.player.pos.x, -BOUND, BOUND);
      G.player.pos.z = clamp(G.player.pos.z, -BOUND, BOUND);
      G.player.heading = c.heading;
      G.player.obj.visible = true;
      G.mode = "foot";
      G.car = null;
      sfx(140, 0.12, { type: "square", gain: 0.12 });
    }
  }

  /* =======================================================
     10. Mise à jour : joueur, voiture, flics, braquages, étoiles
     ======================================================= */
  function update(dt) {
    const input = readInput();
    if (G.mode === "foot") updateFoot(dt, input);
    else updateDrive(dt, input);

    updateHeists(dt, input);
    updateWanted(dt);
    updateCops(dt);
    updateCamera(dt);
    animateHeists(dt);
  }

  function updateFoot(dt, input) {
    const p = G.player;
    const moving = input.x !== 0 || input.z !== 0;
    const SPEED = 9;
    if (moving) {
      // direction voulue relative à la caméra (style 3e personne)
      const inputAng = Math.atan2(input.x, input.z);
      const target = G.camYaw + inputAng;
      p.heading = angleLerp(p.heading, target, 1 - Math.pow(0.0001, dt));
      const fx = Math.sin(p.heading);
      const fz = Math.cos(p.heading);
      moveCollide(p.pos, fx * SPEED * dt, fz * SPEED * dt, p.radius);
      p.walkPhase += dt * 10;
      // pas (léger)
      if (window.Sound && Math.floor(p.walkPhase / Math.PI) !== Math.floor((p.walkPhase - dt * 10) / Math.PI)) {
        noise(0.05, { freq: 200, gain: 0.04 });
      }
    } else {
      p.walkPhase = 0;
    }
    // animation des pattes / bras
    const sw = Math.sin(p.walkPhase) * 0.5;
    const L = p.obj.userData.limbs;
    if (L) {
      L.legL.position.z = sw;
      L.legR.position.z = -sw;
      L.armL.position.z = -sw * 0.8;
      L.armR.position.z = sw * 0.8;
      L.body.position.y = 1.0 + Math.abs(Math.sin(p.walkPhase * 2)) * 0.05;
    }
    p.obj.position.copy(p.pos);
    p.obj.rotation.y = p.heading;
  }

  function updateDrive(dt, input) {
    const c = G.car;
    const MAXF = 30; // vitesse avant max
    const MAXR = -10; // vitesse arrière max
    const ACC = 26;
    const BRAKE = 40;
    // accélération / marche arrière
    if (input.z > 0) c.speed += ACC * dt;
    else if (input.z < 0) c.speed -= ACC * dt;
    else c.speed *= 1 - 1.4 * dt; // frottement moteur
    if (input.brake) c.speed *= 1 - (BRAKE / 30) * dt;
    c.speed = clamp(c.speed, MAXR, MAXF);
    // direction (ne tourne que si la voiture roule)
    const steer = (input.x) * 1.6 * dt;
    c.heading -= steer * Math.sign(c.speed) * Math.min(1, Math.abs(c.speed) / 6);
    // avance le long du cap
    const fx = Math.sin(c.heading);
    const fz = Math.cos(c.heading);
    const before = { x: c.pos.x, z: c.pos.z };
    moveCollide(c.pos, fx * c.speed * dt, fz * c.speed * dt, c.radius);
    // si on a heurté un mur (déplacement avalé), on amortit la vitesse
    const moved = Math.hypot(c.pos.x - before.x, c.pos.z - before.z);
    if (moved < Math.abs(c.speed * dt) * 0.5) c.speed *= 0.3;
    syncCar(c);
    // ronron moteur (léger, selon la vitesse)
    if (window.Sound && Math.random() < 0.08 + Math.abs(c.speed) / 200) {
      noise(0.06, { freq: 80 + Math.abs(c.speed) * 3, gain: 0.03, Q: 0.6 });
    }
  }

  function updateHeists(dt, input) {
    // on ne braque qu'à pied
    let inZone = null;
    if (G.mode === "foot") {
      for (const h of G.world.heists) {
        if (h.cooldown > 0) continue;
        const d = Math.hypot(h.x - G.player.pos.x, h.z - G.player.pos.z);
        if (d < h.radius) {
          inZone = h;
          break;
        }
      }
    }
    // recharge des zones utilisées
    for (const h of G.world.heists) {
      if (h.cooldown > 0) {
        h.cooldown -= dt;
        h.obj.visible = h.cooldown <= 0;
      }
    }

    if (inZone && input.brake) {
      // braquage en cours : on remplit la jauge en restant immobile
      G.heisting = inZone;
      G.heistProg += dt / 3.0; // ~3 s pour réussir
      if (G.heistProg >= 1) {
        // réussite !
        const reward = inZone.reward;
        G.cash += reward;
        G.heistProg = 0;
        G.heisting = null;
        inZone.cooldown = 12; // la zone se recharge
        inZone.obj.visible = false;
        bump(reward);
        addWanted(1);
        sfx(880, 0.1, { type: "square", gain: 0.15 });
        sfx(1320, 0.18, { type: "square", gain: 0.12 });
        toast(T("heistDone") + reward);
      }
    } else {
      G.heisting = null;
      if (G.heistProg > 0) G.heistProg = Math.max(0, G.heistProg - dt * 0.5);
    }
    G._inZone = inZone;
  }

  let cashAnim = 0;
  function bump(amount) {
    cashAnim = 0.5;
  }

  function updateWanted(dt) {
    if (G.wanted > 0) {
      G.sinceCrime += dt;
      // pour faire baisser les étoiles, il faut être loin de tout flic
      let nearCop = false;
      for (const c of G.world.cops) {
        const d = Math.hypot(c.pos.x - heroPos().x, c.pos.z - heroPos().z);
        if (d < 28) nearCop = true;
      }
      if (!nearCop && G.sinceCrime > 6) {
        // une étoile retombe toutes les ~8 s passées au calme
        G._cooldownAcc = (G._cooldownAcc || 0) + dt;
        if (G._cooldownAcc > 8) {
          G._cooldownAcc = 0;
          addWanted(-1);
        }
      } else {
        G._cooldownAcc = 0;
      }
    }
  }

  function addWanted(n) {
    G.wanted = clamp(G.wanted + n, 0, 5);
    if (n > 0) {
      G.sinceCrime = 0;
      sfx(220, 0.2, { type: "sawtooth", gain: 0.12 });
    }
  }

  function heroPos() {
    return G.mode === "drive" ? G.car.pos : G.player.pos;
  }

  /* --- Police : apparition + poursuite --- */
  function updateCops(dt) {
    // apparition : on vise ~ G.wanted voitures de police
    G.copTimer -= dt;
    if (G.wanted > 0 && G.world.cops.length < G.wanted * 2 && G.copTimer <= 0) {
      spawnCop();
      G.copTimer = 2.5;
    }
    // si plus recherché, les flics abandonnent peu à peu
    if (G.wanted === 0 && G.world.cops.length) {
      const c = G.world.cops.pop();
      G.scene.remove(c.obj);
    }

    const hp = heroPos();
    const heroRadius = G.mode === "drive" ? G.car.radius : G.player.radius;
    let anyContact = false;

    for (const c of G.world.cops) {
      const dx = hp.x - c.pos.x;
      const dz = hp.z - c.pos.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      // se diriger vers le héros — mais s'ils sont coincés contre un bâtiment,
      // ils pivotent pour le contourner (steering simple + déblocage).
      let targetH = Math.atan2(dx, dz);
      if (c.wander > 0) {
        targetH += c.wanderDir * 1.2; // on vise « de biais » le temps de longer le mur
        c.wander -= dt;
      }
      c.heading = angleLerp(c.heading, targetH, 1 - Math.pow(0.02, dt));
      const speed = 16 + G.wanted * 2; // plus d'étoiles = flics plus rapides
      const fx = Math.sin(c.heading);
      const fz = Math.cos(c.heading);
      // ils ralentissent à courte distance (pour ne pas vibrer dans le héros)
      const sp = dist > 4 ? speed : speed * 0.2;
      const bx = c.pos.x;
      const bz = c.pos.z;
      moveCollide(c.pos, fx * sp * dt, fz * sp * dt, c.radius);
      // déblocage : si on a heurté un mur (déplacement avalé) en étant loin,
      // on déclenche un contournement d'un côté pendant ~0.6 s.
      const moved = Math.hypot(c.pos.x - bx, c.pos.z - bz);
      if (dist > 4 && moved < sp * dt * 0.4) {
        if (c.wander <= 0) c.wanderDir = (c.x0 = (c.x0 || 1) * -1); // alterne le côté
        c.wander = 0.6;
      }
      syncCar(c);

      // sirène occasionnelle
      if (window.Sound && Math.random() < 0.01) {
        sfx(700, 0.18, { type: "sine", gain: 0.05 });
        sfx(520, 0.18, { type: "sine", gain: 0.05 });
      }

      // contact prolongé = arrestation
      if (dist < c.radius + heroRadius + 1.2) {
        anyContact = true;
        c.bustContact += dt;
      } else {
        c.bustContact = Math.max(0, c.bustContact - dt);
      }
    }

    if (anyContact) {
      G.bustTimer += dt;
      // clignotement rouge léger du HUD via le texte d'indice
      if (G.bustTimer > 1.6) busted();
    } else {
      G.bustTimer = Math.max(0, G.bustTimer - dt * 0.5);
    }
  }

  function spawnCop() {
    const c = makeCar(COL.cop, true);
    // apparaît à un bord du monde, vers le héros
    const hp = heroPos();
    const side = Math.floor(Math.random() * 4);
    const edge = BOUND - 3;
    if (side === 0) c.pos.set(-edge, 0, hp.z);
    else if (side === 1) c.pos.set(edge, 0, hp.z);
    else if (side === 2) c.pos.set(hp.x, 0, -edge);
    else c.pos.set(hp.x, 0, edge);
    c.heading = Math.atan2(hp.x - c.pos.x, hp.z - c.pos.z);
    syncCar(c);
    G.world.cops.push(c);
  }

  function clearCops() {
    for (const c of G.world.cops) G.scene.remove(c.obj);
    G.world.cops = [];
  }

  /* --- Animation des marqueurs de braquage --- */
  function animateHeists(dt) {
    for (const h of G.world.heists) {
      if (!h.obj.visible) continue;
      h.bag.rotation.y += dt * 1.5;
      h.bag.position.y = 2 + Math.sin(performanceNow() * 2 + h.x) * 0.25;
    }
  }
  // petit compteur de temps interne (évite Date.now, on cumule le delta)
  let _t = 0;
  function performanceNow() {
    return _t;
  }

  /* =======================================================
     11. Caméra 3e personne (suit héros, traîne derrière le cap)
     ======================================================= */
  function updateCamera(dt) {
    const ent = G.mode === "drive" ? G.car : G.player;
    // le « cap caméra » suit doucement le cap de l'acteur
    G.camYaw = angleLerp(G.camYaw, ent.heading, 1 - Math.pow(0.005, dt));
    const back = G.mode === "drive" ? 13 : 8;
    const up = G.mode === "drive" ? 6 : 5;
    const gx = ent.pos.x - Math.sin(G.camYaw) * back;
    const gz = ent.pos.z - Math.cos(G.camYaw) * back;
    const goal = _v1.set(gx, up, gz);
    G.camera.position.lerp(goal, 1 - Math.pow(0.0008, dt));
    // regarde un peu devant l'acteur
    const lookTarget = _v2.set(
      ent.pos.x + Math.sin(G.camYaw) * 3,
      ent.pos.y + 1.5,
      ent.pos.z + Math.cos(G.camYaw) * 3
    );
    G.camLook.lerp(lookTarget, 1 - Math.pow(0.0008, dt));
    G.camera.lookAt(G.camLook);
  }
  const _v1 = new THREE.Vector3();
  const _v2 = new THREE.Vector3();

  /* =======================================================
     12. HUD
     ======================================================= */
  function updateHud() {
    if (!el.hud) return;
    // étoiles
    let s = "";
    for (let i = 0; i < 5; i++) s += i < G.wanted ? "★" : "☆";
    el.stars.textContent = s;
    el.stars.style.color = G.wanted > 0 ? "#ff5b4d" : "#666";
    // argent
    el.cash.textContent = G.cash;
    el.cash.parentElement.style.transform = cashAnim > 0 ? "scale(1.25)" : "scale(1)";
    // jauge de braquage
    if (G.heisting) {
      el.heist.hidden = false;
      el.heistFill.style.width = Math.round(G.heistProg * 100) + "%";
    } else {
      el.heist.hidden = true;
    }
    // indice contextuel
    el.hint.textContent = currentHint();
  }

  let toastText = "";
  let toastTime = 0;
  function toast(txt) {
    toastText = txt;
    toastTime = 2.2;
  }

  function currentHint() {
    if (toastTime > 0) return toastText;
    if (G.wanted > 0) return T("hintWanted");
    if (G.mode === "drive") return T("hintDrive");
    if (G.heisting) return T("hintHeisting");
    if (G._inZone) return T("hintHeistZone");
    if (nearestCar(5)) return T("hintNearCar");
    return T("hintFoot");
  }

  /* =======================================================
     13. Cycle de vie : init, boucle, open/close, menus
     ======================================================= */
  function init() {
    if (G.inited) return;
    grabDom();

    G.renderer = new THREE.WebGLRenderer({ canvas: el.canvas, antialias: false });
    G.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * 0.8);

    G.scene = new THREE.Scene();
    G.scene.background = new THREE.Color(COL.sky);
    G.scene.fog = new THREE.Fog(COL.fog, 40, 130);

    G.camera = new THREE.PerspectiveCamera(60, 16 / 10, 0.1, 400);
    G.camera.position.set(0, 8, -12);

    // lumières (pas d'ombres : on garde ça léger)
    G.scene.add(new THREE.HemisphereLight(0x9fb0d8, 0x2a2c38, 1.25));
    const dir = new THREE.DirectionalLight(0xffe6c0, 0.95);
    dir.position.set(-30, 60, 20);
    G.scene.add(dir);
    G.scene.add(new THREE.AmbientLight(0x404858, 0.5));

    buildWorld();

    // acteur joueur
    const bear = makeBear(COL.bear);
    G.scene.add(bear);
    G.player = {
      obj: bear,
      pos: new THREE.Vector3(0, 0, 0),
      heading: 0,
      radius: 0.9,
      walkPhase: 0,
    };

    bindMenus();
    applyTexts();
    G.clock = new THREE.Clock();
    G.inited = true;
  }

  function resize() {
    if (!G.renderer || !el.canvas) return;
    const w = el.canvas.clientWidth || 800;
    const h = el.canvas.clientHeight || 500;
    if (w < 2 || h < 2) return;
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / h;
    G.camera.updateProjectionMatrix();
  }

  function loop() {
    G.rafId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, G.clock.getDelta());
    _t += dt;
    if (G.state === "play") {
      try {
        update(dt);
      } catch (err) {
        console.error("GBM update error:", err);
        G.state = "menu";
      }
      if (cashAnim > 0) cashAnim -= dt;
      if (toastTime > 0) toastTime -= dt;
      updateHud();
    }
    G.renderer.render(G.scene, G.camera);
  }

  function startLoop() {
    if (G.rafId) return;
    G.clock.getDelta(); // purge le delta accumulé
    loop();
  }
  function stopLoop() {
    if (G.rafId) cancelAnimationFrame(G.rafId);
    G.rafId = 0;
  }

  // (Ré)initialise une partie.
  function startRun() {
    G.cash = 0;
    G.wanted = 0;
    G.sinceCrime = 999;
    G.bustTimer = 0;
    G.copTimer = 0;
    G.heistProg = 0;
    G.heisting = null;
    G.mode = "foot";
    G.car = null;
    clearCops();
    // recharge des zones
    for (const h of G.world.heists) {
      h.cooldown = 0;
      h.obj.visible = true;
    }
    // place l'ours au centre
    G.player.obj.visible = true;
    G.player.pos.set(0, 0, 0);
    G.player.heading = 0;
    G.camYaw = 0;
    G.camera.position.set(0, 8, -12);
    G.camLook.set(0, 1.5, 3);
    setState("play");
  }

  function setState(s) {
    G.state = s;
    // En jeu, on retire le focus des boutons : sinon Espace « cliquerait » le
    // dernier bouton pressé (Jouer/Reprendre) au lieu de servir à braquer.
    if (s === "play" && document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    if (!el.start) return;
    el.start.hidden = s !== "menu";
    el.pause.hidden = s !== "pause";
    el.over.hidden = s !== "over";
    el.hud.hidden = s !== "play";
  }

  function togglePause() {
    if (G.state === "play") setState("pause");
    else if (G.state === "pause") setState("play");
  }

  function busted() {
    setState("over");
    el.overTitle.textContent = T("busted");
    el.overMsg.textContent = T("bustedMsg") + G.cash;
    clearCops();
    G.wanted = 0;
    noise(0.4, { freq: 120, gain: 0.2, Q: 0.5 });
    // soumission optionnelle du score (plus gros butin) au classement mondial
    submitScore(G.cash);
  }

  function submitScore(score) {
    try {
      if (window.Leaderboard && score > 0 && typeof window.Leaderboard.submit === "function") {
        // on réutilise le pseudo éventuellement déjà saisi ailleurs, sinon "Ours"
        const name = (window.localStorage && localStorage.getItem("stewy-name")) || "Ours";
        window.Leaderboard.submit("GBM " + name, score);
      }
    } catch (e) {
      /* le classement est un bonus : on ignore toute erreur */
    }
  }

  function bindMenus() {
    if (el.play) el.play.addEventListener("click", startRun);
    if (el.resume) el.resume.addEventListener("click", () => setState("play"));
    if (el.retry) el.retry.addEventListener("click", startRun);
    if (el.close) el.close.addEventListener("click", close);
    if (el.quit) el.quit.addEventListener("click", close);
    if (el.quit2) el.quit2.addEventListener("click", close);
  }

  /* =======================================================
     14. API publique (appelée par site3d.js)
     ======================================================= */
  function open() {
    init();
    // on respecte la langue mémorisée par le site
    try {
      const stored = localStorage.getItem("stewy-lang");
      if (stored && I18N[stored]) G.lang = stored;
    } catch (e) {
      /* ignore */
    }
    applyTexts();
    if (window.Sound && window.Sound.resume) window.Sound.resume();
    el.section.setAttribute("aria-hidden", "false");
    G.open = true;
    setState("menu");
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", resize);
    // une fois l'overlay visible, on connaît la taille du canevas
    requestAnimationFrame(() => {
      resize();
      startLoop();
    });
  }

  function close() {
    if (!G.open) return;
    G.open = false;
    stopLoop();
    if (el.section) el.section.setAttribute("aria-hidden", "true");
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", resize);
    for (const k in keys) keys[k] = false;
  }

  function isOpen() {
    return G.open;
  }

  function setLang(lang) {
    if (I18N[lang]) G.lang = lang;
    applyTexts();
  }

  window.GBM = { open, close, isOpen, setLang };
})();
