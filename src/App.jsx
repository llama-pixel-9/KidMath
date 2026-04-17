import { useState } from "react";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { AuthProvider } from "./AuthContext";
import Navbar from "./Navbar";
import HomePage from "./HomePage";
import MathExplorer from "./MathExplorer";
import PrintableWorksheet from "./PrintableWorksheet";
import AboutPage from "./AboutPage";
import "./index.css";

function AppInner() {
  const [view, setView] = useState("home");
  const [initialMode, setInitialMode] = useState(null);
  const { theme } = useTheme();

  const handleNavigate = (target, mode) => {
    if (mode) setInitialMode(mode);
    setView(target);
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.fontClass} transition-colors duration-300`}>
      <Navbar currentView={view} onNavigate={handleNavigate} />
      {view === "home" && <HomePage onNavigate={handleNavigate} />}
      {view === "game" && <MathExplorer initialMode={initialMode} />}
      {view === "worksheet" && <PrintableWorksheet />}
      {view === "about" && <AboutPage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
