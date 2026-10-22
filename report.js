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
let pendingDelivery = null;
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
    // iOS can return HEIC/HEIF images; retain original files for sharing.
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
  pendingDelivery = null;
  activeCategory = null;
  busy = false;
  $('report-form').reset();
  $('form-error').textContent = '';
  $('photo-message').textContent = '';
  $('delivery-error').textContent = '';
  $('download-list').replaceChildren();
  $('delivery-instructions').replaceChildren();
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
  const photoText = photos.length === 0 ? 'Keine Fotos beigefügt.' : `${photos.length} ${photos.length === 1 ? 'Foto' : 'Fotos'} beigefügt.`;
  const body = [
    'TABERNA FLAMENCA – MELDUNG', '', 'Meldungsnummer:', reportId, '',
    'Kategorie:', category.de, '', 'Datum:', `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`, '',
    'Uhrzeit:', `${pad(now.getHours())}:${pad(now.getMinutes())}`, '',
    'Beschreibung:', description, '', 'Fotos:', photoText
  ].join('\n');
  return { reportId, subject: `${reportId} – ${category.de}`, body, files: photos.map(photo => photo.file) };
}

function canShareFiles(files) {
  if (!files.length || !navigator.share || !navigator.canShare) return false;
  try { return navigator.canShare({ files }); } catch { return false; }
}

function showDelivery(report) {
  const nativeShare = canShareFiles(report.files);
  // Web Share has no recipient field and the chosen target controls title/text handling.
  pendingDelivery = { report, nativeShare };
  $('delivery-instructions').replaceChildren();
  const explanation = document.createElement('p');
  explanation.textContent = nativeShare
    ? 'Elige tu aplicación de correo en el menú de compartir. Introduce el destinatario indicado y comprueba el asunto, el texto y las fotos antes de enviar. Algunas aplicaciones no conservan todos los campos.'
    : report.files.length
      ? 'Este navegador no permite compartir estas fotos como archivos. Guarda cada foto con los enlaces siguientes y adjúntalas manualmente en el correo. «Abrir correo» prepara solo el destinatario, el asunto y el texto; no añade fotos.'
      : 'Se abrirá tu aplicación de correo con el destinatario, el asunto y el texto. Revisa el mensaje antes de enviarlo.';
  $('delivery-instructions').append(explanation);
  $('download-list').replaceChildren();
  if (!nativeShare) photos.forEach((photo, index) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.file.name || `foto-${index + 1}.jpg`;
    link.textContent = `Guardar foto ${index + 1}`;
    li.append(link);
    $('download-list').append(li);
  });
  $('delivery-continue').textContent = nativeShare ? 'Compartir' : 'Abrir correo';
  $('delivery-error').textContent = '';
  $('delivery-dialog').showModal();
}

$('report-form').addEventListener('submit', event => {
  event.preventDefault();
  if (busy || !activeCategory) return;
  if (!$('description').value.trim() && !photos.length) {
    $('form-error').textContent = 'Añade una descripción o al menos una foto.';
    $('description').focus();
    return;
  }
  $('form-error').textContent = '';
  showDelivery(prepareReport());
});

$('delivery-continue').addEventListener('click', async () => {
  if (busy || !pendingDelivery) return;
  const { report, nativeShare } = pendingDelivery;
  busy = true;
  $('delivery-continue').disabled = true;
  $('delivery-back').disabled = true;
  $('send-report').disabled = true;
  $('cancel-report').disabled = true;
  try {
    if (nativeShare) {
      // Called directly inside a user gesture, with the original File objects.
      await navigator.share({
        files: report.files,
        title: report.subject,
        text: `Empfänger: ${recipient}\nBetreff: ${report.subject}\n\n${report.body}`
      });
    } else {
      // mailto cannot attach images. The preceding dialog explains manual attachment.
      // Keep this document alive even when an external protocol has no handler.
      const mailLink = document.createElement('a');
      mailLink.href = `mailto:${recipient}?subject=${encodeURIComponent(report.subject)}&body=${encodeURIComponent(report.body)}`;
      mailLink.target = '_blank';
      mailLink.rel = 'noopener';
      document.body.append(mailLink);
      mailLink.click();
      mailLink.remove();
    }
    $('delivery-dialog').close();
    resetReport('La comunicación se ha preparado para enviar. Comprueba el correo y los archivos adjuntos en tu aplicación de correo.');
  } catch (error) {
    if (error.name === 'AbortError') {
      $('delivery-dialog').close();
      $('form-error').textContent = 'Se ha cancelado la opción de compartir. Tu comunicación sigue aquí.';
    } else {
      // Keep all inputs, including files, when the OS refuses the handoff.
      pendingDelivery.nativeShare = false;
      $('delivery-instructions').textContent = 'No se ha podido abrir el menú de compartir. Puedes volver e intentarlo de nuevo, o abrir el correo y adjuntar las fotos manualmente. Guarda primero las fotos:';
      $('download-list').replaceChildren();
      photos.forEach((photo, index) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = photo.url;
        a.download = photo.file.name || `foto-${index + 1}.jpg`;
        a.textContent = `Guardar foto ${index + 1}`;
        li.append(a);
        $('download-list').append(li);
      });
      $('delivery-continue').textContent = 'Abrir correo';
      $('delivery-error').textContent = 'El correo no incluirá fotos automáticamente.';
    }
  } finally {
    busy = false;
    $('delivery-continue').disabled = false;
    $('delivery-back').disabled = false;
    $('send-report').disabled = false;
    $('cancel-report').disabled = false;
  }
});

$('delivery-back').addEventListener('click', () => $('delivery-dialog').close());
$('delivery-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('delivery-dialog').addEventListener('close', () => { pendingDelivery = null; });
$('cancel-report').addEventListener('click', cancelReport);
$('keep-report').addEventListener('click', () => $('cancel-dialog').close());
$('discard-report').addEventListener('click', () => { $('cancel-dialog').close(); resetReport(); });
$('camera-input').addEventListener('change', addPhotos);
$('photos-input').addEventListener('change', addPhotos);
