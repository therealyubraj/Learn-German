import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useLocation, Link } from "react-router-dom";
import { completeTotpEnrollment, getTotpEnrollment } from "../../sync/api";
import { getDefaultDeviceName, getOrCreateClientInstallationId } from "../../sync/storage";
import { saveStoredSyncSession } from "../../sync/storage";

const fieldClassName =
  "w-full rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px] text-sm text-[#E6EDF3] outline-none transition-colors placeholder:text-[#8B949E] focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30";

export function TotpEnrollmentPage() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [issuer, setIssuer] = useState("");
  const [secret, setSecret] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [deviceName, setDeviceName] = useState(getDefaultDeviceName());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const token =
    new URLSearchParams(location.search).get("token")?.trim() ?? "";

  useEffect(() => {
    async function loadEnrollment() {
      if (!token) {
        setError("This enrollment link is missing its token.");
        setIsLoading(false);
        return;
      }

      try {
        const enrollment = await getTotpEnrollment(token);
        setEmail(enrollment.email);
        setIssuer(enrollment.issuer);
        setSecret(enrollment.secret);
        setExpiresAt(enrollment.expiresAt);
        setOtpauthUrl(enrollment.otpauthUrl);
      } catch (enrollmentError) {
        setError((enrollmentError as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEnrollment();
  }, [token]);

  useEffect(() => {
    async function renderQrCode() {
      if (!otpauthUrl) {
        setQrCodeUrl("");
        return;
      }

      try {
        const nextQrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
          color: {
            dark: "#0D1117",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(nextQrCodeUrl);
      } catch (qrError) {
        setError((qrError as Error).message);
      }
    }

    void renderQrCode();
  }, [otpauthUrl]);

  async function handleCompleteEnrollment() {
    setIsCompleting(true);
    setError(null);

    try {
      const response = await completeTotpEnrollment(
        token,
        totpCode,
        deviceName,
        getOrCreateClientInstallationId(),
      );
      saveStoredSyncSession(response.session);
      setIsComplete(true);
    } catch (completionError) {
      setError((completionError as Error).message);
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full justify-center px-6 pb-16 pt-32 sm:px-8 sm:pt-36">
      <div className="flex w-full max-w-[48rem] flex-col gap-8">
        <div className="text-center">
          <h1
            className="font-semibold tracking-[-0.04em] text-[#E6EDF3]"
            style={{ fontSize: "4.25rem", lineHeight: "1.02" }}
          >
            TOTP Setup
          </h1>
          <p className="mt-3 text-base leading-7 text-[#00C896] sm:text-lg">
            Scan this code into your authenticator app, then confirm with a live TOTP code.
          </p>
        </div>

        <div className="w-full rounded-3xl border border-[#30363D] bg-[#161B22] px-[36px] py-[40px] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          {isLoading ? (
            <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[16px] text-sm text-[#8B949E]">
              Loading TOTP enrollment...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[#F85149]/45 bg-[#F85149]/10 px-[18px] py-[14px] text-sm font-medium text-[#FFB3AD]">
              {error}
            </div>
          ) : isComplete ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="inline-flex rounded-full border border-[#00C896]/35 bg-[#00C896]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#00FF9C]">
                TOTP Enabled
              </div>
              <p className="text-base text-[#E6EDF3]">
                Enrollment completed for <span className="font-semibold">{email}</span>.
              </p>
              <Link
                to="/sync"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[22px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C]"
              >
                Continue to sync
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-3xl bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="TOTP enrollment QR code"
                      className="h-64 w-64"
                    />
                  ) : (
                    <div className="flex h-64 w-64 items-center justify-center text-sm text-[#4B5563]">
                      Rendering QR...
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-[#8B949E]">
                  Expires at {new Date(expiresAt).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col gap-5">
                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">
                    Account
                  </p>
                  <p className="mt-2 text-base font-medium text-[#E6EDF3]">
                    {email}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">
                    Provider
                  </p>
                  <p className="mt-2 text-base font-medium text-[#E6EDF3]">
                    {issuer}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#30363D] bg-[#0D1117] px-[18px] py-[14px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8B949E]">
                    Manual Secret
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-[#E6EDF3]">
                    {secret}
                  </p>
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
                    Current TOTP Code
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
                  disabled={isCompleting || totpCode.trim() === ""}
                  onClick={() => void handleCompleteEnrollment()}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#00C896] bg-[#00C896] px-[22px] py-[14px] text-sm font-semibold text-[#0D1117] transition-colors hover:bg-[#00FF9C] disabled:cursor-not-allowed disabled:border-[#30363D] disabled:bg-[#1C232D] disabled:text-[#8B949E]"
                >
                  {isCompleting ? "Verifying..." : "Finish setup"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
