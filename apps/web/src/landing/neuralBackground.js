/* =========================================================
   Neural Network Dynamic Background
   精致全息神经场 (Refined Holographic Neural Field)
   - 静止极简：散落微光，线条几乎不可见
   - 激活即戏剧：线条点亮成流光、节点环形涟漪、脉冲带拖尾
   - 克制配色：青蓝主导 + 稀有电紫强调
   ========================================================= */

const CONFIG = {
  nodeArea: 155 * 155,        // 整体密度基础
  minNodes: 32,
  maxNodes: 76,                // 上限提升，给四周补充节点留余地
  edgeExtraRatio: 0.45,       // 额外 ~45% 节点撒在四周环带
  edgeInnerRadius: 0.30,      // 中心圆半径占比（之外视为"四周"）
  cornerSizeRatio: 0.26,      // 四角方形区域边长占短边比例
  cornerRatio: 0.13,          // 每个角落补充节点数 = 主节点数 × 13%
  connectionDistance: 200,
  maxConnections: 3,
  driftSpeed: 0.045,
  targetFPS: 40,
  maxDPR: 1.5,
  activationIntervalMin: 1100,
  activationIntervalMax: 2400,
  activationBatchMin: 1,
  activationBatchMax: 3,
  activationDurationMin: 1600,
  activationDurationMax: 3400,
  mouseRadius: 200,
  mouseForce: 0.003,
  maxPulses: 18,
  mouseInteraction: true,
};

// 克制配色：青蓝主导，电紫作为稀有强调
const COLORS = [
  { r: 120, g: 210, b: 240 },  // 主青蓝
  { r: 170, g: 200, b: 235 },  // 略淡青蓝（变化）
  { r: 198, g: 148, b: 255 },  // 稀有电紫强调
];
const PURPLE_RATE = 0.08;      // ~8% 节点为紫色 hub

