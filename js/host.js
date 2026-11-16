import { J } from './josa.js';
// 방장 브라우저에서 돌아가는 권한(authoritative) 게임 로직
import { ROLES, TEAMS, DEFAULT_SETTINGS, assignRoles, isEvil, shuffle } from './roles.js';
import { getMap, spawnPoint, TILE } from './maps.js';
import { COLORS, HATS } from './sprites.js';

const now = () => Date.now();
const KILL_RANGE = 1.9 * TILE;
const USE_RANGE = 1.7 * TILE;
const SNIPE_RANGE = 14 * TILE;
const MAX_PLAYERS = 15;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const center = (o) => ({ x: (o.x + 0.5) * TILE, y: (o.y + 0.5) * TILE });

export class HostGame {
  constructor(net) {
    this.net = net;
    this.players = new Map(); // id -> {id,name,color,hat,isHost}
    this.order = [];
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.phase = 'lobby';
    this.hostId = net.selfId;
    this.g = null;
    net.onMessage = (from, msg) => this.handle(from, msg);
    net.onLeave = (id) => this.leave(id);
    this.timer = setInterval(() => this.tick(), 66);
  }
  destroy() { clearInterval(this.timer); }

  // ------------ 전송 ------------
  send(id, msg) { this.net.send(id, msg); }
  bcast(msg, filter) { for (const id of this.order) if (!filter || filter(id)) this.send(id, msg); }
  notify(id, text, kind = 'info') { this.send(id, { t: 'toast', text, kind }); }
  name(id) { return this.players.get(id)?.name ?? '???'; }
  pub() { return this.order.map(id => { const p = this.players.get(id); return { id, name: p.name, color: p.color, hat: p.hat, isHost: id === this.hostId }; }); }
  lobbyMsg() { return { t: 'lobby', players: this.pub(), settings: this.settings, hostId: this.hostId, phase: this.phase }; }

  // ------------ 메시지 처리 ------------
  handle(from, m) {
    if (!m || typeof m !== 'object') return;
    try {
      switch (m.t) {
        case 'hello': return this.hello(from, m);
        case 'look': return this.look(from, m);
        case 'settings': if (from === this.hostId && this.phase === 'lobby') { this.settings = sanitizeSettings(m.settings); this.bcast(this.lobbyMsg()); } return;
        case 'start': if (from === this.hostId) this.start(); return;
        case 'kick': if (from === this.hostId && m.id !== this.hostId) { this.net.kick(m.id); this.leave(m.id); } return;
        case 'backToLobby': if (from === this.hostId && this.phase === 'end') { this.phase = 'lobby'; this.g = null; this.bcast(this.lobbyMsg()); } return;
        case 'chat': return this.chat(from, m);
        case 'pos': return this.pos(from, m);
        case 'act': return this.g && this.act(from, m);
        case 'ping': return this.send(from, { t: 'pong', ts: m.ts });
      }
    } catch (e) { console.error('host error', e); }
  }

  hello(id, m) {
    if (this.players.has(id)) return;
    if (this.phase !== 'lobby') { this.send(id, { t: 'reject', reason: '이미 게임이 진행 중입니다. 끝난 뒤 다시 들어와 주세요.' }); return; }
    if (this.players.size >= MAX_PLAYERS) { this.send(id, { t: 'reject', reason: '방이 가득 찼습니다 (최대 15명)' }); return; }
    let name = String(m.name || '').trim().slice(0, 10) || '거위' + (this.players.size + 1);
    const names = new Set([...this.players.values()].map(p => p.name));
    let k = 2; const base = name; while (names.has(name)) name = base + k++;
    const used = new Set([...this.players.values()].map(p => p.color));
    let color = Number.isInteger(m.color) ? m.color : 0;
    if (used.has(color)) color = COLORS.findIndex((_, i) => !used.has(i));
    this.players.set(id, { id, name, color, hat: (m.hat | 0) % HATS.length });
    this.order.push(id);
    this.send(id, { t: 'welcome', you: id, hostId: this.hostId });
    this.bcast(this.lobbyMsg());
    this.sysChat(`${name} 님이 들어왔습니다.`);
  }
  look(id, m) {
    const p = this.players.get(id); if (!p || this.phase !== 'lobby') return;
    if (Number.isInteger(m.color) && m.color >= 0 && m.color < COLORS.length && ![...this.players.values()].some(q => q.id !== id && q.color === m.color)) p.color = m.color;
    if (Number.isInteger(m.hat) && m.hat >= 0 && m.hat < HATS.length) p.hat = m.hat;
    this.bcast(this.lobbyMsg());
  }
  leave(id) {
    const p = this.players.get(id); if (!p) return;
    this.players.delete(id);
    this.order = this.order.filter(x => x !== id);
    this.sysChat(`${p.name} 님이 나갔습니다.`);
    if (this.g && this.g.ps[id]) {
      const s = this.g.ps[id];
      s.left = true;
      if (s.alive) { s.alive = false; s.cause = 'left'; }
      if (this.g.meeting) delete this.g.meeting.votes[id];
      this.checkWin();
    }
    this.bcast(this.lobbyMsg());
    if (this.g) this.bcast({ t: 'left', id });
  }

  sysChat(text) { this.bcast({ t: 'chat', from: null, text, ch: 'sys' }); }

