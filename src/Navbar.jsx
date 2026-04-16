import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Home,
  Gamepad2,
  FileText,
  Menu,
  X,
  Palette,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import { THEMES, THEME_IDS } from "./themes";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "game", label: "Play", icon: Gamepad2 },
  { id: "worksheet", label: "Worksheets", icon: FileText },
];

function ThemePicker() {
  const { theme, themeId, setThemeId } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <motion.button
        className={`p-2 rounded-xl cursor-pointer transition-colors ${
          theme.id === "default"
            ? "hover:bg-gray-100"
            : "hover:bg-white/20"
        }`}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
      >
        <Palette className={`h-5 w-5 ${theme.navText}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-2 space-y-1">
              <p className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wide">
                Choose Theme
              </p>
              {THEME_IDS.map((id) => {
                const t = THEMES[id];
                const active = id === themeId;
                return (
                  <button
                    key={id}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left cursor-pointer transition-colors ${
                      active
                        ? "bg-violet-50 ring-2 ring-violet-300"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setThemeId(id);
                      setOpen(false);
                    }}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-700">
                        {t.label}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuthButton({ compact = false }) {
  const { theme } = useTheme();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) return null;

  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "You";
    const avatar = user.user_metadata?.avatar_url;
    return (
      <div className="flex items-center gap-2">
        {avatar ? (
          <img src={avatar} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <User className={`h-5 w-5 ${theme.navText}`} />
        )}
        {!compact && (
          <span className={`text-sm font-bold ${theme.navText} max-w-[100px] truncate`}>
            {name}
          </span>
        )}
        <button
          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
            theme.id === "default" ? "hover:bg-gray-100" : "hover:bg-white/20"
          }`}
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className={`h-4 w-4 ${theme.navText}`} />
        </button>
      </div>
    );
  }

  return (
    <button
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ${theme.navText} ${theme.navHover}`}
      onClick={signInWithGoogle}
    >
      <LogIn className="h-4 w-4" />
      {!compact && "Sign In"}
    </button>
  );
}

export default function Navbar({ currentView, onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useTheme();

  const handleNav = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <nav className={`no-print sticky top-0 z-30 ${theme.navBg} backdrop-blur shadow-sm`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <button
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleNav("home")}
        >
          <div className={`bg-gradient-to-br ${theme.logoPill} p-1.5 rounded-xl`}>
            <Rocket className="h-5 w-5 text-white -rotate-45" />
          </div>
          <span className={`text-lg font-extrabold ${theme.navText} hidden sm:inline`}>
            Kid Math Explorer
          </span>
          <span className={`text-lg font-extrabold ${theme.navText} sm:hidden`}>
            KidMath
          </span>
        </button>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
                  active ? theme.navActive : `${theme.navText} ${theme.navHover}`
                }`}
                onClick={() => handleNav(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
          <ThemePicker />
          <AuthButton />
        </div>

        {/* Mobile right group */}
        <div className="flex sm:hidden items-center gap-1">
          <AuthButton compact />
          <ThemePicker />
          <button
            className={`p-2 rounded-xl cursor-pointer ${
              theme.id === "default" ? "hover:bg-gray-100" : "hover:bg-white/20"
            }`}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className={`h-6 w-6 ${theme.navText}`} />
            ) : (
              <Menu className={`h-6 w-6 ${theme.navText}`} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className={`sm:hidden border-t border-white/20 ${theme.navBg} backdrop-blur`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-2 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors ${
                      active ? theme.navActive : `${theme.navText} ${theme.navHover}`
                    }`}
                    onClick={() => handleNav(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
