import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';

interface CheatSetting {
  id: string;
  user_id: string;
  always_win_flip: boolean;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export const CheatSettings: React.FC = () => {
  const { user } = useAuthContext();
  const [cheatSettings, setCheatSettings] = useState<CheatSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchCheatSettings();
  }, []);

  const fetchCheatSettings = async () => {
    try {
      setLoading(true);
      
      // First get all user cheats
      const { data: cheatData, error: cheatError } = await supabase
        .from('user_cheats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (cheatError) throw cheatError;
      
      // Get user details for each cheat setting
      const userIds = cheatData?.map(cheat => cheat.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .in('id', userIds);

        if (userError) throw userError;

        // Combine cheat data with user data
        const combinedData = cheatData?.map(cheat => {
          const matchedUser = userData?.find(u => u.id === cheat.user_id);
          return {
            ...cheat,
            user_email: matchedUser?.email,
            user_name: matchedUser ? `${matchedUser.first_name || ''} ${matchedUser.last_name || ''}` : 'Unknown User',
          };
        });

        setCheatSettings(combinedData || []);
      } else {
        setCheatSettings(cheatData || []);
      }
    } catch (error) {
      console.error('Error fetching cheat settings:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при загрузке настроек читов',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlwaysWin = async (userId: string, currentValue: boolean) => {
    try {
      // Check if the user already has a cheat setting
      const { data, error } = await supabase
        .from('user_cheats')
        .select('id')
        .eq('user_id', userId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('user_cheats')
          .update({ always_win_flip: !currentValue })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Create new entry
        const { error: insertError } = await supabase
          .from('user_cheats')
          .insert({ user_id: userId, always_win_flip: true });

        if (insertError) throw insertError;
      }

      // Refresh data
      fetchCheatSettings();
      setSnackbar({
        open: true,
        message: 'Настройки чита успешно обновлены',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error toggling cheat setting:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при обновлении настроек чита',
        severity: 'error',
      });
    }
  };

  const searchForUser = async () => {
    if (!searchTerm.trim()) {
      return;
    }

    try {
      setSearching(true);
      
      // Search by email or UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);
      
      let userQuery;
      if (isUUID) {
        // Search by user ID
        userQuery = supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('id', searchTerm);
      } else {
        // Search by email (case insensitive)
        userQuery = supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .ilike('email', `%${searchTerm}%`);
      }

      const { data: foundUsers, error: userError } = await userQuery;

      if (userError) throw userError;

      // If users found, check which ones have cheat settings
      if (foundUsers && foundUsers.length > 0) {
        const userIds = foundUsers.map(u => u.id);

        const { data: existingCheats, error: cheatError } = await supabase
          .from('user_cheats')
          .select('*')
          .in('user_id', userIds);

        if (cheatError) throw cheatError;

        // Combine user data with existing cheat settings
        const results = foundUsers.map(user => {
          const cheatSetting = existingCheats?.find(cheat => cheat.user_id === user.id);
          return {
            ...user,
            user_id: user.id,
            user_email: user.email,
            user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User',
            always_win_flip: cheatSetting?.always_win_flip || false,
            id: cheatSetting?.id || user.id,
            created_at: cheatSetting?.created_at || new Date().toISOString(),
            updated_at: cheatSetting?.updated_at || new Date().toISOString(),
            has_existing_settings: !!cheatSetting
          };
        });

        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching for users:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при поиске пользователей',
        severity: 'error',
      });
    } finally {
      setSearching(false);
    }
  };

  const filteredSettings = searchTerm 
    ? searchResults 
    : cheatSettings.filter(
        setting =>
          setting.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          setting.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          setting.user_id.includes(searchTerm)
      );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Настройки читов
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Управление игровыми читами
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Здесь вы можете включить или отключить читы для определенных пользователей.
            Эти настройки влияют на поведение игр и позволяют администраторам тестировать 
            различные сценарии или предоставлять специальные возможности определенным пользователям.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              label="Поиск пользователя"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Введите email или UUID пользователя"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  searchForUser();
                }
              }}
              InputProps={{
                endAdornment: (
                  <Button 
                    variant="contained" 
                    size="small" 
                    onClick={searchForUser}
                    disabled={searching || !searchTerm.trim()}
                  >
                    {searching ? "Поиск..." : "Найти"}
                  </Button>
                ),
              }}
            />
            
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                fetchCheatSettings();
              }}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Сбросить
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Пользователь</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Всегда выигрывать в "Орёл и решка"</TableCell>
                    <TableCell>Обновлено</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSettings.map((setting) => (
                    <TableRow key={setting.id}>
                      <TableCell>{setting.user_name || 'Неизвестно'}</TableCell>
                      <TableCell>{setting.user_email || 'Неизвестно'}</TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={setting.always_win_flip}
                              onChange={() => handleToggleAlwaysWin(setting.user_id, setting.always_win_flip)}
                              color="primary"
                            />
                          }
                          label={setting.always_win_flip ? 'Включено' : 'Отключено'}
                        />
                      </TableCell>
                      <TableCell>{new Date(setting.updated_at).toLocaleString('ru-RU')}</TableCell>
                    </TableRow>
                  ))}
                  {filteredSettings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {searchTerm && searching ? (
                          <Typography variant="body1">Поиск...</Typography>
                        ) : searchTerm ? (
                          <Typography variant="body1">Пользователи не найдены</Typography>
                        ) : (
                          <Typography variant="body1">Настройки читов не найдены</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};