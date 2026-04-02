import { GameState, Particle, Obstacle, Collectible, WindState, WakePoint } from './types';
import { BoatSkin } from './types';

const CANVAS_W = 1200;
const CANVAS_H = 800;

export function createInitialState(): GameState {
  return {
    boatX: 0,
    boatY: 0,
    boatAngle: -Math.PI / 2,
    boatSpeed: 0,
    boatTilt: 0,
    velocity: { x: 0, y: 0 },
    score: 0,
    coins: 0,
    distance: 0,
    gameOver: false,
    health: 3,
    maxHealth: 3,
    invulnTimer: 0,
    difficulty: 1,
    wind: { direction: -Math.PI / 4, strength: 0.5, targetDirection: -Math.PI / 4, targetStrength: 0.5 },
    obstacles: [],
    collectibles: [],
    particles: [],
    wakeTrail: [],
    cameraX: 0,
    cameraY: 0,
    cameraTargetX: 0,
    cameraTargetY: 0,
    cameraZoom: 1,
    cameraTargetZoom: 1,
    time: 0,
    stormZone: { x: 0, y: -2000, radius: 400, active: false },
    speedBoostTimer: 0,
    event: 'none',
    eventTimer: 0,
  };
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  mouseAngle: number | null;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function dist(x1: number, y1: number, x2: number, y2: number) { return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2); }

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

  // Wind effect
  const windAngleDiff = Math.cos(s.wind.direction - s.boatAngle);
  s.boatSpeed += windAngleDiff * s.wind.strength * windMult * 0.5 * dt;
  s.boatSpeed = clamp(s.boatSpeed, -1, maxSpeed);
  s.boatSpeed *= friction;

  // Velocity with drift
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

  // Tilt
  s.boatTilt = lerp(s.boatTilt, clamp(turnRate * s.boatSpeed * 0.15, -0.3, 0.3), 0.1);

  // Distance & score
  const moved = Math.sqrt(s.velocity.x ** 2 + s.velocity.y ** 2) * dt * 60;
  s.distance += moved;
  s.score = Math.floor(s.distance / 10) + s.coins * 10;

  // Difficulty
  s.difficulty = 1 + s.distance / 5000;

  // Speed boost decay
  if (s.speedBoostTimer > 0) s.speedBoostTimer -= dt;

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
      age: 0,
      width: Math.abs(s.boatSpeed) * 4,
    });
  }
  s.wakeTrail = s.wakeTrail.filter(w => { w.age += dt; return w.age < 2; });
  if (s.wakeTrail.length > 60) s.wakeTrail = s.wakeTrail.slice(-60);

  // Wake particles
  if (Math.abs(s.boatSpeed) > 0.5 && Math.random() < 0.3) {
    const spread = (Math.random() - 0.5) * 20;
    s.particles.push({
      x: s.boatX - Math.cos(s.boatAngle) * 20 + Math.cos(s.boatAngle + Math.PI / 2) * spread,
      y: s.boatY - Math.sin(s.boatAngle) * 20 + Math.sin(s.boatAngle + Math.PI / 2) * spread,
      vx: -Math.cos(s.boatAngle) * s.boatSpeed * 0.3 + (Math.random() - 0.5) * 0.5,
      vy: -Math.sin(s.boatAngle) * s.boatSpeed * 0.3 + (Math.random() - 0.5) * 0.5,
      life: 1.2,
      maxLife: 1.2,
      size: 2 + Math.random() * 3,
      color: 'rgba(200,230,255,0.6)',
      alpha: 0.6,
      type: 'wake',
    });
  }

  // Splash on sharp turn
  if (Math.abs(turnRate) > 1.5 && Math.abs(s.boatSpeed) > 1) {
    for (let i = 0; i < 3; i++) {
      const side = turnRate > 0 ? -1 : 1;
      s.particles.push({
        x: s.boatX + Math.cos(s.boatAngle + Math.PI / 2 * side) * 15,
        y: s.boatY + Math.sin(s.boatAngle + Math.PI / 2 * side) * 15,
        vx: Math.cos(s.boatAngle + Math.PI / 2 * side) * 2 + (Math.random() - 0.5),
        vy: Math.sin(s.boatAngle + Math.PI / 2 * side) * 2 + (Math.random() - 0.5) - 1,
        life: 0.8,
        maxLife: 0.8,
        size: 3 + Math.random() * 4,
        color: 'rgba(220,240,255,0.8)',
        alpha: 0.8,
        type: 'splash',
      });
    }
  }

  // Generate obstacles
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
      type,
      radius: 15 + Math.random() * 20,
      rotation: type === 'boat' ? moveAngle : Math.random() * Math.PI * 2,
      vx: Math.cos(moveAngle) * speed,
      vy: Math.sin(moveAngle) * speed,
    });
  }

  // Move enemy boats + pursuit AI
  const CHASE_RANGE = 300;
  const CHASE_SPEED = 1.8;
  for (const obs of s.obstacles) {
    if (obs.type === 'boat' && obs.vx !== undefined && obs.vy !== undefined) {
      const d = dist(obs.x, obs.y, s.boatX, s.boatY);
      if (d < CHASE_RANGE) {
        // Pursue player
        const angleToPlayer = Math.atan2(s.boatY - obs.y, s.boatX - obs.x);
        const pursuitStrength = 1 - d / CHASE_RANGE; // stronger when closer
        const speed = CHASE_SPEED * (0.5 + pursuitStrength * 0.5);
        obs.vx = lerp(obs.vx, Math.cos(angleToPlayer) * speed, 0.05);
        obs.vy = lerp(obs.vy, Math.sin(angleToPlayer) * speed, 0.05);
        obs.rotation = Math.atan2(obs.vy, obs.vx);
      } else if (Math.random() < 0.005) {
        // Random wandering
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
      type,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      value: type === 'coin' ? 1 : type === 'crate' ? 5 : 0,
    });
  }

  // Cleanup far entities
  s.obstacles = s.obstacles.filter(o => dist(o.x, o.y, s.boatX, s.boatY) < 1200);
  s.collectibles = s.collectibles.filter(c => !c.collected && dist(c.x, c.y, s.boatX, s.boatY) < 1200);

  // Collision detection
  for (const obs of s.obstacles) {
    const d = dist(obs.x, obs.y, s.boatX, s.boatY);
    if (d < obs.radius + 12) {
      s.gameOver = true;
      // Explosion particles
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        s.particles.push({
          x: s.boatX, y: s.boatY,
          vx: Math.cos(a) * (2 + Math.random() * 3),
          vy: Math.sin(a) * (2 + Math.random() * 3),
          life: 1.5, maxLife: 1.5,
          size: 3 + Math.random() * 5,
          color: 'rgba(255,200,150,0.8)',
          alpha: 1, type: 'splash',
        });
      }
      break;
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

      // Collect particles
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const color = col.type === 'coin' ? 'rgba(255,215,0,0.9)' :
          col.type === 'crate' ? 'rgba(200,150,80,0.9)' : 'rgba(100,220,255,0.9)';
        s.particles.push({
          x: col.x, y: col.y,
          vx: Math.cos(a) * (1 + Math.random() * 2),
          vy: Math.sin(a) * (1 + Math.random() * 2),
          life: 0.8, maxLife: 0.8,
          size: 3 + Math.random() * 4,
          color, alpha: 1, type: 'collect',
        });
      }
    }
  }

  // Update particles
  s.particles = s.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    p.alpha = clamp(p.life / p.maxLife, 0, 1);
    if (p.type === 'splash') p.vy += 2 * dt;
    return p.life > 0;
  });
  if (s.particles.length > 200) s.particles = s.particles.slice(-200);

  return s;
}

