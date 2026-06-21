#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outputDir = "goethe-generated-lists/llm-study";
const ignoredPath = join(outputDir, "ignored-failures.json");

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function inputKey(item) {
  return `${item.LHS}\u0000${item.RHS}`;
}

function withoutSource(records) {
  return records.map(({ LHS, RHS, remarks, remarksEN }) => ({ LHS, RHS, remarks, remarksEN }));
}

const fixes = [
  {
    match: "das/der Zvieri/Znüni",
    card: {
      LHS: "snack, light meal (Swiss)",
      RHS: "das Zvieri",
      remarks: "Es ist Zeit für ein kleines Zvieri.",
      remarksEN: "It is time for a small snack.",
    },
  },
  {
    match: "der Personenstand",
    card: {
      LHS: "civil status",
      RHS: "der Personenstand",
      remarks: "Bei Personenstand musst du ledig ankreuzen.",
      remarksEN: "For civil status, you have to tick single.",
    },
  },
  {
    match: "in Pension gehen/sein",
    card: {
      LHS: "to retire, to go into retirement",
      RHS: "in Pension gehen",
      remarks: "Ich gehe Ende des Jahres in Pension.",
      remarksEN: "I am retiring at the end of the year.",
    },
  },
  {
    match: "in Rente gehen/sein",
    card: {
      LHS: "to retire, to go into retirement",
      RHS: "in Rente gehen",
      remarks: "Ich gehe Ende des Jahres in Rente.",
      remarksEN: "I am retiring at the end of the year.",
    },
  },
  {
    match: "möglichst",
    card: {
      LHS: "as soon as possible, preferably",
      RHS: "möglichst",
      remarks: "Wir suchen eine Wohnung, möglichst im Erdgeschoss.",
      remarksEN: "We are looking for an apartment, preferably on the ground floor.",
    },
  },
  {
    match: "pensioniert werden/sein",
    card: {
      LHS: "to be retired, to retire",
      RHS: "pensioniert werden",
      remarks: "Ich werde Ende des Jahres pensioniert.",
      remarksEN: "I will retire at the end of the year.",
    },
  },
  {
    match: "(sich etwas) kaufen",
    card: {
      LHS: "to buy",
      RHS: "kaufen",
      remarks: "Ich habe mir einen Pullover gekauft.",
      remarksEN: "I bought myself a sweater.",
    },
  },
  {
    match: "Sonderdas Sonderangebot",
    card: {
      LHS: "special offer, bargain",
      RHS: "das Sonderangebot",
      remarks: "Das ist ein Sonderangebot: 25 % reduziert.",
      remarksEN: "This is a special offer: 25% off.",
    },
  },
  {
    match: "die/das Glace/Glacé",
    card: {
      LHS: "ice cream (Swiss)",
      RHS: "das Glace",
      remarks: "Zum Dessert gibt es Schokoladenglace.",
      remarksEN: "There is chocolate ice cream for dessert.",
    },
  },
  {
    match: "Früchte",
    card: {
      LHS: "fruit (Swiss)",
      RHS: "Früchte",
      remarks: "Früchte kaufe ich am liebsten auf dem Markt.",
      remarksEN: "I prefer buying fruit at the market.",
    },
  },
  {
    match: "herunter-, runter(herunter-)laden",
    card: {
      LHS: "to download",
      RHS: "herunterladen",
      remarks: "Ich habe mir Musik aus dem Internet heruntergeladen.",
      remarksEN: "I downloaded music from the internet.",
    },
  },
  {
    match: "Öko(ökologisch)",
    card: {
      LHS: "ecological, eco",
      RHS: "ökologisch",
      remarks: "Ökologischer Anbau ist gut für die Umwelt.",
      remarksEN: "Ecological farming is good for the environment.",
    },
  },
  {
    match: "Hauptdie Hauptstadt",
    card: {
      LHS: "capital city",
      RHS: "die Hauptstadt",
      remarks: "Berlin ist die Hauptstadt von Deutschland.",
      remarksEN: "Berlin is the capital of Germany.",
    },
  },
  {
    match: "meist-, die meisten",
    card: {
      LHS: "most people, most of them",
      RHS: "die meisten",
      remarks: "Die meisten Nachbarn kenne ich noch nicht.",
      remarksEN: "I do not know most of the neighbors yet.",
    },
  },
  {
    match: "heraus-, raus(heraus-) finden",
    card: {
      LHS: "to find out",
      RHS: "herausfinden",
      remarks: "Hast du schon herausgefunden, wann der Kurs beginnt?",
      remarksEN: "Have you already found out when the course begins?",
    },
  },
  {
    match: "abfahren, fährt ab",
    card: {
      LHS: "to depart, to leave",
      RHS: "abfahren",
      remarks: "Der Zug fährt in zwanzig Minuten ab.",
      remarksEN: "The train departs in twenty minutes.",
    },
  },
  {
    match: "der Bahnhof",
    card: {
      LHS: "train station",
      RHS: "der Bahnhof",
      remarks: "Ich warte am Bahnhof auf den Zug.",
      remarksEN: "I am waiting for the train at the station.",
    },
  },
  {
    match: "Fahrkarte",
    card: {
      LHS: "ticket",
      RHS: "die Fahrkarte",
      remarks: "Ich muss noch eine Fahrkarte kaufen.",
      remarksEN: "I still have to buy a ticket.",
    },
  },
  {
    match: "gefährlich",
    card: {
      LHS: "dangerous",
      RHS: "gefährlich",
      remarks: "Du darfst nicht bei Rot über die Straße gehen. Das ist gefährlich.",
      remarksEN: "You must not cross the street on red. That is dangerous.",
    },
  },
  {
    match: "rückdie Rückfahrt",
    card: {
      LHS: "return trip, return journey",
      RHS: "die Rückfahrt",
      remarks: "Auf der Rückfahrt besuche ich meine Eltern.",
      remarksEN: "On the return trip, I will visit my parents.",
    },
  },
  {
    match: "bio(logisch)",
    card: {
      LHS: "organic, biological",
      RHS: "biologisch",
      remarks: "Biologische Lebensmittel gibt es jetzt auch im Supermarkt.",
      remarksEN: "Organic food is now also available in the supermarket.",
    },
  },
  {
    match: "Speise-/-speise",
    card: {
      LHS: "starter, appetizer",
      RHS: "die Vorspeise",
      remarks: "Als Vorspeise nehme ich eine Suppe.",
      remarksEN: "For a starter, I will have a soup.",
    },
  },
  {
    match: "veröffentlichen, veröffentlicht",
    card: {
      LHS: "to publish",
      RHS: "veröffentlichen",
      remarks: "Die Zeitung veröffentlicht morgen einen neuen Artikel.",
      remarksEN: "The newspaper is publishing a new article tomorrow.",
    },
  },
  {
    match: "(hinunter) runterwerfen",
    card: {
      LHS: "to throw down",
      RHS: "runterwerfen",
      remarks: "Kannst du mir bitte den Schlüssel runterwerfen?",
      remarksEN: "Can you please throw the key down to me?",
    },
  },
  {
    match: "bitte",
    card: {
      LHS: "please",
      RHS: "bitte",
      remarks: "Sprechen Sie bitte langsam.",
      remarksEN: "Please speak slowly.",
    },
  },
  {
    match: "der Kandidat",
    card: {
      LHS: "candidate",
      RHS: "der Kandidat",
      remarks: "Der Kandidat bereitet sich auf die Prüfung vor.",
      remarksEN: "The candidate is preparing for the exam.",
    },
  },
  {
    match: "weinen, weint",
    card: {
      LHS: "to cry",
      RHS: "weinen",
      remarks: "Bitte nicht weinen.",
      remarksEN: "Please do not cry.",
    },
  },
  {
    match: "zusagen, sagt zu",
    card: {
      LHS: "to accept, to agree",
      RHS: "zusagen",
      remarks: "Meine Eltern haben uns zum Essen eingeladen. Ich habe zugesagt.",
      remarksEN: "My parents invited us to dinner. I accepted.",
    },
  },
];

