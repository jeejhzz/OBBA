/**
 * OBBA 상품 카탈로그
 * ------------------------------------------------------------------
 * 이 파일은 "데이터 소스 어댑터"가 채워 넣을 스키마의 로컬 구현체다.
 * 나중에 크롤러/시트/API 어느 쪽으로 연동하더라도 아래 스키마만 지키면
 * engine.js / ui 레이어는 손대지 않아도 된다. (docs/OLIVEYOUNG-INTEGRATION.md 참고)
 *
 * 스키마
 *   id            고유 키 (brand-slug)
 *   brand / name  표시용
 *   step          루틴 단계: cleanser|toner|essence|serum|lotion|cream|sleeping|mist|mask|pad|patch|sun
 *   listPrice     정가(원, 숫자) / price 판매가(원, 숫자)  → 할인율은 계산으로 도출
 *   texture       light|medium|rich  (제형 무게 — 개인화 점수에 사용)
 *   skinTypes     dry|oily|combination|sensitive|dehydrated|normal
 *   concerns      hydration|calming|brightening|texture|elasticity|sebum|sun
 *   situations    date|tired|travel|daily
 *   goodsNo       올리브영 상품번호(확보 시). null이면 검색 딥링크로 폴백
 *   goodsNoSource goodsNo를 어떤 근거로 확정했는지. 재검증할 때 이걸 보고 판단한다
 *   searchQuery   검색 딥링크용 키워드 (상품명보다 짧고 정확하게)
 */
window.OBBA = window.OBBA || {};

