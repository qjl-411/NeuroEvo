import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function initBrainScene() {
  let starRafId = 0;
  let brainRafId = 0;

// -----------------------------------------------------------------------------
// Background star field — deterministic and stationary, matching the reference.
// -----------------------------------------------------------------------------
const starCanvas = document.querySelector('#stars')
if (!(starCanvas instanceof HTMLCanvasElement)) return () => {}
const starCtx = starCanvas.getContext('2d')
if (!starCtx) return () => {}
let starSeed = 391827
function rand(){ starSeed = (starSeed * 1664525 + 1013904223) >>> 0; return starSeed / 4294967296 }
const stars = Array.from({length:220},()=>({
  x:rand(), y:rand(), r:rand()>.93 ? .9+rand()*1.1 : .28+rand()*.65,
  a:.12+rand()*.56, blue:rand()>.28,
  twinkleSpeed:.0008+rand()*.002, twinklePhase:rand()*Math.PI*2,
  driftX:(rand()-.5)*.00003, driftY:(rand()-.5)*.00002,
}))
let starW=0, starH=0, starDpr=0
function resizeStars(){
  const nextW=window.innerWidth, nextH=window.innerHeight
  const nextDpr=Math.min(window.devicePixelRatio||1,1.5)
  if(nextW===starW && nextH===starH && nextDpr===starDpr) return
  starW=nextW; starH=nextH; starDpr=nextDpr
  starCanvas.width=Math.round(starW*starDpr); starCanvas.height=Math.round(starH*starDpr)
  starCanvas.style.width=`${starW}px`; starCanvas.style.height=`${starH}px`
  starCtx.setTransform(starDpr,0,0,starDpr,0,0)
}
resizeStars()
window.addEventListener('resize', resizeStars, { passive:true })

function drawStars(t){
  const w=starW,h=starH
  starCtx.clearRect(0,0,w,h)
  // 保留透明背景：不在此处绘制不透明底色，否则会完全遮盖 z-index 更低的
  // #neural-background 神经元动态背景。底色已由 body / #scene 的 radial-gradient
  // 提供，stars canvas 只负责叠加星星与淡淡的氛围光晕。

  const g0=starCtx.createRadialGradient(w*.31,h*.47,0,w*.31,h*.47,Math.max(w,h)*.48)
  g0.addColorStop(0,'rgba(18,72,180,.15)')
  g0.addColorStop(.30,'rgba(7,35,95,.09)')
  g0.addColorStop(1,'rgba(1,7,19,0)')
  starCtx.fillStyle=g0
  starCtx.fillRect(0,0,w,h)

  const g1=starCtx.createRadialGradient(w*.78,h*.54,0,w*.78,h*.54,Math.max(w,h)*.34)
  g1.addColorStop(0,'rgba(18,88,220,.10)')
  g1.addColorStop(1,'rgba(1,7,19,0)')
  starCtx.fillStyle=g1
  starCtx.fillRect(0,0,w,h)

  for(const s of stars){
    s.x += s.driftX; s.y += s.driftY
    if(s.x<0) s.x+=1; if(s.x>1) s.x-=1
    if(s.y<0) s.y+=1; if(s.y>1) s.y-=1

    const x=s.x*w,y=s.y*h
    const twinkle = .6 + .4*Math.sin(t*s.twinkleSpeed + s.twinklePhase)
    const alpha = s.a * twinkle

    starCtx.beginPath(); starCtx.arc(x,y,s.r,0,Math.PI*2)
    starCtx.fillStyle=s.blue?`rgba(16,112,255,${alpha})`:`rgba(128,179,255,${alpha*.72})`
    starCtx.fill()
    if(s.r>1.2){
      const g=starCtx.createRadialGradient(x,y,0,x,y,s.r*5.5)
      g.addColorStop(0,`rgba(44,137,255,${alpha*.24})`);g.addColorStop(1,'rgba(20,90,255,0)')
      starCtx.fillStyle=g;starCtx.fillRect(x-s.r*6,y-s.r*6,s.r*12,s.r*12)
    }
  }
}

// 鼠标视差：光环、脑部随鼠标微移
const parallaxRingBack = document.querySelector('.ring-back')
const parallaxRingFront = document.querySelector('.ring-front')
const parallaxBrain = document.querySelector('.brain-stage')
const titleBtns = document.querySelectorAll('.title-btn')
let mouseX = 0, mouseY = 0, targetMX = 0, targetMY = 0
const handleMouseMove = (e) => {
  targetMX = (e.clientX / window.innerWidth - .5) * 2
  targetMY = (e.clientY / window.innerHeight - .5) * 2
}
window.addEventListener('mousemove', handleMouseMove, { passive: true })

const heroArea = document.querySelector('.hero-area')
let lastStarFrame = 0
function starLoop(t) {
  starRafId = requestAnimationFrame(starLoop)
  const carouselActive = heroArea?.classList.contains('carousel-active')
  const interval = 1000 / (carouselActive ? 24 : 36)
  if (t - lastStarFrame < interval) return
  lastStarFrame = t

  drawStars(t)

  if (carouselActive) { targetMX = 0; targetMY = 0 }
  mouseX += (targetMX - mouseX) * .055
  mouseY += (targetMY - mouseY) * .055

  if (parallaxRingBack) parallaxRingBack.style.transform = `translate(${mouseX*6}px,${mouseY*4}px)`
  if (parallaxRingFront) parallaxRingFront.style.transform = `translate(${mouseX*6}px,${mouseY*4}px)`
  if (parallaxBrain) parallaxBrain.style.transform = `translate(${mouseX*-3}px,${mouseY*-2}px)`

  const bx = (mouseX * 4).toFixed(2)
  const by = (mouseY * 3).toFixed(2)
  titleBtns.forEach(btn => {
    btn.style.setProperty('--bx', bx + 'px')
    btn.style.setProperty('--by', by + 'px')
  })
}
starRafId = requestAnimationFrame(starLoop)

// -----------------------------------------------------------------------------
// Brain renderer. The GLB material is intentionally discarded and replaced with
// the uploaded demo's hologram shader/material treatment.
// -----------------------------------------------------------------------------
const canvas = document.querySelector('#brainCanvas')
const stage = document.querySelector('.brain-stage')
const loadingEl = document.querySelector('#brainLoading')
let errorEl = document.querySelector('#brainError')
if (!(canvas instanceof HTMLCanvasElement) || !(stage instanceof HTMLElement) || !(loadingEl instanceof HTMLElement)) {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('resize', resizeStars)
  if (starRafId) cancelAnimationFrame(starRafId)
  return () => {}
}

// The source scene.html bundled with this project can be older than the prebuilt
// dist and may not contain #brainError. The old guard treated that optional
// status element as mandatory and returned before Three.js/GLTFLoader could even
// start, which made the 3D brain disappear when running from source. Create the
// status element on demand instead of aborting the renderer.
if (!(errorEl instanceof HTMLElement)) {
  const fallbackError = document.createElement('div')
  fallbackError.id = 'brainError'
  fallbackError.className = 'brain-error'
  fallbackError.hidden = true
  fallbackError.textContent = '3D 模型加载失败，请确认 /assets/models/brain.glb 可访问。'
  stage.appendChild(fallbackError)
  errorEl = fallbackError
}

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(34,1,0.5,120)
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias:false,
  alpha:true,
  powerPreference:'high-performance',
  preserveDrawingBuffer:false,
  premultipliedAlpha:false,
})
renderer.setClearColor(0x000000,0)
renderer.outputColorSpace=THREE.SRGBColorSpace
renderer.toneMapping=THREE.ACESFilmicToneMapping
renderer.toneMappingExposure=1.20

