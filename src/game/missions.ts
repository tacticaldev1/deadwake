import { Village, VILLAGES, getVillage, getAllVillages } from './villages';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'collect' | 'explore' | 'survive' | 'race' | 'hunt';
  status: 'available' | 'active' | 'completed';
  reward: { coins: number };
  // Village-based navigation
  fromVillage?: string;
  toVillage?: string;
  // For non-village deliveries
  target?: { x: number; y: number; radius: number; label: string };
  // For collect missions
  collectGoal?: number;
  collectCurrent?: number;
  // For survive missions
  surviveTime?: number;
  surviveCurrent?: number;
  // For race missions — must dock at toVillage before this many seconds elapse
  raceTimeLimit?: number;
  // For hunt missions — sink enemy boats by ramming them while boosted
  huntGoal?: number;
  huntCurrent?: number;
  onCompleteDialogue?: string;
  giver: string; // NPC who gave the mission
  giverVillage: string; // village where it was accepted
  act: number;
  // Mission ids that must be completed before this one becomes available
  requires?: string[];
  // Procedurally generated board filler, as opposed to hand-authored story content
  generated?: boolean;
}

// Helper: build target from a village. `extra` defaults to none — every
// call site below is a hand-authored mission tied to one of the base 5
// villages, so it's never needed there; only the loadMissionState() rebuild
// (an active mission that may target a founded outpost) passes it through.
function villageTarget(villageId: string, label: string, extra: Village[] = []) {
  const v = getVillage(villageId, extra);
  if (!v) return undefined;
  return { x: v.x, y: v.y, radius: v.radius, label };
}

export const ACT1_MISSIONS: Mission[] = [
  {
    id: 'first_delivery_salt',
    title: 'To Salt Cove',
    description: "Sail east to Salt Cove. Deliver Naveen's supply crate to Old Ren the fisher.",
    type: 'delivery',
    status: 'available',
    reward: { coins: 40 },
    fromVillage: 'haven',
    toVillage: 'salt_cove',
    target: villageTarget('salt_cove', 'Salt Cove'),
    giver: 'friend',
    giverVillage: 'haven',
    act: 1,
    onCompleteDialogue: 'fisher_first',
  },
  {
    id: 'delivery_grey',
    title: 'To Grey Harbor',
    description: 'Sail southwest to Grey Harbor. Deliver the fisher\'s catch to Naveen.',
    type: 'delivery',
    status: 'available',
    reward: { coins: 55 },
    fromVillage: 'salt_cove',
    toVillage: 'grey_harbor',
    target: villageTarget('grey_harbor', 'Grey Harbor'),
    giver: 'fisher',
    giverVillage: 'salt_cove',
    act: 1,
    requires: ['first_delivery_salt'],
    onCompleteDialogue: 'trader_first',
  },
  {
    id: 'delivery_mistford',
    title: 'To Mistford',
    description: 'Sail north to Mistford. Bells and oil for the Bellkeeper.',
    type: 'delivery',
    status: 'available',
    reward: { coins: 70 },
    fromVillage: 'grey_harbor',
    toVillage: 'mistford',
    target: villageTarget('mistford', 'Mistford'),
    giver: 'trader',
    giverVillage: 'grey_harbor',
    act: 1,
    requires: ['delivery_grey'],
    onCompleteDialogue: 'bellkeeper_first',
  },
  {
    id: 'return_haven',
    title: 'Return to Haven',
    description: 'The child gave you a strange map. Bring it home to the Harbormaster.',
    type: 'delivery',
    status: 'available',
    reward: { coins: 30 },
    fromVillage: 'mistford',
    toVillage: 'haven',
    target: villageTarget('haven', 'Haven Village'),
    giver: 'child',
    giverVillage: 'mistford',
    act: 1,
    requires: ['delivery_mistford'],
    onCompleteDialogue: 'harbormaster_first',
  },
  {
    id: 'collect_salvage',
    title: 'Salvage Run',
    description: 'The tide brings up strange things. Collect 10 coins from open water.',
    type: 'collect',
    status: 'available',
    reward: { coins: 20 },
    collectGoal: 10,
    collectCurrent: 0,
    giver: 'mechanic',
    giverVillage: 'haven',
    act: 1,
  },
  {
    id: 'hunt_wakes',
    title: 'Clear the Wakes',
    description: 'Dark boats prowl these waters. Hit the speed boost, then ram 3 of them to scatter the pack.',
    type: 'hunt',
    status: 'available',
    reward: { coins: 50 },
    huntGoal: 3,
    huntCurrent: 0,
    giver: 'mechanic',
    giverVillage: 'haven',
    act: 1,
    requires: ['collect_salvage'],
  },
];

