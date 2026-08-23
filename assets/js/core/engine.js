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

  /** 자연어 한 줄에서 상황/고민/피부타입/예산을 뽑아낸다 (부분 문자열 매칭) */
  function parse(text) {
    var out = { situationId: null, concernId: null, skinTypeId: null, budgetId: null };
    if (!text) return out;
    Object.keys(OBBA.KEYWORDS).forEach(function (axis) {
      var dict = OBBA.KEYWORDS[axis];
      Object.keys(dict).forEach(function (id) {
        if (out[axis + 'Id']) return;
        var hit = dict[id].some(function (kw) { return text.indexOf(kw) !== -1; });
        if (hit) out[axis + 'Id'] = id;
      });
    });
    return out;
  }

  function stepMeta(step) {
    return STEP_META[step] || { order: 99, label: '기타' };
  }

  /** 장바구니를 루틴 순서(클렌징→선케어)로 정렬 */
  function sortByRoutine(products) {
    return products.slice().sort(function (a, b) {
      return stepMeta(a.step).order - stepMeta(b.step).order;
    });
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
    sortByRoutine: sortByRoutine,
    skinTypeOf: skinTypeOf,
    budgetOf: budgetOf,
    preferredTexture: preferredTexture
  };
})();
