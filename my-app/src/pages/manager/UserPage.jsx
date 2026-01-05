// src/pages/manager/UserPage.jsx
import { useState, useEffect } from "react";
import "./UserPage.css";
import UserModal from "../../components/UserModal";

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true); // ➕ loading state

  const refreshUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const businessId = localStorage.getItem("businessId");
      if (!businessId) {
        console.warn("Nuk u gjet businessId në localStorage");
        setError("Mungon businessId. Hyni përsëri.");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `http://localhost:5000/api/users?businessId=${businessId}`
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Gabim nga API /users:", data);
        setError(data.message || "Gabim nga serveri.");
        setLoading(false);
        return;
      }

      if (!Array.isArray(data)) {
        console.error("API /users nuk ktheu array:", data);
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
      // NUK e fshijmë listën ekzistuese – thjesht tregojmë error
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

  return (
    <div className="user-page-container">
      <div className="user-header-card">
        <h1 className="user-title">
          <span className="user-icon">👥</span>
          Menaxhimi i Userave
        </h1>

        <button className="add-user-btn" onClick={openCreateModal}>
          ➕ Shto User
        </button>
      </div>

      <div className="user-list-card">
        {loading ? (
          <p className="no-users-text">Duke ngarkuar kamarjerët...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : users.length === 0 ? (
          <p className="no-users-text">Nuk ka kamarjerë.</p>
        ) : (
          users.map((u) => (
            <div key={u._id} className="user-item">
              <span>
                {u.name} ({u.username})
              </span>

              <button
                className="edit-user-btn"
                onClick={() => openEditModal(u)}
              >
                Ndrysho
              </button>
            </div>
          ))
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
