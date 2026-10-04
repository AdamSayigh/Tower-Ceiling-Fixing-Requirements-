// Garage model for the truss-roof ceiling fixing guide.
// Units: metres. x = across the opening (0 = centreline, L pads at -x),
// y = up, z = back from the back of the opening (the setout datum, z = 0).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const COL = {
  orange: 0xDA5E2D, orangeLt: 0xFF8251, orangeDk: 0x743218,
  text: 0xE7E7F9, face: 0x08080a, lining: 0x111115, slab: 0x0b0b0e,
};

// ---------------------------------------------------------------- geometry constants
export const K = {
  OPEN: 2.4, SIDE: 0.15, DOOR_H: 2.7, HEAD: 0.3,
  CEIL: 3.0, LIN_T: 0.01, BAT_D: 0.035, BAT_W: 0.07, CH_D: 0.09, CH_W: 0.035,
  FRONT_T: 0.25, SIDE_IN: 3.6, SIDE_T: 0.2, BACK_IN: 6.0, BACK_T: 0.2,
};
K.Y_LIN = K.CEIL + K.LIN_T;          // top of lining / underside of battens & noggings  3.010
K.Y_BAT = K.Y_LIN + K.BAT_D;         // top of battens / underside of bottom chords      3.045
K.Y_CH = K.Y_BAT + K.CH_D;           // top of bottom chords                              3.135
K.Z0 = -K.FRONT_T;                   // street face of the front wall
K.Z1 = K.BACK_IN + K.BACK_T;         // outside face of the back wall
K.PITCH = 22.5 * Math.PI / 180;
K.APEX_Z = (K.Z0 + K.Z1) / 2;
K.APEX_Y = K.Y_CH + ((K.Z1 - K.Z0) / 2) * Math.tan(K.PITCH);

export const TRUSS_X = [-3.7, -3.3, -2.7, -2.1, -1.5, -0.9, -0.3, 0.3, 0.9, 1.5, 2.1, 2.7, 3.3, 3.7];
export const BATTEN_Z = Array.from({ length: 14 }, (_, k) => +(0.1 + 0.45 * k).toFixed(3));

// Pad schedule — Ceiling Fixing · Truss Roof · Rev C (mm in the copy, metres here)
export const PADS = [
  { id: 'L1', x1: -2.85, x2: -2.25, z1: 1.0, z2: 1.6, size: '600 × 600', pos: 'Side · left, front', from: '1000 – 1600', across: '450 outside the opening, 150 inside', side: true },
  { id: 'L2', x1: -2.85, x2: -2.25, z1: 2.2, z2: 2.8, size: '600 × 600', pos: 'Side · left, rear', from: '2200 – 2800', across: '450 outside the opening, 150 inside', side: true },
  { id: 'R1', x1: 2.25, x2: 2.85, z1: 1.0, z2: 1.6, size: '600 × 600', pos: 'Side · right, front', from: '1000 – 1600', across: '450 outside the opening, 150 inside', side: true },
  { id: 'R2', x1: 2.25, x2: 2.85, z1: 2.2, z2: 2.8, size: '600 × 600', pos: 'Side · right, rear', from: '2200 – 2800', across: '450 outside the opening, 150 inside', side: true },
  { id: 'A', x1: -0.3, x2: 0.3, z1: 1.25, z2: 1.75, size: '500 × 600', pos: 'Centre · doors over 330 kg', from: '1250 – 1750', across: '300 each side of the centreline', note: 'Install unless Tower has confirmed in writing that the door is 330 kg or less.' },
  { id: 'M', x1: -0.3, x2: 0.3, z1: 2.85, z2: 3.85, size: '1000 × 600', pos: 'Centre · motor', from: '2850 – 3850', across: '300 each side of the centreline' },
];
export const GPO = { x: -0.15, z: 4.237, cz: 3.35, r0: 0.3, r1: 0.95 };
for (const p of PADS) { p.cx = (p.x1 + p.x2) / 2; p.cz = (p.z1 + p.z2) / 2; }

// ---------------------------------------------------------------- geometry helpers
export function box(x1, x2, y1, y2, z1, z2) {
  const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  return g;
}
function beam(x, w, d, y1, z1, y2, z2) {
  const dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dy, dz);
  const g = new THREE.BoxGeometry(w, d, L);
  g.rotateX(-Math.atan2(dy, dz));
  g.translate(x, (y1 + y2) / 2, (z1 + z2) / 2);
  return g;
}
// scale BoxGeometry UVs to world units so tiled textures keep a constant size
function worldUV(g, sx, sy, sz, tile) {
  const uv = g.attributes.uv;
  const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * dims[f][0] / tile, uv.getY(k) * dims[f][1] / tile);
  }
  return g;
}
function lvlBox(x1, x2, y1, y2, z1, z2) {
  const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
  worldUV(g, x2 - x1, y2 - y1, z2 - z1, 0.16);
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  return g;
}
const edgesOf = gs => mergeGeometries(gs.map(g => new THREE.EdgesGeometry(g, 25)));

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
export function makeTextures() {
  const lvl = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    let y = 0, i = 0;
    while (y < h) {
      const step = 13 + ((i * 37) % 7);
      x.fillStyle = `rgba(60,20,5,${0.10 + ((i * 13) % 5) * 0.025})`;
      x.fillRect(0, y, w, 1.6);
      y += step; i++;
    }
  });
  const hatch = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#101014'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(231,231,249,0.34)'; x.lineWidth = 1.4;
    for (let k = -h; k < w + h; k += 16) { x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); }
  });
  const stipple = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#1d1d22'; x.fillRect(0, 0, w, h);
    let s = 7;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 520; i++) {
      x.fillStyle = `rgba(231,231,249,${0.18 + r() * 0.3})`;
      x.fillRect(r() * w, r() * h, 1.3, 1.3);
    }
  });
  const halo = canvasTex(128, 128, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,130,81,0.85)'); g.addColorStop(0.45, 'rgba(218,94,45,0.28)'); g.addColorStop(1, 'rgba(218,94,45,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, false);
  const steelHatch = canvasTex(128, 128, (x, w, h) => {      // cut steel: light fill, dark hatch
    x.fillStyle = '#b9bec8'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(16,16,22,0.62)'; x.lineWidth = 2.2;
    for (let k = -h; k < w + h; k += 18) { x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); }
  });
  const sideHatch = canvasTex(128, 128, (x, w, h) => {       // cut solid fixing in the side room: orange, dark hatch
    x.fillStyle = '#DA5E2D'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(52,16,4,0.5)'; x.lineWidth = 1.6;
    for (let k = -h; k < w + h; k += 16) { x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); }
  });
  const groundTex = canvasTex(512, 512, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#121216'); g.addColorStop(0.55, '#07070a'); g.addColorStop(1, '#000000');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, false);
  // light theme: the same drawings on paper
  const hatchL = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#f4f3ef'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(27,27,32,0.42)'; x.lineWidth = 1.4;
    for (let k = -h; k < w + h; k += 16) { x.beginPath(); x.moveTo(k, h); x.lineTo(k + h, 0); x.stroke(); }
  });
  const stippleL = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#e4e2dc'; x.fillRect(0, 0, w, h);
    let s = 7;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 520; i++) {
      x.fillStyle = `rgba(27,27,32,${0.16 + r() * 0.26})`;
      x.fillRect(r() * w, r() * h, 1.3, 1.3);
    }
  });
  const groundTexL = canvasTex(512, 512, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#fbfbf9'); g.addColorStop(0.55, '#f2f1ed'); g.addColorStop(1, '#efeeea');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, false);
  return { lvl, hatch, stipple, halo, groundTex, steelHatch, sideHatch, hatchL, stippleL, groundTexL };
}

// ---------------------------------------------------------------- theme
// The model is authored for the dark theme. In the light theme the house, the trusses, the battens and the door
// hardware stay black with light edges (role 'ink', the default), so the frame reads strongly on the paper. Only the
// surfaces that read as paper (role 'paper': the ceiling lining, the slab, the ground) turn light, with charcoal
// linework. A few marks drawn over paper change everywhere: white setout ribbons go charcoal, light screws go mid
// grey and light-orange linework a shade deeper. Additive glows become ordinary transparency.
// TK holds per-theme multipliers read by a few faders.
export const TK = { dust: 1, halo: 1, gamma: { walls: 1 } };
export const THEME_BG = { dark: 0x000000, light: 0xEFEEEA };
const PAPER_MESH = [[COL.lining, 0xDDDBD4], [COL.slab, 0xE3E1DB], [COL.face, 0xF7F6F2]];
const PAPER_LINE = [[COL.text, 0x26262C]];
const ANY_MESH = [[COL.text, 0x3A3A41], [0xf1f3f7, 0x8F96A0]];
const DOOR_MESH = [[0x0c0c10, 0x3B3D43]];             // the door reads as a charcoal door, apart from the black frame
const ANY_LINE = [[COL.orangeLt, 0xC9541F]];
const near = (a, b) => Math.abs((a >> 16) - (b >> 16)) <= 1 && Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) <= 1 && Math.abs((a & 255) - (b & 255)) <= 1;
const lookup = (table, hex) => { for (const [k, v] of table) if (near(k, hex)) return v; return null; };
export function applyTheme(root, tex, name) {
  const light = name === 'light';
  const texL = new Map([[tex.hatch, tex.hatchL], [tex.stipple, tex.stippleL], [tex.groundTex, tex.groundTexL]]);
  root.traverse(o => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      const u = m.userData;
      if (!u.dark) u.dark = { color: m.color ? m.color.getHex() : null, map: m.map || null, blending: m.blending };
      const paper = u.role === 'paper', line = m.isLineBasicMaterial || m.isLineDashedMaterial;
      if (u.dark.color !== null) {
        let v = null;
        if (light && paper) v = lookup(line ? PAPER_LINE : PAPER_MESH, u.dark.color);
        if (light && u.role === 'door' && !line) v = lookup(DOOR_MESH, u.dark.color);
        if (light && v === null) v = lookup(line ? ANY_LINE : ANY_MESH, u.dark.color);
        m.color.setHex(v ?? u.dark.color);
      }
      if (u.dark.map) m.map = (light && paper && texL.get(u.dark.map)) || u.dark.map;
      if (u.dark.blending === THREE.AdditiveBlending && !u.keepAdditive) m.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    }
  });
}

