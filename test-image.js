// Teste uniquement le rendu d'une anecdote AVEC image.
//
//   VITEST=1 DISCORD_WEBHOOK="https://discord.com/api/webhooks/..." node test-image.js
//
// Sans argument : prend la première anecdote illustrée du jour sur Wikipédia.
// Avec un argument : utilise l'URL d'image fournie.
//
//   VITEST=1 DISCORD_WEBHOOK="..." node test-image.js "https://upload.wikimedia.org/..."
//
// N'écrit pas dans deja-vues.json : tu peux le relancer autant de fois que tu veux.

import { extraireAnecdotes } from './anecdote.js';

const WEBHOOK = process.env.DISCORD_WEBHOOK;
const UA = 'AnecdoteDiscordBot/1.0 (https://github.com/TON_PSEUDO/TON_REPO)';

if (!WEBHOOK) throw new Error('Variable DISCORD_WEBHOOK absente');

let anecdote;
const urlFournie = process.argv[2];

if (urlFournie) {
  anecdote = { texte: 'Test de vignette avec une URL fournie à la main.', image: urlFournie };
} else {
  const params = new URLSearchParams({
    action: 'parse',
    text: '{{Modèle:AccueilInsolites}}',
    title: 'Wikipédia:Accueil principal',
    contentmodel: 'wikitext',
    prop: 'text',
    disablelimitreport: '1',
    format: 'json',
    formatversion: '2'
  });
  const res = await fetch(`https://fr.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': UA }
  });
  const data = await res.json();
  const avecImage = extraireAnecdotes(data.parse.text).filter(a => a.image);

  if (avecImage.length === 0) {
    console.error(
      "Aucune anecdote illustrée aujourd'hui. Relance en passant une URL d'image en argument."
    );
    process.exit(1);
  }
  anecdote = avecImage[0];
}

console.log('Texte :', anecdote.texte);
console.log('Image :', anecdote.image);

const res = await fetch(WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'Le saviez-vous ? (test)',
    embeds: [
      {
        color: 0x5865f2,
        title: '💡 Le saviez-vous ?',
        description: anecdote.texte,
        thumbnail: { url: anecdote.image },
        footer: { text: 'Wikipédia en français · CC BY-SA' },
        timestamp: new Date().toISOString()
      }
    ]
  })
});

console.log(res.ok ? 'Envoyé.' : `Échec ${res.status} : ${await res.text()}`);
