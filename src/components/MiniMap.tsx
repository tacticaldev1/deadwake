import React from 'react';
import { GameState } from '../game/types';
import { Village, getAllVillages } from '../game/villages';

export interface MiniMapPeer {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface MiniMapProps {
  state: GameState;
  discoveredIds: string[];
  peers?: MiniMapPeer[];
  extraVillages?: Village[];
}

const MAP_SIZE = 140;
const MAP_RANGE = 1100;

const MiniMap: React.FC<MiniMapProps> = ({ state, discoveredIds, peers, extraVillages }) => {
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
        className="pixel-border overflow-hidden relative"
        style={{
          width: MAP_SIZE,
          height: MAP_SIZE,
          background: 'hsl(220, 15%, 5%)',
        }}
      >
        <svg width={MAP_SIZE} height={MAP_SIZE} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}>
          {/* Grid lines */}
          <line x1={MAP_SIZE/2} y1={0} x2={MAP_SIZE/2} y2={MAP_SIZE} stroke="hsl(180, 20%, 18%)" strokeWidth={0.5} />
          <line x1={0} y1={MAP_SIZE/2} x2={MAP_SIZE} y2={MAP_SIZE/2} stroke="hsl(180, 20%, 18%)" strokeWidth={0.5} />

          {/* Villages */}
          {getAllVillages(extraVillages).filter(v => inRange(v.x, v.y)).map(v => {
            const p = toMap(v.x, v.y);
            const known = v.id === 'haven' || discoveredIds.includes(v.id);
            return (
              <g key={v.id}>
                {known ? (
                  <>
                    <rect x={p.x - 3} y={p.y - 3} width={6} height={6} transform={`rotate(45 ${p.x} ${p.y})`} fill="hsl(40, 70%, 60%)" stroke="hsl(40, 90%, 80%)" strokeWidth={0.5} />
                    <text x={p.x} y={p.y - 6} fontSize={6} fill="hsl(45, 40%, 92%)" textAnchor="middle" fontFamily="'Press Start 2P', monospace" stroke="rgba(5,8,10,0.9)" strokeWidth={1.5} paintOrder="stroke">
                      {v.name.split(' ')[0]}
                    </text>
                  </>
                ) : (
                  <circle cx={p.x} cy={p.y} r={2.5} fill="hsl(210, 15%, 45%)" opacity={0.6} />
                )}
              </g>
            );
          })}

          {/* Obstacles - pixel squares */}
          {obstacles.filter(o => inRange(o.x, o.y)).map((o, i) => {
            const p = toMap(o.x, o.y);
            const color = o.type === 'rock' ? 'hsl(0, 0%, 45%)' : o.type === 'storm' ? 'hsl(250, 25%, 35%)' : 'hsl(0, 50%, 50%)';
            return <rect key={`o${i}`} x={p.x - 2} y={p.y - 2} width={4} height={4} fill={color} />;
          })}

          {/* Collectibles - tiny pixels */}
          {collectibles.filter(c => !c.collected && inRange(c.x, c.y)).map((c, i) => {
            const p = toMap(c.x, c.y);
            const color = c.type === 'coin' ? 'hsl(40, 60%, 55%)' : c.type === 'crate' ? 'hsl(30, 40%, 45%)' : 'hsl(180, 50%, 55%)';
            return <rect key={`c${i}`} x={p.x - 1} y={p.y - 1} width={3} height={3} fill={color} />;
          })}

          {/* Party members - small diamonds in their own boat color */}
          {peers?.filter(p => inRange(p.x, p.y)).map(p => {
            const pos = toMap(p.x, p.y);
            return (
              <rect key={p.id} x={pos.x - 2.5} y={pos.y - 2.5} width={5} height={5}
                transform={`rotate(45 ${pos.x} ${pos.y})`} fill={p.color} stroke="hsla(0,0%,96%,0.9)" strokeWidth={0.5} />
            );
          })}

          {/* Player - arrow */}
          <g transform={`translate(${MAP_SIZE / 2}, ${MAP_SIZE / 2}) rotate(${(boatAngle * 180) / Math.PI + 90})`}>
            <polygon points="0,-5 4,4 -4,4" fill="hsl(180, 45%, 60%)" stroke="hsl(180, 60%, 80%)" strokeWidth={0.5} />
          </g>
        </svg>

        {/* Compass rose */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 font-display text-[7px] text-primary/90" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>N</div>

        <div className="absolute bottom-0.5 right-1 font-body text-xs text-muted-foreground">
          MAP
        </div>
      </div>
    </div>
  );
};

export default MiniMap;
