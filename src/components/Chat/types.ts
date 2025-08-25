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

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'system' | 'announcement' | 'voice' | 'image' | 'video' | 'html' | 'money_gift';
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  pfp_color?: string;
  pfp_icon?: string;
  audio_url?: string;
  media_url?: string;
  media_type?: string;
  gift_amount?: number;
  gift_claimed_by?: string;
  gift_claimed_at?: string;
  reply_to?: string;
  reply_to_message?: ChatMessage;
}

export interface UserChatSettings {
  user_id: string;
  chat_name: string;
  pfp_color: string;
  pfp_icon: string;
}
