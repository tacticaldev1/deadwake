// A purely derived readout — no new persisted state, just a friendlier way to
// look at stats the game already tracks (coins, villages found, outposts
// founded, story progress). Stardew-esque sense of "the empire is growing"
// without adding a new mechanic of its own.
export interface EmpireStats {
  coins: number;
  discoveredCount: number;
  outpostCount: number;
  completedMissionsCount: number;
}

const RANKS = [
  'Deckhand', 'Skipper', 'Trader', 'Merchant Captain', 'Fleet Admiral', 'Shipping Magnate',
];
const THRESHOLDS = [0, 150, 400, 900, 1800, 3200];

export function computeEmpireScore(stats: EmpireStats): number {
  return Math.round(
    stats.coins / 10 + stats.discoveredCount * 50 + stats.outpostCount * 150 + stats.completedMissionsCount * 30
  );
}

export function getEmpireRank(stats: EmpireStats): string {
  const score = computeEmpireScore(stats);
  let rank = RANKS[0];
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (score >= THRESHOLDS[i]) rank = RANKS[i];
  }
  return rank;
}
