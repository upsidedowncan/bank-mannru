import React, { useMemo, useCallback } from 'react'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  Button,
  Collapse,
} from '@mui/material';
import { NotificationBell } from '../Notifications/NotificationBell';
import { NotificationToast } from '../Notifications/NotificationToast';
import {
  Menu as MenuIcon,
  Dashboard,
  Settings,
  Person,
  Logout,
  Store as StoreIcon,
  Home,
  Extension as ExtensionIcon,
  TrendingUp,
  Security,
  ExpandLess,
  ExpandMore,
  AccountBalance,
  Payment,
  Chat as ChatIcon,
  Inventory as InventoryIcon,
  Games,
  School,
  Work,
  SportsEsports,
  MusicNote,
  Movie,
  Restaurant,
  LocalGroceryStore,
  DirectionsCar,
  Flight,
  Hotel,
  LocalHospital,
  FitnessCenter,
  Spa,
  Pets,
  ChildCare,
  Elderly,
  Accessibility,
  Speed,
  Star,
  Favorite,
  TrendingDown,
  Notifications,
  Email,
  Phone,
  LocationOn,
  Schedule,
  CalendarToday,
  CreditCard,
  Receipt,
  ShoppingCart,
  LocalShipping,
  LocalOffer,
  Loyalty,
  Redeem,
  CardGiftcard,
  Celebration,
  Event,
  Cake,
  RestaurantMenu,
  LocalBar,
  LocalCafe,
  LocalPizza,
  LocalDining,
  Fastfood,
  LocalConvenienceStore,
  LocalPharmacy,
  LocalGasStation,
  LocalCarWash,
  LocalLaundryService,
  LocalPrintshop,
  LocalPostOffice,
  LocalLibrary,
  LocalMall,
  LocalParking,
  LocalTaxi,
  DirectionsBus,
  DirectionsSubway,
  DirectionsBike,
  DirectionsWalk,
  DirectionsRun,
  DirectionsBoat,
  DirectionsTransit,
  DirectionsRailway,
  DirectionsTransitFilled,
  DirectionsCarFilled,
  Terminal as TerminalIcon,
} from '@mui/icons-material'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import { useThemeContext } from '../../contexts/ThemeContext'
import { supabase } from '../../config/supabase';
import { BannerDisplay } from '../Common/BannerDisplay';
import { getProgression } from '../../services/progressionService';
import XPBar from '../Common/XPBar';
import VaultRiddle from '../Secret/VaultRiddle';
import { DynamicBottomAppBar } from './DynamicBottomAppBar';

// Comprehensive icon mapping for dynamic features
const iconMapping: { [key: string]: React.ComponentType } = {
  Dashboard,
  StoreIcon,
  Person,
  Settings,
  Home,
  ExtensionIcon,
  TrendingUp,
  Security,
  // Add back all the icons that might be used by dynamic features
  AccountBalance,
  Payment,
  ChatIcon,
  InventoryIcon,
  Games,
  School,
  Work,
  SportsEsports,
  MusicNote,
  Movie,
  Restaurant,
  LocalGroceryStore,
  DirectionsCar,
  Flight,
  Hotel,
  LocalHospital,
  FitnessCenter,
  Spa,
  Pets,
  ChildCare,
  Elderly,
  Accessibility,
  Speed,
  Star,
  Favorite,
  TrendingDown,
  Notifications,
  Email,
  Phone,
  LocationOn,
  Schedule,
  CalendarToday,
  CreditCard,
  Receipt,
  ShoppingCart,
  LocalShipping,
  LocalOffer,
  Loyalty,
  Redeem,
  CardGiftcard,
  Celebration,
  Event,
  Cake,
  RestaurantMenu,
  LocalBar,
  LocalCafe,
  LocalPizza,
  LocalDining,
  Fastfood,
  LocalConvenienceStore,
  LocalPharmacy,
  LocalGasStation,
  LocalCarWash,
  LocalLaundryService,
  LocalPrintshop,
  LocalPostOffice,
  LocalLibrary,
  LocalMall,
  LocalParking,
  LocalTaxi,
  DirectionsBus,
  DirectionsSubway,
  DirectionsBike,
  DirectionsWalk,
  DirectionsRun,
  DirectionsBoat,
  DirectionsTransit,
  DirectionsRailway,
  DirectionsTransitFilled,
  DirectionsCarFilled,
  TerminalIcon,
};

const drawerWidth = 280

