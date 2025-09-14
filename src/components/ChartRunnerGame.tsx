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
  isMoving?: boolean; // Moving obstacle
  velocityX?: number; // Horizontal velocity for moving obstacles
  velocityY?: number; // Vertical velocity for moving obstacles
  patternType?: 'narrow' | 'zigzag' | 'spiral' | 'wave' | 'random' | 'floating' | 'large'; // Obstacle pattern type
}

interface PowerUp {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'speed' | 'shield' | 'magnet' | 'coin';
  duration?: number; // For temporary power-ups
  collected?: boolean;
}

interface Coin {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  collected?: boolean;
  animationFrame?: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  damage: number;
}

interface Cannon {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cooldown: number;
  maxCooldown: number;
  isActive: boolean;
  isEnemy?: boolean; // Enemy cannons shoot at player
  targetY?: number; // Target Y position for enemy cannons
}

// Game Constants
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_X_POS = GAME_WIDTH / 4;
const PLAYER_SPEED_X_BASE = 380; // Pixels per second
const SHARP_MOVEMENT_DISTANCE = 25; // Sharp movement distance per input
const MOVEMENT_COOLDOWN_MS = 100; // Cooldown between sharp movements
const UPWARD_FORCE = -500; // Force applied when holding up (negative = upward) - balanced
const GRAVITY = 600; // Gravity force pulling down - balanced
const MAX_VELOCITY = 300; // Maximum vertical velocity - balanced
const BASE_REWARD = 5000;
const BASE_PENALTY = 1000;
const DISTANCE_TO_WIN = 10000;
const GRACE_PERIOD_DURATION_MS = 3000; // 3 seconds for 3, 2, 1 countdown

// New game features
const COIN_VALUE = 100;
const POWERUP_DURATION = 5000; // 5 seconds
const MAGNET_RANGE = 80;
const SHIELD_DURATION = 3000; // 3 seconds

// Shooting system
const BULLET_SPEED = 400; // pixels per second
const BULLET_SIZE = 4;
const CANNON_COOLDOWN = 500; // milliseconds
const CANNON_SIZE = 12;
const ENEMY_CANNON_COOLDOWN = 2000; // Enemy cannons shoot every 2 seconds
const ENEMY_BULLET_SPEED = 300; // Enemy bullets are slower


interface DifficultyConfig {
  label: string;
  playerSpeedMultiplier: number;
  obstacleGenerationGap: number; // Horizontal distance between new obstacle segments
  pathWidthMin: number; // Minimum vertical space for player to navigate
  pathWidthMax: number; // Maximum vertical space
  pathChangeIntensity: number; // How much the path can change height rapidly (higher = sharper turns)
  rewardMultiplier: number;
  penaltyMultiplier: number;
  movementDistanceMultiplier: number; // Multiplier for sharp movement distance
  movementCooldownMultiplier: number; // Multiplier for movement cooldown (lower = faster)
  
  // New challenging features
  narrowPassageChance: number; // 0-1 chance of narrow passages
  movingObstacleChance: number; // 0-1 chance of moving obstacles
  patternComplexity: number; // 0-1 complexity of obstacle patterns
  speedIncreaseRate: number; // How much speed increases over time
  minPathWidth: number; // Absolute minimum path width (very narrow)
  maxPathWidth: number; // Absolute maximum path width
}

