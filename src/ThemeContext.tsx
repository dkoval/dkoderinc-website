import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ThemeName = 'green' | 'amber' | 'white' | 'gruvbox';

const VALID_THEMES: ThemeName[] = ['green', 'amber', 'white', 'gruvbox'];
const STORAGE_KEY = 'dkoder-theme';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  transitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'green',
  setTheme: () => {},
  transitioning: false,
});

export const useTheme = () => useContext(ThemeContext);

const getInitialTheme = (): ThemeName => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_THEMES.includes(stored as ThemeName)) {
    return stored as ThemeName;
  }
  return 'green';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme);
  const [transitioning, setTransitioning] = useState(false);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setTransitioning(true);
    setTimeout(() => {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      setTimeout(() => setTransitioning(false), 50);
    }, 150);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, transitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};
