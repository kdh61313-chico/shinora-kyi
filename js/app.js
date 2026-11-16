// 앱 전체 흐름: 타이틀 → 로비 → 게임 → 결과
import { HostNet, ClientNet, Voice, makeCode, IS_LOCAL } from './net.js';
import { HostGame } from './host.js';
import { ROLES, TEAMS, ROLE_ORDER, SETTING_DEFS, TOGGLE_DEFS, maxDucks } from './roles.js';
import { COLORS, HATS, gooseSprite, tileSprite } from './sprites.js';
import { MAP_LIST, getMap, TILE } from './maps.js';
import { RTView } from './rt.js';
import { $, h, gooseCanvas, IS_TOUCH, keepAwake } from './util.js';
export { $, h, gooseCanvas };
import { TurnView } from './turn.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem('qm_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('qm_' + k, JSON.stringify(v)); } catch (e) { /* noop */ } },
};

class App {
  constructor() {
    this.name = store.get('name', '');
    this.color = store.get('color', (Math.random() * COLORS.length) | 0);
    this.hat = store.get('hat', 0);
    this.players = []; this.settings = null; this.phase = 'lobby';
    this.view = null; this.chatLog = [];
    this.renderTitle();
    setInterval(() => this.voiceTick(), 150);
  }

  // ---------------- 타이틀 ----------------
  renderTitle(err) {
    this.screen('title');
    const root = $('#title');
    root.innerHTML = '';
    const preview = h('div', { class: 'look-preview' });
    const drawPrev = () => { preview.innerHTML = ''; preview.append(gooseCanvas(this.color, this.hat, 6)); };
    drawPrev();
    const nameIn = h('input', { id: 'name-in', maxlength: 10, placeholder: '닉네임', value: this.name });
    const codeIn = h('input', { id: 'code-in', maxlength: 5, placeholder: '방 코드', style: { textTransform: 'uppercase' } });
    const urlCode = new URLSearchParams(location.search).get('room');
    if (urlCode) codeIn.value = urlCode.toUpperCase();
    const colorRow = h('div', { class: 'color-row' }, COLORS.map((c, i) => h('button', {
      class: 'swatch' + (i === this.color ? ' on' : ''), title: c.name, style: { background: c.b },
      onclick: () => { this.color = i; store.set('color', i); this.renderTitle(); },
    })));
    const hatRow = h('div', { class: 'hat-row' },
      h('button', { class: 'btn small', onclick: () => { this.hat = (this.hat + HATS.length - 1) % HATS.length; store.set('hat', this.hat); drawPrev(); hatName.textContent = HATS[this.hat].name; } }, '◀'),
      h('span', { class: 'hat-name' }),
      h('button', { class: 'btn small', onclick: () => { this.hat = (this.hat + 1) % HATS.length; store.set('hat', this.hat); drawPrev(); hatName.textContent = HATS[this.hat].name; } }, '▶'));
    const hatName = hatRow.querySelector('.hat-name'); hatName.textContent = HATS[this.hat].name;
    const saveName = () => { this.name = nameIn.value.trim(); store.set('name', this.name); };
    root.append(
      h('div', { class: 'logo' }, h('span', { class: 'logo-q' }, '꽥꽥'), h('span', { class: 'logo-m' }, ' 마피아')),
      h('div', { class: 'subtitle' }, '거위 사이에 숨은 오리를 찾아라!'),
      h('div', { class: 'panel title-panel' },
        h('div', { class: 'look-box' }, preview, h('div', { class: 'look-ctrl' }, nameIn, colorRow, hatRow)),
        err ? h('div', { class: 'err' }, err) : null,
        h('div', { class: 'title-actions' },
          h('button', { class: 'btn big primary', onclick: () => { saveName(); this.createRoom(); } }, '🏠 방 만들기'),
          h('div', { class: 'join-row' }, codeIn, h('button', { class: 'btn big', onclick: () => { saveName(); this.joinRoom(codeIn.value.trim().toUpperCase()); } }, '🚪 참가하기')),
        ),
        h('button', { class: 'btn link', onclick: () => this.showRoleGuide() }, '📖 직업 도감 보기'),
        IS_LOCAL ? h('div', { class: 'hint' }, '로컬 테스트 모드 (같은 브라우저 탭끼리만 연결, 음성 없음)') : null,
      ),
      h('div', { class: 'footer' }, '구스구스덕 · 어몽어스 · 마피아 게임에서 영감을 받은 팬메이드 게임'),
    );
    codeIn.addEventListener('keydown', e => { if (e.key === 'Enter') { saveName(); this.joinRoom(codeIn.value.trim().toUpperCase()); } });
  }

