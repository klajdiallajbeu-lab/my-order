import "./Sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutGrid,
  Box,
  UtensilsCrossed,
  GlassWater,
  Hotel,
  QrCode,
  Users,
  Wallet,
  ChevronDown,
  Plus,
  User,
  LogOut,
} from "lucide-react";

export default function Sidebar({ onLogout, closeSidebar }) {
  const navigate = useNavigate();

  const [openProducts, setOpenProducts] = useState(false);
  const [openOperations, setOpenOperations] = useState(false);
  const [openStaff, setOpenStaff] = useState(false);
  const [openFinance, setOpenFinance] = useState(false);

  /* 🔥 Close sidebar kur klikon */
  const handleNavigate = () => {
    if (closeSidebar) closeSidebar();
  };

  /* 🔥 Logout + close sidebar */
  const handleLogout = () => {
    if (closeSidebar) closeSidebar();

    if (typeof onLogout === "function") {
      onLogout();
    } else {
      navigate("/login");
    }
  };

  /* 🔥 Accordion behavior (hap vetëm një) */
  const toggleSection = (section) => {
    setOpenProducts(section === "products" ? !openProducts : false);
    setOpenOperations(section === "operations" ? !openOperations : false);
    setOpenStaff(section === "staff" ? !openStaff : false);
    setOpenFinance(section === "finance" ? !openFinance : false);
  };

  return (
    <aside className="sb">
      <div className="sb-top">
        <div className="sb-logo-mark" />
        <div className="sb-brand">
          <div className="sb-brand-title">myOrder</div>
          <div className="sb-brand-sub">Management Platform</div>
        </div>
      </div>

      <div className="sb-divider" />

      <div className="sb-menu">

        {/* DASHBOARD */}
        <NavLink
          to="dashboard"
          onClick={handleNavigate}
          className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <LayoutGrid size={16} />
            </span>
            <span className="sb-link-text">Dashboard</span>
          </span>
        </NavLink>

        {/* PRODUKTET */}
        <button
          type="button"
          className="sb-section-btn"
          onClick={() => toggleSection("products")}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Box size={16} />
            </span>
            <span className="sb-link-text">Produktet</span>
          </span>

          <span className="sb-action-icon">
            {openProducts ? <ChevronDown size={15} /> : <Plus size={15} />}
          </span>
        </button>

        {openProducts && (
          <div className="sb-submenu">
            <NavLink
              to="subcategory?type=Ushqime"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `sb-sub-link ${isActive ? "active" : ""}`
              }
            >
              <UtensilsCrossed size={15} />
              <span>Restorant</span>
            </NavLink>

            <NavLink
              to="subcategory?type=Pije"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `sb-sub-link ${isActive ? "active" : ""}`
              }
            >
              <GlassWater size={15} />
              <span>Bar</span>
            </NavLink>
          </div>
        )}

        {/* OPERACIONE */}
        <button
          type="button"
          className="sb-section-btn"
          onClick={() => toggleSection("operations")}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Hotel size={16} />
            </span>
            <span className="sb-link-text">Operacione</span>
          </span>

          <span className="sb-action-icon">
            {openOperations ? <ChevronDown size={15} /> : <Plus size={15} />}
          </span>
        </button>

{openOperations && (
  <div className="sb-submenu">
    <NavLink
      to="places"
      onClick={handleNavigate}
      className={({ isActive }) =>
        `sb-sub-link ${isActive ? "active" : ""}`
      }
    >
      <Hotel size={15} />
      <span>Dhoma / Çadra</span>
    </NavLink>

    <NavLink
      to="qr"
      onClick={handleNavigate}
      className={({ isActive }) =>
        `sb-sub-link ${isActive ? "active" : ""}`
      }
    >
      <QrCode size={15} />
      <span>Menu / QR</span>
    </NavLink>

    {/* 🔥 KJO ËSHTË E REJA */}
    <NavLink
      to="printers"
      onClick={handleNavigate}
      className={({ isActive }) =>
        `sb-sub-link ${isActive ? "active" : ""}`
      }
    >
      <QrCode size={15} />
      <span>Printerat</span>
    </NavLink>
  </div>
)}

        {/* STAFI */}
        <button
          type="button"
          className="sb-section-btn"
          onClick={() => toggleSection("staff")}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Users size={16} />
            </span>
            <span className="sb-link-text">Stafi</span>
          </span>

          <span className="sb-action-icon">
            {openStaff ? <ChevronDown size={15} /> : <Plus size={15} />}
          </span>
        </button>

        {openStaff && (
          <div className="sb-submenu">
            <NavLink
              to="users"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `sb-sub-link ${isActive ? "active" : ""}`
              }
            >
              <Users size={15} />
              <span>Përdoruesit</span>
            </NavLink>
          </div>
        )}

        {/* FINANCAT */}
        <button
          type="button"
          className="sb-section-btn"
          onClick={() => toggleSection("finance")}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Wallet size={16} />
            </span>
            <span className="sb-link-text">Financat</span>
          </span>

          <span className="sb-action-icon">
            {openFinance ? <ChevronDown size={15} /> : <Plus size={15} />}
          </span>
        </button>

        {openFinance && (
          <div className="sb-submenu">
            <NavLink
              to="kembimi-valutor"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `sb-sub-link ${isActive ? "active" : ""}`
              }
            >
              <Wallet size={15} />
              <span>Këmbimi Valutor</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="sb-footer">
        <NavLink
          to="profile"
          onClick={handleNavigate}
          className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
        >
          <User size={16} />
          <span>Profili</span>
        </NavLink>

        <button className="sb-logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Dil</span>
        </button>
      </div>
    </aside>
  );
}