  chat(from, m) {
    const text = String(m.text || '').slice(0, 200).trim(); if (!text) return;
    const g = this.g;
    if (!g || this.phase === 'lobby' || this.phase === 'end') { this.bcast({ t: 'chat', from, text, ch: 'all' }); return; }
    const me = g.ps[from]; if (!me) return;
    const canHearDead = (id) => { const s = g.ps[id]; return s && (!s.alive || s.role === 'medium'); };
    if (!me.alive) { this.bcast({ t: 'chat', from, text, ch: 'dead' }, canHearDead); return; }
    if (g.silenced.has(from) && this.isTalkPhase()) { this.notify(from, '침묵 상태라 말할 수 없습니다!', 'bad'); return; }
    if (g.mode === 'rt') {
      if (this.phase === 'meeting') this.bcast({ t: 'chat', from, text, ch: 'all' });
      else this.notify(from, '회의 중에만 채팅할 수 있습니다.');
      return;
    }
    if (this.phase === 'night') {
      if (me.team === 'duck') this.bcast({ t: 'chat', from, text, ch: 'duck' }, id => g.ps[id]?.team === 'duck' || canHearDead(id));
      else this.notify(from, '밤에는 말할 수 없습니다.');
      return;
    }
    this.bcast({ t: 'chat', from, text, ch: 'all' });
  }
  isTalkPhase() { return this.phase === 'meeting' || this.phase === 'day' || this.phase === 'dayvote'; }

  // ------------ 게임 시작 ------------
  start() {
    if (this.phase !== 'lobby') return;
    const ids = [...this.order];
    if (ids.length < 3) { this.notify(this.hostId, '최소 3명이 필요합니다.', 'bad'); return; }
    const s = this.settings;
    const roles = assignRoles(ids, s);
    const g = this.g = {
      mode: s.mode, map: s.map, ps: {}, start: now(), round: 1,
      silenced: new Set(), notices: [], bodies: [], killedThisRound: new Set(),
      shield: {}, guardOf: {}, infected: new Set(), lovers: null, ended: false,
    };
    const n = ids.length;
    ids.forEach(id => {
      const role = roles[id];
      g.ps[id] = { id, role, team: ROLES[role].team, alive: true, usedRound: 0, usedGame: 0, cdUntil: 0, killCd: 0, armor: role === 'soldier', polImmune: role === 'politician', emergency: s.emergency, eaten: 0, tasks: [], done: [] };
    });
    if (s.lovers && n >= 4) { const [a, b] = shuffle([...ids]); g.lovers = [a, b]; }
    g.vultureNeed = Math.max(2, Math.ceil(n / 4));
    for (const id of ids) {
      const p = g.ps[id];
      if (p.role === 'bounty') {
        const cands = ids.filter(x => x !== id && g.ps[x].team === 'goose');
        p.bountyTarget = (cands.length ? shuffle(cands) : ids.filter(x => x !== id))[0];
      }
    }
    if (s.mode === 'rt') this.startRT(ids); else this.startTurn(ids);
    for (const id of ids) {
      const p = g.ps[id];
      const you = { role: p.role, team: p.team, tasks: p.tasks };
      if (p.team === 'duck') you.mates = ids.filter(x => x !== id && g.ps[x].team === 'duck');
      if (p.bountyTarget) you.bountyTarget = p.bountyTarget;
      if (p.role === 'vulture') you.vultureNeed = g.vultureNeed;
      if (g.lovers?.includes(id)) you.lover = g.lovers.find(x => x !== id);
      this.send(id, { t: 'start', mode: s.mode, map: s.map, settings: s, players: this.pub(), you, spawn: p.spawn, roleCounts: roleSummary(roles) });
    }
  }

  // ======================================================
  //                실시간(맵) 모드
  // ======================================================
  startRT(ids) {
    const g = this.g, s = this.settings;
    const m = this.map = getMap(s.map);
    this.phase = 'play';
    g.sab = null; g.sabCd = now() + 15000;
    g.morph = {}; g.invis = {}; g.track = {};
    const stations = m.stations.map(st => st.id);
    ids.forEach((id, i) => {
      const p = g.ps[id];
      p.tasks = shuffle([...stations]).slice(0, Math.min(s.tasks, stations.length));
      p.spawn = spawnPoint(m, i, ids.length);
      p.x = p.spawn.x; p.y = p.spawn.y; p.flip = false; p.mv = 0; p.seq = 0;
      p.killCd = now() + 10000;
      p.cdUntil = now() + 10000;
    });
    g.totalTasks = ids.reduce((a, id) => a + (g.ps[id].team === 'goose' ? g.ps[id].tasks.length : 0), 0);
  }
  tasksDone() { const g = this.g; let d = 0; for (const id in g.ps) if (g.ps[id].team === 'goose' && !g.ps[id].left) d += g.ps[id].done.length; return d; }
  tasksTotal() { const g = this.g; let t = 0; for (const id in g.ps) if (g.ps[id].team === 'goose' && !g.ps[id].left) t += g.ps[id].tasks.length; return t; }

  pos(from, m) {
    const g = this.g; if (!g || g.mode !== 'rt') return;
    const p = g.ps[from]; if (!p || m.seq !== p.seq) return;
    if (this.phase !== 'play') return;
    const x = +m.x, y = +m.y; if (!isFinite(x) || !isFinite(y)) return;
    p.x = x; p.y = y; p.flip = !!m.f; p.mv = m.mv ? 1 : 0;
  }
  teleport(id, x, y) {
    const p = this.g.ps[id]; p.x = x; p.y = y; p.seq++;
    this.send(id, { t: 'tp', x, y, seq: p.seq });
  }

  snapRT() {
    const g = this.g, t = now();
    const ps = this.order.filter(id => g.ps[id]).map(id => {
      const p = g.ps[id];
      const mo = g.morph[id] && g.morph[id].until > t ? g.morph[id].as : null;
      const inv = g.invis[id] && g.invis[id] > t ? 1 : 0;
      return [id, Math.round(p.x), Math.round(p.y), p.flip ? 1 : 0, p.mv, p.alive ? 1 : 0, inv, mo];
    });
    const sab = g.sab ? { type: g.sab.type, left: g.sab.type === 'reactor' ? Math.max(0, g.sab.ends - t) : 0, fixed: g.sab.fixed || [] } : null;
    return { t: 'snap', ph: this.phase, ps, bodies: g.bodies.map(b => [b.id, Math.round(b.x), Math.round(b.y)]), sab, tp: [this.tasksDone(), this.tasksTotal()] };
  }

