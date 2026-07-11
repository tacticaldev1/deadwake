import { GameState, Particle, Obstacle, Collectible, WindState, WakePoint } from './types';
import { BoatSkin } from './types';
import { VILLAGES, Village } from './villages';

const CANVAS_W = 1200;
const CANVAS_H = 800;

export function createInitialState(): GameState {
  return {
    boatX: 0, boatY: 0, boatAngle: -Math.PI / 2, boatSpeed: 0, boatTilt: 0,
    velocity: { x: 0, y: 0 }, score: 0, coins: 0, distance: 0, gameOver: false,
    health: 3, maxHealth: 3, invulnTimer: 0, difficulty: 1,
    wind: { direction: -Math.PI / 4, strength: 0.5, targetDirection: -Math.PI / 4, targetStrength: 0.5 },
    obstacles: [], collectibles: [], particles: [], wakeTrail: [],
    cameraX: 0, cameraY: 0, cameraTargetX: 0, cameraTargetY: 0,
    cameraZoom: 1, cameraTargetZoom: 1, time: 0,
    stormZone: { x: 0, y: -2000, radius: 400, active: false },
    speedBoostTimer: 0, event: 'none', eventTimer: 0,
  };
}

export interface InputState {
  up: boolean; down: boolean; left: boolean; right: boolean; mouseAngle: number | null;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function dist(x1: number, y1: number, x2: number, y2: number) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }

// Pixel-snap helper
function px(v: number) { return Math.round(v); }

