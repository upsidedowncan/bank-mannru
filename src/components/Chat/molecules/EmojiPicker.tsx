import React, { useState } from 'react';
import { Popover, Box, IconButton, Typography, Divider } from '@mui/material';

// Organized emoji categories for better UX - in Russian
const EMOJI_CATEGORIES = {
  'Реакции': ['👍', '👎', '❤️', '💔', '😍', '😢', '😂', '😮', '😡', '😴'],
  'Праздник': ['🎉', '🎊', '🎈', '🎁', '🎂', '🎆', '🎇', '✨', '💯', '🔥'],
  'Эмоции': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '🙂', '🙃', '😉'],
  'Действия': ['👏', '🙌', '🤝', '💪', '🚀', '⚡', '💡', '🎯', '🏆', '⭐'],
  'Природа': ['🌹', '🌸', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴'],
  'Объекты': ['💎', '💍', '💐', '🎨', '🎭', '🎪', '🎟️', '🎫', '🎬', '🎤'],
  'Еда': ['🍕', '🍔', '🍟', '🌭', '🍿', '🍦', '🍧', '🍨', '🍩', '🍪'],
  'Животные': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'],
  'Путешествия': ['✈️', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒'],
  'Символы': ['❤️', '💙', '💚', '💛', '💜', '🖤', '🤍', '🤎', '💔', '❣️']
};

interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ anchorEl, onClose, onSelect }) => {
  const open = Boolean(anchorEl);
  const [selectedCategory, setSelectedCategory] = useState('Реакции');

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    onClose();
  };

  const handleCategoryChange = (category: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedCategory(category);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      PaperProps={{
        sx: {
          maxWidth: 350,
          maxHeight: 400,
          overflow: 'hidden',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }
      }}
    >
      <Box sx={{ p: 0.5 }}>
        {/* Category Tabs */}
        <Box sx={{ 
          display: 'flex', 
          gap: 0.25, 
          mb: 0.5, 
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 3 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: 2 
          }
        }}>
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Box
              key={category}
              onClick={(e) => handleCategoryChange(category, e)}
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                cursor: 'pointer',
                backgroundColor: selectedCategory === category ? 'primary.main' : 'transparent',
                color: selectedCategory === category ? 'white' : 'text.primary',
                fontSize: '0.7rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: selectedCategory === category ? 'primary.dark' : 'action.hover',
                }
              }}
            >
              {category}
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 0.5 }} />

        {/* Emoji Grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(8, 1fr)', 
          gap: 0.25,
          maxHeight: 250,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 3 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: 2 
          }
        }}>
          {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji) => (
            <IconButton
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                handleEmojiSelect(emoji);
              }}
              size="small"
              sx={{
                width: 28,
                height: 28,
                borderRadius: 0.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                }
              }}
            >
              <span style={{ 
                fontSize: '1rem',
                lineHeight: 1,
                display: 'block'
              }}>
                {emoji}
              </span>
            </IconButton>
          ))}
        </Box>

        {/* Quick Access Popular Emojis */}
        <Divider sx={{ my: 0.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5, fontSize: '0.65rem' }}>
            Популярные:
          </Typography>
          {['👍', '❤️', '😂', '🎉', '🔥', '💯'].map((emoji) => (
          <IconButton
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
                handleEmojiSelect(emoji);
            }}
            size="small"
              sx={{
                width: 24,
                height: 24,
                borderRadius: 0.5,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  transform: 'scale(1.1)',
                }
              }}
          >
              <span style={{ fontSize: '0.9rem' }}>{emoji}</span>
          </IconButton>
        ))}
        </Box>
      </Box>
    </Popover>
  );
};

export default EmojiPicker;
