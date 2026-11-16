// 직업 정의. team: goose(시민) / duck(살인자) / neutral(중립)
// modes: 사용 가능한 모드 (rt = 실시간 맵, turn = 낮/밤)
// rt: 실시간 모드 능력 버튼 정보 / night: 낮밤 모드 밤 행동 정보

export const TEAMS = {
  goose: { name: '거위팀', short: '거위', color: '#f4f1e8', desc: '임무를 끝내거나 오리를 모두 찾아내세요.' },
  duck: { name: '오리팀', short: '오리', color: '#ff6b6b', desc: '거위를 처치해 수를 맞추면 승리합니다.' },
  neutral: { name: '중립', short: '중립', color: '#c49aff', desc: '자신만의 승리 조건이 있습니다.' },
};

export const ROLES = {
  // ---------------- 거위팀 ----------------
  goose: { team: 'goose', name: '거위', icon: '🪿', basic: true, modes: ['rt', 'turn'],
    desc: '평범한 거위. 임무를 하고 토론으로 오리를 찾아내세요.' },
  detective: { team: 'goose', name: '탐정', icon: '🔍', modes: ['rt', 'turn'],
    desc: '실시간: 라운드마다 1번, 가까운 플레이어가 이번 라운드에 살인했는지 확인. 낮밤: 밤마다 1명이 오리팀인지 조사.',
    rt: { label: '조사', target: 'player', perRound: 1 }, night: { label: '조사', target: 'other' } },
  medic: { team: 'goose', name: '의사', icon: '💉', modes: ['rt', 'turn'],
    desc: '실시간: 라운드마다 1번 가까운 플레이어에게 보호막(공격 1회 방어). 낮밤: 밤마다 1명을 살림(자신 포함).',
    rt: { label: '보호막', target: 'player', perRound: 1 }, night: { label: '치료', target: 'any' } },
  sheriff: { team: 'goose', name: '보안관', icon: '🔫', modes: ['rt', 'turn'],
    desc: '총으로 처치할 수 있습니다. 하지만 대상이 오리나 매가 아니면 보안관이 대신 죽습니다.',
    rt: { label: '사격', target: 'player', cooldown: 'kill' }, night: { label: '사격', target: 'other' } },
  engineer: { team: 'goose', name: '엔지니어', icon: '🔧', modes: ['rt'],
    desc: '벤트(통로)를 쓸 수 있고, 라운드마다 1번 어디서든 사보타주를 고칠 수 있습니다.',
    rt: { label: '원격수리', target: 'none', perRound: 1 }, vent: true },
  mortician: { team: 'goose', name: '장의사', icon: '⚰️', modes: ['rt', 'turn'],
    desc: '시체(죽은 사람)의 직업을 알아낼 수 있습니다.',
    rt: { label: '검시', target: 'body' }, night: { label: '검시', target: 'dead' } },
  medium: { team: 'goose', name: '영매', icon: '🔮', modes: ['rt', 'turn'],
    desc: '살아있어도 유령의 목소리와 채팅을 듣고, 실시간 모드에선 유령이 보입니다.' },
  bodyguard: { team: 'goose', name: '경호원', icon: '🛡️', modes: ['rt', 'turn'],
    desc: '1명을 경호합니다. 경호 대상이 공격받으면 경호원이 대신 죽습니다.',
    rt: { label: '경호', target: 'player', perRound: 1 }, night: { label: '경호', target: 'other' } },
  politician: { team: 'goose', name: '정치인', icon: '🎩', modes: ['rt', 'turn'],
    desc: '투표가 2표로 계산되고, 첫 번째 추방 투표에서는 살아남습니다.' },
  soldier: { team: 'goose', name: '군인', icon: '🪖', modes: ['rt', 'turn'],
    desc: '공격을 한 번 버텨냅니다.' },
  tracker: { team: 'goose', name: '추적자', icon: '🧭', modes: ['rt', 'turn'],
    desc: '실시간: 1명에게 추적기를 달아 위치 화살표를 봄(라운드당 1). 낮밤: 대상이 밤에 누구를 찾아갔는지 확인.',
    rt: { label: '추적', target: 'player', perRound: 1 }, night: { label: '추적', target: 'other' } },
  lookout: { team: 'goose', name: '감시자', icon: '👁️', modes: ['rt', 'turn'],
    desc: '실시간: 5초 동안 맵 전체의 플레이어 위치를 봄(쿨 40초). 낮밤: 대상을 밤에 찾아온 사람들을 확인.',
    rt: { label: 'CCTV', target: 'none', cooldown: 40 }, night: { label: '잠복', target: 'other' } },
  avenger: { team: 'goose', name: '복수자', icon: '⚔️', modes: ['rt', 'turn'],
    desc: '살해당하면 다음 회의(아침)에 범인의 이름이 모두에게 공개됩니다.' },
  reporter: { team: 'goose', name: '기자', icon: '📰', modes: ['rt', 'turn'],
    desc: '게임당 1번, 1명의 직업을 다음 회의(아침)에 모두에게 공개합니다.',
    rt: { label: '취재', target: 'player', perGame: 1 }, night: { label: '취재', target: 'other', perGame: 1 } },
  priest: { team: 'goose', name: '성직자', icon: '✝️', modes: ['rt', 'turn'],
    desc: '게임당 1번, 죽은 사람을 되살립니다.',
    rt: { label: '부활', target: 'body', perGame: 1 }, night: { label: '부활', target: 'dead', perGame: 1 } },
  celebrity: { team: 'goose', name: '유명인', icon: '⭐', modes: ['rt'],
    desc: '죽으면 즉시 모든 플레이어에게 죽은 장소가 알려집니다.' },
  canadian: { team: 'goose', name: '캐나다 거위', icon: '🍁', modes: ['rt'],
    desc: '살해당하면 자동으로 시체가 신고되어 회의가 열립니다.' },

  // ---------------- 오리팀 ----------------
  duck: { team: 'duck', name: '오리', icon: '🦆', basic: true, modes: ['rt', 'turn'],
    desc: '거위를 처치하고 사보타주로 방해하세요. 벤트를 쓸 수 있습니다.', vent: true },
  assassin: { team: 'duck', name: '암살자', icon: '🗡️', modes: ['rt', 'turn'],
    desc: '회의(낮) 중에 다른 사람의 직업을 맞추면 즉시 처치합니다. 틀리면 자신이 죽습니다.', vent: true },
  morph: { team: 'duck', name: '변장술사', icon: '🎭', modes: ['rt', 'turn'],
    desc: '실시간: 가까운 사람의 모습으로 25초간 변장. 낮밤: 탐정 조사에 거위로 보입니다.',
    rt: { label: '변장', target: 'player', cooldown: 30 }, vent: true },
  cleaner: { team: 'duck', name: '청소부', icon: '🧹', modes: ['rt', 'turn'],
    desc: '실시간: 시체를 치웁니다(킬 쿨타임 공유). 낮밤: 오리팀이 죽인 사람의 직업이 공개되지 않습니다.',
    rt: { label: '청소', target: 'body', cooldown: 'kill' }, vent: true },
  invisible: { team: 'duck', name: '투명오리', icon: '👻', modes: ['rt'],
    desc: '8초 동안 투명해집니다(쿨 30초).',
    rt: { label: '투명', target: 'none', cooldown: 30 }, vent: true },
  sniper: { team: 'duck', name: '저격수', icon: '🎯', modes: ['rt', 'turn'],
    desc: '게임당 1번, 멀리 있는 사람(시야 안)을 저격합니다. 낮밤: 밤에 1명을 추가로 처치.',
    rt: { label: '저격', target: 'far', perGame: 1 }, night: { label: '저격', target: 'other', perGame: 1 }, vent: true },
  silencer: { team: 'duck', name: '침묵자', icon: '🤐', modes: ['rt', 'turn'],
    desc: '1명을 다음 회의(낮) 동안 말과 채팅을 못 하게 만듭니다.',
    rt: { label: '침묵', target: 'player', perRound: 1 }, night: { label: '침묵', target: 'other' }, vent: true },
  spy: { team: 'duck', name: '스파이', icon: '🕵️', modes: ['rt', 'turn'],
    desc: '가까운 사람(밤엔 아무나)의 직업을 몰래 알아냅니다. 라운드당 1번.',
    rt: { label: '염탐', target: 'player', perRound: 1 }, night: { label: '염탐', target: 'other' }, vent: true },

  // ---------------- 중립 ----------------
  dodo: { team: 'neutral', name: '도도새', icon: '🦤', modes: ['rt', 'turn'],
    desc: '투표로 추방당하면 단독 승리! 최대한 의심을 받으세요.' },
  falcon: { team: 'neutral', name: '매', icon: '🦅', modes: ['rt', 'turn'],
    desc: '모두를 처치하고 마지막 1~2인까지 살아남으면 승리. 벤트 사용 가능.',
    rt: { label: '사냥', target: 'player', cooldown: 'kill' }, night: { label: '사냥', target: 'other' }, vent: true },
  pigeon: { team: 'neutral', name: '비둘기', icon: '🕊️', modes: ['rt', 'turn'],
    desc: '살아있는 모든 플레이어를 감염시키면 승리합니다.',
    rt: { label: '감염', target: 'player', cooldown: 15 }, night: { label: '감염', target: 'other' } },
  vulture: { team: 'neutral', name: '독수리', icon: '🦃', modes: ['rt', 'turn'],
    desc: '시체를 정해진 수만큼 먹으면 승리합니다. 먹은 시체는 사라집니다.',
    rt: { label: '먹기', target: 'body', cooldown: 10 }, night: { label: '먹기', target: 'dead' } },
  bounty: { team: 'neutral', name: '현상금 사냥꾼', icon: '💰', modes: ['rt', 'turn'],
    desc: '지정된 목표가 투표로 추방되면 승리. 목표가 다른 이유로 죽으면 도도새가 됩니다.' },
  survivor: { team: 'neutral', name: '생존자', icon: '🎒', modes: ['rt', 'turn'],
    desc: '게임이 끝날 때 살아있기만 하면 이긴 팀과 함께 승리합니다.' },
};