export function updateGame(state: GameState, input: InputState, dt: number, skin: BoatSkin): GameState {
  if (state.gameOver) return state;
  const s = { ...state };
  s.time += dt;
  s.particles = [...s.particles];
  s.obstacles = [...s.obstacles];
  s.collectibles = [...s.collectibles];
  s.wakeTrail = [...s.wakeTrail];

  // Wind
  s.wind = { ...s.wind };
  s.wind.direction = lerp(s.wind.direction, s.wind.targetDirection, 0.01);
  s.wind.strength = lerp(s.wind.strength, s.wind.targetStrength, 0.01);
  if (Math.random() < 0.002) s.wind.targetDirection += (Math.random() - 0.5) * 0.8;
  if (Math.random() < 0.003) s.wind.targetStrength = clamp(0.2 + Math.random() * 0.8, 0.1, 1);

  // Events
  s.eventTimer -= dt;
  if (s.eventTimer <= 0) {
    const r = Math.random();
    if (r < 0.1) { s.event = 'storm'; s.eventTimer = 5 + Math.random() * 5; }
    else if (r < 0.18) { s.event = 'calm'; s.eventTimer = 4 + Math.random() * 3; }
    else if (r < 0.25) { s.event = 'gust'; s.eventTimer = 2 + Math.random() * 2; }
    else { s.event = 'none'; s.eventTimer = 8 + Math.random() * 10; }
  }

  let windMult = 1;
  if (s.event === 'storm') windMult = 1.3;
  else if (s.event === 'calm') windMult = 0.4;
  else if (s.event === 'gust') windMult = 1.8;

  // Steering
  const handling = 2.5 * skin.handlingMod;
  let turnRate = 0;
  if (input.left) turnRate = -handling;
  if (input.right) turnRate = handling;
  if (input.mouseAngle !== null) {
    let angleDiff = input.mouseAngle - s.boatAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    turnRate = clamp(angleDiff * 3, -handling, handling);
  }
  const speedFactor = clamp(Math.abs(s.boatSpeed) / 3, 0.3, 1);
  s.boatAngle += turnRate * dt * speedFactor;

  // Acceleration
  const maxSpeed = 5 * skin.speedMod * (s.speedBoostTimer > 0 ? 1.5 : 1);
  const accel = 3 * skin.speedMod;
  const friction = 0.97;
  const waterDrag = 0.02;
  if (input.up) s.boatSpeed += accel * dt;
  if (input.down) s.boatSpeed -= accel * 0.5 * dt;

  const windAngleDiff = Math.cos(s.wind.direction - s.boatAngle);
  s.boatSpeed += windAngleDiff * s.wind.strength * windMult * 0.5 * dt;
  s.boatSpeed = clamp(s.boatSpeed, -1, maxSpeed);
  s.boatSpeed *= friction;

  const driftAngle = s.boatAngle + Math.PI / 2;
  const driftForce = turnRate * s.boatSpeed * 0.05;
  s.velocity = {
    x: Math.cos(s.boatAngle) * s.boatSpeed + Math.cos(driftAngle) * driftForce,
    y: Math.sin(s.boatAngle) * s.boatSpeed + Math.sin(driftAngle) * driftForce,
  };
  s.velocity.x *= (1 - waterDrag);
  s.velocity.y *= (1 - waterDrag);
  s.boatX += s.velocity.x * dt * 60;
  s.boatY += s.velocity.y * dt * 60;

  s.boatTilt = lerp(s.boatTilt, clamp(turnRate * s.boatSpeed * 0.15, -0.3, 0.3), 0.1);

  const moved = Math.sqrt(s.velocity.x ** 2 + s.velocity.y ** 2) * dt * 60;
  s.distance += moved;
  s.score = Math.floor(s.distance / 10) + s.coins * 10;
  s.difficulty = 1 + s.distance / 5000;

  if (s.speedBoostTimer > 0) s.speedBoostTimer -= dt;
  if (s.invulnTimer > 0) s.invulnTimer -= dt;

  // Camera
  const lookAhead = 100;
  s.cameraTargetX = s.boatX + Math.cos(s.boatAngle) * lookAhead * (s.boatSpeed / maxSpeed);
  s.cameraTargetY = s.boatY + Math.sin(s.boatAngle) * lookAhead * (s.boatSpeed / maxSpeed);
  s.cameraX = lerp(s.cameraX, s.cameraTargetX, 0.04);
  s.cameraY = lerp(s.cameraY, s.cameraTargetY, 0.04);
  s.cameraTargetZoom = s.speedBoostTimer > 0 ? 0.9 : 1;
  s.cameraZoom = lerp(s.cameraZoom, s.cameraTargetZoom, 0.03);

  // Wake trail
  if (Math.abs(s.boatSpeed) > 0.3) {
    s.wakeTrail.push({
      x: s.boatX - Math.cos(s.boatAngle) * 25,
      y: s.boatY - Math.sin(s.boatAngle) * 25,
      age: 0, width: Math.abs(s.boatSpeed) * 3,
    });
  }
  s.wakeTrail = s.wakeTrail.filter(w => { w.age += dt; return w.age < 2; });
  if (s.wakeTrail.length > 40) s.wakeTrail = s.wakeTrail.slice(-40);

  // Spawn obstacles
  const spawnDist = 800;
  if (Math.random() < 0.01 * s.difficulty) {
    const angle = Math.random() * Math.PI * 2;
    const d = spawnDist + Math.random() * 200;
    const types: Obstacle['type'][] = ['rock', 'boat', 'rock', 'boat'];
    if (s.difficulty > 2) types.push('storm');
    const type = types[Math.floor(Math.random() * types.length)];
    const moveAngle = Math.random() * Math.PI * 2;
    const speed = type === 'boat' ? (0.8 + Math.random() * 1.2) : 0;
    s.obstacles.push({
      x: s.boatX + Math.cos(angle) * d,
      y: s.boatY + Math.sin(angle) * d,
      type, radius: 15 + Math.random() * 20,
      rotation: type === 'boat' ? moveAngle : Math.random() * Math.PI * 2,
      vx: Math.cos(moveAngle) * speed, vy: Math.sin(moveAngle) * speed,
    });
  }

  // Move enemy boats + pursuit AI
  const CHASE_RANGE = 300;
  const CHASE_SPEED = 1.8;
  for (const obs of s.obstacles) {
    if (obs.type === 'boat' && obs.vx !== undefined && obs.vy !== undefined) {
      const d = dist(obs.x, obs.y, s.boatX, s.boatY);
      if (d < CHASE_RANGE) {
        const angleToPlayer = Math.atan2(s.boatY - obs.y, s.boatX - obs.x);
        const pursuitStrength = 1 - d / CHASE_RANGE;
        const speed = CHASE_SPEED * (0.5 + pursuitStrength * 0.5);
        obs.vx = lerp(obs.vx, Math.cos(angleToPlayer) * speed, 0.05);
        obs.vy = lerp(obs.vy, Math.sin(angleToPlayer) * speed, 0.05);
        obs.rotation = Math.atan2(obs.vy, obs.vx);
      } else if (Math.random() < 0.005) {
        const newAngle = Math.random() * Math.PI * 2;
        const speed = Math.sqrt(obs.vx * obs.vx + obs.vy * obs.vy);
        obs.vx = Math.cos(newAngle) * speed;
        obs.vy = Math.sin(newAngle) * speed;
        obs.rotation = newAngle;
      }
      obs.x += obs.vx * dt * 60;
      obs.y += obs.vy * dt * 60;
    }
  }

  // Generate collectibles
  if (Math.random() < 0.015) {
    const angle = Math.random() * Math.PI * 2;
    const d = 400 + Math.random() * 400;
    const types: Collectible['type'][] = ['coin', 'coin', 'coin', 'crate', 'boost'];
    const type = types[Math.floor(Math.random() * types.length)];
    s.collectibles.push({
      x: s.boatX + Math.cos(angle) * d,
      y: s.boatY + Math.sin(angle) * d,
      type, collected: false, bobOffset: Math.random() * Math.PI * 2,
      value: type === 'coin' ? 1 : type === 'crate' ? 5 : 0,
    });
  }

  s.obstacles = s.obstacles.filter(o => dist(o.x, o.y, s.boatX, s.boatY) < 1200);
  s.collectibles = s.collectibles.filter(c => !c.collected && dist(c.x, c.y, s.boatX, s.boatY) < 1200);

  // Collision detection
  for (const obs of s.obstacles) {
    const d = dist(obs.x, obs.y, s.boatX, s.boatY);
    if (d < obs.radius + 12 && s.invulnTimer <= 0) {
      s.health -= 1;
      s.invulnTimer = 1.5;
      const knockAngle = Math.atan2(s.boatY - obs.y, s.boatX - obs.x);
      s.boatX += Math.cos(knockAngle) * 30;
      s.boatY += Math.sin(knockAngle) * 30;
      s.boatSpeed *= 0.3;
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        s.particles.push({
          x: s.boatX, y: s.boatY,
          vx: Math.cos(a) * (1 + Math.random() * 2),
          vy: Math.sin(a) * (1 + Math.random() * 2),
          life: 0.8, maxLife: 0.8, size: 2 + Math.random() * 3,
          color: s.health <= 0 ? '#662222' : '#554433',
          alpha: 1, type: 'splash',
        });
      }
      if (s.health <= 0) { s.gameOver = true; break; }
    }
  }

  // Collectible pickup
  for (const col of s.collectibles) {
    if (col.collected) continue;
    if (dist(col.x, col.y, s.boatX, s.boatY) < 30) {
      col.collected = true;
      if (col.type === 'coin') s.coins += 1;
      else if (col.type === 'crate') s.coins += 5;
      else if (col.type === 'boost') s.speedBoostTimer = 3;
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const color = col.type === 'coin' ? '#8a7a3a' : col.type === 'crate' ? '#665533' : '#3a6666';
        s.particles.push({
          x: col.x, y: col.y,
          vx: Math.cos(a) * (0.5 + Math.random()),
          vy: Math.sin(a) * (0.5 + Math.random()),
          life: 0.6, maxLife: 0.6, size: 2 + Math.random() * 2,
          color, alpha: 1, type: 'collect',
        });
      }
    }
  }

  // Update particles
  s.particles = s.particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.life -= dt;
    p.alpha = clamp(p.life / p.maxLife, 0, 1);
    if (p.type === 'splash') p.vy += 2 * dt;
    return p.life > 0;
  });
  if (s.particles.length > 100) s.particles = s.particles.slice(-100);

  return s;
}

