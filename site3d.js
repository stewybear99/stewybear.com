/* =========================================================
   Stewybear 3D — interactions, i18n et easter egg
   ---------------------------------------------------------
   Adapté de script.js (la version 2D). On garde tous les
   systèmes réutilisables (liens, traductions, copie Discord,
   vue bureau, mini-jeu de la cheminée, classement, son,
   langue) ; la pièce pixel 2D et l'ours-sprite sont remplacés
   par la scène WebGL (scene3d.js), qui appelle les hooks
   exposés via window.Stewy3D.
   ========================================================= */

const socials = {
  letterboxd: { label: "Letterboxd", url: "https://letterboxd.com/stewybear/" },
  youtube: { label: "YouTube", url: "https://www.youtube.com/@Stewybear-h9v" },
  steam: { label: "Steam", url: "https://steamcommunity.com/profiles/76561199858155106" },
  chess: { label: "Chess.com", url: "https://www.chess.com/az/member/stewybear" },
  github: { label: "GitHub", url: "https://github.com/stewybear99" },
};

const DISCORD_PSEUDO = "stewybear99";
// Supercell ID : pas de page publique, juste un pseudo à copier (comme Discord).
const SUPERCELL_PSEUDO = "Stewybear";

/* --- Traductions ----------------------------------------- */
const I18N = {
  fr: {
    introHint: "au coin du feu",
    hover: "Survole un objet de la pièce",
    deskHover: "Clique pour t'installer au bureau",
    deskChoose: "Choisis sur le bureau",
    moonHover: "Clique sur la lune… si tu l'oses",
    shelfHover: "Clique sur la bibliothèque… des jeux t'attendent",
    shelfChoose: "Choisis un jeu",
    letterboxdAction: "Stewy se pose sur le pouf pour regarder un film sur Letterboxd.",
    youtubeAction: "Stewy s'installe au bureau pour lancer YouTube.",
    steamAction: "Stewy s'installe au bureau pour lancer Steam.",
    chessAction: "Stewy prépare son meilleur coup sur Chess.com.",
    githubAction: "Stewy file au bureau pour ouvrir son code sur GitHub.",
    discordAction: "Stewy met le casque pour rejoindre Discord.",
    supercellHover: "Le téléphone de Stewy : clique pour copier son Supercell ID.",
    supercellCopied: "Supercell ID copié : %s",
    supercellCopyFail: "Copie impossible — Supercell ID : %s",
    copyOk: "Pseudo Discord copié : %s",
    copyErr: "Copie impossible — pseudo Discord : %s",
    copied: "Copié !",
    copyFail: "Erreur",
    back: "‹ Retour",
    headsetLabel: "Copier le pseudo Discord",
    ariaLetterboxd: "Ouvrir Letterboxd",
    ariaChess: "Ouvrir Chess.com",
    ariaDeskZoom: "Zoomer sur le bureau de Stewy",
    ariaClose: "Retour au salon",
    ariaQuitGame: "Quitter le jeu",
    cruel: "Vous êtes cruel !",
    gameIntro: "Vous voulez jouer à ça ? Bien fait pour vous.",
    jetpackOn: "🚀 Jetpack débloqué ! Espace pour décoller.",
    gameOver: "Game Over",
    scoreLabel: "Score",
    retry: "Rejouer",
    quit: "Quitter",
    overScore: "Score : %s",
    introStudioSub: "présente",
    bestLabel: "Record",
    overBest: "Record : %s",
    newBest: "Nouveau record !",
    boardTitle: "Classement mondial",
    namePlaceholder: "Ton pseudo",
    sendBtn: "Envoyer",
    sending: "Envoi…",
    sent: "Score envoyé !",
    boardLoading: "Chargement du classement…",
    boardError: "Classement indisponible",
    boardEmpty: "Sois le premier à marquer !",
    credit: "Développé par Stewybear",
  },
  en: {
    introHint: "by the fireside",
    hover: "Hover over something in the room",
    deskHover: "Click to sit down at the desk",
    deskChoose: "Pick something on the desk",
    moonHover: "Click the moon… if you dare",
    shelfHover: "Click the bookshelf… games await",
    shelfChoose: "Pick a game",
    letterboxdAction: "Stewy settles on the pouf to watch a film on Letterboxd.",
    youtubeAction: "Stewy sits at the desk to open YouTube.",
    steamAction: "Stewy sits at the desk to open Steam.",
    chessAction: "Stewy plots his best move on Chess.com.",
    githubAction: "Stewy heads to the desk to open his code on GitHub.",
    discordAction: "Stewy puts on the headset to join Discord.",
    supercellHover: "Stewy's phone: click to copy his Supercell ID.",
    supercellCopied: "Supercell ID copied: %s",
    supercellCopyFail: "Couldn't copy — Supercell ID: %s",
    copyOk: "Discord username copied: %s",
    copyErr: "Couldn't copy — Discord username: %s",
    copied: "Copied!",
    copyFail: "Error",
    back: "‹ Back",
    headsetLabel: "Copy the Discord username",
    ariaLetterboxd: "Open Letterboxd",
    ariaChess: "Open Chess.com",
    ariaDeskZoom: "Zoom in on Stewy's desk",
    ariaClose: "Back to the living room",
    ariaQuitGame: "Quit the game",
    cruel: "You're cruel!",
    gameIntro: "You want to play that? Serves you right.",
    jetpackOn: "🚀 Jetpack unlocked! Space to blast off.",
    gameOver: "Game Over",
    scoreLabel: "Score",
    retry: "Play again",
    quit: "Quit",
    overScore: "Score: %s",
    introStudioSub: "presents",
    bestLabel: "Best",
    overBest: "Best: %s",
    newBest: "New best!",
    boardTitle: "World leaderboard",
    namePlaceholder: "Your name",
    sendBtn: "Submit",
    sending: "Sending…",
    sent: "Score submitted!",
    boardLoading: "Loading leaderboard…",
    boardError: "Leaderboard unavailable",
    boardEmpty: "Be the first to score!",
    credit: "Made by Stewybear",
  },
  es: {
    introHint: "junto al fuego",
    hover: "Pasa el cursor sobre algo de la sala",
    deskHover: "Haz clic para sentarte al escritorio",
    deskChoose: "Elige algo en el escritorio",
    moonHover: "Haz clic en la luna… si te atreves",
    shelfHover: "Haz clic en la estantería… te esperan juegos",
    shelfChoose: "Elige un juego",
    letterboxdAction: "Stewy se acomoda en el puf para ver una película en Letterboxd.",
    youtubeAction: "Stewy se sienta al escritorio para abrir YouTube.",
    steamAction: "Stewy se sienta al escritorio para abrir Steam.",
    chessAction: "Stewy prepara su mejor jugada en Chess.com.",
    githubAction: "Stewy va al escritorio para abrir su código en GitHub.",
    discordAction: "Stewy se pone los cascos para unirse a Discord.",
    supercellHover: "El teléfono de Stewy: haz clic para copiar su Supercell ID.",
    supercellCopied: "Supercell ID copiado: %s",
    supercellCopyFail: "No se pudo copiar — Supercell ID: %s",
    copyOk: "Usuario de Discord copiado: %s",
    copyErr: "No se pudo copiar — usuario de Discord: %s",
    copied: "¡Copiado!",
    copyFail: "Error",
    back: "‹ Volver",
    headsetLabel: "Copiar el usuario de Discord",
    ariaLetterboxd: "Abrir Letterboxd",
    ariaChess: "Abrir Chess.com",
    ariaDeskZoom: "Acercar el escritorio de Stewy",
    ariaClose: "Volver al salón",
    ariaQuitGame: "Salir del juego",
    cruel: "¡Eres cruel!",
    gameIntro: "¿Quieres jugar a esto? Te lo mereces.",
    jetpackOn: "🚀 ¡Jetpack desbloqueado! Espacio para despegar.",
    gameOver: "Game Over",
    scoreLabel: "Puntuación",
    retry: "Jugar otra vez",
    quit: "Salir",
    overScore: "Puntuación: %s",
    introStudioSub: "presenta",
    bestLabel: "Récord",
    overBest: "Récord: %s",
    newBest: "¡Nuevo récord!",
    boardTitle: "Clasificación mundial",
    namePlaceholder: "Tu nombre",
    sendBtn: "Enviar",
    sending: "Enviando…",
    sent: "¡Puntuación enviada!",
    boardLoading: "Cargando la clasificación…",
    boardError: "Clasificación no disponible",
    boardEmpty: "¡Sé el primero en puntuar!",
    credit: "Desarrollado por Stewybear",
  },
};

