import { gooseSprite } from './sprites.js';

export const $ = (s, el = document) => el.querySelector(s);
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export function gooseCanvas(color, hat, scale = 3, kind = 'idle', flip = false) {
  const spr = gooseSprite(color, hat, kind, flip);
  const c = h('canvas', { class: 'pix', width: spr.width * scale, height: spr.height * scale });
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(spr, 0, 0, c.width, c.height);
  return c;
}


// ---------- 공용 UI ----------
import { ROLES, TEAMS } from './roles.js';

export function roleCard(app, you, roster, opts = {}) {
  const R = ROLES[you.role], T = TEAMS[R.team];
  const nm = (id) => roster.find(p => p.id === id)?.name ?? '???';
  const extra = [];
  if (you.mates?.length) extra.push(`🦆 동료 오리: ${you.mates.map(nm).join(', ')}`);
  if (you.bountyTarget && you.role === 'bounty') extra.push(`💰 목표: ${nm(you.bountyTarget)}`);
  if (you.lover) extra.push(`💕 연인: ${nm(you.lover)} (한 명이 죽으면 함께 죽어요)`);
  if (you.role === 'vulture') extra.push(`🦃 시체 ${you.vultureNeed}개를 먹으면 승리`);
  if (you.role === 'pigeon' && opts.infected) extra.push(`🕊️ 감염시킨 수: ${opts.infected.size}`);
  return h('div', { class: 'rolecard team-' + R.team },
    h('div', { class: 'rc-top' }, h('span', { class: 'ricon' }, R.icon), h('b', { style: { color: T.color } }, R.name), h('span', { class: 'rc-team' }, T.short)),
    h('div', { class: 'rc-desc' }, R.desc),
    extra.map(t => h('div', { class: 'rc-extra' }, t)));
}

export function introOverlay(app, you, roster) {
  const R = ROLES[you.role], T = TEAMS[R.team];
  const me = roster.find(p => p.id === app.me);
  const mates = (you.mates || []).map(id => roster.find(p => p.id === id)).filter(Boolean);
  const el = h('div', { class: 'intro team-' + R.team, onclick: () => el.remove() },
    h('div', { class: 'intro-sub' }, '당신의 직업은...'),
    h('div', { class: 'intro-geese' }, me ? gooseCanvas(me.color, me.hat, 7) : null, mates.map(p => gooseCanvas(p.color, p.hat, 5))),
    h('div', { class: 'intro-role', style: { color: T.color } }, R.icon + ' ' + R.name),
    h('div', { class: 'intro-team' }, T.name + ' — ' + T.desc),
    h('div', { class: 'intro-desc' }, R.desc),
    mates.length ? h('div', { class: 'intro-desc' }, '동료: ' + mates.map(p => p.name).join(', ')) : null,
    h('div', { class: 'hint' }, '(화면을 누르면 닫혀요)'));
  document.body.append(el);
  setTimeout(() => el.remove(), 6000);
}

export function showEnd(app, m, roster) {
  document.querySelectorAll('.endscr').forEach(e => e.remove());
  const win = new Set(m.winners);
  const meWon = win.has(app.me);
  const isHost = app.me === app.hostId;
  const el = h('div', { class: 'endscr' + (meWon ? ' won' : ' lost') },
    h('div', { class: 'end-title' }, m.title),
    h('div', { class: 'end-reason' }, m.reason),
    h('div', { class: 'end-me' }, meWon ? '🎉 승리했습니다!' : '😢 패배했습니다'),
    h('div', { class: 'end-list' }, roster.map(p => {
      const r = m.roles[p.id]; if (!r) return null;
      const R = ROLES[r.role];
      return h('div', { class: 'end-p' + (win.has(p.id) ? ' win' : '') },
        gooseCanvas(p.color, p.hat, 2, r.alive ? 'idle' : 'ghost'),
        h('div', {}, h('b', {}, p.name, win.has(p.id) ? ' 👑' : ''), h('div', { style: { color: TEAMS[R.team].color } }, R.icon + ' ' + R.name, m.lovers?.includes(p.id) ? ' 💕' : '')));
    })),
    h('div', { class: 'end-btns' },
      isHost ? h('button', { class: 'btn big primary', onclick: () => { app.send({ t: 'backToLobby' }); } }, '🏠 로비로 돌아가기') : h('div', { class: 'hint' }, '방장이 로비로 돌아가면 다시 할 수 있어요'),
      h('button', { class: 'btn', onclick: () => { el.remove(); app.leaveToTitle(); } }, '나가기')));
  document.body.append(el);
  const obs = setInterval(() => { if (app.phase === 'lobby') { el.remove(); clearInterval(obs); } }, 300);
}
