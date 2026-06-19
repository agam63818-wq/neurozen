/* ===================== PATTERN IQ (v3 — fully rebuilt) ===================== */
const PAT_COLORS=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6','#FBBF24','#EF4444','#06B6D4'];
const PAT_COLOR_NAMES=['Purple','Blue','Green','Orange','Pink','Yellow','Red','Cyan'];
const PAT_SHAPES=['●','■','▲','◆','★','⬟','⬡','✦'];
const PAT_SHAPE_NAMES=['Circle','Square','Triangle','Diamond','Star','Hexagon','Hex2','Sparkle'];

/* --- Number sequence generators (8 types) --- */
function genNumSeq(){
  const rnd=n=>Math.floor(Math.random()*n)+1;
  const types=[
    ()=>{const a=rnd(8)+1,d=rnd(9)+2;return{seq:[a,a+d,a+2*d,a+3*d],ans:a+4*d,hint:'+'+d+' each step'};},
    ()=>{const a=rnd(4)+2,r=rnd(3)+2;return{seq:[a,a*r,a*r*r,a*r*r*r],ans:a*r*r*r*r,hint:'×'+r+' each step'};},
    ()=>{const a=rnd(6)+1,b=rnd(6)+2;const s=[a,b,a+b,a+2*b,2*a+3*b];return{seq:s.slice(0,4),ans:s[4],hint:'Fibonacci-like'};},
    ()=>{const n=rnd(5)+1;return{seq:[n*n,(n+1)*(n+1),(n+2)*(n+2),(n+3)*(n+3)],ans:(n+4)*(n+4),hint:'Perfect squares'};},
    ()=>{const primes=[2,3,5,7,11,13,17,19,23,29];const s=rnd(5);return{seq:primes.slice(s,s+4),ans:primes[s+4],hint:'Prime numbers'};},
    ()=>{const a=rnd(15)+5,d=rnd(5)+1;return{seq:[a,a-d,a-2*d,a-3*d],ans:a-4*d,hint:'-'+d+' each step'};},
    ()=>{const a=rnd(6)+2,b=rnd(4)+2;return{seq:[a,a+b,a+3*b,a+6*b],ans:a+10*b,hint:'Gaps: +b,+2b,+3b,+4b'};},
    ()=>{const a=rnd(4)+2,b=rnd(3)+2;const s=[a,a*b,a*b+a,a*b+a*b];return{seq:s,ans:s[3]+a,hint:'Alternate +,×'};},
  ];
  const t=types[Math.floor(Math.random()*types.length)]();
  const dist=new Set([t.ans]);
  while(dist.size<4){const d=t.ans+Math.floor(Math.random()*22)-11;if(d>0&&d!==t.ans)dist.add(d);}
  const opts=[...dist].sort(()=>Math.random()-.5);
  return{...t,opts,answerIdx:opts.indexOf(t.ans)};
}

