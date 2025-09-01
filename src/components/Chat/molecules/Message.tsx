import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Avatar, IconButton, TextField, CircularProgress, Button, Tooltip, Chip, LinearProgress, Card, CardContent, CardMedia } from '@mui/material';
import AddReactionIcon from '@mui/icons-material/AddReaction';
import ReactionPill from './ReactionPill';
import EmojiPicker from './EmojiPicker';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Reply as ReplyIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  CardGiftcard as GiftIcon,
  Money as MoneyIcon,
  PushPin as PinIcon,
  Search as SearchIcon,
  CheckCircle as ReadIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import { ChatMessage } from '../types';

interface MessageProps {
  message: ChatMessage;
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
  onToggleReaction: (emoji: string) => void;
  onStartDm: (userId: string) => void;
  participants: { user_id: string; user_name: string }[];
  searchQuery?: string;
  isPinned?: boolean;
  onPinMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  showReadReceipts?: boolean;
  readBy?: string[];
  onMarketItemClick?: (marketItemData: {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
  }) => void;
}

const Message: React.FC<MessageProps> = React.memo(({
  message,
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
  isPinned = false,
  onPinMessage,
  onUnpinMessage,
  showReadReceipts = false,
  readBy = [],
  onMarketItemClick,
}) => {
  // Memoize the voice message widget to prevent unnecessary re-renders
  const voiceMessageWidget = useMemo(() => {
    if (message.message_type !== 'voice') return null;
    
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5, 
        p: 1.5, 
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        minWidth: isMobile ? 200 : 260,
        maxWidth: isMobile ? 280 : 340,
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: 'action.selected',
        }
      }}>
        {/* Play/pause button */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            message.audio_url && playAudio(message.audio_url, message.id);
          }}
          sx={{ 
            bgcolor: isPlaying === message.id ? 'error.main' : 'primary.main',
            color: 'white',
            width: 36,
            height: 36,
            transition: 'all 0.2s ease',
            '&:hover': { 
              bgcolor: isPlaying === message.id ? 'error.dark' : 'primary.dark',
              transform: 'scale(1.05)',
            },
            '&:active': {
              transform: 'scale(0.98)'
            }
          }}
        >
          {isPlaying === message.id ? <StopIcon /> : <PlayIcon />}
        </IconButton>
        
        {/* Audio progress and duration */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Progress bar */}
          <Box sx={{ 
            position: 'relative',
            height: 3,
            bgcolor: 'action.disabledBackground',
            borderRadius: 1.5,
            overflow: 'hidden',
            mb: 0.5
          }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${audioProgress[message.id] ? (audioProgress[message.id] / (message.audio_duration || 1)) * 100 : 0}%`,
                bgcolor: 'primary.main',
                borderRadius: 1.5,
                transition: 'width 0.1s ease',
              }}
            />
            {/* Simple indicator when playing */}
            {isPlaying === message.id && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 4,
                height: 4,
                bgcolor: 'primary.main',
                borderRadius: '50%',
                opacity: 0.8
              }} />
            )}
          </Box>
          
          {/* Time display */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.7rem'
              }}
            >
              {formatAudioTime(audioProgress[message.id] || 0)}
            </Typography>
            
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: '0.7rem'
              }}
            >
              {formatAudioTime(message.audio_duration || 0)}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }, [
    message.message_type,
    message.audio_url,
    message.audio_duration,
    message.id,
    isMobile,
    isPlaying,
    audioProgress,
    playAudio,
    formatAudioTime
  ]);

  // Memoize expensive computations
  const messageContent = useMemo(() => {
    if (editingMessage === message.id) {
      return (
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
      );
    }

    // Memoize different message types to prevent unnecessary re-renders
    switch (message.message_type) {
      case 'voice':
        return voiceMessageWidget;
      
      case 'money_gift':
        return (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'success.light', 
            borderRadius: 2, 
            border: '2px solid',
            borderColor: 'success.main',
            textAlign: 'center',
            maxWidth: 300
          }}>
            <Typography variant="h6" color="success.dark" sx={{ mb: 1 }}>
              🎁 Подарок
            </Typography>
            <Typography variant="h4" color="success.dark" sx={{ fontWeight: 'bold', mb: 1 }}>
              {message.gift_amount} МР
            </Typography>
            {message.gift_claimed_by ? (
              <Typography variant="body2" color="success.dark">
                Получен пользователем
              </Typography>
            ) : (
              <Button
                variant="contained"
                color="success"
                onClick={() => openCardSelectionDialog(message.id, message.gift_amount || 0)}
                disabled={claimingGift === message.id}
                sx={{ mt: 1 }}
              >
                {claimingGift === message.id ? 'Получение...' : 'Получить подарок'}
              </Button>
            )}
          </Box>
        );
      
      case 'image':
        return (
          <Box sx={{ maxWidth: '100%', borderRadius: 1, overflow: 'hidden' }}>
            <img
              src={message.media_url}
              alt="Image"
              style={{ maxWidth: '100%', height: 'auto' }}
              loading="lazy" // Lazy load images for better performance
            />
          </Box>
        );
      
      case 'video':
        return (
          <Box sx={{ maxWidth: '100%', borderRadius: 1, overflow: 'hidden' }}>
            <video
              controls
              style={{ maxWidth: '100%', height: 'auto' }}
              preload="metadata" // Only load metadata for better performance
            >
              <source src={message.media_url} type={message.media_type} />
              Your browser does not support the video tag.
            </video>
          </Box>
        );
      
      case 'market_item':
        return (
          <Card sx={{ 
            maxWidth: 280,
            cursor: 'pointer',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 3
            }
          }} onClick={() => {
            if (onMarketItemClick && message.market_item_id) {
              onMarketItemClick({
                id: message.market_item_id,
                title: message.market_item_title || '',
                description: message.message,
                price: message.market_item_price || 0,
                currency: message.market_item_currency || 'MR',
                images: message.market_item_image ? [message.market_item_image] : []
              });
            }
          }}>
            {message.market_item_image ? (
              <CardMedia
                component="img"
                height="160"
                image={message.market_item_image}
                alt={message.market_item_title}
                sx={{ objectFit: 'cover' }}
              />
            ) : (
              <Box sx={{ height: 100, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Нет изображения
                </Typography>
              </Box>
            )}
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
              <Typography variant="h6" noWrap title={message.market_item_title} sx={{ mb: 1 }}>
                {message.market_item_title}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  mb: 1
                }}
              >
                {message.message}
              </Typography>
              <Typography variant="subtitle1" color="primary" sx={{ mt: 'auto', fontWeight: 'bold' }}>
                {message.market_item_price} {message.market_item_currency || 'MR'}
              </Typography>
            </CardContent>
          </Card>
        );
      
      default:
        return (
          <Typography 
            variant="body1" 
            sx={{ 
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          >
            {message.message}
          </Typography>
        );
    }
  }, [
    editingMessage,
    message.id,
    message.message_type,
    message.audio_url,
    message.audio_duration,
    message.gift_amount,
    message.gift_claimed_by,
    message.media_url,
    message.media_type,
    message.message,
    message.market_item_id,
    message.market_item_title,
    message.market_item_price,
    message.market_item_currency,
    message.market_item_image,
    editText,
    setEditText,
    editMessage,
    setEditingMessage,
    isMobile,
    isPlaying,
    playAudio,
    audioProgress,
    formatAudioTime,
    openCardSelectionDialog,
    claimingGift,
    voiceMessageWidget
  ]);

  // Memoize the profile icon component
  const ProfileIconComponent = useMemo(() => 
    getProfileIconComponent(message.pfp_icon || 'Person'),
    [getProfileIconComponent, message.pfp_icon]
  );

  // Memoize the message menu handler
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    handleMessageMenuOpen(event, message);
  }, [handleMessageMenuOpen, message]);

  // Memoize the reaction toggle handler
  const handleReactionToggle = useCallback((emoji: string) => {
    onToggleReaction(emoji);
  }, [onToggleReaction]);

  // Memoize the start DM handler
  const handleStartDm = useCallback(() => {
    onStartDm(message.user_id);
  }, [onStartDm, message.user_id]);

  // Memoize the pin/unpin handlers
  const handlePin = useCallback(() => {
    onPinMessage?.(message.id);
  }, [onPinMessage, message.id]);

  const handleUnpin = useCallback(() => {
    onUnpinMessage?.(message.id);
  }, [onUnpinMessage, message.id]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Memoize expensive computations
  const reactionsGrouped = useMemo(() => {
    return (message.reactions || []).reduce<{[key: string]: typeof message.reactions}>((acc, reaction) => {
      const key = reaction.emoji;
      const existing = acc[key] || [];
      acc[key] = [...existing, reaction];
      return acc;
    }, {});
  }, [message.reactions]);

  // Highlight search terms
  const highlightedMessage = useMemo(() => {
    if (!searchQuery || !message.message) return message.message;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = message.message.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <Box key={index} component="span" sx={{ 
          backgroundColor: 'warning.light', 
          color: 'warning.contrastText',
          borderRadius: 0.5,
          px: 0.5,
          fontWeight: 'bold'
        }}>
          {part}
        </Box>
      ) : part
    );
  }, [message.message, searchQuery]);

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.id !== message.user_id) {
      onStartDm(message.user_id);
    }
  };

  const handleReactionClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePinMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinned && onUnpinMessage) {
      onUnpinMessage(message.id);
    } else if (!isPinned && onPinMessage) {
      onPinMessage(message.id);
    }
  };

  const isOwnMessage = user?.id === message.user_id;
  const isRead = readBy.includes(user?.id || '');
  const isPending = message.message_type === 'text' && !isRead && isOwnMessage;

  return (
    <Box
      key={message.id}
      sx={{
        display: 'flex',
        gap: isMobile ? 0.75 : 1,
        alignItems: 'flex-start',
        cursor: isOwnMessage ? 'pointer' : 'default',
        position: 'relative',
        mb: isMobile ? 1.5 : 1,
        p: isMobile ? 0.5 : 0,
        borderRadius: isMobile ? 1 : 0,
        '&:hover': isOwnMessage ? {
          backgroundColor: 'action.hover',
          borderRadius: isMobile ? 2 : 1,
          p: isMobile ? 1 : 0.5,
          m: isMobile ? -0.5 : -0.5,
        } : {},
        borderLeft: isPinned ? 3 : 0,
        borderColor: 'warning.main',
        pl: isPinned ? 1 : 0,
        transition: 'all 0.2s ease',
      }}
      onClick={isOwnMessage ? (e) => handleMessageMenuOpen(e, message) : undefined}
    >
      {/* Pin indicator */}
      {isPinned && (
        <Box sx={{ position: 'absolute', top: 0, left: -8, zIndex: 1 }}>
          <PinIcon fontSize="small" color="warning" />
        </Box>
      )}

      <Avatar
        onClick={handleUserClick}
        sx={{
          width: isMobile ? 36 : 32,
          height: isMobile ? 36 : 32,
          fontSize: isMobile ? '0.8rem' : '0.75rem',
          bgcolor: message.pfp_icon === 'Dev' ? 'transparent' : message.pfp_color,
          background: message.pfp_icon === 'Dev'
            ? 'linear-gradient(45deg, #4CAF50, #2196F3)'
            : message.pfp_color,
          boxShadow: message.pfp_icon === 'Dev' ? '0 0 8px rgba(33, 150, 243, 0.6)' : 'none',
          cursor: user?.id !== message.user_id ? 'pointer' : 'default',
          flexShrink: 0,
          border: isMobile ? '2px solid' : 'none',
          borderColor: 'divider',
        }}
      >
        {message.pfp_icon ? (() => {
          const IconComponent = getProfileIconComponent(message.pfp_icon);
          return <IconComponent sx={{ fontSize: '1.2rem', color: 'white', opacity: 0.7 }} />;
        })() : (
          message.user_name?.charAt(0) || 'U'
        )}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box display="flex" alignItems="center" gap={isMobile ? 0.75 : 1} mb={isMobile ? 0.5 : 0.5} flexWrap="wrap">
          <Typography
            variant={isMobile ? "body2" : "subtitle2"}
            sx={{
              fontWeight: 'bold',
              cursor: user?.id !== message.user_id ? 'pointer' : 'default',
              '&:hover': {
                textDecoration: user?.id !== message.user_id ? 'underline' : 'none',
              },
              fontSize: isMobile ? '0.9rem' : 'inherit',
            }}
            onClick={handleUserClick}
          >
            {message.user_name}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{
              fontSize: isMobile ? '0.75rem' : 'inherit',
            }}
          >
            {formatTime(message.created_at)}
          </Typography>
          {message.is_edited && (
            <Typography variant="caption" color="text.secondary">
              (ред.)
            </Typography>
          )}
          {isPinned && (
            <Chip 
              size="small" 
              icon={<PinIcon />} 
              label="Закреплено" 
              color="warning" 
              variant="outlined"
            />
          )}
          {showReadReceipts && isOwnMessage && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isRead ? (
                <ReadIcon fontSize="small" color="success" />
              ) : (
                <PendingIcon fontSize="small" color="action" />
              )}
            </Box>
          )}
        </Box>

        {message.reply_to_message && (
          <Box sx={{ mb: 0.5, p: 0.5, bgcolor: 'action.hover', borderRadius: 0.5, borderLeft: 2, borderColor: 'primary.main', maxWidth: '100%' }}>
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

        {messageContent}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
          {Object.entries(reactionsGrouped).map(([emoji, reactions]) => (
            <Tooltip
              key={emoji}
              title={
                <Box>
                  {reactions?.map(r => <Typography key={r.user_id} variant="caption">{r.user_name}</Typography>)}
                </Box>
              }
            >
              <ReactionPill
                emoji={emoji}
                count={reactions?.length || 0}
                reacted={!!reactions?.find(r => r.user_id === user?.id)}
                onClick={(e) => { e.stopPropagation(); onToggleReaction(emoji); }}
              />
            </Tooltip>
          ))}
          <IconButton size="small" onClick={handleReactionClick}>
            <AddReactionIcon fontSize="small" />
          </IconButton>
          {onPinMessage && (
            <Tooltip title={isPinned ? "Открепить сообщение" : "Закрепить сообщение"}>
              <IconButton size="small" onClick={handlePinMessage}>
                <PinIcon fontSize="small" color={isPinned ? "warning" : "action"} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      <EmojiPicker
        anchorEl={anchorEl}
        onClose={handleClose}
        onSelect={(emoji) => onToggleReaction(emoji)}
      />
    </Box>
  );
});

Message.displayName = 'Message';

export default Message;
