/**
 * Open-world feature flag (docs/larkit-open-world-implementation-plan.md, Part 4).
 *
 * The world mounts only when VITE_WORLD_ENABLED=true — an env var for now, a
 * per-user Supabase flag later for beta testing. This is what makes dark
 * merges safe: world code can land on main compiled-in but invisible, and
 * turning it on is a deploy-env change, not a code change.
 *
 * Locally: add VITE_WORLD_ENABLED=true to .env.local.
 * Preview testing (iPad via the Vercel preview URL): set VITE_WORLD_ENABLED=true
 * scoped to the Preview environment only — production stays dark.
 */
export function worldEnabled(env = import.meta.env) {
  return env?.VITE_WORLD_ENABLED === "true";
}
