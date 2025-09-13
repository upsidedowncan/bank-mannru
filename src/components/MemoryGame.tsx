// src/components/MemoryGame.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  LinearProgress,
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
  CheckCircleOutline as WinIcon,
  CancelOutlined as LoseIcon,
  PlayArrow as PlayIcon,
  Star as StarIcon,
  Settings as SettingsIcon,
  NavigateNext as NextIcon,
  Redeem as RedeemIcon,
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

const BASE_REWARD = 1000;
const BASE_PENALTY = 1000;

const ALL_KEY_OPTIONS = [
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I',
  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K',
  'Z', 'X', 'C', 'V', 'B', 'N', 'M', ','
];

interface DifficultyConfig {
  label: string;
  sequenceLengthMultiplier: number;
  playbackSpeedMultiplier: number;
  initialLevel: number;
  tileCount: number;
  rewardMultiplier: number;
  penaltyMultiplier: number;
}

const DIFFICULTIES: { [key: string]: DifficultyConfig } = {
  easy: {
    label: 'Легкий',
    sequenceLengthMultiplier: 1.0,
    playbackSpeedMultiplier: 1.0,
    initialLevel: 2,
    tileCount: 8,
    rewardMultiplier: 1.0,
    penaltyMultiplier: 1.0,
  },
  medium: {
    label: 'Средний',
    sequenceLengthMultiplier: 1.2,
    playbackSpeedMultiplier: 0.8,
    initialLevel: 3,
    tileCount: 12,
    rewardMultiplier: 1.2,
    penaltyMultiplier: 1.2,
  },
  hard: {
    label: 'Сложный',
    sequenceLengthMultiplier: 1.5,
    playbackSpeedMultiplier: 0.6,
    initialLevel: 4,
    tileCount: 16,
    rewardMultiplier: 1.5,
    penaltyMultiplier: 1.5,
  },
  extreme: {
    label: 'Экстрим',
    sequenceLengthMultiplier: 1.8,
    playbackSpeedMultiplier: 0.4,
    initialLevel: 5,
    tileCount: 20,
    rewardMultiplier: 1.8,
    penaltyMultiplier: 1.8,
  },
  insane: {
    label: 'Безумный',
    sequenceLengthMultiplier: 2.0,
    playbackSpeedMultiplier: 0.3,
    initialLevel: 6,
    tileCount: 24,
    rewardMultiplier: 2.0,
    penaltyMultiplier: 2.0,
  },
};

// --- NEW CONSTANTS FOR RESPONSIVE GRID ---
const GRID_COLUMNS_XS = 4; // Max columns on extra small screens
const GRID_COLUMNS_SM = 6; // Max columns on small screens
// ---

