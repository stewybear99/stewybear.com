/* =========================================================
   Stewybear — pièce 3D voxel (prototype)
   Three.js via CDN ESM (aucun build). La construction de la
   scène vit dans room.js (pure + testable) ; ici on gère le
   rendu WebGL, la caméra orbitale, l'interaction et la boucle.
   ========================================================= */
import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { buildScene, updateScene } from "./room.js";

const canvas = document.getElementById("scene3d");

function showStartupError(error) {
  console.error(error);
  const msg = document.querySelector(".label span");
  if (msg) {
    msg.textContent = "La 3D n'a pas pu démarrer sur ce navigateur. Reviens à la version 2D.";
    msg.style.color = "#ffb24d";
  }
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer: true, // garde la dernière image affichée même si la boucle est bridée (onglet caché)
  });
} catch (error) {
  showStartupError(error);
  throw error;
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const RENDER_SCALE = 0.62; // sous-échantillonnage volontaire -> rendu « chunky » pixel

const { scene, camera, interactives, flames, fireLight, bear, fireplace, bearSpots, pouf, popcorn, deskHeadset, moon, phone, shelf } =
  buildScene(THREE);

// Position d'origine du popcorn (au sol près du pouf), pour l'y reposer
// quand Stewy ne le tient plus.
const popcornHome = popcorn.position.clone();

// Position + orientation d'origine du téléphone (coin de la table d'échecs),
// pour l'y reposer quand Stewy le lâche.
const phoneHome = { pos: phone.position.clone(), rot: phone.rotation.clone() };

// La cheminée devient cliquable (easter egg du mini-jeu), sans entrer dans
// `interactives` (qui reste les 3 objets-réseaux testés dans room.test.mjs).
fireplace.userData.name = "fire";
fireplace.userData.label = "Cheminée";
fireplace.traverse((o) => (o.userData.root = fireplace));

// Le pouf est aussi un point d'entrée Letterboxd : le survoler y envoie Stewy.
pouf.userData.name = "letterboxd";
pouf.userData.label = "Letterboxd";
pouf.traverse((o) => (o.userData.root = pouf));

// La lune (fenêtre, mur gauche) lance le mini-jeu 2D « combat sur la Lune ».
moon.userData.name = "moon";
moon.userData.label = "Lune";
moon.traverse((o) => (o.userData.root = moon));

// Le téléphone (sur la table d'échecs) copie le Supercell ID au clic.
phone.userData.name = "supercell";
phone.userData.label = "Supercell ID";
phone.traverse((o) => (o.userData.root = phone));

// La bibliothèque (mur gauche) ouvre une vue zoom où l'on choisit le CD du
// jeu 3D « Grand Bear Mafia ».
shelf.userData.name = "gbm";
shelf.userData.label = "Grand Bear Mafia";
shelf.traverse((o) => (o.userData.root = shelf));

const clickTargets = interactives.concat([fireplace, pouf, moon, phone, shelf]);

/* =========================================================
   Stewy se déplace vers l'objet survolé (concept du site 2D)
   ---------------------------------------------------------
   Sur survol, scene3d appelle window.Stewy3D.hover(name), qui
   répercute via window.__bear3d.react(state). On choisit alors
   un « spot » (pouf / bureau / échiquier / maison) ; la boucle
   de rendu déplace Stewy avec un cycle de marche (pattes + bras
   qui balancent, petit rebond), puis l'oriente vers l'objet.
   ========================================================= */
const limbs = bear.userData.limbs;
const headset = bear.userData.headset;
const sweat = bear.userData.sweat || [];
const furMats = bear.userData.furMats || [];
let bearTarget = bearSpots.idle;
let falling = false; // chute dans le foyer (easter egg)

// Assise sur le pouf : on compte le temps réellement assis ; au bout de 5 s
// Stewy attrape le popcorn (le gobelet passe dans ses mains, bras tendus).
let prevTarget = bearTarget;
let sitTime = 0;
let holdingPopcorn = false;
let phoneWanted = false; // vrai tant qu'on survole le Supercell ID (Stewy va prendre le téléphone)
let holdingPhone = false;

function grabPopcorn() {
  holdingPopcorn = true;
  bear.add(popcorn); // le popcorn suit Stewy (repère local : -z = devant)
  popcorn.position.set(0, 0.62, -0.55);
  popcorn.rotation.set(0, 0, 0);
}

function releasePopcorn() {
  if (!holdingPopcorn) return;
  holdingPopcorn = false;
  scene.add(popcorn); // remis au sol, à sa place d'origine
  popcorn.position.copy(popcornHome);
  popcorn.rotation.set(0, 0, 0);
}

// Stewy prend le téléphone : il passe dans ses pattes, écran tourné vers son
// visage (le visage est sur -z ; on incline le téléphone pour qu'il le regarde).
function grabPhone() {
  holdingPhone = true;
  bear.add(phone);
  phone.position.set(0, 1.45, -0.72);
  phone.rotation.set(1.3, 0, 0);
}

function releasePhone() {
  if (!holdingPhone) return;
  holdingPhone = false;
  scene.add(phone); // reposé sur le coin de la table d'échecs
  phone.position.copy(phoneHome.pos);
  phone.rotation.copy(phoneHome.rot);
}

// Rougissement + sueur croissants quand Stewy a trop chaud (niveau 0..4).
function setHeat(level) {
  const r = level * 0.18;
  furMats.forEach((m) => m.emissive.setRGB(r, 0, 0));
  sweat.forEach((d, i) => (d.visible = i < level));
}

window.__bear3d = {
  react(state) {
    phoneWanted = false; // par défaut : Stewy ne cherche pas le téléphone
    // Discord : Stewy enfile le casque une fois lancé vers le bureau
    if (state === "wearing-headset") {
      if (headset) headset.visible = true;
      if (deskHeadset) deskHeadset.visible = false; // il a pris le casque posé sur le bureau
      return; // pas de changement de destination
    }
    if (headset) headset.visible = false; // tout autre état : casque rangé
    if (deskHeadset) deskHeadset.visible = true; // en repartant, il repose le casque sur le bureau

    // 5e clic : il tombe dans le feu (seul état qui le rapetisse)
    if (state === "falling") {
      setHeat(4);
      falling = true;
      bearTarget = bearSpots.fire;
      return;
    }

    // Hors chute : Stewy reprend TOUJOURS sa taille normale (et remonte s'il
    // était tombé sous le sol). Restauration inconditionnelle -> pas de bug si
    // on reclique sur le feu pendant la chute.
    falling = false;
    bear.scale.set(1, 1, 1);
    if (bear.position.y < -0.1) {
      bear.position.set(bearSpots.idle.pos[0], 0, bearSpots.idle.pos[2]);
    }

    // Feu : il s'approche du foyer, rougit et transpire de plus en plus
    if (typeof state === "string" && state.startsWith("heat:")) {
      setHeat(parseInt(state.slice(5), 10) || 0);
      bearTarget = bearSpots.fire;
      return;
    }

    setHeat(0);
    if (state === "letterboxd") bearTarget = bearSpots.letterboxd;
    else if (state === "youtube" || state === "steam" || state === "discord" || state === "desk" || state === "github")
      bearTarget = bearSpots.desk;
    else if (state === "chess") bearTarget = bearSpots.chess;
    else if (state === "supercell") {
      bearTarget = bearSpots.phone; // il va près de la table prendre son téléphone
      phoneWanted = true;
    } else if (state === "idle") bearTarget = bearSpots.idle;
  },
};

function approachAngle(cur, target, maxStep) {
  let d = target - cur;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  if (d > maxStep) d = maxStep;
  else if (d < -maxStep) d = -maxStep;
  return cur + d;
}

const WALK_SPEED = 5.2; // unités/seconde
let walkPhase = 0;

function updateBear(dt, t) {
  // Changement de destination : il lâche le popcorn / le téléphone et on remet le chrono d'assise à zéro.
  if (bearTarget !== prevTarget) {
    releasePopcorn();
    releasePhone();
    sitTime = 0;
    prevTarget = bearTarget;
  }

  // Chute dans le foyer : Stewy plonge vers le feu, rapetisse et s'enfonce
  if (falling) {
    bear.position.x += (0 - bear.position.x) * Math.min(1, 8 * dt);
    bear.position.z += (-4.6 - bear.position.z) * Math.min(1, 8 * dt);
    bear.position.y -= 3.2 * dt;
    const s = Math.max(0.25, bear.scale.x - 1.5 * dt);
    bear.scale.set(s, s, s);
    walkPhase += dt * 22; // il gigote en tombant
    limbs.legL.rotation.x = Math.sin(walkPhase) * 0.8;
    limbs.legR.rotation.x = -Math.sin(walkPhase) * 0.8;
    return;
  }

  const sp = bearTarget;
  const dx = sp.pos[0] - bear.position.x;
  const dz = sp.pos[2] - bear.position.z;
  const dist = Math.hypot(dx, dz);

  if (dist > 0.06) {
    // en marche (le visage de Stewy est sur son -z local -> +PI pour marcher à l'endroit)
    const step = Math.min(dist, WALK_SPEED * dt);
    bear.position.x += (dx / dist) * step;
    bear.position.z += (dz / dist) * step;
    bear.rotation.y = approachAngle(bear.rotation.y, Math.atan2(dx, dz) + Math.PI, 10 * dt);

    walkPhase += dt * 12;
    const swing = Math.sin(walkPhase) * 0.6;
    limbs.legL.rotation.x = swing;
    limbs.legR.rotation.x = -swing;
    limbs.armL.rotation.x = -swing;
    limbs.armR.rotation.x = swing;
    bear.position.y = Math.abs(Math.sin(walkPhase)) * 0.14; // petit rebond
  } else {
    // arrivé : on oriente vers l'objet (ou vers la maison) et on range les membres
    const faceY = sp.look
      ? Math.atan2(sp.look[0] - bear.position.x, sp.look[2] - bear.position.z) + Math.PI
      : sp.rotY;
    bear.rotation.y = approachAngle(bear.rotation.y, faceY, 10 * dt);

    if (sp.sit) {
      // Assis sur le pouf : on le surélève sur l'assise et, au bout de 5 s, il prend le popcorn.
      sitTime += dt;
      const k = Math.min(1, 6 * dt);
      bear.position.y += ((sp.sitY ?? 0.5) - bear.position.y) * k;
      limbs.legL.rotation.x *= 0.8;
      limbs.legR.rotation.x *= 0.8;
      // bras tendus vers l'avant pour tenir le gobelet une fois pris (sinon au repos)
      const armPose = holdingPopcorn ? 1.0 : 0;
      limbs.armL.rotation.x += (armPose - limbs.armL.rotation.x) * k;
      limbs.armR.rotation.x += (armPose - limbs.armR.rotation.x) * k;
      if (sitTime >= 5 && !holdingPopcorn) grabPopcorn();
    } else if (phoneWanted) {
      // Arrivé près de la table : il prend le téléphone et le tient devant lui pour le regarder.
      if (!holdingPhone) grabPhone();
      const k = Math.min(1, 6 * dt);
      limbs.legL.rotation.x *= 0.8;
      limbs.legR.rotation.x *= 0.8;
      // bras levés vers l'avant pour tenir le téléphone à hauteur du visage
      limbs.armL.rotation.x += (1.2 - limbs.armL.rotation.x) * k;
      limbs.armR.rotation.x += (1.2 - limbs.armR.rotation.x) * k;
      bear.position.y = Math.sin(t * 1.6) * 0.04;
    } else {
      limbs.legL.rotation.x *= 0.8;
      limbs.legR.rotation.x *= 0.8;
      limbs.armL.rotation.x *= 0.8;
      limbs.armR.rotation.x *= 0.8;
      bear.position.y = Math.sin(t * 1.6) * 0.04; // léger balancement au repos
    }
  }
}

const controls = new OrbitControls(camera, canvas);
const DEFAULT_TARGET = new THREE.Vector3(0, 3, -1);
controls.target.copy(DEFAULT_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.52; // on ne passe pas sous le sol
controls.minPolarAngle = Math.PI * 0.18;
controls.minAzimuthAngle = -Math.PI * 0.42; // on reste face à la pièce
controls.maxAzimuthAngle = Math.PI * 0.42;
controls.enabled = false; // caméra fixe : l'utilisateur ne peut pas la bouger
// (controls.update() reste appelé dans la boucle pour orienter la caméra vers la cible)

/* =========================================================
   La caméra dérive vers l'endroit survolé
   ---------------------------------------------------------
   On projette le curseur sur un plan horizontal à hauteur du
   regard, puis on déplace la cible des controls vers ce point
   (mélange borné). Comme OrbitControls repositionne la caméra
   à `target + offset` chaque frame, toute la vue glisse douce-
   ment vers le côté survolé, puis revient au centre quand la
   souris quitte le canvas.
   ========================================================= */
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);
const aimRay = new THREE.Raycaster();
const aimHit = new THREE.Vector3();
const desiredTarget = DEFAULT_TARGET.clone();
const AIM_BLEND = 0.4; // proportion du déplacement vers le point survolé
const AIM_LERP = 0.06; // lissage par frame de controls.target

/* =========================================================
   Anti-collision caméra
   ---------------------------------------------------------
   OrbitControls laisse la caméra traverser les murs/meubles
   quand on oriente sur les côtés à grande distance. On lance
   donc un rayon depuis la cible vers la caméra : si le décor
   est touché AVANT la caméra, on ramène celle-ci juste devant
   l'obstacle. Comme OrbitControls recalcule sa sphère à partir
   de la position réelle à chaque frame, le rapprochement
   devient sa nouvelle borne -> stable, sans tremblement.
   ========================================================= */
const colliders = [];
scene.traverse((o) => o.isMesh && colliders.push(o));

const camRay = new THREE.Raycaster();
const camDir = new THREE.Vector3();
const COLLIDE_MARGIN = 0.5; // on s'arrête un peu avant le mur/meuble

function clampCameraCollision() {
  camDir.subVectors(camera.position, controls.target);
  const dist = camDir.length();
  if (dist < 1e-3) return;
  camDir.divideScalar(dist); // normalise sans réallouer
  camRay.set(controls.target, camDir);
  camRay.far = dist;
  const hit = camRay.intersectObjects(colliders, false)[0];
  if (hit) {
    const d = Math.max(controls.minDistance * 0.5, hit.distance - COLLIDE_MARGIN);
    camera.position.copy(controls.target).addScaledVector(camDir, d);
  }
}

/* =========================================================
   Interaction : survol + clic (raycaster)
   ========================================================= */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
// Anti-rebond du survol : certaines hitboxes se touchent (ex. le téléphone posé
// sur la table d'échecs). Le raycaster prenait alors l'objet le plus proche, qui
// basculait d'un objet à l'autre au moindre mouvement, rejouant le son de survol
// en boucle. On ne valide donc un changement d'objet survolé que s'il reste stable
// pendant HOVER_DEBOUNCE_MS ; sinon les oscillations ne déclenchent rien.
const HOVER_DEBOUNCE_MS = 110;
let pendingRoot = null;
let pendingSince = 0;
let pointerPx = { x: 0, y: 0 };

function updatePointer(e) {
  const r = canvas.getBoundingClientRect();
  pointerPx = { x: e.clientX, y: e.clientY };
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}

function pickRoot() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickTargets, true);
  if (!hits.length) return null;
  return hits[0].object.userData.root || null;
}

