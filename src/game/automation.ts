import { Village, getVillage } from './villages';
import { FriendshipState, getFriendshipLevel, getFriendshipTier } from './friendship';

// A friended NPC hired to passively run a trade route for the party. This is
// a live-play trickle (ticked while the game is open), not offline/idle
// progress — no "time since last session" math needed, so save/reload stays
// as simple as everything else in this game.
export interface HiredCaptain {
  npcId: string;
  npcName: string;
  homeVillage: string;
  toVillage: string;
  hiredAt: number;
}

export interface AutomationState {
  hired: HiredCaptain[];
}

export const MAX_CAPTAINS = 3;

export function loadAutomation(): AutomationState {
  try {
    const saved = localStorage.getItem('deadwake_automation');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { hired: [] };
}

export function saveAutomation(state: AutomationState) {
  localStorage.setItem('deadwake_automation', JSON.stringify(state));
}

// Returns null (caller shows a brief notice) if already at the cap, this NPC
// is already hired, or there's no other discovered village yet to route to.
export function hireCaptain(
  state: AutomationState, npcId: string, npcName: string, homeVillageId: string,
  allVillages: Village[], discoveredIds: string[],
): AutomationState | null {
  if (state.hired.length >= MAX_CAPTAINS) return null;
  if (state.hired.some(h => h.npcId === npcId)) return null;
  const candidates = allVillages.filter(v => v.id !== homeVillageId && discoveredIds.includes(v.id));
  if (candidates.length === 0) return null;
  const dest = candidates[Math.floor(Math.random() * candidates.length)];
  const captain: HiredCaptain = { npcId, npcName, homeVillage: homeVillageId, toVillage: dest.id, hiredAt: Date.now() };
  return { hired: [...state.hired, captain] };
}

// Pure — reused identically by solo's own interval and the co-op host's.
export function tickCaptains(hired: HiredCaptain[], allVillages: Village[], friendship: FriendshipState): number {
  let total = 0;
  for (const captain of hired) {
    const home = getVillage(captain.homeVillage, allVillages);
    const dest = getVillage(captain.toVillage, allVillages);
    if (!home || !dest) continue;
    const dist = Math.hypot(dest.x - home.x, dest.y - home.y);
    const tier = getFriendshipTier(getFriendshipLevel(friendship, captain.npcId));
    total += (dist / 20) * tier.payoutMultiplier;
  }
  return Math.round(total);
}