export const ROLE_ORDER = Object.keys(ROLES);

export function isEvil(roleId) { // 보안관이 쏴도 되는 대상
  return ROLES[roleId].team === 'duck' || roleId === 'falcon';
}

export const DEFAULT_SETTINGS = {
  mode: 'rt',            // 'rt' | 'turn'
  map: 'space',          // space | village | mansion
  ducks: 2,
  roles: { detective: 1, medic: 1, sheriff: 0, engineer: 1, mortician: 0, medium: 0, bodyguard: 0, politician: 0,
    soldier: 0, tracker: 0, lookout: 0, avenger: 0, reporter: 0, priest: 0, celebrity: 0, canadian: 0,
    assassin: 0, morph: 1, cleaner: 0, invisible: 0, sniper: 0, silencer: 0, spy: 0,
    dodo: 1, falcon: 0, pigeon: 0, vulture: 0, bounty: 0, survivor: 0 },
  lovers: false,
  killCooldown: 25,
  speed: 1.0,
  gooseVision: 1.0,
  duckVision: 1.4,
  tasks: 5,
  emergency: 1,
  discussTime: 30,
  voteTime: 45,
  confirmEjects: true,
  anonVotes: false,
  voiceRange: 7,        // 타일
  nightTime: 30,
  dayTime: 90,
  dayVoteTime: 30,
  revealOnDeath: true,
};

