import { Link, useLocation } from "react-router-dom";
import React from "react";
import { useSync } from "../sync/SyncContext";

export function Navbar() {
  const location = useLocation();
  const { session, hasPendingRemoteUpload, lastSyncedAt, otherDevices } =
    useSync();

  const hasRemoteDeviceAhead =
    !!session &&
    otherDevices.some(
      (device) => device.lastUploadedRevision > session.lastAppliedRevision,
    );

  if (location.pathname === "/") {
    return null;
  }

  return (
    <nav className="absolute top-0 left-0 z-10 w-full border-b border-[#30363D] bg-[#0D1117]/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/">
          <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#8B949E] transition-colors hover:bg-[#00C896]/8 hover:text-[#00FF9C]">
            <span aria-hidden="true">&larr;</span>
            <span>Home</span>
          </span>
        </Link>
        <Link to="/sync">
          <span
            className={`inline-flex items-center gap-3 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              hasRemoteDeviceAhead
                ? "border-[#F59E0B]/45 bg-[#F59E0B]/10 text-[#FCD34D] hover:border-[#F59E0B] hover:bg-[#F59E0B]/16 hover:text-[#FFE08A]"
                : "border-[#30363D] bg-[#161B22] text-[#8B949E] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
            }`}
          >
            <span>
              {session ? `Cloud Sync: ${session.email}` : "Cloud Sync"}
            </span>
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                session
                  ? hasRemoteDeviceAhead
                    ? "bg-[#F59E0B]"
                    : hasPendingRemoteUpload
                    ? "bg-[#F59E0B]"
                    : "bg-[#00C896]"
                  : "bg-[#8B949E]"
              }`}
            />
            <span className="text-xs">
              {session
                ? hasRemoteDeviceAhead
                  ? "Update available"
                  : hasPendingRemoteUpload
                  ? "Pending upload"
                  : lastSyncedAt
                    ? "Synced"
                    : "Connected"
                : "Disconnected"}
            </span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
