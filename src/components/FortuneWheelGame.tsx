// src/components/FortuneWheelGame.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import {
  Container,
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Divider,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';

import {
  ArrowBack as ArrowBackIcon,
  Casino as GameIcon,
  Redeem as RedeemIcon,
  AttachMoney as MoneyIcon,
  CancelOutlined as LoseIcon,
  CheckCircleOutline as WinIcon,
  Refresh as ResetIcon,
  PlayArrow as SpinIcon,
  Star as StarIcon,
  Troubleshoot as AnalyzeIcon,
  Autorenew as RepeatIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/Layout/PageHeader';

import { supabase } from '../config/supabase';
import { useAuthContext } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';

interface BankCard {
  id: string;
  card_number: string;
  card_type: 'debit' | 'credit';
  card_name: string;
  balance: number;
  currency: string;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
  debt?: number;
  user_id: string;
  user_name?: string;
}

// --- Wheel Segment Definitions ---
interface WheelSegment {
  id: string;
  label: string; // Label still needed for dialog message
  color: string; // CSS color
  value: number; // MR value (positive for win, negative for loss)
  // icon?: React.ElementType; // ICONS ARE REMOVED
}

const BASE_SEGMENTS: WheelSegment[] = [
  { id: '1', label: '+500 MR', color: '#4CAF50', value: 500 },
  { id: '2', label: '-200 MR', color: '#F44336', value: -200 },
  { id: '3', label: '+1000 MR', color: '#8BC34A', value: 1000 },
  { id: '4', label: 'Попробуй ещё!', color: '#2196F3', value: 0 },
  { id: '5', label: '-100 MR', color: '#FF5722', value: -100 },
  { id: '6', label: '+200 MR', color: '#66BB6A', value: 200 },
  { id: '7', label: '+2000 MR', color: '#00C853', value: 2000 },
  { id: '8', label: '-500 MR', color: '#D32F2F', value: -500 },
];

interface DifficultyConfig {
  label: string;
  segments: WheelSegment[]; // Custom segments for this difficulty
  spinCost: number; // Cost to spin the wheel
}

const DIFFICULTIES: { [key: string]: DifficultyConfig } = {
  easy: {
    label: 'Легкий',
    segments: [
      { id: 'e1', label: '+500 MR', color: '#4CAF50', value: 500 },
      { id: 'e2', label: '-100 MR', color: '#FF5722', value: -100 },
      { id: 'e3', label: '+1000 MR', color: '#8BC34A', value: 1000 },
      { id: 'e4', label: 'Попробуй ещё!', color: '#2196F3', value: 0 },
      { id: 'e5', label: '+250 MR', color: '#66BB6A', value: 250 },
      { id: 'e6', label: '-50 MR', color: '#F44336', value: -50 },
      { id: 'e7', label: '+750 MR', color: '#00C853', value: 750 },
      { id: 'e8', label: 'Попробуй ещё!', color: '#90CAF9', value: 0 },
    ],
    spinCost: 100,
  },
  medium: {
    label: 'Средний',
    segments: [
      { id: 'm1', label: '+1000 MR', color: '#8BC34A', value: 1000 },
      { id: 'm2', label: '-200 MR', color: '#FF5722', value: -200 },
      { id: 'm3', label: '+1500 MR', color: '#4CAF50', value: 1500 },
      { id: 'm4', label: 'Попробуй ещё!', color: '#2196F3', value: 0 },
      { id: 'm5', label: '-500 MR', color: '#D32F2F', value: -500 },
      { id: 'm6', label: '+750 MR', color: '#66BB6A', value: 750 },
      { id: 'm7', label: '+2500 MR', color: '#00C853', value: 2500 },
      { id: 'm8', label: '-100 MR', color: '#FF9800', value: -100 },
    ],
    spinCost: 250,
  },
  hard: {
    label: 'Сложный',
    segments: [
      { id: 'h1', label: '+2000 MR', color: '#4CAF50', value: 2000 },
      { id: 'h2', label: '-1000 MR', color: '#D32F2F', value: -1000 },
      { id: 'h3', label: '+3000 MR', color: '#8BC34A', value: 3000 },
      { id: 'h4', label: 'Попробуй ещё!', color: '#2196F3', value: 0 },
      { id: 'h5', label: '-1500 MR', color: '#FF5722', value: -1500 },
      { id: 'h6', label: '+1000 MR', color: '#66BB6A', value: 1000 },
      { id: 'h7', label: '+5000 MR', color: '#00C853', value: 5000 },
      { id: 'h8', label: '-500 MR', color: '#FF9800', value: -500 },
    ],
    spinCost: 500,
  },
};
// --- END Wheel Segment Definitions ---

export const FortuneWheelGame: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const navigate = useNavigate();

  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSpinCardId, setSelectedSpinCardId] = useState<string | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0); // Current rotation of the wheel
  const [resultSegment, setResultSegment] = useState<WheelSegment | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');

  const [selectedDifficulty, setSelectedDifficulty] = useState<keyof typeof DIFFICULTIES>('easy');

  const difficultyConfig = useMemo(() => DIFFICULTIES[selectedDifficulty], [selectedDifficulty]);
  const currentSegments = useMemo(() => difficultyConfig.segments, [difficultyConfig]);
  const currentSpinCost = useMemo(() => difficultyConfig.spinCost, [difficultyConfig]);

  const fetchCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('balance', { ascending: false });

      if (error) {
        throw error;
      }
      setCards(data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching cards:', error);
      setError('Ошибка при загрузке карт.');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCards();
    // Re-evaluate if selectedSpinCardId is still valid when cards or spinCost change
    if (selectedSpinCardId) {
      const currentCard = cards.find(c => c.id === selectedSpinCardId);
      if (!currentCard || currentCard.balance < currentSpinCost || !currentCard.is_active) {
        setSelectedSpinCardId(null); // Clear selection if invalid
      }
    }
  }, [fetchCards, currentSpinCost, cards, selectedSpinCardId]);

  const handleSpin = async () => {
    if (spinning || !selectedSpinCardId || !user) {
      setError('Выберите карту и убедитесь, что колесо не крутится.');
      return;
    }

    let cardToDeductFrom = cards.find((card) => card.id === selectedSpinCardId);
    if (!cardToDeductFrom || !cardToDeductFrom.is_active) {
      setError('Выбранная карта неактивна или не найдена.');
      return;
    }
    if (cardToDeductFrom.balance < currentSpinCost) {
      setError(`Недостаточно средств на карте "${cardToDeductFrom.card_name}" для оплаты спина (${formatCurrency(currentSpinCost, 'MR')}).`);
      return;
    }

    setSpinning(true);
    setResultMessage(null);
    setError(null);
    setResultSegment(null);

    // Deduct spin cost immediately
    try {
      const { error: deductError } = await supabase
        .from('bank_cards')
        .update({ balance: cardToDeductFrom.balance - currentSpinCost })
        .eq('id', cardToDeductFrom.id);

      if (deductError) throw deductError;
      fetchCards(); // Refresh cards to show deduction
    } catch (e: any) {
      console.error('Error deducting spin cost:', e);
      setError(`Ошибка при оплате спина: ${e.message || 'Неизвестная ошибка'}`);
      setSpinning(false);
      return;
    }

    // Determine winning segment
    const randomIndex = Math.floor(Math.random() * currentSegments.length);
    const winningSegment = currentSegments[randomIndex];
    const degreesPerSegment = 360 / currentSegments.length;
    
    const halfSegmentDegrees = degreesPerSegment / 2;

    const targetMiddleAngle = randomIndex * degreesPerSegment + halfSegmentDegrees;
    const rotationToAlign = (360 - targetMiddleAngle + 360) % 360;

    const numFullSpins = 5 + Math.random() * 5;
    const newRotation = rotation + (360 * numFullSpins) + rotationToAlign;

    setRotation(newRotation);

    const animationDurationMs = 5000; // This should match the motion.div duration
    
    // --- CRITICAL FIX: The logic for handling dialog appearance ---
    // The dialog should appear *after* the animation visually completes.
    // The previous error was that the setTimeout was correctly delaying the logic,
    // but the task was for it to be instant *after the spin stops*.
    // So, we use a setTimeout to wait for the visual animation to finish.
    setTimeout(async () => {
        setSpinning(false);
        setResultSegment(winningSegment);
        
        let finalMessage = '';
        if (winningSegment.value > 0) {
          finalMessage = `Вы выиграли ${formatCurrency(winningSegment.value, 'MR')}!`;
        } else if (winningSegment.value < 0) {
          finalMessage = `Вы проиграли ${formatCurrency(Math.abs(winningSegment.value), 'MR')}.`;
        } else {
          finalMessage = `Выпало: ${winningSegment.label}.`;
        }
        setResultMessage(finalMessage);

        // Apply prize/penalty
        if (winningSegment.value !== 0) {
          try {
            const { data: updatedCards, error: fetchUpdatedCardsError } = await supabase
              .from('bank_cards')
              .select('*')
              .eq('user_id', user?.id)
              .order('balance', { ascending: false });

            if (fetchUpdatedCardsError) throw fetchUpdatedCardsError;

            if (!updatedCards || updatedCards.length === 0) {
              throw new Error('Нет доступных карт для зачисления/списания.');
            }

            let cardToUpdate: BankCard | undefined = updatedCards.find(card => card.id === selectedSpinCardId);
            if (!cardToUpdate || !cardToUpdate.is_active) {
              cardToUpdate = updatedCards.find(c => c.is_active);
              if (cardToUpdate) {
                  setError(`Выбранная карта неактивна или не найдена для результата, использована "${cardToUpdate.card_name}".`);
              } else {
                  throw new Error('Нет активных карт для зачисления/списания результата.');
              }
            }
            
            let newBalance = cardToUpdate.balance + winningSegment.value;
            if (newBalance < 0) newBalance = 0;

            const { error: updateError } = await supabase
              .from('bank_cards')
              .update({ balance: newBalance })
              .eq('id', cardToUpdate.id);

            if (updateError) throw updateError;
            fetchCards();
          } catch (e: any) {
            console.error('Error applying spin result:', e);
            setError(`Ошибка при применении результата спина: ${e.message || 'Неизвестная ошибка'}`);
          }
        }
        setDialogTitle(winningSegment.value > 0 ? 'Поздравляем!' : winningSegment.value < 0 ? 'Увы!' : 'Результат спина');
        setDialogContent(finalMessage);
        setResultDialogOpen(true);

    }, animationDurationMs); // Wait for animation to visually complete
    // --- END CRITICAL FIX ---
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Skeleton variant="circular" width={60} height={60} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" sx={{ fontSize: '2rem', mx: 'auto', width: '60%' }} />
        <Skeleton variant="rectangular" height={200} sx={{ my: 4, borderRadius: 2 }} />
      </Container>
    );
  }

  const hasActiveCards = cards.some(card => card.is_active);
  const canAffordSpin = selectedSpinCardId 
    ? (cards.find(c => c.id === selectedSpinCardId)?.balance || 0) >= currentSpinCost
    : false;

  const ResultDialogIcon = resultSegment 
    ? (resultSegment.value > 0 ? WinIcon : resultSegment.value < 0 ? LoseIcon : GameIcon) 
    : GameIcon;
  const ResultDialogIconColor = resultSegment 
    ? (resultSegment.value > 0 ? 'success' : resultSegment.value < 0 ? 'error' : 'info') 
    : 'info';


  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader
        title="Банковское Биржевое Колесо"
        actions={
          <IconButton color="inherit" onClick={() => navigate('/')} sx={{ borderRadius: 2 }} aria-label="Вернуться на панель">
            <ArrowBackIcon />
          </IconButton>
        }
      />

      <Divider sx={{ mb: 4 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card elevation={4} sx={{ mb: 4, borderRadius: 3, textAlign: 'center', py: 4 }}>
        <CardContent>
          <GameIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Крутите колесо удачи!
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Потратьте {formatCurrency(currentSpinCost, 'MR')} и получите случайный приз или штраф.
          </Typography>

          {/* Difficulty Selection */}
          <FormControl variant="outlined" size="small" sx={{ minWidth: 150, mb: 2 }}>
            <InputLabel id="wheel-difficulty-select-label">Сложность</InputLabel>
            <Select
              labelId="wheel-difficulty-select-label"
              value={selectedDifficulty}
              onChange={(e: SelectChangeEvent<keyof typeof DIFFICULTIES>) => setSelectedDifficulty(e.target.value as keyof typeof DIFFICULTIES)}
              label="Сложность"
              sx={{ borderRadius: 1 }}
              disabled={spinning}
            >
              {Object.entries(DIFFICULTIES).map(([key, config]) => (
                <MenuItem key={key} value={key}>{config.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Card Selection for Spin Cost */}
          <FormControl fullWidth size="small" sx={{ mb: 3 }}>
            <InputLabel id="spin-card-select-label">Выберите карту для оплаты спина ({formatCurrency(currentSpinCost, 'MR')})</InputLabel>
            <Select
              labelId="spin-card-select-label"
              value={selectedSpinCardId || ''}
              label={`Выберите карту для оплаты спина (${formatCurrency(currentSpinCost, 'MR')})`}
              onChange={(e: SelectChangeEvent<string>) => setSelectedSpinCardId(e.target.value as string)}
              sx={{ borderRadius: 1 }}
              disabled={spinning || !hasActiveCards}
            >
              {cards.filter(card => card.is_active && card.balance >= currentSpinCost).map((card) => (
                <MenuItem key={card.id} value={card.id}>
                  {card.card_name} (Баланс: {formatCurrency(card.balance, card.currency)})
                </MenuItem>
              ))}
              {cards.filter(card => card.is_active && card.balance < currentSpinCost).map((card) => (
                <MenuItem key={card.id} value={card.id} disabled>
                  {card.card_name} (Недостаточно средств: {formatCurrency(card.balance, 'MR')})
                </MenuItem>
              ))}
              {!hasActiveCards && (
                <MenuItem disabled>Нет активных карт</MenuItem>
              )}
            </Select>
          </FormControl>

          <Box sx={{ position: 'relative', width: 'min(90vw, 300px)', height: 'min(90vw, 300px)', mx: 'auto', mb: 3 }}>
            {/* Wheel Pointer (Fixed at Top) */}
            <Box 
              sx={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '15px solid transparent',
                borderRight: '15px solid transparent',
                borderTop: `30px solid ${theme.palette.text.primary}`,
                zIndex: 10,
              }}
            />
            {/* Wheel Container - This is the rotating element */}
            <motion.div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden', // IMPORTANT: clips content outside the wheel circle
                position: 'relative',
                border: `8px solid ${theme.palette.primary.dark}`,
              }}
              animate={{ rotate: rotation }}
              transition={{ type: 'spring', stiffness: 50, damping: 10, duration: 5 }}
            >
              {currentSegments.map((segment, index) => {
                const degreesPerSegment = 360 / currentSegments.length;
                const rotateSegment = index * degreesPerSegment;
                // const halfSegmentDegrees = degreesPerSegment / 2; // Not used in rendering anymore

                return (
                  <Box
                    key={segment.id}
                    sx={{
                      position: 'absolute',
                      width: '50%',
                      height: '50%',
                      top: '0',
                      left: '0',
                      transformOrigin: '100% 100%', // Pivot from center of the main wheel
                      transform: `rotate(${rotateSegment}deg) skewY(${90 - degreesPerSegment}deg)`, // Form the trapezoidal wedge
                      backgroundColor: segment.color,
                      overflow: 'hidden', // Clip content *within this wedge*
                    }}
                  >
                    {/* --- ALL SEGMENT TEXT/ICON CONTENT REMOVED --- */}
                    {/* Content is completely removed as per "make it mysterious" */}
                    {/* --- END ALL SEGMENT TEXT/ICON CONTENT REMOVED --- */}
                  </Box>
                );
              })}
            </motion.div>
            {/* Center circle */}
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(20%, 60px)',
              height: 'min(20%, 60px)',
              borderRadius: '50%',
              bgcolor: theme.palette.background.paper,
              border: `4px solid ${theme.palette.primary.main}`,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Typography variant="caption" fontWeight={700} color="primary" sx={{ lineHeight: 1 }}>GO</Typography>
            </Box>
          </Box>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<SpinIcon />}
            onClick={handleSpin}
            size="large"
            disabled={spinning || !selectedSpinCardId || !canAffordSpin || !hasActiveCards}
          >
            Крутить!
          </Button>

          {!hasActiveCards && (
            <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
              Для игры необходима хотя бы одна активная карта, с достаточным балансом для оплаты спина.
            </Alert>
          )}

        </CardContent>
      </Card>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onClose={() => setResultDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5, textAlign: 'center' }}>
          <ResultDialogIcon color={ResultDialogIconColor as any} sx={{ fontSize: 40, mb: 1 }} /> 
          <Typography variant="h5" fontWeight={600}>{dialogTitle}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, textAlign: 'center' }}>
          <Typography variant="body1">{dialogContent}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button
            onClick={() => setResultDialogOpen(false)}
            variant="contained"
            color="primary"
            startIcon={<RepeatIcon />}
            sx={{ borderRadius: 2, minWidth: 150 }}
          >
            Крутить ещё раз!
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};