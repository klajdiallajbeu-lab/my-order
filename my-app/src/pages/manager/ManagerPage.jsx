import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ManagerPage.css";
import Sidebar from "../../components/Sidebar";
import FaturaTelefoni from "./FaturaTelefoni";

export default function ManagerPage({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="manager-layout">

      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      <div
        className={`mobile-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="manager-body">
        <div className={`manager-sidebar-wrap ${sidebarOpen ? "open" : ""}`}>
          <div className="mobile-sidebar-top">
            <button
              type="button"
              className="mobile-close-btn"
              onClick={() => setSidebarOpen(false)}
            >
              ×
            </button>
          </div>

          <Sidebar
            onLogout={onLogout}
            closeSidebar={() => setSidebarOpen(false)}
          />
        </div>

        <div className="manager-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}