import "./Sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Sidebar() {
  const navigate = useNavigate();
  const [openProducts, setOpenProducts] = useState(true);

  return (
    <aside className="sb">
      {/* Brand */}
      <div className="sb-brand" onClick={() => navigate("/manager")}>
        <span className="sb-brand-dot" />
        <span className="sb-brand-text">myOrder</span>
      </div>

      {/* Section: Produktet */}
      <button
        type="button"
        className="sb-section"
        onClick={() => setOpenProducts((v) => !v)}
      >
        <span className="sb-section-left">
          <span className="sb-ico">📦</span>
          <span className="sb-section-title">Produktet</span>
        </span>
        <span className="sb-arrow">{openProducts ? "▾" : "▸"}</span>
      </button>

      {openProducts && (
        <div className="sb-group">
          <NavLink
            to="subcategory?type=ushqime"
            className={({ isActive }) => "sb-item " + (isActive ? "active" : "")}
          >
            <span className="sb-ico">🍲</span>
            <span>Ushqime</span>
          </NavLink>

          <NavLink
            to="subcategory?type=pije"
            className={({ isActive }) => "sb-item " + (isActive ? "active" : "")}
          >
            <span className="sb-ico">🥤</span>
            <span>Pije</span>
          </NavLink>

          <NavLink
            to="subcategory?type=cadra"
            className={({ isActive }) => "sb-item " + (isActive ? "active" : "")}
          >
            <span className="sb-ico">🏖️</span>
            <span>Çadra</span>
          </NavLink>

          <NavLink
            to="subcategory?type=dhoma"
            className={({ isActive }) => "sb-item " + (isActive ? "active" : "")}
          >
            <span className="sb-ico">🏨</span>
            <span>Dhoma</span>
          </NavLink>

          <NavLink
            to="qr"
            className={({ isActive }) => "sb-item " + (isActive ? "active" : "")}
          >
            <span className="sb-ico">📋</span>
            <span>Menu / QR</span>
          </NavLink>
        </div>
      )}

      {/* Main links */}
      <div className="sb-spacer" />

      <NavLink
        to="dashboard"
        className={({ isActive }) => "sb-main " + (isActive ? "active" : "")}
      >
        <span className="sb-ico">📊</span>
        <span>Dashboard</span>
      </NavLink>

      <NavLink
        to="users"
        className={({ isActive }) => "sb-main " + (isActive ? "active" : "")}
      >
        <span className="sb-ico">👥</span>
        <span>Userat</span>
      </NavLink>

      <NavLink
        to="kembimi-valutor"
        className={({ isActive }) => "sb-main " + (isActive ? "active" : "")}
      >
        <span className="sb-ico">💱</span>
        <span>Këmbimi Valutor</span>
      </NavLink>
    </aside>
  );
}
