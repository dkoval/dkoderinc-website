import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type ThemeName = 'green' | 'amber' | 'tokyo-night' | 'one-dark-pro';

// Also referenced in index.html inline script (can't import there)
export const VALID_THEMES: ThemeName[] = ['green', 'amber', 'tokyo-night', 'one-dark-pro'];
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
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_THEMES.includes(stored as ThemeName)) {
      return stored as ThemeName;
    }
  } catch { /* restricted storage */ }
  return 'green';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme);
  const [transitioning, setTransitioning] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const setTheme = useCallback((newTheme: ThemeName) => {
    clearTimers();
    setTransitioning(true);
    const t1 = setTimeout(() => {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
      const t2 = setTimeout(() => setTransitioning(false), 50);
      timersRef.current.push(t2);
    }, 150);
    timersRef.current.push(t1);
  }, []);

  useEffect(() => clearTimers, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, transitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};
