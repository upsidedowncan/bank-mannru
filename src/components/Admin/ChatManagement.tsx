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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Chat as ChatIcon,
  Store as StoreIcon,
  SportsEsports as GamingIcon,
  Help as HelpIcon,
  Forum as ForumIcon,
  Announcement as AnnouncementIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_public: boolean;
  is_active: boolean;
  is_pinned: boolean;
  admin_only: boolean;
  created_at: string;
  message_count?: number;
}

interface CreateChannelForm {
  name: string;
  description: string;
  icon: string;
  is_public: boolean;
  is_pinned: boolean;
  admin_only: boolean;
}

const iconOptions = [
  { value: 'Chat', label: 'Общий чат', icon: ChatIcon },
  { value: 'Store', label: 'Магазин', icon: StoreIcon },
  { value: 'SportsEsports', label: 'Игры', icon: GamingIcon },
  { value: 'Help', label: 'Помощь', icon: HelpIcon },
  { value: 'Forum', label: 'Форум', icon: ForumIcon },
  { value: 'Announcement', label: 'Объявления', icon: AnnouncementIcon },
];

export const ChatManagement: React.FC = () => {
  const { user } = useAuthContext();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState<CreateChannelForm>({
    name: '',
    description: '',
    icon: 'Chat',
    is_public: true,
    is_pinned: false,
    admin_only: false,
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select(`
          *,
          message_count:chat_messages(count)
        `)
        .order('name');

      if (error) throw error;

      const channelsWithCount = data?.map(channel => ({
        ...channel,
        message_count: channel.message_count?.[0]?.count || 0,
      })) || [];

      setChannels(channelsWithCount);
    } catch (error) {
      console.error('Error fetching channels:', error);
      showSnackbar('Ошибка при загрузке каналов', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const channelData = {
        ...formData,
        created_by: user.id,
        is_active: true,
      };

      if (editingChannel) {
        const { error } = await supabase
          .from('chat_channels')
          .update(channelData)
          .eq('id', editingChannel.id);
        if (error) throw error;
        showSnackbar('Канал обновлен!', 'success');
      } else {
        const { error } = await supabase
          .from('chat_channels')
          .insert(channelData);
        if (error) throw error;
        showSnackbar('Канал создан!', 'success');
      }

      handleClose();
      fetchChannels();
    } catch (error) {
      console.error('Error saving channel:', error);
      showSnackbar('Ошибка при сохранении канала', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showSnackbar('Канал удален!', 'success');
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
      showSnackbar(`Канал ${channel.is_active ? 'деактивирован' : 'активирован'}!`, 'success');
      fetchChannels();
    } catch (error) {
      console.error('Error toggling channel:', error);
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
      showSnackbar(`Канал ${channel.is_pinned ? 'откреплен' : 'закреплен'}!`, 'success');
      fetchChannels();
    } catch (error) {
      console.error('Error toggling pin status:', error);
      showSnackbar('Ошибка при изменении статуса закрепления', 'error');
    }
  };

  const handleEdit = (channel: ChatChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      description: channel.description,
      icon: channel.icon,
      is_public: channel.is_public,
      is_pinned: channel.is_pinned,
      admin_only: channel.admin_only,
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingChannel(null);
    setFormData({
      name: '',
      description: '',
      icon: 'Chat',
      is_public: true,
      is_pinned: false,
      admin_only: false,
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(option => option.value === iconName);
    return iconOption ? <iconOption.icon /> : <ChatIcon />;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Управление чатом</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Создать канал
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Канал</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Закреплен</TableCell>
              <TableCell>Только админы</TableCell>
              <TableCell>Сообщения</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getIconComponent(channel.icon)}
                    <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                      {channel.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {channel.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={channel.is_public ? 'Публичный' : 'Приватный'} 
                    color={channel.is_public ? 'success' : 'warning'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={channel.is_active ? 'Активен' : 'Неактивен'} 
                    color={channel.is_active ? 'primary' : 'error'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleTogglePin(channel)}
                    color={channel.is_pinned ? 'primary' : 'default'}
                  >
                    {channel.is_pinned ? <PinIcon /> : <PinOutlinedIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={channel.admin_only ? 'Да' : 'Нет'} 
                    color={channel.admin_only ? 'error' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {channel.message_count || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(channel)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleActive(channel)}
                      color={channel.is_active ? 'warning' : 'success'}
                      title={channel.is_active ? 'Деактивировать' : 'Активировать'}
                    >
                      {channel.is_active ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(channel.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingChannel ? 'Редактировать канал' : 'Создать канал'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField
              label="Название канала"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              helperText="Используйте только латинские буквы, цифры и дефисы"
            />
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Иконка</InputLabel>
              <Select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                label="Иконка"
              >
                {iconOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <option.icon />
                      {option.label}
                    </Box>
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
            <FormControlLabel
              control={
                <Switch
                  checked={formData.admin_only}
                  onChange={(e) => setFormData({ ...formData, admin_only: e.target.checked })}
                />
              }
              label="Только для администраторов"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingChannel ? 'Обновить' : 'Создать'}
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