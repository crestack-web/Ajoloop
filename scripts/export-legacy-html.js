/**
 * Rebuild single-file kano-city.html from modular sources.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/styles/main.css'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/engine/game.js'), 'utf8');
let ui = fs.readFileSync(path.join(root, 'src/ui/app.js'), 'utf8');

const logoPath = path.join(root, 'public/logo.jpg');
let logoUri = '/logo.jpg';
if (fs.existsSync(logoPath)) {
  const b64 = fs.readFileSync(logoPath).toString('base64');
  logoUri = 'data:image/jpeg;base64,' + b64;
}

const marker = ui.indexOf('/* ============ UI ============ */');
const start = marker >= 0 ? marker : ui.indexOf('const esc=');
let uiBody = ui.slice(start);
for (const m of ['export async function startApp', 'export function startApp', '// Boot after DOM']) {
  const p = uiBody.indexOf(m);
  if (p >= 0) uiBody = uiBody.slice(0, p);
}
uiBody = uiBody.replace(/^import\s+.*?from\s+.*?;\n/gm, '').trim() + '\n\nboot();\n';
uiBody = uiBody.split('/logo.jpg').join(logoUri);
let cssOut = css.split('/logo.jpg').join(logoUri);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#17123f">
<meta name="description" content="AjoLoop — Build trust, community, and traditional Ajo circles.">
<title>AjoLoop — Build your circle</title>
<link rel="icon" href="${logoUri}">
<style>
${cssOut}
</style>
</head>
<body>
<div id="app"></div>
<div id="toasts"></div>
<script>
${engine}
${uiBody}
</script>
</body>
</html>
`;

const out = path.join(root, 'kano-city.html');
fs.writeFileSync(out, html);
console.log('Wrote', out, html.length, 'bytes');