export const ACT2_MISSIONS: Mission[] = [
  {
    id: 'east_forbidden',
    title: 'The Forbidden East',
    description: 'Sail far east to Ashenreach. Father warned against this. Go anyway.',
    type: 'delivery',
    status: 'available',
    reward: { coins: 150 },
    fromVillage: 'haven',
    toVillage: 'ashenreach',
    target: villageTarget('ashenreach', 'Ashenreach'),
    giver: 'harbormaster',
    giverVillage: 'haven',
    act: 2,
    requires: ['return_haven'],
    onCompleteDialogue: 'stranger_first',
  },
  {
    id: 'saltwidow_favor',
    title: "The Widow's Vigil",
    description: 'Salvage what the tide gives up — 15 coins — so the dock lanterns can be relit.',
    type: 'collect',
    status: 'available',
    reward: { coins: 60 },
    collectGoal: 15,
    collectCurrent: 0,
    giver: 'saltwidow',
    giverVillage: 'salt_cove',
    act: 2,
    requires: ['return_haven'],
  },
  {
    id: 'bellkeeper_watch',
    title: 'Ride Out the Bell',
    description: "Stay on open water 25 seconds while the fog bell rings on its own. Don't ask why.",
    type: 'survive',
    status: 'available',
    reward: { coins: 60 },
    surviveTime: 25,
    surviveCurrent: 0,
    giver: 'bellkeeper',
    giverVillage: 'mistford',
    act: 2,
    requires: ['return_haven'],
  },
  {
    id: 'race_mistford',
    title: 'Outrun the Tide',
    description: 'Grey Harbor to Mistford, before the tide turns. Reach the dock in 35 seconds or the bet is lost.',
    type: 'race',
    status: 'available',
    reward: { coins: 90 },
    fromVillage: 'grey_harbor',
    toVillage: 'mistford',
    target: villageTarget('mistford', 'Mistford'),
    raceTimeLimit: 35,
    giver: 'dockhand',
    giverVillage: 'grey_harbor',
    act: 2,
    requires: ['delivery_grey'],
  },
];

export const ACT3_MISSIONS: Mission[] = [
  {
    id: 'final_reckoning',
    title: 'The Last Posting',
    description: 'Ashenreach again. The Stranger is waiting for your answer.',
    type: 'delivery',
    status: 'available',
    reward: { coins: 200 },
    fromVillage: 'haven',
    toVillage: 'ashenreach',
    target: villageTarget('ashenreach', 'Ashenreach'),
    giver: 'harbormaster',
    giverVillage: 'haven',
    act: 3,
    // The finale — and with it, every ending — is locked until the whole story is done.
    requires: [
      'first_delivery_salt', 'delivery_grey', 'delivery_mistford', 'return_haven',
      'collect_salvage', 'hunt_wakes',
      'east_forbidden', 'saltwidow_favor', 'bellkeeper_watch', 'race_mistford',
    ],
    onCompleteDialogue: 'stranger_finale',
  },
];

const ALL_MISSIONS: Mission[] = [...ACT1_MISSIONS, ...ACT2_MISSIONS, ...ACT3_MISSIONS];

export interface MissionState {
  completedMissions: string[];
  activeMission: Mission | null;
  availableMissions: Mission[];
  act: number;
}

export function createMissionState(): MissionState {
  return {
    completedMissions: [],
    activeMission: null,
    availableMissions: [...ALL_MISSIONS],
    act: 1,
  };
}

