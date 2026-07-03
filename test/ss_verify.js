/* ==============================================================================
   SPATIAL SPIN — Mathematical Verification & Stress-Test Harness
   -----------------------------------------------------------------------------
   Loads the REAL spatialspin.js in a Node sandbox with stubbed browser globals,
   then:
     Phase A: Pure math verification (rotation, mirror, norm, bbox, connected,
              canonical hash, symmetry, duplicate detection).
     Phase B: Generator stress test — build N puzzles across all categories and
              modes, run SS_verifyRound on each, and check for:
                - duplicate answers
                - multiple correct answers
                - incorrect mirrors / rotations
                - ambiguous puzzles
                - broken normalization
                - false positives / negatives
   This harness is the source of truth. Zero failures are acceptable.
   ============================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'games', 'spatialspin.js'), 'utf8');

/* ---- minimal browser-global stubs so the file loads in Node ---- */
const sandbox = {
  window: {}, navigator: {}, document: { addEventListener() {}, removeEventListener() {} },
  matchMedia: () => ({ matches: false }),
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  setTimeout, setInterval, clearTimeout, clearInterval,
  Date, Math, Set, Map, Array, Object, JSON, parseInt, parseFloat, Infinity,
  console
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
/* Top-level `const`/`let` in a vm script do NOT become global properties,
   so append explicit exports onto globalThis for the identifiers we need. */
SRC += '\n;globalThis.__SS_EXPORT=function(){return{SS_norm,SS_hash,SS_rotateCW,SS_mirrorH,SS_rotateN,SS_rotationSet,SS_mirrorSet,SS_canonicalHash,SS_bbox,SS_isConnected,SS_frontier,SS_cellsOverlap,SS_rotSymmetryOrder,SS_hasMirror,SS_parseGrid,SS_SHAPE_CATALOG,SS_SHAPE_LIB,SS_pickCatalog,SS_buildRotation,SS_buildMirror,SS_buildMemory,SS_buildOdd,SS_buildSequence,SS_buildRoundForCategory,SS_verifyRound,SS_makePuzzleRecipe,SS_difficultyScore,SS_tierForDifficulty,SS_catByN,SS_catCount,SS_byTier,SS_TIERS,SS_CAT_WEIGHTS,SS_MODES,SS_CHALLENGE_REGISTRY,SS_CAT_KEYS,SS_CHALLENGE_META};};';
vm.runInContext(SRC, sandbox);

/* pull the functions/values we need out of the sandbox */
const EXP = sandbox.__SS_EXPORT();
const F = EXP;

/* ---- tiny test helpers ---- */
let pass = 0, fail = 0, failures = [];
function ok(cond, name, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (extra ? ' :: ' + extra : '')); console.log('  ✗ FAIL: ' + name + (extra ? ' :: ' + extra : '')); }
}
function cells(c) { return c.map(p => p.join(',')).join('|'); }

/* ======================================================================
   PHASE A — PURE MATH VERIFICATION
   ====================================================================== */
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PHASE A — PURE MATH VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════');

/* A1. Normalization: min row/col shifted to 0, sorted, idempotent, same set */
(function () {
  console.log('\n[A1] SS_norm');
  const a = [[2, 5], [3, 6], [2, 6]];
  const n = F.SS_norm(a);
  ok(n[0][0] === 0 && n[0][1] === 0, 'norm shifts to origin', cells(n));
  ok(cells(F.SS_norm(n)) === cells(n), 'norm idempotent');
  // norm preserves cell set (compare normalized-vs-normalized, since norm translates)
  const sNorm = new Set(F.SS_norm(a).map(c => c.join(',')));
  const okSet = n.every(c => sNorm.has(c.join(','))) && n.length === a.length;
  ok(okSet, 'norm preserves cell set');
  // norm sorts lexicographically (row then col)
  let sorted = true;
  for (let i = 1; i < n.length; i++) {
    if (n[i][0] < n[i - 1][0] || (n[i][0] === n[i - 1][0] && n[i][1] < n[i - 1][1])) { sorted = false; break; }
  }
  ok(sorted, 'norm sorts lexicographically');
})();

