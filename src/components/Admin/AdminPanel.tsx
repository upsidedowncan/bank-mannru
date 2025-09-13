import React, { useState, useEffect } from 'react';
import { AppLayout } from '../Layout/AppLayout';
import { Box, Tabs, Tab, Typography, Paper, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, MenuItem, Select, InputLabel, FormControl, Chip, Divider } from '@mui/material';
import { supabase } from '../../config/supabase';
import { Visibility, VisibilityOff, Delete } from '@mui/icons-material';
import { GiveawayManagement } from './GiveawayManagement';
import { ChatManagement } from './ChatManagement';

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  last_seen: string | null;
}

const MESSAGE_TYPES = [
  { value: 'plain', label: 'Обычное сообщение' },
  { value: 'html', label: 'HTML сообщение' },
  { value: 'lockout', label: 'Блокировка пользователя' },
  { value: 'tech', label: 'Техническая проблема' },
];

// Add BankCard interface for cards management
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

// Add MarketplaceItem interface for marketplace management
interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  images: string[];
  seller_id: string;
  location: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

// Add UserMessage interface for admin message management
interface UserMessage {
  id: string;
  user_id: string;
  message: string;
  type: string;
  data?: any;
  read?: boolean;
  created_at: string;
}

export const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgUser, setMsgUser] = useState<UserRow | null>(null);
  const [msgType, setMsgType] = useState('plain');
  const [msgText, setMsgText] = useState('');
  const [msgHtml, setMsgHtml] = useState('');
  const [lockoutDuration, setLockoutDuration] = useState('');
  const [lockoutReason, setLockoutReason] = useState('');
  const [lockoutUnit, setLockoutUnit] = useState<'minutes' | 'seconds'>('minutes');
  const [msgSending, setMsgSending] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  // Add state for cards management
  const [cards, setCards] = useState<BankCard[]>([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BankCard | null>(null);
  const [editValues, setEditValues] = useState<Partial<BankCard>>({});
  const [cardSnackbar, setCardSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  // Add state for marketplace management
  const [marketItems, setMarketItems] = useState<MarketplaceItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketError, setMarketError] = useState<string | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<MarketplaceItem | null>(null);
  const [marketSnackbar, setMarketSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  // Add state for admin message management
  const [allMessages, setAllMessages] = useState<UserMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const [msgTypeFilter, setMsgTypeFilter] = useState('');
  const [msgSnackbar, setMsgSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [massMsgType, setMassMsgType] = useState('plain');
  const [massMsgText, setMassMsgText] = useState('');
  const [massMsgHtml, setMassMsgHtml] = useState('');
  const [massMsgSending, setMassMsgSending] = useState(false);
  const [dismissingTech, setDismissingTech] = useState(false);

  useEffect(() => {
    if (tab === 0) {
      setLoading(true);
      supabase.from('users').select('*').then(({ data, error }) => {
        if (!error && data) setUsers(data);
        setLoading(false);
      });
    }
  }, [tab]);

  // Fetch cards for admin
  const fetchCards = async () => {
    setCardLoading(true);
    const { data, error } = await supabase
      .from('bank_cards')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCards(data);
    setCardLoading(false);
  };
  useEffect(() => {
    if (tab === 1) fetchCards();
  }, [tab]);

  // Fetch all marketplace items for admin
  const fetchMarketItems = async () => {
    try {
      setMarketLoading(true);
      setMarketError(undefined);
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMarketItems(data || []);
    } catch (error) {
      setMarketError('Ошибка при загрузке товаров');
    } finally {
      setMarketLoading(false);
    }
  };
  useEffect(() => {
    if (tab === 2) fetchMarketItems();
  }, [tab]);

  // Fetch all user messages for admin
  const fetchAllMessages = async () => {
    setMsgLoading(true);
    const { data, error } = await supabase
      .from('user_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setAllMessages(data);
    setMsgLoading(false);
  };
  useEffect(() => {
    if (tab === 3) fetchAllMessages();
  }, [tab]);

  const isOnline = (last_seen: string | null) => {
    if (!last_seen) return false;
    const last = new Date(last_seen).getTime();
    const now = Date.now();
    return now - last < 2 * 60 * 1000; // 2 minutes
  };

  const handleOpenMsgDialog = (user: UserRow) => {
    setMsgUser(user);
    setMsgType('plain');
    setMsgText('');
    setMsgHtml('');
    setLockoutDuration('');
    setLockoutReason('');
    setLockoutUnit('minutes');
    setMsgDialogOpen(true);
  };

  const handleSendMsg = async () => {
    if (!msgUser) return;
    setMsgSending(true);
    let message = msgText;
    let type = msgType;
    let data: any = null;
    if (type === 'html') {
      message = msgHtml;
    }
    if (type === 'lockout') {
      if (!lockoutDuration || isNaN(Number(lockoutDuration)) || Number(lockoutDuration) <= 0) {
        setSnackbar({ open: true, message: 'Укажите корректную длительность блокировки', severity: 'error' });
        setMsgSending(false);
        return;
      }
      data = { duration: Number(lockoutDuration), unit: lockoutUnit, reason: lockoutReason };
      const unitLabel = lockoutUnit === 'minutes' ? 'минут' : 'секунд';
      message = `Ваша учетная запись заблокирована на ${lockoutDuration} ${unitLabel}. Причина: ${lockoutReason}`;
    }
    const { error } = await supabase.from('user_messages').insert({ user_id: msgUser.id, message, type, data });
    setMsgSending(false);
    setMsgDialogOpen(false);
    if (error) {
      setSnackbar({ open: true, message: 'Ошибка при отправке сообщения', severity: 'error' });
    } else {
      setSnackbar({ open: true, message: 'Сообщение отправлено', severity: 'success' });
    }
  };

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
      setCardSnackbar({ open: true, message: 'Ошибка при обновлении карты', severity: 'error' });
    } else {
      setCardSnackbar({ open: true, message: 'Карта обновлена', severity: 'success' });
      setEditDialogOpen(false);
      fetchCards();
    }
  };
  const filteredCards = cards.filter(card =>
    card.card_name.toLowerCase().includes(cardSearch.toLowerCase()) ||
    card.card_number.includes(cardSearch) ||
    card.user_id.includes(cardSearch)
  );

  const handleToggleActiveMarket = async (item: MarketplaceItem) => {
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);
      if (error) throw error;
      fetchMarketItems();
    } catch (error) {
      setMarketSnackbar({ open: true, message: 'Ошибка при изменении статуса товара', severity: 'error' });
    }
  };
  const handleDeleteMarket = (item: MarketplaceItem) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };
  const handleConfirmDeleteMarket = async () => {
    if (!deletingItem) return;
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', deletingItem.id);
      if (error) throw error;
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      setMarketSnackbar({ open: true, message: 'Товар удалён', severity: 'success' });
      // Immediately refresh the list for live preview
      fetchMarketItems();
    } catch (error) {
      setMarketSnackbar({ open: true, message: 'Ошибка при удалении товара', severity: 'error' });
    }
  };
  const filteredMarketItems = marketItems.filter(item =>
    item.title.toLowerCase().includes(marketSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(marketSearch.toLowerCase()) ||
    item.seller_id.includes(marketSearch)
  );
  const marketConditions = { new: 'Новое', used: 'Б/у', refurbished: 'Восстановленное' };

  const filteredMessages = allMessages.filter(msg =>
    (msgSearch === '' || msg.message.toLowerCase().includes(msgSearch.toLowerCase()) || msg.user_id.includes(msgSearch)) &&
    (msgTypeFilter === '' || msg.type === msgTypeFilter)
  );
  const handleSendMassMessage = async () => {
    setMassMsgSending(true);
    let message = massMsgText;
    let type = massMsgType;
    if (type === 'html') message = massMsgHtml;
    try {
      // Fetch all user ids
      const { data: users, error: userError } = await supabase.from('users').select('id');
      if (userError) throw userError;
      const inserts = users.map((u: any) => ({ user_id: u.id, message, type }));
      const { error } = await supabase.from('user_messages').insert(inserts);
      if (error) throw error;
      setMsgSnackbar({ open: true, message: 'Массовое сообщение отправлено', severity: 'success' });
      setMassMsgText(''); setMassMsgHtml('');
      fetchAllMessages();
    } catch (error) {
      setMsgSnackbar({ open: true, message: 'Ошибка при отправке массового сообщения', severity: 'error' });
    } finally {
      setMassMsgSending(false);
    }
  };

  const handleDismissAllTechMessages = async () => {
    setDismissingTech(true);
    try {
      const { error } = await supabase
        .from('user_messages')
        .delete()
        .eq('type', 'tech');
      if (error) throw error;
      setMsgSnackbar({ open: true, message: 'Все технические сообщения скрыты', severity: 'success' });
      fetchAllMessages();
    } catch (error) {
      setMsgSnackbar({ open: true, message: 'Ошибка при скрытии сообщений', severity: 'error' });
    } finally {
      setDismissingTech(false);
    }
  };

  return (
    <AppLayout>
      <Box sx={{ width: '100%', height: '100%', p: { xs: 2, sm: 3, md: 4 }, mt: 0, boxSizing: 'border-box' }}>
        <Typography variant="h4" gutterBottom>Админ-панель</Typography>
        <Divider sx={{ mb: 2 }} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Пользователи" />
          <Tab label="Карты" />
          <Tab label="Маркет" />
          <Tab label="Сообщения" />
          <Tab label="Розыгрыши" />
          <Tab label="Чат" />
        </Tabs>
        {tab === 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>Пользователи</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}><CircularProgress /></Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Имя</TableCell>
                    <TableCell>Фамилия</TableCell>
                    <TableCell>Онлайн</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.first_name}</TableCell>
                      <TableCell>{u.last_name}</TableCell>
                      <TableCell>{isOnline(u.last_seen) ? '🟢' : '⚪️'}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handleOpenMsgDialog(u)}>Сообщение</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Dialog open={msgDialogOpen} onClose={() => setMsgDialogOpen(false)}>
              <DialogTitle>Отправить сообщение пользователю</DialogTitle>
              <DialogContent>
                <Typography sx={{ mb: 1 }}>{msgUser?.email}</Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="msg-type-label">Тип сообщения</InputLabel>
                  <Select
                    labelId="msg-type-label"
                    value={msgType}
                    label="Тип сообщения"
                    onChange={e => setMsgType(e.target.value)}
                  >
                    {MESSAGE_TYPES.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {msgType === 'plain' && (
                  <TextField
                    label="Сообщение"
                    fullWidth
                    multiline
                    minRows={2}
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    disabled={msgSending}
                    sx={{ mb: 2 }}
                  />
                )}
                {msgType === 'html' && (
                  <TextField
                    label="HTML код"
                    fullWidth
                    multiline
                    minRows={2}
                    value={msgHtml}
                    onChange={e => setMsgHtml(e.target.value)}
                    disabled={msgSending}
                    sx={{ mb: 2 }}
                  />
                )}
                {msgType === 'lockout' && (
                  <>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Длительность блокировки"
                        fullWidth
                        type="number"
                        value={lockoutDuration}
                        onChange={e => setLockoutDuration(e.target.value)}
                        disabled={msgSending}
                      />
                      <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel id="lockout-unit-label">Ед.</InputLabel>
                        <Select
                          labelId="lockout-unit-label"
                          value={lockoutUnit}
                          label="Ед."
                          onChange={e => setLockoutUnit(e.target.value as 'minutes' | 'seconds')}
                          disabled={msgSending}
                        >
                          <MenuItem value="minutes">минут</MenuItem>
                          <MenuItem value="seconds">секунд</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    <TextField
                      label="Причина блокировки"
                      fullWidth
                      value={lockoutReason}
                      onChange={e => setLockoutReason(e.target.value)}
                      disabled={msgSending}
                      sx={{ mb: 2 }}
                    />
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMsgDialogOpen(false)}>Отмена</Button>
                <Button onClick={handleSendMsg} disabled={msgSending || (msgType === 'plain' && !msgText.trim()) || (msgType === 'html' && !msgHtml.trim()) || (msgType === 'lockout' && (!lockoutDuration || isNaN(Number(lockoutDuration))))} variant="contained">Отправить</Button>
              </DialogActions>
            </Dialog>
            <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
              <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Box>
        )}
        {tab === 1 && (
          <Box>
            <Typography variant="h6">Карты</Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 2 }}>
              <TextField
                label="Поиск по названию, номеру или user_id"
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
                sx={{ width: { xs: '100%', md: 400 } }}
              />
            </Box>
            <Box sx={{ width: '100%', overflowX: 'auto', mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
                {filteredCards.map(card => (
                  <Paper key={card.id} sx={{ minWidth: 275, p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">User ID</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>{card.user_id}</Typography>
                        <Typography variant="h6" gutterBottom>{card.card_name}</Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>{card.card_number}</Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>{card.card_type}</Typography>
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
                  </Paper>
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
            <Snackbar open={cardSnackbar.open} autoHideDuration={3000} onClose={() => setCardSnackbar({ ...cardSnackbar, open: false })}>
              <Alert onClose={() => setCardSnackbar({ ...cardSnackbar, open: false })} severity={cardSnackbar.severity} sx={{ width: '100%' }}>
                {cardSnackbar.message}
              </Alert>
            </Snackbar>
          </Box>
        )}
        {tab === 2 && (
          <Box>
            <Typography variant="h6">Маркет</Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 2 }}>
              <TextField
                label="Поиск по названию, описанию или seller_id"
                value={marketSearch}
                onChange={e => setMarketSearch(e.target.value)}
                sx={{ width: { xs: '100%', md: 400 } }}
              />
            </Box>
            {marketError && (
              <Alert severity="error" sx={{ mb: 3 }}>{marketError}</Alert>
            )}
            <Box sx={{ width: '100%', overflowX: 'auto', mb: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
                {filteredMarketItems.map(item => (
                  <Paper key={item.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 275, p: 2 }}>
                    <Box>
                      <img
                        src={item.images && item.images.length > 0 ? item.images[0] : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7QndC10YIgbm90ZSDQv9GA0L7QuNC30L7QstCw0L3QuNC1PC90ZXh0Pjwvc3ZnPg==' }
                        alt={item.title}
                        style={{ width: '100%', height: 180, objectFit: 'cover', marginBottom: 8 }}
                      />
                      <Typography variant="h6" gutterBottom noWrap>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{item.description.length > 100 ? `${item.description.substring(0, 100)}...` : item.description}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Seller ID: {item.seller_id}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" color="primary">{item.price} {item.currency}</Typography>
                        <Chip label={marketConditions[item.condition]} size="small" color={item.condition === 'new' ? 'success' : 'default'} />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">{item.category}</Typography>
                        <Chip label={item.is_active ? 'Активно' : 'Неактивно'} size="small" color={item.is_active ? 'success' : 'default'} />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button size="small" startIcon={item.is_active ? <VisibilityOff /> : <Visibility />} onClick={() => handleToggleActiveMarket(item)} variant="outlined">{item.is_active ? 'Скрыть' : 'Показать'}</Button>
                        {/* For now, only allow delete. Edit can be added if needed. */}
                        <Button size="small" startIcon={<Delete />} onClick={() => handleDeleteMarket(item)} variant="outlined" color="error">Удалить</Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
              {filteredMarketItems.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>Нет товаров, соответствующих поиску</Typography>
                </Box>
              )}
            </Box>
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
              <DialogTitle>Подтверждение удаления</DialogTitle>
              <DialogContent>
                <Typography>Вы уверены, что хотите удалить товар "{deletingItem?.title}"? Это действие нельзя отменить.</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
                <Button onClick={handleConfirmDeleteMarket} color="error" variant="contained">Удалить</Button>
              </DialogActions>
            </Dialog>
            <Snackbar open={marketSnackbar.open} autoHideDuration={3000} onClose={() => setMarketSnackbar({ ...marketSnackbar, open: false })}>
              <Alert onClose={() => setMarketSnackbar({ ...marketSnackbar, open: false })} severity={marketSnackbar.severity} sx={{ width: '100%' }}>{marketSnackbar.message}</Alert>
            </Snackbar>
          </Box>
        )}
        {tab === 3 && (
          <Box>
            <Typography variant="h6">Сообщения</Typography>
            {/* Dismiss all tech messages button */}
            {allMessages.some(msg => msg.type === 'tech') && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDismissAllTechMessages}
                disabled={dismissingTech}
                sx={{ mb: 2 }}
              >
                Скрыть все технические сообщения
              </Button>
            )}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2, mb: 2 }}>
              <TextField
                label="Поиск по тексту или user_id"
                value={msgSearch}
                onChange={e => setMsgSearch(e.target.value)}
                sx={{ width: { xs: '100%', md: 300 } }}
              />
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel id="msg-type-filter-label">Тип</InputLabel>
                <Select
                  labelId="msg-type-filter-label"
                  value={msgTypeFilter}
                  label="Тип"
                  onChange={e => setMsgTypeFilter(e.target.value)}
                >
                  <MenuItem value="">Все</MenuItem>
                  <MenuItem value="plain">Обычное</MenuItem>
                  <MenuItem value="html">HTML</MenuItem>
                  <MenuItem value="lockout">Блокировка</MenuItem>
                  <MenuItem value="tech">Техническая проблема</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ width: '100%', overflowX: 'auto', mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Тип</TableCell>
                    <TableCell>Сообщение</TableCell>
                    <TableCell>Дата</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMessages.map(msg => (
                    <TableRow key={msg.id}>
                      <TableCell>{msg.user_id}</TableCell>
                      <TableCell>{
                        msg.type === 'plain' ? 'Обычное' :
                        msg.type === 'html' ? 'HTML' :
                        msg.type === 'lockout' ? 'Блокировка' :
                        msg.type === 'tech' ? 'Техническая проблема' : msg.type
                      }</TableCell>
                      <TableCell>{msg.message.length > 60 ? msg.message.substring(0, 60) + '...' : msg.message}</TableCell>
                      <TableCell>{new Date(msg.created_at).toLocaleString('ru-RU')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredMessages.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  <Typography variant="h6">Нет сообщений</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ my: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Массовое сообщение</Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="mass-msg-type-label">Тип сообщения</InputLabel>
                <Select
                  labelId="mass-msg-type-label"
                  value={massMsgType}
                  label="Тип сообщения"
                  onChange={e => setMassMsgType(e.target.value)}
                >
                  <MenuItem value="plain">Обычное сообщение</MenuItem>
                  <MenuItem value="html">HTML сообщение</MenuItem>
                  <MenuItem value="tech">Техническая проблема</MenuItem>
                </Select>
              </FormControl>
              {massMsgType === 'plain' && (
                <TextField
                  label="Сообщение"
                  fullWidth
                  multiline
                  minRows={2}
                  value={massMsgText}
                  onChange={e => setMassMsgText(e.target.value)}
                  disabled={massMsgSending}
                  sx={{ mb: 2 }}
                />
              )}
              {massMsgType === 'html' && (
                <TextField
                  label="HTML код"
                  fullWidth
                  multiline
                  minRows={2}
                  value={massMsgHtml}
                  onChange={e => setMassMsgHtml(e.target.value)}
                  disabled={massMsgSending}
                  sx={{ mb: 2 }}
                />
              )}
              {massMsgType === 'tech' && (
                <TextField
                  label="Текст технической проблемы"
                  fullWidth
                  multiline
                  minRows={2}
                  value={massMsgText}
                  onChange={e => setMassMsgText(e.target.value)}
                  disabled={massMsgSending}
                  sx={{ mb: 2 }}
                />
              )}
              <Button onClick={handleSendMassMessage} disabled={massMsgSending || (massMsgType === 'plain' && !massMsgText.trim()) || (massMsgType === 'html' && !massMsgHtml.trim()) || (massMsgType === 'tech' && !massMsgText.trim())} variant="contained">Отправить всем</Button>
            </Box>
            <Snackbar open={msgSnackbar.open} autoHideDuration={3000} onClose={() => setMsgSnackbar({ ...msgSnackbar, open: false })}>
              <Alert onClose={() => setMsgSnackbar({ ...msgSnackbar, open: false })} severity={msgSnackbar.severity} sx={{ width: '100%' }}>{msgSnackbar.message}</Alert>
            </Snackbar>
          </Box>
        )}
        {tab === 4 && (
          <GiveawayManagement />
        )}
        {tab === 5 && (
          <ChatManagement />
        )}
      </Box>
    </AppLayout>
  );
}; 