"""Hairline SVG drawings for the stick-framed ceiling fixing document.

All drawings use the Tower v2 drawing language: strokes rgba(231,231,249,.62),
soft .28, dimensions .55, Rubik 8-10 px, and orange fill only for what is
being specified (solid fixing). Every viewBox is in CSS px at the content
width (642 px = 170 mm), so text sizes are true sizes.
"""
import html
import math

OR = "#DA5E2D"        # site orange: solid fixing required
OR_LT = "#FF8251"     # dashed outlines / not acceptable marks
OR_DK = "#A9461F"     # shaded orange face (iso only)
LINE = "rgba(231,231,249,.62)"
SOFT = "rgba(231,231,249,.28)"
FAINT = "rgba(231,231,249,.13)"
DIM = "rgba(231,231,249,.55)"
TXT = "rgba(231,231,249,.86)"
MUTE = "rgba(231,231,249,.62)"
INK = "#000"


class S:
    def __init__(self, w, h):
        self.w, self.h, self.o = w, h, []
        self.defs = []

    def raw(self, s):
        self.o.append(s)

    def line(self, x1, y1, x2, y2, st=LINE, sw=0.8, dash=None, cap="butt"):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
                      f'stroke="{st}" stroke-width="{sw}" stroke-linecap="{cap}"{d}/>')

    def rect(self, x, y, w, h, fill="none", st=None, sw=0.8, dash=None, extra=""):
        if w < 0:
            x, w = x + w, -w
        if h < 0:
            y, h = y + h, -h
        s = f' stroke="{st}" stroke-width="{sw}"' if st else ""
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" '
                      f'fill="{fill}"{s}{d} {extra}/>')

    def poly(self, pts, fill="none", st=None, sw=0.8, dash=None, close=True, join="miter"):
        p = " ".join(f"{x:.2f},{y:.2f}" for x, y in pts)
        tag = "polygon" if close else "polyline"
        s = f' stroke="{st}" stroke-width="{sw}" stroke-linejoin="{join}"' if st else ""
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(f'<{tag} points="{p}" fill="{fill}"{s}{d}/>')

    def path(self, d, fill="none", st=LINE, sw=0.8, dash=None, cap="butt"):
        da = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(f'<path d="{d}" fill="{fill}" stroke="{st}" stroke-width="{sw}" '
                      f'stroke-linecap="{cap}"{da}/>')

    def circle(self, x, y, r, fill="none", st=LINE, sw=0.8, dash=None):
        da = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" fill="{fill}" '
                      f'stroke="{st}" stroke-width="{sw}"{da}/>')

    def text(self, x, y, s, fs=8.5, fill=TXT, anchor="start", wt=400, ls=0.9, rot=None,
             upper=True):
        t = s.upper() if upper else s
        tr = f' transform="rotate({rot} {x:.2f} {y:.2f})"' if rot is not None else ""
        self.o.append(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{fs}" fill="{fill}" '
                      f'text-anchor="{anchor}" font-weight="{wt}" letter-spacing="{ls}"{tr}>'
                      f'{html.escape(t)}</text>')

    def lines(self, x, y, rows, fs=8, lh=None, **kw):
        lh = lh or fs * 1.45
        for i, r in enumerate(rows):
            self.text(x, y + i * lh, r, fs, **kw)

    def svg(self, style="display:block;width:100%;height:auto"):
        defs = f"<defs>{''.join(self.defs)}</defs>" if self.defs else ""
        return (f'<svg viewBox="0 0 {self.w} {self.h}" xmlns="http://www.w3.org/2000/svg" '
                f'font-family="Rubik, Arial, sans-serif" style="{style}">{defs}'
                + "".join(self.o) + "</svg>")


# ------------------------------------------------------------------ helpers
def tick(s, x, y, k=3.0, st=TXT, sw=1.0):
    s.line(x - k, y + k, x + k, y - k, st, sw)


def dim_h(s, xs, y, labels, fs=8.5, over=3, txt_off=None, above=True, ko=True):
    """Chained horizontal dimension through x positions xs (px)."""
    s.line(min(xs) - over, y, max(xs) + over, y, DIM, 0.7)
    for x in xs:
        tick(s, x, y)
    for i, lab in enumerate(labels):
        if lab is None:
            continue
        xm = (xs[i] + xs[i + 1]) / 2
        if txt_off and i in txt_off:
            xm += txt_off[i]
        ty = y - 4 if above else y + fs + 3
        if ko:
            w = len(lab) * fs * 0.66 + 4
            s.rect(xm - w / 2, ty - fs * 0.86, w, fs * 0.98, fill=INK)
        s.text(xm, ty, lab, fs, TXT, "middle", ls=0.6)


def dim_v(s, x, ys, labels, fs=8.5, over=3, side="left", txt_off=None):
    """Chained vertical dimension through y positions ys (px). Text reads upward."""
    s.line(x, min(ys) - over, x, max(ys) + over, DIM, 0.7)
    for y in ys:
        tick(s, x, y)
    for i, lab in enumerate(labels):
        if lab is None:
            continue
        ym = (ys[i] + ys[i + 1]) / 2
        if txt_off and i in txt_off:
            ym += txt_off[i]
        tx = x - 3.5 if side == "left" else x + 3.5 + fs * 0.74
        s.text(tx, ym, lab, fs, TXT, "middle", ls=0.6, rot=-90)


