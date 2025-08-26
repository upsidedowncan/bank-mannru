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
  // Joined from user_chat_settings
  sender_name?: string;
  pfp_icon?: string;
  pfp_color?: string;
}

export const useDirectMessages = (user: User | null) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

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

      // 3. For each conversation, fetch participants and last message
      const detailedConversations = await Promise.all(
        convos_data.map(async (convo) => {
          // Fetch participants and their profile info
          const { data: participants_data } = await supabase
            .from('conversation_participants')
            .select('user_id, user_chat_settings ( chat_name, pfp_icon, pfp_color )')
            .eq('conversation_id', convo.id);

          // Fetch last message
          const { data: last_message_data } = await supabase
            .from('direct_messages')
            .select('content')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const participants = participants_data?.map(p => ({
            user_id: p.user_id,
            // @ts-ignore
            user_name: p.user_chat_settings?.chat_name || 'User',
            // @ts-ignore
            pfp_icon: p.user_chat_settings?.pfp_icon || 'Person',
            // @ts-ignore
            pfp_color: p.user_chat_settings?.pfp_color || '#1976d2',
          })) || [];

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

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*, sender:user_chat_settings(chat_name, pfp_icon, pfp_color)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        ...msg,
        // @ts-ignore
        sender_name: msg.sender?.chat_name || 'User',
        // @ts-ignore
        pfp_icon: msg.sender?.pfp_icon || 'Person',
        // @ts-ignore
        pfp_color: msg.sender?.pfp_color || '#1976d2',
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (receiverId: string, content: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('create_conversation_and_send_message', {
        receiver_id: receiverId,
        message_content: content,
      });
      if (error) throw error;
      // After sending, refresh conversations to show the new last message
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      // Optionally, show a snackbar to the user
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation, fetchMessages]);

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

  return {
    conversations,
    messages,
    loading,
    selectedConversation,
    setSelectedConversation,
    sendMessage,
    fetchMessages,
    fetchConversations,
    searchUsers,
    searchResults,
    searching,
  };
};
