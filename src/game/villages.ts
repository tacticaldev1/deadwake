// Villages — dockable towns spread across the sea
export interface Village {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number; // docking range
  color: string;  // roof color hint
  description: string;
  vibe: 'home' | 'fishing' | 'trade' | 'foggy' | 'forbidden';
  npcs: string[]; // NPC IDs in this village
  discovered: boolean;
  hasShop?: boolean; // only Haven, today
  hasChartTable?: boolean; // only Haven — where new outposts are founded
}

// Village world positions — spread around origin
export const VILLAGES: Village[] = [
  {
    id: 'haven',
    name: 'Haven Village',
    x: 0,
    y: 0,
    radius: 80,
    color: '#8a7a3a',
    description: "Your father's home. Quiet, warm lanterns in the fog.",
    vibe: 'home',
    npcs: ['friend', 'mechanic', 'harbormaster'],
    discovered: true,
    hasShop: true,
    hasChartTable: true,
  },
  {
    id: 'salt_cove',
    name: 'Salt Cove',
    x: 1400,
    y: 500,
    radius: 70,
    color: '#3a5566',
    description: 'A fishing village. Nets hung out to dry. Nobody meets your eye.',
    vibe: 'fishing',
    npcs: ['fisher', 'saltwidow'],
    discovered: false,
  },
  {
    id: 'grey_harbor',
    name: 'Grey Harbor',
    x: -1200,
    y: 900,
    radius: 70,
    color: '#665533',
    description: 'A merchant town. Coin changes hands. Whispers change hands too.',
    vibe: 'trade',
    npcs: ['trader', 'dockhand'],
    discovered: false,
  },
  {
    id: 'mistford',
    name: 'Mistford',
    x: -800,
    y: -1600,
    radius: 70,
    color: '#4a4055',
    description: 'The fog never lifts here. The bells ring on their own.',
    vibe: 'foggy',
    npcs: ['bellkeeper', 'child'],
    discovered: false,
  },
  {
    id: 'ashenreach',
    name: 'Ashenreach',
    x: 2000,
    y: -1000,
    radius: 70,
    color: '#3a2020',
    description: 'The last port east. Your father marked it with a black X.',
    vibe: 'forbidden',
    npcs: ['stranger'],
    discovered: false,
  },
];

// `extra` is the founded-outposts list (see outposts.ts) — every lookup below
// takes it as an optional trailing param, defaulting to empty, so every
// existing call site keeps compiling and behaving identically without it.
export function getAllVillages(extra: Village[] = []): Village[] {
  return [...VILLAGES, ...extra];
}

export function getVillage(id: string, extra: Village[] = []): Village | undefined {
  return getAllVillages(extra).find(v => v.id === id);
}

export interface DiscoveryState {
  discovered: string[]; // village IDs
}

export function loadDiscovery(): DiscoveryState {
  try {
    const saved = localStorage.getItem('deadwake_discovery');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { discovered: ['haven'] };
}

export function saveDiscovery(state: DiscoveryState) {
  localStorage.setItem('deadwake_discovery', JSON.stringify(state));
}

export function markDiscovered(state: DiscoveryState, id: string): DiscoveryState {
  if (state.discovered.includes(id)) return state;
  return { discovered: [...state.discovered, id] };
}

// Last village the player was standing in — restored on the next session
// so returning players land where they left off instead of always at Haven.
// Needs `extra` too: without it, reloading while standing at a founded
// outpost would silently fail the getVillage check and bounce to Haven.
export function loadCurrentVillage(extra: Village[] = []): string {
  try {
    const saved = localStorage.getItem('deadwake_current_village');
    if (saved && getVillage(saved, extra)) return saved;
  } catch {}
  return 'haven';
}

export function saveCurrentVillage(id: string) {
  localStorage.setItem('deadwake_current_village', id);
}

// Nearest village not yet discovered, for exploration guidance
export function findNearestUndiscovered(x: number, y: number, discovered: string[], extra: Village[] = []): Village | null {
  let best: Village | null = null;
  let bestDist = Infinity;
  for (const v of getAllVillages(extra)) {
    if (discovered.includes(v.id)) continue;
    const d = Math.sqrt((v.x - x) ** 2 + (v.y - y) ** 2);
    if (d < bestDist) { bestDist = d; best = v; }
  }
  return best;
}

// Find the village the player is currently within docking range of
export function findNearbyVillage(x: number, y: number, extra: Village[] = []): Village | null {
  for (const v of getAllVillages(extra)) {
    const dx = x - v.x;
    const dy = y - v.y;
    if (Math.sqrt(dx * dx + dy * dy) < v.radius) return v;
  }
  return null;
}
