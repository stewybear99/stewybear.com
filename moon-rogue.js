/* =========================================================
   Stewybear — « Donjon de la Lune »
   Roguelite narratif (façon Binding of Isaac) en 6 chapitres.
   ---------------------------------------------------------
   Déclenché en cliquant sur la lune de la scène 3D
   (site3d.js -> openMoonGame -> window.MoonGame.open()).

   Histoire (sombre) : une maladie se répand chez les animaux.
   On l'ignore au départ ; chaque mini-boss et chaque boss, en
   mourant, en révèle un fragment. Le boss final est le savant
   fou qui a créé le pathogène pour réguler les rats — il a muté
   et contaminé toutes les espèces. Le vaincre libère l'antidote.

   6 chapitres aux thèmes/décors/bestiaires distincts, 4 cinéma-
   tiques animées, méta-progression et succès. Tout est piloté
   par des tables (FLOORS / ENEMY_DEFS / BOSS_DEFS / CINEMATICS).

   Fichier auto-contenu : n'expose que window.MoonGame.
   ========================================================= */
(function () {
  "use strict";

  /* =====================================================
     Langue + helper de localisation
     ===================================================== */
  let lang = "fr";
  try {
    const st = localStorage.getItem("stewy-lang");
    if (st && (st === "fr" || st === "en" || st === "es")) lang = st;
  } catch (e) {}
  function L(o) {
    return (o && (o[lang] || o.fr)) || "";
  }

  /* --- Chaînes d'interface --- */
  const UI = {
    fr: {
      close: "Quitter le jeu",
      hint: "ZQSD / WASD : bouger · Flèches : tirer · Échap : pause",
      title: "Donjon de la Lune",
      sub: "Une épidémie ronge les animaux. Découvre la vérité.",
      shardsLabel: "éclats de lune",
      play: "Descendre",
      achOpen: "Succès",
      achBack: "Retour",
      achTitle: "Succès",
      achProgress: "%a / %b débloqués",
      buy: "Acheter",
      maxed: "Max",
      continue: "Continuer ▸",
      skip: "Passer ▸",
      chapter: "Chapitre %s",
      retry: "Rejouer",
      quit: "Quitter",
      shop: "Boutique",
      gameOver: "Tu es tombé",
      victory: "L'antidote est libéré",
      overMsgDeath: "La maladie t'a emporté au chapitre %s.",
      overMsgWin: "Le remède se répand. Les bêtes guériront.",
      reward: "+%s 🌙 éclats gagnés",
      itemTitle: "Relique trouvée",
      take: "Prendre",
      pause: "Pause",
      floor: "Chapitre",
      cleared: "Salle purifiée",
      boss: "BOSS",
      newAch: "Succès : %s",
      speaks: "%s, agonisant :",
    },
    en: {
      close: "Quit the game",
      hint: "WASD: move · Arrows: shoot · Esc: pause",
      title: "Moon Dungeon",
      sub: "A plague gnaws at the animals. Uncover the truth.",
      shardsLabel: "moon shards",
      play: "Descend",
      achOpen: "Achievements",
      achBack: "Back",
      achTitle: "Achievements",
      achProgress: "%a / %b unlocked",
      buy: "Buy",
      maxed: "Max",
      continue: "Continue ▸",
      skip: "Skip ▸",
      chapter: "Chapter %s",
      retry: "Play again",
      quit: "Quit",
      shop: "Shop",
      gameOver: "You fell",
      victory: "The antidote is released",
      overMsgDeath: "The plague took you in chapter %s.",
      overMsgWin: "The cure spreads. The beasts will heal.",
      reward: "+%s 🌙 shards earned",
      itemTitle: "Relic found",
      take: "Take",
      pause: "Paused",
      floor: "Chapter",
      cleared: "Room purified",
      boss: "BOSS",
      newAch: "Achievement: %s",
      speaks: "%s, dying:",
    },
    es: {
      close: "Salir del juego",
      hint: "WASD: mover · Flechas: disparar · Esc: pausa",
      title: "Mazmorra Lunar",
      sub: "Una plaga consume a los animales. Descubre la verdad.",
      shardsLabel: "fragmentos de luna",
      play: "Descender",
      achOpen: "Logros",
      achBack: "Volver",
      achTitle: "Logros",
      achProgress: "%a / %b desbloqueados",
      buy: "Comprar",
      maxed: "Máx",
      continue: "Continuar ▸",
      skip: "Saltar ▸",
      chapter: "Capítulo %s",
      retry: "Jugar otra vez",
      quit: "Salir",
      shop: "Tienda",
      gameOver: "Has caído",
      victory: "El antídoto se libera",
      overMsgDeath: "La plaga te llevó en el capítulo %s.",
      overMsgWin: "La cura se extiende. Las bestias sanarán.",
      reward: "+%s 🌙 fragmentos ganados",
      itemTitle: "Reliquia encontrada",
      take: "Tomar",
      pause: "Pausa",
      floor: "Capítulo",
      cleared: "Sala purificada",
      boss: "JEFE",
      newAch: "Logro: %s",
      speaks: "%s, agonizando:",
    },
  };
  function t(k) {
    return (UI[lang] && UI[lang][k]) || UI.fr[k] || k;
  }

  const FINAL_FLOOR = 6;
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI"];

  /* =====================================================
     Bestiaire : définitions d'archétypes (stats + comportement + sprite)
     ===================================================== */
  const ENEMY_DEFS = {
    // --- Égouts ---
    rat: { hp: 3, r: 10, speed: 1.0, touch: 1, behavior: "chaser", draw: "rat" },
    ratSick: { hp: 4, r: 11, speed: 0.4, touch: 1, behavior: "spitter", draw: "ratSick" },
    bat: { hp: 2, r: 9, speed: 1.2, touch: 1, behavior: "zigzag", draw: "bat" },
    // --- Ville ---
    pigeon: { hp: 3, r: 10, speed: 1.1, touch: 1, behavior: "diver", draw: "pigeon" },
    cityRat: { hp: 3, r: 10, speed: 1.0, touch: 1, behavior: "pack", draw: "cityRat" },
    strayDog: { hp: 6, r: 13, speed: 1.7, touch: 1, behavior: "charger", draw: "dog" },
    cat: { hp: 4, r: 10, speed: 0.6, touch: 1, behavior: "orbiterShoot", draw: "cat" },
    // --- Zoo ---
    monkey: { hp: 4, r: 11, speed: 0.5, touch: 1, behavior: "lobber", draw: "monkey" },
    vulture: { hp: 4, r: 12, speed: 0.7, touch: 1, behavior: "flyerShoot", draw: "vulture" },
    lion: { hp: 7, r: 14, speed: 1.6, touch: 2, behavior: "pack", draw: "lion" },
    giraffe: { hp: 9, r: 15, speed: 1.4, touch: 2, behavior: "charger", draw: "giraffe" },
    // --- Ferme ---
    chicken: { hp: 2, r: 9, speed: 1.4, touch: 1, behavior: "hopper", draw: "chicken" },
    pig: { hp: 8, r: 14, speed: 0.7, touch: 1, behavior: "chaser", draw: "pig" },
    sheep: { hp: 5, r: 12, speed: 2.0, touch: 1, behavior: "bouncer", draw: "sheep" },
    goose: { hp: 4, r: 11, speed: 0.5, touch: 1, behavior: "spitter", draw: "goose" },
    // --- Hôpital vété ---
    pet: { hp: 5, r: 11, speed: 1.1, touch: 1, behavior: "chaser", draw: "pet" },
    syringeRat: { hp: 4, r: 10, speed: 0.45, touch: 1, behavior: "spitter", draw: "syringeRat" },
    spore: { hp: 3, r: 11, speed: 0.8, touch: 1, behavior: "splitter", draw: "spore" },
    // --- Labo ---
    mutantRat: { hp: 6, r: 12, speed: 1.8, touch: 1, behavior: "charger", draw: "mutantRat" },
    drone: { hp: 5, r: 11, speed: 0.5, touch: 1, behavior: "orbiterShoot", draw: "drone" },
    slime: { hp: 4, r: 12, speed: 0.7, touch: 1, behavior: "splitter", draw: "slime" },
  };

  /* =====================================================
     Boss : nom, sprite, pattern, stats, dialogue de mort
     ===================================================== */
  const BOSS_DEFS = {
    ratKing: {
      name: { fr: "Le Roi-Rat", en: "The Rat King", es: "El Rey Rata" },
      draw: "ratKing", pattern: "summoner", hp: 30, r: 24,
      dialog: {
        fr: "Nous… les premiers à tomber. L'eau des égouts… empoisonnée. Une lumière blanche, là-haut, dans la nuit… les deux-pattes nous ont condamnés…",
        en: "We… the first to fall. The sewer water… poisoned. A white light, up there in the night… the two-legs doomed us…",
        es: "Nosotros… los primeros en caer. El agua… envenenada. Una luz blanca, allá arriba… los de dos patas nos condenaron…",
      },
    },
    molosse: {
      name: { fr: "Le Molosse", en: "The Mastiff", es: "El Mastín" },
      draw: "molosse", pattern: "charger", hp: 40, r: 24,
      dialog: {
        fr: "Des hommes… masqués. Des camions, la nuit. Ils emportaient les malades vers la colline… vers la lumière. Va-t'en… avant qu'elle ne te prenne aussi.",
        en: "Masked men. Trucks, at night. They hauled the sick toward the hill… toward the light. Run… before it takes you too.",
        es: "Hombres enmascarados. Camiones, de noche. Llevaban a los enfermos a la colina… hacia la luz. Huye… antes de que te alcance.",
      },
    },
    elephant: {
      name: { fr: "L'Éléphant", en: "The Elephant", es: "El Elefante" },
      draw: "elephant", pattern: "stomper", hp: 58, r: 30,
      dialog: {
        fr: "On nous gardait en cage… on nous injectait des « remèdes ». Tous ont échoué. Tous nous ont tués un peu plus. Le mal ne vient pas d'ici… il vient de plus haut.",
        en: "They kept us caged… injected us with 'cures'. All failed. Each one killed us a little more. The sickness isn't from here… it comes from higher up.",
        es: "Nos enjaulaban… nos inyectaban « curas ». Todas fallaron. Cada una nos mató un poco más. El mal no es de aquí… viene de más arriba.",
      },
    },
    bull: {
      name: { fr: "Le Taureau Fiévreux", en: "The Fevered Bull", es: "El Toro Febril" },
      draw: "bull", pattern: "charger", hp: 64, r: 26,
      dialog: {
        fr: "La ferme est tombée en trois jours. On a chargé nos malades dans des camions blancs… direction l'hôpital. Ils croyaient pouvoir nous sauver. Personne ne nous a sauvés.",
        en: "The farm fell in three days. They loaded our sick into white trucks… to the hospital. They thought they could save us. No one saved us.",
        es: "La granja cayó en tres días. Cargaron a los enfermos en camiones blancos… al hospital. Creían que podían salvarnos. Nadie nos salvó.",
      },
    },
    patientZero: {
      name: { fr: "Patient Zéro", en: "Patient Zero", es: "Paciente Cero" },
      draw: "patientZero", pattern: "splitterBoss", hp: 72, r: 26,
      dialog: {
        fr: "Les dossiers… un seul nom revient. Le Docteur. Il n'a pas trouvé la maladie : il l'a FABRIQUÉE. Tout finit à son laboratoire. Va. Mais ce que tu y verras… te hantera.",
        en: "The files… one name recurs. The Doctor. He didn't find the disease: he MADE it. It all ends at his lab. Go. But what you'll see there… will haunt you.",
        es: "Los archivos… un nombre se repite. El Doctor. No descubrió la enfermedad: la CREÓ. Todo acaba en su laboratorio. Ve. Pero lo que verás… te perseguirá.",
      },
    },
    scientist: {
      name: { fr: "Le Savant Fou", en: "The Mad Scientist", es: "El Científico Loco" },
      draw: "scientist", pattern: "scientist", hp: 110, r: 18, final: true,
      dialog: {
        fr: "Les rats pullulaient… il fallait les réguler ! J'ai créé une fièvre rien que pour eux. Mais elle a muté… sauté d'espèce en espèce. J'ai sacrifié des centaines d'animaux pour la tester… pour rien. Prends l'antidote. Répare ma faute. Moi, je ne le peux plus.",
        en: "The rats swarmed… they had to be culled! I engineered a fever just for them. But it mutated… leapt from species to species. I sacrificed hundreds of lab animals testing it… for nothing. Take the antidote. Undo my sin. I no longer can.",
        es: "Las ratas pululaban… ¡había que regularlas! Creé una fiebre solo para ellas. Pero mutó… saltó de especie en especie. Sacrifiqué cientos de animales probándola… para nada. Toma el antídoto. Repara mi culpa. Yo ya no puedo.",
      },
    },
  };

  /* =====================================================
     Chapitres / étages : thème, palette, décor, roster,
     boss, mini-boss, carte de titre et texte d'intro.
     ===================================================== */
  const FLOORS = [
    {
      id: "sewers",
      name: { fr: "Les Égouts", en: "The Sewers", es: "Las Cloacas" },
      chapter: { fr: "Là où l'eau noire murmure", en: "Where the Black Water Whispers", es: "Donde susurra el agua negra" },
      intro: {
        fr: "Une fièvre sans nom frappe la ville. Les bêtes deviennent folles, puis s'éteignent. Personne ne sait pourquoi. Les premiers corps gisaient ici-bas, dans les égouts. Stewybear y descend, une lanterne pour seule certitude.",
        en: "A nameless fever grips the city. Beasts go mad, then die out. No one knows why. The first bodies lay down here, in the sewers. Stewybear descends, a lantern his only certainty.",
        es: "Una fiebre sin nombre azota la ciudad. Las bestias enloquecen y se apagan. Nadie sabe por qué. Los primeros cuerpos yacían aquí, en las cloacas. Stewybear desciende, con un farol por única certeza.",
      },
      pal: { floor: "#13211c", floor2: "#0e1814", wall: "#22332b", door: "#6b8f4a", tint: "rgba(80,170,90,0.05)" },
      decor: "sewers",
      enemies: ["rat", "rat", "ratSick", "bat"],
      boss: "ratKing",
      mini: {
        name: { fr: "Le Rat Balafré", en: "The Scarred Rat", es: "La Rata Marcada" },
        draw: "rat", behavior: "charger", hpMult: 4, r: 16,
        dialog: {
          fr: "Ce n'est pas… naturel. Ça n'est pas monté du sol. C'est descendu… c'est venu de l'eau. On l'a bue avant de comprendre.",
          en: "This isn't… natural. It didn't rise from the ground. It came down… it came from the water. We drank it before we understood.",
          es: "Esto no es… natural. No subió del suelo. Bajó… vino del agua. La bebimos antes de entender.",
        },
      },
    },
    {
      id: "city",
      name: { fr: "La Ville", en: "The City", es: "La Ciudad" },
      chapter: { fr: "Les rues que la lune a désertées", en: "The Streets the Moon Forsook", es: "Las calles que la luna abandonó" },
      intro: {
        fr: "La contagion a gagné la surface. Les rues sont désertes, les volets cloués. Seuls rôdent les errants, l'œil vert et l'écume aux babines. La lune elle-même semble avoir détourné le regard.",
        en: "The contagion has reached the surface. The streets lie empty, shutters nailed shut. Only strays prowl now, green-eyed and foaming. Even the moon seems to have looked away.",
        es: "El contagio llegó a la superficie. Las calles vacías, las persianas clavadas. Solo rondan los callejeros, de ojos verdes y baba. Hasta la luna parece haber apartado la mirada.",
      },
      pal: { floor: "#1b1c24", floor2: "#15161d", wall: "#2e3140", door: "#8a6a3a", tint: "rgba(180,150,90,0.04)" },
      decor: "city",
      enemies: ["cityRat", "pigeon", "cat", "strayDog"],
      boss: "molosse",
      mini: {
        name: { fr: "Le Chat de Gouttière", en: "The Alley Cat", es: "El Gato Callejero" },
        draw: "cat", behavior: "orbiterShoot", hpMult: 4, r: 14,
        dialog: {
          fr: "J'ai vu… des hommes sans visage. Des masques, des camions blancs. Ils prenaient les bêtes vivantes… et montaient vers la colline.",
          en: "I saw… faceless men. Masks, white trucks. They took the living beasts… and drove up toward the hill.",
          es: "Vi… hombres sin rostro. Máscaras, camiones blancos. Se llevaban a las bestias vivas… y subían hacia la colina.",
        },
      },
    },
    {
      id: "zoo",
      name: { fr: "Le Zoo", en: "The Zoo", es: "El Zoológico" },
      chapter: { fr: "Derrière les barreaux, le silence", en: "Behind the Bars, the Silence", es: "Tras los barrotes, el silencio" },
      intro: {
        fr: "Le zoo abandonné. Les enclos béants, les cages forcées. Ici, on a « soigné » les bêtes les plus rares — et on les a regardées mourir une à une. Le silence y pèse plus lourd que les barreaux.",
        en: "The abandoned zoo. Gaping pens, forced cages. Here the rarest beasts were 'treated' — and watched dying one by one. The silence weighs heavier than the bars.",
        es: "El zoológico abandonado. Recintos abiertos, jaulas forzadas. Aquí « curaron » a las bestias más raras — y las vieron morir una a una. El silencio pesa más que los barrotes.",
      },
      pal: { floor: "#241f17", floor2: "#1b1710", wall: "#3a3120", door: "#7c5230", tint: "rgba(150,140,80,0.04)" },
      decor: "zoo",
      enemies: ["monkey", "vulture", "lion", "giraffe"],
      boss: "elephant",
      mini: {
        name: { fr: "Le Vieux Singe", en: "The Old Ape", es: "El Viejo Simio" },
        draw: "monkey", behavior: "lobber", hpMult: 4, r: 15,
        dialog: {
          fr: "Les blouses blanches… elles venaient avec des aiguilles. Des « remèdes », qu'elles disaient. Chaque piqûre nous tuait un peu plus. Le vrai mal n'est pas ici… il est ailleurs.",
          en: "The white coats… they came with needles. 'Cures', they said. Every shot killed us a little more. The true sickness isn't here… it's elsewhere.",
          es: "Las batas blancas… venían con agujas. « Curas », decían. Cada pinchazo nos mataba un poco más. El verdadero mal no está aquí… está en otra parte.",
        },
      },
    },
    {
      id: "farm",
      name: { fr: "La Ferme", en: "The Farm", es: "La Granja" },
      chapter: { fr: "La grange aux souffles éteints", en: "The Barn of Spent Breaths", es: "El granero de alientos apagados" },
      intro: {
        fr: "Une ferme oubliée au bout des champs. Le bétail s'est éteint dans la paille, l'épouvantail veille sur des étables muettes. Tout ce qui respirait ici respire encore — mais autrement, et de travers.",
        en: "A forgotten farm at the edge of the fields. The livestock died in the straw, the scarecrow watching over silent barns. All that breathed here still breathes — but wrongly, sideways.",
        es: "Una granja olvidada al borde de los campos. El ganado se apagó en la paja, el espantapájaros vela sobre establos mudos. Todo lo que respiraba aún respira — pero mal, torcido.",
      },
      pal: { floor: "#241a10", floor2: "#1b130b", wall: "#3a2a18", door: "#8a5a2a", tint: "rgba(180,120,55,0.05)" },
      decor: "farm",
      enemies: ["chicken", "pig", "sheep", "goose"],
      boss: "bull",
      mini: {
        name: { fr: "Le Vieux Bouc", en: "The Old Goat", es: "El Viejo Cabrón" },
        draw: "sheep", behavior: "bouncer", hpMult: 4, r: 15,
        dialog: {
          fr: "Les malades partaient en camion, à l'aube, vers le grand bâtiment blanc. On disait qu'on les soignerait. Aucun n'est revenu.",
          en: "The sick left by truck at dawn, toward the big white building. They said they'd be cured. None came back.",
          es: "Los enfermos partían en camión, al alba, hacia el gran edificio blanco. Decían que los curarían. Ninguno volvió.",
        },
      },
    },
    {
      id: "hospital",
      name: { fr: "L'Hôpital Vétérinaire", en: "The Vet Hospital", es: "El Hospital Veterinario" },
      chapter: { fr: "Le couloir blanc des adieux", en: "The White Corridor of Farewells", es: "El pasillo blanco de los adioses" },
      intro: {
        fr: "Le grand hôpital où l'on amenait les bêtes pour les sauver. La quarantaine a cédé. Les couloirs sont jonchés de brancards, les machines bipent encore dans le vide. Sur un dossier oublié, un nom revient sans cesse.",
        en: "The great hospital where beasts were brought to be saved. Quarantine gave way. The halls are strewn with gurneys, machines still beeping into the void. On a forgotten file, one name keeps recurring.",
        es: "El gran hospital adonde traían a las bestias para salvarlas. La cuarentena cedió. Los pasillos llenos de camillas, las máquinas pitando en el vacío. En un expediente olvidado, un nombre se repite.",
      },
      pal: { floor: "#19262f", floor2: "#121b22", wall: "#2a3a44", door: "#5a8a8f", tint: "rgba(120,200,200,0.04)" },
      decor: "hospital",
      enemies: ["pet", "syringeRat", "spore", "pet"],
      boss: "patientZero",
      mini: {
        name: { fr: "Le Chien de Garde Muté", en: "The Mutated Guard Dog", es: "El Perro Guardián Mutado" },
        draw: "dog", behavior: "charger", hpMult: 4, r: 16,
        dialog: {
          fr: "Les dossiers… brûlés, presque tous. Sauf un nom, partout. Le Docteur. C'est lui qui décidait qui vivait. C'est lui qui a tout commencé.",
          en: "The files… burned, nearly all. Save one name, everywhere. The Doctor. He decided who lived. He started it all.",
          es: "Los expedientes… quemados, casi todos. Salvo un nombre, por doquier. El Doctor. Él decidía quién vivía. Él lo empezó todo.",
        },
      },
    },
    {
      id: "lab",
      name: { fr: "Le Laboratoire", en: "The Laboratory", es: "El Laboratorio" },
      chapter: { fr: "La fiole, le sang et la vérité", en: "The Vial, the Blood and the Truth", es: "El frasco, la sangre y la verdad" },
      intro: {
        fr: "Le repaire, au sommet de la colline. Du sang séché strie les murs ; des rats de laboratoire gisent par dizaines, cobayes d'un crime patient. Au centre, une cuve luit d'un vert malade. Et lui, qui attend, une fiole à la main.",
        en: "The lair, atop the hill. Dried blood streaks the walls; lab rats lie in dozens, the guinea pigs of a patient crime. At the center a vat glows sickly green. And him, waiting, a vial in hand.",
        es: "La guarida, en lo alto de la colina. Sangre seca surca los muros; ratas de laboratorio yacen por decenas, cobayas de un crimen paciente. En el centro, una cuba brilla de un verde enfermo. Y él, esperando, un frasco en la mano.",
      },
      pal: { floor: "#0f1418", floor2: "#0a0e12", wall: "#1c2630", door: "#3a8f6a", tint: "rgba(70,220,120,0.06)", blood: true },
      decor: "lab",
      enemies: ["mutantRat", "drone", "slime", "mutantRat"],
      boss: "scientist",
      mini: {
        name: { fr: "Le Prototype Évadé", en: "The Escaped Prototype", es: "El Prototipo Fugado" },
        draw: "slime", behavior: "splitter", hpMult: 5, r: 16,
        dialog: {
          fr: "Il nous a tous… sacrifiés. Des centaines. Une cage, une aiguille, une croix sur un registre. « Pour la science », répétait-il. Va le voir. Qu'il réponde de nous.",
          en: "He sacrificed… us all. Hundreds. A cage, a needle, a cross on a ledger. 'For science', he kept saying. Go to him. Make him answer for us.",
          es: "Nos sacrificó… a todos. Cientos. Una jaula, una aguja, una cruz en un registro. « Por la ciencia », repetía. Ve a él. Que responda por nosotros.",
        },
      },
    },
  ];

  /* =====================================================
     Cinématiques (≥4) — scènes animées + narration
     Chaque scène : { dur (ms), text:{...}, draw(p) } p∈[0,1].
     ===================================================== */
  const CINE_BEFORE_FLOOR = { 1: "prologue", 3: "truck", 6: "lab" };

  // (les fonctions draw sont définies plus bas, après le contexte ctx)
  let CINEMATICS = null;

  /* =====================================================
     Persistance
     ===================================================== */
  function load(key, def) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  }
  function save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }
  let shards = load("stewy-moon-shards", 0);
  let metaLevels = load("stewy-moon-meta", {});
  let achState = load("stewy-moon-ach", {});
  let found = load("stewy-moon-found", false);
  function metaLevel(id) {
    return metaLevels[id] || 0;
  }

  /* --- Améliorations permanentes (sanctuaire) --- */
  const UPGRADES = [
    { id: "hp", name: { fr: "Vitalité", en: "Vitality", es: "Vitalidad" }, desc: { fr: "+1 cœur de départ", en: "+1 starting heart", es: "+1 corazón inicial" }, max: 3, cost: (l) => 6 + l * 6 },
    { id: "dmg", name: { fr: "Puissance", en: "Power", es: "Poder" }, desc: { fr: "+15 % dégâts", en: "+15% damage", es: "+15% daño" }, max: 4, cost: (l) => 5 + l * 5 },
    { id: "rate", name: { fr: "Réflexes", en: "Reflexes", es: "Reflejos" }, desc: { fr: "+10 % cadence", en: "+10% fire rate", es: "+10% cadencia" }, max: 4, cost: (l) => 5 + l * 5 },
    { id: "speed", name: { fr: "Agilité", en: "Agility", es: "Agilidad" }, desc: { fr: "+8 % vitesse", en: "+8% speed", es: "+8% velocidad" }, max: 3, cost: (l) => 5 + l * 5 },
    { id: "luck", name: { fr: "Fortune", en: "Fortune", es: "Fortuna" }, desc: { fr: "+1 éclat par salle", en: "+1 shard per room", es: "+1 fragmento por sala" }, max: 3, cost: (l) => 8 + l * 7 },
    { id: "magnet", name: { fr: "Aimant lunaire", en: "Moon Magnet", es: "Imán lunar" }, desc: { fr: "Attire les éclats vers toi", en: "Pulls shards toward you", es: "Atrae los fragmentos" }, max: 2, cost: (l) => 10 + l * 10 },
  ];

  /* --- Succès --- */
  const ACHIEVEMENTS = [
    { id: "enter", name: { fr: "L'Enquête", en: "The Inquiry", es: "La Indagación" }, desc: { fr: "Entrer dans le donjon", en: "Enter the dungeon", es: "Entrar en la mazmorra" } },
    { id: "clearRoom", name: { fr: "Purificateur", en: "Purifier", es: "Purificador" }, desc: { fr: "Purifier une salle", en: "Purify a room", es: "Purificar una sala" } },
    { id: "mini", name: { fr: "Témoin", en: "Witness", es: "Testigo" }, desc: { fr: "Vaincre un mini-boss", en: "Defeat a mini-boss", es: "Vencer a un mini-jefe" } },
    { id: "boss1", name: { fr: "Fossoyeur", en: "Gravedigger", es: "Sepulturero" }, desc: { fr: "Vaincre un boss", en: "Defeat a boss", es: "Vencer a un jefe" } },
    { id: "item", name: { fr: "Reliquaire", en: "Reliquary", es: "Relicario" }, desc: { fr: "Ramasser une relique", en: "Pick up a relic", es: "Recoger una reliquia" } },
    { id: "floor3", name: { fr: "Spéléologue", en: "Spelunker", es: "Espeleólogo" }, desc: { fr: "Atteindre le chapitre III", en: "Reach chapter III", es: "Llegar al capítulo III" } },
    { id: "rich", name: { fr: "Lunaire", en: "Lunar", es: "Lunar" }, desc: { fr: "Posséder 40 éclats", en: "Hold 40 shards", es: "Tener 40 fragmentos" } },
    { id: "sanctuary", name: { fr: "Mécène", en: "Patron", es: "Mecenas" }, desc: { fr: "Acheter une amélioration", en: "Buy an upgrade", es: "Comprar una mejora" } },
    { id: "flawless", name: { fr: "Immunisé", en: "Immune", es: "Inmune" }, desc: { fr: "Finir un chapitre sans dégâts", en: "Clear a chapter unharmed", es: "Acabar un capítulo sin daño" } },
    { id: "win", name: { fr: "L'Antidote", en: "The Antidote", es: "El Antídoto" }, desc: { fr: "Libérer le remède", en: "Release the cure", es: "Liberar la cura" } },
  ];

  /* =====================================================
     DOM
     ===================================================== */
  const section = document.querySelector(".moon-rogue");
  if (!section) {
    window.MoonGame = { open() {}, close() {}, isOpen: () => false, setLang() {}, openAchievements() {} };
    return;
  }
  const canvas = section.querySelector(".mr-canvas");
  const ctx = canvas.getContext("2d");
  const closeBtn = section.querySelector(".mr-close");
  const hintEl = section.querySelector(".mr-hint");

  const startMenu = section.querySelector(".mr-start");
  const shardCount = section.querySelector(".mr-shard-count");
  const shardsLabelEl = section.querySelector(".mr-shards-label");
  const sanctuaryEl = section.querySelector(".mr-sanctuary");
  const playBtn = section.querySelector(".mr-play");
  const achOpenBtn = section.querySelector(".mr-ach-open");
  const subEl = section.querySelector(".mr-sub");

  const achMenu = section.querySelector(".mr-ach");
  const achList = section.querySelector(".mr-ach-list");
  const achProgress = section.querySelector(".mr-ach-progress");
  const achBackBtn = section.querySelector(".mr-ach-back");

  const overMenu = section.querySelector(".mr-over");
  const overTitle = section.querySelector(".mr-over-title");
  const overMsg = section.querySelector(".mr-over-msg");
  const overReward = section.querySelector(".mr-over-reward");
  const retryBtn = section.querySelector(".mr-retry");
  const quitBtn = section.querySelector(".mr-quit");
  const shopBtn = section.querySelector(".mr-shop");

  const itemMenu = section.querySelector(".mr-item");
  const itemTitle = section.querySelector(".mr-item-title");
  const itemName = section.querySelector(".mr-item-name");
  const itemDesc = section.querySelector(".mr-item-desc");
  const itemTakeBtn = section.querySelector(".mr-item-take");

  const storyMenu = section.querySelector(".mr-story");
  const storyKicker = section.querySelector(".mr-story-kicker");
  const storyTitle = section.querySelector(".mr-story-title");
  const storyText = section.querySelector(".mr-story-text");
  const storyContinue = section.querySelector(".mr-story-continue");

  const cineSkip = section.querySelector(".mr-cine-skip");

  const hubAchBtn = document.querySelector(".hub-ach");
  const hubMedal = document.querySelector(".hub-medal");

  /* =====================================================
     Constantes & utilitaires
     ===================================================== */
  const W = 480, H = 360, HUD_H = 40;
  const RX = 28, RY = HUD_H + 16, RW = W - RX * 2, RH = H - RY - 20;
  const DOOR_HALF = 26, WALL = 10;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
  // RNG déterministe (décor stable par salle)
  function srand(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  const OPP = { N: "S", S: "N", E: "W", W: "E" };

  /* =====================================================
     État
     ===================================================== */
  let mode = "menu"; // menu | play | pause | item | over | ach | story | cinematic
  let running = false, rafId = 0, lastT = 0;
  let floor = 1;
  let curFloorId = null; // environnement courant (pour la musique/ambiance)
  let player = null;
  let rooms = null, curKey = "0,0", cur = null;
  let projectiles = [], enemies = [], pickups = [], hazards = [];
  let pedestal = null;
  let banner = "", bannerT = 0;
  let runShards = 0, floorDamageTaken = false;
  let pendingItem = null, pendingContinue = null;
  let dyingBoss = null;
  let shake = 0, particles = [], frameCount = 0;
  let cine = null;

  const keys = {};
  function keyDown(c) { return !!keys[c]; }

  /* =====================================================
     Joueur
     ===================================================== */
  function makePlayer() {
    const hpUp = metaLevel("hp");
    return {
      x: W / 2, y: RY + RH / 2, r: 9,
      hp: 6 + hpUp * 2, maxHp: 6 + hpUp * 2,
      speed: 1.9 * (1 + metaLevel("speed") * 0.08),
      dmg: 1 * (1 + metaLevel("dmg") * 0.15),
      fireDelay: 28 * (1 - metaLevel("rate") * 0.1),
      shotSpeed: 4.2, range: 72, spread: 1, pierce: false,
      iframe: 0, fireT: 0, items: [], face: "down",
    };
  }

  /* =====================================================
     Reliques (objets de run)
     ===================================================== */
  const ITEMS = [
    { id: "dmg", name: { fr: "Croc lunaire", en: "Moon Fang", es: "Colmillo lunar" }, desc: { fr: "Dégâts +50 %", en: "+50% damage", es: "+50% daño" }, apply: (p) => (p.dmg *= 1.5) },
    { id: "rate", name: { fr: "Cœur véloce", en: "Swift Heart", es: "Corazón veloz" }, desc: { fr: "Cadence +30 %", en: "+30% fire rate", es: "+30% cadencia" }, apply: (p) => (p.fireDelay *= 0.7) },
    { id: "speed", name: { fr: "Bottes d'argent", en: "Silver Boots", es: "Botas de plata" }, desc: { fr: "Vitesse +20 %", en: "+20% speed", es: "+20% velocidad" }, apply: (p) => (p.speed *= 1.2) },
    { id: "shot", name: { fr: "Poudre stellaire", en: "Stardust", es: "Polvo estelar" }, desc: { fr: "Tirs plus rapides", en: "Faster shots", es: "Disparos veloces" }, apply: (p) => (p.shotSpeed *= 1.3) },
    { id: "heart", name: { fr: "Cœur de lune", en: "Moon Heart", es: "Corazón de luna" }, desc: { fr: "+1 cœur max (soigne)", en: "+1 max heart (heal)", es: "+1 corazón máx" }, apply: (p) => { p.maxHp += 2; p.hp = p.maxHp; } },
    { id: "triple", name: { fr: "Triade céleste", en: "Celestial Triad", es: "Tríada celeste" }, desc: { fr: "Tir triple", en: "Triple shot", es: "Disparo triple" }, apply: (p) => (p.spread = Math.min(3, p.spread + 1)) },
    { id: "pierce", name: { fr: "Rayon perçant", en: "Piercing Ray", es: "Rayo perforante" }, desc: { fr: "Les tirs traversent", en: "Shots pierce", es: "Disparos perforan" }, apply: (p) => (p.pierce = true) },
    { id: "range", name: { fr: "Longue-vue", en: "Spyglass", es: "Catalejo" }, desc: { fr: "Portée +40 %", en: "+40% range", es: "+40% alcance" }, apply: (p) => (p.range *= 1.4) },
  ];

  /* =====================================================
     Génération d'un chapitre
     ===================================================== */
  function genFloor(depth) {
    floor = depth;
    rooms = new Map();
    const count = clamp(6 + depth, 7, 11);
    const start = "0,0";
    rooms.set(start, makeRoom(0, 0, "start"));
    const frontier = [[0, 0]];
    let guard = 0;
    while (rooms.size < count && guard++ < 400) {
      const [bx, by] = pick(frontier);
      const d = pick(["N", "S", "E", "W"]);
      const nx = bx + DIRS[d][0], ny = by + DIRS[d][1];
      if (Math.abs(nx) > 3 || Math.abs(ny) > 2) continue;
      const key = nx + "," + ny;
      if (!rooms.has(key)) {
        rooms.set(key, makeRoom(nx, ny, "normal"));
        frontier.push([nx, ny]);
      }
    }
    rooms.forEach((room, key) => {
      const [gx, gy] = key.split(",").map(Number);
      Object.keys(DIRS).forEach((d) => {
        if (rooms.has(gx + DIRS[d][0] + "," + (gy + DIRS[d][1]))) room.doors[d] = true;
      });
    });
    const keysArr = Array.from(rooms.keys()).filter((k) => k !== start);
    keysArr.sort((a, b) => farKey(b) - farKey(a));
    const bossKey = keysArr[0];
    rooms.get(bossKey).type = "boss";
    let treasureKey = keysArr.find((k) => k !== bossKey && doorCount(rooms.get(k)) === 1);
    if (!treasureKey) treasureKey = keysArr.find((k) => k !== bossKey);
    if (treasureKey) rooms.get(treasureKey).type = "treasure";
    const miniKey = keysArr.find((k) => k !== bossKey && k !== treasureKey);
    if (miniKey) rooms.get(miniKey).type = "miniboss";

    curKey = start;
    cur = rooms.get(start);
    enterRoom(null);
  }
  function farKey(key) { const [gx, gy] = key.split(",").map(Number); return Math.abs(gx) + Math.abs(gy); }
  function doorCount(r) { return Object.values(r.doors).filter(Boolean).length; }
  function makeRoom(gx, gy, type) {
    return { gx, gy, type, doors: { N: false, S: false, E: false, W: false }, cleared: type === "start", visited: false, spawned: false, looted: false };
  }

  function enterRoom(fromDir) {
    projectiles = []; enemies = []; pickups = []; hazards = []; pedestal = null;
    cur.visited = true;
    if (fromDir) placePlayerAtDoor(OPP[fromDir]);
    else { player.x = W / 2; player.y = RY + RH / 2; }
    if (!cur.cleared && !cur.spawned) {
      cur.spawned = true;
      if (cur.type === "boss") spawnBoss();
      else if (cur.type === "miniboss") spawnMiniBoss();
      else if (cur.type === "normal") spawnEnemies();
    }
    if (cur.type === "treasure" && !cur.looted) pedestal = { x: W / 2, y: RY + RH / 2, item: pick(ITEMS), taken: false };
    // Bug corrigé : en quittant la salle, pickups est vidé (donc la trappe aussi).
    // Si la salle de boss est déjà nettoyée, on repose la trappe à chaque entrée,
    // sinon revenir dans la salle empêchait de descendre au niveau suivant.
    if (cur.type === "boss" && cur.cleared) pickups.push({ x: W / 2, y: RY + RH / 2, kind: "trap" });
  }
  function placePlayerAtDoor(d) {
    const cx = W / 2, cy = RY + RH / 2;
    if (d === "N") { player.x = cx; player.y = RY + 24; }
    else if (d === "S") { player.x = cx; player.y = RY + RH - 24; }
    else if (d === "W") { player.x = RX + 24; player.y = cy; }
    else { player.x = RX + RW - 24; player.y = cy; }
  }

  /* =====================================================
     Apparition d'ennemis
     ===================================================== */
  function fdef() { return FLOORS[floor - 1]; }
  function fx() { return 1 + (floor - 1) * 0.28; }

  function spawnEnemies() {
    const roster = fdef().enemies;
    const n = clamp(2 + Math.floor(floor * 0.8), 3, 6);
    for (let i = 0; i < n; i++) enemies.push(makeEnemy(pick(roster)));
  }
  function makeEnemy(defId, opts) {
    const d = ENEMY_DEFS[defId];
    const e = {
      defId, x: rnd(RX + 40, RX + RW - 40), y: rnd(RY + 40, RY + RH - 40),
      r: d.r, behavior: d.behavior, draw: d.draw,
      hp: d.hp * fx(), maxHp: d.hp * fx(), speed: d.speed + floor * 0.04, touch: d.touch,
      shootT: rndInt(40, 100), t: rndInt(0, 60), vx: 0, vy: 0, hit: 0,
    };
    if (opts) Object.assign(e, opts);
    return e;
  }
  function spawnMiniBoss() {
    // m.draw est un identifiant de sprite (pas forcément une clé d'ENEMY_DEFS) :
    // on construit l'élite directement à partir de la config du mini-boss.
    const m = fdef().mini;
    const hp = 5 * fx() * (m.hpMult || 4);
    enemies.push({
      defId: m.draw, elite: true, x: W / 2, y: RY + 80,
      r: m.r || 16, behavior: m.behavior, draw: m.draw,
      hp, maxHp: hp, touch: 1, speed: 1 + floor * 0.06,
      shootT: rndInt(40, 100), t: 0, vx: 0, vy: 0, hit: 0,
    });
    banner = L(m.name); bannerT = 100;
  }
  function spawnBoss() {
    const b = BOSS_DEFS[fdef().boss];
    enemies.push({
      defId: "boss", boss: true, bossId: fdef().boss, final: !!b.final,
      x: W / 2, y: RY + 72, r: b.r, draw: b.draw, pattern: b.pattern,
      hp: b.hp * fx(), maxHp: b.hp * fx(), touch: 2, speed: 0.55 + floor * 0.04,
      shootT: 50, phase: 0, hit: 0, t: 0, vx: 0, vy: 0, charge: 0, cdx: 0, cdy: 0,
    });
    banner = L(b.name); bannerT = 110;
  }

  /* =====================================================
     Tir
     ===================================================== */
  function shoot(dx, dy) {
    if (player.fireT > 0) return;
    player.fireT = player.fireDelay;
    const baseAng = Math.atan2(dy, dx), sp = player.spread;
    for (let i = 0; i < sp; i++) {
      const off = sp === 1 ? 0 : (i - (sp - 1) / 2) * 0.22;
      const a = baseAng + off;
      projectiles.push({ x: player.x, y: player.y, vx: Math.cos(a) * player.shotSpeed, vy: Math.sin(a) * player.shotSpeed, from: "p", dmg: player.dmg, r: 4, life: player.range, pierce: player.pierce });
    }
    if (window.Sound && window.Sound.enabled && window.Sound.jump) window.Sound.jump();
  }
  function eShootAt(e, speed, tx, ty, dmg) {
    const a = Math.atan2((ty == null ? player.y : ty) - e.y, (tx == null ? player.x : tx) - e.x);
    projectiles.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, from: "e", dmg: dmg || 1, r: 4, life: 260, pierce: false });
  }
  function eShootAng(e, speed, ang, dmg) {
    projectiles.push({ x: e.x, y: e.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, from: "e", dmg: dmg || 1, r: 4, life: 260, pierce: false });
  }

  /* =====================================================
     Boucle / pas de simulation
     ===================================================== */
  function step() {
    frameCount++;
    // déplacement
    let mx = 0, my = 0;
    if (keyDown("KeyA") || keyDown("KeyQ")) mx -= 1;
    if (keyDown("KeyD")) mx += 1;
    if (keyDown("KeyW") || keyDown("KeyZ")) my -= 1;
    if (keyDown("KeyS")) my += 1;
    const ml = Math.hypot(mx, my) || 1;
    player.x += (mx / ml) * player.speed;
    player.y += (my / ml) * player.speed;
    confinePlayer();
    if (player.fireT > 0) player.fireT--;
    if (player.iframe > 0) player.iframe--;
    // tir
    let sx = 0, sy = 0;
    if (keyDown("ArrowLeft")) sx -= 1;
    if (keyDown("ArrowRight")) sx += 1;
    if (keyDown("ArrowUp")) sy -= 1;
    if (keyDown("ArrowDown")) sy += 1;
    if (sx || sy) { shoot(sx, sy); player.face = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? "right" : "left") : sy > 0 ? "down" : "up"; }

    updateProjectiles();
    updateEnemies();
    updateHazards();
    updatePickups();
    updateParticles();

    if (pedestal && !pedestal.taken && dist2(pedestal.x, pedestal.y, player.x, player.y) < 22 * 22) offerItem(pedestal.item);

    if (!cur.cleared && cur.spawned && enemies.length === 0 && cur.type === "normal") clearRoom();

    if (roomOpen()) tryDoorTransition();
    if (bannerT > 0) bannerT--;
    if (shake > 0.2) shake *= 0.82; else shake = 0;
  }

  function confinePlayer() {
    player.x = clamp(player.x, RX + player.r, RX + RW - player.r);
    player.y = clamp(player.y, RY + player.r, RY + RH - player.r);
  }
  function roomOpen() { return cur.cleared || cur.type === "start" || cur.type === "treasure"; }
  function confine(e) { e.x = clamp(e.x, RX + e.r, RX + RW - e.r); e.y = clamp(e.y, RY + e.r, RY + RH - e.r); }

  function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      pr.x += pr.vx; pr.y += pr.vy; pr.life--;
      let dead = pr.life <= 0;
      if (pr.x < RX + 2 || pr.x > RX + RW - 2 || pr.y < RY + 2 || pr.y > RY + RH - 2) dead = true;
      if (pr.from === "p") {
        for (const e of enemies) {
          if (e.dying) continue;
          if (dist2(pr.x, pr.y, e.x, e.y) < (e.r + pr.r) * (e.r + pr.r)) {
            e.hp -= pr.dmg; e.hit = 6; shake = Math.max(shake, 2);
            if (!pr.pierce) dead = true;
            break;
          }
        }
      } else if (player.iframe <= 0 && dist2(pr.x, pr.y, player.x, player.y) < (player.r + pr.r) * (player.r + pr.r)) {
        hurtPlayer(pr.dmg); dead = true;
      }
      if (dead) projectiles.splice(i, 1);
    }
  }

  function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dying) continue;
      if (e.hit > 0) e.hit--;
      e.t++;
      behave(e);
      if (player.iframe <= 0 && dist2(e.x, e.y, player.x, player.y) < (e.r + player.r) * (e.r + player.r)) hurtPlayer(e.touch);
      if (e.hp <= 0) {
        if (e.boss || e.elite) { startDeathDialog(e); return; }
        onEnemyDead(e); enemies.splice(i, 1);
      }
    }
  }

  function updateHazards() {
    for (let i = hazards.length - 1; i >= 0; i--) {
      const hz = hazards[i];
      hz.life--;
      if (hz.life <= 0) { hazards.splice(i, 1); continue; }
      if (player.iframe <= 0 && dist2(hz.x, hz.y, player.x, player.y) < (hz.r + player.r) * (hz.r + player.r)) hurtPlayer(1);
    }
  }

  function updatePickups() {
    // Aimant lunaire (amélioration du sanctuaire) : portée d'attraction.
    const magRange = metaLevel("magnet") > 0 ? 60 + metaLevel("magnet") * 30 : 0;
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      if (pk.kind === "trap") continue;
      // Les éclats (et cœurs) glissent vers le joueur s'ils sont à portée.
      if (magRange && (pk.kind === "shard" || pk.kind === "heart")) {
        const d2 = dist2(pk.x, pk.y, player.x, player.y);
        if (d2 > 4 && d2 < magRange * magRange) {
          const a = Math.atan2(player.y - pk.y, player.x - pk.x);
          pk.x += Math.cos(a) * 2.6; pk.y += Math.sin(a) * 2.6;
        }
      }
      if (dist2(pk.x, pk.y, player.x, player.y) < (player.r + 8) * (player.r + 8)) {
        if (pk.kind === "heart") player.hp = Math.min(player.maxHp, player.hp + 2);
        else runShards += pk.val;
        pickups.splice(i, 1);
      }
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
    // miasme : spores qui dérivent
    if (frameCount % 8 === 0 && particles.length < 26) {
      particles.push({ x: rnd(RX, RX + RW), y: RY + RH, vx: rnd(-0.2, 0.2), vy: rnd(-0.5, -0.2), life: rndInt(60, 140), r: rndInt(1, 2) });
    }
  }

  /* =====================================================
     Comportements
     ===================================================== */
  function towards(e, sp) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(a) * sp; e.y += Math.sin(a) * sp; confine(e);
  }
  function behave(e) {
    switch (e.behavior) {
      case "chaser": towards(e, e.speed); break;
      case "charger": towards(e, e.speed); break;
      case "pack": {
        const allies = enemies.filter((o) => o.behavior === "pack").length;
        towards(e, e.speed * (1 + Math.min(allies, 4) * 0.12));
        break;
      }
      case "zigzag": {
        const a = Math.atan2(player.y - e.y, player.x - e.x) + Math.sin(e.t * 0.2) * 0.9;
        e.x += Math.cos(a) * e.speed; e.y += Math.sin(a) * e.speed; confine(e);
        break;
      }
      case "diver": {
        e.cd = (e.cd || 0) - 1;
        if (e.dash > 0) { e.dash--; e.x += e.ddx; e.y += e.ddy; confine(e); }
        else if (e.cd <= 0) {
          const a = Math.atan2(player.y - e.y, player.x - e.x);
          e.ddx = Math.cos(a) * (e.speed + 2.2); e.ddy = Math.sin(a) * (e.speed + 2.2);
          e.dash = 16; e.cd = 70;
        } else { towards(e, e.speed * 0.4); }
        break;
      }
      case "hopper": {
        e.cd = (e.cd || 0) - 1;
        if (e.hop > 0) { e.hop--; e.x += e.hdx; e.y += e.hdy; confine(e); }
        else if (e.cd <= 0) {
          const a = Math.atan2(player.y - e.y, player.x - e.x);
          e.hdx = Math.cos(a) * (e.speed + 1.5); e.hdy = Math.sin(a) * (e.speed + 1.5);
          e.hop = 12; e.cd = rndInt(24, 44);
        }
        break;
      }
      case "bouncer": {
        if (e.bvx === undefined) { const a = rnd(0, Math.PI * 2); e.bvx = Math.cos(a) * e.speed; e.bvy = Math.sin(a) * e.speed; }
        e.x += e.bvx; e.y += e.bvy;
        if (e.x < RX + e.r || e.x > RX + RW - e.r) { e.bvx *= -1; confine(e); }
        if (e.y < RY + e.r || e.y > RY + RH - e.r) { e.bvy *= -1; confine(e); }
        break;
      }
      case "slither": {
        const a = Math.atan2(player.y - e.y, player.x - e.x) + Math.sin(e.t * 0.35) * 0.6;
        e.x += Math.cos(a) * e.speed; e.y += Math.sin(a) * e.speed; confine(e);
        break;
      }
      case "spitter": {
        const d = Math.sqrt(dist2(e.x, e.y, player.x, player.y));
        const dir = d < 120 ? -0.6 : d > 170 ? 0.5 : 0;
        towards(e, e.speed * dir);
        if (--e.shootT <= 0) { eShootAt(e, 2.4); e.shootT = clamp(110 - floor * 6, 50, 110); }
        break;
      }
      case "flyerShoot": {
        const a = Math.atan2(player.y - e.y, player.x - e.x) + Math.PI / 2;
        e.x += Math.cos(a) * e.speed * 0.6; e.y += Math.sin(a) * e.speed * 0.6; confine(e);
        if (--e.shootT <= 0) { eShootAt(e, 2.6); e.shootT = clamp(100 - floor * 5, 48, 100); }
        break;
      }
      case "lobber": {
        const d = Math.sqrt(dist2(e.x, e.y, player.x, player.y));
        towards(e, d < 130 ? -e.speed * 0.5 : e.speed * 0.3);
        if (--e.shootT <= 0) { eShootAt(e, 1.7, player.x + rnd(-20, 20), player.y + rnd(-20, 20)); e.shootT = clamp(90 - floor * 4, 44, 90); }
        break;
      }
      case "orbiterShoot": {
        const ang = Math.atan2(e.y - player.y, e.x - player.x);
        const tx = player.x + Math.cos(ang + 0.04) * 120;
        const ty = player.y + Math.sin(ang + 0.04) * 120;
        e.x += (tx - e.x) * 0.04; e.y += (ty - e.y) * 0.04; confine(e);
        if (--e.shootT <= 0) { eShootAt(e, 2.5); e.shootT = clamp(80 - floor * 4, 40, 80); }
        break;
      }
      case "splitter": towards(e, e.speed); break;
      default: towards(e, e.speed);
    }
    if (e.boss) updateBoss(e);
  }

  function updateBoss(e) {
    switch (e.pattern) {
      case "summoner": {
        towards(e, e.speed);
        if (--e.shootT <= 0) {
          e.phase++;
          if (e.phase % 2 === 0 && enemies.filter((o) => !o.boss).length < 4) enemies.push(makeEnemy("rat", { x: e.x, y: e.y + 10 }));
          else for (const o of [-0.3, 0, 0.3]) eShootAng(e, 2.4, Math.atan2(player.y - e.y, player.x - e.x) + o);
          e.shootT = clamp(70 - floor * 3, 40, 70);
        }
        break;
      }
      case "charger": {
        if (e.charge > 0) { e.charge--; e.x += e.cdx; e.y += e.cdy; if (e.x < RX + e.r || e.x > RX + RW - e.r || e.y < RY + e.r || e.y > RY + RH - e.r) e.charge = 0; confine(e); }
        else { towards(e, e.speed * 0.6); if (--e.shootT <= 0) { const a = Math.atan2(player.y - e.y, player.x - e.x); e.cdx = Math.cos(a) * 4.6; e.cdy = Math.sin(a) * 4.6; e.charge = 26; e.shootT = clamp(80 - floor * 3, 46, 80); } }
        break;
      }
      case "stomper": {
        if (e.charge > 0) { e.charge--; e.x += e.cdx; e.y += e.cdy; confine(e); }
        else { towards(e, e.speed * 0.5); if (--e.shootT <= 0) { e.phase++; if (e.phase % 2 === 0) { for (let k = 0; k < 12; k++) eShootAng(e, 2.2, (k / 12) * Math.PI * 2); shake = 6; } else { const a = Math.atan2(player.y - e.y, player.x - e.x); e.cdx = Math.cos(a) * 4.2; e.cdy = Math.sin(a) * 4.2; e.charge = 24; } e.shootT = clamp(80 - floor * 3, 46, 80); } }
        break;
      }
      case "splitterBoss": {
        towards(e, e.speed);
        if (--e.shootT <= 0) { for (let k = 0; k < 6; k++) eShootAng(e, 2.0, rnd(0, Math.PI * 2)); if (enemies.filter((o) => o.behavior === "splitter").length < 3) enemies.push(makeEnemy("spore", { x: e.x + rnd(-20, 20), y: e.y + rnd(-10, 10) })); e.shootT = clamp(70 - floor * 3, 42, 70); }
        break;
      }
      case "scientist": {
        // multi-phases : téléport, fioles AoE, salves, invocations
        e.cd = (e.cd || 0) - 1;
        const hpr = e.hp / e.maxHp;
        towards(e, e.speed * 0.5);
        if (--e.shootT <= 0) {
          e.phase++;
          const act = e.phase % (hpr < 0.5 ? 3 : 4);
          if (act === 0) { // fiole AoE
            hazards.push({ x: player.x, y: player.y, r: 26, life: 110, kind: "gas" });
          } else if (act === 1) { // salve circulaire
            const n = hpr < 0.5 ? 12 : 8;
            for (let k = 0; k < n; k++) eShootAng(e, 2.4, (k / n) * Math.PI * 2 + e.phase);
          } else if (act === 2) { // invocation
            if (enemies.filter((o) => !o.boss).length < 4) enemies.push(makeEnemy("mutantRat", { x: e.x, y: e.y + 14 }));
          } else { // téléport
            e.x = rnd(RX + 40, RX + RW - 40); e.y = rnd(RY + 40, RY + 90);
            for (const o of [-0.25, 0.25]) eShootAng(e, 2.6, Math.atan2(player.y - e.y, player.x - e.x) + o);
          }
          e.shootT = clamp((hpr < 0.5 ? 46 : 60) - floor, 34, 60);
        }
        break;
      }
    }
  }

  /* =====================================================
     Dégâts / morts
     ===================================================== */
  function hurtPlayer(d) {
    if (player.iframe > 0) return;
    player.hp -= d; player.iframe = 48; floorDamageTaken = true; shake = 6;
    if (player.hp <= 0) { player.hp = 0; endRun(false); }
  }
  function onEnemyDead(e) {
    shake = Math.max(shake, 3);
    if (e.behavior === "splitter" && !e.split && e.r > 8) {
      for (let k = 0; k < 2; k++) enemies.push(makeEnemy(e.defId, { x: e.x + rnd(-8, 8), y: e.y + rnd(-8, 8), r: e.r * 0.7, hp: e.maxHp * 0.4, maxHp: e.maxHp * 0.4, split: true }));
    }
    if (Math.random() < 0.16) pickups.push({ x: e.x, y: e.y, kind: "heart" });
    if (Math.random() < 0.55) pickups.push({ x: e.x + rnd(-6, 6), y: e.y + rnd(-6, 6), kind: "shard", val: 1 });
  }

  // Boss / mini-boss : dialogue AVANT la mort
  function startDeathDialog(e) {
    e.dying = true; e.vx = e.vy = 0; dyingBoss = e;
    stopLoop();
    const isBoss = !!e.boss;
    const info = isBoss ? BOSS_DEFS[e.bossId] : fdef().mini;
    if (isBoss) unlock("boss1"); else unlock("mini");
    showStory(() => t("speaks").replace("%s", L(info.name)), () => L(info.dialog), "reveal", () => resolveDeath(e));
  }
  function resolveDeath(e) {
    const idx = enemies.indexOf(e);
    if (idx >= 0) enemies.splice(idx, 1);
    dyingBoss = null;
    shake = 5;
    if (e.boss) {
      runShards += 5 + floor * 2;
      cur.cleared = true;
      if (e.final) { hideMenus(); playCinematic("epilogue", () => endRun(true)); return; }
      pickups.push({ x: W / 2, y: RY + RH / 2, kind: "trap" });
      banner = t("cleared"); bannerT = 70;
    } else { // mini-boss
      runShards += 3 + floor;
      clearRoomSilent();
      banner = t("cleared"); bannerT = 70;
    }
    hideMenus();
    mode = "play"; startLoop();
  }

  function clearRoom() {
    cur.cleared = true; unlock("clearRoom");
    runShards += 1 + metaLevel("luck");
    banner = t("cleared"); bannerT = 60;
    if (Math.random() < 0.25) pickups.push({ x: W / 2, y: RY + RH / 2, kind: "heart" });
  }
  function clearRoomSilent() { cur.cleared = true; unlock("clearRoom"); }

  /* =====================================================
     Transitions / descente
     ===================================================== */
  function tryDoorTransition() {
    for (let i = pickups.length - 1; i >= 0; i--) {
      if (pickups[i].kind === "trap" && dist2(pickups[i].x, pickups[i].y, player.x, player.y) < 18 * 18) { descend(); return; }
    }
    const cx = W / 2, cy = RY + RH / 2;
    let d = null;
    if (cur.doors.N && player.y <= RY + player.r + 2 && Math.abs(player.x - cx) < DOOR_HALF) d = "N";
    else if (cur.doors.S && player.y >= RY + RH - player.r - 2 && Math.abs(player.x - cx) < DOOR_HALF) d = "S";
    else if (cur.doors.W && player.x <= RX + player.r + 2 && Math.abs(player.y - cy) < DOOR_HALF) d = "W";
    else if (cur.doors.E && player.x >= RX + RW - player.r - 2 && Math.abs(player.y - cy) < DOOR_HALF) d = "E";
    if (d) {
      const nk = cur.gx + DIRS[d][0] + "," + (cur.gy + DIRS[d][1]);
      if (rooms.has(nk)) { curKey = nk; cur = rooms.get(nk); enterRoom(d); }
    }
  }
  function descend() {
    if (!floorDamageTaken) unlock("flawless");
    stopLoop();
    const next = floor + 1;
    const cineId = CINE_BEFORE_FLOOR[next];
    if (cineId) playCinematic(cineId, () => startFloor(next));
    else startFloor(next);
  }

  // Démarre un chapitre : génère, montre la carte de chapitre + intro, puis joue.
  function startFloor(depth) {
    floorDamageTaken = false;
    genFloor(depth);
    if (depth >= 3) unlock("floor3");
    const f = fdef();
    showStory(() => t("chapter").replace("%s", ROMAN[depth]) + " · " + L(f.chapter), () => L(f.intro), "chapter", () => {
      hideMenus(); mode = "play"; startLoop();
      curFloorId = f.id;
      if (window.Sound) window.Sound.playFloor(f.id); // musique + ambiance du lieu
      banner = L(f.name); bannerT = 80;
    });
  }

  /* =====================================================
     Reliques
     ===================================================== */
  function offerItem(item) {
    pendingItem = item; stopLoop(); mode = "item";
    if (itemName) itemName.textContent = L(item.name);
    if (itemDesc) itemDesc.textContent = L(item.desc);
    showMenu(itemMenu);
  }
  function takeItem() {
    if (!pendingItem) return;
    pendingItem.apply(player); player.items.push(pendingItem.id);
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    if (pedestal) { pedestal.taken = true; cur.looted = true; }
    unlock("item"); pendingItem = null; hideMenus(); mode = "play"; startLoop();
  }

  /* =====================================================
     Fin de partie
     ===================================================== */
  function endRun(win) {
    stopLoop(); mode = "over";
    if (win) unlock("win");
    shards += runShards; save("stewy-moon-shards", shards);
    if (shards >= 40) unlock("rich");
    if (overTitle) overTitle.textContent = win ? t("victory") : t("gameOver");
    if (overTitle) overTitle.classList.toggle("mr-over-title--win", !!win);
    if (overMsg) overMsg.textContent = win ? t("overMsgWin") : t("overMsgDeath").replace("%s", ROMAN[floor]);
    if (overReward) overReward.textContent = t("reward").replace("%s", String(runShards));
    if (retryBtn) retryBtn.textContent = t("retry");
    if (quitBtn) quitBtn.textContent = t("quit");
    if (shopBtn) shopBtn.textContent = t("shop");
    showMenu(overMenu);
  }

  /* =====================================================
     Succès
     ===================================================== */
  function unlock(id) {
    if (achState[id]) return;
    achState[id] = true; save("stewy-moon-ach", achState);
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) { banner = t("newAch").replace("%s", L(a.name)); bannerT = 110; }
    refreshHubMedal();
  }
  function achCount() { return ACHIEVEMENTS.filter((a) => achState[a.id]).length; }
  function allUnlocked() { return achCount() >= ACHIEVEMENTS.length; }

  /* =====================================================
     Histoire (overlay .mr-story)
     ===================================================== */
  let storyRelocalize = null;
  function showStory(kickerFn, textFn, kindCls, onContinue) {
    pendingContinue = onContinue; mode = "story";
    storyRelocalize = function () {
      const kicker = typeof kickerFn === "function" ? kickerFn() : kickerFn;
      const text = typeof textFn === "function" ? textFn() : textFn;
      if (storyKicker) storyKicker.textContent = kindCls === "reveal" ? kicker : "";
      if (storyTitle) storyTitle.textContent = kindCls === "reveal" ? "" : kicker;
      if (storyText) storyText.textContent = text;
      if (storyContinue) storyContinue.textContent = t("continue");
    };
    storyRelocalize();
    if (storyMenu) {
      storyMenu.classList.toggle("mr-story--reveal", kindCls === "reveal");
      storyMenu.classList.toggle("mr-story--chapter", kindCls === "chapter");
    }
    showMenu(storyMenu);
  }
  function continueStory() {
    const cb = pendingContinue; pendingContinue = null;
    if (cb) cb();
  }

  /* =====================================================
     Cinématiques
     ===================================================== */
  function playCinematic(id, onDone) {
    const c = CINEMATICS[id];
    if (!c) { onDone(); return; }
    hideMenus(); mode = "cinematic";
    cine = { scenes: c.scenes, idx: 0, tt: 0, onDone };
    if (cineSkip) { cineSkip.hidden = false; cineSkip.textContent = t("skip"); }
    startLoop();
  }
  function updateCine(dt) {
    if (!cine) return;
    cine.tt += dt;
    if (cine.tt >= cine.scenes[cine.idx].dur) advanceCine();
  }
  function advanceCine() {
    if (!cine) return;
    cine.idx++; cine.tt = 0;
    if (cine.idx >= cine.scenes.length) endCine();
  }
  function endCine() {
    if (!cine) return;
    const cb = cine.onDone; cine = null;
    if (cineSkip) cineSkip.hidden = true;
    stopLoop();
    cb();
  }

  /* =====================================================
     Rendu
     ===================================================== */
  function draw() {
    ctx.save();
    if (shake > 0.3) ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
    ctx.fillStyle = "#07070d"; ctx.fillRect(0, 0, W, H);
    drawRoom();
    drawParticles();
    drawPickups();
    drawHazards();
    enemies.forEach((e) => (e.boss ? drawBoss(e) : drawCritter(e)));
    drawProjectiles();
    drawPlayer();
    drawMiasma();
    ctx.restore();
    drawHUD();
    if (bannerT > 0) drawBanner();
  }

  function drawRoom() {
    const p = fdef().pal;
    ctx.fillStyle = cur.type === "boss" ? shade(p.floor, -0.15) : cur.type === "treasure" ? shade(p.floor, 0.12) : p.floor;
    ctx.fillRect(RX, RY, RW, RH);
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (let x = RX; x <= RX + RW; x += 32) { ctx.beginPath(); ctx.moveTo(x, RY); ctx.lineTo(x, RY + RH); ctx.stroke(); }
    for (let y = RY; y <= RY + RH; y += 32) { ctx.beginPath(); ctx.moveTo(RX, y); ctx.lineTo(RX + RW, y); ctx.stroke(); }
    drawDecor();
    // murs
    ctx.fillStyle = p.wall;
    ctx.fillRect(RX - WALL, RY - WALL, RW + WALL * 2, WALL);
    ctx.fillRect(RX - WALL, RY + RH, RW + WALL * 2, WALL);
    ctx.fillRect(RX - WALL, RY - WALL, WALL, RH + WALL * 2);
    ctx.fillRect(RX + RW, RY - WALL, WALL, RH + WALL * 2);
    if (p.blood) drawBlood();
    // portes
    const cx = W / 2, cy = RY + RH / 2, open = roomOpen();
    ctx.fillStyle = open ? p.door : "#b3322a";
    Object.keys(cur.doors).forEach((d) => {
      if (!cur.doors[d]) return;
      if (d === "N") ctx.fillRect(cx - DOOR_HALF, RY - WALL, DOOR_HALF * 2, WALL);
      else if (d === "S") ctx.fillRect(cx - DOOR_HALF, RY + RH, DOOR_HALF * 2, WALL);
      else if (d === "W") ctx.fillRect(RX - WALL, cy - DOOR_HALF, WALL, DOOR_HALF * 2);
      else ctx.fillRect(RX + RW, cy - DOOR_HALF, WALL, DOOR_HALF * 2);
    });
    if (pedestal && !pedestal.taken) {
      ctx.fillStyle = "#3a3550"; ctx.fillRect(pedestal.x - 8, pedestal.y - 2, 16, 10);
      ctx.fillStyle = "#ffe08a"; ctx.beginPath(); ctx.arc(pedestal.x, pedestal.y - 8, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawMiasma() {
    const p = fdef().pal;
    ctx.fillStyle = p.tint;
    ctx.fillRect(RX, RY, RW, RH);
  }
  function drawParticles() {
    ctx.fillStyle = "rgba(140,220,140,0.35)";
    particles.forEach((pp) => ctx.fillRect(pp.x, pp.y, pp.r, pp.r));
  }
  function drawBlood() {
    const rng = srand(99 + cur.gx * 7 + cur.gy * 13);
    ctx.fillStyle = "rgba(120,20,16,0.55)";
    for (let i = 0; i < 5; i++) {
      const x = RX + rng() * RW, y = RY + rng() * 12, w = 4 + rng() * 8;
      ctx.fillRect(x, RY - 2, w, 6 + rng() * 16);
    }
    // rats morts au sol
    ctx.fillStyle = "#3a2a2a";
    for (let i = 0; i < 3; i++) {
      const x = RX + 20 + rng() * (RW - 40), y = RY + 20 + rng() * (RH - 40);
      ctx.fillRect(x, y, 9, 5); ctx.fillRect(x + 8, y + 1, 5, 2);
    }
  }

  // --- Décors par thème (props déterministes) ---
  function drawDecor() {
    const id = fdef().decor;
    const rng = srand((cur.gx + 5) * 73856 ^ (cur.gy + 5) * 19349 ^ floor * 83492);
    const props = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < props; i++) {
      const x = RX + 14 + rng() * (RW - 28), y = RY + 14 + rng() * (RH - 28);
      decorProp(id, x, y, rng);
    }
  }
  function decorProp(id, x, y, rng) {
    x = Math.round(x); y = Math.round(y);
    if (id === "sewers") {
      ctx.fillStyle = "rgba(40,90,60,0.5)"; ctx.fillRect(x, y, 12, 6); // flaque
      if (rng() < 0.4) { ctx.fillStyle = "#3a4a40"; ctx.fillRect(x, y - 8, 4, 10); } // tuyau
    } else if (id === "city") {
      ctx.fillStyle = "#2a2a30"; ctx.fillRect(x, y, 10, 10); // plaque/poubelle
      ctx.fillStyle = "#1a1a1f"; ctx.fillRect(x + 1, y + 1, 8, 2);
    } else if (id === "zoo") {
      ctx.fillStyle = "#5a5040"; for (let b = 0; b < 4; b++) ctx.fillRect(x + b * 4, y, 2, 16); // barreaux
    } else if (id === "farm") {
      ctx.fillStyle = "#7c5a2a"; ctx.fillRect(x, y, 14, 9); ctx.fillStyle = "#9c7a3a"; ctx.fillRect(x, y, 14, 2); // botte de foin
    } else if (id === "hospital") {
      ctx.fillStyle = "#3a4a52"; ctx.fillRect(x, y, 14, 5); ctx.fillStyle = "#5a7a80"; ctx.fillRect(x + 1, y - 6, 2, 6); // brancard/perf
    } else if (id === "lab") {
      ctx.fillStyle = "rgba(60,200,120,0.25)"; ctx.fillRect(x, y - 10, 7, 14); ctx.fillStyle = "#22303a"; ctx.fillRect(x - 1, y + 3, 9, 3); // cuve
    }
  }

  function drawPickups() {
    pickups.forEach((pk) => {
      if (pk.kind === "heart") {
        ctx.fillStyle = "#e0466b";
        ctx.fillRect(pk.x - 5, pk.y - 4, 4, 4); ctx.fillRect(pk.x + 1, pk.y - 4, 4, 4);
        ctx.fillRect(pk.x - 5, pk.y - 1, 10, 4); ctx.fillRect(pk.x - 3, pk.y + 3, 6, 3);
      } else if (pk.kind === "shard") { ctx.fillStyle = "#9fe0ff"; ctx.fillRect(pk.x - 3, pk.y - 3, 6, 6); }
      else if (pk.kind === "trap") {
        ctx.fillStyle = "#000"; ctx.fillRect(pk.x - 12, pk.y - 9, 24, 18);
        ctx.fillStyle = "#5a3fa0"; ctx.fillRect(pk.x - 10, pk.y - 7, 20, 14);
        ctx.fillStyle = "#0c0c16"; ctx.fillRect(pk.x - 7, pk.y - 4, 14, 8);
      }
    });
  }
  function drawHazards() {
    hazards.forEach((hz) => {
      const a = clamp(hz.life / 60, 0, 1);
      ctx.fillStyle = "rgba(110,210,120," + (0.25 * a + 0.1) + ")";
      ctx.beginPath(); ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2); ctx.fill();
    });
  }
  function drawProjectiles() {
    projectiles.forEach((pr) => {
      ctx.fillStyle = pr.from === "p" ? "#bfe9ff" : "#9be84a";
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  // --- helpers de dessin pixel ---
  function px(x, y, w, h, c) { if (c) ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function tri(ax, ay, bx, by, cx, cy, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); }
  // œil « infecté » (vert luminescent avec pupille)
  function gEye(x, y, s) { px(x, y, s, s, "#aef752"); px(x + s * 0.42, y + s * 0.2, Math.max(1, s * 0.42), Math.max(1, s * 0.5), "#0c2a0a"); }

  /* --- Sprites animaux (silhouettes pixel distinctes, face au joueur) --- */
  function drawCritter(e) {
    const flash = e.hit > 0, R = e.r;
    const bc = (c) => (flash ? "#fff" : c);
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    const noflip = e.draw === "bat" || e.draw === "drone" || e.draw === "spore" || e.draw === "slime";
    if (!noflip && player && player.x < e.x) ctx.scale(-1, 1);
    switch (e.draw) {
      case "rat": case "cityRat": case "mutantRat": {
        const base = e.draw === "cityRat" ? "#62626c" : e.draw === "mutantRat" ? "#7c9a4a" : "#9598a0";
        const sh = e.draw === "cityRat" ? "#46464e" : e.draw === "mutantRat" ? "#5c7a30" : "#70737c";
        ctx.strokeStyle = e.draw === "mutantRat" ? "#5c7a30" : "#caa089"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-R * 1.1, R * 0.2); ctx.quadraticCurveTo(-R * 1.9, -R * 0.2, -R * 1.4, -R * 0.9); ctx.stroke();
        px(-R * 0.6, R * 0.5, R * 0.35, R * 0.5, sh);
        px(-R * 1.1, -R * 0.45, R * 1.8, R * 1.0, bc(base));
        px(-R * 1.0, -R * 0.65, R * 1.2, R * 0.5, bc(base));
        px(R * 0.25, R * 0.45, R * 0.3, R * 0.5, sh);
        px(R * 0.3, -R * 0.55, R * 0.85, R * 0.95, bc(base));
        px(R * 1.0, -R * 0.05, R * 0.6, R * 0.45, bc(base)); px(R * 1.5, R * 0.05, R * 0.2, R * 0.25, "#15151a");
        px(R * 0.45, -R * 1.05, R * 0.5, R * 0.5, bc(base)); px(R * 0.55, -R * 0.92, R * 0.3, R * 0.3, "#c98a9a");
        gEye(R * 0.62, -R * 0.18, Math.max(2, R * 0.3));
        if (e.draw === "mutantRat") { px(R * 0.95, -R * 0.35, R * 0.22, R * 0.22, "#d6ff8a"); px(-R * 0.3, -R * 0.75, R * 0.2, R * 0.2, "#d6ff8a"); }
        break;
      }
      case "ratSick": case "syringeRat": {
        const base = bc("#9a9a6a"), sh = "#76764e";
        ctx.strokeStyle = "#caa089"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-R * 1.0, R * 0.2); ctx.quadraticCurveTo(-R * 1.7, -R * 0.2, -R * 1.3, -R * 0.8); ctx.stroke();
        px(-R * 0.6, R * 0.5, R * 0.3, R * 0.5, sh);
        px(-R * 1.0, -R * 0.4, R * 1.7, R * 0.95, base);
        px(R * 0.3, -R * 0.5, R * 0.8, R * 0.85, base);
        px(R * 0.95, -R * 0.05, R * 0.55, R * 0.4, base); px(R * 1.45, R * 0.05, R * 0.2, R * 0.22, "#15151a");
        px(R * 0.45, -R * 0.95, R * 0.45, R * 0.45, base);
        ctx.fillStyle = "#7aff5a"; px(-R * 0.4, -R * 0.05, 3, 3); px(0, R * 0.15, 3, 3); px(-R * 0.75, R * 0.2, 3, 3);
        gEye(R * 0.6, -R * 0.15, Math.max(2, R * 0.28));
        if (e.draw === "syringeRat") { ctx.strokeStyle = "#cfe8ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(R * 0.2, -R * 0.6); ctx.lineTo(R * 0.7, -R * 1.3); ctx.stroke(); px(R * 0.62, -R * 1.5, R * 0.28, R * 0.32, "#cfe8ff"); px(R * 0.7, -R * 1.62, 3, 4, "#9ec8e8"); }
        break;
      }
      case "bat": {
        const base = bc("#3a2a48"), wing = bc("#2a1e36");
        const wf = Math.sin(e.t * 0.3) * R * 0.4;
        tri(0, 0, -R * 1.7, -R * 0.6 - wf, -R * 1.2, R * 0.5, wing); tri(0, 0, R * 1.7, -R * 0.6 - wf, R * 1.2, R * 0.5, wing);
        tri(-R * 1.2, R * 0.5, -R * 0.7, R * 0.2, -R * 0.6, R * 0.6, wing); tri(R * 1.2, R * 0.5, R * 0.7, R * 0.2, R * 0.6, R * 0.6, wing);
        px(-R * 0.4, -R * 0.45, R * 0.8, R * 0.95, base);
        tri(-R * 0.4, -R * 0.45, -R * 0.5, -R * 0.95, -R * 0.1, -R * 0.45, base); tri(R * 0.4, -R * 0.45, R * 0.5, -R * 0.95, R * 0.1, -R * 0.45, base);
        ctx.fillStyle = "#aef752"; px(-R * 0.28, -R * 0.2, R * 0.2, R * 0.2); px(R * 0.08, -R * 0.2, R * 0.2, R * 0.2);
        px(-R * 0.18, R * 0.2, R * 0.08, R * 0.18, "#fff"); px(R * 0.1, R * 0.2, R * 0.08, R * 0.18, "#fff");
        break;
      }
      case "pigeon": {
        const base = bc("#8a93a0"), sh = bc("#6a7280");
        px(-R * 0.4, R * 0.5, R * 0.16, R * 0.4, "#d8a23a"); px(R * 0.1, R * 0.5, R * 0.16, R * 0.4, "#d8a23a");
        px(-R * 1.2, -R * 0.1, R * 0.6, R * 0.5, sh);
        px(-R * 0.8, -R * 0.5, R * 1.4, R * 0.95, base);
        px(-R * 0.2, -R * 0.3, R * 0.8, R * 0.65, sh);
        px(R * 0.5, -R * 0.95, R * 0.7, R * 0.7, base);
        px(R * 1.15, -R * 0.6, R * 0.35, R * 0.22, "#d8a23a");
        gEye(R * 0.72, -R * 0.62, Math.max(2, R * 0.24));
        break;
      }
      case "cat": {
        const base = bc("#5a5560"), sh = bc("#403c47");
        ctx.strokeStyle = base; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-R * 0.85, 0); ctx.quadraticCurveTo(-R * 1.5, -R * 0.8, -R * 0.9, -R * 1.2); ctx.stroke();
        px(-R * 0.55, R * 0.4, R * 0.28, R * 0.55, sh); px(R * 0.3, R * 0.4, R * 0.28, R * 0.55, sh);
        px(-R * 0.9, -R * 0.2, R * 1.4, R * 0.75, base);
        px(R * 0.4, -R * 0.85, R * 0.8, R * 0.9, base);
        tri(R * 0.4, -R * 0.85, R * 0.5, -R * 1.35, R * 0.72, -R * 0.85, base); tri(R * 0.88, -R * 0.85, R * 1.0, -R * 1.35, R * 1.2, -R * 0.85, base);
        gEye(R * 0.65, -R * 0.45, Math.max(2, R * 0.28)); px(R * 1.15, -R * 0.18, R * 0.16, R * 0.13, "#caa");
        break;
      }
      case "dog": {
        const base = bc("#7a5638"), sh = bc("#573d27");
        ctx.strokeStyle = base; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-R * 0.9, -R * 0.1); ctx.quadraticCurveTo(-R * 1.4, -R * 0.7, -R * 1.0, -R * 1.05); ctx.stroke();
        px(-R * 0.55, R * 0.45, R * 0.32, R * 0.6, sh); px(R * 0.35, R * 0.45, R * 0.32, R * 0.6, sh);
        px(-R * 0.9, -R * 0.3, R * 1.5, R * 0.95, base);
        px(R * 0.4, -R * 0.7, R * 0.9, R * 1.0, base);
        px(R * 0.35, -R * 0.6, R * 0.3, R * 0.85, sh);
        px(R * 1.2, -R * 0.05, R * 0.5, R * 0.5, "#8a6648"); px(R * 1.55, R * 0.05, R * 0.18, R * 0.18, "#15151a");
        gEye(R * 0.72, -R * 0.35, Math.max(2, R * 0.28));
        break;
      }
      case "monkey": {
        const base = bc("#6a4a32"), face = bc("#caa178");
        ctx.strokeStyle = base; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-R * 0.7, R * 0.2); ctx.quadraticCurveTo(-R * 1.5, R * 0.4, -R * 1.2, -R * 0.5); ctx.stroke();
        px(-R * 0.6, -R * 0.25, R * 1.1, R * 0.95, base);
        px(-R * 0.85, -R * 0.2, R * 0.3, R * 0.9, base); px(R * 0.55, -R * 0.2, R * 0.3, R * 0.9, base);
        px(R * 0.0, -R * 1.0, R * 0.9, R * 0.9, base);
        px(-R * 0.15, -R * 0.9, R * 0.3, R * 0.32, base); px(R * 0.85, -R * 0.9, R * 0.3, R * 0.32, base);
        px(R * 0.15, -R * 0.72, R * 0.6, R * 0.5, face);
        gEye(R * 0.32, -R * 0.62, Math.max(2, R * 0.24));
        break;
      }
      case "vulture": {
        const base = bc("#2e2a30"), sh = bc("#1c1a20");
        px(-R * 0.3, R * 0.5, R * 0.16, R * 0.38, "#d8a23a"); px(R * 0.15, R * 0.5, R * 0.16, R * 0.38, "#d8a23a");
        px(-R * 0.9, -R * 0.25, R * 1.4, R * 1.05, base);
        px(-R * 0.2, -R * 0.45, R * 0.8, R * 0.95, sh);
        px(R * 0.45, -R * 0.95, R * 0.32, R * 0.75, "#c2a0a0"); px(R * 0.42, -R * 1.35, R * 0.55, R * 0.5, "#c2a0a0");
        tri(R * 0.95, -R * 1.2, R * 1.4, -R * 1.05, R * 0.95, -R * 0.92, "#d8a23a");
        gEye(R * 0.6, -R * 1.18, Math.max(2, R * 0.22));
        break;
      }
      case "lion": {
        const base = bc("#caa15a"), mane = bc("#7a5226"), sh = bc("#a07f40");
        px(-R * 0.55, R * 0.45, R * 0.3, R * 0.6, sh); px(R * 0.35, R * 0.45, R * 0.3, R * 0.6, sh);
        ctx.strokeStyle = mane; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-R * 0.9, 0); ctx.lineTo(-R * 1.35, R * 0.4); ctx.stroke(); px(-R * 1.45, R * 0.3, R * 0.3, R * 0.3, mane);
        px(-R * 0.9, -R * 0.3, R * 1.35, R * 0.95, base);
        for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; tri(R * 0.7 + Math.cos(a) * R * 0.55, -R * 0.25 + Math.sin(a) * R * 0.55, R * 0.7 + Math.cos(a) * R * 1.05, -R * 0.25 + Math.sin(a) * R * 1.05, R * 0.7 + Math.cos(a + 0.55) * R * 0.55, -R * 0.25 + Math.sin(a + 0.55) * R * 0.55, mane); }
        px(R * 0.35, -R * 0.6, R * 0.75, R * 0.8, base);
        px(R * 0.95, -R * 0.1, R * 0.35, R * 0.3, "#e6cb90");
        gEye(R * 0.6, -R * 0.35, Math.max(2, R * 0.26));
        break;
      }
      case "giraffe": {
        const base = bc("#d9b35a"), spot = bc("#9a6a2a");
        px(-R * 0.5, R * 0.4, R * 0.22, R * 1.0, base); px(R * 0.2, R * 0.4, R * 0.22, R * 1.0, base);
        px(-R * 0.7, -R * 0.2, R * 1.3, R * 0.75, base);
        px(-R * 0.4, -R * 0.1, R * 0.22, R * 0.22, spot); px(R * 0.1, R * 0.2, R * 0.22, R * 0.22, spot);
        px(R * 0.45, -R * 1.7, R * 0.4, R * 1.55, base);
        px(R * 0.5, -R * 1.25, R * 0.2, R * 0.2, spot); px(R * 0.5, -R * 0.7, R * 0.2, R * 0.2, spot);
        px(R * 0.4, -R * 2.05, R * 0.75, R * 0.5, base); px(R * 1.05, -R * 1.85, R * 0.3, R * 0.22, base);
        px(R * 0.5, -R * 2.3, R * 0.1, R * 0.28, spot); px(R * 0.9, -R * 2.3, R * 0.1, R * 0.28, spot);
        gEye(R * 0.68, -R * 1.95, Math.max(2, R * 0.22));
        break;
      }
      case "chicken": {
        const base = bc("#ece8dc"), sh = bc("#d2ccbd");
        px(-R * 0.25, R * 0.5, R * 0.15, R * 0.4, "#d8a23a"); px(R * 0.15, R * 0.5, R * 0.15, R * 0.4, "#d8a23a");
        px(-R * 0.95, -R * 0.25, R * 0.75, R * 0.75, sh);
        px(-R * 0.6, -R * 0.5, R * 1.2, R * 0.95, base);
        px(R * 0.3, -R * 1.05, R * 0.7, R * 0.7, base);
        px(R * 0.4, -R * 1.35, R * 0.4, R * 0.32, "#d83a2a");
        tri(R * 1.0, -R * 0.75, R * 1.45, -R * 0.6, R * 1.0, -R * 0.45, "#d8a23a");
        px(R * 0.72, -R * 0.5, R * 0.16, R * 0.3, "#d83a2a");
        gEye(R * 0.58, -R * 0.82, Math.max(2, R * 0.22));
        break;
      }
      case "pig": {
        const base = bc("#dd8ea2"), sh = bc("#c06a82");
        px(-R * 0.6, R * 0.45, R * 0.3, R * 0.5, sh); px(R * 0.3, R * 0.45, R * 0.3, R * 0.5, sh);
        ctx.strokeStyle = sh; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-R * 0.95, -R * 0.2, R * 0.25, 0, Math.PI * 1.6); ctx.stroke();
        px(-R * 0.9, -R * 0.4, R * 1.5, R * 0.95, base);
        px(R * 0.5, -R * 0.6, R * 0.85, R * 0.95, base);
        tri(R * 0.5, -R * 0.6, R * 0.6, -R * 1.05, R * 0.85, -R * 0.55, base); tri(R * 1.05, -R * 0.6, R * 1.15, -R * 1.05, R * 1.35, -R * 0.55, base);
        px(R * 1.15, -R * 0.1, R * 0.42, R * 0.42, sh); px(R * 1.25, 0, R * 0.1, R * 0.13, "#7a3a4a"); px(R * 1.42, 0, R * 0.1, R * 0.13, "#7a3a4a");
        gEye(R * 0.72, -R * 0.35, Math.max(2, R * 0.24));
        break;
      }
      case "sheep": {
        const wool = bc("#eceaee"), face = bc("#3a3640");
        px(-R * 0.5, R * 0.45, R * 0.2, R * 0.5, face); px(R * 0.2, R * 0.45, R * 0.2, R * 0.5, face);
        for (const p of [[-0.7, -0.25], [-0.3, -0.55], [0.15, -0.35], [-0.45, 0.1], [0.05, 0.1], [-0.75, 0.2]]) px(p[0] * R, p[1] * R, R * 0.75, R * 0.75, wool);
        px(R * 0.45, -R * 0.5, R * 0.7, R * 0.8, face);
        px(R * 0.4, -R * 0.65, R * 0.25, R * 0.28, face);
        gEye(R * 0.7, -R * 0.25, Math.max(2, R * 0.22));
        break;
      }
      case "goose": {
        const base = bc("#f0eee8"), sh = bc("#d8d4ca");
        px(-R * 0.3, R * 0.5, R * 0.16, R * 0.35, "#e08a2a"); px(R * 0.1, R * 0.5, R * 0.16, R * 0.35, "#e08a2a");
        px(-R * 0.9, -R * 0.1, R * 0.5, R * 0.5, sh);
        px(-R * 0.85, -R * 0.35, R * 1.25, R * 0.9, base);
        px(R * 0.3, -R * 1.45, R * 0.32, R * 1.2, base); px(R * 0.3, -R * 1.45, R * 0.6, R * 0.3, base);
        px(R * 0.8, -R * 1.55, R * 0.5, R * 0.42, base);
        tri(R * 1.3, -R * 1.45, R * 1.75, -R * 1.35, R * 1.3, -R * 1.2, "#e08a2a");
        gEye(R * 1.0, -R * 1.45, Math.max(2, R * 0.2));
        break;
      }
      case "pet": {
        const base = bc("#b88a5a"), sh = bc("#8a6440");
        px(-R * 0.5, R * 0.4, R * 0.3, R * 0.55, sh); px(R * 0.25, R * 0.4, R * 0.3, R * 0.55, sh);
        px(-R * 0.85, -R * 0.3, R * 1.35, R * 0.95, base);
        px(R * 0.4, -R * 0.8, R * 0.8, R * 0.9, base);
        tri(R * 0.4, -R * 0.8, R * 0.5, -R * 1.2, R * 0.72, -R * 0.8, base);
        px(R * 0.32, -R * 0.55, R * 0.9, R * 0.22, "#eee"); px(R * 0.72, -R * 0.62, R * 0.13, R * 0.34, "#d83a2a"); px(R * 0.62, -R * 0.52, R * 0.32, R * 0.13, "#d83a2a");
        gEye(R * 0.7, -R * 0.25, Math.max(2, R * 0.24));
        break;
      }
      case "spore": {
        const base = bc("#7aa84a"), cap = bc("#5a7a2a");
        px(-R * 0.6, R * 0.1, R * 1.2, R * 0.85, base);
        px(-R * 0.9, -R * 0.45, R * 1.8, R * 0.6, cap);
        px(-R * 0.55, -R * 0.55, R * 0.3, R * 0.2, "#bfe88a"); px(R * 0.3, -R * 0.5, R * 0.25, R * 0.18, "#bfe88a");
        px(-R * 0.45, R * 0.75, R * 0.25, R * 0.3, cap); px(R * 0.2, R * 0.75, R * 0.25, R * 0.3, cap);
        gEye(-R * 0.12, R * 0.25, Math.max(2, R * 0.28));
        break;
      }
      case "slime": {
        const base = flash ? "#fff" : "rgba(120,210,130,0.92)";
        px(-R * 0.7, -R * 0.1, R * 1.4, R * 0.9, base);
        px(-R * 0.5, -R * 0.5, R * 1.0, R * 0.5, base);
        px(-R * 0.5, R * 0.8, R * 0.25, R * 0.4, base); px(R * 0.25, R * 0.8, R * 0.2, R * 0.3, base);
        px(-R * 0.4, -R * 0.4, R * 0.25, R * 0.18, "rgba(220,255,220,0.85)");
        gEye(-R * 0.05, R * 0.05, Math.max(2, R * 0.28));
        break;
      }
      case "drone": {
        const base = bc("#5a6470"), dark = bc("#3a4450");
        const sp = 0.25 + Math.abs(Math.cos(e.t * 0.4)) * 0.75; px(-R * sp, -R * 1.0, R * 2 * sp, R * 0.16, "#aab2c0");
        px(0, -R * 1.0, R * 0.1, R * 0.3, dark);
        px(-R * 0.75, -R * 0.6, R * 1.5, R * 1.15, base);
        px(-R * 0.75, -R * 0.6, R * 0.22, R * 1.15, dark); px(R * 0.53, -R * 0.6, R * 0.22, R * 1.15, dark);
        px(-R * 1.05, -R * 0.1, R * 0.3, R * 0.2, dark); px(R * 0.75, -R * 0.1, R * 0.3, R * 0.2, dark);
        px(-R * 0.28, -R * 0.22, R * 0.56, R * 0.44, "#ff4a4a"); px(-R * 0.12, -R * 0.1, R * 0.24, R * 0.2, "#ffd0d0");
        break;
      }
      default: { px(-R, -R, R * 2, R * 2, bc("#8a6a4a")); gEye(0, -R * 0.2, R * 0.3); }
    }
    ctx.restore();
  }

  /* --- Sprites de boss (silhouettes amples et distinctes) --- */
  function drawBoss(e) {
    const flash = e.hit > 0, R = e.r;
    const bc = (c) => (flash ? "#fff" : c);
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    const noflip = e.draw === "patientZero" || e.draw === "scientist";
    if (!noflip && player && player.x < e.x) ctx.scale(-1, 1);
    switch (e.draw) {
      case "ratKing": {
        const base = bc("#9a9aa0"), sh = bc("#6f6f78");
        ctx.strokeStyle = "#caa089"; ctx.lineWidth = 3;
        for (const o of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(-R * 1.0, R * 0.2); ctx.quadraticCurveTo(-R * 1.9, o * R, -R * 1.5, o * R - R * 0.6); ctx.stroke(); }
        px(-R * 0.7, R * 0.5, R * 0.5, R * 0.6, sh);
        px(-R * 1.1, -R * 0.5, R * 1.8, R * 1.1, base);
        px(R * 0.3, R * 0.5, R * 0.4, R * 0.6, sh);
        px(R * 0.4, -R * 0.6, R * 0.9, R * 1.0, base);
        px(R * 1.2, -R * 0.15, R * 0.6, R * 0.5, base); px(R * 1.75, -R * 0.05, R * 0.22, R * 0.3, "#15151a");
        px(R * 0.5, -R * 1.05, R * 0.55, R * 0.55, base); px(R * 0.6, -R * 0.92, R * 0.34, R * 0.34, "#c98a9a");
        px(R * 0.42, -R * 1.5, R * 0.85, R * 0.35, "#ffd24a");
        tri(R * 0.45, -R * 1.5, R * 0.55, -R * 1.95, R * 0.68, -R * 1.5, "#ffd24a"); tri(R * 0.78, -R * 1.5, R * 0.88, -R * 2.05, R * 1.0, -R * 1.5, "#ffd24a"); tri(R * 1.05, -R * 1.5, R * 1.15, -R * 1.95, R * 1.28, -R * 1.5, "#ffd24a");
        gEye(R * 0.78, -R * 0.28, R * 0.32);
        break;
      }
      case "molosse": {
        const base = bc("#6a4a30"), sh = bc("#48311f");
        px(-R * 0.8, R * 0.4, R * 0.42, R * 0.65, sh); px(R * 0.45, R * 0.4, R * 0.42, R * 0.65, sh);
        px(-R * 1.0, -R * 0.5, R * 1.5, R * 1.05, base);
        px(-R * 1.0, -R * 0.7, R * 0.7, R * 0.6, base);
        px(R * 0.35, -R * 0.95, R * 1.0, R * 1.35, base);
        px(R * 0.3, -R * 1.05, R * 0.35, R * 0.4, sh);
        px(R * 1.2, -R * 0.1, R * 0.55, R * 0.6, "#8a6648"); px(R * 1.25, -R * 0.05, R * 0.18, R * 0.18, "#15151a");
        px(R * 1.2, R * 0.4, R * 0.55, R * 0.16, "#dffaff");
        tri(R * 1.25, R * 0.0, R * 1.4, -R * 0.3, R * 1.5, R * 0.0, "#fff"); tri(R * 1.45, R * 0.0, R * 1.55, -R * 0.25, R * 1.6, R * 0.0, "#fff");
        px(-R * 0.15, -R * 0.05, R * 0.55, R * 0.5, "#3a2a1a"); tri(0, -R * 0.05, R * 0.1, -R * 0.3, R * 0.22, -R * 0.05, "#bbb"); tri(R * 0.2, -R * 0.05, R * 0.3, -R * 0.3, R * 0.42, -R * 0.05, "#bbb");
        gEye(R * 0.8, -R * 0.45, R * 0.3);
        break;
      }
      case "elephant": {
        const base = bc("#8a8f98"), sh = bc("#70757e");
        px(-R * 0.7, R * 0.5, R * 0.45, R * 0.7, sh); px(R * 0.2, R * 0.5, R * 0.45, R * 0.7, sh);
        px(-R * 0.95, -R * 0.5, R * 1.5, R * 1.1, base);
        px(R * 0.25, -R * 0.85, R * 0.95, R * 1.25, base);
        px(R * 0.05, -R * 0.75, R * 0.55, R * 1.15, sh);
        px(R * 1.0, -R * 0.2, R * 0.38, R * 1.35, base); px(R * 1.0, R * 1.05, R * 0.4, R * 0.22, base);
        px(R * 0.95, R * 0.45, R * 0.42, R * 0.16, "#f0ead8");
        gEye(R * 0.72, -R * 0.4, R * 0.34);
        break;
      }
      case "bull": {
        const base = bc("#5a3a26"), sh = bc("#3f2818");
        px(-R * 0.7, R * 0.45, R * 0.4, R * 0.6, sh); px(R * 0.45, R * 0.45, R * 0.4, R * 0.6, sh);
        px(-R * 0.95, -R * 0.4, R * 1.5, R * 1.0, base);
        px(-R * 1.05, -R * 0.65, R * 0.7, R * 0.6, base);
        px(R * 0.4, -R * 0.6, R * 0.95, R * 1.0, base);
        tri(R * 0.4, -R * 0.55, R * 0.0, -R * 1.15, R * 0.6, -R * 0.45, "#e8e0d0"); tri(R * 1.25, -R * 0.55, R * 1.7, -R * 1.15, R * 1.05, -R * 0.45, "#e8e0d0");
        px(R * 1.15, -R * 0.1, R * 0.45, R * 0.5, "#d98a6a"); px(R * 1.2, R * 0.1, R * 0.1, R * 0.12, "#15151a"); px(R * 1.4, R * 0.1, R * 0.1, R * 0.12, "#15151a");
        ctx.strokeStyle = "#caa"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(R * 1.35, R * 0.42, R * 0.14, 0, Math.PI * 2); ctx.stroke();
        gEye(R * 0.7, -R * 0.35, R * 0.3);
        break;
      }
      case "patientZero": {
        const base = bc("#7aa84a");
        px(-R * 0.9, -R * 0.6, R * 1.7, R * 1.3, base);
        px(-R * 0.6, -R * 0.95, R * 0.9, R * 0.6, base);
        px(R * 0.2, -R * 0.4, R * 0.9, R * 1.0, base);
        px(-R * 1.0, 0, R * 0.7, R * 0.7, base);
        ctx.strokeStyle = bc("#4f6e26"); ctx.lineWidth = 3; for (const o of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(o * R, R * 0.6); ctx.lineTo(o * R + Math.sin(e.t * 0.05 + o) * 6, R * 1.35); ctx.stroke(); }
        ctx.fillStyle = bc("#5a7a2a"); for (let k = 0; k < 5; k++) { const a = k * 1.7 + e.t * 0.02; px(Math.cos(a) * R * 0.7 - 2, Math.sin(a) * R * 0.55 - 2, 4, 4); }
        for (const p of [[-0.5, -0.4], [0.3, -0.6], [0.0, 0.1], [0.6, -0.1], [-0.25, 0.45]]) gEye(p[0] * R, p[1] * R, R * 0.18);
        break;
      }
      case "scientist": {
        const coat = bc("#e6ecec"), sh = bc("#cdd5d5");
        px(-R * 0.5, R * 0.9, R * 0.4, R * 0.75, "#2a3338"); px(R * 0.1, R * 0.9, R * 0.4, R * 0.75, "#2a3338");
        px(-R * 0.7, -R * 0.2, R * 1.4, R * 1.3, coat);
        px(-R * 0.7, -R * 0.2, R * 0.22, R * 1.3, sh);
        px(-R * 1.0, -R * 0.1, R * 0.36, R * 0.95, coat); px(R * 0.64, -R * 0.1, R * 0.36, R * 0.95, coat);
        px(-R * 1.0, R * 0.7, R * 0.36, R * 0.3, "#3a8f6a"); px(R * 0.64, R * 0.7, R * 0.36, R * 0.3, "#3a8f6a");
        px(-R * 0.55, -R * 1.25, R * 1.1, R * 1.05, "#cfe0d8");
        px(-R * 0.42, -R * 1.05, R * 0.36, R * 0.36, "#16292a"); px(R * 0.06, -R * 1.05, R * 0.36, R * 0.36, "#16292a");
        px(-R * 0.36, -R * 1.0, R * 0.16, R * 0.16, "#7aff5a"); px(R * 0.12, -R * 1.0, R * 0.16, R * 0.16, "#7aff5a");
        px(-R * 0.2, -R * 0.5, R * 0.42, R * 0.32, "#3a8f6a"); px(-R * 0.14, -R * 0.35, R * 0.3, R * 0.14, "#16292a");
        px(R * 0.92, R * 0.4, R * 0.24, R * 0.55, "#9be84a"); px(R * 0.9, R * 0.34, R * 0.28, R * 0.14, "#dff0df");
        break;
      }
      default: { px(-R, -R, R * 2, R * 2, bc("#b3322a")); }
    }
    ctx.restore();
    // barre de vie (coordonnées écran)
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(RX, RY - 8, RW, 5);
    ctx.fillStyle = e.final ? "#9be84a" : "#d8430f"; ctx.fillRect(RX, RY - 8, RW * clamp(e.hp / e.maxHp, 0, 1), 5);
  }

  // Stewybear : ours pixel (corps, oreilles, museau, pattes) — pas un simple rond.
  function drawPlayer() {
    if (player.iframe > 0 && Math.floor(player.iframe / 4) % 2 === 0) return;
    const x = Math.round(player.x), y = Math.round(player.y);
    const M = "#9b6237", D = "#6e4324", B = "#d7a166", K = "#170f0b";
    // pattes
    px(x - 7, y + 6, 5, 5, D); px(x + 2, y + 6, 5, 5, D);
    // bras
    px(x - 10, y - 2, 4, 8, D); px(x + 6, y - 2, 4, 8, D);
    px(x - 10, y + 4, 4, 3, M); px(x + 6, y + 4, 4, 3, M);
    // corps + ventre
    px(x - 7, y - 2, 14, 10, M);
    px(x - 4, y + 1, 8, 7, B);
    // oreilles
    px(x - 9, y - 14, 5, 5, M); px(x + 4, y - 14, 5, 5, M);
    px(x - 8, y - 13, 3, 3, D); px(x + 5, y - 13, 3, 3, D);
    // tête
    px(x - 8, y - 12, 16, 11, M);
    // museau
    px(x - 4, y - 5, 8, 6, B);
    // yeux + truffe
    px(x - 5, y - 9, 2, 3, K); px(x + 3, y - 9, 2, 3, K);
    px(x - 1, y - 4, 3, 2, K);
  }

  function drawHUD() {
    ctx.fillStyle = "#07070d"; ctx.fillRect(0, 0, W, HUD_H);
    for (let i = 0; i < player.maxHp / 2; i++) {
      const full = player.hp >= (i + 1) * 2, half = !full && player.hp === i * 2 + 1;
      ctx.fillStyle = full ? "#e0466b" : half ? "#a02a44" : "#3a2630";
      const hx = 12 + i * 16;
      ctx.fillRect(hx, 12, 3, 3); ctx.fillRect(hx + 5, 12, 3, 3); ctx.fillRect(hx, 14, 8, 4); ctx.fillRect(hx + 2, 17, 4, 3);
    }
    ctx.fillStyle = "#ffe9c0"; ctx.font = '9px "Press Start 2P", monospace';
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.fillText(ROMAN[floor] + " · " + L(fdef().name), W / 2, HUD_H / 2);
    ctx.textAlign = "right"; ctx.fillStyle = "#9fe0ff";
    ctx.fillText("🌙 " + (shards + runShards), W - 86, HUD_H / 2);
    drawMinimap();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  function drawMinimap() {
    const mmX = W - 74, mmY = 6, cell = 9;
    rooms.forEach((room, key) => {
      const rx = mmX + (room.gx + 3) * cell, ry = mmY + (room.gy + 2) * cell;
      if (rx < mmX - 1 || rx > W - 4) return;
      let c = "#3a3a52";
      if (room.type === "boss") c = "#b3322a";
      else if (room.type === "treasure") c = "#caa23a";
      else if (room.type === "miniboss") c = "#8a5ad8";
      if (key === curKey) c = "#ffe9c0"; else if (!room.visited) c = "#1c1c26";
      ctx.fillStyle = c; ctx.fillRect(rx, ry, cell - 2, cell - 2);
    });
  }
  function drawBanner() {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, RY + RH / 2 - 13, W, 26);
    ctx.fillStyle = "#ffe08a"; ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(banner, W / 2, RY + RH / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = clamp(Math.round(r + r * amt), 0, 255); g = clamp(Math.round(g + g * amt), 0, 255); b = clamp(Math.round(b + b * amt), 0, 255);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  /* =====================================================
     Rendu des cinématiques
     ===================================================== */
  function wrapText(txt, x, y, maxW, lh) {
    const words = txt.split(" "); let line = "", yy = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy;
  }
  function drawCine() {
    const sc = cine.scenes[cine.idx];
    const p = clamp(cine.tt / sc.dur, 0, 1);
    ctx.fillStyle = "#05060a"; ctx.fillRect(0, 0, W, H);
    ctx.save(); sc.draw(p); ctx.restore();
    // bandeau de narration
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(0, H - 78, W, 78);
    ctx.fillStyle = "#ffe9c0"; ctx.font = '11px "Pixelify Sans", system-ui, sans-serif';
    ctx.textBaseline = "top"; ctx.textAlign = "left";
    wrapText(L(sc.text), 22, H - 66, W - 44, 17);
    // progression des scènes
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < cine.scenes.length; i++) { ctx.fillStyle = i === cine.idx ? "#ffe08a" : "rgba(255,255,255,0.3)"; ctx.fillRect(22 + i * 12, H - 12, 8, 3); }
    ctx.textBaseline = "alphabetic";
  }

  // helpers de dessin pour cinématiques
  function cMoon(cx, cy, r, glow) {
    ctx.fillStyle = "rgba(255,224,138," + (glow || 0.15) + ")"; ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe8a8"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d9b86a"; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.2, r * 0.18, 0, Math.PI * 2); ctx.fill();
  }
  function cBear(x, y, s) {
    ctx.fillStyle = "#7a4a28"; ctx.fillRect(x - 8 * s, y - 11 * s, 5 * s, 5 * s); ctx.fillRect(x + 3 * s, y - 11 * s, 5 * s, 5 * s);
    ctx.fillStyle = "#9b6237"; ctx.beginPath(); ctx.arc(x, y, 9 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#170f0b"; ctx.fillRect(x - 4 * s, y - 4 * s, 2 * s, 2 * s); ctx.fillRect(x + 2 * s, y - 4 * s, 2 * s, 2 * s);
  }

  /* =====================================================
     Menus / UI
     ===================================================== */
  function hideMenus() { [startMenu, achMenu, overMenu, itemMenu, storyMenu].forEach((m) => { if (m) m.hidden = true; }); }
  function showMenu(m) { hideMenus(); if (m) m.hidden = false; }

  function applyTexts() {
    if (closeBtn) closeBtn.setAttribute("aria-label", t("close"));
    if (hintEl) hintEl.textContent = t("hint");
    if (subEl) subEl.textContent = t("sub");
    const titleEl = startMenu && startMenu.querySelector(".mr-title");
    if (titleEl) titleEl.textContent = t("title");
    const achTitleEl = achMenu && achMenu.querySelector(".mr-title");
    if (achTitleEl) achTitleEl.textContent = t("achTitle");
    if (shardsLabelEl) shardsLabelEl.textContent = t("shardsLabel");
    if (playBtn) playBtn.textContent = t("play");
    if (achOpenBtn) achOpenBtn.textContent = t("achOpen");
    if (achBackBtn) achBackBtn.textContent = t("achBack");
    if (retryBtn) retryBtn.textContent = t("retry");
    if (quitBtn) quitBtn.textContent = t("quit");
    if (shopBtn) shopBtn.textContent = t("shop");
    if (itemTakeBtn) itemTakeBtn.textContent = t("take");
    if (itemTitle) itemTitle.textContent = t("itemTitle");
    if (storyContinue) storyContinue.textContent = t("continue");
    if (cineSkip) cineSkip.textContent = t("skip");
  }

  function renderSanctuary() {
    if (!sanctuaryEl) return;
    if (shardCount) shardCount.textContent = String(shards);
    sanctuaryEl.innerHTML = "";
    UPGRADES.forEach((u) => {
      const lvl = metaLevel(u.id), maxed = lvl >= u.max, cost = maxed ? 0 : u.cost(lvl);
      const row = document.createElement("button");
      row.type = "button"; row.className = "mr-upg"; row.disabled = maxed || shards < cost;
      const info = document.createElement("span"); info.className = "mr-upg-info";
      const nm = document.createElement("strong"); nm.textContent = L(u.name) + " " + "•".repeat(lvl) + "◦".repeat(u.max - lvl);
      const ds = document.createElement("small"); ds.textContent = L(u.desc);
      info.append(nm, ds);
      const price = document.createElement("span"); price.className = "mr-upg-cost"; price.textContent = maxed ? t("maxed") : cost + " 🌙";
      row.append(info, price);
      row.addEventListener("click", () => buyUpgrade(u));
      sanctuaryEl.appendChild(row);
    });
  }
  function buyUpgrade(u) {
    const lvl = metaLevel(u.id); if (lvl >= u.max) return;
    const cost = u.cost(lvl); if (shards < cost) return;
    shards -= cost; metaLevels[u.id] = lvl + 1;
    save("stewy-moon-shards", shards); save("stewy-moon-meta", metaLevels);
    unlock("sanctuary"); renderSanctuary();
  }
  function renderAch() {
    if (!achList) return;
    achList.innerHTML = "";
    ACHIEVEMENTS.forEach((a) => {
      const li = document.createElement("li"); li.className = "mr-ach-item" + (achState[a.id] ? " is-on" : "");
      const ic = document.createElement("span"); ic.className = "mr-ach-ic"; ic.textContent = achState[a.id] ? "🏆" : "🔒";
      const tx = document.createElement("span");
      const nm = document.createElement("strong"); nm.textContent = L(a.name);
      const ds = document.createElement("small"); ds.textContent = L(a.desc);
      tx.append(nm, ds); li.append(ic, tx); achList.appendChild(li);
    });
    if (achProgress) achProgress.textContent = t("achProgress").replace("%a", String(achCount())).replace("%b", String(ACHIEVEMENTS.length));
  }

  /* =====================================================
     Ouverture / fermeture
     ===================================================== */
  function open(toAch) {
    found = true; save("stewy-moon-found", true); refreshHubButtons();
    section.setAttribute("aria-hidden", "false"); document.body.classList.add("moon-open");
    applyTexts(); renderSanctuary();
    if (toAch) { mode = "ach"; renderAch(); showMenu(achMenu); }
    else { mode = "menu"; unlock("enter"); showMenu(startMenu); }
  }
  function startRun() {
    runShards = 0; floor = 1; curFloorId = null; player = makePlayer(); pendingItem = null; dyingBoss = null;
    hideMenus();
    playCinematic("prologue", () => startFloor(1));
  }
  function close() {
    stopLoop(); if (cineSkip) cineSkip.hidden = true;
    section.setAttribute("aria-hidden", "true"); document.body.classList.remove("moon-open");
    hideMenus(); mode = "menu"; refreshHubButtons();
    curFloorId = null;
    if (window.Sound && window.Sound.enabled) window.Sound.playHouse(); // retour à l'ambiance du salon
    if (window.Stewy3D && window.Stewy3D.reset) window.Stewy3D.reset();
  }

  // Reprend la bonne musique du donjon (appelée par site3d au dé-mute / 1er son).
  // Renvoie true si le donjon a pris la main, false sinon (-> salon/cheminée).
  function playCurrentMusic() {
    if (!window.Sound || !window.Sound.enabled || !isOpen()) return false;
    const inFloor = curFloorId &&
      (mode === "play" || mode === "pause" || mode === "over" || mode === "item" || mode === "story" || mode === "cinematic");
    if (inFloor) { window.Sound.playFloor(curFloorId); return true; }
    return false;
  }
  function isOpen() { return section.getAttribute("aria-hidden") === "false"; }

  function togglePause() {
    if (mode === "play") { mode = "pause"; stopLoop(); draw(); drawPauseOverlay(); }
    else if (mode === "pause") { mode = "play"; startLoop(); }
  }
  function drawPauseOverlay() {
    ctx.fillStyle = "rgba(6,6,12,0.7)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe9c0"; ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t("pause"), W / 2, H / 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function setLang(next) {
    if (next === "fr" || next === "en" || next === "es") lang = next;
    applyTexts();
    if (isOpen()) {
      renderSanctuary();
      if (mode === "ach") renderAch();
      if (mode === "story" && storyRelocalize) storyRelocalize();
    }
    refreshHubButtons();
  }

  /* --- Hub : bouton succès + médaille --- */
  function refreshHubButtons() {
    if (hubAchBtn) { hubAchBtn.hidden = !found; hubAchBtn.setAttribute("aria-label", t("achTitle")); }
    refreshHubMedal();
  }
  function refreshHubMedal() { if (hubMedal) hubMedal.hidden = !allUnlocked(); }
  if (hubAchBtn) hubAchBtn.addEventListener("click", () => open(true));

  /* =====================================================
     Boucle rAF
     ===================================================== */
  function frameStep(dt) {
    if (mode === "cinematic") { updateCine(dt); if (cine) drawCine(); }
    else if (mode === "play") { let steps = clamp(Math.round(dt / 16.67), 1, 3); while (steps-- > 0) if (mode === "play") step(); if (mode === "play" || mode === "pause") draw(); }
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(now - lastT, 50); lastT = now;
    frameStep(dt);
    rafId = requestAnimationFrame(loop);
  }
  function startLoop() { if (running) return; running = true; lastT = performance.now(); rafId = requestAnimationFrame(loop); }
  function stopLoop() { running = false; cancelAnimationFrame(rafId); }
  // Filet de sécurité : si la page est cachée (onglet/preview), rAF est suspendu.
  // On fait alors avancer le jeu via un timer (comme la scène 3D).
  setInterval(() => { if (running && document.hidden) frameStep(1000 / 30); }, 1000 / 30);

  /* =====================================================
     Entrées
     ===================================================== */
  window.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") {
      if (mode === "play" || mode === "pause") { togglePause(); e.preventDefault(); return; }
      if (mode === "cinematic") { endCine(); return; }
      if (mode === "story") { continueStory(); return; }
      close(); return;
    }
    if (mode === "cinematic" && (e.code === "Enter" || e.code === "Space")) { advanceCine(); e.preventDefault(); return; }
    if (mode === "story" && (e.code === "Enter" || e.code === "Space")) { continueStory(); e.preventDefault(); return; }
    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });
  canvas.addEventListener("click", () => { if (mode === "cinematic") advanceCine(); });

  /* --- Boutons de menu --- */
  if (playBtn) playBtn.addEventListener("click", startRun);
  if (achOpenBtn) achOpenBtn.addEventListener("click", () => { mode = "ach"; renderAch(); showMenu(achMenu); });
  if (achBackBtn) achBackBtn.addEventListener("click", () => { mode = "menu"; showMenu(startMenu); });
  if (itemTakeBtn) itemTakeBtn.addEventListener("click", takeItem);
  if (storyContinue) storyContinue.addEventListener("click", continueStory);
  if (cineSkip) cineSkip.addEventListener("click", endCine);
  if (retryBtn) retryBtn.addEventListener("click", startRun);
  if (quitBtn) quitBtn.addEventListener("click", close);
  // Boutique : depuis l'écran de mort, on retourne au sanctuaire pour dépenser
  // les éclats qu'on vient de gagner (puis « Descendre » relance une partie).
  if (shopBtn) shopBtn.addEventListener("click", () => { mode = "menu"; renderSanctuary(); showMenu(startMenu); });
  if (closeBtn) closeBtn.addEventListener("click", close);

  /* =====================================================
     Cinématiques : contenu (défini après ctx)
     ===================================================== */
  CINEMATICS = {
    prologue: {
      scenes: [
        {
          dur: 5200,
          text: { fr: "La lune veillait sur une ville endormie. Cette nuit-là, elle ne brillait pour personne.", en: "The moon watched over a sleeping city. That night, it shone for no one.", es: "La luna velaba sobre una ciudad dormida. Esa noche, no brillaba para nadie." },
          draw: (p) => {
            ctx.fillStyle = "#0a0c18"; ctx.fillRect(0, 0, W, 220);
            cMoon(W * 0.72, 70, 30, 0.1 + p * 0.06);
            ctx.fillStyle = "#11131f"; for (let i = 0; i < 9; i++) { const h = 50 + ((i * 53) % 90); ctx.fillRect(20 + i * 52, 220 - h, 40, h); }
            ctx.fillStyle = "rgba(255,224,138,0.5)"; for (let i = 0; i < 14; i++) ctx.fillRect((i * 71 + Math.floor(p * 20)) % W, (i * 37) % 120, 1, 1);
          },
        },
        {
          dur: 5200,
          text: { fr: "Puis vint la fièvre. D'abord les rats, dans le noir des égouts. Leurs yeux virèrent au vert.", en: "Then came the fever. The rats first, in the dark of the sewers. Their eyes turned green.", es: "Luego llegó la fiebre. Primero las ratas, en la oscuridad de las cloacas. Sus ojos se volvieron verdes." },
          draw: (p) => {
            ctx.fillStyle = "#0c150f"; ctx.fillRect(0, 0, W, 220);
            ctx.fillStyle = "rgba(80,170,90,0.12)"; ctx.fillRect(0, 0, W, 220);
            for (let i = 0; i < 5; i++) { const x = 80 + i * 70 + Math.sin(p * 6 + i) * 6, y = 150 + (i % 2) * 24; ctx.fillStyle = "#8a8a90"; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#aef752"; ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2); }
          },
        },
        {
          dur: 5200,
          text: { fr: "Nul ne savait d'où venait le mal. Stewybear, lui, voulait savoir. Il descendit dans le noir.", en: "No one knew where the sickness came from. Stewybear wanted to know. He went down into the dark.", es: "Nadie sabía de dónde venía el mal. Stewybear quería saberlo. Bajó a la oscuridad." },
          draw: (p) => {
            ctx.fillStyle = "#0a0a10"; ctx.fillRect(0, 0, W, 220);
            ctx.fillStyle = "#15151f"; ctx.fillRect(W / 2 - 40, 40, 80, 180); // puits
            const by = 60 + p * 120; cBear(W / 2, by, 1.6);
            ctx.fillStyle = "rgba(255,200,90,0.18)"; ctx.beginPath(); ctx.arc(W / 2, by, 28, 0, Math.PI * 2); ctx.fill();
          },
        },
      ],
    },
    truck: {
      scenes: [
        {
          dur: 5200,
          text: { fr: "Dans les rues mortes, une vérité roulait sans phares : des camions blancs, la nuit.", en: "In the dead streets, a truth rolled without headlights: white trucks, by night.", es: "En las calles muertas, una verdad rodaba sin faros: camiones blancos, de noche." },
          draw: (p) => {
            ctx.fillStyle = "#0c0d14"; ctx.fillRect(0, 0, W, 220);
            ctx.fillStyle = "#1a1b24"; ctx.fillRect(0, 180, W, 40);
            const tx = -120 + p * (W + 160);
            ctx.fillStyle = "#dfe2e8"; ctx.fillRect(tx, 150, 80, 36); ctx.fillRect(tx + 80, 158, 26, 28);
            ctx.fillStyle = "#11131a"; ctx.fillRect(tx + 12, 186, 14, 14); ctx.fillRect(tx + 70, 186, 14, 14);
            ctx.fillStyle = "#ffcf6a"; ctx.fillRect(tx + 104, 168, 5, 5);
          },
        },
        {
          dur: 5400,
          text: { fr: "Des hommes sans visage, masqués, chargeaient les bêtes vivantes. Et là-haut, sur la colline, une lumière froide ne s'éteignait jamais.", en: "Faceless masked men loaded the living beasts. And up on the hill, a cold light never went out.", es: "Hombres sin rostro, enmascarados, cargaban a las bestias vivas. Y arriba, en la colina, una luz fría jamás se apagaba." },
          draw: (p) => {
            ctx.fillStyle = "#0a0c16"; ctx.fillRect(0, 0, W, 220);
            ctx.fillStyle = "#13202a"; ctx.beginPath(); ctx.moveTo(0, 220); ctx.lineTo(W, 220); ctx.lineTo(W, 110); ctx.lineTo(W * 0.6, 60); ctx.lineTo(0, 130); ctx.fill(); // colline
            const g = 0.2 + Math.abs(Math.sin(p * 8)) * 0.5;
            ctx.fillStyle = "rgba(120,230,140," + g + ")"; ctx.beginPath(); ctx.arc(W * 0.6, 56, 22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#2a8f6a"; ctx.fillRect(W * 0.6 - 10, 40, 20, 20); // labo
            ctx.fillStyle = "#0c0c12"; for (let i = 0; i < 3; i++) { const x = 90 + i * 60; ctx.fillRect(x, 160, 8, 22); ctx.fillRect(x - 2, 152, 12, 8); } // silhouettes
          },
        },
      ],
    },
    lab: {
      scenes: [
        {
          dur: 5400,
          text: { fr: "Au bout du sang et des cages, le repaire du Docteur. Les murs gardaient la mémoire de tout ce qu'il avait sacrifié.", en: "At the end of blood and cages, the Doctor's lair. The walls remembered all he had sacrificed.", es: "Al final de la sangre y las jaulas, la guarida del Doctor. Los muros recordaban todo lo que había sacrificado." },
          draw: (p) => {
            ctx.fillStyle = "#0a0e12"; ctx.fillRect(0, 0, W, 220);
            ctx.fillStyle = "rgba(120,20,16,0.5)"; for (let i = 0; i < 7; i++) ctx.fillRect(30 + i * 60, 30, 6, 30 + (i % 3) * 24);
            ctx.fillStyle = "#16202a"; for (let i = 0; i < 5; i++) ctx.fillRect(40 + i * 90, 120, 50, 70); // cages
            ctx.strokeStyle = "#2a3a44"; for (let i = 0; i < 5; i++) for (let b = 0; b < 5; b++) { ctx.beginPath(); ctx.moveTo(40 + i * 90 + b * 10, 120); ctx.lineTo(40 + i * 90 + b * 10, 190); ctx.stroke(); }
            ctx.fillStyle = "#3a2a2a"; for (let i = 0; i < 6; i++) ctx.fillRect(50 + (i * 73) % (W - 80), 150 + (i % 2) * 28, 9, 5); // rats morts
            ctx.fillStyle = "rgba(70,220,120," + (0.12 + p * 0.1) + ")"; ctx.fillRect(0, 0, W, 220);
          },
        },
        {
          dur: 5000,
          text: { fr: "Au centre, une cuve verte palpitait. Et lui, qui attendait, une fiole à la main, un sourire sous le masque.", en: "At the center, a green vat pulsed. And him, waiting, a vial in hand, a smile beneath the mask.", es: "En el centro, una cuba verde palpitaba. Y él, esperando, un frasco en la mano, una sonrisa bajo la máscara." },
          draw: (p) => {
            ctx.fillStyle = "#0a0e12"; ctx.fillRect(0, 0, W, 220);
            const g = 0.4 + Math.abs(Math.sin(p * 6)) * 0.4;
            ctx.fillStyle = "rgba(90,230,130," + g * 0.4 + ")"; ctx.beginPath(); ctx.arc(W / 2, 120, 70, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#1c3a2a"; ctx.fillRect(W / 2 - 26, 70, 52, 110); ctx.fillStyle = "rgba(120,240,150," + g + ")"; ctx.fillRect(W / 2 - 22, 78, 44, 96);
            ctx.fillStyle = "#e6ecec"; ctx.fillRect(W / 2 + 70, 110, 26, 50); ctx.fillStyle = "#f0d8b0"; ctx.fillRect(W / 2 + 74, 96, 18, 16); ctx.fillStyle = "#3aa0a0"; ctx.fillRect(W / 2 + 75, 100, 16, 5);
          },
        },
      ],
    },
    epilogue: {
      scenes: [
        {
          dur: 5200,
          text: { fr: "La fiole se brisa au sol. Le nuage vert vira lentement au bleu, et reflua comme une marée.", en: "The vial shattered on the floor. The green cloud slowly turned blue, and ebbed away like a tide.", es: "El frasco se rompió en el suelo. La nube verde viró despacio al azul, y se retiró como una marea." },
          draw: (p) => {
            ctx.fillStyle = "#0a0e14"; ctx.fillRect(0, 0, W, 220);
            const r = 20 + p * 160;
            ctx.fillStyle = "rgba(90,200,230," + (0.5 - p * 0.3) + ")"; ctx.beginPath(); ctx.arc(W / 2, 200, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(120,230,140," + (0.3 - p * 0.3) + ")"; ctx.fillRect(0, 0, W, 220);
            ctx.fillStyle = "#cfe8ff"; ctx.fillRect(W / 2 - 3, 188, 6, 10);
          },
        },
        {
          dur: 5600,
          text: { fr: "Un à un, les souffles revinrent aux bêtes. Le vert quitta leurs yeux. La ville, doucement, recommença de respirer.", en: "One by one, breath returned to the beasts. The green left their eyes. The city, gently, began to breathe again.", es: "Uno a uno, el aliento volvió a las bestias. El verde dejó sus ojos. La ciudad, despacio, volvió a respirar." },
          draw: (p) => {
            ctx.fillStyle = "#0c1118"; ctx.fillRect(0, 0, W, 220);
            for (let i = 0; i < 6; i++) { const x = 60 + i * 64, y = 150 + (i % 2) * 22; ctx.fillStyle = "#9b6237"; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = p > 0.4 ? "#170f0b" : "#aef752"; ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2); }
            ctx.fillStyle = "rgba(120,170,230," + p * 0.2 + ")"; ctx.fillRect(0, 0, W, 220);
          },
        },
        {
          dur: 6000,
          text: { fr: "Et l'aube fut rendue aux bêtes. Sur la colline éteinte, la lune, enfin, put se reposer.", en: "And dawn was given back to the beasts. On the darkened hill, the moon could finally rest.", es: "Y el alba fue devuelta a las bestias. En la colina apagada, la luna por fin pudo descansar." },
          draw: (p) => {
            ctx.fillStyle = "#101826"; ctx.fillRect(0, 0, W, 220);
            ctx.fillStyle = "rgba(255,180,90," + p * 0.5 + ")"; ctx.fillRect(0, 150, W, 70); // aube
            ctx.fillStyle = "rgba(255,210,140," + p * 0.35 + ")"; ctx.beginPath(); ctx.arc(W / 2, 210, 60 + p * 30, 0, Math.PI * 2); ctx.fill();
            cMoon(W * 0.8, 50, 22, 0.12 - p * 0.08);
            cBear(W * 0.3, 170, 1.4);
          },
        },
      ],
    },
  };

  /* =====================================================
     API publique + debug
     ===================================================== */
  window.MoonGame = {
    open: () => open(false),
    openAchievements: () => open(true),
    close, isOpen, setLang, playCurrentMusic,
    // debug / tests
    state: () => ({
      mode, floor, hp: player && player.hp, maxHp: player && player.maxHp,
      enemies: enemies.length, rooms: rooms ? rooms.size : 0,
      curType: cur && cur.type, curCleared: cur && cur.cleared, doors: cur && cur.doors,
      runShards, shards, ach: achCount(),
      cine: cine ? cine.idx + "/" + cine.scenes.length : null,
      storyText: storyMenu && !storyMenu.hidden ? (storyText ? storyText.textContent.slice(0, 60) : "") : null,
      px: player && Math.round(player.x), py: player && Math.round(player.y),
      enemyList: enemies.map((e) => ({ draw: e.draw, x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.hp * 10) / 10, boss: !!e.boss, elite: !!e.elite })),
    }),
    _skipToFloor: (n) => { runShards = runShards || 0; if (!player) player = makePlayer(); stopLoop(); hideMenus(); startFloor(n); },
    _killEnemies: () => { enemies.forEach((e) => (e.hp = 0)); },
    _goto: (type) => { if (!rooms) return false; for (const [k, r] of rooms) { if (r.type === type) { curKey = k; cur = r; enterRoom(null); hideMenus(); mode = "play"; startLoop(); return true; } } return false; },
    _continue: () => { if (storyMenu && !storyMenu.hidden) continueStory(); else if (cine) endCine(); },
    _tick: (n) => { for (let i = 0; i < (n || 1); i++) frameStep(16.7); },
  };

  refreshHubButtons();
})();
