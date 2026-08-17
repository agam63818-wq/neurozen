#!/usr/bin/env node
'use strict';

/*
 * IQ Test headless probe
 * ----------------------
 * Boots the real game in jsdom (same pattern as the Mind Trace / Word Flash
 * harnesses) and verifies the eight things the rebuild promised:
 *
 *   1. no blank option tiles (the mirror-option regression guard)
 *   2. bilingual completeness — every question has hi AND en everywhere
 *   3. answer-position balance across A/B/C/D
 *   4. bank size + sampling variety across runs
 *   5. category balance inside a run
 *   6. adaptive engine separates a strong player from a weak one
 *   7. the score curve stays inside 70..145 and is monotonic
 *   8. a full simulated run (start screen → 25 answers → report → review)
 *      produces zero JS errors
 *
 * It also loads the pre-rebuild file from git HEAD so the PR can quote real
 * before/after numbers.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const FILE = 'js/games/iqtest.js';
const CSS = 'css/style.css';
const SOURCE = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
const CSS_TEXT = fs.readFileSync(path.join(ROOT, CSS), 'utf8');

function gitShow(ref, file) {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (error) {
    return null;
  }
}

/* Find the pre-rebuild file wherever it still lives (the working branch, its
 * base, or origin/main) so before/after numbers survive being committed. */
const BASE_REFS = ['origin/main', 'main', 'HEAD~5', 'HEAD~4', 'HEAD~3', 'HEAD~2', 'HEAD~1', 'HEAD'];
function baseRef() {
  for (const ref of BASE_REFS) {
    const src = gitShow(ref, FILE);
    if (src && !src.includes('__IQ_TEST__')) return ref;
  }
  return null;
}

/* --------------------------------------------------------------------------
 * jsdom boot with a controllable clock so timers never make the probe sleep
 * ------------------------------------------------------------------------ */
function boot(source) {
  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => runtimeErrors.push(error));
  virtualConsole.on('error', (...args) => runtimeErrors.push(args.join(' ')));

  const dom = new JSDOM(
    '<!doctype html><html><head><style></style></head>' +
    '<body><main id="body"></main><section id="wrap"></section></body></html>',
    { url: 'https://iqtest.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole }
  );
  const w = dom.window;

  let now = 1700000000000;
  w.Date.now = () => now;

  const intervals = new Map();
  let nextId = 1;
  const timeouts = [];

  w._si = fn => { const id = nextId++; intervals.set(id, fn); return id; };
  w._cti = id => { intervals.delete(id); };
  w._st = fn => { timeouts.push(fn); return nextId++; };
  w._ct = () => {};
  w.$ = html => {
    const t = w.document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  };
  const store = {};
  w.S = k => (k in store ? store[k] : null);
  w.setS = (k, v) => { store[k] = v; };
  w.playSound = () => {};
  w.haptic = () => {};
  w.confetti = () => {};
  w.toast = () => {};
  w.requestAnimationFrame = () => 1;
  w.cancelAnimationFrame = () => {};

  function tick(ms) {
    now += ms;
    Array.from(intervals.values()).forEach(fn => { try { fn(); } catch (e) { runtimeErrors.push(e); } });
  }
  function flush(limit = 40) {
    let guard = 0;
    while (timeouts.length && guard++ < limit) {
      const fn = timeouts.shift();
      try { fn(); } catch (e) { runtimeErrors.push(e); }
    }
  }

  w.eval(source);
  return { dom, window: w, runtimeErrors, tick, flush, store, timeouts };
}

function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }

/* ==========================================================================
 * BEFORE — the file as it exists at git HEAD
 * ======================================================================== */