def ko_text(s, x, y, t, fs=7.5, fill=MUTE, anchor="start", ls=0.8, wt=400):
    w = len(t) * fs * (0.62 + ls / fs * 0.95) + 6
    x0 = x - 3 if anchor == "start" else (x - w / 2 if anchor == "middle" else x - w + 3)
    s.rect(x0, y - fs * 0.92, w, fs * 1.22, fill=INK)
    s.text(x, y, t, fs, fill, anchor, wt=wt, ls=ls)


def ko_vtext(s, x, y, t, fs=7.5, fill=MUTE, ls=0.8):
    """Upward-reading label with a black knockout, anchored at its start."""
    w = len(t) * fs * (0.62 + ls / fs * 0.95) + 6
    s.raw(f'<g transform="rotate(-90 {x:.2f} {y:.2f})">'
          f'<rect x="{x - 3:.2f}" y="{y - fs * 0.92:.2f}" width="{w:.2f}" height="{fs * 1.22:.2f}" fill="#000"/>'
          f'<text x="{x:.2f}" y="{y:.2f}" font-size="{fs}" fill="{fill}" letter-spacing="{ls}">'
          f'{html.escape(t.upper())}</text></g>')


def ext(s, x1, y1, x2, y2):
    s.line(x1, y1, x2, y2, SOFT, 0.5)


def cl_mark(s, x, y, size=10, col=TXT):
    """Centreline symbol drawn as paths (Rubik has no U+2104)."""
    r = size * 0.36
    a0, a1 = math.radians(40), math.radians(320)
    x0, y0 = x + r * math.cos(a0), y - r * math.sin(a0)
    x1, y1 = x + r * math.cos(a1), y - r * math.sin(a1)
    s.path(f"M{x0:.2f},{y0:.2f} A{r:.2f},{r:.2f} 0 1,0 {x1:.2f},{y1:.2f}", st=col, sw=0.9)
    s.path(f"M{x + r*0.15:.2f},{y - r*1.25:.2f} L{x + r*0.15:.2f},{y + r*1.55:.2f} "
           f"L{x + r*1.25:.2f},{y + r*1.55:.2f}", st=col, sw=0.9)


def leader(s, pts, st=DIM, sw=0.6, dot=True):
    s.poly(pts, st=st, sw=sw, close=False)
    if dot:
        s.circle(pts[0][0], pts[0][1], 1.4, fill=st if st != DIM else TXT, st="none", sw=0)


def stipple(s, pid="stip"):
    s.defs.append(
        f'<pattern id="{pid}" width="5" height="3.2" patternUnits="userSpaceOnUse">'
        f'<circle cx="1" cy="1" r=".42" fill="rgba(231,231,249,.42)"/>'
        f'<circle cx="3.5" cy="2.4" r=".42" fill="rgba(231,231,249,.3)"/></pattern>')


def cut_x(s, x, y, w, h, st=SOFT, sw=0.5):
    """Timber in section: diagonal cross."""
    s.line(x, y, x + w, y + h, st, sw)
    s.line(x + w, y, x, y + h, st, sw)


def break_v(s, x, y1, y2, st=LINE, sw=0.8):
    """Vertical break line (zig-zag) across a band from y1 to y2."""
    ym = (y1 + y2) / 2
    s.poly([(x, y1 - 4), (x, ym - 4), (x - 3.5, ym - 1.5), (x + 3.5, ym + 1.5), (x, ym + 4),
            (x, y2 + 4)], st=st, sw=sw, close=False)


def bad_mark(s, x, y, r=5.5):
    s.circle(x, y, r, st=OR_LT, sw=1.0)
    k = r * 0.48
    s.line(x - k, y - k, x + k, y + k, OR_LT, 1.0)
    s.line(x + k, y - k, x - k, y + k, OR_LT, 1.0)


def ok_mark(s, x, y, r=5.5):
    s.circle(x, y, r, fill=OR, st="none", sw=0)
    s.poly([(x - r * 0.45, y + r * 0.02), (x - r * 0.1, y + r * 0.38), (x + r * 0.5, y - r * 0.35)],
           st=INK, sw=1.3, close=False, join="round")


