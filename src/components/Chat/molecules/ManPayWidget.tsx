import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { Money as MoneyIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const AnimatedGradientText = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  backgroundSize: '200% 200%',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  animation: `${gradientAnimation} 3s ease infinite`,
  fontWeight: 'bold',
}));

interface ManPayWidgetProps {
  amount: number;
  senderName: string;
  receiverName: string;
  isSender: boolean;
}

export const ManPayWidget: React.FC<ManPayWidgetProps> = ({ amount, senderName, receiverName, isSender }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2,
        maxWidth: 320,
        background: 'linear-gradient(135deg, #2a2d3d 0%, #1f212e 100%)',
        border: '1px solid',
        borderColor: 'primary.main',
        color: 'white',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <MoneyIcon sx={{ color: 'primary.light' }} />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          ManPay
        </Typography>
      </Box>
      <Box sx={{ my: 2, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'grey.400' }}>
          {isSender ? 'Вы отправили' : `${senderName} отправил(а)`}
        </Typography>
        <AnimatedGradientText variant="h4">
          {amount} МР
        </AnimatedGradientText>
        <Typography variant="body2" sx={{ color: 'grey.400' }}>
          {isSender ? `кому ${receiverName}` : 'вам'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'success.main' }}>
        <CheckCircleIcon fontSize="small" />
        <Typography variant="caption">
          Завершено
        </Typography>
      </Box>
    </Paper>
  );
};
