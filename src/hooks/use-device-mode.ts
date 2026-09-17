import { useEffect, useState } from 'react';
import { DeviceMode } from '../game/settings';

function detectTouchCapable(): boolean {
  if (typeof window === 'undefined') return false;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const noHover = window.matchMedia?.('(hover: none)').matches ?? false;
  const hasTouchPoints = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return hasTouchPoints && (coarsePointer || noHover);
}

export type ResolvedDevice = 'desktop' | 'touch' | 'gamepad';

// Resolves the *effective* input scheme for on-screen UI: an explicit
// override picked in Settings always wins; "auto" prefers a connected
// gamepad, then touch-capability detection (by pointer/hover media
// features, not viewport width, so it survives window resizing), and
// falls back to desktop since keyboard/mouse always works.
export function useDeviceMode(gamepadConnected: boolean, override: DeviceMode): ResolvedDevice {
  const [touchCapable, setTouchCapable] = useState(detectTouchCapable);

  useEffect(() => {
    const update = () => setTouchCapable(detectTouchCapable());
    const pointerMql = window.matchMedia('(pointer: coarse)');
    const hoverMql = window.matchMedia('(hover: none)');
    pointerMql.addEventListener('change', update);
    hoverMql.addEventListener('change', update);
    window.addEventListener('orientationchange', update);
    update();
    return () => {
      pointerMql.removeEventListener('change', update);
      hoverMql.removeEventListener('change', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (override !== 'auto') return override;
  if (gamepadConnected) return 'gamepad';
  if (touchCapable) return 'touch';
  return 'desktop';
}
