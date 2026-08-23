/**
 * OBBA 로컬 저장소
 * 프로필(피부타입/예산/제형취향)과 장바구니를 localStorage에 보관한다.
 * 서버 없이도 "오빠가 나를 기억한다"는 경험을 만드는 최소 단위.
 */
window.OBBA = window.OBBA || {};

(function () {
  var PROFILE_KEY = 'obba.profile.v1';
  var CART_KEY = 'obba.cart.v1';

  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback; // 사파리 프라이빗 모드 등 저장소 접근 불가
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* 저장 실패해도 대화는 계속되어야 한다 */ }
  }

  var listeners = [];

  var Store = {
    /* ---------- 프로필 ---------- */
    getProfile: function () {
      return read(PROFILE_KEY, { skinType: null, budget: null, texturePref: null, updatedAt: null });
    },
    patchProfile: function (patch) {
      var next = Object.assign(Store.getProfile(), patch, { updatedAt: Date.now() });
      write(PROFILE_KEY, next);
      emit();
      return next;
    },
    clearProfile: function () {
      write(PROFILE_KEY, { skinType: null, budget: null, texturePref: null, updatedAt: null });
      emit();
    },

    /* ---------- 장바구니 ---------- */
    getCart: function () {
      var cart = read(CART_KEY, []);
      return Array.isArray(cart) ? cart : [];
    },
    addToCart: function (productId) {
      var cart = Store.getCart();
      var line = cart.find(function (l) { return l.id === productId; });
      if (line) { line.qty += 1; } else { cart.push({ id: productId, qty: 1 }); }
      write(CART_KEY, cart);
      emit();
      return cart;
    },
    setQty: function (productId, qty) {
      var cart = Store.getCart().map(function (l) {
        return l.id === productId ? { id: l.id, qty: qty } : l;
      }).filter(function (l) { return l.qty > 0; });
      write(CART_KEY, cart);
      emit();
      return cart;
    },
    removeFromCart: function (productId) {
      return Store.setQty(productId, 0);
    },
    clearCart: function () {
      write(CART_KEY, []);
      emit();
    },
    cartCount: function () {
      return Store.getCart().reduce(function (sum, l) { return sum + l.qty; }, 0);
    },
    /** 장바구니 합계: 판매가 총합 / 정가 총합 / 절약액 */
    cartTotals: function () {
      return Store.getCart().reduce(function (acc, line) {
        var p = OBBA.byId(line.id);
        if (!p) return acc;
        acc.price += p.price * line.qty;
        acc.listPrice += p.listPrice * line.qty;
        acc.saved = acc.listPrice - acc.price;
        return acc;
      }, { price: 0, listPrice: 0, saved: 0 });
    },

    /* ---------- 변경 구독 ---------- */
    subscribe: function (fn) { listeners.push(fn); return function () {
      listeners = listeners.filter(function (l) { return l !== fn; });
    }; }
  };

  function emit() { listeners.forEach(function (fn) { fn(); }); }

  OBBA.Store = Store;
})();
