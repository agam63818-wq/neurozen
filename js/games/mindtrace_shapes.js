/* =====================================================================
   Mind Trace - Shape Library Engine
   ---------------------------------------------------------------------
   Handcrafted-feeling puzzle source that supplements the procedural
   engine in mindtrace.js. Exposes a single global object:

       window.MT_SHAPES = {
         library      : [...200 metadata rows...],
         CATS         : [...20 category names...],
         DIFFS        : ['Easy','Medium','Hard','Master'],
         buildFromShape(meta, seed) -> { nodes, edges, nCount, ... }
                                       or null on failure
         pickShape(round, seed, avoidCatIdx) -> meta
         validateEuler(edges, nCount) -> bool
       };

   Design principles
   -----------------
   The library's text layouts are placeholders. What the library truly
   provides is METADATA per shape:
     - category (Geometric / House / Nature / Animals / ...)
     - difficulty band (Easy / Medium / Hard / Master)
     - suggested round + recommended time
     - target node count and edge count
     - allowed variations (rotate / mirror / scale / offset / jitter)

   The engine below owns a bank of ~20 category-flavoured ARCHETYPES.
   Each archetype produces a distinctive TOPOLOGY (a house has a
   triangle roof over a rectangle, a fish has an ellipse body plus a
   triangular tail, a car has two wheel loops under a body, etc.).
   Every archetype supports a target node count so the same category
   can produce many different puzzles with different sizes.

   The engine then applies variations (rotate / mirror / scale / offset
   / jitter) using a seeded RNG and validates the graph has an Euler
   path (0 or 2 odd-degree nodes). If validation fails we auto-repair
   by adding a compensating edge or returning null so the caller can
   fall back to the procedural puzzle.

   No graphics, no images -- only nodes and edges. The final output is
   100% compatible with the existing render loop in mindtrace.js.
   ===================================================================== */