// ============ RENDERER ============

export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, skin: BoatSkin, canvasW: number, canvasH: number) {
  const { cameraX, cameraY, cameraZoom, time } = state;
  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Transform to camera
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-cameraX, -cameraY);

  // Draw water
  drawWater(ctx, cameraX, cameraY, canvasW, canvasH, cameraZoom, time, state.event);

  // Draw wake trail
  drawWakeTrail(ctx, state.wakeTrail, skin.wakeColor);

  // Draw collectibles
  for (const col of state.collectibles) {
    if (col.collected) continue;
    drawCollectible(ctx, col, time);
  }

  // Draw obstacles
  for (const obs of state.obstacles) {
    drawObstacle(ctx, obs, time);
  }

  // Draw particles (behind boat)
  for (const p of state.particles) {
    if (p.type === 'wake' || p.type === 'foam') {
      ctx.globalAlpha = p.alpha * 0.6;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw boat
  if (!state.gameOver) {
    drawBoat(ctx, state, skin, time);
  }

  // Draw particles (in front)
  for (const p of state.particles) {
    if (p.type !== 'wake' && p.type !== 'foam') {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + p.alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Storm overlay
  if (state.event === 'storm') {
    ctx.fillStyle = `rgba(20,30,50,${0.2 + Math.sin(time * 3) * 0.05})`;
    const viewW = canvasW / cameraZoom;
    const viewH = canvasH / cameraZoom;
    ctx.fillRect(cameraX - viewW / 2, cameraY - viewH / 2, viewW, viewH);
  }

  // Wind indicator (small arrow in world space - skip, do it in HUD)

  ctx.restore();

  // Wind direction HUD
  drawWindIndicator(ctx, state.wind, canvasW, canvasH, state.boatAngle);
}

function drawWater(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number, zoom: number, time: number, event: string) {
  const viewW = cw / zoom + 100;
  const viewH = ch / zoom + 100;
  const left = cx - viewW / 2;
  const top = cy - viewH / 2;

  // Base ocean gradient
  const grad = ctx.createLinearGradient(left, top, left, top + viewH);
  if (event === 'storm') {
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.5, '#0d2040');
    grad.addColorStop(1, '#061225');
  } else {
    grad.addColorStop(0, '#0a2a4a');
    grad.addColorStop(0.5, '#0d3d6b');
    grad.addColorStop(1, '#0a2848');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(left, top, viewW, viewH);

  // Wave pattern
  ctx.strokeStyle = 'rgba(100,180,255,0.08)';
  ctx.lineWidth = 1.5;
  const spacing = 40;
  const startX = Math.floor(left / spacing) * spacing;
  const startY = Math.floor(top / spacing) * spacing;

  for (let y = startY; y < top + viewH; y += spacing) {
    ctx.beginPath();
    for (let x = startX; x < left + viewW; x += 4) {
      const wave = Math.sin((x + time * 30) * 0.02 + y * 0.01) * 5 +
        Math.sin((x - time * 20) * 0.03 + y * 0.015) * 3;
      if (x === startX) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  // Shimmering highlights
  ctx.fillStyle = 'rgba(150,210,255,0.04)';
  for (let i = 0; i < 15; i++) {
    const hx = left + ((i * 347 + time * 10) % viewW);
    const hy = top + ((i * 523 + time * 8) % viewH);
    const hs = 20 + Math.sin(time * 2 + i) * 10;
    ctx.beginPath();
    ctx.ellipse(hx, hy, hs, hs * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWakeTrail(ctx: CanvasRenderingContext2D, trail: WakePoint[], color: string) {
  if (trail.length < 2) return;
  for (let i = 1; i < trail.length; i++) {
    const p = trail[i];
    const alpha = 1 - p.age / 2;
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = p.width * alpha;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawBoat(ctx: CanvasRenderingContext2D, state: GameState, skin: BoatSkin, time: number) {
  const { boatX, boatY, boatAngle, boatTilt, boatSpeed } = state;
  const bob = Math.sin(time * 2) * 2;

  ctx.save();
  ctx.translate(boatX, boatY + bob);
  ctx.rotate(boatAngle);
  ctx.scale(1, 1 - Math.abs(boatTilt) * 0.3); // tilt effect

  // Shadow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(2, 4, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Hull
  ctx.fillStyle = skin.hullColor;
  ctx.beginPath();
  ctx.moveTo(28, 0);       // bow
  ctx.quadraticCurveTo(20, -10, -18, -9);
  ctx.quadraticCurveTo(-24, 0, -18, 9);
  ctx.quadraticCurveTo(20, 10, 28, 0);
  ctx.fill();
  ctx.strokeStyle = skin.accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Deck detail
  ctx.fillStyle = skin.accentColor;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(2, 0, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Mast
  ctx.strokeStyle = skin.mastColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(4, -22);
  ctx.stroke();

  // Sail
  const sailFlutter = Math.sin(time * 3 + boatSpeed) * 2;
  ctx.fillStyle = skin.sailColor;
  ctx.beginPath();
  ctx.moveTo(4, -20);
  ctx.quadraticCurveTo(18 + sailFlutter, -12, 4, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Flag
  ctx.fillStyle = skin.accentColor;
  ctx.beginPath();
  ctx.moveTo(4, -22);
  ctx.lineTo(10 + Math.sin(time * 4) * 2, -24);
  ctx.lineTo(4, -26);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, time: number) {
  ctx.save();
  ctx.translate(obs.x, obs.y);

  if (obs.type === 'rock') {
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.moveTo(-obs.radius * 0.8, obs.radius * 0.3);
    ctx.lineTo(-obs.radius * 0.3, -obs.radius * 0.7);
    ctx.lineTo(obs.radius * 0.4, -obs.radius * 0.6);
    ctx.lineTo(obs.radius * 0.7, obs.radius * 0.2);
    ctx.lineTo(obs.radius * 0.2, obs.radius * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Foam around rock
    ctx.strokeStyle = 'rgba(200,230,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius + 5 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (obs.type === 'boat') {
    ctx.rotate(obs.rotation + Math.sin(time * 1.5) * 0.1);
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.quadraticCurveTo(10, -6, -12, -5);
    ctx.quadraticCurveTo(-15, 0, -12, 5);
    ctx.quadraticCurveTo(10, 6, 15, 0);
    ctx.fill();
    ctx.fillStyle = '#DDD';
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.quadraticCurveTo(10, -10, 2, -15);
    ctx.lineTo(2, -3);
    ctx.fill();
  } else if (obs.type === 'storm') {
    const pulse = Math.sin(time * 3) * 0.15;
    ctx.globalAlpha = 0.4 + pulse;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, obs.radius);
    g.addColorStop(0, 'rgba(30,40,80,0.8)');
    g.addColorStop(0.7, 'rgba(40,50,90,0.4)');
    g.addColorStop(1, 'rgba(40,50,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
    ctx.fill();
    // Lightning flash
    if (Math.random() < 0.005) {
      ctx.strokeStyle = 'rgba(255,255,200,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -obs.radius * 0.5);
      ctx.lineTo(5, 0);
      ctx.lineTo(-3, 5);
      ctx.lineTo(4, obs.radius * 0.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCollectible(ctx: CanvasRenderingContext2D, col: Collectible, time: number) {
  const bob = Math.sin(time * 3 + col.bobOffset) * 4;
  const glow = 0.6 + Math.sin(time * 4 + col.bobOffset) * 0.2;

  ctx.save();
  ctx.translate(col.x, col.y + bob);

  if (col.type === 'coin') {
    // Glow
    ctx.globalAlpha = glow * 0.3;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    // Coin
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#B8860B';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0.5);
  } else if (col.type === 'crate') {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, 0);
    ctx.moveTo(0, -9);
    ctx.lineTo(0, 9);
    ctx.stroke();
  } else if (col.type === 'boost') {
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#00BFFF';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 0);
    ctx.lineTo(2, 0);
    ctx.lineTo(2, 10);
    ctx.lineTo(-2, 10);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = glow * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawWindIndicator(ctx: CanvasRenderingContext2D, wind: WindState, cw: number, ch: number, boatAngle: number) {
  const cx = 16 + 70; // centered above minimap (minimap is 140px wide, left-aligned at 16px)
  const cy = ch - 16 - 140 - 50; // above the minimap
  const r = 25;

  ctx.save();
  ctx.globalAlpha = 0.6;

  // Background circle
  ctx.fillStyle = 'rgba(0,20,40,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,180,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Wind arrow
  ctx.globalAlpha = 0.8;
  ctx.translate(cx, cy);
  ctx.rotate(wind.direction);
  const arrowLen = r * wind.strength;
  ctx.strokeStyle = 'rgba(150,220,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(arrowLen, 0);
  ctx.moveTo(arrowLen, 0);
  ctx.lineTo(arrowLen - 6, -4);
  ctx.moveTo(arrowLen, 0);
  ctx.lineTo(arrowLen - 6, 4);
  ctx.stroke();

  ctx.restore();

  // Label
  ctx.fillStyle = 'rgba(150,200,230,0.5)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WIND', cx, cy + r + 16);
}
