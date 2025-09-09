import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  Card,
  CardMedia,
  InputAdornment,
} from '@mui/material'
import { Close, Add as AddIcon, CloudUpload, Delete, CreditCard, PhotoCamera, DescriptionOutlined, Flag, LabelOutlined } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthContext } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'

const createListingSchema = z.object({
  title: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  description: z.string().min(10, 'Описание должно содержать минимум 10 символов'),
  price: z.number().min(0.01, 'Цена должна быть больше 0'),
  category: z.string().min(1, 'Выберите категорию'),
  condition: z.string().refine((val) => ['new', 'used', 'refurbished'].includes(val), {
    message: 'Выберите корректное состояние товара',
  }),
  location: z.string().min(1, 'Укажите местоположение'),
  tags: z.array(z.string()).min(1, 'Добавьте хотя бы один тег'),
  images: z.array(z.string()).optional(),
  purchase_limit_type: z.string().refine((val) => ['1', 'custom', 'infinite'].includes(val), {
    message: 'Выберите корректный тип лимита',
  }),
  purchase_limit_value: z.number().optional(),
})

type CreateListingForm = z.infer<typeof createListingSchema>

interface CreateListingDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const categories = [
  'Электроника',
  'Одежда',
  'Книги',
  'Спорт',
  'Дом и сад',
  'Авто',
  'Красота',
  'Игрушки',
  'Другое',
]

const conditions = [
  { value: 'new', label: 'Новое' },
  { value: 'used', label: 'Б/у' },
  { value: 'refurbished', label: 'Восстановленное' },
]

