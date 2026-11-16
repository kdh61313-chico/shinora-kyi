import { J } from './josa.js';
// 낮/밤 마피아 모드 클라이언트
import { ROLES, TEAMS, ROLE_ORDER } from './roles.js';
import { COLORS, gooseSprite, tileSprite, propSprite } from './sprites.js';
import { h, $, gooseCanvas, showEnd, roleCard, introOverlay, fullscreenButton } from './util.js';

const now = () => Date.now();
const PH_NAME = { intro: '게임 준비', night: '🌙 밤', morning: '🌅 아침', day: '☀️ 낮 토론', dayvote: '🗳️ 투표', verdict: '⚖️ 판결' };

export class TurnView {
  constructor(app, st) {
    this.app = app; this.st = st; this.s = st.settings; this.you = st.you; this.me = app.me; this.roster = st.players;
    this.role = st.you.role;
    this.alive = new Set(this.roster.map(p => p.id));
    this.phase = 'intro'; this.day = 0; this.ends = now() + 6000;
    this.silenced = new Set(); this.sel = null; this.nightTarget = null; this.killVote = null;
    this.duckVotes = {}; this.voted = new Set(); this.myVote = null; this.lines = [];
    this.infected = new Set(); this.frame = 0;
    this.build();
    introOverlay(app, st.you, this.roster);
    this.timer = setInterval(() => this.tick(), 250);
    this.raf = requestAnimationFrame(this.draw = this.draw.bind(this));
    this.render();
  }
  destroy() { clearInterval(this.timer); cancelAnimationFrame(this.raf); this.root.innerHTML = ''; }
  P(id) { return this.roster.find(p => p.id === id); }
  name(id) { return this.P(id)?.name ?? '???'; }
  get meAlive() { return this.alive.has(this.me); }
  get isDuck() { return this.you.team === 'duck'; }

  build() {
    this.app.screen('turn');
    const root = this.root = $('#turn'); root.innerHTML = '';
    this.topbar = h('div', { class: 'tb-top' });
    this.scene = h('canvas', { class: 'scene pix', width: 640, height: 220 });
    this.cards = h('div', { class: 'tcards' });
    this.actions = h('div', { class: 'tactions panel' });
    this.roleBox = h('div', { class: 'tb-role' });
    this.logBox = h('div', { class: 'tlog panel' });
    root.append(h('div', { class: 'turn-grid' },
      h('div', { class: 'turn-main' }, this.topbar, this.scene, this.cards, this.actions),
      h('div', { class: 'turn-side' }, this.roleBox, this.logBox, this.app.chatBox('turn'))));
    this.roleBox.append(roleCard(this.app, { ...this.you, role: this.role }, this.roster, { infected: this.infected }));
  }

  tick() {
    const left = Math.max(0, Math.ceil((this.ends - now()) / 1000));
    const t = this.topbar.querySelector('.tb-timer'); if (t) t.textContent = left + '초';
  }

