// Generate public/og.png (1200x630), apple-touch-icon.png (180) and favicon-32.png
// from the same renderer + favicon source. Run: node test/og.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const qrcode = require('../public/qr-encoder.js');
const TR = require('../public/renderer.js');
const { Resvg } = require('@resvg/resvg-js');

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

const BASE = {
  type: 'url',
  content: { url: 'https://designyourqr.com', text: '', wifi: { ssid: '', pass: '', enc: 'WPA', hidden: false }, email: { to: '', subject: '', body: '' }, phone: '', sms: { to: '', msg: '' }, vcard: { first: '', last: '', org: '', title: '', phone: '', email: '', url: '' } },
  dot: 'fluid', eyeFrame: 'extra', eyePupil: 'dot',
  color: { mode: 'linear', c1: '#0284c7', c2: '#6366f1', angle: 135 },
  eye: { custom: false, frame: '#111827', pupil: '#111827' },
  bg: { color: '#ffffff', transparent: false },
  logo: { data: null, w: 1, h: 1, size: 20, backdrop: 'rounded', pad: 1.5, excavate: true },
  frame: { style: 'none', text: 'SCAN ME', color: '#111827', textColor: '#ffffff', font: 'sans' },
  ec: 'Q', margin: 3,
};

/* render the hero QR once, embed as data url */
const qr = TR.renderSVG(qrcode, BASE, 720);
const qrPng = new Resvg(qr.svg, { fitTo: { mode: 'width', value: 720 } }).render().asPng();
const qrData = 'data:image/png;base64,' + Buffer.from(qrPng).toString('base64');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="mark" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
    <radialGradient id="glow1" cx="180" cy="40" r="700" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6366f1" stop-opacity="0.22"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="1150" cy="580" r="650" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0ea5e9" stop-opacity="0.18"/><stop offset="1" stop-color="#0ea5e9" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0c12"/>
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>
  <g transform="translate(84,120) scale(1.1)">
    <rect width="64" height="64" rx="14" fill="url(#mark)"/>
    <path fill="#fff" d="M14 14h14v14H14zM18 18v6h6v-6zM36 14h14v14H36zM40 18v6h6v-6zM14 36h14v14H14zM18 40v6h6v-6z"/>
    <rect x="36" y="36" width="6" height="6" rx="2" fill="#fff"/>
    <rect x="44" y="36" width="6" height="6" rx="3" fill="#fff"/>
    <rect x="36" y="44" width="6" height="6" rx="3" fill="#fff"/>
    <rect x="44" y="44" width="6" height="6" rx="1" fill="#fff"/>
  </g>
  <text x="182" y="172" font-family="Segoe UI, Arial, sans-serif" font-size="66" font-weight="700" fill="#e9edf5">DesignYourQR</text>
  <text x="86" y="286" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="600" fill="#e9edf5">Free QR code generator</text>
  <text x="86" y="342" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#98a2b5">Shapes, gradients, logos and frames.</text>
  <text x="86" y="386" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#98a2b5">Runs in your browser. No sign-up.</text>
  <text x="86" y="486" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="600" fill="#7dd3fc">designyourqr.com</text>
  <rect x="726" y="99" width="412" height="412" rx="26" fill="#0e1119"/>
  <rect x="720" y="93" width="412" height="412" rx="26" fill="#ffffff"/>
  <image x="746" y="119" width="360" height="360" href="${qrData}"/>
</svg>`;

writeFileSync('public/og.png', new Resvg(og, { fitTo: { mode: 'width', value: 1200 } }).render().asPng());
console.log('og.png written');

const fav = readFileSync('public/favicon.svg', 'utf8');
writeFileSync('public/apple-touch-icon.png', new Resvg(fav, { fitTo: { mode: 'width', value: 180 } }).render().asPng());
writeFileSync('public/favicon-32.png', new Resvg(fav, { fitTo: { mode: 'width', value: 32 } }).render().asPng());
console.log('icons written');
