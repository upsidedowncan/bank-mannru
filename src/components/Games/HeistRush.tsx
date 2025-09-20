import React from 'react';
import { Box, Button, Typography, Paper, LinearProgress, Chip, Stack, Alert } from '@mui/material';
import { AppLayout } from '../Layout/AppLayout';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

// HeistRush: climb levels, risk of bust increases; cash out to bank your MR
// Mobile‑friendly, big buttons, short sessions.

export const HeistRush: React.FC = () => {
  const { user } = useAuthContext();
  const [level, setLevel] = React.useState(0);
  const [pot, setPot] = React.useState(0); // MR accumulated if cashed now
  const [bustChance, setBustChance] = React.useState(0); // 0..100
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const baseReward = 250; // per level base
  // simple WebAudio SFX
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const getCtx = () => (audioCtxRef.current ||= new (window.AudioContext || (window as any).webkitAudioContext)());
  const playTone = (freq: number, durMs: number, type: OscillatorType = 'sine', gain = 0.05) => {
    try {
      const ctx = getCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g).connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); }, durMs);
    } catch {}
  };
  const sfxSuccess = () => { playTone(880, 80, 'triangle'); setTimeout(() => playTone(1320, 100, 'triangle'), 90); };
  const sfxCash = () => { playTone(740, 80, 'sine'); setTimeout(() => playTone(980, 120, 'sine'), 90); setTimeout(() => playTone(1240, 140, 'sine'), 190); };
  const sfxSiren = () => {
    for (let i = 0; i < 6; i++) setTimeout(() => playTone(520 + (i % 2 ? 180 : 0), 120, 'square', 0.06), i * 120);
  };

  // 3D Room Canvas
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const timeRef = React.useRef(0);
  const cameraRef = React.useRef({ x: 0, y: 0, z: 0, rotX: 0, rotY: 0 });
  const vaultRef = React.useRef({ x: 0, y: 0, z: -200, open: 0 });
  const moneyRef = React.useRef<Array<{x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number}>>([]);
  const alarmRef = React.useRef({ active: false, time: 0 });

  const resizeCanvas = () => {
    const c = canvasRef.current; const el = containerRef.current;
    if (!c || !el) return;
    const rect = el.getBoundingClientRect();
    c.width = Math.max(1, Math.floor(rect.width));
    c.height = Math.max(1, Math.floor(rect.height));
  };

  React.useEffect(() => {
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 3D projection helpers - simplified and fixed
  const project = (x: number, y: number, z: number) => {
    const fov = 400;
    const zOffset = 500;
    const projectedZ = z + zOffset;
    if (projectedZ <= 0) return null;
    const factor = fov / projectedZ;
    return {
      x: (x * factor) + canvasRef.current!.width / 2,
      y: (y * factor) + canvasRef.current!.height / 2,
      z: projectedZ
    };
  };

  const drawCube = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, size: number, color: string) => {
    const corners = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // back
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]     // front
    ];
    
    const projected = corners.map(([cx, cy, cz]) => 
      project(x + cx * size, y + cy * size, z + cz * size)
    ).filter(p => p !== null) as Array<{x:number;y:number;z:number}>;

    if (projected.length < 4) return;

    // Draw faces with proper depth sorting
    const faces = [
      { indices: [0, 1, 2, 3], color: color }, // back
      { indices: [4, 5, 6, 7], color: color }, // front  
      { indices: [0, 1, 5, 4], color: color }, // bottom
      { indices: [2, 3, 7, 6], color: color }, // top
      { indices: [0, 3, 7, 4], color: color }, // left
      { indices: [1, 2, 6, 5], color: color }  // right
    ];
    
    // Sort faces by average z-depth
    faces.sort((a, b) => {
      const aZ = a.indices.reduce((sum, i) => sum + projected[i].z, 0) / a.indices.length;
      const bZ = b.indices.reduce((sum, i) => sum + projected[i].z, 0) / b.indices.length;
      return bZ - aZ; // back to front
    });
    
    faces.forEach(face => {
      const points = face.indices.map(i => projected[i]).filter(p => p);
      if (points.length >= 3) {
        ctx.fillStyle = face.color;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });
  };

  const animate = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    
    timeRef.current += 0.016;
    const time = timeRef.current;
    
    // Clear canvas with dark gradient
    const gradient = ctx.createRadialGradient(c.width/2, c.height/2, 0, c.width/2, c.height/2, c.width);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, c.width, c.height);

    // Camera movement
    cameraRef.current.rotY = Math.sin(time * 0.3) * 0.1;
    cameraRef.current.rotX = Math.sin(time * 0.2) * 0.05;

    // Draw room walls - simplified and more visible
    const wallColor = '#333333';
    const floorColor = '#222222';
    
    // Floor - positioned correctly
    drawCube(ctx, 0, 200, 0, 400, floorColor);
    
    // Walls - positioned to create a room
    drawCube(ctx, -400, 0, 0, 400, wallColor); // left wall
    drawCube(ctx, 400, 0, 0, 400, wallColor);  // right wall
    drawCube(ctx, 0, -400, 0, 400, wallColor); // back wall
    drawCube(ctx, 0, 0, -400, 400, wallColor); // far wall

    // Vault door animation - positioned in center
    vaultRef.current.open = Math.min(1, vaultRef.current.open + (level > 0 ? 0.02 : -0.02));
    const vaultColor = level > 0 ? '#4caf50' : '#666';
    const vaultSize = 100;
    drawCube(ctx, 0, 0, -200, vaultSize, vaultColor);

    // Debug: Draw some test shapes to verify rendering
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(50, 50, 100, 100); // red test square
    
    // Add some lighting effects
    ctx.fillStyle = `rgba(76, 175, 80, ${0.1 + vaultRef.current.open * 0.2})`;
    ctx.fillRect(0, 0, c.width, c.height);

    // Money particles
    moneyRef.current = moneyRef.current.filter(m => m.life > 0);
    moneyRef.current.forEach(m => {
      m.x += m.vx;
      m.y += m.vy;
      m.z += m.vz;
      m.vy += 0.2; // gravity
      m.life -= 1;
      
      const proj = project(m.x, m.y, m.z);
      if (proj) {
        ctx.fillStyle = `rgba(255, 215, 0, ${m.life / 60})`;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Add glow effect
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Alarm effect
    if (alarmRef.current.active) {
      alarmRef.current.time += 0.1;
      const flash = Math.sin(alarmRef.current.time * 20) > 0;
      if (flash) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, c.width, c.height);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  };

  React.useEffect(() => {
    resizeCanvas();
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const spawnMoney = () => {
    for (let i = 0; i < 8; i++) {
      moneyRef.current.push({
        x: vaultRef.current.x + (Math.random() - 0.5) * 40,
        y: vaultRef.current.y + (Math.random() - 0.5) * 40,
        z: vaultRef.current.z + 30,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3,
        vz: Math.random() * 2,
        life: 60
      });
    }
  };

  const triggerAlarm = () => {
    alarmRef.current.active = true;
    alarmRef.current.time = 0;
    setTimeout(() => { alarmRef.current.active = false; }, 2000);
  };

  const reset = () => {
    setLevel(0);
    setPot(0);
    setBustChance(0);
    setMsg(null);
  };

  const nextLevel = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      // risk grows non‑linearly; also random burst to keep exciting
      const next = level + 1;
      const reward = Math.floor(baseReward * (1 + next * 0.35));
      const risk = Math.min(80, Math.floor(5 + next * 6 + Math.random() * 6));

      // roll bust
      const roll = Math.random() * 100;
      if (roll < risk) {
        // busted: lose current run
        sfxSiren();
        triggerAlarm();
        // penalty: 10% of potential pot or 200 MR minimum
        takePenalty(Math.max(200, Math.floor((pot || 0) * 0.1)));
        setLevel(0);
        setPot(0);
        setBustChance(0);
        setMsg('🚨 Сработала сигнализация! Штраф списан.');
      } else {
        setLevel(next);
        setPot(p => p + reward);
        setBustChance(risk);
        setMsg(null);
        sfxSuccess();
        spawnMoney();
      }
      setBusy(false);
    }, 400);
  };

  const cashOut = async () => {
    if (busy || pot <= 0) return;
    if (!user) { setMsg('Нужно войти.'); return; }
    setBusy(true);
    try {
      const { data: cards, error: fetchErr } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (fetchErr) throw fetchErr;
      const actives = (cards || []).filter((c: any) => c.is_active === true || c.is_active === 'true' || c.is_active === 1);
      if (!actives || actives.length === 0) throw new Error('Нет активной карты.');
      const card = actives[0];
      const newBal = (Number(card.balance) || 0) + pot;
      const { error: updErr } = await supabase
        .from('bank_cards')
        .update({ balance: newBal })
        .eq('id', card.id);
      if (updErr) throw updErr;
      sfxCash();
      spawnMoney();
      setMsg(`✅ Зачислено ${pot} MR`);
      reset();
    } catch (e: any) {
      setMsg(e?.message || 'Ошибка зачисления');
    } finally {
      setBusy(false);
    }
  };

  const takePenalty = async (amount: number) => {
    try {
      if (!user) return;
      const { data: cards } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      const actives = (cards || []).filter((c: any) => c.is_active === true || c.is_active === 'true' || c.is_active === 1);
      if (!actives || actives.length === 0) return;
      const card = actives[0];
      const current = Number(card.balance) || 0;
      const nextBal = Math.max(0, current - amount);
      await supabase.from('bank_cards').update({ balance: nextBal }).eq('id', card.id);
    } catch {}
  };

  const riskColor = bustChance < 25 ? 'success' : bustChance < 50 ? 'warning' : 'error';

  return (
    <AppLayout>
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2} sx={{
        background: 'radial-gradient(60% 60% at 50% 40%, rgba(76,175,80,0.12), transparent), linear-gradient(180deg, rgba(255,255,255,0.02), transparent)'
      }}>
        <Paper ref={containerRef} sx={{ p: 3, width: '100%', maxWidth: 520, textAlign: 'center', position: 'relative', overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Typography variant="h5" sx={{ mb: 1, color: 'white', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>HeistRush</Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
            Поднимайтесь по уровням, копите MR и вовремя «смывайтесь», пока не сработала сигнализация.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
            <Chip label={`Уровень: ${level}`} sx={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
            <Chip label={`Банк: ${pot} MR`} sx={{ backgroundColor: 'rgba(76,175,80,0.3)', color: 'white' }} />
            <Chip label={`Риск: ${bustChance}%`} sx={{ backgroundColor: riskColor === 'error' ? 'rgba(244,67,54,0.3)' : riskColor === 'warning' ? 'rgba(255,152,0,0.3)' : 'rgba(76,175,80,0.3)', color: 'white' }} />
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(100, bustChance)} sx={{ mb: 2, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
            <Button variant="contained" fullWidth disabled={busy} onClick={nextLevel}>Далее</Button>
            <Button variant="outlined" fullWidth disabled={busy || pot <= 0} onClick={cashOut}>Смыться</Button>
          </Stack>
          <Button variant="text" sx={{ color: 'rgba(255,255,255,0.7)' }} onClick={reset} disabled={busy}>Сброс</Button>
          {msg && <Alert sx={{ mt: 2 }} severity={msg.startsWith('✅') ? 'success' : 'warning'}>{msg}</Alert>}
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1 }} />
        </Paper>
      </Box>
    </AppLayout>
  );
};

export default HeistRush;


