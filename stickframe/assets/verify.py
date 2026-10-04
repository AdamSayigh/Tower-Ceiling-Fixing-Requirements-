#!/usr/bin/env python3
"""
Verify a rendered Tower v2 (dark) PDF: page count, blank or clipped pages,
content running into the footer zone. Saves page images for eyeballing.

Usage:
    python verify.py "Name.pdf"

The pages are black, so this measures LIGHT pixels, not ink:
- light < 0.004           page is empty (something overflowed onto a new page,
                          or a page shell has no content)
- light > 0.45            page rendered white — the stylesheet did not load
- content in footer zone  body content sits where the footer lives (92–94% of
                          the page height). Pages have overflow:hidden, so
                          overflow does NOT create a new page here — it clips
                          silently. Trim the page or move content on.
Always look at the saved page images as well; the checks are heuristics.
"""
import sys
import numpy as np
from pdf2image import convert_from_path

def verify(pdf_path, dpi=70):
    imgs = convert_from_path(pdf_path, dpi=dpi)
    print(f"Pages: {len(imgs)}")
    for i, im in enumerate(imgs):
        a = np.array(im.convert("L"))
        lit = a > 60
        light = lit.mean()
        rows = lit.mean(axis=1)
        h = a.shape[0]
        footer_zone = rows[int(h * 0.915):int(h * 0.94)]
        flags = []
        if light < 0.004:
            flags.append("EMPTY page — overflow or empty shell")
        if light > 0.45:
            flags.append("WHITE page — stylesheet missing")
        if i > 0 and footer_zone.max() > 0.02:   # the cover's drawing sits there by design
            flags.append("content in the footer zone — trim this page")
        orient = "landscape" if im.size[0] > im.size[1] else "portrait"
        print(f"  p{i+1:2d} [{orient}] light={light:.3f}" + ("  <-- " + "; ".join(flags) if flags else ""))
        im.save(f"page_{i+1:02d}.png")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify.py 'Name.pdf'")
        sys.exit(1)
    verify(sys.argv[1])