export const MemoryGame: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const navigate = useNavigate();

  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [sequence, setSequence] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [gameState, setGameState] = useState<'idle' | 'playing-sequence' | 'user-input' | 'won' | 'lost' | 'awaiting-next-round'>(
    'idle'
  );
  const [userAttempt, setUserAttempt] = useState<string[]>([]);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [winCardSelectionOpen, setWinCardSelectionOpen] = useState(false);
  const [selectedWinCardId, setSelectedWinCardId] = useState<string | null>(null);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');

  const [selectedDifficulty, setSelectedDifficulty] = useState<keyof typeof DIFFICULTIES>('easy');

  const difficultyConfig = useMemo(() => DIFFICULTIES[selectedDifficulty], [selectedDifficulty]);

  const currentKeyOptions = useMemo(() => ALL_KEY_OPTIONS.slice(0, difficultyConfig.tileCount), [difficultyConfig.tileCount]);

  const currentReward = useMemo(() => 
    Math.round(BASE_REWARD * difficultyConfig.rewardMultiplier * currentRound),
    [currentRound, difficultyConfig.rewardMultiplier]
  );
  const currentPenalty = useMemo(() => 
    Math.round(BASE_PENALTY * difficultyConfig.penaltyMultiplier * currentRound),
    [currentRound, difficultyConfig.penaltyMultiplier]
  );

  const KEY_HIGHLIGHT_DURATION = 600 * difficultyConfig.playbackSpeedMultiplier;
  const KEY_PAUSE_DURATION = 300 * difficultyConfig.playbackSpeedMultiplier;
  
  // --- DYNAMIC GRID_COLUMNS BASED ON SCREEN SIZE AND TILE COUNT ---
  const dynamicGridColumns = useMemo(() => ({
    xs: Math.min(currentKeyOptions.length, GRID_COLUMNS_XS), // On extra small, max 4 columns
    sm: Math.min(currentKeyOptions.length, GRID_COLUMNS_SM), // On small, max 6 columns
    md: Math.min(currentKeyOptions.length, 8), // On medium and up, max 8 columns (or fewer if tileCount is less)
  }), [currentKeyOptions.length]);
  // ---


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
  }, [fetchCards]);

  const generateSequence = useCallback(() => {
    const newSequence: string[] = [];
    const sequenceLength = Math.max(
      1,
      Math.round(difficultyConfig.initialLevel + (currentRound - 1) * difficultyConfig.sequenceLengthMultiplier)
    );

    for (let i = 0; i < sequenceLength; i++) {
      const randomIndex = Math.floor(Math.random() * currentKeyOptions.length);
      newSequence.push(currentKeyOptions[randomIndex]);
    }
    setSequence(newSequence);
    setUserAttempt([]);
    setFeedbackMessage(null);
  }, [currentRound, difficultyConfig, currentKeyOptions]);

  const playSequence = useCallback(async () => {
    setGameState('playing-sequence');
    setHighlightedKey(null);
    setFeedbackMessage('Смотрите внимательно...');
    setPlaybackProgress(0);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    for (let i = 0; i < sequence.length; i++) {
      setHighlightedKey(sequence[i]);
      setPlaybackProgress(((i + 1) / sequence.length) * 100);
      await new Promise((resolve) => setTimeout(resolve, KEY_HIGHLIGHT_DURATION));
      setHighlightedKey(null);
      await new Promise((resolve) => setTimeout(resolve, KEY_PAUSE_DURATION));
    }

    setGameState('user-input');
    setFeedbackMessage('Теперь ваша очередь!');
  }, [sequence, KEY_HIGHLIGHT_DURATION, KEY_PAUSE_DURATION]);

  useEffect(() => {
    if (gameState === 'playing-sequence' && sequence.length > 0) {
      playSequence();
    }
  }, [gameState, sequence, playSequence]);

  const applyLossPenalty = useCallback(async () => {
    const activeCards = cards.filter(card => card.is_active);
    if (activeCards.length === 0) {
        setError('Невозможно вычесть штраф: нет активных карт.');
        return;
    }

    const cardWithMostMoney = activeCards.reduce((prev, current) => 
      (prev.balance > current.balance ? prev : current)
    );

    let deductedAmount = currentPenalty;
    let newBalance = cardWithMostMoney.balance - currentPenalty;
    let penaltyFeedbackMsg = `-${formatCurrency(currentPenalty, 'MR')} списано с "${cardWithMostMoney.card_name}".`;

    if (newBalance < 0) {
      deductedAmount = cardWithMostMoney.balance;
      newBalance = 0;
      penaltyFeedbackMsg = `С карты "${cardWithMostMoney.card_name}" списано ${formatCurrency(deductedAmount, 'MR')} (остаток 0).`;
    }

    try {
      const { error } = await supabase
        .from('bank_cards')
        .update({ balance: newBalance })
        .eq('id', cardWithMostMoney.id);

      if (error) throw error;
      
      setFeedbackMessage(penaltyFeedbackMsg);
      setDialogContent(`Неверная последовательность. ${penaltyFeedbackMsg}`);
      fetchCards();
    } catch (e: any) {
      console.error('Error deducting penalty:', e);
      setError(`Ошибка при списании штрафа: ${e.message || 'Неизвестная ошибка'}`);
    }
  }, [cards, currentPenalty, fetchCards]);


  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameState === 'user-input') {
        const newAttempt = [...userAttempt, key];
        setUserAttempt(newAttempt);
        setHighlightedKey(key);
        setTimeout(() => setHighlightedKey(null), 150);

        if (newAttempt.length <= sequence.length) {
            if (newAttempt[newAttempt.length - 1] !== sequence[newAttempt.length - 1]) {
                setGameState('lost');
                setDialogTitle('Проигрыш!');
                applyLossPenalty();
                setResultDialogOpen(true);
                return;
            }
        }
        
        if (newAttempt.length === sequence.length) {
            setGameState('won');
            setDialogTitle('Победа!');
            setDialogContent(`Поздравляем! Вы заработали ${formatCurrency(currentReward, 'MR')}. Выберите карту, на которую хотите зачислить средства.`);
            setResultDialogOpen(true);
            setWinCardSelectionOpen(true);
        }
      }
    },
    [gameState, userAttempt, sequence, currentReward, applyLossPenalty]
  );

  useEffect(() => {
    if (gameState === 'user-input') {
      const handleKeyDown = (event: KeyboardEvent) => {
        const pressedKey = event.key.toUpperCase();
        if (currentKeyOptions.includes(pressedKey)) {
          handleKeyPress(pressedKey);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [gameState, handleKeyPress, currentKeyOptions]);

  const startGame = () => {
    if (cards.filter(card => card.is_active).length === 0) {
      setError('У вас нет активных карт для игры. Создайте карту, чтобы начать!');
      return;
    }
    setCurrentRound(1);
    generateSequence();
    setGameState('playing-sequence');
  };

  const resetGame = () => {
    setCurrentRound(1);
    setSequence([]);
    setUserAttempt([]);
    setGameState('idle');
    setFeedbackMessage(null);
    setResultDialogOpen(false);
    setWinCardSelectionOpen(false);
    setSelectedWinCardId(null);
    setError(null);
    setPlaybackProgress(0);
  };

  const handleWinConfirm = async () => {
    if (!selectedWinCardId || !user) {
      setError('Пожалуйста, выберите карту.');
      return;
    }

    try {
      const cardToUpdate = cards.find(card => card.id === selectedWinCardId);
      if (!cardToUpdate) {
        setError('Выбранная карта не найдена.');
        return;
      }

      const { error } = await supabase
        .from('bank_cards')
        .update({ balance: cardToUpdate.balance + currentReward })
        .eq('id', selectedWinCardId);

      if (error) throw error;

      setFeedbackMessage(`+${currentReward} MR зачислено на "${cardToUpdate.card_name}"!`);
      fetchCards();
      setWinCardSelectionOpen(false);
      setResultDialogOpen(false);
      
      setGameState('awaiting-next-round');
      setDialogTitle('Что дальше?');
      setDialogContent(`Отлично! Средства зачислены. Вы можете забрать награду и закончить или продолжить игру за большую сумму.`);
      setResultDialogOpen(true);

    } catch (e: any) {
      console.error('Error crediting prize:', e);
      setError(`Ошибка при зачислении выигрыша: ${e.message || 'Неизвестная ошибка'}`);
    }
  };

  const startNextRound = () => {
    setCurrentRound(prev => prev + 1);
    generateSequence();
    setResultDialogOpen(false);
    setGameState('playing-sequence');
  };

  const collectRewardAndEndGame = () => {
    setResultDialogOpen(false);
    resetGame();
  };

  const handleLoseConfirm = () => {
    setResultDialogOpen(false);
    resetGame();
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

  // Determine grid columns for rendering based on dynamicGridColumns
  const renderGridColumnsXs = dynamicGridColumns.xs;
  const renderGridColumnsSm = dynamicGridColumns.sm;
  const renderGridColumnsMd = dynamicGridColumns.md;

  // Split currentKeyOptions into rows for rendering
  const keysPerRow = renderGridColumnsMd; // Assuming desktop default is what defines a "row"
  const renderedRows = [];
  for (let i = 0; i < currentKeyOptions.length; i += keysPerRow) {
    renderedRows.push(currentKeyOptions.slice(i, i + keysPerRow));
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader
        title="Запомни и кликни"
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
            Раунд: {currentRound} (Сложность: {difficultyConfig.label})
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Запомни последовательность клавиш и повтори ее.
            <br />
            Верно: +{formatCurrency(currentReward, 'MR')}. Неверно: -{formatCurrency(currentPenalty, 'MR')} (с самой богатой карты).
          </Typography>

          {gameState === 'idle' && (
            <Stack spacing={2} alignItems="center">
                <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                    <InputLabel id="difficulty-select-label">Сложность</InputLabel>
                    <Select
                        labelId="difficulty-select-label"
                        value={selectedDifficulty}
                        onChange={(e: SelectChangeEvent<keyof typeof DIFFICULTIES>) => setSelectedDifficulty(e.target.value as keyof typeof DIFFICULTIES)}
                        label="Сложность"
                        sx={{ borderRadius: 1 }}
                    >
                        {Object.entries(DIFFICULTIES).map(([key, config]) => (
                            <MenuItem key={key} value={key}>{config.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    startIcon={<PlayIcon />}
                    onClick={startGame}
                    size="large"
                    sx={{ borderRadius: 2, py: 1.5, px: 4 }}
                    disabled={cards.filter(card => card.is_active).length === 0}
                >
                    Начать игру
                </Button>
            </Stack>
          )}

          {gameState === 'playing-sequence' && (
            <Box>
              <Typography variant="h6" color="primary" sx={{ mb: 2 }}>{feedbackMessage}</Typography>
              <LinearProgress variant="determinate" value={playbackProgress} color="primary" sx={{ height: 10, borderRadius: 5 }} />
            </Box>
          )}

          {gameState === 'user-input' && (
            <Typography variant="h6" color="primary" sx={{ mb: 2 }}>{feedbackMessage}</Typography>
          )}

          {gameState === 'awaiting-next-round' && (
             <Typography variant="h6" color="success" sx={{ mb: 2 }}>
                Что дальше? Раунд {currentRound + 1} ждет!
            </Typography>
          )}
          
          {(gameState === 'idle' || gameState === 'playing-sequence' || gameState === 'user-input' || gameState === 'awaiting-next-round') && cards.filter(card => card.is_active).length === 0 && (
            <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
              Для игры необходима хотя бы одна активная карта, чтобы зачислять или списывать средства.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Game Keys Grid */}
      {renderedRows.map((row, rowIndex) => (
        <Box 
          key={rowIndex}
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: `repeat(${renderGridColumnsXs}, 1fr)`,
              sm: `repeat(${renderGridColumnsSm}, 1fr)`,
              md: `repeat(${renderGridColumnsMd}, 1fr)`,
            },
            gap: 2, 
            mb: rowIndex < renderedRows.length - 1 ? 2 : 0 // Add bottom margin only between rows
          }}
        >
          {row.map((key) => (
            <motion.div
              key={key}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.05 }}
              animate={highlightedKey === key ? { scale: [1, 1.05, 1], boxShadow: `0 0 15px ${theme.palette.primary.main}` } : { scale: 1, boxShadow: 'none' }}
            >
              <Button
                variant="contained"
                size="large"
                sx={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 2,
                  fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' }, // Responsive font size
                  fontWeight: 700,
                  backgroundColor: 
                    highlightedKey === key 
                      ? theme.palette.primary.main
                      : theme.palette.action.disabledBackground,
                  color: 
                    highlightedKey === key 
                      ? theme.palette.primary.contrastText 
                      : theme.palette.text.disabled,
                  '&:hover': {
                    backgroundColor: 
                      highlightedKey === key 
                        ? theme.palette.primary.dark 
                        : theme.palette.action.hover,
                  },
                  pointerEvents: gameState !== 'user-input' ? 'none' : 'auto', 
                  opacity: gameState !== 'user-input' ? 0.7 : 1,
                }}
                onClick={() => handleKeyPress(key)}
                disabled={gameState !== 'user-input'}
              >
                {key}
              </Button>
            </motion.div>
          ))}
        </Box>
      ))}


      {/* Win/Lose/Next Round Dialog */}
      <Dialog open={resultDialogOpen} onClose={() => { /* prevent closing manually */ }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5, textAlign: 'center' }}>
          {
            gameState === 'won' || gameState === 'awaiting-next-round' ? 
            <WinIcon color="success" sx={{ fontSize: 40, mb: 1 }} /> : 
            <LoseIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
          }
          <Typography variant="h5" fontWeight={600}>{dialogTitle}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: winCardSelectionOpen ? 3 : 0 }}>{dialogContent}</Typography>
          {winCardSelectionOpen && (
            <FormControl fullWidth size="small" sx={{ mt: 2 }}>
              <InputLabel id="win-card-select-label">Выберите карту</InputLabel>
              <Select
                labelId="win-card-select-label"
                value={selectedWinCardId || ''}
                label="Выберите карту"
                onChange={(e: SelectChangeEvent<string>) => setSelectedWinCardId(e.target.value as string)}
                sx={{ borderRadius: 1 }}
              >
                {cards.filter(card => card.is_active).map((card) => (
                  <MenuItem key={card.id} value={card.id}>
                    {card.card_name} ({formatCurrency(card.balance, card.currency)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          {gameState === 'won' && winCardSelectionOpen ? (
            <Button
              onClick={handleWinConfirm}
              variant="contained"
              color="success"
              startIcon={<StarIcon />}
              disabled={!selectedWinCardId || cards.filter(card => card.is_active).length === 0}
              sx={{ borderRadius: 2, minWidth: 150 }}
            >
              Зачислить
            </Button>
          ) : gameState === 'lost' ? (
            <Button
              onClick={handleLoseConfirm}
              variant="contained"
              color="error"
              sx={{ borderRadius: 2, minWidth: 150 }}
            >
              Понятно
            </Button>
          ) : gameState === 'awaiting-next-round' ? (
             <Stack direction="row" spacing={2}>
                <Button
                    onClick={collectRewardAndEndGame}
                    variant="outlined"
                    color="secondary"
                    startIcon={<RedeemIcon />}
                    sx={{ borderRadius: 2, minWidth: 150 }}
                >
                    Получить награду
                </Button>
                <Button
                    onClick={startNextRound}
                    variant="contained"
                    color="primary"
                    startIcon={<NextIcon />}
                    sx={{ borderRadius: 2, minWidth: 150 }}
                >
                    Следующий раунд
                </Button>
             </Stack>
          ) : null }
        </DialogActions>
      </Dialog>
    </Container>
  );
};