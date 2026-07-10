/* ===================== REACTION LAB (endless survival) ===================== */
const RL_MODES={
  classic:{label:'Classic',emoji:'⚡',sub:'Tap circle fast',zen:false},
  gonogo:{label:'Go / No-Go',emoji:'🚦',sub:'Red tap · Blue don\'t',zen:false},
  target:{label:'Target',emoji:'🎯',sub:'Tap the larger one',zen:false},
  zen:{label:'Zen',emoji:'🧘',sub:'No lives, practice',zen:true},
};
function rlReactPoints(rt){
  if(rt<200)return{pts:5,em:'⚡',txt:'LIGHTNING!'};
  if(rt<300)return{pts:4,em:'🔥',txt:'FAST'};
  if(rt<450)return{pts:3,em:'👍',txt:'GOOD'};
  if(rt<600)return{pts:2,em:'😐',txt:'OK'};
  return{pts:1,em:'🐌',txt:'SLOW'};
}
function rlRank(avg){
  if(avg<200)return{em:'👑',txt:'Superhuman'};
  if(avg<250)return{em:'🔥',txt:'Elite Reflexes'};
  if(avg<350)return{em:'⚡',txt:'Sharp Reflexes'};
  if(avg<500)return{em:'👍',txt:'Decent Reflexes'};
  return{em:'🐌',txt:'Keep Training'};
}
function rlDailyChallenge(){
  const dayN=Math.floor(Date.now()/86400000);
  const defs=[
    {label:'Average reaction under 300ms',type:'avg',target:300},
    {label:'Reach Round 15',type:'round',target:15},
    {label:'Land a tap under 200ms',type:'fastest',target:200},
    {label:'Average reaction under 350ms',type:'avg',target:350},
    {label:'Reach Round 20',type:'round',target:20},
  ];
  return defs[dayN%defs.length];
}
function rlDailyDone(){return S('nz_rl_daily_date')===todayKey()&&!!S('nz_rl_daily_done');}
const RL_DISAPPEAR=1000; // circle disappears after 1s if not tapped
function playReactionLab(body,setScore,end,wrap,startClock){
  let mode='classic';
  renderStart();

  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_rl_best_round')||0;
    const avgTime=S('nz_rl_avg_time')||0;
    const games=S('nz_rl_games')||0;
    const dc=rlDailyChallenge();
    const dcDone=rlDailyDone();
    const screen=$(`<div class="rl-start"></div>`);
    screen.innerHTML=`
      <div class="rl-stats">
        <div class="rl-stat"><div class="v">${bestRound}</div><div class="l">Best Round</div></div>
        <div class="rl-stat"><div class="v">${avgTime?avgTime+'ms':'—'}</div><div class="l">Avg Reaction</div></div>
        <div class="rl-stat"><div class="v">${games}</div><div class="l">Games</div></div>
      </div>
      <div class="daily-card ${dcDone?'done':''}" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="dc-ico">${dcDone?'✅':'🎯'}</div>
          <div style="flex:1;"><div class="dc-name">Daily: ${dc.label}</div><div class="dc-sub">${dcDone?'Completed today!':'Complete for 2x XP'}</div></div>
          <span class="dc-badge">2x XP</span>
        </div>
      </div>
      <div class="rl-mode-title">Choose a Mode</div>
      <div class="rl-modes" id="rlModes"></div>
      <button class="btn-primary" id="rlGo" style="margin-top:18px;">Start ▶</button>
    `;
    body.appendChild(screen);
    const modesEl=screen.querySelector('#rlModes');
    ['classic','gonogo','target','zen'].forEach(k=>{
      const m=RL_MODES[k];
      const card=$(`<button class="rl-mode ${k===mode?'sel':''}" data-m="${k}">
        <div class="sm-top">${m.emoji} ${m.label}</div>
        <div class="sm-sub">${m.sub}</div>
      </button>`);
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.rl-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#rlGo').onclick=()=>{playSound('tap');startClock&&startClock();startGame();};
  }

  function startGame(){
    const m=RL_MODES[mode];
    const zen=m.zen;
    body.innerHTML='';
    const stage=$(`<div class="rl-play"></div>`);
    stage.innerHTML=`
      <div id="rlHud" class="rl-hud"></div>
      <div id="rlArena" class="rl-arena"></div>
      <div id="rlInfo" class="rl-info-line"></div>`;
    body.appendChild(stage);
    const arena=stage.querySelector('#rlArena');
    const hud=stage.querySelector('#rlHud');
    const info=stage.querySelector('#rlInfo');
    const times=[];
    let round=0,score=0,lives=zen?Infinity:3,fastest=null,delayT=null,holdT=null,busy=false,active=true;
    let _delayDeadline=0,_delayCb=null,_holdDeadline=0,_holdCb=null;
    const _rlVH=()=>{
      if(document.hidden){
        if(delayT){const r=Math.max(1,_delayDeadline-Date.now());clearTimeout(delayT);delayT=null;_delayDeadline=Date.now()+r;}
        if(holdT){const r=Math.max(1,_holdDeadline-Date.now());clearTimeout(holdT);holdT=null;_holdDeadline=Date.now()+r;}
      }else{
        if(_delayDeadline>Date.now()&&_delayCb&&!delayT){delayT=_st(_delayCb,_delayDeadline-Date.now());}
        if(_holdDeadline>Date.now()&&_holdCb&&!holdT){holdT=_st(_holdCb,_holdDeadline-Date.now());}
      }
    };
    document.addEventListener('visibilitychange',_rlVH);
    wrap.addEventListener('remove_game',()=>{document.removeEventListener('visibilitychange',_rlVH);active=false;clearTimeout(delayT);clearTimeout(holdT);busy=true;});

    function heartsHtml(){
      if(zen)return `<span class="qm-zen-tag">🧘 Zen — no lives</span>`;
      return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>`;
    }
    function drawHud(){
      hud.innerHTML=`${heartsHtml()}
        <div class="rl-roundrow"><span>Round <strong>${round+1}</strong></span><span>Score <strong>${score}</strong></span></div>`;
    }
    function showFb(msg,color){
      const old=arena.querySelector('.rl-fb');if(old)old.remove();
      const el=$(`<div class="rl-fb" style="color:${color};">${msg}</div>`);
      arena.appendChild(el);
    }

    function roundType(rn){
      if(mode==='gonogo')return 'gonogo';
      if(mode==='target')return 'target';
      if(mode==='zen')return rn<10?'single':rn<20?'gonogo':rn<30?'target':'odd';
      if(rn<10)return 'single';
      if(rn<20)return 'gonogo';
      if(rn<30)return 'target';
      return 'odd';
    }

    function loseLife(){
      if(zen)return false;
      lives--;
      haptic([30,50,30]);
      arena.classList.add('shake-anim');_st(()=>arena.classList.remove('shake-anim'),450);
      return lives<=0;
    }

    function advance(t,msg,color,pts,dead){
      if(!active)return;
      clearTimeout(holdT);clearTimeout(delayT);busy=true;_delayDeadline=0;_holdDeadline=0;
      if(t>0&&t<RL_DISAPPEAR){times.push(t);if(fastest===null||t<fastest)fastest=t;}
      if(pts>0){score+=pts;setScore(score);}
      showFb(msg,color);
      if(dead){_st(gameOver,950);return;}
      round++;
      _st(()=>{busy=false;doRound();},850);
    }

    function doRound(){
      if(!active)return;
      drawHud();
      const rn=round;
      const type=roundType(rn);
      info.textContent=`Round ${rn+1} · ${type==='single'?'Tap the circle!':type==='gonogo'?'🔴 tap · 🔵 don\'t tap':type==='target'?'Tap the LARGER circle':'Tap the ODD-colored circle'}`;
      arena.innerHTML='<div class="rl-ready">+ + +</div>';
      const delay=rn<10?(800+Math.random()*1700):(500+Math.random()*1000);
      _delayCb=()=>{
        if(!active||round!==rn)return;
        arena.innerHTML='';
        const aw=arena.clientWidth||300,ah=arena.clientHeight||220;
        const ts=Date.now();
        const place=(size)=>{
          const x=8+Math.floor(Math.random()*Math.max(1,aw-size-16));
          const y=8+Math.floor(Math.random()*Math.max(1,ah-size-16));
          return{x,y};
        };
        const circle=(size,color,onTap)=>{
          const {x,y}=place(size);
          const el=$(`<div class="rl-circle" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};"></div>`);
          el.onclick=()=>{if(busy)return;haptic(10);onTap(el);};
          arena.appendChild(el);
          return el;
        };
        const lockAll=()=>arena.querySelectorAll('.rl-circle').forEach(d=>d.style.pointerEvents='none');
        const onCorrectTap=()=>{
          const rt=Date.now()-ts;const r=rlReactPoints(rt);
          lockAll();advance(rt,`${r.em} ${r.txt} +${r.pts} · ${rt}ms`,'#22C55E',r.pts,false);
        };
        const onMiss=()=>{const dead=loseLife();advance(0,zen?'⏱ Missed':'⏱ Too slow! -1 life','#EF4444',0,dead);};
        const onWrongTap=(msg)=>{lockAll();const dead=loseLife();advance(0,zen?msg:msg+' -1 life','#EF4444',0,dead);};

        if(type==='single'){
          const col=['#7C3AED','#4F8EF7','#34D399','#F472B6','#F97316'][Math.floor(Math.random()*5)];
          circle(54,col,()=>{onCorrectTap();});
          const _hc=onMiss;holdT=_st(_hc,RL_DISAPPEAR);_holdCb=_hc;_holdDeadline=Date.now()+RL_DISAPPEAR;
        } else if(type==='gonogo'){
          const isGo=Math.random()<0.6;
          const col=isGo?'#EF4444':'#3B82F6';
          circle(54,col,()=>{
            if(isGo){onCorrectTap();}
            else{onWrongTap('❌ Tapped blue!');}
          });
          if(isGo){const _hc=onMiss;holdT=_st(_hc,RL_DISAPPEAR);_holdCb=_hc;_holdDeadline=Date.now()+RL_DISAPPEAR;}
          else{const _hc=()=>{lockAll();advance(0,'👍 +3 · Correctly ignored','#22C55E',3,false);};holdT=_st(_hc,RL_DISAPPEAR);_holdCb=_hc;_holdDeadline=Date.now()+RL_DISAPPEAR;}
        } else if(type==='target'){
          let big=46+Math.floor(Math.random()*22);
          let small=big-(18+Math.floor(Math.random()*12));
          const arr=[{size:big,correct:true},{size:small,correct:false}].sort(()=>Math.random()-.5);
          arr.forEach((c,i)=>{
            const col=['#7C3AED','#4F8EF7'][i];
            circle(c.size,col,()=>{c.correct?onCorrectTap():onWrongTap('❌ Smaller circle!');});
          });
          const _hc=onMiss;holdT=_st(_hc,RL_DISAPPEAR);_holdCb=_hc;_holdDeadline=Date.now()+RL_DISAPPEAR;
        } else {
          const base=['#7C3AED','#4F8EF7','#34D399','#F97316'][Math.floor(Math.random()*4)];
          let odd=base;while(odd===base)odd=['#7C3AED','#4F8EF7','#34D399','#F97316','#F472B6'][Math.floor(Math.random()*5)];
          const oddIdx=Math.floor(Math.random()*3);
          for(let i=0;i<3;i++){
            const col=i===oddIdx?odd:base;
            circle(48,col,()=>{i===oddIdx?onCorrectTap():onWrongTap('❌ Wrong color!');});
          }
          holdT=_st(onMiss,RL_DISAPPEAR);
          _holdCb=onMiss;_holdDeadline=Date.now()+RL_DISAPPEAR;
        }
      };
      _delayDeadline=Date.now()+delay;
      delayT=_st(_delayCb,delay);
    }

    function gameOver(){
      document.removeEventListener('visibilitychange',_rlVH);
      active=false;clearTimeout(delayT);clearTimeout(holdT);
      const valid=times.filter(t=>t>0&&t<RL_DISAPPEAR);
      const avg=valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length):0;
      const finalRound=round;
      const prevBestRound=S('nz_rl_best_round')||0;
      const newPB=finalRound>prevBestRound;
      if(newPB)setS('nz_rl_best_round',finalRound);
      setS('nz_rl_games',(S('nz_rl_games')||0)+1);
      if(avg>0)setS('nz_rl_avg_time',avg);
      const prevFast=S('nz_rl_fastest')||0;
      if(fastest!==null&&(prevFast===0||fastest<prevFast))setS('nz_rl_fastest',fastest);
      const dc=rlDailyChallenge();
      if(!rlDailyDone()){
        let pass=false;
        if(dc.type==='avg')pass=avg>0&&avg<=dc.target;
        else if(dc.type==='round')pass=finalRound>=dc.target;
        else if(dc.type==='fastest')pass=fastest!==null&&fastest<=dc.target;
        if(pass){setS('nz_rl_daily_date',todayKey());setS('nz_rl_daily_done',true);setTimeout(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);}
      }
      const last=times.slice(-10);
      const n=10,cw=24,gap=4,ph=64,pw=n*(cw+gap)+gap;
      const maxMs=Math.max(...last,300);
      const bars=last.map((t,i)=>{
        const x=gap+i*(cw+gap);
        const bh=Math.max(8,Math.round(t/maxMs*ph));
        const fc=t<200?'#7C3AED':t<300?'#34D399':t<450?'#FBBF24':t<600?'#F59E0B':'#F97316';
        return`<rect x="${x}" y="${ph-bh}" width="${cw}" height="${bh}" rx="3" fill="${fc}"/><text x="${x+cw/2}" y="${ph+11}" text-anchor="middle" fill="var(--text2)" font-size="7">${t}</text>`;
      }).join('');
      const chartSvg=last.length?`<svg width="${pw}" height="${ph+14}" viewBox="0 0 ${pw} ${ph+14}" style="display:block;margin:0 auto;overflow:visible;">${bars}</svg>`:'<div style="font-size:11px;color:var(--text2);">No timed taps yet</div>';
      const rank=rlRank(avg||999);
      const xp=finalRound>=30?11:finalRound>=20?9:finalRound>=10?7:4;
      setScore(score);
      if(newPB)confetti(50);
      end({
        title:`${rank.em} ${rank.txt}`,emoji:rank.em,
        sub:`Round ${finalRound} · ${avg?avg+'ms avg':'—'}${newPB?' · 🏆 New Best!':''}`,
        value:finalRound,points:xp,starThresh:[10,20,30],
        statsHtml:`<div class="end-stats">
          <div class="row"><span>Best Round</span><span class="val">${Math.max(finalRound,prevBestRound)}${newPB?' 🏆':''}</span></div>
          <div class="row"><span>Avg Reaction Time</span><span class="val">${avg?avg+'ms':'—'}</span></div>
          <div class="row"><span>Fastest Tap</span><span class="val">${fastest!==null?fastest+'ms':'—'}</span></div>
          <div class="row"><span>XP Earned</span><span class="val">+${xp}</span></div>
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:11px;color:var(--text2);text-align:center;margin-bottom:6px;">Last ${last.length} reaction times</div>
          ${chartSvg}
          <div style="text-align:center;font-size:12px;font-weight:700;color:var(--primary);margin-top:6px;">Average: ${avg?avg+'ms':'—'}</div>
        </div>${newPB?'<div class="rec">New Personal Best! 🎉</div>':''}`
      });
    }

    doRound();
  }
}
