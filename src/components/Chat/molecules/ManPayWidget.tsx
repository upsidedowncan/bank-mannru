import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { useInView } from 'react-intersection-observer';

// --- Keyframe Animations (using only transform and opacity for performance) ---
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

// --- Styled Components (Optimized for Performance) ---
const StyledPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isInView',
})<{ isInView: boolean }>(({ theme, isInView }) => ({
  fontFamily: "'Inter', sans-serif", // Assuming Inter is loaded in your index.html
  width: 'fit-content',
  minWidth: '240px',
  padding: '14px 18px',
  borderRadius: '20px',
  backgroundColor: '#1C1C1E', // A dark, modern background
  color: '#FFFFFF',
  // Conditional animation based on visibility
  animation: isInView
    ? `${subtleFadeInUp} 0.7s cubic-bezier(0.33, 1, 0.68, 1) forwards`
    : 'none',
  opacity: 0, // Start as invisible
  transition: 'background-color 0.3s ease',

  '&:hover': {
    backgroundColor: '#2C2C2E',
  },
}));

const Header = styled(Typography)({
  fontWeight: 500,
  fontSize: '0.9rem',
  color: '#8E8E93', // Softer color for secondary text
  marginBottom: '12px',
});

const Amount = styled(Typography)({
  fontWeight: 700,
  fontSize: '2.2rem',
  lineHeight: 1.2,
  color: '#FFFFFF',
});

const Status = styled(Typography)({
  fontWeight: 500,
  fontSize: '0.85rem',
  color: '#34C759', // Apple's green for success
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
  // This hook triggers the animation only when the widget is in the viewport
  const { ref, inView } = useInView({
    triggerOnce: true, // Only animate once
    threshold: 0.1, // Trigger when 10% of the element is visible
  });

  return (
    <StyledPaper ref={ref} elevation={0} isInView={inView}>
      <Header>
        {isSender ? `Вы отправили ${receiverName}` : `${senderName} отправил(а) вам`}
      </Header>
      <Amount>
        {amount} ₽
      </Amount>
      <Status>
        Доставлено
      </Status>
    </StyledPaper>
  );
};

// Wrap the component with React.memo for performance optimization
export default React.memo(ManPayWidget);
