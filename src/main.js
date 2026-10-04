import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildModel, buildDetail, buildJamb, makeTextures, applyTheme, PADS, K, DOOR_TRAVEL, TK, THEME_BG } from './model.js';
import { CHAPTERS, DEFAULT_STATE, STEP_COUNT } from './chapters.js';

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const E = {
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  // a fixing letting go: a slow creep, then it gives
  give: t => (t < 0.35 ? 0.07 * Math.sin((t / 0.35) * Math.PI / 2) : 0.07 + 0.93 * (1 - Math.pow(1 - (t - 0.35) / 0.65, 3))),
};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const PAD_IDS = PADS.map(p => p.id);
const PADS_BY = Object.fromEntries(PADS.map(p => [p.id, p]));

class Tweens {
  constructor() { this.list = []; }
  add(o) {
    if (o.key) this.cancel(o.key);
    const tw = { dur: 1, delay: 0, ease: E.inOutCubic, ...o };
    tw.t = -(tw.delay || 0);
    this.list.push(tw);
    return tw;
  }
  cancel(key) { this.list = this.list.filter(t => t.key !== key); }
  update(dt) {
    const done = [];
    for (const tw of this.list.slice()) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const p = tw.dur <= 0 ? 1 : Math.min(1, tw.t / tw.dur);
      tw.onUpdate && tw.onUpdate(tw.ease(p), p);
      if (p >= 1) done.push(tw);
    }
    if (done.length) {
      this.list = this.list.filter(t => !done.includes(t));
      for (const tw of done) tw.onDone && tw.onDone();
    }
  }
  finish() {
    for (let i = 0; i < 10 && this.list.length; i++) {
      for (const tw of this.list) tw.t = tw.dur + 1;
      this.update(0);
    }
  }
}
const tweens = new Tweens();

// ---------------------------------------------------------------- DOM
const canvas = $('#gl');
const labelsEl = $('#labels'), dimsEl = $('#dims'), finderEl = $('#finder'), flashEl = $('#flash');
const panel = $('#panel'), panelIn = $('#panelIn'), panelScroll = $('#panelScroll');
const pstep = $('#pstep'), pname = $('#pname'), nextBtn = $('#nextBtn'), nextLbl = $('#nextLbl'), backBtn = $('#backBtn');
const prog = $('#prog'), mprog = $('#mprog'), drawer = $('#drawer'), padCard = $('#padCard'), resetBtn = $('#resetView'), hint = $('#hint');

// ---------------------------------------------------------------- renderer + scene
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { renderer = null; }
const GL = !!renderer;
if (!GL) document.body.classList.add('nogl');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.02, 260);
let M = null, DET = null, JMB = null, controls = null, TEX = null;
const F = {};

if (GL) {
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene.fog = new THREE.Fog(0x000000, 12, 50);
  scene.add(new THREE.AmbientLight(0xffffff, 0.42 * Math.PI));
  const key = new THREE.DirectionalLight(0xfff0e6, 0.55 * Math.PI); key.position.set(4, 10, -3); scene.add(key);
  const under = new THREE.DirectionalLight(0xe7e7f9, 0.3 * Math.PI); under.position.set(-2, -6, 5); scene.add(under);
  const tex = makeTextures(); TEX = tex;
  const an = renderer.capabilities.getMaxAnisotropy();
  for (const t of Object.values(tex)) t.anisotropy = Math.min(8, an);
  M = buildModel(scene, tex);
  DET = buildDetail(scene, tex);
  JMB = buildJamb(scene, tex);
  Object.assign(F, M.F, { detail: DET.fade, jamb: JMB.fade });
  F.doorOpen = { o: 0, set(v) { this.o = v; M.door.setTravel(v * DOOR_TRAVEL); } };
  for (const k of Object.keys(F)) if (k !== 'doorOpen') F[k].set(0);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.8; controls.panSpeed = 0.7;
  controls.screenSpacePanning = true;
  controls.autoRotateSpeed = 0.45;
  controls.maxPolarAngle = Math.PI * 0.94;
  controls.enabled = false;
  controls.addEventListener('start', () => {
    if (flying) return;
    userMoved = true; controls.autoRotate = false;
    resetBtn.hidden = false; hint.classList.remove('on');
  });
}

// ---------------------------------------------------------------- layout & framing
let W = innerWidth, H = innerHeight, narrow = W <= 860, mode = 'hero';
let free = { x: 0, y: 0, w: W, h: H };
const off = [0, 0], offT = [0, 0];
function layout() {
  W = innerWidth; H = innerHeight;
  narrow = W <= 860;
  document.body.classList.toggle('narrow', narrow);
  if (GL) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, narrow ? 1.75 : 2));
    renderer.setSize(W, H, false);
  }
  const hdr = $('.hdr').offsetHeight;
  if (mode === 'panel') {
    if (!narrow) { const P = panel.offsetWidth; free = { x: P * 0.92, y: hdr, w: W - P * 0.92, h: H - hdr }; }
    else { const S = panel.offsetHeight; free = { x: 0, y: hdr, w: W, h: Math.max(140, H - hdr - S) }; }
  } else {
    if (!narrow) free = { x: W * 0.43, y: 0, w: W * 0.57, h: H };
    else { const hb = $(mode === 'end' ? '#heroEnd' : '#heroIntro').offsetHeight || H * 0.45; free = { x: 0, y: hdr * 0.6, w: W, h: Math.max(160, H - hb - hdr * 0.6) }; }
  }
  document.documentElement.style.setProperty('--sheet-h', (narrow && mode === 'panel' ? panel.offsetHeight : 0) + 'px');
  camera.aspect = W / H;
  offT[0] = W / 2 - (free.x + free.w / 2);
  offT[1] = H / 2 - (free.y + free.h / 2);
}
function computePose(spec) {
  const s = (free.w < 640 && spec.narrow) ? { ...spec, ...spec.narrow } : spec;
  const fov = s.fov ?? 40;
  const t = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const dir = new THREE.Vector3(...s.dir).normalize();
  const dW = (s.frame[0] / 2) / (t * (free.w / H));
  const dH = (s.frame[1] / 2) / (t * (free.h / H));
  const d = Math.max(dW, dH) * (s.margin ?? 1.07);
  const target = new THREE.Vector3(...s.target);
  const pos = target.clone().addScaledVector(dir, d);
  if (pos.y < 0.3) pos.y = 0.3;          // never below the floor
  return { target, pos, fov, d };
}

