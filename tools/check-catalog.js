#!/usr/bin/env node
/**
 * 카탈로그/큐레이션 스키마 검사기.
 * 시트나 외부 피드로 데이터 출처를 옮겨도 이 검사만 통과하면 엔진은 동작한다.
 *   npm test
 */
const fs = require('fs');
const path = require('path');

globalThis.window = globalThis;
['data/catalog.js', 'data/flows.js', 'core/engine.js'].forEach(f => {
  const p = path.join(__dirname, '..', 'assets', 'js', f);
  // 브라우저용 스크립트를 그대로 평가한다 (빌드 단계를 두지 않기 위해)
  eval(fs.readFileSync(p, 'utf8'));
});

const STEPS = ['cleanser','toner','pad','essence','serum','mask','patch','lotion','cream','mist','sleeping','sun'];
const TEXTURES = ['light','medium','rich'];
const SKIN = ['dry','oily','combination','sensitive','dehydrated','normal'];
const CONCERNS = ['hydration','calming','brightening','texture','elasticity','sebum','sun'];
const SITUATIONS = ['date','tired','travel','daily'];

const errors = [];
const warnings = [];
const seen = new Set();

function check(cond, msg, bucket) { if (!cond) (bucket || errors).push(msg); }

OBBA.CATALOG.forEach((p, i) => {
  const at = `catalog[${i}] ${p.id || '(id 없음)'}`;
  check(typeof p.id === 'string' && p.id, `${at}: id 필요`);
  check(!seen.has(p.id), `${at}: id 중복`);
  seen.add(p.id);
  ['brand','name','target','point','searchQuery'].forEach(f =>
    check(typeof p[f] === 'string' && p[f].trim(), `${at}: ${f} 필요`));
  check(STEPS.includes(p.step), `${at}: step "${p.step}" 은 허용값이 아님`);
  check(TEXTURES.includes(p.texture), `${at}: texture "${p.texture}" 은 허용값이 아님`);
  check(Number.isFinite(p.price) && p.price > 0, `${at}: price 는 양수여야 함`);
  check(Number.isFinite(p.listPrice) && p.listPrice >= p.price, `${at}: listPrice >= price 여야 함`);
  check(Array.isArray(p.skinTypes) && p.skinTypes.length, `${at}: skinTypes 비어있음`);
  (p.skinTypes || []).forEach(v => check(SKIN.includes(v), `${at}: 알 수 없는 skinType "${v}"`));
  check(Array.isArray(p.concerns) && p.concerns.length, `${at}: concerns 비어있음`);
  (p.concerns || []).forEach(v => check(CONCERNS.includes(v), `${at}: 알 수 없는 concern "${v}"`));
  check(Array.isArray(p.situations) && p.situations.length, `${at}: situations 비어있음`);
  (p.situations || []).forEach(v => check(SITUATIONS.includes(v), `${at}: 알 수 없는 situation "${v}"`));
  check(p.goodsNo === null || /^[A-Za-z0-9]+$/.test(String(p.goodsNo || '')), `${at}: goodsNo 형식 이상`);
  check(p.goodsNo !== null, `${at}: goodsNo 미확보 → 검색 딥링크로 폴백`, warnings);
});

// 큐레이션이 존재하는 상품만 참조하는지
Object.entries(OBBA.CURATION).forEach(([key, v]) => {
  check(typeof v.comment === 'string' && v.comment.trim(), `curation[${key}]: comment 필요`);
  (v.products || []).forEach(id => check(OBBA.byId(id), `curation[${key}]: 없는 상품 "${id}"`));
});
OBBA.FALLBACK.products.forEach(id => check(OBBA.byId(id), `fallback: 없는 상품 "${id}"`));

// 16조합 전부 비교 가능한 개수(2개 이상)를 내놓는지
OBBA.SITUATIONS.forEach(s => OBBA.CONCERNS.forEach(c => {
  const key = `${s.id}_${c.id}`;
  check(OBBA.CURATION[key], `curation: ${key} 조합 없음`);
  const n = OBBA.Engine.recommend({ situationId: s.id, concernId: c.id, profile: {} }).products.length;
  check(n >= 2, `engine: ${key} 추천이 ${n}개 (비교 뷰가 동작하려면 2개 이상)`);
}));

console.log(`상품 ${OBBA.CATALOG.length}종 · 큐레이션 ${Object.keys(OBBA.CURATION).length}조합 검사`);
if (warnings.length) {
  console.log(`\n경고 ${warnings.length}건`);
  warnings.slice(0, 5).forEach(w => console.log('  ! ' + w));
  if (warnings.length > 5) console.log(`  ... 외 ${warnings.length - 5}건`);
}
if (errors.length) {
  console.error(`\n실패 ${errors.length}건`);
  errors.forEach(e => console.error('  ✗ ' + e));
  process.exit(1);
}
console.log('\n통과 ✓');
