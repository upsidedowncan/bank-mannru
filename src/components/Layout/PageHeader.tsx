import React from 'react'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

interface PageHeaderProps {
  title: string
  actions?: React.ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => {
  const theme = useTheme()
  const bg = theme.palette.mode === 'light'
    ? `linear-gradient(180deg, ${theme.palette.primary.main}1A 0%, transparent 100%)`
    : `linear-gradient(180deg, ${theme.palette.primary.main}33 0%, transparent 100%)`

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      mb: 2,
      background: bg,
      borderRadius: 1.5,
      px: 2,
      py: 1.5,
    }}>
      <Typography variant="h4" sx={{ m: 0 }}>{title}</Typography>
      {actions}
    </Box>
  )
}

export default PageHeader