// ---------------------------------------------------------------- camera flight
let flying = false, userMoved = false, curPose = null;
const _p = new THREE.Vector3(), _t = new THREE.Vector3();
function setCam(p, t, fov) {
  camera.position.copy(p); camera.fov = fov; camera.updateProjectionMatrix();
  if (controls) controls.target.copy(t);
  camera.lookAt(t);
}
function flyTo(pose, dur, done) {
  if (!GL) { done && done(); return; }
  curPose = pose;
  tweens.cancel('cam');
  flying = true; controls.enabled = false; controls.autoRotate = false;
  const p0 = camera.position.clone(), t0 = controls.target.clone(), f0 = camera.fov;
  const n0 = scene.fog.near, x0 = scene.fog.far;
  const n1 = pose.d * 0.8, x1 = pose.d * 3.6 + 4;
  const finish = () => {
    flying = false;
    controls.enabled = true;
    controls.minDistance = pose.d * 0.3; controls.maxDistance = pose.d * 2.4;
    controls.update();
    done && done();
  };
  if (dur <= 0) { setCam(pose.pos, pose.target, pose.fov); scene.fog.near = n1; scene.fog.far = x1; finish(); return; }
  const dist = p0.distanceTo(pose.pos);
  const mid = p0.clone().lerp(pose.pos, 0.5); mid.y += Math.min(dist * 0.15, 3.2);
  tweens.add({
    key: 'cam', dur, ease: E.inOutCubic,
    onUpdate: v => {
      const a = 1 - v;
      _p.set(0, 0, 0).addScaledVector(p0, a * a).addScaledVector(mid, 2 * a * v).addScaledVector(pose.pos, v * v);
      _t.copy(t0).lerp(pose.target, v);
      setCam(_p, _t, lerp(f0, pose.fov, v));
      scene.fog.near = lerp(n0, n1, v); scene.fog.far = lerp(x0, x1, v);
    },
    onDone: finish,
  });
}

// ---------------------------------------------------------------- state (fades + effects)
function resolveState(...objs) {
  const out = {};
  for (const o of objs) {
    if (!o) continue;
    for (const [k, v] of Object.entries(o)) if (k.endsWith(':*')) for (const id of PAD_IDS) out[k.slice(0, -1) + id] = v;
    for (const [k, v] of Object.entries(o)) if (!k.endsWith(':*')) out[k] = v;
  }
  return out;
}
function appearFx(k, delay, late) {
  if (!GL) return;
  const [kind, id] = k.split(':');
  if (kind === 'zone') {
    const z = M.pads[id].zone; z.scale.y = 0.02;
    tweens.add({ key: 'fx:' + k, dur: 0.9, delay, ease: E.outBack, onUpdate: v => (z.scale.y = Math.max(0.02, v)) });
  } else if (kind === 'nog') {
    const g = M.pads[id].nog; g.position.y = -0.42;
    tweens.add({ key: 'fx:' + k, dur: 1.0, delay, ease: E.outCubic, onUpdate: v => (g.position.y = lerp(-0.42, 0, v)) });
  } else if (kind === 'fill') {
    const g = M.pads[id].fill; g.position.y = -0.16;
    tweens.add({ key: 'fx:' + k, dur: 0.8, delay, ease: E.outCubic, onUpdate: v => (g.position.y = lerp(-0.16, 0, v)) });
  } else if (k.startsWith('so_')) {
    const f = F[k]; f.draw(0.001);
    tweens.add({ key: 'fx:' + k, dur: 1.3, delay, ease: E.inOutCubic, onUpdate: v => f.draw(v) });
  } else if (k === 'straightedge') {
    const r = M.se.root; r.position.y = -0.3;
    tweens.add({ key: 'fx:' + k, dur: 0.8, delay, ease: E.outCubic, onUpdate: v => (r.position.y = lerp(-0.3, 0, v)) });
  } else if (k === 'battensCut') {
    M.L.battensCut.root.position.y = 0;
  } else if (k === 'blocking' || k === 'blockShort') {
    // the blocking goes in from the garage side, between the flanges
    const r = M.L[k].root; r.position.z = 0.42;
    tweens.add({ key: 'fx:' + k, dur: 1.5, delay, ease: E.inOutCubic, onUpdate: v => (r.position.z = lerp(0.42, 0, v)) });
  } else if (k === 'springs' || k === 'springCoil') {
    // at the lintel the spring hardware drops into place; elsewhere it simply fades in with the door
    const r = M.L[k].root;
    if (!late) { tweens.cancel('fx:' + k); r.position.y = 0; return; }
    r.position.y = -0.14;
    tweens.add({ key: 'fx:' + k, dur: 1.0, delay, ease: E.outCubic, onUpdate: v => (r.position.y = lerp(-0.14, 0, v)) });
  }
}
function vanishFx(k) {
  if (!GL) return;
  if (k === 'battensCut') {
    const r = M.L.battensCut.root;
    tweens.add({ key: 'fx:' + k, dur: 0.75, ease: E.inOutSine, onUpdate: v => (r.position.y = -0.32 * v) });
  }
}
function settleFx(k, to) {
  if (!GL) return;
  const [kind, id] = k.split(':');
  tweens.cancel('fx:' + k);
  if (kind === 'zone') M.pads[id].zone.scale.y = 1;
  else if (kind === 'nog') M.pads[id].nog.position.y = 0;
  else if (kind === 'fill') M.pads[id].fill.position.y = 0;
  else if (k.startsWith('so_')) F[k].draw(1);
  else if (k === 'straightedge') M.se.root.position.y = 0;
  else if (k === 'battensCut') M.L.battensCut.root.position.y = to > 0.5 ? 0 : -0.32;
  else if (k === 'blocking' || k === 'blockShort') M.L[k].root.position.z = 0;
  else if (k === 'springs' || k === 'springCoil') M.L[k].root.position.y = 0;
}
let firstRun = true;
function applyState(st, flight, instant) {
  if (!GL) return;
  const inDelay = instant ? 0 : firstRun ? 0.3 : Math.max(0.15, flight * 0.5);
  firstRun = false;
  let stagger = 0;
  for (const [k, to] of Object.entries(st)) {
    const f = F[k]; if (!f) continue;
    const from = f.o;
    if (k === 'doorOpen') {
      // a door move still waiting on its delay from the last step must not land in this one
      if (Math.abs(from - to) < 0.002) tweens.cancel('door'); else doorTo(to, instant);
      continue;
    }
    tweens.cancel('f:' + k);              // likewise any fade from the last step that has not started yet
    if (Math.abs(from - to) < 0.002) { if (instant) settleFx(k, to); continue; }
    const appearing = from < 0.02 && to > 0.02, vanishing = to < 0.02 && from > 0.02;
    const padKind = /^(zone|nog|fill):/.test(k);
    // at the lintel, the blocking and spring hardware go in once the camera has landed, so the move reads
    const late = /^(blocking|blockShort)$/.test(k) || (/^(springs|springCoil)$/.test(k) && (st.lintel ?? 0) > 0.5);
    const delay = instant ? 0 : appearing ? (late ? flight + 0.2 : inDelay) + (padKind ? (stagger += 0.1) : 0) : 0;
    const dur = instant ? 0 : appearing ? 0.85 : 0.6;
    tweens.add({ key: 'f:' + k, dur, delay, ease: E.inOutSine, onUpdate: v => f.set(lerp(from, to, v)) });
    if (instant) settleFx(k, to);
    else if (appearing) appearFx(k, delay, late);
    else if (vanishing) vanishFx(k);
  }
}
let doorCfg = null;
function doorTo(to, instant) {
  const f = F.doorOpen, from = f.o;
  if (instant) { tweens.cancel('door'); f.set(to); return; }
  const opening = to > from;
  const delay = opening ? (doorCfg?.delay ?? 0.4) + (lastFlight || 0) : 0;
  const dur = opening ? (doorCfg?.dur ?? 3) : 1.2;
  tweens.add({ key: 'door', dur, delay, ease: E.inOutSine, onUpdate: v => f.set(lerp(from, to, v)) });
}

