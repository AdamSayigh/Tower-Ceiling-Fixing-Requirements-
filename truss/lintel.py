"""Steel lintel drawings for the ceiling fixing documents (Rev B; drum and cable aligned with the guide in Rev C).

Shared by the truss and stick-framed documents: the head detail is the same whatever the roof.
Same drawing language as drawings.py: hairlines, Rubik 7-9 px, orange only for what is
specified (solid blocking), orange-light dashes for what is missing.
"""
from drawings import (S, OR, OR_LT, LINE, SOFT, FAINT, DIM, TXT, MUTE, INK, tick, dim_h, ko_text,
                      ko_vtext, ext, cl_mark, leader, break_v, bad_mark, ok_mark)

STEEL = "#8d939d"
STEEL_LT = "#c3c8d0"
HW = "#fff"
OPEN, SIDE, BEAR = 2400, 150, 550          # half opening, blocking past the edge, beam end from the edge


def _hatch(s, pid, col="rgba(16,16,22,.55)", bg=STEEL_LT, gap=3.2):
    s.defs.append(f'<pattern id="{pid}" width="{gap}" height="{gap}" patternUnits="userSpaceOnUse" '
                  f'patternTransform="rotate(45)"><rect width="{gap}" height="{gap}" fill="{bg}"/>'
                  f'<line x1="0" y1="0" x2="0" y2="{gap}" stroke="{col}" stroke-width="0.9"/></pattern>')


def _wallhatch(s, pid):
    s.defs.append(f'<pattern id="{pid}" width="7" height="7" patternUnits="userSpaceOnUse" '
                  f'patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="{FAINT}" '
                  f'stroke-width="0.8"/></pattern>')


def _lvl(s, x, y, w, h, step=5.5):
    s.rect(x, y, w, h, fill=OR, st=OR_LT, sw=0.6)
    yy = y + step
    while yy < y + h - 1.5:
        s.line(x + 1, yy, x + w - 1, yy, "rgba(40,12,2,.28)", 0.5)
        yy += step


def _coil(s, x0, x1, yc, r, pitch):
    """Torsion spring in elevation: wound wire drawn as slanted strokes inside a tube."""
    s.rect(x0, yc - r, x1 - x0, 2 * r, fill="#1c1e23", st=LINE, sw=0.6)
    x = x0 + pitch * 0.5
    while x < x1 - pitch * 0.3:
        s.line(x - pitch * 0.35, yc + r - 0.4, x + pitch * 0.35, yc - r + 0.4, "rgba(231,231,249,.55)", 0.6)
        x += pitch


