import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  CircularProgress,
  Chip,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { supabase } from '../../../config/supabase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { ChatMessage } from '../types';

interface ManGPTMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_user: boolean;
  created_at: string;
  is_answered: boolean;
  admin_response?: string;
  admin_responded_at?: string;
}

export const ManGPT: React.FC = () => {
  console.log('=== ManGPT component MOUNTING ===');
  const { user } = useAuthContext();
  console.log('ManGPT component rendering, user:', user);
  const theme = useTheme();
  const [messages, setMessages] = useState<ManGPTMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear messages when unmounting to prevent showing wrong user's messages
      setMessages([]);
    };
  }, []);

  // Debug loading state changes
  useEffect(() => {
    console.log('ManGPT loading state changed to:', loading);
  }, [loading]);

  // Load ManGPT conversation history
  useEffect(() => {
    console.log('ManGPT useEffect triggered, user:', user);
    if (user) {
      console.log('Loading ManGPT conversation for user:', user.id);
      // Only clear messages if we don't have any or if we're switching users
      if (messages.length === 0) {
        console.log('No existing messages, clearing and loading fresh');
        setMessages([]);
      } else {
        console.log('Already have messages, keeping them');
      }
      loadConversation();
      
      // Add timeout fallback to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('ManGPT loading timeout - forcing loading to false');
        setLoading(false);
      }, 10000); // 10 seconds timeout
      
      return () => clearTimeout(timeout);
    } else {
      console.log('No user found for ManGPT');
      // Clear messages when no user
      setMessages([]);
    }
  }, [user]);

  // Real-time subscription for admin responses
  useEffect(() => {
    if (!user) return;

    console.log('Setting up ManGPT real-time subscription for user:', user.id);

    const subscription = supabase
      .channel(`mangpt_user_${user.id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'mangpt_messages',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('ManGPT real-time update received:', payload);
          const updatedMessage = payload.new as ManGPTMessage;
          
          // Only process messages for the current user
          if (updatedMessage.user_id !== user.id) {
            console.log('Skipping update for different user:', updatedMessage.user_id);
            return;
          }
          
          console.log('Processing update for message:', updatedMessage.id);
          console.log('Has admin response:', !!updatedMessage.admin_response);
          console.log('Is answered:', updatedMessage.is_answered);
          
          // Update the message in our local state
          setMessages(prev => {
            // Safety check: don't clear messages if we have none
            if (prev.length === 0) {
              console.log('No previous messages to update, skipping');
              return prev;
            }
            
            // Only update if this message exists in our local state
            const existingMessage = prev.find(msg => msg.id === updatedMessage.id);
            if (!existingMessage) {
              console.log('Message not found in local state, skipping update:', updatedMessage.id);
              return prev;
            }
            
            const newMessages = prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            );
            console.log('Updated messages state:', newMessages);
            console.log('Previous count:', prev.length, 'New count:', newMessages.length);
            return newMessages;
          });
          
          // If this message got an admin response, remove any thinking messages
          if (updatedMessage.admin_response && updatedMessage.is_answered) {
            console.log('Admin response received, removing thinking messages');
            setMessages(prev => {
              // Safety check: don't clear messages if we have none
              if (prev.length === 0) {
                console.log('No previous messages to filter, skipping thinking removal');
                return prev;
              }
              
              const filteredMessages = prev.filter(msg => 
                !(msg.user_id === 'mangpt-bot' && msg.message === 'Думаю...')
              );
              console.log('Messages after removing thinking:', filteredMessages);
              console.log('Previous count:', prev.length, 'Filtered count:', filteredMessages.length);
              return filteredMessages;
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up ManGPT real-time subscription');
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Periodic check for admin responses (fallback for real-time updates)
  useEffect(() => {
    if (!user || messages.length === 0) return;

    // Check every 1 second if any messages have been updated by admin
    const interval = setInterval(async () => {
      try {
        const { data: updatedMessages, error } = await supabase
          .from('mangpt_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error checking for updates:', error);
          return;
        }

        // Check if any messages have admin responses that we don't have locally
        const hasNewAdminResponse = updatedMessages?.some(updatedMsg => {
          const localMsg = messages.find(msg => msg.id === updatedMsg.id);
          return localMsg && 
                 updatedMsg.admin_response && 
                 updatedMsg.is_answered && 
                 (!localMsg.admin_response || !localMsg.is_answered);
        });

        if (hasNewAdminResponse) {
          console.log('Found new admin response in periodic check, updating specific messages');
          
          // Update only the specific messages that have new admin responses
          setMessages(prev => {
            if (prev.length === 0) {
              console.log('No previous messages to update, skipping');
              return prev;
            }
            
            const updatedMessagesMap = new Map(updatedMessages?.map(msg => [msg.id, msg]) || []);
            const newMessages = prev.map(localMsg => {
              const updatedMsg = updatedMessagesMap.get(localMsg.id);
              if (updatedMsg && updatedMsg.admin_response && updatedMsg.is_answered) {
                console.log('Updating message with admin response:', localMsg.id);
                return updatedMsg;
              }
              return localMsg;
            });
            
            console.log('Updated specific messages, count unchanged:', newMessages.length);
            return newMessages;
          });
          
          // Remove thinking messages if any admin responses exist
          const hasAnyAdminResponse = updatedMessages?.some(msg => msg.admin_response && msg.is_answered);
          if (hasAnyAdminResponse) {
            console.log('Removing thinking messages in periodic check');
            setMessages(prev => {
              if (prev.length === 0) {
                console.log('No previous messages to filter in periodic check, skipping');
                return prev;
              }
              
              const filteredMessages = prev.filter(msg => 
                !(msg.user_id === 'mangpt-bot' && msg.message === '🤔 Thinking...')
              );
              console.log('Messages after removing thinking in periodic check:', filteredMessages);
              return filteredMessages;
            });
          }
        }
      } catch (error) {
        console.error('Error in periodic check:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    console.log('ManGPT messages changed:', messages);
    console.log('Messages count:', messages.length);
    console.log('Messages content:', messages.map(m => ({
      id: m.id,
      message: m.message.substring(0, 50),
      is_from_user: m.is_from_user,
      admin_response: !!m.admin_response,
      is_answered: m.is_answered
    })));
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    if (!user || isLoadingRef.current) return;
    
    // Don't reload if we already have messages and they're not stale
    if (messages.length > 0 && !loading) {
      console.log('Already have messages, skipping reload');
      return;
    }
    
    try {
      console.log('Starting to load ManGPT conversation...');
      console.log('Loading for user ID:', user.id);
      isLoadingRef.current = true;
      setLoading(true);
      
      // Load messages from the mangpt_messages table for the current user only
      const { data, error } = await supabase
        .from('mangpt_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      console.log('ManGPT query result:', { data, error });
      console.log('Query filter: user_id =', user.id);
      console.log('Messages found:', data?.length || 0);

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('Component unmounted, not updating state');
        return;
      }

      if (error) {
        console.error('Error loading ManGPT conversation:', error);
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }

      // Double-check that all messages belong to the current user
      const userMessages = data?.filter(msg => msg.user_id === user.id) || [];
      console.log('Filtered messages for current user:', userMessages.length);
      
      if (userMessages.length !== (data?.length || 0)) {
        console.warn('Some messages were filtered out - they belonged to different users');
      }

      console.log('Setting ManGPT messages:', userMessages);
      setMessages(userMessages);
      console.log('Messages set, setting loading to false');
      setLoading(false);
      isLoadingRef.current = false;
    } catch (error) {
      console.error('Error loading ManGPT conversation:', error);
      if (isMountedRef.current) {
        setLoading(false);
        isLoadingRef.current = false;
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user || sending) return;

    try {
      setSending(true);
      
      // Create optimistic message
      const optimisticMessage: ManGPTMessage = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        message: inputMessage.trim(),
        is_from_user: true,
        created_at: new Date().toISOString(),
        is_answered: false,
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setInputMessage('');

      // Send message to database
      const { data, error } = await supabase
        .from('mangpt_messages')
        .insert({
          user_id: user.id,
          message: inputMessage.trim(),
          is_from_user: true,
          is_answered: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        return;
      }

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === optimisticMessage.id ? data : msg
      ));

      // Show "thinking" indicator
      const thinkingMessage: ManGPTMessage = {
        id: `thinking-${Date.now()}`,
        user_id: 'mangpt-bot',
        message: '🤔 Thinking...',
        is_from_user: false,
        created_at: new Date().toISOString(),
        is_answered: false,
      };

      setMessages(prev => [...prev, thinkingMessage]);

      // Don't remove thinking message - let it stay until admin responds
      // The thinking message will be replaced when an admin responds

    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const refreshConversation = () => {
    console.log('Manually refreshing ManGPT conversation');
    loadConversation();
  };

  if (loading) {
    console.log('ManGPT is in loading state');
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Загрузка ManGPT...</Typography>
      </Box>
    );
  }

  console.log('ManGPT rendering main content, messages:', messages);

  // Find the latest user message that is not answered
  const latestUnansweredUserMessageId = (() => {
    const reversed = [...messages].reverse();
    const msg = reversed.find(m => m.is_from_user && !m.is_answered);
    return msg?.id;
  })();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          borderRadius: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.primary.main,
          color: 'white'
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <BotIcon />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold">
              ManGPT
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Искусственный интеллект
            </Typography>
          </Box>
          <Tooltip title="Обновить разговор">
            <IconButton 
              onClick={refreshConversation}
              sx={{ color: 'white' }}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Messages */}
      <Box flex={1} overflow="auto" sx={{ p: 2 }}>
        {messages.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            height="100%"
            textAlign="center"
            gap={2}
          >
            <BotIcon sx={{ fontSize: 64, color: theme.palette.primary.main, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary">
              Добро пожаловать в ManGPT!
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth={400}>
              Спрашивайте меня о чем угодно! Я ИИ-ассистент, который поможет вам с любыми вопросами. Я даже могу изменять данные ваших карт!
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ListItem 
                  sx={{ 
                    p: 0, 
                    mb: 2,
                    flexDirection: message.is_from_user ? 'row-reverse' : 'row',
                    alignItems: 'flex-start'
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 40 }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32,
                        bgcolor: message.is_from_user 
                          ? theme.palette.primary.main 
                          : theme.palette.secondary.main
                      }}
                    >
                      {message.is_from_user ? <PersonIcon /> : <BotIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <Box 
                    sx={{ 
                      maxWidth: '70%',
                      ml: message.is_from_user ? 0 : 1,
                      mr: message.is_from_user ? 1 : 0,
                    }}
                  >
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        backgroundColor: message.is_from_user 
                          ? theme.palette.primary.main 
                          : theme.palette.grey[100],
                        color: message.is_from_user ? 'white' : 'text.primary',
                        borderRadius: 2,
                        wordBreak: 'break-word',
                      }}
                    >
                      <Typography variant="body1">
                        {message.message}
                      </Typography>
                    </Paper>
                    
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block',
                        mt: 0.5,
                        textAlign: message.is_from_user ? 'right' : 'left'
                      }}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </ListItem>
                
                {/* Show admin response as a separate message if it exists */}
                {message.admin_response && message.is_answered && (
                  <ListItem sx={{ p: 0, mb: 2, flexDirection: 'row', alignItems: 'flex-start' }}>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.success.main }}>
                        <BotIcon />
                      </Avatar>
                    </ListItemAvatar>
                    
                    <Box sx={{ maxWidth: '70%', ml: 1 }}>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          backgroundColor: theme.palette.success.main,
                          color: 'white',
                          borderRadius: 2,
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="body1" sx={{ color: 'white' }}>
                          {message.admin_response}
                        </Typography>
                      </Paper>
                    </Box>
                  </ListItem>
                )}
                {index < messages.length - 1 && <Divider sx={{ my: 1 }} />}
              </React.Fragment>
            ))}
          </List>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          borderRadius: 0,
          borderTop: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Спросите ManGPT о чем угодно..."
            variant="outlined"
            size="small"
            disabled={sending}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={!inputMessage.trim() || sending}
            sx={{ minWidth: 56 }}
          >
            {sending ? <CircularProgress size={20} /> : <SendIcon />}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}; 