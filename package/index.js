'use strict';

/* designyourqr - the engine behind designyourqr.com, as a library.
   Generates designed, scannable QR codes as SVG. Pure functions, works in
   Node and the browser. Rendering lives in renderer.js; this file is a
   friendly wrapper over it. */

const TitanRender = require('./renderer.js');
const qrcode = require('qrcode-generator');

if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

const CONTENT_TYPES = ['url', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard'];

function defaultState() {
  return {
    type: 'url',
    content: {
      url: '', text: '',
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
    frame: { style: 'none', text: '', color: '#111827', textColor: '#ffffff', font: 'sans' },
    ec: 'Q', margin: 4,
  };
}

function applyPreset(st, id) {
  const p = TitanRender.PRESETS.find((x) => x.id === id);
  if (!p) throw new Error('Unknown preset "' + id + '". Available: ' + TitanRender.PRESETS.map((x) => x.id).join(', '));
  const q = p.p;
  st.dot = q.dot; st.eyeFrame = q.eyeFrame; st.eyePupil = q.eyePupil;
  st.color = Object.assign({}, st.color, q.color);
  st.eye = Object.assign({}, st.eye, q.eye);
  st.bg = Object.assign({}, st.bg, q.bg);
}

function buildState(content, opts) {
  opts = opts || {};
  const st = defaultState();

  if (content && typeof content === 'object') {
    const type = content.type;
    if (CONTENT_TYPES.indexOf(type) === -1) throw new Error('content.type must be one of: ' + CONTENT_TYPES.join(', '));
    st.type = type;
    if (type === 'url') st.content.url = content.url || content.data || '';
    else if (type === 'text') st.content.text = content.text || content.data || '';
    else if (type === 'phone') st.content.phone = content.phone || content.data || '';
    else st.content[type] = Object.assign({}, st.content[type], content);
  } else {
    st.type = (opts.type && CONTENT_TYPES.indexOf(opts.type) !== -1) ? opts.type : 'url';
    const s = content == null ? '' : String(content);
    if (st.type === 'text') st.content.text = s;
    else if (st.type === 'phone') st.content.phone = s;
    else st.content.url = s;
  }

  if (opts.preset) applyPreset(st, opts.preset);
  if (opts.dot) st.dot = opts.dot;
  if (opts.eyeFrame) st.eyeFrame = opts.eyeFrame;
  if (opts.eyePupil) st.eyePupil = opts.eyePupil;
  if (opts.color) st.color = Object.assign({}, st.color, opts.color);
  if (opts.eye) st.eye = Object.assign({}, st.eye, opts.eye);
  if (opts.background) st.bg = Object.assign({}, st.bg, opts.background);
  if (opts.frame) st.frame = Object.assign({}, st.frame, opts.frame);
  if (opts.ec) st.ec = opts.ec;
  if (typeof opts.margin === 'number') st.margin = opts.margin;
  if (opts.logo) st.logo = Object.assign({}, st.logo, opts.logo);
  return st;
}

/* Generate a QR code as an SVG string.
   content: a string (a link, or plain text when opts.type === 'text'),
            or an object like { type: 'wifi', ssid, pass, enc }.
   opts: { type, preset, size, dot, eyeFrame, eyePupil, color, eye,
           background, frame, ec, margin, logo } - all optional. */
function toSVG(content, opts) {
  opts = opts || {};
  const st = buildState(content, opts);
  const res = TitanRender.renderSVG(qrcode, st, opts.size);
  if (res && res.svg) return res.svg;
  if (res && res.error) throw new Error('QR generation failed: ' + res.error);
  throw new Error('No content to encode');
}

/* Assess how well a code will scan. Returns { level, reasons }, where level
   is 'good', 'fair' or 'poor' and reasons is an array of short codes. */
function assess(content, opts) {
  const st = buildState(content, opts || {});
  const res = TitanRender.renderSVG(qrcode, st);
  return TitanRender.assess(st, res && res.meta);
}

module.exports = {
  toSVG,
  assess,
  presets: TitanRender.PRESETS.map((p) => ({ id: p.id, name: p.name })),
  buildPayload: TitanRender.buildPayload,
  renderSVG: TitanRender.renderSVG,
  PRESETS: TitanRender.PRESETS,
  qrcode,
};
