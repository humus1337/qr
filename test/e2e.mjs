// End-to-end UI test with headless Chrome: drives the real page like a user,
// checks every control path, uploads a real logo file, verifies downloads,
// persistence, design links, and decodes the live DOM's SVG.
// Run: node serve.mjs (separately), then node test/e2e.mjs
import puppeteer from 'puppeteer';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { Resvg } = require('@resvg/resvg-js');
const { PNG } = require('pngjs');
const { readBarcodes } = await import('zxing-wasm/reader');

const URL_BASE = process.env.E2E_URL || 'http://localhost:4173';
let pass = 0, fail = 0;
const ok = (label, cond, extra) => {
  if (cond) { pass++; console.log('ok   ' + label); }
  else { fail++; console.log('FAIL ' + label + (extra ? ' -> ' + extra : '')); }
};

mkdirSync('test/shots', { recursive: true });

const extraArgs = process.env.E2E_CHROME_ARGS ? process.env.E2E_CHROME_ARGS.split('|') : [];
const browser = await puppeteer.launch({
  headless: true,
  pipe: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox', '--disable-gpu', ...extraArgs],
});
const page = await browser.newPage();
page.on('pageerror', (e) => { fail++; console.log('FAIL page error: ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error') console.log('     console.error: ' + m.text()); });

/* keep the run hermetic: never hit Google's ad network, but leave the DOM tag in place */
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (/googlesyndication|googleads|doubleclick|adtrafficquality|google-analytics/.test(req.url())) req.abort();
  else req.continue();
});

await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
await page.goto(URL_BASE, { waitUntil: 'networkidle0' });

/* boot state */
ok('page title', (await page.title()).includes('DesignYourQR'));
await page.waitForSelector('#preview-svg svg', { timeout: 5000 }).catch(() => null);
ok('initial QR rendered', !!(await page.$('#preview-svg svg')));
ok('TitanQR api exposed', await page.evaluate(() => typeof window.TitanQR === 'object'));

async function decodeLiveSVG(expected) {
  const svg = await page.evaluate(() => TitanQR.svg());
  if (!svg) return 'no svg';
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const h = Math.round((640 * parseFloat(vb[2])) / parseFloat(vb[1]));
  const sized = svg.replace('<svg ', '<svg width="640" height="' + h + '" ');
  const png = new Resvg(sized, { fitTo: { mode: 'width', value: 640 }, background: '#ffffff' }).render().asPng();
  const res = await readBarcodes(new Uint8Array(png), { formats: ['QRCode'], tryHarder: true });
  if (!res.length || !res[0].isValid) return 'no decode';
  return res[0].text === expected ? true : 'mismatch: ' + res[0].text.slice(0, 60);
}

/* expand every section the way a user would, so later clicks hit real targets */
async function expandAllSections() {
  const n = await page.$$eval('details', (ds) => ds.length);
  for (let i = 0; i < n; i++) {
    const open = await page.evaluate((idx) => document.querySelectorAll('details')[idx].open, i);
    if (!open) {
      await page.evaluate((idx) => document.querySelectorAll('details')[idx].querySelector('summary').click(), i);
    }
  }
}
await expandAllSections();

/* default content decodes */
{
  const r = await decodeLiveSVG('https://designyourqr.com');
  ok('default live svg decodes', r === true, String(r));
}

/* screenshot default state */
await page.screenshot({ path: 'test/shots/desktop-default.png', fullPage: true });

/* type a url and confirm live update */
await page.click('#in-url');
await page.keyboard.down('Control');
await page.keyboard.press('a');
await page.keyboard.up('Control');
await page.type('#in-url', 'example.org/menu');
await new Promise((r) => setTimeout(r, 300));
{
  const r = await decodeLiveSVG('https://example.org/menu');
  ok('typed url updates live svg', r === true, String(r));
}

/* switch to wifi tab, fill, decode */
await page.click('.tab[data-type="wifi"]');
await page.type('#in-ssid', 'CafeGuest');
await page.type('#in-wifipass', 'espresso;42');
await new Promise((r) => setTimeout(r, 300));
{
  const r = await decodeLiveSVG('WIFI:T:WPA;S:CafeGuest;P:espresso\\;42;;');
  ok('wifi payload decodes with escaping', r === true, String(r));
}
ok('meta line updates', (await page.$eval('#meta-line', (el) => el.textContent)).includes('error correction'));

/* click through every module style, eye style, check selection + render */
for (const dot of ['square', 'rounded', 'dots', 'fluid', 'diamond', 'leaf', 'bars']) {
  await page.click(`button.opt[data-set="dot"][data-val="${dot}"]`);
  await new Promise((r) => setTimeout(r, 120));
  const sel = await page.$eval(`button.opt[data-set="dot"][data-val="${dot}"]`, (el) => el.classList.contains('selected'));
  const hasSvg = !!(await page.$('#preview-svg svg'));
  ok('dot style click ' + dot, sel && hasSvg);
}

