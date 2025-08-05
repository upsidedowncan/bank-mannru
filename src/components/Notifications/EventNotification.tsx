import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Slide,
  Grow,
  Backdrop,
  Fade,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  NotificationsActive as NotificationsActiveIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Event as EventIcon,
  Celebration as CelebrationIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { styled, keyframes } from '@mui/system';
import { supabase } from '../../config/supabase';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuthContext } from '../../contexts/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'notification' | 'maintenance' | 'promotion' | 'system' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date: string;
  end_date: string | null;
}

// Define keyframes for animations
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 82, 82, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 82, 82, 0);
  }
`;

const float = keyframes`
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
  100% {
    transform: translateY(0px);
  }
`;

const IconContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: 60,
  height: 60,
  borderRadius: '50%',
  marginRight: theme.spacing(2),
}));

const PulsingIconContainer = styled(IconContainer)({
  animation: `${pulse} 2s infinite`,
});

const FloatingIconContainer = styled(IconContainer)({
  animation: `${float} 3s ease-in-out infinite`,
});

const CountdownDisplay = styled(Typography)(({ theme }) => ({
  fontFamily: 'monospace',
  fontWeight: 'bold',
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[100],
  display: 'inline-block',
}));

export const EventNotification: React.FC = () => {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchActiveEvents = async () => {
      const { data, error } = await supabase
        .from('admin_events')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });
      
      if (error) {
        console.error('Error fetching events:', error);
        return;
      }
      
      // Filter out already dismissed events
      const filteredEvents = (data || []).filter(
        (event) => !dismissedEvents.has(event.id)
      );
      
      setEvents(filteredEvents);
      
      // Show the highest priority event if we have any
      if (filteredEvents.length > 0 && !currentEvent) {
        setCurrentEvent(filteredEvents[0]);
        setShowNotification(true);
        
        // Set countdown for events with end_date
        if (filteredEvents[0].end_date) {
          const endTime = parseISO(filteredEvents[0].end_date);
          const now = new Date();
          const seconds = differenceInSeconds(endTime, now);
          if (seconds > 0) {
            setCountdown(seconds);
          }
        }
      }
    };
    
    // Listen for manual event preview requests
    const handleEventPreview = (e: any) => {
      if (e.detail && e.detail.event) {
        setCurrentEvent(e.detail.event);
        setShowNotification(true);
        
        if (e.detail.event.end_date) {
          const endTime = parseISO(e.detail.event.end_date);
          const now = new Date();
          const seconds = differenceInSeconds(endTime, now);
          if (seconds > 0) {
            setCountdown(seconds);
          }
        }
      }
    };
    
    window.addEventListener('show-event-preview', handleEventPreview);
    
    // Only fetch real events on pages other than admin
    if (!window.location.pathname.includes('/admin')) {
      fetchActiveEvents();
      
      // Set up real-time subscription for new events
      const eventsSubscription = supabase
        .channel('admin-events-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'admin_events',
          filter: 'is_active=eq.true',
        }, (payload) => {
          fetchActiveEvents();
        })
        .subscribe();
        
      return () => {
        window.removeEventListener('show-event-preview', handleEventPreview);
        eventsSubscription.unsubscribe();
      };
    }
    
    return () => {
      window.removeEventListener('show-event-preview', handleEventPreview);
    };
  }, [user, dismissedEvents, currentEvent]);

  // Handle countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown === null || prevCountdown <= 1) {
            clearInterval(timer);
            return null;
          }
          return prevCountdown - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown]);

  const handleDismiss = () => {
    if (currentEvent) {
      const updatedDismissed = new Set(dismissedEvents);
      updatedDismissed.add(currentEvent.id);
      setDismissedEvents(updatedDismissed);
      
      setShowNotification(false);
      
      // After animation completes, show next event if available
      setTimeout(() => {
        const nextEvent = events.find((e) => !updatedDismissed.has(e.id));
        if (nextEvent) {
          setCurrentEvent(nextEvent);
          setShowNotification(true);
          
          if (nextEvent.end_date) {
            const endTime = parseISO(nextEvent.end_date);
            const now = new Date();
            const seconds = differenceInSeconds(endTime, now);
            if (seconds > 0) {
              setCountdown(seconds);
            } else {
              setCountdown(null);
            }
          } else {
            setCountdown(null);
          }
        } else {
          setCurrentEvent(null);
        }
      }, 300);
    }
  };

  const formatCountdown = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (days > 0) {
      return `${days}д ${hours}ч ${minutes}м`;
    } else if (hours > 0) {
      return `${hours}ч ${minutes}м ${remainingSeconds}с`;
    } else {
      return `${minutes}м ${remainingSeconds}с`;
    }
  };

  const getEventIcon = (event: Event) => {
    const iconSize = { fontSize: 40 };
    
    if (event.priority === 'critical') {
      return (
        <PulsingIconContainer sx={{ bgcolor: 'error.light' }}>
          <WarningIcon sx={{ color: 'error.contrastText', ...iconSize }} />
        </PulsingIconContainer>
      );
    }
    
    switch (event.type) {
      case 'notification':
        return (
          <IconContainer sx={{ bgcolor: 'info.light' }}>
            <NotificationsActiveIcon sx={{ color: 'info.contrastText', ...iconSize }} />
          </IconContainer>
        );
      case 'maintenance':
        return (
          <IconContainer sx={{ bgcolor: 'warning.light' }}>
            <WarningIcon sx={{ color: 'warning.contrastText', ...iconSize }} />
          </IconContainer>
        );
      case 'promotion':
        return (
          <FloatingIconContainer sx={{ bgcolor: 'success.light' }}>
            <CelebrationIcon sx={{ color: 'success.contrastText', ...iconSize }} />
          </FloatingIconContainer>
        );
      case 'system':
        return (
          <IconContainer sx={{ bgcolor: 'primary.light' }}>
            <InfoIcon sx={{ color: 'primary.contrastText', ...iconSize }} />
          </IconContainer>
        );
      default:
        return (
          <IconContainer sx={{ bgcolor: 'grey.300' }}>
            <EventIcon sx={{ color: 'text.primary', ...iconSize }} />
          </IconContainer>
        );
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          borderLeft: '6px solid #f44336',
          boxShadow: '0 4px 20px rgba(244, 67, 54, 0.25)',
        };
      case 'high':
        return {
          borderLeft: '6px solid #ff9800',
          boxShadow: '0 4px 15px rgba(255, 152, 0, 0.2)',
        };
      case 'medium':
        return {
          borderLeft: '6px solid #2196f3',
          boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)',
        };
      default:
        return {
          borderLeft: '6px solid #4caf50',
          boxShadow: '0 4px 10px rgba(76, 175, 80, 0.1)',
        };
    }
  };

  if (!currentEvent || !showNotification) {
    return null;
  }

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        pointerEvents: showNotification ? 'auto' : 'none',
      }}
      open={showNotification}
      onClick={handleDismiss}
    >
      <Fade in={showNotification} timeout={500}>
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: 500,
            width: '100%',
            m: 2,
          }}
        >
          <Slide direction="up" in={showNotification} mountOnEnter unmountOnExit>
            <Paper
              elevation={6}
              sx={{
                p: 3,
                position: 'relative',
                ...getPriorityStyles(currentEvent.priority),
              }}
            >
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                }}
              >
                <CloseIcon />
              </IconButton>
              
              <Box display="flex" mb={2}>
                {getEventIcon(currentEvent)}
                
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {currentEvent.title}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary">
                    {format(parseISO(currentEvent.start_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                    {currentEvent.end_date && ` - ${format(parseISO(currentEvent.end_date), 'dd MMMM, HH:mm', { locale: ru })}`}
                  </Typography>
                  
                  {countdown !== null && (
                    <Box mt={1}>
                      <Typography variant="caption" color="text.secondary">
                        Осталось:
                      </Typography>
                      <CountdownDisplay variant="body2" color="primary">
                        {formatCountdown(countdown)}
                      </CountdownDisplay>
                    </Box>
                  )}
                </Box>
              </Box>
              
              <Typography variant="body1" paragraph>
                {currentEvent.description}
              </Typography>
              
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDismiss}
                >
                  Закрыть
                </Button>
                
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => {
                    // Mark as read in user preferences (could save to DB)
                    handleDismiss();
                  }}
                >
                  Понятно
                </Button>
              </Stack>
            </Paper>
          </Slide>
        </Box>
      </Fade>
    </Backdrop>
  );
};