function getColor(index, alpha) {
  const c = COLORS[index % COLORS.length];
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

const random = (min, max) => min + Math.random() * (max - min);
const randomInt = (min, max) => Math.floor(random(min, max + 1));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

class Node {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.vx = random(-CONFIG.driftSpeed, CONFIG.driftSpeed);
    this.vy = random(-CONFIG.driftSpeed, CONFIG.driftSpeed);
    this.radius = random(0.95, 1.35);
    this.colorIndex = Math.random() < PURPLE_RATE ? 2 : (Math.random() < 0.5 ? 0 : 1);
    this.phase = random(0, Math.PI * 2);
    this.breathSpeed = random(0.00065, 0.00125);
    this.energy = random(0.01, 0.06);
    this.targetEnergy = 0;
    this.activeUntil = 0;
    this.floatPhaseX = random(0, Math.PI * 2);
    this.floatPhaseY = random(0, Math.PI * 2);
    this.rippleStart = -1;     // 涟漪开始时间，-1 表示无涟漪
    this.lastActivateAt = 0;
  }

  activate(now) {
    this.activeUntil = now + random(CONFIG.activationDurationMin, CONFIG.activationDurationMax);
    this.targetEnergy = random(0.62, 1);
    this.rippleStart = now;
    this.lastActivateAt = now;
  }

  update(now, dt, mouse) {
    if (now > this.activeUntil) {
      this.targetEnergy = 0;
    }
    const response = this.targetEnergy > this.energy ? 0.06 : 0.016;
    this.energy += (this.targetEnergy - this.energy) * response * dt;

    const time = now * 0.0001;
    const driftX = Math.sin(time + this.floatPhaseX) * 0.012;
    const driftY = Math.cos(time * 0.91 + this.floatPhaseY) * 0.012;
    this.vx += driftX * dt;
    this.vy += driftY * dt;

    if (CONFIG.mouseInteraction && mouse.active) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distSq = dx * dx + dy * dy;
      const radiusSq = CONFIG.mouseRadius * CONFIG.mouseRadius;
      if (distSq > 1 && distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const strength = (1 - dist / CONFIG.mouseRadius) * CONFIG.mouseForce;
        this.vx += (dx / dist) * strength * dt;
        this.vy += (dy / dist) * strength * dt;
      }
    }

    this.vx += (this.baseX - this.x) * 0.000035 * dt;
    this.vy += (this.baseY - this.y) * 0.000035 * dt;
    this.vx *= Math.pow(0.985, dt);
    this.vy *= Math.pow(0.985, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 涟漪结束后且能量回落，重置 rippleStart
    if (this.rippleStart >= 0 && now - this.rippleStart > 1500 && this.energy < 0.04) {
      this.rippleStart = -1;
    }
  }

  draw(now, ctxRef) {
    const { ctx } = ctxRef;
    const breath = 0.5 + 0.5 * Math.sin(this.phase + now * this.breathSpeed);
    const energy = this.energy * (0.7 + breath * 0.3);

    // 1. 极淡外光晕：静止几乎不可见，激活时柔和显现
    const glowRadius = (5.5 + energy * 17);
    const glowEnergy = Math.max(energy, 0.015);
    const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRadius);
    glowGradient.addColorStop(0, getColor(this.colorIndex, 0.16 * glowEnergy));
    glowGradient.addColorStop(0.28, getColor(this.colorIndex, 0.06 * glowEnergy));
    glowGradient.addColorStop(1, getColor(this.colorIndex, 0));
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    // 2. 激活涟漪：从激活瞬间开始扩散的环形波
    if (this.rippleStart >= 0) {
      const rippleAge = now - this.rippleStart;
      const rippleDuration = 1400;
      if (rippleAge < rippleDuration) {
        const rt = rippleAge / rippleDuration;
        const rippleRadius = 2.5 + rt * 28;
        const rippleAlpha = (1 - rt) * 0.32 * Math.max(energy, 0.25);
        ctx.beginPath();
        ctx.arc(this.x, this.y, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = getColor(this.colorIndex, rippleAlpha);
        ctx.lineWidth = 0.55 + (1 - rt) * 0.55;
        ctx.stroke();
      }
    }

    // 3. 节点核心：小亮点 + 柔和外晕
    const coreRadius = 0.9 + energy * 0.6;
    const coreGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, coreRadius * 3.2);
    coreGlow.addColorStop(0, `rgba(220, 240, 250, ${0.38 + energy * 0.42})`);
    coreGlow.addColorStop(0.45, getColor(this.colorIndex, 0.16 + energy * 0.2));
    coreGlow.addColorStop(1, getColor(this.colorIndex, 0));
    ctx.beginPath();
    ctx.arc(this.x, this.y, coreRadius * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = coreGlow;
    ctx.fill();

    // 4. 中心高光点：始终明亮的小亮点
    const centerAlpha = 0.55 + energy * 0.42;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 0.62 + energy * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(232, 246, 255, ${centerAlpha})`;
    ctx.fill();
  }
}

class Edge {
  constructor(a, b, distance) {
    this.a = a;
    this.b = b;
    this.distance = distance;
    this.activity = 0;
    this.phase = random(0, Math.PI * 2);
  }

  update(dt) {
    const sourceEnergy = Math.max(this.a.energy, this.b.energy);
    const targetActivity = sourceEnergy * 0.78;
    this.activity += (targetActivity - this.activity) * 0.028 * dt;
  }

  draw(now, ctxRef) {
    const { ctx } = ctxRef;
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > CONFIG.connectionDistance * 1.35) return;

    const distanceFade = 1 - clamp(dist / (CONFIG.connectionDistance * 1.35), 0, 1);
    const shimmer = 0.88 + Math.sin(now * 0.00045 + this.phase) * 0.12;

    // 静止极淡，激活才点亮——科技感来自"安静中的信号"
    const idleAlpha = 0.016 * distanceFade;
    const activeAlpha = this.activity * distanceFade * 0.55 * shimmer;
    const alpha = idleAlpha + activeAlpha;

    // 基础细线：静止 0.5px，激活可达 ~1.3px
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.strokeStyle = getColor(this.a.colorIndex, alpha);
    ctx.lineWidth = 0.5 + this.activity * 0.85;
    ctx.stroke();

    // 激活时叠一道亮白核心，营造"电流在导线中"的流光
    if (this.activity > 0.08) {
      ctx.beginPath();
      ctx.moveTo(this.a.x, this.a.y);
      ctx.lineTo(this.b.x, this.b.y);
      ctx.strokeStyle = `rgba(228, 246, 255, ${this.activity * distanceFade * 0.34 * shimmer})`;
      ctx.lineWidth = 0.32 + this.activity * 0.4;
      ctx.stroke();
    }
  }
}

class Pulse {
  constructor(edge, fromA = true) {
    this.edge = edge;
    this.progress = 0;
    this.speed = random(0.00018, 0.00034);
    this.fromA = fromA;
    this.life = 1;
    this.size = random(0.85, 1.35);
    this.colorIndex = fromA ? edge.a.colorIndex : edge.b.colorIndex;
  }

  update(dtMs) {
    this.progress += this.speed * dtMs;
    if (this.progress >= 1) {
      this.progress = 1;
      this.life = 0;
    }
  }

  draw(ctxRef) {
    const { ctx } = ctxRef;
    let t = this.progress;
    if (!this.fromA) t = 1 - t;
    const a = this.edge.a;
    const b = this.edge.b;
    const x = lerp(a.x, b.x, t);
    const y = lerp(a.y, b.y, t);

    const envelope =
      smoothstep(0, 0.14, this.progress) * (1 - smoothstep(0.76, 1, this.progress));

    // 拖尾：脉冲后方渐隐的亮线，强化"信号在传播"
    const trailLen = 0.09;
    const trailStartT = Math.max(0, t - trailLen);
    const trailStartX = lerp(a.x, b.x, trailStartT);
    const trailStartY = lerp(a.y, b.y, trailStartT);
    const trailGrad = ctx.createLinearGradient(trailStartX, trailStartY, x, y);
    trailGrad.addColorStop(0, getColor(this.colorIndex, 0));
    trailGrad.addColorStop(1, getColor(this.colorIndex, 0.5 * envelope));
    ctx.beginPath();
    ctx.moveTo(trailStartX, trailStartY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = trailGrad;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // 发光球
    const glowSize = 8 + this.size * 5;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    gradient.addColorStop(0, `rgba(230, 245, 255, ${0.42 * envelope})`);
    gradient.addColorStop(0.25, getColor(this.colorIndex, 0.22 * envelope));
    gradient.addColorStop(1, getColor(this.colorIndex, 0));
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 亮核心
    ctx.beginPath();
    ctx.arc(x, y, this.size * 0.85, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(236, 248, 255, ${0.82 * envelope})`;
    ctx.fill();
  }
}