// Les actions (label contextuel, ouverture de lien, vue bureau, mini-jeu)
// sont déléguées à window.Stewy3D, défini dans site3d.js.
function overlayOpen() {
  return window.Stewy3D && window.Stewy3D.isOverlayOpen && window.Stewy3D.isOverlayOpen();
}

canvas.addEventListener("pointermove", (e) => {
  if (overlayOpen()) {
    desiredTarget.copy(DEFAULT_TARGET); // overlay ouvert : on recentre la vue
    return;
  }
  updatePointer(e);

  // La caméra vise vers l'endroit survolé (projection du curseur sur aimPlane).
  aimRay.setFromCamera(pointer, camera);
  if (aimRay.ray.intersectPlane(aimPlane, aimHit)) {
    const cx = THREE.MathUtils.clamp(aimHit.x, -6, 6);
    const cz = THREE.MathUtils.clamp(aimHit.z, -5, 4);
    desiredTarget.set(
      DEFAULT_TARGET.x + (cx - DEFAULT_TARGET.x) * AIM_BLEND,
      DEFAULT_TARGET.y,
      DEFAULT_TARGET.z + (cz - DEFAULT_TARGET.z) * AIM_BLEND
    );
  }

  // On ne fait qu'enregistrer l'objet visé ; sa validation (et le son) attend
  // qu'il reste stable un court instant (voir frame()).
  const root = pickRoot();
  if (root !== pendingRoot) {
    pendingRoot = root;
    pendingSince = performance.now();
  }
});

