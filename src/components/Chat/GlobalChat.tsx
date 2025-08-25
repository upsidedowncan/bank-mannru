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
import { keyframes } from '@emotion/react';
import { styled } from '@mui/material/styles';
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
  Group as GroupIcon,
  MusicNote as MusicIcon,
  Movie as MovieIcon,
  Book as BookIcon,
  Pets as PetsIcon,
  SportsSoccer as SportsIcon,
  Restaurant as FoodIcon,
  Flight as TravelIcon,
  Code as DevIcon,
  AttachMoney as MoneyAttachIcon,
  Lightbulb as LightbulbIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { ChatChannel, ChatMessage, UserChatSettings } from './types';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatInput } from './hooks/useChatInput';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import Message from './molecules/Message';

const iconMapping: { [key: string]: React.ComponentType } = {
  Chat: ChatIcon,
  Store: StoreIcon,
  SportsEsports: GamingIcon,
  Help: HelpIcon,
  Forum: ForumIcon,
  Announcement: AnnouncementIcon,
  Person: Person,
  Group: GroupIcon,
  School: School,
  Work: Work,
  Home: Home,
  Star: Star,
  Music: MusicIcon,
  Movie: MovieIcon,
  Book: BookIcon,
  Pets: PetsIcon,
  Sports: SportsIcon,
  Food: FoodIcon,
  Travel: TravelIcon,
  Code: DevIcon,
  Money: MoneyAttachIcon,
  Gift: GiftIcon,
  Lightbulb: LightbulbIcon,
  Warning: WarningIcon,
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
  Dev: DevIcon,
};

// Define the pulse animation keyframes
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
`;

// Create a styled component for animated icons
const AnimatedDevIcon = styled(DevIcon)`
  animation: ${pulse} 2s infinite;
  color: white;
  font-size: 1.2rem;
