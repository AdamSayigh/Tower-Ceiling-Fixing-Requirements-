#!/usr/bin/env python3
"""
tower_v2.py — build helper for Tower Document Design v2 (Client Edition).

Three jobs:

  1. build   Inline the stylesheet, fonts and logo into a document and expand the
             two authoring tags (<t-title> and <t-elevation>) into SVG.

             python scripts/tower_v2.py build doc.html out.html

  2. title   Print a chrome-gradient heading as inline SVG (for ad-hoc use).

             python scripts/tower_v2.py title "Wind Load|Performance" 66

  3. elevation  Print a rear-elevation line drawing of a sectional door as SVG.

             python scripts/tower_v2.py elevation --scale 0.108 --hats c1 --annotate

Authoring tags (expanded by `build`):

  <t-title size="38">Engineered|for the site</t-title>
      One heading, lines separated by "|". Upper-cased automatically.
      Sizes used in the system: 66 (cover), 38 (page title).

  <t-elevation scale="0.108" hats="none|base|c1" annotate="0|1" pad="34,56,10,40"
               width="5200" height="2440" panels="4"></t-elevation>
      Door elevation. hats: none (frame only), base (one top hat per panel),
      c1 (base + dashed second hat on the middle panels). annotate adds
      dimensions and panel labels. pad is top,right,bottom,left in px.

Why headings are SVG: CSS gradient text (background-clip:text) prints a faint
rectangle around the heading in Chromium's PDF output. SVG text with a
linearGradient fill prints clean.
"""
import argparse, base64, html, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
SKILL = HERE.parent
ASSETS = SKILL / "assets"

ORANGE, ORANGE_LT = "#DA5E2D", "#FF8251"
LINE, LINE_SOFT, DIM = "rgba(231,231,249,.62)", "rgba(231,231,249,.28)", "rgba(231,231,249,.55)"

# ----------------------------------------------------------------- headings
def title_svg(lines, size=38, lh=0.98, weight=500, ls="0", margin_bottom=22):
    """Chrome-gradient uppercase heading as inline SVG."""
    gid = "g%05d" % (abs(hash("|".join(lines))) % 100000)
    h = size * lh * len(lines) + size * 0.12
    o = [f'<svg width="100%" height="{h:.0f}" style="display:block;overflow:visible;margin-bottom:{margin_bottom}px">',
         f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="1" y2="0">'
         f'<stop offset="0" stop-color="#9c9cab"/><stop offset=".45" stop-color="#ffffff"/>'
         f'<stop offset="1" stop-color="#9393a3"/></linearGradient></defs>']
    for i, t in enumerate(lines):
        y = size * 0.86 + i * size * lh
        o.append(f'<text x="0" y="{y:.1f}" font-family="Rubik" font-weight="{weight}" '
                 f'font-size="{size}" letter-spacing="{ls}" fill="url(#{gid})">{html.escape(t.upper())}</text>')
    o.append("</svg>")
    return "\n".join(o)