// ---------------------------------------------------------------- overlays (labels, dimensions)
const OL = { labels: [], dims: [], token: 0, timer: 0 };
const _v = new THREE.Vector3();
function toScreen(v) {
  _v.copy(v).project(camera);
  if (_v.z > 1 || _v.z < -1) return null;
  return { x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H };
}
function mkDim(d) {
  const g = svgEl('g', { class: 'dim' });
  const exts = (d.ext || []).map(() => svgEl('line', { class: 'ex' }));
  const line = svgEl('line', { class: 'dl' }), t1 = svgEl('line', { class: 'tk' }), t2 = svgEl('line', { class: 'tk' });
  const text = svgEl('text'); text.textContent = d.text.toUpperCase();
  exts.forEach(e => g.appendChild(e)); g.append(line, t1, t2, text);
  dimsEl.appendChild(g);
  return {
    d, g, line, t1, t2, text, exts, p: 0,
    a: new THREE.Vector3(...d.a), b: new THREE.Vector3(...d.b),
    ev: (d.ext || []).map(([p, q]) => [new THREE.Vector3(...p), new THREE.Vector3(...q)]),
  };
}
function buildOverlays(ch, si, delay, atShift = 0, timed = true) {
  const token = ++OL.token;
  clearTimeout(OL.timer);
  labelsEl.classList.remove('on'); dimsEl.classList.remove('on');
  labelsEl.innerHTML = ''; dimsEl.innerHTML = '';
  if (!GL) return;
  const sub = ch.subs ? ch.subs[si] : null;
  const L = [...(ch.labels || []), ...((sub && sub.labels) || [])];
  const Ds = [...(ch.dims || []), ...((sub && sub.dims) || [])];
  OL.labels = L.map((d0, i) => {
    const d = narrow && d0.n ? { ...d0, ...d0.n } : d0;   // phone placement: may move the anchor as well as the offset
    const el = document.createElement('div');
    el.className = 'lbl ' + (d.cls || '');
    el.innerHTML = d.html || esc(d.text);
    // labels with "at" appear in step with the animation they describe (seconds after the shot settles)
    const td = (timed && d.at !== undefined && !REDUCED ? Math.max(0, d.at + atShift) : 0) + i * 0.05;
    el.style.transitionDelay = td + 's';
    if (d.pad) { el.dataset.pad = d.pad; el.setAttribute('role', 'button'); el.tabIndex = -1; }
    labelsEl.appendChild(el);
    let ld = null;
    if ((d.dx || d.dy) && !d.noLeader) {
      ld = svgEl('line', { class: 'leader' }); const dot = svgEl('circle', { r: 2.2, class: 'ldot' });
      ld.style.transitionDelay = dot.style.transitionDelay = td + 's';
      dimsEl.appendChild(ld); dimsEl.appendChild(dot); ld.dot = dot;
    }
    const lab = { d, el, ld, v: new THREE.Vector3(...d.p) };
    // labels that ride on a moving part of a section close-up (the hanger bracket, the lining plug, the jamb's track)
    if (d.follow && DET) { const src = DET.groups[d.follow] ? DET : JMB; lab.local = lab.v.clone().sub(src.origin); lab.obj = src.groups[d.follow]; }
    return lab;
  });
  OL.dims = Ds.map(mkDim);
  const show = () => {
    if (token !== OL.token) return;
    labelsEl.classList.add('on'); dimsEl.classList.add('on');
    OL.dims.forEach((D, i) => tweens.add({ key: 'dim' + i, dur: 0.85, delay: i * 0.05, ease: E.outCubic, onUpdate: v => (D.p = v) }));
  };
  if (delay <= 0) show(); else OL.timer = setTimeout(show, delay * 1000);
}
function placeTick(el, x, y, ux, uy) {
  const c = Math.SQRT1_2, tx = (c * ux - c * uy) * 5, ty = (c * ux + c * uy) * 5;
  el.setAttribute('x1', x - tx); el.setAttribute('y1', y - ty); el.setAttribute('x2', x + tx); el.setAttribute('y2', y + ty);
}
function drawDim(D) {
  const a = toScreen(D.a), b = toScreen(D.b);
  if (!a || !b || D.p <= 0.001) { D.g.style.display = 'none'; return; }
  D.g.style.display = '';
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const p = D.p, bx = a.x + dx * p, by = a.y + dy * p;
  D.line.setAttribute('x1', a.x); D.line.setAttribute('y1', a.y); D.line.setAttribute('x2', bx); D.line.setAttribute('y2', by);
  placeTick(D.t1, a.x, a.y, ux, uy);
  if (p > 0.97) { D.t2.style.display = ''; placeTick(D.t2, b.x, b.y, ux, uy); } else D.t2.style.display = 'none';
  D.ev.forEach(([q, r], i) => {
    const s = toScreen(q), e = toScreen(r), el = D.exts[i];
    if (!s || !e) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.setAttribute('x1', s.x); el.setAttribute('y1', s.y); el.setAttribute('x2', s.x + (e.x - s.x) * p); el.setAttribute('y2', s.y + (e.y - s.y) * p);
  });
  let ang = Math.atan2(uy, ux) * 180 / Math.PI, flip = 1;
  if (ang > 90.5) { ang -= 180; flip = -1; } else if (ang <= -89.5) { ang += 180; flip = -1; }
  const side = (D.d.side ?? -1) * flip;
  const nx = -uy * side, ny = ux * side;
  const short = len < D.text.textContent.length * 6.6 + 10;
  const off = short ? 16 : 9;
  const mx = (a.x + b.x) / 2 + nx * off, my = (a.y + b.y) / 2 + ny * off;
  D.text.setAttribute('transform', `translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})`);
  D.text.style.opacity = clamp((p - 0.55) / 0.45, 0, 1);
}
function updateOverlays() {
  const fx0 = free.x, fx1 = free.x + free.w, fy0 = Math.max(free.y, 50), fy1 = free.y + free.h;
  for (const L of OL.labels) {
    if (L.obj) L.v.copy(L.local).applyMatrix4(L.obj.matrixWorld);
    const s = toScreen(L.v);
    const out = !s || s.x < fx0 - 30 || s.x > fx1 + 30 || s.y < fy0 - 30 || s.y > fy1 + 30;
    if (out) { L.el.style.visibility = 'hidden'; if (L.ld) { L.ld.style.display = 'none'; L.ld.dot.style.display = 'none'; } continue; }
    if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
    let x = s.x + (L.d.dx || 0), y = s.y + (L.d.dy || 0);
    x = clamp(x, fx0 + L.w / 2 + 6, fx1 - L.w / 2 - 6);
    y = clamp(y, fy0 + L.h / 2 + 4, fy1 - L.h / 2 - 4);
    L.el.style.visibility = '';
    L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    if (L.ld) {
      L.ld.style.display = ''; L.ld.dot.style.display = '';
      L.ld.setAttribute('x1', s.x); L.ld.setAttribute('y1', s.y); L.ld.setAttribute('x2', x); L.ld.setAttribute('y2', y);
      L.ld.dot.setAttribute('cx', s.x); L.ld.dot.setAttribute('cy', s.y);
    }
  }
  for (const D of OL.dims) drawDim(D);
}

