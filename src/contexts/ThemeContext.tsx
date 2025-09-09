import React, { createContext, useContext, ReactNode } from 'react';
import { ThemeMode, ThemeVariant } from '../theme/theme';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  themeVariant: ThemeVariant;
  setThemeVariant: (variant: ThemeVariant) => void;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  themeMode, 
  setThemeMode,
  themeVariant,
  setThemeVariant
}) => {
  return (
    <ThemeContext.Provider value={{ 
      themeMode, 
      setThemeMode,
      themeVariant,
      setThemeVariant
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}; 