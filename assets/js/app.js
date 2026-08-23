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

    // 고민을 이미 말했다면(자연어로 먼저 얘기한 경우) 또 묻지 않고 바로 추천한다
    if (state.concernId) {
      return runRecommendation(R.esc(item.reply) + ' 그럼 바로 골라볼게!');
    }

    state.step = 'concern';
    return botSay(R.esc(item.reply) + '<br>그럼 그 상황에서 <b>제일 신경 쓰이는 피부 고민</b> 딱 하나만 골라봐.', 700)
      .then(function () { setQuickReplies(OBBA.CONCERNS, onConcern); });
  }

  function onConcern(item, opts) {
    if (!opts || !opts.silent) userSay(item.label);
    state.concernId = item.id;

    if (!state.situationId) {
      state.step = 'situation';
      return botSay('오케이. 그럼 <b>언제 쓸 건지</b>만 알려주면 바로 골라줄게!', 600)
        .then(function () { setQuickReplies(OBBA.SITUATIONS, onSituation); });
    }

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

  /** 이번 입력에서 프로필로 새로 반영된 내용을 사람 말로 (없으면 빈 문자열) */
  function ackProfile(parsed) {
    var bits = [];
    if (parsed.skinTypeId) bits.push(E.skinTypeOf(parsed.skinTypeId).label.replace(/^\S+\s/, ''));
    if (parsed.budgetId) bits.push(E.budgetOf(parsed.budgetId).short);
    return bits.length ? R.esc(bits.join(' · ')) + ' 체크했어.' : '';
  }

  function labelOf(list, id) {
    var found = list.find(function (i) { return i.id === id; });
    return found ? found.label.replace(/^\S+\s/, '') : '';
  }

  function processInput() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    userSay(text);
    clearQuickReplies();

    if (text.indexOf('장바구니') !== -1 || text.indexOf('카트') !== -1) { openCart(); return; }

    var parsed = E.parse(text);

    // 피부타입·예산은 어느 단계에서 말하든 프로필에 반영한다
    var profilePatch = {};
    if (parsed.skinTypeId) profilePatch.skinType = parsed.skinTypeId;
    if (parsed.budgetId) profilePatch.budget = parsed.budgetId;
    var profileChanged = Object.keys(profilePatch).length > 0;
    if (profileChanged) {
      Store.patchProfile(profilePatch);
      syncChrome();
    }

    if (parsed.situationId) state.situationId = parsed.situationId;
    if (parsed.concernId) state.concernId = parsed.concernId;

    var ack = ackProfile(parsed);

    // 1) 상황과 고민이 다 모였으면 바로 추천
    if (state.situationId && state.concernId && parsed.understood) {
      runRecommendation(ack ? ack + ' 바로 골라볼게!' : '알겠어, 바로 골라볼게!');
      return;
    }

    // 2) 고민만 알아들었다 → 상황 하나만 더 물어본다
    if (state.concernId && !state.situationId) {
      var concernName = labelOf(OBBA.CONCERNS, state.concernId);
      botSay('<b>' + R.esc(concernName) + '</b> 얘기구나, 알겠어. ' + (ack ? ack + ' ' : '') +
        '<br>언제 쓸 건지만 알려주면 바로 골라줄게!', 600)
        .then(function () {
          state.step = 'situation';
          setQuickReplies(OBBA.SITUATIONS, onSituation);
        });
      return;
    }

    // 3) 상황만 알아들었다 → 고민 하나만 더 물어본다
    if (state.situationId && !state.concernId) {
      var situation = OBBA.SITUATIONS.find(function (s) { return s.id === state.situationId; });
      botSay(R.esc(situation ? situation.reply : '') + (ack ? ' ' + ack : '') +
        '<br>그럼 <b>제일 신경 쓰이는 피부 고민</b> 하나만 골라봐.', 600)
        .then(function () {
          state.step = 'concern';
          setQuickReplies(OBBA.CONCERNS, onConcern);
        });
      return;
    }

    // 4) 추천을 이미 받은 상태에서 비교를 요청
    if (state.step === 'result' && (text.indexOf('비교') !== -1 || text.indexOf('차이') !== -1)) {
      showComparison();
      return;
    }

    // 5) 피부타입·예산만 말한 경우
    if (profileChanged) {
      if (state.step === 'result' && state.situationId && state.concernId) {
        runRecommendation(ack + ' 그 기준으로 다시 골라볼게!');
        return;
      }
      var next = state.step === 'concern' ? '고민' : '상황';
      botSay(ack + ' 기억해뒀어.<br>이제 어떤 <b>' + next + '</b>인지 알려줘!', 600)
        .then(function () {
          if (state.step === 'concern') setQuickReplies(OBBA.CONCERNS, onConcern);
          else { state.step = 'situation'; setQuickReplies(OBBA.SITUATIONS, onSituation); }
        });
      return;
    }

    // 6) 하나도 못 알아들었다 — 무엇을 말하면 되는지 예시로 알려준다
    var askConcern = Boolean(state.situationId);
    botSay('음, 그 말은 아직 못 알아듣겠어 😅<br>' +
      '<b>"여행 갈 때 트러블"</b> 처럼 말해주면 딱 알아들어.<br>아니면 아래에서 골라줘!', 600)
      .then(function () {
        if (askConcern) {
          state.step = 'concern';
          setQuickReplies(OBBA.CONCERNS, onConcern);
        } else {
          state.step = 'situation';
          setQuickReplies(OBBA.SITUATIONS, onSituation);
        }
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