// ============ PIXEL ART RENDERER ============

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, skin: BoatSkin, canvasW: number, canvasH: number, missionTarget?: { x: number; y: number; radius: number; label: string }) {
  const { cameraX, cameraY, cameraZoom, time } = state;
  
  // Enable pixelated rendering
  ctx.imageSmoothingEnabled = false;
  
  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-cameraX, -cameraY);

  drawWater(ctx, cameraX, cameraY, canvasW, canvasH, cameraZoom, time, state.event);

  // Villages
  for (const v of VILLAGES) drawVillage(ctx, v, time);

  if (missionTarget) drawMissionBeacon(ctx, missionTarget, time);

  drawWakeTrail(ctx, state.wakeTrail, skin.wakeColor);

  for (const col of state.collectibles) {
    if (!col.collected) drawCollectible(ctx, col, time);
  }

  for (const obs of state.obstacles) {
    drawObstacle(ctx, obs, time);
  }

  // Particles behind boat
  for (const p of state.particles) {
    if (p.type === 'wake' || p.type === 'foam') {
      ctx.globalAlpha = p.alpha * 0.4;
      ctx.fillStyle = p.color;
      ctx.fillRect(px(p.x - p.size/2), px(p.y - p.size/2), px(p.size), px(p.size));
    }
  }

  // Boat
  if (!state.gameOver) {
    const showBoat = state.invulnTimer <= 0 || Math.floor(state.time * 8) % 2 === 0;
    if (showBoat) drawPixelBoat(ctx, state, skin, time);
  }

  // Particles in front
  for (const p of state.particles) {
    if (p.type !== 'wake' && p.type !== 'foam') {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      const s = px(p.size * (0.5 + p.alpha * 0.5));
      ctx.fillRect(px(p.x - s/2), px(p.y - s/2), s, s);
    }
  }
  ctx.globalAlpha = 1;

  // Storm/fog overlay
  if (state.event === 'storm') {
    ctx.fillStyle = `rgba(8,8,18,${0.25 + Math.sin(time * 2) * 0.05})`;
    const viewW = canvasW / cameraZoom;
    const viewH = canvasH / cameraZoom;
    ctx.fillRect(cameraX - viewW / 2, cameraY - viewH / 2, viewW, viewH);
  }

  // Subtle fog layer
  const fogAlpha = 0.03 + Math.sin(time * 0.5) * 0.02;
  ctx.fillStyle = `rgba(20,25,30,${fogAlpha})`;
  const viewW = canvasW / cameraZoom;
  const viewH = canvasH / cameraZoom;
  ctx.fillRect(cameraX - viewW / 2, cameraY - viewH / 2, viewW, viewH);

  ctx.restore();

  drawWindIndicator(ctx, state.wind, canvasW, canvasH, state.boatAngle);
  
  // Scanline effect on canvas
  drawScanlines(ctx, canvasW, canvasH);
}