// La souris quitte le canvas : la vue revient au cadrage neutre.
canvas.addEventListener("pointerleave", () => {
  desiredTarget.copy(DEFAULT_TARGET);
  // La souris quitte la pièce : plus rien n'est survolé (validé après l'anti-rebond).
  if (pendingRoot !== null) { pendingRoot = null; pendingSince = performance.now(); }
});

let downPos = null;
canvas.addEventListener("pointerdown", (e) => (downPos = { x: e.clientX, y: e.clientY }));
canvas.addEventListener("pointerup", (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  downPos = null;
  if (moved > 6) return; // garde-fou (la caméra est fixe, mais on évite les faux clics)
  if (overlayOpen()) return;
  updatePointer(e);
  const root = pickRoot();
  if (root && window.Stewy3D) {
    // Tactile : pas de survol préalable, donc on déclenche d'abord la réaction de
    // Stewy (déplacement + label) avant l'action, pour un retour visuel au doigt.
    if (e.pointerType === "touch") window.Stewy3D.hover(root.userData.name);
    window.Stewy3D.activate(root.userData.name);
  }
});

/* =========================================================
   Redimensionnement (robuste : ResizeObserver)
   ========================================================= */
const BASE_FOV = 55; // champ vertical de référence (paysage / desktop)
const BASE_ASPECT = 1.3; // au-delà, FOV inchangé ; en-dessous (portrait) on l'élargit

