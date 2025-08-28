import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { User } from '@supabase/supabase-js';

// Define types for DM's, conversations etc.
// This will be expanded later.
export interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string;
  // We'll need to join to get participant info
  participants: { user_id: string; user_name: string; pfp_icon: string; pfp_color: string; }[];
  // And the last message content
  last_message_content?: string;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  message_type: 'text' | 'image' | 'video';
  media_url?: string;
  media_type?: string;
  reply_to?: string;
  // Joined from user_chat_settings
  sender_name?: string;
  pfp_icon?: string;
  pfp_color?: string;
  // Joined from other messages
  reply_to_message?: DirectMessage;
}

export const useDirectMessages = (user: User | null) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Get all conversation IDs for the current user
      const { data: participant_data, error: participant_error } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participant_error) throw participant_error;

      const conversationIds = participant_data.map(p => p.conversation_id);
      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // 2. Fetch details for these conversations, ordered by the most recent message
      const { data: convos_data, error: convos_error } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (convos_error) throw convos_error;

      // 3. Get all participants for these conversations
      const { data: all_participants_data, error: all_participants_error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      if (all_participants_error) throw all_participants_error;

      // 4. Get all unique user IDs from the participants
      const allUserIds = Array.from(new Set(all_participants_data.map(p => p.user_id)));

      // 5. Fetch all user chat settings for these users
      const { data: user_settings_data, error: user_settings_error } = await supabase
        .from('user_chat_settings')
        .select('user_id, chat_name, pfp_icon, pfp_color')
        .in('user_id', allUserIds);

      if (user_settings_error) throw user_settings_error;

      // Create a map for easy lookup
      const userSettingsMap = new Map(user_settings_data.map(s => [s.user_id, s]));

      // 6. Fetch the last message for each conversation (this is tricky without a loop)
      // For now, we will do it in a loop, but a better solution is a DB function.
      const detailedConversations = await Promise.all(
        convos_data.map(async (convo) => {
          const participants = all_participants_data
            .filter(p => p.conversation_id === convo.id)
            .map(p => {
              const settings = userSettingsMap.get(p.user_id);
              return {
                user_id: p.user_id,
                user_name: settings?.chat_name || 'User',
                pfp_icon: settings?.pfp_icon || 'Person',
                pfp_color: settings?.pfp_color || '#1976d2',
              };
            });

          const { data: last_message_data } = await supabase
            .from('direct_messages')
            .select('content')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...convo,
            participants,
            last_message_content: last_message_data?.content || 'No messages yet',
          };
        })
      );

      setConversations(detailedConversations);

    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    file?: File | null,
    replyToId?: string | null
  ) => {
    if (!user) return;

    try {
      // Step 1: Get or create the conversation
      const { data: conversationData, error: convoError } = await supabase.rpc('get_or_create_conversation', {
        receiver_id: receiverId,
      });
      if (convoError) throw convoError;
      const conversationId = conversationData;

      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let messageType: 'text' | 'image' | 'video' = 'text';

      // Step 2: If there's a file, upload it
      if (file) {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `media_${user.id}_${timestamp}.${fileExtension}`;
        const filePath = `dm-media/${conversationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, file, { cacheControl: '3600' });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(filePath);
        mediaUrl = urlData.publicUrl;
        mediaType = file.type;
        messageType = file.type.startsWith('image/') ? 'image' : 'video';
      }

      // Step 3: Insert the message record
      const { error: dbError } = await supabase.from('direct_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
        message_type: messageType,
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to: replyToId,
      });

      if (dbError) throw dbError;

      // Step 4: Refresh conversations to show the new message
      fetchConversations();

    } catch (error) {
      console.error('Error sending direct message:', error);
      // Consider showing a snackbar here
    }
  }, [user, fetchConversations]);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = useCallback(async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('user_chat_settings')
        .select('user_id, chat_name, pfp_icon, pfp_color')
        .ilike('chat_name', `%${searchTerm}%`)
        .neq('user_id', user?.id) // Exclude current user from results
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  }, [user]);

  const startDmWithUser = useCallback(async (receiverId: string) => {
    if (!user) return;
    try {
      const { data: conversationData, error } = await supabase.rpc('get_or_create_conversation', {
        receiver_id: receiverId,
      });

      if (error) throw error;

      // After creating, refresh the list and find the new conversation
      await fetchConversations();

      const newConvoId = conversationData;

      // After creating, refresh the list to get the new convo details
      await fetchConversations();

      // Find the new conversation in the updated list and select it
      // This is still not ideal because we're re-fetching the whole list,
      // but it ensures we have the full conversation object to select.
      const newConvo = conversations.find(c => c.id === newConvoId);
      return newConvo;

    } catch (error) {
      console.error("Error starting DM:", error);
      return null;
    }
  }, [user, fetchConversations, conversations]);

  return {
    conversations,
    loading,
    sendMessage,
    fetchConversations,
    searchUsers,
    searchResults,
    searching,
    startDmWithUser,
  };
};
