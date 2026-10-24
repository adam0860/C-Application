/*
 * Renders build/icons/icon.svg into every icon the Windows and Android builds
 * need. Requires Playwright with Chromium (`npx playwright install chromium`).
 *   node scripts/generate-icons.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'build/icons/icon.svg'), 'utf8');
const res = path.join(root, 'android/app/src/main/res');
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// Variants of the artwork: full icon, round icon, adaptive layers.
const only = (layer) => svg.replace(layer === 'background' ? /<g id="foreground">[\s\S]*?<\/g>\s*<\/svg>/ : /<g id="background">[\s\S]*?<\/g>/, layer === 'background' ? '</svg>' : '');
// Adaptive foreground: shrink artwork into the 66/108 safe zone on a transparent canvas.
const adaptiveFg = only('foreground').replace('<g id="foreground">', '<g id="foreground" transform="translate(512 512) scale(0.9) translate(-512 -512)">');

function wrap(inner, size, { radius = 0, circle = false } = {}) {
  const clip = circle ? 'border-radius:50%;' : radius ? `border-radius:${radius}px;` : '';
  return `<!doctype html><html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;overflow:hidden;${clip}">${inner.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const render = async (html, size, out) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote', path.relative(root, out));
  };
  // Desktop / web
  await render(wrap(svg, 1024, { radius: 224 }), 1024, path.join(root, 'build/icon.png'));
  await render(wrap(svg, 192, { radius: 42 }), 192, path.join(root, 'public/icon.png'));
  // Android
  for (const [d, k] of Object.entries(densities)) {
    const legacy = Math.round(48 * k);
    const adaptive = Math.round(108 * k);
    await render(wrap(svg, legacy, { radius: legacy * 0.22 }), legacy, path.join(res, `mipmap-${d}/ic_launcher.png`));
    await render(wrap(svg, legacy, { circle: true }), legacy, path.join(res, `mipmap-${d}/ic_launcher_round.png`));
    await render(wrap(adaptiveFg, adaptive), adaptive, path.join(res, `mipmap-${d}/ic_launcher_foreground.png`));
    await render(wrap(only('background'), adaptive), adaptive, path.join(res, `mipmap-${d}/ic_launcher_background.png`));
  }
  await browser.close();
})();