/* --- Letter sequence generators --- */
function genLetterSeq(){
  const rnd=n=>Math.floor(Math.random()*n);
  const type=rnd(4);
  if(type===0){
    const skip=rnd(3)+1,start=rnd(6);
    const seq=Array.from({length:4},(_,i)=>String.fromCharCode(65+start+i*(skip+1)));
    const ans=String.fromCharCode(65+start+4*(skip+1));
    if(ans.charCodeAt(0)>90)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+rnd(26));if(!dist.includes(c)&&c!==ans)dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Skip +'+skip+' letters forward'};
  } else if(type===1){
    const start=rnd(6)+18,skip=rnd(2)+1;
    const seq=Array.from({length:4},(_,i)=>String.fromCharCode(start-i*skip));
    const ans=String.fromCharCode(start-4*skip);
    if(ans.charCodeAt(0)<65)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+rnd(26));if(!dist.includes(c)&&c!==ans)dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Going backward -'+skip};
  } else if(type===2){
    // alternating skip: +1,+2,+1,+2...
    const start=rnd(8);
    const gaps=[1,2,1,2,1];
    const positions=[start];
    for(let i=0;i<4;i++)positions.push(positions[i]+gaps[i]);
    const seq=positions.slice(0,4).map(p=>String.fromCharCode(65+p));
    const ans=String.fromCharCode(65+positions[4]);
    if(positions[4]>25||positions[4]<0)return genLetterSeq();
    const dist=[];
    while(dist.length<3){const c=String.fromCharCode(65+rnd(26));if(!dist.includes(c)&&c!==ans)dist.push(c);}
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Alternating +1,+2 gaps'};
  } else {
    // number+letter pairs
    const pairs=[['A',1],['C',3],['E',5],['G',7],['I',9]];
    const start=rnd(3);
    const seq=pairs.slice(start,start+4).map(p=>p[0]+p[1]);
    const ans=pairs[start+4]?pairs[start+4][0]+pairs[start+4][1]:'K11';
    const dist=['B2','D4','F6','J10'].filter(x=>x!==ans).slice(0,3);
    if(dist.length<3)return genLetterSeq();
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),hint:'Letter+number both increment'};
  }
}

/* --- Matrix 3×3 generator (smarter, not always bottom-right missing) --- */
function genMatrixQ(){
  const rowShapes=[0,1,2].map(()=>Math.floor(Math.random()*PAT_SHAPES.length));
  const rowCols=[0,1,2].map(()=>Math.floor(Math.random()*PAT_COLORS.length));
  // randomly pick which cell is missing (not always index 8)
  const missingPos=Math.floor(Math.random()*9);
  const grid=[];
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)grid.push({s:rowShapes[r],c:rowCols[c]});
  const missingCell=grid[missingPos];
  const correct=`${missingCell.s}_${missingCell.c}`;
  const wrongOpts=new Set();
  while(wrongOpts.size<3){
    const ws=(missingCell.s+(Math.floor(Math.random()*4)+1))%PAT_SHAPES.length;
    const wc=(missingCell.c+(Math.floor(Math.random()*4)+1))%PAT_COLORS.length;
    const k=`${ws}_${wc}`;
    if(k!==correct)wrongOpts.add(k);
  }
  const opts=[correct,...wrongOpts].sort(()=>Math.random()-.5);
  const answerIdx=opts.indexOf(correct);
  const cellHTML=grid.map((cell,i)=>i===missingPos?
    `<div class="pm-cell missing">?</div>`:
    `<div class="pm-cell" style="background:${PAT_COLORS[cell.c]};color:#fff;">${PAT_SHAPES[cell.s]}</div>`
  ).join('');
  const hint=`Row has same shape, column has same color`;
  return{cellHTML,opts,answerIdx,hint};
}

/* --- Color sequence generator (longer, more interesting) --- */
function genColorSeq(){
  const shape=PAT_SHAPES[Math.floor(Math.random()*PAT_SHAPES.length)];
  const type=Math.floor(Math.random()*3);
  if(type===0){
    // ABAB pattern - find C in ABCA?BC
    const a=Math.floor(Math.random()*PAT_COLORS.length);
    let b=a;while(b===a)b=Math.floor(Math.random()*PAT_COLORS.length);
    const seq=[a,b,a,b,a];const ans=b;
    const missingPos=4; // show 4 items, ask 5th
    const dist=Array.from({length:PAT_COLORS.length},(_,i)=>i).filter(i=>i!==ans).sort(()=>Math.random()-.5).slice(0,3);
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq:seq.slice(0,4),opts,answerIdx:opts.indexOf(ans),shape,hint:'ABAB repeating pattern'};
  } else if(type===1){
    // ABCABC repeating
    const pool=Array.from({length:PAT_COLORS.length},(_,i)=>i).sort(()=>Math.random()-.5).slice(0,3);
    const [a,b,c]=pool;
    const seq=[a,b,c,a,b];const ans=c;
    const dist=Array.from({length:PAT_COLORS.length},(_,i)=>i).filter(i=>i!==ans&&i!==a&&i!==b).slice(0,3);
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),shape,hint:'ABC repeating — find next in cycle'};
  } else {
    // Rainbow-like: advancing through color wheel
    const start=Math.floor(Math.random()*PAT_COLORS.length);
    const seq=Array.from({length:4},(_,i)=>(start+i)%PAT_COLORS.length);
    const ans=(start+4)%PAT_COLORS.length;
    const dist=Array.from({length:PAT_COLORS.length},(_,i)=>i).filter(i=>i!==ans).sort(()=>Math.random()-.5).slice(0,3);
    const opts=[ans,...dist].sort(()=>Math.random()-.5);
    return{seq,opts,answerIdx:opts.indexOf(ans),shape,hint:'Sequential color progression'};
  }
}

