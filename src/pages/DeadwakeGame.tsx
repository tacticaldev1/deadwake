import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GameScreen, ShopState } from '../game/types';
import { useGameLoop } from '../game/useGameLoop';
import { useGamepad } from '../game/useGamepad';
import { loadShopState, saveShopState, BOAT_SKINS } from '../game/shopData';
import { MissionState, Mission, loadMissionState, saveMissionState } from '../game/missions';
import { VILLAGES, Village, getVillage, getAllVillages, findNearbyVillage, loadDiscovery, saveDiscovery, markDiscovered, findNearestUndiscovered, DiscoveryState, loadCurrentVillage, saveCurrentVillage } from '../game/villages';
import { OutpostState, loadOutposts, saveOutposts, outpostCost, foundNewOutpost } from '../game/outposts';
import { getEmpireRank } from '../game/empireRank';
import {
  resumeAudio, sfxCollectCoin, sfxCollectCrate, sfxBoost, sfxCrash, startAmbient, stopAmbient, isMuted, setMuted,
  sfxRamHit, sfxMissionComplete, sfxMissionFail, sfxDock, sfxDiscovery, sfxEnding, sfxPauseToggle, sfxButtonClick,
} from '../game/sfx';
import { PlayerProfile, loadProfile, saveProfile } from '../game/profile';
import { CargoState, loadCargoState, saveCargoState, dropOffCargo, loseCargoAtSea } from '../game/cargo';
import { MilestoneState, loadMilestones, saveMilestones, markMilestoneEarned } from '../game/milestones';
import { FriendshipState, loadFriendship, saveFriendship, bumpFriendshipWithGift } from '../game/friendship';
import { NPC_PORTRAITS } from '../game/dialogue';
import { AutomationState, loadAutomation, saveAutomation, hireCaptain, tickCaptains } from '../game/automation';
import MainMenu from '../components/MainMenu';
import HouseScene from '../components/HouseScene';
import GameHUD from '../components/GameHUD';
import GameOverScreen from '../components/GameOverScreen';
import ShopScreen from '../components/ShopScreen';
import MiniMap from '../components/MiniMap';
import TutorialOverlay from '../components/TutorialOverlay';
import AdminPanel from '../components/AdminPanel';
import VillageWalkScene from '../components/VillageWalkScene';
import MissionHUD from '../components/MissionHUD';
import DockPrompt from '../components/DockPrompt';
import WaypointCompass from '../components/WaypointCompass';
import MilestoneBanner from '../components/MilestoneBanner';
import FoundOutpostModal from '../components/FoundOutpostModal';
import ChartOverlay from '../components/ChartOverlay';
import PauseMenu from '../components/PauseMenu';
import CharacterScreen from '../components/CharacterScreen';
import ControlsScreen from '../components/ControlsScreen';

type Screen = GameScreen | 'village' | 'outpost';

interface DeadwakeGameProps {
  onEnterCoop?: () => void;
}

