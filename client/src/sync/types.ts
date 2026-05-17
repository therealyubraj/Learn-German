import { AppSettings, StoredWordList, VersionedQuizStats } from "../types";

export const APP_SNAPSHOT_VERSION = 2;

export type DeletedWordListTombstone = {
  name: string;
  deletedAt: string;
};

export type SyncSnapshot = {
  version: typeof APP_SNAPSHOT_VERSION;
  exportedAt: string;
  wordLists: StoredWordList[];
  deletedWordLists: DeletedWordListTombstone[];
  settings: AppSettings;
  settingsUpdatedAt: string;
  stats: VersionedQuizStats;
};

export type SyncDeviceSummary = {
  id: string;
  name: string;
  lastSeenAt: string;
  lastUploadedRevision: number;
  lastAppliedRevision: number;
  hasUnpushedChanges: boolean;
};

export type AuthSession = {
  token: string;
  email: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  clientInstallationId: string;
  sessionExpiresAt: string;
  lastKnownRevision: number;
  lastAppliedRevision: number;
};

export type StartTotpEnrollmentResponse = {
  ok: true;
  expiresAt: string;
  emailSent: boolean;
  devEnrollmentLink?: string;
  wouldFailInProduction?: boolean;
};

export type VerifyOtpResponse = {
  ok: true;
  session: AuthSession;
};

export type TotpEnrollmentDetailsResponse = {
  ok: true;
  email: string;
  issuer: string;
  secret: string;
  expiresAt: string;
  otpauthUrl: string;
};

export type SyncStatusResponse = {
  ok: true;
  latestRevision: number;
  hasSnapshot: boolean;
  hasRemoteChanges: boolean;
  hasPendingRemoteUpload: boolean;
  device: SyncDeviceSummary;
  otherDevices: SyncDeviceSummary[];
};

export type PullSnapshotResponse = {
  ok: true;
  revision: number;
  snapshot: SyncSnapshot | null;
  sourceDeviceId: string | null;
};

export type PushSnapshotResponse = {
  ok: true;
  revision: number;
  snapshot: SyncSnapshot;
};
