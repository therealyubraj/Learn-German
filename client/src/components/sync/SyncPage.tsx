import { useMemo, useState } from "react";
import { useSync } from "../../sync/SyncContext";
import { getDefaultDeviceName } from "../../sync/storage";

type AuthMode = "signIn" | "signUp";

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

function AuthModeButton({
  isActive,
  title,
  description,
  onClick,
}: {
  isActive: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[5.75rem] flex-col items-start justify-center rounded-[1.35rem] border px-5 py-4 text-left transition-colors ${
        isActive
          ? "border-[#00C896] bg-[#00C896]/12 text-[#E6EDF3] shadow-[0_0_0_1px_rgba(0,200,150,0.18)_inset]"
          : "border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#4A5563] hover:text-[#E6EDF3]"
      }`}
    >
      <span
        className={`text-sm font-semibold ${
          isActive ? "text-[#00FF9C]" : "text-[#E6EDF3]"
        }`}
      >
        {title}
      </span>
      <span className="mt-1 text-xs leading-5">{description}</span>
    </button>
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
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");
  const [signInEmail, setSignInEmail] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [deviceName, setDeviceName] = useState(getDefaultDeviceName());
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [isRequestingEnrollment, setIsRequestingEnrollment] = useState(false);
  const [isVerifyingTotp, setIsVerifyingTotp] = useState(false);
  const signInEmailValidationError = getGmailValidationError(signInEmail);
  const signUpEmailValidationError = getGmailValidationError(signUpEmail);

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
    setSignUpError(null);
    try {
      const response = await requestTotpEnrollmentLink(signUpEmail);
      setEnrollmentStatus(
        response.devEnrollmentLink
          ? response.wouldFailInProduction
            ? `Development override: an active enrollment already existed for this email, so a fresh local setup link was generated. Production would reject this request. Link: ${response.devEnrollmentLink}`
            : `Development enrollment link: ${response.devEnrollmentLink}`
          : `Enrollment email sent. The link expires at ${new Date(response.expiresAt).toLocaleString()}.`,
      );
    } catch (requestError) {
      setEnrollmentStatus(null);
      setSignUpError((requestError as Error).message);
    } finally {
      setIsRequestingEnrollment(false);
    }
  }

  async function handleTotpLogin() {
    setIsVerifyingTotp(true);
    setSignInError(null);
    try {
      await loginWithTotpCode(signInEmail, totpCode, deviceName);
      setTotpCode("");
    } catch (loginError) {
      setSignInError((loginError as Error).message);
    } finally {
      setIsVerifyingTotp(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full justify-center px-6 pb-16 pt-28 sm:px-8 sm:pt-32">
      <div className="flex w-full max-w-[46rem] flex-col gap-8">
        <div className="text-center">
          <h1
            className="font-semibold tracking-[-0.04em] text-[#E6EDF3]"
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
              title="Access Sync"
              description={
                authMode === "signIn"
                  ? "Enter your Gmail address and the current code from your authenticator app."
                  : "Request a one-time setup link to enroll this Gmail address with TOTP."
              }
            >
              <div className="flex flex-col gap-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <AuthModeButton
                    isActive={authMode === "signIn"}
                    title="Sign In"
                    description="Use an existing authenticator code."
                    onClick={() => setAuthMode("signIn")}
                  />
                  <AuthModeButton
                    isActive={authMode === "signUp"}
                    title="Set Up TOTP"
                    description="Request a setup link for a new device."
                    onClick={() => setAuthMode("signUp")}
                  />
                </div>

                {authMode === "signIn" ? (
                  <div className="flex flex-col gap-5 rounded-[1.8rem] border border-[#30363D] bg-[#0D1117] px-5 py-5 sm:px-6">
                    <div>
                      <label className="mb-3 block text-base font-medium text-[#A6ADC8]">
                        Gmail Address
                      </label>
                      <input
                        value={signInEmail}
                        onChange={(event) => {
                          setSignInEmail(event.target.value);
                          setSignInError(null);
                        }}
                        className={fieldClassName}
                        type="email"
                        placeholder="you@gmail.com"
                      />
                      {signInEmailValidationError ? (
                        <p className="mt-3 text-sm font-medium text-[#FFB3AD]">
                          {signInEmailValidationError}
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
                        onChange={(event) => {
                          setTotpCode(event.target.value);
                          setSignInError(null);
                        }}
                        className={fieldClassName}
                        type="text"
                        placeholder="Enter the 6-digit code"
                      />
                    </div>

                    {signInError ? (
                      <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
                        {signInError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={
                        isHydrating ||
                        isVerifyingTotp ||
                        signInEmail.trim() === "" ||
                        signInEmailValidationError !== null ||
                        totpCode.trim() === ""
                      }
                      onClick={() => void handleTotpLogin()}
                      className={`${actionButtonClassName} border-[#00C896] bg-[#00C896] text-[#0D1117] hover:bg-[#00FF9C]`}
                    >
                      {isVerifyingTotp ? "Signing in..." : "Sign In"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 rounded-[1.8rem] border border-[#30363D] bg-[#0D1117] px-5 py-5 sm:px-6">
                    <div>
                      <label className="mb-3 block text-base font-medium text-[#A6ADC8]">
                        Gmail Address
                      </label>
                      <input
                        value={signUpEmail}
                        onChange={(event) => {
                          setSignUpEmail(event.target.value);
                          setSignUpError(null);
                          setEnrollmentStatus(null);
                        }}
                        className={fieldClassName}
                        type="email"
                        placeholder="you@gmail.com"
                      />
                      {signUpEmailValidationError ? (
                        <p className="mt-3 text-sm font-medium text-[#FFB3AD]">
                          {signUpEmailValidationError}
                        </p>
                      ) : null}
                    </div>

                    {signUpError ? (
                      <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
                        {signUpError}
                      </div>
                    ) : null}

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
                        signUpEmail.trim() === "" ||
                        signUpEmailValidationError !== null
                      }
                      onClick={() => void handleRequestEnrollment()}
                      className={`${actionButtonClassName} border-[#30363D] bg-[#0D1117] text-[#E6EDF3] hover:border-[#00C896] hover:bg-[#00C896]/8 hover:text-[#00FF9C]`}
                    >
                      {isRequestingEnrollment
                        ? "Sending..."
                        : "Email me a setup link"}
                    </button>
                  </div>
                )}
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
