import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Village } from '../game/villages';
import { ShopState } from '../game/types';
import { MissionState, Mission, getMissionsForVillage } from '../game/missions';
import { DIALOGUES, DialogueSequence, NPC_PORTRAITS } from '../game/dialogue';
import DialogueBox from './DialogueBox';
import { sfxButtonClick } from '../game/sfx';

interface Props {
  village: Village;
  shop: ShopState;
  missionState: MissionState;
  onSetSail: (mission?: Mission) => void;
  onShop: () => void;
  onMissionUpdate: (state: MissionState) => void;
  isFirstVisit: boolean;
  onFirstVisitDone: () => void;
}

// World size (canvas native pixels — pixel art scale)
const W = 480;
const H = 300;
const PLAYER_SPEED = 85;
const INTERACT_RANGE = 26;

// NPC positions within the village
const NPC_POS: Record<string, { x: number; y: number }> = {
  friend: { x: 110, y: 130 },
  mechanic: { x: 390, y: 120 },
  harbormaster: { x: 240, y: 90 },
  fisher: { x: 100, y: 150 },
  saltwidow: { x: 380, y: 160 },
  trader: { x: 140, y: 110 },
  dockhand: { x: 370, y: 190 },
  bellkeeper: { x: 240, y: 80 },
  child: { x: 180, y: 200 },
  stranger: { x: 240, y: 120 },
};

type Kind = 'npc' | 'board' | 'shop' | 'dock';
interface Nearby { kind: Kind; id?: string; label: string; x: number; y: number; }

const BOARD_POS = { x: 300, y: 210 };
const SHOP_POS = { x: 420, y: 200 };
const DOCK_POS = { x: W / 2, y: H - 20 };

function px(v: number) { return Math.round(v); }

