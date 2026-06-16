/* =========================================================
   Stewybear — interactions, i18n et easter egg
   ========================================================= */

const socials = {
  letterboxd: { label: "Letterboxd", url: "https://letterboxd.com/stewybear/" },
  youtube: { label: "YouTube", url: "https://www.youtube.com/@Stewybear-h9v" },
  steam: { label: "Steam", url: "https://steamcommunity.com/profiles/76561199858155106" },
  chess: { label: "Chess.com", url: "https://www.chess.com/az/member/stewybear" },
};

const DISCORD_PSEUDO = "stewybear99";

/* --- Traductions ----------------------------------------- */
const I18N = {
  fr: {
    introHint: "au coin du feu",
    hover: "Survole un objet de la pièce",
    deskHover: "Clique pour t'installer au bureau",
    deskChoose: "Choisis sur le bureau",
    letterboxdAction: "Stewy se pose sur le pouf pour regarder un film sur Letterboxd.",
    youtubeAction: "Stewy s'installe au bureau pour lancer YouTube.",
    steamAction: "Stewy s'installe au bureau pour lancer Steam.",
    chessAction: "Stewy prépare son meilleur coup sur Chess.com.",
    discordAction: "Stewy met le casque pour rejoindre Discord.",
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
    gameOver: "Game Over",
    scoreLabel: "Score",
    retry: "Rejouer",
    quit: "Quitter",
    overScore: "Score : %s",
  },
  en: {
    introHint: "by the fireside",
    hover: "Hover over something in the room",
    deskHover: "Click to sit down at the desk",
    deskChoose: "Pick something on the desk",
    letterboxdAction: "Stewy settles on the pouf to watch a film on Letterboxd.",
    youtubeAction: "Stewy sits at the desk to open YouTube.",
    steamAction: "Stewy sits at the desk to open Steam.",
    chessAction: "Stewy plots his best move on Chess.com.",
    discordAction: "Stewy puts on the headset to join Discord.",
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
    gameOver: "Game Over",
    scoreLabel: "Score",
    retry: "Play again",
    quit: "Quit",
    overScore: "Score: %s",
  },
  es: {
    introHint: "junto al fuego",
    hover: "Pasa el cursor sobre algo de la sala",
    deskHover: "Haz clic para sentarte al escritorio",
    deskChoose: "Elige algo en el escritorio",
    letterboxdAction: "Stewy se acomoda en el puf para ver una película en Letterboxd.",
    youtubeAction: "Stewy se sienta al escritorio para abrir YouTube.",
    steamAction: "Stewy se sienta al escritorio para abrir Steam.",
    chessAction: "Stewy prepara su mejor jugada en Chess.com.",
    discordAction: "Stewy se pone los cascos para unirse a Discord.",
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
    gameOver: "Game Over",
    scoreLabel: "Puntuación",
    retry: "Jugar otra vez",
    quit: "Salir",
    overScore: "Puntuación: %s",
  },
};

let lang = "fr";
function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.fr[key] || key;
}

/* --- Éléments -------------------------------------------- */
const stewy = document.querySelector(".stewy");
const label = document.querySelector(".label span");
const hotspots = document.querySelectorAll(".hotspot[data-network]");
const quickLinks = document.querySelectorAll("[data-link]");
const deskTriggers = document.querySelectorAll("[data-desk-trigger]");
const copyButtons = document.querySelectorAll("[data-copy]");
const deskView = document.querySelector(".desk-view");
const deskClose = document.querySelector(".desk-close");
const deskDesktop = document.querySelector(".dv-desktop");
const deskOptions = document.querySelectorAll(".dv-option");
const popcorn = document.querySelector(".popcorn");
const fireplace = document.querySelector(".fireplace");
const langButtons = document.querySelectorAll(".lang-switch button");

let hopTimer;
let copyTimer;
let headsetTimer;
let activeNetwork = "idle";

const ARRIVAL_MS = 520; // temps pour rejoindre le bureau avant de mettre le casque

function clearStateTimers() {
  window.clearTimeout(headsetTimer);
  stewy.classList.remove("wearing-headset", "eating");
  delete stewy.dataset.heat;
  if (popcorn) popcorn.classList.remove("popping", "eaten");
}

function assignLinks() {
  hotspots.forEach((hotspot) => {
    const social = socials[hotspot.dataset.network];
    if (!social) return;
    hotspot.href = social.url;
    hotspot.target = "_blank";
    hotspot.rel = "noreferrer";
  });

  quickLinks.forEach((link) => {
    const social = socials[link.dataset.link];
    if (!social) return;
    link.href = social.url;
    link.title = social.label;
    link.target = "_blank";
    link.rel = "noreferrer";
  });
}

