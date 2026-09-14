import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { worldEnabled } from "./worldFlags";

// Phaser is ~1.2MB minified; the dynamic import keeps it (and everything under
// src/world/) out of the main bundle. The chunk is only fetched when someone
// actually visits /world with the flag on.
const WorldPage = lazy(() => import("./WorldPage"));

/**
 * The single mount point the app shell knows about. With the flag off this
 * renders a redirect home, so /world behaves exactly like any unknown path
 * and the world stays invisible in production.
 */
export default function WorldRoute() {
  if (!worldEnabled()) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<div className="flex-1" aria-busy="true" />}>
      <WorldPage />
    </Suspense>
  );
}
