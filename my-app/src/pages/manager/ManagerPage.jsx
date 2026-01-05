import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import "./ManagerPage.css";
import Sidebar from "../../components/Sidebar";

export default function ManagerPage({ onLogout }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogoutClick = () => {
    const ok = window.confirm("Je i sigurt që dëshiron të dalësh?");
    if (!ok) return;

    // ✅ përdor logout-in qendror nga App.jsx
    if (typeof onLogout === "function") {
      onLogout();
    } else {
      // fallback në rast se s’është kaluar prop
      localStorage.removeItem("userId");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");
      localStorage.removeItem("token");
      localStorage.removeItem("waiterId");
      localStorage.removeItem("waiterName");
      window.location.assign("/login");
    }
  };

  return (
    <div className="manager-layout">
      {/* NAVBAR */}
      <nav className="manager-navbar">
        <div className="logo" onClick={() => navigate("/manager")}>
          myOrder
        </div>

        <div className="manager-account">
          <button
            type="button"
            className="account-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            👤 Llogaria ⬇
          </button>

          {showMenu && (
            <div className="account-menu">
              <button type="button" onClick={() => navigate("/change-password")}>
                🔑 Ndrysho Fjalëkalimin
              </button>

              <button type="button" onClick={handleLogoutClick}>
                🚪 Dil
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <div className="manager-body">
        <Sidebar />
        <div className="manager-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
