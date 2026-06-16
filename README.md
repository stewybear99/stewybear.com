# stewybear.com

Site statique interactif pour Cloudflare Pages.

## Modifier les liens

Les reseaux sont configures dans `script.js`, dans l'objet `socials`.
Remplace les valeurs `url` par tes vrais profils:

```js
letterboxd: {
  label: "Letterboxd",
  action: "Stewy se pose devant la tele pour ouvrir Letterboxd.",
  url: "https://letterboxd.com/tonpseudo",
}
```

## Deployer sur Cloudflare Pages

- Build command: aucune
- Output directory: `/`

Le site fonctionne sans framework, donc Cloudflare peut servir directement `index.html`, `styles.css` et `script.js`.
