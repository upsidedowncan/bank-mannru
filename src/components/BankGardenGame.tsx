// src/components/BankGardenGame.tsx
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
  Chip,
  LinearProgress,
} from '@mui/material';

import {
  ArrowBack as ArrowBackIcon,
  LocalFlorist as GardenIcon, // Icon for the game
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  CreditCard,
  ShowChart,
  AccountBalanceWallet as VaultIcon,
  Upgrade as UpgradeIcon, // For upgrading assets
  Redeem as HarvestIcon, // For harvesting
  PlayArrow as PlayIcon,
  Diamond as GemIcon,
  Cloud as CloudIcon,
  Paid as CashOutIcon,
  Inventory2 as InventoryIcon,
  Sell as SellIcon,
  Storage as StorageIcon, // New icon for new asset
  LocalAtm as BankNoteIcon, // New icon for new asset
  // Mutation icons
  FlashOn as FlashIcon,
  LocalFlorist as EcoIcon,
  Casino as CasinoIcon,
  Science as ScienceIcon,
  Height as HeightIcon,
  Palette as PaletteIcon,
  // Sprinkler icon
  WaterDrop as SprinklerIcon,
  // Achievement icons
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as BrainIcon,
  Park as SeedIcon,
  CalendarToday as CalendarIcon,
  Star as AuroraIcon,
  Brightness7 as DiamondIcon,
  AutoAwesome as SparkleIcon,
  Spa as MicroPlantIcon, // Icon for micro-plant
  // Garden modifier icons
  Expand as ExpandIcon,
  Biotech as MutationIcon,
  // Weather icons
  WbSunny as SunnyIcon,
  Thunderstorm as StormIcon,
  AcUnit as SnowIcon,
  Whatshot as HeatIcon,
  // Plant combination icons
  Group as SynergyIcon,
  Timeline as EvolutionIcon,
  // Seasonal event icons
  Cake as BirthdayIcon,
  StarBorder as ChristmasIcon,
  LocalFireDepartment as HalloweenIcon,
  FilterVintage as SpringIcon,
  BeachAccess as SummerIcon,
  Thermostat as WinterIcon,
  Event as EventIcon,
  // Search icon
  Search as SearchIcon,
  // Additional icons for new content
  MonetizationOn as AttachMoneyIcon,
  Speed as SpeedIcon,
  Build as BuildIcon,
  Air as AirIcon,
  WbSunny as DroughtIcon,
  Assignment as AssignmentIcon,
  MilitaryTech as EmojiEventsIcon,
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

// --- GAME ASSET TYPES & CONFIG ---
interface GameAsset {
  id: string; // Unique ID for each planted asset
  type: 'mr_tree' | 'card_plant' | 'investment_flower' | 'vault_strongbox' | 'gold_mine' | 'crypto_farm' | 'bank_branch' | 'digital_vault' | 'coin_flower' | 'penny_plant' | 'dollar_bush' | 'treasure_sprout' | 'sprinkler' | 'micro_plant' | 'quantum_flower' | 'crystal_tree' | 'time_vine' | 'energy_well' | 'gem_plant' | 'solar_panel' | 'wind_turbine' | 'mushroom_farm' | 'honey_beehive' | 'magic_crystal' | 'rainbow_flower' | 'diamond_mine' | 'platinum_rose' | 'emerald_vine' | 'ruby_cactus' | 'sapphire_lily' | 'mystic_orchid' | 'cosmic_fern' | 'stellar_bamboo' | 'lunar_lotus' | 'solar_palm';
  level: number; // Growth level or efficiency level
  growthProgress: number; // 0-100% of current level's growth
  isReadyToHarvest: boolean; // Flag if fully grown and ready to be picked (for harvestable items)
  x: number; // Grid X
  y: number; // Grid Y
  lastGrowthTickTime: number; // When growth was last calculated for this specific asset
  mutations?: PlantMutation[]; // Random mutations that can appear
  evolutionProgress?: number; // 0-100% progress towards evolution
  canEvolve?: boolean; // Whether this plant can evolve
}

interface PlantMutation {
  id: string;
  type: 'golden' | 'speedy' | 'fertile' | 'lucky' | 'giant' | 'rainbow';
  name: string;
  description: string;
  effect: {
    yieldMultiplier?: number; // Multiplies base yield
    growthSpeedMultiplier?: number; // Multiplies growth speed
    luckBonus?: number; // Chance for bonus rewards
    color?: string; // Visual mutation color
  };
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon: React.ElementType;
}

interface InventoryItem {
  type: 'gold' | 'crypto_tokens' | 'crystal' | 'gem' | 'mushroom' | 'honey' | 'diamond' | 'platinum' | 'emerald' | 'ruby' | 'sapphire'; // Supported inventory item types
  amount: number; // How many of this item is in inventory
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  reward: {
    type: 'mr' | 'mutation_chance' | 'sprinkler_discount' | 'special_seed' | 'special_plant' | 'growth_speed';
    amount: number;
    plantType?: string;
  };
  condition: {
    type: 'harvest_count' | 'total_earned' | 'mutations_gained' | 'plants_planted' | 'consecutive_days' | 'modifiers_purchased' | 'premium_plants' | 'daily_harvests' | 'consecutive_mutations' | 'max_plant_level';
    target: number;
  };
  unlocked: boolean;
  progress: number;
}

interface GardenModifier {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: React.ElementType;
  effect: {
    type: 'garden_size' | 'mutation_chance' | 'yield_multiplier' | 'growth_speed' | 'premium_boost' | 'rare_mutation_chance' | 'max_level_boost';
    amount: number;
  };
  maxLevel: number;
  purchased: boolean;
  level: number;
}

interface WeatherEffect {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  effect: {
    growthSpeedMultiplier: number;
    yieldMultiplier: number;
    mutationChanceBonus: number;
  };
  duration: number; // in minutes
  active: boolean;
  endTime: number;
}

interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  effect: {
    growthSpeedMultiplier: number;
    yieldMultiplier: number;
    mutationChanceBonus: number;
    specialPlantChance: number;
  };
  duration: number; // in hours
  active: boolean;
  endTime: number;
  specialPlants?: string[]; // Plant types that can appear during this event
}

