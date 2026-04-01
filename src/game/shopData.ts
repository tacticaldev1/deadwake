import { BoatSkin, SailStyle, TrailEffect } from './types';

export const BOAT_SKINS: BoatSkin[] = [
  {
    id: 'classic',
    name: 'Classic Sailboat',
    price: 0,
    hullColor: '#8B6914',
    sailColor: '#F5F0E1',
    accentColor: '#D4A854',
    mastColor: '#5C4033',
    speedMod: 1,
    handlingMod: 1,
    description: 'A trusty wooden sailboat. Reliable and timeless.',
    wakeColor: 'rgba(200, 230, 255, 0.4)',
  },
  {
    id: 'pirate',
    name: 'Pirate Ship',
    price: 500,
    hullColor: '#2C1810',
    sailColor: '#1A1A1A',
    accentColor: '#C0392B',
    mastColor: '#3E2723',
    speedMod: 0.95,
    handlingMod: 1.1,
    description: 'Arr! A fearsome vessel with a skull on the sail.',
    wakeColor: 'rgba(180, 50, 50, 0.3)',
  },
  {
    id: 'racing',
    name: 'Racing Yacht',
    price: 1000,
    hullColor: '#E8E8E8',
    sailColor: '#2196F3',
    accentColor: '#FF5722',
    mastColor: '#BDBDBD',
    speedMod: 1.15,
    handlingMod: 0.9,
    description: 'Sleek and fast. Built for pure speed.',
    wakeColor: 'rgba(33, 150, 243, 0.4)',
  },
  {
    id: 'viking',
    name: 'Viking Longship',
    price: 1500,
    hullColor: '#6D4C2B',
    sailColor: '#8B0000',
    accentColor: '#FFD700',
    mastColor: '#4A3520',
    speedMod: 1.05,
    handlingMod: 1.05,
    description: 'A mighty Norse vessel fit for Valhalla.',
    wakeColor: 'rgba(255, 215, 0, 0.3)',
  },
];

export const SAIL_STYLES: SailStyle[] = [
  { id: 'plain', name: 'Plain', price: 0, pattern: 'solid', colors: ['#F5F0E1'], description: 'Clean and simple.' },
  { id: 'striped', name: 'Striped', price: 300, pattern: 'striped', colors: ['#E74C3C', '#F5F0E1'], description: 'Bold red stripes.' },
  { id: 'sunset', name: 'Sunset', price: 600, pattern: 'gradient', colors: ['#FF6B35', '#FFD700'], description: 'Warm gradient glow.' },
  { id: 'ocean', name: 'Ocean Wave', price: 800, pattern: 'gradient', colors: ['#0077B6', '#00B4D8'], description: 'Cool ocean tones.' },
];

export const TRAIL_EFFECTS: TrailEffect[] = [
  { id: 'default', name: 'Classic Wake', price: 0, particleColor: 'rgba(200,230,255,0.5)', glowColor: 'rgba(200,230,255,0.2)', description: 'Standard white foam.' },
  { id: 'golden', name: 'Golden Trail', price: 400, particleColor: 'rgba(255,215,0,0.6)', glowColor: 'rgba(255,215,0,0.2)', description: 'Shimmering gold wake.' },
  { id: 'emerald', name: 'Emerald Glow', price: 700, particleColor: 'rgba(0,200,100,0.6)', glowColor: 'rgba(0,200,100,0.2)', description: 'Mystical green trail.' },
  { id: 'fire', name: 'Fire Wake', price: 1000, particleColor: 'rgba(255,80,20,0.6)', glowColor: 'rgba(255,80,20,0.2)', description: 'Blazing hot trail.' },
];

export function loadShopState(): import('./types').ShopState {
  try {
    const saved = localStorage.getItem('sailgame_shop');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    coins: 0,
    unlockedSkins: ['classic'],
    unlockedSails: ['plain'],
    unlockedTrails: ['default'],
    selectedSkin: 'classic',
    selectedSail: 'plain',
    selectedTrail: 'default',
    highScore: 0,
  };
}

export function saveShopState(state: import('./types').ShopState) {
  localStorage.setItem('sailgame_shop', JSON.stringify(state));
}
