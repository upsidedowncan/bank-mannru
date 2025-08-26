import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Avatar,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
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
  Tooltip,
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
  AddPhotoAlternate as AddPhotoIcon,
  Add as AddIcon,
  CardGiftcard as GiftIcon,
  Money as MoneyIcon,
  Group as GroupIcon,
  MusicNote as MusicIcon,
  Movie as MovieIcon,
  Book as BookIcon,
  Pets as PetsIcon,
  SportsSoccer as SportsIcon,
  Restaurant as FoodIcon,
  Flight as TravelIcon,
  Code as DevIcon,
  Lightbulb as LightbulbIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { ChatChannel, ChatMessage, UserChatSettings } from './types';
import { useChatInput } from './hooks/useChatInput';
import { useDirectMessages, Conversation, DirectMessage } from './hooks/useDirectMessages';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { NewDmDialog } from './molecules/NewDmDialog';
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
  const [selectedChat, setSelectedChat] = useState<ChatChannel | Conversation | null>(null);
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

  const [newDmDialogOpen, setNewDmDialogOpen] = useState(false);

  // Hook for DMs
  const {
    conversations: dmConversations,
    // messages and selectedConversation are now managed in this component
    sendMessage: sendDm,
    fetchConversations,
    searchUsers,
    searchResults,
    searching,
    startDmWithUser,
  } = useDirectMessages(user);

  // Type guard to check if a chat is a channel
  const isChannel = useCallback((chat: any): chat is ChatChannel => {
    return chat && 'is_active' in chat;
  }, []);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

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

  // Fetch initial data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_channels')
          .select('*')
          .eq('is_active', true)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: true });

        if (error) throw error;

        const fetchedChannels = data || [];
        setChannels(fetchedChannels);

        if (fetchedChannels.length > 0) {
          setSelectedChat(currentSelectedChat => {
            return currentSelectedChat ? currentSelectedChat : fetchedChannels[0];
          });
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
        showSnackbar('Ошибка при загрузке каналов', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []); // Runs once on mount

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // This is the new central useEffect for fetching and subscriptions
  useEffect(() => {
    setMessages([]); // Clear messages when chat changes
    setLoading(true);

    if (!selectedChat) {
      setLoading(false);
      return;
    }

    let subscription: any = null;

    const fetchAndSetMessages = async () => {
      try {
      if (isChannel(selectedChat)) {
        // This logic is restored from the original useChatMessages hook
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', selectedChat.id)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        if (!messagesData) return;

        const messageIds = messagesData.map(msg => msg.id);
        const { data: reactionsData, error: reactionsError } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messageIds);

        if (reactionsError) throw reactionsError;

        const userIdsFromMessages = messagesData.map(msg => msg.user_id);
        const userIdsFromReactions = reactionsData?.map(r => r.user_id) || [];
        const allUserIds = Array.from(new Set([...userIdsFromMessages, ...userIdsFromReactions]));

        const { data: userSettingsData } = await supabase
          .from('user_chat_settings')
          .select('user_id, chat_name, pfp_color, pfp_icon')
          .in('user_id', allUserIds);

        const settingsMap = new Map(userSettingsData?.map(s => [s.user_id, s]));

        const reactionsByMessageId = new Map();
        reactionsData?.forEach(reaction => {
          const userSetting = settingsMap.get(reaction.user_id);
          const reactionWithUser = {
            ...reaction,
            user_name: userSetting?.chat_name || `User ${reaction.user_id.slice(0, 8)}...`,
          };
          const existing = reactionsByMessageId.get(reaction.message_id) || [];
          reactionsByMessageId.set(reaction.message_id, [...existing, reactionWithUser]);
        });

        const finalMessages = await Promise.all(
          messagesData.map(async (msg) => {
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
              reactions: reactionsByMessageId.get(msg.id) || [],
            };
          })
        );
        setMessages(finalMessages);
      } else {
        // Fetch DM messages
        const { data: dms, error: dmsError } = await supabase
          .from('direct_messages')
          .select('*')
          .eq('conversation_id', selectedChat.id)
          .order('created_at', { ascending: true });

        if (dmsError) throw dmsError;
        if (!dms) return;

        const senderIds = Array.from(new Set(dms.map(dm => dm.sender_id)));
        const { data: userSettingsData } = await supabase
          .from('user_chat_settings')
          .select('user_id, chat_name, pfp_color, pfp_icon')
          .in('user_id', senderIds);

        const settingsMap = new Map(userSettingsData?.map(s => [s.user_id, s]));

        const finalMessages = dms.map(dm => {
          const settings = settingsMap.get(dm.sender_id);
          const chatMessage: ChatMessage = {
            id: dm.id,
            created_at: dm.created_at,
            message: dm.content,
            user_id: dm.sender_id,
            user_name: settings?.chat_name || 'User',
            pfp_color: settings?.pfp_color || '#1976d2',
            pfp_icon: settings?.pfp_icon || 'Person',
            channel_id: '', // Not applicable for DMs
            message_type: 'text',
            reactions: [], // DMs don't have reactions in this implementation
            is_edited: false,
            edited_at: null,
            reply_to: undefined,
            reply_to_message: undefined,
            media_url: undefined,
            media_type: undefined,
            audio_url: undefined,
            gift_amount: undefined,
            gift_claimed_by: undefined,
          };
          return chatMessage;
        });
        setMessages(finalMessages);
      }
      } catch (error) {
        console.error("Error fetching messages:", error);
        showSnackbar('Ошибка при загрузке сообщений', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAndSetMessages();

    // Set up subscriptions
    if (isChannel(selectedChat)) {
      subscription = supabase
        .channel(`public:chat_messages:channel_id=eq.${selectedChat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedChat.id}` },
          (payload) => {
            // This needs to be more sophisticated to add user details to the new message
            // For now, just re-fetch
            fetchAndSetMessages();
          }
        )
        .subscribe();
    } else {
      // DM subscription
      subscription = supabase
        .channel(`public:direct_messages:conversation_id=eq.${selectedChat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${selectedChat.id}` },
          (payload) => {
            fetchAndSetMessages();
          }
        )
        .subscribe();
    }


    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [selectedChat, isChannel]);


  const forceScrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      // A threshold to avoid scrolling if the user has scrolled up significantly.
      // We check if the user is within this threshold of the bottom.
      const scrollThreshold = 200; // pixels
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + scrollThreshold;

      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
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

  const handleAdminCommand = async (command: string) => {
    // ... (omitted for brevity, no changes needed here)
  };

  const editMessage = async (messageId: string) => {
    // ... (omitted for brevity, no changes needed here)
  };

  const deleteMessage = async (messageId: string) => {
    // ... (omitted for brevity, no changes needed here)
  };

  const playAudio = (audioUrl: string, messageId: string) => {
    // ... (omitted for brevity, no changes needed here)
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

  const sanitizeHTML = (html: string) => {
    // ... (omitted for brevity, no changes needed here)
  };

  const sendMoneyGift = async (amount: number) => {
    // ... (omitted for brevity, no changes needed here)
  };

  const fetchUserCards = async () => {
    // ... (omitted for brevity, no changes needed here)
  };

  const openCardSelectionDialog = async (messageId: string, amount: number) => {
    // ... (omitted for brevity, no changes needed here)
  };

  const claimMoneyGift = async (messageId: string, amount: number, cardId: string) => {
    // ... (omitted for brevity, no changes needed here)
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
  } = useChatInput(user, isChannel(selectedChat) ? selectedChat : null, isUserAdmin, showSnackbar, replyingTo, setReplyingTo, forceScrollToBottom);

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
  } = useVoiceRecording(user, isChannel(selectedChat) ? selectedChat : null, isUserAdmin, showSnackbar);

  const handleSendMessage = useCallback(() => {
    if (!selectedChat || !newMessage.trim()) return;

    if (isChannel(selectedChat)) {
      sendMessage();
    } else {
      // It's a DM
      const receiver = selectedChat.participants.find(p => p.user_id !== user?.id);
      if (receiver) {
        sendDm(receiver.user_id, newMessage.trim());
        setNewMessage(''); // Also clear message here
      }
    }
  }, [selectedChat, newMessage, user, isChannel, sendMessage, sendDm, setNewMessage]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (selectedFile) {
        sendMediaMessage();
      } else {
        handleSendMessage();
      }
    }
  }, [handleSendMessage, selectedFile, sendMediaMessage]);

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
    }
    handleMessageMenuClose();
  };

  const handleDeleteFromMenu = () => {
    if (selectedMessageForMenu) {
      deleteMessage(selectedMessageForMenu.id);
    }
    handleMessageMenuClose();
  };

  const handleReplyFromMenu = () => {
    if (selectedMessageForMenu) {
      setReplyingTo(selectedMessageForMenu);
    }
    handleMessageMenuClose();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !isChannel(selectedChat)) return; // Only allow reactions in channels for now
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    const existingReaction = message.reactions?.find(r => r.emoji === emoji && r.user_id === user.id);
    if (existingReaction) {
      await supabase.from('message_reactions').delete().eq('id', existingReaction.id);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji: emoji,
        channel_id: selectedChat.id,
      });
    }
  };

  useEffect(() => {
    return () => {
      cleanupVoiceRecording();
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [cleanupVoiceRecording, currentAudio]);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><CircularProgress /></Box>;
  }

  const renderChannels = () => (
    <List sx={{ flex: 1, overflowY: 'auto' }}>
      {channels.map((channel) => (
        <ListItem key={channel.id} disablePadding>
          <ListItemButton
            selected={selectedChat?.id === channel.id}
            onClick={() => {
              setSelectedChat(channel);
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
      <Divider sx={{ my: 2 }} />
      <Typography variant="overline" sx={{ px: 2 }}>Direct Messages</Typography>
      {dmConversations.map((convo) => {
        const otherParticipant = convo.participants.find(p => p.user_id !== user?.id);
        const IconComponent = getProfileIconComponent(otherParticipant?.pfp_icon || 'Person');
        return (
          <ListItem key={convo.id} disablePadding>
            <ListItemButton
              selected={selectedChat?.id === convo.id}
              onClick={() => {
                setSelectedChat(convo);
                if (isMobile) setMobileDrawerOpen(false);
              }}
            >
              <ListItemIcon>
                <Avatar sx={{ width: 24, height: 24, bgcolor: otherParticipant?.pfp_color, fontSize: '0.8rem' }}>
                  <IconComponent sx={{ fontSize: '1rem' }} />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={otherParticipant?.user_name || 'User'}
                secondary={convo.last_message_content}
                secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );

  const handleSelectUser = async (userId: string) => {
    // This now just opens the conversation. The user can then type their message.
    const convo = await startDmWithUser(userId);
    if (convo) {
      setSelectedChat(convo);
    }
  };

  return (
    <>
    <Box sx={{ display: 'flex', flex: 1, width: '100%', minHeight: 0 }}>
      {/* Channels Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: '80%', boxSizing: 'border-box' } }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Чаты</Typography>
            <IconButton onClick={() => setMobileDrawerOpen(false)}><CloseIcon /></IconButton>
          </Box>
          {renderChannels()}
        </Drawer>
      ) : (
        <Box sx={{ width: 280, flexShrink: 0, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Чаты</Typography>
            <IconButton onClick={() => setNewDmDialogOpen(true)}>
              <AddIcon />
            </IconButton>
          </Box>
          {renderChannels()}
        </Box>
      )}

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileDrawerOpen(true)}><MenuIcon /></IconButton>
            )}
            <Typography variant="h6">{selectedChat ? (isChannel(selectedChat) ? selectedChat.name : selectedChat.participants.find(p=>p.user_id !== user?.id)?.user_name || 'DM') : 'Глобальный чат'}</Typography>
          </Box>
        </Box>

        {selectedChat ? (
          <>
            {/* Messages */}
            <Box ref={chatContainerRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
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
                  onStartDm={startDmWithUser}
                />
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
              {isRecording ? (
                <Box display="flex" alignItems="center" gap={2}>
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
                      disabled={!selectedChat || (isChannel(selectedChat) && selectedChat.admin_only && !isAdmin)}
                    />
                    <IconButton component="label" htmlFor="media-upload" disabled={!selectedChat}><AddPhotoIcon /></IconButton>
                    <input type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} id="media-upload" />
                    <IconButton onClick={startRecording} disabled={!selectedChat}><MicIcon /></IconButton>
                    <Button variant="contained" onClick={selectedFile ? sendMediaMessage : handleSendMessage} disabled={(!selectedFile && !newMessage.trim()) || sending || uploadingMedia}>
                      {sending || uploadingMedia ? <CircularProgress size={24} /> : <SendIcon />}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          </>
        ) : (
          <Box display="flex" flex={1} justifyContent="center" alignItems="center">
            <Typography variant="h6" color="textSecondary">Выберите чат для начала общения</Typography>
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
        <MenuItem onClick={handleEditFromMenu} disabled={!isChannel(selectedChat)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDeleteFromMenu} disabled={!isChannel(selectedChat)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Удалить
        </MenuItem>
      </Menu>

      {/* Mobile Floating Channel Button */}
      {isMobile && selectedChat && (
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
    <NewDmDialog
      open={newDmDialogOpen}
      onClose={() => setNewDmDialogOpen(false)}
      onSelectUser={handleSelectUser}
      searchUsers={searchUsers}
      searchResults={searchResults}
      searching={searching}
    />
    </>
  );
}; 