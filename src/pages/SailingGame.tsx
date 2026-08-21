import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GameScreen, ShopState } from '../game/types';
import { useGameLoop } from '../game/useGameLoop';
import { loadShopState, saveShopState } from '../game/shopData';
import { MissionState, Mission, loadMissionState, saveMissionState } from '../game/missions';
import { DIALOGUES } from '../game/dialogue';
import { VILLAGES, Village, getVillage, findNearbyVillage } from '../game/villages';
import { resumeAudio, sfxCollectCoin, sfxCollectCrate, sfxBoost, sfxCrash, sfxButtonClick, startAmbient, stopAmbient } from '../game/sfx';
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
import TouchSteering from '../components/TouchSteering';
import { useIsTouchDevice } from '../hooks/use-touch-device';

type Screen = GameScreen | 'village';

const SailingGame: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [shop, setShop] = useState<ShopState>(loadShopState());
  const [missionState, setMissionState] = useState<MissionState>(loadMissionState());
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('deadwake_tutorial_done'));
  const [showAdmin, setShowAdmin] = useState(false);
  const [isFirstHouseVisit, setIsFirstHouseVisit] = useState(() => !localStorage.getItem('deadwake_house_done'));
  const [firstVillageVisit, setFirstVillageVisit] = useState(() => !localStorage.getItem('deadwake_visited_port'));
  const [currentVillageId, setCurrentVillageId] = useState<string>('haven');
  const [activeMissionDuringPlay, setActiveMissionDuringPlay] = useState<Mission | null>(null);
  const [lastDockedVillageId, setLastDockedVillageId] = useState<string>('haven');
  const [dockableVillage, setDockableVillage] = useState<Village | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const missionTarget = activeMissionDuringPlay?.target || null;
  const { gameState, startGame, stopGame, inputRef } = useGameLoop(canvasRef, missionTarget);
  const isTouchDevice = useIsTouchDevice();

  const currentVillage = getVillage(currentVillageId) || VILLAGES[0];
  const targetVillage = activeMissionDuringPlay?.toVillage ? getVillage(activeMissionDuringPlay.toVillage) || null : null;

  const prevCoinsRef = useRef(0);
  const prevBoostRef = useRef(false);
  const prevGameOverRef = useRef(false);

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
    if (gs.gameOver && !prevGameOverRef.current) sfxCrash();
    prevGameOverRef.current = gs.gameOver;
  }, [gameState.coins, gameState.speedBoostTimer, gameState.gameOver, screen]);

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
  }, [gameState.coins, gameState.time, screen, activeMissionDuringPlay]);

  const completeMissionInSea = useCallback((mission: Mission) => {
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
  }, [missionState, shop]);

  // Docking detection: check every state update if boat is near a village
  useEffect(() => {
    if (screen !== 'playing' || gameState.gameOver) {
      if (dockableVillage) setDockableVillage(null);
      return;
    }
    const nearby = findNearbyVillage(gameState.boatX, gameState.boatY);
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
        const last = getVillage(lastDockedVillageId);
        if (last) {
          const dx = gameState.boatX - last.x;
          const dy = gameState.boatY - last.y;
          if (Math.sqrt(dx * dx + dy * dy) > last.radius + 200) {
            setLastDockedVillageId('');
          }
        }
      }
    }
  }, [gameState.boatX, gameState.boatY, gameState.gameOver, screen, lastDockedVillageId, dockableVillage]);

  const dockAtVillage = useCallback((village: Village) => {
    sfxButtonClick();
    stopGame();
    stopAmbient();
    // Award pickup coins earned during sail into shop wallet
    const updated = { ...shop, coins: shop.coins + gameState.coins };
    if (gameState.score > shop.highScore) updated.highScore = gameState.score;
    setShop(updated);
    saveShopState(updated);
    setCurrentVillageId(village.id);
    setLastDockedVillageId(village.id);
    setDockableVillage(null);
    setScreen('village');
  }, [shop, gameState, stopGame]);

  // Keyboard: E to dock
  useEffect(() => {
    if (screen !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && dockableVillage) dockAtVillage(dockableVillage);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, dockableVillage, dockAtVillage]);

  // Flow: Menu → House (first) → Village(Haven)
  const handlePlay = useCallback(() => {
    resumeAudio();
    setScreen('house');
  }, []);

  const handleHouseComplete = useCallback(() => {
    if (isFirstHouseVisit) {
      setIsFirstHouseVisit(false);
      localStorage.setItem('deadwake_house_done', '1');
    }
    setCurrentVillageId('haven');
    setScreen('village');
  }, [isFirstHouseVisit]);

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
        startGame();
        // Spawn player at current village position
        const v = getVillage(currentVillageId);
        if (v) {
          // Small nudge south so the boat starts just outside the dock
          setTimeout(() => {}, 0);
        }
      }, 100);
    }
  }, [startGame, showTutorial, currentVillageId]);

  const handleTutorialDone = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('deadwake_tutorial_done', '1');
    setTimeout(() => startGame(), 100);
  }, [startGame]);

  const handleRestart = useCallback(() => {
    const updated = { ...shop, coins: shop.coins + gameState.coins };
    if (gameState.score > shop.highScore) updated.highScore = gameState.score;
    setShop(updated);
    saveShopState(updated);
    prevCoinsRef.current = 0;
    prevBoostRef.current = false;
    prevGameOverRef.current = false;
    setScreen('playing');
    setTimeout(() => startGame(), 100);
  }, [shop, gameState, startGame]);

  const handleReturnToVillage = useCallback(() => {
    stopGame();
    stopAmbient();
    const updated = { ...shop, coins: shop.coins + gameState.coins };
    if (gameState.score > shop.highScore) updated.highScore = gameState.score;
    setShop(updated);
    saveShopState(updated);
    setScreen('village');
  }, [shop, gameState, stopGame]);

  const handleMenu = useCallback(() => {
    stopGame();
    stopAmbient();
    setScreen('menu');
  }, [stopGame]);

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
    }
  }, [missionState, shop]);

  const handleAdmin = useCallback(() => setShowAdmin(true), []);

  const handleFirstVillageVisitDone = useCallback(() => {
    setFirstVillageVisit(false);
    localStorage.setItem('deadwake_visited_port', '1');
  }, []);

  // Game over → back to village
  useEffect(() => {
    if (gameState.gameOver && screen === 'playing') {
      stopAmbient();
      const timer = setTimeout(() => {
        const updated = { ...shop, coins: shop.coins + gameState.coins };
        if (gameState.score > shop.highScore) updated.highScore = gameState.score;
        setShop(updated);
        saveShopState(updated);
        setScreen('gameover');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.gameOver, screen]);

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
        <MainMenu onPlay={handlePlay} onShop={() => setScreen('shop')} onAdmin={handleAdmin}
          highScore={shop.highScore} coins={shop.coins} />
      )}

      {screen === 'house' && (
        <HouseScene onComplete={handleHouseComplete} isFirstTime={isFirstHouseVisit} />
      )}

      {screen === 'village' && (
        <VillageWalkScene
          village={currentVillage}
          shop={shop}
          missionState={missionState}
          onSetSail={handleSetSail}
          onShop={() => setScreen('shop')}
          onMissionUpdate={handleMissionUpdate}
          isFirstVisit={firstVillageVisit && currentVillageId === 'haven'}
          onFirstVisitDone={handleFirstVillageVisitDone}
        />
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
          <MiniMap state={gameState} />
          {activeMissionDuringPlay && <MissionHUD mission={activeMissionDuringPlay} />}
          {targetVillage && <WaypointCompass state={gameState} targetVillage={targetVillage} />}
          {dockableVillage && (
            <DockPrompt village={dockableVillage} onDock={() => dockAtVillage(dockableVillage)} />
          )}
          {isTouchDevice && <TouchSteering inputRef={inputRef} />}
        </>
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
        <AdminPanel shop={shop} onUpdate={handleShopUpdate} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
};

export default SailingGame;
