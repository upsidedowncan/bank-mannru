import React, { useState, MouseEvent } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { Money as MoneyIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

// Keyframes for animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 255, 127, 0.4);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 10px 10px rgba(0, 255, 127, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(0, 255, 127, 0);
  }
`;

// Styled components
const AnimatedGradientText = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.success.light}, ${theme.palette.primary.light}, #ff8e53, #FE6B8B)`,
  backgroundSize: '300% 300%',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  animation: `${gradientAnimation} 5s ease infinite`,
  fontWeight: 'bold',
}));

const StyledPaper = styled(Paper)({
  padding: '16px',
  borderRadius: '12px',
  maxWidth: 340,
  background: 'linear-gradient(145deg, #2c3e50, #1a222e)',
  border: '1px solid #4a4a4a',
  color: 'white',
  perspective: '1000px',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  animation: `${fadeIn} 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
  '&:hover': {
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  },
});

const IconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  color: theme.palette.success.main,
  animation: `${pulse} 2s infinite`,
  borderRadius: '50%',
}));

interface ManPayWidgetProps {
  amount: number;
  senderName: string;
  receiverName: string;
  isSender: boolean;
}

export const ManPayWidget: React.FC<ManPayWidgetProps> = ({ amount, senderName, receiverName, isSender }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setRotate({ x: -y * 10, y: x * 10 });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <StyledPaper
      elevation={5}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <MoneyIcon sx={{ color: 'primary.light', filter: 'drop-shadow(0 0 5px rgba(100,200,255,0.7))' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
          ManPay
        </Typography>
      </Box>
      <Box sx={{ my: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
          {isSender ? 'Вы отправили' : `${senderName} отправил(а)`}
        </Typography>
        <AnimatedGradientText variant="h3">
          {amount} МР
        </AnimatedGradientText>
        <Typography variant="body2" sx={{ color: 'grey.400', mt: 1 }}>
          {isSender ? `для ${receiverName}` : 'вам'}
        </Typography>
      </Box>
      <IconWrapper>
        <CheckCircleIcon fontSize="small" />
        <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
          Завершено
        </Typography>
      </IconWrapper>
    </StyledPaper>
  );
};
