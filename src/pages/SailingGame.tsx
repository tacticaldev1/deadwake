import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GameScreen, ShopState } from '../game/types';
import { useGameLoop } from '../game/useGameLoop';
import { loadShopState, saveShopState } from '../game/shopData';
import { MissionState, Mission, loadMissionState, saveMissionState } from '../game/missions';
import { DIALOGUES } from '../game/dialogue';
import { resumeAudio, sfxCollectCoin, sfxCollectCrate, sfxBoost, sfxCrash, sfxSplash, startAmbient, stopAmbient } from '../game/sfx';
import MainMenu from '../components/MainMenu';
import GameHUD from '../components/GameHUD';
import GameOverScreen from '../components/GameOverScreen';
import ShopScreen from '../components/ShopScreen';
import MiniMap from '../components/MiniMap';
import TutorialOverlay from '../components/TutorialOverlay';
import AdminPanel from '../components/AdminPanel';
import PortScreen from '../components/PortScreen';
import MissionHUD from '../components/MissionHUD';
import DialogueBox from '../components/DialogueBox';

const SailingGame: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [shop, setShop] = useState<ShopState>(loadShopState());
  const [missionState, setMissionState] = useState<MissionState>(loadMissionState());
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('deadwake_tutorial_done'));
  const [showAdmin, setShowAdmin] = useState(false);
  const [firstPortVisit, setFirstPortVisit] = useState(() => !localStorage.getItem('deadwake_visited_port'));
  const [activeMissionDuringPlay, setActiveMissionDuringPlay] = useState<Mission | null>(null);
  const [missionCompleteDialogue, setMissionCompleteDialogue] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const missionTarget = activeMissionDuringPlay?.target || null;
  const { gameState, startGame, stopGame } = useGameLoop(canvasRef, missionTarget);

  // SFX triggers
  const prevCoinsRef = useRef(0);
  const prevBoostRef = useRef(false);
  const prevGameOverRef = useRef(false);

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

  // Mission progress tracking during gameplay
  useEffect(() => {
    if (screen !== 'playing' || !activeMissionDuringPlay) return;
    const mission = activeMissionDuringPlay;

    if (mission.type === 'collect' && mission.collectGoal) {
      const updated = { ...mission, collectCurrent: gameState.coins };
      setActiveMissionDuringPlay(updated);
      if (gameState.coins >= mission.collectGoal) {
        // Mission complete!
        completeMission(mission);
      }
    }

    if (mission.type === 'survive' && mission.surviveTime) {
      const elapsed = gameState.time;
      const updated = { ...mission, surviveCurrent: elapsed };
      setActiveMissionDuringPlay(updated);
      if (elapsed >= mission.surviveTime) {
        completeMission(mission);
      }
    }

    if (mission.type === 'delivery' && mission.target) {
      const dx = gameState.boatX - mission.target.x;
      const dy = gameState.boatY - mission.target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mission.target.radius) {
        completeMission(mission);
      }
    }
  }, [gameState.coins, gameState.time, gameState.boatX, gameState.boatY, screen, activeMissionDuringPlay]);

  const completeMission = useCallback((mission: Mission) => {
    const updated: MissionState = {
      ...missionState,
      completedMissions: [...missionState.completedMissions, mission.id],
      activeMission: null,
    };
    setMissionState(updated);
    saveMissionState(updated);

    // Add reward
    const newShop = { ...shop, coins: shop.coins + mission.reward.coins + gameState.coins };
    setShop(newShop);
    saveShopState(newShop);

    setActiveMissionDuringPlay(null);

    // Show completion dialogue or return to port
    if (mission.onCompleteDialogue) {
      setMissionCompleteDialogue(mission.onCompleteDialogue);
    }
  }, [missionState, shop, gameState.coins]);

  const handlePlay = useCallback(() => {
    resumeAudio();
    setScreen('port');
  }, []);

  const handleSetSail = useCallback((mission?: Mission) => {
    startAmbient();
    prevCoinsRef.current = 0;
    prevBoostRef.current = false;
    prevGameOverRef.current = false;
    setActiveMissionDuringPlay(mission || null);
    if (showTutorial) {
      setScreen('playing');
    } else {
      setScreen('playing');
      setTimeout(() => startGame(), 100);
    }
  }, [startGame, showTutorial]);

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

  const handleReturnToPort = useCallback(() => {
    stopGame();
    stopAmbient();
    const updated = { ...shop, coins: shop.coins + gameState.coins };
    if (gameState.score > shop.highScore) updated.highScore = gameState.score;
    setShop(updated);
    saveShopState(updated);
    setScreen('port');
  }, [shop, gameState, stopGame]);

  const handleMenu = useCallback(() => {
    stopGame();
    stopAmbient();
    const updated = { ...shop, coins: shop.coins + gameState.coins };
    if (gameState.score > shop.highScore) updated.highScore = gameState.score;
    setShop(updated);
    saveShopState(updated);
    setScreen('menu');
  }, [shop, gameState, stopGame]);

  const handleShopUpdate = useCallback((newShop: ShopState) => {
    setShop(newShop);
    saveShopState(newShop);
  }, []);

  const handleMissionUpdate = useCallback((newState: MissionState) => {
    setMissionState(newState);
    saveMissionState(newState);
  }, []);

  const handleAdmin = useCallback(() => {
    setShowAdmin(true);
  }, []);

  const handleFirstPortVisitDone = useCallback(() => {
    setFirstPortVisit(false);
    localStorage.setItem('deadwake_visited_port', '1');
  }, []);

  // Game over
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
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${screen === 'playing' || screen === 'gameover' ? '' : 'opacity-30'} transition-opacity duration-500`}
      />

      {screen === 'menu' && (
        <MainMenu
          onPlay={handlePlay}
          onShop={() => setScreen('shop')}
          onAdmin={handleAdmin}
          highScore={shop.highScore}
          coins={shop.coins}
        />
      )}

      {screen === 'port' && (
        <PortScreen
          shop={shop}
          missionState={missionState}
          onSetSail={handleSetSail}
          onShop={() => setScreen('shop')}
          onMissionUpdate={handleMissionUpdate}
          onShopUpdate={handleShopUpdate}
          firstVisit={firstPortVisit}
          onFirstVisitDone={handleFirstPortVisitDone}
        />
      )}

      {screen === 'playing' && showTutorial && (
        <TutorialOverlay onDismiss={handleTutorialDone} />
      )}

      {screen === 'playing' && !gameState.gameOver && !showTutorial && (
        <>
          <GameHUD
            score={gameState.score}
            coins={gameState.coins}
            distance={Math.floor(gameState.distance)}
            event={gameState.event}
            speedBoost={gameState.speedBoostTimer > 0}
            health={gameState.health}
            maxHealth={gameState.maxHealth}
          />
          <MiniMap state={gameState} />
          {activeMissionDuringPlay && (
            <MissionHUD mission={activeMissionDuringPlay} />
          )}
        </>
      )}

      {screen === 'gameover' && (
        <GameOverScreen
          score={gameState.score}
          coins={gameState.coins}
          distance={Math.floor(gameState.distance)}
          highScore={shop.highScore}
          onRestart={handleRestart}
          onMenu={handleReturnToPort}
        />
      )}

      {screen === 'shop' && (
        <ShopScreen
          shop={shop}
          onUpdate={handleShopUpdate}
          onBack={() => setScreen(screen === 'shop' ? 'port' : 'menu')}
        />
      )}

      {showAdmin && (
        <AdminPanel
          shop={shop}
          onUpdate={handleShopUpdate}
          onClose={() => setShowAdmin(false)}
        />
      )}

      {missionCompleteDialogue && DIALOGUES[missionCompleteDialogue] && (
        <DialogueBox
          sequence={DIALOGUES[missionCompleteDialogue]}
          onComplete={() => {
            setMissionCompleteDialogue(null);
            handleReturnToPort();
          }}
        />
      )}
    </div>
  );
};

export default SailingGame;
