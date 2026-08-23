#!/usr/bin/env node
/**
 * 아티팩트(링크 하나로 열리는 웹페이지)용 단일 HTML 빌드.
 *
 * 개발할 때는 파일이 여러 개로 나뉘어 있는 게 편하지만, 아티팩트로 올리려면
 * CSS·JS가 전부 한 파일 안에 들어있어야 한다. 이 스크립트가 그걸 합친다.
 *
 *   npm run build:artifact   →  dist/obba.html
 *
 * 아티팩트는 게시할 때 <!doctype html><head></head><body> 껍데기를 자동으로 씌워주므로
 * 여기서는 그 안에 들어갈 알맹이만 출력한다.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html');

// 1) <body> 안쪽 마크업만 추출
const markup = html.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/\s*<script src="[^"]*"><\/script>/g, '')   // 스크립트 태그는 아래에서 인라인으로 다시 붙인다
  .trim();

// 2) index.html 이 읽는 스크립트를 순서 그대로 수집
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

// 3) 빌드된 CSS
const css = read('assets/css/obba.css');

// 4) 폰트: 저장소에 넣어둔 Pretendard 는 아티팩트에서 참조할 수 없다(외부 파일 로드 차단).
//    아티팩트가 허용하는 유일한 폰트 호스트가 Google Fonts 라서 한글 본문용으로 Noto Sans KR 을 쓴다.
const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap">';

// 5) 아티팩트 전용 보정
//    - 폰트 스택 교체
//    - 페이지 바닥(휴대폰 목업 바깥 여백)만 보는 사람의 라이트/다크 설정을 따라가게 한다.
//      휴대폰 화면 안쪽은 올리브영 브랜드 톤을 유지해야 하므로 밝은 UI 그대로 둔다.
const OVERRIDES = `
/* ---- 아티팩트 전용 보정 ---- */
:root {
  --font-sans: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, 'Malgun Gothic', sans-serif;
  --page-bg: #eef0ee;
  --page-fg: #4b5563;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --page-bg: #191b19;
    --page-fg: #9aa39a;
  }
}
:root[data-theme="dark"] {
  --page-bg: #191b19;
  --page-fg: #9aa39a;
}
body {
  background: var(--page-bg);
  color: var(--page-fg);
  padding: 0;
  flex-direction: column;
  gap: 18px;
}
/* 링크를 처음 받은 사람이 무엇인지 알 수 있게. 휴대폰이 화면을 꽉 채우는 좁은 화면에서는 숨긴다. */
.artifact-caption { display: none; }
@media (min-width: 640px) {
  /* 캡션이 들어갈 자리만큼 목업 높이를 줄인다 (원본 앱은 800px 고정) */
  .mobile-container { height: min(800px, calc(100dvh - 84px)); }
  .artifact-caption {
    display: block;
    text-align: center;
    font-size: 13px;
    line-height: 1.6;
    letter-spacing: -0.01em;
    max-width: 42ch;
  }
  .artifact-caption strong { font-weight: 700; }
  .artifact-caption span { opacity: 0.7; }
}
`;

const out = `<title>OBBA 뷰티 어시스턴트</title>
${FONT_LINK}
<style>
${css}
${OVERRIDES}</style>

${markup}

<p class="artifact-caption">
  <strong>OBBA</strong>는 올리브영에서 뭘 사야 할지 대신 골라주는 챗봇입니다.
  <span>상황과 피부 고민을 고르면 이유까지 붙여서 추천해요. 상품 링크는 올리브영으로 연결됩니다.</span>
</p>

${scripts.map(s => `<script>\n${read(s)}\n</script>`).join('\n\n')}
`;

const distDir = path.join(root, 'dist');
fs.mkdirSync(distDir, { recursive: true });
const outPath = path.join(distDir, 'obba.html');
fs.writeFileSync(outPath, out);

const kb = n => (n / 1024).toFixed(1) + 'KB';
console.log(`dist/obba.html 생성 완료 — ${kb(Buffer.byteLength(out))}`);
console.log(`  스타일 ${kb(css.length)} · 스크립트 ${scripts.length}개 인라인`);