// ---------------------------------------------------------------- fadeable layer
export class Layer {
  constructor(name, o = {}) {
    this.name = name;
    this.root = new THREE.Group(); this.root.name = name;
    const faceOpacity = o.faceOpacity ?? 1, lineOpacity = o.lineOpacity ?? 0.5;
    this.face = o.lambert
      ? new THREE.MeshLambertMaterial({ color: o.faceColor ?? COL.orange, emissive: o.faceColor ?? COL.orange, emissiveIntensity: o.emissive ?? 0.12, map: o.map || null, transparent: true, opacity: faceOpacity, side: o.side ?? THREE.FrontSide })
      : new THREE.MeshBasicMaterial({ color: o.faceColor ?? COL.face, map: o.map || null, transparent: true, opacity: faceOpacity, side: o.side ?? THREE.FrontSide });
    this.face.polygonOffset = true; this.face.polygonOffsetFactor = 1; this.face.polygonOffsetUnits = 1;
    this.line = new THREE.LineBasicMaterial({ color: o.lineColor ?? COL.text, transparent: true, opacity: lineOpacity });
    this.base = { face: faceOpacity, line: lineOpacity };
    this.order = o.order;
    this.gammaKey = o.gammaKey || null;
    this.o = 1; this.eff = 1;
  }
  add(geoms, { edges = true, parent = this.root } = {}) {
    if (!geoms.length) return null;
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(mergeGeometries(geoms, false), this.face);
    g.add(mesh);
    if (edges) g.add(new THREE.LineSegments(edgesOf(geoms), this.line));
    if (this.order !== undefined) g.traverse(o => { o.renderOrder = this.order; });
    parent.add(g);
    g.userData.mesh = mesh;
    return g;
  }
  set(o) {
    this.o = o;
    const g = this.gammaKey ? TK.gamma[this.gammaKey] : 1;
    const e = g === 1 ? o : Math.pow(o, g);
    this.eff = e;
    this.face.opacity = this.base.face * e;
    this.line.opacity = this.base.line * e;
    this.face.depthWrite = e > 0.55 && this.base.face > 0.55;
    this.root.visible = e > 0.003;
  }
}

// a bare object exposing the same fade API
class Fader {
  constructor(apply) { this.o = 1; this.apply = apply; }
  set(o) { this.o = o; this.apply(o); }
}

// ---------------------------------------------------------------- nogging layout per pad
export function nogParts(p) {
  const hw = K.CH_W / 2, blocks = [], fills = [];
  for (let i = 0; i < TRUSS_X.length - 1; i++) {
    const a = TRUSS_X[i] + hw, b = TRUSS_X[i + 1] - hw;
    if (b > p.x1 + 1e-6 && a < p.x2 - 1e-6) blocks.push([a, b]);
  }
  for (const t of TRUSS_X) {
    const a = t - hw, b = t + hw;
    if (b > p.x1 - 1e-6 && a < p.x2 + 1e-6) fills.push([a, b]);
  }
  const xs = [...blocks.flat(), ...fills.flat()];
  return { blocks, fills, xMin: Math.min(...xs), xMax: Math.max(...xs) };
}

for (const p of PADS) Object.assign(p, nogParts(p));

// ---------------------------------------------------------------- door path (behind fit, low-headroom track)
// Vertical to the top of the opening, a quarter-ellipse bend, then horizontal just under the opener rail.
// The open door stops short of the motor, which hangs behind it from pad M.
export const MOTOR_Z = 3.42;                // front face of the motor (it hangs from pad M, 2850 to 3850)
const LEAD_STOP = 2.8;                      // leading edge of the fully open door, clear of the opening and the motor
const DOOR = { zd: 0.06, panels: 4, yh: 2.83, ax: 0.38 };
DOOR.ay = DOOR.yh - K.DOOR_H;               // rise from the head of the opening to the horizontal run
DOOR.h = K.DOOR_H / DOOR.panels;
const PATH = (() => {
  const pts = [[0, DOOR.zd], [K.DOOR_H, DOOR.zd]];
  const N = 40;
  for (let i = 1; i <= N; i++) {
    const th = (i / N) * Math.PI / 2;
    pts.push([K.DOOR_H + DOOR.ay * Math.sin(th), DOOR.zd + DOOR.ax * (1 - Math.cos(th))]);
  }
  pts.push([DOOR.yh, DOOR.zd + DOOR.ax + 8]);
  const sv = [0];
  for (let i = 1; i < pts.length; i++) sv.push(sv[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, s: sv, sBend: sv[sv.length - 2] };
})();
function pathAt(v) {                         // [y, z] at arc length v along the door path
  const { pts, s: sv } = PATH;
  if (v <= 0) return pts[0];
  let lo = 0, hi = sv.length - 1;
  if (v >= sv[hi]) return pts[hi];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (sv[m] <= v) lo = m; else hi = m; }
  const t = (v - sv[lo]) / (sv[hi] - sv[lo]);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
}
// Hinge points of the door. The opener pulls the top (leading) edge along the track at arc length u; each panel
// is a rigid chord of DOOR.h with both ends on the track, as the rollers are, so no panel corner rides up out of
// the track in the bend.
function hingeChain(u) {
  const pts = [pathAt(u)];
  let s = u;
  for (let k = 0; k < DOOR.panels; k++) {
    const p0 = pts[k];
    let lo = s - DOOR.h * 2, hi = s;              // the distance to p0 shrinks towards s (the path turns through 90° only)
    for (let i = 0; i < 32; i++) {
      const m = (lo + hi) / 2, q = pathAt(m);
      if (Math.hypot(q[0] - p0[0], q[1] - p0[1]) > DOOR.h) lo = m; else hi = m;
    }
    s = (lo + hi) / 2;
    pts.push(pathAt(s));
  }
  return pts.reverse();                           // [y, z]: bottom edge, three hinges, top (leading) edge
}
// travel of the leading edge from closed until it stops at LEAD_STOP
export const DOOR_TRAVEL = LEAD_STOP - (DOOR.zd + DOOR.ax) + PATH.sBend - K.DOOR_H;
export const RAIL = { y0: 2.885, y1: 2.925 };
// Side room hardware (right-hand side; the left is the same, handed). The behind-fit door overlaps the opening by 40;
// the vertical track sits just outside it, on a mounting angle screwed to the wall face in the 150 side room.
export const TRACK = {
  doorEdge: K.OPEN + 0.04,                // door panel edge
  x0: K.OPEN + 0.05, x1: K.OPEN + 0.08,   // track
  z0: 0.035, z1: 0.085,
  ang: K.OPEN + 0.145,                    // outer edge of the angle's wall leg
  screwX: K.OPEN + 0.115,                 // fixings into the side room
  screwsY: [0.3, 0.9, 1.5, 2.1, 2.6],
};
TRACK.xc = (TRACK.x0 + TRACK.x1) / 2;

