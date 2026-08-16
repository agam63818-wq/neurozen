#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const FILE = 'js/games/wordflash.js';
const afterSource = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
let beforeSource;
try {
  beforeSource = execFileSync('git', ['show', `HEAD^:${FILE}`], {
    cwd: ROOT,
    encoding: 'utf8',
  });
} catch (error) {
  throw new Error('The before/after probe needs the pre-change file at HEAD^');
}

function loadModel(source) {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.__WF_MODEL__ = {
    tiers: [WF_T1, WF_T2, WF_T3],
    flashDuration: typeof WF_flashDuration === 'function' ? WF_flashDuration : null,
    answerDuration: typeof WF_answerDuration === 'function' ? WF_answerDuration : null,
    tierForRound: typeof WF_tierForRound === 'function' ? WF_tierForRound : null,
    decoyOptions: typeof WF_decoyOptions === 'function' ? WF_decoyOptions : null,
    validate: typeof WF_validateWordPools === 'function' ? WF_validateWordPools : null,
  };`, context, { filename:FILE });
  const model = context.__WF_MODEL__;
  model.tiers = model.tiers.map(pool => pool.map(group => [...group]));
  return model;
}

function levenshtein(a, b) {
  let row = Array.from({length:b.length + 1}, (_, i) => i);
  for (let i=1;i<=a.length;i++) {
    const next = [i];
    for (let j=1;j<=b.length;j++) {
      next[j] = Math.min(
        next[j-1] + 1,
        row[j] + 1,
        row[j-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
    }
    row = next;
  }
  return row[b.length];
}

function analyze(model) {
  let duplicateGroups = 0;
  let uniqueAnswerLengths = 0;
  let lengthMismatches = 0;
  const groupOwners = new Map();
  let sharedGroups = 0;
  const tierStats = model.tiers.map((pool, tierIndex) => {
    const minimumDistances = [];
    let totalLength = 0;
    pool.forEach(group => {
      if (new Set(group).size !== 4) duplicateGroups++;
      const answerLength = group[0].length;
      if (!group.slice(1).some(word => word.length === answerLength)) uniqueAnswerLengths++;
      lengthMismatches += group.slice(1)
        .filter(word => Math.abs(word.length - answerLength) > 1).length;
      totalLength += answerLength;
      minimumDistances.push(Math.min(...group.slice(1)
        .map(word => levenshtein(group[0], word))));
      const key = [...group].sort().join('\u0001');
      if (groupOwners.has(key) && groupOwners.get(key) !== tierIndex) sharedGroups++;
      else groupOwners.set(key, tierIndex);
    });
    const near = minimumDistances.filter(distance => distance <= 1).length;
    const distribution = {};
    minimumDistances.forEach(distance => {
      distribution[distance] = (distribution[distance] || 0) + 1;
    });
    return {
      groups:pool.length,
      avgLength:totalLength / pool.length,
      near,
      nearPct:near / pool.length * 100,
      avgMin:minimumDistances.reduce((sum, n) => sum + n, 0) / pool.length,
      distribution,
    };
  });
  return { duplicateGroups, uniqueAnswerLengths, lengthMismatches, sharedGroups, tierStats };
}

function oldTier(q) { return q < 5 ? 1 : q < 11 ? 2 : 3; }
function oldFlash(q, chars, decoy, blink) {
  const base = Math.max(450, 1400 - q * 25);
  const blinkMs = blink ? Math.max(280, base * 0.6) : base;
  return Math.round(decoy ? blinkMs * (blink ? 1.5 : 1.3) : blinkMs);
}
function afterModifiers(q, tier) {
  const blink = q >= 14 && (tier < 3 || q % 4 === 0);
  const decoy = q >= 9 && !(tier === 3 && blink);
  return { blink, decoy };
}
function afterFlashForChars(q, chars, blink) {
  const contentMs = 420 + chars * 85;
  return Math.round(Math.max(
    contentMs - Math.min(400, q * 12) - (blink ? 110 : 0),
    contentMs * 0.65,
    chars * 72
  ));
}
function averageAnswerLength(model, tier) {
  const pool = model.tiers[tier - 1];
  return pool.reduce((sum, group) => sum + group[0].length, 0) / pool.length;
}

function timingComparison(before, after) {
  const rounds = [1,7,11,16,26,31,40];
  return rounds.map(round => {
    const q = round - 1;
    const oldT = oldTier(q);
    const oldDecoy = q >= 7;
    const oldBlink = q >= 15;
    const oldChars = averageAnswerLength(before, oldT) * (oldDecoy ? 2 : 1);
    const oldMs = oldFlash(q, oldChars, oldDecoy, oldBlink);

    const newT = after.tierForRound(q, 0.5);
    const modifiers = afterModifiers(q, newT);
    const newChars = averageAnswerLength(after, newT) * (modifiers.decoy ? 2 : 1);
    const newMs = afterFlashForChars(q, newChars, modifiers.blink);
    return {
      round,
      before:`T${oldT} ${oldDecoy ? 'decoy' : 'single'}${oldBlink ? '+blink' : ''}`,
      beforeChars:oldChars,
      beforeMs:oldMs,
      beforeRate:oldMs / oldChars,
      after:`T${newT} ${modifiers.decoy ? 'decoy' : 'single'}${modifiers.blink ? '+blink' : ''}`,
      afterChars:newChars,
      afterMs:newMs,
      afterRate:newMs / newChars,
    };
  });
}

function possibleTiers(q) {
  const round = q + 1;
  if (round <= 4) return [1];
  if (round < 8) return [1,2];
  if (round <= 11) return [2];
  if (round < 16) return [2,3];
  return [3];
}

function exhaustiveTiming(after) {
  const rows = [];
  let overall = { rate:Infinity };
  for (let q=0;q<40;q++) {
    let worst = { rate:Infinity };
    for (const tier of possibleTiers(q)) {
      const targets = after.tiers[tier-1].map(group => group[0]);
      for (const first of targets) {
        function consider(scenario) {
          const ms = after.flashDuration(q, scenario.words, {
            blink:scenario.blink,
            type:scenario.type,
          });
          const chars = scenario.words.reduce((sum, word) => sum + word.length, 0);
          const candidate = { rate:ms/chars, ms, chars, tier, mode:scenario.mode };
          if (candidate.rate < worst.rate) worst = candidate;
          if (candidate.rate < overall.rate) overall = { ...candidate, round:q+1 };
        }
        consider({ words:[first], blink:false, type:false, mode:'single' });
        consider({ words:[first], blink:true, type:false, mode:'single+blink' });
        if (first.length <= 8) consider({ words:[first], blink:false, type:true, mode:'type' });
        for (const second of targets) {
          consider({ words:[first,second], blink:false, type:false, mode:'decoy' });
          consider({ words:[first,second], blink:true, type:false, mode:'decoy+blink' });
        }
      }
    }
    rows.push({ round:q+1, ...worst });
  }
  return { rows, overall };
}

function verifyMechanics(after) {
  // Every tier boundary and random branch obeys the two-modifier cap.
  let maxModifiers = 0;
  for (let q=0;q<40;q++) {
    for (const roll of [0,0.25,0.5,0.75,0.999999]) {
      const tier = after.tierForRound(q, roll);
      const { blink, decoy } = afterModifiers(q, tier);
      const type = q >= 4 && !decoy && !blink;
      maxModifiers = Math.max(maxModifiers,
        (tier === 3 ? 1 : 0) + (blink ? 1 : 0) + (decoy ? 1 : 0) + (type ? 1 : 0));
    }
  }
  assert(maxModifiers <= 2, `modifier cap reached ${maxModifiers}`);

  // Decoy options remain distinct, retain the answer, and import the other
  // flashed word (or another word from that group if it already exists).
  for (let tier=0;tier<after.tiers.length;tier++) {
    const pool = after.tiers[tier];
    for (let i=0;i<pool.length;i++) {
      const ask = pool[i];
      const other = pool[(i+1)%pool.length];
      const options = after.decoyOptions(ask, other, 0.5);
      assert.equal(options.length, 4);
      assert.equal(new Set(options).size, 4);
      assert(options.includes(ask[0]));
      assert(options.slice(1).some(word => word.length === ask[0].length));
      assert(options.some(word => other.includes(word)));
    }
  }
  return maxModifiers;
}

function installFakeTimers(window, errors) {
  let now = 0;
  let id = 1;
  const timers = new Map();
  window.Date.now = () => now;
  window.setTimeout = (fn, delay = 0) => {
    const timerId = id++;
    timers.set(timerId, { fn, at:now + Number(delay || 0), timerId });
    return timerId;
  };
  window.clearTimeout = timerId => timers.delete(timerId);
  window.requestAnimationFrame = fn => { try { fn(now); } catch (error) { errors.push(error); } return 0; };
  window.cancelAnimationFrame = () => {};
  return {
    runNext() {
      if (!timers.size) return false;
      const timer = [...timers.values()].sort((a,b) => a.at-b.at || a.timerId-b.timerId)[0];
      timers.delete(timer.timerId);
      now = timer.at;
      try { timer.fn(); } catch (error) { errors.push(error); }
      return true;
    },
    size:() => timers.size,
  };
}

function simulatedRun(source) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  virtualConsole.on('error', error => errors.push(error));
  const dom = new JSDOM('<!doctype html><body><main id="body"></main><section id="wrap"></section></body>', {
    url:'https://wordflash.test/',
    runScripts:'outside-only',
    pretendToBeVisual:true,
    virtualConsole,
  });
  const { window } = dom;
  const timers = installFakeTimers(window, errors);
  const saved = new Map();
  let seed = 0x12345678;
  window.Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  window.$ = html => {
    const template = window.document.createElement('template');
    template.innerHTML = String(html).trim();
    return template.content.firstElementChild;
  };
  window.S = key => saved.get(key) || 0;
  window.setS = (key, value) => saved.set(key, value);
  window.playSound = () => {};
  window.haptic = () => {};
  window.toast = () => {};
  window.showCombo = () => {};
  window.confetti = () => {};
  window._st = (fn, ms) => window.setTimeout(fn, ms);
  window.__WORDFLASH_TEST__ = {};
  window.HTMLElement.prototype.getBoundingClientRect = () => ({
    left:0, top:0, right:100, bottom:40, width:100, height:40, x:0, y:0,
  });

  window.eval(source);
  assert.equal(typeof window.playWordFlash, 'function');
  const body = window.document.getElementById('body');
  const wrap = window.document.getElementById('wrap');
  let score = 0;
  let endResult = null;
  let clockStarts = 0;
  window.playWordFlash(body, value => { score = value; }, result => { endResult = result; }, wrap, () => { clockStarts++; });
  body.querySelector('#wfStart').click();

  let guard = 0;
  let selectAnswers = 0;
  let typeAnswers = 0;
  let wrongRevealTested = false;
  let reachedRound31 = false;
  while (!endResult && guard++ < 22000) {
    const state = window.__WORDFLASH_TEST__.getState();
    if (state.q >= 31) reachedRound31 = true;
    if (!state.answerTimedOut) {
      if (state.currentMode === 'select') {
        const buttons = [...body.querySelectorAll('.word-opt')].filter(option => !option.disabled);
        const button = buttons.find(option => option.dataset.w === state.currentAskWord);
        if (button) {
          if (!wrongRevealTested || state.q >= 31) {
            const wrong = buttons.find(option => option.dataset.w !== state.currentAskWord);
            wrong.click();
            if (!wrongRevealTested) {
              const reveal = body.querySelector('.wf-answer-reveal');
              assert(reveal && reveal.textContent.includes(state.currentAskWord),
                'wrong answer did not reveal the missed word');
              wrongRevealTested = true;
            }
          } else {
            button.click();
          }
          selectAnswers++;
          continue;
        }
      } else {
        const input = body.querySelector('#typeInput');
        const typedWord = state.q >= 31
          ? (state.currentAskWord[0] === 'A' ? 'B' : 'A') + state.currentAskWord.slice(1)
          : state.currentAskWord;
        if (input && input.value !== typedWord) {
          input.value = typedWord;
          input.dispatchEvent(new window.Event('input', { bubbles:true }));
          typeAnswers++;
          continue;
        }
      }
    }
    assert(timers.runNext(), 'simulation ran out of timers before round 31');
  }

  const state = window.__WORDFLASH_TEST__.getState();
  wrap.dispatchEvent(new window.Event('remove_game'));
  assert(guard < 22000, 'simulation guard exhausted');
  assert(reachedRound31, `simulation stopped before round 31 (at ${state.q})`);
  assert.equal(state.lives, 0, 'simulation did not complete through game over');
  assert(endResult && endResult.statsHtml, 'end screen was not produced');
  assert(wrongRevealTested, 'wrong-answer reveal path was not exercised');
  assert.equal(clockStarts, 1);
  assert(selectAnswers >= 25, 'selection mode did not run enough rounds');
  assert(typeAnswers > 0, 'type mode was not exercised');
  assert.equal(errors.length, 0, errors.map(error => error.stack || error).join('\n'));
  dom.window.close();
  return { round:state.q, score, selectAnswers, typeAnswers, wrongRevealTested, errors:errors.length, endResult };
}

function fmt(value, digits = 1) { return Number(value).toFixed(digits); }
function printDataTable(beforeStats, afterStats) {
  console.log('| Check | Before | After |');
  console.log('|---|---:|---:|');
  console.log(`| Groups with duplicate words | ${beforeStats.duplicateGroups} | ${afterStats.duplicateGroups} |`);
  console.log(`| Unique answer lengths | ${beforeStats.uniqueAnswerLengths} | ${afterStats.uniqueAnswerLengths} |`);
  console.log(`| Cross-tier identical groups | ${beforeStats.sharedGroups} | ${afterStats.sharedGroups} |`);
  console.log(`| Distractors outside ±1 length | ${beforeStats.lengthMismatches} | ${afterStats.lengthMismatches} |`);
}
function printDistanceTable(beforeStats, afterStats) {
  console.log('| Tier | Before avg len | Before ≤1 | Before avg min | After avg len | After ≤1 | After avg min | After distribution |');
  console.log('|---:|---:|---:|---:|---:|---:|---:|---|');
  for (let i=0;i<3;i++) {
    const b = beforeStats.tierStats[i], a = afterStats.tierStats[i];
    const distribution = Object.entries(a.distribution).map(([distance,count]) => `${distance}:${count}`).join(', ');
    console.log(`| ${i+1} | ${fmt(b.avgLength,2)} | ${b.near}/${b.groups} (${fmt(b.nearPct)}%) | ${fmt(b.avgMin,2)} | ${fmt(a.avgLength,2)} | ${a.near}/${a.groups} (${fmt(a.nearPct)}%) | ${fmt(a.avgMin,2)} | ${distribution} |`);
  }
}

const before = loadModel(beforeSource);
const after = loadModel(afterSource);
const beforeStats = analyze(before);
const afterStats = analyze(after);
assert.equal(afterStats.duplicateGroups, 0);
assert.equal(afterStats.uniqueAnswerLengths, 0);
assert.equal(afterStats.sharedGroups, 0);
assert.equal(afterStats.lengthMismatches, 0);
assert(afterStats.tierStats[0].nearPct < afterStats.tierStats[1].nearPct);
assert(afterStats.tierStats[1].nearPct < afterStats.tierStats[2].nearPct);
assert(afterStats.tierStats[0].avgMin > afterStats.tierStats[1].avgMin);
assert(afterStats.tierStats[1].avgMin > afterStats.tierStats[2].avgMin);
assert.throws(() => after.validate([[["MAZE","MAZE","MARE","MATE"]],[],[]]));
const shortAnswerMs = after.answerDuration(after.tiers[0][0]);
const longAnswerMs = after.answerDuration(after.tiers[2][14]);
assert(longAnswerMs > shortAnswerMs, 'long options did not receive more answer time');

const timingRows = timingComparison(before, after);
const timing = exhaustiveTiming(after);
assert(timing.overall.rate >= 70, `readability floor fell to ${timing.overall.rate}ms/letter`);
const maxModifiers = verifyMechanics(after);
const run = simulatedRun(afterSource);

console.log('Word Flash fairness probe: PASS');
console.log('\nPool integrity:');
printDataTable(beforeStats, afterStats);
console.log('\nEdit-distance progression (distance 1 is harder):');
printDistanceTable(beforeStats, afterStats);
console.log('\nRepresentative timing before/after:');
console.log('| Round | Before mode | Before chars | Before flash | Before ms/letter | After mode | After chars | After flash | After ms/letter |');
console.log('|---:|---|---:|---:|---:|---|---:|---:|---:|');
for (const row of timingRows) {
  console.log(`| ${row.round} | ${row.before} | ${fmt(row.beforeChars)} | ${row.beforeMs}ms | ${fmt(row.beforeRate)} | ${row.after} | ${fmt(row.afterChars)} | ${row.afterMs}ms | ${fmt(row.afterRate)} |`);
}
console.log('\nWorst-case content-aware timing, every round and all modes (including decoy+blink):');
console.log('| Round | Min ms/letter | Scenario |');
console.log('|---:|---:|---|');
for (const row of timing.rows) {
  console.log(`| ${row.round} | ${fmt(row.rate)} | T${row.tier} ${row.mode}, ${row.chars} chars / ${row.ms}ms |`);
}
console.log(`\nOverall floor: ${fmt(timing.overall.rate)}ms/letter at round ${timing.overall.round} (${timing.overall.mode})`);
console.log(`Modifier cap: ${maxModifiers}`);
console.log(`Answer budget: ${shortAnswerMs}ms for short options, ${longAnswerMs}ms for long options`);
console.log(`Simulated jsdom full run: reached round 31, ended on round ${run.round}, score ${run.score}, ${run.selectAnswers} select + ${run.typeAnswers} type answers, wrong-answer reveal/end screen verified, ${run.errors} JS errors`);
