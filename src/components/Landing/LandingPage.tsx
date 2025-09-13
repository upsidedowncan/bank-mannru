import React from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  AccountBalance,
  Security,
  Speed,
  Support,
  ArrowForward,
  CreditCard,
  TrendingUp,
  Shield,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../../contexts/AuthContext'

export const LandingPage: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const features = [
    {
      icon: <Security sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Безопасность',
      description: 'Ваши средства защищены современными технологиями шифрования',
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Быстрые операции',
      description: 'Мгновенные переводы и платежи в любое время суток',
    },
    {
      icon: <Support sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: '24/7 Поддержка',
      description: 'Наша команда всегда готова помочь вам',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Выгодные условия',
      description: 'Минимальные комиссии и максимальная выгода',
    },
  ]

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, alignItems: 'center' }}>
            <Box>
              <Typography
                variant={isMobile ? 'h3' : 'h2'}
                component="h1"
                gutterBottom
                sx={{ fontWeight: 'bold' }}
              >
                Банк Маннру
              </Typography>
              <Typography
                variant="h5"
                sx={{ mb: 4, opacity: 0.9, lineHeight: 1.6 }}
              >
                Современный банк для современной жизни. Управляйте своими финансами с легкостью и безопасностью.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetStarted}
                  sx={{
                    bgcolor: 'white',
                    color: theme.palette.primary.main,
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }}
                  endIcon={<ArrowForward />}
                >
                  {user ? 'Перейти в кабинет' : 'Начать'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Узнать больше
                </Button>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 300,
              }}
            >
              <AccountBalance
                sx={{
                  fontSize: 200,
                  opacity: 0.3,
                  color: 'white',
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Почему выбирают нас
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Мы предлагаем лучшие условия для управления вашими финансами
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 4 }}>
          {features.map((feature, index) => (
            <Card
              key={index}
              sx={{
                height: '100%',
                textAlign: 'center',
                p: 3,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      {/* Stats Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 4, textAlign: 'center' }}>
            <Box>
              <Typography variant="h3" color="primary" gutterBottom>
                50,000+
              </Typography>
              <Typography variant="h6" gutterBottom>
                Довольных клиентов
              </Typography>
            </Box>
            <Box>
              <Typography variant="h3" color="primary" gutterBottom>
                99.9%
              </Typography>
              <Typography variant="h6" gutterBottom>
                Время работы сервиса
              </Typography>
            </Box>
            <Box>
              <Typography variant="h3" color="primary" gutterBottom>
                24/7
              </Typography>
              <Typography variant="h6" gutterBottom>
                Поддержка клиентов
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Paper
          sx={{
            p: { xs: 4, md: 6 },
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Готовы начать?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Присоединяйтесь к тысячам довольных клиентов уже сегодня
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{
              bgcolor: 'white',
              color: theme.palette.primary.main,
              px: 4,
              py: 1.5,
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
            endIcon={<ArrowForward />}
          >
            {user ? 'Перейти в кабинет' : 'Создать аккаунт'}
          </Button>
        </Paper>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: 'grey.900', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 4 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Банк Маннру
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Современный банк для современной жизни
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Контакты
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                support@mannru.bank
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" gutterBottom>
                Безопасность
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Ваши данные защищены
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              © 2024 Банк Маннру. Все права защищены.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
} 