# NeuroZen Retention System — PART 2 of 3
## Game Mastery System (Level 1-30 per game)
### File: `js/app.js` only | Prerequisite: Part 1 done

---

## WHAT THIS ADDS

Every game now has its own **Mastery Level (1–30)**. Separate from Brain Score.
- Mastery grows from playing that specific game
- Badge shows on game cards (in Quick Play and Games tab)
- Unlocks personality-level milestones per game
- Gives player a reason to return to each specific game

---

## STORAGE KEY (add to FRESH)

**Find the new keys added in Part 1:**
```js
  nz_week_skill_start:{},nz_week_start_date:'',
```
**Replace with:**
```js
  nz_week_skill_start:{},nz_week_start_date:'',
  nz_mastery:{},
```

---

## ADD MASTERY FUNCTIONS — add right BEFORE `renderHome`

```js
/* ══════════ GAME MASTERY SYSTEM ══════════════════════════
   Each game has a Mastery Level 1-30.
   Mastery XP needed per level increases (50, 55, 61, 68, 75...).
   Mastery is separate from Brain Score — tracks game-specific depth. */

const MASTERY_TITLES={
  1:'Beginner',3:'Explorer',5:'Practitioner',8:'Skilled',
  12:'Expert',16:'Master',20:'Elite',25:'Virtuoso',30:'Legend'
};

function masteryXpForLevel(lv){
  /* XP needed TO REACH this level from previous.
     Level 1: 0 (start), Level 2: 50, Level 3: 55, ...+5 each */
  if(lv<=1)return 0;
  return 45+(lv-1)*5;
}

function getMastery(gameId){
  const m=S('nz_mastery');
  return m[gameId]||{level:1,xp:0,totalXp:0};
}

function getMasteryTitle(level){
  let title='Beginner';
  Object.entries(MASTERY_TITLES).forEach(([lv,t])=>{if(level>=+lv)title=t;});
  return title;
}

function getMasteryBadge(level){
  if(level>=30)return'🏅';
  if(level>=20)return'💎';
  if(level>=12)return'🥇';
  if(level>=5) return'🥈';
  if(level>=2) return'🥉';
  return'';
}

function awardMastery(gameId,gameScore,starThresh){
  const st=starThresh||[5,10,15];
  /* Mastery XP per game = performance-based */
  const mxp=gameScore>=(st[2]||20)?12:gameScore>=(st[1]||10)?8:gameScore>=(st[0]||5)?5:3;

  const m=S('nz_mastery');
  if(!m[gameId])m[gameId]={level:1,xp:0,totalXp:0};
  const g=m[gameId];
  g.xp+=mxp;
  g.totalXp=(g.totalXp||0)+mxp;

  /* Level up check */
  let leveled=false;
  while(g.level<30&&g.xp>=masteryXpForLevel(g.level+1)){
    g.xp-=masteryXpForLevel(g.level+1);
    g.level++;
    leveled=true;
  }
  m[gameId]=g;
  setS('nz_mastery',m);

  if(leveled){
    const gName=(GAMES.find(x=>x.id===gameId)||{}).name||gameId;
    const badge=getMasteryBadge(g.level);
    setTimeout(()=>{
      confetti(50);
      toast(`${badge} ${gName} Mastery Lv ${g.level}! ${getMasteryTitle(g.level)}`);
    },1200);
  }
  return{mxp,newLevel:g.level,leveled};
}
```

---

## CALL `awardMastery` in `endGame()` 

**Find in `endGame()` (the part that calls `awardScore`):**
```js
const pts=awardScore(Math.max(2,opts.points||2),g.skill,id,opts.value,opts.starThresh);
```
**Replace with:**
```js
const pts=awardScore(Math.max(2,opts.points||2),g.skill,id,opts.value,opts.starThresh);
const mResult=awardMastery(id,opts.value,opts.starThresh);
```

---

## SHOW MASTERY on end screen

**Find in end screen HTML (right after the skill breakdown div added in Part 1):**
```js
${isRec?'<div class="rec">✨ New Personal Record!</div>':''}
```
**Replace with:**
```js
${isRec?'<div class="rec">✨ New Personal Record!</div>':''}
<div class="mastery-chip">
  ${getMasteryBadge(mResult.newLevel)} ${g.name} Mastery
  <strong>Lv ${mResult.newLevel}</strong>
  · ${getMasteryTitle(mResult.newLevel)}
  ${mResult.leveled?'<span class="mastery-levelup">LEVEL UP! 🎉</span>':''}
</div>
```

---

## SHOW MASTERY BADGE on Quick Play cards (home screen)

**Find in `renderHome`, the Quick Play card builder:**
```js
const c=$(`<div class="qp-card" style="background:${g.bg}">
  <div class="qico" style="background:${g.iconBg}">${g.icon}</div>
  <div><div class="qn">${g.name}</div><div class="qlv">${best?'Best: '+best:'New!'}</div></div>
</div>`);
```
**Replace with:**
```js
const m=getMastery(g.id);
const mb=getMasteryBadge(m.level);
const c=$(`<div class="qp-card" style="background:${g.bg}">
  <div class="qico" style="background:${g.iconBg}">${g.icon}</div>
  <div>
    <div class="qn">${g.name}</div>
    <div class="qlv">${best?'Best: '+best:'New!'}</div>
    ${m.level>1?`<div class="qp-mastery">${mb} Lv ${m.level}</div>`:''}
  </div>
</div>`);
```

---

## SHOW MASTERY on Games tab cards

**Find in `renderGames()` where each game card is built** (search for where `.gm-icon` or similar game card class is created). Add mastery badge there:

```js
/* Find the game card builder in renderGames(). Look for the loop that creates game cards.
   Inside it, find where game name/description is shown and add: */
const gm=getMastery(g.id);
/* Add this line to the card HTML: */
`${gm.level>1?`<div class="gm-mastery">${getMasteryBadge(gm.level)} Mastery Lv ${gm.level} · ${getMasteryTitle(gm.level)}</div>`:''}`
```

---

## ADD CSS

```css
/* ── MASTERY ─────────────────────────────────── */
.mastery-chip{background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(79,142,247,.08));
  border:1.5px solid rgba(124,58,237,.2);border-radius:12px;padding:8px 12px;
  font-size:12px;font-weight:600;margin:6px 0;text-align:center;}
.mastery-levelup{background:#F59E0B;color:#000;border-radius:6px;padding:1px 6px;font-size:10px;font-weight:800;margin-left:4px;}
.qp-mastery{font-size:10px;font-weight:700;color:#7C3AED;margin-top:2px;}
.gm-mastery{font-size:11px;color:#7C3AED;font-weight:600;margin-top:3px;}
```

---

## VERIFICATION FOR PART 2

1. Play any game → end screen shows "Mastery Lv X · Title" chip below rank.
2. Reach Lv 2 in any game → toast "🥉 Schulte Table Mastery Lv 2! Explorer".
3. Quick Play cards on home screen show "🥉 Lv 3" badge for played games.
4. Games tab shows mastery level below each game's description.
5. Open DevTools → `JSON.parse(localStorage.getItem('nz_mastery'))` → should show `{mindtrace:{level:X,xp:Y,totalXp:Z}}`.
