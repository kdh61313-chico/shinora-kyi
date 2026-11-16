import { J } from './josa.js';
// 실시간 맵 모드 클라이언트 (렌더링 + 입력 + HUD + 회의)
import { getMap, TILE, FLOOR_NAMES } from './maps.js';
import { ROLES, TEAMS, ROLE_ORDER } from './roles.js';
import { COLORS, gooseSprite, propSprite, tileSprite } from './sprites.js';
import { h, $, gooseCanvas, showEnd, roleCard, introOverlay, IS_TOUCH, fullscreenButton } from './util.js';
import { openTask } from './tasks.js';

const now = () => Date.now();
const KILL_RANGE = 1.8 * TILE, USE_RANGE = 1.6 * TILE, SNIPE_RANGE = 13 * TILE;
const BASE_VISION = 5.5 * TILE;
const SPEED = 80;
const STATION_PROP = { space: 'console', village: 'crate', mansion: 'panel' };

export class RTView {
  constructor(app, st) {
    this.app = app; this.st = st; this.s = st.settings; this.you = st.you; this.me = app.me;
    this.map = getMap(st.map); this.roster = st.players;
    this.role = st.you.role;
    this.x = st.spawn.x; this.y = st.spawn.y; this.flip = false; this.mv = false; this.seq = 0;
    this.alive = true; this.phase = 'play';
    this.ents = new Map();
    for (const p of this.roster) this.ents.set(p.id, { x: this.x, y: this.y, tx: this.x, ty: this.y, flip: false, mv: 0, alive: 1, inv: 0, morph: null });
    this.bodies = []; this.sab = null; this.tp = [0, 1];
    this.tasks = st.you.tasks || []; this.done = new Set();
    this.killReady = now() + 10000; this.abilReady = now() + 10000; this.usedRound = 0; this.usedGame = 0;
    this.track = null; this.cctvUntil = 0; this.infected = new Set(); this.silenced = false;
    this.keys = {}; this.joy = { x: 0, y: 0 };
    this.taskOpen = null; this.frame = 0;
    this.buildDOM(); this.bindInput(); this.prerender();
    introOverlay(app, st.you, this.roster);
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.sendTimer = setInterval(() => this.sendPos(), 50);
    this.hudTimer = setInterval(() => this.updateHUD(), 120);
  }

