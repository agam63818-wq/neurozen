# NeuroZen Retention System — PART 1 of 3
## Brain Score V2: Diminishing Returns + Anti-Farming + 6 Skills + Perfect Bonus
### File: `js/app.js` only

---

## WHAT THIS PART DOES

Replaces the flat Brain Score system with a smart, balanced one:
- **6 Skills** (add Planning + Attention)
- **Diminishing returns** (early game fast, late game earned)
- **Anti-farming** (same game 3+ times → brain score drops each repeat)
- **Diversity bonus** (play 3 different categories → +5 Brain Score)
- **Perfect Performance bonus** (3 stars + personal best → +3 Brain Score)
- **Better rank names** (Beginner → NeuroZen Legend)

---

## STORAGE KEYS USED (add to FRESH)

**Find:**
```js
  nz_xp:0,nz_daily_challenge_date:null,nz_daily_challenge_done:false,nz_daily_challenge_xp:0,
```
**Replace with:**
```js
  nz_xp:0,nz_daily_challenge_date:null,nz_daily_challenge_done:false,nz_daily_challenge_xp:0,
  nz_today_game_counts:{date:'',counts:{}},
  nz_today_categories:{date:'',cats:[]},
  nz_last_skill_gain:{},
  nz_week_skill_start:{},nz_week_start_date:'',
```

**Find:**
```js
  nz_achievements:[],nz_skill_scores:{memory:0,focus:0,logic:0,speed:0},
  nz_skill_scores_prev:{memory:0,focus:0,logic:0,speed:0},
```
**Replace with:**
```js
  nz_achievements:[],
  nz_skill_scores:{memory:0,focus:0,logic:0,speed:0,planning:0,attention:0},
  nz_skill_scores_prev:{memory:0,focus:0,logic:0,speed:0,planning:0,attention:0},
```

---

## ADD THESE CONSTANTS — right BEFORE `awardScore` function

```js
/* ── GAME → SKILL MAPPING ──────────────────────────────── */
const GAME_SKILL_MAP={
  schulte:    {p:'focus',     s:'speed'},
  memory:     {p:'memory',    s:'attention'},
  pattern:    {p:'logic',     s:'focus'},
  wordflash:  {p:'memory',    s:'speed'},
  wordchain:  {p:'memory',    s:'logic'},
  math:       {p:'speed',     s:'logic'},
  stroopx:    {p:'attention', s:'focus'},
  iqtest:     {p:'logic',     s:'memory'},
  reactionlab:{p:'speed',     s:'attention'},
  mindtrace:  {p:'planning',  s:'logic'},
};

/* ── DIMINISHING RETURNS ───────────────────────────────── */
function diminishFactor(bs){
  if(bs<2000)return 1.00;
  if(bs<5000)return 0.80;
  if(bs<8000)return 0.55;
  return 0.35;
}

/* ── ANTI-FARMING multiplier ──────────────────────────── */
function antiFarmFactor(gameId){
  const today=todayKey();
  const tc=S('nz_today_game_counts');
  if(tc.date!==today){tc.date=today;tc.counts={};}
  const n=(tc.counts[gameId]||0)+1;
  tc.counts[gameId]=n;
  setS('nz_today_game_counts',tc);
  /* 1st play=100%, 2nd=85%, 3rd=70%, 4th=55%, 5th+=40% */
  const factors=[1.0,0.85,0.70,0.55,0.40];
  const f=factors[Math.min(n-1,4)];
  if(n===3)setTimeout(()=>toast('🔄 Try a different game for more Brain Score!'),500);
  if(n>=4)setTimeout(()=>toast('🧠 Switch games — your brain needs variety!'),500);
  return f;
}

/* ── DIVERSITY BONUS (+5 when 3 categories played today) ─ */
function diversityBonus(gameId){
  const today=todayKey();
  const dc=S('nz_today_categories');
  if(dc.date!==today){dc.date=today;dc.cats=[];}
  const cat=(GAMES.find(g=>g.id===gameId)||{}).cat||gameId;
  if(!dc.cats.includes(cat))dc.cats.push(cat);
  setS('nz_today_categories',dc);
  /* award bonus exactly when 3rd unique category unlocked */
  return dc.cats.length===3?5:0;
}

/* ── WEEKLY SKILL SNAPSHOT (save start-of-week for diff) ─ */
function maybeInitWeekSnapshot(){
  const today=todayKey();
  const weekStart=S('nz_week_start_date');
  const d=new Date();
  const monday=new Date(d);
  monday.setDate(d.getDate()-((d.getDay()+6)%7));
  const mondayKey=monday.toISOString().slice(0,10);
  if(weekStart!==mondayKey){
    setS('nz_week_start_date',mondayKey);
    setS('nz_week_skill_start',{...S('nz_skill_scores')});
  }
}
```

