// Shared message protocol between the host's session server (runs in the
// Electron main process) and every player's renderer client (host's own
// window included — there is no special-cased "host client" code path).
// Plain JSON-serializable discriminated unions over a WebSocket connection.

export interface CoopPlayerInfo {
  id: string;
  name: string;
  outfitColor: string;
  hairColor: string;
  accentColor: string;
  skinId: string;
}

export interface CoopPlayerPosition {
  playerId: string;
  villageId: string | null; // null = at sea (world coords), else village-local coords
  x: number;
  y: number;
  angle: number;
}

export interface PartyEconomyState {
  coins: number;
  unlockedSkins: string[];
  unlockedSails: string[];
  unlockedTrails: string[];
  unlockedSpeedUpgrades: string[];
}

// ---------- Client -> Host ----------

export type ClientMessage =
  | { type: 'HELLO'; player: Omit<CoopPlayerInfo, 'id'> }
  | { type: 'POSITION_UPDATE'; villageId: string | null; x: number; y: number; angle: number }
  | { type: 'SKIN_CHANGED'; skinId: string }
  | { type: 'PROFILE_CHANGED'; name: string; outfitColor: string; hairColor: string; accentColor: string }
  | { type: 'ACCEPT_MISSION'; missionId: string }
  // Covers every mission type: delivery/race are village-validated server-side;
  // collect/survive/hunt are self-reported by the client (no server-side
  // progress tracking in v1 — see the "out of scope" notes on anti-cheat).
  | { type: 'COMPLETE_MISSION' }
  | { type: 'PICK_UP_CARGO'; villageId: string; itemId: string }
  | { type: 'DROP_OFF_CARGO'; itemId: string }
  | { type: 'DOCK_AT_VILLAGE'; villageId: string }
  | { type: 'BUY_UNLOCK'; kind: 'skins' | 'sails' | 'trails' | 'speedUpgrades'; id: string; price: number }
  | { type: 'BANK_COINS'; amount: number }
  | { type: 'CHAT'; text: string }
  // The finale mystery's choice — a party-wide, one-time pick (see milestones.ts).
  | { type: 'CHOOSE_MILESTONE'; milestoneId: string }
  // Empire expansion (see outposts.ts) — no payload, the host is the sole
  // authority on the RNG that decides what gets founded and where.
  | { type: 'FOUND_OUTPOST' }
  // NPC friendship/automation (see friendship.ts, automation.ts).
  | { type: 'TALK_TO_NPC'; npcId: string; dialogueId: string }
  | { type: 'HIRE_CAPTAIN'; npcId: string; npcName: string };

// ---------- Host -> Client(s) ----------

export type HostMessage =
  | { type: 'WELCOME'; selfId: string; players: CoopPlayerInfo[]; snapshot: CoopSnapshot }
  | { type: 'PLAYER_JOINED'; player: CoopPlayerInfo }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_POSITION'; position: CoopPlayerPosition }
  | { type: 'PLAYER_SKIN_CHANGED'; playerId: string; skinId: string }
  | { type: 'PLAYER_PROFILE_CHANGED'; playerId: string; name: string; outfitColor: string; hairColor: string; accentColor: string }
  | { type: 'MISSION_STATE'; missionState: import('../game/missions').MissionState }
  | { type: 'MISSION_REJECTED'; reason: string }
  | { type: 'CARGO_PORT_STOCK'; portStock: import('../game/cargo').CargoState['portStock'] }
  | { type: 'PARTY_ECONOMY'; economy: PartyEconomyState }
  | { type: 'DISCOVERY_STATE'; discovered: string[] }
  | { type: 'CHAT_MESSAGE'; playerId: string; name: string; text: string; ts: number }
  | { type: 'MILESTONE_CHOSEN'; milestoneId: string }
  | { type: 'OUTPOSTS_STATE'; outposts: import('../game/villages').Village[] }
  | { type: 'FRIENDSHIP_STATE'; levels: Record<string, number> }
  | { type: 'AUTOMATION_STATE'; hired: import('../game/automation').HiredCaptain[] }
  | { type: 'HOST_CLOSING' };

export interface CoopSnapshot {
  missionState: import('../game/missions').MissionState;
  portStock: import('../game/cargo').CargoState['portStock'];
  economy: PartyEconomyState;
  discovered: string[];
  milestoneId: string | null;
  outposts: import('../game/villages').Village[];
  friendship: Record<string, number>;
  hired: import('../game/automation').HiredCaptain[];
}

export const DEFAULT_COOP_PORT = 7777;