// ---------------------------------------------------------------- viewfinder (hold point)
const FINDER = { on: false, i: 0, t: 0, order: ['L1', 'L2', 'A', 'M', 'R2', 'R1'] };
const _c = new THREE.Vector3();
function finderTick(dt) {
  if (!FINDER.on || !GL) return;
  FINDER.t += dt;
  if (FINDER.t > 2.1) {
    FINDER.t = 0; FINDER.i = (FINDER.i + 1) % FINDER.order.length;
    if (!REDUCED) { flashEl.classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => flashEl.classList.remove('on'))); }
  }
  const p = PADS_BY[FINDER.order[FINDER.i]];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ok = true;
  for (const x of [p.xMin, p.xMax]) for (const z of [p.z1, p.z2]) {
    _c.set(x, K.Y_LIN, z); const s = toScreen(_c);
    if (!s) { ok = false; break; }
    x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
  }
  if (!ok) return;
  const m = 14;
  x0 = Math.max(x0, free.x + 8 + m); y0 = Math.max(y0, free.y + 30 + m);
  x1 = Math.min(x1, free.x + free.w - 8 - m); y1 = Math.min(y1, free.y + free.h - 8 - m);
  finderEl.style.left = (x0 - m) + 'px'; finderEl.style.top = (y0 - m) + 'px';
  finderEl.style.width = (x1 - x0 + 2 * m) + 'px'; finderEl.style.height = (y1 - y0 + 2 * m) + 'px';
  const lbl = `${p.id} · photo ${FINDER.i + 1} of 6`;
  if (finderEl.dataset.l !== lbl) { finderEl.dataset.l = lbl; $('span', finderEl).textContent = lbl; }
}
function setFinder(on) {
  FINDER.on = on && GL; FINDER.t = 0; FINDER.i = 0;
  finderEl.classList.toggle('on', FINDER.on);
}

