import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, CircularProgress, Typography, Fab, Button } from '@mui/material';
import { KeyboardArrowDown as ScrollDownIcon, KeyboardArrowUp as LoadMoreIcon } from '@mui/icons-material';
import Message from './Message';
import { ChatMessage } from '../types';

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  isMobile: boolean;
  user: any;
  editingMessage: string | null;
  editText: string;
  setEditText: (text: string) => void;
  editMessage: (messageId: string) => void;
  setEditingMessage: (id: string | null) => void;
  handleMessageMenuOpen: (event: React.MouseEvent<HTMLElement>, message: ChatMessage) => void;
  getProfileIconComponent: (iconName: string) => React.ComponentType<any>;
  AnimatedDevIcon: React.ComponentType<any>;
  formatTime: (dateString: string) => string;
  isPlaying: string | null;
  playAudio: (audioUrl: string, messageId: string) => void;
  audioProgress: { [key: string]: number };
  formatAudioTime: (seconds: number) => string;
  openCardSelectionDialog: (messageId: string, amount: number) => void;
  claimingGift: string | null;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onStartDm: (userId: string) => void;
  participants: { user_id: string; user_name: string }[];
  searchQuery?: string;
  pinnedMessages?: Set<string>;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  showReadReceipts?: boolean;
  readBy?: { [messageId: string]: string[] };
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onMarketItemClick?: (marketItemData: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
  }) => void;
  onReplyPreviewClick?: (messageId: string) => void;
}

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  isMobile,
  user,
  editingMessage,
  editText,
  setEditText,
  editMessage,
  setEditingMessage,
  handleMessageMenuOpen,
  getProfileIconComponent,
  AnimatedDevIcon,
  formatTime,
  isPlaying,
  playAudio,
  audioProgress,
  formatAudioTime,
  openCardSelectionDialog,
  claimingGift,
  onToggleReaction,
  onStartDm,
  participants,
  searchQuery = '',
  pinnedMessages = new Set(),
  onPinMessage,
  onUnpinMessage,
  showReadReceipts = false,
  readBy = {},
  loading = false,
  onLoadMore,
  hasMore = false,
  onMarketItemClick,
  onReplyPreviewClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [displayedMessageCount, setDisplayedMessageCount] = useState(15);

  // Smart loading: start with recent messages, load older ones on demand
  const visibleMessages = useMemo(() => {
    // Show the most recent messages based on displayedMessageCount
    const recentMessages = messages.slice(-displayedMessageCount);
    return recentMessages;
  }, [messages, displayedMessageCount]);

  // Performance optimization: Limit rendered message types to prevent lag
  const shouldRenderMessage = useCallback((message: ChatMessage) => {
    // Always render text messages
    if (message.message_type === 'text') return true;
    
    // Limit heavy widgets to prevent lag
    const heavyWidgetTypes = ['money_gift', 'image', 'video', 'voice'];
    if (heavyWidgetTypes.includes(message.message_type)) {
      // Only render heavy widgets if they're in the visible area
      return true; // For now, render all. In the future, we could add intersection observer
    }
    
    return true;
  }, []);

  // Filter messages to only render necessary ones
  const filteredMessages = useMemo(() => {
    return messages.filter(shouldRenderMessage);
  }, [messages, shouldRenderMessage]);

  // Use filtered messages for rendering
  const items = useMemo(() => {
    return filteredMessages.map((message, index) => ({
      id: message.id,
      message,
      index,
    }));
  }, [filteredMessages]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isBottom = scrollTop + clientHeight >= scrollHeight - 50;
    setIsAtBottom(isBottom);

    // Show load more button when scrolling up and there are more messages
    if (scrollTop < 200 && hasMore && messages.length > displayedMessageCount) {
      setShowLoadMoreButton(true);
    } else {
      setShowLoadMoreButton(false);
    }
  }, [hasMore, messages.length, displayedMessageCount]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setIsAtBottom(true);
      setShowLoadMoreButton(false);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (isAtBottom && messages.length > 0 && !loading) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom, scrollToBottom, loading]);

  // Mark initial load as complete after first render
  useEffect(() => {
    if (messages.length > 0 && !initialLoadComplete) {
      setInitialLoadComplete(true);
      // Auto-scroll to bottom on initial load
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages.length, initialLoadComplete, scrollToBottom]);

  // Handle loading more messages
  const handleLoadMore = useCallback(() => {
    if (onLoadMore) {
      // Store current scroll position before loading
      const currentScrollTop = containerRef.current?.scrollTop || 0;
      const currentScrollHeight = containerRef.current?.scrollHeight || 0;
      
      onLoadMore();
      
      // Increase the number of displayed messages
      setDisplayedMessageCount(prev => Math.min(prev + 50, messages.length));
      
      // After loading, restore scroll position to maintain user's place
      setTimeout(() => {
        if (containerRef.current) {
          const newScrollHeight = containerRef.current.scrollHeight;
          const heightDifference = newScrollHeight - currentScrollHeight;
          containerRef.current.scrollTop = currentScrollTop + heightDifference;
        }
      }, 100);
    }
  }, [onLoadMore, messages.length]);

  if (loading && messages.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="body1" color="text.secondary">
          Нет сообщений
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      {/* Load more button - appears when scrolling up */}
      {showLoadMoreButton && hasMore && (
        <Box sx={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 1000, 
          p: isMobile ? 1.5 : 1, 
          textAlign: 'center', 
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          bgcolor: 'rgba(255, 255, 255, 0.9)'
        }}>
          <Button
            variant="contained"
            size={isMobile ? "medium" : "small"}
            onClick={handleLoadMore}
            startIcon={<LoadMoreIcon />}
            disabled={loading}
            sx={{
              borderRadius: isMobile ? 2 : 1,
              px: isMobile ? 3 : 2,
              py: isMobile ? 1 : 0.5,
              fontWeight: 600,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-1px)'
              }
            }}
          >
            {loading ? 'Загрузка...' : `Загрузить еще (${messages.length - displayedMessageCount}+)`}
          </Button>
        </Box>
      )}
      
      {/* Messages Container */}
      <Box
        ref={containerRef}
        sx={{
          height: '100%',
          overflowY: 'auto',
          p: isMobile ? 1 : 2,
          scrollBehavior: 'smooth',
          // Performance optimizations
          willChange: 'scroll-position',
          WebkitOverflowScrolling: 'touch',
          // Mobile-specific improvements
          ...(isMobile && {
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '2px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0, 0, 0, 0.3)',
            },
          }),
        }}
        onScroll={handleScroll}
      >
        {/* Show message count info */}
        {messages.length > displayedMessageCount && (
          <Box sx={{ p: 1, textAlign: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Показано {displayedMessageCount} последних сообщений из {messages.length}
            </Typography>
          </Box>
        )}
        
        {/* Render visible messages */}
        {visibleMessages.map((message) => (
          <Box key={message.id} id={`message-${message.id}`}>
            <Message
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
              formatAudioTime={formatAudioTime}
              openCardSelectionDialog={openCardSelectionDialog}
              claimingGift={claimingGift}
              onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
              onStartDm={onStartDm}
              participants={participants}
              searchQuery={searchQuery}
              isPinned={pinnedMessages.has(message.id)}
              onPinMessage={onPinMessage}
              onUnpinMessage={onUnpinMessage}
              showReadReceipts={showReadReceipts}
              readBy={readBy[message.id] || []}
              onMarketItemClick={onMarketItemClick}
              onReplyPreviewClick={onReplyPreviewClick}
            />
          </Box>
        ))}
      </Box>
      
      {/* Scroll to bottom button - completely hidden on mobile */}
      {!isAtBottom && !isMobile && (
        <Fab
          size="small"
          onClick={scrollToBottom}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            bgcolor: 'primary.main',
            color: 'white',
            boxShadow: 4,
            '&:hover': {
              bgcolor: 'primary.dark',
              transform: 'scale(1.1)',
              boxShadow: 6,
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ScrollDownIcon />
        </Fab>
      )}
    </Box>
  );
};

export default VirtualizedMessageList; 