function drawScanlines(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let y = 0; y < ch; y += 3) {
    ctx.fillRect(0, y, cw, 1);
  }
}

function drawWater(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number, zoom: number, time: number, event: string) {
  const viewW = cw / zoom + 100;
  const viewH = ch / zoom + 100;
  const left = cx - viewW / 2;
  const top = cy - viewH / 2;

  // Dark ocean - muted, eerie colors
  if (event === 'storm') {
    ctx.fillStyle = '#060810';
  } else {
    ctx.fillStyle = '#080c14';
  }
  ctx.fillRect(left, top, viewW, viewH);

  // Pixel wave lines - subtle
  ctx.fillStyle = 'rgba(30,45,55,0.3)';
  const spacing = 32;
  const startX = Math.floor(left / spacing) * spacing;
  const startY = Math.floor(top / spacing) * spacing;

  for (let y = startY; y < top + viewH; y += spacing) {
    for (let x = startX; x < left + viewW; x += spacing) {
      const wave = Math.sin((x + time * 20) * 0.03 + y * 0.02) > 0.3;
      if (wave) {
        ctx.fillRect(px(x), px(y), 4, 1);
      }
    }
  }

  // Sparse glinting pixels - like moonlight on dark water
  ctx.fillStyle = 'rgba(60,80,90,0.15)';
  for (let i = 0; i < 8; i++) {
    const hx = left + ((i * 347 + time * 6) % viewW);
    const hy = top + ((i * 523 + time * 4) % viewH);
    if (Math.sin(time * 3 + i * 2) > 0.7) {
      ctx.fillRect(px(hx), px(hy), 2, 2);
    }
  }
}

