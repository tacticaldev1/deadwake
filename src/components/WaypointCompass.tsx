import React, { useEffect, useState } from 'react';
import { GameState } from '../game/types';
import { Village } from '../game/villages';

interface WaypointCompassProps {
  state: GameState;
  targetVillage: Village | null;
  mysteryVillage?: Village | null;
  homeVillage?: Village | null;
}

// Edge-of-screen arrow pointing to mission destination when off-screen.
// Falls back to the nearest undiscovered village, then to home, so there's always a heading to follow.
const WaypointCompass: React.FC<WaypointCompassProps> = ({ state, targetVillage, mysteryVillage, homeVillage }) => {
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const target = targetVillage || mysteryVillage || homeVillage;
  if (!target) return null;
  const isMystery = !targetVillage && !!mysteryVillage;
  const isHome = !targetVillage && !mysteryVillage;

  const dx = target.x - state.boatX;
  const dy = target.y - state.boatY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Position arrow at edge of screen towards target
  const margin = 60;
  const halfW = viewport.w / 2 - margin;
  const halfH = viewport.h / 2 - margin;

  // Clamp to screen edge rectangle
  const tan = Math.tan(angle);
  let x = 0;
  let y = 0;
  if (Math.abs(dx * halfH) > Math.abs(dy * halfW)) {
    // Hits left/right edge
    x = dx > 0 ? halfW : -halfW;
    y = x * tan;
  } else {
    // Hits top/bottom edge
    y = dy > 0 ? halfH : -halfH;
    x = y / tan;
  }

  const cx = viewport.w / 2 + x;
  const cy = viewport.h / 2 + y;

  const arrowColor = isMystery ? 'hsl(40, 55%, 55%)' : isHome ? 'hsl(140, 35%, 55%)' : 'hsl(180, 45%, 62%)';
  const glowColor = isMystery ? 'hsl(40, 55%, 40%)' : isHome ? 'hsl(140, 35%, 35%)' : 'hsl(180, 30%, 40%)';

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: cx,
        top: cy,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="flex flex-col items-center gap-1">
        <div
          className="w-0 h-0"
          style={{
            transform: `rotate(${angle + Math.PI / 2}rad)`,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderBottom: `14px solid ${arrowColor}`,
            filter: `drop-shadow(0 0 4px ${glowColor})`,
          }}
        />
        <div className="pixel-border bg-card/95 px-2 py-1">
          <div className={`font-display text-[9px] whitespace-nowrap ${isMystery ? 'text-accent' : isHome ? 'text-green-400' : 'text-primary'}`}>
            {isMystery ? 'UNCHARTED' : isHome ? 'HOME' : target.name}
          </div>
          <div className="font-body text-sm text-muted-foreground text-center">{Math.floor(distance)}m</div>
        </div>
      </div>
    </div>
  );
};

export default WaypointCompass;
