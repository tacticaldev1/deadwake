import { Village, getVillage, getAllVillages } from './villages';

export interface CargoItem {
  id: string;
  name: string;
  fromVillage: string;
  toVillage: string;
  payout: number;
  fine: number;
}

export interface CargoState {
  hold: CargoItem[];
  portStock: Record<string, CargoItem[]>;
}

export const MAX_CARGO_HOLD = 3;
const PORT_STOCK_SIZE = 3;

const GOOD_NAMES = [
  'Salt Barrel', 'Bundle of Nets', 'Sealed Crate', 'Oil Cask', 'Bolt of Cloth',
  'Iron Fittings', 'Dried Fish', 'Spice Chest', 'Glass Lanterns', 'Rope Coil',
];

function randomInt(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateCargoItem(fromVillageId: string, extra: Village[] = []): CargoItem | null {
  const from = getVillage(fromVillageId, extra);
  const others = getAllVillages(extra).filter(v => v.id !== fromVillageId);
  if (!from || others.length === 0) return null;
  const dest = pick(others);
  const dist = Math.hypot(dest.x - from.x, dest.y - from.y);
  const payout = Math.round(dist / 20) + randomInt(0, 15);
  const fine = Math.round(payout * 0.6) + randomInt(0, 10);
  return {
    id: `cargo_${fromVillageId}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    name: pick(GOOD_NAMES),
    fromVillage: fromVillageId,
    toVillage: dest.id,
    payout, fine,
  };
}

export function createCargoState(): CargoState {
  return { hold: [], portStock: {} };
}

export function loadCargoState(): CargoState {
  try {
    const saved = localStorage.getItem('deadwake_cargo');
    if (saved) return { ...createCargoState(), ...JSON.parse(saved) };
  } catch {}
  return createCargoState();
}

export function saveCargoState(state: CargoState) {
  localStorage.setItem('deadwake_cargo', JSON.stringify(state));
}

// Tops a village's port stock up to a steady count of goods available for pickup.
export function ensurePortStocked(state: CargoState, villageId: string, extra: Village[] = []): CargoState {
  const current = state.portStock[villageId] || [];
  const needed = PORT_STOCK_SIZE - current.length;
  if (needed <= 0) return state;
  const added: CargoItem[] = [];
  for (let i = 0; i < needed; i++) {
    const item = generateCargoItem(villageId, extra);
    if (item) added.push(item);
  }
  if (added.length === 0) return state;
  return { ...state, portStock: { ...state.portStock, [villageId]: [...current, ...added] } };
}

export function pickUpCargo(state: CargoState, villageId: string, itemId: string): CargoState {
  if (state.hold.length >= MAX_CARGO_HOLD) return state;
  const stock = state.portStock[villageId] || [];
  const item = stock.find(i => i.id === itemId);
  if (!item) return state;
  return {
    ...state,
    hold: [...state.hold, item],
    portStock: { ...state.portStock, [villageId]: stock.filter(i => i.id !== itemId) },
  };
}

export function dropOffCargo(state: CargoState, itemId: string): { state: CargoState; payout: number } {
  const item = state.hold.find(i => i.id === itemId);
  if (!item) return { state, payout: 0 };
  return {
    state: { ...state, hold: state.hold.filter(i => i.id !== itemId) },
    payout: item.payout,
  };
}

// Applied when a voyage ends in death — any cargo aboard is lost, and fined on top of it.
export function loseCargoAtSea(state: CargoState): { state: CargoState; fine: number } {
  if (state.hold.length === 0) return { state, fine: 0 };
  const fine = state.hold.reduce((sum, i) => sum + i.fine, 0);
  return { state: { ...state, hold: [] }, fine };
}

// Applied when a co-op player disconnects while carrying goods — unlike dying at sea,
// a dropped connection isn't a shipwreck, so the items go back to the shelf instead
// of being lost and fined.
export function returnCargoToStock(state: CargoState, items: CargoItem[]): CargoState {
  if (items.length === 0) return state;
  const portStock = { ...state.portStock };
  for (const item of items) {
    portStock[item.fromVillage] = [...(portStock[item.fromVillage] || []), item];
  }
  return { ...state, portStock };
}
