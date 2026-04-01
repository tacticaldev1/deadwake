import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GameScreen, ShopState } from '../game/types';
import { useGameLoop } from '../game/useGameLoop';
import { loadShopState, saveShopState } from '../game/shopData';
import { resumeAudio, sfxCollectCoin, sfxCollectCrate, sfxBoost, sfxCrash, sfxSplash, startAmbient, stopAmbient } from '../game/sfx';
import MainMenu from '../components/MainMenu';
import GameHUD from '../components/GameHUD';
import GameOverScreen from '../components/GameOverScreen';
import ShopScreen from '../components/ShopScreen';
import MiniMap from '../components/MiniMap';
import TutorialOverlay from '../components/TutorialOverlay';
import AdminPanel from '../components/AdminPanel';

const SailingGame: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [shop, setShop] = useState<ShopState>(loadShopState());
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('sailgame_tutorial_done'));
  const [showAdmin, setShowAdmin] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, startGame, stopGame } = useGameLoop(canvasRef);

  // SFX triggers based on game state changes
  const prevCoinsRef = useRef(0);
  const prevBoostRef = useRef(false);
  const prevGameOverRef = useRef(false);

  useEffect(() => {
    if (screen !== 'playing') return;
    const gs = gameState;

    // Coin/crate collected
    if (gs.coins > prevCoinsRef.current) {
      const diff = gs.coins - prevCoinsRef.current;
      if (diff >= 5) sfxCollectCrate();
      else sfxCollectCoin();
    }
    prevCoinsRef.current = gs.coins;

    // Boost
    if (gs.speedBoostTimer > 0 && !prevBoostRef.current) sfxBoost();
    prevBoostRef.current = gs.speedBoostTimer > 0;

    // Crash
    if (gs.gameOver && !prevGameOverRef.current) sfxCrash();
    prevGameOverRef.current = gs.gameOver;
  }, [gameState.coins, gameState.speedBoostTimer, gameState.gameOver, screen]);

  const handlePlay = useCallback(() => {
    resumeAudio();
    startAmbient();
    prevCoinsRef.current = 0;
    prevBoostRef.current = false;
    prevGameOverRef.current = false;
    if (showTutorial) {
      setScreen('playing');
      // Tutorial shows over the game, game starts after dismiss
    } else {
      setScreen('playing');
      setTimeout(() => startGame(), 100);
    }
  }, [startGame, showTutorial]);

  const handleTutorialDone = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('sailgame_tutorial_done', '1');
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

  const handleAdmin = useCallback(() => {
    setShowAdmin(true);
  }, []);

  // Check game over
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
        className={`absolute inset-0 w-full h-full ${screen !== 'playing' && screen !== 'gameover' ? 'opacity-30' : ''} transition-opacity duration-500`}
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
          />
          <MiniMap state={gameState} />
        </>
      )}

      {screen === 'gameover' && (
        <GameOverScreen
          score={gameState.score}
          coins={gameState.coins}
          distance={Math.floor(gameState.distance)}
          highScore={shop.highScore}
          onRestart={handleRestart}
          onMenu={handleMenu}
        />
      )}

      {screen === 'shop' && (
        <ShopScreen
          shop={shop}
          onUpdate={handleShopUpdate}
          onBack={() => setScreen('menu')}
        />
      )}

      {showAdmin && (
        <AdminPanel
          shop={shop}
          onUpdate={handleShopUpdate}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
};

export default SailingGame;
