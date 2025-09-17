import React, { useMemo } from 'react'
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
import { motion } from 'framer-motion'
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
  const isDark = theme.palette.mode === 'dark'

  const heroVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  }), [])

  const staggerContainer = useMemo(() => ({
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  }), [])

  const item = useMemo(() => ({
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }), [])

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
          background: isDark
            ? `radial-gradient(1200px 800px at 10% -10%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(1000px 700px at 110% 10%, rgba(255,255,255,0.04), transparent 60%), linear-gradient(135deg, #0f1318 0%, #0a0d11 100%)`
            : `radial-gradient(1200px 800px at 10% -10%, ${theme.palette.primary.light}22, transparent 60%), radial-gradient(1000px 700px at 110% 10%, ${theme.palette.secondary.main}22, transparent 60%), linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, alignItems: 'center' }}>
            <motion.div variants={heroVariants} initial="hidden" animate="visible">
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
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ duration: 0.8 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 300,
                  position: 'relative',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 6, -6, 0] }}
                  transition={{ duration: 8, repeat: Infinity }}
                  style={{ position: 'absolute', filter: 'drop-shadow(0 12px 40px rgba(0,0,0,0.25))' }}
                >
                  <AccountBalance
                    sx={{
                      fontSize: 200,
                      opacity: isDark ? 0.5 : 0.35,
                      color: 'white',
                    }}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0.15, 0.35] }}
                  transition={{ duration: 6, repeat: Infinity }}
                  style={{
                    position: 'absolute',
                    width: 220,
                    height: 220,
                    borderRadius: '50%',
                    background: isDark
                      ? 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), rgba(255,255,255,0) 60%)'
                      : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%)',
                    mixBlendMode: 'screen',
                  }}
                />
              </Box>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, sm: 3 } }}>
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Почему выбирают нас
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Мы предлагаем лучшие условия для управления вашими финансами
          </Typography>
        </Box>

        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 4 }}>
            {features.map((feature, index) => (
              <motion.div key={index} variants={item} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    p: 3,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'background.paper',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
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
              </motion.div>
            ))}
          </Box>
        </motion.div>
      </Container>

      {/* Stats Section */}
      <Box sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50', py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
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
          </motion.div>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 }, textAlign: 'center', px: { xs: 2, sm: 3 } }}>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.5 }}>
          <Paper
            sx={{
              p: { xs: 4, md: 6 },
              background: isDark
                ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
                : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
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
        </motion.div>
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