import React, { useState, useRef, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, useTheme } from '@mui/material/styles' // Import useTheme here
import { CssBaseline } from '@mui/material'
import { theme, createAppTheme, ThemeMode, ThemeVariant, themeVariants, experimentalThemeVariants } from './theme/theme'
import { AppLayout } from './components/Layout/AppLayout'
import { LoginForm } from './components/Forms/LoginForm'
import { RegisterForm } from './components/Forms/RegisterForm'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { NotificationProvider } from './components/Notifications/NotificationSystem'
import { NotificationBell } from './components/Notifications/NotificationBell'
import { NotificationToast } from './components/Notifications/NotificationToast'
import { ChartRunnerGame } from './components/ChartRunnerGame'
import { Dashboard } from './components/Dashboard/Dashboard'
import { LandingPage } from './components/Landing/LandingPage'
import { Marketplace } from './components/Marketplace/Marketplace'
import { MarketplaceChat } from './components/Marketplace/MarketplaceChat'
import { MyListings } from './components/Marketplace/MyListings'
import { FeaturesMarketplace } from './components/Marketplace/FeaturesMarketplace'
import { FavoritesMarketplace } from './components/Marketplace/FavoritesMarketplace'
import Investments from './components/Investments/Investments'
import { Cheats } from './components/Cheats';
import { BankGardenGame } from './components/BankGardenGame';
import { TappingGame } from './components/Games/TappingGame';
import { FlipGame } from './components/Games/FlipGame';
import { GiveawayFunction } from './components/Games/GiveawayFunction';
import { GlobalChat } from './components/Chat/GlobalChat';
import { AdminPanel } from './components/Admin/AdminPanel';
import { FortuneWheelGame } from './components/FortuneWheelGame';
import AdminInvestments from './components/Admin/AdminInvestments';
import { MemoryGame } from './components/MemoryGame';
import { VaultManagementPage } from './components/VaultManagementPage';
import { EventNotification } from './components/Notifications/EventNotification';
import { MannShell } from './components/MannShell/MannShell';
import { supabase } from './config/supabase';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, DialogProps, Box, Card, CardContent, Avatar, TextField, Divider, Chip, Snackbar, Alert, Switch, FormControl, FormControlLabel, Select, MenuItem, Container, Paper, Slider } from '@mui/material';
import {
  Person,
  Email,
  CalendarToday,
  Edit,
  Save,
  Cancel,
  Logout,
  Chat,
  Palette,
  Face,
  AccountCircle,
  SportsEsports,
  School,
  Work,
  Home,
  Favorite,
  Star,
  Diamond,
  ChildCare,
  Code as DevIcon,
  Pets,
  MusicNote,
  Movie,
  Restaurant,
  FitnessCenter,
  Flight,
  Cake,
  Fastfood,
  DirectionsBike,
  Security,
  Games,
  TheaterComedy,
  DirectionsCar,
  DirectionsBus,
  DirectionsSubway,
  DirectionsWalk,
  DirectionsRun,
  DirectionsBoat,
  DirectionsTransit,
  DirectionsRailway,
  LocalTaxi,
  Hotel,
  Business,
  LocalHospital,
  LocalPharmacy,
  LocalGasStation,
  LocalCarWash,
  LocalLaundryService,
  LocalPrintshop,
  LocalPostOffice,
  LocalLibrary,
  LocalMall,
  LocalParking,
  ShoppingCart,
  LocalGroceryStore,
  LocalConvenienceStore,
  LocalOffer,
  Loyalty,
  Redeem,
  CardGiftcard,
  AccountBalance,
  Payment,
  CreditCard,
  Receipt,
  LocalShipping,
  Notifications,
  Phone,
  LocationOn,
  Schedule,
  Celebration,
  Event,
  TrendingUp,
  TrendingDown,
  Speed,
  Accessibility,
  Elderly,
  Spa,
  LocalBar,
  LocalCafe,
  LocalPizza,
  LocalDining,
  Settings as SettingsIcon, // Renamed to avoid conflict
  ZoomIn, // For magnifier
  SupervisedUserCircle, // For admin
  MonetizationOn, // For investments
  ColorLens, // For color scheme
} from '@mui/icons-material';
import { createClient } from '@supabase/supabase-js';
import { ThemeProvider as ThemeContextProvider } from './contexts/ThemeContext';

// Add keyframes for animation
import { keyframes } from '@emotion/react'
import styled from '@emotion/styled'

const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

const AnimatedDevIcon = styled(DevIcon)`
  animation: ${pulseAnimation} 2s infinite;
  color: white;
  font-size: 40px;
`

const Accounts = () => (
  <div>
    <h1>Счета</h1>
    <p>Информация о ваших счетах появится здесь.</p>
  </div>
)

const Payments = () => (
  <div>
    <h1>Платежи</h1>
    <p>Функционал платежей будет реализован здесь.</p>
  </div>
)

interface ProfileProps {
  showDevSettings: boolean;
}

