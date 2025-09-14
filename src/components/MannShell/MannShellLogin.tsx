import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  useTheme,
  useMediaQuery,
  Alert
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Lock as LockIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface MannShellLoginProps {
  onLoginSuccess: () => void;
}

export const MannShellLogin: React.FC<MannShellLoginProps> = ({ onLoginSuccess }) => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'username' | 'password' | 'authenticating'>('username');
  
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Focus input on mount and step change
  useEffect(() => {
    if (step === 'username' && usernameRef.current) {
      usernameRef.current.focus();
    } else if (step === 'password' && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [step]);

  const handleUsernameSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (username.trim()) {
        setStep('password');
      }
    }
  };

  const handlePasswordSubmit = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (password.trim()) {
        await handleLogin();
      }
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('authenticating');

    try {
      // Check if user is already logged in and has admin privileges
      if (user && user.user_metadata?.isAdmin) {
        // Verify the special admin credentials
        if (username === 'udc' && password === 'can') {
          setTimeout(() => {
            onLoginSuccess();
          }, 1000);
          return;
        } else {
          throw new Error('Invalid admin credentials');
        }
      } else {
        // Try to authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username.includes('@') ? username : `${username}@mannbank.local`,
          password: password
        });

        if (error) throw error;

        // Check if user has admin privileges
        if (data.user && data.user.user_metadata?.isAdmin) {
          setTimeout(() => {
            onLoginSuccess();
          }, 1000);
        } else {
          throw new Error('Access denied. Admin privileges required.');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
      setStep('username');
      setUsername('');
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTerminalLine = (content: string, color: string = '#ffffff') => (
    <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start' }}>
      <Typography
        component="span"
        sx={{
          color: '#4caf50',
          fontFamily: 'monospace',
          fontSize: isMobile ? '0.875rem' : '0.9rem',
          mr: 1,
          minWidth: '20px'
        }}
      >
        {'>'}
      </Typography>
      <Typography
        component="span"
        sx={{
          color,
          fontFamily: 'monospace',
          fontSize: isMobile ? '0.875rem' : '0.9rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {content}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100vh',
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: '#1e1e1e',
      zIndex: 9999
    }}>

      {/* Terminal Content */}
      <Box
        sx={{
          flexGrow: 1,
          p: 2,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: isMobile ? '0.875rem' : '0.9rem',
          lineHeight: 1.4,
          bgcolor: '#1e1e1e',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {renderTerminalLine('MannShell v1.0.0 - Secure Admin Terminal')}
        {renderTerminalLine('Copyright (c) 2024 MannBank. All rights reserved.')}
        {renderTerminalLine('')}
        {renderTerminalLine('This terminal requires administrative privileges.')}
        {renderTerminalLine('Unauthorized access is prohibited and will be logged.')}
        {renderTerminalLine('')}
        {renderTerminalLine('─'.repeat(60))}
        {renderTerminalLine('')}
        
        {step === 'username' && (
          <>
            {renderTerminalLine('Enter admin username:')}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 'auto',
              p: 1
            }}>
              <Typography sx={{ 
                color: '#4caf50', 
                mr: 1, 
                fontFamily: 'monospace',
                fontSize: isMobile ? '0.875rem' : '0.9rem',
                fontWeight: 'bold'
              }}>
                admin@mannbank:
              </Typography>
              <Typography sx={{ 
                color: '#87ceeb', 
                mr: 1, 
                fontFamily: 'monospace',
                fontSize: isMobile ? '0.875rem' : '0.9rem',
                fontWeight: 'bold'
              }}>
                ~$
              </Typography>
              <TextField
                ref={usernameRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleUsernameSubmit}
                placeholder="udc"
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: isMobile ? '0.875rem' : '0.9rem',
                    '& input': {
                      padding: 0,
                      caretColor: '#4caf50',
                      '&::placeholder': {
                        color: '#888',
                        opacity: 1
                      }
                    }
                  }
                }}
                sx={{
                  flexGrow: 1,
                  '& .MuiInput-root': {
                    '&:before': { display: 'none' },
                    '&:after': { display: 'none' }
                  }
                }}
              />
            </Box>
          </>
        )}

        {step === 'password' && (
          <>
            {renderTerminalLine('Enter admin password:')}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 'auto',
              p: 1
            }}>
              <Typography sx={{ 
                color: '#4caf50', 
                mr: 1, 
                fontFamily: 'monospace',
                fontSize: isMobile ? '0.875rem' : '0.9rem',
                fontWeight: 'bold'
              }}>
                admin@mannbank:
              </Typography>
              <Typography sx={{ 
                color: '#87ceeb', 
                mr: 1, 
                fontFamily: 'monospace',
                fontSize: isMobile ? '0.875rem' : '0.9rem',
                fontWeight: 'bold'
              }}>
                ~$
              </Typography>
              <TextField
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handlePasswordSubmit}
                placeholder="can"
                variant="standard"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: isMobile ? '0.875rem' : '0.9rem',
                    '& input': {
                      padding: 0,
                      caretColor: '#4caf50',
                      '&::placeholder': {
                        color: '#888',
                        opacity: 1
                      }
                    }
                  }
                }}
                sx={{
                  flexGrow: 1,
                  '& .MuiInput-root': {
                    '&:before': { display: 'none' },
                    '&:after': { display: 'none' }
                  }
                }}
              />
            </Box>
          </>
        )}

        {step === 'authenticating' && (
          <>
            {renderTerminalLine('Authenticating...')}
            {renderTerminalLine('Verifying admin credentials...')}
            {renderTerminalLine('Access granted. Initializing MannShell...')}
          </>
        )}

        {error && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error" sx={{ 
              bgcolor: '#2d2d2d', 
              color: '#ff6b6b',
              fontFamily: 'monospace',
              '& .MuiAlert-message': {
                fontFamily: 'monospace'
              }
            }}>
              {error}
            </Alert>
          </Box>
        )}
      </Box>

    </Box>
  );
};
