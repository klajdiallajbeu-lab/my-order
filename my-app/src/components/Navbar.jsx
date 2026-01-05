import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Ketu fshi gjithçka që ka të bëjë me sesionin
    // (shto edhe token, userId, businessId nëse i përdor)
    // p.sh:
    // localStorage.removeItem("token");
    // localStorage.removeItem("businessId");

    // ▸ Reset i datave të dashboard-it
    localStorage.removeItem("dashboard_from_date");
    localStorage.removeItem("dashboard_to_date");

    // Shko te login
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">🍽️ RestorantApp</div>
      <div className="navbar-links">
        <Link to="/manager">Menaxher</Link>

        {/* Mund ta stilosh si link në CSS */}
        <button className="navbar-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
