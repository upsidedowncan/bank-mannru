import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  InputAdornment,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Dashboard,
  Store as StoreIcon,
  Chat as ChatIcon,
  Person,
  Settings,
  Home,
  Inventory as InventoryIcon,
  Extension as ExtensionIcon,
  Games,
  School,
  Work,
  SportsEsports,
  MusicNote,
  Movie,
  Restaurant,
  LocalGroceryStore,
  DirectionsCar,
  Flight,
  Hotel,
  LocalHospital,
  FitnessCenter,
  Spa,
  Pets,
  ChildCare,
  Elderly,
  Accessibility,
  Security,
  Speed,
  Star,
  Favorite,
  TrendingUp,
  TrendingDown,
  Notifications,
  Email,
  Phone,
  LocationOn,
  Schedule,
  CalendarToday,
  AccountBalance,
  Payment,
  CreditCard,
  Receipt,
  ShoppingCart,
  LocalShipping,
  LocalOffer,
  Loyalty,
  Redeem,
  CardGiftcard,
  Celebration,
  Event,
  Cake,
  RestaurantMenu,
  LocalBar,
  LocalCafe,
  LocalPizza,
  LocalDining,
  Fastfood,
  LocalConvenienceStore,
  LocalPharmacy,
  LocalGasStation,
  LocalCarWash,
  LocalLaundryService,
  LocalPrintshop,
  LocalPostOffice,
  LocalLibrary,
  LocalMall,
  LocalParking,
  LocalTaxi,
  DirectionsBus,
  DirectionsSubway,
  DirectionsBike,
  DirectionsWalk,
  DirectionsRun,
  DirectionsBoat,
  DirectionsTransit,
  DirectionsRailway,
  DirectionsTransitFilled,
  DirectionsCarFilled,
} from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Icon mapping
const iconMapping: { [key: string]: React.ComponentType } = {
  Dashboard,
  StoreIcon,
  ChatIcon,
  Person,
  Settings,
  Home,
  InventoryIcon,
  ExtensionIcon,
  Games,
  School,
  Work,
  SportsEsports,
  MusicNote,
  Movie,
  Restaurant,
  LocalGroceryStore,
  DirectionsCar,
  Flight,
  Hotel,
  LocalHospital,
  FitnessCenter,
  Spa,
  Pets,
  ChildCare,
  Elderly,
  Accessibility,
  Security,
  Speed,
  Star,
  Favorite,
  TrendingUp,
  TrendingDown,
  Notifications,
  Email,
  Phone,
  LocationOn,
  Schedule,
  CalendarToday,
  AccountBalance,
  Payment,
  CreditCard,
  Receipt,
  ShoppingCart,
  LocalShipping,
  LocalOffer,
  Loyalty,
  Redeem,
  CardGiftcard,
  Celebration,
  Event,
  Cake,
  RestaurantMenu,
  LocalBar,
  LocalCafe,
  LocalPizza,
  LocalDining,
  Fastfood,
  LocalConvenienceStore,
  LocalPharmacy,
  LocalGasStation,
  LocalCarWash,
  LocalLaundryService,
  LocalPrintshop,
  LocalPostOffice,
  LocalLibrary,
  LocalMall,
  LocalParking,
  LocalTaxi,
  DirectionsBus,
  DirectionsSubway,
  DirectionsBike,
  DirectionsWalk,
  DirectionsRun,
  DirectionsBoat,
  DirectionsTransit,
  DirectionsRailway,
  DirectionsTransitFilled,
  DirectionsCarFilled,
};

const iconOptions = Object.keys(iconMapping).map(key => ({
  value: key,
  label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}));

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  price: number;
  created_at: string;
  is_active: boolean;
  seller_id: string;
}

