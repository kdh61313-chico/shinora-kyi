// 꽥꽥 마피아 - 픽셀아트 스프라이트 (모두 코드로 직접 찍은 도트)
// 문자 하나 = 픽셀 하나. palette 문자로 색을 지정한다.

export const COLORS = [
  { id: 'white',  name: '흰색',   b: '#f4f1e8', d: '#c9c2b0' },
  { id: 'red',    name: '빨강',   b: '#e8484a', d: '#a82a36' },
  { id: 'blue',   name: '파랑',   b: '#3f7de8', d: '#2a51a8' },
  { id: 'green',  name: '초록',   b: '#4cbf56', d: '#2e8541' },
  { id: 'yellow', name: '노랑',   b: '#f5d547', d: '#c9a12a' },
  { id: 'pink',   name: '분홍',   b: '#f58cc0', d: '#c45c94' },
  { id: 'orange', name: '주황',   b: '#f58a3a', d: '#c45d22' },
  { id: 'purple', name: '보라',   b: '#9a5ce0', d: '#6a3aa8' },
  { id: 'cyan',   name: '하늘',   b: '#5fd7e8', d: '#3196b0' },
  { id: 'brown',  name: '갈색',   b: '#a8744a', d: '#704a2e' },
  { id: 'gray',   name: '회색',   b: '#9aa0aa', d: '#6a707c' },
  { id: 'black',  name: '검정',   b: '#4a4552', d: '#2c2833' },
  { id: 'lime',   name: '연두',   b: '#b6eb52', d: '#7fb02e' },
  { id: 'mint',   name: '민트',   b: '#7ee8b8', d: '#45b085' },
  { id: 'navy',   name: '남색',   b: '#3a4a9a', d: '#262f6a' },
  { id: 'rose',   name: '장미',   b: '#c0385e', d: '#86223f' },
];

const BASE_PAL = {
  o: '#2a1d2e', e: '#1a1020', w: '#ffffff', y: '#f7a531', Y: '#c9701a', p: '#f08aa0',
};

// 거위 본체 (16x20) - 오른쪽을 바라봄
const GOOSE_IDLE = [
  '................',
  '........oooo....',
  '.......obbbbo...',
  '.......obbbbbo..',
  '.......obbbebyo.',
  '.......obbbebyyo',
  '.......obpbbYYo.',
  '........obbboo..',
  '........obbo....',
  '...oo...obbo....',
  '..obbo.obbbbo...',
  '..obbbbbbbbbbo..',
  '.obbbbbbbbbbbbo.',
  '.obdbbbbbbbbbbo.',
  '.obddddbbbbbbdo.',
  '..obbddddddbdo..',
  '...odbbbbbbddo..',
  '....oooooooo....',
  '.....yo...yo....',
  '....yyy..yyy....',
];
const GOOSE_WALK = [
  '................',
  '................',
  '........oooo....',
  '.......obbbbo...',
  '.......obbbbbo..',
  '.......obbbebyo.',
  '.......obbbebyyo',
  '.......obpbbYYo.',
  '........obbboo..',
  '...oo...obbo....',
  '..obbo.obbbbo...',
  '..obbbbbbbbbbo..',
  '.obbbbbbbbbbbbo.',
  '.obdbbbbbbbbbbo.',
  '.obddddbbbbbbdo.',
  '..obbddddddbdo..',
  '...odbbbbbbddo..',
  '....oooooooo....',
  '......yo.yo.....',
  '.....yyyyyy.....',
];
// 쓰러진 거위 (시체) 20x12
const GOOSE_DEAD = [
  '....................',
  '....................',
  '.............oooo...',
  '..oo........obbbbo..',
  '.obbo..ooooobxbxbyo.',
  '.obbbooobbbbbbxbbyyo',
  'obbbbbbbbbbbbxbxbYo.',
  'obdbbbbbbbbbobbbbo..',
  'obddddbbbbbbo.oooo..',
  '.obbddddddbdo.......',
  '..oooooooooo.yy.....',
  '..........yy........',
];
// 유령 (반투명으로 그림)
const GOOSE_GHOST = [
  '................',
  '........oooo....',
  '.......obbbbo...',
  '.......obbbbbo..',
  '.......obbbebyo.',
  '.......obbbebyyo',
  '.......obbbbYYo.',
  '........obbboo..',
  '........obbo....',
  '...oo...obbo....',
  '..obbo.obbbbo...',
  '..obbbbbbbbbbo..',
  '.obbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbo.',
  '..obbbbbbbbbbo..',
  '..obbobbobbobo..',
  '...oo.oo.oo.o...',
  '................',
  '................',
];

