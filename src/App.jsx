import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ThemeProvider } from "./ThemeContext";
import { AuthProvider } from "./AuthContext";
import { PremiumProvider, usePremium } from "./PremiumContext";
import { isFreeMode } from "./premium";
import PremiumGate from "./PremiumGate";
import { useTheme } from "./useTheme";
import Navbar from "./Navbar";
import HomePage from "./HomePage";
import MathExplorer from "./MathExplorer";
import PrintableWorksheet from "./PrintableWorksheet";
import AboutPage from "./AboutPage";
import LegalPage from "./legal/LegalPage";
import Footer from "./Footer";
import AdminItemsPage from "./admin/AdminItemsPage";
import DiagnosticsPage from "./admin/DiagnosticsPage";
import MeadowPage from "./engagement/meadow/MeadowPage";
import ValuePage from "./onboarding/ValuePage";
import SignupPage from "./onboarding/SignupPage";
import OnboardingFlow from "./onboarding/OnboardingFlow";
import ProfilePicker from "./onboarding/ProfilePicker";
import BillingPortalPage from "./BillingPortalPage";
import "./index.css";

function PlayRoute() {
  const { mode } = useParams();
  const { isPremium, loading } = usePremium();
  // Free tier: the four operations + counting, unlimited and free forever.
  // Everything else needs the subscription (deep links included).
  if (mode && !isFreeMode(mode) && !isPremium && !loading) {
    return <PremiumGate />;
  }
  return <MathExplorer initialMode={mode} />;
}

function WorksheetsRoute() {
  const { isPremium, loading } = usePremium();
  if (!isPremium && !loading) {
    return <PremiumGate title="Printable flight logs are part of larkit Premium" />;
  }
  return <PrintableWorksheet />;
}

function AppShell() {
  const { theme } = useTheme();
  return (
    // Column shell: the navbar takes its natural height and the routed page
    // gets the rest. Before this, the play screen asked for a full 100vh of its
    // own BELOW the navbar, so every page was exactly one navbar taller than
    // the window and always scrolled — which is why the number pad hung off the
    // bottom of a laptop screen. dvh rather than vh so a phone's collapsing
    // address bar does not reintroduce the same overflow.
    <div
      className={`min-h-[100dvh] flex flex-col ${theme.bg} ${theme.fontClass} transition-colors duration-300`}
    >
      <Navbar />
      <div className="flex-1 flex flex-col min-h-0">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<PlayRoute />} />
        <Route path="/play/:mode" element={<PlayRoute />} />
        <Route path="/worksheets" element={<WorksheetsRoute />} />
        <Route path="/meadow" element={<MeadowPage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Legal documents — one renderer, four routes. /privacy doubles as
            the COPPA §312.4(d) online notice; a prominent link to it must
            appear on the home screen and at every point where personal
            information is collected from a child. */}
        <Route path="/privacy" element={<LegalPage slug="privacy" />} />
        <Route path="/terms" element={<LegalPage slug="terms" />} />
        <Route path="/security" element={<LegalPage slug="security" />} />
        <Route path="/parental-consent" element={<LegalPage slug="parental-consent" />} />
        {/* First flight (§20): value → parent account → add a kid → soft
            paywall; returning families land on the profile picker. */}
        <Route path="/welcome" element={<ValuePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/profiles" element={<ProfilePicker />} />
        {/* One-step online cancellation (auto-renewal law) — sends the
            subscriber straight into the Stripe Billing Portal. */}
        <Route path="/account/billing" element={<BillingPortalPage />} />
        <Route path="/admin" element={<AdminItemsPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        {/* Unknown paths: send to home rather than expose a bare 404. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
      <Footer />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <PremiumProvider>
            <AppShell />
          </PremiumProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
