import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = 'smriti-theme';
const THEME_COLOR_META_ID = 'theme-color-meta';
const APPLE_STATUS_BAR_META_ID = 'apple-status-bar-meta';

const applyTheme = (nextTheme) => {
  const root = document.documentElement;
  const body = document.body;
  const isDark = nextTheme === 'dark';

  root.classList.toggle('dark', isDark);
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  if (body) {
    body.dataset.theme = nextTheme;
    body.style.colorScheme = nextTheme;
  }

  const themeColorMeta = document.getElementById(THEME_COLOR_META_ID);
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', isDark ? '#191919' : '#ffffff');
  }

  const appleStatusBarMeta = document.getElementById(APPLE_STATUS_BAR_META_ID);
  if (appleStatusBarMeta) {
    appleStatusBarMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
  }
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved || 'dark';
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
