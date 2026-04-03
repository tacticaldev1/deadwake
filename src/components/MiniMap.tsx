import React from 'react';
import { GameState } from '../game/types';

interface MiniMapProps {
  state: GameState;
}

const MAP_SIZE = 120;
const MAP_RANGE = 800;

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
    <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
      <div
        className="pixel-border overflow-hidden"
        style={{
          width: MAP_SIZE,
          height: MAP_SIZE,
          background: 'hsl(220, 15%, 5%)',
        }}
      >
        <svg width={MAP_SIZE} height={MAP_SIZE} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}>
          {/* Grid lines */}
          <line x1={MAP_SIZE/2} y1={0} x2={MAP_SIZE/2} y2={MAP_SIZE} stroke="hsl(180, 20%, 15%)" strokeWidth={0.5} />
          <line x1={0} y1={MAP_SIZE/2} x2={MAP_SIZE} y2={MAP_SIZE/2} stroke="hsl(180, 20%, 15%)" strokeWidth={0.5} />

          {/* Obstacles - pixel squares */}
          {obstacles.filter(o => inRange(o.x, o.y)).map((o, i) => {
            const p = toMap(o.x, o.y);
            const color = o.type === 'rock' ? 'hsl(0, 0%, 35%)' : o.type === 'storm' ? 'hsl(250, 20%, 25%)' : 'hsl(0, 40%, 40%)';
            return <rect key={`o${i}`} x={p.x - 2} y={p.y - 2} width={4} height={4} fill={color} />;
          })}

          {/* Collectibles - tiny pixels */}
          {collectibles.filter(c => !c.collected && inRange(c.x, c.y)).map((c, i) => {
            const p = toMap(c.x, c.y);
            const color = c.type === 'coin' ? 'hsl(40, 50%, 45%)' : c.type === 'crate' ? 'hsl(30, 30%, 35%)' : 'hsl(180, 40%, 45%)';
            return <rect key={`c${i}`} x={p.x - 1} y={p.y - 1} width={3} height={3} fill={color} />;
          })}

          {/* Player - arrow */}
          <g transform={`translate(${MAP_SIZE / 2}, ${MAP_SIZE / 2}) rotate(${(boatAngle * 180) / Math.PI + 90})`}>
            <polygon points="0,-4 3,3 -3,3" fill="hsl(180, 30%, 40%)" />
          </g>
        </svg>

        <div className="absolute bottom-0 right-1 font-body text-[10px] text-muted-foreground/40">
          MAP
        </div>
      </div>
    </div>
  );
};

export default MiniMap;
