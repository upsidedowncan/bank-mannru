import React, { useState } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  Stack, 
  TextField, 
  Divider, 
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import { NotificationService } from '../../services/notificationService';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNotifications } from './NotificationSystem';

export const NotificationTest: React.FC = () => {
  const { user } = useAuthContext();
  const { clearTestNotifications } = useNotifications();
  const [targetUser, setTargetUser] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const testNotification = async (type: string, targetUserId?: string) => {
    const recipientId = targetUserId || user?.id;
    if (!recipientId) return;

    try {
      switch (type) {
        case 'transaction':
          await NotificationService.notifyMoneyReceived(
            recipientId,
            1000,
            'MR',
            'Тестовый отправитель',
            user?.id
          );
          break;
        case 'marketplace':
          await NotificationService.notifyItemSold(
            recipientId,
            'Тестовый товар',
            500,
            'MR',
            'Тестовый покупатель'
          );
          break;
        case 'chat':
          await NotificationService.notifyNewMessage(
            recipientId,
            'Тестовый пользователь',
            'Это тестовое сообщение',
            'test-item-id',
            user?.id
          );
          break;
        case 'system':
          await NotificationService.notifySystem(
            recipientId,
            'Тестовое системное сообщение',
            'Это тестовое системное уведомление'
          );
          break;
      }
      showSnackbar(`${type} уведомление отправлено успешно`);
    } catch (error) {
      console.error(`Error sending ${type} notification:`, error);
      showSnackbar(`Ошибка отправки ${type} уведомления`, 'error');
    }
  };

  const sendCustomNotification = async () => {
    if (!targetUser || !customTitle || !customMessage) {
      showSnackbar('Заполните все поля', 'error');
      return;
    }

    try {
      await NotificationService.sendToUser(
        targetUser,
        'system',
        customTitle,
        customMessage
      );
      showSnackbar('Пользовательское уведомление отправлено');
      setCustomTitle('');
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending custom notification:', error);
      showSnackbar('Ошибка отправки пользовательского уведомления', 'error');
    }
  };

  const broadcastToAll = async () => {
    if (!customTitle || !customMessage) {
      showSnackbar('Заполните заголовок и сообщение', 'error');
      return;
    }

    try {
      await NotificationService.broadcastToAll(
        'system',
        customTitle,
        customMessage
      );
      showSnackbar('Уведомление отправлено всем пользователям');
      setCustomTitle('');
      setCustomMessage('');
    } catch (error) {
      console.error('Error broadcasting:', error);
      showSnackbar('Ошибка рассылки', 'error');
    }
  };

  const handleClearTestNotifications = async () => {
    try {
      await clearTestNotifications();
      showSnackbar('Тестовые уведомления удалены');
    } catch (error) {
      console.error('Error clearing test notifications:', error);
      showSnackbar('Ошибка удаления тестовых уведомлений', 'error');
    }
  };

  if (!user) {
    return <Typography>Войдите в систему для тестирования уведомлений</Typography>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Панель тестирования уведомлений
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Нажмите кнопки ниже для тестирования различных типов уведомлений
      </Typography>

      <Stack spacing={3}>
        {/* Test notifications to self */}
        <Card>
          <CardHeader title="Тестовые уведомления (себе)" />
          <CardContent>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="contained"
                color="success"
                onClick={() => testNotification('transaction')}
              >
                Тест: Деньги получены
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => testNotification('marketplace')}
              >
                Тест: Товар продан
              </Button>
              <Button
                variant="contained"
                color="info"
                onClick={() => testNotification('chat')}
              >
                Тест: Новое сообщение
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => testNotification('system')}
              >
                Тест: Системное сообщение
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Send to specific user */}
        <Card>
          <CardHeader title="Отправить конкретному пользователю" />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="ID пользователя или email"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="user@example.com или UUID"
                fullWidth
              />
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => testNotification('transaction', targetUser)}
                  disabled={!targetUser}
                >
                  Деньги получены
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => testNotification('marketplace', targetUser)}
                  disabled={!targetUser}
                >
                  Товар продан
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => testNotification('chat', targetUser)}
                  disabled={!targetUser}
                >
                  Новое сообщение
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => testNotification('system', targetUser)}
                  disabled={!targetUser}
                >
                  Системное сообщение
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Custom notifications */}
        <Card>
          <CardHeader title="Пользовательские уведомления" />
          <CardContent>
            <Stack spacing={2}>
              <TextField
                label="Заголовок"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label="Сообщение"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  onClick={sendCustomNotification}
                  disabled={!targetUser || !customTitle || !customMessage}
                >
                  Отправить пользователю
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={broadcastToAll}
                  disabled={!customTitle || !customMessage}
                >
                  Рассылка всем
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Clear test notifications */}
        <Card>
          <CardHeader title="Очистка уведомлений" />
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="body2" color="textSecondary">
                Удалить все тестовые уведомления из базы данных
              </Typography>
              <Button
                variant="contained"
                color="error"
                onClick={handleClearTestNotifications}
              >
                Удалить тестовые уведомления
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
