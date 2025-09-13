import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar,
  Divider,
  Container,
} from '@mui/material';
import {
  Casino as CasinoIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  EmojiEvents as TrophyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';

interface Giveaway {
  id: string;
  title: string;
  description: string;
  prize_amount: number;
  currency: string;
  max_participants: number | null;
  current_participants: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  winner_id: string | null;
  created_at: string;
  winner_name?: string;
  is_participating?: boolean;
}

export const GiveawayFunction: React.FC = () => {
  const { user } = useAuthContext();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchGiveaways();

    // Set up real-time subscription for giveaways
    const giveawayChannel = supabase
      .channel('giveaways')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'giveaways' },
        () => {
          fetchGiveaways();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'giveaway_participants' },
        () => {
          fetchGiveaways();
        }
      )
      .subscribe();

    // Set up periodic check for ended giveaways (every 30 seconds)
    const interval = setInterval(() => {
      fetchGiveaways();
    }, 30000);

    return () => {
      supabase.removeChannel(giveawayChannel);
      clearInterval(interval);
    };
  }, []);

  const fetchGiveaways = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if current user is participating in each giveaway
      const giveawaysWithParticipation = await Promise.all(
        data?.map(async (giveaway) => {
          if (!user) return { ...giveaway, is_participating: false };

          const { data: participation } = await supabase
            .from('giveaway_participants')
            .select('id')
            .eq('giveaway_id', giveaway.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...giveaway,
            winner_name: giveaway.winner_id ? `User ${giveaway.winner_id.slice(0, 8)}...` : 'Unknown',
            is_participating: !!participation,
          };
        }) || []
      );

      setGiveaways(giveawaysWithParticipation);

      // Check for ended giveaways that need winners
      await checkAndSelectWinners(giveawaysWithParticipation);
    } catch (error) {
      console.error('Error fetching giveaways:', error);
      showSnackbar('Ошибка при загрузке розыгрышей', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkAndSelectWinners = async (giveaways: Giveaway[]) => {
    const now = new Date();
    
    for (const giveaway of giveaways) {
      // Skip if already has a winner or is still active
      if (giveaway.winner_id || giveaway.is_active === false) continue;
      
      const endDate = new Date(giveaway.end_date);
      
      // If giveaway has ended and no winner selected
      if (now > endDate) {
        try {
          await selectWinner(giveaway.id);
        } catch (error) {
          console.error('Error selecting winner for giveaway:', giveaway.id, error);
        }
      }
    }
  };

  const selectWinner = async (giveawayId: string) => {
    try {
      // Get all participants
      const { data: participants, error: participantsError } = await supabase
        .from('giveaway_participants')
        .select('user_id')
        .eq('giveaway_id', giveawayId);

      if (participantsError) throw participantsError;

      if (!participants || participants.length === 0) {
        console.log('No participants for giveaway:', giveawayId);
        return;
      }

      // Get giveaway details
      const { data: giveawayData, error: giveawayError } = await supabase
        .from('giveaways')
        .select('*')
        .eq('id', giveawayId)
        .single();

      if (giveawayError) throw giveawayError;

      // Randomly select winner
      const randomIndex = Math.floor(Math.random() * participants.length);
      const winnerId = participants[randomIndex].user_id;

      // Update giveaway with winner
      const { error: updateError } = await supabase
        .from('giveaways')
        .update({ winner_id: winnerId, is_active: false })
        .eq('id', giveawayId);

      if (updateError) throw updateError;

      // Add prize to winner's card
      const { data: winnerCards } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', winnerId)
        .eq('is_active', true)
        .limit(1);

      if (winnerCards && winnerCards.length > 0) {
        const card = winnerCards[0];
        await supabase
          .from('bank_cards')
          .update({ balance: card.balance + giveawayData.prize_amount })
          .eq('id', card.id);
      }

      console.log('Winner selected for giveaway:', giveawayId, 'Winner:', winnerId);
    } catch (error) {
      console.error('Error selecting winner:', error);
      throw error;
    }
  };

  const handleJoinGiveaway = async (giveawayId: string) => {
    if (!user) {
      showSnackbar('Вы должны быть авторизованы для участия', 'error');
      return;
    }

    setJoining(giveawayId);
    try {
      // Check if giveaway is still active and has space
      const giveaway = giveaways.find(g => g.id === giveawayId);
      if (!giveaway) throw new Error('Розыгрыш не найден');

      if (giveaway.winner_id) {
        showSnackbar('Розыгрыш уже завершен', 'error');
        return;
      }

      if (giveaway.max_participants !== null && giveaway.max_participants > 0 && giveaway.current_participants >= giveaway.max_participants) {
        showSnackbar('Достигнут лимит участников', 'error');
        return;
      }

      const now = new Date();
      const startDate = new Date(giveaway.start_date);
      const endDate = new Date(giveaway.end_date);

      if (now < startDate) {
        showSnackbar('Розыгрыш еще не начался', 'error');
        return;
      }

      if (now > endDate) {
        showSnackbar('Розыгрыш уже завершен', 'error');
        return;
      }

      // Join the giveaway
      const { error: joinError } = await supabase
        .from('giveaway_participants')
        .insert({
          giveaway_id: giveawayId,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      // Update participant count
      const { error: updateError } = await supabase
        .from('giveaways')
        .update({ current_participants: giveaway.current_participants + 1 })
        .eq('id', giveawayId);

      if (updateError) throw updateError;

      showSnackbar('Вы успешно присоединились к розыгрышу!', 'success');
      fetchGiveaways();
    } catch (error) {
      console.error('Error joining giveaway:', error);
      showSnackbar('Ошибка при присоединении к розыгрышу', 'error');
    } finally {
      setJoining(null);
    }
  };

  const handleLeaveGiveaway = async (giveawayId: string) => {
    if (!user) return;

    setJoining(giveawayId);
    try {
      const giveaway = giveaways.find(g => g.id === giveawayId);
      if (!giveaway) throw new Error('Розыгрыш не найден');

      // Leave the giveaway
      const { error: leaveError } = await supabase
        .from('giveaway_participants')
        .delete()
        .eq('giveaway_id', giveawayId)
        .eq('user_id', user.id);

      if (leaveError) throw leaveError;

      // Update participant count
      const { error: updateError } = await supabase
        .from('giveaways')
        .update({ current_participants: Math.max(0, giveaway.current_participants - 1) })
        .eq('id', giveawayId);

      if (updateError) throw updateError;

      showSnackbar('Вы покинули розыгрыш', 'success');
      fetchGiveaways();
    } catch (error) {
      console.error('Error leaving giveaway:', error);
      showSnackbar('Ошибка при выходе из розыгрыша', 'error');
    } finally {
      setJoining(null);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusChip = (giveaway: Giveaway) => {
    const now = new Date();
    const startDate = new Date(giveaway.start_date);
    const endDate = new Date(giveaway.end_date);

    if (giveaway.winner_id) {
      return <Chip label="Завершен" color="success" size="small" icon={<TrophyIcon />} />;
    } else if (now < startDate) {
      return <Chip label="Ожидает" color="warning" size="small" icon={<ScheduleIcon />} />;
    } else if (now >= startDate && now <= endDate) {
      return <Chip label="Активен" color="primary" size="small" icon={<CasinoIcon />} />;
    } else {
      return <Chip label="Завершен" color="error" size="small" />;
    }
  };

  const canParticipate = (giveaway: Giveaway) => {
    if (!user) return false;
    if (giveaway.winner_id) return false;
    if (giveaway.is_participating) return false;

    const now = new Date();
    const startDate = new Date(giveaway.start_date);
    const endDate = new Date(giveaway.end_date);

    if (now < startDate || now > endDate) return false;
    
    // Проверяем лимит участников только если он установлен (не null и не 0)
    if (giveaway.max_participants !== null && giveaway.max_participants > 0 && giveaway.current_participants >= giveaway.max_participants) return false;

    return true;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>Розыгрыши</Typography>
        <Divider sx={{ mb: 2 }} />
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Розыгрыши</Typography>
      <Divider sx={{ mb: 2 }} />
      
      {giveaways.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          В данный момент нет активных розыгрышей. Следите за обновлениями!
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {giveaways.map((giveaway) => (
            <Card key={giveaway.id} sx={{ position: 'relative' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {giveaway.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {giveaway.description}
                    </Typography>
                  </Box>
                  {getStatusChip(giveaway)}
                </Box>

                <Box display="flex" gap={2} mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrophyIcon color="primary" />
                    <Typography variant="subtitle1" color="primary">
                      {formatCurrency(giveaway.prize_amount, giveaway.currency)}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="action" />
                    <Typography variant="body2">
                      {giveaway.current_participants}
                      {giveaway.max_participants && ` / ${giveaway.max_participants}`}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={1} mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Начало: {formatDate(giveaway.start_date)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Окончание: {formatDate(giveaway.end_date)}
                  </Typography>
                </Box>

                {giveaway.winner_id && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Победитель: <strong>{giveaway.winner_name}</strong>
                    </Typography>
                  </Alert>
                )}

                {giveaway.is_participating && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CheckCircleIcon />
                      <Typography variant="body2">
                        Вы участвуете в этом розыгрыше!
                      </Typography>
                    </Box>
                  </Alert>
                )}



                <Box display="flex" gap={2}>
                  {canParticipate(giveaway) && (
                    <Button
                      variant="contained"
                      startIcon={<CasinoIcon />}
                      onClick={() => handleJoinGiveaway(giveaway.id)}
                      disabled={joining === giveaway.id}
                    >
                      {joining === giveaway.id ? <CircularProgress size={20} /> : 'Участвовать'}
                    </Button>
                  )}
                  

                  
                  {giveaway.is_participating && !giveaway.winner_id && (
                    <Button
                      variant="outlined"
                      onClick={() => handleLeaveGiveaway(giveaway.id)}
                      disabled={joining === giveaway.id}
                    >
                      {joining === giveaway.id ? <CircularProgress size={20} /> : 'Покинуть'}
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}; 