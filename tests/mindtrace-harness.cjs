#!/usr/bin/env node
'use strict';

/*
 * Mind Trace headless regression harness
 *
 * Runs the real browser game in jsdom with a stubbed 2D canvas, then tests
 * its closure-scoped generator, solver, playability filter and edge-corridor
 * tracer through the test-only hook in mindtrace.js.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'js/games/mindtrace.js'), 'utf8');
const SHAPES = fs.readFileSync(path.join(ROOT, 'js/games/mindtrace_shapes.js'), 'utf8');

function canvasContext() {
  const gradient = { addColorStop() {} };
  const base = {
    scale() {}, clearRect() {}, beginPath() {}, closePath() {}, moveTo() {},
    lineTo() {}, arcTo() {}, arc() {}, fill() {}, stroke() {}, save() {},
    restore() {}, fillText() {}, setLineDash() {}, translate() {}, rotate() {},
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    measureText(text) { return { width: String(text).length * 7 }; },
  };
  return new Proxy(base, {
    get(target, prop) {
      if (!(prop in target)) target[prop] = () => {};
      return target[prop];
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

function bootGame() {
  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => runtimeErrors.push(error));
  virtualConsole.on('error', error => runtimeErrors.push(error));

  const dom = new JSDOM(
    '<!doctype html><body><main id="body"></main><section id="wrap"></section></body>',
    {
      url: 'https://mindtrace.test/',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      virtualConsole,
    }
  );
  const { window } = dom;
  window.__MINDTRACE_TEST__ = {};
  window.HTMLCanvasElement.prototype.getContext = function getContext() {
    if (!this.__ctx) this.__ctx = canvasContext();
    return this.__ctx;
  };
  window.HTMLCanvasElement.prototype.getBoundingClientRect = function rect() {
    const width = Number.parseFloat(this.style.width) || this.width || 300;
    const height = Number.parseFloat(this.style.height) || this.height || 300;
    return { left:0, top:0, right:width, bottom:height, width, height, x:0, y:0 };
  };
  // Do not spin animation loops in the harness. The game still builds both
  // canvases and runs its complete initialization path.
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};

  window.eval(SHAPES);
  window.eval(SOURCE);
  assert.equal(typeof window.playMindTrace, 'function', 'game entry point did not load');

  const body = window.document.getElementById('body');
  const wrap = window.document.getElementById('wrap');
  let score = 0;
  let ended = null;
  let clockStarts = 0;
  window.playMindTrace(
    body,
    value => { score = value; },
    result => { ended = result; },
    wrap,
    () => { clockStarts++; }
  );
  const start = body.querySelector('#mt3Start');
  assert(start, 'start screen did not render');
  start.click();
  assert(body.querySelector('#mt3Board canvas'), 'game board did not render');
  assert(body.querySelector('#mt3Undo'), 'undo control regressed');
  assert(body.querySelector('#mt3Hint'), 'hint control regressed');
  assert.equal(clockStarts, 1, 'clock did not start exactly once');
  assert(window.__MINDTRACE_TEST__.hasCanvas(), 'canvas was not initialized');

  // Stop timers/animation just as navigating away from the game would.
  wrap.dispatchEvent(new window.Event('remove_game'));
  assert.equal(runtimeErrors.length, 0,
    `full game initialization produced JS errors: ${runtimeErrors.join('\n')}`);

  return {
    api: window.__MINDTRACE_TEST__,
    runtimeErrors,
    getScore: () => score,
    getEnd: () => ended,
    close: () => dom.window.close(),
  };
}

function arrayEqual(a, b) {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/* Independent edge-indexed backtracking search. Connectivity and parity
 * pruning keep impossible starts fast, while route choices are still explored
 * recursively rather than accepted by a greedy DFS. */
