/**
 * OBBA 대화 시나리오 데이터
 * 상황 / 고민 / 피부타입 / 예산 축 정의 + 큐레이션 조합(16종) + 자연어 키워드 사전
 */
window.OBBA = window.OBBA || {};

OBBA.SITUATIONS = [
  { id: 'date',   label: '🌸 데이트/약속 준비', reply: '오, 데이트 준비! 핑계 대지 말고 예쁘게 가야지.' },
  { id: 'tired',  label: '💻 야근 후 피로회복', reply: '아이고, 고생 많았어 ㅠㅠ 피곤할 땐 홈케어가 답이지.' },
  { id: 'travel', label: '✈️ 여행/휴가 준비',   reply: '여행 간다고? 부럽다! 사진 백 장 찍어와야지.' },
  { id: 'daily',  label: '☀️ 데일리 루틴',      reply: '매일매일 꾸준한 관리가 제일 중요한 법이지.' }
];

OBBA.CONCERNS = [
  { id: 'hydration',   label: '💧 수분/보습 팡팡' },
  { id: 'calming',     label: '🌿 트러블 긴급진정' },
  { id: 'brightening', label: '✨ 칙칙함/미백' },
  { id: 'texture',     label: '🥚 각질/결 케어' }
];

OBBA.SKIN_TYPES = [
  { id: 'dry',         label: '🌵 건성',   prefer: 'rich',   hint: '보습 장벽이 쉽게 무너져서 영양감을 꼼꼼히 채워줘야 해' },
  { id: 'oily',        label: '🫒 지성',   prefer: 'light',  hint: '유분은 덜고 속수분만 채우는 게 핵심이야' },
  { id: 'combination', label: '🌗 복합성', prefer: 'medium', hint: 'T존은 번들, U존은 건조. 가볍게 전체 → 건조한 곳만 덧바르기가 정답이야' },
  { id: 'dehydrated',  label: '💦 수부지', prefer: 'light',  hint: '겉은 번들거려도 속은 바싹. 가벼운 수분 레이어링이 답이야' },
  { id: 'sensitive',   label: '🍃 민감성', prefer: 'medium', hint: '성분 수가 적고 진정 위주인 걸로 골라야 안 뒤집어져' },
  { id: 'unknown',     label: '🤷 잘 모르겠어', prefer: null, hint: '괜찮아, 무난하게 두루 잘 맞는 걸로 골라줄게' }
];

OBBA.BUDGETS = [
  { id: 'value',   label: '💸 1만원 이하 가성비', short: '1만원 이하', max: 10000 },
  { id: 'normal',  label: '🙂 3만원 이하',        short: '3만원 이하', max: 30000 },
  { id: 'premium', label: '💎 가격보다 성능',      short: '성능 우선',   max: Infinity },
  { id: 'any',     label: '🤔 상관없어',          short: '예산 무관',   max: Infinity }
];

/** 상황 × 고민 큐레이션: 오빠의 코멘트 + 기본 추천 상품 */
OBBA.CURATION = {
  'date_hydration': {
    comment: '데이트 전날엔 화장이 쫙쫙 먹어야 하잖아? <b>히알루론산</b>이랑 <b>세라마이드</b>로 속건조 꽉 잡아주는 조합이야. 화장 절대 안 떠!',
    products: ['torriden-dive-in-serum', 'aestura-atobarrier365-cream']
  },
  'date_calming': {
    comment: '내일 데이트인데 뾰루지 났다고? 당황하지 마. 눈에 안 띄게 착 붙어서 <b>상처 회복</b>까지 도와주는 패치가 최고야.',
    products: ['oliveyoung-careplus-spot-patch']
  },
  'date_brightening': {
    comment: '안색이 환해야 예뻐 보이지! <b>비타민C</b>가 들어있어서 형광등 켠 것처럼 톤업되는 이 세럼 바르고 자봐.',
    products: ['goodal-green-tangerine-serum']
  },
  'date_texture': {
    comment: '피부결이 거칠면 베이스가 다 뜨거든. <b>갈락토미세스</b> 발효 성분이 들어간 결세럼으로 샵에서 관리받은 것처럼 만들어줄게.',
    products: ['numbuzin-no3-serum']
  },
  'tired_hydration': {
    comment: '야근하느라 수분 다 뺏겼구나. 씻고 바르기 귀찮을 땐 이거 하나 듬뿍 바르고 그냥 자! <b>슬리핑 팩</b>이 알아서 케어해줄 거야.',
    products: ['laneige-water-sleeping-mask']
  },
  'tired_calming': {
    comment: '스트레스 받아서 열 오르고 트러블 났네 ㅠㅠ <b>어성초</b> 성분 듬뿍 들어간 토너랑 팩으로 열감부터 싹 내려줄게.',
    products: ['anua-heartleaf-77-toner', 'abib-heartleaf-sticker-mask']
  },
  'tired_brightening': {
    comment: '피곤해서 다크서클 턱까지 내려오겠다. 밤사이 칙칙함을 잡아주는 <b>불가리안 로즈오일</b> 세럼으로 생기 충전하자.',
    products: ['isoi-blemish-care-up-serum']
  },
  'tired_texture': {
    comment: '클렌징도 귀찮을 만큼 피곤할 땐 <b>BHA 패드</b> 하나 쓱 꺼내서 닦아내. 피지랑 노폐물 싹 닦이고 개운할 거야.',
    products: ['stridex-sensitive-pad']
  },
  'travel_hydration': {
    comment: '비행기나 차 안은 엄청 건조해! 수시로 뿌릴 수 있는 <b>오일 미스트</b>랑, 파우치에 쏙 들어가는 미니 로션 챙겨가.',
    products: ['dalba-white-truffle-mist', 'illiyoon-ceramide-ato-lotion']
  },
  'travel_calming': {
    comment: '여행 가서 물갈이하면 어떡해. <b>시카 성분</b> 낭낭해서 피부 진정 확실하게 시켜주는 수딩 크림 무조건 챙겨야지.',
    products: ['drg-red-blemish-soothing-cream']
  },
  'travel_brightening': {
    comment: '야외활동 많은 여행엔 <b>자외선 차단</b>이 곧 미백이야. 백탁 없이 촉촉해서 덧바르기 좋은 선크림 추천할게.',
    products: ['espoir-water-splash-sun']
  },
  'travel_texture': {
    comment: '야외에서 자극받은 피부, 거칠게 스크럽하지 말고 <b>당근씨 오일</b> 들어간 도톰한 패드로 살살 달래면서 결 정돈해.',
    products: ['skinfood-carrot-pad']
  },
  'daily_hydration': {
    comment: '매일 쓰는 건 <b>수분감</b> 좋고 산뜻한 게 최고야. 올리브영 1등 자작나무 크림이랑, 세안 후에도 안 당기는 폼클렌징이야.',
    products: ['roundlab-birch-moisture-cream', 'makeprem-safe-me-cleansing-foam']
  },
  'daily_calming': {
    comment: '데일리 진정은 역시 <b>티트리</b>지. 냉장고에 넣어뒀다가 매일 저녁 하나씩 올려두면 피부 스트레스가 싹 날아가.',
    products: ['mediheal-teatree-mask']
  },
  'daily_brightening': {
    comment: '매일 꾸준히 톤업하고 싶다면 <b>나이아신아마이드</b> 성분 에센스가 좋아. 투명하고 맑은 피부 바탕을 만들어줄 거야.',
    products: ['manyo-galac-niacin-essence']
  },
  'daily_texture': {
    comment: '매일매일 탄력 잃고 처지는 피부결이 고민이라면, <b>프로바이오틱스</b> 들어간 탄력 크림으로 쫀쫀하게 기초부터 잡아봐.',
    products: ['bioheal-probioderm-lifting-cream']
  }
};

