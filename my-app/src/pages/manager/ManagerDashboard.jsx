import { useState } from "react";
import "./Dashboard.css";

import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import FinancePage from "./pages/FinancePage";
import SalesPage from "./pages/SalesPage";



export default function ManagerDashboard() {

  const [page, setPage] = useState("products");

  const renderPage = () => {
    switch(page) {
      case "products": return <ProductsPage />;
      case "users": return <UsersPage />;
      case "finance": return <FinancePage />;
      case "sales": return <SalesPage />;
      default: return <ProductsPage />;
    }
  };

  return (
    <div className="dashboard-container">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <h2 className="logo">🍽️ RestorantApp</h2>

        <button onClick={() => setPage("products")}
          className={page === "products" ? "active" : ""}>
           Produktet
        </button>

        <button onClick={() => setPage("users")}
          className={page === "users" ? "active" : ""}>
           Userat
        </button>

        <button onClick={() => setPage("finance")}
          className={page === "finance" ? "active" : ""}>
           Financat
        </button>

        <button onClick={() => setPage("sales")}
          className={page === "sales" ? "active" : ""}>
          📊 Shitjet
        </button>

        <button className="logout-btn" onClick={() => window.location.href="/login"}>
           Dil
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="content-area">
        {renderPage()}
      </main>
    </div>
  );
}
