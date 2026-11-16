// 한국어 조사 자동 선택: J('방장','이') -> '방장이', J('거위','이') -> '거위가'
export function J(word, p) {
  word = String(word);
  const c = word.charCodeAt(word.length - 1);
  let has = null;
  if (c >= 0xac00 && c <= 0xd7a3) has = (c - 0xac00) % 28 !== 0;
  else if (/[0-9]$/.test(word)) has = /[013678]$/.test(word);
  const pairs = { '을': ['을', '를'], '이': ['이', '가'], '은': ['은', '는'], '으로': ['으로', '로'], '과': ['과', '와'] };
  const [a, b] = pairs[p];
  if (has === null) return word + a + '(' + b + ')';
  if (p === '으로' && c >= 0xac00 && (c - 0xac00) % 28 === 8) return word + '로';
  return word + (has ? a : b);
}
