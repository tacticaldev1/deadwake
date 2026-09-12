// NPC friendship — keyed by NPC id alone (not id+village), matching the
// existing precedent that talkedTo/pickNpcDialogue are already npcId-only.
// This matters for outpost archetypes (outpost_keeper etc.), which can be
// staffing multiple founded outposts at once sharing one id — friendship
// with "The Keeper" is a recurring role/reputation, not one individual.
export interface FriendshipState {
  levels: Record<string, number>;
}

export function loadFriendship(): FriendshipState {
  try {
    const saved = localStorage.getItem('deadwake_friendship');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { levels: {} };
}

export function saveFriendship(state: FriendshipState) {
  localStorage.setItem('deadwake_friendship', JSON.stringify(state));
}

export function increaseFriendship(state: FriendshipState, npcId: string, amount: number): FriendshipState {
  const current = state.levels[npcId] || 0;
  return { levels: { ...state.levels, [npcId]: current + amount } };
}

export interface FriendshipTier {
  name: string;
  hireable: boolean;
  payoutMultiplier: number;
  // One-time coin gift awarded the moment this tier is first reached (0 for
  // the base tier, since everyone starts there with nothing to celebrate).
  giftCoins: number;
}

const TIERS: { threshold: number; tier: FriendshipTier }[] = [
  { threshold: 0, tier: { name: 'Acquaintance', hireable: false, payoutMultiplier: 1, giftCoins: 0 } },
  { threshold: 20, tier: { name: 'Friend', hireable: false, payoutMultiplier: 1, giftCoins: 15 } },
  { threshold: 50, tier: { name: 'Trusted', hireable: true, payoutMultiplier: 1, giftCoins: 30 } },
  { threshold: 100, tier: { name: 'Ally', hireable: true, payoutMultiplier: 1.5, giftCoins: 60 } },
];

export function getFriendshipLevel(state: FriendshipState, npcId: string): number {
  return state.levels[npcId] || 0;
}

function tierIndexForLevel(level: number): number {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (level >= TIERS[i].threshold) idx = i;
  return idx;
}

export function getFriendshipTier(level: number): FriendshipTier {
  return TIERS[tierIndexForLevel(level)].tier;
}

// Everything the friendship meter UI needs in one call: current tier, and
// progress toward the next one (pct is 100 once there's no tier left to climb).
export interface FriendshipProgress {
  level: number;
  tierName: string;
  hireable: boolean;
  payoutMultiplier: number;
  nextThreshold: number | null;
  pct: number;
}

export function getFriendshipProgress(state: FriendshipState, npcId: string): FriendshipProgress {
  const level = getFriendshipLevel(state, npcId);
  const idx = tierIndexForLevel(level);
  const current = TIERS[idx];
  const next = TIERS[idx + 1] || null;
  const pct = next ? Math.min(100, Math.max(0, ((level - current.threshold) / (next.threshold - current.threshold)) * 100)) : 100;
  return {
    level,
    tierName: current.tier.name,
    hireable: current.tier.hireable,
    payoutMultiplier: current.tier.payoutMultiplier,
    nextThreshold: next ? next.threshold : null,
    pct,
  };
}

// Reused identically by solo (DeadwakeGame.tsx) and the co-op host
// (sessionServer.ts) — the single funnel every friendship gain passes
// through, so a tier-up gift can never be granted in one path and missed
// in the other.
export function bumpFriendshipWithGift(state: FriendshipState, npcId: string, amount: number): { next: FriendshipState; giftCoins: number } {
  const prevTier = getFriendshipTier(getFriendshipLevel(state, npcId));
  const next = increaseFriendship(state, npcId, amount);
  const newTier = getFriendshipTier(getFriendshipLevel(next, npcId));
  const giftCoins = newTier.name !== prevTier.name ? newTier.giftCoins : 0;
  return { next, giftCoins };
}
