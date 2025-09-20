import React from 'react';
import { Box, Button, Typography, Paper, Grid } from '@mui/material';
import { AppLayout } from '../Layout/AppLayout';

export const WhackAMole: React.FC = () => {
  const [mole, setMole] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(30);
  const tmRef = React.useRef<any>(null);
  const tickRef = React.useRef<any>(null);

  const start = () => {
    setScore(0);
    setTimeLeft(30);
    setMole(Math.floor(Math.random() * 9));
    if (tmRef.current) clearInterval(tmRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setMole(Math.floor(Math.random() * 9));
    }, 700);
    tmRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(tmRef.current);
          clearInterval(tickRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const hit = (i: number) => {
    if (timeLeft <= 0) return;
    if (i === mole) {
      setScore(s => s + 1);
      setMole(null);
    }
  };

  React.useEffect(() => () => {
    if (tmRef.current) clearInterval(tmRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  return (
    <AppLayout>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2}>
        <Paper sx={{ p: 3, maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>Кротобой</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Попадайте по кроту до конца таймера.</Typography>
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <Grid item xs={4} key={i}>
                <Box
                  onClick={() => hit(i)}
                  sx={{
                    height: 80,
                    borderRadius: 2,
                    bgcolor: i === mole ? 'success.main' : 'action.hover',
                    cursor: 'pointer',
                  }}
                />
              </Grid>
            ))}
          </Grid>
          <Button variant="contained" fullWidth onClick={start}>Старт</Button>
          <Typography sx={{ mt: 1 }}>Счёт: {score} • Время: {timeLeft}s</Typography>
        </Paper>
      </Box>
    </AppLayout>
  );
};

export default WhackAMole;


