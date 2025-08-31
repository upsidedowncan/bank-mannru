import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  Reply as ReplyIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';

interface ManGPTMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_user: boolean;
  created_at: string;
  is_answered: boolean;
  admin_response?: string;
  admin_responded_at?: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

export const ManGPTManagement: React.FC = () => {
  const theme = useTheme();
  const [messages, setMessages] = useState<ManGPTMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ManGPTMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadMessages();
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('mangpt_admin_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'mangpt_messages'
        },
        (payload) => {
          console.log('Admin: Real-time update received:', payload);
          // Reload messages when there are changes
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const loadMessages = async () => {
    try {
      console.log('Admin: Starting to load ManGPT messages...');
      setLoading(true);
      
      // Load all ManGPT messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('mangpt_messages')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Admin: ManGPT query result:', { messagesData, messagesError });

      if (messagesError) {
        console.error('Error loading ManGPT messages:', messagesError);
        showSnackbar('Error loading messages', 'error');
        return;
      }

      console.log('Admin: Found messages:', messagesData?.length || 0);

      // Get unique user IDs
      const userIds = Array.from(new Set(messagesData?.map(msg => msg.user_id) || []));
      console.log('Admin: User IDs found:', userIds);
      
      // Load user information for all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      console.log('Admin: Users query result:', { usersData, usersError });

      if (usersError) {
        console.error('Error loading users:', usersError);
        showSnackbar('Error loading user information', 'error');
        return;
      }

      // Create a map of user data
      const usersMap = new Map(usersData?.map(user => [user.id, user]) || []);

      // Transform the messages to include user info
      const transformedMessages = messagesData?.map(msg => ({
        ...msg,
        user_email: usersMap.get(msg.user_id)?.email,
        user_first_name: usersMap.get(msg.user_id)?.first_name,
        user_last_name: usersMap.get(msg.user_id)?.last_name,
      })) || [];

      console.log('Admin: Final transformed messages:', transformedMessages);
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading ManGPT messages:', error);
      showSnackbar('Error loading messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openReplyDialog = (message: ManGPTMessage) => {
    setSelectedMessage(message);
    setReplyText('');
    setReplyDialogOpen(true);
  };

  const closeReplyDialog = () => {
    setReplyDialogOpen(false);
    setSelectedMessage(null);
    setReplyText('');
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim() || sendingReply) return;

    try {
      setSendingReply(true);
      
      // Update the message with admin response
      const { error } = await supabase
        .from('mangpt_messages')
        .update({
          admin_response: replyText.trim(),
          admin_responded_at: new Date().toISOString(),
          is_answered: true,
        })
        .eq('id', selectedMessage.id);

      if (error) {
        console.error('Error sending reply:', error);
        showSnackbar('Error sending reply', 'error');
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessage.id 
          ? { ...msg, admin_response: replyText.trim(), admin_responded_at: new Date().toISOString(), is_answered: true }
          : msg
      ));

      showSnackbar('Reply sent successfully!', 'success');
      closeReplyDialog();
    } catch (error) {
      console.error('Error sending reply:', error);
      showSnackbar('Error sending reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getStatusChip = (message: ManGPTMessage) => {
    if (message.is_from_user) {
      if (message.is_answered) {
        return <Chip label="Answered" color="success" size="small" icon={<CheckIcon />} />;
      } else {
        return <Chip label="Pending" color="warning" size="small" icon={<PendingIcon />} />;
      }
    } else {
      return <Chip label="Bot Message" color="info" size="small" icon={<BotIcon />} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUnansweredCount = () => {
    return messages.filter(msg => msg.is_from_user && !msg.is_answered).length;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: theme.palette.primary.main, color: 'white' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            <BotIcon />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold">
              ManGPT Management
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Manage AI assistant conversations and respond to user queries
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="h6" fontWeight="bold">
              {getUnansweredCount()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Pending Questions
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Box display="flex" gap={2} mb={3}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Messages
            </Typography>
            <Typography variant="h4" component="div">
              {messages.length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              User Questions
            </Typography>
            <Typography variant="h4" component="div">
              {messages.filter(msg => msg.is_from_user).length}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Answered
            </Typography>
            <Typography variant="h4" component="div">
              {messages.filter(msg => msg.is_from_user && msg.is_answered).length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Messages Table */}
      <Paper elevation={1} sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Conversation History</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadMessages}
            variant="outlined"
            size="small"
          >
            Refresh
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.map((message) => (
              <TableRow key={message.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {message.is_from_user ? <PersonIcon /> : <BotIcon />}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {message.is_from_user 
                          ? `${message.user_first_name || 'User'} ${message.user_last_name || ''}`.trim() || 'Anonymous User'
                          : 'ManGPT Bot'
                        }
                      </Typography>
                      {message.is_from_user && (
                        <Typography variant="caption" color="text.secondary">
                          {message.user_email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box maxWidth={300}>
                    <Typography variant="body2" noWrap>
                      {message.message}
                    </Typography>
                    {message.admin_response && (
                      <Box mt={1}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" color="primary.main" fontWeight="medium">
                          Admin Response:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {message.admin_response}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {getStatusChip(message)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(message.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {message.is_from_user && !message.is_answered && (
                    <Tooltip title="Reply to user">
                      <IconButton
                        onClick={() => openReplyDialog(message)}
                        color="primary"
                        size="small"
                      >
                        <ReplyIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {messages.length === 0 && (
          <Box textAlign="center" py={4}>
            <BotIcon sx={{ fontSize: 64, color: theme.palette.grey[400], mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No ManGPT messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Users will appear here when they start conversations with ManGPT
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onClose={closeReplyDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Reply to User Question
        </DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                User Question:
              </Typography>
              <Paper sx={{ p: 2, mb: 2, backgroundColor: theme.palette.grey[100] }}>
                <Typography variant="body1">
                  {selectedMessage.message}
                </Typography>
              </Paper>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Your Response:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response here..."
                variant="outlined"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReplyDialog}>Cancel</Button>
          <Button
            onClick={sendReply}
            variant="contained"
            disabled={!replyText.trim() || sendingReply}
            startIcon={sendingReply ? <CircularProgress size={16} /> : <ReplyIcon />}
          >
            {sendingReply ? 'Sending...' : 'Send Reply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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