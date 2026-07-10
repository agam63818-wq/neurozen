# NeuroZen Retention System — PART 3 of 3
## Neuro Profile + Adaptive Recommendation + Weekly Brain Analysis
### File: `js/app.js` only | Prerequisite: Parts 1 & 2 done

---

## WHAT THIS ADDS

**3 new features** that make NeuroZen feel like an AI-powered premium app:

1. **Neuro Profile** — "You are naturally good at Planning & Logic. Train your Reaction." (on Profile tab)
2. **Adaptive Recommendation** — Smart card on Home screen telling you WHAT to play based on weakest skill
3. **Weekly Brain Analysis** — Monday card showing last week's skill gains, best game, weakest skill

---

## FEATURE 1 — Neuro Profile

### Add `getNeuroProfile()` function — add BEFORE `renderProfile()`

```js
/* ══════════ NEURO PROFILE ═══════════════════════════════ */
function getNeuroProfile(){
  const sk=S('nz_skill_scores');
  const skills=[
    {key:'memory',   label:'Memory',    emoji:'🧠'},
    {key:'focus',    label:'Focus',     emoji:'🎯'},
    {key:'logic',    label:'Logic',     emoji:'💡'},
    {key:'speed',    label:'Speed',     emoji:'⚡'},
    {key:'planning', label:'Planning',  emoji:'🗺️'},
    {key:'attention',label:'Attention', emoji:'👁️'},
  ];
  const scored=skills.map(s=>({...s,val:sk[s.key]||0}));
  scored.sort((a,b)=>b.val-a.val);

  const strongest=scored[0];
  const weakest=scored[scored.length-1];
  const played=scored.filter(s=>s.val>0);

  /* Brain personality type */
  let personality='Explorer';
  let personalityDesc='You\'re just getting started. Train all skills!';
  if(played.length>=3){
    if(scored[0].key==='planning'&&scored[1].key==='logic'){
      personality='Strategist';personalityDesc='You think ahead and reason deeply — a rare combination.';
    }else if(scored[0].key==='memory'&&scored[1].key==='attention'){
      personality='Memorist';personalityDesc='Your recall is exceptional. You notice every detail.';
    }else if(scored[0].key==='speed'&&scored[1].key==='attention'){
      personality='Quick Thinker';personalityDesc='Fast and sharp — you thrive under pressure.';
    }else if(scored[0].key==='focus'&&scored[1].key==='attention'){
      personality='Deep Focuser';personalityDesc='Sustained concentration is your superpower.';
    }else if(scored[0].key==='logic'){
      personality='Analytical Mind';personalityDesc='You break down every problem with precision.';
    }else if(scored[0].key==='speed'){
      personality='Speed Thinker';personalityDesc='You process information faster than most people.';
    }else{
      personality='Balanced Brain';personalityDesc='You excel across multiple skills — a true generalist.';
    }
  }

  /* Game recommendation for weakest skill */
  const skillToGame={
    memory:'memory',focus:'schulte',logic:'pattern',
    speed:'reactionlab',planning:'mindtrace',attention:'stroopx'
  };
  const recGameId=skillToGame[weakest.key]||'schulte';
  const recGame=GAMES.find(g=>g.id===recGameId)||GAMES[0];

  return{strongest,weakest,personality,personalityDesc,scored,recGame};
}
```

### Add Neuro Profile card to `renderProfile()`

**In `renderProfile()`, find the profile card HTML (the purple gradient card with brain score/streak/games).** After that card, before the "Skills Snapshot" section, add:

```js
/* Find this line (approximately): */
`<div class="sec-title"><h2>Skills Snapshot</h2>`
/* Add this HTML BEFORE it: */
```