(function(){
'use strict';

/* -----------------------------------------------------------------
   METADATA TABLE
   Each row is [id, catIdx, diffIdx, round, timeSec, nodes, edges]
   Extracted from the official 200-shape library document.
   ----------------------------------------------------------------- */
const CATS = [
  'Geometric','House & Buildings','Nature','Animals','Transport',
  'Objects','Symbols','Letters','Numbers','Food',
  'Sports','Space','Technology','Music','Fantasy',
  'Mechanical','Patterns','Maze','Abstract','Master'
];
const DIFFS = ['Easy','Medium','Hard','Master'];

const LIB = [[1,0,0,3,18,6,7],[2,0,0,3,18,7,8],[3,0,0,3,18,8,9],[4,0,0,3,18,9,10],[5,0,0,3,18,10,11],[6,0,0,3,18,11,12],[7,0,0,3,18,12,13],[8,0,0,4,18,5,6],[9,0,0,4,18,6,7],[10,0,0,5,18,7,8],[11,1,0,5,18,8,9],[12,1,0,6,18,9,10],[13,1,0,6,18,10,11],[14,1,0,7,18,11,12],[15,1,0,7,18,12,13],[16,1,0,8,18,5,6],[17,1,0,8,18,6,7],[18,1,0,9,18,7,8],[19,1,0,9,18,8,9],[20,1,0,10,18,9,10],[21,2,0,10,18,10,11],[22,2,0,11,18,11,12],[23,2,0,11,18,12,13],[24,2,0,12,18,5,6],[25,2,0,12,18,6,7],[26,2,0,13,18,7,8],[27,2,0,13,18,8,9],[28,2,0,14,18,9,10],[29,2,0,14,18,10,11],[30,2,0,15,18,11,12],[31,3,0,15,18,12,13],[32,3,0,16,18,5,6],[33,3,0,16,18,6,7],[34,3,0,17,18,7,8],[35,3,0,17,18,8,9],[36,3,0,18,18,9,10],[37,3,0,18,18,10,11],[38,3,0,19,18,11,12],[39,3,0,19,18,12,13],[40,3,0,20,18,5,6],[41,4,1,20,24,6,7],[42,4,1,21,24,7,8],[43,4,1,21,24,8,9],[44,4,1,22,24,9,10],[45,4,1,22,24,10,11],[46,4,1,23,24,11,12],[47,4,1,23,24,12,13],[48,4,1,24,24,5,6],[49,4,1,24,24,6,7],[50,4,1,25,24,7,8],[51,5,1,25,24,8,9],[52,5,1,26,24,9,10],[53,5,1,26,24,10,11],[54,5,1,27,24,11,12],[55,5,1,27,24,12,13],[56,5,1,28,24,5,6],[57,5,1,28,24,6,7],[58,5,1,29,24,7,8],[59,5,1,29,24,8,9],[60,5,1,30,24,9,10],[61,6,1,30,24,10,11],[62,6,1,31,24,11,12],[63,6,1,31,24,12,13],[64,6,1,32,24,5,6],[65,6,1,32,24,6,7],[66,6,1,33,24,7,8],[67,6,1,33,24,8,9],[68,6,1,34,24,9,10],[69,6,1,34,24,10,11],[70,6,1,35,24,11,12],[71,7,1,35,24,12,13],[72,7,1,36,24,5,6],[73,7,1,36,24,6,7],[74,7,1,37,24,7,8],[75,7,1,37,24,8,9],[76,7,1,38,24,9,10],[77,7,1,38,24,10,11],[78,7,1,39,24,11,12],[79,7,1,39,24,12,13],[80,7,1,40,24,5,6],[81,8,1,40,24,6,7],[82,8,1,41,24,7,8],[83,8,1,41,24,8,9],[84,8,1,42,24,9,10],[85,8,1,42,24,10,11],[86,8,1,43,24,11,12],[87,8,1,43,24,12,13],[88,8,1,44,24,5,6],[89,8,1,44,24,6,7],[90,8,1,45,24,7,8],[91,9,1,45,24,8,9],[92,9,1,46,24,9,10],[93,9,1,46,24,10,11],[94,9,1,47,24,11,12],[95,9,1,47,24,12,13],[96,9,1,48,24,5,6],[97,9,1,48,24,6,7],[98,9,1,49,24,7,8],[99,9,1,49,24,8,9],[100,9,1,50,24,9,10],[101,10,2,50,32,10,11],[102,10,2,51,32,11,12],[103,10,2,51,32,12,13],[104,10,2,52,32,5,6],[105,10,2,52,32,6,7],[106,10,2,53,32,7,8],[107,10,2,53,32,8,9],[108,10,2,54,32,9,10],[109,10,2,54,32,10,11],[110,10,2,55,32,11,12],[111,11,2,55,32,12,13],[112,11,2,56,32,5,6],[113,11,2,56,32,6,7],[114,11,2,57,32,7,8],[115,11,2,57,32,8,9],[116,11,2,58,32,9,10],[117,11,2,58,32,10,11],[118,11,2,59,32,11,12],[119,11,2,59,32,12,13],[120,11,2,60,32,5,6],[121,12,2,60,32,6,7],[122,12,2,61,32,7,8],[123,12,2,61,32,8,9],[124,12,2,62,32,9,10],[125,12,2,62,32,10,11],[126,12,2,63,32,11,12],[127,12,2,63,32,12,13],[128,12,2,64,32,5,6],[129,12,2,64,32,6,7],[130,12,2,65,32,7,8],[131,13,2,65,32,8,9],[132,13,2,66,32,9,10],[133,13,2,66,32,10,11],[134,13,2,67,32,11,12],[135,13,2,67,32,12,13],[136,13,2,68,32,5,6],[137,13,2,68,32,6,7],[138,13,2,69,32,7,8],[139,13,2,69,32,8,9],[140,13,2,70,32,9,10],[141,14,2,70,32,10,11],[142,14,2,71,32,11,12],[143,14,2,71,32,12,13],[144,14,2,72,32,5,6],[145,14,2,72,32,6,7],[146,14,2,73,32,7,8],[147,14,2,73,32,8,9],[148,14,2,74,32,9,10],[149,14,2,74,32,10,11],[150,14,2,75,32,11,12],[151,15,2,75,32,12,13],[152,15,2,76,32,5,6],[153,15,2,76,32,6,7],[154,15,2,77,32,7,8],[155,15,2,77,32,8,9],[156,15,2,78,32,9,10],[157,15,2,78,32,10,11],[158,15,2,79,32,11,12],[159,15,2,79,32,12,13],[160,15,2,80,32,5,6],[161,16,3,80,40,6,7],[162,16,3,81,40,7,8],[163,16,3,81,40,8,9],[164,16,3,82,40,9,10],[165,16,3,82,40,10,11],[166,16,3,83,40,11,12],[167,16,3,83,40,12,13],[168,16,3,84,40,5,6],[169,16,3,84,40,6,7],[170,16,3,85,40,7,8],[171,17,3,85,40,8,9],[172,17,3,86,40,9,10],[173,17,3,86,40,10,11],[174,17,3,87,40,11,12],[175,17,3,87,40,12,13],[176,17,3,88,40,5,6],[177,17,3,88,40,6,7],[178,17,3,89,40,7,8],[179,17,3,89,40,8,9],[180,17,3,90,40,9,10],[181,18,3,90,40,10,11],[182,18,3,91,40,11,12],[183,18,3,91,40,12,13],[184,18,3,92,40,5,6],[185,18,3,92,40,6,7],[186,18,3,93,40,7,8],[187,18,3,93,40,8,9],[188,18,3,94,40,9,10],[189,18,3,94,40,10,11],[190,18,3,95,40,11,12],[191,19,3,95,40,12,13],[192,19,3,96,40,5,6],[193,19,3,96,40,6,7],[194,19,3,97,40,7,8],[195,19,3,97,40,8,9],[196,19,3,98,40,9,10],[197,19,3,98,40,10,11],[198,19,3,99,40,11,12],[199,19,3,99,40,12,13],[200,19,3,100,40,5,6]];

/* Convenience: turn one row into an object */
function meta(row){
  return {
    id       : row[0],
    catIdx   : row[1],
    category : CATS[row[1]],
    diffIdx  : row[2],
    difficulty : DIFFS[row[2]],
    round    : row[3],
    time     : row[4],
    nodes    : row[5],
    edges    : row[6],
  };
}

/* -----------------------------------------------------------------
   RNG (mulberry32, matches mindtrace.js so tests are reproducible)
   ----------------------------------------------------------------- */
function rng(seed){
  let t = seed >>> 0;
  return function(){
    t = (t + 0x6D2B79F5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* -----------------------------------------------------------------
   GRAPH UTILITIES (mirror the ones in mindtrace.js so this file is
   self-contained; the two implementations agree on all outputs).
   ----------------------------------------------------------------- */
function nodeDegrees(edges, n){
  const d = new Array(n).fill(0);
  for (const [a,b] of edges){ d[a]++; d[b]++; }
  return d;
}
function isConnected(edges, n){
  if (n === 0) return true;
  const adj = Array.from({length:n}, ()=>[]);
  for (const [a,b] of edges){ adj[a].push(b); adj[b].push(a); }
  const seen = new Set([0]); const q = [0];
  while (q.length){
    const u = q.shift();
    for (const v of adj[u]) if (!seen.has(v)){ seen.add(v); q.push(v); }
  }
  return seen.size === n;
}
function hasEulerPath(edges, n){
  if (!isConnected(edges, n)) return false;
  const d = nodeDegrees(edges, n);
  let odd = 0;
  for (const v of d) if (v % 2) odd++;
  return odd === 0 || odd === 2;
}
function hasEdge(edges, a, b){
  const A = Math.min(a,b), B = Math.max(a,b);
  return edges.some(([x,y])=> x===A && y===B);
}
function pushEdge(edges, a, b){
  if (a===b) return false;
  const A = Math.min(a,b), B = Math.max(a,b);
  if (hasEdge(edges, A, B)) return false;
  edges.push([A,B]);
  return true;
}

/* Deduplicate edges */
function normalizeEdges(edges){
  const seen = new Set();
  const out = [];
  for (const [a,b] of edges){
    if (a===b) continue;
    const A=Math.min(a,b), B=Math.max(a,b);
    const k = A+'-'+B;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push([A,B]);
  }
  return out;
}

/* -----------------------------------------------------------------
   ARCHETYPE HELPERS

   Every archetype receives:
     - target node count N (5..12)
     - rand: seeded RNG (mulberry32)
   and returns { nodes: [[px,py]...] (in %-space 0-100),
                 edges: [[a,b]...] }.

   The archetype only has to produce a graph that *looks* like the
   category. Euler-path guarantee is added later by `finalizeGraph`.
   ----------------------------------------------------------------- */

/* Regular polygon in %-space, centred at (cx, cy), radius r */
function polygon(cx, cy, r, sides, phase){
  const nodes = [];
  for (let i=0;i<sides;i++){
    const a = phase + (i / sides) * Math.PI * 2;
    nodes.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return nodes;
}

/* Chain of nodes in a line */
function line(x1,y1,x2,y2,count){
  const nodes = [];
  for (let i=0;i<count;i++){
    const t = count===1 ? 0 : i/(count-1);
    nodes.push([x1 + (x2-x1)*t, y1 + (y2-y1)*t]);
  }
  return nodes;
}

/* Grow N target: pad the given nodes with extra grid points; then
   returns first N. Not usually called directly; archetypes handle N
   internally. */

/* Ensure at most 2 odd-degree nodes by adding edges between odd pairs.
   Preserves existing edges; adds new ones between the shortest-distance
   odd pairs. If no valid pair exists, returns false. */
function fixParity(nodes, edges){
  let safety = 30;
  while (safety-- > 0){
    const d = nodeDegrees(edges, nodes.length);
    const odd = [];
    for (let i=0;i<d.length;i++) if (d[i] % 2) odd.push(i);
    if (odd.length === 0 || odd.length === 2) return true;
    /* Pick the two closest odd nodes not already connected */
    let bestPair = null, bestD = Infinity;
    for (let i=0;i<odd.length;i++) for (let j=i+1;j<odd.length;j++){
      const a = odd[i], b = odd[j];
      if (hasEdge(edges, a, b)) continue;
      const [ax,ay]=nodes[a], [bx,by]=nodes[b];
      const D = Math.hypot(ax-bx, ay-by);
      if (D < bestD){ bestD = D; bestPair = [a,b]; }
    }
    if (!bestPair){
      /* All odd pairs already connected. Add a stub edge between two
         odd nodes using a new midpoint node. */
      const [a, b] = [odd[0], odd[1]];
      const [ax,ay] = nodes[a], [bx,by] = nodes[b];
      const mx = (ax+bx)/2 + (Math.random()-0.5)*6;
      const my = (ay+by)/2 + (Math.random()-0.5)*6;
      const newIdx = nodes.length;
      nodes.push([mx,my]);
      pushEdge(edges, a, newIdx);
      pushEdge(edges, newIdx, b);
      continue;
    }
    pushEdge(edges, bestPair[0], bestPair[1]);
  }
  return hasEulerPath(edges, nodes.length);
}

/* Grow / trim a graph to hit a target node count (approx).
   Growing: add satellite nodes attached to random existing nodes.
   Trimming: drop leaves (degree-1 nodes) until size fits. */
function resizeToTarget(nodes, edges, targetN, rand){
  /* Grow */
  let guard = 40;
  while (nodes.length < targetN && guard-- > 0){
    /* Pick a random existing node with degree >= 1 and add a satellite
       near it. */
    const src = Math.floor(rand() * nodes.length);
    const [sx, sy] = nodes[src];
    const ang = rand() * Math.PI * 2;
    const rad = 10 + rand() * 8;
    const nx = Math.max(6, Math.min(94, sx + Math.cos(ang) * rad));
    const ny = Math.max(6, Math.min(94, sy + Math.sin(ang) * rad));
    const idx = nodes.length;
    nodes.push([nx, ny]);
    pushEdge(edges, src, idx);
  }
  /* Trim: drop degree-1 leaves (safe -- keeps graph connected). */
  guard = 40;
  while (nodes.length > targetN && guard-- > 0){
    const d = nodeDegrees(edges, nodes.length);
    let leaf = -1;
    for (let i=nodes.length-1;i>=0;i--) if (d[i] === 1){ leaf = i; break; }
    if (leaf < 0) break;
    /* Remove leaf: drop node + its single edge, then renumber. */
    const filteredEdges = edges.filter(([a,b]) => a!==leaf && b!==leaf)
      .map(([a,b]) => [a > leaf ? a-1 : a, b > leaf ? b-1 : b]);
    nodes.splice(leaf, 1);
    edges.length = 0;
    for (const e of filteredEdges) edges.push(e);
  }
  return { nodes, edges };
}

/* Apply variations: rotate / mirror / scale / offset / jitter, using
   a seeded RNG. Coordinates stay in the [6..94] %-space window. */
function applyVariations(nodes, rand, opts){
  opts = opts || {};
  const doRotate = opts.rotate !== false && rand() < 0.85;
  const doMirror = opts.mirror !== false && rand() < 0.5;
  const doScale  = opts.scale  !== false && rand() < 0.7;
  const doOffset = opts.offset !== false && rand() < 0.7;
  const doJitter = opts.jitter !== false && rand() < 0.85;

  /* Centre-of-mass */
  let cx = 0, cy = 0;
  for (const [x,y] of nodes){ cx += x; cy += y; }
  cx /= nodes.length; cy /= nodes.length;

  const angle = doRotate ? (rand() * Math.PI * 2) : 0;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const mirrorX = doMirror ? (rand() < 0.5 ? -1 : 1) : 1;
  const mirrorY = doMirror ? (rand() < 0.5 ? -1 : 1) : 1;
  /* Prevent both mirror flips being negative simultaneously with an
     odd rotation, which produces the "same" shape. Not fatal, just
     less variation. */
  const scale = doScale ? (0.85 + rand() * 0.30) : 1;    // 0.85..1.15

  let out = nodes.map(([x,y]) => {
    let dx = (x - cx) * mirrorX;
    let dy = (y - cy) * mirrorY;
    /* rotate */
    const rx = dx * ca - dy * sa;
    const ry = dx * sa + dy * ca;
    return [cx + rx * scale, cy + ry * scale];
  });

  /* Recentre + optional offset */
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const [x,y] of out){
    if (x<minX)minX=x; if (y<minY)minY=y;
    if (x>maxX)maxX=x; if (y>maxY)maxY=y;
  }
  const w = maxX - minX, h = maxY - minY;
  /* Fit to a 78%-wide box centred, then apply a small offset. */
  const targetW = 78, targetH = 78;
  const fitScale = Math.min(1, targetW / (w || 1), targetH / (h || 1));
  const ox = doOffset ? (rand() - 0.5) * 6 : 0;
  const oy = doOffset ? (rand() - 0.5) * 6 : 0;
  out = out.map(([x,y]) => [
    50 + (x - (minX + w/2)) * fitScale + ox,
    50 + (y - (minY + h/2)) * fitScale + oy,
  ]);

  if (doJitter){
    out = out.map(([x,y]) => [
      x + (rand() - 0.5) * 3.5,
      y + (rand() - 0.5) * 3.5,
    ]);
  }

  /* Clamp inside [6..94] */
  return out.map(([x,y]) => [
    Math.max(6, Math.min(94, +x.toFixed(1))),
    Math.max(6, Math.min(94, +y.toFixed(1))),
  ]);
}

/* Add a "distractor" extra edge that respects planarity as much as
   possible: pick two currently-close nodes with no existing edge. */
function addDistractorEdge(nodes, edges, rand){
  /* Try 40 random pairs, pick the shortest one not yet an edge. */
  const n = nodes.length;
  let best = null, bestD = Infinity;
  for (let t=0;t<40;t++){
    const a = Math.floor(rand()*n);
    let b = Math.floor(rand()*n);
    if (a===b) continue;
    if (hasEdge(edges, a, b)) continue;
    const [ax,ay]=nodes[a], [bx,by]=nodes[b];
    const D = Math.hypot(ax-bx, ay-by);
    if (D < bestD){ bestD = D; best = [a,b]; }
  }
  if (best) pushEdge(edges, best[0], best[1]);
  return !!best;
}

/* -----------------------------------------------------------------
   ARCHETYPE BANK
   Each archetype builds an "identity" small graph, then resizeToTarget
   expands it to N. Every archetype's identity shape is UNIQUE.
   ----------------------------------------------------------------- */

/* -- Geometric ---------------------------------------------------- */
function archGeometric(N, rand, subIdx){
  /* sub 0: pentagon, sub 1: hexagon, sub 2: star (5-point), sub 3: kite,
     sub 4: bowtie */
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Pentagon + centre spoke */
    const p = polygon(50, 52, 30, 5, -Math.PI/2);
    nodes.push(...p);
    for (let i=0;i<5;i++) pushEdge(edges, i, (i+1)%5);
    nodes.push([50,52]);                 /* centre */
    pushEdge(edges, 5, 0);
  } else if (subIdx === 1){              /* Hexagon frame */
    const p = polygon(50, 50, 32, 6, 0);
    nodes.push(...p);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
  } else if (subIdx === 2){              /* 5-point star (10 nodes) */
    const outer = polygon(50, 50, 34, 5, -Math.PI/2);
    const inner = polygon(50, 50, 15, 5, -Math.PI/2 + Math.PI/5);
    for (let i=0;i<5;i++){ nodes.push(outer[i]); nodes.push(inner[i]); }
    for (let i=0;i<5;i++){
      pushEdge(edges, i*2, i*2+1);
      pushEdge(edges, i*2+1, ((i+1)%5)*2);
    }
  } else if (subIdx === 3){              /* Kite / diamond */
    nodes.push([50,15],[80,50],[50,85],[20,50],[50,50]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,0);
    pushEdge(edges,0,4); pushEdge(edges,4,2);
  } else {                                /* Bowtie */
    nodes.push([20,20],[80,20],[50,50],[20,80],[80,80]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,2,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
  }
  return { nodes, edges };
}

/* -- House & Buildings -------------------------------------------- */
function archHouse(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Classic house: triangle roof + square base */
    nodes.push([50,15]);                 /* 0 roof peak */
    nodes.push([20,40]);                 /* 1 roof left */
    nodes.push([80,40]);                 /* 2 roof right */
    nodes.push([20,80]);                 /* 3 base BL */
    nodes.push([80,80]);                 /* 4 base BR */
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
  } else if (subIdx === 1){              /* Tall building: 2x3 grid */
    for (let r=0;r<3;r++) for (let c=0;c<2;c++)
      nodes.push([30 + c*40, 20 + r*30]);
    /* verticals */
    pushEdge(edges,0,2); pushEdge(edges,2,4);
    pushEdge(edges,1,3); pushEdge(edges,3,5);
    /* horizontals */
    pushEdge(edges,0,1); pushEdge(edges,2,3); pushEdge(edges,4,5);
  } else if (subIdx === 2){              /* Church: triangle + rectangle + cross */
    nodes.push([50,10],[35,32],[65,32],[35,85],[65,85],[50,10-0]);
    /* Simplified: peak, two roof corners, two base corners */
    /* Rebuild */
    nodes.length = 0;
    nodes.push([50,12]);                 /* 0 spire top */
    nodes.push([35,35]);                 /* 1 */
    nodes.push([65,35]);                 /* 2 */
    nodes.push([35,80]);                 /* 3 */
    nodes.push([65,80]);                 /* 4 */
    nodes.push([50,55]);                 /* 5 door */
    pushEdge(edges,0,1); pushEdge(edges,0,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
    pushEdge(edges,1,5); pushEdge(edges,2,5);
  } else if (subIdx === 3){              /* Two-house village */
    nodes.push([25,25],[15,45],[35,45],[15,75],[35,75]);
    nodes.push([70,30],[85,50],[55,50],[85,80],[55,80]);
    /* house 1 */
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
    /* house 2 */
    pushEdge(edges,5,6); pushEdge(edges,5,7); pushEdge(edges,6,7);
    pushEdge(edges,6,8); pushEdge(edges,7,9); pushEdge(edges,8,9);
    /* bridge */
    pushEdge(edges,2,7);
  } else {                                /* Skyscraper: tall rectangle + antenna */
    nodes.push([50,10]);                 /* antenna tip */
    nodes.push([35,25]);                 /* top L */
    nodes.push([65,25]);                 /* top R */
    nodes.push([35,55]);                 /* mid L */
    nodes.push([65,55]);                 /* mid R */
    nodes.push([35,85]);                 /* bot L */
    nodes.push([65,85]);                 /* bot R */
    pushEdge(edges,0,1); pushEdge(edges,0,2);
    pushEdge(edges,1,2); pushEdge(edges,1,3); pushEdge(edges,2,4);
    pushEdge(edges,3,4); pushEdge(edges,3,5); pushEdge(edges,4,6);
    pushEdge(edges,5,6);
  }
  return { nodes, edges };
}

/* -- Nature ------------------------------------------------------- */
function archNature(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Tree: trunk + branches */
    nodes.push([50,90]);                 /* 0 base */
    nodes.push([50,60]);                 /* 1 trunk mid */
    nodes.push([25,45]);                 /* 2 branch L */
    nodes.push([75,45]);                 /* 3 branch R */
    nodes.push([50,30]);                 /* 4 top */
    nodes.push([30,20]);                 /* 5 leaf L */
    nodes.push([70,20]);                 /* 6 leaf R */
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,1,3);
    pushEdge(edges,1,4); pushEdge(edges,4,5); pushEdge(edges,4,6);
    pushEdge(edges,2,5); pushEdge(edges,3,6);
  } else if (subIdx === 1){              /* Flower: centre + petals */
    const centre = [50,50];
    nodes.push(centre);
    const petals = polygon(50, 50, 32, 6, 0);
    for (const p of petals) nodes.push(p);
    for (let i=1;i<=6;i++){
      pushEdge(edges, 0, i);
      pushEdge(edges, i, (i%6)+1);
    }
  } else if (subIdx === 2){              /* Mountain range: zigzag */
    nodes.push([10,80],[25,45],[40,70],[55,30],[70,60],[85,45],[85,80],[10,80]);
    /* remove duplicate */
    nodes.pop();
    for (let i=0;i<6;i++) pushEdge(edges, i, i+1);
    pushEdge(edges, 6, 0);   /* ground */
  } else if (subIdx === 3){              /* Snowflake: 6 arms */
    nodes.push([50,50]);
    const tips = polygon(50, 50, 34, 6, 0);
    for (const t of tips) nodes.push(t);
    for (let i=1;i<=6;i++) pushEdge(edges, 0, i);
    /* connect neighboring tips */
    for (let i=1;i<=6;i++) pushEdge(edges, i, (i%6)+1);
  } else {                                /* Leaf: pointed oval + vein */
    nodes.push([50,10]);                 /* tip */
    nodes.push([25,35]);
    nodes.push([75,35]);
    nodes.push([25,65]);
    nodes.push([75,65]);
    nodes.push([50,90]);                 /* stem */
    nodes.push([50,50]);                 /* centre vein */
    pushEdge(edges,0,1); pushEdge(edges,0,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4);
    pushEdge(edges,3,5); pushEdge(edges,4,5);
    pushEdge(edges,0,6); pushEdge(edges,6,5);
  }
  return { nodes, edges };
}

/* -- Animals ------------------------------------------------------ */
function archAnimal(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Fish */
    nodes.push([70,50]);                 /* head */
    nodes.push([50,30]);                 /* top body */
    nodes.push([50,70]);                 /* bottom body */
    nodes.push([25,50]);                 /* tail root */
    nodes.push([10,30]);                 /* tail top */
    nodes.push([10,70]);                 /* tail bottom */
    pushEdge(edges,0,1); pushEdge(edges,0,2);
    pushEdge(edges,1,3); pushEdge(edges,2,3);
    pushEdge(edges,3,4); pushEdge(edges,3,5); pushEdge(edges,4,5);
  } else if (subIdx === 1){              /* Bird: triangle body + wings */
    nodes.push([50,30]);                 /* head */
    nodes.push([30,55]);                 /* body L */
    nodes.push([70,55]);                 /* body R */
    nodes.push([15,40]);                 /* wing tip L */
    nodes.push([85,40]);                 /* wing tip R */
    nodes.push([50,80]);                 /* tail */
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4);
    pushEdge(edges,1,5); pushEdge(edges,2,5);
  } else if (subIdx === 2){              /* Cat: head + ears + body */
    nodes.push([30,25]);                 /* ear L */
    nodes.push([50,15]);                 /* head top */
    nodes.push([70,25]);                 /* ear R */
    nodes.push([50,45]);                 /* chin */
    nodes.push([30,80]);                 /* paw L */
    nodes.push([70,80]);                 /* paw R */
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,0,3); pushEdge(edges,2,3);
    pushEdge(edges,3,4); pushEdge(edges,3,5); pushEdge(edges,4,5);
  } else if (subIdx === 3){              /* Spider: body + 6 legs */
    nodes.push([50,50]);
    const legs = polygon(50, 50, 34, 6, 0);
    for (const l of legs) nodes.push(l);
    for (let i=1;i<=6;i++) pushEdge(edges, 0, i);
    /* body outline */
    pushEdge(edges, 1, 2); pushEdge(edges, 4, 5);
  } else {                                /* Butterfly: 4 wings + body */
    nodes.push([50,50]);                 /* body */
    nodes.push([25,25]); pushEdge(edges,0,1);
    nodes.push([75,25]); pushEdge(edges,0,2);
    nodes.push([25,75]); pushEdge(edges,0,3);
    nodes.push([75,75]); pushEdge(edges,0,4);
    pushEdge(edges,1,2); pushEdge(edges,3,4);
    pushEdge(edges,1,3); pushEdge(edges,2,4);
  }
  return { nodes, edges };
}

