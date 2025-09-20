import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Button, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useParams } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { AppLayout } from '../Layout/AppLayout';

type CanvasComponent = {
  id: string;
  type: 'button' | 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  props: {
    text?: string;
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    src?: string;
    onClick?: string;
  };
};

export const RunOpenMannApp: React.FC = () => {
  const { slug } = useParams();
  const [layout, setLayout] = useState<CanvasComponent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [scale, setScale] = useState<number>(1);

  const getContrastText = (bg: string | undefined): string => {
    if (!bg) return theme.palette.text.primary;
    // Accept hex like #rrggbb or #rgb
    const hex = bg.startsWith('#') ? bg.substring(1) : bg;
    const to255 = (h: string) => parseInt(h.length === 1 ? h + h : h, 16);
    if (!(hex.length === 3 || hex.length === 6)) return theme.palette.text.primary;
    const r = to255(hex.substring(0, hex.length === 3 ? 1 : 2));
    const g = to255(hex.substring(hex.length === 3 ? 1 : 2, hex.length === 3 ? 2 : 4));
    const b = to255(hex.substring(hex.length === 3 ? 2 : 4));
    // Relative luminance
    const srgb = [r, g, b].map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    // Return white for dark backgrounds, black for light
    return L < 0.5 ? '#ffffff' : '#000000';
  };

  useEffect(() => {
    const fetchLayout = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('open_mann_apps')
        .select('layout, is_published')
        .eq('slug', slug)
        .single();
      if (error || !data) {
        setError('Приложение не найдено');
      } else if (!data.is_published) {
        setError('Приложение не опубликовано');
      } else {
        try {
          const raw = (data as any).layout;
          let parsed: CanvasComponent[] = [];
          if (!raw) {
            parsed = [];
          } else if (Array.isArray(raw)) {
            parsed = raw as CanvasComponent[];
          } else if (typeof raw === 'string') {
            const trimmed = raw.trim();
            parsed = trimmed ? JSON.parse(trimmed) as CanvasComponent[] : [];
          } else {
            parsed = raw as CanvasComponent[];
          }
          setLayout(parsed);
        } catch (e) {
          console.error('Parse layout error:', e);
          setLayout([]);
        }
      }
      setLoading(false);
    };
    fetchLayout();
  }, [slug]);

  // Compute responsive scale for mobile so app fits the viewport
  useEffect(() => {
    if (!layout || layout.length === 0) {
      setScale(1);
      return;
    }
    const contentWidth = Math.max(...layout.map(c => c.x + c.width), 320);
    const contentHeight = Math.max(...layout.map(c => c.y + c.height), 480);
    const maxW = Math.max(320, window.innerWidth - 24);
    const maxH = Math.max(320, window.innerHeight - 24);
    const s = Math.min(1, maxW / contentWidth, maxH / contentHeight);
    setScale(isMobile ? s : 1);
  }, [layout, isMobile]);

  if (loading) {
    return (
      <AppLayout>
        <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Box display="flex" alignItems="center" justifyContent="center" height="100vh">
          <Typography color="error">{error}</Typography>
        </Box>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ width: '100%', height: '100%', minHeight: '100vh', position: 'relative', overflow: 'auto', backgroundColor: theme.palette.background.default }}>
        <Box
          sx={{
            position: 'relative',
            width: layout && layout.length ? Math.max(...layout.map(c => c.x + c.width)) : '100%',
            height: layout && layout.length ? Math.max(...layout.map(c => c.y + c.height)) : '100%',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            mx: 'auto',
          }}
        >
          {(layout || []).map(component => (
            <Box
              key={component.id}
              sx={{
                position: 'absolute',
                left: component.x,
                top: component.y,
                width: component.width,
                height: component.height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {component.type === 'button' && (
                (() => {
                  const bg = component.props.backgroundColor;
                  const textColor = component.props.color || (bg ? getContrastText(bg) : theme.palette.primary.contrastText);
                  const useThemeColors = !bg;
                  return (
                    <Button
                      variant="contained"
                      color={useThemeColors ? 'primary' : undefined}
                      sx={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: useThemeColors ? undefined : bg,
                        color: textColor,
                        fontSize: component.props.fontSize || (isMobile ? 14 : 16),
                      }}
                      onClick={() => {
                        // Action system placeholder
                        alert(component.props.onClick || 'Кнопка нажата');
                      }}
                    >
                      {component.props.text}
                    </Button>
                  );
                })()
              )}
              {component.type === 'text' && (
                <Typography sx={{ color: component.props.color || theme.palette.text.primary, fontSize: component.props.fontSize || (isMobile ? 14 : 16), textAlign: 'center' }}>
                  {component.props.text}
                </Typography>
              )}
              {component.type === 'image' && (
                <img src={component.props.src} alt="Component" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </AppLayout>
  );
};

export default RunOpenMannApp;


