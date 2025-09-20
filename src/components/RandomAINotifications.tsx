import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Slide, 
  Fade,
  Snackbar,
  Alert
} from '@mui/material';
import { SmartToy, Close, VolumeUp, VolumeOff } from '@mui/icons-material';
import { useRandomAI } from '../contexts/RandomAIContext';

const RandomAINotifications: React.FC = () => {
  const { messages, isJumpscareActive } = useRandomAI();
  const [currentMessage, setCurrentMessage] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Show new random AI messages as notifications
  useEffect(() => {
    console.log('RandomAINotifications: messages updated:', messages);
    
    const randomMessages = messages.filter(msg => 
      (msg.type === 'random_interaction' || msg.type === 'quick_interaction') && 
      msg.role === 'assistant' &&
      !msg.content.includes('КРИТИЧЕСКАЯ ОШИБКА') && // Don't show fake errors as notifications
      !msg.content.includes('ОШИБКА СИСТЕМЫ') // Don't show fake errors as notifications
    );
    
    console.log('RandomAINotifications: filtered messages:', randomMessages);
    
    if (randomMessages.length > 0) {
      const latestMessage = randomMessages[randomMessages.length - 1];
      console.log('RandomAINotifications: showing notification:', latestMessage);
      setCurrentMessage(latestMessage);
      setShowNotification(true);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
    }
  }, [messages]);

  // Play notification sound
  useEffect(() => {
    if (showNotification && soundEnabled && currentMessage) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant notification sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  }, [showNotification, soundEnabled, currentMessage]);

  const handleClose = () => {
    setShowNotification(false);
  };

  return (
    <>
      {/* Jumpscare Overlay */}
      {isJumpscareActive && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'linear-gradient(45deg, #ff0000, #000000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'jumpscare 0.5s ease-in-out',
            '@keyframes jumpscare': {
              '0%': { opacity: 0, transform: 'scale(0.8)' },
              '50%': { opacity: 1, transform: 'scale(1.1)' },
              '100%': { opacity: 0, transform: 'scale(1)' }
            }
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: 'white',
              fontSize: { xs: '2rem', sm: '4rem' },
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              animation: 'shake 0.1s infinite',
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-5px)' },
                '75%': { transform: 'translateX(5px)' }
              }
            }}
          >
            👻 BOO! 👻
          </Typography>
        </Box>
      )}

      {/* Random AI Notification */}
      <Snackbar
        open={showNotification}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: 1300 }}
      >
        <Slide direction="left" in={showNotification} mountOnEnter unmountOnExit>
          <Paper
            elevation={8}
            sx={{
              p: 2,
              minWidth: 300,
              maxWidth: 400,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              borderRadius: 2,
              position: 'relative'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <SmartToy sx={{ fontSize: 24, mt: 0.5 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  ManGPT AI
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                  {currentMessage?.content}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.7rem' }}>
                  {currentMessage?.timestamp?.toLocaleTimeString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  sx={{ 
                    color: 'white', 
                    p: 0.5,
                    opacity: soundEnabled ? 1 : 0.5
                  }}
                >
                  {soundEnabled ? <VolumeUp fontSize="small" /> : <VolumeOff fontSize="small" />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleClose}
                  sx={{ color: 'white', p: 0.5 }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Slide>
      </Snackbar>
    </>
  );
};

export default RandomAINotifications;