function makeStewyHop(network) {
  if (network === "discord") {
    label.textContent = t("discordAction");
  } else if (socials[network]) {
    label.textContent = t(network + "Action");
  } else {
    return;
  }

  if (activeNetwork === network) return;
  activeNetwork = network;

  clearStateTimers();
  window.clearTimeout(hopTimer);
  stewy.dataset.state = network;
  stewy.classList.remove("is-hopping", "is-hurt", "falling");
  requestAnimationFrame(() => stewy.classList.add("is-hopping"));
  hopTimer = window.setTimeout(() => stewy.classList.remove("is-hopping"), 500);
  if (window.Sound) Sound.steps(2);

  // Discord : il met le casque seulement une fois arrivé au bureau
  if (network === "discord") {
    headsetTimer = window.setTimeout(() => stewy.classList.add("wearing-headset"), ARRIVAL_MS);
  }

  // Letterboxd : quand Stewy passe à côté, 3 grains sautent hors du pot
  if (network === "letterboxd" && popcorn) {
    popcorn.classList.remove("popping");
    requestAnimationFrame(() => popcorn.classList.add("popping"));
  }
}

function sendStewyToDesk() {
  label.textContent = t("deskHover");
  if (activeNetwork === "desk") return;
  activeNetwork = "desk";

  clearStateTimers();
  window.clearTimeout(hopTimer);
  stewy.dataset.state = "desk";
  stewy.classList.remove("is-hopping", "is-hurt", "falling");
  requestAnimationFrame(() => stewy.classList.add("is-hopping"));
  hopTimer = window.setTimeout(() => stewy.classList.remove("is-hopping"), 500);
  if (window.Sound) Sound.steps(2);
}

function resetStewy() {
  activeNetwork = "idle";
  window.clearTimeout(hopTimer);
  clearStateTimers();
  stewy.dataset.state = "idle";
  stewy.classList.remove("is-hopping", "is-hurt", "falling");
  label.textContent = t("hover");
}

function openExternal(event, network) {
  const social = socials[network];
  if (!social) {
    event.preventDefault();
  }
}

function openDeskView() {
  window.clearTimeout(hopTimer);
  clearStateTimers();
  activeNetwork = "idle";
  stewy.dataset.state = "idle";
  stewy.classList.remove("is-hopping");
  deskView.setAttribute("aria-hidden", "false");
  document.body.classList.add("desk-open");
  deskClose.focus();
  label.textContent = t("deskChoose");
}

function closeDeskView() {
  deskView.setAttribute("aria-hidden", "true");
  document.body.classList.remove("desk-open");
  if (deskDesktop) delete deskDesktop.dataset.aim;
  label.textContent = t("hover");
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
  label.textContent = (ok ? t("copyOk") : t("copyErr")).replace("%s", DISCORD_PSEUDO);

  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    button.classList.remove("copied");
    if (textNode && original !== null) textNode.textContent = original;
  }, 1800);
}

/* --- Hotspots de la pièce --- */
hotspots.forEach((hotspot) => {
  const network = hotspot.dataset.network;
  hotspot.addEventListener("mouseenter", () => makeStewyHop(network));
  hotspot.addEventListener("focus", () => makeStewyHop(network));
  hotspot.addEventListener("mouseleave", resetStewy);
  hotspot.addEventListener("blur", resetStewy);
  hotspot.addEventListener("click", (event) => openExternal(event, network));
});

/* --- Zone bureau --- */
deskTriggers.forEach((trigger) => {
  trigger.addEventListener("mouseenter", sendStewyToDesk);
  trigger.addEventListener("focus", sendStewyToDesk);
  trigger.addEventListener("mouseleave", resetStewy);
  trigger.addEventListener("blur", resetStewy);
  trigger.addEventListener("click", openDeskView);
});

/* --- Barre de réseaux --- */
quickLinks.forEach((link) => {
  const network = link.dataset.link;
  link.addEventListener("mouseenter", () => makeStewyHop(network));
  link.addEventListener("focus", () => makeStewyHop(network));
  link.addEventListener("mouseleave", resetStewy);
  link.addEventListener("blur", resetStewy);
  link.addEventListener("click", (event) => openExternal(event, network));
});

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

/* --- Pouf : Stewy s'y assoit quand on le survole --- */
const pouf = document.querySelector(".pouf");
if (pouf) {
  pouf.addEventListener("mouseenter", () => makeStewyHop("letterboxd"));
  pouf.addEventListener("mouseleave", resetStewy);
}

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