  canVent(p) { return p.alive && (ROLES[p.role].vent || p.role === 'engineer'); }

  act(from, m) {
    const g = this.g; const p = g.ps[from]; if (!p || g.ended) return;
    if (g.mode === 'turn') return this.actTurn(from, p, m);
    const t = now();
    const near = (o, r = USE_RANGE) => dist(p, o) <= r + 4;
    switch (m.a) {
      case 'kill': {
        if (this.phase !== 'play' || !p.alive) return;
        const isKiller = p.team === 'duck' || p.role === 'falcon';
        if (!isKiller || p.killCd > t) return;
        const tg = g.ps[m.target]; if (!tg || !tg.alive || tg.id === from) return;
        if (p.team === 'duck' && tg.team === 'duck') return;
        if (dist(p, tg) > KILL_RANGE + 6) return;
        const r = this.attack(from, m.target, 'kill');
        p.killCd = t + this.settings.killCooldown * 1000;
        this.send(from, { t: 'cd', kill: p.killCd - t });
        if (r === 'killed') this.notify(from, `${J(this.name(m.target), '을')} 처치했습니다.`);
        return;
      }
      case 'report': {
        if (this.phase !== 'play' || !p.alive) return;
        const b = g.bodies.find(b => b.id === m.body); if (!b || !near(b, USE_RANGE * 1.4)) return;
        return this.startMeeting(from, 'report', b.id);
      }
      case 'button': {
        if (this.phase !== 'play' || !p.alive) return;
        if (!near(center(this.map.button), USE_RANGE * 1.3)) return;
        if (p.emergency <= 0) { this.notify(from, '긴급회의 횟수를 모두 썼습니다.', 'bad'); return; }
        if (g.sab && g.sab.type === 'reactor') { this.notify(from, '긴급 상황 중에는 회의를 열 수 없습니다!', 'bad'); return; }
        p.emergency--;
        return this.startMeeting(from, 'button', null);
      }
      case 'task': {
        if (this.phase !== 'play') return;
        const st = this.map.stations[m.station]; if (!st) return;
        if (!p.tasks.includes(st.id) || p.done.includes(st.id)) return;
        if (!near(center(st), USE_RANGE * 1.4)) return;
        if (p.team !== 'goose') return;
        p.done.push(st.id);
        this.send(from, { t: 'taskdone', station: st.id });
        this.checkWin();
        return;
      }
      case 'vent': {
        if (this.phase !== 'play' || !this.canVent(p)) return;
        const v = this.map.vents[m.vent]; if (!v || !near(center(v), USE_RANGE * 1.3)) return;
        const group = this.map.vents.filter(x => x.group === v.group);
        const nx = group[(group.indexOf(v) + 1) % group.length];
        const c = center(nx);
        this.teleport(from, c.x, c.y + 4);
        return;
      }
      case 'sab': {
        if (this.phase !== 'play' || !p.alive || p.team !== 'duck') return;
        if (g.sab || g.sabCd > t) return;
        if (!['lights', 'reactor', 'comms'].includes(m.type)) return;
        g.sab = { type: m.type, fixed: [], ends: m.type === 'reactor' ? t + 45000 : 0 };
        this.bcast({ t: 'sabstart', type: m.type });
        return;
      }
      case 'fix': {
        if (this.phase !== 'play' || !g.sab || !p.alive) return;
        const s = g.sab;
        if (m.what === 'lights' && s.type === 'lights' && near(center(this.map.lights), USE_RANGE * 1.4)) return this.endSab();
        if (m.what === 'comms' && s.type === 'comms' && near(center(this.map.comms), USE_RANGE * 1.4)) return this.endSab();
        if (s.type === 'reactor' && (m.what === 0 || m.what === 1) && near(center(this.map.reactor[m.what]), USE_RANGE * 1.4)) {
          if (!s.fixed.includes(m.what)) s.fixed.push(m.what);
          if (s.fixed.length >= 2) this.endSab();
        }
        return;
      }
      case 'ability': return this.abilityRT(from, p, m);
      case 'vote': return this.vote(from, m.target);
      case 'guess': return this.guess(from, m.target, m.role);
    }
  }

  endSab() {
    const g = this.g; if (!g.sab) return;
    g.sab = null; g.sabCd = now() + 30000;
    this.bcast({ t: 'sabend' });
  }

