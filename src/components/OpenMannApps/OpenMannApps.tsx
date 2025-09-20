import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, Switch, TextField, Typography, Paper, IconButton, Tooltip, Tabs, Tab, Slider } from '@mui/material';
import { Add, TextFields, Image, SmartButton, Delete, Edit, Save, PlayArrow } from '@mui/icons-material';
import { AppLayout } from '../Layout/AppLayout';
import PageHeader from '../Layout/PageHeader';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

type OpenMannApp = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  slug: string;
  icon_url?: string | null;
  is_published: boolean;
  created_at: string;
  layout?: string; // JSON string of the app layout
};

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

type ComponentPaletteItem = {
  type: 'button' | 'text' | 'image';
  label: string;
  icon: React.ReactNode;
};

export const OpenMannApps: React.FC = () => {
  const { user } = useAuthContext();

  const [apps, setApps] = useState<OpenMannApp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [builderOpen, setBuilderOpen] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<OpenMannApp | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Canvas state
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<CanvasComponent | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const isFormValid = useMemo(() => name.trim().length > 2 && slug.trim().length > 2, [name, slug]);

  const componentPalette: ComponentPaletteItem[] = [
    { type: 'button', label: 'Кнопка', icon: <SmartButton /> },
    { type: 'text', label: 'Текст', icon: <TextFields /> },
    { type: 'image', label: 'Изображение', icon: <Image /> },
  ];

  const fetchApps = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('open_mann_apps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setApps(data as unknown as OpenMannApp[]);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, [user]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSlug('');
    setIconUrl('');
    setIsPublished(false);
  };

  const handleCreate = async () => {
    if (!user || !isFormValid) return;
    setCreating(true);
    const payload = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim(),
      slug: slug.trim().toLowerCase(),
      icon_url: iconUrl.trim() || null,
      is_published: isPublished,
      layout: canvasComponents,
    };
    const { error } = await supabase.from('open_mann_apps').insert(payload);
    setCreating(false);
    if (!error) {
      setFormOpen(false);
      resetForm();
      fetchApps();
    }
  };

  const safeParseLayout = (raw: any): CanvasComponent[] => {
    try {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw as CanvasComponent[];
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed === '') return [];
        return JSON.parse(trimmed) as CanvasComponent[];
      }
      // if it's already an object (jsonb), trust it
      return raw as CanvasComponent[];
    } catch {
      return [];
    }
  };

  const handleOpenBuilder = (app?: OpenMannApp) => {
    if (app) {
      setEditingApp(app);
      setCanvasComponents(safeParseLayout((app as any).layout));
    } else {
      setEditingApp(null);
      setCanvasComponents([]);
    }
    setBuilderOpen(true);
  };

  const handleSaveLayout = async () => {
    if (!editingApp) return;
    const { error } = await supabase
      .from('open_mann_apps')
      .update({ layout: canvasComponents })
      .eq('id', editingApp.id);
    if (!error) {
      setBuilderOpen(false);
      fetchApps();
    } else {
      console.error('Save layout error:', error);
    }
  };

  const addComponent = (type: 'button' | 'text' | 'image') => {
    const newComponent: CanvasComponent = {
      id: `comp_${Date.now()}`,
      type,
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : 120,
      height: type === 'text' ? 40 : 40,
      props: {
        text: type === 'button' ? 'Кнопка' : type === 'text' ? 'Текст' : '',
        color: '#000000',
        backgroundColor: type === 'button' ? '#1976d2' : 'transparent',
        fontSize: 16,
        src: type === 'image' ? 'https://via.placeholder.com/120x40' : undefined,
      },
    };
    setCanvasComponents(prev => [...prev, newComponent]);
  };

  const updateComponent = (id: string, updates: Partial<CanvasComponent>) => {
    setCanvasComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, ...updates } : comp
    ));
  };

  const deleteComponent = (id: string) => {
    setCanvasComponents(prev => prev.filter(comp => comp.id !== id));
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedComponent(null);
    }
  };

  const handleComponentMouseDown = (e: React.MouseEvent, component: CanvasComponent) => {
    e.stopPropagation();
    setSelectedComponent(component);
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - component.x,
        y: e.clientY - rect.top - component.y,
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedComponent || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    updateComponent(selectedComponent.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
  }, [isDragging, selectedComponent, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTogglePublish = async (app: OpenMannApp) => {
    const next = !app.is_published;
    const { error } = await supabase
      .from('open_mann_apps')
      .update({ is_published: next })
      .eq('id', app.id);
    if (!error) {
      // Reflect in features marketplace
      if (next) {
        await supabase
          .from('features_marketplace')
          .upsert({
            title: app.name,
            description: app.description || 'OpenMann App',
            route: `/apps/${app.slug}`,
            icon: 'ExtensionIcon',
            is_active: true,
            seller_id: app.user_id,
          }, { onConflict: 'route' });
      } else {
        // Optionally deactivate listing when unpublished
        await supabase
          .from('features_marketplace')
          .update({ is_active: false })
          .eq('route', `/apps/${app.slug}`);
      }
      fetchApps();
    }
  };

  return (
    <AppLayout>
      <Box sx={{ px: 2, pb: 4 }}>
        <PageHeader title="OpenMann Apps" />

        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Ваши приложения будут видны в Features Marketplace после публикации.
          </Typography>
          <Box display="flex" gap={1}>
            <Button variant="outlined" onClick={() => handleOpenBuilder()}>Открыть конструктор</Button>
            <Button variant="contained" onClick={() => setFormOpen(true)}>Создать приложение</Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
            {apps.map(app => (
              <Card key={app.id} variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ mr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.name}
                    </Typography>
                    <Chip size="small" color={app.is_published ? 'success' : 'default'} label={app.is_published ? 'Опубликовано' : 'Черновик'} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 40 }}>
                    {app.description || 'Без описания'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">/{app.slug}</Typography>
                   <Box display="flex" gap={1} sx={{ mt: 2 }}>
                     <Button size="small" variant="outlined" onClick={() => handleOpenBuilder(app)}>
                       <Edit fontSize="small" sx={{ mr: 0.5 }} />
                       Редактировать
                     </Button>
                     <Button size="small" variant="outlined" onClick={() => handleTogglePublish(app)}>
                       {app.is_published ? 'Снять с публикации' : 'Опубликовать'}
                     </Button>
                   </Box>
                </CardContent>
              </Card>
            ))}
            {apps.length === 0 && (
              <Box sx={{ py: 8, textAlign: 'center', gridColumn: '1 / -1' }}>
                <Typography color="text.secondary">У вас пока нет приложений. Создайте первое!</Typography>
              </Box>
            )}
          </Box>
        )}

        <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Новое приложение</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
              <TextField label="Название" value={name} onChange={e => setName(e.target.value)} fullWidth size="small" />
              <TextField label="Описание" value={description} onChange={e => setDescription(e.target.value)} fullWidth size="small" multiline minRows={3} />
              <TextField label="Slug (URL)" value={slug} onChange={e => setSlug(e.target.value)} fullWidth size="small" helperText="Буквы/цифры/дефисы, например: my-cool-app" />
              <TextField label="Иконка (URL)" value={iconUrl} onChange={e => setIconUrl(e.target.value)} fullWidth size="small" />
              <FormControl>
                <FormControlLabel control={<Switch checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />} label="Сразу опубликовать" />
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFormOpen(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!isFormValid || creating} variant="contained">
              {creating ? 'Создание...' : 'Создать'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Canvas Builder Dialog */}
        <Dialog open={builderOpen} onClose={() => setBuilderOpen(false)} maxWidth="lg" fullWidth fullScreen>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Конструктор приложений</Typography>
              <Box display="flex" gap={1}>
                <Button variant="outlined" onClick={() => setBuilderOpen(false)}>Отмена</Button>
                {editingApp && (
                  <Button variant="contained" onClick={handleSaveLayout}>
                    <Save sx={{ mr: 0.5 }} />
                    Сохранить
                  </Button>
                )}
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Box display="flex" height="calc(100vh - 64px)">
              {/* Component Palette */}
              <Box sx={{ width: { xs: 140, sm: 180, md: 220 }, borderRight: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Компоненты</Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {componentPalette.map(item => (
                    <Button
                      key={item.type}
                      variant="outlined"
                      startIcon={item.icon}
                      onClick={() => addComponent(item.type)}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* Canvas */}
              <Box sx={{ flex: 1, position: 'relative' }}>
                <Box
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  sx={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(45deg, #f5f5f5 25%, transparent 25%), linear-gradient(-45deg, #f5f5f5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f5 75%), linear-gradient(-45deg, transparent 75%, #f5f5f5 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'crosshair',
                  }}
                >
                  {canvasComponents.map(component => (
                    <Box
                      key={component.id}
                      onMouseDown={(e) => handleComponentMouseDown(e, component)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedComponent(component);
                      }}
                      sx={{
                        position: 'absolute',
                        left: component.x,
                        top: component.y,
                        width: component.width,
                        height: component.height,
                        border: selectedComponent?.id === component.id ? '2px solid #1976d2' : '1px solid #ccc',
                        borderRadius: 1,
                        cursor: 'move',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: component.props.backgroundColor || 'transparent',
                        color: component.props.color || '#000',
                        fontSize: component.props.fontSize || 16,
                        '&:hover': {
                          borderColor: '#1976d2',
                        },
                      }}
                    >
                      {component.type === 'button' && (
                        <Button
                          variant="contained"
                          sx={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: component.props.backgroundColor,
                            color: component.props.color,
                            fontSize: component.props.fontSize,
                          }}
                        >
                          {component.props.text}
                        </Button>
                      )}
                      {component.type === 'text' && (
                        <Typography
                          sx={{
                            color: component.props.color,
                            fontSize: component.props.fontSize,
                            textAlign: 'center',
                          }}
                        >
                          {component.props.text}
                        </Typography>
                      )}
                      {component.type === 'image' && (
                        <img
                          src={component.props.src}
                          alt="Component"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Properties Panel */}
              <Box sx={{ width: 300, borderLeft: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  {selectedComponent ? 'Свойства' : 'Выберите компонент'}
                </Typography>
                {selectedComponent && (
                  <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                      label="Текст"
                      value={selectedComponent.props.text || ''}
                      onChange={(e) => updateComponent(selectedComponent.id, {
                        props: { ...selectedComponent.props, text: e.target.value }
                      })}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Цвет"
                      type="color"
                      value={selectedComponent.props.color || '#000000'}
                      onChange={(e) => updateComponent(selectedComponent.id, {
                        props: { ...selectedComponent.props, color: e.target.value }
                      })}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Фон"
                      type="color"
                      value={selectedComponent.props.backgroundColor || '#ffffff'}
                      onChange={(e) => updateComponent(selectedComponent.id, {
                        props: { ...selectedComponent.props, backgroundColor: e.target.value }
                      })}
                      size="small"
                      fullWidth
                    />
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>Размер шрифта</Typography>
                      <Slider
                        value={selectedComponent.props.fontSize || 16}
                        onChange={(_, value) => updateComponent(selectedComponent.id, {
                          props: { ...selectedComponent.props, fontSize: value as number }
                        })}
                        min={8}
                        max={48}
                        step={1}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    {selectedComponent.type === 'image' && (
                      <TextField
                        label="URL изображения"
                        value={selectedComponent.props.src || ''}
                        onChange={(e) => updateComponent(selectedComponent.id, {
                          props: { ...selectedComponent.props, src: e.target.value }
                        })}
                        size="small"
                        fullWidth
                      />
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => deleteComponent(selectedComponent.id)}
                      fullWidth
                    >
                      Удалить
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </AppLayout>
  );
};

export default OpenMannApps;


