/**
 * OBBA 프로필 저장소
 * 피부타입·예산·제형 취향을 localStorage 에 보관한다.
 * 서버 없이도 "오빠가 나를 기억한다"는 경험을 만드는 최소 단위.
 */
window.OBBA = window.OBBA || {};

(function () {
  var PROFILE_KEY = 'obba.profile.v1';
  var EMPTY = { skinType: null, budget: null, texturePref: null, updatedAt: null };

  function read() {
    try {
      var raw = window.localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : Object.assign({}, EMPTY);
    } catch (e) {
      return Object.assign({}, EMPTY);   // 사파리 프라이빗 모드 등 저장소 접근 불가
    }
  }

  function write(value) {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(value));
    } catch (e) { /* 저장 실패해도 대화는 계속되어야 한다 */ }
  }

  var listeners = [];

  var Store = {
    getProfile: read,

    patchProfile: function (patch) {
      var next = Object.assign(read(), patch, { updatedAt: Date.now() });
      write(next);
      listeners.forEach(function (fn) { fn(); });
      return next;
    },

    clearProfile: function () {
      write(Object.assign({}, EMPTY));
      listeners.forEach(function (fn) { fn(); });
    },

    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (l) { return l !== fn; });
      };
    }
  };

  // 예전 버전에서 쓰던 장바구니 데이터가 남아 있으면 정리한다
  try { window.localStorage.removeItem('obba.cart.v1'); } catch (e) { /* 무시 */ }

  OBBA.Store = Store;
})();
