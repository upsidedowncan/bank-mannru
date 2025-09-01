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
} from '@mui/material';
import {
  Search,
  Add as AddIcon,
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
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleCreateDialogOpen}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' },
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
          sx={{ minWidth: { xs: '100%', sm: 180 } }}
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
            sm: 'repeat(auto-fill, minmax(250px, 1fr))',
            md: 'repeat(auto-fill, minmax(250px, 1fr))'
          }} 
          gap={2}
        >
          {filteredItems.map(item => (
            <Card key={item.id} sx={{ 
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 3
              }
            }} onClick={() => setSelectedItem(item)}>
              {item.images && item.images.length > 0 ? (
                <CardMedia
                  component="img"
                  height="160"
                  image={item.images[0]}
                  alt={item.title}
                  sx={{ objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ height: 100, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Нет изображения
                  </Typography>
                </Box>
              )}
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" noWrap title={item.title}>{item.title}</Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  gutterBottom
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    mb: 1
                  }}
                >
                  {item.description}
                </Typography>
                <Box sx={{ mb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={item.category} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  <Chip 
                    label={item.condition === 'new' ? 'Новое' : item.condition === 'used' ? 'Б/у' : 'Восстановленное'} 
                    size="small"
                    sx={{ mb: 0.5 }}
                  />
                </Box>
                <Typography variant="subtitle1" color="primary" sx={{ mt: 'auto', fontWeight: 'bold' }}>
                  {formatCurrency(item.price, item.currency)}
                </Typography>
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
}; 