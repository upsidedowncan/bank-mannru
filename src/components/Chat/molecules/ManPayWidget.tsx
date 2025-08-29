import React from 'react';
import { Typography, Paper } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { useInView } from 'react-intersection-observer';

// --- Keyframe Animations (Optimized for Performance) ---
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

// --- Styled Components (Designed for Text Wrapping) ---
const StyledPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isInView',
})<{ isInView: boolean }>(({ isInView }) => ({
  fontFamily: "'Inter', sans-serif",
  boxSizing: 'border-box',
  width: '260px', // A fixed base width is better for predictable wrapping
  maxWidth: '90vw',
  padding: '16px 20px',
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
  fontSize: '2.1rem', // A consistent font size
  lineHeight: 1.25, // Controls spacing when the text wraps to a new line
  color: '#FFFFFF',

  // --- THIS IS THE FIX ---
  // This forces the text to break onto a new line instead of overflowing.
  wordBreak: 'break-all',
});

const Status = styled(Typography)({
  fontWeight: 500,
  fontSize: '0.85rem',
  color: '#34C759',
  marginTop: '12px',
});

// --- Widget Component ---

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
  
  // Intl.NumberFormat adds spaces, which also helps with readability.
  const formattedAmount = new Intl.NumberFormat('ru-RU').format(amount);

  return (
    <StyledPaper ref={ref} elevation={0} isInView={inView}>
      <Header>
        {isSender ? `Вы → ${receiverName}` : `${senderName} → Вам`}
      </Header>
      <Amount>
        {formattedAmount} МР
      </Amount>
      <Status>
        Доставлено
      </Status>
    </StyledPaper>
  );
};

// Memoized for high performance in long lists
export default React.memo(ManPayWidget);
