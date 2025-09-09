import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  MenuItem,
  Fab,
  IconButton,
} from '@mui/material';
import {
  Search,
  Add as AddIcon,
  FavoriteBorder,
  Favorite,
} from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';
import { CreateListingDialog } from './CreateListingDialog';
import { ItemDetailsDialog } from './ItemDetailsDialog';

interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  images: string[];
  seller_id: string;
  seller_name: string;
  created_at: string;
  is_active: boolean;
  location: string;
  tags: string[];
  purchase_limit?: number;
}

const categories = [
  'Все',
  'Электроника',
  'Одежда',
  'Книги',
  'Спорт',
  'Дом и сад',
  'Авто',
  'Красота',
  'Игрушки',
  'Другое',
];

export const Marketplace: React.FC = () => {
  const { user } = useAuthContext();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    let filtered = items;
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (selectedCategory !== 'Все') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    setFilteredItems(filtered);
  }, [items, searchTerm, selectedCategory]);

  // Load favorites for current user (for heart icon state)
  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('marketplace_favorites')
          .select('item_id')
          .eq('user_id', user.id);
        if (!error && data) {
          setFavoriteIds(new Set(data.map(d => d.item_id)));
        }
      } catch {}
    };
    loadFavorites();
  }, [user, items.length]);

  // Load view counts (simple approach: per item)
  useEffect(() => {
    const loadViewCounts = async () => {
      try {
        const counts: Record<string, number> = {};
        await Promise.all(
          items.map(async (it) => {
            const { count } = await supabase
              .from('marketplace_item_views')
              .select('id', { count: 'exact', head: true })
              .eq('item_id', it.id);
            counts[it.id] = count || 0;
          })
        );
        setViewCounts(counts);
      } catch {}
    };
    if (items.length) loadViewCounts();
  }, [items]);

  const toggleFavorite = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!user) return;
    const isFav = favoriteIds.has(itemId);
    // optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(itemId); else next.add(itemId);
      return next;
    });
    try {
      if (isFav) {
        await supabase.from('marketplace_favorites').delete().eq('user_id', user.id).eq('item_id', itemId);
      } else {
        await supabase.from('marketplace_favorites').insert({ user_id: user.id, item_id: itemId });
      }
    } catch {
      // revert on error
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(itemId); else next.delete(itemId);
        return next;
      });
    }
  };

  const incrementView = async (itemId: string) => {
    try {
      await supabase.from('marketplace_item_views').insert({ item_id: itemId, user_id: user?.id || null });
      setViewCounts(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    } catch {}
  };

  const handleOpenItem = async (item: MarketplaceItem) => {
    await incrementView(item.id);
    setSelectedItem(item);
  };

  const handleCreateDialogOpen = () => setCreateDialogOpen(true);
  const handleCreateDialogClose = () => setCreateDialogOpen(false);
  const handleCreated = () => {
    setCreateDialogOpen(false);
    fetchItems();
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center"
        gap={2}
        mb={2}
      >
        <Typography variant="h4">Рынок</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleCreateDialogOpen}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        >
          Добавить товар
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {/* Mobile FAB to publish items */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleCreateDialogOpen}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
          boxShadow: 3
        }}
      >
        <AddIcon />
      </Fab>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }} 
        gap={2} 
        mb={2}
      >
        <TextField
          placeholder="Поиск..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ flexGrow: 1 }}
          fullWidth
          size="small"
        />
        <TextField
          select
          label="Категория"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          sx={{ minWidth: { xs: '100%,', sm: 180 } }}
          size="small"
        >
          {categories.map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </TextField>
      </Box>
      {loading ? (
        <Typography>Загрузка...</Typography>
      ) : filteredItems.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4 }} color="text.secondary">
          Товары не найдены
        </Typography>
      ) : (
        <Box 
          display="grid" 
          gridTemplateColumns={{ 
            xs: '1fr', 
            sm: 'repeat(auto-fill, minmax(240px, 1fr))',
            md: 'repeat(auto-fill, minmax(260px, 1fr))'
          }} 
          gap={2}
        >
          {filteredItems.map(item => (
            <Card
              key={item.id}
              sx={{
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
                borderRadius: 2,
                overflow: 'hidden',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
              }}
              onClick={() => handleOpenItem(item)}
            >
              <Box sx={{ position: 'relative' }}>
              {item.images && item.images.length > 0 ? (
                <CardMedia
                  component="img"
                    height="150"
                  image={item.images[0]}
                  alt={item.title}
                  sx={{ objectFit: 'cover' }}
                />
              ) : (
                  <Box sx={{ height: 150, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Нет изображения
                  </Typography>
                </Box>
              )}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.35) 100%)'
                  }}
                />
                <Chip
                  label={item.condition === 'new' ? 'Новое' : item.condition === 'used' ? 'Б/у' : 'Восстановленное'}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                />
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' }
                  }}
                  onClick={(e) => toggleFavorite(e, item.id)}
                >
                  {favoriteIds.has(item.id) ? <Favorite fontSize="small" color="error" /> : <FavoriteBorder fontSize="small" color="action" />}
                </IconButton>
                <Box sx={{ position: 'absolute', bottom: 8, left: 8, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.9)' }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
                    {formatCurrency(item.price, item.currency)}
                  </Typography>
                </Box>
              </Box>

              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography
                  variant="subtitle1"
                  title={item.title}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {item.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}
                >
                  {item.description}
                </Typography>

                <Box sx={{ mt: 0.5, mb: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={item.category} size="small" variant="outlined" />
                  {item.location && <Chip label={item.location} size="small" variant="outlined" />}
                </Box>

                <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.created_at).toLocaleDateString('ru-RU')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Просмотры: {viewCounts[item.id] ?? '—'}
                </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      <CreateListingDialog open={createDialogOpen} onClose={handleCreateDialogClose} onCreated={handleCreated} />
      {selectedItem && (
        <ItemDetailsDialog
          item={selectedItem}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onPurchased={fetchItems}
        />
      )}
    </Container>
  );
} 