---

## REPLACE ENTIRE `awardScore` FUNCTION

**Find:**
```js
function awardScore(rawPts,skillKey,gameId,gameScore,starThresh){
  /* --- 1. Points: NO skill penalty, straightforward addition --- */
```
**...all the way to the end of the function (`return pts;`)...**

**Replace with:**
```js
function awardScore(rawPts,skillKey,gameId,gameScore,starThresh,isPerfect){
  maybeInitWeekSnapshot();

  /* 1. BASE POINTS from game, capped sensibly */
  const basePts=Math.max(1,rawPts);

  /* 2. DIMINISHING RETURNS based on current brain score */
  const cur=S('nz_brain_score');
  const df=diminishFactor(cur);

  /* 3. ANTI-FARMING — same game repeated today loses value */
  const af=antiFarmFactor(gameId);

  /* 4. PERFECT PERFORMANCE BONUS (+3 flat) */
  const bestScores=S('nz_best_scores');
  const isNewBest=!bestScores[gameId]||gameScore>bestScores[gameId];
  const st2=starThresh||[5,10,15];
  const got3Stars=gameScore>=(st2[2]||st2[1]*2);
  const perfectBonus=(got3Stars&&isNewBest)?3:0;

  /* 5. FINAL BRAIN SCORE GAIN */
  let pts=Math.max(1,Math.round(basePts*df*af))+perfectBonus;

  /* 6. DIVERSITY BONUS */
  const divB=diversityBonus(gameId);
  if(divB>0){
    pts+=divB;
    setTimeout(()=>toast('🎯 Diversity Bonus! +'+divB+' Brain Score'),700);
  }

  /* 7. PERFECT toast */
  if(perfectBonus>0)setTimeout(()=>toast('✨ Perfect Performance! +'+perfectBonus+' Brain Score bonus!'),400);

  /* 8. SAVE BRAIN SCORE */
  const next=Math.max(0,cur+pts);
  setS('nz_brain_score',next);

  /* 9. PRESTIGE CHECK */
  const prevPrestige=prestigeLevel(cur);
  const newPrestige=prestigeLevel(next);
  if(newPrestige&&(!prevPrestige||newPrestige.score>prevPrestige.score)){
    setTimeout(()=>{confetti(120);toast(newPrestige.badge+' Prestige: '+newPrestige.title+'!');},1000);
  }

  /* 10. GAME PLAYS COUNTER */
  setS('nz_games_played',S('nz_games_played')+1);
  const gPlays=S('nz_game_plays');
  gPlays[gameId]=(gPlays[gameId]||0)+1;
  setS('nz_game_plays',gPlays);

  /* 11. STREAK */
  const prevLast=S('nz_last_played');
  const today=todayKey();
  if(prevLast!==today){
    const yDate=new Date(Date.now()-86400000);
    const yesterday=yDate.getFullYear()+'-'+String(yDate.getMonth()+1).padStart(2,'0')+'-'+String(yDate.getDate()).padStart(2,'0');
    const newStreak=prevLast===yesterday?S('nz_streak')+1:1;
    setS('nz_streak',newStreak);setS('nz_last_played',today);setS('nz_today_games',1);
    if(newStreak>1)setTimeout(()=>toast('🔥 '+newStreak+' day streak!'),400);
  }else{
    setS('nz_today_games',S('nz_today_games')+1);
  }

  /* 12. DAILY HISTORY */
  const _dh=S('nz_daily_history')||{};
  _dh[today]=Math.max(_dh[today]||0,next);
  const _allKeys=Object.keys(_dh).sort();
  while(_allKeys.length>7){delete _dh[_allKeys.shift()];}
  setS('nz_daily_history',_dh);

  /* 13. SKILL UPDATE (6 skills, primary + secondary) */
  const skMap=GAME_SKILL_MAP[gameId]||{p:skillKey,s:null};
  const sk=S('nz_skill_scores');
  const skPrev=S('nz_skill_scores_prev');
  Object.keys(sk).forEach(k=>{skPrev[k]=sk[k]||0;});
  const pGain=Math.max(1,Math.round(basePts*0.18));
  const sGain=Math.max(1,Math.round(basePts*0.09));
  if(skMap.p)sk[skMap.p]=Math.min(100,(sk[skMap.p]||0)+pGain);
  if(skMap.s)sk[skMap.s]=Math.min(100,(sk[skMap.s]||0)+sGain);
  setS('nz_skill_scores',sk);
  setS('nz_skill_scores_prev',skPrev);

  /* 14. SAVE SKILL GAIN for end screen display */
  setS('nz_last_skill_gain',{
    primary:skMap.p,pGain,secondary:skMap.s,sGain,
    bsGain:pts,prevBs:cur,newBs:next,
    divBonus:divB,perfectBonus,
    farmFactor:af<1?Math.round(af*100):null
  });

  /* 15. ACHIEVEMENTS */
  checkAchievements(gameId,gameScore);

  /* 16. XP (unchanged logic) */
  const _st2=starThresh||[5,10,15];
  const _xpTiers={
    schulte:[10,22,38,55],memory:[10,20,35,50],pattern:[10,22,38,55],
    wordflash:[10,20,35,50],wordchain:[10,20,35,48],math:[10,22,38,55],
    stroopx:[10,20,35,50],iqtest:[12,25,42,60],reactionlab:[10,20,35,50],mindtrace:[10,20,35,50],
  };
  const tiers=_xpTiers[gameId]||[10,20,35,50];
  let xpGain;
  if(gameScore>=(_st2[2]||_st2[1]*2))xpGain=tiers[3];
  else if(gameScore>=(_st2[1]||_st2[0]*1.5))xpGain=tiers[2];
  else if(gameScore>=_st2[0])xpGain=tiers[1];
  else xpGain=tiers[0];
  const dch=todayChallenge();
  if(dch&&gameId===dch.game&&!dailyDoneToday()&&dch.check(gameScore)){
    xpGain=Math.round(xpGain*1.5);
    setS('nz_daily_challenge_date',today);setS('nz_daily_challenge_done',true);setS('nz_daily_challenge_xp',xpGain);
    setTimeout(()=>toast('🎯 Daily Challenge complete! Bonus XP!'),600);
  }
  const oldXp=S('nz_xp'),newXp=oldXp+xpGain;
  setS('nz_xp',newXp);
  const prevLv=xpLevel(oldXp).cur.lv,newLv=xpLevel(newXp).cur;
  if(newLv.lv>prevLv)setTimeout(()=>showLevelUp(newLv),900);

  return pts;
}
```

