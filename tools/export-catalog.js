#!/usr/bin/env node
/**
 * 지금 카탈로그를 스프레드시트용 CSV로 내보낸다.
 *   npm run export
 * 사람이 채우기 쉽도록 열 이름과 값을 전부 한국어로 쓴다.
 * 이 CSV 를 구글 시트에 올려서 아래로 계속 추가하면 그대로 앱이 읽어간다.
 */
const fs = require('fs');
const path = require('path');

globalThis.window = globalThis;
['data/catalog.js', 'data/flows.js'].forEach(f =>
  eval(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', f), 'utf8')));

const STEP_KO = { cleanser:'클렌징', toner:'토너', pad:'토너패드', essence:'에센스', serum:'세럼',
  mask:'마스크팩', patch:'패치', lotion:'로션', cream:'크림', mist:'미스트', sleeping:'슬리핑팩', sun:'선크림' };
const TEXTURE_KO = { light:'가벼움', medium:'보통', rich:'쫀쫀함' };
const SKIN_KO = { dry:'건성', oily:'지성', combination:'복합성', sensitive:'민감성', dehydrated:'수부지', normal:'보통' };
const CONCERN_KO = { hydration:'수분', calming:'진정', brightening:'미백', texture:'결',
  elasticity:'탄력', sebum:'피지', sun:'자외선' };
const SITUATION_KO = { date:'데이트', tired:'야근', travel:'여행', daily:'데일리' };

const HEADERS = ['고유번호','사용여부','브랜드','제품명','단계','정가','판매가','올리브영링크',
  '제형','피부타입','고민','상황','이런분께','핵심포인트','태그'];

function cell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const rows = OBBA.CATALOG.map(p => [
  p.id,
  'Y',
  p.brand,
  p.name,
  STEP_KO[p.step] || p.step,
  p.listPrice,
  p.price,
  p.goodsNo ? `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${p.goodsNo}` : '',
  TEXTURE_KO[p.texture] || p.texture,
  p.skinTypes.map(v => SKIN_KO[v] || v).join(' / '),
  p.concerns.map(v => CONCERN_KO[v] || v).join(' / '),
  p.situations.map(v => SITUATION_KO[v] || v).join(' / '),
  p.target,
  p.point,
  p.tags.join(' ')
]);

// 엑셀/구글시트가 한글을 깨지 않게 BOM 을 붙인다
const csv = '﻿' + [HEADERS, ...rows].map(r => r.map(cell).join(',')).join('\n') + '\n';

const outPath = path.join(__dirname, '..', 'docs', 'catalog-template.csv');
fs.writeFileSync(outPath, csv);
console.log(`docs/catalog-template.csv — 상품 ${rows.length}종 내보냄`);
