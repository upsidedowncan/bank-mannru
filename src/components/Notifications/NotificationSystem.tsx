import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

export interface Notification {
  id: string;
  type: 'transaction' | 'marketplace' | 'chat' | 'system';
  title: string;
  message: string;
  amount?: number;
  currency?: string;
  sender_id?: string;
  sender_name?: string;
  item_name?: string;
  chat_room_id?: string;
  is_read: boolean;
  created_at: string;
  data?: any; // Additional data for specific notification types
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => void;
  clearNotifications: () => void;
  clearTestNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user]);

  // Add new notification
  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
    if (!user) return;

    try {
      console.log('Adding notification:', notificationData);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notificationData,
          user_id: user.id,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Notification created in database:', data);

      setNotifications(prev => {
        console.log('Previous notifications count:', prev.length);
        const newNotifications = [data, ...prev];
        console.log('New notifications count:', newNotifications.length);
        return newNotifications;
      });
      setUnreadCount(prev => prev + 1);

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notificationData.title, {
          body: notificationData.message,
          icon: '/favicon.ico',
          tag: data.id,
        });
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }, [user]);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [user]);

  // Clear all test notifications for a user
  const clearTestNotifications = useCallback(async () => {
    if (!user) return;

    try {
      console.log('Clearing test notifications...');
      
      // Delete notifications with test sender names
      const { error: testError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('sender_name', 'Тестовый отправитель');

      if (testError) {
        console.error('Error clearing test notifications:', testError);
      } else {
        console.log('Test notifications cleared');
      }

      // Delete notifications with test content
      const { error: contentError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .or('title.ilike.%тест%,message.ilike.%тест%,title.ilike.%TEST%,message.ilike.%TEST%');

      if (contentError) {
        console.error('Error clearing test content notifications:', contentError);
      } else {
        console.log('Test content notifications cleared');
      }

      // Refresh notifications
      await fetchNotifications();
      
    } catch (error) {
      console.error('Error clearing test notifications:', error);
    }
  }, [user, fetchNotifications]);

  // Helper function to show browser notification safely
  const showBrowserNotification = useCallback((title: string, message: string, tag: string) => {
    try {
      // Check if notifications are supported and permitted
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }

      // Check if the page is visible - only show notifications when page is not in focus
      if (document.visibilityState === 'visible') {
        // Page is visible, don't show browser notification to avoid spam
        return;
      }

      // Create notification
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: tag,
        requireInteraction: false,
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

    } catch (error) {
      console.warn('Could not show browser notification:', error);
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(error => {
        console.warn('Could not request notification permission:', error);
      });
    }
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to notifications table changes
    const notificationsSubscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotification = payload.new as Notification;
        
        console.log('Real-time notification received:', newNotification);
        console.log('Notification title:', newNotification.title);
        console.log('Notification message:', newNotification.message);
        console.log('Notification type:', newNotification.type);
        
        // Skip test notifications
        if (newNotification.title.includes('TEST') || newNotification.message.includes('TEST') || 
            newNotification.title.includes('Test') || newNotification.message.includes('Test') ||
            newNotification.title.includes('тест') || newNotification.message.includes('тест') ||
            newNotification.title.includes('Тест') || newNotification.message.includes('Тест') ||
            newNotification.title.includes('MONEY RECEIVED NOTIFICATION TEST') ||
            newNotification.message.includes('MONEY RECEIVED NOTIFICATION TEST') ||
            newNotification.sender_name === 'Тестовый отправитель' ||
            newNotification.message.includes('Тестовый отправитель')) {
          console.log('Skipping test notification:', newNotification.id);
          return;
        }
        
        // Check if notification already exists to prevent duplicates
        setNotifications(prev => {
          const exists = prev.some(n => n.id === newNotification.id);
          if (exists) {
            console.log('Notification already exists, skipping:', newNotification.id);
            return prev;
          }
          
          console.log('Adding real-time notification to state:', newNotification.id);
          return [newNotification, ...prev];
        });
        
        setUnreadCount(prev => prev + 1);

        // Show browser notification only once
        const notificationKey = `notification_${newNotification.id}`;
        if (!sessionStorage.getItem(notificationKey)) {
          showBrowserNotification(
            newNotification.title,
            newNotification.message,
            newNotification.id
          );
          sessionStorage.setItem(notificationKey, 'shown');
        }
      })
      .subscribe();

    // Subscribe to transaction changes (for money received notifications)
    const transactionsSubscription = supabase
      .channel('transactions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `recipient_id=eq.${user.id}`,
      }, async (payload) => {
        const transaction = payload.new as any;
        
        // Debug logging
        console.log('Transaction notification triggered:', transaction);
        
        // Check if we already processed this transaction
        const transactionKey = `transaction_${transaction.id}`;
        if (sessionStorage.getItem(transactionKey)) {
          console.log('Transaction already processed:', transaction.id);
          return;
        }
        
        // Only create notification for actual money transfers, not test notifications
        if (transaction.description === 'ManPay Transfer' && !transaction.sender_name?.includes('Test')) {
          console.log('Creating money received notification for transaction:', transaction.id);
          
          // Add money received notification
          await addNotification({
            type: 'transaction',
            title: '💰 Деньги получены!',
            message: `Вы получили ${transaction.amount} ${transaction.currency || 'MR'} от ${transaction.sender_name || 'Неизвестного'}`,
            amount: transaction.amount,
            currency: transaction.currency || 'MR',
            sender_id: transaction.sender_id,
            sender_name: transaction.sender_name,
          });
        } else {
          console.log('Skipping test transaction notification:', transaction.id);
        }
        
        // Mark transaction as processed
        sessionStorage.setItem(transactionKey, 'processed');
      })
      .subscribe();

    // Subscribe to marketplace sales
    const marketplaceSubscription = supabase
      .channel('marketplace')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'marketplace_listings',
        filter: `seller_id=eq.${user.id}`,
      }, async (payload) => {
        const listing = payload.new as any;
        
        if (listing.status === 'sold') {
          await addNotification({
            type: 'marketplace',
            title: '🛒 Item Sold!',
            message: `Your "${listing.item_name}" has been sold for ${listing.price} ${listing.currency || 'MR'}!`,
            amount: listing.price,
            currency: listing.currency || 'MR',
            item_name: listing.item_name,
          });
        }
      })
      .subscribe();

    // Subscribe to direct messages
    const directMessagesSubscription = supabase
      .channel('direct_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `sender_id=neq.${user.id}`,
      }, async (payload) => {
        const message = payload.new as any;
        
        console.log('Direct message notification triggered:', message);
        
        // Check if this message is for the current user
        // We need to check if the user is a participant in this conversation
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', message.conversation_id)
          .eq('user_id', user.id);
        
        console.log('Participants check result:', participants);
        
        if (participants && participants.length > 0) {
          console.log('Creating chat notification for message:', message.id);
          
          await addNotification({
            type: 'chat',
            title: '💬 Новое сообщение',
            message: `${message.sender_name || 'Пользователь'}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
            sender_id: message.sender_id,
            sender_name: message.sender_name,
          });
        }
      })
      .subscribe();

    // Initial fetch
    fetchNotifications();

    return () => {
      notificationsSubscription.unsubscribe();
      transactionsSubscription.unsubscribe();
      marketplaceSubscription.unsubscribe();
      directMessagesSubscription.unsubscribe();
    };
  }, [user, addNotification, fetchNotifications, showBrowserNotification]);

  // Cleanup session storage on unmount
  useEffect(() => {
    return () => {
      // Clean up old notification keys from session storage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('notification_') || key.startsWith('transaction_')) {
          sessionStorage.removeItem(key);
        }
      });
    };
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications,
    clearTestNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