# ================================================================== PLAN
def plan_svg():
    W, H = 642, 620
    s = S(W, H)
    sc, cx, y0 = 0.1, 321.0, 104.0
    X = lambda x: cx + x * sc
    Y = lambda d: y0 + d * sc
    OPEN, SIDE, FW = 2400, 150, 250
    WALL_END = 3050
    DEPTH = 4750

    # --- roof trusses, front to back (faint, indicative) ---
    jx = [-2775 + 600 * k for k in range(10)]
    HWJ = 17.5
    for x in jx:
        s.rect(X(x - HWJ), Y(0), 2 * HWJ * sc, (DEPTH) * sc, st=FAINT, sw=0.6)

    # --- front wall (plan), lintel over the opening shown dashed ---
    yo, yi = Y(-FW), Y(0)
    for yy in (yo, yi):
        s.line(X(-WALL_END), yy, X(-OPEN - SIDE), yy, LINE, 0.9)
        s.line(X(OPEN + SIDE), yy, X(WALL_END), yy, LINE, 0.9)
    s.line(X(-OPEN - SIDE), yo, X(OPEN + SIDE), yo, SOFT, 0.7, dash="4 3")
    # back of opening = setout datum (strong dashed line, full width)
    s.line(X(-WALL_END) - 6, yi, X(WALL_END) + 6, yi, TXT, 0.9, dash="7 3 1.5 3")
    break_v(s, X(-WALL_END), yo, yi)
    break_v(s, X(WALL_END), yo, yi)
    # side room: solid fixing each side of the opening
    for sgn in (-1, 1):
        x_in, x_out = X(sgn * OPEN), X(sgn * (OPEN + SIDE))
        s.rect(min(x_in, x_out), yo, abs(x_out - x_in), yi - yo, fill=OR)
        s.line(x_in, yo, x_in, yi, LINE, 0.9)

    # --- setout lines and centreline ---
    for sgn in (-1, 1):
        s.line(X(sgn * OPEN), 40, X(sgn * OPEN), Y(DEPTH) + 6, TXT, 0.7, dash="10 3 2 3")
    s.line(cx, 30, cx, Y(DEPTH) + 6, SOFT, 0.7, dash="10 3 2 3")
    cl_mark(s, cx + 9, 26, 10)

    # --- pads ---
    pads = {
        "L1": (-OPEN - 450, -OPEN + 150, 1000, 1600, "600 × 600"),
        "L2": (-OPEN - 450, -OPEN + 150, 2200, 2800, "600 × 600"),
        "R1": (OPEN - 150, OPEN + 450, 1000, 1600, "600 × 600"),
        "R2": (OPEN - 150, OPEN + 450, 2200, 2800, "600 × 600"),
        "A": (-300, 300, 1250, 1750, "500 × 600"),
        "M": (-300, 300, 2850, 3850, "1000 × 600"),
    }
    for k, (x1, x2, d1, d2, size) in pads.items():
        s.rect(X(x1), Y(d1), (x2 - x1) * sc, (d2 - d1) * sc, fill=OR)
        # joists passing through the pad (noggings fill between them)
        xm, ym = X((x1 + x2) / 2), Y((d1 + d2) / 2)
        for x in jx:
            for e in (x - HWJ, x + HWJ):
                if x1 < e < x2:
                    s.line(X(e), Y(d1), X(e), ym - 11, "rgba(0,0,0,.30)", 0.6)
                    s.line(X(e), ym + 15, X(e), Y(d2), "rgba(0,0,0,.30)", 0.6)
        s.text(xm, ym + 1, k, 11, INK, "middle", wt=500, ls=0.4)
        s.text(xm, ym + 11.5, size, 7, INK, "middle", wt=500, ls=0.2)

    # --- GPO zone around the motor pad ---
    mcx, mcy, r = cx, Y(3350), 950 * sc
    a0, a1 = math.radians(18), math.radians(162)
    s.path(f"M{mcx + r*math.cos(a0):.2f},{mcy + r*math.sin(a0):.2f} "
           f"A{r:.2f},{r:.2f} 0 0,1 {mcx + r*math.cos(a1):.2f},{mcy + r*math.sin(a1):.2f}",
           st=SOFT, sw=0.7, dash="3 2.5")
    gx, gy = X(-150), Y(3350) + math.sqrt((900 * sc) ** 2 - (150 * sc) ** 2)
    s.circle(gx, gy, 4.2, fill=INK, st=TXT, sw=0.9)
    s.line(gx - 1.4, gy - 1.6, gx - 1.4, gy + 1.6, TXT, 0.9)
    s.line(gx + 1.4, gy - 1.6, gx + 1.4, gy + 1.6, TXT, 0.9)
    leader(s, [(gx - 5, gy), (244, gy), (238, gy - 6)], dot=False)
    s.lines(236, gy - 37, ["240 V 10 A GPO", "clear of pad M,", "300–950 from",
                           "centre of pad M"], 7.5, fill=MUTE, anchor="end", ls=0.7)

    # --- dimensions: across the opening (top) ---
    ytop = yo - 22
    xs = [X(-OPEN - SIDE), X(-OPEN), X(OPEN), X(OPEN + SIDE)]
    for x in (xs[0], xs[3]):
        ext(s, x, yo - 3, x, ytop - 3)
    dim_h(s, xs, ytop, ["150", "GARAGE DOOR OPENING", "150"], txt_off={0: -3, 2: 3})

    # --- left side pads: chain + centres (inside, as the standard plan) ---
    xl = X(-OPEN + 150)
    xa, xb = xl + 16, xl + 36
    for d in (1000, 1600, 2200, 2800):
        ext(s, xl + 2, Y(d), xa + 3, Y(d))
    dim_v(s, xa, [Y(0), Y(1000), Y(1600), Y(2200), Y(2800)], ["1000", "600", "600", "600"])
    for d in (1300, 2500):
        s.line(X(-OPEN - 450) - 6, Y(d), X(-OPEN - 450), Y(d), SOFT, 0.5)
        s.line(X(-OPEN + 150), Y(d), xb + 3, Y(d), SOFT, 0.5, dash="6 2 1.5 2")
    dim_v(s, xb, [Y(0), Y(1300), Y(2500)], ["1300", "1200"])

    # --- right side pads: mirror ---
    xr = X(OPEN - 150)
    xc, xd = xr - 16, xr - 36
    for d in (1000, 1600, 2200, 2800):
        ext(s, xr - 2, Y(d), xc - 3, Y(d))
    dim_v(s, xc, [Y(0), Y(1000), Y(1600), Y(2200), Y(2800)], ["1000", "600", "600", "600"],
          side="right")
    for d in (1300, 2500):
        s.line(xd - 3, Y(d), X(OPEN - 150), Y(d), SOFT, 0.5, dash="6 2 1.5 2")
        s.line(X(OPEN + 450), Y(d), X(OPEN + 450) + 6, Y(d), SOFT, 0.5)
    dim_v(s, xd, [Y(0), Y(1300), Y(2500)], ["1300", "1200"], side="right")

    # --- centre pads: chain + overall on the left, centres on the right ---
    xcl = X(-300)
    xe, xf = xcl - 16, xcl - 46
    for d in (1250, 1750, 2850, 3850):
        ext(s, xcl - 2, Y(d), xe - 3, Y(d))
    ext(s, xe - 3, Y(2850), xf - 3, Y(2850))
    dim_v(s, xe, [Y(0), Y(1250), Y(1750), Y(2850), Y(3850)], ["1250", "500", "1100", "1000"])
    dim_v(s, xf, [Y(0), Y(2850)], ["2850"])
    xcr = X(300)
    xg = xcr + 16
    for d in (1500, 3350):
        s.line(X(-300) - 6, Y(d), X(-300), Y(d), SOFT, 0.5)
        s.line(X(300), Y(d), xg + 3, Y(d), SOFT, 0.5, dash="6 2 1.5 2")
    dim_v(s, xg, [Y(0), Y(1500), Y(3350)], ["1500", "1850"], side="right")

    # --- pad widths ---
    for sgn in (-1, 1):
        a, b = sorted([X(sgn * (OPEN + 450)), X(sgn * (OPEN - 150))])
        for dtop in (1000, 2200):
            yy = Y(dtop) - 9
            ext(s, a, Y(dtop) - 2, a, yy - 3)
            ext(s, b, Y(dtop) - 2, b, yy - 3)
            dim_h(s, [a, b], yy, ["600"])
        # 450 | 150 about the edge of the opening, below the rear pad
        y2 = Y(2800) + 12
        xs3 = sorted([X(sgn * (OPEN + 450)), X(sgn * OPEN), X(sgn * (OPEN - 150))])
        for x in xs3:
            ext(s, x, Y(2800) + 2, x, y2 + 3)
        labs = ["450", "150"] if sgn < 0 else ["150", "450"]
        dim_h(s, xs3, y2, labs, above=False)
    for (d1, d2) in ((1250, 1750), (2850, 3850)):
        yy = Y(d2) + 11
        ext(s, X(-300), Y(d2) + 2, X(-300), yy + 3)
        ext(s, X(300), Y(d2) + 2, X(300), yy + 3)
        dim_h(s, [X(-300), X(300)], yy, ["600"], above=False)

    # --- labels ---
    s.lines(X(-OPEN + 150) + 46, yi + 13, ["Back of opening", "= setout datum"], 7.5,
            fill=MUTE, ls=0.8)
    s.text(X(OPEN - 150) - 46, yi + 13, "Behind fit", 7.5, MUTE, "end", ls=0.8)
    s.text(X(-1300), (yo + yi) / 2 + 3, "Front of opening", 7.5, MUTE, "middle", ls=0.8)
    s.lines(X(300) + 30, Y(1500) - 9, ["Pad A — install unless", "Tower confirms the door",
                                        "is 330 kg or less"], 7.5, fill=MUTE, ls=0.45)
    s.lines(X(300) + 30, Y(3350) - 4, ["Pad M — motor"], 7.5, fill=MUTE, ls=0.7)
    # setout labels along the edges of the opening
    for sgn in (-1, 1):
        x = X(sgn * OPEN)
        tx = x + 9 if sgn < 0 else x - 3.5
        ko_vtext(s, tx, Y(DEPTH) - 4, "Setout — edge of opening", 7.5, MUTE, ls=0.8)
    # truss label
    jlx = X(jx[7] + HWJ)
    leader(s, [(jlx, Y(DEPTH) - 16), (jlx, Y(DEPTH) + 20), (jlx + 6, Y(DEPTH) + 20)], dot=True)
    s.text(jlx + 10, Y(DEPTH) + 23, "Roof trusses · by builder", 7.5, MUTE, ls=0.8)
    s.h = int(Y(DEPTH) + 34)
    return s.svg()


