# NeuroZen — PART 1: Remove Spatial Spin Completely

**Goal**: Remove Spatial Spin game and the test folder entirely. Clean removal — no crashes, no broken references.

---

## FILES TO MODIFY

1. `js/app.js` — 5 changes
2. `index.html` — 1 change
3. `sw.js` — 1 change
4. DELETE `js/games/spatialspin.js`
5. DELETE entire `test/` folder

---

## CHANGE 1 — `js/app.js`: Remove from DAILY_DEFS

**Find:**
```js
  {game:'spatialspin',label:'Score 8+ in Spatial Spin',check:v=>v>=8},
```
**Delete this entire line.**

---

## CHANGE 2 — `js/app.js`: Remove from XP tiers table

**Find:**
```js
    spatialspin:[10,22,38,55],
```
**Delete this entire line.**

---

## CHANGE 3 — `js/app.js`: Remove from GAMES array

**Find:**
```js
  {id:'spatialspin',name:'Spatial Spin',cat:'Logic',skill:'logic',bg:'#EEF2FF',iconBg:'linear-gradient(135deg,#6366F1,#8B5CF6)',icon:'🔄',desc:'Rotate shapes mentally — can you see in 3D?'},
```
**Delete this entire line.**

---

## CHANGE 4 — `js/app.js`: Remove from openGame switch

**Find:**
```js
  else if(id==='spatialspin')playSpatialSpin(body,setScore,endGame,wrap,startClock);
```
**Delete this entire line.**

---

## CHANGE 5 — `js/app.js`: Remove the comment marker at bottom of file

**Find:**
```js
/* game:spatialspin */
```
**Delete this entire line.**

---

## CHANGE 6 — `index.html`: Remove script tag

**Find:**
```html
<script src="js/games/spatialspin.js"></script>
```
**Delete this entire line.**

---

## CHANGE 7 — `sw.js`: Remove from cache list

**Find:**
```js
  '/js/games/spatialspin.js',
```
**Delete this entire line.**

---

## CHANGE 8 — Delete files

- Delete the file: `js/games/spatialspin.js`
- Delete the entire folder: `test/` (and everything inside it including `test/ss_verify.js`)

---

## VERIFICATION CHECKLIST

1. Open app → Games tab → Spatial Spin should NOT appear anywhere.
2. Browser console → zero errors about `playSpatialSpin is not defined` or `spatialspin.js`.
3. Daily Challenge on a day that would have shown Spatial Spin → should skip to next game in rotation without crashing.
4. `test/` folder no longer exists in the repo.
5. Service worker no longer tries to cache `spatialspin.js`.
6. App still has 9 games working perfectly.
