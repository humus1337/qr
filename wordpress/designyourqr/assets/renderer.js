/* DesignYourQR renderer - pure functions, no DOM. Used by app.js in the browser
   and by the Node test suite, so what ships is exactly what gets tested. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TitanRender = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';

const FONTS = {
  sans: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Cascadia Code', Consolas, Menlo, monospace",
  round: "ui-rounded, 'SF Pro Rounded', 'Segoe UI', Verdana, sans-serif",
};

const EYE_FRAME_R = {
  square: { o: [0, 0, 0, 0], i: [0, 0, 0, 0] },
  rounded: { o: [1.9, 1.9, 1.9, 1.9], i: [1.0, 1.0, 1.0, 1.0] },
  extra: { o: [2.7, 2.7, 2.7, 2.7], i: [1.6, 1.6, 1.6, 1.6] },
  circle: { o: [3.5, 3.5, 3.5, 3.5], i: [2.5, 2.5, 2.5, 2.5] },
  leaf: { o: [0, 2.7, 0, 2.7], i: [0, 1.55, 0, 1.55] },
};

const EYE_PUPIL_R = {
  square: [0, 0, 0, 0],
  rounded: [0.8, 0.8, 0.8, 0.8],
  dot: [1.5, 1.5, 1.5, 1.5],
  leaf: [0, 1.4, 0, 1.4],
};

const PRESETS = [
  { id: 'classic', name: 'Classic', css: '#111111',
    p: { dot: 'square', eyeFrame: 'square', eyePupil: 'square', color: { mode: 'solid', c1: '#111111', c2: '#111111', angle: 135 }, eye: { custom: false }, bg: { color: '#ffffff', transparent: false } } },
  { id: 'ink', name: 'Ink', css: '#1f2937',
    p: { dot: 'rounded', eyeFrame: 'rounded', eyePupil: 'rounded', color: { mode: 'solid', c1: '#1f2937', c2: '#475569', angle: 135 }, eye: { custom: false }, bg: { color: '#f8fafc', transparent: false } } },
  { id: 'ocean', name: 'Ocean', css: 'linear-gradient(135deg,#0284c7,#6366f1)',
    p: { dot: 'fluid', eyeFrame: 'extra', eyePupil: 'dot', color: { mode: 'linear', c1: '#0284c7', c2: '#6366f1', angle: 135 }, eye: { custom: false }, bg: { color: '#ffffff', transparent: false } } },
  { id: 'sunset', name: 'Sunset', css: 'linear-gradient(120deg,#ea580c,#be185d)',
    p: { dot: 'dots', eyeFrame: 'circle', eyePupil: 'dot', color: { mode: 'linear', c1: '#ea580c', c2: '#be185d', angle: 120 }, eye: { custom: false }, bg: { color: '#fffbeb', transparent: false } } },
  { id: 'forest', name: 'Forest', css: 'linear-gradient(160deg,#166534,#4d7c0f)',
    p: { dot: 'leaf', eyeFrame: 'leaf', eyePupil: 'leaf', color: { mode: 'linear', c1: '#166534', c2: '#4d7c0f', angle: 160 }, eye: { custom: false }, bg: { color: '#f7fee7', transparent: false } } },
  { id: 'grape', name: 'Grape', css: 'radial-gradient(circle,#a855f7,#6d28d9)',
    p: { dot: 'rounded', eyeFrame: 'extra', eyePupil: 'dot', color: { mode: 'radial', c1: '#a855f7', c2: '#6d28d9', angle: 135 }, eye: { custom: false }, bg: { color: '#faf5ff', transparent: false } } },
  { id: 'midnight', name: 'Midnight', css: 'linear-gradient(135deg,#e2e8f0,#64748b)',
    p: { dot: 'fluid', eyeFrame: 'rounded', eyePupil: 'dot', color: { mode: 'linear', c1: '#e2e8f0', c2: '#94a3b8', angle: 135 }, eye: { custom: false }, bg: { color: '#0f172a', transparent: false } } },
  { id: 'blush', name: 'Blush', css: '#be123c',
    p: { dot: 'diamond', eyeFrame: 'rounded', eyePupil: 'diamond', color: { mode: 'solid', c1: '#be123c', c2: '#fb7185', angle: 135 }, eye: { custom: false }, bg: { color: '#fff1f2', transparent: false } } },
  { id: 'stripe', name: 'Stripe', css: '#18181b',
    p: { dot: 'bars', eyeFrame: 'rounded', eyePupil: 'rounded', color: { mode: 'solid', c1: '#18181b', c2: '#3f3f46', angle: 135 }, eye: { custom: false }, bg: { color: '#ffffff', transparent: false } } },
];

const f = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
};

/* alignment pattern center coordinates per version (ISO 18004 annex E) */
const ALIGN_POS = [null, [],
  [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 52], [6, 30, 56], [6, 32, 60], [6, 34, 64],
  [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170]];

