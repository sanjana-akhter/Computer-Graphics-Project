import * as THREE from './node_modules/three/build/three.module.js';
const loader = new THREE.TextureLoader();
export function loadTex(path, repeat = 1) {
  const tex = loader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
