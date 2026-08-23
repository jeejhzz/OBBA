# 올리브영 상품 연동 전략

핵심 질문: **상품 데이터(가격/재고/이미지/링크)를 어디서 가져올 것인가.**
OBBA는 이 질문의 답을 나중에 바꿀 수 있도록, 데이터 출처를 카탈로그 스키마 뒤로 숨겨놨다.

## 0. 지금 상태 — 딥링크 + 로컬 스냅샷

- `assets/js/data/catalog.js`에 상품 21종을 손으로 넣어뒀다.
- 링크는 `goodsNo`가 있으면 상세페이지, 없으면 검색 결과로 보낸다.
  ```js
  // core/engine.js
  goodsNo ? '.../getGoodsDetail.do?goodsNo=' + goodsNo
          : '.../getSearchMain.do?query=' + searchQuery
  ```
- 장점: 지금 당장 동작하고, 올리브영 쪽에 아무 부담도 주지 않는다.
- 한계: 가격이 낡는다. 품절을 모른다.

> **먼저 할 값싼 개선**: 각 상품의 `goodsNo`를 한 번만 수동으로 채워 넣기.
> 검색 결과 경유(2탭)가 상세페이지 직행(1탭)으로 바뀐다. 21개면 30분이면 끝난다.

## 1. 선택지 비교

| 방식 | 실시간성 | 구축 비용 | 리스크 | 추천 |
|---|---|---|---|---|
| **A. 딥링크 + 수동 카탈로그** (현재) | 없음 | 매우 낮음 | 없음 | 지금 단계 ✅ |
| **B. 시트 기반 카탈로그** (Google Sheets → JSON) | 수동 갱신 | 낮음 | 없음 | 다음 단계 ✅ |
| **C. 제휴 마케팅 상품 피드** | 높음 (일 단위) | 중간 | 제휴 승인 필요 | 서비스로 키운다면 ✅ |
| **D. 직접 크롤링** | 높음 | 중간 | 약관/robots.txt·차단·법적 리스크 | 권장하지 않음 ⚠️ |
| **E. 공식 오픈 API** | — | — | 공개된 일반 개발자용 API 없음 | 불가 |

### B. 시트 기반 카탈로그 — 가장 현실적인 다음 단계

여자친구랑 둘이 쓰는 서비스라면 **상품 관리 UI를 만들 필요가 없다.** 스프레드시트가 곧 어드민이다.

1. Google Sheets에 카탈로그 스키마 그대로 컬럼을 만든다
   (`id, brand, name, step, listPrice, price, texture, skinTypes, concerns, situations, goodsNo, searchQuery, target, point, tags`)
2. `파일 → 웹에 게시 → CSV`로 공개 URL을 얻는다
3. 앱 시작 시 CSV를 받아 카탈로그로 변환하고, 실패하면 번들된 로컬 카탈로그로 폴백한다

```js
// assets/js/data/source.js (예정)
OBBA.loadCatalog = async function () {
  try {
    const csv = await fetch(SHEET_CSV_URL, { cache: 'no-cache' }).then(r => r.text());
    const rows = parseCsv(csv).map(normalize);   // ← 스키마 검증 필수
    if (rows.length) return rows;
  } catch (e) { /* 네트워크 실패 시 조용히 폴백 */ }
  return OBBA.CATALOG;                            // 번들 스냅샷
};
```

**이 구조의 핵심은 폴백이다.** 시트가 죽어도 대화는 끊기지 않아야 한다.
세일 시즌마다 가격 열만 고쳐 넣으면 앱 배포 없이 반영된다.

### C. 제휴 마케팅 상품 피드 — 서비스로 키울 때

제휴 네트워크(링크프라이스, 쿠팡파트너스류)는 보통 **상품 피드(XML/CSV) + 추적 딥링크**를 제공한다.
올리브영이 어느 네트워크에 어떤 조건으로 캠페인을 열어두는지는 **직접 확인이 필요하다** (수시로 바뀜).
승인만 받으면:

- 가격·이미지·품절 여부를 합법적으로, 정기적으로 받을 수 있다
- 링크에 추적 파라미터가 붙어 수익화 경로가 생긴다
- 이미지 사용권이 명확해진다 → 지금의 "가짜 브랜드 썸네일"을 실제 상품 이미지로 교체 가능

이 경우에도 앱이 바뀌는 부분은 `loadCatalog()`와 `oliveyoungUrl()` 두 함수뿐이다.

### D. 크롤링을 권하지 않는 이유

기술적으로는 가능하지만, (1) 이용약관·`robots.txt` 확인이 선행되어야 하고, (2) 상품 이미지·설명은
저작물이며, (3) IP 차단이나 마크업 변경으로 언제든 깨진다. 개인이 소수 상품을 낮은 빈도로
확인하는 정도를 넘어서면 리스크가 이득보다 크다. B나 C가 훨씬 싸게 먹힌다.

## 2. 어댑터 계약 (바뀌지 않아야 할 것)

어떤 출처를 쓰든 아래 스키마를 만족하면 엔진·UI는 그대로 동작한다.

```
id          string   고유 키
brand,name  string
step         enum    cleanser|toner|pad|essence|serum|mask|patch|lotion|cream|mist|sleeping|sun
listPrice   number   정가(원)
price       number   판매가(원)  → 할인율은 계산으로 도출, 저장하지 않는다
texture      enum    light|medium|rich
skinTypes   string[] dry|oily|combination|sensitive|dehydrated|normal
concerns    string[] hydration|calming|brightening|texture|elasticity|sebum|sun
situations  string[] date|tired|travel|daily
goodsNo     string?  올리브영 상품번호 (없으면 검색 폴백)
searchQuery string   검색 딥링크용 키워드
target,point string  카드/비교 뷰에 그대로 노출되는 사람 언어
tags        string[]
```

`skinTypes / concerns / situations / texture`는 **연동으로 자동 확보되지 않는 필드**다.
상품 피드에는 "이 제품이 복합성에 맞는지"가 들어있지 않다. 이 태깅이 OBBA의 실제 자산이고,
그래서 카탈로그와 큐레이션은 출처가 바뀌어도 우리가 계속 관리해야 한다.

## 3. 이행 순서

1. `goodsNo` 채우기 → 딥링크 정확도 (반나절)
2. 시트 소스 + 폴백 (`data/source.js`) → 가격 갱신을 배포에서 분리 (1~2일)
3. 스키마 검증 스크립트 → 시트에 오타가 나도 앱이 안 깨지게 (반나절)
4. 제휴 조건 확인 → 되면 피드로 승격, 이미지 교체 (조사 필요)