function resize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || canvas.parentElement.clientHeight || window.innerHeight;
  if (w < 2 || h < 2) return; // on attend une vraie taille
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * RENDER_SCALE);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // En portrait (téléphone tenu droit), l'écran est étroit : on élargit le champ
  // vertical pour conserver à peu près le champ HORIZONTAL d'un écran large, afin
  // que toute la pièce (objets de gauche à droite) reste visible. Plafonné pour
  // éviter une distorsion « fish-eye ».
  if (camera.aspect < BASE_ASPECT) {
    const baseHalf = Math.tan((BASE_FOV * Math.PI) / 180 / 2);
    const fov = (2 * Math.atan((baseHalf * BASE_ASPECT) / camera.aspect) * 180) / Math.PI;
    camera.fov = Math.min(fov, 100);
  } else {
    camera.fov = BASE_FOV;
  }
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
resize();

/* =========================================================
   Boucle de rendu — hybride rAF + timer.
   Dans un onglet/preview CACHÉ, requestAnimationFrame est
   suspendu : un fallback setInterval garde un rendu (bridé à
   ~1 img/s par le navigateur, mais l'image reste visible grâce
   à preserveDrawingBuffer).
   ========================================================= */
window.__dbg = { frames: 0, calls: 0, w: 0, h: 0, err: null };

