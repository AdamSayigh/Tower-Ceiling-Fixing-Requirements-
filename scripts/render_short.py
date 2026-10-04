"""Render film frames to frames/fNNNNN.jpg. Resumable: frames already on disk are skipped.

usage: python render.py [f0] [f1]
"""
import sys, time, pathlib, base64
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent   # the guide folder
URL = (ROOT / 'dist' / 'film.html').as_uri() + '?cut=short'
OUT = ROOT / 'frames-short'; OUT.mkdir(exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
CHUNK = 1500


def log(msg):
    with open(ROOT / 'render-short.log', 'a') as fh:
        fh.write(time.strftime('%H:%M:%S ') + msg + '\n')


def main():
    f0 = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    f1 = int(sys.argv[2]) if len(sys.argv) > 2 else None
    start = time.time(); done = 0
    with sync_playwright() as p:
        c0 = f0
        while True:
            b = p.chromium.launch(args=ARGS)
            pg = b.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL)
            pg.wait_for_function('window.__film && window.__film.ready === true', timeout=180000)
            total = pg.evaluate('__film.frames')
            end = min(f1 if f1 is not None else total, total)
            if c0 >= end:
                b.close(); break
            cdp = pg.context.new_cdp_session(pg)
            c1 = min(end, c0 + CHUNK)
            log(f'chunk {c0}-{c1} of {end}')
            for f in range(c0, c1):
                path = OUT / f'f{f:05d}.jpg'
                if path.exists() and path.stat().st_size > 0:
                    continue
                pg.evaluate(f'__film.seek({f})')
                r = cdp.send('Page.captureScreenshot', {'format': 'jpeg', 'quality': 95, 'optimizeForSpeed': True})
                tmp = path.with_suffix('.tmp')
                tmp.write_bytes(base64.b64decode(r['data']))
                tmp.rename(path)
                done += 1
                if done % 60 == 0:
                    el = time.time() - start
                    rate = el / done
                    log(f'frame {f} / {end}  {rate:.3f}s/frame  eta {((end - f) * rate) / 60:.1f} min')
            if errs:
                log('page errors: ' + ' | '.join(errs[:5]))
            b.close()
            c0 = c1
    log(f'DONE {done} frames in {(time.time() - start) / 60:.1f} min')


if __name__ == '__main__':
    main()
