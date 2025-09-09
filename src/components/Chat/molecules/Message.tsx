import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  onReplyPreviewClick?: (messageId: string) => void;
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
  onReplyPreviewClick,
}) => {
  // State to track if image failed to load
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Check if image is loading and handle failures
  useEffect(() => {
    if (message.pfp_type === 'image' && message.pfp_image_url && !imageLoadFailed) {
      const img = new Image();
      img.onload = () => {
        setImageLoadFailed(false);
      };
      img.onerror = () => {
        setImageLoadFailed(true);
      };
      img.src = message.pfp_image_url;
    }
  }, [message.pfp_type, message.pfp_image_url, imageLoadFailed]);
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
          <Box sx={{ 
            maxWidth: isMobile ? 320 : 450, 
            borderRadius: 2, 
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            bgcolor: 'transparent'
          }}>
            <img
              src={message.media_url}
              alt="Image"
              style={{ 
                width: '100%', 
                maxHeight: isMobile ? 250 : 350,
                objectFit: 'contain',
                display: 'block'
              }}
              loading="lazy" // Lazy load images for better performance
            />
          </Box>
        );
      
      case 'video':
        return (
          <Box sx={{ 
            maxWidth: isMobile ? 320 : 450, 
            borderRadius: 2, 
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            bgcolor: 'transparent'
          }}>
            <video
              controls
              style={{ 
                width: '100%', 
                maxHeight: isMobile ? 250 : 350,
                objectFit: 'contain',
                display: 'block'
              }}
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
      
      case 'manpay':
        return (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: 280,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transform: 'translateY(-1px)'
            }
          }}>
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: 'success.main',
              color: 'white',
              flexShrink: 0
            }}>
              <MoneyIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  ManPay
                </Typography>
                {message.manpay_status === 'complete' && (
                  <Chip 
                    label="✓" 
                    size="small" 
                    sx={{ 
                      bgcolor: 'success.main', 
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 16,
                      minWidth: 16
                    }} 
                  />
                )}
              </Box>
              <Typography variant="h6" color="text.primary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {message.manpay_amount} МР
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {message.manpay_sender_id === user?.id ? 'Отправлено' : 'Получено'}
              </Typography>
            </Box>
          </Box>
        );
      
      default:
        return (
          <Typography 
            variant="body1" 
            sx={{ 
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              fontSize: isMobile ? '0.95rem' : '1rem',
              lineHeight: 1.5,
              color: 'text.primary',
              fontWeight: 400,
              '& a': {
                color: 'primary.main',
                textDecoration: 'underline',
                '&:hover': {
                  color: 'primary.dark',
                }
              },
              '& code': {
                bgcolor: 'action.hover',
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.9em',
              }
            }}
          >
            {highlightedMessage}
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
    message.manpay_amount,
    message.manpay_sender_id,
    message.manpay_status,
    user?.id,
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
        gap: isMobile ? 1 : 1.5,
        alignItems: 'flex-start',
        cursor: isOwnMessage ? 'pointer' : 'default',
        position: 'relative',
        mb: isMobile ? 2 : 1.5,
        p: isMobile ? 1 : 0.5,
        borderRadius: isMobile ? 2 : 1,
        '&:hover': isOwnMessage ? {
          backgroundColor: 'action.hover',
          borderRadius: isMobile ? 3 : 2,
          p: isMobile ? 1.5 : 1,
          m: isMobile ? -0.5 : -0.5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transform: 'translateY(-1px)',
        } : {},
        borderLeft: isPinned ? 4 : 0,
        borderColor: 'warning.main',
        pl: isPinned ? 1.5 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: isPinned ? 'action.hover' : 'transparent',
      }}
      onClick={(e) => handleMessageMenuOpen(e, message)}
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
            width: isMobile ? 48 : 44,
            height: isMobile ? 48 : 44,
            fontSize: isMobile ? '1rem' : '0.9rem',
            bgcolor: (message.pfp_type === 'image' && message.pfp_image_url && !imageLoadFailed) ? 'transparent' : 
                     message.pfp_type === 'gradient' ? 'transparent' : 
                     message.pfp_icon === 'Dev' ? 'transparent' : (message.pfp_color || '#1976d2'),
            background: (message.pfp_type === 'image' && message.pfp_image_url && !imageLoadFailed) ? 'none' :
                       message.pfp_type === 'gradient' ? (message.pfp_gradient || message.pfp_color || '#1976d2') :
                       message.pfp_icon === 'Dev'
                         ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                         : (message.pfp_color || '#1976d2'),
            backgroundImage: (message.pfp_type === 'image' && message.pfp_image_url && !imageLoadFailed) ? `url(${message.pfp_image_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            boxShadow: message.pfp_icon === 'Dev' 
              ? '0 4px 12px rgba(102, 126, 234, 0.4)' 
              : '0 2px 8px rgba(0,0,0,0.1)',
          cursor: user?.id !== message.user_id ? 'pointer' : 'default',
            flexShrink: 0,
            border: isMobile ? '3px solid' : '2px solid',
            borderColor: 'background.paper',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }
          }}
          title={`Debug: pfp_type=${message.pfp_type || 'undefined'}, pfp_color=${message.pfp_color || 'undefined'}, pfp_icon=${message.pfp_icon || 'undefined'}, pfp_image_url=${message.pfp_image_url || 'undefined'}, pfp_gradient=${message.pfp_gradient || 'undefined'}, imageLoadFailed=${imageLoadFailed}`}
        >
          {(() => {
            // If it's an image type with a valid URL and image loaded successfully, show nothing (just the image)
            if (message.pfp_type === 'image' && message.pfp_image_url && !imageLoadFailed) {
              return <></>;
            }
            
            // If it's an icon type, show the icon
            if (message.pfp_icon) {
          const IconComponent = getProfileIconComponent(message.pfp_icon);
              return <IconComponent sx={{ fontSize: '1.2rem', color: 'white', opacity: 0.9 }} />;
            }
            
            // Fallback to user initial
            return message.user_name?.charAt(0) || 'U';
          })()}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box display="flex" alignItems="center" gap={isMobile ? 1 : 1.5} mb={isMobile ? 0.75 : 0.5} flexWrap="wrap">
          <Typography
            variant={isMobile ? "body2" : "subtitle2"}
            sx={{
              fontWeight: 700,
              cursor: user?.id !== message.user_id ? 'pointer' : 'default',
              '&:hover': {
                textDecoration: user?.id !== message.user_id ? 'underline' : 'none',
                color: 'primary.main',
              },
              fontSize: isMobile ? '0.95rem' : 'inherit',
              color: isOwnMessage ? 'primary.main' : 'text.primary',
              transition: 'color 0.2s ease',
            }}
            onClick={handleUserClick}
          >
            {message.user_name}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{
              fontSize: isMobile ? '0.8rem' : 'inherit',
              fontWeight: 500,
              opacity: 0.8,
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
              variant="filled"
              sx={{
                fontSize: '0.7rem',
                height: 20,
                '& .MuiChip-label': {
                  px: 0.5,
                },
                '& .MuiChip-icon': {
                  fontSize: '0.8rem',
                }
              }}
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
          <Tooltip title="Нажмите для перехода к сообщению" placement="top">
            <Box 
              onClick={() => onReplyPreviewClick?.(message.reply_to_message!.id)}
              sx={{ 
                mb: 1, 
                p: 1, 
                bgcolor: 'action.hover', 
                borderRadius: 1, 
                borderLeft: 3, 
                borderColor: 'primary.main', 
                maxWidth: '100%',
                opacity: 0.8,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 1,
                  bgcolor: 'action.selected',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ReplyIcon fontSize="small" color="primary" />
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                {message.reply_to_message.user_name}
              </Typography>
            </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                    Нажмите для перехода
                  </Typography>
                  <Box sx={{ 
                    width: 0, 
                    height: 0, 
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '4px solid',
                    borderTopColor: 'primary.main',
                    opacity: 0.7,
                    transform: 'rotate(45deg)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      opacity: 1,
                      transform: 'rotate(45deg) scale(1.2)',
                    }
                  }} />
                </Box>
              </Box>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  fontStyle: 'italic',
                  fontSize: '0.85rem',
                  lineHeight: 1.3,
                  opacity: 0.9
                }}
              >
              {message.reply_to_message.message.length > 100
                ? message.reply_to_message.message.substring(0, 100) + '...'
                : message.reply_to_message.message}
            </Typography>
          </Box>
          </Tooltip>
        )}

        {messageContent}

        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.25, 
          mt: 0.75, 
          flexWrap: 'wrap',
          opacity: 0.7,
          transition: 'opacity 0.2s ease',
          '&:hover': {
            opacity: 1,
          }
        }}>
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
                userNames={(reactions?.map(r => r.user_name).filter(Boolean) as string[]) || []}
              />
            </Tooltip>
          ))}
          <IconButton 
            size="small" 
            onClick={handleReactionClick}
            sx={{
              width: 24,
              height: 24,
              '& .MuiSvgIcon-root': {
                fontSize: '1rem'
              }
            }}
          >
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
