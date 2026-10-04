// Film renderer for the truss-roof ceiling fixing guide.
// Deterministic: every frame is a pure result of stepping a virtual clock at 1/FPS,
// so any frame range can be rendered independently (fast-forwarding from frame 0).
import * as THREE from 'three';
import { buildModel, buildDetail, buildJamb, makeTextures, PADS, K, DOOR_TRAVEL } from './model.js';
import { CHAPTERS, DEFAULT_STATE } from './chapters.js';

const FPS = 30, DT = 1 / FPS, W = 1920, H = 1080, LS = 1.55;
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
  linear: t => t,
  give: t => (t < 0.35 ? 0.07 * Math.sin((t / 0.35) * Math.PI / 2) : 0.07 + 0.93 * (1 - Math.pow(1 - (t - 0.35) / 0.65, 3))),
};
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const PAD_IDS = PADS.map(p => p.id);
const PADS_BY = Object.fromEntries(PADS.map(p => [p.id, p]));
const CH = Object.fromEntries(CHAPTERS.map(c => [c.id, c]));
const STEPS = CHAPTERS.filter(c => c.num).length;

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
}
const tweens = new Tweens();

// ================================================================== copy (from Ceiling Fixing · Truss Roof · Rev C)
const NAMES = { why: 'Why it matters', before: 'Before you start', setout: 'Setout', side: 'Side pads', centre: 'Centre pads', build: 'Build each pad', fixing: 'Fixing the hanger', fails: 'What fails', sideroom: 'Side room', head: 'Head and springs', system: 'The whole door', hold: 'Hold point' };
const sl = id => `<div class="sl r" data-at="0.45"><em>${pad2(CH[id].num)}</em><span class="of">/ ${pad2(STEPS)}</span>${NAMES[id]}</div>`;
const subsHtml = (id, at) => {
  const ch = CH[id];
  const chips = ch.subs.map((s, i) => `<span class="chip"><span>${String.fromCharCode(97 + i)}</span>${esc(s.chip)}</span>`).join('');
  const cards = ch.subs.map((s, i) => `<div class="card${s.tag === 'bad' ? ' bad' : ''}"><div class="ck"><span>${String.fromCharCode(97 + i)}</span>${s.tag ? `<em class="tag ${s.tag}">${s.tagText || (s.tag === 'ok' ? 'Do this' : 'Not acceptable')}</em>` : ''}</div><div class="ct">${esc(FILM_SUBS[id][i][0])}</div><div class="cd">${esc(FILM_SUBS[id][i][1])}</div></div>`).join('');
  return `<div class="subs r" data-at="${at}"><div class="chips">${chips}</div><div class="cards">${cards}</div></div>`;
};
const FILM_SUBS = {
  setout: [
    ['The back of the opening', 'The setout datum. Every depth on the plan is measured back from this line.'],
    ['The edges of the opening', 'Each side pad straddles an edge: 450 outside it, 150 inside it. Beside each edge, solid fixing, 150 minimum.'],
    ['The centreline', 'Pads A and M sit 300 each side of the centreline of the opening.'],
  ],
  build: [
    ['Cut the battens back', 'Across each pad, the nogging takes the place of the battens, to the engineer’s detail.'],
    ['Fit LVL between the trusses', 'LVL, or as the engineer specifies, fixed to the trusses and tight from truss to truss across the full pad.'],
    ['Fill under the chord', 'Where a truss crosses a pad, fix solid LVL under its bottom chord as well, flush with the nogging. Fixed fill, not a loose packer.'],
    ['Check it flush', 'Run a straightedge across the pad and the battens. Every nogging flush with their underside: no gap, no step, no loose packers.'],
    ['Ready for the lining', 'Once lined, the board sits hard against solid timber across the whole pad. Don’t line it yet: the hold point comes first.'],
  ],
  fixing: [
    ['The hanger bracket', 'The door’s horizontal tracks hang from brackets fixed up into the side pads, and the motor from pad M. Pad A takes a further fixing for doors over 330 kg.'],
    ['Screws into solid LVL', 'The bracket goes up tight to the lining. Its screws pass through the lining and bite into the LVL hard against it, with nothing between.'],
    ['Carrying the door', 'The door hangs from its brackets. The screws carry this bracket’s share of the load into solid timber, so the fixing holds and the lining stays put.'],
  ],
  sideroom: [
    ['Either side of the opening', 'Solid fixing, at least 150 mm beside each edge of the opening, from the floor to the head. The vertical tracks fix here.'],
    ['Tracks fixed into solid', 'The track and its mounting angle take up the side room, and the angle is screwed into it: the full 150 mm must be solid.'],
    ['Less than 150 mm', 'The angle’s screws can miss the solid altogether: here they hold only plasterboard. Side jambs are then needed: contact Tower.'],
    ['Something in the side room', 'A pipe, conduit, switch or power point in the way: the angle can’t sit flat. Keep the side room clear, from the floor to the head.'],
  ],
  head: [
    ['Through the lintel', 'Solid fixing through the lintel, at least 300 mm thick. The spring shaft, its brackets and the cable drums fix across it.'],
    ['Block out a steel lintel', 'A steel I-beam or U-beam: solid nogging or LVL between the flanges on the garage side, flush with them, straight through the opening.'],
    ['150 past each side', 'The springs fix to the blocking across the opening. It continues at least 150 mm past each side for the cable drums.'],
    ['Not blocked out', 'The steel is left open. The spring and cable drum brackets have nothing solid to fix to.'],
    ['Stops at the opening', 'The blocking ends at the edges of the opening. The cable drum brackets past each edge have nothing behind them.'],
  ],
  system: [
    ['Where the door fixes', 'Tracks into the side room, springs and drums into the head, hangers into L1, L2, R1 and R2, the motor into pad M, and pad A for doors over 330 kg.'],
    ['The door in motion', 'The motor draws the door up the vertical tracks and back under the ceiling while the springs and drums carry its weight. Each fixing takes load as it moves.'],
  ],
  fails: [
    ['Set high', 'The nogging stops at the trusses, leaving the batten cavity open. Tightening the screws pulls the lining up into the gap and crushes it: nothing solid is hard against the lining at the fixing.'],
    ['On top of the trusses', 'Laid on top of the trusses, the chord and batten depth is a cavity behind the lining. The screws can’t reach the LVL, and the fixing can pull through the lining.'],
    ['Battens only', 'No nogging. The fixing holds only plasterboard or a batten, and can pull through the lining.'],
  ],
};
const BLOCKS = {
  intro: { cls: 'hero', html: `
    <div class="eyebrow r" data-at="1.5"><span class="mark"><i></i><b></b></span>Builder’s guide · Truss roof</div>
    <h1 class="hero-h r" data-at="1.8">The Ceiling Your<br>Door Hangs From</h1>
    <p class="hero-sub r" data-at="2.5">Where the noggings go, how each pad is built, what the door fixes to around the opening, and what Tower checks before the ceiling is lined.</p>
    <div class="kfig r" data-at="3.3"><div class="kl">Gap between nogging and lining</div><div class="kv">0 mm</div></div>
    <p class="meta r" data-at="3.8">Behind-fit garage doors up to 3100 high</p>` },
  why: { html: `${sl('why')}
    <h2 class="ttl r" data-at="0.7">The door hangs<br>from your ceiling</h2>
    <p class="lead r" data-at="1.3">Behind the opening, the door’s hangers and motor fix up through the ceiling lining at set positions. Each position needs a solid pad behind the lining.</p>
    <div class="tiles">
      <div class="tile r" data-at="5.4"><div class="v">5</div><div class="l">Pads on every door</div></div>
      <div class="tile r" data-at="5.7"><div class="v">+1</div><div class="l">Pad A, unless Tower confirms 330 kg or less</div></div>
      <div class="tile r" data-at="6.0"><div class="v">0<small>mm</small></div><div class="l">Gap to the lining</div></div>
    </div>
    <p class="body r" data-at="8.0">Every pad is solid LVL, or as the engineer specifies, hard against the back of the lining.</p>
    <p class="fine r" data-at="9.0">Door hardware shown is indicative.</p>` },
  before: { html: `${sl('before')}
    <h2 class="ttl r" data-at="0.7">Settle four<br>things first</h2>
    <div class="list num">
      <div class="lr r" data-at="1.4"><div class="k"><em>01</em>Door weight</div><div class="d">Get it from Tower, ideally before the trusses are ordered. The truss designer confirms the trusses for the door loads.</div></div>
      <div class="lr r" data-at="6.4"><div class="k"><em>02</em>Pad A</div><div class="d">Install it unless Tower has confirmed in writing that the door is 330 kg or less.</div></div>
      <div class="lr r" data-at="10.4"><div class="k"><em>03</em>Your ceiling</div><div class="d">Lining on battens or furring channels under trusses. Lined direct to the trusses: noggings flush with the bottom chords. Suspended ceilings: contact Tower.</div></div>
      <div class="lr r" data-at="15.6"><div class="k"><em>04</em>Wall clearance</div><div class="d">A wall closer than 450 mm to an edge of the opening: contact Tower before framing.</div></div>
    </div>
    <p class="fine r" data-at="18.6">Nogging members and fixings to the engineer’s detail; pad positions, sizes and the no-cavity rule stay as drawn. Ceilings framed with joists: Tower’s stick-framed roof document applies.</p>` },
  setout: { html: `${sl('setout')}
    <h2 class="ttl r" data-at="0.7">Three lines set<br>out every pad</h2>
    <p class="lead r" data-at="1.2">Opening widths vary. For behind-fit doors up to 3100 high, these distances don’t.</p>
    ${subsHtml('setout', 1.7)}
    <p class="fine r" data-at="3.2">Mark all three lines before any nogging is cut. Trusses are illustrative: their spacing and direction change nothing on this plan.</p>` },
  side: { html: `${sl('side')}
    <h2 class="ttl r" data-at="0.7">Four pads,<br>two each side</h2>
    <p class="lead r" data-at="1.2">L1, L2, R1 and R2 take the door’s hangers. Each is at least 600 × 600, set 450 outside and 150 inside the edge of the opening.</p>
    <div class="spec">
      <div class="lr r" data-at="4.6"><div class="k">L1 · R1</div><div class="d">1000 to 1600 from the back of the opening</div></div>
      <div class="lr r" data-at="6.4"><div class="k">L2 · R2</div><div class="d">2200 to 2800 from the back of the opening</div></div>
      <div class="lr r" data-at="8.2"><div class="k">Centres</div><div class="d">1300 and 2500, 1200 apart</div></div>
    </div>
    <p class="fine r" data-at="9.6">Dimensions in millimetres. Sizes are minimums.</p>` },
  centre: { html: `${sl('centre')}
    <h2 class="ttl r" data-at="0.7">The motor pad<br>and pad A</h2>
    <div class="spec">
      <div class="lr r" data-at="1.4"><div class="k">Pad M</div><div class="d">The motor. At least 1000 × 600, from 2850 to 3850, 300 each side of the centreline.</div></div>
      <div class="lr r" data-at="5.2"><div class="k">Pad A</div><div class="d">At least 500 × 600, from 1250 to 1750. Install it unless Tower has confirmed in writing that the door is 330 kg or less.</div></div>
      <div class="lr r" data-at="9.6"><div class="k">GPO</div><div class="d">240 V 10 A, in the ceiling, clear of pad M, 300 to 950 from its centre.</div></div>
    </div>
    <p class="fine r" data-at="12.2">Millimetres from the back of the opening. A pad may be larger, never smaller.</p>` },
  build: { html: `${sl('build')}
    <h2 class="ttl r" data-at="0.7">Hard against<br>the lining</h2>
    <p class="lead r" data-at="1.2">At every pad, LVL noggings fixed to the trusses fill the batten cavity, flush with the underside of the battens. Shown at pad L1.</p>
    ${subsHtml('build', 1.8)}
    <p class="fine r" data-at="3.4">Member size and fixing to the engineer’s detail. Pad positions, sizes and the no-cavity rule stay as drawn.</p>` },
  fixing: { html: `${sl('fixing')}
    <h2 class="ttl r" data-at="0.7">Screwed into<br>solid LVL</h2>
    <p class="lead r" data-at="1.2">Once the ceiling is lined, Tower’s installers fix the door’s hangers and motor up through the lining into the pads.</p>
    ${subsHtml('fixing', 1.8)}
    <p class="fine r" data-at="3.2">Shown at the front hanger on pad L1. Brackets and screws are indicative: Tower supplies and fixes them.</p>` },
  fails: { html: `${sl('fails')}
    <h2 class="ttl r" data-at="0.7">Three ways<br>a pad fails</h2>
    <p class="lead r" data-at="1.2">The same section through pad L1, done wrong. Each time, nothing solid is hard against the lining at the fixing.</p>
    ${subsHtml('fails', 1.6)}
    <p class="fine r" data-at="3.0">Not there, not flush or not where drawn: the door cannot be installed to Tower’s standard.</p>` },
  sideroom: { html: `${sl('sideroom')}
    <h2 class="ttl r" data-at="0.7">Room for<br>the tracks</h2>
    <p class="lead r" data-at="1.2">The door runs in vertical tracks either side of the opening. Each track sits on a mounting angle screwed into the side room beside it, so the side room has to be solid.</p>
    ${subsHtml('sideroom', 1.8)}
    <p class="fine r" data-at="3.2">Track and mounting angle are indicative: Tower supplies and fixes them. Close-ups show the right-hand side; the left is the same, handed.</p>` },
  head: { html: `${sl('head')}
    <h2 class="ttl r" data-at="0.7">Solid above<br>the opening</h2>
    <p class="lead r" data-at="1.2">Above the opening, the head carries the door’s springs and cable drums, so it has to be solid as well.</p>
    ${subsHtml('head', 1.8)}
    <p class="fine r" data-at="3.2">Steel lintel shown cut away. Spring hardware is indicative. Blocking members and their fixing to the steel to the engineer’s detail.</p>` },
  system: { html: `${sl('system')}
    <h2 class="ttl r" data-at="0.7">The complete<br>system</h2>
    <p class="lead r" data-at="1.2">Every part of the door fixes into structure you build: the tracks into the side room, the springs and drums into the head, the hangers and motor into the ceiling pads.</p>
    ${subsHtml('system', 1.8)}
    <p class="fine r" data-at="3.2">Door hardware shown is indicative.</p>` },
  hold: { html: `${sl('hold')}
    <h2 class="ttl r" data-at="0.7">Before the<br>ceiling is lined</h2>
    <ol class="steps3">
      <li class="r" data-at="1.6"><b>01</b><span><strong>Frame every pad</strong> to the setout and schedule, flush with the underside of the battens, before any lining goes up.</span></li>
      <li class="r" data-at="6.0"><b>02</b><span><strong>Photograph and send</strong> each pad with tapes to the setout and a straightedge across it, plus the structural sign-off, to your Tower contact.</span></li>
      <li class="r" data-at="11.0"><b>03</b><span><strong>Line the ceiling</strong> once Tower has confirmed the pads in writing.</span></li>
    </ol>
    <p class="fine r" data-at="12.8">Tower’s review is a check, not an acceptance of the framing. Compliance with Tower’s requirements remains with the builder.</p>` },
  end: { cls: 'hero end', html: `
    <div class="eyebrow r" data-at="1.6"><span class="mark"><i></i><b></b></span>End of the guide</div>
    <h2 class="hero-h r" data-at="1.9">Solid Behind<br>the Lining</h2>
    <div class="endcard notch r" data-at="2.6"><div class="cardt">Why it matters</div><p>Our installers fix the door’s hangers and motor through the lining into these pads, its tracks into the side room and its springs into the head. If the solid fixing is not there, not flush, or not where it is drawn, the door cannot be installed to our standard, and remedial work normally means opening up the finished ceiling or walls.</p></div>
    <div class="contact r" data-at="4.2"><span class="ph">1300 004 962</span><span class="em">sales@towerdoors.com.au</span><span class="web">towerdoors.com.au</span></div>
    <p class="fine r" data-at="4.8">Based on Ceiling Fixing · Truss Roof · Rev C · October 2026. Where this video and that document differ, the document governs.</p>` },
};

