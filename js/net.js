// 네트워크: 방장(호스트)이 권한을 가진 P2P 구조
// - 기본: PeerJS(WebRTC). 방장 피어 ID = PREFIX + 방코드
// - 테스트용: ?local=1 이면 BroadcastChannel (같은 브라우저 탭끼리)

const PREFIX = 'quackmafia-v1-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const IS_LOCAL = new URLSearchParams(location.search).has('local');

export function makeCode(len = 5) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
  return s;
}

const PEER_OPTS = {
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
  },
};

function waitPeerOpen(peer) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('시그널링 서버 연결 시간 초과')), 15000);
    peer.on('open', id => { clearTimeout(t); res(id); });
    peer.on('error', e => { clearTimeout(t); rej(e); });
  });
}

// ---------------- 호스트 ----------------
export class HostNet {
  constructor() { this.conns = new Map(); this.onMessage = null; this.onLeave = null; this.selfId = null; this.peer = null; }

  async open(code) {
    this.code = code;
    if (IS_LOCAL) {
      this.selfId = 'H' + code;
      this.bc = new BroadcastChannel('qm-' + code);
      this.bc.onmessage = (e) => {
        const { from, to, msg, kind } = e.data;
        if (to !== this.selfId) return;
        if (kind === 'connect') { this.conns.set(from, { local: true }); this.bc.postMessage({ from: this.selfId, to: from, kind: 'accept' }); return; }
        if (kind === 'close') { this.conns.delete(from); this.onLeave?.(from); return; }
        this.onMessage?.(from, msg);
      };
      return this.selfId;
    }
    const peer = new window.Peer(PREFIX + code, PEER_OPTS);
    this.peer = peer;
    this.selfId = await waitPeerOpen(peer);
    peer.on('connection', (conn) => {
      conn.on('open', () => { this.conns.set(conn.peer, conn); });
      conn.on('data', (msg) => this.onMessage?.(conn.peer, msg));
      const bye = () => { if (this.conns.get(conn.peer) === conn) { this.conns.delete(conn.peer); this.onLeave?.(conn.peer); } };
      conn.on('close', bye); conn.on('error', bye);
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* noop */ } });
    return this.selfId;
  }

  send(id, msg) {
    if (id === this.selfId) { queueMicrotask(() => this.onSelf?.(msg)); return; }
    if (IS_LOCAL) { if (this.conns.has(id)) this.bc.postMessage({ from: this.selfId, to: id, msg }); return; }
    const c = this.conns.get(id);
    if (c && c.open) { try { c.send(msg); } catch (e) { /* noop */ } }
  }
  kick(id) {
    if (IS_LOCAL) { this.bc.postMessage({ from: this.selfId, to: id, kind: 'close' }); this.conns.delete(id); return; }
    const c = this.conns.get(id); if (c) c.close();
  }
  close() { if (this.bc) this.bc.close(); if (this.peer) this.peer.destroy(); }
}

// ---------------- 참가자 ----------------
export class ClientNet {
  constructor() { this.onMessage = null; this.onClose = null; this.selfId = null; this.peer = null; }

  async connect(code) {
    this.code = code;
    if (IS_LOCAL) {
      this.selfId = 'C' + Math.random().toString(36).slice(2, 9);
      this.hostId = 'H' + code;
      this.bc = new BroadcastChannel('qm-' + code);
      await new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('방을 찾을 수 없습니다')), 2500);
        this.bc.onmessage = (e) => {
          const { from, to, msg, kind } = e.data;
          if (to !== this.selfId) return;
          if (kind === 'accept') { clearTimeout(t); res(); return; }
          if (kind === 'close') { this.onClose?.('방장이 연결을 끊었습니다'); return; }
          this.onMessage?.(msg);
        };
        this.bc.postMessage({ from: this.selfId, to: this.hostId, kind: 'connect' });
      });
      window.addEventListener('beforeunload', () => this.bc.postMessage({ from: this.selfId, to: this.hostId, kind: 'close' }));
      return this.selfId;
    }
    const peer = new window.Peer(PEER_OPTS);
    this.peer = peer;
    this.selfId = await waitPeerOpen(peer);
    await new Promise((res, rej) => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      const t = setTimeout(() => rej(new Error('방을 찾을 수 없습니다 (코드 확인)')), 12000);
      peer.on('error', (e) => { if (e.type === 'peer-unavailable') { clearTimeout(t); rej(new Error('방을 찾을 수 없습니다 (코드 확인)')); } });
      conn.on('open', () => { clearTimeout(t); this.conn = conn; res(); });
      conn.on('data', (msg) => this.onMessage?.(msg));
      conn.on('close', () => this.onClose?.('방장과 연결이 끊어졌습니다'));
    });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* noop */ } });
    return this.selfId;
  }
  send(msg) {
    if (IS_LOCAL) { this.bc.postMessage({ from: this.selfId, to: this.hostId, msg }); return; }
    if (this.conn && this.conn.open) { try { this.conn.send(msg); } catch (e) { /* noop */ } }
  }
  close() {
    if (IS_LOCAL) { this.bc?.postMessage({ from: this.selfId, to: this.hostId, kind: 'close' }); this.bc?.close(); return; }
    this.peer?.destroy();
  }
}

