import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import LoadingScreen from "./LoadingScreen";

export default function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === "loading") return <LoadingScreen />;
  if (status === "authenticated") return <Navigate to="/chat" replace />;
  return <Outlet />;
}