# ================================================================== HALF ELEVATION
def lintel_elev_svg():
    W = 642
    s = S(W, 200)
    _hatch(s, "stl")
    _wallhatch(s, "wl")
    sc = 0.175
    X = lambda x: 18 + (x + 120) * sc
    top = 66
    Y = lambda y: top + y * sc                      # y: mm below the underside of the ceiling
    B0, B1, TF = 50, 300, 10                         # beam from 50 to 300 below the ceiling, 10 flanges
    xL, xe = -120, OPEN + BEAR                       # drawn from just left of the centreline to the beam end
    xR = xe + 60
    yBot = 640

    # wall above the beam and beside the opening (hatched), the side room (soft orange)
    s.rect(X(xL), Y(0), X(xR) - X(xL), Y(B0) - Y(0), fill="url(#wl)", st=SOFT, sw=0.5)
    s.rect(X(OPEN), Y(B1), X(xR) - X(OPEN), Y(yBot) - Y(B1), fill="url(#wl)", st=SOFT, sw=0.5)
    s.rect(X(OPEN), Y(B1), SIDE * sc, Y(yBot) - Y(B1), fill="rgba(218,94,45,.3)")
    s.line(X(xL) - 6, Y(0), X(xR) + 6, Y(0), LINE, 0.9)
    s.text(X(1700), Y(0) - 4, "Ceiling", 7, MUTE, ls=0.8)

    # steel lintel: flange tips seen from the garage; beyond the blocking, the open recess
    s.rect(X(xL), Y(B0), X(xe) - X(xL), Y(B1) - Y(B0), fill="#15161a", st=LINE, sw=0.6)
    for ya in (B0, B1 - TF):
        s.rect(X(xL), Y(ya), X(xe) - X(xL), TF * sc, fill="url(#stl)", st=LINE, sw=0.6)
    s.line(X(xe), Y(B0), X(xe), Y(B1), LINE, 0.8)
    # LVL blocking between the flanges: straight through, 150 past the edge of the opening
    _lvl(s, X(xL), Y(B0 + TF), X(OPEN + SIDE) - X(xL), (B1 - B0 - 2 * TF) * sc, step=5)
    break_v(s, X(xL), Y(-10), Y(yBot - 10))

    # door, closed, top panel below the head
    s.rect(X(xL), Y(B1) + 1.5, X(OPEN) - X(xL), Y(yBot) - Y(B1) - 1.5, st=LINE, sw=0.8)
    s.line(X(xL), Y(B1 + 250), X(OPEN), Y(B1 + 250), SOFT, 0.7)

    # spring hardware (by Tower), in front of the blocking
    sy, sr = 145, 12.5
    s.rect(X(xL), Y(sy - sr), X(OPEN + 140) - X(xL), 2 * sr * sc, fill="#2a2c33", st=HW, sw=0.6)
    _coil(s, X(210), X(1095), Y(sy), 30 * sc, 3.9)
    for xc in (185, 1120):
        s.rect(X(xc - 12), Y(sy - 36), 24 * sc, 72 * sc, fill="#3a3d45", st=HW, sw=0.6)
    for xa, xb in ((90, 150), (OPEN + 85, OPEN + 145)):
        s.rect(X(xa), Y(sy - 72), X(xb) - X(xa), 135 * sc, fill="#d5d9e0", st=HW, sw=0.6)
        for yy in (sy - 48, sy + 36):
            s.circle(X((xa + xb) / 2), Y(yy), 1.5, fill="#1c1e23", st="none", sw=0)
    s.rect(X(OPEN + 80), Y(sy - 60), 50 * sc, 120 * sc, fill="#9aa0aa", st=HW, sw=0.6)
    for k in range(1, 5):
        s.line(X(OPEN + 80 + k * 10), Y(sy - 60), X(OPEN + 80 + k * 10), Y(sy + 60), "rgba(16,16,22,.45)", 0.5)
    s.line(X(OPEN + 88), Y(sy + 50), X(OPEN + 88), Y(yBot), HW, 0.6)          # lifting cable, just outside the track

    # setout lines: centreline, edge of opening
    s.line(X(0), 40, X(0), Y(yBot), SOFT, 0.7, dash="10 3 2 3")
    cl_mark(s, X(0) + 9, 44, 10)
    s.line(X(OPEN), 40, X(OPEN), Y(yBot), TXT, 0.7, dash="10 3 2 3")
    ko_text(s, X(OPEN) - 5, Y(yBot) - 5, "Edge of opening", 7, MUTE, "end", ls=0.8)

    # 150 min past the edge of the opening, above the ceiling line
    yd = 52
    ext(s, X(OPEN + SIDE), Y(B0 + TF) - 1, X(OPEN + SIDE), yd - 3)
    dim_h(s, [X(OPEN), X(OPEN + SIDE)], yd, [None])
    ko_text(s, (X(OPEN) + X(OPEN + SIDE)) / 2, yd - 8, "150 min", 8.5, TXT, "middle", ls=0.6)

    # callouts
    leader(s, [(X(650), Y(sy) - 4), (X(650), 22), (X(650) + 6, 22)])
    s.lines(X(650) + 10, 25, ["Springs, brackets and cable drums by Tower,", "fixed to the blocking"], 7.2,
            fill=TXT, ls=0.6, lh=9.6)
    leader(s, [(X(xe - 160), Y(B0) + 2.5), (X(xe - 160), 22), (X(xe - 160) + 6, 22)])
    s.lines(X(xe - 160) + 10, 18, ["Steel lintel", "I-beam or U-beam", "by builder"], 7, fill=MUTE, ls=0.6, lh=9.2)
    leader(s, [(X(520), Y(B1 - TF - 22)), (X(520), Y(B1 + 120)), (X(520) + 6, Y(B1 + 120))])
    ko_text(s, X(520) + 10, Y(B1 + 120) + 2.6, "Solid nogging or LVL between the flanges, straight through", 7.5, TXT, ls=0.55)
    leader(s, [(X(OPEN + 128), Y(B1 + 300)), (X(OPEN + 310), Y(B1 + 300))])
    ko_text(s, X(OPEN + 316), Y(B1 + 300) + 2.6, "Side room", 7.2, MUTE, ls=0.6)
    leader(s, [(X(OPEN + 88), Y(B1 + 230)), (X(OPEN - 160), Y(B1 + 230))])
    ko_text(s, X(OPEN - 166), Y(B1 + 230) + 2.6, "Lifting cable", 7.2, MUTE, "end", ls=0.6)
    yl = Y(B1 + 150)
    leader(s, [(X(OPEN + 128), Y(sy + 30)), (X(OPEN + 205), Y(sy + 30)), (X(OPEN + 205), yl), (X(OPEN + 310), yl)])
    ko_text(s, X(OPEN + 316), yl + 2.6, "Cable drum and", 7.2, TXT, ls=0.6)
    ko_text(s, X(OPEN + 316), yl + 12.2, "end bracket", 7.2, TXT, ls=0.6)
    s.h = int(Y(yBot) + 6)
    return s.svg()