# ================================================================== COMPARISON
def compare_svg():
    W, H = 642, 214
    s = S(W, H)
    stipple(s, "stipA")
    yl = 128          # top of lining (both panels)
    lt = 5            # lining thickness
    # ---------------- left: truss roof (standard detail) ----------------
    x0, x1 = 14, 304
    chord_t, chord_b = 52, 84           # truss bottom chord band
    s.rect(x0, chord_t, x1 - x0, chord_b - chord_t, st=LINE, sw=0.8)
    # battens (cut) hanging below the chord
    for bx in (40, 252):
        s.poly([(bx, chord_b), (bx + 34, chord_b), (bx + 30, yl), (bx + 4, yl)], st=LINE, sw=0.8)
    # nogging: from the truss down through the batten cavity to the lining
    s.rect(104, chord_t + 4, 120, yl - chord_t - 4, fill=OR)
    # lining
    s.rect(x0, yl, x1 - x0, lt, fill="url(#stipA)", st=LINE, sw=0.7)
    # breaks
    for x in (x0, x1):
        s.line(x, chord_t - 10, x, yl + lt + 10, SOFT, 0.5)
    s.text(22, chord_t + 20, "Roof truss", 7.5, MUTE, ls=0.8)
    s.text(57, chord_b + 18, "Batten", 7, MUTE, "middle", ls=0.3)
    s.text(269, chord_b + 18, "Batten", 7, MUTE, "middle", ls=0.3)
    leader(s, [(164, yl - 16), (164, 30), (172, 30)])
    s.text(176, 33, "Nogging fills the batten cavity", 7.5, TXT, ls=0.7)
    leader(s, [(286, yl + lt), (286, yl + 22), (278, yl + 22)])
    s.text(275, yl + 25, "Lining on battens", 7.5, MUTE, "end", ls=0.7)
    s.text(x0, H - 24, "Truss roof", 9, "#fff", wt=500, ls=1.4)
    s.text(x0, H - 10, "Battened ceiling · this document", 7.5, OR, ls=1.2)

    # ---------------- right: stick-framed roof (this document) ----------------
    ox = 338
    jsp = 112            # 450 crs
    jw, jt = 12, 52      # joist width, top of joist (depth 52..128)
    joists = [ox + 22 + i * jsp for i in range(3)]
    for k in (0, 1):
        a = joists[k] + jw
        b = joists[k + 1]
        s.rect(a, jt, b - a, yl - jt, fill=OR)
    for x in joists:
        s.rect(x, jt, jw, yl - jt, fill=INK, st=LINE, sw=0.9)
        cut_x(s, x, jt, jw, yl - jt)
    s.rect(ox, yl, W - 14 - ox, lt, fill="url(#stipA)", st=LINE, sw=0.7)
    for x in (ox, W - 14):
        s.line(x, jt - 10, x, yl + lt + 10, SOFT, 0.5)
    # 450 crs dim
    yd = jt - 12
    dim_h(s, [joists[0] + jw / 2, joists[1] + jw / 2, joists[2] + jw / 2], yd, ["450", "450"])
    s.text(joists[2] + jw / 2 + 8, yd + 3, "crs", 7.5, MUTE, ls=0.6)
    lx = joists[0] + jw + 24
    leader(s, [(lx, jt + 20), (lx, 18), (lx + 6, 18)])
    s.text(lx + 10, 21, "Nogging between joists", 7.5, TXT, ls=0.7)
    # flush callout
    fx = joists[1] + jw + 2
    s.circle(fx, yl, 4, st=OR_LT, sw=1.0)
    leader(s, [(fx + 3, yl + 3), (fx + 14, yl + 22), (fx + 22, yl + 22)], dot=False)
    s.text(fx + 25, yl + 25, "Flush underneath — 0 mm", 7.5, TXT, ls=0.7)
    s.text(ox, H - 24, "Stick-framed roof", 9, "#fff", wt=500, ls=1.4)
    s.text(ox, H - 10, "Lining fixed direct · companion document", 7.5, MUTE, ls=1.2)
    return s.svg()


