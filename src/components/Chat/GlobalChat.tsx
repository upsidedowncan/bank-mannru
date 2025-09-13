import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Container,
  IconButton,
  Avatar,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Badge,
  Drawer,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  Chat as ChatIcon,
  Store as StoreIcon,
  SportsEsports as GamingIcon,
  Help as HelpIcon,
  Forum as ForumIcon,
  Announcement as AnnouncementIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  PushPin as PinIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Person,
  Face,
  AccountCircle,
  School,
  Work,
  Home,
  ChildCare,
  Favorite,
  Star,
  Diamond,
  AdminPanelSettings as AdminIcon,
  Reply as ReplyIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AttachFile as AttachFileIcon,
  AddPhotoAlternate as AddPhotoIcon,
  CardGiftcard as GiftIcon,
  MonetizationOn as MoneyIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

interface ChatChannel {
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

interface ChatMessage {
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

interface UserChatSettings {
  user_id: string;
  chat_name: string;
  pfp_color: string;
  pfp_icon: string;
}

const iconMapping: { [key: string]: React.ComponentType } = {
  Chat: ChatIcon,
  Store: StoreIcon,
  SportsEsports: GamingIcon,
  Help: HelpIcon,
  Forum: ForumIcon,
  Announcement: AnnouncementIcon,
};

const profileIconMapping: { [key: string]: React.ComponentType } = {
  Person,
  Face,
  AccountCircle,
  SportsEsports: GamingIcon,
  School,
  Work,
  Home,
  ChildCare,
  Favorite,
  Star,
  Diamond,
};



export const GlobalChat: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Core state
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const MAX_MESSAGES = 100; // Limit to prevent performance issues
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userSettings, setUserSettings] = useState<UserChatSettings | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Message editing state
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<ChatMessage | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [audioDurations, setAudioDurations] = useState<{ [key: string]: number }>({});
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const [isAdmin, setIsAdmin] = useState(false);

  // Gift claiming state
  const [claimedGifts, setClaimedGifts] = useState<Set<string>>(new Set());
  const [claimingGift, setClaimingGift] = useState<string | null>(null);
  
  // Card selection dialog state
  const [cardSelectionDialog, setCardSelectionDialog] = useState<{
    open: boolean;
    messageId: string | null;
    amount: number;
  }>({
    open: false,
    messageId: null,
    amount: 0
  });
  const [userCards, setUserCards] = useState<Array<{
    id: string;
    card_name: string;
    card_number: string;
    balance: number;
    currency: string;
  }>>([]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const newMessageRef = useRef<string>('');

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Admin checking function
  const isUserAdmin = useCallback(async () => {
    if (!user) return false;
    
    // Check if user has admin flag in metadata
    return !!user.user_metadata?.isAdmin;
  }, [user]);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [user, isUserAdmin]);

  // Initialize user chat settings
  useEffect(() => {
    const initializeUserSettings = async () => {
      if (!user) return;
      
      try {
        // Check if user has chat settings
        const { data: existingSettings } = await supabase
          .from('user_chat_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (existingSettings) {
          setUserSettings(existingSettings);
        } else {
          // Create default settings
          const defaultSettings = {
              user_id: user.id,
            chat_name: user.user_metadata?.first_name || 'User',
            pfp_color: '#1976d2',
            pfp_icon: 'Person',
          };

          const { data: newSettings } = await supabase
                    .from('user_chat_settings')
            .insert(defaultSettings)
            .select()
                    .single();
                  
          if (newSettings) {
            setUserSettings(newSettings);
          }
        }
      } catch (error) {
        console.error('Error initializing user settings:', error);
      }
    };

    initializeUserSettings();
  }, [user]);

  // Fetch channels function
  const fetchChannels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
      
