import React, { useState } from 'react';
import { Box, Typography, Avatar, IconButton, TextField, CircularProgress, Button, Tooltip } from '@mui/material';
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
} from '@mui/icons-material';
import { ChatMessage } from '../types';
import { ManPayWidget } from './ManPayWidget';

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
}

const Message: React.FC<MessageProps> = ({
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
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  const reactionsGrouped = (message.reactions || []).reduce<{[key: string]: typeof message.reactions}>((acc, reaction) => {
    const key = reaction.emoji;
    const existing = acc[key] || [];
    acc[key] = [...existing, reaction];
    return acc;
  }, {});

  return (
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
        onClick={handleUserClick}
        sx={{
          width: isMobile ? 28 : 32,
          height: isMobile ? 28 : 32,
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          bgcolor: message.pfp_icon === 'Dev' ? 'transparent' : message.pfp_color,
          background: message.pfp_icon === 'Dev'
            ? 'linear-gradient(45deg, #4CAF50, #2196F3)'
            : message.pfp_color,
          boxShadow: message.pfp_icon === 'Dev' ? '0 0 8px rgba(33, 150, 243, 0.6)' : 'none',
          cursor: user?.id !== message.user_id ? 'pointer' : 'default',
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
        <Box display="flex" alignItems="center" gap={1} mb={isMobile ? 0.25 : 0.5} flexWrap="wrap">
          <Typography
            variant={isMobile ? "body2" : "subtitle2"}
            sx={{
              fontWeight: 'bold',
              cursor: user?.id !== message.user_id ? 'pointer' : 'default',
              '&:hover': {
                textDecoration: user?.id !== message.user_id ? 'underline' : 'none',
              }
            }}
            onClick={handleUserClick}
          >
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover', border: 1, borderColor: 'divider', minWidth: isMobile ? 200 : 250, maxWidth: isMobile ? 280 : 350 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                message.audio_url && playAudio(message.audio_url, message.id);
              }}
              sx={{ bgcolor: isPlaying === message.id ? 'error.main' : 'primary.main', color: 'white', '&:hover': { bgcolor: isPlaying === message.id ? 'error.dark' : 'primary.dark' } }}
            >
              {isPlaying === message.id ? <StopIcon /> : <PlayIcon />}
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{formatAudioTime(audioProgress[message.id] || 0)}</Typography>
                <Typography variant="caption" color="text.secondary">/</Typography>
                <Typography variant="caption" color="text.secondary">{message.audio_duration ? formatAudioTime(message.audio_duration) : '--:--'}</Typography>
              </Box>
              <Box sx={{ position: 'relative', height: 4, bgcolor: 'action.disabled', borderRadius: 2 }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', bgcolor: 'primary.main', borderRadius: 2, width: message.audio_duration ? `${Math.min((audioProgress[message.id] || 0) / message.audio_duration * 100, 100)}%` : '0%', transition: 'width 0.1s ease' }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MicIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">Голос</Typography>
            </Box>
          </Box>
        ) : message.message_type === 'image' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {message.message && <Typography variant="body1">{message.message}</Typography>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', maxWidth: '100%' }}>
              <Box component="img" src={message.media_url} alt={message.message} sx={{ maxWidth: '100%', maxHeight: 300, width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 1, cursor: 'pointer', display: 'block', '&:hover': { opacity: 0.8 } }} onClick={(e) => { e.stopPropagation(); window.open(message.media_url, '_blank'); }} />
            </Box>
          </Box>
        ) : message.message_type === 'video' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {message.message && <Typography variant="body1">{message.message}</Typography>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', maxWidth: '100%' }}>
              <Box component="video" src={message.media_url} controls sx={{ maxWidth: '100%', maxHeight: 300, width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 1, display: 'block' }} onClick={(e) => e.stopPropagation()} />
            </Box>
          </Box>
        ) : message.message_type === 'html' ? (
          <Box sx={{ '& *': { maxWidth: '100%', wordBreak: 'break-word' } }} dangerouslySetInnerHTML={{ __html: message.message }} />
        ) : message.message_type === 'money_gift' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, borderRadius: 2, bgcolor: 'background.paper', border: 1, borderColor: 'primary.main', maxWidth: 300 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GiftIcon color="primary" />
              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>Денежный подарок</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MoneyIcon color="success" />
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>{message.gift_amount} МР</Typography>
            </Box>
            {message.gift_claimed_by ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: 'action.disabled' }}>
                <Typography variant="body2" color="text.secondary">Получено пользователем</Typography>
              </Box>
            ) : (
              <Button variant="contained" color="success" startIcon={<GiftIcon />} onClick={(e) => { e.stopPropagation(); openCardSelectionDialog(message.id, message.gift_amount || 0); }} disabled={claimingGift === message.id} sx={{ alignSelf: 'flex-start', minWidth: 120 }}>
                {claimingGift === message.id ? <CircularProgress size={20} color="inherit" /> : 'Получить'}
              </Button>
            )}
          </Box>
        ) : message.message_type === 'manpay' ? (
          <ManPayWidget
            amount={message.manpay_amount || 0}
            senderName={participants.find(p => p.user_id === message.manpay_sender_id)?.user_name || 'User'}
            receiverName={participants.find(p => p.user_id === message.manpay_receiver_id)?.user_name || 'User'}
            isSender={user?.id === message.manpay_sender_id}
          />
        ) : (
          <Typography variant="body1">{message.message}</Typography>
        )}

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
        </Box>
      </Box>
      <EmojiPicker
        anchorEl={anchorEl}
        onClose={handleClose}
        onSelect={(emoji) => onToggleReaction(emoji)}
      />
    </Box>
  );
};

export default Message;