# ================================================================== SECTION (truss)
def batten_cut(s, xc, ytop, ybot, w_top, w_bot):
    """Ceiling batten / furring channel in section (trapezoid, as on the standard detail)."""
    s.poly([(xc - w_top / 2, ytop), (xc + w_top / 2, ytop), (xc + w_bot / 2, ybot),
            (xc - w_bot / 2, ybot)], fill=INK, st=LINE, sw=0.9)


def section_svg():
    W = 642
    s = S(W, 230)
    stipple(s, "stipB")
    sc, vs = 0.245, 0.5                 # horizontal / vertical px per mm (vertical exaggerated)
    X = lambda x: 50 + x * sc
    BD, CD = 35, 90                     # batten depth, bottom chord depth (indicative)
    yl = 140                            # back of lining = underside of battens
    ybt = yl - BD * vs                  # underside of chord / top of battens
    yct = ybt - CD * vs                 # top of chord
    lt = 5.2
    lx0, lx1 = X(-150), X(1650)
    # truss bottom chord, seen along its length
    s.rect(lx0, yct, lx1 - lx0, ybt - yct, st=LINE, sw=0.9)
    # battens (cut) either side of the pad
    for xb in (30, 1120, 1570):
        batten_cut(s, X(xb), ybt, yl, 64 * sc, 44 * sc)
    # LVL nogging: fixed to the trusses, filling the batten cavity down to the lining
    n0, n1 = 110, 1040
    s.rect(X(n0), yct + 3, X(n1) - X(n0), yl - yct - 3, fill=OR)
    # lining
    s.rect(lx0, yl, lx1 - lx0, lt, fill="url(#stipB)", st=LINE, sw=0.7)
    for x in (lx0, lx1):
        s.line(x, yct - 10, x, yl + lt + 10, SOFT, 0.5)

    # door hanger fixed through the lining into the nogging (by Tower)
    hx = X(300)
    fy = yl + lt
    s.rect(hx - 20, fy, 40, 2.4, fill="#fff")
    s.rect(hx - 1.2, fy, 2.4, 36, fill="#fff")
    for sx in (hx - 12, hx + 12):
        s.line(sx, fy + 2.4, sx, yl - 26, "#fff", 1.2)
        s.line(sx - 2.6, fy + 2.4, sx + 2.6, fy + 2.4, "#fff", 1.6)
    s.lines(hx - 20, fy + 52, ["Door hanger by Tower, fixed through",
                               "the lining into the nogging"], 7.5, fill=MUTE, ls=0.7)

    # flush callout at the nogging / lining junction
    fx = X(n1)
    s.circle(fx, yl, 5, st=OR_LT, sw=1.1)
    leader(s, [(fx + 3.6, yl + 3.6), (fx + 26, fy + 40), (fx + 32, fy + 40)], dot=False)
    s.lines(fx + 36, fy + 43, ["Underside of nogging flush with the battens",
                               "hard against the lining — no cavity"], 7.5, fill=TXT, ls=0.7)

    # callout above: the nogging
    lx = X(720)
    leader(s, [(lx, yct + 22), (lx, 11), (lx + 6, 11)])
    s.lines(lx + 10, 14, ["LVL nogging, or as specified by the engineer",
                          "Fixed to the trusses, filling the batten cavity over the full pad",
                          "Nogging member size and fixing to the engineer's detail"], 7.5,
            fill=TXT, ls=0.7, lh=10.6)
    # right column: chord, battens, lining
    rx = 492
    leader(s, [(lx1 - 3, (yct + ybt) / 2), (rx - 4, (yct + ybt) / 2)])
    s.lines(rx, (yct + ybt) / 2 - 3, ["Roof truss bottom chord", "by builder"], 7.5, fill=MUTE,
            ls=0.7)
    leader(s, [(X(1570) + 6, yl - 6), (rx - 4, yl - 6)])
    s.lines(rx, yl - 9, ["Ceiling battens or", "furring channels"], 7.5, fill=MUTE, ls=0.7)
    leader(s, [(X(1610), yl + lt), (X(1610), yl + lt + 18), (rx - 4, yl + lt + 18)])
    s.lines(rx, yl + lt + 15, ["Lining fixed to the", "battens and nogging"], 7.5, fill=MUTE,
            ls=0.7)
    s.h = int(fy + 80)
    return s.svg()


