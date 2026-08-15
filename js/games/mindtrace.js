/* =====================================================================
   Mind Trace — Premium Canvas Redesign v3
   ---------------------------------------------------------------------
   Contract with NeuroZen (DO NOT CHANGE):
     playMindTrace(body, setScore, end, wrap, startClock)
        body        : container element for the game body
        setScore(n) : updates gs-score in the header
        end(opts)   : ends the game via app.js endGame()
                      opts = { value, points, starThresh, summary (used
                              as statsHtml), timeOverride? }
        wrap        : outer game-screen element
        startClock(): starts the header stopwatch
     Save keys used:  nz_best_scores.mindtrace  (already tracked)
                      nz_game_plays.mindtrace   (already tracked)
                      nz_mt_stats (new — Mind Trace only long-term stats)
   ===================================================================== */

function playMindTrace(body, setScore, end, wrap, startClock) {

  /* =================================================================
     GLOBAL CONFIG
     ================================================================= */
  const CFG = {
    boardMinPx      : 300,
    boardMaxPx      : 520,
    nodeR           : 13,          // base node radius
    snap            : 42,          // touch snap radius
    padPct          : 10,          // % of board reserved as padding
    minNodeGap      : 15,          // min distance between 2 nodes (% units)
    freeLifts       : 1,           // lifts allowed per puzzle before a life is lost
    hintsPerRun     : 3,           // hints available in one run
    deadEndPenalty  : 3,           // seconds removed when a dead end is auto-reset
    assistRounds    : 5,           // rounds where route-breaking moves are blocked
    // Difficulty scaling by round
    diffCap         : (r) => r <= 5  ? 1
                            : r <= 10 ? 2
                            : r <= 20 ? 3
                            : r <= 35 ? 4
                            :           5,
    // Base puzzle time (seconds) per difficulty tier
    puzzleTime      : (d) => [0, 20, 22, 25, 28, 32][d] || 25,
    planTime        : (d) => [0, 2.0, 2.4, 2.8, 3.2, 3.6][d] || 2.4,
  };

  /* =================================================================
     STATS PERSISTENCE (Mind Trace only)
     ================================================================= */
  function loadStats() {
    try { return JSON.parse(localStorage.getItem('nz_mt_stats') || '{}'); }
    catch(e) { return {}; }
  }
  function saveStats(s) {
    try { localStorage.setItem('nz_mt_stats', JSON.stringify(s)); } catch(e){}
  }
  function mergeStats(g) {
    const s = loadStats();
    s.highRound       = Math.max(s.highRound       || 0, g.round);
    s.bestScore       = Math.max(s.bestScore        || 0, g.score);
    s.perfectPuzzles  = (s.perfectPuzzles  || 0) + g.perfectPuzzles;
    s.puzzlesSolved   = (s.puzzlesSolved   || 0) + g.correctAnswers;
    s.gamesPlayed     = (s.gamesPlayed     || 0) + 1;
    s.longestCombo    = Math.max(s.longestCombo    || 0, g.bestCombo);
    s.longestStreak   = Math.max(s.longestStreak   || 0, g.bestStreak);
    if (g.drawTimes.length) {
      const fastest = Math.min(...g.drawTimes);
      s.fastestPuzzleMs = s.fastestPuzzleMs
        ? Math.min(s.fastestPuzzleMs, fastest) : fastest;
    }
    s.totalDrawMs = (s.totalDrawMs || 0) + g.drawTimes.reduce((a,b)=>a+b,0);
    s.totalPlanMs = (s.totalPlanMs || 0) + g.totalPlanMs;
    s.totalPuzzlesTimed = (s.totalPuzzlesTimed || 0) + g.drawTimes.length;
    saveStats(s);
    return s;
  }

  /* =================================================================
     DAILY CHALLENGE (date-seeded)
     ================================================================= */
  function todayISO() {
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+
           '-'+String(d.getDate()).padStart(2,'0');
  }
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function dailyChallenge() {
    const seed = hashStr('mt_'+todayISO());
    const pool = [
      { id:'solve10',  icon:'🔥', title:'Solve 10 puzzles',       target:10, kind:'solve' },
      { id:'solve15',  icon:'🎯', title:'Solve 15 puzzles',       target:15, kind:'solve' },
      { id:'round20',  icon:'📈', title:'Reach round 20',         target:20, kind:'round' },
      { id:'combo5',   icon:'⚡', title:'Reach a x5 combo',       target:5,  kind:'combo' },
      { id:'perfect5', icon:'✨', title:'5 perfect puzzles',      target:5,  kind:'perfect' },
      { id:'noreset',  icon:'🧠', title:'Finish without resetting',target:1, kind:'noreset' },
      { id:'master',   icon:'💎', title:'Complete a Master puzzle',target:1, kind:'master' },
    ];
    return pool[seed % pool.length];
  }

  /* =================================================================
     PROCEDURAL PUZZLE ENGINE
     ---------------------------------------------------------------
     Generates graphs on a soft grid.  Every graph has exactly 0 or 2
     nodes of odd degree, guaranteeing a valid Euler path/circuit.
     Difficulty controls node count, extra edges, loops.
     ================================================================= */

  // Seeded RNG for reproducibility (mulberry32)
  function rng(seed) {
    let t = seed >>> 0;
    return function() {
      t = (t + 0x6D2B79F5) >>> 0;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function nodeDegrees(edges, nCount) {
    const d = new Array(nCount).fill(0);
    edges.forEach(([a,b]) => { d[a]++; d[b]++; });
    return d;
  }
  function oddNodes(edges, nCount) {
    return nodeDegrees(edges, nCount)
      .map((v,i)=>({v,i})).filter(o=>o.v%2!==0).map(o=>o.i);
  }
  // Ensure graph is connected (all nodes are reachable through edges)
  function isConnected(edges, nCount) {
    if (nCount === 0) return true;
    const adj = Array.from({length:nCount}, ()=>[]);
    edges.forEach(([a,b])=>{ adj[a].push(b); adj[b].push(a); });
    const seen = new Set([0]);
    const q = [0];
    while (q.length) {
      const u = q.shift();
      for (const v of adj[u]) if (!seen.has(v)) { seen.add(v); q.push(v); }
    }
    return seen.size === nCount;
  }
  // Euler path/circuit existence test
  function hasEulerPath(edges, nCount) {
    if (!isConnected(edges, nCount)) return false;
    const odd = oddNodes(edges, nCount).length;
    return odd === 0 || odd === 2;
  }

  /* =================================================================
     LIVE SOLVER — used for fair-play assists
     -----------------------------------------------------------------
     Everything below works on the *remaining* (untraced) sub-graph so
     the game can answer three questions at any moment:
       1. Which nodes are legal starting points?
       2. Does the move I'm about to make trap me in a dead end?
       3. Which edge should a hint reveal?
     ================================================================= */

  // Untraced edges left in the current puzzle
  function remainingEdges(tracedSet) {
    if (!G.puzzle) return [];
    return G.puzzle.edges.filter(([a,b]) => !tracedSet.has(ek(a,b)));
  }

  // Can an Euler path over `edgesLeft` be walked starting at `start`?
  function canCompleteFrom(start, edgesLeft) {
    if (!edgesLeft.length) return true;                 // already solved
    const deg = {};
    const adj = {};
    edgesLeft.forEach(([a,b]) => {
      deg[a] = (deg[a]||0)+1; deg[b] = (deg[b]||0)+1;
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    });
    if (!deg[start]) return false;                      // start is isolated
    // every edge must sit in one connected component that contains start
    const seen = new Set([start]);
    const q = [start];
    while (q.length) {
      const u = q.shift();
      for (const v of (adj[u]||[])) if (!seen.has(v)) { seen.add(v); q.push(v); }
    }
    for (const k in deg) if (!seen.has(+k)) return false;
    // degree parity: 0 odd -> circuit (start anywhere), 2 odd -> start on an odd node
    const odd = Object.keys(deg).filter(k => deg[k] % 2 !== 0).map(Number);
    if (odd.length === 0) return true;
    if (odd.length === 2) return odd.indexOf(start) !== -1;
    return false;
  }

  // All nodes the player is allowed to begin the stroke from
  function validStartNodes() {
    if (!G.puzzle) return [];
    const all = G.puzzle.edges;
    const out = [];
    for (let i=0;i<G.puzzle.nCount;i++)
      if (canCompleteFrom(i, all)) out.push(i);
    return out;
  }

  // Would walking current -> next leave the puzzle unsolvable?
  function moveWouldTrap(from, to) {
    const key = ek(from,to);
    const left = remainingEdges(G.tracedEdges).filter(([a,b]) => ek(a,b) !== key);
    return !canCompleteFrom(to, left);
  }

  // Next safe edge from the current node (used by the hint button)
  function bestNextNode(from) {
    if (!G.puzzle) return -1;
    const left = remainingEdges(G.tracedEdges);
    const nbrs = [];
    left.forEach(([a,b]) => {
      if (a === from) nbrs.push(b);
      else if (b === from) nbrs.push(a);
    });
    for (const n of nbrs) if (!moveWouldTrap(from, n)) return n;
    return nbrs.length ? nbrs[0] : -1;
  }

  // Generate a random unique graph.  We build it by:
  //   1) sampling node positions on a jittered grid
  //   2) building a random spanning tree (guarantees connectivity)
  //   3) adding extra edges based on difficulty
  //   4) if odd-node count is > 2, pair remaining odd nodes together
  //      by adding one more edge until we have 0 or 2 odd nodes.
  function generateGraph(diff, roundSeed) {
    const rand = rng(roundSeed);
    // Node counts and edge budget scaled by diff
    const nodeRange = [
      [0,0],           // diff 0 (unused)
      [5, 6],          // diff 1  — very simple, 4–5 edges
      [6, 8],          // diff 2  — branches, small loops
      [8, 10],         // diff 3  — loops + intersections
      [9, 12],         // diff 4  — complex
      [11, 14],        // diff 5  — large planning puzzles
    ][diff];
    const nCount = Math.floor(nodeRange[0] + rand() * (nodeRange[1] - nodeRange[0] + 1));

    // Extra edges above spanning tree (n-1)
    const extraRange = [
      [0,0],
      [0, 1],
      [1, 2],
      [2, 4],
      [3, 5],
      [4, 7],
    ][diff];

    // Sample node positions on a soft grid — jittered for organic feel
    // We use a 5x5 or 6x6 grid depending on diff
    const grid = diff <= 2 ? 4 : diff <= 4 ? 5 : 6;
    const cells = [];
    for (let x=0;x<grid;x++) for (let y=0;y<grid;y++) cells.push([x,y]);
    // shuffle
    for (let i=cells.length-1;i>0;i--) {
      const j = Math.floor(rand()*(i+1));
      [cells[i],cells[j]] = [cells[j],cells[i]];
    }
    const chosen = cells.slice(0, nCount);
    const nodes = chosen.map(([gx,gy]) => {
      const cell = 100 / (grid + 1);
      const jitterX = (rand()-0.5) * cell * 0.35;
      const jitterY = (rand()-0.5) * cell * 0.35;
      const px = 12 + gx * (76 / (grid-1)) + jitterX;
      const py = 12 + gy * (76 / (grid-1)) + jitterY;
      return [Math.max(8, Math.min(92, +px.toFixed(1))),
              Math.max(8, Math.min(92, +py.toFixed(1)))];
    });

    // Build spanning tree via nearest-neighbor-ish random walk
    const edges = [];
    const inTree = new Set([0]);
    const outTree = new Set(nodes.map((_,i)=>i).filter(i=>i!==0));
    while (outTree.size) {
      const inArr = [...inTree];
      const outArr = [...outTree];
      // Bias: pick a random inTree node, then find its closest 3 out-tree
      // nodes and choose one at random.  Keeps the graph pretty.
      const u = inArr[Math.floor(rand()*inArr.length)];
      const [ux,uy] = nodes[u];
      outArr.sort((a,b)=>{
        const [ax,ay]=nodes[a],[bx,by]=nodes[b];
        return Math.hypot(ax-ux,ay-uy) - Math.hypot(bx-ux,by-uy);
      });
      const cand = outArr.slice(0, Math.min(3, outArr.length));
      const v = cand[Math.floor(rand()*cand.length)];
      edges.push([Math.min(u,v), Math.max(u,v)]);
      inTree.add(v); outTree.delete(v);
    }

    // Helper: is edge already in list?
    const has = (a,b) => edges.some(([ea,eb]) =>
      (ea===a&&eb===b) || (ea===b&&eb===a));

    // Helper: do edges (a,b) and (c,d) cross?
    function segCross(a,b,c,d) {
      if (a===c||a===d||b===c||b===d) return false;
      const [x1,y1]=nodes[a],[x2,y2]=nodes[b];
      const [x3,y3]=nodes[c],[x4,y4]=nodes[d];
      const det = (x2-x1)*(y4-y3) - (y2-y1)*(x4-x3);
      if (Math.abs(det) < 1e-6) return false;
      const t = ((x3-x1)*(y4-y3) - (y3-y1)*(x4-x3)) / det;
      const s = ((x3-x1)*(y2-y1) - (y3-y1)*(x2-x1)) / det;
      return t>0.02 && t<0.98 && s>0.02 && s<0.98;
    }

    // Add extra edges — prefer short edges, avoid crossings on low diff
    const extra = Math.floor(extraRange[0] + rand()*(extraRange[1]-extraRange[0]+1));
    let attempts = 0;
    let added = 0;
    while (added < extra && attempts < 200) {
      attempts++;
      const a = Math.floor(rand()*nCount);
      let b = Math.floor(rand()*nCount);
      if (a === b) continue;
      const A=Math.min(a,b), B=Math.max(a,b);
      if (has(A,B)) continue;
      const [ax,ay]=nodes[A],[bx,by]=nodes[B];
      const dist = Math.hypot(ax-bx, ay-by);
      // Reject very-long edges (spans whole board) on lower diff to keep clean
      if (diff <= 3 && dist > 55) continue;
      // On low difficulty avoid crossings
      if (diff <= 2) {
        let crosses = false;
        for (const [c,d] of edges) if (segCross(A,B,c,d)) { crosses = true; break; }
        if (crosses) continue;
      }
      edges.push([A,B]);
      added++;
    }

    // Now guarantee Euler path: ensure 0 or 2 nodes of odd degree.
    // Strategy: while more than 2 odd nodes, pair two closest odd nodes
    // and add an edge between them (creating an extra edge but valid path).
    let safety = 40;
    while (safety-- > 0) {
      const odd = oddNodes(edges, nCount);
      if (odd.length === 0 || odd.length === 2) break;
      // Pair odd nodes: sort by pairwise distance, pick a valid pair
      let paired = false;
      const pairs = [];
      for (let i=0;i<odd.length;i++) for (let j=i+1;j<odd.length;j++) {
        const a=odd[i], b=odd[j];
        if (has(a,b)) continue;
        const [ax,ay]=nodes[a],[bx,by]=nodes[b];
        pairs.push({a,b, d:Math.hypot(ax-bx,ay-by)});
      }
      pairs.sort((p,q)=>p.d-q.d);
      for (const {a,b} of pairs) {
        edges.push([Math.min(a,b), Math.max(a,b)]);
        paired = true;
        break;
      }
      if (!paired) {
        // Fallback: add an edge to first two odd nodes even if already exists?
        // Instead — nudge by adding a triangle to an existing edge.
        const oddN = odd[0];
        // Find a neighbor of oddN and add another edge to it via another node
        const neighbors = edges
          .filter(([a,b])=>a===oddN||b===oddN)
          .map(([a,b])=>a===oddN?b:a);
        if (!neighbors.length) break;
        // Just append a redundant edge to force parity — try picking
        // odd[1] and connecting via a new midpoint node is overkill.
        // Instead break — should be rare.
        break;
      }
    }

    if (!hasEulerPath(edges, nCount)) {
      // Fallback: just return null and caller retries with new seed
      return null;
    }

    return { nodes, edges, nCount };
  }

  /* Playability filter -------------------------------------------------
     Two things make a generated graph feel "broken" on a touch screen:
       a) two nodes sitting so close that the snap radius can't tell them
          apart, and
       b) an edge passing right over an unrelated node, so dragging along
          that edge accidentally snaps to the wrong node.
     Both are rejected here so the player only ever sees clean boards. */
  function isPlayable(g) {
    const { nodes, edges } = g;
    const minGap = CFG.minNodeGap;
    for (let i=0;i<nodes.length;i++) {
      for (let j=i+1;j<nodes.length;j++) {
        const d = Math.hypot(nodes[i][0]-nodes[j][0], nodes[i][1]-nodes[j][1]);
        if (d < minGap) return false;
      }
    }
    // Point-to-segment distance for every (node, non-incident edge) pair
    for (const [a,b] of edges) {
      const [x1,y1] = nodes[a], [x2,y2] = nodes[b];
      const dx = x2-x1, dy = y2-y1;
      const len2 = dx*dx + dy*dy;
      for (let i=0;i<nodes.length;i++) {
        if (i===a || i===b) continue;
        const [px,py] = nodes[i];
        let t = len2 ? ((px-x1)*dx + (py-y1)*dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(px - (x1+dx*t), py - (y1+dy*t));
        if (d < minGap*0.62) return false;
      }
    }
    return true;
  }

  /* Layout relaxation — physically pushes cramped nodes apart instead of
     throwing the whole puzzle away. Node–node pairs repel each other and
     nodes sitting on top of an unrelated edge get pushed off it. A few
     dozen cheap iterations turn almost any raw graph into a clean board. */
  function relaxLayout(g) {
    const nodes = g.nodes.map(([x,y]) => [x,y]);
    const edges = g.edges;
    const minGap = CFG.minNodeGap;
    const edgeGap = minGap * 0.62;

    for (let iter=0; iter<70; iter++) {
      let moved = false;

      // 1) node <-> node repulsion
      for (let i=0;i<nodes.length;i++) {
        for (let j=i+1;j<nodes.length;j++) {
          let dx = nodes[j][0]-nodes[i][0];
          let dy = nodes[j][1]-nodes[i][1];
          let d = Math.hypot(dx,dy);
          if (d >= minGap) continue;
          if (d < 0.001) { dx = 1; dy = 0; d = 1; }   // exact overlap
          const push = (minGap - d) / 2 + 0.15;
          const ux = dx/d, uy = dy/d;
          nodes[i][0] -= ux*push; nodes[i][1] -= uy*push;
          nodes[j][0] += ux*push; nodes[j][1] += uy*push;
          moved = true;
        }
      }

      // 2) node <-> non-incident edge repulsion
      for (const [a,b] of edges) {
        const [x1,y1] = nodes[a], [x2,y2] = nodes[b];
        const ex = x2-x1, ey = y2-y1;
        const len2 = ex*ex + ey*ey;
        if (len2 < 0.001) continue;
        for (let i=0;i<nodes.length;i++) {
          if (i===a || i===b) continue;
          const [px,py] = nodes[i];
          let t = ((px-x1)*ex + (py-y1)*ey) / len2;
          t = Math.max(0, Math.min(1, t));
          const cx = x1 + ex*t, cy = y1 + ey*t;
          let dx = px-cx, dy = py-cy;
          let d = Math.hypot(dx,dy);
          if (d >= edgeGap) continue;
          if (d < 0.001) { dx = -ey; dy = ex; d = Math.hypot(dx,dy) || 1; }
          const push = (edgeGap - d) + 0.15;
          const ux = dx/d, uy = dy/d;
          nodes[i][0] += ux*push*0.7; nodes[i][1] += uy*push*0.7;
          // nudge the edge's endpoints slightly the other way
          nodes[a][0] -= ux*push*0.15; nodes[a][1] -= uy*push*0.15;
          nodes[b][0] -= ux*push*0.15; nodes[b][1] -= uy*push*0.15;
          moved = true;
        }
      }

      if (!moved) break;
    }

    // Re-fit the relaxed cloud back into the visible 8..92 window
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const [x,y] of nodes) {
      if (x<minX)minX=x; if (y<minY)minY=y;
      if (x>maxX)maxX=x; if (y>maxY)maxY=y;
    }
    const w = maxX-minX || 1, h = maxY-minY || 1;
    const span = 84;
    const s = Math.min(span/w, span/h, 1.25);
    const out = nodes.map(([x,y]) => [
      +Math.max(8, Math.min(92, 50 + (x-(minX+w/2))*s)).toFixed(1),
      +Math.max(8, Math.min(92, 50 + (y-(minY+h/2))*s)).toFixed(1),
    ]);
    return { ...g, nodes: out };
  }

  // Try up to N seeds until a valid graph pops out
  function makePuzzle(diff, roundSeed) {
    let fallback = null;
    for (let i=0;i<24;i++) {
      let g = generateGraph(diff, roundSeed + i*7919);
      if (!g) continue;
      if (!isPlayable(g)) g = relaxLayout(g);     // try to fix it up
      if (isPlayable(g)) return { ...g, diff };
      if (!fallback) fallback = g;
    }
    if (fallback) return { ...fallback, diff };
    // Absolute fallback — a triangle
    return {
      nodes: [[50,15],[15,85],[85,85]],
      edges: [[0,1],[1,2],[0,2]],
      nCount: 3,
      diff: 1,
    };
  }

  /* =================================================================
     SPECIAL PUZZLE TYPES
     - normal      : regular one-stroke
     - speed       : 8s hard cap, big score bonus
     - fade        : untraced edges slowly fade — plan quickly
     - precision   : narrower snap radius (stricter tracing)
     - genius      : only one optimal route — small graph, big bonus
     - master      : oversized graph (higher diff), huge XP
     ================================================================= */
  function pickType(round, rand) {
    if (round < 4) return 'normal';
    // Roughly every 6-10 rounds a special appears
    // ~28% chance of a special after round 4
    if (rand() < 0.28) {
      const specials = ['speed','fade','precision','genius','master'];
      // Master gets rarer; only from round 10+
      const filtered = round >= 10 ? specials : specials.filter(s=>s!=='master');
      return filtered[Math.floor(rand() * filtered.length)];
    }
    return 'normal';
  }

  const TYPE_META = {
    normal:    { icon:'✏️',  name:'One Stroke',      desc:'Trace every edge without lifting.' },
    speed:     { icon:'⚡', name:'Speed Puzzle',     desc:'Solve in 8 seconds — huge bonus.' },
    fade:      { icon:'🌫',  name:'Fade Puzzle',      desc:'Edges slowly disappear as you plan.' },
    precision: { icon:'🎯', name:'Precision Trace',  desc:'Tighter snap — trace carefully.' },
    genius:    { icon:'🧠', name:'Genius Puzzle',    desc:'Only one clean route exists.' },
    master:    { icon:'💎', name:'Master Puzzle',    desc:'Big graph. Big planning. Big XP.' },
  };

  /* =================================================================
     GAME STATE
     ================================================================= */
  const G = {
    round:0, score:0, lives:3,
    combo:0, bestCombo:0, streak:0, bestStreak:0,
    correctAnswers:0, perfectPuzzles:0,
    totalPlanMs:0, drawTimes:[],
    resetsUsed:0, masterSolved:false,
    puzzleTimer:null, timeLeft:0, totalTime:0,
    puzzle:null, type:'normal', typeMeta:null,
    drawing:false, currentNode:-1, startNode:-1,
    tracedEdges:new Set(), path:[], visitedNodes:new Set(),
    planStart:0, drawStart:0, puzzleStart:0,
    phase:'idle',     // idle | intro | plan | play | success | fail | done
    particles:[], failAlpha:0, successAnim:0,
    hintNodes:[], hasErrorThisPuzzle:false,
    fadeAlpha:1,      // for fade puzzles
    daily:dailyChallenge(), dailyProgress:0,
    // last-puzzle score breakdown (for dopamine popup)
    lastBreakdown:null,
    // shape-library integration (added for the 200-shape expansion)
    recentCats:[],           // rolling window of last N category indices
    puzzleSource:'random',   // 'random' | 'library'
    libraryPuzzles:0,        // count of library puzzles solved this session
    // fair-play / assist state
    startNodes:[],           // nodes a valid one-stroke route can begin from
    liftsThisPuzzle:0,       // lifts used on the current puzzle
    hintsLeft:CFG.hintsPerRun,
    hintEdge:null,           // {from,to,until} highlighted hint edge
    hintsUsed:0,
    undosUsed:0,
    deadEnds:0,              // times the player got stuck
    blockedMoves:0,          // route-breaking moves prevented in assist rounds
    lastRemaining:0,         // untraced edge count (for the progress ring)
  };
  const CAT_WINDOW = 5;      // avoid the last 5 library categories

  /* =================================================================
     CANVAS
     ================================================================= */
  let canvas, ctx, animId=null, CW=320, CH=320, DPR=1;
  let destroyed = false;
  let onResizeHandler = null;
  const pendingTimeouts = new Set();

  // setTimeout wrapper that is auto-cancelled when the game is removed,
  // preventing stale callbacks from touching a dead DOM.
  function safeTimeout(fn, ms) {
    const id = setTimeout(() => {
      pendingTimeouts.delete(id);
      if (!destroyed) fn();
    }, ms);
    pendingTimeouts.add(id);
    return id;
  }
  function clearAllTimeouts() {
    pendingTimeouts.forEach(id => clearTimeout(id));
    pendingTimeouts.clear();
  }

  function ek(a,b){return a<b?`${a}-${b}`:`${b}-${a}`;}

  function pctToPx(pctX,pctY) {
    const pad = CW * (CFG.padPct/100);
    return [pad + pctX/100 * (CW - pad*2),
            pad + pctY/100 * (CH - pad*2)];
  }
  function nodePos(idx){ const n=G.puzzle.nodes[idx]; return pctToPx(n[0],n[1]); }

  function nearestNode(px, py, snap) {
    if (!G.puzzle) return -1;
    let best=-1, bd=snap;
    for (let i=0;i<G.puzzle.nodes.length;i++) {
      const [x,y] = nodePos(i);
      const d = Math.hypot(px-x, py-y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function edgeExists(a,b){
    return G.puzzle.edges.some(([ea,eb]) =>
      (ea===a&&eb===b)||(ea===b&&eb===a));
  }
  /* Show the "lines left" number inside nodes during the planning phase
     (and while idle in play) — this is the core planning aid. Fade
     puzzles hide it, and it never shows mid-drag so it can't clutter. */
  function showDegrees() {
    if (G.type === 'fade') return false;
    if (G.phase === 'plan' || G.phase === 'intro') return true;
    return G.phase === 'play' && !G.drawing;
  }

  function setHintNodes() {
    // Only nodes that can actually start a full one-stroke route glow.
    const valid = validStartNodes();
    G.startNodes = valid.length ? valid : G.puzzle.nodes.map((_,i)=>i);
    G.hintNodes = G.startNodes.slice();
  }

  /* =================================================================
     BOARD SIZING (responsive & large)
     ================================================================= */
  function computeBoardSize() {
    // Use available body width minus board padding.  Cap by height too.
    const wAvail = Math.max(280, (body.clientWidth || 340) - 24);
    const hAvail = Math.max(280, (window.innerHeight || 700) * 0.55);
    let s = Math.min(wAvail, hAvail, CFG.boardMaxPx);
    if (s < CFG.boardMinPx) s = CFG.boardMinPx;
    return Math.floor(s);
  }

  function makeCanvas() {
    const s = computeBoardSize();
    CW = CH = s;
    DPR = window.devicePixelRatio || 1;
    canvas = document.createElement('canvas');
    canvas.width  = Math.round(CW * DPR);
    canvas.height = Math.round(CH * DPR);
    canvas.style.cssText =
      `width:${CW}px;height:${CH}px;border-radius:22px;`+
      `touch-action:none;display:block;cursor:crosshair;user-select:none;`;
    ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
  }

  function roundRect(x,y,w,h,r) {
    r = Math.max(0, Math.min(r, w/2, h/2));
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r);
    ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h);
    ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r);
    ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  /* =================================================================
     RENDER LOOP
     ================================================================= */
  function startLoop() {
    if (animId) cancelAnimationFrame(animId);
    (function loop(){ animId = requestAnimationFrame(loop); drawFrame(); })();
  }
  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    stopPuzzleTimer();
  }

  function drawFrame() {
    if (!ctx) return;
    ctx.clearRect(0,0,CW,CH);

    // === BACKGROUND ===
    // Deep gradient behind everything
    const bgGrad = ctx.createLinearGradient(0,0,CW,CH);
    bgGrad.addColorStop(0, '#100425');
    bgGrad.addColorStop(1, '#160B33');
    ctx.fillStyle = bgGrad;
    roundRect(0,0,CW,CH,22); ctx.fill();

    // Subtle vignette so the graph pops off the board
    const vig = ctx.createRadialGradient(CW/2,CH/2,CW*0.25, CW/2,CH/2,CW*0.72);
    vig.addColorStop(0,'rgba(124,58,237,0.10)');
    vig.addColorStop(1,'rgba(0,0,0,0.30)');
    ctx.fillStyle = vig;
    roundRect(0,0,CW,CH,22); ctx.fill();

    // Gradient border glow
    ctx.save();
    ctx.strokeStyle = 'rgba(139,92,246,0.35)';
    ctx.lineWidth = 1.5;
    roundRect(1,1,CW-2,CH-2,21); ctx.stroke();
    ctx.restore();

    // Grid dots
    ctx.fillStyle = 'rgba(139,92,246,0.09)';
    const gs = 24;
    for (let gx=gs*0.7; gx<CW-4; gx+=gs)
      for (let gy=gs*0.7; gy<CH-4; gy+=gs) {
        ctx.beginPath(); ctx.arc(gx,gy,1.1,0,Math.PI*2); ctx.fill();
      }

    if (!G.puzzle) return;

    // === TIMER BAR ===
    if ((G.phase==='play'||G.phase==='plan') && G.totalTime>0) {
      const pct = Math.max(0, G.timeLeft/G.totalTime);
      const barW = CW-28, barH = 6, barX = 14, barY = 12;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(barX,barY,barW,barH,3); ctx.fill();
      const c = pct>0.6 ? '#7C3AED' : pct>0.3 ? '#F59E0B' : '#EF4444';
      ctx.shadowColor = c;
      ctx.shadowBlur = pct<0.3 ? 10 : 5;
      ctx.fillStyle = c;
      if (barW*pct > 1) { roundRect(barX,barY,barW*pct,barH,3); ctx.fill(); }
      if (G.phase==='play' && G.timeLeft<5) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#F87171';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(G.timeLeft)+'s', CW/2, barY+barH+14);
      }
      ctx.restore();
    }

    // === EDGE PROGRESS COUNTER ===
    // Tells the player exactly how much of the shape is left — removes
    // the "am I nearly done?" guesswork on big graphs.
    if (G.puzzle && (G.phase==='play' || G.phase==='plan' || G.phase==='success')) {
      const total = G.puzzle.edges.length;
      const done  = G.tracedEdges.size;
      ctx.save();
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillStyle = done === total ? '#4ADE80' : 'rgba(196,181,253,0.85)';
      ctx.fillText(done + '/' + total + ' lines', CW-14, 34);
      ctx.restore();
    }

    const now = Date.now();
    const p = G.puzzle;
    const isSuccess = G.phase==='success';
    const isPlan    = G.phase==='plan' || G.phase==='intro';

    // Fade alpha for fade puzzles (only affects untraced edges)
    let fadeMul = 1;
    if (G.type==='fade' && G.phase==='play') {
      // linearly fade over the puzzle time
      fadeMul = Math.max(0.15, G.timeLeft / G.totalTime);
    }

    // === EDGES ===
    p.edges.forEach(([a,b], eIdx) => {
      const [x1,y1] = nodePos(a);
      const [x2,y2] = nodePos(b);
      const key = ek(a,b);
      const isTraced = G.tracedEdges.has(key);

      ctx.save();
      ctx.lineCap = 'round';

      if (isSuccess) {
        const pulse = 0.7 + 0.3*Math.sin(now*0.008 + eIdx);
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur = 16*pulse;
        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth = 5.2;
      } else if (isTraced) {
        ctx.shadowColor = '#34D399';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth = 4.8;
      } else if (G.hintEdge && now < G.hintEdge.until &&
                 ek(G.hintEdge.from, G.hintEdge.to) === key) {
        // Hinted edge — bright amber dashes so it reads instantly
        const p2 = 0.6 + 0.4*Math.sin(now*0.012);
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 20*p2;
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 5;
        ctx.setLineDash([9,7]);
        ctx.lineDashOffset = -(now*0.05) % 16;
      } else {
        const glow = 0.35 + 0.15*Math.sin(now*0.0018 + eIdx*1.7);
        ctx.shadowColor = '#7C3AED';
        ctx.shadowBlur = 10*glow*fadeMul;
        ctx.strokeStyle = '#8B5CF6';
        ctx.globalAlpha = fadeMul * (isPlan ? 0.95 : 1);
        ctx.lineWidth = 3.6;
      }

      ctx.beginPath();
      ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.stroke();
      ctx.restore();
    });

    // === RUBBER-BAND PREVIEW LINE ===
    // While dragging, show a live line from the current node to the
    // finger so the player always sees where the stroke is heading.
    if (G.drawing && G.currentNode >= 0 && lastPX !== null && G.phase === 'play') {
      const [cxp, cyp] = nodePos(G.currentNode);
      // Preview turns green as soon as the finger is aligned with a real
      // untraced edge (same corridor test the tracer uses).
      const target = previewTarget(lastPX, lastPY, activeSnap());
      const legal = target >= 0 && target !== G.currentNode &&
                    !G.tracedEdges.has(ek(G.currentNode, target));
      ctx.save();
      ctx.lineCap = 'round';
      ctx.setLineDash([6,6]);
      ctx.lineDashOffset = -(now*0.03) % 12;
      ctx.strokeStyle = legal ? 'rgba(74,222,128,0.9)' : 'rgba(196,181,253,0.55)';
      ctx.shadowColor = legal ? '#22C55E' : '#8B5CF6';
      ctx.shadowBlur = legal ? 12 : 6;
      ctx.lineWidth = legal ? 3.4 : 2.2;
      ctx.beginPath();
      ctx.moveTo(cxp, cyp);
      ctx.lineTo(lastPX, lastPY);
      ctx.stroke();
      ctx.restore();
    }

    // === NODES ===
    // Degree label helper — shows how many untraced lines a node still has
    const degLeft = {};
    if (G.phase==='play' || G.phase==='plan') {
      p.edges.forEach(([a,b]) => {
        if (G.tracedEdges.has(ek(a,b))) return;
        degLeft[a] = (degLeft[a]||0)+1;
        degLeft[b] = (degLeft[b]||0)+1;
      });
    }

    p.nodes.forEach((n,i) => {
      const [x,y] = nodePos(i);
      const isCur = i===G.currentNode;
      const isSt  = i===G.startNode && G.startNode>=0;
      const isHint = G.hintNodes.includes(i) && !G.drawing && G.startNode<0 && G.phase==='play';
      const isPlanGlow = isPlan && G.hintNodes.includes(i);
      // A node the player cannot legally start from is dimmed before the
      // first touch — no more "wasted" runs from an impossible node.
      const isDeadStart = G.startNode < 0 && (G.phase==='play'||isPlan) &&
                          G.startNodes.length > 0 &&
                          G.startNodes.length < p.nodes.length &&
                          G.startNodes.indexOf(i) === -1;

      ctx.save();
      let fill, shadow, r=CFG.nodeR;

      if (isDeadStart && !isSuccess) {
        ctx.globalAlpha = 0.5;
      }

      if (isSuccess) {
        const p2 = 0.7+0.3*Math.sin(now*0.007 + i*1.2);
        fill='#4ADE80'; shadow='#22C55E';
        ctx.shadowBlur = 22*p2; r = CFG.nodeR+2;
      } else if (isCur) {
        fill='#34D399'; shadow='#22C55E';
        ctx.shadowBlur = 26; r = CFG.nodeR+3;
      } else if (isSt) {
        fill='#FCD34D'; shadow='#F59E0B';
        ctx.shadowBlur = 18;
      } else if (isHint || isPlanGlow) {
        const p2 = 0.5 + 0.5*Math.sin(now*0.004 + i*1.8);
        fill = `rgba(245,158,11,${0.7 + 0.3*p2})`;
        shadow = '#F59E0B';
        ctx.shadowBlur = 16*p2; r = CFG.nodeR-1 + 3*p2;
      } else {
        fill='#A78BFA'; shadow='#7C3AED';
        ctx.shadowBlur = 9;
      }

      ctx.shadowColor = shadow;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();

      if (isCur) {
        ctx.fillStyle='#fff';
        ctx.beginPath();
        ctx.arc(x,y,4.2,0,Math.PI*2);
        ctx.fill();
      }

      // Remaining-lines counter inside each node (planning aid)
      if (!isCur && !isSuccess && showDegrees() && degLeft[i] > 0) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(20,6,45,0.92)';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(degLeft[i]), x, y+0.5);
      }
      ctx.restore();
    });

    // === TRAILING PARTICLES (drawing) ===
    G.particles = G.particles.filter(pt => pt.life>0.02);
    G.particles.forEach(pt => {
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vy += pt.gravity!==undefined ? pt.gravity : 0.18;
      pt.vx *= 0.97;
      pt.life -= pt.decay || 0.022;
      ctx.save();
      ctx.globalAlpha = Math.max(0,pt.life);
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pt.x,pt.y, pt.r*Math.max(0,pt.life),0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    });

    // === SUCCESS RING SWEEP ===
    if (isSuccess) {
      G.successAnim = Math.min(1, G.successAnim + 0.06);
      const [cx,cy] = [CW/2, CH/2];
      ctx.save();
      ctx.globalAlpha = (1-G.successAnim) * 0.55;
      ctx.strokeStyle = '#4ADE80';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22C55E';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx,cy, CW*0.6*G.successAnim, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // === FAIL FLASH ===
    if (G.failAlpha>0) {
      ctx.save();
      ctx.globalAlpha = G.failAlpha*0.35;
      ctx.fillStyle = '#EF4444';
      roundRect(0,0,CW,CH,22); ctx.fill();
      ctx.restore();
      G.failAlpha -= 0.055;
    }
  }

  /* =================================================================
     PARTICLES
     ================================================================= */
  function spawnParticles(cx,cy,color,count,opts) {
    opts = opts||{};
    for (let i=0;i<count;i++) {
      const angle = Math.random()*Math.PI*2;
      const speed = (opts.speed||[1.5,5.5])[0] +
                    Math.random()*((opts.speed||[1.5,5.5])[1]-(opts.speed||[1.5,5.5])[0]);
      G.particles.push({
        x:cx, y:cy,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed - (opts.lift===undefined?1.5:opts.lift),
        r:  (opts.r||2) + Math.random()*(opts.rjit||3),
        life: (opts.life||0.75) + Math.random()*0.25,
        color,
        gravity: opts.gravity,
        decay:   opts.decay,
      });
    }
  }
  function burstAllNodes() {
    const clrs = ['#22C55E','#4ADE80','#A7F3D0','#FCD34D','#C4B5FD'];
    G.puzzle.nodes.forEach((_,i) => {
      const [x,y] = nodePos(i);
      spawnParticles(x,y,clrs[i%clrs.length], 10);
    });
  }
  function trailParticle(x,y) {
    G.particles.push({
      x, y,
      vx: (Math.random()-0.5)*0.5,
      vy: (Math.random()-0.5)*0.5,
      r: 1.5+Math.random()*1.5,
      life: 0.5+Math.random()*0.3,
      color:'#C4B5FD',
      gravity: 0.02,
      decay: 0.05,
    });
  }

  /* =================================================================
     POINTER EVENTS
     ================================================================= */
  let lastPX = null, lastPY = null;

  function activeSnap() {
    return G.type==='precision' ? CFG.snap*0.62 : CFG.snap;
  }

  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return [src.clientX - rect.left, src.clientY - rect.top];
  }

  /* Backtrack: dragging back onto the previous node un-draws that edge.
     This is the single biggest quality-of-life win — a mis-step no
     longer means restarting the whole puzzle. */
  function tryBacktrack(ni) {
    if (G.path.length < 2) return false;
    if (ni !== G.path[G.path.length-2]) return false;
    const last = G.path.pop();
    const key = ek(last, ni);
    G.tracedEdges.delete(key);
    G.currentNode = ni;
    G.undosUsed++;
    const [nx,ny] = nodePos(ni);
    spawnParticles(nx, ny, '#C4B5FD', 5, {speed:[0.8,2], life:0.35, r:1.4, rjit:1.2, lift:0.4});
    if (typeof haptic === 'function') haptic(8);
    return true;
  }

  /* -----------------------------------------------------------------
     EDGE-CORRIDOR TRACING
     -----------------------------------------------------------------
     Plain "snap to the nearest node" breaks whenever an unrelated node
     sits near the line you're drawing along: the finger enters that
     node's snap circle before reaching the real target and the stroke
     jumps sideways.

     Instead we track which EDGE the finger is travelling along. For
     every candidate edge leaving the current node we measure how far
     the finger has progressed (t) and how far it strays from the line
     (perp). The best-aligned edge wins, and it only commits once the
     finger is genuinely near the far end. Bystander nodes are ignored
     because the finger is never aligned with an edge that leads to
     them.
     ----------------------------------------------------------------- */
  function pickTarget(px, py, snap) {
    const cur = G.currentNode;
    if (cur < 0) return -1;
    const [cx, cy] = nodePos(cur);

    // Undo is checked first and needs the finger to physically come back
    // to the previous node — never just "point roughly that way", which
    // would cancel lines whenever a bystander node sits along the route.
    const prevNode = G.path.length >= 2 ? G.path[G.path.length-2] : -1;
    if (prevNode >= 0) {
      const [pxn, pyn] = nodePos(prevNode);
      if (Math.hypot(px - pxn, py - pyn) <= CFG.nodeR * 1.5) return prevNode;
    }

    // Forward candidates: untraced neighbours of the current node
    const cands = [];
    G.puzzle.edges.forEach(([a,b]) => {
      const other = a === cur ? b : (b === cur ? a : -1);
      if (other < 0) return;
      if (!G.tracedEdges.has(ek(cur, other))) cands.push(other);
    });
    if (!cands.length) return -1;

    /* Score every candidate edge by how well the finger is aligned with
       it, then commit only the BEST-ALIGNED one. Picking "the first
       committed candidate" instead would let a short edge steal the
       stroke while the finger is obviously heading down a longer,
       near-parallel edge. */
    let best = -1, bestPerp = Infinity, bestCommitted = false;
    for (const n of cands) {
      const [nx, ny] = nodePos(n);
      const vx = nx - cx, vy = ny - cy;
      const len2 = vx*vx + vy*vy;
      if (len2 < 1) continue;
      const len = Math.sqrt(len2);
      let t = ((px-cx)*vx + (py-cy)*vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const perp = Math.hypot(px - (cx + vx*t), py - (cy + vy*t));

      // Must stay inside a corridor around the line
      if (perp > Math.min(snap, len * 0.5)) continue;

      // Commit when most of the way there, or right on top of the node
      const distToNode = Math.hypot(px - nx, py - ny);
      const committed = t >= 0.72 || distToNode <= Math.min(snap, len*0.45);

      if (perp < bestPerp) { bestPerp = perp; best = n; bestCommitted = committed; }
    }
    // The winner still has to be far enough along before it locks in.
    return bestCommitted ? best : -1;
  }

  /* Same corridor test as pickTarget but without the commit threshold —
     used only to colour the rubber-band preview line. */
  function previewTarget(px, py, snap) {
    const cur = G.currentNode;
    if (cur < 0 || !G.puzzle) return -1;
    const [cx, cy] = nodePos(cur);
    let best = -1, bestPerp = Infinity;
    G.puzzle.edges.forEach(([a,b]) => {
      const other = a === cur ? b : (b === cur ? a : -1);
      if (other < 0) return;
      if (G.tracedEdges.has(ek(cur, other))) return;
      const [nx, ny] = nodePos(other);
      const vx = nx-cx, vy = ny-cy;
      const len2 = vx*vx + vy*vy;
      if (len2 < 1) return;
      let t = ((px-cx)*vx + (py-cy)*vy) / len2;
      if (t < 0.12) return;                     // finger hasn't set off yet
      t = Math.min(1, t);
      const perp = Math.hypot(px - (cx+vx*t), py - (cy+vy*t));
      if (perp > Math.min(snap, Math.sqrt(len2)*0.5)) return;
      if (perp < bestPerp) { bestPerp = perp; best = other; }
    });
    return best;
  }

  // Attempt to advance the stroke toward (px,py). Returns false when the
  // puzzle completes or the phase changes (stops further interpolation).
  function tryVisit(px, py, snap) {
    const ni = pickTarget(px, py, snap);
    if (ni === -1 || ni === G.currentNode) return true;

    const prev = G.currentNode;

    // 1) Retracing the last edge = undo, not an error
    if (tryBacktrack(ni)) return true;

    // 2) No line between these nodes / line already used -> soft reject
    if (!edgeExists(prev, ni)) { softReject(prev); return true; }
    const key = ek(prev, ni);
    if (G.tracedEdges.has(key)) { softReject(prev); return true; }

    // 3) Early-round assist: block moves that make the puzzle unsolvable
    if (G.round <= CFG.assistRounds && G.type === 'normal' && moveWouldTrap(prev, ni)) {
      G.blockedMoves++;
      G.failAlpha = 0.45;
      const [bx,by] = nodePos(ni);
      spawnParticles(bx, by, '#F59E0B', 5, {speed:[1,2.4], life:0.4, r:1.6, rjit:1.2, lift:0.5});
      showPop('⚠ That route dead-ends', '#F59E0B', 800);
      if (typeof haptic === 'function') haptic(25);
      return true;
    }

    G.tracedEdges.add(key);
    G.path.push(ni);
    G.currentNode = ni;
    G.visitedNodes.add(ni);
    G.hintEdge = null;

    // small node-hit sparkle
    const [nx, ny] = nodePos(ni);
    spawnParticles(nx, ny, '#A7F3D0', 4, {speed:[1,2.5], life:0.4, r:1.5, rjit:1.5, lift:0.6});
    if (typeof haptic === 'function') haptic(10);
    if (typeof playSound === 'function' && G.tracedEdges.size % 2 === 0) playSound('tap');

    checkCompletion();
    if (G.phase !== 'play') return false;

    // 4) Genuine dead end (all neighbours used) but edges still left
    checkDeadEnd();
    return G.phase === 'play';
  }

  // Gentle "nope" feedback — no life lost, just a nudge
  let lastRejectTs = 0;
  function softReject(atNode) {
    const now = Date.now();
    if (now - lastRejectTs < 260) return;
    lastRejectTs = now;
    G.failAlpha = 0.35;
    if (atNode >= 0) {
      const [x,y] = nodePos(atNode);
      spawnParticles(x, y, '#F87171', 3, {speed:[0.8,2], life:0.3, r:1.3, rjit:1, lift:0.4});
    }
    if (typeof haptic === 'function') haptic(18);
  }

  /* If the current node has no untraced edges left but the puzzle isn't
     finished, the player is stuck. Instead of making them wait for the
     timer, tell them immediately and rewind to the last safe branch. */
  function checkDeadEnd() {
    if (G.phase !== 'play') return;
    const left = remainingEdges(G.tracedEdges);
    if (!left.length) return;
    const hasMove = left.some(([a,b]) => a === G.currentNode || b === G.currentNode);
    if (hasMove) return;

    G.deadEnds++;
    G.drawing = false;
    G.hasErrorThisPuzzle = true;
    G.failAlpha = 0.8;
    G.timeLeft = Math.max(1, G.timeLeft - CFG.deadEndPenalty);
    G.deadline = Date.now() + G.timeLeft * 1000;
    if (typeof haptic === 'function') haptic([30,20,30]);
    if (typeof playSound === 'function') playSound('wrong');
    showPop('🚧 Dead end — retry (-' + CFG.deadEndPenalty + 's)', '#F59E0B', 1000);
    safeTimeout(() => { if (G.phase === 'play') resetDraw(false); }, 420);
  }

  function onDown(e) {
    if (e.cancelable) e.preventDefault();
    // Tapping during the planning window starts the round early —
    // confident players shouldn't have to wait for the countdown.
    if (G.phase === 'plan') { beginPlay(); return; }
    if (G.phase!=='play') return;
    // Capture the pointer so tracing keeps working even when the finger
    // briefly leaves the canvas — no more accidental "lifted" fails.
    if (canvas.setPointerCapture && e.pointerId !== undefined) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    const snap = activeSnap();
    const [px,py] = getXY(e);
    lastPX = px; lastPY = py;
    const ni = nearestNode(px,py, snap);
    if (ni === -1) return;

    // Resuming a partially drawn stroke: you must grab the node you left
    // off at (the stroke stays on screen after a lift).
    if (G.tracedEdges.size > 0) {
      if (ni !== G.currentNode) {
        softReject(G.currentNode);
        showPop('Resume from the glowing node', '#F59E0B', 800);
        return;
      }
      G.drawing = true;
      return;
    }

    // Fresh stroke — reject provably impossible starting nodes
    if (G.startNodes.length && G.startNodes.indexOf(ni) === -1) {
      softReject(ni);
      showPop('✗ Can\'t finish from there', '#F59E0B', 900);
      return;
    }

    G.drawing = true;
    G.drawStart = Date.now();
    G.path = [ni];
    G.startNode = ni;
    G.currentNode = ni;
    G.visitedNodes = new Set([ni]);
    G.hintNodes = [];
  }

  function onMove(e) {
    if (e.cancelable) e.preventDefault();
    const [px,py] = getXY(e);
    if (!G.drawing || G.phase!=='play') { lastPX = px; lastPY = py; return; }
    const snap = activeSnap();

    // trail particles
    if (Math.random() < 0.35) trailParticle(px,py);

    // Interpolate between the previous and current pointer position so a
    // fast swipe cannot skip over intermediate nodes.
    const fromX = lastPX === null ? px : lastPX;
    const fromY = lastPY === null ? py : lastPY;
    const dist = Math.hypot(px - fromX, py - fromY);
    const steps = Math.max(1, Math.ceil(dist / Math.max(6, CFG.nodeR * 0.7)));
    for (let s = 1; s <= steps; s++) {
      const ix = fromX + (px - fromX) * s / steps;
      const iy = fromY + (py - fromY) * s / steps;
      lastPX = ix; lastPY = iy;
      if (!tryVisit(ix, iy, snap)) break;
    }
    lastPX = px; lastPY = py;
  }

  function onUp(e) {
    if (e && e.cancelable) e.preventDefault();
    if (!G.drawing || G.phase!=='play') return;
    G.drawing = false;

    if (G.tracedEdges.size === 0) {
      // Nothing traced yet — allow a fresh start without penalty
      resetDraw(false);
      return;
    }

    const done = G.puzzle.edges.every(([a,b]) => G.tracedEdges.has(ek(a,b)));
    if (done) return;

    // Lift handling: first lift per puzzle is a free warning, the stroke
    // is kept and can be resumed from the current node. Further lifts
    // cost a life (the one-stroke rule still matters).
    G.liftsThisPuzzle++;
    if (G.liftsThisPuzzle <= CFG.freeLifts) {
      G.hasErrorThisPuzzle = true;
      showPop('✋ Keep holding! Resume from the glowing node', '#F59E0B', 1100);
      if (typeof haptic === 'function') haptic(30);
    } else {
      handleWrong('Lifted too early!');
    }
  }

  function bindPointer() {
    if (window.PointerEvent) {
      // Unified pointer events: mouse, touch and pen with capture support
      canvas.addEventListener('pointerdown',   onDown);
      canvas.addEventListener('pointermove',   onMove);
      canvas.addEventListener('pointerup',     onUp);
      canvas.addEventListener('pointercancel', onUp);
    } else {
      canvas.addEventListener('touchstart', onDown, {passive:false});
      canvas.addEventListener('touchmove',  onMove, {passive:false});
      canvas.addEventListener('touchend',   onUp,   {passive:false});
      canvas.addEventListener('touchcancel',onUp,   {passive:false});
      canvas.addEventListener('mousedown',  onDown);
      canvas.addEventListener('mousemove',  e=>{ if (G.drawing) onMove(e); });
      canvas.addEventListener('mouseup',    onUp);
      canvas.addEventListener('mouseleave', e=>{ if (G.drawing) onUp(e); });
    }
  }

  /* =================================================================
     TIMERS
     ================================================================= */
  function stopPuzzleTimer() {
    if (G.puzzleTimer)  { clearInterval(G.puzzleTimer); G.puzzleTimer=null; }
    if (G.planTimeout)  { clearTimeout(G.planTimeout);  G.planTimeout=null; }
  }
  function startPuzzleTimer() {
    stopPuzzleTimer();
    const diff = G.puzzle.diff;
    // Speed puzzles cap at 8s; master puzzles get +50% time
    if (G.type==='speed') G.totalTime = 8;
    else if (G.type==='master') G.totalTime = CFG.puzzleTime(diff) * 1.5;
    else if (G.type==='precision') G.totalTime = CFG.puzzleTime(diff) * 1.1;
    else if (G.puzzleSource === 'library' && G.libraryTimeSec > 0) {
      /* Library shapes ship with a recommended time. We give the player
         a small extra planning window on top so handcrafted puzzles feel
         solveable even when the topology is unfamiliar. */
      G.totalTime = G.libraryTimeSec + 4;
    }
    else G.totalTime = CFG.puzzleTime(diff);

    // Library shapes with many edges deserve proportionally more time
    const edgeCount = G.puzzle.edges.length;
    if (edgeCount > 10) G.totalTime += (edgeCount - 10) * 1.6;

    // Planning phase — draws disabled until timer starts
    const planMs = CFG.planTime(diff) * 1000;
    G.timeLeft = G.totalTime;
    G.phase = 'plan';
    setTip('👁 Plan your route — the timer starts in a moment');
    showPop('👁 Plan your route', '#F59E0B', 900);

    G.planTimeout = setTimeout(() => {
      G.planTimeout = null;
      if (destroyed || G.phase !== 'plan') return;
      beginPlay();
    }, planMs);
  }

  function beginPlay() {
    if (G.planTimeout) { clearTimeout(G.planTimeout); G.planTimeout = null; }
    G.phase = 'play';
    setTip('Start from a glowing node · drag back to undo a line');
    G.planStart = Date.now();
    G.puzzleStart = Date.now();
    // Deadline-based countdown — immune to setInterval drift, and
    // penalties (dead ends) simply move the deadline closer.
    G.deadline = Date.now() + G.timeLeft * 1000;
    let lastTick = Math.ceil(G.timeLeft);
    G.puzzleTimer = setInterval(() => {
      if (destroyed) { stopPuzzleTimer(); return; }
      if (G.phase !== 'play') return;
      G.timeLeft = Math.max(0, (G.deadline - Date.now()) / 1000);
      // Tick sound in the final 3 seconds for urgency
      const t = Math.ceil(G.timeLeft);
      if (t <= 3 && t !== lastTick && t > 0) {
        lastTick = t;
        if (typeof haptic === 'function') haptic(12);
      }
      if (G.timeLeft <= 0) {
        stopPuzzleTimer();
        handleWrong('Time up! ⏱');
      }
    }, 100);
  }

  /* =================================================================
     COMPLETION
     ================================================================= */
  function checkCompletion() {
    if (G.puzzle.edges.every(([a,b]) => G.tracedEdges.has(ek(a,b))))
      handleCorrect();
  }

  function comboTier(c) {
    if (c >= 20) return { name:'Neuro Genius',   color:'#8B5CF6', mult:1.6 };
    if (c >= 10) return { name:'Master Planner', color:'#F472B6', mult:1.4 };
    if (c >= 5)  return { name:'Brain Flow',     color:'#F59E0B', mult:1.25};
    if (c >= 3)  return { name:'Focus Combo',    color:'#22C55E', mult:1.1 };
    return { name:'', color:'#94A3B8', mult:1.0 };
  }

  function scoreBreakdown(diff, drawMs, planMs) {
    const base = 3;
    const diffBonus = Math.round((diff-1) * 1.5);           // 0,2,3,5,6
    // Planning bonus: reward players who paused before drawing
    // Full bonus at ≥ 1.5s planning, none at 0s
    const planSec = planMs/1000;
    const planBonus = Math.round(Math.max(0, Math.min(2, planSec*1.3)));
    // Fast solve — but capped so speed doesn't dominate over planning
    const drawSec = drawMs/1000;
    const speedBonus = Math.round(Math.max(0, Math.min(2, 2 - drawSec*0.25)));
    // Perfect route (no reset, no wrong edge this puzzle)
    const perfect = !G.hasErrorThisPuzzle;
    const perfectBonus = perfect ? 2 : 0;
    // Special puzzle bonus
    const specialBonus = ({
      speed:3, fade:2, precision:2, genius:4, master:5, normal:0,
    })[G.type] || 0;

    // Bigger graphs are worth more — a 14-line shape shouldn't pay the
    // same as a 6-line one at the same difficulty tier.
    const edgeCount = G.puzzle ? G.puzzle.edges.length : 6;
    const sizeBonus = Math.max(0, Math.round((edgeCount - 6) * 0.6));

    // Combo multiplier applies to the sum
    const tier = comboTier(G.combo + 1); // combo after this correct
    let sub = base + diffBonus + planBonus + speedBonus + perfectBonus +
              specialBonus + sizeBonus;
    // Hints trade score for help
    const hintPenalty = G.hintUsedThisPuzzle ? Math.min(4, Math.round(sub*0.3)) : 0;
    sub = Math.max(1, sub - hintPenalty);
    const total = Math.round(sub * tier.mult);

    return { base, diffBonus, planBonus, speedBonus, perfect, perfectBonus,
             specialBonus, sizeBonus, hintPenalty,
             mult:tier.mult, tierName:tier.name, sub, total };
  }

  function handleCorrect() {
    G.phase = 'success';
    G.successAnim = 0;
    G.drawing = false;
    stopPuzzleTimer();
    const drawMs = Date.now() - (G.drawStart || Date.now());
    const planMs = Math.max(0, G.drawStart - G.planStart);
    G.drawTimes.push(drawMs);   // record successful solves for stats
    G.totalPlanMs += planMs;
    G.correctAnswers++;
    G.combo++;
    G.streak++;
    G.bestCombo  = Math.max(G.bestCombo,  G.combo);
    G.bestStreak = Math.max(G.bestStreak, G.streak);

    const bd = scoreBreakdown(G.puzzle.diff, drawMs, planMs);
    G.score += bd.total;
    setScore(G.score);
    G.lastBreakdown = bd;

    if (!G.hasErrorThisPuzzle) G.perfectPuzzles++;
    if (G.type === 'master') G.masterSolved = true;

    // Daily challenge progress
    updateDaily();

    burstAllNodes();
    if (typeof haptic === 'function') haptic([20,15,30]);
    if (typeof playSound === 'function') playSound('correct');
    showComboPop(bd);
    updateHUD();

    safeTimeout(() => nextPuzzle(), 950);
  }

  function updateDaily() {
    const d = G.daily;
    if (!d) return;
    switch (d.kind) {
      case 'solve':   G.dailyProgress = G.correctAnswers; break;
      case 'round':   G.dailyProgress = G.round; break;
      case 'combo':   G.dailyProgress = Math.max(G.dailyProgress||0, G.combo); break;
      case 'perfect': G.dailyProgress = G.perfectPuzzles; break;
      case 'noreset': G.dailyProgress = G.resetsUsed === 0 ? 1 : 0; break;
      case 'master':  G.dailyProgress = G.masterSolved ? 1 : 0; break;
    }
  }

  function handleWrong(reason) {
    if (G.phase !== 'play') return;
    G.phase = 'fail';
    G.drawing = false;
    G.lives--;
    G.streak = 0;
    G.combo = 0;
    G.failAlpha = 1.2;
    G.hasErrorThisPuzzle = true;
    stopPuzzleTimer();
    if (typeof haptic === 'function') haptic([45,20,45]);
    if (typeof playSound === 'function') playSound('wrong');
    showPop('✗ ' + (reason || 'Wrong!'), '#EF4444', 950);
    updateHUD();

    if (G.lives <= 0) {
      safeTimeout(() => { stopLoop(); gameOver(); }, 950);
    } else {
      safeTimeout(() => { resetDraw(false); startPuzzleTimer(); }, 900);
    }
  }

  function resetDraw(fromReset) {
    G.tracedEdges = new Set();
    G.path = [];
    G.startNode = -1;
    G.currentNode = -1;
    G.drawing = false;
    G.failAlpha = 0;
    G.hintEdge = null;
    G.liftsThisPuzzle = 0;
    if (fromReset) G.hasErrorThisPuzzle = true;
    if (G.puzzle) setHintNodes();
    updateHUD();
  }

  /* =================================================================
     HINT — reveals one safe next move (limited per run)
     ================================================================= */
  function useHint() {
    if (G.phase !== 'play' && G.phase !== 'plan') return;
    if (G.hintsLeft <= 0) { showPop('No hints left', '#94A3B8', 800); return; }

    if (G.tracedEdges.size === 0) {
      // Not started yet — spotlight the best starting node
      const starts = G.startNodes.length ? G.startNodes : [0];
      const pick = starts[0];
      const [x,y] = nodePos(pick);
      spawnParticles(x, y, '#FBBF24', 14, {speed:[1.5,4], life:0.8, r:2, rjit:2});
      const nxt = bestNextNode(pick);
      if (nxt >= 0) G.hintEdge = { from:pick, to:nxt, until: Date.now()+2600 };
      showPop('💡 Start here', '#F59E0B', 1000);
    } else {
      const nxt = bestNextNode(G.currentNode);
      if (nxt < 0) { showPop('No safe move — restart the puzzle', '#EF4444', 1000); return; }
      G.hintEdge = { from:G.currentNode, to:nxt, until: Date.now()+2600 };
      showPop('💡 Next line', '#F59E0B', 900);
    }

    G.hintsLeft--;
    G.hintsUsed++;
    G.hasErrorThisPuzzle = true;   // hinted puzzles aren't "perfect"
    G.hintUsedThisPuzzle = true;
    if (typeof haptic === 'function') haptic(15);
    updateHUD();
  }

  /* =================================================================
     NEXT PUZZLE
     ================================================================= */
  function nextPuzzle() {
    if (destroyed) return;
    if (G.lives <= 0) { stopLoop(); gameOver(); return; }
    G.round++;
    G.tracedEdges = new Set();
    G.path = [];
    G.startNode = -1;
    G.currentNode = -1;
    G.particles = [];
    G.failAlpha = 0;
    G.successAnim = 0;
    G.hasErrorThisPuzzle = false;
    G.drawing = false;
    G.liftsThisPuzzle = 0;
    G.hintUsedThisPuzzle = false;
    G.hintEdge = null;
    G.visitedNodes = new Set();
    lastPX = lastPY = null;

    // Difficulty & type
    const diff = CFG.diffCap(G.round);
    const rand = rng(hashStr('mt_'+todayISO())+G.round*104729);
    const chosenType = pickType(G.round, rand);
    G.type = chosenType;
    // Master puzzle: bump one level
    const useDiff = chosenType==='master'
      ? Math.min(5, diff+1)
      : chosenType==='genius'
        ? Math.max(1, diff-1)
        : diff;

    /* -----------------------------------------------------------------
       SHAPE LIBRARY MERGE
       Every 3rd round pulls a puzzle from the handcrafted 200-shape
       library.  Random puzzles keep their existing behaviour on the
       other rounds.  A rolling category window prevents the same
       category appearing twice in the last 5 library rounds so the
       player sees variety like House -> Fish -> Rocket -> Note.
       "Special" puzzles (speed / fade / precision / genius / master)
       always stay on the random branch so their unique modifiers are
       predictable.
       ----------------------------------------------------------------- */
    G.libraryMeta = null;
    G.libraryTimeSec = 0;
    const canUseLibrary =
      window.MT_SHAPES &&
      chosenType === 'normal' &&           // don't override specials
      G.round % 3 === 0 &&                  // every 3rd round
      G.round >= 3;
    let libPuzzle = null;
    if (canUseLibrary) {
      const seed = (Date.now() ^ (G.round*2654435761)) >>> 0;
      const avoid = new Set(G.recentCats);
      let attempts = 0;
      while (attempts < 4 && !libPuzzle) {
        const meta = window.MT_SHAPES.pickShape(G.round, seed + attempts*7919, avoid);
        libPuzzle = window.MT_SHAPES.buildFromShape(meta, seed + attempts*104729 + 17);
        /* Library shapes go through the same playability pipeline as the
           procedural ones: most of them ship with nodes packed tighter
           than the touch snap radius, so relax first and only reject the
           handful that still can't be untangled. */
        if (libPuzzle && !isPlayable(libPuzzle)) {
          const relaxedLib = relaxLayout(libPuzzle);
          if (isPlayable(relaxedLib)) libPuzzle = relaxedLib;
          else { libPuzzle = null; attempts++; continue; }
        }
        if (libPuzzle) {
          libPuzzle.diff = Math.max(1, Math.min(5, libPuzzle.diffIdx + 1)); // 0..3 -> 1..4
          // Master library puzzles bump one more tier
          if (libPuzzle.diffIdx === 3) libPuzzle.diff = 5;
          G.libraryMeta = {
            category   : libPuzzle.category,
            subLabel   : libPuzzle.subLabel,
            difficulty : libPuzzle.difficulty,
            shapeId    : libPuzzle.shapeId,
          };
          G.libraryTimeSec = libPuzzle.timeSec;
          G.recentCats.push(libPuzzle.catIdx);
          if (G.recentCats.length > CAT_WINDOW) G.recentCats.shift();
        } else {
          attempts++;
        }
      }
    }

    if (libPuzzle) {
      G.puzzle = libPuzzle;
      G.puzzleSource = 'library';
      G.libraryPuzzles++;
    } else {
      // Procedural puzzle from a fresh seed (existing path — unchanged)
      const puzzleSeed = (Date.now() ^ (G.round*2654435761)) >>> 0;
      G.puzzle = makePuzzle(useDiff, puzzleSeed);
      G.puzzleSource = 'random';
    }
    G.typeMeta = TYPE_META[chosenType];
    setHintNodes();

    updateTypeBadge();
    updateHUD();

    startPuzzleTimer();
  }

  /* =================================================================
     UI COMPONENTS
     ================================================================= */
  function updateHUD() {
    const el = document.getElementById('mt3HUD');
    if (!el) return;
    const hearts = '❤️'.repeat(Math.max(0,G.lives)) + '🩶'.repeat(Math.max(0,3-G.lives));
    const tier = comboTier(G.combo);
    const comboBadge = G.combo >= 3
      ? `<span class="mt3-cbadge" style="color:${tier.color};border-color:${tier.color};background:${tier.color}18">
           ${G.combo>=20?'✨':G.combo>=10?'🔥':G.combo>=5?'⚡':'🎯'} ${tier.name} ×${G.combo}
         </span>`
      : '';
    el.innerHTML = `
      <div class="mt3-hud-l">
        <span class="mt3-hearts">${hearts}</span>
        <span class="mt3-rnd">R${G.round}</span>
        <span class="mt3-rnd mt3-diff">${'◆'.repeat(G.puzzle ? G.puzzle.diff : 1)}</span>
      </div>
      <div class="mt3-hud-r">
        ${comboBadge}
      </div>`;
    const hb = document.getElementById('mt3Hint');
    if (hb) {
      hb.textContent = '💡 Hint · ' + G.hintsLeft;
      hb.disabled = G.hintsLeft <= 0;
    }
  }

  function updateTypeBadge() {
    const el = document.getElementById('mt3TypeBadge');
    if (!el || !G.typeMeta) return;
    const isSpecial = G.type !== 'normal';
    /* When a library shape is loaded, its category + sub-label take
       priority over the generic "One Stroke" name so the player sees
       "Fish", "Rocket", "Snowflake" etc. */
    const lib = G.puzzleSource === 'library' ? G.libraryMeta : null;
    const displayName = lib ? lib.subLabel : G.typeMeta.name;
    const displaySub  = lib
      ? `${lib.category} · Trace every edge without lifting.`
      : G.typeMeta.desc;
    el.className = 'mt3-type-badge'
      + (isSpecial ? ' mt3-special' : '')
      + (lib ? ' mt3-lib' : '');
    el.innerHTML = `
      <span class="mt3-badge-icon">${G.typeMeta.icon}</span>
      <div>
        <strong>${displayName}${isSpecial?' <span class="mt3-tag-special">SPECIAL</span>':''}${lib?' <span class="mt3-tag-lib">SHAPE</span>':''}</strong>
        <small>${displaySub}</small>
      </div>`;
  }

  function setTip(text) {
    const el = document.getElementById('mt3Tip');
    if (el) el.textContent = text;
  }

  function showPop(text, color, dur) {
    const ga = document.getElementById('mt3GameArea');
    if (!ga) return;
    const el = document.createElement('div');
    el.className = 'mt3-pop';
    el.textContent = text;
    el.style.cssText = `color:${color};border-color:${color};background:${color}1F;`;
    ga.appendChild(el);
    setTimeout(() => el.remove(), dur || 900);
  }

  function showComboPop(bd) {
    const ga = document.getElementById('mt3GameArea');
    if (!ga) return;
    const el = document.createElement('div');
    el.className = 'mt3-combo-pop';
    const detail = [];
    if (bd.perfectBonus)  detail.push('Perfect +'+bd.perfectBonus);
    if (bd.speedBonus)    detail.push('Fast +'+bd.speedBonus);
    if (bd.planBonus)     detail.push('Plan +'+bd.planBonus);
    if (bd.sizeBonus)     detail.push('Size +'+bd.sizeBonus);
    if (bd.specialBonus)  detail.push('Special +'+bd.specialBonus);
    if (bd.hintPenalty)   detail.push('Hint −'+bd.hintPenalty);
    if (bd.mult>1)        detail.push('×'+bd.mult.toFixed(2));
    el.innerHTML = `
      <div class="mt3-cp-total">+${bd.total}</div>
      <div class="mt3-cp-sub">${detail.join(' · ') || 'Solved!'}</div>`;
    ga.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  /* =================================================================
     GAME OVER — Premium Analysis
     ================================================================= */
  function ratingFromScore(s) {
    // s is a 0–100 style composite score
    if (s >= 85) return 'Master Planner';
    if (s >= 70) return 'Expert';
    if (s >= 55) return 'Strategic';
    if (s >= 40) return 'Focused';
    return 'Beginner';
  }

  function computeAnalysis() {
    const rounds = Math.max(1, G.round);
    const accuracy = Math.round(G.correctAnswers / rounds * 100);
    const avgPlan  = G.correctAnswers > 0 ? G.totalPlanMs / G.correctAnswers / 1000 : 0;
    const avgDraw  = G.drawTimes.length > 0
      ? G.drawTimes.reduce((a,b)=>a+b,0)/G.drawTimes.length/1000 : 0;
    const fastest  = G.drawTimes.length ? Math.min(...G.drawTimes)/1000 : 0;

    // Consistency = 1 - stddev/mean of draw times, clipped to [0,1]
    let consistency = 0.5;
    if (G.drawTimes.length >= 3) {
      const mean = G.drawTimes.reduce((a,b)=>a+b,0)/G.drawTimes.length;
      const variance = G.drawTimes.reduce((a,b)=>a+(b-mean)**2,0)/G.drawTimes.length;
      const std = Math.sqrt(variance);
      consistency = Math.max(0, Math.min(1, 1 - std/(mean||1)));
    }

    // Composite metrics, all 0–100
    const planning = Math.round(Math.max(0, Math.min(100,
      avgPlan >= 2 ? 50 + Math.min(50, (avgPlan-2)*15)
                   : avgPlan*25)));
    const acc      = accuracy;
    const cons     = Math.round(consistency*100);
    const speed    = Math.round(Math.max(0, Math.min(100,
      100 - avgDraw*10)));
    const decision = Math.round(Math.max(0, Math.min(100,
      G.bestCombo*8 + (G.perfectPuzzles / rounds)*40)));
    const visual   = Math.round(Math.max(0, Math.min(100,
      accuracy*0.6 + G.round*1.2)));

    const composite = Math.round(
      (planning*0.28 + acc*0.20 + cons*0.15 + decision*0.20 + visual*0.10 + speed*0.07)
    );
    const rating = ratingFromScore(composite);

    return { accuracy, avgPlan, avgDraw, fastest, consistency,
             planning, acc, cons, speed, decision, visual,
             composite, rating };
  }

  function buildStatBar(label, val, colorTuple) {
    // colorTuple: [barColor]
    const c = colorTuple || '#7C3AED';
    return `
      <div class="mt3-stat-row">
        <div class="mt3-stat-lbl">${label}</div>
        <div class="mt3-stat-bar">
          <div class="mt3-stat-fill" style="width:${val}%;background:${c};"></div>
        </div>
        <div class="mt3-stat-val">${val}</div>
      </div>`;
  }

  /* One actionable coaching line, picked from the weakest habit. */
  function coachTip(A) {
    if (G.deadEnds >= 2)
      return '🚧 You hit ' + G.deadEnds + ' dead ends. Before starting, count the lines at each node — nodes with an odd count are the only safe starting points.';
    if (A.avgPlan < 1.2)
      return '⏳ You start drawing almost instantly. Pausing 2 seconds to trace the route with your eyes usually beats fast fingers here.';
    if (G.hintsUsed >= 2)
      return '💡 You leaned on hints. Try saving the last line for the node you started from — that\'s the classic one-stroke trick.';
    if (G.resetsUsed >= 3)
      return '↺ Lots of restarts. Remember you can drag backwards to undo a single line instead of starting over.';
    if (A.cons < 45)
      return '📉 Your solve times swing a lot. Aim for a steady rhythm — consistency scores higher than raw speed.';
    if (G.bestCombo >= 8)
      return '🔥 Great combo streak. Push for a x10+ chain next run to unlock the biggest multipliers.';
    return '✨ Solid run. Larger shapes are worth more points — hold out for the big ones once your combo is hot.';
  }

  function gameOver() {
    if (destroyed) return;
    const A = computeAnalysis();
    const saved = mergeStats(G);
    const isNewHighRound = G.round >= (saved.highRound||0);
    const dailyDone = G.daily && G.dailyProgress >= G.daily.target;

    const statsHtml = `
      <div class="mt3-eo">
        <div class="mt3-eo-composite">
          <div class="mt3-eo-cscore">${A.composite}</div>
          <div class="mt3-eo-clabel">Mind Score</div>
          <div class="mt3-eo-rating">${A.rating}</div>
        </div>

        <div class="mt3-eo-section">
          <div class="mt3-eo-title">🧠 Mind Performance</div>
          ${buildStatBar('Planning',      A.planning, '#7C3AED')}
          ${buildStatBar('Accuracy',      A.acc,      '#22C55E')}
          ${buildStatBar('Consistency',   A.cons,     '#F59E0B')}
          ${buildStatBar('Decision',      A.decision, '#F472B6')}
          ${buildStatBar('Visual Reason', A.visual,   '#4F8EF7')}
          ${buildStatBar('Speed',         A.speed,    '#EF4444')}
        </div>

        <div class="mt3-eo-section">
          <div class="mt3-eo-title">📊 This Session</div>
          <div class="mt3-eo-grid">
            <div><span>${G.round}</span><small>Rounds</small></div>
            <div><span>${A.accuracy}%</span><small>Accuracy</small></div>
            <div><span>${G.perfectPuzzles}</span><small>Perfect</small></div>
            <div><span>${G.bestCombo}×</span><small>Best Combo</small></div>
            <div><span>${A.avgPlan.toFixed(1)}s</span><small>Avg Plan</small></div>
            <div><span>${A.avgDraw.toFixed(1)}s</span><small>Avg Draw</small></div>
          </div>
        </div>

        <div class="mt3-eo-section">
          <div class="mt3-eo-title">🔍 Habits</div>
          <div class="mt3-eo-grid">
            <div><span>${G.hintsUsed}</span><small>Hints Used</small></div>
            <div><span>${G.undosUsed}</span><small>Undos</small></div>
            <div><span>${G.deadEnds}</span><small>Dead Ends</small></div>
          </div>
          <div class="mt3-eo-advice">${coachTip(A)}</div>
        </div>

        <div class="mt3-eo-section">
          <div class="mt3-eo-title">🏆 Lifetime</div>
          <div class="mt3-eo-grid">
            <div><span>${saved.highRound||G.round}</span><small>Best Round${isNewHighRound?' ✨':''}</small></div>
            <div><span>${saved.puzzlesSolved||0}</span><small>Solved</small></div>
            <div><span>${saved.perfectPuzzles||0}</span><small>Perfect</small></div>
            <div><span>${saved.longestCombo||0}×</span><small>Longest Combo</small></div>
          </div>
        </div>

        ${G.daily ? `
          <div class="mt3-eo-daily ${dailyDone?'done':''}">
            <div>${G.daily.icon} <strong>${G.daily.title}</strong></div>
            <div class="mt3-eo-daily-p">
              ${dailyDone
                ? '✅ Completed!'
                : `${Math.min(G.dailyProgress||0, G.daily.target)}/${G.daily.target}`}
            </div>
          </div>` : ''}
      </div>`;

    end({
      value: G.score,
      points: G.score >= 100 ? 13 : G.score >= 55 ? 11 : G.score >= 22 ? 8 : 5,
      starThresh: [30, 70, 120],
      summary: statsHtml
    });
  }

  /* =================================================================
     BUILD GAME LAYOUT
     ================================================================= */
  function buildLayout() {
    body.innerHTML = `
      <div class="mt3-wrap" id="mt3GameArea">
        <div class="mt3-hud" id="mt3HUD"></div>
        <div class="mt3-type-badge" id="mt3TypeBadge"></div>
        <div class="mt3-board" id="mt3Board"></div>
        <div class="mt3-foot">
          <button class="mt3-reset-btn mt3-undo-btn" id="mt3Undo">↶ Undo</button>
          <button class="mt3-reset-btn" id="mt3Reset">↺ Restart</button>
          <button class="mt3-reset-btn mt3-hint-btn" id="mt3Hint">💡 Hint · ${G.hintsLeft}</button>
        </div>
        <div class="mt3-tip" id="mt3Tip">Tap a glowing node, then drag through every line without lifting.</div>
      </div>`;

    makeCanvas();
    document.getElementById('mt3Board').appendChild(canvas);
    bindPointer();

    document.getElementById('mt3Reset').onclick = () => {
      if (G.phase !== 'play' && G.phase !== 'plan') return;
      G.resetsUsed++;
      resetDraw(true);
      showPop('↺ Restarted', '#F59E0B');
    };

    document.getElementById('mt3Undo').onclick = () => {
      if (G.phase !== 'play') return;
      if (G.path.length < 2) { showPop('Nothing to undo', '#94A3B8', 700); return; }
      const last = G.path.pop();
      const prev = G.path[G.path.length-1];
      G.tracedEdges.delete(ek(last, prev));
      G.currentNode = prev;
      G.undosUsed++;
      G.drawing = false;
      if (typeof haptic === 'function') haptic(12);
      showPop('↶ Undo', '#A78BFA', 650);
    };

    document.getElementById('mt3Hint').onclick = () => useHint();

    // Handle resize (rotation) — handler is removed on cleanup
    let resizeTimer;
    onResizeHandler = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (destroyed) return;
        const boardEl = document.getElementById('mt3Board');
        if (!boardEl) return;
        const newSize = computeBoardSize();
        if (Math.abs(newSize - CW) < 5) return;
        // Rebuild canvas
        canvas.remove();
        makeCanvas();
        boardEl.appendChild(canvas);
        bindPointer();
      }, 220);
    };
    window.addEventListener('resize', onResizeHandler);

    startLoop();
    nextPuzzle();
  }

  /* =================================================================
     ANIMATED START-SCREEN DEMO
     ---------------------------------------------------------------
     A tiny canvas that continuously solves random small graphs.
     ================================================================= */
  function startAnimatedDemo(demoCanvas) {
    // Render crisp on high-DPI (retina) screens
    const dpr = window.devicePixelRatio || 1;
    const size = demoCanvas.width;
    demoCanvas.width  = size * dpr;
    demoCanvas.height = size * dpr;
    const dctx = demoCanvas.getContext('2d');
    dctx.scale(dpr, dpr);
    let demo = null;
    let solveOrder = [];
    let progress = 0;
    let phase = 'plan';       // plan | draw | done
    let phaseStart = performance.now();
    let running = true;

    // Simple triangle/square/kite loop
    const shapes = [
      { n:[[50,15],[15,80],[85,80]], e:[[0,1],[1,2],[2,0]] },
      { n:[[15,20],[85,20],[85,80],[15,80]], e:[[0,1],[1,2],[2,3],[3,0]] },
      { n:[[50,12],[85,52],[50,88],[15,52]], e:[[0,1],[1,2],[2,3],[3,0],[0,2]] },
      { n:[[50,14],[80,40],[68,80],[32,80],[20,40]], e:[[0,1],[1,2],[2,3],[3,4],[4,0]] },
      { n:[[15,20],[85,20],[50,55],[15,80],[85,80]], e:[[0,1],[0,2],[1,2],[2,3],[2,4],[3,4]] },
    ];
    let cur;

    function pickShape() {
      cur = shapes[Math.floor(Math.random()*shapes.length)];
      // Build a valid Euler path via Hierholzer-ish walk
      solveOrder = eulerPath(cur.n.length, cur.e) || [];
      progress = 0;
      phase = 'plan';
      phaseStart = performance.now();
    }

    // Simple Hierholzer for the demo
    function eulerPath(nCount, edges) {
      const adj = Array.from({length:nCount}, ()=>[]);
      edges.forEach(([a,b],i)=>{
        adj[a].push({to:b, i});
        adj[b].push({to:a, i});
      });
      const deg = adj.map(a=>a.length);
      const start = deg.findIndex(d=>d%2!==0);
      const startNode = start === -1 ? 0 : start;
      const used = new Set();
      const stack = [startNode];
      const path = [];
      while (stack.length) {
        const u = stack[stack.length-1];
        let found = false;
        for (const e of adj[u]) {
          if (!used.has(e.i)) {
            used.add(e.i);
            stack.push(e.to);
            found = true;
            break;
          }
        }
        if (!found) path.push(stack.pop());
      }
      // path is node order in reverse; but for our purpose, either dir is fine
      if (path.length !== edges.length + 1) return null;
      return path.reverse();
    }

    function pos(n) {
      const pad = size*0.14;
      return [pad + n[0]/100*(size-pad*2),
              pad + n[1]/100*(size-pad*2)];
    }

    function loop(t) {
      if (!running) return;
      requestAnimationFrame(loop);
      const now = t || performance.now();
      dctx.clearRect(0,0,size,size);

      // background
      const g = dctx.createLinearGradient(0,0,size,size);
      g.addColorStop(0,'#180935'); g.addColorStop(1,'#22114A');
      dctx.fillStyle = g;
      dctx.beginPath();
      const r = 14;
      // rounded rect
      dctx.moveTo(r,0); dctx.lineTo(size-r,0);
      dctx.arcTo(size,0,size,r,r);
      dctx.lineTo(size,size-r);
      dctx.arcTo(size,size,size-r,size,r);
      dctx.lineTo(r,size);
      dctx.arcTo(0,size,0,size-r,r);
      dctx.lineTo(0,r);
      dctx.arcTo(0,0,r,0,r);
      dctx.closePath();
      dctx.fill();

      if (!cur) pickShape();

      const elapsed = now - phaseStart;
      if (phase === 'plan') {
        // 700ms plan phase — nodes pulse gently
        if (elapsed > 700) { phase = 'draw'; phaseStart = now; progress = 0; }
      } else if (phase === 'draw') {
        // Advance one edge every 350ms
        const advanceMs = 320;
        progress = Math.min(solveOrder.length-1, elapsed / advanceMs);
        if (progress >= solveOrder.length - 1) {
          phase = 'done'; phaseStart = now;
        }
      } else if (phase === 'done') {
        if (elapsed > 700) pickShape();
      }

      // === Draw untraced edges ===
      const doneEdges = new Set();
      const currentIntEdge = Math.floor(progress);
      const frac = progress - currentIntEdge;
      for (let i=0;i<currentIntEdge && i<solveOrder.length-1;i++) {
        const a = solveOrder[i], b = solveOrder[i+1];
        const key = a<b?`${a}-${b}`:`${b}-${a}`;
        doneEdges.add(key);
      }

      cur.e.forEach(([a,b]) => {
        const [x1,y1] = pos(cur.n[a]);
        const [x2,y2] = pos(cur.n[b]);
        const key = a<b?`${a}-${b}`:`${b}-${a}`;
        const traced = doneEdges.has(key) || phase==='done';
        dctx.save();
        dctx.lineCap='round';
        if (traced) {
          dctx.strokeStyle = '#4ADE80';
          dctx.lineWidth = 3.5;
          dctx.shadowColor = '#22C55E'; dctx.shadowBlur = 8;
        } else {
          dctx.strokeStyle = '#8B5CF6';
          dctx.lineWidth = 2.5;
          dctx.shadowColor = '#7C3AED'; dctx.shadowBlur = 4;
        }
        dctx.beginPath();
        dctx.moveTo(x1,y1); dctx.lineTo(x2,y2);
        dctx.stroke();
        dctx.restore();
      });

      // Draw the currently-in-progress edge as a partial line
      if (phase==='draw' && currentIntEdge < solveOrder.length-1) {
        const a = solveOrder[currentIntEdge], b = solveOrder[currentIntEdge+1];
        const [x1,y1] = pos(cur.n[a]);
        const [x2,y2] = pos(cur.n[b]);
        dctx.save();
        dctx.lineCap='round';
        dctx.strokeStyle = '#4ADE80';
        dctx.lineWidth = 3.8;
        dctx.shadowColor = '#22C55E'; dctx.shadowBlur = 10;
        dctx.beginPath();
        dctx.moveTo(x1,y1);
        dctx.lineTo(x1 + (x2-x1)*frac, y1 + (y2-y1)*frac);
        dctx.stroke();
        dctx.restore();
      }

      // === Nodes ===
      cur.n.forEach((n,i) => {
        const [x,y] = pos(n);
        const isStart = (solveOrder[0]===i);
        const nodePulse = phase==='plan'
          ? 0.6 + 0.4*Math.sin(now*0.006 + i)
          : 1;
        dctx.save();
        dctx.shadowColor = '#7C3AED';
        dctx.shadowBlur = 8*nodePulse;
        dctx.fillStyle = isStart && phase==='plan' ? '#FCD34D' : '#A78BFA';
        dctx.beginPath();
        dctx.arc(x,y,5.5,0,Math.PI*2);
        dctx.fill();
        dctx.restore();
      });
    }
    requestAnimationFrame(loop);

    // Stop function
    return () => { running = false; };
  }

  /* =================================================================
     START SCREEN (Premium landing)
     ================================================================= */
  const best  = (()=>{ try{ return JSON.parse(localStorage.getItem('nz_best_scores')||'{}'); }catch(e){ return {}; }})();
  const plays = (()=>{ try{ return JSON.parse(localStorage.getItem('nz_game_plays')||'{}'); }catch(e){ return {}; }})();
  const stats = loadStats();
  const daily = dailyChallenge();

  body.innerHTML = `
    <div class="mt3-start">
      <div class="mt3-hero">
        <canvas id="mt3DemoCanvas" width="200" height="200"
          style="width:200px;height:200px;border-radius:18px;
                 box-shadow:0 10px 34px rgba(124,58,237,.35);"></canvas>
        <h1 class="mt3-hero-title">Mind Trace</h1>
        <div class="mt3-hero-tag">Logic · Planning</div>
        <p class="mt3-hero-quote">A single stroke.<br><span>Infinite possibilities.</span></p>
        <p class="mt3-hero-sub">Plan your route before touching the screen.</p>
      </div>

      <div class="mt3-daily">
        <div class="mt3-daily-ico">${daily.icon}</div>
        <div class="mt3-daily-body">
          <div class="mt3-daily-title">Today's Challenge</div>
          <div class="mt3-daily-goal">${daily.title}</div>
        </div>
        <div class="mt3-daily-badge">+2× XP</div>
      </div>

      <div class="mt3-statgrid">
        <div class="mt3-sg"><div class="v">${stats.bestScore||0}</div><div class="l">Best Score</div></div>
        <div class="mt3-sg"><div class="v">${stats.highRound||0}</div><div class="l">Best Round</div></div>
        <div class="mt3-sg"><div class="v">${stats.longestCombo||0}×</div><div class="l">Longest Combo</div></div>
        <div class="mt3-sg"><div class="v">${stats.perfectPuzzles||0}</div><div class="l">Perfect Puzzles</div></div>
        <div class="mt3-sg"><div class="v">${plays['mindtrace']||0}</div><div class="l">Games Played</div></div>
        <div class="mt3-sg"><div class="v">${stats.puzzlesSolved||0}</div><div class="l">Total Solved</div></div>
      </div>

      <div class="mt3-rules">
        <div class="mt3-rule"><span>✓</span><span>Trace every line exactly once, in one stroke</span></div>
        <div class="mt3-rule"><span>↶</span><span>Drag backwards to undo a line — no penalty</span></div>
        <div class="mt3-rule"><span>💡</span><span>${CFG.hintsPerRun} hints per run reveal a safe next move</span></div>
        <div class="mt3-rule"><span>◉</span><span>Only glowing nodes can start a valid route</span></div>
      </div>

      <button class="btn-primary mt3-start-btn" id="mt3Start">
        <span>Start Tracing</span>
        <span class="mt3-arrow">→</span>
      </button>
    </div>`;

  const demoCanvas = body.querySelector('#mt3DemoCanvas');
  const stopDemo = startAnimatedDemo(demoCanvas);

  body.querySelector('#mt3Start').onclick = () => {
    stopDemo();
    startClock();
    buildLayout();
  };

  // Clean up demo if user backs out
  wrap.addEventListener('remove_game', () => {
    destroyed = true;
    try { stopDemo(); } catch(e){}
    try { stopLoop(); } catch(e){}
    try { clearAllTimeouts(); } catch(e){}
    if (onResizeHandler) {
      window.removeEventListener('resize', onResizeHandler);
      onResizeHandler = null;
    }
  });
}
