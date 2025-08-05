import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_public: boolean;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
}

const CHANNEL_ICONS = [
  { value: 'Chat', label: '💬 Чат' },
  { value: 'Store', label: '🏪 Магазин' },
  { value: 'SportsEsports', label: '🎮 Игры' },
  { value: 'Help', label: '❓ Помощь' },
  { value: 'Forum', label: '📝 Форум' },
  { value: 'Announcement', label: '📢 Объявления' },
  { value: 'Person', label: '👤 Персона' },
  { value: 'Group', label: '👥 Группа' },
  { value: 'School', label: '🎓 Образование' },
  { value: 'Work', label: '💼 Работа' },
  { value: 'Home', label: '🏠 Дом' },
  { value: 'Star', label: '⭐ Избранное' },
  { value: 'Music', label: '🎵 Музыка' },
  { value: 'Movie', label: '🎬 Фильмы' },
  { value: 'Book', label: '📚 Книги' },
  { value: 'Pets', label: '🐾 Питомцы' },
  { value: 'Sports', label: '⚽ Спорт' },
  { value: 'Food', label: '🍕 Еда' },
  { value: 'Travel', label: '✈️ Путешествия' },
  { value: 'Code', label: '💻 Программирование' },
  { value: 'Money', label: '💰 Финансы' },
  { value: 'Gift', label: '🎁 Подарки' },
  { value: 'Lightbulb', label: '💡 Идеи' },
  { value: 'Warning', label: '⚠️ Важно' },
];

export const ChannelManagement: React.FC = () => {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Chat',
    is_public: true,
    is_pinned: false,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('name');

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      showSnackbar('Ошибка при загрузке каналов', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenDialog = (channel?: ChatChannel) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        name: channel.name,
        description: channel.description,
        icon: channel.icon,
        is_public: channel.is_public,
        is_pinned: channel.is_pinned,
      });
    } else {
      setEditingChannel(null);
      setFormData({
        name: '',
        description: '',
        icon: 'Chat',
        is_public: true,
        is_pinned: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingChannel(null);
    setFormData({
      name: '',
      description: '',
      icon: 'Chat',
      is_public: true,
      is_pinned: false,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      showSnackbar('Заполните все обязательные поля', 'error');
      return;
    }

    try {
      if (editingChannel) {
        // Update existing channel
        const { error } = await supabase
          .from('chat_channels')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim(),
            icon: formData.icon,
            is_public: formData.is_public,
            is_pinned: formData.is_pinned,
          })
          .eq('id', editingChannel.id);

        if (error) throw error;
        showSnackbar('Канал обновлен', 'success');
      } else {
        // Create new channel
        const { error } = await supabase
          .from('chat_channels')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim(),
            icon: formData.icon,
            is_public: formData.is_public,
            is_pinned: formData.is_pinned,
            is_active: true,
          });

        if (error) throw error;
        showSnackbar('Канал создан', 'success');
      }

      handleCloseDialog();
      fetchChannels();
    } catch (error) {
      console.error('Error saving channel:', error);
      showSnackbar('Ошибка при сохранении канала', 'error');
    }
  };

  const handleDelete = async (channel: ChatChannel) => {
    if (!confirm(`Удалить канал "${channel.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channel.id);

      if (error) throw error;
      showSnackbar('Канал удален', 'success');
      fetchChannels();
    } catch (error) {
      console.error('Error deleting channel:', error);
      showSnackbar('Ошибка при удалении канала', 'error');
    }
  };

  const handleToggleActive = async (channel: ChatChannel) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ is_active: !channel.is_active })
        .eq('id', channel.id);

      if (error) throw error;
      showSnackbar(`Канал ${!channel.is_active ? 'активирован' : 'деактивирован'}`, 'success');
      fetchChannels();
    } catch (error) {
      console.error('Error toggling channel status:', error);
      showSnackbar('Ошибка при изменении статуса канала', 'error');
    }
  };

  const handleTogglePin = async (channel: ChatChannel) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .update({ is_pinned: !channel.is_pinned })
        .eq('id', channel.id);

      if (error) throw error;
      showSnackbar(`Канал ${!channel.is_pinned ? 'закреплен' : 'откреплен'}`, 'success');
      fetchChannels();
    } catch (error) {
      console.error('Error toggling pin status:', error);
      showSnackbar('Ошибка при изменении статуса закрепления', 'error');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Управление каналами</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Создать канал
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell>Иконка</TableCell>
                <TableCell>Публичный</TableCell>
                <TableCell>Активный</TableCell>
                <TableCell>Закреплен</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {channel.name}
                      {channel.is_pinned && <PinIcon color="primary" fontSize="small" />}
                    </Box>
                  </TableCell>
                  <TableCell>{channel.description}</TableCell>
                  <TableCell>
                    {CHANNEL_ICONS.find(icon => icon.value === channel.icon)?.label || channel.icon}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={channel.is_public ? 'Да' : 'Нет'}
                      color={channel.is_public ? 'success' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={channel.is_active}
                      onChange={() => handleToggleActive(channel)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleTogglePin(channel)}
                      color={channel.is_pinned ? 'primary' : 'default'}
                    >
                      {channel.is_pinned ? <PinIcon /> : <PinOutlinedIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(channel)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(channel)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingChannel ? 'Редактировать канал' : 'Создать канал'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Название канала"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="Описание"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Иконка</InputLabel>
            <Select
              value={formData.icon}
              label="Иконка"
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            >
              {CHANNEL_ICONS.map((icon) => (
                <MenuItem key={icon.value} value={icon.value}>
                  {icon.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              />
            }
            label="Публичный канал"
            sx={{ mb: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              />
            }
            label="Закрепить канал"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">
            {editingChannel ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 