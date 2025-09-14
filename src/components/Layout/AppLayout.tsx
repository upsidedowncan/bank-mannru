import React from 'react'
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
  Divider, // Import Divider for visual separation
} from '@mui/material';
import { NotificationBell } from '../Notifications/NotificationBell';
import { NotificationToast } from '../Notifications/NotificationToast';
import {
  Menu as MenuIcon,
  Dashboard,
  AccountBalance,
  Payment,
  Settings,
  Person,
  Logout,
  Store as StoreIcon,
  Chat as ChatIcon,
  Home,
  Inventory as InventoryIcon,
  Extension as ExtensionIcon,
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
  Security,
  Speed,
  Star,
  Favorite,
  TrendingUp,
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
  ExpandLess,
  ExpandMore,
  Terminal as TerminalIcon,
} from '@mui/icons-material'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import { useThemeContext } from '../../contexts/ThemeContext'
import { supabase } from '../../config/supabase';
import { BannerDisplay } from '../Common/BannerDisplay';

// Icon mapping
const iconMapping: { [key: string]: React.ComponentType } = {
  Dashboard,
  StoreIcon,
  ChatIcon,
  Person,
  Settings,
  Home,
  InventoryIcon,
  ExtensionIcon,
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
  Security,
  Speed,
  Star,
  Favorite,
  TrendingUp,
  TrendingDown,
  Notifications,
  Email,
  Phone,
  LocationOn,
  Schedule,
  CalendarToday,
  AccountBalance,
  Payment,
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
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, user } = useAuthContext()
  const [dynamicFeatures, setDynamicFeatures] = React.useState<{ title: string; route: string; icon: string }[]>([])
  const [openMarketplace, setOpenMarketplace] = React.useState(true)

  React.useEffect(() => {
    const fetchUserFeatures = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_features')
        .select('feature_id, features_marketplace (title, route, icon)')
        .eq('user_id', user.id)
      if (!error && data) {
        setDynamicFeatures(
          data
            .map((f: any) => f.features_marketplace)
            .filter((f: any) => f && f.route && f.title)
        )
      }
    }
    fetchUserFeatures()
  }, [user])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
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
  ]

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{
        alignItems: 'center',
        py: 2,
        px: 2,
        background: theme.palette.mode === 'light'
          ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
          : `linear-gradient(135deg, ${theme.palette.grey[800]} 0%, ${theme.palette.grey[900]} 100%)`, // Adjusted dark mode gradient
        color: theme.palette.common.white,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
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
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1) rotate(5deg)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }
          }}
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
        background: theme.palette.background.paper, // Use paper background consistently for menu content
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
                        borderRadius: 2, // Slightly more rounded
                        transition: 'all 0.3s ease-in-out', // Smoother transitions
                        backgroundColor: (openMarketplace && location.pathname.startsWith('/marketplace'))
                          ? theme.palette.mode === 'light' ? theme.palette.action.selected : theme.palette.primary.light + '20' // Brighter background in dark mode when active
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'light'
                            ? theme.palette.action.hover
                            : theme.palette.action.hover, // Keep hover subtle
                          transform: magnifierEnabled
                            ? 'translateX(5px) scale(1.05)'
                            : 'translateX(5px)'
                        },
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <ListItemIcon sx={{
                        color: (openMarketplace && location.pathname.startsWith('/marketplace'))
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,
                        minWidth: 40,
                        transition: 'all 0.3s ease-in-out',
                        transform: magnifierEnabled && hoveredIndex === index
                          ? `scale(${1 + (magnifierIntensity * 0.1)})`
                          : 'none',
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body1"
                            fontWeight={openMarketplace && location.pathname.startsWith('/marketplace') ? 600 : 500} // Slightly bolder for active
                            color={(openMarketplace && location.pathname.startsWith('/marketplace'))
                              ? theme.palette.primary.main // Primary color for active text
                              : theme.palette.text.primary}
                          >
                            {item.text}
                          </Typography>
                        }
                        sx={{
                          transform: magnifierEnabled && hoveredIndex === index
                            ? `scale(${1 + (magnifierIntensity * 0.03)})`
                            : 'none',
                          transformOrigin: 'left center',
                        }}
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
                            borderRadius: 1.5, // Slightly more rounded sub-items
                            backgroundColor: location.pathname === '/marketplace'
                              ? theme.palette.mode === 'light' ? theme.palette.primary.light + '40' : theme.palette.primary.dark + '30' // Brighter selected sub-item BG in dark mode
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'light' ? theme.palette.action.hover : theme.palette.action.hover,
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
                              ? theme.palette.mode === 'light' ? theme.palette.primary.light + '40' : theme.palette.primary.dark + '30'
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'light' ? theme.palette.action.hover : theme.palette.action.hover,
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
                              ? theme.palette.mode === 'light' ? theme.palette.primary.light + '40' : theme.palette.primary.dark + '30'
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'light' ? theme.palette.action.hover : theme.palette.action.hover,
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
                              ? theme.palette.mode === 'light' ? theme.palette.primary.light + '40' : theme.palette.primary.dark + '30'
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'light' ? theme.palette.action.hover : theme.palette.action.hover,
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
                      {/* Optional: Add a Divider here if you want a stronger visual break after marketplace sub-items */}
                      {/* <Divider sx={{ my: 1, mx: 2, borderColor: theme.palette.divider + '80' }} /> */}
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
                      borderRadius: 2, // Slightly more rounded
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'light' ? theme.palette.action.hover : theme.palette.action.hover,
                        transform: magnifierEnabled
                          ? 'translateX(5px) scale(1.05)'
                          : 'translateX(5px)',
                        zIndex: magnifierEnabled ? 1 : 'auto'
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.primary.main, // Always use primary.main for selected background (bright)
                        color: theme.palette.primary.contrastText, // Text should always be high contrast
                        '& .MuiListItemIcon-root': {
                          color: theme.palette.primary.contrastText, // Icon color for selected state
                        },
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark, // Darker hover for selected state
                        }
                      }
                    }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <ListItemIcon sx={{
                      color: location.pathname === item.path ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                      minWidth: 40,
                      transition: 'all 0.3s ease-in-out',
                      transform: magnifierEnabled && hoveredIndex === index
                        ? `scale(${1 + (magnifierIntensity * 0.1)})`
                        : 'none',
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body1"
                          fontWeight={location.pathname === item.path ? 600 : 500} // Slightly bolder for active
                          color={location.pathname === item.path ? theme.palette.primary.contrastText : theme.palette.text.primary}
                        >
                          {item.text}
                        </Typography>
                      }
                      sx={{
                        transform: magnifierEnabled && hoveredIndex === index
                          ? `scale(${1 + (magnifierIntensity * 0.03)})`
                          : 'none',
                        transformOrigin: 'left center',
                      }}
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
              backgroundColor: theme.palette.mode === 'light' ? theme.palette.action.hover : theme.palette.action.hover,
              borderColor: theme.palette.text.primary,
            }
          }}
        >
          Выйти
        </Button>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', sm: 0 },
          ml: { sm: 0 },
          display: { xs: 'block', sm: 'none' },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Банк Маннру
          </Typography>
          <NotificationBell />
          {/* Theme toggle removed on mobile */}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
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
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
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
          }}
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
          pt: { xs: '64px', sm: 0 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BannerDisplay />
        {children || <Outlet />}
        <NotificationToast />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', sm: 0 },
          ml: { sm: 0 },
          display: { xs: 'block', sm: 'none' },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Банк Маннру
          </Typography>
          <NotificationBell />
          {/* Theme toggle removed on mobile */}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
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
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
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
          }}
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
          pt: { xs: '64px', sm: 0 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BannerDisplay />
        <Box sx={{ mt: '56px' }}>
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  )


  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', sm: 0 },
          ml: { sm: 0 },
          display: { xs: 'block', sm: 'none' },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Банк Маннру
          </Typography>
          <NotificationBell />
          {/* Theme toggle removed on mobile */}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
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
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
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
          }}
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
          pt: { xs: '64px', sm: 0 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children || <Outlet />}
        <NotificationToast />
      </Box>
    </Box>
  )


  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', sm: 0 },
          ml: { sm: 0 },
          display: { xs: 'block', sm: 'none' },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Банк Маннру
          </Typography>
          <NotificationBell />
          {/* Theme toggle removed on mobile */}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
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
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
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
          }}
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
          pt: { xs: '64px', sm: 0 },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children || <Outlet />}
        <NotificationToast />
      </Box>
    </Box>
  )
} 