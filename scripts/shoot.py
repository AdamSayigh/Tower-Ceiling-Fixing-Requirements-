"""Screenshot every chapter (and sub-step) of the guide at desktop and phone sizes."""
import json, sys, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent   # the guide folder
import os
THEME = os.environ.get('THEME', '')
URL = (ROOT / 'dist' / 'guide.html').as_uri() + (f'?theme={THEME}' if THEME else '')
PFX = 'L' if THEME == 'light' else ''
OUT = ROOT / 'shots'; OUT.mkdir(exist_ok=True)
SIZES = {'desk': dict(width=1440, height=900, dpr=1), 'phone': dict(width=390, height=844, dpr=2)}
only = sys.argv[1:]  # optional filters like desk or phone or a chapter index

SUBS = {3: 3, 6: 5, 7: 3, 8: 3, 9: 4, 10: 5, 11: 2}

with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name, s in SIZES.items():
        if only and name not in only and not any(o.isdigit() for o in only):
            continue
        ctx = b.new_context(viewport={'width': s['width'], 'height': s['height']}, device_scale_factor=s['dpr'],
                            is_mobile=(name == 'phone'), has_touch=(name == 'phone'))
        page = ctx.new_page()
        logs = []
        page.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
        page.goto(URL)
        page.wait_for_timeout(4800)
        info = page.evaluate('() => ({gl: window.__guide && window.__guide.gl, n: window.__guide && window.__guide.count})')
        print(name, 'info', info)
        page.screenshot(path=str(OUT / f'{PFX}{name}-00-intro-live.png'))
        n = info['n'] or 0
        for ci in range(n):
            if any(o.isdigit() for o in only) and str(ci) not in only:
                continue
            for si in range(SUBS.get(ci, 1)):
                page.evaluate(f'() => window.__guide.go({ci}, {si})')
                page.wait_for_timeout(3800 if si == 0 else 2600)
                page.screenshot(path=str(OUT / f'{PFX}{name}-{ci:02d}-{si}.png'))
        print(name, 'console:', json.dumps(logs[:30], indent=1))
        ctx.close()
    b.close()
