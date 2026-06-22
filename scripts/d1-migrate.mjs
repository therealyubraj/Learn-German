import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const rootDir = resolve(scriptDir, "..");
const serverDir = join(rootDir, "server");
const migrationsDir = join(serverDir, "migrations");
const databaseName = process.env.D1_DATABASE_NAME ?? "learn-german-sync";
const wranglerConfig = process.env.D1_WRANGLER_CONFIG ?? "../wrangler.jsonc";
const wranglerEnv = process.env.D1_WRANGLER_ENV ?? "production";
const useRemote = process.env.D1_REMOTE !== "false";

function runD1(args, options = {}) {
  const result = spawnSync(
    "pnpm",
    [
      "--dir",
      serverDir,
      "exec",
      "wrangler",
      "d1",
      "execute",
      databaseName,
      "--config",
      wranglerConfig,
      ...(wranglerEnv ? ["--env", wranglerEnv] : []),
      ...(useRemote ? ["--remote"] : []),
      ...args,
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(options.errorMessage ?? "D1 command failed.");
  }

  return result.stdout;
}

function extractAppliedVersions(stdout) {
  try {
    const jsonStart = stdout.search(/[\[{]/);
    if (jsonStart < 0) {
      return new Set();
    }

    const parsed = JSON.parse(stdout.slice(jsonStart));
    const versions = new Set();

    function visit(value) {
      if (Array.isArray(value)) {
        for (const item of value) {
          visit(item);
        }
        return;
      }

      if (!value || typeof value !== "object") {
        return;
      }

      if (typeof value.version === "string") {
        versions.add(value.version);
      }

      for (const nested of Object.values(value)) {
        visit(nested);
      }
    }

    visit(parsed);
    return versions;
  } catch {
    return new Set();
  }
}

function quoteSqlString(value) {
  return value.replaceAll("'", "''");
}

function getMigrationFiles() {
  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => ({
      fileName,
      path: join(migrationsDir, fileName),
      version: basename(fileName, ".sql"),
    }));
}

function applyMigration(migration) {
  const tempDir = mkdtempSync(join(tmpdir(), "learn-german-d1-migration-"));
  const tempFile = join(tempDir, `${migration.version}.sql`);
  const sql = readFileSync(migration.path, "utf8").trim();

  writeFileSync(
    tempFile,
    [
      sql.endsWith(";") ? sql : `${sql};`,
      `INSERT INTO migrations (version, applied_at) VALUES ('${quoteSqlString(
        migration.version,
      )}', CURRENT_TIMESTAMP);`,
      "",
    ].join("\n"),
  );

  try {
    runD1(["--file", tempFile], {
      errorMessage: `Failed to apply migration ${migration.version}.`,
    });
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

console.log("Ensuring D1 migrations table exists...");
runD1([
  "--command",
  [
    "CREATE TABLE IF NOT EXISTS migrations (",
    "version TEXT PRIMARY KEY,",
    "applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP",
    ");",
  ].join(" "),
]);

console.log("Reading applied D1 migrations...");
const appliedVersions = extractAppliedVersions(
  runD1(["--json", "--command", "SELECT version FROM migrations ORDER BY version;"]),
);

const migrations = getMigrationFiles();
let appliedCount = 0;

for (const migration of migrations) {
  if (appliedVersions.has(migration.version)) {
    console.log(`Skipping ${migration.fileName}`);
    continue;
  }

  console.log(`Applying ${migration.fileName}`);
  applyMigration(migration);
  appliedCount += 1;
}

console.log(
  appliedCount === 0
    ? "D1 migrations are already up to date."
    : `Applied ${appliedCount} D1 migration${appliedCount === 1 ? "" : "s"}.`,
);
