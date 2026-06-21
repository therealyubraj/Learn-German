#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pdfPath = join(repoRoot, "Goethe-Zertifikat_B1_Wortliste.pdf");
const outputDir = join(repoRoot, "goethe-generated-lists");

const FIRST_VOCAB_PAGE = 16;
const LAST_VOCAB_PAGE = 104;

function parseTsv(tsv) {
  const rows = [];
  const lines = tsv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split("\t") ?? [];

  for (const line of lines) {
    const cells = line.split("\t");
    const row = Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""]));
    if (row.level !== "5" || !row.text || row.text === "###PAGE###") continue;

    rows.push({
      page: Number(row.page_num),
      par: Number(row.par_num),
      block: Number(row.block_num),
      line: Number(row.line_num),
      word: Number(row.word_num),
      left: Number(row.left),
      top: Number(row.top),
      text: row.text,
    });
  }

  return rows;
}

function buildLineChunks(words) {
  const grouped = new Map();

  for (const word of words) {
    const key = `${word.page}:${word.par}:${word.block}:${word.line}`;
    const group = grouped.get(key) ?? {
      page: word.page,
      left: word.left,
      top: word.top,
      words: [],
    };
    group.left = Math.min(group.left, word.left);
    group.top = Math.min(group.top, word.top);
    group.words.push(word);
    grouped.set(key, group);
  }

  return [...grouped.values()]
    .map((group) => {
      const text = group.words
        .sort((a, b) => a.word - b.word)
        .map((word) => word.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      return { page: group.page, left: group.left, top: group.top, text };
    })
    .filter((flow) => flow.text.length > 0);
}

function isNoise(flow) {
  if (flow.top < 45 || flow.top > 790) return true;
  if (/^(VS_03|WORTLISTE|ZERTIFIKAT B1|\d+|[A-ZÄÖÜ])$/.test(flow.text)) return true;
  if (/^\d+\s+WORTLISTE$/.test(flow.text)) return true;
  if (/^WORTLISTE\s+\d+$/.test(flow.text)) return true;
  if (/^Alphabetischer Wortschatz$/.test(flow.text)) return true;
  if (/^2\s+Alphabetischer Wortschatz$/.test(flow.text)) return true;
  return false;
}

function slotFor(flow) {
  if (flow.left < 125) return "left-term";
  if (flow.left < 290) return "left-example";
  if (flow.left < 410) return "right-term";
  return "right-example";
}

function isTermSlot(slot) {
  return slot === "left-term" || slot === "right-term";
}

function exampleSlotFor(slot) {
  return slot === "left-term" ? "left-example" : "right-example";
}

function likelyTerm(text) {
  if (text.length < 2) return false;
  if (/^\d+(\.\d+)?\s+/.test(text)) return false;
  if (/^[1-9]\./.test(text)) return false;
  if (/^(Deutschland|Österreich|Schweiz)$/.test(text)) return false;
  if (/^(D|A|CH):/.test(text)) return false;
  if (/^[-–=]+$/.test(text)) return false;
  return true;
}

function ttsFromTerm(term) {
  return term
    .replace(/\s*→.*$/, "")
    .replace(/\([^)]*\)/g, "")
    .split(",")[0]
    .replace(/^(der|die|das)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupByPage(flows) {
  const pages = new Map();
  for (const flow of flows) {
    const page = pages.get(flow.page) ?? [];
    page.push(flow);
    pages.set(flow.page, page);
  }
  return pages;
}

function normalizeSentence(text) {
  return text
    .replace(/-\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupColumnEntries(chunks, termSlot, exampleSlot) {
  const termChunks = chunks
    .filter((chunk) => chunk.slot === termSlot && likelyTerm(chunk.text))
    .sort((a, b) => a.top - b.top || a.left - b.left);
  const exampleChunks = chunks
    .filter((chunk) => chunk.slot === exampleSlot)
    .sort((a, b) => a.top - b.top || a.left - b.left);

  const starts = [];
  let previousTerm = null;
  for (const term of termChunks) {
    const hasAlignedExample = exampleChunks.some((example) => Math.abs(example.top - term.top) <= 6);
    const previous = starts[starts.length - 1];
    const continuesPreviousTerm =
      previousTerm &&
      term.top - previousTerm.top <= 14 &&
      Math.abs(term.left - previousTerm.left) <= 45;

    if (!continuesPreviousTerm && (!previous || hasAlignedExample || term.top - previous.top > 18)) {
      starts.push(term);
    }
    previousTerm = term;
  }

  return starts
    .map((start, index) => {
      const nextStart = starts[index + 1];
      const endTop = nextStart ? nextStart.top : start.top + 220;
      const termText = termChunks
        .filter((term) => term.top >= start.top - 1 && term.top < endTop - 1)
        .map((term) => term.text)
        .join(" ");
      const exampleText = exampleChunks
        .filter((example) => example.top >= start.top - 1 && example.top < endTop - 1)
        .map((example) => example.text)
        .join(" ");

      return {
        page: start.page,
        left: start.left,
        top: start.top,
        slot: termSlot,
        text: normalizeSentence(termText),
        example: normalizeSentence(exampleText),
      };
    })
    .filter((entry) => likelyTerm(entry.text));
}

function extractCards(chunks) {
  const pages = groupByPage(chunks.filter((flow) => !isNoise(flow)));
  const cards = [];

  for (const [pageNumber, pageFlows] of pages.entries()) {
    if (pageNumber < FIRST_VOCAB_PAGE || pageNumber > LAST_VOCAB_PAGE) continue;

    const enriched = pageFlows
      .map((flow) => ({ ...flow, slot: slotFor(flow) }))
      .sort((a, b) => a.top - b.top || a.left - b.left);

    const entries = [
      ...groupColumnEntries(enriched, "left-term", "left-example"),
      ...groupColumnEntries(enriched, "right-term", "right-example"),
    ].sort((a, b) => a.top - b.top || a.left - b.left);

    for (const term of entries) {
      const example = term.example;
      cards.push({
        LHS: term.text,
        RHS: example || "(no example sentence extracted)",
        remarks: `Goethe B1 Wortliste, PDF page ${pageNumber}, ${term.slot.replace("-term", " column")}`,
        TTS: ttsFromTerm(term.text),
        source: {
          pdfPage: pageNumber,
          column: term.slot.startsWith("left") ? "left" : "right",
          top: Math.round(term.top),
          rawTerm: term.text,
          rawExample: example,
        },
      });
    }
  }

  return cards;
}

function chunkCards(cards, size) {
  const chunks = [];
  for (let index = 0; index < cards.length; index += size) {
    chunks.push(cards.slice(index, index + size));
  }
  return chunks;
}

function toAppCards(cards) {
  return cards.map(({ LHS, RHS, remarks, TTS }) => ({ LHS, RHS, remarks, TTS }));
}

function isPrefixedVerbCard(card) {
  return /^(\(sich\)\s*)?(ab|an|auf|aus|bei|ein|fern|fest|her|hin|los|mit|nach|statt|teil|um|vor|weg|weiter|zu|zurück|zusammen)[a-zäöüß]+,\s/.test(
    card.LHS
  );
}

const tsv = execFileSync("pdftotext", ["-tsv", pdfPath, "-"], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

const cards = extractCards(buildLineChunks(parseTsv(tsv)));
const activeRecallCards = cards.map((card) => ({
  ...card,
  LHS: card.RHS,
  RHS: card.LHS,
}));
const prefixedVerbCards = cards.filter(isPrefixedVerbCard);

mkdirSync(outputDir, { recursive: true });
if (existsSync(outputDir)) {
  for (const file of readdirSync(outputDir)) {
    if (/^goethe-b1-.*\.json$/.test(file)) {
      unlinkSync(join(outputDir, file));
    }
  }
}
writeFileSync(join(outputDir, "goethe-b1-recognition.raw.json"), JSON.stringify(cards, null, 2));
writeFileSync(join(outputDir, "goethe-b1-recognition.app.json"), JSON.stringify(toAppCards(cards), null, 2));
writeFileSync(join(outputDir, "goethe-b1-active-recall.app.json"), JSON.stringify(toAppCards(activeRecallCards), null, 2));
writeFileSync(
  join(outputDir, "goethe-b1-prefixed-verbs.app.json"),
  JSON.stringify(toAppCards(prefixedVerbCards), null, 2)
);

chunkCards(cards, 100).forEach((chunk, index) => {
  const number = String(index + 1).padStart(2, "0");
  writeFileSync(
    join(outputDir, `goethe-b1-recognition-${number}.app.json`),
    JSON.stringify(toAppCards(chunk), null, 2)
  );
});

const summary = [
  "# Goethe B1 Extraction",
  "",
  `Source: ${pdfPath}`,
  `Generated cards: ${cards.length}`,
  `Generated prefixed verb cards: ${prefixedVerbCards.length}`,
  "",
  "Files:",
  "- goethe-b1-recognition.app.json: German term -> Goethe example sentence",
  "- goethe-b1-active-recall.app.json: Goethe example sentence -> German term",
  "- goethe-b1-prefixed-verbs.app.json: derived list for prefixed/separable verbs",
  "- goethe-b1-recognition-XX.app.json: recognition cards split into batches of 100",
  "- goethe-b1-recognition.raw.json: same cards with source coordinates for cleanup",
  "",
  "This is an automated first pass from the alphabetic vocabulary section. Review/cleanup is still expected before treating it as final exam material.",
  "",
].join("\n");

writeFileSync(join(outputDir, "README.md"), summary);

console.log(`Generated ${cards.length} cards in ${outputDir}`);