/* --- Shape rule question --- */
function genShapeRuleQ(){
  // Each row: shapes increase in count 1,2,3 or rotate through types
  const type=Math.floor(Math.random()*2);
  if(type===0){
    // Count pattern: row1→[1,2,3] shapes of same color, find missing count
    const shape=PAT_SHAPES[Math.floor(Math.random()*4)];
    const col=PAT_COLORS[Math.floor(Math.random()*PAT_COLORS.length)];
    const make=(n,s,c)=>Array(n).fill(0).map(()=>`<span style="color:${c};font-size:20px;">${s}</span>`).join('');
    // 3×3: col increases 1→3, row uses different shapes
    const shapes3=[0,1,2].map(()=>Math.floor(Math.random()*PAT_SHAPES.length));
    const cols3=[0,1,2].map(()=>Math.floor(Math.random()*PAT_COLORS.length));
    const missingRow=Math.floor(Math.random()*3);
    const missingCol2=Math.floor(Math.random()*3);
    const correct=`${shapes3[missingRow]}_${cols3[missingCol2]}`;
    const wrongOpts=new Set();
    while(wrongOpts.size<3){
      const ws=(shapes3[missingRow]+(Math.floor(Math.random()*3)+1))%PAT_SHAPES.length;
      const wc=(cols3[missingCol2]+(Math.floor(Math.random()*3)+1))%PAT_COLORS.length;
      wrongOpts.add(`${ws}_${wc}`);
    }
    const opts=[correct,...wrongOpts].sort(()=>Math.random()-.5);
    const answerIdx=opts.indexOf(correct);
    const grid=[];
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      const isMissing=(r===missingRow&&c===missingCol2);
      grid.push(isMissing?`<div class="pm-cell missing">?</div>`:
        `<div class="pm-cell" style="background:${PAT_COLORS[cols3[c]]};color:#fff;font-size:20px;">${PAT_SHAPES[shapes3[r]]}</div>`);
    }
    return{cellHTML:grid.join(''),opts,answerIdx,hint:'Same shape per row, same color per column'};
  } else {
    return genMatrixQ();
  }
}

