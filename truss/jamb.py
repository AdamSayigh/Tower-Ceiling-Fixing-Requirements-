"""Side room drawings for the ceiling fixing documents (Rev C).

Shared by the truss and stick-framed documents: the side room is the same whatever the roof.
Plan sections through the right-hand jamb, seen from above, street side at the top and the
garage below. Same drawing language as drawings.py and lintel.py: hairlines, Rubik 7-9 px,
orange only for what is specified (solid fixing in the side room), orange-light dashes for
what is missing. Track, angle and screw positions match the 3D guide.
"""
from drawings import (S, OR, OR_LT, LINE, SOFT, FAINT, DIM, TXT, MUTE, INK, tick, dim_h, ko_text, ext,
                      leader, bad_mark, ok_mark)

HW = "#d5d9e0"            # galvanised steel, drawn as its own thickness
OPEN, SIDE, WALL_T = 2400, 150, 250
# mm from the edge of the opening (x) and from the garage face of the wall (z, + into the garage)
DOOR_EDGE = 40            # the behind-fit door overlaps the opening
TX0, TX1, TZ0, TZ1 = 50, 80, 35, 85     # vertical track (C-channel, open towards the door)
ANG = 145                 # outer edge of the mounting angle's wall leg
SCREW, SCREW_L = 115, 75  # fixing through the angle into the side room
NARROW = 80               # the 'too narrow' case: solid stops 80 from the edge
PIPE_Z, PIPE_R = 17, 16   # conduit on the face of the side room


def _wallhatch(s, pid, gap=6):
    s.defs.append(f'<pattern id="{pid}" width="{gap}" height="{gap}" patternUnits="userSpaceOnUse" '
                  f'patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="{gap}" stroke="{FAINT}" '
                  f'stroke-width="0.8"/></pattern>')


def _sidehatch(s, pid, gap=5):
    """Solid fixing in section: site orange with a darker hatch."""
    s.defs.append(f'<pattern id="{pid}" width="{gap}" height="{gap}" patternUnits="userSpaceOnUse" '
                  f'patternTransform="rotate(45)"><rect width="{gap}" height="{gap}" fill="{OR}"/>'
                  f'<line x1="0" y1="0" x2="0" y2="{gap}" stroke="rgba(52,16,4,.42)" stroke-width="0.9"/></pattern>')


def _track(s, X, Z, dz=0, w=1.6):
    """Vertical track (C-channel) and its mounting angle, dz mm out from the wall."""
    t = 1.5                                   # half the 3 mm wall, mm (the stroke is drawn on the centreline)
    s.poly([(X(TX0 + t), Z(TZ0 + 11 + dz)), (X(TX0 + t), Z(TZ0 + t + dz)), (X(TX1 - t), Z(TZ0 + t + dz)),
            (X(TX1 - t), Z(TZ1 - t + dz)), (X(TX0 + t), Z(TZ1 - t + dz)), (X(TX0 + t), Z(TZ1 - 11 + dz))],
           st=HW, sw=w, close=False, join="miter")
    a = 2                                     # half the 4 mm angle
    s.poly([(X(ANG), Z(a + dz)), (X(TX1 + a), Z(a + dz)), (X(TX1 + a), Z(TZ1 + dz))],
           st=HW, sw=w * 1.25, close=False, join="miter")


def _screw(s, X, Z, end_z, sw=1.5, head=True):
    """Screw through the angle's wall leg (z = 4) into the wall, its tip at end_z."""
    s.line(X(SCREW), Z(4), X(SCREW), Z(end_z), "#fff", sw)
    if head:
        s.rect(X(SCREW - 8), Z(4) , (16) * abs(X(1) - X(0)), abs(Z(9) - Z(4)), fill="#fff")


def _door(s, X, Z, x0):
    s.rect(X(x0), Z(40), X(DOOR_EDGE) - X(x0), Z(80) - Z(40), fill="#15161a", st=LINE, sw=0.7)


def _edge(s, X, y0, y1, label=None, fs=7):
    s.line(X(0), y0, X(0), y1, TXT, 0.7, dash="10 3 2 3")
    if label:
        s.text(X(0) - 4, y1 - 3, label, fs, MUTE, "end", ls=0.6)


