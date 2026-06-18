/* Tests unitaires de la pièce 3D (logique pure de room.js).
   Lancer : npm test   (node --test) */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildScene, updateScene, C, LINKS, CAMERA_START } from "../room.js";

/* Construit la scène une fois pour la majorité des tests. */
function fresh() {
  return buildScene(THREE);
}

test("buildScene renvoie une scène, une caméra et des références", () => {
  const r = fresh();
  assert.ok(r.scene.isScene, "scene doit être une THREE.Scene");
  assert.ok(r.camera.isCamera, "camera doit être une THREE.Camera");
  assert.ok(Array.isArray(r.interactives));
  assert.ok(Array.isArray(r.flames));
  assert.ok(r.fireLight.isPointLight);
  assert.ok(r.bear.isObject3D);
});

test("la caméra démarre à la position prévue", () => {
  const { camera } = fresh();
  assert.equal(camera.position.x, CAMERA_START.x);
  assert.equal(camera.position.y, CAMERA_START.y);
  assert.equal(camera.position.z, CAMERA_START.z);
});

test("le fond et le brouillard nocturnes sont posés", () => {
  const { scene } = fresh();
  assert.equal(scene.background.getHex(), C.night0);
  assert.ok(scene.fog, "un brouillard doit exister");
  assert.equal(scene.fog.color.getHex(), C.night0);
});

test("il y a exactement 3 objets interactifs, bien nommés", () => {
  const { interactives } = fresh();
  assert.equal(interactives.length, 3);
  const names = interactives.map((g) => g.userData.name).sort();
  assert.deepEqual(names, ["chess", "desk", "letterboxd"]);
});

test("chaque interactif pointe vers la bonne URL de réseau", () => {
  const { interactives } = fresh();
  const byName = Object.fromEntries(interactives.map((g) => [g.userData.name, g.userData.url]));
  assert.equal(byName.letterboxd, LINKS.letterboxd);
  assert.equal(byName.desk, LINKS.desk);
  assert.equal(byName.chess, LINKS.chess);
  // les URL doivent être absolues (cliquables)
  for (const url of Object.values(byName)) assert.match(url, /^https:\/\//);
});

test("chaque sous-mesh d'un interactif référence son groupe racine (pour le raycast)", () => {
  const { interactives } = fresh();
  for (const group of interactives) {
    let meshes = 0;
    group.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        assert.equal(o.userData.root, group, "userData.root doit pointer vers le groupe");
      }
    });
    assert.ok(meshes > 0, "un interactif doit contenir au moins un mesh");
  }
});

test("le feu : 7 flammes émissives + une lumière ponctuelle bien placée", () => {
  const { flames, fireLight } = fresh();
  assert.equal(flames.length, 7);
  for (const f of flames) {
    assert.ok(f.material.emissive.getHex() > 0, "une flamme doit être émissive");
  }
  assert.deepEqual(
    [fireLight.position.x, fireLight.position.y, fireLight.position.z],
    [0, 1.8, -4.4]
  );
  assert.ok(fireLight.castShadow, "le feu doit projeter des ombres");
});

test("l'éclairage contient les 4 types attendus", () => {
  const { scene } = fresh();
  const lights = [];
  scene.traverse((o) => o.isLight && lights.push(o.type));
  assert.ok(lights.includes("AmbientLight"));
  assert.ok(lights.includes("HemisphereLight"));
  assert.ok(lights.includes("DirectionalLight"));
  assert.ok(lights.includes("PointLight"));
});

test("Stewy est un groupe orienté 3/4 avec plusieurs cubes", () => {
  const { bear } = fresh();
  let meshes = 0;
  bear.traverse((o) => o.isMesh && meshes++);
  assert.ok(meshes >= 12, "l'ours doit être composé de nombreux cubes");
  assert.ok(Math.abs(bear.rotation.y - Math.PI * 0.82) < 1e-9);
});

test("la scène contient un nombre conséquent de mailles (pièce remplie)", () => {
  const { scene } = fresh();
  let meshes = 0;
  scene.traverse((o) => o.isMesh && meshes++);
  assert.ok(meshes > 40, `attendu > 40 cubes, obtenu ${meshes}`);
});

test("updateScene est déterministe (sans bruit) et anime feu + ours", () => {
  const r = fresh();
  const refs = { flames: r.flames, fireLight: r.fireLight, bear: r.bear };

  // t = 0, bruit = 0 -> valeurs analytiques connues
  updateScene(refs, 0, 0);
  assert.ok(Math.abs(r.fireLight.intensity - (18 + 0.75 * 14)) < 1e-9); // 28.5
  assert.ok(Math.abs(r.bear.position.y - 0) < 1e-9);

  // à un autre instant, l'intensité change (le feu vacille)
  updateScene(refs, 1.23, 0);
  assert.notEqual(r.fireLight.intensity, 28.5);

  // le balancement de Stewy reste borné
  for (let t = 0; t < 10; t += 0.13) {
    updateScene(refs, t, 0);
    assert.ok(Math.abs(r.bear.position.y) <= 0.04 + 1e-9);
  }

  // les flammes gardent une échelle verticale strictement positive
  updateScene(refs, 2.5, 0);
  for (const f of r.flames) assert.ok(f.scale.y > 0);
});

test("le bruit injecté influe sur l'intensité du feu (borné)", () => {
  const r = fresh();
  const refs = { flames: r.flames, fireLight: r.fireLight, bear: r.bear };
  updateScene(refs, 5, 0);
  const low = r.fireLight.intensity;
  updateScene(refs, 5, 1);
  const high = r.fireLight.intensity;
  assert.ok(high > low, "plus de bruit -> feu un peu plus intense");
  assert.ok(high - low <= 0.08 * 14 + 1e-9, "l'effet du bruit reste borné");
});
