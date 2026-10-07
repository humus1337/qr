# DesignYourQR

Free QR code generator with custom designs, live at https://designyourqr.com

Fully static, no build step, no backend. Codes are generated client-side; nothing the user types leaves their browser. English and Hebrew (RTL), light and dark themes, both persisted in localStorage and defaulting to the browser's preference.

## Structure

- `public/` - the whole site (deployed as-is)
  - `index.html` - markup, controls, FAQ, JSON-LD (Organization, WebSite, WebApplication, HowTo, FAQPage)
  - `app.js` - state, UI wiring, exports, sharing, theme + language switching
  - `renderer.js` - pure SVG renderer + payload builders + scannability check (also used by the Node tests)
  - `i18n.js` - all UI strings, en + he
  - `ads.js` - AdSense loader, curated slots dormant until slot ids are set (see comments inside)
  - `privacy.html` - bilingual privacy policy, served at /privacy
  - `robots.txt`, `sitemap.xml`, `llms.txt` - search and AI-answer-engine discovery
  - `ads.txt` - AdSense authorization
  - `qr-encoder.js` - vendored [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT, Kazuhiko Arase)
- `serve.mjs` - tiny dev server (`npm run dev`, port 4173)
- `test/` - see below
- `wrangler.toml` - Cloudflare Workers static-assets config with the custom domains
- `package/` - the renderer published to npm as [`designyourqr`](https://www.npmjs.com/package/designyourqr)
- `wordpress/designyourqr/` - a WordPress plugin exposing the same renderer as a `[designyourqr]` shortcode and a Gutenberg block

## SEO and GEO

- Canonical, Open Graph and Twitter tags, plus `robots` with `max-image-preview:large`.
- `hreflang` for English and Hebrew. The Hebrew page is a real, indexable URL at `/?lang=he`; the app reads the `lang` query parameter and sets a self-referential canonical so each language indexes on its own.
- `sitemap.xml` lists both language URLs with their alternates; `robots.txt` points to it.
- JSON-LD graph (Organization, WebSite, WebApplication, HowTo, FAQPage) for rich results and machine reading.
- `llms.txt` and an explicit allow-list for AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended and others) so the tool can be cited by answer engines.

## Dev and tests

- `npm run dev` - local server on :4173
- `npm test` - encoder round-trip plus the full style-matrix scan test
- `npm run test:e2e` - headless Chrome UI suite (needs the dev server, or set E2E_URL=https://designyourqr.com)
- `npm run assets` - regenerate og.png and the icon PNGs

The scan gate: every style combination must decode in zxing-wasm (both tryHarder and fast mode). jsQR runs as an advisory signal only; its binarizer is resolution-flaky on colored codes.

## Deploy

`npm run deploy` (runs `wrangler deploy`). It uploads `public/` to Cloudflare's edge and binds the `designyourqr.com` custom domain from `wrangler.toml`. The `designyourqr.com` zone is on the same Cloudflare account, so DNS and TLS provision automatically. Nothing runs on your machine after that; Cloudflare serves the files globally.

## Turning ads on

The AdSense library loads from the `<head>`; Auto ads are controlled from the AdSense dashboard. For the curated in-page slots:

1. Create two display units in AdSense and set `slotSide` / `slotBottom` in `public/ads.js`.
2. `npm run deploy`.

Add each root domain (for example `designyourqr.com`) as its own site in AdSense; `ads.txt` is already served correctly as a static file.

## Power user API

The page exposes `window.TitanQR` in the console: `TitanQR.set({dot: 'dots'})`, `TitanQR.svg()`, `TitanQR.applyPreset('sunset')`, `TitanQR.applyLang('he')`, `TitanQR.applyTheme('light')`.

## License

MIT for the site and the `designyourqr` npm package. The WordPress plugin in `wordpress/designyourqr/` is GPL-2.0-or-later, as required by the WordPress.org plugin directory.
