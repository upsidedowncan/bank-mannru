import React from 'react'
import { createPortal } from 'react-dom'
import { Box, Typography, useTheme } from '@mui/material'
import { motion, AnimatePresence, useMotionValue, useTransform, animate as fmAnimate } from 'framer-motion'
import { supabase } from '../../config/supabase'
import { getProgression } from '../../services/progressionService'

interface XPBarProps {
  userId: string
}

interface ProgressSnapshot {
  level: number
  currentLevelXp: number
  nextLevelXp: number
}

export const XPBar: React.FC<XPBarProps> = ({ userId }) => {
  const theme = useTheme()
  const LEVEL_UP_GIF_URL = 'https://i.pinimg.com/originals/43/7e/60/437e60c3fe83d636e7f514fac5a6e39e.gif'
  const [progress, setProgress] = React.useState<ProgressSnapshot | null>(null)
  const [prevLevel, setPrevLevel] = React.useState<number | null>(null)
  const [leveledUp, setLeveledUp] = React.useState(false)
  const [justLeveledTo, setJustLeveledTo] = React.useState<number | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const fullCanvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const shockCanvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const fullRafRef = React.useRef<number | null>(null)
  const shockRafRef = React.useRef<number | null>(null)
  const barCanvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const barRafRef = React.useRef<number | null>(null)
  const barBoxRef = React.useRef<HTMLDivElement | null>(null)
  const prevPctRef = React.useRef<number>(0)

  const value = useMotionValue(0)
  const percent = useTransform(value, (v: number) => Math.max(0, Math.min(100, v)))
  const widthString = useTransform(percent, (v: number) => `${v}%`)

  const animateParticles = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const particles: Array<{ x:number;y:number;vx:number;vy:number;life:number;color:string;size:number }>=[]
    const W = canvas.width = canvas.clientWidth
    const H = canvas.height = 64
    const colors = [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main]
    for (let i=0;i<60;i++) {
      particles.push({
        x: W * 0.5,
        y: 32,
        vx: (Math.random()-0.5) * 4,
        vy: - (Math.random()*3 + 2),
        life: 60 + Math.random()*40,
        color: colors[Math.floor(Math.random()*colors.length)],
        size: 2 + Math.random()*3,
      })
    }
    const loop = () => {
      ctx.clearRect(0,0,W,H)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.life -= 1
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, p.life/100)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0 || particles[i].y > H + 10) particles.splice(i,1)
      }
      if (particles.length > 0) rafRef.current = requestAnimationFrame(loop)
    }
    loop()
  }, [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main])

  const animateFullscreenConfetti = React.useCallback(() => {
    const canvas = fullCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const DPR = Math.max(1, window.devicePixelRatio || 1)
    const Wcss = canvas.clientWidth
    const Hcss = canvas.clientHeight
    canvas.width = Math.floor(Wcss * DPR)
    canvas.height = Math.floor(Hcss * DPR)
    ctx.scale(DPR, DPR)
    const colors = [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.secondary.main]
    const particles: Array<{ x:number;y:number;vx:number;vy:number;life:number;color:string;size:number;rot:number;vr:number }>=[]
    for (let i=0;i<140;i++) {
      particles.push({
        x: Math.random()*Wcss,
        y: -20 + Math.random()*20,
        vx: (Math.random()-0.5) * 2,
        vy: (Math.random()*2 + 2),
        life: 120 + Math.random()*80,
        color: colors[Math.floor(Math.random()*colors.length)],
        size: 4 + Math.random()*6,
        rot: Math.random()*Math.PI*2,
        vr: (Math.random()-0.5) * 0.2,
      })
    }
    const loop = () => {
      ctx.clearRect(0,0,Wcss,Hcss)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.02
        p.rot += p.vr
        p.life -= 1
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life/150))
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size)
        ctx.restore()
      })
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0 || particles[i].y > Hcss + 40) particles.splice(i,1)
      }
      if (particles.length > 0) {
        fullRafRef.current = requestAnimationFrame(loop)
      }
    }
    loop()
  }, [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.secondary.main])

  // Extra: center spark burst to accompany overlay
  const animateCenterBurst = React.useCallback(() => {
    const canvas = fullCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const DPR = Math.max(1, window.devicePixelRatio || 1)
    const Wcss = canvas.clientWidth
    const Hcss = canvas.clientHeight
    const cx = Wcss / 2
    const cy = Hcss / 2
    const colors = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.light]
    const particles: Array<{ x:number;y:number;vx:number;vy:number;life:number;color:string;size:number }>=[]
    for (let i=0;i<90;i++) {
      const a = Math.random()*Math.PI*2
      const sp = 2 + Math.random()*3
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a)*sp,
        vy: Math.sin(a)*sp,
        life: 90 + Math.random()*40,
        color: colors[Math.floor(Math.random()*colors.length)],
        size: 2 + Math.random()*3,
      })
    }
    const loop = () => {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.scale(DPR, DPR)
      ctx.clearRect(0,0,Wcss,Hcss)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.98
        p.vy *= 0.98
        p.life -= 1
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, p.life/120)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2)
        ctx.fill()
      })
      ctx.restore()
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i,1)
      }
      if (particles.length > 0) {
        fullRafRef.current = requestAnimationFrame(loop)
      }
    }
    loop()
  }, [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.light])

  // Shockwave ring explosion (expanding radial ring)
  const animateShockwave = React.useCallback(() => {
    const canvas = shockCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const DPR = Math.max(1, window.devicePixelRatio || 1)
    const Wcss = canvas.clientWidth
    const Hcss = canvas.clientHeight
    canvas.width = Math.floor(Wcss * DPR)
    canvas.height = Math.floor(Hcss * DPR)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    const cx = Wcss / 2
    const cy = Hcss / 2
    let r = 20
    let alpha = 0.9
    const color = theme.palette.primary.main
    const loop = () => {
      ctx.clearRect(0,0,Wcss,Hcss)
      // radial gradient edge to mimic shockwave
      const grad = ctx.createRadialGradient(cx, cy, Math.max(0, r-10), cx, cy, r)
      grad.addColorStop(0, `rgba(255,255,255,${alpha*0.3})`)
      grad.addColorStop(0.6, `rgba(255,255,255,${alpha*0.15})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI*2)
      ctx.fill()

      // thin bright ring
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI*2)
      ctx.stroke()
      ctx.globalAlpha = 1

      r += 18
      alpha *= 0.94
      if (alpha > 0.05) {
        shockRafRef.current = requestAnimationFrame(loop)
      } else {
        ctx.clearRect(0,0,Wcss,Hcss)
      }
    }
    loop()
  }, [theme.palette.primary.main])

  // Particles that tear through the progress bar along the leading edge
  const emitBarTearParticles = React.useCallback((fromPct: number, toPct: number) => {
    const canvas = barCanvasRef.current
    const holder = barBoxRef.current
    if (!canvas || !holder) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width = holder.clientWidth
    const H = canvas.height = holder.clientHeight
    const edgeX = (toPct / 100) * W
    const count = Math.min(120, Math.max(20, Math.floor(Math.abs(toPct - fromPct) * 1.2)))
    const palette = [theme.palette.primary.light, theme.palette.primary.main, theme.palette.secondary.main]
    const particles: Array<{ x:number;y:number;vx:number;vy:number;life:number;color:string;size:number;g:number }>=[]
    for (let i=0;i<count;i++) {
      const y = Math.random()*H
      const dir = (Math.random() < 0.5 ? -1 : 1)
      particles.push({
        x: edgeX + (Math.random()*4 - 2),
        y,
        vx: (Math.random()*2 + 1) * dir,
        vy: (Math.random()-0.5) * 1.5,
        life: 50 + Math.random()*30,
        color: palette[Math.floor(Math.random()*palette.length)],
        size: 1 + Math.random()*2,
        g: 0.04 + Math.random()*0.04,
      })
    }
    const loop = () => {
      ctx.clearRect(0,0,W,H)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += p.g
        p.life -= 1
        ctx.fillStyle = p.color
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = Math.max(0, p.life/60)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i,1)
      }
      if (particles.length > 0) {
        barRafRef.current = requestAnimationFrame(loop)
      } else {
        ctx.clearRect(0,0,W,H)
      }
    }
    loop()
  }, [theme.palette.primary.light, theme.palette.primary.main, theme.palette.secondary.main])

  const refresh = React.useCallback(async () => {
    const p = await getProgression(userId)
    if (!p) return
    setProgress({ level: p.level, currentLevelXp: p.currentLevelXp, nextLevelXp: p.nextLevelXp })
  }, [userId])

  React.useEffect(() => {
    refresh()
    const channel = supabase
      .channel(`xp_progress_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_progression',
        filter: `user_id=eq.${userId}`,
      }, () => {
        refresh()
      })
      .subscribe()

    const onLocalXp = (e: Event) => {
      const ev = e as CustomEvent<{ userId: string }>
      if (ev.detail?.userId === userId) {
        refresh()
      }
    }
    window.addEventListener('xp_updated', onLocalXp as EventListener)

    return () => {
      supabase.removeChannel(channel)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (barRafRef.current) cancelAnimationFrame(barRafRef.current)
      window.removeEventListener('xp_updated', onLocalXp as EventListener)
    }
  }, [userId, refresh])

  React.useEffect(() => {
    if (!progress) return
    const pct = (progress.currentLevelXp / Math.max(1, progress.nextLevelXp)) * 100
    value.stop()
    // Smoothly animate the motion value to the new target percentage
    fmAnimate(value, pct, { duration: 0.8, ease: 'easeOut' })

    // Emit bar-edge particles for a ripping effect
    emitBarTearParticles(prevPctRef.current, pct)
    prevPctRef.current = pct

    if (prevLevel !== null && progress.level > prevLevel) {
      setLeveledUp(true)
      setJustLeveledTo(progress.level)
      animateParticles()
      animateFullscreenConfetti()
      animateCenterBurst()
      animateShockwave()
      setTimeout(() => setLeveledUp(false), 1800)
    }
    setPrevLevel(progress.level)
  }, [progress, value, prevLevel, animateParticles, animateFullscreenConfetti, emitBarTearParticles])

  if (!progress) return null

  return (
    <Box sx={{ position: 'relative', px: 2, pt: 1, pb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          Уровень {progress.level}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {progress.currentLevelXp}/{progress.nextLevelXp} XP
        </Typography>
      </Box>

      <Box ref={barBoxRef} sx={{ position: 'relative', height: 16, borderRadius: 999, overflow: 'hidden', bgcolor: theme.palette.action.hover }}>
        <motion.div
          style={{ width: widthString as any, height: '100%' }}
        >
          <Box sx={{
            height: '100%',
            width: '100%',
            background: `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
          }} />
        </motion.div>
        {/* Bar-rip particles canvas overlay */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <canvas ref={barCanvasRef} style={{ width: '100%', height: '100%' }} />
        </Box>
        <AnimatePresence>
          {leveledUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            >
              <canvas ref={canvasRef} style={{ width: '100%', height: '64px', position: 'absolute', top: '-24px' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Fullscreen overlay for level-up */}
      {createPortal(
        <AnimatePresence>
          {leveledUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: 'fixed', inset: 0, zIndex: 1300, pointerEvents: 'none' }}
            >
              {/* Dimmed, blurred backdrop */}
              <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }} />
              {/* Background GIF (reference-style explosion) */}
              <motion.img
                src={LEVEL_UP_GIF_URL}
                alt="level up"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 0.6, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px) saturate(1.2)' }}
              />
              {/* Confetti and effects canvases */}
              <canvas ref={fullCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              <canvas ref={shockCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              {/* Big badge */}
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1.08, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 16 }}
                  style={{
                    padding: '22px 34px',
                    borderRadius: 18,
                    fontWeight: 900,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: '#fff',
                    background: 'linear-gradient(135deg, rgba(23,23,23,0.7) 0%, rgba(23,23,23,0.35) 100%)',
                    boxShadow: '0 12px 44px rgba(0,0,0,0.45)',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
                    <Typography variant="h4" sx={{ fontWeight: 900, textShadow: '0 2px 12px rgba(255,215,0,0.45)' }}>Level Up</Typography>
                    {justLeveledTo !== null && (
                      <Typography variant="h3" sx={{ fontWeight: 900, color: 'gold', textShadow: '0 2px 18px rgba(255,215,0,0.6)' }}>#{justLeveledTo}</Typography>
                    )}
                  </Box>
                </motion.div>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </Box>
  )
}

export default XPBar


