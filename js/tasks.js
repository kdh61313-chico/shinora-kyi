// 임무 미니게임
import { h } from './util.js';

const WIRE_COLORS = ['#e8484a', '#3f7de8', '#f5d547', '#f58cc0'];
const rnd = (n) => (Math.random() * n) | 0;
const shuffled = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function openTask(type, label, onDone, opts = {}) {
  const bg = h('div', { class: 'task-bg' });
  const box = h('div', { class: 'task panel' });
  let closed = false;
  const close = () => { if (closed) return; closed = true; bg.remove(); document.removeEventListener('keydown', esc, true); clearInterval(timer); opts.onClose?.(); };
  const done = () => { if (closed) return; body.innerHTML = ''; body.append(h('div', { class: 'task-ok' }, '✔ 완료!')); setTimeout(() => { close(); onDone(); }, 550); };
  const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', esc, true);
  const body = h('div', { class: 'task-body' });
  box.append(h('div', { class: 'task-head' }, h('b', {}, label), h('button', { class: 'btn small', onclick: close }, '✕')), body);
  if (opts.fake) box.append(h('div', { class: 'hint' }, '(가짜 임무 — 오리는 실제로 진행되지 않아요)'));
  bg.append(box);
  document.body.append(bg);
  let timer = 0;

  switch (type) {
    case 'wires': {
      const order = shuffled([0, 1, 2, 3]);
      const left = h('div', { class: 'wcol' }), right = h('div', { class: 'wcol' });
      let sel = null, ok = 0;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'wsvg');
      const wrap = h('div', { class: 'wires' }, left, svg, right);
      const L = WIRE_COLORS.map((c, i) => { const b = h('button', { class: 'wend', style: { background: c }, onclick: () => { if (b.dataset.done) return; sel = i; L.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); } }); left.append(b); return b; });
      order.forEach((ci) => {
        const b = h('button', { class: 'wend', style: { background: WIRE_COLORS[ci] }, onclick: () => {
          if (sel == null || b.dataset.done) return;
          if (sel === ci) {
            b.dataset.done = L[ci].dataset.done = 1; L[ci].classList.remove('sel');
            const r1 = L[ci].getBoundingClientRect(), r2 = b.getBoundingClientRect(), r0 = svg.getBoundingClientRect();
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', 0); line.setAttribute('y1', r1.top + r1.height / 2 - r0.top);
            line.setAttribute('x2', r0.width); line.setAttribute('y2', r2.top + r2.height / 2 - r0.top);
            line.setAttribute('stroke', WIRE_COLORS[ci]); line.setAttribute('stroke-width', 8);
            svg.append(line);
            if (++ok === 4) done();
          } else { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 300); }
          sel = null;
        } });
        right.append(b);
      });
      body.append(h('div', { class: 'hint' }, '왼쪽 전선을 누르고, 같은 색 오른쪽 단자를 누르세요.'), wrap);
      break;
    }
    case 'numbers': {
      let next = 1;
      const grid = h('div', { class: 'numgrid' });
      shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).forEach(n => {
        const b = h('button', { class: 'num', onclick: () => {
          if (n === next) { b.classList.add('on'); next++; if (next > 10) done(); }
          else { next = 1; grid.querySelectorAll('.num').forEach(x => x.classList.remove('on')); grid.classList.add('shake'); setTimeout(() => grid.classList.remove('shake'), 300); }
        } }, n);
        grid.append(b);
      });
      body.append(h('div', { class: 'hint' }, '1부터 10까지 순서대로 누르세요.'), grid);
      break;
    }
    case 'hold': {
      let prog = 0, holding = false;
      const bar = h('div', { class: 'bar' }, h('div', { class: 'fill' }));
      const btn = h('button', { class: 'btn big holdbtn' }, '꾹 누르기');
      const on = (e) => { e.preventDefault(); holding = true; }, off = () => { holding = false; };
      btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointerleave', off);
      timer = setInterval(() => { if (holding) prog += 0.05 / 3; bar.firstChild.style.width = Math.min(100, prog * 100) + '%'; if (prog >= 1) { clearInterval(timer); done(); } }, 50);
      body.append(h('div', { class: 'hint' }, '버튼을 3초 동안 누르고 있으세요.'), bar, btn);
      break;
    }
    case 'slider': {
      const target = 15 + rnd(70);
      const mark = h('div', { class: 'smark', style: { left: target + '%' } });
      const input = h('input', { type: 'range', min: 0, max: 100, value: target > 50 ? 5 : 95, class: 'slider' });
      const check = () => { if (Math.abs(+input.value - target) <= 3) done(); };
      input.addEventListener('change', check); input.addEventListener('pointerup', check);
      body.append(h('div', { class: 'hint' }, '노란 표시에 맞춰 놓으세요.'), h('div', { class: 'strack' }, mark), input);
      break;
    }
    case 'download': {
      const bar = h('div', { class: 'bar' }, h('div', { class: 'fill' }));
      const txt = h('div', { class: 'hint' }, '시작 버튼을 누르고 기다리세요.');
      const btn = h('button', { class: 'btn big', onclick: () => {
        btn.disabled = true; let p = 0;
        timer = setInterval(() => { p += 0.05 / 6; bar.firstChild.style.width = Math.min(100, p * 100) + '%'; txt.textContent = `진행 중... ${Math.min(100, p * 100) | 0}%`; if (p >= 1) { clearInterval(timer); done(); } }, 50);
      } }, '시작');
      body.append(txt, bar, btn);
      break;
    }
    case 'target': {
      const area = h('div', { class: 'tarea' });
      let left = 6;
      const spawn = () => {
        const t = h('button', { class: 'tgt', style: { left: (5 + rnd(80)) + '%', top: (5 + rnd(75)) + '%' }, onclick: () => { t.remove(); if (--left <= 0) done(); else spawn(); } });
        area.append(t);
      };
      spawn();
      body.append(h('div', { class: 'hint' }, '나타나는 과녁 6개를 누르세요.'), area);
      break;
    }
    case 'code': {
      const code = String(1000 + rnd(9000));
      let typed = '';
      const disp = h('div', { class: 'codedisp' }, '____');
      const pad = h('div', { class: 'keypad' });
      const upd = () => { disp.textContent = (typed + '____').slice(0, 4); };
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '✔']) pad.append(h('button', { class: 'num', onclick: () => {
        if (k === '←') typed = typed.slice(0, -1);
        else if (k === '✔') { if (typed === code) return done(); typed = ''; disp.classList.add('shake'); setTimeout(() => disp.classList.remove('shake'), 300); }
        else if (typed.length < 4) typed += k;
        upd();
      } }, k));
      body.append(h('div', { class: 'note' }, '📝 메모: ', h('b', {}, code)), disp, pad);
      break;
    }
  }
  return close;
}