# ----------------------------------------------------------------- drawing
def elevation(scale=0.108, hats="none", annotate=False, pad=(0, 0, 0, 0),
              width=5200, height=2440, panels=4, bays=4, stile_w=47, rail=48):
    """Rear elevation of a framed sectional door, as an SVG string.

    Rails are drawn as bands: a full-height rail at the top and bottom edges,
    and a double rail (two panels meeting) at each panel junction. Top hats
    are drawn as orange bands on the rear face.
    """
    W, H, s = width, height, scale
    ph = H / panels
    pt, pr, pb, pl = pad
    X = lambda v: pl + v * s
    Y = lambda v: pt + v * s
    vw, vh = W * s + pl + pr, H * s + pt + pb
    o = [f'<svg viewBox="0 0 {vw:.1f} {vh:.1f}" xmlns="http://www.w3.org/2000/svg" '
         f'font-family="Rubik, Arial, sans-serif" style="display:block;width:100%;height:auto;">']
    o.append(f'<rect x="{X(0):.1f}" y="{Y(0):.1f}" width="{W*s:.1f}" height="{H*s:.1f}" fill="none" stroke="{LINE}" stroke-width="1.1"/>')
    # rail bands: [top edge rail], [junction double rails], [bottom edge rail]
    bands = [(0, rail * 2)] + [(i * ph - rail, i * ph + rail) for i in range(1, panels)] + [(H - rail * 2, H)]
    for a, b in bands:
        for y in (a, b):
            if 0 < y < H:
                o.append(f'<line x1="{X(0):.1f}" y1="{Y(y):.1f}" x2="{X(W):.1f}" y2="{Y(y):.1f}" stroke="{LINE}" stroke-width="0.8"/>')
    for i in range(1, panels):
        j = i * ph
        o.append(f'<line x1="{X(0):.1f}" y1="{Y(j):.1f}" x2="{X(W):.1f}" y2="{Y(j):.1f}" stroke="{LINE_SOFT}" stroke-width="0.7" stroke-dasharray="3 3"/>')
    openings = [(bands[i][1], bands[i + 1][0]) for i in range(len(bands) - 1)]
    bay = W / bays
    for k in range(1, bays):
        cx = k * bay
        for a, b in openings:
            for x in (cx - stile_w / 2, cx + stile_w / 2):
                o.append(f'<line x1="{X(x):.1f}" y1="{Y(a):.1f}" x2="{X(x):.1f}" y2="{Y(b):.1f}" stroke="{LINE}" stroke-width="0.8"/>')
    for x in (stile_w, W - stile_w):
        for a, b in openings:
            o.append(f'<line x1="{X(x):.1f}" y1="{Y(a):.1f}" x2="{X(x):.1f}" y2="{Y(b):.1f}" stroke="{LINE_SOFT}" stroke-width="0.8"/>')
    # top hats
    hat_h, inset = 62, 70
    # one hat per panel: on the top rail of each panel except the last, which takes its bottom rail
    base = [20] + [i * ph + 4 for i in range(1, panels - 1)] + [H - rail * 2 + 18]
    # second hat on each middle panel, on that panel's bottom rail
    extra = [i * ph - rail - hat_h + 8 for i in range(2, panels)]
    if hats in ("base", "c1"):
        for y in base:
            o.append(f'<rect x="{X(inset):.1f}" y="{Y(y):.1f}" width="{(W-2*inset)*s:.1f}" height="{hat_h*s:.1f}" fill="{ORANGE}"/>')
    if hats == "c1":
        for y in extra:
            o.append(f'<rect x="{X(inset):.1f}" y="{Y(y):.1f}" width="{(W-2*inset)*s:.1f}" height="{hat_h*s:.1f}" fill="none" stroke="{ORANGE_LT}" stroke-width="1.1" stroke-dasharray="5 3"/>')
    if annotate:
        fs = 10
        yd = Y(0) - 22
        o.append(f'<line x1="{X(0):.1f}" y1="{yd:.1f}" x2="{X(W):.1f}" y2="{yd:.1f}" stroke="{DIM}" stroke-width="0.7"/>')
        for x in (X(0), X(W)):
            o.append(f'<line x1="{x:.1f}" y1="{yd-5:.1f}" x2="{x:.1f}" y2="{yd+5:.1f}" stroke="{DIM}" stroke-width="0.7"/>')
        o.append(f'<rect x="{X(W/2)-26:.1f}" y="{yd-8:.1f}" width="52" height="16" fill="#000"/>')
        o.append(f'<text x="{X(W/2):.1f}" y="{yd+4:.1f}" font-size="{fs}" fill="{DIM}" text-anchor="middle" letter-spacing="1">{W}</text>')
        xd = X(0) - 22
        o.append(f'<line x1="{xd:.1f}" y1="{Y(0):.1f}" x2="{xd:.1f}" y2="{Y(H):.1f}" stroke="{DIM}" stroke-width="0.7"/>')
        for y in (Y(0), Y(H)):
            o.append(f'<line x1="{xd-5:.1f}" y1="{y:.1f}" x2="{xd+5:.1f}" y2="{y:.1f}" stroke="{DIM}" stroke-width="0.7"/>')
        o.append(f'<rect x="{xd-8:.1f}" y="{Y(H/2)-26:.1f}" width="16" height="52" fill="#000"/>')
        o.append(f'<text x="{xd+4:.1f}" y="{Y(H/2):.1f}" font-size="{fs}" fill="{DIM}" text-anchor="middle" letter-spacing="1" transform="rotate(-90 {xd+1:.1f} {Y(H/2):.1f})">{H}</text>')
        xr = X(W) + 22
        top_last = (panels - 1) * ph
        o.append(f'<line x1="{xr:.1f}" y1="{Y(top_last):.1f}" x2="{xr:.1f}" y2="{Y(H):.1f}" stroke="{DIM}" stroke-width="0.7"/>')
        for y in (Y(top_last), Y(H)):
            o.append(f'<line x1="{xr-5:.1f}" y1="{y:.1f}" x2="{xr+5:.1f}" y2="{y:.1f}" stroke="{DIM}" stroke-width="0.7"/>')
        o.append(f'<text x="{xr+9:.1f}" y="{Y((top_last+H)/2)+4:.1f}" font-size="{fs}" fill="{DIM}" text-anchor="start" letter-spacing="1">{ph:g}</text>')
        for i, (a, b) in enumerate(openings):
            pos = "TOP" if i == 0 else ("BOTTOM" if i == len(openings) - 1 else "MIDDLE")
            o.append(f'<text x="{X(120):.1f}" y="{Y((a+b)/2)+4:.1f}" font-size="9" fill="{DIM}" letter-spacing="2">PANEL {i+1} · {pos}</text>')
    o.append("</svg>")
    return "\n".join(o)

