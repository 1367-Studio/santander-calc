(function () {
  var script   = document.currentScript;
  var BASE_URL = 'https://1367-studio.github.io/santander-calc/';

  // Read config from data-* attributes on the <script> tag
  var params = new URLSearchParams();
  params.set('total',    script.dataset.total    || '0');
  params.set('lang',     script.dataset.lang     || 'fr');
  if (script.dataset.primary)   params.set('primary',   script.dataset.primary);
  if (script.dataset.bg)        params.set('bg',        script.dataset.bg);
  if (script.dataset.headerBg)  params.set('headerBg',  script.dataset.headerBg);
  if (script.dataset.headerFg)  params.set('headerFg',  script.dataset.headerFg);
  if (script.dataset.btnText)   params.set('btnText',   script.dataset.btnText);

  var position = (script.dataset.position || 'bottom-right').toLowerCase();
  var isBottom = !position.includes('top');
  var isRight  = !position.includes('left');

  // Button dimensions
  var BTN_W = script.dataset.width  || '220px';
  var BTN_H = script.dataset.height || '50px';

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src              = BASE_URL + '?' + params.toString();
  iframe.allowTransparency = true;
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('frameborder', '0');
  iframe.style.cssText = [
    'position: fixed',
    isBottom ? 'bottom: 20px' : 'top: 20px',
    isRight  ? 'right: 20px'  : 'left: 20px',
    'width: '  + BTN_W,
    'height: ' + BTN_H,
    'border: none',
    'z-index: 2147483647',
    'background: transparent',
    'overflow: hidden',
    'transition: none',
  ].join('; ');

  function expand() {
    iframe.style.top    = '0';
    iframe.style.left   = '0';
    iframe.style.right  = '0';
    iframe.style.bottom = '0';
    iframe.style.width  = '100%';
    iframe.style.height = '100%';
  }

  function shrink() {
    iframe.style.top    = isBottom ? ''      : '20px';
    iframe.style.bottom = isBottom ? '20px'  : '';
    iframe.style.left   = isRight  ? ''      : '20px';
    iframe.style.right  = isRight  ? '20px'  : '';
    iframe.style.width  = BTN_W;
    iframe.style.height = BTN_H;
  }

  window.addEventListener('message', function (e) {
    if (e.source !== iframe.contentWindow) return;
    if (e.data === 'sr:open')  expand();
    if (e.data === 'sr:close') shrink();
  });

  // Inject after DOM is ready
  if (document.body) {
    document.body.appendChild(iframe);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(iframe);
    });
  }
})();