// 모자: 24행 캔버스(거위가 4행 아래에서 시작) 기준 상단 오버레이
export const HATS = [
  { id: 'none', name: '없음', rows: [] },
  { id: 'crown', name: '왕관', pal: { Y: '#d99a1c', y: '#ffd84a', r: '#e8484a', c: '#5fd7e8' }, rows: [
    '................',
    '................',
    '........Y.Y.Y...',
    '........yYyYy...',
    '........yrycy...',
    '........YYYYY...',
  ] },
  { id: 'beanie', name: '비니', pal: { a: '#3f7de8', A: '#2a51a8', w: '#f4f1e8' }, rows: [
    '................',
    '..........ww....',
    '.........wwww...',
    '........aaaaa...',
    '.......aAaAaAa..',
    '.......AAAAAAA..',
  ] },
  { id: 'straw', name: '밀짚모자', pal: { s: '#f0cf72', S: '#c9a24a', r: '#e8484a' }, rows: [
    '................',
    '................',
    '........SSSS....',
    '........ssss....',
    '........rrrr....',
    '.....SsssssssS..',
  ] },
  { id: 'tophat', name: '실크햇', pal: { k: '#2c2833', K: '#15121a', r: '#c0385e' }, rows: [
    '........kkkk....',
    '........kkkk....',
    '........kkkk....',
    '........rrrr....',
    '........kkkk....',
    '......KKKKKKKK..',
  ] },
  { id: 'bow', name: '리본', pal: { p: '#f58cc0', P: '#c45c94' }, rows: [
    '................',
    '................',
    '................',
    '.......PP..PP...',
    '.......pppPppp..',
    '.......PP..PP...',
  ] },
  { id: 'sprout', name: '새싹', pal: { g: '#4cbf56', G: '#2e8541' }, rows: [
    '................',
    '................',
    '.........gg.....',
    '........gGGg....',
    '..........G.....',
    '..........G.....',
  ] },
  { id: 'wizard', name: '마법사', pal: { v: '#6a3aa8', V: '#4a2878', y: '#ffd84a' }, rows: [
    '...........v....',
    '..........vv....',
    '.........vvy....',
    '.........vvvv...',
    '........vyvvvv..',
    '.......VVVVVVVV.',
  ] },
  { id: 'chef', name: '요리사', pal: { w: '#ffffff', g: '#d6d6e0' }, rows: [
    '........wwww....',
    '.......wwwwww...',
    '.......wwgwww...',
    '........wwww....',
    '........gggg....',
    '................',
  ] },
  { id: 'helmet', name: '헬멧', pal: { h: '#d6d6e0', H: '#9aa0aa', l: '#e8484a' }, rows: [
    '................',
    '..........l.....',
    '.........hhh....',
    '.......hhhhhhh..',
    '.......hHHHHHh..',
    '.......H.....H..',
  ] },
  { id: 'pirate', name: '해적', pal: { k: '#2c2833', w: '#f4f1e8' }, rows: [
    '................',
    '................',
    '.........kkk....',
    '.......kkkwkkk..',
    '......kkkkkkkkk.',
    '................',
  ] },
  { id: 'cat', name: '고양이귀', pal: { k: '#4a4552', p: '#f08aa0' }, rows: [
    '................',
    '................',
    '................',
    '.......k....k...',
    '.......kk..kpk..',
    '.......kpk.kkk..',
  ] },
  { id: 'headphone', name: '헤드폰', pal: { k: '#2c2833', r: '#e8484a' }, rows: [
    '................',
    '................',
    '........kkkk....',
    '.......k....k...',
    '................',
    '................',
  ], extra: [ // 귀 부분은 머리 옆
    [6, 8, 'rr'], [6, 9, 'rr'], [13, 8, 'rr'], [13, 9, 'rr'],
  ], extraPal: { r: '#e8484a' } },
  { id: 'flower', name: '꽃', pal: { r: '#e8484a', y: '#ffd84a', g: '#4cbf56' }, rows: [
    '................',
    '................',
    '..........r.....',
    '.........ryr....',
    '..........r.....',
    '..........g.....',
  ] },
  { id: 'party', name: '파티모자', pal: { a: '#5fd7e8', b: '#f58cc0', y: '#ffd84a' }, rows: [
    '..........y.....',
    '.........aa.....',
    '.........bb.....',
    '........aaaa....',
    '........bbbb....',
    '.......aaaaaa...',
  ] },
  { id: 'halo', name: '천사링', pal: { y: '#ffd84a', Y: '#d99a1c' }, rows: [
    '................',
    '........yyyy....',
    '.......Y....Y...',
    '........yyyy....',
    '................',
    '................',
  ] },
];

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

