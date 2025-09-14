import React from 'react';
import { Button, Box, Typography, Card, CardContent } from '@mui/material';
import { NotificationService } from '../../services/notificationService';
import { useAuthContext } from '../../contexts/AuthContext';

// Example component showing how to use the notification system
export const NotificationExamples: React.FC = () => {
  const { user } = useAuthContext();

  const testMoneyReceived = async () => {
    if (!user) return;
    
    await NotificationService.notifyMoneyReceived(
      user.id,
      1000,
      'MR',
      'Test Sender',
      user.id
    );
  };

  const testItemSold = async () => {
    if (!user) return;
    
    await NotificationService.notifyItemSold(
      user.id,
      'Test Item',
      500,
      'MR',
      'Test Buyer'
    );
  };

  const testNewMessage = async () => {
    if (!user) return;
    
    await NotificationService.notifyNewMessage(
      user.id,
      'Test User',
      'This is a test message to see how notifications work!',
      'test-room-id',
      user.id
    );
  };

  const testSystemNotification = async () => {
    if (!user) return;
    
    await NotificationService.notifySystem(
      user.id,
      '🔔 System Update',
      'This is a test system notification to demonstrate the notification system.'
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Notification System Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Click the buttons below to test different types of notifications. 
        You should see them appear in the notification bell and as toast notifications.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              💰 Money Received
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Test a transaction notification when you receive money.
            </Typography>
            <Button variant="contained" color="success" onClick={testMoneyReceived}>
              Test Money Received
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🛒 Item Sold
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Test a marketplace notification when your item is sold.
            </Typography>
            <Button variant="contained" color="primary" onClick={testItemSold}>
              Test Item Sold
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              💬 New Message
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Test a chat notification when you receive a message.
            </Typography>
            <Button variant="contained" color="info" onClick={testNewMessage}>
              Test New Message
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔔 System Notification
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Test a system notification for general announcements.
            </Typography>
            <Button variant="contained" color="warning" onClick={testSystemNotification}>
              Test System Notification
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
