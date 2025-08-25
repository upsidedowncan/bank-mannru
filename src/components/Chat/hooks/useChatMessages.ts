import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { ChatMessage, ChatChannel } from '../types';

const MAX_MESSAGES = 100;

export const useChatMessages = (
  selectedChannel: ChatChannel | null,
  showSnackbar: (message: string, severity: 'success' | 'error') => void
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const fetchMessages = useCallback(async () => {
    if (!selectedChannel) return;
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', selectedChannel.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const userIds = Array.from(new Set(data?.map(msg => msg.user_id) || []));

      const { data: userSettingsData } = await supabase
        .from('user_chat_settings')
        .select('user_id, chat_name, pfp_color, pfp_icon')
        .in('user_id', userIds);

      const settingsMap = new Map();
      userSettingsData?.forEach(setting => {
        settingsMap.set(setting.user_id, setting);
      });

      const messagesWithUserData = await Promise.all(
        data?.map(async (msg) => {
          const userSetting = settingsMap.get(msg.user_id);

          let replyToMessage = null;
          if (msg.reply_to) {
            const { data: replyData } = await supabase
              .from('chat_messages')
              .select('id, message, user_id')
              .eq('id', msg.reply_to)
              .single();

            if (replyData) {
              const replyUserSetting = settingsMap.get(replyData.user_id);
              replyToMessage = {
                ...replyData,
                user_name: replyUserSetting?.chat_name || `User ${replyData.user_id.slice(0, 8)}...`,
              };
            }
          }

          return {
            ...msg,
            user_name: userSetting?.chat_name || `User ${msg.user_id.slice(0, 8)}...`,
            pfp_color: userSetting?.pfp_color || '#1976d2',
            pfp_icon: userSetting?.pfp_icon || 'Person',
            reply_to_message: replyToMessage,
          };
        }) || []
      );

      setMessages(messagesWithUserData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      showSnackbar('Ошибка при загрузке сообщений', 'error');
    }
  }, [selectedChannel, showSnackbar]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!selectedChannel) return;

    const subscription = supabase
      .channel(`chat_messages_${selectedChannel.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedChannel.id}` },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;

          const { data: userSetting } = await supabase
            .from('user_chat_settings')
            .select('chat_name, pfp_color, pfp_icon')
            .eq('user_id', newMessage.user_id)
            .single();

          const messageWithUserData = {
            ...newMessage,
            user_name: userSetting?.chat_name || `User ${newMessage.user_id.slice(0, 8)}...`,
            pfp_color: userSetting?.pfp_color || '#1976d2',
            pfp_icon: userSetting?.pfp_icon || 'Person',
          };

          setMessages(prev => {
            const newMessages = [...prev, messageWithUserData];
            return newMessages.slice(-MAX_MESSAGES);
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedChannel.id}` },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => prev.map(msg =>
            msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
          ));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedChannel.id}` },
        (payload) => {
          const deletedMessageId = payload.old.id;
          setMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChannel]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setMessages(prev => {
        if (prev.length > MAX_MESSAGES) {
          console.log(`Cleaning up messages: ${prev.length} -> ${MAX_MESSAGES}`);
          return prev.slice(-MAX_MESSAGES);
        }
        return prev;
      });
    }, 30000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return { messages, setMessages };
};