const DIFFICULTIES: { [key: string]: DifficultyConfig } = {
  easy: {
    label: 'Легкий',
    playerSpeedMultiplier: 0.8,
    obstacleGenerationGap: 250,
    pathWidthMin: 120, // Still wide but not too easy
    pathWidthMax: 150,
    pathChangeIntensity: 0.6,
    rewardMultiplier: 1.0,
    penaltyMultiplier: 1.0,
    movementDistanceMultiplier: 1.2,
    movementCooldownMultiplier: 1.5,
    narrowPassageChance: 0.1, // 10% chance of narrow passages
    movingObstacleChance: 0.05, // 5% chance of moving obstacles
    patternComplexity: 0.3, // Simple patterns
    speedIncreaseRate: 0.0001, // Very slow speed increase
    minPathWidth: 60, // Minimum 60px wide (3x player size + buffer)
    maxPathWidth: 150, // Maximum 150px wide
  },
  medium: {
    label: 'Средний',
    playerSpeedMultiplier: 1.0,
    obstacleGenerationGap: 200,
    pathWidthMin: 80,
    pathWidthMax: 120,
    pathChangeIntensity: 1.0,
    rewardMultiplier: 1.2,
    penaltyMultiplier: 1.2,
    movementDistanceMultiplier: 1.0,
    movementCooldownMultiplier: 1.0,
    narrowPassageChance: 0.3, // 30% chance of narrow passages
    movingObstacleChance: 0.15, // 15% chance of moving obstacles
    patternComplexity: 0.6, // Medium complexity patterns
    speedIncreaseRate: 0.0002, // Moderate speed increase
    minPathWidth: 50, // Minimum 50px wide (3x player size + buffer)
    maxPathWidth: 120, // Maximum 120px wide
  },
  hard: {
    label: 'Сложный',
    playerSpeedMultiplier: 1.2,
    obstacleGenerationGap: 150,
    pathWidthMin: 50,
    pathWidthMax: 90,
    pathChangeIntensity: 1.4,
    rewardMultiplier: 1.5,
    penaltyMultiplier: 1.5,
    movementDistanceMultiplier: 0.8,
    movementCooldownMultiplier: 0.7,
    narrowPassageChance: 0.6, // 60% chance of narrow passages
    movingObstacleChance: 0.3, // 30% chance of moving obstacles
    patternComplexity: 0.9, // Very complex patterns
    speedIncreaseRate: 0.0004, // Fast speed increase
    minPathWidth: 45, // Minimum 45px wide (3x player size)
    maxPathWidth: 90, // Maximum 90px wide
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
  const isInputPressedRef = useRef(false); // Track if input is currently held
  const lastMovementTimeRef = useRef(0); // Track last sharp movement time
  const playerVelocityYRef = useRef(0); // Player's vertical velocity
  const gameDistanceRef = useRef(0);
  const trailPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const screenShakeRef = useRef(0); // Screen shake intensity
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number }>>([]);
  
  // New game features
  const powerUpsRef = useRef<PowerUp[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const activePowerUpsRef = useRef<Map<string, number>>(new Map()); // powerup type -> remaining time
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const lastCoinTimeRef = useRef(0);
  
  // Shooting system
  const bulletsRef = useRef<Bullet[]>([]);
  const cannonsRef = useRef<Cannon[]>([]);
  const lastShotTimeRef = useRef(0);

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
  
  // Dynamic speed scaling based on distance traveled
  const currentSpeedX = useMemo(() => {
    const baseSpeed = PLAYER_SPEED_X_BASE * difficultyConfig.playerSpeedMultiplier;
    const speedIncrease = gameDistanceRef.current * difficultyConfig.speedIncreaseRate;
    return Math.min(baseSpeed + speedIncrease, baseSpeed * 2.5); // Cap at 2.5x base speed
  }, [difficultyConfig.playerSpeedMultiplier, difficultyConfig.speedIncreaseRate]);
  
  const currentMovementDistance = SHARP_MOVEMENT_DISTANCE * difficultyConfig.movementDistanceMultiplier;
  const currentMovementCooldown = MOVEMENT_COOLDOWN_MS * difficultyConfig.movementCooldownMultiplier;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const [showPenaltyOverlay, setShowPenaltyOverlay] = useState(false);
  const gracePeriodCounterRef = useRef(0);
  
  // New UI states
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [scorePopupValue, setScorePopupValue] = useState(0);
  const [showPowerUpEffect, setShowPowerUpEffect] = useState(false);
  const [powerUpEffectType, setPowerUpEffectType] = useState<string>('');


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
    isInputPressedRef.current = false;
    playerVelocityYRef.current = -50; // Start with balanced upward velocity
    lastMovementTimeRef.current = 0;
    gameDistanceRef.current = 0;
    trailPointsRef.current = [{ x: PLAYER_X_POS, y: playerYRef.current }];
    obstaclesRef.current = [];
    screenShakeRef.current = 0;
    particlesRef.current = [];
    
    // Reset new game features
    powerUpsRef.current = [];
    coinsRef.current = [];
    activePowerUpsRef.current.clear();
    scoreRef.current = 0;
    comboRef.current = 0;
    lastCoinTimeRef.current = 0;
    
    // Reset shooting system
    bulletsRef.current = [];
    cannonsRef.current = [];
    lastShotTimeRef.current = 0;

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
    // Find the last dynamic obstacle
    let lastDynamicObstacle: Obstacle | undefined;
    for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        if (!obstaclesRef.current[i].isBoundary && !obstaclesRef.current[i].isGracePeriodObstacle) {
            lastDynamicObstacle = obstaclesRef.current[i];
            break;
        }
    }

    const segmentStartX = lastDynamicObstacle ? lastDynamicObstacle.x + lastDynamicObstacle.width : GAME_WIDTH;
    const obstacleSegmentWidth = difficultyConfig.obstacleGenerationGap;

    // Calculate progress-based difficulty scaling
    const progressRatio = Math.min(gameDistanceRef.current / DISTANCE_TO_WIN, 1);
    const difficultyMultiplier = 1 + (progressRatio * 2); // 1x to 3x difficulty
    
    // Determine if this should be a narrow passage
    const isNarrowPassage = Math.random() < difficultyConfig.narrowPassageChance;
    const isMovingObstacle = Math.random() < difficultyConfig.movingObstacleChance;
    
    // FLOATING OBSTACLE GENERATION - No more pipe-like obstacles!
    // Just create floating obstacles at random positions - much simpler and safer
    
    // Create FLOATING obstacles instead of pipe-like obstacles
    const obstacles: Obstacle[] = [];
    
    // Generate floating obstacles in the air - NO pipe-like obstacles!
    const numObstacles = Math.floor(Math.random() * 2) + 1; // 1-2 obstacles for more gaps
    
    for (let i = 0; i < numObstacles; i++) {
      let obstacleY, obstacleHeight;
      
      // Distribute obstacles with more gaps - less cluttered
      if (i === 0) {
        // Random position across the entire screen height
        obstacleY = 30 + Math.random() * (GAME_HEIGHT - 60); // Full height with margins
        obstacleHeight = 20 + Math.random() * 30; // 20-50px tall
      } else {
        // Second obstacle in different area
        obstacleY = 30 + Math.random() * (GAME_HEIGHT - 60); // Full height with margins
        obstacleHeight = 20 + Math.random() * 30; // 20-50px tall
      }
      
      // Make sure obstacle doesn't go outside screen bounds
      const finalY = Math.max(10, Math.min(obstacleY, GAME_HEIGHT - obstacleHeight - 10));
      
      obstacles.push({
        id: `floating-${segmentStartX}-${i}-${Math.random()}`,
        x: segmentStartX,
        y: finalY,
        width: obstacleSegmentWidth,
        height: obstacleHeight,
        isBoundary: false,
        isMoving: isMovingObstacle,
        velocityX: isMovingObstacle ? (Math.random() - 0.5) * 50 : 0,
        velocityY: isMovingObstacle ? (Math.random() - 0.5) * 30 : 0,
        patternType: 'floating',
      });
    }
    
    // Add extra obstacles less frequently for more gaps
    if (Math.random() < 0.2) {
      // Extra obstacle occasionally
      const extraY = 30 + Math.random() * (GAME_HEIGHT - 60);
      const extraHeight = 15 + Math.random() * 20;
      
      obstacles.push({
        id: `extra-${segmentStartX}-${Math.random()}`,
        x: segmentStartX + obstacleSegmentWidth * 0.3,
        y: extraY,
        width: obstacleSegmentWidth * 0.7,
        height: extraHeight,
        isBoundary: false,
        isMoving: Math.random() < 0.3,
        velocityX: Math.random() * 15,
        velocityY: (Math.random() - 0.5) * 20,
        patternType: 'floating',
      });
    }
    
    obstaclesRef.current.push(...obstacles);
    
    // Generate coins and power-ups
    generateCoins(segmentStartX);
    generatePowerUps(segmentStartX);
    generateCannons(segmentStartX);
  }, [difficultyConfig]);

  // Generate coins
  const generateCoins = useCallback((segmentStartX: number) => {
    const coinCount = Math.floor(Math.random() * 3) + 1; // 1-3 coins per segment
    
    for (let i = 0; i < coinCount; i++) {
      const coinY = 50 + Math.random() * (GAME_HEIGHT - 100);
      const coinX = segmentStartX + (i + 1) * 60 + Math.random() * 40;
      
      coinsRef.current.push({
        id: `coin-${segmentStartX}-${i}-${Math.random()}`,
        x: coinX,
        y: coinY,
        width: 12,
        height: 12,
        value: COIN_VALUE,
        collected: false,
        animationFrame: 0,
      });
    }
  }, []);

  // Generate power-ups
  const generatePowerUps = useCallback((segmentStartX: number) => {
    if (Math.random() < 0.15) { // 15% chance for power-up
      const powerUpTypes: PowerUp['type'][] = ['speed', 'shield', 'magnet'];
      const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      const powerUpY = 50 + Math.random() * (GAME_HEIGHT - 100);
      const powerUpX = segmentStartX + 100 + Math.random() * 100;
      
      powerUpsRef.current.push({
        id: `powerup-${segmentStartX}-${Math.random()}`,
        x: powerUpX,
        y: powerUpY,
        width: 20,
        height: 20,
        type: powerUpType,
        duration: POWERUP_DURATION,
        collected: false,
      });
    }
  }, []);

  // Generate cannons
  const generateCannons = useCallback((segmentStartX: number) => {
    // Player cannons (more frequent)
    if (Math.random() < 0.6) { // 60% chance for player cannon
      const cannonY = 50 + Math.random() * (GAME_HEIGHT - 100);
      const cannonX = segmentStartX + 150 + Math.random() * 100;
      
      cannonsRef.current.push({
        id: `cannon-${segmentStartX}-${Math.random()}`,
        x: cannonX,
        y: cannonY,
        width: CANNON_SIZE,
        height: CANNON_SIZE,
        cooldown: 0,
        maxCooldown: CANNON_COOLDOWN,
        isActive: true,
        isEnemy: false,
      });
    }
    
    // Enemy cannons (shoot at player)
    if (Math.random() < 0.4) { // 40% chance for enemy cannon
      const cannonY = 50 + Math.random() * (GAME_HEIGHT - 100);
      const cannonX = segmentStartX + 200 + Math.random() * 150;
      
      cannonsRef.current.push({
        id: `enemy-cannon-${segmentStartX}-${Math.random()}`,
        x: cannonX,
        y: cannonY,
        width: CANNON_SIZE,
        height: CANNON_SIZE,
        cooldown: Math.random() * ENEMY_CANNON_COOLDOWN, // Random initial cooldown
        maxCooldown: ENEMY_CANNON_COOLDOWN,
        isActive: true,
        isEnemy: true,
        targetY: playerYRef.current, // Initial target
      });
    }
  }, []);

  // Shoot bullet from player
  const shootBullet = useCallback(() => {
    const currentTime = performance.now();
    if (currentTime - lastShotTimeRef.current < CANNON_COOLDOWN) {
      return; // Still on cooldown
    }
    
    lastShotTimeRef.current = currentTime;
    
    bulletsRef.current.push({
      id: `bullet-${currentTime}-${Math.random()}`,
      x: PLAYER_X_POS + PLAYER_SIZE,
      y: playerYRef.current + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
      width: BULLET_SIZE,
      height: BULLET_SIZE,
      velocityX: BULLET_SPEED,
      velocityY: 0,
      damage: 1,
    });
  }, []);

  const updateGame = useCallback(() => {
    const currentTime = performance.now();
    let deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    if (deltaTime > 0.1) {
        deltaTime = 0.1;
    }

    // Update screen shake
    if (screenShakeRef.current > 0) {
      screenShakeRef.current = Math.max(0, screenShakeRef.current - deltaTime * 1000);
    }

     // Update particles
     particlesRef.current = particlesRef.current
       .map(particle => ({
         ...particle,
         x: particle.x + particle.vx * deltaTime,
         y: particle.y + particle.vy * deltaTime,
         life: particle.life - deltaTime * 1000,
       }))
       .filter(particle => particle.life > 0);

     // Update active power-ups
     const powerUpEntries = Array.from(activePowerUpsRef.current.entries());
     for (const [powerUpType, remainingTime] of powerUpEntries) {
       const newTime = remainingTime - deltaTime * 1000;
       if (newTime <= 0) {
         activePowerUpsRef.current.delete(powerUpType);
    } else {
         activePowerUpsRef.current.set(powerUpType, newTime);
       }
     }

     // Update coin animations
     coinsRef.current = coinsRef.current.map(coin => ({
       ...coin,
       animationFrame: (coin.animationFrame || 0) + deltaTime * 10,
     }));

     // Update bullets
     bulletsRef.current = bulletsRef.current.map(bullet => ({
       ...bullet,
       x: bullet.x + bullet.velocityX * deltaTime,
       y: bullet.y + bullet.velocityY * deltaTime,
     })).filter(bullet => bullet.x < GAME_WIDTH + 50); // Remove bullets that are off screen

     // Update cannons
     cannonsRef.current = cannonsRef.current.map(cannon => {
       const updatedCannon = {
         ...cannon,
         cooldown: Math.max(0, cannon.cooldown - deltaTime * 1000),
       };
       
       // Enemy cannons shoot at player
       if (cannon.isEnemy && cannon.cooldown <= 0 && cannon.isActive) {
         // Update target to current player position
         updatedCannon.targetY = playerYRef.current;
         
         // Shoot enemy bullet
         const bulletY = cannon.y + cannon.height / 2 - BULLET_SIZE / 2;
         bulletsRef.current.push({
           id: `enemy-bullet-${Date.now()}-${Math.random()}`,
           x: cannon.x - BULLET_SIZE,
           y: bulletY,
           width: BULLET_SIZE,
           height: BULLET_SIZE,
           velocityX: -ENEMY_BULLET_SPEED, // Shoot left towards player
           velocityY: 0,
           damage: 1,
         });
         
         // Reset cooldown
         updatedCannon.cooldown = cannon.maxCooldown;
       }
       
       return updatedCannon;
     });

     // Update player movement based on input state
     if (gameState === 'playing' || gameState === 'grace-period') {
       updatePlayerMovement(deltaTime);
     }

     // Apply speed boost if active (will be applied later in the function)
     let speedBoostActive = activePowerUpsRef.current.has('speed');

    // Clamp player position to canvas edges (boundaries are now obstacles)
    if (playerYRef.current < 0) {
      playerYRef.current = 0;
    } else if (playerYRef.current > GAME_HEIGHT - PLAYER_SIZE) {
      playerYRef.current = GAME_HEIGHT - PLAYER_SIZE;
    }

    let currentScrollSpeedX = currentSpeedX;
     
     // Apply speed boost if active
     if (speedBoostActive) {
       currentScrollSpeedX *= 1.5;
     }
     
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
        // Update moving obstacles
        obstaclesRef.current = obstaclesRef.current.map((o) => {
          if (o.isMoving) {
            return {
              ...o,
              x: o.x - currentScrollSpeedX * deltaTime + (o.velocityX || 0) * deltaTime,
              y: o.y + (o.velocityY || 0) * deltaTime,
            };
          } else {
            return { ...o, x: o.x - currentScrollSpeedX * deltaTime };
          }
        });

         // Remove obstacles that are off screen
        obstaclesRef.current = obstaclesRef.current.filter((o) => o.x + o.width > 0);

         // Update and check coin collisions
         coinsRef.current = coinsRef.current.map(coin => {
           let newCoin = { ...coin, x: coin.x - currentScrollSpeedX * deltaTime };
           
           // Magnet effect
           if (activePowerUpsRef.current.has('magnet')) {
             const playerCenterX = PLAYER_X_POS + PLAYER_SIZE / 2;
             const playerCenterY = playerYRef.current + PLAYER_SIZE / 2;
             const coinCenterX = newCoin.x + newCoin.width / 2;
             const coinCenterY = newCoin.y + newCoin.height / 2;
             
             const distance = Math.sqrt(
               Math.pow(playerCenterX - coinCenterX, 2) + 
               Math.pow(playerCenterY - coinCenterY, 2)
             );
             
             if (distance < MAGNET_RANGE) {
               const magnetForce = 200 * deltaTime;
               const angle = Math.atan2(playerCenterY - coinCenterY, playerCenterX - coinCenterX);
               newCoin.x += Math.cos(angle) * magnetForce;
               newCoin.y += Math.sin(angle) * magnetForce;
             }
           }
           
           // Check collision with player
           if (!coin.collected && 
               PLAYER_X_POS < newCoin.x + newCoin.width &&
               PLAYER_X_POS + PLAYER_SIZE > newCoin.x &&
               playerYRef.current < newCoin.y + newCoin.height &&
               playerYRef.current + PLAYER_SIZE > newCoin.y) {
             
             // Collect coin
             scoreRef.current += coin.value;
             comboRef.current += 1;
             
             // Show score popup
             setScorePopupValue(coin.value);
             setShowScorePopup(true);
             setTimeout(() => setShowScorePopup(false), 1000);
             
             // Add particles
             for (let i = 0; i < 5; i++) {
               particlesRef.current.push({
                 x: newCoin.x + newCoin.width / 2,
                 y: newCoin.y + newCoin.height / 2,
                 vx: (Math.random() - 0.5) * 100,
                 vy: (Math.random() - 0.5) * 100,
                 life: 500,
                 maxLife: 500,
               });
             }
             
             return { ...newCoin, collected: true };
           }
           
           return newCoin;
         }).filter(coin => coin.x + coin.width > 0 && !coin.collected);

         // Update and check power-up collisions
         powerUpsRef.current = powerUpsRef.current.map(powerUp => {
           const newPowerUp = { ...powerUp, x: powerUp.x - currentScrollSpeedX * deltaTime };
           
           // Check collision with player
           if (!powerUp.collected && 
               PLAYER_X_POS < newPowerUp.x + newPowerUp.width &&
               PLAYER_X_POS + PLAYER_SIZE > newPowerUp.x &&
               playerYRef.current < newPowerUp.y + newPowerUp.height &&
               playerYRef.current + PLAYER_SIZE > newPowerUp.y) {
             
             // Activate power-up
             activePowerUpsRef.current.set(powerUp.type, powerUp.duration || POWERUP_DURATION);
             
             // Show power-up effect
             setPowerUpEffectType(powerUp.type);
             setShowPowerUpEffect(true);
             setTimeout(() => setShowPowerUpEffect(false), 2000);
             
             // Add particles
             for (let i = 0; i < 8; i++) {
               particlesRef.current.push({
                 x: newPowerUp.x + newPowerUp.width / 2,
                 y: newPowerUp.y + newPowerUp.height / 2,
                 vx: (Math.random() - 0.5) * 120,
                 vy: (Math.random() - 0.5) * 120,
                 life: 800,
                 maxLife: 800,
               });
             }
             
             return { ...newPowerUp, collected: true };
           }
           
           return newPowerUp;
         }).filter(powerUp => powerUp.x + powerUp.width > 0 && !powerUp.collected);

         // Check bullet collisions with obstacles
         bulletsRef.current = bulletsRef.current.filter(bullet => {
           let bulletHit = false;
           
           // Check collision with obstacles
           for (const obstacle of obstaclesRef.current) {
             if (!obstacle.isBoundary && !obstacle.isGracePeriodObstacle &&
                 bullet.x < obstacle.x + obstacle.width &&
                 bullet.x + bullet.width > obstacle.x &&
                 bullet.y < obstacle.y + obstacle.height &&
                 bullet.y + bullet.height > obstacle.y) {
               
               // Bullet hit obstacle - destroy both
               bulletHit = true;
               
               // Add explosion particles
               for (let i = 0; i < 6; i++) {
                 particlesRef.current.push({
                   x: bullet.x + bullet.width / 2,
                   y: bullet.y + bullet.height / 2,
                   vx: (Math.random() - 0.5) * 100,
                   vy: (Math.random() - 0.5) * 100,
                   life: 300,
                   maxLife: 300,
                 });
               }
               
               // Screen shake for explosion
               screenShakeRef.current = 8;
               
               // Remove obstacle
               obstaclesRef.current = obstaclesRef.current.filter(o => o.id !== obstacle.id);
               
               // Add score for destroying obstacle
               scoreRef.current += 50;
               
               break;
             }
           }
           
           return !bulletHit;
         });

         // Check bullet collisions with cannons
         bulletsRef.current = bulletsRef.current.filter(bullet => {
           let bulletHit = false;
           
           // Only player bullets can hit cannons
           if (!bullet.id.includes('enemy-bullet')) {
             for (const cannon of cannonsRef.current) {
               if (bullet.x < cannon.x + cannon.width &&
                   bullet.x + bullet.width > cannon.x &&
                   bullet.y < cannon.y + cannon.height &&
                   bullet.y + bullet.height > cannon.y) {
                 
                 // Bullet hit cannon - destroy both
                 bulletHit = true;
                 
                 // Add explosion particles
                 for (let i = 0; i < 8; i++) {
                   particlesRef.current.push({
                     x: cannon.x + cannon.width / 2,
                     y: cannon.y + cannon.height / 2,
                     vx: (Math.random() - 0.5) * 120,
                     vy: (Math.random() - 0.5) * 120,
                     life: 400,
                     maxLife: 400,
                   });
                 }
                 
                 // Screen shake for explosion
                 screenShakeRef.current = 10;
                 
                 // Remove cannon
                 cannonsRef.current = cannonsRef.current.filter(c => c.id !== cannon.id);
                 
                 // Add score for destroying cannon
                 scoreRef.current += 100;
                 
                 break;
               }
             }
           }
           
           return !bulletHit;
         });

         // Check enemy bullet collisions with player
         bulletsRef.current = bulletsRef.current.filter(bullet => {
           if (bullet.id.includes('enemy-bullet')) {
             const playerLeft = PLAYER_X_POS;
             const playerRight = playerLeft + PLAYER_SIZE;
             const playerTop = playerYRef.current;
             const playerBottom = playerTop + PLAYER_SIZE;
             
             if (bullet.x < playerRight &&
                 bullet.x + bullet.width > playerLeft &&
                 bullet.y < playerBottom &&
                 bullet.y + bullet.height > playerTop) {
               
               // Enemy bullet hit player
               
               // Check if shield is active
               if (activePowerUpsRef.current.has('shield')) {
                 // Shield protects from enemy bullet
                 activePowerUpsRef.current.delete('shield');
                 
                 // Add shield break particles
                 for (let i = 0; i < 10; i++) {
                   particlesRef.current.push({
                     x: PLAYER_X_POS + PLAYER_SIZE / 2,
                     y: playerYRef.current + PLAYER_SIZE / 2,
                     vx: (Math.random() - 0.5) * 150,
                     vy: (Math.random() - 0.5) * 150,
                     life: 1000,
                     maxLife: 1000,
                   });
                 }
                 
                 // Screen shake for shield break
                 screenShakeRef.current = 15;
               } else {
                 setGameState('lost'); // Hit by enemy bullet
                 return false; // Remove bullet
               }
               
               return false; // Remove bullet
             }
           }
           
           return true; // Keep bullet
         });

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
             // Check if shield is active
             if (activePowerUpsRef.current.has('shield')) {
               // Shield protects from one hit
               activePowerUpsRef.current.delete('shield');
               
               // Add shield break particles
               for (let i = 0; i < 10; i++) {
                 particlesRef.current.push({
                   x: PLAYER_X_POS + PLAYER_SIZE / 2,
                   y: playerYRef.current + PLAYER_SIZE / 2,
                   vx: (Math.random() - 0.5) * 150,
                   vy: (Math.random() - 0.5) * 150,
                   life: 1000,
                   maxLife: 1000,
                 });
               }
               
               // Screen shake for shield break
               screenShakeRef.current = 15;
             } else {
            setGameState('lost'); // Hit an obstacle/boundary
            return;
             }
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

  }, [currentSpeedX, difficultyConfig, generateObstacleSegment, gameState]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply screen shake
    const shakeX = screenShakeRef.current > 0 ? (Math.random() - 0.5) * screenShakeRef.current : 0;
    const shakeY = screenShakeRef.current > 0 ? (Math.random() - 0.5) * screenShakeRef.current : 0;
    
    ctx.save();
    ctx.translate(shakeX, shakeY);

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = theme.palette.background.default;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    obstaclesRef.current.forEach((o) => {
        if (o.isBoundary) {
            ctx.fillStyle = theme.palette.grey[700];
        } else if (o.isGracePeriodObstacle) {
            ctx.fillStyle = theme.palette.grey[500]; // Lighter grey for temporary grace period walls
        } else {
            // Different colors for different obstacle types
            if (o.isMoving) {
                // Moving obstacles - pulsing red
                const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(244, 67, 54, ${pulse})`;
            } else if (o.patternType === 'zigzag') {
                // Zigzag obstacles - orange
                ctx.fillStyle = theme.palette.warning.main;
            } else if (o.patternType === 'spiral') {
                // Spiral obstacles - purple
                ctx.fillStyle = theme.palette.secondary.main;
            } else if (o.patternType === 'wave') {
                // Wave obstacles - blue
                ctx.fillStyle = theme.palette.info.main;
            } else if (o.patternType === 'floating') {
                // Floating obstacles - red with shadow
                ctx.fillStyle = theme.palette.error.main;
            } else if (o.patternType === 'large') {
                // Large obstacles - orange
                ctx.fillStyle = theme.palette.warning.main;
            } else {
                // Regular obstacles - red
            ctx.fillStyle = theme.palette.error.main;
        }
        }
        
        // Draw obstacle with pattern-specific styling
        if (o.patternType === 'zigzag' && !o.isMoving) {
            // Zigzag pattern - draw with jagged edges
            ctx.beginPath();
            ctx.moveTo(o.x, o.y);
            for (let i = 0; i < o.width; i += 10) {
                const offset = Math.sin(i * 0.3) * 5;
                ctx.lineTo(o.x + i, o.y + offset);
            }
            ctx.lineTo(o.x + o.width, o.y);
            ctx.lineTo(o.x + o.width, o.y + o.height);
            for (let i = o.width; i >= 0; i -= 10) {
                const offset = Math.sin(i * 0.3) * 5;
                ctx.lineTo(o.x + i, o.y + o.height + offset);
            }
            ctx.closePath();
            ctx.fill();
        } else if (o.patternType === 'floating' || o.patternType === 'large') {
            // Floating and large obstacles - rounded rectangles with shadow
            if (o.patternType === 'floating') {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            
            // Draw rounded rectangle
            ctx.beginPath();
            const radius = o.patternType === 'floating' ? 8 : 6;
            ctx.roundRect(o.x, o.y, o.width, o.height, radius);
            ctx.fill();
            
            // Reset shadow
            if (o.patternType === 'floating') {
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        } else {
            // Regular rectangle
        ctx.fillRect(o.x, o.y, o.width, o.height);
        }
        
        // Add moving indicator for moving obstacles
        if (o.isMoving) {
            ctx.strokeStyle = theme.palette.warning.main;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            if (o.patternType === 'floating' || o.patternType === 'large') {
                // Draw rounded stroke for floating/large obstacles
                ctx.beginPath();
                const radius = o.patternType === 'floating' ? 8 : 6;
                ctx.roundRect(o.x, o.y, o.width, o.height, radius);
                ctx.stroke();
            } else {
                // Regular rectangle stroke
                ctx.strokeRect(o.x, o.y, o.width, o.height);
            }
            
            ctx.setLineDash([]);
        }
    });

     // Draw coins
     coinsRef.current.forEach(coin => {
       if (!coin.collected) {
         const animationFrame = coin.animationFrame || 0;
         const scale = 1 + Math.sin(animationFrame) * 0.2;
         const alpha = 0.8 + Math.sin(animationFrame * 2) * 0.2;
         
         ctx.save();
         ctx.translate(coin.x + coin.width / 2, coin.y + coin.height / 2);
         ctx.scale(scale, scale);
         
         // Gold coin
         ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.beginPath();
         ctx.arc(0, 0, coin.width / 2, 0, Math.PI * 2);
    ctx.fill();
         
         // Coin shine
         ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
         ctx.beginPath();
         ctx.arc(-coin.width / 4, -coin.height / 4, coin.width / 4, 0, Math.PI * 2);
         ctx.fill();
         
         ctx.restore();
       }
     });

     // Draw power-ups
     powerUpsRef.current.forEach(powerUp => {
       if (!powerUp.collected) {
         const animationFrame = Date.now() * 0.01;
         const scale = 1 + Math.sin(animationFrame) * 0.1;
         
         ctx.save();
         ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
         ctx.scale(scale, scale);
         
         // Power-up colors
         let color = theme.palette.primary.main;
         let symbol = '?';
         
         switch (powerUp.type) {
           case 'speed':
             color = theme.palette.success.main;
             symbol = '⚡';
             break;
           case 'shield':
             color = theme.palette.info.main;
             symbol = '🛡';
             break;
           case 'magnet':
             color = theme.palette.warning.main;
             symbol = '🧲';
             break;
         }
         
         ctx.fillStyle = color;
         ctx.beginPath();
         ctx.roundRect(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height, 4);
         ctx.fill();
         
         // Symbol
         ctx.fillStyle = theme.palette.background.paper;
         ctx.font = '14px Arial';
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillText(symbol, 0, 0);
         
         ctx.restore();
       }
     });

     // Draw cannons
     cannonsRef.current.forEach(cannon => {
       if (cannon.isActive) {
         // Cannon body - different colors for enemy vs player cannons
         if (cannon.isEnemy) {
           ctx.fillStyle = theme.palette.error.main;
         } else {
           ctx.fillStyle = theme.palette.grey[600];
         }
         ctx.fillRect(cannon.x, cannon.y, cannon.width, cannon.height);
         
         // Cannon barrel
         ctx.fillStyle = theme.palette.grey[800];
         if (cannon.isEnemy) {
           // Enemy cannons shoot left
           ctx.fillRect(cannon.x - 8, cannon.y + cannon.height / 2 - 1, 8, 2);
         } else {
           // Player cannons shoot right
           ctx.fillRect(cannon.x + cannon.width / 2 - 1, cannon.y - 8, 2, 8);
         }
         
         // Ready indicator
         if (cannon.cooldown <= 0) {
           if (cannon.isEnemy) {
             ctx.fillStyle = theme.palette.error.main; // Red for enemy cannons
           } else {
             ctx.fillStyle = theme.palette.success.main; // Green for player cannons
           }
           ctx.beginPath();
           ctx.arc(cannon.x + cannon.width / 2, cannon.y + cannon.height / 2, 2, 0, Math.PI * 2);
           ctx.fill();
         }
       }
     });

     // Draw bullets
     bulletsRef.current.forEach(bullet => {
       // Different colors for player vs enemy bullets
       if (bullet.id.includes('enemy-bullet')) {
         // Enemy bullets - red with glow
         ctx.shadowColor = theme.palette.error.main;
         ctx.shadowBlur = 8;
         ctx.fillStyle = theme.palette.error.main;
       } else {
         // Player bullets - yellow with glow
         ctx.shadowColor = theme.palette.warning.main;
         ctx.shadowBlur = 8;
         ctx.fillStyle = theme.palette.warning.main;
       }
       ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
       ctx.shadowBlur = 0;
     });

     // Draw particles
     particlesRef.current.forEach(particle => {
       const alpha = particle.life / particle.maxLife;
       ctx.fillStyle = `rgba(33, 150, 243, ${alpha * 0.8})`;
       ctx.beginPath();
       ctx.arc(particle.x, particle.y, 3 * alpha, 0, Math.PI * 2);
       ctx.fill();
     });

     // Draw player with enhanced visual effects
     const playerCenterX = PLAYER_X_POS;
     const playerCenterY = playerYRef.current + PLAYER_SIZE / 2;
     
     // Shield effect
     if (activePowerUpsRef.current.has('shield')) {
       const shieldAnimation = Date.now() * 0.01;
       const shieldRadius = PLAYER_SIZE / 2 + 8 + Math.sin(shieldAnimation) * 2;
       
       ctx.strokeStyle = theme.palette.info.main;
       ctx.lineWidth = 3;
       ctx.setLineDash([5, 5]);
       ctx.beginPath();
       ctx.arc(playerCenterX, playerCenterY, shieldRadius, 0, Math.PI * 2);
       ctx.stroke();
       ctx.setLineDash([]);
     }
     
     // Player glow effect - different color when holding input
     const playerColor = isInputPressedRef.current ? theme.palette.success.main : theme.palette.primary.main;
     ctx.shadowColor = playerColor;
     ctx.shadowBlur = isInputPressedRef.current ? 20 : 15;
     ctx.fillStyle = playerColor;
     ctx.beginPath();
     ctx.arc(playerCenterX, playerCenterY, PLAYER_SIZE / 2, 0, Math.PI * 2);
     ctx.fill();
     
     // Add upward arrow when holding input
     if (isInputPressedRef.current) {
       ctx.fillStyle = theme.palette.success.contrastText;
       ctx.font = '12px Arial';
       ctx.textAlign = 'center';
       ctx.fillText('↑', playerCenterX, playerCenterY - PLAYER_SIZE - 5);
       ctx.textAlign = 'left';
     }
     
     // Reset shadow
     ctx.shadowBlur = 0;

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
    
     // Score and combo
     ctx.fillStyle = theme.palette.warning.main;
     ctx.fillText(`Очки: ${scoreRef.current}`, 10, 40);
     
     if (comboRef.current > 1) {
       ctx.fillStyle = theme.palette.success.main;
       ctx.fillText(`Комбо: x${comboRef.current}`, 10, 60);
     }
     
     // Active power-ups
     let powerUpY = 80;
     activePowerUpsRef.current.forEach((remainingTime, powerUpType) => {
       const timeLeft = Math.ceil(remainingTime / 1000);
       let color = theme.palette.primary.main;
       let symbol = '?';
       
       switch (powerUpType) {
         case 'speed':
           color = theme.palette.success.main;
           symbol = '⚡';
           break;
         case 'shield':
           color = theme.palette.info.main;
           symbol = '🛡';
           break;
         case 'magnet':
           color = theme.palette.warning.main;
           symbol = '🧲';
           break;
       }
       
       ctx.fillStyle = color;
       ctx.fillText(`${symbol} ${timeLeft}s`, 10, powerUpY);
       powerUpY += 20;
     });
     
     // Speed indicator
     const speedRatio = currentSpeedX / (PLAYER_SPEED_X_BASE * difficultyConfig.playerSpeedMultiplier);
     ctx.fillStyle = speedRatio > 1.5 ? theme.palette.error.main : speedRatio > 1.2 ? theme.palette.warning.main : theme.palette.success.main;
     ctx.fillText(`Скорость: ${Math.round(speedRatio * 100)}%`, 10, GAME_HEIGHT - 20);
    
    // Restore canvas transform
    ctx.restore();

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
         const totalPrize = currentReward + scoreRef.current;
         setDialogContent(`Вы успешно прошли дистанцию! Вы заработали ${formatCurrency(currentReward, 'MR')} + ${formatCurrency(scoreRef.current, 'MR')} (очки) = ${formatCurrency(totalPrize, 'MR')}. Выберите карту, на которую хотите зачислить средства.`);
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

  // Physics-based movement system with balanced controls
  const updatePlayerMovement = useCallback((deltaTime: number) => {
    const oldY = playerYRef.current;
    
    // Apply forces based on input - balanced for good control
    if (isInputPressedRef.current) {
      // Apply upward force when holding input - balanced strength
      playerVelocityYRef.current += UPWARD_FORCE * deltaTime;
    } else {
      // Apply gravity when not holding input - balanced weight
      playerVelocityYRef.current += GRAVITY * deltaTime;
    }
    
    // Clamp velocity to maximum - balanced limits
    playerVelocityYRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, playerVelocityYRef.current));
    
    // Add slight damping for better control
    playerVelocityYRef.current *= 0.995;
    
    // Update position based on velocity
    playerYRef.current += playerVelocityYRef.current * deltaTime;
    
    // Add visual effects for significant movement
    if (Math.abs(oldY - playerYRef.current) > 2) {
      // Add screen shake for significant movement
      screenShakeRef.current = Math.max(screenShakeRef.current, 4);
      
      // Add particles occasionally
      if (Math.random() < 0.3) {
        particlesRef.current.push({
          x: PLAYER_X_POS + (Math.random() - 0.5) * PLAYER_SIZE,
          y: oldY + PLAYER_SIZE / 2 + (Math.random() - 0.5) * PLAYER_SIZE,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 200,
          maxLife: 200,
        });
      }
    }
  }, []);

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
       } else if (event.code === 'KeyX' || event.code === 'ArrowRight') {
         event.preventDefault();
         if (gameState === 'playing' || gameState === 'grace-period') {
           shootBullet();
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
   }, [handleInputDown, handleInputUp, shootBullet, gameState]);

  // Mobile touch controls (on canvas) - optimized for mobile
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

    // Add touchmove to prevent scrolling and improve responsiveness
    const handleCanvasTouchMove = (event: TouchEvent) => {
      event.preventDefault();
    };

    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleCanvasTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleCanvasTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleCanvasTouchStart);
      canvas.removeEventListener('touchend', handleCanvasTouchEnd);
      canvas.removeEventListener('touchcancel', handleCanvasTouchEnd);
      canvas.removeEventListener('touchmove', handleCanvasTouchMove);
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

       const totalPrize = currentReward + scoreRef.current;
      const { error } = await supabase
        .from('bank_cards')
         .update({ balance: cardToUpdate.balance + totalPrize })
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
             Управляйте "курсом акций" удерживая или отпуская! Удерживайте ↑ или Space для подъема, отпустите для спуска.
             <br />
             На мобильных: касайтесь и удерживайте экран для подъема, отпустите для спуска.
             <br />
             🔫 Стреляйте: X или → для уничтожения препятствий и пушек!
             <br />
             ⚔️ Вражеские пушки стреляют в вас - избегайте красных пуль!
             <br />
             🪙 Собирайте золотые монеты - они добавятся к призу!
             <br />
             ⚡ Подбирайте бонусы: Скорость, Щит, Магнит
             <br />
             Пройдите {DISTANCE_TO_WIN} пунктов дистанции, чтобы выиграть.
             <br />
             Приз: {currentReward} MR + ваши очки. Штраф: -{currentPenalty} MR.
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
                {gameState === 'grace-period' ? 'Приготовьтесь!' : 'Удерживайте ↑/Space для подъема, отпустите для спуска!'}
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
               
               {showScorePopup && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.5 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.5 }}
                   transition={{ duration: 0.3, ease: "easeOut" }}
                   style={{
                     position: 'absolute',
                     top: '30%',
                     left: '50%',
                     transform: 'translate(-50%, -50%)',
                     zIndex: 20,
                     backgroundColor: 'rgba(255, 215, 0, 0.9)',
                     color: 'black',
                     padding: theme.spacing(1, 2),
                     borderRadius: theme.shape.borderRadius,
                     pointerEvents: 'none',
                     boxShadow: theme.shadows[3],
                   }}
                 >
                   <Typography variant="h6" fontWeight={700}>
                     +{scorePopupValue}
                   </Typography>
                 </motion.div>
               )}
               
               {showPowerUpEffect && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 1.2 }}
                   transition={{ duration: 0.4, ease: "easeOut" }}
                   style={{
                     position: 'absolute',
                     top: '40%',
                     left: '50%',
                     transform: 'translate(-50%, -50%)',
                     zIndex: 20,
                     backgroundColor: 'rgba(76, 175, 80, 0.9)',
                     color: 'white',
                     padding: theme.spacing(2, 3),
                     borderRadius: theme.shape.borderRadius,
                     pointerEvents: 'none',
                     boxShadow: theme.shadows[5],
                   }}
                 >
                   <Typography variant="h6" fontWeight={700}>
                     {powerUpEffectType === 'speed' && '⚡ Скорость!'}
                     {powerUpEffectType === 'shield' && '🛡 Щит!'}
                     {powerUpEffectType === 'magnet' && '🧲 Магнит!'}
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