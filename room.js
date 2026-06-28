/* =========================================================
   Stewybear — construction de la pièce 3D voxel (logique pure)
   ---------------------------------------------------------
   Ce module ne touche NI au DOM NI au WebGL : il reçoit `THREE`
   en paramètre et renvoie le graphe de scène. Il peut donc être
   testé en Node (voir test/room.test.mjs).
   ========================================================= */

/* Palette reprise du site 2D */
export const C = {
  night0: 0x0b0a12,
  wood1: 0x3a2415,
  wood2: 0x5a3a22,
  wood3: 0x7c5230,
  wall0: 0x2c1d2a,
  wall1: 0x3b2a30,
  wall2: 0x4a3530,
  fire1: 0xd8430f,
  fire2: 0xff7a1a,
  fire3: 0xffb24d,
  fire4: 0xffe08a,
  cream: 0xffe9c0,
  stone: 0x3a3340,
  bear1: 0x7a4a28,
  bear2: 0x9b6237,
  bearBelly: 0xd7a166,
  ink: 0x170f0b,
  leaf1: 0x2d7950,
  leaf2: 0x6fb46d,
  screen: 0x16263a,
  letterboxd: 0xff8000,
  youtube: 0xff3d35,
  steam: 0x66c0f4,
  chess: 0x6b9b41,
};

/* Réseaux : source unique pour la scène ET les tests */
export const LINKS = {
  letterboxd: "https://letterboxd.com/stewybear/",
  desk: "https://www.youtube.com/@Stewybear-h9v",
  chess: "https://www.chess.com/az/member/stewybear",
};

export const CAMERA_START = { x: 0, y: 4.2, z: 8.5 };

/**
 * Construit toute la scène 3D.
 * @param {object} THREE - le module three (injecté pour testabilité)
 * @returns {{scene, camera, interactives, flames, fireLight, bear}}
 */