function bruteEulerFrom(start, edges, nCount) {
  const incident = Array.from({ length:nCount }, () => []);
  edges.forEach(([a,b], index) => {
    incident[a].push([index,b]);
    incident[b].push([index,a]);
  });
  const allUsed = (1n << BigInt(edges.length)) - 1n;
  const failed = new Set();

  function remainingCanFinish(current, used) {
    const degree = new Array(nCount).fill(0);
    const adjacency = Array.from({ length:nCount }, () => []);
    for (let i=0;i<edges.length;i++) {
      if (used & (1n << BigInt(i))) continue;
      const [a,b] = edges[i];
      degree[a]++; degree[b]++;
      adjacency[a].push(b); adjacency[b].push(a);
    }
    if (degree[current] === 0) return false;
    const seen = new Set([current]);
    const stack = [current];
    while (stack.length) {
      const node = stack.pop();
      for (const next of adjacency[node]) {
        if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
    }
    for (let i=0;i<nCount;i++) if (degree[i] && !seen.has(i)) return false;
    const odd = [];
    for (let i=0;i<nCount;i++) if (degree[i] % 2) odd.push(i);
    return odd.length === 0 ||
      (odd.length === 2 && (odd[0] === current || odd[1] === current));
  }

  function search(current, used) {
    if (used === allUsed) return true;
    const key = `${current}:${used.toString(36)}`;
    if (failed.has(key)) return false;
    if (!remainingCanFinish(current, used)) {
      failed.add(key);
      return false;
    }
    for (const [edgeIndex, next] of incident[current]) {
      const bit = 1n << BigInt(edgeIndex);
      if (!(used & bit) && search(next, used | bit)) return true;
    }
    failed.add(key);
    return false;
  }

  return search(start, 0n);
}

function eulerRoute(graph) {
  const adjacency = Array.from({ length:graph.nCount }, () => []);
  graph.edges.forEach(([a,b], index) => {
    adjacency[a].push({ index, to:b });
    adjacency[b].push({ index, to:a });
  });
  const odd = adjacency.map((list, node) => list.length % 2 ? node : -1)
    .filter(node => node >= 0);
  const start = odd.length ? odd[0] : 0;
  const used = new Set();
  const stack = [start];
  const route = [];
  while (stack.length) {
    const node = stack[stack.length - 1];
    const edge = adjacency[node].find(candidate => !used.has(candidate.index));
    if (edge) {
      used.add(edge.index);
      stack.push(edge.to);
    } else {
      route.push(stack.pop());
    }
  }
  route.reverse();
  assert.equal(route.length, graph.edges.length + 1, 'failed to construct Euler route');
  return route;
}

function median(values) {
  const sorted = [...values].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2
    ? sorted[mid]
    : (sorted[mid-1] + sorted[mid]) / 2;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function difficultyStats(api, profile, diffForRound, round, sampleCount) {
  const graphs = [];
  for (let i=0;i<sampleCount;i++) {
    let graph = null;
    for (let retry=0;retry<32 && !graph;retry++) {
      const seed = (0x9E3779B9 ^ (round * 104729) ^ (i * 7919) ^ retry) >>> 0;
      graph = api.generateGraph(diffForRound(round), seed, profile);
    }
    assert(graph, `generator exhausted retries for round ${round}`);
    graphs.push(graph);
  }
  const twoOdd = graphs.filter(graph =>
    api.oddNodes(graph.edges, graph.nCount).length === 2).length;
  return {
    nodes: median(graphs.map(graph => graph.nCount)),
    edges: median(graphs.map(graph => graph.edges.length)),
    twoOddPct: (twoOdd / graphs.length * 100).toFixed(1),
  };
}

function run() {
  const { api, runtimeErrors, close } = bootGame();
  const baselineProfile = {
    nodeRanges: [[0,0],[5,6],[6,8],[8,10],[9,12],[11,14]],
    extraRanges: [[0,0],[0,1],[1,2],[2,4],[3,5],[4,7]],
    preferTwoOdd: false,
  };
  const baselineDiff = round => round <= 5 ? 1
    : round <= 10 ? 2
    : round <= 20 ? 3
    : round <= 35 ? 4
    : 5;

  assert.equal(api.CFG.assistRounds, 1, 'route-blocking assist must end after round 1');
  assert.deepEqual([1,3,5,10,20].map(api.CFG.diffCap), [1,2,2,3,5],
    'difficulty ramp regressed');
  for (let diff=1;diff<=5;diff++) {
    const fallback = api.safeFallback(diff);
    assert(api.isPlayable(fallback), `difficulty ${diff} safety fallback is unplayable`);
    assert(api.hasEulerPath(fallback.edges, fallback.nCount),
      `difficulty ${diff} safety fallback is Euler-invalid`);
    assert(fallback.edges.length >= fallback.nCount - 1 + api.GRAPH_PROFILE.extraRanges[diff][0],
      `difficulty ${diff} safety fallback lost its branch floor`);
  }

  // Tutorial gates: degree labels are planning-only in rounds 1–3, and
  // post-tutorial starts are neither highlighted nor rejected.
  let tutorialGraph = null;
  for (let seed=1;seed<100 && !tutorialGraph;seed++) {
    const candidate = api.makePuzzle(2, seed * 7919);
    if (api.oddNodes(candidate.edges, candidate.nCount).length === 2) tutorialGraph = candidate;
  }
  assert(tutorialGraph, 'could not create tutorial feature fixture');
  api.setPuzzle(tutorialGraph, 3);
  api.G.phase = 'plan';
  assert.equal(api.showDegrees(), true, 'round 3 planning labels should teach degree counting');
  assert(api.G.hintNodes.length > 0, 'tutorial valid starts should glow');
  api.G.phase = 'play';
  assert.equal(api.showDegrees(), false, 'degree labels must disappear when drawing starts');
  const valid = api.validStartNodes();
  const invalid = Array.from({length:tutorialGraph.nCount}, (_,i) => i)
    .find(node => !valid.includes(node));
  assert.notEqual(invalid, undefined, 'fixture needs an invalid start');
  assert.equal(api.startStrokeAtNode(invalid), -1, 'tutorial should reject an invalid start');

  api.setPuzzle(tutorialGraph, 4);
  api.G.phase = 'plan';
  assert.equal(api.showDegrees(), false, 'degree labels leaked beyond tutorial');
  assert.equal(api.G.hintNodes.length, 0, 'valid starts leaked beyond tutorial');
  api.G.phase = 'play';
  assert.equal(api.startStrokeAtNode(invalid), invalid,
    'post-tutorial invalid start was silently rejected');

  // 1 + 2. Playability, Euler validity, and start solver vs true backtracking.
  const generated = [];
  let unplayable = 0;
  let eulerInvalid = 0;
  let choiceFreeGraphs = 0;
  let solverMismatches = 0;
  let startChecks = 0;
  for (let diff=1;diff<=5;diff++) {
    for (let i=0;i<200;i++) {
      const seed = (0xA341316C ^ (diff * 2654435761) ^ (i * 104729)) >>> 0;
      const graph = api.makePuzzle(diff, seed);
      generated.push(graph);
      if (!api.isPlayable(graph)) unplayable++;
      if (!api.hasEulerPath(graph.edges, graph.nCount)) eulerInvalid++;
      if (graph.edges.length === graph.nCount - 1) choiceFreeGraphs++;
      api.setPuzzle(graph, 20);
      const actual = api.validStartNodes();
      const expected = [];
      for (let start=0;start<graph.nCount;start++) {
        startChecks++;
        if (bruteEulerFrom(start, graph.edges, graph.nCount)) expected.push(start);
      }
      if (!arrayEqual(actual, expected)) solverMismatches++;
      assert(actual.length > 0, `difficulty ${diff} seed ${seed} has no valid start`);
    }
  }
  assert.equal(unplayable, 0, 'playability regression');
  assert.equal(eulerInvalid, 0, 'Euler validity regression');
  assert.equal(choiceFreeGraphs, 0, 'a generated board had no branch choices');
  assert.equal(solverMismatches, 0, 'live solver disagrees with backtracking');

  // 3. Edge-corridor tracing with eight human-like samples per edge and
  // deterministic ±3px perpendicular jitter.
  let solved = 0;
  let misSnaps = 0;
  for (let puzzleIndex=0;puzzleIndex<300;puzzleIndex++) {
    const graph = generated[(puzzleIndex * 37) % generated.length];
    const route = eulerRoute(graph);
    const jitter = api.rng((0xC8013EA4 ^ puzzleIndex * 104729) >>> 0);
    api.prepareTrace(graph, route[0]);
    let failed = false;
    for (let edgeIndex=0;edgeIndex<route.length-1 && !failed;edgeIndex++) {
      const from = route[edgeIndex];
      const expected = route[edgeIndex+1];
      const [x1,y1] = api.nodePos(from);
      const [x2,y2] = api.nodePos(expected);
      const dx = x2-x1, dy = y2-y1;
      const length = Math.hypot(dx,dy);
      const perpX = -dy/length, perpY = dx/length;
      let committed = false;
      for (let step=1;step<=8;step++) {
        const t = step/8;
        const offset = jitter()*6 - 3;
        const x = x1 + dx*t + perpX*offset;
        const y = y1 + dy*t + perpY*offset;
        const target = api.pickTarget(x, y, api.CFG.snap);
        if (target >= 0) {
          if (!committed && target === expected) {
            api.commitTrace(target);
            committed = true;
          } else {
            misSnaps++;
            failed = true;
            break;
          }
        }
      }
      if (!committed) failed = true;
    }
    if (!failed && api.G.tracedEdges.size === graph.edges.length) solved++;
  }
  assert.equal(solved, 300, 'simulated finger could not solve every puzzle');
  assert.equal(misSnaps, 0, 'edge-corridor tracer snapped to a wrong node');

  // 4. Reproducible old/new topology benchmark.
  const rounds = [1,3,5,10,20];
  const rows = rounds.map(round => ({
    round,
    before: difficultyStats(api, baselineProfile, baselineDiff, round, 500),
    after: difficultyStats(api, api.GRAPH_PROFILE, api.CFG.diffCap, round, 500),
  }));

  assert.equal(runtimeErrors.length, 0, 'runtime emitted JavaScript errors');

  console.log('Mind Trace regression harness: PASS');
  console.log(`Playability: ${generated.length} puzzles, ${unplayable} unplayable, ${eulerInvalid} Euler-invalid, ${choiceFreeGraphs} choice-free graphs`);
  console.log(`Solvability: ${startChecks} start-node checks, ${solverMismatches} mismatches, all non-empty`);
  console.log(`Tracing: ${solved}/300 solved, ${misSnaps} mis-snaps (8 steps/edge, ±3px jitter)`);
  console.log('Difficulty (500 deterministic procedural samples per round/profile):');
  console.log('| Round | Before median nodes/edges | Before exactly 2 odd | After median nodes/edges | After exactly 2 odd |');
  console.log('|---:|---:|---:|---:|---:|');
  for (const row of rows) {
    console.log(`| ${row.round} | ${row.before.nodes}/${row.before.edges} | ${row.before.twoOddPct}% | ${row.after.nodes}/${row.after.edges} | ${row.after.twoOddPct}% |`);
  }
  console.log('Full jsdom game launch: 0 JavaScript errors');
  close();
}

try {
  run();
} catch (error) {
  console.error('Mind Trace regression harness: FAIL');
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
}
