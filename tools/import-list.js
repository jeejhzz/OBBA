#!/usr/bin/env node
/**
 * 사람이 정리한 베스트셀러 목록 → OBBA 카탈로그 시트 형식으로 변환한다.
 *   node tools/import-list.js docs/incoming/<파일>.csv
 *
 * 자동으로 되는 것:  카테고리→단계, 피부고민→고민/피부타입, 링크→상품번호, 브랜드 표기 정리
 * 사람이 채워야 하는 것: 정가/판매가, 상황(데이트/야근/여행/데일리), 제형(가벼움/보통/쫀쫀함)
 *
 * 지어내지 않는다. 모르는 값은 비워두고 무엇이 비었는지 보고한다.
 */
const fs = require('fs');
const path = require('path');

globalThis.window = globalThis;
['data/catalog.js', 'data/flows.js', 'data/source.js'].forEach(f =>
  eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8')));

const parseCsv = OBBA.SheetSource.parseCsv;

const STEP_FROM_CATEGORY = {
  '토너': '토너', '스킨': '토너', '토너패드': '토너패드', '패드': '토너패드',
  '세럼/앰플': '세럼', '세럼': '세럼', '앰플': '세럼', '에센스': '에센스',
  '로션/에멀전': '로션', '로션': '로션', '에멀전': '로션',
  '크림': '크림', '마스크팩': '마스크팩', '패치': '패치', '미스트': '미스트',
  '슬리핑팩': '슬리핑팩', '선크림': '선크림', '클렌징': '클렌징'
};

// 현재 추천 축(수분/진정/미백/결)으로 매핑할 수 없는 카테고리
const OUT_OF_SCOPE = /^립|틴트|밤$|메이크업|향수|헤어|바디/;

const CONCERN_RULES = [
  // 피부타입만 적혀 있어도(예: "극건성", "복합성") 그 타입이 겪는 대표 고민으로 연결한다
  ['수분', ['수분', '건조', '보습', '속당김', '영양', '생기', '꿀광', '건성', '복합성', '수부지']],
  ['진정', ['트러블', '진정', '민감', '열감', '장벽', '좁쌀', '흔적', '가려움', '손상', '홍조']],
  ['미백', ['미백', '잡티', '칙칙', '기미', '주근깨', '색소', '톤']],
  ['결',   ['각질', '결', '모공', '요철', '매끈', '푸석']],
  ['탄력', ['탄력', '노화', '늘어짐', '저하', '리프팅']],
  ['피지', ['피지']]
];

const SKIN_RULES = [
  ['건성', ['건성']],
  ['지성', ['지성']],
  ['복합성', ['복합성']],
  ['민감성', ['민감']],
  ['수부지', ['수부지']]
];

function applyRules(text, rules) {
  const out = [];
  rules.forEach(([label, keywords]) => {
    if (keywords.some(k => text.includes(k)) && !out.includes(label)) out.push(label);
  });
  return out;
}

/** "아누아(Anua)" → "Anua" (괄호 안 표기를 카드에 쓴다). 괄호가 없으면 그대로. */
function cleanBrand(raw) {
  const m = String(raw).match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  return m ? { display: m[2].trim(), korean: m[1].trim() } : { display: String(raw).trim(), korean: '' };
}

/** 용량·공백을 지운 비교용 이름 */
function normName(s) {
  return String(s).toLowerCase().replace(/\s+/g, '').replace(/\d+(ml|g|매|개|호)\b/g, '');
}

function findExisting(brandDisplay, name) {
  const n = normName(name);
  return OBBA.CATALOG.find(p => {
    const pn = normName(p.name);
    return pn === n || pn.includes(n) || n.includes(pn);
  }) || null;
}

/* ---------------- 실행 ---------------- */

const inputPath = process.argv[2] || 'docs/incoming/bestsellers-2026-08.csv';
const rows = parseCsv(fs.readFileSync(path.join(__dirname, '..', inputPath), 'utf8'));
const header = rows[0].map(h => h.replace(/﻿/g, '').trim());
const col = name => header.indexOf(name);

const idx = {
  category: col('카테고리'), brand: col('브랜드'), name: col('제품명'),
  concern: col('추천대상_피부고민'), point: col('핵심포인트'), link: col('상품링크')
};

const HEADERS = ['고유번호','사용여부','브랜드','제품명','단계','정가','판매가','올리브영링크',
  '제형','피부타입','고민','상황','이런분께','핵심포인트','태그'];

const out = [];
const report = { imported: 0, merged: [], outOfScope: [], noConcern: [], needsPrice: 0, needsSituation: 0 };

rows.slice(1).forEach(cells => {
  if (!cells.join('').trim()) return;

  const category = (cells[idx.category] || '').trim();
  const rawBrand = (cells[idx.brand] || '').trim();
  const name = (cells[idx.name] || '').trim();
  const concernText = (cells[idx.concern] || '').trim();
  const point = (cells[idx.point] || '').trim();
  const link = (cells[idx.link] || '').trim();

  if (OUT_OF_SCOPE.test(category)) {
    report.outOfScope.push(`${rawBrand} ${name}`);
    return;
  }

  const step = STEP_FROM_CATEGORY[category];
  if (!step) { report.outOfScope.push(`${rawBrand} ${name} (알 수 없는 카테고리: ${category})`); return; }

  const concerns = applyRules(concernText, CONCERN_RULES);
  if (!concerns.length) { report.noConcern.push(`${rawBrand} ${name} — "${concernText}"`); return; }

  const skinTypes = applyRules(concernText, SKIN_RULES);
  const brand = cleanBrand(rawBrand);
  const existing = findExisting(brand.display, name);

  if (existing) report.merged.push(`${existing.brand} ${existing.name} ← ${rawBrand} ${name}`);

  // "트러블/민감성" → "트러블·민감성 피부" (그 사람이 적은 말을 그대로 쓴다)
  const target = concernText.replace(/\//g, '·') + ' 피부';

  out.push([
    existing ? existing.id : '',
    'Y',
    brand.display,
    name,
    step,
    existing ? existing.listPrice : '',
    existing ? existing.price : '',
    link,
    existing ? { light:'가벼움', medium:'보통', rich:'쫀쫀함' }[existing.texture] : '',
    skinTypes.join(' / '),
    concerns.join(' / '),
    existing ? existing.situations.map(s => ({date:'데이트',tired:'야근',travel:'여행',daily:'데일리'})[s]).join(' / ') : '',
    target,
    point,
    brand.korean ? '#' + brand.korean : ''
  ]);

  report.imported++;
  if (!existing) { report.needsPrice++; report.needsSituation++; }
});

function cell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const csv = '﻿' + [HEADERS, ...out].map(r => r.map(cell).join(',')).join('\n') + '\n';
const outPath = path.join(__dirname, '..', 'docs', 'catalog-import.csv');
fs.writeFileSync(outPath, csv);

console.log(`docs/catalog-import.csv 생성 — ${report.imported}종 변환\n`);
console.log(`기존 상품과 겹쳐서 갱신되는 것: ${report.merged.length}종`);
report.merged.forEach(m => console.log('   · ' + m));
console.log(`\n새로 추가되는 것: ${report.imported - report.merged.length}종`);
console.log(`\n사람이 채워야 하는 칸`);
console.log(`   정가/판매가 비어 있음: ${report.needsPrice}종`);
console.log(`   상황(데이트/야근/여행/데일리) 비어 있음: ${report.needsSituation}종`);
console.log(`   제형(가벼움/보통/쫀쫀함) 비어 있음: ${report.needsSituation}종`);
if (report.outOfScope.length) {
  console.log(`\n지금 추천 로직 밖이라 제외: ${report.outOfScope.length}종`);
  report.outOfScope.slice(0, 3).forEach(m => console.log('   · ' + m));
  if (report.outOfScope.length > 3) console.log(`   · ... 외 ${report.outOfScope.length - 3}종`);
}
if (report.noConcern.length) {
  console.log(`\n고민을 못 알아봐서 제외: ${report.noConcern.length}종`);
  report.noConcern.forEach(m => console.log('   · ' + m));
}