```js
const np=getNeuroProfile();
`<div class="sec-title"><h2>🧬 Neuro Profile</h2></div>
<div class="card neuro-profile-card">
  <div class="np-personality">
    <div class="np-pers-title">${np.personality}</div>
    <div class="np-pers-desc">${np.personalityDesc}</div>
  </div>
  <div class="np-strengths">
    <div class="np-sh">
      <div class="np-sh-label">💪 Strongest</div>
      <div class="np-sh-val">${np.strongest.emoji} ${np.strongest.label} · ${np.strongest.val}</div>
    </div>
    <div class="np-sh">
      <div class="np-sh-label">📈 Train Next</div>
      <div class="np-sh-val">${np.weakest.emoji} ${np.weakest.label} · ${np.weakest.val}</div>
    </div>
  </div>
  <div class="np-rec">
    <span>Recommended:</span>
    <button class="np-rec-btn" data-gid="${np.recGame.id}">${np.recGame.icon} ${np.recGame.name}</button>
  </div>
</div>`
```

**After rendering profile, bind the recommendation button:**
```js
const npBtn=p.querySelector('.np-rec-btn');
if(npBtn)npBtn.onclick=()=>{closeGame&&closeGame();openGame(npBtn.dataset.gid);};
```

---

## FEATURE 2 — Adaptive Recommendation on Home Screen

### Add smart recommendation card to `renderHome()`

**Find in `renderHome()`, the section with "Your Skills":**
```js
<div class="sec-title"><h2>Your Skills</h2><a href="#" onclick="render('progress');return false;">Details ›</a></div>
<div class="card skills-card"><div id="skillBars"></div></div>
```

**Replace with:**
```js
<div class="sec-title"><h2>Your Skills</h2><a href="#" onclick="render('progress');return false;">Details ›</a></div>
<div class="card skills-card"><div id="skillBars"></div></div>
<div id="smartRec"></div>
```

**Then, after the skill bars are drawn (after the `forEach` loop), add:**
```js
const recArea=p.querySelector('#smartRec');
if(recArea){
  const np=getNeuroProfile();
  const sk=S('nz_skill_scores');
  const totalPlayed=Object.values(sk).filter(v=>v>0).length;
  /* Only show after player has played at least 3 different games */
  if(totalPlayed>=2){
    const diff=np.strongest.val-np.weakest.val;
    const msgStrong=diff>20?`Your ${np.strongest.label} is excellent!`:`Keep training ${np.strongest.label}!`;
    const recCard=$(`<div class="smart-rec-card">
      <div class="src-row">
        <div class="src-icon">🤖</div>
        <div class="src-text">
          <div class="src-title">AI Recommendation</div>
          <div class="src-msg">${msgStrong} Your <strong>${np.weakest.label}</strong> needs training.</div>
        </div>
      </div>
      <button class="src-btn" data-gid="${np.recGame.id}">${np.recGame.icon} Train ${np.weakest.label} with ${np.recGame.name} →</button>
    </div>`);
    recCard.querySelector('.src-btn').onclick=()=>{playSound('tap');openGame(np.recGame.id);};
    recArea.appendChild(recCard);
  }
}
```

---

## FEATURE 3 — Weekly Brain Analysis

### Add `getWeeklyAnalysis()` function — add near `getNeuroProfile()`

```js
/* ══════════ WEEKLY ANALYSIS ════════════════════════════ */
function getWeeklyAnalysis(){
  const sk=S('nz_skill_scores');
  const skStart=S('nz_week_skill_start')||{};
  const skills=['memory','focus','logic','speed','planning','attention'];
  const labels={memory:'Memory',focus:'Focus',logic:'Logic',speed:'Speed',planning:'Planning',attention:'Attention'};
  const gains=skills.map(k=>({
    key:k,label:labels[k],
    gain:Math.max(0,(sk[k]||0)-(skStart[k]||0))
  })).filter(g=>g.gain>0).sort((a,b)=>b.gain-a.gain);

  const bsNow=S('nz_brain_score');
  const bsStart=S('nz_week_bs_start')||bsNow;
  const weekBsGain=bsNow-bsStart;

  const gPlays=S('nz_game_plays')||{};
  const weekPlays=S('nz_week_game_plays')||{};
  let bestGameId=null,bestCount=0;
  Object.entries(gPlays).forEach(([id,n])=>{
    const weekN=n-(weekPlays[id]||0);
    if(weekN>bestCount){bestCount=weekN;bestGameId=id;}
  });
  const bestGame=bestGameId?GAMES.find(g=>g.id===bestGameId):null;
  const weakest=gains.length>0?gains[gains.length-1]:null;
  const recGameId=weakest?({memory:'memory',focus:'schulte',logic:'pattern',speed:'reactionlab',planning:'mindtrace',attention:'stroopx'}[weakest.key]||'schulte'):'schulte';
  const recGame=GAMES.find(g=>g.id===recGameId)||GAMES[0];

  return{gains,weekBsGain,bestGame,bestCount,weakest,recGame};
}

/* Save week baseline when new week starts (called from maybeInitWeekSnapshot) */
/* Update maybeInitWeekSnapshot to also save BS and game plays baseline */
```

