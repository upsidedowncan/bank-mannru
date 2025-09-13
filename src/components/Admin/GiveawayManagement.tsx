import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Casino as CasinoIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

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
}

interface CreateGiveawayForm {
  title: string;
  description: string;
  prize_amount: number;
  currency: string;
  max_participants: number | null;
  start_date: string;
  end_date: string;
}

export const GiveawayManagement: React.FC = () => {
  const { user } = useAuthContext();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState<CreateGiveawayForm>({
    title: '',
    description: '',
    prize_amount: 0,
    currency: 'MR',
    max_participants: null,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchGiveaways();
  }, []);

  const fetchGiveaways = async () => {
    try {
      const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const giveawaysWithWinnerNames = data?.map(giveaway => ({
        ...giveaway,
        winner_name: giveaway.winner_id ? `User ${giveaway.winner_id.slice(0, 8)}...` : 'Unknown',
      })) || [];

      setGiveaways(giveawaysWithWinnerNames);
    } catch (error) {
      console.error('Error fetching giveaways:', error);
      showSnackbar('Ошибка при загрузке розыгрышей', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      // Convert Moscow time to UTC for storage
      const convertMoscowToUTC = (moscowDateTime: string) => {
        // Create date object from Moscow time
        const date = new Date(moscowDateTime);
        
        // Get Moscow timezone offset (UTC+3)
        const moscowOffset = 3 * 60; // 3 hours in minutes
        const localOffset = date.getTimezoneOffset(); // Local timezone offset
        
        // Adjust for the difference between Moscow and local time
        const adjustedDate = new Date(date.getTime() + (localOffset + moscowOffset) * 60 * 1000);
        
        return adjustedDate.toISOString();
      };

      const giveawayData = {
        ...formData,
        start_date: convertMoscowToUTC(formData.start_date),
        end_date: convertMoscowToUTC(formData.end_date),
        created_by: user.id,
        current_participants: 0,
        is_active: true,
      };

      if (editingGiveaway) {
        const { error } = await supabase
          .from('giveaways')
          .update(giveawayData)
          .eq('id', editingGiveaway.id);
        if (error) throw error;
        showSnackbar('Розыгрыш обновлен!', 'success');
      } else {
        const { error } = await supabase
          .from('giveaways')
          .insert(giveawayData);
        if (error) throw error;
        showSnackbar('Розыгрыш создан!', 'success');
      }

      handleClose();
      fetchGiveaways();
    } catch (error) {
      console.error('Error saving giveaway:', error);
      showSnackbar('Ошибка при сохранении розыгрыша', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('giveaways')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showSnackbar('Розыгрыш удален!', 'success');
      fetchGiveaways();
    } catch (error) {
      console.error('Error deleting giveaway:', error);
      showSnackbar('Ошибка при удалении розыгрыша', 'error');
    }
  };

  const handleDrawWinner = async (giveaway: Giveaway) => {
    try {
      // Get all participants
      const { data: participants, error: participantsError } = await supabase
        .from('giveaway_participants')
        .select('user_id')
        .eq('giveaway_id', giveaway.id);

      if (participantsError) throw participantsError;

      if (!participants || participants.length === 0) {
        showSnackbar('Нет участников для розыгрыша', 'error');
        return;
      }

      // Randomly select winner
      const randomIndex = Math.floor(Math.random() * participants.length);
      const winnerId = participants[randomIndex].user_id;

      // Update giveaway with winner
      const { error: updateError } = await supabase
        .from('giveaways')
        .update({ winner_id: winnerId, is_active: false })
        .eq('id', giveaway.id);

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
          .update({ balance: card.balance + giveaway.prize_amount })
          .eq('id', card.id);
      }

      showSnackbar('Победитель выбран!', 'success');
      fetchGiveaways();
    } catch (error) {
      console.error('Error drawing winner:', error);
      showSnackbar('Ошибка при выборе победителя', 'error');
    }
  };

  const handleEdit = (giveaway: Giveaway) => {
    setEditingGiveaway(giveaway);
    
    // Convert UTC dates to Moscow time for the input fields
    const formatUTCToMoscow = (utcDateString: string) => {
      const date = new Date(utcDateString);
      
      // Get Moscow timezone offset (UTC+3)
      const moscowOffset = 3 * 60; // 3 hours in minutes
      const localOffset = date.getTimezoneOffset(); // Local timezone offset
      
      // Adjust for the difference between UTC and Moscow time
      const moscowDate = new Date(date.getTime() - (localOffset + moscowOffset) * 60 * 1000);
      
      const year = moscowDate.getFullYear();
      const month = String(moscowDate.getMonth() + 1).padStart(2, '0');
      const day = String(moscowDate.getDate()).padStart(2, '0');
      const hours = String(moscowDate.getHours()).padStart(2, '0');
      const minutes = String(moscowDate.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      title: giveaway.title,
      description: giveaway.description,
      prize_amount: giveaway.prize_amount,
      currency: giveaway.currency,
      max_participants: giveaway.max_participants,
      start_date: formatUTCToMoscow(giveaway.start_date),
      end_date: formatUTCToMoscow(giveaway.end_date),
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingGiveaway(null);
    setFormData({
      title: '',
      description: '',
      prize_amount: 0,
      currency: 'MR',
      max_participants: null,
      start_date: '',
      end_date: '',
    });
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
      return <Chip label="Завершен" color="success" size="small" />;
    } else if (now < startDate) {
      return <Chip label="Ожидает" color="warning" size="small" />;
    } else if (now >= startDate && now <= endDate) {
      return <Chip label="Активен" color="primary" size="small" />;
    } else {
      return <Chip label="Завершен" color="error" size="small" />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Управление розыгрышами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Создать розыгрыш
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Приз</TableCell>
              <TableCell>Участники</TableCell>
              <TableCell>Даты</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Победитель</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {giveaways.map((giveaway) => (
              <TableRow key={giveaway.id}>
                <TableCell>
                  <Typography variant="subtitle2">{giveaway.title}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {giveaway.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2">
                    {giveaway.prize_amount} {giveaway.currency}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {giveaway.current_participants}
                    {giveaway.max_participants && ` / ${giveaway.max_participants}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(giveaway.start_date)} - {formatDate(giveaway.end_date)}
                  </Typography>
                </TableCell>
                <TableCell>{getStatusChip(giveaway)}</TableCell>
                <TableCell>
                  {giveaway.winner_name ? (
                    <Typography variant="body2">{giveaway.winner_name}</Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Не выбран
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(giveaway)}
                      disabled={!!giveaway.winner_id}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(giveaway.id)}
                      disabled={!!giveaway.winner_id}
                    >
                      <DeleteIcon />
                    </IconButton>
                    {!giveaway.winner_id && giveaway.current_participants > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => handleDrawWinner(giveaway)}
                        color="primary"
                      >
                        <CasinoIcon />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGiveaway ? 'Редактировать розыгрыш' : 'Создать розыгрыш'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField
              label="Название"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              required
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Сумма приза"
                type="number"
                value={formData.prize_amount}
                onChange={(e) => setFormData({ ...formData, prize_amount: Number(e.target.value) })}
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>Валюта</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  label="Валюта"
                >
                  <MenuItem value="MR">MR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              label="Максимум участников"
              type="number"
              value={formData.max_participants || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                max_participants: e.target.value ? Number(e.target.value) : null 
              })}
              fullWidth
              helperText="Оставьте пустым для неограниченного количества"
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Дата и время начала (Москва)"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                helperText="Время указывается по московскому времени"
              />
              <TextField
                label="Дата и время окончания (Москва)"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                helperText="Время указывается по московскому времени"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingGiveaway ? 'Обновить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 