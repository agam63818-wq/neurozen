/* ===================== WORD FLASH (endless) ===================== */
const WF_T1=[
  ['CALM','CLAM','COAL','CALF'],['FORM','FROM','FORT','FOAM'],
  ['SALT','SLAT','SLOT','SILT'],['WORD','WARD','WARM','CORD'],
  ['MILE','LIME','MINE','MICE'],['TIDE','TIED','DIET','EDIT'],
  ['STAR','RATS','SCAR','STIR'],['LOOP','POOL','POLO','LOOT'],
  ['BEAR','BARE','BEAD','BEAN'],['PALE','PEAL','PLEA','PALM'],
  ['DEAL','LEAD','DEAR','DENT'],['NOTE','TONE','NONE','NODE'],
  ['GAME','MAGE','GATE','GAZE'],['RICE','RACE','RIPE','RIDE'],
  ['SAND','SEND','BAND','SANE'],['WIND','WING','WINE','WIDE'],
];
const WF_T2=[
  ['SWIFT','SHIFT','SNIFF','SWIRL'],['QUIET','QUITE','QUOTE','QUILT'],
  ['ANGEL','ANGLE','AGILE','ANKLE'],['BREAD','BEARD','BOARD','BRAND'],
  ['DAIRY','DIARY','DERBY','DIRTY'],['SACRED','SCARED','SEARED','SCORED'],
  ['MARBLE','RAMBLE','MARVEL','MANTLE'],['SILVER','SLIVER','SLIDER','SILKEN'],
  ['TRIAL','TRAIL','TRILL','TIDAL'],['BLAME','BLADE','BLARE','BLAZE'],
  ['STEAM','STEAK','STEAL','STEEL'],['GLARE','LARGE','GLAZE','GRACE'],
  ['CRATE','CARET','CATER','TRACE'],['SPARE','SPEAR','PARSE','SPADE'],
  ['POSE','PROSE','POISE','PURSE'],['NIGHT','RIGHT','NIGHTLY','MIGHT'],
];
const WF_T3=[
  ['THROUGH','TROUGH','THOROUGH','THOUGHT'],['PRECEDE','PROCEED','PRESIDE','PRECISE'],
  ['DESSERT','DESERTS','DISSENT','DISSECT'],['CONVERSE','CONSERVE','CONVERGE','CONVEYED'],
  ['ADAPTER','ADOPTER','ADAPTED','ADOPTED'],['LATERAL','LITERAL','LITERARY','LITERATE'],
  ['EMINENT','IMMINENT','EMIGRANT','ELEGANT'],['CRYSTAL','CRUCIAL','CYNICAL','CLINICAL'],
  ['PERSIST','PERSUADE','PERSPIRE','PERSONAL'],['DECLINE','DECLARE','DECIMAL','DECLAIM'],
  ['ILLUSION','ALLUSION','ELUSION','EVASION'],['STATIONARY','STATIONERY','STATIONS','SITUATION'],
  ['ACCEPT','EXCEPT','EXPECT','ACCESS'],['AFFECT','EFFECT','AFFLICT','EFFORT'],
  ['PRINCIPAL','PRINCIPLE','PRINCESS','PRINTING'],['COMPLEMENT','COMPLIMENT','COMPONENT','COMPLETE'],
];
function playWordFlash(body,setScore,end,wrap,startClock){
  let q=0,score=0,streak=0,bestStreak=0,fastest=null,correctCount=0,lives=3;
  const record=S('nz_wf_best')||0;
  // shuffled, recycling pools
  const pools={1:[...WF_T1].sort(()=>Math.random()-.5),2:[...WF_T2].sort(()=>Math.random()-.5),3:[...WF_T3].sort(()=>Math.random()-.5)};
  const used={1:0,2:0,3:0};
  function takeGroup(tier){const p=pools[tier];const g=p[used[tier]%p.length];used[tier]++;if(used[tier]%p.length===0)p.sort(()=>Math.random()-.5);return g;}
  const instrEl=$(`<div class="instr" style="margin-bottom:14px;"><strong>Word Flash ♾️</strong><br>Word ek flash mein dikhega — distractors bilkul similar honge! Endless: jab tak 3 lives hain khelte raho.<br><span style="font-size:11px;color:var(--primary);">Q8+ DECOY MODE: 2 words · ⚡ &lt;500ms = bonus · ❌ galat = -1 life</span>${record?`<div style="margin-top:6px;font-size:12px;font-weight:700;color:var(--mint);">🏆 Best: ${record} pts</div>`:''}<br>
  <button style="margin-top:10px;padding:12px 28px;background:var(--grad);color:#fff;border-radius:12px;font-weight:700;" id="wfStart">▶ Start</button>
</div>`);
  body.appendChild(instrEl);
  const host=$(`<div></div>`);body.appendChild(host);
  function heartsHtml(){return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;}
  function gameOver(){
    const acc=q?Math.round(correctCount/q*100):0;
    const newPB=score>record;
    if(newPB)setS('nz_wf_best',score);
    setS('nz_wf_games',(S('nz_wf_games')||0)+1);
    if(newPB)confetti(50);
    end({title:newPB?'New Best! 🏆':'Word Flash 📝',emoji:'📝',sub:`${score} pts · ${q} rounds · ${acc}%`,value:score,points:Math.max(2,score*0.7),starThresh:[20,40,70],
      statsHtml:`<div class="end-stats">
        <div class="row"><span>Score</span><span class="val">${score} pts</span></div>
        <div class="row"><span>Rounds Survived</span><span class="val">${q}</span></div>
        <div class="row"><span>Accuracy</span><span class="val">${acc}% (${correctCount}/${q})</span></div>
        <div class="row"><span>Fastest Response</span><span class="val">${fastest!==null?fastest+'ms':'—'}</span></div>
        <div class="row"><span>Longest Streak</span><span class="val">${bestStreak} 🔥</span></div>
        <div class="row"><span>Personal Best</span><span class="val">${Math.max(score,record)}${newPB?' 🏆':''}</span></div>
      </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`});
  }
  function next(){
    if(lives<=0){gameOver();return;}
    // difficulty scales endlessly with round
    const tier=q<5?1:q<11?2:3;
    const flashMs=Math.max(380,900-q*40);
    const decoy=q>=7;
    const group=takeGroup(tier);
    let words=[group[0]],askSide=0,group2=null;
    if(decoy){
      group2=takeGroup(tier);
      words=[group[0],group2[0]];
      askSide=Math.random()<0.5?0:1;
    }
    const askGroup=decoy&&askSide===1?group2:group;
    const askWord=askGroup[0];
    host.innerHTML=`
      ${heartsHtml()}
      <div class="wf-stage">
        <div class="wf-bar"><div class="wf-bar-fill" id="wfBar"></div></div>
        <div class="wf-words">${words.map(w=>`<div class="wf-word" style="font-size:${decoy?'26px':'48px'};">${w}</div>`).join('')}</div>
        ${decoy?'<div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:10px;letter-spacing:.12em;font-weight:700;">DECOY MODE — DONO YAAD RAKHO!</div>':''}
      </div>
      <div style="text-align:center;font-size:12px;color:var(--text2);margin-top:8px;">Round ${q+1} · ${flashMs}ms flash${streak>=3?' · 🔥 x1.5':''}</div>`;
    const bar=host.querySelector('#wfBar');
    requestAnimationFrame(()=>{requestAnimationFrame(()=>{if(bar){bar.style.transition=`width ${flashMs}ms linear`;bar.style.width='0%';}});});
    _st(()=>{
      const stage=host.querySelector('.wf-stage');
      if(stage){stage.style.transition='opacity .2s';stage.style.opacity='0';}
      _st(()=>{
        const opts=[...askGroup].sort(()=>Math.random()-.5);
        const askTs=Date.now();
        host.innerHTML=`
          ${heartsHtml()}
          <div class="wf-stage" style="padding:22px 16px;">
            <div class="wf-word" style="font-size:44px;">?</div>
            ${decoy?`<div style="font-size:12px;color:#A78BFA;font-weight:700;margin-top:6px;">${askSide===0?'⬅ LEFT':'RIGHT ➡'} wala word kaunsa tha?</div>`:''}
          </div>
          <div class="word-opts" id="wOpts" style="margin-top:14px;"></div>
          <div style="text-align:center;font-size:12px;color:var(--text2);margin-top:8px;">Round ${q+1}${streak>=3?' · 🔥 STREAK x1.5':''}</div>`;
        const optsEl=host.querySelector('#wOpts');
        opts.forEach(w=>{
          const b=$(`<button class="word-opt" data-w="${w}">${w}</button>`);
          b.onclick=()=>{
            optsEl.querySelectorAll('.word-opt').forEach(bb=>bb.disabled=true);
            const ms=Date.now()-askTs;
            if(b.dataset.w===askWord){
              playSound('correct');correctCount++;
              const fast=ms<500;
              if(fastest===null||ms<fastest)fastest=ms;
              let pts=fast?3:2;
              streak++;if(streak>bestStreak)bestStreak=streak;
              if(streak===3)showCombo('+STREAK BONUS x1.5');
              if(streak>=3)pts=Math.round(pts*1.5);
              if(fast)showCombo('⚡ SPEED DEMON!');
              score+=pts;setScore(score);
              b.classList.add('wf-correct');
              q++;_st(next,600);
            } else {
              playSound('wrong');streak=0;haptic([30,50,30]);
              b.classList.add('wf-wrong');
              optsEl.querySelectorAll('.word-opt').forEach(bb=>{if(bb.dataset.w===askWord)bb.classList.add('wf-correct');});
              lives--;toast('❌ -1 Life');
              q++;_st(next,800);
            }
          };
          optsEl.appendChild(b);
        });
      },200);
    },flashMs);
  }
  instrEl.querySelector('#wfStart').onclick=()=>{instrEl.remove();startClock&&startClock();next();};
}
