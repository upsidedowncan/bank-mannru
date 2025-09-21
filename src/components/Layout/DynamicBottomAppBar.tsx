import React, { useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
  Fab,
  Box,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Dashboard,
  Store as StoreIcon,
  TrendingUp,
  Extension as ExtensionIcon,
  Person,
  Settings,
  Security,
  Add as AddIcon,
  Chat as ChatIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  MoreVert,
  ExpandLess,
  ExpandMore,
  Logout,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

// Comprehensive icon mapping for dynamic features
const iconMapping: { [key: string]: React.ComponentType } = {
  Dashboard,
  StoreIcon,
  Person,
  Settings,
  ExtensionIcon,
  TrendingUp,
  Security,
  AccountBalanceIcon,
  PaymentIcon,
  ChatIcon,
};

interface DynamicBottomAppBarProps {
  showDevSettings?: boolean;
  dynamicFeatures?: { title: string; route: string; icon: string }[];
  onFabClick?: (action: string) => void;
}

export const DynamicBottomAppBar: React.FC<DynamicBottomAppBarProps> = ({ 
  showDevSettings = false, 
  dynamicFeatures = [],
  onFabClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthContext();
  
  const [value, setValue] = useState(0);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [openMarketplace, setOpenMarketplace] = useState(false);

  // Core navigation items (always visible) - removed Главная to make space for More button
  const coreItems = [
    { label: 'Панель', icon: <Dashboard />, path: '/dashboard' },
    { label: 'Рынок', icon: <StoreIcon />, path: '/marketplace' },
    { label: 'Инвестиции', icon: <TrendingUp />, path: '/investments' },
  ];

  // Additional items (in more menu)
  const additionalItems = [
    { label: 'Главная', icon: <Dashboard />, path: '/' },
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

  const handleFabClick = (action: string) => {
    if (onFabClick) {
      onFabClick(action);
    }
  };

  if (!isMobile) {
    return null; // Only show on mobile
  }

  // Get contextual FABs based on current page
  const getContextualFABs = () => {
    const path = location.pathname;
    
    // Marketplace pages
    if (path.startsWith('/marketplace')) {
      return [
        {
          icon: <AddIcon />,
          label: 'Добавить товар',
          action: 'add-item',
          color: 'primary' as const,
        },
        {
          icon: <SearchIcon />,
          label: 'Поиск',
          action: 'search',
          color: 'secondary' as const,
        },
      ];
    }
    
    // Dashboard pages
    if (path.startsWith('/dashboard')) {
      return [
        {
          icon: <AccountBalanceIcon />,
          label: 'Новый счет',
          action: 'new-account',
          color: 'primary' as const,
        },
        {
          icon: <PaymentIcon />,
          label: 'Перевод',
          action: 'transfer',
          color: 'secondary' as const,
        },
      ];
    }
    
    // Investments page
    if (path === '/investments') {
      return [
        {
          icon: <TrendingUp />,
          label: 'Инвестировать',
          action: 'invest',
          color: 'primary' as const,
        },
        {
          icon: <RefreshIcon />,
          label: 'Обновить',
          action: 'refresh',
          color: 'secondary' as const,
        },
      ];
    }
    
    // Chat page
    if (path === '/chat') {
      return [
        {
          icon: <ChatIcon />,
          label: 'Новое сообщение',
          action: 'new-message',
          color: 'primary' as const,
        },
      ];
    }
    
    // Default FABs for other pages
    return [];
  };

  const contextualFABs = getContextualFABs();

  return (
    <>
      {/* Bottom Navigation */}
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

      {/* Contextual FABs - Hidden on mobile */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 80, // Above the bottom navigation
          right: 16,
          zIndex: theme.zIndex.appBar + 1,
          display: { xs: 'none', sm: 'flex' }, // Hide on mobile
          flexDirection: 'column',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        {contextualFABs.map((fab, index) => (
          <Tooltip key={fab.action} title={fab.label} placement="left">
            <Fab
              size="medium"
              color={fab.color}
              onClick={() => handleFabClick(fab.action)}
              sx={{
                width: 48,
                height: 48,
                boxShadow: 4,
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: 6,
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {fab.icon}
            </Fab>
          </Tooltip>
        ))}
      </Box>

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
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Выйти" />
        </MenuItem>
      </Menu>
    </>
  );
};