export function initNeuralBackground() {
  const canvas = document.getElementById('neural-background');
  if (!canvas) return () => {};

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  const ctxRef = { ctx };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let edges = [];
  let pulses = [];
  let lastFrame = 0;
  let nextActivationAt = 0;
  let backgroundGradient = null;
  let vignetteGradient = null;
  let rafId = null;
  let resizeTimer = null;
  let running = true;

  const heroArea = document.querySelector('.hero-area');
  const idleMouse = { x: 0, y: 0, active: false };

  const mouse = { x: 0, y: 0, active: false };

  function createNodes() {
    nodes = [];
    edges = [];
    pulses = [];
    const area = width * height;
    const nodeCount = clamp(Math.floor(area / CONFIG.nodeArea), CONFIG.minNodes, CONFIG.maxNodes);
    const aspect = width / height;
    const cols = Math.ceil(Math.sqrt(nodeCount * aspect));
    const rows = Math.ceil(nodeCount / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    const positions = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (positions.length >= nodeCount) break;
        const x = col * cellWidth + cellWidth * random(0.2, 0.8);
        const y = row * cellHeight + cellHeight * random(0.2, 0.8);
        positions.push({ x, y });
      }
    }

    // 四周环带补充：在中心圆之外额外撒节点，让边缘更密更明显
    const cx = width * 0.5;
    const cy = height * 0.5;
    const innerR = Math.min(width, height) * CONFIG.edgeInnerRadius;
    const innerRSq = innerR * innerR;
    const edgeTarget = Math.floor(nodeCount * CONFIG.edgeExtraRatio);
    let added = 0;
    let attempts = 0;
    while (added < edgeTarget && attempts < edgeTarget * 8) {
      attempts++;
      const x = random(8, width - 8);
      const y = random(8, height - 8);
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy > innerRSq) {
        positions.push({ x, y });
        added++;
      }
    }

    // 四角补充：四个角落方形区域各撒一组节点，让角部更密更明显
    const cornerSize = Math.min(width, height) * CONFIG.cornerSizeRatio;
    const cornerCount = Math.max(4, Math.floor(nodeCount * CONFIG.cornerRatio));
    const cornerW = Math.max(10, cornerSize - 8);
    const cornerOrigins = [
      { x0: 0, y0: 0 },
      { x0: width - cornerSize, y0: 0 },
      { x0: 0, y0: height - cornerSize },
      { x0: width - cornerSize, y0: height - cornerSize },
    ];
    for (const c of cornerOrigins) {
      for (let i = 0; i < cornerCount; i++) {
        const x = c.x0 + random(8, cornerW);
        const y = c.y0 + random(8, cornerW);
        positions.push({ x, y });
      }
    }

    positions.sort(() => Math.random() - 0.5);
    for (const pos of positions) nodes.push(new Node(pos.x, pos.y));
    createEdges();
  }

  function createEdges() {
    edges = [];
    const existing = new Set();
    for (let i = 0; i < nodes.length; i++) {
      const nearby = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distSq = dx * dx + dy * dy;
        const maxDistSq = CONFIG.connectionDistance * CONFIG.connectionDistance;
        if (distSq <= maxDistSq) {
          nearby.push({ index: j, distance: Math.sqrt(distSq) });
        }
      }
      nearby.sort((a, b) => a.distance - b.distance);
      const limit = Math.min(CONFIG.maxConnections, nearby.length);
      for (let k = 0; k < limit; k++) {
        if (k > 0 && Math.random() < 0.22) continue;
        const j = nearby[k].index;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (existing.has(key)) continue;
        existing.add(key);
        edges.push(new Edge(nodes[i], nodes[j], nearby[k].distance));
      }
    }
  }

  function activateRandomBatch(now) {
    if (!nodes.length) return;
    const count = randomInt(CONFIG.activationBatchMin, CONFIG.activationBatchMax);
    const candidates = nodes
      .map((node) => ({ node, energy: node.energy }))
      .sort((a, b) => a.energy - b.energy + random(-0.25, 0.25));

    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      const target = candidates[i].node;
      target.activate(now);
      const connectedEdges = edges.filter((edge) => edge.a === target || edge.b === target);
      if (connectedEdges.length && pulses.length < CONFIG.maxPulses) {
        const edge = connectedEdges[randomInt(0, connectedEdges.length - 1)];
        pulses.push(new Pulse(edge, edge.a === target));
        if (connectedEdges.length > 1 && Math.random() < 0.32 && pulses.length < CONFIG.maxPulses) {
          const edge2 = connectedEdges[randomInt(0, connectedEdges.length - 1)];
          if (edge2 !== edge) {
            pulses.push(new Pulse(edge2, edge2.a === target));
          }
        }
      }
    }
    nextActivationAt = now + random(CONFIG.activationIntervalMin, CONFIG.activationIntervalMax);
  }

  function createBackgroundGradient() {
    // 中心略亮、四周渐暗的深空底色（边缘压暗减弱，让四周节点更可见）
    backgroundGradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.42,
      0,
      width * 0.5,
      height * 0.42,
      Math.max(width, height) * 0.78
    );
    backgroundGradient.addColorStop(0, 'rgba(16, 26, 40, 0.30)');
    backgroundGradient.addColorStop(0.55, 'rgba(8, 14, 22, 0.18)');
    backgroundGradient.addColorStop(1, 'rgba(3, 5, 9, 0.28)');

    // 边缘暗角减弱：保留深空层次但不再压暗四周节点
    vignetteGradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.42,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.78
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 1, 4, 0.20)');
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createBackgroundGradient();
    createNodes();
    nextActivationAt = performance.now() + 500;
  }

  function onPointerMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
  }
  function onPointerLeave() {
    mouse.active = false;
  }
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }
  function onVisibilityChange() {
    if (!document.hidden) lastFrame = performance.now();
  }

  function render(timestamp) {
    if (!running) return;
    rafId = requestAnimationFrame(render);

    if (document.hidden) return;
    const carouselActive = heroArea?.classList.contains('carousel-active');
    const frameInterval = 1000 / (carouselActive ? 24 : CONFIG.targetFPS);
    const elapsed = timestamp - lastFrame;
    if (elapsed < frameInterval) return;
    lastFrame = timestamp - (elapsed % frameInterval);
    const dt = Math.min(elapsed / 16.667, 2.5);

    ctx.clearRect(0, 0, width, height);
    if (backgroundGradient) {
      ctx.fillStyle = backgroundGradient;
      ctx.fillRect(0, 0, width, height);
    }

    if (timestamp >= nextActivationAt) activateRandomBatch(timestamp);

    const interactionMouse = carouselActive ? idleMouse : mouse;
    for (const node of nodes) node.update(timestamp, dt, interactionMouse);
    for (const edge of edges) edge.update(dt);

    ctx.globalCompositeOperation = 'lighter';
    for (const edge of edges) edge.draw(timestamp, ctxRef);

    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      pulse.update(elapsed);
      pulse.draw(ctxRef);
      if (pulse.life <= 0) {
        const target = pulse.fromA ? pulse.edge.b : pulse.edge.a;
        if (Math.random() < 0.4) target.activate(timestamp);
        pulses.splice(i, 1);
      }
    }

    for (const node of nodes) node.draw(timestamp, ctxRef);
    ctx.globalCompositeOperation = 'source-over';

    // 叠加边缘暗角，营造深空聚焦感
    if (vignetteGradient) {
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  resize();
  rafId = requestAnimationFrame(render);

  return () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (resizeTimer) clearTimeout(resizeTimer);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    nodes = [];
    edges = [];
    pulses = [];
  };
}
