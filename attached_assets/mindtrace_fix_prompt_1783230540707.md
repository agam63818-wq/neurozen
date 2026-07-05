# Mind Trace — Complete Fix Prompt
## File: `js/games/mindtrace.js`

---

## ROOT CAUSES (3 bugs, sab fix honge)

### Bug 1 — Finger uthao = kuch nahi hota
Current `onUp()`:
```js
function onUp(e) {
  e.preventDefault();
  if (!G.drawing) return;
  G.drawing = false;
  G.drawTimes.push(Date.now() - G.drawStart);
  /* ← NO handleWrong() here! */
}
```
Player finger utha sakta hai mid-draw, koi consequence nahi. Game kabhi khatam nahi.

### Bug 2 — Koi puzzle timer nahi
Player sochte rahe 5 minute — no time pressure = no brain challenge.

### Bug 3 — Reset unlimited free hai
Timer bhi nahi hai reset pe — ye basically infinite retries deta hai.

---

## FIX 1 — `onUp()`: Finger uthao = life jaati hai

**Find:**
```js
function onUp(e) {
  e.preventDefault();
  if (!G.drawing) return;
  G.drawing = false;
  G.drawTimes.push(Date.now() - G.drawStart);
}
```

**Replace with:**
```js
function onUp(e) {
  e.preventDefault();
  if (!G.drawing || G.phase !== 'play') return;
  G.drawing = false;
  G.drawTimes.push(Date.now() - G.drawStart);

  /* If player lifted finger mid-draw (drew at least 1 edge but didn't complete) → WRONG */
  if (G.tracedEdges.size > 0) {
    /* Check if puzzle is actually complete (shouldn't happen but safety check) */
    const targets = G.type === 'missing' ? G.missingData.hidden : G.puzzle.edges;
    const done = targets.every(([a, b]) => G.tracedEdges.has(ek(a, b)));
    if (!done) {
      /* Lifted mid-draw → lose a life */
      handleWrong('Lifted too early! Complete in one stroke.');
    }
  }
  /* If 0 edges traced: player just tapped to plan/explore — no penalty */
}
```

---

## FIX 2 — Add `handleWrong()` reason parameter + show message on canvas

**Find:**
```js
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
```

**Replace with:**
```js
function handleWrong(reason) {
  if (G.phase !== 'play') return; /* prevent double-trigger */
  G.phase = 'fail';
  G.lives--;
  G.streak = 0;
  G.combo  = 0;
  G.failAlpha = 1.2;
  if (G.puzzleTimer) { clearInterval(G.puzzleTimer); G.puzzleTimer = null; }
  if (typeof haptic === 'function') haptic([45, 20, 45]);
  if (typeof playSound === 'function') playSound('wrong');
  showPop('✗ ' + (reason || 'Wrong!'), '#EF4444');
  updateHUD();

  if (G.lives <= 0) {
    setTimeout(() => { stopLoop(); gameOver(); }, 1000);
  } else {
    setTimeout(() => { G.phase = 'play'; resetDraw(); startPuzzleTimer(); }, 900);
  }
}
```

---

## FIX 3 — Add per-puzzle countdown timer

### Step A — Add timer fields to `G` state object

**Find:**
```js
  const G = {
    round: 0, score: 0, lives: 3,
    combo: 0, bestCombo: 0, streak: 0, bestStreak: 0,
    correctAnswers: 0, totalPlanMs: 0,
    drawTimes: [], poolIdx: 0,
```

**Replace with:**
```js
  const G = {
    round: 0, score: 0, lives: 3,
    combo: 0, bestCombo: 0, streak: 0, bestStreak: 0,
    correctAnswers: 0, totalPlanMs: 0,
    drawTimes: [], poolIdx: 0,
    puzzleTimer: null, timeLeft: 15, totalTime: 15, /* NEW */
```

### Step B — Add `startPuzzleTimer()` and `stopPuzzleTimer()` functions

**Add these two functions right BEFORE the `handleCorrect()` function:**