export function buildScene(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.night0);
  scene.fog = new THREE.Fog(C.night0, 14, 30);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(CAMERA_START.x, CAMERA_START.y, CAMERA_START.z);

  /* --- Helpers (cubes + matériaux mis en cache) --- */
  const matCache = new Map();
  function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 1,
      metalness: opts.metalness ?? 0,
      flatShading: true,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
    });
    matCache.set(key, m);
    return m;
  }

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, color, x, y, z, parent, opts = {}) {
    const m = new THREE.Mesh(boxGeo, mat(color, opts));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = opts.cast ?? true;
    m.receiveShadow = opts.receive ?? true;
    (parent || scene).add(m);
    return m;
  }

  /* --- Lumières --- */
  scene.add(new THREE.AmbientLight(0x3a4570, 0.7)); // nuit froide
  scene.add(new THREE.HemisphereLight(0x6b5a7a, 0x140d12, 0.5)); // fill doux

  const moon = new THREE.DirectionalLight(0x8fb6ff, 0.25);
  moon.position.set(-6, 9, 4);
  scene.add(moon);

  const fireLight = new THREE.PointLight(C.fire2, 26, 22, 2);
  fireLight.position.set(0, 1.8, -4.4);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(1024, 1024);
  fireLight.shadow.camera.near = 0.2;
  scene.add(fireLight);

  /* --- Pièce : sol + murs --- */
  const ROOM_W = 16;
  const ROOM_D = 12;
  const WALL_H = 9;
  const BACK_Z = -ROOM_D / 2;

  box(ROOM_W, 0.6, ROOM_D, C.wood2, 0, -0.3, 0, scene, { receive: true, cast: false }); // sol
  for (let i = 0; i < 8; i++) {
    box(ROOM_W, 0.02, 0.06, C.wood1, 0, 0.01, -ROOM_D / 2 + 0.7 + i * 1.5, scene, { cast: false });
  }
  box(ROOM_W, WALL_H, 0.6, C.wall1, 0, WALL_H / 2, BACK_Z, scene, { receive: true }); // mur du fond
  box(0.6, WALL_H, ROOM_D, C.wall0, -ROOM_W / 2, WALL_H / 2, 0, scene, { receive: true }); // mur gauche
  box(0.6, WALL_H, ROOM_D, C.wall0, ROOM_W / 2, WALL_H / 2, 0, scene, { receive: true }); // mur droit
  box(ROOM_W, 0.5, 0.2, C.wood1, 0, 0.25, BACK_Z + 0.4, scene, { cast: false }); // plinthe

  /* --- Fenêtre de nuit (mur gauche) avec lune --- */
  const winG = new THREE.Group();
  winG.position.set(-ROOM_W / 2 + 0.35, 5, -1.5);
  scene.add(winG);
  box(0.15, 3.2, 3.2, C.ink, 0, 0, 0, winG, { cast: false });
  box(0.1, 2.7, 2.7, C.screen, 0.06, 0, 0, winG, { cast: false, emissive: C.screen, emissiveIntensity: 0.6 });
  // La lune devient un petit groupe cliquable : elle déclenche le mini-jeu 2D « combat sur la Lune ».
  const moonGroup = new THREE.Group();
  moonGroup.position.set(0.12, 0.6, 0.6);
  winG.add(moonGroup);
  box(0.05, 0.7, 0.7, C.fire4, 0, 0, 0, moonGroup, { cast: false, emissive: C.fire4, emissiveIntensity: 0.8 }); // lune
  // Cible de clic/survol invisible mais légèrement plus large, pour viser la lune plus facilement.
  const moonHit = new THREE.Mesh(
    boxGeo,
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  moonHit.scale.set(0.4, 1.2, 1.2);
  moonGroup.add(moonHit);
  box(0.16, 2.7, 0.12, C.wood1, 0.04, 0, 0, winG, { cast: false });
  box(0.16, 0.12, 2.7, C.wood1, 0.04, 0, 0, winG, { cast: false });

  /* --- Cheminée (mur du fond) --- */
  const fp = new THREE.Group();
  fp.position.set(0, 0, BACK_Z + 0.5);
  scene.add(fp);
  box(4.4, 5.4, 0.8, C.stone, 0, 2.7, 0, fp); // corps
  box(5, 0.5, 1.1, C.wood3, 0, 3.4, 0.1, fp); // manteau
  box(3, 3, 0.5, C.ink, 0, 1.5, 0.25, fp); // foyer (creux sombre)
  box(2.6, 0.4, 0.45, C.wood1, 0, 0.45, 0.3, fp); // bûches
  box(2.6, 0.4, 0.45, C.wood2, 0, 0.8, 0.35, fp);

  const flames = [];
  const flameColors = [C.fire1, C.fire2, C.fire3, C.fire4];
  for (let i = 0; i < 7; i++) {
    const fx = -0.9 + i * 0.3;
    const f = box(0.26, 0.8, 0.26, flameColors[i % 4], fx, 1.0, 0.35, fp, {
      cast: false,
      emissive: flameColors[i % 4],
      emissiveIntensity: 1.4,
      roughness: 0.6,
    });
    flames.push(f);
  }

  /* --- Tapis --- */
  box(5, 0.05, 3.4, C.fire1, 0, 0.04, 1.8, scene, { cast: false });
  box(4.2, 0.06, 2.7, C.fire3, 0, 0.05, 1.8, scene, { cast: false });

  /* --- Pouf + popcorn devant la TV (coin Letterboxd) --- */
  const pouf = new THREE.Group();
  pouf.position.set(-3.8, 0, -0.1);
  scene.add(pouf);
  box(1.2, 0.45, 1.2, C.fire1, 0, 0.32, 0, pouf, { receive: true }); // assise
  box(1.0, 0.2, 1.0, C.fire3, 0, 0.6, 0, pouf, { cast: false }); // coussin

  const popcorn = new THREE.Group();
  popcorn.position.set(-2.7, 0, 0.5);
  scene.add(popcorn);
  box(0.5, 0.6, 0.5, C.cream, 0, 0.3, 0, popcorn, { cast: false }); // gobelet
  box(0.52, 0.18, 0.52, C.fire1, 0, 0.16, 0, popcorn, { cast: false }); // bande rouge bas
  box(0.52, 0.18, 0.52, C.fire1, 0, 0.5, 0, popcorn, { cast: false }); // bande rouge haut
  box(0.16, 0.16, 0.16, C.fire4, -0.12, 0.66, 0.05, popcorn, { cast: false }); // grains
  box(0.16, 0.16, 0.16, C.fire4, 0.1, 0.7, -0.08, popcorn, { cast: false });
  box(0.16, 0.16, 0.16, C.fire4, 0.02, 0.72, 0.12, popcorn, { cast: false });

  /* --- Objets interactifs (mêmes réseaux que le 2D) --- */
  const interactives = [];
  function tag(group, name, label, url) {
    group.userData = { name, label, url };
    group.traverse((o) => (o.userData.root = group));
    interactives.push(group);
  }

  // TV : Letterboxd
  const tv = new THREE.Group();
  tv.position.set(-5, 0, -3.4);
  scene.add(tv);
  box(0.9, 1.4, 0.9, C.wood1, 0, 0.7, 0, tv);
  box(2.6, 1.7, 0.4, C.ink, 0, 2.4, 0, tv);
  box(2.2, 1.3, 0.1, 0x14181c, 0, 2.4, 0.22, tv, { emissive: 0x14181c, emissiveIntensity: 0.3, cast: false }); // écran sombre
  // Logo Letterboxd : trois pastilles orange / vert / bleu
  box(0.34, 0.34, 0.06, 0xff8000, -0.42, 2.4, 0.3, tv, { emissive: 0xff8000, emissiveIntensity: 0.9, cast: false });
  box(0.34, 0.34, 0.06, 0x00e054, 0, 2.4, 0.3, tv, { emissive: 0x00e054, emissiveIntensity: 0.9, cast: false });
  box(0.34, 0.34, 0.06, 0x40bcf4, 0.42, 2.4, 0.3, tv, { emissive: 0x40bcf4, emissiveIntensity: 0.9, cast: false });
  tag(tv, "letterboxd", "Letterboxd", LINKS.letterboxd);

  // Bureau : YouTube + Steam
  const desk = new THREE.Group();
  desk.position.set(5, 0, -3.2);
  scene.add(desk);
  box(3, 0.3, 1.6, C.wood3, 0, 1.5, 0, desk);
  box(0.2, 1.5, 0.2, C.wood1, -1.3, 0.75, -0.6, desk, { cast: false });
  box(0.2, 1.5, 0.2, C.wood1, 1.3, 0.75, -0.6, desk, { cast: false });
  box(0.2, 1.5, 0.2, C.wood1, -1.3, 0.75, 0.6, desk, { cast: false });
  box(0.2, 1.5, 0.2, C.wood1, 1.3, 0.75, 0.6, desk, { cast: false });
  box(1.9, 1.2, 0.18, C.ink, 0, 2.5, -0.4, desk);
  box(1.6, 0.95, 0.05, C.youtube, 0, 2.65, -0.3, desk, { emissive: C.youtube, emissiveIntensity: 0.7, cast: false });
  box(0.3, 0.28, 0.06, C.cream, 0, 2.65, -0.26, desk, { emissive: C.cream, emissiveIntensity: 0.6, cast: false }); // « play » YouTube
  box(1.6, 0.18, 0.05, C.steam, 0, 2.0, -0.3, desk, { emissive: C.steam, emissiveIntensity: 0.7, cast: false });
  box(0.9, 0.08, 0.4, C.wall2, 0, 1.7, 0.4, desk, { cast: false }); // clavier
  // Souris RGB posée sur le bureau (visible dans la pièce)
  box(0.34, 0.16, 0.48, C.ink, 0.8, 1.74, 0.45, desk, { cast: false });
  box(0.16, 0.05, 0.24, C.steam, 0.8, 1.83, 0.45, desk, { cast: false, emissive: C.steam, emissiveIntensity: 1 }); // LED souris
  // Casque RGB sur son support (visible dans la pièce). Le casque lui-même vit
  // dans un groupe à part (`deskHeadset`) : on le masque quand Stewy enfile le
  // sien au bureau (il « le prend »), puis on le réaffiche quand il repart.
  box(0.1, 0.8, 0.1, C.wall2, -1.0, 1.95, 0.45, desk, { cast: false }); // pied du support (reste toujours)
  const deskHeadset = new THREE.Group();
  desk.add(deskHeadset);
  box(0.7, 0.16, 0.22, C.ink, -1.0, 2.42, 0.45, deskHeadset, { cast: false }); // arceau
  box(0.22, 0.42, 0.36, C.ink, -1.22, 2.2, 0.45, deskHeadset, { cast: false }); // écouteur G
  box(0.22, 0.42, 0.36, C.ink, -0.78, 2.2, 0.45, deskHeadset, { cast: false }); // écouteur D
  box(0.06, 0.18, 0.18, C.fire2, -1.34, 2.2, 0.45, deskHeadset, { cast: false, emissive: C.fire2, emissiveIntensity: 1 }); // LED RGB G
  box(0.06, 0.18, 0.18, C.fire2, -0.66, 2.2, 0.45, deskHeadset, { cast: false, emissive: C.fire2, emissiveIntensity: 1 }); // LED RGB D
  tag(desk, "desk", "Bureau (YouTube · Steam)", LINKS.desk);

  // Table d'échecs : Chess.com
  const chess = new THREE.Group();
  chess.position.set(3.6, 0, 2.6);
  scene.add(chess);
  box(1.5, 0.2, 1.5, C.wood2, 0, 1.1, 0, chess);
  box(0.25, 1.1, 0.25, C.wood1, 0, 0.55, 0, chess, { cast: false });
  box(1.3, 0.08, 1.3, C.cream, 0, 1.24, 0, chess, { cast: false }); // damier (cases claires)
  // cases sombres : 8x8 en quinconce
  const TILE = 1.3 / 8;
  const tile0 = -0.65 + TILE / 2;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 1) {
        box(TILE, 0.04, TILE, C.ink, tile0 + i * TILE, 1.29, tile0 + j * TILE, chess, { cast: false });
      }
    }
  }
  box(0.18, 0.5, 0.18, C.ink, -0.3, 1.55, -0.2, chess, { cast: false }); // pièces
  box(0.18, 0.45, 0.18, C.ink, 0.2, 1.5, 0.1, chess, { cast: false });
  box(0.18, 0.5, 0.18, C.cream, 0.3, 1.55, 0.3, chess, { cast: false });
  tag(chess, "chess", "Chess.com", LINKS.chess);

  // Téléphone de Stewy, posé sur un coin de la table d'échecs.
  // Objet cliquable à part (il copie le Supercell ID) : comme la lune et la
  // cheminée, il N'ENTRE PAS dans `interactives` (réservé aux 3 réseaux testés).
  // Son nom/label et la gestion du clic sont câblés dans scene3d.js / site3d.js.
  const phone = new THREE.Group();
  phone.position.set(4.02, 1.34, 3.0); // coin avant-droit du plateau d'échecs
  phone.rotation.y = -0.4; // posé un peu de travers, l'air vivant
  scene.add(phone);
  box(0.32, 0.05, 0.6, C.ink, 0, 0, 0, phone, { cast: false }); // coque
  box(0.26, 0.03, 0.52, C.steam, 0, 0.035, 0, phone, {
    cast: false,
    emissive: C.steam,
    emissiveIntensity: 0.9,
  }); // écran allumé
  box(0.14, 0.02, 0.14, C.fire3, 0, 0.055, -0.12, phone, {
    cast: false,
    emissive: C.fire3,
    emissiveIntensity: 0.9,
  }); // icône d'appli (carré doré)
  // Cible de clic invisible, plus large : le téléphone est petit à viser.
  const phoneHit = new THREE.Mesh(
    boxGeo,
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  phoneHit.scale.set(0.5, 0.5, 0.8);
  phoneHit.position.set(0, 0.2, 0);
  phone.add(phoneHit);

  // Bibliothèque (déco)
  const shelf = new THREE.Group();
  shelf.position.set(-6.4, 0, 1.5);
  scene.add(shelf);
  box(0.6, 4.5, 2.6, C.wood1, 0, 2.25, 0, shelf);
  const bookColors = [C.fire1, C.steam, C.leaf2, C.fire3, C.youtube, C.cream];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      box(0.4, 0.7, 0.18, bookColors[(row + i) % bookColors.length], 0.12, 1.1 + row * 1.2, -0.9 + i * 0.42, shelf, { cast: false });
    }
  }
  // Boîtier de jeu « GBM » posé sur l'étagère du bas (indice : la biblio lance le jeu 3D).
  box(0.42, 0.62, 0.07, C.ink, 0.2, 0.55, 0.7, shelf, { cast: false });
  box(0.34, 0.5, 0.04, C.fire2, 0.24, 0.58, 0.72, shelf, { cast: false, emissive: C.fire1, emissiveIntensity: 0.25 });

  // Plante (déco)
  const plant = new THREE.Group();
  plant.position.set(6.4, 0, 2.2);
  scene.add(plant);
  box(0.8, 0.8, 0.8, C.fire1, 0, 0.4, 0, plant);
  box(0.5, 0.9, 0.5, C.leaf1, 0, 1.2, 0, plant, { cast: false });
  box(0.7, 0.5, 0.7, C.leaf2, 0, 1.7, 0, plant, { cast: false });
  box(0.4, 0.4, 0.4, C.leaf2, 0, 2.1, 0, plant, { cast: false });

  /* --- Stewy : ours voxel assis devant le feu --- */
  const bear = new THREE.Group();
  bear.position.set(1.2, 0, 2.2);
  bear.rotation.y = Math.PI * 0.82; // 3/4 face caméra
  scene.add(bear);
  box(1.4, 1.3, 1.0, C.bear2, 0, 1.0, 0, bear); // corps
  box(0.8, 0.9, 0.5, C.bearBelly, 0, 0.95, -0.35, bear, { cast: false }); // ventre
  box(1.1, 1.0, 1.0, C.bear2, 0, 2.0, 0, bear); // tête
  box(0.35, 0.35, 0.25, C.bear1, -0.45, 2.55, 0, bear, { cast: false }); // oreille G
  box(0.35, 0.35, 0.25, C.bear1, 0.45, 2.55, 0, bear, { cast: false }); // oreille D
  box(0.5, 0.4, 0.3, C.bearBelly, 0, 1.85, -0.5, bear, { cast: false }); // museau
  box(0.14, 0.14, 0.12, C.ink, -0.25, 2.1, -0.5, bear, { cast: false }); // œil G
  box(0.14, 0.14, 0.12, C.ink, 0.25, 2.1, -0.5, bear, { cast: false }); // œil D
  box(0.16, 0.12, 0.12, C.ink, 0, 1.9, -0.66, bear, { cast: false }); // truffe
  const armL = box(0.35, 0.8, 0.35, C.bear1, -0.85, 1.0, -0.1, bear, { cast: false }); // bras G
  const armR = box(0.35, 0.8, 0.35, C.bear1, 0.85, 1.0, -0.1, bear, { cast: false }); // bras D
  const legL = box(0.5, 0.4, 0.6, C.bear1, -0.4, 0.3, -0.4, bear, { cast: false }); // patte G
  const legR = box(0.5, 0.4, 0.6, C.bear1, 0.4, 0.3, -0.4, bear, { cast: false }); // patte D
  // Références des membres + maison, pour l'animation de marche (gérée dans scene3d.js)
  bear.userData.limbs = { armL, armR, legL, legR };
  bear.userData.home = { pos: [1.2, 0, 2.2], rotY: Math.PI * 0.82 };

  // Casque audio RGB de Stewy (caché ; s'affiche quand il rejoint Discord).
  // Le visage est sur -z : micro vers l'avant (-z).
  const headset = new THREE.Group();
  bear.add(headset);
  box(1.3, 0.16, 0.32, C.ink, 0, 2.62, 0, headset, { cast: false }); // arceau
  box(0.22, 0.46, 0.46, C.ink, -0.56, 2.12, 0, headset, { cast: false }); // écouteur G
  box(0.22, 0.46, 0.46, C.ink, 0.56, 2.12, 0, headset, { cast: false }); // écouteur D
  box(0.07, 0.16, 0.16, C.steam, -0.69, 2.12, 0, headset, { cast: false, emissive: C.steam, emissiveIntensity: 1 }); // LED G
  box(0.07, 0.16, 0.16, C.steam, 0.69, 2.12, 0, headset, { cast: false, emissive: C.steam, emissiveIntensity: 1 }); // LED D
  box(0.1, 0.1, 0.5, C.ink, -0.5, 1.92, -0.35, headset, { cast: false }); // micro
  headset.visible = false;
  bear.userData.headset = headset;

  // Gouttes de sueur (cachées ; apparaissent de plus en plus quand Stewy a chaud).
  const sweat = [];
  [[-0.45, 2.42, -0.42], [0.45, 2.44, -0.42], [-0.55, 2.05, -0.46], [0.55, 2.05, -0.46]].forEach(
    ([sx, sy, sz]) => {
      const d = box(0.1, 0.18, 0.1, C.steam, sx, sy, sz, bear, {
        cast: false,
        emissive: C.steam,
        emissiveIntensity: 0.7,
      });
      d.visible = false;
      sweat.push(d);
    }
  );
  bear.userData.sweat = sweat;

  // Matériaux de la fourrure (pour le rougissement « trop chaud »). On les
  // récupère depuis les meshes pour viser exactement ceux de l'ours.
  const furColors = new Set([C.bear1, C.bear2, C.bearBelly]);
  const furMats = [];
  bear.traverse((o) => {
    if (o.isMesh && furColors.has(o.material.color.getHex()) && !furMats.includes(o.material)) {
      furMats.push(o.material);
    }
  });
  bear.userData.furMats = furMats;

  /* --- Emplacements où Stewy se rend selon l'objet survolé --- */
  const bearSpots = {
    idle: { pos: [1.2, 0, 2.2], rotY: Math.PI * 0.82 },
    // assis SUR le pouf (sitY le surélève) face à la TV ; au bout de 5 s il prend le popcorn
    letterboxd: { pos: [-3.8, 0, -0.1], look: [-5, 1.8, -3.4], sit: true, sitY: 0.55 },
    desk: { pos: [4.4, 0, -1.4], look: [5, 1.8, -3.2] }, // au bureau
    chess: { pos: [2.4, 0, 2.6], look: [3.6, 1.2, 2.6] }, // à l'échiquier
    // devant le coin de la table où repose le téléphone : Stewy s'y rend pour le prendre
    phone: { pos: [2.9, 0, 3.6], look: [4.02, 1.34, 3.0] },
    fire: { pos: [0, 0, -3.7], look: [0, 1.2, -4.8] }, // devant le foyer (easter egg)
  };

  return { scene, camera, interactives, flames, fireLight, bear, fireplace: fp, bearSpots, pouf, popcorn, deskHeadset, moon: moonGroup, phone, shelf };
}

/**
 * Anime la scène (feu vacillant). Le balancement / déplacement de Stewy est
 * géré dans scene3d.js (updateBear), pour pouvoir piloter sa position en Y
 * (rebond de marche, chute dans le feu) sans conflit.
 * Fonction pure et déterministe (le bruit est injecté) -> testable.
 * @param {{flames, fireLight}} refs
 * @param {number} t - temps en secondes
 * @param {number} noise - bruit dans [0,1] (0 par défaut)
 */
export function updateScene(refs, t, noise = 0) {
  const { flames, fireLight } = refs;
  const flick = 0.75 + Math.sin(t * 13) * 0.12 + Math.sin(t * 31) * 0.08 + noise * 0.08;
  fireLight.intensity = 18 + flick * 14;
  flames.forEach((f, i) => {
    const s = 0.7 + Math.abs(Math.sin(t * (7 + i) + i)) * 0.7;
    f.scale.y = s;
    f.position.y = 0.9 + s * 0.35;
  });
}
