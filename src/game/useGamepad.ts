import { useEffect, useRef } from 'react';

// Standard Gamepad API button/axis indices — this mapping is what Xbox and
// PS4/PS5 controllers both report as when the browser recognizes them as a
// "standard" gamepad (true for every current Xbox and PlayStation pad).
const BTN_CONFIRM = 0;   // Xbox A / PlayStation Cross — interact, dock, talk
const BTN_FIRE = 2;      // Xbox X / PlayStation Square — fire the cannon
const BTN_CHART = 3;     // Xbox Y / PlayStation Triangle — toggle the chart
const BTN_START = 9;     // Xbox Menu / PlayStation Options — pause menu
const BTN_DPAD_UP = 12;
const BTN_DPAD_DOWN = 13;
const BTN_DPAD_LEFT = 14;
const BTN_DPAD_RIGHT = 15;

const STICK_DEADZONE = 0.35;

type HeldKey = 'w' | 'a' | 's' | 'd' | 'e' | ' ';
const HELD_KEYS: HeldKey[] = ['w', 'a', 's', 'd', 'e', ' '];

function dispatchKey(type: 'keydown' | 'keyup', key: string) {
  window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

// Polls any connected Xbox/PS4/PS5/standard-mapping gamepad and translates it
// into the exact same synthetic keyboard events the game already listens for
// (WASD, E, M, Escape). Every existing keyboard handler picks these up with
// no changes needed — there is no separate "gamepad input path" to maintain.
export function useGamepad(onConnectionChange?: (connected: boolean, name: string) => void) {
  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    if (typeof navigator.getGamepads !== 'function') return;

    let rafId: number;
    const held: Record<HeldKey, boolean> = { w: false, a: false, s: false, d: false, e: false, ' ': false };
    let startHeld = false;
    let chartHeld = false;

    const setHeld = (key: HeldKey, next: boolean) => {
      if (next === held[key]) return;
      held[key] = next;
      dispatchKey(next ? 'keydown' : 'keyup', key);
    };

    const poll = () => {
      const pads = navigator.getGamepads();
      const pad = pads[0] || pads[1] || pads[2] || pads[3];

      if (pad) {
        const lx = pad.axes[0] || 0;
        const ly = pad.axes[1] || 0;

        setHeld('w', ly < -STICK_DEADZONE || !!pad.buttons[BTN_DPAD_UP]?.pressed);
        setHeld('s', ly > STICK_DEADZONE || !!pad.buttons[BTN_DPAD_DOWN]?.pressed);
        setHeld('a', lx < -STICK_DEADZONE || !!pad.buttons[BTN_DPAD_LEFT]?.pressed);
        setHeld('d', lx > STICK_DEADZONE || !!pad.buttons[BTN_DPAD_RIGHT]?.pressed);
        setHeld('e', !!pad.buttons[BTN_CONFIRM]?.pressed);
        setHeld(' ', !!pad.buttons[BTN_FIRE]?.pressed);

        // Start/Menu and Y/Triangle toggle state on the *press*, so fire once
        // per press-edge rather than continuously while held.
        const startPressed = !!pad.buttons[BTN_START]?.pressed;
        if (startPressed && !startHeld) dispatchKey('keydown', 'Escape');
        startHeld = startPressed;

        const chartPressed = !!pad.buttons[BTN_CHART]?.pressed;
        if (chartPressed && !chartHeld) dispatchKey('keydown', 'm');
        chartHeld = chartPressed;
      } else {
        for (const key of HELD_KEYS) setHeld(key, false);
        startHeld = false;
        chartHeld = false;
      }

      rafId = requestAnimationFrame(poll);
    };
    rafId = requestAnimationFrame(poll);

    const onConnect = (e: GamepadEvent) => onConnectionChangeRef.current?.(true, e.gamepad.id);
    const onDisconnect = (e: GamepadEvent) => onConnectionChangeRef.current?.(false, e.gamepad.id);
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
      for (const key of HELD_KEYS) { if (held[key]) dispatchKey('keyup', key); }
    };
  }, []);
}