// ================================================================== build
export function buildModel(scene, tex) {
  const L = {}, F = {};
  const layer = (name, o) => { const l = new Layer(name, o); scene.add(l.root); L[name] = l; F[name] = l; return l; };
  const { Y_LIN, Y_BAT, Y_CH, CEIL } = K;

  // ground, slab
  const ground = layer('ground', { faceOpacity: 1, lineOpacity: 0.07 });
  {
    const m = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshBasicMaterial({ map: tex.groundTex, transparent: true }));
    m.rotation.x = -Math.PI / 2; m.position.y = -0.121;
    ground.root.add(m);
    const pts = [];
    for (let i = -24; i <= 24; i++) { pts.push(i, -0.12, -24, i, -0.12, 24, -24, -0.12, i, 24, -0.12, i); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    ground.root.add(new THREE.LineSegments(g, ground.line));
    ground.extra = m.material;
    m.material.userData.role = ground.line.userData.role = 'paper';
    const baseSet = ground.set.bind(ground);
    ground.set = o => { baseSet(o); m.material.opacity = o; };
  }
  const slab = layer('slab', { order: -2,  faceColor: COL.slab, lineOpacity: 0.3 });
  slab.face.userData.role = slab.line.userData.role = 'paper';
  slab.add([box(-3.8, 3.8, -0.12, 0, K.Z0, K.Z1)]);

  // walls
  const front = layer('frontWall', { order: -2,  lineOpacity: 0.5 });
  front.add([box(-3.8, -K.OPEN, 0, K.DOOR_H, K.Z0, 0), box(K.OPEN, 3.8, 0, K.DOOR_H, K.Z0, 0)]);
  const frontHead = layer('frontHead', { order: -2,  lineOpacity: 0.5 });
  frontHead.add([box(-3.8, 3.8, K.DOOR_H, Y_BAT, K.Z0, 0)]);
  const sideW = layer('sideWalls', { order: -2,  lineOpacity: 0.42, gammaKey: 'walls' });
  sideW.add([box(-3.8, -K.SIDE_IN, 0, 1.2, 0, K.BACK_IN), box(K.SIDE_IN, 3.8, 0, 1.2, 0, K.BACK_IN)]);
  {
    // hatched caps on the cut tops of the side walls (architectural cutaway)
    const capMat = new THREE.MeshBasicMaterial({ map: tex.hatch, transparent: true });
    for (const x of [-3.7, 3.7]) {
      const g = new THREE.PlaneGeometry(0.2, K.BACK_IN);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.2 / 0.12, uv.getY(i) * K.BACK_IN / 0.12);
      const m = new THREE.Mesh(g, capMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 1.2005, K.BACK_IN / 2);
      sideW.root.add(m);
    }
    const baseSet = sideW.set.bind(sideW);
    sideW.set = o => { baseSet(o); capMat.opacity = sideW.eff; };
  }
  const back = layer('backWall', { order: -2,  lineOpacity: 0.42, gammaKey: 'walls' });
  back.add([box(-3.8, 3.8, 0, Y_BAT, K.BACK_IN, K.Z1)]);

  // lining (ceiling board)
  const lining = layer('lining', { order: -3,  faceColor: COL.lining, lineOpacity: 0.3, side: THREE.DoubleSide });
  lining.face.userData.role = lining.line.userData.role = 'paper';
  lining.add([box(-K.SIDE_IN, K.SIDE_IN, CEIL, Y_LIN, 0, K.BACK_IN)]);

  // truss bottom chords
  const chords = layer('chords', { order: -2,  lineOpacity: 0.58 });
  chords.add(TRUSS_X.map(x => box(x - K.CH_W / 2, x + K.CH_W / 2, Y_BAT, Y_CH, K.Z0, K.Z1)));

  // truss top chords + webs (Fink)
  const upper = layer('trussUpper', { order: -2,  lineOpacity: 0.36 });
  {
    const g = [];
    const span = K.Z1 - K.Z0, tp = Math.tan(K.PITCH);
    const yTop = z => Y_CH + (Math.min(z - K.Z0, K.Z1 - z)) * tp;
    const zb1 = K.Z0 + span / 3, zb2 = K.Z0 + 2 * span / 3;
    const zq1 = K.Z0 + span / 4, zq3 = K.Z0 + 3 * span / 4;
    for (const x of TRUSS_X) {
      g.push(beam(x, 0.035, 0.09, Y_CH, K.Z0, K.APEX_Y, K.APEX_Z));
      g.push(beam(x, 0.035, 0.09, K.APEX_Y, K.APEX_Z, Y_CH, K.Z1));
      g.push(beam(x, 0.035, 0.07, Y_CH, zb1, yTop(zq1), zq1));
      g.push(beam(x, 0.035, 0.07, Y_CH, zb1, K.APEX_Y - 0.05, K.APEX_Z));
      g.push(beam(x, 0.035, 0.07, Y_CH, zb2, K.APEX_Y - 0.05, K.APEX_Z));
      g.push(beam(x, 0.035, 0.07, Y_CH, zb2, yTop(zq3), zq3));
    }
    upper.add(g);
  }

  // pads → nogging layouts, batten cuts
  const keep = [], cut = [];
  for (const zb of BATTEN_Z) {
    const za = zb - K.BAT_W / 2, zc = zb + K.BAT_W / 2;
    let ivs = PADS.filter(p => p.z2 > za && p.z1 < zc).map(p => [p.xMin, p.xMax]).sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const iv of ivs) { if (merged.length && iv[0] <= merged[merged.length - 1][1]) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]); else merged.push([...iv]); }
    let x = -K.SIDE_IN;
    for (const [a, b] of merged) { if (a > x) keep.push(box(x, a, Y_LIN, Y_BAT, za, zc)); cut.push(box(a, b, Y_LIN, Y_BAT, za, zc)); x = b; }
    if (x < K.SIDE_IN) keep.push(box(x, K.SIDE_IN, Y_LIN, Y_BAT, za, zc));
  }
  const bKeep = layer('battensKeep', { order: -2,  lineOpacity: 0.5 });
  bKeep.add(keep);
  const bCut = layer('battensCut', { order: -2,  lineOpacity: 0.5 });
  bCut.add(cut);

  // per-pad objects: zone (required area), built noggings, fills under chords, halo
  const pads = {};
  const outlinePts = [];
  for (const p of PADS) {
    const o = { p };
    // zone — the pad as scheduled, extruded from the lining
    const zm = new THREE.MeshLambertMaterial({ color: COL.orange, emissive: COL.orange, emissiveIntensity: 0.22, transparent: true });
    const zl = new THREE.LineBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0.9 });
    const zg = new THREE.BoxGeometry(p.x2 - p.x1, Y_CH + 0.0015 - (Y_LIN + 0.0005), p.z2 - p.z1);
    zg.translate(0, (Y_CH + 0.0015 - (Y_LIN + 0.0005)) / 2, 0);
    const zone = new THREE.Group(); zone.position.set(p.cx, Y_LIN + 0.0005, p.cz);
    const zmesh = new THREE.Mesh(zg, zm); zmesh.userData.padId = p.id;
    zone.add(zmesh, new THREE.LineSegments(new THREE.EdgesGeometry(zg), zl));
    scene.add(zone);
    o.zone = zone; o.zoneMat = zm; o.zoneMesh = zmesh;
    o.zoneF = new Fader(v => { zm.opacity = v; zl.opacity = 0.9 * v; zm.depthWrite = v > 0.55; zone.visible = v > 0.003; });
    F['zone:' + p.id] = o.zoneF;

    // built noggings (LVL), fixed between the trusses
    const nm = new THREE.MeshLambertMaterial({ color: COL.orange, emissive: COL.orange, emissiveIntensity: 0.1, map: tex.lvl, transparent: true });
    const nl = new THREE.LineBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0.75 });
    const nogGeoms = p.blocks.map(([a, b]) => lvlBox(a, b, Y_LIN, Y_CH, p.z1, p.z2));
    const nog = new THREE.Group();
    const nmesh = new THREE.Mesh(mergeGeometries(nogGeoms), nm); nmesh.userData.padId = p.id;
    nog.add(nmesh, new THREE.LineSegments(edgesOf(nogGeoms), nl));
    scene.add(nog);
    o.nog = nog; o.nogMat = nm; o.nogMesh = nmesh;
    o.nogF = new Fader(v => { nm.opacity = v; nl.opacity = 0.75 * v; nm.depthWrite = v > 0.55; nog.visible = v > 0.003; });
    F['nog:' + p.id] = o.nogF;

    const fm = new THREE.MeshLambertMaterial({ color: 0xF0844F, emissive: COL.orangeLt, emissiveIntensity: 0.12, map: tex.lvl, transparent: true });
    const fl = new THREE.LineBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0.75 });
    const fillGeoms = p.fills.map(([a, b]) => lvlBox(a, b, Y_LIN, Y_BAT, p.z1, p.z2));
    const fill = new THREE.Group();
    fill.add(new THREE.Mesh(mergeGeometries(fillGeoms), fm), new THREE.LineSegments(edgesOf(fillGeoms), fl));
    scene.add(fill);
    o.fill = fill; o.fillMat = fm;
    o.fillF = new Fader(v => { fm.opacity = v; fl.opacity = 0.75 * v; fill.visible = v > 0.003; });
    F['fill:' + p.id] = o.fillF;

    // soft glow on the lining around the pad (visible from below)
    const hm = new THREE.MeshBasicMaterial({ map: tex.halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry((p.x2 - p.x1) * 2.4, (p.z2 - p.z1) * 2.4), hm);
    halo.rotation.x = Math.PI / 2; halo.position.set(p.cx, CEIL - 0.004, p.cz);
    scene.add(halo);
    o.haloF = new Fader(v => { hm.opacity = v * TK.halo; halo.visible = v * TK.halo > 0.003; });
    F['halo:' + p.id] = o.haloF;

    const y = Y_LIN - 0.0008;
    outlinePts.push(p.x1, y, p.z1, p.x2, y, p.z1, p.x2, y, p.z1, p.x2, y, p.z2, p.x2, y, p.z2, p.x1, y, p.z2, p.x1, y, p.z2, p.x1, y, p.z1);
    pads[p.id] = o;
  }
  // required-area outlines (dashed) on the underside
  {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(outlinePts, 3));
    const m = new THREE.LineDashedMaterial({ color: COL.orangeLt, dashSize: 0.05, gapSize: 0.035, transparent: true });
    const ls = new THREE.LineSegments(g, m); ls.computeLineDistances(); scene.add(ls);
    F.padOutlines = new Fader(v => { m.opacity = v; ls.visible = v > 0.003; });
  }

  // side room on the wall tops (plan) and on the inside face (elevation)
  const srPlan = layer('sideRoomPlan', { lambert: true, faceColor: COL.orange, emissive: 0.2, lineColor: COL.orangeLt, lineOpacity: 0.7 });
  srPlan.add([box(-K.OPEN - K.SIDE, -K.OPEN, Y_BAT, Y_BAT + 0.004, K.Z0, 0), box(K.OPEN, K.OPEN + K.SIDE, Y_BAT, Y_BAT + 0.004, K.Z0, 0)]);
  const hl = {};
  for (const [id, g] of [
    ['sideL', box(-K.OPEN - K.SIDE, -K.OPEN, 0, K.DOOR_H, 0, 0.004)],
    ['sideR', box(K.OPEN, K.OPEN + K.SIDE, 0, K.DOOR_H, 0, 0.004)],
    ['head', box(-K.OPEN - K.SIDE, K.OPEN + K.SIDE, K.DOOR_H, CEIL, 0, 0.008)],
  ]) {
    const l = layer('hl_' + id, { lambert: true, faceColor: COL.orange, emissive: 0.35, lineColor: COL.orangeLt, lineOpacity: 0.9 });
    l.add([g]); hl[id] = l;
  }
  // setout lines — flat ribbons laid over the framing (plan views)
  const setout = {};
  const yS = Y_CH + 0.008;
  const dashTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 4;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 45, 4);
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const PERIOD = 0.23;
  const mkLine = (name, a, b, dashed, color = COL.text, op = 0.95, width = 0.022) => {
    const dx = b[0] - a[0], dz = b[2] - a[2], Ln = Math.hypot(dx, dz);
    const g = new THREE.PlaneGeometry(Ln, width); g.translate(Ln / 2, 0, 0); g.rotateX(-Math.PI / 2);
    const map = dashed ? dashTex.clone() : null;
    if (map) { map.needsUpdate = true; map.repeat.set(Ln / PERIOD, 1); }
    const m = new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 5;
    const grp = new THREE.Group(); grp.position.set(a[0], yS, a[2]); grp.rotation.y = Math.atan2(-dz, dx);
    grp.add(mesh); scene.add(grp);
    const f = new Fader(v => { m.opacity = op * v; grp.visible = v > 0.003; });
    f.draw = t => { const k = Math.max(0.001, t); mesh.scale.x = k; if (map) map.repeat.x = Ln * k / PERIOD; };
    f.mat = m; f.line = grp;
    F[name] = f; setout[name] = f;
    return f;
  };
  mkLine('so_datum', [-K.SIDE_IN, 0, 0], [K.SIDE_IN, 0, 0], false, COL.orangeLt, 1, 0.03);
  mkLine('so_edgeL', [-K.OPEN, 0, -0.5], [-K.OPEN, 0, 4.7], true);
  mkLine('so_edgeR', [K.OPEN, 0, -0.5], [K.OPEN, 0, 4.7], true);
  mkLine('so_cl', [0, 0, -0.62], [0, 0, 4.7], true);

  // GPO zone: 300–950 from the centre of pad M, clear of the pad — the rear arc, as drawn on Tower's plan
  {
    const P = PADS.find(p => p.id === 'M');
    const A0 = 18 * Math.PI / 180, A1 = 162 * Math.PI / 180;
    const S = 2 * GPO.r1 + 0.1, N = 512;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'); const img = x.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = (i + 0.5) / N * S - S / 2, wz = (j + 0.5) / N * S - S / 2;     // canvas down = +z (towards the back)
      const r = Math.hypot(wx, wz), th = Math.atan2(wz, wx);
      const inPad = Math.abs(wx) <= (P.x2 - P.x1) / 2 && Math.abs(wz) <= (P.z2 - P.z1) / 2;
      const inZone = r >= GPO.r0 && r <= GPO.r1 && th >= A0 && th <= A1 && !inPad;
      const k = (j * N + i) * 4;
      img.data[k] = 255; img.data[k + 1] = 130; img.data[k + 2] = 81; img.data[k + 3] = inZone ? 255 : 0;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const zm = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(S, S), zm);
    zone.rotation.x = -Math.PI / 2; zone.position.set(0, Y_LIN + 0.002, GPO.cz);
    scene.add(zone);
    const cpts = [];
    for (let i = 0; i <= 96; i++) { const q = A0 + (A1 - A0) * i / 96; cpts.push(Math.cos(q) * GPO.r1, Y_LIN + 0.003, GPO.cz + Math.sin(q) * GPO.r1); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cpts, 3));
    const cm = new THREE.LineDashedMaterial({ color: COL.orangeLt, dashSize: 0.06, gapSize: 0.04, transparent: true });
    const circ = new THREE.Line(cg, cm); circ.computeLineDistances(); scene.add(circ);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, side: THREE.DoubleSide }));
    dot.rotation.x = -Math.PI / 2; dot.position.set(GPO.x, Y_LIN + 0.004, GPO.z); scene.add(dot);
    const gpoBox = new THREE.Mesh(box(GPO.x - 0.05, GPO.x + 0.05, CEIL - 0.03, CEIL, GPO.z - 0.035, GPO.z + 0.035), new THREE.MeshBasicMaterial({ color: 0xE7E7F9, transparent: true }));
    scene.add(gpoBox);
    F.gpo = new Fader(v => {
      zm.opacity = 0.2 * v; cm.opacity = v; dot.material.opacity = v; gpoBox.material.opacity = v;
      zone.visible = circ.visible = dot.visible = gpoBox.visible = v > 0.003;
    });
  }

  // door (behind fit) — four panels on a curved track
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x0c0c10, transparent: true, side: THREE.DoubleSide });
  doorMat.userData.role = 'door';
  doorMat.polygonOffset = true; doorMat.polygonOffsetFactor = 1; doorMat.polygonOffsetUnits = 1;
  const doorLine = new THREE.LineBasicMaterial({ color: COL.text, transparent: true, opacity: 0.55 });
  const panels = [];
  const doorGroup = new THREE.Group(); scene.add(doorGroup);
  for (let k = 0; k < DOOR.panels; k++) {
    const g = new THREE.BoxGeometry(2 * TRACK.doorEdge, 0.04, DOOR.h - 0.006);
    const pg = new THREE.Group();
    pg.add(new THREE.Mesh(g, doorMat), new THREE.LineSegments(new THREE.EdgesGeometry(g), doorLine));
    // two shallow grooves
    const gr = []; for (const v of [-0.17, 0.17]) gr.push(-TRACK.doorEdge + 0.01, 0.021, v * DOOR.h, TRACK.doorEdge - 0.01, 0.021, v * DOOR.h);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gr, 3));
    pg.add(new THREE.LineSegments(gg, doorLine));
    doorGroup.add(pg); panels.push(pg);
  }
  const door = {
    travel: 0,
    setTravel(t) {
      this.travel = t;
      const hinge = hingeChain(K.DOOR_H + t);
      for (let k = 0; k < panels.length; k++) {
        const [y0, z0] = hinge[k], [y1, z1] = hinge[k + 1];
        const pg = panels[k];
        pg.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2);
        // local z is the panel's height direction; rotate it onto the chord between its hinges
        pg.rotation.set(-Math.atan2(y1 - y0, z1 - z0), 0, 0);
      }
      lintel.setCables(hinge[0]);
      const [yl, zl] = hinge[DOOR.panels];
      const zt = Math.max(0.17, Math.min(MOTOR_Z - 0.09, zl + 0.22));   // the trolley leads the door's top edge
      hw.carriage.position.z = zt;
      _a0.set(0, RAIL.y0 - 0.018, zt); _a1.set(0, yl, zl);
      hw.arm.position.copy(_a0); hw.arm.lookAt(_a1); hw.arm.scale.set(1, 1, Math.max(0.01, _a0.distanceTo(_a1)));
    },
  };
  const _a0 = new THREE.Vector3(), _a1 = new THREE.Vector3();
  F.door = new Fader(v => { doorMat.opacity = v; doorLine.opacity = 0.55 * v; doorGroup.visible = v > 0.003; });

  // steel lintel over the opening, LVL blocking between its flanges, torsion springs and cable drums
  const lintel = buildLintel(scene, tex, L, F);

  // indicative door hardware: tracks, hanger brackets, opener rail, trolley, motor
  // galvanised steel: shaded light grey with white edges, so tracks and brackets read against the black frame
  const hw = layer('hardware', { lambert: true, faceColor: 0x9aa0aa, emissive: 0.06, lineColor: 0xffffff, lineOpacity: 0.5 });
  const hexHead = (x, y, z) => { const g = new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, 6); g.translate(x, y, z); return g; };
  const bracket = (g, x, zc, yBottom, half = 0.13) => {
    g.push(box(x - 0.03, x + 0.03, CEIL - 0.005, CEIL - 0.0005, zc - half, zc + half));      // flange on the lining
    g.push(box(x - 0.02, x + 0.02, yBottom, CEIL - 0.005, zc - 0.003, zc + 0.003));          // strap down
    for (const dz of [-0.08, 0.08]) g.push(hexHead(x, CEIL - 0.0075, zc + dz));              // screw heads
  };
  {
    const g = [];
    const trackEnd = PATH.sBend + (LEAD_STOP - DOOR.zd - DOOR.ax) + 0.3;   // a little past the open door
    const sv = [0, K.DOOR_H, ...PATH.s.slice(2, PATH.s.length - 1), trackEnd];
    for (const sx of [-1, 1]) {
      const x = sx * TRACK.xc;
      for (let i = 1; i < sv.length; i++) {
        const p0 = pathAt(sv[i - 1]), p1 = pathAt(sv[i]);
        g.push(beam(x, TRACK.x1 - TRACK.x0, TRACK.z1 - TRACK.z0, p0[0], p0[1], p1[0], p1[1]));
      }
      // vertical track mounting angle: one leg screwed to the side room, the other bolted to the track
      const xa = sx * TRACK.x1, xb = sx * TRACK.ang, xt = sx * (TRACK.x1 + 0.004);
      g.push(box(Math.min(xa, xb), Math.max(xa, xb), 0.03, K.DOOR_H + 0.02, 0.004, 0.008));
      g.push(box(Math.min(xa, xt), Math.max(xa, xt), 0.03, K.DOOR_H + 0.02, 0.008, TRACK.z1));
      for (const y of TRACK.screwsY) g.push(hexAt(sx * TRACK.screwX, y, 0.0105));
      // rear hanger brackets, fixed up into the side pads (L1/R1 front, L2/R2 rear)
      for (const zc of [1.3, 2.5]) bracket(g, x, zc, DOOR.yh + 0.025);
    }
    // opener rail above the door's horizontal run, from the header bracket to the motor; centre hanger into pad A
    g.push(box(-0.02, 0.02, RAIL.y0, RAIL.y1, 0.04, MOTOR_Z));
    g.push(box(-0.05, 0.05, RAIL.y0 - 0.015, RAIL.y1 + 0.025, 0.0, 0.04));
    bracket(g, 0, 1.5, RAIL.y1, 0.06);
    // motor behind the open door, hung from pad M
    g.push(box(-0.19, 0.19, 2.75, 2.93, MOTOR_Z, MOTOR_Z + 0.42));
    for (const zc of [MOTOR_Z + 0.06, MOTOR_Z + 0.36]) for (const sx of [-1, 1]) {
      g.push(box(sx * 0.15 - 0.012, sx * 0.15 + 0.012, 2.93, CEIL - 0.005, zc - 0.003, zc + 0.003));
      g.push(box(sx * 0.15 - 0.03, sx * 0.15 + 0.03, CEIL - 0.005, CEIL - 0.0005, zc - 0.05, zc + 0.05));
    }
    hw.add(g);
    const tg = box(-0.035, 0.035, RAIL.y0 - 0.018, RAIL.y1 + 0.012, -0.05, 0.05);
    hw.carriage = new THREE.Group();
    hw.carriage.add(new THREE.Mesh(tg, hw.face), new THREE.LineSegments(new THREE.EdgesGeometry(tg), hw.line));
    hw.root.add(hw.carriage);
    const ag = new THREE.BoxGeometry(0.014, 0.014, 1); ag.translate(0, 0, 0.5);
    hw.arm = new THREE.Group();
    hw.arm.add(new THREE.Mesh(ag, hw.face), new THREE.LineSegments(new THREE.EdgesGeometry(ag), hw.line));
    hw.root.add(hw.arm);
  }
  // highlight around the L1 front hanger bracket (fixing chapter)
  {
    const hg = box(-TRACK.xc - 0.06, -TRACK.xc + 0.06, DOOR.yh - 0.01, CEIL - 0.001, 1.3 - 0.17, 1.3 + 0.17);
    const hm = new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0, depthWrite: false });
    const hl2 = new THREE.LineBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0 });
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(hg, hm), new THREE.LineSegments(new THREE.EdgesGeometry(hg), hl2));
    scene.add(grp);
    F.hangerHL = new Fader(v => { hm.opacity = 0.1 * v; hl2.opacity = v; grp.visible = v > 0.003; });
    F.hangerHL.mats = [hm, hl2];
  }
  door.setTravel(0);

  // straightedge (ch. build — flush check)
  const se = layer('straightedge', { faceColor: 0xb9bcc4, lineColor: 0xffffff, lineOpacity: 0.9 });
  se.add([box(-0.03, 0.03, K.Y_LIN - 0.028, K.Y_LIN - 0.0005, -0.9, 0.9)]);
  const seGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.8), new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  seGlow.rotation.x = Math.PI / 2; seGlow.position.y = K.Y_LIN - 0.0004; se.root.add(seGlow);
  se.root.position.set(-2.55, 0, 1.3);

  // dust motes drifting in the garage (interior shots)
  const dust = (() => {
    const N = 420, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    let r = 11; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -3.4 + rnd() * 6.8; pos[i * 3 + 1] = 0.3 + rnd() * 2.65; pos[i * 3 + 2] = 0.2 + rnd() * 5.6; seed[i] = rnd() * 100;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
      const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,236,224,1)'); gr.addColorStop(1, 'rgba(255,236,224,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const mat = new THREE.PointsMaterial({ size: 0.014, map: sprite, color: 0xffe2d2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
    const base = pos.slice();
    return {
      update(t) {
        if (!pts.visible) return;
        for (let i = 0; i < N; i++) {
          const k = seed[i];
          pos[i * 3] = base[i * 3] + Math.sin(t * 0.11 + k) * 0.18;
          pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.07 + k * 1.7) * 0.12;
          pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.09 + k * 0.6) * 0.18;
        }
        g.attributes.position.needsUpdate = true;
      },
      fader: new Fader(v => { mat.opacity = 0.5 * v * TK.dust; pts.visible = v * TK.dust > 0.003; }),
    };
  })();
  F.dust = dust.fader;

  return { L, F, pads, door, hw, se, setout, hl, dust, DOOR, lintel };
}