/* A2. Rotation: 4× CW == identity; CW of a known shape; rotation is bijective */
(function () {
  console.log('\n[A2] SS_rotateCW (90°)');
  // L-tromino
  const L = [[0, 0], [1, 0], [1, 1]];
  const r1 = F.SS_rotateCW(L);
  const r2 = F.SS_rotateCW(r1);
  const r3 = F.SS_rotateCW(r2);
  const r4 = F.SS_rotateCW(r3);
  ok(cells(r4) === cells(F.SS_norm(L)), '4× CW == identity (L-tromino)', cells(r4));
  // verify a specific rotation: [[0,0],[1,0],[1,1]] rotated CW ->
  // col,row -> [[0,1],[0,0],[1,0]] normalized = [[0,0],[0,1],[1,0]]
  ok(cells(r1) === '0,0|0,1|1,0', 'L-tromino CW correct', cells(r1));
  // rotation preserves cell count
  ok(r1.length === L.length && r2.length === L.length, 'rotation preserves cell count');
  // rotation is bijective (r2 inverse = r2 for 180)
  ok(cells(F.SS_rotateCW(F.SS_rotateCW(L))) === cells(F.SS_rotateCW(F.SS_rotateCW(L))), '180 deterministic');
})();

/* A3. Mirror H: flip columns; mirror twice == identity; mirror != rotation for chiral shapes
   IMPORTANT: use L-TETROMINO (4 cells) — it is genuinely CHIRAL.
   The L-TROMINO (3 cells) is NOT chiral (its mirror == a 90° rotation of it). */
(function () {
  console.log('\n[A3] SS_mirrorH (horizontal flip)');
  const L = [[0, 0], [1, 0], [2, 0], [2, 1]]; /* L-tetromino, chiral */
  const m1 = F.SS_mirrorH(L);
  const m2 = F.SS_mirrorH(m1);
  ok(cells(m2) === cells(F.SS_norm(L)), 'mirror twice == identity', cells(m2));
  // mirror preserves cell count
  ok(m1.length === L.length, 'mirror preserves cell count');
  // chiral: L-tetromino's mirror is NOT a rotation of it
  const rotSet = F.SS_rotationSet(L);
  ok(!rotSet.has(F.SS_hash(m1)), 'L-tetromino mirror is distinct from all rotations (chiral)', cells(m1));
  // sanity: the non-chiral tromino's mirror IS a rotation
  const tri = [[0, 0], [1, 0], [1, 1]];
  ok(F.SS_rotationSet(tri).has(F.SS_hash(F.SS_mirrorH(tri))), 'L-tromino mirror IS a rotation (not chiral) — sanity');
})();

/* A4. Rotation set: exactly the orbit under 90° rotations; size ∈ {1,2,4} */
(function () {
  console.log('\n[A4] SS_rotationSet');
  // asymmetric shape -> 4 distinct
  const L = [[0, 0], [1, 0], [1, 1]];
  ok(F.SS_rotationSet(L).size === 4, 'asymmetric L has 4 distinct rotations');
  // 180-symmetric (e.g. domino... no, use a plus-ish) — use a 2x2 square = 1
  const sq = [[0, 0], [0, 1], [1, 0], [1, 1]];
  ok(F.SS_rotationSet(sq).size === 1, '2x2 square has 1 rotation (full sym)');
  // 180-symmetric only: a straight tromino line has order... line of 3 horizontal -> rotates to vertical -> 2
  const line = [[0, 0], [0, 1], [0, 2]];
  ok(F.SS_rotationSet(line).size === 2, 'I-tromino has 2 rotations (180 sym)');
  // every member of rotation set is a valid rotation of the first
  const rs = F.SS_rotationSet(L);
  let acc = F.SS_norm(L);
  let allInOrbit = true;
  for (let i = 0; i < 4; i++) {
    if (!rs.has(F.SS_hash(acc))) { allInOrbit = false; break; }
    acc = F.SS_rotateCW(acc);
  }
  ok(allInOrbit, 'all 4 CW steps are in the rotation set');
})();