// ================================================================== 60-second cut (?cut=short): one beat per idea, a line each
const SHORT = /cut=short/.test(location.search);
const sb = (eye, h, sub) => ({ cls: 'hero short', html: `
    <div class="eyebrow r" data-at="0.5"><span class="mark"><i></i><b></b></span>${eye}</div>
    <h2 class="hero-h r" data-at="0.75">${h}</h2>${sub ? `<p class="hero-sub r" data-at="1.3">${sub}</p>` : ''}` });
const SHORT_BLOCKS = {
  intro: sb('Builder’s guide · Truss roof', 'The Ceiling Your<br>Door Hangs From', 'Behind-fit garage doors up to 3100 high'),
  why: sb('Why it matters', 'The door hangs<br>from your ceiling'),
  side: sb('Setout', 'Every pad, set out<br>from the opening'),
  build: sb('Build each pad', 'Solid LVL, hard<br>against the lining'),
  fixing: sb('The fixing', 'Screwed into<br>solid timber'),
  fails: sb('Not acceptable', 'Nothing solid behind it?<br>It pulls through'),
  sideroom: sb('Side room', '150 mm solid<br>for the tracks'),
  head: sb('Head', 'A solid head<br>for the springs'),
  system: sb('The whole door', 'Every fixing<br>carries the door'),
};
const SHORT_SCENES = [
  { id: 'intro', dur: 5.5, mode: 'hero', bars: 1, flight: 3.4, drift: { deg: 5 }, inDelay: 1.0 },
  { id: 'why', dur: 6.5, mode: 'hero', flight: 2.2, drift: { deg: 4 } },
  { id: 'side', dur: 5, mode: 'hero', flight: 2.0, drift: { push: 0.03 } },
  { id: 'build', dur: 6, mode: 'hero', flight: 2.0, pick: 1, drift: { deg: 4 } },
  { id: 'fixing', dur: 7, mode: 'hero', flight: 2.0, pick: 1, drift: { deg: 2 } },
  { id: 'fails', dur: 8, mode: 'hero', flight: 1.6, pick: 2, drift: { push: 0.02 } },
  { id: 'sideroom', dur: 6.5, mode: 'hero', flight: 2.2, pick: 1, drift: { push: 0.03 } },
  { id: 'head', dur: 6.5, mode: 'hero', flight: 2.2, pick: 2, drift: { push: 0.02 } },
  { id: 'system', dur: 6, mode: 'hero', flight: 2.2, pick: 1, drift: { deg: 3 } },
  { id: 'logo', dur: 3 },
];
if (SHORT) { for (const k of Object.keys(BLOCKS)) delete BLOCKS[k]; Object.assign(BLOCKS, SHORT_BLOCKS); }