  abilityRT(from, p, m) {
    const g = this.g, t = now(), R = ROLES[p.role].rt; if (!R) return;
    if (this.phase !== 'play') return;
    const alive = p.alive;
    if (!alive) return;
    if (R.perRound && p.usedRound >= R.perRound) { this.notify(from, '이번 라운드에는 더 쓸 수 없습니다.'); return; }
    if (R.perGame && p.usedGame >= R.perGame) { this.notify(from, '이미 사용했습니다.'); return; }
    if (R.cooldown === 'kill' && p.killCd > t) return;
    if (typeof R.cooldown === 'number' && p.cdUntil > t) return;
    let tg = null, body = null;
    if (R.target === 'player' || R.target === 'far') {
      tg = g.ps[m.target];
      if (!tg || !tg.alive || tg.id === from) return;
      if (dist(p, tg) > (R.target === 'far' ? SNIPE_RANGE : KILL_RANGE + 6)) return;
    } else if (R.target === 'body') {
      body = g.bodies.find(b => b.id === m.body);
      if (!body || dist(p, body) > USE_RANGE * 1.5) return;
    }
    const used = () => {
      p.usedRound++; p.usedGame++;
      if (R.cooldown === 'kill') { p.killCd = t + this.settings.killCooldown * 1000; this.send(from, { t: 'cd', kill: p.killCd - t }); }
      if (typeof R.cooldown === 'number') { p.cdUntil = t + R.cooldown * 1000; }
      this.send(from, { t: 'abil', usedRound: p.usedRound, usedGame: p.usedGame, cd: Math.max(0, p.cdUntil - t) });
    };
    const N = (id) => this.name(id);
    switch (p.role) {
      case 'detective': used(); this.notify(from, g.killedThisRound.has(tg.id) ? `🔍 ${J(N(tg.id), '은')} 이번 라운드에 살인을 했습니다!` : `🔍 ${J(N(tg.id), '은')} 이번 라운드에 살인하지 않았습니다.`, 'role'); break;
      case 'medic': used(); g.shield[tg.id] = from; this.notify(from, `💉 ${N(tg.id)}에게 보호막을 씌웠습니다.`, 'role'); break;
      case 'sheriff': used();
        if (isEvil(tg.role)) { this.attack(from, tg.id, 'sheriff'); this.notify(from, `🔫 ${J(N(tg.id), '을')} 쐈습니다!`, 'role'); }
        else { this.killPlayer(from, null, 'misfire'); this.notify(from, '🔫 무고한 사람을 겨눴습니다... 보안관이 죽었습니다.', 'bad'); }
        break;
      case 'engineer': if (!g.sab) { this.notify(from, '고칠 사보타주가 없습니다.'); return; } used(); this.endSab(); this.notify(from, '🔧 원격으로 수리했습니다!', 'role'); break;
      case 'mortician': used(); this.notify(from, `⚰️ ${N(body.id)}의 직업은 [${ROLES[g.ps[body.id].role].name}]입니다.`, 'role'); break;
      case 'bodyguard': used(); g.guardOf[tg.id] = from; this.notify(from, `🛡️ ${J(N(tg.id), '을')} 경호합니다.`, 'role'); break;
      case 'tracker': used(); g.track[from] = tg.id; this.send(from, { t: 'track', target: tg.id }); this.notify(from, `🧭 ${N(tg.id)}에게 추적기를 달았습니다.`, 'role'); break;
      case 'lookout': used(); this.send(from, { t: 'cctv', ms: 5000 }); break;
      case 'reporter': used(); g.notices.push(`📰 기자 특종! ${N(tg.id)}의 직업은 [${ROLES[tg.role].name}]입니다!`); this.notify(from, '📰 다음 회의에 특종이 공개됩니다.', 'role'); break;
      case 'priest': {
        used();
        const v = g.ps[body.id];
        g.bodies = g.bodies.filter(b => b !== body);
        v.alive = true; v.cause = null;
        this.teleport(body.id, body.x, body.y);
        this.send(body.id, { t: 'revived' });
        this.notify(from, `✝️ ${J(N(body.id), '을')} 되살렸습니다!`, 'role');
        break;
      }
      case 'morph': used(); g.morph[from] = { as: tg.id, until: t + 25000 }; this.notify(from, `🎭 ${J(N(tg.id), '으로')} 변장했습니다 (25초)`, 'role'); break;
      case 'cleaner': used(); g.bodies = g.bodies.filter(b => b !== body); this.notify(from, '🧹 시체를 치웠습니다.', 'role'); break;
      case 'invisible': used(); g.invis[from] = t + 8000; this.notify(from, '👻 8초 동안 투명해집니다!', 'role'); break;
      case 'sniper': used(); { const r = this.attack(from, tg.id, 'snipe'); if (r === 'killed') this.notify(from, `🎯 ${J(N(tg.id), '을')} 저격했습니다.`, 'role'); } break;
      case 'silencer': used(); g.silenced.add(tg.id); this.notify(from, `🤐 ${J(N(tg.id), '은')} 다음 회의에서 말할 수 없습니다.`, 'role'); break;
      case 'spy': used(); this.notify(from, `🕵️ ${N(tg.id)}의 직업은 [${ROLES[tg.role].name}]입니다.`, 'role'); break;
      case 'falcon': used(); { const r = this.attack(from, tg.id, 'kill'); if (r === 'killed') this.notify(from, `🦅 ${J(N(tg.id), '을')} 사냥했습니다.`, 'role'); } break;
      case 'pigeon': {
        if (g.infected.has(tg.id)) { this.notify(from, '이미 감염된 대상입니다.'); return; }
        used(); g.infected.add(tg.id); this.notify(from, `🕊️ ${J(N(tg.id), '을')} 감염시켰습니다. (${this.pigeonCount(from)})`, 'role');
        this.send(from, { t: 'infected', list: [...g.infected] });
        this.checkWin(); break;
      }
      case 'vulture': used(); g.bodies = g.bodies.filter(b => b !== body); p.eaten++; this.notify(from, `🦃 시체를 먹었습니다 (${p.eaten}/${g.vultureNeed})`, 'role'); this.checkWin(); break;
    }
  }
  pigeonCount(pid) { const g = this.g; const al = Object.values(g.ps).filter(s => s.alive && s.id !== pid); return `${al.filter(s => g.infected.has(s.id)).length}/${al.length}`; }

  // 공격 처리 (두 모드 공용). 결과: killed | shield | guard | armor | none
  attack(attackerId, targetId, cause) {
    const g = this.g; const T = g.ps[targetId]; if (!T || !T.alive) return 'none';
    if (g.shield[targetId]) {
      delete g.shield[targetId];
      this.notify(targetId, '💉 의사의 보호막이 공격을 막아줬습니다!', 'good');
      if (attackerId) this.notify(attackerId, '공격이 보호막에 막혔습니다!', 'bad');
      return 'shield';
    }
    const gd = g.guardOf[targetId];
    if (gd && g.ps[gd]?.alive && gd !== attackerId) {
      delete g.guardOf[targetId];
      this.killPlayer(gd, attackerId, cause);
      this.notify(targetId, '🛡️ 경호원이 당신 대신 공격을 받았습니다!', 'good');
      return 'guard';
    }
    if (T.armor) {
      T.armor = false;
      this.notify(targetId, '🪖 군인의 갑옷이 공격을 버텨냈습니다! (이제 갑옷 없음)', 'good');
      if (attackerId) this.notify(attackerId, '상대가 공격을 버텨냈습니다!', 'bad');
      return 'armor';
    }
    this.killPlayer(targetId, attackerId, cause);
    return 'killed';
  }

