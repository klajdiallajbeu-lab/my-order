import { useState } from "react";
import { api } from "../../api/http";
import "./SignupPage.css";

export default function SignupPage() {
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    tables: "",
    rooms: "",
    umbrellas: "",
    contactNumber: "",
    email: "",
    message: "",
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
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const { data } = await api.post("/business-request", form);
      setSuccess(data.message || "Kërkesa u dërgua me sukses.");
      setForm({
        businessName: "",
        businessType: "",
        tables: "",
        rooms: "",
        umbrellas: "",
        contactNumber: "",
        email: "",
        message: "",
      });
    } catch (err) {
      setError(
        err?.response?.data?.message || "Ndodhi një gabim gjatë dërgimit."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-head">
          <div className="signup-badge">Sign Up</div>
          <h1>Kërko aktivizimin e biznesit</h1>
          <p>
            Plotëso të dhënat e biznesit dhe kërkesa do të vijë te email-i yt.
          </p>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="signup-grid">
            <div className="field">
              <label>Emri i biznesit</label>
              <input
                type="text"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                placeholder="P.sh. Blue Wave Hotel"
                required
              />
            </div>

            <div className="field">
              <label>Lloji i biznesit</label>
              <select
                name="businessType"
                value={form.businessType}
                onChange={handleChange}
                required
              >
                <option value="">Zgjidh</option>
                <option value="Bar">Bar</option>
                <option value="Restorant">Restorant</option>
                <option value="Hotel">Hotel</option>
                <option value="Beach Bar">Beach Bar</option>
              </select>
            </div>

            <div className="field">
              <label>Numri i tavolinave</label>
              <input
                type="number"
                name="tables"
                value={form.tables}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="field">
              <label>Numri i dhomave</label>
              <input
                type="number"
                name="rooms"
                value={form.rooms}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="field">
              <label>Numri i çadrave</label>
              <input
                type="number"
                name="umbrellas"
                value={form.umbrellas}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="field">
              <label>Numër kontakti</label>
              <input
                type="text"
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleChange}
                placeholder="+355..."
                required
              />
            </div>

            <div className="field field-full">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="biznesi@email.com"
                required
              />
            </div>

            <div className="field field-full">
              <label>Mesazh shtesë</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Shkruaj diçka shtesë për biznesin..."
                rows="5"
              />
            </div>
          </div>

          {success ? <div className="form-success">{success}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="signup-submit" disabled={loading}>
            {loading ? "Duke u dërguar..." : "Dërgo kërkesën"}
          </button>
        </form>
      </div>
    </div>
  );
}