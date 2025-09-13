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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Рынок</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateDialogOpen}>
          Добавить товар
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box display="flex" gap={2} mb={2}>
        <TextField
          placeholder="Поиск..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          sx={{ minWidth: 240 }}
        />
        <TextField
          select
          label="Категория"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {categories.map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </TextField>
      </Box>
      {loading ? (
        <Typography>Загрузка...</Typography>
      ) : (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={2}>
          {filteredItems.map(item => (
            <Card key={item.id} sx={{ cursor: 'pointer' }} onClick={() => setSelectedItem(item)}>
              {item.images && item.images.length > 0 && (
                <CardMedia
                  component="img"
                  height="160"
                  image={item.images[0]}
                  alt={item.title}
                  sx={{ objectFit: 'cover' }}
                />
              )}
              <CardContent>
                <Typography variant="h6">{item.title}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {item.description}
                </Typography>
                <Chip label={item.category} size="small" sx={{ mr: 1 }} />
                <Chip label={item.condition === 'new' ? 'Новое' : item.condition === 'used' ? 'Б/у' : 'Восстановленное'} size="small" />
                <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>
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