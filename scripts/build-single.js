// Builds dist/sankalpam-today.html: one self-contained file (CSS, JS, fonts inlined).
// Useful for sharing or hosting anywhere that serves a single page.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let css = read('styles.css').replace(/url\((fonts\/[^)]+\.woff2)\)/g, (_, f) =>
  `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, f)).toString('base64')})`);
css = css.replace(':root {\n  --night', ':root {\n  color-scheme: dark;\n  --night');

const html = read('index.html')
  .replace(/<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>/i, '')
  .replace(/<\/head>\s*<body>/i, '')
  .replace(/<\/body>\s*<\/html>\s*$/i, '')
  .replace('<link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script src="vendor/astronomy.browser.min.js"></script>', () => `<script>\n${read('vendor/astronomy.browser.min.js')}\n</script>`)
  .replace('<script src="src/panchang.js"></script>', () => `<script>\n${read('src/panchang.js')}\n</script>`)
  .replace('<script src="app.js"></script>', () => `<script>\n${read('app.js')}\n</script>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/sankalpam-today.html'), html.trim() + '\n');
console.log('wrote dist/sankalpam-today.html', (html.length / 1024).toFixed(0) + ' KB');
