import fs from "node:fs";

const wranglerFile = process.env.WRANGLER_FILE;

if (!wranglerFile) {
  throw new Error("WRANGLER_FILE is required.");
}

const requiredVars = [
  "D1_LEARN_GERMAN_UUID",
  "DEPLOY_DOMAIN",
  "ENVIRONMENT",
  "TOTP_ENROLLMENT_TTL_HOURS",
  "SESSION_TTL_DAYS",
  "APP_NAME",
  "TOTP_ISSUER",
  "APP_BASE_URL",
  "ALLOWED_ORIGIN",
  "EMAIL_SENDER",
  "RESEND_API_KEY",
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`${key} is required.`);
  }
}

const config = JSON.parse(fs.readFileSync(wranglerFile, "utf8"));

if (!config.env?.production?.d1_databases?.[0]) {
  throw new Error("wrangler.jsonc is missing env.production.d1_databases[0].");
}

function normalizeRoute(domain) {
  const trimmed = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (trimmed.includes("*")) {
    return trimmed;
  }
  return `${trimmed}/*`;
}

config.env.production.d1_databases[0].database_id =
  process.env.D1_LEARN_GERMAN_UUID;
config.env.production.routes = [normalizeRoute(process.env.DEPLOY_DOMAIN)];

config.env.production.vars = {
  ENVIRONMENT: process.env.ENVIRONMENT,
  TOTP_ENROLLMENT_TTL_HOURS: process.env.TOTP_ENROLLMENT_TTL_HOURS,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
  APP_NAME: process.env.APP_NAME,
  TOTP_ISSUER: process.env.TOTP_ISSUER,
  APP_BASE_URL: process.env.APP_BASE_URL,
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
  EMAIL_SENDER: process.env.EMAIL_SENDER,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
};

fs.writeFileSync(wranglerFile, `${JSON.stringify(config, null, 2)}\n`);
