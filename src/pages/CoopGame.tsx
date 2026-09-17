import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NetClient } from '../net/NetClient';
import { useCoopSession, CoopPlayer } from '../net/useCoopSession';
import { PeerPositionBuffer } from '../net/PeerPositions';
import { renderPeers } from '../net/renderPeers';
import { dirToAngle, angleToDir } from '../net/directionAngle';
import { useGameLoop } from '../game/useGameLoop';
import { useGamepad } from '../game/useGamepad';
import { ShopState } from '../game/types';
import { CargoItem, CargoState } from '../game/cargo';
import { MissionState } from '../game/missions';
import { VILLAGES, Village, getVillage, findNearbyVillage } from '../game/villages';
import { BOAT_SKINS, SAIL_STYLES, TRAIL_EFFECTS, SPEED_UPGRADES } from '../game/shopData';
import { getEmpireRank } from '../game/empireRank';
import { PlayerProfile, loadProfile, saveProfile } from '../game/profile';
import {
  resumeAudio, sfxCollectCoin, sfxCollectCrate, sfxBoost, sfxCrash, sfxRamHit, sfxCannonFire, sfxDock, sfxPauseToggle,
  startAmbient, stopAmbient, isMuted, setMuted,
} from '../game/sfx';
import VillageWalkScene, { OtherPlayer } from '../components/VillageWalkScene';
import GameHUD from '../components/GameHUD';
import MiniMap from '../components/MiniMap';
import DockPrompt from '../components/DockPrompt';
import GameOverScreen from '../components/GameOverScreen';
import ShopScreen from '../components/ShopScreen';
import MilestoneBanner from '../components/MilestoneBanner';
import FoundOutpostModal from '../components/FoundOutpostModal';
import PauseMenu from '../components/PauseMenu';
import CharacterScreen from '../components/CharacterScreen';
import ControlsScreen from '../components/ControlsScreen';
import SettingsScreen from '../components/SettingsScreen';
import TouchSteering from '../components/TouchSteering';
import CoopPlayersList from '../components/CoopPlayersList';
import CoopChat from '../components/CoopChat';
import { loadSettings, saveSettings, GameSettings } from '../game/settings';
import { useDeviceMode } from '../hooks/use-device-mode';

interface CoopGameProps {
  client: NetClient;
  onLeave: () => void;
}

type Screen = 'village' | 'playing' | 'gameover' | 'shop' | 'character' | 'controls' | 'outpost';