const VillageWalkScene: React.FC<Props> = ({
  village, shop, missionState, onSetSail, onShop, onMissionUpdate, isFirstVisit, onFirstVisitDone,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef({
    x: DOCK_POS.x,
    y: DOCK_POS.y - 30,
    dir: 'up' as 'up' | 'down' | 'left' | 'right',
    moving: false,
    animT: 0,
  });
  const inputRef = useRef({ up: false, down: false, left: false, right: false });
  const timeRef = useRef(0);
  const lastTsRef = useRef(0);
  const rafRef = useRef<number>(0);
  const nearbyRef = useRef<Nearby | null>(null);

  const [nearby, setNearby] = useState<Nearby | null>(null);
  const [dialogue, setDialogue] = useState<DialogueSequence | null>(
    isFirstVisit && village.id === 'haven' ? DIALOGUES['intro'] : null
  );
  const [pendingMissionNpc, setPendingMissionNpc] = useState<string | null>(null);
  const [showMissionBoard, setShowMissionBoard] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [talkedTo, setTalkedTo] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('deadwake_talked');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const villageNpcs = village.npcs.filter(id => NPC_POS[id] && NPC_PORTRAITS[id]);
  const availableMissions = getMissionsForVillage(missionState, village.id);
  const isDeliveryDestination =
    missionState.activeMission?.type === 'delivery' &&
    missionState.activeMission?.toVillage === village.id;

  // Compute interactables
  const getInteractables = useCallback((): Nearby[] => {
    const list: Nearby[] = [];
    for (const id of villageNpcs) {
      const pos = NPC_POS[id];
      const info = NPC_PORTRAITS[id];
      list.push({ kind: 'npc', id, label: info.name, x: pos.x, y: pos.y });
    }
    list.push({ kind: 'board', label: 'Mission Board', x: BOARD_POS.x, y: BOARD_POS.y });
    if (village.id === 'haven') {
      list.push({ kind: 'shop', label: "Mara's Workshop", x: SHOP_POS.x, y: SHOP_POS.y });
    }
    list.push({ kind: 'dock', label: 'Set Sail', x: DOCK_POS.x, y: DOCK_POS.y });
    return list;
  }, [villageNpcs, village.id]);

  // Handle interact
  const handleInteract = useCallback((n: Nearby) => {
    if (dialogue || pendingMissionNpc || showMissionBoard || showLeaveConfirm) return;
    sfxButtonClick();
    if (n.kind === 'npc' && n.id) {
      const seq = DIALOGUES[`${n.id}_first`];
      if (seq) setDialogue(seq);
      const next = new Set(talkedTo);
      next.add(n.id);
      setTalkedTo(next);
      localStorage.setItem('deadwake_talked', JSON.stringify([...next]));
      // If this NPC has a mission and none is active, queue mission offer after dialogue
      const hasMission = availableMissions.some(m => m.giver === n.id) && !missionState.activeMission;
      if (hasMission) setPendingMissionNpc(n.id);
    } else if (n.kind === 'board') {
      setShowMissionBoard(true);
    } else if (n.kind === 'shop') {
      onShop();
    } else if (n.kind === 'dock') {
      setShowLeaveConfirm(true);
    }
  }, [dialogue, pendingMissionNpc, showMissionBoard, showLeaveConfirm, talkedTo, availableMissions, missionState.activeMission, onShop]);

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
      const anyModal = !!dialogue || !!pendingMissionNpc || showMissionBoard || showLeaveConfirm;

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
      p.x = Math.max(20, Math.min(W - 20, p.x));
      p.y = Math.max(60, Math.min(H - 8, p.y));

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

      renderScene(ctx, village, p, interactables, timeRef.current, talkedTo, missionState.activeMission?.giver || null);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [village, dialogue, pendingMissionNpc, showMissionBoard, showLeaveConfirm, talkedTo, missionState.activeMission, getInteractables]);

  // Keyboard input
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') inputRef.current.up = true;
      if (k === 's' || k === 'arrowdown') inputRef.current.down = true;
      if (k === 'a' || k === 'arrowleft') inputRef.current.left = true;
      if (k === 'd' || k === 'arrowright') inputRef.current.right = true;
      if ((k === 'e' || k === ' ') && nearbyRef.current) {
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
  }, [handleInteract]);

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
    sfxButtonClick();
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
    sfxButtonClick();
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

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background">
      <div className="absolute inset-0 scanlines opacity-10 pointer-events-none" />

      {/* Top HUD: village name, coins, active mission */}
      <div className="absolute top-3 left-0 right-0 z-20 flex items-center justify-between px-4">
        <div className="pixel-border bg-card/80 px-3 py-2">
          <div className="font-display text-[7px] text-muted-foreground">YOU ARE IN</div>
          <div className="font-display text-[9px] text-primary">{village.name.toUpperCase()}</div>
        </div>
        <div className="pixel-border bg-card/80 px-3 py-2 flex items-center gap-2">
          <span className="text-accent gold-glow">◆</span>
          <span className="font-body text-sm text-foreground">{shop.coins}</span>
        </div>
      </div>

      {missionState.activeMission && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pixel-border bg-card/80 px-3 py-1.5 max-w-[280px]">
          <div className="font-display text-[7px] text-primary">ACTIVE MISSION</div>
          <div className="font-body text-xs text-foreground truncate">{missionState.activeMission.title}</div>
        </div>
      )}

      {isDeliveryDestination && (
        <button
          onClick={deliverCargo}
          className="absolute top-32 left-1/2 -translate-x-1/2 z-20 pixel-border bg-primary text-primary-foreground px-4 py-2 font-display text-[9px] hover:bg-primary/80 animate-fade-in pixel-btn"
        >
          DELIVER CARGO (+{missionState.activeMission?.reward.coins} ◆)
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
        {nearby && !dialogue && !pendingMissionNpc && !showMissionBoard && !showLeaveConfirm && (
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 pixel-border bg-card/95 px-4 py-2 whitespace-nowrap pointer-events-none animate-fade-in">
            <span className="font-display text-[8px] text-primary">[E]</span>
            <span className="font-body text-sm text-foreground ml-2">
              {nearby.kind === 'npc' ? `Talk to ${nearby.label}` :
               nearby.kind === 'board' ? 'Read Mission Board' :
               nearby.kind === 'shop' ? 'Enter Workshop' :
               'Return to Boat'}
              {nearby.kind === 'npc' && nearby.id && !talkedTo.has(nearby.id) && (
                <span className="ml-2 text-primary text-xs">[NEW]</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="mt-16 font-body text-xs text-muted-foreground/60 text-center px-4">
        Move: WASD / Arrows &nbsp;·&nbsp; Interact: E / Space
      </div>

      {/* Touch dpad (mobile) */}
      <TouchDpad inputRef={inputRef} onInteract={() => nearbyRef.current && handleInteract(nearbyRef.current)} canInteract={!!nearby} />

      {/* Dialogue */}
      {dialogue && <DialogueBox sequence={dialogue} onComplete={onDialogueDone} />}

      {/* Mission offer from NPC after dialogue */}
      {!dialogue && pendingMission && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/70 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-sm w-full">
            <div className="font-display text-[8px] text-primary mb-2">MISSION OFFERED</div>
            <div className="font-display text-[10px] text-foreground mb-2">{pendingMission.title}</div>
            <p className="font-body text-sm text-muted-foreground mb-3">{pendingMission.description}</p>
            <div className="font-body text-sm text-accent mb-4">Reward: {pendingMission.reward.coins} ◆</div>
            <div className="flex gap-2">
              <button
                onClick={() => acceptMission(pendingMission)}
                className="flex-1 py-2 bg-primary text-primary-foreground font-display text-[9px] pixel-btn hover:bg-primary/80"
              >ACCEPT</button>
              <button
                onClick={() => { sfxButtonClick(); setPendingMissionNpc(null); }}
                className="flex-1 py-2 bg-secondary text-secondary-foreground font-display text-[9px] pixel-btn border border-border hover:bg-secondary/80"
              >LATER</button>
            </div>
          </div>
        </div>
      )}

      {/* Mission board modal */}
      {showMissionBoard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/80 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display text-[10px] text-primary">MISSION BOARD</div>
              <button onClick={() => { sfxButtonClick(); setShowMissionBoard(false); }} className="font-display text-[9px] text-muted-foreground hover:text-foreground">[X]</button>
            </div>
            {missionState.activeMission && (
              <div className="mb-3 p-3 pixel-border bg-primary/10">
                <div className="font-display text-[7px] text-primary mb-1">ACTIVE</div>
                <div className="font-display text-[9px] text-foreground">{missionState.activeMission.title}</div>
                <p className="font-body text-xs text-muted-foreground mt-1">{missionState.activeMission.description}</p>
              </div>
            )}
            {availableMissions.length === 0 ? (
              <div className="text-center py-6 font-body text-sm text-muted-foreground/50">
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
                    <div className="font-display text-[8px] text-foreground">{m.title}</div>
                    <p className="font-body text-xs text-muted-foreground mt-1">{m.description}</p>
                    <div className="font-body text-xs text-accent mt-1">Reward: {m.reward.coins} ◆ · from {NPC_PORTRAITS[m.giver]?.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave confirmation */}
      {showLeaveConfirm && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-background/80 animate-fade-in">
          <div className="pixel-border bg-card p-4 max-w-sm w-full">
            <div className="font-display text-[10px] text-primary mb-3">SET SAIL?</div>
            <p className="font-body text-sm text-muted-foreground mb-4">
              {missionState.activeMission
                ? `Sail toward ${missionState.activeMission.target?.label || 'the sea'}?`
                : 'Head out into open water?'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { sfxButtonClick(); setShowLeaveConfirm(false); onSetSail(missionState.activeMission || undefined); }}
                className="flex-1 py-2 bg-primary text-primary-foreground font-display text-[9px] pixel-btn hover:bg-primary/80"
              >SET SAIL</button>
              <button
                onClick={() => { sfxButtonClick(); setShowLeaveConfirm(false); }}
                className="flex-1 py-2 bg-secondary text-secondary-foreground font-display text-[9px] pixel-btn border border-border hover:bg-secondary/80"
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
  player: { x: number; y: number; dir: string; moving: boolean; animT: number },
  interactables: Nearby[],
  time: number,
  talkedTo: Set<string>,
  activeGiverId: string | null,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  // Background sky/hills
  ctx.fillStyle = 'hsl(210, 25%, 8%)';
  ctx.fillRect(0, 0, W, H);

  // Distant hills
  ctx.fillStyle = 'hsl(210, 20%, 11%)';
  for (let i = 0; i < 6; i++) {
    const bx = i * 90;
    ctx.fillRect(bx, 30, 60, 30);
    ctx.fillRect(bx + 10, 20, 40, 20);
  }

  // Ground path/dirt
  ctx.fillStyle = 'hsl(30, 12%, 14%)';
  ctx.fillRect(0, 60, W, H - 90);

  // Path lines (dirt texture)
  ctx.fillStyle = 'hsl(30, 15%, 17%)';
  ctx.fillRect(W / 2 - 20, 60, 40, H - 90);
  ctx.fillRect(60, 170, W - 120, 20);

  // Cobble specks
  ctx.fillStyle = 'hsl(30, 10%, 20%)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 47) % W;
    const sy = 65 + ((i * 31) % (H - 100));
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Water at bottom
  const waterY = H - 30;
  ctx.fillStyle = 'hsl(210, 40%, 8%)';
  ctx.fillRect(0, waterY, W, 30);
  // water shimmer
  ctx.fillStyle = 'hsl(200, 30%, 18%)';
  for (let i = 0; i < 20; i++) {
    const wx = (i * 27 + Math.floor(time * 12)) % W;
    ctx.fillRect(wx, waterY + 4 + (i % 3) * 4, 6, 1);
  }

  // Dock
  ctx.fillStyle = 'hsl(25, 20%, 15%)';
  ctx.fillRect(W / 2 - 24, waterY - 4, 48, 24);
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  for (let i = 0; i < 5; i++) ctx.fillRect(W / 2 - 22 + i * 11, waterY - 4, 2, 24);

  // Boat moored to dock (right of it)
  drawBoat(ctx, W / 2 + 34, waterY + 6, time);

  // Buildings
  drawBuilding(ctx, 60, 80, 70, 70, village.color, time);   // left house
  drawBuilding(ctx, 200, 60, 90, 90, village.color, time);  // center-back house
  drawBuilding(ctx, 340, 90, 80, 70, village.color, time);  // right house (or shop in Haven)
  if (village.id === 'haven') {
    // Shop sign in front of right house
    drawSign(ctx, SHOP_POS.x, SHOP_POS.y, 'SHOP', 'hsl(40, 60%, 45%)');
  }

  // Trees (dark pines) for atmosphere
  drawTree(ctx, 25, 90);
  drawTree(ctx, 18, 155);
  drawTree(ctx, W - 20, 100);
  drawTree(ctx, W - 12, 175);

  // Barrels/crates
  drawCrate(ctx, 155, 175);
  drawCrate(ctx, 305, 175);

  // Mission board
  drawMissionBoard(ctx, BOARD_POS.x, BOARD_POS.y, time);

  // NPCs
  for (const it of interactables) {
    if (it.kind !== 'npc' || !it.id) continue;
    const info = NPC_PORTRAITS[it.id];
    drawPerson(ctx, it.x, it.y, info.color, 'down', false, time + it.x * 0.1);
    // Name label
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'hsla(0,0%,90%,0.6)';
    ctx.fillText(info.name.toUpperCase(), it.x, it.y - 18);
    // Indicators
    if (!talkedTo.has(it.id)) {
      // "!" bouncing
      const by = -25 + Math.sin(time * 4 + it.x) * 2;
      ctx.fillStyle = 'hsl(180, 60%, 55%)';
      ctx.fillRect(it.x - 1, it.y + by, 2, 5);
      ctx.fillRect(it.x - 1, it.y + by + 7, 2, 2);
    } else if (activeGiverId === it.id) {
      // Return indicator "?"
      ctx.fillStyle = 'hsl(40, 80%, 55%)';
      ctx.font = '8px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText('?', it.x, it.y - 22);
    }
  }

  // Player
  drawPerson(ctx, player.x, player.y, 'hsl(200, 40%, 65%)', player.dir, player.moving && Math.floor(player.animT) % 2 === 0, time);

  // Vignette / fog overlay
  const fogAlpha = 0.15 + Math.sin(time * 0.4) * 0.03;
  const grad = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(5,10,15,${fogAlpha + 0.4})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, dir: string, altStep: boolean, time: number) {
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
  // Head
  ctx.fillStyle = 'hsl(25, 25%, 55%)';
  ctx.fillRect(px(x - 3), px(y - 11), 6, 6);
  // Hair
  ctx.fillStyle = 'hsl(25, 20%, 20%)';
  ctx.fillRect(px(x - 3), px(y - 12), 6, 2);
  // Eye direction
  ctx.fillStyle = 'hsl(0, 0%, 10%)';
  if (dir === 'up') {
    // no eyes visible (facing back)
    ctx.fillStyle = 'hsl(25, 20%, 20%)';
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

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roofColor: string, time: number) {
  // Wall
  ctx.fillStyle = 'hsl(25, 12%, 16%)';
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
  // Window (glowing)
  const flicker = 0.7 + Math.sin(time * 3 + x) * 0.2;
  ctx.fillStyle = `hsla(40, 65%, 55%, ${flicker})`;
  ctx.fillRect(px(x + 8), px(y + h / 2 - 6), 6, 6);
  ctx.fillRect(px(x + w - 14), px(y + h / 2 - 6), 6, 6);
  // Window glow
  const grad = ctx.createRadialGradient(x + 11, y + h / 2 - 3, 2, x + 11, y + h / 2 - 3, 20);
  grad.addColorStop(0, `hsla(35, 80%, 55%, ${0.3 * flicker})`);
  grad.addColorStop(1, 'hsla(35, 80%, 55%, 0)');
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

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'hsl(25, 30%, 22%)';
  ctx.fillRect(px(x - 6), px(y - 6), 12, 12);
  ctx.fillStyle = 'hsl(25, 25%, 14%)';
  ctx.fillRect(px(x - 6), px(y - 6), 12, 1);
  ctx.fillRect(px(x - 6), px(y - 1), 12, 1);
  ctx.fillRect(px(x - 6), px(y + 5), 12, 1);
  ctx.fillRect(px(x - 1), px(y - 6), 1, 12);
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
  ctx.font = '5px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'hsla(0,0%,90%,0.7)';
  ctx.fillText('NOTICES', x, y + 5);
}

function drawSign(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  ctx.fillRect(px(x - 1), px(y - 2), 2, 10);
  ctx.fillStyle = color;
  ctx.fillRect(px(x - 12), px(y - 12), 24, 10);
  ctx.fillStyle = 'hsl(25, 15%, 8%)';
  ctx.font = '5px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 5);
}

function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const bob = Math.sin(time * 2) * 1;
  ctx.fillStyle = 'hsl(25, 25%, 18%)';
  ctx.fillRect(px(x - 8), px(y + bob), 16, 4);
  ctx.fillRect(px(x - 6), px(y + bob + 4), 12, 2);
  // Mast
  ctx.fillStyle = 'hsl(25, 20%, 12%)';
  ctx.fillRect(px(x - 1), px(y - 12 + bob), 2, 12);
  // Sail
  ctx.fillStyle = 'hsl(30, 20%, 55%)';
  ctx.fillRect(px(x - 6), px(y - 11 + bob), 5, 8);
  ctx.fillRect(px(x + 2), px(y - 9 + bob), 5, 6);
}

export default VillageWalkScene;
