import { createTheme } from '@mui/material/styles';

// Define theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeVariant =
  | 'default'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'red'
  | 'pink'
  | 'teal'
  | 'indigo'
  | 'amber'
  // Experimental variants (enabled via toggle)
  | 'cyberpunk'
  | 'neon'
  | 'glass'
  | 'noir';

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
  // Experimental palettes
  cyberpunk: {
    primary: '#00E5FF',
    secondary: '#FF3D00',
  },
  neon: {
    primary: '#39FF14',
    secondary: '#FF2079',
  },
  glass: {
    primary: '#80DEEA',
    secondary: '#CE93D8',
  },
  noir: {
    primary: '#90A4AE',
    secondary: '#ECEFF1',
  },
};

export const createAppTheme = (mode: ThemeMode, variant: ThemeVariant = 'default', experimental: boolean = false) => {
  const palette = themePalettes[variant];
  
  // Handle system theme mode
  const actualMode = mode === 'system' 
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;
  
  const base = createTheme({
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
    MuiContainer: {
      defaultProps: {
        maxWidth: false,
        disableGutters: true,
      },
      styleOverrides: {
        root: {
          paddingLeft: 0,
          paddingRight: 0,
          maxWidth: '100% !important',
        },
      },
    },
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
          sizeLarge: {
            paddingTop: 12,
            paddingBottom: 12,
          },
          sizeMedium: {
            paddingTop: 10,
            paddingBottom: 10,
          },
          sizeSmall: {
            paddingTop: 8,
            paddingBottom: 8,
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
  if (!experimental) return base;

  // Experimental look & feel: bolder radius, animated hovers, glassy dialogs, gradient buttons
  const experimentalTheme = createTheme({
    ...base,
    shape: {
      borderRadius: 14,
    },
    shadows: base.shadows.map((s, idx) => (idx === 0 ? 'none' : `0 ${Math.min(idx, 8)}px ${Math.min(idx * 2, 32)}px rgba(0,0,0,${actualMode === 'light' ? 0.08 : 0.28})`)) as unknown as any,
    components: {
      ...base.components,
      MuiCssBaseline: {
        styleOverrides: {
          '@keyframes btnStretchy': {
            '0%': { transform: 'scaleX(1) scaleY(1)' },
            '50%': { transform: 'scaleX(1.06) scaleY(0.94)' },
            '100%': { transform: 'scaleX(1) scaleY(1)' },
          },
          '::selection': {
            background: actualMode === 'light' ? `${palette.primary}33` : `${palette.secondary}44`,
          },
          body: {
            backgroundImage: actualMode === 'light'
              ? `radial-gradient(1200px 400px at 20% -10%, ${palette.primary}15, transparent 60%), radial-gradient(1200px 400px at 120% 10%, ${palette.secondary}12, transparent 60%)`
              : `radial-gradient(1000px 360px at -10% -20%, ${palette.primary}22, transparent 60%), radial-gradient(1000px 360px at 110% -10%, ${palette.secondary}1A, transparent 60%)`,
            transition: 'background-image .4s ease',
          },
          '*::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '*::-webkit-scrollbar-thumb': {
            background: actualMode === 'light' ? '#bdbdbd' : '#616161',
            borderRadius: 8,
          },
          '*::-webkit-scrollbar-track': {
            background: 'transparent',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            textTransform: 'none',
            fontWeight: 700,
            letterSpacing: 0.2,
            transition: 'transform .18s cubic-bezier(0.22,1,0.36,1), box-shadow .25s ease, filter .3s ease',
            backgroundImage: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)`,
            color: '#fff',
            '&:hover': {
              filter: 'brightness(1.06) saturate(1.06)',
              boxShadow: actualMode === 'light' ? '0 10px 24px rgba(0,0,0,.18)' : '0 10px 24px rgba(0,0,0,.45)',
              transform: 'translateY(-1px) scaleX(1.02) scaleY(0.98)'
            },
            '&:active': {
              transform: 'translateY(0) scale(0.98)',
              animation: 'btnStretchy 220ms cubic-bezier(0.34,1.56,0.64,1) both',
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 4px ${actualMode === 'light' ? palette.primary + '33' : palette.secondary + '33'}`,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600,
            backdropFilter: 'blur(6px)',
          },
          colorPrimary: {
            backgroundImage: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)`,
            color: '#fff',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 18,
            background: actualMode === 'light' ? 'rgba(255,255,255,.82)' : 'rgba(18,18,18,.7)',
            backdropFilter: 'blur(14px) saturate(1.1)',
            border: actualMode === 'light' ? '1px solid rgba(0,0,0,.06)' : '1px solid rgba(255,255,255,.08)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: actualMode === 'light' ? 'rgba(255,255,255,.9)' : 'rgba(26,26,26,.8)',
            backdropFilter: 'blur(10px)',
            border: actualMode === 'light' ? '1px solid rgba(0,0,0,.06)' : '1px solid rgba(255,255,255,.08)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: `linear-gradient(180deg, ${palette.primary} 0%, ${palette.secondary} 120%)`,
            boxShadow: actualMode === 'light' ? '0 6px 18px rgba(0,0,0,.12)' : '0 6px 18px rgba(0,0,0,.5)',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: 'transform .12s ease, background-color .2s ease',
            '&:hover': { backgroundColor: base.palette.action.hover },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            transition: 'background-color .2s ease, box-shadow .25s ease',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              transition: 'box-shadow .2s ease',
            },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary,
              boxShadow: `0 0 0 4px ${palette.primary}22`,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: 'transform .12s ease, background-color .2s ease',
            '&:hover': {
              background: actualMode === 'light' ? `${palette.primary}0F` : `${palette.primary}22`,
            },
            '&:active': { transform: 'scale(0.98)' },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 4,
            borderRadius: 2,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked + .MuiSwitch-track': {
              background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 10,
            backdropFilter: 'blur(8px)',
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(3px)',
          },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  });

  // If the selected variant is 'glass', push transparency and glass morphism further across components
  if (variant === 'glass') {
    return createTheme({
      ...experimentalTheme,
      palette: {
        ...experimentalTheme.palette,
        background: {
          ...experimentalTheme.palette.background,
          default: actualMode === 'light' ? '#e3f2fd' : '#0b0f12',
          paper: actualMode === 'light' ? 'rgba(255,255,255,.72)' : 'rgba(18,18,18,.6)'
        },
      } as any,
      components: {
        ...experimentalTheme.components,
        MuiPaper: {
          styleOverrides: {
            root: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.72)' : 'rgba(18,18,18,.6)',
              backdropFilter: 'blur(16px) saturate(1.15)',
              border: actualMode === 'light' ? '1px solid rgba(0,0,0,.06)' : '1px solid rgba(255,255,255,.08)',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.7)' : 'rgba(26,26,26,.55)',
              backdropFilter: 'blur(16px) saturate(1.1)',
              border: actualMode === 'light' ? '1px solid rgba(0,0,0,.06)' : '1px solid rgba(255,255,255,.08)',
              boxShadow: '0 12px 30px rgba(0,0,0,.12)'
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.7)' : 'rgba(18,18,18,.55)',
              backdropFilter: 'blur(18px) saturate(1.15)',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.6)' : 'rgba(13,13,13,.5)',
              backdropFilter: 'blur(14px) saturate(1.05)',
              borderBottom: actualMode === 'light' ? '1px solid rgba(0,0,0,.06)' : '1px solid rgba(255,255,255,.08)',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.65)' : 'rgba(18,18,18,.55)',
              backdropFilter: 'blur(14px) saturate(1.05)',
              borderRight: actualMode === 'light' ? '1px solid rgba(0,0,0,.06)' : '1px solid rgba(255,255,255,.08)',
            },
          },
        },
        MuiPopover: {
          styleOverrides: {
            paper: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.7)' : 'rgba(18,18,18,.55)',
              backdropFilter: 'blur(16px) saturate(1.1)',
            },
          },
        },
        MuiMenu: {
          styleOverrides: {
            paper: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.7)' : 'rgba(18,18,18,.55)',
              backdropFilter: 'blur(16px) saturate(1.1)',
            },
          },
        },
        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.8)' : 'rgba(33,33,33,.75)',
              color: actualMode === 'light' ? '#111' : '#fff',
              border: actualMode === 'light' ? '1px solid rgba(0,0,0,.06)' : '1px solid rgba(255,255,255,.08)',
            },
          },
        },
        MuiSnackbarContent: {
          styleOverrides: {
            root: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.75)' : 'rgba(18,18,18,.6)',
              backdropFilter: 'blur(10px) saturate(1.05)',
            },
          },
        },
        MuiTableContainer: {
          styleOverrides: {
            root: {
              background: 'transparent',
            },
          },
        },
        MuiAccordion: {
          styleOverrides: {
            root: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.65)' : 'rgba(26,26,26,.5)'
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 14,
              textTransform: 'none',
              fontWeight: 700,
              letterSpacing: 0.2,
              transition: 'transform .18s cubic-bezier(0.22,1,0.36,1), box-shadow .25s ease, filter .3s ease',
              // Make base transparent for glass variant; specific variants will supply gradient
              backgroundColor: 'transparent',
              backgroundImage: 'none',
              border: 'none',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0) 45%)',
                pointerEvents: 'none',
              },
              '&:hover': {
                filter: 'brightness(1.06) saturate(1.06)',
                transform: 'translateY(-1px) scaleX(1.02) scaleY(0.98)'
              },
              '&:active': {
                transform: 'translateY(0) scale(0.98)',
                animation: 'btnStretchy 220ms cubic-bezier(0.34,1.56,0.64,1) both',
              },
              '&.Mui-focusVisible': {
                boxShadow: `0 0 0 4px ${actualMode === 'light' ? palette.primary + '33' : palette.secondary + '33'}`,
              },
            },
            contained: {
              backgroundColor: 'transparent !important',
              background: `linear-gradient(135deg, ${palette.primary}66 0%, ${palette.secondary}66 100%)`,
              color: '#fff',
              border: actualMode === 'light' ? '1px solid rgba(255,255,255,.6)' : '1px solid rgba(255,255,255,.14)',
              backdropFilter: 'blur(10px) saturate(1.08)',
              boxShadow: actualMode === 'light' ? '0 10px 24px rgba(0,0,0,.14)' : '0 10px 24px rgba(0,0,0,.42)',
              '&:hover': {
                backgroundColor: 'transparent !important',
                background: `linear-gradient(135deg, ${palette.primary}80 0%, ${palette.secondary}80 100%)`,
              },
            },
            containedPrimary: {
              backgroundColor: 'transparent !important',
              background: `linear-gradient(135deg, ${palette.primary}66 0%, ${palette.secondary}66 100%)`,
              color: '#fff',
              border: actualMode === 'light' ? '1px solid rgba(255,255,255,.6)' : '1px solid rgba(255,255,255,.14)',
              backdropFilter: 'blur(10px) saturate(1.08)',
              '&:hover': {
                backgroundColor: 'transparent !important',
                background: `linear-gradient(135deg, ${palette.primary}80 0%, ${palette.secondary}80 100%)`,
              },
            },
            containedSecondary: {
              backgroundColor: 'transparent !important',
              background: `linear-gradient(135deg, ${palette.secondary}66 0%, ${palette.primary}66 100%)`,
              color: '#fff',
              border: actualMode === 'light' ? '1px solid rgba(255,255,255,.6)' : '1px solid rgba(255,255,255,.14)',
              backdropFilter: 'blur(10px) saturate(1.08)',
              '&:hover': {
                backgroundColor: 'transparent !important',
                background: `linear-gradient(135deg, ${palette.secondary}80 0%, ${palette.primary}80 100%)`,
              },
            },
            outlined: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.5)' : 'rgba(18,18,18,.5)',
              backdropFilter: 'blur(10px) saturate(1.05)',
              borderColor: actualMode === 'light' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.18)',
              color: '#fff',
              '&:hover': {
                background: actualMode === 'light' ? 'rgba(255,255,255,.56)' : 'rgba(18,18,18,.56)'
              },
            },
            text: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.28)' : 'rgba(18,18,18,.28)',
              backdropFilter: 'blur(8px)',
              '&:hover': {
                background: actualMode === 'light' ? 'rgba(255,255,255,.38)' : 'rgba(18,18,18,.38)'
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              background: actualMode === 'light' ? 'rgba(255,255,255,.6)' : 'rgba(26,26,26,.5)'
            },
          },
        },
      },
    });
  }

  return experimentalTheme;
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

// Experimental-only variants (shown when experimental toggle is enabled)
export const experimentalThemeVariants: { value: ThemeVariant; label: string; color: string }[] = [
  { value: 'cyberpunk', label: 'Киберпанк', color: '#00E5FF' },
  { value: 'neon', label: 'Неон', color: '#39FF14' },
  { value: 'glass', label: 'Стекло', color: '#80DEEA' },
  { value: 'noir', label: 'Нуар', color: '#90A4AE' },
];