const LABEL_FIX = { 'Straightedge \u00b7 0 mm': { dx: -84, dy: 50 } };

// ================================================================== scenes (seconds)
const SCENES_FULL = [
  { id: 'intro', dur: 9.6, mode: 'hero', bars: 1, flight: 5.0, drift: { deg: 7 }, inDelay: 2.0 },
  { id: 'why', dur: 13.5, flight: 2.8, drift: { deg: 5 } },
  { id: 'before', dur: 24.5, flight: 2.6, drift: { deg: -6 } },
  { id: 'setout', dur: 18, flight: 2.8, drift: { push: 0.035 }, subs: [0, 6, 12] },
  { id: 'side', dur: 13.5, flight: 2.2, drift: { push: 0.04 } },
  { id: 'centre', dur: 15.5, flight: 2.2, drift: { push: 0.04 } },
  { id: 'build', dur: 29, flight: 3.2, drift: { deg: 5 }, subs: [0, 6, 12, 17.5, 23], subFlight: 1.9 },
  { id: 'fixing', dur: 21, flight: 2.8, drift: { deg: 3 }, subs: [0, 6.5, 15], subFlight: 2.2 },
  { id: 'fails', dur: 25.5, flight: 2.6, drift: { push: 0.03 }, subs: [0, 8.5, 17] },
  { id: 'sideroom', dur: 31, flight: 2.8, drift: { push: 0.03 }, subs: [0, 7, 15.5, 24], subFlight: 2.2 },
  { id: 'head', dur: 36.5, flight: 2.8, drift: { push: 0.03 }, subs: [0, 6.5, 15, 22.5, 28], subFlight: 2.4 },
  { id: 'system', dur: 17, flight: 3.0, drift: { deg: 4 }, subs: [0, 8] },
  { id: 'hold', dur: 16.5, flight: 2.8, drift: { deg: 4 }, finder: { start: 2.6, period: 2.0 } },
  { id: 'end', dur: 14.5, mode: 'end', bars: 1, flight: 3.6, drift: { deg: 8 } },
  { id: 'logo', dur: 5.5 },
];

