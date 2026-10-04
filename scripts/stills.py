"""Render still frames of the film at given times (seconds) and time each frame."""
import sys, time, pathlib, json
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent   # the guide folder
URL = (ROOT / 'dist' / 'film.html').as_uri()
OUT = ROOT / 'film-stills'; OUT.mkdir(exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

times = [float(x) for x in sys.argv[1:]] or [3, 8.5, 15, 22, 35, 50, 57, 62]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
    pg.goto(URL)
    pg.wait_for_function('window.__film && window.__film.ready === true', timeout=120000)
    info = pg.evaluate('({frames: __film.frames, total: __film.total, scenes: __film.scenes})')
    print(json.dumps(info))
    for t in sorted(times):
        f = int(round(t * 30))
        t0 = time.time()
        pg.evaluate(f'__film.seek({f})')
        t1 = time.time()
        pg.screenshot(path=str(OUT / f'f{f:05d}.png'))
        t2 = time.time()
        print(f't={t:6.2f}s frame={f} seek={t1-t0:.2f}s shot={t2-t1:.2f}s')
    # throughput test: 10 consecutive frames
    f0 = int(round(sorted(times)[-1] * 30))
    t0 = time.time()
    for f in range(f0 + 1, f0 + 11):
        pg.evaluate(f'__film.seek({f})')
        pg.screenshot(type='jpeg', quality=95)
    print('10 consecutive frames (jpeg):', round(time.time() - t0, 2), 's')
    t0 = time.time()
    for f in range(f0 + 11, f0 + 21):
        pg.evaluate(f'__film.seek({f})')
        pg.screenshot(type='png')
    print('10 consecutive frames (png):', round(time.time() - t0, 2), 's')
    print('errors:', errs[:10])
    b.close()