  render() {
    const ph = this.phase;
    this.topbar.innerHTML = '';
    this.topbar.append(h('div', { class: 'tb-phase' }, (this.day ? `${this.day}일차 · ` : '') + PH_NAME[ph]),
      h('div', { class: 'tb-timer' }, Math.max(0, Math.ceil((this.ends - now()) / 1000)) + '초'),
      this.app.micButton(), h('button', { class: 'btn small', onclick: () => this.app.showRoleGuide() }, '📖'), fullscreenButton());
    document.body.classList.toggle('night', ph === 'night');
    // 카드
    this.cards.innerHTML = '';
    const pickable = this.pickMode();
    const mates = new Set(this.you.mates || []);
    for (const p of this.roster) {
      const dead = !this.alive.has(p.id);
      const dvoters = Object.entries(this.duckVotes).filter(([, t]) => t === p.id).map(([d]) => d);
      const can = pickable && pickable(p.id);
      const card = h('div', {
        class: 'tcard' + (dead ? ' dead' : '') + (this.sel === p.id ? ' sel' : '') + (can ? ' can' : ''),
        onclick: () => { if (!can) return; this.sel = this.sel === p.id ? null : p.id; this.render(); },
      },
      gooseCanvas(p.color, p.hat, 2, dead ? 'ghost' : 'idle'),
      h('div', { class: 'mname' }, p.name, p.id === this.me ? ' (나)' : ''),
      this.isDuck && mates.has(p.id) ? h('span', { class: 'badge duck' }, '🦆') : null,
      this.you.lover === p.id ? h('span', { class: 'badge' }, '💕') : null,
      this.silenced.has(p.id) && (ph === 'day' || ph === 'dayvote') ? h('span', { class: 'badge sil' }, '🤐') : null,
      ph === 'dayvote' && this.voted.has(p.id) ? h('span', { class: 'badge voted' }, '투표함') : null,
      this.infected.has(p.id) ? h('span', { class: 'badge' }, '🕊️') : null,
      this.nightTarget === p.id && ph === 'night' ? h('span', { class: 'badge call' }, '🎯') : null,
      dvoters.length && this.isDuck && ph === 'night' ? h('span', { class: 'badge kill' }, '🔪' + dvoters.map(d => this.name(d)).join(',')) : null,
      this.app.voice?.speaking(p.id) ? h('span', { class: 'badge spk' }, '🔊') : null);
      this.cards.append(card);
    }
    // 행동 패널
    const A = this.actions; A.innerHTML = '';
    const R = ROLES[this.role];
    if (!this.meAlive) { A.append(h('div', { class: 'hint' }, '👻 당신은 죽었습니다. 유령끼리 대화하며 지켜보세요.')); return; }
    if (ph === 'intro') A.append(h('div', { class: 'hint' }, '곧 첫 번째 밤이 시작됩니다...'));
    if (ph === 'night') {
      const N = R.night;
      const exhausted = N?.perGame && this.usedGame >= N.perGame;
      if (this.isDuck) A.append(h('button', { class: 'btn kill', disabled: !this.sel || !this.alive.has(this.sel) || mates.has(this.sel) || this.sel === this.me, onclick: () => { this.app.act('night', { kind: 'kill', target: this.sel }); this.killVote = this.sel; this.sel = null; this.render(); } }, '🔪 처치 투표'));
      if (N && !exhausted) A.append(h('button', { class: 'btn primary', disabled: !this.sel || !this.validNight(this.sel), onclick: () => { this.app.act('night', { kind: 'ability', target: this.sel }); this.sel = null; } }, `${R.icon} ${N.label}`));
      if (!this.isDuck && !N) A.append(h('div', { class: 'hint' }, '밤에는 할 수 있는 일이 없습니다. 아침을 기다리세요... 💤'));
      A.append(h('div', { class: 'hint' }, [
        this.isDuck ? `처치 투표: ${this.killVote ? this.name(this.killVote) : '없음'}` : null,
        N ? ` ${N.label} 대상: ${this.nightTarget ? this.name(this.nightTarget) : '없음'}` : null,
        exhausted ? ' (능력 사용 완료)' : null,
        N?.target === 'dead' ? ' · 죽은 사람을 선택하세요' : null,
        ' · 카드를 눌러 대상을 고르세요'].filter(Boolean).join('')));
    }
    if (ph === 'day' || ph === 'dayvote') {
      if (this.role === 'assassin') A.append(h('button', { class: 'btn', disabled: !this.sel || this.sel === this.me || !this.alive.has(this.sel), onclick: () => this.assassinPick(this.sel) }, '🗡️ 직업 맞추기 (암살)'));
      if (ph === 'dayvote') {
        A.append(h('button', { class: 'btn primary', disabled: !this.sel || this.voted.has(this.me) || !this.alive.has(this.sel), onclick: () => { this.app.act('vote', { target: this.sel }); this.myVote = this.sel; this.sel = null; } }, '🗳️ 투표하기'));
        A.append(h('button', { class: 'btn', disabled: this.voted.has(this.me), onclick: () => { this.app.act('vote', { target: 'skip' }); this.myVote = 'skip'; } }, '⏭ 기권'));
        A.append(h('div', { class: 'hint' }, this.voted.has(this.me) ? `투표 완료: ${this.myVote === 'skip' ? '기권' : this.name(this.myVote)}` : '추방할 사람을 골라 투표하세요'));
      } else A.append(h('div', { class: 'hint' }, this.silenced.has(this.me) ? '🤐 오늘은 말할 수 없습니다.' : '자유롭게 토론하세요! 시간이 끝나면 투표가 시작됩니다.'));
    }
    if (ph === 'morning' || ph === 'verdict') A.append(h('div', { class: 'hint' }, '...'));
  }
  pickMode() {
    const ph = this.phase; if (!this.meAlive) return null;
    if (ph === 'night') {
      const N = ROLES[this.role].night;
      return (id) => (this.isDuck && this.alive.has(id) && id !== this.me && !(this.you.mates || []).includes(id)) || (N && this.validNight(id));
    }
    if (ph === 'dayvote' || ph === 'day') return (id) => this.alive.has(id) && (ph === 'dayvote' || this.role === 'assassin');
    return null;
  }
  validNight(id) {
    const N = ROLES[this.role].night; if (!N) return false;
    if (N.target === 'dead') return !this.alive.has(id);
    if (N.target === 'other') return this.alive.has(id) && id !== this.me;
    return this.alive.has(id);
  }
  assassinPick(target) {
    const list = h('div', { class: 'role-pick' }, ROLE_ORDER.filter(r => ROLES[r].modes.includes('turn')).map(r => h('button', { class: 'btn small', onclick: () => { this.app.act('guess', { target, role: r }); close(); } }, ROLES[r].icon + ' ' + ROLES[r].name)));
    const close = this.app.modal(`🗡️ ${this.name(target)}의 직업은? (틀리면 당신이 죽어요)`, list, [{ label: '취소' }]);
  }
  log(text, cls = '') { this.logBox.append(h('div', { class: 'lg ' + cls }, text)); this.logBox.scrollTop = 1e9; }

