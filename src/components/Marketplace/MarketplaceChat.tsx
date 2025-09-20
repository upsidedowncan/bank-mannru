import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Badge,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  Send,
  Chat as ChatIcon,
  Person,
  ArrowBack,
  MoreVert,
  Edit,
  Delete,
  Info,
} from '@mui/icons-material'
import { useAuthContext } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { formatCurrency } from '../../utils/formatters'

interface MarketplaceMessage {
  id: string
  item_id: string
  sender_id: string
  receiver_id: string
  message: string
  is_read: boolean
  created_at: string
  sender_name: string
  receiver_name: string
  item_title: string
}

interface ChatConversation {
  item_id: string
  item_title: string
  other_user_id: string
  other_user_name: string
  last_message: string
  last_message_time: string
  unread_count: number
}

export const MarketplaceChat: React.FC = () => {
  const { user } = useAuthContext()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<MarketplaceMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Message management states
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedMessage, setSelectedMessage] = useState<MarketplaceMessage | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editMessageText, setEditMessageText] = useState('')
  const [messageInfoDialogOpen, setMessageInfoDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      
      // Get all messages for the current user
      const { data: messagesData, error } = await supabase
        .from('marketplace_messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group messages by item_id and other user
      const conversationMap = new Map<string, ChatConversation>()

      messagesData?.forEach((msg) => {
        const isSender = msg.sender_id === user?.id
        const otherUserId = isSender ? msg.receiver_id : msg.sender_id
        const otherUserName = 'Аноним' // We'll get the actual name later if needed
        
        const conversationKey = `${msg.item_id}-${otherUserId}`
        
        if (!conversationMap.has(conversationKey)) {
          conversationMap.set(conversationKey, {
            item_id: msg.item_id,
            item_title: 'Неизвестный товар', // We'll get the actual title later if needed
            other_user_id: otherUserId,
            other_user_name: otherUserName,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: isSender ? 0 : (msg.is_read ? 0 : 1),
          })
        } else {
          const existing = conversationMap.get(conversationKey)!
          if (new Date(msg.created_at) > new Date(existing.last_message_time)) {
            existing.last_message = msg.message
            existing.last_message_time = msg.created_at
            if (!isSender && !msg.is_read) {
              existing.unread_count += 1
            }
          }
        }
      })

      setConversations(Array.from(conversationMap.values()))
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('marketplace_messages')
        .select('*')
        .eq('item_id', itemId)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: true })

      if (error) throw error

      const messagesWithNames = data?.map(msg => ({
        ...msg,
        sender_name: 'Аноним',
        receiver_name: 'Аноним',
      })) || []

      setMessages(messagesWithNames)

      // Mark messages as read
      const unreadMessages = messagesWithNames.filter(
        msg => msg.receiver_id === user?.id && !msg.is_read
      )

      if (unreadMessages.length > 0) {
        await supabase
          .from('marketplace_messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(msg => msg.id))
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    const messageText = newMessage.trim()
    
    try {
      const conversation = conversations.find(c => c.item_id === selectedConversation)
      if (!conversation) return

      const tempMessageId = `temp-${Date.now()}`
      
      // Create temporary message for immediate UI update
      const tempMessage = {
        id: tempMessageId,
        item_id: selectedConversation,
        sender_id: user.id,
        receiver_id: conversation.other_user_id,
        message: messageText,
        is_read: false,
        created_at: new Date().toISOString(),
        sender_name: 'Вы',
        receiver_name: conversation.other_user_name,
        item_title: conversation.item_title,
      }

      // Add message to UI immediately
      setMessages(prev => [...prev, tempMessage])
      setNewMessage('')

      // Update conversation list immediately
      setConversations(prev => prev.map(conv => 
        conv.item_id === selectedConversation 
          ? { ...conv, last_message: messageText, last_message_time: new Date().toISOString() }
          : conv
      ))

      // Send to database
      const { data, error } = await supabase
        .from('marketplace_messages')
        .insert({
          item_id: selectedConversation,
          sender_id: user.id,
          receiver_id: conversation.other_user_id,
          message: messageText,
        })
        .select()
        .single()

      if (error) throw error

      // Send notification to receiver
      try {
        const { NotificationService } = await import('../../services/notificationService')
        await NotificationService.notifyNewMessage(
          conversation.other_user_id,
          user.user_metadata?.full_name || 'Пользователь',
          messageText,
          selectedConversation,
          user.id
        )
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }

      // Replace temporary message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId ? { ...data, sender_name: 'Вы', receiver_name: conversation.other_user_name } : msg
      ))

    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
      setNewMessage(messageText) // Restore the message text
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Message management functions
  const handleMessageMenuOpen = (event: React.MouseEvent<HTMLElement>, message: MarketplaceMessage) => {
    setMessageMenuAnchor(event.currentTarget)
    setSelectedMessage(message)
  }

  const handleMessageMenuClose = () => {
    setMessageMenuAnchor(null)
    // Don't clear selectedMessage here as it's needed for dialogs
  }

  const handleEditMessage = () => {
    if (selectedMessage) {
      setEditMessageText(selectedMessage.message)
      setEditDialogOpen(true)
    }
    handleMessageMenuClose()
  }

  const handleDeleteMessage = async () => {
    if (selectedMessage) {
      try {
        const { error } = await supabase
          .from('marketplace_messages')
          .delete()
          .eq('id', selectedMessage.id)

        if (error) throw error

        // Remove message from local state
        setMessages(prev => prev.filter(msg => msg.id !== selectedMessage.id))
      } catch (error) {
        console.error('Error deleting message:', error)
      }
    }
    handleMessageMenuClose()
  }

  const handleShowMessageInfo = () => {
    console.log('Selected message for info:', selectedMessage) // Debug
    setMessageInfoDialogOpen(true)
    handleMessageMenuClose()
  }

  const handleSaveEdit = async () => {
    if (selectedMessage && editMessageText.trim()) {
      try {
        const { error } = await supabase
          .from('marketplace_messages')
          .update({ message: editMessageText.trim() })
          .eq('id', selectedMessage.id)

        if (error) throw error

        // Update message in local state
        setMessages(prev => prev.map(msg => 
          msg.id === selectedMessage.id 
            ? { ...msg, message: editMessageText.trim() }
            : msg
        ))
        
        setEditDialogOpen(false)
        setEditMessageText('')
        setSelectedMessage(null)
      } catch (error) {
        console.error('Error updating message:', error)
      }
    }
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>Загрузка...</Typography>
      </Container>
    )
  }

    return (
    <>
      {!selectedConversation ? (
        // Conversations List View
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom>
            Сообщения
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {conversations.map((conversation) => (
              <Card
                key={`${conversation.item_id}-${conversation.other_user_id}`}
                onClick={() => setSelectedConversation(conversation.item_id)}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Badge
                      badgeContent={conversation.unread_count}
                      color="primary"
                      invisible={conversation.unread_count === 0}
                    >
                      <Avatar>
                        <Person />
                      </Avatar>
                    </Badge>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {conversation.other_user_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(conversation.last_message_time).toLocaleDateString('ru-RU')}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {conversation.item_title}
                  </Typography>
                  
                  <Typography variant="body2" noWrap sx={{ color: conversation.unread_count > 0 ? 'primary.main' : 'text.secondary' }}>
                    {conversation.last_message}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {conversations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ChatIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Нет сообщений
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Начните общение с продавцами или покупателями
              </Typography>
            </Box>
          )}
        </Container>
      ) : (
        // Full Screen Chat View
        <Box sx={{ 
          position: 'fixed',
          top: { xs: '56px', sm: 0 }, // Account for mobile navbar
          left: { xs: 0, sm: '240px' }, // Account for sidebar on desktop
          right: 0,
          bottom: 0,
          zIndex: 9999,
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider', 
            backgroundColor: 'background.paper',
            flexShrink: 0 // Prevent header from shrinking
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => setSelectedConversation(null)}>
                <ArrowBack />
              </IconButton>
              <Box>
                <Typography variant="h6">
                  {conversations.find(c => c.item_id === selectedConversation)?.other_user_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {conversations.find(c => c.item_id === selectedConversation)?.item_title}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Messages List */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: 2, 
            backgroundColor: 'grey.50',
            minHeight: 0 // Prevents flex item from growing beyond container
          }}>
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id
              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    mb: 2,
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      backgroundColor: isOwnMessage ? 'primary.main' : 'white',
                      color: isOwnMessage ? 'white' : 'text.primary',
                      borderRadius: 3,
                      p: 2,
                      boxShadow: 2,
                      position: 'relative',
                      '&:hover': {
                        boxShadow: 4,
                      },
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      if (isOwnMessage) {
                        handleMessageMenuOpen(e, message)
                      } else {
                        setSelectedMessage(message)
                        setMessageInfoDialogOpen(true)
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                      {message.message}
                    </Typography>
                    

                    
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.7, 
                        display: 'block', 
                        mt: 0.5,
                        fontSize: '0.7rem'
                      }}
                    >
                      {new Date(message.created_at).toLocaleString('ru-RU')}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          <Box sx={{ 
            p: 2, 
            borderTop: 1, 
            borderColor: 'divider', 
            backgroundColor: 'background.paper',
            flexShrink: 0 // Prevent input area from shrinking
          }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Введите сообщение..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    maxHeight: '120px', // Constrain maximum height
                    overflow: 'auto'
                  },
                }}
              />
              <IconButton
                color="primary"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Send />
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}

      {/* Message Actions Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleMessageMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{ zIndex: 10000 }}
      >
        <MenuItem onClick={handleShowMessageInfo}>
          <Info sx={{ mr: 1 }} />
          Информация
        </MenuItem>
        <MenuItem onClick={handleEditMessage}>
          <Edit sx={{ mr: 1 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDeleteMessage} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      {/* Edit Message Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        sx={{ zIndex: 10000 }}
      >
        <DialogTitle>Редактировать сообщение</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            value={editMessageText}
            onChange={(e) => setEditMessageText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Info Dialog */}
      <Dialog 
        open={messageInfoDialogOpen} 
        onClose={() => {
          setMessageInfoDialogOpen(false)
          setSelectedMessage(null)
        }}
        sx={{ zIndex: 10000 }}
      >
        <DialogTitle>Информация о сообщении</DialogTitle>
        <DialogContent>
          {selectedMessage && (
            <Box sx={{ minWidth: 300 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Отправитель:</strong> {selectedMessage.sender_name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Получатель:</strong> {selectedMessage.receiver_name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Товар:</strong> {selectedMessage.item_title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Сообщение:</strong>
              </Typography>
              <Box sx={{ 
                p: 2, 
                backgroundColor: 'grey.100', 
                borderRadius: 1,
                mb: 2
              }}>
                <Typography variant="body2">
                  {selectedMessage.message}
                </Typography>
              </Box>
              <Typography variant="body2">
                <strong>Отправлено:</strong> {new Date(selectedMessage.created_at).toLocaleString('ru-RU')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageInfoDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
} 