let lang = "fr";
function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;
}

/* --- Éléments -------------------------------------------- */
const label = document.querySelector(".label span");
const quickLinks = document.querySelectorAll("[data-link]");
const copyButtons = document.querySelectorAll("[data-copy]");
const deskView = document.querySelector(".desk-view");
const deskClose = document.querySelector(".desk-close");
const deskDesktop = document.querySelector(".dv-desktop");
const deskOptions = document.querySelectorAll(".dv-option");
const shelfView = document.querySelector(".shelf-view");
const shelfClose = document.querySelector(".sv-close");
const shelfCds = document.querySelectorAll(".sv-cd");
const gbmCine = document.querySelector(".gbm-cine");
const langButtons = document.querySelectorAll(".lang-switch button");

let copyTimer;
let headsetTimer;
let activeNetwork = "idle";

const ARRIVAL_MS = 520; // temps (simulé) pour rejoindre le bureau avant de mettre le casque

function setLabel(text) {
  if (label) label.textContent = text;
}

function clearStateTimers() {
  window.clearTimeout(headsetTimer);
}

function assignLinks() {
  quickLinks.forEach((link) => {
    const social = socials[link.dataset.link];
    if (!social) return;
    link.href = social.url;
    link.title = social.label;
    link.target = "_blank";
    link.rel = "noreferrer";
  });
}

/* --- Réactions de Stewy (déléguées à la scène 3D si dispo) --- */
function bearReact(state) {
  if (window.__bear3d && typeof window.__bear3d.react === "function") {
    window.__bear3d.react(state);
  }
}

function makeStewyHop(network) {
  if (network === "discord") {
    setLabel(t("discordAction"));
  } else if (socials[network]) {
    setLabel(t(network + "Action"));
  } else {
    return;
  }

  if (activeNetwork === network) return;
  activeNetwork = network;

  clearStateTimers();
  bearReact(network);
  if (window.Sound) Sound.steps(2);

  // Discord : il « met le casque » seulement une fois arrivé au bureau
  if (network === "discord") {
    headsetTimer = window.setTimeout(() => bearReact("wearing-headset"), ARRIVAL_MS);
  }
}

function sendStewyToDesk() {
  setLabel(t("deskHover"));
  if (activeNetwork === "desk") return;
  activeNetwork = "desk";
  clearStateTimers();
  bearReact("desk");
  if (window.Sound) Sound.steps(2);
}

function resetStewy() {
  activeNetwork = "idle";
  clearStateTimers();
  bearReact("idle");
  setLabel(t("hover"));
}

