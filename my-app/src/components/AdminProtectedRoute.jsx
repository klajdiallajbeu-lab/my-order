import { Navigate, Outlet } from "react-router-dom";

export default function AdminProtectedRoute() {
  const adminId = localStorage.getItem("adminId");
  const token = localStorage.getItem("adminToken");

  if (!adminId || !token) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}