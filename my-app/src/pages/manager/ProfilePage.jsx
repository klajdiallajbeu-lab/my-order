import "./ProfilePage.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserByIdApi, updateProfileApi } from "../../api/userApi";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    emri: "",
    mbiemri: "",
    hoteli: "",
    nipt: "",
    address: "",
    email: "",
    telefoni: "",
    username: "",
  });

  const [initialForm, setInitialForm] = useState({
    emri: "",
    mbiemri: "",
    hoteli: "",
    nipt: "",
    address: "",
    email: "",
    telefoni: "",
    username: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userId = sessionStorage.getItem("userId");
        if (!userId) return;

        const data = await getUserByIdApi(userId);

        const loadedData = {
          emri: data.name || "",
          mbiemri: data.surname || "",
          hoteli: data.hotelName || "",
          nipt: data.nipt || "",
          address: data.address || "",
          email: data.email || "",
          telefoni: data.phone || "",
          username: data.username || "",
        };

        setForm(loadedData);
        setInitialForm(loadedData);

        localStorage.setItem("hotelName", loadedData.hoteli || "");
        localStorage.setItem("nipt", loadedData.nipt || "");
        localStorage.setItem("address", loadedData.address || "");
      } catch (err) {
        console.error("Gabim gjatë leximit të user-it:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setForm(initialForm);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const userId = sessionStorage.getItem("userId");
      if (!userId) return;

      await updateProfileApi(userId, {
        name: form.emri,
        surname: form.mbiemri,
        hotelName: form.hoteli,
        nipt: form.nipt,
        address: form.address,
        email: form.email,
        phone: form.telefoni,
        username: form.username,
      });

      localStorage.setItem("hotelName", form.hoteli || "");
      localStorage.setItem("nipt", form.nipt || "");
      localStorage.setItem("address", form.address || "");

      setInitialForm(form);
      alert("Profili u ruajt me sukses!");
    } catch (err) {
      console.error("Gabim gjatë ruajtjes:", err);
      alert("Gabim gjatë ruajtjes së profilit");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Duke ngarkuar profilin...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-topbar">
        <div className="profile-header">
          <h1>Profili</h1>
          <p>Menaxho të dhënat e profilit dhe aksesit.</p>
        </div>

        <div className="profile-top-actions">
          <button className="profile-btn secondary" onClick={handleCancel}>
            Anulo
          </button>

          <button
            className="profile-btn primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
          </button>
        </div>
      </div>

      <div className="profile-sections">
        <section className="profile-card">
          <div className="profile-card-head">
            <div>
              <h2>Informacionet personale</h2>
              <p>Përditëso të dhënat personale dhe kontaktin.</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <label>Emri</label>
              <input
                type="text"
                name="emri"
                value={form.emri}
                onChange={handleChange}
                placeholder="Shkruaj emrin"
              />
            </div>

            <div className="profile-field">
              <label>Mbiemri</label>
              <input
                type="text"
                name="mbiemri"
                value={form.mbiemri}
                onChange={handleChange}
                placeholder="Shkruaj mbiemrin"
              />
            </div>

            <div className="profile-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Shkruaj email-in"
              />
            </div>

            <div className="profile-field">
              <label>Numri i telefonit</label>
              <input
                type="text"
                name="telefoni"
                value={form.telefoni}
                onChange={handleChange}
                placeholder="Shkruaj numrin e telefonit"
              />
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-head">
            <div>
              <h2>Biznesi</h2>
              <p>Të dhënat bazë të biznesit.</p>
            </div>
          </div>

          <div className="profile-fields single-column">
            <div className="profile-field full">
              <label>Emri i hotelit</label>
              <input
                type="text"
                name="hoteli"
                value={form.hoteli}
                onChange={handleChange}
                placeholder="Shkruaj emrin e hotelit"
              />
            </div>

            <div className="profile-field full">
              <label>NIPT i biznesit</label>
              <input
                type="text"
                name="nipt"
                value={form.nipt}
                onChange={handleChange}
                placeholder="p.sh. L12345678A"
              />
            </div>

            <div className="profile-field full">
              <label>Adresa e biznesit</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Shkruaj adresën e biznesit"
              />
            </div>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-head">
            <div>
              <h2>Aksesi në llogari</h2>
              <p>Menaxho të dhënat e hyrjes dhe sigurinë.</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Shkruaj username"
              />
            </div>

            <div className="profile-field">
              <label>Fjalëkalimi</label>
              <input type="text" value="********" disabled />
            </div>
          </div>

          <div className="profile-inline-actions">
            <button
              className="profile-btn secondary"
              onClick={() => navigate("/manager/change-password")}
            >
              Ndrysho fjalëkalimin
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}