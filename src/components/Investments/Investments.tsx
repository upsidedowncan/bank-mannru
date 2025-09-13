import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Card, CardContent, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, InputAdornment, InputLabel, MenuItem, Select, Snackbar, Alert, TextField, Typography } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown } from '@mui/icons-material'
import { supabase } from '../../config/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import PageHeader from '../Layout/PageHeader'

type PricePoint = { price: number; created_at: string }

type InvestmentRow = {
  id: string
  user_id: string
  shares: number
  price: number
  created_at: string
  side: 'buy' | 'sell'
}

// Treasury card id is stored in DB via public.bkmr_settings
let TREASURY_CARD_ID_CACHE: string | null = null

export const Investments: React.FC = () => {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [holdings, setHoldings] = useState<number>(0)
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [change24h, setChange24h] = useState<number>(0)
  const [amount, setAmount] = useState<string>('')
  const [sellShares, setSellShares] = useState<string>('')
  const [cards, setCards] = useState<Array<{ id: string; card_name: string; balance: number; currency: string }>>([])
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [confirmOpen, setConfirmOpen] = useState<'buy' | 'sell' | null>(null)

  const sharesYouGet = useMemo(() => {
    const amt = parseFloat(amount)
    if (!currentPrice || !amt) return 0
    return +(amt / currentPrice).toFixed(6)
  }, [amount, currentPrice])

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load price state and history
        const { data: stateRows } = await supabase.rpc('bkmr_get_state')
        const state = (stateRows as any)?.[0]
        if (state?.price) setCurrentPrice(Number(state.price))
        const { data: hist, error: histErr } = await supabase
          .from('bkmr_price_history')
          .select('price, created_at')
          .order('created_at', { ascending: false })
          .limit(50)
        if (histErr) throw histErr
        const points = (hist || []).reverse()
        setPriceHistory(points as PricePoint[])
        const last = (hist || [])[0]

        // 24h change
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: prev } = await supabase
          .from('bkmr_price_history')
          .select('price')
          .lt('created_at', since)
          .order('created_at', { ascending: false })
          .limit(1)
        if (last && prev && prev.length) {
          setChange24h(((last.price - prev[0].price) / prev[0].price) * 100)
        }

        // Resolve treasury card id from DB (cached per session)
        if (!TREASURY_CARD_ID_CACHE) {
          const { data: settings } = await supabase.rpc('get_bkmr_treasury_card_id')
          TREASURY_CARD_ID_CACHE = (settings as any) || null
        }

        // Load user holdings
        if (user) {
          const { data: rows, error: invErr } = await supabase
            .from('bkmr_investments')
            .select('shares, side')
            .eq('user_id', user.id)
          if (invErr) throw invErr
          const total = (rows || []).reduce((acc, r: any) => acc + (r.side === 'buy' ? r.shares : -r.shares), 0)
          setHoldings(total)

          // Load user's cards for settlement
          const { data: userCards } = await supabase
            .from('bank_cards')
            .select('id, card_name, balance, currency')
            .eq('user_id', user.id)
            .eq('is_active', true)
          setCards(userCards || [])
          if ((userCards || []).length) setSelectedCardId(userCards![0].id)
        }
      } catch (e: any) {
        setError(e.message || 'Ошибка загрузки данных. Возможно, необходимо применить SQL для инвестиций.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user])

  const refresh = async () => {
    // Re-run init subset
    if (!user) return
    const { data: rows } = await supabase
      .from('bkmr_investments')
      .select('shares, side')
      .eq('user_id', user.id)
    const total = (rows || []).reduce((acc, r: any) => acc + (r.side === 'buy' ? r.shares : -r.shares), 0)
    setHoldings(total)
  }

  const handleBuy = async () => {
    if (!user) return
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || !selectedCardId) return
    try {
      setConfirmOpen(null)
      // Simple model: deduct from user card, mint shares at current price
      const { error: buyErr } = await supabase.rpc('bkmr_simple_buy', {
        p_user_id: user.id,
        p_amount: amt,
        p_user_card_id: selectedCardId,
      } as any)
      if (buyErr) throw buyErr
      setAmount('')
      await refresh()
      setSnackbar({ open: true, message: 'Инвестиция выполнена', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Ошибка инвестирования', severity: 'error' })
    }
  }

  const handleSell = async () => {
    if (!user) return
    const qty = parseFloat(sellShares)
    if (!qty || qty <= 0 || qty > holdings || !selectedCardId) return
    try {
      setConfirmOpen(null)
      // Simple model: credit user card with shares * price
      const { error: sellErr } = await supabase.rpc('bkmr_simple_sell', {
        p_user_id: user.id,
        p_shares: qty,
        p_user_card_id: selectedCardId,
      } as any)
      if (sellErr) throw sellErr
      setSellShares('')
      await refresh()
      setSnackbar({ open: true, message: 'Продажа выполнена', severity: 'success' })
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message || 'Ошибка продажи', severity: 'error' })
    }
  }

  const pnl = useMemo(() => {
    // Rough PnL: holdings * (currentPrice - avgBuyPrice)
    // Load buys only from history we fetched? We do another lightweight fetch here
    return null
  }, [holdings, currentPrice])

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><CircularProgress /></Box>
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <PageHeader title="BKMR Инвестиции" />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error} — убедитесь, что выполнен SQL из файла setup-bkmr-investments.sql и задан VITE_BKMR_TREASURY_CARD_ID.
        </Alert>
      )}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h5">Текущая цена: {currentPrice ? currentPrice.toFixed(2) : '—'} MR</Typography>
            <Chip
              color={change24h >= 0 ? 'success' : 'error'}
              icon={change24h >= 0 ? <TrendingUp /> : <TrendingDown />}
              label={`${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% за 24ч`}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">Всего у вас: {holdings.toFixed(6)} BKMR</Typography>
          <Box sx={{ height: 220, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceHistory.map(p => ({
                time: new Date(p.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                price: Number(p.price),
              }))} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)} MR`, 'Цена']} labelFormatter={(l: any) => `Время: ${l}`} />
                <ReferenceLine y={currentPrice} stroke="#888" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="price" stroke="#1976d2" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Купить BKMR</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              label="Сумма (MR)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">MR</InputAdornment> }}
            />
            <TextField
              label="Вы получите (BKMR)"
              value={sharesYouGet}
              size="small"
              InputProps={{ readOnly: true }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Карта</InputLabel>
              <Select value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value as string)} label="Карта">
                {cards.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.card_name} • Баланс: {c.balance} {c.currency}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Button variant="contained" onClick={() => setConfirmOpen('buy')} disabled={!amount || !selectedCardId || !currentPrice}>Инвестировать</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Продать BKMR</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              label="Количество (BKMR)"
              value={sellShares}
              onChange={(e) => setSellShares(e.target.value)}
              type="number"
              size="small"
              inputProps={{ max: holdings, min: 0 }}
            />
            <TextField
              label="Вы получите (MR)"
              value={sellShares ? (parseFloat(sellShares || '0') * currentPrice).toFixed(2) : ''}
              size="small"
              InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start">MR</InputAdornment> }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Карта</InputLabel>
              <Select value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value as string)} label="Карта">
                {cards.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.card_name} • Баланс: {c.balance} {c.currency}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Button variant="outlined" onClick={() => setConfirmOpen('sell')} disabled={!sellShares || parseFloat(sellShares) <= 0 || parseFloat(sellShares) > holdings}>Продать</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={!!confirmOpen} onClose={() => setConfirmOpen(null)}>
        <DialogTitle>{confirmOpen === 'buy' ? 'Подтвердить инвестицию' : 'Подтвердить продажу'}</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmOpen === 'buy' ? `Инвестировать ${amount} MR по цене ${currentPrice.toFixed(2)} MR/BKMR?` : `Продать ${sellShares} BKMR по цене ${currentPrice.toFixed(2)} MR/BKMR?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(null)}>Отмена</Button>
          {confirmOpen === 'buy' ? (
            <Button variant="contained" onClick={handleBuy}>Инвестировать</Button>
          ) : (
            <Button variant="contained" onClick={handleSell}>Продать</Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default Investments


