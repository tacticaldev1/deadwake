// Story milestones (formerly "endings") — the finale mystery still has a
// payoff, it just doesn't stop the game. Reaching one is a permanent record,
// same shape/pattern as DiscoveryState in villages.ts.
export interface MilestoneState {
  earned: string[]; // milestone ids, e.g. 'ending_seal'
}

export function loadMilestones(): MilestoneState {
  try {
    const saved = localStorage.getItem('deadwake_milestones');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { earned: [] };
}

export function saveMilestones(state: MilestoneState) {
  localStorage.setItem('deadwake_milestones', JSON.stringify(state));
}

export function markMilestoneEarned(state: MilestoneState, id: string): MilestoneState {
  if (state.earned.includes(id)) return state;
  return { earned: [...state.earned, id] };
}