// ================================================================== steel lintel (step 10)
// A 250-deep steel lintel spans the opening, garage-side flange tips flush with the inside face of the wall.
// I-beam: blocking fills the recess between the flanges on the garage side. U-beam (channel): it fills the channel.
// The blocking runs straight through and LINTEL.EXT past each edge of the opening; the springs and drums fix to it.
export const LINTEL = { y0: K.DOOR_H, y1: K.DOOR_H + 0.25, tf: 0.01, xEnd: K.OPEN + 0.55, EXT: 0.15, shaftY: 2.855, shaftZ: 0.12 };
function buildLintel(scene, tex, L, F) {
  const { y0, y1, tf, xEnd, EXT } = LINTEL;
  const zf = -0.001;                                         // flange tips, just behind the wall face
  const PROF = {
    I: { back: -0.147, web: [-0.0765, -0.0695] },             // 146 wide flanges, 7 web, recess 69 deep
    U: { back: -0.091, web: [-0.091, -0.083] },               // 90 wide channel, web at the back, recess 82 deep
  };
  const mk = (name, o) => { const l = new Layer(name, o); scene.add(l.root); L[name] = l; F[name] = l; return l; };
  const steel = mk('lintel', { lambert: true, faceColor: 0x8d939d, emissive: 0.06, lineColor: 0xffffff, lineOpacity: 0.55, order: 1 });
  const blk = mk('blocking', { lambert: true, faceColor: COL.orange, emissive: 0.12, map: tex.lvl, lineColor: COL.orangeLt, lineOpacity: 0.85, order: 1 });
  const blkS = mk('blockShort', { lambert: true, faceColor: COL.orange, emissive: 0.12, map: tex.lvl, lineColor: COL.orangeLt, lineOpacity: 0.85, order: 1 });
  const capMat = new THREE.MeshBasicMaterial({ map: tex.steelHatch, transparent: true, side: THREE.DoubleSide });
  { const base = steel.set.bind(steel); steel.set = o => { base(o); capMat.opacity = o; }; }
  const sets = { I: {}, U: {} };
  for (const k of ['I', 'U']) {
    const P = PROF[k];
    const gS = new THREE.Group(), gB = new THREE.Group(), gBS = new THREE.Group();
    steel.root.add(gS); blk.root.add(gB); blkS.root.add(gBS);
    const parts = [[y0, y0 + tf, P.back, zf], [y1 - tf, y1, P.back, zf], [y0 + tf, y1 - tf, P.web[0], P.web[1]]];  // flanges, web
    steel.add(parts.map(([ya, yb, za, zb]) => box(-xEnd, xEnd, ya, yb, za, zb)), { parent: gS });
    for (const s of [-1, 1]) for (const [ya, yb, za, zb] of parts) {
      const cg = new THREE.PlaneGeometry(zb - za, yb - ya);
      const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (zb - za) / 0.06, uv.getY(i) * (yb - ya) / 0.06);
      cg.rotateY(s * Math.PI / 2); cg.translate(s * (xEnd + 0.0006), (ya + yb) / 2, (za + zb) / 2);
      const cm = new THREE.Mesh(cg, capMat); cm.renderOrder = 1; gS.add(cm);
    }
    const lvl = (x1, x2) => lvlBox(x1, x2, y0 + tf, y1 - tf, P.web[1], zf - 0.0005);
    blk.add([lvl(-K.OPEN - EXT, K.OPEN + EXT)], { parent: gB });
    blkS.add([lvl(-K.OPEN, K.OPEN)], { parent: gBS });
    sets[k] = { gS, gB, gBS, recess: [P.web[1], zf] };
  }
  // voids: where the blocking should be and isn't (dashed outline + faint fill on the plane of the flange tips)
  const mkVoid = (name, spans) => {
    const fm = new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const lm = new THREE.LineDashedMaterial({ color: COL.orangeLt, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0 });
    const g = new THREE.Group(); scene.add(g);
    const z = 0.002;
    for (const [a, b] of spans) {
      const pg = new THREE.PlaneGeometry(b - a, y1 - y0 - 2 * tf); pg.translate((a + b) / 2, (y0 + y1) / 2, z);
      const m = new THREE.Mesh(pg, fm); m.renderOrder = 4; g.add(m);
      const pts = [[a, y0 + tf], [b, y0 + tf], [b, y1 - tf], [a, y1 - tf], [a, y0 + tf]].map(([x, y]) => new THREE.Vector3(x, y, z));
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm); ln.computeLineDistances(); ln.renderOrder = 5; g.add(ln);
    }
    F[name] = new Fader(v => { fm.opacity = 0.16 * v; lm.opacity = 0.95 * v; g.visible = v > 0.003; });
  };
  mkVoid('voidAll', [[-K.OPEN - EXT, K.OPEN + EXT]]);
  mkVoid('voidEnds', [[-K.OPEN - EXT, -K.OPEN], [K.OPEN, K.OPEN + EXT]]);

  // spring hardware: shaft, two springs with their cones and anchor brackets, end bearing brackets, cable drums
  const { shaftY: sy, shaftZ: sz } = LINTEL;
  const hwS = mk('springs', { lambert: true, faceColor: 0xb4bac4, emissive: 0.08, lineColor: 0xffffff, lineOpacity: 0.5, order: 2 });
  const coil = mk('springCoil', { lambert: true, faceColor: 0x2a2d33, emissive: 0.05, lineOpacity: 0, order: 2 });
  F.springCoil = coil;
  const alongX = (g, x, y, z) => { g.rotateZ(Math.PI / 2); g.translate(x, y, z); return g; };
  const shaft = alongX(new THREE.CylinderGeometry(0.0125, 0.0125, 2 * (K.OPEN + 0.145), 14, 1), 0, sy, sz);
  const xd = K.OPEN + 0.105;                                  // drum centre, just outside the vertical track
  const drums = [], brackets = [], cones = [], screws = [];
  for (const s of [-1, 1]) {
    drums.push(alongX(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 28, 1), s * xd, sy, sz));
    drums.push(alongX(new THREE.CylinderGeometry(0.068, 0.068, 0.006, 28, 1), s * (xd + 0.028), sy, sz));
    // end bearing bracket: leg screwed to the blocking face, plate standing out to carry the shaft
    const xo = s * (K.OPEN + 0.145);
    brackets.push(box(Math.min(xo, s * (K.OPEN + 0.09)), Math.max(xo, s * (K.OPEN + 0.09)), sy - 0.075, sy + 0.065, 0, 0.006));
    brackets.push(box(xo - 0.003, xo + 0.003, sy - 0.075, sy + 0.065, 0, sz + 0.045));
    for (const dy of [-0.05, 0.04]) screws.push(hexAt(s * (K.OPEN + 0.118), sy + dy, 0.0085));
    // spring anchor bracket near the centre, clear of the opener's header bracket
    const xa = s * 0.15;
    brackets.push(box(Math.min(xa, s * 0.09), Math.max(xa, s * 0.09), sy - 0.065, sy + 0.01, 0, 0.006));
    brackets.push(box(xa - 0.003, xa + 0.003, sy - 0.065, sy + 0.035, 0, sz + 0.04));
    for (const dy of [-0.045, -0.012]) screws.push(hexAt(s * 0.12, sy + dy, 0.0085));
    cones.push(alongX(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 20, 1), s * 0.185, sy, sz));
    cones.push(alongX(new THREE.CylinderGeometry(0.036, 0.03, 0.05, 20, 1), s * 1.12, sy, sz));
  }
  hwS.add([...brackets], { edges: true });
  hwS.add([shaft, ...drums, ...cones, ...screws], { edges: false });
  // the coils: a helix of round wire either side of the centre
  const helix = (x0, x1, turns) => {
    const pts = []; const n = turns * 14;
    for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, sy + Math.cos(a) * 0.03, sz + Math.sin(a) * 0.03)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.0048, 6, false);
  };
  coil.add([helix(0.21, 1.095, 46), helix(-0.21, -1.095, 46)], { edges: false });
  // lifting cables: off the front of each drum, down beside the track to the bottom of the door
  const cables = [-1, 1].map(s => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const ln = new THREE.Line(g, hwS.line); ln.frustumCulled = false; hwS.root.add(ln);
    return { s, g };
  });
  const DR = 0.06, xc = K.OPEN + 0.088;
  const setCables = ([yb, zb]) => {
    for (const c of cables) {
      // tangent from the drum (in the y-z plane) to the door's bottom edge, leaving from the front of the drum
      const dy = yb + 0.03 - sy, dz = zb - sz, L = Math.hypot(dy, dz);
      const phi = Math.atan2(dy, dz), al = Math.acos(Math.min(1, DR / L)), th = phi - al;
      const a = c.g.attributes.position;
      a.setXYZ(0, c.s * xc, sy + DR * Math.sin(th), sz + DR * Math.cos(th));
      a.setXYZ(1, c.s * xc, yb + 0.03, zb);
      a.needsUpdate = true;
    }
  };

  let profile = 'I';
  const setProfile = p => {
    profile = p;
    for (const k of ['I', 'U']) { const on = k === p; sets[k].gS.visible = on; sets[k].gB.visible = on; sets[k].gBS.visible = on; }
  };
  setProfile('I');
  return { setProfile, get profile() { return profile; }, blocking: blk, blockShort: blkS, springs: hwS, coil, setCables };
}
function hexAt(x, y, z) { const g = new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, 6); g.rotateX(Math.PI / 2); g.translate(x, y, z); return g; }
// screws for the section close-ups: thread profile turned on a lathe, hex washer head; origin on the bearing face,
// shank pointing up (+y)
const SCREW_L = 0.075;
function makeScrewGeo() {
  const pr = [], Rm = 0.0032, Rr = 0.0022, P = 0.0034;
  pr.push(new THREE.Vector2(0.0002, 0), new THREE.Vector2(Rr + 0.0005, 0), new THREE.Vector2(Rr + 0.0005, 0.01));
  let y = 0.01, up = true;
  while (y < SCREW_L - 0.011) { y += P / 2; pr.push(new THREE.Vector2(up ? Rm : Rr, y)); up = !up; }
  pr.push(new THREE.Vector2(Rr * 0.75, SCREW_L - 0.004), new THREE.Vector2(0.0002, SCREW_L));
  const shank = new THREE.LatheGeometry(pr, 16);
  const washer = new THREE.CylinderGeometry(0.008, 0.008, 0.0014, 24); washer.translate(0, -0.0007, 0);
  const hex = new THREE.CylinderGeometry(0.006, 0.006, 0.0055, 6); hex.translate(0, -0.0014 - 0.00275, 0);
  return mergeGeometries([shank.toNonIndexed(), washer.toNonIndexed(), hex.toNonIndexed()]);
}

