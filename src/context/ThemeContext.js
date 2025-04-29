import React, { createContext, useState, useContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = {
    isDarkMode,
    colors: isDarkMode ? {
      background: '#121212',
      paper: '#1E1E1E',
      text: '#FFFFFF',
      primary: '#90CAF9',
      secondary: '#CE93D8',
      error: '#f44336',
      success: '#4caf50',
      divider: 'rgba(255, 255, 255, 0.12)'
    } : {
      background: '#F5F5F5',
      paper: '#FFFFFF',
      text: '#2C3E50',
      primary: '#2196F3',
      secondary: '#9C27B0',
      error: '#f44336',
      success: '#4caf50',
      divider: 'rgba(0, 0, 0, 0.12)'
    },
    toggleTheme: () => setIsDarkMode(!isDarkMode)
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};