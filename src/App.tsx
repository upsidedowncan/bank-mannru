import React, { useState, useRef, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { theme, createAppTheme } from './theme/theme'
import { AppLayout } from './components/Layout/AppLayout'
import { LoginForm } from './components/Forms/LoginForm'
import { RegisterForm } from './components/Forms/RegisterForm'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import { Dashboard } from './components/Dashboard/Dashboard'
import { LandingPage } from './components/Landing/LandingPage'
import { Marketplace } from './components/Marketplace/Marketplace'
import { MarketplaceChat } from './components/Marketplace/MarketplaceChat'
import { MyListings } from './components/Marketplace/MyListings'
import { FeaturesMarketplace } from './components/Marketplace/FeaturesMarketplace'
import { Cheats } from './components/Cheats';
import { TappingGame } from './components/Games/TappingGame';
import { FlipGame } from './components/Games/FlipGame';
import { GiveawayFunction } from './components/Games/GiveawayFunction';
import { GlobalChat } from './components/Chat/GlobalChat';
import { AdminPanel } from './components/Admin/AdminPanel';
import { supabase } from './config/supabase';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, DialogProps, Box, Card, CardContent, Avatar, TextField, Divider, Chip, Snackbar, Alert, Switch, FormControl, Select, MenuItem, Container, Paper } from '@mui/material';
import { 
  Person, 
  Email, 
  CalendarToday, 
  Edit, 
  Save, 
  Cancel, 
  Logout, 
  Chat, 
  Palette, 
  Face,
  AccountCircle,
  SportsEsports,
  School,
  Work,
  Home,
  Favorite,
  Star,
  Diamond,
  ChildCare
} from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import { ThemeProvider as ThemeContextProvider } from './contexts/ThemeContext';

const Accounts = () => (
  <div>
    <h1>Счета</h1>
    <p>Информация о ваших счетах появится здесь.</p>
  </div>
)

const Payments = () => (
  <div>
    <h1>Платежи</h1>
    <p>Функционал платежей будет реализован здесь.</p>
  </div>
)

