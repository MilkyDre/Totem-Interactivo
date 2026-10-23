import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  PLAN, OFFICES, LANDMARKS, ELEVATORS, TOTEM, DEPARTMENTS, CORRIDOR_Y, buildingOutline,
} from './data.js';

// Plano -> mundo. El edificio se gira para que el pasillo quede "hacia el fondo"
// de la pantalla vista desde el tótem: el extremo de los ascensores queda abajo
// y el ala de oficinas se aleja hacia arriba. Así derecha/izquierda en pantalla
// coinciden con derecha/izquierda de quien camina por el pasillo.
const S = 10;
export const toWorld = ([px, py], y = 0) => new THREE.Vector3((225 - py) / S, y, (px - 747) / S);

const WALL_H = 2.2;
const WALL_T = 0.22;
const DOOR_W = 30; // px

const COLORS = {
  floor: 0x1e293b,
  building: 0x253250,
  wall: 0xe2e8f0,
  outerWall: 0x94a3b8,
  corridor: 0x334155,
  landmark: 0x3b4660,
  neutral: 0xa78bfa,
  here: 0xef4444,
};

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

function flatMesh(poly, color, y, opacity = 1) {
  const geo = new THREE.ShapeGeometry(shapeFromPoly(poly));
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, transparent: opacity < 1, opacity,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function wallBox(a, b, height, thickness, material) {
  const A = toWorld(a);
  const B = toWorld(b);
  const dx = B.x - A.x;
  const dz = B.z - A.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len + thickness, height, thickness), material);
  mesh.position.set((A.x + B.x) / 2, height / 2, (A.z + B.z) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
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

export function centroid(poly) {
  let x = 0;
  let y = 0;
  poly.forEach((p) => { x += p[0]; y += p[1]; });
  return [x / poly.length, y / poly.length];
}

function chevronTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#16a34a';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#ffffff';
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

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createScene(container, { onSelect }) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.prepend(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  Object.assign(labelRenderer.domElement.style, {
    position: 'absolute', inset: '0', pointerEvents: 'none',
  });
  container.querySelector('#labels').appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 25;
  controls.maxDistance = 260;
  controls.maxPolarAngle = 1.25;
  controls.autoRotateSpeed = 0.6;

  // Luces
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(40, 90, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 90, bottom: -90, near: 10, far: 250 });
  scene.add(sun);

  // Base del edificio
  const outline = buildingOutline();
  const base = new THREE.Mesh(
    (() => {
      const g = new THREE.ExtrudeGeometry(shapeFromPoly(outline), { depth: 1.2, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      g.translate(0, -1.2, 0);
      return g;
    })(),
    new THREE.MeshStandardMaterial({ color: COLORS.building, roughness: 0.8 }),
  );
  base.receiveShadow = true;
  scene.add(base);

  const outerMat = new THREE.MeshStandardMaterial({ color: COLORS.outerWall, roughness: 0.6 });
  for (let i = 0; i < outline.length; i++) {
    const w = wallBox(outline[i], outline[(i + 1) % outline.length], 1.4, 0.4, outerMat);
    if (w) scene.add(w);
  }

  // Pasillo central
  scene.add(flatMesh([[20, 213], [1475, 213], [1475, 247], [20, 247]], COLORS.corridor, 0.01));

  // Plano original como textura (opcional)
  const planTex = new THREE.TextureLoader().load('assets/plano.png');
  planTex.colorSpace = THREE.SRGBColorSpace;
  planTex.anisotropy = 8;
  const planGeo = new THREE.BufferGeometry();
  const corners = [[0, 0], [PLAN.width, 0], [PLAN.width, PLAN.height], [0, PLAN.height]];
  planGeo.setAttribute('position', new THREE.Float32BufferAttribute(
    corners.flatMap((c) => toWorld(c).toArray()), 3,
  ));
  planGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
  planGeo.setIndex([0, 2, 1, 0, 3, 2]);
  planGeo.computeVertexNormals();
  const planMesh = new THREE.Mesh(planGeo, new THREE.MeshBasicMaterial({ map: planTex, side: THREE.DoubleSide }));
  planMesh.position.y = 0.02;
  planMesh.visible = false;
  scene.add(planMesh);

  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.7 });

  // Hitos (no seleccionables)
  const landmarkMat = new THREE.MeshStandardMaterial({ color: COLORS.landmark, roughness: 0.9 });
  LANDMARKS.forEach((lm) => {
    const g = new THREE.ExtrudeGeometry(shapeFromPoly(lm.poly), { depth: 0.6, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, landmarkMat);
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
    wallSegments(lm.poly).forEach(([a, b]) => {
      const w = wallBox(a, b, lm.height * 0.6, WALL_T, wallMat);
      if (w) scene.add(w);
    });
    const el = document.createElement('div');
    el.className = 'landmark-label';
    el.textContent = lm.label;
    const obj = new CSS2DObject(el);
    obj.position.copy(toWorld(lm.labelAt || centroid(lm.poly), 1.6));
    scene.add(obj);
  });

  // Puertas de los 3 ascensores
  const elevatorMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.3 });
  ELEVATORS.forEach(({ x1, x2, y }) => {
    const d = wallBox([x1 + 6, y + 1], [x2 - 6, y + 1], 2.1, 0.12, elevatorMat);
    scene.add(d);
  });

  // Oficinas
  const rooms = new Map();
  const pickables = [];
  OFFICES.forEach((office) => {
    const color = new THREE.Color(office.dept ? DEPARTMENTS[office.dept].color : COLORS.neutral);
    const floor = flatMesh(office.poly, color.clone().multiplyScalar(0.55), 0.03);
    floor.userData.officeId = office.id;
    scene.add(floor);
    pickables.push(floor);

    const roomWallMat = wallMat.clone();
    const walls = wallSegments(office.poly, office.door)
      .map(([a, b]) => wallBox(a, b, WALL_H, WALL_T, roomWallMat))
      .filter(Boolean);
    walls.forEach((w) => scene.add(w));

    // Mobiliario simple: un escritorio por oficina
    const c = toWorld(centroid(office.poly));
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.8, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.8 }),
    );
    desk.position.set(c.x, 0.4, c.z);
    desk.castShadow = true;
    scene.add(desk);

    // Etiquetas por fuera del muro exterior: Informática a la derecha y
    // Adquisiciones a la izquierda, para que no se tapen entre sí.
    const [cx, cy] = centroid(office.poly);
    const north = cy < CORRIDOR_Y;
    const wrap = document.createElement('div');
    const el = document.createElement('button');
    el.className = `room-label ${north ? 'side-r' : 'side-l'}`;
    el.style.setProperty('--c', office.dept ? DEPARTMENTS[office.dept].color : '#a78bfa');
    el.innerHTML = `<span class="ic"></span><span class="nm"></span>`;
    el.querySelector('.ic').textContent = office.icon;
    el.querySelector('.nm').textContent = office.short;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(office.id);
    });
    wrap.appendChild(el);
    const label = new CSS2DObject(wrap);
    label.position.copy(toWorld([cx, north ? 38 : 412], 1.4));
    scene.add(label);

    rooms.set(office.id, { office, floor, roomWallMat, el, color, baseFloor: color.clone().multiplyScalar(0.55) });
  });

  // Marcador "Usted está aquí"
  const hereGroup = new THREE.Group();
  const herePos = toWorld([TOTEM.x, TOTEM.y]);
  hereGroup.position.copy(herePos);
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 2.6, 0.5),
    new THREE.MeshStandardMaterial({ color: COLORS.here, emissive: 0x7f1d1d, roughness: 0.4 }),
  );
  pillar.position.y = 1.3;
  pillar.castShadow = true;
  hereGroup.add(pillar);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.7, 48),
    new THREE.MeshBasicMaterial({ color: COLORS.here, transparent: true, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  hereGroup.add(ring);
  const hereEl = document.createElement('div');
  hereEl.className = 'here-label';
  hereEl.textContent = '📍 Usted está aquí';
  const hereLabel = new CSS2DObject(hereEl);
  hereLabel.position.y = 3.2;
  hereGroup.add(hereLabel);
  scene.add(hereGroup);

  // Ruta
  const chevrons = chevronTexture();
  let routeMesh = null;
  let walker = null;
  let pin = null;
  let routeCurve = null;

  const walkerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x86efac, emissive: 0x22c55e, emissiveIntensity: 1.2 }),
  );

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
    // Elimina puntos repetidos
    return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1);
  }

  function clearRoute() {
    [routeMesh, pin].forEach((m) => {
      if (m) {
        scene.remove(m);
        m.geometry?.dispose();
      }
    });
    if (walker) scene.remove(walker);
    routeMesh = null;
    pin = null;
    walker = null;
    routeCurve = null;
  }

  function drawRoute(office) {
    clearRoute();
    const pts = routePoints(office).map((p) => toWorld(p, 0));
    const path = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    routeCurve = path;
    const len = path.getLength();
    const tube = new THREE.TubeGeometry(path, Math.ceil(len * 4), 0.55, 10, false);
    const tex = chevrons.clone();
    tex.needsUpdate = true;
    tex.repeat.set(len / 1.6, 1);
    routeMesh = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ map: tex }));
    routeMesh.scale.y = 0.12;
    routeMesh.position.y = 0.12;
    scene.add(routeMesh);

    walker = walkerMesh;
    scene.add(walker);

    const color = office.dept ? DEPARTMENTS[office.dept].color : '#a78bfa';
    pin = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 24, 16),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }),
    );
    head.position.y = 1.6;
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.75, 1.4, 24),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }),
    );
    tip.rotation.x = Math.PI;
    tip.position.y = 0.7;
    pin.add(head, tip);
    pin.position.copy(pts[pts.length - 1]);
    pin.position.y = WALL_H + 0.3;
    scene.add(pin);
    return { lengthPx: routeLengthPx(office) };
  }

  function routeLengthPx(office) {
    const pts = routePoints(office);
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return l;
  }

  // ----- Cámara -----
  const HOME = { target: new THREE.Vector3(0, 0, 8), position: new THREE.Vector3(0, 150, 122) };
  camera.position.copy(HOME.position);
  controls.target.copy(HOME.target);
  controls.update();

  let tween = null;
  function flyTo(position, target, duration = 1200) {
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
    const box = new THREE.Box3().setFromPoints(pts);
    box.expandByScalar(6);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.z, size.x * 1.3, 50);
    const dist = span * 1.3 + 12;
    center.z += span * 0.12; // deja el tótem visible sobre la ficha inferior
    const dir = new THREE.Vector3(0, 1.25, 0.9).normalize();
    flyTo(center.clone().add(dir.multiplyScalar(dist)), center);
  }

  // ----- Selección -----
  let selected = null;
  function select(id) {
    selected = id;
    rooms.forEach((r, rid) => {
      const on = rid === id;
      r.el.classList.toggle('active', on);
      r.el.classList.toggle('dim', Boolean(id) && !on);
      r.roomWallMat.color.set(on ? r.color : COLORS.wall);
      r.floor.material.color.copy(on ? r.color : r.baseFloor);
    });
    if (!id) {
      clearRoute();
      return null;
    }
    const office = rooms.get(id).office;
    const info = drawRoute(office);
    frameOffice(office);
    return info;
  }

  function resetView() {
    flyTo(HOME.position.clone(), HOME.target.clone());
  }

  // ----- Toques sobre el modelo -----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    tween = null;
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

    const s = 1 + 0.35 * ((t * 1.2) % 1);
    ring.scale.set(s, s, s);
    ring.material.opacity = 1 - ((t * 1.2) % 1);

    if (routeMesh) routeMesh.material.map.offset.x -= dt * 1.2;
    if (walker && routeCurve) {
      const u = (t * 0.22) % 1;
      walker.position.copy(routeCurve.getPointAt(u));
      walker.position.y = 0.6;
    }
    if (pin) pin.position.y = WALL_H + 0.3 + Math.sin(t * 3) * 0.35;

    if (selected) {
      const r = rooms.get(selected);
      const k = 0.75 + 0.25 * Math.sin(t * 4);
      r.floor.material.color.copy(r.color).multiplyScalar(k);
    }

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();

  return {
    select,
    resetView,
    setPlanVisible(v) {
      planMesh.visible = v;
      rooms.forEach((r) => {
        r.floor.material.transparent = v;
        r.floor.material.opacity = v ? 0.35 : 1;
        r.floor.material.needsUpdate = true;
      });
    },
    setAutoRotate(v) { controls.autoRotate = v; },
    routeLengthPx,
  };
}