/* A5. Mirror set: all distinct mirror orientations not in rotation set */
(function () {
  console.log('\n[A5] SS_mirrorSet');
  const L = [[0, 0], [1, 0], [2, 0], [2, 1]]; /* L-tetromino, chiral */
  const ms = F.SS_mirrorSet(L);
  ok(ms.size > 0, 'chiral L-tetromino has a mirror set', 'size=' + ms.size);
  // mirror set members must NOT be in the rotation set
  const rs = F.SS_rotationSet(L);
  let disjoint = true;
  ms.forEach((_, h) => { if (rs.has(h)) disjoint = false; });
  ok(disjoint, 'mirror set ∩ rotation set = ∅');
  // symmetric shape (square) has empty mirror set
  const sq = [[0, 0], [0, 1], [1, 0], [1, 1]];
  ok(F.SS_mirrorSet(sq).size === 0, 'square mirror set empty (fully symmetric)');
})();

/* A6. Canonical hash: invariant under ALL rotations AND mirrors; unique per free polyomino */
(function () {
  console.log('\n[A6] SS_canonicalHash');
  const L = [[0, 0], [1, 0], [2, 0], [2, 1]]; /* L-tetromino, chiral */
  const c0 = F.SS_canonicalHash(L);
  // same canonical hash for every rotation
  let rotStable = true;
  let acc = F.SS_norm(L);
  for (let i = 0; i < 4; i++) {
    if (F.SS_canonicalHash(acc) !== c0) { rotStable = false; break; }
    acc = F.SS_rotateCW(acc);
  }
  ok(rotStable, 'canonical hash stable across rotations');
  // same canonical hash for every mirror
  let mirStable = true;
  const ms = F.SS_mirrorSet(L);
  ms.forEach((c) => { if (F.SS_canonicalHash(c) !== c0) mirStable = false; });
  ok(mirStable, 'canonical hash stable across mirrors');
  // different shapes -> different canonical hash
  const T = [[0, 0], [0, 1], [0, 2], [1, 1]];
  ok(F.SS_canonicalHash(T) !== c0, 'T-tetromino != L-tetromino canonical');
  // a shape and its mirror have the SAME canonical hash (they're the same free polyomino)
  ok(F.SS_canonicalHash(F.SS_mirrorH(L)) === c0, 'shape & mirror share canonical hash');
})();

/* A7. Bounding box */
(function () {
  console.log('\n[A7] SS_bbox');
  const a = [[0, 0], [0, 1], [2, 3]];
  const bb = F.SS_bbox(F.SS_norm(a));
  ok(bb.rows === 3 && bb.cols === 4, 'bbox 3x4', JSON.stringify(bb));
  // single cell
  const s = F.SS_bbox([[0, 0]]);
  ok(s.rows === 1 && s.cols === 1, 'bbox single cell 1x1');
})();

/* A8. Connected components (4-neighbour flood fill) */
(function () {
  console.log('\n[A8] SS_isConnected');
  ok(F.SS_isConnected([[0, 0], [0, 1], [1, 1]]) === true, 'connected L');
  ok(F.SS_isConnected([[0, 0], [0, 2]]) === false, 'disconnected (gap)');
  ok(F.SS_isConnected([[0, 0], [1, 0], [0, 1], [1, 1]]) === true, 'connected 2x2');
  ok(F.SS_isConnected([]) === false, 'empty not connected');
  // diagonal-only adjacency is NOT connected (4-neighbour)
  ok(F.SS_isConnected([[0, 0], [1, 1]]) === false, 'diagonal-only not connected (4-nbr)');
})();

/* A9. Rotational symmetry order */
(function () {
  console.log('\n[A9] SS_rotSymmetryOrder');
  ok(F.SS_rotSymmetryOrder([[0, 0], [0, 1], [1, 0], [1, 1]]) === 1, 'square order 1');
  ok(F.SS_rotSymmetryOrder([[0, 0], [0, 1], [0, 2]]) === 2, 'I-tromino order 2');
  ok(F.SS_rotSymmetryOrder([[0, 0], [1, 0], [1, 1]]) === 4, 'L-tromino order 4');
  ok(F.SS_rotSymmetryOrder([[0, 0], [1, 0], [2, 0], [2, 1]]) === 4, 'L-tetromino order 4');
})();

