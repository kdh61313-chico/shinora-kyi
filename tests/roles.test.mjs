import { HostGame } from '../js/host.js';
import { ROLES } from '../js/roles.js';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('  ✗', msg); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function setup(roles, mode = 'rt', extra = {}) {
  const log = {};
  const net = { selfId: 'p0', send(id, m) { (log[id] ||= []).push(m); }, kick() {} };
  const hg = new HostGame(net);
  roles.forEach((r, i) => hg.handle('p' + i, { t: 'hello', name: '플' + i, color: i, hat: 0 }));
  Object.assign(hg.settings, { mode, ...extra });
  hg.start();
  const g = hg.g;
  roles.forEach((r, i) => { const p = g.ps['p' + i]; p.role = r; p.team = ROLES[r].team; p.armor = r === 'soldier'; p.polImmune = r === 'politician'; p.x = 500; p.y = 300; p.killCd = 0; p.cdUntil = 0; p.usedRound = 0; p.usedGame = 0; delete p.bountyTarget; });
  g.lovers = null;
  const toasts = (id) => (log[id] || []).filter(m => m.t === 'toast').map(m => m.text).join(' | ');
  const msgs = (id, t) => (log[id] || []).filter(m => m.t === t);
  const clear = () => { for (const k in log) log[k] = []; };
  return { hg, g, log, toasts, msgs, clear, act: (i, a, x = {}) => hg.handle('p' + i, { t: 'act', a, ...x }) };
}
const alive = (g, i) => g.ps['p' + i].alive;

// ---- 실시간 ----
console.log('[RT] 기본 살인/탐정/의사/경호/군인');
{ const T = setup(['duck', 'detective', 'goose', 'goose', 'goose', 'goose']);
  T.act(0, 'kill', { target: 'p2' }); ok(!alive(T.g, 2), '오리 살인');
  T.act(1, 'ability', { target: 'p0' }); ok(/살인을 했습니다/.test(T.toasts('p1')), '탐정: 살인자 감지');
  ok(T.g.bodies.length === 1, '시체 생성'); T.hg.destroy(); }
{ const T = setup(['duck', 'medic', 'goose', 'goose', 'goose', 'goose']);
  T.act(1, 'ability', { target: 'p2' }); T.act(0, 'kill', { target: 'p2' }); ok(alive(T.g, 2), '의사 보호막'); T.hg.destroy(); }
{ const T = setup(['duck', 'bodyguard', 'goose', 'goose', 'goose', 'goose']);
  T.act(1, 'ability', { target: 'p2' }); T.act(0, 'kill', { target: 'p2' }); ok(alive(T.g, 2) && !alive(T.g, 1), '경호원 대신 죽음'); T.hg.destroy(); }
{ const T = setup(['duck', 'soldier', 'goose', 'goose', 'goose', 'goose']);
  T.act(0, 'kill', { target: 'p1' }); ok(alive(T.g, 1), '군인 1회 생존'); T.g.ps.p0.killCd = 0; T.act(0, 'kill', { target: 'p1' }); ok(!alive(T.g, 1), '군인 2번째 사망'); T.hg.destroy(); }
console.log('[RT] 보안관/성직자/장의사/기자/복수자');
{ const T = setup(['duck', 'sheriff', 'goose', 'goose', 'goose', 'goose', 'sheriff']);
  T.act(1, 'ability', { target: 'p2' }); ok(!alive(T.g, 1) && alive(T.g, 2), '보안관 오사 시 자신 사망');
  T.act(6, 'ability', { target: 'p0' }); ok(T.hg.phase === 'end' || !alive(T.g, 0), '보안관 오리 사살'); T.hg.destroy(); }
{ const T = setup(['duck', 'priest', 'goose', 'goose', 'goose', 'mortician']);
  T.act(0, 'kill', { target: 'p2' });
  T.act(5, 'ability', { body: 'p2' }); ok(/\[거위\]/.test(T.toasts('p5')), '장의사 직업 확인');
  T.act(1, 'ability', { body: 'p2' }); ok(alive(T.g, 2) && T.g.bodies.length === 0, '성직자 부활'); T.hg.destroy(); }
{ const T = setup(['duck', 'reporter', 'avenger', 'goose', 'goose', 'goose']);
  T.act(1, 'ability', { target: 'p0' }); T.act(0, 'kill', { target: 'p2' });
  T.act(3, 'report', { body: 'p2' }); const mt = T.msgs('p3', 'meeting')[0];
  ok(mt && mt.notices.some(n => n.includes('특종') && n.includes('오리')), '기자 특종 공개');
  ok(mt && mt.notices.some(n => n.includes('복수자') && n.includes('플0')), '복수자 범인 공개'); T.hg.destroy(); }