# ----------------------------------------------------------------- build
def _b64(p):
    return base64.b64encode(pathlib.Path(p).read_bytes()).decode()

FONT_FACES = [
    ("Rubik", 300, "rubik-latin-300-normal.woff2"),
    ("Rubik", 400, "rubik-latin-400-normal.woff2"),
    ("Rubik", 500, "rubik-latin-500-normal.woff2"),
    ("Rubik", 600, "rubik-latin-600-normal.woff2"),
    ("Rubik", 700, "rubik-latin-700-normal.woff2"),
    ("Poppins", 500, "poppins-latin-500-normal.woff2"),
]

def embedded_css(assets=ASSETS):
    css = (assets / "tower-v2.css").read_text()
    faces = []
    for fam, wt, fn in FONT_FACES:
        faces.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};src:url(data:font/woff2;base64,{_b64(assets/'fonts'/fn)}) format('woff2');}}")
    # drop the relative @font-face lines from the stylesheet and prepend embedded ones
    css = re.sub(r"@font-face\{[^}]*\}\n?", "", css)
    return "\n".join(faces) + "\n" + css

def _expand_tags(doc):
    def t(m):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        size = float(attrs.get("size", 38))
        return title_svg(m.group(2).split("|"), size=size)
    doc = re.sub(r"<t-title([^>]*)>(.*?)</t-title>", t, doc, flags=re.S)
    def e(m):
        a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        pad = tuple(float(v) for v in a.get("pad", "0,0,0,0").split(","))
        return elevation(scale=float(a.get("scale", 0.108)), hats=a.get("hats", "none"),
                         annotate=a.get("annotate", "0") in ("1", "true", "yes"), pad=pad,
                         width=float(a.get("width", 5200)), height=float(a.get("height", 2440)),
                         panels=int(a.get("panels", 4)), bays=int(a.get("bays", 4)))
    doc = re.sub(r"<t-elevation([^>]*)>\s*</t-elevation>", e, doc, flags=re.S)
    return doc

def build(src, out, assets=ASSETS):
    doc = pathlib.Path(src).read_text()
    doc = doc.replace("{{CSS}}", "<style>\n" + embedded_css(assets) + "\n</style>")
    doc = doc.replace("{{LOGO_REV}}", _b64(assets / "tower-logo-reversed.png"))
    doc = _expand_tags(doc)
    leftover = re.findall(r"\{\{[A-Z_]+\}\}", doc)
    if leftover:
        sys.exit(f"unfilled placeholders: {sorted(set(leftover))}")
    pathlib.Path(out).write_text(doc)
    print(f"built {out} ({len(doc):,} bytes)")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build"); b.add_argument("src"); b.add_argument("out")
    b.add_argument("--assets", default=str(ASSETS))
    t = sub.add_parser("title"); t.add_argument("text"); t.add_argument("size", type=float, nargs="?", default=38)
    e = sub.add_parser("elevation")
    e.add_argument("--scale", type=float, default=0.108); e.add_argument("--hats", default="none")
    e.add_argument("--annotate", action="store_true"); e.add_argument("--pad", default="0,0,0,0")
    e.add_argument("--width", type=float, default=5200); e.add_argument("--height", type=float, default=2440)
    e.add_argument("--panels", type=int, default=4); e.add_argument("--bays", type=int, default=4)
    a = ap.parse_args()
    if a.cmd == "build":
        build(a.src, a.out, pathlib.Path(a.assets))
    elif a.cmd == "title":
        print(title_svg(a.text.split("|"), size=a.size))
    else:
        print(elevation(scale=a.scale, hats=a.hats, annotate=a.annotate,
                        pad=tuple(float(v) for v in a.pad.split(",")),
                        width=a.width, height=a.height, panels=a.panels, bays=a.bays))

if __name__ == "__main__":
    main()
