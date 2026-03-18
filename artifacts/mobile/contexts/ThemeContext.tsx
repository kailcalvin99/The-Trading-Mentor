import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const THEME_KEY = "ict-app-theme";

type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: typeof Colors.dark;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  colors: Colors.dark,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") {
        setMode(stored);
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const colors = mode === "dark" ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark: mode === "dark", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
