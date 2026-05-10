export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
};

export type D1Result<T> = {
  results?: T[];
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
};

export type Env = {
  DB: D1Database;
  ENVIRONMENT?: string;
  DEV_TOTP_ENROLLMENT_LINK_ECHO?: string;
  TOTP_ENROLLMENT_TTL_HOURS?: string;
  SESSION_TTL_DAYS?: string;
  APP_BASE_URL?: string;
  APP_NAME?: string;
  TOTP_ISSUER?: string;
  EMAIL_SENDER?: string;
  RESEND_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
};

export type WordStat = {
  mastery: number;
  successCount: number;
  lastReviewed: number;
  exposureCount: number;
};

export type SyncSnapshot = {
  version: number;
  exportedAt: string;
  wordLists: Array<{
    list: Array<{
      LHS: string;
      RHS: string;
      remarks?: string;
      remarksEN?: string;
      TTS?: string;
    }>;
    metadata: {
      name: string;
      checksum: string;
      updatedAt?: string;
    };
  }>;
  settings: unknown;
  settingsUpdatedAt: string;
  stats: {
    version: number;
    stats: Record<string, WordStat>;
  };
};

export type LegacyQuizStatsStoreV1 = {
  version: 1;
  statsByChecksum: Record<string, Record<string, Partial<WordStat>>>;
};

export type LegacyQuizStatsStoreV2 = Record<string, Partial<WordStat>>;

export type DeviceRow = {
  id: string;
  user_id: string;
  client_installation_id: string;
  name: string;
  last_seen_at: string;
  last_uploaded_revision: number;
  last_applied_revision: number;
  has_unpushed_changes: number;
  created_at: string;
  updated_at: string;
};

export type SessionContext = {
  token: string;
  userId: string;
  email: string;
  deviceId: string;
  deviceName: string;
  clientInstallationId: string;
  sessionExpiresAt: string;
  lastKnownRevision: number;
  lastAppliedRevision: number;
};

export type TotpEnrollmentRow = {
  id: string;
  email: string;
  secret: string;
  token_hash: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type TotpCredentialRow = {
  user_id: string;
  secret: string;
  created_at: string;
  updated_at: string;
};
