import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import "./ManagerPage.css";
import FaturaTelefoni from "./FaturaTelefoni";

export default function ManagerLayout({ setIsLoggedIn }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);

      if (!mobile) {
        setShowMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("userId");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("waiterId");
    sessionStorage.removeItem("waiterName");
    sessionStorage.removeItem("businessId");

    localStorage.removeItem("waiterId");
    localStorage.removeItem("waiterName");
    localStorage.removeItem("businessId");

    setIsLoggedIn(false);
    navigate("/login");
  };

  const isFinanceActive = location.pathname === "/manager/xhiro";
  const isOrdersActive = location.pathname === "/manager/orders";

if (isMobile) {
  return (
    <div className="manager-mobile-layout">
      <div className="manager-content mobile-content-with-bottom-nav">
        <FaturaTelefoni />
        <Outlet />
      </div>

      <nav className="manager-bottom-nav">
        <button
          type="button"
          className={`manager-bottom-nav-btn ${
            isFinanceActive ? "active" : ""
          }`}
          onClick={() => navigate("/manager/xhiro")}
        >
          Financat
        </button>

        <button
          type="button"
          className={`manager-bottom-nav-btn ${
            isOrdersActive ? "active" : ""
          }`}
          onClick={() => navigate("/manager/orders")}
        >
          Faturat
        </button>

        <button
          type="button"
          className="manager-bottom-nav-btn logout"
          onClick={handleLogout}
        >
          Dil
        </button>
      </nav>
    </div>
  );
}

  return (
    <div className="manager-layout">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setShowMenu(true)}
      >
        ☰
      </button>

      <div
        className={`mobile-overlay ${showMenu ? "show" : ""}`}
        onClick={() => setShowMenu(false)}
      />

      <div className="manager-body">
        <div className={`manager-sidebar-wrap ${showMenu ? "open" : ""}`}>
          <div className="mobile-sidebar-top">
            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setShowMenu(false)}
            >
              ×
            </button>
          </div>

          <Sidebar
            onLogout={handleLogout}
            closeSidebar={() => setShowMenu(false)}
          />
        </div>

<div className="manager-content">
  <FaturaTelefoni />
  <Outlet />
</div>
      </div>
    </div>
  );
}