**Update `maybeInitWeekSnapshot` function** (the one added in Part 1):
**Find:**
```js
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
**Replace with:**
```js
function maybeInitWeekSnapshot(){
  const d=new Date();
  const monday=new Date(d);
  monday.setDate(d.getDate()-((d.getDay()+6)%7));
  const mondayKey=monday.toISOString().slice(0,10);
  const weekStart=S('nz_week_start_date');
  if(weekStart!==mondayKey){
    setS('nz_week_start_date',mondayKey);
    setS('nz_week_skill_start',{...S('nz_skill_scores')});
    setS('nz_week_bs_start',S('nz_brain_score'));
    setS('nz_week_game_plays',{...S('nz_game_plays')});
  }
}
```

**Also add `nz_week_bs_start:0, nz_week_game_plays:{}` to FRESH defaults.**

### Show Weekly Analysis card on Home Screen — on MONDAYS

**In `renderHome()`, find the home screen content area, right after the score card div (`</div>` closing the `.card.score-card`), add:**

```js
/* Show weekly analysis on Monday (day=1) */
const dayOfWeek=new Date().getDay();
if(dayOfWeek===1){
  const wa=getWeeklyAnalysis();
  if(wa.weekBsGain>0||wa.gains.length>0){
    const weekCard=$(`<div class="week-card">
      <div class="wk-title">📊 Last Week's Brain Growth</div>
      ${wa.weekBsGain>0?`<div class="wk-bs-gain">+${wa.weekBsGain} Brain Score this week</div>`:''}
      <div class="wk-skills">
        ${wa.gains.slice(0,4).map(g=>`
          <div class="wk-skill-row">
            <span>${g.label}</span>
            <span class="wk-plus">+${g.gain}</span>
          </div>`).join('')}
      </div>
      ${wa.bestGame?`<div class="wk-best">🏆 Best Game: ${wa.bestGame.icon} ${wa.bestGame.name} (${wa.bestCount}×)</div>`:''}
      ${wa.weakest?`<div class="wk-rec">
        📈 Weakest: <strong>${wa.weakest.label}</strong> — play
        <button class="wk-rec-btn" data-gid="${wa.recGame.id}">${wa.recGame.icon} ${wa.recGame.name}</button>
      </div>`:''}
    </div>`);
    const wkBtn=weekCard.querySelector('.wk-rec-btn');
    if(wkBtn)wkBtn.onclick=()=>{playSound('tap');openGame(wkBtn.dataset.gid);};
    p.querySelector('.score-card').insertAdjacentElement('afterend',weekCard);
  }
}
```

---

## ADD CSS for all new UI

```css
/* ── NEURO PROFILE ─────────────────────────────────────── */
.neuro-profile-card{padding:16px;display:flex;flex-direction:column;gap:12px;}
.np-personality{text-align:center;padding:12px;background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(79,142,247,.08));border-radius:12px;}
.np-pers-title{font-size:18px;font-weight:800;color:var(--primary);margin-bottom:4px;}
.np-pers-desc{font-size:12px;color:var(--text2);line-height:1.5;}
.np-strengths{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.np-sh{background:var(--bg);border-radius:10px;padding:10px 12px;}
.np-sh-label{font-size:10px;color:var(--text2);font-weight:600;margin-bottom:3px;}
.np-sh-val{font-size:13px;font-weight:700;}
.np-rec{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2);}
.np-rec-btn{padding:6px 14px;background:var(--grad);color:#fff;border-radius:8px;font-size:12px;font-weight:700;}

/* ── SMART RECOMMENDATION ───────────────────────────────── */
.smart-rec-card{background:linear-gradient(135deg,#7C3AED15,#4F8EF715);border:1.5px solid rgba(124,58,237,.2);border-radius:14px;padding:14px;margin:4px 0 12px;}
.src-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;}
.src-icon{font-size:24px;flex-shrink:0;}
.src-title{font-size:11px;font-weight:700;color:var(--primary);letter-spacing:.06em;margin-bottom:2px;}
.src-msg{font-size:13px;line-height:1.4;}
.src-btn{width:100%;padding:10px;background:var(--grad);color:#fff;border-radius:10px;font-size:13px;font-weight:700;text-align:center;}

/* ── WEEKLY ANALYSIS ────────────────────────────────────── */
.week-card{background:linear-gradient(135deg,#7C3AED10,#06B6D410);border:1.5px solid rgba(124,58,237,.15);border-radius:16px;padding:16px;margin-bottom:12px;}
.wk-title{font-size:14px;font-weight:800;margin-bottom:10px;}
.wk-bs-gain{font-size:20px;font-weight:800;color:var(--primary);margin-bottom:8px;}
.wk-skills{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;}
.wk-skill-row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;}
.wk-plus{font-weight:700;color:#22C55E;}
.wk-best{font-size:12px;color:var(--text2);margin-bottom:6px;}
.wk-rec{font-size:12px;color:var(--text2);display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.wk-rec-btn{padding:4px 10px;background:var(--primary);color:#fff;border-radius:6px;font-size:11px;font-weight:700;}
```

---

## ALSO ADD `nz_week_bs_start` and `nz_week_game_plays` to FRESH defaults

**Find the FRESH line added in Part 1:**
```js
  nz_week_skill_start:{},nz_week_start_date:'',
  nz_mastery:{},
```
**Replace with:**
```js
  nz_week_skill_start:{},nz_week_start_date:'',
  nz_week_bs_start:0,nz_week_game_plays:{},
  nz_mastery:{},
```

---

## VERIFICATION FOR PART 3

1. **Profile tab** → Below profile card, see "Neuro Profile" card with personality type, strongest/weakest skill, and "Train X with Game Y" button.
2. **Home screen** (after playing 2+ different games) → Smart recommendation card appears: "AI Recommendation — Your Planning needs training. Train with Mind Trace →"
3. **Monday only** → Weekly Analysis card appears at top of home screen with skill gains, best game, weakest skill recommendation.
4. Tap any recommendation button → opens that game directly.
5. **Dev test** (any day): temporarily set `new Date().getDay()` to return 1, reload → weekly card appears.

---

## SUMMARY: What all 3 parts give NeuroZen

```
Part 1: Core System
├── 6 skills (Planning + Attention added)
├── Diminishing returns (0-2000 = 100%, 8000-10000 = 35%)
├── Anti-farming (5th same game = 40% reward)
├── Diversity bonus (+5 for 3 categories)
├── Perfect bonus (+3 for 3-star + new record)
├── Skill breakdown on end screen
└── 10 brain rank levels

Part 2: Game Mastery
├── 30 mastery levels per game
├── Mastery XP per play based on performance
├── Mastery badge on game cards
├── Level-up toast with personality title
└── Mastery shown on end screen

Part 3: Intelligence Layer
├── Neuro Profile (personality type + strongest/weakest)
├── Home screen AI Recommendation card
└── Monday Weekly Brain Analysis card
```

**5 reasons player opens the app each day:**
1. Daily Challenge (existing)
2. Brain Score rank to reach next tier
3. Mastery level to level up in favourite game
4. Weakest skill to improve (AI Recommendation)
5. Monday: see weekly growth report
