import { useState } from "react";
import { ThemeProvider, useTheme } from "./ThemeContext";
import Navbar from "./Navbar";
import HomePage from "./HomePage";
import MathExplorer from "./MathExplorer";
import PrintableWorksheet from "./PrintableWorksheet";
import "./index.css";

function AppInner() {
  const [view, setView] = useState("home");
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.fontClass} transition-colors duration-300`}>
      <Navbar currentView={view} onNavigate={setView} />
      {view === "home" && <HomePage onNavigate={setView} />}
      {view === "game" && <MathExplorer />}
      {view === "worksheet" && <PrintableWorksheet />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

export default App;