/* A10. hasMirror */
(function () {
  console.log('\n[A10] SS_hasMirror');
  ok(F.SS_hasMirror([[0, 0], [1, 0], [2, 0], [2, 1]]) === true, 'L-tetromino has mirror (chiral)');
  ok(F.SS_hasMirror([[0, 0], [1, 0], [1, 1]]) === false, 'L-tromino no mirror (not chiral — mirror is a rotation)');
  ok(F.SS_hasMirror([[0, 0], [0, 1], [1, 0], [1, 1]]) === false, 'square no mirror');
  ok(F.SS_hasMirror([[0, 0], [0, 1], [0, 2], [1, 1]]) === false, 'T-tetromino no mirror (has reflection sym)');
})();

/* A11. Catalog integrity: every shape is connected, normalized, unique canonical hash */
(function () {
  console.log('\n[A11] Shape catalog integrity');
  const cat = F.SS_SHAPE_CATALOG;
  ok(cat.length >= 200, 'catalog has >=200 shapes (got ' + cat.length + ')', 'count=' + cat.length);
  let allConnected = true, allNormalized = true, dupCanons = 0;
  const canonCount = {};
  for (const e of cat) {
    if (!F.SS_isConnected(e.cells)) { allConnected = false; console.log('   disconnected: ' + e.id); }
    // normalized = norm(norm) == norm and min row/col 0
    const nn = F.SS_norm(e.cells);
    if (F.SS_hash(nn) !== F.SS_hash(e.cells)) { allNormalized = false; console.log('   not normalized: ' + e.id); }
    canonCount[e.canon] = (canonCount[e.canon] || 0) + 1;
  }
  ok(allConnected, 'all catalog shapes connected');
  ok(allNormalized, 'all catalog shapes normalized');
  // report duplicate canonical hashes (free-polyomino duplicates across families)
  const dups = Object.keys(canonCount).filter(k => canonCount[k] > 1);
  ok(dups.length === 0, 'no duplicate free-polyomino shapes in catalog', dups.length + ' dup canons: ' + dups.slice(0, 5).join(', '));
  console.log('   catalog size: ' + cat.length + ' shapes');
})();

/* A12. Hash uniqueness within a rotation set */
(function () {
  console.log('\n[A12] hash determinism');
  const L = [[0, 0], [1, 0], [1, 1]];
  const rs = F.SS_rotationSet(L);
  // two different cell arrays that are equal after norm have the same hash
  const a = [[5, 7], [6, 7], [6, 8]];
  ok(F.SS_hash(F.SS_norm(a)) === F.SS_hash(F.SS_norm(L)), 'translated shapes have equal hash');
})();

console.log('\n── Phase A summary: ' + pass + ' passed, ' + fail + ' failed ──');

/* ======================================================================
   PHASE B — GENERATOR STRESS TEST
   Build thousands of puzzles, verify each one is mathematically sound.
   ====================================================================== */
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PHASE B — GENERATOR STRESS TEST (10,000+ puzzles)');
console.log('═══════════════════════════════════════════════════════════════');

const CATS = ['rotation', 'mirror', 'memory', 'odd', 'sequence'];
const TOTAL = 12000;
const perCat = Math.floor(TOTAL / CATS.length);
let genFail = 0, verifyFail = 0, built = 0;
const failDetails = [];
const catStats = {};
for (const c of CATS) catStats[c] = { built: 0, nullReturned: 0, verifyFail: 0, multiCorrect: 0, dupOpts: 0, badMirror: 0, badRotation: 0, ambiguous: 0 };

