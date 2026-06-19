/* ===================== SHARED GAME UTILITIES ===================== */
function sxHeartsHtml(lives,isZen){
  if(isZen)return '<div style="font-size:20px;text-align:center;margin-bottom:4px;">🧘 Zen Mode · No pressure</div>';
  const l=Math.min(lives,3);
  return '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=l?'lost':'')+' '+(l===1&&i===0?'mm-last':'')+'">'+(i>=l?'💔':'❤️')+'</span>').join('')+'</div>';
}
function sxLivesHtml(lives){return sxHeartsHtml(lives,false);}
function sxDailyDone(prefix){return S(prefix+'_daily_date')===todayKey()&&!!S(prefix+'_daily_done');}
function sxSetDailyDone(prefix){setS(prefix+'_daily_date',todayKey());setS(prefix+'_daily_done',true);}
function sxDailyCard(dc,dcDone,label,sub){
  return '<div class="daily-card '+(dcDone?'done':'')+'" style="margin-bottom:16px;"><div style="display:flex;align-items:center;gap:12px;"><div class="dc-ico">'+(dcDone?'✅':'🎯')+'</div><div style="flex:1;"><div class="dc-name">'+label+'</div><div class="dc-sub">'+sub+'</div></div><span class="dc-badge">2x XP</span></div></div>';
}
function sxStatGrid(stats){
  return '<div class="sch-stats">'+stats.map(s=>'<div class="sch-stat"><div class="v">'+s.v+'</div><div class="l">'+s.l+'</div></div>').join('')+'</div>';
}
function sxShowCountdown(wrap,onDone){
  const ov=$('<div class="countdown-overlay"><div class="countdown-num" id="cdNum">3</div><div class="countdown-sub">Get ready…</div></div>');
  wrap.appendChild(ov);
  let n=3;
  const num=ov.querySelector('#cdNum');
  function step(){
    n--;
    if(n>0){num.textContent=n;num.style.animation='none';void num.offsetWidth;num.style.animation='countPop .35s cubic-bezier(.16,1,.3,1)';_st(step,800);}
    else{num.textContent='GO!';num.style.animation='none';void num.offsetWidth;num.style.animation='countPop .4s cubic-bezier(.16,1,.3,1)';playSound('complete');_st(()=>{ov.remove();onDone();},650);}
  }
  _st(step,800);
}