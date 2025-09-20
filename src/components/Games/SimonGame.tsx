import React from 'react';
import { Box, Button, Typography, Paper, Grid } from '@mui/material';
import { AppLayout } from '../Layout/AppLayout';

const colors = ['#e53935', '#43a047', '#1e88e5', '#fbc02d'];

export const SimonGame: React.FC = () => {
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [input, setInput] = React.useState<number[]>([]);
  const [active, setActive] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [locked, setLocked] = React.useState(true);

  const flash = async (idx: number) => {
    return new Promise<void>(res => {
      setActive(idx);
      setTimeout(() => { setActive(null); res(); }, 500);
    });
  };

  const playBack = async (seq: number[]) => {
    setLocked(true);
    for (const i of seq) {
      await flash(i);
      await new Promise(r => setTimeout(r, 200));
    }
    setLocked(false);
  };

  const start = async () => {
    const first = Math.floor(Math.random() * 4);
    const seq = [first];
    setSequence(seq);
    setInput([]);
    setScore(0);
    await playBack(seq);
  };

  const nextRound = async () => {
    const next = Math.floor(Math.random() * 4);
    const seq = [...sequence, next];
    setSequence(seq);
    setInput([]);
    setScore(seq.length - 1);
    await playBack(seq);
  };

  const handlePad = async (i: number) => {
    if (locked) return;
    await flash(i);
    const nextInput = [...input, i];
    setInput(nextInput);
    for (let k = 0; k < nextInput.length; k++) {
      if (nextInput[k] !== sequence[k]) {
        setLocked(true);
        return;
      }
    }
    if (nextInput.length === sequence.length) {
      await new Promise(r => setTimeout(r, 300));
      nextRound();
    }
  };

  return (
    <AppLayout>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2}>
        <Paper sx={{ p: 3, maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>Саймон</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Повторяйте последовательность цветов.</Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {[0,1,2,3].map(i => (
              <Grid item xs={6} key={i}>
                <Box
                  onClick={() => handlePad(i)}
                  sx={{
                    height: 100,
                    borderRadius: 2,
                    bgcolor: active === i ? 'grey.300' : colors[i],
                    cursor: 'pointer',
                  }}
                />
              </Grid>
            ))}
          </Grid>
          <Button variant="contained" fullWidth onClick={start}>Старт</Button>
          <Typography sx={{ mt: 1 }}>Счёт: {score}</Typography>
        </Paper>
      </Box>
    </AppLayout>
  );
};

export default SimonGame;


