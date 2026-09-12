import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import {
  MissionState, Mission, createMissionState, ensureBoardFilled,
} from '../../src/game/missions';
import {
  CargoState, CargoItem, createCargoState, ensurePortStocked, pickUpCargo, dropOffCargo, returnCargoToStock,
} from '../../src/game/cargo';
import { Village, markDiscovered, getAllVillages } from '../../src/game/villages';
import { outpostCost, foundNewOutpost } from '../../src/game/outposts';
import { FriendshipState, bumpFriendshipWithGift } from '../../src/game/friendship';
import { HiredCaptain, hireCaptain, tickCaptains } from '../../src/game/automation';
import { NPC_PORTRAITS } from '../../src/game/dialogue';
import { BOAT_SKINS } from '../../src/game/shopData';
import {
  ClientMessage, HostMessage, CoopPlayerInfo, CoopSnapshot, PartyEconomyState, CoopPlayerPosition,
} from '../../src/net/protocol';

const CAPTAIN_TICK_MS = 45000;

// NOTE: this file runs in Electron's main process — it has no `window`, so it
// must only import the *pure* reducers from game/missions.ts and game/cargo.ts,
// never their load*State()/save*State() wrappers (those touch localStorage,
// which does not exist here). Persistence for the co-op session itself is a
// separate JSON file on disk, distinct from anyone's solo save.

interface PlayerRecord {
  id: string;
  info: CoopPlayerInfo;
  currentVillageId: string | null;
  hold: CargoItem[];
  send: (msg: HostMessage) => void;
}

interface PersistedSession {
  missionState: MissionState;
  portStock: CargoState['portStock'];
  economy: PartyEconomyState;
  discovered: string[];
  milestoneId: string | null;
  outposts: Village[];
  friendship: FriendshipState;
  hired: HiredCaptain[];
}

const SAVE_FILE = () => path.join(app.getPath('userData'), 'coop-session.json');

const DEFAULT_ECONOMY: PartyEconomyState = { coins: 0, unlockedSkins: ['classic'], unlockedSails: ['plain'], unlockedTrails: ['default'], unlockedSpeedUpgrades: ['standard'] };

function loadPersisted(): PersistedSession {
  try {
    const raw = fs.readFileSync(SAVE_FILE(), 'utf-8');
    const saved = JSON.parse(raw) as PersistedSession;
    // Merge over the defaults, not the other way, so a session saved before
    // speed upgrades/milestones/outposts/friendship existed comes back with
    // valid values instead of undefined.
    return {
      milestoneId: null, outposts: [], friendship: { levels: {} }, hired: [],
      ...saved, economy: { ...DEFAULT_ECONOMY, ...saved.economy },
    };
  } catch {
    return {
      missionState: createMissionState(),
      portStock: createCargoState().portStock,
      economy: { ...DEFAULT_ECONOMY },
      discovered: ['haven'],
      milestoneId: null,
      outposts: [],
      friendship: { levels: {} },
      hired: [],
    };
  }
}

export class SessionServer {
  private missionState: MissionState;
  private portStock: CargoState['portStock'];
  private economy: PartyEconomyState;
  private discovered: string[];
  private milestoneId: string | null;
  private outposts: Village[];
  private friendship: FriendshipState;
  private hired: HiredCaptain[];
  // Session-only (not persisted) — mirrors the solo client's own
  // friendshipDialogueSeenRef, just server-side so every client's talk
  // intent is deduped the same authoritative way.
  private dialogueSeen = new Map<string, string>();
  private tickTimer: ReturnType<typeof setInterval>;
  private players = new Map<string, PlayerRecord>();

  constructor() {
    const saved = loadPersisted();
    this.missionState = saved.missionState;
    this.portStock = saved.portStock;
    this.economy = saved.economy;
    this.discovered = saved.discovered;
    this.milestoneId = saved.milestoneId;
    this.outposts = saved.outposts;
    this.friendship = saved.friendship;
    this.hired = saved.hired;

    this.tickTimer = setInterval(() => this.tickCaptainIncome(), CAPTAIN_TICK_MS);
  }

