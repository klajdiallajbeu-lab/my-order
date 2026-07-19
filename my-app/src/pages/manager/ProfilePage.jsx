import "../../qz-signing";
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

  const [bizForm, setBizForm] = useState({
    hoteli: "",
    nipt: "",
    address: "",
  });

  const [initialBizForm, setInitialBizForm] = useState({
    hoteli: "",
    nipt: "",
    address: "",
  });


  useEffect(() => {
    const loadUser = async () => {
      try {
        const userId = sessionStorage.getItem("userId");
        const businessId = localStorage.getItem("businessId");

        if (!userId) return;

        const data = await getUserByIdApi(userId);

        const loadedData = {
          emri: data.name || "",
          mbiemri: data.surname || "",
          email: data.email || "",
          telefoni: data.phone || "",
          username: data.username || "",
        };

        setForm(loadedData);
        setInitialForm(loadedData);

        if (businessId) {
          const res = await fetch(`/api/business/${businessId}`, {
            headers: {
              Authorization: `Bearer ${
                sessionStorage.getItem("token") || localStorage.getItem("token") || ""
              }`,
            },
          });

          const biz = await res.json();

          const loadedBiz = {
            hoteli: biz?.name || "",
            nipt: biz?.nipt || "",
            address: biz?.address || "",
          };

          setBizForm(loadedBiz);
          setInitialBizForm(loadedBiz);

          localStorage.setItem("hotelName", loadedBiz.hoteli || "");
          localStorage.setItem("nipt", loadedBiz.nipt || "");
          localStorage.setItem("address", loadedBiz.address || "");
        }
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

  const handleBizChange = (e) => {
    const { name, value } = e.target;
    setBizForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setForm(initialForm);
    setBizForm(initialBizForm);
  };


  const handleSave = async () => {
    try {
      setSaving(true);

      const userId = sessionStorage.getItem("userId");
      const businessId = localStorage.getItem("businessId");

      if (!userId) return;

      // 1) Të dhënat personale (User) — emër/mbiemër/username.
      //    email/phone NUK dërgohen më këtej (janë read-only, i ndryshon admini).
      await updateProfileApi(userId, {
        name: form.emri,
        surname: form.mbiemri,
        username: form.username,
      });

      // 2) Të dhënat e biznesit (Business) — vetëm name/nipt/address.
      if (businessId) {
        const token =
          sessionStorage.getItem("token") || localStorage.getItem("token") || "";

        const res = await fetch(`/api/business/${businessId}/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: bizForm.hoteli,
            nipt: bizForm.nipt,
            address: bizForm.address,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Gabim gjatë ruajtjes së biznesit");
        }
      }

      localStorage.setItem("hotelName", bizForm.hoteli || "");
      localStorage.setItem("nipt", bizForm.nipt || "");
      localStorage.setItem("address", bizForm.address || "");

      setInitialForm(form);
      setInitialBizForm(bizForm);

      ("Profili u ruajt me sukses!");
    } catch (err) {
      console.error("Gabim gjatë ruajtjes:", err);
      ("Gabim gjatë ruajtjes së profilit");
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
                disabled
                title="Për të ndryshuar email-in, kontakto administratorin."
              />
            </div>

            <div className="profile-field">
              <label>Numri i telefonit</label>
              <input
                type="text"
                name="telefoni"
                value={form.telefoni}
                disabled
                title="Për të ndryshuar telefonin, kontakto administratorin."
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
                value={bizForm.hoteli}
                onChange={handleBizChange}
                placeholder="Shkruaj emrin e hotelit"
              />
            </div>

            <div className="profile-field full">
              <label>NIPT i biznesit</label>
              <input
                type="text"
                name="nipt"
                value={bizForm.nipt}
                onChange={handleBizChange}
                placeholder="p.sh. L12345678A"
              />
            </div>

            <div className="profile-field full">
              <label>Adresa e biznesit</label>
              <input
                type="text"
                name="address"
                value={bizForm.address}
                onChange={handleBizChange}
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