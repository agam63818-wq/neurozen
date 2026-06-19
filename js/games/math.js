/* ===================== QUICK MATH ===================== */
/* Quick Math — endless survival. Modes + adaptive difficulty + combo + sudden death. */
const QM_MODES={
  easy:{label:'Easy',emoji:'🟢',sub:'Add / subtract',time:4000,ops:['+','-'],zen:false},
  medium:{label:'Medium',emoji:'🟡',sub:'× and ÷ included',time:3000,ops:['+','-','×','÷'],zen:false},
  hard:{label:'Hard',emoji:'🔴',sub:'2-step problems',time:2500,ops:['2step'],zen:false},
  algebra:{label:'Algebra',emoji:'⚡',sub:'Solve for x',time:2000,ops:['alg'],zen:false},
  zen:{label:'Zen',emoji:'🧘',sub:'No timer, no lives',time:0,ops:['+','-','×','÷'],zen:true},
};
function qmDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Answer 20 questions correctly',target:20},
    {label:'Reach a 10 answer streak',target:10,streak:true},
    {label:'Answer 30 questions correctly',target:30},
    {label:'Score 25+ in one run',target:25},
    {label:'Reach a 12 answer streak',target:12,streak:true},
  ];
  return defs[dayN%defs.length];
}
function qmDailyDone(){return S('nz_qm_daily_date')===todayKey()&&!!S('nz_qm_daily_done');}
function qmRank(score){
  if(score>=40)return{em:'👑',txt:'Math Legend'};
  if(score>=30)return{em:'⚡',txt:'Lightning Brain'};
  if(score>=20)return{em:'🧠',txt:'Math Wizard'};
  if(score>=10)return{em:'💪',txt:'Getting Sharper'};
  return{em:'🌱',txt:'Keep Practicing'};
}
/* Adaptive number scaling based on question index (1-based). */
function qmScale(qn){
  if(qn<=10)return{a:9,b:9,big:12};
  if(qn<=20)return{a:50,b:12,big:60};
  if(qn<=30)return{a:150,b:15,big:140};
  return{a:400,b:25,big:300};
}
function playMath(body,setScore,end,wrap,startClock){
  let mode='easy';
  renderStart();

  function renderStart(){
    body.innerHTML='';
    const best=S('nz_qm_best_score')||0;
    const games=S('nz_qm_games')||0;
    const bestStreak=S('nz_qm_best_streak')||0;
    const accH=S('nz_qm_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=qmDailyChallenge();
    const dcDone=qmDailyDone();
    const screen=$(`<div class="qm-start"></div>`);
    screen.innerHTML=`
      <div class="qm-stats">
        <div class="qm-stat"><div class="v">${best}</div><div class="l">Best Score</div></div>
        <div class="qm-stat"><div class="v">${games}</div><div class="l">Games</div></div>
        <div class="qm-stat"><div class="v">${bestStreak}</div><div class="l">Best Streak</div></div>
        <div class="qm-stat"><div class="v">${avgAcc}%</div><div class="l">Accuracy</div></div>
      </div>
      <div class="daily-card ${dcDone?'done':''}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="dc-ico">${dcDone?'✅':'🎯'}</div>
          <div style="flex:1;"><div class="dc-name">Daily: ${dc.label}</div><div class="dc-sub">${dcDone?'Completed today!':'Complete for 2x XP'}</div></div>
          <span class="dc-badge">2x XP</span>
        </div>
      </div>
      <div class="qm-mode-title">Choose a Mode</div>
      <div class="qm-modes" id="qmModes"></div>
      <button class="btn-primary" id="qmGo" style="margin-top:18px;">Start ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#qmModes');
    ['easy','medium','hard','algebra','zen'].forEach(k=>{
      const m=QM_MODES[k];
      const card=$(`<button class="qm-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji} ${m.label}</div>
        <div class="sm-grid">${m.zen?'No timer':(m.time/1000)+'s / question'}</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.qm-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#qmGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function genQuestion(qn){
    const m=QM_MODES[mode];
    const sc=qmScale(qn);
    const rnd=(n)=>Math.floor(Math.random()*n)+1;
    if(m.ops[0]==='alg'){
      const a=rnd(qn<=10?5:qn<=20?9:12)+1,x=rnd(qn<=20?9:15),b=rnd(qn<=10?9:20);
      return{display:`${a}x + ${b} = ${a*x+b},  x = ?`,correct:x};
    }
    if(m.ops[0]==='2step'){
      const a=rnd(Math.min(13,sc.b)),b=rnd(Math.min(13,sc.b)),c=rnd(sc.b);
      const add=Math.random()>0.5;
      const correct=add?a*b+c:a*b-c;
      return{display:`${a} × ${b} ${add?'+':'−'} ${c}`,correct};
    }
    const op=m.ops[Math.floor(Math.random()*m.ops.length)];
    if(op==='÷'){
      const d=rnd(Math.min(12,sc.b))+1,q2=rnd(Math.min(12,sc.b));
      return{display:`${d*q2} ÷ ${d}`,correct:q2};
    }
    if(op==='×'){
      const a=rnd(Math.min(sc.big,qn<=10?6:qn<=20?12:20)),b=rnd(Math.min(15,sc.b));
      return{display:`${a} × ${b}`,correct:a*b};
    }
    if(op==='-'){
      const a=rnd(sc.a)+rnd(sc.a),b=rnd(sc.a);
      const hi=Math.max(a,b),lo=Math.min(a,b);
      return{display:`${hi} − ${lo}`,correct:hi-lo};
    }
    const a=rnd(sc.a),b=rnd(sc.a);
    return{display:`${a} + ${b}`,correct:a+b};
  }

  function startGame(){
    const m=QM_MODES[mode];
    const zen=m.zen;
    const best=S('nz_qm_best_score')||0;
    let q=0,score=0,lives=zen?Infinity:3,streak=0,bestStreak=0,correctCount=0;
    let comboMult=1,sdMode=false,sdCount=0,sdSurvived=0,barTimer=null;
    body.innerHTML='';
    const host=$(`<div class="qm-play" style="position:relative;"></div>`);
    body.appendChild(host);

    function heartsHtml(){
      if(zen)return `<span class="qm-zen-tag">🧘 Zen — practice freely</span>`;
      return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;
    }

    function gameOver(){
      _cti(barTimer);wrap.classList.remove('fire-glow');
      const accuracy=q?Math.round(correctCount/q*100):0;
      const prevBest=S('nz_qm_best_score')||0;
      const newPB=score>prevBest;
      if(newPB)setS('nz_qm_best_score',score);
      setS('nz_qm_games',(S('nz_qm_games')||0)+1);
      if(bestStreak>(S('nz_qm_best_streak')||0))setS('nz_qm_best_streak',bestStreak);
      const accH=S('nz_qm_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_qm_accuracy',accH);
      // Daily challenge
      const dc=qmDailyChallenge();
      if(!qmDailyDone()){
        const pass=dc.streak?bestStreak>=dc.target:(correctCount>=dc.target||score>=dc.target);
        if(pass){setS('nz_qm_daily_date',todayKey());setS('nz_qm_daily_done',true);setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);}
      }
      const sdBonus=sdSurvived>=5?40:0;
      const rank=qmRank(score);
      setScore(score);
      end({
        title:`${rank.em} ${rank.txt}`,emoji:rank.em,
        sub:`Score ${score}${newPB?' · 🏆 New Best!':''}${sdBonus?' · ⚡ +'+sdBonus+' SD bonus':''}`,
        value:score,points:Math.max(2,score+Math.round(sdBonus/3)),starThresh:[10,20,35],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Questions Answered</span><span class="val">${q}</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${accuracy}% (${correctCount}/${q})</span></div>
          <div class="row"><span>Best Streak</span><span class="val">${bestStreak} 🔥</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(score,prevBest)}${newPB?' 🏆':''}</span></div>
          <div class="row"><span>XP Earned</span><span class="val">+${Math.max(2,score+Math.round(sdBonus/3))}</span></div>
          ${sdBonus?'<div class="row"><span>⚡ Sudden Death Bonus</span><span class="val">+'+sdBonus+'</span></div>':''}
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
    }

    function loseLife(){
      if(zen)return;
      if(sdMode){lives=0;}else{lives--;}
      haptic([30,50,30]);
      host.classList.add('shake-anim');_st(()=>host.classList.remove('shake-anim'),450);
      streak=0;comboMult=1;wrap.classList.remove('fire-glow');
    }

    function next(){
      if(!zen&&lives<=0){_st(gameOver,650);return;}
      _cti(barTimer);
      q++;
      const qn=q;
      const {display,correct}=genQuestion(qn);
      // distractors
      const range=Math.max(Math.ceil(Math.abs(correct)*0.2),3);
      const used=new Set([correct]);const distract=[];let tries=0;
      while(distract.length<3&&tries<100){tries++;const d=correct+Math.floor(Math.random()*range*2+1)-range;if(d!==correct&&!used.has(d)){used.add(d);distract.push(d);}}
      while(distract.length<3)distract.push(correct+(distract.length+1)*2);
      const opts=[correct,...distract].sort(()=>Math.random()-.5);
      const timeMs=m.time;
      const comboLabel=comboMult===3?'🔥 x3':comboMult===2?'⚡ x2':'';
      host.innerHTML=`
        ${zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="mBar" style="width:100%"></div></div>'}
        ${heartsHtml()}
        <div class="qm-info">
          <span>Q: ${q}</span>
          <span>Best: ${Math.max(best,score)}</span>
          ${sdMode?'<span class="qm-sd">💀 SUDDEN DEATH</span>':comboLabel?`<span class="qm-combo">${comboLabel}</span>`:`<span>🔥 ${streak}</span>`}
        </div>
        <div class="qm-question">${display}</div>
        <div class="math-opts">${opts.map(v=>`<button class="math-opt" data-v="${v}">${v}</button>`).join('')}</div>`;
      if(!zen&&timeMs){
        let elapsed=0;
        barTimer=_si(()=>{
          elapsed+=100;
          const pct=Math.max(0,100-elapsed/timeMs*100);
          const bar=wrap.querySelector('#mBar');
          if(bar){bar.style.width=pct+'%';bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');}
          if(elapsed>=timeMs){_cti(barTimer);resolve(null,correct,opts);}
        },100);
      }
      host.querySelectorAll('.math-opt').forEach(btn=>{
        btn.onclick=()=>{_cti(barTimer);resolve(+btn.dataset.v,correct,opts,btn);};
      });
    }

    function resolve(chosen,correct,opts,btn){
      host.querySelectorAll('.math-opt').forEach(b=>b.disabled=true);
      const right=chosen===correct;
      if(right){
        playSound('correct');haptic(10);
        if(btn)btn.classList.add('correct-ans');
        correctCount++;streak++;if(streak>bestStreak)bestStreak=streak;
        const pts=comboMult;
        score+=pts;setScore(score);
        // combo tiers
        if(streak===3){comboMult=2;showCombo('COMBO x2');}
        if(streak===5){comboMult=3;wrap.classList.add('fire-glow');showCombo('ON FIRE 🔥');}
        // sudden death unlock
        if(streak===10&&!sdMode){sdMode=true;sdCount=0;toast('⚡ SUDDEN DEATH! One mistake = game over!');}
        if(sdMode){sdCount++;sdSurvived=sdCount;if(sdCount>=5){sdMode=false;sdCount=0;toast('✅ Survived Sudden Death! Back to normal');}}
        _st(next,zen?320:480);
      } else {
        playSound('wrong');
        if(btn)btn.classList.add('wrong-ans');
        host.querySelectorAll('.math-opt').forEach(b=>{if(+b.dataset.v===correct)b.classList.add('correct-ans');});
        loseLife();
        if(!zen&&lives<=0){_st(gameOver,800);return;}
        _st(next,zen?500:800);
      }
    }

    next();
  }
}
