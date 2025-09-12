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
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, RegisterFormData } from '../../utils/validation'

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void
  onLoginClick: () => void
  isLoading?: boolean
  error?: string
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLoginClick,
  isLoading = false,
  error,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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
            Регистрация
          </Typography>
          <Typography variant="subtitle1">
            Создайте новый аккаунт BKMR
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
              {...register('firstName')}
              fullWidth
              label="Имя"
              margin="normal"
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <PersonIcon color="action" sx={{ mr: 1 }} />
                ),
              }}
            />

            <TextField
              {...register('lastName')}
              fullWidth
              label="Фамилия"
              margin="normal"
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <PersonIcon color="action" sx={{ mr: 1 }} />
                ),
              }}
            />

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

            <TextField
              {...register('confirmPassword')}
              fullWidth
              label="Подтвердите пароль"
              type="password"
              margin="normal"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
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
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
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
            onClick={onLoginClick}
            disabled={isLoading}
          >
            Войти в аккаунт
          </Button>
        </CardContent>
      </Card>
    </Box>
  )
} 