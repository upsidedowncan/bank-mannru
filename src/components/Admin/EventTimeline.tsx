import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Collapse,
  Card,
  CardContent,
  Button,
  useTheme,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  NotificationsActive as NotificationsActiveIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Event as EventIcon,
  Celebration as CelebrationIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format, parseISO, isAfter, isBefore, isToday, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { styled } from '@mui/system';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'notification' | 'maintenance' | 'promotion' | 'system' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  affected_users?: string[] | null;
  send_notification: boolean;
  notification_sent: boolean;
}

interface EventTimelineProps {
  events: Event[];
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (id: string) => void;
  onToggleActive: (event: Event) => void;
  onSendNotification: (event: Event) => void;
}

const TimelineConnector = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 28,
  width: 2,
  backgroundColor: theme.palette.divider,
  zIndex: 0,
}));

const TimelineDot = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  marginRight: 20,
  zIndex: 1,
}));

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  onEditEvent,
  onDeleteEvent,
  onToggleActive,
  onSendNotification,
}) => {
  const theme = useTheme();
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  
  const today = new Date();
  
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'notification':
        return <NotificationsActiveIcon sx={{ color: theme.palette.info.main }} />;
      case 'maintenance':
        return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
      case 'promotion':
        return <CelebrationIcon sx={{ color: theme.palette.success.main }} />;
      case 'system':
        return <InfoIcon sx={{ color: theme.palette.primary.main }} />;
      default:
        return <EventIcon />;
    }
  };

  const getStatusChip = (event: Event) => {
    const now = new Date();
    const startDate = parseISO(event.start_date);
    const endDate = event.end_date ? parseISO(event.end_date) : null;
    
    let status = 'active';
    let label = 'Активно';
    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'primary';
    
    if (!event.is_active) {
      status = 'inactive';
      label = 'Неактивно';
      color = 'default';
    } else if (isBefore(now, startDate)) {
      status = 'scheduled';
      label = 'Запланировано';
      color = 'info';
    } else if (endDate && isAfter(now, endDate)) {
      status = 'completed';
      label = 'Завершено';
      color = 'success';
    } else {
      status = 'active';
      label = 'Активно';
      color = 'primary';
    }
    
    return <Chip label={label} color={color} size="small" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return theme.palette.error.main;
      case 'high':
        return theme.palette.warning.main;
      case 'medium':
        return theme.palette.info.main;
      default:
        return theme.palette.success.main;
    }
  };
  
  const getTimelinePosition = (date: string) => {
    const eventDate = parseISO(date);
    const daysDiff = differenceInDays(eventDate, today);
    
    // Special styling for today's events
    if (isToday(eventDate)) {
      return {
        dotColor: theme.palette.secondary.main,
        dotSize: 20,
        label: 'Сегодня',
        labelColor: theme.palette.secondary.main,
      };
    }
    
    // Past events (up to 7 days ago)
    if (daysDiff < 0 && daysDiff > -7) {
      return {
        dotColor: theme.palette.grey[500],
        dotSize: 12,
        label: `${Math.abs(daysDiff)} дн. назад`,
        labelColor: theme.palette.text.secondary,
      };
    }
    
    // Past events (more than 7 days ago)
    if (daysDiff <= -7) {
      return {
        dotColor: theme.palette.grey[400],
        dotSize: 10,
        label: format(eventDate, 'd MMM', { locale: ru }),
        labelColor: theme.palette.text.disabled,
      };
    }
    
    // Future events (up to 7 days ahead)
    if (daysDiff > 0 && daysDiff < 7) {
      return {
        dotColor: theme.palette.primary.main,
        dotSize: 16,
        label: `Через ${daysDiff} дн.`,
        labelColor: theme.palette.primary.main,
      };
    }
    
    // Future events (more than 7 days ahead)
    return {
      dotColor: theme.palette.primary.light,
      dotSize: 12,
      label: format(eventDate, 'd MMM', { locale: ru }),
      labelColor: theme.palette.text.secondary,
    };
  };
  
  // Group events by date
  const groupedEvents: Record<string, Event[]> = {};
  events.forEach(event => {
    const dateKey = format(parseISO(event.start_date), 'yyyy-MM-dd');
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => {
    return parseISO(b).getTime() - parseISO(a).getTime();
  });

  if (events.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Нет событий для отображения
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: 'relative', pb: 2 }}>
      <TimelineConnector />
      
      {sortedDates.map(dateKey => {
        const dateEvents = groupedEvents[dateKey];
        const dateObj = parseISO(dateKey);
        const isTodays = isToday(dateObj);
        
        return (
          <Box key={dateKey} sx={{ mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 2,
              backgroundColor: isTodays ? 'rgba(63, 81, 181, 0.08)' : 'transparent',
              borderRadius: 2,
              px: 2,
              py: 1,
            }}>
              <TimelineDot sx={{ 
                backgroundColor: isTodays ? theme.palette.secondary.main : theme.palette.primary.main,
                width: isTodays ? 20 : 16,
                height: isTodays ? 20 : 16,
              }} />
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: isTodays ? 'bold' : 'medium',
                  color: isTodays ? theme.palette.secondary.main : 'inherit'
                }}
              >
                {isTodays ? 'Сегодня' : format(dateObj, 'd MMMM yyyy', { locale: ru })}
              </Typography>
            </Box>
            
            {dateEvents.map(event => {
              const isExpanded = expandedEvents.has(event.id);
              const timelinePos = getTimelinePosition(event.start_date);
              const priorityColor = getPriorityColor(event.priority);
              
              return (
                <Box 
                  key={event.id} 
                  sx={{ 
                    display: 'flex', 
                    mb: 2, 
                    position: 'relative',
                    '&:hover': {
                      '& .timeline-actions': {
                        opacity: 1,
                      },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: 60, position: 'relative', zIndex: 1 }}>
                    <Box sx={{ 
                      width: timelinePos.dotSize, 
                      height: timelinePos.dotSize, 
                      borderRadius: '50%', 
                      backgroundColor: timelinePos.dotColor,
                      boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
                      position: 'relative',
                      top: 4,
                      left: (28 - timelinePos.dotSize/2),
                    }} />
                  </Box>
                  
                  <Paper 
                    sx={{ 
                      p: 2, 
                      flex: 1,
                      borderLeft: `4px solid ${priorityColor}`,
                      '&:hover': {
                        boxShadow: 3,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getEventTypeIcon(event.type)}
                        <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'medium' }}>
                          {event.title}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        opacity: 0.3,
                        transition: 'opacity 0.2s',
                      }} className="timeline-actions">
                        {event.send_notification && !event.notification_sent && (
                          <Tooltip title="Отправить уведомление">
                            <IconButton 
                              size="small" 
                              onClick={() => onSendNotification(event)}
                              color="primary"
                            >
                              <NotificationsActiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Tooltip title={event.is_active ? "Деактивировать" : "Активировать"}>
                          <IconButton 
                            size="small" 
                            onClick={() => onToggleActive(event)}
                            color={event.is_active ? "default" : "success"}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Редактировать">
                          <IconButton 
                            size="small" 
                            onClick={() => onEditEvent(event)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Удалить">
                          <IconButton 
                            size="small" 
                            onClick={() => onDeleteEvent(event.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TimeIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        {format(parseISO(event.start_date), 'HH:mm', { locale: ru })}
                        {event.end_date && ` - ${format(parseISO(event.end_date), 'HH:mm', { locale: ru })}`}
                      </Typography>
                      <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                        {getStatusChip(event)}
                        <Chip 
                          label={
                            event.priority === 'critical' ? 'Критический' :
                            event.priority === 'high' ? 'Высокий' :
                            event.priority === 'medium' ? 'Средний' : 'Низкий'
                          } 
                          size="small"
                          sx={{ 
                            borderColor: priorityColor,
                            color: priorityColor,
                          }}
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: isExpanded ? 'unset' : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: isExpanded ? 2 : 0,
                      }}>
                        {event.description}
                      </Typography>
                      
                      {event.description.length > 100 && (
                        <Button
                          size="small"
                          onClick={() => toggleExpanded(event.id)}
                          endIcon={isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                          sx={{ ml: 2, minWidth: 'auto' }}
                        >
                          {isExpanded ? 'Свернуть' : 'Подробнее'}
                        </Button>
                      )}
                    </Box>
                    
                    <Collapse in={isExpanded}>
                      <Card variant="outlined" sx={{ mt: 2, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                        <CardContent>
                          <Typography variant="caption" display="block" gutterBottom>
                            <strong>Тип события:</strong> {
                              event.type === 'notification' ? 'Уведомление' :
                              event.type === 'maintenance' ? 'Обслуживание' :
                              event.type === 'promotion' ? 'Акция' :
                              event.type === 'system' ? 'Системное' : 'Другое'
                            }
                          </Typography>
                          
                          {event.is_recurring && (
                            <Typography variant="caption" display="block" gutterBottom>
                              <strong>Повторение:</strong> {event.recurrence_pattern || 'Настроено'}
                            </Typography>
                          )}
                          
                          <Typography variant="caption" display="block">
                            <strong>Создано:</strong> {format(parseISO(event.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                          </Typography>
                          
                          {event.notification_sent && (
                            <Typography variant="caption" display="block" sx={{ color: 'success.main' }}>
                              <strong>Уведомление отправлено</strong>
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Collapse>
                  </Paper>
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
};