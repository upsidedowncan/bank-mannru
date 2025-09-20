import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Fade,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  AutoFixHigh,
  Psychology,
  CheckCircle,
  Warning,
  Close,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';

interface MessageSuggestion {
  id: string;
  text: string;
  confidence: number;
}

interface ContentModerationResult {
  isAppropriate: boolean;
  reason?: string;
  confidence: number;
}

interface ChatSuggestionsProps {
  suggestions: MessageSuggestion[];
  isGeneratingSuggestions: boolean;
  contentModerationResult: ContentModerationResult | null;
  isModerating: boolean;
  onSuggestionClick: (suggestion: string) => void;
  onClose: () => void;
  enabled: boolean;
  currentMessage: string; // Add current message to show autocomplete
}

export const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({
  suggestions,
  isGeneratingSuggestions,
  contentModerationResult,
  isModerating,
  onSuggestionClick,
  onClose,
  enabled,
  currentMessage
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Auto-collapse after 10 seconds
  React.useEffect(() => {
    if (suggestions.length > 0 || contentModerationResult || isModerating) {
      setIsExpanded(true);
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [suggestions.length, contentModerationResult, isModerating]);

  if (!enabled) return null;

  // Get the best suggestion for autocomplete
  const getBestSuggestion = () => {
    if (suggestions.length === 0) return null;
    return suggestions.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  };

  const bestSuggestion = getBestSuggestion();
  const showAutocomplete = bestSuggestion && currentMessage.trim().length > 0;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'default';
  };

  const getModerationIcon = () => {
    if (isModerating) return <CircularProgress size={16} />;
    if (!contentModerationResult) return null;
    
    return contentModerationResult.isAppropriate ? (
      <CheckCircle color="success" fontSize="small" />
    ) : (
      <Warning color="error" fontSize="small" />
    );
  };

  const getModerationColor = () => {
    if (!contentModerationResult) return 'text.secondary';
    return contentModerationResult.isAppropriate ? 'success.main' : 'error.main';
  };

  return (
    <>
      {/* Autocomplete placeholder */}
      {showAutocomplete && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            mb: 1,
            p: 1,
            bgcolor: 'transparent',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.disabled',
              fontSize: '0.875rem',
              opacity: 0.7,
              fontStyle: 'italic',
            }}
          >
            {currentMessage}
            <span style={{ color: 'rgba(0,0,0,0.3)' }}>
              {bestSuggestion.text.substring(currentMessage.length)}
            </span>
          </Typography>
        </Box>
      )}

      {/* Collapsible suggestions panel */}
      <Fade in={enabled && (suggestions.length > 0 || isGeneratingSuggestions || contentModerationResult || isModerating)}>
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            mb: 1,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header with expand/collapse button */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              bgcolor: 'action.hover',
              cursor: 'pointer',
            }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoFixHigh fontSize="small" color="primary" />
              <Typography variant="subtitle2" color="primary">
                AI Помощник
              </Typography>
              {(suggestions.length > 0 || contentModerationResult || isModerating) && (
                <Chip 
                  label={suggestions.length > 0 ? `${suggestions.length} предложений` : 'Анализ'} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Collapsible content */}
          <Collapse in={isExpanded}>
            <Box sx={{ p: 2 }}>
              {/* Content Moderation */}
              {(contentModerationResult || isModerating) && (
                <Box sx={{ mb: suggestions.length > 0 ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Psychology fontSize="small" />
                    <Typography variant="body2" color={getModerationColor()}>
                      {isModerating ? 'Анализ контента...' : 'Модерация контента'}
                    </Typography>
                    {getModerationIcon()}
                  </Box>
                  
                  {contentModerationResult && !isModerating && (
                    <Box>
                      <Chip
                        label={contentModerationResult.isAppropriate ? 'Сообщение подходит' : 'Сообщение требует внимания'}
                        color={contentModerationResult.isAppropriate ? 'success' : 'error'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      {contentModerationResult.reason && (
                        <Typography variant="caption" color="text.secondary">
                          {contentModerationResult.reason}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Предложения продолжения:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {suggestions.map((suggestion) => (
                      <Box
                        key={suggestion.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'action.selected',
                          },
                        }}
                        onClick={() => onSuggestionClick(suggestion.text)}
                      >
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {suggestion.text}
                        </Typography>
                        <Chip
                          label={`${suggestion.confidence}%`}
                          color={getConfidenceColor(suggestion.confidence)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Loading State */}
              {isGeneratingSuggestions && suggestions.length === 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Генерирую предложения...
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      </Fade>
    </>
  );
};