/* preset click applies fully */
await page.click('.chip[data-preset="sunset"]');
await new Promise((r) => setTimeout(r, 150));
{
  const st = await page.evaluate(() => ({ dot: TitanQR.state.dot, c1: TitanQR.state.color.c1, bg: TitanQR.state.bg.color }));
  ok('preset sunset applies', st.dot === 'dots' && st.c1 === '#ea580c' && st.bg === '#fffbeb', JSON.stringify(st));
}

/* gradient mode toggle shows second color + angle */
await page.click('button[data-set="color.mode"][data-val="solid"]');
ok('solid hides second color', await page.$eval('#cf-c2', (el) => el.classList.contains('hidden')));
await page.click('button[data-set="color.mode"][data-val="linear"]');
ok('linear shows angle', !(await page.$eval('#cf-angle', (el) => el.classList.contains('hidden'))));

/* hex input round trip */
await page.click('input[data-hexfor="color.c1"]');
await page.keyboard.down('Control');
await page.keyboard.press('a');
await page.keyboard.up('Control');
await page.type('input[data-hexfor="color.c1"]', '1d4ed8');
await new Promise((r) => setTimeout(r, 200));
ok('hex input applies', await page.evaluate(() => TitanQR.state.color.c1 === '#1d4ed8'));

/* upload a real logo file through the file input */
{
  const logoPng = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" rx="40" fill="#e11d48"/><circle cx="100" cy="100" r="55" fill="#fff"/></svg>', {}).render().asPng();
  writeFileSync('test/logo-sample.png', logoPng);
  const input = await page.$('#logo-file');
  await input.uploadFile('test/logo-sample.png');
  await new Promise((r) => setTimeout(r, 500));
  ok('logo uploaded', await page.evaluate(() => !!TitanQR.state.logo.data));
  ok('logo forces EC H', (await page.evaluate(() => TitanQR.meta().ec)) === 'H');
  const r = await decodeLiveSVG(await page.evaluate(() => TitanQR.payload()));
  ok('logo code still decodes', r === true, String(r));
  await page.screenshot({ path: 'test/shots/desktop-logo.png', fullPage: false });
}

/* background removal: not offered for an already transparent logo */
ok('no removal offer for transparent logo', await page.$eval('#logo-cut-row', (el) => el.classList.contains('hidden')));

/* background removal: flat white background gets cut automatically */
{
  const flat = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><rect width="220" height="220" fill="#ffffff"/><circle cx="110" cy="110" r="70" fill="#e11d48"/></svg>', {}).render().asPng();
  writeFileSync('test/logo-flat.png', flat);
  await (await page.$('#logo-file')).uploadFile('test/logo-flat.png');
  await new Promise((r) => setTimeout(r, 700));
  ok('flat background auto-removed', await page.evaluate(() => TitanQR.state.logo.cut === true && !!TitanQR.state.logo.cutData));
  ok('removal toggle visible and checked', await page.$eval('#logo-cut-row', (el) =>
    !el.classList.contains('hidden') && el.querySelector('input').checked));

  const cut = await page.evaluate(() => TitanQR.state.logo.cutData);
  const img2 = PNG.sync.read(Buffer.from(cut.split(',')[1], 'base64'));
  const a = (x, y) => img2.data[(y * img2.width + x) * 4 + 3];
  ok('cut logo corners transparent', a(1, 1) === 0 && a(img2.width - 2, img2.height - 2) === 0);
  ok('cut logo subject stays opaque', a(img2.width >> 1, img2.height >> 1) === 255);

  await page.click('#logo-cut-row input');
  await new Promise((r) => setTimeout(r, 200));
  ok('untoggle restores original', await page.evaluate(() => TitanQR.state.logo.data === TitanQR.state.logo.orig));
  await page.click('#logo-cut-row input');
  await new Promise((r) => setTimeout(r, 200));
  ok('retoggle applies the cut again', await page.evaluate(() => TitanQR.state.logo.data === TitanQR.state.logo.cutData));
  const r = await decodeLiveSVG(await page.evaluate(() => TitanQR.payload()));
  ok('code with cut logo decodes', r === true, String(r));
}

/* frame with label */
await page.click('button[data-set="frame.style"][data-val="bottom"]');
await new Promise((r) => setTimeout(r, 200));
{
  const svg = await page.evaluate(() => TitanQR.svg());
  ok('frame label renders', svg.includes('SCAN ME'));
  const r = await decodeLiveSVG(await page.evaluate(() => TitanQR.payload()));
  ok('framed code decodes', r === true, String(r));
}
await page.screenshot({ path: 'test/shots/desktop-frame-logo.png', fullPage: false });