  // 배경 장면 (캠프파이어를 둘러싼 거위들)
  draw() {
    this.frame++;
    const c = this.scene, x = c.getContext('2d'), W = c.width, H = c.height;
    x.imageSmoothingEnabled = false;
    const night = this.phase === 'night' || this.phase === 'intro';
    const sky = x.createLinearGradient(0, 0, 0, 90);
    if (night) { sky.addColorStop(0, '#0b0c26'); sky.addColorStop(1, '#2a2050'); } else if (this.phase === 'morning') { sky.addColorStop(0, '#f5a96a'); sky.addColorStop(1, '#ffe0a0'); } else { sky.addColorStop(0, '#6ab8f0'); sky.addColorStop(1, '#bfe6ff'); }
    x.fillStyle = sky; x.fillRect(0, 0, W, 90);
    if (night) { x.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const sx = (i * 97) % W, sy = (i * 53) % 80; if ((this.frame >> 4) % 7 !== i % 7) x.fillRect(sx, sy, 1, 1); } x.fillStyle = '#fff3b0'; x.beginPath(); x.arc(W - 60, 30, 14, 0, 7); x.fill(); x.fillStyle = '#2a2050'; x.beginPath(); x.arc(W - 54, 26, 12, 0, 7); x.fill(); }
    else { x.fillStyle = '#ffe58a'; x.beginPath(); x.arc(60, 30, 14, 0, 7); x.fill(); }
    // 나무 실루엣
    for (let i = 0; i < W; i += 28) { const t = propSprite('tree'); x.globalAlpha = night ? 0.5 : 0.9; x.drawImage(t, i - 4, 52 + ((i * 7) % 9)); }
    x.globalAlpha = 1;
    for (let j = 90; j < H; j += 16) for (let i = 0; i < W; i += 16) x.drawImage(tileSprite('village', 'floor', ((i + j) >> 4) % 4), i, j);
    // 모닥불
    const cx = W / 2, cy = 148;
    x.fillStyle = '#5c3a20'; x.fillRect(cx - 10, cy + 2, 20, 4);
    for (let i = 0; i < 6; i++) { const f = Math.sin(this.frame / 5 + i) * 2; x.fillStyle = ['#ff6b2a', '#ffd84a', '#ff9a3a'][i % 3]; x.fillRect(cx - 6 + i * 2, cy - 6 - Math.abs(f) - (i % 3) * 2, 2, 8 + f); }
    if (night) { const g = x.createRadialGradient(cx, cy, 5, cx, cy, 120); g.addColorStop(0, 'rgba(255,170,60,0.25)'); g.addColorStop(1, 'rgba(0,0,30,0.55)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    // 거위들
    const n = this.roster.length;
    const pos = this.roster.map((p, i) => { const a = Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2; return [p, cx + Math.cos(a) * 230, cy + 6 + Math.sin(a) * 52, Math.cos(a) > 0]; });
    pos.sort((a, b) => a[2] - b[2]);
    for (const [p, px, py, right] of pos) {
      const dead = !this.alive.has(p.id);
      const spr = gooseSprite(p.color, p.hat, dead ? 'ghost' : ((this.frame >> 4) % 2 && this.app.voice?.speaking(p.id) ? 'walk' : 'idle'), right);
      x.globalAlpha = dead ? 0.4 : 1;
      x.drawImage(spr, Math.round(px - 16), Math.round(py - 44 + (dead ? Math.sin(this.frame / 12) * 3 : 0)), 32, 48);
      x.globalAlpha = 1;
      if (this.sel === p.id) { x.strokeStyle = '#ffd84a'; x.lineWidth = 2; x.strokeRect(px - 18, py - 46, 36, 50); }
    }
    this.raf = requestAnimationFrame(this.draw);
  }

  onMsg(m) {
    switch (m.t) {
      case 'phase': {
        this.phase = m.ph; this.day = m.day; this.ends = now() + m.left; this.alive = new Set(m.alive);
        if (m.silenced) this.silenced = new Set(m.silenced);
        if (m.ph === 'night') { this.nightTarget = null; this.killVote = null; this.duckVotes = {}; this.sel = null; this.silenced = new Set(); this.log(`🌙 ${m.day}번째 밤이 되었습니다.`, 'ph'); }
        if (m.ph === 'morning') { if (ROLES[this.role].night?.perGame && this.nightTarget) this.usedGame = (this.usedGame || 0) + 1; this.log(`🌅 ${m.day}일차 아침`, 'ph'); for (const l of m.lines) this.log(l); this.showMorning(m.lines); }
        if (m.ph === 'day') { this.voted = new Set(); this.myVote = null; this.log('☀️ 토론을 시작하세요.', 'ph'); }
        if (m.ph === 'dayvote') { this.sel = null; this.log('🗳️ 투표 시간입니다.', 'ph'); }
        this.render(); return;
      }
      case 'nightack': this.nightTarget = m.target; this.render(); return;
      case 'duckvotes': this.duckVotes = m.votes; this.render(); return;
      case 'voted': this.voted.add(m.id); this.render(); return;
      case 'meetingUpdate': this.alive = new Set(m.alive); this.render(); return;
      case 'result': {
        this.phase = 'verdict'; this.ends = now() + 6000;
        this.log('⚖️ ' + m.text, 'ph');
        const ej = m.ejected ? this.P(m.ejected) : null;
        const el = h('div', { class: 'result-scr' }, ej ? h('div', { class: 'eject-fly' }, gooseCanvas(ej.color, ej.hat, 5)) : null, h('div', { class: 'res-text' }, m.text),
          m.votes ? h('div', { class: 'votes' }, Object.entries(m.counts || {}).map(([tg, n]) => h('div', { class: 'vrow' }, h('b', {}, tg === 'skip' ? '기권' : this.name(tg)), ` ${n}표 `,
            Object.entries(m.votes).filter(([, t]) => t === tg).map(([v]) => this.P(v)).filter(Boolean).map(v => h('span', { class: 'vdot', style: { background: COLORS[v.color].b }, title: v.name }))))) : null);
        document.body.append(el); setTimeout(() => el.remove(), 5500);
        if (m.ejected) this.alive.delete(m.ejected);
        this.render(); return;
      }
      case 'died': this.alive.delete(this.me); this.app.toast('💀 당신은 죽었습니다. 이제 유령입니다.', 'bad'); this.render(); return;
      case 'revived': this.alive.add(this.me); this.app.toast('✝️ 되살아났습니다!', 'good'); this.render(); return;
      case 'rolechange': this.role = m.role; this.you.role = m.role; this.roleBox.innerHTML = ''; this.roleBox.append(roleCard(this.app, this.you, this.roster)); this.app.toast(m.text, 'role'); this.render(); return;
      case 'infected': this.infected = new Set(m.list); this.render(); return;
      case 'silenced': if (m.on) this.app.toast('🤐 오늘 당신은 말할 수 없습니다!', 'bad'); return;
      case 'left': this.alive.delete(m.id); this.render(); return;
    }
  }
  onChat() {}
  showMorning(lines) {
    const el = h('div', { class: 'morning panel' }, h('h3', {}, `🌅 ${this.day}일차 아침`), lines.map(l => h('div', { class: 'ml' }, l)));
    document.body.append(el); setTimeout(() => el.remove(), 6500);
  }
  onEnd(m) { setTimeout(() => showEnd(this.app, m, this.roster), this.phase === 'verdict' ? 3000 : 0); this.phase = 'end'; document.body.classList.remove('night'); }

  volumeFor(id) {
    if (this.phase === 'end') return 1;
    const sAlive = this.alive.has(id);
    if (!sAlive) return (!this.meAlive || this.role === 'medium') ? 1 : 0;
    if (!this.meAlive) return 1;
    if (this.phase === 'night') return this.isDuck && (this.you.mates || []).includes(id) ? 1 : 0;
    if ((this.phase === 'day' || this.phase === 'dayvote') && this.silenced.has(id)) return 0;
    return 1;
  }
  selfMuted() {
    if (!this.meAlive) return false;
    if (this.phase === 'night') return !this.isDuck;
    return (this.phase === 'day' || this.phase === 'dayvote') && this.silenced.has(this.me);
  }
}
