#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const rawPath = join(repoRoot, "goethe-generated-lists", "goethe-b1-recognition.raw.json");
const bookPath = join(repoRoot, "b1-book-begegnungen.json");
const outputDir = join(repoRoot, "goethe-generated-lists", "study");
const translationListPaths = [
  join(repoRoot, "prev_list", "A1.json"),
  join(repoRoot, "prev_list", "A2.json"),
  join(repoRoot, "prev_list", "B1.json"),
  join(repoRoot, "prev_list", "B2.json"),
];

const chapterRules = {
  1: ["zeit", "uhr", "stunde", "minute", "tag", "woche", "monat", "jahr", "morgen", "abend", "mittag", "nacht", "früh", "spät", "pünktlich", "verspätung", "alltag", "täglich", "freizeit", "hobby", "museum", "ausstellung", "kunst", "künstler", "bild", "maler", "veranstaltung", "einladung", "person", "name", "alter", "geburt", "adresse"],
  2: ["arbeit", "beruf", "firma", "büro", "chef", "kollege", "mitarbeiter", "angestellte", "arbeitsplatz", "arbeitsmarkt", "bewerbung", "stelle", "job", "praktikum", "gehalt", "lohn", "verdienen", "kündigen", "aufgabe", "auftrag", "termin", "telefon", "anruf", "anrufen", "absagen", "vereinbaren", "besprechung", "meinung", "vorschlag", "vorteil", "nachteil"],
  3: ["medium", "medien", "fernsehen", "fernseher", "sendung", "radio", "nachricht", "zeitung", "zeitschrift", "artikel", "buch", "roman", "autor", "lesen", "drucken", "drucker", "datei", "internet", "computer", "laptop", "online", "mail", "homepage", "blog", "chat", "film", "kamera", "foto", "bildschirm", "programm"],
  4: ["werbung", "anzeige", "prospekt", "angebot", "produkt", "ware", "kaufen", "einkaufen", "verkaufen", "geschäft", "laden", "markt", "supermarkt", "preis", "kosten", "rechnung", "bezahlen", "zahlung", "kasse", "rabatt", "qualität", "garantie", "umtauschen", "beschwerde", "beschweren", "reklamation", "liefern", "kunde", "bestellen", "verkäufer"],
  5: ["lernen", "sprache", "deutsch", "kurs", "unterricht", "schule", "schüler", "student", "studium", "universität", "hochschule", "lehrer", "prüfung", "test", "note", "zeugnis", "aufgabe", "lösung", "erklären", "üben", "buchstabe", "alphabet", "wörterbuch", "weiterbildung", "fehler", "grammatik", "regel", "kenntnis"],
  6: ["verkehr", "auto", "wagen", "bus", "bahn", "zug", "u-bahn", "s-bahn", "straßenbahn", "haltestelle", "bahnhof", "flug", "flughafen", "fahrkarte", "ticket", "fahrt", "fahren", "rad", "fahrrad", "reifen", "straße", "autobahn", "kreuzung", "abbiegen", "parken", "parkplatz", "unfall", "stau", "reise", "urlaub", "hotel", "koffer", "gepäck", "ausflug", "ankunft", "abfahrt"],
  7: ["gefühl", "fühlen", "glück", "glücklich", "traurig", "angst", "sorge", "ärger", "ärgern", "freude", "freuen", "stress", "nervös", "aufgeregt", "zufrieden", "mut", "hoffen", "hoffnung", "vermuten", "vielleicht", "wahrscheinlich", "sicher", "eigenschaft", "charakter", "freundlich", "höflich", "ehrlich", "geduld", "dumm", "klug", "böse", "streit"],
  8: ["essen", "trinken", "lebensmittel", "nahrungsmittel", "mahlzeit", "frühstück", "mittagessen", "abendessen", "restaurant", "gaststätte", "küche", "kochen", "backen", "rezept", "gericht", "speise", "getränk", "wasser", "kaffee", "tee", "bier", "wein", "milch", "brot", "käse", "fleisch", "fisch", "gemüse", "obst", "salat", "kartoffel", "suppe", "gewürz", "salz", "zucker", "hunger", "durst", "einladen", "einladung", "wunsch", "wünschen"],
};