// Parallel to DeadwakeGame.tsx rather than a branch inside it — mirrors its
// screen orchestration but sources shared state (missions/cargo pool/party
// wallet/discovery) from the network instead of localStorage, and keeps
// solo play (DeadwakeGame.tsx) completely untouched by this feature.
const CoopGame: React.FC<CoopGameProps> = ({ client, onLeave }) => {
  const session = useCoopSession(client);
  const [screen, setScreen] = useState<Screen>('village');
  const [currentVillageId, setCurrentVillageId] = useState('haven');
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [localHold, setLocalHold] = useState<CargoItem[]>([]);
  const [selectedSkin, setSelectedSkin] = useState(() => BOAT_SKINS[0].id);
  const [selectedSpeedUpgrade, setSelectedSpeedUpgrade] = useState(() => SPEED_UPGRADES[0].id);
  const [dockableVillage, setDockableVillage] = useState<Village | null>(null);
  const [lastDockedVillageId, setLastDockedVillageId] = useState('haven');
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const [helloSent, setHelloSent] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const holdRef = useRef<CargoItem[]>([]);
  holdRef.current = localHold;
  const missionStateRef = useRef(session.missionState);
  missionStateRef.current = session.missionState;
  const peerPositions = useRef(new PeerPositionBuffer());
  const prevCoinsRef = useRef(0);
  const prevBoostRef = useRef(false);
  const prevGameOverRef = useRef(false);
  const prevRamKillsRef = useRef(0);
  const prevShotsFiredRef = useRef(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const missionTarget = session.missionState.activeMission?.target || null;

  const boatSkin = BOAT_SKINS.find(s => s.id === selectedSkin) || BOAT_SKINS[0];
  const speedUpgrade = SPEED_UPGRADES.find(u => u.id === selectedSpeedUpgrade) || SPEED_UPGRADES[0];
  // useGameLoop can't read the co-op-shared shop selection from solo
  // localStorage (that's a different save entirely) — hand it the real
  // effective skin directly so sailing physics reflect what was actually
  // bought, not whatever this PC's solo save happens to contain.
  const effectiveSkin = speedUpgrade.speedMod === 1 ? boatSkin : { ...boatSkin, speedMod: boatSkin.speedMod * speedUpgrade.speedMod };
  const { gameState, startGame, stopGame, setPaused, inputRef } = useGameLoop(canvasRef, missionTarget, session.discovered, effectiveSkin);
  useGamepad(useCallback((connected: boolean) => setGamepadConnected(connected), []));
  const resolvedDevice = useDeviceMode(gamepadConnected, settings.deviceMode);

  const handleSettingsUpdate = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  // useGameLoop hands back a brand-new gameState object every single animation
  // frame (60/sec). Effects below must NOT depend on gameState directly — a
  // dependency array containing it (or its fields) tears the effect down and
  // rebuilds it every frame, which starves a setInterval before its period
  // ever elapses and makes a requestAnimationFrame loop unreliable. Reading
  // through this ref instead keeps those loops stable across renders.
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const currentVillage = getVillage(currentVillageId, session.outposts) || VILLAGES[0];
  // CoopGame has no main-menu screen to show this (Index.tsx skips straight
  // into the session), so it surfaces as a small HUD badge instead, for
  // parity with the solo main menu's readout.
  const empireRank = getEmpireRank({
    coins: session.economy.coins,
    discoveredCount: session.discovered.length,
    outpostCount: session.outposts.length,
    completedMissionsCount: session.missionState.completedMissions.length,
  });

  const sendIntent = useCallback((msg: Parameters<NetClient['send']>[0]) => client.send(msg), [client]);

  const handleFoundOutpost = useCallback(() => {
    sendIntent({ type: 'FOUND_OUTPOST' });
    setScreen('village');
  }, [sendIntent]);

  // Friendship/automation are entirely host-resolved (dialogue-tier tracking,
  // friendship math, hire validation) — this client only relays the intent,
  // same division of labor as handleFoundOutpost above.
  const handleTalkedToNpc = useCallback((npcId: string, dialogueId: string) => {
    sendIntent({ type: 'TALK_TO_NPC', npcId, dialogueId });
  }, [sendIntent]);

  const handleHireCaptain = useCallback((npcId: string, npcName: string) => {
    sendIntent({ type: 'HIRE_CAPTAIN', npcId, npcName });
  }, [sendIntent]);

  const hiredNpcIds = new Set(session.hired.map(h => h.npcId));

  // Identify ourselves to the host as soon as the socket is open.
  useEffect(() => {
    if (session.status === 'open' && !helloSent) {
      client.send({
        type: 'HELLO',
        player: { name: profile.name, outfitColor: profile.outfitColor, hairColor: profile.hairColor, accentColor: profile.accentColor, skinId: selectedSkin },
      });
      setHelloSent(true);
    }
  }, [session.status, helloSent, client, profile, selectedSkin]);

  // VillageWalkScene tries to locally fill an empty mission board (see its
  // ensureBoardFilled effect), but in co-op that local result is never
  // authoritative — only the host's own ensureBoardFilled call (triggered by
  // DOCK_AT_VILLAGE) actually persists and broadcasts. Without this, whichever
  // village a player *starts* in (rather than sails into) could show a
  // permanently empty board if nobody had ever explicitly docked there before.
  // Sending this once per session, right after the host acknowledges us,
  // guarantees the board/cargo/discovery for our starting village is always
  // generated and synced — independent of join order.
  const initialSyncSentRef = useRef(false);
  useEffect(() => {
    if (session.status === 'open' && session.selfId && !initialSyncSentRef.current) {
      initialSyncSentRef.current = true;
      sendIntent({ type: 'DOCK_AT_VILLAGE', villageId: currentVillageId });
    }
  }, [session.status, session.selfId, currentVillageId, sendIntent]);

  // Keep the remote-position smoothing buffer fed from network updates, and
  // drop anyone who's left so their boat doesn't linger as a ghost at sea.
  useEffect(() => {
    const liveIds = new Set(Object.keys(session.players));
    peerPositions.current.pruneExcept(liveIds);
    for (const p of Object.values(session.players)) {
      if (p.id === session.selfId || !p.position) continue;
      peerPositions.current.setTarget(p.id, p.position.x, p.position.y, p.position.angle);
    }
  }, [session.players, session.selfId]);

  // Clear rejection notices after a few seconds.
  useEffect(() => {
    if (!session.missionNotice) return;
    const t = setTimeout(() => session.clearMissionNotice(), 3000);
    return () => clearTimeout(t);
  }, [session.missionNotice, session.clearMissionNotice]);

  // Audio + hunt-mission ram tracking, mirroring DeadwakeGame.tsx's solo audio hook.
  useEffect(() => {
    if (screen !== 'playing') return;
    const gs = gameState;
    if (gs.coins > prevCoinsRef.current) {
      const diff = gs.coins - prevCoinsRef.current;
      if (diff >= 5) sfxCollectCrate(); else sfxCollectCoin();
    }
    prevCoinsRef.current = gs.coins;
    if (gs.speedBoostTimer > 0 && !prevBoostRef.current) sfxBoost();
    prevBoostRef.current = gs.speedBoostTimer > 0;
    if (gs.ramKills > prevRamKillsRef.current) sfxRamHit();
    prevRamKillsRef.current = gs.ramKills;
    if (gs.shotsFired > prevShotsFiredRef.current) sfxCannonFire();
    prevShotsFiredRef.current = gs.shotsFired;
    if (gs.gameOver && !prevGameOverRef.current) sfxCrash();
    prevGameOverRef.current = gs.gameOver;
  }, [gameState.coins, gameState.speedBoostTimer, gameState.ramKills, gameState.shotsFired, gameState.gameOver, screen]);

  // Non-village mission progress — same trigger conditions as solo play, but
  // reports completion to the host instead of mutating missionState directly.
  useEffect(() => {
    if (screen !== 'playing') return;
    const mission = session.missionState.activeMission;
    if (!mission) return;
    if (mission.type === 'collect' && mission.collectGoal && gameState.coins >= mission.collectGoal) {
      sendIntent({ type: 'COMPLETE_MISSION' });
    }
    if (mission.type === 'survive' && mission.surviveTime && gameState.time >= mission.surviveTime) {
      sendIntent({ type: 'COMPLETE_MISSION' });
    }
    if (mission.type === 'hunt' && mission.huntGoal && gameState.ramKills >= mission.huntGoal) {
      sendIntent({ type: 'COMPLETE_MISSION' });
    }
    // Race timeouts aren't enforced host-side in v1 (no server-side clock per
    // mission) — the mission simply waits for a COMPLETE_MISSION/redock.
  }, [gameState.coins, gameState.time, gameState.ramKills, screen, session.missionState, sendIntent]);

  // Broadcast this boat's position while sailing.
  useEffect(() => {
    if (screen !== 'playing') return;
    const t = setInterval(() => {
      const gs = gameStateRef.current;
      sendIntent({ type: 'POSITION_UPDATE', villageId: null, x: gs.boatX, y: gs.boatY, angle: gs.boatAngle });
    }, 60);
    return () => clearInterval(t);
  }, [screen, sendIntent]);

  // Peer smoothing + rendering pass, layered on top of the normal sailing render.
  useEffect(() => {
    if (screen !== 'playing') return;
    let raf: number;
    const step = () => {
      peerPositions.current.step(1 / 60);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const gs = gameStateRef.current;
      if (ctx && canvas) {
        renderPeers(ctx, gs, canvas.width, canvas.height, session.players, peerPositions.current, gs.time, session.selfId);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen, session.players, session.selfId]);

  // Docking detection while sailing.
  useEffect(() => {
    if (screen !== 'playing' || gameState.gameOver) { if (dockableVillage) setDockableVillage(null); return; }
    const nearby = findNearbyVillage(gameState.boatX, gameState.boatY, session.outposts);
    if (nearby && nearby.id !== lastDockedVillageId) {
      if (dockableVillage?.id !== nearby.id) setDockableVillage(nearby);
    } else {
      if (dockableVillage) setDockableVillage(null);
      if (lastDockedVillageId) {
        const last = getVillage(lastDockedVillageId, session.outposts);
        if (last) {
          const dx = gameState.boatX - last.x, dy = gameState.boatY - last.y;
          if (Math.sqrt(dx * dx + dy * dy) > last.radius + 200) setLastDockedVillageId('');
        }
      }
    }
  }, [gameState.boatX, gameState.boatY, gameState.gameOver, screen, lastDockedVillageId, dockableVillage, session.outposts]);

  const bankVoyageCoins = useCallback(() => {
    if (gameState.coins > 0) sendIntent({ type: 'BANK_COINS', amount: gameState.coins });
  }, [gameState.coins, sendIntent]);

  const dockAtVillage = useCallback((village: Village) => {
    sfxDock();
    stopGame();
    stopAmbient();
    bankVoyageCoins();
    setCurrentVillageId(village.id);
    setLastDockedVillageId(village.id);
    setDockableVillage(null);
    sendIntent({ type: 'DOCK_AT_VILLAGE', villageId: village.id });
    setScreen('village');
  }, [stopGame, bankVoyageCoins, sendIntent]);

  const spawnPointForVillage = useCallback((id: string) => {
    const v = getVillage(id, session.outposts);
    return v ? { x: v.x, y: v.y + v.radius + 40 } : { x: 0, y: 0 };
  }, [session.outposts]);

  const handleSetSail = useCallback(() => {
    resumeAudio();
    startAmbient();
    prevCoinsRef.current = 0; prevBoostRef.current = false; prevGameOverRef.current = false; prevRamKillsRef.current = 0; prevShotsFiredRef.current = 0;
    setLastDockedVillageId(currentVillageId);
    setScreen('playing');
    setTimeout(() => { const { x, y } = spawnPointForVillage(currentVillageId); startGame(x, y); }, 100);
  }, [currentVillageId, spawnPointForVillage, startGame]);

  const handleRestart = useCallback(() => {
    prevCoinsRef.current = 0; prevBoostRef.current = false; prevGameOverRef.current = false; prevRamKillsRef.current = 0; prevShotsFiredRef.current = 0;
    setScreen('playing');
    setTimeout(() => { const { x, y } = spawnPointForVillage(currentVillageId); startGame(x, y); }, 100);
  }, [currentVillageId, spawnPointForVillage, startGame]);

  const handleReturnToVillage = useCallback(() => {
    stopGame();
    stopAmbient();
    bankVoyageCoins();
    setScreen('village');
  }, [stopGame, bankVoyageCoins]);

  // Game over → bank coins immediately (same "don't lose the run if the tab
  // closes mid-crash-animation" reasoning as solo play), delay only the screen.
  useEffect(() => {
    if (gameState.gameOver && screen === 'playing') {
      stopAmbient();
      bankVoyageCoins();
      const t = setTimeout(() => setScreen('gameover'), 800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.gameOver, screen]);

  // VillageWalkScene computes what it *thinks* the next mission state should be
  // (accept: activeMission goes null -> set; deliver: activeMission goes set ->
  // null) and calls this with that computed state — but missionState here is
  // host-authoritative, so instead of applying it, translate the attempted
  // action into an intent and let the host's MISSION_STATE broadcast (which
  // every player receives, including this one) be what actually updates it.
  const handleMissionUpdate = useCallback((newState: MissionState) => {
    const wasActive = missionStateRef.current.activeMission;
    if (!wasActive && newState.activeMission) {
      sendIntent({ type: 'ACCEPT_MISSION', missionId: newState.activeMission.id });
    } else if (wasActive && !newState.activeMission) {
      sendIntent({ type: 'COMPLETE_MISSION' });
    }
  }, [sendIntent]);

  const handleCargoUpdate = useCallback((next: CargoState) => {
    const newItem = next.hold.find(item => !holdRef.current.some(h => h.id === item.id));
    setLocalHold(next.hold);
    if (newItem) sendIntent({ type: 'PICK_UP_CARGO', villageId: currentVillageId, itemId: newItem.id });
  }, [currentVillageId, sendIntent]);

  const handleDeliverCargo = useCallback((itemId: string) => {
    setLocalHold(prev => prev.filter(i => i.id !== itemId));
    sendIntent({ type: 'DROP_OFF_CARGO', itemId });
  }, [sendIntent]);

  const handleProfileUpdate = useCallback((next: PlayerProfile) => {
    setProfile(next);
    saveProfile(next);
    sendIntent({ type: 'PROFILE_CHANGED', name: next.name, outfitColor: next.outfitColor, hairColor: next.hairColor, accentColor: next.accentColor });
  }, [sendIntent]);

  const handleShopUpdate = useCallback((next: ShopState) => {
    const boughtSkin = next.unlockedSkins.find(id => !session.economy.unlockedSkins.includes(id));
    const boughtSail = next.unlockedSails.find(id => !session.economy.unlockedSails.includes(id));
    const boughtTrail = next.unlockedTrails.find(id => !session.economy.unlockedTrails.includes(id));
    const boughtSpeedUpgrade = next.unlockedSpeedUpgrades.find(id => !session.economy.unlockedSpeedUpgrades.includes(id));
    if (boughtSkin) sendIntent({ type: 'BUY_UNLOCK', kind: 'skins', id: boughtSkin, price: BOAT_SKINS.find(s => s.id === boughtSkin)?.price || 0 });
    if (boughtSail) sendIntent({ type: 'BUY_UNLOCK', kind: 'sails', id: boughtSail, price: SAIL_STYLES.find(s => s.id === boughtSail)?.price || 0 });
    if (boughtTrail) sendIntent({ type: 'BUY_UNLOCK', kind: 'trails', id: boughtTrail, price: TRAIL_EFFECTS.find(t => t.id === boughtTrail)?.price || 0 });
    if (boughtSpeedUpgrade) sendIntent({ type: 'BUY_UNLOCK', kind: 'speedUpgrades', id: boughtSpeedUpgrade, price: SPEED_UPGRADES.find(u => u.id === boughtSpeedUpgrade)?.price || 0 });
    if (next.selectedSkin !== selectedSkin) {
      setSelectedSkin(next.selectedSkin);
      sendIntent({ type: 'SKIN_CHANGED', skinId: next.selectedSkin });
    }
    // Speed upgrade choice only affects this player's own physics — no other
    // player renders it, so unlike the boat skin it doesn't need a broadcast.
    if (next.selectedSpeedUpgrade !== selectedSpeedUpgrade) setSelectedSpeedUpgrade(next.selectedSpeedUpgrade);
  }, [session.economy, selectedSkin, selectedSpeedUpgrade, sendIntent]);

  const handleToggleSound = useCallback(() => { const n = !muted; setMuted(n); setMutedState(n); }, [muted]);

  // ESC pause + gamepad Start already dispatch synthetic Escape; wire it here directly
  // (CoopGame doesn't share DeadwakeGame's keydown effects).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'escape') return;
      if (showSettings) { setShowSettings(false); return; }
      if (showCharacter) { setShowCharacter(false); return; }
      if (showControls) { setShowControls(false); return; }
      sfxPauseToggle();
      setShowPauseMenu(p => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showCharacter, showControls, showSettings]);

  useEffect(() => {
    if (screen === 'playing') setPaused(showPauseMenu || showCharacter || showControls || showSettings || chatOpen);
  }, [showPauseMenu, showCharacter, showControls, showSettings, chatOpen, screen, setPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => { if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; } };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const shopState: ShopState = {
    coins: session.economy.coins,
    unlockedSkins: session.economy.unlockedSkins,
    unlockedSails: session.economy.unlockedSails,
    unlockedTrails: session.economy.unlockedTrails,
    unlockedSpeedUpgrades: session.economy.unlockedSpeedUpgrades,
    selectedSkin,
    selectedSail: 'plain',
    selectedTrail: 'default',
    selectedSpeedUpgrade,
    highScore: 0,
  };

  const cargoState: CargoState = { hold: localHold, portStock: session.portStock };

  const otherPlayersInVillage: OtherPlayer[] = Object.values(session.players)
    .filter((p: CoopPlayer) => p.id !== session.selfId && p.position?.villageId === currentVillageId)
    .map(p => ({
      id: p.id, name: p.name, outfitColor: p.outfitColor, hairColor: p.hairColor, accentColor: p.accentColor,
      x: p.position!.x, y: p.position!.y, dir: angleToDir(p.position!.angle),
    }));

  const peersAtSea = Object.values(session.players)
    .filter((p: CoopPlayer) => p.id !== session.selfId && p.position?.villageId === null)
    .map(p => ({ id: p.id, x: p.position!.x, y: p.position!.y, color: p.outfitColor }));

  // Covers both a graceful HOST_CLOSING message and an abrupt drop (host crash,
  // network loss) — either way the session is over and we must not get stuck
  // showing an indefinite "connecting" spinner.
  if (session.hostClosed || session.status === 'closed') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background">
        <div className="pixel-border bg-card/95 p-6 max-w-xs text-center">
          <h2 className="font-display text-xs text-destructive mb-3">
            {session.hostClosed ? 'HOST ENDED THE SESSION' : 'CONNECTION LOST'}
          </h2>
          <button onClick={onLeave} className="w-full py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80">
            RETURN TO MENU
          </button>
        </div>
      </div>
    );
  }

  if (session.status !== 'open') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-background">
        <p className="font-display text-xs text-muted-foreground">CONNECTING…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${screen === 'playing' || screen === 'gameover' ? '' : 'opacity-20'} transition-opacity duration-500`}
        style={{ imageRendering: 'pixelated' }}
      />

      {screen === 'village' && (
        <VillageWalkScene
          village={currentVillage}
          shop={shopState}
          missionState={session.missionState}
          profile={profile}
          cargo={cargoState}
          onSetSail={handleSetSail}
          onShop={() => setScreen('shop')}
          onMissionUpdate={handleMissionUpdate}
          onCargoUpdate={handleCargoUpdate}
          onDeliverCargo={handleDeliverCargo}
          isFirstVisit={false}
          onFirstVisitDone={() => {}}
          onMilestone={(id) => sendIntent({ type: 'CHOOSE_MILESTONE', milestoneId: id })}
          onOpenChart={() => setScreen('outpost')}
          outposts={session.outposts}
          friendship={session.friendship}
          hiredNpcIds={hiredNpcIds}
          onTalkedToNpc={handleTalkedToNpc}
          onHireCaptain={handleHireCaptain}
          paused={showPauseMenu || showCharacter || showControls || showSettings || chatOpen}
          otherPlayers={otherPlayersInVillage}
          onPositionUpdate={(x, y, dir) => sendIntent({ type: 'POSITION_UPDATE', villageId: currentVillageId, x, y, angle: dirToAngle(dir) })}
          showTouchControls={resolvedDevice === 'touch'}
        />
      )}

      {screen === 'outpost' && (
        <FoundOutpostModal
          coins={session.economy.coins}
          outpostCount={session.outposts.length}
          onFound={handleFoundOutpost}
          onBack={() => setScreen('village')}
        />
      )}

      {screen === 'village' && <CoopPlayersList players={session.players} selfId={session.selfId} empireRank={empireRank} />}

      {(screen === 'village' || screen === 'playing') && (
        <CoopChat
          entries={session.chatLog}
          onSend={text => sendIntent({ type: 'CHAT', text })}
          onOpenChange={setChatOpen}
          disabled={showPauseMenu || showCharacter || showControls || showSettings}
        />
      )}

      {screen === 'playing' && !gameState.gameOver && (
        <>
          <GameHUD score={gameState.score} coins={gameState.coins} distance={Math.floor(gameState.distance)}
            event={gameState.event} speedBoost={gameState.speedBoostTimer > 0} health={gameState.health} maxHealth={gameState.maxHealth} />
          <MiniMap state={gameState} discoveredIds={session.discovered} peers={peersAtSea} extraVillages={session.outposts} />
          <CoopPlayersList players={session.players} selfId={session.selfId} empireRank={empireRank} />
          {dockableVillage && <DockPrompt village={dockableVillage} onDock={() => dockAtVillage(dockableVillage)} />}
          {resolvedDevice === 'touch' && <TouchSteering inputRef={inputRef} />}
        </>
      )}

      {session.milestoneNotice && (
        <MilestoneBanner
          milestoneId={session.milestoneNotice}
          coins={session.economy.coins}
          onDismiss={session.clearMilestoneNotice}
        />
      )}

      {screen === 'gameover' && (
        <GameOverScreen score={gameState.score} coins={gameState.coins} distance={Math.floor(gameState.distance)}
          highScore={0} onRestart={handleRestart} onMenu={handleReturnToVillage} />
      )}

      {screen === 'shop' && (
        <ShopScreen shop={shopState} onUpdate={handleShopUpdate} onBack={() => setScreen('village')} />
      )}

      {session.missionNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pixel-border bg-destructive/20 text-destructive px-4 py-2 font-display text-[10px] animate-fade-in pointer-events-none">
          {session.missionNotice}
        </div>
      )}

      {showPauseMenu && (screen === 'playing' || screen === 'village') && (
        <PauseMenu
          isSailing={screen === 'playing'}
          muted={muted}
          onResume={() => setShowPauseMenu(false)}
          onToggleSound={handleToggleSound}
          onAbandonVoyage={screen === 'playing' ? () => { setShowPauseMenu(false); handleReturnToVillage(); } : undefined}
          onCharacter={() => { setShowPauseMenu(false); setShowCharacter(true); }}
          onControls={() => { setShowPauseMenu(false); setShowControls(true); }}
          onSettings={() => { setShowPauseMenu(false); setShowSettings(true); }}
          onMainMenu={() => { setShowPauseMenu(false); if (screen === 'playing') bankVoyageCoins(); stopGame(); stopAmbient(); client.close(); onLeave(); }}
        />
      )}

      {showCharacter && <CharacterScreen profile={profile} onUpdate={handleProfileUpdate} onClose={() => setShowCharacter(false)} />}
      {showControls && <ControlsScreen onClose={() => setShowControls(false)} boatSkin={boatSkin} />}
      {showSettings && (
        <SettingsScreen
          settings={settings}
          onUpdate={handleSettingsUpdate}
          resolvedDevice={resolvedDevice}
          gamepadConnected={gamepadConnected}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default CoopGame;
