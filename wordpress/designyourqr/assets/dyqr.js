/* DesignYourQR WordPress - renders each [designyourqr] block in the browser
   using the shipped engine (qr-encoder.js + renderer.js). Mirrors the
   buildState logic from the "designyourqr" npm package. */
(function () {
	'use strict';

	if (typeof qrcode === 'undefined' || typeof TitanRender === 'undefined') {
		return;
	}
	if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
		qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
	}

	var TR = TitanRender;
	var TYPES = ['url', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard'];

	function assign(target) {
		for (var i = 1; i < arguments.length; i++) {
			var src = arguments[i];
			if (!src) continue;
			for (var k in src) {
				if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
			}
		}
		return target;
	}

	function defaultState() {
		return {
			type: 'url',
			content: {
				url: '', text: '',
				wifi: { ssid: '', pass: '', enc: 'WPA', hidden: false },
				email: { to: '', subject: '', body: '' },
				phone: '',
				sms: { to: '', msg: '' },
				vcard: { first: '', last: '', org: '', title: '', phone: '', email: '', url: '' }
			},
			dot: 'fluid', eyeFrame: 'extra', eyePupil: 'dot',
			color: { mode: 'linear', c1: '#0284c7', c2: '#6366f1', angle: 135 },
			eye: { custom: false, frame: '#111827', pupil: '#111827' },
			bg: { color: '#ffffff', transparent: false },
			logo: { data: null, orig: null, cutData: null, cut: false, w: 1, h: 1, size: 20, backdrop: 'rounded', pad: 1.5, excavate: true },
			frame: { style: 'none', text: '', color: '#111827', textColor: '#ffffff', font: 'sans' },
			ec: 'Q', margin: 4
		};
	}

	function applyPreset(st, id) {
		var p = null;
		for (var i = 0; i < TR.PRESETS.length; i++) {
			if (TR.PRESETS[i].id === id) { p = TR.PRESETS[i]; break; }
		}
		if (!p) return;
		var q = p.p;
		st.dot = q.dot; st.eyeFrame = q.eyeFrame; st.eyePupil = q.eyePupil;
		st.color = assign({}, st.color, q.color);
		st.eye = assign({}, st.eye, q.eye);
		st.bg = assign({}, st.bg, q.bg);
	}

	function buildState(content, opts) {
		opts = opts || {};
		var st = defaultState();

		if (content && typeof content === 'object') {
			var type = content.type;
			if (TYPES.indexOf(type) === -1) type = 'url';
			st.type = type;
			if (type === 'url') st.content.url = content.url || content.data || '';
			else if (type === 'text') st.content.text = content.text || content.data || '';
			else if (type === 'phone') st.content.phone = content.phone || content.data || '';
			else st.content[type] = assign({}, st.content[type], content);
		} else {
			st.type = (opts.type && TYPES.indexOf(opts.type) !== -1) ? opts.type : 'url';
			var s = content == null ? '' : String(content);
			if (st.type === 'text') st.content.text = s;
			else if (st.type === 'phone') st.content.phone = s;
			else st.content.url = s;
		}

		if (opts.preset) applyPreset(st, opts.preset);
		if (opts.dot) st.dot = opts.dot;
		if (opts.eyeFrame) st.eyeFrame = opts.eyeFrame;
		if (opts.eyePupil) st.eyePupil = opts.eyePupil;
		if (opts.color) st.color = assign({}, st.color, opts.color);
		if (opts.background) st.bg = assign({}, st.bg, opts.background);
		if (opts.ec) st.ec = opts.ec;
		if (typeof opts.margin === 'number') st.margin = opts.margin;
		return st;
	}

	function makeCredit() {
		var a = document.createElement('a');
		a.href = 'https://designyourqr.com';
		a.target = '_blank';
		a.rel = 'noopener';
		a.textContent = 'Made with DesignYourQR';
		a.style.cssText = 'display:block;margin-top:6px;font:400 11px/1.4 system-ui,sans-serif;color:#64748b;text-decoration:none;line-height:1.4';
		return a;
	}

	function renderBlock(el) {
		var cfg;
		try {
			cfg = JSON.parse(el.getAttribute('data-dyqr') || '{}');
		} catch (e) {
			return;
		}
		var size = cfg.size && cfg.size > 0 ? cfg.size : null;
		var st = buildState(cfg.content, cfg.opts);
		var res = TR.renderSVG(qrcode, st, size);

		if (!res || res.empty) { el.innerHTML = ''; return; }
		if (res.error) { el.innerHTML = ''; return; }

		el.innerHTML = res.svg;
		var svg = el.querySelector('svg');
		if (svg) { svg.style.maxWidth = '100%'; svg.style.height = 'auto'; }

		if (cfg.caption !== false) {
			el.appendChild(makeCredit());
		}
	}

	function run() {
		var blocks = document.querySelectorAll('.dyqr[data-dyqr]');
		for (var i = 0; i < blocks.length; i++) renderBlock(blocks[i]);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run);
	} else {
		run();
	}
})();
