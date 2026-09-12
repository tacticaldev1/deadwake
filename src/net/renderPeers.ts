import { GameState } from '../game/types';
import { drawPixelBoat, createInitialState } from '../game/engine';
import { BOAT_SKINS } from '../game/shopData';
import { CoopPlayer } from './useCoopSession';
import { PeerPositionBuffer } from './PeerPositions';

// Mirrors VillageWalkScene's local (unexported) drawLabel — same pixel-font
// look with a dark outline so names read clearly over open water too.
function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = '6px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(5,8,10,0.9)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = 'hsla(180,45%,70%,0.9)';
  ctx.fillText(text, x, y);
}

// A second, separate camera-transform pass drawn right after the normal
// renderGame() call — deliberately kept out of engine.ts so the tested
// solo rendering path is never touched by this feature. Replicates the same
// ~4 lines of camera math renderGame() uses internally.
export function renderPeers(
  ctx: CanvasRenderingContext2D,
  localState: GameState,
  canvasW: number,
  canvasH: number,
  peers: Record<string, CoopPlayer>,
  positions: PeerPositionBuffer,
  time: number,
  selfId: string | null,
) {
  const { cameraX, cameraY, cameraZoom } = localState;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-cameraX, -cameraY);

  for (const peer of Object.values(peers)) {
    if (peer.id === selfId) continue;
    if (!peer.position || peer.position.villageId !== null) continue; // only peers currently at sea
    const pos = positions.get(peer.id);
    if (!pos) continue;
    const skin = BOAT_SKINS.find(s => s.id === peer.skinId) || BOAT_SKINS[0];
    const peerState = { ...createInitialState(pos.x, pos.y), boatAngle: pos.angle };
    drawPixelBoat(ctx, peerState, skin, time);
    drawLabel(ctx, peer.name.toUpperCase(), pos.x, pos.y - 22);
  }

  ctx.restore();
}
