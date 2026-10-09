/**
 * Rebuild the single-file kano-city.html from modular sources (for offline share).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/styles/main.css'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/engine/game.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/ui/app.js'), 'utf8');

// Strip module bits from UI for legacy bundle
let uiBody = ui
  .replace(/^[^]*?loadEngine\(\);\s*/m, '')
  .replace(/import[\s\S]*?;\n/g, '')
  .replace(/export function startApp[\s\S]*$/m, 'boot();\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#17123f">
<title>Kano City — Live a Nigerian Life</title>
<style>
${css}
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
console.log('Wrote', out, '(' + html.length + ' bytes)');