export function loadMissionState(extra: Village[] = []): MissionState {
  try {
    const saved = localStorage.getItem('deadwake_missions');
    if (saved) {
      const parsed = JSON.parse(saved) as MissionState;
      // Rebuild targets from village positions (in case village data changed).
      // `extra` matters here specifically: an active mission targeting a
      // founded outpost would otherwise fail this lookup and lose its target.
      if (parsed.activeMission?.toVillage) {
        parsed.activeMission.target = villageTarget(parsed.activeMission.toVillage, getVillage(parsed.activeMission.toVillage, extra)?.name || 'Destination', extra);
      }
      // Reconcile against the latest mission definitions so new content
      // (added after a save was created) still becomes reachable.
      const known = new Set<string>([
        ...parsed.availableMissions.map(m => m.id),
        ...parsed.completedMissions,
        ...(parsed.activeMission ? [parsed.activeMission.id] : []),
      ]);
      for (const m of ALL_MISSIONS) {
        if (!known.has(m.id)) parsed.availableMissions.push(m);
      }
      return parsed;
    }
  } catch {}
  return createMissionState();
}

export function saveMissionState(state: MissionState) {
  localStorage.setItem('deadwake_missions', JSON.stringify(state));
}

// Get missions available at a particular village (offered by NPCs there),
// gated by any prerequisite missions.
export function getMissionsForVillage(state: MissionState, villageId: string): Mission[] {
  return state.availableMissions.filter(
    m => m.giverVillage === villageId
      && !state.completedMissions.includes(m.id)
      && (!m.requires || m.requires.every(r => state.completedMissions.includes(r)))
  );
}

// Current story act, derived from progress — used for HUD display and dialogue tiering.
export function getCurrentAct(state: MissionState): number {
  if (state.completedMissions.includes('final_reckoning')) return 4;
  if (state.completedMissions.includes('east_forbidden')) return 3;
  if (state.completedMissions.includes('return_haven')) return 2;
  return 1;
}

// ============ ADMIN / DEV HELPERS ============

// Jumps the story to a given act by marking every mission up through that act's
// boundary as completed. Used by the admin panel's chapter-select cheat.
export function jumpToAct(state: MissionState, act: 1 | 2 | 3 | 4): MissionState {
  let completed: string[] = [];
  if (act >= 2) completed = [...completed, ...ACT1_MISSIONS.map(m => m.id)];
  if (act >= 3) completed = [...completed, ...ACT2_MISSIONS.map(m => m.id)];
  if (act >= 4) completed = [...completed, ...ACT3_MISSIONS.map(m => m.id)];
  return { ...state, completedMissions: completed, activeMission: null };
}

// Marks every hand-authored mission complete and returns the coin reward owed for
// whichever of them weren't already done. Generated board filler is untouched —
// there's always more of that, so "complete everything" only applies to the story.
export function completeAllMissions(state: MissionState): { state: MissionState; rewardCoins: number } {
  const rewardCoins = ALL_MISSIONS
    .filter(m => !state.completedMissions.includes(m.id))
    .reduce((sum, m) => sum + m.reward.coins, 0);
  return {
    state: { ...state, completedMissions: ALL_MISSIONS.map(m => m.id), activeMission: null },
    rewardCoins,
  };
}

// ============ PROCEDURAL BOARD FILLER ============
// Story missions are hand-authored and gated; these fill out each board to a
// steady 5 postings with random busywork so there's always something to take.

const FILLER_MIN_BOARD_SIZE = 5;

