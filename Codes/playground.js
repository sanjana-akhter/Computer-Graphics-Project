import * as THREE from './node_modules/three/build/three.module.js';
import { loadTex } from './utils.js';

export function createPlayground(scene) {
  const group = new THREE.Group();
  group.name = 'Playground';
  scene.add(group);

  // ---------- GROUND ----------
  const grass = loadTex('./assets/textures/grass.jpg', 8);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 28),
    new THREE.MeshStandardMaterial({ map: grass })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Optional white boundary line
  group.add(new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-16, 0.02, -14),
      new THREE.Vector3( 16, 0.02, -14),
      new THREE.Vector3( 16, 0.02,  14),
      new THREE.Vector3(-16, 0.02,  14),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  ));

  // ---------- FENCE (posts + rails + gate) ----------
  const fence = new THREE.Group(); fence.name = 'Fence';
  const fenceMetal = new THREE.MeshStandardMaterial({
    color: 0xcfd6de, metalness: 0.6, roughness: 0.3,
    map: loadTex('./assets/textures/metal.jpg', 1)
  });

  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8);
  const railGeo = new THREE.BoxGeometry(2.5, 0.07, 0.07);

  const post = (x, z) => {
    const m = new THREE.Mesh(postGeo, fenceMetal);
    m.position.set(x, 1, z);
    m.castShadow = true;
    return m;
  };
  const rail = (x, y, z, rotY) => {
    const m = new THREE.Mesh(railGeo, fenceMetal);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    m.castShadow = true;
    return m;
  };

  for (let x = -16; x <= 16; x += 2.5) { fence.add(post(x, -14)); fence.add(post(x, 14)); }
  for (let z = -14; z <= 14; z += 2.5) { fence.add(post(-16, z)); fence.add(post(16, z)); }

  for (let x = -15; x <= 15; x += 2.5) {
    fence.add(rail(x, 1.2, -14, 0));
    fence.add(rail(x, 0.6, -14, 0));
    fence.add(rail(x, 1.2,  14, 0));
    fence.add(rail(x, 0.6,  14, 0));
  }
  for (let z = -13; z <= 13; z += 2.5) {
    fence.add(rail(-16, 1.2, z, Math.PI/2));
    fence.add(rail(-16, 0.6, z, Math.PI/2));
    fence.add(rail( 16, 1.2, z, Math.PI/2));
    fence.add(rail( 16, 0.6, z, Math.PI/2));
  }

  // gate posts on south side
  const gateLeft  = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,2.2,12), fenceMetal);
  const gateRight = gateLeft.clone();
  gateLeft.position.set(-1.5, 1.1,  -14);
  gateRight.position.set( 1.5, 1.1, -14);
  fence.add(gateLeft, gateRight);

  group.add(fence);

// ---------- SOCCER GOAL (single, in front of building, with texture) ----------
function createGoal(z) {
  const goal = new THREE.Group();

  // load the bar texture
  const barTex = loadTex('./assets/textures/goalbar.jpg', 1);
  barTex.wrapS = barTex.wrapT = THREE.RepeatWrapping;
  barTex.anisotropy = 8;

  const goalMat = new THREE.MeshStandardMaterial({
    map: barTex,
    metalness: 0.2,
    roughness: 0.6
  });

  // geometries
  const poleGeo  = new THREE.CylinderGeometry(0.1, 0.1, 2, 24);
  const crossGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 24);

  // two vertical posts
  const leftPost = new THREE.Mesh(poleGeo, goalMat);
  const rightPost = new THREE.Mesh(poleGeo, goalMat);
  leftPost.position.set(-2, 1, z);
  rightPost.position.set( 2, 1, z);

  // crossbar
  const crossbar = new THREE.Mesh(crossGeo, goalMat);
  crossbar.rotation.z = Math.PI / 2; // lay along X
  crossbar.position.set(0, 2, z);

  // add to group
  goal.add(leftPost, rightPost, crossbar);

  // shadows
  goal.traverse(o => { o.castShadow = true; o.receiveShadow = true; });

  return goal;
}

// keep only the one goal in front of the building
const frontGoal = createGoal(12);
group.add(frontGoal);

  
  

 // ---------- TREES (layered canopy with leaf texture) ----------
