import { readFile, writeFile } from 'node:fs/promises';

const WEBHOOK = process.env.DISCORD_WEBHOOK;
const PAGE = 'Modèle:AccueilInsolites';
const VUES_FILE = 'deja-vues.json';

// Wikimedia demande un User-Agent identifiable sur tout accès API
const UA = 'AnecdoteDiscordBot/1.0 (https://github.com/TON_PSEUDO/TON_REPO)';

// --- Récupération -------------------------------------------------------
async function fetchAnecdotes() {
  const url =
    'https://fr.wikipedia.org/w/api.php?action=parse' +
    `&page=${encodeURIComponent(PAGE)}` +
    '&prop=text&format=json&formatversion=2&redirects=1';

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Wikipédia a répondu ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(`API Wikipédia : ${data.error.info}`);

  return extraireAnecdotes(data.parse.text);
}

// --- Nettoyage du HTML --------------------------------------------------
export function extraireAnecdotes(html) {
  const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map(m => m[1])
    .map(item =>
      item
        .replace(/<sup\b[\s\S]*?<\/sup>/gi, '') // appels de note
        .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    );

  return items
    .map(item => ({
      // version affichée : liens transformés en Markdown cliquable
      markdown: nettoyer(
        item.replace(
          /<a\b[^>]*href="\/wiki\/([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi,
          (_, cible, texte) =>
            `[${nettoyer(texte)}](https://fr.wikipedia.org/wiki/${echapperUrl(cible)})`
        )
      ),
      // version nue : sert uniquement à décider si on garde la ligne
      brut: nettoyer(item)
    }))
    // on écarte les liens de navigation et les lignes trop courtes
    .filter(a => a.brut.length > 40 && !/^(archives|proposer|discussion)\b/i.test(a.brut))
    .map(a => a.markdown);
}

// Discord coupe un lien Markdown à la première parenthèse fermante
function echapperUrl(url) {
  return url.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function nettoyer(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&(eacute|egrave|ecirc|agrave|acirc|ccedil|ugrave|ocirc|icirc|iuml|euml|ouml|uuml|ntilde|oelig|aelig);/g,
      (_, e) => ENTITES[e])
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&') // toujours en dernier
    .replace(/\s+/g, ' ')
    .trim();
}

const ENTITES = {
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â',
  ccedil: 'ç', ugrave: 'ù', ocirc: 'ô', ouml: 'ö', icirc: 'î', iuml: 'ï',
  uuml: 'ü', ntilde: 'ñ', oelig: 'œ', aelig: 'æ'
};

// --- Mémoire des anecdotes déjà postées ---------------------------------
async function loadVues() {
  try {
    return JSON.parse(await readFile(VUES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// --- Envoi Discord ------------------------------------------------------
async function poster(texte) {
  const body = {
    username: 'Le saviez-vous ?',
    embeds: [
      {
        color: 0x5865f2,
        title: '💡 Le saviez-vous ?',
        description: texte,
        footer: { text: 'Wikipédia en français · CC BY-SA' },
        timestamp: new Date().toISOString()
      }
    ]
  };

  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`Discord a répondu ${res.status} : ${await res.text()}`);
}

// --- Programme principal ------------------------------------------------
if (!process.env.VITEST) {
  if (!WEBHOOK) throw new Error('Variable DISCORD_WEBHOOK absente');

  const anecdotes = await fetchAnecdotes();
  if (anecdotes.length === 0) {
    throw new Error(
      "Aucune anecdote extraite : la mise en page de la source a probablement changé."
    );
  }

  const vues = await loadVues();
  const nouvelles = anecdotes.filter(a => !vues.includes(a));

  // Les anecdotes restent ~3 jours sur l'accueil : s'il n'y a rien de neuf,
  // on ne poste rien plutôt que de radoter.
  if (nouvelles.length === 0) {
    console.log('Rien de nouveau aujourd\'hui, aucun message envoyé.');
    process.exit(0);
  }

  const choisie = nouvelles[Math.floor(Math.random() * nouvelles.length)];
  await poster(choisie);

  // On ne garde que les 200 dernières pour éviter que le fichier n'enfle
  await writeFile(VUES_FILE, JSON.stringify([...vues, choisie].slice(-200), null, 2));
  console.log('Anecdote publiée :', choisie);
}
