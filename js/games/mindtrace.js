/* =====================================================================
   Mind Trace — One-stroke puzzle game for NeuroZen
   Trains: Visual Intelligence, Planning, Spatial Reasoning
   ===================================================================== */

function playMindTrace(body, setScore, end, wrap, startClock) {

  /* ---- PUZZLE LIBRARY ----
     Each puzzle: nodes (x,y as 0-100 percent), edges [[n1,n2],...]
     Euler path exists iff 0 or 2 nodes have odd degree.
     All puzzles here are verified solvable in one stroke. */
  const MT_PUZZLES = [
    /* EASY (diff 1) — simple shapes */
    { name:'Triangle',         diff:1, nodes:[[50,15],[10,85],[90,85]],                             edges:[[0,1],[1,2],[2,0]] },
    { name:'Square',           diff:1, nodes:[[15,15],[85,15],[85,85],[15,85]],                     edges:[[0,1],[1,2],[2,3],[3,0]] },
    { name:'Envelope',         diff:1, nodes:[[10,20],[90,20],[90,80],[10,80],[50,50]],             edges:[[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]] },
    { name:'Diamond',          diff:1, nodes:[[50,10],[90,50],[50,90],[10,50]],                     edges:[[0,1],[1,2],[2,3],[3,0],[0,2]] },
    { name:'Arrow',            diff:1, nodes:[[20,50],[60,50],[60,20],[90,50],[60,80]],             edges:[[0,1],[1,2],[2,3],[3,4],[4,1]] },
    { name:'House',            diff:1, nodes:[[15,90],[85,90],[85,50],[50,15],[15,50]],             edges:[[0,1],[1,2],[2,3],[3,4],[4,0],[2,4]] },
    { name:'Star (simple)',    diff:1, nodes:[[50,10],[80,85],[15,35],[85,35],[20,85]],             edges:[[0,1],[1,2],[2,3],[3,4],[4,0]] },
    { name:'Cross',            diff:1, nodes:[[50,10],[50,50],[90,50],[50,90],[10,50]],             edges:[[0,1],[1,2],[1,3],[1,4]] },
    { name:'Z-shape',          diff:1, nodes:[[10,10],[90,10],[10,90],[90,90]],                     edges:[[0,1],[1,2],[2,3]] },
    { name:'Letter E',         diff:1, nodes:[[20,10],[80,10],[20,50],[70,50],[20,90],[80,90]],     edges:[[0,1],[0,2],[2,3],[2,4],[4,5]] },

    /* MEDIUM (diff 2) */
    { name:'Fish',             diff:2, nodes:[[10,50],[40,20],[40,80],[70,50],[40,50],[90,20],[90,80]], edges:[[0,1],[0,2],[1,3],[2,3],[3,4],[4,1],[4,2],[3,5],[3,6],[5,6]] },
    { name:'Star+Pentagon',    diff:2, nodes:[[50,10],[80,35],[68,75],[32,75],[20,35],[50,50]],     edges:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[1,5],[2,5],[3,5],[4,5]] },
    { name:'Bowtie',           diff:2, nodes:[[10,20],[90,20],[50,50],[10,80],[90,80]],             edges:[[0,1],[0,2],[1,2],[2,3],[2,4],[3,4]] },
    { name:'Grid 2x2',         diff:2, nodes:[[10,10],[50,10],[90,10],[10,50],[50,50],[90,50],[10,90],[50,90],[90,90]], edges:[[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[0,3],[3,6],[1,4],[4,7],[2,5],[5,8]] },
    { name:'Octagon',          diff:2, nodes:[[35,10],[65,10],[90,35],[90,65],[65,90],[35,90],[10,65],[10,35],[50,50]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[2,8],[4,8],[6,8]] },
    { name:'Double Triangle',  diff:2, nodes:[[50,10],[10,80],[90,80],[30,45],[70,45]],             edges:[[0,1],[1,2],[2,0],[0,3],[0,4],[3,4],[1,3],[2,4]] },
    { name:'Kite+tail',        diff:2, nodes:[[50,10],[20,50],[50,70],[80,50],[50,90]],             edges:[[0,1],[1,2],[2,3],[3,0],[0,2],[2,4]] },
    { name:'Flag',             diff:2, nodes:[[10,10],[10,90],[60,10],[60,55],[10,55]],             edges:[[0,1],[0,2],[2,3],[3,4],[4,0]] },

    /* HARD (diff 3) */
    { name:'Cube (2D)',        diff:3, nodes:[[20,20],[60,20],[80,40],[80,80],[60,80],[20,80],[0,60],[0,20],[40,40],[60,60]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[7,8],[8,1],[1,9],[9,3],[8,9]] },
    { name:'Star of David',    diff:3, nodes:[[50,10],[80,60],[20,60],[35,10],[65,10],[80,35],[80,85],[20,85],[20,35],[50,85]], edges:[[0,1],[1,2],[2,0],[3,4],[4,5],[5,6],[6,7],[7,8],[8,3],[0,9],[3,6],[4,7]] },
    { name:'Spiral grid',      diff:3, nodes:[[10,10],[50,10],[90,10],[90,50],[90,90],[50,90],[10,90],[10,50],[30,30],[70,30],[70,70],[30,70],[50,50]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[8,9],[9,10],[10,11],[11,8],[1,9],[3,10],[5,11],[7,8],[12,8],[12,9],[12,10],[12,11]] },
    { name:'Celtic knot',      diff:3, nodes:[[50,10],[80,30],[90,60],[70,85],[50,75],[30,85],[10,60],[20,30],[50,50]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[2,8],[4,8],[6,8],[1,8],[3,8],[5,8],[7,8]] },
    { name:'Molecule',         diff:3, nodes:[[50,20],[80,40],[80,70],[50,85],[20,70],[20,40],[50,52]], edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6]] },
  ];

  /* Remove/add missing edges for "Missing Edges" puzzle type */
  function makeMissingPuzzle(puzzle) {
    const total = puzzle.edges.length;
    const hideCount = Math.max(1, Math.min(3, Math.floor(total * 0.3)));
    const shuffled = [...puzzle.edges].sort(() => Math.random() - .5);
    return {
      visible: shuffled.slice(hideCount),
      hidden: shuffled.slice(0, hideCount)
    };
  }

  /* Build 4 options for "Find The Start" MCQ type */
  function makeStartOptions(puzzle) {
    const degree = {};
    puzzle.nodes.forEach((_, i) => degree[i] = 0);
    puzzle.edges.forEach(([a, b]) => { degree[a]++; degree[b]++; });
    const oddNodes = Object.keys(degree).filter(k => degree[k] % 2 !== 0).map(Number);
    const correctStart = oddNodes.length >= 2 ? oddNodes[0] : 0;
    const wrongStarts = Object.keys(degree).map(Number).filter(n => n !== correctStart).sort(() => Math.random() - .5).slice(0, 3);
    return { correctStart, wrongStarts, allOptions: [correctStart, ...wrongStarts].sort(() => Math.random() - .5) };
  }

  /* ---- GAME STATE ---- */
  const G = {
    round: 0,
    score: 0,
    lives: 3,
    streak: 0,
    bestStreak: 0,
    combo: 0,
    puzzleOrder: [...MT_PUZZLES].sort(() => Math.random() - .5),
    puzzleIdx: 0,
    type: null,
    puzzle: null,
    drawing: false,
    path: [],
    tracedEdges: new Set(),
    startNode: null,
    currentNode: null,
    solved: false,
    failed: false,
    planStart: 0,
    totalPlanMs: 0,
    totalDrawMs: 0,
    drawStart: 0,
    correctAnswers: 0,
  };

  /* ---- RENDER HELPERS ---- */
  const PAD = 30;
  const CSIZE = 280;
  const NODE_R = 12;
  const COLORS = {
    bg: '#1a0533', edge: '#7C3AED', edgeFade: '#3D2060', node: '#A78BFA',
    nodeActive: '#22C55E', nodeStart: '#F59E0B', traced: '#22C55E',
    wrong: '#EF4444', glow: '#C4B5FD'
  };

  function nodeXY(n) {
    return [PAD + (n[0] / 100) * (CSIZE - PAD * 2), PAD + (n[1] / 100) * (CSIZE - PAD * 2)];
  }

  function edgeKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

  function buildSVG(puzzle, tracedEdges, currentNode, startNode, missingEdges, highlightNode) {
    let svg = `<svg viewBox="0 0 ${CSIZE} ${CSIZE}" width="${CSIZE}" height="${CSIZE}" style="display:block;touch-action:none;" id="mtCanvas">`;
    svg += `<defs><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
    puzzle.edges.forEach(([a, b]) => {
      const [x1, y1] = nodeXY(puzzle.nodes[a]);
      const [x2, y2] = nodeXY(puzzle.nodes[b]);
      const ek = edgeKey(a, b);
      const isMissing = missingEdges && missingEdges.some(([ma, mb]) => edgeKey(ma, mb) === ek);
      const isTraced = tracedEdges && tracedEdges.has(ek);
      const color = isMissing ? COLORS.edgeFade : isTraced ? COLORS.traced : COLORS.edge;
      const opacity = isMissing ? '0.25' : '1';
      const sw = isMissing ? '3' : '4';
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="${opacity}" ${isTraced ? 'filter="url(#glow)"' : ''}/>`;
    });
    puzzle.nodes.forEach((n, i) => {
      const [x, y] = nodeXY(n);
      const isStart = i === startNode;
      const isCurrent = i === currentNode;
      const isHighlight = i === highlightNode;
      const fill = isHighlight ? COLORS.nodeStart : isCurrent ? COLORS.nodeActive : (isStart && !isCurrent) ? COLORS.nodeStart : COLORS.node;
      const r = (isCurrent || isHighlight) ? NODE_R + 3 : NODE_R;
      svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" data-ni="${i}" style="cursor:pointer;" ${(isStart || isHighlight) ? 'filter="url(#glow)"' : ''}/>`;
    });
    svg += '</svg>';
    return svg;
  }

  function pickType(round) {
    if (round < 4) return 'onestroke';
    const r = Math.random();
    if (r < 0.55) return 'onestroke';
    if (r < 0.80) return 'missing';
    return 'start';
  }

  function nextPuzzle() {
    if (G.lives <= 0) { gameOver(); return; }
    G.round++;
    G.solved = false;
    G.failed = false;
    G.tracedEdges = new Set();
    G.path = [];
    G.startNode = null;
    G.currentNode = null;
    G.drawing = false;
    G.planStart = Date.now();

    const diffTarget = G.round <= 5 ? 1 : G.round <= 15 ? 2 : 3;
    const pool = G.puzzleOrder.filter(p => p.diff <= diffTarget);
    G.puzzle = pool[G.puzzleIdx % pool.length];
    G.puzzleIdx++;

    G.type = pickType(G.round);
    if (G.type === 'missing') {
      G.missingData = makeMissingPuzzle(G.puzzle);
    } else if (G.type === 'start') {
      G.startData = makeStartOptions(G.puzzle);
    }

    renderPuzzle();
  }

  function renderPuzzle() {
    const typeLabels = { onestroke: '✏️ One Stroke', missing: '🔲 Complete Shape', start: '🎯 Find The Start' };
    const typeDescs = {
      onestroke: 'Trace every line without lifting your finger',
      missing: 'Draw only the faded missing edges',
      start: 'Which node lets you trace in one stroke?'
    };
    const hearts = '❤️'.repeat(G.lives) + '🩶'.repeat(3 - G.lives);
    const comboText = G.combo >= 5 ? (G.combo >= 10 ? '⚡ GENIUS COMBO' : '🔥 FOCUS COMBO') : '';

    body.innerHTML = `
      <div class="mt-wrap">
        <div class="mt-top">
          <div class="mt-lives">${hearts}</div>
          <div class="mt-round">Round ${G.round}</div>
          <div class="mt-score">Score <b>${G.score}</b></div>
        </div>
        ${comboText ? `<div class="mt-combo">${comboText}</div>` : ''}
        <div class="mt-type-badge">
          <span class="mt-type-name">${typeLabels[G.type]}</span>
          <span class="mt-type-desc">${typeDescs[G.type]}</span>
        </div>
        <div class="mt-canvas-wrap" id="mtWrap">
          ${G.type === 'start'
            ? buildStartUI()
            : buildSVG(G.puzzle, G.tracedEdges, G.currentNode, G.startNode, G.type === 'missing' ? G.missingData.hidden : null, null)
          }
        </div>
        ${G.type !== 'start' ? `<button class="mt-reset-btn" id="mtReset">↺ Reset</button>` : ''}
      </div>
    `;

    if (G.type === 'start') {
      bindStartMCQ();
    } else {
      bindDrawing();
      body.querySelector('#mtReset').onclick = () => resetDrawing();
    }
  }

  function buildStartUI() {
    const { allOptions } = G.startData;
    return `
      <div class="mt-start-grid">
        ${allOptions.map((nodeIdx, i) => `
          <div class="mt-start-opt" data-ni="${nodeIdx}">
            <div class="mt-start-label">Start: ${String.fromCharCode(65 + i)}</div>
            ${buildSVG(G.puzzle, new Set(), null, null, null, nodeIdx)}
          </div>
        `).join('')}
      </div>
    `;
  }

  function bindStartMCQ() {
    body.querySelectorAll('.mt-start-opt').forEach(opt => {
      opt.onclick = () => {
        const chosen = +opt.dataset.ni;
        const correct = G.startData.correctStart;
        if (chosen === correct) {
          opt.style.borderColor = '#22C55E';
          handleCorrect();
        } else {
          opt.style.borderColor = '#EF4444';
          body.querySelectorAll('.mt-start-opt').forEach(o => {
            if (+o.dataset.ni === correct) o.style.borderColor = '#22C55E';
          });
          handleWrong();
        }
      };
    });
  }

  function bindDrawing() {
    const svg = body.querySelector('#mtCanvas');
    if (!svg) return;
    svg.addEventListener('touchstart', onTouchStart, { passive: false });
    svg.addEventListener('touchmove', onTouchMove, { passive: false });
    svg.addEventListener('touchend', onTouchEnd, { passive: false });
    svg.addEventListener('mousedown', e => onTouchStart({ touches: [e], preventDefault: () => {} }));
    svg.addEventListener('mousemove', e => { if (G.drawing) onTouchMove({ touches: [e], preventDefault: () => {} }); });
    svg.addEventListener('mouseup', () => onTouchEnd({ preventDefault: () => {} }));
  }

  function svgPoint(svg, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const scaleX = CSIZE / rect.width;
    const scaleY = CSIZE / rect.height;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  }

  function nearestNode(px, py) {
    let best = -1, bestD = 999;
    G.puzzle.nodes.forEach((n, i) => {
      const [nx, ny] = nodeXY(n);
      const d = Math.hypot(px - nx, py - ny);
      if (d < bestD) { bestD = d; best = i; }
    });
    return bestD < 28 ? best : -1;
  }

  function edgeExists(a, b) {
    return G.puzzle.edges.some(([ea, eb]) => (ea === a && eb === b) || (ea === b && eb === a));
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (G.solved || G.failed) return;
    const svg = body.querySelector('#mtCanvas');
    if (!svg) return;
    const [px, py] = svgPoint(svg, e.touches[0].clientX, e.touches[0].clientY);
    const ni = nearestNode(px, py);
    if (ni === -1) return;
    G.drawing = true;
    G.drawStart = Date.now();
    G.path = [ni];
    G.startNode = ni;
    G.currentNode = ni;
    redrawSVG();
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (!G.drawing || G.solved || G.failed) return;
    const svg = body.querySelector('#mtCanvas');
    if (!svg) return;
    const [px, py] = svgPoint(svg, e.touches[0].clientX, e.touches[0].clientY);
    const ni = nearestNode(px, py);
    if (ni === -1 || ni === G.currentNode) return;

    const prev = G.currentNode;
    if (!edgeExists(prev, ni)) { flashInvalid(); return; }

    const ek = edgeKey(prev, ni);

    if (G.type === 'missing') {
      const isMissing = G.missingData.hidden.some(([a, b]) => edgeKey(a, b) === ek);
      if (!isMissing) { flashInvalid(); return; }
    }

    if (G.tracedEdges.has(ek)) { flashInvalid(); return; }

    G.tracedEdges.add(ek);
    G.path.push(ni);
    G.currentNode = ni;
    if (typeof haptic === 'function') haptic(15);
    if (typeof playSound === 'function') playSound('tap');
    redrawSVG();
    checkCompletion();
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (!G.drawing) return;
    G.drawing = false;
    G.totalDrawMs += Date.now() - G.drawStart;
    checkCompletion(true);
  }

  function flashInvalid() {
    const svg = body.querySelector('#mtCanvas');
    if (svg) {
      svg.style.filter = 'drop-shadow(0 0 8px #EF4444)';
      setTimeout(() => { if (svg) svg.style.filter = ''; }, 200);
    }
  }

  function checkCompletion(onLift) {
    const targetEdges = G.type === 'missing' ? G.missingData.hidden : G.puzzle.edges;
    const allTraced = targetEdges.every(([a, b]) => G.tracedEdges.has(edgeKey(a, b)));
    if (allTraced) {
      G.solved = true;
      G.totalPlanMs += G.drawStart - G.planStart;
      handleCorrect();
    }
  }

  function resetDrawing() {
    G.tracedEdges = new Set();
    G.path = [];
    G.startNode = null;
    G.currentNode = null;
    G.drawing = false;
    redrawSVG();
  }

  function redrawSVG() {
    const wrap = body.querySelector('#mtWrap');
    if (!wrap) return;
    const newSvg = buildSVG(
      G.puzzle, G.tracedEdges, G.currentNode, G.startNode,
      G.type === 'missing' ? G.missingData.hidden : null, null
    );
    wrap.innerHTML = newSvg + `<button class="mt-reset-btn" id="mtReset" style="margin-top:12px;">↺ Reset</button>`;
    bindDrawing();
    const resetBtn = body.querySelector('#mtReset');
    if (resetBtn) resetBtn.onclick = () => resetDrawing();
  }

  function handleCorrect() {
    G.correctAnswers++;
    G.streak++;
    G.combo++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    const pts = 10 + (G.combo >= 10 ? 5 : G.combo >= 5 ? 3 : 0);
    G.score += pts;
    setScore(G.score);
    if (typeof haptic === 'function') haptic([30, 20, 40]);
    if (typeof playSound === 'function') playSound('correct');
    showFeedback(true, '+' + pts);
    setTimeout(() => nextPuzzle(), 900);
  }

  function handleWrong() {
    G.lives--;
    G.streak = 0;
    G.combo = 0;
    if (typeof haptic === 'function') haptic([50, 30, 50]);
    if (typeof playSound === 'function') playSound('wrong');
    showFeedback(false, '');
    if (G.lives <= 0) {
      setTimeout(() => gameOver(), 900);
    } else {
      setTimeout(() => { resetDrawing(); renderPuzzle(); }, 1200);
    }
  }

  function showFeedback(correct, extra) {
    const fb = document.createElement('div');
    fb.className = 'mt-feedback ' + (correct ? 'mt-fb-ok' : 'mt-fb-no');
    fb.textContent = correct ? ('✓ ' + extra) : '✗ Wrong!';
    body.appendChild(fb);
    setTimeout(() => fb.remove(), 800);
  }

  function gameOver() {
    const planAvg = G.correctAnswers > 0 ? Math.round(G.totalPlanMs / G.correctAnswers / 100) / 10 : 0;
    const accuracy = G.round > 0 ? Math.round(G.correctAnswers / G.round * 100) : 0;
    const spatialIQ = Math.round(60 + accuracy * 0.5 + Math.min(G.bestStreak * 2, 20) + (planAvg < 3 ? 10 : planAvg < 6 ? 5 : 0));

    end({
      value: G.score,
      points: G.score >= 50 ? 45 : G.score >= 25 ? 30 : G.score >= 10 ? 18 : 8,
      starThresh: [10, 25, 50],
      summary: `
        <div class="row"><span>Rounds</span><span class="val">${G.round}</span></div>
        <div class="row"><span>Accuracy</span><span class="val">${accuracy}%</span></div>
        <div class="row"><span>Best Streak</span><span class="val">${G.bestStreak}</span></div>
        <div class="row"><span>Spatial IQ</span><span class="val">${spatialIQ}</span></div>
        <div class="row"><span>Avg Plan Time</span><span class="val">${planAvg}s</span></div>
      `
    });
  }

  /* ---- START SCREEN ---- */
  const nzBest = (function(){ try{ return JSON.parse(localStorage.getItem('nz_best_scores')||'{}'); }catch(e){ return {}; } })();
  const nzPlays = (function(){ try{ return JSON.parse(localStorage.getItem('nz_game_plays')||'{}'); }catch(e){ return {}; } })();

  body.innerHTML = `
    <div class="ss-start">
      <div class="ss-stats">
        <div class="ss-stat"><div class="v">${nzBest['mindtrace']||0}</div><div class="l">Best Score</div></div>
        <div class="ss-stat"><div class="v">${nzPlays['mindtrace']||0}</div><div class="l">Games</div></div>
      </div>
      <div class="mt-start-explain">
        <div class="mt-start-icon">✏️</div>
        <h2 style="font-size:22px;font-weight:800;margin:8px 0;">Mind Trace</h2>
        <p style="font-size:13px;color:var(--text2);line-height:1.6;text-align:center;">
          Trace every line in <strong>ONE continuous stroke</strong> without lifting your finger.<br>
          Plan your path before drawing — think first!
        </p>
        <div class="mt-rules">
          <div class="mt-rule">✏️ <span>One stroke — don't lift your finger</span></div>
          <div class="mt-rule">🔄 <span>No retracing the same edge twice</span></div>
          <div class="mt-rule">🎯 <span>3 lives — plan before you draw!</span></div>
        </div>
      </div>
      <button class="btn-primary" id="mtStart">Start Tracing →</button>
    </div>
  `;

  body.querySelector('#mtStart').onclick = () => {
    startClock();
    nextPuzzle();
  };
}