# ================================================================== PLAN SECTION: the right-hand jamb, correct
def jamb_plan_svg():
    W = 642
    s = S(W, 300)
    _wallhatch(s, "jw")
    _sidehatch(s, "js")
    sc = 0.5
    xa, xb = -330, 520                        # drawn from inside the opening to the wall beyond the side room
    X = lambda x: 26 + (x - xa) * sc
    top = 44
    Z = lambda z: top + (z + WALL_T) * sc     # street face of the wall at the top
    zg = 150                                  # depth drawn into the garage

    # wall: the side room (solid fixing, orange), then the wall beyond it (hatched), broken off at the right
    s.rect(X(SIDE), Z(-WALL_T), X(xb) - X(SIDE), Z(0) - Z(-WALL_T), fill="url(#jw)")
    s.poly([(X(xb), Z(-WALL_T)), (X(SIDE), Z(-WALL_T)), (X(SIDE), Z(0)), (X(xb), Z(0))], st=LINE, sw=0.8, close=False)
    yb = (Z(-WALL_T) + Z(0)) / 2
    s.poly([(X(xb), Z(-WALL_T) - 4), (X(xb), yb - 5), (X(xb) - 3.5, yb - 2), (X(xb) + 3.5, yb + 2), (X(xb), yb + 5),
            (X(xb), Z(0) + 4)], st=LINE, sw=0.8, close=False)
    s.rect(X(0), Z(-WALL_T), X(SIDE) - X(0), Z(0) - Z(-WALL_T), fill="url(#js)", st=OR_LT, sw=0.8)

    # edge of the opening (setout line) and the door behind it, broken off at the left
    _edge(s, X, Z(-WALL_T) - 30, Z(zg))
    _door(s, X, Z, xa)
    s.poly([(X(xa), Z(40) - 4), (X(xa), Z(60) - 4), (X(xa) - 3.5, Z(60) - 1.5), (X(xa) + 3.5, Z(60) + 1.5),
            (X(xa), Z(60) + 4), (X(xa), Z(80) + 4)], st=LINE, sw=0.8, close=False)
    # roller in the track, on a stem from the edge of the door
    s.line(X(DOOR_EDGE), Z(60), X(58), Z(60), HW, 1.2)
    s.rect(X(58), Z(39), X(72) - X(58), Z(81) - Z(39), fill="#2a2c33", st=HW, sw=0.6)
    _track(s, X, Z)
    _screw(s, X, Z, 4 - SCREW_L, sw=1.6)

    # 150 min, measured on the street side
    yd = Z(-WALL_T) - 14
    for x in (X(0), X(SIDE)):
        ext(s, x, Z(-WALL_T) - 2, x, yd - 3)
    dim_h(s, [X(0), X(SIDE)], yd, [None])
    ko_text(s, (X(0) + X(SIDE)) / 2, yd - 7, "150 min", 8.5, TXT, "middle", ls=0.6)

    # callouts: what is what
    s.text(X(-170), Z(-150), "Opening", 7.5, MUTE, "middle", ls=0.8)
    s.text(X(-200), Z(116), "Garage", 7.5, MUTE, "middle", ls=0.8)
    s.text(X(xa) + 8, Z(40) - 5, "Door \u00b7 behind fit", 7, MUTE, ls=0.6)
    xl = X(xb) + 14
    leader(s, [(X(75), Z(-175)), (xl - 4, Z(-175))])
    s.lines(xl, Z(-175) - 2, ["Side room", "solid fixing"], 7.6, fill=TXT, ls=0.6, lh=10.5)
    leader(s, [(X(400), Z(-85)), (xl - 4, Z(-85))])
    s.text(xl, Z(-85) + 2.6, "Wall", 7.2, MUTE, ls=0.6)
    leader(s, [(X(SCREW), Z(-45)), (X(SCREW) + 16, Z(-25)), (xl - 4, Z(-25))])
    s.lines(xl, Z(-25) - 2, ["Screwed into", "the side room"], 7.6, fill=TXT, ls=0.6, lh=10.5)
    yr1, yr2 = Z(100), Z(130)
    leader(s, [(X(ANG - 8), Z(2)), (X(ANG + 50), yr1), (xl - 4, yr1)])
    s.text(xl, yr1 + 2.6, "Mounting angle \u00b7 by Tower", 7.2, TXT, ls=0.6)
    leader(s, [(X(TX0 + 15), Z(TZ1)), (X(TX0 + 15), yr2), (xl - 4, yr2)])
    s.text(xl, yr2 + 2.6, "Vertical track \u00b7 by Tower", 7.2, TXT, ls=0.6)
    ko_text(s, X(0) - 5, Z(zg) - 4, "Edge of opening", 7, MUTE, "end", ls=0.6)
    s.h = int(Z(zg) + 6)
    return s.svg()


