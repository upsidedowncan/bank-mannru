import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  colors,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { CircularProgress } from '@mui/material';
import { HtmlEditor } from '../Common/HtmlEditor';

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
  created_at: string;
  updated_at: string;
  buttons?: {
    text: string;
    url: string;
    color: string;
  }[];
}

interface CreateBannerForm {
  title: string;
  content: string;
  content_type: 'text' | 'html' | 'button';
  background_color: string;
  text_color: string;
  start_date: string;
  end_date: string;
  buttons?: {
    text: string;
    url: string;
    color: string;
  }[];
}

export const BannerManagement: React.FC = () => {
  const { user } = useAuthContext();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState<CreateBannerForm>({
    title: '',
    content: '',
    content_type: 'text',
    background_color: '#ffffff',
    text_color: '#000000',
    start_date: '',
    end_date: '',
    buttons: [],
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
      showSnackbar('Error loading banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      const bannerData = {
        ...formData,
        user_id: user.id,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', editingBanner.id);
        
        if (error) throw error;
        showSnackbar('Banner updated successfully!', 'success');
      } else {
        const { error } = await supabase
          .from('banners')
          .insert(bannerData);
        
        if (error) throw error;
        showSnackbar('Banner created successfully!', 'success');
      }

      handleClose();
      fetchBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      showSnackbar('Error saving banner', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSnackbar('Banner deleted!', 'success');
      fetchBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      showSnackbar('Error deleting banner', 'error');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      showSnackbar(`Banner ${!banner.is_active ? 'activated' : 'deactivated'}!`, 'success');
      fetchBanners();
    } catch (error) {
      console.error('Error toggling banner status:', error);
      showSnackbar('Error updating banner status', 'error');
    }
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      content: banner.content,
      content_type: banner.content_type,
      background_color: banner.background_color,
      text_color: banner.text_color,
      start_date: banner.start_date,
      end_date: banner.end_date,
      buttons: banner.buttons || [],
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingBanner(null);
    setFormData({
      title: '',
      content: '',
      content_type: 'text',
      background_color: '#ffffff',
      text_color: '#000000',
      start_date: '',
      end_date: '',
      buttons: [],
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddButton = () => {
    setFormData({
      ...formData,
      buttons: [...(formData.buttons || []), { text: '', url: '', color: '#1976d2' }],
    });
  };

  const handleRemoveButton = (index: number) => {
    const newButtons = [...(formData.buttons || [])];
    newButtons.splice(index, 1);
    setFormData({ ...formData, buttons: newButtons });
  };

  const handleButtonChange = (index: number, field: 'text' | 'url' | 'color', value: string) => {
    const newButtons = [...(formData.buttons || [])];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setFormData({ ...formData, buttons: newButtons });
  };

  const getStatusChip = (banner: Banner) => {
    const now = new Date();
    const startDate = new Date(banner.start_date);
    const endDate = new Date(banner.end_date);

    if (!banner.is_active) {
      return <Chip label="Inactive" color="default" size="small" />;
    } else if (now < startDate) {
      return <Chip label="Scheduled" color="warning" size="small" />;
    } else if (now >= startDate && now <= endDate) {
      return <Chip label="Active" color="success" size="small" />;
    } else {
      return <Chip label="Expired" color="error" size="small" />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Banner Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Banner
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : banners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No banners found
                </TableCell>
              </TableRow>
            ) : (
              banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>{banner.title}</TableCell>
                  <TableCell>
                    <Chip label={banner.content_type} size="small" />
                  </TableCell>
                  <TableCell>
                    {getStatusChip(banner)}
                  </TableCell>
                  <TableCell>
                    {new Date(banner.start_date).toLocaleDateString()} - {new Date(banner.end_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(banner)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleToggleActive(banner)}>
                      {banner.is_active ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    </IconButton>
                    <IconButton onClick={() => handleDelete(banner.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle>{editingBanner ? 'Edit Banner' : 'Create New Banner'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Content Type</InputLabel>
              <Select
                value={formData.content_type}
                label="Content Type"
                onChange={(e) => setFormData({ 
                  ...formData, 
                  content_type: e.target.value as 'text' | 'html' | 'button' 
                })}
              >
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="html">HTML</MenuItem>
                <MenuItem value="button">Button</MenuItem>
              </Select>
            </FormControl>

            {formData.content_type === 'html' ? (
              <HtmlEditor
                value={formData.content}
                onChange={(content: string) => setFormData({ ...formData, content })}
              />
            ) : (
              <TextField
                label="Content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                multiline
                rows={4}
                fullWidth
              />
            )}

            <Box display="flex" gap={2}>
              <TextField
                label="Start Date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            <Box display="flex" gap={2}>
              <TextField
                label="Background Color"
                type="color"
                value={formData.background_color}
                onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Text Color"
                type="color"
                value={formData.text_color}
                onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            {formData.content_type === 'button' && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Buttons
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={handleAddButton}
                  startIcon={<AddIcon />}
                >
                  Add Button
                </Button>

                {formData.buttons?.map((button, index) => (
                  <Box key={index} mt={2} p={2} border={1} borderRadius={1} borderColor="divider">
                    <Box display="flex" gap={2} alignItems="center">
                      <TextField
                        label="Button Text"
                        value={button.text}
                        onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="URL"
                        value={button.url}
                        onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Color"
                        type="color"
                        value={button.color}
                        onChange={(e) => handleButtonChange(index, 'color', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <IconButton onClick={() => handleRemoveButton(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingBanner ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