export const CreateListingDialog: React.FC<CreateListingDialogProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [newTag, setNewTag] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [cards, setCards] = useState<any[]>([])
  const [payoutCardId, setPayoutCardId] = useState<string>('')
  const [purchaseLimitType, setPurchaseLimitType] = useState<'1' | 'custom' | 'infinite'>('infinite')
  const [purchaseLimitValue, setPurchaseLimitValue] = useState<string>('')

  React.useEffect(() => {
    if (user && open) {
      (async () => {
        const { data, error } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        if (!error && data) setCards(data)
      })()
    }
  }, [user, open])

  const handlePayoutCardChange = (e: any) => {
    setPayoutCardId(e.target.value)
  }

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateListingForm>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category: '',
      condition: 'used',
      location: '',
      tags: [],
      purchase_limit_type: 'infinite',
      purchase_limit_value: undefined,
    },
  })

  const watchedTags = watch('tags')

  const handleAddTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue('tags', [...watchedTags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Пожалуйста, загружайте только изображения')
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Размер файла не должен превышать 5MB')
          continue
        }

        // Convert to base64 for now (in production, you'd upload to Supabase Storage)
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          uploadedUrls.push(result)
          
          if (uploadedUrls.length === files.length) {
            setImages(prev => [...prev, ...uploadedUrls])
            setUploading(false)
          }
        }
        reader.readAsDataURL(file)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('Ошибка при загрузке изображения')
      setUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: CreateListingForm) => {
    if (!user) {
      setError('Вы должны быть авторизованы')
      return
    }
    if (!payoutCardId) {
      setError('Выберите карту для получения оплаты')
      return
    }
    try {
      setLoading(true)
      setError(undefined)
      // Calculate purchase limit value
      let purchaseLimit = null;
      if (purchaseLimitType === '1') {
        purchaseLimit = 1;
      } else if (purchaseLimitType === 'custom' && purchaseLimitValue) {
        purchaseLimit = parseInt(purchaseLimitValue);
      }
      // If purchaseLimitType is 'infinite', purchaseLimit remains null

      const { error } = await supabase
        .from('marketplace_items')
        .insert({
          title: data.title,
          description: data.description,
          price: data.price,
          currency: 'MR',
          category: data.category,
          condition: data.condition,
          location: data.location,
          tags: data.tags,
          seller_id: user.id,
          images: images,
          is_active: true,
          payout_card_id: payoutCardId,
          purchase_limit: purchaseLimit,
        })
      if (error) throw error
      reset()
      setPayoutCardId('')
      onCreated()
    } catch (error) {
      console.error('Error creating listing:', error)
      setError('Ошибка при создании объявления')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setError(undefined)
    setNewTag('')
    setImages([])
    setPurchaseLimitType('infinite')
    setPurchaseLimitValue('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Разместить товар</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2, pb: 1, maxHeight: '70vh', overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            {/* Payout Card Selection */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'primary.50', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'primary.200'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CreditCard fontSize="small" color="primary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Карта для оплаты
                </Typography>
              </Box>
              <FormControl fullWidth size="small">
                <Select
                  value={payoutCardId}
                  onChange={handlePayoutCardChange}
                  displayEmpty
                  sx={{
                    '& .MuiSelect-select': {
                      py: 1,
                    }
                  }}
                >
                  <MenuItem value="" disabled>
                    <Typography variant="body2" color="text.secondary">
                      Выберите карту
                    </Typography>
                  </MenuItem>
                  {cards.map(card => (
                    <MenuItem key={card.id} value={card.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Box sx={{
                          width: 28,
                          height: 18,
                          borderRadius: 1,
                          background: 'linear-gradient(45deg, #667eea, #764ba2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}>
                          {card.card_type === 'credit' ? 'CR' : 'DB'}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            {card.card_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •••• {card.card_number.slice(-4)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {card.balance} МР
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {cards.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    Создайте карту в "Панель управления"
                  </Typography>
                )}
              </FormControl>
            </Box>

            {/* Image Upload Section */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PhotoCamera fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Фотографии
                </Typography>
              </Box>
              
              {/* Image Preview Grid */}
              {images.length > 0 && (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                  gap: 1, 
                  mb: 1.5,
                  maxHeight: 150,
                  overflow: 'auto'
                }}>
                  {images.map((image, index) => (
                    <Card key={index} sx={{ 
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      boxShadow: 1,
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'scale(1.02)',
                        transition: 'all 0.2s ease'
                      }
                    }}>
                      <CardMedia
                        component="img"
                        image={image}
                        alt={`Фото ${index + 1}`}
                        sx={{ 
                          objectFit: 'cover',
                          height: '100%',
                          width: '100%'
                        }}
                      />
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          width: 20,
                          height: 20,
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.9)',
                          },
                        }}
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Delete sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Card>
                  ))}
                </Box>
              )}

              {/* Upload Button */}
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                size="small"
                disabled={uploading}
                sx={{ 
                  width: '100%',
                  py: 1,
                  borderStyle: 'dashed',
                  borderWidth: 1.5,
                  '&:hover': {
                    borderStyle: 'solid',
                    borderWidth: 1.5,
                  }
                }}
              >
                {uploading ? 'Загрузка...' : images.length === 0 ? 'Добавить фото' : 'Добавить еще'}
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                Макс. 5MB, JPG/PNG/GIF
              </Typography>
            </Box>

            {/* Basic Information Section */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <DescriptionOutlined fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Основная информация
                </Typography>
              </Box>
              
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Название товара"
                      fullWidth
                      size="small"
                      error={!!errors.title}
                      helperText={errors.title?.message}
                    />
                  )}
                />

                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Описание"
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      placeholder="Опишите товар..."
                    />
                  )}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Цена"
                        type="number"
                        fullWidth
                        size="small"
                        error={!!errors.price}
                        helperText={errors.price?.message}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">MR</InputAdornment>,
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="condition"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small" error={!!errors.condition}>
                        <InputLabel>Состояние</InputLabel>
                        <Select {...field} label="Состояние">
                          {conditions.map((condition) => (
                            <MenuItem key={condition.value} value={condition.value}>
                              {condition.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small" error={!!errors.category}>
                        <InputLabel>Категория</InputLabel>
                        <Select {...field} label="Категория">
                          {categories.map((category) => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />

                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Местоположение"
                        fullWidth
                        size="small"
                        error={!!errors.location}
                        helperText={errors.location?.message}
                        placeholder="Город..."
                      />
                    )}
                  />
                </Box>
              </Box>
            </Box>

            {/* Purchase Limit Section */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'warning.50', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'warning.200'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Flag fontSize="small" color="warning" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                  Лимит покупок
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Тип лимита</InputLabel>
                  <Select
                    value={purchaseLimitType}
                    onChange={(e) => setPurchaseLimitType(e.target.value as '1' | 'custom' | 'infinite')}
                    label="Тип лимита"
                  >
                    <MenuItem value="1">1 покупка</MenuItem>
                    <MenuItem value="custom">Кастомное</MenuItem>
                    <MenuItem value="infinite">Безлимитно</MenuItem>
                  </Select>
                </FormControl>
                
                {purchaseLimitType === 'custom' && (
                  <TextField
                    label="Количество"
                    type="number"
                    value={purchaseLimitValue}
                    onChange={(e) => setPurchaseLimitValue(e.target.value)}
                    size="small"
                    sx={{ minWidth: 120 }}
                    inputProps={{ min: 1 }}
                  />
                )}
              </Box>
            </Box>

            {/* Tags Section */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'success.50', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'success.200'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <LabelOutlined fontSize="small" color="success" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.dark' }}>
                  Теги
                </Typography>
              </Box>
              
              {/* Existing Tags */}
              {watchedTags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                  {watchedTags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color="success"
                      variant="outlined"
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        '&:hover': {
                          background: 'success.main',
                          color: 'white',
                        }
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Add New Tag */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите тег"
                  size="small"
                  sx={{ flexGrow: 1 }}
                  InputProps={{
                    endAdornment: (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleAddTag}
                        disabled={!newTag.trim()}
                        sx={{ ml: 0.5 }}
                      >
                        Добавить
                      </Button>
                    ),
                  }}
                />
              </Box>
              
              {errors.tags && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {errors.tags.message}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: 2, 
          pb: 2, 
          pt: 1.5,
          gap: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          background: 'rgba(0, 0, 0, 0.02)'
        }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            variant="outlined"
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading || !payoutCardId}
          >
            {loading ? 'Создание...' : 'Разместить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
} 