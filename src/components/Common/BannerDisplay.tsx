import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, IconButton } from '@mui/material';
import { supabase } from '../../config/supabase';
import CloseIcon from '@mui/icons-material/Close';

interface Banner {
  id: string;
  title: string;
  content: string;
  content_type: 'text' | 'html' | 'button';
  background_color: string;
  text_color: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

export const BannerDisplay: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);

  useEffect(() => {
    const fetchActiveBanners = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);

      if (!error && data) {
        setBanners(data);
      }
    };

    fetchActiveBanners();
  }, []);

  const handleDismiss = (id: string) => {
    setDismissedBanners([...dismissedBanners, id]);
  };

  if (banners.length === 0 || banners.every(b => dismissedBanners.includes(b.id))) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }}>
      {banners
        .filter(banner => !dismissedBanners.includes(banner.id))
        .map((banner) => (
            <Paper
            key={banner.id}
            elevation={0}
            square
            sx={{
              backgroundColor: banner.background_color,
              color: banner.text_color,
              padding: 2,
              width: '100%',
              borderRadius: 0,
              '& *': {
                color: `${banner.text_color} !important`
              }
            }}
          >
            <IconButton
              size="small"
              sx={{ position: 'absolute', right: 8, top: 8, color: banner.text_color }}
              onClick={() => handleDismiss(banner.id)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            {banner.content_type === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: banner.content }} />
            ) : (
              <Typography variant="body1">{banner.content}</Typography>
            )}
          </Paper>
        ))}
    </Box>
  );
};