/* -- Transport --------------------------------------------------- */
function archTransport(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Car: body + 2 wheels */
    nodes.push([25,50]);                 /* body L */
    nodes.push([50,35]);                 /* roof L */
    nodes.push([70,35]);                 /* roof R */
    nodes.push([80,50]);                 /* body R */
    nodes.push([30,70]);                 /* wheel L */
    nodes.push([70,70]);                 /* wheel R */
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3);
    pushEdge(edges,0,4); pushEdge(edges,3,5); pushEdge(edges,4,5);
    pushEdge(edges,0,3);
  } else if (subIdx === 1){              /* Rocket: pointed top + fins */
    nodes.push([50,10]);                 /* tip */
    nodes.push([35,30]);
    nodes.push([65,30]);
    nodes.push([35,70]);
    nodes.push([65,70]);
    nodes.push([25,85]);                 /* fin L */
    nodes.push([75,85]);                 /* fin R */
    pushEdge(edges,0,1); pushEdge(edges,0,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
    pushEdge(edges,3,5); pushEdge(edges,4,6);
  } else if (subIdx === 2){              /* Boat: hull + sail */
    nodes.push([20,70]);                 /* hull L */
    nodes.push([80,70]);                 /* hull R */
    nodes.push([50,80]);                 /* keel */
    nodes.push([50,20]);                 /* sail top */
    nodes.push([50,55]);                 /* mast base */
    nodes.push([70,45]);                 /* sail R */
    pushEdge(edges,0,2); pushEdge(edges,1,2); pushEdge(edges,0,1);
    pushEdge(edges,3,4); pushEdge(edges,3,5); pushEdge(edges,4,5);
  } else if (subIdx === 3){              /* Plane: body + wings */
    nodes.push([15,50]);                 /* nose */
    nodes.push([85,50]);                 /* tail */
    nodes.push([50,50]);                 /* body centre */
    nodes.push([50,25]);                 /* top wing */
    nodes.push([50,75]);                 /* bottom wing */
    nodes.push([80,30]);                 /* tail fin */
    pushEdge(edges,0,2); pushEdge(edges,2,1);
    pushEdge(edges,2,3); pushEdge(edges,2,4);
    pushEdge(edges,1,5);
  } else {                                /* Train: linked boxes */
    for (let i=0;i<3;i++){
      const bx = 18 + i*24;
      nodes.push([bx, 45]);              /* top-left */
      nodes.push([bx+16, 45]);           /* top-right */
    }
    /* base */
    for (let i=0;i<3;i++){
      const bx = 18 + i*24;
      nodes.push([bx+8, 75]);            /* wheel */
    }
    /* Wire: top rail */
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3);
    pushEdge(edges,3,4); pushEdge(edges,4,5);
    /* Down to wheels */
    pushEdge(edges,0,6); pushEdge(edges,2,7); pushEdge(edges,4,8);
    pushEdge(edges,6,7); pushEdge(edges,7,8);
  }
  return { nodes, edges };
}

