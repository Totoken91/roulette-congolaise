# Roulette Congolaise

Jeu en ligne type casino vintage où on ne peut que perdre.
La roue tourne, deux destinées vous sont proposées, vous devez en choisir une.

## Stack

Page statique unique (`index.html`) — React + Babel via CDN, aucune build step.

## Déploiement Vercel

Le projet est déjà prêt :

```
vercel deploy --prod
```

Ou via l'intégration GitHub : importer le repo `Totoken91/roulette-congolaise` dans Vercel, aucune config nécessaire (Vercel sert `index.html` automatiquement).

## Local

```
# Soit ouvrir directement
start index.html

# Soit servir le dossier
npx serve .
```

## Structure

- `index.html` — le jeu, self-contained, prêt à servir
- `design/` — sources de la maquette HTML/JSX d'origine (Claude Design)