function openExternalUrl(network) {
  const social = socials[network];
  if (social) window.open(social.url, "_blank", "noreferrer");
}

function openDeskView() {
  clearStateTimers();
  activeNetwork = "idle";
  bearReact("idle");
  if (!deskView) return;
  deskView.setAttribute("aria-hidden", "false");
  document.body.classList.add("desk-open");
  if (deskClose) deskClose.focus();
  setLabel(t("deskChoose"));
}

function closeDeskView() {
  if (!deskView) return;
  deskView.setAttribute("aria-hidden", "true");
  document.body.classList.remove("desk-open");
  if (deskDesktop) delete deskDesktop.dataset.aim;
  setLabel(t("hover"));
}

/* --- Lune : zoom puis lancement du mini-jeu 2D « combat sur la Lune » --- */
const moonZoom = document.querySelector(".moon-zoom");
let moonZoomTimer;
function openMoonGame() {
  clearStateTimers();
  activeNetwork = "idle";
  bearReact("idle");
  setLabel(t("moonHover"));
  // Effet de zoom : un disque lunaire grossit pour remplir l'écran, puis le jeu s'ouvre.
  window.clearTimeout(moonZoomTimer);
  if (moonZoom) {
    moonZoom.setAttribute("aria-hidden", "false");
    moonZoom.classList.add("is-zooming");
  }
  if (window.Sound && Sound.enabled && Sound.jump) Sound.jump();
  moonZoomTimer = window.setTimeout(() => {
    if (window.MoonGame) window.MoonGame.open();
    if (moonZoom) {
      moonZoom.classList.remove("is-zooming");
      moonZoom.setAttribute("aria-hidden", "true");
    }
  }, 700);
}

/* --- Bibliothèque : vue zoom puis CD « Grand Bear Mafia » (jeu 3D) --- */
function openShelfView() {
  clearStateTimers();
  activeNetwork = "idle";
  bearReact("idle");
  if (!shelfView) return;
  shelfView.setAttribute("aria-hidden", "false");
  document.body.classList.add("shelf-open");
  if (shelfClose) shelfClose.focus();
  if (window.Sound && Sound.enabled && Sound.steps) Sound.steps(1);
  setLabel(t("shelfChoose"));
}

function closeShelfView() {
  if (!shelfView) return;
  shelfView.setAttribute("aria-hidden", "true");
  document.body.classList.remove("shelf-open");
  setLabel(t("hover"));
}

let gbmCineTimers = [];
function clearCineTimers() {
  gbmCineTimers.forEach((id) => window.clearTimeout(id));
  gbmCineTimers = [];
}
function openGBMGame() {
  closeShelfView();
  // Pas de cinématique disponible : on ouvre le jeu directement.
  if (!gbmCine || !window.GBM) {
    if (window.GBM) window.GBM.open();
    return;
  }
  // Cinématique : plan sur Stewy (jaquette en main) + bulle de pensée, puis
  // zoom dans la bulle d'où démarre le jeu.
  clearCineTimers();
  gbmCine.classList.remove("is-zooming", "is-playing");
  gbmCine.setAttribute("aria-hidden", "false");
  void gbmCine.offsetWidth; // force un reflow pour rejouer les animations
  gbmCine.classList.add("is-playing");
  if (window.Sound && Sound.enabled && Sound.jump) Sound.jump();

  // 1) on zoome dans la bulle
  gbmCineTimers.push(
    window.setTimeout(() => {
      gbmCine.classList.add("is-zooming");
      if (window.Sound && Sound.enabled && Sound.jump) Sound.jump();
    }, 1500)
  );
  // 2) le jeu s'ouvre derrière la bulle (qui remplit l'écran)…
  gbmCineTimers.push(
    window.setTimeout(() => {
      if (window.GBM) window.GBM.open();
    }, 2300)
  );
  // 3) …puis on retire la cinématique pour révéler le jeu.
  gbmCineTimers.push(
    window.setTimeout(() => {
      gbmCine.setAttribute("aria-hidden", "true");
      gbmCine.classList.remove("is-zooming", "is-playing");
    }, 2650)
  );
}

// « La Revanche de l'Ours » : ouverture directe (pas de cinématique dédiée).
function openLROGame() {
  closeShelfView();
  if (window.LRO) window.LRO.open();
}

async function copyPseudo(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("clipboard indisponible");
  } catch (err) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }
}

function flashCopied(button, ok) {
  const textNode = button.querySelector(".ql-discord-text");
  const original = textNode ? textNode.textContent : null;

  button.classList.add("copied");
  if (textNode) textNode.textContent = ok ? t("copied") : t("copyFail");
  setLabel((ok ? t("copyOk") : t("copyErr")).replace("%s", DISCORD_PSEUDO));

  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    button.classList.remove("copied");
    if (textNode && original !== null) textNode.textContent = original;
  }, 1800);
}

/* --- Téléphone Supercell (posé sur la table d'échecs en 3D) ---
   Survol : Stewy s'approche de la table. Clic : on copie son Supercell ID
   dans le presse-papier (même mécanique que le casque Discord), et on
   affiche la confirmation dans le label contextuel. */
function hoverSupercell() {
  setLabel(t("supercellHover"));
  if (activeNetwork === "supercell") return;
  activeNetwork = "supercell";
  clearStateTimers();
  bearReact("supercell"); // Stewy va prendre son téléphone
  if (window.Sound) Sound.steps(2);
}

