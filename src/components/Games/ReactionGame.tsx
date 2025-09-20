import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { AppLayout } from '../Layout/AppLayout';

export const ReactionGame: React.FC = () => {
  const [waiting, setWaiting] = React.useState(false);
  const [go, setGo] = React.useState(false);
  const [startTs, setStartTs] = React.useState<number | null>(null);
  const [resultMs, setResultMs] = React.useState<number | null>(null);
  const timerRef = React.useRef<any>(null);

  const start = () => {
    setResultMs(null);
    setWaiting(true);
    setGo(false);
    const delay = 800 + Math.floor(Math.random() * 2200);
    timerRef.current = setTimeout(() => {
      setGo(true);
      setStartTs(Date.now());
    }, delay);
  };

  const handleTap = () => {
    if (waiting && !go) {
      // too soon
      if (timerRef.current) clearTimeout(timerRef.current);
      setWaiting(false);
      setGo(false);
      setStartTs(null);
      setResultMs(null);
      return;
    }
    if (go && startTs) {
      const delta = Date.now() - startTs;
      setResultMs(delta);
    }
    setWaiting(false);
    setGo(false);
    setStartTs(null);
  };

  return (
    <AppLayout>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2}>
        <Paper sx={{ p: 3, maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>Игра на реакцию</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Нажмите «Старт», ждите зелёного экрана и коснитесь как можно быстрее.
          </Typography>
          <Box
            onClick={handleTap}
            sx={{
              height: 220,
              borderRadius: 2,
              bgcolor: go ? 'success.main' : waiting ? 'warning.main' : 'action.hover',
              color: 'common.white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              userSelect: 'none',
              cursor: 'pointer',
            }}
          >
            <Typography variant="h6">
              {go ? 'ЖМИ!' : waiting ? 'Ждите…' : 'Нажмите здесь'}
            </Typography>
          </Box>
          <Button variant="contained" fullWidth onClick={start} sx={{ mb: 1 }}>Старт</Button>
          {resultMs !== null && (
            <Typography variant="body1">Ваш результат: {resultMs} мс</Typography>
          )}
        </Paper>
      </Box>
    </AppLayout>
  );
};

export default ReactionGame;


