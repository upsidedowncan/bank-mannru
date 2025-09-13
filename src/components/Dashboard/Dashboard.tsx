import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Skeleton,
  Fab,
  Divider,
  Container,
} from '@mui/material'

import {
  Add as AddIcon,
  CreditCard,
  AccountBalance,
  TrendingUp,
  MoreVert,
  Edit,
  Delete,
  Send as SendIcon,
  SwapHoriz,
} from '@mui/icons-material'
import { supabase } from '../../config/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { formatCurrency } from '../../utils/formatters'

interface BankCard {
  id: string
  card_number: string
  card_type: 'debit' | 'credit'
  card_name: string
  balance: number
  currency: string
  expiry_date: string
  is_active: boolean
  created_at: string
  debt?: number // NEW: debt field
  user_id: string
  user_name?: string // For display purposes
}

interface DashboardStats {
  totalBalance: number
  totalCards: number
  activeCards: number
  monthlySpending: number
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthContext()
  const navigate = useNavigate()
  const [cards, setCards] = useState<BankCard[]>([])
  const [allCards, setAllCards] = useState<BankCard[]>([]) // All cards in the system
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    totalCards: 0,
    activeCards: 0,
    monthlySpending: 0,
  })
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCard, setEditingCard] = useState<BankCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditCard, setCreditCard] = useState<BankCard | null>(null)
  
  // Money transfer states
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferStep, setTransferStep] = useState(1) // 1: from card, 2: to card, 3: amount
  const [transferFromCard, setTransferFromCard] = useState<BankCard | null>(null)
  const [transferToCard, setTransferToCard] = useState<BankCard | null>(null)
  const [transferAmount, setTransferAmount] = useState('')

  const [formData, setFormData] = useState({
    card_name: '',
    card_type: 'debit' as 'debit' | 'credit',
    currency: 'MR',
  })

  useEffect(() => {
    if (user) {
      fetchCards()
      fetchAllCards()
    }
  }, [user])

  const fetchCards = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setCards(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error fetching cards:', error)
      setError('Ошибка при загрузке карт')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllCards = async () => {
    try {
      // Simple query without any joins to avoid foreign key issues
      const { data, error } = await supabase
        .from('bank_cards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Add user identification using user_id
      const processedData = data?.map(card => ({
        ...card,
        user_name: `Пользователь ${card.user_id.slice(0, 8)}`
      })) || []

      setAllCards(processedData)
    } catch (error) {
      console.error('Error fetching all cards:', error)
      // If there's an error, just set empty array to avoid breaking the UI
      setAllCards([])
    }
  }



  const calculateStats = (cardsData: BankCard[]) => {
    const totalBalance = cardsData.reduce((sum, card) => sum + card.balance, 0)
    const activeCards = cardsData.filter(card => card.is_active).length
    const monthlySpending = cardsData.reduce((sum, card) => {
      // Mock monthly spending calculation
      return sum + (card.balance * 0.1)
    }, 0)

    setStats({
      totalBalance,
      totalCards: cardsData.length,
      activeCards,
      monthlySpending,
    })
  }

  const handleSubmit = async () => {
    try {
      if (!user) return

      const cardData: any = {
        user_id: user.id,
        card_name: formData.card_name,
        card_type: formData.card_type,
        currency: formData.currency,
        card_number: editingCard ? editingCard.card_number : generateCardNumber(),
        expiry_date: editingCard ? editingCard.expiry_date : generateExpiryDate(),
        is_active: true,
      }

      // For existing cards, keep original balance
      if (editingCard) {
        cardData.balance = editingCard.balance
      } else {
        // For new cards, check if this is the user's first card
        const { data: existingCards } = await supabase
          .from('bank_cards')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        // Only give starting balance if this is the first card
        cardData.balance = existingCards && existingCards.length > 0 ? 0 : 1000
      }

      if (editingCard) {
        const { error } = await supabase
          .from('bank_cards')
          .update(cardData)
          .eq('id', editingCard.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('bank_cards')
          .insert([cardData])

        if (error) throw error
      }

      setOpenDialog(false)
      setEditingCard(null)
      resetForm()
      fetchCards()
    } catch (error) {
      console.error('Error saving card:', error)
      setError('Ошибка при сохранении карты')
    }
  }

  const handleDelete = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('bank_cards')
        .delete()
        .eq('id', cardId)

      if (error) throw error

      fetchCards()
    } catch (error) {
      console.error('Error deleting card:', error)
      setError('Ошибка при удалении карты')
    }
  }

  const handleEdit = (card: BankCard) => {
    setEditingCard(card)
    setFormData({
      card_name: card.card_name,
      card_type: card.card_type,
      currency: card.currency,
    })
    setOpenDialog(true)
  }

  const resetForm = () => {
    setFormData({
      card_name: '',
      card_type: 'debit',
      currency: 'MR',
    })
  }

  const generateCardNumber = () => {
    return '**** **** **** ' + Math.floor(Math.random() * 9000 + 1000)
  }

  const generateExpiryDate = () => {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 4)
    return date.toISOString().split('T')[0]
  }

  // Take credit handler
  const handleTakeCredit = (card: BankCard) => {
    setCreditCard(card)
    setCreditAmount('')
    setCreditDialogOpen(true)
  }

  const handleConfirmCredit = async () => {
    if (!creditCard || !user) return
    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Введите корректную сумму')
      return
    }
    const newDebt = (creditCard.debt || 0) + amount
    const newBalance = creditCard.balance + amount
    const { error } = await supabase
      .from('bank_cards')
      .update({ debt: newDebt, balance: newBalance })
      .eq('id', creditCard.id)
    if (error) {
      setError('Ошибка при взятии кредита')
    } else {
      setCreditDialogOpen(false)
      setCreditCard(null)
      setCreditAmount('')
      fetchCards()
    }
  }

  // Pay off debt handler
  const handlePayOffDebt = async (card: BankCard) => {
    if (!user || !card.debt || card.debt <= 0) return
    if (card.balance < card.debt) {
      setError('Недостаточно средств для погашения долга')
      return
    }
    const { error } = await supabase
      .from('bank_cards')
      .update({ balance: card.balance - card.debt, debt: 0 })
      .eq('id', card.id)
    if (error) {
      setError('Ошибка при погашении долга')
    } else {
      fetchCards()
    }
  }


  const getCardTypeColor = (type: string) => {
    return type === 'credit' ? 'error' : 'primary'
  }

  const getCardTypeLabel = (type: string) => {
    return type === 'credit' ? 'Кредитная' : 'Дебетовая'
  }

  // Money transfer functions
  const handleTransferStart = () => {
    setTransferStep(1)
    setTransferFromCard(null)
    setTransferToCard(null)
    setTransferAmount('')
    setTransferDialogOpen(true)
  }

  const handleTransferFromCardSelect = (card: BankCard) => {
    setTransferFromCard(card)
    // Don't auto-advance to next step, let user manually proceed
  }

  const handleTransferToCardSelect = (card: BankCard) => {
    if (card.id === transferFromCard?.id) {
      setError('Нельзя переводить на ту же карту')
      return
    }
    setTransferToCard(card)
    // Don't auto-advance to next step, let user manually proceed
  }

  const handleTransferConfirm = async () => {
    if (!transferFromCard || !transferToCard || !transferAmount) {
      setError('Пожалуйста, заполните все поля')
      return
    }

    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Введите корректную сумму')
      return
    }

    if (amount > transferFromCard.balance) {
      setError('Недостаточно средств на карте')
      return
    }

    try {
      // Update from card balance
      const { error: fromError } = await supabase
        .from('bank_cards')
        .update({ balance: transferFromCard.balance - amount })
        .eq('id', transferFromCard.id)

      if (fromError) throw fromError

      // Update to card balance
      const { error: toError } = await supabase
        .from('bank_cards')
        .update({ balance: transferToCard.balance + amount })
        .eq('id', transferToCard.id)

      if (toError) throw toError

      // Refresh cards data
      await fetchCards()
      await fetchAllCards()
      
      // Reset and close dialog
      setTransferDialogOpen(false)
      setTransferStep(1)
      setTransferFromCard(null)
      setTransferToCard(null)
      setTransferAmount('')
      setError(null)
    } catch (error) {
      console.error('Error transferring money:', error)
      setError('Ошибка при переводе денег')
    }
  }

  const handleTransferBack = () => {
    if (transferStep === 2) {
      setTransferStep(1)
      setTransferFromCard(null)
    } else if (transferStep === 3) {
      setTransferStep(2)
      setTransferToCard(null)
    }
  }

  const handleTransferCancel = () => {
    setTransferDialogOpen(false)
    setTransferStep(1)
    setTransferFromCard(null)
    setTransferToCard(null)
    setTransferAmount('')
    setError(null)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Загрузка...</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} variant="rectangular" height={120} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} variant="rectangular" height={200} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Панель управления</Typography>
      <Divider sx={{ mb: 2 }} />
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Общий баланс
                </Typography>
                                  <Typography variant="h4">
                    {formatCurrency(stats.totalBalance, 'MR')}
                  </Typography>
              </Box>
              <AccountBalance color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Всего карт
                </Typography>
                <Typography variant="h4">{stats.totalCards}</Typography>
              </Box>
              <CreditCard color="secondary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Активные карты
                </Typography>
                <Typography variant="h4">{stats.activeCards}</Typography>
              </Box>
              <TrendingUp color="success" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Расходы за месяц
                </Typography>
                                  <Typography variant="h4">
                    {formatCurrency(stats.monthlySpending, 'MR')}
                  </Typography>
              </Box>
              <TrendingUp color="warning" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Быстрые действия</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
            onClick={handleTransferStart}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <SwapHoriz color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Перевод денег
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Перевести деньги между картами
              </Typography>
            </CardContent>
          </Card>

          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
            onClick={() => {
              setEditingCard(null)
              resetForm()
              setOpenDialog(true)
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <AddIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Новая карта
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Создать новую банковскую карту
              </Typography>
            </CardContent>
          </Card>

          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
            onClick={() => navigate('/marketplace')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <SendIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Рынок
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Покупка и продажа товаров
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Cards Section */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5">Мои карты</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingCard(null)
              resetForm()
              setOpenDialog(true)
            }}
          >
            Добавить карту
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {card.card_name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {card.card_number}
                    </Typography>
                    <Chip
                      label={getCardTypeLabel(card.card_type)}
                      color={getCardTypeColor(card.card_type) as any}
                      size="small"
                    />
                  </Box>
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </Box>

                <Typography variant="h5" sx={{ mb: 1 }}>
                  {formatCurrency(card.balance, card.currency)}
                </Typography>
                {card.card_type === 'credit' ? (
                  <Box>
                    <Typography variant="body2" color={card.debt && card.debt > 0 ? 'error' : 'textSecondary'} sx={{ mb: 1 }}>
                      Долг: {formatCurrency(card.debt || 0, card.currency)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Button size="small" color="primary" onClick={() => handleTakeCredit(card)}>
                        Взять кредит
                      </Button>
                      {card.debt && card.debt > 0 ? (
                        <Button size="small" color="success" onClick={() => handlePayOffDebt(card)}>
                          Погасить долг
                        </Button>
                      ) : null}
                    </Box>
                  </Box>
                ) : null}

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Действует до: {new Date(card.expiry_date).toLocaleDateString('ru-RU')}
                </Typography>

                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleEdit(card)}
                  >
                    Изменить
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDelete(card.id)}
                  >
                    Удалить
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {cards.length === 0 && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CreditCard sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                У вас пока нет карт
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Добавьте свою первую карту для начала работы
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingCard(null)
                  resetForm()
                  setOpenDialog(true)
                }}
              >
                Добавить карту
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Add/Edit Card Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCard ? 'Изменить карту' : 'Добавить новую карту'}
        </DialogTitle>
        {!editingCard && (
          <Box sx={{ px: 3, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Первая карта: 1,000 МР, дополнительные карты: 0 МР
            </Typography>
          </Box>
        )}
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Название карты"
              value={formData.card_name}
              onChange={(e) => setFormData({ ...formData, card_name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              select
              label="Тип карты"
              value={formData.card_type}
              onChange={(e) => setFormData({ ...formData, card_type: e.target.value as 'debit' | 'credit' })}
              margin="normal"
            >
              <MenuItem value="debit">Дебетовая</MenuItem>
              <MenuItem value="credit">Кредитная</MenuItem>
            </TextField>

            <TextField
              fullWidth
              select
              label="Валюта"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              margin="normal"
            >
              <MenuItem value="MR">МР (маннрубли)</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCard ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onClose={() => setCreditDialogOpen(false)}>
        <DialogTitle>Взять кредит</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Сумма кредита"
            type="number"
            fullWidth
            value={creditAmount}
            onChange={e => setCreditAmount(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleConfirmCredit} variant="contained">Взять</Button>
        </DialogActions>
      </Dialog>

      {/* Money Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={handleTransferCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {transferStep === 1 && 'Выберите карту для перевода'}
          {transferStep === 2 && 'Выберите карту получателя'}
          {transferStep === 3 && 'Введите сумму перевода'}
        </DialogTitle>
        <DialogContent>
          {transferStep === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Выберите карту, с которой хотите перевести деньги:
              </Typography>
              <TextField
                select
                fullWidth
                label="Карта отправителя"
                value={transferFromCard?.id || ''}
                onChange={(e) => {
                  const selectedCard = cards.find(card => card.id === e.target.value)
                  if (selectedCard) {
                    handleTransferFromCardSelect(selectedCard)
                  }
                }}
                margin="normal"
              >
                {cards.filter(card => card.balance > 0).map((card) => (
                  <MenuItem key={card.id} value={card.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Box>
                        <Typography variant="body1">{card.card_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {card.card_number} • {getCardTypeLabel(card.card_type)}
                        </Typography>
                      </Box>
                      <Typography variant="body1" color="primary" sx={{ ml: 2 }}>
                        {formatCurrency(card.balance, card.currency)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
              {cards.filter(card => card.balance > 0).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Нет карт с достаточным балансом для перевода
                </Typography>
              )}
            </Box>
          )}

          {transferStep === 2 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Выберите карту, на которую хотите перевести деньги:
              </Typography>
              <TextField
                select
                fullWidth
                label="Карта получателя"
                value={transferToCard?.id || ''}
                onChange={(e) => {
                  const selectedCard = allCards.find(card => card.id === e.target.value)
                  if (selectedCard) {
                    handleTransferToCardSelect(selectedCard)
                  }
                }}
                margin="normal"
              >
                {allCards.filter(card => card.id !== transferFromCard?.id).map((card) => (
                  <MenuItem key={card.id} value={card.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Box>
                        <Typography variant="body1">{card.card_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {card.card_number} • {getCardTypeLabel(card.card_type)} • {card.user_name}
                        </Typography>
                      </Box>
                      <Typography variant="body1" color="primary" sx={{ ml: 2 }}>
                        {formatCurrency(card.balance, card.currency)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}

          {transferStep === 3 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Введите сумму для перевода:
              </Typography>
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  С карты: <strong>{transferFromCard?.card_name}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  На карту: <strong>{transferToCard?.card_name}</strong> ({transferToCard?.user_name})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Доступно: <strong>{formatCurrency(transferFromCard?.balance || 0, 'MR')}</strong>
                </Typography>
              </Box>
              <TextField
                autoFocus
                fullWidth
                label="Сумма перевода"
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                inputProps={{ min: 0, max: transferFromCard?.balance }}
                helperText={`Максимум: ${formatCurrency(transferFromCard?.balance || 0, 'MR')}`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {transferStep > 1 && (
            <Button onClick={handleTransferBack}>
              Назад
            </Button>
          )}
          <Button onClick={handleTransferCancel}>
            Отмена
          </Button>
          {transferStep === 1 && transferFromCard && (
            <Button 
              onClick={() => setTransferStep(2)}
              variant="contained"
            >
              Далее
            </Button>
          )}
          {transferStep === 2 && transferToCard && (
            <Button 
              onClick={() => setTransferStep(3)}
              variant="contained"
            >
              Далее
            </Button>
          )}
          {transferStep === 3 && (
            <Button 
              onClick={handleTransferConfirm} 
              variant="contained"
              disabled={!transferAmount || parseFloat(transferAmount) <= 0 || parseFloat(transferAmount) > (transferFromCard?.balance || 0)}
            >
              Перевести
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  )
} 