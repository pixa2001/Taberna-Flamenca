const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
let server;
const baseURL = 'http://127.0.0.1:8766';
const key = 'taberna.googleReviews.invited.v1.demo';
before(async () => {
  server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(baseURL)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw Error('Server did not start');
});
after(() => server?.kill());
async function setup(t) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  t.after(() => browser.close());
  return browser.newPage({ viewport: { width: 390, height: 844 } });
}
const open = async page => { await page.locator('#open-reviews').click(); await page.locator('#reviews-refresh').waitFor({ state: 'visible' }); };
const demo = async page => { await page.locator('#reviews-demo').click(); await page.waitForFunction(() => document.querySelectorAll('.review-card').length === 3); };

test('demo, persistence, refresh, independent modes and new night', async t => {
  const p = await setup(t);
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(baseURL);
  assert.equal(await p.locator('.categories .category').count(), 5);
  await open(p);
  await p.waitForFunction(() => document.getElementById('reviews-status').textContent.includes('todavía no'));
  assert.equal(await p.locator('.review-card').count(), 0);
  await demo(p);
  assert.equal(await p.locator('#reviews-demo-banner').isVisible(), true);
  assert.match(await p.locator('.review-card h2').first().innerText(), /Ejemplo A/);
  assert.match(await p.locator('.review-card').nth(1).innerText(), /Sin texto/);
  await p.locator('.review-invite').first().click();
  assert.equal(await p.locator('.review-invite').first().isDisabled(), true);
  assert.equal(await p.locator('.review-invite').first().innerText(), '✓ Ya invitado');
  assert.deepEqual(await p.evaluate(k => JSON.parse(localStorage.getItem(k)), key), ['demo-newest']);
  await p.locator('#reviews-refresh').click();
  assert.equal(await p.locator('.review-invite').first().isDisabled(), true);
  await p.reload();
  await open(p); await demo(p);
  assert.equal(await p.locator('.review-invite').first().isDisabled(), true);
  await p.evaluate(() => localStorage.setItem('unrelated', 'keep'));
  await p.evaluate(() => localStorage.setItem('taberna.googleReviews.invited.v1.live', '["real-review"]'));
  await p.locator('#reviews-new-night').click();
  await p.locator('#reviews-reset-cancel').click();
  assert.equal(await p.locator('.review-invite').first().isDisabled(), true);
  await p.locator('#reviews-new-night').click();
  await p.locator('#reviews-reset-confirm').click();
  assert.equal(await p.locator('.review-invite').first().isEnabled(), true);
  assert.equal(await p.evaluate(() => localStorage.getItem('unrelated')), 'keep');
  assert.equal(await p.evaluate(() => localStorage.getItem('taberna.googleReviews.invited.v1.live')), '["real-review"]');
  for (const [width, height] of [[1024,768],[768,1024],[390,844],[844,390]]) {
    await p.setViewportSize({ width, height });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  await p.locator('#reviews-back').click();
  await p.locator('.category').first().click();
  assert.equal(await p.locator('#report-view').isVisible(), true);
  await p.locator('#cancel-report').click();
  assert.equal(await p.locator('#home').isVisible(), true);
  assert.deepEqual(errors, []);
});

test('configured data adapter, loading, sorting, safe text, errors and empty response', async t => {
  const p = await setup(t);
  await p.route('**/reviews-config.js', route => route.fulfill({ contentType: 'text/javascript', body: "export const reviewsEndpoint = 'https://reviews.test/api/reviews';" }));
  let mode = 'data';
  await p.route('https://reviews.test/api/reviews', async route => {
    await new Promise(r => setTimeout(r, 150));
    if (mode === 'error') return route.fulfill({ status: 503, body: 'down' });
    const reviews = mode === 'empty' ? [] : [
      { reviewId: 'old', reviewer: { displayName: 'Older' }, starRating: 'TWO', createTime: '2026-10-20T10:00:00Z' },
      { reviewId: 'new', reviewer: { displayName: '<img src=x onerror=alert(1)>' }, starRating: 'FIVE', comment: '<script>alert(1)</script>', createTime: '2026-10-23T10:00:00Z' }
    ];
    await route.fulfill({ json: mode === 'partial' ? { reviews, nextPageToken: 'next' } : { reviews } });
  });
  await p.goto(baseURL); await open(p);
  assert.equal(await p.locator('#reviews-status').innerText(), 'Cargando reseñas…');
  await p.waitForFunction(() => document.querySelectorAll('.review-card').length === 2);
  assert.match(await p.locator('.review-card h2').first().innerText(), /<img/);
  assert.equal(await p.locator('.review-card img, .review-card script').count(), 0);
  await p.locator('.review-invite').first().click();
  await p.locator('#reviews-refresh').click();
  await p.waitForFunction(() => document.querySelectorAll('.review-card').length === 2);
  assert.equal(await p.locator('.review-invite').first().isDisabled(), true);
  for (const outcome of ['error', 'partial', 'empty']) {
    mode = outcome;
    await p.locator('#reviews-refresh').click();
    await p.waitForFunction(() => !document.getElementById('reviews-refresh').disabled);
    assert.equal(await p.locator('.review-card').count(), 0);
    assert.match(await p.locator('#reviews-status').innerText(), outcome === 'empty' ? /No hay reseñas/ : /No se han podido/);
  }
});

test('unavailable local storage disables marking rather than falsely claiming persistence', async t => {
  const p = await setup(t);
  await p.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await p.goto(baseURL); await open(p); await demo(p);
  assert.equal(await p.locator('#reviews-storage-error').isVisible(), true);
  assert.equal(await p.locator('.review-invite').first().isDisabled(), true);
  assert.equal(await p.locator('#reviews-new-night').isDisabled(), true);
});