  killPlayer(id, killerId, cause) {
    const g = this.g; const v = g.ps[id]; if (!v || !v.alive) return;
    v.alive = false; v.cause = cause; v.killer = killerId;
    if (killerId) g.killedThisRound.add(killerId);
    if (g.mode === 'rt' && cause !== 'eject' && cause !== 'left') g.bodies.push({ id, x: v.x, y: v.y });
    if (g.mode === 'turn') (g.nightDeaths ||= []).push(id);
    this.send(id, { t: 'died', cause, killer: killerId && (cause === 'assassin' ? killerId : null) });
    if (v.role === 'avenger' && killerId && cause !== 'eject') g.notices.push(`⚔️ 복수자 ${this.name(id)}의 원한: 범인은 ${this.name(killerId)}입니다!`);
    if (g.mode === 'rt' && v.role === 'celebrity') this.bcast({ t: 'toast', text: `⭐ 유명인 ${J(this.name(id), '이')} ${this.map.roomName(v.x, v.y)}에서 사망했습니다!`, kind: 'bad' });
    if (g.mode === 'rt' && v.role === 'canadian' && killerId && this.phase === 'play') setTimeout(() => { if (this.phase === 'play' && !g.ended) this.startMeeting(id, 'report', id); }, 1200);
    // 연인
    if (g.lovers && g.lovers.includes(id)) {
      const other = g.lovers.find(x => x !== id);
      if (g.ps[other]?.alive) { this.notify(other, '💔 연인이 죽어 슬픔에 잠겨 함께 떠납니다...', 'bad'); this.killPlayer(other, null, 'heartbreak'); }
    }
    // 현상금 목표가 투표 외로 사망 → 도도새로
    for (const pid in g.ps) {
      const b = g.ps[pid];
      if (b.role === 'bounty' && b.bountyTarget === id && b.alive && cause !== 'eject') {
        b.role = 'dodo'; this.send(pid, { t: 'rolechange', role: 'dodo', text: '목표가 죽었습니다. 이제 당신은 도도새입니다! 투표로 추방당하면 승리합니다.' });
      }
    }
    this.checkWin();
  }

  // ------------ 회의 (실시간) ------------
  startMeeting(caller, reason, bodyId) {
    const g = this.g; if (this.phase !== 'play' || g.ended) return;
    this.phase = 'meeting';
    if (g.sab) { g.sab = null; this.bcast({ t: 'sabend' }); }
    g.morph = {}; g.invis = {};
    const t = now(), s = this.settings;
    g.meeting = {
      caller, reason, body: bodyId, votes: {}, stage: s.discussTime > 0 ? 'discuss' : 'vote',
      ends: t + (s.discussTime > 0 ? s.discussTime : s.voteTime) * 1000,
      notices: [...g.notices], silenced: [...g.silenced], guessed: {},
    };
    g.notices = [];
    this.bcast({ t: 'meeting', ...this.meetingPub() });
    this.applySilence();
  }
  meetingPub() {
    const g = this.g, M = g.meeting;
    return {
      caller: M.caller, reason: M.reason, body: M.body, stage: M.stage, left: Math.max(0, M.ends - now()),
      notices: M.notices, silenced: M.silenced, alive: Object.values(g.ps).filter(s => s.alive).map(s => s.id),
      voted: Object.keys(M.votes),
    };
  }
  applySilence() { const g = this.g; for (const id of g.silenced) this.send(id, { t: 'silenced', on: true }); }
  clearSilence() { const g = this.g; for (const id of g.silenced) this.send(id, { t: 'silenced', on: false }); g.silenced.clear(); }

  vote(from, target) {
    const g = this.g, M = g.meeting; const p = g.ps[from];
    if (!M || !p || !p.alive) return;
    if (g.mode === 'rt' && (this.phase !== 'meeting' || M.stage !== 'vote')) return;
    if (g.mode === 'turn' && this.phase !== 'dayvote') return;
    if (M.votes[from] !== undefined) return;
    if (target !== 'skip' && !g.ps[target]?.alive) return;
    M.votes[from] = target;
    this.bcast({ t: 'voted', id: from });
    const aliveIds = Object.values(g.ps).filter(s => s.alive).map(s => s.id);
    if (aliveIds.every(id => M.votes[id] !== undefined)) this.tally();
  }

  guess(from, target, role) {
    const g = this.g; const p = g.ps[from];
    if (!p || !p.alive || p.role !== 'assassin') return;
    const inMeeting = g.mode === 'rt' ? this.phase === 'meeting' : (this.phase === 'day' || this.phase === 'dayvote');
    if (!inMeeting || !g.meeting) return;
    if (g.meeting.guessed[from]) { this.notify(from, '이번 회의에는 이미 추측했습니다.'); return; }
    const tg = g.ps[target]; if (!tg || !tg.alive || target === from || !ROLES[role]) return;
    g.meeting.guessed[from] = true;
    if (tg.role === role) {
      this.killPlayer(target, from, 'assassin');
      this.bcast({ t: 'toast', text: `🗡️ ${J(this.name(target), '이')} 회의 도중 암살당했습니다!`, kind: 'bad' });
    } else {
      this.killPlayer(from, null, 'assassinFail');
      this.bcast({ t: 'toast', text: `🗡️ ${J(this.name(from), '이')} 암살에 실패하고 쓰러졌습니다!`, kind: 'bad' });
    }
    delete g.meeting.votes[target]; delete g.meeting.votes[from];
    if (!g.ended) this.bcast({ t: 'meetingUpdate', ...this.meetingPub() });
  }

