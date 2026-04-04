// src/pages/manager/UserPage.jsx
import { useState, useEffect, useMemo } from "react";
import "./UserPage.css";
import UserModal from "../../components/UserModal";

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

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

      const res = await fetch(
        `http://localhost:5000/api/users?businessId=${businessId}`
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Gabim nga serveri.");
        setLoading(false);
        return;
      }

      if (!Array.isArray(data)) {
        setError("Struktura e të dhënave është e pavlefshme.");
        setLoading(false);
        return;
      }

      const currentUserId = localStorage.getItem("userId");

      const onlyWaiters = data.filter(
        (u) => u.role === "waiter" && u._id !== currentUserId
      );

      setUsers(onlyWaiters);
      setError("");
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

  const openCreateModal = () => {
    setEditUser(null);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setShowModal(true);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "all" || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const totalUsers = users.length;
  const totalWaiters = users.filter((u) => u.role === "waiter").length;
  const totalManagers = users.filter((u) => u.role === "manager").length;

  return (
    <div className="user-page-container">
      <div className="user-header-card">
        <div>
          <h1 className="user-title">
            <span className="user-icon"></span>
            Menaxhimi i Perdoruesve
          </h1>
          <p className="user-subtitle">
          </p>
        </div>

        <button className="add-user-btn" onClick={openCreateModal}>
           Shto Perdorues
        </button>
      </div>

      <div className="user-stats-grid">
        <div className="user-stat-card">
          <span className="stat-label">Totali Userave</span>
          <h3>{totalUsers}</h3>
        </div>

        <div className="user-stat-card">
          <span className="stat-label">Kamarjerë</span>
          <h3>{totalWaiters}</h3>
        </div>

        <div className="user-stat-card">
          <span className="stat-label">Manager</span>
          <h3>{totalManagers}</h3>
        </div>
      </div>

      <div className="user-list-card">
        <div className="user-toolbar">
          <input
            type="text"
            placeholder="Kërko sipas emrit ose username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="user-search-input"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="user-filter-select"
          >
            <option value="all">Të gjithë</option>
            <option value="waiter">Waiter</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <p className="no-users-text">Duke ngarkuar userat...</p>
        ) : error ? (
          <p className="user-error-text">{error}</p>
        ) : filteredUsers.length === 0 ? (
          <p className="no-users-text">Nuk u gjet asnjë user.</p>
        ) : (
          <div className="user-list">
            {filteredUsers.map((u) => (
              <div key={u._id} className="user-item">
                <div className="user-item-left">
                  <div className="user-avatar">
                    {u.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div className="user-info">
                    <h4>{u.name}</h4>
                    <p>@{u.username}</p>
                  </div>
                </div>

                <div className="user-item-right">
                  <span className={`user-role-badge ${u.role}`}>
                    {u.role}
                  </span>

                  <button
                    className="edit-user-btn"
                    onClick={() => openEditModal(u)}
                  >
                    Ndrysho
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          closeModal={() => setShowModal(false)}
          refresh={refreshUsers}
          editUser={editUser}
        />
      )}
    </div>
  );
}