`;

export const GlobalChat: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Core state
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserChatSettings | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Message editing state
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<ChatMessage | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

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

  // Utility functions
  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const { messages, setMessages } = useChatMessages(selectedChannel, showSnackbar);

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

  useEffect(() => {
    scrollToBottomDebounced();
  }, [messages, scrollToBottomDebounced]);

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

  const getProfileIconComponent = useCallback((iconName: string) => {
    if (iconName === 'Dev') {
      return AnimatedDevIcon;
    }
    return profileIconMapping[iconName] || Person;
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

  // Voice recording functions are now in useVoiceRecording hook

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

  const {
    newMessage,
    sending,
    sendMessage,
    handleInputChange,
    uploadingMedia,
    selectedFile,
    mediaPreview,
    handleFileSelect,
    handleCancelMedia,
    sendMediaMessage,
    setNewMessage,
    newMessageRef,
  } = useChatInput(user, selectedChannel, isUserAdmin, showSnackbar, replyingTo, setReplyingTo);

  const {
    isRecording,
    isPaused,
    recordingTime,
    isSendingVoice,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cleanup: cleanupVoiceRecording,
  } = useVoiceRecording(user, selectedChannel, isUserAdmin, showSnackbar);

  // Event handlers
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (selectedFile) {
        sendMediaMessage();
      } else {
        sendMessage();
      }
    }
  }, [sendMessage, selectedFile, sendMediaMessage]);

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

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedChannel) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const existingReaction = message.reactions?.find(
      r => r.emoji === emoji && r.user_id === user.id
    );

    if (existingReaction) {
      // User has reacted with this emoji, so remove it
      await supabase.from('message_reactions').delete().eq('id', existingReaction.id);
    } else {
      // User has not reacted, so add it
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji: emoji,
        channel_id: selectedChannel.id,
      });
    }
  };

  // Media functions are now in useChatInput hook

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupVoiceRecording();
      if (currentAudio) {
        currentAudio.pause();
      }
      if (debouncedScrollToBottom.current) {
        clearTimeout(debouncedScrollToBottom.current);
      }
    };
  }, [cleanupVoiceRecording, currentAudio]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
    );
  }

  const renderChannels = () => (
    <List sx={{ flex: 1, overflow: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {channels.map((channel) => (
        <ListItem key={channel.id} disablePadding>
          <ListItemButton
            selected={selectedChannel?.id === channel.id}
            onClick={() => {
              setSelectedChannel(channel);
              if (isMobile) setMobileDrawerOpen(false);
            }}
          >
            <ListItemIcon>{getChannelIcon(channel.icon)}</ListItemIcon>
            <ListItemText primary={channel.name} secondary={channel.description} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {channel.is_pinned && <PinIcon fontSize="small" />}
              {channel.admin_only && <AdminIcon fontSize="small" color="error" />}
            </Box>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Channels Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: '80%', boxSizing: 'border-box' } }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Каналы</Typography>
            <IconButton onClick={() => setMobileDrawerOpen(false)}><CloseIcon /></IconButton>
          </Box>
          {renderChannels()}
        </Drawer>
      ) : (
        <Box sx={{ width: 280, flexShrink: 0, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}><Typography variant="h6">Каналы</Typography></Box>
          {renderChannels()}
        </Box>
      )}

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileDrawerOpen(true)}><MenuIcon /></IconButton>
            )}
            <Typography variant="h6">{selectedChannel ? selectedChannel.name : 'Глобальный чат'}</Typography>
          </Box>
        </Box>

        {selectedChannel ? (
          <>
            {/* Messages */}
            <Box ref={chatContainerRef} sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isMobile={isMobile}
                  user={user}
                  editingMessage={editingMessage}
                  editText={editText}
                  setEditText={setEditText}
                  editMessage={editMessage}
                  setEditingMessage={setEditingMessage}
                  handleMessageMenuOpen={handleMessageMenuOpen}
                  getProfileIconComponent={getProfileIconComponent}
                  AnimatedDevIcon={AnimatedDevIcon}
                  formatTime={formatTime}
                  isPlaying={isPlaying}
                  playAudio={playAudio}
                  audioProgress={audioProgress}
                  audioDurations={audioDurations}
                  formatAudioTime={formatAudioTime}
                  openCardSelectionDialog={openCardSelectionDialog}
                  claimingGift={claimingGift}
                  onToggleReaction={(emoji) => handleToggleReaction(message.id, emoji)}
                />
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
              {isRecording ? (
                <Box display="flex" alignItems="center" gap={2}>
                  {/* Recording UI */}
                  <Typography variant="body2" color="text.secondary">{formatRecordingTime(recordingTime)}</Typography>
                  <Button onClick={isPaused ? resumeRecording : pauseRecording}>{isPaused ? "Resume" : "Pause"}</Button>
                  <Button onClick={stopRecording}>Stop</Button>
                </Box>
              ) : (
                <>
                  {replyingTo && (
                    <Box sx={{ p: 1, mb: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2">Replying to {replyingTo.user_name}</Typography>
                      <IconButton size="small" onClick={handleCancelReply}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  )}
                  {mediaPreview && (
                     <Box sx={{ p: 1, mb: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="body2">Attachment: {selectedFile?.name}</Typography>
                      <IconButton size="small" onClick={handleCancelMedia}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  )}
                  <Box display="flex" gap={1}>
                    <TextField
                      fullWidth
                      placeholder="Введите сообщение..."
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      multiline
                      maxRows={4}
                      disabled={!selectedChannel || (selectedChannel.admin_only && !isAdmin)}
                    />
                    <IconButton component="label" htmlFor="media-upload" disabled={!selectedChannel}><AddPhotoIcon /></IconButton>
                    <input type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} id="media-upload" />
                    <IconButton onClick={startRecording} disabled={!selectedChannel}><MicIcon /></IconButton>
                    <Button variant="contained" onClick={selectedFile ? sendMediaMessage : sendMessage} disabled={(!selectedFile && !newMessage.trim()) || sending || uploadingMedia}>
                      {sending || uploadingMedia ? <CircularProgress size={24} /> : <SendIcon />}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </>
        ) : (
          <Box display="flex" flex={1} justifyContent="center" alignItems="center">
            <Typography variant="h6" color="textSecondary">Выберите канал для начала общения</Typography>
          </Box>
        )}
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
