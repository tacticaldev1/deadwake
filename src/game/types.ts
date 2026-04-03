export interface Vec2 {
  x: number;
  y: number;
}

export interface BoatSkin {
  id: string;
  name: string;
  price: number;
  hullColor: string;
  sailColor: string;
  accentColor: string;
  mastColor: string;
  speedMod: number;
  handlingMod: number;
  description: string;
  wakeColor: string;
}

export interface SailStyle {
  id: string;
  name: string;
  price: number;
  pattern: 'solid' | 'striped' | 'gradient' | 'checkered';
  colors: string[];
  description: string;
}

export interface TrailEffect {
  id: string;
  name: string;
  price: number;
  particleColor: string;
  glowColor: string;
  description: string;
}

export interface Obstacle {
  x: number;
  y: number;
  type: 'rock' | 'boat' | 'storm';
  radius: number;
  rotation: number;
  health?: number;
  vx?: number;
  vy?: number;
}

export interface Collectible {
  x: number;
  y: number;
  type: 'coin' | 'crate' | 'boost';
  collected: boolean;
  bobOffset: number;
  value: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'wake' | 'splash' | 'collect' | 'foam';
}

export interface WakePoint {
  x: number;
  y: number;
  age: number;
  width: number;
}

export interface WindState {
  direction: number;
  strength: number;
  targetDirection: number;
  targetStrength: number;
}

export interface GameState {
  boatX: number;
  boatY: number;
  boatAngle: number;
  boatSpeed: number;
  boatTilt: number;
  velocity: Vec2;
  score: number;
  coins: number;
  distance: number;
  gameOver: boolean;
  health: number;
  maxHealth: number;
  invulnTimer: number;
  difficulty: number;
  wind: WindState;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  wakeTrail: WakePoint[];
  cameraX: number;
  cameraY: number;
  cameraTargetX: number;
  cameraTargetY: number;
  cameraZoom: number;
  cameraTargetZoom: number;
  time: number;
  stormZone: { x: number; y: number; radius: number; active: boolean };
  speedBoostTimer: number;
  event: 'none' | 'storm' | 'calm' | 'gust';
  eventTimer: number;
}

export interface ShopState {
  coins: number;
  unlockedSkins: string[];
  unlockedSails: string[];
  unlockedTrails: string[];
  selectedSkin: string;
  selectedSail: string;
  selectedTrail: string;
  highScore: number;
}

export type GameScreen = 'menu' | 'house' | 'port' | 'playing' | 'gameover' | 'shop' | 'settings';
