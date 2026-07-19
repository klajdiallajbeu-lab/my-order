import "../../qz-signing";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ChangePasswordPage.css";

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [user, setUser] = useState(null);
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const readJson = async (response) => {
    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      console.error(
        "Përgjigje jo-JSON:",
        text.slice(0, 300)
      );

      throw new Error(
        "Serveri ktheu një përgjigje të pasaktë."
      );
    }

    return response.json();
  };

  /* ======================================================
     MERR TË DHËNAT E MENAXHERIT
  ====================================================== */

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setProfileLoading(true);
        setError("");

        const userId =
          sessionStorage.getItem("userId") ||
          localStorage.getItem("userId");

        if (!userId) {
          throw new Error(
            "Përdoruesi nuk u gjet. Bëj login përsëri."
          );
        }

        const response = await fetch(
          `/api/users/${encodeURIComponent(userId)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await readJson(response);

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Të dhënat e përdoruesit nuk u gjetën."
          );
        }

        setUser(data);
      } catch (err) {
        console.error(
          "Gabim gjatë marrjes së userit:",
          err
        );

        setError(
          err?.message ||
            "Nuk mund të ngarkohen të dhënat e përdoruesit."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUser();
  }, []);

  /* ======================================================
     DËRGO KODIN NË EMAIL
  ====================================================== */

  const handleSendCode = async () => {
    clearMessages();

    if (!user) {
      setError("Të dhënat e përdoruesit mungojnë.");
      return;
    }

    const username = String(user.username || "").trim();
    const email = String(user.email || "")
      .trim()
      .toLowerCase();

    const phone = String(user.phone || "").trim();

    if (!username) {
      setError("Llogaria nuk ka username.");
      return;
    }

    if (!email) {
      setError(
        "Llogaria nuk ka email të regjistruar. Shto emailin te profili."
      );
      return;
    }

    if (!phone) {
      setError(
        "Llogaria nuk ka numër telefoni të regjistruar. Shto numrin te profili."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/users/forgot-password/request-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            phone,
            channel: "email",
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Kodi nuk mund të dërgohej."
        );
      }

      setSuccess(
        `Kodi u dërgua në emailin ${maskEmail(email)}.`
      );

      setStep(2);
    } catch (err) {
      console.error(
        "Gabim gjatë dërgimit të kodit:",
        err
      );

      setError(
        err?.message ||
          "Kodi nuk mund të dërgohej."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     VERIFIKO KODIN
  ====================================================== */

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    clearMessages();

    const cleanCode = code
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Vendos kodin 6-shifror.");
      return;
    }

    if (!user?.username) {
      setError("Username mungon.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/users/forgot-password/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: user.username,
            code: cleanCode,
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Kodi është i pasaktë ose ka skaduar."
        );
      }

      if (!data?.resetToken) {
        throw new Error(
          "Serveri nuk ktheu token-in e ndryshimit."
        );
      }

      setResetToken(data.resetToken);
      setSuccess("Emaili u verifikua me sukses.");
      setStep(3);
    } catch (err) {
      console.error(
        "Gabim gjatë verifikimit:",
        err
      );

      setError(
        err?.message ||
          "Kodi është i pasaktë ose ka skaduar."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     NDRYSHO FJALËKALIMIN
  ====================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    clearMessages();
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    clearMessages();

    const newPassword = form.newPassword.trim();
    const confirmPassword =
      form.confirmPassword.trim();

    if (!newPassword || !confirmPassword) {
      setError("Plotëso të gjitha fushat.");
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Fjalëkalimi duhet të ketë të paktën 8 karaktere."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Konfirmimi i fjalëkalimit nuk përputhet."
      );
      return;
    }

    if (!resetToken) {
      setError(
        "Verifikimi ka skaduar. Kërko një kod të ri."
      );
      setStep(1);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/users/forgot-password/reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: user.username,
            resetToken,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Fjalëkalimi nuk mund të ndryshohej."
        );
      }

      setSuccess(
        data?.message ||
          "Fjalëkalimi u ndryshua me sukses."
      );

      setForm({
        newPassword: "",
        confirmPassword: "",
      });

      setStep(4);
    } catch (err) {
      console.error(
        "Gabim gjatë ndryshimit të fjalëkalimit:",
        err
      );

      setError(
        err?.message ||
          "Fjalëkalimi nuk mund të ndryshohej."
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setCode("");
    await handleSendCode();
  };

  if (profileLoading) {
    return (
      <div className="change-password-page">
        <div className="change-password-card">
          <div className="cp-loading">
            Duke ngarkuar të dhënat...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="change-password-page">
      <div className="change-password-header">
        <div>
          <h1>Ndrysho fjalëkalimin</h1>

          <p>
            Verifiko identitetin me email përpara
            ndryshimit të fjalëkalimit.
          </p>
        </div>

        <button
          type="button"
          className="cp-back-btn"
          onClick={() =>
            navigate("/manager/profile")
          }
        >
          Kthehu
        </button>
      </div>

      <div className="change-password-card">
        <div className="cp-steps">
          <div
            className={`cp-step ${
              step >= 1 ? "active" : ""
            }`}
          >
            <span>1</span>
            <small>Email</small>
          </div>

          <div
            className={`cp-step ${
              step >= 2 ? "active" : ""
            }`}
          >
            <span>2</span>
            <small>Kodi</small>
          </div>

          <div
            className={`cp-step ${
              step >= 3 ? "active" : ""
            }`}
          >
            <span>3</span>
            <small>Fjalëkalimi</small>
          </div>
        </div>

        {error ? (
          <div className="cp-message error">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="cp-message success">
            {success}
          </div>
        ) : null}

        {/* HAPI 1 */}
        {step === 1 && (
          <div className="change-password-form">
            <div className="cp-verification-box">
              <div className="cp-verification-icon">
                ✉
              </div>

              <div>
                <h3>Verifikim me email</h3>

                <p>
                  Kodi do të dërgohet te emaili:
                </p>

                <strong>
                  {user?.email
                    ? maskEmail(user.email)
                    : "Nuk ka email"}
                </strong>
              </div>
            </div>

            <div className="cp-actions">
              <button
                type="button"
                className="cp-btn secondary"
                onClick={() =>
                  navigate("/manager/profile")
                }
              >
                Anulo
              </button>

              <button
                type="button"
                className="cp-btn primary"
                disabled={loading || !user?.email}
                onClick={handleSendCode}
              >
                {loading
                  ? "Duke dërguar..."
                  : "Dërgo kodin"}
              </button>
            </div>
          </div>
        )}

        {/* HAPI 2 */}
        {step === 2 && (
          <form
            className="change-password-form"
            onSubmit={handleVerifyCode}
          >
            <div className="cp-field">
              <label>Kodi i verifikimit</label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  );

                  clearMessages();
                }}
                placeholder="000000"
                className="cp-code-input"
                autoFocus
              />
            </div>

            <div className="cp-rules">
              <span>
                Kodi është i vlefshëm për 10 minuta.
              </span>
            </div>

            <div className="cp-resend-row">
              <button
                type="button"
                onClick={resendCode}
                disabled={loading}
              >
                Dërgo kodin përsëri
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  clearMessages();
                }}
                disabled={loading}
              >
                Kthehu
              </button>
            </div>

            <div className="cp-actions">
              <button
                type="button"
                className="cp-btn secondary"
                onClick={() =>
                  navigate("/manager/profile")
                }
              >
                Anulo
              </button>

              <button
                type="submit"
                className="cp-btn primary"
                disabled={
                  loading || code.length !== 6
                }
              >
                {loading
                  ? "Duke verifikuar..."
                  : "Verifiko kodin"}
              </button>
            </div>
          </form>
        )}

        {/* HAPI 3 */}
        {step === 3 && (
          <form
            className="change-password-form"
            onSubmit={handleResetPassword}
          >
            <div className="cp-field">
              <label>Fjalëkalimi i ri</label>

              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Shkruaj fjalëkalimin e ri"
                autoComplete="new-password"
              />
            </div>

            <div className="cp-field">
              <label>
                Konfirmo fjalëkalimin e ri
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Rishkruaj fjalëkalimin"
                autoComplete="new-password"
              />
            </div>

            <div className="cp-rules">
              <span
                className={
                  form.newPassword.length >= 8
                    ? "valid"
                    : ""
                }
              >
                Të paktën 8 karaktere
              </span>

              <span
                className={
                  form.newPassword &&
                  form.newPassword ===
                    form.confirmPassword
                    ? "valid"
                    : ""
                }
              >
                Fjalëkalimet përputhen
              </span>
            </div>

            <div className="cp-actions">
              <button
                type="button"
                className="cp-btn secondary"
                onClick={() => {
                  setStep(1);
                  setResetToken("");
                  setCode("");
                  clearMessages();
                }}
              >
                Anulo
              </button>

              <button
                type="submit"
                className="cp-btn primary"
                disabled={loading}
              >
                {loading
                  ? "Duke ruajtur..."
                  : "Ndrysho fjalëkalimin"}
              </button>
            </div>
          </form>
        )}

        {/* HAPI 4 */}
        {step === 4 && (
          <div className="cp-completed">
            <div className="cp-completed-icon">
              ✓
            </div>

            <h2>Fjalëkalimi u ndryshua</h2>

            <p>
              Fjalëkalimi i llogarisë u ndryshua
              me sukses.
            </p>

            <button
              type="button"
              className="cp-btn primary"
              onClick={() =>
                navigate("/manager/profile", {
                  replace: true,
                })
              }
            >
              Kthehu te profili
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function maskEmail(emailValue) {
  const email = String(emailValue || "").trim();

  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visibleStart = localPart.slice(0, 2);

  return `${visibleStart}${"*".repeat(
    Math.max(localPart.length - 2, 3)
  )}@${domain}`;
}