"""Assemble, build, render and verify the stick-frame ceiling fixing document."""
import pathlib
import subprocess
import sys

import drawings as D
import lintel as LT
import jamb as JB

HERE = pathlib.Path(__file__).resolve().parent
NAME = "Tower - Ceiling Fixing Requirements - Stick-Framed Roof.pdf"

src = (HERE / "doc-src.html").read_text()
for key, fn in [("iso", D.iso_svg), ("compare", D.compare_svg), ("plan", D.plan_svg),
                ("section", D.section_svg), ("notok", D.notok_svg),
                ("elevation", D.elevation_svg), ("lintelpanels", LT.lintel_panels_svg),
                ("lintel", LT.lintel_elev_svg), ("jambplan", JB.jamb_plan_svg),
                ("jambpanels", JB.jamb_panels_svg)]:
    tag = f"<!--SVG:{key}-->"
    assert tag in src, tag
    src = src.replace(tag, fn())
(HERE / "doc.html").write_text(src)

run = lambda *a: subprocess.run(a, check=True, cwd=HERE)
run(sys.executable, "scripts/tower_v2.py", "build", "doc.html", "out.html")
run(sys.executable, "assets/render.py", str(HERE / "out.html"), NAME)
run(sys.executable, "assets/verify.py", NAME)
