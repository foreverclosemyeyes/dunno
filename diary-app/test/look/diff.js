// snap.js 로 찍은 두 결과를 비교: 요소가 생기거나 없어졌는지, 계산된 모양 값이 달라졌는지 센다.
const fs = require('fs'); const a = JSON.parse(fs.readFileSync(process.argv[2])), b = JSON.parse(fs.readFileSync(process.argv[3]));
let n = 0; const seen = new Map();
for (const st of Object.keys(a)) {
  const A = a[st], B = b[st] || {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (!A[k] || !B[k]) { n++; if (n <= 12) console.log(`[${st}] element only in ${A[k] ? 'before' : 'after'}: ${k.split('>').slice(-3).join('>')}`); continue; }
    for (const p of Object.keys(A[k])) if (A[k][p] !== B[k][p]) { n++; const sig = k.split('>').slice(-2).join('>') + ' ' + p; seen.set(sig, (seen.get(sig) || 0) + 1); if (seen.get(sig) === 1 && seen.size <= 40) console.log(`[${st}] ${k.split('>').slice(-3).join('>')}  ${p}: ${String(A[k][p]).slice(0, 60)} -> ${String(B[k][p]).slice(0, 60)}`); }
  }
}
console.log('TOTAL DIFFS', n, 'distinct', seen.size);