# ================================================================== NOT ACCEPTABLE (truss)
def notok_svg():
    W, H = 642, 186
    s = S(W, H)
    stipple(s, "stipC")
    panel_w, gap = 196, 27
    sc, vs = 0.30, 0.5
    BD, CD = 35, 90
    yl = 108
    ybt = yl - BD * vs
    yct = ybt - CD * vs
    lt = 4.6
    for p in range(3):
        ox = p * (panel_w + gap)
        x0, x1 = ox + 4, ox + panel_w - 4
        s.rect(x0, yct, x1 - x0, ybt - yct, st=LINE, sw=0.8)
        s.rect(x0, yl, x1 - x0, lt, fill="url(#stipC)", st=LINE, sw=0.7)
        for xb in (ox + 24, ox + panel_w - 24):
            batten_cut(s, xb, ybt, yl, 64 * sc, 44 * sc)
        mid = ox + panel_w / 2
        if p == 0:
            # nogging stops at the trusses: the batten cavity is left open
            s.rect(ox + 44, yct + 2, panel_w - 88, ybt - yct - 2, st=OR_LT, sw=1.0, dash="3 2")
            s.line(mid, ybt + 1.5, mid, yl - 1.5, OR_LT, 0.9)
            tick(s, mid, ybt + 1.5, k=2.2, st=OR_LT)
            tick(s, mid, yl - 1.5, k=2.2, st=OR_LT)
            s.text(mid + 6, (ybt + yl) / 2 + 3, "Gap", 7.5, OR_LT, ls=0.8)
        elif p == 1:
            # laid on top of the trusses: chord + batten depth is a cavity
            s.rect(ox + 30, yct - 13, panel_w - 60, 12, st=OR_LT, sw=1.0, dash="3 2")
            s.line(mid, yct + 1.5, mid, yl - 1.5, OR_LT, 0.9)
            tick(s, mid, yct + 1.5, k=2.2, st=OR_LT)
            tick(s, mid, yl - 1.5, k=2.2, st=OR_LT)
            ko_text(s, mid + 7, (yct + yl) / 2 + 3, "Cavity", 7.5, OR_LT, ls=0.8)
        else:
            # no nogging: the fixing holds only plasterboard (or a batten)
            hx = mid - 6
            fy = yl + lt
            s.rect(hx - 14, fy, 28, 2.2, fill="#fff")
            s.rect(hx - 1.1, fy, 2.2, 22, fill="#fff")
            s.line(hx + 8, fy + 2, hx + 8, yl - 8, "#fff", 1.1)
            s.line(hx + 5.6, fy + 2.2, hx + 10.4, fy + 2.2, "#fff", 1.5)
            s.text(hx + 16, fy + 17, "Lining only", 7.5, OR_LT, ls=0.8)
        bad_mark(s, ox + panel_w - 12, 14)
        s.text(ox + 4, 18, "Not acceptable", 7.5, OR_LT, ls=1.4)
        caps = [["Set high", "The nogging stops at the trusses,", "leaving the batten cavity open."],
                ["On top of the trusses", "The chord and batten depth is a", "cavity behind the lining."],
                ["Battens only", "No nogging. The fixing holds only", "plasterboard or a batten."]][p]
        s.text(ox + 4, yl + lt + 36, caps[0], 9, "#fff", wt=500, ls=0.5, upper=False)
        s.lines(ox + 4, yl + lt + 51, caps[1:], 9, fill=DIM, ls=0.2, upper=False, lh=13)
    return s.svg()


