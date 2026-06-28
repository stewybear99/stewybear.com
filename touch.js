/* =========================================================
   Commandes tactiles — version mobile
   ---------------------------------------------------------
   1. Détecte un écran tactile et pose la classe `is-touch`
      sur <html> (toute l'adaptation mobile s'y branche).
   2. Câble les manettes à l'écran des mini-jeux : chaque
      bouton porte `data-key` (+ `data-code`) et envoie un FAUX
      événement clavier (keydown/keyup) que les jeux écoutent
      déjà sur `window`. On renseigne À LA FOIS `key` et `code`
      car « Donjon de la Lune » lit `e.code` (ex. KeyW) alors que
      les autres jeux lisent `e.key` (ex. w). Aucune boucle de
      jeu n'est modifiée.
   La visée de « La Revanche de l'Ours » (vue 1re personne) est
   gérée à part, dans lro.js (glisser pour viser).
   ========================================================= */
(function () {
  "use strict";

  // --- 1. Détection tactile -------------------------------------------------
  const isTouch =
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    "ontouchstart" in window ||
    (navigator.maxTouchPoints || 0) > 0;

  document.documentElement.classList.toggle("is-touch", !!isTouch);
  if (!isTouch) return; // sur desktop, rien d'autre à faire

  // --- 2. Faux événements clavier ------------------------------------------
  // Les jeux écoutent tous keydown/keyup sur `window` : un seul dispatch suffit.
  function press(key, code) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }));
  }
  function release(key, code) {
    window.dispatchEvent(new KeyboardEvent("keyup", { key, code, bubbles: true }));
  }

  // Bouton maintenu : appuyé tant que le doigt reste dessus (déplacement, tir…).
  function bindHold(btn, key, code) {
    let active = false;
    const down = (e) => {
      if (e) e.preventDefault();
      if (active) return;
      active = true;
      btn.classList.add("is-pressed");
      press(key, code);
    };
    const up = (e) => {
      if (e) e.preventDefault();
      if (!active) return;
      active = false;
      btn.classList.remove("is-pressed");
      release(key, code);
    };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  }

  // Bouton ponctuel : une pression = un appui bref (saut, entrer/sortir…).
  function bindTap(btn, key, code) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.classList.add("is-pressed");
      press(key, code);
      window.setTimeout(() => {
        release(key, code);
        btn.classList.remove("is-pressed");
      }, 70);
    });
  }

  // --- 3. Câblage automatique des manettes ---------------------------------
  function wire(root) {
    root.querySelectorAll("[data-key]").forEach((btn) => {
      if (btn.__touchWired) return;
      btn.__touchWired = true;
      const key = btn.getAttribute("data-key");
      const code = btn.getAttribute("data-code") || "";
      if (btn.hasAttribute("data-tap")) bindTap(btn, key, code);
      else bindHold(btn, key, code);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => wire(document));
  } else {
    wire(document);
  }

  // Exposé pour lro.js (réutilise les mêmes helpers pour ses boutons spéciaux).
  window.TouchControls = { isTouch: true, press, release, bindHold, bindTap, wire };
})();
