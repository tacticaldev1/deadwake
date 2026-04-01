import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GameScreen, ShopState } from '../game/types';
import { useGameLoop } from '../game/useGameLoop';
import { loadShopState, saveShopState, BOAT_SKINS, SAIL_STYLES, TRAIL_EFFECTS } from '../game/shopData';
import MainMenu from '../components/MainMenu';
import GameHUD from '../components/GameHUD';
import GameOverScreen from '../components/GameOverScreen';
import ShopScreen from '../components/ShopScreen';

const SailingGame: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [shop, setShop] = useState<ShopState>(loadShopState());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, startGame, stopGame } = useGameLoop(canvasRef);

  const handlePlay = useCallback(() => {
    setScreen('playing');
    setTimeout(() => startGame(), 100);
  }, [startGame]);

  const handleRestart = useCallback(() => {
    // Save coins from game
    const updated = { ...shop, coins: shop.coins + gameState.coins };
    if (gameState.score > shop.highScore) updated.highScore = gameState.score;
    setShop(updated);
    saveShopState(updated);
    setScreen('playing');
    setTimeout(() => startGame(), 100);
  }, [shop, gameState, startGame]);

  const handleMenu = useCallback(() => {
    stopGame();
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

  // Check game over
  useEffect(() => {
    if (gameState.gameOver && screen === 'playing') {
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
          highScore={shop.highScore}
          coins={shop.coins}
        />
      )}

      {screen === 'playing' && !gameState.gameOver && (
        <GameHUD
          score={gameState.score}
          coins={gameState.coins}
          distance={Math.floor(gameState.distance)}
          event={gameState.event}
          speedBoost={gameState.speedBoostTimer > 0}
        />
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
    </div>
  );
};

export default SailingGame;
