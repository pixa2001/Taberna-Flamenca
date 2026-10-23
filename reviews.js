import { loadReviews } from './reviews-data.js';

const $ = id => document.getElementById(id);
const storagePrefix = 'taberna.googleReviews.invited.v1';
let demo = false;
let rows = [];
let marks = new Set();
let storageReady = false;
let controller;
let requestId = 0;
const storageKey = () => `${storagePrefix}.${demo ? 'demo' : 'live'}`;

function storageWarning() {
  storageReady = false;
  $('reviews-storage-error').textContent = 'No se pueden guardar o leer las marcas en este dispositivo. No uses esta vista para comprobar si ya se ha invitado a alguien. Comprueba el almacenamiento de Safari y vuelve a abrir la vista.';
  $('reviews-storage-error').hidden = false;
}
function readMarks() {
  try {
    const saved = localStorage.getItem(storageKey());
    const ids = saved === null ? [] : JSON.parse(saved);
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('invalid-storage');
    // Check that writing is possible before enabling invitation buttons.
    localStorage.setItem(storageKey(), JSON.stringify(ids));
    marks = new Set(ids);
    storageReady = true;
    $('reviews-storage-error').hidden = true;
  } catch { storageWarning(); }
}
function saveMarks(next) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify([...next]));
    marks = next;
    return true;
  } catch { storageWarning(); return false; }
}

function render() {
  $('reviews-list').replaceChildren();
  for (const review of rows) {
    const li = document.createElement('li');
    li.className = 'review-card';
    const invited = marks.has(review.id);
    li.classList.toggle('review-card--invited', invited);
    const stars = document.createElement('div');
    stars.className = 'review-stars';
    stars.textContent = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
    stars.setAttribute('aria-label', `${review.stars} de 5 estrellas`);
    const name = document.createElement('h2');
    name.textContent = review.author;
    const time = document.createElement('time');
    time.dateTime = review.createdAt;
    time.textContent = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(review.createdAt));
    const text = document.createElement('p');
    text.className = 'review-text';
    text.textContent = review.text || 'Sin texto.';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'touch-button review-invite';
    button.textContent = invited ? '✓ Ya invitado' : 'Invitar';
    button.disabled = invited || !storageReady;
    button.setAttribute('aria-label', `${button.textContent}: ${review.author}`);
    button.addEventListener('click', () => {
      // Re-read before writing so another tab's marks are not overwritten.
      readMarks();
      if (storageReady) saveMarks(new Set([...marks, review.id]));
      render();
    });
    li.append(stars, name, time, text, button);
    $('reviews-list').append(li);
  }
  $('reviews-new-night').disabled = !storageReady;
}

async function refresh() {
  controller?.abort();
  const current = ++requestId;
  controller = new AbortController();
  const timeout = setTimeout(() => controller?.abort(), 15000);
  $('reviews-refresh').disabled = true;
  $('reviews-list').setAttribute('aria-busy', 'true');
  $('reviews-status').textContent = 'Cargando reseñas…';
  // Do not allow previously fetched reviews to be mistaken for a successful refresh.
  rows = [];
  readMarks();
  render();
  try {
    const loaded = await loadReviews({ demo, signal: controller.signal });
    if (current !== requestId) return;
    rows = loaded;
    render();
    $('reviews-status').textContent = rows.length ? `${demo ? 'Ejemplos' : 'Reseñas'}: ${rows.length}. Más recientes primero.` : 'No hay reseñas disponibles.';
  } catch (error) {
    if (current !== requestId) return;
    $('reviews-status').textContent = error.message === 'not-configured'
      ? 'Las reseñas reales todavía no están conectadas. Puedes probar esta función con datos de ejemplo.'
      : 'No se han podido cargar las reseñas. Comprueba la conexión e inténtalo de nuevo.';
  } finally {
    clearTimeout(timeout);
    if (current === requestId) {
      $('reviews-refresh').disabled = false;
      $('reviews-list').setAttribute('aria-busy', 'false');
    }
  }
}
function setMode(test) {
  demo = test;
  $('reviews-demo-banner').hidden = !demo;
  $('reviews-demo').hidden = demo;
  $('reviews-live').hidden = !demo;
  refresh();
}
$('open-reviews').addEventListener('click', () => {
  $('home').hidden = true;
  $('app-status').hidden = true;
  $('reviews-view').hidden = false;
  window.scrollTo(0, 0);
  $('reviews-title').focus({ preventScroll: true });
  setMode(false);
});
$('reviews-back').addEventListener('click', () => {
  ++requestId;
  controller?.abort();
  $('reviews-view').hidden = true;
  $('home').hidden = false;
  window.scrollTo(0, 0);
  $('open-reviews').focus({ preventScroll: true });
});
$('reviews-refresh').addEventListener('click', refresh);
$('reviews-demo').addEventListener('click', () => setMode(true));
$('reviews-live').addEventListener('click', () => setMode(false));
$('reviews-new-night').addEventListener('click', () => $('reviews-reset-dialog').showModal());
$('reviews-reset-cancel').addEventListener('click', () => $('reviews-reset-dialog').close());
$('reviews-reset-confirm').addEventListener('click', () => {
  // Only this feature and mode: never clear unrelated localStorage entries.
  saveMarks(new Set());
  render();
  $('reviews-reset-dialog').close();
});
window.addEventListener('storage', event => {
  if (event.key === storageKey() || event.key === null) { readMarks(); render(); }
});
