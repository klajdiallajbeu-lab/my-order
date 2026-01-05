import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalManagers: 0,
  });

  const logout = () => {
    localStorage.removeItem("adminId");
    navigate("/admin");
  };

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        console.error("Gabim te stats:", err);
      });
  }, []);

  return (
    <div className="admin-dashboard-container">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <h2 className="admin-logo">⚙️ Admin Panel</h2>

        <nav className="admin-menu">
          <button
            className="admin-btn"
            onClick={() => navigate("/admin/business/create")}
          >
            ➕ Krijo Biznes
          </button>

          <button
            className="admin-btn"
            onClick={() => navigate("/admin/business/list")}
          >
            📋 Shiko Bizneset
          </button>
        </nav>

        <button className="admin-btn logout" onClick={logout}>
          🚪 Dil
        </button>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        {/* TOP BAR */}
        <div className="dashboard-topbar">
          <div className="topbar-left">
            <h1>👋 Mirësevjen, Administrator</h1>
            <p>Menaxho bizneset dhe sistemin nga një panel i vetëm</p>
          </div>

          <span className="system-pill">🟢 Sistem Aktiv</span>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">🏢</div>
            <div>
              <p className="stat-label">Bizneset totale</p>
              <h2 className="stat-value">{stats.totalBusinesses}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">👨‍💼</div>
            <div>
              <p className="stat-label">Menaxherë total</p>
              <h2 className="stat-value">{stats.totalManagers}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">⚙️</div>
            <div>
              <p className="stat-label">Sistemi</p>
              <h2 className="stat-value active">Aktiv</h2>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
