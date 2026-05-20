import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  PieChart,
  Receipt,
  LogOut,
} from "lucide-react";
import "./ManagerMobilePage.css";

export default function ManagerMobilePage({
  setIsLoggedIn,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/manager") {
      navigate("/manager/xhiro", {
        replace: true,
      });
    }
  }, [location.pathname, navigate]);

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

  const isFinanceActive =
    location.pathname === "/manager/xhiro";

  const isOrdersActive =
    location.pathname === "/manager/orders";

  return (
    <div className="manager-mobile-layout">
      <main className="manager-mobile-content">
        <Outlet />
      </main>

      <nav className="manager-mobile-bottom-nav">
        <button
          type="button"
          className={`manager-mobile-nav-btn ${
            isFinanceActive
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate("/manager/xhiro")
          }
        >
          <PieChart
            size={18}
            strokeWidth={2.4}
          />

          <span>Financat</span>
        </button>

        <button
          type="button"
          className={`manager-mobile-nav-btn ${
            isOrdersActive
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate("/manager/orders")
          }
        >
          <Receipt
            size={18}
            strokeWidth={2.4}
          />

          <span>Faturat</span>
        </button>

        <button
          type="button"
          className="manager-mobile-nav-btn logout"
          onClick={handleLogout}
        >
          <LogOut
            size={18}
            strokeWidth={2.4}
          />

          <span>Dil</span>
        </button>
      </nav>
    </div>
  );
}