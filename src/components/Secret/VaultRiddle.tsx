import React from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, LinearProgress, Slider, Typography } from '@mui/material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

interface VaultRiddleProps {
  open: boolean;
  onClose: () => void;
  rewardMr?: number;
}

export const VaultRiddle: React.FC<VaultRiddleProps> = ({ open, onClose, rewardMr = 5000 }) => {
  const { user } = useAuthContext();
  const [step, setStep] = React.useState(0);
  const [sequence, setSequence] = React.useState<number[]>([]);
  const [holdProgress, setHoldProgress] = React.useState(0);
  const holdTimer = React.useRef<any>(null);
  const [sliderValue, setSliderValue] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [altCount, setAltCount] = React.useState(0);
  const [lastSide, setLastSide] = React.useState<'L' | 'R' | null>(null);
  const [altTimer, setAltTimer] = React.useState<any>(null);

  React.useEffect(() => {
    if (!open) {
      setStep(0);
      setSequence([]);
      setHoldProgress(0);
      setSliderValue(0);
      setMessage(null);
    }
    setAltCount(0);
    setLastSide(null);
    if (altTimer) clearTimeout(altTimer);
  }, [open]);

  const pattern = [2, 4, 1, 3];

  const handlePatternTap = (i: number) => {
    if (pattern[sequence.length] === i) {
      const next = [...sequence, i];
      setSequence(next);
      if (next.length === pattern.length) {
        setStep(1);
      }
    } else {
      setSequence([]);
    }
  };

  const handleHoldStart = () => {
    let p = 0;
    setHoldProgress(0);
    holdTimer.current = setInterval(() => {
      p += 5;
      setHoldProgress(p);
      if (p >= 100) {
        clearInterval(holdTimer.current);
        setStep(2);
      }
    }, 100);
  };

  const handleHoldEnd = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    if (holdProgress < 100) setHoldProgress(0);
  };

  const targetValue = 42;
  const submit = async () => {
    if (!user) { setMessage('Требуется вход.'); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      // Find active card
      const { data: cards, error: fetchErr } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (fetchErr) throw fetchErr;
      const actives = (cards || []).filter((c: any) => c.is_active === true || c.is_active === 'true' || c.is_active === 1);
      if (!actives || actives.length === 0) throw new Error('Нет активной карты для зачисления.');
      const card = actives[0];
      const newBal = (Number(card.balance) || 0) + rewardMr;
      const { error: updErr } = await supabase
        .from('bank_cards')
        .update({ balance: newBal })
        .eq('id', card.id);
      if (updErr) throw updErr;
      // Log reward
      await supabase.from('vault_riddle_rewards').insert({ user_id: user.id, amount: rewardMr });
      setMessage('Параметры применены.');
    } catch (e: any) {
      setMessage(e?.message || 'Ошибка операции');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAltTap = (side: 'L' | 'R') => {
    // must alternate L-R-L-R... 10 times within 8 seconds
    if (!altTimer) {
      const tm = setTimeout(() => {
        setAltCount(0);
        setLastSide(null);
        setAltTimer(null);
      }, 8000);
      setAltTimer(tm);
    }
    if (lastSide === side) {
      setAltCount(0);
      setLastSide(null);
      return;
    }
    setLastSide(side);
    setAltCount(c => {
      const next = c + 1;
      if (next >= 10) {
        if (altTimer) { clearTimeout(altTimer); setAltTimer(null); }
        setStep(3);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Панель Стабильности</DialogTitle>
      <DialogContent>
        {step === 0 && (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Этап 1 — проверка паттернов ввода.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {[1,2,3,4].map(i => (
                <Button key={i} variant="contained" onClick={() => handlePatternTap(i)} sx={{ height: 72, fontSize: 18 }}>{i}</Button>
              ))}
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>Шаг: {sequence.length}/{pattern.length}</Typography>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Этап 2 — устойчивость соединения: удерживайте, пока индикатор не заполнится.</Typography>
            <LinearProgress variant="determinate" value={holdProgress} sx={{ mb: 2 }} />
            <Button
              variant="contained"
              fullWidth
              sx={{ height: 64, fontSize: 18 }}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
            >
              Удерживать
            </Button>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Этап 3 — калибровка: выставьте ползунок на {targetValue}.</Typography>
            <Slider value={sliderValue} onChange={(_, v) => setSliderValue(v as number)} min={0} max={100} step={1} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" fullWidth onClick={() => handleAltTap('L')}>Левая</Button>
              <Button variant="outlined" fullWidth onClick={() => handleAltTap('R')}>Правая</Button>
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>Этап 4 — чередуйте нажатия: {altCount}/10</Typography>
          </Box>
        )}

        {step === 3 && (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Готово. Применить изменения?</Typography>
            <Button
              variant="contained"
              fullWidth
              disabled={submitting}
              onClick={submit}
            >
              Применить
            </Button>
            {message && <Typography color={message.startsWith('+') ? 'success.main' : 'error'} sx={{ mt: 1 }}>{message}</Typography>}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VaultRiddle;