console.log('[RT] 유명인/캐나다/연인/현상금');
{ const T = setup(['duck', 'celebrity', 'canadian', 'goose', 'goose', 'goose']);
  T.act(0, 'kill', { target: 'p1' }); ok(/유명인/.test(T.toasts('p4')), '유명인 사망 알림');
  T.g.ps.p0.killCd = 0; T.act(0, 'kill', { target: 'p2' }); await sleep(1400); ok(T.hg.phase === 'meeting', '캐나다 거위 자동 신고'); T.hg.destroy(); }
{ const T = setup(['duck', 'goose', 'goose', 'goose', 'goose', 'goose']); T.g.lovers = ['p1', 'p2'];
  T.act(0, 'kill', { target: 'p1' }); ok(!alive(T.g, 2), '연인 동반 사망'); T.hg.destroy(); }
{ const T = setup(['duck', 'bounty', 'goose', 'goose', 'goose', 'goose', 'goose']); T.g.ps.p1.bountyTarget = 'p2';
  T.act(0, 'kill', { target: 'p2' }); ok(T.g.ps.p1.role === 'dodo', '현상금 목표 사망 → 도도새'); T.hg.destroy(); }
console.log('[RT] 회의/투표: 정치인, 도도새, 현상금, 암살자, 침묵자');
async function meeting(T, votes) {
  T.act(1, 'button'); T.g.ps.p1.x = 500;
  const b = T.hg.map.button; for (const id in T.g.ps) { T.g.ps[id].x = (b.x + .5) * 16; T.g.ps[id].y = (b.y + .5) * 16; }
  T.act(1, 'button'); T.g.meeting.ends = 0; T.hg.tick();
  for (const [v, tg] of votes) T.act(v, 'vote', { target: tg });
}
{ const T = setup(['duck', 'politician', 'goose', 'goose', 'goose', 'goose']);
  await meeting(T, [[0, 'p1'], [2, 'p1'], [3, 'p1'], [4, 'p1'], [5, 'p1'], [1, 'skip']]);
  ok(alive(T.g, 1) && /정치인/.test(T.msgs('p2', 'result')[0]?.text), '정치인 첫 추방 면역');
  T.hg.destroy(); }
{ const T = setup(['duck', 'politician', 'goose', 'goose', 'goose', 'goose']);
  await meeting(T, [[1, 'p0'], [0, 'p2'], [2, 'p2'], [3, 'skip'], [4, 'skip'], [5, 'skip']]);
  ok(T.msgs('p2', 'result')[0]?.counts.p0 === 2, '정치인 2표'); T.hg.destroy(); }
{ const T = setup(['duck', 'dodo', 'goose', 'goose', 'goose', 'goose']);
  await meeting(T, [[0, 'p1'], [1, 'p1'], [2, 'p1'], [3, 'p1'], [4, 'p1'], [5, 'p1']]);
  ok(T.msgs('p2', 'end')[0]?.kind === 'dodo', '도도새 추방 승리'); T.hg.destroy(); }
{ const T = setup(['duck', 'bounty', 'goose', 'goose', 'goose', 'goose']); T.g.ps.p1.bountyTarget = 'p3';
  await meeting(T, [[0, 'p3'], [1, 'p3'], [2, 'p3'], [3, 'p3'], [4, 'p3'], [5, 'p3']]);
  ok(T.msgs('p2', 'end')[0]?.kind === 'bounty', '현상금 사냥꾼 승리'); T.hg.destroy(); }
{ const T = setup(['assassin', 'detective', 'goose', 'goose', 'goose', 'goose', 'duck']);
  await meeting(T, []);
  T.act(0, 'guess', { target: 'p1', role: 'detective' }); ok(!alive(T.g, 1), '암살 성공');
  T.hg.destroy(); }
{ const T = setup(['assassin', 'detective', 'goose', 'goose', 'goose', 'goose', 'duck']);
  await meeting(T, []);
  T.act(0, 'guess', { target: 'p1', role: 'medic' }); ok(!alive(T.g, 0) && alive(T.g, 1), '암살 실패 시 자신 사망');
  T.hg.destroy(); }
{ const T = setup(['silencer', 'goose', 'goose', 'goose', 'goose', 'goose']);
  T.act(0, 'ability', { target: 'p1' }); await meeting(T, []);
  ok(T.msgs('p1', 'silenced').some(m => m.on), '침묵 적용');
  T.hg.handle('p1', { t: 'chat', text: 'hi' }); ok(!T.msgs('p2', 'chat').some(m => m.text === 'hi'), '침묵자 채팅 차단'); T.hg.destroy(); }
