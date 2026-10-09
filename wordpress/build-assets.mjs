// Build the WordPress.org directory assets (icons and banners) into
// wordpress/wporg-assets/. These go in the SVN /assets folder, not the plugin.
// Run: node wordpress/build-assets.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const qrcode = require('../public/qr-encoder.js');
const TR = require('../public/renderer.js');
const { Resvg } = require('@resvg/resvg-js');

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

const OUT = new URL('./wporg-assets/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
const save = (name, buf) => { writeFileSync(new URL(name, OUT), buf); console.log('wrote', name); };

const favicon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
save('icon-128x128.png', png(favicon, 128));
save('icon-256x256.png', png(favicon, 256));

function stateFor(presetId, url) {
  const st = {
    type: 'url',
    content: { url, text: '', wifi: { ssid: '', pass: '', enc: 'WPA', hidden: false }, email: { to: '', subject: '', body: '' }, phone: '', sms: { to: '', msg: '' }, vcard: { first: '', last: '', org: '', title: '', phone: '', email: '', url: '' } },
    dot: 'fluid', eyeFrame: 'extra', eyePupil: 'dot',
    color: { mode: 'linear', c1: '#0284c7', c2: '#6366f1', angle: 135 },
    eye: { custom: false, frame: '#111827', pupil: '#111827' },
    bg: { color: '#ffffff', transparent: false },
    logo: { data: null, w: 1, h: 1, size: 20, backdrop: 'rounded', pad: 1.5, excavate: true },
    frame: { style: 'none', text: '', color: '#111827', textColor: '#ffffff', font: 'sans' },
    ec: 'Q', margin: 2,
  };
  const p = TR.PRESETS.find((x) => x.id === presetId).p;
  st.dot = p.dot; st.eyeFrame = p.eyeFrame; st.eyePupil = p.eyePupil;
  st.color = { ...st.color, ...p.color };
  st.eye = { ...st.eye, ...p.eye };
  st.bg = { ...st.bg, ...p.bg };
  return st;
}

const qrData = (presetId, url) => {
  const svg = TR.renderSVG(qrcode, stateFor(presetId, url), 600).svg;
  return 'data:image/png;base64,' + Buffer.from(png(svg, 600)).toString('base64');
};

// Drawn at 1544x500; the 772x250 banner is the same SVG rendered at half width.
const cards = [
  { id: 'sunset', url: 'https://designyourqr.com/?s=1', x: 900, y: 96, r: -6 },
  { id: 'forest', url: 'https://designyourqr.com/?s=2', x: 1240, y: 96, r: 6 },
  { id: 'ocean', url: 'https://designyourqr.com/', x: 1060, y: 70, r: 0 },
];
const card = (c) => `
  <g transform="rotate(${c.r} ${c.x + 130} ${c.y + 180})">
    <rect x="${c.x + 6}" y="${c.y + 8}" width="260" height="260" rx="22" fill="#05070b" opacity="0.6"/>
    <rect x="${c.x}" y="${c.y}" width="260" height="260" rx="22" fill="#ffffff"/>
    <image x="${c.x + 20}" y="${c.y + 20}" width="220" height="220" href="${qrData(c.id, c.url)}"/>
  </g>`;

const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="1544" height="500" viewBox="0 0 1544 500">
  <defs>
    <linearGradient id="mark" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
    <radialGradient id="glow1" cx="200" cy="20" r="760" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6366f1" stop-opacity="0.24"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="1250" cy="520" r="700" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0ea5e9" stop-opacity="0.2"/><stop offset="1" stop-color="#0ea5e9" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1544" height="500" fill="#0a0c12"/>
  <rect width="1544" height="500" fill="url(#glow1)"/>
  <rect width="1544" height="500" fill="url(#glow2)"/>
  <g transform="translate(96,112) scale(1.25)">
    <rect width="64" height="64" rx="14" fill="url(#mark)"/>
    <path fill="#fff" d="M14 14h14v14H14zM18 18v6h6v-6zM36 14h14v14H36zM40 18v6h6v-6zM14 36h14v14H14zM18 40v6h6v-6z"/>
    <rect x="36" y="36" width="6" height="6" rx="2" fill="#fff"/>
    <rect x="44" y="36" width="6" height="6" rx="3" fill="#fff"/>
    <rect x="36" y="44" width="6" height="6" rx="3" fill="#fff"/>
    <rect x="44" y="44" width="6" height="6" rx="1" fill="#fff"/>
  </g>
  <text x="200" y="176" font-family="Segoe UI, Arial, sans-serif" font-size="72" font-weight="700" fill="#e9edf5">DesignYourQR</text>
  <text x="98" y="282" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="600" fill="#e9edf5">Designed QR codes for WordPress</text>
  <text x="98" y="340" font-family="Segoe UI, Arial, sans-serif" font-size="31" fill="#98a2b5">A block and a shortcode. Static codes that never expire.</text>
  <text x="98" y="384" font-family="Segoe UI, Arial, sans-serif" font-size="31" fill="#98a2b5">Presets, gradients and custom shapes.</text>
  ${cards.map(card).join('')}
</svg>`;

save('banner-1544x500.png', png(banner, 1544));
save('banner-772x250.png', png(banner, 772));
