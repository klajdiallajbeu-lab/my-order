import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateBusinessPage.css";

export default function CreateBusinessPage() {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [managerName, setManagerName] = useState("");
  const [managerUsername, setManagerUsername] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setMessage("");
    setError("");

    // VALIDIM FRONTEND
    if (!businessName || !phone || !email || !city || !startDate || !endDate) {
      setError("Ju lutem plotësoni të gjitha fushat e biznesit!");
      return;
    }

    if (!managerName || !managerUsername || !managerPassword) {
      setError("Ju lutem plotësoni edhe të dhënat e menaxherit!");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("Data e skadimit duhet të jetë pas datës së aktivizimit!");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/admin/business/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
  },
  body: JSON.stringify({
            businessName,
            phone,
            email,
            city,
            startDate,
            endDate,
            managerName,
            managerUsername,
            managerPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gabim gjatë krijimit të biznesit");
        return;
      }

      setMessage("Biznesi u krijua me sukses! ✔️");
      setTimeout(() => navigate("/admin/business/list"), 1500);
    } catch (err) {
      console.error("❌ Gabim:", err);
      setError("Nuk u lidh me serverin!");
    }
  };

  return (
    <div className="create-business-container">
      <div className="create-page-wrapper">
        {/* ===== HEADER ===== */}
        <div className="create-header">
          <div>
            <h1>➕ Krijo Biznes të Ri</h1>
            <p>Shto një biznes dhe cakto menaxherin përkatës</p>
          </div>

          <button
            className="back-btn"
            onClick={() => navigate("/admin/dashboard")}
          >
            ⬅️ Kthehu
          </button>
        </div>

        {/* ===== FORM ===== */}
        <div className="form-box">
          <label>Emri i biznesit</label>
          <input
            type="text"
            placeholder="p.sh. Pizza Alb"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />

          <label>Numri i telefonit</label>
          <input
            type="text"
            placeholder="p.sh. 069 xx xx xxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label>Email</label>
          <input
            type="email"
            placeholder="p.sh. info@pizzaalb.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Qyteti</label>
          <input
            type="text"
            placeholder="p.sh. Tirana"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <label>Data e aktivizimit</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <label>Data e skadimit</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <hr />

          <h3>👤 Menaxheri i biznesit</h3>

          <label>Emri i menaxherit</label>
          <input
            type="text"
            placeholder="p.sh. Klajdi"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
          />

          <label>Username i menaxherit</label>
          <input
            type="text"
            placeholder="p.sh. klajdi123"
            value={managerUsername}
            onChange={(e) => setManagerUsername(e.target.value)}
          />

          <label>Fjalëkalimi i menaxherit</label>
          <input
            type="password"
            placeholder="password"
            value={managerPassword}
            onChange={(e) => setManagerPassword(e.target.value)}
          />

          {error && <p className="error-msg">{error}</p>}
          {message && <p className="success-msg">{message}</p>}

          <button className="submit-btn" onClick={handleCreate}>
            Krijo Biznes
          </button>
        </div>
      </div>
    </div>
  );
}