/* download flow produces a file */
{
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: process.cwd() + '\\test\\shots' });
  await page.click('#btn-download');
  await new Promise((r) => setTimeout(r, 1200));
  const files = (await import('node:fs')).readdirSync('test/shots').filter((f) => f.startsWith('designyourqr-'));
  ok('png download lands', files.length >= 1, files.join(','));
}

/* svg download */
await page.click('button[data-set="exportFormat"][data-val="svg"]');
ok('download label switches', (await page.$eval('#btn-download', (el) => el.textContent)) === 'Download SVG');
ok('size select disabled for svg', await page.$eval('#export-size', (el) => el.disabled));

/* transparent png export via the export-area checkbox */
{
  await page.click('button[data-set="frame.style"][data-val="none"]');
  await page.click('button[data-set="exportFormat"][data-val="png"]');
  await page.click('#export-alpha input');
  await new Promise((r) => setTimeout(r, 250));
  ok('export checkbox syncs the colors one', await page.evaluate(() =>
    document.querySelector('.controls input[data-bind="bg.transparent"]').checked));
  ok('checkerboard preview for transparency', await page.$eval('#stage', (el) => el.classList.contains('checker')));

  const before = readdirSync('test/shots').filter((f) => f.startsWith('designyourqr-'));
  await page.click('#btn-download');
  await new Promise((r) => setTimeout(r, 1500));
  const fresh = readdirSync('test/shots').filter((f) => f.startsWith('designyourqr-') && f.endsWith('.png') && !before.includes(f));
  ok('transparent png downloaded', fresh.length === 1, fresh.join(','));
  if (fresh.length === 1) {
    const img = PNG.sync.read(readFileSync('test/shots/' + fresh[0]));
    const alphaAt = (x, y) => img.data[(y * img.width + x) * 4 + 3];
    ok('corners of the file are transparent', alphaAt(0, 0) === 0 && alphaAt(img.width - 1, img.height - 1) === 0);
    let clear = 0, solid = 0;
    for (let i = 3; i < img.data.length; i += 4) {
      if (img.data[i] === 0) clear++;
      else if (img.data[i] === 255) solid++;
    }
    const total = img.width * img.height;
    ok('background clear, modules solid', clear > total * 0.4 && solid > total * 0.08, 'clear ' + clear + ' solid ' + solid + ' of ' + total);
  }

  /* jpg warning shows while transparency is on */
  await page.click('button[data-set="exportFormat"][data-val="jpeg"]');
  await new Promise((r) => setTimeout(r, 150));
  ok('jpg transparency note shows', await page.$eval('#alpha-note', (el) => !el.classList.contains('hidden')));
  await page.click('button[data-set="exportFormat"][data-val="png"]');
  await page.click('#export-alpha input');
  await new Promise((r) => setTimeout(r, 200));
  ok('transparency toggles back off', await page.evaluate(() => !TitanQR.state.bg.transparent));
}

/* share link */
{
  const link = await page.evaluate(async () => {
    const d = { dot: TitanQR.state.dot, eyeFrame: TitanQR.state.eyeFrame, eyePupil: TitanQR.state.eyePupil, color: TitanQR.state.color, eye: TitanQR.state.eye, bg: TitanQR.state.bg, frame: TitanQR.state.frame, ec: TitanQR.state.ec, margin: TitanQR.state.margin };
    const bytes = new TextEncoder().encode(JSON.stringify(d));
    let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return location.origin + location.pathname + '#d=' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  });
  const page2 = await browser.newPage();
  await page2.goto(link, { waitUntil: 'networkidle0' });
  const same = await page2.evaluate(() => ({ dot: TitanQR.state.dot, frame: TitanQR.state.frame.style }));
  const orig = await page.evaluate(() => ({ dot: TitanQR.state.dot, frame: TitanQR.state.frame.style }));
  ok('design link restores design', same.dot === orig.dot && same.frame === orig.frame, JSON.stringify({ same, orig }));
  await page2.close();
}

/* persistence across reload */
{
  const before = await page.evaluate(() => TitanQR.state.dot);
  await new Promise((r) => setTimeout(r, 500));
  await page.reload({ waitUntil: 'networkidle0' });
  await expandAllSections();
  const after = await page.evaluate(() => TitanQR.state.dot);
  ok('state persists across reload', before === after, before + ' vs ' + after);
  ok('logo persists across reload', await page.evaluate(() => !!TitanQR.state.logo.data));
}

/* remove logo */
await page.click('button[data-action="logo-remove"]');
await new Promise((r) => setTimeout(r, 200));
ok('logo removed', await page.evaluate(() => !TitanQR.state.logo.data));

