import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Avatar,
  Divider,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  Dialog as MuiDialog,
  DialogTitle as MuiDialogTitle,
  DialogContent as MuiDialogContent,
  DialogActions as MuiDialogActions,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material'
import {
  Close,
  ShoppingCart,
  Chat,
  LocationOn,
  CalendarToday,
  Person,
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from '@mui/icons-material'
import { useTheme } from '@mui/material/styles';
import MobileStepper from '@mui/material/MobileStepper';
import { useAuthContext } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { formatCurrency } from '../../utils/formatters'

interface MarketplaceItem {
  id: string
  title: string
  description: string
  price: number
  currency: string
  category: string
  condition: 'new' | 'used' | 'refurbished'
  images: string[]
  seller_id: string
  seller_name: string
  created_at: string
  is_active: boolean
  location: string
  tags: string[]
  payout_card_id?: string // Added for payout card
  purchase_limit?: number // Added for purchase limit
}

interface ItemDetailsDialogProps {
  item: MarketplaceItem
  open: boolean
  onClose: () => void
  onPurchased: () => void
}

interface BankCard {
  id: string;
  user_id: string;
  card_name: string;
  card_number: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

const conditions = {
  new: 'Новое',
  used: 'Б/у',
  refurbished: 'Восстановленное',
}

export const ItemDetailsDialog: React.FC<ItemDetailsDialogProps> = ({
  item,
  open,
  onClose,
  onPurchased,
}) => {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [success, setSuccess] = useState<string | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [userCards, setUserCards] = useState<BankCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const isOwnItem = user?.id === item.seller_id

  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = item.images.length;

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Fetch user's active cards when cardDialogOpen opens
  React.useEffect(() => {
    if (cardDialogOpen && user) {
      (async () => {
        const { data, error } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        if (!error && data) setUserCards(data)
      })()
    }
  }, [cardDialogOpen, user])

  const handleBuyClick = () => {
    setCardDialogOpen(true)
    setError(undefined)
    setSuccess(undefined)
  }

  const handleCardDialogClose = () => {
    setCardDialogOpen(false)
    setSelectedCardId(null)
  }

  const handleCardSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCardId(e.target.value)
  }

  const handleConfirmPurchase = async () => {
    if (!selectedCardId) {
      setError('Выберите карту для оплаты')
      return
    }
    const card = userCards.find(c => c.id === selectedCardId)
    if (!card) {
      setError('Карта не найдена')
      return
    }
    if (card.balance < item.price) {
      setError('Недостаточно средств на выбранной карте')
      return
    }
    setCardDialogOpen(false)
    await handlePurchase(card)
  }

  // Update handlePurchase to accept a card
  const handlePurchase = async (selectedCard?: any) => {
    if (!user) {
      setError('Вы должны быть авторизованы для покупки')
      return
    }
    if (isOwnItem) {
      setError('Вы не можете купить свой собственный товар')
      return
    }
    try {
      setLoading(true)
      setError(undefined)
      // Use selectedCard if provided, otherwise fallback to old logic
      let card = selectedCard
      if (!card) {
        // fallback: pick first active card
        const { data: cards } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        card = cards?.[0]
      }
      if (!card) {
        setError('У вас нет активных карт')
        return
      }
      if (card.balance < item.price) {
        setError('Недостаточно средств на выбранной карте')
        return
      }

      // Check purchase limit
      if (item.purchase_limit !== null && item.purchase_limit !== undefined) {
        const { data: existingPurchases, error: countError } = await supabase
          .from('marketplace_purchases')
          .select('id', { count: 'exact' })
          .eq('item_id', item.id)
          .eq('status', 'completed')
        
        if (countError) throw countError
        
        const currentPurchases = existingPurchases?.length || 0
        if (currentPurchases >= item.purchase_limit) {
          setError('Достигнут лимит покупок для этого товара')
          return
        }
      }

      // Transfer funds via server-side RPC (atomic on the DB side)
      const { data: transferResult, error: transferError } = await supabase.rpc('handle_manpay_transaction', {
        sender_id_in: user.id,
        receiver_id_in: item.seller_id,
        amount_in: item.price,
      })
      if (transferError) throw transferError
      // Create purchase transaction
      const { error: purchaseError } = await supabase
        .from('marketplace_purchases')
        .insert({
          item_id: item.id,
          buyer_id: user.id,
          seller_id: item.seller_id,
          price: item.price,
          currency: item.currency,
          status: 'completed',
        })
      if (purchaseError) throw purchaseError

      // Award social XP to buyer (seller XP could be handled elsewhere if desired)
      try {
        const { addSocialXpForAction } = await import('../../services/progressionService');
        await addSocialXpForAction(user.id, 'market_purchase', Number(item.price || 0));
      } catch {}

      // Check if we need to delete the item (purchase limit reached) AFTER successful transfer and purchase record
      if (item.purchase_limit !== null && item.purchase_limit !== undefined) {
        const { data: allPurchases, error: countError } = await supabase
          .from('marketplace_purchases')
          .select('id', { count: 'exact' })
          .eq('item_id', item.id)
          .eq('status', 'completed')
        
        if (countError) throw countError
        
        const totalPurchases = allPurchases?.length || 0
        if (totalPurchases >= item.purchase_limit) {
          // Delete item when purchase limit is reached
          const { error: deleteError } = await supabase
            .from('marketplace_items')
            .delete()
            .eq('id', item.id)
          if (deleteError) throw deleteError
        }
      }

      // Send notification to seller about the sale
      try {
        const { NotificationService } = await import('../../services/notificationService')
        await NotificationService.notifyItemSold(
          item.seller_id,
          item.title,
          item.price,
          item.currency,
          user.user_metadata?.full_name || 'Покупатель'
        )
      } catch (notificationError) {
        console.error('Error sending sale notification:', notificationError)
      }

      setSuccess('Покупка успешно совершена!')
      setTimeout(() => {
        onPurchased()
      }, 2000)
    } catch (error) {
      console.error('Error purchasing item:', error)
      setError('Ошибка при покупке товара')
    } finally {
      setLoading(false)
    }
  }

  const handleContactSeller = async () => {
    if (!user) {
      setError('Вы должны быть авторизованы для отправки сообщений')
      return
    }

    if (!message.trim()) {
      setError('Введите сообщение')
      return
    }

    try {
      setLoading(true)
      setError(undefined)

      const { error } = await supabase
        .from('marketplace_messages')
        .insert({
          item_id: item.id,
          sender_id: user.id,
          receiver_id: item.seller_id,
          message: message.trim(),
        })

      if (error) throw error

      // Send notification to seller
      try {
        const { NotificationService } = await import('../../services/notificationService')
        await NotificationService.notifyNewMessage(
          item.seller_id,
          user.user_metadata?.full_name || 'Пользователь',
          message.trim(),
          item.id,
          user.id
        )
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError)
      }

      setMessage('')
      setSuccess('Сообщение отправлено продавцу')
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Ошибка при отправке сообщения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{item.title}</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 2 }}>
          {/* Item Images */}
          <Box sx={{ maxWidth: '100%', flexGrow: 1 }}>
            {item.images && item.images.length > 1 ? (
              <Box>
                <img
                  src={item.images[activeStep]}
                  alt={`${item.title} - фото ${activeStep + 1}`}
                  style={{
                    height: 220,
                    display: 'block',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    width: '100%',
                    objectFit: 'cover',
                    borderRadius: 8,
                  }}
                />
                <MobileStepper
                  steps={maxSteps}
                  position="static"
                  activeStep={activeStep}
                  sx={{ mt: 1, background: 'transparent' }}
                  nextButton={
                    <Button size="small" onClick={handleNext} disabled={activeStep === maxSteps - 1}>
                      Далее
                      {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
                    </Button>
                  }
                  backButton={
                    <Button size="small" onClick={handleBack} disabled={activeStep === 0}>
                      {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
                      Назад
                    </Button>
                  }
                />
              </Box>
            ) : item.images && item.images.length === 1 ? (
              <img
                src={item.images[0]}
                alt={item.title}
                style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ width: '100%', height: 200, bgcolor: 'grey.100', borderRadius: 1.5 }} />
              </Box>
            )}
          </Box>

          {/* Price and Condition */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" color="primary">
              {formatCurrency(item.price, item.currency)}
            </Typography>
            <Chip label={conditions[item.condition]} color={item.condition === 'new' ? 'success' : 'default'} size="small" />
          </Box>

          {/* Description */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Описание
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {item.description}
            </Typography>
          </Box>

          {/* Item Details */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="action" />
              <Typography variant="body2" color="text.secondary">
                Продавец: {item.seller_name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn color="action" />
              <Typography variant="body2" color="text.secondary">
                {item.location}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarToday color="action" />
              <Typography variant="body2" color="text.secondary">
                Размещено: {new Date(item.created_at).toLocaleDateString('ru-RU')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Категория: {item.category}
              </Typography>
            </Box>
          </Box>

          {/* Tags */}
          {item.tags.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Теги
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {item.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" />
                ))}
              </Box>
            </Box>
          )}

          <Divider />

          {/* Contact Seller */}
          {!isOwnItem && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Связаться с продавцом
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Напишите сообщение продавцу..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{ mb: 1.5 }}
              />
              <Button variant="outlined" onClick={handleContactSeller} disabled={loading || !message.trim()}>
                Отправить сообщение
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} disabled={loading}>Закрыть</Button>
        {!isOwnItem && (
          <Button variant="contained" onClick={handleBuyClick} disabled={loading}>
            {loading ? 'Покупка...' : 'Купить товар'}
          </Button>
        )}
      </DialogActions>
      {cardDialogOpen && (
        <MuiDialog open={cardDialogOpen} onClose={handleCardDialogClose}>
          <MuiDialogTitle>Выберите карту для оплаты</MuiDialogTitle>
          <MuiDialogContent>
            <FormControl fullWidth>
              <InputLabel id="select-card-label">Карта</InputLabel>
              <Select
                labelId="select-card-label"
                value={selectedCardId || ''}
                label="Карта"
                onChange={(e) => setSelectedCardId(e.target.value as string)}
              >
                {userCards.length === 0 && <MenuItem value="" disabled>Нет активных карт</MenuItem>}
                {userCards.map(card => (
                  <MenuItem key={card.id} value={card.id}>
                    {`"${card.card_name}" • ${card.card_number.slice(-4)} • Баланс: ${formatCurrency(card.balance, card.currency)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </MuiDialogContent>
          <MuiDialogActions>
            <Button onClick={handleCardDialogClose}>Отмена</Button>
            <Button onClick={handleConfirmPurchase} variant="contained" disabled={!selectedCardId}>Подтвердить покупку</Button>
          </MuiDialogActions>
        </MuiDialog>
      )}
    </Dialog>
  )
} 