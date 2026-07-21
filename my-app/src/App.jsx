import { useMemo, useState, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { loginUserApi } from "./api/userApi.js";
import { refreshSocketAuth } from "./realtime/socket.js";


/* LAZY IMPORTS */
// Waiter
const WaiterPage                  = lazy(() => import("./pages/Waiter/WaiterPage.jsx"));
const WaiterTableOrderPage        = lazy(() => import("./pages/Waiter/WaiterTableOrderPage.jsx"));
const WaiterDesktopPage           = lazy(() => import("./pages/Waiter/WaiterDesktopPage"));
const WaiterOpenTablesDesktopPage = lazy(() => import("./pages/Waiter/WaiterOpenTablesDesktopPage"));
const WaiterXhiroDesktopPage      = lazy(() => import("./pages/Waiter/WaiterXhiroDesktopPage.jsx"));

// Manager
const ProfilePage          = lazy(() => import("./pages/manager/ProfilePage"));
const LoginPage            = lazy(() => import("./pages/login/LoginPage.jsx"));
const LoginPagePhone       = lazy(() => import("./pages/login/LoginPagePhone.jsx"));
const ForgotPasswordPage = lazy(() =>
  import("./pages/login/ForgotPasswordPage.jsx")
);
const SignupPage           = lazy(() => import("./pages/login/SignupPage.jsx"));
const DashboardPage        = lazy(() => import("./pages/manager/DashboardPage.jsx"));
const InventoryPage        = lazy(() => import("./pages/manager/InventoryPage.jsx"));
const ChangePasswordPage   = lazy(() => import("./pages/manager/ChangePasswordPage.jsx"));
const UserPage             = lazy(() => import("./pages/manager/UserPage.jsx"));
const QrPage               = lazy(() => import("./pages/manager/QrPage.jsx"));
const SubCategoryPage      = lazy(() => import("./pages/manager/SubCategoryPage.jsx"));
const ProductsPage         = lazy(() => import("./pages/manager/ProductsPage.jsx"));
const OrderDetailsPage     = lazy(() => import("./pages/manager/OrderDetailsPage.jsx"));
const XhiroPage            = lazy(() => import("./pages/manager/XhiroPage.jsx"));
const PorosiPage           = lazy(() => import("./pages/manager/PorosiPage.jsx"));
const KembimiValutorPage   = lazy(() => import("./pages/manager/KembimiValutorPage.jsx"));
const PlacesPage           = lazy(() => import("./pages/manager/PlacesPage.jsx"));
const PrinterSettingsPage  = lazy(() => import("./pages/manager/PrinterSettingsPage"));
const FaturaTelefoni       = lazy(() => import("./pages/manager/FaturaTelefoni"));
const ManagerLayout        = lazy(() => import("./pages/manager/ManagerLayout.jsx"));
const PorosiMobilePage     = lazy(() => import("./pages/manager/PorosiMobilePage.jsx"));
const XhiroMobilePage      = lazy(() => import("./pages/manager/XhiroMobilePage.jsx"));
const ClientMenuPage       = lazy(() => import("./pages/ClientMenuPage.jsx"));
const ClientOrderPage      = lazy(() => import("./pages/ClientOrderPage.jsx"));
const PrivacyPage = lazy(() => import("./pages/login/PrivacyPage.jsx"));
const TermsPage = lazy(() => import("./pages/login/TermsPage.jsx"));
const ContactPage = lazy(() => import("./pages/login/ContactPage.jsx"));


// Admin
const AdminLoginPage       = lazy(() => import("./pages/admin/AdminLoginPage.jsx"));
const AdminDashboard       = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const CreateBusinessPage   = lazy(() => import("./pages/admin/CreateBusinessPage.jsx"));
const ViewBusinessesPage   = lazy(() => import("./pages/admin/ViewBusinessesPage.jsx"));

/* HELPERS */
const readRole = () => (localStorage.getItem("role") || sessionStorage.getItem("role") || "").toLowerCase().trim();
const readUserId = () => localStorage.getItem("userId") || sessionStorage.getItem("userId");
const clearAuth = () => {
  [
    "adminId",
    "userId",
    "role",
    "userName",
    "token",
    "waiterId",
    "waiterName",
    "businessId"
  ].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
};

/* PROTECTED ROUTES */
const AdminProtected = ({ children }) => {
  const adminId = localStorage.getItem("adminId");
  const adminToken = localStorage.getItem("adminToken");

  return adminId && adminToken
    ? children
    : <Navigate to="/admin" replace />;
};
const ManagerProtected = ({ children }) => {
  const userId = readUserId(); const role = readRole();
  return userId && role && role !== "waiter" ? children : <Navigate to="/login" replace />;
};
const WaiterProtected = ({ children }) => {
  const userId = readUserId(); const role = readRole();
  return userId && role === "waiter" ? children : <Navigate to="/login" replace />;
};

/* LOADING */
const Loading = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontSize:"15px", color:"#9ca3af" }}>
    Duke ngarkuar...
  </div>
);

