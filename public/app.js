/* DesignYourQR - UI layer. Rendering lives in renderer.js; nothing here talks to a server. */
(() => {
'use strict';

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

const STORE_KEY = 'titanqr:v1';

const DEFAULTS = {
  type: 'url',
  content: {
    url: 'https://designyourqr.com',
    text: '',
    wifi: { ssid: '', pass: '', enc: 'WPA', hidden: false },
    email: { to: '', subject: '', body: '' },
    phone: '',
    sms: { to: '', msg: '' },
    vcard: { first: '', last: '', org: '', title: '', phone: '', email: '', url: '' },
  },
  dot: 'fluid',
  eyeFrame: 'extra',
  eyePupil: 'dot',
  color: { mode: 'linear', c1: '#0284c7', c2: '#6366f1', angle: 135 },
  eye: { custom: false, frame: '#111827', pupil: '#111827' },
  bg: { color: '#ffffff', transparent: false },
  logo: { data: null, orig: null, cutData: null, cut: false, w: 1, h: 1, size: 20, backdrop: 'rounded', pad: 1.5, excavate: true },
  frame: { style: 'none', text: 'SCAN ME', color: '#111827', textColor: '#ffffff', font: 'sans' },
  ec: 'Q',
  margin: 4,
  exportFormat: 'png',
  exportSize: 1024,
};

const DOT_STYLES = ['square', 'rounded', 'dots', 'fluid', 'diamond', 'leaf', 'bars'];
const EYE_FRAMES = ['square', 'rounded', 'extra', 'circle', 'leaf'];
const EYE_PUPILS = ['square', 'rounded', 'dot', 'leaf', 'diamond'];

const FG_SWATCHES = ['#111111', '#1f2937', '#0f766e', '#166534', '#1d4ed8', '#0ea5e9', '#6366f1', '#7c3aed', '#be123c', '#ea580c', '#a16207', '#0f172a'];
const BG_SWATCHES = ['#ffffff', '#f8fafc', '#fffbeb', '#f0fdf4', '#eff6ff', '#fdf2f8', '#f5f3ff', '#e2e8f0', '#0f172a', '#111827'];

let TR = null;
let state = null;
let lastRes = null;
let lang = document.documentElement.lang === 'he' ? 'he' : 'en';

function t(key) {
  const d = window.TitanI18N || { en: {} };
  return (d[lang] && d[lang][key]) || (d.en && d.en[key]) || key;
}

function fmtT(key, vars) {
  let s = t(key);
  for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

/* ---------- utils ---------- */

function deepGet(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function deepSet(obj, path, val) {
  const ks = path.split('.');
  const last = ks.pop();
  let o = obj;
  for (const k of ks) o = o[k];
  o[last] = val;
}

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function mergePatch(dst, src) {
  for (const k of Object.keys(src)) {
    if (isObj(src[k]) && isObj(dst[k])) mergePatch(dst[k], src[k]);
    else dst[k] = src[k];
  }
}

/* copy only keys that already exist in dst, so stale saved schemas cannot corrupt state */
function mergeKnown(dst, src) {
  if (!isObj(src)) return;
  for (const k of Object.keys(dst)) {
    if (!(k in src)) continue;
    if (isObj(dst[k])) mergeKnown(dst[k], src[k]);
    else if (dst[k] === null || src[k] === null || typeof dst[k] === typeof src[k]) dst[k] = src[k];
  }
}

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- style picker icons (drawn with the real renderer) ---------- */

const DEMO = [[1, 1, 0, 1], [1, 1, 0, 0], [0, 0, 1, 1], [1, 0, 1, 1]];

function iconDot(style) {
  const at = (r, c) => r >= 0 && c >= 0 && r < 4 && c < 4 && !!DEMO[r][c];
  let d = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!at(r, c)) continue;
      d += TR.moduleShape(style, c, r, { up: at(r - 1, c), down: at(r + 1, c), left: at(r, c - 1), right: at(r, c + 1) });
    }
  }
  return '<svg viewBox="-0.3 -0.3 4.6 4.6" aria-hidden="true"><path d="' + d + '" fill="currentColor"/></svg>';
}

function iconEyeFrame(style) {
  return '<svg viewBox="-0.4 -0.4 7.8 7.8" aria-hidden="true"><path d="' + TR.eyeFramePath(style, 'tl', 0, 0) + '" fill-rule="evenodd" fill="currentColor"/></svg>';
}

function iconEyePupil(style) {
  return '<svg viewBox="-0.35 -0.35 3.7 3.7" aria-hidden="true"><path d="' + TR.eyePupilPath(style, 'tl', 0, 0) + '" fill="currentColor"/></svg>';
}

function buildStyleButtons() {
  $('#grid-dot').innerHTML = DOT_STYLES.map((id) =>
    '<button class="opt" data-set="dot" data-val="' + id + '" title="' + t('style.' + id) + '">' + iconDot(id) + '<span>' + t('style.' + id) + '</span></button>').join('');
  $('#grid-eyeframe').innerHTML = EYE_FRAMES.map((id) =>
    '<button class="opt" data-set="eyeFrame" data-val="' + id + '" title="' + t('eyef.' + id) + '">' + iconEyeFrame(id) + '<span>' + t('eyef.' + id) + '</span></button>').join('');
  $('#grid-eyepupil').innerHTML = EYE_PUPILS.map((id) =>
    '<button class="opt" data-set="eyePupil" data-val="' + id + '" title="' + t('eyep.' + id) + '">' + iconEyePupil(id) + '<span>' + t('eyep.' + id) + '</span></button>').join('');
}

function buildPresetChips() {
  $('#preset-row').innerHTML = TR.PRESETS.map((p) =>
    '<button class="chip" data-preset="' + p.id + '"><span class="dotc" style="background:' + p.css + '"></span>' + t('preset.' + p.id) + '</button>').join('');
}

function buildSwatches() {
  $('#fg-swatches').innerHTML = FG_SWATCHES.map((c) =>
    '<button class="sw" data-swval="' + c + '" data-swtarget="color.c1" style="background:' + c + '" title="' + c + '" aria-label="Set code color ' + c + '"></button>').join('');
  $('#bg-swatches').innerHTML = BG_SWATCHES.map((c) =>
    '<button class="sw" data-swval="' + c + '" data-swtarget="bg.color" style="background:' + c + '" title="' + c + '" aria-label="Set background ' + c + '"></button>').join('');
}

/* ---------- ui sync ---------- */

function syncTabs() {
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.type === state.type)));
  $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== state.type));
}