export const FeaturesMarketplace: React.FC<{ onFeaturesChanged?: () => void }> = ({ onFeaturesChanged }) => {
  const { user } = useAuthContext();
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeatureItem | null>(null);
  const [activatedFeatures, setActivatedFeatures] = useState<string[]>([]); // feature_id[]
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('features_marketplace')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  };

  const fetchActivatedFeatures = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_features')
      .select('feature_id')
      .eq('user_id', user.id);
    if (!error && data) setActivatedFeatures(data.map((f: any) => f.feature_id));
  };

  useEffect(() => {
    fetchItems();
    fetchActivatedFeatures();
  }, [user]);

  const handleCreateDialogOpen = () => setCreateDialogOpen(true);
  const handleCreateDialogClose = () => setCreateDialogOpen(false);
  const handleCreated = () => {
    setCreateDialogOpen(false);
    fetchItems();
  };

  const handleDeactivate = async (featureId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_features')
      .delete()
      .eq('user_id', user.id)
      .eq('feature_id', featureId);
    if (error) {
      setSnackbar({ open: true, message: 'Ошибка при деактивации функции', severity: 'error' });
    } else {
      setActivatedFeatures(prev => prev.filter(id => id !== featureId));
      setSnackbar({ open: true, message: 'Функция деактивирована', severity: 'success' });
      if (onFeaturesChanged) onFeaturesChanged();
    }
  };

  const handleActivate = async (featureId: string) => {
    if (!user) return;
    if (activatedFeatures.includes(featureId)) {
      setSnackbar({ open: true, message: 'Функция уже активирована', severity: 'error' });
      return;
    }
    const { error } = await supabase
      .from('user_features')
      .insert({ user_id: user.id, feature_id: featureId });
    if (error) {
      setSnackbar({ open: true, message: 'Ошибка при активации функции', severity: 'error' });
    } else {
      setActivatedFeatures(prev => [...prev, featureId]);
      setSnackbar({ open: true, message: 'Функция успешно активирована!', severity: 'success' });
      if (onFeaturesChanged) onFeaturesChanged();
    }
  };

  const handleDelete = async (featureId: string) => {
    if (!window.confirm('Удалить эту функцию из маркета?')) return;
    setDeleteLoading(featureId);
    const { error } = await supabase
      .from('features_marketplace')
      .delete()
      .eq('id', featureId);
    setDeleteLoading(null);
    if (error) {
      setSnackbar({ open: true, message: 'Ошибка при удалении функции', severity: 'error' });
    } else {
      setSnackbar({ open: true, message: 'Функция удалена из маркета', severity: 'success' });
      fetchItems();
      if (onFeaturesChanged) onFeaturesChanged();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Маркетплейс функций</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateDialogOpen}>
          Добавить функцию
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {loading ? (
        <Typography>Загрузка...</Typography>
      ) : (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
          {items.map(item => {
            const IconComponent = item.icon ? iconMapping[item.icon] : ExtensionIcon;
            return (
              <Card key={item.id} sx={{ cursor: 'pointer' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {IconComponent && <IconComponent color="primary" />}
                    <Typography variant="h6">{item.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {item.description}
                  </Typography>
                  <Chip label={item.route} sx={{ mt: 1 }} />
                  <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>
                    Бесплатно
                  </Typography>
                {item.seller_id === user?.id && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    sx={{ mt: 1, mb: 1 }}
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteLoading === item.id}
                    fullWidth
                  >
                    {deleteLoading === item.id ? 'Удаление...' : 'Удалить'}
                  </Button>
                )}
                {activatedFeatures.includes(item.id) ? (
                  <Button
                    variant="outlined"
                    color="error"
                    sx={{ mt: 2 }}
                    onClick={() => handleDeactivate(item.id)}
                    fullWidth
                  >
                    Деактивировать
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                    onClick={() => handleActivate(item.id)}
                    fullWidth
                  >
                    Активировать
                  </Button>
                )}
              </CardContent>
            </Card>
            );
          })}
        </Box>
      )}
      <CreateFeatureDialog open={createDialogOpen} onClose={handleCreateDialogClose} onCreated={handleCreated} />
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

const createFeatureSchema = z.object({
  title: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  description: z.string().min(10, 'Описание должно содержать минимум 10 символов'),
  route: z.string().min(1, 'Укажите путь маршрута (например, /my-feature)'),
  icon: z.string().min(1, 'Выберите иконку'),
});
type CreateFeatureForm = z.infer<typeof createFeatureSchema>;

const CreateFeatureDialog: React.FC<{ open: boolean; onClose: () => void; onCreated: () => void }> = ({ open, onClose, onCreated }) => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFeatureForm>({
    resolver: zodResolver(createFeatureSchema),
    defaultValues: { title: '', description: '', route: '', icon: '' },
  });

  const onSubmit = async (data: CreateFeatureForm) => {
    if (!user) {
      setError('Вы должны быть авторизованы');
      return;
    }
    try {
      setLoading(true);
      setError(undefined);
      const { error } = await supabase
        .from('features_marketplace')
        .insert({
          title: data.title,
          description: data.description,
          route: data.route,
          icon: data.icon,
          seller_id: user.id,
          is_active: true,
        });
      if (error) throw error;
      reset();
      onCreated();
    } catch (error) {
      setError('Ошибка при создании функции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Добавить функцию</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Название функции" fullWidth sx={{ mb: 2 }} error={!!errors.title} helperText={errors.title?.message} />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Описание" fullWidth multiline rows={3} sx={{ mb: 2 }} error={!!errors.description} helperText={errors.description?.message} />
            )}
          />
          <Controller
            name="route"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Путь маршрута (например, /my-feature)" fullWidth sx={{ mb: 2 }} error={!!errors.route} helperText={errors.route?.message} />
            )}
          />
          <Controller
            name="icon"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.icon}>
                <InputLabel>Иконка</InputLabel>
                <Select {...field} label="Иконка">
                  {iconOptions.map(option => {
                    const IconComponent = iconMapping[option.value];
                    return (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {IconComponent && <IconComponent />}
                          {option.label}
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
                {errors.icon && <Typography color="error" variant="caption">{errors.icon.message}</Typography>}
              </FormControl>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" disabled={loading}>Добавить</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 