interface ServerEvent {
  id: string;
  name: string;
  description: string;
  type: 'seasonal' | 'random' | 'special' | 'maintenance';
  startTime: number;
  endTime: number;
  isActive: boolean;
  modifiers: {
    growthSpeedMultiplier?: number;
    yieldMultiplier?: number;
    mutationChanceMultiplier?: number;
    costReductionMultiplier?: number;
    specialRewards?: boolean;
    doubleXp?: boolean;
  };
  rewards?: {
    mr?: number;
    items?: { [key: string]: number };
    specialPlants?: string[];
  };
  icon: React.ComponentType<any>;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface ServerModifier {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'plant_specific' | 'player_specific';
  target?: string; // plant type or player id
  modifiers: {
    growthSpeedMultiplier?: number;
    yieldMultiplier?: number;
    mutationChanceMultiplier?: number;
    costReductionMultiplier?: number;
    specialEffects?: string[];
  };
  startTime: number;
  endTime: number;
  isActive: boolean;
  priority: number; // Higher priority overrides lower
}

interface AssetConfig {
  label: string;
  baseCost: number; // Cost to plant/buy
  baseYield: number; // For MR/items directly
  harvestItemType?: 'gold' | 'crypto_tokens' | 'crystal' | 'gem' | 'mushroom' | 'honey' | 'diamond' | 'platinum' | 'emerald' | 'ruby' | 'sapphire'; // What item it harvests (if any)
  harvestValue: number; // Value of 1 unit of harvested item (if harvestable)
  growthTimeMs: number; // Time to grow to next level or yield
  maxLevel: number;
  icon: React.ElementType; // Material-UI Icon
  color: string;
  description: string;
  onPlantMessage: string;
  isPassiveIncome?: boolean; // If true, income is directly added, not "harvested" by click
  isPermanentBonus?: boolean; // If true, no growth progress, just provides a permanent bonus/effect
}

const ASSET_CONFIGS: { [key in GameAsset['type']]: AssetConfig } = {
  mr_tree: {
    label: 'Денежное дерево',
    baseCost: 500,
    baseYield: 50, // Yields MR directly to inventory
    harvestItemType: undefined, // MR goes directly to inGameMR (not inventory item for sale)
    harvestValue: 1, // 1 MR = 1 MR
    growthTimeMs: 15000, // Grows every 15 seconds
    maxLevel: 3,
    icon: MoneyIcon,
    color: '#4CAF50',
    description: 'Пассивно генерирует МР, готовые к сбору.',
    onPlantMessage: 'Вы посадили денежное дерево, оно начнет приносить плоды вскоре!',
    isPassiveIncome: false, // Player clicks to harvest
    isPermanentBonus: false,
  },
  card_plant: {
    label: 'Карточная поросль',
    baseCost: 1000,
    baseYield: 150, // Yields MR directly to inventory
    harvestItemType: undefined, // MR goes directly to inGameMR (not inventory item for sale)
    harvestValue: 1, // 1 MR = 1 MR
    growthTimeMs: 30000,
    maxLevel: 2,
    icon: CreditCard,
    color: '#2196F3',
    description: 'Растет в более полезные финансовые инструменты. Можно собрать урожай или улучшить.',
    onPlantMessage: 'Вы посадили карточную поросль, она вырастет в полезную карту!',
    isPassiveIncome: false,
    isPermanentBonus: false, // Now harvestable like other crops
  },
  investment_flower: {
    label: 'Инвестиционный цветок',
    baseCost: 2000,
    baseYield: 50, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1, // Placeholder, as it's passive MR
    growthTimeMs: 60000,
    maxLevel: 1,
    icon: ShowChart,
    color: '#FFC107',
    description: 'Инвестиции приносят проценты от вашего игрового баланса.',
    onPlantMessage: 'Вы посадили инвестиционный цветок, он будет цвести прибылью!',
    isPassiveIncome: true, // Income is automatically added
    isPermanentBonus: false,
  },
  vault_strongbox: {
    label: 'Сейф Хранилища',
    baseCost: 3000,
    baseYield: 0,
    harvestItemType: undefined,
    harvestValue: 0,
    growthTimeMs: 0, // No growth, instant effect
    maxLevel: 1,
    icon: VaultIcon,
    color: '#607D8B',
    description: 'Увеличивает объем вашего хранилища.',
    onPlantMessage: 'Вы установили сейф хранилища, теперь ваши средства в безопасности!',
    isPassiveIncome: false,
    isPermanentBonus: true, // Gives an instant/permanent bonus
  },
  gold_mine: {
    label: 'Золотая шахта',
    baseCost: 4000,
    baseYield: 1, // Yields 1 unit of 'gold'
    harvestItemType: 'gold',
    harvestValue: 200, // Each unit of gold sells for 200 MR
    growthTimeMs: 45000,
    maxLevel: 2,
    icon: GemIcon,
    color: '#FFD700',
    description: 'Добывает драгоценное золото, которое можно продать.',
    onPlantMessage: 'Вы открыли золотую шахту, ждите первой добычи!',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  crypto_farm: {
    label: 'Криптоферма',
    baseCost: 6000,
    baseYield: 10, // Yields 10 units of 'crypto_tokens'
    harvestItemType: 'crypto_tokens',
    harvestValue: 10, // Each token sells for 10 MR
    growthTimeMs: 20000,
    maxLevel: 2,
    icon: CloudIcon,
    color: '#00BCD4',
    description: 'Генерирует криптотокены, которые можно обменять на МР.',
    onPlantMessage: 'Вы запустили криптоферму, токены начнут поступать!',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  bank_branch: {
    label: 'Филиал банка',
    baseCost: 8000,
    baseYield: 200, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 60000,
    maxLevel: 3,
    icon: BankNoteIcon,
    color: '#A1887F',
    description: 'Пассивный доход от банковских операций, зачисляется автоматически.',
    onPlantMessage: 'Вы открыли филиал банка, стабильный доход обеспечен!',
    isPassiveIncome: true,
    isPermanentBonus: false,
  },
  digital_vault: {
    label: 'Цифровое хранилище',
    baseCost: 10000,
    baseYield: 100, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 60000,
    maxLevel: 2,
    icon: StorageIcon,
    color: '#424242',
    description: 'Увеличивает безопасность и дает небольшой пассивный доход.',
    onPlantMessage: 'Ваши средства теперь в цифровом хранилище, и работают на вас!',
    isPassiveIncome: true,
    isPermanentBonus: false,
  },
  // --- CHEAP PLANTS FOR EARLY GAME ---
  coin_flower: {
    label: 'Монетный цветок',
    baseCost: 200,
    baseYield: 30, // Yields 30 MR
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 10000, // 10 seconds - very fast
    maxLevel: 3,
    icon: MoneyIcon,
    color: '#FFC107',
    description: 'Быстрорастущий цветок, приносящий монеты. Идеален для начинающих!',
    onPlantMessage: 'Вы посадили монетный цветок, он быстро принесет первые монеты!',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  penny_plant: {
    label: 'Копеечное растение',
    baseCost: 100,
    baseYield: 15, // Yields 15 MR
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 8000, // 8 seconds - fastest
    maxLevel: 2,
    icon: MoneyIcon,
    color: '#8BC34A',
    description: 'Самое дешевое растение! Быстро растет и дает небольшую прибыль.',
    onPlantMessage: 'Вы посадили копеечное растение - отличный старт!',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  dollar_bush: {
    label: 'Долларовый куст',
    baseCost: 300,
    baseYield: 50, // Yields 50 MR
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 12000, // 12 seconds
    maxLevel: 2,
    icon: MoneyIcon,
    color: '#4CAF50',
    description: 'Надежный куст, дающий стабильный доход. Хорошее соотношение цена/качество.',
    onPlantMessage: 'Вы посадили долларовый куст, он принесет стабильный доход!',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  treasure_sprout: {
    label: 'Сокровищный росток',
    baseCost: 150,
    baseYield: 25, // Yields 25 MR
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 9000, // 9 seconds
    maxLevel: 2,
    icon: GemIcon,
    color: '#E91E63',
    description: 'Магический росток, который может принести неожиданные сокровища!',
    onPlantMessage: 'Вы посадили сокровищный росток, ждите магических результатов!',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  micro_plant: {
    label: 'Микро-растение',
    baseCost: 50,
    baseYield: 8, // Yields 8 MR
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 5000, // 5 seconds - very fast
    maxLevel: 2,
    icon: MicroPlantIcon,
    color: '#9C27B0',
    description: 'Крошечное растение, которое быстро растет и дает небольшой доход. Идеально для начинающих!',
    onPlantMessage: 'Вы посадили микро-растение, оно быстро принесет первые монеты!',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  // --- EQUIPMENT ---
  sprinkler: {
    label: 'Разбрызгиватель',
    baseCost: 500,
    baseYield: 0, // No direct yield
    harvestItemType: undefined,
    harvestValue: 0,
    growthTimeMs: 0, // Instant effect
    maxLevel: 3,
    icon: SprinklerIcon,
    color: '#2196F3',
    description: 'Ускоряет рост растений в радиусе 1 клетки. Можно улучшать для большего радиуса.',
    onPlantMessage: 'Вы установили разбрызгиватель! Растения вокруг будут расти быстрее.',
    isPassiveIncome: false,
    isPermanentBonus: true, // Equipment that provides area effect
  },
  // --- NEW COOL PLANTS ---
  quantum_flower: {
    label: 'Квантовый цветок',
    baseCost: 15000,
    baseYield: 300, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 30000, // 30 seconds
    maxLevel: 1,
    icon: SparkleIcon,
    color: '#9C27B0',
    description: 'Магический цветок, который генерирует доход на основе общего количества МР в игре.',
    onPlantMessage: 'Вы посадили квантовый цветок! Он будет расти вместе с вашим богатством.',
    isPassiveIncome: true,
    isPermanentBonus: false,
  },
  crystal_tree: {
    label: 'Кристальное дерево',
    baseCost: 8000,
    baseYield: 1, // Yields 1 unit of 'crystal'
    harvestItemType: 'crystal',
    harvestValue: 500, // Each crystal sells for 500 MR
    growthTimeMs: 60000, // 1 minute
    maxLevel: 3,
    icon: DiamondIcon,
    color: '#00BCD4',
    description: 'Дерево, которое выращивает драгоценные кристаллы. Очень ценные!',
    onPlantMessage: 'Вы посадили кристальное дерево! Оно будет выращивать драгоценные кристаллы.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  time_vine: {
    label: 'Временная лоза',
    baseCost: 12000,
    baseYield: 200, // Yields MR directly
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 45000, // 45 seconds
    maxLevel: 2,
    icon: CalendarIcon,
    color: '#FF5722',
    description: 'Лоза, которая ускоряет время для всех растений в радиусе 2 клеток.',
    onPlantMessage: 'Вы посадили временную лозу! Она ускорит рост соседних растений.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  energy_well: {
    label: 'Энергетический колодец',
    baseCost: 20000,
    baseYield: 0, // No direct yield
    harvestItemType: undefined,
    harvestValue: 0,
    growthTimeMs: 0, // Instant effect
    maxLevel: 1,
    icon: FlashIcon,
    color: '#FFC107',
    description: 'Колодец, который дает всем растениям шанс получить мутацию при каждом цикле роста.',
    onPlantMessage: 'Вы установили энергетический колодец! Растения будут чаще мутировать.',
    isPassiveIncome: false,
    isPermanentBonus: true,
  },
  // --- MORE NEW PLANTS ---
  gem_plant: {
    label: 'Драгоценный куст',
    baseCost: 12000,
    baseYield: 1, // Yields 1 unit of 'gem'
    harvestItemType: 'gem',
    harvestValue: 800, // Each gem sells for 800 MR
    growthTimeMs: 90000, // 1.5 minutes
    maxLevel: 3,
    icon: DiamondIcon,
    color: '#E91E63',
    description: 'Куст, который выращивает драгоценные камни. Очень редкие и ценные!',
    onPlantMessage: 'Вы посадили драгоценный куст! Он будет выращивать редкие камни.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  solar_panel: {
    label: 'Солнечная панель',
    baseCost: 15000,
    baseYield: 250, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 45000, // 45 seconds
    maxLevel: 2,
    icon: SunnyIcon,
    color: '#FF9800',
    description: 'Солнечная панель генерирует энергию и доход на основе времени суток.',
    onPlantMessage: 'Вы установили солнечную панель! Она будет генерировать чистую энергию.',
    isPassiveIncome: true,
    isPermanentBonus: false,
  },
  wind_turbine: {
    label: 'Ветряная турбина',
    baseCost: 18000,
    baseYield: 180, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 60000, // 1 minute
    maxLevel: 2,
    icon: CloudIcon,
    color: '#607D8B',
    description: 'Ветряная турбина генерирует энергию и небольшой пассивный доход.',
    onPlantMessage: 'Вы установили ветряную турбину! Она будет генерировать ветровую энергию.',
    isPassiveIncome: true,
    isPermanentBonus: false,
  },
  mushroom_farm: {
    label: 'Грибная ферма',
    baseCost: 8000,
    baseYield: 5, // Yields 5 units of 'mushroom'
    harvestItemType: 'mushroom',
    harvestValue: 50, // Each mushroom sells for 50 MR
    growthTimeMs: 30000, // 30 seconds
    maxLevel: 4,
    icon: MicroPlantIcon,
    color: '#8BC34A',
    description: 'Ферма, которая выращивает магические грибы. Быстро растет и дает стабильный доход.',
    onPlantMessage: 'Вы посадили грибную ферму! Она будет выращивать магические грибы.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  honey_beehive: {
    label: 'Пчелиный улей',
    baseCost: 10000,
    baseYield: 3, // Yields 3 units of 'honey'
    harvestItemType: 'honey',
    harvestValue: 100, // Each honey sells for 100 MR
    growthTimeMs: 40000, // 40 seconds
    maxLevel: 3,
    icon: MicroPlantIcon,
    color: '#FFC107',
    description: 'Пчелиный улей производит мед и ускоряет рост соседних растений.',
    onPlantMessage: 'Вы установили пчелиный улей! Пчелы будут производить мед и помогать растениям.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  magic_crystal: {
    label: 'Магический кристалл',
    baseCost: 25000,
    baseYield: 0, // No direct yield
    harvestItemType: undefined,
    harvestValue: 0,
    growthTimeMs: 0, // Instant effect
    maxLevel: 1,
    icon: DiamondIcon,
    color: '#9C27B0',
    description: 'Магический кристалл увеличивает шанс мутаций и дает бонусы к урожаю всех растений.',
    onPlantMessage: 'Вы установили магический кристалл! Он будет усиливать магию в саду.',
    isPassiveIncome: false,
    isPermanentBonus: true,
  },
  rainbow_flower: {
    label: 'Радужный цветок',
    baseCost: 30000,
    baseYield: 500, // Yields MR directly
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 120000, // 2 minutes
    maxLevel: 1,
    icon: PaletteIcon,
    color: '#E91E63',
    description: 'Легендарный цветок, который дает огромный урожай и может эволюционировать в любое растение.',
    onPlantMessage: 'Вы посадили радужный цветок! Это легендарное растение принесет удачу.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  // --- NEW PREMIUM PLANTS ---
  diamond_mine: {
    label: 'Алмазная шахта',
    baseCost: 50000,
    baseYield: 1, // Yields 1 unit of 'diamond'
    harvestItemType: 'diamond',
    harvestValue: 2000, // Each diamond sells for 2000 MR
    growthTimeMs: 300000, // 5 minutes
    maxLevel: 3,
    icon: DiamondIcon,
    color: '#B0BEC5',
    description: 'Эксклюзивная шахта, добывающая редкие алмазы. Очень ценные!',
    onPlantMessage: 'Вы открыли алмазную шахту! Она будет добывать драгоценные алмазы.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  platinum_rose: {
    label: 'Платиновая роза',
    baseCost: 25000,
    baseYield: 1, // Yields 1 unit of 'platinum'
    harvestItemType: 'platinum',
    harvestValue: 1500, // Each platinum sells for 1500 MR
    growthTimeMs: 180000, // 3 minutes
    maxLevel: 2,
    icon: AuroraIcon,
    color: '#E0E0E0',
    description: 'Редкая роза из платины, которая ценится коллекционерами.',
    onPlantMessage: 'Вы посадили платиновую розу! Она будет цвести драгоценным металлом.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  emerald_vine: {
    label: 'Изумрудная лоза',
    baseCost: 35000,
    baseYield: 1, // Yields 1 unit of 'emerald'
    harvestItemType: 'emerald',
    harvestValue: 1200, // Each emerald sells for 1200 MR
    growthTimeMs: 240000, // 4 minutes
    maxLevel: 2,
    icon: GemIcon,
    color: '#4CAF50',
    description: 'Магическая лоза, выращивающая изумруды. Очень красивая!',
    onPlantMessage: 'Вы посадили изумрудную лозу! Она будет расти драгоценными камнями.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  ruby_cactus: {
    label: 'Рубиновый кактус',
    baseCost: 40000,
    baseYield: 1, // Yields 1 unit of 'ruby'
    harvestItemType: 'ruby',
    harvestValue: 1800, // Each ruby sells for 1800 MR
    growthTimeMs: 200000, // 3.33 minutes
    maxLevel: 2,
    icon: GemIcon,
    color: '#F44336',
    description: 'Колючий кактус, который выращивает рубины. Осторожно с шипами!',
    onPlantMessage: 'Вы посадили рубиновый кактус! Он будет выращивать красные драгоценности.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  sapphire_lily: {
    label: 'Сапфировая лилия',
    baseCost: 30000,
    baseYield: 1, // Yields 1 unit of 'sapphire'
    harvestItemType: 'sapphire',
    harvestValue: 1600, // Each sapphire sells for 1600 MR
    growthTimeMs: 220000, // 3.67 minutes
    maxLevel: 2,
    icon: GemIcon,
    color: '#2196F3',
    description: 'Элегантная лилия, которая цветет сапфирами. Очень изысканная!',
    onPlantMessage: 'Вы посадили сапфировую лилию! Она будет цвести синими драгоценностями.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  mystic_orchid: {
    label: 'Мистическая орхидея',
    baseCost: 60000,
    baseYield: 800, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 600000, // 10 minutes
    maxLevel: 1,
    icon: SparkleIcon,
    color: '#9C27B0',
    description: 'Магическая орхидея, которая генерирует доход на основе общего богатства.',
    onPlantMessage: 'Вы посадили мистическую орхидею! Она будет расти вместе с вашим богатством.',
    isPassiveIncome: true,
    isPermanentBonus: false,
  },
  cosmic_fern: {
    label: 'Космический папоротник',
    baseCost: 45000,
    baseYield: 300, // Yields MR directly
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 150000, // 2.5 minutes
    maxLevel: 3,
    icon: AuroraIcon,
    color: '#673AB7',
    description: 'Папоротник из космоса, который приносит звездную энергию.',
    onPlantMessage: 'Вы посадили космический папоротник! Он будет светиться звездной энергией.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
  stellar_bamboo: {
    label: 'Звездный бамбук',
    baseCost: 55000,
    baseYield: 0, // No direct yield
    harvestItemType: undefined,
    harvestValue: 0,
    growthTimeMs: 0, // Instant effect
    maxLevel: 1,
    icon: HeightIcon,
    color: '#4CAF50',
    description: 'Бамбук, который ускоряет рост всех растений в радиусе 3 клеток.',
    onPlantMessage: 'Вы посадили звездный бамбук! Он ускорит рост соседних растений.',
    isPassiveIncome: false,
    isPermanentBonus: true,
  },
  lunar_lotus: {
    label: 'Лунный лотос',
    baseCost: 40000,
    baseYield: 600, // Fixed amount per cycle instead of percentage
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 480000, // 8 minutes
    maxLevel: 1,
    icon: AuroraIcon,
    color: '#E1BEE7',
    description: 'Лотос, который цветет под лунным светом и приносит мистический доход.',
    onPlantMessage: 'Вы посадили лунный лотос! Он будет цвести в лунном свете.',
    isPassiveIncome: true,
    isPermanentBonus: false,
  },
  solar_palm: {
    label: 'Солнечная пальма',
    baseCost: 35000,
    baseYield: 250, // Yields MR directly
    harvestItemType: undefined,
    harvestValue: 1,
    growthTimeMs: 120000, // 2 minutes
    maxLevel: 2,
    icon: SunnyIcon,
    color: '#FFC107',
    description: 'Пальма, которая поглощает солнечную энергию и превращает ее в МР.',
    onPlantMessage: 'Вы посадили солнечную пальму! Она будет поглощать солнечную энергию.',
    isPassiveIncome: false,
    isPermanentBonus: false,
  },
};

// --- PLANT MUTATIONS ---
const PLANT_MUTATIONS: PlantMutation[] = [
  {
    id: 'golden',
    type: 'golden',
    name: 'Золотая мутация',
    description: 'Растение светится золотым светом и дает больше урожая!',
    effect: {
      yieldMultiplier: 2.0,
      color: '#FFD700',
    },
    rarity: 'uncommon',
    icon: AuroraIcon,
  },
  {
    id: 'speedy',
    type: 'speedy',
    name: 'Скоростная мутация',
    description: 'Растение растет в 2 раза быстрее обычного!',
    effect: {
      growthSpeedMultiplier: 2.0,
      color: '#FF6B35',
    },
    rarity: 'common',
    icon: FlashIcon,
  },
  {
    id: 'fertile',
    type: 'fertile',
    name: 'Плодородная мутация',
    description: 'Растение дает на 50% больше урожая и растет быстрее!',
    effect: {
      yieldMultiplier: 1.5,
      growthSpeedMultiplier: 1.3,
      color: '#4CAF50',
    },
    rarity: 'rare',
    icon: EcoIcon,
  },
  {
    id: 'lucky',
    type: 'lucky',
    name: 'Удачливая мутация',
    description: 'Растение имеет шанс дать бонусные награды при сборе!',
    effect: {
      luckBonus: 0.25, // 25% chance for bonus
      color: '#9C27B0',
    },
    rarity: 'rare',
    icon: CasinoIcon,
  },
  {
    id: 'giant',
    type: 'giant',
    name: 'Гигантская мутация',
    description: 'Растение вырастает огромным и дает в 3 раза больше урожая!',
    effect: {
      yieldMultiplier: 3.0,
      color: '#8BC34A',
    },
    rarity: 'epic',
    icon: HeightIcon,
  },
  {
    id: 'rainbow',
    type: 'rainbow',
    name: 'Радужная мутация',
    description: 'Легендарная мутация! Растение дает в 5 раз больше урожая и растет в 2 раза быстрее!',
    effect: {
      yieldMultiplier: 5.0,
      growthSpeedMultiplier: 2.0,
      color: '#E91E63',
    },
    rarity: 'legendary',
    icon: PaletteIcon,
  },
];

// Mutation chance based on rarity
const MUTATION_CHANCES = {
  common: 0.15,    // 15% chance
  uncommon: 0.08,  // 8% chance
  rare: 0.04,      // 4% chance
  epic: 0.02,      // 2% chance
  legendary: 0.005, // 0.5% chance
};

// --- ACHIEVEMENTS SYSTEM ---
const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_harvest',
    name: 'Первый урожай',
    description: 'Соберите свой первый урожай',
    icon: SeedIcon,
    reward: { type: 'mr', amount: 100 },
    condition: { type: 'harvest_count', target: 1 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'harvest_master',
    name: 'Мастер сбора',
    description: 'Соберите 50 урожаев',
    icon: TrophyIcon,
    reward: { type: 'mutation_chance', amount: 0.1 },
    condition: { type: 'harvest_count', target: 50 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'millionaire',
    name: 'Миллионер',
    description: 'Заработайте 10,000 MR',
    icon: DiamondIcon,
    reward: { type: 'mr', amount: 1000 },
    condition: { type: 'total_earned', target: 10000 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'mutation_hunter',
    name: 'Охотник за мутациями',
    description: 'Получите 10 мутаций',
    icon: BrainIcon,
    reward: { type: 'mutation_chance', amount: 0.2 },
    condition: { type: 'mutations_gained', target: 10 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'garden_expansion',
    name: 'Расширение сада',
    description: 'Посадите 20 растений',
    icon: TrendingUpIcon,
    reward: { type: 'sprinkler_discount', amount: 0.3 },
    condition: { type: 'plants_planted', target: 20 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'daily_farmer',
    name: 'Ежедневный фермер',
    description: 'Играйте 3 дня подряд',
    icon: CalendarIcon,
    reward: { type: 'special_seed', amount: 1 },
    condition: { type: 'consecutive_days', target: 3 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'legendary_collector',
    name: 'Коллекционер легенд',
    description: 'Получите легендарную мутацию',
    icon: SparkleIcon,
    reward: { type: 'mr', amount: 5000 },
    condition: { type: 'mutations_gained', target: 1 }, // Special condition for legendary
    unlocked: false,
    progress: 0,
  },
  {
    id: 'millionaire_plus',
    name: 'Миллионер+',
    description: 'Накопите 1,000,000 МР',
    icon: AttachMoneyIcon,
    reward: { type: 'special_plant', amount: 1, plantType: 'diamond_mine' },
    condition: { type: 'total_earned', target: 1000000 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'mutation_master',
    name: 'Мастер мутаций',
    description: 'Получите 25 мутаций',
    icon: ScienceIcon,
    reward: { type: 'mutation_chance', amount: 0.2 },
    condition: { type: 'mutations_gained', target: 25 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'garden_expansionist',
    name: 'Расширитель сада',
    description: 'Купите все модификаторы расширения',
    icon: ExpandIcon,
    reward: { type: 'mr', amount: 5000 },
    condition: { type: 'modifiers_purchased', target: 3 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'premium_collector',
    name: 'Коллекционер премиум',
    description: 'Посадите все премиум растения',
    icon: DiamondIcon,
    reward: { type: 'special_plant', amount: 1, plantType: 'rainbow_flower' },
    condition: { type: 'premium_plants', target: 10 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'speed_demon',
    name: 'Скоростной демон',
    description: 'Соберите 100 урожаев за один день',
    icon: SpeedIcon,
    reward: { type: 'growth_speed', amount: 0.5 },
    condition: { type: 'daily_harvests', target: 100 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'lucky_streak',
    name: 'Счастливая полоса',
    description: 'Получите 5 мутаций подряд',
    icon: CasinoIcon,
    reward: { type: 'mutation_chance', amount: 0.3 },
    condition: { type: 'consecutive_mutations', target: 5 },
    unlocked: false,
    progress: 0,
  },
  {
    id: 'master_gardener',
    name: 'Мастер-садовод',
    description: 'Достигните 50 уровня в любом растении',
    icon: EmojiEventsIcon,
    reward: { type: 'mr', amount: 10000 },
    condition: { type: 'max_plant_level', target: 50 },
    unlocked: false,
    progress: 0,
  },
];

// --- GARDEN MODIFIERS ---
const GARDEN_MODIFIERS: GardenModifier[] = [
  {
    id: 'garden_expansion',
    name: 'Расширение сада',
    description: 'Увеличивает размер сада на 1x1 клетку',
    cost: 25000, // Expensive but not crazy
    icon: ExpandIcon,
    effect: {
      type: 'garden_size',
      amount: 1, // Adds 1 to grid size
    },
    maxLevel: 2, // Can expand garden up to 6x6
    purchased: false,
    level: 0,
  },
  {
    id: 'mutation_lab',
    name: 'Лаборатория мутаций',
    description: 'Увеличивает шанс мутаций на 100%',
    cost: 50000, // Very expensive
    icon: MutationIcon,
    effect: {
      type: 'mutation_chance',
      amount: 0.01, // Doubles mutation chance (0.001 -> 0.002)
    },
    maxLevel: 3, // Can stack up to 3x mutation chance
    purchased: false,
    level: 0,
  },
  {
    id: 'yield_booster',
    name: 'Усилитель урожая',
    description: 'Увеличивает урожай всех растений на 25%',
    cost: 30000,
    icon: TrendingUpIcon,
    effect: {
      type: 'yield_multiplier',
      amount: 0.25,
    },
    maxLevel: 4,
    purchased: false,
    level: 0,
  },
  {
    id: 'growth_accelerator',
    name: 'Ускоритель роста',
    description: 'Ускоряет рост всех растений на 20%',
    cost: 40000,
    icon: SpeedIcon,
    effect: {
      type: 'growth_speed',
      amount: 0.2,
    },
    maxLevel: 3,
    purchased: false,
    level: 0,
  },
  {
    id: 'premium_greenhouse',
    name: 'Премиум теплица',
    description: 'Увеличивает эффективность премиум растений на 50%',
    cost: 75000,
    icon: DiamondIcon,
    effect: {
      type: 'premium_boost',
      amount: 0.5,
    },
    maxLevel: 2,
    purchased: false,
    level: 0,
  },
  {
    id: 'lucky_charm',
    name: 'Талисман удачи',
    description: 'Увеличивает шанс получения редких мутаций',
    cost: 60000,
    icon: CasinoIcon,
    effect: {
      type: 'rare_mutation_chance',
      amount: 0.005,
    },
    maxLevel: 2,
    purchased: false,
    level: 0,
  },
  {
    id: 'master_gardener_tools',
    name: 'Инструменты мастера',
    description: 'Увеличивает максимальный уровень растений на 10',
    cost: 100000,
    icon: BuildIcon,
    effect: {
      type: 'max_level_boost',
      amount: 10,
    },
    maxLevel: 1,
    purchased: false,
    level: 0,
  },
];

// --- WEATHER EFFECTS ---
const WEATHER_EFFECTS: WeatherEffect[] = [
  {
    id: 'sunny',
    name: 'Солнечная погода',
    description: 'Яркое солнце ускоряет рост всех растений!',
    icon: SunnyIcon,
    color: '#FFC107',
    effect: {
      growthSpeedMultiplier: 1.5,
      yieldMultiplier: 1.2,
      mutationChanceBonus: 0.001,
    },
    duration: 10, // 10 minutes
    active: false,
    endTime: 0,
  },
  {
    id: 'rain',
    name: 'Дождливая погода',
    description: 'Дождь питает растения и увеличивает шанс мутаций!',
    icon: CloudIcon,
    color: '#2196F3',
    effect: {
      growthSpeedMultiplier: 1.3,
      yieldMultiplier: 1.1,
      mutationChanceBonus: 0.002,
    },
    duration: 15, // 15 minutes
    active: false,
    endTime: 0,
  },
  {
    id: 'storm',
    name: 'Гроза',
    description: 'Гроза дает мощный импульс энергии растениям!',
    icon: StormIcon,
    color: '#9C27B0',
    effect: {
      growthSpeedMultiplier: 2.0,
      yieldMultiplier: 1.5,
      mutationChanceBonus: 0.005,
    },
    duration: 5, // 5 minutes
    active: false,
    endTime: 0,
  },
  {
    id: 'snow',
    name: 'Снегопад',
    description: 'Снег замедляет рост, но увеличивает качество урожая!',
    icon: SnowIcon,
    color: '#E3F2FD',
    effect: {
      growthSpeedMultiplier: 0.7,
      yieldMultiplier: 1.8,
      mutationChanceBonus: 0.003,
    },
    duration: 20, // 20 minutes
    active: false,
    endTime: 0,
  },
  {
    id: 'heat_wave',
    name: 'Жара',
    description: 'Жара ускоряет рост, но может повредить растения!',
    icon: HeatIcon,
    color: '#FF5722',
    effect: {
      growthSpeedMultiplier: 1.8,
      yieldMultiplier: 0.9,
      mutationChanceBonus: 0.001,
    },
    duration: 8, // 8 minutes
    active: false,
    endTime: 0,
  },
  {
    id: 'fog',
    name: 'Туман',
    description: 'Туман замедляет рост, но увеличивает шанс редких мутаций!',
    icon: CloudIcon,
    color: '#9E9E9E',
    effect: {
      growthSpeedMultiplier: 0.7,
      yieldMultiplier: 1.0,
      mutationChanceBonus: 0.008,
    },
    duration: 25, // 25 minutes
    active: false,
    endTime: 0,
  },
  {
    id: 'wind',
    name: 'Ветреная погода',
    description: 'Ветер разносит семена и увеличивает разнообразие растений!',
    icon: AirIcon,
    color: '#00BCD4',
    effect: {
      growthSpeedMultiplier: 1.1,
      yieldMultiplier: 1.3,
      mutationChanceBonus: 0.004,
    },
    duration: 12, // 12 minutes
    active: false,
    endTime: 0,
  },
  {
    id: 'aurora',
    name: 'Северное сияние',
    description: 'Магическое сияние дает растениям особую энергию!',
    icon: AuroraIcon,
    color: '#E91E63',
    effect: {
      growthSpeedMultiplier: 2.5,
      yieldMultiplier: 2.0,
      mutationChanceBonus: 0.01,
    },
    duration: 3, // 3 minutes - very rare and short
    active: false,
    endTime: 0,
  },
  {
    id: 'drought',
    name: 'Засуха',
    description: 'Засуха замедляет рост, но растения становятся более выносливыми!',
    icon: DroughtIcon,
    color: '#FF9800',
    effect: {
      growthSpeedMultiplier: 0.5,
      yieldMultiplier: 1.5,
      mutationChanceBonus: 0.002,
    },
    duration: 30, // 30 minutes
    active: false,
    endTime: 0,
  },
];

// --- SEASONAL EVENTS ---
const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'spring_festival',
    name: 'Весенний фестиваль',
    description: 'Весна приносит новые возможности! Все растения растут быстрее и дают больше урожая.',
    icon: SpringIcon,
    color: '#4CAF50',
    effect: {
      growthSpeedMultiplier: 1.3,
      yieldMultiplier: 1.4,
      mutationChanceBonus: 0.003,
      specialPlantChance: 0.1,
    },
    duration: 24, // 24 hours
    active: false,
    endTime: 0,
    specialPlants: ['quantum_flower', 'crystal_tree'],
  },
  {
    id: 'summer_harvest',
    name: 'Летний урожай',
    description: 'Лето - время изобилия! Урожайность всех растений значительно повышена.',
    icon: SummerIcon,
    color: '#FF9800',
    effect: {
      growthSpeedMultiplier: 1.1,
      yieldMultiplier: 2.0,
      mutationChanceBonus: 0.002,
      specialPlantChance: 0.05,
    },
    duration: 48, // 48 hours
    active: false,
    endTime: 0,
    specialPlants: ['time_vine', 'energy_well'],
  },
  {
    id: 'autumn_mutations',
    name: 'Осенние мутации',
    description: 'Осень приносит странные изменения! Шанс мутаций значительно увеличен.',
    icon: HalloweenIcon,
    color: '#FF5722',
    effect: {
      growthSpeedMultiplier: 0.9,
      yieldMultiplier: 1.2,
      mutationChanceBonus: 0.01,
      specialPlantChance: 0.15,
    },
    duration: 36, // 36 hours
    active: false,
    endTime: 0,
    specialPlants: ['quantum_flower', 'crystal_tree', 'time_vine'],
  },
  {
    id: 'winter_wonderland',
    name: 'Зимняя сказка',
    description: 'Зима замедляет рост, но приносит редкие и ценные растения.',
    icon: WinterIcon,
    color: '#E3F2FD',
    effect: {
      growthSpeedMultiplier: 0.7,
      yieldMultiplier: 1.8,
      mutationChanceBonus: 0.005,
      specialPlantChance: 0.2,
    },
    duration: 72, // 72 hours
    active: false,
    endTime: 0,
    specialPlants: ['energy_well', 'quantum_flower'],
  },
  {
    id: 'birthday_celebration',
    name: 'День рождения сада',
    description: 'Особый день! Все растения получают бонусы и шанс на редкие мутации.',
    icon: BirthdayIcon,
    color: '#E91E63',
    effect: {
      growthSpeedMultiplier: 1.5,
      yieldMultiplier: 1.5,
      mutationChanceBonus: 0.008,
      specialPlantChance: 0.25,
    },
    duration: 12, // 12 hours
    active: false,
    endTime: 0,
    specialPlants: ['quantum_flower', 'crystal_tree', 'time_vine', 'energy_well'],
  },
  {
    id: 'moonlight_magic',
    name: 'Лунная магия',
    description: 'Лунный свет приносит мистические силы! Растения растут медленнее, но дают больше мутаций.',
    icon: AuroraIcon,
    color: '#9C27B0',
    effect: {
      growthSpeedMultiplier: 0.8,
      yieldMultiplier: 1.3,
      mutationChanceBonus: 0.015,
      specialPlantChance: 0.3,
    },
    duration: 18, // 18 hours
    active: false,
    endTime: 0,
    specialPlants: ['quantum_flower', 'crystal_tree', 'time_vine'],
  },
  {
    id: 'golden_hour',
    name: 'Золотой час',
    description: 'Время максимальной эффективности! Все растения работают на полную мощность.',
    icon: SunnyIcon,
    color: '#FFD700',
    effect: {
      growthSpeedMultiplier: 2.5,
      yieldMultiplier: 2.0,
      mutationChanceBonus: 0.005,
      specialPlantChance: 0.1,
    },
    duration: 2, // 2 hours - very short but powerful
    active: false,
    endTime: 0,
    specialPlants: ['mr_tree', 'gold_mine', 'crystal_tree'],
  },
  {
    id: 'crypto_crash',
    name: 'Крипто-крах',
    description: 'Криптовалюты упали! Крипто-растения дают меньше, но другие растения получают бонус.',
    icon: CloudIcon,
    color: '#FF5722',
    effect: {
      growthSpeedMultiplier: 1.2,
      yieldMultiplier: 0.5, // Crypto plants get reduced yield
      mutationChanceBonus: 0.01,
      specialPlantChance: 0.2,
    },
    duration: 24, // 24 hours
    active: false,
    endTime: 0,
    specialPlants: ['mr_tree', 'gold_mine', 'treasure_sprout'],
  },
  {
    id: 'market_boom',
    name: 'Рыночный бум',
    description: 'Рынок растет! Все растения дают больше урожая и растут быстрее.',
    icon: TrendingUpIcon,
    color: '#4CAF50',
    effect: {
      growthSpeedMultiplier: 1.4,
      yieldMultiplier: 1.6,
      mutationChanceBonus: 0.003,
      specialPlantChance: 0.15,
    },
    duration: 36, // 36 hours
    active: false,
    endTime: 0,
    specialPlants: ['investment_flower', 'bank_branch', 'digital_vault'],
  },
  {
    id: 'mystical_rain',
    name: 'Мистический дождь',
    description: 'Магический дождь приносит необычные мутации и редкие растения!',
    icon: CloudIcon,
    color: '#673AB7',
    effect: {
      growthSpeedMultiplier: 1.1,
      yieldMultiplier: 1.2,
      mutationChanceBonus: 0.02,
      specialPlantChance: 0.4,
    },
    duration: 8, // 8 hours
    active: false,
    endTime: 0,
    specialPlants: ['quantum_flower', 'crystal_tree', 'time_vine', 'energy_well'],
  },
  {
    id: 'economic_crisis',
    name: 'Экономический кризис',
    description: 'Трудные времена! Растения растут медленнее, но дают больше ценных ресурсов.',
    icon: TrendingUpIcon,
    color: '#795548',
    effect: {
      growthSpeedMultiplier: 0.6,
      yieldMultiplier: 2.5,
      mutationChanceBonus: 0.008,
      specialPlantChance: 0.35,
    },
    duration: 48, // 48 hours
    active: false,
    endTime: 0,
    specialPlants: ['gold_mine', 'crystal_tree', 'treasure_sprout'],
  },
  {
    id: 'digital_revolution',
    name: 'Цифровая революция',
    description: 'Цифровые технологии развиваются! Крипто и цифровые растения получают огромные бонусы.',
    icon: CloudIcon,
    color: '#00BCD4',
    effect: {
      growthSpeedMultiplier: 1.8,
      yieldMultiplier: 3.0, // For crypto and digital plants
      mutationChanceBonus: 0.012,
      specialPlantChance: 0.25,
    },
    duration: 30, // 30 hours
    active: false,
    endTime: 0,
    specialPlants: ['crypto_farm', 'digital_vault', 'quantum_flower'],
  },
];

// Server Events - Dynamic events controlled by server
const SERVER_EVENTS: ServerEvent[] = [
  {
    id: 'double_yield_weekend',
    name: 'Уикенд двойного урожая',
    description: 'Специальное событие! Все растения дают двойной урожай в течение выходных.',
    type: 'special',
    startTime: 0,
    endTime: 0,
    isActive: false,
    modifiers: {
      yieldMultiplier: 2.0,
      specialRewards: true,
    },
    rewards: {
      mr: 1000,
      specialPlants: ['diamond_mine', 'platinum_rose'],
    },
    icon: AuroraIcon,
    color: '#FFD700',
    rarity: 'rare',
  },
  {
    id: 'mutation_madness',
    name: 'Безумие мутаций',
    description: 'Временное событие с повышенным шансом мутаций! Растения могут получить уникальные способности.',
    type: 'random',
    startTime: 0,
    endTime: 0,
    isActive: false,
    modifiers: {
      mutationChanceMultiplier: 5.0,
      growthSpeedMultiplier: 0.8,
    },
    rewards: {
      items: { 'mutation_catalyst': 3 },
    },
    icon: MutationIcon,
    color: '#9C27B0',
    rarity: 'epic',
  },
  {
    id: 'economic_boom',
    name: 'Экономический бум',
    description: 'Рыночные условия улучшились! Стоимость всех товаров увеличена, а растения дешевле.',
    type: 'special',
    startTime: 0,
    endTime: 0,
    isActive: false,
    modifiers: {
      yieldMultiplier: 1.5,
      costReductionMultiplier: 0.7,
    },
    rewards: {
      mr: 5000,
    },
    icon: TrendingUpIcon,
    color: '#4CAF50',
    rarity: 'uncommon',
  },
  {
    id: 'maintenance_mode',
    name: 'Техническое обслуживание',
    description: 'Сервер находится на техническом обслуживании. Игра продолжается, но некоторые функции могут быть ограничены.',
    type: 'maintenance',
    startTime: 0,
    endTime: 0,
    isActive: false,
    modifiers: {
      growthSpeedMultiplier: 0.5,
    },
    icon: FlashIcon,
    color: '#FF5722',
    rarity: 'common',
  },
  {
    id: 'legendary_harvest',
    name: 'Легендарный урожай',
    description: 'Раз в месяц! Шанс получить легендарные растения и огромные награды.',
    type: 'seasonal',
    startTime: 0,
    endTime: 0,
    isActive: false,
    modifiers: {
      yieldMultiplier: 3.0,
      specialRewards: true,
      doubleXp: true,
    },
    rewards: {
      mr: 10000,
      items: { 'legendary_seed': 1 },
      specialPlants: ['rainbow_flower', 'mystic_orchid', 'cosmic_fern'],
    },
    icon: TrophyIcon,
    color: '#FF6B35',
    rarity: 'legendary',
  },
];

// Server Modifiers - Dynamic game balance adjustments
const SERVER_MODIFIERS: ServerModifier[] = [
  {
    id: 'global_growth_boost',
    name: 'Глобальное ускорение роста',
    description: 'Все растения растут на 20% быстрее.',
    type: 'global',
    modifiers: {
      growthSpeedMultiplier: 1.2,
    },
    startTime: 0,
    endTime: 0,
    isActive: false,
    priority: 1,
  },
  {
    id: 'premium_plant_boost',
    name: 'Буст премиум растений',
    description: 'Премиум растения дают на 50% больше урожая.',
    type: 'plant_specific',
    target: 'premium',
    modifiers: {
      yieldMultiplier: 1.5,
    },
    startTime: 0,
    endTime: 0,
    isActive: false,
    priority: 2,
  },
  {
    id: 'new_player_bonus',
    name: 'Бонус для новых игроков',
    description: 'Новые игроки получают скидку 30% на все растения.',
    type: 'player_specific',
    modifiers: {
      costReductionMultiplier: 0.7,
    },
    startTime: 0,
    endTime: 0,
    isActive: false,
    priority: 3,
  },
];

// --- PLANT EVOLUTION CONFIGURATIONS ---
const PLANT_EVOLUTIONS: { [key: string]: { evolvesTo: string; requiredLevel: number; requiredMutations: number; cost: number } } = {
  // Basic evolution chain
  'penny_plant': {
    evolvesTo: 'coin_flower',
    requiredLevel: 2,
    requiredMutations: 1,
    cost: 100,
  },
  'coin_flower': {
    evolvesTo: 'dollar_bush',
    requiredLevel: 3,
    requiredMutations: 2,
    cost: 500,
  },
  'dollar_bush': {
    evolvesTo: 'mr_tree',
    requiredLevel: 2,
    requiredMutations: 3,
    cost: 2000,
  },
  'micro_plant': {
    evolvesTo: 'penny_plant',
    requiredLevel: 2,
    requiredMutations: 0,
    cost: 50,
  },
  
  // Gem evolution chain
  'treasure_sprout': {
    evolvesTo: 'gold_mine',
    requiredLevel: 2,
    requiredMutations: 2,
    cost: 1000,
  },
  'gold_mine': {
    evolvesTo: 'crystal_tree',
    requiredLevel: 3,
    requiredMutations: 4,
    cost: 5000,
  },
  'crystal_tree': {
    evolvesTo: 'diamond_mine',
    requiredLevel: 3,
    requiredMutations: 5,
    cost: 15000,
  },
  
  // Tech evolution chain
  'crypto_farm': {
    evolvesTo: 'quantum_flower',
    requiredLevel: 2,
    requiredMutations: 3,
    cost: 8000,
  },
  'quantum_flower': {
    evolvesTo: 'mystic_orchid',
    requiredLevel: 1,
    requiredMutations: 6,
    cost: 25000,
  },
  
  // Premium evolution chains
  'platinum_rose': {
    evolvesTo: 'emerald_vine',
    requiredLevel: 2,
    requiredMutations: 3,
    cost: 12000,
  },
  'emerald_vine': {
    evolvesTo: 'ruby_cactus',
    requiredLevel: 2,
    requiredMutations: 4,
    cost: 18000,
  },
  'ruby_cactus': {
    evolvesTo: 'sapphire_lily',
    requiredLevel: 2,
    requiredMutations: 5,
    cost: 22000,
  },
  'sapphire_lily': {
    evolvesTo: 'rainbow_flower',
    requiredLevel: 3,
    requiredMutations: 7,
    cost: 50000,
  },
  
  // Cosmic evolution chain
  'cosmic_fern': {
    evolvesTo: 'stellar_bamboo',
    requiredLevel: 3,
    requiredMutations: 4,
    cost: 20000,
  },
  'stellar_bamboo': {
    evolvesTo: 'lunar_lotus',
    requiredLevel: 2,
    requiredMutations: 5,
    cost: 25000,
  },
  'lunar_lotus': {
    evolvesTo: 'solar_palm',
    requiredLevel: 2,
    requiredMutations: 6,
    cost: 30000,
  },
  'solar_palm': {
    evolvesTo: 'rainbow_flower',
    requiredLevel: 3,
    requiredMutations: 8,
    cost: 75000,
  },
  
  // Special cross-evolutions (require specific combinations)
  'mr_tree': {
    evolvesTo: 'bank_branch',
    requiredLevel: 3,
    requiredMutations: 4,
    cost: 10000,
  },
  'bank_branch': {
    evolvesTo: 'digital_vault',
    requiredLevel: 3,
    requiredMutations: 5,
    cost: 20000,
  },
  'digital_vault': {
    evolvesTo: 'quantum_flower',
    requiredLevel: 2,
    requiredMutations: 6,
    cost: 35000,
  },
};

// Plant Combination Bonuses - Plants that work better together
const PLANT_COMBINATIONS: { [key: string]: { 
  plants: string[]; 
  bonus: { 
    growthSpeedMultiplier?: number; 
    yieldMultiplier?: number; 
    mutationChanceBonus?: number; 
    specialEffect?: string;
  }; 
  name: string; 
  description: string;
} } = {
  'money_synergy': {
    plants: ['mr_tree', 'coin_flower', 'dollar_bush'],
    bonus: {
      yieldMultiplier: 1.5,
      growthSpeedMultiplier: 1.2,
    },
    name: 'Денежная синергия',
    description: 'Денежные растения работают лучше вместе!',
  },
  'gem_collection': {
    plants: ['gold_mine', 'crystal_tree', 'diamond_mine'],
    bonus: {
      yieldMultiplier: 2.0,
      mutationChanceBonus: 0.01,
    },
    name: 'Коллекция драгоценностей',
    description: 'Драгоценные растения создают магическую ауру!',
  },
  'tech_network': {
    plants: ['crypto_farm', 'quantum_flower', 'digital_vault'],
    bonus: {
      yieldMultiplier: 1.8,
      specialEffect: 'passive_income_boost',
    },
    name: 'Технологическая сеть',
    description: 'Технологические растения создают сеть!',
  },
  'premium_garden': {
    plants: ['platinum_rose', 'emerald_vine', 'ruby_cactus', 'sapphire_lily'],
    bonus: {
      yieldMultiplier: 3.0,
      growthSpeedMultiplier: 1.3,
      mutationChanceBonus: 0.015,
    },
    name: 'Премиум сад',
    description: 'Все премиум растения сияют вместе!',
  },
  'cosmic_harmony': {
    plants: ['cosmic_fern', 'stellar_bamboo', 'lunar_lotus', 'solar_palm'],
    bonus: {
      yieldMultiplier: 2.5,
      growthSpeedMultiplier: 1.4,
      specialEffect: 'cosmic_energy',
    },
    name: 'Космическая гармония',
    description: 'Космические растения создают звездную энергию!',
  },
  'rainbow_nexus': {
    plants: ['rainbow_flower', 'mystic_orchid'],
    bonus: {
      yieldMultiplier: 5.0,
      growthSpeedMultiplier: 2.0,
      mutationChanceBonus: 0.05,
      specialEffect: 'rainbow_magic',
    },
    name: 'Радужный нексус',
    description: 'Легендарные растения создают магический портал!',
  },
  'equipment_support': {
    plants: ['sprinkler', 'energy_well', 'stellar_bamboo'],
    bonus: {
      growthSpeedMultiplier: 1.6,
      specialEffect: 'equipment_boost',
    },
    name: 'Поддержка оборудования',
    description: 'Оборудование усиливает все растения!',
  },
  'passive_income_network': {
    plants: ['investment_flower', 'bank_branch', 'digital_vault', 'mystic_orchid'],
    bonus: {
      yieldMultiplier: 2.2,
      specialEffect: 'network_effect',
    },
    name: 'Сеть пассивного дохода',
    description: 'Пассивные растения создают финансовую сеть!',
  },
};

// Plant Proximity Effects - Plants that affect nearby plants
const PLANT_PROXIMITY_EFFECTS: { [key: string]: {
  radius: number;
  effect: {
    growthSpeedMultiplier?: number;
    yieldMultiplier?: number;
    mutationChanceBonus?: number;
  };
  description: string;
} } = {
  'sprinkler': {
    radius: 1,
    effect: {
      growthSpeedMultiplier: 1.3,
    },
    description: 'Ускоряет рост растений в радиусе 1 клетки',
  },
  'stellar_bamboo': {
    radius: 3,
    effect: {
      growthSpeedMultiplier: 1.2,
    },
    description: 'Ускоряет рост растений в радиусе 3 клеток',
  },
  'energy_well': {
    radius: 2,
    effect: {
      mutationChanceBonus: 0.01,
    },
    description: 'Увеличивает шанс мутаций в радиусе 2 клеток',
  },
  'rainbow_flower': {
    radius: 2,
    effect: {
      yieldMultiplier: 1.5,
      mutationChanceBonus: 0.02,
    },
    description: 'Усиливает все растения в радиусе 2 клеток',
  },
  'mystic_orchid': {
    radius: 3,
    effect: {
      yieldMultiplier: 1.3,
      growthSpeedMultiplier: 1.1,
    },
    description: 'Магически усиливает растения в радиусе 3 клеток',
  },
};

const BASE_GRID_SIZE = 4; // 4x4 garden plots
const GRID_SIZE = 4; // 4x4 garden plots
const INITIAL_IN_GAME_MR = 1000;
const INITIAL_DEPOSIT_FROM_CARD = 500; // Amount deducted from real card to start game

const CASH_OUT_RATE = 0.5; // 50% of in-game MR can be cashed out to real card

// Helper function to get random mutation based on rarity
const getRandomMutation = (): PlantMutation | null => {
  const rand = Math.random();
  let cumulativeChance = 0;
  
  for (const mutation of PLANT_MUTATIONS) {
    cumulativeChance += MUTATION_CHANCES[mutation.rarity];
    if (rand < cumulativeChance) {
      return mutation;
    }
  }
  
  return null;
};

// Helper function to calculate current grid size based on modifiers
const getCurrentGridSize = (modifiers: GardenModifier[]): number => {
  const expansionModifiers = modifiers.filter(m => m.purchased && m.effect.type === 'garden_size');
  let totalExpansion = 0;
  expansionModifiers.forEach(modifier => {
    totalExpansion += modifier.effect.amount * modifier.level;
  });
  return BASE_GRID_SIZE + totalExpansion;
};

// Helper function to calculate mutation chance with modifiers
const getMutationChance = (modifiers: GardenModifier[]): number => {
  let baseChance = 0.001; // 0.1% base chance per tick
  const mutationModifiers = modifiers.filter(m => m.purchased && m.effect.type === 'mutation_chance');
  mutationModifiers.forEach(modifier => {
    baseChance += modifier.effect.amount * modifier.level;
  });
  return baseChance;
};

// Helper function to check for nearby sprinklers and calculate speed bonus
const getSprinklerSpeedBonus = (plots: (GameAsset | null)[][], x: number, y: number): number => {
  let speedBonus = 0;
  
  // Check all plots for sprinklers
  plots.forEach((row, rowY) => {
    row.forEach((plotAsset, colX) => {
      if (plotAsset && plotAsset.type === 'sprinkler') {
        const sprinklerConfig = ASSET_CONFIGS.sprinkler;
        const radius = plotAsset.level; // Sprinkler level determines radius
        
        // Calculate distance (Manhattan distance)
        const distance = Math.abs(x - colX) + Math.abs(y - rowY);
        
        if (distance <= radius) {
          // Each sprinkler level adds 0.2x speed bonus (20% per level)
          speedBonus += 0.2 * plotAsset.level;
        }
      }
    });
  });
  
  // Return 1 + bonus (so 1.0 = no bonus, 1.2 = 20% bonus, etc.)
  return 1 + speedBonus;
};

// Helper function to check for plant combinations and calculate synergy bonus
const getPlantSynergyBonus = (plots: (GameAsset | null)[][], x: number, y: number): number => {
  let synergyBonus = 1;
  const currentAsset = plots[y]?.[x];
  if (!currentAsset) return synergyBonus;

  // Check adjacent plants (up, down, left, right)
  const adjacentPositions = [
    { x: x, y: y - 1 }, // up
    { x: x, y: y + 1 }, // down
    { x: x - 1, y: y }, // left
    { x: x + 1, y: y }, // right
  ];

  const adjacentTypes = adjacentPositions
    .map(pos => plots[pos.y]?.[pos.x]?.type)
    .filter(type => type !== undefined) as GameAsset['type'][];

  // Define plant combinations
  const combinations = {
    // Money plants synergy
    'mr_tree': ['card_plant', 'coin_flower', 'dollar_bush'],
    'card_plant': ['mr_tree', 'investment_flower'],
    'coin_flower': ['mr_tree', 'penny_plant'],
    'dollar_bush': ['mr_tree', 'treasure_sprout'],
    
    // Precious materials synergy
    'gold_mine': ['crystal_tree', 'treasure_sprout'],
    'crystal_tree': ['gold_mine', 'gem_plant'],
    'crypto_farm': ['digital_vault', 'quantum_flower'],
    
    // Special combinations
    'quantum_flower': ['crypto_farm', 'digital_vault', 'time_vine'],
    'time_vine': ['quantum_flower', 'energy_well'],
    'energy_well': ['time_vine', 'sprinkler'],
  };

  const currentType = currentAsset.type;
  const synergies = combinations[currentType as keyof typeof combinations] || [];
  
  // Count how many adjacent plants are synergistic
  const synergyCount = adjacentTypes.filter(type => synergies.includes(type)).length;
  
  if (synergyCount > 0) {
    // Each synergistic neighbor adds 0.15x bonus
    synergyBonus += synergyCount * 0.15;
  }

  return synergyBonus;
};

// Achievement checking functions
const checkAchievements = (stats: any, setAchievements: any, setInGameMR: any) => {
  setAchievements((prevAchievements: Achievement[]) => {
    return prevAchievements.map(achievement => {
      if (achievement.unlocked) return achievement;
      
      let progress = 0;
      let shouldUnlock = false;
      
      switch (achievement.condition.type) {
        case 'harvest_count':
          progress = stats.harvestCount;
          shouldUnlock = progress >= achievement.condition.target;
          break;
        case 'total_earned':
          progress = stats.totalEarned;
          shouldUnlock = progress >= achievement.condition.target;
          break;
        case 'mutations_gained':
          progress = stats.mutationsGained;
          shouldUnlock = progress >= achievement.condition.target;
          break;
        case 'plants_planted':
          progress = stats.plantsPlanted;
          shouldUnlock = progress >= achievement.condition.target;
          break;
        case 'consecutive_days':
          progress = stats.consecutiveDays;
          shouldUnlock = progress >= achievement.condition.target;
          break;
      }
      
      if (shouldUnlock) {
        // Award achievement reward
        awardAchievementReward(achievement, setInGameMR);
        return { ...achievement, unlocked: true, progress };
      }
      
      return { ...achievement, progress };
    });
  });
};

const awardAchievementReward = (achievement: Achievement, setInGameMR: any) => {
  switch (achievement.reward.type) {
    case 'mr':
      setInGameMR((prev: number) => prev + achievement.reward.amount);
      break;
    case 'mutation_chance':
      console.log(`Achievement unlocked: ${achievement.name} - Mutation chance increased!`);
      break;
    case 'sprinkler_discount':
      console.log(`Achievement unlocked: ${achievement.name} - Sprinkler discount applied!`);
      break;
    case 'special_seed':
      console.log(`Achievement unlocked: ${achievement.name} - Special seed received!`);
      break;
  }
};

export const BankGardenGame: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const navigate = useNavigate();

  // Add CSS for sharp corners and mutations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .sharp-corners {
        border-radius: 0px !important;
      }
      .sharp-corners * {
        border-radius: 0px !important;
      }
      body {
        overflow-x: hidden !important;
      }
      .MuiContainer-root {
        max-width: 100vw !important;
        padding-left: 8px !important;
        padding-right: 8px !important;
      }
      @keyframes pulse {
        0% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
        100% { opacity: 0.6; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [cards, setCards] = useState<BankCard[]>([]); // User's real bank cards
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [inGameMR, setInGameMR] = useState<number>(INITIAL_IN_GAME_MR);
  const [gardenPlots, setGardenPlots] = useState<(GameAsset | null)[][]>(() => {
    const emptyGrid: (GameAsset | null)[][] = Array(BASE_GRID_SIZE).fill(null).map(() => Array(BASE_GRID_SIZE).fill(null));
    return emptyGrid;
  });
  const [inventoryItems, setInventoryItems] = useState<{ [key: string]: number }>({}); // NEW: Inventory state
  const [lastGrowthUpdate, setLastGrowthUpdate] = useState<number>(Date.now()); // Timestamp for growth calculation

  // Achievement tracking
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS.map(a => ({ ...a })));
  const [gameStats, setGameStats] = useState({
    harvestCount: 0,
    totalEarned: 0,
    mutationsGained: 0,
    plantsPlanted: 0,
    consecutiveDays: 0,
    lastPlayDate: new Date().toDateString(),
  });

  // Daily quests system
  const [dailyQuests, setDailyQuests] = useState([
    {
      id: 'harvest_10_plants',
      title: 'Соберите 10 растений',
      description: 'Соберите урожай с 10 растений за сегодня',
      reward: { type: 'mr', amount: 500 },
      progress: 0,
      target: 10,
      completed: false,
      type: 'harvest_count'
    },
    {
      id: 'plant_5_new',
      title: 'Посадите 5 новых растений',
      description: 'Посадите 5 новых растений в саду',
      reward: { type: 'mr', amount: 300 },
      progress: 0,
      target: 5,
      completed: false,
      type: 'plants_planted'
    },
    {
      id: 'earn_1000_mr',
      title: 'Заработайте 1000 МР',
      description: 'Заработайте 1000 МР за сегодня',
      reward: { type: 'special_seed', amount: 1 },
      progress: 0,
      target: 1000,
      completed: false,
      type: 'daily_earnings'
    }
  ]);
  const [dailyQuestsDialogOpen, setDailyQuestsDialogOpen] = useState(false);

  // Drag and drop selling system
  const [draggedItem, setDraggedItem] = useState<{asset: GameAsset, x: number, y: number} | null>(null);
  const [sellBoxHovered, setSellBoxHovered] = useState(false);

  // Garden modifiers state
  const [gardenModifiers, setGardenModifiers] = useState<GardenModifier[]>(GARDEN_MODIFIERS.map(m => ({ ...m })));
  const [modifiersDialogOpen, setModifiersDialogOpen] = useState(false);

  // Weather system state
  const [weatherEffects, setWeatherEffects] = useState<WeatherEffect[]>(WEATHER_EFFECTS.map(w => ({ ...w })));
  const [currentWeather, setCurrentWeather] = useState<WeatherEffect | null>(null);

  // Seasonal events state
  const [seasonalEvents, setSeasonalEvents] = useState<SeasonalEvent[]>(SEASONAL_EVENTS.map(e => ({ ...e })));
  const [currentEvent, setCurrentEvent] = useState<SeasonalEvent | null>(null);

  // Server events and modifiers state
  const [serverEvents, setServerEvents] = useState<ServerEvent[]>([]);
  const [activeServerEvents, setActiveServerEvents] = useState<ServerEvent[]>([]);
  const [serverModifiers, setServerModifiers] = useState<ServerModifier[]>([]);
  const [activeServerModifiers, setActiveServerModifiers] = useState<ServerModifier[]>([]);

  const [gameState, setGameState] = useState<'loading' | 'idle' | 'playing' | 'game-over'>('loading');
  const [dialogOpen, setDialogOpen] = useState(false); // Used for generic feedback/upgrade dialogs
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState<React.ReactNode>(''); // Allow ReactNode for dialogContent
  const [dialogActions, setDialogActions] = useState<React.ReactNode>(null);

  const [selectedPlantType, setSelectedPlantType] = useState<GameAsset['type'] | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<{ x: number, y: number } | null>(null);
  // Renamed planting-related dialog states for clarity and focused use
  const [plantSelectionDialogOpen, setPlantSelectionDialogOpen] = useState(false); // For selecting plant type
  const [depositCardSelectionOpen, setDepositCardSelectionOpen] = useState(false); // For initial game start deposit

  const [selectedDepositCardId, setSelectedDepositCardId] = useState<string | null>(null);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false); // NEW: For cashing out
  const [selectedCashOutCardId, setSelectedCashOutCardId] = useState<string | null>(null);
  const [cashOutAmount, setCashOutAmount] = useState('');

  const gameLoopIntervalRef = useRef<NodeJS.Timeout | null>(null); // Correct type for setInterval ref

  // --- Supabase Interaction ---
  // Ref to hold the latest garden state for saving reliably without causing useEffect re-memoization issues
  const gardenStateRef = useRef({ inGameMR: INITIAL_IN_GAME_MR, gardenPlots: [] as (GameAsset | null)[][], inventoryItems: {} as { [key: string]: number }, lastGrowthUpdate: Date.now() });

  // Modified saveGardenData to use the passed state or the ref for latest values
  const saveGardenData = useCallback(async (
    mr: number = gardenStateRef.current.inGameMR, 
    plots: (GameAsset | null)[][] = gardenStateRef.current.gardenPlots, 
    inventory: { [key: string]: number } = gardenStateRef.current.inventoryItems, 
    lastUpdate: number = gardenStateRef.current.lastGrowthUpdate,
    modifiers: GardenModifier[] = gardenModifiers,
    achievementsData: Achievement[] = [],
    stats: any = gameStats,
    weather: WeatherEffect | null = currentWeather,
    event: SeasonalEvent | null = currentEvent
  ) => {
    if (!user) {
        console.warn("User not logged in, cannot save garden data.");
        return;
    }
    // Only save if the game is actually playing to prevent saving initial empty states.
    // However, for initial game start, we explicitly call it.
    if (gameState !== 'playing' && gameState !== 'idle') { // Allow saving during initial idle setup, but not loading/game-over state
        console.warn("Skipping save: Game not in playing or idle state.");
        return;
    }

    try {
      const { error } = await supabase
        .from('user_garden_data')
        .upsert(
          { 
            user_id: user.id, 
            in_game_mr: mr, 
            garden_plots: plots, 
            inventory_items: inventory,
            last_growth_update: new Date(lastUpdate).toISOString(),
            garden_modifiers: modifiers,
            achievements: achievementsData,
            game_stats: stats,
            current_weather: weather,
            current_event: event
          },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      console.log("Garden data saved successfully!");
    } catch (e: any) {
      console.error('Error saving garden data:', e);
      setError(`Ошибка сохранения данных сада: ${e.message || 'Неизвестная ошибка'}`);
    }
  }, [user, gameState, gardenModifiers, achievements, gameStats, currentWeather, currentEvent]); // Added all new state dependencies

  const fetchGardenData = useCallback(async () => {
    if (!user) { // This will now correctly return if user is not available
      setLoading(false); // Make sure loading is false so UI can show "start game"
      setGameState('idle'); // Player needs to explicitly start game
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_garden_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') { // No rows found, first time player
        console.log("No existing garden data found for user, initializing new game state.");
        const initialPlots = Array(BASE_GRID_SIZE).fill(null).map(() => Array(BASE_GRID_SIZE).fill(null));
        const initialInventory = {};
        const initialLastUpdate = Date.now();

        // --- FIX: Provide starting in-game MR for new games ---
        setInGameMR(INITIAL_IN_GAME_MR); 
        // --- END FIX ---
        setGardenPlots(initialPlots);
        setInventoryItems(initialInventory);
        setLastGrowthUpdate(initialLastUpdate);
        
        gardenStateRef.current = { // Update ref for new state
            inGameMR: INITIAL_IN_GAME_MR, 
            gardenPlots: initialPlots, 
            inventoryItems: initialInventory, 
            lastGrowthUpdate: initialLastUpdate 
        };
        saveGardenData(INITIAL_IN_GAME_MR, initialPlots, initialInventory, initialLastUpdate, gardenModifiers, achievements, gameStats, currentWeather, currentEvent); // Save initial state immediately
        setGameState('idle');
      } else if (error) {
        throw error;
      } else {
        console.log("Garden data loaded successfully.");
        let loadedInGameMR = data.in_game_mr;
        const loadedPlots = data.garden_plots || [];
        let loadedInventoryItems = data.inventory_items || {};
        const loadedLastGrowthUpdate = new Date(data.last_growth_update).getTime();
        
        // Debug: Check what's in the loaded inventory
        console.log('Loaded inventory from database:', loadedInventoryItems);
        
        // Cap loaded inventory to prevent insane amounts from previous bugs
        Object.keys(loadedInventoryItems).forEach(itemType => {
            if (loadedInventoryItems[itemType] > 1000) {
                console.log(`Resetting ${itemType} from ${loadedInventoryItems[itemType]} to 1000 (was inflated from previous bugs)`);
                loadedInventoryItems[itemType] = 1000;
            }
        });
        const loadedModifiers = data.garden_modifiers ? 
          data.garden_modifiers.map((modifier: any) => {
            const originalModifier = GARDEN_MODIFIERS.find(m => m.id === modifier.id);
            return {
              ...modifier,
              icon: originalModifier?.icon || GARDEN_MODIFIERS[0]?.icon // Fallback to a valid icon
            };
          }) : 
          GARDEN_MODIFIERS.map(m => ({ ...m }));
        const loadedAchievements = data.achievements || ACHIEVEMENTS.map(a => ({ ...a }));
        const loadedStats = data.game_stats || {
          harvestCount: 0,
          totalEarned: 0,
          mutationsGained: 0,
          plantsPlanted: 0,
          consecutiveDays: 0,
          lastPlayDate: new Date().toDateString(),
        };
        const loadedWeather = data.current_weather || null;
        const loadedEvent = data.current_event || null;

        const now = Date.now();
        const timeOffline = now - loadedLastGrowthUpdate;
        
        // Debug logging (can be removed in production)
        console.log('Time offline calculation:', {
            now: new Date(now).toLocaleString(),
            lastGrowthUpdate: new Date(loadedLastGrowthUpdate).toLocaleString(),
            timeOfflineMs: timeOffline,
            timeOfflineMinutes: Math.round(timeOffline / (60 * 1000))
        });
        
        // Only calculate offline rewards if you were actually offline for more than 5 minutes
        // This prevents page refreshes from giving offline rewards
        const minOfflineTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        const maxOfflineTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        let finalPlots = loadedPlots; // Default to original plots
        
        // ALWAYS update the lastGrowthUpdate timestamp to prevent future false offline calculations
        setLastGrowthUpdate(now);
        
        if (timeOffline < minOfflineTime) {
            // Not enough time offline, skip offline calculation
            console.log('Not enough offline time, skipping offline rewards');
        } else {
            const cappedTimeOffline = Math.min(timeOffline, maxOfflineTime);
        
        let totalOfflineYield = 0;
        let offlineItemsGenerated: { [key: string]: number } = {};

            finalPlots = loadedPlots.map((row: (GameAsset | null)[]) => row.map((asset: GameAsset | null) => {
            if (!asset) return null;
            
            const config = ASSET_CONFIGS[asset.type as GameAsset['type']];
            if (!config || config.growthTimeMs <= 0) return asset;

                const cyclesOffline = Math.floor(cappedTimeOffline / config.growthTimeMs);
            if (cyclesOffline > 0) {
                if (config.isPassiveIncome) {
                        // Fix passive income: use a reasonable base amount instead of multiplying by current MR
                        const passiveIncomePerCycle = Math.max(1, Math.floor(config.baseYield * asset.level)); // Now use the fixed base yields directly
                        totalOfflineYield += passiveIncomePerCycle * cyclesOffline;
                    return { ...asset, growthProgress: 100, isReadyToHarvest: false, lastGrowthTickTime: now };
                } else if (asset.type === 'mr_tree') {
                        // Cap MR tree yield to prevent insane amounts
                        const mrYieldPerCycle = Math.min(config.baseYield * asset.level, 1000); // Cap at 1000 MR per cycle
                        totalOfflineYield += mrYieldPerCycle * cyclesOffline;
                         return { ...asset, growthProgress: 100, isReadyToHarvest: true, lastGrowthTickTime: now };
                } else if (config.harvestItemType) {
                        // Cap item generation to prevent insane amounts - much stricter caps
                        const baseItemsPerCycle = config.baseYield * asset.level;
                        const itemsPerCycle = Math.min(baseItemsPerCycle, 10); // Cap at 10 items per cycle (much stricter!)
                        const totalItems = itemsPerCycle * cyclesOffline;
                        const maxTotalItems = Math.min(totalItems, 1000); // Cap total offline items at 1000 per plant type
                        offlineItemsGenerated[config.harvestItemType!] = (offlineItemsGenerated[config.harvestItemType!] || 0) + maxTotalItems;
                    return { ...asset, growthProgress: 100, isReadyToHarvest: true, lastGrowthTickTime: now };
                } else if (config.isPermanentBonus) {
                    return { ...asset, growthProgress: 100, isReadyToHarvest: asset.level === config.maxLevel, lastGrowthTickTime: now };
                }
            }
            return asset;
        }));

        if (totalOfflineYield > 0) {
            loadedInGameMR += totalOfflineYield;
            setFeedbackDialog(`Пока вас не было, вы заработали ${formatCurrency(totalOfflineYield, 'MR')} от пассивных доходов!`, 'Offline Доход');
        }
        if (Object.keys(offlineItemsGenerated).length > 0) {
            Object.entries(offlineItemsGenerated).forEach(([type, amount]) => {
                    const currentAmount = loadedInventoryItems[type] || 0;
                    const newAmount = currentAmount + amount;
                    const cappedAmount = Math.min(newAmount, 10000); // Cap total inventory at 10,000 per item type
                    loadedInventoryItems[type] = cappedAmount;
            });
            setFeedbackDialog(`Пока вас не было, вы собрали новые ресурсы!`, 'Offline Ресурсы');
            }
        }

        // --- FIX: Update all state variables at once and update ref ---
        setInGameMR(loadedInGameMR);
        setGardenPlots(finalPlots);
        setInventoryItems(loadedInventoryItems);
        setLastGrowthUpdate(now);
        setGardenModifiers(loadedModifiers);
        setAchievements(loadedAchievements);
        setGameStats(loadedStats);
        setCurrentWeather(loadedWeather);
        setCurrentEvent(loadedEvent);
        
        gardenStateRef.current = { // Update ref with latest loaded & processed state
            inGameMR: loadedInGameMR, 
            gardenPlots: finalPlots, 
            inventoryItems: loadedInventoryItems, 
            lastGrowthUpdate: now 
        };
        saveGardenData(loadedInGameMR, finalPlots, loadedInventoryItems, now, loadedModifiers, loadedAchievements, loadedStats, loadedWeather, loadedEvent); // Save this processed state
        // --- END FIX ---

        setGameState('playing');
      }
    } catch (e: any) {
      console.error('Error fetching garden data:', e);
      setError(`Ошибка загрузки данных сада: ${e.message || 'Неизвестная ошибка'}`);
      setGameState('idle');
    } finally {
      setLoading(false);
    }
  }, [user, saveGardenData]); // Removed inGameMR from dependency array to prevent re-fetch loop

  const fetchCards = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('balance', { ascending: false });
      if (error) throw error;
      setCards(data || []);
    } catch (e: any) {
      console.error('Error fetching cards:', e);
      setError(`Ошибка загрузки карт: ${e.message || 'Неизвестная ошибка'}`);
    }
  }, [user]);

  // Server Events Management
  const fetchServerEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('server_events')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      
      const now = Date.now();
      const activeEvents = (data || []).filter(event => 
        event.start_time <= now && event.end_time >= now
      );
      
      setServerEvents(data || []);
      setActiveServerEvents(activeEvents);
    } catch (e: any) {
      console.error('Error fetching server events:', e);
    }
  }, []);

  const fetchServerModifiers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('server_modifiers')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      
      const now = Date.now();
      const activeModifiers = (data || []).filter(modifier => 
        modifier.start_time <= now && modifier.end_time >= now
      );
      
      setServerModifiers(data || []);
      setActiveServerModifiers(activeModifiers);
    } catch (e: any) {
      console.error('Error fetching server modifiers:', e);
    }
  }, []);

  const applyServerModifiers = useCallback((baseValue: number, modifierType: keyof ServerModifier['modifiers'], plantType?: string) => {
    let multiplier = 1;
    
    activeServerModifiers.forEach(modifier => {
      const modifierValue = modifier.modifiers[modifierType];
      if (typeof modifierValue === 'number') {
        // Check if modifier applies to this plant type or is global
        if (modifier.type === 'global' || 
            (modifier.type === 'plant_specific' && modifier.target === plantType) ||
            (modifier.type === 'player_specific' && modifier.target === user?.id)) {
          multiplier *= modifierValue;
        }
      }
    });
    
    return baseValue * multiplier;
  }, [activeServerModifiers, user?.id]);

  const checkServerEvents = useCallback(() => {
    const now = Date.now();
    
    // Check for expired events
    const stillActiveEvents = activeServerEvents.filter(event => event.endTime > now);
    setActiveServerEvents(stillActiveEvents);
    
    // Check for new events that should start
    const newActiveEvents = serverEvents.filter(event => 
      event.startTime <= now && event.endTime >= now && 
      !activeServerEvents.some(active => active.id === event.id)
    );
    
    if (newActiveEvents.length > 0) {
      setActiveServerEvents(prev => [...prev, ...newActiveEvents]);
      
      // Show notification for new events
      newActiveEvents.forEach(event => {
        setFeedbackDialog(`🎉 Новое событие: ${event.name}! ${event.description}`, 'Событие началось');
      });
    }
  }, [serverEvents, activeServerEvents]);

  const getEventModifiers = useCallback(() => {
    const modifiers = {
      growthSpeedMultiplier: 1,
      yieldMultiplier: 1,
      mutationChanceMultiplier: 1,
      costReductionMultiplier: 1,
      specialRewards: false,
      doubleXp: false,
    };
    
    activeServerEvents.forEach(event => {
      if (event.modifiers.growthSpeedMultiplier) {
        modifiers.growthSpeedMultiplier *= event.modifiers.growthSpeedMultiplier;
      }
      if (event.modifiers.yieldMultiplier) {
        modifiers.yieldMultiplier *= event.modifiers.yieldMultiplier;
      }
      if (event.modifiers.mutationChanceMultiplier) {
        modifiers.mutationChanceMultiplier *= event.modifiers.mutationChanceMultiplier;
      }
      if (event.modifiers.costReductionMultiplier) {
        modifiers.costReductionMultiplier *= event.modifiers.costReductionMultiplier;
      }
      if (event.modifiers.specialRewards !== undefined) {
        modifiers.specialRewards = event.modifiers.specialRewards;
      }
      if (event.modifiers.doubleXp !== undefined) {
        modifiers.doubleXp = event.modifiers.doubleXp;
      }
    });
    
    return modifiers;
  }, [activeServerEvents]);

  // Plant Combination and Proximity Effects
  const getPlantCombinationBonuses = useCallback(() => {
    const bonuses: { [key: string]: any } = {};
    
    Object.entries(PLANT_COMBINATIONS).forEach(([combinationId, combination]) => {
      const plantTypes = gardenPlots.flat().filter(asset => asset !== null).map(asset => asset!.type);
      const hasAllPlants = combination.plants.every(plantType => plantTypes.includes(plantType as any));
      
      if (hasAllPlants) {
        bonuses[combinationId] = {
          ...combination.bonus,
          name: combination.name,
          description: combination.description,
        };
      }
    });
    
    return bonuses;
  }, []); // Remove gardenPlots dependency to prevent infinite re-renders

  const getProximityEffects = useCallback((x: number, y: number) => {
    const effects = {
      growthSpeedMultiplier: 1,
      yieldMultiplier: 1,
      mutationChanceBonus: 0,
    };
    
    gardenPlots.forEach((row, rowY) => {
      row.forEach((asset, colX) => {
        if (asset && PLANT_PROXIMITY_EFFECTS[asset.type]) {
          const proximityEffect = PLANT_PROXIMITY_EFFECTS[asset.type];
          const distance = Math.abs(x - colX) + Math.abs(y - rowY);
          
          if (distance <= proximityEffect.radius) {
            if (proximityEffect.effect.growthSpeedMultiplier) {
              effects.growthSpeedMultiplier *= proximityEffect.effect.growthSpeedMultiplier;
            }
            if (proximityEffect.effect.yieldMultiplier) {
              effects.yieldMultiplier *= proximityEffect.effect.yieldMultiplier;
            }
            if (proximityEffect.effect.mutationChanceBonus) {
              effects.mutationChanceBonus += proximityEffect.effect.mutationChanceBonus;
            }
          }
        }
      });
    });
    
    return effects;
  }, []); // Remove gardenPlots dependency to prevent infinite re-renders

  const calculatePlantBonuses = useCallback((asset: GameAsset) => {
    const combinationBonuses = getPlantCombinationBonuses();
    const proximityEffects = getProximityEffects(asset.x, asset.y);
    const eventModifiers = getEventModifiers();
    
    return {
      growthSpeedMultiplier: proximityEffects.growthSpeedMultiplier * eventModifiers.growthSpeedMultiplier,
      yieldMultiplier: proximityEffects.yieldMultiplier * eventModifiers.yieldMultiplier,
      mutationChanceBonus: proximityEffects.mutationChanceBonus + (eventModifiers.mutationChanceMultiplier - 1),
      combinationBonuses,
    };
  }, []); // Remove dependencies to prevent infinite re-renders - these functions don't need to be memoized

  useEffect(() => {
    if (user) { // Only fetch data if user object exists
      fetchCards();
      fetchGardenData();
      fetchServerEvents();
      fetchServerModifiers();
    } else {
        // If user logs out or is initially null, ensure loading is reset and game goes to idle
        setLoading(false);
        setGameState('idle');
        // Clear any displayed state from previous user for security/privacy
        setInGameMR(0);
        setGardenPlots(Array(BASE_GRID_SIZE).fill(null).map(() => Array(BASE_GRID_SIZE).fill(null)));
        setInventoryItems({});
        setLastGrowthUpdate(Date.now());
    }
  }, [user]); // Remove function dependencies to prevent infinite re-renders

  // Periodic server events and modifiers checking
  useEffect(() => {
    if (gameState === 'playing') {
      const interval = setInterval(() => {
        checkServerEvents();
        fetchServerModifiers();
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [gameState, checkServerEvents, fetchServerModifiers]);
  
  // --- Game Loop for Growth ---
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopIntervalRef.current) clearInterval(gameLoopIntervalRef.current);
      gameLoopIntervalRef.current = null;
      // Removed saveGardenData from here, as debounced save will handle it.
      return;
    }

    const growthTick = () => {
      setGardenPlots(prevPlots => {
        // Use .map to transform and create new asset objects
        const newPlots = prevPlots.map((row: (GameAsset | null)[]) => row.map((asset: GameAsset | null) => {
            if (!asset) return null;
            
            const config = ASSET_CONFIGS[asset.type as GameAsset['type']];
            if (!config || config.growthTimeMs <= 0) return asset;

            const now = Date.now();
            let timeSinceLastGrowth = now - asset.lastGrowthTickTime;

            // Apply growth speed mutations and sprinkler bonus
            let effectiveGrowthTime = config.growthTimeMs;
            
            if (asset.mutations) {
              const speedMultiplier = asset.mutations.reduce((mult, mutation) => 
                mult * (mutation.effect.growthSpeedMultiplier || 1), 1);
              effectiveGrowthTime = effectiveGrowthTime / speedMultiplier; // Divide time needed, not multiply time passed
            }

            // Apply sprinkler speed bonus
            const sprinklerBonus = getSprinklerSpeedBonus(prevPlots, asset.x, asset.y);
            if (sprinklerBonus > 1) {
              effectiveGrowthTime = effectiveGrowthTime / sprinklerBonus; // Divide time needed by bonus multiplier
            }

            // Apply weather effects
            if (currentWeather && currentWeather.active) {
              timeSinceLastGrowth *= currentWeather.effect.growthSpeedMultiplier;
            }

            // Apply seasonal event effects
            if (currentEvent && currentEvent.active) {
              timeSinceLastGrowth *= currentEvent.effect.growthSpeedMultiplier;
            }

            // Apply plant synergy bonus
            const synergyBonus = getPlantSynergyBonus(prevPlots, asset.x, asset.y);
            timeSinceLastGrowth *= synergyBonus;

            // Only process if it's not max level OR it's a passive income asset
            if (asset.level <= config.maxLevel || config.isPassiveIncome) { 
                // Skip growth logic if already ready to harvest (for non-passive income crops)
                if (asset.isReadyToHarvest && !config.isPassiveIncome) {
                    return asset; // Keep the crop as-is, don't process growth
                }
                
                if (timeSinceLastGrowth >= effectiveGrowthTime) {
                    const cycles = Math.floor(timeSinceLastGrowth / effectiveGrowthTime);
                    
                    if (config.isPassiveIncome) { // Passive income assets (Investment Flower, Bank Branch, Digital Vault)
                        // Fix passive income: use reasonable base amount instead of multiplying by current MR
                        const passiveIncomePerCycle = Math.max(1, Math.floor(config.baseYield * asset.level)); // Now use the fixed base yields directly
                        const totalPassiveIncome = passiveIncomePerCycle * cycles;
                        setInGameMR(prevMr => prevMr + totalPassiveIncome);
                        asset.growthProgress = 100; // Visual indicator it produced income
                        asset.lastGrowthTickTime = now; // Reset timer for next passive tick
                    } else { // Harvestable or Permanent Bonus (needs click)
                        asset.growthProgress = 100; // Ready for harvest/interaction
                        asset.isReadyToHarvest = true;
                        console.log(`Crop ${asset.type} at (${asset.x},${asset.y}) is now ready to harvest!`);
                        asset.lastGrowthTickTime = now; // Set to current time to prevent immediate reset
                    }
                } else {
                    asset.growthProgress = (timeSinceLastGrowth / effectiveGrowthTime) * 100;
                    asset.isReadyToHarvest = false; // Not yet ready
                }
            } else { // Asset is max level and not passive, so it's fully mature
                asset.growthProgress = 100;
                asset.isReadyToHarvest = true; // Still mark as ready for interaction (e.g. info/no action)
            }

            // Check for evolution eligibility
            const evolutionConfig = PLANT_EVOLUTIONS[asset.type];
            if (evolutionConfig && asset.level >= evolutionConfig.requiredLevel) {
              const mutationCount = asset.mutations?.length || 0;
              if (mutationCount >= evolutionConfig.requiredMutations) {
                asset.canEvolve = true;
                // Increase evolution progress slowly
                asset.evolutionProgress = Math.min(100, (asset.evolutionProgress || 0) + 0.1);
              }
            }

            // Check for mutation chance (only for growing plants, not passive income)
            let mutationChance = getMutationChance(gardenModifiers);
            if (currentWeather && currentWeather.active) {
              mutationChance += currentWeather.effect.mutationChanceBonus;
            }
            if (currentEvent && currentEvent.active) {
              mutationChance += currentEvent.effect.mutationChanceBonus;
            }
            if (!config.isPassiveIncome && !asset.isReadyToHarvest && Math.random() < mutationChance) {
              const mutation = getRandomMutation();
              if (mutation) {
                // Allow stacking mutations - check if this mutation type already exists
                const existingMutation = asset.mutations?.find(m => m.type === mutation.type);
                if (existingMutation) {
                  // Stack the mutation by increasing its effects
                  existingMutation.effect.yieldMultiplier = (existingMutation.effect.yieldMultiplier || 1) * 1.5;
                  existingMutation.effect.growthSpeedMultiplier = (existingMutation.effect.growthSpeedMultiplier || 1) * 1.2;
                  console.log(`🔄 ${asset.type} at (${asset.x},${asset.y}) stacked ${mutation.name}!`);
                  setFeedbackDialog(`🔄 ${asset.type} получил усиленную мутацию: ${mutation.name}! Эффекты увеличены!`, 'Усиленная мутация!');
                } else {
                  // Add new mutation
                  asset.mutations = [...(asset.mutations || []), mutation];
                  console.log(`🎉 ${asset.type} at (${asset.x},${asset.y}) got ${mutation.name}!`);
                  setFeedbackDialog(`🎉 ${asset.type} получил мутацию: ${mutation.name}! ${mutation.description}`, 'Мутация!');
                  
                  // Update achievement stats for mutations
                  setGameStats(prev => {
                    const newStats = { 
                      ...prev,
                      mutationsGained: prev.mutationsGained + 1
                    };
                    checkAchievements(newStats, setAchievements, setInGameMR);
                    return newStats;
                  });
                }
              }
            }

            return asset; // Return the (potentially updated) asset
          })
        );
        return newPlots; // Return the fully transformed newPlots
      });
    };

    gameLoopIntervalRef.current = setInterval(growthTick, 1000); // Check for growth every second

    return () => {
      if (gameLoopIntervalRef.current) clearInterval(gameLoopIntervalRef.current);
      // Removed saveGardenData from here. Debounced save will handle it.
    };
  }, [gameState, inGameMR, gardenPlots, inventoryItems, lastGrowthUpdate, saveGardenData]);

  // --- NEW: Debounced Save Effect ---
  const debounceSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Only save if the game is actually playing and user is logged in
    if (user && gameState === 'playing') { // Only save when actively playing
        if (debounceSaveTimerRef.current) {
            clearTimeout(debounceSaveTimerRef.current);
        }
        debounceSaveTimerRef.current = setTimeout(() => {
            // Skip debounced save if an explicit save just happened
            if (explicitSaveRef.current) {
                console.log("Skipping debounced save - explicit save in progress");
                return;
            }
            console.log("Debounced save triggered!");
            // Use current values directly from state, as this effect runs when they change
            saveGardenData(inGameMR, gardenPlots, inventoryItems, lastGrowthUpdate, gardenModifiers, achievements, gameStats, currentWeather, currentEvent); 
        }, 5000); // Save every 5 seconds after state settles
    }
    // Cleanup function: save immediately on unmount or before next save starts
    return () => {
        if (debounceSaveTimerRef.current) {
            clearTimeout(debounceSaveTimerRef.current);
        }
        // --- FIX: Ensure immediate save only when leaving 'playing' state ---
        // This prevents saving on every minor state change during non-playing states
        if (user && gameState === 'playing') { 
            console.log("Immediate save on unmount/cleanup triggered!");
            saveGardenData(inGameMR, gardenPlots, inventoryItems, lastGrowthUpdate, gardenModifiers, achievements, gameStats, currentWeather, currentEvent); 
        }
        // --- END FIX ---
    };
  }, [gameState, user]); // Only depend on gameState and user to prevent infinite re-renders
  // --- END NEW: Debounced Save Effect ---

  // --- Weather System ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const weatherInterval = setInterval(() => {
      // Check if current weather should end
      if (currentWeather && currentWeather.active && Date.now() > currentWeather.endTime) {
        setCurrentWeather(null);
        setFeedbackDialog(`Погода "${currentWeather.name}" закончилась!`, 'Погода изменилась');
      }

      // Randomly start new weather (5% chance every 30 seconds)
      if (!currentWeather || !currentWeather.active) {
        if (Math.random() < 0.05) {
          const randomWeather = weatherEffects[Math.floor(Math.random() * weatherEffects.length)];
          const newWeather = {
            ...randomWeather,
            active: true,
            endTime: Date.now() + (randomWeather.duration * 60 * 1000)
          };
          setCurrentWeather(newWeather);
          setFeedbackDialog(`🌤️ Началась "${newWeather.name}"! ${newWeather.description}`, 'Погода изменилась');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(weatherInterval);
  }, [gameState, currentWeather, weatherEffects]);

  // --- Seasonal Events System ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const eventInterval = setInterval(() => {
      // Check if current event should end
      if (currentEvent && currentEvent.active && Date.now() > currentEvent.endTime) {
        setCurrentEvent(null);
        setFeedbackDialog(`🎉 Событие "${currentEvent.name}" закончилось!`, 'Событие завершено');
        // Save the event end to server
        saveGardenData();
      }

      // Randomly start new seasonal event (2% chance every 5 minutes)
      if (!currentEvent || !currentEvent.active) {
        if (Math.random() < 0.02) {
          const randomEvent = seasonalEvents[Math.floor(Math.random() * seasonalEvents.length)];
          const newEvent = {
            ...randomEvent,
            active: true,
            endTime: Date.now() + (randomEvent.duration * 60 * 60 * 1000) // Convert hours to milliseconds
          };
          setCurrentEvent(newEvent);
          setFeedbackDialog(`🎊 Началось событие "${newEvent.name}"! ${newEvent.description}`, 'Сезонное событие');
          // Save the new event to server
          saveGardenData();
        }
      }
    }, 300000); // Check every 5 minutes

    return () => clearInterval(eventInterval);
  }, [gameState, currentEvent, seasonalEvents]);