const SCENES = SHORT ? SHORT_SCENES : SCENES_FULL;

// ================================================================== renderer + scene
const canvas = $('#gl');
const AA = !/aa=0/.test(location.search);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: AA, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 12, 50);
scene.add(new THREE.AmbientLight(0xffffff, 0.42 * Math.PI));
{ const key = new THREE.DirectionalLight(0xfff0e6, 0.55 * Math.PI); key.position.set(4, 10, -3); scene.add(key); }
{ const under = new THREE.DirectionalLight(0xe7e7f9, 0.3 * Math.PI); under.position.set(-2, -6, 5); scene.add(under); }
const camera = new THREE.PerspectiveCamera(30, W / H, 0.02, 260);
const tex = makeTextures();
for (const t of Object.values(tex)) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const M = buildModel(scene, tex);
const DET = buildDetail(scene, tex);
const JMB = buildJamb(scene, tex);
const F = { ...M.F, detail: DET.fade, jamb: JMB.fade };
F.doorOpen = { o: 0, set(v) { this.o = v; M.door.setTravel(v * DOOR_TRAVEL); } };
for (const k of Object.keys(F)) if (k !== 'doorOpen') F[k].set(0);

// ================================================================== layout
let mode = 'hero', free = null;
const off = [0, 0], offT = [0, 0];
function setMode(m) {
  mode = m;
  free = m === 'panel' ? { x: 760, y: 112, w: 1160, h: 968 } : { x: W * 0.42, y: 40, w: W * 0.58, h: H - 80 };
  offT[0] = W / 2 - (free.x + free.w / 2);
  offT[1] = H / 2 - (free.y + free.h / 2);
}
function computePose(spec) {
  const fov = spec.fov ?? 40;
  const t = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const dir = new THREE.Vector3(...spec.dir).normalize();
  const dW = (spec.frame[0] / 2) / (t * (free.w / H));
  const dH = (spec.frame[1] / 2) / (t * (free.h / H));
  const d = Math.max(dW, dH) * (spec.margin ?? 1.07);
  const target = new THREE.Vector3(...spec.target);
  const pos = target.clone().addScaledVector(dir, d);
  if (pos.y < 0.3) pos.y = 0.3;
  return { target, pos, fov, d };
}

// ================================================================== camera
const _p = new THREE.Vector3(), _t = new THREE.Vector3();
const camTarget = new THREE.Vector3();
function setCam(p, t, fov) {
  camera.position.copy(p); camera.fov = fov;
  camTarget.copy(t);
  camera.lookAt(t);
  camera.updateMatrixWorld();
}
function shot(pose, flight, drift, hold) {
  tweens.cancel('cam');
  const p0 = camera.position.clone(), t0 = camTarget.clone(), f0 = camera.fov;
  const n0 = scene.fog.near, x0 = scene.fog.far, n1 = pose.d * 0.8, x1 = pose.d * 3.6 + 4;
  const dist = p0.distanceTo(pose.pos);
  const mid = p0.clone().lerp(pose.pos, 0.5); mid.y += Math.min(dist * 0.15, 3.2);
  const startDrift = () => {
    const T = pose.target.clone(), V = pose.pos.clone().sub(T);
    const deg = (drift && drift.deg) || 0, push = (drift && drift.push) || 0;
    tweens.add({
      key: 'cam', dur: Math.max(0.5, hold), ease: E.inOutSine,
      onUpdate: v => {
        const th = THREE.MathUtils.degToRad(deg) * v, s = 1 - push * v;
        const c = Math.cos(th), sn = Math.sin(th);
        _p.set(T.x + (V.x * c - V.z * sn) * s, T.y + V.y * s, T.z + (V.x * sn + V.z * c) * s);
        setCam(_p, T, pose.fov);
      },
    });
  };
  tweens.add({
    key: 'cam', dur: flight, ease: E.inOutCubic,
    onUpdate: v => {
      const a = 1 - v;
      _p.set(0, 0, 0).addScaledVector(p0, a * a).addScaledVector(mid, 2 * a * v).addScaledVector(pose.pos, v * v);
      _t.copy(t0).lerp(pose.target, v);
      setCam(_p, _t, lerp(f0, pose.fov, v));
      scene.fog.near = lerp(n0, n1, v); scene.fog.far = lerp(x0, x1, v);
    },
    onDone: startDrift,
  });
}

// ================================================================== state
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
  const [kind, id] = k.split(':');
  if (kind === 'zone') {
    const z = M.pads[id].zone; z.scale.y = 0.02;
    tweens.add({ key: 'fx:' + k, dur: 0.9, delay, ease: E.outBack, onUpdate: v => (z.scale.y = Math.max(0.02, v)) });
  } else if (kind === 'nog') {
    const g = M.pads[id].nog; g.position.y = -0.42;
    tweens.add({ key: 'fx:' + k, dur: 1.1, delay, ease: E.outCubic, onUpdate: v => (g.position.y = lerp(-0.42, 0, v)) });
  } else if (kind === 'fill') {
    const g = M.pads[id].fill; g.position.y = -0.16;
    tweens.add({ key: 'fx:' + k, dur: 0.9, delay, ease: E.outCubic, onUpdate: v => (g.position.y = lerp(-0.16, 0, v)) });
  } else if (k.startsWith('so_')) {
    const f = F[k]; f.draw(0.001);
    tweens.add({ key: 'fx:' + k, dur: 1.5, delay, ease: E.inOutCubic, onUpdate: v => f.draw(v) });
  } else if (k === 'straightedge') {
    const r = M.se.root; r.position.y = -0.3;
    tweens.add({ key: 'fx:' + k, dur: 0.9, delay, ease: E.outCubic, onUpdate: v => (r.position.y = lerp(-0.3, 0, v)) });
  } else if (k === 'battensCut') {
    M.L.battensCut.root.position.y = 0;
  } else if (k === 'blocking' || k === 'blockShort') {
    const r = M.L[k].root; r.position.z = 0.42;
    tweens.add({ key: 'fx:' + k, dur: 1.6, delay, ease: E.inOutCubic, onUpdate: v => (r.position.z = lerp(0.42, 0, v)) });
  } else if (k === 'springs' || k === 'springCoil') {
    const r = M.L[k].root;
    if (!late) { tweens.cancel('fx:' + k); r.position.y = 0; return; }
    r.position.y = -0.14;
    tweens.add({ key: 'fx:' + k, dur: 1.1, delay, ease: E.outCubic, onUpdate: v => (r.position.y = lerp(-0.14, 0, v)) });
  }
}
function vanishFx(k) {
  if (k === 'battensCut') {
    const r = M.L.battensCut.root;
    tweens.add({ key: 'fx:' + k, dur: 0.9, ease: E.inOutSine, onUpdate: v => (r.position.y = -0.32 * v) });
  }
}
function applyState(st, inDelay, flight, doorCfg) {
  let stagger = 0;
  for (const [k, to] of Object.entries(st)) {
    const f = F[k]; if (!f) continue;
    const from = f.o;
    if (Math.abs(from - to) < 0.002) continue;
    if (k === 'doorOpen') {
      const opening = to > from;
      const delay = opening ? (doorCfg?.delay ?? 0.4) + flight : 0;
      const dur = opening ? (doorCfg?.dur ?? 3) : 1.2;
      tweens.add({ key: 'door', dur, delay, ease: E.inOutSine, onUpdate: v => f.set(lerp(from, to, v)) });
      continue;
    }
    const appearing = from < 0.02 && to > 0.02, vanishing = to < 0.02 && from > 0.02;
    const padKind = /^(zone|nog|fill):/.test(k);
    const late = /^(blocking|blockShort)$/.test(k) || (/^(springs|springCoil)$/.test(k) && (st.lintel ?? 0) > 0.5);
    const delay = appearing ? (late ? flight + 0.3 : inDelay) + (padKind ? (stagger += 0.12) : 0) : 0;
    const dur = appearing ? 0.9 : 0.7;
    tweens.add({ key: 'f:' + k, dur, delay, ease: E.inOutSine, onUpdate: v => f.set(lerp(from, to, v)) });
    if (appearing) appearFx(k, delay, late);
    else if (vanishing) vanishFx(k);
  }
}