function randomInt(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const COLLECT_TITLES = ['Tide Salvage', 'Loose Coin', 'What the Sea Gives Up', 'Driftwood and Coin', 'Scavenger Run'];
const SURVIVE_TITLES = ['Hold the Wheel', 'Weather It Out', 'Steady Hands', 'Against the Swell', 'Ride It Out'];
const HUNT_TITLES = ['Thin the Pack', 'Dark Sails', 'Clear the Lane', 'Bounty on the Water', 'Scatter the Wolves'];
const RACE_TITLES = ['Beat the Tide', 'No Time to Waste', "Captain's Wager", 'Against the Clock', 'Outrun the Weather'];
const DELIVERY_TITLES = ['Small Parcel', 'Quiet Errand', 'Cargo Run', 'A Favor Owed', 'Loose Ends'];

function generateFillerMission(villageId: string, extra: Village[] = []): Mission | null {
  const village = getVillage(villageId, extra);
  if (!village || village.npcs.length === 0) return null;
  const giver = pick(village.npcs);
  const type = pick<'collect' | 'survive' | 'hunt' | 'race' | 'delivery'>(['collect', 'survive', 'hunt', 'race', 'delivery']);
  const uid = `filler_${villageId}_${type}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  const base: Pick<Mission, 'id' | 'status' | 'giver' | 'giverVillage' | 'act' | 'generated' | 'fromVillage'> = {
    id: uid, status: 'available', giver, giverVillage: villageId, act: 1, generated: true, fromVillage: villageId,
  };

  switch (type) {
    case 'collect': {
      const goal = randomInt(5, 20);
      return {
        ...base, type, title: pick(COLLECT_TITLES),
        description: `The tide brings up strange things. Collect ${goal} coins from open water.`,
        reward: { coins: goal * 3 + randomInt(0, 8) },
        collectGoal: goal, collectCurrent: 0,
      };
    }
    case 'survive': {
      const time = randomInt(15, 35);
      return {
        ...base, type, title: pick(SURVIVE_TITLES),
        description: `Stay out on open water for ${time} seconds. Whatever happens, don't turn back.`,
        reward: { coins: time * 2 + randomInt(0, 10) },
        surviveTime: time, surviveCurrent: 0,
      };
    }
    case 'hunt': {
      const goal = randomInt(2, 5);
      return {
        ...base, type, title: pick(HUNT_TITLES),
        description: `Dark boats prowl these waters. Hit the speed boost, then ram ${goal} of them to scatter the pack.`,
        reward: { coins: goal * 16 + randomInt(0, 10) },
        huntGoal: goal, huntCurrent: 0,
      };
    }
    case 'race': {
      const dest = pick(getAllVillages(extra).filter(v => v.id !== villageId));
      const dist = Math.hypot(dest.x - village.x, dest.y - village.y);
      const limit = Math.max(20, Math.min(90, Math.round(dist / 45)));
      return {
        ...base, type, title: pick(RACE_TITLES),
        description: `${village.name} to ${dest.name}, before the tide turns. Reach the dock in ${limit} seconds or the bet is lost.`,
        reward: { coins: Math.round(dist / 28) + randomInt(0, 15) },
        toVillage: dest.id, target: { x: dest.x, y: dest.y, radius: dest.radius, label: dest.name }, raceTimeLimit: limit,
      };
    }
    case 'delivery': {
      const dest = pick(getAllVillages(extra).filter(v => v.id !== villageId));
      const dist = Math.hypot(dest.x - village.x, dest.y - village.y);
      return {
        ...base, type, title: pick(DELIVERY_TITLES),
        description: `Carry a parcel to ${dest.name}. No questions asked, and better not to ask any yourself.`,
        reward: { coins: Math.round(dist / 40) + randomInt(0, 10) },
        toVillage: dest.id, target: { x: dest.x, y: dest.y, radius: dest.radius, label: dest.name },
      };
    }
  }
}

// Tops a village's board up to a steady 5 postings by generating random filler
// missions to fill any gap left by story missions that are locked, taken, or done.
export function ensureBoardFilled(state: MissionState, villageId: string, extra: Village[] = []): MissionState {
  const current = getMissionsForVillage(state, villageId);
  const needed = FILLER_MIN_BOARD_SIZE - current.length;
  if (needed <= 0) return state;
  const filler: Mission[] = [];
  for (let i = 0; i < needed; i++) {
    const m = generateFillerMission(villageId, extra);
    if (m) filler.push(m);
  }
  if (filler.length === 0) return state;
  return { ...state, availableMissions: [...state.availableMissions, ...filler] };
}
