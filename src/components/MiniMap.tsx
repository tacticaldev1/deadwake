import React from 'react';
import { GameState } from '../game/types';

interface MiniMapProps {
  state: GameState;
}

const MAP_SIZE = 140;
const MAP_RANGE = 800; // world units shown on minimap

const MiniMap: React.FC<MiniMapProps> = ({ state }) => {
  const { boatX, boatY, boatAngle, obstacles, collectibles } = state;

  const toMap = (wx: number, wy: number) => {
    const dx = wx - boatX;
    const dy = wy - boatY;
    const mx = MAP_SIZE / 2 + (dx / MAP_RANGE) * (MAP_SIZE / 2);
    const my = MAP_SIZE / 2 + (dy / MAP_RANGE) * (MAP_SIZE / 2);
    return { x: mx, y: my };
  };

  const inRange = (wx: number, wy: number) => {
    const dx = Math.abs(wx - boatX);
    const dy = Math.abs(wy - boatY);
    return dx < MAP_RANGE && dy < MAP_RANGE;
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
      <div
        className="rounded-xl border border-border/40 overflow-hidden backdrop-blur-sm"
        style={{
          width: MAP_SIZE,
          height: MAP_SIZE,
          background: 'rgba(10,30,60,0.7)',
        }}
      >
        <svg width={MAP_SIZE} height={MAP_SIZE} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}>
          {/* Range circles */}
          <circle cx={MAP_SIZE / 2} cy={MAP_SIZE / 2} r={MAP_SIZE / 4} fill="none" stroke="rgba(100,180,255,0.1)" strokeWidth={0.5} />
          <circle cx={MAP_SIZE / 2} cy={MAP_SIZE / 2} r={MAP_SIZE / 2 - 4} fill="none" stroke="rgba(100,180,255,0.08)" strokeWidth={0.5} />

          {/* Obstacles */}
          {obstacles.filter(o => inRange(o.x, o.y)).map((o, i) => {
            const p = toMap(o.x, o.y);
            const color = o.type === 'rock' ? '#888' : o.type === 'storm' ? '#446' : '#a64';
            return <circle key={`o${i}`} cx={p.x} cy={p.y} r={3} fill={color} opacity={0.8} />;
          })}

          {/* Collectibles */}
          {collectibles.filter(c => !c.collected && inRange(c.x, c.y)).map((c, i) => {
            const p = toMap(c.x, c.y);
            const color = c.type === 'coin' ? '#FFD700' : c.type === 'crate' ? '#C89040' : '#00BFFF';
            return <rect key={`c${i}`} x={p.x - 2} y={p.y - 2} width={4} height={4} fill={color} opacity={0.9} rx={1} />;
          })}

          {/* Player boat */}
          <g transform={`translate(${MAP_SIZE / 2}, ${MAP_SIZE / 2}) rotate(${(boatAngle * 180) / Math.PI + 90})`}>
            <polygon points="0,-5 3,4 -3,4" fill="hsl(195, 85%, 50%)" stroke="hsl(195, 85%, 70%)" strokeWidth={0.5} />
          </g>
        </svg>

        {/* Label */}
        <div className="absolute bottom-1 right-2 text-[8px] text-muted-foreground/50 font-body">
          MAP
        </div>
      </div>
    </div>
  );
};

export default MiniMap;