// ================================================================== overlays (labels + dimensions, diffed between beats)
const labelsEl = $('#labels'), dimsEl = $('#dims');
const OL = { labels: new Map(), dims: new Map(), dying: [] };
// a label timed to an animation ("at") is re-added on every beat, so it reappears in step with each take
let beatSeq = 0;
const lkey = d => JSON.stringify([d.p, d.text || d.html, d.cls, d.dx || 0, d.dy || 0, d.at !== undefined ? beatSeq : 0]);
const dkey = d => JSON.stringify([d.a, d.b, d.text]);
let olSeq = 0;
function addLabel(k, d, delay) {
  const el = document.createElement('div');
  el.className = 'lbl ' + (d.cls || '');
  el.innerHTML = d.html || esc(d.text);
  el.style.opacity = 0;
  labelsEl.appendChild(el);
  const e = { d, el, v: new THREE.Vector3(...d.p), o: 0, w: el.offsetWidth, h: el.offsetHeight, id: ++olSeq };
  if (d.follow) { const src = DET.groups[d.follow] ? DET : JMB; e.local = e.v.clone().sub(src.origin); e.obj = src.groups[d.follow]; }
  if (d.cls === 'load') e.arrow = el.querySelector('i');
  if ((d.dx || d.dy) && !d.noLeader) {
    e.ld = svgEl('line', { class: 'leader' }); e.dot = svgEl('circle', { r: 3.4, class: 'ldot' });
    dimsEl.appendChild(e.ld); dimsEl.appendChild(e.dot);
  }
  tweens.add({ key: 'ol' + e.id, dur: 0.55, delay, ease: E.inOutSine, onUpdate: v => (e.o = v) });
  OL.labels.set(k, e);
}
function addDim(k, d, delay) {
  const g = svgEl('g', { class: 'dim' });
  const exts = (d.ext || []).map(() => svgEl('line', { class: 'ex' }));
  const line = svgEl('line', { class: 'dl' }), t1 = svgEl('line', { class: 'tk' }), t2 = svgEl('line', { class: 'tk' });
  const text = svgEl('text'); text.textContent = d.text.toUpperCase();
  exts.forEach(x => g.appendChild(x)); g.append(line, t1, t2, text);
  g.style.display = 'none';
  dimsEl.appendChild(g);
  const e = { d, g, line, t1, t2, text, exts, p: 0, o: 1, id: ++olSeq, a: new THREE.Vector3(...d.a), b: new THREE.Vector3(...d.b), ev: (d.ext || []).map(([p, q]) => [new THREE.Vector3(...p), new THREE.Vector3(...q)]) };
  tweens.add({ key: 'ol' + e.id, dur: 0.95, delay, ease: E.outCubic, onUpdate: v => (e.p = v) });
  OL.dims.set(k, e);
}
function retire(map, k, e) {
  map.delete(k);
  OL.dying.push(e);
  const from = e.o;
  tweens.add({
    key: 'ol' + e.id, dur: 0.35, ease: E.inOutSine, onUpdate: v => (e.o = from * (1 - v)),
    onDone: () => {
      (e.el || e.g).remove(); if (e.ld) { e.ld.remove(); e.dot.remove(); }
      OL.dying = OL.dying.filter(x => x !== e);
    },
  });
}
function setOverlays(labels, dims, delay, fixT0 = null) {
  const nl = new Map(labels.map(d => [lkey(d), d])), nd = new Map(dims.map(d => [dkey(d), d]));
  for (const [k, e] of [...OL.labels]) if (!nl.has(k)) retire(OL.labels, k, e);
  for (const [k, e] of [...OL.dims]) if (!nd.has(k)) retire(OL.dims, k, e);
  let i = 0;
  // timed labels follow the fixing take when one runs, otherwise the shot
  for (const [k, d] of nl) if (!OL.labels.has(k)) addLabel(k, d, (d.at !== undefined ? (fixT0 ?? delay) + d.at : delay) + 0.06 * i++);
  i = 0;
  for (const [k, d] of nd) if (!OL.dims.has(k)) addDim(k, d, delay + 0.05 * i++);
}
const _v = new THREE.Vector3();
function toScreen(v) {
  _v.copy(v).project(camera);
  if (_v.z > 1 || _v.z < -1) return null;
  return { x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H };
}
function placeTick(el, x, y, ux, uy) {
  const c = Math.SQRT1_2, tx = (c * ux - c * uy) * 8, ty = (c * ux + c * uy) * 8;
  el.setAttribute('x1', x - tx); el.setAttribute('y1', y - ty); el.setAttribute('x2', x + tx); el.setAttribute('y2', y + ty);
}
function drawDim(D) {
  const a = toScreen(D.a), b = toScreen(D.b);
  if (!a || !b || D.p <= 0.001 || D.o <= 0.003) { D.g.style.display = 'none'; return; }
  D.g.style.display = ''; D.g.style.opacity = D.o;
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
  const short = len < D.text.textContent.length * 11.5 + 14;
  const offd = short ? 25 : 15;
  const mx = (a.x + b.x) / 2 + nx * offd, my = (a.y + b.y) / 2 + ny * offd;
  D.text.setAttribute('transform', `translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})`);
  D.text.style.opacity = clamp((p - 0.55) / 0.45, 0, 1);
}
function drawLabels() {
  const fx0 = free.x, fx1 = free.x + free.w, fy0 = Math.max(free.y, 60), fy1 = free.y + free.h - 70;
  for (const L of [...OL.labels.values(), ...OL.dying.filter(e => e.el)]) {
    if (L.obj) L.v.copy(L.local).applyMatrix4(L.obj.matrixWorld);
    if (L.arrow) L.arrow.style.transform = `translateY(${(Math.sin(NOW * 4.8) * 4.5).toFixed(2)}px)`;
    const s = toScreen(L.v);
    const out = !s || s.x < fx0 - 40 || s.x > fx1 + 40 || s.y < fy0 - 40 || s.y > fy1 + 40 || L.o <= 0.003;
    if (out) { L.el.style.visibility = 'hidden'; if (L.ld) { L.ld.style.display = 'none'; L.dot.style.display = 'none'; } continue; }
    let x = s.x + (L.d.dx || 0) * LS, y = s.y + (L.d.dy || 0) * LS;
    x = clamp(x, fx0 + L.w / 2 + 8, fx1 - L.w / 2 - 8);
    y = clamp(y, fy0 + L.h / 2 + 6, fy1 - L.h / 2 - 6);
    L.el.style.visibility = '';
    L.el.style.opacity = L.o;
    L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    if (L.ld) {
      L.ld.style.display = ''; L.dot.style.display = '';
      L.ld.style.opacity = L.o; L.dot.style.opacity = L.o;
      L.ld.setAttribute('x1', s.x); L.ld.setAttribute('y1', s.y); L.ld.setAttribute('x2', x); L.ld.setAttribute('y2', y);
      L.dot.setAttribute('cx', s.x); L.dot.setAttribute('cy', s.y);
    }
  }
  for (const D of [...OL.dims.values(), ...OL.dying.filter(e => e.g)]) drawDim(D);
}