function syncSegs() {
  $$('[data-set]').forEach((b) => {
    const on = String(deepGet(state, b.dataset.set)) === b.dataset.val;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function syncInputs() {
  $$('[data-bind]').forEach((el) => {
    const v = deepGet(state, el.dataset.bind);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.value !== String(v ?? '')) el.value = v ?? '';
  });
  $$('[data-hexfor]').forEach((el) => { el.value = deepGet(state, el.dataset.hexfor) || ''; });
  $('#export-size').value = String(state.exportSize);
}

function syncVis() {
  $('#cf-c2').classList.toggle('hidden', state.color.mode === 'solid');
  $('#cf-angle').classList.toggle('hidden', state.color.mode !== 'linear');
  $('#lbl-c1').textContent = state.color.mode === 'solid' ? t('c.color') : state.color.mode === 'radial' ? t('c.center') : t('c.first');
  $('#lbl-c2').textContent = state.color.mode === 'radial' ? t('c.edge') : t('c.second');
  $('#eyecolors').classList.toggle('hidden', !state.eye.custom);

  const hasLogo = !!state.logo.data;
  $('#dropzone').classList.toggle('hidden', hasLogo);
  $('#logorow').classList.toggle('hidden', !hasLogo);
  $('#logo-controls').classList.toggle('hidden', !hasLogo);
  $('#ec-note').classList.toggle('hidden', !hasLogo);
  if (hasLogo && $('#logo-thumb').src !== state.logo.data) {
    $('#logo-thumb').src = state.logo.data;
    if (!$('#logo-meta').textContent) $('#logo-meta').textContent = t('lg.yourlogo') + ' - ' + state.logo.w + 'x' + state.logo.h;
  }

  $('#logo-cut-row').classList.toggle('hidden', !(hasLogo && state.logo.cutData));

  $('#frame-controls').classList.toggle('hidden', state.frame.style === 'none');

  $('#out-angle').textContent = lang === 'he' ? String(state.color.angle) : state.color.angle + 'deg';
  $('#out-logosize').textContent = state.logo.size + '%';
  $('#out-logopad').textContent = String(state.logo.pad);
  $('#out-margin').textContent = String(state.margin);
  $('#text-count').textContent = state.type === 'text' && state.content.text ? fmtT('count.chars', { n: state.content.text.length }) : '';

  const fmt = { png: 'PNG', svg: 'SVG', jpeg: 'JPG', webp: 'WebP' }[state.exportFormat];
  $('#btn-download').textContent = t('btn.download') + ' ' + fmt;
  $('#export-size').disabled = state.exportFormat === 'svg';
  $('#alpha-note').classList.toggle('hidden', !(state.bg.transparent && state.exportFormat === 'jpeg'));
  $('#stage').classList.toggle('checker', state.bg.transparent);
}

function syncUI() {
  syncInputs();
  syncTabs();
  syncSegs();
  syncVis();
}

function openRelevantSections() {
  if (state.logo.data) $('#logo-controls').closest('details').open = true;
  if (state.frame.style !== 'none') $('#frame-controls').closest('details').open = true;
}

/* ---------- render loop ---------- */

let renderTimer = 0;

function schedule() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderNow, 50);
}

