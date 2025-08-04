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
} from '@mui/material'
import { Close, Add as AddIcon, CloudUpload, Delete } from '@mui/icons-material'
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Разместить товар</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 0, pb: 2, maxHeight: '70vh', overflow: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            {/* Image Upload Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Фотографии товара
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, maxHeight: 100, overflow: 'auto' }}>
                {images.map((image, index) => (
                  <Card key={index} sx={{ width: 60, height: 60, position: 'relative', flexShrink: 0 }}>
                    <CardMedia
                      component="img"
                      height="60"
                      image={image}
                      alt={`Фото ${index + 1}`}
                      sx={{ objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 1,
                        right: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        width: 20,
                        height: 20,
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.7)',
                        },
                      }}
                      onClick={() => handleRemoveImage(index)}
                    >
                      <Delete sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Card>
                ))}
              </Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                size="small"
                disabled={uploading}
                sx={{ width: '100%' }}
              >
                {uploading ? 'Загрузка...' : 'Добавить фото'}
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="payout-card-label">Карта для получения оплаты</InputLabel>
              <Select
                labelId="payout-card-label"
                value={payoutCardId}
                label="Карта для получения оплаты"
                onChange={handlePayoutCardChange}
                required
              >
                {cards.length === 0 && <MenuItem value="" disabled>Нет активных карт</MenuItem>}
                {cards.map(card => (
                  <MenuItem key={card.id} value={card.id}>
                    {`"${card.card_name}" • ${card.card_number.slice(-4)} • Баланс: ${card.balance} МР`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Название товара"
                  fullWidth
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
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Цена (МР)"
                    type="number"
                    fullWidth
                    error={!!errors.price}
                    helperText={errors.price?.message}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />

              <Controller
                name="condition"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.condition}>
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

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.category}>
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
                    error={!!errors.location}
                    helperText={errors.location?.message}
                  />
                )}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Лимит покупок
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Тип лимита</InputLabel>
                  <Select
                    value={purchaseLimitType}
                    onChange={(e) => setPurchaseLimitType(e.target.value as '1' | 'custom' | 'infinite')}
                    label="Тип лимита"
                  >
                    <MenuItem value="1">1 покупка</MenuItem>
                    <MenuItem value="custom">Кастомное количество</MenuItem>
                    <MenuItem value="infinite">Безлимитно</MenuItem>
                  </Select>
                </FormControl>
                
                {purchaseLimitType === 'custom' && (
                  <TextField
                    label="Количество"
                    type="number"
                    value={purchaseLimitValue}
                    onChange={(e) => setPurchaseLimitValue(e.target.value)}
                    sx={{ minWidth: 150 }}
                    inputProps={{ min: 1 }}
                  />
                )}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Теги
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {watchedTags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Добавить тег"
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  startIcon={<AddIcon />}
                >
                  Добавить
                </Button>
              </Box>
              {errors.tags && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {errors.tags.message}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={loading} size="small">
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={loading} size="small">
            {loading ? 'Создание...' : 'Разместить товар'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
} 