import React from 'react';
import { Chip } from '@mui/material';

interface ReactionPillProps {
  emoji: string;
  count: number;
  onClick: () => void;
  reacted: boolean;
}

const ReactionPill: React.FC<ReactionPillProps> = ({ emoji, count, onClick, reacted }) => {
  return (
    <Chip
      label={`${emoji} ${count}`}
      onClick={onClick}
      size="small"
      variant={reacted ? 'filled' : 'outlined'}
      color={reacted ? 'primary' : 'default'}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: reacted ? 'primary.dark' : 'action.hover',
        },
      }}
    />
  );
};

export default ReactionPill;