function renderNow() {
  clearTimeout(renderTimer);
  const res = TR.renderSVG(qrcode, state);
  lastRes = res;
  const overlay = $('#overlay');
  const host = $('#preview-svg');
  const ok = !!res.svg;

  if (res.empty) {
    host.innerHTML = '';
    overlay.textContent = t('ov.empty');
    overlay.classList.remove('hidden');
    $('#meta-line').textContent = '';
  } else if (res.error) {
    overlay.textContent = t('ov.overflow');
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
    host.innerHTML = res.svg;
    const me = res.meta;
    $('#meta-line').textContent = fmtT('meta.line', { v: me.version, n: me.n, ec: me.ec, chars: me.chars });
  }

  const line = $('#scanline');
  const reasonsEl = $('#scan-reasons');
  if (ok) {
    const a = TR.assess(state, res.meta);
    line.classList.remove('hidden', 'good', 'fair', 'poor');
    line.classList.add(a.level);
    $('#scan-text').textContent = t('meter.' + a.level);
    reasonsEl.textContent = a.reasons.map((c) => t('reason.' + c)).join(' ');
    reasonsEl.classList.toggle('hidden', a.reasons.length === 0);
  } else {
    line.classList.add('hidden');
    reasonsEl.classList.add('hidden');
  }

  $('#btn-download').disabled = !ok;
  $('#btn-copy').disabled = !ok;
}

/* ---------- persistence + sharing ---------- */

let persistTimer = 0;
function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (err) { /* storage full or blocked */ }
  }, 300);
}

function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function designFromHash() {
  const mt = location.hash.match(/#d=([A-Za-z0-9_-]+)/);
  if (!mt) return null;
  try { return JSON.parse(b64urlDecode(mt[1])); } catch (err) { return null; }
}

function loadState() {
  const st = structuredClone(DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved) mergeKnown(st, saved);
  } catch (err) { /* corrupt storage, fall back to defaults */ }
  const shared = designFromHash();
  if (shared) {
    const design = {};
    for (const k of ['dot', 'eyeFrame', 'eyePupil', 'color', 'eye', 'bg', 'frame', 'ec', 'margin']) {
      if (k in shared) design[k] = shared[k];
    }
    mergeKnown(st, design);
  }
  return st;
}

function doShare() {
  const d = {
    dot: state.dot, eyeFrame: state.eyeFrame, eyePupil: state.eyePupil,
    color: state.color, eye: state.eye, bg: state.bg, frame: state.frame,
    ec: state.ec, margin: state.margin,
  };
  const url = location.origin + location.pathname + '#d=' + b64urlEncode(JSON.stringify(d));
  navigator.clipboard.writeText(url).then(
    () => toast(t('toast.linkcopied')),
    () => toast(t('toast.clipfail'))
  );
}