function pixelRatio(){ return Math.min(window.devicePixelRatio||1,1.6) }
renderer.setPixelRatio(pixelRatio())

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene,camera))
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1,1),0.36,0.44,0.22)
composer.addPass(bloomPass)
composer.addPass(new OutputPass())

const controls = new OrbitControls(camera,canvas)
controls.enableDamping=false
controls.enablePan=false
controls.autoRotate=false
controls.rotateSpeed=.58
controls.zoomSpeed=.7
controls.target.set(0,0,0)

const holoUniforms={
  uTime:{value:0},
  uColorOuter:{value:new THREE.Color('#3d8aff')},
  uColorInner:{value:new THREE.Color('#9a6bff')},
  uOpacity:{value:1.0},
}

const hologramMaterial=new THREE.ShaderMaterial({
  uniforms:holoUniforms,
  transparent:true,
  depthWrite:false,
  depthTest:false,
  side:THREE.FrontSide,
  blending:THREE.NormalBlending,
  premultipliedAlpha:false,
  vertexShader:/* glsl */`
    varying vec3 vViewNormal;
    varying vec3 vViewDirection;
    varying vec3 vLocalPosition;
    varying float vLocalRadius;
    void main(){
      vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
      vViewNormal=normalize(normalMatrix*normal);
      vViewDirection=normalize(-mvPosition.xyz);
      vLocalPosition=position;
      vLocalRadius=length(position);
      gl_Position=projectionMatrix*mvPosition;
    }
  `,
  fragmentShader:/* glsl */`
    uniform float uTime;
    uniform vec3 uColorOuter;
    uniform vec3 uColorInner;
    uniform float uOpacity;
    varying vec3 vViewNormal;
    varying vec3 vViewDirection;
    varying vec3 vLocalPosition;
    varying float vLocalRadius;
    void main(){
      vec3 n=normalize(vViewNormal);
      vec3 v=normalize(vViewDirection);
      float rMax=1.35;
      float depthF=1.0-clamp(vLocalRadius/rMax,0.0,1.0);
      depthF=smoothstep(0.30,0.95,depthF);
      vec3 baseColor=mix(uColorOuter,uColorInner,depthF);
      float ndv=max(dot(n,v),0.0);
      float fresnel=pow(1.0-ndv,2.2);
      vec3 rimBoost=mix(uColorOuter,baseColor,.35)*fresnel*1.6;
      float coreGlow=depthF*depthF*.26;
      float alpha=.125;
      alpha+=fresnel*.64;
      alpha+=coreGlow*.46;
      alpha=clamp(alpha*uOpacity,.055,.90);
      vec3 color=baseColor*(.72+fresnel*2.15+coreGlow*1.30);
      color+=rimBoost;
      gl_FragColor=vec4(color,alpha);
    }
  `,
})

