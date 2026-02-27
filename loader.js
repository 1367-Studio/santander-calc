(function () {
  var script   = document.currentScript;
  var BASE_URL = 'https://1367-studio.github.io/santander-calc/';

  var lang     = script.dataset.lang     || 'fr';
  var total    = script.dataset.total    || '0';
  var primary  = script.dataset.primary  || '#e60000';
  var bg       = script.dataset.bg       || '#ffffff';
  var headerBg = script.dataset.headerBg || primary;
  var headerFg = script.dataset.headerFg || '#ffffff';
  var width    = script.dataset.width    || 'auto';

  var labels = {
    fr: "Voir l'échéancier",
    en: 'See schedule',
    nl: 'Schema bekijken',
    de: 'Plan anzeigen',
  };
  var btnText = script.dataset.btnText || labels[lang] || labels.fr;

  // ── Inline button ──────────────────────────────────────────────────────────
  var btn = document.createElement('button');
  btn.type        = 'button';
  btn.textContent = btnText;
  btn.style.cssText = [
    'display: inline-block',
    'background-color: ' + primary,
    'color: #fff',
    'border: none',
    'border-radius: 4px',
    'padding: 12px 24px',
    'font-size: 16px',
    'font-weight: 600',
    'line-height: 1.2',
    'cursor: pointer',
    'width: ' + width,
    'box-sizing: border-box',
  ].join('; ');

  // Insert right where the <script> tag is
  script.parentNode.insertBefore(btn, script.nextSibling);

  // ── Modal iframe (created on demand) ──────────────────────────────────────
  var iframe = null;

  function openModal() {
    if (iframe) return;

    var params = new URLSearchParams();
    params.set('total',     total);
    params.set('lang',      lang);
    params.set('primary',   primary);
    params.set('bg',        bg);
    params.set('headerBg',  headerBg);
    params.set('headerFg',  headerFg);
    params.set('autoopen',  'true');

    iframe = document.createElement('iframe');
    iframe.src               = BASE_URL + '?' + params.toString();
    iframe.allowTransparency = true;
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('frameborder', '0');
    iframe.style.cssText = [
      'position: fixed',
      'inset: 0',
      'width: 100%',
      'height: 100%',
      'border: none',
      'z-index: 2147483647',
      'background: transparent',
    ].join('; ');

    document.body.appendChild(iframe);

    window.addEventListener('message', onMessage);
  }

  function closeModal() {
    if (!iframe) return;
    window.removeEventListener('message', onMessage);
    document.body.removeChild(iframe);
    iframe = null;
  }

  function onMessage(e) {
    if (iframe && e.source === iframe.contentWindow && e.data === 'sr:close') {
      closeModal();
    }
  }

  btn.addEventListener('click', openModal);
})();
