import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material'
import ReactMarkdown from 'react-markdown'
import {
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Add as AddIcon,
} from '@mui/icons-material'
import { useAuthContext } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { formatCurrency } from '../../utils/formatters'
import { CreateListingDialog } from './CreateListingDialog'
import PageHeader from '../Layout/PageHeader'

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
  location: string
  tags: string[]
  is_active: boolean
  created_at: string
}

const conditions = {
  new: 'Новое',
  used: 'Б/у',
  refurbished: 'Восстановленное',
}

export const MyListings: React.FC = () => {
  const { user } = useAuthContext()
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<MarketplaceItem | null>(null)

  useEffect(() => {
    if (user) {
      fetchMyItems()
    }
  }, [user])

  const fetchMyItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching my items:', error)
      setError('Ошибка при загрузке ваших товаров')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: MarketplaceItem) => {
    setEditingItem(item)
    setEditDialogOpen(true)
  }

  const handleDelete = (item: MarketplaceItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleToggleActive = async (item: MarketplaceItem) => {
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)

      if (error) throw error
      fetchMyItems()
    } catch (error) {
      console.error('Error toggling item status:', error)
      setError('Ошибка при изменении статуса товара')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingItem) return

    try {
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', deletingItem.id)

      if (error) throw error
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      fetchMyItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      setError('Ошибка при удалении товара')
    }
  }

  const handleListingCreated = () => {
    setCreateDialogOpen(false)
    fetchMyItems()
  }

  const handleListingUpdated = () => {
    setEditDialogOpen(false)
    setEditingItem(null)
    fetchMyItems()
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>Загрузка...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <PageHeader title="Мои товары" actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          Добавить новый товар
        </Button>
      } />
      <Divider sx={{ mb: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {items.map((item) => (
          <Card key={item.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                         <CardMedia
               component="img"
               height="200"
               image={item.images && item.images.length > 0 ? item.images[0] : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7QndC10YIgbm90ZSDQv9GA0L7QuNC30L7QstCw0L3QuNC1PC90ZXh0Pjwvc3ZnPg=='}
               alt={item.title}
             />
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom noWrap>
                {item.title}
              </Typography>
              <Box sx={{ mb: 2, flexGrow: 1, 
                '& p': { margin: 0, marginBottom: 0.5 },
                '& p:last-child': { marginBottom: 0 },
                '& *': { fontSize: '0.875rem', color: 'text.secondary' }
              }}>
                <ReactMarkdown>
                  {item.description.length > 100
                    ? `${item.description.substring(0, 100)}...`
                    : item.description}
                </ReactMarkdown>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="primary">
                  {formatCurrency(item.price, item.currency)}
                </Typography>
                <Chip
                  label={conditions[item.condition]}
                  size="small"
                  color={item.condition === 'new' ? 'success' : 'default'}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {item.category}
                </Typography>
                <Chip
                  label={item.is_active ? 'Активно' : 'Неактивно'}
                  size="small"
                  color={item.is_active ? 'success' : 'default'}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  startIcon={item.is_active ? <VisibilityOff /> : <Visibility />}
                  onClick={() => handleToggleActive(item)}
                  variant="outlined"
                >
                  {item.is_active ? 'Скрыть' : 'Показать'}
                </Button>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => handleEdit(item)}
                  variant="outlined"
                >
                  Изменить
                </Button>
                <Button
                  size="small"
                  startIcon={<Delete />}
                  onClick={() => handleDelete(item)}
                  variant="outlined"
                  color="error"
                >
                  Удалить
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {items.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            У вас пока нет товаров
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Создайте первое объявление для продажи
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Добавить товар
          </Button>
        </Box>
      )}

      {/* Create Listing Dialog */}
      <CreateListingDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleListingCreated}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить товар "{deletingItem?.title}"? Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
} 