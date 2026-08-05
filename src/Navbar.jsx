import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./useAuth";
import { useIsAdmin } from "./useIsAdmin";
import LarkMark from "./components/LarkMark";
import Feather from "./components/feather.jsx";
import { meadowEnabled } from "./gamificationFlags.js";

// Nav links are words, not glyphs (§13: icons never replace a word a
// five-year-old can read) — the feather set covers the controls only.
// The Meadow is the fourth tab on the perch (§04), behind its rollout flag.
const BASE_NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/play", label: "Play" },
  { to: "/worksheets", label: "Worksheets" },
  ...(meadowEnabled() ? [{ to: "/meadow", label: "Meadow" }] : []),
  { to: "/about", label: "About" },
];

const ADMIN_NAV_ITEM = { to: "/admin", label: "Admin" };

// The perch (§12): the avatar is a Lark Teal circle with the first initial in
// Cream — no photos, no uploads.
function AuthButton({ compact = false }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "You";
    const initial = name.trim().charAt(0).toUpperCase() || "?";
    return (
      <div className="flex items-center gap-2">
        <div
          className="h-9 w-9 rounded-full bg-teal flex items-center justify-center font-display font-semibold text-cream"
          title={name}
        >
          {initial}
        </div>
        {!compact && (
          <span className="text-sm font-bold text-ink max-w-[100px] truncate">{name}</span>
        )}
        <button
          className="p-2 rounded-xl cursor-pointer transition-colors hover:bg-ink/5"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <Feather name="close" size={16} className="text-ink" />
        </button>
      </div>
    );
  }

  // Signed out: the way in is the first-flight value page (§20), not a bare
  // OAuth popup.
  return (
    <button
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors text-ink hover:bg-ink/5 hover:text-teal"
      onClick={() => navigate("/welcome")}
    >
      <Feather name="profile" size={16} />
      {!compact && "Sign In"}
    </button>
  );
}

function isPathActive(currentPath, item) {
  if (item.end) return currentPath === item.to;
  return currentPath === item.to || currentPath.startsWith(`${item.to}/`);
}

// The perch — a quiet white bar on cream. The loudest thing on a larkit
// screen is always the problem, so the bar gets a flat 3px Ink 6% drop and
// nothing that competes with the mark.
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navItems = isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="no-print sticky top-0 z-30 bg-white shadow-[0_3px_0_#14231F0f]">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-16">
        {/* Mark + wordmark, always together, always a link home */}
        <button
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => {
            navigate("/");
            closeMobile();
          }}
          aria-label="larkit — back to the nest"
        >
          <LarkMark size={30} />
          <span className="font-display font-semibold text-2xl text-teal lowercase leading-none tracking-[-0.01em]">
            larkit
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isPathActive(pathname, item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
                  active ? "bg-ink/5 text-teal" : "text-ink hover:bg-ink/5 hover:text-teal"
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
          <AuthButton />
        </div>

        {/* Mobile right group */}
        <div className="flex sm:hidden items-center gap-1">
          <AuthButton compact />
          <button
            className="p-2 rounded-xl cursor-pointer hover:bg-ink/5"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <Feather name="close" size={24} className="text-ink" label="close menu" />
            ) : (
              <Feather name="menu" size={24} className="text-ink" label="open menu" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sm:hidden border-t border-ink/10 bg-white"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                const active = isPathActive(pathname, item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={closeMobile}
                    className={`block w-full px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
                      active ? "bg-ink/5 text-teal" : "text-ink hover:bg-ink/5 hover:text-teal"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
