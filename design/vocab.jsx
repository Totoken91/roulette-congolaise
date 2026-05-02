// vocab.jsx — banque de mots par défaut + helpers localStorage
// Liste assumée trash. Fournie par l'utilisateur, éditable dans Tweaks.

const DEFAULT_VOCAB = {
  actions: [
    "enculer", "fister", "tabasser", "lécher", "embrasser", "épiler",
    "épouser", "masser", "doigter", "dévorer", "câliner", "renifler",
    "chevaucher", "fouetter", "étrangler", "humilier", "torturer",
    "psychanalyser", "déshabiller", "engrosser", "kidnapper",
    "sodomiser", "gifler", "mordre", "vénérer",
  ],
  noms: [
    "Gérard Depardieu", "ton père", "ta mère", "le pape",
    "un chimpanzé en rut", "Jean-Marie Le Pen", "un troupeau de chèvres",
    "Patrick Sébastien", "ta belle-mère", "un livreur Uber Eats",
    "Vladimir Poutine", "un cactus géant", "un nain de jardin",
    "une mamie de 92 ans", "Cyril Hanouna", "ton prof de maths de 4e",
    "un poulpe radioactif", "Macron", "Donald Trump",
    "tout le RAID", "un troupeau de gendarmes", "ton boss",
    "un essaim de frelons", "le PSG au complet",
  ],
  adjectifs: [
    "violemment", "cordialement", "tendrement", "à sec",
    "en public", "sur scène à l'Olympia", "devant ta famille",
    "dans une station-service", "pendant 8 heures non-stop",
    "au ralenti", "en chantant la Marseillaise", "à reculons",
    "avec entrain", "passionnément", "professionnellement",
    "dans un kebab", "en direct sur TF1", "le dimanche après la messe",
    "au son de Patrick Sébastien", "avec amour", "très lentement",
    "à la chaîne", "sans préliminaires", "religieusement",
  ],
  recompenses: [
    "1 million d'euros", "la paix dans le monde", "un dé à coudre",
    "un trombone tordu", "une vie éternelle", "le Nobel de la paix",
    "un Kinder Surprise (sans le jouet)", "une PS5", "un câlin",
    "la fin du réchauffement climatique", "un bout de ficelle",
    "le respect de tes parents", "un chewing-gum déjà mâché",
    "une villa à Saint-Tropez", "un coupon -10% chez Lidl",
    "la réponse au sens de la vie", "un caillou", "rien du tout",
    "une médaille en chocolat", "le pouvoir absolu",
    "un yaourt périmé", "trois cacahuètes", "l'amour de ta vie",
    "une demi-baguette rassise",
  ],
};

const STORAGE_KEY = "rc_vocab_v1";
const HISTORY_KEY = "rc_history_v1";

function loadVocab() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_VOCAB);
    const parsed = JSON.parse(raw);
    // safety : merge si une clé manque
    return {
      actions: parsed.actions || DEFAULT_VOCAB.actions,
      noms: parsed.noms || DEFAULT_VOCAB.noms,
      adjectifs: parsed.adjectifs || DEFAULT_VOCAB.adjectifs,
      recompenses: parsed.recompenses || DEFAULT_VOCAB.recompenses,
    };
  } catch (e) {
    return structuredClone(DEFAULT_VOCAB);
  }
}

function saveVocab(v) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch (e) {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 100))); } catch (e) {}
}

const NAME_KEY = "rc_name_v1";
function loadName() {
  try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; }
}
function saveName(n) {
  try { localStorage.setItem(NAME_KEY, n || ""); } catch (e) {}
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollDestin(vocab) {
  return {
    action: pick(vocab.actions),
    nom: pick(vocab.noms),
    adjectif: pick(vocab.adjectifs),
    recompense: pick(vocab.recompenses),
  };
}

function formatDestin(d) {
  return `Se faire ${d.action} par ${d.nom} ${d.adjectif} pour ${d.recompense}`;
}

Object.assign(window, {
  DEFAULT_VOCAB, loadVocab, saveVocab, loadHistory, saveHistory,
  loadName, saveName,
  rollDestin, formatDestin, pick,
});
