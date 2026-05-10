import { useSync } from "../../sync/SyncContext";

export function SyncScreen() {
  const { isBlockingSync, syncMessage } = useSync();

  if (!isBlockingSync) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1117]/94 px-6">
      <div className="w-full max-w-xl rounded-3xl border border-[#30363D] bg-[#161B22] px-8 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-[#30363D] border-t-[#00C896]" />
        <h2 className="text-2xl font-semibold tracking-tight text-[#E6EDF3]">
          Syncing your learning data
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#8B949E]">
          {syncMessage ??
            "Pulling the latest words and stats so this device stays aligned with your other sessions."}
        </p>
      </div>
    </div>
  );
}