// ================================================================== captions
const capEl = $('#captions');
const blocks = {};
for (const [id, b] of Object.entries(BLOCKS)) {
  const el = document.createElement('section');
  el.className = 'blk ' + (b.cls || 'col');
  el.innerHTML = b.html;
  el.style.display = 'none';
  capEl.appendChild(el);
  const reveals = $$('.r', el);
  reveals.forEach(r => { r.style.opacity = 0; });
  blocks[id] = { el, reveals, chips: $$('.chip', el), cards: $$('.card', el) };
}
function showBlock(id) {
  const b = blocks[id]; if (!b) return;
  tweens.cancel('blk:' + id);
  b.el.style.display = 'block'; b.el.style.opacity = 1;
  b.reveals.forEach((r, i) => {
    r.style.opacity = 0; r.style.transform = 'translateY(18px)';
    tweens.add({ key: `rv:${id}:${i}`, dur: 0.85, delay: +r.dataset.at, ease: E.outCubic, onUpdate: v => { r.style.opacity = v; r.style.transform = `translateY(${((1 - v) * 18).toFixed(2)}px)`; } });
  });
}
function hideBlock(id) {
  const b = blocks[id]; if (!b || b.el.style.display === 'none') return;
  b.reveals.forEach((r, i) => tweens.cancel(`rv:${id}:${i}`));
  tweens.add({ key: 'blk:' + id, dur: 0.5, ease: E.inOutSine, onUpdate: v => (b.el.style.opacity = 1 - v), onDone: () => (b.el.style.display = 'none') });
}
function showSub(id, si) {
  const b = blocks[id]; if (!b || !b.cards.length) return;
  b.chips.forEach((c, i) => { c.classList.toggle('on', i === si); c.classList.toggle('done', i < si); });
  b.cards.forEach((c, i) => {
    tweens.cancel(`sc:${id}:${i}`);
    const from = +c.style.opacity || 0;
    if (i === si) tweens.add({ key: `sc:${id}:${i}`, dur: 0.6, delay: 0.32, ease: E.outCubic, onUpdate: v => { c.style.opacity = lerp(from, 1, v); c.style.transform = `translateY(${((1 - v) * 12).toFixed(2)}px)`; } });
    else if (from > 0) tweens.add({ key: `sc:${id}:${i}`, dur: 0.3, ease: E.inOutSine, onUpdate: v => (c.style.opacity = from * (1 - v)) });
  });
}

// ================================================================== chrome: bars, scrims, progress, source note, logo card
const G = { bars: 1, scrimP: 0, scrimH: 1, prog: 0, src: 0, black: 1, logo: 0, finder: 0 };
const fade = (key, to, dur = 0.8, delay = 0, ease = E.inOutSine) => {
  const from = G[key];
  tweens.add({ key: 'g:' + key, dur, delay, ease, onUpdate: v => (G[key] = lerp(from, to, v)) });
};
const progEl = $('#prog');
progEl.innerHTML = Array.from({ length: STEPS }, (_, i) => `<div class="seg"><i></i><span>${pad2(i + 1)}</span></div>`).join('');
const segs = $$('.seg', progEl);
function setProgress(n) { segs.forEach((s, i) => { s.classList.toggle('on', i + 1 === n); s.classList.toggle('done', i + 1 < n); }); }

// ================================================================== viewfinder (hold point)
const finderEl = $('#finder'), flashEl = $('#flash');
const FD = { start: 1e9, period: 2, order: ['L1', 'L2', 'A', 'M', 'R2', 'R1'] };
const _c = new THREE.Vector3();
function padBox(id) {
  const p = PADS_BY[id];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const x of [p.xMin, p.xMax]) for (const z of [p.z1, p.z2]) {
    _c.set(x, K.Y_LIN, z); const s = toScreen(_c);
    if (!s) return null;
    x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
  }
  const m = 18;
  return [Math.max(x0 - m, free.x + 10), Math.max(y0 - m, free.y + 44), Math.min(x1 + m, free.x + free.w - 10), Math.min(y1 + m, free.y + free.h - 10)];
}
function drawFinder(time) {
  const e = time - FD.start;
  if (G.finder <= 0.003 || e < 0) { finderEl.style.opacity = 0; flashEl.style.opacity = 0; return; }
  const n = FD.order.length;
  const idx = Math.min(n - 1, Math.floor(e / FD.period));
  const into = e - idx * FD.period;
  const cur = padBox(FD.order[idx]);
  if (!cur) { finderEl.style.opacity = 0; return; }
  let box = cur;
  if (idx > 0 && into < 0.55) {
    const prev = padBox(FD.order[idx - 1]);
    if (prev) { const k = E.inOutCubic(into / 0.55); box = cur.map((v, i) => lerp(prev[i], v, k)); }
  }
  finderEl.style.opacity = G.finder;
  finderEl.style.left = box[0].toFixed(1) + 'px'; finderEl.style.top = box[1].toFixed(1) + 'px';
  finderEl.style.width = (box[2] - box[0]).toFixed(1) + 'px'; finderEl.style.height = (box[3] - box[1]).toFixed(1) + 'px';
  const lbl = `${FD.order[idx]} · photo ${idx + 1} of ${n}`;
  if (finderEl.dataset.l !== lbl) { finderEl.dataset.l = lbl; $('span', finderEl).textContent = lbl; }
  const shutter = idx < n && into > 0.55 && into < 0.95 ? 1 - (into - 0.55) / 0.4 : 0;
  flashEl.style.opacity = (0.12 * shutter * G.finder).toFixed(3);
}

