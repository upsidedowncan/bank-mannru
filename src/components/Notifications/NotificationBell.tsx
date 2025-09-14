import React, { useState } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Button,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as MarketplaceIcon,
  Chat as ChatIcon,
  Settings as SystemIcon,
  MarkEmailRead as ReadIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useNotifications } from './NotificationSystem';
import { formatCurrency } from '../../utils/formatters';

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <MoneyIcon color="success" />;
      case 'marketplace':
        return <MarketplaceIcon color="primary" />;
      case 'chat':
        return <ChatIcon color="info" />;
      case 'system':
        return <SystemIcon color="warning" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'transaction':
        return 'success';
      case 'marketplace':
        return 'primary';
      case 'chat':
        return 'info';
      case 'system':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatNotificationTime = (createdAt: string) => {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Только что';
    if (diffInMinutes < 60) return `${diffInMinutes}м назад`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}ч назад`;
    return `${Math.floor(diffInMinutes / 1440)}д назад`;
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    handleClose();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ position: 'relative' }}
      >
        <NotificationsIcon />
        {unreadCount > 0 && (
          <Badge
            badgeContent={unreadCount}
            color="error"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
            }}
          />
        )}
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            overflow: 'auto',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Уведомления
            </Typography>
            <Box>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<ReadIcon />}
                  onClick={markAllAsRead}
                  sx={{ mr: 1 }}
                >
                  Отметить все как прочитанные
                </Button>
              )}
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearNotifications}
                color="error"
              >
                Очистить все
              </Button>
            </Box>
          </Box>

          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography color="textSecondary">
                Пока нет уведомлений
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        backgroundColor: notification.is_read ? 'transparent' : 'action.hover',
                        borderRadius: 1,
                        mb: 0.5,
                      }}
                    >
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight={notification.is_read ? 400 : 600}>
                              {notification.title}
                            </Typography>
                            <Chip
                              label={notification.type}
                              size="small"
                              color={getNotificationColor(notification.type) as any}
                              variant="outlined"
                            />
                            {!notification.is_read && (
                            <Chip
                              label="Новое"
                              size="small"
                              color="error"
                              variant="filled"
                            />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                              {notification.message}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="textSecondary">
                                {formatNotificationTime(notification.created_at)}
                              </Typography>
                              {notification.amount && (
                                <Typography variant="caption" color="success.main" fontWeight={600}>
                                  {formatCurrency(notification.amount, notification.currency || 'MR')}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};
