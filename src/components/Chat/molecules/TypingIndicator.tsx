import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

interface TypingUser {
  user_id: string;
  user_name: string;
  timestamp: number;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  getProfileIconComponent: (iconName: string) => React.ComponentType<any>;
}

// Animated dots
const bounce = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
`;

const Dot = styled('span')<{ delay: number }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  animation: ${bounce} 1.4s infinite ease-in-out both;
  animation-delay: ${props => props.delay}s;
  margin: 0 1px;
`;

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  getProfileIconComponent,
}) => {
  const [visibleUsers, setVisibleUsers] = useState<TypingUser[]>([]);

  // Filter out users who stopped typing (older than 5 seconds)
  useEffect(() => {
    const now = Date.now();
    const activeUsers = typingUsers.filter(user => now - user.timestamp < 5000);
    setVisibleUsers(activeUsers);
  }, [typingUsers]);

  if (visibleUsers.length === 0) {
    return null;
  }

  const formatTypingText = (users: TypingUser[]) => {
    if (users.length === 1) {
      return `${users[0].user_name} печатает`;
    } else if (users.length === 2) {
      return `${users[0].user_name} и ${users[1].user_name} печатают`;
    } else if (users.length === 3) {
      return `${users[0].user_name}, ${users[1].user_name} и ${users[2].user_name} печатают`;
    } else {
      return `${users[0].user_name} и еще ${users.length - 1} печатают`;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        color: 'text.secondary',
        fontStyle: 'italic',
        fontSize: '0.875rem',
      }}
    >
      {/* Show first user's avatar */}
      {visibleUsers.length > 0 && (
        <Avatar
          sx={{
            width: 20,
            height: 20,
            fontSize: '0.7rem',
            bgcolor: 'action.disabled',
          }}
        >
          {visibleUsers[0].user_name.charAt(0)}
        </Avatar>
      )}
      
      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {formatTypingText(visibleUsers)}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 0.5 }}>
          <Dot delay={0} />
          <Dot delay={0.16} />
          <Dot delay={0.32} />
        </Box>
      </Typography>
    </Box>
  );
};

export default TypingIndicator; 