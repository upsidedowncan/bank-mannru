export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_public: boolean;
  is_active: boolean;
  is_pinned: boolean;
  admin_only: boolean;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  channel_id: string;
  emoji: string;
  user_name?: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'system' | 'announcement' | 'voice' | 'image' | 'video' | 'html' | 'money_gift' | 'manpay' | 'market_item';
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  pfp_color?: string;
  pfp_icon?: string;
  pfp_type?: 'icon' | 'image' | 'gradient';
  pfp_image_url?: string;
  pfp_gradient?: string;
  audio_url?: string;
  audio_duration?: number;
  media_url?: string;
  media_type?: string;
  gift_amount?: number;
  gift_claimed_by?: string;
  gift_claimed_at?: string;
  reply_to?: string;
  reply_to_message?: ChatMessage;
  reactions?: MessageReaction[];
  manpay_amount?: number;
  manpay_sender_id?: string;
  manpay_receiver_id?: string;
  manpay_status?: string;
  is_optimistic?: boolean; // For optimistic updates
  // Market item fields
  market_item_id?: string;
  market_item_title?: string;
  market_item_price?: number;
  market_item_currency?: string;
  market_item_image?: string;
}

export interface UserChatSettings {
  user_id: string;
  chat_name: string;
  pfp_color: string;
  pfp_icon: string;
  pfp_type?: 'icon' | 'image' | 'gradient';
  pfp_image_url?: string;
  pfp_gradient?: string;
}
