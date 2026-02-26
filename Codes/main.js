// main.js
import * as THREE from './node_modules/three/build/three.module.js';
import { createBuilding } from './building.js';
import { createPlayground } from './playground.js';
import { loadTex } from './utils.js';

// ---------- renderer / scene / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // softer shadows
renderer.toneMappingExposure = 1.05;                // tiny lift
document.body.appendChild(renderer.domElement);


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c4ff);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera);

// Orbit target (center of the house)
const target = new THREE.Vector3(0, 3, 0);
let radius = 16, theta = Math.PI * 0.25, phi = Math.PI * 0.35;
function placeCamera() {
  const x = target.x + radius * Math.cos(theta) * Math.cos(phi);
  const y = target.y + radius * Math.sin(phi);
  const z = target.z + radius * Math.sin(theta) * Math.cos(phi);
  camera.position.set(x, y, z);
  camera.lookAt(target);
}
placeCamera();

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 0.5); // was 0.25
scene.add(hemi);

// fill so the scene never gets too dark when the sun swings behind objects
const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.6); // was 2.0
sun.position.set(10, 8, 0);
sun.castShadow = true;
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far = 60;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;                           // reduce acne
scene.add(sun);

// ---------- create scene content from modules ----------
const mainBuildingMesh = createBuilding(scene);        // returns the main building mesh
const playgroundGroup  = createPlayground(scene);      // adds ground, fence, goal, swing, trees

// ---------- custom shader (kept on the ground plane only) ----------
const VS = /* glsl */`
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FS = /* glsl */`
  precision mediump float;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;
  uniform sampler2D uTex0;
  uniform vec3 uLightPos;

  vec3 lambert(vec3 N, vec3 L, vec3 base){
    float ndl = max(dot(normalize(N), normalize(L)), 0.0);
    return base * (0.25 + 0.75 * ndl);
  }

  void main(){
    vec3 albedo = texture2D(uTex0, vUv).rgb;
    vec3 L = uLightPos - vWorldPos;
    vec3 color = lambert(vNormal, L, albedo);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Find the ground inside the playground (we’ll swap its material to the shader)
const ground = playgroundGroup.children.find(
  o => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry'
);
if (ground) {
  const grassTex = loadTex('./assets/textures/grass.jpg', 8);
  ground.material = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: FS,
    uniforms: {
      uTex0:     { value: grassTex },
      uLightPos: { value: sun.position.clone() }
    },
    side: THREE.DoubleSide
  });
  ground.receiveShadow = true;
}

// ---------- keyboard: move camera around the building ----------
window.addEventListener('keydown', (e) => {
  const step = 0.08;
  if (e.key === 'ArrowLeft')  theta -= step;
  if (e.key === 'ArrowRight') theta += step;
  if (e.key === 'ArrowUp')    phi = Math.min(phi + step, Math.PI * 0.49);
  if (e.key === 'ArrowDown')  phi = Math.max(phi - step, Math.PI * 0.05);
  if (e.key.toLowerCase() === 'q') radius = Math.max(6, radius - 0.6);
  if (e.key.toLowerCase() === 'e') radius = Math.min(40, radius + 0.6);
  if (e.key.toLowerCase() === 'r') { radius = 16; theta = Math.PI*0.25; phi = Math.PI*0.35; }
  placeCamera();
});

// ---------- mouse: click building to change its wall texture ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let wallTexIndex = 0;

// 1) Make sure your textures array exists & is loaded once
// (Put this near your other top-level loads)
const buildingWallTextures = [
  loadTex('./assets/textures/brick.jpg', 2),
  loadTex('./assets/textures/brick_alt.jpg', 2),
  
];
// If you rely on repeat/wrap, set it here so every texture behaves the same:
for (const t of buildingWallTextures) {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
}

function onPointerDown(ev){
  // 2) Use canvas bounds, not window size
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (ev.clientX - rect.left) / rect.width;
  const y = (ev.clientY - rect.top)  / rect.height;
  pointer.x =  x * 2 - 1;
  pointer.y = -y * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  // 3) Raycast the whole HOUSE, then walk up to the main wall mesh
  //    (so clicks on door/window/crown still count)
  const hits = raycaster.intersectObject(scene, true);
  if (!hits.length) return;

  // find the ancestor named 'MainBuilding' (you set this name in createBuilding)
  let hit = hits[0].object;
  while (hit && hit !== mainBuildingMesh && hit.parent) hit = hit.parent;

  if (hit === mainBuildingMesh) {
    wallTexIndex = (wallTexIndex + 1) % buildingWallTextures.length;
    const next = buildingWallTextures[wallTexIndex];

    // 4) Swap map safely; keep roughness/etc. the same
    if (mainBuildingMesh.material && 'map' in mainBuildingMesh.material) {
      mainBuildingMesh.material.map = next;
      // If your UV scale matters, also copy repeat/wrap each time (defensive):
      next.needsUpdate = true;
      mainBuildingMesh.material.needsUpdate = true;
    }
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
// (Prefer attaching to the canvas instead of window)


// ---------- resize ----------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- animation: rotate light around the building ----------
const clock = new THREE.Clock();
let sunAngle = 0;               // keep our own angle for smooth stepping

function animate() {
  const dt = clock.getDelta();  // time since last frame
  sunAngle += dt * 0.35;        // rotation speed (radians/sec). tweak 0.35 if you want slower/faster

  const r = 12;
  sun.position.set(Math.cos(sunAngle) * r, 8, Math.sin(sunAngle) * r);

  // update shader uniform on ground
  if (ground && ground.material && ground.material.uniforms) {
    ground.material.uniforms.uLightPos.value.copy(sun.position);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

