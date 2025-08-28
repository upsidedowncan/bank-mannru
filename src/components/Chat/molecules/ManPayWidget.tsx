import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { ArrowForward, CheckCircleOutline } from '@mui/icons-material';

// --- Keyframe Animations ---

// Subtle background gradient animation
const auroraAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Gentle fade-in animation for the widget
const fadeInAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Pulsing animation for the status icon
const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// --- Styled Components ---

const GlassmorphicPaper = styled(Paper)(({ theme }) => ({
  padding: '24px',
  borderRadius: '16px',
  maxWidth: 380,
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  background: 'rgba(30, 30, 45, 0.6)', // Semi-transparent background
  backdropFilter: 'blur(12px)', // The glass effect
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  animation: `${fadeInAnimation} 0.5s ease-out`,

  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
  },

  // Aurora effect
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    opacity: 0.15,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.success.main})`,
    backgroundSize: '200% 200%',
    animation: `${auroraAnimation} 10s ease infinite`,
  },
}));

const Header = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  paddingBottom: '12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
});

const TransactionFlow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  textAlign: 'center',
  margin: '32px 0',
});

const FlowNode = styled(Box)({
  flex: 1,
});

const StatusFooter = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  color: theme.palette.success.light,
  marginTop: '24px',

  '.status-icon': {
    animation: `${pulseAnimation} 2s infinite ease-in-out`,
  },
}));

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
    <GlassmorphicPaper>
      <Header>
        <Typography variant="h6" fontWeight="bold">
          ManPay Transaction
        </Typography>
        <Typography variant="caption" sx={{ color: 'grey.400' }}>
          {new Date().toLocaleDateString()}
        </Typography>
      </Header>

      <TransactionFlow>
        <FlowNode>
          <Typography variant="body2" color="grey.300">
            {isSender ? 'You' : senderName}
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            Sender
          </Typography>
        </FlowNode>

        <Box sx={{ mx: 2 }}>
          <ArrowForward sx={{ color: 'grey.500' }} />
        </Box>

        <FlowNode>
          <Typography variant="body2" color="grey.300">
            {isSender ? receiverName : 'You'}
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            Receiver
          </Typography>
        </FlowNode>
      </TransactionFlow>

      <Box textAlign="center">
        <Typography variant="h2" fontWeight="bold" sx={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}>
          {amount} MP
        </Typography>
      </Box>

      <StatusFooter>
        <CheckCircleOutline className="status-icon" />
        <Typography variant="body1">Completed</Typography>
      </StatusFooter>
    </GlassmorphicPaper>
  );
};
