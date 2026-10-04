// Chapters of the builder's guide. All requirements are taken from
// "Ceiling Fixing · Truss Roof · Rev C · October 2026" (Tower).
import { PADS, GPO, K, DETAIL, LINTEL, TRACK, JAMB } from './model.js';

const P = Object.fromEntries(PADS.map(p => [p.id, p]));
const yD = K.Y_CH + 0.03;            // plan dimensions sit just above the framing
const pill = id => `<b>${id}</b><small>${P[id].size}</small>`;

export const DEFAULT_STATE = {
  ground: 1, slab: 1, frontWall: 1, frontHead: 1, sideWalls: 1, backWall: 1, lining: 0, chords: 1, trussUpper: 1,
  battensKeep: 1, battensCut: 1, sideRoomPlan: 0, hl_sideL: 0, hl_sideR: 0, hl_head: 0, door: 1, hardware: 0,
  straightedge: 0, padOutlines: 0, gpo: 0, so_datum: 0, so_edgeL: 0, so_edgeR: 0, so_cl: 0,
  'zone:*': 0, 'nog:*': 0, 'fill:*': 0, 'halo:*': 0, detail: 0, doorOpen: 0, dust: 0, hangerHL: 0,
  lintel: 0, blocking: 0, blockShort: 0, springs: 0, springCoil: 0, voidAll: 0, voidEnds: 0, jamb: 0,
};
const PLAN = { lining: 1, trussUpper: 0.03, chords: 0.5, battensKeep: 0.28, battensCut: 0.28, sideRoomPlan: 0.9, door: 0, slab: 0.5, ground: 0.55, sideWalls: 0.7, backWall: 0.8 };
const BUILT = { battensCut: 0, 'nog:*': 1, 'fill:*': 1 };
// the section close-up: everything but the cut sample of ceiling at pad L1 fades away
const SECTION = {
  ground: 0.2, slab: 0, frontWall: 0, frontHead: 0, sideWalls: 0, backWall: 0, chords: 0, trussUpper: 0, battensKeep: 0, battensCut: 0,
  door: 0, lining: 0, hardware: 0, hangerHL: 0, 'nog:*': 0, 'fill:*': 0, dust: 0, detail: 1,
};
const { XC, RZ } = DETAIL;           // section plane and the hanger's position in the close-up
// the jamb close-up: everything but the cut sample of the right-hand jamb fades away
const JSECTION = {
  ground: 0.2, slab: 0, frontWall: 0, frontHead: 0, sideWalls: 0, backWall: 0, chords: 0, trussUpper: 0, battensKeep: 0, battensCut: 0,
  door: 0, lining: 0, hardware: 0, 'nog:*': 0, 'fill:*': 0, dust: 0, jamb: 1,
};
const JT = JAMB.top;                 // cut height of the jamb sample
// the steel lintel cut away: the wall above the opening ghosts back to show the beam and its blocking
const LINT = { frontHead: 0.1, lintel: 1, sideWalls: 0.3, lining: 0.85, trussUpper: 0.12 };
const SPRINGS = { springs: 1, springCoil: 1 };

const CAM = {
  hero: { target: [0, 2.15, 2.5], dir: [0.66, 0.5, -0.56], frame: [9.4, 6.2], fov: 30 },
  why: { target: [-0.25, 2.72, 1.95], dir: [0.36, -0.36, 0.86], frame: [6.8, 3.7], fov: 50, narrow: { target: [-0.6, 2.75, 2.0], frame: [3.8, 3.0], fov: 72 } },
  before: { target: [0, 2.95, 2.8], dir: [-0.58, 0.64, 0.52], frame: [8.6, 5.6], fov: 30 },
  plan: { target: [0, K.CEIL, 2.15], dir: [0, 1, 0.045], frame: [7.8, 5.8], fov: 30 },
  planSide: { target: [0, K.CEIL, 1.25], dir: [0, 1, 0.045], frame: [7.8, 3.9], fov: 30, narrow: { target: [-2.2, K.CEIL, 1.3], frame: [2.95, 3.95] } },
  planCentre: { target: [0, K.CEIL, 2.0], dir: [0, 1, 0.045], frame: [7.8, 5.5], fov: 30, narrow: { target: [0, K.CEIL, 2.05], frame: [2.4, 5.1] } },
  below: { target: [-2.55, 3.03, 1.3], dir: [0.54, -0.42, 0.72], frame: [3.2, 2.0], fov: 40, narrow: { frame: [2.2, 1.6], fov: 64 } },
  belowFill: { target: [-2.7, 3.03, 1.3], dir: [0.6, -0.5, 0.62], frame: [1.7, 1.05], fov: 38, narrow: { frame: [1.2, 0.9], fov: 60 } },
  belowFlush: { target: [-2.6, 3.0, 1.3], dir: [0.5, -0.46, 0.74], frame: [2.7, 1.7], fov: 40, narrow: { frame: [2.0, 1.4], fov: 62 } },
  hangerCtx: { target: [-2.47, 2.89, 1.15], dir: [0.8, -0.48, 0.32], frame: [1.7, 0.9], fov: 40, narrow: { frame: [1.15, 0.85], fov: 56 } },
  fixClose: { target: [XC, 2.968, RZ], dir: [1, -0.17, 0.27], frame: [0.66, 0.36], fov: 30, narrow: { frame: [0.44, 0.33] } },
  loadClose: { target: [XC, 2.93, RZ], dir: [1, -0.17, 0.27], frame: [0.66, 0.44], fov: 30, narrow: { frame: [0.44, 0.42] } },
  failsClose: { target: [XC, 2.99, RZ + 0.03], dir: [1, -0.1, 0.27], frame: [0.72, 0.44], fov: 30, narrow: { frame: [0.5, 0.4] } },
  sideAll: { target: [0, 1.4, 0], dir: [0.16, 0.12, 1], frame: [5.9, 3.1], fov: 44, narrow: { target: [2.05, 1.4, 0], dir: [-0.3, 0.12, 1], frame: [1.5, 3.0], fov: 56 } },
  jamb: { target: [2.49, JAMB.top - 0.06, -0.03], dir: [-0.32, 0.72, 0.62], frame: [0.58, 0.4], fov: 30, narrow: { frame: [0.48, 0.46] } },
  headAll: { target: [0, 2.45, 0], dir: [0.1, -0.06, 1], frame: [6.1, 1.9], fov: 44, narrow: { target: [1.3, 2.45, 0], frame: [3.4, 2.0], fov: 60 } },
  system: { target: [0.1, 1.7, 1.4], dir: [0.36, 0.02, 0.93], frame: [6.8, 3.6], fov: 58, narrow: { target: [0.6, 1.8, 1.4], frame: [4.6, 4.2], fov: 74 } },
  lintel: { target: [2.45, 2.83, -0.05], dir: [0.93, -0.1, 0.36], frame: [1.2, 0.5], fov: 40, narrow: { target: [2.6, 2.83, -0.05], frame: [0.9, 0.6], fov: 50 } },
  lintelHalf: { target: [1.66, 2.83, 0.03], dir: [0.46, -0.2, 0.86], frame: [2.7, 0.55], fov: 40, narrow: { target: [2.2, 2.82, 0.03], dir: [0.5, -0.14, 0.85], frame: [1.15, 0.6], fov: 50 } },
  lintelEnd: { target: [2.38, 2.82, 0.02], dir: [0.42, -0.12, 0.9], frame: [1.05, 0.5], fov: 40, narrow: { target: [2.3, 2.82, 0.03], frame: [0.95, 0.6], fov: 50 } },
  hold: { target: [0, 3.0, 2.25], dir: [0.16, -0.42, 0.89], frame: [6.6, 4.3], fov: 56, narrow: { target: [-0.5, 3.0, 2.0], dir: [0.12, -0.3, 0.95], frame: [4.6, 3.0], fov: 72 } },
  end: { target: [0, 2.2, 2.6], dir: [-0.62, 0.48, -0.6], frame: [9.4, 6.2], fov: 30 },
};