async function copySupercell() {
  const ok = await copyPseudo(SUPERCELL_PSEUDO);
  setLabel((ok ? t("supercellCopied") : t("supercellCopyFail")).replace("%s", SUPERCELL_PSEUDO));
}

/* --- Barre de réseaux (et options de la vue bureau) --- */
quickLinks.forEach((link) => {
  const network = link.dataset.link;
  link.addEventListener("mouseenter", () => makeStewyHop(network));
  link.addEventListener("focus", () => makeStewyHop(network));
  link.addEventListener("mouseleave", resetStewy);
  link.addEventListener("blur", resetStewy);
  // les <a> ouvrent déjà leur href (target _blank) ; rien à intercepter
});

/* --- GitHub (barre du bas) : au lieu d'ouvrir un onglet, on allume le PC et
   GitHub apparaît sur l'écran du bureau (vue bureau), à côté de YouTube/Steam. --- */
const githubLink = document.querySelector(".ql.github");
if (githubLink) {
  githubLink.addEventListener("click", (event) => {
    event.preventDefault();
    openDeskView();
  });
}

/* --- Supercell ID (barre du bas) : au survol, Stewy va prendre son téléphone ;
   au clic, on copie le Supercell ID (pas de page publique, comme Discord). --- */
const supercellLink = document.querySelector(".ql.supercell");
if (supercellLink) {
  supercellLink.addEventListener("mouseenter", hoverSupercell);
  supercellLink.addEventListener("focus", hoverSupercell);
  supercellLink.addEventListener("mouseleave", resetStewy);
  supercellLink.addEventListener("blur", resetStewy);
  supercellLink.addEventListener("click", copySupercell);
}

/* --- Boutons « copier le pseudo Discord » --- */
copyButtons.forEach((button) => {
  button.addEventListener("mouseenter", () => makeStewyHop("discord"));
  button.addEventListener("focus", () => makeStewyHop("discord"));
  button.addEventListener("mouseleave", resetStewy);
  button.addEventListener("blur", resetStewy);
  button.addEventListener("click", async () => {
    const ok = await copyPseudo(button.dataset.copy || DISCORD_PSEUDO);
    flashCopied(button, ok);
  });
});

/* --- Vue bureau : la patte de Stewy déplace la souris vers l'option visée --- */
function aimMouse(network) {
  if (deskDesktop) deskDesktop.dataset.aim = network;
}
function releaseMouse() {
  if (deskDesktop) delete deskDesktop.dataset.aim;
}
deskOptions.forEach((option) => {
  const network = option.dataset.link;
  option.addEventListener("mouseenter", () => aimMouse(network));
  option.addEventListener("focus", () => aimMouse(network));
  option.addEventListener("mouseleave", releaseMouse);
  option.addEventListener("blur", releaseMouse);
});

if (deskClose) deskClose.addEventListener("click", closeDeskView);

if (shelfClose) shelfClose.addEventListener("click", closeShelfView);
shelfCds.forEach((cd) => {
  cd.addEventListener("click", () => {
    if (cd.dataset.game === "gbm") openGBMGame();
    else if (cd.dataset.game === "lro") openLROGame();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("desk-open")) {
    closeDeskView();
  }
  if (event.key === "Escape" && document.body.classList.contains("shelf-open")) {
    closeShelfView();
  }
});

/* =========================================================
   Sélecteur de langue
   ========================================================= */
function applyLang(next) {
  if (!I18N[next]) next = "fr";
  lang = next;
  try {
    localStorage.setItem("stewy-lang", lang);
  } catch (e) {
    /* localStorage indisponible : on ignore */
  }

  langButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.lang === lang);
  });

  const hint = document.querySelector(".intro-hint");
  if (hint) hint.textContent = t("introHint");
  const studioSub = document.querySelector(".intro-studio-sub");
  if (studioSub) studioSub.textContent = t("introStudioSub");

  if (deskClose) {
    deskClose.textContent = t("back");
    deskClose.setAttribute("aria-label", t("ariaClose"));
  }

  const headsetLabelEl = document.querySelector(".dv-headset-label");
  if (headsetLabelEl) headsetLabelEl.textContent = t("headsetLabel");

  const creditText = document.querySelector(".credit-text");
  if (creditText) creditText.textContent = t("credit");

  if (fgClose) fgClose.setAttribute("aria-label", t("ariaQuitGame"));
  if (fgScoreLabel) fgScoreLabel.textContent = t("scoreLabel");
  if (fgBestLabel) fgBestLabel.textContent = t("bestLabel");
  if (fgOverTitle) fgOverTitle.textContent = t("gameOver");
  if (fgRetry) fgRetry.textContent = t("retry");
  if (fgQuit) fgQuit.textContent = t("quit");
  if (fgBoardTitle) fgBoardTitle.textContent = t("boardTitle");
  if (fgNewBest) fgNewBest.textContent = t("newBest");
  if (fgName) fgName.placeholder = t("namePlaceholder");
  if (fgSend && !fgSend.disabled) fgSend.textContent = t("sendBtn");

  // Les jeux gèrent leurs propres textes (fichiers auto-contenus).
  if (window.MoonGame) window.MoonGame.setLang(lang);
  if (window.GBM) window.GBM.setLang(lang);
  if (window.LRO) window.LRO.setLang(lang);

  if (shelfClose) {
    shelfClose.textContent = t("back");
    shelfClose.setAttribute("aria-label", t("ariaClose"));
  }
  const svTitle = document.querySelector(".sv-title");
  if (svTitle) svTitle.textContent = t("shelfChoose");

  // Rafraîchit le message contextuel selon l'état courant
  if (deskView && deskView.getAttribute("aria-hidden") === "false") {
    setLabel(t("deskChoose"));
  } else if (activeNetwork === "discord") {
    setLabel(t("discordAction"));
  } else if (socials[activeNetwork]) {
    setLabel(t(activeNetwork + "Action"));
  } else if (activeNetwork !== "fire") {
    setLabel(t("hover"));
  }
}

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang));
});