  tally() {
    const g = this.g, M = g.meeting; if (!M || M.tallied) return;
    M.tallied = true;
    const counts = {};
    for (const [voter, tg] of Object.entries(M.votes)) {
      if (!g.ps[voter]?.alive) continue;
      const w = g.ps[voter].role === 'politician' ? 2 : 1;
      counts[tg] = (counts[tg] || 0) + w;
    }
    let best = null, bestN = 0, tie = false;
    for (const [k, n] of Object.entries(counts)) { if (n > bestN) { best = k; bestN = n; tie = false; } else if (n === bestN) tie = true; }
    let ejected = (!tie && best && best !== 'skip') ? best : null;
    let text, saved = false;
    const s = this.settings;
    if (!ejected) text = tie ? '동점이라 아무도 추방되지 않았습니다.' : '아무도 추방되지 않았습니다. (건너뛰기)';
    else {
      const E = g.ps[ejected];
      if (E.polImmune) { E.polImmune = false; saved = true; text = `${J(this.name(ejected), '은')} 정치인이라 추방을 버텨냈습니다! (다음엔 없음)`; }
      else {
        const rn = ROLES[E.role].name;
        text = s.confirmEjects ? `${J(this.name(ejected), '은')} [${rn}]${E.team === 'duck' ? ' — 오리' : E.team === 'neutral' ? ' — 중립' : ' — 거위'}였습니다.` : `${J(this.name(ejected), '이')} 추방되었습니다.`;
      }
    }
    const votes = s.anonVotes ? null : M.votes;
    this.phase = g.mode === 'rt' ? 'result' : 'verdict';
    g.resultEnds = now() + 6000;
    this.bcast({ t: 'result', ejected: saved ? null : ejected, text, votes, counts });
    if (ejected && !saved) {
      const E = g.ps[ejected];
      if (E.role === 'dodo') return this.endGame('dodo', `도도새 ${J(this.name(ejected), '이')} 추방되어 승리했습니다!`, [ejected]);
      for (const pid in g.ps) {
        const b = g.ps[pid];
        if (b.role === 'bounty' && b.bountyTarget === ejected && b.alive) return this.endGame('bounty', `현상금 사냥꾼 ${this.name(pid)}의 목표가 추방되었습니다!`, [pid]);
      }
      this.killPlayer(ejected, null, 'eject');
    }
  }

  afterResult() {
    const g = this.g;
    if (g.ended) return;
    g.meeting = null;
    this.clearSilence();
    if (g.mode === 'turn') return this.beginNight();
    this.phase = 'play';
    g.round++;
    g.bodies = [];
    g.killedThisRound.clear(); g.shield = {}; g.guardOf = {}; g.track = {};
    const ids = this.order.filter(id => g.ps[id]);
    const t = now();
    ids.forEach((id, i) => {
      const p = g.ps[id];
      p.usedRound = 0;
      p.killCd = t + this.settings.killCooldown * 1000;
      const sp = spawnPoint(this.map, i, ids.length);
      this.teleport(id, sp.x, sp.y);
      this.send(id, { t: 'resume', killCd: this.settings.killCooldown * 1000, cd: Math.max(0, p.cdUntil - t) });
    });
    g.sabCd = t + 15000;
  }

  // ======================================================
  //                낮/밤 (마피아식) 모드
  // ======================================================
  startTurn() {
    const g = this.g;
    g.meeting = null; g.nightActs = {};
    this.phase = 'intro';
    g.phaseEnds = now() + 6000;
    g.day = 0;
  }
  beginNight() {
    const g = this.g; if (g.ended) return;
    this.phase = 'night'; g.day++;
    g.nightActs = {}; g.duckVotes = {};
    g.phaseEnds = now() + this.settings.nightTime * 1000;
    this.bcast({ t: 'phase', ph: 'night', day: g.day, left: this.settings.nightTime * 1000, alive: this.aliveIds() });
  }
  aliveIds() { return Object.values(this.g.ps).filter(s => s.alive).map(s => s.id); }

  actTurn(from, p, m) {
    const g = this.g;
    if (m.a === 'vote') return this.vote(from, m.target);
    if (m.a === 'guess') return this.guess(from, m.target, m.role);
    if (m.a !== 'night' || this.phase !== 'night' || !p.alive) return;
    const tg = g.ps[m.target];
    if (m.kind === 'kill') {
      if (p.team !== 'duck' || !tg || !tg.alive || tg.team === 'duck') return;
      g.duckVotes[from] = m.target;
      this.bcast({ t: 'duckvotes', votes: g.duckVotes }, id => g.ps[id]?.team === 'duck');
      return;
    }
    const N = ROLES[p.role].night; if (!N) return;
    if (N.perGame && p.usedGame >= N.perGame) { this.notify(from, '이미 사용한 능력입니다.'); return; }
    if (N.target === 'dead') { if (!tg || tg.alive || tg.left) return; }
    else if (N.target === 'other') { if (!tg || !tg.alive || tg.id === from) return; }
    else if (N.target === 'any') { if (!tg || !tg.alive) return; }
    if (p.role === 'pigeon' && g.infected.has(m.target)) { this.notify(from, '이미 감염된 대상입니다.'); return; }
    if (p.role === 'vulture' && tg.eaten) { this.notify(from, '이미 먹은 시체입니다.'); return; }
    if (p.role === 'falcon' && tg.id === from) return;
    g.nightActs[from] = m.target;
    this.send(from, { t: 'nightack', target: m.target });
  }