console.log('[RT] 변장/투명/저격/청소/스파이/추적/감시/엔지니어/벤트');
{ const T = setup(['morph', 'invisible', 'goose', 'goose', 'goose', 'goose', 'goose', 'goose']);
  T.act(0, 'ability', { target: 'p2' }); T.act(1, 'ability', {});
  const s = T.hg.snapRT(); const a = s.ps.find(x => x[0] === 'p0'), bq = s.ps.find(x => x[0] === 'p1');
  ok(a[7] === 'p2', '변장 적용'); ok(bq[6] === 1, '투명 적용'); T.hg.destroy(); }
{ const T = setup(['sniper', 'cleaner', 'spy', 'goose', 'goose', 'goose', 'goose', 'goose', 'goose', 'goose']);
  T.g.ps.p3.x = 500 + 16 * 10; T.act(0, 'ability', { target: 'p3' }); ok(!alive(T.g, 3), '저격 (원거리)');
  T.g.ps.p1.x = T.g.ps.p3.x; T.act(1, 'ability', { body: 'p3' }); ok(T.g.bodies.length === 0, '청소부 시체 제거');
  T.act(2, 'ability', { target: 'p4' }); ok(/\[거위\]/.test(T.toasts('p2')), '스파이 직업 확인'); T.hg.destroy(); }
{ const T = setup(['duck', 'tracker', 'lookout', 'engineer', 'goose', 'goose']);
  T.act(1, 'ability', { target: 'p0' }); ok(T.msgs('p1', 'track')[0]?.target === 'p0', '추적기');
  T.act(2, 'ability', {}); ok(T.msgs('p2', 'cctv').length === 1, 'CCTV');
  T.g.sabCd = 0; T.act(0, 'sab', { type: 'lights' }); ok(T.g.sab?.type === 'lights', '정전 사보타주');
  T.act(3, 'ability', {}); ok(!T.g.sab, '엔지니어 원격 수리');
  const v = T.hg.map.vents[0]; T.g.ps.p0.x = (v.x + .5) * 16; T.g.ps.p0.y = (v.y + .5) * 16;
  T.act(0, 'vent', { vent: v.id }); ok(T.msgs('p0', 'tp').length === 1, '벤트 이동');
  T.g.ps.p4.x = (v.x + .5) * 16; T.g.ps.p4.y = (v.y + .5) * 16; T.act(4, 'vent', { vent: v.id }); ok(T.msgs('p4', 'tp').length === 0, '거위는 벤트 불가'); T.hg.destroy(); }
console.log('[RT] 중립 승리 / 임무 승리 / 원자로');
{ const T = setup(['duck', 'pigeon', 'goose', 'goose', 'goose', 'goose']);
  for (const t of ['p0', 'p2', 'p3', 'p4', 'p5']) { T.g.ps.p1.cdUntil = 0; T.g.ps.p1.usedRound = 0; T.act(1, 'ability', { target: t }); }
  ok(T.msgs('p2', 'end')[0]?.kind === 'pigeon', '비둘기 승리'); T.hg.destroy(); }
{ const T = setup(['duck', 'vulture', 'goose', 'goose', 'goose', 'goose', 'goose', 'goose', 'goose']);
  T.act(0, 'kill', { target: 'p2' }); T.g.ps.p0.killCd = 0; T.act(0, 'kill', { target: 'p3' }); T.g.ps.p0.killCd = 0; T.act(0, 'kill', { target: 'p4' });
  for (const b of ['p2', 'p3', 'p4']) { T.g.ps.p1.cdUntil = 0; T.act(1, 'ability', { body: b }); }
  ok(T.msgs('p5', 'end')[0]?.kind === 'vulture', '독수리 승리 (필요 ' + T.g.vultureNeed + ')'); T.hg.destroy(); }
{ const T = setup(['falcon', 'goose', 'goose', 'goose']);
  T.act(0, 'ability', { target: 'p1' }); T.g.ps.p0.killCd = 0; T.act(0, 'ability', { target: 'p2' });
  ok(T.msgs('p3', 'end')[0]?.kind === 'falcon', '매 승리'); T.hg.destroy(); }
{ const T = setup(['duck', 'goose', 'goose', 'goose', 'survivor']);
  for (const i of [1, 2, 3]) for (const st of T.g.ps['p' + i].tasks) { const s = T.hg.map.stations[st]; T.g.ps['p' + i].x = (s.x + .5) * 16; T.g.ps['p' + i].y = (s.y + .5) * 16; T.act(i, 'task', { station: st }); }
  const e = T.msgs('p1', 'end')[0]; ok(e?.kind === 'goose', '임무 완료 승리'); ok(e?.winners.includes('p4'), '생존자 동반 승리'); T.hg.destroy(); }
{ const T = setup(['duck', 'goose', 'goose', 'goose', 'goose']);
  T.g.sabCd = 0; T.act(0, 'sab', { type: 'reactor' }); T.g.sab.ends = 0; T.hg.tick();
  ok(T.msgs('p1', 'end')[0]?.kind === 'duck', '원자로 폭발 오리 승리'); T.hg.destroy(); }

