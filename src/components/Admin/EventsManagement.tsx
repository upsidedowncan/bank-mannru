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
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
  Stack,
  InputAdornment,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Zoom,
  Badge,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Search as SearchIcon,
  ViewList as ListIcon,
  Timeline as TimelineIcon,
  PlaylistAddCheck as PreviewIcon,
  PlaylistAddCheck,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { format, parseISO, isAfter, isBefore, addMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EventTimeline } from './EventTimeline';
import { EventNotification } from '../Notifications/EventNotification';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'notification' | 'maintenance' | 'promotion' | 'system' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  affected_users?: string[] | null;
  send_notification: boolean;
  notification_sent: boolean;
}

interface EventFormData {
  title: string;
  description: string;
  type: 'notification' | 'maintenance' | 'promotion' | 'system' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
  send_notification: boolean;
}

export const EventsManagement: React.FC = () => {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('timeline');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    type: 'notification',
    priority: 'medium',
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: null,
    is_active: true,
    is_recurring: false,
    recurrence_pattern: '',
    send_notification: true,
  });

  // Initialize the events database table if needed
  useEffect(() => {
    const initEventsTable = async () => {
      try {
        // Check if the table exists or create it
        const { error } = await supabase.from('admin_events').select('id').limit(1);
        if (error && error.code === 'PGRST116') {
          // Table doesn't exist yet - this would normally be handled by a migration
          showSnackbar('События инициализируются. Если таблица не существует, создайте её через SQL.', 'info');
        }
      } catch (error) {
        console.error('Error checking events table:', error);
      }
    };
    initEventsTable();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase.from('admin_events').select('*').order('created_at', { ascending: false });
      
      // Apply filters if necessary
      if (!showPastEvents) {
        // Only show current and future events
        query = query.or(`end_date.gte.${new Date().toISOString()},end_date.is.null,is_active.eq.true`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      showSnackbar('Ошибка при загрузке событий', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!user) return;

      if (!formData.title || !formData.description || !formData.start_date) {
        showSnackbar('Пожалуйста, заполните все обязательные поля', 'error');
        return;
      }

      const eventData = {
        ...formData,
        created_by: user.id,
        notification_sent: false,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('admin_events')
          .update({
            ...eventData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
        showSnackbar('Событие обновлено', 'success');
      } else {
        const { error } = await supabase.from('admin_events').insert({
          ...eventData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        showSnackbar('Событие создано', 'success');
      }

      handleCloseDialog();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      showSnackbar('Ошибка при сохранении события', 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm(`Вы действительно хотите удалить это событие?`)) return;

    try {
      const { error } = await supabase.from('admin_events').delete().eq('id', id);
      if (error) throw error;
      showSnackbar('Событие удалено', 'success');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      showSnackbar('Ошибка при удалении события', 'error');
    }
  };

  const handleSendNotification = async (event: Event) => {
    if (!window.confirm(`Отправить уведомление всем пользователям о событии "${event.title}"?`)) return;

    try {
      // Create notifications for users in the user_messages table
      const { data: users, error: usersError } = await supabase.from('users').select('id');
      
      if (usersError) throw usersError;
      if (!users || users.length === 0) {
        showSnackbar('Нет пользователей для отправки уведомлений', 'error');
        return;
      }

      // Prepare message data
      const messageType = event.priority === 'critical' ? 'tech' : 'plain';
      const messageBody = `${event.title}\n\n${event.description}${event.end_date ? `\n\nДата окончания: ${formatDate(event.end_date)}` : ''}`;
      
      // Insert messages for all users
      const messages = users.map(u => ({
        user_id: u.id,
        message: messageBody,
        type: messageType,
        created_at: new Date().toISOString(),
        read: false,
      }));

      const { error: insertError } = await supabase.from('user_messages').insert(messages);
      if (insertError) throw insertError;

      // Mark notification as sent
      await supabase
        .from('admin_events')
        .update({ notification_sent: true })
        .eq('id', event.id);

      showSnackbar(`Уведомления отправлены ${users.length} пользователям`, 'success');
      fetchEvents();
    } catch (error) {
      console.error('Error sending notifications:', error);
      showSnackbar('Ошибка при отправке уведомлений', 'error');
    }
  };

  const handleToggleActive = async (event: Event) => {
    try {
      const { error } = await supabase
        .from('admin_events')
        .update({ is_active: !event.is_active })
        .eq('id', event.id);

      if (error) throw error;
      showSnackbar(`Событие ${event.is_active ? 'деактивировано' : 'активировано'}`, 'success');
      fetchEvents();
    } catch (error) {
      console.error('Error updating event status:', error);
      showSnackbar('Ошибка при изменении статуса события', 'error');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      type: event.type,
      priority: event.priority,
      start_date: event.start_date,
      end_date: event.end_date,
      is_active: event.is_active,
      is_recurring: event.is_recurring,
      recurrence_pattern: event.recurrence_pattern || '',
      send_notification: event.send_notification,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      type: 'notification',
      priority: 'medium',
      start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      end_date: null,
      is_active: true,
      is_recurring: false,
      recurrence_pattern: '',
      send_notification: true,
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbar({ 
      open: true, 
      message, 
      severity: severity as 'success' | 'error'
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy, HH:mm', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const getPriorityChip = (priority: string) => {
    const priorityColors = {
      low: 'info',
      medium: 'success',
      high: 'warning',
      critical: 'error',
    };

    return (
      <Chip
        label={
          priority === 'low' ? 'Низкий' :
          priority === 'medium' ? 'Средний' :
          priority === 'high' ? 'Высокий' :
          'Критический'
        }
        color={priorityColors[priority as keyof typeof priorityColors] as any}
        size="small"
      />
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'notification':
        return <NotificationsIcon />;
      case 'maintenance':
        return <WarningIcon color="warning" />;
      case 'promotion':
        return <EventIcon color="success" />;
      case 'system':
        return <InfoIcon color="info" />;
      default:
        return <EventIcon />;
    }
  };

  const getStatusChip = (event: Event) => {
    const now = new Date();
    const startDate = parseISO(event.start_date);
    const endDate = event.end_date ? parseISO(event.end_date) : null;
    
    let status = 'active';
    let label = 'Активно';
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'primary';
    
    if (!event.is_active) {
      status = 'inactive';
      label = 'Неактивно';
      color = 'default';
    } else if (isBefore(now, startDate)) {
      status = 'scheduled';
      label = 'Запланировано';
      color = 'info';
    } else if (endDate && isAfter(now, endDate)) {
      status = 'completed';
      label = 'Завершено';
      color = 'success';
    } else {
      status = 'active';
      label = 'Активно';
      color = 'primary';
    }
    
    return <Chip label={label} color={color} size="small" />;
  };

  const filteredEvents = events.filter(event => {
    // Apply search query
    const matchesSearch = searchQuery === '' || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply type filter
    const matchesType = typeFilter === '' || event.type === typeFilter;
    
    // Apply priority filter
    const matchesPriority = priorityFilter === '' || event.priority === priorityFilter;
    
    // Apply active filter
    const matchesActive = activeFilter === null || event.is_active === activeFilter;
    
    return matchesSearch && matchesType && matchesPriority && matchesActive;
  });

  // Function to show preview of an event
  const handlePreviewEvent = (event: Event) => {
    // Create a modified version of the event for preview
    const previewEventData = {
      ...event,
      // If the event has a future start date, temporarily set it to now for preview
      start_date: isAfter(parseISO(event.start_date), new Date()) 
        ? new Date().toISOString() 
        : event.start_date,
      // If the event has no end date, set one for preview purposes
      end_date: event.end_date || addMinutes(new Date(), 30).toISOString()
    };
    
    setPreviewEvent(previewEventData);
    setPreviewOpen(true);
  };

  // Count active and critical events
  const activeEventsCount = events.filter(e => e.is_active).length;
  const criticalEventsCount = events.filter(e => e.priority === 'critical' && e.is_active).length;

  return (
    <Box>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={2}
        sx={{
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -8,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: 'divider',
          }
        }}
      >
        <Box display="flex" alignItems="center">
          <Badge 
            badgeContent={activeEventsCount} 
            color="primary" 
            sx={{ mr: 2 }}
            overlap="circular"
          >
            <EventIcon fontSize="large" />
          </Badge>
          <Typography variant="h6">Управление событиями</Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) {
                setViewMode(newMode);
              }
            }}
            size="small"
          >
            <ToggleButton value="table">
              <Tooltip title="Табличный вид">
                <ListIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="timeline">
              <Tooltip title="Временная шкала">
                <TimelineIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Tooltip title="Создать событие">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Создать событие
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Тип события</InputLabel>
            <Select
              value={typeFilter}
              label="Тип события"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="notification">Уведомление</MenuItem>
              <MenuItem value="maintenance">Обслуживание</MenuItem>
              <MenuItem value="promotion">Акция</MenuItem>
              <MenuItem value="system">Системное</MenuItem>
              <MenuItem value="other">Другое</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Приоритет</InputLabel>
            <Select
              value={priorityFilter}
              label="Приоритет"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="medium">Средний</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
              <MenuItem value="critical">Критический</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={activeFilter === null ? '' : activeFilter ? 'active' : 'inactive'}
              label="Статус"
              onChange={(e) => {
                const value = e.target.value as string;
                if (value === '') setActiveFilter(null);
                else setActiveFilter(value === 'active');
              }}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="inactive">Неактивные</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={showPastEvents}
                onChange={(e) => setShowPastEvents(e.target.checked)}
              />
            }
            label="Показывать прошедшие события"
          />
        </FormGroup>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'timeline' ? (
        <EventTimeline 
          events={filteredEvents}
          onEditEvent={handleEdit}
          onDeleteEvent={handleDeleteEvent}
          onToggleActive={handleToggleActive}
          onSendNotification={handleSendNotification}
        />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Приоритет</TableCell>
                <TableCell>Начало</TableCell>
                <TableCell>Окончание</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Уведомление</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography sx={{ py: 2 }}>Событий не найдено</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTypeIcon(event.type)}
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {event.title}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {event.description.length > 60
                          ? `${event.description.substring(0, 60)}...`
                          : event.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {event.type === 'notification' ? 'Уведомление' :
                       event.type === 'maintenance' ? 'Обслуживание' :
                       event.type === 'promotion' ? 'Акция' :
                       event.type === 'system' ? 'Системное' : 'Другое'}
                    </TableCell>
                    <TableCell>{getPriorityChip(event.priority)}</TableCell>
                    <TableCell>{formatDate(event.start_date)}</TableCell>
                    <TableCell>{event.end_date ? formatDate(event.end_date) : '—'}</TableCell>
                    <TableCell>{getStatusChip(event)}</TableCell>
                    <TableCell>
                      {event.notification_sent ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Отправлено"
                          color="success"
                          size="small"
                        />
                      ) : event.send_notification ? (
                        <Tooltip title="Отправить уведомление">
                          <IconButton
                            size="small"
                            onClick={() => handleSendNotification(event)}
                          >
                            <NotificationsActiveIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <NotificationsOffIcon color="disabled" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Предпросмотр">
                          <IconButton
                            size="small"
                            onClick={() => handlePreviewEvent(event)}
                            color="info"
                          >
                            <PreviewIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(event)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(event)}
                          color={event.is_active ? 'warning' : 'success'}
                        >
                          {event.is_active ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteEvent(event.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEvent ? 'Редактировать событие' : 'Создать новое событие'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="Название события"
            fullWidth
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
          />

          <TextField
            label="Описание"
            fullWidth
            required
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
          />

          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            <FormControl fullWidth sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel>Тип события</InputLabel>
              <Select
                value={formData.type}
                label="Тип события"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <MenuItem value="notification">Уведомление</MenuItem>
                <MenuItem value="maintenance">Обслуживание</MenuItem>
                <MenuItem value="promotion">Акция</MenuItem>
                <MenuItem value="system">Системное</MenuItem>
                <MenuItem value="other">Другое</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={formData.priority}
                label="Приоритет"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <MenuItem value="low">Низкий</MenuItem>
                <MenuItem value="medium">Средний</MenuItem>
                <MenuItem value="high">Высокий</MenuItem>
                <MenuItem value="critical">Критический</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            <TextField
              label="Дата начала"
              type="datetime-local"
              fullWidth
              required
              sx={{ minWidth: 200, flex: 1 }}
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              label="Дата окончания"
              type="datetime-local"
              fullWidth
              sx={{ minWidth: 200, flex: 1 }}
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>

          <Box mt={2}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Активное событие"
              />
            </FormGroup>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  />
                }
                label="Повторяющееся событие"
              />
            </FormGroup>
            
            {formData.is_recurring && (
              <TextField
                label="Шаблон повторения"
                placeholder="Например: ежедневно, еженедельно, каждый понедельник..."
                fullWidth
                value={formData.recurrence_pattern || ''}
                onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value })}
                margin="normal"
              />
            )}
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.send_notification}
                    onChange={(e) => setFormData({ ...formData, send_notification: e.target.checked })}
                  />
                }
                label="Отправлять уведомление пользователям"
              />
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEvent ? 'Сохранить' : 'Создать'}
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

      {/* Floating action button for quick event creation */}
      <Zoom in={!dialogOpen}>
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      </Zoom>
      
      {/* Preview dialog */}
      {previewEvent && (
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Предпросмотр уведомления</DialogTitle>
          <DialogContent>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Так уведомление будет выглядеть для пользователей:
            </Typography>
            
            <Box 
              sx={{ 
                border: '1px dashed #ccc',
                borderRadius: 2,
                p: 2,
                mt: 1,
                position: 'relative',
                minHeight: 200,
                bgcolor: 'background.paper',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)'
              }}
            >
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                backdropFilter: 'blur(2px)',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: 2,
                zIndex: 1,
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Предпросмотр уведомления
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    // Close preview dialog
                    setPreviewOpen(false);
                    
                    // Wait a moment then show actual notification
                    setTimeout(() => {
                      if (previewEvent) {
                        // Create a virtual event for actual display
                        const virtualEvent = {
                          ...previewEvent,
                          // Force active state
                          is_active: true,
                        };
                        
                        setPreviewEvent(virtualEvent);
                        
                        // Show notification after a short delay
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('show-event-preview', { 
                            detail: { event: virtualEvent } 
                          }));
                        }, 100);
                      }
                    }, 500);
                  }}
                  startIcon={<PreviewIcon />}
                >
                  Показать настоящий предпросмотр
                </Button>
              </Box>
              
              {/* Preview content */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, opacity: 0.7 }}>
                {getTypeIcon(previewEvent.type)}
                <Typography variant="h6">{previewEvent.title}</Typography>
              </Box>
              <Typography variant="body1" sx={{ opacity: 0.7, mb: 2 }}>
                {previewEvent.description}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, opacity: 0.7 }}>
                <Button size="small" variant="text">Закрыть</Button>
                <Button size="small" variant="contained">OK</Button>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Real event notification component - only show when actively needed */}
      {false && <EventNotification />}
    </Box>
  );
};