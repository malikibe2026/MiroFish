// 3D model of the flat, built from the floor plan (pelan.png, 1024x1536 px).
// Plan pixels are converted to metres with S. Sizes are estimated from the plan's proportions.
import * as THREE from 'three';

const S = 0.0096;              // metres per plan pixel (outer width ~5.5 m)
const OX = 512, OY = 762;      // plan pixel at scene origin
const H = 1.8;                 // cut-away wall height (dollhouse style)
const mx = (x) => (x - OX) * S;
const mz = (y) => (y - OY) * S;

const W = window.innerWidth, HH = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(W, HH);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, W / HH, 0.1, 200);

scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc4, 1.15));
const sun = new THREE.DirectionalLight(0xfff2e0, 2.3);
sun.position.set(6, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
sun.shadow.bias = -0.0005;
scene.add(sun);

// ---------- helpers ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
function add(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); return mesh; }
function box(w, h, d, m, x, y, z) {
  return add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m instanceof THREE.Material ? m : mat(m)))
    .translateX(x).translateY(y).translateZ(z);
}
// box from a plan rectangle (px), height h (m), bottom at y0 (m)
const rbox = (x1, y1, x2, y2, h, y0, m) => box((x2 - x1) * S, h, (y2 - y1) * S, m, mx((x1 + x2) / 2), y0 + h / 2, mz((y1 + y2) / 2));
function cyl(r, h, m, px, py, y0, seg = 32) {
  const c = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m instanceof THREE.Material ? m : mat(m)));
  c.position.set(mx(px), y0 + h / 2, mz(py));
  return c;
}
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
const drawWood = (ctx, w, h) => {
  const n = 8;
  for (let i = 0; i < n; i++) {
    const v = rnd() * 30 - 15;
    ctx.fillStyle = `rgb(${142 + v},${96 + v * 0.7},${62 + v * 0.5})`;
    ctx.fillRect(0, (i * h) / n, w, h / n);
    for (let k = 0; k < 25; k++) { ctx.fillStyle = `rgba(60,30,10,${rnd() * 0.09})`; ctx.fillRect(0, (i * h) / n + rnd() * (h / n), w, 1); }
    ctx.fillStyle = 'rgba(40,20,5,.35)'; ctx.fillRect(0, (i * h) / n, w, 2); ctx.fillRect(rnd() * w, (i * h) / n, 2, h / n);
  }
};
const drawTile = (base, line) => (ctx, w, h) => {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let k = 0; k < 400; k++) { ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.025})`; ctx.fillRect(rnd() * w, rnd() * h, 6, 6); }
  ctx.strokeStyle = line; ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, w / 2 - 2, h / 2 - 2); ctx.strokeRect(w / 2 + 1, 1, w / 2 - 2, h / 2 - 2);
  ctx.strokeRect(1, h / 2 + 1, w / 2 - 2, h / 2 - 2); ctx.strokeRect(w / 2 + 1, h / 2 + 1, w / 2 - 2, h / 2 - 2);
};
// floor patch: tile size in metres decides texture repeat
function floor(x1, y1, x2, y2, draw, tileM, y0 = 0) {
  const w = (x2 - x1) * S, d = (y2 - y1) * S;
  const t = canvasTex(256, 256, draw, [w / tileM, d / tileM]);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
  const f = rbox(x1, y1, x2, y2, 0.02, y0, m); f.castShadow = false;
  return f;
}

// ---------- base & floors ----------
rbox(212, 4, 812, 1522, 0.3, -0.3, mat('#f7f5f1'));
floor(236, 26, 788, 1386, drawTile('#efe4d2', '#d9cbb5'), 1.2, 0.0);
const woodDraw = drawWood;
floor(240, 30, 600, 300, woodDraw, 1.3, 0.005);
floor(240, 300, 605, 500, woodDraw, 1.3, 0.005);
floor(240, 500, 605, 692, woodDraw, 1.3, 0.005);
floor(240, 692, 520, 830, drawTile('#b9bcbf', '#8f9396'), 0.6, 0.005);
floor(240, 830, 528, 920, drawTile('#d8d8d6', '#b5b5b2'), 0.6, 0.005);
floor(240, 920, 528, 1048, drawTile('#e6e3de', '#c3beb6'), 0.6, 0.005);
floor(225, 1392, 800, 1508, drawTile('#cfcac3', '#aaa39a'), 0.6, 0.0);

// ---------- walls ----------
const wallM = mat('#fbfaf7', { roughness: 0.92 });
const glassM = new THREE.MeshPhysicalMaterial({ color: 0xbfe0f2, transparent: true, opacity: 0.35, roughness: 0.05 });
const frameM = mat('#4a4a4a', { roughness: 0.5 });
function wall(x1, y1, x2, y2, t, ops = []) {
  const hor = y1 === y2, a0 = hor ? x1 : y1, a1 = hor ? x2 : y2, c = hor ? y1 : x1;
  const piece = (p, q, b, top, m = wallM, th = t) => {
    const len = (q - p) * S, h = top - b, mid = (p + q) / 2;
    if (hor) return box(len, h, th * S, m, mx(mid), b + h / 2, mz(c));
    return box(th * S, h, len, m, mx(c), b + h / 2, mz(mid));
  };
  let cur = a0;
  for (const o of [...ops].sort((p, q) => p.a - q.a)) {
    if (o.a > cur) piece(cur, o.a, 0, H);
    if (o.type === 'win') { piece(o.a, o.b, 0, 0.85); piece(o.a, o.b, 0.85, H - 0.02, glassM, 3); piece(o.a, o.b, H - 0.04, H, frameM, t * 0.6); }
    if (o.type === 'glassdoor') { piece(o.a, o.b, 0, H - 0.02, glassM, 3); piece(o.a, o.b, H - 0.04, H, frameM, t * 0.6); piece(o.a, o.b, 0, 0.03, frameM, t * 0.6); piece((o.a + o.b) / 2 - 2, (o.a + o.b) / 2 + 2, 0, H, frameM, t * 0.6); }
    cur = o.b;
  }
  if (cur < a1) piece(cur, a1, 0, H);
}
const EXT = 22, INT = 14;
const win = (a, b) => ({ a, b, type: 'win' }), door = (a, b) => ({ a, b, type: 'door' });
// exterior
wall(225, 26, 800, 26, EXT, [win(320, 440), win(595, 700)]);
wall(788, 15, 788, 1397, EXT, [win(135, 265), win(440, 570), win(720, 855), win(1115, 1235)]);
wall(236, 15, 236, 1397, EXT, [win(355, 465), win(545, 655), win(725, 805), win(870, 985)]);
wall(225, 1386, 800, 1386, EXT, [door(350, 445), { a: 455, b: 700, type: 'glassdoor' }]);
// interior
wall(600, 26, 600, 300, INT, [door(205, 275)]);
wall(240, 300, 607, 300, INT);
wall(605, 300, 605, 500, INT, [door(375, 455)]);
wall(240, 500, 607, 500, INT);
wall(605, 500, 605, 692, INT, [door(565, 640)]);
wall(240, 692, 612, 692, INT);
wall(520, 692, 520, 830, INT, [door(712, 785)]);
wall(240, 830, 530, 830, INT);
wall(528, 830, 528, 920, INT, [door(845, 912)]);
wall(240, 920, 530, 920, INT);
wall(528, 920, 528, 1050, INT);
wall(240, 1048, 425, 1048, INT);
// balcony parapet
rbox(225, 1494, 800, 1510, 0.9, 0, wallM);
rbox(225, 1397, 241, 1510, 0.9, 0, wallM);
rbox(784, 1397, 800, 1510, 0.9, 0, wallM);

// main door leaf, open inward
const leafG = new THREE.Group(); leafG.position.set(mx(352), 0, mz(1380)); leafG.rotation.y = 0.85; scene.add(leafG);
const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.75, 0.045), mat('#a8743f', { roughness: 0.6 }));
leaf.position.set(0.44, 0.875, 0); leaf.castShadow = true; leafG.add(leaf);

// ---------- furniture ----------
const woodM = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, drawWood, [1, 1]), roughness: 0.6 });
const white = mat('#f6f4f1', { roughness: 0.9 });
function blanketTex(kind) {
  if (kind === 'pink') return canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fbe9ee'; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.fillStyle = rnd() > 0.5 ? '#e9a3b5' : '#f2c2cf'; c.beginPath(); c.arc(rnd() * w, rnd() * h, 6 + rnd() * 6, 0, 7); c.fill(); } }, [1, 1]);
  return canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#f4f8fd'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(110,150,205,.45)'; for (let i = 0; i < 8; i++) { c.fillRect(i * 32, 0, 16, h); c.fillRect(0, i * 32, w, 16); } }, [2, 2]);
}
// bed with headboard on the left (x1 side)
function bed(x1, y1, x2, y2, blanket) {
  rbox(x1, y1, x2, y2, 0.28, 0, woodM);
  rbox(x1 - 4, y1 - 4, x1 + 10, y2 + 4, 0.85, 0, woodM);
  rbox(x1 + 10, y1 + 4, x2 - 4, y2 - 4, 0.18, 0.28, white);
  const bm = typeof blanket === 'string' ? mat(blanket, { roughness: 1 }) : new THREE.MeshStandardMaterial({ map: blanket, roughness: 1 });
  rbox(x1 + (x2 - x1) * 0.32, y1 + 2, x2 - 2, y2 - 2, 0.05, 0.46, bm);
  const n = (y2 - y1) > 160 ? 2 : 1, step = (y2 - y1 - 16) / n;
  for (let i = 0; i < n; i++) rbox(x1 + 16, y1 + 8 + i * step + 6, x1 + 52, y1 + 8 + (i + 1) * step - 6, 0.12, 0.46, mat('#ffffff', { roughness: 1 }));
}
function plant(px, py, s = 1, y0 = 0) {
  cyl(0.16 * s, 0.32 * s, mat('#d9d2c8'), px, py, y0);
  const leafM = mat('#3f8a3a', { roughness: 0.9, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14 * s, 0), leafM);
    const a = (i / 7) * Math.PI * 2;
    m.position.set(mx(px) + Math.cos(a) * 0.12 * s, y0 + (0.42 + rnd() * 0.25) * s, mz(py) + Math.sin(a) * 0.12 * s);
    m.scale.set(1, 1.6, 1); m.castShadow = true; scene.add(m);
  }
}
// master
rbox(300, 55, 525, 275, 0.012, 0.01, mat('#cfcac3', { roughness: 1 }));
bed(262, 50, 465, 278, '#8e8e92');
rbox(262, 40, 300, 72, 0.45, 0, woodM); rbox(262, 256, 300, 288, 0.45, 0, woodM);
rbox(555, 45, 593, 185, 1.55, 0, woodM);
// bilik kedua & ketiga
rbox(300, 335, 480, 470, 0.012, 0.01, mat('#e2dad0', { roughness: 1 }));
bed(258, 340, 440, 468, blanketTex('pink'));
rbox(300, 535, 480, 665, 0.012, 0.01, mat('#d9dde2', { roughness: 1 }));
bed(258, 538, 440, 662, blanketTex('blue'));
// tandas
const toiletM = mat('#ffffff', { roughness: 0.3 });
rbox(262, 742, 290, 790, 0.75, 0, toiletM);
const bowl = cyl(0.17, 0.4, toiletM, 318, 766, 0); bowl.scale.set(1.25, 1, 0.9);
// laundry
rbox(266, 838, 328, 912, 0.85, 0, mat('#f1f1f1', { roughness: 0.4 }));
cyl(0.2, 0.012, mat('#5b6670', { roughness: 0.3 }), 297, 875, 0.85);
rbox(385, 880, 440, 914, 0.85, 0, mat('#e6e6e6', { roughness: 0.4 }));
// dapur
const counterM = mat('#ece8e2', { roughness: 0.6 });
rbox(260, 928, 335, 1040, 0.85, 0, counterM);
rbox(335, 928, 465, 962, 0.85, 0, counterM);
rbox(268, 945, 330, 1025, 0.012, 0.85, mat('#1d1d1f', { roughness: 0.2 }));
for (const [bx, by] of [[285, 965], [313, 965], [285, 1005], [313, 1005]]) cyl(0.07, 0.01, mat('#444'), bx, by, 0.862);
rbox(468, 936, 524, 1044, 1.65, 0, mat('#c9ccd0', { roughness: 0.3, metalness: 0.6 }));
// ruang tamu
rbox(266, 1105, 320, 1335, 0.45, 0, woodM);
rbox(292, 1150, 298, 1290, 0.75, 0.5, mat('#141416', { roughness: 0.25 }));
rbox(415, 1140, 665, 1335, 0.012, 0.01, mat('#e4d9c9', { roughness: 1 }));
cyl(0.4, 0.06, woodM, 595, 1225, 0.36); cyl(0.05, 0.36, woodM, 595, 1225, 0);
plant(595, 1225, 0.45, 0.42);
const sofaM = mat('#e9e4dc', { roughness: 1 });
rbox(655, 1130, 745, 1335, 0.42, 0, sofaM);
rbox(718, 1130, 748, 1335, 0.85, 0, sofaM);
rbox(652, 1118, 748, 1140, 0.62, 0, sofaM); rbox(652, 1325, 748, 1347, 0.62, 0, sofaM);
rbox(668, 1145, 715, 1235, 0.1, 0.42, mat('#f1ede7', { roughness: 1 })); rbox(668, 1238, 715, 1320, 0.1, 0.42, mat('#f1ede7', { roughness: 1 }));
plant(715, 1075, 1.1);
// balkoni
rbox(355, 1418, 440, 1462, 0.012, 0.005, mat('#8d8a86', { roughness: 1 }));
plant(295, 1452, 1.0); plant(735, 1452, 1.0);

// ---------- labels ----------
const ROOMS = [
  { id: 'master', t: 'Bilik Pertama<br>(Master)', x: 430, y: 165 },
  { id: 'b2', t: 'Bilik Kedua', x: 470, y: 400 },
  { id: 'b3', t: 'Bilik Ketiga', x: 470, y: 600 },
  { id: 'tandas', t: 'Tandas', x: 410, y: 760 },
  { id: 'laundry', t: 'Laundry', x: 400, y: 868 },
  { id: 'dapur', t: 'Dapur', x: 400, y: 990 },
  { id: 'tamu', t: 'Ruang Tamu', x: 500, y: 1215 },
];
const box2 = document.getElementById('labels');
for (const r of ROOMS) { const d = document.createElement('div'); d.className = 'lbl'; d.innerHTML = r.t; box2.appendChild(d); r.el = d; }

// ---------- camera path ----------
const V = (a) => new THREE.Vector3(...a);
const off = [4.2, 8.5, 2.2];
const focus = (x, z) => ({ p: [x + off[0], off[1], z + off[2]], g: [x, 0, z] });
const LIV = focus(0.08, 4.3), DAP = focus(-1.2, 1.55), TAN = focus(-1.25, 0.0), B3 = focus(-0.9, -1.6), B2 = focus(-0.9, -3.5), MAS = focus(-0.9, -5.75);
const TOP = { p: [0, 25.5, 0.01], g: [0, 0, 0] }, ISO = { p: [8, 14.5, 13], g: [0, 0, 0.3] }, END = { p: [-7.5, 16.5, 12.5], g: [0, 0, 0.2] };
const KEYS = [[0, TOP], [2.5, TOP], [6, ISO], [6.6, ISO], [8.2, LIV], [9.6, LIV], [10.8, DAP], [12.2, DAP], [13.2, TAN], [14.4, TAN], [15.4, B3], [16.6, B3], [17.6, B2], [18.8, B2], [19.8, MAS], [21.2, MAS], [24, END], [26, END]];
const ACTIVE = [[7.6, 9.9, ['tamu']], [10.2, 12.5, ['dapur', 'laundry']], [12.7, 14.7, ['tandas']], [14.9, 16.9, ['b3']], [17.1, 19.1, ['b2']], [19.3, 21.5, ['master']]];
const ease = (u) => u * u * (3 - 2 * u);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const fade = (t, a, b, c, d) => clamp01((t - a) / (b - a)) * (1 - clamp01((t - c) / (d - c)));

window.setFrame = (frame) => {
  const t = frame / 30;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++;
  const [t0, k0] = KEYS[i], [t1, k1] = KEYS[i + 1];
  const u = ease(clamp01((t - t0) / (t1 - t0)));
  const pos = V(k0.p).lerp(V(k1.p), u), tgt = V(k0.g).lerp(V(k1.g), u);
  if (t > 23.5) { const a = (t - 23.5) * 0.06; pos.sub(tgt).applyAxisAngle(new THREE.Vector3(0, 1, 0), a).add(tgt); }
  camera.position.copy(pos);
  camera.up.set(0, 1, 0);
  if (t < 3.5) camera.up.set(0, 0, -1).lerp(new THREE.Vector3(0, 1, 0), ease(clamp01((t - 2.5) / 1.0))).normalize();
  camera.lookAt(tgt);
  renderer.render(scene, camera);

  const act = ACTIVE.find(([a, b]) => t >= a && t <= b);
  const allVis = fade(t, 3.6, 4.3, 99, 100);
  for (const r of ROOMS) {
    const v = new THREE.Vector3(mx(r.x), 1.95, mz(r.y)).project(camera);
    const on = act && act[2].includes(r.id);
    const touring = t > 7.4 && t < 21.6;
    r.el.style.left = ((v.x + 1) / 2) * W + 'px';
    r.el.style.top = ((1 - v.y) / 2) * HH + 'px';
    r.el.classList.toggle('on', !!on);
    r.el.style.opacity = (t > 23.2 ? 1 - clamp01((t - 23.2) / 0.6) : allVis) * (touring && !on ? 0.35 : 1);
    r.el.style.transform = `translate(-50%,-50%) scale(${on ? 1.35 : 1})`;
  }
  document.getElementById('t1').style.opacity = fade(t, 0.3, 1.0, 3.2, 4.0);
  document.getElementById('end').style.opacity = fade(t, 23.4, 24.2, 99, 100);
};
window.ready = true;
window.setFrame(0);