/* overflow message */
await page.click('.tab[data-type="text"]');
await page.evaluate(() => { TitanQR.set({ type: 'text', content: { text: 'x'.repeat(1500) }, ec: 'H' }); });
await new Promise((r) => setTimeout(r, 200));
{
  const visible = await page.$eval('#overlay', (el) => !el.classList.contains('hidden'));
  const txt = await page.$eval('#overlay', (el) => el.textContent);
  ok('overflow overlay shows', visible && txt.includes('too much data'), txt);
}
await page.evaluate(() => { TitanQR.set({ content: { text: 'hello' }, ec: 'Q' }); });

/* empty state */
await page.evaluate(() => { TitanQR.set({ content: { text: '' } }); });
await new Promise((r) => setTimeout(r, 100));
ok('empty overlay shows', await page.$eval('#overlay', (el) => !el.classList.contains('hidden')));
ok('download disabled when empty', await page.$eval('#btn-download', (el) => el.disabled));

/* scannability meter reacts */
await page.evaluate(() => { TitanQR.set({ type: 'url', color: { mode: 'solid', c1: '#fef08a' }, bg: { color: '#ffffff', transparent: false } }); });
await new Promise((r) => setTimeout(r, 100));
ok('poor contrast flagged', await page.$eval('#scanline', (el) => el.classList.contains('poor')));
await page.evaluate(() => { TitanQR.set({ color: { mode: 'solid', c1: '#111111' } }); });
await new Promise((r) => setTimeout(r, 100));
ok('good contrast restored', await page.$eval('#scanline', (el) => el.classList.contains('good')));

/* reset */
await page.click('button[data-action="reset"]');
await new Promise((r) => setTimeout(r, 200));
ok('reset restores defaults', await page.evaluate(() => TitanQR.state.dot === 'fluid' && TitanQR.state.content.url === 'https://designyourqr.com'));

/* theme toggle */
await page.click('#btn-theme');
await new Promise((r) => setTimeout(r, 250));
{
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok('theme toggles to light', theme === 'light', theme);
  ok('light background applied', bg.includes('rgb(238'), bg);
  await page.screenshot({ path: 'test/shots/desktop-light.png', fullPage: false });
}

/* language toggle to hebrew */
await page.click('#btn-lang');
await new Promise((r) => setTimeout(r, 300));
{
  ok('dir flips to rtl', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');
  const h1 = await page.$eval('.hero h1', (el) => el.textContent);
  ok('h1 translated to hebrew', /[֐-׿]/.test(h1), h1);
  const dl = await page.$eval('#btn-download', (el) => el.textContent);
  ok('download button translated', /[֐-׿]/.test(dl), dl);
  const meter = await page.$eval('#scan-text', (el) => el.textContent);
  ok('scan meter translated', /[֐-׿]/.test(meter), meter);
  ok('style buttons translated', /[֐-׿]/.test(await page.$eval('#grid-dot .opt span', (el) => el.textContent)));
  const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok('no horizontal scroll in rtl', noHScroll);
  ok('qr still renders in hebrew ui', !!(await page.$('#preview-svg svg')));
  await page.screenshot({ path: 'test/shots/desktop-light-he.png', fullPage: true });
}

/* lang + theme persist through reload */
await page.reload({ waitUntil: 'networkidle0' });
{
  ok('lang persists across reload', (await page.evaluate(() => document.documentElement.lang)) === 'he');
  ok('theme persists across reload', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'light');
}

/* ads: loader present with our publisher id, curated slots idle until slot ids are set */
ok('adsense loader present with client', await page.evaluate(() =>
  !!document.querySelector('script[src*="adsbygoogle.js"][src*="ca-pub-3769208320963674"]')));
ok('curated ad slots idle without slot ids', await page.evaluate(() =>
  getComputedStyle(document.getElementById('ad-side')).display === 'none' &&
  getComputedStyle(document.getElementById('ad-bottom')).display === 'none'));

/* back to english dark for the mobile checks */
await page.click('#btn-lang');
await page.click('#btn-theme');
await new Promise((r) => setTimeout(r, 250));
ok('back to english ltr', (await page.evaluate(() => document.documentElement.dir)) === 'ltr');

/* mobile layout */
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: 'test/shots/mobile-default.png', fullPage: true });
{
  const previewFirst = await page.evaluate(() => {
    const prev = document.querySelector('.preview-card').getBoundingClientRect();
    const ctrl = document.querySelector('.controls').getBoundingClientRect();
    return prev.top < ctrl.top;
  });
  ok('mobile shows preview first', previewFirst);
  const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok('no horizontal scroll on mobile', noHScroll);
}

await browser.close();
console.log('---');
console.log('pass ' + pass + ', fail ' + fail);
process.exit(fail ? 1 : 0);
