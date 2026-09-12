import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Village, getVillage } from '../game/villages';
import { ShopState } from '../game/types';
import { PlayerProfile } from '../game/profile';
import { MissionState, Mission, getMissionsForVillage, getCurrentAct, ensureBoardFilled } from '../game/missions';
import { CargoState, MAX_CARGO_HOLD, ensurePortStocked, pickUpCargo } from '../game/cargo';
import { DIALOGUES, DialogueSequence, DialogueChoice, NPC_PORTRAITS } from '../game/dialogue';
import { BOAT_SKINS } from '../game/shopData';
import { BoatSkin } from '../game/types';
import { generateVillageLayout, VillageLayout } from '../game/villageLayout';
import { FriendshipState, getFriendshipLevel, getFriendshipTier, getFriendshipProgress } from '../game/friendship';
import DialogueBox from './DialogueBox';
import { sfxButtonClick, sfxMissionAccept, sfxMissionComplete, sfxCargoPickup, sfxCargoDeliver } from '../game/sfx';
import { FacingDir } from '../net/directionAngle';

// A co-op party member currently walking the same village, for rendering only
// — this component never mutates or validates anything about other players.
export interface OtherPlayer {
  id: string;
  name: string;
  outfitColor: string;
  hairColor: string;
  accentColor: string;
  x: number;
  y: number;
  dir: FacingDir;
}

interface Props {
  village: Village;
  shop: ShopState;
  missionState: MissionState;
  profile: PlayerProfile;
  cargo: CargoState;
  onSetSail: (mission?: Mission) => void;
  onShop: () => void;
  onMissionUpdate: (state: MissionState) => void;
  onCargoUpdate: (state: CargoState) => void;
  onDeliverCargo: (itemId: string) => void;
  isFirstVisit: boolean;
  onFirstVisitDone: () => void;
  onMilestone: (milestoneId: string) => void;
  onOpenChart?: () => void;
  // Founded outposts (see outposts.ts) — needed so a village's own filler
  // missions/cargo can target them as destinations, and so an outpost's own
  // board/goods post can resolve itself at all (it isn't in the base VILLAGES
  // array missions.ts/cargo.ts search by default).
  outposts?: Village[];
  // Friendship/automation — the scene only reports intents (who was talked
  // to, who to hire), it never mutates this state itself, same pattern as
  // missions/cargo/outposts.
  friendship?: FriendshipState;
  hiredNpcIds?: Set<string>;
  onTalkedToNpc?: (npcId: string, dialogueId: string) => void;
  onHireCaptain?: (npcId: string, npcName: string) => void;
  paused?: boolean;
  otherPlayers?: OtherPlayer[];
  onPositionUpdate?: (x: number, y: number, dir: FacingDir) => void;
}

// Picks the most story-advanced dialogue an NPC currently has to offer.
function pickNpcDialogue(npcId: string, act: number): DialogueSequence | null {
  if (act >= 3 && DIALOGUES[`${npcId}_later2`]) return DIALOGUES[`${npcId}_later2`];
  if (act >= 2 && DIALOGUES[`${npcId}_later`]) return DIALOGUES[`${npcId}_later`];
  return DIALOGUES[`${npcId}_first`] || null;
}

// World size (canvas native pixels — pixel art scale). Bigger than the
// original 480x300 to give procedurally generated villages (see
// villageLayout.ts, which hardcodes this same 720x450) room for more
// buildings without feeling cramped.
const W = 720;
const H = 450;
const PLAYER_SPEED = 85;
const INTERACT_RANGE = 26;

type Kind = 'npc' | 'board' | 'shop' | 'dock' | 'cargo' | 'chart';
interface Nearby { kind: Kind; id?: string; label: string; x: number; y: number; }

function px(v: number) { return Math.round(v); }