// ---------------------------------------------------------------- dimension sets (metres)
const D = (a, b, text, o = {}) => ({ a, b, text, ...o });
const openingDims = [
  D([-2.55, yD, -0.52], [-2.4, yD, -0.52], '150', { ext: [[[-2.55, yD, -0.25], [-2.55, yD, -0.58]]] }),
  D([-2.4, yD, -0.52], [2.4, yD, -0.52], 'Garage door opening'),
  D([2.4, yD, -0.52], [2.55, yD, -0.52], '150', { ext: [[[2.55, yD, -0.25], [2.55, yD, -0.58]]] }),
];
function sideDims(s) {               // s = -1 left, +1 right
  const xi = s * 2.25, xc = s * 2.09, xk = s * 1.86, xo = s * 2.85, xe = s * 2.4;
  const ext = [1.0, 1.6, 2.2, 2.8].map(z => [[xi, yD, z], [xc + s * 0.03, yD, z]]);
  const extC = [1.3, 2.5].map(z => [[xi, yD, z], [xk + s * 0.03, yD, z]]);
  const lab = s < 0 ? ['450', '150'] : ['150', '450'];
  const xs = s < 0 ? [xo, xe, xi] : [xi, xe, xo];
  return [
    D([xc, yD, 0], [xc, yD, 1.0], '1000', { ext, side: s }),
    D([xc, yD, 1.0], [xc, yD, 1.6], '600', { side: s }),
    D([xc, yD, 1.6], [xc, yD, 2.2], '600', { side: s }),
    D([xc, yD, 2.2], [xc, yD, 2.8], '600', { side: s }),
    D([xk, yD, 0], [xk, yD, 1.3], '1300', { ext: extC, side: s }),
    D([xk, yD, 1.3], [xk, yD, 2.5], '1200', { side: s }),
    D([xs[0], yD, 2.94], [xs[1], yD, 2.94], lab[0], { side: 1, ext: [xo, xi].map(x => [[x, yD, 2.8], [x, yD, 2.98]]) }),
    D([xs[1], yD, 2.94], [xs[2], yD, 2.94], lab[1], { side: 1 }),
  ];
}
const centreDims = [
  D([-0.46, yD, 0], [-0.46, yD, 1.25], '1250', { ext: [1.25, 1.75, 2.85, 3.85].map(z => [[-0.3, yD, z], [-0.43, yD, z]]) }),
  D([-0.46, yD, 1.25], [-0.46, yD, 1.75], '500'),
  D([-0.46, yD, 1.75], [-0.46, yD, 2.85], '1100'),
  D([-0.46, yD, 2.85], [-0.46, yD, 3.85], '1000'),
  D([-0.68, yD, 0], [-0.68, yD, 2.85], '2850', { ext: [[[-0.46, yD, 2.85], [-0.65, yD, 2.85]]] }),
  D([0.46, yD, 0], [0.46, yD, 1.5], '1500', { side: 1, ext: [1.5, 3.35].map(z => [[0.3, yD, z], [0.49, yD, z]]) }),
  D([0.46, yD, 1.5], [0.46, yD, 3.35], '1850', { side: 1 }),
  D([-0.3, yD, 1.86], [0.3, yD, 1.86], '600', { side: 1 }),
  D([-0.3, yD, 3.96], [0.3, yD, 3.96], '600', { side: 1 }),
];
const sideRoomDims = [
  D([-2.55, 0.95, 0.03], [-2.4, 0.95, 0.03], '150 min', { side: 1 }),
  D([2.4, 0.95, 0.03], [2.55, 0.95, 0.03], '150 min', { side: 1 }),
];
const headRoomDims = [
  D([2.74, K.DOOR_H, 0.03], [2.74, K.CEIL, 0.03], '300 min', { side: 1, ext: [[[2.55, K.DOOR_H, 0.03], [2.78, K.DOOR_H, 0.03]], [[2.55, K.CEIL, 0.03], [2.78, K.CEIL, 0.03]]] }),
];
// the jamb close-up: 150 of side room, measured across the top of the cut, beyond the wall
const jambDims = [
  D([K.OPEN, JT, -0.31], [K.OPEN + K.SIDE, JT, -0.31], '150 min', { side: -1, ext: [[[K.OPEN, JT, -0.25], [K.OPEN, JT, -0.335]], [[K.OPEN + K.SIDE, JT, -0.25], [K.OPEN + K.SIDE, JT, -0.335]]] }),
];

