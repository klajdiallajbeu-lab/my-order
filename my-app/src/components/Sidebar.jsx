import "./Sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.webp";
import logoFull from "../assets/logo.webp";
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
  Printer,
} from "lucide-react";

export default function Sidebar({ onLogout, closeSidebar }) {
  const navigate = useNavigate();

  const [openProducts, setOpenProducts] = useState(false);
  const [openOperations, setOpenOperations] = useState(false);
  const [openStaff, setOpenStaff] = useState(false);
  const [openFinance, setOpenFinance] = useState(false);

  const handleNavigate = () => {
    if (closeSidebar) closeSidebar();
  };

  const handleLogout = () => {
    if (closeSidebar) closeSidebar();

    if (typeof onLogout === "function") {
      onLogout();
      return;
    }

    navigate("/login");
  };

  const openPrintListener = () => {
    window.open(
      "/manager/print-listener",
      "_blank",
    );

    handleNavigate();
  };

  const toggleSection = (section) => {
    setOpenProducts(section === "products" ? !openProducts : false);
    setOpenOperations(section === "operations" ? !openOperations : false);
    setOpenStaff(section === "staff" ? !openStaff : false);
    setOpenFinance(section === "finance" ? !openFinance : false);
  };

  return (
    <aside className="sb">
      <div className="sb-top">
  <img src={logoFull} alt="myOrder" className="sb-logo-img" />
</div>

      <div className="sb-divider" />

      <div className="sb-menu">
        <NavLink
          to="dashboard"
          onClick={handleNavigate}
          className={({ isActive }) =>
            `sb-link ${isActive ? "active" : ""}`
          }
        >
          <span className="sb-link-left">
            <span className="sb-icon-wrap">
              <LayoutGrid size={16} />
            </span>
            <span className="sb-link-text">Dashboard</span>
          </span>
        </NavLink>

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
              to="products?type=ushqime"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `sb-sub-link ${isActive ? "active" : ""}`
              }
            >
              <UtensilsCrossed size={15} />
              <span>Restorant</span>
            </NavLink>

            <NavLink
              to="products?type=pije"
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
              <span>Vendet & QR</span>
            </NavLink>

            <NavLink
              to="printers"
              onClick={handleNavigate}
              className={({ isActive }) =>
                `sb-sub-link ${isActive ? "active" : ""}`
              }
            >
              <Printer size={15} />
              <span>Printerat</span>
            </NavLink>
          </div>
        )}

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

      <div className="sb-footer">
        <button
          type="button"
          className="sb-link"
          onClick={openPrintListener}
        >
          <Printer size={16} />
          <span>Print Listener</span>
        </button>

        <NavLink
          to="profile"
          onClick={handleNavigate}
          className={({ isActive }) =>
            `sb-link ${isActive ? "active" : ""}`
          }
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