let lastT = performance.now() / 1000;

function frame() {
  try {
    const t = performance.now() / 1000;
    const dt = Math.min(t - lastT, 0.05); // borne le pas (onglet ralenti)
    lastT = t;

    // Survol stabilisé : on n'applique le changement (label, réaction de Stewy,
    // son) qu'une fois l'objet visé resté le même assez longtemps. Les bascules
    // rapides entre deux hitboxes voisines ne déclenchent donc plus rien.
    if (pendingRoot !== hovered && performance.now() - pendingSince >= HOVER_DEBOUNCE_MS) {
      hovered = pendingRoot;
      canvas.style.cursor = hovered ? "pointer" : "default";
      if (window.Stewy3D) {
        if (hovered) window.Stewy3D.hover(hovered.userData.name);
        else window.Stewy3D.reset();
      }
    }
    // Optimisation : quand un overlay/jeu plein écran est ouvert (cheminée, donjon
    // de la Lune, bureau…), on « décharge » le hub 3D : on ne met plus à jour ni ne
    // redessine la scène WebGL. La dernière image reste affichée (preserveDrawingBuffer)
    // et tout le budget CPU/GPU va au mini-jeu 2D. On reprend la boucle à la fermeture.
    if (overlayOpen()) {
      window.__stewy3dReady = true;
      return;
    }
    updateScene({ flames, fireLight, bear }, t, Math.random());
    updateBear(dt, t); // Stewy marche vers l'objet survolé
    controls.target.lerp(desiredTarget, AIM_LERP); // la caméra glisse vers l'endroit survolé
    controls.update();
    clampCameraCollision(); // empêche la caméra de traverser le décor
    renderer.render(scene, camera);
    window.__stewy3dReady = true;
    window.__dbg.frames++;
    window.__dbg.calls = renderer.info.render.calls;
    window.__dbg.w = canvas.width;
    window.__dbg.h = canvas.height;
    window.__dbg.cam = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    window.__dbg.bear = {
      x: bear.position.x, y: bear.position.y, z: bear.position.z, ry: bear.rotation.y,
      hs: !!(headset && headset.visible),
      red: furMats[0] ? +furMats[0].emissive.r.toFixed(2) : 0,
      sweat: sweat.filter((d) => d.visible).length,
      scale: +bear.scale.x.toFixed(2),
      falling,
      sit: +sitTime.toFixed(1),
      hold: holdingPopcorn,
      holdPhone: holdingPhone,
      deskHs: !!(deskHeadset && deskHeadset.visible),
    };
  } catch (e) {
    window.__dbg.err = String((e && e.stack) || e);
  }
}

function rafLoop() {
  requestAnimationFrame(rafLoop);
  frame();
}
rafLoop();

// Filet de sécurité quand rAF est suspendu (page cachée)
setInterval(() => {
  if (document.hidden) frame();
}, 1000 / 30);