const modelGroup=new THREE.Group()
scene.add(modelGroup)
const TARGET_RADIUS=1.34
let modelLoaded=false
let fittedRadius=TARGET_RADIUS

function replaceWithHologram(root){
  let meshIndex=0
  root.traverse(child=>{
    if(!child.isMesh) return
    const oldMaterials=Array.isArray(child.material)?child.material:[child.material]
    for(const material of oldMaterials){
      if(!material) continue
      for(const value of Object.values(material)){ if(value?.isTexture) value.dispose() }
      material.dispose?.()
    }
    child.material=hologramMaterial
    child.castShadow=false; child.receiveShadow=false
    child.renderOrder=10+meshIndex++
  })
}

function centerAndNormalize(root){
  root.updateMatrixWorld(true)
  const box=new THREE.Box3().setFromObject(root)
  if(box.isEmpty()) throw new Error('GLB contains no visible geometry')
  const center=box.getCenter(new THREE.Vector3())
  const sphere=box.getBoundingSphere(new THREE.Sphere())
  const pivot=new THREE.Group()
  root.position.sub(center)
  pivot.add(root)
  pivot.scale.setScalar(TARGET_RADIUS/Math.max(sphere.radius,.0001))
  modelGroup.add(pivot)
  fittedRadius=TARGET_RADIUS
}

function requiredCameraDistance(radius){
  const vfov=THREE.MathUtils.degToRad(camera.fov)
  const hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect)
  return (radius/Math.sin(Math.min(vfov,hfov)/2))*.72
}
function fitCamera(){
  const distance=requiredCameraDistance(fittedRadius)
  // same side/sagittal view from the uploaded demo, nudged upward a hair
  const direction=new THREE.Vector3(1,.045,.115).normalize()
  controls.target.set(0,-.015,0)
  camera.position.copy(controls.target).add(direction.multiplyScalar(distance))
  camera.near=Math.max(.5,fittedRadius*.5)
  camera.far=distance+fittedRadius*16
  camera.updateProjectionMatrix()
  controls.minDistance=fittedRadius*1.7
  controls.maxDistance=fittedRadius*5.5
  controls.update()
}

function resizeBrain(){
  const rect=stage.getBoundingClientRect()
  const w=Math.max(2,Math.round(rect.width)), h=Math.max(2,Math.round(rect.height))
  camera.aspect=w/h
  camera.updateProjectionMatrix()
  const ratio=pixelRatio()
  renderer.setPixelRatio(ratio)
  renderer.setSize(w,h,false)
  composer.setPixelRatio(ratio)
  composer.setSize(w,h)
  if(modelLoaded) fitCamera()
}
const resizeObserver = new ResizeObserver(resizeBrain)
resizeObserver.observe(stage)
resizeBrain()

const loader=new GLTFLoader()
loader.load(
  '/assets/models/brain.glb',
  gltf=>{
    try{
      replaceWithHologram(gltf.scene)
      centerAndNormalize(gltf.scene)
      // The source asset is already oriented for the requested sagittal view.
      modelGroup.rotation.set(0,0,0)
      fitCamera()
      modelLoaded=true
      loadingEl.classList.add('is-hidden')
    }catch(err){
      console.error(err); loadingEl.classList.add('is-hidden'); errorEl.hidden=false
    }
  },
  undefined,
  err=>{ console.error('GLB load failed:',err); loadingEl.classList.add('is-hidden'); errorEl.hidden=false },
)

const clock=new THREE.Clock()
let breathPhase = 0
let lastBrainFrame = 0
function animate(now){
  brainRafId = requestAnimationFrame(animate)
  const carouselActive = heroArea?.classList.contains('carousel-active')
  const interval = 1000 / (carouselActive ? 30 : 45)
  if (now - lastBrainFrame < interval) return
  lastBrainFrame = now

  const dt = Math.min(clock.getDelta(), .05)
  const elapsed = clock.elapsedTime
  holoUniforms.uTime.value=elapsed
  breathPhase = elapsed * .8
  holoUniforms.uOpacity.value = .88 + .12 * Math.sin(breathPhase)
  if (modelLoaded) modelGroup.rotation.y += dt * 0.05
  controls.update()

  // Bloom is visually unnecessary once the apparatus is deliberately dimmed
  // behind the glass reels, and skipping the post-processing pass there frees
  // substantial GPU time for the CSS 3D transition.
  if (carouselActive) renderer.render(scene,camera)
  else composer.render()
}
brainRafId = requestAnimationFrame(animate)

  return () => {
    if (starRafId) cancelAnimationFrame(starRafId);
    if (brainRafId) cancelAnimationFrame(brainRafId);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('resize', resizeStars);
    resizeObserver.disconnect();
    controls.dispose();
    hologramMaterial.dispose();
    renderer.dispose();
  };
}
