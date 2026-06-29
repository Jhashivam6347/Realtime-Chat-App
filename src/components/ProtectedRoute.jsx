import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");

  // if no token → go to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // if token exists → allow access
  return <Outlet />;
}
