import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

// Create theme context
const ThemeContext = createContext();

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    darkMode: false
  });

  // Fetch theme settings
  const { data: settingsData } = useQuery(
    'system-settings',
    async () => {
      const response = await axios.get('/api/settings');
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data.settings) {
          const newTheme = {
            primary: data.settings.theme_colors?.primary || '#3B82F6',
            secondary: data.settings.theme_colors?.secondary || '#1E40AF',
            darkMode: data.settings.dark_mode || false
          };
          setTheme(newTheme);
          applyTheme(newTheme);
        }
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Apply theme to CSS custom properties
  const applyTheme = (themeData) => {
    const root = document.documentElement;
    
    // Set CSS custom properties
    root.style.setProperty('--color-primary', themeData.primary);
    root.style.setProperty('--color-primary-dark', themeData.secondary);
    root.style.setProperty('--color-primary-light', lightenColor(themeData.primary, 20));
    root.style.setProperty('--color-primary-lighter', lightenColor(themeData.primary, 40));
    
    // Apply dark mode
    if (themeData.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Helper function to lighten a color
  const lightenColor = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  // Update theme
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Value object to be provided by context
  const value = {
    theme,
    updateTheme,
    settings: settingsData?.settings
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
