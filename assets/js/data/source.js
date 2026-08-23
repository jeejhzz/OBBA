/**
 * 구글 시트에서 상품 목록을 읽어온다.
 *
 * 왜 필요한가
 *   가격은 세일마다 바뀌고 상품은 계속 늘어난다. 그걸 코드에 박아두면 그때마다 개발이 필요하다.
 *   시트를 읽게 해두면 시트만 고쳐도 앱에 반영된다.
 *
 * 규칙
 *   - 시트 주소가 비어 있으면 아무것도 하지 않고 내장 목록(catalog.js)을 그대로 쓴다.
 *   - 시트를 못 읽거나(오프라인, 주소 오류) 내용이 이상하면 조용히 내장 목록으로 되돌아간다.
 *     상담이 끊기는 것보다 조금 낡은 가격이 낫다.
 *   - 시트는 내장 목록을 '덮어쓰기'가 아니라 '합치기'다. 고유번호가 같으면 갱신, 없으면 추가.
 *     그래야 오빠의 큐레이션(상황x고민 16조합)이 그대로 살아있다.
 *
 * 시트 만드는 법은 docs/SPREADSHEET.md 참고.
 */
window.OBBA = window.OBBA || {};

(function () {
  /** 구글 시트 → 파일 → 공유 → 웹에 게시 → CSV 로 얻은 주소를 여기에 붙여넣으면 된다. */
  OBBA.SHEET_CSV_URL = OBBA.SHEET_CSV_URL || '';

  var TIMEOUT_MS = 4000;   // 시트가 느려도 앱이 붙잡혀 있지 않게

  /* ---------------- 한국어 값 → 내부 값 ---------------- */

  var STEP = { '클렌징':'cleanser','토너':'toner','토너패드':'pad','패드':'pad','에센스':'essence',
    '세럼':'serum','앰플':'serum','마스크팩':'mask','마스크':'mask','팩':'mask','패치':'patch',
    '로션':'lotion','크림':'cream','미스트':'mist','슬리핑팩':'sleeping','수면팩':'sleeping',
    '선크림':'sun','선케어':'sun' };

  var TEXTURE = { '가벼움':'light','가벼운':'light','산뜻':'light','보통':'medium','중간':'medium',
    '쫀쫀함':'rich','쫀쫀':'rich','무거움':'rich' };

  var SKIN = { '건성':'dry','지성':'oily','복합성':'combination','민감성':'sensitive','민감':'sensitive',
    '수부지':'dehydrated','보통':'normal','중성':'normal' };
  var ALL_SKIN = ['dry','oily','combination','sensitive','dehydrated','normal'];

  var CONCERN = { '수분':'hydration','보습':'hydration','진정':'calming','트러블':'calming',
    '미백':'brightening','톤':'brightening','결':'texture','각질':'texture','모공':'texture',
    '탄력':'elasticity','피지':'sebum','자외선':'sun' };

  var SITUATION = { '데이트':'date','약속':'date','야근':'tired','피로':'tired','여행':'travel',
    '휴가':'travel','데일리':'daily','매일':'daily' };

  /* ---------------- CSV 파싱 ---------------- */

  /** 따옴표 안의 쉼표·줄바꿈까지 제대로 처리하는 최소 CSV 파서 */
  function parseCsv(text) {
    var rows = [], row = [], field = '', quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (quoted) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i++; }
          else quoted = false;
        } else field += c;
      } else if (c === '"') { quoted = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') { field += c; }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  var COLUMN = { '고유번호':'id','사용여부':'enabled','브랜드':'brand','제품명':'name','단계':'step',
    '정가':'listPrice','판매가':'price','올리브영링크':'link','링크':'link','제형':'texture',
    '피부타입':'skinTypes','고민':'concerns','상황':'situations','이런분께':'target',
    '핵심포인트':'point','태그':'tags' };

  function key(header) {
    return COLUMN[String(header).replace(/﻿/g, '').replace(/\s+/g, '')] || null;
  }

  function splitList(value) {
    return String(value || '').split(/[,/|]/)
      .map(function (v) { return v.trim(); })
      .filter(Boolean);
  }

  function mapList(value, table, fallback) {
    var out = [];
    splitList(value).forEach(function (v) {
      if (v === '모든피부' || v === '모두') { out = out.concat(ALL_SKIN); return; }
      var mapped = table[v];
      if (mapped && out.indexOf(mapped) === -1) out.push(mapped);
    });
    return out.length ? out : (fallback || []);
  }

  function toNumber(value) {
    var n = parseInt(String(value).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? null : n;
  }

  /** 올리브영 상품 주소를 붙여넣으면 상품번호만 뽑아낸다 */
  function goodsNoFrom(link) {
    var m = String(link || '').match(/goodsNo=([A-Za-z0-9]+)/);
    return m ? m[1] : null;
  }

  function slugId(brand, name) {
    return ('sheet-' + brand + '-' + name).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80);
  }

  /* ---------------- 한 줄 → 상품 ---------------- */

  function toProduct(raw) {
    var brand = (raw.brand || '').trim();
    var name = (raw.name || '').trim();
    if (!brand || !name) return { error: '브랜드/제품명 비어 있음' };

    var price = toNumber(raw.price);
    var listPrice = toNumber(raw.listPrice);
    if (!price) return { error: '판매가 없음 (' + brand + ' ' + name + ')' };
    if (!listPrice || listPrice < price) listPrice = price;

    var step = STEP[String(raw.step || '').trim()];
    if (!step) return { error: '단계를 못 알아봄: "' + raw.step + '" (' + name + ')' };

    var concerns = mapList(raw.concerns, CONCERN);
    if (!concerns.length) return { error: '고민이 비어 있음 (' + name + ')' };

    var skinTypes = mapList(raw.skinTypes, SKIN, ALL_SKIN);
    var situations = mapList(raw.situations, SITUATION, ['daily']);
    var texture = TEXTURE[String(raw.texture || '').trim()] || 'medium';
    var goodsNo = goodsNoFrom(raw.link);

    // 설명을 안 적었으면 태깅한 내용으로 대신 채운다 (없는 말을 지어내지 않는다)
    var koSkin = splitList(raw.skinTypes).join('·');
    var koConcern = splitList(raw.concerns).join('·');

    return {
      product: {
        id: (raw.id || '').trim() || slugId(brand, name),
        brand: brand,
        name: name,
        step: step,
        listPrice: listPrice,
        price: price,
        texture: texture,
        tags: splitList(String(raw.tags || '').replace(/\s+/g, ',')),
        keyIngredients: [],
        skinTypes: skinTypes,
        concerns: concerns,
        situations: situations,
        target: (raw.target || '').trim() || (koSkin ? koSkin + ' 피부' : '두루 무난한 선택'),
        point: (raw.point || '').trim() || (koConcern ? koConcern + ' 케어' : ''),
        goodsNo: goodsNo,
        goodsNoSource: goodsNo ? '시트에 붙여넣은 상품 링크' : undefined,
        searchQuery: brand + ' ' + name,
        fromSheet: true
      }
    };
  }

  /* ---------------- 표 전체 → 상품 목록 ---------------- */

  function buildCatalog(rows) {
    if (!rows.length) return { products: null, skipped: ['시트가 비어 있음'] };

    var headers = rows[0].map(key);
    if (headers.indexOf('brand') === -1 || headers.indexOf('name') === -1) {
      return { products: null, skipped: ['첫 줄에 열 이름(브랜드/제품명…)이 없음'] };
    }

    var merged = OBBA.CATALOG.slice();
    var index = {};
    merged.forEach(function (p, i) { index[p.id] = i; });

    var skipped = [];
    var added = 0, updated = 0, hidden = 0;

    rows.slice(1).forEach(function (cells, n) {
      if (!cells.join('').trim()) return;   // 빈 줄

      var raw = {};
      headers.forEach(function (h, i) { if (h) raw[h] = cells[i]; });

      var off = /^(n|no|아니오|숨김|x)$/i.test(String(raw.enabled || '').trim());
      var id = (raw.id || '').trim();

      if (off) {
        if (id && index[id] !== undefined) {
          merged[index[id]] = null;
          hidden++;
        }
        return;
      }

      var result = toProduct(raw);
      if (result.error) { skipped.push((n + 2) + '행: ' + result.error); return; }

      var product = result.product;
      if (index[product.id] !== undefined) {
        // 내장 상품의 태깅을 유지하되 시트 값으로 덮어쓴다
        merged[index[product.id]] = Object.assign({}, merged[index[product.id]], product);
        updated++;
      } else {
        index[product.id] = merged.length;
        merged.push(product);
        added++;
      }
    });

    return {
      products: merged.filter(Boolean),
      skipped: skipped,
      stats: { added: added, updated: updated, hidden: hidden }
    };
  }

  /* ---------------- 불러오기 ---------------- */

  function fetchWithTimeout(url) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; reject(new Error('시간 초과')); }
      }, TIMEOUT_MS);

      fetch(url, { cache: 'no-cache' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (text) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(text);
        })
        .catch(function (err) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * 시트를 읽어 카탈로그를 갱신한다. 실패해도 절대 예외를 던지지 않는다.
   * @returns {Promise<{source:'sheet'|'bundled', stats?, skipped?, reason?}>}
   */
  OBBA.loadCatalog = function () {
    var url = OBBA.SHEET_CSV_URL;
    if (!url) return Promise.resolve({ source: 'bundled', reason: '시트 주소 미설정' });

    return fetchWithTimeout(url)
      .then(function (text) {
        var built = buildCatalog(parseCsv(text));
        if (!built.products || built.products.length < 2) {
          return { source: 'bundled', reason: '시트 내용이 부족함', skipped: built.skipped };
        }
        OBBA.CATALOG = built.products;
        return { source: 'sheet', stats: built.stats, skipped: built.skipped };
      })
      .catch(function (err) {
        return { source: 'bundled', reason: String(err && err.message || err) };
      });
  };

  // 검사 도구에서 쓰기 위해 노출
  OBBA.SheetSource = { parseCsv: parseCsv, buildCatalog: buildCatalog, toProduct: toProduct,
    goodsNoFrom: goodsNoFrom };
})();
