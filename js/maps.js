// 맵 3종. 방(rooms)과 복도(halls) 사각형으로 구성. 좌표 단위 = 타일(16px)
export const TILE = 16;
// 바닥 종류: 2=floor 3=floor2 4=floor3, 1=벽, 0=빈 공간
const FK = { floor: 2, floor2: 3, floor3: 4 };
export const FLOOR_NAMES = { 2: 'floor', 3: 'floor2', 4: 'floor3' };

const R = (name, x, y, w, h, floor = 'floor') => ({ name, x, y, w, h, floor });

const DEFS = {
  space: {
    name: '우주선', theme: 'space', W: 64, H: 42, buttonProp: 'button', ventProp: 'vent',
    sab: { lights: '정전', reactor: '원자로 과열', comms: '통신 두절' },
    rooms: [
      R('상층 엔진', 3, 4, 9, 7), R('원자로', 1, 15, 7, 9), R('하층 엔진', 3, 28, 9, 7),
      R('보안실', 13, 16, 6, 6), R('의무실', 16, 6, 8, 6), R('카페테리아', 27, 2, 14, 11),
      R('무기고', 46, 3, 9, 7), R('산소 공급실', 44, 15, 6, 5), R('조종실', 56, 14, 7, 9),
      R('방어막', 46, 28, 9, 7), R('통신실', 36, 34, 8, 6), R('창고', 26, 26, 10, 10),
      R('관리실', 34, 18, 8, 5), R('전기실', 16, 26, 8, 6),
    ],
    halls: [[12, 7, 4, 3], [24, 7, 3, 3], [6, 11, 3, 4], [6, 24, 3, 4], [8, 18, 5, 3], [12, 30, 4, 3], [24, 29, 2, 3],
      [30, 13, 3, 13], [33, 19, 1, 3], [41, 5, 5, 3], [50, 10, 3, 18], [53, 17, 3, 3], [44, 34, 2, 3], [36, 29, 10, 3]],
    button: [5, 7, 5],
    stations: [
      [0, 2, 1, 'hold', '연료 주입'], [1, 2, 1, 'numbers', '원자로 가동'], [2, 6, 1, 'hold', '연료 주입'],
      [3, 3, 1, 'code', '보안 코드 입력'], [4, 5, 1, 'target', '샘플 검사'], [5, 1, 1, 'download', '데이터 업로드'],
      [5, 12, 1, 'wires', '전선 연결'], [6, 6, 1, 'target', '소행성 격추'], [7, 2, 1, 'slider', '산소 농도 조절'],
      [8, 4, 1, 'slider', '항로 설정'], [8, 2, 6, 'download', '항해 기록 다운로드'], [9, 4, 1, 'numbers', '방어막 가동'],
      [10, 2, 1, 'download', '신호 다운로드'], [11, 2, 1, 'wires', '전선 연결'], [11, 7, 1, 'hold', '쓰레기 배출'],
      [12, 4, 1, 'code', '카드 인증'], [13, 1, 1, 'wires', '배전반 수리'],
    ],
    lights: [13, 5, 1], comms: [10, 6, 1], reactor: [[1, 1, 6], [1, 5, 6]],
    vents: [[[0, 7, 5], [1, 3, 3], [2, 7, 4]], [[4, 1, 4], [3, 1, 4], [13, 2, 4]], [[5, 12, 9], [12, 1, 3]],
      [[6, 1, 5], [8, 5, 3], [7, 4, 3]], [[9, 7, 5], [11, 8, 8]]],
    props: [[5, 3, 4, 'table'], [5, 8, 4, 'table'], [5, 3, 8, 'table'], [5, 8, 8, 'table'], [4, 1, 1, 'bed'], [4, 3, 1, 'bed'],
      [11, 4, 5, 'crate'], [11, 1, 7, 'crate'], [11, 6, 7, 'crate'], [3, 1, 3, 'console'], [12, 1, 1, 'plant'], [12, 7, 1, 'plant'],
      [6, 3, 4, 'crate'], [2, 2, 4, 'console'], [0, 4, 3, 'crate'], [1, 4, 3, 'reactor'], [9, 1, 4, 'console'], [7, 4, 3, 'plant']],
  },
  village: {
    name: '시골 마을', theme: 'village', W: 60, H: 42, buttonProp: 'bell', ventProp: 'hole',
    sab: { lights: '가로등 고장', reactor: '종탑 화재', comms: '게시판 훼손' },
    rooms: [
      R('광장', 24, 15, 12, 10), R('교회', 25, 2, 10, 8, 'floor3'), R('농장', 3, 3, 14, 10), R('헛간', 4, 17, 9, 8, 'floor3'),
      R('우물가', 14, 17, 6, 6), R('방앗간', 44, 3, 10, 8, 'floor3'), R('시장', 42, 16, 12, 8, 'floor2'), R('연못', 45, 29, 10, 9),
      R('묘지', 30, 31, 10, 8), R('대장간', 16, 30, 9, 7, 'floor3'), R('오두막', 3, 31, 9, 8, 'floor3'),
    ],
    halls: [[29, 10, 3, 5], [20, 19, 4, 3], [13, 19, 1, 3], [7, 13, 3, 4], [17, 5, 8, 3], [35, 5, 9, 3], [47, 11, 3, 5],
      [36, 19, 6, 3], [48, 24, 3, 5], [33, 25, 3, 6], [40, 33, 5, 3], [26, 25, 3, 5], [25, 30, 4, 3], [12, 32, 4, 3], [6, 25, 3, 6]],
    button: [0, 6, 4],
    stations: [
      [2, 3, 2, 'hold', '우유 짜기'], [2, 10, 6, 'target', '해충 잡기'], [3, 2, 1, 'wires', '밧줄 정리'],
      [4, 4, 2, 'hold', '물 긷기'], [1, 5, 1, 'numbers', '종 치기 순서'], [1, 1, 1, 'code', '헌금함 열기'],
      [5, 2, 1, 'slider', '풍차 날개 조절'], [5, 7, 1, 'download', '곡식 빻기'], [6, 2, 1, 'numbers', '물건 진열'],
      [6, 9, 1, 'code', '금고 열기'], [7, 4, 3, 'target', '낚시하기'], [8, 2, 2, 'slider', '비석 닦기'],
      [9, 2, 1, 'hold', '풀무질'], [10, 2, 1, 'download', '빵 굽기'], [10, 6, 1, 'wires', '빨래 널기'],
    ],
    lights: [9, 6, 1], comms: [0, 1, 1], reactor: [[1, 1, 6], [1, 8, 6]],
    vents: [[[2, 12, 1], [7, 7, 7]], [[3, 6, 3], [8, 8, 6]], [[10, 6, 6], [5, 1, 6]], [[4, 1, 4], [6, 10, 6]]],
    props: [[2, 1, 1, 'hay'], [2, 6, 2, 'fence'], [2, 7, 2, 'fence'], [2, 8, 2, 'fence'], [2, 6, 7, 'hay'], [3, 6, 1, 'hay'],
      [4, 2, 2, 'well'], [1, 3, 3, 'candle'], [1, 6, 3, 'candle'], [6, 5, 4, 'crate'], [6, 7, 4, 'crate'], [8, 1, 5, 'rock'],
      [8, 5, 5, 'rock'], [8, 7, 3, 'rock'], [7, 1, 1, 'flowers'], [7, 8, 2, 'rock'], [0, 1, 7, 'tree'], [0, 10, 7, 'tree'],
      [0, 2, 3, 'flowers'], [10, 3, 4, 'table'], [10, 1, 5, 'bed'], [9, 6, 4, 'crate'], [5, 4, 4, 'hay'], [2, 12, 7, 'tree']],
  },
  mansion: {
    name: '저택', theme: 'mansion', W: 56, H: 40, buttonProp: 'bell', ventProp: 'vent',
    sab: { lights: '두꺼비집 내려감', reactor: '벽난로 화재', comms: '전화선 절단' },
    rooms: [
      R('대연회장', 20, 13, 14, 10, 'floor2'), R('현관', 23, 30, 8, 7, 'floor2'), R('주방', 4, 3, 10, 8), R('식당', 17, 3, 10, 7, 'floor3'),
      R('서재', 31, 3, 9, 7, 'floor3'), R('온실', 43, 3, 10, 8), R('침실', 3, 15, 9, 8, 'floor2'), R('음악실', 40, 14, 9, 7, 'floor3'),
      R('욕실', 44, 25, 8, 6), R('지하실', 3, 28, 10, 8, 'floor3'), R('응접실', 34, 30, 8, 6, 'floor2'),
    ],
    halls: [[14, 5, 3, 3], [27, 5, 4, 3], [40, 5, 3, 3], [21, 10, 3, 3], [32, 10, 2, 3], [12, 17, 8, 3], [6, 11, 3, 4],
      [34, 17, 6, 3], [46, 11, 3, 3], [46, 21, 3, 4], [26, 23, 3, 7], [31, 32, 3, 3], [42, 30, 2, 3], [6, 23, 3, 5], [13, 32, 10, 3]],
    button: [0, 7, 4],
    stations: [
      [2, 2, 1, 'hold', '설거지'], [2, 7, 1, 'numbers', '레시피 순서'], [3, 2, 1, 'slider', '식탁 세팅'],
      [4, 2, 1, 'code', '비밀 책장'], [4, 6, 1, 'download', '고서 해독'], [5, 3, 2, 'target', '해충 퇴치'],
      [5, 7, 5, 'hold', '화분 물주기'], [6, 2, 1, 'wires', '커튼 묶기'], [7, 2, 1, 'numbers', '피아노 연주'],
      [8, 2, 1, 'slider', '수도꼭지 조절'], [9, 2, 1, 'wires', '배전반 수리'], [10, 2, 1, 'download', '축음기 태엽'],
      [1, 2, 1, 'code', '금고 열기'],
    ],
    lights: [9, 7, 1], comms: [10, 6, 1], reactor: [[0, 1, 8], [0, 12, 8]],
    vents: [[[2, 8, 6], [9, 2, 6]], [[6, 7, 6], [7, 7, 5]], [[4, 8, 5], [8, 6, 4]], [[5, 1, 6], [10, 6, 4]]],
    props: [[0, 3, 2, 'table'], [0, 9, 2, 'table'], [0, 3, 6, 'table'], [0, 9, 6, 'table'], [2, 4, 4, 'table'], [3, 3, 4, 'table'],
      [4, 0, 3, 'shelf'], [4, 4, 3, 'shelf'], [6, 1, 3, 'bed'], [6, 5, 3, 'bed'], [7, 4, 3, 'sofa'], [10, 2, 3, 'sofa'],
      [5, 5, 1, 'plant'], [5, 1, 3, 'plant'], [5, 8, 2, 'plant'], [1, 1, 4, 'candle'], [1, 6, 4, 'candle'], [9, 4, 4, 'crate'],
      [9, 1, 5, 'crate'], [7, 1, 5, 'lamp'], [8, 5, 1, 'plant'], [0, 6, 0, 'candle']],
  },
};

