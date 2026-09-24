/* DesignYourQR embed widget - a compact generator for iframing on other sites.
   Reuses the shipped engine (qr-encoder.js + renderer.js); no ads, no tracking. */
(() => {
'use strict';

const $ = (s) => document.querySelector(s);

if (typeof qrcode === 'undefined' || typeof TitanRender === 'undefined') {
  const p = $('#eq-preview');
  if (p) p.innerHTML = '<div class="eq-empty">The QR engine failed to load.</div>';
  return;
}
if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}
const TR = TitanRender;

const state = {
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
  dot: 'fluid', eyeFrame: 'extra', eyePupil: 'dot',
  color: { mode: 'linear', c1: '#0284c7', c2: '#6366f1', angle: 135 },
  eye: { custom: false, frame: '#111827', pupil: '#111827' },
  bg: { color: '#ffffff', transparent: false },
  logo: { data: null, orig: null, cutData: null, cut: false, w: 1, h: 1, size: 20, backdrop: 'rounded', pad: 1.5, excavate: true },
  frame: { style: 'none', text: 'SCAN ME', color: '#111827', textColor: '#ffffff', font: 'sans' },
  ec: 'Q', margin: 4,
};

let last = null;

function render() {
  const box = $('#eq-preview');
  const res = TR.renderSVG(qrcode, state, null);
  if (res.empty) { box.innerHTML = '<div class="eq-empty">Enter a link or some text</div>'; last = null; return setDl(false); }
  if (res.error) { box.innerHTML = '<div class="eq-empty">That is too much data - shorten it</div>'; last = null; return setDl(false); }
  box.innerHTML = res.svg;
  last = res;
  setDl(true);
}

function setDl(on) {
  $('#eq-png').disabled = !on;
  $('#eq-svg').disabled = !on;
}

function applyPreset(id) {
  const p = TR.PRESETS.find((x) => x.id === id);
  if (!p) return;
  const q = p.p;
  state.dot = q.dot; state.eyeFrame = q.eyeFrame; state.eyePupil = q.eyePupil;
  state.color = Object.assign({}, state.color, q.color);
  state.eye = Object.assign({}, state.eye, q.eye);
  state.bg = Object.assign({}, state.bg, q.bg);
  document.querySelectorAll('.eq-sw').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.preset === id)));
  render();
}

function triggerDownload(href, name, revoke) {
  const a = document.createElement('a');
  a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 4000);
}

function download(fmt, px) {
  if (!last) return;
  if (fmt === 'svg') {
    const blob = new Blob([last.svg], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), 'qr-code.svg', true);
    return;
  }
  const meta = last.meta;
  const res = TR.renderSVG(qrcode, state, px);
  const url = URL.createObjectURL(new Blob([res.svg], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const w = px, h = Math.round((px * meta.totalH) / meta.totalW);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    cv.toBlob((b) => { if (b) triggerDownload(URL.createObjectURL(b), 'qr-code.png', true); }, 'image/png');
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

function buildSwatches() {
  $('#eq-presets').innerHTML = TR.PRESETS.map((p) =>
    '<button class="eq-sw" type="button" data-preset="' + p.id + '" title="' + p.name +
    '" aria-label="' + p.name + '" aria-pressed="' + (p.id === 'ocean') + '" style="background:' + p.css + '"></button>'
  ).join('');
}

function bind() {
  document.querySelectorAll('.eq-tab').forEach((t) => t.addEventListener('click', () => {
    state.type = t.dataset.type;
    document.querySelectorAll('.eq-tab').forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    const inp = $('#eq-input');
    inp.value = state.type === 'url' ? state.content.url : state.content.text;
    inp.placeholder = state.type === 'url' ? 'https://example.com' : 'Any text';
    render();
  }));
  $('#eq-input').addEventListener('input', (e) => {
    if (state.type === 'url') state.content.url = e.target.value;
    else state.content.text = e.target.value;
    render();
  });
  document.querySelectorAll('.eq-sw').forEach((el) => el.addEventListener('click', () => applyPreset(el.dataset.preset)));
  $('#eq-png').addEventListener('click', () => download('png', parseInt($('#eq-size').value, 10)));
  $('#eq-svg').addEventListener('click', () => download('svg'));
}

buildSwatches();
bind();
$('#eq-input').value = state.content.url;
render();
})();