// ---------------------------------------------------------------- light / dark
const THEME_KEY = 'tower-guide-theme';
const THEME_CSS_BG = { dark: '#000000', light: '#EFEEEA' };
let THEME = null;
const fadeEl = $('#themefade');
function applyThemeNow(name) {
  THEME = name;
  document.documentElement.dataset.theme = name;
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = THEME_CSS_BG[name];
  $$('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === name)));
  if (GL) {
    renderer.setClearColor(THEME_BG[name], 1);
    scene.fog.color.setHex(THEME_BG[name]);
    applyTheme(scene, TEX, name);
    TK.dust = name === 'light' ? 0 : 1;
    TK.halo = name === 'light' ? 0.6 : 1;
    TK.gamma.walls = name === 'light' ? 2.2 : 1;
    // re-apply every fade at its current value so the new multipliers take effect
    for (const k of Object.keys(F)) if (k !== 'doorOpen' && k !== 'detail') F[k].set(F[k].o);
    F.detail.set(F.detail.o);
  }
}
function setTheme(name, save = true) {
  if (name !== 'light' && name !== 'dark') return;
  if (save) { try { localStorage.setItem(THEME_KEY, name); } catch (e) { /* storage unavailable */ } }
  if (name === THEME) return;
  if (REDUCED || !fadeEl) { applyThemeNow(name); return; }
  // a quick fade through the new background so the whole page changes at once
  fadeEl.style.background = THEME_CSS_BG[name];
  fadeEl.classList.add('on');
  setTimeout(() => { applyThemeNow(name); requestAnimationFrame(() => requestAnimationFrame(() => fadeEl.classList.remove('on'))); }, 230);
}
function initialTheme() {
  const q = new URLSearchParams(location.search).get('theme');
  if (q === 'light' || q === 'dark') return q;
  try { const v = localStorage.getItem(THEME_KEY); if (v === 'light' || v === 'dark') return v; } catch (e) { /* storage unavailable */ }
  return 'dark';
}

// ---------------------------------------------------------------- hanger fixing (section close-up)
// The bracket rises tight to the lining, then each screw is driven up through it. 'gap': the lining is pulled
// up into the open batten cavity. 'pull': nothing solid to bite, and under the door load the fixing pulls through.
const FIX_T = { rise: 0.8, d0: 1.0, d1: 2.2, drive: 1.1, done: 3.3, gap: 2.95, gapDur: 0.75, pull: 4.0, pullDur: 1.1 };
const FIX_KEYS = ['fx:out', 'fx:rise', 'fx:d0', 'fx:d1', 'fx:fail'];
function runFix(kind, delay, instant, variant) {
  // returns when (seconds from now) the take starts, so timed labels can follow it; null if nothing runs
  if (!GL) return null;
  const X = DET.FIX, upd = () => DET.applyFix();
  FIX_KEYS.forEach(k => tweens.cancel(k));
  const mode = kind === 'gap' ? 'gap' : kind === 'pull' ? 'pull' : 'ok';
  const setVariant = () => { if (variant) DET.variants[variant](); };
  const fixed = X.mode === 'ok' && X.rise > 0.999 && X.d[0] > 0.999 && X.d[1] > 0.999 && X.fail < 0.001;
  if (instant || REDUCED) {
    setVariant(); X.mode = mode; X.rise = 1; X.d = [1, 1]; X.fail = mode === 'ok' ? 0 : 1; upd();
    return null;
  }
  if (kind === 'load' && fixed) { setVariant(); return null; }
  let t0 = delay;
  if (X.rise > 0.02 || X.d[0] > 0.02 || X.fail > 0.02) {
    // clear the last take: the bracket and screws drop away, the lining settles back
    const r0 = X.rise, a0 = X.d[0], b0 = X.d[1], f0 = X.fail;
    tweens.add({
      key: 'fx:out', dur: 0.45, ease: E.inOutSine,
      onUpdate: v => { X.rise = r0 * (1 - v); X.d = [a0 * (1 - v), b0 * (1 - v)]; X.fail = f0 * (1 - v); upd(); },
      onDone: () => { setVariant(); X.mode = mode; X.fail = 0; upd(); },
    });
    t0 = Math.max(delay, 0.55);
  } else { setVariant(); X.mode = mode; X.rise = 0; X.d = [0, 0]; X.fail = 0; upd(); }
  tweens.add({ key: 'fx:rise', dur: FIX_T.rise, delay: t0, ease: E.outCubic, onUpdate: v => { X.rise = v; upd(); } });
  [0, 1].forEach(i => tweens.add({ key: 'fx:d' + i, dur: FIX_T.drive, delay: t0 + FIX_T['d' + i], ease: E.inOutSine, onUpdate: v => { X.d[i] = v; upd(); } }));
  if (mode === 'gap') tweens.add({ key: 'fx:fail', dur: FIX_T.gapDur, delay: t0 + FIX_T.gap, ease: E.inOutCubic, onUpdate: v => { X.fail = v; upd(); } });
  if (mode === 'pull') tweens.add({ key: 'fx:fail', dur: FIX_T.pullDur, delay: t0 + FIX_T.pull, ease: E.give, onUpdate: v => { X.fail = v; upd(); } });
  // the load take re-runs the fixing first, so its labels follow once the screws are home
  return kind === 'load' ? t0 + FIX_T.done : t0;
}

// ---------------------------------------------------------------- track fixing (jamb section close-up)
// The track and its angle are offered up to the wall and the screw is driven into the side room. 'narrow': the screw
// holds only the lining and the track pulls away. 'obstruct': the angle stops on a conduit and can't sit flat.
const JFIX_T = { in: 0.9, d: 1.05, drive: 1.1, done: 2.2, fail: 3.2, failDur: 1.1 };
const JFIX_KEYS = ['jx:out', 'jx:back', 'jx:in', 'jx:d', 'jx:fail'];
function runJamb(kind, delay, instant) {
  if (!GL) return null;
  const X = JMB.J, upd = () => JMB.apply();
  JFIX_KEYS.forEach(k => tweens.cancel(k));
  if (instant || REDUCED) {
    JMB.variant(kind); X.in = 1; X.d = 1; X.fail = kind === 'narrow' ? 1 : 0; upd();
    return null;
  }
  let t0 = delay;
  if (F.jamb.o > 0.02 && (X.in < 0.999 || X.d > 0.02 || X.fail > 0.02 || X.mode === 'obstruct')) {
    // clear the last take: the screw backs out and the track is lifted away; the section dips while the wall changes
    const i0 = X.in, d0 = X.d, f0 = X.fail, o0 = F.jamb.o, dip = X.mode !== kind;
    if (dip) tweens.cancel('f:jamb');      // the dip takes over the section's fade, and brings it back to full
    tweens.add({
      key: 'jx:out', dur: 0.5, ease: E.inOutSine,
      onUpdate: v => { X.in = i0 * (1 - v); X.d = d0 * (1 - v); X.fail = f0 * (1 - v); if (dip) F.jamb.set(lerp(o0, 0.2, v)); else upd(); },
      onDone: () => {
        JMB.variant(kind); X.fail = 0; upd();
        if (dip) tweens.add({ key: 'jx:back', dur: 0.5, ease: E.inOutSine, onUpdate: v => F.jamb.set(lerp(0.2, 1, v)) });
      },
    });
    t0 = Math.max(delay, 1.0);
  } else { JMB.variant(kind); X.in = 0; X.d = 0; X.fail = 0; upd(); }
  tweens.add({ key: 'jx:in', dur: JFIX_T.in, delay: t0, ease: E.outCubic, onUpdate: v => { X.in = v; upd(); } });
  if (kind !== 'obstruct') tweens.add({ key: 'jx:d', dur: JFIX_T.drive, delay: t0 + JFIX_T.d, ease: E.inOutSine, onUpdate: v => { X.d = v; upd(); } });
  if (kind === 'narrow') tweens.add({ key: 'jx:fail', dur: JFIX_T.failDur, delay: t0 + JFIX_T.fail, ease: E.give, onUpdate: v => { X.fail = v; upd(); } });
  return t0;
}

// ---------------------------------------------------------------- pad card
let selectedPad = null;
function showPadCard(id) {
  const p = PADS_BY[id]; if (!p) return;
  selectedPad = id;
  padCard.innerHTML = `
    <button class="x" data-act="closecard" aria-label="Close">×</button>
    <div class="pc-top"><span class="pc-id">${p.id}</span><span class="pc-pos">${esc(p.pos)}</span></div>
    <dl>
      <dt>From back of opening</dt><dd>${p.from} mm</dd>
      <dt>Across the opening</dt><dd>${esc(p.across.replace(/(\d+)/g, '$1 mm'))}</dd>
      <dt>Minimum size</dt><dd class="o">${p.size} mm</dd>
    </dl>
    ${p.note ? `<p class="pc-note">${esc(p.note)}</p>` : ''}`;
  padCard.classList.add('on');
}
function hidePadCard() { selectedPad = null; padCard.classList.remove('on'); }

// ---------------------------------------------------------------- chapters / navigation
let cur = { ci: -1, si: 0, ch: null };
let lastFlight = 0;
const checks = { position: false, size: false, flush: false, structure: false };

prog.innerHTML = CHAPTERS.map((c, i) => c.num ? `<button class="seg" data-go="${i}" aria-label="Step ${pad2(c.num)}: ${esc(c.nav)}"><i></i><span>${pad2(c.num)}</span><em>${esc(c.nav)}</em></button>` : '').join('');
mprog.innerHTML = CHAPTERS.filter(c => c.num).map(() => '<i></i>').join('');

function setMode(m) {
  if (m === mode) return;
  mode = m;
  document.body.dataset.mode = m;
  layout();
}
function renderPanel(ch) {
  panelIn.classList.remove('in');
  panelIn.innerHTML = ch.html || '';
  const em = $('.sl em', panelIn);
  if (em && ch.num) em.insertAdjacentHTML('afterend', `<span class="of">/ ${pad2(STEP_COUNT)}</span>`);
  const subsEl = $('[data-subs]', panelIn);
  if (subsEl && ch.subs) {
    subsEl.innerHTML = `<div class="chips">${ch.subs.map((s, i) => `<button class="t-chip" data-sub="${i}" aria-pressed="false"><span>${String.fromCharCode(97 + i)}</span>${esc(s.chip)}</button>`).join('')}</div>
      <div class="subcard"><div class="sub-k"></div><div class="sub-t"></div><div class="sub-d"></div></div>`;
  }
  $$('[data-chk]', panelIn).forEach(inp => { inp.checked = !!checks[inp.dataset.chk]; });
  const mail = $('[data-mail]', panelIn);
  if (mail) {
    const body = 'Site address:\nBuilder:\nTower job or quote number:\n\nAttached:\n- Photos of pads L1, L2, R1, R2, M and A, each with tapes to the setout and a straightedge across it\n- Truss designer\'s sign-off for the door loads and the nogging detail\n';
    mail.href = `mailto:sales@towerdoors.com.au?subject=${encodeURIComponent('Ceiling pads ready for review')}&body=${encodeURIComponent(body)}`;
  }
  updateReady();
  const beamBtn = $('[data-act="beam"]', panelIn);
  if (beamBtn && GL) beamBtn.textContent = M.lintel.profile === 'I' ? 'Show a U-beam' : 'Show an I-beam';
  panelScroll.scrollTop = 0;
  void panelIn.offsetWidth;
  panelIn.classList.add('in');
}
function renderSub(ch, si) {
  const s = ch.subs[si];
  $$('[data-sub]', panelIn).forEach((b, i) => b.setAttribute('aria-pressed', String(i === si)));
  const card = $('.subcard', panelIn); if (!card) return;
  card.classList.remove('in');
  $('.sub-k', card).innerHTML = `<span>${String.fromCharCode(97 + si)}</span>${s.tag ? `<em class="tag ${s.tag}">${s.tagText || (s.tag === 'ok' ? 'Do this' : 'Not acceptable')}</em>` : ''}`;
  $('.sub-t', card).textContent = s.title;
  $('.sub-d', card).textContent = s.text;
  card.classList.toggle('bad', s.tag === 'bad');
  $$('[data-for-subs]', panelIn).forEach(el => { el.hidden = !el.dataset.forSubs.split(',').map(Number).includes(si); });
  void card.offsetWidth; card.classList.add('in');
  const chip = $(`[data-sub="${si}"]`, panelIn);
  if (chip && chip.parentElement.scrollWidth > chip.parentElement.clientWidth) chip.parentElement.scrollTo({ left: chip.offsetLeft - 16, behavior: REDUCED ? 'auto' : 'smooth' });
}
function updateNav() {
  const ch = cur.ch;
  $$('.seg', prog).forEach(b => {
    const i = +b.dataset.go;
    b.classList.toggle('on', i === cur.ci); b.classList.toggle('done', i < cur.ci);
  });
  $$('i', mprog).forEach((el, i) => { el.className = (i + 1 < (ch.num || 0)) ? 'done' : (i + 1 === ch.num ? 'on' : ''); });
  if (ch.num) { pstep.textContent = `Step ${pad2(ch.num)} / ${pad2(STEP_COUNT)}`; pname.textContent = ch.nav; }
  let lbl = 'Next step';
  if (ch.subs && cur.si < ch.subs.length - 1) lbl = 'Next';
  else if (CHAPTERS[cur.ci + 1] && CHAPTERS[cur.ci + 1].end) lbl = 'Finish';
  nextLbl.textContent = lbl;
}
function updateReady() {
  const r = $('[data-ready]', panelIn); if (!r) return;
  const all = Object.values(checks).every(Boolean);
  r.hidden = !all;
  if (all) { r.classList.remove('in'); void r.offsetWidth; r.classList.add('in'); }
}

function go(ci, si = 0, opt = {}) {
  ci = clamp(ci, 0, CHAPTERS.length - 1);
  const ch = CHAPTERS[ci];
  si = ch.subs ? clamp(si, 0, ch.subs.length - 1) : 0;
  const chChanged = ci !== cur.ci;
  const instant = !!opt.instant;
  if (!chChanged && si === cur.si && !opt.force) return;
  cur = { ci, si, ch };
  hidePadCard();
  userMoved = false; resetBtn.hidden = true;
  document.body.dataset.ch = ch.id;

  setMode(ch.hero ? 'hero' : ch.end ? 'end' : 'panel');
  if (chChanged && !ch.hero && !ch.end) renderPanel(ch);
  if (ch.subs) {
    renderSub(ch, si);
    if (!chChanged && narrow) {
      // bring the sub-step chips to the top of the sheet (measured within the scrolling area, not the sheet)
      const sc = $('.subs', panelIn);
      if (sc) {
        const top = sc.getBoundingClientRect().top - panelScroll.getBoundingClientRect().top + panelScroll.scrollTop;
        panelScroll.scrollTo({ top: Math.max(0, top - 8), behavior: REDUCED ? 'auto' : 'smooth' });
      }
    }
  }
  if (!ch.hero && !ch.end) updateNav();

  // camera
  const spec = (ch.subs && ch.subs[si].cam) || ch.cam;
  layout();
  const pose = computePose(spec);
  let dur = 0;
  if (!instant && GL) {
    const dist = camera.position.distanceTo(pose.pos);
    dur = REDUCED ? 0.35 : opt.long ? 3.6 : clamp(1.15 + dist * 0.085, 1.2, 2.6);
  }
  lastFlight = dur;
  doorCfg = ch.door || null;
  flyTo(pose, dur, () => {
    if (ch.auto && !REDUCED && cur.ch === ch) controls.autoRotate = true;
    if (!ch.hero && !ch.end && !hintShown && !instant && GL) { hintShown = true; hint.classList.add('on'); setTimeout(() => hint.classList.remove('on'), 4200); }
  });

  // state + detail variants
  const sub = ch.subs ? ch.subs[si] : null;
  const st = resolveState(DEFAULT_STATE, ch.state, sub && sub.state);
  applyState(st, dur, instant);
  const showAt = instant ? 0 : dur * 0.8;
  let atShift = 0;
  if (GL && sub && sub.fix) {
    const t0 = runFix(sub.fix, Math.max(0.3, dur * 0.85), instant, sub.variant);
    if (t0 !== null) atShift = t0 - showAt;
  } else if (GL && sub && sub.variant) DET.variants[sub.variant]();
  if (GL && sub && sub.jamb) {
    const t0 = runJamb(sub.jamb, Math.max(0.3, dur * 0.85), instant);
    if (t0 !== null) atShift = t0 - showAt;
  } else if (GL) JFIX_KEYS.forEach(k => tweens.cancel(k));     // leaving the jamb close-up: let it fade out undisturbed

  buildOverlays(ch, si, showAt, atShift, !instant);
  setFinder(!!ch.finder);
  if (instant) { tweens.finish(); off[0] = offT[0]; off[1] = offT[1]; }

  const hash = ch.num ? '#step-' + ch.num : ch.end ? '#end' : '#';
  try { history.replaceState(null, '', hash === '#' ? location.pathname + location.search : hash); } catch (e) { /* file:// in some browsers */ }
}
let hintShown = false;
function next() {
  const { ch, ci, si } = cur;
  if (ch.hero) return go(1);
  if (ch.end) return go(0, 0, { long: true });
  if (ch.subs && si < ch.subs.length - 1) return go(ci, si + 1);
  go(ci + 1, 0);
}
function back() {
  const { ch, ci, si } = cur;
  if (ch.hero) return;
  if (ch.subs && si > 0) return go(ci, si - 1);
  const prev = CHAPTERS[ci - 1];
  go(ci - 1, prev && prev.subs ? prev.subs.length - 1 : 0);
}

// ---------------------------------------------------------------- events
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-go],[data-sub],[data-pad],[data-theme-set]');
  if (!t) return;
  if (t.dataset.themeSet) return setTheme(t.dataset.themeSet);
  if (t.dataset.go !== undefined) return go(+t.dataset.go);
  if (t.dataset.sub !== undefined) return go(cur.ci, +t.dataset.sub);
  if (t.dataset.pad) return showPadCard(t.dataset.pad);
  const a = t.dataset.act;
  if (a === 'start') go(1);
  else if (a === 'restart') go(0, 0, { long: true });
  else if (a === 'next') next();
  else if (a === 'back') back();
  else if (a === 'schedule') drawer.classList.add('open');
  else if (a === 'closedrawer') drawer.classList.remove('open');
  else if (a === 'closecard') hidePadCard();
  else if (a === 'door' && GL) {
    tweens.cancel('door');
    const f = F.doorOpen;
    const from = f.o, to = from > 0.5 ? 0 : 1;
    tweens.add({ key: 'door', dur: to ? 3.2 : 1.6, ease: E.inOutSine, onUpdate: v => f.set(lerp(from, to, v)) });
    t.textContent = to ? 'Close the door' : 'Open the door';
  } else if (a === 'beam' && GL) {
    // swap the lintel between an I-beam and a U-beam: the steel and blocking dip, change, and come back
    const next = M.lintel.profile === 'I' ? 'U' : 'I';
    const keys = ['lintel', 'blocking', 'blockShort'].filter(k => F[k].o > 0.01), from = keys.map(k => F[k].o);
    tweens.add({
      key: 'beamdip', dur: 0.28, ease: E.inOutSine, onUpdate: v => keys.forEach((k, i) => F[k].set(from[i] * (1 - 0.85 * v))),
      onDone: () => {
        M.lintel.setProfile(next);
        tweens.add({ key: 'beamdip', dur: 0.45, ease: E.inOutSine, onUpdate: v => keys.forEach((k, i) => F[k].set(from[i] * (0.15 + 0.85 * v))) });
      },
    });
    t.textContent = next === 'I' ? 'Show a U-beam' : 'Show an I-beam';
  } else if (a === 'replayfix' && GL) {
    const ch = cur.ch, s = ch.subs && ch.subs[cur.si];
    if (!s || !(s.fix || s.jamb)) {           // from the overview, go to the first fixing take
      const k = ch.subs ? ch.subs.findIndex(x => x.fix || x.jamb) : -1;
      if (k >= 0) go(cur.ci, k);
      return;
    }
    if (s.jamb) { buildOverlays(ch, cur.si, 0, runJamb(s.jamb, 0.15, false) ?? 0); return; }
    const t0 = runFix(s.fix === 'load' ? 'ok' : s.fix, 0.15, false, s.variant);
    buildOverlays(ch, cur.si, 0, (t0 ?? 0) + (s.fix === 'load' ? FIX_T.done : 0));
  } else if (a === 'sheet') {
    panel.classList.toggle('collapsed');
    setTimeout(() => { layout(); if (curPose && !userMoved) flyTo(computePose((cur.ch.subs && cur.ch.subs[cur.si].cam) || cur.ch.cam), 0.6); }, 460);
  }
});
nextBtn.addEventListener('click', next);
backBtn.addEventListener('click', back);
resetBtn.addEventListener('click', () => {
  userMoved = false; resetBtn.hidden = true;
  const spec = (cur.ch.subs && cur.ch.subs[cur.si].cam) || cur.ch.cam;
  flyTo(computePose(spec), 1.0, () => { if (cur.ch.auto && !REDUCED) controls.autoRotate = true; });
});
panelIn.addEventListener('change', e => {
  const inp = e.target.closest('[data-chk]'); if (!inp) return;
  checks[inp.dataset.chk] = inp.checked; updateReady();
});
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); back(); }
  else if (e.key === 'Escape') { drawer.classList.remove('open'); hidePadCard(); }
});
let sw = null;
panel.addEventListener('touchstart', e => { const t = e.touches[0]; sw = { x: t.clientX, y: t.clientY }; }, { passive: true });
panel.addEventListener('touchend', e => {
  if (!sw) return; const t = e.changedTouches[0]; const dx = t.clientX - sw.x, dy = t.clientY - sw.y; sw = null;
  if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.7) (dx < 0 ? next : back)();
}, { passive: true });

