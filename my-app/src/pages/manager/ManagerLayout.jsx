import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import "./ManagerPage.css";

export default function ManagerLayout({ setIsLoggedIn }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate("/login");
  };

  return (
    <div className="manager-container">

      {/* NAVBAR */}
      <nav className="manager-navbar">
        <div className="logo">myOrder</div>

        <div className="manager-account">
          <button className="account-btn" onClick={() => setShowMenu(!showMenu)}>
            👤 Llogaria ⬇
          </button>

          {showMenu && (
            <div className="account-menu">
              <button onClick={() => navigate("/change-password")}>🔑 Ndrysho Fjalëkalimin</button>
              <button onClick={handleLogout}>🚪 Dil</button>
            </div>
          )}
        </div>
      </nav>

      {/* LAYOUT FIX SIDEBAR + CONTENT */}
      <div className="layout">
        <Sidebar />

        <div className="content-area">
          <Outlet />  {/* ← FAQET NDËRROHEN KËTU */}
        </div>
      </div>

    </div>
  );
}
