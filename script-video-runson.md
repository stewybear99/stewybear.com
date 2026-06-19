# Script vidéo — « C'est quoi RunsOn ? » (~15 min)

> **Format :** vidéo YouTube, ton « présentation produit mais on rigole ».
> **Durée cible :** ~15 min (≈ 2 000–2 200 mots dits). *Note : avec le chapitre « pourquoi c'est moins cher », on tourne plutôt vers 16–17 min — si tu veux rester à 15, compresse la démo (6:15) ou les features (9:15).*
> **Légende :** `[CAM]` = ce qu'on voit / mise en scène · `[B-ROLL]` = images d'illustration · *texte en italique* = intention de jeu.
> **À adapter :** les chiffres exacts (prix, vCPU, %) — remplace par tes vrais chiffres à jour avant tournage.

---

## 0:00 — COLD OPEN (le crochet) ~45 s

[CAM : toi, gros plan, l'air grave, lumière dramatique]

> « Il est 3 h du matin. Mon pipeline CI tourne depuis... 47 minutes. »

[B-ROLL : un spinner GitHub Actions qui tourne, qui tourne, qui tourne]

> « 47 minutes pour compiler un projet qui fait la taille d'un fichier README. »

[CAM : tu montres ton téléphone — une fausse notif de facture]

> « Et ce matin, GitHub m'a envoyé ça. »

[B-ROLL : zoom sur un montant absurde, genre "$4 312,00", avec un petit *cha-ching* sonore]

> *(silence)* « Donc voilà. Aujourd'hui on parle de comment j'ai arrêté de financer les vacances de Microsoft. »

[CARTON TITRE animé : **RunsOn — c'est quoi ce truc ?**]

---

## 0:45 — INTRO ~1 min

[CAM : ambiance normale, tu souris]

> « Salut ! Si tu utilises GitHub Actions, t'as deux options dans la vie : soit tu paies cher pour des machines lentes, soit tu regardes cette vidéo. »

> « Alors, deux secondes de contexte : GitHub Actions, c'est le truc qui lance tes tests et tes déploiements automatiquement à chaque fois que tu pushes du code. C'est génial. Le problème, c'est *où* ça tourne. »

> « Par défaut, ça tourne sur les machines de GitHub. Et les machines de GitHub, c'est un peu comme un taxi à l'aéroport : ça t'amène à destination, mais tu vas pleurer en regardant l'addition. »

> « Moi c'est [TON NOM], et dans les 14 prochaines minutes je te montre RunsOn : comment ça marche, combien ça coûte vraiment, et pourquoi j'aurais aimé connaître ça il y a deux ans. On y va. »

[CARTON : sommaire animé — Le problème · La solution · La démo · Le prix · Les objections]

---

## 1:45 — CHAPITRE 1 : LE PROBLÈME ~2 min 30

[CAM : toi, façon « je t'explique »]

> « Bon. Les runners hébergés par GitHub. Sur le papier, c'est parfait : tu écris `runs-on: ubuntu-latest`, tu pushes, et magie, ça marche. »

> « Sauf qu'il y a trois petits détails. »

[CARTON : **1. La vitesse**]

> « Détail numéro un : la machine de base, c'est 2 cœurs. Deux. En 2026. »

[B-ROLL : une image d'ordinateur des années 90, modem 56k qui grésille]

> « Deux cœurs, c'est suffisant pour faire tourner un terminal et... regretter ses choix de vie. Ton build qui pourrait prendre 4 minutes sur une vraie machine en prend 20. Et tu attends. Et l'équipe attend. Et le café refroidit. »

[CARTON : **2. Le prix**]

> « Détail numéro deux : dès que tu veux une machine plus costaude, le prix grimpe... comment dire... agressivement. »

[B-ROLL : un graphique de courbe exponentielle, toi qui le regardes avec la tête de quelqu'un qui découvre son relevé bancaire]

> « Tu veux 64 cœurs ? Pas de souci. Prépare juste une petite réunion avec ton comptable. Et un mouchoir. »

[CARTON : **3. Le contrôle**]

> « Et détail numéro trois, le plus sournois : tu ne contrôles rien. C'est leur cloud, leurs règles, leurs limites. Ton code, tes secrets, tes données — tout ça transite chez quelqu'un d'autre. »

[CAM : tu te penches vers la caméra]

> « Alors la question qu'on se pose tous à un moment : "Et si je faisais tourner mes runners... chez moi ?" Enfin, "chez moi" — sur *mon* compte AWS. »

> *(petit rire)* « Et c'est exactement là que les choses deviennent intéressantes. »

---

## 4:15 — CHAPITRE 2 : LA SOLUTION ~2 min

[CARTON : **RunsOn**]

[CAM : énergie qui monte]

> « RunsOn, en une phrase : ça fait tourner tes GitHub Actions sur des runners qui vivent dans *ton* compte AWS. À toi. »

> « Concrètement : tu installes RunsOn une fois, et après, à chaque job, RunsOn démarre automatiquement une machine EC2 toute fraîche, lance ton job dessus, puis l'éteint dès que c'est fini. »

[B-ROLL : animation simple — un job arrive → une VM apparaît → le job tourne → la VM disparaît]

> « Machine éphémère. Propre à chaque fois. Pas de runner zombie qui traîne avec des fichiers de la build d'il y a trois semaines. »

> « Et le meilleur ? Pour ton workflow, ça ne change quasi rien. Tu remplaces `runs-on: ubuntu-latest` par `runs-on: runs-on,...` et c'est plié. Même Ubuntu, mêmes outils préinstallés, compatible avec ce que tu as déjà. »

[CAM : tu lèves un doigt, faussement professoral]

> « C'est un peu comme remplacer ta voiture de location hors de prix par exactement la même voiture, mais qui t'appartient, qui va trois fois plus vite, et qui coûte le prix d'un café. »

> « ...OK l'analogie tient pas jusqu'au bout. Mais tu vois l'idée. »

---

## 6:15 — CHAPITRE 3 : LA DÉMO ~3 min

[CAM : partage d'écran, console AWS]

> « Allez, on installe ce truc en vrai. Et je te préviens : c'est tellement rapide que j'ai dû ralentir la vidéo pour que tu voies quelque chose. »

> *(pas vrai, mais ça fait bien)*

[B-ROLL / ÉCRAN : tu cliques sur le template CloudFormation]

> « L'installation, c'est un template CloudFormation. En clair : tu cliques sur un lien, AWS te demande deux-trois infos — ton organisation GitHub, une adresse e-mail — et il construit toute l'infrastructure pour toi. »

> « VPC, sécurité, permissions, le serveur qui orchestre tout... tout est créé automatiquement. Toi tu vas chercher un café. »

[B-ROLL : minuteur en accéléré « ~15 min » qui défile]

> « Une quinzaine de minutes plus tard : c'est en ligne. RunsOn s'est connecté à GitHub via une app que tu installes, et c'est prêt. »

[ÉCRAN : un fichier workflow .yml]

> « Maintenant, le workflow. Regarde la ligne magique : »

```yaml
jobs:
  build:
    runs-on: runs-on=${{ github.run_id }}/runner=4cpu-linux-x64
```

> « Là je demande un runner Linux, 4 cœurs. Je veux plus gros ? »

```yaml
    runs-on: runs-on=${{ github.run_id }}/runner=32cpu-linux-x64
```

> « 32 cœurs. Comme ça. Je change un chiffre. »

[CAM : tu mimes quelqu'un qui négocie au marché]

> « "Bonjour, je voudrais 32 cœurs s'il vous plaît." "Bien sûr monsieur, et avec ça ?" "Mettez-moi un GPU aussi, c'est pour offrir." »

[ÉCRAN : tu pushes, le job démarre, la VM apparaît dans EC2]

> « Je pushe... et là, en direct, RunsOn démarre la machine sur mon compte AWS. Le job tourne. Et regarde le temps : [MONTRE LE GAIN]. La même chose qui prenait [X] minutes avant en prend [Y]. »

[CAM : satisfaction visible]

> « Et quand c'est fini — pouf — la machine s'éteint. Je paie que les secondes où elle a réellement tourné. »

---

## 9:15 — CHAPITRE 4 : LES FEATURES QUI TUENT ~2 min 30

[CARTON : **Ce que tu peux faire**]

[CAM : rythme rapide, façon liste]

> « OK, tour d'horizon rapide de ce qui m'a fait dire "ah ouais quand même". »

[CARTON : **Vitesse**]
> « Des vraies machines : plus de cœurs, plus de RAM, du SSD NVMe rapide. Tes builds décollent. »

[CARTON : **Le choix**]
> « x86 ou ARM64, du tout petit au très gros, GPU pour ton machine learning... tu choisis la machine adaptée à *chaque* job. Un petit linter ? Petite machine. Compiler le noyau Linux ? Lâche les chevaux. »

[CARTON : **Le cache**]
> « Cache intégré, stocké dans ton propre S3. Pas de limite ridicule, et c'est rapide parce que c'est dans la même région que tes machines. »

[CARTON : **Spot instances**]
> « Tu peux utiliser les instances Spot AWS — les machines bradées — pour payer encore moins. »

[CARTON : **La sécurité**]
> « Et ça, c'est important : tout reste dans *ton* compte AWS. Ton code, tes secrets, ne sortent pas de chez toi. Pour les équipes qui ont des contraintes de conformité, c'est pas un détail, c'est *le* truc. »

[CAM : aparté complice]

> « En gros, RunsOn te donne les clés du camion. À toi de pas le mettre dans le décor. »

---

## 11:45 — CHAPITRE 5 : LE PRIX (le vrai sujet) ~1 min 30

[CARTON : **Combien ça coûte vraiment**]

[CAM : ton sérieux mais léger]

> « Bon. Parlons argent, parce que c'est probablement pour ça que t'es encore là. »

> « RunsOn lui-même : licence simple. Et derrière, tu paies AWS directement, au prix d'AWS. Pas de marge cachée, pas de multiplicateur magique. »

[B-ROLL : deux barres côte à côte — "GitHub hosted" très haute, "RunsOn sur AWS" toute petite]

> « Le résultat, selon les configs, c'est typiquement plusieurs fois moins cher que les runners GitHub équivalents. Et plus tu prends des grosses machines, plus l'écart devient... gênant pour l'autre camp. »

[CAM : faux air désolé]

> « Je dis ça, je dis rien. Mais ma facture CI a fait un régime que même les influenceurs fitness n'osent pas promettre. »

> « Mets tes vrais chiffres ici — fais le calcul sur ton propre volume, c'est là que ça parle. »

---

## 13:15 — CHAPITRE 6 : POURQUOI C'EST MOINS CHER (et ce qui nous différencie) ~2 min

[CARTON : **Mais pourquoi c'est moins cher, en vrai ?**]

[CAM : ton un peu plus posé, « je te lève le capot »]

> « Là tu te dis sûrement : "OK c'est moins cher, mais c'est quoi l'arnaque ?" Alors levons le capot. Y'a pas d'arnaque, y'a juste un modèle différent. »

[CARTON : **1. Pas d'intermédiaire sur le compute**]

> « Première raison : avec RunsOn, tu paies AWS *directement*, au prix d'AWS. RunsOn, c'est une licence fixe, point. On ne te revend pas des minutes de calcul avec une marge dessus. »

[B-ROLL : schéma — "Toi → AWS" (flèche directe) VS "Toi → Plateforme → leur datacenter" (flèche avec un péage au milieu)]

> « La plupart des autres plateformes de runners, leur business c'est littéralement d'acheter du compute en gros et de te le revendre à la minute. Forcément, y'a une marge au milieu. C'est leur métier, c'est normal — mais c'est toi qui la paies. »

[CARTON : **2. Tu profites de TES tarifs AWS**]

> « Deuxième raison : comme ça tourne sur ton compte, tu bénéficies de *tes* conditions. Tes Spot instances, tes remises, tes crédits, tes engagements négociés. Une plateforme tierce peut pas te refiler ça : elle est sur son compte à elle, pas le tien. »

[CARTON : **3. Éphémère et à la seconde**]

> « Troisième raison : les machines sont éphémères et facturées à la seconde. Pas de runner qui tourne dans le vide à minuit en attendant du boulot. Ça démarre, ça bosse, ça s'éteint. Tu paies le travail, pas l'attente. »

[CAM : tu enchaînes, énergie qui remonte]

> « Et c'est exactement là qu'on se différencie des autres plateformes du genre. »

[CARTON : **Ce qui nous différencie**]

> « Les autres, le modèle c'est : "donne-nous ton code, on le fait tourner sur *notre* infra, on te facture à la minute." Pratique, mais ton code et tes secrets sortent de chez toi, et la facture grossit avec ton usage. »

> « RunsOn, c'est l'inverse : tout tourne dans *ton* compte AWS. »

[B-ROLL : liste qui apparaît point par point]

> « Ça veut dire trois choses concrètes : »
>
> — « Un : tes données ne quittent jamais ton cloud. Pour la conformité et la sécurité, c'est le jour et la nuit. »
>
> — « Deux : pas de lock-in. C'est de l'infra AWS standard. Si demain tu veux tout débrancher, t'as pas un fournisseur qui détient tes machines en otage. »
>
> — « Trois : tu as accès à *toute* la gamme AWS. Toutes les tailles, ARM, GPU, toutes les régions du monde. Tu n'es pas limité au catalogue qu'une plateforme a bien voulu te proposer. »

[CAM : punchline]

> « En gros, les autres te louent une chambre d'hôtel. RunsOn te donne les plans pour transformer *ta* maison en hôtel. Même confort, mais c'est chez toi et tu gardes les clés. »

> « Et plus tu scales, plus l'écart se creuse : une facture à la minute, ça monte avec toi ; une licence fixe + le prix coûtant AWS, ça reste sage. »

---

## 15:15 — CHAPITRE 7 : LES OBJECTIONS ~1 min 15

[CARTON : **"Oui mais..."**]

[CAM : tu réponds à un interlocuteur imaginaire]

> « "Oui mais c'est compliqué à gérer, non ?" — Non. C'est éphémère et auto-géré. Pas de serveur à bichonner, pas de mises à jour manuelles à 2 h du mat. »

> « "Oui mais et si AWS me fait peur ?" — Légitime, AWS fait peur à tout le monde, c'est leur modèle économique. Mais l'install fait le gros du boulot, et tu restes sur des services standards. »

> « "Oui mais je suis déjà à fond dans GitHub hosted." — Justement. Tu migres un workflow, tu compares, et tu décides. Tu changes une ligne, tu peux revenir en arrière en changeant la même ligne. »

[CAM : sourire]

> « Bref, le risque d'essayer est à peu près aussi élevé que le risque de... changer une ligne de YAML. »

---

## 16:30 — OUTRO + CALL TO ACTION ~45 s

[CAM : toi, posé, direct caméra]

> « Donc voilà RunsOn : tes GitHub Actions, sur tes machines AWS, plus rapides, moins chères, et sous ton contrôle. »

> « Si t'en as marre d'attendre tes builds et de financer les sapins de Noël de quelqu'un d'autre, le lien est en description. Va voir runs-on.com, l'install prend un quart d'heure. »

> « Si la vidéo t'a été utile, abonne-toi — ça me coûte moins cher qu'un runner GitHub, et ça me fait super plaisir. »

[B-ROLL : retour sur le spinner du début, mais qui se termine *instantanément* avec un ✅]

> « Et toi, ton build vient de finir. De rien. À la prochaine ! »

[CARTON DE FIN : **runs-on.com** + abonnement]

---

## Notes de prod / blagues de secours

- **Running gag possible :** un compteur « $ économisés » en coin d'écran qui monte pendant toute la vidéo.
- **Punchline alternative facture :** « GitHub m'a pas envoyé une facture, m'a envoyé une demande en mariage : c'était un engagement à vie. »
- **Transition Spot instances :** « Les instances Spot, c'est le rayon "produits courte date" d'AWS : c'est moins cher parce qu'ils peuvent te le reprendre. Mais pour de la CI jetable, on s'en fiche. »
- **B-roll récurrent :** ta tête qui change d'expression face au graphe de coûts (avant/après).
- **Vérifier avant tournage :** noms exacts des labels de runners, prix, % d'économie, durée d'install — mets tes chiffres réels.
```
