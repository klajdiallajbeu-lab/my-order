import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  LockClosedIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import "./ForgotPasswordPage.css";

const initialIdentity = {
  username: "",
  email: "",
  phone: "",
  channel: "email",
};

const initialPasswords = {
  newPassword: "",
  confirmPassword: "",
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [identity, setIdentity] = useState(initialIdentity);
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [passwords, setPasswords] = useState(initialPasswords);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const readJson = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      console.error(
        "Përgjigje jo-JSON nga serveri:",
        text.slice(0, 300)
      );

      throw new Error("Serveri ktheu një përgjigje të pasaktë.");
    }

    return response.json();
  };

  const handleIdentityChange = (event) => {
    const { name, value } = event.target;

    setIdentity((current) => ({
      ...current,
      [name]: value,
    }));

    clearMessages();
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswords((current) => ({
      ...current,
      [name]: value,
    }));

    clearMessages();
  };

  /* ======================================================
     HAPI 1 — DËRGO KODIN
  ====================================================== */

  const requestCode = async (event) => {
    event.preventDefault();
    clearMessages();

    const username = identity.username.trim();
    const email = identity.email.trim().toLowerCase();
    const phone = identity.phone.trim();

    if (!username || !email || !phone) {
      setError(
        "Plotëso username-in, emailin dhe numrin e telefonit."
      );
      return;
    }

    if (!email.includes("@")) {
      setError("Vendos një adresë emaili të vlefshme.");
      return;
    }

    if (phone.replace(/\D/g, "").length < 8) {
      setError("Vendos një numër telefoni të vlefshëm.");
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
            channel: identity.channel,
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Kodi nuk mund të dërgohej."
        );
      }

      setMessage(
        data?.message ||
          "Nëse të dhënat përputhen, kodi është dërguar."
      );

      setStep(2);
    } catch (requestError) {
      console.error(
        "Gabim gjatë kërkimit të kodit:",
        requestError
      );

      setError(
        requestError?.message ||
          "Kodi nuk mund të dërgohej. Provo përsëri."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     HAPI 2 — VERIFIKO KODIN
  ====================================================== */

  const verifyCode = async (event) => {
    event.preventDefault();
    clearMessages();

    const cleanCode = code.replace(/\D/g, "").slice(0, 6);

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Vendos kodin 6-shifror.");
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
            username: identity.username.trim(),
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
      setMessage(
        data?.message || "Kodi u verifikua me sukses."
      );

      setStep(3);
    } catch (verifyError) {
      console.error(
        "Gabim gjatë verifikimit të kodit:",
        verifyError
      );

      setError(
        verifyError?.message ||
          "Kodi është i pasaktë ose ka skaduar."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     HAPI 3 — VENDOS PASSWORD-IN E RI
  ====================================================== */

  const resetPassword = async (event) => {
    event.preventDefault();
    clearMessages();

    const newPassword = passwords.newPassword.trim();
    const confirmPassword =
      passwords.confirmPassword.trim();

    if (!newPassword || !confirmPassword) {
      setError("Plotëso të dyja fushat e fjalëkalimit.");
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Fjalëkalimi duhet të ketë të paktën 8 karaktere."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Fjalëkalimet nuk përputhen.");
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
            username: identity.username.trim(),
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

      setMessage(
        data?.message ||
          "Fjalëkalimi u ndryshua me sukses."
      );

      setStep(4);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    } catch (resetError) {
      console.error(
        "Gabim gjatë ndryshimit të fjalëkalimit:",
        resetError
      );

      setError(
        resetError?.message ||
          "Fjalëkalimi nuk mund të ndryshohej."
      );
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    clearMessages();
    setCode("");

    const fakeEvent = {
      preventDefault() {},
    };

    await requestCode(fakeEvent);
  };

  const returnToIdentity = () => {
    setStep(1);
    setCode("");
    setResetToken("");
    setPasswords(initialPasswords);
    clearMessages();
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-background">
        <span className="fp-shape fp-shape-one" />
        <span className="fp-shape fp-shape-two" />
        <span className="fp-shape fp-shape-three" />
      </div>

      <header className="forgot-password-header">
        <button
          type="button"
          className="fp-back-button"
          onClick={() => navigate("/login")}
        >
          <ArrowLeftIcon />
          Kthehu te hyrja
        </button>

        <div className="fp-brand">
          my<span>Order</span>
        </div>
      </header>

      <main className="forgot-password-main">
        <section className="forgot-password-card">
          <div className="fp-icon">
            {step === 4 ? (
              <CheckCircleIcon />
            ) : (
              <ShieldCheckIcon />
            )}
          </div>

          <div className="fp-heading">
            <span className="fp-kicker">
              Rikuperim i sigurt
            </span>

            <h1>
              {step === 1 && "Keni harruar fjalëkalimin?"}
              {step === 2 && "Verifiko kodin"}
              {step === 3 && "Krijo fjalëkalimin e ri"}
              {step === 4 && "Fjalëkalimi u ndryshua"}
            </h1>

            <p>
              {step === 1 &&
                "Verifiko identitetin me të dhënat e regjistruara në sistem."}

              {step === 2 &&
                `Vendos kodin 6-shifror të dërguar në ${
                  identity.channel === "email"
                    ? "email"
                    : "telefon"
                }.`}

              {step === 3 &&
                "Vendos një fjalëkalim të ri dhe të sigurt për llogarinë."}

              {step === 4 &&
                "Do të ridrejtohesh automatikisht te faqja e hyrjes."}
            </p>
          </div>

          <div className="fp-steps" aria-label="Hapat">
            {[1, 2, 3].map((number) => (
              <div
                key={number}
                className={`fp-step ${
                  step >= number ? "active" : ""
                }`}
              >
                <span>{number}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="fp-message fp-error">
              {error}
            </div>
          )}

          {message && step !== 4 && (
            <div className="fp-message fp-success">
              {message}
            </div>
          )}

          {step === 1 && (
            <form
              className="fp-form"
              onSubmit={requestCode}
            >
              <div className="fp-field">
                <label htmlFor="forgot-username">
                  Username
                </label>

                <div className="fp-input-wrap">
                  <UserIcon />

                  <input
                    id="forgot-username"
                    type="text"
                    name="username"
                    value={identity.username}
                    onChange={handleIdentityChange}
                    placeholder="Username i menaxherit"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="fp-field">
                <label htmlFor="forgot-email">
                  Email
                </label>

                <div className="fp-input-wrap">
                  <EnvelopeIcon />

                  <input
                    id="forgot-email"
                    type="email"
                    name="email"
                    value={identity.email}
                    onChange={handleIdentityChange}
                    placeholder="email@shembull.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="fp-field">
                <label htmlFor="forgot-phone">
                  Numri i telefonit
                </label>

                <div className="fp-input-wrap">
                  <PhoneIcon />

                  <input
                    id="forgot-phone"
                    type="tel"
                    name="phone"
                    value={identity.phone}
                    onChange={handleIdentityChange}
                    placeholder="+355 6X XXX XXXX"
                    autoComplete="tel"
                    disabled={loading}
                  />
                </div>
              </div>

              <fieldset className="fp-channel-box">
                <legend>Ku dëshiron ta marrësh kodin?</legend>

                <label
                  className={`fp-channel-option ${
                    identity.channel === "email"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value="email"
                    checked={
                      identity.channel === "email"
                    }
                    onChange={handleIdentityChange}
                  />

                  <span className="fp-channel-icon">
                    <EnvelopeIcon />
                  </span>

                  <span>
                    <strong>Email</strong>
                    <small>
                      Kodi dërgohet te emaili i regjistruar
                    </small>
                  </span>
                </label>

                <label
                  className={`fp-channel-option ${
                    identity.channel === "sms"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value="sms"
                    checked={identity.channel === "sms"}
                    onChange={handleIdentityChange}
                  />

                  <span className="fp-channel-icon">
                    <PhoneIcon />
                  </span>

                  <span>
                    <strong>SMS</strong>
                    <small>
                      Aktivizohet pasi të lidhet shërbimi SMS
                    </small>
                  </span>
                </label>
              </fieldset>

              <button
                type="submit"
                className="fp-primary-button"
                disabled={loading}
              >
                {loading
                  ? "Duke dërguar..."
                  : "Dërgo kodin"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form
              className="fp-form"
              onSubmit={verifyCode}
            >
              <div className="fp-code-section">
                <label htmlFor="verification-code">
                  Kodi i verifikimit
                </label>

                <div className="fp-code-wrap">
                  <KeyIcon />

                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
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
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={loading}
                  />
                </div>

                <small>
                  Kodi skadon pas 10 minutash.
                </small>
              </div>

              <button
                type="submit"
                className="fp-primary-button"
                disabled={loading || code.length !== 6}
              >
                {loading
                  ? "Duke verifikuar..."
                  : "Verifiko kodin"}
              </button>

              <div className="fp-secondary-actions">
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={loading}
                >
                  Dërgo kodin përsëri
                </button>

                <button
                  type="button"
                  onClick={returnToIdentity}
                  disabled={loading}
                >
                  Ndrysho të dhënat
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form
              className="fp-form"
              onSubmit={resetPassword}
            >
              <div className="fp-field">
                <label htmlFor="forgot-new-password">
                  Fjalëkalimi i ri
                </label>

                <div className="fp-input-wrap">
                  <LockClosedIcon />

                  <input
                    id="forgot-new-password"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    name="newPassword"
                    value={passwords.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Të paktën 8 karaktere"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="fp-eye-button"
                    onClick={() =>
                      setShowNewPassword((value) => !value)
                    }
                    aria-label={
                      showNewPassword
                        ? "Fshih fjalëkalimin"
                        : "Shfaq fjalëkalimin"
                    }
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </div>

              <div className="fp-field">
                <label htmlFor="forgot-confirm-password">
                  Konfirmo fjalëkalimin
                </label>

                <div className="fp-input-wrap">
                  <LockClosedIcon />

                  <input
                    id="forgot-confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Rishkruaj fjalëkalimin"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="fp-eye-button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Fshih fjalëkalimin"
                        : "Shfaq fjalëkalimin"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon />
                    ) : (
                      <EyeIcon />
                    )}
                  </button>
                </div>
              </div>

              <div className="fp-password-rules">
                <span
                  className={
                    passwords.newPassword.length >= 8
                      ? "valid"
                      : ""
                  }
                >
                  Të paktën 8 karaktere
                </span>

                <span
                  className={
                    passwords.newPassword &&
                    passwords.newPassword ===
                      passwords.confirmPassword
                      ? "valid"
                      : ""
                  }
                >
                  Fjalëkalimet përputhen
                </span>
              </div>

              <button
                type="submit"
                className="fp-primary-button"
                disabled={loading}
              >
                {loading
                  ? "Duke ndryshuar..."
                  : "Ndrysho fjalëkalimin"}
              </button>
            </form>
          )}

          {step === 4 && (
            <div className="fp-completed">
              <div className="fp-completed-icon">
                <CheckCircleIcon />
              </div>

              <p>
                {message ||
                  "Fjalëkalimi u ndryshua me sukses."}
              </p>

              <button
                type="button"
                className="fp-primary-button"
                onClick={() =>
                  navigate("/login", {
                    replace: true,
                  })
                }
              >
                Shko te hyrja
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}