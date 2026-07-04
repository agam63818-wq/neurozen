/* =====================================================================
   Mind Trace — Premium Canvas Redesign for NeuroZen
   60fps canvas, neon glow, particles, speed bonus, brain rating
   ===================================================================== */

function playMindTrace(body, setScore, end, wrap, startClock) {

  /* ---- CONSTANTS ---- */
  const PAD  = 26;
  const NR   = 12;   /* node radius */
  const SNAP = 38;   /* touch snap radius */

  /* ---- PUZZLE LIBRARY ---- */
  /* n = node coords [x,y] as 0-100%, e = edges [a,b] */
  const PUZZLES = [
    /* EASY diff:1 */
    {name:'Triangle',    diff:1, n:[[50,15],[12,85],[88,85]],                                           e:[[0,1],[1,2],[2,0]]},
    {name:'Square',      diff:1, n:[[15,15],[85,15],[85,85],[15,85]],                                   e:[[0,1],[1,2],[2,3],[3,0]]},
    {name:'Arrow',       diff:1, n:[[12,50],[55,50],[55,22],[88,50],[55,78]],                           e:[[0,1],[1,2],[2,3],[3,4],[4,1]]},
    {name:'House',       diff:1, n:[[15,88],[85,88],[85,52],[50,15],[15,52]],                           e:[[0,1],[1,2],[2,3],[3,4],[4,0],[2,4]]},
    {name:'Z-shape',     diff:1, n:[[12,15],[88,15],[12,85],[88,85]],                                   e:[[0,1],[1,2],[2,3]]},
    {name:'Kite',        diff:1, n:[[50,10],[20,52],[50,75],[80,52]],                                   e:[[0,1],[1,2],[2,3],[3,0],[0,2]]},
    {name:'Fan',         diff:1, n:[[50,82],[15,82],[30,48],[50,25],[70,48],[85,82]],                   e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,2],[0,4]]},
    {name:'Bridge',      diff:1, n:[[10,50],[35,20],[35,80],[65,20],[65,80],[90,50]],                   e:[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,5]]},
    {name:'Letter L',    diff:1, n:[[20,15],[20,85],[75,85]],                                           e:[[0,1],[1,2]]},
    {name:'Diamond',     diff:1, n:[[50,10],[88,50],[50,90],[12,50]],                                   e:[[0,1],[1,2],[2,3],[3,0],[0,2]]},
    /* MEDIUM diff:2 */
    {name:'Bowtie',      diff:2, n:[[10,22],[90,22],[50,50],[10,78],[90,78]],                           e:[[0,1],[0,2],[1,2],[2,3],[2,4],[3,4]]},
    {name:'Envelope',    diff:2, n:[[10,22],[90,22],[90,78],[10,78],[50,50]],                           e:[[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]]},
    {name:'Star',        diff:2, n:[[50,10],[80,35],[68,78],[32,78],[20,35],[50,50]],                   e:[[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[1,5],[2,5],[3,5],[4,5]]},
    {name:'DoubleTri',   diff:2, n:[[50,10],[12,80],[88,80],[32,48],[68,48]],                           e:[[0,1],[1,2],[2,0],[0,3],[0,4],[3,4],[1,3],[2,4]]},
    {name:'Fish',        diff:2, n:[[10,50],[40,22],[40,78],[70,50],[40,50]],                           e:[[0,1],[0,2],[1,3],[2,3],[3,4],[4,1],[4,2]]},
    {name:'Grid2x2',     diff:2, n:[[15,15],[50,15],[85,15],[15,50],[50,50],[85,50],[15,85],[50,85],[85,85]], e:[[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[0,3],[3,6],[1,4],[4,7],[2,5],[5,8]]},
    {name:'Octagon+',    diff:2, n:[[35,10],[65,10],[88,35],[88,65],[65,90],[35,90],[12,65],[12,35],[50,50]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[2,8],[4,8],[6,8]]},
    {name:'Flag',        diff:2, n:[[15,15],[15,85],[65,15],[65,55],[15,55]],                           e:[[0,1],[0,2],[2,3],[3,4],[4,0]]},
    /* HARD diff:3 */
    {name:'Celtic',      diff:3, n:[[50,10],[80,30],[90,60],[70,85],[50,75],[30,85],[10,60],[20,30],[50,50]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,8],[2,8],[4,8],[6,8],[1,8],[3,8],[5,8],[7,8]]},
    {name:'Molecule',    diff:3, n:[[50,18],[80,38],[80,68],[50,85],[20,68],[20,38],[50,52]],           e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6],[1,6],[2,6],[3,6],[4,6],[5,6]]},
    {name:'Web',         diff:3, n:[[50,10],[82,32],[82,68],[50,88],[18,68],[18,32],[50,35],[72,47],[50,65],[28,47]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[6,7],[7,8],[8,9],[9,6],[0,6],[1,7],[2,7],[2,8],[3,8],[4,9],[5,9],[5,6]]},
    {name:'Cube2D',      diff:3, n:[[20,20],[60,20],[80,40],[80,80],[60,80],[20,80],[0,60],[0,20],[40,40],[60,60]], e:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[7,8],[8,1],[1,9],[9,3],[8,9]]},
  ];

  /* ---- PROCEDURAL TRANSFORM ---- */
  function applyTransform(base, seed) {
    const rot   = (seed % 8) * 45;
    const mirror = Math.floor(seed / 8) % 2 === 1;
    const rad   = rot * Math.PI / 180;
    const cos   = Math.cos(rad), sin = Math.sin(rad);

    const nodes = base.n.map(([x, y]) => {
      let nx = (x - 50) / 50, ny = (y - 50) / 50;
      const rx = nx * cos - ny * sin;
      const ry = nx * sin + ny * cos;
      const mx = mirror ? -rx : rx;
      return [Math.round(Math.max(8, Math.min(92, mx * 44 + 50))),
              Math.round(Math.max(8, Math.min(92, ry * 44 + 50)))];
    });
    return { name: base.name, diff: base.diff, nodes, edges: base.e };
  }

  /* ---- STATE ---- */
  const G = {
    round: 0, score: 0, lives: 3,
    combo: 0, bestCombo: 0, streak: 0, bestStreak: 0,
    correctAnswers: 0, totalPlanMs: 0,
    drawTimes: [], poolIdx: 0,
    puzzle: null, type: 'onestroke',
    missingData: null, startData: null,
    drawing: false, currentNode: -1, startNode: -1,
    tracedEdges: new Set(), path: [],
    planStart: 0, drawStart: 0,
    phase: 'play', /* play | success | done */
    particles: [], failAlpha: 0,
    hintNodes: [],
  };

  /* ---- CANVAS GLOBALS ---- */
  let canvas, ctx, animId = null, CW = 300, CH = 300;

  /* ---- HELPERS ---- */
  function ek(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

  function nodePos(n) {
    return [PAD + n[0] / 100 * (CW - PAD * 2),
            PAD + n[1] / 100 * (CH - PAD * 2)];
  }

  function nearest(px, py) {
    let best = -1, bd = SNAP;
    if (!G.puzzle) return -1;
    G.puzzle.nodes.forEach((n, i) => {
      const [x, y] = nodePos(n);
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function edgeExists(a, b) {
    return G.puzzle.edges.some(([ea, eb]) => (ea===a&&eb===b)||(ea===b&&eb===a));
  }

  function getOddNodes(puzzle) {
    const deg = {};
    puzzle.nodes.forEach((_, i) => { deg[i] = 0; });
    puzzle.edges.forEach(([a, b]) => { deg[a]++; deg[b]++; });
    return Object.keys(deg).filter(k => deg[k] % 2 !== 0).map(Number);
  }

  function setHintNodes() {
    const odd = getOddNodes(G.puzzle);
    G.hintNodes = odd.length >= 2 ? odd : G.puzzle.nodes.map((_, i) => i);
  }

  /* ---- CANVAS SETUP ---- */
  function makeCanvas() {
    const avail = Math.min((body.clientWidth || 340) - 24, 330);
    CW = CH = Math.max(260, avail);
    const dpr = window.devicePixelRatio || 1;
    canvas = document.createElement('canvas');
    canvas.width  = Math.round(CW * dpr);
    canvas.height = Math.round(CH * dpr);
    canvas.style.cssText = `width:${CW}px;height:${CH}px;border-radius:18px;` +
      `touch-action:none;display:block;cursor:crosshair;user-select:none;`;
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /* ---- RENDER LOOP ---- */
  function startLoop() {
    if (animId) cancelAnimationFrame(animId);
    (function loop() { animId = requestAnimationFrame(loop); drawFrame(); })();
  }

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, CW, CH);

    /* background */
    ctx.fillStyle = '#0D0119';
    roundRect(0, 0, CW, CH, 18);
    ctx.fill();

    /* subtle grid dots */
    ctx.fillStyle = 'rgba(124,58,237,0.08)';
    for (let gx = 20; gx < CW; gx += 22)
      for (let gy = 20; gy < CH; gy += 22) {
        ctx.beginPath(); ctx.arc(gx, gy, 1.2, 0, Math.PI*2); ctx.fill();
      }

    if (!G.puzzle) return;

    const now = Date.now();
    const p   = G.puzzle;
    const isSuccess = G.phase === 'success';

    /* === EDGES === */
    p.edges.forEach(([a, b]) => {
      const [x1,y1] = nodePos(p.nodes[a]);
      const [x2,y2] = nodePos(p.nodes[b]);
      const key = ek(a, b);
      const isTraced  = G.tracedEdges.has(key);
      const isMissing = G.type === 'missing' &&
        G.missingData.hidden.some(([ma,mb]) => ek(ma,mb) === key);

      ctx.save();
      ctx.lineCap = 'round';

      if (isSuccess) {
        const pulse = 0.7 + 0.3 * Math.sin(now * 0.008 + a);
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur  = 14 * pulse;
        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth   = 5;
      } else if (isTraced) {
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur  = 12;
        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth   = 4.5;
      } else if (isMissing) {
        ctx.strokeStyle = '#4B2A80';
        ctx.lineWidth   = 3;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([6, 5]);
      } else {
        const glow = 0.3 + 0.15 * Math.sin(now * 0.0015 + a + b);
        ctx.shadowColor = '#7C3AED';
        ctx.shadowBlur  = 8 * glow;
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth   = 3.5;
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    });

    /* === NODES === */
    p.nodes.forEach((n, i) => {
      const [x, y] = nodePos(n);
      const isCur  = i === G.currentNode;
      const isSt   = i === G.startNode && G.startNode >= 0;
      const isHint = G.hintNodes.includes(i) && !G.drawing && G.startNode < 0;

      ctx.save();
      let fill, shadow, r = NR;

      if (isSuccess) {
        const p2 = 0.7 + 0.3 * Math.sin(now * 0.007 + i * 1.2);
        fill   = '#4ADE80'; shadow = '#22C55E';
        ctx.shadowBlur = 20 * p2; r = NR + 2;
      } else if (isCur) {
        fill   = '#34D399'; shadow = '#22C55E';
        ctx.shadowBlur = 22; r = NR + 3;
      } else if (isSt) {
        fill   = '#FCD34D'; shadow = '#F59E0B';
        ctx.shadowBlur = 16;
      } else if (isHint) {
        const p2 = 0.5 + 0.5 * Math.sin(now * 0.004 + i * 1.8);
        fill   = `rgba(245,158,11,${0.65 + 0.35*p2})`;
        shadow = '#F59E0B';
        ctx.shadowBlur = 14 * p2; r = NR - 1 + 3 * p2;
      } else {
        fill   = '#A78BFA'; shadow = '#7C3AED';
        ctx.shadowBlur = 8;
      }

      ctx.shadowColor = shadow;
      ctx.fillStyle   = fill;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      /* inner dot for current node */
      if (isCur) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    /* === PARTICLES === */
    G.particles = G.particles.filter(pt => pt.life > 0.02);
    G.particles.forEach(pt => {
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vy += 0.18; pt.vx *= 0.97;
      pt.life -= 0.022;
      ctx.save();
      ctx.globalAlpha  = Math.max(0, pt.life);
      ctx.fillStyle    = pt.color;
      ctx.shadowColor  = pt.color;
      ctx.shadowBlur   = 8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * Math.max(0, pt.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* === FAIL FLASH === */
    if (G.failAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = G.failAlpha * 0.35;
      ctx.fillStyle   = '#EF4444';
      roundRect(0, 0, CW, CH, 18);
      ctx.fill();
      ctx.restore();
      G.failAlpha -= 0.055;
    }
  }

  /* ---- PARTICLES ---- */
  function spawnParticles(cx, cy, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      G.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        r: 2 + Math.random() * 3,
        life: 0.75 + Math.random() * 0.25,
        color
      });
    }
  }

  function burstAll() {
    const clrs = ['#22C55E','#4ADE80','#A7F3D0','#FCD34D','#C4B5FD'];
    G.puzzle.nodes.forEach((n, i) => {
      const [x, y] = nodePos(n);
      spawnParticles(x, y, clrs[i % clrs.length], 9);
    });
  }

  /* ---- POINTER EVENTS ---- */
  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return [src.clientX - rect.left, src.clientY - rect.top];
  }

  function onDown(e) {
    e.preventDefault();
    if (G.phase !== 'play') return;
    const [px, py] = getXY(e);
    const ni = nearest(px, py);
    if (ni === -1) return;
    G.drawing     = true;
    G.drawStart   = Date.now();
    G.path        = [ni];
    G.startNode   = ni;
    G.currentNode = ni;
    G.hintNodes   = [];
  }

  function onMove(e) {
    e.preventDefault();
    if (!G.drawing || G.phase !== 'play') return;
    const [px, py] = getXY(e);
    const ni = nearest(px, py);
    if (ni === -1 || ni === G.currentNode) return;

    const prev = G.currentNode;
    if (!edgeExists(prev, ni)) { G.failAlpha = 0.7; return; }

    const key = ek(prev, ni);
    if (G.type === 'missing') {
      const isMissing = G.missingData.hidden.some(([a,b]) => ek(a,b) === key);
      if (!isMissing) { G.failAlpha = 0.7; return; }
    }
    if (G.tracedEdges.has(key)) { G.failAlpha = 0.7; return; }

    G.tracedEdges.add(key);
    G.path.push(ni);
    G.currentNode = ni;
    if (typeof haptic === 'function') haptic(10);
    checkCompletion();
  }

  function onUp(e) {
    e.preventDefault();
    if (!G.drawing) return;
    G.drawing = false;
    G.drawTimes.push(Date.now() - G.drawStart);
  }

  function bindPointer() {
    canvas.addEventListener('touchstart', onDown,  { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onUp,    { passive: false });
    canvas.addEventListener('mousedown',  onDown);
    canvas.addEventListener('mousemove',  e => { if (G.drawing) onMove(e); });
    canvas.addEventListener('mouseup',    onUp);
  }

  /* ---- COMPLETION ---- */
  function checkCompletion() {
    const targets = G.type === 'missing' ? G.missingData.hidden : G.puzzle.edges;
    if (targets.every(([a, b]) => G.tracedEdges.has(ek(a, b)))) handleCorrect();
  }

  /* ---- CORRECT ---- */
  function handleCorrect() {
    G.phase = 'success';
    G.totalPlanMs += (G.drawStart || Date.now()) - G.planStart;
    G.correctAnswers++;
    G.streak++;
    G.combo++;
    G.bestStreak = Math.max(G.bestStreak, G.streak);
    G.bestCombo  = Math.max(G.bestCombo, G.combo);

    const drawMs   = G.drawTimes.length ? G.drawTimes[G.drawTimes.length-1] : 5000;
    const speedPts = Math.max(0, Math.round(10 - drawMs / 600));
    const comboPts = G.combo >= 10 ? 10 : G.combo >= 5 ? 5 : G.combo >= 3 ? 3 : 0;
    const pts      = 10 + speedPts + comboPts;

    G.score += pts;
    setScore(G.score);
    burstAll();
    if (typeof haptic === 'function') haptic([20, 15, 30]);
    if (typeof playSound === 'function') playSound('correct');
    showPop('+' + pts, '#22C55E');
    updateHUD();

    setTimeout(() => { G.phase = 'play'; nextPuzzle(); }, 900);
  }

  /* ---- WRONG ---- */
  function handleWrong() {
    G.lives--;
    G.streak = 0;
    G.combo  = 0;
    G.failAlpha = 1.2;
    if (typeof haptic === 'function') haptic([45, 20, 45]);
    if (typeof playSound === 'function') playSound('wrong');
    showPop('✗', '#EF4444');
    updateHUD();

    if (G.lives <= 0) {
      setTimeout(() => { stopLoop(); gameOver(); }, 900);
    } else {
      setTimeout(() => resetDraw(), 700);
    }
  }

  /* ---- RESET DRAW ---- */
  function resetDraw() {
    G.tracedEdges = new Set();
    G.path        = [];
    G.startNode   = -1;
    G.currentNode = -1;
    G.drawing     = false;
    G.failAlpha   = 0;
    if (G.puzzle) setHintNodes();
  }

  /* ---- PUZZLE TYPE ---- */
  function pickType(round) {
    if (round < 4) return 'onestroke';
    const r = Math.random();
    return r < 0.55 ? 'onestroke' : r < 0.80 ? 'missing' : 'start';
  }

  /* ---- MISSING EDGES ---- */
  function makeMissingPuzzle(puzzle) {
    const total  = puzzle.edges.length;
    const hide   = Math.max(1, Math.min(3, Math.floor(total * 0.3)));
    const sh     = [...puzzle.edges].sort(() => Math.random() - 0.5);
    return { hidden: sh.slice(0, hide), visible: sh.slice(hide) };
  }

  /* ---- START OPTIONS ---- */
  function makeStartOptions(puzzle) {
    const odd     = getOddNodes(puzzle);
    const correct = odd.length >= 2 ? odd[0] : 0;
    const wrong   = puzzle.nodes.map((_, i) => i)
      .filter(i => i !== correct)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return { correct, options: [correct, ...wrong].sort(() => Math.random() - 0.5) };
  }

  /* ---- NEXT PUZZLE ---- */
  function nextPuzzle() {
    if (G.lives <= 0) { stopLoop(); gameOver(); return; }
    G.round++;
    G.drawing     = false;
    G.tracedEdges = new Set();
    G.path        = [];
    G.startNode   = -1;
    G.currentNode = -1;
    G.particles   = [];
    G.failAlpha   = 0;
    G.planStart   = Date.now();

    const diffCap = G.round <= 5 ? 1 : G.round <= 15 ? 2 : 3;
    const pool    = PUZZLES.filter(p => p.diff <= diffCap);
    const base    = pool[G.poolIdx % pool.length];
    G.poolIdx++;

    const seed = Math.floor(Math.random() * 16);
    G.puzzle   = applyTransform(base, seed);
    G.type     = pickType(G.round);

    if (G.type === 'missing') {
      G.missingData = makeMissingPuzzle(G.puzzle);
    } else if (G.type === 'start') {
      G.startData = makeStartOptions(G.puzzle);
      renderMCQ();
      updateTypeBadge();
      updateHUD();
      return;
    }

    setHintNodes();
    updateTypeBadge();
    updateHUD();

    /* show / hide MCQ panel */
    const mcqEl = document.getElementById('mtMCQ');
    if (mcqEl) mcqEl.style.display = 'none';
  }

  /* ---- MCQ RENDER ---- */
  function renderMCQ() {
    const mcqEl = document.getElementById('mtMCQ');
    if (!mcqEl) return;
    const { correct, options } = G.startData;

    mcqEl.style.display = 'block';
    mcqEl.innerHTML = `
      <p class="mt2-mcq-title">🎯 Which node can start a one-stroke path?</p>
      <div class="mt2-mcq-grid">
        ${options.map((ni, idx) => `
          <div class="mt2-mcq-opt" data-ni="${ni}">
            <span class="mt2-mcq-letter">${String.fromCharCode(65+idx)}</span>
            ${buildMiniSVG(G.puzzle, ni)}
          </div>`).join('')}
      </div>`;

    mcqEl.querySelectorAll('.mt2-mcq-opt').forEach(opt => {
      opt.onclick = () => {
        const chosen = +opt.dataset.ni;
        if (chosen === correct) {
          opt.classList.add('mt2-mcq-ok');
          G.correctAnswers++;
          G.streak++;
          G.combo++;
          G.bestCombo  = Math.max(G.bestCombo, G.combo);
          G.bestStreak = Math.max(G.bestStreak, G.streak);
          const pts = 10 + (G.combo >= 5 ? 5 : 0);
          G.score += pts;
          setScore(G.score);
          showPop('+' + pts, '#22C55E');
          if (typeof haptic === 'function') haptic([20,15,30]);
          updateHUD();
          setTimeout(() => { mcqEl.style.display='none'; nextPuzzle(); }, 500);
        } else {
          opt.classList.add('mt2-mcq-no');
          mcqEl.querySelector(`[data-ni="${correct}"]`).classList.add('mt2-mcq-ok');
          G.lives--;
          G.streak = 0;
          G.combo  = 0;
          if (typeof haptic === 'function') haptic([45,20,45]);
          showPop('✗', '#EF4444');
          updateHUD();
          if (G.lives <= 0) {
            setTimeout(() => { stopLoop(); gameOver(); }, 900);
          } else {
            setTimeout(() => { mcqEl.style.display='none'; nextPuzzle(); }, 1200);
          }
        }
      };
    });
  }

  function buildMiniSVG(puzzle, hl) {
    const S=130, pad=20, r=9;
    const pos = n => [pad+n[0]/100*(S-pad*2), pad+n[1]/100*(S-pad*2)];
    let s = `<svg viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" style="display:block;">`;
    s += `<rect width="${S}" height="${S}" rx="10" fill="#0D0119"/>`;
    puzzle.edges.forEach(([a,b]) => {
      const [x1,y1]=pos(puzzle.nodes[a]), [x2,y2]=pos(puzzle.nodes[b]);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8B5CF6" stroke-width="2.5" stroke-linecap="round"/>`;
    });
    puzzle.nodes.forEach((n,i) => {
      const [x,y]=pos(n), isHL=i===hl;
      s += `<circle cx="${x}" cy="${y}" r="${isHL?r+3:r}" fill="${isHL?'#F59E0B':'#A78BFA'}"/>`;
    });
    return s + '</svg>';
  }

  /* ---- HUD ---- */
  function updateHUD() {
    const el = document.getElementById('mtHUD');
    if (!el) return;
    const hearts = '❤️'.repeat(Math.max(0,G.lives)) + '🩶'.repeat(Math.max(0,3-G.lives));
    const comboBadge = G.combo >= 10
      ? `<span class="mt2-cbadge genius">⚡ GENIUS ×${G.combo}</span>`
      : G.combo >= 5
        ? `<span class="mt2-cbadge flow">🔥 FLOW ×${G.combo}</span>`
        : G.combo >= 3
          ? `<span class="mt2-cbadge">🎯 ×${G.combo}</span>`
          : '';
    el.innerHTML = `
      <div class="mt2-hud-l">
        <span class="mt2-hearts">${hearts}</span>
        <span class="mt2-rnd">R${G.round}</span>
      </div>
      <div class="mt2-hud-r">
        ${comboBadge}
        <span class="mt2-pts">${G.score}</span>
      </div>`;
  }

  function updateTypeBadge() {
    const el = document.getElementById('mtTypeBadge');
    if (!el) return;
    const info = {
      onestroke: { icon:'✏️', name:'One Stroke',     desc:'Trace every line without lifting' },
      missing:   { icon:'🔲', name:'Complete Shape',  desc:'Draw only the faded missing edges' },
      start:     { icon:'🎯', name:'Find The Start',  desc:'Which node starts a valid trace?' },
    }[G.type];
    el.innerHTML = `<span class="mt2-badge-icon">${info.icon}</span>
      <div><strong>${info.name}</strong><br><small>${info.desc}</small></div>`;
  }

  /* ---- SCORE POPUP ---- */
  function showPop(text, color) {
    const ga = document.getElementById('mtGameArea');
    if (!ga) return;
    const el = document.createElement('div');
    el.className = 'mt2-pop';
    el.textContent = text;
    el.style.cssText = `color:${color};border-color:${color};background:${color}1A;`;
    ga.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  /* ---- GAME OVER ---- */
  function gameOver() {
    const accuracy = G.round > 0 ? Math.round(G.correctAnswers / G.round * 100) : 0;
    const avgPlan  = G.correctAnswers > 0
      ? (Math.round(G.totalPlanMs / G.correctAnswers / 100) / 10) : 0;
    const avgDraw  = G.drawTimes.length > 0
      ? Math.round(G.drawTimes.reduce((a,b)=>a+b,0) / G.drawTimes.length / 100) / 10 : 0;

    /* Brain Rating */
    const planScore  = avgPlan < 2 ? 4 : avgPlan < 5 ? 3 : avgPlan < 9 ? 2 : 1;
    const accScore   = accuracy >= 90 ? 4 : accuracy >= 70 ? 3 : accuracy >= 50 ? 2 : 1;
    const comboScore = G.bestCombo >= 10 ? 4 : G.bestCombo >= 5 ? 3 : G.bestCombo >= 3 ? 2 : 1;
    const tot        = planScore + accScore + comboScore;
    const ratings    = ['Beginner','Focused','Analytical','Strategic','Expert','Master Planner'];
    const brainRating = ratings[Math.min(5, Math.floor((tot - 3) / 9 * 6))];

    end({
      value: G.score,
      points: G.score >= 80 ? 50 : G.score >= 40 ? 35 : G.score >= 15 ? 20 : 8,
      starThresh: [15, 40, 80],
      summary: `
        <div class="row"><span>Rounds</span><span class="val">${G.round}</span></div>
        <div class="row"><span>Accuracy</span><span class="val">${accuracy}%</span></div>
        <div class="row"><span>Best Combo</span><span class="val">${G.bestCombo}×</span></div>
        <div class="row"><span>Best Streak</span><span class="val">${G.bestStreak}</span></div>
        <div class="row"><span>Avg Plan Time</span><span class="val">${avgPlan}s</span></div>
        <div class="row"><span>Avg Draw Time</span><span class="val">${avgDraw}s</span></div>
        <div class="row"><span>🧠 Brain Rating</span><span class="val">${brainRating}</span></div>
      `
    });
  }

  /* ---- BUILD GAME LAYOUT ---- */
  function buildLayout() {
    body.innerHTML = `
      <div class="mt2-wrap" id="mtGameArea">
        <div class="mt2-hud" id="mtHUD"></div>
        <div class="mt2-type-badge" id="mtTypeBadge"></div>
        <div class="mt2-board" id="mtBoard"></div>
        <div class="mt2-mcq" id="mtMCQ" style="display:none;"></div>
        <div class="mt2-foot">
          <button class="mt2-reset-btn" id="mtReset">↺ Reset</button>
        </div>
      </div>`;

    makeCanvas();
    document.getElementById('mtBoard').appendChild(canvas);
    bindPointer();
    document.getElementById('mtReset').onclick = () => resetDraw();

    startLoop();
    nextPuzzle();
  }

  /* ---- START SCREEN ---- */
  const best  = (()=>{ try{ return JSON.parse(localStorage.getItem('nz_best_scores')||'{}'); }catch(e){ return {}; }})();
  const plays = (()=>{ try{ return JSON.parse(localStorage.getItem('nz_game_plays')||'{}'); }catch(e){ return {}; }})();

  body.innerHTML = `
    <div class="ss-start">
      <div class="ss-stats">
        <div class="ss-stat"><div class="v">${best['mindtrace']||0}</div><div class="l">Best Score</div></div>
        <div class="ss-stat"><div class="v">${plays['mindtrace']||0}</div><div class="l">Games</div></div>
      </div>
      <div class="mt2-intro">
        <div class="mt2-intro-icon">✏️</div>
        <h2 class="mt2-intro-title">Mind Trace</h2>
        <p class="mt2-intro-sub">Trace every line in <strong>ONE stroke</strong> without lifting.<br>Plan your route — then draw.</p>
        <div class="mt2-rules">
          <div class="mt2-rule"><span>✏️</span><span>Don't lift your finger</span></div>
          <div class="mt2-rule"><span>🔄</span><span>No retracing the same edge</span></div>
          <div class="mt2-rule"><span>❤️</span><span>3 lives — plan before you draw</span></div>
          <div class="mt2-rule"><span>⚡</span><span>Speed bonus for fast solves</span></div>
        </div>
      </div>
      <button class="btn-primary" id="mt2Start">Start Tracing →</button>
    </div>`;

  body.querySelector('#mt2Start').onclick = () => {
    startClock();
    buildLayout();
  };
}