export const MAP_LIST = Object.keys(DEFS).map(id => ({ id, name: DEFS[id].name }));

const built = {};
export function getMap(id) {
  if (built[id]) return built[id];
  const d = DEFS[id];
  const W = d.W, H = d.H;
  const grid = new Uint8Array(W * H);
  const roomId = new Int8Array(W * H).fill(-1);
  for (const [x, y, w, h] of d.halls) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * W + i] = 3;
  d.rooms.forEach((r, ri) => {
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) { grid[j * W + i] = FK[r.floor]; roomId[j * W + i] = ri; }
  });
  // 바닥과 닿은 빈칸은 벽
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (grid[j * W + i] !== 0) continue;
    let near = false;
    for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) {
      const x = i + di, y = j + dj;
      if (x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] >= 2) { near = true; break; }
    }
    if (near) grid[j * W + i] = 1;
  }
  const at = (ri, dx, dy) => ({ x: d.rooms[ri].x + dx, y: d.rooms[ri].y + dy, room: d.rooms[ri].name });
  const m = {
    id, ...d, grid, roomId,
    button: at(...d.button),
    stations: d.stations.map(([ri, dx, dy, type, label], i) => ({ id: i, ...at(ri, dx, dy), type, label })),
    lights: at(...d.lights), comms: at(...d.comms), reactor: d.reactor.map(a => at(...a)),
    vents: [], props: d.props.map(([ri, dx, dy, s]) => ({ ...at(ri, dx, dy), s })),
  };
  let vid = 0;
  d.vents.forEach((group, gi) => group.forEach(a => m.vents.push({ id: vid++, group: gi, ...at(...a) })));
  m.spawn = (() => { const b = m.button; return { x: b.x + 0.5, y: b.y + 2.5 }; })();
  m.isFloor = (tx, ty) => tx >= 0 && ty >= 0 && tx < W && ty < H && grid[ty * W + tx] >= 2;
  m.solidPx = (px, py) => !m.isFloor(Math.floor(px / TILE), Math.floor(py / TILE));
  m.roomName = (px, py) => {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return '';
    const r = roomId[ty * W + tx];
    return r >= 0 ? d.rooms[r].name : '복도';
  };
  built[id] = m;
  return m;
}

