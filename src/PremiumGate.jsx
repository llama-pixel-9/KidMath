import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useTheme } from "./useTheme";
import { usePremium } from "./PremiumContext";

/**
 * Full-page gate for premium routes (locked modes, worksheets) reached by
 * deep link or navigation. Friendly, kid-safe copy; the paywall itself is
 * parent-facing.
 */
export default function PremiumGate({ title = "This game is part of larkit Premium" }) {
  const { theme } = useTheme();
  const { openPaywall, loading } = usePremium();

  if (loading) {
    return <main className={`min-h-screen ${theme.bg}`} />;
  }

  return (
    <main className={`min-h-screen ${theme.bg} flex items-center justify-center px-4`}>
      <div className={`${theme.cardBg} rounded-3xl shadow-lg p-8 w-full max-w-md text-center`}>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-seafoam/40 mb-4">
          <Lock className="h-7 w-7 text-teal" />
        </div>
        <h1 className={`text-2xl font-semibold font-display ${theme.textPrimary}`}>{title}</h1>
        <p className={`mt-2 ${theme.textSecondary}`}>
          Addition, subtraction, multiplication, division, and counting are free forever. Premium
          unlocks all 22 modes, printable flight logs, and progress sync — for every child in your
          household.
        </p>
        <button
          type="button"
          onClick={openPaywall}
          className="mt-6 w-full h-14 rounded-[18px] bg-teal text-cream font-display font-semibold text-lg shadow-[0_5px_0_#064A41] btn-press cursor-pointer"
        >
          See plans — 14-day free trial
        </button>
        <Link
          to="/"
          className={`mt-3 inline-block text-sm font-bold ${theme.textMuted} hover:underline`}
        >
          Back to free practice
        </Link>
      </div>
    </main>
  );
}
