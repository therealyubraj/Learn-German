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

  return (
    <nav className="absolute top-0 left-0 z-10 w-full border-b border-[#30363D] bg-[#0D1117]/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          to="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-0"
        >
          <span className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#8B949E] transition-colors hover:bg-[#00C896]/8 hover:text-[#00FF9C]">
            <span aria-hidden="true">&larr;</span>
            <span>Home</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-0"
          >
            <span
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === "/settings"
                  ? "border-[#00C896] bg-[#00C896]/12 text-[#00FF9C]"
                  : "border-[#30363D] bg-[#161B22] text-[#8B949E] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
              }`}
              aria-label="Settings"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </span>
          </Link>

          <Link
            to="/sync"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-0"
          >
            <span
              className={`inline-flex min-w-0 items-center gap-3 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === "/sync"
                  ? "border-[#00C896] bg-[#00C896]/12 text-[#00FF9C]"
                  : hasRemoteDeviceAhead
                  ? "border-[#F59E0B]/45 bg-[#F59E0B]/10 text-[#FCD34D] hover:border-[#F59E0B] hover:bg-[#F59E0B]/16 hover:text-[#FFE08A]"
                  : "border-[#30363D] bg-[#161B22] text-[#8B949E] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]"
              }`}
            >
              <span className="min-w-0">
                {session ? (
                  <>
                    <span className="sm:hidden">Cloud Sync</span>
                    <span className="hidden sm:inline">Cloud Sync: </span>
                    <span className="hidden max-w-[12rem] truncate md:inline">
                      {session.email}
                    </span>
                  </>
                ) : (
                  "Cloud Sync"
                )}
              </span>
              <span
                className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                  session
                    ? hasRemoteDeviceAhead
                      ? "bg-[#F59E0B]"
                      : hasPendingRemoteUpload
                      ? "bg-[#F59E0B]"
                      : "bg-[#00C896]"
                    : "bg-[#8B949E]"
                }`}
              />
              <span className="shrink-0 text-xs">
                {session
                  ? hasRemoteDeviceAhead
                    ? "Update available"
                    : hasPendingRemoteUpload
                    ? "Pending upload"
                    : "On"
                  : "Off"}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
