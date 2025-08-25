import React from 'react';
import { Popover, Box, IconButton } from '@mui/material';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface EmojiPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ anchorEl, onClose, onSelect }) => {
  const open = Boolean(anchorEl);

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
    >
      <Box sx={{ display: 'flex', p: 1 }}>
        {EMOJIS.map((emoji) => (
          <IconButton
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            size="small"
          >
            <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
          </IconButton>
        ))}
      </Box>
    </Popover>
  );
};

export default EmojiPicker;
