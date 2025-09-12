import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { supabase } from '../config/supabase';
import PageHeader from './Layout/PageHeader';

interface BankCard {
  id: string;
  user_id: string;
  card_name: string;
  card_number: string;
  card_type: string;
  balance: number;
  currency: string;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  debt?: number;
}

export const Cheats: React.FC = () => {
  const [cards, setCards] = useState<BankCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BankCard | null>(null);
  const [editValues, setEditValues] = useState<Partial<BankCard>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bank_cards')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCards(data);
    setLoading(false);
  };

  useEffect(() => { fetchCards(); }, []);

  const handleEditClick = (card: BankCard) => {
    setSelectedCard(card);
    setEditValues(card);
    setEditDialogOpen(true);
  };

  const handleEditChange = (field: keyof BankCard, value: any) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!selectedCard) return;
    const { error } = await supabase
      .from('bank_cards')
      .update(editValues)
      .eq('id', selectedCard.id);
    if (error) {
      setSnackbar({ open: true, message: 'Ошибка при обновлении карты', severity: 'error' });
    } else {
      setSnackbar({ open: true, message: 'Карта обновлена', severity: 'success' });
      setEditDialogOpen(false);
      fetchCards();
    }
  };

  const filteredCards = cards.filter(card =>
    card.card_name.toLowerCase().includes(search.toLowerCase()) ||
    card.card_number.includes(search) ||
    card.user_id.includes(search)
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      <PageHeader title="CHEATS — Управление всеми картами" actions={
        <TextField
          label="Поиск по названию, номеру или user_id"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', md: 400 } }}
        />
      } />
      <Box sx={{ width: '100%', overflowX: 'auto', mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
          {filteredCards.map(card => (
            <Card key={card.id} sx={{ minWidth: 275 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">User ID</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>{card.user_id}</Typography>
                    <Typography variant="h6" gutterBottom>{card.card_name}</Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>{card.card_number}</Typography>
                    <Chip label={card.card_type} color={card.card_type === 'credit' ? 'error' : 'primary'} size="small" sx={{ mb: 1 }} />
                  </Box>
                </Box>
                <Typography variant="h5" sx={{ mb: 1 }}>{card.balance} {card.currency}</Typography>
                {card.debt !== undefined && (
                  <Typography variant="body2" color={card.debt > 0 ? 'error' : 'textSecondary'} sx={{ mb: 1 }}>
                    Долг: {card.debt}
                  </Typography>
                )}
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Активна: {card.is_active ? 'Да' : 'Нет'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Действует до: {new Date(card.expiry_date).toLocaleDateString('ru-RU')}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Создана: {new Date(card.created_at).toLocaleDateString('ru-RU')}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Обновлена: {new Date(card.updated_at).toLocaleDateString('ru-RU')}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => handleEditClick(card)}>
                  Редактировать
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
        {filteredCards.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Typography variant="h6">Нет карт, соответствующих поиску</Typography>
          </Box>
        )}
      </Box>
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать карту</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 1, sm: 3 } }}>
          <TextField fullWidth label="Название" value={editValues.card_name || ''} onChange={e => handleEditChange('card_name', e.target.value)} />
          <TextField fullWidth label="Номер" value={editValues.card_number || ''} onChange={e => handleEditChange('card_number', e.target.value)} />
          <TextField fullWidth label="Тип" value={editValues.card_type || ''} onChange={e => handleEditChange('card_type', e.target.value)} />
          <TextField fullWidth label="Баланс" type="number" value={editValues.balance ?? ''} onChange={e => handleEditChange('balance', Number(e.target.value))} />
          <TextField fullWidth label="Валюта" value={editValues.currency || ''} onChange={e => handleEditChange('currency', e.target.value)} />
          <TextField fullWidth label="Долг" type="number" value={editValues.debt ?? ''} onChange={e => handleEditChange('debt', Number(e.target.value))} />
          <TextField fullWidth label="Активна" value={editValues.is_active ? 'true' : 'false'} onChange={e => handleEditChange('is_active', e.target.value === 'true')} />
          <TextField fullWidth label="Дата истечения" value={editValues.expiry_date || ''} onChange={e => handleEditChange('expiry_date', e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleEditSave} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}; 