/* =========================================================
   Easter egg : la cheminée + mini-jeu de saut
   ========================================================= */
const fireGame = document.querySelector(".fire-game");
const fgCanvas = document.querySelector(".fg-canvas");
const fgCtx = fgCanvas ? fgCanvas.getContext("2d") : null;
const fgBanner = document.querySelector(".fg-banner");
const fgScore = document.querySelector(".fg-score");
const fgScoreLabel = document.querySelector(".fg-score-label");
const fgBestScore = document.querySelector(".fg-best-score");
const fgBestLabel = document.querySelector(".fg-best-label");
const fgOver = document.querySelector(".fg-over");
const fgOverTitle = document.querySelector(".fg-over-title");
const fgOverScore = document.querySelector(".fg-over-score");
const fgOverBest = document.querySelector(".fg-over-best");
const fgNewBest = document.querySelector(".fg-newbest");
const fgSubmit = document.querySelector(".fg-submit");
const fgName = document.querySelector(".fg-name");
const fgSend = document.querySelector(".fg-send");
const fgBoardTitle = document.querySelector(".fg-board-title");
const fgBoardList = document.querySelector(".fg-board-list");
const fgBoardStatus = document.querySelector(".fg-board-status");
const fgRetry = document.querySelector(".fg-retry");
const fgQuit = document.querySelector(".fg-quit");
const fgClose = document.querySelector(".fg-close");

/* --- Meilleur score (persistant) + pseudo mémorisé --- */
let bestScore = 0;
try {
  bestScore = parseInt(localStorage.getItem("stewy-best"), 10) || 0;
} catch (e) {
  bestScore = 0;
}
function saveBest(value) {
  bestScore = value;
  try {
    localStorage.setItem("stewy-best", String(value));
  } catch (e) {
    /* ignore */
  }
}
function refreshBestHud() {
  if (fgBestScore) fgBestScore.textContent = String(bestScore);
}
function lastName() {
  try {
    return localStorage.getItem("stewy-name") || "";
  } catch (e) {
    return "";
  }
}
function rememberName(name) {
  try {
    localStorage.setItem("stewy-name", name);
  } catch (e) {
    /* ignore */
  }
}

const FIRE_THRESHOLD = 5;
let fireClicks = 0;
let fireResetTimer;

function fireGameOpen() {
  return fireGame && fireGame.getAttribute("aria-hidden") === "false";
}

function pokeFire() {
  if (fireGameOpen()) return;
  fireClicks += 1;
  window.clearTimeout(fireResetTimer);

  clearStateTimers();
  activeNetwork = "fire";

  if (fireClicks < FIRE_THRESHOLD) {
    // Stewy touche le feu : il rougit et transpire de plus en plus
    bearReact("heat:" + Math.min(fireClicks, 4));
    setLabel(t("cruel"));
    fireResetTimer = window.setTimeout(() => {
      fireClicks = 0;
      resetStewy();
    }, 4000);
  } else {
    // Il tombe dans la cheminée -> on lance le jeu
    fireClicks = 0;
    bearReact("falling");
    setLabel(t("gameIntro"));
    window.setTimeout(() => {
      bearReact("idle");
      startFireGame();
    }, 760);
  }
}

/* --- Le jeu : grimper de plateforme en plateforme, le feu monte --- */
const GW = 360;
const GH = 520;
const GRAV = 0.62;
const JUMP_V = -13.2;
const MOVE_V = 4.4;
const PLAT_W = 74;
const PLAT_H = 12;
const PW = 26;
const PH = 30;

const keys = { left: false, right: false };
let jumpQueued = false;

/* --- Cheat code : jetpack (3 × « $ » d'affilée, puis barre d'espace) --- */
const JET_ACCEL = 1.35; // poussée vers le haut (plus forte que la gravité)
const JET_MAX_UP = 7.5; // vitesse ascensionnelle maximale
let jetpackUnlocked = false; // débloqué pour la session
let jetThrust = false; // espace maintenu
let dollarSeq = 0; // compteur de « $ » consécutifs
let dollarTimer = 0; // horodatage du dernier « $ »

let running = false;
let rafId = 0;
let lastTime = 0;
let bannerTimer = 0;

let player;
let platforms;
let scrollSpeed;
let fireH;
let score;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function overlapX(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x;
}

function topPlatformY() {
  let min = GH;
  for (const p of platforms) if (p.y < min) min = p.y;
  return min;
}

function resetGame() {
  scrollSpeed = 0.35;
  fireH = 30;
  score = 0;
  const groundY = GH - 110;
  platforms = [{ x: GW / 2 - 60, y: groundY, w: 120, h: PLAT_H }];
  let y = groundY;
  while (y > -40) {
    y -= rand(72, 108);
    platforms.push({ x: rand(8, GW - PLAT_W - 8), y, w: PLAT_W, h: PLAT_H });
  }
  player = { x: GW / 2 - PW / 2, y: groundY - PH, w: PW, h: PH, vy: 0, onGround: true };
  jetThrust = false;
  dollarSeq = 0;
  if (fgScore) fgScore.textContent = "0";
  refreshBestHud();
}

function findSupport() {
  for (const p of platforms) {
    if (overlapX(player, p) && Math.abs(player.y + player.h - p.y) <= 6) return p;
  }
  return null;
}