// ================================================================== section detail (fixing, what fails)
// A cut sample of the ceiling at pad L1, sectioned at x = -2.5 (looking along -x). The bracket sits between
// the battens that cross the pad, so a failing fixing can tear a plug of lining clear of them.
export const DETAIL = { XC: -2.5, RZ: 1.24 };
export function buildDetail(scene, tex) {
  const { Y_LIN, Y_BAT, Y_CH, CEIL } = K;
  const crop = { x: [-3.4, -2.5], y: [2.7, 3.4], z: [0.75, 2.15] };
  const root = new THREE.Group(); scene.add(root);
  const P = PADS.find(p => p.id === 'L1');

  const mStruct = new THREE.MeshBasicMaterial({ color: COL.face, transparent: true });
  mStruct.polygonOffset = true; mStruct.polygonOffsetFactor = 1; mStruct.polygonOffsetUnits = 1;
  const mCapS = new THREE.MeshBasicMaterial({ map: tex.hatch, transparent: true });
  const mLin = new THREE.MeshBasicMaterial({ color: COL.lining, transparent: true });
  const mCapL = new THREE.MeshBasicMaterial({ map: tex.stipple, transparent: true });
  const mNog = new THREE.MeshLambertMaterial({ color: COL.orange, emissive: COL.orange, emissiveIntensity: 0.14, map: tex.lvl, transparent: true });
  const mCapN = new THREE.MeshBasicMaterial({ color: 0xF07A45, map: tex.lvl, transparent: true });
  const mNogU = new THREE.MeshBasicMaterial({ color: 0x0d0705, transparent: true });
  const mLine = new THREE.LineBasicMaterial({ color: COL.text, transparent: true, opacity: 0.62 });
  const mLineLin = new THREE.LineBasicMaterial({ color: COL.text, transparent: true, opacity: 0.62 });
  mLin.userData.role = mCapL.userData.role = mLineLin.userData.role = 'paper';
  const mLineN = new THREE.LineBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0.9 });
  const mHw = new THREE.MeshBasicMaterial({ color: 0xc9ccd4, transparent: true });
  const mats = [mStruct, mCapS, mLin, mCapL, mNog, mCapN, mNogU, mLine, mLineLin, mLineN, mHw];

  function cutBox(parent, b, kind) {
    const x1 = Math.max(b[0], crop.x[0]), x2 = Math.min(b[1], crop.x[1]);
    const y1 = Math.max(b[2], crop.y[0]), y2 = Math.min(b[3], crop.y[1]);
    const z1 = Math.max(b[4], crop.z[0]), z2 = Math.min(b[5], crop.z[1]);
    if (x2 - x1 < 1e-4 || y2 - y1 < 1e-4 || z2 - z1 < 1e-4) return null;
    const cut = [b[1] > x2 + 1e-6, b[0] < x1 - 1e-6, b[3] > y2 + 1e-6, b[2] < y1 - 1e-6, b[5] > z2 + 1e-6, b[4] < z1 - 1e-6];
    const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
    worldUV(g, x2 - x1, y2 - y1, z2 - z1, kind === 'nog' ? 0.16 : 0.1);
    g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    const base = kind === 'nog' ? mNog : kind === 'lin' ? mLin : kind === 'hw' ? mHw : mStruct;
    const cap = kind === 'nog' ? mCapN : kind === 'lin' ? mCapL : kind === 'hw' ? mHw : mCapS;
    const mesh = new THREE.Mesh(g, cut.map((c, i) => (c ? cap : kind === 'nog' && i === 3 ? mNogU : base)));
    const grp = new THREE.Group();
    grp.add(mesh, new THREE.LineSegments(new THREE.EdgesGeometry(g), kind === 'nog' ? mLineN : mLine));
    parent.add(grp);
    return grp;
  }
  const sub = name => { const g = new THREE.Group(); g.name = name; root.add(g); return g; };

  const common = sub('common');
  // lining, split around the hanger so a plug of board can tear out; drawn with one outer outline (no seams)
  const { RZ, XC } = DETAIL, PLUG = { x: [-2.62, XC], z: [RZ - 0.16, RZ + 0.16] };
  const linPiece = (x1, x2, z1, z2, parent = common) => {
    const g = new THREE.BoxGeometry(x2 - x1, Y_LIN - CEIL, z2 - z1);
    worldUV(g, x2 - x1, Y_LIN - CEIL, z2 - z1, 0.1);
    g.translate((x1 + x2) / 2, (CEIL + Y_LIN) / 2, (z1 + z2) / 2);
    const onEdge = [x2 >= crop.x[1] - 1e-6, x1 <= crop.x[0] + 1e-6, false, false, z2 >= crop.z[1] - 1e-6, z1 <= crop.z[0] + 1e-6];
    const m = new THREE.Mesh(g, onEdge.map(c => (c ? mCapL : mLin)));
    parent.add(m);
    return m;
  };
  linPiece(crop.x[0], crop.x[1], crop.z[0], PLUG.z[0]);
  linPiece(crop.x[0], crop.x[1], PLUG.z[1], crop.z[1]);
  linPiece(crop.x[0], PLUG.x[0], PLUG.z[0], PLUG.z[1]);
  const mPlugL = new THREE.LineBasicMaterial({ color: COL.text, transparent: true, opacity: 0 });
  mPlugL.userData.role = 'paper';
  {
    const [x0, x1] = crop.x, [z0, z1] = crop.z, ya = CEIL, yb = Y_LIN, [pz0, pz1] = PLUG.z, px = PLUG.x[0];
    const seg = [], hole = [];
    const L = (arr, a, b) => arr.push(...a, ...b);
    for (const y of [ya, yb]) {
      L(seg, [x0, y, z0], [x0, y, z1]);
      for (const z of [z0, z1]) L(seg, [x0, y, z], [x1, y, z]);
      L(seg, [x1, y, z0], [x1, y, pz0]); L(seg, [x1, y, pz1], [x1, y, z1]);       // cut face, split at the plug
      L(hole, [px, y, pz0], [x1, y, pz0]); L(hole, [px, y, pz1], [x1, y, pz1]); L(hole, [px, y, pz0], [px, y, pz1]);
    }
    for (const [x, z] of [[x0, z0], [x0, z1], [x1, z0], [x1, z1]]) L(seg, [x, ya, z], [x, yb, z]);
    for (const [x, z] of [[px, pz0], [px, pz1], [x1, pz0], [x1, pz1]]) L(hole, [x, ya, z], [x, yb, z]);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    common.add(new THREE.LineSegments(lg, mLineLin));
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hole, 3));
    common.add(new THREE.LineSegments(hg, mPlugL));
  }
  for (const x of TRUSS_X) cutBox(common, [x - K.CH_W / 2, x + K.CH_W / 2, Y_BAT, Y_CH, K.Z0, K.Z1], 's');
  // battens that are not affected by the pad
  for (const zb of BATTEN_Z) if (!(P.z2 > zb - K.BAT_W / 2 && P.z1 < zb + K.BAT_W / 2)) cutBox(common, [-3.6, 3.6, Y_LIN, Y_BAT, zb - K.BAT_W / 2, zb + K.BAT_W / 2], 's');
  // battens across the pad: cut back (stubs) vs intact
  const bStubs = sub('battenStubs'), bFull = sub('battenFull');
  for (const zb of BATTEN_Z) if (P.z2 > zb - K.BAT_W / 2 && P.z1 < zb + K.BAT_W / 2) {
    cutBox(bStubs, [-3.6, P.xMin, Y_LIN, Y_BAT, zb - K.BAT_W / 2, zb + K.BAT_W / 2], 's');
    cutBox(bFull, [-3.6, 3.6, Y_LIN, Y_BAT, zb - K.BAT_W / 2, zb + K.BAT_W / 2], 's');
  }
  // nogging variants
  const vOk = sub('ok'), vHigh = sub('high'), vTop = sub('top'), vBat = sub('battens');
  for (const [a, b] of P.blocks) cutBox(vOk, [a, b, Y_LIN, Y_CH, P.z1, P.z2], 'nog');
  for (const [a, b] of P.fills) cutBox(vOk, [a, b, Y_LIN, Y_BAT, P.z1, P.z2], 'nog');
  for (const [a, b] of P.blocks) cutBox(vHigh, [a, b, Y_BAT, Y_CH, P.z1, P.z2], 'nog');
  cutBox(vTop, [-3.6, -2.0, Y_CH, Y_CH + 0.045, P.z1, P.z2], 'nog');
  // where nothing solid is behind the lining: a faint fill and a dashed outline on the cut face
  const mVoid = new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const mVoidL = new THREE.LineDashedMaterial({ color: COL.orangeLt, dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0 });
  const voidRect = (parent, y1, y2, z1, z2) => {
    const x = crop.x[1] + 0.0012;
    const g = new THREE.PlaneGeometry(z2 - z1, y2 - y1); g.rotateY(Math.PI / 2); g.translate(x, (y1 + y2) / 2, (z1 + z2) / 2);
    const m = new THREE.Mesh(g, mVoid); m.renderOrder = 2; parent.add(m);
    const pts = [[z1, y1], [z2, y1], [z2, y2], [z1, y2], [z1, y1]].map(([z, y]) => new THREE.Vector3(x, y, z));
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mVoidL); ln.computeLineDistances(); ln.renderOrder = 3;
    parent.add(ln);
  };
  voidRect(vHigh, Y_LIN, Y_BAT, P.z1, P.z2);
  voidRect(vTop, Y_LIN, Y_CH, P.z1, P.z2);
  voidRect(vBat, Y_LIN, Y_CH, P.z1, P.z2);

  // ---------------- fixing rig: Tower's hanger bracket, two hex-head screws, and the lining plug
  const mBr = new THREE.MeshLambertMaterial({ color: 0xaeb3bd, emissive: 0x2a2c33, transparent: true });
  const mBrL = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const mSlot = new THREE.MeshBasicMaterial({ color: 0x0a0a0d, transparent: true });
  const mScrew = new THREE.MeshLambertMaterial({ color: 0xf1f3f7, emissive: 0x4a4e58, transparent: true, depthTest: false });
  const mBite = new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  mBite.userData.keepAdditive = true;
  mats.push(mBr, mBrL, mSlot, mScrew);
  // pivot at the bracket's bearing point on the lining; children are placed relative to it
  const rig = new THREE.Group(); rig.position.set(XC, CEIL, RZ); root.add(rig);
  const rel = (x1, x2, y1, y2, z1, z2) => box(x1 - XC, x2 - XC, y1 - CEIL, y2 - CEIL, z1 - RZ, z2 - RZ);
  const addPart = (g, mat, lineMat, parent = rig) => { const m = new THREE.Mesh(g, mat); parent.add(m); if (lineMat) parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), lineMat)); return m; };
  addPart(rel(XC - 0.06, XC, CEIL - 0.005, CEIL, RZ - 0.15, RZ + 0.15), mBr, mBrL);          // flange, 300 long
  addPart(rel(XC - 0.004, XC, 2.80, CEIL - 0.005, RZ - 0.02, RZ + 0.02), mBr, mBrL);        // strap, 40 wide
  for (let i = 0; i < 5; i++) {                                                              // strap slots
    const y = 2.815 + i * 0.033;
    addPart(rel(XC + 0.0004, XC + 0.0012, y, y + 0.014, RZ - 0.007, RZ + 0.007), mSlot, null);
  }
  const screwGeo = makeScrewGeo();
  const screws = [-0.08, 0.08].map(dz => {
    const grp = new THREE.Group(); grp.position.set(0, -0.005, dz);
    const m = new THREE.Mesh(screwGeo, mScrew); m.renderOrder = 30; grp.add(m);
    const bite = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 1, 16), mBite); bite.renderOrder = 29;
    rig.add(bite);
    rig.add(grp);
    return { grp, m, bite, dz };
  });
  // the plug of lining that goes with the bracket when the fixing fails
  const plug = new THREE.Group(); plug.position.copy(rig.position); root.add(plug);
  {
    const g = rel(PLUG.x[0], PLUG.x[1], CEIL, Y_LIN, PLUG.z[0], PLUG.z[1]);
    const m = new THREE.Mesh(g, [mCapL, mLin, mLin, mLin, mLin, mLin]);
    plug.add(m, new THREE.LineSegments(new THREE.EdgesGeometry(g), mPlugL));
  }
  // fixing state: rise (bracket up into place), d[i] (screw i driven), fail (pull-through or crush), mode
  // glow: multiplier on the bite glow (pulsed by the guide while the fixing is shown holding)
  const FIX = { rise: 0, d: [0, 0], fail: 0, mode: 'ok', spin: 6, glow: 1 };
  const BITE_FROM = Y_LIN + 0.002;
  function applyFix() {
    const pull = FIX.mode === 'pull', gap = FIX.mode === 'gap';
    const dy = pull ? -0.034 * FIX.fail : gap ? 0.024 * FIX.fail : 0;
    const tilt = pull ? 0.07 * FIX.fail : 0;
    rig.position.y = CEIL - 0.26 * (1 - FIX.rise) + dy; rig.rotation.x = tilt;
    plug.position.y = CEIL + dy; plug.rotation.x = tilt;
    mPlugL.opacity = 0.62 * Math.min(1, FIX.fail * 3) * DET_O.v;
    screws.forEach((sc, i) => {
      const d = FIX.d[i];
      sc.grp.position.y = -0.005 - 0.095 * (1 - d);
      sc.grp.rotation.y = d * FIX.spin * Math.PI * 2;
      sc.grp.visible = d > 0.001;                       // each screw is presented as it is driven
      // the screw biting into solid LVL glows (correct fixing only)
      const tip = rig.position.y - 0.005 + SCREW_L - 0.003 - 0.095 * (1 - d);
      const len = FIX.mode === 'ok' ? tip - BITE_FROM : 0;
      if (len > 0.002) {
        sc.bite.visible = true;
        sc.bite.scale.set(1, len, 1);
        sc.bite.position.set(0, (BITE_FROM + tip) / 2 - rig.position.y, sc.dz);
      } else sc.bite.visible = false;
    });
    mBite.opacity = 0.55 * DET_O.v * FIX.glow;
  }
  const DET_O = { v: 0 };

  const groups = { root, common, bStubs, bFull, vOk, vHigh, vTop, vBat, rig, plug };
  const fade = new Fader(v => {
    DET_O.v = v;
    for (const m of mats) m.opacity = (m === mLine || m === mLineLin ? 0.62 : m === mLineN ? 0.9 : m === mBrL ? 0.85 : 1) * v;
    mVoid.opacity = 0.13 * v; mVoidL.opacity = 0.95 * v;
    mStruct.depthWrite = mNog.depthWrite = mBr.depthWrite = v > 0.55;
    root.visible = v > 0.003;
    applyFix();
  });
  fade.set(0);
  const vis = (g, on) => { g.visible = !!on; };
  const variants = {
    ok: () => { vis(bStubs, 1); vis(bFull, 0); vis(vOk, 1); vis(vHigh, 0); vis(vTop, 0); vis(vBat, 0); },
    high: () => { vis(bStubs, 1); vis(bFull, 0); vis(vOk, 0); vis(vHigh, 1); vis(vTop, 0); vis(vBat, 0); },
    top: () => { vis(bStubs, 0); vis(bFull, 1); vis(vOk, 0); vis(vHigh, 0); vis(vTop, 1); vis(vBat, 0); },
    battens: () => { vis(bStubs, 0); vis(bFull, 1); vis(vOk, 0); vis(vHigh, 0); vis(vTop, 0); vis(vBat, 1); },
  };
  variants.ok();
  applyFix();
  return { groups, fade, variants, crop, FIX, applyFix, XC, RZ, origin: new THREE.Vector3(XC, CEIL, RZ) };
}

