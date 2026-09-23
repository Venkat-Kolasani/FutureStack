'use client';

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';

const ThemeContext = createContext();
const THEME_KEY = 'futurestack-theme';
const listeners = new Set();

function emitThemeChange() {
  listeners.forEach((listener) => listener());
}

function readIsDark() {
  try {
    const item = window.localStorage.getItem(THEME_KEY);
    if (item) {
      return item === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (error) {
    console.warn('Error reading theme from localStorage', error);
    return document.documentElement.classList.contains('dark');
  }
}

function subscribe(onStoreChange) {
  listeners.add(onStoreChange);
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    try {
      if (!window.localStorage.getItem(THEME_KEY)) {
        emitThemeChange();
      }
    } catch {
      emitThemeChange();
    }
  };
  mediaQuery.addEventListener('change', handleSystemChange);
  return () => {
    listeners.delete(onStoreChange);
    mediaQuery.removeEventListener('change', handleSystemChange);
  };
}

function getClientSnapshot() {
  return readIsDark();
}

function getServerSnapshot() {
  return false;
}

function applyTheme(isDark) {
  const root = document.documentElement;
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');

  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    document.head.appendChild(metaThemeColor);
  }

  if (isDark) {
    root.classList.add('dark');
    metaThemeColor.setAttribute('content', '#000000');
  } else {
    root.classList.remove('dark');
    metaThemeColor.setAttribute('content', '#ffffff');
  }
}

export function ThemeProvider({ children }) {
  const isDark = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return undefined;
    applyTheme(isDark);
    return undefined;
  }, [isDark, themeReady]);

  const toggleTheme = useCallback(() => {
    const next = !readIsDark();
    try {
      window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch (error) {
      console.warn('Error saving theme to localStorage', error);
    }
    applyTheme(next);
    emitThemeChange();
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, themeReady, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
