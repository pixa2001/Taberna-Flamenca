import { reviewsEndpoint } from './reviews-config.js';

const ratings = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
export function normalizeReviews(rows) {
  if (!Array.isArray(rows)) throw new Error('invalid-response');
  const seen = new Set();
  return rows.map(row => {
    const id = row.reviewId || row.name;
    const stars = ratings[row.starRating] || Number(row.rating);
    const date = new Date(row.createTime);
    if (typeof id !== 'string' || !id || seen.has(id) || !Number.isInteger(stars) || stars < 1 || stars > 5 || !Number.isFinite(date.getTime())) throw new Error('invalid-review');
    seen.add(id);
    return {
      id,
      author: typeof row.reviewer?.displayName === 'string' ? row.reviewer.displayName : 'Usuario de Google',
      stars,
      text: typeof row.comment === 'string' ? row.comment : '',
      createdAt: date.toISOString()
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function loadReviews({ demo = false, signal } = {}) {
  if (demo) {
    const date = minutes => new Date(Date.now() - minutes * 60000).toISOString();
    return normalizeReviews([
      { reviewId: 'demo-older', reviewer: { displayName: 'Ejemplo B (prueba)' }, starRating: 'FOUR', comment: 'Texto de ejemplo: ambiente agradable.', createTime: date(120) },
      { reviewId: 'demo-newest', reviewer: { displayName: 'Ejemplo A (prueba)' }, starRating: 'FIVE', comment: 'Esta reseña es ficticia y solo sirve para probar la aplicación.', createTime: date(5) },
      { reviewId: 'demo-no-text', reviewer: { displayName: 'Ejemplo C (prueba)' }, starRating: 'THREE', createTime: date(60) }
    ]);
  }
  if (!reviewsEndpoint) throw new Error('not-configured');
  const url = new URL(reviewsEndpoint, location.href);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('invalid-endpoint');
  const response = await fetch(url, { signal, credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('unavailable');
  const payload = await response.json();
  // The server must exhaust Google pagination; do not present a partial list as complete.
  if (payload.nextPageToken) throw new Error('incomplete-response');
  return normalizeReviews(payload.reviews);
}