// ================================================================== jamb section (side room, step 09)
// A cut sample of the right-hand jamb, sectioned across just above a track fixing and seen from the garage: the wall
// beside the opening, the edge of the door, and the vertical track on its mounting angle, screwed into the side room.
// Variants: ok (150 of solid), narrow (80 of solid, then a framed wall's cavity), obstruct (a conduit in the return).
// The sample is cut just above the fixing, so the screw shows in the plane of the cut (drawn through the cap).
export const JAMB = { top: 1.0, y: 0.991, sx: TRACK.screwX, NARROW: K.OPEN + 0.08, PIPE: { z: 0.017, r: 0.016 } };
export function buildJamb(scene, tex) {
  const crop = { x: [2.25, 2.74], y: [0.8, JAMB.top], z: [-0.25, 0.2] };
  const X0 = K.OPEN, XS = K.OPEN + K.SIDE, XN = JAMB.NARROW, WZ = -K.FRONT_T;
  const root = new THREE.Group(); scene.add(root);

  const mStruct = new THREE.MeshBasicMaterial({ color: COL.face, transparent: true });
  const mCapS = new THREE.MeshBasicMaterial({ map: tex.hatch, transparent: true });
  const mSide = new THREE.MeshLambertMaterial({ color: COL.orange, emissive: COL.orange, emissiveIntensity: 0.3, transparent: true });
  const mCapSide = new THREE.MeshBasicMaterial({ map: tex.sideHatch, transparent: true });
  const mLin = new THREE.MeshBasicMaterial({ color: COL.lining, transparent: true });
  const mCapL = new THREE.MeshBasicMaterial({ map: tex.stipple, transparent: true });
  const mDoor = new THREE.MeshBasicMaterial({ color: 0x0c0c10, transparent: true });
  const mCapD = new THREE.MeshBasicMaterial({ color: 0x1c1c22, transparent: true });
  const mHw = new THREE.MeshLambertMaterial({ color: 0x9aa0aa, emissive: 0x9aa0aa, emissiveIntensity: 0.12, transparent: true });
  const mCapH = new THREE.MeshBasicMaterial({ color: 0xdfe2e8, transparent: true });
  const mLine = new THREE.LineBasicMaterial({ color: COL.text, transparent: true });
  const mLineLin = new THREE.LineBasicMaterial({ color: COL.text, transparent: true });
  const mLineN = new THREE.LineBasicMaterial({ color: COL.orangeLt, transparent: true });
  const mLineH = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true });
  const mPipe = new THREE.MeshLambertMaterial({ color: 0xd9dce2, emissive: 0xd9dce2, emissiveIntensity: 0.12, transparent: true });
  const mBore = new THREE.MeshBasicMaterial({ color: 0x0a0a0d, transparent: true });
  mLin.userData.role = mCapL.userData.role = mLineLin.userData.role = 'paper';
  mDoor.userData.role = 'door';
  for (const m of [mStruct, mSide, mDoor, mHw, mLin]) { m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; }
  const OP = new Map([[mLine, 0.62], [mLineLin, 0.62], [mLineN, 0.9], [mLineH, 0.85]]);
  const mats = [mStruct, mCapS, mSide, mCapSide, mLin, mCapL, mDoor, mCapD, mHw, mCapH, mLine, mLineLin, mLineN, mLineH, mPipe, mBore];
  const KIND = {                     // face, cut face, edges, texture tile
    s: [mStruct, mCapS, mLine, 0.16], side: [mSide, mCapSide, mLineN, 0.16], lin: [mLin, mCapL, mLineLin, 0.1],
    door: [mDoor, mCapD, mLine, 0.1], hw: [mHw, mCapH, mLineH, 0.1],
  };
  function cutBox(parent, b, kind) {
    const x1 = Math.max(b[0], crop.x[0]), x2 = Math.min(b[1], crop.x[1]);
    const y1 = Math.max(b[2], crop.y[0]), y2 = Math.min(b[3], crop.y[1]);
    const z1 = Math.max(b[4], crop.z[0]), z2 = Math.min(b[5], crop.z[1]);
    const cut = [b[1] > x2 + 1e-6, b[0] < x1 - 1e-6, b[3] > y2 + 1e-6, b[2] < y1 - 1e-6, b[5] > z2 + 1e-6, b[4] < z1 - 1e-6];
    const [base, cap, line, tile] = KIND[kind];
    const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
    worldUV(g, x2 - x1, y2 - y1, z2 - z1, tile);
    g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(g, cut.map(c => (c ? cap : base))), new THREE.LineSegments(new THREE.EdgesGeometry(g), line));
    parent.add(grp);
    return grp;
  }
  const sub = (name, parent = root) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };

  // the wall: 150 of solid side room beside the opening, then the wall beyond it
  const solid = sub('solid');
  cutBox(solid, [X0, XS, -9, 9, WZ, 0], 'side');
  cutBox(solid, [XS, 9, -9, 9, WZ, 0], 's');
  // too narrow: 80 of solid, then the cavity of a framed wall between its linings
  const narrow = sub('narrow');
  cutBox(narrow, [X0, XN, -9, 9, WZ, 0], 'side');
  cutBox(narrow, [XN, 9, -9, 9, -0.01, 0], 'lin');
  cutBox(narrow, [XN, 9, -9, 9, WZ, WZ + 0.01], 'lin');
  const mVoid = new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const mVoidL = new THREE.LineDashedMaterial({ color: COL.orangeLt, dashSize: 0.008, gapSize: 0.006, transparent: true, opacity: 0 });
  {
    // where the side room should be solid and isn't: dashed outline and a faint fill on the cut
    const y = crop.y[1] + 0.0012, a = XN, b = XS, c = WZ + 0.01, d = -0.01;
    const g = new THREE.PlaneGeometry(b - a, d - c); g.rotateX(-Math.PI / 2); g.translate((a + b) / 2, y, (c + d) / 2);
    const m = new THREE.Mesh(g, mVoid); m.renderOrder = 2; narrow.add(m);
    const pts = [[a, c], [b, c], [b, d], [a, d], [a, c]].map(([x, z]) => new THREE.Vector3(x, y, z));
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mVoidL); ln.computeLineDistances(); ln.renderOrder = 3; narrow.add(ln);
  }
  // obstructed: a conduit up the face of the side room, where the angle fixes
  const pipe = sub('pipe');
  {
    const { z, r } = JAMB.PIPE, h = crop.y[1] - crop.y[0], yc = (crop.y[0] + crop.y[1]) / 2;
    const g = new THREE.CylinderGeometry(r, r, h, 28, 1); g.translate(JAMB.sx, yc, z);
    pipe.add(new THREE.Mesh(g, mPipe), new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), mLineN));
    const bore = new THREE.CircleGeometry(r * 0.72, 28); bore.rotateX(-Math.PI / 2); bore.translate(JAMB.sx, crop.y[1] + 0.0008, z);
    pipe.add(new THREE.Mesh(bore, mBore));
  }

  // the door, overlapping the opening by 40, cut at the sample
  cutBox(root, [0, TRACK.doorEdge, -9, 9, 0.04, 0.08], 'door');

  // the vertical track and its mounting angle move as one; pivot on the angle's inner corner at the wall
  const PIV = new THREE.Vector3(TRACK.x1, 0, 0);
  const asm = sub('asm'); asm.position.copy(PIV);
  const asmIn = sub('asmIn', asm); asmIn.position.copy(PIV).negate();
  {
    const { x0, x1, z0, z1 } = TRACK, t = 0.003;
    for (const [a, b, c, d] of [
      [x1 - t, x1, z0, z1], [x0, x1 - t, z0, z0 + t], [x0, x1 - t, z1 - t, z1],   // C-channel: web, two flanges
      [x0, x0 + t, z0 + t, z0 + 0.011], [x0, x0 + t, z1 - 0.011, z1 - t],         // lips
      [x1, TRACK.ang, 0, 0.004], [x1, x1 + 0.004, 0.004, z1],                     // mounting angle: wall leg, track leg
    ]) cutBox(asmIn, [a, b, -9, 9, c, d], 'hw');
  }
  // the fixing through the angle's wall leg into the side room (drawn through the wall, as an x-ray)
  const mScrew = new THREE.MeshLambertMaterial({ color: 0xf1f3f7, emissive: 0x4a4e58, transparent: true, depthTest: false });
  const mBite = new THREE.MeshBasicMaterial({ color: COL.orangeLt, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  mBite.userData.keepAdditive = true;
  mats.push(mScrew);
  const sg = makeScrewGeo(); sg.rotateX(-Math.PI / 2);                     // shank pointing -z, into the wall
  const screw = sub('screw', asmIn);
  const sm = new THREE.Mesh(sg, mScrew); sm.renderOrder = 30; screw.add(sm);
  const bg = new THREE.CylinderGeometry(0.0062, 0.0062, 1, 16); bg.rotateX(Math.PI / 2);
  const bite = new THREE.Mesh(bg, mBite); bite.renderOrder = 29; asmIn.add(bite);

  // in: the track offered up to the wall; d: the screw driven; fail: (narrow) the track pulling away from the wall
  const J = { in: 1, d: 1, fail: 0, mode: 'ok', spin: 6, glow: 1 };
  const J_O = { v: 0 };
  const OFF = 0.11, BEAR = 0.004, BITE_FROM = -0.002;
  function apply() {
    const stop = J.mode === 'obstruct' ? JAMB.PIPE.z + JAMB.PIPE.r : 0;      // the angle stands off on the conduit
    const pull = J.mode === 'narrow' ? J.fail : 0;
    asm.position.set(PIV.x, 0, stop + OFF * (1 - J.in) + 0.006 * pull);
    asm.rotation.y = -0.16 * pull;
    const d = J.mode === 'obstruct' ? 0 : J.d;
    screw.visible = d > 0.001;
    screw.position.set(JAMB.sx, JAMB.y, BEAR + 0.09 * (1 - d));
    sm.rotation.z = d * J.spin * Math.PI * 2;
    // the screw biting into the solid side room glows (correct fixing only)
    const tip = screw.position.z - SCREW_L + 0.003;
    const len = J.mode === 'ok' && J.in > 0.999 ? BITE_FROM - tip : 0;
    if (len > 0.002) { bite.visible = true; bite.scale.set(1, 1, len); bite.position.set(JAMB.sx, JAMB.y, (BITE_FROM + tip) / 2); } else bite.visible = false;
    mBite.opacity = 0.55 * J_O.v * J.glow;
  }
  const fade = new Fader(v => {
    J_O.v = v;
    for (const m of mats) m.opacity = (OP.get(m) ?? 1) * v;
    mVoid.opacity = 0.16 * v; mVoidL.opacity = 0.95 * v;
    for (const m of [mStruct, mSide, mDoor, mHw, mLin, mPipe]) m.depthWrite = v > 0.55;
    root.visible = v > 0.003;
    apply();
  });
  fade.set(0);
  const variant = name => {
    J.mode = name;
    solid.visible = name !== 'narrow'; narrow.visible = name === 'narrow'; pipe.visible = name === 'obstruct';
  };
  variant('ok');
  apply();
  return { root, fade, variant, J, apply, crop, groups: { asm }, origin: PIV.clone() };
}