function playPattern(body,setScore,end,wrap,startClock){
  const record=S('nz_pattern_best')||0;
  // Start screen
  const screen=$(`<div class="pat-start-screen"></div>`);
  screen.innerHTML=`
    <div class="pat-start-hero">
      <div style="font-size:64px;margin-bottom:8px;">💡</div>
      <h2 style="margin:0 0 6px;font-size:22px;">Pattern IQ</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 16px;line-height:1.5;">
        Color · Number · Matrix · Letter · Shape patterns<br>
        <strong>6 types</strong> of questions · Endless with 3 lives
      </p>
      ${record?`<div class="pat-best-chip">🏆 Best Score: ${record}</div>`:''}
    </div>
    <div class="pat-rules">
      <div class="pat-rule"><span>⚡</span><span>Answer in 3s = Speed Bonus +1</span></div>
      <div class="pat-rule"><span>🔥</span><span>Streak × 1.5 multiplier at 3+</span></div>
      <div class="pat-rule"><span>💡</span><span>Wrong = hint revealed, -1 life</span></div>
      <div class="pat-rule"><span>🎯</span><span>Harder rounds = more points</span></div>
    </div>
    <button class="btn-primary" id="patStart" style="width:100%;margin-top:18px;padding:16px;">Start Game ▶</button>
  `;
  body.appendChild(screen);

  const host=$(`<div class="pat-host"></div>`);body.appendChild(host);
  let q=0,score=0,bonus=0,arcTimer=null,qStartTs=0,lives=3,streak=0,bestStreak=0,combo=1;
  let lastExplanation='';

  function patHearts(){
    return `<div class="pat-hud">
      <div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>
      <div class="pat-hud-right">
        <span class="pat-score-badge">${score} pts</span>
        ${streak>=2?`<span class="pat-streak-badge">🔥${streak}</span>`:''}
      </div>
    </div>`;
  }

  function showArc(secs,onDone){
    _cti(arcTimer);
    const circ=2*Math.PI*30;
    let remaining=secs*10;
    arcTimer=_si(()=>{
      remaining--;
      const fg=host.querySelector('#arcFg');
      const num=host.querySelector('#arcNum');
      if(!fg||!num){_cti(arcTimer);return;}
      const pct=remaining/(secs*10);
      fg.style.strokeDashoffset=circ*(1-pct);
      fg.setAttribute('stroke',remaining<10?'#EF4444':remaining<20?'#F59E0B':'#7C3AED');
      num.textContent=Math.ceil(remaining/10);
      if(remaining<=0){_cti(arcTimer);onDone();}
    },100);
  }

  function getTimerSecs(){
    // Timer gets shorter as score increases
    if(score<5)return 7;
    if(score<12)return 6;
    if(score<20)return 5;
    return 4;
  }

  function getDifficultyLabel(){
    if(score<5)return{label:'🟢 Easy',color:'#22C55E'};
    if(score<12)return{label:'🟡 Medium',color:'#EAB308'};
    if(score<20)return{label:'🔴 Hard',color:'#EF4444'};
    return{label:'💀 Expert',color:'#7C3AED'};
  }

  function next(){
    if(lives<=0){
      const total=score+bonus;
      const newPB=score>record;
      if(newPB)setS('nz_pattern_best',score);
      setS('nz_pattern_games',(S('nz_pattern_games')||0)+1);
      if(newPB)confetti(60);
      const acc=q?Math.round(score/q*100):0;
      end({
        title:newPB?'New Best! 🏆':'Pattern Master! 💡',
        emoji:'💡',
        sub:`${score} correct · ${q} attempted${newPB?' · 🏆':''}`,
        value:total,points:Math.max(2,total*1.8),starThresh:[8,18,30],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Correct Answers</span><span class="val">${score}</span></div>
          <div class="row"><span>Total Attempted</span><span class="val">${q}</span></div>
          <div class="row"><span>Speed Bonuses</span><span class="val">+${bonus} ⚡</span></div>
          <div class="row"><span>Accuracy</span><span class="val">${acc}%</span></div>
          <div class="row"><span>Best Streak</span><span class="val">${bestStreak} 🔥</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(score,record)}${newPB?' 🏆':''}</span></div>
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
      return;
    }
    _cti(arcTimer);

    // Prevent same type 2× in a row
    if(!window._patLastTypes)window._patLastTypes=[];
    const _allTypes=[0,1,2,3,4,5];
    const _avail=_allTypes.filter(t=>!window._patLastTypes.slice(-1).includes(t));
    const type=_avail[Math.floor(Math.random()*_avail.length)];
    window._patLastTypes.push(type);
    if(window._patLastTypes.length>6)window._patLastTypes.shift();

    const diff=getDifficultyLabel();
    const timerSecs=getTimerSecs();
    let answerIdx=0,html='',hint='';

    if(type===0){
      // COLOR SEQUENCE — longer, more interesting
      const res=genColorSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#7C3AED,#F472B6);">🎨 COLOR SEQUENCE</div>
        <div class="pat-instruction">Jo pattern hai, uska agla color kya hoga?</div>
        <div class="pat-seq pat-seq-lg">${res.seq.map(c=>`<div class="pat-item pat-item-lg" style="background:${PAT_COLORS[c]};box-shadow:0 4px 16px ${PAT_COLORS[c]}55;">${res.shape}</div>`).join('')}<div class="pat-item pat-item-lg pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((c,i)=>`<button class="pat-opt pat-opt-color" data-i="${i}" style="background:${PAT_COLORS[c]};box-shadow:0 4px 12px ${PAT_COLORS[c]}44;">${res.shape}<span style="font-size:10px;display:block;margin-top:2px;">${PAT_COLOR_NAMES[c]}</span></button>`).join('')}</div>`;
    } else if(type===1){
      // NUMBER SEQUENCE
      const res=genNumSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#4F8EF7,#7C3AED);">🔢 NUMBER SEQUENCE</div>
        <div class="pat-instruction">Is number sequence mein agla number kya hai?</div>
        <div class="pat-seq">${res.seq.map(n=>`<div class="pat-item pat-num" style="background:linear-gradient(135deg,#7C3AED,#4F8EF7);">${n}</div>`).join('')}<div class="pat-item pat-num pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((v,i)=>`<button class="pat-opt pat-opt-num" data-i="${i}">${v}</button>`).join('')}</div>`;
    } else if(type===2){
      // MATRIX — smarter, random missing position
      const res=genMatrixQ();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#F472B6,#F97316);">🔲 MATRIX PATTERN</div>
        <div class="pat-instruction">"?" wali jagah kaunsa symbol hona chahiye?</div>
        <div class="pat-matrix-wrap"><div class="pat-matrix">${res.cellHTML}</div></div>
        <div class="pat-opts">${res.opts.map((k,i)=>{const[s,c]=k.split('_').map(Number);return`<button class="pat-opt" data-i="${i}" style="background:${PAT_COLORS[c]};color:#fff;font-size:22px;box-shadow:0 4px 12px ${PAT_COLORS[c]}44;">${PAT_SHAPES[s]}</button>`;}).join('')}</div>`;
    } else if(type===3){
      // LETTER SEQUENCE
      const res=genLetterSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#F472B6,#EC4899);">🔤 LETTER SEQUENCE</div>
        <div class="pat-instruction">Is letter sequence mein agla letter kya hai?</div>
        <div class="pat-seq">${res.seq.map(l=>`<div class="pat-item pat-letter">${l}</div>`).join('')}<div class="pat-item pat-letter pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((l,i)=>`<button class="pat-opt pat-opt-letter" data-i="${i}">${l}</button>`).join('')}</div>`;
    } else if(type===4){
      // SPECIAL SEQUENCE (Fibonacci, Squares, Primes)
      const res=genNumSeq();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#34D399,#059669);">🧮 SPECIAL SEQUENCE</div>
        <div class="pat-instruction">Mathematical pattern dekho — agla number?</div>
        <div class="pat-seq">${res.seq.map(n=>`<div class="pat-item pat-special">${n}</div>`).join('')}<div class="pat-item pat-special pat-q">?</div></div>
        <div class="pat-opts">${res.opts.map((v,i)=>`<button class="pat-opt pat-opt-special" data-i="${i}">${v}</button>`).join('')}</div>`;
    } else {
      // SHAPE RULE MATRIX
      const res=genShapeRuleQ();
      answerIdx=res.answerIdx;hint=res.hint;
      html=`<div class="q-type-badge" style="background:linear-gradient(135deg,#F97316,#FBBF24);">🔷 SHAPE MATRIX</div>
        <div class="pat-instruction">Har row aur column ka rule follow karo — "?" kya hai?</div>
        <div class="pat-matrix-wrap"><div class="pat-matrix">${res.cellHTML}</div></div>
        <div class="pat-opts">${res.opts.map((k,i)=>{const[s,c]=k.split('_').map(Number);return`<button class="pat-opt" data-i="${i}" style="background:${PAT_COLORS[c]};color:#fff;font-size:22px;box-shadow:0 4px 12px ${PAT_COLORS[c]}44;">${PAT_SHAPES[s]}</button>`;}).join('')}</div>`;
    }

    const arcHtml=`<div class="arc-wrap">
      <svg id="arcSvg" width="66" height="66" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(124,58,237,0.15)" stroke-width="5"/>
        <circle id="arcFg" cx="35" cy="35" r="30" fill="none" stroke="#7C3AED" stroke-width="5" stroke-linecap="round" transform="rotate(-90 35 35)" stroke-dasharray="${2*Math.PI*30}" stroke-dashoffset="0"/>
      </svg>
      <div class="arc-num" id="arcNum">${timerSecs}</div>
    </div>`;

    host.innerHTML=`
      ${patHearts()}
      <div class="pat-diff-row">
        <span class="pat-diff-chip" style="color:${diff.color}">${diff.label}</span>
        ${arcHtml}
        <span style="font-size:12px;color:var(--text2);">Q${q+1}</span>
      </div>
      ${html}
    `;

    qStartTs=Date.now();
    showArc(timerSecs,()=>{
      // Timeout — show hint and lose life
      playSound('wrong');
      const hintEl=document.createElement('div');
      hintEl.className='pat-hint-box';
      hintEl.innerHTML=`⏱ Time's up! · <span>💡 Hint: ${hint}</span>`;
      host.appendChild(hintEl);
      lives--;streak=0;combo=1;
      toast('⏱ Too slow! -1 life');
      q++;_st(next,1500);
    });

    host.querySelectorAll('.pat-opt').forEach(btn=>{
      btn.onclick=()=>{
        _cti(arcTimer);
        host.querySelectorAll('.pat-opt').forEach(b=>b.disabled=true);
        const chosen=+btn.dataset.i;
        const elapsed=Date.now()-qStartTs;
        if(chosen===answerIdx){
          playSound('correct');
          btn.classList.add('correct-ans');
          streak++;if(streak>bestStreak)bestStreak=streak;
          if(streak===3){combo=1.5;showCombo('🔥 STREAK x1.5');}
          if(streak===6){combo=2;showCombo('⚡ ON FIRE x2!');}
          const pts=Math.round((elapsed<3000?2:1)*combo);
          score+=pts;setScore(score);
          const fast=elapsed<3000;
          if(fast){bonus++;showCombo('⚡ SPEED +1');}
          // Show score popup
          const popup=document.createElement('div');
          popup.className='pat-pts-popup';
          popup.textContent=`+${pts}${fast?' ⚡':''}`;
          host.appendChild(popup);
          setTimeout(()=>popup.remove(),700);
          q++;_st(next,500);
        } else {
          playSound('wrong');
          btn.classList.add('wrong-ans');
          // Highlight correct answer
          host.querySelectorAll('.pat-opt')[answerIdx].classList.add('correct-ans');
          // Show hint
          const hintEl=document.createElement('div');
          hintEl.className='pat-hint-box pat-hint-wrong';
          hintEl.innerHTML=`❌ Wrong! · <span>💡 Hint: ${hint}</span>`;
          host.appendChild(hintEl);
          lives--;streak=0;combo=1;
          toast('❌ Wrong! -1 life');
          q++;_st(next,1200);
        }
      };
    });
  }

  screen.querySelector('#patStart').onclick=()=>{
    screen.remove();
    startClock&&startClock();
    window._patLastTypes=[];
    next();
  };
}