// ---------------- 음성 ----------------
// 마이크가 켜진 사람이 다른 모든 사람에게 단방향 통화를 건다.
// 듣는 쪽에서 게임 상태(거리/회의/생사)에 따라 사람별 볼륨을 조절한다.
export class Voice {
  constructor(peer) {
    this.peer = peer;
    this.stream = null;
    this.out = new Map();      // peerId -> MediaConnection (내가 건 통화)
    this.inc = new Map();      // peerId -> { audio, call, analyser }
    this.enabled = false;
    this.muted = false;
    this.ctx = null;
    this.levels = new Map();   // 말하는 중 표시용
    if (peer) peer.on('call', (call) => this._answer(call));
  }
  get available() { return !!this.peer && !!navigator.mediaDevices?.getUserMedia; }

  async enableMic() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 브라우저는 마이크를 지원하지 않습니다 (HTTPS 필요)');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.enabled = true;
    this._ensureCtx();
    this.selfAnalyser = this._analyse(this.stream);
    this.setMuted(this.muted);
  }
  setMuted(m) {
    this.muted = m;
    if (this.stream) this.stream.getAudioTracks().forEach(t => { t.enabled = !m && !this.forceMute; });
  }
  setForceMute(f) { this.forceMute = f; this.setMuted(this.muted); }

  _ensureCtx() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* noop */ } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  _analyse(stream) {
    if (!this.ctx) return null;
    try {
      const src = this.ctx.createMediaStreamSource(stream);
      const an = this.ctx.createAnalyser(); an.fftSize = 256; src.connect(an);
      return an;
    } catch (e) { return null; }
  }
  level(an) {
    if (!an) return 0;
    const d = new Uint8Array(an.frequencyBinCount); an.getByteTimeDomainData(d);
    let s = 0; for (const v of d) { const x = (v - 128) / 128; s += x * x; }
    return Math.sqrt(s / d.length);
  }

  // 현재 방의 peerId 목록에 맞춰 통화 연결 유지
  sync(peerIds) {
    if (!this.peer) return;
    const set = new Set(peerIds);
    for (const [id, c] of this.out) if (!set.has(id)) { c.close(); this.out.delete(id); }
    for (const [id, x] of this.inc) if (!set.has(id)) { x.call.close(); x.audio.remove(); this.inc.delete(id); }
    if (!this.stream) return;
    const t = Date.now();
    this.lastTry ||= new Map();
    for (const id of set) {
      if (id === this.peer.id || this.out.has(id)) continue;
      if (t - (this.lastTry.get(id) || 0) < 4000) continue;
      this.lastTry.set(id, t);
      try {
        const call = this.peer.call(id, this.stream, { metadata: { qm: 1 } });
        if (!call) continue;
        this.out.set(id, call);
        const drop = () => { if (this.out.get(id) === call) this.out.delete(id); };
        call.on('close', drop); call.on('error', drop);
      } catch (e) { /* noop */ }
    }
  }
  _answer(call) {
    call.answer();
    call.on('stream', (stream) => {
      const old = this.inc.get(call.peer);
      if (old) { old.audio.remove(); }
      const audio = document.createElement('audio');
      audio.autoplay = true; audio.playsInline = true; audio.srcObject = stream; audio.volume = 0;
      document.body.appendChild(audio);
      audio.play().catch(() => {});
      this._ensureCtx();
      this.inc.set(call.peer, { audio, call, analyser: this._analyse(stream) });
    });
    const drop = () => { const x = this.inc.get(call.peer); if (x && x.call === call) { x.audio.remove(); this.inc.delete(call.peer); } };
    call.on('close', drop); call.on('error', drop);
  }
  // vols: peerId -> 0..1
  apply(vols) {
    for (const [id, x] of this.inc) {
      const v = Math.max(0, Math.min(1, vols[id] ?? 0));
      if (Math.abs(x.audio.volume - v) > 0.01) x.audio.volume = v;
      if (x.audio.paused) x.audio.play().catch(() => {});
    }
  }
  speaking(peerId) {
    if (peerId === this.peer?.id) return !this.muted && this.level(this.selfAnalyser) > 0.04;
    const x = this.inc.get(peerId);
    return !!x && x.audio.volume > 0.05 && this.level(x.analyser) > 0.04;
  }
  resumeAudio() { this._ensureCtx(); for (const [, x] of this.inc) x.audio.play().catch(() => {}); }
}
