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

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate();

  const [openProducts, setOpenProducts] = useState(false);
  const [openOperations, setOpenOperations] = useState(false);
  const [openStaff, setOpenStaff] = useState(false);
  const [openFinance, setOpenFinance] = useState(false);

const handleLogout = () => {
  if (typeof onLogout === "function") {
    onLogout();
  } else {
    navigate("/login");
  }
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
        <NavLink
          to="dashboard"
          className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <LayoutGrid size={16} strokeWidth={2} />
            </span>
            <span className="sb-link-text">Dashboard</span>
          </span>
        </NavLink>

        <button
          type="button"
          className="sb-section-btn"
          onClick={() => setOpenProducts((v) => !v)}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Box size={16} strokeWidth={2} />
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
              to="subcategory?type=ushqime"
              className={({ isActive }) => `sb-sub-link ${isActive ? "active" : ""}`}
            >
              <span className="sb-sub-icon">
                <UtensilsCrossed size={15} strokeWidth={2} />
              </span>
              <span>Ushqime</span>
            </NavLink>

            <NavLink
              to="subcategory?type=pije"
              className={({ isActive }) => `sb-sub-link ${isActive ? "active" : ""}`}
            >
              <span className="sb-sub-icon">
                <GlassWater size={15} strokeWidth={2} />
              </span>
              <span>Pije</span>
            </NavLink>
          </div>
        )}

        <button
          type="button"
          className="sb-section-btn"
          onClick={() => setOpenOperations((v) => !v)}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Hotel size={16} strokeWidth={2} />
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
              className={({ isActive }) => `sb-sub-link ${isActive ? "active" : ""}`}
            >
              <span className="sb-sub-icon">
                <Hotel size={15} strokeWidth={2} />
              </span>
              <span>Dhoma / Cadra</span>
            </NavLink>

            <NavLink
              to="qr"
              className={({ isActive }) => `sb-sub-link ${isActive ? "active" : ""}`}
            >
              <span className="sb-sub-icon">
                <QrCode size={15} strokeWidth={2} />
              </span>
              <span>Menu / QR</span>
            </NavLink>
          </div>
        )}

        <button
          type="button"
          className="sb-section-btn"
          onClick={() => setOpenStaff((v) => !v)}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Users size={16} strokeWidth={2} />
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
              className={({ isActive }) => `sb-sub-link ${isActive ? "active" : ""}`}
            >
              <span className="sb-sub-icon">
                <Users size={15} strokeWidth={2} />
              </span>
              <span>Perdoruesit</span>
            </NavLink>
          </div>
        )}

        <button
          type="button"
          className="sb-section-btn"
          onClick={() => setOpenFinance((v) => !v)}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <Wallet size={16} strokeWidth={2} />
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
              className={({ isActive }) => `sb-sub-link ${isActive ? "active" : ""}`}
            >
              <span className="sb-sub-icon">
                <Wallet size={15} strokeWidth={2} />
              </span>
              <span>Këmbimi Valutor</span>
            </NavLink>
          </div>
        )}
      </div>

      <div className="sb-footer">
        <NavLink
          to="profile"
          className={({ isActive }) => `sb-link ${isActive ? "active" : ""}`}
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <User size={16} strokeWidth={2} />
            </span>
            <span className="sb-link-text">Profili</span>
          </span>
        </NavLink>

        <button type="button" className="sb-logout-btn" onClick={handleLogout}>
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <LogOut size={16} strokeWidth={2} />
            </span>
            <span className="sb-link-text">Dil</span>
          </span>
        </button>
      </div>
    </aside>
  );
}