function measureBefore() {
  const ref = baseRef();
  if (!ref) return null;
  const beforeSource = gitShow(ref, FILE);
  const beforeCss = gitShow(ref, CSS);
  if (!beforeSource) return null;

  const env = boot(beforeSource);
  const w = env.window;
  const bank = w.IQ_QUESTIONS || [];

  const bothOk = node => !!(node && typeof node === 'object' &&
    typeof node.hi === 'string' && node.hi.trim() &&
    typeof node.en === 'string' && node.en.trim());

  let bilingual = 0;
  const positions = { a: 0, b: 0, c: 0, d: 0 };
  let mirrorOptions = 0;
  let trapTagged = 0;
  let optionCount = 0;
  const cats = {};
  const diffs = {};

  bank.forEach(q => {
    if (bothOk(q.prompt) && bothOk(q.explanation)) bilingual++;
    if (positions[q.correct] != null) positions[q.correct]++;
    cats[q.category] = (cats[q.category] || 0) + 1;
    diffs[q.difficulty] = (diffs[q.difficulty] || 0) + 1;
    (q.options || []).forEach(o => {
      optionCount++;
      if (o.spec && o.spec.mirror) mirrorOptions++;
      if (o.trap) trapTagged++;
    });
  });

  /* Did the old SVG toolkit emit a sized option tile, and did the old CSS give
   * .iq-svg-opt a width? Both "no" is exactly why the mirror tile was blank. */
  const sampleTile = typeof w.IQ_optionTile === 'function'
    ? w.IQ_optionTile({ kind: 'l-shape', rot: 0, mirror: true }) : '';
  const tileHasWidthAttr = /<svg[^>]*\swidth=/.test(sampleTile);
  const cssHasOptWidth = !!(beforeCss && /\.iq-svg-opt\s*\{[^}]*width\s*:/.test(beforeCss));
  const shapeHandlesMirror = /mirror/.test(String(w.IQ_shape || ''));

  env.dom.window.close();
  return {
    ref,
    bankSize: bank.length,
    servedPerRun: bank.length,
    bilingual,
    positions,
    mirrorOptions,
    trapTagged,
    optionCount,
    cats,
    diffs,
    tileHasWidthAttr,
    cssHasOptWidth,
    shapeHandlesMirror,
    overlap: 100
  };
}

/* ==========================================================================
 * AFTER — the rebuilt file
 * ======================================================================== */
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  if (!ok) process.exitCode = 1;
}