/* -- Objects ------------------------------------------------------ */
function archObject(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Key */
    nodes.push([25,50]); nodes.push([35,35]); nodes.push([35,65]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    nodes.push([50,50]); nodes.push([65,50]); nodes.push([80,50]);
    pushEdge(edges,0,3); pushEdge(edges,3,4); pushEdge(edges,4,5);
    /* teeth */
    nodes.push([65,60]); pushEdge(edges,4,6);
  } else if (subIdx === 1){              /* Umbrella */
    nodes.push([50,15]);
    nodes.push([25,45]); nodes.push([40,45]); nodes.push([60,45]); nodes.push([75,45]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,0,3); pushEdge(edges,0,4);
    pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4);
    nodes.push([50,80]);                 /* handle */
    pushEdge(edges,0,5);
  } else if (subIdx === 2){              /* Cup */
    nodes.push([25,25]); nodes.push([75,25]);
    nodes.push([25,75]); nodes.push([75,75]);
    nodes.push([85,50]);                 /* handle */
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,2,3);
    pushEdge(edges,1,3); pushEdge(edges,1,4); pushEdge(edges,4,3);
  } else if (subIdx === 3){              /* Lamp */
    nodes.push([50,15]); nodes.push([30,30]); nodes.push([70,30]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    nodes.push([50,55]); pushEdge(edges,0,3);
    nodes.push([30,85]); nodes.push([70,85]);
    pushEdge(edges,3,4); pushEdge(edges,3,5); pushEdge(edges,4,5);
  } else {                                /* Clock: circle-ish + hands */
    const p = polygon(50, 50, 30, 6, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
    nodes.push([50,50]);
    pushEdge(edges, 6, 0); pushEdge(edges, 6, 3);
  }
  return { nodes, edges };
}

/* -- Symbols ------------------------------------------------------ */
function archSymbol(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Heart */
    nodes.push([50,85]);                 /* tip */
    nodes.push([25,55]);                 /* L bottom */
    nodes.push([75,55]);                 /* R bottom */
    nodes.push([25,30]);                 /* L top lobe */
    nodes.push([75,30]);                 /* R top lobe */
    nodes.push([50,40]);                 /* dip */
    pushEdge(edges,0,1); pushEdge(edges,0,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4);
    pushEdge(edges,3,5); pushEdge(edges,4,5);
  } else if (subIdx === 1){              /* Cross / plus */
    nodes.push([50,15]); nodes.push([50,40]); nodes.push([50,60]); nodes.push([50,85]);
    nodes.push([25,50]); nodes.push([75,50]);
    pushEdge(edges,0,1); pushEdge(edges,1,4); pushEdge(edges,1,5); pushEdge(edges,1,2);
    pushEdge(edges,2,3); pushEdge(edges,4,2); pushEdge(edges,5,2);
  } else if (subIdx === 2){              /* Arrow */
    nodes.push([15,50]);                 /* tail */
    nodes.push([60,50]);                 /* head base */
    nodes.push([80,50]);                 /* tip */
    nodes.push([60,30]);                 /* barb up */
    nodes.push([60,70]);                 /* barb down */
    pushEdge(edges,0,1); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,1,4);
    pushEdge(edges,3,2); pushEdge(edges,4,2);
  } else if (subIdx === 3){              /* Yin-yang-ish two loops */
    const l1 = polygon(35, 50, 18, 4, 0);
    const l2 = polygon(65, 50, 18, 4, 0);
    for (const p of l1) nodes.push(p);
    for (const p of l2) nodes.push(p);
    for (let i=0;i<4;i++) pushEdge(edges, i, (i+1)%4);
    for (let i=0;i<4;i++) pushEdge(edges, 4+i, 4+((i+1)%4));
    pushEdge(edges, 1, 4);               /* bridge */
  } else {                                /* Infinity */
    nodes.push([50,50]);
    nodes.push([25,35]); nodes.push([25,65]);
    nodes.push([75,35]); nodes.push([75,65]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,0,3); pushEdge(edges,0,4); pushEdge(edges,3,4);
  }
  return { nodes, edges };
}

