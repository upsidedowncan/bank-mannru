import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { useInView } from 'react-intersection-observer';

// --- Keyframe Animations (No changes here) ---
const subtleFadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// --- Styled Components (Optimized for Performance & Adaptiveness) ---
const StyledPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isInView',
})<{ isInView: boolean }>(({ theme, isInView }) => ({
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box', // Ensures padding is included in the width
  width: 'fit-content',
  minWidth: '240px',
  maxWidth: '90vw', // Prevents the widget from ever touching the screen edges
  padding: '14px 18px',
  borderRadius: '20px',
  backgroundColor: '#1C1C1E',
  color: '#FFFFFF',
  opacity: 0,
  animation: isInView
    ? `${subtleFadeInUp} 0.7s cubic-bezier(0.33, 1, 0.68, 1) forwards`
    : 'none',
  transition: 'background-color 0.3s ease',

  '&:hover': {
    backgroundColor: '#2C2C2E',
  },
}));

const Header = styled(Typography)({
  fontWeight: 500,
  fontSize: '0.9rem',
  color: '#8E8E93',
  marginBottom: '12px',
});

const Amount = styled(Typography)({
  fontWeight: 700,
  // The key change is here! This makes the font size responsive.
  fontSize: 'clamp(1.6rem, 8vw, 2.2rem)',
  lineHeight: 1.2,
  color: '#FFFFFF',
  // These properties prevent the number from breaking in the middle if it still somehow overflows
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const Status = styled(Typography)({
  fontWeight: 500,
  fontSize: '0.85rem',
  color: '#34C759',
  marginTop: '12px',
});

// --- Widget Component (No changes in logic) ---

interface ManPayWidgetProps {
  amount: number;
  senderName: string;
  receiverName: string;
  isSender: boolean;
}

const ManPayWidget: React.FC<ManPayWidgetProps> = ({
  amount,
  senderName,
  receiverName,
  isSender,
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  // Formatting the number with non-breaking spaces for better readability
  const formattedAmount = new Intl.NumberFormat('ru-RU').format(amount);

  return (
    <StyledPaper ref={ref} elevation={0} isInView={inView}>
      <Header>
        {isSender ? `Вы отправили ${receiverName}` : `${senderName} отправил(а) вам`}
      </Header>
      <Amount>
        {formattedAmount} ₽
      </Amount>
      <Status>
        Доставлено
      </Status>
    </StyledPaper>
  );
};

export default React.memo(ManPayWidget);
