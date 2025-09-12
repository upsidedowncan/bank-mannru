import { createTheme } from '@mui/material/styles';

// Define theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeVariant = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'teal' | 'indigo' | 'amber';

// Theme color palettes
const themePalettes = {
  default: {
    primary: '#1976d2',
    secondary: '#dc004e',
  },
  blue: {
    primary: '#2196F3',
    secondary: '#FF9800',
  },
  green: {
    primary: '#4CAF50',
    secondary: '#FF5722',
  },
  purple: {
    primary: '#9C27B0',
    secondary: '#FFC107',
  },
  orange: {
    primary: '#FF9800',
    secondary: '#2196F3',
  },
  red: {
    primary: '#F44336',
    secondary: '#4CAF50',
  },
  pink: {
    primary: '#E91E63',
    secondary: '#00BCD4',
  },
  teal: {
    primary: '#009688',
    secondary: '#FF5722',
  },
  indigo: {
    primary: '#3F51B5',
    secondary: '#FF9800',
  },
  amber: {
    primary: '#FFC107',
    secondary: '#9C27B0',
  },
};

export const createAppTheme = (mode: ThemeMode, variant: ThemeVariant = 'default') => {
  const palette = themePalettes[variant];
  
  // Handle system theme mode
  const actualMode = mode === 'system' 
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  
  return createTheme({
  palette: {
      mode: actualMode as 'light' | 'dark',
    primary: {
        main: palette.primary,
        light: actualMode === 'light' ? palette.primary + '20' : palette.primary + '40',
        dark: actualMode === 'light' ? palette.primary + '80' : palette.primary + '60',
        contrastText: actualMode === 'light' ? '#ffffff' : '#000000',
    },
    secondary: {
        main: palette.secondary,
        light: actualMode === 'light' ? palette.secondary + '20' : palette.secondary + '40',
        dark: actualMode === 'light' ? palette.secondary + '80' : palette.secondary + '60',
        contrastText: actualMode === 'light' ? '#ffffff' : '#000000',
    },
    background: {
        default: actualMode === 'light' ? '#f8f9fa' : '#0a0a0a',
        paper: actualMode === 'light' ? '#ffffff' : '#1a1a1a',
    },
    text: {
        primary: actualMode === 'light' ? '#1a1a1a' : '#ffffff',
        secondary: actualMode === 'light' ? '#666666' : '#b0b0b0',
    },
      // Enhanced color palette
      success: {
        main: '#4CAF50',
        light: '#81C784',
        dark: '#388E3C',
      },
      warning: {
        main: '#FF9800',
        light: '#FFB74D',
        dark: '#F57C00',
      },
      error: {
        main: '#F44336',
        light: '#E57373',
        dark: '#D32F2F',
      },
      info: {
        main: '#2196F3',
        light: '#64B5F6',
        dark: '#1976D2',
      },
    },
    // Enhanced typography
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 600,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
    },
    // Enhanced shape
    shape: {
      borderRadius: 8,
    },
    // Enhanced shadows
    shadows: [
      'none',
      '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
      '0px 2px 4px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.24)',
      '0px 3px 6px rgba(0, 0, 0, 0.12), 0px 2px 4px rgba(0, 0, 0, 0.24)',
      '0px 4px 8px rgba(0, 0, 0, 0.12), 0px 3px 6px rgba(0, 0, 0, 0.24)',
      '0px 5px 10px rgba(0, 0, 0, 0.12), 0px 4px 8px rgba(0, 0, 0, 0.24)',
      '0px 6px 12px rgba(0, 0, 0, 0.12), 0px 5px 10px rgba(0, 0, 0, 0.24)',
      '0px 7px 14px rgba(0, 0, 0, 0.12), 0px 6px 12px rgba(0, 0, 0, 0.24)',
      '0px 8px 16px rgba(0, 0, 0, 0.12), 0px 7px 14px rgba(0, 0, 0, 0.24)',
      '0px 9px 18px rgba(0, 0, 0, 0.12), 0px 8px 16px rgba(0, 0, 0, 0.24)',
      '0px 10px 20px rgba(0, 0, 0, 0.12), 0px 9px 18px rgba(0, 0, 0, 0.24)',
      '0px 11px 22px rgba(0, 0, 0, 0.12), 0px 10px 20px rgba(0, 0, 0, 0.24)',
      '0px 12px 24px rgba(0, 0, 0, 0.12), 0px 11px 22px rgba(0, 0, 0, 0.24)',
      '0px 13px 26px rgba(0, 0, 0, 0.12), 0px 12px 24px rgba(0, 0, 0, 0.24)',
      '0px 14px 28px rgba(0, 0, 0, 0.12), 0px 13px 26px rgba(0, 0, 0, 0.24)',
      '0px 15px 30px rgba(0, 0, 0, 0.12), 0px 14px 28px rgba(0, 0, 0, 0.24)',
      '0px 16px 32px rgba(0, 0, 0, 0.12), 0px 15px 30px rgba(0, 0, 0, 0.24)',
      '0px 17px 34px rgba(0, 0, 0, 0.12), 0px 16px 32px rgba(0, 0, 0, 0.24)',
      '0px 18px 36px rgba(0, 0, 0, 0.12), 0px 17px 34px rgba(0, 0, 0, 0.24)',
      '0px 19px 38px rgba(0, 0, 0, 0.12), 0px 18px 36px rgba(0, 0, 0, 0.24)',
      '0px 20px 40px rgba(0, 0, 0, 0.12), 0px 19px 38px rgba(0, 0, 0, 0.24)',
      '0px 21px 42px rgba(0, 0, 0, 0.12), 0px 20px 40px rgba(0, 0, 0, 0.24)',
      '0px 22px 44px rgba(0, 0, 0, 0.12), 0px 21px 42px rgba(0, 0, 0, 0.24)',
      '0px 23px 46px rgba(0, 0, 0, 0.12), 0px 22px 44px rgba(0, 0, 0, 0.24)',
      '0px 24px 48px rgba(0, 0, 0, 0.12), 0px 23px 46px rgba(0, 0, 0, 0.24)',
    ],
    // Enhanced components
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
            backgroundColor: actualMode === 'light' ? '#ffffff' : '#1a1a1a',
            boxShadow: actualMode === 'light' 
              ? '0 2px 8px rgba(0, 0, 0, 0.1)' 
              : '0 2px 8px rgba(0, 0, 0, 0.3)',
            borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
            backgroundColor: actualMode === 'light' ? palette.primary : '#1a1a1a',
            boxShadow: actualMode === 'light' 
              ? '0 2px 8px rgba(0, 0, 0, 0.15)' 
              : '0 2px 8px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
            backgroundColor: actualMode === 'light' ? '#ffffff' : '#1a1a1a',
            borderRight: actualMode === 'light' 
              ? '1px solid rgba(0, 0, 0, 0.12)' 
              : '1px solid rgba(255, 255, 255, 0.12)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            transition: 'transform 0.12s ease, box-shadow 0.2s ease',
            '&:active': {
              transform: 'scale(0.95)'
            },
            '&:hover': {
              boxShadow: actualMode === 'light' 
                ? '0 4px 12px rgba(0, 0, 0, 0.15)' 
                : '0 4px 12px rgba(0, 0, 0, 0.4)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'transform 0.12s ease, box-shadow 0.2s ease',
            '&:active': {
              transform: 'scale(0.95)'
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: 'transform 0.12s ease, background-color 0.2s ease',
            '&:active': {
              transform: 'scale(0.98)'
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 16,
        },
      },
    },
  },
});
};

// Default theme for backward compatibility
export const theme = createAppTheme('light', 'default');

// Export theme variants for easy access
export const themeVariants: { value: ThemeVariant; label: string; color: string }[] = [
  { value: 'default', label: 'По умолчанию', color: '#1976d2' },
  { value: 'blue', label: 'Синий', color: '#2196F3' },
  { value: 'green', label: 'Зеленый', color: '#4CAF50' },
  { value: 'purple', label: 'Фиолетовый', color: '#9C27B0' },
  { value: 'orange', label: 'Оранжевый', color: '#FF9800' },
  { value: 'red', label: 'Красный', color: '#F44336' },
  { value: 'pink', label: 'Розовый', color: '#E91E63' },
  { value: 'teal', label: 'Бирюзовый', color: '#009688' },
  { value: 'indigo', label: 'Индиго', color: '#3F51B5' },
  { value: 'amber', label: 'Янтарный', color: '#FFC107' },
]; 