/* styles whose geometry distorts small function patterns; alignment cells fall back to a compact shape */
const SAFE_ALIGN_STYLES = { diamond: true, bars: true };

function alignCellTest(version, n) {
  const pos = ALIGN_POS[version] || [];
  const centers = [];
  for (const a of pos) {
    for (const b of pos) {
      const finder = (a <= 8 && b <= 8) || (a <= 8 && b >= n - 9) || (a >= n - 9 && b <= 8);
      if (!finder) centers.push([a, b]);
    }
  }
  if (!centers.length) return () => false;
  return (r, c) => {
    for (const [a, b] of centers) {
      if (Math.abs(r - a) <= 2 && Math.abs(c - b) <= 2) return true;
    }
    return false;
  };
}

function escXML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function hexRGB(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function lum(hex) {
  const [r, g, b] = hexRGB(hex).map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* ---------- payloads ---------- */

function wifiEsc(s) { return s.replace(/([\\;,:"])/g, '\\$1'); }
function vcardEsc(s) { return s.replace(/([\\,;])/g, '\\$1'); }

function buildPayload(st) {
  const c = st.content;
  switch (st.type) {
    case 'url': {
      const v = c.url.trim();
      if (!v) return '';
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v) ? v : 'https://' + v;
    }
    case 'text':
      return c.text.trim() ? c.text : '';
    case 'wifi': {
      const w = c.wifi;
      if (!w.ssid.trim()) return '';
      let s = 'WIFI:T:' + w.enc + ';S:' + wifiEsc(w.ssid) + ';';
      if (w.enc !== 'nopass' && w.pass) s += 'P:' + wifiEsc(w.pass) + ';';
      if (w.hidden) s += 'H:true;';
      return s + ';';
    }
    case 'email': {
      const e = c.email;
      if (!e.to.trim()) return '';
      const qs = [];
      if (e.subject) qs.push('subject=' + encodeURIComponent(e.subject));
      if (e.body) qs.push('body=' + encodeURIComponent(e.body));
      return 'mailto:' + e.to.trim() + (qs.length ? '?' + qs.join('&') : '');
    }
    case 'phone': {
      const v = c.phone.replace(/[\s().-]/g, '');
      return v ? 'tel:' + v : '';
    }
    case 'sms': {
      const to = c.sms.to.replace(/[\s().-]/g, '');
      if (!to) return '';
      return 'SMSTO:' + to + (c.sms.msg ? ':' + c.sms.msg : '');
    }
    case 'vcard': {
      const v = c.vcard;
      if (!(v.first.trim() || v.last.trim() || v.org.trim() || v.phone.trim() || v.email.trim())) return '';
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      lines.push('N:' + vcardEsc(v.last) + ';' + vcardEsc(v.first) + ';;;');
      const fn = (v.first + ' ' + v.last).trim();
      if (fn) lines.push('FN:' + vcardEsc(fn));
      if (v.org) lines.push('ORG:' + vcardEsc(v.org));
      if (v.title) lines.push('TITLE:' + vcardEsc(v.title));
      if (v.phone) lines.push('TEL;TYPE=CELL:' + v.phone.trim());
      if (v.email) lines.push('EMAIL:' + v.email.trim());
      if (v.url) lines.push('URL:' + v.url.trim());
      lines.push('END:VCARD');
      return lines.join('\r\n');
    }
  }
  return '';
}

/* ---------- geometry ---------- */

function roundRect(x, y, w, h, radii) {
  const lim = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = radii.map((v) => Math.max(0, Math.min(v, lim)));
  let d = 'M' + f(x + tl) + ' ' + f(y);
  d += 'H' + f(x + w - tr);
  if (tr) d += 'A' + f(tr) + ' ' + f(tr) + ' 0 0 1 ' + f(x + w) + ' ' + f(y + tr);
  d += 'V' + f(y + h - br);
  if (br) d += 'A' + f(br) + ' ' + f(br) + ' 0 0 1 ' + f(x + w - br) + ' ' + f(y + h);
  d += 'H' + f(x + bl);
  if (bl) d += 'A' + f(bl) + ' ' + f(bl) + ' 0 0 1 ' + f(x) + ' ' + f(y + h - bl);
  d += 'V' + f(y + tl);
  if (tl) d += 'A' + f(tl) + ' ' + f(tl) + ' 0 0 1 ' + f(x + tl) + ' ' + f(y);
  return d + 'Z';
}

function circlePath(cx, cy, r) {
  return 'M' + f(cx - r) + ' ' + f(cy) +
    'A' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(cx + r) + ' ' + f(cy) +
    'A' + f(r) + ' ' + f(r) + ' 0 1 0 ' + f(cx - r) + ' ' + f(cy) + 'Z';
}

/* one data module; nb = which neighbors are drawable, used for joins and seam bleed */
function moduleShape(style, x, y, nb) {
  if (style === 'dots') return circlePath(x + 0.5, y + 0.5, 0.5);
  if (style === 'diamond') {
    /* slightly oversized so tips fuse and enough ink stays for scanners */
    return 'M' + f(x + 0.5) + ' ' + f(y - 0.15) + 'L' + f(x + 1.15) + ' ' + f(y + 0.5) +
      'L' + f(x + 0.5) + ' ' + f(y + 1.15) + 'L' + f(x - 0.15) + ' ' + f(y + 0.5) + 'Z';
  }
  if (style === 'bars') {
    const w = 0.84, rx = w / 2, e = 0.015;
    const xx = x + (1 - w) / 2;
    const y1 = nb.up ? y - e : y + 0.08;
    const y2 = nb.down ? y + 1 + e : y + 0.92;
    const rT = nb.up ? 0 : rx, rB = nb.down ? 0 : rx;
    return roundRect(xx, y1, w, y2 - y1, [rT, rT, rB, rB]);
  }
  const e = 0.015;
  const x1 = x - (nb.left ? e : 0);
  const y1 = y - (nb.up ? e : 0);
  const w = 1 + (nb.left ? e : 0) + (nb.right ? e : 0);
  const h = 1 + (nb.up ? e : 0) + (nb.down ? e : 0);
  if (style === 'square') return roundRect(x1, y1, w, h, [0, 0, 0, 0]);
  if (style === 'rounded') return roundRect(x1, y1, w, h, [0.3, 0.3, 0.3, 0.3]);
  if (style === 'leaf') return roundRect(x1, y1, w, h, [0.5, 0, 0.5, 0]);
  /* fluid: round only the corners that face empty space */
  const tl = !nb.up && !nb.left ? 0.5 : 0;
  const tr = !nb.up && !nb.right ? 0.5 : 0;
  const br = !nb.down && !nb.right ? 0.5 : 0;
  const bl = !nb.down && !nb.left ? 0.5 : 0;
  return roundRect(x1, y1, w, h, [tl, tr, br, bl]);
}

function mirrorR(r4, corner) {
  const [a, b, c, d] = r4;
  if (corner === 'tr') return [b, a, d, c];
  if (corner === 'bl') return [d, c, b, a];
  return [a, b, c, d];
}

function eyeFramePath(style, corner, x, y) {
  const def = EYE_FRAME_R[style] || EYE_FRAME_R.square;
  return roundRect(x, y, 7, 7, mirrorR(def.o, corner)) +
    roundRect(x + 1, y + 1, 5, 5, mirrorR(def.i, corner));
}

function eyePupilPath(style, corner, x, y) {
  if (style === 'diamond') {
    /* plump diamond: bulged sides keep the finder's 1:1:3:1:1 scan profile intact */
    const cx = x + 1.5, cy = y + 1.5, s = 1.9, k = 1.25;
    return 'M' + f(cx) + ' ' + f(cy - s) +
      'Q' + f(cx + k) + ' ' + f(cy - k) + ' ' + f(cx + s) + ' ' + f(cy) +
      'Q' + f(cx + k) + ' ' + f(cy + k) + ' ' + f(cx) + ' ' + f(cy + s) +
      'Q' + f(cx - k) + ' ' + f(cy + k) + ' ' + f(cx - s) + ' ' + f(cy) +
      'Q' + f(cx - k) + ' ' + f(cy - k) + ' ' + f(cx) + ' ' + f(cy - s) + 'Z';
  }
  if (style === 'dot') return circlePath(x + 1.5, y + 1.5, 1.5);
  const r = EYE_PUPIL_R[style] || EYE_PUPIL_R.square;
  return roundRect(x, y, 3, 3, mirrorR(r, corner));
}

/* ---------- svg assembly ---------- */

function gradientDef(color, x0, y0, n) {
  const stops = '<stop offset="0" stop-color="' + color.c1 + '"/><stop offset="1" stop-color="' + color.c2 + '"/>';
  if (color.mode === 'radial') {
    return '<radialGradient id="fg" gradientUnits="userSpaceOnUse" cx="' + f(x0 + n / 2) + '" cy="' + f(y0 + n / 2) + '" r="' + f(n * 0.68) + '">' + stops + '</radialGradient>';
  }
  const a = ((color.angle % 360) * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const t = ((Math.abs(dx) + Math.abs(dy)) * n) / 2;
  const cx = x0 + n / 2, cy = y0 + n / 2;
  return '<linearGradient id="fg" gradientUnits="userSpaceOnUse" x1="' + f(cx - dx * t) + '" y1="' + f(cy - dy * t) + '" x2="' + f(cx + dx * t) + '" y2="' + f(cy + dy * t) + '">' + stops + '</linearGradient>';
}

/* qrlib: the qrcode-generator factory. st: full app state. px: optional pixel width. */
function renderSVG(qrlib, st, px) {
  const payload = buildPayload(st);
  if (!payload) return { empty: true };
  const ecEff = st.logo.data ? 'H' : st.ec;
  let qr;
  try {
    qr = qrlib(0, ecEff);
    qr.addData(payload, 'Byte');
    qr.make();
  } catch (err) {
    return { error: 'overflow' };
  }

  const n = qr.getModuleCount();
  const m = st.margin;
  const C = n + 2 * m;
  const hasFrame = st.frame.style !== 'none';
  const fp = hasFrame ? 1.8 : 0;
  const bandH = hasFrame ? 5.4 : 0;
  const topOff = st.frame.style === 'top' ? bandH : 0;
  const totalW = C + fp * 2;
  const totalH = C + fp * 2 + bandH;
  const x0 = fp + m;
  const y0 = fp + topOff + m;
  const card = { x: fp, y: fp + topOff, w: C, h: C };

  const defs = [];
  let paint;
  if (st.color.mode === 'solid') {
    paint = st.color.c1;
  } else {
    defs.push(gradientDef(st.color, x0, y0, n));
    paint = 'url(#fg)';
  }
  const eyeFramePaint = st.eye.custom ? st.eye.frame : paint;
  const eyePupilPaint = st.eye.custom ? st.eye.pupil : paint;

  /* logo layout + excavation zone */
  let logoBox = null;
  let excl = null;
  if (st.logo.data) {
    const a = (st.logo.w || 1) / (st.logo.h || 1);
    const L = (n * st.logo.size) / 100;
    const dw = a >= 1 ? L : L * a;
    const dh = a >= 1 ? L / a : L;
    const cx = x0 + n / 2, cy = y0 + n / 2;
    logoBox = { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh, cx, cy };
    if (st.logo.excavate) {
      const p = st.logo.pad;
      if (st.logo.backdrop === 'circle') {
        excl = { kind: 'circle', cx, cy, r: Math.max(dw, dh) / 2 + p };
      } else if (st.logo.backdrop === 'none') {
        excl = { kind: 'rect', x: logoBox.x - 0.4, y: logoBox.y - 0.4, w: dw + 0.8, h: dh + 0.8 };
      } else {
        excl = { kind: 'rect', x: logoBox.x - p, y: logoBox.y - p, w: dw + 2 * p, h: dh + 2 * p };
      }
    }
  }

  const excluded = (r, c) => {
    if (!excl) return false;
    const mx = x0 + c + 0.5, my = y0 + r + 0.5;
    if (excl.kind === 'circle') {
      return (mx - excl.cx) * (mx - excl.cx) + (my - excl.cy) * (my - excl.cy) <= excl.r * excl.r;
    }
    return mx > excl.x && mx < excl.x + excl.w && my > excl.y && my < excl.y + excl.h;
  };

  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const drawable = (r, c) =>
    r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c) && !inFinder(r, c) && !excluded(r, c);

  const version = (n - 17) / 4;
  const isAlign = SAFE_ALIGN_STYLES[st.dot] ? alignCellTest(version, n) : () => false;

  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!drawable(r, c)) continue;
      const nb = { up: drawable(r - 1, c), down: drawable(r + 1, c), left: drawable(r, c - 1), right: drawable(r, c + 1) };
      d += moduleShape(isAlign(r, c) ? 'rounded' : st.dot, x0 + c, y0 + r, nb);
    }
  }

  let fd = '', pd = '';
  for (const co of [{ c: 0, r: 0, k: 'tl' }, { c: n - 7, r: 0, k: 'tr' }, { c: 0, r: n - 7, k: 'bl' }]) {
    fd += eyeFramePath(st.eyeFrame, co.k, x0 + co.c, y0 + co.r);
    pd += eyePupilPath(st.eyePupil, co.k, x0 + co.c + 2, y0 + co.r + 2);
  }

  const body = [];
  if (hasFrame) {
    body.push('<rect width="' + f(totalW) + '" height="' + f(totalH) + '" rx="2.6" fill="' + st.frame.color + '"/>');
    if (!st.bg.transparent) {
      body.push('<rect x="' + f(card.x) + '" y="' + f(card.y) + '" width="' + f(card.w) + '" height="' + f(card.h) + '" rx="1.5" fill="' + st.bg.color + '"/>');
    }
  } else if (!st.bg.transparent) {
    body.push('<rect width="' + f(totalW) + '" height="' + f(totalH) + '" rx="' + f(Math.min(m * 0.6, 2.2)) + '" fill="' + st.bg.color + '"/>');
  }

  body.push('<path d="' + d + '" fill="' + paint + '"/>');
  body.push('<path d="' + fd + '" fill-rule="evenodd" fill="' + eyeFramePaint + '"/>');
  body.push('<path d="' + pd + '" fill="' + eyePupilPaint + '"/>');

  let coverPct = 0;
  if (logoBox) {
    const p = st.logo.pad;
    const bdFill = st.bg.transparent ? '#ffffff' : st.bg.color;
    if (st.logo.backdrop === 'circle') {
      const r = Math.max(logoBox.w, logoBox.h) / 2 + p;
      body.push('<circle cx="' + f(logoBox.cx) + '" cy="' + f(logoBox.cy) + '" r="' + f(r) + '" fill="' + bdFill + '"/>');
      defs.push('<clipPath id="lclip"><circle cx="' + f(logoBox.cx) + '" cy="' + f(logoBox.cy) + '" r="' + f(Math.max(logoBox.w, logoBox.h) / 2) + '"/></clipPath>');
      body.push('<image x="' + f(logoBox.x) + '" y="' + f(logoBox.y) + '" width="' + f(logoBox.w) + '" height="' + f(logoBox.h) + '" clip-path="url(#lclip)" preserveAspectRatio="xMidYMid meet" href="' + st.logo.data + '"/>');
      coverPct = (100 * Math.PI * r * r) / (n * n);
    } else {
      if (st.logo.backdrop !== 'none') {
        const rx = st.logo.backdrop === 'rounded' ? Math.min(Math.min(logoBox.w, logoBox.h) * 0.25 + p * 0.3, 3) : 0;
        body.push('<rect x="' + f(logoBox.x - p) + '" y="' + f(logoBox.y - p) + '" width="' + f(logoBox.w + 2 * p) + '" height="' + f(logoBox.h + 2 * p) + '" rx="' + f(rx) + '" fill="' + bdFill + '"/>');
        coverPct = (100 * (logoBox.w + 2 * p) * (logoBox.h + 2 * p)) / (n * n);
      } else {
        coverPct = (100 * logoBox.w * logoBox.h) / (n * n);
      }
      body.push('<image x="' + f(logoBox.x) + '" y="' + f(logoBox.y) + '" width="' + f(logoBox.w) + '" height="' + f(logoBox.h) + '" preserveAspectRatio="xMidYMid meet" href="' + st.logo.data + '"/>');
    }
  }

  if (hasFrame) {
    const t = (st.frame.text || '').trim();
    if (t) {
      const avail = totalW - 3;
      const fs = Math.min(bandH * 0.5, avail / (Math.max(t.length, 4) * 0.72));
      const bandCy = st.frame.style === 'top' ? fp + bandH / 2 + 0.1 : fp + C + bandH / 2 + 0.1;
      body.push('<text x="' + f(totalW / 2) + '" y="' + f(bandCy) + '" fill="' + st.frame.textColor +
        '" font-family="' + FONTS[st.frame.font] + '" font-size="' + f(fs) + '" font-weight="700" letter-spacing="' +
        f(fs * 0.08) + '" text-anchor="middle" dominant-baseline="central">' + escXML(t) + '</text>');
    }
  }

  const sizeAttrs = px ? ' width="' + px + '" height="' + Math.round((px * totalH) / totalW) + '"' : '';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + f(totalW) + ' ' + f(totalH) + '"' + sizeAttrs + ' role="img" aria-label="QR code">' +
    (defs.length ? '<defs>' + defs.join('') + '</defs>' : '') +
    body.join('') + '</svg>';

  return {
    svg,
    meta: { n, version: (n - 17) / 4, ec: ecEff, chars: payload.length, totalW, totalH, coverPct },
  };
}

/* ---------- scannability ---------- */

/* returns reason CODES, not sentences - the UI layer localizes them */
function assess(st, meta) {
  const rank = { good: 0, fair: 1, poor: 2 };
  let level = 'good';
  const reasons = [];
  const bump = (l, code) => {
    if (rank[l] > rank[level]) level = l;
    reasons.push(code);
  };

  const bgc = st.bg.transparent ? '#ffffff' : st.bg.color;
  const stops = st.color.mode === 'solid' ? [st.color.c1] : [st.color.c1, st.color.c2];
  if (st.eye.custom) stops.push(st.eye.frame, st.eye.pupil);

  let minC = Infinity;
  let fgLum = 0;
  for (const s of stops) {
    minC = Math.min(minC, contrast(s, bgc));
    fgLum += lum(s) / stops.length;
  }
  if (minC < 1.8) bump('poor', 'contrast_verylow');
  else if (minC < 3) bump('fair', 'contrast_low');
  if (fgLum > lum(bgc) + 0.05) bump('fair', 'inverted');
  if (st.bg.transparent && level === 'good') reasons.push('transparent');

  if (meta && meta.coverPct) {
    const cap = { L: 7, M: 15, Q: 25, H: 30 }[meta.ec] || 15;
    if (meta.coverPct > cap * 0.45) bump('poor', 'logo_big');
    else if (meta.coverPct > cap * 0.33) bump('fair', 'logo_medium');
  }
  if (st.margin === 0) bump('fair', 'margin_none');

  return { level, reasons };
}

return {
  FONTS, EYE_FRAME_R, EYE_PUPIL_R, PRESETS,
  buildPayload, renderSVG, assess,
  moduleShape, eyeFramePath, eyePupilPath, roundRect, circlePath,
  lum, contrast,
};
});