// ---------------------------------------------------------------- lintel sections (I-beam and U-beam, blocking between the flanges)
const lintelProfiles = (() => {
  const S = 0.6;                                   // px per mm
  const H = 250 * S, TF = 10 * S, top = 18, bot = top + H;
  const steel = (x, y, w, h) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#lp-hatch)" class="lp-steel" stroke-width=".8"/>`;
  const lvl = (x, y, w, h) => {
    let lines = '';
    for (let yy = y + 9; yy < y + h - 3; yy += 9) lines += `<line x1="${(x + 2).toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(x + w - 2).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(40,12,2,.32)" stroke-width=".8"/>`;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#DA5E2D" class="lp-lvl" stroke-width=".8"/>${lines}`;
  };
  const beam = (x0, flange, web, webAtBack, name) => {
    const fw = flange * S, ww = web * S, xr = x0 + fw;              // garage side (flange tips) on the right
    const wx = webAtBack ? x0 : x0 + (fw - ww) / 2;
    return steel(x0, top, fw, TF) + steel(x0, bot - TF, fw, TF) + steel(wx, top + TF, ww, H - 2 * TF)
      + lvl(wx + ww, top + TF, xr - (wx + ww), H - 2 * TF)
      + `<line x1="${xr.toFixed(1)}" y1="${top - 10}" x2="${xr.toFixed(1)}" y2="${bot + 10}" class="lp-flush" stroke-width="1" stroke-dasharray="3 3"/>`
      + `<text x="${(x0 + fw / 2).toFixed(1)}" y="${bot + 30}" text-anchor="middle" class="lp-t">${name}</text>`;
  };
  return `<svg viewBox="0 0 380 ${bot + 40}" role="img" aria-label="Sections through an I-beam and a U-beam lintel, blocked out with LVL between the flanges, flush with them">
    <defs><pattern id="lp-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" class="lp-hb"/><line x1="0" y1="0" x2="0" y2="5" class="lp-hl" stroke-width="1.4"/></pattern></defs>
    ${beam(46, 146, 7, false, 'I-beam')}
    ${beam(214, 90, 8, true, 'U-beam')}
    <text x="${(46 + 146 * S + 8).toFixed(1)}" y="${top + 6}" class="lp-n">Flush</text>
    <text x="${(214 + 90 * S + 8).toFixed(1)}" y="${top + 6}" class="lp-n">Flush</text>
    <text x="370" y="${(top + H / 2).toFixed(1)}" text-anchor="end" class="lp-g">Garage side ›</text>
  </svg>`;
})();

// ---------------------------------------------------------------- labels
const padPills = (ids, y) => ids.map(id => ({ p: [P[id].cx, y, P[id].cz], html: pill(id), cls: 'pad', pad: id }));
const lDatum = { p: [-1.35, K.Y_CH, 0], text: 'Back of opening · datum', cls: 'line', dy: -16 };
const lEdgeL = { p: [-2.4, K.Y_CH, 4.45], text: 'Edge of opening', cls: 'line', dx: -58 };
const lEdgeR = { p: [2.4, K.Y_CH, 4.45], text: 'Edge of opening', cls: 'line', dx: 58 };
const lCL = { p: [0, K.Y_CH, 4.6], text: 'Centreline', cls: 'line', dy: 14 };