```js
  /* ---- PUZZLE TIMER ---- */
  function getPuzzleTime(diff) {
    /* Easy: 15s, Medium: 20s, Hard: 25s */
    return diff === 1 ? 15 : diff === 2 ? 20 : 25;
  }

  function startPuzzleTimer() {
    if (G.puzzleTimer) clearInterval(G.puzzleTimer);
    const diff = G.puzzle ? G.puzzle.diff : 1;
    G.totalTime = getPuzzleTime(diff);
    G.timeLeft  = G.totalTime;

    G.puzzleTimer = setInterval(() => {
      if (G.phase !== 'play') return;
      G.timeLeft -= 0.1;
      if (G.timeLeft <= 0) {
        G.timeLeft = 0;
        clearInterval(G.puzzleTimer);
        G.puzzleTimer = null;
        handleWrong('Time up! ⏱');
      }
    }, 100);
  }

  function stopPuzzleTimer() {
    if (G.puzzleTimer) { clearInterval(G.puzzleTimer); G.puzzleTimer = null; }
  }
```

### Step C — Draw timer bar on canvas

**Find this block inside `drawFrame()` (near the top of the function, after background):**
```js
    if (!G.puzzle) return;
```

**Add timer bar drawing AFTER that line:**
```js
    if (!G.puzzle) return;

    /* === TIMER BAR (top of canvas) === */
    if (G.phase === 'play' && G.totalTime > 0) {
      const pct = Math.max(0, G.timeLeft / G.totalTime);
      const barW = CW - 24;
      const barH = 5;
      const barX = 12, barY = 10;
      /* background track */
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 3);
      ctx.fill();
      /* fill — color shifts red when < 30% */
      const barColor = pct > 0.6 ? '#7C3AED'
                     : pct > 0.3 ? '#F59E0B'
                     : '#EF4444';
      ctx.shadowColor = barColor;
      ctx.shadowBlur  = pct < 0.3 ? 8 : 4;
      ctx.fillStyle   = barColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * pct, barH, 3);
      ctx.fill();
      /* time text when < 5 seconds */
      if (G.timeLeft < 5) {
        ctx.shadowBlur = 0;
        ctx.fillStyle  = '#EF4444';
        ctx.font       = 'bold 13px system-ui';
        ctx.textAlign  = 'center';
        ctx.fillText(Math.ceil(G.timeLeft) + 's', CW / 2, barY + barH + 14);
      }
      ctx.restore();
    }
```

### Step D — Start timer when `nextPuzzle()` shows a new puzzle

**Find inside `nextPuzzle()` (the part after `G.type` is set):**
```js
    setHintNodes();
    updateTypeBadge();
    updateHUD();

    /* show / hide MCQ panel */
    const mcqEl = document.getElementById('mtMCQ');
    if (mcqEl) mcqEl.style.display = 'none';
  }
```

**Replace with:**
```js
    setHintNodes();
    updateTypeBadge();
    updateHUD();

    /* show / hide MCQ panel */
    const mcqEl = document.getElementById('mtMCQ');
    if (mcqEl) mcqEl.style.display = 'none';

    /* Start countdown timer for this puzzle */
    startPuzzleTimer();
  }
```

**Also find the MCQ branch inside `nextPuzzle()` (the `start` type):**
```js
    } else if (G.type === 'start') {
      G.startData = makeStartOptions(G.puzzle);
      renderMCQ();
      updateTypeBadge();
      updateHUD();
      return;
    }
```

**Replace with:**
```js
    } else if (G.type === 'start') {
      G.startData = makeStartOptions(G.puzzle);
      renderMCQ();
      updateTypeBadge();
      updateHUD();
      startPuzzleTimer(); /* MCQ also has a timer */
      return;
    }
```

### Step E — Stop timer when puzzle is solved correctly

**Find inside `handleCorrect()`:**
```js
  function handleCorrect() {
    G.phase = 'success';
    G.totalPlanMs += (G.drawStart || Date.now()) - G.planStart;
```

**Add timer stop right after `G.phase = 'success'`:**
```js
  function handleCorrect() {
    G.phase = 'success';
    stopPuzzleTimer(); /* stop countdown */
    G.totalPlanMs += (G.drawStart || Date.now()) - G.planStart;
```

---

## FIX 4 — Reset button: keeps timer running, shows warning

**Find:**
```js
    document.getElementById('mtReset').onclick = () => resetDraw();
```

