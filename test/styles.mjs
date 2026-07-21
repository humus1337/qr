// Full-pipeline scan test: render the production SVG for every style option,
// rasterize with resvg, decode, and require an exact payload match.
//
// Gate: zxing-wasm with tryHarder (the engine family real scanner apps build on)
// must decode every case. zxing fast mode and jsQR run as advisory signals:
// fast-mode failures are warnings, jsQR failures are only reported, since jsQR's
// binarizer is resolution-flaky on colored codes (same image passes at one width
// and fails at another).
//
// Run: node test/styles.mjs
import { createRequire } from 'node:module';
import { readBarcodes } from 'zxing-wasm/reader';
const require = createRequire(import.meta.url);
const qrcode = require('../public/qr-encoder.js');
const TR = require('../public/renderer.js');
const jsQR = require('./jsqr.js');
const { Resvg } = require('@resvg/resvg-js');
const { PNG } = require('pngjs');

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

// 1x1 red pixel png
const RED_PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const BASE = {
  type: 'url',
  content: {
    url: 'https://designyourqr.com',
    text: '', wifi: { ssid: '', pass: '', enc: 'WPA', hidden: false },
    email: { to: '', subject: '', body: '' }, phone: '',
    sms: { to: '', msg: '' },
    vcard: { first: '', last: '', org: '', title: '', phone: '', email: '', url: '' },
  },
  dot: 'square', eyeFrame: 'square', eyePupil: 'square',
  color: { mode: 'solid', c1: '#111111', c2: '#111111', angle: 135 },
  eye: { custom: false, frame: '#111827', pupil: '#111827' },
  bg: { color: '#ffffff', transparent: false },
  logo: { data: null, w: 1, h: 1, size: 20, backdrop: 'rounded', pad: 1.5, excavate: true },
  frame: { style: 'none', text: 'SCAN ME', color: '#111827', textColor: '#ffffff', font: 'sans' },
  ec: 'Q', margin: 4,
};

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function merge(dst, src) {
  for (const k of Object.keys(src)) {
    if (isObj(src[k]) && isObj(dst[k])) merge(dst[k], src[k]);
    else dst[k] = src[k];
  }
}
function mk(patch) {
  const st = structuredClone(BASE);
  if (patch) merge(st, patch);
  return st;
}

let pass = 0, fail = 0, warn = 0, jsMiss = 0;

async function check(label, st, opts) {
  const width = (opts && opts.width) || 640;
  const soft = opts && opts.soft;
  const expected = TR.buildPayload(st);
  const r = TR.renderSVG(qrcode, st, width);
  if (!r.svg) {
    fail++;
    console.log('FAIL ' + label + ' -> ' + (r.empty ? 'empty payload' : 'overflow'));
    return;
  }
  const png = new Resvg(r.svg, { fitTo: { mode: 'width', value: width }, background: '#ffffff' }).render().asPng();
  const bytes = new Uint8Array(png);

  const hard = await readBarcodes(bytes, { formats: ['QRCode'], tryHarder: true });
  const hardOk = hard.length && hard[0].isValid && hard[0].text === expected;

  const fast = await readBarcodes(bytes, { formats: ['QRCode'], tryHarder: false });
  const fastOk = fast.length && fast[0].isValid && fast[0].text === expected;

  const img = PNG.sync.read(Buffer.from(png));
  const rgba = new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length);
  const j = jsQR(rgba, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  const jsOk = !!(j && j.data === expected);
  if (!jsOk) jsMiss++;

  const tag = (jsOk ? '' : ' [jsqr miss]') + (fastOk ? '' : ' [fast miss]');
  if (hardOk && fastOk) { pass++; console.log('ok   ' + label + tag); }
  else if (hardOk) { warn++; console.log('warn ' + label + ' -> zxing fast mode missed' + tag); }
  else if (soft) { warn++; console.log('warn ' + label + ' -> no decode (allowed)' ); }
  else { fail++; console.log('FAIL ' + label + ' -> zxing could not decode' + tag); }
}

function eq(label, got, want) {
  if (got === want) { pass++; console.log('ok   ' + label); }
  else { fail++; console.log('FAIL ' + label + '\n  got  ' + JSON.stringify(got) + '\n  want ' + JSON.stringify(want)); }
}

/* payload builder unit checks */
eq('payload url scheme added',
  TR.buildPayload(mk({ type: 'url', content: { url: 'example.com/x' } })),
  'https://example.com/x');
eq('payload wifi escaping',
  TR.buildPayload(mk({ type: 'wifi', content: { wifi: { ssid: 'My;Net', pass: 'a:b"c', enc: 'WPA', hidden: true } } })),
  'WIFI:T:WPA;S:My\\;Net;P:a\\:b\\"c;H:true;;');
eq('payload wifi open network',
  TR.buildPayload(mk({ type: 'wifi', content: { wifi: { ssid: 'Cafe', pass: 'ignored', enc: 'nopass', hidden: false } } })),
  'WIFI:T:nopass;S:Cafe;;');
eq('payload mailto',
  TR.buildPayload(mk({ type: 'email', content: { email: { to: 'a@b.co', subject: 'Hi there', body: 'Line one' } } })),
  'mailto:a@b.co?subject=Hi%20there&body=Line%20one');
eq('payload sms',
  TR.buildPayload(mk({ type: 'sms', content: { sms: { to: '+1 (555) 000-1234', msg: 'See you' } } })),
  'SMSTO:+15550001234:See you');
