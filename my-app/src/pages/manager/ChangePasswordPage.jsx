import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePasswordApi } from "../../api/userApi";
import "./ChangePasswordPage.css";

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Plotëso të gjitha fushat.");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmimi i fjalëkalimit nuk përputhet.");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError("Fjalëkalimi i ri nuk mund të jetë i njëjtë me aktualin.");
      return;
    }

    try {
      setLoading(true);

      const userId = sessionStorage.getItem("userId");
      if (!userId) {
        throw new Error("Useri nuk u gjet. Bëj login përsëri.");
      }

      const res = await changePasswordApi(userId, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setSuccess(res?.message || "Fjalëkalimi u ndryshua me sukses.");

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Ndodhi një gabim gjatë ndryshimit të fjalëkalimit."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="change-password-header">
        <div>
          <h1>Ndrysho fjalëkalimin</h1>
          <p>Për siguri, vendos fjalëkalimin aktual dhe pastaj të riun.</p>
        </div>

        <button
          type="button"
          className="cp-back-btn"
          onClick={() => navigate("/manager/profile")}
        >
          Kthehu
        </button>
      </div>

      <div className="change-password-card">
        <form className="change-password-form" onSubmit={handleSubmit}>
          <div className="cp-field">
            <label>Fjalëkalimi aktual</label>
            <input
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="Shkruaj fjalëkalimin aktual"
            />
          </div>

          <div className="cp-field">
            <label>Fjalëkalimi i ri</label>
            <input
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Shkruaj fjalëkalimin e ri"
            />
          </div>

          <div className="cp-field">
            <label>Konfirmo fjalëkalimin e ri</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Rishkruaj fjalëkalimin e ri"
            />
          </div>

          <div className="cp-rules">
            <span>Fjalëkalimi duhet të ketë të paktën 8 karaktere.</span>
          </div>

          {error ? <div className="cp-message error">{error}</div> : null}
          {success ? <div className="cp-message success">{success}</div> : null}

          <div className="cp-actions">
            <button
              type="button"
              className="cp-btn secondary"
              onClick={() => navigate("/manager/profile")}
            >
              Anulo
            </button>

            <button type="submit" className="cp-btn primary" disabled={loading}>
              {loading ? "Duke ruajtur..." : "Ndrysho fjalëkalimin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}