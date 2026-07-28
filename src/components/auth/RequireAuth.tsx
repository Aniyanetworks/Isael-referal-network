import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types";

interface RequireAuthProps {
  role: UserRole;
}

export function RequireAuth({ role }: RequireAuthProps) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="mt-16 text-center text-sm text-gray-500">Loading...</div>;
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== role) {
    const correctPath = profile.role === "admin" ? "/admin/dashboard" : "/partner/dashboard";
    return <Navigate to={correctPath} replace />;
  }

  if (profile.role === "partner" && !profile.partner_id) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <p className="font-semibold">Almost there</p>
        <p className="mt-2 text-sm">
          Your account is created, but an admin still needs to link it to your
          business listing before you can see your dashboard.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
