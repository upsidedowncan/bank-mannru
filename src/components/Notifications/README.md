# Live Notification System

A comprehensive real-time notification system for the Bank Mannru application that handles chat messages, transactions, marketplace events, and system notifications.

## Features

- **Real-time notifications** using Supabase real-time subscriptions
- **Browser notifications** with permission handling
- **Toast notifications** for immediate feedback
- **Notification bell** with unread count and popup
- **Multiple notification types**: transaction, marketplace, chat, system
- **Mark as read** functionality
- **Cleanup** of old notifications

## Components

### NotificationSystem.tsx
The main context provider that manages notification state and real-time subscriptions.

### NotificationBell.tsx
A bell icon in the app bar that shows unread count and displays notifications in a popover.

### NotificationToast.tsx
Toast notifications that appear at the top-right of the screen for immediate feedback.

## Services

### NotificationService.ts
A service class with static methods for creating different types of notifications:

```typescript
// Money received notification
await NotificationService.notifyMoneyReceived(
  userId,
  amount,
  currency,
  senderName,
  senderId
);

// Item sold notification
await NotificationService.notifyItemSold(
  sellerId,
  itemName,
  price,
  currency,
  buyerName
);

// Chat message notification
await NotificationService.notifyNewMessage(
  recipientId,
  senderName,
  messageContent,
  chatRoomId,
  senderId
);

// System notification
await NotificationService.notifySystem(
  userId,
  title,
  message,
  data
);
```

## Database Schema

The system uses a `notifications` table with the following structure:

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(20) CHECK (type IN ('transaction', 'marketplace', 'chat', 'system')),
  title VARCHAR(255),
  message TEXT,
  amount DECIMAL(15,2),
  currency VARCHAR(10),
  sender_id UUID REFERENCES auth.users(id),
  sender_name VARCHAR(255),
  item_name VARCHAR(255),
  chat_room_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Real-time Subscriptions

The system automatically subscribes to:

1. **Notifications table** - New notifications for the current user
2. **Transactions table** - Money received notifications
3. **Marketplace listings** - Item sold notifications
4. **Chat messages** - New message notifications

## Usage

### 1. Wrap your app with NotificationProvider

```tsx
<NotificationProvider>
  <YourApp />
</NotificationProvider>
```

### 2. Add NotificationBell to your app bar

```tsx
import { NotificationBell } from './components/Notifications/NotificationBell';

// In your AppBar
<Toolbar>
  <Typography variant="h6">Your App</Typography>
  <NotificationBell />
</Toolbar>
```

### 3. Add NotificationToast to your main content

```tsx
import { NotificationToast } from './components/Notifications/NotificationToast';

// In your main content area
<Box>
  {children}
  <NotificationToast />
</Box>
```

### 4. Use NotificationService in your components

```tsx
import { NotificationService } from '../services/notificationService';

// When a transaction occurs
await NotificationService.notifyMoneyReceived(
  recipientId,
  amount,
  'MR',
  senderName
);

// When an item is sold
await NotificationService.notifyItemSold(
  sellerId,
  itemName,
  price,
  'MR'
);
```

## Notification Types

### Transaction Notifications
- **Trigger**: When money is received
- **Icon**: 💰 Money icon
- **Color**: Success (green)
- **Data**: amount, currency, sender info

### Marketplace Notifications
- **Trigger**: When an item is sold
- **Icon**: 🛒 Shopping cart icon
- **Color**: Primary (blue)
- **Data**: item name, price, buyer info

### Chat Notifications
- **Trigger**: When a new message is received
- **Icon**: 💬 Chat icon
- **Color**: Info (blue)
- **Data**: sender name, message preview, chat room

### System Notifications
- **Trigger**: Manual system announcements
- **Icon**: 🔔 Bell icon
- **Color**: Warning (orange)
- **Data**: custom data

## Browser Notifications

The system automatically requests browser notification permission and shows native notifications when:
- Permission is granted
- New notifications arrive
- User is not actively viewing the app

## Cleanup

- Notifications older than 30 days are automatically cleaned up
- Users can manually clear all notifications
- Unread count is maintained in real-time

## Testing

Use the `NotificationExamples` component to test different notification types:

```tsx
import { NotificationExamples } from './components/Notifications/NotificationExamples';

// Add to your app for testing
<NotificationExamples />
```

## Security

- Row Level Security (RLS) ensures users only see their own notifications
- All database operations are secured with proper policies
- Real-time subscriptions are filtered by user ID
