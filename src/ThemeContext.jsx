import { useState, useEffect } from "react";
import { getTheme } from "./themes";
import { ThemeContext } from "./ThemeContextValue";

const STORAGE_KEY = "kidmath-theme";

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "default";
    } catch {
      return "default";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      // Ignore write failures in restricted/private contexts.
    }
  }, [themeId]);

  const theme = getTheme(themeId);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}
