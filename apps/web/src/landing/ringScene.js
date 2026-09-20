export function initRingScene() {
  let rafId = 0;
  const heroArea = document.querySelector('.hero-area');
  let lastFrameAt = 0;

const requiredIds = ['systemLayer', 'fibers', 'highlights', 'particles', 'carbonChemistry', 'chemistry'];
if (requiredIds.some((id) => !document.getElementById(id))) return () => {};

  const NS = "http://www.w3.org/2000/svg";

  const systemLayer = document.getElementById("systemLayer");
  const fibersGroup = document.getElementById("fibers");
  const highlightsGroup = document.getElementById("highlights");
  const particlesGroup = document.getElementById("particles");
  const carbonChemistryGroup = document.getElementById("carbonChemistry");
  const chemistryGroup = document.getElementById("chemistry");

  const CX = 842;
  const CY = 457;
  const RX = 526;
  const RY = 320;

  let seed = 991827;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function angleDelta(a, b) {
    return Math.atan2(Math.sin(a-b), Math.cos(a-b));
  }

  function gaussian(a, center, width) {
    const d = angleDelta(a, center);
    return Math.exp(-(d*d)/(2*width*width));
  }

  const crossings = [
    {a:-2.58, width:.16, amp:11.5, skew: 1.00},
    {a:-1.22, width:.13, amp: 8.5, skew:-.70},
    {a:-0.10, width:.15, amp:10.8, skew: .85},
    {a: 1.08, width:.17, amp: 9.2, skew:-.90},
    {a: 2.42, width:.19, amp:10.2, skew: .72}
  ];

  const bundleZones = [
    {a:-2.72, width:.32, scale:.74},
    {a:-1.58, width:.36, scale:.86},
    {a:-.55,  width:.30, scale:.80},
    {a: .42,  width:.28, scale:1.14},
    {a: 1.62, width:.38, scale:.77},
    {a: 2.75, width:.27, scale:1.10}
  ];

  const FIBER_COUNT = 31;

  const gaps = [];
  for (let i=0; i<FIBER_COUNT-1; i++) {
    let g = 1.15 + rand()*1.85;
    if ([4,5,12,13,14,22,23].includes(i)) g *= .55;
    if ([8,18,27].includes(i)) g *= 1.55;
    gaps.push(g);
  }

  const rawOffsets = [0];
  for (const g of gaps) rawOffsets.push(rawOffsets.at(-1)+g);
  const mid = (rawOffsets[0] + rawOffsets.at(-1))/2;
  const scaleToWidth = 53 / (rawOffsets.at(-1)-rawOffsets[0]);
  const baseOffsets = rawOffsets.map(v => (v-mid)*scaleToWidth);

  const fibers = [];

  function bundleScaleAt(a) {
    let s = 1;
    for (const z of bundleZones) {
      const g = gaussian(a, z.a, z.width);
      s *= 1 + (z.scale-1)*g;
    }
    return s;
  }

  function fiberOffset(f, a, t=0) {
    const localScale = bundleScaleAt(a);
    let off = f.base * localScale;

    off += Math.sin(a*2.0 + f.phase1) * f.wave1;
    off += Math.sin(a*4.7 + f.phase2) * f.wave2;
    off += Math.sin(a*7.8 + f.phase3) * f.wave3;

    for (let zi=0; zi<crossings.length; zi++) {
      const z = crossings[zi];
      const d = angleDelta(a, z.a);
      const g = gaussian(a, z.a, z.width);

      const rank = (f.index/(FIBER_COUNT-1)-.5);
      const weave =
        Math.sin(f.index*.73 + zi*1.31) * .72 +
        Math.sin(f.index*1.41 + zi*.57) * .28;

      const sCurve = Math.tanh(d*12*z.skew);

      off += g * z.amp * weave * sCurve;
      off -= g * rank * 5.5;
    }

    // No animated wave deformation on the ring itself.
    // Keep the bundle stable and let the whole ring rotate slowly.
    const dynamic = 0;

    off += dynamic;
    return off;
  }

  function pointAt(a, offset, t=0) {
    // Calm 3D ellipse: no wave breathing, only depth / perspective cues.
    const formWave =
      Math.sin(a*3.0 + .5) * 1.35 +
      Math.sin(a*5.0 - .7) * 0.55;

    // Front/back depth cue for a more spatial, less flat ring.
    const depth = Math.cos(a - 0.28);

    // Slight perspective scaling on the horizontal radius.
    const perspectiveX = 1 + depth * 0.068;

    // Very subtle vertical depth lift so the front/back arc feels spatial.
    const depthLift = depth * 13.0;

    const localRX = (RX + offset + formWave) * perspectiveX;
    const localRY = (RY * 0.90 + offset * 0.53);

    return {
      x: CX + Math.cos(a) * localRX,
      y: CY + Math.sin(a) * localRY + depthLift
    };
  }

  function buildPath(f, t=0) {
    const STEPS = 420;
    let d = "";

    for (let i=0; i<=STEPS; i++) {
      const a = i/STEPS * Math.PI*2;
      const off = fiberOffset(f,a,t);
      const p = pointAt(a,off,t);

      d += (i===0 ? "M" : "L") +
           p.x.toFixed(2) + " " +
           p.y.toFixed(2) + " ";
    }

    return d+"Z";
  }

  function tangentDeg(a, offset, t=0) {
    const eps = 0.006;
    const p1 = pointAt(a - eps, offset, t);
    const p2 = pointAt(a + eps, offset, t);
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  }

  // -------- Main fibers --------
  for (let i=0; i<FIBER_COUNT; i++) {
    const path = document.createElementNS(NS,"path");

    const centrality = 1 - Math.abs(i-(FIBER_COUNT-1)/2)/((FIBER_COUNT-1)/2);
    const dashed = rand() > (.67 - centrality*.20);

    let stroke;
    if (i%6===0) stroke = "url(#bluePurpleC)";
    else if (i%3===0) stroke = "url(#bluePurpleB)";
    else stroke = "url(#bluePurpleA)";

    const width = .72 + centrality*1.35 + rand()*.42;
    const opacity = .17 + centrality*.49 + rand()*.14;

    path.setAttribute("class","fiber");
    path.setAttribute("stroke",stroke);
    path.setAttribute("stroke-width",width.toFixed(2));
    path.setAttribute("opacity",opacity.toFixed(2));

    if (centrality>.55 && rand()>.50) {
      path.setAttribute("filter","url(#tinyGlow)");
    }

    if (dashed) {
      const da = Math.round(12+rand()*60);
      const db = Math.round(13+rand()*26);
      const dc = Math.round(3+rand()*13);
      const dd = Math.round(16+rand()*32);
      path.setAttribute("stroke-dasharray",`${da} ${db} ${dc} ${dd}`);
      path.classList.add(["flow-a","flow-b","flow-c"][i%3]);
    }

    const f = {
      index:i,
      el:path,
      base:baseOffsets[i],
      phase1:rand()*Math.PI*2,
      phase2:rand()*Math.PI*2,
      phase3:rand()*Math.PI*2,
      wave1:.55+rand()*1.65,
      wave2:.30+rand()*.95,
      wave3:.18+rand()*.48
    };

    fibers.push(f);
    fibersGroup.appendChild(path);
  }

  // -------- Highlight fibers --------
  const highlightData = [
    {base:-10, color:"#5478E7", width:.92, opacity:.70, dash:"82 430 18 560"},
    {base: -1, color:"#6679E6", width:.78, opacity:.66, dash:"45 350 15 470"},
    {base:  8, color:"#7746CF", width:.84, opacity:.68, dash:"67 470 12 590"},
    {base: 15, color:"#6439C5", width:.68, opacity:.54, dash:"36 520"}
  ];

  const highlights = highlightData.map((h,i)=>{
    const p = document.createElementNS(NS,"path");
    p.setAttribute("class",`fiber ${["flow-a","flow-b","flow-c","flow-a"][i]}`);
    p.setAttribute("stroke",h.color);
    p.setAttribute("stroke-width",h.width);
    p.setAttribute("opacity",h.opacity);
    p.setAttribute("stroke-dasharray",h.dash);
    p.setAttribute("filter","url(#tinyGlow)");
    highlightsGroup.appendChild(p);

    return {
      index:FIBER_COUNT+2+i,
      el:p,
      base:h.base,
      phase1:.45+i*1.3,
      phase2:1.2+i*.9,
      phase3:2.0+i*.55,
      wave1:1.35,
      wave2:.65,
      wave3:.32
    };
  });

  [...fibers,...highlights].forEach(f=>{
    f.el.setAttribute("d",buildPath(f,0));
  });

  // -------- Particles --------
  const particles = [];
  const PARTICLE_COUNT = 260;

  for (let i=0; i<PARTICLE_COUNT; i++) {
    const c = document.createElementNS(NS,"circle");

    const purple = rand()>.67;
    const dice = rand();

    const r =
      dice>.97 ? 3.0+rand()*1.8 :
      dice>.79 ? 1.25+rand()*1.35 :
                 .48+rand()*1.05;

    c.setAttribute("r",r.toFixed(2));
    c.setAttribute("fill",purple?"url(#pPurple)":"url(#pBlue)");
    if (r>2.8) c.setAttribute("filter","url(#tinyGlow)");
    particlesGroup.appendChild(c);

    const f = fibers[Math.floor(rand()*fibers.length)];

    const fixedAngle = rand()*Math.PI*2;
    const fixedLateral = (rand()-.5)*4.4;

    // Important: particles no longer travel around the ring.
    // Each one is anchored to a fixed point in the fiber bundle and only floats gently.
    particles.push({
      el:c,
      fiber:f,
      angle:fixedAngle,
      lateral:fixedLateral,
      phase:rand()*Math.PI*2,
      floatAmp:.65 + rand()*2.0,
      floatSpeed:.00042 + rand()*.00048,
      sideAmp:.10 + rand()*.35,
      twinkle:.00065+rand()*.0010,
      baseR:r
    });
  }


  // =========================================================
  // Dense carbon skeleton layer
  // ---------------------------------------------------------
  // The reference design does not use isolated molecule icons only.
  // It weaves many skeletal carbon chains into the energy ring.
  // Each fragment below is code-generated SVG:
  // zig-zag C-C backbone + branches + carbonyls + hetero atoms
  // + occasional aromatic rings.
  // =========================================================

  const carbonFragments = [];

  function svgEl(name, attrs={}) {
    const el = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v));
    return el;
  }

  function addText(parent, x, y, value, cls="carbon-atom") {
    const t = svgEl("text", {x, y, class:cls});
    t.textContent = value;
    parent.appendChild(t);
    return t;
  }

  function makeCarbonFragment(spec) {
    const g = svgEl("g");
    const inner = svgEl("g");
    g.appendChild(inner);

    const n = spec.segments;
    const step = spec.step || 17;
    const amp = spec.amp || 7.5;
    const width = n * step;

    // skeletal zig-zag backbone
    const pts = [];
    for (let i=0; i<=n; i++) {
      const x = -width/2 + i*step;
      const y = (i % 2 === 0 ? -amp : amp) +
                Math.sin(i*1.73 + spec.seed*.9) * 1.4;
      pts.push([x,y]);
    }

    const classes = [
      "carbon-bond",
      "carbon-bond blue",
      "carbon-bond violet"
    ];
    const backboneClass = classes[spec.seed % classes.length];

    inner.appendChild(svgEl("polyline", {
      class: backboneClass,
      points: pts.map(p => p.join(",")).join(" ")
    }));

    // a faint offset strand on some chains, matching the layered molecular look
    if (spec.seed % 3 !== 1) {
      const offsetPts = pts.map((p,i)=>[
        p[0],
        p[1] + (i%2===0 ? 3.0 : 2.0)
      ]);
      inner.appendChild(svgEl("polyline", {
        class:"carbon-bond faint",
        points: offsetPts.map(p => p.join(",")).join(" ")
      }));
    }

    // functional groups / branches
    const branchCount = Math.max(2, Math.floor(n/3));
    for (let b=0; b<branchCount; b++) {
      const idx = 1 + ((b*3 + spec.seed) % Math.max(2,n-1));
      const [x,y] = pts[idx];
      const dir = ((b + spec.seed) % 2 === 0) ? -1 : 1;
      const len = 17 + ((b*7 + spec.seed*3) % 12);
      const ex = x + (b%3===0 ? 4 : -3);
      const ey = y + dir*len;

      const cls = (b%4===0) ? "carbon-bond blue" :
                  (b%4===1) ? "carbon-bond violet" :
                              "carbon-bond";

      inner.appendChild(svgEl("line", {
        class:cls, x1:x, y1:y, x2:ex, y2:ey
      }));

      // carbonyl double bonds on selected branches
      if ((b + spec.seed) % 4 === 0) {
        inner.appendChild(svgEl("line", {
          class:"carbon-bond faint",
          x1:x+3, y1:y, x2:ex+3, y2:ey
        }));
        addText(inner, ex-4, ey + (dir<0 ? -4 : 13), "O",
                b%2 ? "carbon-atom" : "carbon-atom blue");
      } else {
        const labels = ["OH","N","NH₂","HO","O"];
        const label = labels[(b + spec.seed*2) % labels.length];
        const clsText =
          label.includes("N") ? "carbon-atom blue" :
          (b%3===0 ? "carbon-atom violet" : "carbon-atom");
        addText(inner,
                ex + (b%2 ? 1 : -10),
                ey + (dir<0 ? -4 : 13),
                label, clsText);
      }
    }

    // occasional C=C style double bond along backbone
    if (n >= 6) {
      const di = 2 + (spec.seed % (n-3));
      const p1 = pts[di];
      const p2 = pts[di+1];
      const dx = p2[0]-p1[0], dy=p2[1]-p1[1];
      const L = Math.hypot(dx,dy) || 1;
      const nx = -dy/L*2.7, ny=dx/L*2.7;
      inner.appendChild(svgEl("line", {
        class:"carbon-bond faint",
        x1:p1[0]+nx, y1:p1[1]+ny,
        x2:p2[0]+nx, y2:p2[1]+ny
      }));
    }

    // aromatic ring on selected fragments
    if (spec.ring) {
      const idx = Math.max(2, Math.min(n-2, spec.ringIndex || Math.floor(n*.62)));
      const [ax,ay] = pts[idx];
      const side = spec.ringSide || -1;
      const cy = ay + side*33;
      const cx = ax + 3;
      const R = 13.5;
      const hex = [];
      for (let k=0;k<6;k++) {
        const ang = Math.PI/3*k;
        hex.push([cx + Math.cos(ang)*R, cy + Math.sin(ang)*R]);
      }

      inner.appendChild(svgEl("line", {
        class:"carbon-bond",
        x1:ax, y1:ay,
        x2:cx, y2:cy + (-side)*R*.75
      }));

      inner.appendChild(svgEl("polygon", {
        class: spec.seed%2 ? "carbon-bond violet" : "carbon-bond blue",
        points:hex.map(p=>p.join(",")).join(" ")
      }));

      // inner aromatic strokes
      [[0,1],[2,3],[4,5]].forEach(([a,b])=>{
        const A=hex[a], B=hex[b];
        inner.appendChild(svgEl("line", {
          class:"carbon-bond faint",
          x1:A[0]*.82+cx*.18, y1:A[1]*.82+cy*.18,
          x2:B[0]*.82+cx*.18, y2:B[1]*.82+cy*.18
        }));
      });
    }

    // optional second aromatic ring for denser / more complex aromatic chemistry
    if (spec.ring2) {
      const idx2 = Math.max(2, Math.min(n-2, spec.ring2Index || Math.floor(n*.34)));
      const [bx,by] = pts[idx2];
      const side2 = spec.ring2Side || 1;
      const cy2 = by + side2*31;
      const cx2 = bx - 2;
      const R2 = 12.5;
      const hex2 = [];
      for (let k=0;k<6;k++) {
        const ang2 = Math.PI/3*k + .08;
        hex2.push([cx2 + Math.cos(ang2)*R2, cy2 + Math.sin(ang2)*R2]);
      }

      inner.appendChild(svgEl("line", {
        class:"carbon-bond",
        x1:bx, y1:by,
        x2:cx2, y2:cy2 + (-side2)*R2*.70
      }));

      inner.appendChild(svgEl("polygon", {
        class: spec.seed%2 ? "carbon-bond blue" : "carbon-bond violet",
        points:hex2.map(p=>p.join(",")).join(" ")
      }));

      [[0,1],[2,3],[4,5]].forEach(([a,b])=>{
        const A=hex2[a], B=hex2[b];
        inner.appendChild(svgEl("line", {
          class:"carbon-bond faint",
          x1:A[0]*.82+cx2*.18, y1:A[1]*.82+cy2*.18,
          x2:B[0]*.82+cx2*.18, y2:B[1]*.82+cy2*.18
        }));
      });

      // a small hetero-atom label near the second ring to make it feel more medicinal-chemistry-like
      addText(inner, cx2 + (side2>0 ? -8 : 10), cy2 + (side2>0 ? 26 : -18),
              spec.seed % 3 === 0 ? "NH₂" : "O",
              spec.seed % 2 ? "carbon-atom blue" : "carbon-atom violet");
    }

    // terminal groups
    if (spec.seed % 2 === 0) {
      addText(inner, -width/2-20, pts[0][1]+4, "HO",
              spec.seed%4===0 ? "carbon-atom blue" : "carbon-atom");
    }
    if (spec.seed % 3 === 0) {
      addText(inner, width/2+4, pts[n][1]+4, "NH₂", "carbon-atom blue");
    }

    carbonChemistryGroup.appendChild(g);

    const data = {
      ...spec,
      el:g,
      phase: spec.seed*.83 + .4
    };
    carbonFragments.push(data);
    return data;
  }

  /*
    Distribution learned from the reference:
    - top arc: very dense, medium + long chains
    - upper-right: dense with more aromatic / N / O groups
    - sides: smaller fragments embedded in the bundle
    - bottom: another dense run of long carbon skeletons
    - radial offsets alternate so chains sit inside AND around the fiber bundle
  */
  const carbonSpecs = [
    // left / upper-left
    {a:-3.05, segments:8,  scale:.70, radial:-14, seed:91, ring:true, ringSide:1},
    {a:-2.86, segments:9,  scale:.69, radial: 2, seed:92, ring:true, ring2:true, ring2Side:-1},
    {a:-2.70, segments:7,  scale:.73, radial:-10, seed:93},
    {a:-2.54, segments:10, scale:.67, radial: 7, seed:94, ring:true, ringSide:1},
    {a:-2.38, segments:8,  scale:.71, radial:-8, seed:95, ring:true, ring2:true},

    // top-left to top（保留顶弧密集区，但密度减半）
    {a:-2.22, segments:9,  scale:.70, radial:10, seed:96, ring:true},
    {a:-2.06, segments:11, scale:.66, radial: 5, seed:97, ring:true, ring2:true, ring2Side:1},
    {a:-1.90, segments:8,  scale:.72, radial:-12, seed:98, ring:true, ringSide:-1},
    {a:-1.75, segments:10, scale:.68, radial:-5, seed:99, ring:true, ring2:true},
    {a:-1.61, segments:9,  scale:.70, radial: 8, seed:100, ring:true},
    {a:-1.46, segments:11, scale:.65, radial:-9, seed:101, ring:true, ring2:true, ring2Side:-1},
    {a:-1.32, segments:8,  scale:.72, radial: 4, seed:102, ring:true},
    {a:-1.18, segments:10, scale:.67, radial:12, seed:103, ring:true, ringSide:1},
    {a:-1.04, segments:9,  scale:.70, radial:-6, seed:104, ring:true, ring2:true},
    {a:-.90,  segments:8,  scale:.71, radial: 9, seed:105},

    // 注意：-0.5 ~ +1.5 区间是胶囊区域，留空不放结构式

    // lower-right / bottom（胶囊区外下方开始放）
    {a:1.61, segments:12, scale:.63, radial:-4, seed:30, ring:true, ring2:true, ring2Side:1},
    {a:1.69, segments:9,  scale:.70, radial:12, seed:121, ring:true, ringSide:-1},
    {a:1.84, segments:10, scale:.67, radial:-9, seed:122, ring:true, ring2:true},
    {a:2.00, segments:12, scale:.64, radial: 6, seed:123, ring:true, ring2:true, ring2Side:1},
    {a:2.16, segments:10, scale:.67, radial:-7, seed:124, ring:true},
    {a:2.31, segments:8,  scale:.71, radial:-12, seed:125, ring:true, ring2Side:-1},
    {a:2.47, segments:10, scale:.67, radial: 7, seed:126, ring:true, ring2:true},
    {a:2.62, segments:9,  scale:.69, radial:-9, seed:127, ring:true},
    {a:2.78, segments:10, scale:.67, radial: 4, seed:128, ring:true, ring2:true, ring2Side:1},
    {a:2.93, segments:8,  scale:.71, radial:-12, seed:129, ring:true, ringSide:-1},
    {a:3.08, segments:7,  scale:.73, radial: 2, seed:130, ring:true}
  ];

  carbonSpecs.forEach(makeCarbonFragment);

  function updateCarbonChemistry(t=0) {
    carbonFragments.forEach(c => {
      const anchorFiber = fibers[15 + (c.seed % 4)];
      const off = fiberOffset(anchorFiber, c.a, t) + c.radial;
      const p = pointAt(c.a, off, t);
      const tang = tangentDeg(c.a, off, t);

      // Only chemistry floats gently up/down, with small amplitude.
      const floatY =
        Math.sin(t*.00033 + c.phase) * 2.35 +
        Math.sin(t*.00019 + c.phase*1.37) * .62;

      const microRot =
        Math.sin(t*.00018 + c.phase) * .22;

      c.el.setAttribute(
        "transform",
        `translate(${p.x.toFixed(2)} ${(p.y+floatY).toFixed(2)}) ` +
        `rotate(${(tang+microRot).toFixed(2)}) scale(${(c.scale*1.16).toFixed(3)})`
      );

      c.el.setAttribute(
        "opacity",
        (.70 + .08*(.5+.5*Math.sin(t*.00026+c.phase))).toFixed(2)
      );
    });
  }

  // Whole-system motion:
  // - slow calm rotation only
  // - no wave, no system floating, no scaling
  function updateSystemTransform(t=0) {
    // Keep the ring completely locked to its design coordinate system.
    // Only internal dash flow / twinkle / chemistry micro-motion animates.
    systemLayer.removeAttribute("transform");
    systemLayer.setAttribute("opacity", "1");
  }

  // -------- Chemistry --------
  const chemPlacements = [
    // 单层化学结构：密集沿光环分布，胶囊区 a∈[-0.5, +1.5] 留空
    // 顶部弧段：排满，间距缩到 ~0.10
    { a:-3.08, id:"chem-benzamide", scale:.58, rot:-26, radial:28, drift:1.8 },
    { a:-2.98, id:"chem-peptide",   scale:.57, rot:-20, radial:22, drift:2.0 },
    { a:-2.88, id:"chem-amide",     scale:.64, rot:-14, radial:32, drift:1.7 },
    { a:-2.78, id:"chem-aromatic",  scale:.60, rot:-8,  radial:25, drift:1.8 },
    { a:-2.68, id:"chem-biaryl",    scale:.55, rot:-2,  radial:30, drift:2.0 },
    { a:-2.58, id:"chem-small",     scale:.66, rot: 4,  radial:19, drift:1.5 },
    { a:-2.48, id:"chem-fused",     scale:.56, rot: 0,  radial:33, drift:2.0 },
    { a:-2.38, id:"chem-branch",    scale:.66, rot: 6,  radial:21, drift:1.6 },
    { a:-2.28, id:"chem-chain",     scale:.62, rot:10,  radial:27, drift:1.8 },
    { a:-2.18, id:"chem-benzamide", scale:.60, rot:14,  radial:24, drift:1.8 },
    { a:-2.08, id:"chem-peptide",   scale:.57, rot:18,  radial:31, drift:2.0 },
    { a:-1.98, id:"chem-amide",     scale:.64, rot:22,  radial:20, drift:1.6 },
    { a:-1.88, id:"chem-aromatic",  scale:.60, rot:26,  radial:26, drift:1.7 },
    { a:-1.78, id:"chem-fused",     scale:.56, rot:30,  radial:32, drift:2.0 },
    { a:-1.68, id:"chem-small",     scale:.66, rot:34,  radial:18, drift:1.5 },
    { a:-1.58, id:"chem-biaryl",    scale:.55, rot:38,  radial:30, drift:2.0 },
    { a:-1.48, id:"chem-branch",    scale:.66, rot:42,  radial:22, drift:1.6 },
    { a:-1.38, id:"chem-peptide",   scale:.57, rot:46,  radial:28, drift:1.9 },
    { a:-1.28, id:"chem-benzamide", scale:.60, rot:50,  radial:25, drift:1.8 },
    { a:-1.18, id:"chem-chain",     scale:.62, rot:54,  radial:27, drift:1.8 },
    { a:-1.08, id:"chem-amide",     scale:.64, rot:58,  radial:20, drift:1.6 },
    { a:-.98,  id:"chem-aromatic",  scale:.60, rot:62,  radial:26, drift:1.7 },
    { a:-.88,  id:"chem-fused",     scale:.56, rot:66,  radial:32, drift:2.0 },
    { a:-.78,  id:"chem-small",     scale:.66, rot:70,  radial:18, drift:1.5 },
    { a:-.68,  id:"chem-biaryl",    scale:.55, rot:74,  radial:30, drift:2.0 },
    { a:-.58,  id:"chem-branch",    scale:.66, rot:78,  radial:22, drift:1.6 },
    { a:-.48,  id:"chem-peptide",   scale:.57, rot:82,  radial:28, drift:1.9 },
    { a:-.38,  id:"chem-benzamide", scale:.60, rot:86,  radial:25, drift:1.8 },

    // 右侧弧段
    { a: .04,  id:"chem-amide",     scale:.64, rot:106, radial:21, drift:1.6 },
    { a: .16,  id:"chem-biaryl",    scale:.54, rot:114, radial:31, drift:2.0 },
    { a: .28,  id:"chem-branch",    scale:.66, rot:122, radial:20, drift:1.6 },
    { a: .40,  id:"chem-chain",     scale:.68, rot:130, radial:27, drift:1.8 },
    { a: .52,  id:"chem-small",     scale:.66, rot:138, radial:18, drift:1.5 },
    { a: .64,  id:"chem-fused",     scale:.58, rot:146, radial:33, drift:2.0 },
    { a: .76,  id:"chem-peptide",   scale:.57, rot:154, radial:29, drift:2.0 },
    { a: .88,  id:"chem-benzamide", scale:.60, rot:162, radial:25, drift:1.8 },
    { a: 1.00, id:"chem-aromatic",  scale:.62, rot:170, radial:24, drift:1.7 },
    { a: 1.12, id:"chem-branch",    scale:.66, rot:178, radial:21, drift:1.6 },
    { a: 1.24, id:"chem-biaryl",    scale:.54, rot:186, radial:31, drift:2.0 },

    { a: 1.32, id:"chem-branch",    scale:.66, rot:152, radial:21, drift:1.7 },
    { a: 1.44, id:"chem-biaryl",    scale:.54, rot:162, radial:31, drift:2.0 },
    { a: 1.58, id:"chem-benzamide", scale:.60, rot:170, radial:25, drift:1.8 },
    { a: 1.70, id:"chem-peptide",   scale:.57, rot:182, radial:31, drift:2.0 },
    { a: 1.82, id:"chem-fused",     scale:.58, rot:194, radial:28, drift:1.8 },
    { a: 1.94, id:"chem-amide",     scale:.65, rot:204, radial:23, drift:1.7 },
    { a: 2.06, id:"chem-aromatic",  scale:.62, rot:214, radial:26, drift:1.8 },
    { a: 2.18, id:"chem-small",     scale:.67, rot:224, radial:18, drift:1.5 },
    { a: 2.30, id:"chem-fused",     scale:.56, rot:232, radial:33, drift:2.0 },
    { a: 2.42, id:"chem-benzamide", scale:.60, rot:240, radial:28, drift:1.8 },
    { a: 2.54, id:"chem-branch",    scale:.66, rot:248, radial:21, drift:1.7 },
    { a: 2.66, id:"chem-biaryl",    scale:.54, rot:256, radial:31, drift:2.0 },
    { a: 2.78, id:"chem-peptide",   scale:.57, rot:262, radial:30, drift:2.0 },
    { a: 2.90, id:"chem-chain",     scale:.62, rot:270, radial:22, drift:1.7 },
    { a: 3.02, id:"chem-aromatic",  scale:.60, rot:276, radial:25, drift:1.8 },
    { a: 3.14, id:"chem-peptide",   scale:.57, rot:282, radial:27, drift:1.9 },
    { a: 3.26, id:"chem-small",     scale:.66, rot:288, radial:19, drift:1.5 },
    { a: 3.38, id:"chem-benzamide", scale:.58, rot:294, radial:24, drift:1.7 }
  ];

  const chemGroups = chemPlacements.map((p, idx) => {
    const g = document.createElementNS(NS, "g");
    const use = document.createElementNS(NS, "use");
    use.setAttribute("href", "#" + p.id);
    g.appendChild(use);
    chemistryGroup.appendChild(g);
    return { ...p, idx, el:g, phase: idx * .71 + .5 };
  });

  // Special label Aβ42
  const labelGroup = document.createElementNS(NS, "g");
  const labelText = document.createElementNS(NS, "text");
  labelText.setAttribute("class", "chem-label");
  labelText.textContent = "Aβ42";
  labelGroup.appendChild(labelText);
  chemistryGroup.appendChild(labelGroup);

  function updateChemistry(t=0) {
    chemGroups.forEach(c => {
      const anchorFiber = fibers[16];
      const off = fiberOffset(anchorFiber, c.a, t) + c.radial;
      const p = pointAt(c.a, off, t);
      const tang = tangentDeg(c.a, off, t);
      // Only chemistry floats gently up/down, with small amplitude.
      const floatY =
        Math.sin(t*.00031 + c.phase) * (c.drift*1.55) +
        Math.sin(t*.00018 + c.phase*1.23) * .45;

      const microRot =
        Math.sin(t*.00018 + c.phase) * .26;

      c.el.setAttribute(
        "transform",
        `translate(${p.x.toFixed(2)} ${(p.y+floatY).toFixed(2)}) ` +
        `rotate(${(tang + c.rot + microRot).toFixed(2)}) scale(${(c.scale*1.34).toFixed(3)})`
      );

      c.el.setAttribute(
        "opacity",
        (.72 + .12*Math.sin(t*.00024 + c.phase) + .06*Math.sin(t*.00061 + c.phase*1.7)).toFixed(2)
      );
    });

    const la = -0.57;
    const lOff = fiberOffset(fibers[18], la, t) + 44;
    const lp = pointAt(la, lOff, t);
    const labelFloatY = Math.sin(t*.00029 + 1.1) * 1.7;
    labelGroup.setAttribute("transform", `translate(${lp.x.toFixed(2)} ${(lp.y + labelFloatY).toFixed(2)})`);
  }

  let lastPathUpdate = 0;

  function animate(t) {
    rafId = requestAnimationFrame(animate);
    const carouselActive = heroArea?.classList.contains('carousel-active');
    const frameInterval = 1000 / (carouselActive ? 30 : 45);
    if (t - lastFrameAt < frameInterval) return;
    lastFrameAt = t;
    updateCarbonChemistry(t);
    updateChemistry(t);
    updateSystemTransform(t);

    for (const p of particles) {
      const a = p.angle;
      const off =
        fiberOffset(p.fiber,a,t) +
        p.lateral;

      const base = pointAt(a,off,t);

      p.el.setAttribute("cx",base.x.toFixed(2));
      p.el.setAttribute("cy",base.y.toFixed(2));

      // 基础闪烁 + 能量脉冲波（沿光环角度传播的亮带）
      const pulseAngle = ((t * .00015) % (Math.PI * 2)) - Math.PI;
      const pulseDist = Math.abs(angleDelta(a, pulseAngle));
      const pulseBoost = Math.exp(-pulseDist * pulseDist * 12) * .5;

      const opacity =
        .34 + .38*(.5+.5*Math.sin(t*p.twinkle+p.phase)) + pulseBoost;

      p.el.setAttribute("opacity",Math.min(opacity, 1).toFixed(2));

      // 脉冲经过时放大粒子
      const pulseScale = 1 + pulseBoost * 1.2;
      p.el.setAttribute("r", (p.baseR * pulseScale).toFixed(2));
    }

  }

// Static ring geometry: build once.
  [...fibers,...highlights].forEach(f=>{
    f.el.setAttribute("d",buildPath(f,0));
  });

  updateCarbonChemistry(0);
  updateChemistry(0);
  updateSystemTransform(0);
  rafId = requestAnimationFrame(animate);


  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}