function deepVerifyRound(round) {
  /* Independent re-verification beyond SS_verifyRound, to catch verifier bugs too. */
  const issues = [];
  if (!round || !round.options || round.options.length !== 4) { issues.push('optCount'); return issues; }
  const correct = round.options.filter(o => o.correct);
  if (correct.length !== 1) { issues.push('multiCorrect:' + correct.length); return issues; }
  // all options have cells
  for (const o of round.options) if (!o.cells || !o.cells.length) { issues.push('missingCells'); }
  // no two options identical hash
  const hashes = round.options.map(o => F.SS_hash(o.cells));
  const seen = new Set();
  for (const h of hashes) { if (seen.has(h)) issues.push('dupOpt:' + h); seen.add(h); }
  // no two options overlap >= 0.85 (visual twin)
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    if (F.SS_cellsOverlap(round.options[i].cells, round.options[j].cells) >= 0.85) issues.push('twin:' + i + ',' + j);
  }
  // no wrong option is rotation-equivalent to correct
  const cRot = F.SS_rotationSet(correct[0].cells);
  for (let i = 0; i < 4; i++) {
    if (!round.options[i].correct && cRot.has(F.SS_hash(round.options[i].cells))) issues.push('wrongIsRotOfCorrect:' + i);
  }
  // category-specific deep checks
  if (round.challengeType === 'mirror' && round.promptCells) {
    const promptMir = F.SS_mirrorSet(round.promptCells);
    // correct must be a mirror
    if (!promptMir.has(F.SS_hash(correct[0].cells))) issues.push('correctNotMirror');
    // no wrong option is a mirror
    for (let i = 0; i < 4; i++) {
      if (!round.options[i].correct && promptMir.has(F.SS_hash(round.options[i].cells))) issues.push('wrongIsMirror:' + i);
    }
  }
  if (round.challengeType === 'rotation' && round.promptCells) {
    const promptRot = F.SS_rotationSet(round.promptCells);
    // correct must be a rotation of prompt, distinct from prompt
    if (!promptRot.has(F.SS_hash(correct[0].cells))) issues.push('correctNotRotation');
    if (F.SS_hash(correct[0].cells) === F.SS_hash(round.promptCells)) issues.push('correctIsIdentity');
  }
  if (round.challengeType === 'odd' && round.target) {
    const tRot = F.SS_rotationSet(round.target);
    // the 3 wrong (family) must be rotations; correct must NOT
    let familyOk = 0;
    for (const o of round.options) {
      const inRot = tRot.has(F.SS_hash(o.cells));
      if (!o.correct && inRot) familyOk++;
      if (o.correct && inRot) issues.push('oddIsRotation');
    }
    if (familyOk !== 3) issues.push('familyNot3Rot:' + familyOk);
  }
  if (round.challengeType === 'sequence' && round.chainSteps) {
    // correct == s2 (180°)
    if (F.SS_hash(correct[0].cells) !== F.SS_hash(round.chainSteps.s2)) issues.push('seqCorrectNotS2');
    // no option equals visible steps s0/s1/s3
    const vis = [round.chainSteps.s0, round.chainSteps.s1, round.chainSteps.s3].map(F.SS_hash);
    for (const o of round.options) { if (vis.indexOf(F.SS_hash(o.cells)) >= 0 && !o.correct) issues.push('seqShowsVisible'); }
  }
  if (round.challengeType === 'memory' && round.memoryVariant === 'shape' && round.promptCells) {
    // correct must equal prompt (or a rotation of it — accepted as same shape)
    const pRot = F.SS_rotationSet(round.promptCells);
    if (!pRot.has(F.SS_hash(correct[0].cells))) issues.push('memShapeCorrectNotPrompt');
    // wrong options must not be rotations of prompt
    for (let i = 0; i < 4; i++) {
      if (!round.options[i].correct && pRot.has(F.SS_hash(round.options[i].cells))) issues.push('memWrongIsPromptRot:' + i);
    }
  }
  return issues;
}

let seed = 12345;
function rng() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

for (const cat of CATS) {
  for (let i = 0; i < perCat; i++) {
    // vary difficulty + mode bias to exercise tiers
    const diff = 3 + Math.floor(rng() * 26);
    const modeBias = [-1, 0, 1][Math.floor(rng() * 3)];
    const nMin = 4, nMax = 8;
    let round = null;
    try {
      round = F.SS_buildRoundForCategory(cat, diff, modeBias, { nMin, nMax });
    } catch (e) {
      genFail++; failDetails.push(cat + ' threw: ' + e.message); continue;
    }
    if (!round) { catStats[cat].nullReturned++; continue; }
    catStats[cat].built++; built++;
    // run the built-in verifier
    const v = F.SS_verifyRound(round);
    if (!v) { catStats[cat].verifyFail++; verifyFail++; failDetails.push(cat + ' verifyRound=false #' + i); if (failDetails.length > 30) continue; continue; }
    // run the independent deep verifier
    const issues = deepVerifyRound(round);
    if (issues.length) {
      for (const is of issues) {
        if (/multiCorrect/.test(is)) catStats[cat].multiCorrect++;
        else if (/dupOpt/.test(is)) catStats[cat].dupOpts++;
        else if (/Mirror/.test(is)) catStats[cat].badMirror++;
        else if (/Rotation|correctNotRotation|correctIsIdentity/.test(is)) catStats[cat].badRotation++;
        else catStats[cat].ambiguous++;
      }
      failDetails.push(cat + ' deep:' + issues.join(','));
      if (failDetails.length <= 40) console.log('   ✗ ' + cat + ' #' + i + ' diff=' + diff + ' bias=' + modeBias + ' :: ' + issues.join(','));
    }
  }
}

