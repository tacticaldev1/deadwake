import { Village } from './villages';
import { rngFromId } from './rng';

// Founded outposts — the player's own expansion beyond the 5 hand-authored
// villages. Additive only: the base VILLAGES array never changes, this is a
// separate list merged in wherever a village needs to be looked up (see the
// `extra` param threaded through villages.ts/missions.ts/cargo.ts).
export interface OutpostState {
  outposts: Village[];
}

export function loadOutposts(): OutpostState {
  try {
    const saved = localStorage.getItem('deadwake_outposts');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { outposts: [] };
}

export function saveOutposts(state: OutpostState) {
  localStorage.setItem('deadwake_outposts', JSON.stringify(state));
}

// Scaling cost for the (n+1)th outpost — n is however many exist already.
export function outpostCost(n: number): number {
  return 300 + n * 250;
}

const VIBES: Village['vibe'][] = ['fishing', 'trade', 'foggy', 'forbidden'];

const VIBE_COLORS: Record<string, string> = {
  fishing: '#3a5566', trade: '#665533', foggy: '#4a4055', forbidden: '#3a2020',
};

const VIBE_DESCRIPTIONS: Record<string, string[]> = {
  fishing: [
    'A new fishing camp, nets still drying on the racks.',
    'Boats out before dawn here. The catch is good so far.',
  ],
  trade: [
    'A trading post, freshly staked out on the shore.',
    'Word travels fast — merchants have already found this place.',
  ],
  foggy: [
    'Mist clings to this stretch of coast day and night.',
    'The fog never quite lifts, but the harbor is calm.',
  ],
  forbidden: [
    'An unmarked shore. Something about it feels watched.',
    'Charts left this coastline blank for a reason, once.',
  ],
};

const NAME_ADJECTIVES = [
  'Windward', 'Hollow', 'Amber', 'Grey', 'Farflung', 'Sunken', 'Northlight',
  'Ember', 'Quiet', 'Restless', 'Pale', 'Driftwood', 'Copper', 'Long',
];
const NAME_NOUNS = [
  'Landing', 'Reach', 'Cove', 'Point', 'Anchorage', 'Shoal', 'Crossing',
  'Hollow', 'Watch', 'Bluff', 'Harbor', 'Strand',
];

// One of a small pool of generic archetypes (see dialogue.ts) — outposts
// don't get hand-authored NPCs, so many outposts share the same archetype id.
const OUTPOST_NPCS = ['outpost_keeper', 'outpost_trader', 'outpost_lookout'];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Deterministic given the same existingVillages list — seeded purely from the
// new outpost's own (sequential) id, so solo, host, and every co-op joiner
// independently produce the identical Village object with nothing but that
// id needing to cross the wire.
export function foundNewOutpost(existingVillages: Village[]): Village {
  const n = existingVillages.filter(v => v.id.startsWith('outpost_')).length;
  const id = `outpost_${n + 1}`;
  const rng = rngFromId(id);

  const vibe = pick(VIBES, rng);
  const name = `${pick(NAME_ADJECTIVES, rng)} ${pick(NAME_NOUNS, rng)}`;

  // Rejection-sample a position clear of every existing village — same
  // technique as villageLayout.ts's building placement, just in world-space.
  let x = 0, y = 0;
  for (let tries = 0; tries < 30; tries++) {
    const angle = rng() * Math.PI * 2;
    const dist = 800 + rng() * 2400;
    x = Math.cos(angle) * dist;
    y = Math.sin(angle) * dist;
    const tooClose = existingVillages.some(v => Math.hypot(v.x - x, v.y - y) < 600);
    if (!tooClose) break;
  }

  return {
    id,
    name,
    x: Math.round(x),
    y: Math.round(y),
    radius: 70 + Math.floor(rng() * 10),
    color: VIBE_COLORS[vibe],
    description: pick(VIBE_DESCRIPTIONS[vibe], rng),
    vibe,
    npcs: [pick(OUTPOST_NPCS, rng)],
    discovered: false,
  };
}
