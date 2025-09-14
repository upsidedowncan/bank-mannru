import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, AlertTitle, Box, Typography, Chip } from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  ShoppingCart as MarketplaceIcon,
  Chat as ChatIcon,
  Settings as SystemIcon,
} from '@mui/icons-material';
import { useNotifications } from './NotificationSystem';
import { formatCurrency } from '../../utils/formatters';

export const NotificationToast: React.FC = () => {
  const { notifications } = useNotifications();
  const [toastOpen, setToastOpen] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<any>(null);
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Show toast for the most recent unread notification that hasn't been shown yet
    const latestUnread = notifications.find(n => !n.is_read && !shownNotifications.has(n.id));
    
    if (latestUnread && latestUnread !== currentNotification) {
      setCurrentNotification(latestUnread);
      setToastOpen(true);
      setShownNotifications(prev => new Set(Array.from(prev).concat(latestUnread.id)));
    }
  }, [notifications, currentNotification, shownNotifications]);

  const handleClose = () => {
    setToastOpen(false);
    setCurrentNotification(null);
  };

  // Clear shown notifications when notifications change significantly
  useEffect(() => {
    setShownNotifications(new Set());
    setCurrentNotification(null);
    setToastOpen(false);
  }, [notifications.length]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <MoneyIcon />;
      case 'marketplace':
        return <MarketplaceIcon />;
      case 'chat':
        return <ChatIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return null;
    }
  };

  const getNotificationSeverity = (type: string): 'success' | 'info' | 'warning' | 'error' => {
    switch (type) {
      case 'transaction':
        return 'success';
      case 'marketplace':
        return 'info';
      case 'chat':
        return 'info';
      case 'system':
        return 'warning';
      default:
        return 'info';
    }
  };

  if (!currentNotification) return null;

  return (
    <Snackbar
      open={toastOpen}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 8 }}
    >
      <Alert
        onClose={handleClose}
        severity={getNotificationSeverity(currentNotification.type)}
        variant="filled"
        sx={{
          minWidth: 350,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {getNotificationIcon(currentNotification.type)}
          <Box sx={{ flex: 1 }}>
            <AlertTitle sx={{ mb: 0.5 }}>
              {currentNotification.title}
            </AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {currentNotification.message}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip
                label={currentNotification.type}
                size="small"
                variant="outlined"
                sx={{ 
                  color: 'inherit',
                  borderColor: 'currentColor',
                  opacity: 0.8,
                }}
              />
              {currentNotification.amount && (
                <Typography variant="body2" fontWeight={600}>
                  {formatCurrency(currentNotification.amount, currentNotification.currency || 'MR')}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
};
