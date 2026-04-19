import { useIsAdmin } from "./useIsAdmin";

/**
 * Renders children only when the current user is an admin.
 * Shows a brief loading message while checking and a friendly "no access"
 * note when the check completes for a non-admin.
 */
export default function RequireAdmin({ children, fallback = null }) {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) return <div className="p-6 text-sm opacity-70">Checking permissions...</div>;
  if (!isAdmin) return fallback || <div className="p-6 text-sm opacity-70">Admin access required.</div>;
  return children;
}
