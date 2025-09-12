import React, { useEffect, useState, useMemo } from 'react'
import { Box, Button, Card, CardContent, Container, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, List, ListItem, ListItemText, Snackbar, Alert, TextField, Typography, Tooltip, Modal, Fade, Backdrop } from '@mui/material'
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import { supabase } from '../../config/supabase'
import PageHeader from '../Layout/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

// Add type declaration for Safari's legacy AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

type PricePoint = { price: number; created_at: string }

export const AdminInvestments: React.FC = () => {
  const [price, setPrice] = useState<number>(0)
  const [history, setHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newPrice, setNewPrice] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const { data: state } = await supabase.rpc('bkmr_get_state')
      const current = (state as any)?.[0]
      if (current?.price) setPrice(Number(current.price))
      const { data: hist } = await supabase
        .from('bkmr_price_history')
        .select('price, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      setHistory((hist as any) || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const [showWarning, setShowWarning] = useState(false)
  const [showJumpscare, setShowJumpscare] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const jumpscareSound = useMemo(() => {
    const audio = new Audio()
    audio.volume = 1.0 // Standard maximum volume
    
    audio.src = process.env.REACT_APP_JUMPSCARE_SOUND || 'https://www.myinstants.com/media/sounds/wega-jumpscare.mp3'
    audio.onerror = () => {
      console.error('Failed to load jumpscare sound')
      setAudioError(true)
    }
    return audio
  }, [])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (showWarning) {
      const timer = setTimeout(() => {
        try {
          jumpscareSound.play().catch((e: Error) => {
            console.error('Failed to play sound:', e)
            setAudioError(true)
          })
        } catch (e) {
          console.error('Sound play error:', e)
          setAudioError(true)
        }
        setShowJumpscare(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showWarning])

  useEffect(() => {
    if (showJumpscare) {
      const timer = setTimeout(() => {
        navigate('/')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [showJumpscare, navigate])

  const handleConfirm = async () => {
    if (!user?.user_metadata?.isAdmin) {
      setShowWarning(true)
      return
    }
    
    const p = parseFloat(newPrice)
    if (!p || p <= 0) {
      setSnackbar({ open: true, message: 'Введите корректную цену (> 0)', severity: 'error' })
      return
    }
    try {
      const { error } = await supabase.rpc('bkmr_set_price', { p_price: p } as any)
      if (error) throw error
      setDialogOpen(false)
      setNewPrice('')
      await load()
      setSnackbar({ open: true, message: 'Цена обновлена', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Ошибка обновления цены', severity: 'error' })
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <PageHeader title="BKMR — Админ: Цена и История" actions={
        <Box>
          <Tooltip title="Обновить">
            <IconButton onClick={load} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Изменить цену</Button>
        </Box>
      } />
      <Card>
        {loading && <LinearProgress />}
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Текущая цена: {price ? price.toFixed(2) : '—'} MR</Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>История (последние 100):</Typography>
          <List dense>
            {history.map((h, idx) => (
              <ListItem key={idx} divider>
                <ListItemText primary={`${Number(h.price).toFixed(2)} MR`} secondary={new Date(h.created_at).toLocaleString('ru-RU')} />
              </ListItem>
            ))}
            {history.length === 0 && (<Typography variant="body2" color="text.secondary">Нет записей</Typography>)}
          </List>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Новая цена BKMR</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="number"
            label="Цена MR"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleConfirm}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {showWarning && (
        <>
          <Backdrop open={true} style={{ backgroundColor: 'black', zIndex: 1300 }} />
          <Modal
            open={showWarning}
            closeAfterTransition
            BackdropComponent={Backdrop}
          >
            <Fade in={showWarning} timeout={2000}>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <Typography variant="h3" sx={{ 
                  opacity: showJumpscare ? 0 : 1,
                  fontSize: showJumpscare ? '10rem' : '2rem',
                  transform: showJumpscare ? 'scale(5)' : 'scale(1)',
                  transition: 'all 0.5s'
                }}>
                  {showJumpscare ? '😱' : 'что ты делаешь?'}
                </Typography>
              </Box>
            </Fade>
          </Modal>
        </>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default AdminInvestments