// ================================================================== hanger fixing (section close-up), as in the guide
const FIX_T = { rise: 0.8, d0: 1.0, d1: 2.2, drive: 1.1, done: 3.3, gap: 2.95, gapDur: 0.75, pull: 4.0, pullDur: 1.1 };
const FIX_KEYS = ['fx:out', 'fx:in', 'fx:rise', 'fx:d0', 'fx:d1', 'fx:fail', 'dip'];
function runFix(kind, delay, variant) {
  // returns when (seconds after the beat) the take starts, for timed labels; null when nothing runs
  const X = DET.FIX, upd = () => DET.applyFix();
  FIX_KEYS.forEach(k => tweens.cancel(k));
  const mode = kind === 'gap' ? 'gap' : kind === 'pull' ? 'pull' : 'ok';
  const setVariant = () => { if (variant) DET.variants[variant](); };
  const fixed = X.mode === 'ok' && X.rise > 0.999 && X.d[0] > 0.999 && X.d[1] > 0.999 && X.fail < 0.001;
  if (kind === 'load' && fixed) { setVariant(); return null; }
  let t0 = delay;
  if (X.rise > 0.02 || X.d[0] > 0.02 || X.fail > 0.02) {
    // clear the last take: bracket and screws drop away, the lining settles, and the section dips while the nogging changes
    const r0 = X.rise, a0 = X.d[0], b0 = X.d[1], f0 = X.fail, o0 = DET.fade.o;
    tweens.add({
      key: 'fx:out', dur: 0.5, ease: E.inOutSine,
      onUpdate: v => { X.rise = r0 * (1 - v); X.d = [a0 * (1 - v), b0 * (1 - v)]; X.fail = f0 * (1 - v); DET.fade.set(o0 * (1 - 0.8 * v)); },
      onDone: () => {
        setVariant(); X.mode = mode; X.fail = 0; upd();
        tweens.add({ key: 'fx:in', dur: 0.5, ease: E.inOutSine, onUpdate: v => DET.fade.set(o0 * (0.2 + 0.8 * v)) });
      },
    });
    t0 = Math.max(delay, 1.1);
  } else { setVariant(); X.mode = mode; X.rise = 0; X.d = [0, 0]; X.fail = 0; upd(); }
  tweens.add({ key: 'fx:rise', dur: FIX_T.rise, delay: t0, ease: E.outCubic, onUpdate: v => { X.rise = v; upd(); } });
  [0, 1].forEach(i => tweens.add({ key: 'fx:d' + i, dur: FIX_T.drive, delay: t0 + FIX_T['d' + i], ease: E.inOutSine, onUpdate: v => { X.d[i] = v; upd(); } }));
  if (mode === 'gap') tweens.add({ key: 'fx:fail', dur: FIX_T.gapDur, delay: t0 + FIX_T.gap, ease: E.inOutCubic, onUpdate: v => { X.fail = v; upd(); } });
  if (mode === 'pull') tweens.add({ key: 'fx:fail', dur: FIX_T.pullDur, delay: t0 + FIX_T.pull, ease: E.give, onUpdate: v => { X.fail = v; upd(); } });
  return kind === 'load' ? t0 + FIX_T.done : t0;
}

// the steel lintel: dip, change the profile, come back
function swapBeam(to, delay) {
  const keys = ['lintel', 'blocking', 'blockShort'];
  let from = null;
  tweens.add({
    key: 'beamdip', dur: 0.3, delay, ease: E.inOutSine,
    onUpdate: v => { if (!from) from = keys.map(k => F[k].o); keys.forEach((k, i) => F[k].set(from[i] * (1 - 0.85 * v))); },
    onDone: () => {
      M.lintel.setProfile(to);
      tweens.add({ key: 'beamdip', dur: 0.5, ease: E.inOutSine, onUpdate: v => keys.forEach((k, i) => F[k].set(from[i] * (0.15 + 0.85 * v))) });
    },
  });
}

