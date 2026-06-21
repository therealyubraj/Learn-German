#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const inputDir = join(repoRoot, "goethe-generated-lists", "begegnungen");
const outputDir = join(repoRoot, "goethe-generated-lists", "llm-study");

const chapterFiles = {
  1: "begegnungen-01-zeit-und-zeitvertreib.app.json",
  2: "begegnungen-02-arbeit-und-beruf.app.json",
  3: "begegnungen-03-medien.app.json",
  4: "begegnungen-04-werbung-und-konsum.app.json",
  5: "begegnungen-05-lernen-lernen-und-nochmals-lernen.app.json",
  6: "begegnungen-06-verkehr-und-mobilitat.app.json",
  7: "begegnungen-07-gefuhle-und-eigenschaften.app.json",
  8: "begegnungen-08-essen-und-trinken.app.json",
};

const chapterTitles = {
  1: "Zeit und Zeitvertreib",
  2: "Arbeit und Beruf",
  3: "Medien",
  4: "Werbung und Konsum",
  5: "Lernen, lernen und nochmals lernen",
  6: "Verkehr und Mobilität",
  7: "Gefühle und Eigenschaften",
  8: "Essen und trinken",
};

function parseArgs(argv) {
  const args = {
    batchSize: 16,
    chapter: null,
    keepAlive: "30m",
    limit: null,
    model: "qwen3.5:9b",
    numCtx: 4096,
    repairFailures: false,
    reset: false,
    start: 0,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--all") {
      args.chapter = "all";
    } else if (arg === "--chapter") {
      args.chapter = Number(next);
      index++;
    } else if (arg === "--limit") {
      args.limit = Number(next);
      index++;
    } else if (arg === "--batch-size") {
      args.batchSize = Number(next);
      index++;
    } else if (arg === "--model") {
      args.model = next;
      index++;
    } else if (arg === "--keep-alive") {
      args.keepAlive = next;
      index++;
    } else if (arg === "--num-ctx") {
      args.numCtx = Number(next);
      index++;
    } else if (arg === "--repair-failures") {
      args.repairFailures = true;
    } else if (arg === "--reset") {
      args.reset = true;
    } else if (arg === "--start") {
      args.start = Number(next);
      index++;
    }
  }

  if (args.chapter !== "all" && (!args.chapter || !chapterFiles[args.chapter])) {
    throw new Error("Usage: node scripts/generate-goethe-llm-study.mjs --chapter <1-8>|--all [--limit n] [--batch-size n] [--start n] [--reset] [--num-ctx n]");
  }

  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanExample(value) {
  return value
    .replace(/\b([1-9])\.\s+/g, "")
    .replace(/\(no example sentence extracted\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inputKey(item) {
  return `${item.LHS}\u0000${item.RHS}`;
}

function normalizeOptionalEntry(value) {
  return value.replace(/\(([^)]+)-\)(\S+)/g, "$1$2");
}

function canonicalFirstEntryPart(sourceEntry) {
  return normalizeOptionalEntry(sourceEntry.split(",")[0].replace(/^\(sich\)\s*/, "").trim());
}

function canonicalRhsCandidates(sourceEntry) {
  const candidates = new Set([canonicalFirstEntryPart(sourceEntry)]);
  for (const match of sourceEntry.matchAll(/\(([^)]+)-\)([A-Za-zÄÖÜäöüß]+)/g)) {
    candidates.add(`${match[1]}${match[2]}`);
  }
  for (const match of sourceEntry.matchAll(/([A-Za-zÄÖÜäöüß]+)\([^)]*-\)([A-Za-zÄÖÜäöüß]+)/g)) {
    candidates.add(`${match[1]}${match[2]}`);
  }
  return [...candidates].filter(Boolean);
}

function formatEntries(batch) {
  return batch
    .map(
      (item, index) => `${index + 1}. German entry: ${item.LHS}
Goethe example: ${cleanExample(item.RHS)}`
    )
    .join("\n\n");
}