/* -- Letters ------------------------------------------------------ */
function archLetter(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* A */
    nodes.push([25,85]); nodes.push([50,15]); nodes.push([75,85]);
    nodes.push([38,50]); nodes.push([62,50]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,3,4);
    pushEdge(edges,0,3); pushEdge(edges,2,4);
  } else if (subIdx === 1){              /* H */
    nodes.push([25,15]); nodes.push([25,50]); nodes.push([25,85]);
    nodes.push([75,15]); nodes.push([75,50]); nodes.push([75,85]);
    pushEdge(edges,0,1); pushEdge(edges,1,2);
    pushEdge(edges,3,4); pushEdge(edges,4,5);
    pushEdge(edges,1,4);
  } else if (subIdx === 2){              /* K */
    nodes.push([25,15]); nodes.push([25,50]); nodes.push([25,85]);
    nodes.push([70,15]); nodes.push([70,85]);
    pushEdge(edges,0,1); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,1,4);
  } else if (subIdx === 3){              /* M */
    nodes.push([15,85]); nodes.push([15,20]); nodes.push([50,55]);
    nodes.push([85,20]); nodes.push([85,85]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4);
  } else {                                /* Z */
    nodes.push([20,20]); nodes.push([80,20]); nodes.push([20,80]); nodes.push([80,80]);
    nodes.push([50,50]);
    pushEdge(edges,0,1); pushEdge(edges,1,4); pushEdge(edges,4,2); pushEdge(edges,2,3);
  }
  return { nodes, edges };
}

/* -- Numbers ------------------------------------------------------ */
function archNumber(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* 4 */
    nodes.push([30,15]); nodes.push([30,55]); nodes.push([75,55]);
    nodes.push([70,15]); nodes.push([70,85]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4);
  } else if (subIdx === 1){              /* 7 (loops-in-tail variant) */
    nodes.push([20,20]); nodes.push([80,20]); nodes.push([40,80]);
    nodes.push([50,50]); nodes.push([60,60]);
    pushEdge(edges,0,1); pushEdge(edges,1,3); pushEdge(edges,3,2);
    pushEdge(edges,3,4); pushEdge(edges,4,2);
  } else if (subIdx === 2){              /* 8 */
    nodes.push([50,25]); nodes.push([30,45]); nodes.push([70,45]);
    nodes.push([30,75]); nodes.push([70,75]); nodes.push([50,60]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,5); pushEdge(edges,2,5);
    pushEdge(edges,5,3); pushEdge(edges,5,4); pushEdge(edges,3,4);
  } else if (subIdx === 3){              /* 6 */
    nodes.push([70,15]); nodes.push([30,45]); nodes.push([30,75]);
    nodes.push([70,75]); nodes.push([70,45]);
    pushEdge(edges,0,1); pushEdge(edges,1,4); pushEdge(edges,1,2);
    pushEdge(edges,2,3); pushEdge(edges,3,4);
  } else {                                /* 3 */
    nodes.push([25,20]); nodes.push([70,25]); nodes.push([55,50]);
    nodes.push([70,75]); nodes.push([25,80]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4);
    pushEdge(edges,2,4);
  }
  return { nodes, edges };
}