  private tickCaptainIncome() {
    if (this.hired.length === 0) return;
    const earned = tickCaptains(this.hired, getAllVillages(this.outposts), this.friendship);
    if (earned <= 0) return;
    this.economy = { ...this.economy, coins: this.economy.coins + earned };
    this.broadcast({ type: 'PARTY_ECONOMY', economy: this.economy });
    this.broadcast({ type: 'CHAT_MESSAGE', playerId: 'system', name: 'Fleet', text: `Your captains earned ◆${earned}`, ts: Date.now() });
    this.persist();
  }

  // Single funnel for every friendship gain (talk + mission completion), so a
  // tier-up gift is broadcast the same way regardless of which triggered it.
  private applyFriendshipGain(npcId: string, amount: number) {
    const { next, giftCoins } = bumpFriendshipWithGift(this.friendship, npcId, amount);
    this.friendship = next;
    this.broadcast({ type: 'FRIENDSHIP_STATE', levels: this.friendship.levels });
    if (giftCoins > 0) {
      const npcName = NPC_PORTRAITS[npcId]?.name || 'They';
      this.economy = { ...this.economy, coins: this.economy.coins + giftCoins };
      this.broadcast({ type: 'PARTY_ECONOMY', economy: this.economy });
      this.broadcast({ type: 'CHAT_MESSAGE', playerId: 'system', name: 'Fleet', text: `${npcName} gave the party a gift: ◆${giftCoins}`, ts: Date.now() });
    }
  }

