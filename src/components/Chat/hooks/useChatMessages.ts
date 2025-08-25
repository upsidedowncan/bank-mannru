import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { ChatMessage, ChatChannel, MessageReaction } from '../types';

const MAX_MESSAGES = 100;

export const useChatMessages = (
  selectedChannel: ChatChannel | null,
  showSnackbar: (message: string, severity: 'success' | 'error') => void
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const fetchMessages = useCallback(async () => {
    if (!selectedChannel) return;
    try {
      // 1. Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', selectedChannel.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;
      if (!messagesData) return;

      const messageIds = messagesData.map(msg => msg.id);

      // 2. Fetch reactions for these messages
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (reactionsError) throw reactionsError;

      // 3. Get all unique user IDs from messages and reactions
      const userIdsFromMessages = messagesData.map(msg => msg.user_id);
      const userIdsFromReactions = reactionsData?.map(r => r.user_id) || [];
      const allUserIds = Array.from(new Set([...userIdsFromMessages, ...userIdsFromReactions]));

      // 4. Fetch user settings for all involved users
      const { data: userSettingsData } = await supabase
        .from('user_chat_settings')
        .select('user_id, chat_name, pfp_color, pfp_icon')
        .in('user_id', allUserIds);

      const settingsMap = new Map();
      userSettingsData?.forEach(setting => {
        settingsMap.set(setting.user_id, setting);
      });

      // 5. Group reactions by message_id
      const reactionsByMessageId = new Map<string, MessageReaction[]>();
      reactionsData?.forEach(reaction => {
        const userSetting = settingsMap.get(reaction.user_id);
        const reactionWithUser: MessageReaction = {
          ...reaction,
          user_name: userSetting?.chat_name || `User ${reaction.user_id.slice(0, 8)}...`,
        };
        const existing = reactionsByMessageId.get(reaction.message_id) || [];
        reactionsByMessageId.set(reaction.message_id, [...existing, reactionWithUser]);
      });

      // 6. Combine messages with user data, replies, and reactions
      const finalMessages = await Promise.all(
        messagesData.map(async (msg) => {
          const userSetting = settingsMap.get(msg.user_id);

          let replyToMessage = null;
          if (msg.reply_to) {
            // This could be optimized by fetching all reply messages in one go
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
            reactions: reactionsByMessageId.get(msg.id) || [],
          };
        })
      );

      setMessages(finalMessages);
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

    const messageSubscription = supabase
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

    const reactionSubscription = supabase
      .channel(`message_reactions_${selectedChannel.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions', filter: `channel_id=eq.${selectedChannel.id}` },
        async (payload) => {
          try {
            const newReaction = payload.new as MessageReaction;

            // Fetch the user's name for the new reaction
            const { data: userSetting, error } = await supabase
              .from('user_chat_settings')
              .select('chat_name')
              .eq('user_id', newReaction.user_id)
              .single();

            if (error) {
              console.error("Error fetching user settings for reaction:", error);
            }

            const reactionWithUser: MessageReaction = {
              ...newReaction,
              user_name: userSetting?.chat_name || `User ${newReaction.user_id.slice(0, 8)}...`,
            };

            setMessages(prevMessages => prevMessages.map(msg => {
              if (msg.id === reactionWithUser.message_id) {
                const reactions = [...(msg.reactions || []), reactionWithUser];
                return { ...msg, reactions };
              }
              return msg;
            }));
          } catch (e) {
            console.error("Error processing real-time reaction insert:", e);
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions', filter: `channel_id=eq.${selectedChannel.id}` },
        (payload) => {
          const oldReaction = payload.old as MessageReaction;
          setMessages(prevMessages => prevMessages.map(msg => {
            if (msg.id === oldReaction.message_id) {
              const reactions = (msg.reactions || []).filter(r => r.id !== oldReaction.id);
              return { ...msg, reactions };
            }
            return msg;
          }));
        }
      )
      .subscribe();

    return () => {
        supabase.removeChannel(messageSubscription);
        supabase.removeChannel(reactionSubscription);
    };
  }, [selectedChannel, setMessages]);

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
