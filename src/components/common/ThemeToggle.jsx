'use client';

import { useTheme } from '../../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

const ThemeToggle = ({ className = '' }) => {
  const { isDark, themeReady, toggleTheme } = useTheme();
  const label = !themeReady
    ? 'Toggle color theme'
    : isDark
      ? 'Switch to light mode'
      : 'Switch to dark mode';

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
      aria-label={label}
      title={label}
    >
      {themeReady && isDark ? (
        <FiSun className="w-5 h-5 text-gray-700 dark:text-gray-300 hover:text-white" />
      ) : (
        <FiMoon className="w-5 h-5 text-gray-600 hover:text-black" />
      )}
    </button>
  );
};

export default ThemeToggle;
