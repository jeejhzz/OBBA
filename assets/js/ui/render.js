/**
 * OBBA 렌더링 레이어 — 문자열 HTML 빌더 모음.
 * 규칙 1: 사용자가 입력한 값은 반드시 esc()를 거친다. (프로토타입의 innerHTML 주입 취약점 수정)
 * 규칙 2: 인라인 onclick을 쓰지 않는다. data-action 속성 + 위임 리스너로 처리한다.
 */
window.OBBA = window.OBBA || {};

(function () {
  var E = OBBA.Engine;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var AVATAR = '<div class="w-8 h-8 rounded-full bg-olive flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm" aria-hidden="true">OB</div>';

  /** 오빠 말풍선. html은 시나리오 작성자가 쓴 신뢰 가능한 마크업이다. */
  function botBubble(html) {
    return '<div class="flex items-start gap-2 max-w-[92%] message-enter">' + AVATAR +
      '<div class="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-gray-800 text-sm leading-relaxed">' +
      html + '</div></div>';
  }

  /** 사용자 말풍선. 입력값은 항상 이스케이프. */
  function userBubble(text) {
    return '<div class="flex items-start justify-end gap-2 max-w-[90%] ml-auto message-enter mb-1 mt-1">' +
      '<div class="bg-olive px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm text-white text-sm font-medium">' +
      esc(text) + '</div></div>';
  }

  function typingBubble(id) {
    return '<div id="' + esc(id) + '" class="flex items-start gap-2 max-w-[85%] message-enter">' + AVATAR +
      '<div class="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-1 h-10">' +
      '<div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>' +
      '<div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>' +
      '<div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div></div></div>';
  }

  function quickReplyButton(item) {
    return '<button type="button" data-action="qr" data-id="' + esc(item.id) + '" ' +
      'class="horizontal-scroll-item whitespace-nowrap px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 ' +
      'hover:bg-gray-50 hover:border-olive hover:text-olive transition-colors shadow-sm font-medium">' +
      esc(item.label) + '</button>';
  }

  function fitChips(product) {
    var reasons = (product.fit && product.fit.reasons) || [];
    if (!reasons.length) return '';
    return '<div class="flex flex-wrap gap-1 mb-2">' + reasons.slice(0, 3).map(function (r) {
      return '<span class="fit-chip">' + esc(r) + '</span>';
    }).join('') + '</div>';
  }

  function productCard(p) {
    var step = E.stepMeta(p.step);
    return '' +
      '<article class="horizontal-scroll-item product-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">' +
        '<div class="h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-b border-gray-100 relative">' +
          '<span class="absolute top-2 left-2 text-[10px] text-gray-400 font-bold tracking-wider">' + esc(step.label) + '</span>' +
          (p.curated ? '<span class="absolute top-2 right-2 text-[10px] font-bold text-white bg-olive px-1.5 py-0.5 rounded">오빠 픽</span>' : '') +
          '<h3 class="text-lg font-black text-slate-700 tracking-tight px-3 text-center">' + esc(p.brand.toUpperCase()) + '</h3>' +
        '</div>' +
        '<div class="p-3.5 flex flex-col flex-1">' +
          '<p class="text-[11px] text-gray-500 font-bold mb-1">' + esc(p.brand) + '</p>' +
          '<h4 class="text-[13px] font-bold text-gray-800 leading-snug line-clamp-2 h-9 mb-2">' + esc(p.name) + '</h4>' +
          fitChips(p) +
          '<p class="text-[11px] text-gray-600 leading-snug mb-2">' + esc(p.point) + '</p>' +
          '<div class="flex flex-wrap gap-1 mb-3">' +
            p.tags.map(function (t) {
              return '<span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">' + esc(t) + '</span>';
            }).join('') +
          '</div>' +
          '<div class="mt-auto pt-2 border-t border-gray-100">' +
            '<div class="flex items-baseline gap-1.5 mb-2.5">' +
              (p.discountRate ? '<span class="text-red-500 font-bold text-sm">' + p.discountRate + '%</span>' : '') +
              '<span class="text-gray-900 font-bold text-base">' + esc(p.priceLabel) + '</span>' +
              (p.discountRate ? '<span class="text-gray-400 text-[10px] line-through ml-0.5">' + esc(p.listPriceLabel) + '</span>' : '') +
            '</div>' +
            '<a href="' + esc(E.oliveyoungUrl(p)) + '" target="_blank" rel="noopener noreferrer" ' +
              'class="block text-center w-full py-2 bg-olive text-white text-[13px] font-bold rounded-lg hover:bg-[#8AA82A] transition-colors shadow-sm mb-2">' +
              OBBA.icon('external-link', 'w-3.5 h-3.5 inline-block align-[-2px] mr-1') + '올리브영에서 보기</a>' +
            '<button type="button" data-action="add-cart" data-id="' + esc(p.id) + '" ' +
              'class="w-full py-2 bg-gray-900 text-white text-[13px] font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-sm">' +
              '장바구니 담기</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function productCarousel(rec, carouselId) {
    var note = rec.note
      ? '<p class="pl-10 pr-4 mt-2 text-[11px] text-gray-500">' +
          OBBA.icon('sparkles', 'w-3.5 h-3.5 inline-block align-[-2px] mr-1 text-olive') +
          esc(rec.note) + '</p>'
      : '';
    return note +
      '<div class="w-full mt-2 pl-10 pr-4 message-enter overflow-hidden">' +
        '<div id="' + esc(carouselId) + '" class="horizontal-scroll-container hide-scrollbar" role="list">' +
          rec.products.map(productCard).join('') +
        '</div>' +
      '</div>';
  }

  function comparisonCard(products, profile) {
    var list = products.slice(0, 4);
    var cells = list.map(function (p) {
      return '<div class="bg-gray-50 p-2 rounded-lg text-center flex flex-col border border-gray-100">' +
        '<div class="text-[10px] text-gray-500 font-bold">' + esc(p.brand) + '</div>' +
        '<div class="text-[11px] font-bold text-gray-800 line-clamp-2 h-8 mb-1">' + esc(p.name) + '</div>' +
        '<div class="text-[11px] font-bold text-gray-900 mb-2">' + esc(p.priceLabel) + '</div>' +
        '<div class="bg-white border border-gray-200 rounded p-1.5 mb-1 flex-1">' +
          '<span class="text-[10px] font-bold text-olive block mb-0.5">이런 분께 딱!</span>' +
          '<span class="text-[11px] text-gray-700 leading-tight">' + esc(p.target) + '</span></div>' +
        '<div class="bg-white border border-gray-200 rounded p-1.5 mb-1 flex-1">' +
          '<span class="text-[10px] font-bold text-blue-500 block mb-0.5">핵심 성분</span>' +
          '<span class="text-[11px] text-gray-700 leading-tight">' + esc((p.keyIngredients || []).join(', ')) + '</span></div>' +
        '<div class="bg-white border border-gray-200 rounded p-1.5 flex-1">' +
          '<span class="text-[10px] font-bold text-purple-500 block mb-0.5">제형</span>' +
          '<span class="text-[11px] text-gray-700 leading-tight">' + esc({ light: '가벼움', medium: '중간', rich: '쫀쫀함' }[p.texture] || '-') + '</span></div>' +
      '</div>';
    }).join('');

    return '<div class="flex items-start gap-2 max-w-[95%] message-enter mt-2">' + AVATAR +
      '<div class="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-200 w-full">' +
        '<p class="text-sm text-gray-800 font-bold mb-3 border-b pb-2">💡 오빠의 베스트셀러 팩트체크</p>' +
        '<div class="grid grid-cols-2 gap-2">' + cells + '</div>' +
        '<div class="mt-3 bg-olive-soft p-3 rounded-lg text-[13px] text-gray-800 leading-snug">' +
          E.verdict(products, profile) +
        '</div>' +
      '</div></div>';
  }

  function cartSheet() {
    var cart = OBBA.Store.getCart();
    var totals = OBBA.Store.cartTotals();
    var items = E.sortByRoutine(cart.map(function (l) {
      var p = OBBA.byId(l.id);
      return p ? Object.assign({}, p, { qty: l.qty }) : null;
    }).filter(Boolean));

    if (!items.length) {
      return '<div class="p-8 text-center text-gray-500 text-sm">' +
        '<span class="block text-gray-300 mb-3">' + OBBA.icon('smile', 'w-9 h-9 mx-auto') + '</span>' +
        '아직 담은 게 없어!<br>추천 카드에서 마음에 드는 걸 담아봐.</div>';
    }

    var rows = items.map(function (p) {
      var step = E.stepMeta(p.step);
      return '<li class="flex items-center gap-3 py-3 border-b border-gray-100">' +
        '<div class="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">' + esc(step.label) + '</div>' +
        '<div class="flex-1 min-w-0">' +
          '<p class="text-[11px] text-gray-500 font-bold">' + esc(p.brand) + '</p>' +
          '<p class="text-[12px] font-bold text-gray-800 line-clamp-2 leading-snug">' + esc(p.name) + '</p>' +
          '<p class="text-[12px] text-gray-900 font-bold mt-0.5">' + esc(E.formatWon(p.price * p.qty)) + '</p>' +
        '</div>' +
        '<div class="flex items-center gap-1.5 shrink-0">' +
          '<button type="button" data-action="cart-dec" data-id="' + esc(p.id) + '" aria-label="수량 줄이기" class="w-7 h-7 rounded-full border border-gray-200 text-gray-600 text-sm">−</button>' +
          '<span class="w-5 text-center text-sm font-bold">' + p.qty + '</span>' +
          '<button type="button" data-action="cart-inc" data-id="' + esc(p.id) + '" aria-label="수량 늘리기" class="w-7 h-7 rounded-full border border-gray-200 text-gray-600 text-sm">+</button>' +
        '</div></li>';
    }).join('');

    var searchAllUrl = 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=' +
      encodeURIComponent(items[0].searchQuery || items[0].name);

    return '<ul class="px-4 overflow-y-auto flex-1">' + rows + '</ul>' +
      '<div class="px-4 pt-3 pb-4 border-t border-gray-200 bg-white">' +
        '<div class="flex justify-between text-sm mb-1"><span class="text-gray-500">정가 합계</span>' +
          '<span class="text-gray-400 line-through">' + esc(E.formatWon(totals.listPrice)) + '</span></div>' +
        '<div class="flex justify-between text-base font-bold mb-1"><span>결제 예상</span>' +
          '<span class="text-gray-900">' + esc(E.formatWon(totals.price)) + '</span></div>' +
        '<div class="flex justify-between text-[12px] font-bold text-red-500 mb-3"><span>할인 절약</span>' +
          '<span>-' + esc(E.formatWon(totals.saved)) + '</span></div>' +
        '<a href="' + esc(searchAllUrl) + '" target="_blank" rel="noopener noreferrer" ' +
          'class="block text-center w-full py-3 bg-olive text-white text-sm font-bold rounded-xl mb-2">' +
          '올리브영에서 이어서 담기' + OBBA.icon('external-link', 'w-3.5 h-3.5 inline-block align-[-2px] ml-1') + '</a>' +
        '<div class="flex gap-2">' +
          '<button type="button" data-action="cart-copy" class="flex-1 py-2.5 bg-gray-100 text-gray-700 text-[13px] font-bold rounded-xl">쇼핑 리스트 복사</button>' +
          '<button type="button" data-action="cart-clear" class="py-2.5 px-4 bg-gray-100 text-gray-500 text-[13px] font-bold rounded-xl">비우기</button>' +
        '</div>' +
      '</div>';
  }

  /** 클립보드에 넣을 쇼핑 리스트 텍스트 (오프라인 매장에서 보기용) */
  function cartAsText() {
    var items = E.sortByRoutine(OBBA.Store.getCart().map(function (l) {
      var p = OBBA.byId(l.id);
      return p ? Object.assign({}, p, { qty: l.qty }) : null;
    }).filter(Boolean));
    var totals = OBBA.Store.cartTotals();
    var lines = items.map(function (p) {
      return '· [' + E.stepMeta(p.step).label + '] ' + p.brand + ' ' + p.name +
        (p.qty > 1 ? ' x' + p.qty : '') + ' — ' + E.formatWon(p.price * p.qty);
    });
    return ['🛒 OBBA 쇼핑 리스트'].concat(lines)
      .concat(['합계 ' + E.formatWon(totals.price) + ' (정가 대비 ' + E.formatWon(totals.saved) + ' 절약)'])
      .join('\n');
  }

  OBBA.Render = {
    esc: esc,
    botBubble: botBubble,
    userBubble: userBubble,
    typingBubble: typingBubble,
    quickReplyButton: quickReplyButton,
    productCarousel: productCarousel,
    comparisonCard: comparisonCard,
    cartSheet: cartSheet,
    cartAsText: cartAsText
  };
})();