/* -- Food --------------------------------------------------------- */
function archFood(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Apple: circle + stem */
    const p = polygon(50, 55, 28, 6, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
    nodes.push([50,15]);                 /* stem */
    pushEdge(edges, 6, 0);               /* actually connect to top */
  } else if (subIdx === 1){              /* Pizza slice: triangle + crust arc */
    nodes.push([50,15]); nodes.push([20,80]); nodes.push([80,80]);
    nodes.push([35,55]); nodes.push([65,55]); nodes.push([50,80]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,5); pushEdge(edges,5,2);
    pushEdge(edges,3,4); pushEdge(edges,0,3); pushEdge(edges,0,4);
  } else if (subIdx === 2){              /* Ice cream cone */
    nodes.push([50,15]); nodes.push([25,45]); nodes.push([75,45]);
    nodes.push([50,45]); nodes.push([50,85]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,3);
    pushEdge(edges,1,4); pushEdge(edges,2,4);
  } else if (subIdx === 3){              /* Cake: layered */
    for (let r=0;r<2;r++){
      nodes.push([25, 40 + r*25]);
      nodes.push([75, 40 + r*25]);
    }
    nodes.push([50,20]); nodes.push([50,40]);
    pushEdge(edges,0,1); pushEdge(edges,2,3);
    pushEdge(edges,0,2); pushEdge(edges,1,3);
    pushEdge(edges,4,5); pushEdge(edges,4,0); pushEdge(edges,4,1);
  } else {                                /* Donut: outer ring */
    const p = polygon(50, 50, 32, 6, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
    /* inner hole hint */
    nodes.push([50,50]);
    pushEdge(edges, 6, 0); pushEdge(edges, 6, 3);
  }
  return { nodes, edges };
}

/* -- Sports ------------------------------------------------------- */
function archSports(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Football goal: rectangle + net diag */
    nodes.push([20,25]); nodes.push([80,25]); nodes.push([20,75]); nodes.push([80,75]);
    nodes.push([50,25]); nodes.push([50,75]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,3);
    pushEdge(edges,4,5); pushEdge(edges,0,4); pushEdge(edges,1,4);
  } else if (subIdx === 1){              /* Trophy */
    nodes.push([35,15]); nodes.push([65,15]); nodes.push([25,35]); nodes.push([75,35]);
    nodes.push([50,55]); nodes.push([50,80]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
    pushEdge(edges,4,5);
  } else if (subIdx === 2){              /* Baseball diamond */
    nodes.push([50,20]); nodes.push([80,50]); nodes.push([50,80]); nodes.push([20,50]);
    nodes.push([50,50]);
    for (let i=0;i<4;i++) pushEdge(edges, i, (i+1)%4);
    pushEdge(edges,0,4); pushEdge(edges,2,4);
  } else if (subIdx === 3){              /* Racket */
    const p = polygon(50, 35, 20, 5, -Math.PI/2);
    for (const n of p) nodes.push(n);
    for (let i=0;i<5;i++) pushEdge(edges, i, (i+1)%5);
    nodes.push([50,80]);
    pushEdge(edges,2,5);
  } else {                                /* Podium: 3 blocks */
    nodes.push([20,60]); nodes.push([40,60]); nodes.push([40,45]); nodes.push([60,45]);
    nodes.push([60,55]); nodes.push([80,55]);
    nodes.push([20,85]); nodes.push([80,85]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4); pushEdge(edges,4,5);
    pushEdge(edges,0,6); pushEdge(edges,5,7); pushEdge(edges,6,7);
  }
  return { nodes, edges };
}

/* -- Space -------------------------------------------------------- */
function archSpace(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Planet with ring */
    const p = polygon(50, 50, 22, 6, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
    nodes.push([15,50]); nodes.push([85,50]);
    pushEdge(edges, 3, 6); pushEdge(edges, 0, 7);
  } else if (subIdx === 1){              /* UFO */
    nodes.push([15,50]); nodes.push([85,50]); nodes.push([50,40]); nodes.push([50,25]);
    nodes.push([30,60]); nodes.push([70,60]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2); pushEdge(edges,2,3);
    pushEdge(edges,0,4); pushEdge(edges,1,5); pushEdge(edges,4,5);
  } else if (subIdx === 2){              /* Comet */
    nodes.push([75,30]);                 /* head */
    nodes.push([65,45]); nodes.push([85,45]);
    nodes.push([50,60]); nodes.push([30,75]); nodes.push([15,85]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,0,3); pushEdge(edges,3,4); pushEdge(edges,4,5);
  } else if (subIdx === 3){              /* Constellation */
    nodes.push([20,20]); nodes.push([40,30]); nodes.push([60,20]); nodes.push([80,35]);
    nodes.push([50,55]); nodes.push([30,75]); nodes.push([70,75]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4);
    pushEdge(edges,4,5); pushEdge(edges,4,6); pushEdge(edges,1,4);
  } else {                                /* Satellite */
    nodes.push([50,50]);
    nodes.push([25,35]); nodes.push([75,35]); nodes.push([25,65]); nodes.push([75,65]);
    nodes.push([50,20]); nodes.push([50,80]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,0,3); pushEdge(edges,0,4);
    pushEdge(edges,0,5); pushEdge(edges,0,6);
    pushEdge(edges,1,3); pushEdge(edges,2,4);
  }
  return { nodes, edges };
}

/* -- Technology --------------------------------------------------- */
function archTech(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Chip: square + pins */
    nodes.push([30,30]); nodes.push([70,30]); nodes.push([30,70]); nodes.push([70,70]);
    nodes.push([15,40]); nodes.push([15,60]); nodes.push([85,40]); nodes.push([85,60]);
    for (let i=0;i<4;i++) for (let j=i+1;j<4;j++){
      const [ax,ay]=nodes[i], [bx,by]=nodes[j];
      if (Math.abs(ax-bx) < 45 && Math.abs(ay-by) < 45) pushEdge(edges, i, j);
    }
    pushEdge(edges,0,4); pushEdge(edges,2,5);
    pushEdge(edges,1,6); pushEdge(edges,3,7);
  } else if (subIdx === 1){              /* Circuit: node + traces */
    nodes.push([20,50]); nodes.push([50,20]); nodes.push([80,50]);
    nodes.push([50,80]); nodes.push([50,50]);
    pushEdge(edges,0,4); pushEdge(edges,1,4); pushEdge(edges,2,4); pushEdge(edges,3,4);
    pushEdge(edges,0,1); pushEdge(edges,2,3);
  } else if (subIdx === 2){              /* Phone: rectangle + button */
    nodes.push([35,15]); nodes.push([65,15]); nodes.push([35,80]); nodes.push([65,80]);
    nodes.push([35,45]); nodes.push([65,45]);
    pushEdge(edges,0,1); pushEdge(edges,0,4); pushEdge(edges,1,5);
    pushEdge(edges,4,5); pushEdge(edges,4,2); pushEdge(edges,5,3); pushEdge(edges,2,3);
  } else if (subIdx === 3){              /* Wifi arcs */
    nodes.push([50,80]);                 /* device */
    nodes.push([35,60]); nodes.push([65,60]);
    nodes.push([25,45]); nodes.push([75,45]);
    nodes.push([15,30]); nodes.push([85,30]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
    pushEdge(edges,3,5); pushEdge(edges,4,6);
  } else {                                /* Robot head */
    nodes.push([30,25]); nodes.push([70,25]); nodes.push([30,60]); nodes.push([70,60]);
    nodes.push([50,42]);                 /* nose */
    nodes.push([40,80]); nodes.push([60,80]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,3);
    pushEdge(edges,0,4); pushEdge(edges,1,4);
    pushEdge(edges,2,5); pushEdge(edges,3,6); pushEdge(edges,5,6);
  }
  return { nodes, edges };
}

/* -- Music -------------------------------------------------------- */
function archMusic(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Music note: circle head + stem */
    const p = polygon(35, 70, 12, 4, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<4;i++) pushEdge(edges, i, (i+1)%4);
    nodes.push([45,70]); nodes.push([45,20]); nodes.push([65,15]);
    pushEdge(edges,1,4); pushEdge(edges,4,5); pushEdge(edges,5,6);
  } else if (subIdx === 1){              /* Guitar body + neck */
    const p = polygon(35, 65, 22, 5, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<5;i++) pushEdge(edges, i, (i+1)%5);
    nodes.push([70,35]); nodes.push([85,15]);
    pushEdge(edges,2,5); pushEdge(edges,5,6);
  } else if (subIdx === 2){              /* Drum: circle + sticks */
    const p = polygon(50, 55, 25, 6, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
    nodes.push([15,15]);
    pushEdge(edges, 4, 6);
  } else if (subIdx === 3){              /* Piano keys */
    for (let i=0;i<5;i++) nodes.push([20 + i*15, 40]);
    for (let i=0;i<5;i++) nodes.push([20 + i*15, 75]);
    for (let i=0;i<4;i++) pushEdge(edges, i, i+1);
    for (let i=0;i<4;i++) pushEdge(edges, 5+i, 5+i+1);
    pushEdge(edges, 0, 5); pushEdge(edges, 4, 9);
  } else {                                /* Speaker */
    nodes.push([30,25]); nodes.push([70,25]); nodes.push([30,75]); nodes.push([70,75]);
    nodes.push([50,45]); nodes.push([50,60]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,3);
    pushEdge(edges,0,4); pushEdge(edges,1,4); pushEdge(edges,2,5); pushEdge(edges,3,5);
  }
  return { nodes, edges };
}

/* -- Fantasy ------------------------------------------------------ */
function archFantasy(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Castle: 3 towers */
    for (let i=0;i<3;i++){
      const bx = 22 + i*28;
      nodes.push([bx-5, 30]); nodes.push([bx+5, 30]);
      nodes.push([bx-5, 70]); nodes.push([bx+5, 70]);
    }
    /* connect towers along the top */
    for (let i=0;i<3;i++){
      const b = i*4;
      pushEdge(edges,b,b+1); pushEdge(edges,b,b+2); pushEdge(edges,b+1,b+3); pushEdge(edges,b+2,b+3);
    }
    pushEdge(edges,1,4); pushEdge(edges,5,8);
    /* Trim to keep node count sane */
    /* keep first 8 to satisfy variety without oversizing */
    while (nodes.length > 10){ nodes.pop(); }
    const cleaned = normalizeEdges(edges).filter(([a,b])=> a<nodes.length && b<nodes.length);
    edges.length = 0; for (const e of cleaned) edges.push(e);
  } else if (subIdx === 1){              /* Wizard hat: triangle + brim */
    nodes.push([50,15]); nodes.push([30,55]); nodes.push([70,55]);
    nodes.push([15,65]); nodes.push([85,65]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
  } else if (subIdx === 2){              /* Dragon head simplified */
    nodes.push([15,55]); nodes.push([30,35]); nodes.push([55,25]); nodes.push([75,40]);
    nodes.push([80,60]); nodes.push([60,70]); nodes.push([30,75]);
    for (let i=0;i<6;i++) pushEdge(edges, i, i+1);
    pushEdge(edges, 6, 0);
  } else if (subIdx === 3){              /* Sword */
    nodes.push([50,15]); nodes.push([40,55]); nodes.push([60,55]);
    nodes.push([25,60]); nodes.push([75,60]);
    nodes.push([50,85]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,1,3); pushEdge(edges,2,4); pushEdge(edges,3,4);
    pushEdge(edges,1,5); pushEdge(edges,2,5);
  } else {                                /* Crown */
    nodes.push([20,60]); nodes.push([35,25]); nodes.push([50,55]);
    nodes.push([65,25]); nodes.push([80,60]);
    nodes.push([20,80]); nodes.push([80,80]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4);
    pushEdge(edges,0,5); pushEdge(edges,4,6); pushEdge(edges,5,6);
  }
  return { nodes, edges };
}

/* -- Mechanical --------------------------------------------------- */
function archMech(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Gear (6-tooth) */
    const p = polygon(50, 50, 30, 6, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
    nodes.push([50,50]);
    pushEdge(edges, 6, 0); pushEdge(edges, 6, 2); pushEdge(edges, 6, 4);
  } else if (subIdx === 1){              /* Two connected gears */
    const p1 = polygon(30, 50, 18, 4, 0);
    const p2 = polygon(70, 50, 18, 4, Math.PI/4);
    for (const n of p1) nodes.push(n);
    for (const n of p2) nodes.push(n);
    for (let i=0;i<4;i++) pushEdge(edges, i, (i+1)%4);
    for (let i=0;i<4;i++) pushEdge(edges, 4+i, 4+((i+1)%4));
    pushEdge(edges, 1, 5);
  } else if (subIdx === 2){              /* Piston: rectangle + shaft */
    nodes.push([30,25]); nodes.push([70,25]); nodes.push([30,55]); nodes.push([70,55]);
    nodes.push([50,55]); nodes.push([50,85]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,3);
    pushEdge(edges,2,4); pushEdge(edges,3,4); pushEdge(edges,4,5);
  } else if (subIdx === 3){              /* Spring: zigzag */
    nodes.push([20,20]); nodes.push([60,30]); nodes.push([25,45]);
    nodes.push([65,55]); nodes.push([30,70]); nodes.push([70,80]);
    for (let i=0;i<5;i++) pushEdge(edges, i, i+1);
    pushEdge(edges,0,2); pushEdge(edges,3,5);
  } else {                                /* Wrench */
    nodes.push([25,25]); nodes.push([45,25]); nodes.push([25,45]); nodes.push([45,45]);
    nodes.push([55,55]); nodes.push([75,75]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,3);
    pushEdge(edges,3,4); pushEdge(edges,4,5);
  }
  return { nodes, edges };
}

/* -- Patterns ----------------------------------------------------- */
function archPattern(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* 3x3 grid corners + centre */
    for (let r=0;r<3;r++) for (let c=0;c<3;c++) nodes.push([25 + c*25, 25 + r*25]);
    /* Hamiltonian-like path */
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,5); pushEdge(edges,5,4);
    pushEdge(edges,4,3); pushEdge(edges,3,6); pushEdge(edges,6,7); pushEdge(edges,7,8);
    pushEdge(edges,4,7);
  } else if (subIdx === 1){              /* Rings */
    const p1 = polygon(50, 50, 30, 5, 0);
    for (const n of p1) nodes.push(n);
    for (let i=0;i<5;i++) pushEdge(edges, i, (i+1)%5);
    nodes.push([50,50]);
    for (let i=0;i<5;i+=2) pushEdge(edges, 5, i);
  } else if (subIdx === 2){              /* Star polygon */
    const p = polygon(50, 50, 34, 5, -Math.PI/2);
    for (const n of p) nodes.push(n);
    pushEdge(edges,0,2); pushEdge(edges,2,4); pushEdge(edges,4,1); pushEdge(edges,1,3); pushEdge(edges,3,0);
  } else if (subIdx === 3){              /* Windmill: cross + arms */
    nodes.push([50,50]);
    const arms = polygon(50, 50, 30, 4, 0);
    for (const n of arms) nodes.push(n);
    for (let i=1;i<=4;i++) pushEdge(edges, 0, i);
    pushEdge(edges,1,2); pushEdge(edges,3,4);
  } else {                                /* Weaving pattern */
    for (let i=0;i<4;i++) nodes.push([20 + i*20, 30]);
    for (let i=0;i<4;i++) nodes.push([20 + i*20, 70]);
    for (let i=0;i<4;i++) pushEdge(edges, i, i+4);
    pushEdge(edges,0,1); pushEdge(edges,5,6); pushEdge(edges,2,3); pushEdge(edges,4,7);
  }
  return { nodes, edges };
}

