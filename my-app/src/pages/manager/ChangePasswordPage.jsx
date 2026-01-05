import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ChangePasswordPage.css";

export default function ChangePasswordPage() {
  const navigate = useNavigate();

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [repeatPass, setRepeatPass] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = () => {
    setError("");
    setSuccess("");

    if (!currentPass || !newPass || !repeatPass) {
      setError("Ju lutem plotësoni të gjitha fushat!");
      return;
    }

    if (newPass !== repeatPass) {
      setError("Fjalëkalimet nuk përputhen!");
      return;
    }

    // KËTU BËHET VALIDIMI DHE REQUEST TE BACKEND
    setSuccess("Fjalëkalimi u ndryshua me sukses! ✔️");

    setTimeout(() => navigate("/manager"), 1500);
  };

  return (
    <div className="password-container">
      <div className="password-box">
        <h2>🔑 Ndrysho Fjalëkalimin</h2>

        <label>Fjalëkalimi aktual</label>
        <input
          type="password"
          value={currentPass}
          onChange={(e) => setCurrentPass(e.target.value)}
          placeholder="Shkruaj fjalëkalimin aktual"
        />

        <label>Fjalëkalimi i ri</label>
        <input
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="Shkruaj fjalëkalimin e ri"
        />

        <label>Rishkruaj fjalëkalimin e ri</label>
        <input
          type="password"
          value={repeatPass}
          onChange={(e) => setRepeatPass(e.target.value)}
          placeholder="Përsërit fjalëkalimin e ri"
        />

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button className="submit-btn" onClick={handleSubmit}>Ndrysho</button>

        <button className="back-btn" onClick={() => navigate("/manager")}>
          ⬅️ Kthehu mbrapa
        </button>
      </div>
    </div>
  );
}