const addTree = (x, z, scale = 1) => {
  const tree = new THREE.Group();
  tree.name = 'Tree';

  // --- Materials & textures ---
  // Trunk
  const trunkMat = new THREE.MeshStandardMaterial({
    map: loadTex('./assets/textures/wood.jpg', 1),
    color: 0x8a5a2b,
    roughness: 0.9,
    metalness: 0.0
  });

  // Leaf texture (tileable). We subtly vary UV repeat per blob to avoid a "stamp" look.
  const makeLeafMat = (repeat = 2) => {
    const tex = loadTex('./assets/textures/leaf.jpg', repeat);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8; // crisper at glancing angles
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.85,
      metalness: 0.0
    });
    return mat;
  };

  // --- Trunk ---
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24 * scale, 0.18 * scale, 1.8 * scale, 12),
    trunkMat
  );
  trunk.position.y = 0.9 * scale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  // --- Base dirt ring (helps it feel "planted") ---
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5 * scale, 0.5 * scale, 0.03, 20),
    new THREE.MeshStandardMaterial({ map: loadTex('./assets/textures/dirt.jpg', 2) })
  );
  base.position.y = 0.015;
  base.receiveShadow = true;
  tree.add(base);

  // --- Foliage (3 stacked blobs). Slight offsets & rotations for organic feel ---
  const makeBlob = (radius, height, repeat, squash = 1.0) => {
    // Use a sphere then non-uniform scale to make it a bit "crown-like"
    const geo = new THREE.SphereGeometry(radius * scale, 24, 20);
    const mat = makeLeafMat(repeat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height * scale;

    // Small positional jitter
    mesh.position.x += (Math.random() * 0.1 - 0.05) * scale;
    mesh.position.z += (Math.random() * 0.1 - 0.05) * scale;

    // Slight squash to avoid perfect spheres
    mesh.scale.set(1.0, squash, 1.0);

    // Random rotation so the texture tiling varies between blobs
    mesh.rotation.y = Math.random() * Math.PI * 2;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Bottom / Middle / Top foliage blobs (bigger -> smaller, different UV repeats)
  const leavesBottom = makeBlob(0.95, 2.0, 2, 0.9);
  const leavesMid    = makeBlob(0.78, 2.65, 3, 0.95);
  const leavesTop    = makeBlob(0.58, 3.12, 4, 1.0);

  tree.add(leavesBottom, leavesMid, leavesTop);

  // --- Final placement & shadow settings ---
  tree.position.set(x, 0, z);
  tree.traverse(o => {
    o.castShadow = true;
    o.receiveShadow = true;
  });

  // Add to your world group
  group.add(tree);
};

// --- Example placement (tweak as you like) ---
addTree(12, -10, 1.1);
addTree(13.5, -6, 0.9);
addTree(10, 7, 1.2);
addTree(-13, 9, 1.0);



  // ---------- BENCHES  ----------
  function createBench() {
    const bench = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ map: loadTex('./assets/textures/wood.jpg', 2), color: 0x996633 });
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.25), wood);
    const leg  = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    const seat1 = slat.clone(); seat1.position.set(0, 0.5, 0);
    const seat2 = slat.clone(); seat2.position.set(0, 0.58, 0);
    const leg1b = leg.clone();  leg1b.position.set(-0.45, 0.3, 0.1);
    const leg2b = leg.clone();  leg2b.position.set( 0.45, 0.3, 0.1);
    bench.add(seat1, seat2, leg1b, leg2b);
    bench.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
    return bench;
  }
  const bench1 = createBench();
  bench1.position.set(-6, 0.01, -13);
  bench1.scale.set(2, 2, 2);   // 2× bigger in all directions
  group.add(bench1);
  
  const bench2 = createBench();
  bench2.position.set(6, 0.01, -13);
  bench2.scale.set(2, 2, 2);   // also 2× bigger
  group.add(bench2);
  
 // ----------Foot BALL ----------
const soccerTex = loadTex('./assets/textures/football.jpg', 1);
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.4, 32, 32), // smaller ball (radius 0.4)
  new THREE.MeshStandardMaterial({ map: soccerTex })
);
ball.position.set(0, 0.4, 10.5); // in front of the goal (z ~ 12, so 10.5 is slightly in front)
ball.castShadow = true;
ball.receiveShadow = true;
group.add(ball);




  return group;
}