function buildPrompt(batch) {
  const entries = formatEntries(batch);

  return `You are preparing quiz items for a German vocabulary app.

Return a JSON array with exactly ${batch.length} objects, one object for each input entry, in the same order.

Each object must have exactly these fields: LHS, RHS, remarks, remarksEN.

CRITICAL RHS rules:
- RHS is the exact German answer the learner must type.
- For verbs, RHS MUST be the infinitive / Grundform from the German entry, NOT a conjugated form from the example sentence.
- Example: "verdienen, verdient, verdiente, hat verdient" -> RHS must be "verdienen", never "verdient".
- Example: "(sich) überzeugen, überzeugt, überzeugte, hat überzeugt" -> RHS should be "überzeugen" or "sich überzeugen", never "überzeugt".
- Example: "angeben, gibt an, gab an, hat angegeben" -> RHS must be "angeben", never "geben ... an".
- Example: "aufstehen, steht auf, stand auf, ist aufgestanden" -> RHS must be "aufstehen", never "stehe ... auf".
- For optional forms like "(herunter-)fahren", choose one strict full form without parentheses, e.g. "herunterfahren".
- For nouns, RHS must be article + singular noun, e.g. "der Arbeitsplatz".
- RHS must not contain commas, slashes, conjugation lists, plural markers, parentheses, regional notes, ellipses, or explanations.

Other field rules:
- LHS: short English prompt/meaning shown to the learner.
- remarks: one full natural German example sentence from the provided Goethe example. The sentence should make the meaning of RHS obvious.
- remarksEN: English translation of the remarks sentence.

Quality rules:
- Keep LHS useful for studying, even if it contains two close meanings.
- Keep RHS strict and typeable.
- Prefer the most common canonical German answer from the German entry.
- If a German entry contains masculine and feminine person forms, choose the form that matches the example sentence.
- If the example contains multiple sentences, choose the clearest sentence for this exact word.
- Do not invent a new German example sentence unless the provided Goethe example is empty, fragmented, or clearly belongs to a different word. In that case, create one simple natural German sentence that makes RHS obvious.
- Return JSON only.

Input entries:
${entries}`;
}

function buildRepairPrompt(failures) {
  const entries = failures
    .map(
      (failure, index) => `${index + 1}. German entry: ${failure.source.LHS}
Goethe example: ${cleanExample(failure.source.RHS)}
Previous invalid output: ${JSON.stringify(failure.generated ?? null)}
Validation error: ${failure.message ?? "unknown error"}`
    )
    .join("\n\n");

  return `You are repairing failed quiz items for a German vocabulary app.

The previous attempt failed. Common mistakes from the previous attempt:
- It used a conjugated or split separable verb as RHS, such as "geben ... an" or "stehe ... auf". Use the infinitive from the German entry instead, such as "angeben" or "aufstehen".
- It copied parentheses or optional forms into RHS, such as "(herunter-)fahren". Choose one strict full answer without parentheses, such as "herunterfahren".
- It produced a card for the neighboring word instead of the current German entry. Stay aligned with the numbered German entry.
- It left remarks or remarksEN empty. Both must be non-empty complete sentences.
- It refused to make a sentence when the extracted Goethe example was fragmented or unrelated. In repair mode, create a simple natural German sentence if the provided example is unusable.
- It used slash-separated alternatives for masculine/feminine forms. Pick the one that matches the Goethe example; if unclear, pick the first canonical form.

Return a JSON array with exactly ${failures.length} objects, one object for each failed input entry, in the same order.

Each object must have exactly these fields: LHS, RHS, remarks, remarksEN.

CRITICAL RHS rules:
- RHS is the exact German answer the learner must type.
- For verbs, RHS MUST be the infinitive / Grundform from the German entry, NOT a conjugated form from the example sentence.
- Example: "verdienen, verdient, verdiente, hat verdient" -> RHS must be "verdienen", never "verdient".
- Example: "(sich) überzeugen, überzeugt, überzeugte, hat überzeugt" -> RHS should be "überzeugen" or "sich überzeugen", never "überzeugt".
- Example: "angeben, gibt an, gab an, hat angegeben" -> RHS must be "angeben", never "geben ... an".
- Example: "aufstehen, steht auf, stand auf, ist aufgestanden" -> RHS must be "aufstehen", never "stehe ... auf".
- For optional forms like "(herunter-)fahren", choose one strict full form without parentheses, e.g. "herunterfahren".
- For nouns, RHS must be article + singular noun, e.g. "der Arbeitsplatz".
- RHS must not contain commas, slashes, conjugation lists, plural markers, parentheses, regional notes, ellipses, or explanations.

Other field rules:
- LHS: short English prompt/meaning shown to the learner.
- remarks: one full natural German example sentence from the provided Goethe example. The sentence should make the meaning of RHS obvious.
- remarksEN: English translation of the remarks sentence.

Quality rules:
- Keep LHS useful for studying, even if it contains two close meanings.
- Keep RHS strict and typeable.
- Prefer the most common canonical German answer from the German entry.
- If a German entry contains masculine and feminine person forms, choose the form that matches the example sentence.
- If the example contains multiple sentences, choose the clearest sentence for this exact word.
- Do not invent a new German example sentence unless the provided Goethe example is empty, fragmented, or clearly belongs to a different word. In that case, create one simple natural German sentence that makes RHS obvious.
- Return JSON only.

Input entries:
${entries}`;
}