OBBA.FALLBACK = {
  comment: '어떤 상황이든 가장 기초가 탄탄해야 하는 법! <b>판테놀</b> 성분이 피부 장벽부터 튼튼하게 세워주는 만능템 하나 챙겨가.',
  products: ['bioheal-panthenol-cica-cream']
};

/**
 * 자연어 입력 → 축 매핑 사전
 *
 * 매칭 규칙 (engine.parse)
 *   1. 입력에서 공백을 지우고 비교한다 → "화장 안 먹어" 와 "화장안먹어" 를 같이 잡는다
 *   2. 걸린 단어의 길이를 점수로 더한다 → 긴 단어(=구체적)일수록 강하게 작용
 *   3. 축마다 점수가 가장 높은 후보를 고른다 → 한 문장에 여러 고민이 섞여도 주된 것을 잡는다
 *
 * [단어, 점수] 형태는 짧지만 확실한 말(가중치 ↑)이나, 짧아서 오탐이 나기 쉬운 말(가중치 ↓)에 쓴다.
 * 사람들이 실제로 쓰는 말("뒤집어졌어", "난리 났어", "화장이 안 먹어")을 넣는 게 핵심이다.
 */
OBBA.KEYWORDS = {
  situation: {
    date: ['데이트', '약속', '남친', '여친', '남자친구', '여자친구', '소개팅', '결혼식',
           '면접', '파티', '모임', '상견례', '발표', '촬영', '사진찍', '만나기로', '보러가', '썸'],
    tired: ['야근', '피로', '피곤', '밤샘', '밤새', '지쳐', '지침', '스트레스', '번아웃',
            '과로', '못잤', '잠못', '새벽까지', '시험기간', '퇴근', '녹초', '철야', '힘들어'],
    travel: ['여행', '휴가', '비행기', '바다', '캠핑', '해외', '출장', '제주', '물놀이',
             '바캉스', '호캉스', '워터파크', '등산', '캐리어', '짐쌀', '짐싸'],
    daily: ['데일리', '일상', '매일', '루틴', '평소', '꾸준히', '아침저녁', '기초케어',
            '기본템', ['기본', 2]]
  },
  concern: {
    hydration: ['수분', '보습', '건조', '당겨', '당김', '땅겨', '속건조', '푸석', '메말',
                '촉촉', '물광', '사막', '가뭄', '갈라져', '트고', '쩍쩍'],
    calming: ['트러블', '진정', '여드름', '뾰루지', '붉어', '열감', '자극', '뒤집어',
              '올라왔', '올라와', '난리', '따가', '가려', '홍조', '화농', '좁쌀',
              '오돌토돌', '성났', '성난', '빨개', '빨갛', '두드러기', '열올라', '뒤집혔'],
    brightening: ['미백', '칙칙', '잡티', '톤업', '톤정리', '기미', '다크', '화이트닝',
                  '색소', '안색', '생기없', '노랗', '누렇', '어두워', '환하게', '투명', '화사'],
    texture: ['각질', '피부결', '결정돈', '매끈', '모공', '요철', '탄력', '처짐', '거칠',
              '울퉁불퉁', '블랙헤드', '화장안먹', '화장이안', '들뜨', '번들', '피지', '개기름']
  },
  skinType: {
    dry: ['건성'],
    oily: ['지성', '유분많', '기름많'],
    combination: ['복합성', ['복합', 3]],
    dehydrated: ['수부지', '속건조성'],
    sensitive: ['민감', '예민']
  },
  budget: {
    value: ['가성비', '저렴', '싼거', '만원대', '1만', '부담없'],
    premium: ['비싸도', '좋은거', '고급', '프리미엄', '성능', '효과확실']
  }
};