function drawWakeTrail(ctx: CanvasRenderingContext2D, trail: WakePoint[], color: string) {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const p = trail[i];
    const alpha = 1 - p.age / 2;
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha * 0.25;
    ctx.fillStyle = '#1a2a35';
    const w = px(p.width * alpha);
    ctx.fillRect(px(p.x - w/2), px(p.y), w, 2);
  }
  ctx.globalAlpha = 1;
}

function drawPixelBoat(ctx: CanvasRenderingContext2D, state: GameState, skin: BoatSkin, time: number) {
  const { boatX, boatY, boatAngle, boatTilt, boatSpeed } = state;
  const bob = Math.floor(Math.sin(time * 2) * 2);

  ctx.save();
  ctx.translate(px(boatX), px(boatY + bob));
  ctx.rotate(boatAngle);

  // Pixel boat hull - simple rectangles
  ctx.fillStyle = skin.hullColor;
  ctx.fillRect(-16, -4, 32, 8); // main hull
  ctx.fillRect(-12, -5, 24, 1);  // deck edge top
  ctx.fillRect(-12, 4, 24, 1);   // deck edge bottom
  ctx.fillRect(16, -2, 4, 4);    // bow point

  // Mast
  ctx.fillStyle = skin.mastColor;
  ctx.fillRect(2, -16, 2, 14);

  // Sail - pixel triangle approximation
  ctx.fillStyle = skin.sailColor;
  const sailFlutter = Math.floor(Math.sin(time * 3) * 2);
  ctx.fillRect(4, -14, 8 + sailFlutter, 2);
  ctx.fillRect(4, -12, 7 + sailFlutter, 2);
  ctx.fillRect(4, -10, 5 + sailFlutter, 2);
  ctx.fillRect(4, -8, 3, 2);
  ctx.fillRect(4, -6, 1, 2);

  // Flag pixel
  ctx.fillStyle = skin.accentColor;
  const flagFlutter = Math.floor(Math.sin(time * 4) * 1);
  ctx.fillRect(4 + flagFlutter, -18, 4, 2);

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, time: number) {
  ctx.save();
  ctx.translate(px(obs.x), px(obs.y));

  if (obs.type === 'rock') {
    // Pixel rock - dark, ominous
    ctx.fillStyle = '#2a2a2a';
    const r = px(obs.radius * 0.7);
    ctx.fillRect(-r, -r + 2, r * 2, r * 2 - 4);
    ctx.fillRect(-r + 2, -r, r * 2 - 4, r * 2);
    // Highlight pixel
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-r + 2, -r + 2, 3, 3);
    // Foam pixel
    if (Math.sin(time * 2) > 0) {
      ctx.fillStyle = 'rgba(40,55,65,0.4)';
      ctx.fillRect(-r - 3, 0, 2, 2);
      ctx.fillRect(r + 1, -2, 2, 2);
    }
  } else if (obs.type === 'boat') {
    ctx.rotate(obs.rotation);
    // Enemy ship - darker, menacing
    ctx.fillStyle = '#3a2020';
    ctx.fillRect(-12, -3, 24, 6);
    ctx.fillRect(12, -1, 3, 2);
    // Dark sail
    ctx.fillStyle = '#442222';
    ctx.fillRect(0, -10, 6, 8);
    ctx.fillRect(0, -12, 4, 2);
    // Red eye/light
    if (Math.sin(time * 4 + obs.x) > 0) {
      ctx.fillStyle = '#662222';
      ctx.fillRect(10, -1, 2, 2);
    }
  } else if (obs.type === 'storm') {
    // Storm cloud - pixel blocks
    ctx.globalAlpha = 0.3 + Math.sin(time * 2) * 0.1;
    ctx.fillStyle = '#151520';
    const r = px(obs.radius);
    for (let y = -r; y < r; y += 8) {
      for (let x = -r; x < r; x += 8) {
        if (x * x + y * y < r * r) {
          ctx.fillRect(x, y, 6, 6);
        }
      }
    }
    // Lightning flash
    if (Math.random() < 0.003) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#aaaa88';
      ctx.fillRect(-1, -r * 0.5, 2, r);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCollectible(ctx: CanvasRenderingContext2D, col: Collectible, time: number) {
  const bob = Math.floor(Math.sin(time * 3 + col.bobOffset) * 2);
  const glow = Math.sin(time * 4 + col.bobOffset) > 0;

  ctx.save();
  ctx.translate(px(col.x), px(col.y + bob));

  if (col.type === 'coin') {
    // Pixel coin
    if (glow) {
      ctx.fillStyle = '#4a4020';
      ctx.fillRect(-5, -5, 10, 10);
    }
    ctx.fillStyle = '#8a7a3a';
    ctx.fillRect(-3, -4, 6, 8);
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = '#6a5a2a';
    ctx.fillRect(-1, -2, 2, 4);
  } else if (col.type === 'crate') {
    ctx.fillStyle = '#554422';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#443311';
    ctx.fillRect(-6, 0, 12, 1);
    ctx.fillRect(0, -6, 1, 12);
    ctx.fillStyle = '#665533';
    ctx.fillRect(-5, -5, 2, 2);
  } else if (col.type === 'boost') {
    ctx.fillStyle = glow ? '#3a6666' : '#2a4a4a';
    ctx.fillRect(-3, -6, 6, 12);
    ctx.fillRect(-5, -2, 10, 4);
    // Arrow up pixel
    ctx.fillStyle = '#4a8888';
    ctx.fillRect(-1, -8, 2, 2);
  }

  ctx.restore();
}

function drawMissionBeacon(ctx: CanvasRenderingContext2D, target: { x: number; y: number; radius: number; label: string }, time: number) {
  const blink = Math.floor(time * 3) % 2 === 0;
  
  // Pulsing pixel ring
  if (blink) {
    ctx.fillStyle = 'rgba(50,80,80,0.2)';
    const r = px(target.radius);
    for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
      ctx.fillRect(
        px(target.x + Math.cos(angle) * r),
        px(target.y + Math.sin(angle) * r),
        3, 3
      );
    }
  }

  // Center marker
  ctx.fillStyle = '#3a6666';
  ctx.fillRect(px(target.x - 3), px(target.y - 3), 6, 6);
  ctx.fillStyle = '#4a8888';
  ctx.fillRect(px(target.x - 1), px(target.y - 1), 2, 2);

  // Label
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#4a8888';
  ctx.font = '10px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText(target.label, px(target.x), px(target.y - target.radius - 8));
  ctx.globalAlpha = 1;
}