const DeadwakeGame: React.FC<DeadwakeGameProps> = ({ onEnterCoop }) => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [shop, setShop] = useState<ShopState>(loadShopState());
  // Declared before missionState/currentVillageId — both of those need the
  // outpost roster at load time (an active mission or last-known position
  // can point at a founded outpost, not just one of the base 5 villages).
  const [outposts, setOutposts] = useState<OutpostState>(() => loadOutposts());
  const [missionState, setMissionState] = useState<MissionState>(loadMissionState(outposts.outposts));
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('deadwake_tutorial_done'));
  const [showAdmin, setShowAdmin] = useState(false);
  const [isFirstHouseVisit, setIsFirstHouseVisit] = useState(() => !localStorage.getItem('deadwake_house_done'));
  const [firstVillageVisit, setFirstVillageVisit] = useState(() => !localStorage.getItem('deadwake_visited_port'));
  const [currentVillageId, setCurrentVillageIdRaw] = useState<string>(() => loadCurrentVillage(outposts.outposts));
  const [activeMissionDuringPlay, setActiveMissionDuringPlay] = useState<Mission | null>(null);
  const [lastDockedVillageId, setLastDockedVillageId] = useState<string>('haven');
  const [dockableVillage, setDockableVillage] = useState<Village | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryState>(loadDiscovery());
  const [milestones, setMilestones] = useState<MilestoneState>(loadMilestones());
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [muted, setMutedState] = useState(() => isMuted());
  const [missionNotice, setMissionNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [cargo, setCargo] = useState<CargoState>(() => loadCargoState());
  const [friendship, setFriendship] = useState<FriendshipState>(() => loadFriendship());
  const [automation, setAutomation] = useState<AutomationState>(() => loadAutomation());
  // Session-only tracking of which dialogue tier already granted friendship
  // per NPC — not persisted, worst case a reload re-credits one tier, which
  // is low-stakes given how small the amount is.
  const friendshipDialogueSeenRef = useRef<Record<string, string>>({});

  // Xbox / PS4 / PS5 controller support — translated into the same synthetic key
  // events the keyboard already drives, so every input handler works unchanged.
  useGamepad(useCallback((connected: boolean) => {
    setMissionNotice(connected ? 'CONTROLLER CONNECTED' : 'CONTROLLER DISCONNECTED');
    setTimeout(() => setMissionNotice(null), 2500);
  }, []));

  // Keep the last village visited persisted across sessions.
  const setCurrentVillageId = useCallback((id: string) => {
    setCurrentVillageIdRaw(id);
    saveCurrentVillage(id);
  }, []);

  const bumpFriendship = useCallback((npcId: string, amount: number) => {
    setFriendship(prev => {
      const { next, giftCoins } = bumpFriendshipWithGift(prev, npcId, amount);
      saveFriendship(next);
      if (giftCoins > 0) {
        const npcName = NPC_PORTRAITS[npcId]?.name || 'They';
        setShop(prevShop => {
          const updated = { ...prevShop, coins: prevShop.coins + giftCoins };
          saveShopState(updated);
          return updated;
        });
        setMissionNotice(`${npcName.toUpperCase()} GAVE YOU A GIFT: ◆${giftCoins}`);
        setTimeout(() => setMissionNotice(null), 3000);
      }
      return next;
    });
  }, []);

  // Admin-panel-only: sets friendship directly, bypassing gift payouts —
  // same "cheat, don't simulate" convention as every other AdminPanel setter
  // (addCoins, discoverAll, etc.), which write state straight through.
  const handleFriendshipUpdate = useCallback((next: FriendshipState) => {
    setFriendship(next);
    saveFriendship(next);
  }, []);

  const handleTalkedToNpc = useCallback((npcId: string, dialogueId: string) => {
    if (friendshipDialogueSeenRef.current[npcId] === dialogueId) return;
    friendshipDialogueSeenRef.current[npcId] = dialogueId;
    bumpFriendship(npcId, 2);
  }, [bumpFriendship]);

  const handleHireCaptain = useCallback((npcId: string, npcName: string) => {
    setAutomation(prev => {
      const next = hireCaptain(prev, npcId, npcName, currentVillageId, getAllVillages(outposts.outposts), discovery.discovered);
      if (!next) {
        setMissionNotice(
          prev.hired.length >= 3 ? 'Already have a full crew of captains.' : "Not enough charted routes for them yet."
        );
        setTimeout(() => setMissionNotice(null), 3000);
        return prev;
      }
      saveAutomation(next);
      setMissionNotice(`${npcName.toUpperCase()} IS NOW RUNNING A TRADE ROUTE`);
      setTimeout(() => setMissionNotice(null), 3000);
      return next;
    });
  }, [currentVillageId, outposts.outposts, discovery.discovered]);

  // Passive income from hired captains, ticking while the game is open —
  // deliberately not offline/idle progress, so no "time since last session"
  // math is needed anywhere.
  useEffect(() => {
    const t = setInterval(() => {
      setAutomation(current => {
        if (current.hired.length === 0) return current;
        const earned = tickCaptains(current.hired, getAllVillages(outposts.outposts), friendship);
        if (earned > 0) {
          setShop(prevShop => {
            const updated = { ...prevShop, coins: prevShop.coins + earned };
            saveShopState(updated);
            return updated;
          });
          setMissionNotice(`YOUR CAPTAINS EARNED ◆${earned}`);
          setTimeout(() => setMissionNotice(null), 2500);
        }
        return current;
      });
    }, 45000);
    return () => clearInterval(t);
  }, [outposts.outposts, friendship]);

  const hiredNpcIds = new Set(automation.hired.map(h => h.npcId));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const missionTarget = activeMissionDuringPlay?.target || null;
  const { gameState, startGame, stopGame, setPaused } = useGameLoop(canvasRef, missionTarget, discovery.discovered);

  const boatSkin = BOAT_SKINS.find(s => s.id === shop.selectedSkin) || BOAT_SKINS[0];
  const currentVillage = getVillage(currentVillageId, outposts.outposts) || VILLAGES[0];
  const targetVillage = activeMissionDuringPlay?.toVillage ? getVillage(activeMissionDuringPlay.toVillage, outposts.outposts) || null : null;
  const mysteryVillage = !targetVillage ? findNearestUndiscovered(gameState.boatX, gameState.boatY, discovery.discovered, outposts.outposts) : null;
  const homeVillage = !targetVillage && !mysteryVillage ? getVillage('haven') || null : null;
  const empireRank = getEmpireRank({
    coins: shop.coins,
    discoveredCount: discovery.discovered.length,
    outpostCount: outposts.outposts.length,
    completedMissionsCount: missionState.completedMissions.length,
  });

  const prevCoinsRef = useRef(0);
  const prevBoostRef = useRef(false);
  const prevGameOverRef = useRef(false);
  const prevRamKillsRef = useRef(0);

  // Audio hooks
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
    if (gs.gameOver && !prevGameOverRef.current) sfxCrash();
    prevGameOverRef.current = gs.gameOver;
  }, [gameState.coins, gameState.speedBoostTimer, gameState.ramKills, gameState.gameOver, screen]);

  // Non-village mission progress (collect/survive)
  useEffect(() => {
    if (screen !== 'playing' || !activeMissionDuringPlay) return;
    const mission = activeMissionDuringPlay;
    if (mission.type === 'collect' && mission.collectGoal) {
      if (mission.collectCurrent !== gameState.coins) {
        setActiveMissionDuringPlay({ ...mission, collectCurrent: gameState.coins });
      }
      if (gameState.coins >= mission.collectGoal) completeMissionInSea(mission);
    }
    if (mission.type === 'survive' && mission.surviveTime) {
      if (mission.surviveCurrent !== gameState.time) {
        setActiveMissionDuringPlay({ ...mission, surviveCurrent: gameState.time });
      }
      if (gameState.time >= mission.surviveTime) completeMissionInSea(mission);
    }
    if (mission.type === 'hunt' && mission.huntGoal) {
      if (mission.huntCurrent !== gameState.ramKills) {
        setActiveMissionDuringPlay({ ...mission, huntCurrent: gameState.ramKills });
      }
      if (gameState.ramKills >= mission.huntGoal) completeMissionInSea(mission);
    }
    if (mission.type === 'race' && mission.raceTimeLimit && gameState.time >= mission.raceTimeLimit) {
      failMissionInSea(mission);
    }
  }, [gameState.coins, gameState.time, gameState.ramKills, screen, activeMissionDuringPlay]);

  const completeMissionInSea = useCallback((mission: Mission) => {
    sfxMissionComplete();
    const updated: MissionState = {
      ...missionState,
      completedMissions: [...missionState.completedMissions, mission.id],
      activeMission: null,
    };
    setMissionState(updated);
    saveMissionState(updated);
    const newShop = { ...shop, coins: shop.coins + mission.reward.coins };
    setShop(newShop);
    saveShopState(newShop);
    setActiveMissionDuringPlay(null);
    bumpFriendship(mission.giver, 15);
  }, [missionState, shop, bumpFriendship]);

  // A timed mission (race) ran out — send it back to the board instead of losing it outright.
  const failMissionInSea = useCallback((mission: Mission) => {
    sfxMissionFail();
    const stillListed = missionState.availableMissions.some(m => m.id === mission.id);
    const updated: MissionState = {
      ...missionState,
      activeMission: null,
      availableMissions: stillListed ? missionState.availableMissions : [...missionState.availableMissions, mission],
    };
    setMissionState(updated);
    saveMissionState(updated);
    setActiveMissionDuringPlay(null);
    setMissionNotice(`${mission.title.toUpperCase()} — OUT OF TIME`);
    setTimeout(() => setMissionNotice(null), 3000);
  }, [missionState]);

  // Docking detection: check every state update if boat is near a village
  useEffect(() => {
    if (screen !== 'playing' || gameState.gameOver) {
      if (dockableVillage) setDockableVillage(null);
      return;
    }
    const nearby = findNearbyVillage(gameState.boatX, gameState.boatY, outposts.outposts);
    // Show dock prompt only if it's a village we haven't just left,
    // OR if we've moved sufficiently far from the last dock.
    if (nearby && nearby.id !== lastDockedVillageId) {
      if (dockableVillage?.id !== nearby.id) setDockableVillage(nearby);
    } else if (nearby && nearby.id === lastDockedVillageId) {
      if (dockableVillage) setDockableVillage(null);
    } else {
      if (dockableVillage) setDockableVillage(null);
      // Clear last docked once far enough away
      if (lastDockedVillageId) {
        const last = getVillage(lastDockedVillageId, outposts.outposts);
        if (last) {
          const dx = gameState.boatX - last.x;
          const dy = gameState.boatY - last.y;
          if (Math.sqrt(dx * dx + dy * dy) > last.radius + 200) {
            setLastDockedVillageId('');
          }
        }
      }
    }
  }, [gameState.boatX, gameState.boatY, gameState.gameOver, screen, lastDockedVillageId, dockableVillage, outposts.outposts]);

  // Banks whatever coins/score were earned in the current voyage into the persistent
  // shop wallet. Safe to call any time a voyage ends (dock, death, or abandoning via
  // the pause menu) — must NOT be called again afterwards, or coins double-count.
  const bankRunCoins = useCallback(() => {
    setShop(prev => {
      const updated = { ...prev, coins: prev.coins + gameState.coins };
      if (gameState.score > prev.highScore) updated.highScore = gameState.score;
      saveShopState(updated);
      return updated;
    });
  }, [gameState.coins, gameState.score]);

  const dockAtVillage = useCallback((village: Village) => {
    stopGame();
    stopAmbient();
    bankRunCoins();
    setCurrentVillageId(village.id);
    setLastDockedVillageId(village.id);
    setDockableVillage(null);
    setScreen('village');
    if (!discovery.discovered.includes(village.id)) {
      const nextDiscovery = markDiscovered(discovery, village.id);
      setDiscovery(nextDiscovery);
      saveDiscovery(nextDiscovery);
      sfxDiscovery();
    } else {
      sfxDock();
    }
  }, [stopGame, bankRunCoins, discovery]);

  // A milestone (the old "ending") is a story payoff, not a stopping point —
  // it overlays whatever screen is already active and never touches `screen`.
  const handleMilestone = useCallback((id: string) => {
    sfxEnding();
    setMilestoneId(id);
    setMilestones(prev => {
      const next = markMilestoneEarned(prev, id);
      saveMilestones(next);
      return next;
    });
  }, []);

  // Founds a new outpost — deducts the scaling cost, generates the Village
  // (deterministic from its own sequential id, see outposts.ts), and returns
  // to the village screen so the player can see the Chart Table update.
  const handleFoundOutpost = useCallback(() => {
    const cost = outpostCost(outposts.outposts.length);
    if (shop.coins < cost) return;
    const newShop = { ...shop, coins: shop.coins - cost };
    setShop(newShop);
    saveShopState(newShop);
    const outpost = foundNewOutpost(getAllVillages(outposts.outposts));
    const nextOutposts = { outposts: [...outposts.outposts, outpost] };
    setOutposts(nextOutposts);
    saveOutposts(nextOutposts);
    setScreen('village');
  }, [shop, outposts]);

  // Keyboard: E to dock
  useEffect(() => {
    if (screen !== 'playing' || showPauseMenu || showCharacter || showControls) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && dockableVillage) dockAtVillage(dockableVillage);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, showPauseMenu, showCharacter, showControls, dockableVillage, dockAtVillage]);

  // Keyboard: M to toggle the full chart
  useEffect(() => {
    if (screen !== 'playing' || showPauseMenu || showCharacter || showControls) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') setShowChart(s => !s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, showPauseMenu, showCharacter, showControls]);

  // Keyboard: ESC closes the controls/character screen or chart if open, otherwise toggles the pause menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'escape') return;
      if (showControls) { setShowControls(false); return; }
      if (showCharacter) { setShowCharacter(false); return; }
      if (screen === 'playing' && showChart) { setShowChart(false); return; }
      if (screen === 'playing' || screen === 'village') { sfxPauseToggle(); setShowPauseMenu(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, showChart, showCharacter, showControls]);

  // Freeze the simulation (without resetting it) while paused or customizing during a voyage
  useEffect(() => {
    if (screen === 'playing') setPaused(showPauseMenu || showCharacter || showControls);
  }, [showPauseMenu, showCharacter, showControls, screen, setPaused]);

  // Flow: Menu → House (first voyage ever, only) → village
  const handlePlay = useCallback(() => {
    resumeAudio();
    setScreen(isFirstHouseVisit ? 'house' : 'village');
  }, [isFirstHouseVisit]);

  const handleHouseComplete = useCallback(() => {
    setIsFirstHouseVisit(false);
    localStorage.setItem('deadwake_house_done', '1');
    setCurrentVillageId('haven');
    setScreen('village');
  }, []);

  // Boats set sail just outside the dock of whichever village they're departing from,
  // instead of always the world origin (previously a dead-code stub did nothing here).
  const spawnPointForVillage = useCallback((id: string) => {
    const v = getVillage(id, outposts.outposts);
    return v ? { x: v.x, y: v.y + v.radius + 40 } : { x: 0, y: 0 };
  }, [outposts.outposts]);

  const handleSetSail = useCallback((mission?: Mission) => {
    startAmbient();
    prevCoinsRef.current = 0;
    prevBoostRef.current = false;
    prevGameOverRef.current = false;
    setActiveMissionDuringPlay(mission || null);
    setLastDockedVillageId(currentVillageId);
    setScreen('playing');
    if (!showTutorial) {
      setTimeout(() => {
        const { x, y } = spawnPointForVillage(currentVillageId);
        startGame(x, y);
      }, 100);
    }
  }, [startGame, showTutorial, currentVillageId, spawnPointForVillage]);

  const handleTutorialDone = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('deadwake_tutorial_done', '1');
    setTimeout(() => {
      const { x, y } = spawnPointForVillage(currentVillageId);
      startGame(x, y);
    }, 100);
  }, [startGame, currentVillageId, spawnPointForVillage]);

  const handleRestart = useCallback(() => {
    // The game-over effect already banked this run's coins; starting fresh here.
    prevCoinsRef.current = 0;
    prevBoostRef.current = false;
    prevGameOverRef.current = false;
    setScreen('playing');
    setTimeout(() => {
      const { x, y } = spawnPointForVillage(currentVillageId);
      startGame(x, y);
    }, 100);
  }, [startGame, currentVillageId, spawnPointForVillage]);

  const handleReturnToVillage = useCallback(() => {
    stopGame();
    stopAmbient();
    bankRunCoins();
    setScreen('village');
  }, [stopGame, bankRunCoins]);

  const handleMenu = useCallback(() => {
    stopGame();
    stopAmbient();
    setScreen('menu');
  }, [stopGame]);

  const handleToggleSound = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }, [muted]);

  const handlePauseResume = useCallback(() => setShowPauseMenu(false), []);

  const handlePauseAbandon = useCallback(() => {
    setShowPauseMenu(false);
    handleReturnToVillage();
  }, [handleReturnToVillage]);

  const handlePauseMainMenu = useCallback(() => {
    setShowPauseMenu(false);
    // Leaving mid-voyage would otherwise strand this run's uncollected coins.
    if (screen === 'playing') bankRunCoins();
    handleMenu();
  }, [screen, bankRunCoins, handleMenu]);

  // Fast-travels straight to Haven from anywhere — distinct from "Return to Port",
  // which just ends the voyage at whatever village you departed from.
  const handlePauseReturnHome = useCallback(() => {
    setShowPauseMenu(false);
    if (screen === 'playing') {
      stopGame();
      stopAmbient();
      bankRunCoins();
    }
    setCurrentVillageId('haven');
    setScreen('village');
  }, [screen, stopGame, bankRunCoins, setCurrentVillageId]);

  const handleOpenCharacter = useCallback(() => {
    setShowPauseMenu(false);
    setShowCharacter(true);
  }, []);

  const handleOpenControls = useCallback(() => {
    setShowPauseMenu(false);
    setShowControls(true);
  }, []);

  const handleProfileUpdate = useCallback((next: PlayerProfile) => {
    setProfile(next);
    saveProfile(next);
  }, []);

  const handleCargoUpdate = useCallback((next: CargoState) => {
    setCargo(next);
    saveCargoState(next);
  }, []);

  // Selling a trade good pays out immediately into the shop wallet.
  const handleDeliverCargo = useCallback((itemId: string) => {
    setCargo(prevCargo => {
      const { state: nextCargo, payout } = dropOffCargo(prevCargo, itemId);
      saveCargoState(nextCargo);
      if (payout > 0) {
        setShop(prevShop => {
          const updated = { ...prevShop, coins: prevShop.coins + payout };
          saveShopState(updated);
          return updated;
        });
      }
      return nextCargo;
    });
  }, []);

  const handleShopUpdate = useCallback((newShop: ShopState) => {
    setShop(newShop);
    saveShopState(newShop);
  }, []);

  const handleMissionUpdate = useCallback((newState: MissionState) => {
    setMissionState(newState);
    saveMissionState(newState);
    // If a delivery was completed via VillageScreen, award coins
    const wasActive = missionState.activeMission;
    if (wasActive && !newState.activeMission && newState.completedMissions.includes(wasActive.id)) {
      const newShop = { ...shop, coins: shop.coins + wasActive.reward.coins };
      setShop(newShop);
      saveShopState(newShop);
      bumpFriendship(wasActive.giver, 15);
    }
  }, [missionState, shop, bumpFriendship]);

  // Secret cheat code: type A-D-M-I-N in order, from anywhere in the game
  // (menu, village, mid-voyage, shop — not just the main menu screen), to
  // open the admin panel.
  useEffect(() => {
    const CODE = 'admin';
    let typed = '';
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k.length !== 1 || !/[a-z]/.test(k)) return;
      typed = (typed + k).slice(-CODE.length);
      if (typed === CODE) {
        typed = '';
        sfxButtonClick();
        setShowAdmin(true);
      }
    };
    window.addEventListener('keydown', onDown);
    return () => window.removeEventListener('keydown', onDown);
  }, []);

  const handleDiscoveryUpdate = useCallback((next: DiscoveryState) => {
    setDiscovery(next);
    saveDiscovery(next);
  }, []);

  const handleAdminTeleport = useCallback((id: string) => {
    setCurrentVillageId(id);
    setScreen('village');
  }, [setCurrentVillageId]);

  const handleFirstVillageVisitDone = useCallback(() => {
    setFirstVillageVisit(false);
    localStorage.setItem('deadwake_visited_port', '1');
  }, []);

  // Game over → coins are banked to the shop wallet immediately (so they survive
  // even if the tab closes before the crash animation finishes); the screen
  // transition itself is what's delayed, purely for the visual beat. Any trade
  // goods still aboard are lost and fined at the same time.
  useEffect(() => {
    if (gameState.gameOver && screen === 'playing') {
      stopAmbient();
      bankRunCoins();
      setCargo(prevCargo => {
        const { state: nextCargo, fine } = loseCargoAtSea(prevCargo);
        saveCargoState(nextCargo);
        if (fine > 0) {
          setShop(prevShop => {
            const updated = { ...prevShop, coins: Math.max(0, prevShop.coins - fine) };
            saveShopState(updated);
            return updated;
          });
          setMissionNotice(`CARGO LOST AT SEA — FINED ${fine} ◆`);
          setTimeout(() => setMissionNotice(null), 3000);
        }
        return nextCargo;
      });
      const timer = setTimeout(() => setScreen('gameover'), 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.gameOver, screen, bankRunCoins]);

  // Canvas resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${screen === 'playing' || screen === 'gameover' ? '' : 'opacity-20'} transition-opacity duration-500`}
        style={{ imageRendering: 'pixelated' }}
      />

      {screen === 'menu' && (
        <MainMenu onPlay={handlePlay} onShop={() => setScreen('shop')} onCharacter={() => setShowCharacter(true)}
          onControls={() => setShowControls(true)} onCoop={() => onEnterCoop?.()}
          highScore={shop.highScore} coins={shop.coins} playerName={profile.name} empireRank={empireRank} />
      )}

      {screen === 'house' && (
        <HouseScene onComplete={handleHouseComplete} />
      )}

      {screen === 'village' && (
        <VillageWalkScene
          village={currentVillage}
          shop={shop}
          missionState={missionState}
          profile={profile}
          cargo={cargo}
          onSetSail={handleSetSail}
          onShop={() => setScreen('shop')}
          onMissionUpdate={handleMissionUpdate}
          onCargoUpdate={handleCargoUpdate}
          onDeliverCargo={handleDeliverCargo}
          isFirstVisit={firstVillageVisit && currentVillageId === 'haven'}
          onFirstVisitDone={handleFirstVillageVisitDone}
          onMilestone={handleMilestone}
          onOpenChart={() => setScreen('outpost')}
          outposts={outposts.outposts}
          friendship={friendship}
          hiredNpcIds={hiredNpcIds}
          onTalkedToNpc={handleTalkedToNpc}
          onHireCaptain={handleHireCaptain}
          paused={showPauseMenu || showCharacter || showControls}
        />
      )}

      {screen === 'outpost' && (
        <FoundOutpostModal
          coins={shop.coins}
          outpostCount={outposts.outposts.length}
          onFound={handleFoundOutpost}
          onBack={() => setScreen('village')}
        />
      )}

      {milestoneId && (
        <MilestoneBanner milestoneId={milestoneId} coins={shop.coins} onDismiss={() => setMilestoneId(null)} />
      )}

      {screen === 'playing' && showTutorial && (
        <TutorialOverlay onDismiss={handleTutorialDone} />
      )}

      {screen === 'playing' && !gameState.gameOver && !showTutorial && (
        <>
          <GameHUD score={gameState.score} coins={gameState.coins}
            distance={Math.floor(gameState.distance)} event={gameState.event}
            speedBoost={gameState.speedBoostTimer > 0} health={gameState.health}
            maxHealth={gameState.maxHealth} />
          <MiniMap state={gameState} discoveredIds={discovery.discovered} extraVillages={outposts.outposts} />
          {activeMissionDuringPlay && <MissionHUD mission={activeMissionDuringPlay} elapsed={gameState.time} />}
          <WaypointCompass state={gameState} targetVillage={targetVillage} mysteryVillage={mysteryVillage} homeVillage={homeVillage} />
          {dockableVillage && (
            <DockPrompt village={dockableVillage} onDock={() => dockAtVillage(dockableVillage)} />
          )}
          {showChart && (
            <ChartOverlay state={gameState} discoveredIds={discovery.discovered} onClose={() => setShowChart(false)} extraVillages={outposts.outposts} />
          )}
        </>
      )}

      {missionNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pixel-border bg-destructive/20 text-destructive px-4 py-2 font-display text-[10px] animate-fade-in pointer-events-none">
          {missionNotice}
        </div>
      )}

      {showPauseMenu && (screen === 'playing' || screen === 'village') && (
        <PauseMenu
          isSailing={screen === 'playing'}
          muted={muted}
          onResume={handlePauseResume}
          onToggleSound={handleToggleSound}
          onAbandonVoyage={screen === 'playing' ? handlePauseAbandon : undefined}
          onReturnHome={screen === 'playing' || currentVillageId !== 'haven' ? handlePauseReturnHome : undefined}
          onCharacter={handleOpenCharacter}
          onControls={handleOpenControls}
          onMainMenu={handlePauseMainMenu}
        />
      )}

      {showCharacter && (
        <CharacterScreen profile={profile} onUpdate={handleProfileUpdate} onClose={() => setShowCharacter(false)} />
      )}

      {showControls && (
        <ControlsScreen onClose={() => setShowControls(false)} boatSkin={boatSkin} />
      )}

      {screen === 'gameover' && (
        <GameOverScreen score={gameState.score} coins={gameState.coins}
          distance={Math.floor(gameState.distance)} highScore={shop.highScore}
          onRestart={handleRestart} onMenu={handleReturnToVillage} />
      )}

      {screen === 'shop' && (
        <ShopScreen shop={shop} onUpdate={handleShopUpdate}
          onBack={() => setScreen('village')} />
      )}

      {showAdmin && (
        <AdminPanel
          shop={shop} onUpdate={handleShopUpdate} onClose={() => setShowAdmin(false)}
          missionState={missionState} onMissionUpdate={handleMissionUpdate}
          discovery={discovery} onDiscoveryUpdate={handleDiscoveryUpdate}
          currentVillageId={currentVillageId} onTeleport={handleAdminTeleport}
          cargo={cargo} onCargoUpdate={handleCargoUpdate}
          outposts={outposts.outposts}
          onPreviewMilestone={handleMilestone}
          muted={muted} onToggleSound={handleToggleSound}
          friendship={friendship} onFriendshipUpdate={handleFriendshipUpdate}
        />
      )}
    </div>
  );
};

export default DeadwakeGame;
