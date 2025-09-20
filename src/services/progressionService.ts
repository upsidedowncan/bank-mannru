// Server-backed progression service using Supabase with graceful local fallback
// Primary source of truth: public.user_progression (via RPC). Fallback: localStorage
import { supabase } from '../config/supabase';

export interface ProgressionState {
  xp: number;
  level: number;
  currentLevelXp: number; // XP accumulated into current level
  nextLevelXp: number; // Total XP required to reach next level from 0
  xpToNextLevel: number; // Remaining XP to next level
}

const STORAGE_KEY_PREFIX = 'mannru_progression_';

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readXp(userId: string): number {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed?.xp === 'number' && parsed.xp >= 0 ? parsed.xp : 0;
  } catch {
    return 0;
  }
}

function writeXp(userId: string, xp: number): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify({ xp }));
  } catch {
    // ignore
  }
}

// Level curve: XP needed for level n -> base * n^1.5, cumulative across levels
// Base target for level 1 around 250 xp
const BASE_PER_LEVEL = 250;

function xpNeededForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.floor(BASE_PER_LEVEL * Math.pow(level, 1.5));
}

function cumulativeXpForLevel(level: number): number {
  // Total XP required to reach the start of given level (level 1 => 0)
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpNeededForLevel(l);
  }
  return total;
}

function computeLevelFromXp(totalXp: number): { level: number; currentLevelXp: number; nextLevelTotalXp: number } {
  let level = 1;
  let remaining = totalXp;
  while (true) {
    const need = xpNeededForLevel(level);
    if (remaining < need) {
      return { level, currentLevelXp: remaining, nextLevelTotalXp: need };
    }
    remaining -= need;
    level += 1;
    // Safety cap
    if (level > 999) {
      return { level: 999, currentLevelXp: 0, nextLevelTotalXp: xpNeededForLevel(999) };
    }
  }
}

export async function getProgression(userId: string | undefined | null): Promise<ProgressionState | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.rpc('get_progression', { user_id_in: userId });
    if (error) throw error;
    const totalXp = Array.isArray(data) && data[0]?.total_xp != null ? Number(data[0].total_xp) : 0;
    const { level, currentLevelXp, nextLevelTotalXp } = computeLevelFromXp(totalXp);
    return {
      xp: totalXp,
      level,
      currentLevelXp,
      nextLevelXp: nextLevelTotalXp,
      xpToNextLevel: Math.max(0, nextLevelTotalXp - currentLevelXp),
    };
  } catch {
    // Fallback to local
    const totalXp = readXp(userId);
    const { level, currentLevelXp, nextLevelTotalXp } = computeLevelFromXp(totalXp);
    return {
      xp: totalXp,
      level,
      currentLevelXp,
      nextLevelXp: nextLevelTotalXp,
      xpToNextLevel: Math.max(0, nextLevelTotalXp - currentLevelXp),
    };
  }
}

export async function addXp(userId: string | undefined | null, amount: number): Promise<ProgressionState | null> {
  if (!userId) return null;
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  try {
    const { error } = await supabase.rpc('add_xp', { user_id_in: userId, amount_in: safeAmount });
    if (error) throw error;
    // Notify local listeners immediately
    try { window.dispatchEvent(new CustomEvent('xp_updated', { detail: { userId, delta: safeAmount } })); } catch {}
    return await getProgression(userId);
  } catch {
    // Fallback to local
    const newXp = Math.max(0, readXp(userId) + safeAmount);
    writeXp(userId, newXp);
    try { window.dispatchEvent(new CustomEvent('xp_updated', { detail: { userId, delta: safeAmount } })); } catch {}
    return await getProgression(userId);
  }
}

export async function setXp(userId: string | undefined | null, amount: number): Promise<ProgressionState | null> {
  if (!userId) return null;
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  // There is no direct set RPC for safety; emulate by reading current and adding delta
  const current = await getProgression(userId);
  const currentTotal = current?.xp ?? 0;
  const delta = Math.max(0, safeAmount - currentTotal);
  return await addXp(userId, delta);
}


// --- Social XP helpers ---
// We don't implement actual social rank storage here.
// Read a tentative social rank level from localStorage to simulate multiplier if present.
function readSocialRankLevel(userId: string): number {
  try {
    const raw = localStorage.getItem(`social_rank_level_${userId}`);
    const level = raw ? parseInt(raw, 10) : 0;
    if (!Number.isFinite(level) || level < 0) return 0;
    return Math.min(level, 100);
  } catch { return 0; }
}

export function getSocialMultiplier(userId: string | undefined | null): number {
  if (!userId) return 1;
  const level = readSocialRankLevel(userId);
  // 5% per rank level, capped at 2x
  const multiplier = 1 + (level * 0.05);
  return Math.max(1, Math.min(multiplier, 2));
}

type SocialAction = 'manpay_transfer' | 'market_purchase' | 'gift_receive' | 'other';

function computeBaseSocialXp(amount: number, action: SocialAction): number {
  const safeAmount = Math.max(0, Number(amount) || 0);
  switch (action) {
    case 'manpay_transfer':
    case 'market_purchase': {
      // Amount-scaled XP: stronger linear component (10% of amount) + log kicker
      const linear = safeAmount * 0.50; // 10% of amount -> 999 => ~99.9 xp before multiplier
      const logKicker = Math.log10(safeAmount + 1) * 20; // smooth boost across ranges
      const scaled = linear + logKicker;
      return Math.max(10, Math.min(2000, Math.floor(scaled)));
    }
    case 'gift_receive':
      return 5;
    default:
      return 3;
  }
}

export async function addSocialXpForAction(userId: string | undefined | null, action: SocialAction, amount: number): Promise<ProgressionState | null> {
  if (!userId) return null;
  const base = computeBaseSocialXp(amount, action);
  const mult = getSocialMultiplier(userId);
  const finalXp = Math.max(1, Math.floor(base * mult));
  return await addXp(userId, finalXp);
}

export function previewSocialXp(userId: string | undefined | null, action: SocialAction, amount: number): number {
  if (!userId) return 0;
  const base = computeBaseSocialXp(amount, action);
  const mult = getSocialMultiplier(userId);
  return Math.max(1, Math.floor(base * mult));
}