  // Called when the host stops hosting/quits, so the tick timer doesn't
  // keep firing against a session nobody can see anymore.
  dispose() {
    clearInterval(this.tickTimer);
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(SAVE_FILE()), { recursive: true });
      fs.writeFileSync(SAVE_FILE(), JSON.stringify({
        missionState: this.missionState, portStock: this.portStock, economy: this.economy,
        discovered: this.discovered, milestoneId: this.milestoneId, outposts: this.outposts,
        friendship: this.friendship, hired: this.hired,
      }));
    } catch (err) {
      console.error('[coop] failed to persist session', err);
    }
  }

  private broadcast(msg: HostMessage, exceptPlayerId?: string) {
    for (const p of this.players.values()) {
      if (p.id === exceptPlayerId) continue;
      p.send(msg);
    }
  }

  private playerInfoList(): CoopPlayerInfo[] {
    return [...this.players.values()].map(p => p.info);
  }

  onConnect(send: (msg: HostMessage) => void): string {
    const id = randomUUID();
    // Placeholder record until the client's HELLO arrives with their actual profile.
    this.players.set(id, {
      id,
      info: { id, name: 'Captain', outfitColor: '', hairColor: '', accentColor: '', skinId: BOAT_SKINS[0].id },
      currentVillageId: null,
      hold: [],
      send,
    });
    return id;
  }

  onDisconnect(playerId: string) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.hold.length > 0) {
      const cargo = returnCargoToStock({ hold: [], portStock: this.portStock }, player.hold);
      this.portStock = cargo.portStock;
      this.broadcast({ type: 'CARGO_PORT_STOCK', portStock: this.portStock });
    }
    this.players.delete(playerId);
    this.broadcast({ type: 'PLAYER_LEFT', playerId });
    this.persist();
  }

  onMessage(playerId: string, msg: ClientMessage) {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (msg.type) {
      case 'HELLO': {
        player.info = { id: playerId, ...msg.player };
        const snapshot: CoopSnapshot = {
          missionState: this.missionState, portStock: this.portStock, economy: this.economy,
          discovered: this.discovered, milestoneId: this.milestoneId, outposts: this.outposts,
          friendship: this.friendship.levels, hired: this.hired,
        };
        player.send({ type: 'WELCOME', selfId: playerId, players: this.playerInfoList(), snapshot });
        this.broadcast({ type: 'PLAYER_JOINED', player: player.info }, playerId);
        break;
      }

      case 'POSITION_UPDATE': {
        player.currentVillageId = msg.villageId;
        const position: CoopPlayerPosition = { playerId, villageId: msg.villageId, x: msg.x, y: msg.y, angle: msg.angle };
        this.broadcast({ type: 'PLAYER_POSITION', position }, playerId);
        break;
      }

      case 'SKIN_CHANGED': {
        player.info = { ...player.info, skinId: msg.skinId };
        this.broadcast({ type: 'PLAYER_SKIN_CHANGED', playerId, skinId: msg.skinId }, playerId);
        break;
      }

      case 'PROFILE_CHANGED': {
        player.info = { ...player.info, name: msg.name, outfitColor: msg.outfitColor, hairColor: msg.hairColor, accentColor: msg.accentColor };
        this.broadcast({
          type: 'PLAYER_PROFILE_CHANGED', playerId,
          name: msg.name, outfitColor: msg.outfitColor, hairColor: msg.hairColor, accentColor: msg.accentColor,
        }, playerId);
        break;
      }

      case 'DOCK_AT_VILLAGE': {
        player.currentVillageId = msg.villageId;
        if (!this.discovered.includes(msg.villageId)) {
          this.discovered = markDiscovered({ discovered: this.discovered }, msg.villageId).discovered;
          this.broadcast({ type: 'DISCOVERY_STATE', discovered: this.discovered });
        }
        const filledMissions = ensureBoardFilled(this.missionState, msg.villageId, this.outposts);
        if (filledMissions !== this.missionState) {
          this.missionState = filledMissions;
          this.broadcast({ type: 'MISSION_STATE', missionState: this.missionState });
        }
        const filledCargo = ensurePortStocked({ hold: [], portStock: this.portStock }, msg.villageId, this.outposts);
        if (filledCargo.portStock !== this.portStock) {
          this.portStock = filledCargo.portStock;
          this.broadcast({ type: 'CARGO_PORT_STOCK', portStock: this.portStock });
        }
        this.persist();
        break;
      }

      case 'ACCEPT_MISSION': {
        if (this.missionState.activeMission) {
          player.send({ type: 'MISSION_REJECTED', reason: 'The party already has an active mission.' });
          return;
        }
        const mission = this.missionState.availableMissions.find(m => m.id === msg.missionId);
        if (!mission) {
          player.send({ type: 'MISSION_REJECTED', reason: 'That posting is gone.' });
          return;
        }
        const accepted: Mission = { ...mission, status: 'active' };
        this.missionState = {
          ...this.missionState,
          activeMission: accepted,
          availableMissions: this.missionState.availableMissions.filter(m => m.id !== msg.missionId),
        };
        this.broadcast({ type: 'MISSION_STATE', missionState: this.missionState });
        this.persist();
        break;
      }

      case 'COMPLETE_MISSION': {
        const active = this.missionState.activeMission;
        if (!active) { player.send({ type: 'MISSION_REJECTED', reason: 'No active mission.' }); return; }
        // Delivery/race missions are village-validated; collect/survive/hunt are
        // self-reported by the client (no server-side progress tracking in v1).
        if ((active.type === 'delivery' || active.type === 'race') && active.toVillage && active.toVillage !== player.currentVillageId) {
          player.send({ type: 'MISSION_REJECTED', reason: 'Not at the delivery village yet.' });
          return;
        }
        this.missionState = {
          ...this.missionState,
          completedMissions: [...this.missionState.completedMissions, active.id],
          activeMission: null,
        };
        this.economy = { ...this.economy, coins: this.economy.coins + active.reward.coins };
        this.broadcast({ type: 'MISSION_STATE', missionState: this.missionState });
        this.broadcast({ type: 'PARTY_ECONOMY', economy: this.economy });
        this.applyFriendshipGain(active.giver, 15);
        this.persist();
        break;
      }

      case 'PICK_UP_CARGO': {
        const result = pickUpCargo({ hold: player.hold, portStock: this.portStock }, msg.villageId, msg.itemId);
        if (result.hold === player.hold) return; // no-op: hold full, or item already gone
        player.hold = result.hold;
        this.portStock = result.portStock;
        this.broadcast({ type: 'CARGO_PORT_STOCK', portStock: this.portStock });
        this.persist();
        break;
      }

      case 'DROP_OFF_CARGO': {
        const { state, payout } = dropOffCargo({ hold: player.hold, portStock: this.portStock }, msg.itemId);
        if (payout === 0) return;
        player.hold = state.hold;
        this.economy = { ...this.economy, coins: this.economy.coins + payout };
        this.broadcast({ type: 'PARTY_ECONOMY', economy: this.economy });
        this.persist();
        break;
      }

      case 'BUY_UNLOCK': {
        const key = msg.kind === 'skins' ? 'unlockedSkins' : msg.kind === 'sails' ? 'unlockedSails' : msg.kind === 'trails' ? 'unlockedTrails' : 'unlockedSpeedUpgrades';
        if (this.economy[key].includes(msg.id)) return;
        if (this.economy.coins < msg.price) {
          player.send({ type: 'MISSION_REJECTED', reason: 'Not enough coins in the party wallet.' });
          return;
        }
        this.economy = { ...this.economy, coins: this.economy.coins - msg.price, [key]: [...this.economy[key], msg.id] };
        this.broadcast({ type: 'PARTY_ECONOMY', economy: this.economy });
        this.persist();
        break;
      }

      case 'BANK_COINS': {
        if (msg.amount <= 0) return;
        this.economy = { ...this.economy, coins: this.economy.coins + msg.amount };
        this.broadcast({ type: 'PARTY_ECONOMY', economy: this.economy });
        this.persist();
        break;
      }

      case 'CHAT': {
        const text = msg.text.trim().slice(0, 240);
        if (!text) return;
        // Sent to everyone including the sender (no separate local-echo path) —
        // one broadcast is the single source of truth for what appears in the log.
        this.broadcast({ type: 'CHAT_MESSAGE', playerId, name: player.info.name, text, ts: Date.now() });
        break;
      }

      case 'CHOOSE_MILESTONE': {
        // First choice wins — idempotent no-op for any second one (in normal
        // play this can't race anyway, since the finale mission is already
        // gone from availableMissions the instant it's completed).
        if (this.milestoneId) return;
        this.milestoneId = msg.milestoneId;
        this.broadcast({ type: 'MILESTONE_CHOSEN', milestoneId: msg.milestoneId });
        this.persist();
        break;
      }

      case 'FOUND_OUTPOST': {
        const cost = outpostCost(this.outposts.length);
        if (this.economy.coins < cost) {
          player.send({ type: 'MISSION_REJECTED', reason: 'Not enough coins in the party wallet.' });
          return;
        }
        this.economy = { ...this.economy, coins: this.economy.coins - cost };
        const outpost = foundNewOutpost(getAllVillages(this.outposts));
        this.outposts = [...this.outposts, outpost];
        this.broadcast({ type: 'OUTPOSTS_STATE', outposts: this.outposts });
        this.broadcast({ type: 'PARTY_ECONOMY', economy: this.economy });
        this.persist();
        break;
      }

      case 'TALK_TO_NPC': {
        if (this.dialogueSeen.get(msg.npcId) === msg.dialogueId) return;
        this.dialogueSeen.set(msg.npcId, msg.dialogueId);
        this.applyFriendshipGain(msg.npcId, 2);
        this.persist();
        break;
      }

      case 'HIRE_CAPTAIN': {
        const home = player.currentVillageId;
        if (!home) return;
        const next = hireCaptain(
          { hired: this.hired }, msg.npcId, msg.npcName, home,
          getAllVillages(this.outposts), this.discovered,
        );
        if (!next) {
          player.send({
            type: 'MISSION_REJECTED',
            reason: this.hired.length >= 3 ? 'Already have a full crew of captains.' : 'Not enough charted routes for them yet.',
          });
          return;
        }
        this.hired = next.hired;
        this.broadcast({ type: 'AUTOMATION_STATE', hired: this.hired });
        this.persist();
        break;
      }
    }
  }

  closeNotice(): HostMessage {
    return { type: 'HOST_CLOSING' };
  }

  hasConnectedPlayers(): boolean {
    return this.players.size > 0;
  }
}