  loading(text) { this.screen('loading'); $('#loading').textContent = text; }

  async createRoom() {
    this.loading('방을 만드는 중...');
    for (let tries = 0; tries < 3; tries++) {
      const code = makeCode();
      const net = new HostNet();
      try {
        const id = await net.open(code);
        this.hostNet = net; this.code = code; this.me = id; this.isHost = true;
        if (IS_TOUCH) setTimeout(() => this.toast('📱 방장은 게임 중에 다른 앱으로 나가거나 화면을 끄면 게임이 멈춰요!', 'role'), 800);
        this.game = new HostGame(net);
        net.onSelf = (m) => this.onMsg(m);
        this.sendRaw = (m) => this.game.handle(id, m);
        this.voice = new Voice(net.peer);
        this.sendRaw({ t: 'hello', name: this.name, color: this.color, hat: this.hat });
        history.replaceState(null, '', location.pathname + (IS_LOCAL ? '?local=1&' : '?') + 'room=' + code);
        return;
      } catch (e) {
        net.close();
        if (String(e.type) !== 'unavailable-id') { this.renderTitle('방 만들기 실패: ' + (e.message || e.type || e)); return; }
      }
    }
    this.renderTitle('방 코드를 만들지 못했습니다. 다시 시도해 주세요.');
  }

  async joinRoom(code) {
    if (!/^[A-Z0-9]{5}$/.test(code)) { this.renderTitle('방 코드 5자리를 입력하세요.'); return; }
    this.loading(`${code} 방에 들어가는 중...`);
    const net = new ClientNet();
    try {
      const id = await net.connect(code);
      this.clientNet = net; this.code = code; this.me = id; this.isHost = false;
      net.onMessage = (m) => this.onMsg(m);
      net.onClose = (why) => { this.leaveToTitle(why); };
      this.sendRaw = (m) => net.send(m);
      this.voice = new Voice(net.peer);
      this.sendRaw({ t: 'hello', name: this.name, color: this.color, hat: this.hat });
      history.replaceState(null, '', location.pathname + (IS_LOCAL ? '?local=1&' : '?') + 'room=' + code);
    } catch (e) {
      net.close();
      this.renderTitle(e.message || String(e));
    }
  }

  leaveToTitle(why) {
    try { this.view?.destroy(); } catch (e) { /* noop */ }
    this.view = null; keepAwake(false);
    this.game?.destroy(); this.hostNet?.close(); this.clientNet?.close();
    this.game = this.hostNet = this.clientNet = null;
    if (this.voice?.stream) this.voice.stream.getTracks().forEach(t => t.stop());
    this.voice = null;
    history.replaceState(null, '', location.pathname + (IS_LOCAL ? '?local=1' : ''));
    this.renderTitle(why);
  }

  send(m) { this.sendRaw?.(m); }
  act(a, extra = {}) { this.send({ t: 'act', a, ...extra }); }