/* -- Maze --------------------------------------------------------- */
function archMaze(N, rand, subIdx){
  /* Small L / T / snake mazes */
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Snake path with a loop */
    nodes.push([20,20]); nodes.push([80,20]); nodes.push([80,45]); nodes.push([20,45]);
    nodes.push([20,70]); nodes.push([80,70]);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,3); pushEdge(edges,3,4); pushEdge(edges,4,5);
    pushEdge(edges,0,3);
  } else if (subIdx === 1){              /* Cross-junction maze */
    nodes.push([50,15]); nodes.push([50,45]); nodes.push([50,75]);
    nodes.push([20,45]); nodes.push([80,45]);
    nodes.push([20,75]); nodes.push([80,75]);
    pushEdge(edges,0,1); pushEdge(edges,1,3); pushEdge(edges,1,4); pushEdge(edges,1,2);
    pushEdge(edges,3,5); pushEdge(edges,4,6); pushEdge(edges,2,5); pushEdge(edges,2,6);
  } else if (subIdx === 2){              /* Cell walls */
    for (let r=0;r<2;r++) for (let c=0;c<3;c++) nodes.push([25+c*25, 30+r*30]);
    pushEdge(edges,0,1); pushEdge(edges,1,2);
    pushEdge(edges,3,4); pushEdge(edges,4,5);
    pushEdge(edges,0,3); pushEdge(edges,2,5);
  } else if (subIdx === 3){              /* Zigzag */
    nodes.push([15,15]); nodes.push([50,15]); nodes.push([50,40]); nodes.push([85,40]);
    nodes.push([85,60]); nodes.push([50,60]); nodes.push([50,85]); nodes.push([15,85]);
    for (let i=0;i<7;i++) pushEdge(edges, i, i+1);
    pushEdge(edges, 0, 7);
  } else {                                /* Split-path */
    nodes.push([20,50]); nodes.push([40,30]); nodes.push([40,70]);
    nodes.push([60,30]); nodes.push([60,70]); nodes.push([80,50]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,3); pushEdge(edges,2,4);
    pushEdge(edges,3,5); pushEdge(edges,4,5); pushEdge(edges,1,2); pushEdge(edges,3,4);
  }
  return { nodes, edges };
}

/* -- Abstract ----------------------------------------------------- */
function archAbstract(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* Complete K4 */
    nodes.push([50,15]); nodes.push([85,60]); nodes.push([50,85]); nodes.push([15,60]);
    for (let i=0;i<4;i++) for (let j=i+1;j<4;j++) pushEdge(edges, i, j);
  } else if (subIdx === 1){              /* Two triangles + bridge */
    nodes.push([25,20]); nodes.push([50,45]); nodes.push([25,70]);
    nodes.push([75,20]); nodes.push([50,45+0]); nodes.push([75,70]);
    /* dedupe centre */
    nodes.pop();
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,0,2);
    pushEdge(edges,3,1); pushEdge(edges,1,4); pushEdge(edges,3,4);
  } else if (subIdx === 2){              /* Wheel with 5 spokes */
    nodes.push([50,50]);
    const rim = polygon(50, 50, 32, 5, -Math.PI/2);
    for (const n of rim) nodes.push(n);
    for (let i=1;i<=5;i++) pushEdge(edges, 0, i);
    for (let i=1;i<=5;i++) pushEdge(edges, i, (i%5)+1);
  } else if (subIdx === 3){              /* Chain of loops */
    const p1 = polygon(30, 50, 18, 3, 0);
    const p2 = polygon(70, 50, 18, 3, Math.PI);
    for (const n of p1) nodes.push(n);
    for (const n of p2) nodes.push(n);
    pushEdge(edges,0,1); pushEdge(edges,1,2); pushEdge(edges,2,0);
    pushEdge(edges,3,4); pushEdge(edges,4,5); pushEdge(edges,5,3);
    pushEdge(edges,2,3);
  } else {                                /* Flow: dumbbell */
    nodes.push([20,50]); nodes.push([35,30]); nodes.push([35,70]);
    nodes.push([65,30]); nodes.push([65,70]); nodes.push([80,50]);
    pushEdge(edges,0,1); pushEdge(edges,0,2); pushEdge(edges,1,2);
    pushEdge(edges,3,4); pushEdge(edges,3,5); pushEdge(edges,4,5);
    pushEdge(edges,1,3); pushEdge(edges,2,4);
  }
  return { nodes, edges };
}