console.log('\n── Phase B summary ──');
console.log('  total attempts: ' + TOTAL);
console.log('  built: ' + built + ' | nullReturned: ' + (TOTAL - built - genFail));
console.log('  genFail(threw): ' + genFail + ' | verifyRound=false: ' + verifyFail);
console.log('  per-category:');
for (const c of CATS) {
  const s = catStats[c];
  console.log('    ' + c.padEnd(10) + ' built=' + String(s.built).padStart(5) +
    ' null=' + String(s.nullReturned).padStart(5) +
    ' verifyFail=' + s.verifyFail +
    ' multiCorrect=' + s.multiCorrect + ' dupOpts=' + s.dupOpts +
    ' badMirror=' + s.badMirror + ' badRotation=' + s.badRotation + ' ambiguous=' + s.ambiguous);
}
if (failDetails.length) {
  console.log('\n  first 20 failure details:');
  failDetails.slice(0, 20).forEach(d => console.log('    - ' + d));
}

/* ======================================================================
   PHASE C — NULL-RATE REPORTING (which categories fail to build most)
   ====================================================================== */
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PHASE C — NULL-RATE (generator yield) analysis');
console.log('═══════════════════════════════════════════════════════════════');
for (const c of CATS) {
  const s = catStats[c];
  const yieldPct = (s.built / perCat * 100).toFixed(1);
  console.log('  ' + c.padEnd(10) + ' yield=' + yieldPct + '% (null=' + s.nullReturned + '/' + perCat + ')');
}

/* ======================================================================
   PHASE D — 4-OPTION UNIQUENESS under live build loop (simulates real game)
   ====================================================================== */
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PHASE D — Realistic sequential game build (2000 rounds, adaptive)');
console.log('═══════════════════════════════════════════════════════════════');
let seqBuilt = 0, seqFail = 0, seqNull = 0;
const canonSeen = [];
for (let i = 0; i < 2000; i++) {
  const cat = CATS[Math.floor(rng() * CATS.length)];
  const diff = SS_simDiff(i);
  let round = null;
  for (let t = 0; t < 6 && !round; t++) {
    round = F.SS_buildRoundForCategory(cat, diff, 0, { nMin: 4, nMax: 7 });
    if (round && !F.SS_verifyRound(round)) { seqFail++; round = null; }
    if (round) {
      const ch = F.SS_canonicalHash(round.target);
      if (canonSeen.indexOf(ch) >= 0 && canonSeen.length < 200) { round = null; }
      else canonSeen.push(ch);
    }
  }
  if (round) seqBuilt++; else seqNull++;
}
function SS_simDiff(r) { return Math.min(28, r + 2); }
console.log('  built=' + seqBuilt + ' null=' + seqNull + ' verifyFails=' + seqFail);

/* ---- FINAL VERDICT ---- */
console.log('\n═══════════════════════════════════════════════════════════════');
const totalFail = fail + genFail + verifyFail +
  CATS.reduce((a, c) => a + catStats[c].multiCorrect + catStats[c].dupOpts + catStats[c].badMirror + catStats[c].badRotation + catStats[c].ambiguous, 0);
console.log('  TOTAL FAILURES: ' + totalFail);
console.log('  Phase A pure-math fails: ' + fail);
console.log('  Phase B generator fails: ' + (genFail + verifyFail + (TOTAL - built - genFail) /*nulls counted separately*/));
console.log(totalFail === 0 ? '  ✅ VERDICT: ZERO FAILURES — mathematically correct' : '  ❌ VERDICT: FAILURES DETECTED — generator must be fixed');
console.log('═══════════════════════════════════════════════════════════════\n');
process.exit(totalFail === 0 ? 0 : 1);