---

## UPDATE END SCREEN to show skill breakdown

**In the `endGame()` function, find:**
```js
<div><span class="gain">+${pts} Brain Score</span></div>
```
**Replace with:**
```js
${(()=>{
  const sg=S('nz_last_skill_gain')||{};
  const L={memory:'Memory',focus:'Focus',logic:'Logic',speed:'Speed',planning:'Planning',attention:'Attention'};
  return `<div class="end-skill-gain">
    ${sg.primary?`<div class="esg-row"><span>${L[sg.primary]||sg.primary}</span><span class="esg-plus">+${sg.pGain||0}</span></div>`:''}
    ${sg.secondary?`<div class="esg-row"><span>${L[sg.secondary]||sg.secondary}</span><span class="esg-plus">+${sg.sGain||0}</span></div>`:''}
    ${sg.perfectBonus?`<div class="esg-row"><span>✨ Perfect Bonus</span><span class="esg-plus">+${sg.perfectBonus}</span></div>`:''}
    ${sg.divBonus?`<div class="esg-row"><span>🎯 Diversity Bonus</span><span class="esg-plus">+${sg.divBonus}</span></div>`:''}
    ${sg.farmFactor?`<div class="esg-row" style="opacity:.6"><span>⚠️ Farm penalty (${sg.farmFactor}%)</span></div>`:''}
    <div class="esg-divider"></div>
    <div class="esg-total"><span>Brain Score</span><span class="gain">+${pts}</span></div>
    <div class="esg-progress">${sg.prevBs||0} → <strong>${sg.newBs||0}</strong></div>
  </div>`;
})()}
```

**Add CSS at end of `css/style.css`:**
```css
.end-skill-gain{background:var(--card);border-radius:14px;padding:14px 16px;margin:10px 0;text-align:left;}
.esg-row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:var(--text2);}
.esg-plus{font-weight:700;color:#7C3AED;}
.esg-divider{border-top:1px solid var(--border);margin:8px 0;}
.esg-total{display:flex;justify-content:space-between;font-size:15px;font-weight:800;padding:2px 0;}
.esg-progress{font-size:11px;color:var(--text2);margin-top:4px;text-align:right;}
```

---

## UPDATE brain rank names

