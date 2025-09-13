// src/components/ChartRunnerGame.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Fab,
} from '@mui/material';

import {
  ArrowBack as ArrowBackIcon,
  ShowChart as ChartIcon,
  PlayArrow as PlayIcon,
  Star as StarIcon,
  CancelOutlined as LoseIcon,
  Refresh as ResetIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Close as CloseIcon,
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

interface Obstacle {
  id: string; // Unique ID for keying in React
  x: number;
  y: number;
  width: number;
  height: number;
  isBoundary?: boolean; // For fixed floor/ceiling
  isGracePeriodObstacle?: boolean; // Flag for grace period only obstacles
}

// Game Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PLAYER_SIZE = 15;
const PLAYER_X_POS = GAME_WIDTH / 4;
const PLAYER_SPEED_X_BASE = 180; // Pixels per second
const UPWARD_ACCELERATION_BASE = -800; // Pixels per second^2 (force when holding up)
const DOWNWARD_ACCELERATION_BASE = 800; // Pixels per second^2 (force when not holding up, effectively gravity/downward push)
const MAX_VERTICAL_VELOCITY = 400; // Cap vertical speed
const BASE_REWARD = 5000;
const BASE_PENALTY = 1000;
const DISTANCE_TO_WIN = 10000;
const GRACE_PERIOD_DURATION_MS = 3000; // 3 seconds for 3, 2, 1 countdown


interface DifficultyConfig {
  label: string;
  playerSpeedMultiplier: number;
  obstacleGenerationGap: number; // Horizontal distance between new obstacle segments
  pathWidthMin: number; // Minimum vertical space for player to navigate
  pathWidthMax: number; // Maximum vertical space
  pathChangeIntensity: number; // How much the path can change height rapidly (higher = sharper turns)
  rewardMultiplier: number;
  penaltyMultiplier: number;
  verticalForceMultiplier: number;

  obstacleDensity?: number;
  minGap?: number;
  maxGap?: number;
  minObstacleHeight?: number;
  maxObstacleHeight?: number;
}

const DIFFICULTIES: { [key: string]: DifficultyConfig } = {
  easy: {
    label: 'Легкий',
    playerSpeedMultiplier: 0.8,
    obstacleGenerationGap: 200, // Increased for easier play
    pathWidthMin: 150, // Wider path
    pathWidthMax: 180, // Wider path
    pathChangeIntensity: 0.6, // Smoother changes for easy
    rewardMultiplier: 1.0,
    penaltyMultiplier: 1.0,
    verticalForceMultiplier: 0.8, // Slightly less aggressive forces for easy
  },
  medium: {
    label: 'Средний',
    playerSpeedMultiplier: 1.0,
    obstacleGenerationGap: 150, // Medium gap
    pathWidthMin: 120,
    pathWidthMax: 150,
    pathChangeIntensity: 1.0, // Medium changes
    rewardMultiplier: 1.2,
    penaltyMultiplier: 1.2,
    verticalForceMultiplier: 1.0, // Normal forces
  },
  hard: {
    label: 'Сложный',
    playerSpeedMultiplier: 1.2,
    obstacleGenerationGap: 120, // Smaller gap for hard
    pathWidthMin: 90,
    pathWidthMax: 120,
    pathChangeIntensity: 1.4, // Sharper changes for hard
    rewardMultiplier: 1.5,
    penaltyMultiplier: 1.5,
    verticalForceMultiplier: 1.2, // More aggressive forces for hard
  },
};

export const ChartRunnerGame: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined); 
  const lastTimeRef = useRef<DOMHighResTimeStamp>(0); // Store previous timestamp for delta time
  const playerYRef = useRef(GAME_HEIGHT / 2);
  const playerVelocityYRef = useRef(0);
  const isInputPressedRef = useRef(false); // NEW: Track if input (hold up) is active
  const gameDistanceRef = useRef(0);
  const trailPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);

  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost' | 'grace-period'>('idle');
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');
  const [selectedWinCardId, setSelectedWinCardId] = useState<string | null>(null);

  const [selectedDifficulty, setSelectedDifficulty] = useState<keyof typeof DIFFICULTIES>('easy');
  const difficultyConfig = useMemo(() => DIFFICULTIES[selectedDifficulty], [selectedDifficulty]);

  const currentReward = useMemo(() => Math.round(BASE_REWARD * difficultyConfig.rewardMultiplier), [difficultyConfig.rewardMultiplier]);
  const currentPenalty = useMemo(() => Math.round(BASE_PENALTY * difficultyConfig.penaltyMultiplier), [difficultyConfig.penaltyMultiplier]);
  const currentSpeedX = PLAYER_SPEED_X_BASE * difficultyConfig.playerSpeedMultiplier;
  const currentUpwardAcceleration = UPWARD_ACCELERATION_BASE * difficultyConfig.verticalForceMultiplier;
  const currentDownwardAcceleration = DOWNWARD_ACCELERATION_BASE * difficultyConfig.verticalForceMultiplier;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const [showPenaltyOverlay, setShowPenaltyOverlay] = useState(false);
  const gracePeriodCounterRef = useRef(0);


  const fetchCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user?.id) // Correct column name
        .order('balance', { ascending: false });

      if (error) throw error;
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

  const initGame = useCallback(() => {
    playerYRef.current = GAME_HEIGHT / 2;
    playerVelocityYRef.current = 0;
    isInputPressedRef.current = false;
    gameDistanceRef.current = 0;
    trailPointsRef.current = [{ x: PLAYER_X_POS, y: playerYRef.current }];
    obstaclesRef.current = [];

    // --- FIX: Longer initial "flat" boundaries and a clear path ---
    const initialGraceObstacleLength = GAME_WIDTH * 2; // Covers at least 2 screen widths for clear start
    const initialPathWidth = difficultyConfig.pathWidthMin + (difficultyConfig.pathWidthMax - difficultyConfig.pathWidthMin) / 2;
    const initialPathCenterY = GAME_HEIGHT / 2; // Always start player in the middle

    const initialTopObstacleHeight = initialPathCenterY - initialPathWidth / 2;
    const initialBottomObstacleY = initialPathCenterY + initialPathWidth / 2;
    const initialBottomObstacleHeight = GAME_HEIGHT - initialBottomObstacleY;

    // Fixed Floor and Ceiling (always present)
    obstaclesRef.current.push(
        { id: 'floor-boundary', x: 0, y: GAME_HEIGHT - 20, width: initialGraceObstacleLength * 2, height: 20, isBoundary: true },
        { id: 'ceiling-boundary', x: 0, y: 0, width: initialGraceObstacleLength * 2, height: 20, isBoundary: true }
    );

    // Grace Period "Walls" (these define the safe path at the start)
    obstaclesRef.current.push(
      { id: 'grace-top-wall', x: 0, y: 0, width: initialGraceObstacleLength, height: initialTopObstacleHeight, isBoundary: false, isGracePeriodObstacle: true },
      { id: 'grace-bottom-wall', x: 0, y: initialBottomObstacleY, width: initialGraceObstacleLength, height: initialBottomObstacleHeight, isBoundary: false, isGracePeriodObstacle: true }
    );
    // --- END FIX ---
    
    gracePeriodCounterRef.current = GRACE_PERIOD_DURATION_MS;


    setResultDialogOpen(false);
    setSelectedWinCardId(null);
    setError(null);
    setShowPenaltyOverlay(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
    }
  }, [difficultyConfig]);

  const generateObstacleSegment = useCallback(() => {
    // --- FIX: Robustly find the last *dynamic* obstacle ---
    let lastDynamicObstacle: Obstacle | undefined;
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        if (!obstaclesRef.current[i].isBoundary && !obstaclesRef.current[i].isGracePeriodObstacle) { // Find the last dynamically generated one
            lastDynamicObstacle = obstaclesRef.current[i];
            break;
        }
    }
    // Starting X for the new segment, after the last dynamic obstacle or at screen edge
    const segmentStartX = lastDynamicObstacle ? lastDynamicObstacle.x + lastDynamicObstacle.width : GAME_WIDTH;
    // --- END FIX ---

    const obstacleSegmentWidth = difficultyConfig.obstacleGenerationGap;

    const pathWidth = difficultyConfig.pathWidthMin + Math.random() * (difficultyConfig.pathWidthMax - difficultyConfig.pathWidthMin);
    
    const lastPathCenter = lastDynamicObstacle ? (lastDynamicObstacle.y + lastDynamicObstacle.height / 2) : GAME_HEIGHT / 2;
    // --- FIX: Ensure targetPathCenter has enough range to create waves ---
    // Make path changes more pronounced by multiplying pathChangeIntensity
    let targetPathCenter = lastPathCenter + (Math.random() * 2 - 1) * (difficultyConfig.pathChangeIntensity * 40); // Multiplied by 40 for more aggressive changes
    
    // Clamp targetPathCenter to ensure path stays within reasonable vertical bounds
    const minPathCenter = GAME_HEIGHT * 0.25 + pathWidth / 2; // e.g., 25% from top + half path width
    const maxPathCenter = GAME_HEIGHT * 0.75 - pathWidth / 2; // e.g., 75% from top - half path width
    
    targetPathCenter = Math.max(minPathCenter, Math.min(maxPathCenter, targetPathCenter));
    // --- END FIX ---

    const topObstacleHeight = targetPathCenter - pathWidth / 2;
    const bottomObstacleHeight = GAME_HEIGHT - (targetPathCenter + pathWidth / 2);

    const effectiveTopObstacleHeight = Math.max(0, topObstacleHeight);
    const effectiveBottomObstacleHeight = Math.max(0, bottomObstacleHeight);


    obstaclesRef.current.push(
      { id: `top-${segmentStartX}-${Math.random()}`, x: segmentStartX, y: 0, width: obstacleSegmentWidth, height: effectiveTopObstacleHeight, isBoundary: false },
      { id: `bottom-${segmentStartX}-${Math.random()}`, x: segmentStartX, y: GAME_HEIGHT - effectiveBottomObstacleHeight, width: obstacleSegmentWidth, height: effectiveBottomObstacleHeight, isBoundary: false }
    );
  }, [difficultyConfig]);

  const updateGame = useCallback(() => {
    const currentTime = performance.now();
    let deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    if (deltaTime > 0.1) {
        deltaTime = 0.1;
    }

    // Apply force (acceleration) based on input
    if (isInputPressedRef.current) {
        playerVelocityYRef.current += currentUpwardAcceleration * deltaTime;
    } else {
        playerVelocityYRef.current += currentDownwardAcceleration * deltaTime;
    }
    
    // Clamp vertical velocity
    playerVelocityYRef.current = Math.max(-MAX_VERTICAL_VELOCITY, Math.min(MAX_VERTICAL_VELOCITY, playerVelocityYRef.current));

    playerYRef.current += playerVelocityYRef.current * deltaTime;

    // Clamp player position to canvas edges (boundaries are now obstacles)
    if (playerYRef.current < 0) {
      playerYRef.current = 0;
    } else if (playerYRef.current > GAME_HEIGHT - PLAYER_SIZE) {
      playerYRef.current = GAME_HEIGHT - PLAYER_SIZE;
    }

    let currentScrollSpeedX = currentSpeedX;
    if (gameState === 'grace-period') {
        gracePeriodCounterRef.current -= deltaTime * 1000;
        currentScrollSpeedX = currentSpeedX * (1 - (gracePeriodCounterRef.current / GRACE_PERIOD_DURATION_MS));
        currentScrollSpeedX = Math.max(0, currentScrollSpeedX);
        if (gracePeriodCounterRef.current <= 0) {
            setGameState('playing');
            // When grace period ends, immediately clean up grace obstacles and start dynamic generation
            obstaclesRef.current = obstaclesRef.current.filter(o => !o.isGracePeriodObstacle);
            generateObstacleSegment(); // Start generating the wave path
        }
    }


    if (gameState === 'playing' || gameState === 'grace-period') {
        obstaclesRef.current = obstaclesRef.current.map((o) => ({ ...o, x: o.x - currentScrollSpeedX * deltaTime }));

        obstaclesRef.current = obstaclesRef.current.filter((o) => o.x + o.width > 0);

        // --- FIX: Ensure dynamic obstacles are only generated after grace period ends ---
        let lastDynamicObstacle: Obstacle | undefined;
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
            if (!obstaclesRef.current[i].isBoundary && !obstaclesRef.current[i].isGracePeriodObstacle) {
                lastDynamicObstacle = obstaclesRef.current[i];
                break;
            }
        }
        
        if (gameState === 'playing' && (!lastDynamicObstacle || lastDynamicObstacle.x < GAME_WIDTH - difficultyConfig.obstacleGenerationGap)) {
            generateObstacleSegment();
        }
        // --- END FIX ---

        const playerLeft = PLAYER_X_POS;
        const playerRight = playerLeft + PLAYER_SIZE;
        const playerTop = playerYRef.current;
        const playerBottom = playerTop + PLAYER_SIZE;

        for (const o of obstaclesRef.current) {
          if (
            playerRight > o.x &&
            playerLeft < o.x + o.width &&
            playerBottom > o.y &&
            playerTop < o.y + o.height
          ) {
            setGameState('lost'); // Hit an obstacle/boundary
            return;
          }
        }

        gameDistanceRef.current += currentScrollSpeedX * deltaTime;
        const newTrailPoint = { x: PLAYER_X_POS, y: playerYRef.current + PLAYER_SIZE / 2 };
        trailPointsRef.current.push(newTrailPoint);
        
        trailPointsRef.current = trailPointsRef.current.map(p => ({ x: p.x - currentScrollSpeedX * deltaTime, y: p.y }));

        trailPointsRef.current = trailPointsRef.current.filter(p => p.x > 0);
        if (trailPointsRef.current.length > 200) {
            trailPointsRef.current = trailPointsRef.current.slice(trailPointsRef.current.length - 200);
        }
    }


    if (gameDistanceRef.current >= DISTANCE_TO_WIN) {
      setGameState('won');
    }

  }, [currentSpeedX, currentUpwardAcceleration, currentDownwardAcceleration, difficultyConfig, generateObstacleSegment, gameState]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = theme.palette.background.default;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    obstaclesRef.current.forEach((o) => {
        if (o.isBoundary) {
            ctx.fillStyle = theme.palette.grey[700];
        } else if (o.isGracePeriodObstacle) {
            ctx.fillStyle = theme.palette.grey[500]; // Lighter grey for temporary grace period walls
        }
        else {
            ctx.fillStyle = theme.palette.error.main;
        }
        ctx.fillRect(o.x, o.y, o.width, o.height);
    });

    ctx.fillStyle = theme.palette.primary.main;
    ctx.beginPath();
    ctx.arc(PLAYER_X_POS, playerYRef.current + PLAYER_SIZE / 2, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    if (trailPointsRef.current.length > 1) {
      ctx.strokeStyle = theme.palette.primary.light;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(trailPointsRef.current[0].x, trailPointsRef.current[0].y);
      for (let i = 1; i < trailPointsRef.current.length; i++) {
        ctx.lineTo(trailPointsRef.current[i].x, trailPointsRef.current[i].y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = theme.palette.text.primary;
    ctx.font = '16px Arial';
    ctx.fillText(`Расстояние: ${Math.round(gameDistanceRef.current)} / ${DISTANCE_TO_WIN}`, 10, 20);
    
    // --- FIX: Removed Grace Period Countdown drawing ---
    // if (gameState === 'grace-period') {
    //     ctx.fillStyle = theme.palette.primary.contrastText;
    //     ctx.font = 'bold 48px Arial';
    //     ctx.textAlign = 'center';
    //     ctx.textBaseline = 'middle';
    //     const countdownValue = Math.max(1, Math.ceil(gracePeriodCounterRef.current / 1000));
    //     ctx.fillText(countdownValue.toString(), GAME_WIDTH / 2, GAME_HEIGHT / 2);
    //     ctx.textAlign = 'left';
    //     ctx.textBaseline = 'alphabetic';
    // }
    // --- END FIX ---


  }, [theme, gameState]);

  const gameLoop = useCallback((time: DOMHighResTimeStamp) => {
    if (gameState === 'playing' || gameState === 'grace-period') {
      updateGame();
      drawGame();
      lastTimeRef.current = time;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, updateGame, drawGame]);

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
      
      fetchCards();
      setDialogContent(`Вы не справились. ${penaltyFeedbackMsg}`);
      setShowPenaltyOverlay(true);
      setTimeout(() => setShowPenaltyOverlay(false), 2000);
    } catch (e: any) {
      console.error('Error deducting penalty:', e);
      setError(`Ошибка при списании штрафа: ${e.message || 'Неизвестная ошибка'}`);
    }
  }, [cards, currentPenalty, fetchCards]);

  useEffect(() => {
    if (gameState === 'playing' || gameState === 'grace-period') {
      lastTimeRef.current = performance.now();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (gameState === 'won') {
        setDialogTitle('Победа!');
        setDialogContent(`Вы успешно прошли дистанцию! Вы заработали ${formatCurrency(currentReward, 'MR')}. Выберите карту, на которую хотите зачислить средства.`);
        setResultDialogOpen(true);
      } else if (gameState === 'lost') {
        setDialogTitle('Проигрыш!');
        applyLossPenalty();
        setResultDialogOpen(true);
      }
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop, currentReward, applyLossPenalty]);

  const handleStartGame = () => {
    if (cards.length === 0) {
      setError('У вас нет активных карт для игры. Создайте карту, чтобы начать!');
      return;
    }
    initGame();
    setGameState('grace-period'); // Start in grace period
  };

  const handleInputDown = useCallback(() => {
    if (gameState === 'playing' || gameState === 'grace-period') {
      isInputPressedRef.current = true;
    } else if (gameState === 'idle') {
        handleStartGame();
    }
  }, [gameState, handleStartGame]);

  const handleInputUp = useCallback(() => {
    if (gameState === 'playing' || gameState === 'grace-period') {
      isInputPressedRef.current = false;
    }
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        if (!isInputPressedRef.current) {
            handleInputDown();
        }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        handleInputUp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleInputDown, handleInputUp]);

  // Mobile touch controls (on canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      if (!isInputPressedRef.current) {
        handleInputDown();
      }
    };
    const handleCanvasTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      handleInputUp();
    };

    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleCanvasTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleCanvasTouchStart);
      canvas.removeEventListener('touchend', handleCanvasTouchEnd);
      canvas.removeEventListener('touchcancel', handleCanvasTouchEnd);
    };
  }, [handleInputDown, handleInputUp]);

  const toggleFullscreen = useCallback(() => {
    const element = gameContainerRef.current;

    if (!element) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      element.requestFullscreen().catch((err) => {
        setError(`Ошибка при переключении в полноэкранный режим: ${err.message || err}`);
      });
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

      fetchCards();
      setResultDialogOpen(false);
      setGameState('idle');
    } catch (e: any) {
      console.error('Error crediting prize:', e);
      setError(`Ошибка при зачислении выигрыша: ${e.message || 'Неизвестная ошибка'}`);
    }
  };

  const handleLoseConfirm = () => {
    setResultDialogOpen(false);
    setGameState('idle');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Skeleton variant="circular" width={60} height={60} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" sx={{ fontSize: '2rem', mx: 'auto', width: '60%' }} />
        <Skeleton variant="rectangular" height={200} sx={{ my: 4, borderRadius: theme.shape.borderRadius }} />
      </Container>
    );
  }

  const hasActiveCards = cards.some(card => card.is_active);
  const canPlayGame = hasActiveCards;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader
        title="Фондовый Бегун"
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton color="inherit" onClick={() => navigate('/')} sx={{ borderRadius: theme.shape.borderRadius }} aria-label="Вернуться на панель">
              <ArrowBackIcon />
            </IconButton>
            <IconButton color="inherit" onClick={toggleFullscreen} sx={{ borderRadius: theme.shape.borderRadius }} aria-label="Полноэкранный режим">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Stack>
        }
      />

      <Divider sx={{ mb: 4 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: theme.shape.borderRadius }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card elevation={4} sx={{ mb: 4, borderRadius: theme.shape.borderRadius, textAlign: 'center', py: 4 }}>
        <CardContent>
          <ChartIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Фондовый Бегун
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Управляйте "курсом акций", удерживая или отпуская, чтобы маневрировать по воздушному пути.
            <br />
            Пройдите {DISTANCE_TO_WIN} пунктов дистанции, чтобы выиграть.
            <br />
            Верно: +{currentReward} MR. Неверно: -{currentPenalty} MR.
          </Typography>

          {gameState === 'idle' && (
            <Stack spacing={2} alignItems="center">
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="chart-runner-difficulty-select-label">Сложность</InputLabel>
                <Select
                  labelId="chart-runner-difficulty-select-label"
                  value={selectedDifficulty}
                  onChange={(e: SelectChangeEvent<keyof typeof DIFFICULTIES>) => setSelectedDifficulty(e.target.value as keyof typeof DIFFICULTIES)}
                  label="Сложность"
                  sx={{ borderRadius: theme.shape.borderRadius }}
                >
                  {Object.entries(DIFFICULTIES).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={handleStartGame}
                size="large"
                sx={{ borderRadius: theme.shape.borderRadius, py: 1.5, px: 4 }}
                disabled={!canPlayGame}
              >
                Начать игру
              </Button>
            </Stack>
          )}

          {(gameState === 'playing' || gameState === 'grace-period') && (
            <Box>
              <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                {gameState === 'grace-period' ? 'Приготовьтесь!' : 'Удерживайте для подъема, отпустите для спуска!'}
              </Typography>
            </Box>
          )}
          
          <Box 
            ref={gameContainerRef}
            sx={{ 
              mt: 3, 
              display: 'flex', 
              justifyContent: 'center',
              backgroundColor: theme.palette.background.paper,
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 0, // ONLY CANVAS AREA IS SHARP
              overflow: 'hidden',
              position: 'relative',
              width: '100%',
              height: 'auto',
              maxWidth: GAME_WIDTH,
              maxHeight: GAME_HEIGHT,
              '&:fullscreen': {
                width: '100vw',
                height: '100vh',
                maxWidth: '100vw',
                maxHeight: '100vh',
                backgroundColor: theme.palette.background.default,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                border: 'none',
                '& > canvas': {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                },
              },
            }}
          >
            <canvas
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              style={{ 
                width: '100%', 
                height: '100%',
                display: 'block',
              }}
            />
            {isFullscreen && (
              <Fab
                color="secondary"
                aria-label="Начать заново"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setGameState('idle');
                  initGame();
                  setResultDialogOpen(false);
                  setError(null);
                }}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 20,
                  backgroundColor: theme.palette.info.main,
                  '&:hover': {
                    backgroundColor: theme.palette.info.dark,
                  },
                  borderRadius: theme.shape.borderRadius,
                }}
              >
                <ResetIcon />
              </Fab>
            )}

            <AnimatePresence>
              {showPenaltyOverlay && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                    backgroundColor: 'rgba(244, 67, 54, 0.9)',
                    color: 'white',
                    padding: theme.spacing(2, 4),
                    borderRadius: theme.shape.borderRadius,
                    pointerEvents: 'none',
                    boxShadow: theme.shadows[5],
                  }}
                >
                  <Typography variant="h5" fontWeight={700}>
                    -{formatCurrency(currentPenalty, 'MR')}
                  </Typography>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {!canPlayGame && (
            <Alert severity="warning" sx={{ mt: 3, borderRadius: theme.shape.borderRadius }}>
              Для игры необходима хотя бы одна активная карта.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Result Dialog */}
      <Dialog open={resultDialogOpen} onClose={() => setResultDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: theme.shape.borderRadius } }}>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5, textAlign: 'center' }}>
          {gameState === 'won' ? <StarIcon color="success" sx={{ fontSize: 40, mb: 1 }} /> : <LoseIcon color="error" sx={{ fontSize: 40, mb: 1 }} />}
          <Typography variant="h5" fontWeight={600}>{dialogTitle}</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, textAlign: 'center' }}>
          <Typography variant="body1">{dialogContent}</Typography>
          {gameState === 'won' && (
            <FormControl fullWidth size="small" sx={{ mt: 2 }}>
              <InputLabel id="win-card-select-label">Выберите карту</InputLabel>
              <Select
                labelId="win-card-select-label"
                value={selectedWinCardId || ''}
                label="Выберите карту"
                onChange={(e: SelectChangeEvent<string>) => setSelectedWinCardId(e.target.value as string)}
                sx={{ borderRadius: theme.shape.borderRadius }}
              >
                {cards.filter(card => card.is_active).map((card) => (
                  <MenuItem key={card.id} value={card.id}>
                    {card.card_name} (Баланс: {formatCurrency(card.balance, card.currency)})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          {gameState === 'won' ? (
            <Button
              onClick={handleWinConfirm}
              variant="contained"
              color="success"
              startIcon={<StarIcon />}
              disabled={!selectedWinCardId || !canPlayGame}
              sx={{ borderRadius: theme.shape.borderRadius, minWidth: 150 }}
            >
              Зачислить
            </Button>
          ) : ( // gameState === 'lost'
            <Button
              onClick={handleLoseConfirm}
              variant="contained"
              color="error"
              startIcon={<ResetIcon />}
              disabled={!canPlayGame}
              sx={{ borderRadius: theme.shape.borderRadius, minWidth: 150 }}
            >
              Понятно
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};