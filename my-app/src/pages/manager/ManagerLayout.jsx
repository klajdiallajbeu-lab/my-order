import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { refreshSocketAuth } from "../../realtime/socket.js";
import "./ManagerPage.css";

export default function ManagerLayout({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);

      if (!mobile) {
        setShowMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleLogout = () => {
  sessionStorage.clear();
  localStorage.clear();

  // Pa token => socket-i bie nga room-i privat.
  refreshSocketAuth();

  if (typeof setIsLoggedIn === "function") {
    setIsLoggedIn(false);
  }

  navigate("/login", { replace: true });
};

  const isFinanceActive = location.pathname === "/manager/xhiro";
  const isOrdersActive = location.pathname === "/manager/orders";

  if (isMobile) {
    return (
      <div className="manager-mobile-layout">
        <main className="manager-content mobile-content-with-bottom-nav">
          <Outlet />
        </main>

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
        <aside className={`manager-sidebar-wrap ${showMenu ? "open" : ""}`}>
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
        </aside>

        <main className="manager-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}