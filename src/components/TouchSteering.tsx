import React, { useRef, useState, useCallback } from 'react';
import { InputState } from '../game/engine';

interface Props {
  inputRef: React.MutableRefObject<InputState>;
}

const BASE_RADIUS = 52;
const KNOB_SIZE = 44;
const DEADZONE = 10;

// A visible virtual joystick for touch devices — feeds the exact same
// mouseAngle/up fields the mouse-drag-to-steer path already sets, so the
// game engine needs no separate touch-specific input handling.
const TouchSteering: React.FC<Props> = ({ inputRef }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    const center = centerRef.current;
    if (!center) return;
    const dx = clientX - center.x;
    const dy = clientY - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, BASE_RADIUS);
    const angle = Math.atan2(dy, dx);
    setKnob({ x: Math.cos(angle) * clamped, y: Math.sin(angle) * clamped });
    if (dist > DEADZONE) {
      inputRef.current.mouseAngle = angle;
      inputRef.current.up = true;
    } else {
      inputRef.current.up = false;
    }
  }, [inputRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    pointerIdRef.current = e.pointerId;
    baseRef.current?.setPointerCapture(e.pointerId);
    setActive(true);
    updateFromPoint(e.clientX, e.clientY);
  }, [updateFromPoint]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateFromPoint(e.clientX, e.clientY);
  }, [updateFromPoint]);

  const endTouch = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    centerRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    inputRef.current.mouseAngle = null;
    inputRef.current.up = false;
  }, [inputRef]);

  const setFire = (v: boolean) => { inputRef.current.fire = v; };

  return (
    <>
      <div className="absolute bottom-6 right-6 z-20 select-none pointer-events-auto">
        <div
          ref={baseRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endTouch}
          onPointerCancel={endTouch}
          className="relative rounded-full pixel-border bg-card/50 touch-none"
          style={{ width: BASE_RADIUS * 2, height: BASE_RADIUS * 2 }}
        >
          <div
            className={`absolute rounded-full transition-colors ${active ? 'bg-primary/70' : 'bg-primary/40'}`}
            style={{
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              left: BASE_RADIUS - KNOB_SIZE / 2 + knob.x,
              top: BASE_RADIUS - KNOB_SIZE / 2 + knob.y,
            }}
          />
        </div>
        <div className="text-center mt-1 font-body text-[10px] text-muted-foreground/60">STEER</div>
      </div>

      <div className="absolute bottom-24 right-32 z-20 select-none pointer-events-auto">
        <button
          onPointerDown={() => setFire(true)}
          onPointerUp={() => setFire(false)}
          onPointerLeave={() => setFire(false)}
          onPointerCancel={() => setFire(false)}
          className="w-14 h-14 rounded-full pixel-border bg-destructive/60 active:bg-destructive/90 font-display text-[8px] text-foreground flex items-center justify-center touch-none"
        >
          FIRE
        </button>
      </div>
    </>
  );
};

export default TouchSteering;