  screen(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === id);
    document.body.dataset.screen = id;
  }

  // ---------------- 메시지 ----------------
  onMsg(m) {
    switch (m.t) {
      case 'welcome': this.me = m.you; this.hostId = m.hostId; return;
      case 'reject': this.leaveToTitle(m.reason); return;
      case 'lobby': {
        this.players = m.players; this.settings = m.settings; this.hostId = m.hostId;
        if (m.phase === 'lobby' && (!this.view || this.phase === 'lobby')) { this.phase = 'lobby'; this.renderLobby(); }
        else if (this.phase === 'end' && m.phase === 'lobby') { this.view?.destroy(); this.view = null; this.phase = 'lobby'; this.renderLobby(); }
        return;
      }
      case 'chat': this.addChat(m); return;
      case 'toast': this.toast(m.text, m.kind); return;
      case 'start': {
        this.phase = 'game'; this.mode = m.mode; this.you = m.you; this.gameSettings = m.settings; this.players = m.players;
        this.alive = new Set(m.players.map(p => p.id));
        this.silenced = new Set();
        this.chatLog = [];
        this.view?.destroy();
        this.view = m.mode === 'rt' ? new RTView(this, m) : new TurnView(this, m);
        keepAwake(true);
        if (IS_TOUCH && m.mode === 'rt' && innerHeight > innerWidth) setTimeout(() => this.toast('📱 가로로 돌리면 더 넓게 보여요', 'info'), 6500);
        return;
      }
      case 'end': this.view?.onEnd?.(m); this.phase = 'end'; return;
      case 'left': this.alive?.delete(m.id); this.view?.onMsg?.(m); return;
      default: this.view?.onMsg?.(m);
    }
  }

  player(id) { return this.players.find(p => p.id === id); }
  pname(id) { return this.player(id)?.name ?? '???'; }

  // ---------------- 로비 ----------------
  renderLobby() {
    this.screen('lobby');
    const root = $('#lobby');
    const isHost = this.me === this.hostId;
    const s = this.settings;
    const scroll = root.querySelector('.settings')?.scrollTop || 0;
    const prevIn = root.querySelector('.chat input');
    const draft = prevIn?.value || '', hadFocus = prevIn && document.activeElement === prevIn;
    root.innerHTML = '';
    const link = location.origin + location.pathname + (IS_LOCAL ? '?local=1&' : '?') + 'room=' + this.code;
    const used = new Set(this.players.map(p => p.color));
    const me = this.player(this.me);

    const playersBox = h('div', { class: 'panel players' },
      h('div', { class: 'room-code' },
        h('div', { class: 'label' }, '방 코드'),
        h('div', { class: 'code' }, this.code),
        h('div', { class: 'code-btns' },
          h('button', { class: 'btn small', onclick: () => { navigator.clipboard?.writeText(this.code); this.toast('코드를 복사했어요'); } }, '코드 복사'),
          h('button', { class: 'btn small', onclick: () => { navigator.clipboard?.writeText(link); this.toast('초대 링크를 복사했어요'); } }, '링크 복사'))),
      h('div', { class: 'ptitle' }, `참가자 ${this.players.length}/15`),
      h('div', { class: 'plist' }, this.players.map(p => h('div', { class: 'pcard' + (p.id === this.me ? ' me' : '') },
        gooseCanvas(p.color, p.hat, 2),
        h('div', { class: 'pname' }, p.name, p.isHost ? h('span', { class: 'tag' }, '방장') : null),
        h('span', { class: 'spk', 'data-spk': p.id }, '🔊'),
        isHost && p.id !== this.me ? h('button', { class: 'kick', title: '강퇴', onclick: () => this.send({ t: 'kick', id: p.id }) }, '✕') : null))),
      me ? h('div', { class: 'mylook' },
        h('div', { class: 'color-row small' }, COLORS.map((c, i) => h('button', {
          class: 'swatch' + (i === me.color ? ' on' : '') + (used.has(i) && i !== me.color ? ' taken' : ''), title: c.name, style: { background: c.b },
          onclick: () => { if (!used.has(i)) { store.set('color', i); this.send({ t: 'look', color: i }); } },
        }))),
        h('div', { class: 'hat-row' },
          h('button', { class: 'btn small', onclick: () => { const v = (me.hat + HATS.length - 1) % HATS.length; store.set('hat', v); this.send({ t: 'look', hat: v }); } }, '◀ 모자'),
          h('span', { class: 'hat-name' }, HATS[me.hat].name),
          h('button', { class: 'btn small', onclick: () => { const v = (me.hat + 1) % HATS.length; store.set('hat', v); this.send({ t: 'look', hat: v }); } }, '모자 ▶'))) : null,
      this.micButton(),
      h('button', { class: 'btn small danger', onclick: () => this.leaveToTitle() }, '나가기'),
    );

    const settingsBox = h('div', { class: 'panel settings' + (isHost ? '' : ' readonly') });
    const set = (patch) => { if (!isHost) return; this.send({ t: 'settings', settings: { ...s, ...patch, roles: { ...s.roles, ...(patch.roles || {}) } } }); };
    settingsBox.append(
      h('h3', {}, isHost ? '⚙️ 게임 설정 (방장)' : '⚙️ 게임 설정 (방장만 바꿀 수 있어요)'),
      h('div', { class: 'srow' }, h('label', {}, '게임 방식'),
        h('div', { class: 'seg' },
          h('button', { class: s.mode === 'rt' ? 'on' : '', onclick: () => set({ mode: 'rt' }) }, '🗺️ 실시간 맵'),
          h('button', { class: s.mode === 'turn' ? 'on' : '', onclick: () => set({ mode: 'turn' }) }, '🌙 낮/밤 마피아'))),
      h('div', { class: 'mode-desc' }, s.mode === 'rt'
        ? '맵을 돌아다니며 임무를 하고, 오리는 몰래 거위를 처치합니다. 시체를 신고하거나 긴급회의로 토론·투표합니다. 근처 사람 목소리만 들려요.'
        : '맵 이동 없이 밤에는 직업 능력을 쓰고, 낮에는 모두 모여 토론과 투표로 1명을 추방합니다. 밤엔 오리끼리만 대화할 수 있어요.'),
      s.mode === 'rt' ? h('div', { class: 'srow' }, h('label', {}, '맵'),
        h('div', { class: 'maps' }, MAP_LIST.map(mp => h('button', { class: 'mapbtn' + (s.map === mp.id ? ' on' : ''), onclick: () => set({ map: mp.id }) },
          mapThumb(mp.id), h('div', {}, mp.name))))) : null,
      h('div', { class: 'srow' }, h('label', {}, '🦆 오리(살인자) 수'),
        stepper(s.ducks, 1, 5, v => set({ ducks: v }), isHost),
        h('span', { class: 'hint' }, `현재 인원이면 최대 ${maxDucks(this.players.length)}명 (자동 조정) · 권장 ${Math.max(1, Math.floor(this.players.length / 4))}명`)),
    );
    // 직업
    const teamBox = (team) => h('div', { class: 'team-box team-' + team },
      h('div', { class: 'team-title' }, TEAMS[team].name, h('span', { class: 'hint' }, team === 'duck' ? ' (오리 수 안에서 배정)' : team === 'neutral' ? ' (인원 1/3까지)' : ' (나머지는 기본 거위)')),
      h('div', { class: 'roles' }, ROLE_ORDER.filter(r => ROLES[r].team === team && !ROLES[r].basic).map(r => {
        const R = ROLES[r]; const ok = R.modes.includes(s.mode); const n = s.roles[r] || 0;
        return h('div', { class: 'rolechip' + (n > 0 ? ' on' : '') + (ok ? '' : ' na'), title: R.desc + (ok ? '' : '\n(이 모드에서는 사용 안 됨)') },
          h('span', { class: 'ricon' }, R.icon), h('span', { class: 'rname' }, R.name),
          isHost && ok ? h('span', { class: 'rcnt' },
            h('button', { onclick: () => set({ roles: { [r]: Math.max(0, n - 1) } }) }, '−'),
            h('b', {}, n),
            h('button', { onclick: () => set({ roles: { [r]: Math.min(3, n + 1) } }) }, '+')) : h('b', { class: 'rcnt' }, ok ? n : '-'));
      })));
    settingsBox.append(h('div', { class: 'srow col' }, h('label', {}, '직업 구성 ', h('button', { class: 'btn link small', onclick: () => this.showRoleGuide() }, '직업 설명 보기')),
      teamBox('goose'), teamBox('duck'), teamBox('neutral')));
    const adv = h('div', { class: 'adv' });
    for (const d of SETTING_DEFS.filter(d => d.modes.includes(s.mode))) {
      adv.append(h('div', { class: 'srow' }, h('label', {}, d.label), stepper(s[d.key], d.min, d.max, v => set({ [d.key]: v }), isHost, d.step)));
    }
    for (const d of TOGGLE_DEFS.filter(d => d.modes.includes(s.mode))) {
      adv.append(h('div', { class: 'srow' }, h('label', {}, d.label),
        h('button', { class: 'toggle' + (s[d.key] ? ' on' : ''), disabled: !isHost, onclick: () => set({ [d.key]: !s[d.key] }) }, s[d.key] ? 'ON' : 'OFF')));
    }
    settingsBox.append(h('div', { class: 'srow col' }, h('label', {}, '세부 설정'), adv));
    const startBtn = isHost
      ? h('button', { class: 'btn big primary start', disabled: this.players.length < 3, onclick: () => this.send({ t: 'start' }) }, this.players.length < 3 ? '3명 이상 필요' : '▶ 게임 시작')
      : h('div', { class: 'waiting' }, '방장이 시작하기를 기다리는 중...');
    root.append(h('div', { class: 'lobby-grid' }, playersBox, h('div', { class: 'lobby-right' }, settingsBox, startBtn), this.chatBox('lobby')));
    root.querySelector('.settings').scrollTop = scroll;
    const ci = root.querySelector('.chat input');
    if (ci) { ci.value = draft; if (hadFocus) ci.focus(); }
  }

  micButton() {
    const v = this.voice;
    const icon = !v || !v.available || !v.enabled ? '🎤' : v.muted ? '🔇' : '🎙️';
    const label = !v || !v.available ? ' 음성 미지원' : !v.enabled ? ' 마이크 켜기' : v.muted ? ' 음소거됨' : ' 마이크 켜짐';
    return h('button', {
      class: 'btn mic' + (v?.enabled && !v.muted ? ' live' : ''), 'data-mic': 1,
      onclick: async (e) => {
        if (!v || !v.available) { this.toast(IS_LOCAL ? '로컬 테스트 모드에서는 음성을 쓸 수 없어요' : '이 브라우저에서는 음성을 쓸 수 없어요', 'bad'); return; }
        v.resumeAudio();
        if (!v.enabled) {
          try { await v.enableMic(); this.toast('마이크가 켜졌어요. 가까운 사람에게 들려요!', 'good'); } catch (err) { this.toast('마이크 권한이 필요해요: ' + (err.message || err.name), 'bad'); }
        } else v.setMuted(!v.muted);
        this.refreshMic();
      },
    }, icon, h('span', { class: 'mlabel' }, label));
  }
  refreshMic() { for (const b of document.querySelectorAll('[data-mic]')) b.replaceWith(this.micButton()); }

  // ---------------- 채팅 ----------------
  chatBox(where) {
    const log = h('div', { class: 'chatlog' });
    const input = h('input', { maxlength: 200, placeholder: '메시지 입력 (Enter)' });
    const box = h('div', { class: 'panel chat chat-' + where }, log, h('div', { class: 'chatin' }, input, h('button', { class: 'btn small', onclick: () => sendIt() }, '전송')));
    const sendIt = () => { const t = input.value.trim(); if (t) this.send({ t: 'chat', text: t }); input.value = ''; };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') sendIt(); });
    input.addEventListener('keyup', e => e.stopPropagation());
    for (const m of this.chatLog) log.append(this.chatLine(m));
    log.scrollTop = 1e9;
    return box;
  }
  chatLine(m) {
    const p = m.from ? this.player(m.from) : null;
    const chName = { duck: '[오리] ', dead: '[유령] ', all: '', sys: '' }[m.ch] || '';
    return h('div', { class: 'cl ch-' + m.ch },
      p ? h('span', { class: 'cn', style: { color: COLORS[p.color].b } }, chName + p.name + ': ') : null, m.text);
  }
  addChat(m) {
    this.chatLog.push(m); if (this.chatLog.length > 200) this.chatLog.shift();
    for (const log of document.querySelectorAll('.chatlog')) { log.append(this.chatLine(m)); log.scrollTop = 1e9; }
    this.view?.onChat?.(m);
  }

  toast(text, kind = 'info') {
    const t = h('div', { class: 'toast ' + kind }, text);
    $('#toasts').append(t);
    setTimeout(() => t.classList.add('out'), kind === 'role' ? 6500 : 3800);
    setTimeout(() => t.remove(), kind === 'role' ? 7000 : 4300);
  }

  modal(title, body, buttons = [{ label: '닫기' }]) {
    const bg = h('div', { class: 'modal-bg' });
    const close = () => bg.remove();
    bg.append(h('div', { class: 'modal panel' }, h('h3', {}, title), body,
      h('div', { class: 'modal-btns' }, buttons.map(b => h('button', { class: 'btn' + (b.primary ? ' primary' : ''), onclick: () => { b.onclick?.(); close(); } }, b.label)))));
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    document.body.append(bg);
    return close;
  }

  showRoleGuide() {
    const body = h('div', { class: 'guide' }, ['goose', 'duck', 'neutral'].map(team => h('div', { class: 'team-box team-' + team },
      h('div', { class: 'team-title' }, TEAMS[team].name, h('span', { class: 'hint' }, ' — ' + TEAMS[team].desc)),
      ROLE_ORDER.filter(r => ROLES[r].team === team).map(r => h('div', { class: 'gitem' },
        h('span', { class: 'ricon' }, ROLES[r].icon),
        h('div', {}, h('b', {}, ROLES[r].name), h('span', { class: 'modes' }, ROLES[r].modes.map(m => m === 'rt' ? '실시간' : '낮밤').join(' · ')),
          h('div', { class: 'gdesc' }, ROLES[r].desc)))))));
    this.modal('📖 직업 도감', body);
  }

  // ---------------- 음성 볼륨 ----------------
  voiceTick() {
    const v = this.voice; if (!v || !v.peer) return;
    const ids = this.players.map(p => p.id).filter(id => id !== this.me);
    v.sync(ids);
    const vols = {};
    for (const id of ids) vols[id] = this.view?.volumeFor ? this.view.volumeFor(id) : 1;
    v.apply(vols);
    // 말하는 중 표시
    for (const el of document.querySelectorAll('[data-spk]')) el.classList.toggle('on', v.speaking(el.dataset.spk));
    // 침묵 상태면 내 마이크 강제 끔
    v.setForceMute(!!this.view?.selfMuted?.());
  }
}

