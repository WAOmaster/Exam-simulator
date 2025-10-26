'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ColorTheme = 'blue' | 'purple' | 'green' | 'orange' | 'pink';

interface ThemeContextType {
  mode: ThemeMode;
  colorTheme: ColorTheme;
  setMode: (mode: ThemeMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('blue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved preferences from localStorage
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
    const savedColorTheme = localStorage.getItem('color-theme') as ColorTheme;

    if (savedMode) {
      setModeState(savedMode);
    } else {
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setModeState('dark');
      }
    }

    if (savedColorTheme) {
      setColorThemeState(savedColorTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme to document
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark');
    root.classList.remove('theme-blue', 'theme-purple', 'theme-green', 'theme-orange', 'theme-pink');

    // Add current theme classes
    root.classList.add(mode);
    root.classList.add(`theme-${colorTheme}`);

    // Save to localStorage
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('color-theme', colorTheme);
  }, [mode, colorTheme, mounted]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const setColorTheme = (newTheme: ColorTheme) => {
    setColorThemeState(newTheme);
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colorTheme,
        setMode,
        setColorTheme,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
