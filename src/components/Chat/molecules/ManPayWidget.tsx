import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { Check } from '@mui/icons-material';

// --- Keyframe Animations ---

// General fade-in and slide-up for the container
const fadeInSlideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Shimmer effect for the amount
const shimmer = keyframes`
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
`;

// Animation for the checkmark circle drawing
const drawCircle = keyframes`
  to {
    stroke-dashoffset: 0;
  }
`;

// Animation for the checkmark icon fading in
const drawCheck = keyframes`
  to {
    transform: scale(1);
    opacity: 1;
  }
`;


// --- Styled Components ---

const WidgetContainer = styled(Paper)(({ theme }) => ({
  fontFamily: "'Inter', sans-serif",
  width: 'fit-content',
  minWidth: '250px',
  padding: '12px 16px',
  borderRadius: '18px',
  background: 'linear-gradient(135deg, #3a3a3a, #2c2c2c)',
  color: '#fff',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  animation: `${fadeInSlideUp} 0.6s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const Header = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '8px',
  animation: `${fadeInSlideUp} 0.7s 0.1s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
  opacity: 0,
});

const AmountDisplay = styled(Typography)({
  fontWeight: 700,
  fontSize: '2rem',
  textAlign: 'center',
  margin: '16px 0',
  position: 'relative',
  color: '#f0f0f0',
  animation: `${fadeInSlideUp} 0.8s 0.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
  opacity: 0,
  
  // Shimmer effect
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
    animation: `${shimmer} 2.5s infinite linear`,
  }
});

const Footer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '0.8rem',
  color: '#a0a0a0',
  animation: `${fadeInSlideUp} 0.9s 0.3s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
  opacity: 0,
});

const AnimatedCheckmark = styled('div')({
  width: '20px',
  height: '20px',
  position: 'relative',
  
  '.circle': {
    fill: 'none',
    stroke: '#4caf50',
    strokeWidth: 2,
    strokeDasharray: 100,
    strokeDashoffset: 100,
    animation: `${drawCircle} 0.8s 0.5s ease-out forwards`,
  },

  '.check-icon': {
    fontSize: '16px',
    color: '#4caf50',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transform: 'scale(0)',
    opacity: 0,
    animation: `${drawCheck} 0.5s 1s cubic-bezier(0.25, 0.1, 0.25, 1) forwards`,
  }
});

// --- Widget Component ---

interface ManPayWidgetProps {
  amount: number;
  senderName: string;
  receiverName: string;
  isSender: boolean;
}

export const ManPayWidget: React.FC<ManPayWidgetProps> = ({
  amount,
  senderName,
  receiverName,
  isSender,
}) => {
  return (
    <WidgetContainer>
      <Header>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {isSender ? `Вы → ${receiverName}` : `${senderName} → Вам`}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#a0a0a0' }}>
          ManPay
        </Typography>
      </Header>

      <AmountDisplay>
        {amount} ₽
      </AmountDisplay>

      <Footer>
        <AnimatedCheckmark>
          <svg className="circle" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="9" />
          </svg>
          <Check className="check-icon" />
        </AnimatedCheckmark>
        <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 500 }}>
          Оплачено
        </Typography>
      </Footer>
    </WidgetContainer>
  );
};
