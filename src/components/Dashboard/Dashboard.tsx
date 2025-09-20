// src/components/Dashboard.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../Layout/PageHeader';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Skeleton,
  Divider,
  Container,
  Stack,
  Menu,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';

import {
  Add as AddIcon,
  CreditCard,
  AccountBalance,
  MoreVert,
  Edit,
  Delete,
  Send as SendIcon,
  SwapHoriz,
  Settings as SettingsIcon,
  AttachMoney,
  Payment,
  Block as BlockIcon,
  CheckCircleOutline as UnblockIcon,
  Search as SearchIcon,
  AccountBalanceWallet as VaultIcon,
  ArrowUpward,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { motion } from 'framer-motion'; // Import motion for animation
import Leaderboard from '../Common/Leaderboard';

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

interface DashboardStats {
  totalBalance: number;
  totalCards: number;
  activeCards: number;
}

const initialDashSettings = {
  density: 'comfortable' as 'comfortable' | 'compact',
  showStats: true,
  showQuick: true,
  showCards: true,
  showLeaderboard: true,
  cardStyle: 'gradient' as 'gradient' | 'solid',
  cardSize: 'comfortable' as 'compact' | 'comfortable' | 'spacious',
  columnsDesktop: 3 as 2 | 3 | 4,
  showBackgroundPattern: false,
  privacyMode: false,
  cardHoverEffect: true,
  borderRadiusLevel: 'md' as 'sm' | 'md' | 'lg',
  accentColor: 'primary' as 'primary' | 'secondary' | 'success',
  sortCardsBy: 'name-asc',
  filterCardsActive: 'all',
};

// Define a type for the toggleColorMode prop
interface DashboardProps {
  toggleColorMode?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ toggleColorMode }) => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const navigate = useNavigate();
  const [cards, setCards] = useState<BankCard[]>([]);
  const [allCards, setAllCards] = useState<BankCard[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    totalCards: 0,
    activeCards: 0,
  });
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<BankCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditCard, setCreditCard] = useState<BankCard | null>(null);

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferStep, setTransferStep] = useState(1);
  const [transferFromCard, setTransferFromCard] = useState<BankCard | null>(null);
  const [transferToCard, setTransferToCard] = useState<BankCard | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [isHacker, setIsHacker] = useState(false);
  const [hackerPopups, setHackerPopups] = useState<Array<{ id: number; x: number; y: number; r: number }>>([]);
  const [hasCleared, setHasCleared] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dashSettings, setDashSettings] = useState(initialDashSettings);

  const [cardSearchQuery, setCardSearchQuery] = useState('');

  // Server-side Vault states
  const [vaultBalance, setVaultBalance] = useState(0); // This will still be fetched to display in the stats card

  const [formData, setFormData] = useState({
    card_name: '',
    card_type: 'debit' as 'debit' | 'credit',
    currency: 'MR',
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentCardForMenu, setCurrentCardForMenu] = useState<BankCard | null>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, card: BankCard) => {
    setAnchorEl(event.currentTarget);
    setCurrentCardForMenu(card);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setCurrentCardForMenu(null);
  };

  const fetchVaultBalance = useCallback(async () => {
    if (!user) {
      setVaultBalance(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_vaults')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (vault not created yet)
        throw error;
      }
      setVaultBalance(data?.balance || 0);
    } catch (error: any) {
      console.error('Error fetching vault balance:', error);
      setError('Ошибка при загрузке баланса хранилища.');
      setVaultBalance(0);
    }
  }, [user]);


  useEffect(() => {
    if (user) {
      fetchCards();
      fetchAllCards();
      fetchVaultBalance(); // Fetch vault balance for display in stats card
    }
  }, [user, fetchVaultBalance]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dashboardSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        setDashSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const persistSettings = (next: typeof initialDashSettings) => {
    setDashSettings(next);
    try {
      localStorage.setItem('dashboardSettings', JSON.stringify(next));
    } catch {}
  };

  useEffect(() => {
    const CHEAT_THRESHOLD = 2e10;
    const maxBal = Math.max(0, ...cards.map((c) => Number(c.balance || 0)));
    setIsHacker(maxBal >= CHEAT_THRESHOLD);
  }, [cards]);

  useEffect(() => {
    if (!isHacker) {
      setHackerPopups([]);
      return;
    }
    let addTimer: any;
    let clearTimer: any;
    const addPopup = () => {
      setHackerPopups((prev) => {
        const id = (prev[0]?.id || 0) + 1;
        const x = Math.random() * 80 + 5;
        const y = Math.random() * 80 + 5;
        const r = Math.random() * 30 - 15;
        const next = [...prev, { id, x, y, r }];
        return next.slice(-80);
      });
    };
    addTimer = setInterval(addPopup, 120);
    clearTimer = setTimeout(async () => {
      if (hasCleared || !user) return;
      try {
        setHasCleared(true);
        await supabase.from('bank_cards').update({ balance: 0 }).eq('user_id', user.id).eq('is_active', true);
        fetchCards();
      } catch {}
    }, 5000);
    return () => {
      addTimer && clearInterval(addTimer);
      clearTimer && clearTimeout(clearTimer);
    };
  }, [isHacker, user, hasCleared]);

  const fetchCards = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCards(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
      setError('Ошибка при загрузке карт');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCards = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const processedData =
        data?.map((card) => ({
          ...card,
          user_name: `Пользователь ${card.user_id.slice(0, 8)}`,
        })) || [];

      setAllCards(processedData);
    } catch (error) {
      console.error('Error fetching all cards:', error);
      setAllCards([]);
    }
  };

  const calculateStats = (cardsData: BankCard[]) => {
    const totalBalance = cardsData.reduce((sum, card) => sum + card.balance, 0);
    const activeCards = cardsData.filter((card) => card.is_active).length;

    setStats({
      totalBalance,
      totalCards: cardsData.length,
      activeCards,
    });
  };

  const handleSubmit = async () => {
    try {
      if (!user) return;

      const cardData: any = {
        user_id: user.id,
        card_name: formData.card_name,
        card_type: formData.card_type,
        currency: formData.currency,
        card_number: editingCard ? editingCard.card_number : generateCardNumber(),
        expiry_date: editingCard ? editingCard.expiry_date : generateExpiryDate(),
        is_active: true,
      };

      if (editingCard) {
        cardData.balance = editingCard.balance;
        const { error } = await supabase.from('bank_cards').update(cardData).eq('id', editingCard.id);

        if (error) throw error;
      } else {
        const { data: existingCards } = await supabase
          .from('bank_cards')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        cardData.balance = existingCards && existingCards.length > 0 ? 0 : 1000;
        const { error } = await supabase.from('bank_cards').insert([cardData]);

        if (error) throw error;
      }

      setOpenDialog(false);
      setEditingCard(null);
      resetForm();
      fetchCards();
    } catch (error) {
      console.error('Error saving card:', error);
      setError('Ошибка при сохранении карты');
    }
  };

  const handleDelete = async (cardId: string) => {
    try {
      const { error } = await supabase.from('bank_cards').delete().eq('id', cardId);

      if (error) throw error;

      fetchCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      setError('Ошибка при удалении карты');
    } finally {
      handleMenuClose();
    }
  };

  const handleEdit = (card: BankCard) => {
    setEditingCard(card);
    setFormData({
      card_name: card.card_name,
      card_type: card.card_type,
      currency: card.currency,
    });
    setOpenDialog(true);
    handleMenuClose();
  };

  const resetForm = () => {
    setFormData({
      card_name: '',
      card_type: 'debit',
      currency: 'MR',
    });
  };

  const generateCardNumber = () => {
    return '**** **** **** ' + Math.floor(Math.random() * 9000 + 1000);
  };

  const generateExpiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 4);
    return date.toISOString().split('T')[0];
  };

  const handleTakeCredit = (card: BankCard) => {
    setCreditCard(card);
    setCreditAmount('');
    setCreditDialogOpen(true);
    handleMenuClose();
  };

  const handleConfirmCredit = async () => {
    if (!creditCard || !user) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    const newDebt = (creditCard.debt || 0) + amount;
    const newBalance = creditCard.balance + amount;
    const { error } = await supabase
      .from('bank_cards')
      .update({ debt: newDebt, balance: newBalance })
      .eq('id', creditCard.id);
    if (error) {
      setError('Ошибка при взятии кредита');
    } else {
      setCreditDialogOpen(false);
      setCreditCard(null);
      setCreditAmount('');
      fetchCards();
    }
  };

  const handlePayOffDebt = async (card: BankCard) => {
    if (!user || !card.debt || card.debt <= 0) return;
    if (card.balance < card.debt) {
      setError('Недостаточно средств для погашения долга');
      return;
    }
    const { error } = await supabase
      .from('bank_cards')
      .update({ balance: card.balance - card.debt, debt: 0 })
      .eq('id', card.id);
    if (error) {
      setError('Ошибка при погашении долга');
    } else {
      fetchCards();
    }
    handleMenuClose();
  };

  const handleToggleCardActive = async (card: BankCard) => {
    if (!user) return;
    try {
      const newStatus = !card.is_active;
      const { error } = await supabase.from('bank_cards').update({ is_active: newStatus }).eq('id', card.id);

      if (error) throw error;
      fetchCards();
    } catch (error) {
      console.error('Error toggling card status:', error);
      setError('Ошибка при изменении статуса карты');
    } finally {
      handleMenuClose();
    }
  };

  const getCardTypeColor = (type: string) => {
    return type === 'credit' ? 'error' : 'primary';
  };

  const getCardTypeLabel = (type: string) => {
    return type === 'credit' ? 'Кредитная' : 'Дебетовая';
  };

  const handleTransferStart = () => {
    setTransferStep(1);
    setTransferFromCard(null);
    setTransferToCard(null);
    setTransferAmount('');
    setTransferDialogOpen(true);
  };

  const handleTransferFromCardSelect = (card: BankCard) => {
    setTransferFromCard(card);
    setError(null);
  };

  const handleTransferToCardSelect = (card: BankCard) => {
    if (card.id === transferFromCard?.id) {
      setError('Нельзя переводить на ту же карту');
      return;
    }
    setTransferToCard(card);
    setError(null);
  };

  const handleTransferConfirm = async () => {
    if (!transferFromCard || !transferToCard || !transferAmount) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Введите корректную сумму');
      return;
    }

    if (amount > transferFromCard.balance) {
      setError('Недостаточно средств на карте');
      return;
    }

    try {
      const { error: fromError } = await supabase
        .from('bank_cards')
        .update({ balance: transferFromCard.balance - amount })
        .eq('id', transferFromCard.id);

      if (fromError) throw fromError;

      const { error: toError } = await supabase
        .from('bank_cards')
        .update({ balance: transferToCard.balance + amount })
        .eq('id', transferToCard.id);

      if (toError) throw toError;

      await fetchCards();
      await fetchAllCards();

      // Award social XP for successful transfer
      try {
        const { addSocialXpForAction } = await import('../../services/progressionService');
        await addSocialXpForAction(user?.id || null, 'manpay_transfer', Number(amount || 0));
      } catch {}

      setTransferDialogOpen(false);
      setTransferStep(1);
      setTransferFromCard(null);
      setTransferToCard(null);
      setTransferAmount('');
      setError(null);
    } catch (error) {
      console.error('Error transferring money:', error);
      setError('Ошибка при переводе денег');
    }
  };

  const handleTransferBack = () => {
    if (transferStep === 2) {
      setTransferStep(1);
      setTransferToCard(null);
    } else if (transferStep === 3) {
      setTransferStep(2);
      setTransferAmount('');
    }
    setError(null);
  };

  const handleTransferCancel = () => {
    setTransferDialogOpen(false);
    setTransferStep(1);
    setTransferFromCard(null);
    setTransferToCard(null);
    setTransferAmount('');
    setError(null);
  };

  const filteredAndSortedCards = useMemo(() => {
    let currentCards = [...cards];

    if (dashSettings.filterCardsActive === 'active') {
      currentCards = currentCards.filter((card) => card.is_active);
    } else if (dashSettings.filterCardsActive === 'inactive') {
      currentCards = currentCards.filter((card) => !card.is_active);
    }

    if (cardSearchQuery) {
      currentCards = currentCards.filter(
        (card) =>
          card.card_name.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
          card.card_number.toLowerCase().includes(cardSearchQuery.toLowerCase().replace(/\s/g, '')) ||
          card.card_type.toLowerCase().includes(cardSearchQuery.toLowerCase())
      );
    }

    currentCards.sort((a, b) => {
      switch (dashSettings.sortCardsBy) {
        case 'name-asc':
          return a.card_name.localeCompare(b.card_name);
        case 'name-desc':
          return b.card_name.localeCompare(a.card_name);
        case 'balance-high':
          return b.balance - a.balance;
        case 'balance-low':
          return a.balance - b.balance;
        case 'type':
          return a.card_type.localeCompare(b.card_type);
        default:
          return 0;
      }
    });

    return currentCards;
  }, [cards, cardSearchQuery, dashSettings.sortCardsBy, dashSettings.filterCardsActive]);

  // Handle navigation to Vault Management Page with animation
  const handleGoToVault = () => {
    // This will trigger the Framer Motion layoutId animation
    navigate('/vault-management');
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, px: { xs: 2, md: 3 } }}>
        <Typography variant="h4" gutterBottom>
          Загрузка...
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 3,
            mb: 4,
          }}
        >
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  const primaryColor = theme.palette.primary.main;

  return (
    <Box sx={{ py: 4, px: { xs: 2, md: 3 } }}>
      {isHacker && (
        <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1300 }}>
          {hackerPopups.map((p) => (
            <Box
              key={p.id}
              sx={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${p.r}deg)`,
                background: 'rgba(244,67,54,0.9)',
                color: 'white',
                fontWeight: 900,
                px: 1,
                py: 0.5,
                borderRadius: 0.5,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontSize: { xs: '10px', sm: '12px' },
              }}
            >
              HACKER
            </Box>
          ))}
        </Box>
      )}
      <PageHeader
        title="Панель управления"
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Removed theme toggle button */}
            <Button startIcon={<SettingsIcon />} variant="outlined" onClick={() => setSettingsOpen(true)} sx={{ borderRadius: 2 }}>
              Настроить
            </Button>
          </Stack>
        }
      />
      <Divider sx={{ my: 3 }} />
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {dashSettings.showStats && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: theme.spacing(dashSettings.density === 'compact' ? 2 : 3),
            mb: theme.spacing(dashSettings.density === 'compact' ? 3 : 4),
          }}
        >
          <Card elevation={3} sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Общий баланс
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    sx={
                      isHacker
                        ? {
                            color: 'error.main',
                            textShadow: '0 0 10px rgba(244,67,54,0.7), 0 0 20px rgba(244,67,54,0.5)',
                            animation: 'glow 1.2s ease-in-out infinite alternate',
                            '@keyframes glow': {
                              from: { textShadow: '0 0 6px rgba(244,67,54,0.6), 0 0 12px rgba(244,67,54,0.3)' },
                              to: { textShadow: '0 0 12px rgba(244,67,54,0.9), 0 0 24px rgba(244,67,54,0.6)' },
                            },
                          }
                        : {}
                    }
                  >
                    {formatCurrency(stats.totalBalance, 'MR')}
                  </Typography>
                </Box>
                <AccountBalance sx={{ fontSize: 48, color: primaryColor, opacity: 0.7 }} />
              </Box>
              {isHacker && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', fontWeight: 700 }}>
                  Аномально высокий баланс обнаружен
                </Typography>
              )}
            </CardContent>
          </Card>
          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Всего карт
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.totalCards}
                  </Typography>
                </Box>
                <CreditCard sx={{ fontSize: 48, color: primaryColor, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Активные карты
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.activeCards}
                  </Typography>
                </Box>
                <Payment sx={{ fontSize: 48, color: primaryColor, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
          {/* Vault Balance Card */}
          <Card elevation={3} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Баланс хранилища
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {formatCurrency(vaultBalance, 'MR')}
                  </Typography>
                </Box>
                <VaultIcon sx={{ fontSize: 48, color: theme.palette.success.main, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
      {dashSettings.showQuick && (
        <Box sx={{ mb: theme.spacing(dashSettings.density === 'compact' ? 3 : 4) }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
            Быстрые действия
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <Card
              elevation={2}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.action.hover,
              }}
              onClick={handleTransferStart}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <SwapHoriz color="primary" sx={{ fontSize: 56, mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Перевод денег
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Перевести деньги между картами
                </Typography>
              </CardContent>
            </Card>

            <Card
              elevation={2}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.action.hover,
              }}
              onClick={() => {
                setEditingCard(null);
                resetForm();
                setOpenDialog(true);
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <AddIcon color="primary" sx={{ fontSize: 56, mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Новая карта
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Создать новую банковскую карту
                </Typography>
              </CardContent>
            </Card>

            <Card
              elevation={2}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.action.hover,
              }}
              onClick={() => navigate('/marketplace')}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <SendIcon color="primary" sx={{ fontSize: 56, mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Рынок
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Покупка и продажа товаров
                </Typography>
              </CardContent>
            </Card>

            {/* Vault Quick Action - Now navigates to VaultManagementPage */}
            <Card
              elevation={2}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.action.hover,
              }}
              onClick={handleGoToVault} // New handler for animation + navigation
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                {/* Framer Motion shared layoutId for the icon */}
                <motion.div layoutId="vault-icon-motion"> 
                  <VaultIcon color="success" sx={{ fontSize: 56, mb: 2 }} />
                </motion.div>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Мое хранилище
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Управляйте своими сбережениями
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
      {/* Leaderboard */}
      {dashSettings.showLeaderboard && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
            Сообщество
          </Typography>
          <Leaderboard limit={10} />
        </Box>
      )}

      {dashSettings.showCards && (
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight={600}>
              Мои карты
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingCard(null);
                resetForm();
                setOpenDialog(true);
              }}
              sx={{ borderRadius: 2 }}
            >
              Добавить карту
            </Button>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems="center">
            <TextField
              fullWidth
              size="small"
              label="Поиск карты"
              value={cardSearchQuery}
              onChange={(e) => setCardSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>Сортировать по</InputLabel>
              <Select
                value={dashSettings.sortCardsBy}
                label="Сортировать по"
                onChange={(e) => persistSettings({ ...dashSettings, sortCardsBy: e.target.value as any })}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value="name-asc">Имени (А-Я)</MenuItem>
                <MenuItem value="name-desc">Имени (Я-А)</MenuItem>
                <MenuItem value="balance-high">Балансу (выс-низ)</MenuItem>
                <MenuItem value="balance-low">Балансу (низ-выс)</MenuItem>
                <MenuItem value="type">Типу карты</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>Фильтр по статусу</InputLabel>
              <Select
                value={dashSettings.filterCardsActive}
                label="Фильтр по статусу"
                onChange={(e) => persistSettings({ ...dashSettings, filterCardsActive: e.target.value as any })}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value="all">Все</MenuItem>
                <MenuItem value="active">Активные</MenuItem>
                <MenuItem value="inactive">Заблокированные</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: `repeat(${dashSettings.columnsDesktop}, 1fr)` },
              gap: dashSettings.cardSize === 'compact' ? 2 : dashSettings.cardSize === 'spacious' ? 4 : 3,
              position: 'relative',
            }}
          >
            {dashSettings.showBackgroundPattern && (
              <Box
                sx={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  backgroundImage: `repeating-linear-gradient(45deg, rgba(125,125,125,0.05) 0, rgba(125,125,125,0.05) 10px, transparent 10px, transparent 20px)`,
                }}
              />
            )}
            {filteredAndSortedCards.map((card) => (
              <Card
                key={card.id}
                elevation={4}
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: dashSettings.borderRadiusLevel === 'sm' ? 1 : dashSettings.borderRadiusLevel === 'lg' ? 4 : 3,
                  background: dashSettings.cardStyle === 'gradient'
                    ? (card.is_active
                        ? card.card_type === 'credit'
                          ? `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`
                          : `linear-gradient(135deg, ${theme.palette[dashSettings.accentColor].dark} 0%, ${theme.palette[dashSettings.accentColor].main} 100%)`
                        : `linear-gradient(135deg, ${theme.palette.grey[700]} 0%, ${theme.palette.grey[500]} 100%)`)
                    : (card.is_active ? theme.palette.background.paper : theme.palette.grey[800]),
                  color: dashSettings.cardStyle === 'gradient' ? 'white' : 'text.primary',
                  border: dashSettings.cardStyle === 'solid' ? `1px solid ${theme.palette.divider}` : 'none',
                  transition: 'transform 0.2s',
                  ...(dashSettings.cardHoverEffect ? {
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 8,
                    },
                  } : {}),
                  opacity: card.is_active ? 1 : 0.7,
                }}
              >
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    p: dashSettings.cardSize === 'compact' ? 2 : dashSettings.cardSize === 'spacious' ? 4 : 3,
                  }}
                >
                  {isHacker && (
                    <Typography
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 12,
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        color: 'error.light',
                        textShadow: '0 0 8px rgba(244,67,54,0.8)',
                      }}
                    >
                      HACKER
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {card.card_type === 'credit' ? 'CREDIT CARD' : 'DEBIT CARD'}
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {card.card_name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(event) => handleMenuClick(event, card)}
                      sx={{ color: 'white', opacity: 0.8, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  <Typography
                    variant="h5"
                    sx={{
                      mb: 1,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      fontFamily: 'monospace',
                      opacity: 0.9,
                    }}
                  >
                    {card.card_number}
                  </Typography>

                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Баланс
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={
                          isHacker
                            ? {
                                color: 'error.light',
                                textShadow: '0 0 10px rgba(244,67,54,0.7)',
                              }
                            : (dashSettings.privacyMode ? { filter: 'blur(4px)' } : {})
                        }
                      >
                        {formatCurrency(card.balance, card.currency)}
                      </Typography>
                    </Box>
                    <Stack direction="column" alignItems="flex-end">
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Действует до
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {new Date(card.expiry_date).toLocaleDateString('ru-RU', { month: '2-digit', year: '2-digit' })}
                      </Typography>
                    </Stack>
                  </Box>

                  {card.card_type === 'credit' && (
                    <Box sx={{ mt: 'auto' }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: card.debt && card.debt > 0 ? theme.palette.warning.light : 'white',
                          fontWeight: 600,
                          mb: 1.5,
                        }}
                      >
                        Долг: {formatCurrency(card.debt || 0, card.currency)}
                      </Typography>
                    </Box>
                  )}

                  {!card.is_active && (
                    <Chip
                      label="Заблокировано"
                      color="warning"
                      size="small"
                      sx={{ position: 'absolute', bottom: 16, left: 16, fontWeight: 700 }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            <MenuItem onClick={() => currentCardForMenu && handleEdit(currentCardForMenu)}>
              <Edit fontSize="small" sx={{ mr: 1 }} /> Изменить
            </MenuItem>
            <MenuItem onClick={() => currentCardForMenu && handleDelete(currentCardForMenu.id)}>
              <Delete fontSize="small" sx={{ mr: 1 }} /> Удалить
            </MenuItem>
            <MenuItem onClick={() => currentCardForMenu && handleToggleCardActive(currentCardForMenu)}>
              {currentCardForMenu?.is_active ? <BlockIcon fontSize="small" sx={{ mr: 1 }} /> : <UnblockIcon fontSize="small" sx={{ mr: 1 }} />}
              {currentCardForMenu?.is_active ? 'Заблокировать карту' : 'Разблокировать карту'}
            </MenuItem>
            {currentCardForMenu?.card_type === 'credit' && (
              [
                <MenuItem key="take_credit" onClick={() => currentCardForMenu && handleTakeCredit(currentCardForMenu)}>
                  <AttachMoney fontSize="small" sx={{ mr: 1 }} /> Взять кредит
                </MenuItem>,
                currentCardForMenu.debt && currentCardForMenu.debt > 0 && (
                  <MenuItem key="pay_off_debt" onClick={() => currentCardForMenu && handlePayOffDebt(currentCardForMenu)}>
                    <Payment fontSize="small" sx={{ mr: 1 }} /> Погасить долг
                  </MenuItem>
                ),
              ]
            )}
          </Menu>

          {filteredAndSortedCards.length === 0 && (
            <Card elevation={2} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 5 }}>
                <CreditCard sx={{ fontSize: 70, color: 'text.secondary', mb: 2, opacity: 0.6 }} />
                <Typography variant="h6" color="textSecondary" gutterBottom fontWeight={600}>
                  {cardSearchQuery || dashSettings.filterCardsActive !== 'all'
                    ? 'Нет карт, соответствующих критериям'
                    : 'У вас пока нет карт'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {cardSearchQuery || dashSettings.filterCardsActive !== 'all'
                    ? 'Попробуйте изменить параметры поиска или фильтрации.'
                    : 'Добавьте свою первую карту для начала работы'}
                </Typography>
                {!cardSearchQuery && dashSettings.filterCardsActive === 'all' && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingCard(null);
                      resetForm();
                      setOpenDialog(true);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    Добавить карту
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Add/Edit Card Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
          {editingCard ? 'Изменить карту' : 'Добавить новую карту'}
        </DialogTitle>
        {!editingCard && (
          <Box sx={{ px: 3, pt: 2, pb: 1 }}>
            <Alert severity="info" sx={{ borderRadius: 1 }}>
              Первая карта: 1,000 МР, дополнительные карты: 0 МР
            </Alert>
          </Box>
        )}
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Название карты"
              value={formData.card_name}
              onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
              margin="normal"
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />
            <TextField
              fullWidth
              select
              label="Тип карты"
              value={formData.card_type}
              onChange={(e) => setFormData({ ...formData, card_type: e.target.value as 'debit' | 'credit' })}
              margin="normal"
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              <MenuItem value="debit">Дебетовая</MenuItem>
              <MenuItem value="credit">Кредитная</MenuItem>
            </TextField>

            <TextField
              fullWidth
              select
              label="Валюта"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              margin="normal"
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              <MenuItem value="MR">МР (маннрубли)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined" sx={{ borderRadius: 1 }}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: 1 }}>
            {editingCard ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onClose={() => setCreditDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>Взять кредит</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Сумма кредита"
            type="number"
            fullWidth
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreditDialogOpen(false)} variant="outlined" sx={{ borderRadius: 1 }}>
            Отмена
          </Button>
          <Button onClick={handleConfirmCredit} variant="contained" sx={{ borderRadius: 1 }}>
            Взять
          </Button>
        </DialogActions>
      </Dialog>

      {/* Money Transfer Dialog */}
      <Dialog
        open={transferDialogOpen}
        onClose={handleTransferCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1.5,
            borderBottom: '1px solid',
            borderColor: theme.palette.divider,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <SwapHoriz color="primary" sx={{ fontSize: 30 }} />
            <Typography variant="h6" fontWeight={600}>
              Перевод денег
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="center" spacing={1}>
            {[1, 2, 3].map((step) => (
              <Box
                key={step}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: step <= transferStep ? primaryColor : theme.palette.action.disabled,
                  transition: 'all 0.3s ease',
                  transform: step === transferStep ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {transferStep === 1 && (
            <Box>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                Выберите карту для перевода:
              </Typography>

              <Stack spacing={1.5}>
                {cards
                  .filter((card) => card.balance > 0 && card.is_active)
                  .map((card) => (
                    <Card
                      key={card.id}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        borderRadius: 2,
                        border:
                          transferFromCard?.id === card.id ? `2px solid ${primaryColor}` : `1px solid ${theme.palette.divider}`,
                        bgcolor: transferFromCard?.id === card.id ? theme.palette.primary.light + '1A' : 'background.paper',
                        '&:hover': {
                          borderColor: primaryColor,
                          boxShadow: 1,
                        },
                      }}
                      onClick={() => handleTransferFromCardSelect(card)}
                    >
                      <CardContent sx={{ py: 2, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Chip
                              label={card.card_type === 'credit' ? 'CR' : 'DB'}
                              size="small"
                              color={card.card_type === 'credit' ? 'error' : 'primary'}
                              variant="filled"
                            />
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {card.card_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {card.card_number} • {getCardTypeLabel(card.card_type)}
                              </Typography>
                            </Box>
                          </Stack>
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                            {formatCurrency(card.balance, card.currency)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
              </Stack>

              {cards.filter((card) => card.balance > 0 && card.is_active).length === 0 && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Нет активных карт с достаточным балансом для перевода
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {transferStep === 2 && (
            <Box>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                Выберите карту получателя:
              </Typography>

              {transferFromCard && (
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: theme.palette.mode === 'dark' ? theme.palette.action.hover : theme.palette.primary.light + '1A',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.primary.light}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Chip
                      label={transferFromCard.card_type === 'credit' ? 'CR' : 'DB'}
                      size="small"
                      color={transferFromCard.card_type === 'credit' ? 'error' : 'primary'}
                      variant="filled"
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {transferFromCard.card_name}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="primary" fontWeight={600}>
                    {formatCurrency(transferFromCard.balance, transferFromCard.currency)}
                  </Typography>
                </Box>
              )}

              <Stack spacing={1.5}>
                {allCards
                  .filter((card) => card.id !== transferFromCard?.id && card.is_active)
                  .map((card) => (
                    <Card
                      key={card.id}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        borderRadius: 2,
                        border:
                          transferToCard?.id === card.id ? `2px solid ${primaryColor}` : `1px solid ${theme.palette.divider}`,
                        bgcolor: transferToCard?.id === card.id ? theme.palette.primary.light + '1A' : 'background.paper',
                        '&:hover': {
                          borderColor: primaryColor,
                          boxShadow: 1,
                        },
                      }}
                      onClick={() => handleTransferToCardSelect(card)}
                    >
                      <CardContent sx={{ py: 2, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Chip
                              label={card.card_type === 'credit' ? 'CR' : 'DB'}
                              size="small"
                              color={card.card_type === 'credit' ? 'error' : 'primary'}
                              variant="filled"
                            />
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {card.card_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {card.card_number} • {getCardTypeLabel(card.card_type)} • {card.user_name}
                              </Typography>
                            </Box>
                          </Stack>
                          <Typography variant="h6" color="secondary" sx={{ fontWeight: 700 }}>
                            {formatCurrency(card.balance, card.currency)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
              </Stack>
            </Box>
          )}

          {transferStep === 3 && (
            <Box>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                Введите сумму для перевода:
              </Typography>

              <Box
                sx={{
                  mb: 3,
                  p: 3,
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.action.hover : theme.palette.primary.light + '1A',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.primary.light}`,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 500, color: 'text.secondary' }}>
                  Детали перевода:
                </Typography>

                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Chip
                      label={transferFromCard?.card_type === 'credit' ? 'CR' : 'DB'}
                      size="small"
                      color={transferFromCard?.card_type === 'credit' ? 'error' : 'primary'}
                      variant="filled"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Откуда
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {transferFromCard?.card_name}
                    </Typography>
                  </Box>

                  <SwapHoriz color="primary" sx={{ fontSize: 30, flexShrink: 0 }} />

                  <Box sx={{ flex: 1 }}>
                    <Chip
                      label={transferToCard?.card_type === 'credit' ? 'CR' : 'DB'}
                      size="small"
                      color={transferToCard?.card_type === 'credit' ? 'error' : 'primary'}
                      variant="filled"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Куда
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {transferToCard?.card_name}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <TextField
                autoFocus
                fullWidth
                label="Сумма перевода"
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                inputProps={{
                  min: 0,
                  max: transferFromCard?.balance,
                }}
                helperText={`Максимум: ${formatCurrency(transferFromCard?.balance || 0, 'MR')}`}
                size="medium"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          {transferStep > 1 && (
            <Button onClick={handleTransferBack} variant="outlined" size="medium" sx={{ borderRadius: 1 }}>
              Назад
            </Button>
          )}

          <Button onClick={handleTransferCancel} variant="text" size="medium" color="inherit" sx={{ borderRadius: 1 }}>
            Отмена
          </Button>

          {transferStep === 1 && transferFromCard && (
            <Button onClick={() => setTransferStep(2)} variant="contained" size="medium" sx={{ borderRadius: 1 }}>
              Далее
            </Button>
          )}

          {transferStep === 2 && transferToCard && (
            <Button onClick={() => setTransferStep(3)} variant="contained" size="medium" sx={{ borderRadius: 1 }}>
              Далее
            </Button>
          )}

          {transferStep === 3 && (
            <Button
              onClick={handleTransferConfirm}
              variant="contained"
              size="medium"
              sx={{ borderRadius: 1 }}
              disabled={!transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > (transferFromCard?.balance || 0)}
            >
              Перевести
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>Настройки панели</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              select
              label="Плотность"
              value={dashSettings.density}
              onChange={(e) => persistSettings({ ...dashSettings, density: e.target.value as any })}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              <MenuItem value="comfortable">Обычная</MenuItem>
              <MenuItem value="compact">Компактная</MenuItem>
            </TextField>

            <TextField
              select
              label="Стиль карт"
              value={dashSettings.cardStyle}
              onChange={(e) => persistSettings({ ...dashSettings, cardStyle: e.target.value as any })}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              <MenuItem value="gradient">Градиент</MenuItem>
              <MenuItem value="solid">Плоский</MenuItem>
            </TextField>

            <TextField
              select
              label="Размер карточек"
              value={dashSettings.cardSize}
              onChange={(e) => persistSettings({ ...dashSettings, cardSize: e.target.value as any })}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              <MenuItem value="compact">Компактный</MenuItem>
              <MenuItem value="comfortable">Обычный</MenuItem>
              <MenuItem value="spacious">Просторный</MenuItem>
            </TextField>

            <TextField
              select
              label="Колонок на десктопе"
              value={dashSettings.columnsDesktop}
              onChange={(e) => persistSettings({ ...dashSettings, columnsDesktop: Number(e.target.value) as any })}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            >
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4</MenuItem>
            </TextField>

            <Stack spacing={1}>
              <Button
                variant={dashSettings.showStats ? 'contained' : 'outlined'}
                onClick={() => persistSettings({ ...dashSettings, showStats: !dashSettings.showStats })}
                sx={{ borderRadius: 1 }}
              >
                Показать статистику: {dashSettings.showStats ? 'Вкл' : 'Выкл'}
              </Button>
              <Button
                variant={dashSettings.showQuick ? 'contained' : 'outlined'}
                onClick={() => persistSettings({ ...dashSettings, showQuick: !dashSettings.showQuick })}
                sx={{ borderRadius: 1 }}
              >
                Быстрые действия: {dashSettings.showQuick ? 'Вкл' : 'Выкл'}
              </Button>
              <Button
                variant={dashSettings.showCards ? 'contained' : 'outlined'}
                onClick={() => persistSettings({ ...dashSettings, showCards: !dashSettings.showCards })}
                sx={{ borderRadius: 1 }}
              >
                Список карт: {dashSettings.showCards ? 'Вкл' : 'Выкл'}
              </Button>
              <Button
                variant={dashSettings.showLeaderboard ? 'contained' : 'outlined'}
                onClick={() => persistSettings({ ...dashSettings, showLeaderboard: !dashSettings.showLeaderboard })}
                sx={{ borderRadius: 1 }}
              >
                Таблица лидеров: {dashSettings.showLeaderboard ? 'Вкл' : 'Выкл'}
              </Button>
              <Button
                variant={dashSettings.showBackgroundPattern ? 'contained' : 'outlined'}
                onClick={() => persistSettings({ ...dashSettings, showBackgroundPattern: !dashSettings.showBackgroundPattern })}
                sx={{ borderRadius: 1 }}
              >
                Фоновый узор: {dashSettings.showBackgroundPattern ? 'Вкл' : 'Выкл'}
              </Button>
              <Button
                variant={dashSettings.privacyMode ? 'contained' : 'outlined'}
                onClick={() => persistSettings({ ...dashSettings, privacyMode: !dashSettings.privacyMode })}
                sx={{ borderRadius: 1 }}
              >
                Приватный режим баланса: {dashSettings.privacyMode ? 'Вкл' : 'Выкл'}
              </Button>
              <Button
                variant={dashSettings.cardHoverEffect ? 'contained' : 'outlined'}
                onClick={() => persistSettings({ ...dashSettings, cardHoverEffect: !dashSettings.cardHoverEffect })}
                sx={{ borderRadius: 1 }}
              >
                Эффект наведения: {dashSettings.cardHoverEffect ? 'Вкл' : 'Выкл'}
              </Button>
              <TextField
                select
                label="Скругление карточек"
                value={dashSettings.borderRadiusLevel}
                onChange={(e) => persistSettings({ ...dashSettings, borderRadiusLevel: e.target.value as any })}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              >
                <MenuItem value="sm">Маленькое</MenuItem>
                <MenuItem value="md">Среднее</MenuItem>
                <MenuItem value="lg">Большое</MenuItem>
              </TextField>
              <TextField
                select
                label="Акцентный цвет"
                value={dashSettings.accentColor}
                onChange={(e) => persistSettings({ ...dashSettings, accentColor: e.target.value as any })}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              >
                <MenuItem value="primary">Основной</MenuItem>
                <MenuItem value="secondary">Вторичный</MenuItem>
                <MenuItem value="success">Успех</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSettingsOpen(false)} variant="contained" sx={{ borderRadius: 1 }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};