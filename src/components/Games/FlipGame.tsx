import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  Casino,
  Face,
  CurrencyExchange,
  TrendingUp,
  TrendingDown,
  Circle,
} from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface BankCard {
  id: string;
  card_name: string;
  card_number: string;
  card_type: string;
  balance: number;
  currency: string;
  user_id: string;
}

export const FlipGame: React.FC = () => {
  const { user } = useAuthContext();
  const [cards, setCards] = useState<BankCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [prediction, setPrediction] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [lastBetAmount, setLastBetAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user) {
      fetchUserCards();
    }
  }, [user]);

  const fetchUserCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (error) throw error;
      setCards(data || []);
      if (data && data.length > 0) {
        setSelectedCard(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
      setSnackbar({ open: true, message: 'Ошибка при загрузке карт', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = async () => {
    if (!selectedCard || !betAmount || parseFloat(betAmount) <= 0) {
      setSnackbar({ open: true, message: 'Выберите карту и введите сумму ставки', severity: 'error' });
      return;
    }

    const selectedCardData = cards.find(card => card.id === selectedCard);
    if (!selectedCardData) {
      setSnackbar({ open: true, message: 'Карта не найдена', severity: 'error' });
      return;
    }

    if (parseFloat(betAmount) > selectedCardData.balance) {
      setSnackbar({ open: true, message: 'Недостаточно средств на карте', severity: 'error' });
      return;
    }

    setIsFlipping(true);
    setResult(null);
    setWon(null);
    setLastBetAmount(parseFloat(betAmount));

    // Simulate coin flip with animation delay
    setTimeout(() => {
      const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';
      const userWon = flipResult === prediction;
      
      setResult(flipResult);
      setWon(userWon);

      // Process the bet
      processBet(selectedCardData, parseFloat(betAmount), userWon);
    }, 2000);
  };

  const processBet = async (card: BankCard, amount: number, won: boolean) => {
    try {
      const newBalance = won ? card.balance + amount : card.balance - amount;
      
      const { error } = await supabase
        .from('bank_cards')
        .update({ balance: newBalance })
        .eq('id', card.id);

      if (error) throw error;

      // Update local state
      setCards(prev => prev.map(c => 
        c.id === card.id ? { ...c, balance: newBalance } : c
      ));

      const message = won 
        ? `Поздравляем! Вы выиграли ${formatCurrency(amount, card.currency)}!`
        : `К сожалению, вы проиграли ${formatCurrency(amount, card.currency)}.`;

      setSnackbar({ 
        open: true, 
        message, 
        severity: won ? 'success' : 'error' 
      });

      // Reset form
      setBetAmount('');
    } catch (error) {
      console.error('Error processing bet:', error);
      setSnackbar({ open: true, message: 'Ошибка при обработке ставки', severity: 'error' });
    } finally {
      setIsFlipping(false);
    }
  };

  const resetGame = () => {
    setResult(null);
    setWon(null);
    setBetAmount('');
  };

  const selectedCardData = cards.find(card => card.id === selectedCard);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>Игра "Брось монету"</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (cards.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>Игра "Брось монету"</Typography>
        <Divider sx={{ mb: 2 }} />
        <Alert severity="warning">
          У вас нет активных карт. Создайте карту в панели управления, чтобы играть.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Игра "Брось монету"</Typography>
      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        {/* Game Controls */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Casino color="primary" />
              Сделать ставку
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Выберите карту</InputLabel>
              <Select
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
                label="Выберите карту"
              >
                {cards.map((card) => (
                  <MenuItem key={card.id} value={card.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Box>
                        <Typography variant="body1">{card.card_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {card.card_number} • {card.card_type}
                        </Typography>
                      </Box>
                      <Typography variant="body1" color="primary">
                        {formatCurrency(card.balance, card.currency)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Сумма ставки"
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <CurrencyExchange sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Ваш прогноз</InputLabel>
              <Select
                value={prediction}
                onChange={(e) => setPrediction(e.target.value as 'heads' | 'tails')}
                label="Ваш прогноз"
              >
                <MenuItem value="heads">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Face />
                    Орёл
                  </Box>
                </MenuItem>
                <MenuItem value="tails">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp />
                    Решка
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleFlip}
              disabled={isFlipping || !betAmount || parseFloat(betAmount) <= 0}
              startIcon={isFlipping ? <CircularProgress size={20} /> : <Casino />}
            >
              {isFlipping ? 'Подбрасываем монету...' : 'Подбросить монету'}
            </Button>

            {result && (
              <Button
                fullWidth
                variant="outlined"
                onClick={resetGame}
                sx={{ mt: 2 }}
              >
                Играть снова
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Game Result */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Результат</Typography>
            
            {!result && !isFlipping && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Casino sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Сделайте ставку и подбросьте монету
                </Typography>
              </Box>
            )}

            {isFlipping && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Монета в воздухе...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ваш прогноз: {prediction === 'heads' ? 'Орёл' : 'Решка'}
                </Typography>
              </Box>
            )}

            {result && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ 
                  fontSize: 80, 
                  mb: 2,
                  color: won ? 'success.main' : 'error.main',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Circle sx={{ fontSize: 80, color: won ? 'success.main' : 'error.main' }} />
                </Box>
                
                <Typography variant="h4" gutterBottom>
                  {result === 'heads' ? 'Орёл' : 'Решка'}
                </Typography>

                <Chip
                  label={won ? 'Победа!' : 'Проигрыш'}
                  color={won ? 'success' : 'error'}
                  sx={{ mb: 2, fontSize: '1.1rem', py: 1 }}
                />

                <Typography variant="body1" gutterBottom>
                  Ваш прогноз: {prediction === 'heads' ? 'Орёл' : 'Решка'}
                </Typography>

                <Typography variant="body1" color={won ? 'success.main' : 'error.main'}>
                  {won 
                    ? `+${formatCurrency(lastBetAmount, selectedCardData?.currency || 'MR')}`
                    : `-${formatCurrency(lastBetAmount, selectedCardData?.currency || 'MR')}`
                  }
                </Typography>

                {selectedCardData && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Новый баланс: {formatCurrency(selectedCardData.balance, selectedCardData.currency)}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Game Rules */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Правила игры</Typography>
          <Typography variant="body2" paragraph>
            • Выберите карту и введите сумму ставки
          </Typography>
          <Typography variant="body2" paragraph>
            • Угадайте, на какую сторону упадёт монета: Орёл или Решка
          </Typography>
          <Typography variant="body2" paragraph>
            • Если угадали - получаете двойную ставку
          </Typography>
          <Typography variant="body2" paragraph>
            • Если не угадали - теряете ставку
          </Typography>
        </CardContent>
      </Card>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}; 