function drawWindIndicator(ctx: CanvasRenderingContext2D, wind: WindState, cw: number, ch: number, boatAngle: number) {
  const cx = 16 + 60;
  const cy = ch - 16 - 120 - 40;
  const r = 20;

  ctx.save();
  ctx.globalAlpha = 0.5;

  // Pixel circle background
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(cx - r - 4, cy - r - 4, (r + 4) * 2, (r + 4) * 2);
  ctx.strokeStyle = '#1a2a35';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - r - 4, cy - r - 4, (r + 4) * 2, (r + 4) * 2);

  // Wind arrow - pixel style
  ctx.globalAlpha = 0.7;
  ctx.translate(cx, cy);
  ctx.rotate(wind.direction);
  const arrowLen = r * wind.strength;
  ctx.fillStyle = '#3a5566';
  ctx.fillRect(0, -1, px(arrowLen), 2);
  ctx.fillRect(px(arrowLen - 4), -3, 2, 2);
  ctx.fillRect(px(arrowLen - 4), 1, 2, 2);

  ctx.restore();

  // Label
  ctx.fillStyle = 'rgba(50,70,80,0.5)';
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('WIND', cx, cy + r + 12);
}

// ============ VILLAGES ============
function drawVillage(ctx: CanvasRenderingContext2D, v: Village, time: number) {
  const flicker = 0.7 + Math.sin(time * 3 + v.x * 0.01) * 0.15;

  // Dock (wooden pier extending south)
  ctx.fillStyle = 'hsl(25, 18%, 18%)';
  ctx.fillRect(px(v.x - 20), px(v.y - 4), 40, 8);
  ctx.fillStyle = 'hsl(25, 15%, 12%)';
  ctx.fillRect(px(v.x - 18), px(v.y + 4), 4, 10);
  ctx.fillRect(px(v.x + 14), px(v.y + 4), 4, 10);

  // Ground / island platform
  ctx.fillStyle = 'hsl(210, 18%, 12%)';
  ctx.fillRect(px(v.x - 60), px(v.y - 40), 120, 40);
  ctx.fillStyle = 'hsl(210, 20%, 10%)';
  ctx.fillRect(px(v.x - 60), px(v.y - 40), 120, 4);

  // Houses — 3 pixel houses with pitched roofs
  const houses = [
    { x: v.x - 45, y: v.y - 40, w: 22, h: 18 },
    { x: v.x - 12, y: v.y - 46, w: 24, h: 24 },
    { x: v.x + 22, y: v.y - 38, w: 20, h: 16 },
  ];
  for (const h of houses) {
    // Body
    ctx.fillStyle = 'hsl(25, 15%, 15%)';
    ctx.fillRect(px(h.x), px(h.y), h.w, h.h);
    // Roof
    ctx.fillStyle = v.color;
    ctx.fillRect(px(h.x - 2), px(h.y - 4), h.w + 4, 4);
    ctx.fillRect(px(h.x + 2), px(h.y - 7), h.w - 4, 3);
    // Window (glowing)
    ctx.fillStyle = `hsla(40, 65%, 55%, ${flicker})`;
    ctx.fillRect(px(h.x + h.w / 2 - 2), px(h.y + h.h / 2 - 2), 4, 4);
    // Door
    ctx.fillStyle = 'hsl(25, 20%, 8%)';
    ctx.fillRect(px(h.x + h.w / 2 - 2), px(h.y + h.h - 6), 4, 6);
  }

  // Dock lantern (glowing warm point)
  const lanternY = v.y - 6;
  ctx.fillStyle = 'hsl(25, 15%, 10%)';
  ctx.fillRect(px(v.x - 1), px(lanternY - 12), 2, 12);
  ctx.fillStyle = `hsla(35, 90%, 60%, ${flicker})`;
  ctx.fillRect(px(v.x - 2), px(lanternY - 15), 4, 4);
  // Warm glow ring
  const grad = ctx.createRadialGradient(v.x, lanternY - 13, 2, v.x, lanternY - 13, 60);
  grad.addColorStop(0, `hsla(35, 80%, 55%, ${0.25 * flicker})`);
  grad.addColorStop(1, 'hsla(35, 80%, 55%, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(v.x - 60, lanternY - 73, 120, 120);

  // Village name (only visible when camera is close-ish — always for simplicity)
  ctx.font = '7px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'hsla(0, 0%, 90%, 0.65)';
  ctx.fillText(v.name.toUpperCase(), v.x, v.y - 60);

  // Docking radius (subtle ring)
  ctx.strokeStyle = `hsla(180, 30%, 55%, ${0.15 + Math.sin(time * 1.5) * 0.05})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}