  // --- Game Actions ---
  const handleStartGameDeposit = () => {
    setDepositCardSelectionOpen(true);
    setDialogTitle('Начать Садоводство');
    setDialogContent(`Для начала игры, внесите ${formatCurrency(INITIAL_DEPOSIT_FROM_CARD, 'MR')} с одной из ваших карт. Эти средства станут вашим стартовым капиталом.`);
    setDialogOpen(true);
  };

  const confirmInitialDeposit = async () => {
    if (!selectedDepositCardId || !user) {
      setError('Выберите карту для внесения средств.');
      return;
    }
    const cardToDeductFrom = cards.find(card => card.id === selectedDepositCardId);
    if (!cardToDeductFrom || !cardToDeductFrom.is_active || cardToDeductFrom.balance < INITIAL_DEPOSIT_FROM_CARD) {
      setError('Недостаточно средств или карта неактивна.');
      return;
    }

    try {
      const { error: deductError } = await supabase
        .from('bank_cards')
        .update({ balance: cardToDeductFrom.balance - INITIAL_DEPOSIT_FROM_CARD })
        .eq('id', cardToDeductFrom.id);

      if (deductError) throw deductError;

        // --- FIX: Set initial state and ensure save ---
        const initialPlots = Array(BASE_GRID_SIZE).fill(null).map(() => Array(BASE_GRID_SIZE).fill(null));
      const initialInventory = {};
      const initialLastUpdate = Date.now();

      setInGameMR(INITIAL_IN_GAME_MR);
      setGardenPlots(initialPlots);
      setInventoryItems(initialInventory);
      setLastGrowthUpdate(initialLastUpdate);
      setGameState('playing');
      fetchCards();
      setDialogOpen(false);
      setDepositCardSelectionOpen(false);
      saveGardenData(INITIAL_IN_GAME_MR, initialPlots, initialInventory, initialLastUpdate, gardenModifiers, achievements, gameStats, currentWeather, currentEvent); // Save initial state immediately
      // --- END FIX ---
    } catch (e: any) {
      console.error('Error deducting initial deposit:', e);
      setError(`Ошибка внесения депозита: ${e.message || 'Неизвестная ошибка'}`);
    }
  };

