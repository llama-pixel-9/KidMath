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
import PrivacyPage from "./PrivacyPage";
import AdminItemsPage from "./admin/AdminItemsPage";
import DiagnosticsPage from "./admin/DiagnosticsPage";
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
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/admin" element={<AdminItemsPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        {/* Unknown paths: send to home rather than expose a bare 404. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
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