**Find:**
```js
function brainLevel(s){
  const p=prestigeLevel(s);
  if(p)return p.badge+' '+p.title.toUpperCase();
  if(s<=250)return'NOVICE';
  if(s<=800)return'LEARNER';
  if(s<=1800)return'FOCUSED';
  if(s<=3500)return'SHARP';
  if(s<=5500)return'EXPERT';
  if(s<=8000)return'ELITE';
  return'MASTER';
}
function brainLevelEmoji(s){
  if(s<=250)return'🌱';
  if(s<=800)return'📚';
  if(s<=1800)return'🎯';
  if(s<=3500)return'⚡';
  if(s<=5500)return'🧠';
  if(s<=8000)return'💎';
  return'👑';
}
```
**Replace with:**
```js
function brainLevel(s){
  const p=prestigeLevel(s);
  if(p)return p.badge+' '+p.title.toUpperCase();
  if(s<500)  return'BEGINNER';
  if(s<1200) return'NOVICE';
  if(s<2200) return'LEARNER';
  if(s<3500) return'FOCUSED';
  if(s<5000) return'SHARP MIND';
  if(s<6500) return'ANALYTICAL';
  if(s<8000) return'STRATEGIST';
  if(s<9000) return'BRAIN MASTER';
  if(s<9800) return'NEURO ELITE';
  return'NEUROZEN LEGEND';
}
function brainLevelEmoji(s){
  if(s<500)  return'🌱';
  if(s<1200) return'📚';
  if(s<2200) return'🎯';
  if(s<3500) return'⚡';
  if(s<5000) return'🧠';
  if(s<6500) return'🔬';
  if(s<8000) return'💡';
  if(s<9000) return'💎';
  if(s<9800) return'🏆';
  return'👑';
}
```

---

## UPDATE: Expand skills from 4→6 in profile/stats displays

**Find (profile skills snapshot, ~line 1272):**
```js
${[['memory','Memory','#7C3AED'],['focus','Focus','#4F8EF7'],['logic','Logic','#34D399'],['speed','Speed','#F97316']].map(
```
**Replace with:**
```js
${[['memory','Memory','#7C3AED'],['focus','Focus','#4F8EF7'],['logic','Logic','#34D399'],['speed','Speed','#F97316'],['planning','Planning','#8B5CF6'],['attention','Attention','#06B6D4']].map(
```

**Find (stats progress screen skills, ~line 821):**
```js
Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed'}).forEach(
```
**Replace with:**
```js
Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed',Planning:'planning',Attention:'attention'}).forEach(
```

**Find (home screen skills, ~line 551):**
```js
Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed'}).forEach(([label,key])=>{
```
**Replace with:**
```js
Object.entries({Memory:'memory',Focus:'focus',Logic:'logic',Speed:'speed',Planning:'planning',Attention:'attention'}).forEach(([label,key])=>{
```

---

## FIX per-game points in all game files (too high currently)

### `js/games/mindtrace.js`
```
points: G.score >= 120 ? 55 : G.score >= 70 ? 40 : ...
→ replace with:
points: G.score >= 120 ? 15 : G.score >= 70 ? 12 : G.score >= 30 ? 9 : 5,
```

### `js/games/memory.js`
```
points:finalRound>=20?45:finalRound>=12?30:finalRound>=6?18:8
→ points:finalRound>=20?14:finalRound>=12?11:finalRound>=6?8:4
```

### `js/games/pattern.js`
```
points:G.score>=80?48:G.score>=40?32:G.score>=18?18:8
→ points:G.score>=80?15:G.score>=40?12:G.score>=18?9:4
```

### `js/games/math.js`
```
points:G.score>=40?48:G.score>=22?32:G.score>=10?18:8
→ points:G.score>=40?13:G.score>=22?10:G.score>=10?7:4
```

### `js/games/stroopx.js`
```
points:G.score>=35?45:G.score>=22?30:G.score>=10?18:8
→ points:G.score>=35?12:G.score>=22?9:G.score>=10?6:4
```

### `js/games/wordchain.js`
```
points:final>=60?45:final>=40?30:final>=20?18:8
→ points:final>=60?11:final>=40?9:final>=20?7:4
```

### `js/games/wordflash.js`
```
points: score>=70?45:score>=40?30:score>=20?18:8
→ points: score>=70?11:score>=40?9:score>=20?7:4
```

### `js/games/iqtest.js`
```
points:iq>=130?50:iq>=110?35:iq>=90?20:10
→ points:iq>=130?14:iq>=110?11:iq>=90?8:5
```

### `js/games/reactionlab.js` — find the `xp=` line and replace:
```
const xp=Math.max(2,...);
→ const xp=finalRound>=30?11:finalRound>=20?9:finalRound>=10?7:4;
```

### `js/games/schulte.js` — find pts line:
```
const pts=focusScore>=85?48:...
→ const pts=focusScore>=85?13:focusScore>=65?10:focusScore>=40?7:4;
```

---

## FIX onboarding to init 6 skills

**Find:**
```js
setS('nz_skill_scores',{memory:calibResults.memory,focus:calibResults.focus,speed:calibResults.speed,logic:0});
setS('nz_skill_scores_prev',{memory:0,focus:0,speed:0,logic:0});
```
**Replace with:**
```js
setS('nz_skill_scores',{memory:calibResults.memory,focus:calibResults.focus,speed:calibResults.speed,logic:0,planning:0,attention:0});
setS('nz_skill_scores_prev',{memory:0,focus:0,speed:0,logic:0,planning:0,attention:0});
```
