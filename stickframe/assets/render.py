#!/usr/bin/env python3
"""
Render a Tower v2 (Client Edition) HTML document to A4 PDF.

Usage:
    python render.py input.html "Output Name.pdf"

Requires: playwright (pip install playwright --break-system-packages && playwright install chromium)

Notes:
- The HTML must use the Tower stylesheet (assets/tower-v2.css) and component classes.
- Portrait A4 by default. Landscape pages use class="page land" + the named
  @page rule already defined in tower.css.
- After rendering, ALWAYS rasterize and visually verify each page for overflow
  (a blank/near-blank trailing page means a content page is a few mm too tall).
"""
import sys
from playwright.sync_api import sync_playwright

def render(input_html, output_pdf):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(f"file://{input_html}")
        pg.wait_for_timeout(1300)  # let fonts/images settle
        pg.pdf(
            path=output_pdf,
            format="A4",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
        )
        b.close()
    print(f"Rendered: {output_pdf}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python render.py input.html 'Output Name.pdf'")
        sys.exit(1)
    render(sys.argv[1], sys.argv[2])