// ---------------------------------------------------------------- chapters
export const CHAPTERS = [
  {
    id: 'intro', hero: true, cam: CAM.hero, auto: true,
    state: { 'zone:*': 1 },
  },
  {
    id: 'why', num: 1, nav: 'Why it matters', cam: CAM.why,
    state: { lining: 0.2, 'zone:*': 1, 'halo:*': 0.9, hardware: 1, springs: 1, springCoil: 1, trussUpper: 0.45, backWall: 0, sideWalls: 0.55, doorOpen: 1, dust: 1 },
    door: { delay: 0.6, dur: 3.6 },
    // pad M's pill and the motor label sit clear of the gap between the motor and the open door
    labels: [...padPills(['L1', 'L2', 'R1', 'R2', 'A'], K.CEIL - 0.004),
      { p: [P.M.x1, K.CEIL - 0.004, P.M.z2 - 0.05], html: pill('M'), cls: 'pad', pad: 'M', dx: -46, dy: -14 },
      { p: [0.19, 2.86, 3.7], text: 'Motor', cls: 'ghost', dx: 66, dy: -30 }],
    html: `
      <div class="sl"><em>01</em>Why it matters</div>
      <h2 class="ttl">The door hangs from your ceiling</h2>
      <p class="lead">Behind the opening, the door's hangers and motor fix up through the ceiling lining at set positions. Each position needs a solid pad behind the lining.</p>
      <div class="tiles">
        <div class="tile"><div class="v">5</div><div class="l">Pads on every door</div></div>
        <div class="tile"><div class="v">+1</div><div class="l">Pad A, unless Tower confirms 330&nbsp;kg or less</div></div>
        <div class="tile"><div class="v">0<small>mm</small></div><div class="l">Gap to the lining</div></div>
      </div>
      <p class="body">Every pad is solid LVL, or as the engineer specifies, hard against the back of the lining. A fixing into plasterboard or a batten alone is not acceptable.</p>
      <div class="acts"><button class="t-chip" data-act="door">Replay the door</button></div>
      <p class="fine">Door hardware shown is indicative. Drag to look around.</p>`,
  },
  {
    id: 'before', num: 2, nav: 'Before you start', cam: CAM.before,
    state: { so_datum: 0.9 },
    labels: [
      { p: [-1.5, 3.66, 1.0], text: 'Roof trusses · by builder', cls: 'line', dx: -40, dy: -34 },
      { p: [1.4, K.Y_LIN + 0.02, 4.15], text: 'Ceiling battens or furring channels', cls: 'line', dx: 30, dy: 40 },
      { p: [1.8, K.Y_BAT, -0.02], text: 'Back of opening', cls: 'line', dx: 60, dy: 44 },
    ],
    html: `
      <div class="sl"><em>02</em>Before you start</div>
      <h2 class="ttl">Settle four things first</h2>
      <div class="list num">
        <div class="lr"><div class="k"><em>01</em>Door weight</div><div class="d">Get it from Tower, ideally before the trusses are ordered. The truss designer confirms the trusses for the door loads; the truss designer or your engineer details the nogging members and fixings. Pad positions, sizes and the no-cavity rule stay as drawn.</div></div>
        <div class="lr"><div class="k"><em>02</em>Pad A</div><div class="d">Install it unless Tower has confirmed in writing that the door is 330 kg or less.</div></div>
        <div class="lr"><div class="k"><em>03</em>Your ceiling</div><div class="d">This guide covers lining fixed to battens or furring channels under trusses. Lining fixed direct to the trusses: the noggings finish flush with the underside of the bottom chords. Suspended ceilings: contact Tower. Ceilings framed with joists: Tower's stick-framed roof document applies, with identical setout and pad sizes.</div></div>
        <div class="lr"><div class="k"><em>04</em>Wall clearance</div><div class="d">If a wall is closer than 450 mm to an edge of the opening, contact Tower before framing.</div></div>
      </div>
      <p class="fine">Other door types or heights: Tower supplies the setout.</p>`,
  },
  {
    id: 'setout', num: 3, nav: 'Setout', cam: CAM.plan,
    state: { ...PLAN },
    html: `
      <div class="sl"><em>03</em>Setout</div>
      <h2 class="ttl">Three lines set out every pad</h2>
      <p class="lead">Every pad is measured from the back of the opening, the edges of the opening and its centreline. Opening widths vary from job to job; for behind-fit doors up to 3100 high, these distances don't.</p>
      <div class="subs" data-subs></div>
      <p class="fine">Mark all three lines before any nogging is cut. Trusses are drawn front to back for illustration only; their spacing and direction change nothing on this plan.</p>`,
    subs: [
      { chip: 'Back of opening', title: 'The back of the opening', text: 'The setout datum, on the garage side of the opening. Every depth on the plan is measured back from this line.', state: { so_datum: 1 }, labels: [lDatum] },
      { chip: 'Edges', title: 'The edges of the opening', text: 'Each side pad straddles an edge: 450 outside it and 150 inside it. The side room beside each edge is solid fixing, 150 minimum.', state: { so_datum: 1, so_edgeL: 1, so_edgeR: 1 }, labels: [lDatum, lEdgeL, lEdgeR], dims: openingDims },
      { chip: 'Centreline', title: 'The centreline', text: 'Pads A and M sit 300 each side of the centreline of the opening.', state: { so_datum: 1, so_edgeL: 1, so_edgeR: 1, so_cl: 1 }, labels: [lDatum, lEdgeL, lEdgeR, lCL], dims: openingDims },
    ],
  },
  {
    id: 'side', num: 4, nav: 'Side pads', cam: CAM.planSide,
    state: { ...PLAN, so_datum: 0.8, so_edgeL: 0.7, so_edgeR: 0.7, so_cl: 0.35, 'zone:L1': 1, 'zone:L2': 1, 'zone:R1': 1, 'zone:R2': 1 },
    labels: padPills(['L1', 'L2', 'R1', 'R2'], K.Y_CH + 0.004),
    dims: [...sideDims(-1), ...sideDims(1)],
    html: `
      <div class="sl"><em>04</em>Side pads</div>
      <h2 class="ttl">Four pads, two each side</h2>
      <p class="lead">L1, L2, R1 and R2 take the door's hangers. Each is at least 600 × 600, set 450 outside and 150 inside the edge of the opening.</p>
      <div class="spec">
        <div class="lr"><div class="k">L1 · R1</div><div class="d">1000 to 1600 from the back of the opening</div></div>
        <div class="lr"><div class="k">L2 · R2</div><div class="d">2200 to 2800 from the back of the opening</div></div>
        <div class="lr"><div class="k">Centres</div><div class="d">1300 and 2500, 1200 apart</div></div>
      </div>
      <div class="acts"><button class="t-chip" data-pad="L1">L1</button><button class="t-chip" data-pad="L2">L2</button><button class="t-chip" data-pad="R1">R1</button><button class="t-chip" data-pad="R2">R2</button></div>
      <p class="fine">Dimensions in millimetres. Tap a pad for its full setout. Trusses are illustrative; their spacing and direction change nothing on this plan.</p>`,
  },
  {
    id: 'centre', num: 5, nav: 'Centre pads', cam: CAM.planCentre,
    state: { ...PLAN, so_datum: 0.8, so_edgeL: 0.4, so_edgeR: 0.4, so_cl: 0.8, 'zone:*': 0.28, 'zone:A': 1, 'zone:M': 1, gpo: 1 },
    labels: [...padPills(['A', 'M'], K.Y_CH + 0.004), { p: [GPO.x, K.Y_LIN, GPO.z], text: 'GPO', cls: 'line', dx: -44, dy: 16 }, { p: [0.78, K.Y_LIN, 3.9], text: 'GPO zone', cls: 'line', dx: 40, dy: 28 }],
    dims: centreDims,
    html: `
      <div class="sl"><em>05</em>Centre pads</div>
      <h2 class="ttl">The motor pad and pad A</h2>
      <div class="spec">
        <div class="lr"><div class="k">Pad M</div><div class="d">The motor. At least 1000 × 600, from 2850 to 3850, 300 each side of the centreline.</div></div>
        <div class="lr"><div class="k">Pad A</div><div class="d">At least 500 × 600, from 1250 to 1750, 300 each side of the centreline. It is for doors over 330 kg: install it unless Tower has confirmed in writing that the door is 330 kg or less.</div></div>
        <div class="lr"><div class="k">GPO</div><div class="d">240 V 10 A, in the ceiling, clear of pad M, 300 to 950 from its centre.</div></div>
      </div>
      <div class="acts"><button class="t-chip" data-pad="M">Pad M</button><button class="t-chip" data-pad="A">Pad A</button></div>
      <p class="fine">Millimetres from the back of the opening. Sizes are minimums: a pad may be larger, never smaller, out of position or short of the lining. Trusses are illustrative only.</p>`,
  },
  {
    id: 'build', num: 6, nav: 'Build each pad', cam: CAM.below,
    state: { trussUpper: 0.18, door: 0, padOutlines: 1, sideWalls: 0.6, dust: 0.8 },
    labels: [{ p: [P.L1.cx, K.Y_LIN - 0.004, P.L1.cz], html: pill('L1'), cls: 'pad', pad: 'L1' }],
    html: `
      <div class="sl"><em>06</em>Build each pad</div>
      <h2 class="ttl">Hard against the lining</h2>
      <p class="lead">At every pad, LVL noggings fixed to the trusses fill the batten cavity, flush with the underside of the battens. Shown here at pad L1.</p>
      <div class="subs" data-subs></div>
      <p class="fine">Nogging member size and fixing to the engineer's detail; pad positions, sizes and the no-cavity rule stay as drawn. Lining fixed direct to the trusses, with no battens: the noggings finish flush with the underside of the bottom chords.</p>`,
    subs: [
      { chip: 'Battens', title: 'Cut the battens back', text: 'Across each pad, the nogging takes the place of the battens, to the engineer’s detail.', state: { battensCut: 0, 'zone:*': 0.2 }, labels: [{ p: [-2.25, K.Y_LIN + 0.02, 1.48], text: 'Battens cut back across the pad', cls: 'line', dx: 90, dy: 70 }] },
      { chip: 'LVL', title: 'Fit LVL between the trusses', text: 'LVL noggings, or as specified by the engineer, fixed to the trusses and tight from truss to truss across the full pad. The solid area may finish larger than the pad.', state: { battensCut: 0, 'nog:*': 1 }, labels: [{ p: [-3.0, K.Y_LIN + 0.03, 1.25], text: 'LVL nogging · fixed to the trusses', cls: 'line', dx: -30, dy: 58 }] },
      { chip: 'Chord', title: 'Fill under the chord', text: 'Where a truss crosses a pad, fix solid LVL under its bottom chord as well, flush with the nogging: fixed fill, not a loose packer.', cam: CAM.belowFill, state: { battensCut: 0, 'nog:*': 1, 'fill:*': 1 }, labels: [{ p: [-2.7, K.Y_LIN + 0.01, 1.1], text: 'Fill under the chord', cls: 'line', dx: 40, dy: 50 }] },
      { chip: 'Flush', title: 'Check it flush', text: 'Run a straightedge across the pad and the battens. Every nogging finishes flush with the underside of the battens. No gap, no step, no loose packers.', cam: CAM.belowFlush, state: { battensCut: 0, 'nog:*': 1, 'fill:*': 1, straightedge: 1 }, labels: [{ p: [-2.62, K.Y_LIN - 0.02, 1.75], text: 'Straightedge · 0 mm', cls: 'warnok', dy: 34 }] },
      { chip: 'Result', title: 'Ready for the lining', text: 'Once lined, the board sits hard against solid timber across the whole pad. Don’t line it yet: the hold point in step 12 comes first.', state: { battensCut: 0, 'nog:*': 1, 'fill:*': 1, lining: 0.38 }, labels: [{ p: [-2.55, K.CEIL, 1.15], text: 'Lining · 0 mm to the LVL', cls: 'line', dx: 80, dy: 64 }] },
    ],
  },
  {
    id: 'fixing', num: 7, nav: 'Fixing the hanger', cam: CAM.hangerCtx,
    state: { ...BUILT, lining: 0.55, hardware: 1, door: 0, trussUpper: 0.2, sideWalls: 0.5, backWall: 0, hangerHL: 1, dust: 0.6 },
    html: `
      <div class="sl"><em>07</em>Fixing the hanger</div>
      <h2 class="ttl">Screwed into solid LVL</h2>
      <p class="lead">Once the ceiling is lined, Tower's installers fix the door's hangers and motor up through the lining into the pads. This is what the pads are for.</p>
      <div class="subs" data-subs></div>
      <div class="acts"><button class="t-chip" data-act="replayfix">Replay the fixing</button></div>
      <p class="fine">Shown at the front hanger on pad L1. Brackets and screws are indicative: Tower supplies and fixes them.</p>`,
    subs: [
      {
        chip: 'Bracket', title: 'The hanger bracket',
        text: 'The door\u2019s horizontal tracks hang from brackets fixed up into the side pads, and the motor from pad M. Pad A takes a further fixing for doors over 330\u00a0kg.',
        labels: [
          { p: [-2.45, 2.93, 1.3], text: 'Hanger bracket · by Tower', cls: 'warnok', dx: 84, dy: 46 },
          { p: [-2.3, K.Y_LIN + 0.06, 1.05], text: 'Pad L1 · LVL above the lining', cls: 'line', dx: 90, dy: -50 },
          { p: [-2.45, 2.83, 1.75], text: 'Horizontal track', cls: 'line', dx: 20, dy: 44 },
        ],
      },
      {
        chip: 'Screws', tag: 'ok', tagText: 'Correct', title: 'Screws into solid LVL',
        text: 'The bracket goes up tight to the lining. Its screws pass through the lining and bite into the LVL hard against it, with nothing between.',
        cam: CAM.fixClose, state: SECTION, variant: 'ok', fix: 'drive',
        labels: [
          { p: [XC, K.Y_CH - 0.03, RZ + 0.17], text: 'LVL nogging · pad L1', cls: 'line', dx: -30, dy: -52 },
          { p: [XC, K.CEIL + 0.004, RZ + 0.19], text: 'Lining', cls: 'line', dx: -24, dy: 46 },
          { p: [XC, 2.87, RZ - 0.02], text: 'Hanger bracket · by Tower', cls: 'line', dx: 110, dy: 18 },
          { p: [XC, 3.045, RZ - 0.08], text: 'Screws bite into solid LVL', cls: 'warnok', dx: 96, dy: -58, at: 3.1 },
        ],
      },
      {
        chip: 'Load', title: 'Carrying the door',
        text: 'The door hangs from its brackets. The screws carry this bracket\u2019s share of the load into solid timber, so the fixing holds and the lining stays put.',
        cam: CAM.loadClose, state: SECTION, variant: 'ok', fix: 'load',
        labels: [
          { p: [XC, K.Y_CH - 0.03, RZ + 0.17], text: 'LVL nogging · pad L1', cls: 'line', dx: -30, dy: -52 },
          { p: [XC, 2.80, RZ], html: '<i></i><span>Door load</span>', cls: 'load', dy: 50, n: { dx: 58, dy: -36 }, noLeader: true, follow: 'rig', at: 0.2 },
          { p: [XC, K.CEIL, RZ - 0.13], text: 'Holds · 0 mm to the LVL', cls: 'warnok', dx: 92, dy: 44, at: 1.1 },
        ],
      },
    ],
  },
  {
    id: 'fails', num: 8, nav: 'What fails', cam: CAM.failsClose,
    state: { ...SECTION },
    html: `
      <div class="sl"><em>08</em>What fails</div>
      <h2 class="ttl">Three ways a pad fails</h2>
      <p class="lead">The same section through pad L1, done wrong. In each, the lining has nothing solid hard against it where the bracket is fixed.</p>
      <div class="subs" data-subs></div>
      <div class="acts"><button class="t-chip" data-act="replayfix">Replay</button></div>
      <p class="fine">If the timber is not there, not flush, or not where it is drawn, the door cannot be installed to Tower's standard. Member sizes and fixings are indicative.</p>`,
    subs: [
      {
        chip: 'Set high', tag: 'bad', title: 'Set high',
        text: 'The nogging stops at the trusses, leaving the batten cavity open. Tightening the screws pulls the lining up into the gap and crushes it: nothing solid is hard against the lining at the fixing.',
        variant: 'high', fix: 'gap',
        labels: [
          { p: [XC, K.Y_LIN + 0.017, 1.5], text: 'Gap', cls: 'warn', dx: -40, dy: -34 },
          { p: [XC, K.Y_CH - 0.02, 1.08], text: 'LVL set high', cls: 'line', dx: 56, dy: -44 },
          { p: [XC, K.CEIL, RZ - 0.15], text: 'Lining pulled into the gap', cls: 'warn', dx: 96, dy: 42, follow: 'plug', n: { p: [XC, K.CEIL, RZ + 0.15], dx: -24, dy: 58 }, at: 3.4 },
        ],
      },
      {
        chip: 'On top', tag: 'bad', title: 'On top of the trusses',
        text: 'Laid on top of the trusses, the chord and batten depth is a cavity behind the lining. The screws can\u2019t reach the LVL, and the fixing can pull through the lining.',
        variant: 'top', fix: 'pull',
        labels: [
          { p: [XC, K.Y_CH + 0.04, 1.08], text: 'LVL on top', cls: 'line', dx: 56, dy: -40 },
          { p: [XC, K.Y_BAT + 0.03, 1.44], text: 'Cavity', cls: 'warn', dx: -6, dy: -40 },
          { p: [XC, 3.068, RZ - 0.08], text: 'Nothing to bite', cls: 'warn', dx: 92, dy: -34, at: 3.2 },
          { p: [XC, 2.80, RZ], html: '<i></i><span>Door load</span>', cls: 'load', dy: 50, n: { dx: 58, dy: -36 }, noLeader: true, follow: 'rig', at: 3.6 },
          { p: [XC, K.CEIL, RZ - 0.15], text: 'Pulls through the lining', cls: 'warn', dx: 96, dy: 40, follow: 'plug', n: { p: [XC, K.CEIL, RZ + 0.15], dx: -24, dy: 58 }, at: 4.6 },
        ],
      },
      {
        chip: 'Battens only', tag: 'bad', title: 'Battens only',
        text: 'No nogging. The fixing holds only plasterboard or a batten, and can pull through the lining.',
        variant: 'battens', fix: 'pull',
        labels: [
          { p: [XC, K.Y_LIN + 0.018, 1.45], text: 'Batten', cls: 'line', dx: -40, dy: -44 },
          { p: [XC, 3.068, RZ - 0.08], text: 'Nothing to bite', cls: 'warn', dx: 92, dy: -34, at: 3.2 },
          { p: [XC, 2.80, RZ], html: '<i></i><span>Door load</span>', cls: 'load', dy: 50, n: { dx: 58, dy: -36 }, noLeader: true, follow: 'rig', at: 3.6 },
          { p: [XC, K.CEIL, RZ - 0.15], text: 'Pulls through the lining', cls: 'warn', dx: 96, dy: 40, follow: 'plug', n: { p: [XC, K.CEIL, RZ + 0.15], dx: -24, dy: 58 }, at: 4.6 },
        ],
      },
    ],
  },
  {
    id: 'sideroom', num: 9, nav: 'Side room', cam: CAM.sideAll,
    state: { ...BUILT, lining: 0.6, backWall: 0, trussUpper: 0.25, sideWalls: 0.6, dust: 1, hardware: 1 },
    html: `
      <div class="sl"><em>09</em>Side room</div>
      <h2 class="ttl">Room for the tracks</h2>
      <p class="lead">The door runs in vertical tracks either side of the opening. Each track sits on a mounting angle screwed into the side room beside it, so the side room has to be solid.</p>
      <div class="subs" data-subs></div>
      <div class="acts" data-for-subs="1,2,3"><button class="t-chip" data-act="replayfix">Replay</button></div>
      <p class="fine">Track and mounting angle are indicative: Tower supplies and fixes them. Close-ups show the right-hand side; the left is the same, handed.</p>`,
    subs: [
      {
        chip: 'Side room', title: 'Either side of the opening',
        text: 'Solid fixing, at least 150 mm beside each edge of the opening, from the floor to the head. The vertical tracks fix here, so no side jambs are needed.',
        state: { hl_sideL: 1, hl_sideR: 1, hardware: 0.4, door: 0.5 }, dims: sideRoomDims,
        labels: [
          { p: [-2.52, 1.65, 0.01], text: 'Side room', cls: 'line', dx: 84 },
          { p: [2.52, 1.65, 0.01], text: 'Side room', cls: 'line', dx: -84 },
          { p: [TRACK.xc, 2.2, TRACK.z1], text: 'Vertical track', cls: 'line', dx: -96, dy: -30 },
        ],
      },
      {
        chip: 'Tracks', tag: 'ok', tagText: 'Correct', title: 'Tracks fixed into solid',
        text: 'The track and its mounting angle take up the side room, and the angle is screwed into it, so the full 150 mm must be solid.',
        cam: CAM.jamb, state: JSECTION, jamb: 'ok', dims: jambDims,
        labels: [
          { p: [2.475, JT, -0.16], text: 'Side room · solid', cls: 'line', dx: 70, dy: -40 },
          { p: [2.33, JT, 0.06], text: 'Door', cls: 'line', dx: -40, dy: -30 },
          { p: [TRACK.x0 + 0.002, JT, 0.06], text: 'Vertical track', cls: 'line', dx: -50, dy: 46 },
          { p: [2.54, JT, 0.002], text: 'Mounting angle', cls: 'line', dx: 92, dy: 44, follow: 'asm' },
          { p: [JAMB.sx, JAMB.y, -0.04], text: 'Screwed into solid', cls: 'warnok', dx: 120, dy: -26, at: 2.2 },
        ],
      },
      {
        chip: 'Too narrow', tag: 'bad', title: 'Less than 150 mm',
        text: 'With less than 150 mm of solid fixing, the angle’s screws can miss the solid altogether: here they hold only plasterboard. Side jambs are then needed for the tracks to fix to: contact Tower.',
        cam: CAM.jamb, state: JSECTION, jamb: 'narrow', dims: jambDims,
        labels: [
          { p: [2.44, JT, -0.16], text: 'Only 80 mm solid', cls: 'warn', dx: -40, dy: -40 },
          { p: [2.515, JT, -0.16], text: 'Cavity', cls: 'warn', dx: 70, dy: -40 },
          { p: [JAMB.sx, JAMB.y, -0.04], text: 'Holds plasterboard only', cls: 'warn', dx: 120, dy: -26, at: 2.2 },
          { p: [2.545, JT, 0.004], text: 'Pulls away from the wall', cls: 'warn', dx: 92, dy: 44, follow: 'asm', at: 3.6 },
        ],
      },
      {
        chip: 'Obstructed', tag: 'bad', title: 'Something in the side room',
        text: 'A pipe, conduit, switch or power point in the side room is in the track’s way: the mounting angle can’t sit flat against the wall. Keep the side room clear, from the floor to the head.',
        cam: CAM.jamb, state: JSECTION, jamb: 'obstruct', dims: jambDims,
        labels: [
          { p: [JAMB.sx, JT, JAMB.PIPE.z], text: 'Conduit in the side room', cls: 'warn', dx: 80, dy: -46 },
          { p: [2.545, JT, 0.004], text: 'Angle can’t sit flat', cls: 'warn', dx: 84, dy: 34, follow: 'asm', at: 1.0 },
        ],
      },
    ],
  },
  {
    id: 'head', num: 10, nav: 'Head and springs', cam: CAM.headAll,
    state: { ...BUILT, lining: 0.6, backWall: 0, trussUpper: 0.25, sideWalls: 0.6, dust: 1 },
    html: `
      <div class="sl"><em>10</em>Head and springs</div>
      <h2 class="ttl">Solid above the opening</h2>
      <p class="lead">Above the opening, the head carries the door’s springs and cable drums, so it has to be solid as well.</p>
      <div class="subs" data-subs></div>
      <figure class="prof" data-for-subs="1">${lintelProfiles}<figcaption>Section through the lintel · solid nogging or LVL between the flanges on the garage side, flush with them</figcaption></figure>
      <div class="acts" data-for-subs="1,2,3,4"><button class="t-chip" data-act="beam">Show a U-beam</button></div>
      <p class="fine">Steel lintel shown cut away. Spring hardware is indicative: Tower supplies and fixes it. Blocking members and their fixing to the steel to the engineer's detail.</p>`,
    subs: [
      {
        chip: 'Head room', title: 'Through the lintel',
        text: 'Solid fixing through the lintel, at least 300 mm thick. The spring shaft, its brackets and the cable drums fix across it.',
        state: { hl_head: 1 }, dims: headRoomDims,
        labels: [
          { p: [-1.2, 2.85, 0.01], text: 'Head room · through the lintel', cls: 'line', dy: -34, n: { p: [1.2, 2.85, 0.01] } },
        ],
      },
      {
        chip: 'Steel lintel', tag: 'ok', title: 'Block out a steel lintel',
        text: 'Where the lintel is a steel I-beam or U-beam, block it out with solid nogging or LVL. The blocking fills between the flanges on the garage side, flush with them, and runs straight through across the opening.',
        cam: CAM.lintel, state: { ...LINT, blocking: 1 },
        labels: [
          { p: [LINTEL.xEnd, LINTEL.y1 - 0.005, -0.04], text: 'Steel lintel · I-beam or U-beam', cls: 'line', dx: 30, dy: -52 },
          { p: [0.9, 2.83, 0], text: 'Solid nogging or LVL · flush with the flanges', cls: 'warnok', dx: -20, dy: 64, at: 2.3 },
          { p: [1.0, LINTEL.y0 + 0.01, 0], text: 'Straight through the opening', cls: 'line', dx: 0, dy: 58, at: 2.4 },
        ],
      },
      {
        chip: 'Springs', title: '150 past each side',
        text: 'The springs fix to the blocking across the opening. It continues at least 150 mm past each side of the opening for the cable drums to fix to.',
        cam: CAM.lintelHalf, state: { ...LINT, blocking: 1, ...SPRINGS },
        dims: [D([K.OPEN, 2.665, 0.01], [K.OPEN + LINTEL.EXT, 2.665, 0.01], '150 min', { side: 1, ext: [[[K.OPEN, K.DOOR_H, 0.01], [K.OPEN, 2.64, 0.01]], [[K.OPEN + LINTEL.EXT, LINTEL.y0 + 0.01, 0.01], [K.OPEN + LINTEL.EXT, 2.64, 0.01]]] })],
        labels: [
          { p: [K.OPEN + 0.1, LINTEL.shaftY - 0.06, LINTEL.shaftZ], text: 'Cable drum', cls: 'line', dx: 96, dy: 18, at: 1.8 },
          { p: [K.OPEN + 0.115, LINTEL.shaftY + 0.045, 0.007], text: 'End bracket · into the blocking', cls: 'warnok', dx: 40, dy: -62, at: 1.9 },
          { p: [0.65, LINTEL.shaftY + 0.03, LINTEL.shaftZ], text: 'Spring', cls: 'line', dx: 0, dy: -56, at: 1.8 },
          { p: [0.12, LINTEL.shaftY - 0.045, 0.009], text: 'Centre bracket · into the blocking', cls: 'warnok', dx: 10, dy: 62, at: 1.9 },
        ],
      },
      {
        chip: 'Not blocked out', tag: 'bad', title: 'Not blocked out',
        text: 'The steel is left open. The spring and cable drum brackets have nothing solid to fix to.',
        cam: CAM.lintelHalf, state: { ...LINT, voidAll: 1, ...SPRINGS },
        labels: [
          { p: [1.6, 2.77, 0.002], text: 'Open steel · nothing to fix to', cls: 'warn', dx: -10, dy: 64 },
          { p: [K.OPEN + 0.115, LINTEL.shaftY + 0.04, 0.009], text: 'End bracket · nothing behind it', cls: 'warn', dx: 40, dy: -62 },
          { p: [0.12, LINTEL.shaftY - 0.045, 0.009], text: 'Centre bracket · nothing behind it', cls: 'warn', dx: 10, dy: 62, n: { dx: -30 } },
        ],
      },
      {
        chip: 'Stops short', tag: 'bad', title: 'Stops at the opening',
        text: 'The blocking ends at the edges of the opening. The cable drum brackets past each edge have nothing solid behind them.',
        cam: CAM.lintelEnd, state: { ...LINT, blockShort: 1, voidEnds: 1, ...SPRINGS },
        labels: [
          { p: [K.OPEN, 2.76, 0.002], text: 'Blocking stops at the opening', cls: 'warn', dx: -70, dy: 58, at: 2.3 },
          { p: [K.OPEN + 0.115, LINTEL.shaftY + 0.04, 0.009], text: 'End bracket · nothing behind it', cls: 'warn', dx: 40, dy: -62 },
        ],
      },
    ],
  },
  {
    id: 'system', num: 11, nav: 'The whole door', cam: CAM.system,
    state: { ...BUILT, lining: 0.55, backWall: 0, trussUpper: 0.1, sideWalls: 0.5, dust: 1, hardware: 1, springs: 1, springCoil: 1, hl_sideL: 1, hl_sideR: 1, hl_head: 1, 'zone:*': 1 },
    door: { delay: 0.5, dur: 3.6 },
    html: `
      <div class="sl"><em>11</em>The whole door</div>
      <h2 class="ttl">The complete system</h2>
      <p class="lead">Every part of the door fixes into structure you build: the tracks into the side room, the springs and drums into the head, and the hangers and motor into the ceiling pads.</p>
      <div class="subs" data-subs></div>
      <div class="acts" data-for-subs="1"><button class="t-chip" data-act="door">Close the door</button></div>
      <p class="fine">Door hardware shown is indicative. Drag to look around.</p>`,
    subs: [
      {
        chip: 'Fixings', title: 'Where the door fixes',
        text: 'Vertical tracks into the side room. Springs and cable drums into the head. Hangers into pads L1, L2, R1 and R2, the motor into pad M, and pad A for doors over 330 kg.',
        labels: [
          { p: [-TRACK.xc, 1.2, TRACK.z1], text: 'Vertical tracks · side room', cls: 'line', dx: -60, dy: 40 },
          { p: [-1.12, LINTEL.shaftY, LINTEL.shaftZ], text: 'Springs and drums · head', cls: 'line', dx: -40, dy: -56, n: { p: [0.9, LINTEL.shaftY, LINTEL.shaftZ], dx: -20, dy: 56 } },
          { p: [TRACK.xc, 2.95, 1.3], text: 'Hangers · L1 L2 R1 R2', cls: 'line', dx: 60, dy: 50 },
          { p: [0.19, 2.84, 3.6], text: 'Motor · pad M', cls: 'line', dx: 64, dy: -34, n: { dx: 40, dy: -24 } },
        ],
      },
      {
        chip: 'In motion', title: 'The door in motion',
        text: 'As the door opens, the motor draws it up the vertical tracks and back under the ceiling while the springs and cable drums carry its weight. Each of these fixings takes load as the door moves.',
        state: { doorOpen: 0.62 },
        labels: [
          { p: [-0.65, LINTEL.shaftY + 0.03, LINTEL.shaftZ], text: 'Springs and drums · carry the weight', cls: 'line', dx: -30, dy: -56, n: { p: [0.9, LINTEL.shaftY, LINTEL.shaftZ], dx: -10, dy: 56 } },
          { p: [TRACK.xc, 1.2, TRACK.z1], text: 'Vertical track', cls: 'line', dx: -86, dy: 30 },
        ],
      },
    ],
  },
  {
    id: 'hold', num: 12, nav: 'Hold point', cam: CAM.hold,
    state: { ...BUILT, padOutlines: 0.6, trussUpper: 0.45, door: 0, backWall: 0, sideWalls: 0.5, dust: 1 },
    finder: true,
    html: `
      <div class="sl"><em>12</em>Hold point</div>
      <h2 class="ttl">Before the ceiling is lined</h2>
      <ol class="steps3">
        <li><b>01</b><span><strong>Frame every pad</strong> to the setout and schedule, flush with the underside of the battens, before any lining goes up.</span></li>
        <li><b>02</b><span><strong>Photograph and send</strong> each pad with tapes to the setout and a straightedge across it, plus the structural sign-off, to your Tower contact.</span></li>
        <li><b>03</b><span><strong>Line the ceiling</strong> once Tower has confirmed the pads in writing.</span></li>
      </ol>
      <div class="sub-h">Check before you send</div>
      <div class="checks">
        <label class="chk"><input type="checkbox" data-chk="position"><i></i><span><strong>Position</strong>Every pad set out from the back of the opening, its edges and its centreline, as scheduled.</span></label>
        <label class="chk"><input type="checkbox" data-chk="size"><i></i><span><strong>Size</strong>Every pad at least its scheduled size, solid LVL (or as the engineer specifies) across its full area.</span></label>
        <label class="chk"><input type="checkbox" data-chk="flush"><i></i><span><strong>Flush</strong>Every nogging flush with the underside of the battens, checked with a straightedge, so the lining sits hard against it. No gap, no step, no loose packers.</span></label>
        <label class="chk"><input type="checkbox" data-chk="structure"><i></i><span><strong>Structure</strong>Truss designer's sign-off for the door loads and the nogging detail.</span></label>
      </div>
      <div class="sendcard" data-ready hidden>
        <div class="cardt">Ready to send</div>
        <p>Send the photos and the sign-off to your Tower contact, or to:</p>
        <div class="ready-row"><a class="t-cta-ghost" data-mail href="#">sales@towerdoors.com.au<span class="chev">»</span></a><a class="ph" href="tel:1300004962">1300 004 962</a></div>
      </div>
      <p class="fine">Tower's review is a check, not an acceptance of the framing. Compliance with Tower's requirements remains with the builder.</p>`,
  },
  {
    id: 'end', end: true, cam: CAM.end, auto: true,
    state: { ...BUILT, lining: 0.16, hardware: 1, springs: 1, springCoil: 1, door: 1, doorOpen: 1, 'halo:*': 0.5 },
    door: { delay: 0.4, dur: 2.6 },
  },
];

export const STEP_COUNT = CHAPTERS.filter(c => c.num).length;
