import { useEffect, useState } from "react";
import "./ViewBusinessesPage.css";

export default function ViewBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editBusiness, setEditBusiness] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
  });

  /* ================= FETCH BUSINESSES ================= */
  const fetchBusinesses = async () => {
    try {
      const res = await fetch(
        "/api/admin/business/list",
        {
          headers: authHeaders(),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error(data.message || "Gabim gjatë marrjes së bizneseve");
        setBusinesses([]);
        return;
      }

      setBusinesses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gabim në marrjen e bizneseve", err);
      setBusinesses([]);
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
        `/api/admin/business/${businessId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      if (!res.ok) throw new Error();

      setBusinesses((prev) => prev.filter((b) => b._id !== businessId));
    } catch {
      ("Gabim gjatë fshirjes");
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
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        ("Password-et nuk përputhen");
        return;
      }
      if (newPassword.length < 6) {
        ("Password duhet të ketë minimum 6 karaktere");
        return;
      }
    }

    try {
      const payload = {
  name: editBusiness.name,
  phone: editBusiness.phone,
  email: editBusiness.email,
  city: editBusiness.city,
  nipt: editBusiness.nipt,
  address: editBusiness.address,
};

      if (newPassword) {
        payload.password = newPassword;
      }

      const res = await fetch(
        `/api/admin/business/${editBusiness._id}`,
        {
          method: "PUT",
          headers: authHeaders(),
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
      ("Gabim gjatë përditësimit");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="business-list-container">
      <h1 className="title">Bizneset</h1>

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
            <th>Printer Key</th>
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
                <td>
                  {b.startDate
                    ? new Date(b.startDate).toLocaleDateString()
                    : "—"}
                </td>
                <td>
                  {b.endDate
                    ? new Date(b.endDate).toLocaleDateString()
                    : "—"}
                </td>
                <td>{b.owner?.name || "—"}</td>

                <td>
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
    <span>{b.printerKey || "-"}</span>

    {b.printerKey && (
      <button
        onClick={() => {
          navigator.clipboard.writeText(b.printerKey);
          ("Printer Key u kopjua");
        }}
      >
        Kopjo
      </button>
    )}
  </div>
</td>

                <td>
                  <span className={`status-badge ${status}`}>
                    {status === "active" && "Aktiv"}
                    {status === "warning" && "Skadon shpejt"}
                    {status === "expired" && "I skaduar"}
                  </span>
                </td>

                <td className="action-cell">
                  <button
                    className="biz-edit-btn"
                    onClick={() => openEditBusiness(b)}
                  >
                    Edit
                  </button>
                  <button
                    className="biz-delete-btn"
                    onClick={() => handleDeleteBusiness(b._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showEdit && editBusiness && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Ndrysho Biznesin</h3>

            <input
              value={editBusiness.name}
              onChange={(e) =>
                setEditBusiness({ ...editBusiness, name: e.target.value })
              }
            />

            <input
              value={editBusiness.phone}
              onChange={(e) =>
                setEditBusiness({ ...editBusiness, phone: e.target.value })
              }
            />

            <input
              value={editBusiness.email}
              onChange={(e) =>
                setEditBusiness({ ...editBusiness, email: e.target.value })
              }
            />

            <input
  value={editBusiness.city}
  onChange={(e) =>
    setEditBusiness({ ...editBusiness, city: e.target.value })
  }
/>

<input
  placeholder="NIPT"
  value={editBusiness.nipt || ""}
  onChange={(e) =>
    setEditBusiness({ ...editBusiness, nipt: e.target.value })
  }
/>

<input
  placeholder="Adresa"
  value={editBusiness.address || ""}
  onChange={(e) =>
    setEditBusiness({ ...editBusiness, address: e.target.value })
  }
/>

            <input
              type="password"
              placeholder="Password i ri"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="Konfirmo password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={handleUpdateBusiness}>Ruaj</button>
              <button onClick={() => setShowEdit(false)}>Anullo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}