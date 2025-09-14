import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Memory as ChipIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { AppLayout } from '../Layout/AppLayout';
import PageHeader from '../Layout/PageHeader';

interface MotherboardComponent {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cpu' | 'gpu' | 'ram' | 'capacitor' | 'resistor' | 'transistor';
  isFried: boolean;
  friedAt?: number;
  reactionTime?: number;
  timeoutId?: NodeJS.Timeout;
}

interface GameStats {
  totalClicks: number;
  successfulFixes: number;
  averageReactionTime: number;
  bestReactionTime: number;
  score: number;
}

const DIFFICULTY_LEVELS = {
  easy: {
    name: 'Легкий',
    spawnRate: 2000, // milliseconds between spawns
    maxComponents: 3,
    reactionWindow: 3000, // milliseconds to react
    rewardMultiplier: 1,
    penaltyMultiplier: 0.5,
  },
  medium: {
    name: 'Средний',
    spawnRate: 1500,
    maxComponents: 5,
    reactionWindow: 2000,
    rewardMultiplier: 1.5,
    penaltyMultiplier: 0.75,
  },
  hard: {
    name: 'Сложный',
    spawnRate: 1000,
    maxComponents: 7,
    reactionWindow: 1500,
    rewardMultiplier: 2,
    penaltyMultiplier: 1,
  },
  expert: {
    name: 'Эксперт',
    spawnRate: 800,
    maxComponents: 10,
    reactionWindow: 1000,
    rewardMultiplier: 3,
    penaltyMultiplier: 1.5,
  },
};

const COMPONENT_TYPES = {
  cpu: { name: 'CPU', color: '#FF6B6B', icon: 'CPU', shape: 'square' },
  gpu: { name: 'GPU', color: '#4ECDC4', icon: 'GPU', shape: 'square' },
  ram: { name: 'RAM', color: '#45B7D1', icon: 'RAM', shape: 'rectangle' },
  capacitor: { name: 'Конденсатор', color: '#96CEB4', icon: 'C', shape: 'circle' },
  resistor: { name: 'Резистор', color: '#FFEAA7', icon: 'R', shape: 'rectangle' },
  transistor: { name: 'Транзистор', color: '#DDA0DD', icon: 'Q', shape: 'triangle' },
};

