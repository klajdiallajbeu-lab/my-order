import { useState } from "react";
import "./UserModal.css";

export default function UserModal({ closeModal, refresh, editUser }) {
  const [form, setForm] = useState({
    name: editUser?.name || "",
    username: editUser?.username || "",
    password: "",
    email: editUser?.email || "",
    phone: editUser?.phone || "",
    role: editUser?.role || "waiter",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const method = editUser ? "PUT" : "POST";
      const url = editUser
        ? `http://localhost:5000/api/users/${editUser._id}`
        : "http://localhost:5000/api/users";

      const businessId = localStorage.getItem("businessId");

      if (!editUser && !businessId) {
        alert("Mungon businessId – rihap login-in e menaxherit.");
        return;
      }

      let payload = editUser ? { ...form } : { ...form, businessId };

      if (editUser && !payload.password) {
        delete payload.password;
      }

      if (!editUser) {
        if (!payload.name || !payload.username || !payload.password) {
          alert("Emri, username dhe fjalëkalimi janë të detyrueshëm.");
          return;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Gabim gjatë ruajtjes së userit");
        console.error("Gabim te UserModal handleSubmit:", data);
        return;
      }

      await refresh();
      closeModal();
    } catch (err) {
      console.error("Gabim te UserModal handleSubmit:", err);
      alert("Gabim serveri gjatë ruajtjes së userit");
    }
  };

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-modal-header">
          <h2 className="user-modal-title">
            {editUser ? "Ndrysho Përdoruesin" : "Shto Përdorues të Ri"}
          </h2>
          <p className="user-modal-subtitle">
            {editUser
              ? "Përditëso të dhënat e përdoruesit."
              : "Plotëso të dhënat për të krijuar një përdorues të ri."}
          </p>
        </div>

        <form className="user-modal-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Emri & Mbiemri"
            value={form.name}
            onChange={handleChange}
          />

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder={editUser ? "Fjalëkalim i ri (opsional)" : "Fjalëkalimi"}
            value={form.password}
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Email (opsionale)"
            value={form.email}
            onChange={handleChange}
          />

          <input
            type="text"
            name="phone"
            placeholder="Telefoni (opsionale)"
            value={form.phone}
            onChange={handleChange}
          />

          <select name="role" value={form.role} onChange={handleChange}>
            <option value="waiter">Kamarier</option>
          </select>

          <div className="modal-buttons">
            <button type="button" className="cancel-btn" onClick={closeModal}>
              Anulo
            </button>

            <button type="submit" className="save-btn">
              {editUser ? "Përditëso" : "Ruaj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}