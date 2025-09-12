import React from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Divider,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginFormData } from '../../utils/validation'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import HowToRegIcon from '@mui/icons-material/HowToReg'


interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void
  onRegisterClick: () => void
  isLoading?: boolean
  error?: string
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
  })

  return (

    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 0
      }}
    >
      <Card sx={{ 
        width: '100%',
        maxWidth: '100%',
        height: '100vh',
        borderRadius: 0,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          p: 4,
          textAlign: 'center'
        }}>
          <AccountCircleIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Добро пожаловать
          </Typography>
          <Typography variant="subtitle1">
            Войдите в свой аккаунт BKMR
          </Typography>
        </Box>
        <CardContent sx={{ p: 4 }}>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <TextField
              {...register('email')}
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <EmailIcon color="action" sx={{ mr: 1 }} />
                ),
              }}
            />

            <TextField
              {...register('password')}
              fullWidth
              label="Пароль"
              type="password"
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <LockIcon color="action" sx={{ mr: 1 }} />
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ 
                mt: 3, 
                mb: 2,
                py: 1.5,
                fontSize: '1.1rem',
                bgcolor: 'secondary.main',
                '&:hover': {
                  bgcolor: 'secondary.dark'
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </Button>
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              или
            </Typography>
          </Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={onRegisterClick}
              disabled={isLoading}
              startIcon={<HowToRegIcon />}
              sx={{ mt: 1 }}
            >
              Зарегистрироваться
            </Button>
        </CardContent>
      </Card>
    </Box>
  )
} 