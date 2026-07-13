import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const item = window.localStorage.getItem('futurestack-theme');
      if (item) {
        return item === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (error) {
      console.warn('Error reading theme from localStorage', error);
      return true; // Default to dark since the app was originally dark
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    // Create it if it doesn't exist
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
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only change if user hasn't explicitly set a preference in localStorage
      try {
        if (!window.localStorage.getItem('futurestack-theme')) {
          setIsDark(e.matches);
        }
      } catch (error) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('futurestack-theme', next ? 'dark' : 'light');
      } catch (error) {
        console.warn('Error saving theme to localStorage', error);
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
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
