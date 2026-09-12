import React, { useMemo } from 'react';
import { GameState } from '../game/types';
import { Village, getAllVillages } from '../game/villages';

interface ChartOverlayProps {
  state: GameState;
  discoveredIds: string[];
  onClose: () => void;
  extraVillages?: Village[];
}

const PAD = 400;
const VB = 600; // square viewBox; chart is letterboxed to fit the wider world extent

const ChartOverlay: React.FC<ChartOverlayProps> = ({ state, discoveredIds, onClose, extraVillages }) => {
  // Bounds are derived from whatever villages currently exist (base 5 +
  // founded outposts) instead of a fixed module constant, so the chart keeps
  // stretching to fit new outposts as they're founded further out.
  const villages = useMemo(() => getAllVillages(extraVillages), [extraVillages]);
  const { MINX, MAXX, MINY, MAXY, WORLD_W, WORLD_H } = useMemo(() => {
    const minx = Math.min(...villages.map(v => v.x)) - PAD;
    const maxx = Math.max(...villages.map(v => v.x)) + PAD;
    const miny = Math.min(...villages.map(v => v.y)) - PAD;
    const maxy = Math.max(...villages.map(v => v.y)) + PAD;
    return { MINX: minx, MAXX: maxx, MINY: miny, MAXY: maxy, WORLD_W: maxx - minx, WORLD_H: maxy - miny };
  }, [villages]);
  const scale = VB / Math.max(WORLD_W, WORLD_H);
  const offX = (VB - WORLD_W * scale) / 2;
  const offY = (VB - WORLD_H * scale) / 2;
  const toChart = (wx: number, wy: number) => ({
    x: offX + (wx - MINX) * scale,
    y: offY + (wy - MINY) * scale,
  });

  const player = toChart(state.boatX, state.boatY);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="pixel-border bg-card p-4 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-xs text-primary">CAPTAIN'S CHART</div>
          <button onClick={onClose} className="font-display text-[10px] text-muted-foreground hover:text-foreground">[M / ESC to close]</button>
        </div>

        <div className="pixel-border overflow-hidden" style={{ background: 'hsl(220, 20%, 6%)' }}>
          <svg width="100%" viewBox={`0 0 ${VB} ${VB}`} style={{ display: 'block' }}>
            {/* Grid */}
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={`gx${i}`} x1={0} y1={(i * VB) / 6} x2={VB} y2={(i * VB) / 6} stroke="hsl(180,15%,14%)" strokeWidth={0.5} />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={`gy${i}`} x1={(i * VB) / 6} y1={0} x2={(i * VB) / 6} y2={VB} stroke="hsl(180,15%,14%)" strokeWidth={0.5} />
            ))}

            {/* Route lines between discovered villages, faint */}
            {villages.filter(v => discoveredIds.includes(v.id) || v.id === 'haven').map((v, i, arr) => {
              if (i === 0) return null;
              const a = toChart(arr[i - 1].x, arr[i - 1].y);
              const b = toChart(v.x, v.y);
              return <line key={v.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(180,20%,25%)" strokeWidth={1} strokeDasharray="3,4" />;
            })}

            {/* Villages */}
            {villages.map(v => {
              const known = v.id === 'haven' || discoveredIds.includes(v.id);
              const p = toChart(v.x, v.y);
              return (
                <g key={v.id}>
                  {known ? (
                    <>
                      <rect x={p.x - 5} y={p.y - 5} width={10} height={10} transform={`rotate(45 ${p.x} ${p.y})`}
                        fill="hsl(40, 70%, 60%)" stroke="hsl(40, 95%, 85%)" strokeWidth={0.75} />
                      <text x={p.x} y={p.y - 11} fontSize={9} fill="hsl(45, 40%, 94%)" textAnchor="middle"
                        fontFamily="'Press Start 2P', monospace" stroke="rgba(5,8,10,0.9)" strokeWidth={2.5} paintOrder="stroke">
                        {v.name.toUpperCase()}
                      </text>
                    </>
                  ) : (
                    <>
                      <circle cx={p.x} cy={p.y} r={4} fill="hsl(210, 15%, 40%)" stroke="hsl(210,15%,55%)" strokeWidth={0.75} opacity={0.8} />
                      <text x={p.x} y={p.y - 10} fontSize={9} fill="hsl(210, 15%, 60%)" textAnchor="middle"
                        fontFamily="'Press Start 2P', monospace" stroke="rgba(5,8,10,0.9)" strokeWidth={2.5} paintOrder="stroke">
                        ???
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Player */}
            <g transform={`translate(${player.x}, ${player.y}) rotate(${(state.boatAngle * 180) / Math.PI + 90})`}>
              <polygon points="0,-7 5,6 -5,6" fill="hsl(180, 45%, 62%)" stroke="hsl(180, 60%, 85%)" strokeWidth={0.75} />
            </g>
          </svg>
        </div>

        <div className="mt-3 flex items-center gap-4 font-body text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-accent" style={{ transform: 'rotate(45deg)' }} /> known port</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/60" /> uncharted</span>
        </div>
      </div>
    </div>
  );
};

export default ChartOverlay;
