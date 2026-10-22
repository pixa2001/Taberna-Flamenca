'use strict';

// The existing home icons stay the source for the shared form's icon.
const categories = {
  defecto: { es: 'Algo está roto o no funciona', de: 'Defekt / funktioniert nicht', color: '--orange', icon: 'red' },
  falta: { es: 'Falta algo o hay que pedirlo', de: 'Fehlender Artikel / Bestellung', color: '--gold', icon: 'yellow' },
  aviso: { es: 'Aviso / algo no está correcto', de: 'Hinweis / Unstimmigkeit', color: '--turquoise', icon: 'blue' },
  mejora: { es: 'Propuesta de mejora', de: 'Verbesserungsvorschlag', color: '--green', icon: 'green' },
  otro: { es: 'Otro', de: 'Sonstiges', color: '--purple', icon: 'purple' }
};
const recipient = 'info@taberna-flamenca.com';
const maxPhotos = 5;
const $ = id => document.getElementById(id);
const photos = [];
let activeCategory = null;
let homeButton = null;
let busy = false;

function selectCategory(id) {
  const category = categories[id];
  if (!category || activeCategory) return;
  activeCategory = id;
  homeButton = document.querySelector(`[onclick="selectCategory('${id}')"]`);
  $('report-icon').className = `circle ${category.icon}`;
  $('report-icon').replaceChildren(document.querySelector(`.categories .${category.icon} svg`).cloneNode(true));
  $('report-title').textContent = category.es;
  $('report-view').style.setProperty('--category-color', `var(${category.color})`);
  $('app-status').hidden = true;
  $('home').hidden = true;
  $('report-view').hidden = false;
  window.scrollTo(0, 0);
  $('report-title').focus({ preventScroll: true });
}

function renderPhotos() {
  $('photo-list').replaceChildren();
  photos.forEach((photo, index) => {
    const li = document.createElement('li');
    const image = document.createElement('img');
    image.src = photo.url;
    image.alt = `Foto ${index + 1}`;
    const previewNote = document.createElement('p');
    previewNote.className = 'preview-note';
    previewNote.hidden = true;
    previewNote.textContent = 'Vista previa no disponible. La foto se conserva para adjuntarla.';
    image.addEventListener('error', () => { previewNote.hidden = false; });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-photo';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Eliminar foto ${index + 1}`);
    remove.addEventListener('click', () => {
      URL.revokeObjectURL(photo.url);
      photos.splice(index, 1);
      $('photo-message').textContent = '';
      renderPhotos();
      const next = $('photo-list').querySelectorAll('button');
      (next[Math.min(index, next.length - 1)] || $('photos-input')).focus();
    });
    li.append(image, remove, previewNote);
    $('photo-list').append(li);
  });
  $('photo-count').textContent = `Fotos ${photos.length} / ${maxPhotos}`;
  for (const id of ['camera-input', 'photos-input']) $(id).disabled = photos.length >= maxPhotos;
}

function addPhotos(event) {
  const input = event.target;
  const messages = [];
  for (const file of input.files) {
    // iOS can return HEIC/HEIF images; retain original files for manual attachment.
    const isImage = file.type.startsWith('image/') || (!file.type && /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|tiff?)$/i.test(file.name));
    if (!isImage || !file.size) {
      messages.push('Selecciona un archivo de imagen válido.');
      continue;
    }
    if (photos.length >= maxPhotos) {
      messages.push('Puedes añadir un máximo de 5 fotos.');
      break;
    }
    photos.push({ file, url: URL.createObjectURL(file) });
  }
  input.value = '';
  $('photo-message').textContent = [...new Set(messages)].join(' ');
  $('form-error').textContent = '';
  renderPhotos();
}

function resetReport(message = '') {
  photos.forEach(photo => URL.revokeObjectURL(photo.url));
  photos.length = 0;
  activeCategory = null;
  busy = false;
  $('report-form').reset();
  $('form-error').textContent = '';
  $('photo-message').textContent = '';
  $('download-list').replaceChildren();
  $('send-report').disabled = false;
  $('cancel-report').disabled = false;
  renderPhotos();
  $('report-view').hidden = true;
  $('home').hidden = false;
  $('app-status').textContent = message;
  $('app-status').hidden = !message;
  window.scrollTo(0, 0);
  homeButton?.focus({ preventScroll: true });
}

function cancelReport() {
  if (busy) return;
  if ($('description').value.length || photos.length) $('cancel-dialog').showModal();
  else resetReport();
}

const pad = value => String(value).padStart(2, '0');
function prepareReport(now = new Date()) {
  // Device-local date/time; no persistence, counter or external service.
  // This requested second-resolution format cannot guarantee cross-device uniqueness.
  const reportId = `TF-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const category = categories[activeCategory];
  const description = $('description').value.trim() || 'Keine Beschreibung angegeben.';
  const photoText = photos.length === 0 ? 'Keine Fotos beigefügt.' : `${photos.length} ${photos.length === 1 ? 'Foto' : 'Fotos'} zum manuellen Anhängen.`;
  const body = [
    'TABERNA FLAMENCA – MELDUNG', '', 'Meldungsnummer:', reportId, '',
    'Kategorie:', category.de, '', 'Datum:', `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`, '',
    'Uhrzeit:', `${pad(now.getHours())}:${pad(now.getMinutes())}`, '',
    'Beschreibung:', description, '', 'Fotos:', photoText
  ].join('\n');
  return { reportId, subject: reportId, body, files: photos.map(photo => photo.file) };
}

function openMail(report) {
  // mailto opens the configured mail handler; it cannot attach files.
  const link = document.createElement('a');
  link.href = `mailto:${recipient}?subject=${encodeURIComponent(report.subject)}&body=${encodeURIComponent(report.body)}`;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.append(link);
  try { link.click(); } finally { link.remove(); }
}

const preparedMessage = 'La comunicación se ha preparado para enviar. Revisa el mensaje en tu aplicación de correo.';

$('report-form').addEventListener('submit', event => {
  event.preventDefault();
  if (busy || !activeCategory) return;
  if (!$('description').value.trim() && !photos.length) {
    $('form-error').textContent = 'Añade una descripción o al menos una foto.';
    $('description').focus();
    return;
  }
  $('form-error').textContent = '';
  busy = true;
  try {
    const report = prepareReport();
    openMail(report);
    if (photos.length) {
      // Keep camera files available until the user has saved/attached them.
      // This notice follows the mail launch; it never asks for a delivery method.
      $('download-list').replaceChildren();
      photos.forEach((photo, index) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = photo.url;
        link.download = photo.file.name || `foto-${index + 1}.jpg`;
        link.textContent = `Guardar foto ${index + 1}`;
        li.append(link);
        $('download-list').append(li);
      });
      $('delivery-dialog').showModal();
    } else {
      resetReport(preparedMessage);
    }
  } catch {
    $('form-error').textContent = 'No se ha podido abrir el correo. Comprueba que tienes una aplicación de correo configurada e inténtalo de nuevo.';
  } finally {
    busy = false;
  }
});

$('finish-photos').addEventListener('click', () => $('delivery-dialog').close());
$('delivery-dialog').addEventListener('close', () => resetReport(preparedMessage));
$('cancel-report').addEventListener('click', cancelReport);
$('keep-report').addEventListener('click', () => $('cancel-dialog').close());
$('discard-report').addEventListener('click', () => { $('cancel-dialog').close(); resetReport(); });
$('camera-input').addEventListener('change', addPhotos);
$('photos-input').addEventListener('change', addPhotos);
