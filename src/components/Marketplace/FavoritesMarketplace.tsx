import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Card, CardMedia, CardContent, Chip } from '@mui/material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { formatCurrency } from '../../utils/formatters';

interface FavoriteRow {
  item_id: string;
  created_at: string;
}

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
}

export const FavoritesMarketplace: React.FC = () => {
  const { user } = useAuthContext();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [itemsById, setItemsById] = useState<Record<string, MarketplaceItem | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data: favs, error } = await supabase
        .from('marketplace_favorites')
        .select('item_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && favs) {
        setFavorites(favs as FavoriteRow[]);
        // fetch current items by ids (include inactive)
        const ids = favs.map(f => f.item_id);
        if (ids.length) {
          const { data: items } = await supabase
            .from('marketplace_items')
            .select('*')
            .in('id', ids);
          const map: Record<string, MarketplaceItem | null> = {};
          ids.forEach(id => {
            map[id] = items?.find(it => it.id === id) || null;
          });
          setItemsById(map);
        } else {
          setItemsById({});
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Избранное</Typography>
      {loading ? (
        <Typography>Загрузка...</Typography>
      ) : favorites.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4 }} color="text.secondary">Пусто</Typography>
      ) : (
        <Box 
          display="grid" 
          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(auto-fill, minmax(240px, 1fr))', md: 'repeat(auto-fill, minmax(260px, 1fr))' }}
          gap={2}
        >
          {favorites.map(fav => {
            const item = itemsById[fav.item_id] || null;
            const isMissing = item === null;
            const isInactive = !!item && !item.is_active;
            const title = isMissing ? 'Товар удалён' : item!.title;
            const description = isMissing ? 'Этот товар был удалён или недоступен' : item!.description;
            const image = isMissing || !item!.images?.length ? undefined : item!.images[0];
            return (
              <Card key={fav.item_id} sx={{ overflow: 'hidden' }}>
                {image ? (
                  <CardMedia component="img" height="150" image={image} alt={title} sx={{ objectFit: 'cover' }} />
                ) : (
                  <Box sx={{ height: 150, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Нет изображения</Typography>
                  </Box>
                )}
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Typography>
                    {(isMissing || isInactive) && (
                      <Chip size="small" color="warning" label={isMissing ? 'Удалено' : 'Неактивно'} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {description}
                  </Typography>
                  {!isMissing && (
                    <Typography variant="subtitle2" color="primary" sx={{ mt: 1, fontWeight: 700 }}>
                      {formatCurrency(item!.price, item!.currency)}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Container>
  );
} 