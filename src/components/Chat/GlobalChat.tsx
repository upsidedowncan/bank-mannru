import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Fab,
  Fade,
  Skeleton,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
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
  AttachFile as AttachFileIcon,
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
  Search as SearchIcon,
  KeyboardArrowDown as ScrollDownIcon,
  SmartToy as BotIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { ChatChannel, ChatMessage, UserChatSettings, MessageReaction } from './types';
import { useChatInput } from './hooks/useChatInput';
import { useDirectMessages, Conversation, DirectMessage } from './hooks/useDirectMessages';
import { useVoiceRecording } from './hooks/useVoiceRecording';
import { NewDmDialog } from './molecules/NewDmDialog';
import { ManPayDialog } from './molecules/ManPayDialog';
import Message from './molecules/Message';
import VirtualizedMessageList from './molecules/VirtualizedMessageList';
import MessageSearch from './molecules/MessageSearch';
import TypingIndicator from './molecules/TypingIndicator';
import { ManGPT } from './molecules/ManGPT';
import { ItemDetailsDialog } from '../Marketplace/ItemDetailsDialog';

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

type MarketplaceItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  images: string[];
  seller_id: string;
  seller_name: string;
  created_at: string;
  is_active: boolean;
  location: string;
  tags: string[];
  purchase_limit?: number;
};