// ---- 낮/밤 ----
console.log('[턴] 밤 행동 처리');
function night(T, acts, duckVotes) {
  T.hg.phase = 'night'; T.g.nightActs = {}; T.g.duckVotes = {};
  for (const [i, tg, kind] of acts) T.act(i, 'night', { kind: kind || 'ability', target: tg });
  T.g.phaseEnds = 0; T.hg.tick();
  return T.msgs('p0', 'phase').filter(m => m.ph === 'morning').pop()?.lines || [];
}
{ const T = setup(['duck', 'medic', 'detective', 'goose', 'goose', 'goose', 'goose'], 'turn');
  const lines = night(T, [[0, 'p3', 'kill'], [1, 'p3'], [2, 'p0']]);
  ok(alive(T.g, 3), '의사 치료로 생존'); ok(/오리팀입니다/.test(T.toasts('p2')), '탐정 오리 조사'); ok(lines.some(l => l.includes('공격이 있었지만')), '아침 발표'); T.hg.destroy(); }
{ const T = setup(['morph', 'detective', 'goose', 'goose', 'goose', 'goose', 'goose'], 'turn');
  night(T, [[1, 'p0']]); ok(/거위팀으로 보입니다/.test(T.toasts('p1')), '변장술사는 거위로 보임'); T.hg.destroy(); }
{ const T = setup(['duck', 'tracker', 'lookout', 'goose', 'goose', 'goose', 'goose'], 'turn');
  night(T, [[0, 'p3', 'kill'], [1, 'p0'], [2, 'p3']]);
  ok(/플3/.test(T.toasts('p1')), '추적자: 대상의 방문지'); ok(/플0/.test(T.toasts('p2')), '감시자: 방문자'); ok(!alive(T.g, 3), '오리 밤 살해'); T.hg.destroy(); }
{ const T = setup(['duck', 'cleaner', 'sheriff', 'goose', 'goose', 'goose', 'goose', 'goose', 'goose'], 'turn');
  const lines = night(T, [[0, 'p3', 'kill'], [1, 'p3', 'kill'], [2, 'p1']]);
  ok(!alive(T.g, 1), '보안관 밤 사격'); ok(lines.some(l => l.includes('플3') && !l.includes('직업')), '청소부: 직업 숨김'); T.hg.destroy(); }
{ const T = setup(['duck', 'priest', 'reporter', 'silencer', 'goose', 'goose', 'goose', 'goose', 'goose', 'goose'], 'turn');
  night(T, [[0, 'p4', 'kill'], [3, 'p5']]);
  const lines = night(T, [[1, 'p4'], [2, 'p0']]);
  ok(alive(T.g, 4), '성직자 밤 부활'); ok(lines.some(l => l.includes('특종')), '기자 아침 공개'); T.hg.destroy(); }
{ const T = setup(['duck', 'bodyguard', 'soldier', 'goose', 'goose', 'goose', 'goose'], 'turn');
  night(T, [[0, 'p2', 'kill']]); ok(alive(T.g, 2), '군인 밤 생존');
  night(T, [[0, 'p3', 'kill'], [1, 'p3']]); ok(alive(T.g, 3) && !alive(T.g, 1), '경호원 밤 대신 사망'); T.hg.destroy(); }
{ const T = setup(['duck', 'goose', 'goose', 'goose', 'goose', 'goose'], 'turn');
  night(T, []); T.g.phaseEnds = 0; T.hg.tick(); T.g.phaseEnds = 0; T.hg.tick();
  ok(T.hg.phase === 'dayvote', '낮 → 투표 단계');
  for (const i of [0, 1, 2, 3, 4, 5]) T.act(i, 'vote', { target: 'p0' });
  ok(T.msgs('p1', 'end')[0]?.kind === 'goose', '낮 투표로 오리 추방 → 거위 승리'); T.hg.destroy(); }

console.log(`\n결과: ${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
