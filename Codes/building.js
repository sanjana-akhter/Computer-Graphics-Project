import * as THREE from './node_modules/three/build/three.module.js';
import { loadTex } from './utils.js';  // utility loader

export function createBuilding(scene) {
  const house = new THREE.Group();
  house.name = 'House';
  scene.add(house);

  // ---------- MAIN BUILDING ----------
  const wallTex = loadTex('./assets/textures/brick.jpg', 2);
  const mainBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(6, 10, 6),
    new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 })
  );
  mainBuilding.name = 'MainBuilding';
  mainBuilding.position.set(0, 5, 0);
  mainBuilding.castShadow = true;
  mainBuilding.receiveShadow = true;
  house.add(mainBuilding);

// ---------- ROOF (square pyramid with proper UV + position) ----------
const roofTex = loadTex('./assets/textures/roof.jpg', 2); // repeat so it doesn't look flat
roofTex.center.set(0.5, 0.5);
roofTex.rotation = Math.PI * 0.25; // align pattern with faces

const roof = new THREE.Mesh(
  // 4-sided cone = square pyramid. Radius picked for a slight overhang on a 6x6 top.
  new THREE.ConeGeometry(4.6, 2.0, 4, 1, false),
  new THREE.MeshStandardMaterial({
    map: roofTex,
    color: 0xffffff,         // remove dark tint so the texture shows
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide   // ensures you see it from all camera angles
  })
);

// sit flush on top: building height (10) + half roof height (2/2)
roof.position.set(0, 11.0, 0);

// keep a face centered on the front (+Z). With 4 sides, 45° looks best.
roof.rotation.y = Math.PI * 0.25;

roof.castShadow = true;
roof.receiveShadow = true;
house.add(roof);

// (Optional) tiny crown/eave to hide any micro gap between roof and wall
const crown = new THREE.Mesh(
  new THREE.BoxGeometry(6.2, 0.12, 6.2),
  new THREE.MeshStandardMaterial({ color: 0x8e8e8e, roughness: 0.9 })
);
crown.position.set(0, 10.06, 0);
crown.receiveShadow = true;
house.add(crown);


 // Garage (same as you have)
const garage = new THREE.Mesh(
    new THREE.BoxGeometry(4, 4, 6),
    new THREE.MeshStandardMaterial({ map: loadTex('./assets/textures/concrete.jpg', 1.5), roughness: 0.95 })
  );
  garage.position.set(-5.1, 2, 0);
  house.add(garage);
  
  // Garage door (flip to face outward, tiny offset to avoid z-fighting)
  const garageDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 3),
    new THREE.MeshStandardMaterial({ map: loadTex('./assets/textures/garage_door.jpg', 1) })
  );
  garageDoor.position.set(-7.12, 1.5, 0);   // just in front of the garage face (-7.1)
  garageDoor.rotation.y = -Math.PI / 2;     // face outward (-X)
  house.add(garageDoor);
  

  // ---------- MAIN ENTRANCE DOOR ----------
  const frontDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 2.4),
    new THREE.MeshStandardMaterial({ map: loadTex('./assets/textures/door.jpg', 1) })
  );
  frontDoor.name = 'FrontDoor';
  frontDoor.position.set(0, 1.2, 3.05); // small outward offset
  house.add(frontDoor);

  // ---------- WINDOWS ----------
  const glassMat = new THREE.MeshStandardMaterial({
    map: loadTex('./assets/textures/glass.jpg', 1),
    color: 0xffffff,
    roughness: 0.15,
    transparent: true,
    opacity: 0.85
  });
  const winGeo = new THREE.PlaneGeometry(1.4, 1.4);

  function addWindow(x, y, z, rotY = 0) {
    const pane = new THREE.Mesh(winGeo, glassMat);
    pane.position.set(x, y, z);
    pane.rotation.y = rotY;
    house.add(pane);
  }

  const floorsY = [3.2, 8.4]; // keep only bottom + top row
  const offsets = [-2.0, 0, 2.0];

  // Front (+Z)
  floorsY.forEach(y => offsets.forEach(x => addWindow(x, y, 3.05, 0)));

  // Back (-Z)
  floorsY.forEach(y => offsets.forEach(x => addWindow(x, y, -3.05, Math.PI)));

  // (Left + Right faces → no windows now)

  // ---------- BASE ----------
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.3, 6.4),
    new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.95 })
  );
  base.position.set(0, 0.15, 0);
  base.receiveShadow = true;
  house.add(base);

  return mainBuilding;
}
