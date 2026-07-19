import "../../qz-signing";
import { useState, useEffect, useMemo } from "react";
import "./UserPage.css";
import { FiTrash2, FiChevronRight, FiX, FiLock } from "react-icons/fi";
import { api } from "../../api/http.js";

const emptyForm = { name: "", username: "", password: "", email: "", phone: "", role: "waiter" };

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState(null); // "edit" | "add" | null
  const [form, setForm] = useState(emptyForm);
  const [showPasswordField, setShowPasswordField] = useState(false);

  const refreshUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const businessId = localStorage.getItem("businessId");
      if (!businessId) {
        setError("Mungon businessId. Hyni përsëri.");
        setLoading(false);
        return;
      }

      const res = await api.get("/users", { params: { businessId } });
      const data = res.data;

      if (!Array.isArray(data)) {
        setError("Struktura e të dhënave është e pavlefshme.");
        setLoading(false);
        return;
      }

      const currentUserId = localStorage.getItem("userId");
      const onlyWaiters = data.filter((u) => u.role === "waiter" && u._id !== currentUserId);

      setUsers(onlyWaiters);
    } catch (err) {
      console.error("Gabim te refreshUsers:", err);
      setError("Nuk mund të marr userat nga serveri.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openEdit = (u) => {
    setSelectedId(u._id);
    setMode("edit");
    setShowPasswordField(false);
    setForm({
      name: u.name || "",
      username: u.username || "",
      password: "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role || "waiter",
    });
  };

  const openAdd = () => {
    setSelectedId(null);
    setMode("add");
    setShowPasswordField(true);
    setForm(emptyForm);
  };

  const closePanel = () => {
    setSelectedId(null);
    setMode(null);
    setForm(emptyForm);
    setShowPasswordField(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return;
    if (mode === "add" && !form.password.trim()) return;

    try {
      const businessId = localStorage.getItem("businessId");
      let payload = mode === "edit" ? { ...form } : { ...form, businessId };

      if (mode === "edit" && !payload.password) {
        delete payload.password;
      }

      if (mode === "add") {
        await api.post("/users", payload);
      } else if (mode === "edit" && selectedId) {
        await api.put(`/users/${selectedId}`, payload);
      }

      await refreshUsers();
      if (mode === "add") closePanel();
    } catch (err) {
      console.error("Gabim te handleSave:", err?.response?.data || err);
    }
  };

  const removeUser = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Je i sigurt që do ta fshish këtë përdorues?");
    if (!ok) return;

    try {
      await api.delete(`/users/${selectedId}`);
      closePanel();
      await refreshUsers();
    } catch (err) {
      console.error("Gabim te removeUser:", err?.response?.data || err);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <div className="prod-page">
      <div className="prod-top">
        <h1 className="prod-title">Përdoruesit</h1>
      </div>

      <div className="prod-split">
        <div className="prod-list-panel">
          <div className="prod-list-head">
            <h2>Lista e përdoruesve</h2>
            <p>Totali: {users.length} përdorues</p>
          </div>

          <div className="prod-list-toolbar">
            <input
              className="prod-search"
              placeholder="Kërko përdorues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button className="prod-add-btn" onClick={openAdd}>
              + Shto Përdorues
            </button>
          </div>

          <div className="prod-list">
            {loading ? (
              <div className="prod-empty">Duke ngarkuar...</div>
            ) : error ? (
              <div className="prod-empty">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="prod-empty">Nuk u gjet asnjë përdorues.</div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  className={`prod-list-item ${selectedId === u._id ? "active" : ""}`}
                  onClick={() => openEdit(u)}
                >
                  <div className="user-list-item-left">
                    <div className="user-avatar-sm">{u.name?.charAt(0)?.toUpperCase() || "U"}</div>
                    <div className="prod-list-item-text">
                      <span className="name">{u.name}</span>
                      <span className="price">@{u.username}</span>
                    </div>
                  </div>
                  <FiChevronRight className="chev" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="prod-detail-panel">
          {!mode ? (
            <div className="prod-detail-empty">
              Zgjidh një përdorues nga lista, ose shto një të ri.
            </div>
          ) : (
            <>
              <div className="prod-detail-head">
                <h2>{mode === "add" ? "Shto Përdorues të Ri" : "Detajet e përdoruesit"}</h2>

                <div className="prod-detail-head-actions">
                  {mode === "edit" && (
                    <button className="prod-delete-btn" onClick={removeUser} type="button">
                      <FiTrash2 /> Fshi Përdoruesin
                    </button>
                  )}

                  <button className="prod-close-btn" onClick={closePanel} type="button">
                    <FiX />
                  </button>
                </div>
              </div>

              <div className="prod-detail-form">
                <div className="field">
                  <label>Emri i plotë</label>
                  <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
                </div>

                <div className="field">
                  <label>Username</label>
                  <input value={form.username} onChange={(e) => setField("username", e.target.value)} />
                </div>

                <div className="field">
                  <label>Email</label>
                  <input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="opsionale" />
                </div>

                <div className="field">
                  <label>Numri i telefonit</label>
                  <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="opsionale" />
                </div>

                <div className="field">
                  <label>Roli</label>
                  <select value={form.role} onChange={(e) => setField("role", e.target.value)}>
                    <option value="waiter">Waiter</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Fjalëkalimi</label>

                {!showPasswordField ? (
                  <button
                    type="button"
                    className="prod-image-label"
                    onClick={() => setShowPasswordField(true)}
                  >
                    <FiLock /> Ndrysho fjalëkalimin
                  </button>
                ) : (
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder={mode === "add" ? "Fjalëkalimi" : "Fjalëkalim i ri (opsional)"}
                  />
                )}
              </div>

              <div className="prod-detail-actions">
                <button className="btn ghost" onClick={closePanel} type="button">
                  Anulo
                </button>
                <button className="btn primary" onClick={handleSave} type="button">
                  Ruaj Ndryshimet
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}