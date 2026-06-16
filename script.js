const socials = {
  letterboxd: {
    label: "Letterboxd",
    action: "Stewy se pose devant la tele pour ouvrir Letterboxd.",
    url: "https://letterboxd.com/stewybear/",
  },
  youtube: {
    label: "YouTube",
    action: "Stewy s'installe au PC pour lancer YouTube.",
    url: "https://www.youtube.com/@Stewybear-h9v",
  },
  steam: {
    label: "Steam",
    action: "Stewy s'installe au PC pour lancer Steam.",
    url: "https://steamcommunity.com/profiles/76561199858155106",
  },
  chess: {
    label: "Chess.com",
    action: "Stewy prepare son meilleur coup sur Chess.com.",
    url: "https://www.chess.com/az/member/stewybear",
  },
  discord: {
    label: "Discord",
    action: "Stewy met le casque et rejoint Discord.",
    url: "#discord",
  },
};

const stewy = document.querySelector(".stewy");
const label = document.querySelector(".label span");
const hotspots = document.querySelectorAll(".hotspot[data-network]");
const quickLinks = document.querySelectorAll("[data-link]");
const deskTriggers = document.querySelectorAll("[data-desk-trigger]");
const deskView = document.querySelector(".desk-view");
const deskClose = document.querySelector(".desk-close");
let dropTimer;
let activeNetwork = "idle";

function assignLinks() {
  hotspots.forEach((hotspot) => {
    const network = hotspot.dataset.network;
    const social = socials[network];
    hotspot.href = social.url;
    hotspot.title = social.label;
  });

  quickLinks.forEach((link) => {
    const social = socials[link.dataset.link];
    if (!social) return;

    link.href = social.url;
    link.title = social.label;

    if (!social.url.startsWith("#")) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
  });
}

function makeStewyDrop(network) {
  const social = socials[network];
  if (!social) return;

  if (activeNetwork === network) {
    label.textContent = social.action;
    return;
  }

  activeNetwork = network;
  window.clearTimeout(dropTimer);
  stewy.dataset.state = network;
  label.textContent = social.action;
  stewy.classList.remove("is-dropping");

  requestAnimationFrame(() => {
    stewy.classList.add("is-dropping");
  });

  dropTimer = window.setTimeout(() => {
    stewy.classList.remove("is-dropping");
  }, 700);
}

function resetStewy() {
  activeNetwork = "idle";
  window.clearTimeout(dropTimer);
  stewy.dataset.state = "idle";
  stewy.classList.remove("is-dropping");
  label.textContent = "Survole un objet";
}

function openSocial(event, network) {
  const social = socials[network];
  if (!social || social.url.startsWith("#")) {
    event.preventDefault();
    label.textContent = `${social.label}: lien a ajouter.`;
  }
}

function openDeskView() {
  window.clearTimeout(dropTimer);
  activeNetwork = "idle";
  stewy.dataset.state = "idle";
  stewy.classList.remove("is-dropping");
  deskView.setAttribute("aria-hidden", "false");
  document.body.classList.add("desk-open");
  deskClose.focus();
  label.textContent = "Choisis sur le bureau";
}

function closeDeskView() {
  deskView.setAttribute("aria-hidden", "true");
  document.body.classList.remove("desk-open");
  label.textContent = "Survole un objet";
}

hotspots.forEach((hotspot) => {
  const network = hotspot.dataset.network;

  hotspot.addEventListener("mouseenter", () => makeStewyDrop(network));
  hotspot.addEventListener("focus", () => makeStewyDrop(network));
  hotspot.addEventListener("mouseleave", resetStewy);
  hotspot.addEventListener("blur", resetStewy);
  hotspot.addEventListener("click", (event) => openSocial(event, network));
});

deskTriggers.forEach((trigger) => {
  trigger.addEventListener("mouseenter", () => {
    label.textContent = "Clique pour zoomer sur le bureau";
  });
  trigger.addEventListener("focus", () => {
    label.textContent = "Clique pour zoomer sur le bureau";
  });
  trigger.addEventListener("mouseleave", resetStewy);
  trigger.addEventListener("blur", resetStewy);
  trigger.addEventListener("click", openDeskView);
});

quickLinks.forEach((link) => {
  const network = link.dataset.link;
  link.addEventListener("mouseenter", () => makeStewyDrop(network));
  link.addEventListener("focus", () => makeStewyDrop(network));
  link.addEventListener("mouseleave", resetStewy);
  link.addEventListener("blur", resetStewy);
  link.addEventListener("click", (event) => openSocial(event, network));
});

deskClose.addEventListener("click", closeDeskView);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("desk-open")) {
    closeDeskView();
  }
});

assignLinks();
