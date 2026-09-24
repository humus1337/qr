# designyourqr

Generate designed, scannable QR codes as SVG - custom module and corner shapes, solid or gradient colors, style presets, and logo embedding. This is the open engine behind [designyourqr.com](https://designyourqr.com), packaged as a dependency-light library that runs in Node and the browser.

- No canvas, no headless browser: it returns a plain SVG string.
- Static QR codes: the content is baked into the image, so codes never expire.
- Built-in scannability check that warns about low contrast or an oversized logo.
- Ships with 9 style presets and full control over shapes, colors and error correction.

## Install

```sh
npm install designyourqr
```

## Quick start

```js
const { toSVG } = require('designyourqr');

// A link, with the "ocean" preset
const svg = toSVG('https://example.com', { preset: 'ocean', size: 512 });

// Save it, inline it, or serve it
require('fs').writeFileSync('qr.svg', svg);
```

ESM works too:

```js
import { toSVG } from 'designyourqr';
const svg = toSVG('https://example.com', { preset: 'sunset' });
```

## Content types

Pass a string for a link, or an object for anything else.

```js
toSVG('https://example.com'); // link
toSVG('Any text here', { type: 'text' }); // plain text
toSVG({ type: 'wifi', ssid: 'MyNet', pass: 'secret', enc: 'WPA' });
toSVG({ type: 'email', to: 'hi@example.com', subject: 'Hello' });
toSVG({ type: 'phone', phone: '+15551234567' });
toSVG({ type: 'sms', to: '+15551234567', msg: 'JOIN' });
toSVG({ type: 'vcard', first: 'Ada', last: 'Lovelace', email: 'ada@example.com' });
```

## Styling options

```js
toSVG('https://example.com', {
  size: 1024, // output width in px; omit for a scalable viewBox-only SVG
  dot: 'fluid', // square | rounded | dots | fluid | diamond | leaf | bars
  eyeFrame: 'extra', // square | rounded | extra | circle | leaf
  eyePupil: 'dot', // square | rounded | dot | leaf | diamond
  color: { mode: 'linear', c1: '#0284c7', c2: '#6366f1', angle: 135 },
  background: { color: '#ffffff', transparent: false },
  ec: 'Q', // error correction: L | M | Q | H
  margin: 4, // quiet zone in modules
});
```

### Presets

```js
const { presets } = require('designyourqr');
console.log(presets.map((p) => p.id));
// classic, ink, ocean, sunset, forest, grape, midnight, blush, stripe
```

### Logo in the center

Pass a data URI (or URL) as `logo.data`. Error correction is forced to High while a logo is present so the code stays scannable.

```js
toSVG('https://example.com', {
  logo: { data: 'data:image/png;base64,...', size: 22, backdrop: 'rounded' },
});
```

## Scannability check

```js
const { assess } = require('designyourqr');
assess('https://example.com', { color: { c1: '#dddddd' }, background: { color: '#ffffff' } });
// { level: 'poor', reasons: ['contrast_verylow'] }
```

`level` is `good`, `fair` or `poor`. Use it to warn before printing.

## Browser usage

`toSVG` returns a string, so you can drop it into the DOM:

```js
document.getElementById('qr').innerHTML = toSVG('https://example.com', { preset: 'grape' });
```

To rasterize to PNG, draw the SVG onto a canvas and call `canvas.toBlob`.

## License

MIT. Built by [DesignYourQR](https://designyourqr.com). For a full no-code generator with live preview, logo background removal and PNG/JPG/WebP export, use the site: [designyourqr.com](https://designyourqr.com).
