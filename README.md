# daily-fact

Poste chaque matin une anecdote de la rubrique « Le saviez-vous ? » de Wikipédia
dans un salon Discord.

Pas de serveur à faire tourner : c'est un script Node lancé une fois par jour par
GitHub Actions, qui envoie le message via un webhook Discord.

## Installation

1. Fork ou copie ce dépôt.
2. Dans Discord : clic droit sur le salon → Modifier le salon → Intégrations →
   Créer un webhook, puis copie l'URL.
3. Dans GitHub : Settings → Secrets and variables → Actions → New repository
   secret, nommé `DISCORD_WEBHOOK`, avec l'URL comme valeur.
4. Dans `anecdote.js`, remplace `TON_PSEUDO/TON_REPO` dans la constante `UA` par
   l'adresse de ton dépôt. Wikimedia demande un User-Agent identifiable.

Pour tester sans attendre le lendemain : onglet Actions → « Anecdote du jour » →
Run workflow.

## Fonctionnement

Le script lit [`Modèle:AccueilInsolites`](https://fr.wikipedia.org/wiki/Mod%C3%A8le:AccueilInsolites)
via l'API MediaWiki, en extrait les anecdotes du jour, en tire une au hasard et
la poste. Les anecdotes restent environ trois jours sur la page d'accueil de
Wikipédia, donc `deja-vues.json` garde en mémoire celles déjà publiées. S'il n'y
a rien de neuf, rien n'est envoyé.

## Réglages

L'heure est dans `.github/workflows/anecdote.yml`. Le cron de GitHub étant en
UTC, `0 7 * * *` donne 9h l'été et 8h l'hiver, heure de Paris.

Pour poster même quand il n'y a pas de nouvelle anecdote, supprime le
`process.exit(0)` dans `anecdote.js`.

## Limites

Le script lit le HTML de la page Wikipédia. Si la mise en page change,
l'extraction peut casser : dans ce cas le script s'arrête avec une erreur
explicite et GitHub t'envoie un mail. Le correctif se limite en général au
filtre dans `extraireAnecdotes()`.

Les textes viennent de Wikipédia et sont sous licence CC BY-SA. Le message
contient un lien vers l'article source.
