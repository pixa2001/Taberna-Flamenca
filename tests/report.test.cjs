// Run with: node --test tests/report.test.cjs
// Requires Playwright and its browser binaries (provided in the cloud workspace).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
let server;
const baseURL = 'http://127.0.0.1:8765';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const image = i => ({ name: `foto-${i}.png`, mimeType: 'image/png', buffer: png });
before(async () => {
  server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(baseURL)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Test server did not start');
});
after(() => server?.kill());

for (const engine of ['chromium', ...(process.env.RUN_WEBKIT === '1' ? ['webkit'] : [])]) {
  test(`${engine}: report workflow and responsive UI`, async t => {
    const browser = await (engine === 'chromium'
      ? chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
      : webkit.launch());
    t.after(() => browser.close());
    const context = await browser.newContext({ timezoneId: 'Europe/Berlin' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.shared = [];
      window.shareMode = 'success';
      window.revoked = 0;
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = url => { window.revoked++; revoke(url); };
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: data => data.files.length > 0 });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
        if (window.shareMode === 'abort') throw new DOMException('Cancelled', 'AbortError');
        if (window.shareMode === 'error') throw new DOMException('Denied', 'NotAllowedError');
        window.shared.push({ title: data.title, text: data.text, files: data.files.map(f => ({ name: f.name, size: f.size, isFile: f instanceof File })) });
      } });
    });
    await page.goto(baseURL);
    await page.clock.install({ time: new Date('2026-10-22T20:17:35Z') });
    const visible = selector => page.locator(selector).isVisible();
    const choose = id => page.locator(`[onclick="selectCategory('${id}')"]`).click();

    // All categories share the same form, preserve their icon and German mapping.
    const mapping = {
      defecto: 'Defekt / funktioniert nicht', falta: 'Fehlender Artikel / Bestellung',
      aviso: 'Hinweis / Unstimmigkeit', mejora: 'Verbesserungsvorschlag', otro: 'Sonstiges'
    };
    for (const [id, german] of Object.entries(mapping)) {
      await choose(id);
      assert.equal(await visible('#report-view'), true);
      assert.equal(await page.locator('#report-icon svg').count(), 1);
      await page.locator('#send-report').click();
      assert.match(await page.locator('#form-error').innerText(), /Añade una descripción/);
      assert.equal(await visible('#delivery-dialog'), false);
      await page.locator('#description').fill('   ');
      await page.locator('#send-report').click();
      assert.equal(await visible('#delivery-dialog'), false);
      await page.locator('#description').fill('El frigorífico no enfría. & + ? # ñ');
      const report = await page.evaluate(() => prepareReport(new Date('2026-10-22T20:17:35Z')));
      assert.equal(report.reportId, 'TF-20261022-221735');
      assert.equal(report.subject, `TF-20261022-221735 – ${german}`);
      assert.ok(report.body.includes(`Kategorie:\n${german}`));
      assert.ok(report.body.includes('Datum:\n22.10.2026\n\nUhrzeit:\n22:17'));
      assert.ok(report.body.includes('El frigorífico no enfría. & + ? # ñ'));
      assert.ok(report.body.includes('Keine Fotos beigefügt.'));
      await page.locator('#cancel-report').click();
      assert.equal(await visible('#cancel-dialog'), true);
      await page.locator('#keep-report').click();
      assert.notEqual(await page.locator('#description').inputValue(), '');
      await page.locator('#cancel-report').click();
      await page.locator('#discard-report').click();
      assert.equal(await visible('#home'), true);
      assert.equal(await page.locator('#description').inputValue(), '');
    }
    // Unedited Cancel is immediate.
    await choose('otro');
    await page.locator('#cancel-report').click();
    assert.equal(await visible('#home'), true);
    assert.equal(await visible('#cancel-dialog'), false);

    await choose('defecto');
    await page.locator('#photos-input').setInputFiles([1,2,3,4,5,6].map(image));
    assert.equal(await page.locator('#photo-list li').count(), 5);
    assert.equal(await page.locator('#photo-count').innerText(), 'Fotos 5 / 5');
    assert.equal(await page.locator('#camera-input').isDisabled(), true);
    assert.equal(await page.locator('#photos-input').isDisabled(), true);
    assert.match(await page.locator('#photo-message').innerText(), /máximo de 5/);
    assert.equal(await page.locator('#photo-list img').evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0)), true);
    await page.locator('[aria-label="Eliminar foto 3"]').click();
    assert.equal(await page.locator('#photo-list li').count(), 4);
    assert.equal(await page.locator('#photos-input').isEnabled(), true);
    await page.locator('#camera-input').setInputFiles(image(7));
    assert.equal(await page.locator('#photo-list li').count(), 5);
    assert.equal(await page.locator('#camera-input').getAttribute('capture'), 'environment');
    let report = await page.evaluate(() => prepareReport());
    assert.match(report.body, /Keine Beschreibung angegeben\./);
    assert.match(report.body, /5 Fotos beigefügt\./);

    // Native OS calls are mocked; test cancellation, failures, original Files and payload.
    await page.evaluate(() => { window.shareMode = 'abort'; });
    await page.locator('#send-report').click();
    await page.locator('#delivery-continue').click();
    await page.waitForFunction(() => !document.getElementById('delivery-dialog').open);
    assert.equal(await page.locator('#photo-list li').count(), 5);
    assert.match(await page.locator('#form-error').innerText(), /cancelado/);
    await page.evaluate(() => { window.shareMode = 'error'; });
    await page.locator('#send-report').click();
    await page.locator('#delivery-continue').click();
    await page.waitForFunction(() => document.getElementById('delivery-continue').textContent === 'Abrir correo');
    assert.equal(await page.locator('#download-list a').count(), 5);
    assert.match(await page.locator('#delivery-error').innerText(), /no incluirá fotos/);
    await page.locator('#delivery-back').click();
    await page.evaluate(() => { window.shareMode = 'success'; });
    await page.locator('#description').fill('Texto sin traducir');
    await page.locator('#send-report').click();
    await page.locator('#delivery-continue').click();
    await page.waitForFunction(() => !document.getElementById('home').hidden);
    const shared = await page.evaluate(() => window.shared);
    assert.equal(shared.length, 1);
    assert.equal(shared[0].files.length, 5);
    assert.ok(shared[0].files.every(f => f.isFile && f.size > 0));
    assert.match(shared[0].text, /Empfänger: info@taberna-flamenca.com/);
    assert.match(shared[0].text, /Texto sin traducir/);
    const id = shared[0].title.split(' – ')[0];
    assert.ok(shared[0].text.includes(`Meldungsnummer:\n${id}`));
    assert.equal(await page.locator('#photo-list li').count(), 0);
    assert.equal(await page.locator('#description').inputValue(), '');
    assert.ok(await page.evaluate(() => window.revoked >= 6));
    assert.match(await page.locator('#app-status').innerText(), /preparado para enviar/);

    // No API: visible honest fallback, downloadable photos, correct single-photo wording.
    await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { value: undefined }); });
    await choose('falta');
    await page.locator('#photos-input').setInputFiles(image(1));
    report = await page.evaluate(() => prepareReport());
    assert.match(report.body, /1 Foto beigefügt\./);
    await page.locator('#send-report').click();
    assert.match(await page.locator('#delivery-instructions').innerText(), /no añade fotos/);
    assert.equal(await page.locator('#download-list a').count(), 1);
    await page.locator('#delivery-back').click();
    await page.locator('#cancel-report').click();
    await page.locator('#discard-report').click();

    // iPad and iPhone, portrait and landscape: reach all fields, no overflow.
    for (const [width, height] of [[1024,768],[768,1024],[390,844],[844,390],[375,667]]) {
      await page.setViewportSize({ width, height });
      await choose('mejora');
      await page.locator('#photos-input').setInputFiles([1,2,3,4,5].map(image));
      await page.locator('#description').fill('Texto de prueba');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}x${height} overflow`);
      await page.locator('#send-report').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#send-report').isVisible(), true);
      await page.locator('#cancel-report').click();
      await page.locator('#discard-report').click();
    }
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    await context.close();
  });
}

test('Chromium: mailto recipient, encoding, reset and text-only flow', async t => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(baseURL);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  const navigation = new Promise(resolve => cdp.on('Page.windowOpen', e => { if (e.url.startsWith('mailto:')) resolve(e.url); }));
  await page.locator('[onclick="selectCategory(\'otro\')"]').click();
  await page.locator('#description').fill('Texto español & símbolos + ? #\nSegunda línea');
  await page.locator('#send-report').click();
  assert.equal(await page.locator('#download-list a').count(), 0);
  await page.locator('#delivery-continue').click();
  const mailto = new URL(await Promise.race([navigation, new Promise((_, reject) => setTimeout(() => reject(Error('No mailto navigation')), 5000))]));
  assert.equal(mailto.pathname, 'info@taberna-flamenca.com');
  assert.match(mailto.searchParams.get('subject'), /^TF-\d{8}-\d{6} – Sonstiges$/);
  assert.match(mailto.searchParams.get('body'), /Texto español & símbolos \+ \? #\nSegunda línea/);
  assert.match(mailto.searchParams.get('body'), /Keine Fotos beigefügt\./);
  assert.equal(await page.locator('#home').isVisible(), true);
  assert.equal(await page.locator('#description').inputValue(), '');
});