# ================================================================== ELEVATION
def elevation_svg():
    W, H = 642, 420
    s = S(W, H)
    sc = 0.074
    cx = 321
    OPEN, SIDE, HEAD, DH, JD = 2400, 150, 300, 3100, 125
    yc = 96                                # ceiling line (underside of lining)
    X = lambda x: cx + x * sc
    Z = lambda z: yc - z * sc              # z up from ceiling line
    WALL = 900                             # wall drawn beyond the side room
    floor = Z(-(HEAD + DH))

    # walls beyond (hatched), from the side room outwards
    for sgn in (-1, 1):
        a, b = sorted([X(sgn * (OPEN + SIDE)), X(sgn * (OPEN + SIDE + WALL))])
        s.rect(a, Z(0), b - a, floor - Z(0), st=SOFT, sw=0.6)
        step = 9
        y = Z(0)
        hid = f"cl{sgn+1}"
        s.defs.append(f'<clipPath id="{hid}"><rect x="{a:.2f}" y="{Z(0):.2f}" width="{b-a:.2f}" '
                      f'height="{floor-Z(0):.2f}"/></clipPath>')
        g = []
        for k in range(-40, 80):
            x1 = a + k * step
            g.append(f'<line x1="{x1:.2f}" y1="{floor:.2f}" x2="{x1 + (floor - Z(0)):.2f}" '
                     f'y2="{Z(0):.2f}" stroke="{FAINT}" stroke-width="0.6"/>')
        s.raw(f'<g clip-path="url(#{hid})">' + "".join(g) + "</g>")
    # floor
    s.line(X(-(OPEN + SIDE + WALL)) - 8, floor, X(OPEN + SIDE + WALL) + 8, floor, LINE, 0.9)

    # head and side room: solid fixing (orange)
    s.rect(X(-(OPEN + SIDE)), Z(0), (2 * (OPEN + SIDE)) * sc, HEAD * sc, fill=OR)
    for sgn in (-1, 1):
        a, b = sorted([X(sgn * OPEN), X(sgn * (OPEN + SIDE))])
        s.rect(a, Z(-HEAD), b - a, floor - Z(-HEAD), fill=OR)

    # door in the opening (hairline sectional door, 4 panels, 4 bays)
    dx0, dx1, dy0, dy1 = X(-OPEN), X(OPEN), Z(-HEAD), floor
    s.rect(dx0, dy0, dx1 - dx0, dy1 - dy0, st=LINE, sw=0.9)
    ph = (dy1 - dy0) / 4
    for i in range(1, 4):
        s.line(dx0, dy0 + i * ph, dx1, dy0 + i * ph, SOFT, 0.7)
    for i in range(1, 4):
        xx = dx0 + i * (dx1 - dx0) / 4
        s.line(xx, dy0, xx, dy1, FAINT, 0.7)

    # ceiling: battens (running across) + truss bottom chords (cut) + pads in elevation
    BD = 35
    xw0, xw1 = X(-(OPEN + SIDE + WALL)), X(OPEN + SIDE + WALL)
    s.line(xw0, Z(0), xw1, Z(0), LINE, 0.9)
    s.line(xw0, Z(BD), xw1, Z(BD), SOFT, 0.6)
    jx = [-2775 + 600 * k for k in range(10)]
    pads = [(-OPEN - 450, -OPEN + 150), (-300, 300), (OPEN - 150, OPEN + 450)]
    for a, b in pads:
        s.rect(X(a), Z(JD), (b - a) * sc, JD * sc, fill=OR)
    for x in jx:
        if abs(x) > OPEN + SIDE + WALL:
            continue
        s.rect(X(x - 17.5), Z(JD), 35 * sc, (JD - BD) * sc, fill=INK, st=LINE, sw=0.7)
    s.line(xw0, Z(JD), xw1, Z(JD), FAINT, 0.6)

    # setout lines + centreline
    for sgn in (-1, 1):
        s.line(X(sgn * OPEN), 18, X(sgn * OPEN), floor + 6, TXT, 0.7, dash="10 3 2 3")
    s.line(cx, 26, cx, floor, SOFT, 0.7, dash="10 3 2 3")
    cl_mark(s, cx + 9, 20, 10)

    # top dims: pad widths and 150 from the setout line
    yd = Z(JD) - 12
    for sgn in (-1, 1):
        a, e, b = sorted([X(sgn * (OPEN + 450)), X(sgn * OPEN), X(sgn * (OPEN - 150))])
        for x in (a, b):
            ext(s, x, Z(JD) - 2, x, yd - 3)
        if sgn < 0:
            dim_h(s, [a, e, b], yd, ["450", "150"])
        else:
            dim_h(s, [a, e, b], yd, ["150", "450"])
    ext(s, X(-300), Z(JD) - 2, X(-300), yd - 3)
    ext(s, X(300), Z(JD) - 2, X(300), yd - 3)
    dim_h(s, [X(-300), X(300)], yd, ["600"])

    # head: 300 min (right)
    xh = X(OPEN + SIDE + WALL) + 14
    ext(s, X(OPEN + SIDE) + 2, Z(-HEAD), xh + 3, Z(-HEAD))
    ext(s, X(OPEN + SIDE + WALL) + 2, Z(0), xh + 3, Z(0))
    dim_v(s, xh, [Z(0), Z(-HEAD)], [None], side="right")
    s.text(xh + 6, (Z(0) + Z(-HEAD)) / 2 + 3, "300 min", 8.5, TXT, "start", ls=0.6)

    # bottom: 150 min | opening | 150 min
    yb = floor + 16
    xs = [X(-(OPEN + SIDE)), X(-OPEN), X(OPEN), X(OPEN + SIDE)]
    for x in (xs[0], xs[3]):
        ext(s, x, floor + 2, x, yb + 3)
    dim_h(s, xs, yb, ["150", "GARAGE DOOR OPENING", "150"], above=False,
          txt_off={0: -4, 2: 4})
    s.text(xs[0] - 4, yb + 22, "min", 7, MUTE, "middle", ls=0.6)
    s.text(xs[3] + 4, yb + 22, "min", 7, MUTE, "middle", ls=0.6)

    # labels
    s.text(X(-1900), Z(JD) - 4, "Trusses + battens", 7, MUTE, ls=0.8)
    s.text(X(-(OPEN + SIDE + WALL)) - 5, Z(0) + 2.5, "Ceiling", 7, MUTE, "end", ls=0.8)
    leader(s, [(X(-1400), Z(-HEAD / 2)), (X(-1400), Z(-HEAD) + 26), (X(-1300), Z(-HEAD) + 26)])
    ko_text(s, X(-1300) + 4, Z(-HEAD) + 29, "Head — solid fixing through the lintel · 300 min",
            7.5, TXT, ls=0.7)
    for sgn in (-1, 1):
        xx = X(sgn * (OPEN + SIDE / 2))
        yy = Z(-HEAD) + 150
        if sgn < 0:
            leader(s, [(xx, yy), (X(-(OPEN + SIDE + WALL)) + 6, yy)], st=DIM)
            s.rect(X(-(OPEN + SIDE + WALL)) + 2, yy - 24, 60, 36, fill=INK)
            s.lines(X(-(OPEN + SIDE + WALL)) + 4, yy - 13, ["Side room", "solid fixing"], 7.5,
                    fill=TXT, ls=0.7, lh=10.5)
            s.text(X(-(OPEN + SIDE + WALL)) + 4, yy + 8.5, "150 min", 7.5, MUTE, ls=0.7)
        else:
            leader(s, [(xx, yy), (X(OPEN + SIDE + WALL) - 6, yy)], st=DIM)
            s.rect(X(OPEN + SIDE + WALL) - 62, yy - 24, 60, 36, fill=INK)
            s.lines(X(OPEN + SIDE + WALL) - 4, yy - 13, ["Side room", "solid fixing"], 7.5,
                    fill=TXT, anchor="end", ls=0.7, lh=10.5)
            s.text(X(OPEN + SIDE + WALL) - 4, yy + 8.5, "150 min", 7.5, MUTE, "end", ls=0.7)
    for sgn in (-1, 1):
        x = X(sgn * OPEN)
        tx = x + 9 if sgn < 0 else x - 3.5
        ko_vtext(s, tx, floor - 6, "Edge of opening", 7, MUTE, ls=0.8)
    ko_text(s, cx + 40, dy0 + ph * 1.5 + 3, "Door — behind fit, up to 3100 high", 7.5, MUTE,
            "middle", ls=0.8)
    s.h = int(yb + 34)
    return s.svg()


