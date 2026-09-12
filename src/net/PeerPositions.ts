interface Sample { x: number; y: number; angle: number; }

function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

// Smooths peer position updates (received at ~15-20Hz over the network) into
// visually smooth 60fps motion via exponential smoothing toward the latest
// known target — simpler than buffered two-sample interpolation and plenty
// smooth at LAN latencies.
export class PeerPositionBuffer {
  private targets = new Map<string, Sample>();
  private rendered = new Map<string, Sample>();

  setTarget(playerId: string, x: number, y: number, angle: number) {
    this.targets.set(playerId, { x, y, angle });
    if (!this.rendered.has(playerId)) this.rendered.set(playerId, { x, y, angle });
  }

  remove(playerId: string) {
    this.targets.delete(playerId);
    this.rendered.delete(playerId);
  }

  pruneExcept(liveIds: Set<string>) {
    for (const id of this.targets.keys()) {
      if (!liveIds.has(id)) this.remove(id);
    }
  }

  step(dt: number) {
    const smoothing = Math.min(1, dt * 10); // ~100ms time constant
    for (const [id, target] of this.targets) {
      const cur = this.rendered.get(id) || target;
      this.rendered.set(id, {
        x: cur.x + (target.x - cur.x) * smoothing,
        y: cur.y + (target.y - cur.y) * smoothing,
        angle: cur.angle + shortestAngleDelta(cur.angle, target.angle) * smoothing,
      });
    }
  }

  get(playerId: string): Sample | null {
    return this.rendered.get(playerId) || null;
  }
}
