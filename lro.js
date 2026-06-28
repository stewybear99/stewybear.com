/* =========================================================
   LA REVANCHE DE L'OURS (LRO) — mini-jeu 3D « TPS/FPS »
   ---------------------------------------------------------
   Un ours dans une forêt. Au début, on est la PROIE : des
   chasseurs nous canardent. On les attrape et on les MANGE
   (corps à corps). Une fois un chasseur dévoré, il lâche
   son FUSIL et sa CASQUETTE : on peut alors voler le fusil,
   se DÉGUISER en chasseur (ils nous repèrent moins), entrer
   dans leurs cabanes pour faire le plein de munitions… et
   surtout aller buter le CHASSEUR BOSS retranché dans sa
   grande cabane. C'est la revanche de l'ours.

   Vue à la 3e personne ; quand on VISE (clic droit), la
   caméra passe à la 1re personne avec un réticule, et le
   clic gauche tire (tir « hitscan »).

   Tout est cubique/low-poly comme « Grand Bear Mafia »
   (gbm.js) dont ce module reprend le squelette : scène
   Three.js propre, collisions AABB maison, pas d'ombres.

   API exposée au site : window.LRO = { open, close, isOpen, setLang }
   ========================================================= */
import * as THREE from "https://esm.sh/three@0.160.0";