const badTermPatterns = [
  /\b[1-9]\./,
  /\b[A-ZÄÖÜ][a-zäöüß]+[.!?]\s+[A-ZÄÖÜ]/,
  /\b(Das|Der|Die|Ich|Wir|Sie|Er|Es|Du|Mein|Meine|Im|Am|Zum|Zur)\b.*[.!?]/,
];

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalize(value) {
  return value.toLowerCase().normalize("NFC").replace(/[„“"()]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanExample(value) {
  return value
    .replace(/\(no example sentence extracted\)/g, "")
    .replace(/-\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCandidates(value) {
  const cleaned = cleanExample(value)
    .replace(/\b([1-9])\.\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /^[A-ZÄÖÜ0-9]/.test(sentence))
    .filter((sentence) => /[.!?]$/.test(sentence))
    .filter((sentence) => sentence.split(/\s+/).length >= 4)
    .filter((sentence) => sentence.length <= 180);
}

function answerNeedles(answer, term = "") {
  const withoutArticle = answer.replace(/^(der|die|das)\s+/i, "").trim();
  const parts = withoutArticle.split(/\s+/).filter((part) => part.length >= 3);
  const needles = [withoutArticle, ...parts];

  for (const part of term.split(/[,;]/)) {
    const cleaned = part
      .replace(/\([^)]*\)/g, " ")
      .replace(/\b(hat|ist)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 3) {
      needles.push(cleaned);
    }
    for (const word of cleaned.split(/\s+/)) {
      if (word.length >= 4 && !/^(der|die|das|sich|von|auf|mit)$/.test(word)) {
        needles.push(word);
      }
    }
  }

  if (/en$/.test(withoutArticle)) {
    needles.push(withoutArticle.replace(/en$/, ""));
  } else if (/n$/.test(withoutArticle)) {
    needles.push(withoutArticle.replace(/n$/, ""));
  }

  if (withoutArticle.startsWith("sich ")) {
    needles.push(withoutArticle.replace(/^sich\s+/, ""));
  }

  return [...new Set(needles.filter((needle) => needle.length >= 3))];
}

function sentenceHasNeedle(sentence, needles) {
  const haystack = normalize(sentence);
  return needles.some((needle) => {
    const normalizedNeedle = normalize(needle);
    if (normalizedNeedle.length < 3) return false;
    if (normalizedNeedle.length <= 5) {
      return new RegExp(`(^|\\s)${normalizedNeedle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s|[.!?,])`).test(haystack);
    }
    return haystack.includes(normalizedNeedle);
  });
}

function selectRemark(rawExample, answer, term) {
  const candidates = sentenceCandidates(rawExample);
  if (candidates.length === 0) return "";

  const needles = answerNeedles(answer, term);
  const matched = candidates.find((sentence) => sentenceHasNeedle(sentence, needles));

  return matched ?? "";
}

function firstCleanPart(value) {
  return value.split(/[;,]/)[0].replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

function canonicalAnswer(term) {
  let cleaned = term
    .replace(/\s*→.*$/, "")
    .replace(/\s+[A-Z],\s*[A-Z]:.*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.startsWith("(sich) ")) {
    return `sich ${firstCleanPart(cleaned.replace("(sich) ", ""))}`;
  }

  const nounMatch = cleaned.match(/^(der|die|das)\s+([^,/(]+)/i);
  if (nounMatch) {
    return `${nounMatch[1].toLowerCase()} ${nounMatch[2].trim()}`;
  }

  return firstCleanPart(cleaned);
}

function termLooksUsable(term, answer) {
  if (!answer || answer.length < 2) return false;
  if (answer.length > 42) return false;
  if (badTermPatterns.some((pattern) => pattern.test(term))) return false;
  if (/^[=–-]+$/.test(answer)) return false;
  return true;
}

function dictionaryKey(value) {
  return normalize(value)
    .replace(/^(der|die|das)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTranslationMap() {
  const translations = new Map();

  for (const path of translationListPaths) {
    if (!existsSync(path)) continue;
    const items = JSON.parse(readFileSync(path, "utf8"));
    for (const item of items) {
      if (!item.LHS || !item.RHS) continue;
      const key = dictionaryKey(item.RHS);
      if (!translations.has(key)) {
        translations.set(key, item.LHS.trim());
      }
    }
  }

  return translations;
}

function lookupEnglish(answer, term, translations) {
  const candidates = [
    answer,
    answer.replace(/^sich\s+/, ""),
    answer.replace(/^(der|die|das)\s+/i, ""),
    firstCleanPart(term),
    firstCleanPart(term).replace(/^sich\s+/, ""),
  ];

  for (const candidate of candidates) {
    const english = translations.get(dictionaryKey(candidate));
    if (english) return english;
  }

  return "";
}

function toStudyCard(card, translations) {
  const answer = canonicalAnswer(card.LHS);
  const remarks = selectRemark(card.RHS, answer, card.LHS);
  const english = lookupEnglish(answer, card.LHS, translations);

  if (!english || !remarks || !termLooksUsable(card.LHS, answer)) {
    return null;
  }

  return {
    LHS: english,
    RHS: answer,
    remarks,
  };
}

function scoreCard(card, keywords) {
  const haystack = normalize(`${card.LHS} ${card.RHS} ${card.remarks ?? ""}`);
  return keywords.reduce((score, keyword) => score + (haystack.includes(normalize(keyword)) ? 1 : 0), 0);
}

function uniqueCards(cards) {
  const seen = new Set();
  return cards.filter((card) => {
    const key = `${card.LHS}\u0000${card.RHS}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

const rawCards = JSON.parse(readFileSync(rawPath, "utf8"));
const book = JSON.parse(readFileSync(bookPath, "utf8"));
const translations = buildTranslationMap();
const studyCards = uniqueCards(rawCards.map((card) => toStudyCard(card, translations)).filter(Boolean));
const noEnglishCards = rawCards
  .map((card) => {
    const answer = canonicalAnswer(card.LHS);
    const remarks = selectRemark(card.RHS, answer, card.LHS);
    if (!remarks || !termLooksUsable(card.LHS, answer)) return null;
    if (lookupEnglish(answer, card.LHS, translations)) return null;
    return { RHS: answer, remarks };
  })
  .filter(Boolean);

if (existsSync(outputDir)) {
  for (const file of readdirSync(outputDir)) {
    rmSync(join(outputDir, file), { recursive: true, force: true });
  }
}
mkdirSync(outputDir, { recursive: true });

writeJson(join(outputDir, "goethe-b1-study-all.app.json"), studyCards);
writeJson(join(outputDir, "needs-english-translation.review.json"), uniqueCards(noEnglishCards));

const matchedKeys = new Set();
const summary = [];

for (const chapter of book.chapters) {
  const rules = chapterRules[chapter.id] ?? [];
  const matched = studyCards
    .map((card) => ({ card, score: scoreCard(card, rules) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.card.RHS.localeCompare(b.card.RHS, "de"))
    .map((entry) => entry.card);

  for (const card of matched) {
    matchedKeys.add(`${card.LHS}\u0000${card.RHS}`);
  }

  const fileName = `begegnungen-${String(chapter.id).padStart(2, "0")}-${slugify(chapter.title)}.app.json`;
  writeJson(join(outputDir, fileName), matched);
  summary.push({ chapter, count: matched.length, fileName });
}

const unmatched = studyCards.filter((card) => !matchedKeys.has(`${card.LHS}\u0000${card.RHS}`));
writeJson(join(outputDir, "begegnungen-unmatched.app.json"), unmatched);

const readme = [
  "# Goethe B1 Study Lists",
  "",
  "These files follow the app's LLM prompt contract more closely than the raw extraction:",
  "- `LHS` is an English prompt from the existing `prev_list` translations.",
  "- `RHS` is one exact German answer.",
  "- `remarks` is a full German example sentence from the Goethe list.",
  "- `remarksEN` and `TTS` are omitted.",
  "- Cards without an English prompt are written to `needs-english-translation.review.json`, not imported into chapter lists.",
  "",
  "| List | Cards | File |",
  "| --- | ---: | --- |",
  `| All cleaned study cards | ${studyCards.length} | goethe-b1-study-all.app.json |`,
  `| Needs English translation | ${uniqueCards(noEnglishCards).length} | needs-english-translation.review.json |`,
  ...summary.map(({ chapter, count, fileName }) => `| ${chapter.id}. ${chapter.title} | ${count} | ${fileName} |`),
  `| Unmatched | ${unmatched.length} | begegnungen-unmatched.app.json |`,
  "",
  "This is still generated from PDF examples, so manual cleanup is useful for high-priority chapters.",
  "",
].join("\n");

writeFileSync(join(outputDir, "README.md"), readme);

console.log(`Generated ${studyCards.length} translation study cards in ${outputDir}`);
console.log(`Needs English translation: ${uniqueCards(noEnglishCards).length}`);
for (const row of summary) {
  console.log(`${row.chapter.id}. ${row.chapter.title}: ${row.count}`);
}
console.log(`Unmatched: ${unmatched.length}`);