// the track fixing at the jamb (section close-up), as in the guide; the section dips while the wall changes
const JFIX_T = { in: 0.9, d: 1.05, drive: 1.1, done: 2.2, fail: 3.2, failDur: 1.1 };
const JFIX_KEYS = ['jx:out', 'jx:back', 'jx:in', 'jx:d', 'jx:fail'];
function runJamb(kind, delay) {
  const X = JMB.J, upd = () => JMB.apply();
  JFIX_KEYS.forEach(k => tweens.cancel(k));
  let t0 = delay;
  if (F.jamb.o > 0.02 && (X.in < 0.999 || X.d > 0.02 || X.fail > 0.02 || X.mode === 'obstruct')) {
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

// ================================================================== timeline
const CUES = [];
const at = (t, fn) => CUES.push({ t, fn });
let curScene = null, curSub = 0, TOTAL = 0;
function buildTimeline() {
  let t = 0, prevId = null;
  for (const sc of SCENES) {
    const t0 = t; sc.t0 = t0;
    if (sc.id === 'logo') {
      const pid = prevId;
      at(t0, () => {
        curScene = sc; hideBlock(pid);
        fade('black', 1, 1.0); fade('logo', 1, 0.9, 1.0);
      });
      at(t0 + sc.dur - 1.1, () => fade('logo', 0, 0.9));
      t += sc.dur; continue;
    }
    const ch = CH[sc.id];
    const subs = sc.subs || [0];
    const sub0 = sc.pick ?? 0;          // the short cut opens a scene straight on one sub-step
    // shots: the scene's first beat, plus any sub with a different camera
    const shots = [];
    let prevSpec = null;
    subs.forEach((st, k) => {
      const si = sub0 + k;
      const spec = (ch.subs && ch.subs[si] && ch.subs[si].cam) || ch.cam;
      if (spec !== prevSpec) shots.push({ t: t0 + st, si, spec, flight: k === 0 ? sc.flight : (sc.subFlight || 1.8) });
      prevSpec = spec;
    });
    shots.forEach((s, i) => { s.hold = ((i + 1 < shots.length) ? shots[i + 1].t : t0 + sc.dur) - (s.t + s.flight); });
    const pid = prevId;
    subs.forEach((st, k) => {
      const si = sub0 + k;
      const sh = shots.find(s => s.si === si);
      at(t0 + st, () => beat(sc, si, sh, pid, k === 0));
    });
    prevId = sc.id;
    t += sc.dur;
  }
  TOTAL = t;
  CUES.sort((a, b) => a.t - b.t);
}
function beat(sc, si, sh, prevId, first) {
  const ch = CH[sc.id];
  curScene = sc; curSub = si;
  if (first) {
    if (sc.id === 'intro') fade('black', 0, 1.6);
    setMode(sc.mode || 'panel');
    const panel = (sc.mode || 'panel') === 'panel';
    fade('bars', sc.bars ? 1 : 0, 1.2, 0, E.inOutCubic);
    fade('scrimP', panel ? 1 : 0, 0.9); fade('scrimH', panel ? 0 : 1, 0.9);
    fade('prog', panel ? 1 : 0, 0.7); fade('src', panel ? 1 : 0, 0.7);
    if (ch.num) setProgress(ch.num);
    if (prevId) hideBlock(prevId);
    showBlock(sc.id);
    G.finder > 0 && fade('finder', 0, 0.4);
    if (sc.finder) { FD.start = sc.t0 + sc.finder.start; FD.period = sc.finder.period; fade('finder', 1, 0.5, sc.finder.start - 0.2); }
  }
  const flight = sh ? sh.flight : 0;
  if (sh) shot(computePose(sh.spec), sh.flight, sc.drift, sh.hold);
  const st = resolveState(DEFAULT_STATE, ch.state, ch.subs && ch.subs[si] && ch.subs[si].state);
  const inDelay = sc.inDelay ?? Math.max(0.2, flight * 0.5);
  applyState(st, inDelay, flight, ch.door);
  const variant = ch.subs && ch.subs[si] && ch.subs[si].variant;
  const fixKind = ch.subs && ch.subs[si] && ch.subs[si].fix;
  const jambKind = ch.subs && ch.subs[si] && ch.subs[si].jamb;
  beatSeq++;
  let fixT0 = null;
  if (jambKind) fixT0 = runJamb(jambKind, sh ? sh.flight * 0.85 : 0.3);
  if (fixKind) fixT0 = runFix(fixKind, sh ? sh.flight * 0.85 : 0.3, variant);
  else if (variant) {
    if (first) DET.variants[variant]();
    else {
      tweens.add({
        key: 'dip', dur: 0.24, ease: E.inOutSine, onUpdate: v => DET.fade.set(1 - 0.82 * v),
        onDone: () => { DET.variants[variant](); tweens.add({ key: 'dip', dur: 0.45, ease: E.inOutSine, onUpdate: v => DET.fade.set(0.18 + 0.82 * v) }); },
      });
    }
  }
  if (sc.id === 'head' && si === 1 && !SHORT) swapBeam('U', 4.9);
  if (sc.id === 'head' && si === 2 && M.lintel.profile !== 'I') swapBeam('I', 0);
  const sub = ch.subs ? ch.subs[si] : null;
  const labels = [...(ch.labels || []), ...((sub && sub.labels) || [])]
    .map(d => (LABEL_FIX[d.text] ? { ...d, ...LABEL_FIX[d.text] } : d))
    // in the failure close-ups the bracket drops low in frame: the load arrow rides beside the strap instead of under it
    .map(d => (d.cls === 'load' && sc.id === 'fails' ? { ...d, dx: 64, dy: -34 } : d));
  const dims = [...(ch.dims || []), ...((sub && sub.dims) || [])];
  setOverlays(labels, dims, sh ? sh.flight * 0.82 : (variant ? 0.3 : 0.25), fixT0);
  if (ch.subs && !SHORT) showSub(sc.id, si);
}

// ================================================================== per-frame effects
function effects(time) {
  if (F.straightedge.o > 0.01) M.se.root.position.x = -2.7 + 0.42 * Math.sin(time * 0.75);
  const pulseOn = curScene && curScene.id === 'why' && F.doorOpen.o > 0.97;
  const fillPulse = curScene && curScene.id === 'build' && curSub === 2;
  PAD_IDS.forEach((id, i) => {
    const o = M.pads[id];
    o.zoneMat.emissiveIntensity = 0.22 + (pulseOn ? 0.32 * (0.5 + 0.5 * Math.sin(time * 2.4 - i * 0.8)) : 0);
    o.nogMat.emissiveIntensity = 0.1;
    o.fillMat.emissiveIntensity = fillPulse ? 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 4)) : 0.12;
  });
  if (F.hangerHL.o > 0.003) {
    const p = 0.5 + 0.5 * Math.sin(time * 3.2), [hm, hl] = F.hangerHL.mats;
    hm.opacity = (0.05 + 0.1 * p) * F.hangerHL.o; hl.opacity = (0.45 + 0.55 * p) * F.hangerHL.o;
  }
  if (F.detail.o > 0.003) {
    const loadBeat = curScene && curScene.id === 'fixing' && curSub === 2;
    DET.FIX.glow = loadBeat ? 0.85 + 0.45 * Math.sin(time * 3.4) : 0.95 + 0.12 * Math.sin(time * 2.2);
    DET.applyFix();
  }
  if (F.jamb.o > 0.003) { JMB.J.glow = 0.95 + 0.12 * Math.sin(time * 2.2); JMB.apply(); }
  M.dust.update(time);
}
const barsT = $('.bars .t'), barsB = $('.bars .b');
const scrimP = $('#scrimP'), scrimH = $('#scrimH'), srcEl = $('#src'), blackEl = $('#black'), logoEl = $('#logocard');
function chrome() {
  const b = G.bars;
  barsT.style.transform = `translateY(${(-(1 - b) * 101).toFixed(2)}%)`;
  barsB.style.transform = `translateY(${((1 - b) * 101).toFixed(2)}%)`;
  scrimP.style.opacity = G.scrimP.toFixed(3); scrimH.style.opacity = G.scrimH.toFixed(3);
  progEl.style.opacity = G.prog.toFixed(3); srcEl.style.opacity = (0.9 * G.src).toFixed(3);
  blackEl.style.opacity = G.black.toFixed(3); logoEl.style.opacity = G.logo.toFixed(3);
}

// ================================================================== clock
let frame = -1;
let cueIdx = 0;
function stepTo(f) {
  const t = f * DT;
  while (cueIdx < CUES.length && CUES[cueIdx].t <= t + 1e-6) CUES[cueIdx++].fn();
  tweens.update(f === 0 ? 0 : DT);
  const k = 1 - Math.exp(-DT * 5);
  for (const i of [0, 1]) off[i] = Math.abs(offT[i] - off[i]) < 0.2 ? offT[i] : off[i] + (offT[i] - off[i]) * k;
}
let NOW = 0;
function renderFrame() {
  const time = frame * DT;
  NOW = time;
  effects(time);
  camera.aspect = W / H;
  camera.setViewOffset(W, H, off[0], off[1], W, H);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  drawLabels();
  drawFinder(time);
  chrome();
}
function seek(f) {
  while (frame < f) { frame++; stepTo(frame); }
  renderFrame();
  return frame;
}

// ================================================================== start
function init() {
  setMode('hero');
  off[0] = offT[0]; off[1] = offT[1];
  const p = computePose(CH.intro.cam);
  const far = p.target.clone().add(p.pos.clone().sub(p.target).multiplyScalar(2.1)); far.y += 6;
  setCam(far, p.target, 30);
  scene.fog.near = 30; scene.fog.far = 90;
  buildTimeline();
  window.__film.frames = Math.ceil(TOTAL * FPS);
  window.__film.total = TOTAL;
  window.__film.scenes = SCENES.map(s => ({ id: s.id, t0: s.t0, dur: s.dur }));
  window.__film.ready = true;
}
window.__film = { ready: false, fps: FPS, seek, frames: 0 };
if (SHORT) { const ph = document.querySelector('#logocard .ph'); if (ph) ph.textContent = 'Full builder’s guide at towerdoors.com.au'; }
document.fonts.ready.then(() => requestAnimationFrame(init));
