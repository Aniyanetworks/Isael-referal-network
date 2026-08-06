import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types";

/** Gates a route tree to sessions whose profile has the given role. */
export function RequireAuth({ role }: { role: UserRole }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="mt-16 text-center text-sm text-zinc-500">Loading...</div>;
  }

  if (!session || !profile || profile.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
