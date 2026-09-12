import { useEffect, useRef, useState, useCallback } from 'react';
import { NetClient, NetStatus } from './NetClient';
import { CoopPlayerInfo, CoopPlayerPosition, PartyEconomyState, HostMessage } from './protocol';
import { MissionState, createMissionState } from '../game/missions';
import { CargoState, createCargoState } from '../game/cargo';
import { Village } from '../game/villages';
import { FriendshipState } from '../game/friendship';
import { HiredCaptain } from '../game/automation';

export interface CoopPlayer extends CoopPlayerInfo {
  position: CoopPlayerPosition | null;
}

export interface ChatEntry {
  id: string;
  kind: 'chat' | 'system';
  name?: string;
  text: string;
  ts: number;
}

export interface CoopSessionState {
  status: NetStatus;
  selfId: string | null;
  players: Record<string, CoopPlayer>;
  missionState: MissionState;
  portStock: CargoState['portStock'];
  economy: PartyEconomyState;
  discovered: string[];
  missionNotice: string | null;
  hostClosed: boolean;
  chatLog: ChatEntry[];
  // The party's resolved finale choice (if any) — set from the WELCOME
  // snapshot for late joiners, informational only.
  milestoneId: string | null;
  // Fires only on a *live* MILESTONE_CHOSEN broadcast, never from the WELCOME
  // snapshot — a joiner connecting after the party already resolved the
  // finale should see milestoneId set but must NOT get the popup banner
  // replayed at them out of nowhere.
  milestoneNotice: string | null;
  outposts: Village[];
  friendship: FriendshipState;
  hired: HiredCaptain[];
}

const DEFAULT_ECONOMY: PartyEconomyState = { coins: 0, unlockedSkins: ['classic'], unlockedSails: ['plain'], unlockedTrails: ['default'], unlockedSpeedUpgrades: ['standard'] };

// Keeps the on-screen log from growing without bound over a long session.
const CHAT_LOG_LIMIT = 50;

function pushChatEntry(log: ChatEntry[], entry: ChatEntry): ChatEntry[] {
  const next = [...log, entry];
  return next.length > CHAT_LOG_LIMIT ? next.slice(next.length - CHAT_LOG_LIMIT) : next;
}

export function useCoopSession(client: NetClient) {
  const [state, setState] = useState<CoopSessionState>({
    status: client.status,
    selfId: null,
    players: {},
    missionState: createMissionState(),
    portStock: createCargoState().portStock,
    economy: DEFAULT_ECONOMY,
    discovered: ['haven'],
    missionNotice: null,
    hostClosed: false,
    chatLog: [],
    milestoneId: null,
    milestoneNotice: null,
    outposts: [],
    friendship: { levels: {} },
    hired: [],
  });
  const clientRef = useRef(client);
  clientRef.current = client;

  useEffect(() => {
    const offStatus = client.onStatusChange(status => setState(s => ({ ...s, status })));

    const offMessage = client.onMessage((msg: HostMessage) => {
      setState(s => {
        switch (msg.type) {
          case 'WELCOME': {
            const players: Record<string, CoopPlayer> = {};
            for (const p of msg.players) players[p.id] = { ...p, position: null };
            return {
              ...s, selfId: msg.selfId, players,
              missionState: msg.snapshot.missionState, portStock: msg.snapshot.portStock,
              economy: msg.snapshot.economy, discovered: msg.snapshot.discovered,
              milestoneId: msg.snapshot.milestoneId, outposts: msg.snapshot.outposts,
              friendship: { levels: msg.snapshot.friendship }, hired: msg.snapshot.hired,
            };
          }
          case 'PLAYER_JOINED':
            return {
              ...s,
              players: { ...s.players, [msg.player.id]: { ...msg.player, position: null } },
              chatLog: pushChatEntry(s.chatLog, {
                id: `sys-${msg.player.id}-${Date.now()}`, kind: 'system', text: `${msg.player.name} joined the party`, ts: Date.now(),
              }),
            };
          case 'PLAYER_LEFT': {
            const players = { ...s.players };
            const leaving = players[msg.playerId];
            delete players[msg.playerId];
            return {
              ...s, players,
              chatLog: leaving
                ? pushChatEntry(s.chatLog, {
                    id: `sys-${msg.playerId}-${Date.now()}`, kind: 'system', text: `${leaving.name} left the party`, ts: Date.now(),
                  })
                : s.chatLog,
            };
          }
          case 'PLAYER_POSITION': {
            const existing = s.players[msg.position.playerId];
            if (!existing) return s;
            return { ...s, players: { ...s.players, [msg.position.playerId]: { ...existing, position: msg.position } } };
          }
          case 'PLAYER_SKIN_CHANGED': {
            const existing = s.players[msg.playerId];
            if (!existing) return s;
            return { ...s, players: { ...s.players, [msg.playerId]: { ...existing, skinId: msg.skinId } } };
          }
          case 'PLAYER_PROFILE_CHANGED': {
            const existing = s.players[msg.playerId];
            if (!existing) return s;
            return {
              ...s,
              players: {
                ...s.players,
                [msg.playerId]: { ...existing, name: msg.name, outfitColor: msg.outfitColor, hairColor: msg.hairColor, accentColor: msg.accentColor },
              },
            };
          }
          case 'MISSION_STATE':
            return { ...s, missionState: msg.missionState };
          case 'MISSION_REJECTED':
            return { ...s, missionNotice: msg.reason };
          case 'CARGO_PORT_STOCK':
            return { ...s, portStock: msg.portStock };
          case 'PARTY_ECONOMY':
            return { ...s, economy: msg.economy };
          case 'DISCOVERY_STATE':
            return { ...s, discovered: msg.discovered };
          case 'CHAT_MESSAGE':
            return {
              ...s,
              chatLog: pushChatEntry(s.chatLog, {
                id: `chat-${msg.playerId}-${msg.ts}-${Math.random().toString(36).slice(2, 7)}`,
                kind: 'chat', name: msg.name, text: msg.text, ts: msg.ts,
              }),
            };
          case 'MILESTONE_CHOSEN':
            return { ...s, milestoneId: msg.milestoneId, milestoneNotice: msg.milestoneId };
          case 'OUTPOSTS_STATE':
            return { ...s, outposts: msg.outposts };
          case 'FRIENDSHIP_STATE':
            return { ...s, friendship: { levels: msg.levels } };
          case 'AUTOMATION_STATE':
            return { ...s, hired: msg.hired };
          case 'HOST_CLOSING':
            return { ...s, hostClosed: true };
          default:
            return s;
        }
      });
    });

    return () => { offStatus(); offMessage(); };
  }, [client]);

  const clearMissionNotice = useCallback(() => setState(s => ({ ...s, missionNotice: null })), []);
  const clearMilestoneNotice = useCallback(() => setState(s => ({ ...s, milestoneNotice: null })), []);

  return { ...state, clearMissionNotice, clearMilestoneNotice };
}
