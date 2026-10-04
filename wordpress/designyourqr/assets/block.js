/* DesignYourQR block - a no-build editor script (classic API, no JSX).
   This is a dynamic block: the front-end HTML comes from PHP
   (designyourqr_render), so published output matches the shortcode exactly.
   The editor shows a labeled placeholder plus controls. */
(function (blocks, element, blockEditor, components, i18n) {
	'use strict';

	var el = element.createElement;
	var __ = i18n.__;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;
	var TextareaControl = components.TextareaControl;
	var SelectControl = components.SelectControl;
	var ToggleControl = components.ToggleControl;
	var RangeControl = components.RangeControl;

	var TYPE_OPTIONS = [
		{ label: 'Link (URL)', value: 'url' },
		{ label: 'Plain text', value: 'text' },
		{ label: 'Wi-Fi', value: 'wifi' },
		{ label: 'Email', value: 'email' },
		{ label: 'Phone', value: 'phone' },
		{ label: 'SMS', value: 'sms' },
		{ label: 'Contact card (vCard)', value: 'vcard' }
	];

	var PRESET_OPTIONS = ['', 'classic', 'ink', 'ocean', 'sunset', 'forest', 'grape', 'midnight', 'blush', 'stripe']
		.map(function (v) { return { label: v === '' ? 'Default' : v, value: v }; });

	var DOT_OPTIONS = ['', 'square', 'rounded', 'dots', 'fluid', 'diamond', 'leaf', 'bars']
		.map(function (v) { return { label: v === '' ? 'Preset default' : v, value: v }; });
	var EYEFRAME_OPTIONS = ['', 'square', 'rounded', 'extra', 'circle', 'leaf']
		.map(function (v) { return { label: v === '' ? 'Preset default' : v, value: v }; });
	var EYEPUPIL_OPTIONS = ['', 'square', 'rounded', 'dot', 'leaf', 'diamond']
		.map(function (v) { return { label: v === '' ? 'Preset default' : v, value: v }; });
	var EC_OPTIONS = ['', 'L', 'M', 'Q', 'H']
		.map(function (v) { return { label: v === '' ? 'Default (Q)' : v, value: v }; });
	var ENC_OPTIONS = [
		{ label: 'WPA / WPA2', value: 'WPA' },
		{ label: 'WEP', value: 'WEP' },
		{ label: 'No password', value: 'nopass' }
	];

	function set(props, key) {
		return function (value) {
			var patch = {};
			patch[key] = (typeof value === 'boolean') ? (value ? '1' : '0') : String(value);
			props.setAttributes(patch);
		};
	}

	function text(props, key, label, help) {
		return el(TextControl, { label: label, help: help || undefined, value: props.attributes[key] || '', onChange: set(props, key) });
	}

	function contentFields(props) {
		var a = props.attributes;
		var t = a.type || 'url';
		if (t === 'url') return [text(props, 'content', __('Link (URL)', 'designyourqr'), 'https://example.com')];
		if (t === 'text') return [text(props, 'content', __('Text', 'designyourqr'))];
		if (t === 'phone') return [text(props, 'content', __('Phone number', 'designyourqr'), '+15551234567')];
		if (t === 'wifi') return [
			text(props, 'ssid', __('Network name (SSID)', 'designyourqr')),
			text(props, 'pass', __('Password', 'designyourqr')),
			el(SelectControl, { label: __('Encryption', 'designyourqr'), value: a.enc || 'WPA', options: ENC_OPTIONS, onChange: set(props, 'enc') }),
			el(ToggleControl, { label: __('Hidden network', 'designyourqr'), checked: a.hidden === '1', onChange: set(props, 'hidden') })
		];
		if (t === 'email') return [
			text(props, 'to', __('To', 'designyourqr'), 'name@example.com'),
			text(props, 'subject', __('Subject', 'designyourqr')),
			el(TextareaControl, { label: __('Body', 'designyourqr'), value: a.body || '', onChange: set(props, 'body') })
		];
		if (t === 'sms') return [
			text(props, 'to', __('Phone number', 'designyourqr'), '+15551234567'),
			el(TextareaControl, { label: __('Message', 'designyourqr'), value: a.msg || '', onChange: set(props, 'msg') })
		];
		if (t === 'vcard') return [
			text(props, 'first', __('First name', 'designyourqr')),
			text(props, 'last', __('Last name', 'designyourqr')),
			text(props, 'org', __('Organization', 'designyourqr')),
			text(props, 'title', __('Job title', 'designyourqr')),
			text(props, 'phone', __('Phone', 'designyourqr')),
			text(props, 'email', __('Email', 'designyourqr')),
			text(props, 'url', __('Website', 'designyourqr'))
		];
		return [];
	}

	function summary(a) {
		var t = a.type || 'url';
		if (t === 'wifi') return a.ssid ? ('Wi-Fi: ' + a.ssid) : 'Wi-Fi network';
		if (t === 'vcard') return 'Contact: ' + ((a.first || '') + ' ' + (a.last || '')).trim();
		if (t === 'email') return 'Email: ' + (a.to || a.content || '');
		if (t === 'sms') return 'SMS: ' + (a.to || a.content || '');
		if (t === 'phone') return 'Phone: ' + (a.content || '');
		if (t === 'text') return a.content ? ('Text: ' + a.content) : 'Plain text';
		return a.content ? ('Link: ' + a.content) : 'Link (URL)';
	}

	blocks.registerBlockType('designyourqr/qr', {
		title: __('QR Code (DesignYourQR)', 'designyourqr'),
		description: __('A designed, scannable QR code. Static, never expires.', 'designyourqr'),
		icon: 'screenoptions',
		category: 'widgets',
		keywords: ['qr', 'qr code', 'qrcode'],

		edit: function (props) {
			var a = props.attributes;

			var main = el(PanelBody, { title: __('QR content', 'designyourqr'), initialOpen: true },
				el(SelectControl, { label: __('Type', 'designyourqr'), value: a.type || 'url', options: TYPE_OPTIONS, onChange: set(props, 'type') }),
				contentFields(props)
			);

			var style = el(PanelBody, { title: __('Style', 'designyourqr'), initialOpen: false },
				el(SelectControl, { label: __('Preset', 'designyourqr'), value: a.preset || '', options: PRESET_OPTIONS, onChange: set(props, 'preset') }),
				el(RangeControl, { label: __('Size (px)', 'designyourqr'), value: parseInt(a.size, 10) || 300, min: 80, max: 1024, step: 10, onChange: set(props, 'size') }),
				el(SelectControl, { label: __('Alignment', 'designyourqr'), value: a.align || 'center', options: [
					{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }
				], onChange: set(props, 'align') }),
				el(ToggleControl, { label: __('Show "Made with DesignYourQR" credit', 'designyourqr'), checked: a.caption !== '0', onChange: set(props, 'caption') })
			);

			var advanced = el(PanelBody, { title: __('Advanced shapes and colors', 'designyourqr'), initialOpen: false },
				el(SelectControl, { label: __('Module shape', 'designyourqr'), value: a.dot || '', options: DOT_OPTIONS, onChange: set(props, 'dot') }),
				el(SelectControl, { label: __('Corner frame', 'designyourqr'), value: a.eyeframe || '', options: EYEFRAME_OPTIONS, onChange: set(props, 'eyeframe') }),
				el(SelectControl, { label: __('Corner pupil', 'designyourqr'), value: a.eyepupil || '', options: EYEPUPIL_OPTIONS, onChange: set(props, 'eyepupil') }),
				text(props, 'c1', __('Color 1 (hex)', 'designyourqr'), '#0284c7'),
				text(props, 'c2', __('Color 2 (hex)', 'designyourqr'), '#6366f1'),
				text(props, 'angle', __('Gradient angle', 'designyourqr')),
				text(props, 'bg', __('Background (hex)', 'designyourqr'), '#ffffff'),
				el(ToggleControl, { label: __('Transparent background', 'designyourqr'), checked: a.transparent === '1', onChange: set(props, 'transparent') }),
				el(SelectControl, { label: __('Error correction', 'designyourqr'), value: a.ec || '', options: EC_OPTIONS, onChange: set(props, 'ec') }),
				text(props, 'margin', __('Quiet zone (modules)', 'designyourqr'))
			);

			var placeholder = el('div', {
				style: {
					border: '1px dashed #c3c4c7', borderRadius: '8px', padding: '20px',
					textAlign: 'center', color: '#50575e', font: '500 13px/1.5 system-ui, sans-serif',
					background: '#f6f7f7'
				}
			},
				el('div', { style: { fontWeight: 700, color: '#1d2327', marginBottom: '4px' } }, 'DesignYourQR'),
				el('div', null, summary(a)),
				el('div', { style: { marginTop: '6px', fontSize: '12px', color: '#787c82' } },
					(a.preset ? (a.preset + ' - ') : '') + ((parseInt(a.size, 10) || 300) + 'px') + ' - ' + __('renders on the published page', 'designyourqr'))
			);

			return el('div', useBlockProps ? useBlockProps() : {},
				el(InspectorControls, null, main, style, advanced),
				placeholder
			);
		},

		// Dynamic block: PHP render_callback produces the front-end markup.
		save: function () { return null; }
	});
})(window.wp.blocks, window.wp.element, window.wp.blockEditor, window.wp.components, window.wp.i18n);
