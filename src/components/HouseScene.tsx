import React, { useState, useEffect, useCallback, useRef } from 'react';

interface HouseSceneProps {
  onComplete: () => void;
}

const INTRO_LINES = [
  { text: "...", delay: 1500 },
  { text: "The house is quiet now.", delay: 80 },
  { text: "Father's coat still hangs by the door.", delay: 80 },
  { text: "The kettle is cold.", delay: 80 },
  { text: "On the table — a letter, a map, and a key.", delay: 80 },
  { text: '"If you\'re reading this, the tide has taken me."', delay: 60 },
  { text: '"The boat is yours. The routes are yours."', delay: 60 },
  { text: '"Keep them safe. Keep them hidden."', delay: 60 },
  { text: '"Something stirs in the deep water, child."', delay: 60 },
  { text: '"Do not sail east. Not yet."', delay: 60 },
  { text: "You fold the letter. You take the key.", delay: 80 },
  { text: "The harbor is waiting.", delay: 80 },
];

const W = 320;
const H = 240;
function px(v: number) { return Math.round(v); }

// Same blocky pixel-figure technique as VillageWalkScene's drawPerson, kept
// as its own small copy here rather than exported/shared — this scene draws
// dad as a translucent, motionless memory (not a walking NPC), which needs
// different alpha/pose handling than the shared walking-figure helper covers.
function drawDad(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Soft glow behind him
  const grad = ctx.createRadialGradient(x, y - 6, 2, x, y - 6, 22);
  grad.addColorStop(0, 'hsla(210, 40%, 70%, 0.15)');
  grad.addColorStop(1, 'hsla(210, 40%, 70%, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 22, y - 28, 44, 44);
  // Legs
  ctx.fillStyle = 'hsl(220, 12%, 18%)';
  ctx.fillRect(px(x - 4), px(y - 2), 3, 8);
  ctx.fillRect(px(x + 1), px(y - 2), 3, 8);
  // Coat (long, dark)
  ctx.fillStyle = 'hsl(210, 15%, 22%)';
  ctx.fillRect(px(x - 6), px(y - 16), 12, 16);
  // Coat trim
  ctx.fillStyle = 'hsl(30, 25%, 35%)';
  ctx.fillRect(px(x - 6), px(y - 16), 12, 2);
  // Head
  ctx.fillStyle = 'hsl(25, 20%, 45%)';
  ctx.fillRect(px(x - 3), px(y - 23), 6, 6);
  // Hair/beard
  ctx.fillStyle = 'hsl(210, 8%, 55%)';
  ctx.fillRect(px(x - 3), px(y - 24), 6, 2);
  ctx.fillRect(px(x - 3), px(y - 18), 6, 2);
  ctx.restore();
}

function renderRoom(ctx: CanvasRenderingContext2D, time: number, showLetter: boolean, dadAlpha: number) {
  ctx.clearRect(0, 0, W, H);

  // Floor
  ctx.fillStyle = 'hsl(25, 15%, 12%)';
  ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = 'hsl(25, 10%, 18%)';
  ctx.fillRect(0, H - 40, W, 2);

  // Back wall
  ctx.fillStyle = 'hsl(220, 10%, 8%)';
  ctx.fillRect(0, 0, W, H - 40);

  // Window with moonlight
  const wx = W - 64, wy = 32, ww = 40, wh = 52;
  const winGrad = ctx.createRadialGradient(wx + ww / 2, wy + wh / 2, 4, wx + ww / 2, wy + wh / 2, 40);
  winGrad.addColorStop(0, 'hsl(210, 20%, 15%)');
  winGrad.addColorStop(1, 'hsl(220, 15%, 6%)');
  ctx.fillStyle = winGrad;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = 'hsl(220, 8%, 15%)';
  ctx.lineWidth = 2;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.fillStyle = 'hsl(220, 8%, 15%)';
  ctx.fillRect(px(wx + ww / 2 - 0.5), wy, 1, wh);
  ctx.fillRect(wx, px(wy + wh / 2 - 0.5), ww, 1);

  // Table
  const tx = 30, ty = H - 54;
  ctx.fillStyle = 'hsl(25, 20%, 15%)';
  ctx.fillRect(tx, ty, 60, 14);
  ctx.fillStyle = 'hsl(25, 15%, 12%)';
  ctx.fillRect(tx + 4, ty + 14, 4, 14);
  ctx.fillRect(tx + 52, ty + 14, 4, 14);

  // Letter on table
  if (showLetter) {
    ctx.fillStyle = `hsla(40, 15%, 55%, ${0.85 + Math.sin(time * 2) * 0.1})`;
    ctx.fillRect(tx + 8, ty - 6, 14, 10);
  }

  // Candle + flame + light pool
  const cx = tx + 42, cy = ty;
  const flicker = 0.85 + Math.sin(time * 4.5) * 0.15;
  const lightGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 70);
  lightGrad.addColorStop(0, `hsla(40, 60%, 45%, ${0.16 * flicker})`);
  lightGrad.addColorStop(1, 'hsla(40, 60%, 45%, 0)');
  ctx.fillStyle = lightGrad;
  ctx.fillRect(cx - 70, cy - 70, 140, 140);
  ctx.fillStyle = 'hsl(40, 20%, 60%)';
  ctx.fillRect(cx - 1, cy - 8, 3, 8);
  ctx.fillStyle = `hsla(40, 80%, 60%, ${flicker})`;
  ctx.fillRect(cx - 1, cy - 12, 3, 5);

  // Coat hook + dad's coat, by the door
  ctx.fillStyle = 'hsl(220, 8%, 18%)';
  ctx.fillRect(10, H - 40 - 62, 2, 6);
  ctx.fillStyle = 'hsl(210, 15%, 20%)';
  ctx.fillRect(6, H - 40 - 58, 10, 16);

  // Door frame
  ctx.strokeStyle = 'hsl(220, 8%, 13%)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(38, 8);
  ctx.lineTo(38, H - 40);
  ctx.stroke();

  // Dad, standing quietly near the window — a memory more than a presence
  if (dadAlpha > 0) drawDad(ctx, W - 90, H - 40, dadAlpha);

  // Vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
  vg.addColorStop(0, 'hsla(0,0%,0%,0)');
  vg.addColorStop(1, 'hsla(0,0%,0%,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// Shown exactly once, the very first time the player presses "Begin Voyage" —
// DeadwakeGame.tsx gates this behind isFirstHouseVisit so returning to Haven
// on later voyages goes straight to the village instead of replaying this.
const HouseScene: React.FC<HouseSceneProps> = ({ onComplete }) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showScene, setShowScene] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const rafRef = useRef(0);

  const currentLine = INTRO_LINES[lineIndex];
  const showLetter = lineIndex < 10;
  const dadAlpha = lineIndex >= 1 ? Math.min(0.5, (lineIndex - 1) * 0.08) : 0;

  // Ambient render loop for the candle flicker / dad's soft glow.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let last = performance.now();
    const loop = (ts: number) => {
      timeRef.current += (ts - last) / 1000;
      last = ts;
      renderRoom(ctx, timeRef.current, showLetter, dadAlpha);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [showLetter, dadAlpha]);

  // Typewriter
  useEffect(() => {
    if (!currentLine) return;
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const text = currentLine.text;
    const speed = currentLine.delay || 80;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed === 1500 ? 500 : 35);
    return () => clearInterval(interval);
  }, [lineIndex, currentLine]);

  const handleAdvance = useCallback(() => {
    if (isTyping) {
      setDisplayedText(currentLine.text);
      setIsTyping(false);
      return;
    }
    if (lineIndex < INTRO_LINES.length - 1) {
      setLineIndex(lineIndex + 1);
    } else {
      setShowScene(false);
      setTimeout(onComplete, 600);
    }
  }, [isTyping, lineIndex, currentLine, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleAdvance]);

  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${showScene ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleAdvance}
      style={{ cursor: 'pointer' }}
    >
      <div className="absolute inset-0 scanlines opacity-10 pointer-events-none" />

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="pixel-border"
        style={{
          imageRendering: 'pixelated',
          width: 'min(90vw, 640px)',
          height: 'auto',
          aspectRatio: `${W} / ${H}`,
          background: 'hsl(220, 15%, 5%)',
        }}
      />

      <div className="w-full max-w-lg px-4 mt-4">
        <div className="pixel-border bg-card/95 p-4">
          <p className="font-body text-foreground text-lg leading-relaxed min-h-[2em]">
            {displayedText}
            {isTyping && <span className="animate-typewriter-cursor text-primary">_</span>}
          </p>
          <div className="text-right mt-2">
            <span className="font-body text-xs text-muted-foreground">
              {isTyping ? '[click to skip]' : lineIndex < INTRO_LINES.length - 1 ? '[click to continue]' : '[click to leave]'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseScene;
