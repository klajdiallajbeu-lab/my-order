// src/App.jsx
import { useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

/* WAITER */
import WaiterPage from "./pages/Waiter/WaiterPage.jsx";

/* MANAGER */
import LoginPage from "./pages/manager/LoginPage.jsx";
import ManagerPage from "./pages/manager/ManagerPage.jsx";
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


/* ADMIN */
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import CreateBusinessPage from "./pages/admin/CreateBusinessPage.jsx";
import ViewBusinessesPage from "./pages/admin/ViewBusinessesPage.jsx";

/* API */
import { loginUserApi } from "./api/userApi.js";

/* =========================
   HELPERS (TAB-SAFE)
   ✅ Auth në sessionStorage (çdo tab veç)
   ✅ businessId mund ta lësh në localStorage (shared) ose sessionStorage
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

  // businessId s’po e pastrojmë (që ta mbash sipas biznesit)
  // localStorage.removeItem("businessId");
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
  // ✅ inicializim nga sessionStorage (që mos prishen tab-et)
  const [isLoggedIn, setIsLoggedIn] = useState(!!readUserId());
  const [role, setRole] = useState(readRole() || null);

  const defaultRoute = useMemo(() => {
    if (!isLoggedIn) return "/login";
    return role === "waiter" ? "/waiter" : "/manager";
  }, [isLoggedIn, role]);

  // ✅ LOGOUT pa white screen (hard redirect -> rivesh auth guard menjëherë)
  const handleLogout = () => {
    clearAuth();
    setIsLoggedIn(false);
    setRole(null);
    window.location.assign("/login");
  };

  // ✅ LOGIN (manager / waiter)
  const handleLogin = async (username, password) => {
    try {
      const user = await loginUserApi(username, password);
      const normalizedRole = (user.role || "").toLowerCase().trim();

      // businessId mund të jetë shared
      localStorage.setItem("businessId", user.businessId);

      // ✅ auth në sessionStorage
      sessionStorage.setItem("role", normalizedRole);
      sessionStorage.setItem("userName", user.name);
      sessionStorage.setItem("userId", user.id);

      if (normalizedRole === "waiter") {
        sessionStorage.setItem("waiterId", user.id);
        sessionStorage.setItem("waiterName", user.name);
      } else {
        sessionStorage.removeItem("waiterId");
        sessionStorage.removeItem("waiterName");
      }

      setIsLoggedIn(true);
      setRole(normalizedRole);

      // ✅ hard redirect: s’ka “white screen” / state race
      window.location.assign(normalizedRole === "waiter" ? "/waiter" : "/manager");
    } catch (err) {
      console.error("❌ Gabim te handleLogin:", err.response?.data || err);
      alert(err.response?.data?.message || "❌ Kredencialet janë të pasakta!");
    }
  };

  return (
    <Routes>
      {/* ---------------------- ADMIN ---------------------- */}
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

      {/* ---------------------- PUBLIKE (QR) ---------------------- */}
      <Route path="/menu" element={<ClientMenuPage />} />
      <Route path="/order" element={<ClientOrderPage />} />

      {/* ---------------------- LOGIN ---------------------- */}
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to={defaultRoute} replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />

      {/* ---------------------- MANAGER ---------------------- */}
      <Route
        path="/manager"
        element={
          <ManagerProtected>
            <ManagerPage onLogout={handleLogout} />
          </ManagerProtected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UserPage />} />
        <Route path="qr" element={<QrPage />} />
        <Route path="subcategory" element={<SubCategoryPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="inventari" element={<InventoryPage />} />
        <Route path="xhiro" element={<XhiroPage />} />
        <Route path="orders" element={<PorosiPage />} />
        <Route path="kembimi-valutor" element={<KembimiValutorPage />} />
      </Route>

      <Route
        path="/manager/order/:id"
        element={
          <ManagerProtected>
            <OrderDetailsPage />
          </ManagerProtected>
        }
      />

      <Route
        path="/change-password"
        element={
          <ManagerProtected>
            <ChangePasswordPage />
          </ManagerProtected>
        }
      />

      {/* ---------------------- WAITER ---------------------- */}
      <Route
        path="/waiter"
        element={
          <WaiterProtected>
            <WaiterPage onLogout={handleLogout} />
          </WaiterProtected>
        }
      />

      {/* ---------------------- DEFAULT ---------------------- */}
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