eq('payload vcard',
  TR.buildPayload(mk({ type: 'vcard', content: { vcard: { first: 'Jane', last: 'Doe', org: 'Acme, Inc', title: '', phone: '+15550001234', email: 'j@acme.co', url: '' } } })),
  'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\nORG:Acme\\, Inc\r\nTEL;TYPE=CELL:+15550001234\r\nEMAIL:j@acme.co\r\nEND:VCARD');

/* overflow handling */
{
  const st = mk({ type: 'text', ec: 'H' });
  st.content.text = 'x'.repeat(3000);
  const r = TR.renderSVG(qrcode, st);
  if (r.error === 'overflow') { pass++; console.log('ok   overflow reported cleanly'); }
  else { fail++; console.log('FAIL overflow not reported'); }
}

/* every module style */
for (const dot of ['square', 'rounded', 'dots', 'fluid', 'diamond', 'leaf', 'bars']) {
  await check('dot style ' + dot, mk({ dot }));
}

/* every eye frame and pupil */
for (const eyeFrame of ['square', 'rounded', 'extra', 'circle', 'leaf']) {
  await check('eye frame ' + eyeFrame, mk({ dot: 'fluid', eyeFrame }));
}
for (const eyePupil of ['square', 'rounded', 'dot', 'leaf', 'diamond']) {
  await check('eye pupil ' + eyePupil, mk({ dot: 'fluid', eyePupil }));
}

/* every preset */
for (const preset of TR.PRESETS) {
  await check('preset ' + preset.id, mk(preset.p));
}

/* gradients at many angles + radial */
for (const angle of [0, 45, 90, 135, 215, 330]) {
  await check('linear gradient ' + angle, mk({ color: { mode: 'linear', c1: '#0f766e', c2: '#1d4ed8', angle } }));
}
await check('radial gradient', mk({ color: { mode: 'radial', c1: '#7c3aed', c2: '#1e1b4b' } }));

/* custom eye colors */
await check('custom eye colors', mk({ eye: { custom: true, frame: '#be123c', pupil: '#1d4ed8' } }));

/* transparent background over a white surface */
await check('transparent bg', mk({ bg: { transparent: true } }));

/* inverted (light on dark) */
await check('inverted midnight', mk({ color: { mode: 'solid', c1: '#e2e8f0' }, bg: { color: '#0f172a' } }));

/* logos: all backdrops, sizes, aspect ratios, with and without excavation */
for (const backdrop of ['none', 'square', 'rounded', 'circle']) {
  await check('logo backdrop ' + backdrop, mk({ logo: { data: RED_PX, w: 100, h: 100, size: 22, backdrop } }));
}
/* a max-size (30%) logo is payload-dependent: with a fuller code the excavated
   area can exceed what error correction recovers, so the scan meter flags it
   'poor' and the hard decode is advisory here (same policy as margin 0) */
await check('logo max 30pct', mk({ logo: { data: RED_PX, w: 100, h: 100, size: 30 } }), { soft: true });
await check('logo wide aspect', mk({ logo: { data: RED_PX, w: 300, h: 100, size: 24 } }));
await check('logo no excavate', mk({ logo: { data: RED_PX, w: 100, h: 100, size: 20, excavate: false } }));
await check('logo with gradient + fluid', mk({ dot: 'fluid', color: { mode: 'linear', c1: '#0ea5e9', c2: '#6366f1' }, logo: { data: RED_PX, w: 100, h: 100, size: 22 } }));

/* frames */
await check('frame bottom', mk({ frame: { style: 'bottom' } }));
await check('frame top', mk({ frame: { style: 'top', text: 'MENU' } }));
await check('frame + logo + gradient', mk({
  dot: 'fluid', color: { mode: 'linear', c1: '#0ea5e9', c2: '#6366f1' },
  frame: { style: 'bottom' }, logo: { data: RED_PX, w: 100, h: 100, size: 20 },
}));

/* margins */
await check('margin 1', mk({ margin: 1 }));
await check('margin 0', mk({ margin: 0 }), { soft: true });
await check('margin 8', mk({ margin: 8 }));

/* bigger payloads with styling */
{
  const st = mk({ type: 'vcard', dot: 'dots', eyeFrame: 'circle', eyePupil: 'dot', color: { mode: 'linear', c1: '#15803d', c2: '#166534', angle: 90 } });
  st.content.vcard = { first: 'Jane', last: 'Doe', org: 'Acme', title: 'CTO', phone: '+15550001234', email: 'jane@acme.co', url: 'https://acme.co' };
  await check('styled vcard v-high', st, { width: 900 });
}
{
  const st = mk({ type: 'text', dot: 'fluid' });
  st.content.text = 'Grüße aus München! 日本語テスト with a longer paragraph of text to push the version number up a fair bit. 1234567890';
  await check('styled long utf8 text', st, { width: 900 });
}

/* every dot style at high density (v13+), the regime where shapes get small */
{
  const long = 'https://designyourqr.com/?utm_source=verylongcampaignname&utm_medium=print&utm_campaign=springlaunch2026&ref=abcdef123456';
  for (const dot of ['square', 'rounded', 'dots', 'fluid', 'diamond', 'leaf', 'bars']) {
    await check('dense ' + dot, mk({ dot, ec: 'H', content: { url: long } }), { width: 900 });
  }
}

console.log('---');
console.log('pass ' + pass + ', warn ' + warn + ', fail ' + fail + '  (jsqr advisory misses: ' + jsMiss + ')');
process.exit(fail ? 1 : 0);