export default function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!readUserId());
  const [role, setRole]             = useState(readRole() || null);

  const defaultRoute = useMemo(() => {
    if (!isLoggedIn) return "/login";
    return role === "waiter" ? "/waiter" : "/manager";
  }, [isLoggedIn, role]);

  const handleLogout = () => {
    clearAuth(); setIsLoggedIn(false); setRole(null);

    // Pa token => socket-i bie nga room-i privat, mbetet guest.
    refreshSocketAuth();

    navigate("/login", { replace: true });
  };

  const handleLogin = async (username, password, turnstileToken) => {
    try {
      
      const user = await loginUserApi(username, password, turnstileToken);
      const normalizedRole = (user.role || "").toLowerCase().trim();
      const userId     = String(user.id || user._id || "");
      const userName   = String(user.name || "");
      const businessId = String(user.businessId || "");
      const token      = String(user.token || "");

      if (!userId || !businessId) return;

      clearAuth();

      if (token) {
        localStorage.setItem("token", token);
        sessionStorage.setItem("token", token);
      }

      ["role","userName","userId","businessId"].forEach(k => {
        const v = k === "role" ? normalizedRole : k === "userName" ? userName : k === "userId" ? userId : businessId;
        localStorage.setItem(k, v);
        sessionStorage.setItem(k, v);
      });

      if (normalizedRole === "waiter") {
        localStorage.setItem("waiterId", userId);   localStorage.setItem("waiterName", userName);
        sessionStorage.setItem("waiterId", userId); sessionStorage.setItem("waiterName", userName);
      }

      // Rilidh socket-in me token-in e ri => hyn te room-i privat i biznesit.
      refreshSocketAuth();

      setIsLoggedIn(true); setRole(normalizedRole);
      navigate(normalizedRole === "waiter" ? "/waiter" : "/manager", { replace: true });
    } catch (err) {
      console.error("Gabim te handleLogin:", err?.response?.data || err);
    }
  };

  const isMobile = window.innerWidth <= 900;

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* ADMIN */}
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard"      element={<AdminProtected><AdminDashboard /></AdminProtected>} />
        <Route path="/admin/business/create" element={<AdminProtected><CreateBusinessPage /></AdminProtected>} />
        <Route path="/admin/business/list"   element={<AdminProtected><ViewBusinessesPage /></AdminProtected>} />

        {/* PUBLIKE */}
        <Route path="/menu"                        element={<ClientMenuPage />} />
        <Route path="/order/:token"                element={<ClientOrderPage />} />
        <Route path="/order-session/:sessionToken" element={<ClientOrderPage />} />

        {/* LOGIN */}
        <Route path="/login" element={
          isLoggedIn ? <Navigate to={defaultRoute} replace /> :
          isMobile   ? <LoginPagePhone onLogin={handleLogin} /> :
                       <LoginPage onLogin={handleLogin} />
        } />
        <Route path="/signup" element={<SignupPage />}
         />
         <Route path="/privacy" element={<PrivacyPage />} />
<Route path="/terms" element={<TermsPage />} />
<Route path="/contact" element={<ContactPage />} />

        {/* MANAGER */}
        <Route path="/manager" element={<ManagerProtected><ManagerLayout setIsLoggedIn={setIsLoggedIn} /></ManagerProtected>}>
          <Route index element={<Navigate to="xhiro" replace />} />
          <Route path="dashboard"       element={<DashboardPage />} />
          <Route path="users"           element={<UserPage />} />
          <Route path="qr"              element={<QrPage />} />
          <Route path="subcategory"     element={<SubCategoryPage />} />
          <Route path="products"        element={<ProductsPage />} />
          <Route path="inventari"       element={<InventoryPage />} />
          <Route path="xhiro"           element={isMobile ? <XhiroMobilePage /> : <XhiroPage />} />
          <Route path="orders"          element={isMobile ? <PorosiMobilePage /> : <PorosiPage />} />
          <Route path="kembimi-valutor" element={<KembimiValutorPage />} />
          <Route path="places"          element={<PlacesPage />} />
          <Route path="profile"         element={<ProfilePage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="printers"        element={<PrinterSettingsPage />} />

        </Route>

        <Route path="/manager/print-listener" element={<ManagerProtected><FaturaTelefoni /></ManagerProtected>} />
        <Route path="/manager/order/:id"      element={<ManagerProtected><OrderDetailsPage /></ManagerProtected>} />

        {/* WAITER */}
        <Route path="/waiter" element={<WaiterProtected>{isMobile ? <WaiterPage onLogout={handleLogout} /> : <WaiterDesktopPage onLogout={handleLogout} />}</WaiterProtected>} />
        <Route path="/waiter-desktop"        element={<WaiterProtected><WaiterDesktopPage onLogout={handleLogout} /></WaiterProtected>} />
        <Route path="/waiter/table/:tableNumber" element={<WaiterProtected><WaiterTableOrderPage /></WaiterProtected>} />
        <Route path="/waiter/open-tables"    element={<WaiterProtected><WaiterOpenTablesDesktopPage /></WaiterProtected>} />
        <Route path="/waiter/xhiro"          element={<WaiterXhiroDesktopPage />} />
        <Route
    path="/forgot-password"
    element={<ForgotPasswordPage />}
/>

        {/* DEFAULT */}
        <Route path="/"  element={<Navigate to={defaultRoute} replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}