  resolveNight() {
    const g = this.g, N = (id) => this.name(id);
    const acts = g.nightActs; const ps = g.ps;
    const visits = {}; // visitor -> target
    const morning = [];
    g.nightDeaths = [];
    // 오리팀 살해 대상 (다수결)
    const tally = {};
    for (const [d, tg] of Object.entries(g.duckVotes || {})) if (ps[d]?.alive) tally[tg] = (tally[tg] || 0) + 1;
    let duckTarget = null, best = 0;
    for (const [tg, n] of Object.entries(tally)) if (n > best || (n === best && Math.random() < 0.5)) { duckTarget = tg; best = n; }
    let duckKiller = null;
    if (duckTarget) { duckKiller = Object.keys(g.duckVotes).find(d => g.duckVotes[d] === duckTarget && ps[d]?.alive); visits[duckKiller] = duckTarget; }
    for (const [a, tg] of Object.entries(acts)) if (ps[a]?.alive && ROLES[ps[a].role].night?.target !== 'dead') { if (!visits[a]) visits[a] = tg; }
    const roleOf = (r) => Object.keys(acts).filter(a => ps[a]?.alive && ps[a].role === r);
    // 1. 부활
    for (const a of roleOf('priest')) {
      const v = ps[acts[a]]; if (!v || v.alive || v.left) continue;
      v.alive = true; v.cause = null; ps[a].usedGame++;
      morning.push(`✝️ 기적이 일어났습니다! ${J(N(v.id), '이')} 되살아났습니다.`);
      this.send(v.id, { t: 'revived' });
    }
    // 2. 정보/보호
    for (const a of roleOf('medic')) g.shield[acts[a]] = a;
    for (const a of roleOf('bodyguard')) g.guardOf[acts[a]] = a;
    for (const a of roleOf('silencer')) g.silenced.add(acts[a]);
    for (const a of roleOf('detective')) {
      const tg = ps[acts[a]]; let res;
      if (tg.role === 'morph' || tg.team === 'goose') res = '거위팀으로 보입니다.';
      else if (tg.team === 'duck') res = '🦆 오리팀입니다!';
      else res = tg.role === 'falcon' ? '⚠️ 위험한 중립입니다!' : '중립으로 보입니다.';
      this.notify(a, `🔍 조사 결과: ${J(N(tg.id), '은')} ${res}`, 'role');
    }
    for (const a of roleOf('spy')) this.notify(a, `🕵️ ${N(acts[a])}의 직업은 [${ROLES[ps[acts[a]].role].name}]입니다.`, 'role');
    for (const a of roleOf('mortician')) this.notify(a, `⚰️ ${N(acts[a])}의 직업은 [${ROLES[ps[acts[a]].role].name}]이었습니다.`, 'role');
    for (const a of roleOf('reporter')) { ps[a].usedGame++; morning.push(`📰 기자 특종! ${N(acts[a])}의 직업은 [${ROLES[ps[acts[a]].role].name}]입니다!`); }
    for (const a of roleOf('pigeon')) { g.infected.add(acts[a]); this.notify(a, `🕊️ ${J(N(acts[a]), '을')} 감염시켰습니다. (${this.pigeonCount(a)})`, 'role'); this.send(a, { t: 'infected', list: [...g.infected] }); }
    for (const a of roleOf('vulture')) { const v = ps[acts[a]]; if (v && !v.alive && !v.eaten) { v.eaten = true; ps[a].eaten++; this.notify(a, `🦃 ${N(v.id)}의 시체를 먹었습니다 (${ps[a].eaten}/${g.vultureNeed})`, 'role'); } }
    // 3. 공격
    const attacks = [];
    if (duckTarget) attacks.push([duckKiller, duckTarget, 'kill']);
    for (const a of roleOf('sniper')) { ps[a].usedGame++; attacks.push([a, acts[a], 'snipe']); }
    for (const a of roleOf('falcon')) attacks.push([a, acts[a], 'kill']);
    const sheriffShots = roleOf('sheriff');
    let attacked = 0, saved = 0;
    const cleanerAlive = Object.values(ps).some(s => s.alive && s.role === 'cleaner');
    const hidden = new Set();
    for (const [a, tg, cause] of attacks) {
      if (!ps[a]?.alive && cause !== 'kill') continue;
      attacked++;
      const r = this.attack(a, tg, cause);
      if (r !== 'killed') saved++;
      if (r === 'killed' && cleanerAlive && ps[a]?.team === 'duck') hidden.add(tg);
    }
    for (const a of sheriffShots) {
      if (!ps[a].alive) continue;
      const tg = ps[acts[a]];
      if (isEvil(tg.role)) this.attack(a, tg.id, 'sheriff');
      else { this.killPlayer(a, null, 'misfire'); this.notify(a, '🔫 무고한 사람을 쐈습니다... 보안관이 죽었습니다.', 'bad'); }
    }
    // 4. 추적/감시
    for (const a of roleOf('tracker')) { const v = visits[acts[a]]; this.notify(a, v ? `🧭 ${J(N(acts[a]), '은')} 밤에 ${J(N(v), '을')} 찾아갔습니다.` : `🧭 ${J(N(acts[a]), '은')} 밤새 아무 데도 가지 않았습니다.`, 'role'); }
    for (const a of roleOf('lookout')) {
      const who = Object.keys(visits).filter(v => visits[v] === acts[a] && v !== a);
      this.notify(a, who.length ? `👁️ ${J(N(acts[a]), '을')} 찾아온 사람: ${who.map(N).join(', ')}` : `👁️ ${J(N(acts[a]), '을')} 찾아온 사람은 없었습니다.`, 'role');
    }
    // 아침 발표
    const deaths = g.nightDeaths || [];
    if (deaths.length === 0) morning.unshift(attacked ? '🌅 밤사이 공격이 있었지만 아무도 죽지 않았습니다!' : '🌅 조용한 밤이었습니다. 아무도 죽지 않았습니다.');
    else for (const d of deaths) {
      const show = this.settings.revealOnDeath && !hidden.has(d);
      morning.unshift(`💀 ${J(N(d), '이')} 죽은 채 발견되었습니다.${show ? ` (직업: ${ROLES[ps[d].role].name})` : ''}`);
    }
    morning.push(...g.notices); g.notices = [];
    for (const s of g.silenced) morning.push(`🤐 ${J(N(s), '은')} 오늘 말을 할 수 없습니다.`);
    g.shield = {}; g.guardOf = {};
    return morning;
  }