interface AppLayoutProps {
  children?: React.ReactNode
  showDevSettings?: boolean
  magnifierEnabled?: boolean
  magnifierIntensity?: number
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, showDevSettings = false, magnifierEnabled = false, magnifierIntensity = 1.5 }) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [progression, setProgression] = React.useState<{ level: number; currentLevelXp: number; nextLevelXp: number } | null>(null)
  const [dynamicFeatures, setDynamicFeatures] = React.useState<{ title: string; route: string; icon: string }[]>([])
  const [openMarketplace, setOpenMarketplace] = React.useState(true)
  const [riddleOpen, setRiddleOpen] = React.useState(false)
  
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, user } = useAuthContext()

  // Optimized progression loading
  React.useEffect(() => {
    if (!user) {
      setProgression(null);
      return;
    }
    
    let isMounted = true;
    const loadProgression = async () => {
      try {
        const p = await getProgression(user.id);
      if (isMounted) {
          setProgression(p ? { level: p.level, currentLevelXp: p.currentLevelXp, nextLevelXp: p.nextLevelXp } : null);
        }
      } catch (error) {
        console.error('Error loading progression:', error);
      }
    };
    
    loadProgression();
    return () => { isMounted = false };
  }, [user?.id]);

  // Optimized dynamic features loading
  React.useEffect(() => {
    if (!user) {
      setDynamicFeatures([]);
      return;
    }
    
    const fetchUserFeatures = async () => {
      try {
      const { data, error } = await supabase
        .from('user_features')
        .select('feature_id, features_marketplace (title, route, icon)')
          .eq('user_id', user.id);
        
      if (!error && data) {
        setDynamicFeatures(
          data
            .map((f: any) => f.features_marketplace)
            .filter((f: any) => f && f.route && f.title)
          );
        }
      } catch (error) {
        console.error('Error loading user features:', error);
      }
    };
    
    fetchUserFeatures();
  }, [user?.id]);

  // Easter egg: multi-click logo opens MannShell
  const logoClicksRef = React.useRef({ count: 0, tm: 0 as any });
  const handleLogoClick = useCallback(() => {
    const now = Date.now();
    const state = logoClicksRef.current;
    if (state.tm) clearTimeout(state.tm);
    state.count += 1;
    state.tm = setTimeout(() => { state.count = 0; }, 1000);
    if (state.count >= 7) {
      state.count = 0;
      setRiddleOpen(true);
    }
  }, []);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/login');
  }, [signOut, navigate]);

  // Memoized menu items to prevent unnecessary re-renders
  const menuItems = useMemo(() => [
    { text: 'Главная', icon: <Home />, path: '/' },
    { text: 'Панель управления', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Рынок', icon: <StoreIcon />, path: '/marketplace' },
    { text: 'Инвестиции', icon: <TrendingUp />, path: '/investments' },
    ...(showDevSettings ? [{ text: 'Админка инвестиций', icon: <Security />, path: '/admin/investments' }] : []),
    { text: 'Маркет функций', icon: <ExtensionIcon />, path: '/features-marketplace' },
    { text: 'Профиль', icon: <Person />, path: '/dashboard/profile' },
    { text: 'Настройки', icon: <Settings />, path: '/dashboard/settings' },
    // Dynamic features
    ...dynamicFeatures.map(f => {
      const IconComponent = f.icon ? iconMapping[f.icon] : ExtensionIcon;
      return {
        text: f.title,
        icon: IconComponent ? <IconComponent /> : <ExtensionIcon />,
        path: f.route
      };
    }),
  ], [showDevSettings, dynamicFeatures]);

  // Memoized drawer header styles
  const headerStyles = useMemo(() => ({
        alignItems: 'center',
        py: 2,
        px: 2,
        background: theme.palette.mode === 'light'
          ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
      : `linear-gradient(135deg, ${theme.palette.grey[800]} 0%, ${theme.palette.grey[900]} 100%)`,
        color: theme.palette.common.white,
        borderBottom: `1px solid ${theme.palette.divider}`,
  }), [theme]);

  // Memoized drawer styles
  const drawerStyles = useMemo(() => ({
    display: { xs: 'none', sm: 'block' },
    '& .MuiDrawer-paper': {
      boxSizing: 'border-box',
      width: drawerWidth,
      backgroundImage: theme.palette.mode === 'light'
        ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.paper} 60%, ${theme.palette.primary.light} 160%)`
        : 'linear-gradient(180deg, #121212 0%, #121212 60%, rgba(255,255,255,0.04) 160%)',
      backgroundColor: theme.palette.background.paper,
      paddingTop: 0,
    },
  }), [theme]);

  const mobileDrawerStyles = useMemo(() => ({
    display: { xs: 'block', sm: 'none' },
    '& .MuiDrawer-paper': {
      boxSizing: 'border-box',
      width: drawerWidth,
      backgroundImage: theme.palette.mode === 'light'
        ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.paper} 60%, ${theme.palette.primary.light} 160%)`
        : 'linear-gradient(180deg, #121212 0%, #121212 60%, rgba(255,255,255,0.04) 160%)',
      backgroundColor: theme.palette.background.paper,
      paddingTop: 0,
    },
  }), [theme]);

  // Memoized drawer content
  const drawer = useMemo(() => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={headerStyles}>
        <Box
          component="img"
          src="/icon512.png"
          alt="Банк Маннру"
          sx={{
            width: 36,
            height: 36,
            mr: 1.5,
            borderRadius: 1,
            ml: -0.5,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            }
          }}
          onClick={handleLogoClick}
        />
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            letterSpacing: '0.8px',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          Банк Маннру
        </Typography>
      </Toolbar>
      <Box sx={{
        flexGrow: 1,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[400] : theme.palette.grey[700],
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
        },
        scrollbarWidth: 'thin',
        msOverflowStyle: 'scrollbar',
        background: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`,
      }}>
        <List sx={{ pt: 1 }}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.text}>
              {item.path === '/marketplace' ? (
                <>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => setOpenMarketplace(v => !v)}
                      sx={{
                        mx: 1.5,
                        my: 0.75,
                        borderRadius: 2,
                        transition: 'background-color 0.2s ease',
                        backgroundColor: (openMarketplace && location.pathname.startsWith('/marketplace'))
                          ? theme.palette.action.selected
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <ListItemIcon sx={{
                        color: (openMarketplace && location.pathname.startsWith('/marketplace'))
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,
                        minWidth: 40,
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body1"
                            fontWeight={openMarketplace && location.pathname.startsWith('/marketplace') ? 600 : 500}
                            color={(openMarketplace && location.pathname.startsWith('/marketplace'))
                              ? theme.palette.primary.main
                              : theme.palette.text.primary}
                          >
                            {item.text}
                          </Typography>
                        }
                      />
                      {openMarketplace ? <ExpandLess sx={{ color: theme.palette.text.secondary }} /> : <ExpandMore sx={{ color: theme.palette.text.secondary }} />}
                    </ListItemButton>
                  </ListItem>
                  <Collapse in={openMarketplace} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      <ListItem disablePadding>
                        <ListItemButton
                          selected={location.pathname === '/marketplace'}
                          sx={{
                            pl: 7,
                            mx: 1.5,
                            mr: 1.5,
                            my: 0.25,
                            borderRadius: 1.5,
                            backgroundColor: location.pathname === '/marketplace'
                              ? theme.palette.action.selected
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            }
                          }}
                          onClick={() => navigate('/marketplace')}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                fontWeight={location.pathname === '/marketplace' ? 600 : 400}
                                color={location.pathname === '/marketplace' ? theme.palette.primary.main : theme.palette.text.secondary}
                              >
                                Все товары
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton
                          selected={location.pathname === '/marketplace/my-listings'}
                          sx={{
                            pl: 7,
                            mx: 1.5,
                            mr: 1.5,
                            my: 0.25,
                            borderRadius: 1.5,
                            backgroundColor: location.pathname === '/marketplace/my-listings'
                              ? theme.palette.action.selected
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            }
                          }}
                          onClick={() => navigate('/marketplace/my-listings')}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                fontWeight={location.pathname === '/marketplace/my-listings' ? 600 : 400}
                                color={location.pathname === '/marketplace/my-listings' ? theme.palette.primary.main : theme.palette.text.secondary}
                              >
                                Мои товары
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton
                          selected={location.pathname === '/marketplace/chat'}
                          sx={{
                            pl: 7,
                            mx: 1.5,
                            mr: 1.5,
                            my: 0.25,
                            borderRadius: 1.5,
                            backgroundColor: location.pathname === '/marketplace/chat'
                              ? theme.palette.action.selected
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            }
                          }}
                          onClick={() => navigate('/marketplace/chat')}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                fontWeight={location.pathname === '/marketplace/chat' ? 600 : 400}
                                color={location.pathname === '/marketplace/chat' ? theme.palette.primary.main : theme.palette.text.secondary}
                              >
                                Сообщения
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemButton
                          selected={location.pathname === '/marketplace/favorites'}
                          sx={{
                            pl: 7,
                            mx: 1.5,
                            mr: 1.5,
                            my: 0.25,
                            borderRadius: 1.5,
                            backgroundColor: location.pathname === '/marketplace/favorites'
                              ? theme.palette.action.selected
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            }
                          }}
                          onClick={() => navigate('/marketplace/favorites')}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                fontWeight={location.pathname === '/marketplace/favorites' ? 600 : 400}
                                color={location.pathname === '/marketplace/favorites' ? theme.palette.primary.main : theme.palette.text.secondary}
                              >
                                Избранное
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    </List>
                  </Collapse>
                </>
              ) : (
                <ListItem disablePadding>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    sx={{
                      mx: 1.5,
                      my: 0.75,
                      borderRadius: 2,
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        '& .MuiListItemIcon-root': {
                          color: theme.palette.primary.contrastText,
                        },
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark,
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{
                      color: location.pathname === item.path ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                      minWidth: 40,
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body1"
                          fontWeight={location.pathname === item.path ? 600 : 500}
                          color={location.pathname === item.path ? theme.palette.primary.contrastText : theme.palette.text.primary}
                        >
                          {item.text}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          color="inherit"
          startIcon={<Logout />}
          onClick={handleLogout}
          fullWidth
          variant="outlined"
          sx={{
            fontWeight: 'bold',
            color: theme.palette.text.primary,
            borderColor: theme.palette.divider,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
              borderColor: theme.palette.text.primary,
            }
          }}
        >
          Выйти
        </Button>
      </Box>
    </Box>
  ), [headerStyles, theme, handleLogoClick, menuItems, openMarketplace, location.pathname, navigate, handleLogout]);

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <CssBaseline />
      {/* Removed top AppBar with notifications - using only bottom navigation on mobile */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        {/* Mobile drawer - hidden on mobile, use BottomAppBar instead */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'none', sm: 'block' }, // Hide on mobile
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundImage: theme.palette.mode === 'light'
                ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.paper} 60%, ${theme.palette.primary.light} 160%)`
                : 'linear-gradient(180deg, #121212 0%, #121212 60%, rgba(255,255,255,0.04) 160%)',
              backgroundColor: theme.palette.background.paper,
              paddingTop: 0,
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={drawerStyles}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pt: 0, // Removed top padding since no more top bar
          pb: { xs: '64px', sm: 0 }, // Add bottom padding for mobile bottom bar
          display: 'flex',
          flexDirection: 'column',
          mx: 0,
          maxWidth: '100vw',
          height: '100%',
          overflow: location.pathname.startsWith('/chat') ? 'hidden' : 'auto',
        }}
      >
        {!location.pathname.startsWith('/chat') && <BannerDisplay />}
        {user && !location.pathname.startsWith('/chat') && <XPBar userId={user.id} />}
        <Box sx={{
          px: location.pathname.startsWith('/chat') ? 0 : { xs: 1, md: 1.5 },
          width: '100%',
          maxWidth: 'auto',
          mx: 'auto',
          pb: { xs: 2, sm: 0 }, // Add extra bottom padding for mobile bottom bar
          ...(location.pathname.startsWith('/chat') ? { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {})
        }}>
          {children || <Outlet />}
        </Box>
        <NotificationToast />
        <VaultRiddle open={riddleOpen} onClose={() => setRiddleOpen(false)} rewardMr={5000} />
      </Box>
      
      {/* Mobile Bottom Navigation */}
      <DynamicBottomAppBar 
        showDevSettings={showDevSettings}
        dynamicFeatures={dynamicFeatures}
        onFabClick={(action) => {
          // Handle contextual FAB actions
          switch (action) {
            case 'add-item':
              window.dispatchEvent(new CustomEvent('marketplace-add-item'));
              break;
            case 'search':
              window.dispatchEvent(new CustomEvent('marketplace-search'));
              break;
            case 'new-account':
              window.dispatchEvent(new CustomEvent('dashboard-new-account'));
              break;
            case 'transfer':
              window.dispatchEvent(new CustomEvent('dashboard-transfer'));
              break;
            case 'invest':
              window.dispatchEvent(new CustomEvent('investments-invest'));
              break;
            case 'refresh':
              window.dispatchEvent(new CustomEvent('investments-refresh'));
              break;
            case 'new-message':
              window.dispatchEvent(new CustomEvent('chat-new-message'));
              break;
            default:
              console.log('FAB clicked:', action);
          }
        }}
      />
      </Box>
  );
} 