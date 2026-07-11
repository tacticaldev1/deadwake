import { VILLAGES, getVillage } from './villages';

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'collect' | 'explore' | 'survive';
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
  onCompleteDialogue?: string;
  giver: string; // NPC who gave the mission
  giverVillage: string; // village where it was accepted
  act: number;
}

// Helper: build target from a village
function villageTarget(villageId: string, label: string) {
  const v = getVillage(villageId);
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
    onCompleteDialogue: 'harbormaster_first',
  },
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
    act: 1,
    onCompleteDialogue: 'stranger_first',
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
];

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
    availableMissions: [...ACT1_MISSIONS],
    act: 1,
  };
}

export function loadMissionState(): MissionState {
  try {
    const saved = localStorage.getItem('deadwake_missions');
    if (saved) {
      const parsed = JSON.parse(saved) as MissionState;
      // Rebuild targets from village positions (in case village data changed)
      if (parsed.activeMission?.toVillage) {
        parsed.activeMission.target = villageTarget(parsed.activeMission.toVillage, getVillage(parsed.activeMission.toVillage)?.name || 'Destination');
      }
      return parsed;
    }
  } catch {}
  return createMissionState();
}

export function saveMissionState(state: MissionState) {
  localStorage.setItem('deadwake_missions', JSON.stringify(state));
}

// Get missions available at a particular village (offered by NPCs there)
export function getMissionsForVillage(state: MissionState, villageId: string): Mission[] {
  return state.availableMissions.filter(
    m => m.giverVillage === villageId && !state.completedMissions.includes(m.id)
  );
}
