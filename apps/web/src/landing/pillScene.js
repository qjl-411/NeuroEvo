export function initPillScene() {
  let rafId = 0;
  const heroArea = document.querySelector('.hero-area');
  let lastFrameAt = 0;

  const ns = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('pillStage');
  const field = document.getElementById('pill_molecule_field');
  if (!stage || !field) return () => {};

  const CX = 772;
  const TOP = 965;
  const SHOULDER_Y = 1495;
  const RX = 229;
  const RY = 273;
  const COUNT = 15;
  const CAMERA_FOCAL = 1050;
  const PERSPECTIVE_CENTER_Y = 1365;

  const GLYPHS = [
    { id: '#pill_moleculeGlyphA', baseRadius: 58, mass: 1.12 },
    { id: '#pill_moleculeGlyphB', baseRadius: 61, mass: 1.18 },
    { id: '#pill_moleculeGlyphC', baseRadius: 62, mass: 1.34 },
    { id: '#pill_moleculeGlyphD', baseRadius: 59, mass: 1.20 },
    { id: '#pill_moleculeGlyphE', baseRadius: 63, mass: 1.28 }
  ];

  const lidHotspotEllipse = document.getElementById('pill_lidHotspotEllipse');
  const lidSweepStreak = document.getElementById('pill_lidSweepStreak');
  const lidRimLightLeft = document.getElementById('pill_lidRimLightLeft');
  const lidRimLightRight = document.getElementById('pill_lidRimLightRight');

  function renderShellHighlights() {
    if (!lidHotspotEllipse || !lidSweepStreak || !lidRimLightLeft || !lidRimLightRight) return;
    const a = yaw * Math.PI / 180;
    const sway = Math.sin(a);
    const front = 0.5 + 0.5 * Math.cos(a * 2);
    const centerBoost = 1 - Math.abs(sway);

    const hotspotCx = 744 + sway * 128;
    const hotspotCy = 408 + Math.abs(sway) * 8;
    const hotspotRx = 108 - Math.abs(sway) * 14;
    const hotspotRy = 82 - Math.abs(sway) * 10;
    const hotspotOpacity = 0.64 + centerBoost * 0.16 + front * 0.08;
    lidHotspotEllipse.setAttribute('cx', hotspotCx.toFixed(2));
    lidHotspotEllipse.setAttribute('cy', hotspotCy.toFixed(2));
    lidHotspotEllipse.setAttribute('rx', hotspotRx.toFixed(2));
    lidHotspotEllipse.setAttribute('ry', hotspotRy.toFixed(2));
    lidHotspotEllipse.setAttribute('opacity', hotspotOpacity.toFixed(3));

    lidSweepStreak.setAttribute('stroke-opacity', '0');
    lidSweepStreak.removeAttribute('transform');
    lidRimLightLeft.setAttribute('stroke-opacity', '0.50');
    lidRimLightRight.setAttribute('stroke-opacity', '0.40');
  }

  let seed = 0x71c9e5;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 100000) / 100000;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const molecules = [];

  function interiorRadiusAtY(y, particleRadius) {
    const rx = Math.max(32, RX - particleRadius);
    const ry = Math.max(32, RY - particleRadius);
    if (y <= SHOULDER_Y) return rx;
    const dy = clamp(y - SHOULDER_Y, 0, ry);
    return rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)));
  }

  function createMolecule(i) {
    const info = GLYPHS[i % GLYPHS.length];
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'floating-molecule');
    g.style.transformOrigin = '0 0';

    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', info.id);
    g.appendChild(use);
    field.appendChild(g);

    const scale = 1.92 + rand() * 0.46;
    const visualRadius = info.baseRadius * scale;
    const radius = visualRadius * 0.61;

    let x = CX, y = 1160, z = 0, attempts = 0;
    do {
      y = TOP + radius + 12 + rand() * (SHOULDER_Y + RY - TOP - radius * 2 - 34);
      const wallR = Math.max(8, interiorRadiusAtY(y, radius + 7) - 6);
      const rr = Math.sqrt(rand()) * wallR;
      const theta = rand() * Math.PI * 2;
      x = CX + Math.cos(theta) * rr;
      z = Math.sin(theta) * rr;
      attempts++;
    } while (
      attempts < 500 &&
      molecules.some(m => Math.hypot(x - m.x, y - m.y, z - m.z) < (radius + m.radius) * 0.68)
    );

    const speed = 62 + rand() * 34;
    const az = rand() * Math.PI * 2;
    const vyUnit = rand() * 1.6 - 0.8;
    const planar = Math.sqrt(Math.max(0.08, 1 - vyUnit * vyUnit));

    const m = {
      el: g,
      x, y, z,
      vx: Math.cos(az) * planar * speed,
      vy: vyUnit * speed,
      vz: Math.sin(az) * planar * speed,
      angle: rand() * 360,
      omega: (rand() - 0.5) * 34,
      scale,
      visualRadius,
      radius,
      mass: info.mass * (0.82 + scale * 0.52),
      phaseA: rand() * Math.PI * 2,
      phaseB: rand() * Math.PI * 2,
      phaseC: rand() * Math.PI * 2,
      flowBias: (rand() - 0.5) * 0.7,
      noiseSeed: rand() * 20,
      renderZ: 0,
      perspective: 1
    };
    molecules.push(m);
  }

  for (let i = 0; i < COUNT; i++) createMolecule(i);

  function reflect3D(m, nx, ny, nz, restitution = 0.97) {
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const vn = m.vx * nx + m.vy * ny + m.vz * nz;
    if (vn <= 0) return;
    const impulse = (1 + restitution) * vn;
    m.vx -= impulse * nx;
    m.vy -= impulse * ny;
    m.vz -= impulse * nz;
    m.omega += ((nx * m.vz - nz * m.vx) * 0.12 + Math.sin(m.phaseC) * 5.0) / m.mass;
  }

  function collideWithWall(m) {
    const r = m.radius;

    if (m.y < TOP + r) {
      m.y = TOP + r;
      if (m.vy < 0) {
        m.vy = -m.vy * 0.97;
        m.vx += Math.sin(m.phaseA) * 4.5;
        m.vz += Math.cos(m.phaseB) * 4.5;
      }
    }

    const dx0 = m.x - CX;
    const dz0 = m.z;

    if (m.y <= SHOULDER_Y) {
      const allowed = Math.max(28, RX - r);
      const rho = Math.hypot(dx0, dz0);
      if (rho > allowed) {
        const inv = allowed / (rho || 1);
        m.x = CX + dx0 * inv;
        m.z = dz0 * inv;
        reflect3D(m, dx0, 0, dz0, 0.92);
      }
      return;
    }

    const rx = Math.max(30, RX - r);
    const ry = Math.max(30, RY - r);
    let dx = m.x - CX;
    let dy = m.y - SHOULDER_Y;
    let dz = m.z;
    const q = (dx * dx + dz * dz) / (rx * rx) + (dy * dy) / (ry * ry);
    if (q > 1) {
      const s = 1 / Math.sqrt(q);
      dx *= s; dy *= s; dz *= s;
      m.x = CX + dx;
      m.y = SHOULDER_Y + dy;
      m.z = dz;
      reflect3D(m, dx / (rx * rx), dy / (ry * ry), dz / (rx * rx), 0.90);
    }
  }

  function flowAcceleration(m, t) {
    const xr = m.x - CX;
    const zr = m.z;
    let ax = 0, ay = 0, az = 0;

    const swirl = 0.016 + 0.006 * Math.sin(t * 0.23 + m.phaseC);
    ax += -zr * swirl;
    az +=  xr * swirl;

    ax += Math.sin(m.y * 0.011 + t * 0.54 + m.phaseA) * 3.4;
    az += Math.cos(m.y * 0.010 - t * 0.49 + m.phaseB) * 3.4;
    ay += Math.cos((xr + zr) * 0.010 - t * 0.43 + m.phaseB) * 3.3;

    ax += Math.sin(t * (0.67 + m.flowBias * 0.12) + m.noiseSeed) * 2.2;
    az += Math.cos(t * (0.73 - m.flowBias * 0.10) + m.noiseSeed * 1.3) * 2.2;
    ay += Math.sin(t * 0.87 + m.noiseSeed * 1.7) * Math.cos(t * 0.31 + m.phaseC) * 2.0;
    return [ax, ay, az];
  }

  function collideMolecules() {
    for (let i = 0; i < molecules.length; i++) {
      for (let j = i + 1; j < molecules.length; j++) {
        const a = molecules[i], b = molecules[j];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d = Math.hypot(dx, dy, dz);
        const minD = (a.radius + b.radius) * 0.66;
        if (d <= 0 || d >= minD) continue;

        const nx = dx / d, ny = dy / d, nz = dz / d;
        const overlap = minD - d;
        const totalMass = a.mass + b.mass;
        a.x -= nx * overlap * (b.mass / totalMass);
        a.y -= ny * overlap * (b.mass / totalMass);
        a.z -= nz * overlap * (b.mass / totalMass);
        b.x += nx * overlap * (a.mass / totalMass);
        b.y += ny * overlap * (a.mass / totalMass);
        b.z += nz * overlap * (a.mass / totalMass);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const rvz = b.vz - a.vz;
        const vn = rvx * nx + rvy * ny + rvz * nz;
        if (vn >= 0) continue;

        const e = 0.94;
        const jn = -(1 + e) * vn / (1 / a.mass + 1 / b.mass);
        a.vx -= (jn / a.mass) * nx;
        a.vy -= (jn / a.mass) * ny;
        a.vz -= (jn / a.mass) * nz;
        b.vx += (jn / b.mass) * nx;
        b.vy += (jn / b.mass) * ny;
        b.vz += (jn / b.mass) * nz;

        a.omega -= jn * 0.035 / a.mass;
        b.omega += jn * 0.035 / b.mass;
      }
    }
  }

  let yaw = 0;
  let targetYaw = 0;
  let angularVelocity = 0;
  let dragging = false;
  let pointerId = null;
  let lastX = 0;
  let manualUntil = 0;
  let last = performance.now();

  stage.addEventListener('pointerdown', e => {
    dragging = true;
    pointerId = e.pointerId;
    stage.setPointerCapture(pointerId);
    stage.classList.add('is-dragging');
    lastX = e.clientX;
    angularVelocity = 0;
    manualUntil = performance.now() + 2600;
  });

  stage.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    targetYaw += dx * 0.72;
    angularVelocity = dx * 0.24;
    manualUntil = performance.now() + 2600;
  });

  function endDrag(e) {
    if (!dragging || (e.pointerId != null && e.pointerId !== pointerId)) return;
    dragging = false;
    stage.classList.remove('is-dragging');
    try { stage.releasePointerCapture(pointerId); } catch (_) {}
    pointerId = null;
    manualUntil = performance.now() + 1800;
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('dblclick', () => {
    targetYaw = Math.round(targetYaw / 360) * 360;
    angularVelocity = 0;
    manualUntil = performance.now() + 1200;
  });

  function renderMolecules() {
    const a = yaw * Math.PI / 180;
    const c = Math.cos(a), s = Math.sin(a);

    for (const m of molecules) {
      const lx = m.x - CX;
      const lz = m.z;
      const rx = lx * c + lz * s;
      const rz = -lx * s + lz * c;
      const p = clamp(CAMERA_FOCAL / (CAMERA_FOCAL - rz * 0.92), 0.82, 1.22);
      m.renderZ = rz;
      m.perspective = p;
      m.screenX = CX + rx * p;
      m.screenY = PERSPECTIVE_CENTER_Y + (m.y - PERSPECTIVE_CENTER_Y) * p;
    }

    molecules.sort((a, b) => a.renderZ - b.renderZ);
    for (const m of molecules) field.appendChild(m.el);

    for (const m of molecules) {
      const frontness = clamp((m.renderZ + RX) / (RX * 2), 0, 1);
      const breathe = 1 + Math.sin(m.phaseA * 1.55 + m.noiseSeed) * 0.009;
      const scale = m.scale * m.perspective * breathe;
      const opacity = 0.70 + frontness * 0.27;
      m.el.setAttribute(
        'transform',
        `translate(${m.screenX.toFixed(2)} ${m.screenY.toFixed(2)}) rotate(${m.angle.toFixed(2)}) scale(${scale.toFixed(4)})`
      );
      m.el.setAttribute('opacity', opacity.toFixed(3));
    }
  }

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    const carouselActive = heroArea?.classList.contains('carousel-active');
    const frameInterval = 1000 / (carouselActive ? 30 : 45);
    if (now - lastFrameAt < frameInterval) return;
    lastFrameAt = now;

    const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000));
    last = now;

    for (const m of molecules) {
      m.phaseA += dt * 0.36;
      m.phaseB += dt * 0.29;
      m.phaseC += dt * 0.21;

      const [ax, ay, az] = flowAcceleration(m, now / 1000);
      m.vx += ax * dt;
      m.vy += ay * dt;
      m.vz += az * dt;

      const speed = Math.hypot(m.vx, m.vy, m.vz);
      const target = 68 + 18 * (0.5 + 0.5 * Math.sin(m.phaseB + m.noiseSeed));
      const correction = (target - speed) * 0.085 * dt;
      if (speed > 0.001) {
        m.vx += (m.vx / speed) * correction;
        m.vy += (m.vy / speed) * correction;
        m.vz += (m.vz / speed) * correction;
      }
      if (speed > 112) {
        const k = 112 / speed;
        m.vx *= k; m.vy *= k; m.vz *= k;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      m.omega += Math.sin(now * 0.00041 + m.noiseSeed) * 0.45 * dt;
      m.omega *= Math.pow(0.972, dt * 60);
      m.angle += m.omega * dt;
      collideWithWall(m);
    }

    collideMolecules();
    for (const m of molecules) collideWithWall(m);
    collideMolecules();
    for (const m of molecules) collideWithWall(m);

    if (!dragging) {
      if (now < manualUntil) {
        targetYaw += angularVelocity * dt * 60;
        angularVelocity *= Math.pow(0.90, dt * 60);
      } else {
        targetYaw += 11.5 * dt;
      }
    }

    const ease = 1 - Math.pow(0.0015, dt);
    yaw += (targetYaw - yaw) * ease;
    if (Math.abs(yaw) > 7200 && Math.abs(targetYaw) > 7200) {
      const turns = Math.trunc(yaw / 360) * 360;
      yaw -= turns;
      targetYaw -= turns;
    }

    renderMolecules();
    renderShellHighlights();
  }

  rafId = requestAnimationFrame(tick);


  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}