/* -- Master (endgame, complex topologies) ------------------------- */
function archMaster(N, rand, subIdx){
  subIdx = subIdx % 5;
  const nodes = [], edges = [];
  if (subIdx === 0){                     /* K5-ish: pentagon + all chords */
    const p = polygon(50, 50, 34, 5, -Math.PI/2);
    for (const n of p) nodes.push(n);
    for (let i=0;i<5;i++) for (let j=i+1;j<5;j++) pushEdge(edges, i, j);
  } else if (subIdx === 1){              /* Petersen-inspired */
    const outer = polygon(50, 50, 34, 5, -Math.PI/2);
    const inner = polygon(50, 50, 15, 5, -Math.PI/2);
    for (const n of outer) nodes.push(n);
    for (const n of inner) nodes.push(n);
    for (let i=0;i<5;i++) pushEdge(edges, i, (i+1)%5);
    for (let i=0;i<5;i++) pushEdge(edges, i, i+5);
    pushEdge(edges,5,7); pushEdge(edges,7,9); pushEdge(edges,9,6); pushEdge(edges,6,8); pushEdge(edges,8,5);
  } else if (subIdx === 2){              /* 3x3 grid, dense */
    for (let r=0;r<3;r++) for (let c=0;c<3;c++) nodes.push([25 + c*25, 25 + r*25]);
    for (let r=0;r<3;r++) for (let c=0;c<2;c++) pushEdge(edges, r*3+c, r*3+c+1);
    for (let r=0;r<2;r++) for (let c=0;c<3;c++) pushEdge(edges, r*3+c, (r+1)*3+c);
    pushEdge(edges,0,4); pushEdge(edges,4,8);
  } else if (subIdx === 3){              /* Double-hex fusion */
    const p = polygon(35, 50, 20, 6, 0);
    for (const n of p) nodes.push(n);
    for (let i=0;i<6;i++) pushEdge(edges, i, (i+1)%6);
    nodes.push([75,50]);
    pushEdge(edges, 0, 6); pushEdge(edges, 3, 6);
  } else {                                /* Bipartite K3,3 (Kuratowski) */
    for (let i=0;i<3;i++) nodes.push([25 + i*25, 25]);
    for (let i=0;i<3;i++) nodes.push([25 + i*25, 75]);
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) pushEdge(edges, i, 3+j);
  }
  return { nodes, edges };
}

/* Bank of archetype builders per category */
const ARCH = [
  archGeometric, archHouse, archNature, archAnimal, archTransport,
  archObject, archSymbol, archLetter, archNumber, archFood,
  archSports, archSpace, archTech, archMusic, archFantasy,
  archMech, archPattern, archMaze, archAbstract, archMaster,
];

/* Sub-variant labels for a small "you're solving X" hint (used for the
   badge subtitle). We keep them short & flavourful. */
const SUB_LABELS = [
  ['Pentagon','Hexagon','Star','Kite','Bowtie'],                      /* Geometric */
  ['Cottage','Tower','Chapel','Village','Skyscraper'],                /* House */
  ['Tree','Flower','Mountain','Snowflake','Leaf'],                    /* Nature */
  ['Fish','Bird','Cat','Spider','Butterfly'],                         /* Animals */
  ['Car','Rocket','Boat','Plane','Train'],                            /* Transport */
  ['Key','Umbrella','Cup','Lamp','Clock'],                            /* Objects */
  ['Heart','Cross','Arrow','Twin Loops','Infinity'],                  /* Symbols */
  ['Letter A','Letter H','Letter K','Letter M','Letter Z'],           /* Letters */
  ['Four','Seven','Eight','Six','Three'],                             /* Numbers */
  ['Apple','Pizza','Cone','Cake','Donut'],                            /* Food */
  ['Goal','Trophy','Diamond','Racket','Podium'],                      /* Sports */
  ['Planet','UFO','Comet','Constellation','Satellite'],               /* Space */
  ['Chip','Circuit','Phone','Wi-Fi','Robot'],                         /* Tech */
  ['Note','Guitar','Drum','Piano','Speaker'],                         /* Music */
  ['Castle','Wizard Hat','Dragon','Sword','Crown'],                   /* Fantasy */
  ['Gear','Twin Gears','Piston','Spring','Wrench'],                   /* Mechanical */
  ['Grid Path','Ringed','Star Polygon','Windmill','Weave'],           /* Patterns */
  ['Snake','Junction','Cells','Zigzag','Split Path'],                 /* Maze */
  ['K4','Twin Triangles','Wheel','Chain Loops','Dumbbell'],           /* Abstract */
  ['K5','Petersen','Grid Dense','Double Hex','K3,3'],                 /* Master */
];

/* -----------------------------------------------------------------
   Public: build a puzzle graph from a shape metadata row + seed
   Returns { nodes, edges, nCount, category, difficulty, subLabel,
             timeSec, diff }  or null on failure.
   ----------------------------------------------------------------- */
function buildFromShape(metaObj, seedIn){
  const rand = rng(seedIn >>> 0);
  const catIdx = metaObj.catIdx;
  const archFn = ARCH[catIdx];
  if (!archFn) return null;
  const subIdx = Math.floor(rand() * 5);       /* pick one of 5 sub-archetypes */

  /* Build base graph */
  let g;
  try { g = archFn(metaObj.nodes, rand, subIdx); }
  catch (e) { return null; }
  if (!g || !g.nodes || !g.edges || g.nodes.length < 3) return null;

  /* Normalize & clone into fresh arrays */
  let nodes = g.nodes.map(([x,y]) => [x,y]);
  let edges = normalizeEdges(g.edges);

  /* Resize toward target */
  ({ nodes, edges } = resizeToTarget(nodes, edges, metaObj.nodes, rand));

  /* Optional distractor edge on Medium+ (only 40% of the time) */
  if (metaObj.diffIdx >= 1 && rand() < 0.45){
    addDistractorEdge(nodes, edges, rand);
  }

  /* Apply visual variations */
  nodes = applyVariations(nodes, rand, {});

  /* Ensure connected + Euler path. If parity fails, add compensating edges. */
  if (!isConnected(edges, nodes.length)){
    /* Connect any disconnected components via nearest bridge */
    let guard = 20;
    while (!isConnected(edges, nodes.length) && guard-- > 0){
      const seen = new Set([0]); const q = [0];
      const adj = Array.from({length:nodes.length}, ()=>[]);
      for (const [a,b] of edges){ adj[a].push(b); adj[b].push(a); }
      while (q.length){ const u=q.shift(); for (const v of adj[u]) if (!seen.has(v)){seen.add(v);q.push(v);}}
      const outside = [];
      for (let i=0;i<nodes.length;i++) if (!seen.has(i)) outside.push(i);
      if (!outside.length) break;
      /* Bridge to the nearest inside node */
      let best = null, bestD = Infinity;
      for (const o of outside) for (const s of seen){
        const [ox,oy] = nodes[o], [sx,sy] = nodes[s];
        const D = Math.hypot(ox-sx, oy-sy);
        if (D < bestD){ bestD = D; best = [s, o]; }
      }
      if (best) pushEdge(edges, best[0], best[1]); else break;
    }
  }

  if (!fixParity(nodes, edges)) return null;
  if (!hasEulerPath(edges, nodes.length)) return null;

  /* Round metadata coordinates to 1 decimal for compact rendering */
  nodes = nodes.map(([x,y]) => [+x.toFixed(1), +y.toFixed(1)]);

  return {
    nodes,
    edges,
    nCount    : nodes.length,
    category  : metaObj.category,
    catIdx    : metaObj.catIdx,
    difficulty: metaObj.difficulty,
    diffIdx   : metaObj.diffIdx,
    timeSec   : metaObj.time,
    subLabel  : (SUB_LABELS[catIdx] && SUB_LABELS[catIdx][subIdx]) || metaObj.category,
    shapeId   : metaObj.id,
  };
}

/* -----------------------------------------------------------------
   pickShape(round, seed, avoidCatSet)
   Chooses a metadata row for the given round, avoiding categories in
   `avoidCatSet` when possible.
     - Round <= 20 -> Easy pool
     - Round <= 45 -> Medium pool
     - Round <= 80 -> Hard pool
     - Round >  80 -> Master pool
   ----------------------------------------------------------------- */
function pickShape(round, seedIn, avoidCatSet){
  const rand = rng(seedIn >>> 0);
  let targetDiffIdx;
  if      (round <= 20) targetDiffIdx = 0;
  else if (round <= 45) targetDiffIdx = 1;
  else if (round <= 80) targetDiffIdx = 2;
  else                  targetDiffIdx = 3;

  /* Also allow 15% chance to bump one tier below/above for variety */
  const jitter = rand();
  if (jitter < 0.15 && targetDiffIdx > 0) targetDiffIdx--;
  else if (jitter > 0.90 && targetDiffIdx < 3) targetDiffIdx++;

  let pool = LIB.filter(r => r[2] === targetDiffIdx);
  if (!pool.length) pool = LIB.slice();

  /* Avoid recently-used categories when possible */
  const avoid = avoidCatSet || new Set();
  const filtered = pool.filter(r => !avoid.has(r[1]));
  const finalPool = filtered.length ? filtered : pool;

  const row = finalPool[Math.floor(rand() * finalPool.length)];
  return meta(row);
}

/* Expose */
window.MT_SHAPES = {
  library     : LIB,
  CATS        : CATS,
  DIFFS       : DIFFS,
  meta        : meta,
  buildFromShape : buildFromShape,
  pickShape   : pickShape,
  validateEuler : hasEulerPath,
  _internal   : { rng, applyVariations, fixParity, ARCH, SUB_LABELS },
};

})();
