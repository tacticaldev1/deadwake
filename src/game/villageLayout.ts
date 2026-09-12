import { Village } from './villages';
import { rngFromId } from './rng';

// Pure, deterministic, and seeded only by village.id — every client (solo,
// host, or co-op joiner) independently derives the exact same layout with
// zero data on the wire. No canvas/React import here; this is just geometry.

export interface LayoutBuilding {
  x: number; y: number; w: number; h: number;
  role: 'generic' | 'shop';
}

export interface Point { x: number; y: number; }

export interface VillageLayout {
  buildings: LayoutBuilding[];
  npcPositions: Record<string, Point>;
  boardPos: Point;
  cargoPos: Point;
  shopPos: Point | null;
  chartPos: Point | null;
  dockPos: Point;
  spawnPos: Point;
}

interface Rect { x: number; y: number; w: number; h: number; }

function overlaps(a: Rect, b: Rect, pad: number): boolean {
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
}

function placeRect(
  rng: () => number, w: number, h: number,
  bounds: Rect, existing: Rect[], padding: number, maxTries = 40,
): Rect | null {
  for (let i = 0; i < maxTries; i++) {
    const candidate: Rect = {
      x: bounds.x + rng() * Math.max(0, bounds.w - w),
      y: bounds.y + rng() * Math.max(0, bounds.h - h),
      w, h,
    };
    if (!existing.some(r => overlaps(candidate, r, padding))) return candidate;
  }
  return null;
}

// Canvas is 720x450 (see VillageWalkScene.tsx) — kept in sync here since the
// generator needs to know the space it's placing things into.
const W = 720;
const H = 450;

// Buildings live in a central "town band" that stays clear of the corner
// decorations (trees, drying racks, etc. — deliberately still fixed/unrandomized)
// and the water/dock strip at the bottom.
const BUILDING_BOUNDS: Rect = { x: 110, y: 110, w: W - 220, h: 190 };
// Board/cargo/shop anchors sit a bit lower, in the open town square.
const ANCHOR_BOUNDS: Rect = { x: 90, y: 260, w: W - 180, h: 110 };

const DOCK_POS: Point = { x: W / 2, y: H - 30 };

export function generateVillageLayout(village: Village): VillageLayout {
  const rng = rngFromId(village.id);

  const buildingCount = 3 + Math.floor(rng() * 3); // 3-5
  const buildings: LayoutBuilding[] = [];
  const placedRects: Rect[] = [];
  for (let i = 0; i < buildingCount; i++) {
    const w = 70 + Math.floor(rng() * 40); // 70-110
    const h = 70 + Math.floor(rng() * 30); // 70-100
    const rect = placeRect(rng, w, h, BUILDING_BOUNDS, placedRects, 26);
    if (!rect) continue; // ran out of room — fewer buildings is fine
    placedRects.push(rect);
    buildings.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, role: 'generic' });
  }
  // Guarantee at least one building even in a pathological rejection-sampling run.
  if (buildings.length === 0) {
    buildings.push({ x: BUILDING_BOUNDS.x, y: BUILDING_BOUNDS.y, w: 80, h: 80, role: 'generic' });
    placedRects.push({ x: BUILDING_BOUNDS.x, y: BUILDING_BOUNDS.y, w: 80, h: 80 });
  }

  let shopPos: Point | null = null;
  if (village.hasShop) {
    const shopBuilding = buildings[buildings.length - 1];
    shopBuilding.role = 'shop';
    shopPos = { x: shopBuilding.x + shopBuilding.w + 8, y: shopBuilding.y + shopBuilding.h - 10 };
  }

  // Board/cargo anchors — small reserved footprints so they don't overlap
  // buildings or each other, placed against the full obstacle list so far.
  const anchorObstacles = [...placedRects];
  const boardRect = placeRect(rng, 40, 30, ANCHOR_BOUNDS, anchorObstacles, 20) || { x: ANCHOR_BOUNDS.x, y: ANCHOR_BOUNDS.y, w: 40, h: 30 };
  anchorObstacles.push(boardRect);
  const cargoRect = placeRect(rng, 40, 30, ANCHOR_BOUNDS, anchorObstacles, 20) || { x: ANCHOR_BOUNDS.x + ANCHOR_BOUNDS.w - 40, y: ANCHOR_BOUNDS.y, w: 40, h: 30 };
  anchorObstacles.push(cargoRect);

  const boardPos: Point = { x: boardRect.x + boardRect.w / 2, y: boardRect.y + boardRect.h };
  const cargoPos: Point = { x: cargoRect.x + cargoRect.w / 2, y: cargoRect.y + cargoRect.h };

  let chartPos: Point | null = null;
  if (village.hasChartTable) {
    const chartRect = placeRect(rng, 36, 26, ANCHOR_BOUNDS, anchorObstacles, 20) || { x: ANCHOR_BOUNDS.x + ANCHOR_BOUNDS.w / 2 - 18, y: ANCHOR_BOUNDS.y + ANCHOR_BOUNDS.h - 26, w: 36, h: 26 };
    anchorObstacles.push(chartRect);
    chartPos = { x: chartRect.x + chartRect.w / 2, y: chartRect.y + chartRect.h };
  }

  // NPCs stand just in front of a building's door, round-robin across
  // buildings if there are more NPCs than buildings, with a little jitter so
  // NPCs sharing a building don't stack exactly on top of each other.
  const npcPositions: Record<string, Point> = {};
  village.npcs.forEach((npcId, i) => {
    const b = buildings[i % buildings.length];
    const jitterX = (rng() - 0.5) * 30;
    npcPositions[npcId] = {
      x: Math.max(30, Math.min(W - 30, b.x + b.w / 2 + jitterX)),
      y: Math.min(H - 60, b.y + b.h + 18),
    };
  });

  return {
    buildings,
    npcPositions,
    boardPos,
    cargoPos,
    shopPos,
    chartPos,
    dockPos: DOCK_POS,
    spawnPos: { x: DOCK_POS.x, y: DOCK_POS.y - 45 },
  };
}