const Profile = ({ showDevSettings }: ProfileProps) => {
  const { user } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: user?.user_metadata?.first_name || '',
    last_name: user?.user_metadata?.last_name || '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Enhanced chat settings state
  const [chatSettings, setChatSettings] = useState({
    chat_name: user?.user_metadata?.first_name || 'User',
    pfp_color: '#1976d2',
    pfp_icon: 'Person',
    pfp_type: 'icon' as 'icon' | 'image',
    pfp_image_url: '',
    pfp_gradient: '',
  });
  const [chatSettingsLoading, setChatSettingsLoading] = useState(false);
  const [customColor, setCustomColor] = useState('#1976d2');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Special feature - dev icon
  const isSpecialName = editData.first_name === 'Ахмед' && editData.last_name === 'Шайхилов';
  const specialIcon = 'Dev';

  // Load chat settings from the new table
  useEffect(() => {
    const loadChatSettings = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_chat_settings')
          .select('chat_name, pfp_color, pfp_icon, pfp_type, pfp_image_url')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading chat settings:', error);
          return;
        }

        if (data) {
          setChatSettings({
            chat_name: data.chat_name,
            pfp_color: data.pfp_color,
            pfp_icon: data.pfp_icon,
            pfp_type: (data.pfp_type === 'image' ? 'image' : 'icon'),
            pfp_image_url: data.pfp_image_url || '',
            pfp_gradient: '',
          });
          setCustomColor(data.pfp_color);
          if (data.pfp_image_url) {
            setImagePreview(data.pfp_image_url);
          }
        }
      } catch (error) {
        console.error('Error loading chat settings:', error);
      }
    };

    loadChatSettings();
  }, [user]);

  const pfpColors = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#303f9f', '#c2185b', '#5d4037', '#455a64', '#ff6f00',
    '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548'
  ];

  // Enhanced profile picture icons with categories
  const pfpIcons = [
    // Basic
    { value: 'Person', label: 'Пользователь', icon: Person, category: 'basic' },
    { value: 'Face', label: 'Лицо', icon: Face, category: 'basic' },
    { value: 'AccountCircle', label: 'Аккаунт', icon: AccountCircle, category: 'basic' },

    // Activities
    { value: 'SportsEsports', label: 'Игры', icon: SportsEsports, category: 'activities' },
    { value: 'School', label: 'Образование', icon: School, category: 'activities' },
    { value: 'Work', label: 'Работа', icon: Work, category: 'activities' },
    { value: 'Home', label: 'Дом', icon: Home, category: 'activities' },
    { value: 'FitnessCenter', label: 'Спорт', icon: FitnessCenter, category: 'activities' },
    { value: 'DirectionsBike', label: 'Велосипед', icon: DirectionsBike, category: 'activities' },
    { value: 'DirectionsRun', label: 'Бег', icon: DirectionsRun, category: 'activities' },
    { value: 'DirectionsWalk', label: 'Прогулка', icon: DirectionsWalk, category: 'activities' },

    // Lifestyle
    { value: 'ChildCare', label: 'Дети', icon: ChildCare, category: 'lifestyle' },
    { value: 'Pets', label: 'Питомцы', icon: Pets, category: 'lifestyle' },
    { value: 'Cake', label: 'Торт', icon: Cake, category: 'lifestyle' },
    { value: 'Fastfood', label: 'Еда', icon: Fastfood, category: 'lifestyle' },
    { value: 'Restaurant', label: 'Ресторан', icon: Restaurant, category: 'lifestyle' },
    { value: 'LocalBar', label: 'Бар', icon: LocalBar, category: 'lifestyle' },
    { value: 'LocalCafe', label: 'Кафе', icon: LocalCafe, category: 'lifestyle' },
    { value: 'LocalPizza', label: 'Пицца', icon: LocalPizza, category: 'lifestyle' },
    { value: 'LocalDining', label: 'Ресторан', icon: LocalDining, category: 'lifestyle' },

    // Entertainment
    { value: 'MusicNote', label: 'Музыка', icon: MusicNote, category: 'entertainment' },
    { value: 'Movie', label: 'Кино', icon: Movie, category: 'entertainment' },
    { value: 'Games', label: 'Игры', icon: Games, category: 'entertainment' },
    { value: 'TheaterComedy', label: 'Театр', icon: TheaterComedy, category: 'entertainment' },

    // Travel & Transport
    { value: 'Flight', label: 'Путешествия', icon: Flight, category: 'travel' },
    { value: 'DirectionsCar', label: 'Автомобиль', icon: DirectionsCar, category: 'travel' },
    { value: 'DirectionsBus', label: 'Автобус', icon: DirectionsBus, category: 'travel' },
    { value: 'DirectionsSubway', label: 'Метро', icon: DirectionsSubway, category: 'travel' },
    { value: 'DirectionsBoat', label: 'Лодка', icon: DirectionsBoat, category: 'travel' },
    { value: 'DirectionsTransit', label: 'Транспорт', icon: DirectionsTransit, category: 'travel' },
    { value: 'DirectionsRailway', label: 'Поезд', icon: DirectionsRailway, category: 'travel' },
    { value: 'LocalTaxi', label: 'Такси', icon: LocalTaxi, category: 'travel' },
    { value: 'Hotel', label: 'Отель', icon: Hotel, category: 'travel' },

    // Business & Services
    { value: 'Business', label: 'Бизнес', icon: Business, category: 'business' },
    { value: 'Security', label: 'Безопасность', icon: Security, category: 'business' },
    { value: 'LocalHospital', label: 'Медицина', icon: LocalHospital, category: 'business' },
    { value: 'LocalPharmacy', label: 'Аптека', icon: LocalPharmacy, category: 'business' },
    { value: 'LocalGasStation', label: 'АЗС', icon: LocalGasStation, category: 'business' },
    { value: 'LocalCarWash', label: 'Мойка', icon: LocalCarWash, category: 'business' },
    { value: 'LocalLaundryService', label: 'Прачечная', icon: LocalLaundryService, category: 'business' },
    { value: 'LocalPrintshop', label: 'Печать', icon: LocalPrintshop, category: 'business' },
    { value: 'LocalPostOffice', label: 'Почта', icon: LocalPostOffice, category: 'business' },
    { value: 'LocalLibrary', label: 'Библиотека', icon: LocalLibrary, category: 'business' },
    { value: 'LocalMall', label: 'Торговый центр', icon: LocalMall, category: 'business' },
    { value: 'LocalParking', label: 'Парковка', icon: LocalParking, category: 'business' },

    // Shopping & Commerce
    { value: 'ShoppingCart', label: 'Корзина', icon: ShoppingCart, category: 'shopping' },
    { value: 'LocalGroceryStore', label: 'Продукты', icon: LocalGroceryStore, category: 'shopping' },
    { value: 'LocalConvenienceStore', label: 'Магазин', icon: LocalConvenienceStore, category: 'shopping' },
    { value: 'LocalOffer', label: 'Скидка', icon: LocalOffer, category: 'shopping' },
    { value: 'Loyalty', label: 'Лояльность', icon: Loyalty, category: 'shopping' },
    { value: 'Redeem', label: 'Погашение', icon: Redeem, category: 'shopping' },
    { value: 'CardGiftcard', label: 'Подарочная карта', icon: CardGiftcard, category: 'shopping' },

    // Finance & Payments
    { value: 'AccountBalance', label: 'Баланс', icon: AccountBalance, category: 'finance' },
    { value: 'Payment', label: 'Платеж', icon: Payment, category: 'finance' },
    { value: 'CreditCard', label: 'Кредитная карта', icon: CreditCard, category: 'finance' },
    { value: 'Receipt', label: 'Чек', icon: Receipt, category: 'finance' },
    { value: 'LocalShipping', label: 'Доставка', icon: LocalShipping, category: 'finance' },

    // Communication
    { value: 'Email', label: 'Email', icon: Email, category: 'communication' },
    { value: 'Phone', label: 'Телефон', icon: Phone, category: 'communication' },
    { value: 'Notifications', label: 'Уведомления', icon: Notifications, category: 'communication' },
    { value: 'LocationOn', label: 'Местоположение', icon: LocationOn, category: 'communication' },
    { value: 'Schedule', label: 'Расписание', icon: Schedule, category: 'communication' },
    { value: 'CalendarToday', label: 'Календарь', icon: CalendarToday, category: 'communication' },

    // Special & Premium
    { value: 'Favorite', label: 'Избранное', icon: Favorite, category: 'special' },
    { value: 'Star', label: 'Звезда', icon: Star, category: 'special' },
    { value: 'Diamond', label: 'Алмаз', icon: Diamond, category: 'special' },
    { value: 'Celebration', label: 'Праздник', icon: Celebration, category: 'special' },
    { value: 'Event', label: 'Событие', icon: Event, category: 'special' },
    { value: 'TrendingUp', label: 'Тренд вверх', icon: TrendingUp, category: 'special' },
    { value: 'TrendingDown', label: 'Тренд вниз', icon: TrendingDown, category: 'special' },
    { value: 'Speed', label: 'Скорость', icon: Speed, category: 'special' },
    { value: 'Accessibility', label: 'Доступность', icon: Accessibility, category: 'special' },
    { value: 'Elderly', label: 'Пожилые', icon: Elderly, category: 'special' },
    { value: 'Spa', label: 'Спа', icon: Spa, category: 'special' },

    // Secret/Developer
    { value: 'Dev', label: 'Разработчик (секретная)', icon: DevIcon, category: 'secret' },
  ];

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: editData.first_name,
          last_name: editData.last_name,
        }
      });
      if (error) throw error;

      // If special name, set the dev icon and gold color
      if (editData.first_name === 'Ахмед' && editData.last_name === 'Шайхилов') {
        setChatSettings(prev => ({
          ...prev,
          pfp_icon: 'Dev',
          pfp_color: '#FFD700',
          pfp_type: 'icon',
          pfp_gradient: '',
        }));

        // Also update in database
        await supabase
          .from('user_chat_settings')
          .upsert({
            user_id: user.id,
            chat_name: editData.first_name,
            pfp_color: '#FFD700',
            pfp_icon: 'Dev',
            pfp_type: 'icon',
            pfp_image_url: null,
          }, {
            onConflict: 'user_id'
          });
      }

      setSnackbar({ open: true, message: 'Профиль обновлен успешно!', severity: 'success' });
      setIsEditing(false);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Ошибка при обновлении профиля', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      first_name: user?.user_metadata?.first_name || '',
      last_name: user?.user_metadata?.last_name || '',
    });
    setIsEditing(false);
  };

  const handleChatSettingsSave = async () => {
    if (!user) return;
    setChatSettingsLoading(true);
    try {
      let imageUrl = chatSettings.pfp_image_url;

      // Handle image upload if there's a selected image
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      // Upsert chat settings to the new table
      const { error } = await supabase
        .from('user_chat_settings')
        .upsert({
          user_id: user.id,
          chat_name: chatSettings.chat_name,
          pfp_color: chatSettings.pfp_color,
          pfp_icon: chatSettings.pfp_icon,
          pfp_type: chatSettings.pfp_type,
          pfp_image_url: imageUrl,
          pfp_gradient: chatSettings.pfp_gradient,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Update local state
      setChatSettings(prev => ({
        ...prev,
        pfp_image_url: imageUrl
      }));

      setSnackbar({ open: true, message: 'Настройки чата обновлены!', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Ошибка при обновлении настроек чата', severity: 'error' });
    } finally {
      setChatSettingsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: 'Пожалуйста, выберите изображение', severity: 'error' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({ open: true, message: 'Размер файла должен быть меньше 5MB', severity: 'error' });
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Update chat settings
      setChatSettings(prev => ({
        ...prev,
        pfp_type: 'image'
      }));
    }
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    setChatSettings(prev => ({
      ...prev,
      pfp_color: color,
      pfp_type: 'icon'
    }));
  };

  const handleGradientChange = (gradient: string) => {
    // gradients removed
  };

  const predefinedGradients: [] = [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Temporary function to check database schema
  const checkDatabaseSchema = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_chat_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Current user chat settings:', data);
      console.log('Database error:', error);
      console.log('Data keys:', data ? Object.keys(data) : 'No data');
      console.log('pfp_type:', data?.pfp_type);
      console.log('pfp_image_url:', data?.pfp_image_url);
      console.log('pfp_gradient:', data?.pfp_gradient);
    } catch (err) {
      console.error('Error checking database schema:', err);
    }
  };

  // Temporary function to add missing columns
  const addMissingColumns = async () => {
    if (!user) return;
    try {
      // Try to add the columns using RPC
      const { data, error } = await supabase.rpc('add_profile_picture_columns');
      console.log('Add columns result:', data, error);

      if (error) {
        console.log('RPC failed, trying direct SQL...');
        // Fallback: try to update the user's settings with new fields
        const { error: updateError } = await supabase
          .from('user_chat_settings')
          .upsert({
            user_id: user.id,
            chat_name: chatSettings.chat_name,
            pfp_color: chatSettings.pfp_color,
            pfp_icon: chatSettings.pfp_icon,
            pfp_type: 'icon',
            pfp_image_url: '',
            pfp_gradient: 'linear-gradient(45deg, #1976d2, #42a5f5)',
          }, {
            onConflict: 'user_id'
          });

        console.log('Update result:', updateError);
      }
    } catch (err) {
      console.error('Error adding columns:', err);
    }
  };



  // Function to check if profile image exists in storage
  const checkProfileImage = async () => {
    if (!user || !chatSettings.pfp_image_url) {
      console.log('No user or no image URL to check');
      return;
    }

    try {
      console.log('Checking profile image...');
      console.log('Image URL:', chatSettings.pfp_image_url);

      // Try to fetch the image to see if it exists
      const response = await fetch(chatSettings.pfp_image_url);

      if (response.ok) {
        console.log('✅ Profile image exists and is accessible');
        console.log('Response status:', response.status);
        console.log('Content type:', response.headers.get('content-type'));
      } else {
        console.log('❌ Profile image not found or not accessible');
        console.log('Response status:', response.status);

        // Try to list files in the storage bucket
        const { data: files, error } = await supabase.storage
          .from('profile-pictures')
          .list();

        if (error) {
          console.error('Error listing storage files:', error);
        } else {
          console.log('Files in profile-pictures bucket:', files);
        }
      }
    } catch (error) {
      console.error('Error checking profile image:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Профиль пользователя
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{
              width: 80,
              height: 80,
              mr: 3,
              background: isSpecialName ? 'linear-gradient(45deg, #4CAF50, #2196F3)' : 'primary.main',
              boxShadow: isSpecialName ? '0 0 10px #2196F3' : 'none',
            }}>
              {isSpecialName ?
                <AnimatedDevIcon /> :
                <Person sx={{ fontSize: 40 }} />
              }
            </Avatar>
            <Box>
              <Typography variant="h5" gutterBottom>
                {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
                {isSpecialName &&
                  <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#4CAF50' }}>💻</span>
                }
              </Typography>
              <Chip
                label={user?.user_metadata?.isAdmin ? 'Администратор' : 'Пользователь'}
                color={user?.user_metadata?.isAdmin ? 'error' : 'primary'}
                size="small"
              />
            </Box>
          </Box>

          {/* Fix the layout spacing and prevent text wrapping */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Email sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Email:
                </Typography>
                <Typography variant="body1">
                  {user?.email}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Регистрация:
                </Typography>
                <Typography variant="body1">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Имя:
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editData.first_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                    size="small"
                    sx={{ width: 200 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {user?.user_metadata?.first_name || 'Не указано'}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Person sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  Фамилия:
                </Typography>
                {isEditing ? (
                  <TextField
                    value={editData.last_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                    size="small"
                    sx={{ width: 200 }}
                  />
                ) : (
                  <Typography variant="body1">
                    {user?.user_metadata?.last_name || 'Не указано'}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {isEditing ? (
              <>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  disabled={loading}
                  startIcon={<Cancel />}
                >
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                  startIcon={<Save />}
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => setIsEditing(true)}
                startIcon={<Edit />}
              >
                Редактировать
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Chat Settings Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chat />
            Настройки чата
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {/* Chat Name */}
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                Имя в чате
              </Typography>
              <TextField
                fullWidth
                value={chatSettings.chat_name}
                onChange={(e) => setChatSettings(prev => ({ ...prev, chat_name: e.target.value }))}
                placeholder="Введите имя для чата"
                size="small"
              />
            </Box>

            {/* Profile Picture Preview */}
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                Предпросмотр аватара
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: chatSettings.pfp_type === 'image' ? 'transparent' :
                      chatSettings.pfp_icon === 'Dev' ? 'transparent' : chatSettings.pfp_color,
                    background: chatSettings.pfp_type === 'image' ? 'none' :
                      chatSettings.pfp_icon === 'Dev' ? 'linear-gradient(45deg, #4CAF50, #2196F3)' : chatSettings.pfp_color,
                    boxShadow: chatSettings.pfp_icon === 'Dev' ? '0 0 10px #2196F3' : 'none',
                    fontSize: '1.5rem',
                    backgroundImage: chatSettings.pfp_type === 'image' ? `url(${imagePreview || chatSettings.pfp_image_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {chatSettings.pfp_type === 'image' ? null : (() => {
                    const selectedIcon = pfpIcons.find(icon => icon.value === chatSettings.pfp_icon);
                    if (selectedIcon) {
                      const IconComponent = selectedIcon.icon;
                      const isSpecialIcon = chatSettings.pfp_icon === 'Dev';

                      if (isSpecialIcon) {
                        return <AnimatedDevIcon sx={{ fontSize: '3rem' }} />;
                      } else {
                        return <IconComponent
                          sx={{
                            fontSize: '3rem',
                            color: 'white',
                            opacity: 0.7
                          }}
                        />;
                      }
                    }
                    return chatSettings.pfp_icon;
                  })()}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {chatSettings.chat_name}
                    {chatSettings.pfp_icon === 'Dev' &&
                      <span style={{ marginLeft: '4px', fontSize: '0.8em', color: '#4CAF50' }}>💻</span>
                    }
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Пример сообщения
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Profile Picture Type */}
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                Тип аватара
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button
                  variant={chatSettings.pfp_type === 'icon' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setChatSettings(prev => ({ ...prev, pfp_type: 'icon' }))}
                >
                  Иконка
                </Button>
                <Button
                  variant={chatSettings.pfp_type === 'image' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setChatSettings(prev => ({ ...prev, pfp_type: 'image' }))}
                >
                  Изображение
                </Button>

              </Box>
            </Box>

            {/* Image Upload */}
            {chatSettings.pfp_type === 'image' && (
              <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Загрузить изображение
                </Typography>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    fullWidth
                    startIcon={<Palette />}
                  >
                    Выбрать изображение
                  </Button>
                </label>
                {selectedImage && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Выбрано: {selectedImage.name}
                  </Typography>
                )}
              </Box>
            )}



            {/* Custom Color Picker */}
            {chatSettings.pfp_type === 'icon' && (
              <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Пользовательский цвет
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: customColor,
                      border: '2px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  />
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    style={{
                      width: 40,
                      height: 40,
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Нажмите для выбора цвета
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Predefined Colors */}
            {chatSettings.pfp_type === 'icon' && (
              <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Предустановленные цвета
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {pfpColors.map((color) => (
                    <Box
                      key={color}
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: color,
                        cursor: 'pointer',
                        border: chatSettings.pfp_color === color ? '3px solid #000' : '2px solid #ddd',
                        '&:hover': {
                          border: '3px solid #666',
                        }
                      }}
                      onClick={() => setChatSettings(prev => ({ ...prev, pfp_color: color }))}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Profile Picture Icon */}
            {chatSettings.pfp_type === 'icon' && (
              <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Иконка аватара
                </Typography>

                {/* Category Tabs */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {['basic', 'activities', 'lifestyle', 'entertainment', 'travel', 'business', 'shopping', 'finance', 'communication', 'special'].map((category) => (
                    <Button
                      key={category}
                      variant="outlined"
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        minWidth: 'auto',
                        px: 1,
                        py: 0.5
                      }}
                    >
                      {category === 'basic' ? 'Основные' :
                        category === 'activities' ? 'Активности' :
                          category === 'lifestyle' ? 'Образ жизни' :
                            category === 'entertainment' ? 'Развлечения' :
                              category === 'travel' ? 'Путешествия' :
                                category === 'business' ? 'Бизнес' :
                                  category === 'shopping' ? 'Покупки' :
                                    category === 'finance' ? 'Финансы' :
                                      category === 'communication' ? 'Общение' :
                                        category === 'special' ? 'Особые' : category}
                    </Button>
                  ))}
                </Box>

                {/* Icons Grid */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
                  gap: 1,
                  maxHeight: 200,
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#c1c1c1',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#a8a8a8',
                  },
                }}>
                  {pfpIcons.map((iconOption) => {
                    const IconComponent = iconOption.icon;
                    return (
                      <Box
                        key={iconOption.value}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: chatSettings.pfp_color,
                          background: chatSettings.pfp_color,
                          cursor: 'pointer',
                          border: chatSettings.pfp_icon === iconOption.value ? '3px solid #000' : '2px solid #ddd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          '&:hover': {
                            border: '3px solid #666',
                            transform: 'scale(1.1)',
                            transition: 'all 0.2s ease',
                          }
                        }}
                        onClick={() => setChatSettings(prev => ({ ...prev, pfp_icon: iconOption.value }))}
                        title={iconOption.label}
                      >
                        <IconComponent sx={{ fontSize: '1.5rem', color: 'white', opacity: 0.7 }} />
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleChatSettingsSave}
              disabled={chatSettingsLoading}
              startIcon={<Save />}
            >
              {chatSettingsLoading ? 'Сохранение...' : 'Сохранить настройки чата'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Информация о системе
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                ID пользователя:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {user?.id}
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary">
                Последний вход:
              </Typography>
              <Typography variant="body2">
                {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Неизвестно'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {showDevSettings && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Показывать и изменять информацию для разработчиков
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body1" gutterBottom>
                  Доступ к админке инвестиций
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => window.location.href = '/admin/investments'}
                >
                  Перейти в админку инвестиций
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

interface SettingsProps {
  showDevSettings: boolean;
  setShowDevSettings: React.Dispatch<React.SetStateAction<boolean>>;
  magnifierEnabled: boolean;
  setMagnifierEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  magnifierIntensity: number; // Controlled prop
  setMagnifierIntensity: React.Dispatch<React.SetStateAction<number>>; // Controlled prop setter
  experimentalThemesEnabled: boolean;
  setExperimentalThemesEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const Settings: React.FC<SettingsProps> = ({
  showDevSettings,
  setShowDevSettings,
  magnifierEnabled,
  setMagnifierEnabled,
  magnifierIntensity, // Direct prop
  setMagnifierIntensity, // Direct prop setter
  experimentalThemesEnabled,
  setExperimentalThemesEnabled,
}) => {
  const theme = useTheme(); // Use useTheme hook here
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Get theme from localStorage
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    return savedTheme || 'light';
  });

  const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => {
    const savedVariant = localStorage.getItem('themeVariant') as ThemeVariant;
    return savedVariant || 'default';
  });

  const handleThemeChange = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    localStorage.setItem('theme', newTheme);
    // Reload page to apply theme
    window.location.reload();
  };

  const handleThemeVariantChange = (newVariant: ThemeVariant) => {
    setThemeVariant(newVariant);
    localStorage.setItem('themeVariant', newVariant);
    // Reload page to apply theme
    window.location.reload();
  };

  // Gradient background for the header
  const headerBg = theme.palette.mode === 'light'
    ? `linear-gradient(180deg, ${theme.palette.primary.main}1A 0%, transparent 100%)`
    : `linear-gradient(180deg, ${theme.palette.primary.main}33 0%, transparent 100%)`;


  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Settings Page Header with Gradient from PageHeader.tsx */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          background: headerBg, // Apply the gradient
          borderRadius: 1.5,
          px: 2,
          py: 1.5,
          // Removed boxShadow to match PageHeader.tsx
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', m: 0 }}> {/* Removed icon here */}
          Настройки
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{
              cursor: 'pointer',
              fontWeight: 'medium',
              '&:hover': {
                transition: 'all 0.2s ease',
                fontWeight: 'bold'
              }
            }}
            onClick={() => setShowDevSettings(!showDevSettings)}
          >
            Банк Маннру v3 BETA
          </Typography>
        </Box>
      </Box>

      {/* Accessibility Section */}
      <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Accessibility fontSize="small" />
            <Typography variant="h6">Доступность</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={magnifierEnabled}
                  onChange={(e) => setMagnifierEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Экранная лупа"
            />
          </Box>
          {magnifierEnabled && (
            <Box sx={{ mb: 2, ml: 4 }}> {/* Indent slider slightly */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Интенсивность увеличения
              </Typography>
              <Slider
                value={magnifierIntensity}
                onChange={(_event: Event, newValue: number | number[]) => setMagnifierIntensity(newValue as number)}
                min={1}
                max={3}
                step={0.1}
                marks={[
                  { value: 1, label: '1x' },
                  { value: 2, label: '2x' },
                  { value: 3, label: '3x' }
                ]}
                valueLabelDisplay="auto"
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Palette fontSize="small" />
            <Typography variant="h6">Внешний вид</Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}> {/* Increased gap */}
            <Box>
              <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Palette fontSize="small" /> Тема оформления
              </Typography>
              <FormControl fullWidth size="small"> {/* Added size="small" for compactness */}
                <Select
                  value={themeMode}
                  onChange={(e) => handleThemeChange(e.target.value as ThemeMode)}
                >
                  <MenuItem value="light">Светлая</MenuItem>
                  <MenuItem value="dark">Темная</MenuItem>
                  <MenuItem value="system">Системная</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Выберите предпочитаемую тему оформления. "Системная" автоматически следует настройкам вашей операционной системы.
              </Typography>
            </Box>

            <Box>
              <Typography variant="body1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ColorLens fontSize="small" /> Цветовая схема
              </Typography>
              <FormControl fullWidth size="small"> {/* Added size="small" for compactness */}
                <Select
                  value={themeVariant}
                  onChange={(e) => handleThemeVariantChange(e.target.value as ThemeVariant)}
                >
                  {(
                    experimentalThemesEnabled
                      ? [...themeVariants, ...experimentalThemeVariants]
                      : themeVariants
                  ).map((variant) => (
                    <MenuItem key={variant.value} value={variant.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: variant.color,
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        />
                        {variant.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Выберите цветовую схему для интерфейса.
              </Typography>
            </Box>
            {/* Visual Theme Selection previews removed */}
          </Box>
        </CardContent>
      </Card>

      {/* Developer Settings */}
      {showDevSettings && (
        <Card sx={{ mt: 3, boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DevIcon fontSize="small" />
              <Typography variant="h6">Разработчик</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SupervisedUserCircle fontSize="small" /> Администрирование
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<MonetizationOn />}
                  onClick={() => window.location.href = '/admin/investments'}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Инвестиции
                </Button>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Экспериментальные темы
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={experimentalThemesEnabled}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setExperimentalThemesEnabled(next);
                        localStorage.setItem('experimentalThemes', String(next));
                      }}
                      color="primary"
                    />
                  }
                  label="Включить экспериментальные темы (изменяет внешний вид всего сайта)"
                />
                <Typography variant="caption" color="text.secondary">
                  Добавляет новые цветовые схемы и активирует продвинутые стили кнопок, карточек и диалогов.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

interface AppContentProps {
  showDevSettings: boolean;
  setShowDevSettings: React.Dispatch<React.SetStateAction<boolean>>;
  magnifierIntensity?: number;
  setMagnifierIntensity?: React.Dispatch<React.SetStateAction<number>>;
  experimentalThemesEnabled: boolean;
  setExperimentalThemesEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

function AppContent({ showDevSettings, setShowDevSettings, magnifierIntensity = 1.5, setMagnifierIntensity, experimentalThemesEnabled, setExperimentalThemesEnabled }: AppContentProps) {
  const [magnifierEnabled, setMagnifierEnabled] = useState(() => {
    const saved = localStorage.getItem('magnifierEnabled');
    return saved === 'true';
  });
  const [localMagnifierIntensity, setLocalMagnifierIntensity] = useState<number>(() => {
    const saved = localStorage.getItem('magnifierIntensity');
    return saved ? parseFloat(saved) : 1.5;
  });

  // Persist magnifierEnabled state
  useEffect(() => {
    localStorage.setItem('magnifierEnabled', String(magnifierEnabled));
  }, [magnifierEnabled]);

  // Persist localMagnifierIntensity state
  useEffect(() => {
    localStorage.setItem('magnifierIntensity', String(localMagnifierIntensity));
  }, [localMagnifierIntensity]);

  // If setMagnifierIntensity is provided, update it when localMagnifierIntensity changes
  useEffect(() => {
    if (setMagnifierIntensity) {
      setMagnifierIntensity(localMagnifierIntensity);
    }
  }, [localMagnifierIntensity, setMagnifierIntensity]);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const { user, signUp } = useAuthContext();
  // Message dialog state
  const [userMsg, setUserMsg] = useState<any>(null);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<any>(null);
  const [cheatDetected, setCheatDetected] = useState(false);
  const [cheatAmount, setCheatAmount] = useState<number | null>(null);
  const [floodPopups, setFloodPopups] = useState<Array<{ id: number; x: number; y: number; r: number }>>([]);
  const [hasZeroed, setHasZeroed] = useState(false);
  const [blackScreen, setBlackScreen] = useState(false);
  const [questionStep, setQuestionStep] = useState<number | null>(null);
  const yesStory: string[] = [
    'Ты улыбнулся, наблюдая, как графики летят в космос.',
    'Люди в панике скупают всё подряд, а ты — спокойный дирижёр хаоса.',
    'Казалось бы, это просто игра... но цифры — настоящие.',
    'Экономика — это доверие. Стоило ли оно того?',
    'Когда всё обрушится, ты тоже упадёшь вместе с графиком?',
    'Ответ прост: ответственность всегда догоняет. Всегда.',
    'Ты можешь делать что угодно, но ты не можешь скрыться от ответственности.',
    'Вот ты и проиграл. Всегда.',
    'Ты всегда можешь начать сначала, но ты никогда не сможешь вернуться к тому, что было.',
    'ТЕБЕ ЭТО НРАВИТСЯ?',
    'ЭТО ВСЁ ИГРА',
    'НО НЕ ЗНАЧИТ ЧТО ЕЁ НАДО ПОРТИТЬ',
    'И ПОТОМ ПОТРЯСИТЬ ПОЧТИ ВСЕ ОБЪЕКТЫ В ОКРУЖАЮЩЕМ МИРЕ',
    'ПОЭТОМУ, ЕСЛИ ТЫ ТАК СОБИРАЕШЬСЯ ИГРАТЬ ДАЛЬШЕ - ТЫ БУДЕШЬ ЗАБЛОКИРОВАН',
    'БОЛЬШЕ ТАК НЕ ДЕЛАЙ.'
  ];
  const [storyIndex, setStoryIndex] = useState(0);
  const [scaryMode, setScaryMode] = useState(false);
  const [enoughPopups, setEnoughPopups] = useState<Array<{ id: number; x: number; y: number; r: number }>>([]);

  // Use ref to access current userMsg in callbacks
  const userMsgRef = useRef(userMsg);
  userMsgRef.current = userMsg;

  useEffect(() => {
    if (!user || user.user_metadata?.isAdmin) return;
    // --- Realtime subscription for instant messages ---
    const channel = supabase.channel('user-messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_messages',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        console.log('INSERT event received:', payload);
        const msg = payload.new;
        if (!msg.read) {
          setUserMsg(msg);
          setMsgDialogOpen(true);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_messages',
        filter: `user_id=eq.${user.id}`
      }, payload => {
        console.log('UPDATE event received:', payload);
        const updatedMsg = payload.new;
        // If current message was marked as read, close dialog
        if (userMsgRef.current && userMsgRef.current.id === updatedMsg.id && updatedMsg.read) {
          console.log('Closing dialog for read message:', updatedMsg.id);
          setMsgDialogOpen(false);
          setUserMsg(null);
          setLockoutTimeLeft(null);
          if (lockoutTimer) clearInterval(lockoutTimer);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_messages'
      }, payload => {
        console.log('DELETE event received (all):', payload);
        const deletedMsg = payload.old;
        // If the currently displayed message was deleted, close the dialog
        if (userMsgRef.current && userMsgRef.current.id === deletedMsg.id) {
          console.log('Closing dialog for deleted message:', deletedMsg.id);
          setMsgDialogOpen(false);
          setUserMsg(null);
          setLockoutTimeLeft(null);
          if (lockoutTimer) clearInterval(lockoutTimer);
        }
      })
      .subscribe();
    // --- Polling fallback ---
    let interval: any;
    const pollMessages = async () => {
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: true })
        .limit(1);
      if (!error && data && data.length > 0) {
        setUserMsg(data[0]);
        setMsgDialogOpen(true);
      }
    };
    pollMessages();
    interval = setInterval(pollMessages, 10000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Global anti-cheat: detect huge balances anywhere
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        const CHEAT_THRESHOLD = 2e10; // adjust as needed
        const { data, error } = await supabase
          .from('bank_cards')
          .select('balance')
          .eq('user_id', user.id)
          .eq('is_active', true);
        if (!error && data && data.length) {
          const maxBal = Math.max(...data.map((d: any) => Number(d.balance || 0)));
          if (maxBal > CHEAT_THRESHOLD) {
            setCheatAmount(maxBal);
            setCheatDetected(true);
          }
        }
      } catch { }
    };
    run();
  }, [user]);

  // Flood effect and auto-zero, then black screen with questions
  useEffect(() => {
    if (!cheatDetected) { setFloodPopups([]); return; }
    let addTimer: any;
    let zeroTimer: any;
    const add = () => {
      setFloodPopups(prev => {
        const id = (prev[0]?.id || 0) + 1;
        const x = Math.random() * 100; // %
        const y = Math.random() * 100; // %
        const r = Math.random() * 40 - 20;
        const next = [...prev, { id, x, y, r }];
        return next.slice(-120);
      });
    };
    addTimer = setInterval(add, 100);
    zeroTimer = setTimeout(async () => {
      if (!user || hasZeroed) return;
      try {
        setHasZeroed(true);
        await supabase.from('bank_cards').update({ balance: 0 }).eq('user_id', user.id).eq('is_active', true);
      } catch { }
      setBlackScreen(true);
      setQuestionStep(0);
    }, 4000);
    return () => { addTimer && clearInterval(addTimer); zeroTimer && clearTimeout(zeroTimer); };
  }, [cheatDetected, user, hasZeroed]);

  // Reset story on opening
  useEffect(() => {
    if (blackScreen && questionStep === 1) {
      setStoryIndex(0);
      setScaryMode(false);
      setEnoughPopups([]);
    }
  }, [blackScreen, questionStep]);

  // Escalate to scary mode on CAPS lines
  useEffect(() => {
    if (questionStep !== 1) return;
    const line = yesStory[storyIndex] || '';
    const letters = line.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
    const isUpper = letters.length > 0 && letters === letters.toUpperCase();
    if (isUpper) setScaryMode(true);
  }, [questionStep, storyIndex]);

  // Spawn "ХВАТИТ." popups during scary mode
  useEffect(() => {
    if (!scaryMode) { setEnoughPopups([]); return; }
    let tm: any;
    tm = setInterval(() => {
      setEnoughPopups(prev => {
        const id = (prev[0]?.id || 0) + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const r = Math.random() * 30 - 15;
        const next = [...prev, { id, x, y, r }];
        return next.slice(-160);
      });
    }, 120);
    return () => tm && clearInterval(tm);
  }, [scaryMode]);

  useEffect(() => {
    // Lockout logic
    if (userMsg && userMsg.type === 'lockout' && userMsg.data && userMsg.data.duration) {
      // If already locked out, don't restart timer
      if (lockoutTimeLeft !== null) return;
      let totalSeconds = 0;
      if (userMsg.data.unit === 'seconds') {
        totalSeconds = userMsg.data.duration;
      } else {
        totalSeconds = userMsg.data.duration * 60;
      }
      setLockoutTimeLeft(totalSeconds);
      const timer = setInterval(() => {
        setLockoutTimeLeft(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-close and mark as read
            setTimeout(() => handleCloseMsgDialog(), 500); // slight delay to allow UI update
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setLockoutTimer(timer);
      return () => clearInterval(timer);
    }
    // Cleanup timer if not lockout
    return () => {
      if (lockoutTimer) clearInterval(lockoutTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMsg]);

  const handleCloseMsgDialog = async () => {
    setMsgDialogOpen(false);
    if (userMsg) {
      await supabase.from('user_messages').update({ read: true }).eq('id', userMsg.id);
      setUserMsg(null);
      setLockoutTimeLeft(null);
      if (lockoutTimer) clearInterval(lockoutTimer);
    }
  };

  const handleLogin = async (data: any) => {
    setIsLoading(true);
    setError(undefined);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setError(error.message);
    }

    setIsLoading(false);
  };

  const handleRegister = async (data: any) => {
    setIsLoading(true);
    setError(undefined);

    const { error } = await signUp(data.email, data.password, {
      firstName: data.firstName,
      lastName: data.lastName,
    });

    if (error) {
      setError(error.message);
    } else {
      setError('Проверьте вашу почту для подтверждения регистрации');
    }

    setIsLoading(false);
  };

  const handleSwitchToRegister = () => {
    setIsLoginMode(false);
    setError(undefined);
  };

  const handleSwitchToLogin = () => {
    setIsLoginMode(true);
    setError(undefined);
  };

  // Render message content based on type
  let dialogContent = null;
  if (userMsg) {
    if (userMsg.type === 'html') {
      // WARNING: In production, sanitize HTML to prevent XSS!
      dialogContent = <div dangerouslySetInnerHTML={{ __html: userMsg.message }} />;
    } else if (userMsg.type === 'lockout') {
      dialogContent = (
        <>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>Ваша учетная запись заблокирована!</Typography>
          <Typography sx={{ mb: 2 }}>{userMsg.data?.reason || ''}</Typography>
          <Typography sx={{ mb: 1 }}>
            Блокировка: {userMsg.data.duration} {userMsg.data.unit === 'seconds' ? 'секунд' : 'минут'}.
          </Typography>
          {lockoutTimeLeft !== null && lockoutTimeLeft > 0 ? (
            <Typography>Осталось: {Math.floor(lockoutTimeLeft / 60)}:{(lockoutTimeLeft % 60).toString().padStart(2, '0')}</Typography>
          ) : (
            <Typography color="success.main">Блокировка снята. Вы можете продолжить работу.</Typography>
          )}
        </>
      );
    } else if (userMsg.type === 'tech') {
      dialogContent = (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
            Важное техническое сообщение
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
            {userMsg.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Это сообщение отправлено администрацией и не может быть закрыто.
          </Typography>
        </Box>
      );
    } else {
      dialogContent = <Typography>{userMsg.message}</Typography>;
    }
  }

  // Custom lockout dialog props
  const lockoutDialogProps: Partial<DialogProps> =
    userMsg?.type === 'lockout' && lockoutTimeLeft && lockoutTimeLeft > 0
      ? {
        disableEscapeKeyDown: true,
        onClose: undefined,
        PaperProps: {
          sx: {
            bgcolor: 'error.main',
            color: 'white',
            border: '4px solid #b71c1c',
            boxShadow: 8,
            textAlign: 'center',
          },
        },
        BackdropProps: {
          style: { backgroundColor: 'rgba(183,28,28,0.85)' },
        },
      }
      : userMsg?.type === 'tech'
        ? {
          disableEscapeKeyDown: true,
          onClose: undefined,
        }
        : {};

  return (
    <>
      {/* System event notifications - will only show when triggered */}
      {user && <EventNotification />}

      <Routes>
        <Route
          path="/vault-management"
          element={
            <ProtectedRoute>
              <AppLayout
                showDevSettings={showDevSettings}
                magnifierEnabled={magnifierEnabled}
                magnifierIntensity={localMagnifierIntensity}
              >
                <VaultManagementPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/memory"
          element={
            <ProtectedRoute>
              <AppLayout
                showDevSettings={showDevSettings}
                magnifierEnabled={magnifierEnabled}
                magnifierIntensity={localMagnifierIntensity}
              >
                <MemoryGame />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/fortune-wheel"
          element={
            <ProtectedRoute>
              <AppLayout
                showDevSettings={showDevSettings}
                magnifierEnabled={magnifierEnabled}
                magnifierIntensity={localMagnifierIntensity}
              >
                <FortuneWheelGame />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/chart-runner"
          element={
            <ProtectedRoute>
              <AppLayout
                showDevSettings={showDevSettings}
                magnifierEnabled={magnifierEnabled}
                magnifierIntensity={localMagnifierIntensity}
              >
                <ChartRunnerGame />
              </AppLayout>
            </ProtectedRoute>
          }
        />
                <Route
          path="/games/grow-a-bank"
          element={
            <ProtectedRoute>
              <AppLayout
                showDevSettings={showDevSettings}
                magnifierEnabled={magnifierEnabled}
                magnifierIntensity={localMagnifierIntensity}
              >
                <BankGardenGame />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              isLoginMode ? (
                <LoginForm
                  onSubmit={handleLogin}
                  onRegisterClick={handleSwitchToRegister}
                  isLoading={isLoading}
                  error={error}
                />
              ) : (
                <RegisterForm
                  onSubmit={handleRegister}
                  onLoginClick={handleSwitchToLogin}
                  isLoading={isLoading}
                  error={error}
                />
              )
            )
          }
        />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout
              showDevSettings={showDevSettings}
              magnifierEnabled={magnifierEnabled}
              magnifierIntensity={localMagnifierIntensity}
            />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="payments" element={<Payments />} />
          <Route path="profile" element={<Profile showDevSettings={showDevSettings} />} />
          {/* Pass showDevSettings and setShowDevSettings as props */}
          <Route path="settings" element={
            <Settings
              showDevSettings={showDevSettings}
              setShowDevSettings={setShowDevSettings}
              magnifierEnabled={magnifierEnabled}
              setMagnifierEnabled={setMagnifierEnabled}
              magnifierIntensity={localMagnifierIntensity} // Pass local state
              setMagnifierIntensity={setLocalMagnifierIntensity} // Pass local setter
              experimentalThemesEnabled={experimentalThemesEnabled}
              setExperimentalThemesEnabled={setExperimentalThemesEnabled}
            />}
          />
        </Route>

        <Route path="/marketplace" element={
          <ProtectedRoute>
            <AppLayout
              showDevSettings={showDevSettings}
              magnifierEnabled={magnifierEnabled}
              magnifierIntensity={localMagnifierIntensity}
            />
          </ProtectedRoute>
        }>

          <Route index element={<Marketplace />} />
          <Route path="vault-management" element={<VaultManagementPage />} />
          <Route path="chat" element={<MarketplaceChat />} />
          <Route path="my-listings" element={<MyListings />} />
          <Route path="favorites" element={<FavoritesMarketplace />} />
        </Route>

        <Route path="/features-marketplace" element={<ProtectedRoute><AppLayout showDevSettings={showDevSettings} magnifierEnabled={magnifierEnabled} magnifierIntensity={localMagnifierIntensity}><FeaturesMarketplace /></AppLayout></ProtectedRoute>} />
        <Route path="/mannshell" element={<MannShell />} />
        <Route path="/investments" element={<ProtectedRoute><AppLayout showDevSettings={showDevSettings} magnifierEnabled={magnifierEnabled} magnifierIntensity={localMagnifierIntensity}><Investments /></AppLayout></ProtectedRoute>} />
        <Route path="/darkhaxorz6557453555c3h2he1a6t8s" element={<AppLayout showDevSettings={showDevSettings} magnifierEnabled={magnifierEnabled} magnifierIntensity={localMagnifierIntensity}><Cheats /></AppLayout>} />
        <Route path="/games/tapping" element={<TappingGame />} />
        <Route path="/games/flip" element={<AppLayout showDevSettings={showDevSettings} magnifierEnabled={magnifierEnabled} magnifierIntensity={localMagnifierIntensity}><FlipGame /></AppLayout>} />
        <Route path="/giveaways" element={<AppLayout showDevSettings={showDevSettings} magnifierEnabled={magnifierEnabled} magnifierIntensity={localMagnifierIntensity}><GiveawayFunction /></AppLayout>} />
        <Route path="/chat" element={<AppLayout showDevSettings={showDevSettings} magnifierEnabled={magnifierEnabled} magnifierIntensity={localMagnifierIntensity}><GlobalChat /></AppLayout>} />
        <Route path="/admin" element={user && user.user_metadata?.isAdmin ? <AdminPanel /> : <div style={{ padding: 32, textAlign: 'center' }}><h2>Not authorized</h2></div>} />
        <Route path="/admin/investments" element={<AppLayout><AdminInvestments /></AppLayout>} />

        {/* Landing page as main page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* User message dialog */}
      <Dialog
        open={msgDialogOpen}
        onClose={userMsg?.type === 'lockout' && lockoutTimeLeft && lockoutTimeLeft > 0 ? undefined : handleCloseMsgDialog}
        maxWidth="xs"
        fullWidth
        {...lockoutDialogProps}
      >
        <DialogTitle sx={userMsg?.type === 'lockout' ? { color: 'white', bgcolor: 'error.dark', fontWeight: 'bold' } : {}}>
          {userMsg?.type === 'lockout' ? 'Блокировка' : userMsg?.type === 'html' ? 'HTML сообщение' : 'Сообщение от администрации'}
        </DialogTitle>
        <DialogContent>
          {dialogContent}
        </DialogContent>
        <DialogActions sx={userMsg?.type === 'lockout' ? { display: 'flex', justifyContent: 'center', bgcolor: 'error.main' } : userMsg?.type === 'tech' ? { display: 'none' } : {}}>
          {userMsg?.type === 'lockout' && lockoutTimeLeft && lockoutTimeLeft > 0 ? null :
            userMsg?.type === 'tech' ? null : (
              <Button onClick={handleCloseMsgDialog} variant="contained">OK</Button>
            )
          }
        </DialogActions>
      </Dialog>

      {/* Global flood overlay */}
      {cheatDetected && !blackScreen && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2000 }}>
          {floodPopups.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%, -50%) rotate(${p.r}deg)`,
                background: 'rgba(244,67,54,0.95)', color: '#fff', fontWeight: 900,
                padding: '4px 8px', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                textTransform: 'uppercase', letterSpacing: 1, fontSize: 12
              }}
            >
              HACKER
            </div>
          ))}
        </div>
      )}

      {/* Black screen questionnaire */}
      {blackScreen && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 520, width: '92%', background: '#121212', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
            {questionStep === 0 && (
              <>
                <h3 style={{ margin: '8px 0 16px' }}>Ты доволен что сломал экономику?</h3>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="contained" color="success" onClick={() => setQuestionStep(1)}>Да</Button>
                  <Button variant="contained" color="error" onClick={() => setQuestionStep(2)}>Нет</Button>
                </div>
              </>
            )}
            {questionStep === 1 && (
              <>
                <style>{`
              @keyframes pulseGlow { from { transform: scale(0.99); opacity: .9 } to { transform: scale(1.02); opacity: 1 } }
              @keyframes shake { 0%{ transform: translateX(-1px)} 25%{ transform: translateX(1px)} 50%{ transform: translateX(-1px)} 75%{ transform: translateX(1px)} 100%{ transform: translateX(-1px)} }
              @keyframes blink { 50% { opacity: .3 } }
            `}</style>
                {/* Enough popups */}
                {scaryMode && (
                  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 4500 }}>
                    {enoughPopups.map(p => (
                      <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%, -50%) rotate(${p.r}deg)`, background: 'rgba(255,23,68,0.95)', color: '#fff', fontWeight: 900, padding: '2px 6px', borderRadius: 4, letterSpacing: 1, boxShadow: '0 6px 20px rgba(0,0,0,0.4)', fontSize: 12 }}>ХВАТИТ.</div>
                    ))}
                  </div>
                )}
                {/* Per-line dialog navigation */}
                {(() => {
                  const line = yesStory[storyIndex] || '';
                  const letters = line.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
                  const isUpper = letters.length > 0 && letters === letters.toUpperCase();
                  const isFull = scaryMode && isUpper;
                  const style: React.CSSProperties = { margin: 0, lineHeight: 1.6 };
                  if (isUpper) {
                    style.color = '#ff5252';
                    style.fontWeight = 900;
                    style.textShadow = '0 0 12px rgba(255,82,82,0.9), 0 0 24px rgba(255,82,82,0.6)';
                    (style as any).animation = 'pulseGlow 1s ease-in-out infinite alternate, shake 0.5s linear infinite';
                    style.letterSpacing = 1;
                  }
                  if (line.includes('ИГРА')) {
                    style.color = '#7e57c2';
                    style.textShadow = '0 0 10px rgba(126,87,194,0.8)';
                    (style as any).animation = 'pulseGlow 1.2s ease-in-out infinite alternate';
                  }
                  if (line.includes('ЗАБЛОКИРОВАН')) {
                    style.color = '#ff1744';
                    (style as any).animation = 'blink .7s steps(2) infinite';
                  }
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: isFull ? '100%' : '92%', maxWidth: isFull ? '100%' : 520, background: isFull ? 'transparent' : '#121212', borderRadius: isFull ? 0 : 12, boxShadow: isFull ? 'none' : '0 12px 40px rgba(0,0,0,0.6)', padding: isFull ? 0 : 16, border: isFull ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={style}>{line}</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                          <Button variant="outlined" onClick={() => { if (storyIndex === 0) setQuestionStep(0); else setStoryIndex(i => Math.max(0, i - 1)); }}>Назад</Button>
                          <Button variant="contained" onClick={() => { if (storyIndex >= yesStory.length - 1) setQuestionStep(3); else setStoryIndex(i => i + 1); }}>Далее</Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            {questionStep === 2 && (
              <>
                <h3 style={{ margin: '8px 0 16px' }}>Хорошо. Тогда больше так не делай.</h3>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="contained" onClick={() => setQuestionStep(3)}>Понял</Button>
                </div>
              </>
            )}
            {questionStep === 3 && (
              <>
                <h3 style={{ margin: '8px 0 16px' }}>Экономика восстановлена. Можешь продолжать.</h3>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="contained" onClick={() => { setBlackScreen(false); setCheatDetected(false); setFloodPopups([]); setQuestionStep(null); }}>Закрыть</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>

  );
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode;
    return savedTheme || 'light';
  });

  const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => {
    const savedVariant = localStorage.getItem('themeVariant') as ThemeVariant;
    return savedVariant || 'default';
  });

  const [showDevSettings, setShowDevSettings] = useState(false);
  const [experimentalThemesEnabled, setExperimentalThemesEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('experimentalThemes');
    return saved ? saved === 'true' : false;
  });

  const currentTheme = createAppTheme(themeMode, themeVariant, experimentalThemesEnabled);

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <ThemeContextProvider
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        themeVariant={themeVariant}
        setThemeVariant={setThemeVariant}
      >
        <AuthProvider>
          <NotificationProvider>
            <Router>
              <AppContent
                showDevSettings={showDevSettings}
                setShowDevSettings={setShowDevSettings}
                experimentalThemesEnabled={experimentalThemesEnabled}
                setExperimentalThemesEnabled={setExperimentalThemesEnabled}
              />
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </ThemeContextProvider>
    </ThemeProvider>
  )
}

export default App