# ================================================================== THREE PANELS: correct, too narrow, obstructed
def jamb_panels_svg():
    W = 642
    pw, gap = 200, 21
    s = S(W, 240)
    _wallhatch(s, "pw", gap=5)
    _sidehatch(s, "ps", gap=4.5)
    sc = 0.31
    xa, xb = -110, 420
    y0 = 48                                   # street face of the wall in each panel

    def panel(ox, kind):
        X = lambda x: ox + 4 + (x - xa) * sc
        Z = lambda z: y0 + (z + WALL_T) * sc
        solid = NARROW if kind == "narrow" else SIDE
        if kind == "narrow":
            # a framed wall: plasterboard both sides and a cavity between, short of the 150
            for z1, z2 in ((-10, 0), (-WALL_T, -WALL_T + 10)):
                s.rect(X(solid), Z(z1), X(xb) - X(solid), Z(z2) - Z(z1), fill="rgba(231,231,249,.42)")
            s.line(X(xb), Z(-WALL_T), X(xb), Z(0), SOFT, 0.6)
            s.rect(X(solid), Z(-WALL_T + 10), X(SIDE) - X(solid), Z(-10) - Z(-WALL_T + 10),
                   fill="rgba(255,130,81,.10)", st=OR_LT, sw=0.9, dash="3 2")
        else:
            s.rect(X(SIDE), Z(-WALL_T), X(xb) - X(SIDE), Z(0) - Z(-WALL_T), fill="url(#pw)", st=SOFT, sw=0.6)
        s.rect(X(0), Z(-WALL_T), X(solid) - X(0), Z(0) - Z(-WALL_T), fill="url(#ps)", st=OR_LT, sw=0.7)
        _edge(s, X, Z(-WALL_T) - 12, Z(125))
        _door(s, X, Z, xa)
        if kind == "obstruct":
            s.circle(X(SCREW), Z(PIPE_Z), PIPE_R * sc, fill="#d9dce2", st=OR_LT, sw=0.8)
            s.circle(X(SCREW), Z(PIPE_Z), PIPE_R * sc * 0.62, fill="#15161a", st="none", sw=0)
            _track(s, X, Z, dz=PIPE_Z + PIPE_R, w=1.2)
        else:
            _track(s, X, Z, w=1.2)
            _screw(s, X, Z, 4 - SCREW_L, sw=1.2)
        # 150 above each section, so the shortfall reads against it
        yd = Z(-WALL_T) - 9
        dim_h(s, [X(0), X(SIDE)], yd, [None], over=2)
        s.text((X(0) + X(SIDE)) / 2, yd - 4, "150 min", 7, TXT, "middle", ls=0.5)
        return X, Z

    caps = [
        ("ok", "150 mm solid", ["Track and angle in the side room,", "screwed into solid."]),
        ("narrow", "Less than 150 mm", ["The screws hold only plasterboard.", "Side jambs are then needed."]),
        ("obstruct", "Something in the side room", ["Pipe, conduit, switch or power point:", "the angle can’t sit flat."]),
    ]
    for p, (kind, title, lines) in enumerate(caps):
        ox = p * (pw + gap)
        if kind == "ok":
            ok_mark(s, ox + pw - 10, 12)
            s.text(ox + 4, 16, "Correct", 7.5, TXT, ls=1.4)
        else:
            bad_mark(s, ox + pw - 10, 12)
            s.text(ox + 4, 16, "Not acceptable", 7.5, OR_LT, ls=1.4)
        X, Z = panel(ox, kind)
        if kind == "narrow":
            s.text(X(290), Z(-WALL_T / 2) + 2.5, "Cavity", 6.5, OR_LT, "middle", ls=0.4)
        if kind == "obstruct":
            s.text(X(SIDE + 30), Z(PIPE_Z) + 2.5, "Conduit", 6.5, OR_LT, ls=0.4)
        yt = Z(125) + 20
        s.text(ox + 4, yt, title, 9, "#fff", wt=500, ls=0.5, upper=False)
        s.lines(ox + 4, yt + 15, lines, 9, fill=DIM, ls=0.2, upper=False, lh=13)
    s.h = int(y0 + (WALL_T + 125) * sc + 20 + 15 + 13 + 8)
    return s.svg()


if __name__ == "__main__":
    import pathlib
    out = pathlib.Path("svg_preview")
    out.mkdir(exist_ok=True)
    (out / "jamb_plan.svg").write_text(jamb_plan_svg())
    (out / "jamb_panels.svg").write_text(jamb_panels_svg())
    print("ok")