**Replace with:**
```js
    document.getElementById('mtReset').onclick = () => {
      /* Reset clears current drawing but TIMER KEEPS RUNNING — pressure stays on */
      if (G.phase !== 'play') return;
      resetDraw();
      showPop('↺ Restarted — timer running!', '#F59E0B');
    };
```

---

## FIX 5 — Make missing edges more visible (dashed lines too faint in screenshots)

**Find inside `drawFrame()` the missing edge drawing:**
```js
      } else if (isMissing) {
        ctx.strokeStyle = '#4B2A80';
        ctx.lineWidth   = 3;
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([6, 5]);
```

**Replace with:**
```js
      } else if (isMissing) {
        /* More visible dashed style — light purple, clearly different from solid */
        ctx.strokeStyle = '#A78BFA';
        ctx.lineWidth   = 3;
        ctx.globalAlpha = 0.65;
        ctx.setLineDash([8, 6]);
        ctx.shadowColor = '#7C3AED';
        ctx.shadowBlur  = 6;
```

---

## FIX 6 — Add brief "planning phase" overlay before drawing starts

This shows the puzzle for 2 seconds before the timer starts, so player gets a moment to plan mentally.

**Find `startPuzzleTimer()` function (added in Fix 3):**
```js
  function startPuzzleTimer() {
    if (G.puzzleTimer) clearInterval(G.puzzleTimer);
    const diff = G.puzzle ? G.puzzle.diff : 1;
    G.totalTime = getPuzzleTime(diff);
    G.timeLeft  = G.totalTime;

    G.puzzleTimer = setInterval(() => {
```

**Replace with:**
```js
  function startPuzzleTimer() {
    if (G.puzzleTimer) clearInterval(G.puzzleTimer);
    const diff = G.puzzle ? G.puzzle.diff : 1;
    G.totalTime = getPuzzleTime(diff);
    G.timeLeft  = G.totalTime;
    G.phase     = 'plan'; /* 2 second planning phase — can't draw yet */

    /* Show "PLAN..." overlay for 2 seconds, then start drawing phase */
    showPop('👁 Plan your route...', '#F59E0B');
    setTimeout(() => {
      if (G.phase !== 'plan') return; /* game might have ended */
      G.phase = 'play';
      G.planStart = Date.now();
      G.puzzleTimer = setInterval(() => {
        if (G.phase !== 'play') return;
        G.timeLeft -= 0.1;
        if (G.timeLeft <= 0) {
          G.timeLeft = 0;
          clearInterval(G.puzzleTimer);
          G.puzzleTimer = null;
          handleWrong('Time up! ⏱');
        }
      }, 100);
    }, 2000); /* 2 second planning phase */
  }
```

**Also update `onDown()` to prevent drawing during planning phase:**
```js
  function onDown(e) {
    e.preventDefault();
    if (G.phase !== 'play') return; /* blocks drawing during 'plan' phase too */
```
(This line already says `G.phase !== 'play'` so it automatically works — no change needed here.)

---

## FIX 7 — Cleanup: stop timer when game ends (prevent memory leak)

**Find the `stopLoop()` function:**
```js
  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }
```

**Replace with:**
```js
  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    stopPuzzleTimer(); /* also stop puzzle timer to prevent orphaned intervals */
  }
```

---

## VERIFICATION CHECKLIST

After making all changes:

1. **Start a game → Round 1 shows "Plan your route..."** pop for 2 seconds. Timer bar NOT moving yet. After 2s, timer starts.
2. **Trace 1 edge then lift finger → immediately lose a life**, red flash, pop says "Lifted too early!"
3. **Don't touch canvas at all → timer counts down**, at 0 pop says "Time up! ⏱", lose a life.
4. **Complete puzzle in one stroke → timer stops**, green burst, next puzzle loads.
5. **Reset button → timer keeps running**, pop shows "↺ Restarted — timer running!"
6. **Missing edges (Complete Shape mode) → dashed lines are clearly visible** in light purple.
7. **Lose all 3 lives → game over screen** appears with Brain Rating.
8. **After 10+ rounds without losing lives** — game should feel like a real challenge, not infinite.
