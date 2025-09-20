import React from 'react'
import { Box, Card, CardContent, Typography, List, ListItem, ListItemText, Skeleton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { supabase } from '../../config/supabase'

interface Row {
  user_id: string
  total_xp: number
  display_name: string | null
  email: string | null
}

interface LeaderboardProps {
  limit?: number
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ limit = 10 }) => {
  const theme = useTheme()
  const [rows, setRows] = React.useState<Row[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('user_progression_leaderboard')
          .select('user_id,total_xp,display_name,email')
          .order('total_xp', { ascending: false })
          .limit(limit)
        if (error) throw error
        if (active) setRows(data as Row[])
      } catch (e: any) {
        if (active) setError(e.message || 'Failed to load leaderboard')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [limit])

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Таблица лидеров (XP)
        </Typography>
        {loading && (
          <>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </>
        )}
        {error && (
          <Typography color="error">{error}</Typography>
        )}
        {rows && (
          <List>
            {rows.map((r, idx) => (
              <ListItem key={r.user_id} divider sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ width: 20 }}>{idx + 1}</Typography>
                        <Typography variant="body1">{r.display_name || r.email || r.user_id.slice(0, 8)}</Typography>
                      </Box>
                      <Typography variant="body1" color={theme.palette.primary.main}>
                        {r.total_xp} XP
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}

export default Leaderboard


