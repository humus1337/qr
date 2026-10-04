=== DesignYourQR - QR Code Generator ===
Contributors: designyourqr
Tags: qr code, qr, qrcode, qr generator, qr code with logo
Requires at least: 5.0
Tested up to: 6.6
Requires PHP: 7.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add designed, scannable QR codes to any post or page with a shortcode. Static codes that never expire, style presets, gradients and custom shapes.

== Description ==

DesignYourQR adds a simple `[designyourqr]` shortcode that draws a styled QR code anywhere on your site. It is the same engine that powers [designyourqr.com](https://designyourqr.com), bundled as a self-contained plugin.

The code is rendered in the visitor's browser as a crisp SVG. Nothing is sent to an external server, there is no API key, and the codes are static, so they never expire and keep working even if the plugin is later removed from the page as an image.

**Features**

* Static QR codes that never expire (the content is baked into the image).
* 9 style presets, plus full control over module and corner shapes.
* Solid or gradient colors with any angle.
* Content types: link, plain text, Wi-Fi, email, phone, SMS and vCard.
* Adjustable error correction and quiet zone.
* Scales to its container and looks sharp at any size (SVG).
* No tracking, no external requests, no account.

**Basic usage**

`[designyourqr content="https://example.com" preset="ocean" size="300"]`

**A Wi-Fi code**

`[designyourqr type="wifi" ssid="MyNetwork" pass="secret123" enc="WPA" preset="forest"]`

**A vCard contact**

`[designyourqr type="vcard" first="Ada" last="Lovelace" email="ada@example.com" phone="+15551234567"]`

For a full no-code generator with live preview, logo embedding and PNG/JPG/WebP export, use the site: [designyourqr.com](https://designyourqr.com).

== Shortcode attributes ==

* `content` - the link, or the text when type is text, or the number when type is phone.
* `type` - url (default), text, wifi, email, phone, sms or vcard.
* `preset` - classic, ink, ocean, sunset, forest, grape, midnight, blush or stripe.
* `size` - output width in pixels (default 300). The SVG still scales to its container.
* `dot` - square, rounded, dots, fluid, diamond, leaf or bars.
* `eyeframe` - square, rounded, extra, circle or leaf.
* `eyepupil` - square, rounded, dot, leaf or diamond.
* `c1`, `c2`, `angle` - gradient start color, end color and angle.
* `bg`, `transparent` - background color, or transparent="1" for none.
* `ec` - error correction L, M, Q or H.
* `margin` - quiet zone in modules (default 4).
* `caption` - 1 (default) shows a small credit under the code, 0 hides it.
* `align` - left, center (default) or right.
* Type-specific: `ssid`, `pass`, `enc`, `hidden` (wifi); `to`, `subject`, `body` (email); `to`, `msg` (sms); `first`, `last`, `org`, `title`, `phone`, `email`, `url` (vcard).

== Frequently Asked Questions ==

= Do the codes expire? =

No. These are static QR codes, so the content is encoded directly into the image. There is no redirect and nothing to keep paying for.

= Does it send my data anywhere? =

No. The code is generated in the browser. The plugin makes no external requests and needs no API key.

= Can I use a logo in the center? =

The shortcode keeps things simple. For logo embedding and background removal, design the code on [designyourqr.com](https://designyourqr.com) and download it, or paste a data URI if you extend the shortcode.

= Will the code still work if I deactivate the plugin? =

The code is drawn by the bundled script, so it needs the plugin active on pages that use the shortcode. If you want a permanent image, download a PNG or SVG from designyourqr.com and insert that instead.

== Screenshots ==

1. A QR code rendered by the shortcode with the "ocean" preset.
2. Different presets and shapes.

== Changelog ==

= 1.0.0 =
* First release: [designyourqr] shortcode with presets, shapes, gradients and seven content types.
