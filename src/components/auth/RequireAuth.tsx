import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/** Gates the admin-only area of the app - there is no other logged-in role. */
export function RequireAuth() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="mt-16 text-center text-sm text-gray-500">Loading...</div>;
  }

  if (!session || !profile || profile.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
