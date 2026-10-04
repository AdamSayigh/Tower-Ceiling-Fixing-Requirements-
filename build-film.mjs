import { build } from 'esbuild';
import fs from 'fs';

const SK = 'assets';   // fonts and logo, kept in the repo
const b64 = p => fs.readFileSync(p).toString('base64');

const res = await build({
  entryPoints: ['src/film.js'], bundle: true, minify: true, format: 'iife',
  target: ['chrome90', 'safari15', 'firefox90', 'edge90'], write: false, legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
let html = fs.readFileSync('src/film.html', 'utf8');
const subs = {
  RUBIK300: b64(`${SK}/fonts/rubik-latin-300-normal.woff2`),
  RUBIK400: b64(`${SK}/fonts/rubik-latin-400-normal.woff2`),
  RUBIK500: b64(`${SK}/fonts/rubik-latin-500-normal.woff2`),
  RUBIK600: b64(`${SK}/fonts/rubik-latin-600-normal.woff2`),
  POPPINS500: b64(`${SK}/fonts/poppins-latin-500-normal.woff2`),
  LOGO: b64(`${SK}/tower-logo-reversed.png`),
};
for (const [k, v] of Object.entries(subs)) html = html.split(`{{${k}}}`).join(v);
html = html.replace('{{SCRIPT}}', () => js);
const left = html.match(/\{\{[A-Z0-9_]+\}\}/g);
if (left) throw new Error('unfilled: ' + left.join(','));
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/film.html', html);
console.log('dist/film.html', (html.length / 1024).toFixed(0) + ' KB', 'js', (js.length / 1024).toFixed(0) + ' KB');
