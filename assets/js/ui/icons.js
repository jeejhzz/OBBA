/**
 * OBBA 아이콘 — Lucide 아이콘을 인라인 SVG로 내재화.
 * 아이콘 8개 때문에 웹폰트(Font Awesome ~150KB)를 받아오지 않기 위한 교체.
 *
 * Lucide Icons — ISC License, Copyright (c) 2026 Lucide Icons and Contributors
 * https://lucide.dev  (전문: assets/js/ui/LUCIDE-LICENSE.txt)
 */
window.OBBA = window.OBBA || {};

(function () {
  var PATHS = {
    'leaf': '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /> <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />',
    'shopping-bag': '<path d="M16 10a4 4 0 0 1-8 0" /> <path d="M3.103 6.034h17.794" /> <path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" />',
    'rotate-cw': '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /> <path d="M21 3v5h-5" />',
    'send': '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /> <path d="m21.854 2.147-10.94 10.939" />',
    'x': '<path d="M18 6 6 18" /> <path d="m6 6 12 12" />',
    'external-link': '<path d="M15 3h6v6" /> <path d="M10 14 21 3" /> <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />',
    'sparkles': '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /> <path d="M20 2v4" /> <path d="M22 4h-4" /> <circle cx="4" cy="20" r="2" />',
    'smile': '<path d="M15 10V9" /> <path d="M16.472 15a6 6 0 01-8.943 0" /> <path d="M9 10V9" /> <circle cx="12" cy="12" r="10" />',
    'share': '<path d="M12 2v13" /> <path d="m16 6-4-4-4 4" /> <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />',
    'plus': '<path d="M5 12h14" /> <path d="M12 5v14" />'
  };

  /**
   * @param {string} name  PATHS의 키
   * @param {string} [cls] svg에 붙일 클래스
   * @param {number} [stroke] 선 두께 (기본 2)
   */
  function icon(name, cls, stroke) {
    var d = PATHS[name];
    if (!d) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (stroke || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="' +
      (cls || 'w-4 h-4') + '">' + d + '</svg>';
  }

  /** 정적 HTML의 <span data-icon="leaf"> 를 인라인 SVG로 치환 */
  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      var name = el.getAttribute('data-icon');
      if (!PATHS[name]) return;
      el.innerHTML = icon(name, el.getAttribute('data-icon-class') || 'w-4 h-4');
      el.removeAttribute('data-icon');
    });
  }

  OBBA.icon = icon;
  OBBA.hydrateIcons = hydrate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hydrate(); });
  } else {
    hydrate();
  }
})();
