/**
 * 홈 화면에 추가(설치) 안내 + 서비스워커 등록.
 *
 * 왜 갈라지나
 *   안드로이드/크롬 : beforeinstallprompt 이벤트를 잡아 '추가하기' 버튼 한 번으로 설치된다.
 *   아이폰/사파리   : 그런 이벤트가 없다. 공유 → 홈 화면에 추가 를 사람이 직접 눌러야 해서 안내만 띄운다.
 *
 * 이미 설치했거나, 아티팩트처럼 iframe 안에서 열렸으면 아무것도 하지 않는다.
 */
(function () {
  var DISMISS_KEY = 'obba.installHint.dismissed';

  function readDismissed() {
    try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }
  function markDismissed() {
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* 저장 못 해도 그만 */ }
  }

  var inIframe = (function () {
    try { return window.self !== window.top; } catch (e) { return true; }
  })();

  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    // 아이패드는 데스크톱 사파리로 위장하므로 터치 지원 여부로 구분
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

  /* ---------- 서비스워커: 오프라인에서도 열리게 ---------- */
  if ('serviceWorker' in navigator && !inIframe && window.location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        /* 등록 실패해도 앱은 그대로 동작한다 */
      });
    });
  }

  if (inIframe || isStandalone || readDismissed()) return;

  var host = document.getElementById('install-hint');
  if (!host) return;

  var deferredPrompt = null;

  function show(html) {
    host.innerHTML = html;
    host.classList.remove('hidden');
  }

  function hide() {
    host.classList.add('hidden');
    host.innerHTML = '';
  }

  var closeBtn = '<button type="button" data-action="install-dismiss" aria-label="안내 닫기" ' +
    'class="shrink-0 w-7 h-7 rounded-full text-gray-400 hover:text-gray-600 flex items-center justify-center">' +
    OBBA.icon('x', 'w-4 h-4') + '</button>';

  function androidHint() {
    show(
      '<div class="flex items-center gap-2 px-4 py-2.5 bg-olive-soft border-t border-olive/20">' +
        '<span class="text-olive shrink-0">' + OBBA.icon('plus', 'w-4 h-4') + '</span>' +
        '<p class="flex-1 text-[12px] text-gray-700 leading-snug">홈 화면에 추가하면 앱처럼 바로 열려요</p>' +
        '<button type="button" data-action="install-go" ' +
          'class="shrink-0 px-3 py-1.5 bg-olive text-white text-[12px] font-bold rounded-full">추가하기</button>' +
        closeBtn +
      '</div>');
  }

  function iosHint() {
    show(
      '<div class="flex items-center gap-2 px-4 py-2.5 bg-olive-soft border-t border-olive/20">' +
        '<span class="text-olive shrink-0">' + OBBA.icon('share', 'w-4 h-4') + '</span>' +
        '<p class="flex-1 text-[12px] text-gray-700 leading-snug">' +
          '아래 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요</p>' +
        closeBtn +
      '</div>');
  }

  // 안드로이드/크롬: 설치 가능해지는 순간 이벤트가 온다
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    androidHint();
  });

  // 아이폰: 이벤트가 없으니 조금 기다렸다가 안내만 (첫 화면을 가리지 않게)
  if (isIOS) {
    setTimeout(function () {
      if (!deferredPrompt && !readDismissed()) iosHint();
    }, 4000);
  }

  window.addEventListener('appinstalled', function () {
    markDismissed();
    hide();
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');

    if (action === 'install-dismiss') {
      markDismissed();
      hide();
      return;
    }
    if (action === 'install-go' && deferredPrompt) {
      var prompt = deferredPrompt;
      deferredPrompt = null;
      hide();
      prompt.prompt();
      prompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') markDismissed();
      });
    }
  });
})();
