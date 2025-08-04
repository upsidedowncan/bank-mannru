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
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Регистрация
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Создайте новый аккаунт
          </Typography>

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
            />

            <TextField
              {...register('lastName')}
              fullWidth
              label="Фамилия"
              margin="normal"
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              disabled={isLoading}
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
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
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