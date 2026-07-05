# Mind Trace — Best Score Fix
## File: `js/games/mindtrace.js`

---

## ROOT CAUSE

`mergeStats()` saves `highRound`, `longestCombo`, `puzzlesSolved` etc. to `nz_mt_stats` — these all show correctly on the start screen.

But `bestScore` is never saved in `mergeStats()`. The start screen reads `best['mindtrace']` from `nz_best_scores` (saved by app.js's `endGame()`), but that key update isn't being read reliably — while everything from `nz_mt_stats` works fine.

**Fix**: Save `bestScore` inside `mergeStats()` and read it from `stats.bestScore` on the start screen — same reliable system as all other stats.

---

## CHANGE 1 — Add `bestScore` to `mergeStats()`

**Find:**
```js
  function mergeStats(g) {
    const s = loadStats();
    s.highRound       = Math.max(s.highRound       || 0, g.round);
    s.perfectPuzzles  = (s.perfectPuzzles  || 0) + g.perfectPuzzles;
    s.puzzlesSolved   = (s.puzzlesSolved   || 0) + g.correctAnswers;
    s.gamesPlayed     = (s.gamesPlayed     || 0) + 1;
    s.longestCombo    = Math.max(s.longestCombo    || 0, g.bestCombo);
```

**Replace with (add one line):**
```js
  function mergeStats(g) {
    const s = loadStats();
    s.highRound       = Math.max(s.highRound       || 0, g.round);
    s.bestScore       = Math.max(s.bestScore        || 0, g.score);
    s.perfectPuzzles  = (s.perfectPuzzles  || 0) + g.perfectPuzzles;
    s.puzzlesSolved   = (s.puzzlesSolved   || 0) + g.correctAnswers;
    s.gamesPlayed     = (s.gamesPlayed     || 0) + 1;
    s.longestCombo    = Math.max(s.longestCombo    || 0, g.bestCombo);
```

---

## CHANGE 2 — Read `stats.bestScore` on start screen instead of `best['mindtrace']`

**Find:**
```js
        <div class="mt3-sg"><div class="v">${best['mindtrace']||0}</div><div class="l">Best Score</div></div>
```

**Replace with:**
```js
        <div class="mt3-sg"><div class="v">${stats.bestScore||0}</div><div class="l">Best Score</div></div>
```

---

## VERIFICATION

1. Play a game and score e.g. 130.
2. Game over screen shows "+XX Brain Score".
3. Tap "Play Again" → start screen now shows **Best Score: 130** ✓
4. Play again, score less (e.g. 80) → Best Score stays **130** ✓
5. Play again, score more (e.g. 150) → Best Score updates to **150** ✓
