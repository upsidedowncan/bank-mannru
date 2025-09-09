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
} from '@mui/material'
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
} from '@mui/icons-material'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'
import { useThemeContext } from '../../contexts/ThemeContext'
import { supabase } from '../../config/supabase';

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
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const theme = useTheme()
  const navigate = useNavigate()
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
    { text: 'Мои товары', icon: <InventoryIcon />, path: '/marketplace/my-listings' },
    { text: 'Сообщения', icon: <ChatIcon />, path: '/marketplace/chat' },
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
      <Toolbar sx={{ alignItems: 'center', py: 2, px: 2 }}>
        <Box
          component="img"
          src="/icon512.png"
          alt="Банк Маннру"
          sx={{
            width: 32,
            height: 32,
            mr: 1,
            borderRadius: 1,
            ml: -1.25,
          }}
        />
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Банк Маннру
        </Typography>
      </Toolbar>
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <List>
          {menuItems.map((item) => (
            item.path === '/marketplace' ? (
              <Box key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => setOpenMarketplace(v => !v)}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                    {openMarketplace ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={openMarketplace} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    <ListItem disablePadding>
                      <ListItemButton sx={{ pl: 7 }} onClick={() => navigate('/marketplace')}>
                        <ListItemText primary="Все товары" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton sx={{ pl: 7 }} onClick={() => navigate('/marketplace/my-listings')}>
                        <ListItemText primary="Мои товары" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton sx={{ pl: 7 }} onClick={() => navigate('/marketplace/chat')}>
                        <ListItemText primary="Сообщения" />
                      </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemButton sx={{ pl: 7 }} onClick={() => navigate('/marketplace/favorites')}>
                        <ListItemText primary="Избранное" />
                      </ListItemButton>
                    </ListItem>
                  </List>
                </Collapse>
              </Box>
            ) : (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => navigate(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            )
          ))}
        </List>
      </Box>
      <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
        <Button
          color="inherit"
          startIcon={<Logout />}
          onClick={handleLogout}
          fullWidth
          variant="outlined"
          sx={{ fontWeight: 'bold' }}
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
          <IconButton
            color="inherit"
            aria-label="toggle theme"
            onClick={() => {
              const newMode = theme.palette.mode === 'light' ? 'dark' : 'light';
              localStorage.setItem('theme', newMode);
              window.location.reload();
            }}
            sx={{ display: { sm: 'none' } }}
          >
            {theme.palette.mode === 'light' ? '🌙' : '☀️'}
          </IconButton>
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
      </Box>
    </Box>
  )
} 