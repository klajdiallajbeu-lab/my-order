import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Home,
  ClipboardList,
  BarChart3,
  MoreHorizontal,
  Plus,
  Package,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { refreshSocketAuth } from "../../realtime/socket.js";
import "./ManagerPage.css";
import "./ManagerMobileShell.css";

export default function ManagerLayout({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
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

  const path = location.pathname;

  const goMobile = (to) => {
    setShowMenu(false);
    setShowCreate(false);
    navigate(to);
  };

  if (isMobile) {
    const isHome = path === "/manager/home" || path === "/manager";
    const isOrders = path === "/manager/orders";
    const isReports = path === "/manager/xhiro";

    return (
      <div className="mms-shell">
        {/* HEADER */}
        <header className="mms-header">
          <button
            type="button"
            className="mms-burger"
            onClick={() => setShowMenu(true)}
            aria-label="Menu"
          >
            <Menu size={22} strokeWidth={2.4} />
          </button>

          <div className="mms-logo">
            <div className="mms-logo-main">
              <span>MY</span>
              <span>ORDER</span>
            </div>
            <div className="mms-logo-sub">MANAGEMENT PLATFORM</div>
          </div>
        </header>

        {/* PËRMBAJTJA */}
        <main className="mms-content">
          <Outlet />
        </main>

        {/* BOTTOM NAV */}
        <nav className="mms-nav">
          <button
            type="button"
            className={`mms-nav-btn ${isHome ? "active" : ""}`}
            onClick={() => goMobile("/manager/home")}
          >
            <Home size={20} strokeWidth={2.3} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`mms-nav-btn ${isOrders ? "active" : ""}`}
            onClick={() => goMobile("/manager/orders")}
          >
            <ClipboardList size={20} strokeWidth={2.3} />
            <span>Porositë</span>
          </button>

          <div className="mms-fab-slot">
            <button
              type="button"
              className="mms-fab"
              onClick={() => setShowCreate(true)}
              aria-label="Krijo"
            >
              <Plus size={26} strokeWidth={2.6} />
            </button>
          </div>

          <button
            type="button"
            className={`mms-nav-btn ${isReports ? "active" : ""}`}
            onClick={() => goMobile("/manager/xhiro")}
          >
            <BarChart3 size={20} strokeWidth={2.3} />
            <span>Raporte</span>
          </button>

          <button
            type="button"
            className="mms-nav-btn"
            onClick={() => setShowMenu(true)}
          >
            <MoreHorizontal size={20} strokeWidth={2.3} />
            <span>Më shumë</span>
          </button>
        </nav>

        {/* DRAWER */}
        {showMenu && (
          <>
            <div
              className="mms-overlay"
              onClick={() => setShowMenu(false)}
            />

            <aside className="mms-drawer">
              <div className="mms-drawer-top">
                <div className="mms-drawer-title">Menu</div>

                <button
                  type="button"
                  className="mms-drawer-close"
                  onClick={() => setShowMenu(false)}
                  aria-label="Mbyll"
                >
                  <X size={19} strokeWidth={2.5} />
                </button>
              </div>

              <Sidebar
                onLogout={handleLogout}
                closeSidebar={() => setShowMenu(false)}
              />
            </aside>
          </>
        )}

        {/* ACTION SHEET (+) */}
        {showCreate && (
          <>
            <div
              className="mms-overlay"
              onClick={() => setShowCreate(false)}
            />

            <div className="mms-sheet">
              <div className="mms-sheet-grip" />
              <h3 className="mms-sheet-title">Krijo të re</h3>

              <button
                type="button"
                className="mms-sheet-btn"
                onClick={() => goMobile("/manager/products")}
              >
                <span><Package size={19} strokeWidth={2.3} /></span>
                Produkt i ri
              </button>

              <button
                type="button"
                className="mms-sheet-btn"
                onClick={() => goMobile("/manager/subcategory")}
              >
                <span><LayoutGrid size={19} strokeWidth={2.3} /></span>
                Kategori e re
              </button>

              <button
                type="button"
                className="mms-sheet-btn"
                onClick={() => goMobile("/manager/places")}
              >
                <span><MapPin size={19} strokeWidth={2.3} /></span>
                Vend i ri (tavolinë / dhomë / çadër)
              </button>
            </div>
          </>
        )}
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