  tick() {
    const g = this.g; if (!g || g.ended) return;
    const t = now();
    if (g.mode === 'rt') {
      if (this.phase === 'play') {
        this.bcast(this.snapRT());
        if (g.sab?.type === 'reactor' && t > g.sab.ends) return this.endGame('duck', `${this.map.sab.reactor}! 오리팀 승리`);
      } else if (this.phase === 'meeting') {
        const M = g.meeting;
        if (t > M.ends) {
          if (M.stage === 'discuss') { M.stage = 'vote'; M.ends = t + this.settings.voteTime * 1000; this.bcast({ t: 'meetingUpdate', ...this.meetingPub() }); }
          else this.tally();
        }
        if ((t / 66 | 0) % 8 === 0) this.bcast(this.snapRT());
      } else if (this.phase === 'result' && t > g.resultEnds) this.afterResult();
      return;
    }
    // 낮밤 모드
    if (t < g.phaseEnds && this.phase !== 'dayvote' && this.phase !== 'verdict') return;
    switch (this.phase) {
      case 'intro': this.beginNight(); break;
      case 'night': {
        const morning = this.resolveNight();
        if (g.ended) return;
        this.phase = 'morning'; g.phaseEnds = t + 7000;
        this.bcast({ t: 'phase', ph: 'morning', day: g.day, lines: morning, left: 7000, alive: this.aliveIds(), silenced: [...g.silenced] });
        this.applySilence();
        break;
      }
      case 'morning':
        this.phase = 'day'; g.phaseEnds = t + this.settings.dayTime * 1000;
        g.meeting = { votes: {}, guessed: {}, silenced: [...g.silenced] };
        this.bcast({ t: 'phase', ph: 'day', day: g.day, left: this.settings.dayTime * 1000, alive: this.aliveIds(), silenced: [...g.silenced] });
        break;
      case 'day':
        this.phase = 'dayvote'; g.phaseEnds = t + this.settings.dayVoteTime * 1000;
        this.bcast({ t: 'phase', ph: 'dayvote', day: g.day, left: this.settings.dayVoteTime * 1000, alive: this.aliveIds(), silenced: [...g.silenced] });
        break;
      case 'dayvote': if (t > g.phaseEnds) this.tally(); break;
      case 'verdict': if (t > g.resultEnds) this.afterResult(); break;
    }
  }

  // ------------ 승리 판정 ------------
  checkWin() {
    const g = this.g; if (!g || g.ended || this.phase === 'lobby') return;
    const all = Object.values(g.ps).filter(s => !s.left);
    const alive = all.filter(s => s.alive);
    const ducks = alive.filter(s => s.team === 'duck').length;
    const falcon = alive.some(s => s.role === 'falcon');
    // 중립 단독 승리
    for (const s of alive) {
      if (s.role === 'pigeon') { const others = alive.filter(x => x.id !== s.id); if (others.length && others.every(x => g.infected.has(x.id))) return this.endGame('pigeon', `비둘기 ${J(this.name(s.id), '이')} 모두를 감염시켰습니다!`, [s.id]); }
    }
    for (const s of all) if (s.role === 'vulture' && s.eaten >= g.vultureNeed) return this.endGame('vulture', `독수리 ${J(this.name(s.id), '이')} 배불리 먹었습니다!`, [s.id]);
    if (g.mode === 'rt') { const tt = this.tasksTotal(); if (tt > 0 && this.tasksDone() >= tt) return this.endGame('goose', '거위들이 모든 임무를 완료했습니다!'); }
    if (falcon && alive.length <= 2) return this.endGame('falcon', '매가 마지막까지 살아남았습니다!', alive.filter(s => s.role === 'falcon').map(s => s.id));
    if (ducks === 0 && !falcon) return this.endGame('goose', '모든 위협을 제거했습니다! 거위팀 승리');
    if (!falcon && ducks > 0 && ducks >= alive.length - ducks) return this.endGame('duck', '오리 수가 거위 수와 같아졌습니다! 오리팀 승리');
    if (alive.length === 0) return this.endGame('none', '모두 죽었습니다...');
  }

  endGame(kind, reason, soloWinners) {
    const g = this.g; if (g.ended) return;
    g.ended = true; this.phase = 'end';
    const all = Object.values(g.ps);
    let winners;
    if (soloWinners) winners = soloWinners;
    else if (kind === 'goose' || kind === 'duck') winners = all.filter(s => s.team === kind).map(s => s.id);
    else winners = [];
    // 생존자: 살아있으면 함께 승리 (단독 승리 제외)
    if (!soloWinners || kind === 'falcon') for (const s of all) if (s.role === 'survivor' && s.alive && !s.left) winners.push(s.id);
    const titles = { goose: '🪿 거위팀 승리!', duck: '🦆 오리팀 승리!', dodo: '🦤 도도새 승리!', falcon: '🦅 매 승리!', pigeon: '🕊️ 비둘기 승리!', vulture: '🦃 독수리 승리!', bounty: '💰 현상금 사냥꾼 승리!', none: '무승부' };
    this.bcast({
      t: 'end', kind, title: titles[kind] || '게임 종료', reason, winners,
      roles: Object.fromEntries(all.map(s => [s.id, { role: s.role, alive: s.alive, team: s.team }])),
      lovers: g.lovers,
    });
    this.bcast(this.lobbyMsg());
  }
}

function roleSummary(roles) {
  const c = {}; for (const r of Object.values(roles)) c[r] = (c[r] || 0) + 1; return c;
}

export function sanitizeSettings(s) {
  const d = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!s || typeof s !== 'object') return d;
  for (const k of Object.keys(d)) {
    if (k === 'roles') continue;
    if (typeof d[k] === typeof s[k]) d[k] = s[k];
  }
  if (!['rt', 'turn'].includes(d.mode)) d.mode = 'rt';
  if (!['space', 'village', 'mansion'].includes(d.map)) d.map = 'space';
  d.ducks = Math.max(1, Math.min(5, d.ducks | 0));
  for (const r of Object.keys(d.roles)) { const v = s.roles?.[r]; if (Number.isInteger(v)) d.roles[r] = Math.max(0, Math.min(3, v)); }
  return d;
}
