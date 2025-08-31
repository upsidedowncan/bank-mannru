import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface QuickSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const QuickSearch: React.FC<QuickSearchProps> = ({
  onSearch,
  placeholder = "Быстрый поиск..."
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, onSearch]);

  const handleClear = () => {
    setSearchQuery('');
    setIsExpanded(false);
  };

  const handleToggle = () => {
    if (isExpanded) {
      handleClear();
    } else {
      setIsExpanded(true);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton onClick={handleToggle} size="small">
        <SearchIcon />
      </IconButton>
      
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box sx={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 3, p: 1, minWidth: 250 }}>
          <TextField
            size="small"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClear} size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            autoFocus
          />
        </Box>
      </Collapse>
    </Box>
  );
};

export default QuickSearch; 