function updateGame(f) {
  scrollSpeed = Math.min(scrollSpeed + 0.0009 * f, 5);
  fireH = 30 + (scrollSpeed - 0.35) * 26;

  // tout descend (le feu se rapproche)
  for (const p of platforms) p.y += scrollSpeed * f;

  // déplacement horizontal (avec passage d'un bord à l'autre)
  const vx = (keys.right ? MOVE_V : 0) - (keys.left ? MOVE_V : 0);
  player.x += vx * f;
  if (player.x + player.w < 0) player.x = GW;
  else if (player.x > GW) player.x = -player.w;

  // saut
  if (jumpQueued && player.onGround) {
    player.vy = JUMP_V;
    player.onGround = false;
    if (window.Sound) Sound.jump();
  }
  jumpQueued = false;

  // jetpack (cheat) : tant que l'espace est maintenu, on est propulsé vers le haut
  if (jetpackUnlocked && jetThrust) {
    player.onGround = false;
    player.vy -= JET_ACCEL * f;
    if (player.vy < -JET_MAX_UP) player.vy = -JET_MAX_UP;
  }

  if (player.onGround) {
    const support = findSupport();
    if (support) {
      player.y = support.y - player.h;
      player.vy = 0;
    } else {
      player.onGround = false;
    }
  } else {
    const prevBottom = player.y + player.h;
    player.vy += GRAV * f;
    player.y += player.vy * f;
    const newBottom = player.y + player.h;
    if (player.vy > 0) {
      for (const p of platforms) {
        if (overlapX(player, p) && prevBottom <= p.y && newBottom >= p.y) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          break;
        }
      }
    }
  }

  // jetpack : on garde Stewy visible en haut de la cheminée
  if (player.y < 4) {
    player.y = 4;
    if (player.vy < 0) player.vy = 0;
  }

  // recycle les plateformes : on en régénère en haut
  platforms = platforms.filter((p) => p.y < GH + 40);
  let top = topPlatformY();
  while (top > -10) {
    top -= rand(72, 108);
    platforms.push({ x: rand(8, GW - PLAT_W - 8), y: top, w: PLAT_W, h: PLAT_H });
  }

  score += scrollSpeed * f * 0.1;
  if (fgScore) fgScore.textContent = String(Math.floor(score));

  // mort : le feu atteint Stewy (ou il tombe dedans)
  const deathY = GH - fireH * 0.8;
  if (player.y + player.h >= deathY || player.y > GH) {
    endGame();
  }
}

function drawBear(ctx, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  // jetpack (cheat) : deux réservoirs dans le dos
  if (jetpackUnlocked) {
    ctx.fillStyle = "#8a8f98";
    ctx.fillRect(x - 4, y + 6, 5, 15);
    ctx.fillRect(x + PW - 1, y + 6, 5, 15);
    ctx.fillStyle = "#d8430f";
    ctx.fillRect(x - 4, y + 6, 5, 3);
    ctx.fillRect(x + PW - 1, y + 6, 5, 3);
  }
  // oreilles
  ctx.fillStyle = "#7a4a28";
  ctx.fillRect(x, y - 2, 7, 7);
  ctx.fillRect(x + PW - 7, y - 2, 7, 7);
  // tête + corps
  ctx.fillStyle = "#9b6237";
  ctx.fillRect(x + 2, y, PW - 4, 14);
  ctx.fillRect(x + 1, y + 12, PW - 2, PH - 12);
  // ventre
  ctx.fillStyle = "#d7a166";
  ctx.fillRect(x + 7, y + 17, PW - 14, PH - 20);
  // museau
  ctx.fillStyle = "#d7a166";
  ctx.fillRect(x + PW / 2 - 4, y + 8, 8, 5);
  // yeux + truffe
  ctx.fillStyle = "#170f0b";
  ctx.fillRect(x + 7, y + 4, 3, 3);
  ctx.fillRect(x + PW - 10, y + 4, 3, 3);
  ctx.fillRect(x + PW / 2 - 1, y + 9, 3, 2);
}

function renderGame() {
  const ctx = fgCtx;
  // fond cheminée
  ctx.fillStyle = "#160b08";
  ctx.fillRect(0, 0, GW, GH);
  // briques sur les côtés
  ctx.fillStyle = "#241310";
  for (let yy = (Math.floor(score) % 28) - 28; yy < GH; yy += 28) {
    ctx.fillRect(0, yy, 26, 24);
    ctx.fillRect(GW - 26, yy, 26, 24);
  }

  // plateformes (rondins)
  for (const p of platforms) {
    ctx.fillStyle = "#5a3a22";
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
    ctx.fillStyle = "#7c5230";
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, 3);
    ctx.fillStyle = "#20140c";
    ctx.fillRect(Math.round(p.x), Math.round(p.y + p.h - 2), p.w, 2);
  }

  // joueur
  drawBear(ctx, player.x, player.y);

  // jetpack : jet de flammes sous Stewy quand il propulse
  if (jetpackUnlocked && jetThrust) {
    const jx = player.x + PW / 2;
    const jy = player.y + PH;
    ctx.fillStyle = "#ffb24d";
    ctx.fillRect(Math.round(jx - 8), Math.round(jy), 16, 5 + Math.random() * 6);
    ctx.fillStyle = "#ff7a1a";
    ctx.fillRect(Math.round(jx - 5), Math.round(jy), 10, 9 + Math.random() * 8);
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(Math.round(jx - 2), Math.round(jy), 4, 6 + Math.random() * 5);
  }

  // feu en bas
  const baseY = GH - fireH;
  ctx.fillStyle = "#7a1e0a";
  ctx.fillRect(0, baseY + fireH * 0.45, GW, fireH);
  for (let x = 0; x < GW; x += 18) {
    const h = fireH * (0.65 + Math.random() * 0.6);
    ctx.fillStyle = "#d8430f";
    ctx.fillRect(x, GH - h, 16, h);
    ctx.fillStyle = "#ff7a1a";
    ctx.fillRect(x + 3, GH - h * 0.7, 10, h * 0.7);
    ctx.fillStyle = "#ffb24d";
    ctx.fillRect(x + 5, GH - h * 0.4, 6, h * 0.4);
  }
}