// pad picking
if (GL) {
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
    if (moved > 6) return;
    ndc.set(e.clientX / W * 2 - 1, -(e.clientY / H) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const objs = [];
    for (const id of PAD_IDS) {
      const o = M.pads[id];
      if (o.zone.visible && o.zoneF.o > 0.5) objs.push(o.zoneMesh);
      if (o.nog.visible && o.nogF.o > 0.5) objs.push(o.nogMesh);
    }
    const hit = ray.intersectObjects(objs, false)[0];
    if (hit) showPadCard(hit.object.userData.padId); else hidePadCard();
  });
}

let rz = 0;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    layout();
    if (cur.ch && !userMoved && GL) flyTo(computePose((cur.ch.subs && cur.ch.subs[cur.si].cam) || cur.ch.cam), 0.35, () => { if (cur.ch.auto && !REDUCED) controls.autoRotate = true; });
  }, 120);
});

// ---------------------------------------------------------------- schedule drawer content
$('#schedBody').innerHTML = PADS.map(p => `<tr><td class="k">${p.id}</td><td>${esc(p.pos)}</td><td>${p.from}</td><td class="dd">${esc(p.across)}</td><td class="r o">${p.size}</td></tr>`).join('');

// ---------------------------------------------------------------- loop
let last = performance.now(), time = 0;
function tick(dt) {
  time += dt;
  if (!GL) return;
  if (F.straightedge.o > 0.01) M.se.root.position.x = -2.7 + 0.42 * Math.sin(time * 0.75);
  const pulseOn = cur.ch && cur.ch.id === 'why' && F.doorOpen.o > 0.97;
  PAD_IDS.forEach((id, i) => {
    const o = M.pads[id], sel = selectedPad === id;
    const pulse = pulseOn ? 0.32 * (0.5 + 0.5 * Math.sin(time * 2.4 - i * 0.8)) : 0;
    const s = sel ? 0.5 + 0.22 * Math.sin(time * 5) : 0;
    o.zoneMat.emissiveIntensity = 0.22 + pulse + s;
    o.nogMat.emissiveIntensity = 0.1 + s;
    o.fillMat.emissiveIntensity = (cur.ch && cur.ch.id === 'build' && cur.si === 2) ? 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 4)) : 0.12;
  });
  if (F.hangerHL.o > 0.003) {
    const p = 0.5 + 0.5 * Math.sin(time * 3.2), [hm, hl] = F.hangerHL.mats;
    hm.opacity = (0.05 + 0.1 * p) * F.hangerHL.o; hl.opacity = (0.45 + 0.55 * p) * F.hangerHL.o;
  }
  if (F.detail.o > 0.003) {
    const sub = cur.ch && cur.ch.subs && cur.ch.subs[cur.si];
    const g = sub && sub.fix === 'load' ? 0.85 + 0.45 * Math.sin(time * 3.4) : 0.95 + 0.12 * Math.sin(time * 2.2);
    if (Math.abs(DET.FIX.glow - g) > 0.002) { DET.FIX.glow = g; DET.applyFix(); }
  }
  if (F.jamb.o > 0.003) {
    const g = 0.95 + 0.12 * Math.sin(time * 2.2);
    if (Math.abs(JMB.J.glow - g) > 0.002) { JMB.J.glow = g; JMB.apply(); }
  }
  finderTick(dt);
  M.dust.update(time);
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  tweens.update(dt);
  tick(dt);
  if (GL) {
    const k = 1 - Math.exp(-dt * 6);
    for (const i of [0, 1]) off[i] = Math.abs(offT[i] - off[i]) < 0.25 ? offT[i] : off[i] + (offT[i] - off[i]) * k;
    camera.setViewOffset(W, H, off[0], off[1], W, H);
    if (!flying && controls.enabled) controls.update();
    renderer.render(scene, camera);
    updateOverlays();
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- start
function start() {
  applyThemeNow(initialTheme());
  document.body.dataset.mode = 'hero';
  layout();
  off[0] = offT[0]; off[1] = offT[1];
  const m = /^#(?:step-(\d+)|(end))$/.exec(location.hash);
  if (GL) {
    // opening shot: begin high and wide, then settle on the hero framing
    const p = computePose(CHAPTERS[0].cam);
    const far = p.target.clone().add(p.pos.clone().sub(p.target).multiplyScalar(2.1)); far.y += 6;
    setCam(far, p.target, 30);
    scene.fog.near = 30; scene.fog.far = 90;
  }
  if (m) {
    const idx = m[2] ? CHAPTERS.length - 1 : CHAPTERS.findIndex(c => c.num === +m[1]);
    go(idx >= 0 ? idx : 0, 0, { instant: true });
  } else {
    go(0, 0, { long: true });
  }
  requestAnimationFrame(t => { last = t; frame(t); });
  requestAnimationFrame(() => document.body.classList.add('ready'));
}

// test hook (used for screenshots)
window.__guide = {
  go: (c, s = 0) => { go(c, s, { instant: true, force: true }); tweens.finish(); },
  count: CHAPTERS.length,
  cur: () => ({ ci: cur.ci, si: cur.si, id: cur.ch && cur.ch.id }),
  gl: GL,
  probe: () => ({ M, DET, JMB, F, THREE, FIX_T, JFIX_T, camera, controls, scene, renderer, tweens }),
  theme: n => applyThemeNow(n),
  cam: spec => { layout(); flyTo(computePose(spec), 0); },
};

start();