function doReset() {
  try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
  history.replaceState(null, '', location.pathname);
  state = structuredClone(DEFAULTS);
  $('#logo-file').value = '';
  $('#logo-meta').textContent = '';
  syncUI();
  renderNow();
  toast(t('toast.reset'));
}

/* ---------- logo upload ---------- */

/* Try to knock out a uniform background: flood fill from the border with a
   feathered tolerance. Returns the mutated ImageData, or null when the image
   already has transparency, the border is not uniform, or the removal would
   wipe out (or barely touch) the picture. */
function removeLogoBackground(imgData, w, h) {
  const d = imgData.data;

  let alphaCount = 0;
  for (let i = 3; i < d.length; i += 4) {
    if (d[i] < 250) alphaCount++;
  }
  if (alphaCount > w * h * 0.005) return null;

  const ring = [];
  for (let x = 0; x < w; x++) ring.push((x) * 4, ((h - 1) * w + x) * 4);
  for (let y = 1; y < h - 1; y++) ring.push((y * w) * 4, (y * w + w - 1) * 4);

  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const br = med(ring.map((p) => d[p]));
  const bg = med(ring.map((p) => d[p + 1]));
  const bb = med(ring.map((p) => d[p + 2]));
  const dist = (p) => Math.sqrt(
    (d[p] - br) * (d[p] - br) + (d[p + 1] - bg) * (d[p + 1] - bg) + (d[p + 2] - bb) * (d[p + 2] - bb));

  const T1 = 30, T2 = 60;
  let uniform = 0;
  for (const p of ring) if (dist(p) <= T1) uniform++;
  if (uniform < ring.length * 0.88) return null;

  const seen = new Uint8Array(w * h);
  const queue = [];
  for (const p of ring) {
    const pi = p / 4;
    if (!seen[pi] && dist(p) <= T2) { seen[pi] = 1; queue.push(pi); }
  }
  let cleared = 0;
  while (queue.length) {
    const pi = queue.pop();
    const p = pi * 4;
    const dd = dist(p);
    if (dd <= T1) { d[p + 3] = 0; cleared++; }
    else d[p + 3] = Math.min(255, Math.round(((dd - T1) / (T2 - T1)) * 255));
    const x = pi % w, y = (pi / w) | 0;
    if (x > 0 && !seen[pi - 1] && dist(p - 4) <= T2) { seen[pi - 1] = 1; queue.push(pi - 1); }
    if (x < w - 1 && !seen[pi + 1] && dist(p + 4) <= T2) { seen[pi + 1] = 1; queue.push(pi + 1); }
    if (y > 0 && !seen[pi - w] && dist(p - w * 4) <= T2) { seen[pi - w] = 1; queue.push(pi - w); }
    if (y < h - 1 && !seen[pi + w] && dist(p + w * 4) <= T2) { seen[pi + w] = 1; queue.push(pi + w); }
  }

  const frac = cleared / (w * h);
  if (frac < 0.02 || frac > 0.95) return null;
  return imgData;
}

async function loadLogoFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast(t('toast.notimage')); return; }
  if (file.size > 8 * 1024 * 1024) { toast(t('toast.toobig')); return; }
  let dataURL;
  try {
    dataURL = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  } catch (err) { toast(t('toast.readfail')); return; }

  const img = new Image();
  img.src = dataURL;
  try { await img.decode(); } catch (err) { toast(t('toast.imgfail')); return; }

  const w = img.naturalWidth || 512, h = img.naturalHeight || 512;
  const scale = Math.min(1, 512 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, cw, ch);
  let orig = dataURL;
  let cutData = null;
  try {
    orig = cv.toDataURL('image/png');
    const processed = removeLogoBackground(ctx.getImageData(0, 0, cw, ch), cw, ch);
    if (processed) {
      const cv2 = document.createElement('canvas');
      cv2.width = cw; cv2.height = ch;
      cv2.getContext('2d').putImageData(processed, 0, 0);
      cutData = cv2.toDataURL('image/png');
    }
  } catch (err) { /* keep original */ }

  state.logo.orig = orig;
  state.logo.cutData = cutData;
  state.logo.cut = !!cutData;
  state.logo.data = cutData || orig;
  state.logo.w = cw;
  state.logo.h = ch;
  $('#logo-thumb').src = state.logo.data;
  $('#logo-meta').textContent = file.name + ' - ' + cw + 'x' + ch;
  $('#logo-controls').closest('details').open = true;
  syncUI();
  schedule();
  persistSoon();
  if (cutData) toast(t('toast.logocut'));
}

