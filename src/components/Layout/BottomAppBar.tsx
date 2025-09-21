import React, { useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Home,
  Dashboard,
  Store as StoreIcon,
  TrendingUp,
  Extension as ExtensionIcon,
  Person,
  Settings,
  Security,
  ExpandLess,
  ExpandMore,
  MoreVert,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

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
};

interface BottomAppBarProps {
  showDevSettings?: boolean;
  dynamicFeatures?: { title: string; route: string; icon: string }[];
}

export const BottomAppBar: React.FC<BottomAppBarProps> = ({ 
  showDevSettings = false, 
  dynamicFeatures = [] 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthContext();
  
  const [value, setValue] = useState(0);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [openMarketplace, setOpenMarketplace] = useState(false);

  // Core navigation items (always visible)
  const coreItems = [
    { label: 'Главная', icon: <Home />, path: '/' },
    { label: 'Панель', icon: <Dashboard />, path: '/dashboard' },
    { label: 'Рынок', icon: <StoreIcon />, path: '/marketplace' },
    { label: 'Инвестиции', icon: <TrendingUp />, path: '/investments' },
  ];

  // Additional items (in more menu)
  const additionalItems = [
    ...(showDevSettings ? [{ label: 'Админка', icon: <Security />, path: '/admin/investments' }] : []),
    { label: 'Функции', icon: <ExtensionIcon />, path: '/features-marketplace' },
    { label: 'Профиль', icon: <Person />, path: '/dashboard/profile' },
    { label: 'Настройки', icon: <Settings />, path: '/dashboard/settings' },
    // Dynamic features
    ...dynamicFeatures.map(f => {
      const IconComponent = f.icon ? iconMapping[f.icon] : ExtensionIcon;
      return {
        label: f.title,
        icon: IconComponent ? <IconComponent /> : <ExtensionIcon />,
        path: f.route
      };
    }),
  ];

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    const item = coreItems[newValue];
    if (item) {
      navigate(item.path);
    }
  };

  const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleMoreClose = () => {
    setMoreMenuAnchor(null);
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    handleMoreClose();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    handleMoreClose();
  };

  if (!isMobile) {
    return null; // Only show on mobile
  }

  return (
    <>
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }} 
        elevation={8}
      >
        <BottomNavigation
          value={value}
          onChange={handleChange}
          showLabels
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              padding: '6px 8px',
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.75rem',
              fontWeight: 500,
              '&.Mui-selected': {
                fontSize: '0.75rem',
                fontWeight: 600,
              },
            },
          }}
        >
          {coreItems.map((item, index) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
              value={index}
            />
          ))}
          <BottomNavigationAction
            label="Ещё"
            icon={<MoreVert />}
            value={-1}
            onClick={handleMoreClick}
          />
        </BottomNavigation>
      </Paper>

      {/* More Menu */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={handleMoreClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            maxHeight: '70vh',
            width: '280px',
            mt: -1,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
            },
          },
        }}
      >
        {/* Marketplace Submenu */}
        <MenuItem
          onClick={() => setOpenMarketplace(!openMarketplace)}
          sx={{
            backgroundColor: openMarketplace ? theme.palette.action.selected : 'transparent',
          }}
        >
          <ListItemIcon>
            <StoreIcon />
          </ListItemIcon>
          <ListItemText primary="Рынок" />
          {openMarketplace ? <ExpandLess /> : <ExpandMore />}
        </MenuItem>
        
        <Collapse in={openMarketplace} timeout="auto" unmountOnExit>
          <MenuItem
            onClick={() => handleMenuItemClick('/marketplace')}
            sx={{ pl: 4 }}
          >
            <ListItemText 
              primary="Все товары" 
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </MenuItem>
          <MenuItem
            onClick={() => handleMenuItemClick('/marketplace/my-listings')}
            sx={{ pl: 4 }}
          >
            <ListItemText 
              primary="Мои товары" 
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </MenuItem>
          <MenuItem
            onClick={() => handleMenuItemClick('/marketplace/chat')}
            sx={{ pl: 4 }}
          >
            <ListItemText 
              primary="Сообщения" 
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </MenuItem>
          <MenuItem
            onClick={() => handleMenuItemClick('/marketplace/favorites')}
            sx={{ pl: 4 }}
          >
            <ListItemText 
              primary="Избранное" 
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </MenuItem>
        </Collapse>

        <Divider />

        {/* Additional Items */}
        {additionalItems.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => handleMenuItemClick(item.path)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </MenuItem>
        ))}

        <Divider />

        {/* Logout */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Выйти" />
        </MenuItem>
      </Menu>
    </>
  );
};