// 스폰 위치: 버튼 주변 원형
export function spawnPoint(m, i, n) {
  const a = (i / Math.max(1, n)) * Math.PI * 2;
  for (let rad = 2.2; rad > 0; rad -= 0.4) {
    const x = (m.button.x + 0.5 + Math.cos(a) * rad) * TILE, y = (m.button.y + 0.5 + Math.sin(a) * rad * 0.8) * TILE;
    if (!m.solidPx(x, y) && !m.solidPx(x - 6, y) && !m.solidPx(x + 6, y)) return { x, y };
  }
  return { x: (m.button.x + 0.5) * TILE, y: (m.button.y + 1.5) * TILE };
}

// 검증용: 모든 바닥이 연결되어 있는지, 오브젝트가 바닥 위에 있는지
export function validateMap(id) {
  const m = getMap(id);
  const errs = [];
  const chk = (o, what) => { if (!m.isFloor(o.x, o.y)) errs.push(`${what} (${o.room} ${o.x},${o.y}) 바닥 아님`); };
  chk(m.button, 'button'); chk(m.lights, 'lights'); chk(m.comms, 'comms'); m.reactor.forEach(r => chk(r, 'reactor'));
  m.stations.forEach(s => chk(s, 'station ' + s.label)); m.vents.forEach(v => chk(v, 'vent')); m.props.forEach(p => chk(p, 'prop ' + p.s));
  const seen = new Uint8Array(m.W * m.H);
  const q = [[m.button.x, m.button.y]]; seen[m.button.y * m.W + m.button.x] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (m.isFloor(nx, ny) && !seen[ny * m.W + nx]) { seen[ny * m.W + nx] = 1; q.push([nx, ny]); }
    }
  }
  m.rooms.forEach(r => { if (!seen[r.y * m.W + r.x]) errs.push(`방 ${r.name} 연결 안 됨`); });
  // 오브젝트 겹침
  const occ = {};
  [...m.stations.map(s => ['station', s]), ...m.vents.map(v => ['vent', v]), ['lights', m.lights], ['comms', m.comms], ['button', m.button], ...m.reactor.map(r => ['reactor', r])]
    .forEach(([k, o]) => { const key = o.x + ',' + o.y; if (occ[key]) errs.push(`겹침 ${occ[key]} / ${k} @${o.room} ${key}`); occ[key] = k; });
  return errs;
}