/* ---------- export ---------- */

function stamp() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

async function rasterBlob(mime, px) {
  const r = TR.renderSVG(qrcode, state, px);
  if (!r.svg) return null;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.svg);
  await img.decode();
  const h = Math.round((px * r.meta.totalH) / r.meta.totalW);
  const cv = document.createElement('canvas');
  cv.width = px; cv.height = h;
  const ctx = cv.getContext('2d');
  if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, px, h); }
  ctx.drawImage(img, 0, 0, px, h);
  return await new Promise((res) => cv.toBlob(res, mime, 0.92));
}

async function doDownload() {
  if (!lastRes || !lastRes.svg) return;
  const fmt = state.exportFormat;
  const px = state.exportSize;
  try {
    let blob, ext;
    if (fmt === 'svg') {
      blob = new Blob([TR.renderSVG(qrcode, state, px).svg], { type: 'image/svg+xml' });
      ext = 'svg';
    } else {
      const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[fmt];
      blob = await rasterBlob(mime, px);
      if (!blob) { toast(fmtT('toast.noformat', { fmt: fmt.toUpperCase() })); return; }
      ext = fmt === 'jpeg' ? 'jpg' : fmt;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'designyourqr-' + stamp() + '.' + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (err) {
    toast(t('toast.exportfail'));
  }
}

async function doCopy() {
  if (!lastRes || !lastRes.svg) return;
  try {
    const blob = await rasterBlob('image/png', 1024);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast(t('toast.copied'));
  } catch (err) {
    toast(t('toast.copyfail'));
  }
}

/* ---------- theme + language ---------- */

/* keep the canonical + og:url + og:locale in step with the active language so the
   Hebrew view at /?lang=he is indexed as its own page (self-referential canonical) */
function applySeoLang() {
  const isHe = lang === 'he';
  const url = isHe ? 'https://designyourqr.com/?lang=he' : 'https://designyourqr.com/';
  const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
  set('link[rel="canonical"]', 'href', url);
  set('meta[property="og:url"]', 'content', url);
  set('meta[property="og:locale"]', 'content', isHe ? 'he_IL' : 'en_US');
}

function translateDOM() {
  if (!window.TitanI18N) return;
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.title = t('doc.title');
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', t('doc.desc'));
  const th = document.documentElement.dataset.theme;
  $('#btn-theme').setAttribute('aria-label', t(th === 'light' ? 'nav.theme.dark' : 'nav.theme.light'));
  applySeoLang();
}

function applyLang(l) {
  lang = l === 'he' ? 'he' : 'en';
  try { localStorage.setItem('titanqr:lang', lang); } catch (err) { /* ignore */ }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  translateDOM();
  buildStyleButtons();
  buildPresetChips();
  syncUI();
  renderNow();
}

function applyTheme(th) {
  document.documentElement.dataset.theme = th;
  try { localStorage.setItem('titanqr:theme', th); } catch (err) { /* ignore */ }
  const mtc = document.querySelector('meta[name="theme-color"]');
  if (mtc) mtc.setAttribute('content', th === 'light' ? '#eef1f7' : '#0a0c12');
  $('#btn-theme').setAttribute('aria-label', t(th === 'light' ? 'nav.theme.dark' : 'nav.theme.light'));
}

/* ---------- presets ---------- */

function applyPreset(id) {
  const preset = TR.PRESETS.find((p) => p.id === id);
  if (!preset) return;
  mergePatch(state, structuredClone(preset.p));
  syncUI();
  $$('.chip').forEach((c) => c.classList.toggle('selected', c.dataset.preset === id));
  renderNow();
  persistSoon();
}

/* ---------- events ---------- */

function onBoundInput(el) {
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'range') v = parseFloat(el.value);
  else v = el.value;
  deepSet(state, el.dataset.bind, v);
  if (el.type === 'color') {
    const twin = $('input[data-hexfor="' + el.dataset.bind + '"]');
    if (twin) twin.value = v;
  }
  if (el.dataset.bind === 'logo.cut') {
    state.logo.data = (v && state.logo.cutData) ? state.logo.cutData : (state.logo.orig || state.logo.data);
    $('#logo-thumb').src = state.logo.data;
  }
  /* the same path can be bound in two places (e.g. bg.transparent in Colors and in the export box) */
  syncInputs();
  syncVis();
  schedule();
  persistSoon();
}

function bindEvents() {
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches && el.matches('[data-bind]')) {
      onBoundInput(el);
    } else if (el.matches && el.matches('[data-hexfor]')) {
      let v = el.value.trim();
      if (v && v[0] !== '#') v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        deepSet(state, el.dataset.hexfor, v.toLowerCase());
        const twin = $('input[type="color"][data-bind="' + el.dataset.hexfor + '"]');
        if (twin) twin.value = v.toLowerCase();
        syncVis();
        schedule();
        persistSoon();
      }
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, .sw, .dropzone');
    if (!t) return;

    if (t.classList.contains('tab')) {
      state.type = t.dataset.type;
      syncTabs();
      syncVis();
      schedule();
      persistSoon();
      return;
    }
    if (t.dataset.set) {
      deepSet(state, t.dataset.set, t.dataset.val);
      $$('.chip').forEach((c) => c.classList.remove('selected'));
      syncSegs();
      syncVis();
      schedule();
      persistSoon();
      return;
    }
    if (t.dataset.preset) { applyPreset(t.dataset.preset); return; }
    if (t.dataset.swval) {
      deepSet(state, t.dataset.swtarget, t.dataset.swval);
      if (t.dataset.swtarget === 'bg.color') state.bg.transparent = false;
      syncInputs();
      syncVis();
      schedule();
      persistSoon();
      return;
    }
    if (t.id === 'dropzone') { $('#logo-file').click(); return; }

    switch (t.dataset.action) {
      case 'download': doDownload(); break;
      case 'copy': doCopy(); break;
      case 'share': doShare(); break;
      case 'reset': doReset(); break;
      case 'logo-remove':
        state.logo.data = null;
        state.logo.orig = null;
        state.logo.cutData = null;
        state.logo.cut = false;
        $('#logo-file').value = '';
        $('#logo-meta').textContent = '';
        syncUI();
        schedule();
        persistSoon();
        break;
    }
  });

  $('#logo-file').addEventListener('change', (e) => loadLogoFile(e.target.files[0]));

  const dz = $('#dropzone');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('drag');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) loadLogoFile(e.dataTransfer.files[0]);
  });
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#logo-file').click(); }
  });

  $('#export-size').addEventListener('change', (e) => {
    state.exportSize = parseInt(e.target.value, 10);
    persistSoon();
  });

  $('#btn-theme').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });
  $('#btn-lang').addEventListener('click', () => applyLang(lang === 'he' ? 'en' : 'he'));
}

/* ---------- boot ---------- */

if (typeof qrcode === 'undefined' || typeof TitanRender === 'undefined') {
  document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">The QR engine failed to load. Please refresh the page.</p>';
  return;
}
TR = TitanRender;
if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

buildStyleButtons();
buildPresetChips();
buildSwatches();
bindEvents();
translateDOM();
state = loadState();
syncUI();
openRelevantSections();
renderNow();

/* small api for power users and automated tests */
window.TitanQR = {
  get state() { return state; },
  get lang() { return lang; },
  set(patch) { mergePatch(state, patch); syncUI(); renderNow(); },
  svg: () => (lastRes && lastRes.svg) || '',
  meta: () => (lastRes && lastRes.meta) || null,
  payload: () => TR.buildPayload(state),
  render: renderNow,
  applyPreset,
  applyLang,
  applyTheme,
  presets: TR.PRESETS.map((p) => p.id),
  reset: doReset,
};

})();
