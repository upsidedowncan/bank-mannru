import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Chip,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from '@mui/icons-material';
import { supabase } from '../../../config/supabase';
import { ChatMessage } from '../types';

interface MessageSearchProps {
  channelId: string;
  onMessageSelect: (messageId: string) => void;
  onClose: () => void;
}

interface SearchResult {
  message: ChatMessage;
  highlight: string;
  context: string;
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  channelId,
  onMessageSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'text' | 'media' | 'gifts'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() || !channelId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .ilike('message', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (searchType === 'media') {
        query = query.in('message_type', ['image', 'video', 'voice']);
      } else if (searchType === 'gifts') {
        query = query.eq('message_type', 'money_gift');
      }

      const { data, error } = await query;

      if (error) throw error;

      const results: SearchResult[] = (data || []).map((msg: ChatMessage) => {
        const message = msg.message || '';
        const index = message.toLowerCase().indexOf(searchQuery.toLowerCase());
        const start = Math.max(0, index - 50);
        const end = Math.min(message.length, index + searchQuery.length + 50);
        const context = message.substring(start, end);
        
        return {
          message: msg,
          highlight: searchQuery,
          context: context.length < message.length ? `...${context}...` : context,
        };
      });

      setSearchResults(results);
      setTotalResults(results.length);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, channelId, searchType]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleResultClick = (messageId: string) => {
    onMessageSelect(messageId);
    onClose();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setCurrentIndex(0);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'voice': return '🎤';
      case 'money_gift': return '💰';
      default: return '💬';
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h6">Поиск сообщений</Typography>
        <IconButton onClick={onClose} size="small">
          <ClearIcon />
        </IconButton>
      </Box>

      {/* Search Input */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Поиск сообщений..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton onClick={clearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Search Filters */}
      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Тип сообщений</InputLabel>
          <Select
            value={searchType}
            label="Тип сообщений"
            onChange={(e) => setSearchType(e.target.value as any)}
          >
            <MenuItem value="all">Все сообщения</MenuItem>
            <MenuItem value="text">Только текст</MenuItem>
            <MenuItem value="media">Медиа файлы</MenuItem>
            <MenuItem value="gifts">Подарки</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Results Count */}
      {totalResults > 0 && (
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Найдено: {totalResults} сообщений
          </Typography>
          {totalResults > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                size="small"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              >
                <PrevIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption">
                {currentIndex + 1} из {totalResults}
              </Typography>
              <IconButton
                size="small"
                disabled={currentIndex === totalResults - 1}
                onClick={() => setCurrentIndex(prev => Math.min(totalResults - 1, prev + 1))}
              >
                <NextIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Results */}
      {!loading && searchResults.length > 0 && (
        <List sx={{ flex: 1, overflowY: 'auto' }}>
          {searchResults.map((result, index) => (
            <React.Fragment key={result.message.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleResultClick(result.message.id)}
                  selected={index === currentIndex}
                  sx={{ flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {getMessageTypeIcon(result.message.message_type)}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {result.message.user_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(result.message.created_at)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-word',
                      '& mark': {
                        backgroundColor: 'warning.light',
                        color: 'warning.contrastText',
                        padding: '0 2px',
                        borderRadius: '2px',
                      },
                    }}
                    dangerouslySetInnerHTML={{
                      __html: result.context.replace(
                        new RegExp(`(${searchQuery})`, 'gi'),
                        '<mark>$1</mark>'
                      ),
                    }}
                  />
                </ListItemButton>
              </ListItem>
              {index < searchResults.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* No Results */}
      {!loading && searchQuery && searchResults.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Typography variant="body1" color="text.secondary">
            Сообщения не найдены
          </Typography>
        </Box>
      )}

      {/* Empty State */}
      {!searchQuery && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Typography variant="body1" color="text.secondary">
            Введите текст для поиска
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MessageSearch; 