# ================================================================== ISO (cover, truss)
def iso_svg(width=600, height=290):
    az, el = math.radians(-57), math.radians(27)
    R = (-math.sin(az), math.cos(az), 0.0)
    U = (-math.sin(el) * math.cos(az), -math.sin(el) * math.sin(az), math.cos(el))

    def P(x, d, z):
        return (x * R[0] + d * R[1] + z * R[2], -(x * U[0] + d * U[1] + z * U[2]))

    def box(x0, x1, d0, d1, z0, z1):
        return {
            "top": [P(x0, d0, z1), P(x1, d0, z1), P(x1, d1, z1), P(x0, d1, z1)],
            "front": [P(x0, d0, z0), P(x1, d0, z0), P(x1, d0, z1), P(x0, d0, z1)],
            "right": [P(x1, d0, z0), P(x1, d1, z0), P(x1, d1, z1), P(x1, d0, z1)],
        }

    BD, CD, L = 35, 125, 1900          # batten depth, chord depth (exaggerated), truss run
    trusses = [0, 600, 1200, 1800]
    hw = 17.5
    pad = (500, 1100)                  # nogging run along the trusses (600)
    nog_x = (trusses[0] + hw, trusses[2] - hw)
    battens = [150, 600, 1050, 1500]   # battens run across the trusses, 70 wide
    items = [("lining", box(-260, 2060, -160, L + 140, -16, 0))]
    for d in sorted(battens, reverse=True):
        d0, d1 = d - 35, d + 35
        if d1 > pad[0] and d0 < pad[1]:
            items.append(("batten", box(-260, nog_x[0], d0, d1, 0, BD)))
            items.append(("batten", box(nog_x[1], 2060, d0, d1, 0, BD)))
        else:
            items.append(("batten", box(-260, 2060, d0, d1, 0, BD)))
    for k, t in enumerate(trusses):
        items.append(("truss", box(t - hw, t + hw, -60, L, BD, BD + CD)))
        if k < 2:
            items.append(("nog", box(t + hw, trusses[k + 1] - hw, pad[0], pad[1], 0, BD + CD)))
    pts = [p for _, b in items for f in b.values() for p in f]
    minx, maxx = min(p[0] for p in pts), max(p[0] for p in pts)
    miny, maxy = min(p[1] for p in pts), max(p[1] for p in pts)
    k = min((width - 20) / (maxx - minx), (height - 20) / (maxy - miny))
    ox = (width - (maxx - minx) * k) / 2 - minx * k
    oy = (height - (maxy - miny) * k) / 2 - miny * k
    T = lambda pt: (ox + pt[0] * k, oy + pt[1] * k)
    s = S(width, height)
    for kind, b in items:
        if kind == "lining":
            for fn in ("top", "front", "right"):
                s.poly([T(p) for p in b[fn]], fill=INK, st=SOFT, sw=0.7)
        elif kind == "batten":
            for fn in ("right", "front", "top"):
                s.poly([T(p) for p in b[fn]], fill=INK, st=SOFT, sw=0.7, join="round")
        elif kind == "truss":
            for fn in ("right", "front", "top"):
                s.poly([T(p) for p in b[fn]], fill=INK, st=LINE, sw=0.8, join="round")
        else:
            s.poly([T(p) for p in b["front"]], fill=OR_DK, st=OR, sw=0.6, join="round")
            s.poly([T(p) for p in b["top"]], fill=OR, st=OR, sw=0.6, join="round")
    return s.svg(style="display:block;width:100%;height:auto")


if __name__ == "__main__":
    import pathlib
    out = pathlib.Path("svg_preview")
    out.mkdir(exist_ok=True)
    for name, fn in [("plan", plan_svg), ("compare", compare_svg), ("section", section_svg),
                     ("notok", notok_svg), ("elevation", elevation_svg), ("iso", iso_svg)]:
        (out / f"{name}.svg").write_text(fn())
    print("ok")