// Pixel-font label with a dark outline so it reads clearly over any background
function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center') {
  ctx.font = `${size}px "Press Start 2P"`;
  ctx.textAlign = align;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(5,8,10,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

const VillageWalkScene: React.FC<Props> = ({
  village, shop, missionState, profile, cargo, onSetSail, onShop, onMissionUpdate, onCargoUpdate, onDeliverCargo, isFirstVisit, onFirstVisitDone, onMilestone, onOpenChart,
  outposts = [], friendship, hiredNpcIds, onTalkedToNpc, onHireCaptain, paused, otherPlayers, onPositionUpdate,
}) => {
  const currentAct = getCurrentAct(missionState);
  const boatSkin = BOAT_SKINS.find(s => s.id === shop.selectedSkin) || BOAT_SKINS[0];
  // Deterministic per village.id — same layout every render/session/co-op
  // client, no need to recompute unless the village itself changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => generateVillageLayout(village), [village.id]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({
    x: layout.spawnPos.x,
    y: layout.spawnPos.y,
    dir: 'up' as 'up' | 'down' | 'left' | 'right',
    moving: false,
    animT: 0,
  });
  const inputRef = useRef({ up: false, down: false, left: false, right: false });
  const timeRef = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef<number>(0);
  const nearbyRef = useRef<Nearby | null>(null);
  const lastPositionSentRef = useRef(0);

  const [nearby, setNearby] = useState<Nearby | null>(null);
  const [dialogue, setDialogue] = useState<DialogueSequence | null>(
    isFirstVisit && village.id === 'haven' ? DIALOGUES['intro'] : null
  );
  const [pendingMissionNpc, setPendingMissionNpc] = useState<string | null>(null);
  const [pendingHireNpc, setPendingHireNpc] = useState<string | null>(null);
  const [showMissionBoard, setShowMissionBoard] = useState(false);
  const [showCargoPost, setShowCargoPost] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [talkedTo, setTalkedTo] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('deadwake_talked');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const villageNpcs = village.npcs.filter(id => layout.npcPositions[id] && NPC_PORTRAITS[id]);
  const availableMissions = getMissionsForVillage(missionState, village.id);
  const isDeliveryDestination =
    (missionState.activeMission?.type === 'delivery' || missionState.activeMission?.type === 'race') &&
    missionState.activeMission?.toVillage === village.id;

  // Compute interactables
  const getInteractables = useCallback((): Nearby[] => {
    const list: Nearby[] = [];
    for (const id of villageNpcs) {
      const pos = layout.npcPositions[id];
      const info = NPC_PORTRAITS[id];
      list.push({ kind: 'npc', id, label: info.name, x: pos.x, y: pos.y });
    }
    list.push({ kind: 'board', label: 'Mission Board', x: layout.boardPos.x, y: layout.boardPos.y });
    if (layout.shopPos) {
      list.push({ kind: 'shop', label: "Mara's Workshop", x: layout.shopPos.x, y: layout.shopPos.y });
    }
    list.push({ kind: 'cargo', label: 'Goods Post', x: layout.cargoPos.x, y: layout.cargoPos.y });
    if (layout.chartPos && onOpenChart) {
      list.push({ kind: 'chart', label: 'Chart Table', x: layout.chartPos.x, y: layout.chartPos.y });
    }
    list.push({ kind: 'dock', label: 'Set Sail', x: layout.dockPos.x, y: layout.dockPos.y });
    return list;
  }, [villageNpcs, layout, onOpenChart]);

  // Handle interact
  const handleInteract = useCallback((n: Nearby) => {
    if (dialogue || pendingMissionNpc || pendingHireNpc || showMissionBoard || showCargoPost || showLeaveConfirm || paused) return;
    sfxButtonClick();
    if (n.kind === 'npc' && n.id) {
      const seq = pickNpcDialogue(n.id, currentAct);
      if (seq) { setDialogue(seq); onTalkedToNpc?.(n.id, seq.id); }
      const next = new Set(talkedTo);
      next.add(n.id);
      setTalkedTo(next);
      localStorage.setItem('deadwake_talked', JSON.stringify([...next]));
      // If this NPC has a mission and none is active, queue mission offer after dialogue
      const hasMission = availableMissions.some(m => m.giver === n.id) && !missionState.activeMission;
      if (hasMission) {
        setPendingMissionNpc(n.id);
      } else if (
        onHireCaptain && friendship && !hiredNpcIds?.has(n.id) &&
        getFriendshipTier(getFriendshipLevel(friendship, n.id)).hireable
      ) {
        // Mutually exclusive with a mission offer so only one modal ever
        // queues from a single interaction.
        setPendingHireNpc(n.id);
      }
    } else if (n.kind === 'board') {
      const filled = ensureBoardFilled(missionState, village.id, outposts);
      if (filled !== missionState) onMissionUpdate(filled);
      setShowMissionBoard(true);
    } else if (n.kind === 'cargo') {
      const stocked = ensurePortStocked(cargo, village.id, outposts);
      if (stocked !== cargo) onCargoUpdate(stocked);
      setShowCargoPost(true);
    } else if (n.kind === 'shop') {
      onShop();
    } else if (n.kind === 'chart') {
      onOpenChart?.();
    } else if (n.kind === 'dock') {
      setShowLeaveConfirm(true);
    }
  }, [dialogue, pendingMissionNpc, pendingHireNpc, showMissionBoard, showCargoPost, showLeaveConfirm, paused, talkedTo, availableMissions, missionState, cargo, onShop, onOpenChart, onMissionUpdate, onCargoUpdate, village.id, outposts, currentAct, onTalkedToNpc, onHireCaptain, friendship, hiredNpcIds]);

  const handlePickUpCargo = useCallback((itemId: string) => {
    sfxCargoPickup();
    onCargoUpdate(pickUpCargo(cargo, village.id, itemId));
  }, [cargo, village.id, onCargoUpdate]);

  const handleDropOffCargo = useCallback((itemId: string) => {
    sfxCargoDeliver();
    onDeliverCargo(itemId);
  }, [onDeliverCargo]);

  // Branching dialogue choice (currently used for the Ashenreach finale)
  const handleDialogueChoice = useCallback((choice: DialogueChoice) => {
    if (choice.action?.startsWith('ending_')) {
      setDialogue(null);
      onMilestone(choice.action);
      return;
    }
    if (choice.nextId && DIALOGUES[choice.nextId]) {
      setDialogue(DIALOGUES[choice.nextId]);
      return;
    }
    setDialogue(null);
  }, [onMilestone]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const interactables = getInteractables();

    const loop = (ts: number) => {
      const dt = Math.min((ts - (lastTsRef.current || ts)) / 1000, 0.05);
      lastTsRef.current = ts;
      timeRef.current += dt;

      const p = playerRef.current;
      const anyModal = !!dialogue || !!pendingMissionNpc || !!pendingHireNpc || showMissionBoard || showCargoPost || showLeaveConfirm || !!paused;

      // Movement
      let dx = 0, dy = 0;
      if (!anyModal) {
        if (inputRef.current.up) dy -= 1;
        if (inputRef.current.down) dy += 1;
        if (inputRef.current.left) dx -= 1;
        if (inputRef.current.right) dx += 1;
      }
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 0) {
        dx /= mag; dy /= mag;
        p.x += dx * PLAYER_SPEED * dt;
        p.y += dy * PLAYER_SPEED * dt;
        p.animT += dt * 8;
        p.moving = true;
        if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? 'right' : 'left';
        else p.dir = dy > 0 ? 'down' : 'up';
      } else {
        p.moving = false;
      }
      // Clamp to walkable area
      p.x = Math.max(30, Math.min(W - 30, p.x));
      p.y = Math.max(90, Math.min(H - 12, p.y));

      // Nearest interactable
      let closest: Nearby | null = null;
      let closestDist = INTERACT_RANGE;
      for (const it of interactables) {
        const d = Math.sqrt((it.x - p.x) ** 2 + (it.y - p.y) ** 2);
        if (d < closestDist) { closest = it; closestDist = d; }
      }
      if (closest?.label !== nearbyRef.current?.label) {
        nearbyRef.current = closest;
        setNearby(closest);
      }

      renderScene(ctx, village, layout, p, interactables, timeRef.current, talkedTo, missionState.activeMission?.giver || null, profile, boatSkin, otherPlayers, friendship, hiredNpcIds);

      // Throttled position broadcast for co-op — harmless no-op in solo play (prop absent).
      if (onPositionUpdate && timeRef.current - lastPositionSentRef.current > 0.06) {
        lastPositionSentRef.current = timeRef.current;
        onPositionUpdate(p.x, p.y, p.dir);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [village, layout, dialogue, pendingMissionNpc, pendingHireNpc, showMissionBoard, showCargoPost, showLeaveConfirm, paused, talkedTo, missionState.activeMission, getInteractables, profile, boatSkin, otherPlayers, onPositionUpdate, friendship, hiredNpcIds]);

  // Keyboard input
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') inputRef.current.up = true;
      if (k === 's' || k === 'arrowdown') inputRef.current.down = true;
      if (k === 'a' || k === 'arrowleft') inputRef.current.left = true;
      if (k === 'd' || k === 'arrowright') inputRef.current.right = true;
      if ((k === 'e' || k === ' ') && nearbyRef.current && !paused) {
        e.preventDefault();
        handleInteract(nearbyRef.current);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') inputRef.current.up = false;
      if (k === 's' || k === 'arrowdown') inputRef.current.down = false;
      if (k === 'a' || k === 'arrowleft') inputRef.current.left = false;
      if (k === 'd' || k === 'arrowright') inputRef.current.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [handleInteract, paused]);

  // Dialogue complete
  const onDialogueDone = () => {
    if (isFirstVisit && village.id === 'haven') onFirstVisitDone();
    setDialogue(null);
    // After a moment, offer mission if pending
    if (pendingMissionNpc) {
      // small delay so it feels sequential
      setTimeout(() => {}, 0);
    }
  };

  const acceptMission = (mission: Mission) => {
    sfxMissionAccept();
    onMissionUpdate({
      ...missionState,
      activeMission: { ...mission, status: 'active' },
      availableMissions: missionState.availableMissions.filter(m => m.id !== mission.id),
    });
    setPendingMissionNpc(null);
    setShowMissionBoard(false);
  };

  const deliverCargo = () => {
    if (!missionState.activeMission) return;
    sfxMissionComplete();
    const m = missionState.activeMission;
    if (m.onCompleteDialogue && DIALOGUES[m.onCompleteDialogue]) {
      setDialogue(DIALOGUES[m.onCompleteDialogue]);
    }
    onMissionUpdate({
      ...missionState,
      completedMissions: [...missionState.completedMissions, m.id],
      activeMission: null,
    });
  };

  const pendingMission = pendingMissionNpc
    ? availableMissions.find(m => m.giver === pendingMissionNpc) || null
    : null;
  const pendingHireInfo = pendingHireNpc ? NPC_PORTRAITS[pendingHireNpc] : null;

  // Whoever is speaking in the open dialogue, for the friendship meter — most
  // sequences use one consistent speaker throughout; narrator/letter
  // sequences (the Haven intro) have no real NPC_PORTRAITS entry, so the
  // meter naturally stays hidden for those.
  const talkingNpcId = dialogue?.lines[0]?.speaker;
  const talkingNpcProgress = friendship && talkingNpcId && NPC_PORTRAITS[talkingNpcId]
    ? getFriendshipProgress(friendship, talkingNpcId)
    : undefined;

  const confirmHire = () => {
    if (!pendingHireNpc || !pendingHireInfo || !onHireCaptain) return;
    sfxButtonClick();
    onHireCaptain(pendingHireNpc, pendingHireInfo.name);
    setPendingHireNpc(null);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background">
      <div className="absolute inset-0 scanlines opacity-10 pointer-events-none" />

      {/* Top HUD: village name, coins, active mission */}
      <div className="absolute top-3 left-0 right-0 z-20 flex items-center justify-between px-4">
        <div className="pixel-border bg-card/90 px-3 py-2">
          <div className="font-display text-[9px] text-muted-foreground">YOU ARE IN</div>
          <div className="font-display text-[11px] text-primary">{village.name.toUpperCase()}</div>
          <div className="font-body text-sm text-muted-foreground mt-0.5">Captain {profile.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="pixel-border bg-card/90 px-3 py-2">
            <span className="font-display text-[9px] text-accent">ACT {currentAct}</span>
          </div>
          {cargo.hold.length > 0 && (
            <div className="pixel-border bg-card/90 px-3 py-2">
              <span className="font-display text-[9px] text-primary">HOLD {cargo.hold.length}/{MAX_CARGO_HOLD}</span>
            </div>
          )}
          <div className="pixel-border bg-card/90 px-3 py-2 flex items-center gap-2">
            <span className="text-accent gold-glow">◆</span>
            <span className="font-body text-base text-foreground">{shop.coins}</span>
          </div>
        </div>
      </div>

      {missionState.activeMission && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pixel-border bg-card/90 px-3 py-1.5 max-w-[280px]">
          <div className="font-display text-[9px] text-primary">ACTIVE MISSION</div>
          <div className="font-body text-sm text-foreground truncate">{missionState.activeMission.title}</div>
        </div>
      )}

      {isDeliveryDestination && (
        <button
          onClick={deliverCargo}
          className="absolute top-32 left-1/2 -translate-x-1/2 z-20 pixel-border bg-primary text-primary-foreground px-4 py-2 font-display text-[11px] hover:bg-primary/80 animate-fade-in pixel-btn"
        >
          {missionState.activeMission?.type === 'race' ? 'CLAIM RACE REWARD' : 'DELIVER CARGO'} (+{missionState.activeMission?.reward.coins} ◆)
        </button>
      )}

      {/* Canvas viewport */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="pixel-border"
          style={{
            imageRendering: 'pixelated',
            width: 'min(96vw, 900px)',
            height: 'auto',
            aspectRatio: `${W} / ${H}`,
            background: 'hsl(210, 30%, 6%)',
          }}
        />

        {/* Interact prompt */}
        {nearby && !dialogue && !pendingMissionNpc && !pendingHireNpc && !showMissionBoard && !showCargoPost && !showLeaveConfirm && (
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 pixel-border bg-card/95 px-4 py-2 whitespace-nowrap pointer-events-none animate-fade-in">
            <span className="font-display text-[10px] text-primary">[E]</span>
            <span className="font-body text-base text-foreground ml-2">
              {nearby.kind === 'npc' ? `Talk to ${nearby.label}` :
               nearby.kind === 'board' ? 'Read Mission Board' :
               nearby.kind === 'cargo' ? 'Visit Goods Post' :
               nearby.kind === 'shop' ? 'Enter Workshop' :
               nearby.kind === 'chart' ? 'Chart New Waters' :
               'Return to Boat'}
              {nearby.kind === 'npc' && nearby.id && !talkedTo.has(nearby.id) && (
                <span className="ml-2 text-primary text-sm">[NEW]</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-16 font-body text-sm text-muted-foreground text-center px-4">
        Move: WASD / Arrows &nbsp;·&nbsp; Interact: E / Space
      </div>

      {/* Touch dpad (mobile) */}
      <TouchDpad inputRef={inputRef} onInteract={() => nearbyRef.current && handleInteract(nearbyRef.current)} canInteract={!!nearby} />

      {/* Dialogue */}
      {dialogue && (
        <DialogueBox
          sequence={dialogue}
          onComplete={onDialogueDone}
          onChoice={handleDialogueChoice}
          profile={profile}
          villageName={village.name}
          friendshipProgress={talkingNpcProgress}
        />
      )}

      {/* Mission offer from NPC after dialogue */}
      {!dialogue && pendingMission && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/70 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-sm w-full">
            <div className="font-display text-[10px] text-primary mb-2">MISSION OFFERED</div>
            <div className="font-display text-xs text-foreground mb-2">{pendingMission.title}</div>
            <p className="font-body text-base text-foreground/90 mb-3">{pendingMission.description}</p>
            <div className="font-body text-base text-accent mb-4">Reward: {pendingMission.reward.coins} ◆</div>
            <div className="flex gap-2">
              <button
                onClick={() => acceptMission(pendingMission)}
                className="flex-1 py-2 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80"
              >ACCEPT</button>
              <button
                onClick={() => { sfxButtonClick(); setPendingMissionNpc(null); }}
                className="flex-1 py-2 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn border border-border hover:bg-secondary/80"
              >LATER</button>
            </div>
          </div>
        </div>
      )}

      {/* Hire-as-captain offer, once an NPC is Trusted — mutually exclusive
          with a mission offer from the same interaction */}
      {!dialogue && pendingHireInfo && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/70 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-sm w-full">
            <div className="font-display text-[10px] text-primary mb-2">HIRE AS CAPTAIN?</div>
            <div className="font-display text-xs text-foreground mb-2">{pendingHireInfo.name}</div>
            <p className="font-body text-base text-foreground/90 mb-4">
              {pendingHireInfo.name} trusts you enough now to run a trade route on the party's behalf —
              quietly earning coins while you keep sailing.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmHire}
                className="flex-1 py-2 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80"
              >HIRE</button>
              <button
                onClick={() => { sfxButtonClick(); setPendingHireNpc(null); }}
                className="flex-1 py-2 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn border border-border hover:bg-secondary/80"
              >NOT YET</button>
            </div>
          </div>
        </div>
      )}

      {/* Mission board modal */}
      {showMissionBoard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/80 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-xs text-primary">MISSION BOARD</div>
              <button onClick={() => { sfxButtonClick(); setShowMissionBoard(false); }} className="font-display text-[10px] text-muted-foreground hover:text-foreground">[X]</button>
            </div>
            {missionState.activeMission && (
              <div className="mb-3 p-3 pixel-border bg-primary/10">
                <div className="font-display text-[9px] text-primary mb-1">ACTIVE</div>
                <div className="font-display text-[10px] text-foreground">{missionState.activeMission.title}</div>
                <p className="font-body text-sm text-muted-foreground mt-1">{missionState.activeMission.description}</p>
              </div>
            )}
            {availableMissions.length === 0 ? (
              <div className="text-center py-6 font-body text-base text-muted-foreground">
                No new postings here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {availableMissions.map(m => (
                  <button
                    key={m.id}
                    disabled={!!missionState.activeMission}
                    onClick={() => acceptMission(m)}
                    className="text-left p-3 pixel-border bg-card/60 hover:bg-card/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="font-display text-[10px] text-foreground">{m.title}</div>
                    <p className="font-body text-sm text-muted-foreground mt-1">{m.description}</p>
                    <div className="font-body text-sm text-accent mt-1">Reward: {m.reward.coins} ◆ · from {NPC_PORTRAITS[m.giver]?.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goods post: pick up trade goods here, deliver ones bound for this village */}
      {showCargoPost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/80 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-xs text-primary">GOODS POST</div>
              <button onClick={() => { sfxButtonClick(); setShowCargoPost(false); }} className="font-display text-[10px] text-muted-foreground hover:text-foreground">[X]</button>
            </div>

            <div className="font-display text-[9px] text-muted-foreground mb-2">IN YOUR HOLD ({cargo.hold.length}/{MAX_CARGO_HOLD})</div>
            {cargo.hold.length === 0 ? (
              <div className="text-center py-3 font-body text-sm text-muted-foreground mb-3">
                Nothing aboard.
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {cargo.hold.map(item => {
                  const deliverable = item.toVillage === village.id;
                  const destName = getVillage(item.toVillage, outposts)?.name || item.toVillage;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 pixel-border bg-card/60">
                      <div>
                        <div className="font-display text-[10px] text-foreground">{item.name}</div>
                        <div className="font-body text-sm text-muted-foreground mt-0.5">
                          {deliverable ? `Bound for here` : `Bound for ${destName}`}
                        </div>
                      </div>
                      {deliverable ? (
                        <button
                          onClick={() => handleDropOffCargo(item.id)}
                          className="px-3 py-2 bg-primary text-primary-foreground font-display text-[9px] pixel-btn hover:bg-primary/80 shrink-0"
                        >
                          DELIVER +{item.payout} ◆
                        </button>
                      ) : (
                        <span className="font-body text-sm text-muted-foreground/60 shrink-0">at sea risk: {item.fine} ◆</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="font-display text-[9px] text-muted-foreground mb-2">AVAILABLE HERE</div>
            {(cargo.portStock[village.id] || []).length === 0 ? (
              <div className="text-center py-3 font-body text-sm text-muted-foreground">
                Nothing to pick up right now.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(cargo.portStock[village.id] || []).map(item => {
                  const destName = getVillage(item.toVillage, outposts)?.name || item.toVillage;
                  const holdFull = cargo.hold.length >= MAX_CARGO_HOLD;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 pixel-border bg-card/60">
                      <div>
                        <div className="font-display text-[10px] text-foreground">{item.name}</div>
                        <div className="font-body text-sm text-muted-foreground mt-0.5">
                          To {destName} · pays {item.payout} ◆ · fined {item.fine} ◆ if lost at sea
                        </div>
                      </div>
                      <button
                        onClick={() => handlePickUpCargo(item.id)}
                        disabled={holdFull}
                        className="px-3 py-2 bg-secondary text-secondary-foreground font-display text-[9px] pixel-btn border border-border hover:bg-secondary/80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        PICK UP
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave confirmation */}
      {showLeaveConfirm && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/80 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-sm w-full">
            <div className="font-display text-xs text-primary mb-3">SET SAIL?</div>
            <p className="font-body text-base text-foreground/90 mb-4">
              {missionState.activeMission
                ? `Sail toward ${missionState.activeMission.target?.label || 'the sea'}?`
                : 'Head out into open water?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { sfxButtonClick(); setShowLeaveConfirm(false); onSetSail(missionState.activeMission || undefined); }}
                className="flex-1 py-2 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80"
              >SET SAIL</button>
              <button
                onClick={() => { sfxButtonClick(); setShowLeaveConfirm(false); }}
                className="flex-1 py-2 bg-secondary text-secondary-foreground font-display text-[10px] pixel-btn border border-border hover:bg-secondary/80"
              >STAY</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Touch controls ============
const TouchDpad: React.FC<{
  inputRef: React.MutableRefObject<{ up: boolean; down: boolean; left: boolean; right: boolean }>;
  onInteract: () => void;
  canInteract: boolean;
}> = ({ inputRef, onInteract, canInteract }) => {
  const set = (k: 'up' | 'down' | 'left' | 'right', v: boolean) => { inputRef.current[k] = v; };
  const btn = "w-12 h-12 pixel-border bg-card/80 active:bg-primary/40 font-display text-primary text-sm flex items-center justify-center select-none touch-none";
  return (
    <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-between items-end px-4 md:hidden pointer-events-none">
      <div className="pointer-events-auto grid grid-cols-3 gap-1 w-40">
        <div />
        <button className={btn} onPointerDown={() => set('up', true)} onPointerUp={() => set('up', false)} onPointerLeave={() => set('up', false)}>▲</button>
        <div />
        <button className={btn} onPointerDown={() => set('left', true)} onPointerUp={() => set('left', false)} onPointerLeave={() => set('left', false)}>◀</button>
        <div />
        <button className={btn} onPointerDown={() => set('right', true)} onPointerUp={() => set('right', false)} onPointerLeave={() => set('right', false)}>▶</button>
        <div />
        <button className={btn} onPointerDown={() => set('down', true)} onPointerUp={() => set('down', false)} onPointerLeave={() => set('down', false)}>▼</button>
        <div />
      </div>
      <div className="pointer-events-auto">
        <button
          onPointerDown={onInteract}
          disabled={!canInteract}
          className="w-16 h-16 pixel-border bg-primary/80 disabled:bg-card/40 disabled:text-muted-foreground/40 text-primary-foreground font-display text-[10px] active:bg-primary select-none touch-none"
        >E</button>
      </div>
    </div>
  );
};

// ============ RENDERING ============
function renderScene(
  ctx: CanvasRenderingContext2D,
  village: Village,
  layout: VillageLayout,
  player: { x: number; y: number; dir: string; moving: boolean; animT: number },
  interactables: Nearby[],
  time: number,
  talkedTo: Set<string>,
  activeGiverId: string | null,
  profile: PlayerProfile,
  boatSkin: BoatSkin,
  otherPlayers?: OtherPlayer[],
  friendship?: FriendshipState,
  hiredNpcIds?: Set<string>,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  const vibe = village.vibe;

  // Background sky/hills — tinted per vibe
  const skyBg: Record<typeof vibe, string> = {
    home: 'hsl(210, 25%, 8%)', fishing: 'hsl(200, 30%, 9%)', trade: 'hsl(35, 15%, 9%)',
    foggy: 'hsl(230, 15%, 10%)', forbidden: 'hsl(10, 20%, 7%)',
  };
  ctx.fillStyle = skyBg[vibe];
  ctx.fillRect(0, 0, W, H);

  // Distant hills
  ctx.fillStyle = vibe === 'forbidden' ? 'hsl(10, 18%, 10%)' : 'hsl(210, 20%, 11%)';
  for (let i = 0; i < 6; i++) {
    const bx = i * 135;
    ctx.fillRect(bx, 45, 90, 45);
    ctx.fillRect(bx + 15, 30, 60, 30);
  }

  // Ground path/dirt — ashen for Ashenreach, otherwise warm dirt
  const groundHue = vibe === 'forbidden' ? 'hsl(10, 10%, 12%)' : 'hsl(30, 12%, 14%)';
  ctx.fillStyle = groundHue;
  ctx.fillRect(0, 90, W, H - 135);

  // Path lines (dirt texture)
  ctx.fillStyle = vibe === 'forbidden' ? 'hsl(10, 12%, 15%)' : 'hsl(30, 15%, 17%)';
  ctx.fillRect(W / 2 - 30, 90, 60, H - 135);
  ctx.fillRect(90, 255, W - 180, 30);

  // Cobble specks
  ctx.fillStyle = vibe === 'forbidden' ? 'hsl(10, 20%, 10%)' : 'hsl(30, 10%, 20%)';
  for (let i = 0; i < 60; i++) {
    const sx = (i * 47) % W;
    const sy = 98 + ((i * 31) % (H - 150));
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Water at bottom
  const waterY = H - 45;
  ctx.fillStyle = 'hsl(210, 40%, 8%)';
  ctx.fillRect(0, waterY, W, 45);
  // water shimmer
  ctx.fillStyle = 'hsl(200, 30%, 18%)';
  for (let i = 0; i < 28; i++) {
    const wx = (i * 27 + Math.floor(time * 12)) % W;
    ctx.fillRect(wx, waterY + 6 + (i % 3) * 6, 9, 1);
  }

  // Dock
  ctx.fillStyle = 'hsl(25, 20%, 15%)';
  ctx.fillRect(W / 2 - 36, waterY - 6, 72, 36);
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  for (let i = 0; i < 5; i++) ctx.fillRect(W / 2 - 33 + i * 17, waterY - 6, 3, 36);

  // Boat moored to dock (right of it) — the player's own ship, matching their chosen skin
  drawBoat(ctx, W / 2 + 51, waterY + 9, time, boatSkin.hullColor, boatSkin.mastColor, boatSkin.sailColor);
  // A second, weathered boat for the fishing village — not the player's, so it keeps its own generic look
  if (vibe === 'fishing') drawBoat(ctx, W / 2 - 60, waterY + 12, time * 0.8 + 2);

  // Buildings — count, size, and position come from the per-village generated
  // layout (villageLayout.ts), not fixed literals; only the paint job (color,
  // vibe-tinted windows) is shared across every building in a village.
  for (const b of layout.buildings) {
    drawBuilding(ctx, b.x, b.y, b.w, b.h, village.color, time, vibe);
  }
  if (layout.shopPos) {
    drawSign(ctx, layout.shopPos.x, layout.shopPos.y, 'SHOP', 'hsl(40, 60%, 45%)');
  }
  if (village.hasShop) {
    // Flower boxes in front of the first couple buildings — Haven is home, kept warm and tended
    for (const b of layout.buildings.slice(0, 2)) {
      drawFlowerBox(ctx, b.x + b.w * 0.3, b.y + b.h + 6);
    }
  }

  // Goods post — every village has one, a stack of trade crates under a sign
  drawSign(ctx, layout.cargoPos.x, layout.cargoPos.y - 14, 'GOODS', 'hsl(30, 40%, 40%)');
  drawCrate(ctx, layout.cargoPos.x - 8, layout.cargoPos.y + 4);
  drawCrate(ctx, layout.cargoPos.x + 8, layout.cargoPos.y + 6);

  // Chart table — Haven only, where new outposts are founded
  if (layout.chartPos) {
    drawChartTable(ctx, layout.chartPos.x, layout.chartPos.y);
  }

  // Vibe-specific decoration and the atmosphere pines — deliberately kept at
  // fixed margin positions (not randomized) so they can never overlap the
  // procedurally placed buildings/anchors above, which are bounds-constrained
  // to stay clear of these same margins.
  if (vibe === 'fishing') {
    drawDryingRack(ctx, 60, 320);
    drawDryingRack(ctx, W - 60, 320);
  } else if (vibe === 'trade') {
    drawMarketStall(ctx, W - 60, 300);
    drawCrate(ctx, W - 60, 335);
  } else if (vibe === 'foggy') {
    drawBellTower(ctx, W / 2, 55, time);
  } else if (vibe === 'forbidden') {
    drawDeadTree(ctx, 40, 150);
    drawDeadTree(ctx, W - 40, 150);
  } else {
    // Haven / default atmosphere pines
    drawTree(ctx, 40, 140);
    drawTree(ctx, W - 40, 140);
  }
  drawTree(ctx, 30, 240);
  drawTree(ctx, W - 30, 240);

  // Mission board
  drawMissionBoard(ctx, layout.boardPos.x, layout.boardPos.y, time);

  // Ambient vibe effects (fog banks, falling ash, gulls, dust)
  drawAmbience(ctx, vibe, time);

  // NPCs
  for (const it of interactables) {
    if (it.kind !== 'npc' || !it.id) continue;
    const info = NPC_PORTRAITS[it.id];
    drawPerson(ctx, it.x, it.y, info.color, 'down', false, time + it.x * 0.1);
    // Name label
    drawLabel(ctx, info.name.toUpperCase(), it.x, it.y - 18, 7, 'hsla(0,0%,96%,0.95)');
    // Indicators
    const hireable = friendship && getFriendshipTier(getFriendshipLevel(friendship, it.id)).hireable && !hiredNpcIds?.has(it.id);
    if (!talkedTo.has(it.id)) {
      // "!" bouncing
      const by = -25 + Math.sin(time * 4 + it.x) * 2;
      ctx.fillStyle = 'hsl(180, 60%, 55%)';
      ctx.fillRect(it.x - 1, it.y + by, 2, 5);
      ctx.fillRect(it.x - 1, it.y + by + 7, 2, 2);
    } else if (activeGiverId === it.id) {
      // Return indicator "?"
      drawLabel(ctx, '?', it.x, it.y - 24, 9, 'hsl(40, 90%, 62%)');
    } else if (hireable) {
      // A small pulsing heart marks an NPC trusted enough to hire.
      const pulse = 0.7 + Math.sin(time * 3) * 0.3;
      ctx.fillStyle = `hsla(340, 70%, 62%, ${pulse})`;
      ctx.fillRect(it.x - 2, it.y - 25, 1, 2);
      ctx.fillRect(it.x + 1, it.y - 25, 1, 2);
      ctx.fillRect(it.x - 3, it.y - 24, 6, 2);
      ctx.fillRect(it.x - 2, it.y - 22, 4, 2);
      ctx.fillRect(it.x - 1, it.y - 20, 2, 1);
    }
  }

  // Other co-op players sharing this village (rendered with their own real colors, no
  // special-casing needed since drawPerson already takes every color as a param)
  if (otherPlayers) {
    for (const peer of otherPlayers) {
      drawPerson(ctx, peer.x, peer.y, peer.outfitColor, peer.dir, false, time, peer.hairColor, peer.accentColor);
      drawLabel(ctx, peer.name.toUpperCase(), peer.x, peer.y - 18, 6, 'hsla(180,45%,70%,0.9)');
    }
  }

  // Player
  drawPerson(ctx, player.x, player.y, profile.outfitColor, player.dir, player.moving && Math.floor(player.animT) % 2 === 0, time, profile.hairColor, profile.accentColor);

  // Vignette / fog overlay — thicker and cooler in Mistford, ember-tinted in Ashenreach
  const vignetteBase = vibe === 'foggy' ? 0.55 : vibe === 'forbidden' ? 0.45 : 0.4;
  const vignetteColor = vibe === 'forbidden' ? '20,8,5' : '5,10,15';
  const fogAlpha = 0.15 + Math.sin(time * 0.4) * 0.03;
  const grad = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(${vignetteColor},${fogAlpha + vignetteBase})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

function drawPerson(
  ctx: CanvasRenderingContext2D, x: number, y: number, color: string, dir: string, altStep: boolean, time: number,
  hairColor: string = 'hsl(25, 20%, 20%)', accentColor?: string,
) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(px(x - 5), px(y + 6), 10, 2);
  // Legs
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  const legOff = altStep ? 1 : 0;
  ctx.fillRect(px(x - 3), px(y + 3 - legOff), 2, 4);
  ctx.fillRect(px(x + 1), px(y + 3 + legOff), 2, 4);
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(px(x - 4), px(y - 4), 8, 8);
  // Belt / trim accent
  if (accentColor) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(px(x - 4), px(y), 8, 1);
  }
  // Head
  ctx.fillStyle = 'hsl(25, 25%, 55%)';
  ctx.fillRect(px(x - 3), px(y - 11), 6, 6);
  // Hair
  ctx.fillStyle = hairColor;
  ctx.fillRect(px(x - 3), px(y - 12), 6, 2);
  // Eye direction
  ctx.fillStyle = 'hsl(0, 0%, 10%)';
  if (dir === 'up') {
    // no eyes visible (facing back)
    ctx.fillStyle = hairColor;
    ctx.fillRect(px(x - 3), px(y - 10), 6, 2);
  } else if (dir === 'down') {
    ctx.fillRect(px(x - 2), px(y - 8), 1, 1);
    ctx.fillRect(px(x + 1), px(y - 8), 1, 1);
  } else if (dir === 'left') {
    ctx.fillRect(px(x - 2), px(y - 8), 1, 1);
  } else if (dir === 'right') {
    ctx.fillRect(px(x + 1), px(y - 8), 1, 1);
  }
}

const VIBE_WINDOW: Record<Village['vibe'], string> = {
  home: '40, 65%, 55%',
  fishing: '195, 50%, 52%',
  trade: '38, 70%, 58%',
  foggy: '210, 30%, 62%',
  forbidden: '8, 75%, 48%',
};

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roofColor: string, time: number, vibe: Village['vibe'] = 'home') {
  const windowHsl = VIBE_WINDOW[vibe];
  // Wall
  ctx.fillStyle = vibe === 'forbidden' ? 'hsl(10, 10%, 13%)' : 'hsl(25, 12%, 16%)';
  ctx.fillRect(px(x), px(y), w, h);
  // Wood beam accents
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  ctx.fillRect(px(x), px(y + h - 4), w, 4);
  ctx.fillRect(px(x + w / 2 - 1), px(y), 2, h);
  // Roof (pitched)
  ctx.fillStyle = roofColor;
  ctx.fillRect(px(x - 3), px(y - 6), w + 6, 6);
  ctx.fillRect(px(x + 3), px(y - 10), w - 6, 4);
  // Roof shadow line
  ctx.fillStyle = 'hsl(0, 0%, 0%)';
  ctx.globalAlpha = 0.3;
  ctx.fillRect(px(x), px(y), w, 2);
  ctx.globalAlpha = 1;
  // Door
  ctx.fillStyle = 'hsl(25, 20%, 8%)';
  ctx.fillRect(px(x + w / 2 - 4), px(y + h - 14), 8, 14);
  // Window (glowing, tinted per village vibe)
  const flicker = 0.7 + Math.sin(time * 3 + x) * 0.2;
  ctx.fillStyle = `hsla(${windowHsl}, ${flicker})`;
  ctx.fillRect(px(x + 8), px(y + h / 2 - 6), 6, 6);
  ctx.fillRect(px(x + w - 14), px(y + h / 2 - 6), 6, 6);
  // Window glow
  const grad = ctx.createRadialGradient(x + 11, y + h / 2 - 3, 2, x + 11, y + h / 2 - 3, 20);
  grad.addColorStop(0, `hsla(${windowHsl}, ${0.3 * flicker})`);
  grad.addColorStop(1, `hsla(${windowHsl}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(x - 5, y + h / 2 - 20, 40, 40);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'hsl(25, 20%, 10%)';
  ctx.fillRect(px(x - 1), px(y - 2), 2, 6);
  ctx.fillStyle = 'hsl(140, 20%, 12%)';
  ctx.fillRect(px(x - 6), px(y - 14), 12, 4);
  ctx.fillRect(px(x - 5), px(y - 18), 10, 4);
  ctx.fillRect(px(x - 3), px(y - 22), 6, 4);
  ctx.fillStyle = 'hsl(140, 25%, 16%)';
  ctx.fillRect(px(x - 5), px(y - 13), 3, 2);
  ctx.fillRect(px(x + 1), px(y - 17), 3, 2);
}

// Leafless, scorched tree for Ashenreach
function drawDeadTree(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'hsl(10, 15%, 8%)';
  ctx.fillRect(px(x - 1), px(y - 2), 3, 8);
  ctx.fillRect(px(x - 6), px(y - 16), 2, 8);
  ctx.fillRect(px(x + 3), px(y - 20), 2, 10);
  ctx.fillRect(px(x - 2), px(y - 24), 2, 10);
  ctx.fillStyle = 'hsl(10, 25%, 14%)';
  ctx.fillRect(px(x - 7), px(y - 17), 2, 2);
  ctx.fillRect(px(x + 4), px(y - 21), 2, 2);
}

// Fish-drying rack, Salt Cove
function drawDryingRack(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'hsl(25, 12%, 10%)';
  ctx.fillRect(px(x - 16), px(y - 20), 2, 20);
  ctx.fillRect(px(x + 14), px(y - 20), 2, 20);
  ctx.fillRect(px(x - 16), px(y - 20), 32, 2);
  ctx.fillStyle = 'hsl(200, 20%, 32%)';
  for (let i = 0; i < 4; i++) ctx.fillRect(px(x - 13 + i * 8), px(y - 18), 3, 9);
}

// Awninged market stall + goods, Grey Harbor
function drawMarketStall(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'hsl(25, 15%, 12%)';
  ctx.fillRect(px(x - 18), px(y - 24), 2, 24);
  ctx.fillRect(px(x + 16), px(y - 24), 2, 24);
  ctx.fillStyle = 'hsl(0, 35%, 32%)';
  ctx.fillRect(px(x - 20), px(y - 28), 40, 6);
  ctx.fillStyle = 'hsl(0, 30%, 24%)';
  for (let i = 0; i < 5; i++) ctx.fillRect(px(x - 20 + i * 8), px(y - 22), 4, 3);
  ctx.fillStyle = 'hsl(25, 20%, 8%)';
  ctx.fillRect(px(x - 16), px(y - 18), 32, 3);
  ctx.fillStyle = 'hsl(35, 35%, 45%)';
  ctx.fillRect(px(x - 10), px(y - 16), 6, 5);
  ctx.fillStyle = 'hsl(100, 25%, 35%)';
  ctx.fillRect(px(x + 2), px(y - 16), 6, 5);
}

// Fog-shrouded bell tower, Mistford
function drawBellTower(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.fillStyle = 'hsl(220, 10%, 10%)';
  ctx.fillRect(px(x - 4), px(y - 8), 8, 46);
  ctx.fillStyle = 'hsl(220, 12%, 16%)';
  ctx.fillRect(px(x - 8), px(y - 14), 16, 8);
  ctx.fillRect(px(x - 5), px(y - 20), 10, 6);
  const swing = Math.sin(time * 1.5) * 2;
  ctx.fillStyle = 'hsl(40, 30%, 30%)';
  ctx.fillRect(px(x - 2 + swing), px(y - 10), 4, 5);
  const ring = 0.5 + Math.sin(time * 1.5) * 0.5;
  ctx.fillStyle = `hsla(210, 40%, 70%, ${ring * 0.3})`;
  ctx.fillRect(px(x - 10), px(y - 8), 20, 2);
}

// Small flower box beneath a window, Haven
function drawFlowerBox(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'hsl(140, 20%, 18%)';
  ctx.fillRect(px(x - 5), px(y), 10, 3);
  ctx.fillStyle = 'hsl(340, 35%, 45%)';
  ctx.fillRect(px(x - 4), px(y - 2), 2, 2);
  ctx.fillStyle = 'hsl(45, 45%, 55%)';
  ctx.fillRect(px(x), px(y - 2), 2, 2);
  ctx.fillStyle = 'hsl(200, 35%, 50%)';
  ctx.fillRect(px(x + 3), px(y - 2), 2, 2);
}

// Vibe-specific ambient particles/weather
function drawAmbience(ctx: CanvasRenderingContext2D, vibe: Village['vibe'], time: number) {
  if (vibe === 'foggy') {
    for (let i = 0; i < 4; i++) {
      const fx = ((i * 130 + time * 10) % (W + 80)) - 40;
      const fy = 90 + (i % 3) * 35;
      ctx.fillStyle = 'rgba(190,200,210,0.05)';
      ctx.fillRect(px(fx), px(fy), 70, 14);
    }
  } else if (vibe === 'forbidden') {
    for (let i = 0; i < 14; i++) {
      const ax = (i * 61 + time * 8) % W;
      const ay = (i * 37 + time * 22) % (H - 60) + 10;
      ctx.fillStyle = 'rgba(160,90,60,0.5)';
      ctx.fillRect(px(ax), px(ay), 1, 1);
    }
  } else if (vibe === 'fishing') {
    for (let i = 0; i < 3; i++) {
      const gx = ((i * 160 + time * 24) % (W + 60)) - 30;
      const gy = 40 + Math.sin(time * 2 + i) * 4 + i * 10;
      ctx.fillStyle = 'rgba(210,215,220,0.5)';
      ctx.fillRect(px(gx), px(gy), 3, 1);
      ctx.fillRect(px(gx - 2), px(gy - 1), 2, 1);
      ctx.fillRect(px(gx + 3), px(gy - 1), 2, 1);
    }
  } else if (vibe === 'trade') {
    for (let i = 0; i < 6; i++) {
      const dx = (i * 83 + time * 14) % W;
      const dy = 120 + ((i * 29) % 60);
      ctx.fillStyle = 'rgba(200,180,140,0.12)';
      ctx.fillRect(px(dx), px(dy), 1, 1);
    }
  } else if (vibe === 'home') {
    for (let i = 0; i < 5; i++) {
      const t = time * 0.6 + i * 1.7;
      const fx = 60 + (i * 70) % (W - 120) + Math.sin(t) * 10;
      const fy = 140 + Math.cos(t * 0.7) * 10 + (i % 3) * 8;
      const glow = 0.3 + Math.sin(t * 3) * 0.3;
      ctx.fillStyle = `rgba(230,210,140,${Math.max(0, glow)})`;
      ctx.fillRect(px(fx), px(fy), 1, 1);
    }
  }
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'hsl(25, 30%, 22%)';
  ctx.fillRect(px(x - 6), px(y - 6), 12, 12);
  ctx.fillStyle = 'hsl(25, 25%, 14%)';
  ctx.fillRect(px(x - 6), px(y - 6), 12, 1);
  ctx.fillRect(px(x - 6), px(y - 1), 12, 1);
  ctx.fillRect(px(x - 6), px(y + 5), 12, 1);
  ctx.fillRect(px(x - 1), px(y - 6), 1, 12);
}

// A small table with a rolled map and a compass — where new outposts get founded.
function drawChartTable(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Legs
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  ctx.fillRect(px(x - 12), px(y - 2), 2, 10);
  ctx.fillRect(px(x + 10), px(y - 2), 2, 10);
  // Tabletop
  ctx.fillStyle = 'hsl(25, 22%, 18%)';
  ctx.fillRect(px(x - 14), px(y - 6), 28, 6);
  ctx.fillStyle = 'hsl(0, 0%, 0%)';
  ctx.globalAlpha = 0.25;
  ctx.fillRect(px(x - 14), px(y - 6), 28, 1);
  ctx.globalAlpha = 1;
  // Map, unrolled
  ctx.fillStyle = 'hsl(42, 35%, 62%)';
  ctx.fillRect(px(x - 9), px(y - 11), 12, 8);
  ctx.strokeStyle = 'hsl(25, 25%, 20%)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px(x - 9) + 0.5, px(y - 11) + 0.5, 11, 7);
  // Compass rose accent
  ctx.fillStyle = 'hsl(0, 45%, 45%)';
  ctx.fillRect(px(x + 3), px(y - 10), 4, 4);
  drawLabel(ctx, 'CHART', x, y + 6, 6, 'hsla(0,0%,96%,0.9)');
}

function drawMissionBoard(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  // Posts
  ctx.fillStyle = 'hsl(25, 15%, 12%)';
  ctx.fillRect(px(x - 12), px(y - 4), 2, 12);
  ctx.fillRect(px(x + 10), px(y - 4), 2, 12);
  // Board
  ctx.fillStyle = 'hsl(25, 20%, 20%)';
  ctx.fillRect(px(x - 14), px(y - 18), 28, 18);
  // Border
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  ctx.fillRect(px(x - 14), px(y - 18), 28, 1);
  ctx.fillRect(px(x - 14), px(y - 1), 28, 1);
  // "papers" — small colored rects
  ctx.fillStyle = 'hsl(40, 40%, 70%)';
  ctx.fillRect(px(x - 11), px(y - 15), 8, 5);
  ctx.fillStyle = 'hsl(200, 30%, 60%)';
  ctx.fillRect(px(x - 1), px(y - 16), 7, 6);
  ctx.fillStyle = 'hsl(0, 30%, 55%)';
  ctx.fillRect(px(x + 2), px(y - 8), 6, 5);
  // Label
  drawLabel(ctx, 'NOTICES', x, y + 5, 6, 'hsla(0,0%,96%,0.9)');
}

function drawSign(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  ctx.fillRect(px(x - 1), px(y - 2), 2, 10);
  ctx.fillStyle = color;
  ctx.fillRect(px(x - 12), px(y - 12), 24, 10);
  ctx.font = '5px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'hsl(25, 15%, 8%)';
  ctx.fillText(text, x, y - 5);
}

function drawBoat(
  ctx: CanvasRenderingContext2D, x: number, y: number, time: number,
  hullColor = 'hsl(25, 25%, 18%)', mastColor = 'hsl(25, 20%, 12%)', sailColor = 'hsl(30, 20%, 55%)',
) {
  const bob = Math.sin(time * 2) * 1;
  ctx.fillStyle = hullColor;
  ctx.fillRect(px(x - 8), px(y + bob), 16, 4);
  ctx.fillRect(px(x - 6), px(y + bob + 4), 12, 2);
  // Mast
  ctx.fillStyle = mastColor;
  ctx.fillRect(px(x - 1), px(y - 12 + bob), 2, 12);
  // Sail
  ctx.fillStyle = sailColor;
  ctx.fillRect(px(x - 6), px(y - 11 + bob), 5, 8);
  ctx.fillRect(px(x + 2), px(y - 9 + bob), 5, 6);
}

export default VillageWalkScene;