# ================================================================== FOUR PANELS: how the blocking sits, what fails
def lintel_panels_svg():
    W, H = 642, 250
    s = S(W, H)
    _hatch(s, "stp")
    pw, gap = 150, 14
    sc = 0.36                                        # px per mm in the sections
    y0 = 50                                          # top of the beam in each panel
    bh = 250 * sc
    tf = 10 * sc

    def section(ox, kind, blocked):
        """Beam section, garage side to the right. kind 'I' or 'U'."""
        fw = (146 if kind == "I" else 90) * sc
        ww = (7 if kind == "I" else 8) * sc
        xr = ox + 96                                 # flange tips (garage face)
        xl = xr - fw
        wx = xl + (fw - ww) / 2 if kind == "I" else xl
        for ya in (y0, y0 + bh - tf):
            s.rect(xl, ya, fw, tf, fill="url(#stp)", st=LINE, sw=0.5)
        s.rect(wx, y0 + tf, ww, bh - 2 * tf, fill="url(#stp)", st=LINE, sw=0.5)
        if kind == "I":
            s.rect(xl, y0 + tf, wx - xl, bh - 2 * tf, fill="#101115", st=SOFT, sw=0.4)
        rx0, rw = wx + ww, xr - (wx + ww)
        if blocked:
            _lvl(s, rx0, y0 + tf, rw, bh - 2 * tf, step=4.4)
        else:
            s.rect(rx0, y0 + tf, rw, bh - 2 * tf, fill="rgba(255,130,81,.10)", st=OR_LT, sw=0.9, dash="3 2")
        # end bracket leg on the garage face, two screws
        s.rect(xr, y0 + bh * 0.2, 2.2, bh * 0.55, fill=HW)
        for f in (0.3, 0.62):
            yy = y0 + bh * f
            tip = rx0 + 4 if blocked else xr - 12
            s.line(xr + 2.2, yy, tip, yy, HW, 1.1)
            s.line(xr + 2.2, yy - 2.2, xr + 2.2, yy + 2.2, HW, 1.6)
        # flush line at the flange tips
        s.line(xr, y0 - 9, xr, y0 + bh + 9, OR_LT if blocked else SOFT, 0.8, dash="3 2")
        s.text(ox + pw - 4, y0 - 12, "Garage side \u203a", 7, MUTE, "end", ls=0.6)
        s.text(ox + 4, y0 - 12, "Section", 7, MUTE, ls=0.6)
        return xr

    caps = [
        ("ok", "I-beam", ["Blocking between the flanges,", "flush with them."]),
        ("ok", "U-beam", ["Blocking fills the channel,", "flush with the flanges."]),
        ("bad", "Not blocked out", ["Open steel. The brackets have", "nothing solid to fix to."]),
        ("bad", "Stops at the opening", ["Nothing past the edge for", "the cable drum bracket."]),
    ]
    for p, (kind, title, lines) in enumerate(caps):
        ox = p * (pw + gap)
        if kind == "ok":
            ok_mark(s, ox + pw - 10, 14)
            s.text(ox + 4, 18, "Correct", 7.5, TXT, ls=1.4)
        else:
            bad_mark(s, ox + pw - 10, 14)
            s.text(ox + 4, 18, "Not acceptable", 7.5, OR_LT, ls=1.4)
        if p == 0:
            section(ox, "I", True)
        elif p == 1:
            section(ox, "U", True)
        elif p == 2:
            xr = section(ox, "I", False)
            s.text(xr + 8, y0 + bh + 12, "Nothing to fix to", 7, OR_LT, "end", ls=0.5)
        else:
            # mini elevation of the end: blocking stops at the edge, drum bracket past it on open steel
            e = 0.115
            Xm = lambda x: ox + 4 + (x - 1990) * e
            s.text(ox + 4, y0 - 12, "Elevation", 7, MUTE, ls=0.6)
            yb0, yb1 = y0 + 6, y0 + bh - 6
            s.rect(Xm(1990), yb0, Xm(OPEN + BEAR) - Xm(1990), yb1 - yb0, fill="#15161a", st=LINE, sw=0.6)
            for ya in (yb0, yb1 - 3.6):
                s.rect(Xm(1990), ya, Xm(OPEN + BEAR) - Xm(1990), 3.6, fill="url(#stp)", st=LINE, sw=0.5)
            _lvl(s, Xm(1990), yb0 + 3.6, Xm(OPEN) - Xm(1990), yb1 - yb0 - 7.2, step=4.4)
            s.rect(Xm(OPEN), yb0 + 3.6, Xm(OPEN + SIDE) - Xm(OPEN), yb1 - yb0 - 7.2, fill="rgba(255,130,81,.10)",
                   st=OR_LT, sw=0.9, dash="3 2")
            ys = (yb0 + yb1) / 2
            s.rect(Xm(1990), ys - 1.6, Xm(OPEN + 140) - Xm(1990), 3.2, fill="#2a2c33", st=HW, sw=0.5)
            s.rect(Xm(OPEN + 85), ys - 15, 60 * e, 29, fill="#d5d9e0", st=HW, sw=0.5)
            s.rect(Xm(OPEN + 62), ys - 11, 55 * e, 22, fill="#9aa0aa", st=HW, sw=0.5)
            s.line(Xm(OPEN), y0 - 12, Xm(OPEN), y0 + bh + 12, TXT, 0.7, dash="8 2.5 1.5 2.5")
            s.text(Xm(OPEN) + 3, y0 + bh + 12, "Edge of opening", 7, MUTE, ls=0.5)
        s.text(ox + 4, y0 + bh + 36, title, 9, "#fff", wt=500, ls=0.5, upper=False)
        s.lines(ox + 4, y0 + bh + 51, lines, 9, fill=DIM, ls=0.2, upper=False, lh=13)
    s.h = int(y0 + bh + 72)
    return s.svg()


if __name__ == "__main__":
    import pathlib
    out = pathlib.Path("svg_preview")
    out.mkdir(exist_ok=True)
    (out / "lintel_elev.svg").write_text(lintel_elev_svg())
    (out / "lintel_panels.svg").write_text(lintel_panels_svg())
    print("ok")
