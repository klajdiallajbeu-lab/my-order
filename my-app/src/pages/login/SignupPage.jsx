import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/http";
import "./SignupPage.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: "", businessType: "", tables: "",
    rooms: "", umbrellas: "", contactNumber: "", email: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setSuccess(""); setError("");
    try {
      const { data } = await api.post("/business-request", form);
      setSuccess(data.message || "Kërkesa u dërgua me sukses.");
      setForm({ businessName: "", businessType: "", tables: "", rooms: "", umbrellas: "", contactNumber: "", email: "", message: "" });
    } catch (err) {
      setError(err?.response?.data?.message || "Ndodhi një gabim gjatë dërgimit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-page">

      {/* HEADER */}
      <header className="sp-header">
        <button type="button" className="sp-back" onClick={() => navigate("/login")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Kthehu
        </button>
        <div className="sp-logo">my<span>Order</span></div>
      </header>

      {/* CARD */}
      <main className="sp-main">
        <div className="sp-card">

          <div className="sp-head">
            
            <h1>Kërko aktivizimin e biznesit</h1>
            <p>Plotëso të dhënat dhe do të kontaktohesh brenda 24 orësh.</p>
          </div>

          <form className="sp-form" onSubmit={handleSubmit}>

            <div className="sp-grid">

              <div className="sp-field">
                <label>Emri i biznesit</label>
                <input type="text" name="businessName" value={form.businessName} onChange={handleChange} placeholder="P.sh. Blue Wave Hotel" required />
              </div>

              <div className="sp-field">
                <label>Lloji i biznesit</label>
                <select name="businessType" value={form.businessType} onChange={handleChange} required>
                  <option value="">Zgjidh</option>
                  <option value="Bar">Bar</option>
                  <option value="Restorant">Restorant</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Beach Bar">Beach Bar</option>
                </select>
              </div>

              <div className="sp-field">
                <label>Nr. tavolinave</label>
                <input type="number" name="tables" value={form.tables} onChange={handleChange} placeholder="0" min="0" />
              </div>

              <div className="sp-field">
                <label>Nr. dhomave</label>
                <input type="number" name="rooms" value={form.rooms} onChange={handleChange} placeholder="0" min="0" />
              </div>

              <div className="sp-field">
                <label>Nr. çadrave</label>
                <input type="number" name="umbrellas" value={form.umbrellas} onChange={handleChange} placeholder="0" min="0" />
              </div>

              <div className="sp-field">
                <label>Numër kontakti</label>
                <input type="text" name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="+355..." required />
              </div>

              <div className="sp-field sp-field-full">
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="biznesi@email.com" required />
              </div>

              <div className="sp-field sp-field-full">
                <label>Mesazh shtesë</label>
                <textarea name="message" value={form.message} onChange={handleChange} placeholder="Shkruaj diçka shtesë për biznesin..." rows="4" />
              </div>

            </div>

            {success && <div className="sp-success">✓ {success}</div>}
            {error   && <div className="sp-error">⚠ {error}</div>}

            <button type="submit" className="sp-submit" disabled={loading}>
              {loading ? "Duke u dërguar..." : "Dërgo kërkesën"}
              {!loading && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              )}
            </button>

          </form>
        </div>

        <footer className="sp-footer">
          <button type="button" onClick={() => navigate("/privacy")}>Politika e Privatësisë</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/terms")}>Kushtet e Përdorimit</button>
          <span>·</span>
          <button type="button" onClick={() => navigate("/contact")}>Na Kontaktoni</button>
        </footer>
        <div className="sp-copyright">© 2026 myOrder · Të gjitha të drejtat e rezervuara</div>
      </main>
    </div>
  );
}