function gameLoop(now) {
  if (!running) return;
  const dt = now - lastTime;
  lastTime = now;
  const f = Math.min(dt / 16.67, 2.2);
  updateGame(f);
  if (!running) return; // endGame a pu couper la boucle
  renderGame();
  rafId = requestAnimationFrame(gameLoop);
}

function showBanner(text) {
  if (!fgBanner) return;
  fgBanner.textContent = text;
  fgBanner.classList.add("show");
  window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => fgBanner.classList.remove("show"), 2600);
}

function startFireGame() {
  if (!fireGame || !fgCtx) return;
  fireGame.setAttribute("aria-hidden", "false");
  document.body.classList.add("game-open");
  if (fgOver) fgOver.hidden = true;
  resetGame();
  showBanner(t("gameIntro"));
  if (window.Sound && Sound.enabled) Sound.playGame();
  running = true;
  lastTime = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

async function loadBoard() {
  if (!fgBoardList || !fgBoardStatus) return;
  const board = window.Leaderboard;
  if (!board || !board.enabled) {
    // Classement mondial non configuré : on masque la section proprement
    if (fgBoardTitle) fgBoardTitle.hidden = true;
    fgBoardList.innerHTML = "";
    fgBoardStatus.textContent = "";
    fgBoardStatus.hidden = true;
    return;
  }
  if (fgBoardTitle) fgBoardTitle.hidden = false;
  fgBoardStatus.hidden = false;
  fgBoardStatus.textContent = t("boardLoading");
  fgBoardList.innerHTML = "";
  try {
    const rows = await board.top(10);
    fgBoardList.innerHTML = "";
    if (!rows.length) {
      fgBoardStatus.textContent = t("boardEmpty");
      return;
    }
    fgBoardStatus.textContent = "";
    fgBoardStatus.hidden = true;
    rows.forEach((row) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "fg-row-name";
      name.textContent = row.name;
      const val = document.createElement("span");
      val.className = "fg-row-score";
      val.textContent = String(row.score);
      li.append(name, val);
      fgBoardList.appendChild(li);
    });
  } catch (e) {
    fgBoardStatus.hidden = false;
    fgBoardStatus.textContent = t("boardError");
  }
}

function endGame() {
  running = false;
  cancelAnimationFrame(rafId);
  renderGame();

  const finalScore = Math.floor(score);
  const isNewBest = finalScore > bestScore;
  if (isNewBest) saveBest(finalScore);
  refreshBestHud();

  if (fgOverTitle) fgOverTitle.textContent = t("gameOver");
  if (fgOverScore) fgOverScore.textContent = t("overScore").replace("%s", String(finalScore));
  if (fgOverBest) fgOverBest.textContent = t("overBest").replace("%s", String(bestScore));
  if (fgNewBest) {
    fgNewBest.textContent = t("newBest");
    fgNewBest.hidden = !isNewBest;
  }
  if (fgRetry) fgRetry.textContent = t("retry");
  if (fgQuit) fgQuit.textContent = t("quit");

  // Formulaire d'envoi du score (uniquement si le classement est dispo et score > 0)
  const board = window.Leaderboard;
  if (fgSubmit) {
    const canSubmit = board && board.enabled && finalScore > 0;
    fgSubmit.hidden = !canSubmit;
    if (canSubmit) {
      pendingScore = finalScore;
      scoreSubmitted = false;
      if (fgName) {
        fgName.disabled = false;
        fgName.value = lastName();
      }
      if (fgSend) {
        fgSend.disabled = false;
        fgSend.textContent = t("sendBtn");
      }
    }
  }

  if (fgOver) fgOver.hidden = false;
  loadBoard();
}

let pendingScore = 0;
let scoreSubmitted = false;

if (fgSubmit) {
  fgSubmit.addEventListener("submit", async (event) => {
    event.preventDefault();
    const board = window.Leaderboard;
    if (!board || !board.enabled || scoreSubmitted) return;
    const name = (fgName ? fgName.value : "").trim().slice(0, 16);
    if (!name) {
      if (fgName) fgName.focus();
      return;
    }
    rememberName(name);
    if (fgSend) {
      fgSend.disabled = true;
      fgSend.textContent = t("sending");
    }
    try {
      await board.submit(name, pendingScore);
      scoreSubmitted = true;
      if (fgSend) fgSend.textContent = t("sent");
      if (fgName) fgName.disabled = true;
      await loadBoard();
    } catch (e) {
      if (fgSend) {
        fgSend.disabled = false;
        fgSend.textContent = t("sendBtn");
      }
      if (fgBoardStatus) {
        fgBoardStatus.hidden = false;
        fgBoardStatus.textContent = t("boardError");
      }
    }
  });
}