        // Auto-select first channel if none selected
      if (data && data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      setSnackbar({ open: true, message: 'Ошибка при загрузке каналов', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedChannel]);

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Fetch messages for selected channel
  useEffect(() => {
    if (!selectedChannel) return;
    
    const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
          .eq('channel_id', selectedChannel.id)
        .order('created_at', { ascending: true })
          .limit(50);

      if (error) throw error;

        // Get unique user IDs
      const userIds = Array.from(new Set(data?.map(msg => msg.user_id) || []));
      
        // Fetch user settings for all users
        const { data: userSettingsData } = await supabase
        .from('user_chat_settings')
        .select('user_id, chat_name, pfp_color, pfp_icon')
        .in('user_id', userIds);

        // Create settings map
        const settingsMap = new Map();
        userSettingsData?.forEach(setting => {
          settingsMap.set(setting.user_id, setting);
        });

        // Add user data to messages and fetch reply data
        const messagesWithUserData = await Promise.all(
          data?.map(async (msg) => {
            const userSetting = settingsMap.get(msg.user_id);
            
            // Fetch reply message if this message is a reply
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
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setSnackbar({ open: true, message: 'Ошибка при загрузке сообщений', severity: 'error' });
      }
    };

    fetchMessages();
  }, [selectedChannel]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedChannel) return;

    const subscription = supabase
        .channel(`chat_messages_${selectedChannel.id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedChannel.id}` },
          async (payload) => {
            const newMessage = payload.new as ChatMessage;
            
          // Fetch user settings for the new message
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
            // Keep only the last MAX_MESSAGES messages
            return newMessages.slice(-MAX_MESSAGES);
          });
          scrollToBottomDebounced();
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

  // Cleanup old messages periodically to prevent performance issues
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setMessages(prev => {
        if (prev.length > MAX_MESSAGES) {
          console.log(`Cleaning up messages: ${prev.length} -> ${MAX_MESSAGES}`);
          return prev.slice(-MAX_MESSAGES);
        }
        return prev;
      });
    }, 30000); // Clean up every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Utility functions
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Debounced scroll to prevent excessive scrolling
  const debouncedScrollToBottom = useRef<NodeJS.Timeout | null>(null);
  const scrollToBottomDebounced = useCallback(() => {
    if (debouncedScrollToBottom.current) {
      clearTimeout(debouncedScrollToBottom.current);
    }
    debouncedScrollToBottom.current = setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getChannelIcon = useCallback((iconName: string) => {
    const IconComponent = iconMapping[iconName] || ChatIcon;
    return <IconComponent />;
  }, []);

  const getProfileIcon = useCallback((iconName: string) => {
    const IconComponent = profileIconMapping[iconName] || Person;
    return <IconComponent />;
  }, []);

    // Admin command functions
  const handleAdminCommand = async (command: string) => {
    if (!user || !selectedChannel) return;

    // Check if user is admin
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      showSnackbar('Только администраторы могут использовать команды', 'error');
      return;
    }

    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case '/lock':
          await supabase
            .from('chat_channels')
            .update({ admin_only: true })
            .eq('id', selectedChannel.id);
          showSnackbar('Канал заблокирован для администраторов', 'success');
          // Refresh channels to update UI
          await fetchChannels();
          break;

        case '/unlock':
          await supabase
            .from('chat_channels')
            .update({ admin_only: false })
            .eq('id', selectedChannel.id);
          showSnackbar('Канал разблокирован для всех пользователей', 'success');
          // Refresh channels to update UI
          await fetchChannels();
          break;

        case '/pin':
          await supabase
            .from('chat_channels')
            .update({ is_pinned: true })
            .eq('id', selectedChannel.id);
          showSnackbar('Канал закреплен', 'success');
          await fetchChannels();
          break;

        case '/unpin':
          await supabase
            .from('chat_channels')
            .update({ is_pinned: false })
            .eq('id', selectedChannel.id);
          showSnackbar('Канал откреплен', 'success');
          await fetchChannels();
          break;

        case '/announce':
          if (args.length === 0) {
            showSnackbar('Использование: /announce <текст>', 'error');
            return;
          }
          const announcementText = args.join(' ');
          await supabase
            .from('chat_messages')
            .insert({
              channel_id: selectedChannel.id,
              user_id: user.id,
              message: announcementText,
              message_type: 'announcement',
            });
          showSnackbar('Объявление отправлено', 'success');
          break;

        case '/clear':
          await supabase
            .from('chat_messages')
            .delete()
            .eq('channel_id', selectedChannel.id);
          showSnackbar('Все сообщения в канале удалены', 'success');
          break;

        case '/html':
          if (args.length === 0) {
            showSnackbar('Использование: /html <HTML код>', 'error');
            return;
          }
          const htmlCode = args.join(' ');
          const sanitizedHTML = sanitizeHTML(htmlCode);
          await supabase
            .from('chat_messages')
            .insert({
              channel_id: selectedChannel.id,
              user_id: user.id,
              message: sanitizedHTML,
              message_type: 'html',
            });
          showSnackbar('HTML сообщение отправлено', 'success');
          break;

        case '/gift':
          if (args.length === 0) {
            showSnackbar('Использование: /gift <количество монет>', 'error');
            return;
          }
          const giftAmount = parseInt(args[0]);
          if (isNaN(giftAmount) || giftAmount <= 0) {
            showSnackbar('Укажите корректное количество монет', 'error');
            return;
          }
          await sendMoneyGift(giftAmount);
          break;

        case '/help':
          showSnackbar('Доступные команды: /lock, /unlock, /pin, /unpin, /announce, /clear, /html, /gift, /help', 'success');
          break;

        default:
          showSnackbar(`Неизвестная команда: ${cmd}. Используйте /help для списка команд`, 'error');
          return;
      }

      // Clear the input after successful command
      setNewMessage('');
      newMessageRef.current = '';
      setReplyingTo(null);
            } catch (error) {
      console.error('Error executing admin command:', error);
      showSnackbar('Ошибка при выполнении команды', 'error');
    }
  };

  // Message functions
  const sendMessage = useCallback(async () => {
    const messageText = newMessageRef.current.trim();
    if (!user || !selectedChannel || !messageText) return;

    // Prevent sending if already sending
    if (sending) {
      console.log('Already sending message, ignoring');
      return;
    }

    // Check for admin commands
    if (messageText.startsWith('/')) {
      await handleAdminCommand(messageText);
      return;
    }

    // Check admin-only restriction
    if (selectedChannel.admin_only) {
      const isAdmin = await isUserAdmin();
      if (!isAdmin) {
        showSnackbar('Только администраторы могут отправлять сообщения в этот канал', 'error');
        return;
      }
    }

    console.log('Sending message:', { messageText, timestamp: Date.now() });

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          message: messageText,
          message_type: 'text',
          reply_to: replyingTo?.id || null,
        });

      if (error) throw error;

      console.log('Message sent successfully:', { messageText, timestamp: Date.now() });
      
      // Clear both state and ref
      setNewMessage('');
      newMessageRef.current = '';
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Ошибка при отправке сообщения', 'error');
    } finally {
      setSending(false);
    }
  }, [user, selectedChannel, showSnackbar, sending, isUserAdmin]);

  const editMessage = async (messageId: string) => {
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          message: editText.trim(),
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setEditingMessage(null);
      setEditText('');
      showSnackbar('Сообщение отредактировано', 'success');
    } catch (error) {
      console.error('Error editing message:', error);
      showSnackbar('Ошибка при редактировании сообщения', 'error');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user?.id);

      if (error) throw error;
      showSnackbar('Сообщение удалено', 'success');
    } catch (error) {
      console.error('Error deleting message:', error);
      showSnackbar('Ошибка при удалении сообщения', 'error');
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log('MediaRecorder onstop fired, chunks:', chunks.length, 'total size:', chunks.reduce((sum, chunk) => sum + chunk.size, 0));
        
        if (chunks.length === 0) {
          console.error('No audio chunks available');
          showSnackbar('Ошибка: нет аудиоданных', 'error');
          return;
        }
        
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('Created audio blob:', { size: blob.size, type: blob.type });
        
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // Auto-send voice message after blob is created
        setTimeout(() => {
          console.log('About to send voice message, audioBlob state:', !!blob);
          sendVoiceMessage(blob);
        }, 100);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
      showSnackbar('Ошибка при записи голоса', 'error');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && isRecording && !isPaused) {
      mediaRecorder.pause();
      setIsPaused(true);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && isRecording && isPaused) {
      mediaRecorder.resume();
      setIsPaused(false);
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  };

  const sendVoiceMessage = async (blobToSend?: Blob) => {
    const audioData = blobToSend || audioBlob;
    
    console.log('sendVoiceMessage called, current state:', {
      stateAudioBlob: audioBlob ? { size: audioBlob.size, type: audioBlob.type } : null,
      passedBlob: blobToSend ? { size: blobToSend.size, type: blobToSend.type } : null,
      user: !!user,
      selectedChannel: !!selectedChannel
    });
    
    if (!audioData || !user || !selectedChannel) {
      console.warn('Missing required data for voice message:', { 
        hasAudioBlob: !!audioData, 
        hasUser: !!user, 
        hasChannel: !!selectedChannel 
      });
      return;
    }

    // Check admin-only restriction for voice messages
    if (selectedChannel.admin_only) {
      const isAdmin = await isUserAdmin();
      if (!isAdmin) {
        showSnackbar('Только администраторы могут отправлять голосовые сообщения в этот канал', 'error');
        return;
      }
    }

    // Validate audio blob size
    if (audioData.size === 0) {
      console.warn('Audio blob is empty');
      showSnackbar('Ошибка: пустая аудиозапись', 'error');
      return;
    }

    setSending(true);
    try {
      const timestamp = Date.now();
      const filename = `voice_${user.id}_${timestamp}.webm`;
      const filePath = `voice-messages/${selectedChannel.id}/${filename}`;

      console.log('Uploading voice message:', { filename, size: audioData.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(filePath, audioData, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('chat-audio')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          message: '[Голосовое сообщение]',
          message_type: 'voice',
          audio_url: urlData.publicUrl,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Voice message sent successfully');
      setAudioBlob(null);
      showSnackbar('Голосовое сообщение отправлено', 'success');
    } catch (error) {
      console.error('Error sending voice message:', error);
      showSnackbar('Ошибка при отправке голосового сообщения', 'error');
    } finally {
      setSending(false);
    }
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    if (isPlaying === messageId) {
      // Stop current audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setIsPlaying(null);
      setCurrentAudio(null);
      setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
    } else {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Play new audio
    const audio = new Audio(audioUrl);
      
      // Preload audio to get metadata
      audio.preload = 'metadata';
      
      // Set up duration tracking
      audio.onloadedmetadata = () => {
        console.log('Audio metadata loaded:', { messageId, duration: audio.duration });
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDurations(prev => ({ ...prev, [messageId]: audio.duration }));
        } else {
          console.warn('Invalid audio duration:', audio.duration);
          // Try to get duration after a short delay
          setTimeout(() => {
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
              setAudioDurations(prev => ({ ...prev, [messageId]: audio.duration }));
            }
          }, 100);
        }
      };
      
      // Set up progress tracking
      audio.ontimeupdate = () => {
        setAudioProgress(prev => ({ ...prev, [messageId]: audio.currentTime }));
      };
      
      audio.onended = () => {
      setIsPlaying(null);
        setCurrentAudio(null);
        setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
      };
      
      audio.onerror = () => {
      showSnackbar('Ошибка при воспроизведении', 'error');
        setIsPlaying(null);
        setCurrentAudio(null);
        setAudioProgress(prev => ({ ...prev, [messageId]: 0 }));
    };
      
    audio.play();
      setIsPlaying(messageId);
      setCurrentAudio(audio);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Safe HTML processing function
  const sanitizeHTML = (html: string) => {
    // Remove potentially dangerous tags and attributes
    const allowedTags = ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img'];
    const allowedAttributes = ['href', 'src', 'alt', 'title', 'style', 'class', 'id'];
    
    // Basic sanitization - remove script tags and dangerous attributes
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');
    
    return sanitized;
  };

  // Gift functions
  const sendMoneyGift = async (amount: number) => {
    if (!user || !selectedChannel) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          message: `Подарок на ${amount} МР`,
          message_type: 'money_gift',
          gift_amount: amount,
        });

      if (error) throw error;
      showSnackbar(`Подарок на ${amount} МР отправлен!`, 'success');
    } catch (error) {
      console.error('Error sending money gift:', error);
      showSnackbar('Ошибка при отправке подарка', 'error');
    }
  };

  const fetchUserCards = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching cards for user:', user.id);
      
      const { data, error } = await supabase
        .from('bank_cards')
        .select('id, card_name, card_number, balance, currency')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Found cards:', data);
      setUserCards(data || []);
    } catch (error) {
      console.error('Error fetching user cards:', error);
      showSnackbar('Ошибка при загрузке карт', 'error');
    }
  };

  const openCardSelectionDialog = async (messageId: string, amount: number) => {
    if (!user) return;

    // Check if already claimed
    if (claimedGifts.has(messageId)) {
      showSnackbar('Вы уже получили этот подарок', 'error');
      return;
    }

    // Fetch user cards
    await fetchUserCards();
    
    // Get the latest cards data (including inactive for debugging)
    const { data: cardsData, error: cardsError } = await supabase
      .from('bank_cards')
      .select('id, card_name, card_number, balance, currency, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (cardsError) {
      console.error('Error fetching cards for dialog:', cardsError);
      showSnackbar('Ошибка при загрузке карт', 'error');
      return;
    }

    console.log('All cards for user:', cardsData);

    // Filter active cards
    const activeCards = cardsData?.filter(card => card.is_active) || [];
    console.log('Active cards:', activeCards);

    // Check if user has any cards
    if (!activeCards || activeCards.length === 0) {
      console.log('No active cards found for user:', user.id);
      showSnackbar('У вас нет активных карт для получения подарка', 'error');
      return;
    }

    // Update user cards state with active cards only
    setUserCards(activeCards);

    setCardSelectionDialog({
      open: true,
      messageId,
      amount
    });
  };

  const claimMoneyGift = async (messageId: string, amount: number, cardId: string) => {
    if (!user) return;

    setClaimingGift(messageId);
    try {
      // Update the message to mark it as claimed
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({
          gift_claimed_by: user.id,
          gift_claimed_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .is('gift_claimed_by', null); // Only update if not already claimed

      if (updateError) throw updateError;

      // Update the card balance
      const { error: balanceError } = await supabase
        .from('bank_cards')
        .update({
          balance: supabase.rpc('add_balance', { card_id: cardId, amount: amount })
        })
        .eq('id', cardId);

      if (balanceError) {
        // If RPC doesn't exist, use simple addition
        const selectedCard = userCards.find(card => card.id === cardId);
        if (selectedCard) {
          const { error: simpleUpdateError } = await supabase
            .from('bank_cards')
            .update({
              balance: selectedCard.balance + amount
            })
            .eq('id', cardId);

          if (simpleUpdateError) throw simpleUpdateError;
        }
      }

      showSnackbar(`Получено ${amount} МР на карту!`, 'success');
      
      // Add to claimed gifts set
      setClaimedGifts(prev => new Set(prev).add(messageId));
      
      // Close dialog
      setCardSelectionDialog({ open: false, messageId: null, amount: 0 });
      
      // Refresh messages to show updated claim status
      if (selectedChannel) {
        const { data: messagesData } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', selectedChannel.id)
          .order('created_at', { ascending: true })
          .limit(50);
        
        if (messagesData) {
          setMessages(messagesData);
        }
      }
    } catch (error) {
      console.error('Error claiming gift:', error);
      showSnackbar('Ошибка при получении подарка', 'error');
    } finally {
      setClaimingGift(null);
    }
  };

  // Event handlers
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    newMessageRef.current = value;
  }, []);

  const handleMessageMenuOpen = (event: React.MouseEvent<HTMLElement>, message: ChatMessage) => {
    setMessageMenuAnchor(event.currentTarget);
    setSelectedMessageForMenu(message);
  };

  const handleMessageMenuClose = () => {
    setMessageMenuAnchor(null);
    setSelectedMessageForMenu(null);
  };

  const handleEditFromMenu = () => {
    if (selectedMessageForMenu) {
      setEditingMessage(selectedMessageForMenu.id);
      setEditText(selectedMessageForMenu.message);
    handleMessageMenuClose();
    }
  };

  const handleDeleteFromMenu = () => {
    if (selectedMessageForMenu) {
      deleteMessage(selectedMessageForMenu.id);
    handleMessageMenuClose();
    }
  };

  const handleReplyFromMenu = () => {
    if (selectedMessageForMenu) {
      setReplyingTo(selectedMessageForMenu);
    handleMessageMenuClose();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Media functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      showSnackbar('Файл слишком большой. Максимальный размер: 50MB', 'error');
      return;
    }

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      showSnackbar('Поддерживаются только изображения и видео', 'error');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelMedia = () => {
    setSelectedFile(null);
    setMediaPreview(null);
  };

  const sendMediaMessage = async () => {
    if (!selectedFile || !user || !selectedChannel) return;

    // Check admin-only restriction
    if (selectedChannel.admin_only) {
      const isAdmin = await isUserAdmin();
      if (!isAdmin) {
        showSnackbar('Только администраторы могут отправлять медиа в этот канал', 'error');
        return;
      }
    }

    setUploadingMedia(true);
    try {
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `media_${user.id}_${timestamp}.${fileExtension}`;
      const filePath = `chat-media/${selectedChannel.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // Determine message type
      const messageType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
      
      console.log('Sending media message:', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        messageType: messageType,
        mediaUrl: urlData.publicUrl
      });

      // Insert message
      const { error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          message: '', // Empty message for media files
          message_type: messageType,
          media_url: urlData.publicUrl,
          media_type: selectedFile.type,
          reply_to: replyingTo?.id || null,
        });

      if (dbError) throw dbError;

      showSnackbar('Медиа отправлено!', 'success');
      
      // Clear media state
      setSelectedFile(null);
      setMediaPreview(null);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending media:', error);
      
      // More detailed error handling
      if (error && typeof error === 'object' && 'message' in error) {
        console.error('Error details:', {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint
        });
        
        if ((error as any).code === '23514') {
          showSnackbar('Ошибка: неподдерживаемый тип сообщения. Обратитесь к администратору.', 'error');
        } else {
          showSnackbar(`Ошибка при отправке медиа: ${error.message}`, 'error');
        }
      } else {
        showSnackbar('Ошибка при отправке медиа', 'error');
      }
    } finally {
      setUploadingMedia(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
      if (currentAudio) {
        currentAudio.pause();
      }
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
      if (debouncedScrollToBottom.current) {
        clearTimeout(debouncedScrollToBottom.current);
      }
    };
  }, [recordingInterval, currentAudio, mediaRecorder, isRecording]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={2}>
          {isMobile && (
            <IconButton onClick={() => setMobileDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6">Глобальный чат</Typography>
        </Box>
      </Box>

            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Channels Sidebar */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            sx={{
              width: '100%',
              '& .MuiDrawer-paper': {
                width: '100%',
                boxSizing: 'border-box',
              },
            }}
          >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Каналы</Typography>
        <IconButton onClick={() => setMobileDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
            <List sx={{ 
              flex: 1, 
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                display: 'none'
              },
        scrollbarWidth: 'none',
              msOverflowStyle: 'none'
      }}>
          {channels.map((channel) => (
            <ListItem key={channel.id} disablePadding>
              <ListItemButton
                selected={selectedChannel?.id === channel.id}
                    onClick={() => {
                      setSelectedChannel(channel);
                      setMobileDrawerOpen(false);
                    }}
              >
                <ListItemIcon>
                  {getChannelIcon(channel.icon)}
                </ListItemIcon>
                <ListItemText 
                      primary={channel.name}
                  secondary={channel.description}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {channel.is_pinned && <PinIcon fontSize="small" />}
                      {channel.admin_only && <AdminIcon fontSize="small" color="error" />}
                    </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
          </Drawer>
        ) : (
          /* Desktop: Regular sidebar instead of drawer */
          <Box sx={{ 
            width: 240, 
            flexShrink: 0, 
            borderRight: 1, 
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Каналы</Typography>
      </Box>
            <List sx={{ 
              flex: 1, 
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              {channels.map((channel) => (
                <ListItem key={channel.id} disablePadding>
                  <ListItemButton
                    selected={selectedChannel?.id === channel.id}
                    onClick={() => {
                      setSelectedChannel(channel);
                    }}
                  >
                    <ListItemIcon>
                      {getChannelIcon(channel.icon)}
                    </ListItemIcon>
                    <ListItemText 
                      primary={channel.name}
                  secondary={channel.description}
                />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {channel.is_pinned && <PinIcon fontSize="small" />}
                      {channel.admin_only && <AdminIcon fontSize="small" color="error" />}
    </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
        )}

                {/* Chat Area */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
        }}>
      {selectedChannel ? (
        <>


                {/* Messages */}
          <Box 
            ref={chatContainerRef}
            sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              p: isMobile ? 0.5 : 2,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 0.5 : 1,
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {messages.map((message) => (
              <Box 
                key={message.id} 
                sx={{ 
                  display: 'flex', 
                      gap: isMobile ? 0.5 : 1, 
                  alignItems: 'flex-start',
                  cursor: user?.id === message.user_id ? 'pointer' : 'default',
                  '&:hover': user?.id === message.user_id ? {
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                        p: 0.5,
                        m: -0.5,
                  } : {}
                }}
                onClick={user?.id === message.user_id ? (e) => handleMessageMenuOpen(e, message) : undefined}
              >
                <Avatar 
                  sx={{ 
                        width: isMobile ? 28 : 32, 
                        height: isMobile ? 28 : 32, 
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                    bgcolor: message.pfp_color || '#1976d2'
                  }}
                >
                  {message.pfp_icon ? (
                        React.cloneElement(getProfileIcon(message.pfp_icon), {
                        sx: { fontSize: '1.2rem', color: 'white', opacity: 0.7 }
                        })
                  ) : (
                    message.user_name?.charAt(0) || 'U'
                  )}
                </Avatar>
                    
                <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={isMobile ? 0.25 : 0.5} flexWrap="wrap">
                        <Typography variant={isMobile ? "body2" : "subtitle2"} sx={{ fontWeight: 'bold' }}>
                      {message.user_name}
                    </Typography>
                        <Typography variant="caption" color="text.secondary">
                      {formatTime(message.created_at)}
                    </Typography>
                    {message.is_edited && (
                          <Typography variant="caption" color="text.secondary">
                        (ред.)
                      </Typography>
                    )}
                  </Box>
                  
                  {/* Reply Context */}
                  {message.reply_to_message && (
                    <Box sx={{ 
                      mb: 0.5, 
                      p: 0.5, 
                      bgcolor: 'action.hover', 
                      borderRadius: 0.5, 
                      borderLeft: 2, 
                      borderColor: 'primary.main',
                      maxWidth: '100%'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                        <ReplyIcon fontSize="small" color="primary" />
                        <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                          {message.reply_to_message.user_name}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {message.reply_to_message.message.length > 100 
                          ? message.reply_to_message.message.substring(0, 100) + '...' 
                          : message.reply_to_message.message}
                      </Typography>
                    </Box>
                  )}
                  
                  {editingMessage === message.id ? (
                    <Box display="flex" gap={1} alignItems="center">
                      <TextField
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        size="small"
                        fullWidth
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            editMessage(message.id);
                          }
                        }}
                      />
                      <IconButton size="small" onClick={() => editMessage(message.id)}>
                        <SendIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => setEditingMessage(null)}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  ) : message.message_type === 'voice' ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      border: 1,
                      borderColor: 'divider',
                      minWidth: isMobile ? 200 : 250,
                      maxWidth: isMobile ? 280 : 350
                    }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          message.audio_url && playAudio(message.audio_url, message.id);
                        }}
                        sx={{ 
                          bgcolor: isPlaying === message.id ? 'error.main' : 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: isPlaying === message.id ? 'error.dark' : 'primary.dark'
                          }
                        }}
                      >
                        {isPlaying === message.id ? <StopIcon /> : <PlayIcon />}
                      </IconButton>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatAudioTime(audioProgress[message.id] || 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {audioDurations[message.id] && isFinite(audioDurations[message.id]) 
                              ? formatAudioTime(audioDurations[message.id]) 
                              : '--:--'
                            }
                          </Typography>
                        </Box>
                        
                        <Box sx={{ position: 'relative', height: 4, bgcolor: 'action.disabled', borderRadius: 2 }}>
                          <Box 
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              height: '100%',
                              bgcolor: 'primary.main',
                              borderRadius: 2,
                              width: audioDurations[message.id] && isFinite(audioDurations[message.id])
                                ? `${Math.min((audioProgress[message.id] || 0) / audioDurations[message.id] * 100, 100)}%`
                                : '0%',
                              transition: 'width 0.1s ease'
                            }}
                          />
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MicIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          Голос
                      </Typography>
                    </Box>
                    </Box>
                  ) : message.message_type === 'image' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {message.message && (
                        <Typography variant="body1">
                          {message.message}
                        </Typography>
                      )}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-start',
                        maxWidth: '100%'
                      }}>
                        <Box
                          component="img"
                          src={message.media_url}
                          alt={message.message}
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            borderRadius: 1,
                            cursor: 'pointer',
                            display: 'block',
                            '&:hover': {
                              opacity: 0.8,
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(message.media_url, '_blank');
                          }}
                        />
                      </Box>
                    </Box>
                  ) : message.message_type === 'video' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {message.message && (
                        <Typography variant="body1">
                          {message.message}
                        </Typography>
                      )}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-start',
                        maxWidth: '100%'
                      }}>
                        <Box
                          component="video"
                          src={message.media_url}
                          controls
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 300,
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            borderRadius: 1,
                            display: 'block',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Box>
                    </Box>
                  ) : message.message_type === 'html' ? (
                    <Box 
                      sx={{ 
                        '& *': { 
                          maxWidth: '100%',
                          wordBreak: 'break-word'
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: message.message }}
                    />
                  ) : message.message_type === 'money_gift' ? (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 1,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'primary.main',
                      maxWidth: 300
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <GiftIcon color="primary" />
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                          Денежный подарок
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <MoneyIcon color="success" />
                        <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
                          {message.gift_amount} МР
                        </Typography>
                      </Box>
                      
                      {message.gift_claimed_by ? (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'action.disabled'
                        }}>
                          <Typography variant="body2" color="text.secondary">
                            Получено пользователем
                          </Typography>
                        </Box>
                      ) : (
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<GiftIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCardSelectionDialog(message.id, message.gift_amount || 0);
                          }}
                          disabled={claimingGift === message.id}
                          sx={{ 
                            alignSelf: 'flex-start',
                            minWidth: 120
                          }}
                        >
                          {claimingGift === message.id ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            'Получить'
                          )}
                        </Button>
                      )}
                    </Box>
                  ) : (
                        <Typography variant="body1">
                      {message.message}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>

              {/* Message Input */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
            {isRecording ? (
                  <Box display="flex" alignItems="center" gap={2} flexDirection={isMobile ? 'column' : 'row'}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    bgcolor: 'red', 
                    animation: 'pulse 1s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 },
                    },
                  }} />
                  <Typography variant="body2" color="text.secondary">
                    {formatRecordingTime(recordingTime)}
                  </Typography>
                </Box>
                
                    {/* Waveform */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, maxWidth: isMobile ? '100%' : 'auto' }}>
                      {[8, 12, 15, 10, 18, 14, 9, 16, 11, 13, 7, 17, 12, 15, 10].map((height, i) => (
                    <Box
                      key={i}
                      sx={{
                            width: isMobile ? 1 : 2,
                            height: isMobile ? height * 0.7 : height,
                            bgcolor: isPaused ? 'text.disabled' : 'error.main',
                        borderRadius: 1,
                            animation: isPaused ? 'none' : 'waveform 0.8s ease-in-out infinite',
                        animationDelay: `${i * 0.06}s`,
                            '@keyframes waveform': {
                              '0%, 100%': { height: isMobile ? height * 0.7 : height },
                              '50%': { height: isMobile ? (height * 0.7) + 2 : height + 4 },
                            },
                      }}
                    />
                  ))}
                </Box>
                
                    <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
                      <Button
                        variant="contained"
                        color={isPaused ? "primary" : "secondary"}
                        onClick={isPaused ? resumeRecording : pauseRecording}
                        startIcon={isPaused ? <PlayIcon /> : <PauseIcon />}
                        size={isMobile ? 'small' : 'medium'}
                      >
                        {isPaused ? "Возобновить" : "Пауза"}
                      </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={stopRecording}
                  startIcon={<StopIcon />}
                        size={isMobile ? 'small' : 'medium'}
                >
                  Остановить
                </Button>
                    </Box>
              </Box>
            ) : (
              <>
                {/* Reply Indicator */}
                {replyingTo && (
                  <Box sx={{ 
                    p: 1, 
                    mb: 1, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1, 
                    border: 1, 
                    borderColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <ReplyIcon fontSize="small" color="primary" />
                      <Typography variant="body2" color="primary">
                        Ответ на сообщение от {replyingTo.user_name}:
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {replyingTo.message.length > 50 ? replyingTo.message.substring(0, 50) + '...' : replyingTo.message}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={handleCancelReply}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                {/* Media Preview */}
                {mediaPreview && selectedFile && (
                  <Box sx={{ 
                    p: 1, 
                    mb: 1, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1, 
                    border: 1, 
                    borderColor: 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon fontSize="small" color="secondary" />
                      ) : (
                        <VideoIcon fontSize="small" color="secondary" />
                      )}
                      <Typography variant="body2" color="secondary">
                        {selectedFile.name}
                      </Typography>
                      {selectedFile.type.startsWith('image/') && (
                        <Box
                          component="img"
                          src={mediaPreview}
                          sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 1, 
                            objectFit: 'cover' 
                          }}
                        />
                      )}
                    </Box>
                    <IconButton size="small" onClick={handleCancelMedia}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                <Box display="flex" gap={1} alignItems="flex-end">
                <TextField
                  fullWidth
                  placeholder={selectedChannel?.admin_only && !isAdmin ? "Только администраторы могут отправлять сообщения" : "Введите сообщение..."}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  multiline
                  maxRows={isMobile ? 2 : 3}
                  disabled={sending || (selectedChannel?.admin_only && !isAdmin)}
                  size={isMobile ? 'small' : 'medium'}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        component="label"
                        htmlFor="media-upload"
                        disabled={sending || uploadingMedia || (selectedChannel?.admin_only && !isAdmin)}
                        size="small"
                        sx={{ 
                          color: 'action.active',
                          '&:hover': { 
                            color: 'primary.main',
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <AddPhotoIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
                <Box display="flex" gap={0.5} flexShrink={0}>
                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="media-upload"
                  />
                  
                <Button
                  variant="contained"
                  onClick={startRecording}
                    disabled={sending || uploadingMedia || (selectedChannel?.admin_only && !isAdmin)}
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    minWidth: 'auto',
                        width: isMobile ? '40px' : '56px',
                        height: isMobile ? '40px' : '56px',
                    borderRadius: '50%',
                    px: 0,
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                      <MicIcon fontSize={isMobile ? 'small' : 'medium'} />
                </Button>
                <Button
                  variant="contained"
                  onClick={selectedFile ? sendMediaMessage : sendMessage}
                  disabled={
                    (selectedFile ? false : !newMessage.trim()) || 
                    sending || 
                    uploadingMedia || 
                    (selectedChannel?.admin_only && !isAdmin)
                  }
                    sx={{ 
                      minWidth: 'auto', 
                      width: isMobile ? '40px' : 'auto',
                      height: isMobile ? '40px' : '56px',
                      px: isMobile ? 0 : 2,
                      borderRadius: isMobile ? '50%' : '4px'
                    }}
                  >
                    {sending || uploadingMedia ? <CircularProgress size={isMobile ? 16 : 20} /> : <SendIcon fontSize={isMobile ? 'small' : 'medium'} />}
                </Button>
              </Box>
              </Box>
              </>
            )}
          </Box>
        </>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography variant="h6" color="textSecondary">
            Выберите канал для начала общения
          </Typography>
        </Box>
      )}
    </Box>
      </Box>
      
      {/* Message Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleMessageMenuClose}
      >
        <MenuItem onClick={handleReplyFromMenu}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          Ответить
        </MenuItem>
        <MenuItem onClick={handleEditFromMenu}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDeleteFromMenu}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Удалить
        </MenuItem>
      </Menu>

      {/* Mobile Floating Channel Button */}
      {isMobile && selectedChannel && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Button
            variant="contained"
            onClick={() => setMobileDrawerOpen(true)}
            sx={{
              minWidth: 'auto',
              width: 56,
              height: 56,
              borderRadius: '50%',
              boxShadow: 3,
              '&:hover': {
                boxShadow: 6,
              },
            }}
          >
            <MenuIcon />
          </Button>
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Card Selection Dialog */}
      <Dialog
        open={cardSelectionDialog.open}
        onClose={() => setCardSelectionDialog({ open: false, messageId: null, amount: 0 })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GiftIcon color="primary" />
            <Typography variant="h6">
              Выберите карту для получения подарка
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Получите {cardSelectionDialog.amount} монет на выбранную карту:
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {userCards.map((card) => (
              <Card
                key={card.id}
                sx={{
                  cursor: 'pointer',
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }
                }}
                onClick={() => {
                  if (cardSelectionDialog.messageId) {
                    claimMoneyGift(cardSelectionDialog.messageId, cardSelectionDialog.amount, card.id);
                  }
                }}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {card.card_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.card_number}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        {card.balance} {card.currency}
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        +{cardSelectionDialog.amount} {card.currency}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCardSelectionDialog({ open: false, messageId: null, amount: 0 })}
          >
            Отмена
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 