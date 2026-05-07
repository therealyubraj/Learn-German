import { storage } from "./Storage";

const BACKUPS_DIR = "backups";
const STATS_MIGRATION_BACKUPS_DIR = `${BACKUPS_DIR}/stats-migrations`;

type StatsMigrationBackupStep = {
  fromVersion: number;
  toVersion: number;
};

type StatsMigrationBackupMetadata = {
  createdAt: string;
  kind: "stats-migration";
  fromVersion: number;
  toVersion: number;
  stepNumber: number;
  totalSteps: number;
};

function formatBackupTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "Z");
}

function joinPath(basePath: string, name: string) {
  if (!basePath) {
    return name;
  }

  return `${basePath}/${name}`;
}

async function copyDirectoryRecursive(
  sourcePath: string,
  destinationPath: string,
): Promise<void> {
  const entries = await storage.ls(sourcePath);

  for (const entry of entries) {
    if (sourcePath === "" && entry.name === BACKUPS_DIR) {
      continue;
    }

    const nextSourcePath = joinPath(sourcePath, entry.name);
    const nextDestinationPath = joinPath(destinationPath, entry.name);

    if (entry.type === "dir") {
      await copyDirectoryRecursive(nextSourcePath, nextDestinationPath);
      continue;
    }

    const content = await storage.readFile(nextSourcePath);
    const success = await storage.writeFile(nextDestinationPath, content);

    if (!success) {
      throw new Error(`Could not back up ${nextSourcePath}.`);
    }
  }
}

async function writeBackupMetadata(
  destinationPath: string,
  metadata: StatsMigrationBackupMetadata,
) {
  const success = await storage.writeFile(
    `${destinationPath}/_backup.json`,
    JSON.stringify(metadata, null, 2),
  );

  if (!success) {
    throw new Error("Could not write backup metadata.");
  }
}

export async function createStatsMigrationBackup(
  step: StatsMigrationBackupStep,
  stepNumber: number,
  totalSteps: number,
) {
  const now = new Date();
  const timestamp = formatBackupTimestamp(now);
  const readableName = `${timestamp}-step-${stepNumber}-v${step.fromVersion}-to-v${step.toVersion}`;
  const destinationPath = `${STATS_MIGRATION_BACKUPS_DIR}/${readableName}`;

  await copyDirectoryRecursive("", destinationPath);
  await writeBackupMetadata(destinationPath, {
    createdAt: now.toISOString(),
    kind: "stats-migration",
    fromVersion: step.fromVersion,
    toVersion: step.toVersion,
    stepNumber,
    totalSteps,
  });
}
