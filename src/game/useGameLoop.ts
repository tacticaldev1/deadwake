import { useRef, useCallback, useEffect, useState } from 'react';
import { GameState } from './types';
import { InputState } from './engine';
import { createInitialState, updateGame, renderGame } from './engine';
import { BOAT_SKINS, SPEED_UPGRADES, loadShopState } from './shopData';
import { BoatSkin } from './types';

// Co-op sources its skin/speed-upgrade selection from the shared party
// economy (useCoopSession), not this PC's solo localStorage save — passing
// skinOverride lets CoopGame.tsx supply the real effective skin so sailing
// physics actually reflect what was bought, instead of silently falling back
// to whatever this machine's solo save happens to contain.
export function useGameLoop(canvasRef: React.RefObject<HTMLCanvasElement | null>, missionTarget?: { x: number; y: number; radius: number; label: string } | null, discoveredIds?: string[], skinOverride?: BoatSkin) {
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false, mouseAngle: null });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const [gameState, setGameState] = useState<GameState>(stateRef.current);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const skinOverrideRef = useRef(skinOverride);
  skinOverrideRef.current = skinOverride;

  const getSkin = useCallback((): BoatSkin => {
    if (skinOverrideRef.current) return skinOverrideRef.current;
    const shop = loadShopState();
    const base = BOAT_SKINS.find(s => s.id === shop.selectedSkin) || BOAT_SKINS[0];
    const upgrade = SPEED_UPGRADES.find(u => u.id === shop.selectedSpeedUpgrade) || SPEED_UPGRADES[0];
    return upgrade.speedMod === 1 ? base : { ...base, speedMod: base.speedMod * upgrade.speedMod };
  }, []);

  const loop = useCallback((timestamp: number) => {
    if (!runningRef.current) return;

    if (pausedRef.current) {
      // Keep the clock from jumping when we unpause, but don't advance simulation.
      lastTimeRef.current = timestamp;
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    stateRef.current = updateGame(stateRef.current, inputRef.current, dt, getSkin());

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderGame(ctx, stateRef.current, getSkin(), canvas.width, canvas.height, missionTarget || undefined, discoveredIds);
      }
    }

    setGameState({ ...stateRef.current });

    if (stateRef.current.gameOver) {
      runningRef.current = false;
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [canvasRef, getSkin, missionTarget, discoveredIds]);

  const startGame = useCallback((startX = 0, startY = 0) => {
    stateRef.current = createInitialState(startX, startY);
    lastTimeRef.current = performance.now();
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stopGame = useCallback(() => {
    runningRef.current = false;
    pausedRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused;
  }, []);

  // Keyboard input
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') inputRef.current.up = true;
      if (key === 's' || key === 'arrowdown') inputRef.current.down = true;
      if (key === 'a' || key === 'arrowleft') inputRef.current.left = true;
      if (key === 'd' || key === 'arrowright') inputRef.current.right = true;
    };
    const onUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') inputRef.current.up = false;
      if (key === 's' || key === 'arrowdown') inputRef.current.down = false;
      if (key === 'a' || key === 'arrowleft') inputRef.current.left = false;
      if (key === 'd' || key === 'arrowright') inputRef.current.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // Mouse/touch input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mouseDown = false;

    const getAngle = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - canvas.width / 2;
      const my = e.clientY - rect.top - canvas.height / 2;
      return Math.atan2(my, mx);
    };

    const onMouseDown = (e: MouseEvent) => { mouseDown = true; inputRef.current.mouseAngle = getAngle(e); inputRef.current.up = true; };
    const onMouseMove = (e: MouseEvent) => { if (mouseDown) inputRef.current.mouseAngle = getAngle(e); };
    const onMouseUp = () => { mouseDown = false; inputRef.current.mouseAngle = null; inputRef.current.up = false; };

    const onTouchStart = (e: TouchEvent) => { e.preventDefault(); inputRef.current.mouseAngle = getAngle(e.touches[0]); inputRef.current.up = true; };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); inputRef.current.mouseAngle = getAngle(e.touches[0]); };
    const onTouchEnd = () => { inputRef.current.mouseAngle = null; inputRef.current.up = false; };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [canvasRef]);

  return { gameState, startGame, stopGame, setPaused };
}
