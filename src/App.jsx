import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import { AuthProvider } from "./AuthContext";
import { useTheme } from "./useTheme";
import Navbar from "./Navbar";
import HomePage from "./HomePage";
import MathExplorer from "./MathExplorer";
import PrintableWorksheet from "./PrintableWorksheet";
import AboutPage from "./AboutPage";
import AdminItemsPage from "./admin/AdminItemsPage";
import "./index.css";

function PlayRoute() {
  const { mode } = useParams();
  return <MathExplorer initialMode={mode} />;
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
        <Route path="/worksheets" element={<PrintableWorksheet />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admin" element={<AdminItemsPage />} />
        {/* Unknown paths: send to home rather than expose a bare 404. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