const ignoredMatches = ["Goethe-Institut e.V. Dachauer Straße 122"];
const ignored = readJson(ignoredPath, []);
const files = readdirSync(outputDir).filter((file) => file.endsWith(".failures.json")).sort();
let fixedCount = 0;
let ignoredCount = 0;

for (const failuresFile of files) {
  const prefix = failuresFile.replace(".failures.json", "");
  const failuresPath = join(outputDir, failuresFile);
  const statePath = join(outputDir, `${prefix}.state.json`);
  const appPath = join(outputDir, `${prefix}.app.json`);
  const failures = readJson(failuresPath, []);
  const state = readJson(statePath, []);
  const existing = new Set(state.map((record) => record.inputKey));
  const remaining = [];

  for (const failure of failures) {
    const sourceEntry = failure.source?.LHS ?? "";
    const ignoredMatch = ignoredMatches.find((match) => sourceEntry.includes(match));
    if (ignoredMatch) {
      ignored.push({ ...failure, ignoredAt: new Date().toISOString(), reason: "PDF footer/address noise" });
      ignoredCount++;
      continue;
    }

    const fix = fixes.find((candidate) => sourceEntry.includes(candidate.match));
    if (!fix) {
      remaining.push(failure);
      continue;
    }

    const record = {
      inputKey: failure.inputKey ?? inputKey(failure.source),
      ...fix.card,
      source: {
        germanEntry: failure.source?.LHS ?? "",
        goetheExample: failure.source?.RHS ?? "",
      },
    };

    if (!existing.has(record.inputKey)) {
      state.push(record);
      existing.add(record.inputKey);
      fixedCount++;
    }
  }

  writeJson(statePath, state);
  writeJson(appPath, withoutSource(state));
  writeJson(failuresPath, remaining);
}

writeJson(ignoredPath, ignored);
console.log(`Fixed ${fixedCount} failures.`);
console.log(`Ignored ${ignoredCount} failures.`);
