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
              'class="block text-center w-full py-2.5 bg-olive text-white text-[13px] font-bold rounded-lg hover:bg-[#8AA82A] transition-colors shadow-sm">' +
              OBBA.icon('external-link', 'w-3.5 h-3.5 inline-block align-[-2px] mr-1') + '올리브영에서 보기</a>' +
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

  OBBA.Render = {
    esc: esc,
    botBubble: botBubble,
    userBubble: userBubble,
    typingBubble: typingBubble,
    quickReplyButton: quickReplyButton,
    productCarousel: productCarousel,
    comparisonCard: comparisonCard
  };
})();
