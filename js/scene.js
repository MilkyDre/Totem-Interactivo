import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  OFFICES, LANDMARKS, ELEVATORS, PLANTS, TOTEM, DEPARTMENTS, CORRIDOR_Y, buildingOutline,
} from './data.js';

// Plano -> mundo. El edificio se gira para que el pasillo quede "hacia el fondo"
// de la pantalla vista desde el tótem: el extremo de los ascensores queda abajo
// y el ala de oficinas se aleja hacia arriba. Así derecha/izquierda en pantalla
// coinciden con derecha/izquierda de quien camina por el pasillo.
const S = 10;
export const toWorld = ([px, py], y = 0) => new THREE.Vector3((225 - py) / S, y, (px - 747) / S);

const WALL_H = 3.0;
const SILL_H = 0.5;
const WALL_T = 0.16;
const DOOR_W = 30; // px

const COLORS = {
  bg: 0x060b17,
  slab: 0x111a2e,
  roomFloor: 0xe9e4dc,
  corridor: 0x9aa3b2,
  sill: 0xf1f5f9,
  core: 0x2a3550,
  wood: 0xb08155,
  chair: 0x1f2937,
  plant: 0x22c55e,
  here: 0xef4444,
  glass: 0x9fd8ff,
  guide: 0x22d3ee,
};

const deptHex = (o) => (o.dept ? DEPARTMENTS[o.dept].color : '#a78bfa');

function shapeFromPoly(poly) {
  // Coordenadas de forma (X, -Z) para luego rotar -90° en X.
  const shape = new THREE.Shape();
  poly.forEach((p, i) => {
    const v = toWorld(p);
    if (i === 0) shape.moveTo(v.x, -v.z);
    else shape.lineTo(v.x, -v.z);
  });
  shape.closePath();
  return shape;
}

function flatMesh(poly, material, y) {
  const geo = new THREE.ShapeGeometry(shapeFromPoly(poly));
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function extruded(poly, depth, material) {
  const g = new THREE.ExtrudeGeometry(shapeFromPoly(poly), { depth, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Caja entre dos puntos del plano, de y0 a y1.
function wallBox(a, b, y0, y1, thickness, material, shadows = true) {
  const A = toWorld(a);
  const B = toWorld(b);
  const dx = B.x - A.x;
  const dz = B.z - A.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return null;
  const h = y1 - y0;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len + thickness, h, thickness), material);
  mesh.position.set((A.x + B.x) / 2, y0 + h / 2, (A.z + B.z) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  return mesh;
}

// Segmentos de muro de un polígono dejando un vano en la puerta.
function wallSegments(poly, door) {
  const segs = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (door) {
      const [dx, dy] = door;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const t = ((dx - a[0]) * (b[0] - a[0]) + (dy - a[1]) * (b[1] - a[1])) / (len * len);
      const px = a[0] + t * (b[0] - a[0]);
      const py = a[1] + t * (b[1] - a[1]);
      if (t > 0 && t < 1 && Math.hypot(px - dx, py - dy) < 2) {
        const h = DOOR_W / 2 / len;
        const lerp = (k) => [a[0] + k * (b[0] - a[0]), a[1] + k * (b[1] - a[1])];
        if (t - h > 0) segs.push([a, lerp(t - h)]);
        if (t + h < 1) segs.push([lerp(t + h), b]);
        continue;
      }
    }
    segs.push([a, b]);
  }
  return segs;
}

// Divide una polilínea cerrada en tramos de largo máximo (para ventanales).
function subdivide(poly, maxPx) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / maxPx));
    for (let k = 0; k < n; k++) {
      out.push([
        [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n],
        [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n],
      ]);
    }
  }
  return out;
}

export function centroid(poly) {
  let x = 0;
  let y = 0;
  poly.forEach((p) => { x += p[0]; y += p[1]; });
  return [x / poly.length, y / poly.length];
}

function bounds(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  return { x1: Math.min(...xs), x2: Math.max(...xs), y1: Math.min(...ys), y2: Math.max(...ys) };
}

function chevronTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#10b981';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#ecfdf5';
  g.lineWidth = 12;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(40, 8);
  g.lineTo(80, 32);
  g.lineTo(40, 56);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Haz de luz vertical que marca la oficina elegida.
function beamMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
    vertexShader: `
      varying float vY;
      void main() {
        vY = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying float vY;
      void main() {
        float a = pow(1.0 - vY, 1.6) * (0.45 + 0.15 * sin(uTime * 3.0 - vY * 12.0));
        gl_FragColor = vec4(uColor * 1.4, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createScene(container, { onSelect }) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.prepend(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  Object.assign(labelRenderer.domElement.style, {
    position: 'absolute', inset: '0', pointerEvents: 'none',
  });
  container.querySelector('#labels').appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.bg);
  scene.fog = new THREE.Fog(COLORS.bg, 200, 420);
  const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1000);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.7, 0.5, 0.85));
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 10;
  controls.maxDistance = 300;
  controls.maxPolarAngle = 1.45;
  controls.autoRotateSpeed = 0.5;
  // Mover libremente como un mapa: un dedo desplaza, dos dedos acercan y giran.
  controls.screenSpacePanning = false;
  controls.panSpeed = 1.3;
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  // Evita perder el edificio de vista al desplazar.
  const LIMIT = new THREE.Box3(new THREE.Vector3(-30, 0, -95), new THREE.Vector3(30, 0, 95));
  controls.addEventListener('change', () => {
    const t = controls.target;
    const clamped = t.clone().clamp(LIMIT.min, LIMIT.max);
    if (!clamped.equals(t)) {
      camera.position.add(clamped.clone().sub(t));
      t.copy(clamped);
    }
  });

  // ----- Luces -----
  scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.0));
  const sun = new THREE.DirectionalLight(0xfff7ed, 2.0);
  sun.position.set(45, 110, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 85, bottom: -85, near: 10, far: 300 });
  scene.add(sun);

  // ----- Suelo "gemelo digital" -----
  const grid = new THREE.GridHelper(600, 120, 0x1e3a5f, 0x10213a);
  grid.position.y = -1.25;
  scene.add(grid);

  // ----- Losa y fachada -----
  const outline = buildingOutline();
  const slab = extruded(outline, 1.2, new THREE.MeshStandardMaterial({ color: COLORS.slab, roughness: 0.6 }));
  slab.position.y = -1.2;
  scene.add(slab);

  const edgePts = outline.map((p) => toWorld(p, -1.2));
  edgePts.push(edgePts[0].clone());
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(edgePts),
    new THREE.LineBasicMaterial({ color: COLORS.guide }),
  ));

  const sillMat = new THREE.MeshStandardMaterial({ color: COLORS.sill, roughness: 0.5 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.glass, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false,
  });
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });
  subdivide(outline, 36).forEach(([a, b]) => {
    [
      wallBox(a, b, 0, 0.9, 0.35, sillMat),
      wallBox(a, b, 0.9, 3.4, 0.12, glassMat, false),
      wallBox(a, b, 3.4, 3.55, 0.35, mullionMat),
    ].forEach((m) => m && scene.add(m));
    const p = toWorld(a);
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.5, 0.16), mullionMat);
    mullion.position.set(p.x, 2.15, p.z);
    scene.add(mullion);
  });

  // ----- Pasillo con líneas guía luminosas -----
  scene.add(flatMesh(
    [[20, 213], [1475, 213], [1475, 247], [20, 247]],
    new THREE.MeshStandardMaterial({ color: COLORS.corridor, roughness: 0.35, metalness: 0.1 }),
    0.01,
  ));
  const guideMat = new THREE.MeshBasicMaterial({ color: COLORS.guide });
  [217, 243].forEach((y) => scene.add(wallBox([200, y], [1320, y], 0.02, 0.06, 0.12, guideMat, false)));

  // ----- Mobiliario -----
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.55 });
  const deskLegMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
  const chairMat = new THREE.MeshStandardMaterial({ color: COLORS.chair, roughness: 0.7 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x60a5fa, emissiveIntensity: 1.4 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  function chair(group, x, z, rotY) {
    const c = new THREE.Group();
    c.add(box(1.0, 0.14, 1.0, chairMat, 0, 0.95, 0));
    c.add(box(1.0, 1.0, 0.14, chairMat, 0, 1.5, 0.45));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), metalMat);
    stem.position.y = 0.5;
    c.add(stem);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 12), metalMat);
    foot.position.y = 0.08;
    c.add(foot);
    c.position.set(x, 0, z);
    c.rotation.y = rotY;
    group.add(c);
  }

  const DIRS = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
  function workstation([px, py, facing, shape]) {
    const g = new THREE.Group();
    // Mesa
    g.add(box(2.8, 0.12, 1.4, woodMat, 0, 1.5, 0));
    g.add(box(0.1, 1.45, 1.3, deskLegMat, -1.3, 0.73, 0));
    if (shape === 'L') {
      // Ala lateral del escritorio en L (hacia el lado de la silla)
      g.add(box(1.3, 0.12, 2.6, woodMat, 2.05, 1.5, -0.6));
      g.add(box(1.2, 1.45, 0.1, deskLegMat, 2.05, 0.73, -1.85));
      g.add(box(0.1, 1.45, 1.3, deskLegMat, 2.65, 0.73, 0));
    } else {
      g.add(box(0.1, 1.45, 1.3, deskLegMat, 1.3, 0.73, 0));
    }
    // Monitor y teclado (+Z local = hacia donde mira la persona)
    g.add(box(1.3, 0.8, 0.08, screenMat, 0, 2.15, 0.45));
    g.add(box(0.12, 0.35, 0.12, metalMat, 0, 1.72, 0.5));
    g.add(box(0.9, 0.04, 0.3, metalMat, 0, 1.58, -0.1));
    // CPU
    g.add(box(0.45, 0.9, 0.9, metalMat, 1.0, 0.45, 0.1));
    chair(g, 0, -1.15, 0);
    const [dx, dy] = DIRS[facing];
    const a = toWorld([px, py]);
    const b = toWorld([px + dx, py + dy]);
    g.position.copy(a);
    g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    scene.add(g);
  }

  function roundTable([px, py]) {
    const g = new THREE.Group();
    g.position.copy(toWorld([px, py]));
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 32), woodMat);
    top.position.y = 1.5;
    top.castShadow = true;
    g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.45, 8), metalMat);
    leg.position.y = 0.73;
    g.add(leg);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      chair(g, Math.sin(a) * 2.3, Math.cos(a) * 2.3, a);
    }
    scene.add(g);
  }

  function meetingTable([px, py]) {
    const g = new THREE.Group();
    g.position.copy(toWorld([px, py]));
    g.add(box(7, 0.14, 3, woodMat, 0, 1.5, 0));
    g.add(box(6, 1.4, 0.2, deskLegMat, 0, 0.72, 0));
    [-2.4, 0, 2.4].forEach((x) => {
      chair(g, x, 2.2, 0);
      chair(g, x, -2.2, Math.PI);
    });
    scene.add(g);
  }

  function plant([px, py]) {
    const p = toWorld([px, py]);
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.45, 1.0, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
    );
    pot.position.set(p.x, 0.5, p.z);
    pot.castShadow = true;
    scene.add(pot);
    const leaves = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 1),
      new THREE.MeshStandardMaterial({ color: COLORS.plant, roughness: 0.8, flatShading: true }),
    );
    leaves.position.set(p.x, 1.9, p.z);
    leaves.scale.y = 1.3;
    leaves.castShadow = true;
    scene.add(leaves);
  }
  PLANTS.forEach(plant);

  // ----- Núcleos: escaleras, ascensores, baños -----
  const coreMat = new THREE.MeshStandardMaterial({ color: COLORS.core, roughness: 0.7 });
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });

  function stairs(poly) {
    const { x1, x2, y1, y2 } = bounds(poly);
    scene.add(flatMesh(poly, coreMat, 0.02));
    const lanes = [[y1 + 15, (y1 + y2) / 2 - 4], [(y1 + y2) / 2 + 4, y2 - 15]];
    const n = 10;
    const run = x2 - x1 - 60;
    lanes.forEach(([ya, yb], lane) => {
      for (let k = 0; k < n; k++) {
        const xa = x1 + 15 + (run * k) / n;
        const xb = xa + run / n;
        const h = 0.25 * (lane === 0 ? k + 1 : n - k);
        const a = toWorld([xa, ya]);
        const b = toWorld([xb, yb]);
        scene.add(box(Math.abs(b.x - a.x), h, Math.abs(b.z - a.z), stepMat, (a.x + b.x) / 2, h / 2, (a.z + b.z) / 2));
      }
    });
    wallSegments(poly).forEach(([a, b]) => {
      const w = wallBox(a, b, 0, 1.2, WALL_T, sillMat);
      if (w) scene.add(w);
    });
  }

  function solidCore(poly, h) {
    const m = extruded(poly, h, coreMat);
    scene.add(m);
    scene.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(m.geometry, 30),
      new THREE.LineBasicMaterial({ color: 0x475569 }),
    ));
  }

  LANDMARKS.forEach((lm) => {
    if (lm.kind === 'stairs') stairs(lm.poly);
    else solidCore(lm.poly, lm.kind === 'elevators' ? 3.6 : 3.0);
    const el = document.createElement('div');
    el.className = 'landmark-label';
    el.textContent = lm.label;
    const obj = new CSS2DObject(el);
    obj.position.copy(toWorld(lm.labelAt || centroid(lm.poly), lm.kind === 'stairs' ? 3 : 4.2));
    scene.add(obj);
  });

  // Puertas de los 3 ascensores con indicador luminoso
  ELEVATORS.forEach(({ x1, x2, y }) => {
    const mid = (x1 + x2) / 2;
    [[x1 + 5, mid - 0.5], [mid + 0.5, x2 - 5]].forEach(([a, b]) => {
      scene.add(wallBox([a, y + 2], [b, y + 2], 0, 2.8, 0.1, doorMat));
    });
    scene.add(wallBox([mid - 8, y + 2.5], [mid + 8, y + 2.5], 3.0, 3.25, 0.06, lightMat, false));
  });

  // ----- Oficinas -----
  const rooms = new Map();
  const pickables = [];
  OFFICES.forEach((office) => {
    const color = new THREE.Color(deptHex(office));
    const floorColor = new THREE.Color(COLORS.roomFloor).lerp(color, 0.18);
    const floor = flatMesh(office.poly, new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.75 }), 0.03);
    floor.userData.officeId = office.id;
    scene.add(floor);
    pickables.push(floor);

    const roomGlass = new THREE.MeshPhysicalMaterial({
      color, transparent: true, opacity: 0.14, roughness: 0.2, depthWrite: false,
    });
    const neon = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(0.9) });
    wallSegments(office.poly, office.door).forEach(([a, b]) => {
      [
        wallBox(a, b, 0, SILL_H, WALL_T, sillMat),
        wallBox(a, b, SILL_H, WALL_H, WALL_T * 0.6, roomGlass, false),
        wallBox(a, b, WALL_H, WALL_H + 0.1, WALL_T * 1.2, neon, false),
      ].forEach((m) => m && scene.add(m));
    });

    (office.desks || []).forEach(workstation);
    if (office.roundTable) roundTable(office.roundTable);
    if (office.meetingTable) meetingTable(office.meetingTable);

    // Etiquetas por fuera del muro exterior: Informática a la derecha y
    // Adquisiciones a la izquierda, para que no se tapen entre sí.
    const [cx, cy] = centroid(office.poly);
    const north = cy < CORRIDOR_Y;
    const wrap = document.createElement('div');
    const el = document.createElement('button');
    el.className = `room-label ${north ? 'side-r' : 'side-l'}`;
    el.style.setProperty('--c', deptHex(office));
    el.innerHTML = '<span class="ic"></span><span class="nm"></span>';
    el.querySelector('.ic').textContent = office.icon;
    el.querySelector('.nm').textContent = office.short;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(office.id);
    });
    wrap.appendChild(el);
    const label = new CSS2DObject(wrap);
    label.position.copy(toWorld([cx, north ? 38 : 412], 3.6));
    scene.add(label);

    rooms.set(office.id, {
      office, floor, floorColor, roomGlass, neon, el, color,
    });
  });

  // ----- Tótem "Usted está aquí" -----
  const hereGroup = new THREE.Group();
  hereGroup.position.copy(toWorld([TOTEM.x, TOTEM.y]));
  hereGroup.add(box(1.4, 0.2, 0.8, metalMat, 0, 0.1, 0));
  hereGroup.add(box(1.1, 3.4, 0.35, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }), 0, 1.9, 0));
  hereGroup.add(box(0.9, 2.6, 0.05, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }), 0, 2.0, 0.2));
  const rings = [0, 0.5].map((offset) => {
    const r = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.9, 48),
      new THREE.MeshBasicMaterial({ color: COLORS.here, transparent: true, side: THREE.DoubleSide }),
    );
    r.rotation.x = -Math.PI / 2;
    r.position.y = 0.08;
    r.userData.offset = offset;
    hereGroup.add(r);
    return r;
  });
  const hereEl = document.createElement('div');
  hereEl.className = 'here-label';
  hereEl.textContent = '📍 Usted está aquí';
  const hereLabel = new CSS2DObject(hereEl);
  hereLabel.position.y = 4.4;
  hereGroup.add(hereLabel);
  scene.add(hereGroup);

  // ----- Ruta y marcadores -----
  const chevrons = chevronTexture();
  const fx = new THREE.Group();
  scene.add(fx);
  let routeMesh = null;
  let routeCurve = null;
  let beam = null;
  let halo = null;
  const sparks = [];

  function routePoints(office) {
    const c = centroid(office.poly);
    const [dx, dy] = office.door;
    const pts = [
      [TOTEM.x, TOTEM.y],
      [TOTEM.x, CORRIDOR_Y],
      [dx, CORRIDOR_Y],
      [dx, dy],
      [dx, c[1]],
    ];
    return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1);
  }

  function routeLengthPx(office) {
    const pts = routePoints(office);
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return l;
  }

  function clearRoute() {
    fx.children.slice().forEach((m) => {
      fx.remove(m);
      m.geometry?.dispose();
    });
    routeMesh = null;
    routeCurve = null;
    beam = null;
    halo = null;
    sparks.length = 0;
  }

  function drawRoute(office) {
    clearRoute();
    const pts = routePoints(office).map((p) => toWorld(p, 0));
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    routeCurve = path;
    const len = path.getLength();
    const tex = chevrons.clone();
    tex.needsUpdate = true;
    tex.repeat.set(len / 1.6, 1);
    routeMesh = new THREE.Mesh(
      new THREE.TubeGeometry(path, Math.ceil(len * 4), 0.55, 10, false),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    routeMesh.scale.y = 0.12;
    routeMesh.position.y = 0.12;
    fx.add(routeMesh);

    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xa7f3d0 });
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), sparkMat);
      s.userData.offset = k / 4;
      sparks.push(s);
      fx.add(s);
    }

    const end = pts[pts.length - 1];
    const c = toWorld(centroid(office.poly));
    beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 26, 40, 1, true), beamMaterial(deptHex(office)));
    beam.position.set(c.x, 13, c.z);
    fx.add(beam);
    halo = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.3, 48),
      new THREE.MeshBasicMaterial({ color: deptHex(office), transparent: true, side: THREE.DoubleSide }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(end.x, 0.1, end.z);
    fx.add(halo);
  }

  // ----- Cámara -----
  const HOME = { target: new THREE.Vector3(0, 0, 8), position: new THREE.Vector3(0, 150, 122) };
  camera.position.copy(HOME.position);
  controls.target.copy(HOME.target);
  controls.update();

  let tween = null;
  let tour = null;
  function flyTo(position, target, duration = 1400) {
    tween = {
      fromP: camera.position.clone(),
      fromT: controls.target.clone(),
      toP: position,
      toT: target,
      start: performance.now(),
      duration,
    };
  }

  function frameOffice(office) {
    const pts = routePoints(office).map((p) => toWorld(p));
    const bx = new THREE.Box3().setFromPoints(pts);
    bx.expandByScalar(6);
    const center = bx.getCenter(new THREE.Vector3());
    const size = bx.getSize(new THREE.Vector3());
    const span = Math.max(size.z, size.x * 1.3, 50);
    const dist = span * 1.3 + 12;
    center.z += span * 0.12; // deja el tótem visible sobre la ficha inferior
    const dir = new THREE.Vector3(0, 1.25, 0.9).normalize();
    flyTo(center.clone().add(dir.multiplyScalar(dist)), center);
  }

  function stopTour() {
    tour = null;
    controls.enabled = true;
  }

  // ----- Selección -----
  let selected = null;
  function select(id) {
    stopTour();
    selected = id;
    rooms.forEach((r, rid) => {
      const on = rid === id;
      r.el.classList.toggle('active', on);
      r.el.classList.toggle('dim', Boolean(id) && !on);
      r.roomGlass.opacity = on ? 0.24 : 0.14;
      r.neon.color.copy(r.color).multiplyScalar(on ? 1.5 : (id ? 0.4 : 0.9));
      r.floor.material.color.copy(r.floorColor);
    });
    if (!id) {
      clearRoute();
      return;
    }
    const office = rooms.get(id).office;
    drawRoute(office);
    frameOffice(office);
  }

  // Recorrido tipo dron desde el tótem hasta la oficina seleccionada.
  function playTour() {
    if (!routeCurve || !selected) return;
    tween = null;
    controls.enabled = false;
    tour = {
      start: performance.now(),
      duration: Math.max(5000, routeCurve.getLength() * 90),
      office: rooms.get(selected).office,
    };
  }

  // Botones de navegación: acercar/alejar, girar y vista cenital.
  const sph = new THREE.Spherical();
  function orbit(fn) {
    stopTour();
    const off = camera.position.clone().sub(controls.target);
    sph.setFromVector3(off);
    fn(sph);
    sph.radius = THREE.MathUtils.clamp(sph.radius, controls.minDistance, controls.maxDistance);
    sph.phi = THREE.MathUtils.clamp(sph.phi, 0.05, controls.maxPolarAngle);
    flyTo(controls.target.clone().add(new THREE.Vector3().setFromSpherical(sph)), controls.target.clone(), 600);
  }
  const zoom = (f) => orbit((p) => { p.radius *= f; });
  const rotate = (a) => orbit((p) => { p.theta += a; });
  let topView = false;
  function toggleTop() {
    topView = !topView;
    orbit((p) => { p.phi = topView ? 0.05 : 0.75; });
    return topView;
  }

  function resetView() {
    topView = false;
    stopTour();
    flyTo(HOME.position.clone(), HOME.target.clone());
  }

  // ----- Toques sobre el modelo -----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    tween = null;
    if (tour) stopTour();
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved > 12 || !quick) return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (hit) onSelect(hit.object.userData.officeId);
  });

  // ----- Bucle -----
  const clock = new THREE.Clock();
  const dir = new THREE.Vector3();
  function loop() {
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    if (tween) {
      const k = Math.min(1, (performance.now() - tween.start) / tween.duration);
      const e = easeInOut(k);
      camera.position.lerpVectors(tween.fromP, tween.toP, e);
      controls.target.lerpVectors(tween.fromT, tween.toT, e);
      if (k >= 1) tween = null;
    }

    if (tour && routeCurve) {
      const k = Math.min(1, (performance.now() - tour.start) / tour.duration);
      const u = easeInOut(k) * 0.9;
      const p = routeCurve.getPointAt(u);
      const ahead = routeCurve.getPointAt(Math.min(1, u + 0.06));
      dir.subVectors(ahead, p).setY(0);
      if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
      dir.normalize();
      camera.position.set(p.x - dir.x * 13, 15, p.z - dir.z * 13);
      controls.target.set(ahead.x + dir.x * 6, 1.5, ahead.z + dir.z * 6);
      camera.lookAt(controls.target);
      if (k >= 1) {
        const { office } = tour;
        stopTour();
        frameOffice(office);
      }
    }

    rings.forEach((r) => {
      const ph = (t * 0.8 + r.userData.offset) % 1;
      r.scale.setScalar(1 + ph * 0.8);
      r.material.opacity = 1 - ph;
    });

    if (routeMesh) routeMesh.material.map.offset.x -= dt * 1.4;
    if (routeCurve) {
      sparks.forEach((s) => {
        s.position.copy(routeCurve.getPointAt((t * 0.18 + s.userData.offset) % 1));
        s.position.y = 0.5;
      });
    }
    if (beam) beam.material.uniforms.uTime.value = t;
    if (halo) halo.scale.setScalar(1 + 0.15 * Math.sin(t * 4));

    if (selected) {
      const r = rooms.get(selected);
      const k = 0.5 + 0.5 * Math.sin(t * 3);
      r.floor.material.color.copy(r.floorColor).lerp(r.color, 0.25 + 0.35 * k);
    }

    if (!tour) controls.update();
    composer.render();
    labelRenderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    select,
    resetView,
    playTour,
    zoom,
    rotate,
    toggleTop,
    setAutoRotate(v) { controls.autoRotate = v; },
    routeLengthPx,
  };
}
