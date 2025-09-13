// src/components/VaultManagementPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  Card,
  CardContent,
  Divider,
  Alert,
  Skeleton,
  FormControl,
  InputLabel,
  Select,
  IconButton
} from '@mui/material';

import {
  ArrowDownward,
  ArrowUpward,
  AccountBalanceWallet as VaultIcon,
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
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

export const VaultManagementPage: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const navigate = useNavigate();

  const [vaultBalance, setVaultBalance] = useState<number>(0);
  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [vaultSelectedCard, setVaultSelectedCard] = useState<BankCard | null>(null);
  const [vaultAmount, setVaultAmount] = useState<string>('');
  const [vaultActionType, setVaultActionType] = useState<'deposit' | 'withdraw'>('deposit'); // State to control selected action

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

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setVaultBalance(data?.balance || 0);
    } catch (error: any) {
      console.error('Error fetching vault balance:', error);
      setError('Ошибка при загрузке баланса хранилища.');
      setVaultBalance(0);
    }
  }, [user]);

  const fetchCards = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setCards(data || []);
    } catch (error: any) {
      console.error('Error fetching cards:', error);
      setError('Ошибка при загрузке карт.');
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
      await Promise.all([fetchVaultBalance(), fetchCards()]);
      setLoading(false);
    };
    loadData();
  }, [fetchVaultBalance, fetchCards]);

  const handleVaultConfirm = async () => {
    if (!vaultSelectedCard || !user) {
      setError('Пожалуйста, выберите карту.');
      return;
    }
    const amount = parseFloat(vaultAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Введите корректную сумму.');
      return;
    }

    try {
      if (vaultActionType === 'deposit') {
        if (vaultSelectedCard.balance < amount) {
          setError('Недостаточно средств на карте для перевода в хранилище.');
          return;
        }

        const { error: cardError } = await supabase
          .from('bank_cards')
          .update({ balance: vaultSelectedCard.balance - amount })
          .eq('id', vaultSelectedCard.id);
        if (cardError) throw cardError;

        const { error: vaultError } = await supabase
          .from('user_vaults')
          .upsert(
            { user_id: user.id, balance: (vaultBalance || 0) + amount },
            { onConflict: 'user_id', ignoreDuplicates: false }
          );
        if (vaultError) throw vaultError;

        setError(null);
        fetchCards();
        fetchVaultBalance();
      } else { // withdraw
        if (vaultBalance < amount) {
          setError('Недостаточно средств в хранилище для вывода.');
          return;
        }

        const { error: vaultError } = await supabase
          .from('user_vaults')
          .update({ balance: vaultBalance - amount })
          .eq('user_id', user.id);
        if (vaultError) throw vaultError;

        const { error: cardError } = await supabase
          .from('bank_cards')
          .update({ balance: vaultSelectedCard.balance + amount })
          .eq('id', vaultSelectedCard.id);
        if (cardError) throw cardError;

        setError(null);
        fetchCards();
        fetchVaultBalance();
      }
    } catch (e: any) {
      console.error('Error during vault transaction:', e);
      setError(`Ошибка операции хранилища: ${e.message || e.error_description || 'Неизвестная ошибка'}`);
    } finally {
      setVaultAmount('');
      setVaultSelectedCard(null);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Skeleton variant="circular" width={60} height={60} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" sx={{ fontSize: '2rem', mx: 'auto', width: '60%' }} />
        <Skeleton variant="rectangular" height={200} sx={{ my: 4, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <PageHeader 
        title="Управление хранилищем" 
      />

      <Divider sx={{ mb: 4 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card elevation={4} sx={{ mb: 4, borderRadius: 3, bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.success.light + '20' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Текущий баланс хранилища
          </Typography>
          <Typography variant="h3" fontWeight={700} color={theme.palette.success.main} sx={{ mb: 3 }}>
            {formatCurrency(vaultBalance, 'MR')}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            {/* --- Dynamic Button Styling for Deposit/Withdraw --- */}
            <Button
              variant={vaultActionType === 'deposit' ? 'contained' : 'outlined'} // Contained if selected
              startIcon={<ArrowUpward />}
              onClick={() => setVaultActionType('deposit')}
              color="success"
              sx={{ borderRadius: 2 }}
            >
              Пополнить
            </Button>
            <Button
              variant={vaultActionType === 'withdraw' ? 'contained' : 'outlined'} // Contained if selected
              startIcon={<ArrowDownward />}
              onClick={() => setVaultActionType('withdraw')}
              color="error"
              sx={{ borderRadius: 2 }}
              disabled={vaultBalance <= 0} // Still disable if vault is empty
            >
              Вывести
            </Button>
            {/* --- End Dynamic Button Styling --- */}
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={3}>
            {vaultActionType === 'deposit' ? 'Перевести в хранилище' : 'Вывести из хранилища'}
          </Typography>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel id="vault-card-select-label">Выберите карту</InputLabel>
              <Select
                labelId="vault-card-select-label"
                value={vaultSelectedCard?.id || ''}
                label="Выберите карту"
                onChange={(e) => setVaultSelectedCard(cards.find((card) => card.id === e.target.value) || null)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
              >
                {cards
                  .filter((card) => card.is_active)
                  .map((card) => (
                    <MenuItem key={card.id} value={card.id}>
                      {card.card_name} ({formatCurrency(card.balance, card.currency)})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Сумма"
              type="number"
              value={vaultAmount}
              onChange={(e) => setVaultAmount(e.target.value)}
              inputProps={{ min: 0 }}
              helperText={
                vaultSelectedCard
                  ? `Доступно на карте: ${formatCurrency(vaultSelectedCard.balance, vaultSelectedCard.currency)} | В хранилище: ${formatCurrency(vaultBalance, 'MR')}`
                  : `В хранилище: ${formatCurrency(vaultBalance, 'MR')}`
              }
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
            />

            <Button
              variant="contained"
              color={vaultActionType === 'deposit' ? 'success' : 'error'}
              onClick={handleVaultConfirm}
              startIcon={vaultActionType === 'deposit' ? <ArrowUpward /> : <ArrowDownward />}
              disabled={
                !vaultSelectedCard ||
                !vaultAmount ||
                parseFloat(vaultAmount) <= 0 ||
                (vaultActionType === 'deposit' && vaultSelectedCard.balance < parseFloat(vaultAmount)) ||
                (vaultActionType === 'withdraw' && vaultBalance < parseFloat(vaultAmount))
              }
              sx={{ borderRadius: 2, py: 1.5 }}
            >
              {vaultActionType === 'deposit' ? 'Перевести в хранилище' : 'Вывести из хранилища'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};