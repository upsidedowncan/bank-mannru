import React, { useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';

interface ReactionPillProps {
  emoji: string;
  count: number;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  reacted: boolean;
  userNames?: string[];
}

const ReactionPill: React.FC<ReactionPillProps> = ({ 
  emoji, 
  count, 
  onClick, 
  reacted, 
  userNames = [] 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getReactionColor = (emoji: string) => {
    // Define colors for different emoji categories
    const colorMap: { [key: string]: string } = {
      '👍': '#4CAF50', // Green for thumbs up
      '👎': '#F44336', // Red for thumbs down
      '❤️': '#E91E63', // Pink for heart
      '😍': '#FF9800', // Orange for love
      '😂': '#FFC107', // Yellow for laugh
      '😮': '#2196F3', // Blue for surprise
      '😢': '#9C27B0', // Purple for sad
      '🔥': '#FF5722', // Deep orange for fire
      '💯': '#795548', // Brown for 100
      '🎉': '#FFEB3B', // Yellow for celebration
      '🚀': '#607D8B', // Blue grey for rocket
      '💪': '#3F51B5', // Indigo for muscle
    };
    
    return colorMap[emoji] || '#757575'; // Default grey
  };

  const backgroundColor = reacted 
    ? getReactionColor(emoji) 
    : 'transparent';
  
  const textColor = reacted 
    ? 'white' 
    : getReactionColor(emoji);
  
  const borderColor = reacted 
    ? getReactionColor(emoji) 
    : 'rgba(0, 0, 0, 0.12)';

  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            {emoji} {count} реакций
          </Typography>
          {userNames.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              {userNames.slice(0, 3).map((name, index) => (
                <Typography key={index} variant="caption" display="block">
                  {name}
                </Typography>
              ))}
              {userNames.length > 3 && (
                <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                  +{userNames.length - 3} еще
                </Typography>
              )}
            </Box>
          )}
        </Box>
      }
      placement="top"
    >
      <Box
      onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          px: 0.75,
          py: 0.25,
          borderRadius: 1.5,
          border: `1px solid ${borderColor}`,
          backgroundColor: backgroundColor,
          color: textColor,
        cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isHovered 
            ? `0 3px 8px ${getReactionColor(emoji)}40` 
            : '0 1px 2px rgba(0, 0, 0, 0.08)',
        '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: `0 4px 12px ${getReactionColor(emoji)}50`,
          },
          '&:active': {
            transform: 'scale(0.95)',
            transition: 'all 0.1s ease',
          },
          // Special effects for reacted state
          ...(reacted && {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              borderRadius: 2,
              background: `linear-gradient(45deg, ${getReactionColor(emoji)}, ${getReactionColor(emoji)}80)`,
              zIndex: -1,
              opacity: isHovered ? 0.6 : 0.3,
              transition: 'opacity 0.2s ease',
            }
          })
        }}
      >
        <Typography 
          sx={{ 
            fontSize: '0.9rem', 
            lineHeight: 1,
            filter: isHovered ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' : 'none',
            transition: 'filter 0.2s ease',
          }}
        >
          {emoji}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            fontWeight: 600,
            fontSize: '0.65rem',
            lineHeight: 1,
            minWidth: '0.75rem',
            textAlign: 'center',
      }}
        >
          {count}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default ReactionPill;