function buildSchema(length) {
  return {
    type: "array",
    minItems: length,
    maxItems: length,
    items: {
      type: "object",
      additionalProperties: false,
      required: ["LHS", "RHS", "remarks", "remarksEN"],
      properties: {
        LHS: { type: "string" },
        RHS: { type: "string" },
        remarks: { type: "string" },
        remarksEN: { type: "string" },
      },
    },
  };
}

async function callOllama({ model, batch, failures = null }) {
  const prompt = failures ? buildRepairPrompt(failures) : buildPrompt(batch);
  const length = failures ? failures.length : batch.length;

  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      think: false,
      keep_alive: globalThis.keepAlive ?? "30m",
      format: buildSchema(length),
      options: {
        temperature: 0,
        num_ctx: globalThis.numCtx ?? 4096,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  return JSON.parse(body.response);
}

function validateOneGenerated(item, sourceItem, index) {
  const keys = Object.keys(item).sort();
  const expected = ["LHS", "RHS", "remarks", "remarksEN"];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected keys at item ${index + 1}: ${keys.join(", ")}`);
  }

  const normalizedItem = {
    LHS: item.LHS?.trim(),
    RHS: item.RHS?.trim().replace(/^\(sich\)\s+/, "sich "),
    remarks: item.remarks?.trim(),
    remarksEN: item.remarksEN?.trim(),
  };

  for (const key of expected) {
    if (typeof normalizedItem[key] !== "string" || normalizedItem[key].trim() === "") {
      throw new Error(`${key} is empty at item ${index + 1}.`);
    }
  }

  if (/[,\n/()]/.test(normalizedItem.RHS)) {
    throw new Error(`RHS is not a single strict answer at item ${index + 1}: ${normalizedItem.RHS}`);
  }

  const sourceEntry = sourceItem.LHS;
  const expectedRhs = canonicalRhsCandidates(sourceEntry);
  const looksLikeVerb = /,\s*\S+/.test(sourceEntry) && !/^(der|die|das)\s/i.test(sourceEntry);
  if (looksLikeVerb && !expectedRhs.includes(normalizedItem.RHS) && !expectedRhs.map((rhs) => `sich ${rhs}`).includes(normalizedItem.RHS)) {
    throw new Error(`Verb RHS is not the source infinitive at item ${index + 1}: got "${normalizedItem.RHS}", expected one of "${expectedRhs.join('", "')}"`);
  }

  return {
    ...normalizedItem,
    source: {
      germanEntry: sourceItem.LHS,
      goetheExample: cleanExample(sourceItem.RHS),
    },
  };
}

function validateGenerated(items, batch) {
  if (!Array.isArray(items)) {
    throw new Error("Model output is not an array.");
  }

  if (items.length !== batch.length) {
    throw new Error(`Expected ${batch.length} items, got ${items.length}.`);
  }

  const valid = [];
  const invalid = [];

  for (let index = 0; index < items.length; index++) {
    try {
      valid.push({
        inputKey: inputKey(batch[index]),
        ...validateOneGenerated(items[index], batch[index], index),
      });
    } catch (error) {
      invalid.push({
        inputKey: inputKey(batch[index]),
        at: new Date().toISOString(),
        message: error.message,
        source: batch[index],
        generated: items[index],
      });
    }
  }

  return { valid, invalid };
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function withoutSource(records) {
  return records.map(({ LHS, RHS, remarks, remarksEN }) => ({ LHS, RHS, remarks, remarksEN }));
}

function splitFailures(failures) {
  const itemFailures = [];
  const retryItems = [];

  for (const failure of failures) {
    if (failure.inputKey && failure.source) {
      itemFailures.push(failure);
    } else if (Array.isArray(failure.batch)) {
      retryItems.push(...failure.batch);
    }
  }

  return { itemFailures, retryItems };
}

async function generatePendingBatch({ args, batch, batchLabel, completed, failed, failures, state, statePath, appPath, failuresPath }) {
  const pendingBatch = batch.filter((item) => {
    const key = inputKey(item);
    return !completed.has(key) && !failed.has(key);
  });

  if (pendingBatch.length === 0) {
    return;
  }

  log(`Generating ${batchLabel}: ${pendingBatch.length} items`);

  try {
    const started = Date.now();
    const { valid, invalid } = validateGenerated(await callOllama({ model: args.model, batch: pendingBatch }), pendingBatch);

    for (const record of valid) {
      state.push(record);
      completed.add(record.inputKey);
    }

    for (const failure of invalid) {
      failures.push(failure);
      failed.add(failure.inputKey);
    }

    writeJson(statePath, state);
    writeJson(appPath, withoutSource(state));
    writeJson(failuresPath, failures);
    log(`Finished ${batchLabel}: ${valid.length} saved, ${invalid.length} failed in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (error) {
    const at = new Date().toISOString();
    for (const source of pendingBatch) {
      const failure = {
        inputKey: inputKey(source),
        at,
        message: `Batch-level failure: ${error.message}`,
        source,
      };
      failures.push(failure);
      failed.add(failure.inputKey);
    }
    writeJson(failuresPath, failures);
    log(`${batchLabel} failed at batch level: ${error.message}`);
  }
}

async function repairFailureBatch({ args, failureBatch, unprocessedFailures, batchLabel, completed, remainingFailures, state, statePath, appPath, failuresPath }) {
  if (failureBatch.length === 0) {
    return;
  }

  const sourceBatch = failureBatch.map((failure) => failure.source);

  log(`Repairing ${batchLabel}: ${failureBatch.length} failed items`);

  try {
    const started = Date.now();
    const generated = await callOllama({ model: args.model, batch: sourceBatch, failures: failureBatch });
    const { valid, invalid } = validateGenerated(generated, sourceBatch);

    for (const record of valid) {
      if (!completed.has(record.inputKey)) {
        state.push(record);
        completed.add(record.inputKey);
      }
    }

    for (const failure of invalid) {
      remainingFailures.push(failure);
    }

    writeJson(statePath, state);
    writeJson(appPath, withoutSource(state));
    writeJson(failuresPath, [...remainingFailures, ...unprocessedFailures]);
    log(`Finished ${batchLabel}: ${valid.length} repaired, ${invalid.length} still failed in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (error) {
    const at = new Date().toISOString();
    for (const previousFailure of failureBatch) {
      remainingFailures.push({
        inputKey: previousFailure.inputKey,
        at,
        message: `Repair batch-level failure: ${error.message}`,
        source: previousFailure.source,
        generated: previousFailure.generated,
      });
    }
    writeJson(failuresPath, [...remainingFailures, ...unprocessedFailures]);
    log(`${batchLabel} failed at repair batch level: ${error.message}`);
  }
}

async function generateChapter(args, chapter) {
  globalThis.keepAlive = args.keepAlive;
  globalThis.numCtx = args.numCtx;
  const chapterTitle = chapterTitles[chapter];
  const slug = slugify(chapterTitle);
  const inputPath = join(inputDir, chapterFiles[chapter]);

  const allInput = readJson(inputPath, []);
  const selectedInput = allInput.slice(args.start, args.limit ? args.start + args.limit : undefined);

  mkdirSync(outputDir, { recursive: true });
  const statePath = join(outputDir, `begegnungen-${String(chapter).padStart(2, "0")}-${slug}.state.json`);
  const appPath = join(outputDir, `begegnungen-${String(chapter).padStart(2, "0")}-${slug}.app.json`);
  const failuresPath = join(outputDir, `begegnungen-${String(chapter).padStart(2, "0")}-${slug}.failures.json`);

  if (args.reset) {
    writeJson(statePath, []);
    writeJson(appPath, []);
    writeJson(failuresPath, []);
  }

  const state = readJson(statePath, []);
  const { itemFailures, retryItems } = splitFailures(readJson(failuresPath, []));
  const failures = itemFailures;
  const completed = new Set(state.map((record) => record.inputKey));
  const failed = new Set(failures.map((failure) => failure.inputKey));

  log(`Chapter ${chapter}: ${chapterTitle}`);
  log(`Input selected: ${selectedInput.length}`);
  log(`Already completed: ${completed.size}`);
  log(`Retrying legacy failed items first: ${retryItems.length}`);

  if (args.repairFailures) {
    const repairableFailures = failures.filter((failure) => failure.inputKey && failure.source);
    const remainingFailures = failures.filter((failure) => !failure.inputKey || !failure.source);

    log(`Repairable failures: ${repairableFailures.length}`);

    for (let index = 0; index < repairableFailures.length; index += args.batchSize) {
      const failureBatch = repairableFailures.slice(index, index + args.batchSize);
      const unprocessedFailures = repairableFailures.slice(index + args.batchSize);
      await repairFailureBatch({
        args,
        failureBatch,
        unprocessedFailures,
        batchLabel: `repair batch ${Math.floor(index / args.batchSize) + 1}`,
        completed,
        remainingFailures,
        state,
        statePath,
        appPath,
        failuresPath,
      });
    }

    writeJson(statePath, state);
    writeJson(appPath, withoutSource(state));
    writeJson(failuresPath, remainingFailures);
    log(`Wrote ${state.length} app cards to ${appPath}`);
    log(`Failures: ${remainingFailures.length}`);
    return;
  }

  for (let index = 0; index < retryItems.length; index += args.batchSize) {
    await generatePendingBatch({
      args,
      batch: retryItems.slice(index, index + args.batchSize),
      batchLabel: `failed retry batch ${Math.floor(index / args.batchSize) + 1}`,
      completed,
      failed,
      failures,
      state,
      statePath,
      appPath,
      failuresPath,
    });
  }

  for (let index = 0; index < selectedInput.length; index += args.batchSize) {
    const batch = selectedInput.slice(index, index + args.batchSize);
    const batchNumber = Math.floor(index / args.batchSize) + 1;
    await generatePendingBatch({
      args,
      batch,
      batchLabel: `batch ${batchNumber}`,
      completed,
      failed,
      failures,
      state,
      statePath,
      appPath,
      failuresPath,
    });
  }

  writeJson(statePath, state);
  writeJson(appPath, withoutSource(state));
  writeJson(failuresPath, failures);

  log(`Wrote ${state.length} app cards to ${appPath}`);
  log(`Failures: ${failures.length}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chapters = args.chapter === "all" ? Object.keys(chapterFiles).map(Number) : [args.chapter];

  for (const chapter of chapters) {
    await generateChapter(args, chapter);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