(function () {
  "use strict";

  /* =======================================================
     1. État global du jeu
     ======================================================= */
  const G = {
    inited: false,
    open: false,
    state: "menu", // "menu" | "play" | "pause" | "over" | "win"
    lang: "fr",
    rafId: 0,
    clock: null,
    renderer: null,
    scene: null,
    camera: null,
    player: null, // { obj, pos, heading, radius, walkPhase, hp, maxHp, hasGun, ammo, hasHat, disguised, eatProg, eatTarget, hatMesh }
    world: { blockers: [], trees: [], hunters: [], bullets: [], cabins: [], pickups: [] },
    boss: null, // chasseur final (objet hunter spécial) — null tant que pas réveillé
    bossCabin: null,
    // caméra
    camMode: "tps", // "tps" | "fps"
    camYaw: 0,
    camPitch: -0.15,
    aiming: false,
    locked: false,
    // partie
    kills: 0,
    totalHunters: 0,
    muzzle: 0, // éclat de tir (timer)
    hurtFlash: 0,
  };

  // Palette forêt (verts froids, bois, casquettes orange chasseur).
  const COL = {
    ground: 0x2f4a2a,
    ground2: 0x395a31,
    path: 0x6a5536,
    sky: 0x9fc6e0,
    fog: 0x9fc6e0,
    trunk: 0x5a3d22,
    leaf: 0x2e6b2f,
    leaf2: 0x36803a,
    bush: 0x3f7a3a,
    bush2: 0x4f8f45,
    bear: 0x8a5a30,
    bearDark: 0x6e4422,
    bearBelly: 0xd7a166,
    ink: 0x140f0b,
    skin: 0xe0aa72,
    jacket: 0x4a5d34,
    jacketDark: 0x3a4a28,
    cap: 0xe2641f, // orange chasseur
    bossJacket: 0x6a2a2a,
    bossCap: 0xd11f1f,
    gun: 0x2b2b30,
    cabinWall: 0x6b4a2c,
    cabinRoof: 0x4a3520,
    cabinFloor: 0x3a2c1c,
    crate: 0xc9a24a,
    hatPickup: 0xe2641f,
    moon: 0xf3e9c0,
  };

  // Dimensions du monde (forêt carrée).
  const HALF = 78; // demi-largeur
  const BOUND = HALF - 3; // limite jouable

  /* =======================================================
     2. Références DOM + utilitaires
     ======================================================= */
  const $ = (sel) => document.querySelector(sel);
  let el = {};

  function grabDom() {
    el = {
      section: $(".lro-game"),
      canvas: $(".lro-canvas"),
      close: $(".lro-close"),
      hud: $(".lro-hud"),
      hpFill: $(".lro-hp-fill"),
      ammo: $(".lro-ammo"),
      ammoVal: $(".lro-ammo-val"),
      kills: $(".lro-kills-val"),
      stealth: $(".lro-stealth"),
      boss: $(".lro-boss"),
      bossFill: $(".lro-boss-fill"),
      crosshair: $(".lro-crosshair"),
      hint: $(".lro-hint-bottom"),
      start: $(".lro-start"),
      pause: $(".lro-pause"),
      over: $(".lro-over"),
      overTitle: $(".lro-over-title"),
      overMsg: $(".lro-over-msg"),
      play: $(".lro-play"),
      resume: $(".lro-resume"),
      retry: $(".lro-retry"),
      quit: $(".lro-quit"),
      quit2: $(".lro-quit2"),
      title: $(".lro-title"),
      sub: $(".lro-sub"),
      controls: $(".lro-controls"),
      foot: $(".lro-foot"),
      aimBtn: $(".lro-aim"),
      fireBtn: $(".lro-fire"),
    };
  }

  // Sons via le moteur audio du site (window.Sound).
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

  function angleLerp(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function pseudoRand(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* =======================================================
     3. Internationalisation
     ======================================================= */
  const I18N = {
    fr: {
      title: "LA REVANCHE DE L'OURS",
      sub: "Mange les chasseurs. Vole leur fusil. Bute le boss.",
      play: "Jouer",
      pause: "Pause",
      resume: "Reprendre",
      quit: "Quitter",
      retry: "Rejouer",
      win: "VENGEANCE !",
      winMsg: "Le chef des chasseurs est tombé. Chasseurs dévorés : ",
      dead: "CHASSÉ !",
      deadMsg: "Les chasseurs ont eu ta peau. Chasseurs dévorés : ",
      footHint: "ZQSD bouger · Souris viser · Clic droit viser · Clic gauche tirer · E manger",
      controls: [
        "ZQSD / Flèches : se déplacer",
        "Souris : regarder · Clic droit : viser (1re personne)",
        "Clic gauche : tirer (en visée) · E : manger un chasseur",
        "F : prendre un fusil · G : déguisement · Échap : pause",
      ],
      hintPrey: "Tu es la proie ! Approche un chasseur et maintiens E pour le manger 🐻",
      hintEating: "Tu dévores le chasseur… ne bouge pas !",
      hintGetGun: "Un fusil est tombé — passe dessus et appuie sur F",
      hintGetHat: "Une casquette est tombée — passe dessus et appuie sur G pour te déguiser",
      hintHasGun: "Clic droit pour viser, clic gauche pour tirer 🔫",
      hintAmmoOut: "Plus de munitions ! Recharge dans une cabane de chasseur",
      hintReload: "Munitions rechargées !",
      hintDisguise: "Déguisé en chasseur : ils te repèrent beaucoup moins",
      stealth: "🌿 Caché",
      hintSneak: "Planque-toi dans les buissons 🌿 et contourne-les par-derrière pour les croquer",
      hintBoss: "Le CHEF est là ! Vide-lui son chargeur 🔥",
      hintFindBoss: "Tous les chasseurs au tapis. Va finir le CHEF dans sa grande cabane !",
      gotGun: "Fusil volé !",
      ate: "Chasseur dévoré ! +",
    },
    en: {
      title: "THE BEAR'S REVENGE",
      sub: "Eat the hunters. Steal their gun. Kill the boss.",
      play: "Play",
      pause: "Pause",
      resume: "Resume",
      quit: "Quit",
      retry: "Play again",
      win: "REVENGE!",
      winMsg: "The hunters' chief is down. Hunters devoured: ",
      dead: "HUNTED!",
      deadMsg: "The hunters got you. Hunters devoured: ",
      footHint: "WASD move · Mouse look · Right-click aim · Left-click shoot · E eat",
      controls: [
        "WASD / Arrows: move",
        "Mouse: look · Right-click: aim (first person)",
        "Left-click: shoot (while aiming) · E: eat a hunter",
        "F: pick up a gun · G: disguise · Esc: pause",
      ],
      hintPrey: "You're the prey! Get close to a hunter and hold E to eat them 🐻",
      hintEating: "Devouring the hunter… don't move!",
      hintGetGun: "A gun dropped — step on it and press F",
      hintGetHat: "A cap dropped — step on it and press G to disguise",
      hintHasGun: "Right-click to aim, left-click to shoot 🔫",
      hintAmmoOut: "Out of ammo! Reload inside a hunter cabin",
      hintReload: "Ammo reloaded!",
      hintDisguise: "Disguised as a hunter: they barely notice you",
      stealth: "🌿 Hidden",
      hintSneak: "Hide in the bushes 🌿 and flank them from behind to chomp them",
      hintBoss: "The CHIEF is here! Empty your mag into him 🔥",
      hintFindBoss: "All hunters down. Go finish the CHIEF in his big cabin!",
      gotGun: "Gun stolen!",
      ate: "Hunter devoured! +",
    },
    es: {
      title: "LA VENGANZA DEL OSO",
      sub: "Cómete a los cazadores. Roba su rifle. Mata al jefe.",
      play: "Jugar",
      pause: "Pausa",
      resume: "Continuar",
      quit: "Salir",
      retry: "Jugar de nuevo",
      win: "¡VENGANZA!",
      winMsg: "El jefe de los cazadores cayó. Cazadores devorados: ",
      dead: "¡CAZADO!",
      deadMsg: "Los cazadores te atraparon. Cazadores devorados: ",
      footHint: "WASD mover · Ratón mirar · Clic der. apuntar · Clic izq. disparar · E comer",
      controls: [
        "WASD / Flechas: moverse",
        "Ratón: mirar · Clic derecho: apuntar (1ª persona)",
        "Clic izquierdo: disparar (apuntando) · E: comerse a un cazador",
        "F: coger un rifle · G: disfraz · Esc: pausa",
      ],
      hintPrey: "¡Eres la presa! Acércate a un cazador y mantén E para comértelo 🐻",
      hintEating: "Devorando al cazador… ¡no te muevas!",
      hintGetGun: "Cayó un rifle — pásale por encima y pulsa F",
      hintGetHat: "Cayó una gorra — pásale por encima y pulsa G para disfrazarte",
      hintHasGun: "Clic derecho para apuntar, clic izquierdo para disparar 🔫",
      hintAmmoOut: "¡Sin munición! Recarga dentro de una cabaña de cazador",
      hintReload: "¡Munición recargada!",
      hintDisguise: "Disfrazado de cazador: apenas te detectan",
      stealth: "🌿 Oculto",
      hintSneak: "Escóndete en los arbustos 🌿 y rodéalos por detrás para zampártelos",
      hintBoss: "¡El JEFE está aquí! Vacíale el cargador 🔥",
      hintFindBoss: "Todos los cazadores caídos. ¡Ve a acabar con el JEFE en su gran cabaña!",
      gotGun: "¡Rifle robado!",
      ate: "¡Cazador devorado! +",
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
    if (el.controls) {
      el.controls.innerHTML = "";
      T("controls").forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        el.controls.appendChild(p);
      });
    }
    if (el.pause) {
      const pt = el.pause.querySelector(".lro-title");
      if (pt) pt.textContent = T("pause");
    }
  }

  /* =======================================================
     4. Matériaux & géométries partagés
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

  function box(w, h, d, color, x, y, z, parent, opts) {
    const m = new THREE.Mesh(GEO.box, mat(color, opts));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }

  // Ajoute un rectangle de collision (AABB au sol).
  function addBlocker(cx, cz, halfW, halfD) {
    G.world.blockers.push({ minX: cx - halfW, maxX: cx + halfW, minZ: cz - halfD, maxZ: cz + halfD });
  }

  /* =======================================================
     5. Construction de la forêt
     ======================================================= */
  function buildWorld() {
    const scene = G.scene;
    G.world = { blockers: [], trees: [], hunters: [], bullets: [], cabins: [], pickups: [], bushes: [] };

    // Sol
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 60, HALF * 2 + 60), mat(COL.ground));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    // Quelques plaques d'herbe plus claire (déco)
    for (let i = 0; i < 26; i++) {
      const r = pseudoRand(i * 5 + 2);
      const r2 = pseudoRand(i * 9 + 4);
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(8 + r * 12, 8 + r2 * 12), mat(COL.ground2));
      patch.rotation.x = -Math.PI / 2;
      patch.position.set((r - 0.5) * HALF * 1.9, 0.01, (r2 - 0.5) * HALF * 1.9);
      scene.add(patch);
    }

    // Cabanes : 2 normales + 1 grande pour le boss.
    makeCabin(-HALF * 0.55, -HALF * 0.5, 12, false);
    makeCabin(HALF * 0.5, HALF * 0.1, 12, false);
    G.bossCabin = makeCabin(HALF * 0.55, -HALF * 0.6, 20, true);

    // Arbres : dispersés, en évitant le spawn (centre) et l'emprise des cabanes.
    const treeCount = 64;
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 5, 6);
    const coneGeo = new THREE.ConeGeometry(2.6, 6, 7);
    const trunkInst = new THREE.InstancedMesh(trunkGeo, mat(COL.trunk), treeCount);
    const leafInst = new THREE.InstancedMesh(coneGeo, mat(COL.leaf), treeCount);
    const leafInst2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 4, 7), mat(COL.leaf2), treeCount);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    let placed = 0;
    for (let i = 0; i < 400 && placed < treeCount; i++) {
      const x = (pseudoRand(i * 3 + 1) - 0.5) * (HALF * 2 - 8);
      const z = (pseudoRand(i * 7 + 5) - 0.5) * (HALF * 2 - 8);
      if (Math.hypot(x, z) < 10) continue; // dégage le spawn
      if (insideAnyCabinFootprint(x, z, 4)) continue;
      const s = 0.8 + pseudoRand(i * 11 + 3) * 0.9;
      pos.set(x, 2.5 * s, z);
      sc.set(s, s, s);
      m4.compose(pos, q, sc);
      trunkInst.setMatrixAt(placed, m4);
      pos.set(x, 6 * s, z);
      m4.compose(pos, q, sc);
      leafInst.setMatrixAt(placed, m4);
      pos.set(x, 8.6 * s, z);
      m4.compose(pos, q, sc);
      leafInst2.setMatrixAt(placed, m4);
      addBlocker(x, z, 0.9 * s, 0.9 * s);
      placed++;
    }
    trunkInst.count = leafInst.count = leafInst2.count = placed;
    trunkInst.instanceMatrix.needsUpdate = true;
    leafInst.instanceMatrix.needsUpdate = true;
    leafInst2.instanceMatrix.needsUpdate = true;
    scene.add(trunkInst, leafInst, leafInst2);

    // Buissons : des CACHETTES où l'ours devient quasi invisible. Ils ne
    // bloquent pas le passage (on entre dedans) mais cassent la détection.
    // Quelques-uns près du spawn pour s'infiltrer dès le départ.
    makeBush(5, 6);
    makeBush(-7, 4);
    makeBush(3, -8);
    for (let i = 0; i < 22; i++) {
      const x = (pseudoRand(i * 13 + 7) - 0.5) * (HALF * 2 - 14);
      const z = (pseudoRand(i * 17 + 9) - 0.5) * (HALF * 2 - 14);
      if (insideAnyCabinFootprint(x, z, 3)) continue;
      if (Math.hypot(x, z) < 6) continue; // pas pile sur le spawn
      makeBush(x, z);
    }

    // Lune décorative au loin (clin d'œil au reste du site).
    box(7, 7, 7, COL.moon, -HALF * 0.8, 46, -HALF, scene, { emissive: 0x3a3420 });
  }

  // Buisson low-poly = cachette. Touffe de boîtes vertes basses (on voit
  // par-dessus en marchant). Enregistre un cercle de dissimulation.
  function makeBush(x, z) {
    const g = new THREE.Group();
    const r = 2.4 + pseudoRand(x * 2.3 + z) * 0.7;
    const n = 4;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = r * 0.5;
      box(1.7, 1.4, 1.7, k % 2 ? COL.bush : COL.bush2, Math.cos(a) * rr, 0.8, Math.sin(a) * rr, g);
    }
    box(2.0, 1.6, 2.0, COL.bush, 0, 1.0, 0, g);
    g.position.set(x, 0, z);
    G.scene.add(g);
    G.world.bushes.push({ x, z, r: r + 0.5 });
  }

  // Cabane carrée avec une porte au milieu d'un mur. Murs = blockers (sauf la porte).
  function makeCabin(cx, cz, size, isBoss) {
    const scene = G.scene;
    const h = isBoss ? 7 : 5.5;
    const th = 0.6; // épaisseur des murs
    const half = size / 2;
    const wallCol = isBoss ? 0x7a4a26 : COL.cabinWall;
    // sol intérieur
    box(size, 0.2, size, COL.cabinFloor, cx, 0.1, cz, scene);
    // toit léger (au-dessus, on laisse voir l'intérieur par les côtés ouverts du haut)
    box(size + 1, 0.5, size + 1, COL.cabinRoof, cx, h + 0.4, cz, scene, { emissive: 0x100b06 });

    const doorW = 3.2;
    // Mur avant (+Z) avec porte : deux segments
    const segW = (size - doorW) / 2;
    const segOff = doorW / 2 + segW / 2;
    box(segW, h, th, wallCol, cx - segOff, h / 2, cz + half, scene);
    box(segW, h, th, wallCol, cx + segOff, h / 2, cz + half, scene);
    addBlocker(cx - segOff, cz + half, segW / 2, th / 2 + 0.3);
    addBlocker(cx + segOff, cz + half, segW / 2, th / 2 + 0.3);
    // Mur arrière (-Z) plein
    box(size, h, th, wallCol, cx, h / 2, cz - half, scene);
    addBlocker(cx, cz - half, size / 2, th / 2 + 0.3);
    // Murs latéraux pleins
    box(th, h, size, wallCol, cx - half, h / 2, cz, scene);
    box(th, h, size, wallCol, cx + half, h / 2, cz, scene);
    addBlocker(cx - half, cz, th / 2 + 0.3, size / 2);
    addBlocker(cx + half, cz, th / 2 + 0.3, size / 2);

    // Caisse de munitions à l'intérieur
    const crate = box(2, 2, 2, COL.crate, cx, 1, cz - half + 2.2, scene, { emissive: 0x3a2e08 });
    addBlocker(cx, cz - half + 2.2, 1, 1);

    const cabin = { cx, cz, size, isBoss, h, crate };
    G.world.cabins.push(cabin);
    return cabin;
  }

  function insideAnyCabinFootprint(x, z, margin) {
    for (const c of G.world.cabins) {
      const half = c.size / 2 + (margin || 0);
      if (x > c.cx - half && x < c.cx + half && z > c.cz - half && z < c.cz + half) return true;
    }
    return false;
  }
  // Intérieur strict d'une cabane (entre les murs).
  function insideCabin(cabin, x, z) {
    const half = cabin.size / 2 - 1;
    return x > cabin.cx - half && x < cabin.cx + half && z > cabin.cz - half && z < cabin.cz + half;
  }

  /* =======================================================
     6. Modèles : ours, chasseur, boss
     ======================================================= */
  function makeBear(furColor) {
    const g = new THREE.Group();
    const body = box(1.3, 1.2, 0.95, furColor, 0, 1.0, 0, g);
    box(0.75, 0.85, 0.45, COL.bearBelly, 0, 0.95, 0.34, g);
    const head = box(1.0, 0.95, 0.95, furColor, 0, 1.95, 0.05, g);
    box(0.32, 0.32, 0.22, COL.bearDark, -0.42, 2.45, 0.05, g);
    box(0.32, 0.32, 0.22, COL.bearDark, 0.42, 2.45, 0.05, g);
    box(0.46, 0.36, 0.28, COL.bearBelly, 0, 1.82, 0.5, g);
    box(0.13, 0.13, 0.1, COL.ink, -0.24, 2.05, 0.52, g);
    box(0.13, 0.13, 0.1, COL.ink, 0.24, 2.05, 0.52, g);
    box(0.14, 0.1, 0.1, COL.ink, 0, 1.88, 0.66, g);
    const legL = box(0.4, 0.85, 0.45, COL.bearDark, -0.32, 0.42, 0, g);
    const legR = box(0.4, 0.85, 0.45, COL.bearDark, 0.32, 0.42, 0, g);
    const armL = box(0.3, 0.8, 0.35, furColor, -0.78, 1.05, 0, g);
    const armR = box(0.3, 0.8, 0.35, furColor, 0.78, 1.05, 0, g);
    // casquette orange de déguisement (masquée au départ)
    const hat = new THREE.Group();
    box(1.05, 0.3, 1.0, COL.cap, 0, 2.55, 0.05, hat);
    box(0.7, 0.12, 0.5, COL.cap, 0, 2.5, 0.62, hat); // visière
    hat.visible = false;
    g.add(hat);
    g.userData.limbs = { legL, legR, armL, armR, head, body };
    g.userData.hat = hat;
    return g;
  }

  function makeHunter(opts) {
    opts = opts || {};
    const jacket = opts.boss ? COL.bossJacket : COL.jacket;
    const cap = opts.boss ? COL.bossCap : COL.cap;
    const scl = opts.boss ? 1.35 : 1;
    const g = new THREE.Group();
    box(0.9 * scl, 1.2 * scl, 0.55 * scl, jacket, 0, 1.4 * scl, 0, g); // torse
    box(0.95 * scl, 0.25 * scl, 0.6 * scl, COL.jacketDark, 0, 0.85 * scl, 0, g); // ceinture
    const head = box(0.55 * scl, 0.55 * scl, 0.55 * scl, COL.skin, 0, 2.2 * scl, 0, g);
    box(0.62 * scl, 0.2 * scl, 0.6 * scl, cap, 0, 2.52 * scl, 0, g); // casquette
    box(0.45 * scl, 0.1 * scl, 0.35 * scl, cap, 0, 2.46 * scl, 0.4 * scl, g); // visière
    box(0.12 * scl, 0.12 * scl, 0.1, COL.ink, -0.13 * scl, 2.2 * scl, 0.3 * scl, g);
    box(0.12 * scl, 0.12 * scl, 0.1, COL.ink, 0.13 * scl, 2.2 * scl, 0.3 * scl, g);
    // jambes
    const legL = box(0.32 * scl, 0.9 * scl, 0.36 * scl, COL.jacketDark, -0.22 * scl, 0.45 * scl, 0, g);
    const legR = box(0.32 * scl, 0.9 * scl, 0.36 * scl, COL.jacketDark, 0.22 * scl, 0.45 * scl, 0, g);
    // bras + fusil pointé devant (+z)
    box(0.22 * scl, 0.75 * scl, 0.26 * scl, jacket, -0.58 * scl, 1.45 * scl, 0.1, g);
    box(0.22 * scl, 0.7 * scl, 0.26 * scl, jacket, 0.5 * scl, 1.35 * scl, 0.35 * scl, g);
    box(0.14 * scl, 0.14 * scl, 1.5 * scl, COL.gun, 0.45 * scl, 1.3 * scl, 0.95 * scl, g); // canon
    g.userData.limbs = { legL, legR, head };
    return g;
  }

  function spawnHunter(x, z, isBoss) {
    const obj = makeHunter({ boss: isBoss });
    G.scene.add(obj);
    const h = {
      obj,
      pos: new THREE.Vector3(x, 0, z),
      heading: pseudoRand(x * 3 + z) * Math.PI * 2,
      hp: isBoss ? 12 : 2,
      maxHp: isBoss ? 12 : 2,
      radius: isBoss ? 1.5 : 1.0,
      mode: "patrol",
      shootCd: 1 + pseudoRand(x + z) * 2,
      alert: 0,
      wander: 0,
      wanderDir: 1,
      dead: false,
      hit: 0,
      isBoss: !!isBoss,
      active: !isBoss, // le boss reste inactif tant qu'on n'entre pas dans sa cabane
    };
    obj.position.copy(h.pos);
    obj.visible = h.active;
    syncActor(h);
    return h;
  }

  function syncActor(a) {
    a.obj.position.copy(a.pos);
    a.obj.rotation.y = a.heading;
  }

  /* =======================================================
     7. Entrées clavier + souris (pointer lock)
     ======================================================= */
  const keys = {};
  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (k === "escape") {
      // l'éventuelle sortie du pointer lock déclenche aussi la pause (voir onPointerLockChange)
      if (G.state === "play") setState("pause");
      else if (G.state === "pause") resumePlay();
    }
    if (G.state !== "play") return;
    if (k === "f") tryTakeGun();
    if (k === "g") tryToggleDisguise();
  }
  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }
  function readMove() {
    const left = keys["arrowleft"] || keys["a"] || keys["q"];
    const right = keys["arrowright"] || keys["d"];
    const up = keys["arrowup"] || keys["w"] || keys["z"];
    const down = keys["arrowdown"] || keys["s"];
    return { x: (right ? 1 : 0) - (left ? 1 : 0), z: (up ? 1 : 0) - (down ? 1 : 0) };
  }

  const MOUSE_SENS = 0.0024;
  function onMouseMove(e) {
    if (!G.locked || G.state !== "play") return;
    G.camYaw -= e.movementX * MOUSE_SENS;
    G.camPitch -= e.movementY * MOUSE_SENS;
    G.camPitch = clamp(G.camPitch, -0.95, 0.55);
  }
  function onMouseDown(e) {
    if (G.state !== "play") return;
    if (e.button === 2) {
      // viser : 1re personne (seulement si on a un fusil)
      if (G.player.hasGun) {
        G.aiming = true;
        G.camMode = "fps";
      }
    } else if (e.button === 0) {
      if (G.aiming && G.player.hasGun) fire();
    }
  }
  function onMouseUp(e) {
    if (e.button === 2) {
      G.aiming = false;
      G.camMode = "tps";
    }
  }
  function onContextMenu(e) {
    e.preventDefault();
  }
  function onPointerLockChange() {
    G.locked = document.pointerLockElement === el.canvas;
    // si on perd le verrou pendant le jeu (Échap/clic ailleurs), on met en pause
    if (!G.locked && G.state === "play") setState("pause");
  }
  function requestLock() {
    // Sur tactile, pas de pointer lock (inexistant sur mobile) : on vise au doigt.
    if (IS_TOUCH()) return;
    try {
      if (el.canvas && el.canvas.requestPointerLock) el.canvas.requestPointerLock();
    } catch (e) {
      /* ignore */
    }
  }

  /* =======================================================
     7 bis. Entrées tactiles (mobile)
     -------------------------------------------------------
     On glisse sur le canvas pour orienter la caméra (même
     calcul que la souris, sans pointer lock) ; des boutons
     dédiés gèrent « viser » et « tirer ». Le déplacement et
     manger/fusil/déguisement passent par les faux événements
     clavier émis par touch.js.
     ======================================================= */
  const IS_TOUCH = () => document.documentElement.classList.contains("is-touch");
  const TOUCH_LOOK_SENS = 0.005;
  let lookTouchId = null;
  let lookX = 0;
  let lookY = 0;

  function onCanvasTouchStart(e) {
    if (G.state !== "play") return;
    const t = e.changedTouches[0];
    if (!t) return;
    lookTouchId = t.identifier;
    lookX = t.clientX;
    lookY = t.clientY;
  }
  function onCanvasTouchMove(e) {
    if (lookTouchId === null || G.state !== "play") return;
    for (const t of e.changedTouches) {
      if (t.identifier !== lookTouchId) continue;
      G.camYaw -= (t.clientX - lookX) * TOUCH_LOOK_SENS;
      G.camPitch = clamp(G.camPitch - (t.clientY - lookY) * TOUCH_LOOK_SENS, -0.95, 0.55);
      lookX = t.clientX;
      lookY = t.clientY;
      e.preventDefault();
    }
  }
  function onCanvasTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouchId) lookTouchId = null;
    }
  }
  function onAimTap() {
    if (G.state !== "play" || !G.player.hasGun) return;
    G.aiming = !G.aiming;
    G.camMode = G.aiming ? "fps" : "tps";
    if (el.aimBtn) el.aimBtn.classList.toggle("is-active", G.aiming);
  }
  function onFireTap() {
    if (G.state === "play" && G.aiming && G.player.hasGun) fire();
  }
  function bindTouch() {
    if (!el.canvas) return;
    el.canvas.addEventListener("touchstart", onCanvasTouchStart, { passive: true });
    el.canvas.addEventListener("touchmove", onCanvasTouchMove, { passive: false });
    el.canvas.addEventListener("touchend", onCanvasTouchEnd);
    el.canvas.addEventListener("touchcancel", onCanvasTouchEnd);
    if (el.aimBtn) el.aimBtn.addEventListener("click", onAimTap);
    if (el.fireBtn) el.fireBtn.addEventListener("click", onFireTap);
  }
  function unbindTouch() {
    if (!el.canvas) return;
    el.canvas.removeEventListener("touchstart", onCanvasTouchStart);
    el.canvas.removeEventListener("touchmove", onCanvasTouchMove);
    el.canvas.removeEventListener("touchend", onCanvasTouchEnd);
    el.canvas.removeEventListener("touchcancel", onCanvasTouchEnd);
    if (el.aimBtn) el.aimBtn.removeEventListener("click", onAimTap);
    if (el.fireBtn) el.fireBtn.removeEventListener("click", onFireTap);
    lookTouchId = null;
  }

  /* =======================================================
     8. Collisions
     ======================================================= */
  function moveCollide(pos, dx, dz, radius) {
    pos.x += dx;
    for (const b of G.world.blockers) {
      if (pos.x > b.minX - radius && pos.x < b.maxX + radius && pos.z > b.minZ - radius && pos.z < b.maxZ + radius) {
        pos.x = dx > 0 ? b.minX - radius : b.maxX + radius;
      }
    }
    pos.z += dz;
    for (const b of G.world.blockers) {
      if (pos.x > b.minX - radius && pos.x < b.maxX + radius && pos.z > b.minZ - radius && pos.z < b.maxZ + radius) {
        pos.z = dz > 0 ? b.minZ - radius : b.maxZ + radius;
      }
    }
    pos.x = clamp(pos.x, -BOUND, BOUND);
    pos.z = clamp(pos.z, -BOUND, BOUND);
  }

  // Ligne de vue dégagée entre deux points ? On échantillonne le segment :
  // si un bloqueur (arbre, mur de cabane) est traversé, la vue est coupée.
  function lineBlocked(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const dist = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.floor(dist / 1.4));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = ax + dx * t, z = az + dz * t;
      for (const bl of G.world.blockers) {
        if (x > bl.minX && x < bl.maxX && z > bl.minZ && z < bl.maxZ) return true;
      }
    }
    return false;
  }

  /* =======================================================
     9. Manger / pickups / déguisement / tir
     ======================================================= */
  function nearestHunter(maxDist, aliveOnly) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const h of G.world.hunters) {
      if (aliveOnly && (h.dead || !h.active)) continue;
      const dx = h.pos.x - G.player.pos.x;
      const dz = h.pos.z - G.player.pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    return best;
  }

  function dropPickups(x, z) {
    // fusil (boîte sombre) + casquette (orange)
    const gun = box(0.3, 0.2, 1.4, COL.gun, x, 0.4, z, G.scene, { emissive: 0x111114 });
    G.world.pickups.push({ obj: gun, x, z, kind: "gun", t: 0 });
    const hat = box(0.7, 0.3, 0.7, COL.hatPickup, x + 1.2, 0.5, z, G.scene, { emissive: 0x3a1808 });
    G.world.pickups.push({ obj: hat, x: x + 1.2, z, kind: "hat", t: 0 });
  }

  function tryTakeGun() {
    for (const p of G.world.pickups) {
      if (p.taken || p.kind !== "gun") continue;
      if (Math.hypot(p.x - G.player.pos.x, p.z - G.player.pos.z) < 2.2) {
        p.taken = true;
        p.obj.visible = false;
        G.player.hasGun = true;
        G.player.ammo = Math.min(G.player.ammo + 8, 14);
        sfx(440, 0.08, { type: "square", gain: 0.14 });
        sfx(660, 0.1, { type: "square", gain: 0.1 });
        toast(T("gotGun"));
        return;
      }
    }
  }

  function tryToggleDisguise() {
    // ramasse une casquette à proximité si on n'en a pas encore
    if (!G.player.hasHat) {
      for (const p of G.world.pickups) {
        if (p.taken || p.kind !== "hat") continue;
        if (Math.hypot(p.x - G.player.pos.x, p.z - G.player.pos.z) < 2.2) {
          p.taken = true;
          p.obj.visible = false;
          G.player.hasHat = true;
          break;
        }
      }
    }
    if (!G.player.hasHat) return;
    G.player.disguised = !G.player.disguised;
    G.player.obj.userData.hat.visible = G.player.disguised;
    sfx(G.player.disguised ? 520 : 300, 0.1, { type: "triangle", gain: 0.12 });
    if (G.player.disguised) toast(T("hintDisguise"));
  }

  // Tir « hitscan » : rayon depuis l'œil de l'ours selon la visée.
  const _aimDir = new THREE.Vector3();
  const _toH = new THREE.Vector3();
  function aimDir() {
    const cp = Math.cos(G.camPitch);
    return _aimDir.set(Math.sin(G.camYaw) * cp, Math.sin(G.camPitch), Math.cos(G.camYaw) * cp).normalize();
  }
  function fire() {
    if (G.player.ammo <= 0) {
      sfx(120, 0.05, { type: "square", gain: 0.08 }); // clic à vide
      return;
    }
    G.player.ammo--;
    G.muzzle = 0.06;
    noise(0.08, { freq: 900, gain: 0.22, Q: 0.7 });
    sfx(140, 0.12, { type: "sawtooth", gain: 0.12 });
    const dir = aimDir();
    const origin = _v3.set(G.player.pos.x, 2.0, G.player.pos.z);
    let best = null;
    let bestT = 60; // portée
    for (const h of G.world.hunters) {
      if (h.dead || !h.active) continue;
      _toH.set(h.pos.x - origin.x, 1.3 - origin.y + 1.0, h.pos.z - origin.z);
      const t = _toH.dot(dir);
      if (t <= 0 || t > bestT) continue;
      const perp = Math.hypot(_toH.x - dir.x * t, _toH.y - dir.y * t, _toH.z - dir.z * t);
      if (perp < h.radius + 0.4) {
        bestT = t;
        best = h;
      }
    }
    if (best) {
      best.hp -= 1;
      best.hit = 0.12;
      best.alert = 10; // réveille / énerve
      if (best.mode === "patrol") best.mode = "chase";
      if (best.hp <= 0) killHunter(best, "shot");
      else sfx(300, 0.05, { type: "square", gain: 0.1 });
    }
  }

  function killHunter(h, how) {
    if (h.dead) return;
    h.dead = true;
    h.active = false;
    h.obj.visible = false;
    G.kills++;
    if (h.isBoss) {
      win();
      return;
    }
    dropPickups(h.pos.x, h.pos.z);
    if (how === "eat") {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + 34);
      toast(T("ate") + G.kills);
      sfx(200, 0.16, { type: "sawtooth", gain: 0.16 });
      noise(0.18, { freq: 300, gain: 0.12 });
    } else {
      sfx(180, 0.12, { type: "square", gain: 0.12 });
      noise(0.14, { freq: 200, gain: 0.1 });
    }
  }

  function hurtPlayer(d) {
    G.player.hp -= d;
    G.hurtFlash = 0.25;
    noise(0.12, { freq: 160, gain: 0.14 });
    if (G.player.hp <= 0) {
      G.player.hp = 0;
      dead();
    }
  }

  /* =======================================================
     10. Mise à jour
     ======================================================= */
  function update(dt) {
    updatePlayer(dt);
    updateHunters(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateCamera(dt);
    if (G.muzzle > 0) G.muzzle -= dt;
    if (G.hurtFlash > 0) G.hurtFlash -= dt;
  }

  function updatePlayer(dt) {
    const p = G.player;
    const mv = readMove();
    const eatTarget = nearestHunter(2.8, true);
    const eating = !!eatTarget && keys["e"];

    if (eating) {
      // on dévore : immobile, jauge qui se remplit
      p.eatProg += dt / 0.8;
      p.walkPhase = 0;
      if (p.eatProg >= 1) {
        p.eatProg = 0;
        killHunter(eatTarget, "eat");
      }
    } else {
      p.eatProg = Math.max(0, p.eatProg - dt * 2);
      // déplacement relatif à la caméra
      const moving = mv.x !== 0 || mv.z !== 0;
      const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw);
      const rx = Math.cos(G.camYaw), rz = -Math.sin(G.camYaw);
      if (moving) {
        let dx = fx * mv.z + rx * mv.x;
        let dz = fz * mv.z + rz * mv.x;
        const len = Math.hypot(dx, dz) || 1;
        const SPEED = G.aiming ? 5 : 9;
        dx = (dx / len) * SPEED * dt;
        dz = (dz / len) * SPEED * dt;
        moveCollide(p.pos, dx, dz, p.radius);
        p.walkPhase += dt * 10;
      } else {
        p.walkPhase = 0;
      }
    }
    // l'ours fait face à la direction de la caméra
    p.heading = angleLerp(p.heading, G.camYaw, 1 - Math.pow(0.0001, dt));

    // animation pattes/bras
    const sw = Math.sin(p.walkPhase) * 0.5;
    const L = p.obj.userData.limbs;
    if (L) {
      L.legL.position.z = sw;
      L.legR.position.z = -sw;
      L.armL.position.z = -sw * 0.8;
      L.armR.position.z = sw * 0.8;
    }
    p.obj.position.copy(p.pos);
    p.obj.rotation.y = p.heading;
    // l'ours est masqué en vue FPS (on est « dans sa tête »)
    p.obj.visible = G.camMode !== "fps";

    // planqué dans un buisson ? (réduit fortement la détection des chasseurs)
    p.hidden = false;
    for (const bsh of G.world.bushes) {
      if (Math.hypot(bsh.x - p.pos.x, bsh.z - p.pos.z) < bsh.r) {
        p.hidden = true;
        break;
      }
    }

    // réveil du boss si on entre dans sa cabane
    if (G.boss && !G.boss.active && insideCabin(G.bossCabin, p.pos.x, p.pos.z)) {
      G.boss.active = true;
      G.boss.obj.visible = true;
      G.boss.mode = "chase";
      sfx(90, 0.4, { type: "sawtooth", gain: 0.18 });
      noise(0.5, { freq: 120, gain: 0.16 });
      toast(T("hintBoss"));
    }

    // recharge de munitions dans une cabane (près de la caisse)
    for (const c of G.world.cabins) {
      if (insideCabin(c, p.pos.x, p.pos.z) && Math.hypot(c.crate.position.x - p.pos.x, c.crate.position.z - p.pos.z) < 3) {
        if (G.player.hasGun && G.player.ammo < 14) {
          G._reloadAcc = (G._reloadAcc || 0) + dt;
          if (G._reloadAcc > 0.4) {
            G._reloadAcc = 0;
            G.player.ammo = Math.min(14, G.player.ammo + 2);
            sfx(520, 0.05, { type: "square", gain: 0.08 });
            if (G.player.ammo === 14) toast(T("hintReload"));
          }
        }
      }
    }
  }

  function updateHunters(dt) {
    const p = G.player;
    for (const h of G.world.hunters) {
      if (h.dead || !h.active) continue;
      const dx = p.pos.x - h.pos.x;
      const dz = p.pos.z - h.pos.z;
      const dist = Math.hypot(dx, dz) || 0.001;

      // détection « infiltration » : il faut être dans le CÔNE DE VISION du
      // chasseur, en LIGNE DE VUE dégagée (les arbres/murs cachent), et pas
      // planqué dans un buisson. De très près, il t'« entend » quand même.
      const baseSight = p.disguised ? 9 : 22;
      const sight = p.hidden ? 4.5 : baseSight; // caché dans un buisson = quasi invisible
      const toAng = Math.atan2(dx, dz);
      let angDiff = Math.abs(((toAng - h.heading + Math.PI) % (Math.PI * 2)) - Math.PI);
      const inFov = angDiff < 1.15; // cône d'environ 130°
      const los = !lineBlocked(h.pos.x, h.pos.z, p.pos.x, p.pos.z);
      const hearRad = p.hidden ? 2.2 : 4; // bruit de pas à courte portée
      const detect = dist < hearRad || (dist < sight && inFov && los);
      if (detect) {
        h.alert += dt * (p.disguised ? 0.5 : 3);
      } else {
        h.alert = Math.max(0, h.alert - dt * 0.8);
      }
      if (h.isBoss) h.alert = 10; // le boss est toujours remonté une fois actif
      const angry = h.alert > 1.2;

      if (h.hit > 0) h.hit -= dt;

      if (!angry) {
        // patrouille tranquille
        h.mode = "patrol";
        h.wander -= dt;
        if (h.wander <= 0) {
          h.heading += (pseudoRand(h.pos.x + h.pos.z + _t) - 0.5) * 2.0;
          h.wander = 1.5 + pseudoRand(h.pos.x - h.pos.z) * 2;
        }
        const sp = 3.5;
        const fx = Math.sin(h.heading), fz = Math.cos(h.heading);
        moveCollide(h.pos, fx * sp * dt, fz * sp * dt, h.radius);
      } else {
        // poursuite + tir
        h.mode = "chase";
        let targetH = Math.atan2(dx, dz);
        if (h.wander > 0) {
          targetH += h.wanderDir * 1.2;
          h.wander -= dt;
        }
        h.heading = angleLerp(h.heading, targetH, 1 - Math.pow(0.02, dt));
        const fx = Math.sin(h.heading), fz = Math.cos(h.heading);
        const stopDist = h.isBoss ? 6 : 12; // garde ses distances pour tirer
        const sp = dist > stopDist ? (h.isBoss ? 9 : 7) : -1.5;
        const bx = h.pos.x, bz = h.pos.z;
        moveCollide(h.pos, fx * sp * dt, fz * sp * dt, h.radius);
        const moved = Math.hypot(h.pos.x - bx, h.pos.z - bz);
        if (dist > stopDist && moved < Math.abs(sp) * dt * 0.4) {
          h.wanderDir = -h.wanderDir;
          h.wander = 0.6;
        }
        // tir
        h.shootCd -= dt;
        if (h.shootCd <= 0 && dist < 30) {
          fireHunter(h, dx, dz, dist);
          h.shootCd = h.isBoss ? 1.1 : 2.4 + pseudoRand(_t + h.pos.x) * 1.8;
        }
      }

      // animation jambes
      const sw = Math.sin((_t + h.pos.x) * 6) * 0.4 * (h.mode === "chase" ? 1 : 0.4);
      if (h.obj.userData.limbs) {
        h.obj.userData.limbs.legL.position.z = sw;
        h.obj.userData.limbs.legR.position.z = -sw;
      }
      // teinte rouge bref quand touché
      h.obj.scale.setScalar(h.hit > 0 ? 1.12 : 1);
      syncActor(h);
    }
  }

  function fireHunter(h, dx, dz, dist) {
    const eyeY = (h.isBoss ? 3 : 2.2);
    const inacc = h.isBoss ? 0.1 : 0.2; // dispersion (le boss vise mieux)
    const baseAng = Math.atan2(dx, dz);
    const shots = h.isBoss ? 3 : 1;
    for (let i = 0; i < shots; i++) {
      const a = baseAng + (shots > 1 ? (i - 1) * 0.12 : 0) + (pseudoRand(_t * 7.3 + i + h.pos.x) - 0.5) * inacc;
      const sp = 32;
      const dirx = Math.sin(a), dirz = Math.cos(a);
      const aimY = (G.player.pos.y + 1.5 - eyeY) / Math.max(dist, 1);
      const b = {
        pos: new THREE.Vector3(h.pos.x + dirx * 1.2, eyeY, h.pos.z + dirz * 1.2),
        vel: new THREE.Vector3(dirx * sp, aimY * sp, dirz * sp),
        life: 2.2,
        dmg: h.isBoss ? 10 : 5,
        obj: box(0.18, 0.18, 0.18, 0xffe07a, 0, 0, 0, G.scene, { emissive: 0x7a5a10 }),
      };
      b.obj.position.copy(b.pos);
      G.world.bullets.push(b);
    }
    sfx(120, 0.1, { type: "sawtooth", gain: 0.08 });
    noise(0.06, { freq: 700, gain: 0.1 });
  }

  function updateBullets(dt) {
    const p = G.player;
    for (let i = G.world.bullets.length - 1; i >= 0; i--) {
      const b = G.world.bullets[i];
      b.pos.addScaledVector(b.vel, dt);
      b.life -= dt;
      b.obj.position.copy(b.pos);
      let dead = b.life <= 0;
      // touche le joueur ?
      const d = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z);
      if (d < 0.95 && b.pos.y > 0.5 && b.pos.y < 2.6) {
        hurtPlayer(b.dmg);
        dead = true;
      }
      // cover : les balles sont arrêtées par les arbres et les murs
      if (!dead && b.pos.y < 6) {
        for (const bl of G.world.blockers) {
          if (b.pos.x > bl.minX && b.pos.x < bl.maxX && b.pos.z > bl.minZ && b.pos.z < bl.maxZ) {
            dead = true;
            break;
          }
        }
      }
      // sort des limites / touche le sol
      if (b.pos.y < 0.1 || Math.abs(b.pos.x) > HALF || Math.abs(b.pos.z) > HALF) dead = true;
      if (dead) {
        G.scene.remove(b.obj);
        G.world.bullets.splice(i, 1);
      }
    }
  }

  function updatePickups(dt) {
    for (const pk of G.world.pickups) {
      if (pk.taken) continue;
      pk.t += dt;
      pk.obj.position.y = (pk.kind === "hat" ? 0.5 : 0.4) + Math.sin(pk.t * 3) * 0.12;
      pk.obj.rotation.y += dt * 1.5;
    }
  }

  /* =======================================================
     11. Caméra (3e personne / 1re personne)
     ======================================================= */
  const _v3 = new THREE.Vector3();
  const _goal = new THREE.Vector3();
  const _look = new THREE.Vector3();
  function updateCamera(dt) {
    const p = G.player;
    if (G.camMode === "fps") {
      G.camera.fov = 52;
      G.camera.updateProjectionMatrix();
      const eye = _goal.set(p.pos.x, 2.0, p.pos.z);
      G.camera.position.lerp(eye, 1 - Math.pow(0.0001, dt));
      const dir = aimDir();
      _look.set(eye.x + dir.x * 6, eye.y + dir.y * 6, eye.z + dir.z * 6);
      G.camera.lookAt(_look);
    } else {
      G.camera.fov = 62;
      G.camera.updateProjectionMatrix();
      const back = 8, baseUp = 4.5;
      const cp = Math.cos(G.camPitch);
      const gx = p.pos.x - Math.sin(G.camYaw) * back * cp;
      const gz = p.pos.z - Math.cos(G.camYaw) * back * cp;
      const gy = baseUp - Math.sin(G.camPitch) * back;
      _goal.set(gx, Math.max(1.2, gy), gz);
      G.camera.position.lerp(_goal, 1 - Math.pow(0.0006, dt));
      _look.set(p.pos.x, 1.8, p.pos.z);
      G.camera.lookAt(_look);
    }
  }

  /* =======================================================
     12. HUD
     ======================================================= */
  let toastText = "";
  let toastTime = 0;
  function toast(txt) {
    toastText = txt;
    toastTime = 2.4;
  }

  function updateHud() {
    if (!el.hud) return;
    const p = G.player;
    el.hpFill.style.width = Math.max(0, Math.round((p.hp / p.maxHp) * 100)) + "%";
    el.hpFill.style.background = p.hp / p.maxHp < 0.3 ? "#ff4d3a" : "#5fce5f";
    // munitions
    if (p.hasGun) {
      el.ammo.hidden = false;
      el.ammoVal.textContent = p.ammo;
    } else {
      el.ammo.hidden = true;
    }
    el.kills.textContent = G.kills + "/" + G.totalHunters;
    // badge « caché »
    if (el.stealth) {
      el.stealth.hidden = !p.hidden;
      el.stealth.textContent = T("stealth");
    }
    // barre de boss
    if (G.boss && G.boss.active && !G.boss.dead) {
      el.boss.hidden = false;
      el.bossFill.style.width = Math.max(0, Math.round((G.boss.hp / G.boss.maxHp) * 100)) + "%";
    } else {
      el.boss.hidden = true;
    }
    // réticule
    el.crosshair.hidden = !(G.camMode === "fps");
    // indice
    el.hint.textContent = currentHint();
    // flash de dégât : bordure rouge du canevas
    if (el.canvas) el.canvas.style.borderColor = G.hurtFlash > 0 ? "#ff3a2a" : "";
  }

  function currentHint() {
    if (toastTime > 0) return toastText;
    const p = G.player;
    if (p.eatProg > 0) return T("hintEating");
    if (G.boss && G.boss.active && !G.boss.dead) return T("hintBoss");
    // tous les chasseurs normaux morts → aller au boss
    const remaining = G.world.hunters.filter((h) => !h.isBoss && !h.dead).length;
    if (remaining === 0 && G.boss && !G.boss.active) return T("hintFindBoss");
    if (p.hasGun && p.ammo <= 0) return T("hintAmmoOut");
    if (!p.hasGun) {
      // un fusil/casquette par terre à proximité ?
      const nearGun = G.world.pickups.some((pk) => !pk.taken && pk.kind === "gun" && Math.hypot(pk.x - p.pos.x, pk.z - p.pos.z) < 3);
      if (nearGun) return T("hintGetGun");
      const nearHat = G.world.pickups.some((pk) => !pk.taken && pk.kind === "hat" && Math.hypot(pk.x - p.pos.x, pk.z - p.pos.z) < 3);
      if (nearHat) return T("hintGetHat");
      if (p.hidden) return T("hintSneak");
      return T("hintPrey");
    }
    return T("hintHasGun");
  }

  /* =======================================================
     13. Cycle de vie
     ======================================================= */
  function init() {
    if (G.inited) return;
    grabDom();

    G.renderer = new THREE.WebGLRenderer({ canvas: el.canvas, antialias: false });
    G.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * 0.85);

    G.scene = new THREE.Scene();
    G.scene.background = new THREE.Color(COL.sky);
    G.scene.fog = new THREE.Fog(COL.fog, 45, 150);

    G.camera = new THREE.PerspectiveCamera(62, 16 / 10, 0.1, 400);
    G.camera.position.set(0, 6, -10);

    G.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x33402c, 1.2));
    const dir = new THREE.DirectionalLight(0xfff0d0, 0.95);
    dir.position.set(-30, 70, 40);
    G.scene.add(dir);
    G.scene.add(new THREE.AmbientLight(0x556044, 0.55));

    buildWorld();

    const bear = makeBear(COL.bear);
    G.scene.add(bear);
    G.player = {
      obj: bear,
      pos: new THREE.Vector3(0, 0, 0),
      heading: 0,
      radius: 0.9,
      walkPhase: 0,
      hp: 100,
      maxHp: 100,
      hasGun: false,
      ammo: 0,
      hasHat: false,
      disguised: false,
      eatProg: 0,
      hidden: false,
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

  let _t = 0;
  function loop() {
    G.rafId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, G.clock.getDelta());
    _t += dt;
    if (G.state === "play") {
      try {
        update(dt);
      } catch (err) {
        console.error("LRO update error:", err);
        G.state = "menu";
      }
      if (toastTime > 0) toastTime -= dt;
      updateHud();
    }
    G.renderer.render(G.scene, G.camera);
  }

  function startLoop() {
    if (G.rafId) return;
    G.clock.getDelta();
    loop();
  }
  function stopLoop() {
    if (G.rafId) cancelAnimationFrame(G.rafId);
    G.rafId = 0;
  }

  function clearActors() {
    for (const h of G.world.hunters) G.scene.remove(h.obj);
    for (const b of G.world.bullets) G.scene.remove(b.obj);
    for (const p of G.world.pickups) G.scene.remove(p.obj);
    G.world.hunters = [];
    G.world.bullets = [];
    G.world.pickups = [];
    G.boss = null;
  }

  function startRun() {
    clearActors();
    // place l'ours au centre
    const p = G.player;
    p.pos.set(0, 0, 0);
    p.heading = 0;
    p.hp = p.maxHp;
    p.hasGun = false;
    p.ammo = 0;
    p.hasHat = false;
    p.disguised = false;
    p.eatProg = 0;
    p.obj.userData.hat.visible = false;
    p.obj.visible = true;
    G.kills = 0;
    G.camYaw = 0;
    G.camPitch = -0.15;
    G.camMode = "tps";
    G.aiming = false;
    if (el.aimBtn) el.aimBtn.classList.remove("is-active");
    G.muzzle = 0;
    G.hurtFlash = 0;

    // 5 chasseurs dispersés (hors cabanes, bien à distance du spawn central
    // pour ne pas tous fondre sur l'ours dès la première seconde)
    const spots = [
      [-30, 26], [34, 30], [16, -36], [-40, -18], [-18, 42],
    ];
    G.totalHunters = spots.length;
    spots.forEach((s) => G.world.hunters.push(spawnHunter(s[0], s[1], false)));
    // le boss, dans sa grande cabane (inactif au départ)
    G.boss = spawnHunter(G.bossCabin.cx, G.bossCabin.cz - 2, true);
    G.world.hunters.push(G.boss);

    setState("play");
    requestLock();
  }

  function setState(s) {
    G.state = s;
    if (s === "play" && document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    if (!el.start) return;
    el.start.hidden = s !== "menu";
    el.pause.hidden = s !== "pause";
    el.over.hidden = !(s === "over" || s === "win");
    el.hud.hidden = s !== "play";
    // en pause/menu/fin : on libère la souris
    if (s !== "play" && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function resumePlay() {
    setState("play");
    requestLock();
  }

  function dead() {
    setState("over");
    el.overTitle.textContent = T("dead");
    el.overTitle.classList.remove("lro-win-title");
    el.overMsg.textContent = T("deadMsg") + G.kills;
    noise(0.5, { freq: 110, gain: 0.2, Q: 0.5 });
  }

  function win() {
    if (G.boss) {
      G.boss.dead = true;
      G.boss.active = false;
      G.boss.obj.visible = false;
    }
    setState("win");
    el.overTitle.textContent = T("win");
    el.overTitle.classList.add("lro-win-title");
    el.overMsg.textContent = T("winMsg") + G.kills;
    sfx(660, 0.16, { type: "square", gain: 0.16 });
    sfx(880, 0.22, { type: "square", gain: 0.14 });
    sfx(1100, 0.3, { type: "square", gain: 0.12 });
  }

  function bindMenus() {
    if (el.play) el.play.addEventListener("click", startRun);
    if (el.resume) el.resume.addEventListener("click", resumePlay);
    if (el.retry) el.retry.addEventListener("click", startRun);
    if (el.close) el.close.addEventListener("click", close);
    if (el.quit) el.quit.addEventListener("click", close);
    if (el.quit2) el.quit2.addEventListener("click", close);
  }

  /* =======================================================
     14. API publique
     ======================================================= */
  function open() {
    init();
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
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    if (IS_TOUCH()) bindTouch();
    requestAnimationFrame(() => {
      resize();
      startLoop();
    });
  }

  function close() {
    if (!G.open) return;
    G.open = false;
    stopLoop();
    if (document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (e) {
        /* ignore */
      }
    }
    if (el.section) el.section.setAttribute("aria-hidden", "true");
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", resize);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    unbindTouch();
    for (const k in keys) keys[k] = false;
  }

  function isOpen() {
    return G.open;
  }

  function setLang(lang) {
    if (I18N[lang]) G.lang = lang;
    applyTexts();
  }

  window.LRO = { open, close, isOpen, setLang };
})();