export const SETTING_DEFS = [
  { key: 'killCooldown', label: '킬 쿨타임(초)', min: 10, max: 60, step: 5, modes: ['rt'] },
  { key: 'speed', label: '이동 속도', min: 0.5, max: 2, step: 0.25, modes: ['rt'] },
  { key: 'gooseVision', label: '거위 시야', min: 0.5, max: 2, step: 0.25, modes: ['rt'] },
  { key: 'duckVision', label: '오리 시야', min: 0.5, max: 2.5, step: 0.25, modes: ['rt'] },
  { key: 'tasks', label: '임무 개수', min: 1, max: 10, step: 1, modes: ['rt'] },
  { key: 'emergency', label: '긴급회의 횟수', min: 0, max: 5, step: 1, modes: ['rt'] },
  { key: 'discussTime', label: '토론 시간(초)', min: 0, max: 120, step: 15, modes: ['rt'] },
  { key: 'voteTime', label: '투표 시간(초)', min: 15, max: 180, step: 15, modes: ['rt'] },
  { key: 'voiceRange', label: '근접 음성 거리', min: 3, max: 15, step: 1, modes: ['rt'] },
  { key: 'nightTime', label: '밤 시간(초)', min: 15, max: 90, step: 5, modes: ['turn'] },
  { key: 'dayTime', label: '낮 토론(초)', min: 30, max: 300, step: 15, modes: ['turn'] },
  { key: 'dayVoteTime', label: '낮 투표(초)', min: 15, max: 90, step: 5, modes: ['turn'] },
];
export const TOGGLE_DEFS = [
  { key: 'confirmEjects', label: '추방 시 정체 공개', modes: ['rt', 'turn'] },
  { key: 'anonVotes', label: '익명 투표', modes: ['rt', 'turn'] },
  { key: 'revealOnDeath', label: '죽은 사람 직업 공개', modes: ['turn'] },
  { key: 'lovers', label: '연인 (2명이 운명 공유)', modes: ['rt', 'turn'] },
];

// 역할 배정
export function assignRoles(playerIds, s) {
  const ids = shuffle([...playerIds]);
  const n = ids.length;
  const nDucks = maxDucks(n, s.ducks);
  const pick = (team) => {
    const arr = [];
    for (const [id, c] of Object.entries(s.roles)) {
      const r = ROLES[id];
      if (!r || r.team !== team || !r.modes.includes(s.mode)) continue;
      for (let i = 0; i < c; i++) arr.push(id);
    }
    return shuffle(arr);
  };
  const duckRoles = pick('duck').slice(0, nDucks);
  while (duckRoles.length < nDucks) duckRoles.push('duck');
  const rest = n - nDucks;
  const neutralRoles = pick('neutral').slice(0, Math.max(0, Math.min(rest - 2, Math.floor(n / 3))));
  const gooseSlots = rest - neutralRoles.length;
  const gooseRoles = pick('goose').slice(0, gooseSlots);
  while (gooseRoles.length < gooseSlots) gooseRoles.push('goose');
  const all = shuffle([...duckRoles, ...neutralRoles, ...gooseRoles]);
  const out = {};
  ids.forEach((id, i) => { out[id] = all[i]; });
  return out;
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// 인원 대비 오리 최대 수 (너무 많으면 시작하자마자 끝남)
export function maxDucks(n, want = 99) { return Math.max(1, Math.min(want, Math.floor((n - 1) / 3) || 1)); }
