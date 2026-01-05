import { useEffect, useState } from "react";
import "./ViewBusinessesPage.css";

export default function ViewBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editBusiness, setEditBusiness] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ================= FETCH BUSINESSES ================= */
  const fetchBusinesses = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/admin/business/list");
      const data = await res.json();
      setBusinesses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gabim në marrjen e bizneseve", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  /* ================= STATUS ================= */
  const getStatus = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "expired";
    if (diffDays <= 7) return "warning";
    return "active";
  };

  /* ================= DELETE ================= */
  const handleDeleteBusiness = async (businessId) => {
    const ok = window.confirm("Je i sigurt që do ta fshish këtë biznes?");
    if (!ok) return;

    try {
      const res = await fetch(
        `http://localhost:5000/api/admin/business/${businessId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error();

      setBusinesses((prev) => prev.filter((b) => b._id !== businessId));
    } catch {
      alert("Gabim gjatë fshirjes");
    }
  };

  /* ================= EDIT ================= */
  const openEditBusiness = (business) => {
    setEditBusiness({ ...business });
    setNewPassword("");
    setConfirmPassword("");
    setShowEdit(true);
  };

  const handleUpdateBusiness = async () => {
    // ---- Password validation (opsional) ----
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        alert("❌ Password-et nuk përputhen");
        return;
      }
      if (newPassword.length < 6) {
        alert("❌ Password duhet të ketë minimum 6 karaktere");
        return;
      }
    }

    try {
      const payload = {
        name: editBusiness.name,
        phone: editBusiness.phone,
        email: editBusiness.email,
        city: editBusiness.city,
      };

      if (newPassword) {
        payload.password = newPassword;
      }

      const res = await fetch(
        `http://localhost:5000/api/admin/business/${editBusiness._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      setShowEdit(false);
      setEditBusiness(null);
      setNewPassword("");
      setConfirmPassword("");
      fetchBusinesses();
    } catch {
      alert("Gabim gjatë përditësimit");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="business-list-container">
      <h1 className="title">📋 Bizneset</h1>

      {loading && <p>Duke ngarkuar...</p>}

      <table className="business-table">
        <thead>
          <tr>
            <th>Biznesi</th>
            <th>Kontakt</th>
            <th>Email</th>
            <th>Qyteti</th>
            <th>Aktiv nga</th>
            <th>Skadon më</th>
            <th>Menaxheri</th>
            <th>Statusi</th>
            <th>Veprime</th>
          </tr>
        </thead>

        <tbody>
          {businesses.map((b) => {
            const status = getStatus(b.endDate);

            return (
              <tr key={b._id}>
                <td>{b.name}</td>
                <td>{b.phone}</td>
                <td>{b.email}</td>
                <td>{b.city}</td>
                <td>{b.startDate ? new Date(b.startDate).toLocaleDateString() : "—"}</td>
                <td>{b.endDate ? new Date(b.endDate).toLocaleDateString() : "—"}</td>
                <td>{b.owner?.name || "—"}</td>

                <td>
                  <span className={`status-badge ${status}`}>
                    {status === "active" && "🟢 Aktiv"}
                    {status === "warning" && "🟡 Skadon shpejt"}
                    {status === "expired" && "🔴 I skaduar"}
                  </span>
                </td>

                <td className="action-cell">
                  <button
                    className="biz-edit-btn"
                    onClick={() => openEditBusiness(b)}
                  >
                    ✏️
                  </button>
                  <button
                    className="biz-delete-btn"
                    onClick={() => handleDeleteBusiness(b._id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ================= EDIT MODAL ================= */}
      {showEdit && editBusiness && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>✏️ Ndrysho Biznesin</h3>

            <input
              value={editBusiness.name}
              onChange={(e) =>
                setEditBusiness({ ...editBusiness, name: e.target.value })
              }
              placeholder="Emri Biznesit"
            />

            <input
              value={editBusiness.phone}
              onChange={(e) =>
                setEditBusiness({ ...editBusiness, phone: e.target.value })
              }
              placeholder="Kontakt"
            />

            <input
              value={editBusiness.email}
              onChange={(e) =>
                setEditBusiness({ ...editBusiness, email: e.target.value })
              }
              placeholder="Email"
            />

            <input
              value={editBusiness.city}
              onChange={(e) =>
                setEditBusiness({ ...editBusiness, city: e.target.value })
              }
              placeholder="Qyteti"
            />

            <input
              type="password"
              placeholder="🔒 Password i ri (opsional)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="🔒 Konfirmo password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={handleUpdateBusiness}>💾 Ruaj</button>
              <button onClick={() => setShowEdit(false)}>❌ Anullo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
