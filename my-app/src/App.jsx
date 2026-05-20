// src/App.jsx
import { useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

/* WAITER */
import WaiterPage from "./pages/Waiter/WaiterPage.jsx";
import WaiterTableOrderPage from "./pages/Waiter/WaiterTableOrderPage.jsx";
import WaiterDesktopPage from "./pages/Waiter/WaiterDesktopPage";
import WaiterOpenTablesDesktopPage from "./pages/Waiter/WaiterOpenTablesDesktopPage";
import WaiterXhiroDesktopPage from "./pages/Waiter/WaiterXhiroDesktopPage.jsx";

/* MANAGER */
import ProfilePage from "./pages/manager/ProfilePage";
import LoginPage from "./pages/login/LoginPage.jsx";
import SignupPage from "./pages/login/SignupPage.jsx";
import DashboardPage from "./pages/manager/DashboardPage.jsx";
import InventoryPage from "./pages/manager/InventoryPage.jsx";
import ChangePasswordPage from "./pages/manager/ChangePasswordPage.jsx";
import UserPage from "./pages/manager/UserPage.jsx";
import QrPage from "./pages/manager/QrPage.jsx";
import SubCategoryPage from "./pages/manager/SubCategoryPage.jsx";
import ProductsPage from "./pages/manager/ProductsPage.jsx";
import OrderDetailsPage from "./pages/manager/OrderDetailsPage.jsx";
import XhiroPage from "./pages/manager/XhiroPage.jsx";
import PorosiPage from "./pages/manager/PorosiPage.jsx";
import ClientMenuPage from "./pages/ClientMenuPage.jsx";
import ClientOrderPage from "./pages/ClientOrderPage.jsx";
import KembimiValutorPage from "./pages/manager/KembimiValutorPage.jsx";
import PlacesPage from "./pages/manager/PlacesPage.jsx";
import PrinterSettingsPage from "./pages/manager/PrinterSettingsPage";

/* MOBILE VERSION MANAGER */
import ManagerLayout from "./pages/manager/ManagerLayout.jsx";
import PorosiMobilePage from "./pages/manager/PorosiMobilePage.jsx";
import XhiroMobilePage from "./pages/manager/XhiroMobilePage.jsx";


/* ADMIN */
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import CreateBusinessPage from "./pages/admin/CreateBusinessPage.jsx";
import ViewBusinessesPage from "./pages/admin/ViewBusinessesPage.jsx";

/* API */
import { loginUserApi } from "./api/userApi.js";

import LoginPagePhone from "./pages/login/LoginPagePhone.jsx";

/* =========================
   HELPERS
========================= */
const readRole = () =>
  (sessionStorage.getItem("role") || "").toLowerCase().trim();

const readUserId = () => sessionStorage.getItem("userId");

const clearAuth = () => {
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
};

/* =========================
   PROTECTED ROUTES
========================= */
const AdminProtected = ({ children }) => {
  const adminId = localStorage.getItem("adminId");
  return adminId ? children : <Navigate to="/admin" replace />;
};

const ManagerProtected = ({ children }) => {
  const userId = readUserId();
  const role = readRole();

  return userId && role && role !== "waiter"
    ? children
    : <Navigate to="/login" replace />;
};

const WaiterProtected = ({ children }) => {
  const userId = readUserId();
  const role = readRole();

  return userId && role === "waiter"
    ? children
    : <Navigate to="/login" replace />;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!readUserId());
  const [role, setRole] = useState(readRole() || null);

  const defaultRoute = useMemo(() => {
    if (!isLoggedIn) return "/login";
    return role === "waiter" ? "/waiter" : "/manager";
  }, [isLoggedIn, role]);

  const handleLogout = () => {
    clearAuth();
    setIsLoggedIn(false);
    setRole(null);
    window.location.assign("/login");
  };

  const handleLogin = async (username, password) => {
    try {
      const user = await loginUserApi(username, password);
      console.log("LOGIN USER:", user);

      const normalizedRole = (user.role || "").toLowerCase().trim();
      const userId = String(user.id || user._id || "");
      const userName = String(user.name || "");
      const businessId = String(user.businessId || "");

      if (!userId) {
        alert("Mungon userId nga backend.");
        return;
      }

      if (!businessId) {
        alert("Mungon businessId nga backend.");
        return;
      }

      clearAuth();

      sessionStorage.setItem("role", normalizedRole);
      sessionStorage.setItem("userName", userName);
      sessionStorage.setItem("userId", userId);
      sessionStorage.setItem("businessId", businessId);

      localStorage.setItem("businessId", businessId);

      if (normalizedRole === "waiter") {
        sessionStorage.setItem("waiterId", userId);
        sessionStorage.setItem("waiterName", userName);

        localStorage.setItem("waiterId", userId);
        localStorage.setItem("waiterName", userName);
      } else {
        sessionStorage.removeItem("waiterId");
        sessionStorage.removeItem("waiterName");
        localStorage.removeItem("waiterId");
        localStorage.removeItem("waiterName");
      }

      setIsLoggedIn(true);
      setRole(normalizedRole);

      window.location.assign(
        normalizedRole === "waiter" ? "/waiter" : "/manager"
      );
    } catch (err) {
      console.error("Gabim te handleLogin:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Kredencialet janë të pasakta!");
    }
  };

  const isMobile = window.innerWidth <= 900;

  return (
    <Routes>
      {/* ADMIN */}
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtected>
            <AdminDashboard />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/business/create"
        element={
          <AdminProtected>
            <CreateBusinessPage />
          </AdminProtected>
        }
      />
      <Route
        path="/admin/business/list"
        element={
          <AdminProtected>
            <ViewBusinessesPage />
          </AdminProtected>
        }
      />

      {/* PUBLIKE */}
      <Route path="/menu" element={<ClientMenuPage />} />
      <Route path="/order/:token" element={<ClientOrderPage />} />
      <Route
        path="/order-session/:sessionToken"
        element={<ClientOrderPage />}
      />

      {/* LOGIN */}
      <Route
  path="/login"
  element={
    isLoggedIn ? (
      <Navigate to={defaultRoute} replace />
    ) : isMobile ? (
      <LoginPagePhone onLogin={handleLogin} />
    ) : (
      <LoginPage onLogin={handleLogin} />
    )
  }
/>
      <Route path="/signup" element={<SignupPage />} />

      {/* MANAGER */}
      <Route
        path="/manager"
        element={
          <ManagerProtected>
            <ManagerLayout setIsLoggedIn={setIsLoggedIn} />
          </ManagerProtected>
        }
      >
        <Route index element={<Navigate to="xhiro" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UserPage />} />
        <Route path="qr" element={<QrPage />} />
        <Route path="subcategory" element={<SubCategoryPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventari" element={<InventoryPage />} />

        <Route
          path="xhiro"
          element={isMobile ? <XhiroMobilePage /> : <XhiroPage />}
        />

        <Route
          path="orders"
          element={isMobile ? <PorosiMobilePage /> : <PorosiPage />}
        />

        <Route
          path="kembimi-valutor"
          element={<KembimiValutorPage />}
        />
        <Route path="places" element={<PlacesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="change-password"
          element={<ChangePasswordPage />}
        />
        <Route path="printers" element={<PrinterSettingsPage />} />
      </Route>

      <Route
        path="/manager/order/:id"
        element={
          <ManagerProtected>
            <OrderDetailsPage />
          </ManagerProtected>
        }
      />

{/* WAITER */}
<Route
  path="/waiter"
  element={
    <WaiterProtected>
      {isMobile ? (
        <WaiterPage onLogout={handleLogout} />
      ) : (
        <WaiterDesktopPage onLogout={handleLogout} />
      )}
    </WaiterProtected>
  }
/>

<Route
  path="/waiter-desktop"
  element={
    <WaiterProtected>
      <WaiterDesktopPage onLogout={handleLogout} />
    </WaiterProtected>
  }
/>

<Route
  path="/waiter/table/:tableNumber"
  element={
    <WaiterProtected>
      <WaiterTableOrderPage />
    </WaiterProtected>
  }
/>

<Route
  path="/waiter/open-tables"
  element={
    <WaiterProtected>
      <WaiterOpenTablesDesktopPage />
    </WaiterProtected>
  }
/>
<Route path="/waiter/xhiro" element={<WaiterXhiroDesktopPage />} />




      {/* DEFAULT */}
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}