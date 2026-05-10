import { useMemo, useState } from "react";
import { useSync } from "../../sync/SyncContext";
import { getDefaultDeviceName } from "../../sync/storage";

const fieldClassName =
  "w-full rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#E6EDF3] outline-none transition-colors placeholder:text-[#8B949E] focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30";

const actionButtonClassName =
  "inline-flex min-h-12 items-center justify-center rounded-2xl border px-[22px] py-[14px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function getGmailValidationError(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();

  if (email === "") {
    return null;
  }

  if (!email.includes("@")) {
    return "Enter a valid Gmail address.";
  }

  if (!email.endsWith("@gmail.com")) {
    return "Only @gmail.com addresses are allowed.";
  }

  return null;
}

function SyncSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#30363D] bg-[#161B22] px-[36px] py-[34px] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#8B949E]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function SyncPage() {
  const {
    session,
    isHydrating,
    isSyncing,
    error,
    isOnline,
    requiresSyncBeforeUse,
    lastSyncedAt,
    latestRevision,
    hasPendingRemoteUpload,
    otherDevices,
    requestTotpEnrollmentLink,
    loginWithTotpCode,
    syncNow,
    logoutFromSync,
  } = useSync();
  const [email, setEmail] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [deviceName, setDeviceName] = useState(getDefaultDeviceName());
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [isRequestingEnrollment, setIsRequestingEnrollment] = useState(false);
  const [isVerifyingTotp, setIsVerifyingTotp] = useState(false);
  const emailValidationError = getGmailValidationError(email);

  const hasRemoteDeviceAhead =
    !!session &&
    otherDevices.some(
      (device) => device.lastUploadedRevision > session.lastAppliedRevision,
    );

  const syncStateText = useMemo(() => {
    if (!isOnline) {
      return "This device is offline. Reconnect before making synced changes.";
    }

    if (requiresSyncBeforeUse || hasRemoteDeviceAhead) {
      return "Another device has newer synced changes. Open a sync run on this device to pull them in.";
    }

    if (hasPendingRemoteUpload) {
      return "Local changes are queued for upload.";
    }

    if (lastSyncedAt) {
      return `Last synced at ${new Date(lastSyncedAt).toLocaleString()}.`;
    }

    return "No sync has run on this device yet.";
  }, [
    hasPendingRemoteUpload,
    hasRemoteDeviceAhead,
    isOnline,
    lastSyncedAt,
    requiresSyncBeforeUse,
  ]);

  async function handleRequestEnrollment() {
    setIsRequestingEnrollment(true);
    try {
      const response = await requestTotpEnrollmentLink(email);
      setEnrollmentStatus(
        response.devEnrollmentLink
          ? `Development enrollment link: ${response.devEnrollmentLink}`
          : `Enrollment email sent. The link expires at ${new Date(response.expiresAt).toLocaleString()}.`,
      );
    } finally {
      setIsRequestingEnrollment(false);
    }
  }

  async function handleTotpLogin() {
    setIsVerifyingTotp(true);
    try {
      await loginWithTotpCode(email, totpCode, deviceName);
      setTotpCode("");
    } finally {
      setIsVerifyingTotp(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full justify-center px-6 pb-16 pt-44 sm:px-8 sm:pt-48">
      <div className="flex w-full max-w-[46rem] flex-col gap-8">
        <div className="text-center">
          <h1
            className="mt-[30px] font-semibold tracking-[-0.04em] text-[#E6EDF3]"
            style={{ fontSize: "4.25rem", lineHeight: "1.1" }}
          >
            Cloud Sync
          </h1>
          <p className="mt-3 text-base leading-7 text-[#00C896] sm:text-lg">
            Keep word sets and quiz stats aligned across your devices.
          </p>
        </div>

        {!session ? (
          <>
            <SyncSection
              title="Sign In with TOTP"
              description="Enter your Gmail address and the current code from your authenticator app."
            >
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-3 block text-base font-medium text-[#A6ADC8]">
                    Gmail Address
                  </label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldClassName}
                    type="email"
                    placeholder="you@gmail.com"
                  />
                  {emailValidationError ? (
                    <p className="mt-3 text-sm font-medium text-[#FFB3AD]">
                      {emailValidationError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-3 block text-base font-medium text-[#A6ADC8]">
                    Device Name
                  </label>
                  <input
                    value={deviceName}
                    onChange={(event) => setDeviceName(event.target.value)}
                    className={fieldClassName}
                    type="text"
                    placeholder="My laptop"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-base font-medium text-[#A6ADC8]">
                    TOTP Code
                  </label>
                  <input
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value)}
                    className={fieldClassName}
                    type="text"
                    placeholder="Enter the 6-digit code"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={
                    isHydrating ||
                    isVerifyingTotp ||
                    email.trim() === "" ||
                    emailValidationError !== null ||
                    totpCode.trim() === ""
                  }
                  onClick={handleTotpLogin}
                  className={`${actionButtonClassName} border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C]`}
                >
                  {isVerifyingTotp ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </SyncSection>

            <SyncSection
              title="Set Up TOTP"
              description="If this email has not been enrolled yet, send a one-time enrollment link to your Gmail inbox."
            >
              <div className="flex flex-col gap-5">
                <div>
                  <label className="mb-3 block text-base font-medium text-[#A6ADC8]">
                    Gmail Address
                  </label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldClassName}
                    type="email"
                    placeholder="you@gmail.com"
                  />
                  {emailValidationError ? (
                    <p className="mt-3 text-sm font-medium text-[#FFB3AD]">
                      {emailValidationError}
                    </p>
                  ) : null}
                </div>

                {enrollmentStatus ? (
                  <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#8B949E] break-words">
                    {enrollmentStatus}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={
                    isHydrating ||
                    isRequestingEnrollment ||
                    email.trim() === "" ||
                    emailValidationError !== null
                  }
                  onClick={handleRequestEnrollment}
                  className={`${actionButtonClassName} border-[#30363D] bg-[#0D1117] text-[#E6EDF3] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]`}
                >
                  {isRequestingEnrollment
                    ? "Sending..."
                    : "Email me a setup link"}
                </button>
              </div>
            </SyncSection>
          </>
        ) : (
          <>
            <SyncSection
              title="Connection"
              description="This device keeps a local OPFS copy and syncs a merged snapshot with the server."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">
                    Account
                  </p>
                  <p className="mt-2 text-base font-medium text-[#E6EDF3]">
                    {session.email}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">
                    Device
                  </p>
                  <p className="mt-2 text-base font-medium text-[#E6EDF3]">
                    {session.deviceName}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">
                    Sync State
                  </p>
                  <p className="mt-2 text-base font-medium text-[#E6EDF3]">
                    Revision {latestRevision}
                  </p>
                  <p className="mt-2 text-sm text-[#8B949E]">{syncStateText}</p>
                  {requiresSyncBeforeUse || hasRemoteDeviceAhead ? (
                    <div className="mt-3 inline-flex rounded-full border border-[#F59E0B]/45 bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#FCD34D]">
                      Another device is ahead of this one
                    </div>
                  ) : null}
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
                  {error}
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isSyncing || !isOnline}
                  onClick={() => void syncNow()}
                  className={`${actionButtonClassName} border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C]`}
                >
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void logoutFromSync()}
                  className={`${actionButtonClassName} border-[#30363D] bg-[#0D1117] text-[#E6EDF3] hover:border-[#F85149] hover:bg-[#F85149]/10 hover:text-[#FFB3AD]`}
                >
                  Disconnect
                </button>
              </div>
            </SyncSection>

            <SyncSection
              title="Other Devices"
              description="The server keeps a per-device snapshot so this device can detect remote changes and pull them safely."
            >
              {otherDevices.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {otherDevices.map((device) => {
                    const isAheadOfThisDevice =
                      !!session &&
                      device.lastUploadedRevision > session.lastAppliedRevision;
                    const statusClassName = isAheadOfThisDevice
                      ? "border border-[#F59E0B]/45 bg-[#F59E0B]/10 text-[#FCD34D]"
                      : device.hasUnpushedChanges
                        ? "border border-[#F59E0B]/45 bg-[#F59E0B]/10 text-[#FCD34D]"
                        : "border border-[#00C896]/35 bg-[#00C896]/10 text-[#E6EDF3]";
                    const statusLabel = isAheadOfThisDevice
                      ? "Ahead of this device"
                      : device.hasUnpushedChanges
                        ? "Pending upload"
                        : "In sync";

                    return (
                      <div
                        key={device.id}
                        className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-medium text-[#E6EDF3]">
                              {device.name}
                            </p>
                            <p className="mt-1 text-sm text-[#8B949E]">
                              Last seen {new Date(device.lastSeenAt).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-[#8B949E]">
                              Uploaded revision {device.lastUploadedRevision}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClassName}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#30363D] bg-[#0D1117] px-[18px] py-[20px] text-center text-sm text-[#8B949E]">
                  No other devices have signed in yet.
                </div>
              )}
            </SyncSection>
          </>
        )}
      </div>
    </div>
  );
}
