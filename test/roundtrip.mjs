// Encoder round-trip: generate a matrix with the vendored encoder, rasterize it
// to RGBA, decode with jsQR, compare. Run: node test/roundtrip.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const qrcode = require('../public/qr-encoder.js');
const jsQR = require('./jsqr.js');

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

function decodeMatrix(qr, scale = 8, quiet = 4) {
  const n = qr.getModuleCount();
  const size = (n + quiet * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      for (let yy = 0; yy < scale; yy++) {
        for (let xx = 0; xx < scale; xx++) {
          const px = ((quiet * scale + r * scale + yy) * size + (quiet * scale + c * scale + xx)) * 4;
          data[px] = 0; data[px + 1] = 0; data[px + 2] = 0;
        }
      }
    }
  }
  return jsQR(data, size, size);
}

const cases = [
  ['https://designyourqr.com', 'Q'],
  ['WIFI:T:WPA;S:My Net\\;home;P:p\\:ss w0rd;;', 'M'],
  ['BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\nTEL;TYPE=CELL:+15550001234\r\nEND:VCARD', 'H'],
  ['Grüße aus München! 日本語テスト', 'M'],
  ['tel:+15550001234', 'L'],
  ['mailto:jane@example.com?subject=Hello%20there&body=Line%20one', 'Q'],
  ['SMSTO:+15550001234:See you at 8', 'M'],
  ['x'.repeat(500), 'H'],
];

let fail = 0;
for (const [text, ec] of cases) {
  const qr = qrcode(0, ec);
  qr.addData(text, 'Byte');
  qr.make();
  const res = decodeMatrix(qr);
  const ok = res && res.data === text;
  if (!ok) {
    fail++;
    console.log('FAIL', ec, JSON.stringify(text.slice(0, 40)), res ? 'got ' + JSON.stringify(res.data.slice(0, 40)) : 'no decode');
  } else {
    console.log('ok  ', ec, 'v' + (qr.getModuleCount() - 17) / 4, JSON.stringify(text.slice(0, 34)));
  }
}
console.log(fail ? 'FAILURES: ' + fail : 'ALL PASS');
process.exit(fail ? 1 : 0);
