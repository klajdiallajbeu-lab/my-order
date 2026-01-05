import { Navigate, Outlet } from "react-router-dom";

export default function AdminProtectedRoute() {
  const adminId = localStorage.getItem("adminId");
  return adminId ? <Outlet /> : <Navigate to="/admin" replace />;
}