export function paint(ctx, rows, pal, ox = 0, oy = 0) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const col = pal[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

const cache = new Map();
// kind: 'idle' | 'walk' | 'dead' | 'ghost'
export function gooseSprite(colorIdx, hatIdx, kind = 'idle', flip = false) {
  const key = `${colorIdx}|${hatIdx}|${kind}|${flip}`;
  if (cache.has(key)) return cache.get(key);
  const col = COLORS[colorIdx % COLORS.length];
  const pal = { ...BASE_PAL, b: col.b, d: col.d };
  let c;
  if (kind === 'dead') {
    c = makeCanvas(20, 12);
    const ctx = c.getContext('2d');
    paint(ctx, GOOSE_DEAD, { ...pal, x: '#1a1020' });
    // 피 웅덩이 대신 깃털 몇 개
    ctx.fillStyle = col.b; ctx.fillRect(3, 11, 1, 1); ctx.fillRect(16, 10, 1, 1);
  } else {
    c = makeCanvas(16, 24);
    const ctx = c.getContext('2d');
    const body = kind === 'walk' ? GOOSE_WALK : kind === 'ghost' ? GOOSE_GHOST : GOOSE_IDLE;
    const bob = kind === 'walk' ? 1 : 0;
    paint(ctx, body, kind === 'ghost' ? { ...pal, p: col.b } : pal, 0, 4);
    const hat = HATS[hatIdx % HATS.length];
    if (hat && hat.rows.length) {
      paint(ctx, hat.rows, hat.pal, 0, bob);
      if (hat.extra) for (const [x, y, s] of hat.extra) paint(ctx, [s], hat.extraPal, x, y + 4 + bob);
    }
  }
  if (flip) {
    const f = makeCanvas(c.width, c.height);
    const fx = f.getContext('2d');
    fx.translate(c.width, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
    c = f;
  }
  cache.set(key, c);
  return c;
}

// ---------- 맵 소품 ----------
const PROP_DEFS = {
  console: { w: 16, h: 16, pal: { o: '#1c1824', m: '#5a6070', M: '#3c4150', s: '#3cf0a0', S: '#1fa070', k: '#22202a', r: '#e8484a', y: '#ffd84a' }, rows: [
    '................',
    '..oooooooooooo..',
    '..oMMMMMMMMMMo..',
    '..oMssSssssSMo..',
    '..oMsSsssSssMo..',
    '..oMssssSsssMo..',
    '..oMMMMMMMMMMo..',
    '..oooooooooooo..',
    '.....oMMMMo.....',
    '.oooooooooooooo.',
    '.ommmmmmmmmmmmo.',
    '.omrmymkmkmkmmo.',
    '.ommmmmmmmmmmmo.',
    '.oMMMMMMMMMMMMo.',
    '.oooooooooooooo.',
    '................'] },
  button: { w: 16, h: 16, pal: { o: '#1c1824', g: '#9aa0aa', G: '#6a707c', r: '#e8484a', R: '#a82a36', w: '#ffb0b0' }, rows: [
    '................',
    '................',
    '.....oooooo.....',
    '....orrwrrro....',
    '...orrwrrrrro...',
    '...oRrrrrrrRo...',
    '...ooRRRRRRoo...',
    '..oggggggggggo..',
    '..oggggggggggo..',
    '..oGGGGGGGGGGo..',
    '...oggggggggo...',
    '...oggggggggo...',
    '...oGGGGGGGGo...',
    '..oggggggggggo..',
    '..oGGGGGGGGGGo..',
    '..oooooooooooo..'] },
  bell: { w: 16, h: 16, pal: { o: '#2a1d2e', y: '#ffd84a', Y: '#c9a12a', w: '#fff3b0', b: '#8a5a32', B: '#5c3a20' }, rows: [
    '.bbbbbbbbbbbbbb.',
    '.bBBBBBBBBBBBBb.',
    '.b.....oo.....b.',
    '.b....oyyo....b.',
    '.b...oywyyo...b.',
    '.b...oywyyo...b.',
    '.b..oywyyyyo..b.',
    '.b..oyyyyyyo..b.',
    '.b.oYYYYYYYYo.b.',
    '.b..oooooooo..b.',
    '.b.....oo.....b.',
    '.b............b.',
    '.b............b.',
    'bBb..........bBb',
    'bBb..........bBb',
    'bbb..........bbb'] },
  vent: { w: 16, h: 16, pal: { o: '#1c1824', g: '#7a8090', G: '#4a5060', k: '#15121a' }, rows: [
    '................',
    '................',
    '.oooooooooooooo.',
    '.oggggggggggggo.',
    '.ogkkkkkkkkkkGo.',
    '.oggggggggggggo.',
    '.ogkkkkkkkkkkGo.',
    '.oggggggggggggo.',
    '.ogkkkkkkkkkkGo.',
    '.oggggggggggggo.',
    '.ogkkkkkkkkkkGo.',
    '.oGGGGGGGGGGGGo.',
    '.oooooooooooooo.',
    '................',
    '................',
    '................'] },
  hole: { w: 16, h: 16, pal: { o: '#2a1d2e', b: '#8a5a32', B: '#5c3a20', k: '#120c10', s: '#e0c070' }, rows: [
    '................',
    '................',
    '....ssssssss....',
    '..sssbbbbbbsss..',
    '.ssbbBBBBBBbbss.',
    '.sbBkkkkkkkkBbs.',
    '.sbBkkkkkkkkBbs.',
    '.sbBkkkkkkkkBbs.',
    '.ssbBkkkkkkBbss.',
    '..ssbbBBBBbbss..',
    '....ssssssss....',
    '................',
    '................',
    '................',
    '................',
    '................'] },
  crate: { w: 16, h: 16, pal: { o: '#2a1d2e', b: '#b07a42', B: '#7a5028', l: '#d09a5a' }, rows: [
    '................',
    '.oooooooooooooo.',
    '.olllllllllllBo.',
    '.olBBBBBBBBBBBo.',
    '.olBb.......bBo.',
    '.olBbb.....bbBo.',
    '.olB.bb...bb.Bo.',
    '.olB..bb.bb..Bo.',
    '.olB...bbb...Bo.',
    '.olB..bb.bb..Bo.',
    '.olB.bb...bb.Bo.',
    '.olBbb.....bbBo.',
    '.olBb.......bBo.',
    '.olBBBBBBBBBBBo.',
    '.oooooooooooooo.',
    '................'].map(r => r.replace(/\./g, 'b')).map((r, i) => (i === 0 || i === 15) ? '................' : r) },
  plant: { w: 16, h: 16, pal: { o: '#1c2a1c', g: '#4cbf56', G: '#2e8541', p: '#c45d22', P: '#8a3a18' }, rows: [
    '......gg........',
    '...g.gGgg..g....',
    '..gGg.gGg.gGg...',
    '...gGgGgGgGg....',
    '.gg.gGGgGGg.gg..',
    '.gGGgGgGgGgGGg..',
    '..ggGGgGgGGgg...',
    '....gGgGgGg.....',
    '.....GgGgG......',
    '....oooooooo....',
    '....oppppppo....',
    '....oPppppPo....',
    '.....oppppo.....',
    '.....oPPPPo.....',
    '.....oooooo.....',
    '................'] },
  tree: { w: 16, h: 24, pal: { o: '#1c2a1c', g: '#4cbf56', G: '#2e8541', l: '#7ee07a', t: '#8a5a32', T: '#5c3a20' }, rows: [
    '.....oooooo.....',
    '...ooggllggoo...',
    '..oggllllgggGo..',
    '.oggllggggggGGo.',
    '.ogglgggggGgGGo.',
    'ogggggggGgggGGGo',
    'oggGgggggggGGGGo',
    'ogggggGggggGGGGo',
    'oGgggggggGgGGGGo',
    '.oGGgggGgggGGGo.',
    '.oGGGgggGGGGGGo.',
    '..oGGGGGGGGGGo..',
    '...ooGGGGGGoo...',
    '.....ooooooo....',
    '......otTto.....',
    '......otTto.....',
    '......otTto.....',
    '......ottTo.....',
    '......otTto.....',
    '.....otttTTo....',
    '....ottTttTTo...',
    '....oooooooo....',
    '................',
    '................'] },
  bed: { w: 16, h: 16, pal: { o: '#2a1d2e', w: '#f4f1e8', W: '#c9c2b0', r: '#c0385e', R: '#86223f', b: '#7a5028' }, rows: [
    '.oooooooooooooo.',
    '.obbbbbbbbbbbbo.',
    '.owwwwwwwwwwwwo.',
    '.owwwwWWwwwwwwo.',
    '.oWWWWWWWWWWWWo.',
    '.orrrrrrrrrrrro.',
    '.orrrrrrrrrrrro.',
    '.orRrrrrrrrrRro.',
    '.orrrrrrrrrrrro.',
    '.orrRrrrrrRrrro.',
    '.orrrrrrrrrrrro.',
    '.oRRRRRRRRRRRRo.',
    '.obbbbbbbbbbbbo.',
    '.oo..........oo.',
    '................',
    '................'] },
  shelf: { w: 16, h: 24, pal: { o: '#2a1d2e', b: '#7a5028', B: '#5c3a20', r: '#c0385e', g: '#2e8541', u: '#3a4a9a', y: '#d99a1c' }, rows: [
    'oooooooooooooooo',
    'obbbbbbbbbbbbbbo',
    'obrrguyyrguurgbo',
    'obrrguyyrguurgbo',
    'obrrguyyrguurgbo',
    'obrrguyyrguurgbo',
    'oBBBBBBBBBBBBBBo',
    'obuygrr.uuyygrbo',
    'obuygrr.uuyygrbo',
    'obuygrrguuyygrbo',
    'obuygrrguuyygrbo',
    'oBBBBBBBBBBBBBBo',
    'obggruuyyrrgubbo',
    'obggruuyyrrgubbo',
    'obggruuyyrrgubbo',
    'obggruuyyrrgubbo',
    'oBBBBBBBBBBBBBBo',
    'obbbbbbbbbbbbbbo',
    'oooooooooooooooo',
    '................',
    '................',
    '................',
    '................',
    '................'] },
  table: { w: 32, h: 16, pal: { o: '#2a1d2e', b: '#b07a42', B: '#7a5028', l: '#d09a5a' }, rows: [
    '................................',
    '.oooooooooooooooooooooooooooooo.',
    '.olllllllllllllllllllllllllllll.',
    '.obbbbbbbbbbbbbbbbbbbbbbbbbbbbo.',
    '.obbbbbbbbbbbbbbbbbbbbbbbbbbbbo.',
    '.obbbbbbbbbbbbbbbbbbbbbbbbbbbbo.',
    '.obbbbbbbbbbbbbbbbbbbbbbbbbbbbo.',
    '.obbbbbbbbbbbbbbbbbbbbbbbbbbbbo.',
    '.oBBBBBBBBBBBBBBBBBBBBBBBBBBBBo.',
    '.oooooooooooooooooooooooooooooo.',
    '..oBo......................oBo..',
    '..oBo......................oBo..',
    '..oBo......................oBo..',
    '..ooo......................ooo..',
    '................................',
    '................................'].map(r => r.replace(/l(?=l*\.$)/g, 'l')) },
  lamp: { w: 16, h: 16, pal: { o: '#2a1d2e', y: '#ffd84a', Y: '#d99a1c', g: '#6a707c', w: '#fff3b0' }, rows: [
    '......oooo......',
    '.....oywwyo.....',
    '....oywwwwyo....',
    '....oyyyyyyo....',
    '....oYYYYYYo....',
    '.....oooooo.....',
    '.......og.......',
    '.......og.......',
    '.......og.......',
    '.......og.......',
    '.......og.......',
    '.......og.......',
    '.....oggggo.....',
    '....oggggggo....',
    '....oooooooo....',
    '................'] },
  panel: { w: 16, h: 16, pal: { o: '#1c1824', m: '#5a6070', M: '#3c4150', y: '#ffd84a', r: '#e8484a', g: '#3cf0a0' }, rows: [
    '................',
    '...oooooooooo...',
    '...ommmmmmmmo...',
    '...omyMyMyMmo...',
    '...omMyMyMymo...',
    '...ommmmmmmmo...',
    '...omgmgmrmmo...',
    '...ommmmmmmmo...',
    '...omMMMMMMmo...',
    '...omyyyyyymo...',
    '...omMMMMMMmo...',
    '...ommmmmmmmo...',
    '...oooooooooo...',
    '................',
    '................',
    '................'] },
  reactor: { w: 16, h: 16, pal: { o: '#1c1824', m: '#5a6070', M: '#3c4150', c: '#5fd7e8', C: '#3196b0', w: '#e8ffff' }, rows: [
    '.....oooooo.....',
    '....occccCCo....',
    '...occwcccCCo...',
    '...ocwwcccCCo...',
    '...occcccccCo...',
    '...occcccccCo...',
    '...oCcccccCCo...',
    '....oCCCCCCo....',
    '....oMMMMMMo....',
    '...ommmmmmmmo...',
    '..ommmmmmmmmmo..',
    '..oMMMMMMMMMMo..',
    '..oooooooooooo..',
    '................',
    '................',
    '................'] },
  well: { w: 16, h: 16, pal: { o: '#2a1d2e', s: '#9aa0aa', S: '#6a707c', b: '#7a5028', k: '#15121a', u: '#3f7de8' }, rows: [
    '..bbbbbbbbbbbb..',
    '..b..........b..',
    '..b.....o....b..',
    '..b.....o....b..',
    '..b...ooooo..b..',
    '.osssssssssssso.',
    '.oSkkkkkkkkkkSo.',
    '.osskkkukkkkss o',
    '.oSsssssssssSso.',
    '.osSsSssSsSsSso.',
    '.oSsssSssssSsso.',
    '.osssssssssssso.',
    '.oooooooooooooo.',
    '................',
    '................',
    '................'].map(r => r.replace(' ', '.')) },
  fence: { w: 16, h: 16, pal: { o: '#2a1d2e', b: '#b07a42', B: '#7a5028' }, rows: [
    '................',
    '..o......o......',
    '.obo....obo.....',
    '.obo....obo.....',
    'oooooooooooooooo',
    'bbbbbbbbbbbbbbbb',
    'BBBBBBBBBBBBBBBB',
    '.obo....obo.....',
    'oooooooooooooooo',
    'bbbbbbbbbbbbbbbb',
    'BBBBBBBBBBBBBBBB',
    '.obo....obo.....',
    '.oBo....oBo.....',
    '.ooo....ooo.....',
    '................',
    '................'] },
  hay: { w: 16, h: 16, pal: { o: '#5c4a20', y: '#f0cf72', Y: '#c9a24a', r: '#a82a36' }, rows: [
    '................',
    '..oooooooooooo..',
    '.oyyYyyyYyyyYyo.',
    '.oyYyyyYyyYyyyo.',
    '.orrrrrrrrrrrro.',
    '.oyyyYyyyYyyYyo.',
    '.oYyyyyYyyyyyyo.',
    '.oyyYyyyyYyyYyo.',
    '.orrrrrrrrrrrro.',
    '.oyYyyyYyyyYyyo.',
    '.oyyyYyyyYyyyYo.',
    '.oooooooooooooo.',
    '................',
    '................',
    '................',
    '................'] },
  candle: { w: 16, h: 16, pal: { o: '#2a1d2e', y: '#ffd84a', r: '#f58a3a', w: '#f4f1e8', W: '#c9c2b0', g: '#d99a1c' }, rows: [
    '.......y........',
    '......yry.......',
    '......yry.......',
    '.......o........',
    '......owo.......',
    '......owW.......',
    '......owW.......',
    '......owW.......',
    '......owW.......',
    '....gggggggg....',
    '.....gooooog....',
    '.......gg.......',
    '.......gg.......',
    '.....gggggg.....',
    '....gggggggg....',
    '................'] },
  sofa: { w: 32, h: 16, pal: { o: '#2a1d2e', r: '#c0385e', R: '#86223f', l: '#e05a80' }, rows: [
    '................................',
    '...oooooooooooooooooooooooooo...',
    '..orrllllllllllllllllllllllrro..',
    '..orrrrrrrrrrrrrrrrrrrrrrrrrro..',
    '..orrrrrrrrrrrrrrrrrrrrrrrrrro..',
    '.ooRRRRRRRRRRRRRRRRRRRRRRRRRRoo.',
    'orrooooooooooooooooooooooooooorro',
    'orrollllllllllllollllllllllllorro'.slice(0, 32),
    'orrorrrrrrrrrrrrorrrrrrrrrrrrorro'.slice(0, 32),
    'orrorrrrrrrrrrrrorrrrrrrrrrrrorro'.slice(0, 32),
    'oRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRo',
    'oooooooooooooooooooooooooooooooo',
    '.oRo........................oRo.',
    '.ooo........................ooo.',
    '................................',
    '................................'] },
  rock: { w: 16, h: 16, pal: { o: '#2a2a32', s: '#9aa0aa', S: '#6a707c', w: '#c8ccd4' }, rows: [
    '................',
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '....owwsssso....',
    '...owssssSSSo...',
    '..osssssssSSSo..',
    '..ossSssssSSSo..',
    '..oSSSSSSSSSSo..',
    '...oooooooooo...',
    '................',
    '................',
    '................',
    '................',
    '................'] },
  flowers: { w: 16, h: 16, pal: { r: '#e8484a', y: '#ffd84a', p: '#f58cc0', g: '#2e8541', w: '#ffffff' }, rows: [
    '................',
    '................',
    '................',
    '................',
    '..r.......p.....',
    '.ryr.....pyp....',
    '..r...w...p.....',
    '..g..wyw..g.....',
    '..g...w...g..r..',
    '..g...g......g..',
    '......g......g..',
    '................',
    '................',
    '................',
    '................',
    '................'] },
};

const propCache = new Map();
export function propSprite(name) {
  if (propCache.has(name)) return propCache.get(name);
  const def = PROP_DEFS[name];
  if (!def) return null;
  const c = makeCanvas(def.w, def.h);
  paint(c.getContext('2d'), def.rows, def.pal);
  propCache.set(name, c);
  return c;
}
export const PROP_NAMES = Object.keys(PROP_DEFS);

// ---------- 타일 (맵 테마별, 16x16 절차적 도트) ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const THEME_TILES = {
  space: {
    floor: (ctx, r) => { // 금속 바닥 패널
      ctx.fillStyle = '#4a5068'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#566078'; ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#3a3f54'; ctx.fillRect(0, 15, 16, 1); ctx.fillRect(15, 0, 1, 16);
      ctx.fillStyle = '#6a7490'; ctx.fillRect(1, 1, 14, 1); ctx.fillRect(1, 1, 1, 14);
      ctx.fillStyle = '#3a3f54'; ctx.fillRect(3, 3, 1, 1); ctx.fillRect(12, 3, 1, 1); ctx.fillRect(3, 12, 1, 1); ctx.fillRect(12, 12, 1, 1);
    },
    floor2: (ctx) => { // 복도 바닥
      ctx.fillStyle = '#3c4256'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#464d64';
      for (let i = 0; i < 16; i += 4) ctx.fillRect(i, 0, 2, 16);
      ctx.fillStyle = '#ffd84a33'; ctx.fillRect(0, 0, 16, 1);
    },
    wall: (ctx) => {
      ctx.fillStyle = '#20232f'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#2c3040'; ctx.fillRect(0, 0, 16, 8);
      ctx.fillStyle = '#383d52'; ctx.fillRect(0, 0, 16, 1);
      ctx.fillStyle = '#5fd7e8'; ctx.fillRect(2, 4, 3, 1); ctx.fillRect(10, 4, 1, 1);
      ctx.fillStyle = '#15171f'; ctx.fillRect(0, 8, 16, 1);
    },
    void: (ctx, r) => {
      ctx.fillStyle = '#0b0c16'; ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = r() > 0.5 ? '#ffffff' : '#8aa0ff'; ctx.fillRect((r() * 16) | 0, (r() * 16) | 0, 1, 1); }
    },
  },
  village: {
    floor: (ctx, r) => { // 잔디
      ctx.fillStyle = '#5aa84a'; ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = r() > 0.5 ? '#4c9440' : '#6cbc58'; ctx.fillRect((r() * 16) | 0, (r() * 16) | 0, 1, 2); }
    },
    floor2: (ctx, r) => { // 흙길
      ctx.fillStyle = '#c9a26a'; ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = r() > 0.5 ? '#b08a56' : '#dab67e'; ctx.fillRect((r() * 16) | 0, (r() * 16) | 0, 2, 1); }
    },
    floor3: (ctx) => { // 나무 마루 (실내)
      ctx.fillStyle = '#b07a42'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#9a6836'; for (let y = 3; y < 16; y += 4) ctx.fillRect(0, y, 16, 1);
      ctx.fillStyle = '#7a5028'; ctx.fillRect(5, 0, 1, 3); ctx.fillRect(11, 4, 1, 3); ctx.fillRect(3, 8, 1, 3); ctx.fillRect(13, 12, 1, 3);
    },
    wall: (ctx) => { // 나무 벽
      ctx.fillStyle = '#6a4424'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#8a5a32'; ctx.fillRect(0, 0, 16, 9);
      ctx.fillStyle = '#5c3a20'; ctx.fillRect(0, 3, 16, 1); ctx.fillRect(0, 6, 16, 1); ctx.fillRect(7, 0, 1, 9);
      ctx.fillStyle = '#3a2414'; ctx.fillRect(0, 9, 16, 1);
    },
    void: (ctx, r) => { // 물/연못 테두리 밖 = 울창한 숲
      ctx.fillStyle = '#2e6a34'; ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = r() > 0.5 ? '#245a2a' : '#3c7e40'; ctx.fillRect((r() * 14) | 0, (r() * 14) | 0, 3, 3); }
    },
  },
  mansion: {
    floor: (ctx, r) => { // 체크무늬 타일
      ctx.fillStyle = '#d6cfc0'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#3a3240'; ctx.fillRect(0, 0, 8, 8); ctx.fillRect(8, 8, 8, 8);
    },
    floor2: (ctx) => { // 붉은 카펫
      ctx.fillStyle = '#86223f'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#a82a4a'; ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#d99a1c'; ctx.fillRect(7, 7, 2, 2);
    },
    floor3: (ctx) => { // 마루
      ctx.fillStyle = '#7a5028'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#6a4424'; for (let x = 0; x < 16; x += 4) ctx.fillRect(x, 0, 1, 16);
      ctx.fillStyle = '#5c3a20'; ctx.fillRect(1, 6, 3, 1); ctx.fillRect(9, 12, 3, 1);
    },
    wall: (ctx) => { // 벽지 + 몰딩
      ctx.fillStyle = '#4a2a48'; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#6a3a68'; ctx.fillRect(0, 0, 16, 9);
      ctx.fillStyle = '#7a4a78'; ctx.fillRect(3, 0, 1, 9); ctx.fillRect(11, 0, 1, 9);
      ctx.fillStyle = '#d99a1c'; ctx.fillRect(0, 8, 16, 1);
      ctx.fillStyle = '#2a1a2a'; ctx.fillRect(0, 9, 16, 1);
    },
    void: (ctx, r) => {
      ctx.fillStyle = '#15101c'; ctx.fillRect(0, 0, 16, 16);
      if (r() > 0.7) { ctx.fillStyle = '#2a2034'; ctx.fillRect((r() * 12) | 0, (r() * 12) | 0, 4, 1); }
    },
  },
};

const tileCache = new Map();
export function tileSprite(theme, kind, variant = 0) {
  const key = theme + kind + variant;
  if (tileCache.has(key)) return tileCache.get(key);
  const c = makeCanvas(16, 16);
  const t = THEME_TILES[theme];
  const fn = t[kind] || t.floor;
  fn(c.getContext('2d'), rng(variant * 7919 + kind.length * 31 + 1));
  tileCache.set(key, c);
  return c;
}

export function colorHex(i) { return COLORS[i % COLORS.length].b; }
export { shade };
