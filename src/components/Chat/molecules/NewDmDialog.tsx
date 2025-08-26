import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';

interface NewDmDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  searchUsers: (term: string) => void;
  searchResults: any[];
  searching: boolean;
}

export const NewDmDialog: React.FC<NewDmDialogProps> = ({
  open,
  onClose,
  onSelectUser,
  searchUsers,
  searchResults,
  searching,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300); // Debounce search input

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchUsers]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Новое сообщение</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Поиск по имени..."
          type="text"
          fullWidth
          variant="standard"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Box sx={{ mt: 2, minHeight: 200, position: 'relative' }}>
          {searching && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          )}
          {!searching && searchResults.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', pt: 2 }}>
              {searchTerm.length < 2 ? 'Введите имя для поиска' : 'Пользователи не найдены'}
            </Typography>
          )}
          <List>
            {searchResults.map((user) => (
              <ListItem key={user.user_id} disablePadding>
                <ListItemButton onClick={() => handleSelectUser(user.user_id)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: user.pfp_color }}>
                      {/* Placeholder for icon, will need to be passed in or handled differently */}
                      {user.chat_name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={user.chat_name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
