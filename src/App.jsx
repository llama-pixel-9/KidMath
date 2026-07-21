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
    return <PremiumGate title="Printable worksheets are part of KidMath Premium" />;
  }
  return <PrintableWorksheet />;
}

function AppShell() {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen ${theme.bg} ${theme.fontClass} transition-colors duration-300`}>
      <Navbar />
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