const Profile = () => {
  const { user } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: user?.user_metadata?.first_name || '',
    last_name: user?.user_metadata?.last_name || '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Chat settings state
  const [chatSettings, setChatSettings] = useState({
    chat_name: user?.user_metadata?.first_name || 'User',
    pfp_color: '#1976d2',
    pfp_icon: 'Person',
  });
  const [chatSettingsLoading, setChatSettingsLoading] = useState(false);

  // Load chat settings from the new table
  useEffect(() => {
    const loadChatSettings = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_chat_settings')
          .select('chat_name, pfp_color, pfp_icon')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading chat settings:', error);
          return;
        }
        
        if (data) {
          setChatSettings({
            chat_name: data.chat_name,
            pfp_color: data.pfp_color,
            pfp_icon: data.pfp_icon,
          });
        }
      } catch (error) {
        console.error('Error loading chat settings:', error);
      }
    };

    loadChatSettings();
  }, [user]);

  const pfpColors = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', 
    '#303f9f', '#c2185b', '#5d4037', '#455a64', '#ff6f00'
  ];

  const pfpIcons = [
    { value: 'Person', label: 'Пользователь', icon: Person },
    { value: 'Face', label: 'Лицо', icon: Face },
    { value: 'AccountCircle', label: 'Аккаунт', icon: AccountCircle },
    { value: 'SportsEsports', label: 'Игры', icon: SportsEsports },
    { value: 'School', label: 'Образование', icon: School },
    { value: 'Work', label: 'Работа', icon: Work },
    { value: 'Home', label: 'Дом', icon: Home },
    { value: 'ChildCare', label: 'Дети', icon: ChildCare },
    { value: 'Favorite', label: 'Избранное', icon: Favorite },
    { value: 'Star', label: 'Звезда', icon: Star },
    { value: 'Diamond', label: 'Алмаз', icon: Diamond },
  ];

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: editData.first_name,
          last_name: editData.last_name,
        }
      });
      if (error) throw error;
      setSnackbar({ open: true, message: 'Профиль обновлен успешно!', severity: 'success' });
      setIsEditing(false);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Ошибка при обновлении профиля', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      first_name: user?.user_metadata?.first_name || '',
      last_name: user?.user_metadata?.last_name || '',
    });
    setIsEditing(false);
  };

  const handleChatSettingsSave = async () => {
    if (!user) return;
    setChatSettingsLoading(true);
    try {
      // Upsert chat settings to the new table
      const { error } = await supabase
        .from('user_chat_settings')
        .upsert({
          user_id: user.id,
          chat_name: chatSettings.chat_name,
          pfp_color: chatSettings.pfp_color,
          pfp_icon: chatSettings.pfp_icon,
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
      setSnackbar({ open: true, message: 'Настройки чата обновлены!', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Ошибка при обновлении настроек чата', severity: 'error' });
    } finally {
      setChatSettingsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Профиль пользователя
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}>
              <Person sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" gutterBottom>
                {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
              </Typography>
              <Chip 
                label={user?.user_metadata?.isAdmin ? 'Администратор' : 'Пользователь'} 
                color={user?.user_metadata?.isAdmin ? 'error' : 'primary'}
                size="small"
              />
            </Box>
          </Box>

          {/* Fix the layout spacing and prevent text wrapping */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Email sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Email:
                </Typography>
                <Typography variant="body1">
                  {user?.email}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Регистрация:
                </Typography>
                <Typography variant="body1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Имя:
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editData.first_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                    size="small"
                    sx={{ width: 200 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {user?.user_metadata?.first_name || 'Не указано'}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Фамилия:
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editData.last_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                    size="small"
                    sx={{ width: 200 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {user?.user_metadata?.last_name || 'Не указано'}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {isEditing ? (
              <>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={loading}
                  startIcon={<Cancel />}
                >
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                  startIcon={<Save />}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => setIsEditing(true)}
                startIcon={<Edit />}
              >
                Редактировать
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Chat Settings Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chat />
            Настройки чата
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {/* Chat Name */}
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                Имя в чате
              </Typography>
              <TextField
                fullWidth
                value={chatSettings.chat_name}
                onChange={(e) => setChatSettings(prev => ({ ...prev, chat_name: e.target.value }))}
                placeholder="Введите имя для чата"
                size="small"
              />
            </Box>

            {/* Profile Picture Preview */}
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                Предпросмотр аватара
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    bgcolor: chatSettings.pfp_color,
                    fontSize: '1.5rem'
                  }}
                >
                  {(() => {
                    const selectedIcon = pfpIcons.find(icon => icon.value === chatSettings.pfp_icon);
                    if (selectedIcon) {
                      const IconComponent = selectedIcon.icon;
                      return <IconComponent sx={{ fontSize: '3rem', color: 'white', opacity: 0.7 }} />;
                    }
                    return chatSettings.pfp_icon;
                  })()}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {chatSettings.chat_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Пример сообщения
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Profile Picture Color */}
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                Цвет аватара
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {pfpColors.map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: chatSettings.pfp_color === color ? '3px solid #000' : '2px solid #ddd',
                      '&:hover': {
                        border: '3px solid #666',
                      }
                    }}
                    onClick={() => setChatSettings(prev => ({ ...prev, pfp_color: color }))}
                  />
                ))}
              </Box>
            </Box>

            {/* Profile Picture Icon */}
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                Иконка аватара
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {pfpIcons.map((iconOption) => {
                  const IconComponent = iconOption.icon;
                  return (
                    <Box
                      key={iconOption.value}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: chatSettings.pfp_color,
                        cursor: 'pointer',
                        border: chatSettings.pfp_icon === iconOption.value ? '3px solid #000' : '2px solid #ddd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        '&:hover': {
                          border: '3px solid #666',
                        }
                      }}
                      onClick={() => setChatSettings(prev => ({ ...prev, pfp_icon: iconOption.value }))}
                    >
                      <IconComponent sx={{ fontSize: '1.5rem', color: 'white', opacity: 0.7 }} />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleChatSettingsSave}
              disabled={chatSettingsLoading}
              startIcon={<Save />}
            >
              {chatSettingsLoading ? 'Сохранение...' : 'Сохранить настройки чата'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Информация о системе
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                ID пользователя:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {user?.id}
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                Последний вход:
              </Typography>
              <Typography variant="body2">
                {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Неизвестно'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  
  // Get theme from localStorage for now
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    return savedTheme || 'light';
  });

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setThemeMode(newTheme);
    localStorage.setItem('theme', newTheme);
    // Reload page to apply theme
    window.location.reload();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Настройки
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Внешний вид
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body1" gutterBottom>
                Тема оформления
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={themeMode}
                  onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
                >
                  <MenuItem value="light">Светлая</MenuItem>
                  <MenuItem value="dark">Темная</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Выберите предпочитаемую тему оформления
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

function AppContent() {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const { user } = useAuthContext();
  // Message dialog state
  const [userMsg, setUserMsg] = useState<any>(null);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<any>(null);
  
  // Use ref to access current userMsg in callbacks
  const userMsgRef = useRef(userMsg);
  userMsgRef.current = userMsg;

  useEffect(() => {
    if (!user || user.user_metadata?.isAdmin) return;
    // --- Realtime subscription for instant messages ---
    const channel = supabase.channel('user-messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_messages',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        console.log('INSERT event received:', payload);
        const msg = payload.new;
        if (!msg.read) {
          setUserMsg(msg);
          setMsgDialogOpen(true);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_messages',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        console.log('UPDATE event received:', payload);
        const updatedMsg = payload.new;
        // If current message was marked as read, close dialog
        if (userMsgRef.current && userMsgRef.current.id === updatedMsg.id && updatedMsg.read) {
          console.log('Closing dialog for read message:', updatedMsg.id);
          setMsgDialogOpen(false);
          setUserMsg(null);
          setLockoutTimeLeft(null);
          if (lockoutTimer) clearInterval(lockoutTimer);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_messages'
      }, payload => {
        console.log('DELETE event received (all):', payload);
        const deletedMsg = payload.old;
        // If the currently displayed message was deleted, close the dialog
        if (userMsgRef.current && userMsgRef.current.id === deletedMsg.id) {
          console.log('Closing dialog for deleted message:', deletedMsg.id);
          setMsgDialogOpen(false);
          setUserMsg(null);
          setLockoutTimeLeft(null);
          if (lockoutTimer) clearInterval(lockoutTimer);
        }
      })
      .subscribe();
    // --- Polling fallback ---
    let interval: any;
    const pollMessages = async () => {
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: true })
        .limit(1);
      if (!error && data && data.length > 0) {
        setUserMsg(data[0]);
        setMsgDialogOpen(true);
      }
    };
    pollMessages();
    interval = setInterval(pollMessages, 10000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    // Lockout logic
    if (userMsg && userMsg.type === 'lockout' && userMsg.data && userMsg.data.duration) {
      // If already locked out, don't restart timer
      if (lockoutTimeLeft !== null) return;
      let totalSeconds = 0;
      if (userMsg.data.unit === 'seconds') {
        totalSeconds = userMsg.data.duration;
      } else {
        totalSeconds = userMsg.data.duration * 60;
      }
      setLockoutTimeLeft(totalSeconds);
      const timer = setInterval(() => {
        setLockoutTimeLeft(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-close and mark as read
            setTimeout(() => handleCloseMsgDialog(), 500); // slight delay to allow UI update
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setLockoutTimer(timer);
      return () => clearInterval(timer);
    }
    // Cleanup timer if not lockout
    return () => {
      if (lockoutTimer) clearInterval(lockoutTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMsg]);

  const handleCloseMsgDialog = async () => {
    setMsgDialogOpen(false);
    if (userMsg) {
      await supabase.from('user_messages').update({ read: true }).eq('id', userMsg.id);
      setUserMsg(null);
      setLockoutTimeLeft(null);
      if (lockoutTimer) clearInterval(lockoutTimer);
    }
  };

  const handleLogin = async (data: any) => {
    setIsLoading(true)
    setError(undefined)
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    
    if (error) {
      setError(error.message)
    }
    
    setIsLoading(false)
  }

  const handleRegister = async (data: any) => {
    setIsLoading(true)
    setError(undefined)
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      },
    });
    
    if (error) {
      setError(error.message)
    } else {
      setError('Проверьте вашу почту для подтверждения регистрации')
    }
    
    setIsLoading(false)
  }

  const handleSwitchToRegister = () => {
    setIsLoginMode(false)
    setError(undefined)
  }

  const handleSwitchToLogin = () => {
    setIsLoginMode(true)
    setError(undefined)
  }

  // Render message content based on type
  let dialogContent = null;
  if (userMsg) {
    if (userMsg.type === 'html') {
      // WARNING: In production, sanitize HTML to prevent XSS!
      dialogContent = <div dangerouslySetInnerHTML={{ __html: userMsg.message }} />;
    } else if (userMsg.type === 'lockout') {
      dialogContent = (
        <>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>Ваша учетная запись заблокирована!</Typography>
          <Typography sx={{ mb: 2 }}>{userMsg.data?.reason || ''}</Typography>
          <Typography sx={{ mb: 1 }}>
            Блокировка: {userMsg.data.duration} {userMsg.data.unit === 'seconds' ? 'секунд' : 'минут'}.
          </Typography>
          {lockoutTimeLeft !== null && lockoutTimeLeft > 0 ? (
            <Typography>Осталось: {Math.floor(lockoutTimeLeft / 60)}:{(lockoutTimeLeft % 60).toString().padStart(2, '0')}</Typography>
          ) : (
            <Typography color="success.main">Блокировка снята. Вы можете продолжить работу.</Typography>
          )}
        </>
      );
    } else if (userMsg.type === 'tech') {
      dialogContent = (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
            Важное техническое сообщение
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
            {userMsg.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Это сообщение отправлено администрацией и не может быть закрыто.
          </Typography>
        </Box>
      );
    } else {
      dialogContent = <Typography>{userMsg.message}</Typography>;
    }
  }

  // Custom lockout dialog props
  const lockoutDialogProps: Partial<DialogProps> =
    userMsg?.type === 'lockout' && lockoutTimeLeft && lockoutTimeLeft > 0
    ? {
        disableEscapeKeyDown: true,
        onClose: undefined,
        PaperProps: {
          sx: {
            bgcolor: 'error.main',
            color: 'white',
            border: '4px solid #b71c1c',
            boxShadow: 8,
            textAlign: 'center',
          },
        },
        BackdropProps: {
          style: { backgroundColor: 'rgba(183,28,28,0.85)' },
        },
      }
      : userMsg?.type === 'tech'
      ? {
          disableEscapeKeyDown: true,
          onClose: undefined,
      }
    : {};

  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              isLoginMode ? (
                <LoginForm 
                  onSubmit={handleLogin} 
                  onRegisterClick={handleSwitchToRegister}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <RegisterForm 
                  onSubmit={handleRegister} 
                  onLoginClick={handleSwitchToLogin}
                  isLoading={isLoading}
                  error={error}
                />
              )
            )
          } 
        />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="payments" element={<Payments />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        <Route path="/marketplace" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Marketplace />} />
          <Route path="chat" element={<MarketplaceChat />} />
          <Route path="my-listings" element={<MyListings />} />
        </Route>

        <Route path="/features-marketplace" element={<ProtectedRoute><AppLayout><FeaturesMarketplace /></AppLayout></ProtectedRoute>} />
        <Route path="/darkhaxorz6557453555c3h2he1a6t8s" element={<AppLayout><Cheats /></AppLayout>} />
        <Route path="/games/tapping" element={<TappingGame />} />
        <Route path="/games/flip" element={<AppLayout><FlipGame /></AppLayout>} />
        <Route path="/giveaways" element={<AppLayout><GiveawayFunction /></AppLayout>} />
        <Route path="/chat" element={<AppLayout><GlobalChat /></AppLayout>} />
        <Route path="/admin" element={user && user.user_metadata?.isAdmin ? <AdminPanel /> : <div style={{padding: 32, textAlign: 'center'}}><h2>Not authorized</h2></div>} />
        
        {/* Landing page as main page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* User message dialog */}
      <Dialog
        open={msgDialogOpen}
        onClose={userMsg?.type === 'lockout' && lockoutTimeLeft && lockoutTimeLeft > 0 ? undefined : handleCloseMsgDialog}
        maxWidth="xs"
        fullWidth
        {...lockoutDialogProps}
      >
        <DialogTitle sx={userMsg?.type === 'lockout' ? { color: 'white', bgcolor: 'error.dark', fontWeight: 'bold' } : {}}>
          {userMsg?.type === 'lockout' ? 'Блокировка' : userMsg?.type === 'html' ? 'HTML сообщение' : 'Сообщение от администрации'}
        </DialogTitle>
        <DialogContent>
          {dialogContent}
        </DialogContent>
        <DialogActions sx={userMsg?.type === 'lockout' ? { display: 'flex', justifyContent: 'center', bgcolor: 'error.main' } : userMsg?.type === 'tech' ? { display: 'none' } : {}}>
          {userMsg?.type === 'lockout' && lockoutTimeLeft && lockoutTimeLeft > 0 ? null :
            userMsg?.type === 'tech' ? null : (
            <Button onClick={handleCloseMsgDialog} variant="contained">OK</Button>
            )
          }
        </DialogActions>
      </Dialog>
    </>
  )
}

function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    return savedTheme || 'light';
  });

  const currentTheme = createAppTheme(themeMode);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <ThemeContextProvider themeMode={themeMode} setThemeMode={setThemeMode}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
      </ThemeContextProvider>
    </ThemeProvider>
  )
}

export default App
