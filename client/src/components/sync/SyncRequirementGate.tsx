import { Link, useLocation } from "react-router-dom";
import { useSync } from "../../sync/SyncContext";

export function SyncRequirementGate() {
  const location = useLocation();
  const {
    session,
    isOnline,
    isSyncing,
    requiresSyncBeforeUse,
    syncNow,
  } = useSync();

  if (!session || !requiresSyncBeforeUse || location.pathname === "/sync") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0D1117]/92 px-6">
      <div className="w-full max-w-xl rounded-3xl border border-[#F59E0B]/35 bg-[#161B22] px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto mb-5 inline-flex rounded-full border border-[#F59E0B]/45 bg-[#F59E0B]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#FCD34D]">
          Sync Required
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[#E6EDF3]">
          Another device has newer changes
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#8B949E]">
          This device is locked until it syncs with the latest words and stats.
          That prevents you from working on stale data.
        </p>
        {!isOnline ? (
          <div className="mt-4 rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
            This device is offline. Reconnect to the internet before syncing.
          </div>
        ) : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!isOnline || isSyncing}
            onClick={() => void syncNow()}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[22px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
          >
            {isSyncing ? "Syncing..." : "Sync now"}
          </button>
          <Link
            to="/sync"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#30363D] bg-[#0D1117] px-[22px] py-[14px] text-sm font-semibold text-[#E6EDF3] transition-colors hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
          >
            Open sync page
          </Link>
        </div>
      </div>
    </div>
  );
}
