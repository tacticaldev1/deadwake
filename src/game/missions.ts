export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'collect' | 'explore' | 'survive';
  status: 'available' | 'active' | 'completed';
  reward: { coins: number; xp?: number };
  // Target location in world coords
  target?: { x: number; y: number; radius: number; label: string };
  // For collect missions
  collectGoal?: number;
  collectCurrent?: number;
  // For survive missions
  surviveTime?: number;
  surviveCurrent?: number;
  // Dialogue to trigger on complete
  onCompleteDialogue?: string;
  // Act requirement
  act: number;
}

export const ACT1_MISSIONS: Mission[] = [
  {
    id: 'first_delivery',
    title: "Naveen's Supplies",
    description: 'Deliver trade supplies to the eastern buoy marker.',
    type: 'delivery',
    status: 'available',
    reward: { coins: 25 },
    target: { x: 800, y: -400, radius: 60, label: 'Drop-off' },
    act: 1,
    onCompleteDialogue: 'trader_first',
  },
  {
    id: 'collect_salvage',
    title: 'Salvage Run',
    description: 'Collect 10 coins from the nearby waters.',
    type: 'collect',
    status: 'available',
    reward: { coins: 15 },
    collectGoal: 10,
    collectCurrent: 0,
    act: 1,
  },
  {
    id: 'explore_north',
    title: 'Chart the Northern Waters',
    description: 'Sail 500m north to survey the old route.',
    type: 'delivery',
    status: 'available',
    reward: { coins: 30 },
    target: { x: 0, y: -1200, radius: 80, label: 'Survey Point' },
    act: 1,
    onCompleteDialogue: 'dad_log_1',
  },
  {
    id: 'survive_storm',
    title: 'Weather the Storm',
    description: 'Survive 30 seconds in open water without returning to port.',
    type: 'survive',
    status: 'available',
    reward: { coins: 40 },
    surviveTime: 30,
    surviveCurrent: 0,
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
    if (saved) return JSON.parse(saved);
  } catch {}
  return createMissionState();
}

export function saveMissionState(state: MissionState) {
  localStorage.setItem('deadwake_missions', JSON.stringify(state));
}