export const MotherboardReactionGame: React.FC = () => {
  const { user } = useAuthContext();
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'game-over'>('idle');
  const [selectedDifficulty, setSelectedDifficulty] = useState<keyof typeof DIFFICULTY_LEVELS>('medium');
  const [components, setComponents] = useState<MotherboardComponent[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalClicks: 0,
    successfulFixes: 0,
    averageReactionTime: 0,
    bestReactionTime: Infinity,
    score: 0,
  });
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef<'idle' | 'playing' | 'paused' | 'game-over'>('idle');

  const difficultyConfig = DIFFICULTY_LEVELS[selectedDifficulty];

  // Update game state ref whenever gameState changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load user's bank cards
  useEffect(() => {
    const loadCards = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        setCards(data || []);
        if (data && data.length > 0) {
          setSelectedCardId(data[0].id);
        }
      } catch (err: any) {
        console.error('Error loading cards:', err);
      }
    };

    loadCards();
  }, [user]);

  const generateComponent = useCallback((): MotherboardComponent => {
    const types = Object.keys(COMPONENT_TYPES) as Array<keyof typeof COMPONENT_TYPES>;
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const component: MotherboardComponent = {
      id: `component-${Date.now()}-${Math.random()}`,
      x: Math.random() * 70 + 15, // Keep components within motherboard bounds
      y: Math.random() * 60 + 20,
      width: 8 + Math.random() * 4,
      height: 8 + Math.random() * 4,
      type: randomType,
      isFried: true,
      friedAt: Date.now(),
    };

    // Set timeout for component to disappear after 3000ms (3 seconds)
    component.timeoutId = setTimeout(() => {
      console.log('Component timeout reached:', component.id);
      handleComponentTimeout(component.id);
    }, 3000);

    return component;
  }, []);

  const handleComponentTimeout = useCallback(async (componentId: string) => {
    console.log('Component timed out:', componentId);
    
    // Remove the component
    setComponents(prev => {
      const component = prev.find(c => c.id === componentId);
      if (component && component.timeoutId) {
        clearTimeout(component.timeoutId);
      }
      return prev.filter(c => c.id !== componentId);
    });

    // Deduct 100 MR from the selected card
    if (selectedCardId && user) {
      try {
        console.log('Deducting 100 MR for missed component');
        
        // Get current balance
        const { data: cardData, error: fetchError } = await supabase
          .from('bank_cards')
          .select('balance')
          .eq('id', selectedCardId)
          .single();

        if (fetchError) {
          console.error('Error fetching card balance:', fetchError);
          setSnackbar({
            open: true,
            message: 'Ошибка при получении баланса карты',
            severity: 'error',
          });
          return;
        }

        const newBalance = Math.max(0, cardData.balance - 100);

        // Update balance directly
        const { error: updateError } = await supabase
          .from('bank_cards')
          .update({ balance: newBalance })
          .eq('id', selectedCardId);

        if (updateError) {
          console.error('Error updating card balance:', updateError);
          setSnackbar({
            open: true,
            message: 'Ошибка при списании MR',
            severity: 'error',
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Пропущен компонент! Снято 100 MR',
            severity: 'warning',
          });
        }
      } catch (err: any) {
        console.error('Error deducting MR:', err);
        setSnackbar({
          open: true,
          message: 'Ошибка при списании MR',
          severity: 'error',
        });
      }
    }

    // Update game stats
    setGameStats(prev => ({
      ...prev,
      totalClicks: prev.totalClicks + 1, // Count as a click attempt
      score: Math.max(0, prev.score - 100), // Deduct points
    }));
  }, [selectedCardId, user]);

  const spawnComponent = useCallback(() => {
    console.log('spawnComponent called, gameState:', gameState);
    if (gameState !== 'playing') {
      console.log('Game not playing, skipping spawn');
      return;
    }
    
    console.log('Spawning new component');
    setComponents(prev => {
      const newComponent = generateComponent();
      const updatedComponents = [...prev, newComponent];
      
      console.log('New components array:', updatedComponents);
      
      // Remove components that exceed max count
      if (updatedComponents.length > difficultyConfig.maxComponents) {
        return updatedComponents.slice(-difficultyConfig.maxComponents);
      }
      
      return updatedComponents;
    });
  }, [gameState, difficultyConfig.maxComponents, generateComponent]);

  const handleComponentClick = useCallback((componentId: string) => {
    console.log('handleComponentClick called for:', componentId, 'gameState:', gameState);
    if (gameState !== 'playing') {
      console.log('Game not playing, ignoring click');
      return;
    }

    const component = components.find(c => c.id === componentId);
    console.log('Found component:', component);
    if (!component || !component.isFried) {
      console.log('Component not found or not fried, ignoring click');
      return;
    }

    // Clear the timeout since component was clicked
    if (component.timeoutId) {
      clearTimeout(component.timeoutId);
      console.log('Cleared timeout for component:', componentId);
    }

    const reactionTime = Date.now() - (component.friedAt || 0);
    const isSuccessful = reactionTime <= difficultyConfig.reactionWindow;
    console.log('Reaction time:', reactionTime, 'isSuccessful:', isSuccessful);

    setComponents(prev => prev.map(c => 
      c.id === componentId 
        ? { ...c, isFried: false, reactionTime, timeoutId: undefined }
        : c
    ));

    setGameStats(prev => {
      const newStats = {
        ...prev,
        totalClicks: prev.totalClicks + 1,
        successfulFixes: prev.successfulFixes + (isSuccessful ? 1 : 0),
        bestReactionTime: Math.min(prev.bestReactionTime, reactionTime),
      };

      // Calculate average reaction time
      const totalReactionTime = prev.averageReactionTime * (prev.totalClicks - 1) + reactionTime;
      newStats.averageReactionTime = totalReactionTime / newStats.totalClicks;

      // Calculate score
      const baseScore = isSuccessful ? 100 : -50;
      const timeBonus = isSuccessful ? Math.max(0, difficultyConfig.reactionWindow - reactionTime) : 0;
      const difficultyBonus = difficultyConfig.rewardMultiplier;
      
      newStats.score = Math.max(0, prev.score + (baseScore + timeBonus) * difficultyBonus);

      console.log('Updated stats:', newStats);
      return newStats;
    });

    // Remove component after a short delay
    setTimeout(() => {
      console.log('Removing component:', componentId);
      setComponents(prev => prev.filter(c => c.id !== componentId));
    }, 800);
  }, [gameState, components, difficultyConfig.reactionWindow, difficultyConfig.rewardMultiplier]);

  const startGame = useCallback(() => {
    if (!selectedCardId) {
      setSnackbar({
        open: true,
        message: 'Выберите карту для игры',
        severity: 'error',
      });
      return;
    }

    console.log('Starting game with difficulty:', selectedDifficulty);
    setGameState('playing');
    setGameStartTime(Date.now());
    setTimeLeft(60);
    setComponents([]);
    setGameStats({
      totalClicks: 0,
      successfulFixes: 0,
      averageReactionTime: 0,
      bestReactionTime: Infinity,
      score: 0,
    });

    // Start component spawning - use direct function instead of callback
    console.log('Setting up spawn timer with interval:', difficultyConfig.spawnRate);
    const spawnInterval = setInterval(() => {
      console.log('Spawn timer tick, current gameState:', gameStateRef.current);
      if (gameStateRef.current !== 'playing') {
        console.log('Game not playing, skipping spawn');
        return;
      }
      
      setComponents(prev => {
        console.log('Current components count:', prev.length);
        if (prev.length >= difficultyConfig.maxComponents) {
          console.log('Max components reached, skipping spawn');
          return prev;
        }
        
        const newComponent = generateComponent();
        console.log('Adding new component:', newComponent);
        return [...prev, newComponent];
      });
    }, difficultyConfig.spawnRate);
    spawnTimerRef.current = spawnInterval;

    // Start game timer
    const gameTimer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    gameTimerRef.current = gameTimer;
  }, [selectedCardId, difficultyConfig.spawnRate, difficultyConfig.maxComponents, generateComponent]);

  const endGame = useCallback(async () => {
    setGameState('game-over');
    
    // Clear timers
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);

    // Clear all component timeouts
    setComponents(prev => {
      prev.forEach(component => {
        if (component.timeoutId) {
          clearTimeout(component.timeoutId);
        }
      });
      return [];
    });

    // Calculate final reward - give MR equal to the score
    const finalReward = Math.round(gameStats.score);
    
    if (finalReward > 0 && user && selectedCardId) {
      try {
        setLoading(true);
        
        // Get current balance
        const { data: cardData, error: fetchError } = await supabase
          .from('bank_cards')
          .select('balance')
          .eq('id', selectedCardId)
          .single();

        if (fetchError) {
          console.error('Error fetching card balance:', fetchError);
          setSnackbar({
            open: true,
            message: 'Ошибка при получении баланса карты',
            severity: 'error',
          });
          return;
        }

        const newBalance = cardData.balance + finalReward;

        // Update balance directly
        const { error: updateError } = await supabase
          .from('bank_cards')
          .update({ balance: newBalance })
          .eq('id', selectedCardId);

        if (updateError) {
          console.error('Error updating card balance:', updateError);
          setSnackbar({
            open: true,
            message: 'Ошибка при начислении MR',
            severity: 'error',
          });
        } else {
          setSnackbar({
            open: true,
            message: `Получено ${finalReward} MR за игру!`,
            severity: 'success',
          });
        }
      } catch (err: any) {
        console.error('Error adding MR:', err);
        setSnackbar({
          open: true,
          message: 'Ошибка при начислении MR',
          severity: 'error',
        });
      } finally {
        setLoading(false);
      }
    } else if (finalReward <= 0 && user && selectedCardId) {
      setSnackbar({
        open: true,
        message: 'Игра завершена без награды',
        severity: 'warning',
      });
    }
  }, [gameStats.score, user, selectedCardId]);

  const resetGame = useCallback(() => {
    setGameState('idle');
    setComponents([]);
    setTimeLeft(60);
    setGameStartTime(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, []);

  const renderMotherboard = () => {
    console.log('Rendering components:', components.length, components);
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '500px',
          background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 50%, #1a472a 100%)',
          borderRadius: 2,
          border: '4px solid #0f2a1a',
          overflow: 'hidden',
          cursor: 'crosshair',
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Motherboard PCB traces */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              linear-gradient(90deg, transparent 0%, #4a7c59 1px, transparent 2px),
              linear-gradient(0deg, transparent 0%, #4a7c59 1px, transparent 2px),
              radial-gradient(circle at 15% 15%, #4a7c59 0.5px, transparent 0.5px),
              radial-gradient(circle at 85% 85%, #4a7c59 0.5px, transparent 0.5px),
              radial-gradient(circle at 30% 70%, #4a7c59 0.5px, transparent 0.5px),
              radial-gradient(circle at 70% 30%, #4a7c59 0.5px, transparent 0.5px)
            `,
            backgroundSize: '40px 40px, 40px 40px, 80px 80px, 80px 80px, 120px 120px, 120px 120px',
            opacity: 0.4,
          }}
        />

        {/* Component slots/sockets */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '15%',
            width: '70%',
            height: '80%',
            background: `
              radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 2px, transparent 2px),
              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 2px, transparent 2px),
              radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px),
              radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 2px, transparent 2px),
              radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 2px, transparent 2px)
            `,
            backgroundSize: '60px 60px',
            opacity: 0.3,
          }}
        />

        {/* Components */}
        {components.map((component) => {
          const componentInfo = COMPONENT_TYPES[component.type];
          const isFried = component.isFried;
          const isFixed = !isFried;
          
          return (
            <Box
              key={component.id}
              onClick={() => {
                console.log('Component clicked:', component.id, 'isFried:', isFried);
                handleComponentClick(component.id);
              }}
              sx={{
                position: 'absolute',
                left: `${component.x}%`,
                top: `${component.y}%`,
                width: `${component.width}%`,
                height: `${component.height}%`,
                backgroundColor: isFried ? '#ff3333' : '#888888',
                borderRadius: componentInfo.shape === 'circle' ? '50%' : 
                             componentInfo.shape === 'triangle' ? '0' : '4px',
                border: '2px solid',
                borderColor: isFried ? '#ff0000' : '#666666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isFried 
                  ? '0 0 15px #ff3333, inset 0 0 10px rgba(255, 51, 51, 0.4), 0 0 30px #ff0000'
                  : '0 0 8px #888888, inset 0 0 5px rgba(136, 136, 136, 0.3)',
                animation: isFried ? 'friedPulse 0.8s infinite' : 'none',
                '&:hover': {
                  transform: 'scale(1.15)',
                  zIndex: 10,
                  boxShadow: isFried 
                    ? '0 0 25px #ff3333, inset 0 0 15px rgba(255, 51, 51, 0.6), 0 0 40px #ff0000'
                    : '0 0 12px #888888, inset 0 0 8px rgba(136, 136, 136, 0.5)',
                },
                '@keyframes friedPulse': {
                  '0%': { 
                    opacity: 0.7, 
                    transform: 'scale(1)',
                    boxShadow: '0 0 15px #ff3333, inset 0 0 10px rgba(255, 51, 51, 0.4), 0 0 30px #ff0000'
                  },
                  '50%': { 
                    opacity: 1, 
                    transform: 'scale(1.05)',
                    boxShadow: '0 0 20px #ff3333, inset 0 0 15px rgba(255, 51, 51, 0.6), 0 0 35px #ff0000'
                  },
                  '100%': { 
                    opacity: 0.7, 
                    transform: 'scale(1)',
                    boxShadow: '0 0 15px #ff3333, inset 0 0 10px rgba(255, 51, 51, 0.4), 0 0 30px #ff0000'
                  },
                },
              }}
            >
              {/* Component pins/leads - more realistic */}
              {componentInfo.shape === 'square' && (
                <>
                  {/* CPU/GPU pins on all sides */}
                  <Box sx={{ position: 'absolute', top: '-3px', left: '20%', width: '8px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', top: '-3px', right: '20%', width: '8px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', bottom: '-3px', left: '20%', width: '8px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', bottom: '-3px', right: '20%', width: '8px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', left: '-3px', top: '20%', width: '6px', height: '8px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', left: '-3px', bottom: '20%', width: '6px', height: '8px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', right: '-3px', top: '20%', width: '6px', height: '8px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', right: '-3px', bottom: '20%', width: '6px', height: '8px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                </>
              )}
              
              {componentInfo.shape === 'rectangle' && (
                <>
                  {/* RAM/Resistor pins on short sides */}
                  <Box sx={{ position: 'absolute', top: '-3px', left: '30%', width: '12px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', top: '-3px', right: '30%', width: '12px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', bottom: '-3px', left: '30%', width: '12px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', bottom: '-3px', right: '30%', width: '12px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                </>
              )}
              
              {componentInfo.shape === 'circle' && (
                <>
                  {/* Capacitor leads */}
                  <Box sx={{ position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '8px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '2px' }} />
                  <Box sx={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '8px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '2px' }} />
                </>
              )}
              
              {componentInfo.shape === 'triangle' && (
                <>
                  {/* Transistor pins */}
                  <Box sx={{ position: 'absolute', top: '-3px', left: '50%', transform: 'translateX(-50%)', width: '6px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', bottom: '-3px', left: '25%', width: '6px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                  <Box sx={{ position: 'absolute', bottom: '-3px', right: '25%', width: '6px', height: '6px', backgroundColor: isFried ? '#ff6666' : '#aaaaaa', borderRadius: '1px' }} />
                </>
              )}
              
              {/* Component label */}
              <Box sx={{ 
                textAlign: 'center', 
                color: 'white', 
                fontSize: '0.6rem',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                zIndex: 2,
                fontFamily: 'monospace',
              }}>
                <Box sx={{ fontSize: '0.7rem', mb: 0.2 }}>{componentInfo.icon}</Box>
                <Box sx={{ fontSize: '0.4rem' }}>
                  {isFried ? 'F' : 'OK'}
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Game overlay */}
        {gameState === 'playing' && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.8)',
              borderRadius: 1,
              p: 1.5,
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#00ff00', fontWeight: 'bold' }}>
              ⏱️ Время: {timeLeft}с
            </Typography>
            <Typography variant="h6" sx={{ color: '#ffff00', fontWeight: 'bold' }}>
              🎯 Счет: {Math.round(gameStats.score)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderGameOverDialog = () => (
    <Dialog open={gameState === 'game-over'} maxWidth="sm" fullWidth>
      <DialogTitle>Игра завершена!</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>Результаты:</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Общий счет:</Typography>
              <Typography fontWeight="bold">{Math.round(gameStats.score)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Получено MR:</Typography>
              <Typography fontWeight="bold" color="primary">{Math.round(gameStats.score)} MR</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Успешных исправлений:</Typography>
              <Typography fontWeight="bold">{gameStats.successfulFixes}/{gameStats.totalClicks}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Среднее время реакции:</Typography>
              <Typography fontWeight="bold">{gameStats.averageReactionTime.toFixed(0)}мс</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Лучшее время реакции:</Typography>
              <Typography fontWeight="bold">
                {gameStats.bestReactionTime === Infinity ? 'N/A' : `${gameStats.bestReactionTime}мс`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Точность:</Typography>
              <Typography fontWeight="bold">
                {gameStats.totalClicks > 0 ? ((gameStats.successfulFixes / gameStats.totalClicks) * 100).toFixed(1) : 0}%
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetGame} startIcon={<RefreshIcon />}>
          Играть снова
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <AppLayout>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <PageHeader
          title="Игра на реакцию: Материнская плата"
        />
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Быстро кликайте на сгоревшие компоненты!
        </Typography>

        {/* Game Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Сложность</InputLabel>
                <Select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as keyof typeof DIFFICULTY_LEVELS)}
                  disabled={gameState === 'playing'}
                >
                  {Object.entries(DIFFICULTY_LEVELS).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Карта для наград</InputLabel>
                <Select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  disabled={gameState === 'playing'}
                >
                  {cards.map((card) => (
                    <MenuItem key={card.id} value={card.id}>
                      {card.card_name} ({card.balance} {card.currency})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={startGame}
                disabled={gameState === 'playing' || !selectedCardId}
                size="large"
              >
                Начать игру
              </Button>
            </Box>

            {/* Difficulty Info */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>{difficultyConfig.name}:</strong> Появление каждые {difficultyConfig.spawnRate}мс, 
                максимум {difficultyConfig.maxComponents} компонентов, 
                время реакции {difficultyConfig.reactionWindow}мс
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Game Area */}
        <Card>
          <CardContent>
            {renderMotherboard()}
            
            {/* Instructions */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>🎮 Как играть:</strong> Сгоревшие микросхемы появляются на материнской плате. 
                Кликайте на красные компоненты как можно быстрее, чтобы исправить их! 
                <br />
                <strong>🔴 Красные</strong> = сгоревшие (кликайте!) | <strong>⚫ Серые</strong> = исправленные
                <br />
                <strong>⚡ Цель:</strong> Исправить как можно больше компонентов за 60 секунд!
                <br />
                <strong>⚠️ Внимание:</strong> Если не кликнуть компонент за 3 секунды - снимается 100 MR!
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Game Stats */}
        {gameState === 'playing' && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Статистика игры</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  icon={<CheckIcon />}
                  label={`Исправлено: ${gameStats.successfulFixes}`}
                  color="success"
                />
                <Chip
                  icon={<CancelIcon />}
                  label={`Пропущено: ${gameStats.totalClicks - gameStats.successfulFixes}`}
                  color="error"
                />
                <Chip
                  icon={<SpeedIcon />}
                  label={`Среднее время: ${gameStats.averageReactionTime.toFixed(0)}мс`}
                  color="info"
                />
                <Chip
                  icon={<TrendingUpIcon />}
                  label={`Счет: ${Math.round(gameStats.score)}`}
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        )}

        {renderGameOverDialog()}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </AppLayout>
  );
};
