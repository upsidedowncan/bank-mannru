import { supabase } from '../config/supabase';

export interface CreateNotificationData {
  user_id: string;
  type: 'transaction' | 'marketplace' | 'chat' | 'system';
  title: string;
  message: string;
  amount?: number;
  currency?: string;
  sender_id?: string;
  sender_name?: string;
  item_name?: string;
  item_id?: string;
  data?: any;
}

export class NotificationService {
  // Create a notification for a specific user
  static async createNotification(data: CreateNotificationData) {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          ...data,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create transaction notification (money received)
  static async notifyMoneyReceived(
    recipientId: string,
    amount: number,
    currency: string = 'MR',
    senderName?: string,
    senderId?: string
  ) {
    return this.createNotification({
      user_id: recipientId,
      type: 'transaction',
      title: '💰 Деньги получены!',
      message: `Вы получили ${amount} ${currency}${senderName ? ` от ${senderName}` : ''}`,
      amount,
      currency,
      sender_id: senderId,
      sender_name: senderName,
    });
  }

  // Create marketplace sale notification
  static async notifyItemSold(
    sellerId: string,
    itemName: string,
    price: number,
    currency: string = 'MR',
    buyerName?: string
  ) {
    return this.createNotification({
      user_id: sellerId,
      type: 'marketplace',
      title: '🛒 Товар продан!',
      message: `Ваш товар "${itemName}" был продан за ${price} ${currency}${buyerName ? ` покупателю ${buyerName}` : ''}!`,
      amount: price,
      currency,
      item_name: itemName,
    });
  }

  // Create chat message notification
  static async notifyNewMessage(
    recipientId: string,
    senderName: string,
    messageContent: string,
    itemId?: string,
    senderId?: string
  ) {
    const truncatedMessage = messageContent.length > 50 
      ? messageContent.substring(0, 50) + '...' 
      : messageContent;

    return this.createNotification({
      user_id: recipientId,
      type: 'chat',
      title: '💬 Новое сообщение',
      message: `${senderName}: ${truncatedMessage}`,
      sender_id: senderId,
      sender_name: senderName,
      item_id: itemId,
    });
  }

  // Create system notification
  static async notifySystem(
    userId: string,
    title: string,
    message: string,
    data?: any
  ) {
    return this.createNotification({
      user_id: userId,
      type: 'system',
      title,
      message,
      data,
    });
  }

  // Create multiple notifications for multiple users
  static async createBulkNotifications(notifications: CreateNotificationData[]) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(
          notifications.map(n => ({
            ...n,
            is_read: false,
          }))
        )
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId: string) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Clear all notifications for a user
  static async clearAllNotifications(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  // Send notification to specific user by email or user ID
  static async sendToUser(
    userIdentifier: string, // Can be user ID or email
    type: 'transaction' | 'marketplace' | 'chat' | 'system',
    title: string,
    message: string,
    metadata: any = {}
  ) {
    try {
      // First, try to find user by ID or email
      let userId = userIdentifier;
      
      // If it looks like an email, find the user ID
      if (userIdentifier.includes('@')) {
        const { data: user, error: userError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', userIdentifier)
          .single();
        
        if (userError || !user) {
          throw new Error('Пользователь не найден');
        }
        userId = user.id;
      }

      return this.createNotification({
        user_id: userId,
        type,
        title,
        message,
        ...metadata,
      });
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  // Send notification to multiple users
  static async sendToMultipleUsers(
    userIds: string[],
    type: 'transaction' | 'marketplace' | 'chat' | 'system',
    title: string,
    message: string,
    metadata: any = {}
  ) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type,
        title,
        message,
        is_read: false,
        ...metadata,
      }));

      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending notifications to multiple users:', error);
      throw error;
    }
  }

  // Send notification to all users (broadcast)
  static async broadcastToAll(
    type: 'transaction' | 'marketplace' | 'chat' | 'system',
    title: string,
    message: string,
    metadata: any = {}
  ) {
    try {
      // Get all user IDs
      const { data: users, error: usersError } = await supabase
        .from('auth.users')
        .select('id');

      if (usersError) throw usersError;
      if (!users || users.length === 0) return [];

      const userIds = users.map(user => user.id);
      return this.sendToMultipleUsers(userIds, type, title, message, metadata);
    } catch (error) {
      console.error('Error broadcasting to all users:', error);
      throw error;
    }
  }
}
