import React, { useEffect, useRef } from 'react';
import { sfxButtonClick } from '../game/sfx';
import { drawCollectible, drawObstacle, drawPixelBoat, createInitialState } from '../game/engine';
import { Collectible, Obstacle, BoatSkin } from '../game/types';

interface ControlsScreenProps {
  onClose: () => void;
  boatSkin: BoatSkin;
}

const CONTROLS: { keys: string; action: string }[] = [
  { keys: 'W A S D', action: 'Move / accelerate' },
  { keys: '↑ ↓ ← →', action: 'Move / accelerate (alt.)' },
  { keys: 'Click + drag / touch', action: 'Steer toward cursor' },
  { keys: 'E', action: 'Dock, interact, talk' },
  { keys: 'Space (village)', action: 'Interact / talk (alt.)' },
  { keys: 'Space (at sea)', action: 'Fire the bow cannon' },
  { keys: 'M', action: 'Open the captain\'s chart' },
  { keys: 'ESC', action: 'Pause menu' },
];

const GAMEPAD_CONTROLS: { keys: string; action: string }[] = [
  { keys: 'Left Stick / D-Pad', action: 'Move / accelerate' },
  { keys: 'A / Cross', action: 'Dock, interact, talk' },
  { keys: 'X / Square', action: 'Fire the bow cannon' },
  { keys: 'Y / Triangle', action: 'Open the captain\'s chart' },
  { keys: 'Menu / Options', action: 'Pause menu' },
];

// Renders using the exact same drawing routines the game itself uses at sea,
// so the legend always matches whatever is actually on screen — never a
// hand-drawn approximation that can drift out of sync.
const SpriteIcon: React.FC<{ size?: number; draw: (ctx: CanvasRenderingContext2D) => void }> = ({ size = 40, draw }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    draw(ctx);
    ctx.restore();
  }, [draw, size]);

  return (
    <canvas
      ref={ref} width={size} height={size} className="shrink-0"
      style={{ imageRendering: 'pixelated', width: size, height: size, backgroundColor: 'rgba(255,255,255,0.05)' }}
    />
  );
};

const fakeCollectible = (type: Collectible['type']): Collectible => ({ x: 0, y: 0, type, collected: false, bobOffset: 0, value: 0 });
const fakeObstacle = (type: Obstacle['type'], radius: number, rotation = 0): Obstacle => ({ x: 0, y: 0, type, radius, rotation });
const shipState = { ...createInitialState(), boatAngle: 0, boatTilt: 0, boatSpeed: 2 };

interface LegendItem { name: string; desc: string; icon: React.ReactNode; }

const YOUR_SHIP = (skin: BoatSkin): LegendItem => ({
  name: 'Your Ship', desc: `The ${skin.name} — whatever's docked at the village is this same boat.`,
  icon: <SpriteIcon size={56} draw={ctx => drawPixelBoat(ctx, shipState, skin, 1)} />,
});

const COLLECTIBLES: LegendItem[] = [
  {
    name: 'Coin', desc: 'Worth 1 ◆. Scattered across open water.',
    icon: <SpriteIcon draw={ctx => drawCollectible(ctx, fakeCollectible('coin'), 1)} />,
  },
  {
    name: 'Crate', desc: 'Worth 5 ◆. Bulkier — harder to miss, better payout.',
    icon: <SpriteIcon draw={ctx => drawCollectible(ctx, fakeCollectible('crate'), 1)} />,
  },
  {
    name: 'Speed Boost', desc: 'Temporary burst of speed — also the only way to sink enemy boats (ram them while boosted).',
    icon: <SpriteIcon draw={ctx => drawCollectible(ctx, fakeCollectible('boost'), 1)} />,
  },
];

const HAZARDS: LegendItem[] = [
  {
    name: 'Rock', desc: 'Stationary. Damages you on collision.',
    icon: <SpriteIcon draw={ctx => drawObstacle(ctx, fakeObstacle('rock', 15), 1)} />,
  },
  {
    name: 'Enemy Boat', desc: 'Chases you when close. Rams you for damage — or ram it back while boosted to sink it.',
    icon: <SpriteIcon draw={ctx => drawObstacle(ctx, fakeObstacle('boat', 15, 0), 1)} />,
  },
  {
    name: 'Storm', desc: 'A dark, drifting squall. Reduces visibility and worsens the wind.',
    icon: <SpriteIcon draw={ctx => drawObstacle(ctx, fakeObstacle('storm', 16), 1)} />,
  },
];

const PixelIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={28} height={28} viewBox="0 0 16 16" shapeRendering="crispEdges" className="shrink-0">
    {children}
  </svg>
);

const MARKERS: LegendItem[] = [
  {
    name: 'Known Port', desc: 'A village you\'ve discovered. Dock here to trade, take missions, and rest.',
    icon: (
      <PixelIcon>
        <rect x={6} y={2} width={4} height={4} fill="hsl(40, 70%, 60%)" transform="rotate(45 8 8)" />
        <rect x={5} y={5} width={6} height={6} fill="hsl(40, 70%, 60%)" transform="rotate(45 8 8)" />
      </PixelIcon>
    ),
  },
  {
    name: 'Uncharted Port', desc: 'A village you haven\'t found yet — follow the gold waypoint arrow.',
    icon: (
      <PixelIcon>
        <circle cx={8} cy={8} r={4} fill="hsl(210, 15%, 45%)" />
      </PixelIcon>
    ),
  },
  {
    name: 'Waypoint Arrow', desc: 'Teal points to your mission target, gold to the nearest unexplored port, green points home.',
    icon: (
      <PixelIcon>
        <polygon points="8,2 13,13 8,10 3,13" fill="hsl(180, 45%, 62%)" />
      </PixelIcon>
    ),
  },
];

const LegendRow: React.FC<{ item: LegendItem }> = ({ item }) => (
  <div className="flex items-center gap-3 p-2 pixel-border bg-secondary/10">
    {item.icon}
    <div className="min-w-0">
      <div className="font-display text-[9px] text-foreground">{item.name}</div>
      <div className="font-body text-sm text-muted-foreground leading-snug">{item.desc}</div>
    </div>
  </div>
);

const ControlsScreen: React.FC<ControlsScreenProps> = ({ onClose, boatSkin }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in pixel-border bg-card/95 p-4 md:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[10px] text-primary">CONTROLS &amp; THE SEA</h2>
          <button onClick={() => { sfxButtonClick(); onClose(); }} className="font-body text-lg text-muted-foreground hover:text-foreground">[X]</button>
        </div>

        <div className="mb-5">
          <label className="font-display text-[7px] text-muted-foreground block mb-2">CONTROLS</label>
          <div className="flex flex-col gap-1.5">
            {CONTROLS.map(c => (
              <div key={c.keys} className="flex items-center justify-between p-2 pixel-border bg-secondary/10">
                <span className="font-display text-[9px] text-primary shrink-0">{c.keys}</span>
                <span className="font-body text-sm text-muted-foreground text-right ml-3">{c.action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="font-display text-[7px] text-muted-foreground block mb-2">GAMEPAD (XBOX / PS4 / PS5)</label>
          <div className="flex flex-col gap-1.5">
            {GAMEPAD_CONTROLS.map(c => (
              <div key={c.keys} className="flex items-center justify-between p-2 pixel-border bg-secondary/10">
                <span className="font-display text-[9px] text-primary shrink-0">{c.keys}</span>
                <span className="font-body text-sm text-muted-foreground text-right ml-3">{c.action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="font-display text-[7px] text-muted-foreground block mb-2">YOUR SHIP</label>
          <LegendRow item={YOUR_SHIP(boatSkin)} />
        </div>

        <div className="mb-5">
          <label className="font-display text-[7px] text-muted-foreground block mb-2">COLLECTIBLES</label>
          <div className="flex flex-col gap-2">
            {COLLECTIBLES.map(item => <LegendRow key={item.name} item={item} />)}
          </div>
        </div>

        <div className="mb-5">
          <label className="font-display text-[7px] text-muted-foreground block mb-2">HAZARDS</label>
          <div className="flex flex-col gap-2">
            {HAZARDS.map(item => <LegendRow key={item.name} item={item} />)}
          </div>
        </div>

        <div>
          <label className="font-display text-[7px] text-muted-foreground block mb-2">VILLAGES &amp; NAVIGATION</label>
          <div className="flex flex-col gap-2">
            {MARKERS.map(item => <LegendRow key={item.name} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsScreen;