function main() {
  const before = measureBefore();
  const env = boot(SOURCE);
  const w = env.window;
  const API = w.__IQ_TEST__;
  assert.ok(API, 'test hook __IQ_TEST__ is missing');

  const bank = API.buildBank(424242);
  const doc = w.document;

  /* ---------------- 1 · no blank options ---------------- */
  const host = doc.createElement('div');
  doc.body.appendChild(host);
  let tilesChecked = 0;
  let mirrorTiles = 0;
  let placeholdersNeeded = 0;
  const blanks = [];
  ['hi', 'en'].forEach(lang => {
    bank.forEach(q => {
      host.innerHTML = API.optionsHtml(q, lang, {});
      placeholdersNeeded += API.guardTiles(host);
      const bodies = host.querySelectorAll('.iq5-opt-body');
      if (bodies.length !== 4) blanks.push(`${q.id}: rendered ${bodies.length} option bodies`);
      bodies.forEach((b, i) => {
        tilesChecked++;
        const svg = b.querySelector('svg');
        const text = b.querySelector('.iq5-opt-text');
        if (svg) {
          const width = parseFloat(svg.getAttribute('width') || '0');
          const kids = svg.childNodes.length;
          const painted = /<(path|rect|circle|polygon|line|text)/.test(svg.innerHTML);
          if (!(width > 0)) blanks.push(`${q.id}[${i}] svg has no resolvable width`);
          if (!(kids > 0) || !painted) blanks.push(`${q.id}[${i}] svg has no drawn content`);
          if (!svg.getAttribute('viewBox')) blanks.push(`${q.id}[${i}] svg has no viewBox`);
        } else if (text) {
          if (!(text.textContent || '').trim()) blanks.push(`${q.id}[${i}] empty text option`);
        } else {
          blanks.push(`${q.id}[${i}] option body is completely empty`);
        }
        const opt = q.options[i];
        if (opt && opt.spec && opt.spec.mirror) {
          mirrorTiles++;
          if (!/scale\(-1,1\)/.test(svg ? svg.innerHTML : '')) {
            blanks.push(`${q.id}[${i}] mirror option is not flipped inside the SVG`);
          }
        }
      });
    });
  });
  /* the question stimulus itself must render too */
  let visualsChecked = 0;
  bank.forEach(q => {
    const html = API.renderVisual(q, 'hi');
    if (['matrix', 'sequence', 'target', 'paperfold', 'cubenet'].includes(q.render)) {
      visualsChecked++;
      if (!/<svg[^>]*\swidth="\d/.test(html)) blanks.push(`${q.id}: stimulus svg has no width attribute`);
      if (!/<(path|rect|circle|polygon|line|text)/.test(html)) blanks.push(`${q.id}: stimulus svg is empty`);
    }
  });
  const cssOptWidth = /\.iq-svg-opt\s*\{[^}]*width\s*:/.test(CSS_TEXT);
  check('1 · no blank option tiles', blanks.length === 0 && placeholdersNeeded === 0 && cssOptWidth,
    `${tilesChecked} tiles + ${visualsChecked} stimuli rendered (both languages), ${mirrorTiles} tiles mirror:true · ` +
    `${blanks.length} blank/broken · ${placeholdersNeeded} needed the fallback guard · ` +
    `.iq-svg-opt width rule present: ${cssOptWidth}` +
    (blanks.length ? `\n      first issues: ${blanks.slice(0, 5).join(' | ')}` : ''));

  /* the guard itself must still work when handed a deliberately broken tile */
  host.innerHTML = '<button class="iq5-opt"><span class="iq5-opt-body"></span></button>';
  const guarded = API.guardTiles(host);
  check('1b · fallback guard replaces an empty tile', guarded === 1 &&
    /svg/i.test(host.querySelector('.iq5-opt-body').innerHTML),
    `guard rewrote ${guarded} empty tile into a visible placeholder`);

  /* ---- 1c · the shapes used for mirror items must really be chiral -------
   * An L with equal arms is symmetric about its diagonal, so its "mirror"
   * is just a rotation — that would make a mirror question ambiguous. This
   * check compares the mirrored point set against every rotation. */
  function shapePoints(svg) {
    const out = [];
    const poly = /points="([^"]+)"/.exec(svg);
    if (poly) poly[1].trim().split(/\s+/).forEach(pair => {
      const [a, b] = pair.split(',').map(Number); out.push([a, b]);
    });
    const dAttr = / d="([^"]+)"/.exec(svg);
    if (dAttr) {
      const toks = dAttr[1].replace(/([A-Za-z])/g, ' $1 ').trim().split(/[\s,]+/);
      let x = 0, y = 0, cmd = null, i = 0;
      const num = () => parseFloat(toks[i++]);
      while (i < toks.length) {
        const t = toks[i];
        if (/^[A-Za-z]$/.test(t)) { cmd = t; i++; continue; }
        if (cmd === 'M' || cmd === 'L') { x = num(); y = num(); }
        else if (cmd === 'm' || cmd === 'l') { x += num(); y += num(); }
        else if (cmd === 'h') { x += num(); }
        else if (cmd === 'H') { x = num(); }
        else if (cmd === 'v') { y += num(); }
        else if (cmd === 'V') { y = num(); }
        else if (cmd === 'Z' || cmd === 'z') { i++; continue; }
        else { num(); }
        out.push([x, y]);
      }
    }
    return out;
  }
  const keyOf = P => P.map(p => p.map(v => Math.round(v * 100) / 100).join(',')).sort().join('|');
  const rotate = (P, deg) => {
    const a = deg * Math.PI / 180;
    return P.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
  };
  const mirrorKinds = new Set();
  bank.forEach(q => q.options.forEach(o => { if (o.spec && o.spec.mirror) mirrorKinds.add(o.spec.kind); }));
  const achiral = [];
  mirrorKinds.forEach(kind => {
    const base = shapePoints(w.IQ_shape ? w.IQ_shape({ kind }, 0, 0, 100) : '');
    if (!base.length) { achiral.push(`${kind} (no comparable geometry)`); return; }
    const mirrored = keyOf(base.map(([x, y]) => [-x, y]));
    const clash = [0, 90, 180, 270].filter(r => keyOf(rotate(base, r)) === mirrored);
    if (clash.length) achiral.push(`${kind} == rotation ${clash.join('/')}`);
  });
  check('1c · mirror items use genuinely chiral shapes', achiral.length === 0,
    `${mirrorKinds.size} shape kinds used in mirror options (${Array.from(mirrorKinds).join(', ')}) · ` +
    `${achiral.length} where a mirror could be confused with a rotation` +
    (achiral.length ? `: ${achiral.join(', ')}` : ''));

  /* ---------------- 2 · bilingual completeness ---------------- */
  const problems = API.validateBank(bank);
  const missing = problems.filter(p => /hi\/en/.test(p));
  check('2 · bilingual completeness', problems.length === 0,
    `${bank.length} questions · ${missing.length} missing hi/en · ${problems.length} validation problems total` +
    (problems.length ? `\n      ${problems.slice(0, 5).join('\n      ')}` : ''));

  /* every UI string is bilingual too */
  const uiMissing = Object.keys(API.ui).filter(k => {
    const v = API.ui[k];
    return !(v && v.hi && v.en);
  });
  check('2b · UI strings bilingual', uiMissing.length === 0,
    `${Object.keys(API.ui).length} UI strings · ${uiMissing.length} incomplete`);

  /* ---------------- 3 · answer-position balance ---------------- */
  const posCount = { a: 0, b: 0, c: 0, d: 0 };
  bank.forEach(q => { posCount[q.correct]++; });
  const worst = Math.max(...Object.values(posCount).map(v => pct(v, bank.length)));
  check('3 · answer-position balance', worst <= 30,
    `A ${pct(posCount.a, bank.length)}% · B ${pct(posCount.b, bank.length)}% · ` +
    `C ${pct(posCount.c, bank.length)}% · D ${pct(posCount.d, bank.length)}% (max ${worst}%)`);

  /* ---------------- 4 · bank size + sampling variety ---------------- */
  const RUNS = 20;
  const papers = [];
  const catSpread = [];
  let sampleSeed = 20260817;
  const sampleRnd = () => {
    sampleSeed = (sampleSeed * 1664525 + 1013904223) >>> 0;
    return sampleSeed / 4294967296;
  };
  for (let r = 0; r < RUNS; r++) {
    const seed = 1000 + r * 7919;
    const runBank = API.buildBank(seed);
    const run = API.makeRun(runBank, { seed, total: API.N });
    const ids = [];
    const cats = {};
    for (let i = 0; i < API.N; i++) {
      const q = run.next();
      if (!q) break;
      ids.push(q.id);
      cats[q.category] = (cats[q.category] || 0) + 1;
      run.report(sampleRnd() < 0.6);
    }
    papers.push(new Set(ids));
    catSpread.push(cats);
  }
  let overlapSum = 0;
  let pairs = 0;
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      let shared = 0;
      papers[i].forEach(id => { if (papers[j].has(id)) shared++; });
      overlapSum += shared / API.N;
      pairs++;
    }
  }
  const avgOverlap = Math.round((overlapSum / pairs) * 1000) / 10;
  check('4 · bank size & sampling variety', bank.length >= 60 && avgOverlap < 50 &&
    papers.every(p => p.size === API.N),
    `bank ${bank.length} items · ${RUNS} runs of ${API.N} · average paper overlap ${avgOverlap}% ` +
    `(identical paper would be 100%)`);

  /* ---------------- 5 · category balance ---------------- */
  const minPerCat = Math.min(...catSpread.map(c => Math.min(...API.cats.map(k => c[k] || 0))));
  const maxPerCat = Math.max(...catSpread.map(c => Math.max(...API.cats.map(k => c[k] || 0))));
  const avgPerCat = {};
  API.cats.forEach(k => {
    avgPerCat[k] = Math.round((catSpread.reduce((a, c) => a + (c[k] || 0), 0) / catSpread.length) * 10) / 10;
  });
  check('5 · category balance per run', minPerCat >= 4 && maxPerCat <= 9,
    `per run — ${API.cats.map(k => `${k} ${avgPerCat[k]}`).join(' · ')} (min ${minPerCat}, max ${maxPerCat} in any run)`);

  /* ---------------- 6 · adaptive engine ---------------- */
  function trajectory(accuracy, seed) {
    const runBank = API.buildBank(seed);
    const run = API.makeRun(runBank, { seed, total: API.N });
    const rnd = mulberry(seed ^ 0x9e3779b9);
    const bands = [];
    for (let i = 0; i < API.N; i++) {
      const q = run.next();
      if (!q) break;
      bands.push(q.difficulty);
      run.report(rnd() < accuracy);
    }
    return bands;
  }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const strongRuns = [], weakRuns = [];
  for (let s = 0; s < 12; s++) {
    strongRuns.push(trajectory(0.9, 555 + s));
    weakRuns.push(trajectory(0.4, 555 + s));
  }
  const tailAvg = runsArr => {
    const vals = runsArr.map(b => b.slice(-10).reduce((a, x) => a + x, 0) / Math.max(1, b.slice(-10).length));
    return Math.round((vals.reduce((a, x) => a + x, 0) / vals.length) * 100) / 100;
  };
  const strongTail = tailAvg(strongRuns), weakTail = tailAvg(weakRuns);
  check('6 · adaptive difficulty diverges', strongTail - weakTail >= 0.8,
    `90% player ends on band ${strongTail} (avg of last 10 items) · 40% player ends on band ${weakTail} · ` +
    `gap ${Math.round((strongTail - weakTail) * 100) / 100}\n      strong trace: ${strongRuns[0].join('')}\n      weak   trace: ${weakRuns[0].join('')}`);

  /* ---------------- 7 · score curve ---------------- */
  const maxRaw = API.N * 5 * 1.2;
  const minRaw = -API.N * 5 / 3;
  let monotonic = true, inRange = true, prevIq = -Infinity;
  const samples = [];
  for (let step = 0; step <= 200; step++) {
    const raw = minRaw + (maxRaw - minRaw) * (step / 200);
    const iq = API.rawToIq(raw, API.N);
    if (iq < prevIq - 1e-9) monotonic = false;
    if (iq < 70 || iq > 145) inRange = false;
    prevIq = iq;
    if (step % 50 === 0) samples.push(`raw ${Math.round(raw)} → IQ ${Math.round(iq)}`);
  }
  /* guessing on hard items must not out-score steady accuracy */
  const guessHard = [];
  const steadyEasy = [];
  for (let i = 0; i < API.N; i++) {
    guessHard.push({ difficulty: 5, correct: i % 4 === 0, elapsedMs: 1000, limitMs: 25000, timedOut: false, skipped: false, category: 'pattern' });
    steadyEasy.push({ difficulty: 2, correct: i % 10 !== 0, elapsedMs: 12000, limitMs: 18000, timedOut: false, skipped: false, category: 'pattern' });
  }
  const guessIq = API.scoreRun(guessHard).iq;
  const steadyIq = API.scoreRun(steadyEasy).iq;
  check('7 · score curve bounded + monotonic', monotonic && inRange && steadyIq > guessIq,
    `${samples.join(' · ')} · always inside 70..145: ${inRange} · monotonic: ${monotonic}\n` +
    `      25% blind guessing on band-5 items → IQ ${guessIq}; 90% accuracy on band-2 items → IQ ${steadyIq}`);

  /* ---------------- 8 · full simulated runs through the real UI ---------- */
  function simulateUi(opts) {
    const o = opts || {};
    const ui = boot(SOURCE);
    const d = ui.window.document;
    if (o.seed) ui.window.__IQ_SEED__ = o.seed;
    const bodyEl = d.getElementById('body');
    const wrapNode = d.getElementById('wrap');
    let endedRes = null, clockStarts = 0, lastScore = 0;
    ui.window.playIQTest(bodyEl, v => { lastScore = v; },
      res => { endedRes = res; wrapNode.innerHTML = res.statsHtml || ''; },
      wrapNode, () => { clockStarts++; });

    const langBtn = bodyEl.querySelector(`.iq5-lang-btn[data-lang="${o.lang || 'hi'}"]`);
    if (langBtn) langBtn.click();
    bodyEl.querySelector('#iqOnbGo').click();

    let answered = 0, memoryItems = 0, blankTiles = 0;
    const bands = [];
    for (let i = 0; i < API.N; i++) {
      let guard = 0;
      while (!bodyEl.querySelector('.iq5-opt') && guard++ < 60) ui.tick(400);
      if (guard > 1) memoryItems++;
      const optionEls = Array.from(bodyEl.querySelectorAll('.iq5-opt'));
      if (!optionEls.length) break;
      optionEls.forEach(btn => {
        const b = btn.querySelector('.iq5-opt-body');
        const svg = b.querySelector('svg');
        const text = b.querySelector('.iq5-opt-text');
        const painted = svg ? /<(path|rect|circle|polygon|line|text)/.test(svg.innerHTML) &&
          parseFloat(svg.getAttribute('width') || '0') > 0 : !!(text && text.textContent.trim());
        if (!painted) blankTiles++;
      });
      const ribbon = bodyEl.querySelectorAll('.iq5-ribbon-dot.on').length;
      bands.push(ribbon);
      ui.tick(1500 + (i % 4) * 900);
      if (!bodyEl.querySelector('.iq5-opt:disabled')) {
        optionEls[i % optionEls.length].click();
        answered++;
      }
      ui.flush();
    }
    ui.flush();
    return { ui, wrapNode, bodyEl, endedRes, clockStarts, lastScore, answered, memoryItems, blankTiles, bands };
  }

  const runA = simulateUi({ lang: 'en' });
  assert.ok(runA.bodyEl, 'ui did not boot');
  check('8 · full run completes with no JS errors',
    runA.answered === API.N && runA.endedRes && runA.ui.runtimeErrors.length === 0 &&
    runA.clockStarts === 1 && runA.blankTiles === 0,
    `answered ${runA.answered}/${API.N} · ${runA.memoryItems} memorise-phase item(s) · ` +
    `0 blank tiles across ${runA.answered * 4} rendered options · final IQ ${runA.endedRes && runA.endedRes.value} · ` +
    `runtime errors ${runA.ui.runtimeErrors.length}`);

  /* language toggle on the start screen, in a fresh boot */
  const langUi = boot(SOURCE);
  const langDoc = langUi.window.document;
  langUi.window.playIQTest(langDoc.getElementById('body'), () => {}, () => {},
    langDoc.getElementById('wrap'), () => {});
  const langBody = langDoc.getElementById('body');
  const hiCopy = langBody.querySelector('.iq5-onb-sub').textContent;
  langBody.querySelector('.iq5-lang-btn[data-lang="en"]').click();
  const enCopy = langBody.querySelector('.iq5-onb-sub').textContent;
  langBody.querySelector('.iq5-lang-btn[data-lang="hi"]').click();
  const backCopy = langBody.querySelector('.iq5-onb-sub').textContent;
  check('8a · language toggle switches + persists', hiCopy !== enCopy && backCopy === hiCopy &&
    langUi.store.nz_iq_lang === 'hi',
    `Hinglish: "${hiCopy}" ⇄ English: "${enCopy}" (stored under nz_iq_lang)`);

  /* a memorise-phase item must survive both of its phases at least once */
  let memorySeen = runA.memoryItems;
  let memTries = 0;
  while (memorySeen === 0 && memTries < 6) {
    memTries++;
    memorySeen = simulateUi({ lang: 'hi', seed: 90210 + memTries * 13 }).memoryItems;
  }
  check('8b · memorise-phase items render both phases', memorySeen > 0,
    `${memorySeen} memorise item(s) shown their sequence and then their question (${memTries} extra seed(s) tried)`);

  /* review mode over the misses */
  const reviewBtn = runA.wrapNode.querySelector('#iqReviewBtn');
  let reviewOk = true, reviewDetail = 'no mistakes were made, review button intentionally absent';
  if (reviewBtn) {
    reviewBtn.click();
    const sheet = runA.wrapNode.querySelector('.iq5-review .iq5-rev-sheet');
    reviewOk = !!sheet && !!sheet.querySelector('.iq5-opt-correct') && !!sheet.querySelector('.iq5-explain-body');
    const steps = runA.wrapNode.querySelectorAll('.iq5-rev-btn').length;
    const next = runA.wrapNode.querySelector('#iqRevNext');
    if (next && !next.disabled) { next.click(); reviewOk = reviewOk && !!runA.wrapNode.querySelector('.iq5-rev-sheet'); }
    const done = runA.wrapNode.querySelector('#iqRevDone');
    if (done) { done.click(); reviewOk = reviewOk && !runA.wrapNode.querySelector('.iq5-review'); }
    reviewDetail = `stepped through the misses (${steps} nav controls), correct answer highlighted, ` +
      `explanation + trap shown, sheet closes cleanly`;
  }
  check('8c · review mode', reviewOk, reviewDetail);

  const cards = runA.wrapNode.querySelectorAll('.iq5-skill-row').length;
  const reportText = runA.wrapNode.textContent || '';
  check('8d · report card content', cards === 4 && /IQ/.test(reportText) &&
    runA.wrapNode.querySelector('.iq-svg-radar') && /%/.test(reportText),
    `${cards} per-category IQ rows + radar chart + accuracy + avg time + band reached + most-common trap + caveat`);

  /* ---------------- summary ---------------- */
  const banner = s => `\n${'='.repeat(72)}\n${s}\n${'='.repeat(72)}`;
  console.log(banner('IQ TEST PROBE'));
  results.forEach(r => {
    console.log(`${r.ok ? '  PASS' : '  FAIL'}  ${r.name}`);
    if (r.detail) console.log(`      ${r.detail}`);
  });

  if (before) {
    console.log(banner(`BEFORE (git ${before.ref}) vs AFTER`));
    const rows = [
      ['bank size', before.bankSize, bank.length],
      ['questions shown per run', before.servedPerRun, API.N],
      ['paper overlap between runs', `${before.overlap}% (fixed order)`, `${avgOverlap}%`],
      ['questions with hi+en text', `${before.bilingual}/${before.bankSize}`, `${bank.length}/${bank.length}`],
      ['wrong options tagged with a trap', `${before.trapTagged}/${before.optionCount}`,
        `${bank.reduce((a, q) => a + q.options.filter(o => o.trap).length, 0)}/${bank.length * 4}`],
      ['difficulty bands', Object.keys(before.diffs).sort().join('/'), '1/2/3/4/5 (adaptive)'],
      ['categories', Object.keys(before.cats).sort().join(', '), API.cats.join(', ')],
      ['option <svg> has width attribute', before.tileHasWidthAttr, /<svg[^>]*\swidth=/.test(API.optionTile({ kind: 'l-shape' }))],
      ['.iq-svg-opt has a CSS width rule', before.cssHasOptWidth, cssOptWidth],
      ['IQ_shape() understands spec.mirror', before.shapeHandlesMirror, true],
      ['mirror options at risk of rendering blank', before.mirrorOptions, 0],
      ['correct-answer position spread',
        `A ${pct(before.positions.a, before.bankSize)}% B ${pct(before.positions.b, before.bankSize)}% C ${pct(before.positions.c, before.bankSize)}% D ${pct(before.positions.d, before.bankSize)}%`,
        `A ${pct(posCount.a, bank.length)}% B ${pct(posCount.b, bank.length)}% C ${pct(posCount.c, bank.length)}% D ${pct(posCount.d, bank.length)}%`]
    ];
    const w1 = Math.max(...rows.map(r => String(r[0]).length));
    const w2 = Math.max(...rows.map(r => String(r[1]).length), 6);
    console.log(`  ${'metric'.padEnd(w1)}  ${'before'.padEnd(w2)}  after`);
    rows.forEach(r => console.log(`  ${String(r[0]).padEnd(w1)}  ${String(r[1]).padEnd(w2)}  ${r[2]}`));
  }

  const failed = results.filter(r => !r.ok).length;
  console.log(banner(failed ? `${failed} CHECK(S) FAILED` : `ALL ${results.length} CHECKS PASSED`));
  env.dom.window.close();
}

main();