  const handlePlotClick = (y: number, x: number) => {
    const asset = gardenPlots[y][x];
    console.log(`Clicked plot (${x},${y}):`, asset);
    if (asset) {
      const config = ASSET_CONFIGS[asset.type as GameAsset['type']]; // <--- FIX: Type assertion
      console.log(`Asset config:`, config);
      console.log(`Is ready to harvest:`, asset.isReadyToHarvest);
      if (asset.isReadyToHarvest) {
        if (config.isPassiveIncome) { // Passive income types
            console.log('Handling passive income crop');
            setFeedbackDialog(`"${config.label}" производит пассивный доход, который автоматически зачисляется!`, 'Информация об активе');
            setGardenPlots(prevPlots => { // Reset growthProgress for visual clarity
                const newPlots = prevPlots.map(row => [...row]);
                newPlots[y][x] = { ...asset, growthProgress: 0, isReadyToHarvest: false };
                return newPlots;
            });
            // saveGardenData(); // Debounced save will handle this
            return;
        } else if (asset.type === 'mr_tree') {
             console.log('Handling mr_tree crop');
             // Show harvest options dialog
             let fullHarvestAmount = config.baseYield * asset.level;
             let halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
             
             // Apply mutation effects
             if (asset.mutations) {
               const yieldMultiplier = asset.mutations.reduce((mult, mutation) => 
                 mult * (mutation.effect.yieldMultiplier || 1), 1);
               fullHarvestAmount = Math.floor(fullHarvestAmount * yieldMultiplier);
               halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
               
               // Apply weather effects to yield
               if (currentWeather && currentWeather.active) {
                 fullHarvestAmount = Math.floor(fullHarvestAmount * currentWeather.effect.yieldMultiplier);
                 halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
               }
               
               // Apply seasonal event effects to yield
               if (currentEvent && currentEvent.active) {
                 fullHarvestAmount = Math.floor(fullHarvestAmount * currentEvent.effect.yieldMultiplier);
                 halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
               }
               
               // Check for lucky bonus
               const hasLuckyMutation = asset.mutations.some(m => m.effect.luckBonus);
               if (hasLuckyMutation && Math.random() < 0.25) {
                 const bonusAmount = Math.floor(fullHarvestAmount * 0.5);
                 fullHarvestAmount += bonusAmount;
                 halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
                 console.log(`🍀 Lucky bonus: +${bonusAmount} MR!`);
               }
             }
             
             setDialogTitle(`Сбор урожая: ${config.label}`);
             setDialogContent(
               <Stack spacing={2}>
                 <Typography>Выберите способ сбора урожая:</Typography>
                 <Typography variant="body2" color="text.secondary">
                   Полный сбор: {formatCurrency(fullHarvestAmount, 'MR')} (растение будет удалено)
                 </Typography>
                 <Typography variant="body2" color="text.secondary">
                   Полусбор: {formatCurrency(halfHarvestAmount, 'MR')} (растение продолжит расти)
                 </Typography>
               </Stack>
             );
             setDialogActions(
               <Stack direction="row" spacing={1}>
                 <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
                 <Button 
                   variant="contained" 
                   color="secondary" 
                   onClick={() => {
                     // Half harvest - keep plant growing
                     setInGameMR(prevMr => prevMr + halfHarvestAmount);
                     setFeedbackDialog(`Вы собрали половину урожая: ${formatCurrency(halfHarvestAmount, 'MR')} с "${config.label}"! Растение продолжает расти.`);
             setGardenPlots(prevPlots => {
                const newPlots = prevPlots.map(row => [...row]);
                newPlots[y][x] = { ...asset, growthProgress: 0, isReadyToHarvest: false, lastGrowthTickTime: Date.now() };
                return newPlots;
            });
                     setDialogOpen(false);
                   }}
                 >
                   Полусбор
                 </Button>
                 <Button 
                   variant="contained" 
                   color="primary" 
                   onClick={() => {
                     // Full harvest - remove plant
                     setInGameMR(prevMr => prevMr + fullHarvestAmount);
                     setFeedbackDialog(`Вы собрали полный урожай: ${formatCurrency(fullHarvestAmount, 'MR')} с "${config.label}"!`);
                     setGardenPlots(prevPlots => {
                        const newPlots = prevPlots.map(row => [...row]);
                        newPlots[y][x] = null; // Remove the plant entirely
                        return newPlots;
                     });
                     
                     // Update achievement stats
                     setGameStats(prev => {
                       const newStats = { 
                         ...prev,
                         harvestCount: prev.harvestCount + 1,
                         totalEarned: prev.totalEarned + fullHarvestAmount
                       };
                       checkAchievements(newStats, setAchievements, setInGameMR);
                       return newStats;
                     });
                     
                     setDialogOpen(false);
                   }}
                 >
                   Полный сбор
                 </Button>
               </Stack>
             );
             setDialogOpen(true);
        } else if (config.harvestItemType) { // Gold Mine, Crypto Farm etc.
            console.log('Handling harvestable item crop');
            // Show harvest options dialog for items - CAP THE AMOUNTS!
            let baseItemsProduced = config.baseYield * asset.level;
            let fullItemsProduced = Math.min(baseItemsProduced, 100); // Cap at 100 items per harvest
            let halfItemsProduced = Math.floor(fullItemsProduced / 2);
            let fullValue = fullItemsProduced * config.harvestValue;
            let halfValue = halfItemsProduced * config.harvestValue;
            
            // Apply mutation effects
            if (asset.mutations) {
              const yieldMultiplier = asset.mutations.reduce((mult, mutation) => 
                mult * (mutation.effect.yieldMultiplier || 1), 1);
              fullItemsProduced = Math.floor(fullItemsProduced * yieldMultiplier);
              halfItemsProduced = Math.floor(fullItemsProduced / 2);
              fullValue = fullItemsProduced * config.harvestValue;
              halfValue = halfItemsProduced * config.harvestValue;
              
              // Check for lucky bonus
              const hasLuckyMutation = asset.mutations.some(m => m.effect.luckBonus);
              if (hasLuckyMutation && Math.random() < 0.25) {
                const bonusItems = Math.floor(fullItemsProduced * 0.5);
                fullItemsProduced += bonusItems;
                halfItemsProduced = Math.floor(fullItemsProduced / 2);
                fullValue = fullItemsProduced * config.harvestValue;
                halfValue = halfItemsProduced * config.harvestValue;
                console.log(`🍀 Lucky bonus: +${bonusItems} items!`);
              }
            }
            
            setDialogTitle(`Сбор урожая: ${config.label}`);
            setDialogContent(
              <Stack spacing={2}>
                <Typography>Выберите способ сбора урожая:</Typography>
                <Typography variant="body2" color="text.secondary">
                  Полный сбор: {fullItemsProduced} ед. {config.harvestItemType} ({formatCurrency(fullValue, 'MR')}) - растение будет удалено
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Полусбор: {halfItemsProduced} ед. {config.harvestItemType} ({formatCurrency(halfValue, 'MR')}) - растение продолжит расти
                </Typography>
              </Stack>
            );
            setDialogActions(
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
                <Button 
                  variant="contained" 
                  color="secondary" 
                  onClick={() => {
                    // Half harvest - keep plant growing
            setInventoryItems(prev => {
                const currentAmount = prev[config.harvestItemType!] || 0;
                const newAmount = currentAmount + halfItemsProduced;
                const cappedAmount = Math.min(newAmount, 10000); // Cap total inventory at 10,000 per item type
                return {
                ...prev,
                    [config.harvestItemType!]: cappedAmount
                };
            });
                    setFeedbackDialog(`Вы собрали половину урожая: ${halfItemsProduced} ед. ${config.harvestItemType} с "${config.label}"! Растение продолжает расти.`);
            setGardenPlots(prevPlots => {
                const newPlots = prevPlots.map(row => [...row]);
                newPlots[y][x] = { ...asset, growthProgress: 0, isReadyToHarvest: false, lastGrowthTickTime: Date.now() };
                return newPlots;
            });
                   setDialogOpen(false);
                  }}
                >
                  Полусбор
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => {
                    // Full harvest - remove plant
                    setInventoryItems(prev => {
                        const currentAmount = prev[config.harvestItemType!] || 0;
                        const newAmount = currentAmount + fullItemsProduced;
                        const cappedAmount = Math.min(newAmount, 10000); // Cap total inventory at 10,000 per item type
                        return {
                        ...prev,
                            [config.harvestItemType!]: cappedAmount
                        };
                    });
                    setFeedbackDialog(`Вы собрали полный урожай: ${fullItemsProduced} ед. ${config.harvestItemType} с "${config.label}"!`);
                    setGardenPlots(prevPlots => {
                       const newPlots = prevPlots.map(row => [...row]);
                       newPlots[y][x] = null; // Remove the plant entirely
                       return newPlots;
                   });
                   setDialogOpen(false);
                  }}
                >
                  Полный сбор
                </Button>
              </Stack>
            );
            setDialogOpen(true);
        } else if (config.isPermanentBonus) {
            if (asset.level === config.maxLevel) {
                console.log('Handling permanent bonus crop at max level');
            setFeedbackDialog(`"${config.label}" полностью выросла! Она дает пассивные бонусы.`, 'Информация об активе');
            setGardenPlots(prevPlots => {
                const newPlots = prevPlots.map(row => [...row]);
                newPlots[y][x] = { ...asset, isReadyToHarvest: false };
                return newPlots;
            });
            return;
            } else {
                console.log('Handling permanent bonus crop - upgrading to next level');
                // For permanent bonus crops that are ready but not max level, upgrade them
                const upgradeCost = config.baseCost * (asset.level + 1);
        setDialogTitle(`Улучшить ${config.label}`);
                setDialogContent(`"${config.label}" готова к улучшению! Улучшить до уровня ${asset.level + 1} за ${formatCurrency(upgradeCost, 'MR')}?`);
        setDialogActions(
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button 
              variant="contained" 
              color="primary" 
              disabled={inGameMR < upgradeCost}
              onClick={() => handleUpgradeAsset(y, x, upgradeCost)}
            >
              Улучшить
            </Button>
          </Stack>
        );
        setDialogOpen(true);
                return;
            }
        } else if (asset.canEvolve && asset.evolutionProgress && asset.evolutionProgress >= 100) {
            // Handle plant evolution
            const evolutionConfig = PLANT_EVOLUTIONS[asset.type];
            if (evolutionConfig) {
              const evolutionCost = evolutionConfig.cost;
              setDialogTitle(`Эволюция: ${config.label}`);
              setDialogContent(
                <Stack spacing={2}>
                  <Typography>🎉 "{config.label}" готова к эволюции!</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Эволюционировать в "{ASSET_CONFIGS[evolutionConfig.evolvesTo as keyof typeof ASSET_CONFIGS].label}" за {formatCurrency(evolutionCost, 'MR')}?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Эволюция сохранит все мутации и сбросит уровень до 1.
                  </Typography>
                </Stack>
              );
              setDialogActions(
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    disabled={inGameMR < evolutionCost}
                    onClick={() => handlePlantEvolution(y, x, evolutionConfig)}
                  >
                    Эволюционировать ({formatCurrency(evolutionCost, 'MR')})
                  </Button>
                </Stack>
              );
              setDialogOpen(true);
              return;
            }
      } else {
            console.log('No matching harvest logic found for crop type:', asset.type);
            // Fallback: treat as harvestable MR crop if it has baseYield > 0
            if (config.baseYield > 0) {
                console.log('Treating as harvestable MR crop (fallback)');
                let fullHarvestAmount = config.baseYield * asset.level;
                let halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
                
                // Apply mutation effects
                if (asset.mutations) {
                  const yieldMultiplier = asset.mutations.reduce((mult, mutation) => 
                    mult * (mutation.effect.yieldMultiplier || 1), 1);
                  fullHarvestAmount = Math.floor(fullHarvestAmount * yieldMultiplier);
                  halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
                  
                  // Check for lucky bonus
                  const hasLuckyMutation = asset.mutations.some(m => m.effect.luckBonus);
                  if (hasLuckyMutation && Math.random() < 0.25) {
                    const bonusAmount = Math.floor(fullHarvestAmount * 0.5);
                    fullHarvestAmount += bonusAmount;
                    halfHarvestAmount = Math.floor(fullHarvestAmount / 2);
                    console.log(`🍀 Lucky bonus: +${bonusAmount} MR!`);
                  }
                }
                
                setDialogTitle(`Сбор урожая: ${config.label}`);
                setDialogContent(
                  <Stack spacing={2}>
                    <Typography>Выберите способ сбора урожая:</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Полный сбор: {formatCurrency(fullHarvestAmount, 'MR')} (растение будет удалено)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Полусбор: {formatCurrency(halfHarvestAmount, 'MR')} (растение продолжит расти)
                    </Typography>
                  </Stack>
                );
                setDialogActions(
                  <Stack direction="row" spacing={1}>
                    <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
                    <Button 
                      variant="contained" 
                      color="secondary" 
                      onClick={() => {
                        // Half harvest - keep plant growing
                        setInGameMR(prevMr => prevMr + halfHarvestAmount);
                        setFeedbackDialog(`Вы собрали половину урожая: ${formatCurrency(halfHarvestAmount, 'MR')} с "${config.label}"! Растение продолжает расти.`);
                        setGardenPlots(prevPlots => {
                           const newPlots = prevPlots.map(row => [...row]);
                           newPlots[y][x] = { ...asset, growthProgress: 0, isReadyToHarvest: false, lastGrowthTickTime: Date.now() };
                           return newPlots;
                       });
                       setDialogOpen(false);
                      }}
                    >
                      Полусбор
                    </Button>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={() => {
                        // Full harvest - remove plant
                        setInGameMR(prevMr => prevMr + fullHarvestAmount);
                        setFeedbackDialog(`Вы собрали полный урожай: ${formatCurrency(fullHarvestAmount, 'MR')} с "${config.label}"!`);
                        setGardenPlots(prevPlots => {
                           const newPlots = prevPlots.map(row => [...row]);
                           newPlots[y][x] = null; // Remove the plant entirely
                           return newPlots;
                       });
                       setDialogOpen(false);
                      }}
                    >
                      Полный сбор
                    </Button>
                  </Stack>
                );
                setDialogOpen(true);
            }
        }
        
      } else {
        // Show comprehensive plant info dialog for non-ready plants
        const upgradeCost = asset.level < config.maxLevel ? config.baseCost * (asset.level + 1) : 0;
        const sprinklerBonus = getSprinklerSpeedBonus(gardenPlots, asset.x, asset.y);
        
        setDialogTitle(`Информация: ${config.label}`);
        setDialogContent(
          <Stack spacing={2}>
            {/* Plant Status */}
            <Box sx={{ 
              p: 2, 
              bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100], 
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="h6" gutterBottom>Статус растения</Typography>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography variant="body2">
                  Уровень: <strong>{asset.level}/{config.maxLevel}</strong>
                </Typography>
                <Typography variant="body2">
                  Прогресс: <strong>{Math.round(asset.growthProgress)}%</strong>
                </Typography>
                <Typography variant="body2" color={asset.isReadyToHarvest ? 'success.main' : 'warning.main'}>
                  Статус: <strong>{asset.isReadyToHarvest ? 'Готов к сбору' : 'Растет'}</strong>
                </Typography>
              </Stack>
            </Box>

            {/* Mutations */}
            {asset.mutations && asset.mutations.length > 0 && (
              <Box sx={{ 
                p: 2, 
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100], 
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`
              }}>
                <Typography variant="h6" gutterBottom>Мутации ({asset.mutations.length})</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {asset.mutations.map((mutation) => (
                    <Chip
                      key={mutation.id}
                      label={mutation.name}
                      size="small"
                      sx={{ 
                        bgcolor: mutation.effect.color + '80', 
                        color: 'white',
                        mb: 1
                      }}
                    />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Эффекты: {asset.mutations.map(m => 
                    `${m.effect.yieldMultiplier ? `Урожай x${m.effect.yieldMultiplier}` : ''}${m.effect.growthSpeedMultiplier ? ` Скорость x${m.effect.growthSpeedMultiplier}` : ''}${m.effect.luckBonus ? ` Удача +${Math.round(m.effect.luckBonus * 100)}%` : ''}`
                  ).join(', ')}
                </Typography>
              </Box>
            )}

            {/* Sprinkler Effects */}
            {sprinklerBonus > 1 && (
              <Box sx={{ 
                p: 2, 
                bgcolor: theme.palette.mode === 'dark' ? '#1A237E' : '#E3F2FD', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.primary.main}`
              }}>
                <Typography variant="h6" gutterBottom color="primary">
                  💧 Эффект разбрызгивателя
                </Typography>
                <Typography variant="body2">
                  Скорость роста увеличена на <strong>{Math.round((sprinklerBonus - 1) * 100)}%</strong>
                </Typography>
              </Box>
            )}

            {/* Plant Synergy Effects */}
            {(() => {
              const synergyBonus = getPlantSynergyBonus(gardenPlots, asset.x, asset.y);
              if (synergyBonus > 1) {
                return (
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.mode === 'dark' ? '#2E7D32' : '#E8F5E8', 
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.success.main}`
                  }}>
                    <Typography variant="h6" gutterBottom color="success.main">
                      🌱 Синергия растений
                    </Typography>
                    <Typography variant="body2">
                      Скорость роста увеличена на <strong>{Math.round((synergyBonus - 1) * 100)}%</strong> благодаря соседним растениям
                    </Typography>
                  </Box>
                );
              }
              return null;
            })()}

            {/* Evolution Progress */}
            {asset.canEvolve && (
              <Box sx={{ 
                p: 2, 
                bgcolor: theme.palette.mode === 'dark' ? '#4A148C' : '#F3E5F5', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.secondary.main}`
              }}>
                <Typography variant="h6" gutterBottom color="secondary.main">
                  🌟 Эволюция
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Прогресс эволюции: <strong>{Math.round(asset.evolutionProgress || 0)}%</strong>
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={asset.evolutionProgress || 0} 
                  color="secondary" 
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {asset.evolutionProgress && asset.evolutionProgress >= 100 
                    ? 'Готова к эволюции! Нажмите на растение для эволюции.'
                    : 'Эволюция происходит медленно...'
                  }
                </Typography>
              </Box>
            )}

            {/* Plant Stats */}
            <Box sx={{ 
              p: 2, 
              bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100], 
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="h6" gutterBottom>Характеристики</Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  Базовый урожай: <strong>{config.baseYield * asset.level} {config.harvestItemType || 'MR'}</strong>
                </Typography>
                <Typography variant="body2">
                  Время роста: <strong>{Math.round(config.growthTimeMs / 1000)}с</strong>
                </Typography>
                <Typography variant="body2">
                  Стоимость улучшения: <strong>{formatCurrency(upgradeCost, 'MR')}</strong>
                </Typography>
                <Typography variant="body2">
                  Описание: {config.description}
                </Typography>
              </Stack>
            </Box>

            {/* Upgrade Preview */}
            {asset.level < config.maxLevel && (
              <Box sx={{ 
                p: 2, 
                bgcolor: theme.palette.mode === 'dark' ? '#1B5E20' : '#E8F5E8', 
                borderRadius: 1,
                border: `1px solid ${theme.palette.success.main}`
              }}>
                <Typography variant="h6" gutterBottom color="success.main">
                  Улучшение до уровня {asset.level + 1}
                </Typography>
                <Typography variant="body2">
                  Новый урожай: <strong>{config.baseYield * (asset.level + 1)} {config.harvestItemType || 'MR'}</strong>
                </Typography>
                <Typography variant="body2">
                  Стоимость: <strong>{formatCurrency(upgradeCost, 'MR')}</strong>
                </Typography>
              </Box>
            )}
          </Stack>
        );
        
        setDialogActions(
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setDialogOpen(false)}>Закрыть</Button>
            {asset.level < config.maxLevel && (
              <Button 
                variant="contained" 
                color="primary" 
                disabled={inGameMR < upgradeCost}
                onClick={() => {
                  handleUpgradeAsset(y, x, upgradeCost);
                  setDialogOpen(false);
                }}
              >
                Улучшить ({formatCurrency(upgradeCost, 'MR')})
              </Button>
            )}
          </Stack>
        );
        setDialogOpen(true);
      }
    } else {
      setSelectedPlot({ x, y });
      setSelectedPlantType(null);
      setPlantSelectionDialogOpen(true);
    }
  };

  const handlePlantConfirm = () => {
    if (!selectedPlantType || !selectedPlot) {
        setError('Выберите тип актива и участок.');
        return;
    }
    const config = ASSET_CONFIGS[selectedPlantType];
    if (inGameMR < config.baseCost) {
      setError('Недостаточно МР для посадки этого актива.');
      return;
    }

    setInGameMR(prevMr => prevMr - config.baseCost);
    setGardenPlots(prevPlots => {
      const newPlots = prevPlots.map(row => [...row]);
      newPlots[selectedPlot.y][selectedPlot.x] = {
        id: `asset-${selectedPlot.x}-${selectedPlot.y}-${Date.now()}`,
        type: selectedPlantType,
        level: 1,
        growthProgress: 0,
        isReadyToHarvest: config.growthTimeMs === 0 || !!config.isPermanentBonus,
        x: selectedPlot.x,
        y: selectedPlot.y,
        lastGrowthTickTime: Date.now(),
      };
      return newPlots;
    });
    
    // Update achievement stats for planting
    setGameStats(prev => {
      const newStats = { 
        ...prev,
        plantsPlanted: prev.plantsPlanted + 1
      };
      checkAchievements(newStats, setAchievements, setInGameMR);
      return newStats;
    });
    
    setFeedbackDialog(`${config.onPlantMessage}`);
    setPlantSelectionDialogOpen(false);
    setSelectedPlantType(null);
    setSelectedPlot(null);
    // saveGardenData(); // Debounced save will handle this
  };

  const handleUpgradeAsset = (y: number, x: number, upgradeCost: number) => {
    const asset = gardenPlots[y][x];
    if (!asset) return;

    setInGameMR(prevMr => prevMr - upgradeCost);
    setGardenPlots(prevPlots => {
      const newPlots = prevPlots.map(row => [...row]);
      newPlots[y][x] = { ...asset, level: asset.level + 1, growthProgress: 0, isReadyToHarvest: false, lastGrowthTickTime: Date.now() };
      return newPlots;
    });
    setFeedbackDialog(`"${ASSET_CONFIGS[asset.type as GameAsset['type']].label}" улучшен до уровня ${asset.level + 1}!`);
    setDialogOpen(false);
    // saveGardenData(); // Debounced save will handle this
  };

  const handlePlantEvolution = (y: number, x: number, evolutionConfig: { evolvesTo: string; cost: number }) => {
    const asset = gardenPlots[y][x];
    if (!asset) return;

    setInGameMR(prevMr => prevMr - evolutionConfig.cost);
    setGardenPlots(prevPlots => {
      const newPlots = prevPlots.map(row => [...row]);
      const newAsset = {
        ...asset,
        type: evolutionConfig.evolvesTo as GameAsset['type'],
        level: 1, // Reset level
        growthProgress: 0,
        isReadyToHarvest: false,
        lastGrowthTickTime: Date.now(),
        canEvolve: false,
        evolutionProgress: 0,
        // Keep mutations
      };
      newPlots[y][x] = newAsset;
      return newPlots;
    });
    
    const newConfig = ASSET_CONFIGS[evolutionConfig.evolvesTo as keyof typeof ASSET_CONFIGS];
    setFeedbackDialog(`🎉 "${ASSET_CONFIGS[asset.type as GameAsset['type']].label}" эволюционировала в "${newConfig.label}"! Все мутации сохранены!`, 'Эволюция завершена');
    setDialogOpen(false);
    // saveGardenData(); // Debounced save will handle this
  };

  const handleSellAllCrops = () => {
    let totalSaleValue = 0;
    const newInventory = { ...inventoryItems };

    const assetTypes = Object.keys(ASSET_CONFIGS) as GameAsset['type'][];

    Object.entries(inventoryItems).forEach(([itemType, amount]) => {
      const matchingAssetConfig = assetTypes.map(type => ASSET_CONFIGS[type]).find(config => config.harvestItemType === itemType);

      if (matchingAssetConfig && amount > 0) {
        totalSaleValue += amount * matchingAssetConfig.harvestValue;
        newInventory[itemType] = 0;
      }
    });

    if (totalSaleValue > 0) {
      const newMR = inGameMR + totalSaleValue;
      setInGameMR(newMR);
      setInventoryItems(newInventory);
      setFeedbackDialog(`Вы продали все товары на сумму ${formatCurrency(totalSaleValue, 'MR')}!`);
      // Update the lastGrowthUpdate timestamp to prevent false offline calculations
      const now = Date.now();
      setLastGrowthUpdate(now);
      // Save immediately with the new inventory and MR values
      saveGardenData(newMR, gardenPlots, newInventory, now, gardenModifiers, achievements, gameStats, currentWeather, currentEvent);
    } else {
      setFeedbackDialog('В вашем инвентаре нет товаров для продажи.');
    }
  };

  // Flag to prevent debounced save from overwriting explicit saves
  const explicitSaveRef = useRef(false);

  // Drag and drop selling handlers
  const handleDragStart = (e: React.DragEvent, asset: GameAsset, x: number, y: number) => {
    setDraggedItem({ asset, x, y });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSellBoxDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setSellBoxHovered(true);
  };

  const handleSellBoxDragLeave = () => {
    setSellBoxHovered(false);
  };

  const handleSellBoxDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSellBoxHovered(false);
    
    if (!draggedItem) return;

    const { asset, x, y } = draggedItem;
    const config = ASSET_CONFIGS[asset.type as GameAsset['type']];
    
    if (!config) return;

    // Calculate sell value based on asset type
    let sellValue = 0;
    
    if (config.harvestItemType) {
      // For harvestable items, sell based on current yield
      const currentYield = config.baseYield * asset.level;
      sellValue = currentYield * config.harvestValue;
    } else if (config.isPassiveIncome) {
      // For passive income assets, sell based on level and base cost
      sellValue = config.baseCost * asset.level * 0.5; // 50% of base cost per level
    } else {
      // For regular plants, sell based on level and base cost
      sellValue = config.baseCost * asset.level * 0.3; // 30% of base cost per level
    }

    // Apply mutation bonuses to sell value
    if (asset.mutations) {
      const mutationMultiplier = asset.mutations.reduce((mult, mutation) => 
        mult * (mutation.effect.yieldMultiplier || 1), 1);
      sellValue *= mutationMultiplier;
    }

    // Remove the asset from the garden and get updated plots
    const updatedPlots = gardenPlots.map(row => [...row]);
    updatedPlots[y][x] = null;

    // Add MR from sale
    const newMR = inGameMR + sellValue;
    
    // Update state
    setGardenPlots(updatedPlots);
    setInGameMR(newMR);
    
    // Show feedback
    setFeedbackDialog(`Продано "${config.label}" за ${formatCurrency(sellValue, 'MR')}!`);
    
    // Save the changes with updated plots and MR immediately
    const now = Date.now();
    setLastGrowthUpdate(now);
    
    // Set flag to prevent debounced save from overwriting this explicit save
    explicitSaveRef.current = true;
    
    console.log('Saving plant sale to database:', { 
      newMR, 
      updatedPlots: updatedPlots[y][x], 
      x, y, 
      gameState,
      user: !!user 
    });
    
    saveGardenData(newMR, updatedPlots, inventoryItems, now, gardenModifiers, achievements, gameStats, currentWeather, currentEvent).then(() => {
      // Reset flag after save completes
      setTimeout(() => {
        explicitSaveRef.current = false;
      }, 1000); // Wait 1 second to ensure debounced saves don't interfere
    });
    
    setDraggedItem(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, asset: GameAsset, x: number, y: number) => {
    e.preventDefault();
    setDraggedItem({ asset, x, y });
  };

  const handleTouchEnd = () => {
    setDraggedItem(null);
  };

  const handleSellBoxTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (draggedItem) {
      // Simulate drop on touch
      handleSellBoxDrop(e as any);
    }
  };

  const handleCashOut = () => {
    setCashOutDialogOpen(true);
    setDialogTitle('Вывести средства');
    setDialogContent(`Выберите карту для вывода средств. Вы можете вывести до ${formatCurrency(Math.floor(inGameMR * CASH_OUT_RATE), 'MR')} из вашего игрового баланса.`);
    setDialogOpen(true);
  };

  const confirmCashOut = async () => {
    if (!selectedCashOutCardId || !user) {
      setError('Выберите карту для вывода.');
      return;
    }
    const amountToCashOut = Math.floor(inGameMR * CASH_OUT_RATE);
    if (amountToCashOut <= 0) {
        setError('Недостаточно игровых МР для вывода.');
        return;
    }
    const cardToUpdate = cards.find(card => card.id === selectedCashOutCardId);
    if (!cardToUpdate || !cardToUpdate.is_active) {
        setError('Выбранная карта неактивна или не найдена.');
        return;
    }

    try {
      const { error: updateError } = await supabase
        .from('bank_cards')
        .update({ balance: cardToUpdate.balance + amountToCashOut })
        .eq('id', selectedCashOutCardId);

      if (updateError) throw updateError;
      
      setInGameMR(prevMr => prevMr - amountToCashOut);
      fetchCards();
      setFeedbackDialog(`Вы успешно вывели ${formatCurrency(amountToCashOut, 'MR')} на карту "${cardToUpdate.card_name}"!`, 'Вывод средств');
      setCashOutDialogOpen(false);
      setDialogOpen(false);
      // saveGardenData(); // Debounced save will handle this
    } catch (e: any) {
      console.error('Error cashing out:', e);
      setError(`Ошибка вывода средств: ${e.message || 'Неизвестная ошибка'}`);
    }
  };


  const setFeedbackDialog = (message: string, title: string = 'Информация') => {
    setDialogTitle(title);
    setDialogContent(message);
    setDialogActions(<Button onClick={() => setDialogOpen(false)}>Закрыть</Button>);
    setDialogOpen(true);
  };

  // Garden modifier functions
  const handlePurchaseModifier = (modifierId: string) => {
    const modifier = gardenModifiers.find(m => m.id === modifierId);
    if (!modifier) return;

    const currentLevel = modifier.level;
    const nextLevel = currentLevel + 1;
    const cost = modifier.cost * Math.pow(1.5, currentLevel); // Moderate cost increase

    if (inGameMR < cost) {
      setError('Недостаточно МР для покупки этого модификатора.');
      return;
    }

    if (nextLevel > modifier.maxLevel) {
      setError('Максимальный уровень этого модификатора уже достигнут.');
      return;
    }

    setInGameMR(prevMr => prevMr - cost);
    const updatedModifiers = gardenModifiers.map(m => 
        m.id === modifierId 
          ? { ...m, level: nextLevel, purchased: true }
          : m
    );
    setGardenModifiers(updatedModifiers);
    
    // Save the updated modifiers to the server
    saveGardenData(inGameMR - cost, gardenPlots, inventoryItems, lastGrowthUpdate, updatedModifiers, achievements, gameStats, currentWeather, currentEvent);

    // Handle garden expansion
    if (modifier.effect.type === 'garden_size') {
      const currentGridSize = getCurrentGridSize(gardenModifiers);
      const newGridSize = currentGridSize + modifier.effect.amount;
      
      setGardenPlots(prevPlots => {
        const newPlots = Array(newGridSize).fill(null).map(() => Array(newGridSize).fill(null));
        
        // Copy existing plants to new grid
        prevPlots.forEach((row, y) => {
          row.forEach((asset, x) => {
            if (asset && y < newGridSize && x < newGridSize) {
              newPlots[y][x] = asset;
            }
          });
        });
        
        return newPlots;
      });
    }

    setFeedbackDialog(`Вы успешно улучшили "${modifier.name}" до уровня ${nextLevel}!`, 'Модификатор улучшен');
  };

  const getModifierCost = (modifier: GardenModifier): number => {
    return modifier.cost * Math.pow(1.5, modifier.level);
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

  const canStartGame = cards.some(card => card.is_active && card.balance >= INITIAL_DEPOSIT_FROM_CARD);
  const totalInventoryCount = Object.values(inventoryItems).reduce((sum, count) => sum + count, 0);


  return (
    <Container maxWidth="sm" sx={{ py: { xs: 1, sm: 4 }, px: { xs: 0.5, sm: 2 }, width: '100%', maxWidth: '100vw' }}>
      <PageHeader
        title="Финансовый Садовод"
        actions={
          <IconButton color="inherit" onClick={() => navigate('/')} sx={{ borderRadius: theme.shape.borderRadius }} aria-label="Вернуться на панель">
            <ArrowBackIcon />
          </IconButton>
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
          <GardenIcon sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Растите свой банк!
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Сажайте активы, собирайте МР, улучшайте свою финансовую ферму.
          </Typography>

          {gameState === 'idle' && (
            <Stack spacing={2} alignItems="center">
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={handleStartGameDeposit}
                size="large"
                sx={{ borderRadius: theme.shape.borderRadius, py: 1.5, px: 4 }}
                disabled={!canStartGame}
              >
                Начать игру (Взнос {formatCurrency(INITIAL_DEPOSIT_FROM_CARD, 'MR')})
              </Button>
              {!canStartGame && (
                <Alert severity="warning" sx={{ borderRadius: theme.shape.borderRadius }}>
                  Необходима активная карта с минимум {formatCurrency(INITIAL_DEPOSIT_FROM_CARD, 'MR')} для начала игры.
                </Alert>
              )}
            </Stack>
          )}

          {gameState === 'playing' && (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-around" alignItems="center" mb={2} spacing={{ xs: 1, sm: 0 }}>
                <Typography variant="h6" color="primary">
                  Баланс: {formatCurrency(inGameMR, 'MR')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Обновление роста: {new Date(lastGrowthUpdate).toLocaleTimeString()}
                </Typography>
                {currentWeather && currentWeather.active && (
                  <Chip
                    icon={currentWeather.icon && typeof currentWeather.icon === 'function' ? <currentWeather.icon /> : <Box>🌤️</Box>}
                    label={`${currentWeather.name} (${Math.ceil((currentWeather.endTime - Date.now()) / 60000)}м)`}
                    color="primary"
                    variant="outlined"
                    sx={{ 
                      bgcolor: currentWeather.color + '20',
                      borderColor: currentWeather.color,
                      color: currentWeather.color
                    }}
                  />
                )}
                {currentEvent && currentEvent.active && (
                  <Chip
                    icon={currentEvent.icon && typeof currentEvent.icon === 'function' ? <currentEvent.icon /> : <Box>🎊</Box>}
                    label={`${currentEvent.name} (${Math.ceil((currentEvent.endTime - Date.now()) / 3600000)}ч)`}
                    color="secondary"
                    variant="outlined"
                    sx={{ 
                      bgcolor: currentEvent.color + '20',
                      borderColor: currentEvent.color,
                      color: currentEvent.color
                    }}
                  />
                )}
              </Stack>

              {/* Plant Combinations Display */}
              {(() => {
                const combinationBonuses = getPlantCombinationBonuses();
                const activeCombinations = Object.entries(combinationBonuses);
                
                if (activeCombinations.length > 0) {
                  return (
                    <Card sx={{ mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" color="success.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          🌟 Активные комбинации растений
                        </Typography>
                        <Stack spacing={1}>
                          {activeCombinations.map(([combinationId, bonus]) => (
                            <Box key={combinationId} sx={{ 
                              p: 1.5, 
                              bgcolor: 'background.paper', 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'success.light'
                            }}>
                              <Typography variant="subtitle2" color="success.dark" fontWeight="bold">
                                {bonus.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {bonus.description}
                              </Typography>
                              <Stack direction="row" spacing={2} flexWrap="wrap">
                                {bonus.growthSpeedMultiplier && bonus.growthSpeedMultiplier > 1 && (
                                  <Chip 
                                    label={`Рост +${Math.round((bonus.growthSpeedMultiplier - 1) * 100)}%`}
                                    size="small" 
                                    color="success"
                                    variant="outlined"
                                  />
                                )}
                                {bonus.yieldMultiplier && bonus.yieldMultiplier > 1 && (
                                  <Chip 
                                    label={`Урожай +${Math.round((bonus.yieldMultiplier - 1) * 100)}%`}
                                    size="small" 
                                    color="success"
                                    variant="outlined"
                                  />
                                )}
                                {bonus.mutationChanceBonus && bonus.mutationChanceBonus > 0 && (
                                  <Chip 
                                    label={`Мутации +${Math.round(bonus.mutationChanceBonus * 100)}%`}
                                    size="small" 
                                    color="success"
                                    variant="outlined"
                                  />
                                )}
                                {bonus.specialEffect && (
                                  <Chip 
                                    label={`✨ ${bonus.specialEffect}`}
                                    size="small" 
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                }
                return null;
              })()}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center" sx={{ mb: 3, width: '100%' }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SellIcon />}
                    onClick={handleSellAllCrops}
                    disabled={totalInventoryCount === 0}
                    sx={{ borderRadius: theme.shape.borderRadius }}
                >
                    Продать все
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AssignmentIcon />}
                    onClick={() => setDailyQuestsDialogOpen(true)}
                    sx={{ borderRadius: theme.shape.borderRadius }}
                >
                    Ежедневные задания
                </Button>
                 <Button
                    variant="contained"
                    size="small"
                    startIcon={<CashOutIcon />}
                    onClick={handleCashOut}
                    disabled={inGameMR * CASH_OUT_RATE < 1}
                    sx={{ borderRadius: theme.shape.borderRadius }}
                >
                    Вывести ({formatCurrency(inGameMR * CASH_OUT_RATE, 'MR')})
                </Button>
                 <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UpgradeIcon />}
                    onClick={() => setModifiersDialogOpen(true)}
                    sx={{ borderRadius: theme.shape.borderRadius }}
                >
                    Модификаторы
                </Button>
              </Stack>
              
              {/* Inventory Display */}
              {totalInventoryCount > 0 && (
                  <Card variant="outlined" sx={{ mb: 3, p: 1, borderRadius: theme.shape.borderRadius }}>
                      <Typography variant="subtitle2" color="textSecondary" mb={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <InventoryIcon sx={{ fontSize: 16, mr: 0.5 }} /> Инвентарь
                      </Typography>
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ maxWidth: '100%', overflow: 'hidden' }}>
                          {Object.entries(inventoryItems).map(([itemType, amount]) => {
                            if (amount > 0) {
                                const assetTypes = Object.keys(ASSET_CONFIGS) as GameAsset['type'][];
                                const matchingAssetConfig = assetTypes.map(type => ASSET_CONFIGS[type]).find(config => config.harvestItemType === itemType);
                                if (matchingAssetConfig) {
                                    return (
                                        <Chip
                                            key={itemType}
                                            label={`${matchingAssetConfig.label.replace('Золотая шахта', 'Золото').replace('Криптоферма', 'Токены')}: ${amount}`}
                                            size="small"
                                            sx={{ bgcolor: matchingAssetConfig.color + '33', color: theme.palette.text.primary }}
                                        />
                                    );
                                }
                            }
                            return null;
                          })}
                      </Stack>
                  </Card>
              )}

              {/* Drag and Drop Sell Box */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                mb: 2,
                p: { xs: 1, sm: 2 },
                width: '100%'
              }}>
                <Box
                  onDragOver={handleSellBoxDragOver}
                  onDragLeave={handleSellBoxDragLeave}
                  onDrop={handleSellBoxDrop}
                  onTouchStart={handleSellBoxTouchStart}
                  sx={{
                    width: { xs: 'min(100%, 350px)', sm: 'min(100%, 400px)' }, // Match garden width
                    minHeight: { xs: 60, sm: 80 },
                    border: `3px dashed ${sellBoxHovered ? theme.palette.error.main : theme.palette.divider}`,
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: sellBoxHovered ? theme.palette.error.light + '20' : theme.palette.action.hover,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'visible', // Allow content to show
                    touchAction: 'none', // Prevent scrolling on mobile drag
                    userSelect: 'none', // Prevent text selection
                    p: 1, // Add padding for text
                  }}
                >
                  {!draggedItem && (
                    <>
                      <SellIcon sx={{ fontSize: { xs: 20, sm: 24 }, color: sellBoxHovered ? theme.palette.error.main : theme.palette.text.secondary, mb: 0.5 }} />
                      <Typography variant="body2" color={sellBoxHovered ? 'error.main' : 'text.secondary'} textAlign="center" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, lineHeight: 1.2 }}>
                        {sellBoxHovered ? 'Отпустите для продажи' : 'Перетащите для продажи'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, lineHeight: 1.2 }}>
                        Или нажмите на растение
                      </Typography>
                    </>
                  )}
                  {draggedItem && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: theme.palette.error.main + '15',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="h6" color="error.main" fontWeight="bold" sx={{ fontSize: { xs: '0.9rem', sm: '1.1rem' }, textAlign: 'center', lineHeight: 1.2 }}>
                        Продать за {formatCurrency(
                          (() => {
                            const config = ASSET_CONFIGS[draggedItem.asset.type as GameAsset['type']];
                            let sellValue = 0;
                            if (config.harvestItemType) {
                              sellValue = (config.baseYield * draggedItem.asset.level) * config.harvestValue;
                            } else if (config.isPassiveIncome) {
                              sellValue = config.baseCost * draggedItem.asset.level * 0.5;
                            } else {
                              sellValue = config.baseCost * draggedItem.asset.level * 0.3;
                            }
                            if (draggedItem.asset.mutations) {
                              const mutationMultiplier = draggedItem.asset.mutations.reduce((mult, mutation) => 
                                mult * (mutation.effect.yieldMultiplier || 1), 1);
                              sellValue *= mutationMultiplier;
                            }
                            return sellValue;
                          })(), 'MR'
                        )}
                      </Typography>
                      <Typography variant="caption" color="error.main" sx={{ fontSize: { xs: '0.6rem', sm: '0.7rem' }, mt: 0.5, textAlign: 'center' }}>
                        Отпустите для продажи
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Garden Grid */}
              <Box 
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${getCurrentGridSize(gardenModifiers)}, 1fr)`,
                  gap: 1,
                  width: 'min(100%, 350px)', // Further reduced for mobile
                  height: 'min(100%, 350px)',
                  maxWidth: { xs: '100%', sm: '400px' },
                  mx: 'auto',
                  border: `2px solid ${theme.palette.divider}`,
                  borderRadius: 0, // Sharp corners for the entire grid
                  overflow: 'hidden',
                }}
              >
                {gardenPlots.map((row, y) => (
                  row.map((asset, x) => (
                    <motion.div
                      key={`${x}-${y}`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handlePlotClick(y, x)}
                      draggable={!!asset}
                      onDragStart={(e) => {
                        if (asset) {
                          const dragEvent = e as any;
                          handleDragStart(dragEvent, asset, x, y);
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => asset && handleTouchStart(e, asset, x, y)}
                      onTouchEnd={handleTouchEnd}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        backgroundColor: asset ? ASSET_CONFIGS[asset.type].color + '40' : theme.palette.action.disabledBackground,
                        border: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: asset ? 'grab' : 'pointer',
                        overflow: 'hidden',
                        borderRadius: '0px',
                        opacity: draggedItem?.x === x && draggedItem?.y === y ? 0.5 : 1,
                      }}
                      className="sharp-corners"
                    >
                      {asset ? (
                        <>
                           {/* Mutation glow effect */}
                           {asset.mutations && asset.mutations.length > 0 && (
                             <Box
                               sx={{
                                 position: 'absolute',
                                 top: -2,
                                 left: -2,
                                 right: -2,
                                 bottom: -2,
                                 borderRadius: '50%',
                                 background: `linear-gradient(45deg, ${asset.mutations.map(m => m.effect.color).join(', ')})`,
                                 animation: 'pulse 2s infinite',
                                 zIndex: -1,
                               }}
                             />
                           )}
                           
                           {/* Sprinkler effect indicator */}
                           {getSprinklerSpeedBonus(gardenPlots, asset.x, asset.y) > 1 && (
                             <Box
                               sx={{
                                 position: 'absolute',
                                 top: -1,
                                 left: -1,
                                 right: -1,
                                 bottom: -1,
                                 borderRadius: '50%',
                                 border: '2px solid #2196F3',
                                 animation: 'pulse 3s infinite',
                                 zIndex: -1,
                               }}
                             />
                           )}
                           
                          {React.createElement(ASSET_CONFIGS[asset.type].icon, {
                            sx: {
                              fontSize: 48,
                               color: asset.mutations?.[0]?.effect.color || ASSET_CONFIGS[asset.type].color,
                              opacity: asset.isReadyToHarvest ? 1 : 0.6,
                               filter: asset.mutations && asset.mutations.length > 0 ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : 'none',
                            },
                          })}
                          <Typography variant="caption" fontWeight={600} sx={{ color: theme.palette.text.primary }}>
                            {ASSET_CONFIGS[asset.type].label}
                          </Typography>
                          {ASSET_CONFIGS[asset.type].growthTimeMs > 0 && (
                            <Box sx={{ width: '80%', mt: 0.5, height: 4, bgcolor: theme.palette.grey[700], borderRadius: 1 }}>
                              <LinearProgress variant="determinate" value={asset.growthProgress} color="info" sx={{ height: '100%', borderRadius: 1 }} />
                            </Box>
                          )}
                           {asset.level > 1 && (
                            <Chip label={`Lv ${asset.level}`} size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.4)', color: 'white' }} />
                          )}
                            {asset.mutations && asset.mutations.length > 0 && (
                             <Box sx={{ position: 'absolute', top: 4, left: 4, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                               {asset.mutations.slice(0, 2).map((mutation, index) => (
                                 <Chip 
                                   key={mutation.id}
                                   label={mutation.name} 
                                   size="small" 
                                   sx={{ 
                                     bgcolor: mutation.effect.color + '80', 
                                     color: 'white',
                                     fontSize: '6px',
                                     height: '16px',
                                     '& .MuiChip-label': { padding: '0 4px' }
                                   }} 
                                 />
                               ))}
                               {asset.mutations.length > 2 && (
                                 <Chip 
                                   label={`+${asset.mutations.length - 2}`} 
                                   size="small" 
                                   sx={{ 
                                     bgcolor: 'rgba(0,0,0,0.6)', 
                                     color: 'white',
                                     fontSize: '6px',
                                     height: '16px',
                                     '& .MuiChip-label': { padding: '0 4px' }
                                   }} 
                                 />
                               )}
                             </Box>
                          )}
                           {asset.isReadyToHarvest && (
                              <Chip label="Готов!" size="small" color="success" sx={{ position: 'absolute', bottom: 4, left: asset.mutations && asset.mutations.length > 0 ? '50%' : 4, transform: asset.mutations && asset.mutations.length > 0 ? 'translateX(-50%)' : 'none' }} />
                            )}
                            {asset.canEvolve && asset.evolutionProgress && asset.evolutionProgress >= 100 && (
                              <Chip 
                                label="🌟 Эволюция!" 
                                size="small" 
                                color="secondary" 
                                sx={{ 
                                  position: 'absolute', 
                                  bottom: 4, 
                                  right: 4,
                                  animation: 'pulse 2s infinite',
                                  bgcolor: 'secondary.main',
                                  color: 'white'
                                }} 
                              />
                            )}
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && (
                              <Typography variant="caption" sx={{ position: 'absolute', top: 0, left: 0, fontSize: '8px', color: 'red' }}>
                                R:{asset.isReadyToHarvest ? 'Y' : 'N'} P:{Math.round(asset.growthProgress)}%
                              </Typography>
                          )}
                        </>
                      ) : (
                        <AddIcon sx={{ fontSize: 48, color: theme.palette.action.disabled }} />
                      )}
                    </motion.div>
                  ))
                ))}
              </Box>
            </Box>
          )}

          {gameState === 'game-over' && (
            <Typography variant="h6" color="error" sx={{ mb: 2 }}>
              Игра окончена! Ваш баланс: {formatCurrency(inGameMR, 'MR')}.
            </Typography>
          )}

          {/* Dialog for general feedback, upgrades */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ /* Removed borderRadius */ }}>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
              {dialogTitle}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {error && ( // Display general errors in dialog if present
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              {dialogContent}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
              {dialogActions || <Button onClick={() => setDialogOpen(false)}>Закрыть</Button>}
            </DialogActions>
          </Dialog>

          {/* Enhanced Dialog for plant selection */}
          <Dialog 
            open={plantSelectionDialogOpen} 
            onClose={() => {
            setPlantSelectionDialogOpen(false);
              setSelectedPlantType(null);
              setSelectedPlot(null);
              setError(null);
            }} 
            maxWidth="lg" 
            fullWidth 
            fullScreen={false}
          >
            <DialogTitle>
              Выберите растение для посадки
            </DialogTitle>
            <DialogContent sx={{ 
              overflow: 'hidden', // Prevent dialog content from scrolling
              display: 'flex',
              flexDirection: 'column',
            }}>
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              
              {/* Search and Filter Bar */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  placeholder="Поиск растений..."
                  size="small"
                  sx={{ flexGrow: 1 }}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1 }} />
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Категория</InputLabel>
                  <Select label="Категория" defaultValue="all">
                    <MenuItem value="all">Все растения</MenuItem>
                    <MenuItem value="basic">Базовые</MenuItem>
                    <MenuItem value="premium">Премиум</MenuItem>
                    <MenuItem value="passive">Пассивный доход</MenuItem>
                    <MenuItem value="equipment">Оборудование</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Plant Grid - Garden Style */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(120px, 1fr))', sm: 'repeat(auto-fill, minmax(140px, 1fr))' }, 
                gap: 1, 
                flex: 1, // Take up remaining space
                minHeight: 0, // Allow shrinking
                maxHeight: '60vh', // Reduced height for mobile
                overflowY: 'auto',
                border: `2px solid ${theme.palette.divider}`,
                borderRadius: 0,
                p: 1,
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                touchAction: 'pan-y', // Allow vertical scrolling on touch devices
              }}>
                {Object.entries(ASSET_CONFIGS).map(([type, config]) => {
                  const canAfford = inGameMR >= config.baseCost;
                  const isSelected = selectedPlantType === type;
                  const isPremium = config.baseCost >= 20000;
                  const isPassive = config.isPassiveIncome;
                  const isEquipment = config.isPermanentBonus;
                  
                  return (
                    <motion.div
                      key={type}
                      whileHover={canAfford ? { scale: 1.03 } : {}}
                      whileTap={canAfford ? { scale: 0.97 } : {}}
                      onClick={() => canAfford && setSelectedPlantType(type as GameAsset['type'])}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        minHeight: '120px',
                        backgroundColor: isSelected ? config.color + '60' : config.color + '40',
                        border: isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        overflow: 'hidden',
                        borderRadius: '0px',
                        opacity: canAfford ? 1 : 0.6,
                      }}
                      className="sharp-corners"
                    >
                      {/* Plant Icon */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                        {React.createElement(config.icon, { 
                          sx: { 
                            fontSize: { xs: 32, sm: 40 }, 
                          color: config.color,
                            opacity: canAfford ? 1 : 0.6,
                          } 
                        })}
                        </Box>

                      {/* Plant Name */}
                      <Typography 
                        variant="caption" 
                        fontWeight={600} 
                        sx={{ 
                          color: theme.palette.text.primary,
                          textAlign: 'center',
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          lineHeight: 1.2,
                          mb: 0.5,
                        }}
                      >
                          {config.label}
                        </Typography>

                      {/* Cost */}
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: canAfford ? theme.palette.primary.main : theme.palette.error.main,
                          fontWeight: 'bold',
                          fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        }}
                      >
                            {formatCurrency(config.baseCost, 'MR')}
                          </Typography>

                      {/* Level Badge */}
                      {config.maxLevel > 1 && (
                          <Chip 
                          label={`Lv ${config.maxLevel}`} 
                            size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: 2, 
                            right: 2, 
                            bgcolor: 'rgba(0,0,0,0.4)', 
                            color: 'white',
                            fontSize: '0.6rem',
                            height: '16px',
                            '& .MuiChip-label': { padding: '0 4px' }
                          }} 
                        />
                      )}

                      {/* Type Badges */}
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 2, 
                        left: 2, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 0.5 
                      }}>
                        {isPassive && (
                          <Chip 
                            label="P" 
                            size="small" 
                            sx={{ 
                              bgcolor: 'success.main', 
                              color: 'white',
                              fontSize: '0.5rem',
                              height: '14px',
                              width: '14px',
                              '& .MuiChip-label': { padding: 0 }
                            }} 
                          />
                        )}
                        {isEquipment && (
                          <Chip 
                            label="E" 
                            size="small" 
                            sx={{ 
                              bgcolor: 'info.main', 
                              color: 'white',
                              fontSize: '0.5rem',
                              height: '14px',
                              width: '14px',
                              '& .MuiChip-label': { padding: 0 }
                            }} 
                          />
                        )}
                        {config.harvestItemType && (
                          <Chip 
                            label="H" 
                            size="small" 
                            sx={{ 
                              bgcolor: 'warning.main', 
                              color: 'white',
                              fontSize: '0.5rem',
                              height: '14px',
                              width: '14px',
                              '& .MuiChip-label': { padding: 0 }
                            }} 
                          />
                        )}
                      </Box>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <Box sx={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          background: theme.palette.primary.main,
                          color: 'white',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                        }}>
                          ✓
                        </Box>
                      )}

                      {/* Error Message */}
                      {!canAfford && (
                        <Typography 
                          variant="caption" 
                          color="error" 
                          sx={{ 
                            position: 'absolute',
                            bottom: 2,
                            left: 2,
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                          }}
                        >
                          💰
                        </Typography>
                      )}
                    </motion.div>
                  );
                })}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => {
                setPlantSelectionDialogOpen(false);
                  setSelectedPlantType(null);
                  setSelectedPlot(null);
                  setError(null);
                }}
              >
                Отмена
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handlePlantConfirm} 
                disabled={!selectedPlantType || (selectedPlantType && inGameMR < ASSET_CONFIGS[selectedPlantType].baseCost)}
              >
                Посадить
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog for initial game start deposit confirmation */}
          <Dialog open={depositCardSelectionOpen} onClose={() => setDepositCardSelectionOpen(false)} maxWidth="xs" fullWidth PaperProps={{ /* Removed borderRadius */ }}>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
              Начать Садоводство
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <Typography sx={{mb:2}}>Для начала игры, внесите {formatCurrency(INITIAL_DEPOSIT_FROM_CARD, 'MR')} с одной из ваших карт. Эти средства станут вашим стартовым капиталом.</Typography>
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel id="deposit-card-label">Выберите карту для оплаты</InputLabel>
                <Select
                  labelId="deposit-card-label"
                  value={selectedDepositCardId || ''}
                  onChange={(e: SelectChangeEvent<string>) => setSelectedDepositCardId(e.target.value)}
                  label="Выберите карту для оплаты"
                  // Removed custom borderRadius here
                >
                  {cards.filter(card => card.is_active && card.balance >= INITIAL_DEPOSIT_FROM_CARD).map((card) => (
                    <MenuItem key={card.id} value={card.id}>
                      {card.card_name} (Баланс: {formatCurrency(card.balance, card.currency)})
                    </MenuItem>
                  ))}
                  {cards.filter(card => card.is_active && card.balance < INITIAL_DEPOSIT_FROM_CARD).map((card) => (
                    <MenuItem key={card.id} value={card.id} disabled>
                      {card.card_name} (Недостаточно средств: {formatCurrency(card.balance, 'MR')})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
                <Button onClick={() => {
                  setDepositCardSelectionOpen(false);
                  setError(null); // Clear error on cancel
                }}>Отмена</Button>
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={confirmInitialDeposit} 
                  disabled={!selectedDepositCardId || !cards.some(c => c.id === selectedDepositCardId && c.balance >= INITIAL_DEPOSIT_FROM_CARD)}
                >
                  Внести и начать
                </Button>
            </DialogActions>
          </Dialog>

          {/* NEW: Cash Out Dialog */}
          <Dialog open={cashOutDialogOpen} onClose={() => setCashOutDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ /* Removed borderRadius */ }}>
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
              Вывести средства в банк
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <Typography sx={{mb:2}}>Вы можете вывести до {formatCurrency(Math.floor(inGameMR * CASH_OUT_RATE), 'MR')} из вашего игрового баланса.</Typography>
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel id="cash-out-card-label">Выберите карту для вывода</InputLabel>
                <Select
                  labelId="cash-out-card-label"
                  value={selectedCashOutCardId || ''}
                  onChange={(e: SelectChangeEvent<string>) => setSelectedCashOutCardId(e.target.value)}
                  label="Выберите карту для вывода"
                  // Removed custom borderRadius here
                >
                  {cards.filter(card => card.is_active).map((card) => (
                    <MenuItem key={card.id} value={card.id}>
                      {card.card_name} (Баланс: {formatCurrency(card.balance, card.currency)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Сумма для вывода"
                type="number"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
                inputProps={{ min: 1, max: Math.floor(inGameMR * CASH_OUT_RATE) }}
                helperText={`Максимум: ${formatCurrency(Math.floor(inGameMR * CASH_OUT_RATE), 'MR')}`}
                size="small"
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
                <Button onClick={() => {
                  setCashOutDialogOpen(false);
                  setCashOutAmount('');
                  setSelectedCashOutCardId(null);
                  setError(null);
                }}>Отмена</Button>
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={confirmCashOut} 
                  disabled={
                    !selectedCashOutCardId || 
                    !cashOutAmount || 
                    parseFloat(cashOutAmount) <= 0 || 
                    parseFloat(cashOutAmount) > Math.floor(inGameMR * CASH_OUT_RATE) ||
                    !cards.some(c => c.id === selectedCashOutCardId && c.is_active)
                  }
                >
                  Вывести
                </Button>
            </DialogActions>
          </Dialog>

          {/* Garden Modifiers Dialog */}
          <Dialog 
            open={modifiersDialogOpen} 
            onClose={() => setModifiersDialogOpen(false)} 
            maxWidth="md" 
            fullWidth 
            fullScreen={false}
            PaperProps={{ 
              sx: { 
                borderRadius: { xs: 0, sm: 1 }
              }
            }}
          >
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
              Модификаторы сада
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Модификаторы сада - это дорогие улучшения, которые значительно повышают эффективность вашего сада.
              </Typography>
              <Stack spacing={3}>
                {gardenModifiers.map((modifier) => (
                  <Card key={modifier.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: modifier.purchased ? theme.palette.success.main + '20' : theme.palette.grey[100],
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {typeof modifier.icon === 'string' ? (
                          <Box sx={{ fontSize: 32, color: modifier.purchased ? theme.palette.success.main : theme.palette.grey[600] }}>
                            {modifier.icon}
                          </Box>
                        ) : (
                        <modifier.icon sx={{ fontSize: 32, color: modifier.purchased ? theme.palette.success.main : theme.palette.grey[600] }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} mb={1}>
                          <Typography variant="h6">{modifier.name}</Typography>
                          {modifier.purchased && (
                            <Chip 
                              label={`Уровень ${modifier.level}`} 
                              size="small" 
                              color="success" 
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {modifier.description}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Эффект:</strong> {modifier.effect.type === 'garden_size' ? `+${modifier.effect.amount} к размеру сада` :
                            modifier.effect.type === 'mutation_chance' ? `+${Math.round(modifier.effect.amount * 100)}% к шансу мутаций` : ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Максимальный уровень: {modifier.maxLevel}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                          {formatCurrency(getModifierCost(modifier), 'MR')}
                        </Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handlePurchaseModifier(modifier.id)}
                          disabled={
                            inGameMR < getModifierCost(modifier) || 
                            modifier.level >= modifier.maxLevel
                          }
                          size="small"
                        >
                          {modifier.purchased ? 'Улучшить' : 'Купить'}
                        </Button>
                      </Box>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
              <Button onClick={() => setModifiersDialogOpen(false)}>Закрыть</Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>

      {/* Daily Quests Dialog */}
      <Dialog 
        open={dailyQuestsDialogOpen} 
        onClose={() => setDailyQuestsDialogOpen(false)} 
        maxWidth="md" 
        fullWidth 
        fullScreen={false}
        PaperProps={{ 
          sx: { 
            borderRadius: { xs: 0, sm: 1 }
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
          📋 Ежедневные задания
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Выполняйте ежедневные задания, чтобы получить дополнительные награды!
          </Typography>
          <Stack spacing={2}>
            {dailyQuests.map((quest) => (
              <Card key={quest.id} variant="outlined" sx={{ p: 2, bgcolor: quest.completed ? 'success.50' : 'background.paper' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ 
                    p: 1, 
                    bgcolor: quest.completed ? 'success.main' : 'primary.main',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 40,
                    height: 40
                  }}>
                    <Typography variant="h6" color="white">
                      {quest.completed ? '✓' : '📋'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" color={quest.completed ? 'success.main' : 'text.primary'}>
                      {quest.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {quest.description}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(quest.progress / quest.target) * 100} 
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        color={quest.completed ? 'success' : 'primary'}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {quest.progress}/{quest.target}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        Награда:
                      </Typography>
                      {quest.reward.type === 'mr' && (
                        <Chip 
                          label={`${quest.reward.amount} МР`} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                      {quest.reward.type === 'special_seed' && (
                        <Chip 
                          label={`${quest.reward.amount} специальное семя`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button onClick={() => setDailyQuestsDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
