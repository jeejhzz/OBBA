#!/usr/bin/env node
/**
 * 자연어 인식 시험지.
 *
 * "사람이 이렇게 말하면 이렇게 알아들어야 한다"를 모아둔 목록이다.
 * 못 알아듣는 말을 발견하면 여기에 한 줄 추가하고, 사전(flows.js KEYWORDS)을 고친 뒤
 * npm test 로 다른 게 망가지지 않았는지 확인하면 된다.
 *
 * 표기: null = 그 축은 인식되지 않아야 함 / undefined(생략) = 무엇이든 상관없음
 */
const fs = require('fs');
const path = require('path');

globalThis.window = globalThis;
['data/catalog.js', 'data/flows.js', 'core/engine.js'].forEach(f => {
  eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8'));
});

const CASES = [
  // --- 고민만 말하는 경우 (제일 흔하다) ---
  ['피부 완전 난리 났어',            { concern: 'calming' }],
  ['얼굴 뒤집어졌어',                { concern: 'calming' }],
  ['턱에 뾰루지 올라왔어',           { concern: 'calming' }],
  ['볼이 빨갛게 성났어',             { concern: 'calming' }],
  ['좁쌀 여드름 때문에 미치겠다',     { concern: 'calming' }],
  ['피부가 따갑고 가려워',           { concern: 'calming' }],
  ['속당김이 너무 심해',             { concern: 'hydration' }],
  ['볼이 쩍쩍 갈라져',               { concern: 'hydration' }],
  ['얼굴이 사막이야',                { concern: 'hydration' }],
  ['푸석푸석해',                     { concern: 'hydration' }],
  ['안색이 너무 칙칙해',             { concern: 'brightening' }],
  ['잡티가 늘었어',                  { concern: 'brightening' }],
  ['얼굴이 누렇게 떠',               { concern: 'brightening' }],
  ['화장이 안 먹어',                 { concern: 'texture' }],
  ['화장안먹어',                     { concern: 'texture' }],
  ['모공이 너무 커',                 { concern: 'texture' }],
  ['각질이 일어나',                  { concern: 'texture' }],
  ['개기름 장난 아니야',             { concern: 'texture' }],

  // --- 상황만 말하는 경우 ---
  ['내일 소개팅 있어',               { situation: 'date' }],
  ['남친이랑 약속 있어',             { situation: 'date' }],
  ['주말에 결혼식 가',               { situation: 'date' }],
  ['어제 밤새고 왔어',               { situation: 'tired' }],
  ['요즘 야근이 너무 많아',          { situation: 'tired' }],
  ['퇴근하고 너무 피곤해',           { situation: 'tired' }],
  ['다음주에 제주도 가',             { situation: 'travel' }],
  ['휴가 때 쓸 거 챙기려고',         { situation: 'travel' }],
  ['캐리어에 넣을 거 추천해줘',      { situation: 'travel' }],
  ['매일 쓸 기초 찾고 있어',         { situation: 'daily' }],

  // --- 상황 + 고민을 한 번에 ---
  ['내일 소개팅인데 뾰루지 올라왔어', { situation: 'date',   concern: 'calming' }],
  ['밤새고 왔더니 개기름',            { situation: 'tired',  concern: 'texture' }],
  ['여행 갈 때 트러블',               { situation: 'travel', concern: 'calming' }],
  ['비행기 타면 너무 건조해',         { situation: 'travel', concern: 'hydration' }],
  ['데이트 전날인데 화장이 안 먹어',  { situation: 'date',   concern: 'texture' }],
  ['매일 쓸 미백 제품',               { situation: 'daily',  concern: 'brightening' }],

  // --- 피부타입 / 예산까지 ---
  ['나 지성인데 야근하고 와서 트러블 났어 가성비로',
    { situation: 'tired', concern: 'calming', skinType: 'oily', budget: 'value' }],
  ['복합성인데 여행 갈 때 진정 제품',
    { situation: 'travel', concern: 'calming', skinType: 'combination' }],
  ['건성이라 속건조가 심해',          { concern: 'hydration', skinType: 'dry' }],
  ['민감해서 자극 없는 걸로',         { concern: 'calming', skinType: 'sensitive' }],
  ['수부지인데 비싸도 좋은거',        { skinType: 'dehydrated', budget: 'premium' }],
  ['저렴한 걸로 부탁해',              { budget: 'value' }],

  // --- 띄어쓰기가 제각각이어도 ---
  ['여행갈때트러블',                  { situation: 'travel', concern: 'calming' }],
  ['내일  데이트   인데  건조해',     { situation: 'date', concern: 'hydration' }],

  // --- 오타가 나도 알아들어야 하는 것 ---
  ['트러불 났어',                     { concern: 'calming' }],
  ['여드럼 심해',                     { concern: 'calming' }],
  ['뾰루찌 올라옴',                   { concern: 'calming' }],
  ['건조헤서 죽겠어',                 { concern: 'hydration' }],
  ['여행깔 때 쓸 거',                 { situation: 'travel' }],
  ['칙칙헤',                          { concern: 'brightening' }],

  // --- 못 알아들어야 정상인 것 (엉뚱한 추천을 하면 안 된다) ---
  ['ㅁㄴㅇㄹ',                        { situation: null, concern: null }],
  ['오늘 점심 뭐 먹지',               { situation: null, concern: null }],
  ['안녕',                            { situation: null, concern: null }],
  ['배고파',                          { situation: null, concern: null }],
  ['고마워',                          { situation: null, concern: null }],
  ['내일 회의 있어',                  { situation: null, concern: null }],
  ['주말에 영화 보러 갈까',           { situation: null, concern: null }],
  ['노래 추천해줘',                   { situation: null, concern: null }],
];

let pass = 0;
const fails = [];

CASES.forEach(([text, want]) => {
  const got = OBBA.Engine.parse(text);
  const wrong = [];
  ['situation', 'concern', 'skinType', 'budget'].forEach(axis => {
    if (!(axis in want)) return;
    const expected = want[axis];
    const actual = got[axis + 'Id'];
    if (actual !== expected) {
      wrong.push(`${axis}: ${actual === null ? '못 알아들음' : actual} (기대: ${expected === null ? '못 알아들어야 함' : expected})`);
    }
  });
  if (wrong.length) fails.push({ text, wrong, hits: got.hits });
  else pass++;
});

console.log(`자연어 인식 ${pass}/${CASES.length} 통과`);
if (fails.length) {
  console.error('');
  fails.forEach(f => {
    console.error(`  ✗ "${f.text}"`);
    f.wrong.forEach(w => console.error(`      ${w}`));
    console.error(`      걸린 단어: ${JSON.stringify(f.hits)}`);
  });
  process.exit(1);
}