OBBA.CATALOG = [
  {
    id: 'torriden-dive-in-serum',
    brand: 'Torriden', name: '다이브인 저분자 히알루론산 세럼 50ml', step: 'serum',
    listPrice: 22000, price: 15400, texture: 'light',
    tags: ['#수분폭탄', '#화장찰떡'],
    keyIngredients: ['5D 히알루론산', '판테놀'],
    skinTypes: ['oily', 'combination', 'dehydrated', 'normal', 'sensitive'],
    concerns: ['hydration', 'texture'], situations: ['date', 'daily', 'travel', 'tired'],
    target: '지성/수부지, 메이크업 전', point: '가벼운 텍스처, 즉각적인 수분길 오픈',
    goodsNo: 'A000000190326', goodsNoSource: '[1등세럼/단독기획] 다이브인 세럼 50ml 기획(+멀티패드 10매) — 대표 판매 SKU',
    searchQuery: '토리든 다이브인 세럼'
  },
  {
    id: 'aestura-atobarrier365-cream',
    brand: 'AESTURA', name: '아토베리어365 크림 80ml', step: 'cream',
    listPrice: 31000, price: 24800, texture: 'rich',
    tags: ['#보습장벽', '#올영1위'],
    keyIngredients: ['캡슐 세라마이드'],
    skinTypes: ['dry', 'sensitive', 'combination'],
    concerns: ['hydration', 'calming'], situations: ['date', 'daily', 'tired'],
    target: '건성/민감성, 전날 밤 철벽보습', point: '캡슐 세라마이드로 피부장벽 강화',
    goodsNo: null, searchQuery: '에스트라 아토베리어365 크림'
  },
  {
    id: 'oliveyoung-careplus-spot-patch',
    brand: '올리브영', name: '케어플러스 상처커버 스팟패치 102매', step: 'patch',
    listPrice: 6500, price: 5520, texture: 'light',
    tags: ['#국민패치', '#티안나는'],
    keyIngredients: ['하이드로콜로이드'],
    skinTypes: ['dry', 'oily', 'combination', 'sensitive', 'dehydrated', 'normal'],
    concerns: ['calming'], situations: ['date', 'tired', 'travel', 'daily'],
    target: '눈에 띄는 트러블이 고민일 때', point: '얇은 테두리로 화장 후에도 감쪽같음',
    goodsNo: 'A000000187728', goodsNoSource: '[7년연속 1등패치]케어플러스 상처커버 스팟패치 102매',
    searchQuery: '케어플러스 스팟패치'
  },
  {
    id: 'goodal-green-tangerine-serum',
    brand: 'goodal', name: '청귤 비타C 잡티 케어 세럼 30ml', step: 'serum',
    listPrice: 28000, price: 21000, texture: 'light',
    tags: ['#형광등피부', '#잡티이별'],
    keyIngredients: ['청귤 추출물', '비타민C 유도체'],
    skinTypes: ['combination', 'oily', 'normal', 'sensitive'],
    concerns: ['brightening'], situations: ['date', 'daily', 'tired'],
    target: '칙칙한 안색이 고민인 분', point: '저자극 비타민C로 생기 급속 충전',
    goodsNo: null, searchQuery: '구달 청귤 비타C 세럼'
  },
  {
    id: 'numbuzin-no3-serum',
    brand: 'numbuzin', name: '3번 보들보들 결 세럼 50ml', step: 'serum',
    listPrice: 22000, price: 15400, texture: 'medium',
    tags: ['#결광피부', '#깐달걀결'],
    keyIngredients: ['갈락토미세스', '나이아신아마이드'],
    skinTypes: ['normal', 'combination', 'dry', 'dehydrated'],
    concerns: ['texture', 'brightening'], situations: ['date', 'daily'],
    target: '피부가 푸석하고 요철이 부각될 때', point: '발효 성분으로 깐달걀 피부결 완성',
    goodsNo: 'A000000166420', goodsNoSource: '넘버즈인 3번 보들보들 결 세럼 50ml (단품)',
    searchQuery: '넘버즈인 3번 세럼'
  },
  {
    id: 'laneige-water-sleeping-mask',
    brand: 'LANEIGE', name: '워터 슬리핑 마스크 EX 70ml', step: 'sleeping',
    listPrice: 32000, price: 27200, texture: 'medium',
    tags: ['#수면팩', '#초간편수분'],
    keyIngredients: ['스쿠알란', '프로바이오틱스 컴플렉스'],
    skinTypes: ['dehydrated', 'combination', 'normal', 'dry'],
    concerns: ['hydration'], situations: ['tired', 'travel', 'daily'],
    target: '스킨케어도 귀찮은 극도의 피로 상태', point: '바르고 자면 끝, 밤사이 집중 수분공급',
    goodsNo: null, searchQuery: '라네즈 워터 슬리핑 마스크'
  },
  {
    id: 'anua-heartleaf-77-toner',
    brand: 'Anua', name: '어성초 77 수딩 토너 250ml', step: 'toner',
    listPrice: 30500, price: 21350, texture: 'light',
    tags: ['#즉각진정', '#어성초듬뿍'],
    keyIngredients: ['어성초 추출물 77%'],
    skinTypes: ['oily', 'combination', 'sensitive'],
    concerns: ['calming', 'sebum'], situations: ['tired', 'daily', 'travel'],
    target: '피부 열감이 오르고 붉어졌을 때', point: '어성초 77%로 닦아내듯 열감 쿨링',
    goodsNo: null, searchQuery: '아누아 어성초 토너'
  },
  {
    id: 'abib-heartleaf-sticker-mask',
    brand: 'Abib', name: '어성초 스티커 마스크팩 1매', step: 'mask',
    listPrice: 4000, price: 2000, texture: 'light',
    tags: ['#밀착진정', '#야근템'],
    keyIngredients: ['어성초 추출물'],
    skinTypes: ['sensitive', 'oily', 'combination'],
    concerns: ['calming'], situations: ['tired', 'date', 'daily'],
    target: '빠르고 확실한 집중 진정이 필요할 때', point: '초밀착 시트로 에센스 남김없이 흡수',
    goodsNo: 'A000000188019', goodsNoSource: '[1매/5종] 아비브 껌딱지 시트 마스크 스티커 1매 — 페이지에서 어성초 선택',
    searchQuery: '아비브 어성초 마스크'
  },
  {
    id: 'isoi-blemish-care-up-serum',
    brand: 'isoi', name: '블레미쉬 케어 업 세럼 35ml', step: 'serum',
    listPrice: 54000, price: 43200, texture: 'rich',
    tags: ['#명품장미', '#생기충전'],
    keyIngredients: ['불가리안 로즈오일'],
    skinTypes: ['dry', 'normal', 'sensitive'],
    concerns: ['brightening', 'elasticity'], situations: ['tired', 'date'],
    target: '야근으로 다크서클이 짙어졌을 때', point: '액체 다이아몬드 로즈오일로 생기 부여',
    goodsNo: null, searchQuery: '아이소이 블레미쉬 케어 업 세럼'
  },
  {
    id: 'stridex-sensitive-pad',
    brand: 'STRIDEX', name: '센시티브 패드 (BHA) 90매', step: 'pad',
    listPrice: 14000, price: 10500, texture: 'light',
    tags: ['#모공청소', '#귀차니즘해결'],
    keyIngredients: ['살리실산(BHA) 0.5%', '알로에'],
    skinTypes: ['oily', 'combination'],
    concerns: ['texture', 'sebum'], situations: ['tired', 'daily'],
    target: '클렌징과 각질 정돈을 한 번에 원할 때', point: 'BHA 성분으로 묵은 각질, 피지 딥클렌징',
    goodsNo: 'A000000114166', goodsNoSource: '[각질/피지] 스트라이덱스 센시티브 패드 90매',
    searchQuery: '스트라이덱스 센시티브 패드'
  },
  {
    id: 'dalba-white-truffle-mist',
    brand: "d'Alba", name: '화이트 트러플 퍼스트 스프레이 세럼 100ml', step: 'mist',
    listPrice: 29900, price: 23900, texture: 'medium',
    tags: ['#승무원미스트', '#건조함타파'],
    keyIngredients: ['화이트 트러플 추출물', '이탈리안 올리브 오일'],
    skinTypes: ['dry', 'normal', 'dehydrated'],
    concerns: ['hydration'], situations: ['travel', 'date', 'daily'],
    target: '수시로 건조함을 느끼는 이동 중', point: '오일보습막으로 날아가지 않는 쫀쫀함',
    goodsNo: null, searchQuery: '달바 화이트트러플 미스트'
  },
  {
    id: 'illiyoon-ceramide-ato-lotion',
    brand: 'ILLIYOON', name: '세라마이드 아토 로션 50ml', step: 'lotion',
    listPrice: 5000, price: 4500, texture: 'medium',
    tags: ['#여행용', '#장벽보습'],
    keyIngredients: ['세라마이드'],
    skinTypes: ['dry', 'sensitive', 'normal'],
    concerns: ['hydration', 'calming'], situations: ['travel', 'daily'],
    target: '휴대성 좋은 확실한 보습제가 필요할 때', point: '얼굴부터 바디까지, 만능 세라마이드 로션',
    goodsNo: null, searchQuery: '일리윤 세라마이드 아토 로션'
  },
  {
    id: 'drg-red-blemish-soothing-cream',
    brand: 'Dr.G', name: '레드 블레미쉬 클리어 수딩 크림 70ml', step: 'cream',
    listPrice: 38000, price: 22800, texture: 'medium',
    tags: ['#군마트대란템', '#물갈이대비'],
    keyIngredients: ['5-시카 컴플렉스'],
    skinTypes: ['sensitive', 'combination', 'oily'],
    concerns: ['calming', 'hydration'], situations: ['travel', 'tired', 'daily'],
    target: '물갈이, 자극으로 피부가 뒤집어졌을 때', point: '5-시카 컴플렉스로 수분 진정 쿨링',
    goodsNo: null, searchQuery: '닥터지 레드 블레미쉬 수딩크림'
  },
  {
    id: 'espoir-water-splash-sun',
    brand: 'eSpoir', name: '워터 스플래쉬 선크림 세라마이드 60ml', step: 'sun',
    listPrice: 22000, price: 15400, texture: 'light',
    tags: ['#촉촉선크림', '#여행필수템'],
    keyIngredients: ['세라마이드', 'SPF50+ PA++++'],
    skinTypes: ['dry', 'normal', 'combination'],
    concerns: ['brightening', 'sun'], situations: ['travel', 'date', 'daily'],
    target: '야외 활동 시 덧바를 선크림이 필요할 때', point: '수분 크림처럼 촉촉하고 핑크빛 톤업',
    goodsNo: 'A000000179353', goodsNoSource: '[톤업선크림] 에스쁘아 워터 스플래쉬 선크림 세라마이드 60ml',
    searchQuery: '에스쁘아 워터 스플래쉬 선크림'
  },
  {
    id: 'skinfood-carrot-pad',
    brand: 'SKINFOOD', name: '캐롯 카로틴 카밍 워터 패드 60매', step: 'pad',
    listPrice: 26000, price: 18200, texture: 'light',
    tags: ['#당근패드', '#순한결케어'],
    keyIngredients: ['당근씨 오일', '베타카로틴'],
    skinTypes: ['sensitive', 'normal', 'combination'],
    concerns: ['texture', 'calming'], situations: ['travel', 'daily', 'tired'],
    target: '자극 없이 부드러운 각질/진정 케어', point: '도톰한 순면 패드로 마찰 자극 최소화',
    goodsNo: 'A000000143285', goodsNoSource: '[당근패드] 스킨푸드 캐롯 카로틴 카밍 워터 패드 60매',
    searchQuery: '스킨푸드 캐롯 카밍 패드'
  },
  {
    id: 'roundlab-birch-moisture-cream',
    brand: 'ROUND LAB', name: '자작나무 수분 크림 80ml', step: 'cream',
    listPrice: 32000, price: 22400, texture: 'light',
    tags: ['#올영1등수분', '#산뜻촉촉'],
    keyIngredients: ['자작나무 수액'],
    skinTypes: ['combination', 'oily', 'dehydrated', 'normal'],
    concerns: ['hydration'], situations: ['daily', 'date', 'travel'],
    target: '무겁지 않고 산뜻한 데일리 크림', point: '자작나무 수액으로 속건조 완벽 케어',
    goodsNo: 'A000000141723', goodsNoSource: '라운드랩 자작나무 수분 크림 80ml (단품)',
    searchQuery: '라운드랩 자작나무 수분크림'
  },
  {
    id: 'makeprem-safe-me-cleansing-foam',
    brand: 'make p:rem', name: '세이프 미 릴리프 모이스처 클렌징폼 150ml', step: 'cleanser',
    listPrice: 16000, price: 12800, texture: 'light',
    tags: ['#약산성', '#데일리세안'],
    keyIngredients: ['pH 5.5 약산성', '판테놀'],
    skinTypes: ['sensitive', 'dry', 'normal', 'combination'],
    concerns: ['hydration', 'calming'], situations: ['daily', 'tired'],
    target: '세안 후 당김 없는 순한 클렌징', point: 'pH5.5 약산성으로 수분 장벽 보호',
    goodsNo: 'A000000113670', goodsNoSource: '메이크프렘 세이프미 릴리프 모이스처 클렌징폼 150ml 1+1 기획 — 단일 SKU',
    searchQuery: '메이크프렘 세이프미 클렌징폼'
  },
  {
    id: 'mediheal-teatree-mask',
    brand: 'MEDIHEAL', name: '티트리 에센셜 마스크 1매', step: 'mask',
    listPrice: 2000, price: 1000, texture: 'light',
    tags: ['#국민팩', '#1일1팩'],
    keyIngredients: ['티트리 잎 오일'],
    skinTypes: ['oily', 'combination', 'sensitive'],
    concerns: ['calming'], situations: ['daily', 'tired'],
    target: '1일 1팩으로 데일리 진정 관리', point: '티트리 성분으로 피부 스트레스 완화',
    goodsNo: 'A000000160659', goodsNoSource: '메디힐 티트리 에센셜 마스크 1매 (2,000→1,000원 일치)',
    searchQuery: '메디힐 티트리 마스크'
  },
  {
    id: 'manyo-galac-niacin-essence',
    brand: 'ma:nyo', name: '갈락토미 나이아신 에센스 50ml', step: 'essence',
    listPrice: 29000, price: 20300, texture: 'light',
    tags: ['#맑은톤', '#매일투명하게'],
    keyIngredients: ['갈락토미세스', '나이아신아마이드'],
    skinTypes: ['normal', 'combination', 'dehydrated', 'oily'],
    concerns: ['brightening', 'texture'], situations: ['daily', 'date'],
    target: '매일 맑아지는 투명한 피부를 원할 때', point: '나이아신아마이드로 데일리 미백 케어',
    goodsNo: 'A000000120924', goodsNoSource: '마녀공장 갈락토미 나이아신 투명광채 에센스 50ml',
    searchQuery: '마녀공장 갈락토미 나이아신 에센스'
  },
  {
    id: 'bioheal-probioderm-lifting-cream',
    brand: 'BIOHEAL BOH', name: '프로바이오덤 리프팅 크림 50ml', step: 'cream',
    listPrice: 33000, price: 26400, texture: 'rich',
    tags: ['#탄탄결', '#바르는유산균'],
    keyIngredients: ['프로바이오틱스', '콜라겐'],
    skinTypes: ['normal', 'dry', 'combination'],
    concerns: ['elasticity', 'texture'], situations: ['daily', 'date'],
    target: '미리미리 피부 탄력을 관리하고 싶은 분', point: '프로바이오틱스로 쫀쫀한 피부결 완성',
    goodsNo: null, searchQuery: '바이오힐보 프로바이오덤 크림'
  },
  {
    id: 'bioheal-panthenol-cica-cream',
    brand: 'BIOHEAL BOH', name: '판테놀 시카 블레미쉬 크림 75ml', step: 'cream',
    listPrice: 32000, price: 24000, texture: 'medium',
    tags: ['#장벽강화', '#기본충실'],
    keyIngredients: ['판테놀', '시카(병풀)'],
    skinTypes: ['sensitive', 'dry', 'combination', 'oily'],
    concerns: ['calming', 'hydration'], situations: ['daily', 'tired', 'travel', 'date'],
    target: '피부가 예민하고 기초 공사가 필요할 때', point: '판테놀과 시카의 꿀조합으로 장벽 리페어',
    goodsNo: null, searchQuery: '바이오힐보 판테놀 시카 크림'
  }
];

OBBA.byId = function (id) {
  return OBBA.CATALOG.find(function (p) { return p.id === id; }) || null;
};