function stepper(val, min, max, onChange, enabled = true, step = 1) {
  const fmt = (x) => (Math.round(x * 100) / 100).toString();
  return h('span', { class: 'stepper' },
    h('button', { disabled: !enabled || val <= min, onclick: () => onChange(Math.max(min, +(val - step).toFixed(2))) }, '−'),
    h('b', {}, fmt(val)),
    h('button', { disabled: !enabled || val >= max, onclick: () => onChange(Math.min(max, +(val + step).toFixed(2))) }, '+'));
}

const thumbCache = {};
function mapThumb(id) {
  if (!thumbCache[id]) {
    const m = getMap(id);
    const c = document.createElement('canvas'); c.width = m.W * 2; c.height = m.H * 2;
    const x = c.getContext('2d');
    const col = { space: ['#0b0c16', '#20232f', '#566078', '#3c4256', '#566078'], village: ['#2e6a34', '#245a2a', '#5aa84a', '#c9a26a', '#b07a42'], mansion: ['#15101c', '#4a2a48', '#d6cfc0', '#a82a4a', '#7a5028'] }[m.theme];
    for (let j = 0; j < m.H; j++) for (let i = 0; i < m.W; i++) { x.fillStyle = col[m.grid[j * m.W + i]]; x.fillRect(i * 2, j * 2, 2, 2); }
    thumbCache[id] = c;
  }
  const out = document.createElement('canvas'); out.width = thumbCache[id].width; out.height = thumbCache[id].height; out.className = 'pix thumb';
  out.getContext('2d').drawImage(thumbCache[id], 0, 0);
  return out;
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && app.view) keepAwake(true); });
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
if (IS_TOUCH) document.body.classList.add('touch');
export const app = new App();
window.qmApp = app;
