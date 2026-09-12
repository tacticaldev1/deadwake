// The network position protocol carries a single `angle` (radians) field for
// both sea sailing (a real continuous heading) and village walking (a
// discrete 4-way facing direction). This is the shared up/down/left/right
// <-> angle convention so both contexts can use the same wire message.
export type FacingDir = 'up' | 'down' | 'left' | 'right';

const DIR_TO_ANGLE: Record<FacingDir, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export function dirToAngle(dir: FacingDir): number {
  return DIR_TO_ANGLE[dir];
}

export function angleToDir(angle: number): FacingDir {
  const twoPi = Math.PI * 2;
  const normalized = ((angle % twoPi) + twoPi) % twoPi; // 0..2π
  if (normalized < Math.PI / 4 || normalized >= (7 * Math.PI) / 4) return 'right';
  if (normalized < (3 * Math.PI) / 4) return 'down';
  if (normalized < (5 * Math.PI) / 4) return 'left';
  return 'up';
}
