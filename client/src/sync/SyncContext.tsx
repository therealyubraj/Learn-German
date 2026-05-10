import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { showToast } from "../Toast";
import {
  applySyncSnapshot,
  getAllStoredWordLists,
  getLocalAppSnapshot,
} from "../FS/utils";
import {
  acknowledgeSyncRevision,
  getSession,
  getSyncStatus,
  loginWithTotp,
  logout,
  markRemoteDeviceDirty,
  pullSyncSnapshot,
  pushSyncSnapshot,
  startTotpEnrollment,
} from "./api";
import {
  APP_DATA_CHANGED_EVENT,
  clearLocalDataDirty,
  isLocalDataDirty,
} from "./local";
import { setSyncMutationRuntimeState } from "./runtime";
import {
  clearStoredSyncSession,
  getDefaultDeviceName,
  getOrCreateClientInstallationId,
  getStoredSyncSession,
  saveStoredSyncSession,
  SYNC_SESSION_CHANGED_EVENT,
} from "./storage";
import {
  AuthSession,
  StartTotpEnrollmentResponse,
  SyncDeviceSummary,
} from "./types";

type SyncMode = "detect" | "sync";

type SyncContextValue = {
  session: AuthSession | null;
  isHydrating: boolean;
  isSyncing: boolean;
  isBlockingSync: boolean;
  syncMessage: string | null;
  lastSyncedAt: string | null;
  error: string | null;
  isOnline: boolean;
  requiresSyncBeforeUse: boolean;
  hasPendingRemoteUpload: boolean;
  otherDevices: SyncDeviceSummary[];
  latestRevision: number;
  requestTotpEnrollmentLink: (
    email: string,
  ) => Promise<StartTotpEnrollmentResponse>;
  loginWithTotpCode: (
    email: string,
    code: string,
    deviceName?: string,
  ) => Promise<void>;
  syncNow: () => Promise<void>;
  logoutFromSync: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

async function hasMeaningfulLocalData() {
  const wordLists = await getAllStoredWordLists();
  return wordLists.length > 0;
}

function isBrowserOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBlockingSync, setIsBlockingSync] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isBrowserOnline());
  const [requiresSyncBeforeUse, setRequiresSyncBeforeUse] = useState(false);
  const [hasPendingRemoteUpload, setHasPendingRemoteUpload] = useState(false);
  const [otherDevices, setOtherDevices] = useState<SyncDeviceSummary[]>([]);
  const [latestRevision, setLatestRevision] = useState(0);
  const pushTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isSyncingRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);

  function updateMutationRuntime(
    nextSession: AuthSession | null,
    nextRequiresSync: boolean,
  ) {
    setSyncMutationRuntimeState({
      hasSession: !!nextSession,
      requiresSync: !!nextSession && nextRequiresSync,
    });
  }

  function updateSession(nextSession: AuthSession | null) {
    setSession(nextSession);
    if (nextSession) {
      saveStoredSyncSession(nextSession);
    } else {
      clearStoredSyncSession();
    }
  }

  async function runSyncCycle(
    options: {
      blocking: boolean;
      reason: string;
      mode: SyncMode;
    },
    activeSession = session,
  ) {
    if (!activeSession || isSyncingRef.current) {
      return;
    }

    if (!isBrowserOnline()) {
      setIsOnline(false);
      const offlineMessage =
        "This device is offline. Reconnect before syncing.";
      setError(offlineMessage);
      if (options.blocking) {
        showToast(offlineMessage);
      }
      return;
    }

    setIsOnline(true);
    setError(null);
    setIsSyncing(true);
    isSyncingRef.current = true;

    if (options.blocking) {
      setIsBlockingSync(true);
    }

    setSyncMessage(options.reason);

    try {
      const status = await getSyncStatus(activeSession.token);
      const remoteAhead = status.hasRemoteChanges && status.hasSnapshot;

      setOtherDevices(status.otherDevices);
      setLatestRevision(status.latestRevision);
      setRequiresSyncBeforeUse(remoteAhead);

      const nextSession: AuthSession = {
        ...activeSession,
        lastKnownRevision: status.latestRevision,
        lastAppliedRevision: status.device.lastAppliedRevision,
      };

      updateSession(nextSession);
      updateMutationRuntime(nextSession, remoteAhead);

      if (!status.hasSnapshot && (await hasMeaningfulLocalData())) {
        setSyncMessage("Uploading your local words and stats to the server...");
        const snapshot = await getLocalAppSnapshot();
        const pushed = await pushSyncSnapshot(activeSession.token, snapshot);
        await applySyncSnapshot(pushed.snapshot);
        clearLocalDataDirty();
        setLatestRevision(pushed.revision);
        setHasPendingRemoteUpload(false);
        setRequiresSyncBeforeUse(false);

        const syncedSession = {
          ...nextSession,
          lastKnownRevision: pushed.revision,
          lastAppliedRevision: pushed.revision,
        };
        updateSession(syncedSession);
        updateMutationRuntime(syncedSession, false);
      } else if (isLocalDataDirty()) {
        setSyncMessage("Uploading local changes...");
        const snapshot = await getLocalAppSnapshot();
        const pushed = await pushSyncSnapshot(activeSession.token, snapshot);
        await applySyncSnapshot(pushed.snapshot);
        clearLocalDataDirty();
        setLatestRevision(pushed.revision);
        setHasPendingRemoteUpload(false);
        setRequiresSyncBeforeUse(false);

        const syncedSession = {
          ...nextSession,
          lastKnownRevision: pushed.revision,
          lastAppliedRevision: pushed.revision,
        };
        updateSession(syncedSession);
        updateMutationRuntime(syncedSession, false);
      } else if (remoteAhead) {
        if (options.mode === "sync") {
          setSyncMessage(
            "Pulling the latest words and stats from your other devices...",
          );
          const pulled = await pullSyncSnapshot(activeSession.token);
          if (pulled.snapshot) {
            await applySyncSnapshot(pulled.snapshot);
          }
          await acknowledgeSyncRevision(activeSession.token, pulled.revision);
          clearLocalDataDirty();
          setLatestRevision(pulled.revision);
          setHasPendingRemoteUpload(false);
          setRequiresSyncBeforeUse(false);

          const syncedSession = {
            ...nextSession,
            lastKnownRevision: pulled.revision,
            lastAppliedRevision: pulled.revision,
          };
          updateSession(syncedSession);
          updateMutationRuntime(syncedSession, false);
        } else {
          setSyncMessage(
            "Another device has newer changes. Sync this device before continuing.",
          );
          setHasPendingRemoteUpload(isLocalDataDirty());
        }
      } else {
        setHasPendingRemoteUpload(isLocalDataDirty());
        setRequiresSyncBeforeUse(false);
        updateMutationRuntime(nextSession, false);
      }

      setLastSyncedAt(new Date().toISOString());
    } catch (syncError) {
      const message = (syncError as Error).message;
      setError(message);
      showToast(message);
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
        setIsBlockingSync(false);
        setSyncMessage(null);
      }
      isSyncingRef.current = false;
    }
  }

  async function requestTotpEnrollmentLink(email: string) {
    setError(null);
    try {
      return await startTotpEnrollment(email);
    } catch (requestError) {
      const message = (requestError as Error).message;
      setError(message);
      throw requestError;
    }
  }

  async function loginWithTotpCode(
    email: string,
    code: string,
    deviceName = getDefaultDeviceName(),
  ) {
    setError(null);
    setIsBlockingSync(true);
    setSyncMessage("Signing in and preparing cloud sync...");

    try {
      const verified = await loginWithTotp(
        email,
        code,
        deviceName,
        getOrCreateClientInstallationId(),
      );

      updateSession(verified.session);
      updateMutationRuntime(verified.session, false);
      await runSyncCycle(
        {
          blocking: true,
          reason: "Syncing your words and stats...",
          mode: "sync",
        },
        verified.session,
      );
    } catch (loginError) {
      const message = (loginError as Error).message;
      setError(message);
      throw loginError;
    } finally {
      setIsBlockingSync(false);
      setSyncMessage(null);
    }
  }

  async function logoutFromSync() {
    if (!session) {
      return;
    }

    try {
      await logout(session.token);
    } catch (logoutError) {
      console.error("Failed to log out from sync.", logoutError);
    } finally {
      updateSession(null);
      updateMutationRuntime(null, false);
      setOtherDevices([]);
      setHasPendingRemoteUpload(false);
      setLatestRevision(0);
      setLastSyncedAt(null);
      setRequiresSyncBeforeUse(false);
    }
  }

  async function syncNow() {
    await runSyncCycle({
      blocking: true,
      reason: "Syncing your words and stats...",
      mode: "sync",
    });
  }

  useEffect(() => {
    isMountedRef.current = true;

    async function hydrateSession() {
      const storedSession = getStoredSyncSession();
      if (!storedSession) {
        updateMutationRuntime(null, false);
        setIsHydrating(false);
        return;
      }

      try {
        const verified = await getSession(storedSession.token);
        updateSession(verified.session);
        updateMutationRuntime(verified.session, false);
      } catch (sessionError) {
        console.warn("Stored sync session is no longer valid.", sessionError);
        updateSession(null);
        updateMutationRuntime(null, false);
      } finally {
        setIsHydrating(false);
      }
    }

    hydrateSession();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    function handleStoredSessionChange() {
      const storedSession = getStoredSyncSession();

      if (!storedSession) {
        updateSession(null);
        setOtherDevices([]);
        setHasPendingRemoteUpload(false);
        setLatestRevision(0);
        setLastSyncedAt(null);
        setRequiresSyncBeforeUse(false);
        updateMutationRuntime(null, false);
        return;
      }

      updateSession(storedSession);
      setError(null);
      updateMutationRuntime(storedSession, false);
    }

    window.addEventListener(SYNC_SESSION_CHANGED_EVENT, handleStoredSessionChange);

    return () => {
      window.removeEventListener(
        SYNC_SESSION_CHANGED_EVENT,
        handleStoredSessionChange,
      );
    };
  }, []);

  useEffect(() => {
    if (!session || isHydrating) {
      return;
    }

    runSyncCycle({
      blocking: true,
      reason: "Checking for words and stats from your other devices...",
      mode: "sync",
    }).catch((syncError) => {
      console.error("Initial sync failed.", syncError);
    });
  }, [session?.token, isHydrating]);

  useEffect(() => {
    if (!session) {
      return;
    }

    function schedulePush() {
      if (pushTimeoutRef.current !== null) {
        window.clearTimeout(pushTimeoutRef.current);
      }

      setHasPendingRemoteUpload(true);

      void markRemoteDeviceDirty(session.token).catch((dirtyError) => {
        console.warn("Failed to mark remote device dirty.", dirtyError);
      });

      pushTimeoutRef.current = window.setTimeout(() => {
        runSyncCycle({
          blocking: false,
          reason: "Uploading local changes...",
          mode: "sync",
        }).catch((syncError) => {
          console.error("Background sync failed.", syncError);
        });
      }, 1200);
    }

    function handleAppDataChanged() {
      schedulePush();
    }

    window.addEventListener(APP_DATA_CHANGED_EVENT, handleAppDataChanged);

    return () => {
      window.removeEventListener(APP_DATA_CHANGED_EVENT, handleAppDataChanged);
      if (pushTimeoutRef.current !== null) {
        window.clearTimeout(pushTimeoutRef.current);
        pushTimeoutRef.current = null;
      }
    };
  }, [session?.token]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (isSyncingRef.current) {
        return;
      }

      runSyncCycle({
        blocking: false,
        reason: "Checking for updates from your other devices...",
        mode: "detect",
      }).catch((syncError) => {
        console.error("Polling sync failed.", syncError);
      });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [session?.token]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);

      if (!session) {
        return;
      }

      runSyncCycle({
        blocking: false,
        reason: "Rechecking sync after reconnect...",
        mode: "detect",
      }).catch((syncError) => {
        console.error("Reconnect sync check failed.", syncError);
      });
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [session?.token]);

  useEffect(() => {
    const IDLE_RELOAD_MS = 10 * 60 * 1000;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (!session) {
        return;
      }

      const hiddenDuration = hiddenAtRef.current
        ? Date.now() - hiddenAtRef.current
        : 0;
      hiddenAtRef.current = null;

      if (
        hiddenDuration >= IDLE_RELOAD_MS &&
        !isSyncingRef.current &&
        !isLocalDataDirty()
      ) {
        window.location.reload();
        return;
      }

      runSyncCycle({
        blocking: false,
        reason: "Rechecking sync after you returned to this tab...",
        mode: "detect",
      }).catch((syncError) => {
        console.error("Foreground sync check failed.", syncError);
      });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
  }, [session?.token]);

  useEffect(() => {
    updateMutationRuntime(session, requiresSyncBeforeUse);
  }, [session, requiresSyncBeforeUse]);

  return (
    <SyncContext.Provider
      value={{
        session,
        isHydrating,
        isSyncing,
        isBlockingSync,
        syncMessage,
        lastSyncedAt,
        error,
        isOnline,
        requiresSyncBeforeUse,
        hasPendingRemoteUpload,
        otherDevices,
        latestRevision,
        requestTotpEnrollmentLink,
        loginWithTotpCode,
        syncNow,
        logoutFromSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider.");
  }
  return context;
}
