/**
 * OBBA 추천 엔진
 * 큐레이션(사람이 쓴 조합) + 스코어링(개인화)의 하이브리드.
 *  - 큐레이션: 상황×고민 16조합에 대해 오빠의 코멘트와 대표 상품을 보장
 *  - 스코어링: 프로필(피부타입/예산/제형취향)로 순서를 바꾸고 후보를 보강
 * 결과 상품에는 fit(점수 + 사람이 읽을 이유)이 붙어서 UI가 근거를 보여줄 수 있다.
 */
window.OBBA = window.OBBA || {};

(function () {
  var STEP_META = {
    cleanser: { order: 1, label: '클렌징' },
    toner:    { order: 2, label: '토너' },
    pad:      { order: 2, label: '토너패드' },
    essence:  { order: 3, label: '에센스' },
    serum:    { order: 4, label: '세럼' },
    mask:     { order: 5, label: '마스크팩' },
    patch:    { order: 5, label: '패치' },
    lotion:   { order: 6, label: '로션' },
    cream:    { order: 7, label: '크림' },
    mist:     { order: 7, label: '미스트' },
    sleeping: { order: 8, label: '슬리핑팩' },
    sun:      { order: 9, label: '선케어' }
  };

  var TEXTURE_LABEL = { light: '가벼운 제형', medium: '적당한 제형', rich: '쫀쫀한 제형' };

  function discountRate(p) {
    if (!p.listPrice || p.listPrice <= p.price) return 0;
    return Math.round((1 - p.price / p.listPrice) * 100);
  }

  function formatWon(n) {
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  function budgetOf(budgetId) {
    return OBBA.BUDGETS.find(function (b) { return b.id === budgetId; }) || null;
  }

  function skinTypeOf(skinTypeId) {
    return OBBA.SKIN_TYPES.find(function (s) { return s.id === skinTypeId; }) || null;
  }

  /** 프로필이 선호하는 제형: 명시적 취향 > 피부타입 기본값 */
  function preferredTexture(profile) {
    if (profile && profile.texturePref) return profile.texturePref;
    var st = skinTypeOf(profile && profile.skinType);
    return st ? st.prefer : null;
  }

  /**
   * 상품 1개의 적합도 점수와 근거를 계산한다.
   * @returns {{score:number, reasons:string[], blocked:boolean}}
   */
  function scoreProduct(p, ctx) {
    var score = 0;
    var reasons = [];
    var blocked = false;

    if (ctx.concernId && p.concerns.indexOf(ctx.concernId) !== -1) score += 30;
    if (ctx.situationId && p.situations.indexOf(ctx.situationId) !== -1) score += 15;

    var profile = ctx.profile || {};
    var st = skinTypeOf(profile.skinType);
    if (st && st.id !== 'unknown') {
      if (p.skinTypes.indexOf(st.id) !== -1) {
        score += 25;
        reasons.push(st.label.replace(/^\S+\s/, '') + ' 피부에 잘 맞음');
      } else {
        score -= 20;
      }
    }

    var wantTexture = preferredTexture(profile);
    if (wantTexture) {
      if (p.texture === wantTexture) {
        score += 15;
        reasons.push(TEXTURE_LABEL[p.texture]);
      } else if ((wantTexture === 'light' && p.texture === 'rich') ||
                 (wantTexture === 'rich' && p.texture === 'light')) {
        score -= 10;
      }
    }

    var budget = budgetOf(profile.budget);
    if (budget && budget.max !== Infinity) {
      if (p.price <= budget.max) {
        score += 10;
        reasons.push(budget.short + ' 예산 OK');
      } else {
        score -= 25;
        blocked = true;
      }
    }

    var rate = discountRate(p);
    if (rate >= 30) { score += 8; reasons.push(rate + '% 할인 중'); }
    else if (rate > 0) { score += 3; }

    if (ctx.curatedIds && ctx.curatedIds.indexOf(p.id) !== -1) {
      score += 20;
      reasons.unshift('오빠 픽');
    }

    return { score: score, reasons: reasons, blocked: blocked };
  }

  /**
   * 메인 추천 함수
   * @param {{situationId:string, concernId:string, profile:object, limit:number}} input
   * @returns {{comment:string, products:Array, key:string, personalized:boolean, note:string}}
   */
  function recommend(input) {
    var situationId = input.situationId;
    var concernId = input.concernId;
    var profile = input.profile || {};
    var limit = input.limit || 3;

    var key = situationId + '_' + concernId;
    var curated = OBBA.CURATION[key] || OBBA.FALLBACK;
    var curatedIds = curated.products.slice();
    var ctx = { situationId: situationId, concernId: concernId, profile: profile, curatedIds: curatedIds };

    var pool = OBBA.CATALOG.filter(function (p) {
      if (curatedIds.indexOf(p.id) !== -1) return true;
      // 큐레이션 밖에서는 같은 고민을 다루는 상품만 후보로
      return p.concerns.indexOf(concernId) !== -1;
    });

    var scored = pool.map(function (p) {
      var fit = scoreProduct(p, ctx);
      return Object.assign({}, p, {
        fit: fit,
        curated: curatedIds.indexOf(p.id) !== -1,
        discountRate: discountRate(p),
        priceLabel: formatWon(p.price),
        listPriceLabel: formatWon(p.listPrice)
      });
    });

    // 예산 초과 상품은 큐레이션이라도 뒤로 밀되, 대안이 없으면 살려둔다
    var affordable = scored.filter(function (p) { return !p.fit.blocked; });
    var usable = affordable.length >= 2 ? affordable : scored;

    usable.sort(function (a, b) {
      if (b.fit.score !== a.fit.score) return b.fit.score - a.fit.score;
      return curatedIds.indexOf(a.id) - curatedIds.indexOf(b.id);
    });

    var products = usable.slice(0, limit);

    // 비교 UI가 항상 동작하도록 최소 2개는 채운다
    if (products.length < 2) {
      var extra = scored.filter(function (p) {
        return products.indexOf(p) === -1;
      }).sort(function (a, b) { return b.fit.score - a.fit.score; })[0];
      if (extra) products.push(extra);
    }

    var personalized = Boolean(profile.skinType || profile.budget || profile.texturePref);
    var note = '';
    if (personalized) {
      var bits = [];
      var st = skinTypeOf(profile.skinType);
      if (st && st.id !== 'unknown') bits.push(st.label.replace(/^\S+\s/, ''));
      var bg = budgetOf(profile.budget);
      if (bg && bg.max !== Infinity) bits.push(bg.short);
      if (profile.texturePref) {
        bits.push({ light: '가벼운 제형', medium: '중간 제형', rich: '쫀쫀한 제형' }[profile.texturePref]);
      }
      if (bits.length) note = bits.join(' · ') + ' 기준으로 순서 조정함';
      // 예산 안에 드는 후보가 없으면 솔직하게 알린다
      if (bg && bg.max !== Infinity && affordable.length === 0) {
        note = bg.short + '로는 이 조합에 마땅한 게 없어서, 가장 가까운 순으로 보여줄게';
      }
    }

    return {
      comment: curated.comment,
      products: products,
      key: key,
      personalized: personalized,
      note: note
    };
  }

  /**
   * 비교 결론 생성: 프로필이 있으면 단정적으로, 없으면 선택 기준을 제시
   */
  function verdict(products, profile) {
    if (!products || products.length < 2) return '';
    var top = products[0];
    var second = products[1];
    var st = skinTypeOf(profile && profile.skinType);

    if (st && st.id !== 'unknown') {
      return '🙋‍♂️ <b>오빠의 맞춤 결론:</b><br>' +
        st.label.replace(/^\S+\s/, '') + ' 피부는 ' + st.hint + '.<br>' +
        '그래서 지금은 <b>' + top.brand + ' ' + stepMeta(top.step).label + '</b> 쪽이 더 잘 맞아. ' +
        second.brand + ' ' + stepMeta(second.step).label + '은 ' + second.target.split(',')[0] + ' 쪽에 더 어울려!';
    }
    return '🙋‍♂️ <b>오빠의 결론:</b><br>' +
      '평소 피부가 <b>[' + top.target.split(',')[0] + ']</b> 쪽이면 ' + top.brand + ', ' +
      '<b>[' + second.target.split(',')[0] + ']</b> 쪽이면 ' + second.brand + '를 담는 걸 추천할게. ' +
      '피부타입만 알려주면 둘 중 하나로 딱 찍어줄 수 있어!';
  }

  /** 올리브영 딥링크: 상품번호가 있으면 상세페이지, 없으면 검색 결과 */
  function oliveyoungUrl(p) {
    if (p.goodsNo) {
      return 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=' + encodeURIComponent(p.goodsNo);
    }
    return 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=' +
      encodeURIComponent(p.searchQuery || (p.brand + ' ' + p.name));
  }

  /* ---------------- 자연어 인식 ---------------- */

  // 공백을 지우고 소문자로. 한국어는 띄어쓰기가 제각각이라 이게 인식률을 크게 올린다.
  function normalize(text) {
    return String(text == null ? '' : text).toLowerCase().replace(/\s+/g, '');
  }

  /* 한글 자모 분해 — 오타를 견디기 위해.
     "트러블"과 "트러불"은 글자로 보면 완전히 다르지만,
     자모로 풀면 ㅌㅡㄹㅓㅂㅡㄹ / ㅌㅡㄹㅓㅂㅜㄹ 로 딱 한 개만 다르다. */
  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  function toJamo(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i) - 0xac00;
      if (code >= 0 && code < 11172) {
        out += CHO[Math.floor(code / 588)] + JUNG[Math.floor((code % 588) / 28)] + JONG[code % 28];
      } else {
        out += str.charAt(i);
      }
    }
    return out;
  }

  /** 두 문자열이 몇 글자나 다른지 (max 를 넘으면 조기 중단) */
  function editDistance(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      var rowMin = cur[0];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      prev = cur.slice();
    }
    return prev[b.length];
  }

  /**
   * 오타를 감안한 매칭. 입력에서 키워드와 길이가 비슷한 구간들을 훑어
   * 자모가 몇 개나 다른지 본다. 두 글자 이하 단어는 우연히 걸리기 쉬워서 제외한다.
   * @returns 0 = 전혀 다름, 1 = 오타 수준(거의 확실), 2 = 비슷함(되물어볼 만함)
   */
  function fuzzyDistance(norm, kw) {
    if (kw.length < 3) return 0;
    var target = toJamo(kw);
    var best = 3;
    for (var len = kw.length - 1; len <= kw.length + 1; len++) {
      if (len < 2) continue;
      for (var i = 0; i + len <= norm.length; i++) {
        var d = editDistance(toJamo(norm.substr(i, len)), target, 2);
        if (d < best) best = d;
        if (best <= 1) return best === 0 ? 1 : 1;
      }
    }
    return best <= 2 ? 2 : 0;
  }

  function wordOf(kw) { return Array.isArray(kw) ? kw[0] : kw; }
  function weightOf(kw) { return Array.isArray(kw) ? kw[1] : kw.length; }

  var MIN_SCORE = 2;       // 한 글자짜리 우연한 일치로는 결론내지 않는다
  var FUZZY_NEAR = 0.7;    // 오타 한 글자 수준 — 확실한 일치보다 약간 약하게
  var FUZZY_FAR = 0.35;    // 그보다 더 다름 — 혼자서는 결론에 못 미치고 '되물어볼 후보'가 된다

  /**
   * 한 축(상황/고민/...)에서 점수가 가장 높은 후보를 고른다.
   * @returns {{best, near}} best = 확신하는 답, near = 확신은 못 하지만 되물어볼 만한 후보
   */
  function matchAxis(norm, dict) {
    var ranked = [];
    Object.keys(dict).forEach(function (id) {
      var score = 0;
      var hits = [];
      dict[id].forEach(function (kw) {
        var w = wordOf(kw);
        if (norm.indexOf(w) !== -1) {
          score += weightOf(kw);
          hits.push(w);
          return;
        }
        var d = fuzzyDistance(norm, w);
        if (d === 1) {
          score += weightOf(kw) * FUZZY_NEAR;
          hits.push(w + '(오타?)');
        } else if (d === 2) {
          score += weightOf(kw) * FUZZY_FAR;
          hits.push(w + '(비슷?)');
        }
      });
      if (score > 0) ranked.push({ id: id, score: score, hits: hits });
    });

    ranked.sort(function (a, b) { return b.score - a.score; });
    var top = ranked[0];
    if (!top) return { best: null, near: null };
    return top.score >= MIN_SCORE ? { best: top, near: null } : { best: null, near: top };
  }

  /**
   * 자연어 한 줄에서 상황/고민/피부타입/예산을 뽑아낸다.
   * @returns {{situationId, concernId, skinTypeId, budgetId, hits, understood, suggestions}}
   *   hits        축별로 실제 걸린 단어들 (왜 그렇게 알아들었는지 설명할 때)
   *   understood  하나라도 확신을 갖고 알아들었는지
   *   suggestions 확신은 못 하지만 되물어볼 만한 후보 [{axis, id}]
   */
  function parse(text) {
    var norm = normalize(text);
    var out = {
      situationId: null, concernId: null, skinTypeId: null, budgetId: null,
      hits: {}, understood: false, suggestions: []
    };
    if (!norm) return out;

    ['situation', 'concern', 'skinType', 'budget'].forEach(function (axis) {
      var m = matchAxis(norm, OBBA.KEYWORDS[axis]);
      if (m.best) {
        out[axis + 'Id'] = m.best.id;
        out.hits[axis] = m.best.hits;
      } else if (m.near) {
        out.suggestions.push({ axis: axis, id: m.near.id, score: m.near.score });
      }
    });

    out.understood = Boolean(out.situationId || out.concernId || out.skinTypeId || out.budgetId);
    // 확신한 게 있으면 애매한 후보는 굳이 되묻지 않는다
    if (out.understood) out.suggestions = [];
    out.suggestions.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  function stepMeta(step) {
    return STEP_META[step] || { order: 99, label: '기타' };
  }

  OBBA.Engine = {
    recommend: recommend,
    scoreProduct: scoreProduct,
    verdict: verdict,
    oliveyoungUrl: oliveyoungUrl,
    parse: parse,
    discountRate: discountRate,
    formatWon: formatWon,
    stepMeta: stepMeta,
    skinTypeOf: skinTypeOf,
    budgetOf: budgetOf,
    preferredTexture: preferredTexture
  };
})();