function closeFireGame() {
  running = false;
  cancelAnimationFrame(rafId);
  window.clearTimeout(bannerTimer);
  if (fgBanner) fgBanner.classList.remove("show");
  if (fireGame) fireGame.setAttribute("aria-hidden", "true");
  document.body.classList.remove("game-open");
  if (fgOver) fgOver.hidden = true;
  if (window.Sound && Sound.enabled) Sound.playHouse();
  resetStewy();
}

if (fgRetry) {
  fgRetry.addEventListener("click", () => {
    if (fgOver) fgOver.hidden = true;
    resetGame();
    showBanner(t("gameIntro"));
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(gameLoop);
  });
}
if (fgQuit) fgQuit.addEventListener("click", closeFireGame);
if (fgClose) fgClose.addEventListener("click", closeFireGame);

window.addEventListener("keydown", (event) => {
  if (!fireGameOpen()) return;

  // Cheat code : 3 « $ » d'affilée -> jetpack débloqué (pour la session)
  if (event.key === "$") {
    const now = performance.now();
    if (now - dollarTimer > 1200) dollarSeq = 0; // « d'affilée » = sans trop attendre
    dollarTimer = now;
    dollarSeq += 1;
    if (!jetpackUnlocked && dollarSeq >= 3) {
      jetpackUnlocked = true;
      dollarSeq = 0;
      showBanner(t("jetpackOn"));
      if (window.Sound && Sound.enabled && Sound.jump) Sound.jump();
    }
    event.preventDefault();
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      keys.left = true;
      event.preventDefault();
      break;
    case "ArrowRight":
    case "d":
    case "D":
      keys.right = true;
      event.preventDefault();
      break;
    case " ":
    case "Spacebar":
      // Une fois le jetpack débloqué, l'espace propulse au lieu de sauter.
      if (jetpackUnlocked) jetThrust = true;
      else jumpQueued = true;
      event.preventDefault();
      break;
    case "ArrowUp":
    case "w":
    case "W":
      jumpQueued = true;
      event.preventDefault();
      break;
    case "Escape":
      closeFireGame();
      break;
    default:
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      keys.left = false;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      keys.right = false;
      break;
    case " ":
    case "Spacebar":
      jetThrust = false; // on coupe la poussée du jetpack
      break;
    default:
      break;
  }
});

/* =========================================================
   API pour la scène 3D (scene3d.js appelle ces hooks)
   ========================================================= */
window.Stewy3D = {
  // survol d'un objet : met à jour le label contextuel (+ réaction de l'ours)
  hover(network) {
    if (network === "desk") sendStewyToDesk();
    else if (network === "moon") setLabel(t("moonHover"));
    else if (network === "gbm") setLabel(t("shelfHover"));
    else if (network === "supercell") hoverSupercell();
    else makeStewyHop(network);
  },
  reset: resetStewy,
  // clic sur un objet : ouvre le lien, la vue bureau, ou lance le mini-jeu
  activate(network) {
    if (network === "desk") openDeskView();
    else if (network === "fire") pokeFire();
    else if (network === "moon") openMoonGame();
    else if (network === "gbm") openShelfView();
    else if (network === "supercell") copySupercell();
    else openExternalUrl(network);
  },
  isOverlayOpen() {
    return (
      fireGameOpen() ||
      (deskView && deskView.getAttribute("aria-hidden") === "false") ||
      (shelfView && shelfView.getAttribute("aria-hidden") === "false") ||
      (window.MoonGame && window.MoonGame.isOpen()) ||
      (window.GBM && window.GBM.isOpen())
    );
  },
};

/* =========================================================
   Initialisation
   ========================================================= */
assignLinks();

let initialLang = "fr"; // le site est en français par défaut
try {
  const stored = localStorage.getItem("stewy-lang");
  if (stored && I18N[stored]) initialLang = stored; // on respecte un choix mémorisé
} catch (e) {
  /* ignore */
}
applyLang(initialLang);

/* =========================================================
   Audio : démarrage au premier geste + bouton son
   ========================================================= */
const soundToggle = document.querySelector(".sound-toggle");

function refreshSoundButton() {
  if (!soundToggle || !window.Sound) return;
  const on = Sound.enabled;
  soundToggle.textContent = on ? "🔊" : "🔇";
  soundToggle.classList.toggle("is-muted", !on);
  soundToggle.setAttribute("aria-pressed", String(on));
  soundToggle.setAttribute("aria-label", on ? "Couper le son" : "Activer le son");
}

if (window.Sound) {
  // préférence mémorisée (son actif par défaut)
  try {
    Sound.enabled = localStorage.getItem("stewy-sound") !== "0";
  } catch (e) {
    /* ignore */
  }
  refreshSoundButton();

  // l'autoplay est bloqué tant que l'utilisateur n'a pas interagi
  let audioUnlocked = false;
  const unlockAudio = () => {
    if (audioUnlocked || !Sound.enabled) return;
    audioUnlocked = true;
    Sound.init();
    Sound.resume();
    if (window.MoonGame && MoonGame.playCurrentMusic && MoonGame.playCurrentMusic()) {
      // le donjon joue sa propre musique d'environnement
    } else if (fireGameOpen()) Sound.playGame();
    else Sound.playHouse();
  };
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, unlockAudio)
  );

  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      Sound.init();
      Sound.resume();
      Sound.setEnabled(!Sound.enabled);
      if (Sound.enabled) {
        audioUnlocked = true;
        if (window.MoonGame && MoonGame.playCurrentMusic && MoonGame.playCurrentMusic()) {
          // le donjon joue sa propre musique d'environnement
        } else if (fireGameOpen()) Sound.playGame();
        else Sound.playHouse();
      } else {
        Sound.stopMusic();
      }
      refreshSoundButton();
    });
  }
}
