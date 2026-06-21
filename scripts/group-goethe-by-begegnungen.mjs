#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const inputPath = join(repoRoot, "goethe-generated-lists", "goethe-b1-recognition.raw.json");
const chaptersPath = join(repoRoot, "b1-book-begegnungen.json");
const outputDir = join(repoRoot, "goethe-generated-lists", "begegnungen");

const chapterRules = {
  1: [
    "zeit", "uhr", "stunde", "minute", "tag", "woche", "monat", "jahr", "morgen", "abend", "mittag",
    "nacht", "früh", "spät", "pünktlich", "verspätung", "termin", "alltag", "täglich", "freizeit",
    "hobby", "museum", "ausstellung", "kunst", "künstler", "bild", "maler", "zeichnen", "veranstaltung",
    "einladung", "tätigkeit", "person", "name", "alter", "geburt", "adresse", "wohnen"
  ],
  2: [
    "arbeit", "beruf", "firma", "büro", "chef", "kollege", "mitarbeiter", "angestellte", "arbeitsplatz",
    "arbeitsmarkt", "bewerbung", "stelle", "job", "ausbildung", "praktikum", "gehalt", "lohn", "verdienen",
    "kündigen", "kündigung", "aufgabe", "auftrag", "termin", "telefon", "anruf", "anrufen", "absagen",
    "vereinbaren", "besprechung", "sitzung", "meinung", "vorschlag", "vorteil", "nachteil"
  ],
  3: [
    "medium", "medien", "fernsehen", "fernseher", "sendung", "radio", "nachricht", "zeitung", "zeitschrift",
    "artikel", "buch", "roman", "autor", "lesen", "drucken", "drucker", "druck", "datei", "internet",
    "computer", "laptop", "online", "mail", "e-mail", "homepage", "blog", "chat", "film", "kamera",
    "foto", "bildschirm", "programm"
  ],
  4: [
    "werbung", "anzeige", "prospekt", "angebot", "produkt", "ware", "kaufen", "einkaufen", "verkaufen",
    "geschäft", "laden", "markt", "supermarkt", "preis", "kosten", "rechnung", "bezahlen", "zahlung",
    "kasse", "rabatt", "qualität", "garantie", "umtauschen", "beschwerde", "beschweren", "reklamation",
    "liefern", "lieferung", "kunde", "bestellen", "bestellung", "verkäufer"
  ],
  5: [
    "lernen", "sprache", "deutsch", "kurs", "unterricht", "schule", "schüler", "student", "studium",
    "universität", "hochschule", "lehrer", "prüfung", "test", "note", "zeugnis", "aufgabe", "lösung",
    "erklären", "üben", "buchstabe", "alphabet", "wörterbuch", "weiterbildung", "auswendig", "fehler",
    "grammatik", "regel", "kenntnis"
  ],
  6: [
    "verkehr", "auto", "wagen", "bus", "bahn", "zug", "u-bahn", "s-bahn", "straßenbahn", "haltestelle",
    "bahnhof", "flug", "flughafen", "fahrkarte", "ticket", "fahrt", "fahren", "rad", "fahrrad", "reifen",
    "straße", "autobahn", "kreuzung", "abbiegen", "parken", "parkplatz", "unfall", "stau", "reise",
    "urlaub", "hotel", "koffer", "gepäck", "ausflug", "ankunft", "abfahrt", "abfahren"
  ],
  7: [
    "gefühl", "fühlen", "glück", "glücklich", "traurig", "angst", "sorge", "ärger", "ärgern", "freude",
    "freuen", "stress", "nervös", "aufgeregt", "zufrieden", "unzufrieden", "mut", "hoffen", "hoffnung",
    "vermuten", "vielleicht", "wahrscheinlich", "sicher", "eigenschaft", "charakter", "freundlich",
    "höflich", "ehrlich", "geduld", "geduldig", "dumm", "klug", "böse", "streit"
  ],
  8: [
    "essen", "trinken", "lebensmittel", "nahrungsmittel", "mahlzeit", "frühstück", "mittagessen",
    "abendessen", "restaurant", "gaststätte", "küche", "kochen", "backen", "rezept", "gericht", "speise",
    "getränk", "wasser", "kaffee", "tee", "bier", "wein", "milch", "brot", "käse", "fleisch", "fisch",
    "gemüse", "obst", "salat", "kartoffel", "suppe", "gewürz", "salz", "zucker", "hunger", "durst",
    "einladen", "einladung", "wunsch", "wünschen"
  ],
};

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFC")
    .replace(/[„“"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAppCard(card, chapterTitle) {
  const remarks = [card.remarks, `Begegnungen B1+: ${chapterTitle}`].filter(Boolean).join(" | ");
  return {
    LHS: card.LHS,
    RHS: card.RHS,
    remarks,
    TTS: card.TTS,
  };
}

function scoreCard(card, keywords) {
  const haystack = normalize(`${card.LHS} ${card.RHS}`);
  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    if (haystack.includes(normalizedKeyword)) {
      score += normalizedKeyword.length > 6 ? 2 : 1;
    }
  }

  return score;
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

const cards = JSON.parse(readFileSync(inputPath, "utf8"));
const book = JSON.parse(readFileSync(chaptersPath, "utf8"));

mkdirSync(outputDir, { recursive: true });
if (existsSync(outputDir)) {
  for (const file of readdirSync(outputDir)) {
    if (/\.json$|README\.md$/.test(file)) {
      unlinkSync(join(outputDir, file));
    }
  }
}

const matchedKeys = new Set();
const summaryRows = [];

for (const chapter of book.chapters) {
  const rules = chapterRules[chapter.id] ?? [];
  const matched = uniqueCards(
    cards
      .map((card) => ({ card, score: scoreCard(card, rules) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.card.LHS.localeCompare(b.card.LHS, "de"))
      .map((entry) => entry.card)
  );

  for (const card of matched) {
    matchedKeys.add(`${card.LHS}\u0000${card.RHS}`);
  }

  const fileName = `begegnungen-${String(chapter.id).padStart(2, "0")}-${slugify(chapter.title)}.app.json`;
  writeFileSync(
    join(outputDir, fileName),
    JSON.stringify(matched.map((card) => toAppCard(card, chapter.title)), null, 2)
  );
  summaryRows.push({ chapter, count: matched.length, fileName, keywords: rules.length });
}

const unmatched = cards.filter((card) => !matchedKeys.has(`${card.LHS}\u0000${card.RHS}`));
writeFileSync(
  join(outputDir, "begegnungen-unmatched.app.json"),
  JSON.stringify(unmatched.map((card) => toAppCard(card, "unmatched")), null, 2)
);

const readme = [
  "# Begegnungen B1+ Goethe Groups",
  "",
  "Generated from `goethe-generated-lists/goethe-b1-recognition.raw.json` using keyword rules in `scripts/group-goethe-by-begegnungen.mjs`.",
  "Cards can appear in more than one chapter when they match multiple themes.",
  "",
  "| Chapter | Cards | File |",
  "| --- | ---: | --- |",
  ...summaryRows.map(
    ({ chapter, count, fileName }) => `| ${chapter.id}. ${chapter.title} | ${count} | ${fileName} |`
  ),
  `| Unmatched | ${unmatched.length} | begegnungen-unmatched.app.json |`,
  "",
  "This is a rule-based first pass. It is designed for fast study grouping, not perfect lexicographic classification.",
  "",
].join("\n");

writeFileSync(join(outputDir, "README.md"), readme);

console.log(`Generated ${summaryRows.length} chapter files in ${outputDir}`);
for (const row of summaryRows) {
  console.log(`${row.chapter.id}. ${row.chapter.title}: ${row.count}`);
}
console.log(`Unmatched: ${unmatched.length}`);