deskClose.addEventListener("click", closeDeskView);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("desk-open")) {
    closeDeskView();
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

  const tv = document.querySelector(".hotspot.tv");
  if (tv) tv.setAttribute("aria-label", t("ariaLetterboxd"));
  const chess = document.querySelector(".hotspot.chess");
  if (chess) chess.setAttribute("aria-label", t("ariaChess"));
  const deskZone = document.querySelector(".desk-zone");
  if (deskZone) deskZone.setAttribute("aria-label", t("ariaDeskZoom"));

  deskClose.textContent = t("back");
  deskClose.setAttribute("aria-label", t("ariaClose"));

  const headsetLabelEl = document.querySelector(".dv-headset-label");
  if (headsetLabelEl) headsetLabelEl.textContent = t("headsetLabel");

  if (fgClose) fgClose.setAttribute("aria-label", t("ariaQuitGame"));
  if (fgScoreLabel) fgScoreLabel.textContent = t("scoreLabel");
  if (fgOverTitle) fgOverTitle.textContent = t("gameOver");
  if (fgRetry) fgRetry.textContent = t("retry");
  if (fgQuit) fgQuit.textContent = t("quit");

  // Rafraîchit le message contextuel selon l'état courant
  if (deskView.getAttribute("aria-hidden") === "false") {
    label.textContent = t("deskChoose");
  } else if (activeNetwork === "discord") {
    label.textContent = t("discordAction");
  } else if (socials[activeNetwork]) {
    label.textContent = t(activeNetwork + "Action");
  } else if (activeNetwork !== "fire") {
    label.textContent = t("hover");
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
const fgOver = document.querySelector(".fg-over");
const fgOverTitle = document.querySelector(".fg-over-title");
const fgOverScore = document.querySelector(".fg-over-score");
const fgRetry = document.querySelector(".fg-retry");
const fgQuit = document.querySelector(".fg-quit");
const fgClose = document.querySelector(".fg-close");

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
  window.clearTimeout(hopTimer);
  activeNetwork = "fire";
  stewy.dataset.state = "fire";
  stewy.classList.remove("is-hopping");

  if (fireClicks < FIRE_THRESHOLD) {
    // Stewy touche le feu : il rougit et transpire de plus en plus
    stewy.dataset.heat = String(Math.min(fireClicks, 4));
    stewy.classList.remove("is-hurt", "falling");
    void stewy.offsetWidth; // relance l'animation à chaque clic
    stewy.classList.add("is-hurt");
    label.textContent = t("cruel");
    fireResetTimer = window.setTimeout(() => {
      fireClicks = 0;
      resetStewy();
    }, 4000);
  } else {
    // Il tombe dans la cheminée -> on lance le jeu
    fireClicks = 0;
    stewy.dataset.heat = "4";
    stewy.classList.remove("is-hurt", "falling");
    void stewy.offsetWidth;
    stewy.classList.add("falling");
    label.textContent = t("gameIntro");
    window.setTimeout(() => {
      stewy.classList.remove("falling");
      startFireGame();
    }, 760);
  }
}

if (fireplace) fireplace.addEventListener("click", pokeFire);

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
  if (fgScore) fgScore.textContent = "0";
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

function endGame() {
  running = false;
  cancelAnimationFrame(rafId);
  renderGame();
  if (fgOverTitle) fgOverTitle.textContent = t("gameOver");
  if (fgOverScore) fgOverScore.textContent = t("overScore").replace("%s", String(Math.floor(score)));
  if (fgRetry) fgRetry.textContent = t("retry");
  if (fgQuit) fgQuit.textContent = t("quit");
  if (fgOver) fgOver.hidden = false;
}

function closeFireGame() {
  running = false;
  cancelAnimationFrame(rafId);
  window.clearTimeout(bannerTimer);
  if (fgBanner) fgBanner.classList.remove("show");
  fireGame.setAttribute("aria-hidden", "true");
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
    case "ArrowUp":
    case " ":
    case "Spacebar":
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
    default:
      break;
  }
});

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
    if (!fireGameOpen()) Sound.playHouse();
    else Sound.playGame();
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
        if (fireGameOpen()) Sound.playGame();
        else Sound.playHouse();
      } else {
        Sound.stopMusic();
      }
      refreshSoundButton();
    });
  }
}

function refreshSoundButton() {
  if (!soundToggle || !window.Sound) return;
  const on = Sound.enabled;
  soundToggle.textContent = on ? "🔊" : "🔇";
  soundToggle.classList.toggle("is-muted", !on);
  soundToggle.setAttribute("aria-pressed", String(on));
  soundToggle.setAttribute("aria-label", on ? "Couper le son" : "Activer le son");
}