export const GlobalChat: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Core state
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatChannel | Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [userSettings, setUserSettings] = useState<UserChatSettings | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Message editing state
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<ChatMessage | null>(null);
  const [attachmentMenuAnchor, setAttachmentMenuAnchor] = useState<null | HTMLElement>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
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
  const [selectedCardIdForGift, setSelectedCardIdForGift] = useState<string>('');

  const [newDmDialogOpen, setNewDmDialogOpen] = useState(false);
  const [manPayDialogOpen, setManPayDialogOpen] = useState(false);
  const [marketItemDialogOpen, setMarketItemDialogOpen] = useState(false);
  const [selectedMarketItemForDetails, setSelectedMarketItemForDetails] = useState<MarketplaceItem | null>(null);

  // New features state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Array<{user_id: string; user_name: string; timestamp: number}>>([]);
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const [readBy, setReadBy] = useState<{[messageId: string]: string[]}>({});

  // Performance optimization: Limit rendered messages to prevent lag
  const [renderedMessageCount, setRenderedMessageCount] = useState(50); // Start with 50 messages
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Performance optimization: Debounced message updates to prevent lag
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedUpdateMessages = useCallback((newMessages: ChatMessage[]) => {
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Set new timeout to batch updates
    updateTimeoutRef.current = setTimeout(() => {
      setMessages(prev => {
        // Merge messages and remove duplicates
        const allMessages = [...prev, ...newMessages];
        const uniqueMessages = allMessages.filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id)
        );
        return uniqueMessages;
      });
      setPendingMessages([]);
    }, 100); // 100ms debounce
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

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

  // Check if user is admin
  const isUserAdmin = useCallback(async () => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('user_chat_settings')
        .select('is_admin')
        .eq('user_id', user.id)
        .single();
      
      if (error) return false;
      return data?.is_admin || false;
    } catch {
      return false;
    }
  }, [user]);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesPerPage = 20; // Reduced batch size for better performance
  
  // Memoize messages to prevent unnecessary re-renders
  const visibleMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    // Only show the most recent messages to prevent lag
    const startIndex = Math.max(0, messages.length - renderedMessageCount);
    return messages.slice(startIndex);
  }, [messages, renderedMessageCount]);

  // Performance optimization: Increase rendered message count when scrolling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // If user is near the top, increase rendered message count
    if (scrollTop < 100 && renderedMessageCount < messages.length) {
      setRenderedMessageCount(prev => Math.min(prev + 20, messages.length));
    }
    
    // If user is near the bottom, decrease rendered message count for performance
    if (scrollTop > scrollHeight - clientHeight - 100 && renderedMessageCount > 50) {
      setRenderedMessageCount(prev => Math.max(prev - 10, 50));
    }
  }, [renderedMessageCount, messages.length]);

  // Load more messages function with smaller batches
  const loadMoreMessages = useCallback(async () => {
    if (!selectedChat || isLoadingMore || !hasMoreMessages || selectedChat.id === 'mangpt') return;

    setIsLoadingMore(true);
    try {
      if (isChannel(selectedChat)) {
        // Use smaller batch size for better performance
        const batchSize = 20; // Reduced from previous value
        const offset = (currentPage - 1) * batchSize;
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', selectedChat.id)
          .order('created_at', { ascending: true })
          .range(offset, offset + batchSize - 1);

        if (messagesError) throw messagesError;
        if (!messagesData || messagesData.length === 0) {
          setHasMoreMessages(false);
          return;
        }

        // Process new messages (similar to existing logic)
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
          .select('user_id, chat_name, pfp_color, pfp_icon, pfp_type, pfp_image_url, pfp_gradient')
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

        const newMessages = await Promise.all(
          messagesData.map(async (msg) => {
            const userSetting = settingsMap.get(msg.user_id);
            let replyToMessage = null;
            if (msg.reply_to) {
              const { data: replyData } = await supabase
                .from('chat_messages')
                .select('id, message, user_id, created_at')
                .eq('id', msg.reply_to)
                .single();

              if (replyData) {
                const replyUserSetting = settingsMap.get(replyData.user_id);
                replyToMessage = {
                  id: replyData.id,
                  channel_id: msg.channel_id,
                  user_id: replyData.user_id,
                  message: replyData.message,
                  message_type: 'text' as const,
                  is_edited: false,
                  edited_at: null,
                  created_at: replyData.created_at || new Date().toISOString(),
                  user_name: replyUserSetting?.chat_name || `User ${replyData.user_id.slice(0, 8)}...`,
                  pfp_color: replyUserSetting?.pfp_color || '#1976d2',
                  pfp_icon: replyUserSetting?.pfp_icon || 'Person',
                  pfp_type: replyUserSetting?.pfp_type || 'icon',
                  pfp_image_url: replyUserSetting?.pfp_image_url || '',
                  pfp_gradient: replyUserSetting?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
                  reactions: [],
                } as ChatMessage;
              }
            }
            return {
              ...msg,
              user_name: userSetting?.chat_name || `User ${msg.user_id.slice(0, 8)}...`,
              pfp_color: userSetting?.pfp_color || '#1976d2',
              pfp_icon: userSetting?.pfp_icon || 'Person',
              pfp_type: userSetting?.pfp_type || 'icon',
              pfp_image_url: userSetting?.pfp_image_url || '',
              pfp_gradient: userSetting?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
              reply_to_message: replyToMessage,
              reactions: reactionsByMessageId.get(msg.id) || [],
            };
          })
        );

        // Prepend new messages to existing ones
        setMessages(prevMessages => [...newMessages, ...prevMessages]);
        setCurrentPage(prev => prev + 1);
        
        // Check if we've loaded all messages
        if (messagesData.length < batchSize) {
          setHasMoreMessages(false);
        }
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      showSnackbar('Ошибка при загрузке сообщений', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedChat, currentPage, hasMoreMessages, isLoadingMore, showSnackbar]);

  // Pin/unpin message functions
  const handlePinMessage = async (messageId: string) => {
    if (!user || !selectedChat || !isChannel(selectedChat)) return;
    
    try {
      setPinnedMessages(prev => new Set(prev).add(messageId));
      showSnackbar('Сообщение закреплено', 'success');
    } catch (error) {
      console.error('Error pinning message:', error);
      showSnackbar('Ошибка при закреплении сообщения', 'error');
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    if (!user || !selectedChat || !isChannel(selectedChat)) return;
    
    try {
      setPinnedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      showSnackbar('Сообщение откреплено', 'success');
    } catch (error) {
      console.error('Error unpinning message:', error);
      showSnackbar('Ошибка при откреплении сообщения', 'error');
    }
  };

  // Message selection function
  const handleMessageSelect = (messageId: string) => {
    console.log('Attempting to scroll to message:', messageId);
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
      messageElement.style.borderRadius = '8px';
      messageElement.style.padding = '8px';
      messageElement.style.margin = '4px';
      messageElement.style.transition = 'all 0.3s ease';
      
      // Enhanced highlighting effect
      setTimeout(() => {
        messageElement.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        messageElement.style.transform = 'scale(1.02)';
      }, 500);
      
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
        messageElement.style.transform = 'scale(1)';
        messageElement.style.borderRadius = '';
        messageElement.style.padding = '';
        messageElement.style.margin = '';
      }, 3000);
      
      console.log('Successfully scrolled to message');
    } else {
      console.log('Message element not found, message might not be loaded:', messageId);
      // Show a snackbar to inform the user
      showSnackbar('Сообщение не найдено в текущем чате', 'error');
    }
  };

  // Typing indicators disabled for better performance
  // useEffect(() => {
  //   if (!selectedChat || !isChannel(selectedChat)) {
  //     return;
  //   }
  //   // ... typing indicator logic disabled
  // }, [selectedChat, user]);



  // Admin checking function
  // useEffect(() => {
  //   const checkAdminStatus = async () => {
  //     if (user) {
  //       const adminStatus = await isUserAdmin();
  //       setIsAdmin(adminStatus);
  //     } else {
  //       setIsAdmin(false);
  //     }
  //   };
    
  //   checkAdminStatus();
  // }, [user, isUserAdmin]);

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

  // Mark messages as read
  useEffect(() => {
    if (!user || !selectedChat || !isChannel(selectedChat)) {
      return;
    }

    const markAsRead = async () => {
      try {
        const messageIds = messages.map(m => m.id);
        if (messageIds.length > 0) {
          setReadBy(prev => {
            const newReadBy = { ...prev };
            messageIds.forEach(id => {
              if (!newReadBy[id]) {
                newReadBy[id] = [];
              }
              if (!newReadBy[id].includes(user.id)) {
                newReadBy[id] = [...newReadBy[id], user.id];
              }
            });
            return newReadBy;
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markAsRead();
  }, [messages, user, selectedChat]);

  // Typing indicators cleanup disabled for better performance
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setTypingUsers(prev => prev.filter(user => Date.now() - user.timestamp < 5000));
  //   }, 5000);
  //   return () => clearInterval(interval);
  // }, []);

  // This is the new central useEffect for fetching and subscriptions
  useEffect(() => {
    if (!selectedChat) {
      setLoading(false);
      return;
    }

    // Don't fetch messages for ManGPT - it has its own message system
    if (selectedChat?.id === 'mangpt') {
      // Don't set messages or loading state for ManGPT - let it manage itself
      return;
    }

    // Only clear messages for regular chats, not ManGPT
    setMessages([]); // Clear messages when chat changes
    setConversationLoading(true);

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
          .select('user_id, chat_name, pfp_color, pfp_icon, pfp_type, pfp_image_url, pfp_gradient')
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
                .select('id, message, user_id, created_at')
                .eq('id', msg.reply_to)
                .single();

              if (replyData) {
                const replyUserSetting = settingsMap.get(replyData.user_id);
                replyToMessage = {
                  id: replyData.id,
                  channel_id: msg.channel_id,
                  user_id: replyData.user_id,
                  message: replyData.message,
                  message_type: 'text' as const,
                  is_edited: false,
                  edited_at: null,
                  created_at: replyData.created_at || new Date().toISOString(),
                  user_name: replyUserSetting?.chat_name || `User ${replyData.user_id.slice(0, 8)}...`,
                  pfp_color: replyUserSetting?.pfp_color || '#1976d2',
                  pfp_icon: replyUserSetting?.pfp_icon || 'Person',
                  pfp_type: replyUserSetting?.pfp_type || 'icon',
                  pfp_image_url: replyUserSetting?.pfp_image_url || '',
                  pfp_gradient: replyUserSetting?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
                  reactions: [],
                } as ChatMessage;
              }
            }
            return {
              ...msg,
              user_name: userSetting?.chat_name || `User ${msg.user_id.slice(0, 8)}...`,
              pfp_color: userSetting?.pfp_color || '#1976d2',
              pfp_icon: userSetting?.pfp_icon || 'Person',
              pfp_type: userSetting?.pfp_type || 'icon',
              pfp_image_url: userSetting?.pfp_image_url || '',
              pfp_gradient: userSetting?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
              reply_to_message: replyToMessage,
              reactions: reactionsByMessageId.get(msg.id) || [],
            };
          })
        );
        setMessages(finalMessages);
        // Scroll to bottom after messages are loaded
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
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
          .select('user_id, chat_name, pfp_color, pfp_icon, pfp_type, pfp_image_url, pfp_gradient')
          .in('user_id', senderIds);

        const settingsMap = new Map(userSettingsData?.map(s => [s.user_id, s]));

        const finalMessages = await Promise.all(
          dms.map(async (dm) => {
            const settings = settingsMap.get(dm.sender_id);
            let replyToMessage: ChatMessage | undefined = undefined;
            if (dm.reply_to) {
              // In DMs, we need to fetch the replied-to message from direct_messages table
              const { data: replyData } = await supabase
                .from('direct_messages')
                .select('id, content, sender_id, created_at, message_type, media_url, media_type, audio_url')
                .eq('id', dm.reply_to)
                .single();

              if (replyData) {
                const replyUserSetting = settingsMap.get(replyData.sender_id);
                replyToMessage = {
                  id: replyData.id,
                  message: replyData.content,
                  user_id: replyData.sender_id,
                  user_name: replyUserSetting?.chat_name || `User ${replyData.sender_id.slice(0, 8)}...`,
                  pfp_color: replyUserSetting?.pfp_color,
                  pfp_icon: replyUserSetting?.pfp_icon,
                  pfp_type: replyUserSetting?.pfp_type || 'icon',
                  pfp_image_url: replyUserSetting?.pfp_image_url || '',
                  pfp_gradient: replyUserSetting?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
                  created_at: replyData.created_at,
                  message_type: replyData.message_type,
                  media_url: replyData.media_url,
                  media_type: replyData.media_type,
                  audio_url: replyData.audio_url,
                  channel_id: '',
                  is_edited: false,
                  edited_at: null,
                };
              }
            }

            const chatMessage: ChatMessage = {
              id: dm.id,
              created_at: dm.created_at,
              message: dm.content,
              user_id: dm.sender_id,
              user_name: settings?.chat_name || 'User',
              pfp_color: settings?.pfp_color || '#1976d2',
              pfp_icon: settings?.pfp_icon || 'Person',
              pfp_type: settings?.pfp_type || 'icon',
              pfp_image_url: settings?.pfp_image_url || '',
              pfp_gradient: settings?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
              channel_id: '', // Not applicable for DMs
              message_type: dm.message_type,
              reactions: [], // DMs don't have reactions in this implementation
              is_edited: false, // DMs don't support editing in this implementation
              edited_at: null,
              reply_to: dm.reply_to,
              reply_to_message: replyToMessage,
              media_url: dm.media_url,
              media_type: dm.media_type,
              audio_url: dm.audio_url,
              gift_amount: undefined, // DMs don't have gifts
              gift_claimed_by: undefined,
              manpay_amount: dm.manpay_amount,
              manpay_sender_id: dm.manpay_sender_id,
              manpay_receiver_id: dm.manpay_receiver_id,
              manpay_status: dm.manpay_status,
            };
            return chatMessage;
          })
        );
        setMessages(finalMessages);
        // Scroll to bottom after messages are loaded
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      } catch (error) {
        console.error("Error fetching messages:", error);
        showSnackbar('Ошибка при загрузке сообщений', 'error');
      } finally {
        setConversationLoading(false);
      }
    };

    // Don't fetch messages for ManGPT - it has its own message system
    if (selectedChat?.id === 'mangpt') {
      setMessages([]);
      return;
    }

    fetchAndSetMessages();

    const subscriptions: any[] = [];

    if (isChannel(selectedChat)) {
      const messagesSubscription = supabase
        .channel(`public:chat_messages:channel_id=eq.${selectedChat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedChat.id}` },
          async (payload) => {
            const newMessageData = payload.new;
            
            // Check if this is a message from the current user that we already have optimistically
            if (newMessageData.user_id === user?.id) {
              // Replace optimistic message with real one, preserving user profile info
              setMessages(currentMessages => 
                currentMessages.map(msg => {
                  // Check if this is an optimistic message that should be replaced
                  const shouldReplace = msg.is_optimistic && (
                    // For text messages, check message content
                    (msg.message_type === 'text' && msg.message === newMessageData.message) ||
                    // For voice messages, check message type and content
                    (msg.message_type === 'voice' && newMessageData.message_type === 'voice' && msg.message === newMessageData.message) ||
                    // For media messages, check message type
                    (msg.message_type === 'image' && newMessageData.message_type === 'image') ||
                    (msg.message_type === 'video' && newMessageData.message_type === 'video') ||
                    // For gift messages, check message type
                    (msg.message_type === 'money_gift' && newMessageData.message_type === 'money_gift')
                  );
                  
                  if (shouldReplace) {
                    return {
                      ...newMessageData,
                      user_name: userSettings?.chat_name || user?.email || 'You',
                      pfp_color: userSettings?.pfp_color || '#1976d2',
                      pfp_icon: userSettings?.pfp_icon || 'Person',
                      pfp_type: userSettings?.pfp_type || 'icon',
                      pfp_image_url: userSettings?.pfp_image_url || '',
                      pfp_gradient: userSettings?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
                      is_optimistic: false,
                      // Note: reply_to_message will be populated when the message is fetched
                      // Ensure all message fields are preserved
                      audio_url: newMessageData.audio_url || undefined,
                      audio_duration: newMessageData.audio_duration || undefined,
                      media_url: newMessageData.media_url || undefined,
                      media_type: newMessageData.media_type || undefined,
                      gift_amount: newMessageData.gift_amount || undefined,
                      gift_claimed_by: newMessageData.gift_claimed_by || undefined,
                      gift_claimed_at: newMessageData.gift_claimed_at || undefined,
                      manpay_amount: newMessageData.manpay_amount || undefined,
                      manpay_sender_id: newMessageData.manpay_sender_id || undefined,
                      manpay_receiver_id: newMessageData.manpay_receiver_id || undefined,
                      manpay_status: newMessageData.manpay_status || undefined,
                    } as ChatMessage;
                  }
                  return msg;
                })
              );
            } else {
              // Add new message from other users
            const { data: userSettingsData } = await supabase
              .from('user_chat_settings')
              .select('user_id, chat_name, pfp_color, pfp_icon, pfp_type, pfp_image_url, pfp_gradient')
                .eq('user_id', newMessageData.user_id)
              .single();

              // Fetch reply message data if this is a reply
              let replyToMessage: ChatMessage | undefined = undefined;
              if (newMessageData.reply_to) {
                const { data: replyData } = await supabase
                  .from('chat_messages')
                  .select('id, message, user_id, created_at')
                  .eq('id', newMessageData.reply_to)
                  .single();

                if (replyData) {
                  const replyUserSetting = userSettingsData; // Use the same settings map or fetch separately
                  replyToMessage = {
                    id: replyData.id,
                    channel_id: newMessageData.channel_id, // Use the current message's channel_id
                    user_id: replyData.user_id,
                    message: replyData.message,
                    message_type: 'text' as const, // Default to text type
                    is_edited: false,
                    edited_at: null,
                    created_at: replyData.created_at || new Date().toISOString(),
                    user_name: replyUserSetting?.chat_name || `User ${replyData.user_id.slice(0, 8)}...`,
                    pfp_color: replyUserSetting?.pfp_color || '#1976d2',
                    pfp_icon: replyUserSetting?.pfp_icon || 'Person',
                    pfp_type: replyUserSetting?.pfp_type || 'icon',
                    pfp_image_url: replyUserSetting?.pfp_image_url || '',
                    pfp_gradient: replyUserSetting?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
                    reactions: [],
                  } as ChatMessage;
                }
              }

              const finalMessage: ChatMessage = {
                id: newMessageData.id,
                channel_id: newMessageData.channel_id,
                user_id: newMessageData.user_id,
                message: newMessageData.message,
                message_type: newMessageData.message_type,
                is_edited: newMessageData.is_edited || false,
                edited_at: newMessageData.edited_at || null,
                created_at: newMessageData.created_at,
                user_name: userSettingsData?.chat_name || `User ${newMessageData.user_id.slice(0, 8)}...`,
              pfp_color: userSettingsData?.pfp_color || '#1976d2',
              pfp_icon: userSettingsData?.pfp_icon || 'Person',
              pfp_type: userSettingsData?.pfp_type || 'icon',
              pfp_image_url: userSettingsData?.pfp_image_url || '',
              pfp_gradient: userSettingsData?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
              reactions: [], // New messages won't have reactions yet
                reply_to: newMessageData.reply_to || undefined,
                reply_to_message: replyToMessage,
                // Add missing fields for voice messages
                audio_url: newMessageData.audio_url || undefined,
                audio_duration: newMessageData.audio_duration || undefined,
                // Add missing fields for media messages
                media_url: newMessageData.media_url || undefined,
                media_type: newMessageData.media_type || undefined,
                // Add missing fields for gift messages
                gift_amount: newMessageData.gift_amount || undefined,
                gift_claimed_by: newMessageData.gift_claimed_by || undefined,
                gift_claimed_at: newMessageData.gift_claimed_at || undefined,
                // Add missing fields for manpay messages
                manpay_amount: newMessageData.manpay_amount || undefined,
                manpay_sender_id: newMessageData.manpay_sender_id || undefined,
                manpay_receiver_id: newMessageData.manpay_receiver_id || undefined,
                manpay_status: newMessageData.manpay_status || undefined,
            };

            setMessages(currentMessages => [...currentMessages, finalMessage]);
            }
          }
        )
        .subscribe();
      subscriptions.push(messagesSubscription);

      const reactionsSubscription = supabase
        .channel(`public:message_reactions:channel_id=eq.${selectedChat.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions', filter: `channel_id=eq.${selectedChat.id}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newReactionData = payload.new;
              
              // Check if this reaction already exists to prevent duplicates
              setMessages(currentMessages =>
                currentMessages.map(message => {
                  if (message.id === newReactionData.message_id) {
                    // Check if reaction already exists
                    const reactionExists = message.reactions?.some(r => 
                      r.id === newReactionData.id || 
                      (r.emoji === newReactionData.emoji && r.user_id === newReactionData.user_id)
                    );
                    
                    if (!reactionExists) {
                      // Fetch user settings for the reaction
                      const fetchUserSettings = async () => {
                        const { data: userSettingsData } = await supabase
                          .from('user_chat_settings')
                          .select('user_id, chat_name')
                          .eq('user_id', newReactionData.user_id)
                          .single();
                        
              const newReaction: MessageReaction = {
                id: newReactionData.id,
                message_id: newReactionData.message_id,
                user_id: newReactionData.user_id,
                emoji: newReactionData.emoji,
                channel_id: selectedChat.id,
                          user_name: userSettingsData?.chat_name || `User ${newReactionData.user_id.slice(0, 8)}...`,
              };
                        
                        // Update the message with the new reaction
              setMessages(currentMessages =>
                          currentMessages.map(m =>
                            m.id === newReactionData.message_id
                              ? { ...m, reactions: [...(m.reactions || []), newReaction] }
                              : m
                          )
                        );
                      };
                      
                      fetchUserSettings();
                    }
                  }
                  return message;
                })
              );
            } else if (payload.eventType === 'DELETE') {
              const oldReaction = payload.old;
              setMessages(currentMessages =>
                currentMessages.map(message => {
                  if (message.id === oldReaction.message_id) {
                    return {
                      ...message,
                      reactions: message.reactions?.filter(r => r.id !== oldReaction.id) || [],
                    };
                  }
                  return message;
                })
              );
            }
          }
        )
        .subscribe();
      subscriptions.push(reactionsSubscription);

    } else if (selectedChat?.id !== 'mangpt') { // DM subscription (but not for ManGPT)
      const dmSubscription = supabase
        .channel(`public:direct_messages:conversation_id=eq.${selectedChat.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `conversation_id=eq.${selectedChat.id}` },
          (payload) => {
            fetchAndSetMessages();
          }
        )
        .subscribe();
      subscriptions.push(dmSubscription);
    }

    return () => {
      subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
  }, [selectedChat, isChannel]);

  const forceScrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    // This is a simplified scrolling logic. It will always scroll to the bottom
    // when new messages are added. This fixes the primary bug of being stuck at
    // the top when changing conversations. A more advanced implementation could
    // conditionally scroll only if the user is already near the bottom, but this
    // is a safe and correct default.
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleCommand = (command: string) => {
    const parts = command.slice(1).split(' ');
    const commandName = parts[0];
    const args = parts.slice(1);

    switch (commandName) {
      case 'gift':
        const amount = parseInt(args[0], 10);
        if (!isNaN(amount) && amount > 0) {
          sendMoneyGift(amount);
        } else {
          showSnackbar('Сумма подарка должна быть положительным числом.', 'error');
        }
        break;
      default:
        showSnackbar(`Неизвестная команда: ${commandName}`, 'error');
    }
  };

  const editMessage = async (messageId: string) => {
    console.log('editMessage called with:', { messageId, editText, user: user?.id, selectedChat: selectedChat?.id });
    
    if (!user || !selectedChat || !editText.trim()) {
      console.log('editMessage validation failed:', { user: !!user, selectedChat: !!selectedChat, editText: editText.trim() });
      return;
    }
    
    try {
      if (isChannel(selectedChat)) {
        console.log('Editing message in channel:', messageId);
        // Update message in channel
        const { error } = await supabase
          .from('chat_messages')
          .update({ 
            message: editText.trim(),
            is_edited: true,
            edited_at: new Date().toISOString()
          })
          .eq('id', messageId)
          .eq('user_id', user.id); // Ensure user can only edit their own messages

        if (error) throw error;
        
        // Update local state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, message: editText.trim(), is_edited: true, edited_at: new Date().toISOString() }
            : msg
        ));
        
        setEditingMessage(null);
        setEditText('');
        showSnackbar('Сообщение отредактировано', 'success');
        console.log('Message edited successfully in channel');
      } else {
        console.log('Editing message in DM:', messageId);
        // Update message in DM
        const { error } = await supabase
          .from('direct_messages')
          .update({ 
            message: editText.trim(),
            is_edited: true,
            edited_at: new Date().toISOString()
          })
          .eq('id', messageId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        // Update local state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, message: editText.trim(), is_edited: true, edited_at: new Date().toISOString() }
            : msg
        ));
        
        setEditingMessage(null);
        setEditText('');
        showSnackbar('Сообщение отредактировано', 'success');
        console.log('Message edited successfully in DM');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      showSnackbar('Ошибка при редактировании сообщения', 'error');
    }
  };

  const deleteMessage = async (messageId: string) => {
    console.log('deleteMessage called with:', { messageId, user: user?.id, selectedChat: selectedChat?.id });
    
    if (!user || !selectedChat) {
      console.log('deleteMessage validation failed:', { user: !!user, selectedChat: !!selectedChat });
      return;
    }
    
    try {
      if (isChannel(selectedChat)) {
        console.log('Deleting message from channel:', messageId);
        // Delete message from channel
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .eq('id', messageId)
          .eq('user_id', user.id); // Ensure user can only delete their own messages

        if (error) throw error;
        
        // Update local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        showSnackbar('Сообщение удалено', 'success');
        console.log('Message deleted successfully from channel');
      } else {
        console.log('Deleting message from DM:', messageId);
        // Delete message from DM
        const { error } = await supabase
          .from('direct_messages')
          .delete()
          .eq('id', messageId)
          .eq('user_id', user.id);

        if (error) throw error;
        
        // Update local state
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        showSnackbar('Сообщение удалено', 'success');
        console.log('Message deleted successfully from DM');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      showSnackbar('Ошибка при удалении сообщения', 'error');
    }
  };

  const playAudio = useCallback(async (audioUrl: string, messageId: string) => {
    try {
      // If clicking the same audio that's currently playing, pause it
      if (isPlaying === messageId && currentAudio) {
      currentAudio.pause();
        setCurrentAudio(null);
        setIsPlaying(null);
        return;
      }

      // If there's another audio playing, pause it first
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setIsPlaying(null);
      }

      // Create new audio element
    const audio = new Audio(audioUrl);

      // Set up event handlers before playing
    audio.ontimeupdate = () => {
      setAudioProgress(prev => ({ ...prev, [messageId]: audio.currentTime }));
    };

    audio.onended = () => {
      setIsPlaying(null);
      setCurrentAudio(null);
    };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsPlaying(null);
        setCurrentAudio(null);
      };

      // Set state before playing
      setCurrentAudio(audio);
      setIsPlaying(messageId);

      // Play with proper error handling
      try {
        await audio.play();
      } catch (playError) {
        console.error('Failed to play audio:', playError);
        setIsPlaying(null);
        setCurrentAudio(null);
      }
    } catch (error) {
      console.error('Audio setup error:', error);
      setIsPlaying(null);
      setCurrentAudio(null);
    }
  }, [currentAudio, isPlaying]);

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
    if (!user) {
      showSnackbar('Вам нужно войти в систему, чтобы отправить подарок', 'error');
      return;
    }
    if (!selectedChat || !isChannel(selectedChat)) {
      showSnackbar('Подарки можно отправлять только в каналы.', 'error');
      return;
    }

    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-gift-${Date.now()}`,
        channel_id: selectedChat.id,
        user_id: user.id,
        message: `Отправил подарок в размере ${amount} монет!`,
        message_type: 'money_gift',
        is_edited: false,
        edited_at: null,
        created_at: new Date().toISOString(),
        user_name: userSettings?.chat_name || user.email || 'You',
        pfp_color: userSettings?.pfp_color || '#1976d2',
        pfp_icon: userSettings?.pfp_icon || 'Person',
        pfp_type: userSettings?.pfp_type || 'icon',
        pfp_image_url: userSettings?.pfp_image_url || '',
        pfp_gradient: userSettings?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
        reactions: [],
        gift_amount: amount,
        is_optimistic: true, // Mark as optimistic for later replacement
      };

      // Add optimistic message immediately
      setMessages(currentMessages => [...currentMessages, optimisticMessage]);

      const { error } = await supabase.from('chat_messages').insert({
        channel_id: selectedChat.id,
        user_id: user.id,
        message: `Отправил подарок в размере ${amount} монет!`,
        message_type: 'money_gift',
        gift_amount: amount,
      });

      if (error) throw error;

      showSnackbar('Подарок успешно отправлен!', 'success');
    } catch (error) {
      console.error('Error sending money gift:', error);
      showSnackbar('Не удалось отправить подарок.', 'error');
      
      // Remove optimistic message on error
      setMessages(currentMessages => 
        currentMessages.filter(msg => !msg.is_optimistic || msg.message_type !== 'money_gift')
      );
    }
  };

  const fetchUserCards = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      setUserCards(data || []);
    } catch (error) {
      console.error("Error fetching user cards:", error);
      showSnackbar('Не удалось загрузить ваши карты', 'error');
    }
  };

  const openCardSelectionDialog = async (messageId: string, amount: number) => {
    await fetchUserCards();
    setCardSelectionDialog({ open: true, messageId, amount });
  };

  const claimMoneyGift = async (messageId: string, amount: number, cardId: string) => {
    if (!user) {
      showSnackbar('Вам нужно войти в систему, чтобы получить подарок', 'error');
      return;
    }
    setClaimingGift(messageId);
    try {
      // Step 1: Atomically claim the gift
      const { data: updatedMessage, error: claimError } = await supabase
        .from('chat_messages')
        .update({
          gift_claimed_by: user.id,
          gift_claimed_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .is('gift_claimed_by', null)
        .select()
        .single();

      if (claimError || !updatedMessage) {
        throw new Error('Подарок уже кто-то получил или произошла ошибка.');
      }

      // Step 2: Update the user's card balance
      const { data: card, error: cardError } = await supabase
        .from('bank_cards')
        .select('balance')
        .eq('id', cardId)
        .single();

      if (cardError) throw cardError;

      const newBalance = (card.balance || 0) + amount;

      const { error: updateBalanceError } = await supabase
        .from('bank_cards')
        .update({ balance: newBalance })
        .eq('id', cardId);

      if (updateBalanceError) {
        // If updating the balance fails, roll back the gift claim,
        // but only if this user was the one who claimed it.
        await supabase
          .from('chat_messages')
          .update({
            gift_claimed_by: null,
            gift_claimed_at: null,
          })
          .eq('id', messageId)
          .eq('gift_claimed_by', user.id);
        throw new Error('Не удалось обновить баланс. Подарок не был получен.');
      }

      // If everything is successful
      showSnackbar(`Вы получили ${amount} монет!`, 'success');
      setClaimedGifts(prev => new Set(prev).add(messageId));
      setCardSelectionDialog({ open: false, messageId: null, amount: 0 });
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, gift_claimed_by: user.id, gift_claimed_at: updatedMessage.gift_claimed_at } : m
      ));

    } catch (error: any) {
      console.error("Error claiming gift:", error);
      showSnackbar(error.message || 'Не удалось получить подарок', 'error');
    } finally {
      setClaimingGift(null);
    }
  };

  const sendChannelVoiceMessage = async (blob: Blob, duration: number) => {
    if (!blob || !user || !selectedChat || !isChannel(selectedChat)) return;

    if (selectedChat.admin_only && !isAdmin) {
      showSnackbar('Только администраторы могут отправлять голосовые сообщения в этот канал', 'error');
      return;
    }

    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-voice-${Date.now()}`,
        channel_id: selectedChat.id,
        user_id: user.id,
        message: '[Голосовое сообщение]',
        message_type: 'voice',
        is_edited: false,
        edited_at: null,
        created_at: new Date().toISOString(),
        user_name: userSettings?.chat_name || user.email || 'You',
        pfp_color: userSettings?.pfp_color || '#1976d2',
        pfp_icon: userSettings?.pfp_icon || 'Person',
        pfp_type: userSettings?.pfp_type || 'icon',
        pfp_image_url: userSettings?.pfp_image_url || '',
        pfp_gradient: userSettings?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
        reactions: [],
        is_optimistic: true, // Mark as optimistic for later replacement
      };

      // Add optimistic message immediately
      setMessages(currentMessages => [...currentMessages, optimisticMessage]);

      const timestamp = Date.now();
      const filename = `voice_${user.id}_${timestamp}.webm`;
      const filePath = `voice-messages/${selectedChat.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(filePath, blob, { contentType: 'audio/webm', cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-audio')
        .getPublicUrl(filePath);

      await supabase.from('chat_messages').insert({
        channel_id: selectedChat.id,
        user_id: user.id,
        message: '[Голосовое сообщение]',
        message_type: 'voice',
        audio_url: urlData.publicUrl,
        audio_duration: duration,
      });

      showSnackbar('Голосовое сообщение отправлено', 'success');
    } catch (error) {
      console.error('Error sending voice message:', error);
      showSnackbar('Ошибка при отправке голосового сообщения', 'error');
      
      // Remove optimistic message on error
      setMessages(currentMessages => 
        currentMessages.filter(msg => !msg.is_optimistic || msg.message_type !== 'voice')
      );
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
    isTyping,
    uploadProgress,
    handleDragOver,
    handleDrop,
  } = useChatInput(user, isChannel(selectedChat) ? selectedChat : null, isUserAdmin, showSnackbar, replyingTo, setReplyingTo, forceScrollToBottom, handleCommand);

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    if (!selectedChat || !user) return;

    if (isChannel(selectedChat)) {
      sendChannelVoiceMessage(blob, duration);
    } else {
      const receiver = selectedChat.participants.find(p => p.user_id !== user.id);
      if (receiver) {
        sendDm(receiver.user_id, '[Голосовое сообщение]', null, null, blob, duration);
      }
    }
  };

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cleanup: cleanupVoiceRecording,
  } = useVoiceRecording(handleRecordingComplete, showSnackbar);

  const handleSend = useCallback(() => {
    if (!selectedChat || !user || selectedChat.id === 'mangpt') return;

    const text = newMessage.trim();
    const file = selectedFile;
    const replyId = replyingTo?.id;

    if (!text && !file) return;

    // Check if this is a command (starts with /)
    if (text.startsWith('/')) {
      handleCommand(text);
      setNewMessage('');
      setReplyingTo(null);
      if(file) {
        handleCancelMedia();
      }
      return;
    }

    // Create optimistic message for immediate UI update
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      channel_id: isChannel(selectedChat) ? selectedChat.id : selectedChat.id,
      user_id: user.id,
      message: text,
      message_type: 'text',
      is_edited: false,
      edited_at: null,
      created_at: new Date().toISOString(),
      user_name: userSettings?.chat_name || user.email || 'You',
      pfp_color: userSettings?.pfp_color || '#1976d2',
      pfp_icon: userSettings?.pfp_icon || 'Person',
      pfp_type: userSettings?.pfp_type || 'icon',
      pfp_image_url: userSettings?.pfp_image_url || '',
      pfp_gradient: userSettings?.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
      reactions: [],
      reply_to: replyId || undefined,
      reply_to_message: replyingTo ? {
        id: replyingTo.id,
        message: replyingTo.message,
        user_id: replyingTo.user_id,
        user_name: replyingTo.user_name,
        pfp_color: replyingTo.pfp_color,
        pfp_icon: replyingTo.pfp_icon,
        pfp_type: replyingTo.pfp_type || 'icon',
        pfp_image_url: replyingTo.pfp_image_url || '',
        pfp_gradient: replyingTo.pfp_gradient || 'linear-gradient(45deg, #1976d2, #42a5f5)',
        created_at: replyingTo.created_at,
        message_type: replyingTo.message_type,
        media_url: replyingTo.media_url,
        media_type: replyingTo.media_type,
        audio_url: replyingTo.audio_url,
        channel_id: replyingTo.channel_id || '',
        is_edited: replyingTo.is_edited || false,
        edited_at: replyingTo.edited_at || null,
        reactions: [],
      } : undefined,
      is_optimistic: true, // Mark as optimistic for later replacement
    };

    // Add optimistic message immediately
    setMessages(currentMessages => [...currentMessages, optimisticMessage]);

    if (isChannel(selectedChat)) {
      if (file) {
        sendMediaMessage(); // useChatInput handles replies for channel media
      } else {
        sendMessage(); // useChatInput handles replies for channel text
      }
    } else {
      // Direct Message
      const receiver = selectedChat.participants.find(p => p.user_id !== user.id);
      if (receiver) {
        sendDm(receiver.user_id, text, file, replyId);
      }
    }

    // Reset input state
    setNewMessage('');
    setReplyingTo(null);
    if(file) {
      handleCancelMedia();
    }

  }, [selectedChat, user, selectedFile, newMessage, replyingTo, isChannel, sendMediaMessage, sendMessage, sendDm, handleCancelMedia, setNewMessage, setReplyingTo, userSettings, handleCommand]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

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
    console.log('handleReplyFromMenu called with:', selectedMessageForMenu);
    if (selectedMessageForMenu) {
      console.log('Setting replyingTo to:', selectedMessageForMenu);
      setReplyingTo(selectedMessageForMenu);
    } else {
      console.log('No selectedMessageForMenu found');
    }
    handleMessageMenuClose();
  };

  const handleCancelReply = () => {
    console.log('Cancelling reply, clearing replyingTo');
    setReplyingTo(null);
  };

  const handleMarketItemClick = useCallback((marketItemData: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
  }) => {
    // Convert the market item data to the format expected by ItemDetailsDialog
    const marketplaceItem: MarketplaceItem = {
      id: marketItemData.id,
      title: marketItemData.title,
      description: marketItemData.description,
      price: marketItemData.price,
      currency: marketItemData.currency,
      category: '',
      condition: 'new' as const,
      images: marketItemData.images,
      seller_id: '',
      seller_name: '',
      created_at: new Date().toISOString(),
      is_active: true,
      location: '',
      tags: []
    };
    setSelectedMarketItemForDetails(marketplaceItem);
  }, []);

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !isChannel(selectedChat)) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const existingReaction = message.reactions?.find(r => r.emoji === emoji && r.user_id === user.id);

    // Optimistic UI update
    if (existingReaction) {
      // Remove reaction
      const updatedReactions = message.reactions?.filter(r => r.id !== existingReaction.id) || [];
      setMessages(currentMessages =>
        currentMessages.map(m =>
          m.id === messageId ? { ...m, reactions: updatedReactions } : m
        )
      );
    } else {
      // Add reaction
      const newReaction = {
        id: `temp-${Date.now()}`, // Temporary ID
        message_id: messageId,
        user_id: user.id,
        emoji: emoji,
        channel_id: selectedChat.id,
        user_name: userSettings?.chat_name || 'You',
      };
      setMessages(currentMessages =>
        currentMessages.map(m =>
          m.id === messageId ? { ...m, reactions: [...(m.reactions || []), newReaction] } : m
        )
      );
    }

    try {
    // Perform the database operation
    if (existingReaction) {
      await supabase.from('message_reactions').delete().eq('id', existingReaction.id);
    } else {
        const { data, error } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji: emoji,
        channel_id: selectedChat.id,
        }).select().single();

        if (error) throw error;

        // Update the optimistic reaction with the real ID from database
        if (data) {
          setMessages(currentMessages =>
            currentMessages.map(m =>
              m.id === messageId 
                ? { 
                    ...m, 
                    reactions: m.reactions?.map(r => 
                      r.id.startsWith('temp-') && r.emoji === emoji && r.user_id === user.id
                        ? { ...r, id: data.id }
                        : r
                    ) || []
                  }
                : m
            )
          );
        }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      
      // Revert optimistic update on error
      if (existingReaction) {
        // Re-add the removed reaction
        setMessages(currentMessages =>
          currentMessages.map(m =>
            m.id === messageId 
              ? { ...m, reactions: [...(m.reactions || []), existingReaction] }
              : m
          )
        );
      } else {
        // Remove the added reaction
        setMessages(currentMessages =>
          currentMessages.map(m =>
            m.id === messageId 
              ? { 
                  ...m, 
                  reactions: m.reactions?.filter(r => 
                    !(r.id.startsWith('temp-') && r.emoji === emoji && r.user_id === user.id)
                  ) || []
                }
              : m
          )
        );
      }
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

  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [marketItemsLoading, setMarketItemsLoading] = useState(false);
  const [selectedMarketItem, setSelectedMarketItem] = useState<MarketplaceItem | null>(null);
  const [marketItemsCache, setMarketItemsCache] = useState<MarketplaceItem[]>([]);
  const [marketItemsPage, setMarketItemsPage] = useState(0);
  const [hasMoreMarketItems, setHasMoreMarketItems] = useState(true);
  const [marketItemsSearch, setMarketItemsSearch] = useState('');
  const ITEMS_PER_PAGE = 20;

  const fetchMarketItems = useCallback(async (page = 0, search = '') => {
      setMarketItemsLoading(true);
    
    try {
      let query = supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (search.trim()) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      if (page === 0) {
        setMarketItems(data || []);
        setMarketItemsCache(data || []);
      } else {
        setMarketItems(prev => [...prev, ...(data || [])]);
        setMarketItemsCache(prev => [...prev, ...(data || [])]);
      }
      
      setHasMoreMarketItems((data || []).length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching market items:', error);
    } finally {
          setMarketItemsLoading(false);
    }
  }, []);

  // Sidebar search state
  const [channelSearch, setChannelSearch] = useState('');

  // Sidebar filtered lists (must be declared before any early returns)
  const filteredChannels = useMemo(() => {
    const q = channelSearch.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(c =>
      c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
    );
  }, [channels, channelSearch]);

  const filteredDMs = useMemo(() => {
    const q = channelSearch.trim().toLowerCase();
    if (!q) return dmConversations;
    return dmConversations.filter(convo => {
      const other = convo.participants.find(p => p.user_id !== user?.id);
      return (other?.user_name || '').toLowerCase().includes(q) || (convo.last_message_content || '').toLowerCase().includes(q);
    });
  }, [dmConversations, channelSearch, user?.id]);

  const loadMoreMarketItems = useCallback(() => {
    if (!marketItemsLoading && hasMoreMarketItems) {
      const nextPage = marketItemsPage + 1;
      setMarketItemsPage(nextPage);
      fetchMarketItems(nextPage, marketItemsSearch);
    }
  }, [marketItemsLoading, hasMoreMarketItems, marketItemsPage, fetchMarketItems, marketItemsSearch]);

  const handleMarketItemsSearch = useCallback((search: string) => {
    setMarketItemsSearch(search);
    setMarketItemsPage(0);
    fetchMarketItems(0, search);
  }, [fetchMarketItems]);

  useEffect(() => {
    if (marketItemDialogOpen) {
      // Use cached data if available, otherwise fetch
      if (marketItemsCache.length > 0) {
        setMarketItems(marketItemsCache);
        setMarketItemsLoading(false);
      } else {
        fetchMarketItems(0, '');
      }
    } else {
      setSelectedMarketItem(null);
      setMarketItemsPage(0);
      setMarketItemsSearch('');
    }
  }, [marketItemDialogOpen, marketItemsCache.length, fetchMarketItems]);

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100vh"><CircularProgress /></Box>;
  }

  const renderChannels = () => (
    <List sx={{ flex: 1, overflowY: 'auto', py: 0 }}>
      {filteredChannels.map((channel) => (
        <ListItem key={channel.id} disablePadding>
          <ListItemButton
            selected={selectedChat?.id === channel.id}
            onClick={() => {
              setSelectedChat(channel);
              if (isMobile) setMobileDrawerOpen(false);
            }}
            sx={{
              py: isMobile ? 1.25 : 1,
              px: isMobile ? 2 : 1.5,
              borderRadius: isMobile ? 1 : 0,
              mx: isMobile ? 1 : 0,
              mb: isMobile ? 0.25 : 0,
              position: 'relative',
              '&:hover': {
                bgcolor: 'action.hover'
              },
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 3,
                  borderRadius: 3,
                  backgroundColor: 'primary.main'
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: isMobile ? 48 : 40 }}>
              {getChannelIcon(channel.icon)}
            </ListItemIcon>
            <ListItemText 
              primary={channel.name} 
              secondary={channel.description}
              primaryTypographyProps={{
                fontSize: isMobile ? '0.95rem' : '0.9rem',
                fontWeight: selectedChat?.id === channel.id ? 600 : 500
              }}
              secondaryTypographyProps={{
                fontSize: isMobile ? '0.8rem' : '0.75rem',
                noWrap: true,
                textOverflow: 'ellipsis'
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {channel.is_pinned && <PinIcon fontSize="small" />}
              {channel.admin_only && <AdminIcon fontSize="small" color="error" />}
            </Box>
          </ListItemButton>
        </ListItem>
      ))}
      
      {/* ManGPT AI Assistant */}
      <Divider sx={{ my: isMobile ? 0.5 : 1 }} />
      <Typography 
        variant="overline" 
        sx={{ 
          px: isMobile ? 2.5 : 2,
          py: isMobile ? 0.5 : 0.25,
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          fontWeight: 600,
          color: 'text.secondary'
        }}
      >
        AI Assistant
      </Typography>
      <ListItem disablePadding>
        <ListItemButton
          selected={selectedChat?.id === 'mangpt'}
          onClick={() => {
            setSelectedChat({ 
              id: 'mangpt', 
              name: 'ManGPT', 
              type: 'mangpt',
              participants: [],
              is_active: false,
              description: 'AI Assistant (Powered by humans)'
            } as any);
            if (isMobile) setMobileDrawerOpen(false);
          }}
          sx={{
            py: isMobile ? 1.5 : 1,
            px: isMobile ? 2 : 1,
            borderRadius: isMobile ? 1 : 0,
            mx: isMobile ? 1 : 0,
            mb: isMobile ? 0.5 : 0,
            '&.Mui-selected': {
              bgcolor: 'secondary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'secondary.dark',
              }
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: isMobile ? 48 : 40 }}>
            <Avatar sx={{ 
              width: isMobile ? 32 : 24, 
              height: isMobile ? 32 : 24, 
              bgcolor: theme.palette.secondary.main 
            }}>
              <BotIcon sx={{ fontSize: isMobile ? '1.2rem' : '1rem' }} />
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary="ManGPT"
            secondary="AI Assistant (Powered by humans)"
            primaryTypographyProps={{
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: selectedChat?.id === 'mangpt' ? 600 : 400
            }}
            secondaryTypographyProps={{ 
              noWrap: true, 
              textOverflow: 'ellipsis',
              fontSize: isMobile ? '0.8rem' : '0.75rem'
            }}
          />
        </ListItemButton>
      </ListItem>
      
      <Divider sx={{ my: isMobile ? 0.5 : 1 }} />
      <Typography 
        variant="overline" 
        sx={{ 
          px: isMobile ? 2.5 : 2,
          py: isMobile ? 0.5 : 0.25,
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          fontWeight: 600,
          color: 'text.secondary'
        }}
      >
        Direct Messages
      </Typography>
      {filteredDMs.map((convo) => {
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
              sx={{
                py: isMobile ? 1.25 : 1,
                px: isMobile ? 2 : 1.5,
                borderRadius: isMobile ? 1 : 0,
                mx: isMobile ? 1 : 0,
                mb: isMobile ? 0.25 : 0,
                position: 'relative',
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: 3,
                    backgroundColor: 'primary.main'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: isMobile ? 48 : 40 }}>
                <Avatar sx={{ 
                  width: isMobile ? 32 : 24, 
                  height: isMobile ? 32 : 24, 
                  bgcolor: otherParticipant?.pfp_color, 
                  fontSize: isMobile ? '0.9rem' : '0.8rem' 
                }}>
                  <IconComponent sx={{ fontSize: isMobile ? '1.2rem' : '1rem' }} />
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={otherParticipant?.user_name || 'User'}
                secondary={convo.last_message_content}
                primaryTypographyProps={{
                  fontSize: isMobile ? '0.95rem' : '0.9rem',
                  fontWeight: selectedChat?.id === convo.id ? 600 : 500
                }}
                secondaryTypographyProps={{ 
                  noWrap: true, 
                  textOverflow: 'ellipsis',
                  fontSize: isMobile ? '0.8rem' : '0.75rem'
                }}
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

  const handleSendManPay = async (amount: number) => {
    if (!user || !selectedChat || isChannel(selectedChat)) return;
    const receiver = selectedChat.participants.find(p => p.user_id !== user.id);
    if (!receiver) return;

    try {
      const { data, error } = await supabase.rpc('handle_manpay_transaction', {
        sender_id_in: user.id,
        receiver_id_in: receiver.user_id,
        amount_in: amount,
      });

      if (error) throw new Error(error.message);
      if (!data) throw new Error('Transaction failed for an unknown reason.');

      // If transaction is successful, send a message
      const manpayData = {
        manpay_amount: amount,
        manpay_sender_id: user.id,
        manpay_receiver_id: receiver.user_id,
        manpay_status: 'complete',
      };
      await sendDm(
        receiver.user_id,
        `Sent ${amount} МР`, // This is the content of the message
        null, // No file
        null, // No reply
        null, // No voice blob
        null, // No voice duration
        manpayData
      );
      showSnackbar('Перевод ManPay успешен!', 'success');
    } catch (error: any) {
      console.error('ManPay Error:', error);
      showSnackbar(error.message || 'Перевод ManPay не удался.', 'error');
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
          sx={{ 
            '& .MuiDrawer-paper': { 
              width: '85%', 
              maxWidth: 320,
              boxSizing: 'border-box',
              bgcolor: 'background.paper'
            } 
          }}
          ModalProps={{
            keepMounted: true // Better mobile performance
          }}
        >
          <Box sx={{ 
            p: isMobile ? 2.5 : 2, 
                        display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backdropFilter: 'blur(8px)',
            borderBottom: '2px solid',
            borderColor: 'primary.main',
            opacity: 0.95
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon color="primary" sx={{ fontSize: isMobile ? 28 : 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Чаты
              </Typography>
          </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton 
                onClick={() => setNewDmDialogOpen(true)}
                size="small"
                sx={{ 
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: isMobile ? 40 : 32,
                  height: isMobile ? 40 : 32,
                  '&:hover': { 
                    bgcolor: 'primary.dark',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <AddIcon />
              </IconButton>
              <IconButton 
                onClick={() => setMobileDrawerOpen(false)}
                size="small"
                sx={{
                  width: isMobile ? 40 : 32,
                  height: isMobile ? 40 : 32,
                  bgcolor: 'error.main',
                  color: 'white',
                  '&:hover': { 
                    bgcolor: 'error.dark',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ overflowY: 'auto', height: 'calc(100vh - 80px)', pt: 0 }}>
          {renderChannels()}
          </Box>
        </Drawer>
      ) : (
        <Box sx={{ width: 300, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 2, backdropFilter: 'saturate(160%) blur(8px)', backgroundImage: (theme.palette.mode === 'light')
            ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.paper} 70%, rgba(0,0,0,0.02) 100%)`
            : 'linear-gradient(180deg, rgba(26,26,26,1) 0%, rgba(26,26,26,0.9) 70%, rgba(255,255,255,0.04) 100%)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Чаты</Typography>
              <IconButton onClick={() => setNewDmDialogOpen(true)} sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
                <AddIcon />
              </IconButton>
            </Box>
            <TextField
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Поиск"
              size="small"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'background.default'
                }
              }}
            />
          </Box>
          <Box sx={{ overflowY: 'auto', flex: 1, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 3 } }}>
            {renderChannels()}
          </Box>
        </Box>
      )}

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ 
          p: isMobile ? 1.5 : 1, 
          borderBottom: '1px solid', 
          borderColor: 'divider', 
          flexShrink: 0,
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'saturate(180%) blur(10px)',
          backgroundImage: (theme.palette.mode === 'light')
            ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.paper} 70%, rgba(0,0,0,0.02) 100%)`
            : 'linear-gradient(180deg, rgba(26,26,26,1) 0%, rgba(26,26,26,0.9) 70%, rgba(255,255,255,0.04) 100%)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1.5 : 1, flex: 1, minWidth: 0 }}>
            {isMobile && (
                <IconButton 
                  onClick={() => setMobileDrawerOpen(true)}
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' }
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography 
                  variant={isMobile ? "h6" : "h6"} 
                  sx={{ 
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: 0.2
                  }}
                >
                {selectedChat ? (
                  selectedChat.id === 'mangpt' ? 'ManGPT' : 
                  isChannel(selectedChat) ? selectedChat.name : 
                  selectedChat.participants?.find(p => p.user_id !== user?.id)?.user_name || 'DM'
                ) : 'Глобальный чат'}
              </Typography>
                {isMobile && selectedChat && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isChannel(selectedChat) ? 'Канал' : 'Личное сообщение'}
                  </Typography>
                )}
              </Box>
            </Box>
            {isChannel(selectedChat) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Расширенный поиск">
                  <IconButton 
                    onClick={() => setSearchDialogOpen(true)}
                    sx={{ 
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Box>

        {selectedChat ? (
          <>
            {/* ManGPT Chat */}
            {selectedChat.id === 'mangpt' ? (
              <Box sx={{ flex: 1, overflowY: 'hidden', position: 'relative' }}>
                <ManGPT />
              </Box>
            ) : (
          <>
            {/* Messages */}
            <Fade in={!conversationLoading} timeout={400}>
              <Box 
                ref={chatContainerRef} 
                sx={{ 
                  flex: 1, 
                  overflowY: 'hidden', 
                  position: 'relative',
                  bgcolor: 'background.default'
                }} 
                onScroll={handleScroll}
              >
                {conversationLoading ? (
                  // Skeleton loading for messages
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[...Array(5)].map((_, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Skeleton variant="text" width="60%" height={20} />
                          <Skeleton variant="text" width="80%" height={16} />
                          <Skeleton variant="text" width="40%" height={16} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : messages.length > 0 ? (
                    <VirtualizedMessageList
                      messages={visibleMessages}
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
                  formatAudioTime={formatAudioTime}
                  openCardSelectionDialog={openCardSelectionDialog}
                  claimingGift={claimingGift}
                      onToggleReaction={handleToggleReaction}
                  onStartDm={startDmWithUser}
                      participants={isChannel(selectedChat) ? [] : (selectedChat.participants || [])}
                      searchQuery={searchQuery}
                      pinnedMessages={pinnedMessages}
                      onPinMessage={handlePinMessage}
                      onUnpinMessage={handleUnpinMessage}
                      showReadReceipts={showReadReceipts}
                      readBy={readBy}
                      loading={loadingMore}
                      onLoadMore={loadMoreMessages}
                      hasMore={hasMoreMessages}
                    onMarketItemClick={handleMarketItemClick}
                    onReplyPreviewClick={handleMessageSelect}
                    />
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography variant="body1" color="text.secondary">
                        Нет сообщений
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Typing indicators disabled for better performance */}
            </Box>
            </Fade>

            {/* Message Input */}
            <Fade in={!conversationLoading} timeout={500}>
                <Box 
                  sx={{ 
                  p: isMobile ? 1.25 : 1.5, 
                    borderTop: '1px solid', 
                    borderColor: 'divider', 
                    bgcolor: 'background.paper', 
                    flexShrink: 0,
                  transition: 'all 0.2s ease-in-out',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10,
                  backdropFilter: 'saturate(160%) blur(8px)'
                  }}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
              {isRecording ? (
                <Box 
                  sx={{ 
                    p: 1.5, 
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'error.main',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, transparent 30%, rgba(244, 67, 54, 0.05) 50%, transparent 70%)',
                      animation: 'recordingShine 3s ease-in-out infinite',
                    },
                    '@keyframes recordingShine': {
                      '0%': { transform: 'translateX(-100%)' },
                      '100%': { transform: 'translateX(100%)' }
                    }
                  }}
                >
                  {/* Inline Recording Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: 'error.main',
                          animation: 'recordingPulse 2s ease-in-out infinite',
                          '@keyframes recordingPulse': {
                            '0%, 100%': { 
                              transform: 'scale(1)',
                              opacity: 1
                            },
                            '50%': { 
                              transform: 'scale(1.3)',
                              opacity: 0.7
                            }
                          }
                        }}
                      />
                      <Typography variant="body2" color="error.main" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                        Запись
                      </Typography>
                    </Box>

                    <Typography 
                      variant="body2" 
                      color="error.main" 
                      sx={{ 
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}
                    >
                      {formatRecordingTime(recordingTime)}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        onClick={stopRecording}
                        size="small"
                        sx={{
                          bgcolor: 'error.main',
                          color: 'white',
                          width: 32,
                          height: 32,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'error.dark',
                            transform: 'scale(1.05)'
                          }
                        }}
                      >
                        <StopIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <>
                  {replyingTo && (
                    <Box sx={{ 
                      p: isMobile ? 1.5 : 1, 
                      mb: 1, 
                      bgcolor: 'action.hover', 
                      borderRadius: isMobile ? 2 : 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      opacity: 0.9
                    }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                          Ответ на {replyingTo.user_name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {replyingTo.message}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={handleCancelReply}
                        sx={{ 
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  {mediaPreview && (
                    <Box sx={{ 
                      p: isMobile ? 1.5 : 1, 
                      mb: 1, 
                      bgcolor: 'action.hover', 
                      borderRadius: isMobile ? 2 : 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      border: '1px solid',
                      borderColor: 'primary.main',
                      opacity: 0.9
                    }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                          Вложение
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {selectedFile?.name}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={handleCancelMedia}
                        sx={{ 
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'error.dark' }
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                      {uploadingMedia && uploadProgress > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <LinearProgress variant="determinate" value={uploadProgress} />
                          <Typography variant="caption" color="text.secondary">
                            Загрузка: {uploadProgress}%
                          </Typography>
                    </Box>
                  )}
                  <Box 
                    display="flex" 
                    gap={isMobile ? 0.75 : 1}
                    alignItems="flex-end"
                    sx={{
                      p: isMobile ? 0.5 : 0.75,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: theme.palette.mode === 'light' ? '0 4px 14px rgba(0,0,0,0.06)' : '0 6px 18px rgba(0,0,0,0.35)',
                      bgcolor: 'background.paper',
                      '& .MuiTextField-root': {
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          bgcolor: 'background.default'
                        }
                      }
                    }}
                  >
                    <TextField
                      fullWidth
                      placeholder={isMobile ? "Сообщение..." : "Введите сообщение..."}
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      multiline
                      maxRows={isMobile ? 3 : 1}
                          sx={{
                            '& .MuiInputBase-root': {
                          fontSize: isMobile ? '0.9rem' : '0.95rem',
                          py: isMobile ? 0.5 : 0.25,
                          minHeight: isMobile ? 44 : 40,
                          borderRadius: isMobile ? 2 : 1,
                          alignItems: 'flex-end',
                            },
                            '& textarea': {
                          fontSize: isMobile ? '0.9rem' : '0.95rem',
                          lineHeight: isMobile ? 1.4 : 1.2,
                          paddingTop: isMobile ? '8px' : '6px',
                          paddingBottom: isMobile ? '8px' : '6px',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'divider',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                            },
                          }}
                        />
                    <input
                      accept="image/*,video/*,audio/*"
                      style={{ display: 'none' }}
                      id="upload-media-input"
                      type="file"
                      onChange={handleFileSelect}
                    />
                    <IconButton 
                      onClick={(event) => setAttachmentMenuAnchor(event.currentTarget)}
                      disabled={!selectedChat || uploadingMedia}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: isMobile ? 44 : 40,
                        height: isMobile ? 44 : 40,
                        transition: 'all 0.3s ease',
                        borderRadius: isMobile ? 2 : 1,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          transform: isMobile ? 'scale(1.05)' : 'scale(1.1)',
                          boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)'
                        },
                        '&:active': {
                          transform: 'scale(0.95)'
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'action.disabledBackground',
                          color: 'action.disabled'
                        }
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: isMobile ? 20 : 18 }} />
                    </IconButton>
                    <IconButton 
                      onClick={startRecording} 
                      disabled={!selectedChat}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: isMobile ? 44 : 40,
                        height: isMobile ? 44 : 40,
                        transition: 'all 0.3s ease',
                        borderRadius: isMobile ? 2 : 1,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          transform: 'scale(1.1)',
                          boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)'
                        },
                        '&:active': {
                          transform: 'scale(0.95)'
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'action.disabledBackground',
                          color: 'action.disabled'
                        }
                      }}
                    >
                      <MicIcon />
                    </IconButton>
                    {selectedChat && !isChannel(selectedChat) && selectedChat.id !== 'mangpt' && (
                      <IconButton 
                        onClick={() => setManPayDialogOpen(true)}
                        disabled={!selectedChat}
                        sx={{
                          bgcolor: 'success.main',
                          color: 'white',
                          width: isMobile ? 44 : 40,
                          height: isMobile ? 44 : 40,
                          transition: 'all 0.3s ease',
                          borderRadius: isMobile ? 2 : 1,
                          '&:hover': {
                            bgcolor: 'success.dark',
                            transform: isMobile ? 'scale(1.05)' : 'scale(1.1)',
                            boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                          },
                          '&:active': {
                            transform: 'scale(0.95)'
                          },
                          '&.Mui-disabled': {
                            bgcolor: 'action.disabledBackground',
                            color: 'action.disabled'
                          }
                        }}
                      >
                        <AccountBalanceWalletIcon sx={{ fontSize: isMobile ? 20 : 18 }} />
                      </IconButton>
                    )}
                    <IconButton 
                      onClick={handleSend} 
                      disabled={(!selectedFile && !newMessage.trim()) || sending || uploadingMedia}
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        width: isMobile ? 44 : 40,
                        height: isMobile ? 44 : 40,
                        transition: 'all 0.3s ease',
                        borderRadius: isMobile ? 2 : 1,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          transform: isMobile ? 'scale(1.05)' : 'scale(1.1)',
                          boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)'
                        },
                        '&:active': {
                          transform: 'scale(0.95)'
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'action.disabledBackground',
                          color: 'action.disabled'
                        }
                      }}
                    >
                      {sending || uploadingMedia ? (
                        <CircularProgress size={isMobile ? 20 : 18} color="inherit" />
                      ) : (
                        <SendIcon sx={{ fontSize: isMobile ? 20 : 18 }} />
                      )}
                    </IconButton>
                  </Box>
                </>
              )}
            </Box>
              </Fade>
              </>
            )}
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
        {selectedMessageForMenu && selectedMessageForMenu.user_id === user?.id && (
          <>
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
          </>
        )}
      </Menu>

      {/* Attachment Menu */}
      <Menu
        anchorEl={attachmentMenuAnchor}
        open={Boolean(attachmentMenuAnchor)}
        onClose={() => setAttachmentMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          document.getElementById('upload-media-input')?.click();
          setAttachmentMenuAnchor(null);
        }}>
          <ListItemIcon>
            <AddPhotoIcon fontSize="small" />
          </ListItemIcon>
          Медиа файл
        </MenuItem>
        <MenuItem onClick={() => {
          setMarketItemDialogOpen(true);
          setAttachmentMenuAnchor(null);
        }}>
          <ListItemIcon>
            <StoreIcon fontSize="small" />
          </ListItemIcon>
          Товар с рынка
        </MenuItem>
      </Menu>

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
            Получите {cardSelectionDialog.amount} МР на выбранную карту:
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="card-select-label">Выберите карту</InputLabel>
            <Select
              labelId="card-select-label"
              value={selectedCardIdForGift}
              label="Выберите карту"
              onChange={(e) => setSelectedCardIdForGift(e.target.value)}
            >
              {userCards.map((card) => (
                <MenuItem key={card.id} value={card.id}>
                  {card.card_name} ({card.card_number}) - {card.balance} {card.currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCardSelectionDialog({ open: false, messageId: null, amount: 0 })}>Отмена</Button>
          <Button
            onClick={() => {
              if (cardSelectionDialog.messageId && selectedCardIdForGift) {
                claimMoneyGift(cardSelectionDialog.messageId, cardSelectionDialog.amount, selectedCardIdForGift);
              }
            }}
            disabled={!selectedCardIdForGift || !!claimingGift}
            variant="contained"
          >
            {claimingGift ? <CircularProgress size={24} /> : 'Получить'}
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
    {selectedChat && !isChannel(selectedChat) && selectedChat.id !== 'mangpt' && (
      <ManPayDialog
        open={manPayDialogOpen}
        onClose={() => setManPayDialogOpen(false)}
        onSend={handleSendManPay}
        receiverName={selectedChat.participants.find(p => p.user_id !== user?.id)?.user_name || 'user'}
      />
    )}
    
    {/* Message Search Dialog */}
    {selectedChat && isChannel(selectedChat) && (
      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <MessageSearch
          channelId={selectedChat.id}
          onMessageSelect={handleMessageSelect}
          onClose={() => setSearchDialogOpen(false)}
        />
      </Dialog>
    )}
    
    {/* Market Item Selection Dialog */}
    <Dialog
      open={marketItemDialogOpen}
      onClose={() => setMarketItemDialogOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StoreIcon color="primary" />
          <Typography variant="h6">
            Выберите товар для отправки
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Выберите товар с рынка, который хотите поделиться в чате:
        </Typography>
        
        {/* Search Box */}
        <TextField
          fullWidth
          placeholder="Поиск товаров..."
          value={marketItemsSearch}
          onChange={(e) => handleMarketItemsSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        
        {/* Market Items List */}
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {marketItemsLoading && marketItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Загрузка товаров с рынка...
            </Typography>
          ) : marketItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {marketItemsSearch ? 'Товары не найдены' : 'Нет доступных товаров'}
            </Typography>
          ) : (
            <>
              {marketItems.map(item => (
              <MenuItem
                key={item.id}
                selected={selectedMarketItem?.id === item.id}
                onClick={() => setSelectedMarketItem(item)}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: selectedMarketItem?.id === item.id ? 'action.selected' : 'inherit',
                }}
              >
                <Box sx={{ width: 48, height: 48, flexShrink: 0, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <StoreIcon color="disabled" />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={500}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>{item.description}</Typography>
                </Box>
                <Typography variant="subtitle2" color="primary.main" fontWeight={600}>
                  {item.price} {item.currency || 'MR'}
                </Typography>
              </MenuItem>
              ))}
              {hasMoreMarketItems && (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Button 
                    onClick={loadMoreMarketItems}
                    disabled={marketItemsLoading}
                    variant="outlined"
                    size="small"
                  >
                    {marketItemsLoading ? 'Загрузка...' : 'Загрузить еще'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setMarketItemDialogOpen(false)}>Отмена</Button>
        <Button
          onClick={async () => {
            if (!selectedMarketItem || !user || !selectedChat) return;
            
            try {
              const { error } = await supabase
                .from('chat_messages')
                .insert({
                  channel_id: selectedChat.id,
                  user_id: user.id,
                  message: `Поделился товаром: ${selectedMarketItem.title}`,
                  message_type: 'market_item',
                  market_item_id: selectedMarketItem.id,
                  market_item_title: selectedMarketItem.title,
                  market_item_price: selectedMarketItem.price,
                  market_item_currency: selectedMarketItem.currency,
                  market_item_image: selectedMarketItem.images && selectedMarketItem.images.length > 0 ? selectedMarketItem.images[0] : null,
                });

              if (error) throw error;

            setMarketItemDialogOpen(false);
              setSelectedMarketItem(null);
            } catch (error) {
              console.error('Error sending market item:', error);
              // You might want to show a snackbar here
            }
          }}
          variant="contained"
          disabled={!selectedMarketItem}
        >
          Отправить
        </Button>
      </DialogActions>
    </Dialog>

          {/* Market Item Details Dialog */}
      {selectedMarketItemForDetails && (
        <ItemDetailsDialog
          item={selectedMarketItemForDetails}
          open={!!selectedMarketItemForDetails}
          onClose={() => setSelectedMarketItemForDetails(null)}
          onPurchased={() => {
            // Refresh market items if needed
            setSelectedMarketItemForDetails(null);
          }}
        />
      )}


    </>
  );
}; 