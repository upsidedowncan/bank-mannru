import React, { useState, useRef } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { AppLayout } from '../Layout/AppLayout';
import PageHeader from '../Layout/PageHeader';

export const TappingGame: React.FC = () => {
  const { user } = useAuthContext();
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameActive, setGameActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reward, setReward] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [activeCards, setActiveCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [chooseCardOpen, setChooseCardOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setTaps(0);
    setTimeLeft(10);
    setShowResult(false);
    setGameActive(true);
    setReward(0);
    setError(null);
    setNewBalance(null);
    setActiveCards([]);
    setSelectedCardId('');
    setChooseCardOpen(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameActive(false);
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (gameActive) setTaps(t => t + 1);
  };

  const playAgain = () => {
    startGame();
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (showResult && taps > 0 && user) {
      const giveReward = async () => {
        setLoading(true);
        setError(null);
        setReward(taps * 10);
        // Fetch all cards for the user and filter active ones robustly
        const { data: cards, error: fetchError } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (fetchError) {
          setError('Ошибка при получении карты');
          setLoading(false);
          return;
        }
        // Debug: log is_active values
        if (cards) {
          // REMOVE THIS LOG LATER
          console.log('All cards:', cards.map(c => ({ id: c.id, is_active: c.is_active, card_name: c.card_name, card_number: c.card_number })));
        }
        const actives = (cards || []).filter(card => card.is_active === true || card.is_active === 'true' || card.is_active === 1);
        setActiveCards(actives);
        if (!actives || actives.length === 0) {
          setError('У вас нет активных карт для зачисления МР.');
          setLoading(false);
          return;
        }
        if (actives.length === 1) {
          // Only one card, credit it
          const card = actives[0];
          const newBal = (card.balance || 0) + taps * 10;
          const { error: updateError } = await supabase
            .from('bank_cards')
            .update({ balance: newBal })
            .eq('id', card.id);
          if (updateError) {
            setError('Ошибка при зачислении МР');
            setLoading(false);
            return;
          }
          setNewBalance(newBal);
          setLoading(false);
        } else {
          // Multiple cards, let user choose
          setChooseCardOpen(true);
          setLoading(false);
        }
      };
      giveReward();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult]);

  const handleChooseCard = async () => {
    if (!selectedCardId) return;
    setLoading(true);
    setError(null);
    const card = activeCards.find(c => c.id === selectedCardId);
    if (!card) {
      setError('Карта не найдена');
      setLoading(false);
      return;
    }
    const newBal = (card.balance || 0) + taps * 10;
    const { error: updateError } = await supabase
      .from('bank_cards')
      .update({ balance: newBal })
      .eq('id', card.id);
    if (updateError) {
      setError('Ошибка при зачислении МР');
      setLoading(false);
      return;
    }
    setNewBalance(newBal);
    setChooseCardOpen(false);
    setLoading(false);
  };

  return (
    <AppLayout>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default" sx={{ overflow: 'hidden' }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%', textAlign: 'center', overflow: 'hidden' }}>
          <PageHeader title="Таппинг-игра" />
          {!gameActive && !showResult && (
            <Button variant="contained" color="primary" onClick={startGame} size="large">Начать игру</Button>
          )}
          {gameActive && (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>Осталось времени: {timeLeft} сек</Typography>
              <Typography variant="h5" sx={{ my: 2 }}>Тапы: {taps}</Typography>
              <Button variant="contained" color="secondary" onClick={handleTap} size="large" sx={{ fontSize: 24, py: 2, px: 4 }}>Тап!</Button>
            </>
          )}
          {showResult && (
            <>
              <Typography variant="h5" sx={{ mt: 2 }}>Игра окончена!</Typography>
              <Typography variant="h6" sx={{ my: 2 }}>Ваш результат: {taps} тап(ов)</Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>Вы заработали: {taps * 10} МР</Typography>
              {loading && <CircularProgress sx={{ my: 2 }} />}
              {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
              {newBalance !== null && !loading && !error && (
                <Alert severity="success" sx={{ my: 2 }}>Ваш новый баланс: {newBalance} МР</Alert>
              )}
              <Button variant="contained" color="primary" onClick={playAgain}>Играть снова</Button>
            </>
          )}
        </Paper>
        <Dialog open={chooseCardOpen} onClose={() => setChooseCardOpen(false)}>
          <DialogTitle>Выберите карту для зачисления МР</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="select-card-label">Карта</InputLabel>
              <Select
                labelId="select-card-label"
                value={selectedCardId}
                label="Карта"
                onChange={e => setSelectedCardId(e.target.value)}
              >
                {activeCards.map(card => (
                  <MenuItem key={card.id} value={card.id}>
                    {card.card_name} • {card.card_number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChooseCardOpen(false)}>Отмена</Button>
            <Button onClick={handleChooseCard} disabled={!selectedCardId || loading} variant="contained">Зачислить</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AppLayout>
  );
}; 