  destroy() {
    cancelAnimationFrame(this.raf); clearInterval(this.sendTimer); clearInterval(this.hudTimer); clearInterval(this.meetTimer);
    window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp); window.removeEventListener('resize', this.onResize);
    this.taskOpen?.(); this.root.innerHTML = '';
  }

  P(id) { return this.roster.find(p => p.id === id); }
  name(id) { return this.P(id)?.name ?? '???'; }
  get isDuck() { return this.you.team === 'duck'; }
  get canKill() { return this.isDuck; }
  get canVent() { return !!ROLES[this.role].vent || this.role === 'engineer'; }
  get seesGhosts() { return !this.alive || this.role === 'medium'; }

  // ---------------- DOM ----------------
  buildDOM() {
    this.app.screen('game');
    const root = this.root = $('#game'); root.innerHTML = '';
    this.canvas = h('canvas', { class: 'world' });
    this.ctx = this.canvas.getContext('2d');
    this.fog = document.createElement('canvas'); this.fctx = this.fog.getContext('2d');
    const btn = (key, label, cls, fn) => {
      const b = h('button', { class: 'abtn ' + cls, onclick: (e) => { e.preventDefault(); fn(); } }, h('span', { class: 'lbl' }, label), h('span', { class: 'key' }, key), h('span', { class: 'cdt' }));
      return b;
    };
    this.btns = {
      use: btn('E', '사용', 'use', () => this.doUse()),
      report: btn('R', '신고', 'report', () => this.doReport()),
      kill: this.canKill ? btn('Q', '처치', 'kill', () => this.doKill()) : null,
      abil: ROLES[this.role].rt ? btn('F', ROLES[this.role].rt.label, 'abil', () => this.doAbility()) : null,
      vent: this.canVent ? btn('V', '벤트', 'vent', () => this.doVent()) : null,
    };
    this.sabBtns = this.isDuck ? h('div', { class: 'sabs' }, ['lights', 'reactor', 'comms'].map((t, i) => h('button', { class: 'sbtn', 'data-sab': t, onclick: () => this.app.act('sab', { type: t }) }, `${i + 1} ${this.map.sab[t]}`))) : null;
    this.roleBox = h('div', { class: 'hud-role' + (IS_TOUCH ? ' collapsed' : ''), onclick: () => this.roleBox.classList.toggle('collapsed') });
    this.taskList = h('div', { class: 'hud-tasks', onclick: () => { this.taskList.classList.toggle('collapsed'); } });
    this.alertBox = h('div', { class: 'hud-alert' });
    this.taskBar = h('div', { class: 'taskbar' }, h('div', { class: 'fill' }), h('span', {}, '전체 임무'));
    this.ghostChat = h('div', { class: 'ghostchat hidden' });
    this.minimap = h('div', { class: 'minimap hidden' });
    this.overlay = h('div', { class: 'overlay-layer' });
    this.joyEl = h('div', { class: 'joy' }, h('div', { class: 'knob' }));
    root.append(this.canvas,
      h('div', { class: 'hud' },
        h('div', { class: 'hud-tl' }, this.roleBox, this.taskList),
        h('div', { class: 'hud-tc' }, this.taskBar, this.alertBox),
        h('div', { class: 'hud-tr' }, this.app.micButton(), h('button', { class: 'btn small', onclick: () => this.toggleMap() }, '🗺️', h('span', { class: 'desk' }, ' 지도(M)')),
          this.chatToggle = h('button', { class: 'btn small hidden', onclick: () => this.ghostChat.classList.toggle('closed') }, '💬'),
          h('button', { class: 'btn small', onclick: () => this.app.showRoleGuide() }, '📖'),
          fullscreenButton()),
        h('div', { class: 'hud-br' }, this.sabBtns, h('div', { class: 'abtns' }, Object.values(this.btns).filter(Boolean))),
        this.joyEl, this.ghostChat, this.minimap),
      this.overlay);
    this.renderRoleBox();
    this.onResize = () => this.resize(); window.addEventListener('resize', this.onResize); this.resize();
  }
  renderRoleBox() {
    this.roleBox.innerHTML = '';
    this.roleBox.append(roleCard(this.app, { ...this.you, role: this.role }, this.roster, { infected: this.infected }));
  }
  resize() {
    const dpr = this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = this.canvas.width = Math.floor(innerWidth * dpr), ch = this.canvas.height = Math.floor(innerHeight * dpr);
    this.fog.width = cw; this.fog.height = ch;
    // 짧은 쪽에 약 12.5타일, 긴 쪽에 약 20타일 보이도록
    this.Z = Math.max(1, Math.round(Math.min(Math.min(cw, ch) / (12.5 * TILE), Math.max(cw, ch) / (20 * TILE))));
  }

  bindInput() {
    const typing = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    this.onKeyDown = (e) => {
      if (typing()) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (e.repeat) return;
      if (this.phase !== 'play' || this.taskOpen) { if (k === 'm') this.toggleMap(); return; }
      if (k === 'e' || k === ' ') { e.preventDefault(); this.doUse(); }
      else if (k === 'r') this.doReport();
      else if (k === 'q') this.doKill();
      else if (k === 'f') this.doAbility();
      else if (k === 'v') this.doVent();
      else if (k === 'm' || k === 'tab') { e.preventDefault(); this.toggleMap(); }
      else if (this.isDuck && ['1', '2', '3'].includes(k)) this.app.act('sab', { type: ['lights', 'reactor', 'comms'][+k - 1] });
    };
    this.onKeyUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => { this.keys = {}; });
    // 터치 조이스틱
    const j = this.joyEl; let pid = null;
    const setJoy = (e) => {
      const r = j.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      this.joy = { x: dx, y: dy };
      j.firstChild.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
    };
    j.addEventListener('pointerdown', e => { pid = e.pointerId; j.setPointerCapture(pid); setJoy(e); });
    // 화면 빈 곳을 터치하면 그 자리에 조이스틱이 생김
    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || pid != null) return;
      e.preventDefault();
      j.style.left = (e.clientX - j.offsetWidth / 2) + 'px'; j.style.top = (e.clientY - j.offsetHeight / 2) + 'px'; j.style.bottom = 'auto';
      j.classList.add('floating');
      pid = e.pointerId; this.canvas.setPointerCapture(pid); setJoy(e);
    });
    this.canvas.addEventListener('pointermove', e => { if (e.pointerId === pid) setJoy(e); });
    const endFloat = (e) => { if (e.pointerId !== pid) return; end(); j.style.left = ''; j.style.top = ''; j.style.bottom = ''; j.classList.remove('floating'); };
    this.canvas.addEventListener('pointerup', endFloat); this.canvas.addEventListener('pointercancel', endFloat);
    j.addEventListener('pointermove', e => { if (e.pointerId === pid) setJoy(e); });
    const end = () => { pid = null; this.joy = { x: 0, y: 0 }; j.firstChild.style.transform = ''; };
    j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
  }

  // ---------------- 맵 미리 그리기 ----------------
  prerender() {
    const m = this.map, T = TILE;
    const c = this.mapCanvas = document.createElement('canvas'); c.width = m.W * T; c.height = m.H * T;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) {
      const v = m.grid[j * m.W + i];
      if (v >= 2) x.drawImage(tileSprite(m.theme, FLOOR_NAMES[v], (i * 7 + j * 13) % 4), i * T, j * T);
      else if (v === 1) {
        const below = m.isFloor(i, j + 1);
        if (below) x.drawImage(tileSprite(m.theme, 'wall', 0), i * T, j * T);
        else { x.drawImage(tileSprite(m.theme, 'void', (i * 3 + j * 5) % 6), i * T, j * T); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(i * T, j * T, T, T); }
      } else x.drawImage(tileSprite(m.theme, 'void', (i * 3 + j * 5) % 6), i * T, j * T);
    }
    // 벽 그림자
    x.fillStyle = 'rgba(0,0,0,0.18)';
    for (let j = 1; j < m.H; j++) for (let i = 0; i < m.W; i++) if (m.grid[j * m.W + i] >= 2 && m.grid[(j - 1) * m.W + i] === 1) x.fillRect(i * T, j * T, T, 4);
    const occ = new Set([...m.stations, ...m.vents, m.button, m.lights, m.comms, ...m.reactor].map(o => o.x + ',' + o.y));
    const draw = (name, tx, ty) => { const s = propSprite(name); if (s) x.drawImage(s, tx * T + (T - s.width) / 2, ty * T + T - s.height); };
    for (const p of m.props) if (!occ.has(p.x + ',' + p.y)) draw(p.s, p.x, p.y);
    for (const v of m.vents) draw(m.ventProp, v.x, v.y);
    for (const st of m.stations) draw(STATION_PROP[m.theme], st.x, st.y);
    draw('panel', m.lights.x, m.lights.y); draw('panel', m.comms.x, m.comms.y);
    for (const r of m.reactor) draw('reactor', r.x, r.y);
    draw(m.buttonProp, m.button.x, m.button.y);
    // 방 이름
    x.font = '8px Galmuri11, monospace'; x.textAlign = 'center';
    for (const r of m.rooms) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillText(r.name, (r.x + r.w / 2) * T + 1, (r.y + r.h - 0.3) * T + 1); x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillText(r.name, (r.x + r.w / 2) * T, (r.y + r.h - 0.3) * T); }
  }

  // ---------------- 메인 루프 ----------------
  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t; this.frame++;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  solid(px, py) {
    if (!this.alive) return px < 0 || py < 0 || px >= this.map.W * TILE || py >= this.map.H * TILE;
    return this.map.solidPx(px - 5, py - 3) || this.map.solidPx(px + 5, py - 3) || this.map.solidPx(px - 5, py + 2) || this.map.solidPx(px + 5, py + 2);
  }
  update(dt) {
    let vx = 0, vy = 0;
    const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (this.phase === 'play' && !this.taskOpen && !typing) {
      const k = this.keys;
      if (k['a'] || k['arrowleft']) vx -= 1; if (k['d'] || k['arrowright']) vx += 1;
      if (k['w'] || k['arrowup']) vy -= 1; if (k['s'] || k['arrowdown']) vy += 1;
      vx += this.joy.x; vy += this.joy.y;
    }
    const l = Math.hypot(vx, vy);
    this.mv = l > 0.1;
    if (this.mv) {
      if (l > 1) { vx /= l; vy /= l; }
      const sp = SPEED * this.s.speed * (this.alive ? 1 : 1.25) * dt;
      const nx = this.x + vx * sp, ny = this.y + vy * sp;
      if (!this.solid(nx, this.y)) this.x = nx;
      if (!this.solid(this.x, ny)) this.y = ny;
      if (vx < -0.1) this.flip = true; else if (vx > 0.1) this.flip = false;
    }
    for (const [id, e] of this.ents) {
      if (id === this.me) { e.x = this.x; e.y = this.y; continue; }
      const f = Math.min(1, dt * 12);
      if (Math.hypot(e.tx - e.x, e.ty - e.y) > TILE * 4) { e.x = e.tx; e.y = e.ty; }
      e.x += (e.tx - e.x) * f; e.y += (e.ty - e.y) * f;
    }
    this.computeNear();
  }
  sendPos() { if (this.phase === 'play') this.app.send({ t: 'pos', x: Math.round(this.x), y: Math.round(this.y), f: this.flip ? 1 : 0, mv: this.mv ? 1 : 0, seq: this.seq }); }

  visionR() {
    let r = BASE_VISION * ((this.isDuck || this.role === 'falcon') ? this.s.duckVision : this.s.gooseVision);
    if (this.sab?.type === 'lights' && !this.isDuck) r = Math.max(1.6 * TILE, r * 0.4);
    return r;
  }
  los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 4);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.map.solidPx(x0 + (x1 - x0) * t, y0 - 6 + (y1 - y0) * t)) return false; }
    return true;
  }
  canSee(id) {
    if (id === this.me) return true;
    const e = this.ents.get(id); if (!e) return false;
    if (!e.alive) return this.seesGhosts;
    if (!this.alive) return true;
    if (e.inv) return false;
    return Math.hypot(e.x - this.x, e.y - this.y) <= this.visionR() && this.los(this.x, this.y, e.x, e.y);
  }

  computeNear() {
    const m = this.map, me = { x: this.x, y: this.y };
    const d = (o) => Math.hypot(o.x - me.x, o.y - me.y);
    const c = (o) => ({ x: (o.x + 0.5) * TILE, y: (o.y + 0.5) * TILE });
    const n = this.near = {};
    // 사용: 임무 > 수리 > 긴급버튼
    if (this.phase !== 'play') return;
    if (!this.sab || this.sab.type !== 'comms') for (const st of m.stations) {
      if (!this.tasks.includes(st.id) || this.done.has(st.id)) continue;
      if (d(c(st)) < USE_RANGE * 1.3) { n.use = { kind: 'task', st }; break; }
    }
    if (!n.use && this.isDuck) for (const st of m.stations) if (this.tasks.includes(st.id) && d(c(st)) < USE_RANGE * 1.3) { n.use = { kind: 'fake', st }; break; }
    if (!n.use && this.sab && this.alive) {
      if (this.sab.type === 'lights' && d(c(m.lights)) < USE_RANGE * 1.3) n.use = { kind: 'fix', what: 'lights' };
      if (this.sab.type === 'comms' && d(c(m.comms)) < USE_RANGE * 1.3) n.use = { kind: 'fix', what: 'comms' };
      if (this.sab.type === 'reactor') m.reactor.forEach((r, i) => { if (!this.sab.fixed.includes(i) && d(c(r)) < USE_RANGE * 1.3) n.use = { kind: 'fix', what: i }; });
    }
    if (!n.use && this.alive && d(c(m.button)) < USE_RANGE * 1.2) n.use = { kind: 'button' };
    if (this.alive) {
      let bd = 1e9;
      for (const b of this.bodies) { const dd = d(b); if (dd < USE_RANGE * 1.4 && dd < bd) { bd = dd; n.body = b; } }
    }
    const nearestPlayer = (range, filter) => {
      let best = null, bd = range;
      for (const [id, e] of this.ents) {
        if (id === this.me || !e.alive || e.inv) continue;
        if (filter && !filter(id)) continue;
        const dd = d(e); if (dd <= bd && this.los(me.x, me.y, e.x, e.y)) { bd = dd; best = id; }
      }
      return best;
    };
    if (this.alive && this.canKill) n.kill = nearestPlayer(KILL_RANGE, id => !(this.you.mates || []).includes(id));
    const R = ROLES[this.role].rt;
    if (this.alive && R) {
      if (R.target === 'player') n.abil = nearestPlayer(KILL_RANGE, this.role === 'pigeon' ? (id => !this.infected.has(id)) : null);
      else if (R.target === 'far') n.abil = nearestPlayer(Math.min(SNIPE_RANGE, this.visionR()));
      else if (R.target === 'body') { let bd = 1e9; for (const b of this.bodies) { const dd = d(b); if (dd < USE_RANGE * 1.4 && dd < bd) { bd = dd; n.abil = b; } } }
      else n.abil = 'self';
    }
    if (this.alive && this.canVent) for (const v of m.vents) if (d(c(v)) < USE_RANGE * 1.2) { n.vent = v; break; }
  }

  // ---------------- 행동 ----------------
  doUse() {
    const u = this.near?.use; if (!u || this.phase !== 'play') return;
    if (u.kind === 'task' || u.kind === 'fake') {
      const st = u.st;
      this.taskOpen = openTask(st.type, st.label, () => { if (u.kind === 'task') this.app.act('task', { station: st.id }); else this.done.add(st.id); }, { fake: u.kind === 'fake', onClose: () => { this.taskOpen = null; } });
    } else if (u.kind === 'fix') this.app.act('fix', { what: u.what });
    else if (u.kind === 'button') this.app.act('button');
  }
  doReport() { if (this.near?.body) this.app.act('report', { body: this.near.body.id }); }
  doKill() { if (this.near?.kill && now() >= this.killReady) this.app.act('kill', { target: this.near.kill }); }
  doVent() { if (this.near?.vent) this.app.act('vent', { vent: this.near.vent.id }); }
  doAbility() {
    const R = ROLES[this.role].rt; if (!R || !this.near?.abil) return;
    if (R.cooldown === 'kill' ? now() < this.killReady : now() < this.abilReady) return;
    if (R.target === 'body') this.app.act('ability', { body: this.near.abil.id });
    else if (R.target === 'none') this.app.act('ability', {});
    else this.app.act('ability', { target: this.near.abil });
  }

  updateHUD() {
    if (!this.near) return;
    const t = now(), n = this.near;
    const setB = (b, on, label, cd) => {
      if (!b) return;
      b.classList.toggle('off', !on);
      if (label) b.querySelector('.lbl').textContent = label;
      b.querySelector('.cdt').textContent = cd > 0 ? Math.ceil(cd / 1000) : '';
    };
    const u = n.use;
    setB(this.btns.use, !!u, !u ? '사용' : u.kind === 'button' ? '회의' : u.kind === 'fix' ? '수리' : '임무');
    setB(this.btns.report, !!n.body);
    if (this.btns.kill) setB(this.btns.kill, !!n.kill && t >= this.killReady, null, this.killReady - t);
    if (this.btns.abil) {
      const R = ROLES[this.role].rt;
      const ready = R.cooldown === 'kill' ? this.killReady : this.abilReady;
      const exhausted = (R.perRound && this.usedRound >= R.perRound) || (R.perGame && this.usedGame >= R.perGame);
      setB(this.btns.abil, !!n.abil && t >= ready && !exhausted && this.alive, null, ready - t);
      this.btns.abil.classList.toggle('used', !!exhausted);
    }
    if (this.btns.vent) setB(this.btns.vent, !!n.vent);
    if (this.sabBtns) for (const b of this.sabBtns.children) b.classList.toggle('off', !!this.sab || !this.alive);
    // 임무 목록
    const tl = this.taskList; const tlKey = this.sab?.type + '|' + [...this.done].join() + '|' + this.tasks.join(); if (tlKey === this.tlKey && tl.childElementCount) { /* 변화 없음 */ } else { this.tlKey = tlKey; tl.innerHTML = '';
    if (this.sab?.type === 'comms') tl.append(h('div', { class: 'tl-h bad' }, '📡 통신 장애! 임무 목록을 볼 수 없습니다'));
    else {
      tl.append(h('div', { class: 'tl-h' }, this.you.team === 'goose' ? `임무 (${this.done.size}/${this.tasks.length})` : '가짜 임무 (위장용)'));
      for (const id of this.tasks) { const st = this.map.stations[id]; tl.append(h('div', { class: 'tl' + (this.done.has(id) ? ' done' : '') }, `${st.room}: ${st.label}`)); }
    } }
    this.taskBar.firstChild.style.width = (this.tp[1] ? (this.tp[0] / this.tp[1]) * 100 : 0) + '%';
    // 경고
    let al = '';
    if (this.sab) {
      const nm = this.map.sab[this.sab.type];
      if (this.sab.type === 'reactor') al = `🔥 ${nm}! ${Math.ceil(this.sab.left / 1000)}초 안에 두 곳을 모두 수리하세요 (${this.sab.fixed.length}/2)`;
      else al = `⚠️ ${nm}! ${this.sab.type === 'lights' ? '전원 패널' : '통신 패널'}에서 수리하세요`;
    }
    if (!this.alive) al = (al ? al + ' · ' : '') + '👻 유령 상태 — 벽을 통과할 수 있어요' + (this.you.team === 'goose' ? ', 임무는 계속 가능' : '');
    this.alertBox.textContent = al; this.alertBox.classList.toggle('on', !!al);
    if (!this.minimap.classList.contains('hidden')) this.drawMinimap();
  }

  toggleMap() { this.minimap.classList.toggle('hidden'); if (!this.minimap.classList.contains('hidden')) this.drawMinimap(); }
  drawMinimap(all = false) {
    const m = this.map, S = 5;
    let c = this.minimap.querySelector('canvas');
    if (!c) { c = h('canvas', { width: m.W * S, height: m.H * S, class: 'pix' }); this.minimap.innerHTML = ''; this.minimap.append(h('div', { class: 'mm-title' }, m.name), c); }
    const x = c.getContext('2d');
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) { const v = m.grid[j * m.W + i]; x.fillStyle = v >= 2 ? '#5a6078' : v === 1 ? '#22252f' : '#0b0c12'; x.fillRect(i * S, j * S, S, S); }
    x.font = '9px Galmuri11, monospace'; x.textAlign = 'center'; x.fillStyle = '#cfd6ff';
    for (const r of m.rooms) x.fillText(r.name, (r.x + r.w / 2) * S, (r.y + r.h / 2) * S + 3);
    if (this.sab?.type !== 'comms') for (const id of this.tasks) if (!this.done.has(id)) { const st = m.stations[id]; x.fillStyle = '#ffd84a'; x.fillRect(st.x * S, st.y * S, S, S); }
    if (this.sab) { x.fillStyle = (this.frame >> 4) % 2 ? '#ff4040' : '#802020'; const targets = this.sab.type === 'lights' ? [m.lights] : this.sab.type === 'comms' ? [m.comms] : m.reactor; for (const o of targets) x.fillRect(o.x * S - 1, o.y * S - 1, S + 2, S + 2); }
    x.fillStyle = '#ffffff'; x.fillRect(m.button.x * S, m.button.y * S, S, S);
    const showAll = all || now() < this.cctvUntil;
    for (const [id, e] of this.ents) {
      if (id !== this.me && !(showAll && e.alive)) continue;
      const p = this.P(id); if (!p) continue;
      x.fillStyle = COLORS[p.color].b; x.strokeStyle = '#000';
      x.beginPath(); x.arc(e.x / TILE * S, e.y / TILE * S, id === this.me ? 5 : 4, 0, 7); x.fill(); x.stroke();
    }
  }

  // ---------------- 렌더 ----------------
  render() {
    const ctx = this.ctx, Z = this.Z, cw = this.canvas.width, ch = this.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, cw, ch);
    const camX = Math.round(this.x * Z - cw / 2), camY = Math.round((this.y - 8) * Z - ch / 2);
    const sx = (wx) => wx * Z - camX, sy = (wy) => wy * Z - camY;
    ctx.drawImage(this.mapCanvas, -camX, -camY, this.mapCanvas.width * Z, this.mapCanvas.height * Z);
    const T = TILE, bob = Math.sin(this.frame / 8) * 2;
    // 내 임무 표시
    if (this.sab?.type !== 'comms' && this.phase === 'play') for (const id of this.tasks) {
      if (this.done.has(id)) continue;
      const st = this.map.stations[id];
      ctx.fillStyle = '#ffd84a';
      ctx.font = `bold ${5 * Z}px Galmuri11, monospace`; ctx.textAlign = 'center';
      ctx.fillText('!', sx((st.x + 0.5) * T), sy(st.y * T - 2 + bob));
    }
    if (this.sab) {
      const m = this.map;
      const targets = this.sab.type === 'lights' ? [m.lights] : this.sab.type === 'comms' ? [m.comms] : m.reactor.filter((_, i) => !this.sab.fixed.includes(i));
      ctx.strokeStyle = (this.frame >> 3) % 2 ? '#ff4040' : '#ffd84a'; ctx.lineWidth = Z;
      for (const o of targets) ctx.strokeRect(sx(o.x * T), sy(o.y * T), T * Z, T * Z);
    }
    // 시체
    for (const b of this.bodies) {
      const p = this.P(b.id); if (!p) continue;
      if (this.alive && (Math.hypot(b.x - this.x, b.y - this.y) > this.visionR() || !this.los(this.x, this.y, b.x, b.y))) continue;
      const spr = gooseSprite(p.color, 0, 'dead');
      ctx.drawImage(spr, sx(b.x - 10), sy(b.y - 9), spr.width * Z, spr.height * Z);
    }
    // 플레이어
    const vis = [];
    for (const [id, e] of this.ents) if (this.canSee(id)) vis.push([id, e]);
    vis.sort((a, b) => a[1].y - b[1].y);
    const names = [];
    for (const [id, e] of vis) {
      const look = this.P(e.morph || id) || this.P(id); if (!look) continue;
      const ghost = !e.alive;
      const moving = id === this.me ? this.mv : e.mv;
      const kind = ghost ? 'ghost' : (moving && (this.frame >> 3) % 2 ? 'walk' : 'idle');
      const flip = id === this.me ? this.flip : e.flip;
      const spr = gooseSprite(look.color, look.hat, kind, flip);
      ctx.globalAlpha = ghost ? 0.5 : (e.inv ? 0.35 : 1);
      const gy = ghost ? Math.sin(this.frame / 10 + look.color) * 2 : 0;
      if (!ghost) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx(e.x), sy(e.y + 1), 6 * Z, 2 * Z, 0, 0, 7); ctx.fill(); }
      ctx.drawImage(spr, sx(e.x - 8), sy(e.y - 23 + gy), 16 * Z, 24 * Z);
      ctx.globalAlpha = 1;
      names.push([id, e, look, gy]);
    }
    // 시야(안개)
    if (this.alive && this.phase === 'play') {
      const f = this.fctx, R = this.visionR();
      f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, cw, ch);
      f.fillStyle = 'rgba(4,4,10,0.94)'; f.fillRect(0, 0, cw, ch);
      f.globalCompositeOperation = 'destination-out';
      const ox = this.x, oy = this.y - 6;
      f.beginPath();
      const N = 160;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
        let r = 0;
        while (r < R) { r += 3; if (this.map.solidPx(ox + dx * r, oy + dy * r)) { r += 10; break; } }
        r = Math.min(r, R);
        const px = sx(ox + dx * r), py = sy(oy + dy * r);
        if (i === 0) f.moveTo(px, py); else f.lineTo(px, py);
      }
      const g = f.createRadialGradient(sx(ox), sy(oy), R * Z * 0.6, sx(ox), sy(oy), R * Z);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = g; f.fill();
      ctx.drawImage(this.fog, 0, 0);
    } else if (!this.alive) { ctx.fillStyle = 'rgba(40,20,80,0.18)'; ctx.fillRect(0, 0, cw, ch); }
    if (this.sab?.type === 'reactor') { ctx.fillStyle = `rgba(255,0,0,${0.12 + 0.1 * Math.sin(this.frame / 6)})`; ctx.fillRect(0, 0, cw, ch); }
    // 이름
    ctx.textAlign = 'center'; ctx.font = `${Math.max(11 * this.dpr, Z * 4)}px Galmuri11, monospace`;
    const mates = new Set(this.you.mates || []);
    for (const [id, e, look, gy] of names) {
      const showId = e.morph || id;
      const nx = sx(e.x), ny = sy(e.y - 25 + gy);
      let col = '#ffffff';
      if (this.isDuck && (mates.has(showId) || (showId === this.me))) col = '#ff7070';
      if (this.you.lover === showId) col = '#ff9ad5';
      ctx.lineWidth = 3 * this.dpr; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      const label = look.name + (this.infected.has(id) ? ' 🕊️' : '');
      ctx.strokeText(label, nx, ny); ctx.fillStyle = col; ctx.fillText(label, nx, ny);
      if (this.app.voice?.speaking(id)) { ctx.fillText('🔊', nx + ctx.measureText(label).width / 2 + 10, ny); }
    }
    // 추적 화살표
    if (this.track && this.ents.get(this.track)?.alive) {
      const e = this.ents.get(this.track);
      const a = Math.atan2(e.y - this.y, e.x - this.x), r = Math.min(cw, ch) * 0.38;
      const ax = cw / 2 + Math.cos(a) * r, ay = ch / 2 + Math.sin(a) * r;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.scale(this.dpr, this.dpr);
      ctx.fillStyle = COLORS[this.P(this.track).color].b; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    if (now() < this.cctvUntil) { this.minimap.classList.remove('hidden'); this.drawMinimap(true); this.cctvShown = true; }
    else if (this.cctvShown) { this.cctvShown = false; this.minimap.classList.add('hidden'); }
  }

  // ---------------- 네트워크 메시지 ----------------
  onMsg(m) {
    switch (m.t) {
      case 'snap': {
        for (const [id, x, y, f, mv, al, inv, mo] of m.ps) {
          let e = this.ents.get(id); if (!e) { e = { x, y }; this.ents.set(id, e); }
          e.tx = x; e.ty = y; e.flip = !!f; e.mv = mv; e.alive = al; e.inv = inv; e.morph = mo;
          if (id === this.me && !!al !== this.alive && al) this.alive = true;
        }
        this.bodies = m.bodies.map(([id, x, y]) => ({ id, x, y }));
        this.sab = m.sab; this.tp = m.tp;
        if (m.ph === 'play' && this.phase === 'play') { /* ok */ }
        return;
      }
      case 'tp': this.x = m.x; this.y = m.y; this.seq = m.seq; return;
      case 'cd': if (m.kill != null) this.killReady = now() + m.kill; return;
      case 'abil': this.usedRound = m.usedRound; this.usedGame = m.usedGame; this.abilReady = now() + (m.cd || 0); return;
      case 'taskdone': this.done.add(m.station); return;
      case 'died': {
        this.alive = false; this.taskOpen?.();
        const msg = { misfire: '무고한 사람을 쏴서 죽었습니다', eject: '추방당했습니다', heartbreak: '연인을 따라 떠났습니다', assassinFail: '암살에 실패했습니다' }[m.cause] || '누군가에게 당했습니다!';
        this.flash(`💀 ${msg}`, '이제 유령입니다. 유령끼리 대화할 수 있어요.');
        this.ghostChat.classList.remove('hidden'); if (IS_TOUCH) { this.ghostChat.classList.add('closed'); this.chatToggle.classList.remove('hidden'); } this.ghostChat.innerHTML = ''; this.ghostChat.append(this.app.chatBox('ghost'));
        return;
      }
      case 'revived': this.alive = true; this.ghostChat.classList.add('hidden'); this.chatToggle.classList.add('hidden'); this.flash('✝️ 되살아났습니다!', ''); return;
      case 'track': this.track = m.target; return;
      case 'cctv': this.cctvUntil = now() + m.ms; return;
      case 'infected': this.infected = new Set(m.list); this.renderRoleBox(); return;
      case 'rolechange': this.role = m.role; this.you.role = m.role; this.renderRoleBox(); this.app.toast(m.text, 'role'); return;
      case 'sabstart': this.app.toast(`🚨 ${this.map.sab[m.type]} 발생!`, 'bad'); return;
      case 'sabend': this.app.toast('✅ 사보타주가 해결되었습니다', 'good'); this.sab = null; return;
      case 'silenced': this.silenced = m.on; if (m.on) this.app.toast('🤐 당신은 이번 회의에서 말할 수 없습니다!', 'bad'); return;
      case 'meeting': return this.openMeeting(m);
      case 'meetingUpdate': this.meet = { ...this.meet, ...m }; this.meetEnds = now() + m.left; this.renderMeeting(); return;
      case 'voted': if (this.meet) { this.meet.voted = [...new Set([...(this.meet.voted || []), m.id])]; this.renderMeeting(); } return;
      case 'result': return this.showResult(m);
      case 'resume': {
        this.phase = 'play'; this.killReady = now() + m.killCd; this.abilReady = now() + (m.cd || 0); this.usedRound = 0; this.track = null;
        this.overlay.innerHTML = ''; clearInterval(this.meetTimer); this.meet = null; this.bodies = [];
        if (this.pendingEnd) { showEnd(this.app, this.pendingEnd, this.roster); this.pendingEnd = null; }
        return;
      }
      case 'left': { const e = this.ents.get(m.id); if (e) e.alive = 0; return; }
    }
  }
  flash(title, sub) {
    const el = h('div', { class: 'flash' }, h('div', { class: 'ft' }, title), sub ? h('div', { class: 'fs' }, sub) : null);
    this.overlay.append(el); setTimeout(() => el.remove(), 2800);
  }

  // ---------------- 회의 ----------------
  openMeeting(m) {
    this.phase = 'meeting'; this.taskOpen?.(); this.keys = {};
    this.meet = m; this.meetEnds = now() + m.left; this.myVote = null; this.sel = null;
    const caller = this.P(m.caller);
    const banner = h('div', { class: 'meet-banner' }, m.reason === 'report' ? '💀 시체 발견!' : '🚨 긴급 회의!');
    this.overlay.innerHTML = '';
    this.overlay.append(banner);
    setTimeout(() => { banner.remove(); this.renderMeeting(); }, 1800);
    clearInterval(this.meetTimer);
    this.meetTimer = setInterval(() => { const t = this.overlay.querySelector('.meet-timer'); if (t) t.textContent = Math.max(0, Math.ceil((this.meetEnds - now()) / 1000)) + '초'; }, 250);
    this.callerName = caller?.name;
  }
  renderMeeting() {
    const m = this.meet; if (!m || this.phase !== 'meeting') return;
    let box = this.overlay.querySelector('.meeting');
    const chatHad = box?.querySelector('.chat');
    const chatInputVal = chatHad?.querySelector('input')?.value;
    this.overlay.innerHTML = '';
    const alive = new Set(m.alive);
    const voted = new Set(m.voted || []);
    const iCanVote = alive.has(this.me) && m.stage === 'vote' && !voted.has(this.me);
    const isAssassin = this.role === 'assassin' && alive.has(this.me);
    const grid = h('div', { class: 'mgrid' }, this.roster.map(p => {
      const dead = !alive.has(p.id);
      const card = h('div', {
        class: 'mcard' + (dead ? ' dead' : '') + (this.sel === p.id ? ' sel' : '') + (p.id === m.caller ? ' caller' : ''),
        onclick: () => { if (!iCanVote || dead) return; this.sel = p.id; this.renderMeeting(); },
      },
      gooseCanvas(p.color, p.hat, 2, dead ? 'ghost' : 'idle'),
      h('div', { class: 'mname' }, p.name, p.id === this.me ? ' (나)' : ''),
      voted.has(p.id) ? h('span', { class: 'badge voted' }, '투표함') : null,
      (m.silenced || []).includes(p.id) ? h('span', { class: 'badge sil' }, '🤐') : null,
      p.id === m.caller ? h('span', { class: 'badge call' }, '📢') : null,
      (this.you.mates || []).includes(p.id) && this.isDuck ? h('span', { class: 'badge duck' }, '🦆') : null,
      this.app.voice?.speaking(p.id) ? h('span', { class: 'badge spk' }, '🔊') : null,
      isAssassin && !dead && p.id !== this.me ? h('button', { class: 'btn tiny guess', onclick: (e) => { e.stopPropagation(); this.assassinPick(p.id); } }, '🗡️') : null,
      this.sel === p.id && iCanVote ? h('button', { class: 'btn small primary vote-ok', onclick: (e) => { e.stopPropagation(); this.app.act('vote', { target: p.id }); this.myVote = p.id; this.sel = null; } }, '투표') : null);
      return card;
    }));
    const body = m.body ? this.P(m.body) : null;
    const head = h('div', { class: 'meet-head' },
      h('div', {}, m.reason === 'report' ? `💀 ${this.callerName}님이 ${body ? body.name + '의 ' : ''}시체를 신고했습니다` : `🚨 ${this.callerName}님이 긴급회의를 열었습니다`),
      h('div', { class: 'meet-stage' }, m.stage === 'discuss' ? '토론 시간' : '투표 시간', ' · ', h('span', { class: 'meet-timer' }, Math.ceil((this.meetEnds - now()) / 1000) + '초')));
    const notes = (m.notices || []).length ? h('div', { class: 'notices' }, m.notices.map(t => h('div', {}, t))) : null;
    const skip = h('button', { class: 'btn', disabled: !iCanVote, onclick: () => { this.app.act('vote', { target: 'skip' }); this.myVote = 'skip'; } }, '⏭ 건너뛰기');
    const chat = this.app.chatBox('meeting');
    if (chatInputVal) chat.querySelector('input').value = chatInputVal;
    box = h('div', { class: 'meeting panel' }, head, notes, h('div', { class: 'meet-main' }, h('div', { class: 'meet-left' }, grid,
      h('div', { class: 'meet-foot' }, skip, this.app.micButton(), alive.has(this.me) ? (m.stage === 'discuss' ? h('span', { class: 'hint' }, '토론이 끝나면 투표할 수 있어요') : voted.has(this.me) ? h('span', { class: 'hint' }, '투표 완료') : h('span', { class: 'hint' }, '얼굴을 눌러 투표하세요')) : h('span', { class: 'hint' }, '유령은 투표할 수 없어요'))), chat));
    this.overlay.append(box);
    if (document.activeElement?.tagName !== 'INPUT' && chatInputVal) chat.querySelector('input').focus();
  }
  assassinPick(target) {
    const list = h('div', { class: 'role-pick' }, ROLE_ORDER.filter(r => ROLES[r].modes.includes('rt')).map(r => h('button', { class: 'btn small', onclick: () => { this.app.act('guess', { target, role: r }); close(); } }, ROLES[r].icon + ' ' + ROLES[r].name)));
    const close = this.app.modal(`🗡️ ${this.name(target)}의 직업은? (틀리면 당신이 죽어요)`, list, [{ label: '취소' }]);
  }
  showResult(m) {
    this.phase = 'result'; clearInterval(this.meetTimer);
    this.overlay.innerHTML = '';
    const rows = m.votes ? Object.entries(m.counts || {}).map(([tg, n]) => {
      const voters = Object.entries(m.votes).filter(([, t]) => t === tg).map(([v]) => this.P(v)).filter(Boolean);
      return h('div', { class: 'vrow' }, h('b', {}, tg === 'skip' ? '건너뛰기' : this.name(tg)), ` ${n}표 `, voters.map(v => h('span', { class: 'vdot', style: { background: COLORS[v.color].b }, title: v.name })));
    }) : [h('div', { class: 'hint' }, '익명 투표')];
    const ej = m.ejected ? this.P(m.ejected) : null;
    const fly = ej ? h('div', { class: 'eject-fly' }, gooseCanvas(ej.color, ej.hat, 5, 'idle')) : null;
    this.overlay.append(h('div', { class: 'result-scr' }, fly, h('div', { class: 'res-text' }, m.text), h('div', { class: 'votes' }, rows)));
  }
  onEnd(m) {
    if (this.phase === 'result') { this.pendingEnd = m; setTimeout(() => { if (this.pendingEnd) { this.overlay.innerHTML = ''; showEnd(this.app, this.pendingEnd, this.roster); this.pendingEnd = null; } }, 3500); }
    else showEnd(this.app, m, this.roster);
    this.phase = 'end';
  }

  // ---------------- 음성 규칙 ----------------
  volumeFor(id) {
    const e = this.ents.get(id); if (!e) return 1;
    const meeting = this.phase === 'meeting' || this.phase === 'result';
    if (this.phase === 'end') return 1;
    if (!e.alive) return this.seesGhosts ? 1 : 0;
    if (meeting) return (this.meet?.silenced || []).includes(id) && this.phase === 'meeting' ? 0 : 1;
    const range = this.s.voiceRange * TILE;
    const d = Math.hypot(e.x - this.x, e.y - this.y);
    if (d >= range) return 0;
    return 1 - Math.pow(d / range, 2);
  }
  selfMuted() { return this.silenced && this.phase === 'meeting'; }
}
