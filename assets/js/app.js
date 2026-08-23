/**
 * OBBA 대화 컨트롤러
 * 흐름: (피부타입) → 상황 → 고민 → 추천 → 비교/취향 반영 → 재추천
 * 모든 클릭은 data-action 위임 리스너 한 곳에서 처리한다.
 */
(function () {
  var R = OBBA.Render;
  var E = OBBA.Engine;
  var Store = OBBA.Store;

  var chat = document.getElementById('chat-container');
  var quickReplies = document.getElementById('quick-reply-container');
  var input = document.getElementById('user-input');
  var sendBtn = document.getElementById('send-btn');
  var cartBadge = document.getElementById('cart-badge');
  var cartSheet = document.getElementById('cart-sheet');
  var cartBody = document.getElementById('cart-sheet-body');
  var backdrop = document.getElementById('sheet-backdrop');
  var profileChip = document.getElementById('profile-chip');

  var state = { step: 'situation', situationId: null, concernId: null, lastRec: null };
  var quickReplyItems = [];
  var quickReplyHandler = null;

  /* ---------------- 기본 유틸 ---------------- */

  function scrollToBottom() {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }

  function append(html) {
    chat.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
  }

  function typing(ms) {
    var id = 'typing-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    append(R.typingBubble(id));
    return new Promise(function (resolve) {
      setTimeout(function () {
        var el = document.getElementById(id);
        if (el) el.remove();
        resolve();
      }, ms || 600);
    });
  }

  function botSay(html, ms) {
    clearQuickReplies();
    return typing(ms).then(function () { append(R.botBubble(html)); });
  }

  function userSay(text) { append(R.userBubble(text)); }

  function clearQuickReplies() {
    quickReplies.innerHTML = '';
    quickReplyItems = [];
    quickReplyHandler = null;
  }

  function setQuickReplies(items, handler) {
    quickReplyItems = items;
    quickReplyHandler = handler;
    quickReplies.innerHTML = items.map(R.quickReplyButton).join('');
    quickReplies.scrollLeft = 0;
  }

  function profileLabel() {
    var st = E.skinTypeOf(Store.getProfile().skinType);
    return st && st.id !== 'unknown' ? st.label : null;
  }

  function syncChrome() {
    var count = Store.cartCount();
    cartBadge.textContent = count;
    cartBadge.classList.toggle('hidden', count === 0);
    var label = profileLabel();
    profileChip.textContent = label ? label + ' 프로필' : '피부타입 설정';
    if (cartSheet.classList.contains('open')) cartBody.innerHTML = R.cartSheet();
  }

  /* ---------------- 대화 흐름 ---------------- */

  function start() {
    chat.innerHTML = '';
    state = { step: 'situation', situationId: null, concernId: null, lastRec: null };
    var label = profileLabel();

    var greeting = '안녕! 올리브영 뷰티 어시스턴트 <b>OBBA(오빠)</b>야 😎<br>' +
      '수만 개 제품 중에 너한테 딱 맞는 것만 골라줄게.';

    botSay(greeting, 500).then(function () {
      if (!Store.getProfile().skinType) return askSkinType();
      return botSay('지난번에 알려준 <b>' + R.esc(label) + '</b> 프로필로 골라줄게. (바꾸려면 위의 프로필 버튼을 눌러)<br>' +
        '먼저 <b>어떤 상황</b>을 준비하고 있어?', 500).then(function () {
        state.step = 'situation';
        setQuickReplies(OBBA.SITUATIONS, onSituation);
      });
    });
  }

  function askSkinType() {
    state.step = 'skinType';
    return botSay('제대로 골라주려면 <b>네 피부타입</b>부터 알아야 해. 어느 쪽에 가까워?', 500)
      .then(function () { setQuickReplies(OBBA.SKIN_TYPES, onSkinType); });
  }

  function onSkinType(item, opts) {
    if (!opts || !opts.silent) userSay(item.label);
    Store.patchProfile({ skinType: item.id, texturePref: null });
    syncChrome();
    var st = E.skinTypeOf(item.id);
    var msg = st && st.id !== 'unknown'
      ? '오케이, ' + R.esc(st.label.replace(/^\S+\s/, '')) + ' 기억했어. ' + R.esc(st.hint) + '.<br>이제 <b>어떤 상황</b>을 준비하고 있는지 알려줘!'
      : '괜찮아, 쓰면서 같이 찾아보자.<br>먼저 <b>어떤 상황</b>을 준비하고 있어?';
    return botSay(msg, 700).then(function () {
      state.step = 'situation';
      setQuickReplies(OBBA.SITUATIONS, onSituation);
    });
  }

  function onSituation(item, opts) {
    if (!opts || !opts.silent) userSay(item.label);
    state.situationId = item.id;
    state.step = 'concern';
    return botSay(R.esc(item.reply) + '<br>그럼 그 상황에서 <b>제일 신경 쓰이는 피부 고민</b> 딱 하나만 골라봐.', 700)
      .then(function () { setQuickReplies(OBBA.CONCERNS, onConcern); });
  }

  function onConcern(item, opts) {
    if (!opts || !opts.silent) userSay(item.label);
    state.concernId = item.id;
    return runRecommendation();
  }

  function runRecommendation(prefixMessage) {
    state.step = 'result';
    var intro = prefixMessage || '잠깐만! 오빠가 올리브영 싹 다 뒤져보는 중... 🔍👀';
    return botSay(intro, 500)
      .then(function () { return typing(900); })
      .then(function () {
        var rec = E.recommend({
          situationId: state.situationId,
          concernId: state.concernId,
          profile: Store.getProfile()
        });
        state.lastRec = rec;

        append(R.botBubble(rec.comment));
        var carouselId = 'cards-' + Date.now();
        append(R.productCarousel(rec, carouselId));
        enableDragScroll(carouselId);

        var actions = [];
        if (rec.products.length >= 2) actions.push({ id: 'compare', label: '🤔 뭐가 더 좋을까? (비교)' });
        actions.push({ id: 'cart', label: '🛒 장바구니 보기' });
        actions.push({ id: 'change-skin', label: '🧴 피부타입 바꾸기' });
        actions.push({ id: 'budget', label: '💰 예산으로 다시 고르기' });
        actions.push({ id: 'reset', label: '🔄 다른 고민 상담하기' });
        setQuickReplies(actions, onResultAction);
      });
  }

  function onResultAction(item) {
    if (item.id === 'compare') { userSay(item.label); return showComparison(); }
    if (item.id === 'cart') { openCart(); return; }
    if (item.id === 'change-skin') { userSay(item.label); return askSkinType(); }
    if (item.id === 'budget') {
      userSay(item.label);
      return botSay('예산은 어느 정도로 볼까?', 400).then(function () {
        setQuickReplies(OBBA.BUDGETS, onBudget);
      });
    }
    userSay(item.label);
    return start();
  }

  function onBudget(item) {
    userSay(item.label);
    Store.patchProfile({ budget: item.id });
    syncChrome();
    return runRecommendation('오케이, ' + R.esc(item.short) + ' 기준으로 다시 골라볼게!');
  }

  function showComparison() {
    var rec = state.lastRec;
    if (!rec || rec.products.length < 2) {
      return botSay('지금은 하나만 추천해서 비교할 게 없네! 다른 고민도 말해줄래?', 400)
        .then(function () { setQuickReplies([{ id: 'reset', label: '🔄 처음부터 다시하기' }], function () { start(); }); });
    }
    return typing(800).then(function () {
      append(R.comparisonCard(rec.products, Store.getProfile()));
      return botSay('참고로 너는 평소에 어떤 제형이 좋아? 알려주면 다음 추천부터 바로 반영할게.', 900);
    }).then(function () {
      setQuickReplies([
        { id: 'light', label: '💦 가벼운 수분타입' },
        { id: 'rich', label: '🍯 쫀쫀한 영양타입' },
        { id: 'cart', label: '🛒 장바구니 보기' },
        { id: 'reset', label: '🔄 다른 고민 상담하기' }
      ], onTexturePick);
    });
  }

  function onTexturePick(item) {
    if (item.id === 'cart') { openCart(); return; }
    userSay(item.label);
    if (item.id === 'reset') return start();
    Store.patchProfile({ texturePref: item.id });
    syncChrome();
    return runRecommendation('취향 반영 완료! ' + R.esc(item.label.replace(/^\S+\s/, '')) + ' 기준으로 순서 다시 잡아볼게.');
  }

  /* ---------------- 자연어 입력 ---------------- */

  function processInput() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    userSay(text);
    clearQuickReplies();

    if (text.indexOf('장바구니') !== -1 || text.indexOf('카트') !== -1) { openCart(); return; }

    var parsed = E.parse(text);
    var profilePatch = {};
    if (parsed.skinTypeId) profilePatch.skinType = parsed.skinTypeId;
    if (parsed.budgetId) profilePatch.budget = parsed.budgetId;
    if (Object.keys(profilePatch).length) {
      Store.patchProfile(profilePatch);
      syncChrome();
    }

    if (parsed.situationId) state.situationId = parsed.situationId;
    if (parsed.concernId) state.concernId = parsed.concernId;

    // 상황과 고민이 모두 확보되면 곧장 추천으로 점프
    if (state.situationId && state.concernId) {
      var known = [];
      if (parsed.skinTypeId) known.push(E.skinTypeOf(parsed.skinTypeId).label.replace(/^\S+\s/, ''));
      if (parsed.budgetId) known.push(E.budgetOf(parsed.budgetId).short);
      var intro = known.length
        ? R.esc(known.join(' · ')) + ' 체크했어. 바로 골라볼게!'
        : '알겠어, 바로 골라볼게!';
      runRecommendation(intro);
      return;
    }

    if (state.step === 'result' && Object.keys(profilePatch).length) {
      runRecommendation('프로필 업데이트했어. 다시 골라볼게!');
      return;
    }

    if (state.step === 'result' && (text.indexOf('비교') !== -1 || text.indexOf('차이') !== -1)) {
      showComparison();
      return;
    }

    if (!state.situationId) {
      botSay('그 상황은 오빠가 아직 공부 중이야 🥲<br>비슷한 걸로 하나만 골라줄래?', 500)
        .then(function () {
          state.step = 'situation';
          setQuickReplies(OBBA.SITUATIONS, onSituation);
        });
      return;
    }

    botSay('그 고민은 조금 더 연구해봐야겠는걸? 🤔<br>일단 제일 신경 쓰이는 건 뭐야?', 500)
      .then(function () {
        state.step = 'concern';
        setQuickReplies(OBBA.CONCERNS, onConcern);
      });
  }

  /* ---------------- 장바구니 시트 ---------------- */

  function openCart() {
    cartBody.innerHTML = R.cartSheet();
    cartSheet.classList.add('open');
    backdrop.classList.add('open');
    cartSheet.setAttribute('aria-hidden', 'false');
  }

  function closeCart() {
    cartSheet.classList.remove('open');
    backdrop.classList.remove('open');
    cartSheet.setAttribute('aria-hidden', 'true');
  }

  function copyCart() {
    var text = R.cartAsText();
    var done = function () {
      var btn = cartBody.querySelector('[data-action="cart-copy"]');
      if (!btn) return;
      var original = btn.textContent;
      btn.textContent = '복사 완료!';
      setTimeout(function () { btn.textContent = original; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* 무시 */ }
      document.body.removeChild(ta);
      done();
    }
  }

  /* ---------------- 이벤트 위임 ---------------- */

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');

    if (action === 'qr') {
      var item = quickReplyItems.find(function (i) { return i.id === id; });
      if (item && quickReplyHandler) {
        var handler = quickReplyHandler;
        clearQuickReplies();
        handler(item);
      }
      return;
    }
    if (action === 'add-cart') {
      Store.addToCart(id);
      syncChrome();
      el.textContent = '담았어! 🛒';
      el.classList.add('bg-olive');
      setTimeout(function () {
        el.textContent = '장바구니 담기';
        el.classList.remove('bg-olive');
      }, 1200);
      return;
    }
    if (action === 'cart-open') { openCart(); return; }
    if (action === 'cart-close') { closeCart(); return; }
    if (action === 'cart-inc') { Store.addToCart(id); syncChrome(); return; }
    if (action === 'cart-dec') {
      var line = Store.getCart().find(function (l) { return l.id === id; });
      Store.setQty(id, line ? line.qty - 1 : 0);
      syncChrome();
      return;
    }
    if (action === 'cart-clear') { Store.clearCart(); syncChrome(); return; }
    if (action === 'cart-copy') { copyCart(); return; }
    if (action === 'edit-profile') { closeCart(); askSkinType(); return; }
    if (action === 'restart') { closeCart(); start(); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cartSheet.classList.contains('open')) closeCart();
  });

  sendBtn.addEventListener('click', processInput);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') processInput();
  });

  /* 데스크톱에서 카드 캐러셀 드래그 스크롤 */
  function enableDragScroll(containerId) {
    var slider = document.getElementById(containerId);
    if (!slider) return;
    var isDown = false, startX = 0, scrollLeft = 0;
    slider.addEventListener('mousedown', function (e) {
      isDown = true;
      slider.classList.add('dragging');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    ['mouseleave', 'mouseup'].forEach(function (evt) {
      slider.addEventListener(evt, function () {
        isDown = false;
        slider.classList.remove('dragging');
      });
    });
    slider.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      slider.scrollLeft = scrollLeft - ((e.pageX - slider.offsetLeft) - startX) * 1.4;
    });
  }

  Store.subscribe(syncChrome);
  syncChrome();
  start();
})();
