import React from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Divider,
  Link,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useForm } from 'react-hook-form'; // Corrected import path
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '../../utils/validation';

// Icon Imports
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // For the right panel welcome icon
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  onRegisterClick: () => void;
  isLoading?: boolean;
  error?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onRegisterClick,
  isLoading = false,
  error,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const handleLoginSubmit = (data: LoginFormData) => {
    onSubmit(data);
  };

  const rightPanelBgColor = theme.palette.primary.main;
  const rightPanelTextColor = theme.palette.getContrastText(rightPanelBgColor);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column', // Stack vertically on mobile, side-by-side on desktop
        minHeight: '100vh',
        width: '100vw',
        bgcolor: '#1A1A1A', // Overall background matches the left panel's dark background
        overflow: 'hidden',
      }}
    >
      {/* Right Section: Welcome Info with Plain Theme Background (Order changed for mobile) */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          bgcolor: rightPanelBgColor,
          order: isDesktop ? 2 : 1, // On desktop, it's 2nd (right). On mobile, it's 1st (top).
          p: isDesktop ? 4 : 2,
          minHeight: isDesktop ? 'auto' : '200px',
          color: rightPanelTextColor,
        }}
      >
        <AccountCircleIcon sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Добро пожаловать
        </Typography>
        <Typography variant="subtitle1">
          Войдите в свой аккаунт Банка Маннру
        </Typography>
      </Box>

      {/* Left Section: Login Form (Order changed for mobile) */}
      <Box
        sx={{
          flex: isDesktop ? '0 0 500px' : '1', // Fixed width 500px on desktop, full width on mobile
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: isDesktop ? 4 : 2,
          bgcolor: '#1A1A1A',
          color: '#E0E0E0',
          order: isDesktop ? 1 : 2, // On desktop, it's 1st (left). On mobile, it's 2nd (below welcome).
        }}
      >
        {/* Inner Box to constrain the form's actual content width */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 360,
          }}
        >
          {/* Logo - ALIGNED LEFT */}
          <Box sx={{ textAlign: 'left', mb: 4 }}>
            <img src="/icon192.png" alt="Логотип Банка Маннру" style={{ width: 60, height: 60 }} />
          </Box>

          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
            Вход
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Email and Password Login Form */}
          <Box component="form" onSubmit={handleSubmit(handleLoginSubmit)}>
            {/* Email Field */}
            <Typography variant="body2" sx={{ mb: 0.5, color: '#E0E0E0' }}>
              Email
            </Typography>
            <TextField
              {...register('email')}
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Введите ваш Email"
              margin="none"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                    <EmailIcon color="action" sx={{ mr: 1, color: '#9E9E9E' }} />
                ),
                sx: {
                  bgcolor: '#2A2A2A',
                  color: '#FFFFFF',
                  '& fieldset': {
                    borderColor: '#4A4A4A',
                  },
                  '&:hover fieldset': {
                    borderColor: '#6A6A6A',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                  '& .MuiInputBase-input': {
                    py: 1.25,
                  },
                },
              }}
              sx={{ mb: 2 }}
            />

            {/* Password Field */}
            <Typography variant="body2" sx={{ mb: 0.5, color: '#E0E0E0' }}>
              Пароль
            </Typography>
            <TextField
              {...register('password')}
              fullWidth
              variant="outlined"
              size="small"
              type="password"
              placeholder="Введите ваш пароль"
              margin="none"
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <LockIcon color="action" sx={{ mr: 1, color: '#9E9E9E' }} />
                ),
                sx: {
                  bgcolor: '#2A2A2A',
                  color: '#FFFFFF',
                  '& fieldset': {
                    borderColor: '#4A4A4A',
                  },
                  '&:hover fieldset': {
                    borderColor: '#6A6A6A',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                  '& .MuiInputBase-input': {
                    py: 1.25,
                  },
                },
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                py: 1.5,
                bgcolor: '#FFFFFF',
                color: '#1A1A1A',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#F0F0F0',
                },
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </Box>

          {/* Registration Link */}
          <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
            Нет аккаунта?{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onRegisterClick}
              sx={{
                color: theme.palette.secondary.main,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
              disabled={isLoading}
            >
              Зарегистрироваться
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};