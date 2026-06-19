/* ===================== IQ TEST v3 (completely rebuilt — 15 Qs, 60 pool, fair IQ) ===================== */
const IQ_POOL=[
  /* ---- NUMERICAL (14 questions) ---- */
  {q:'🔢 Series: 2, 4, 8, 16, __ = ?',opts:['24','32','20','28'],ans:1,cat:'numerical',diff:'easy',exp:'×2 har baar: 16×2 = 32'},
  {q:'🔢 Series: 1, 4, 9, 16, 25, __ = ?',opts:['30','36','35','49'],ans:1,cat:'numerical',diff:'easy',exp:'Perfect squares: 6² = 36'},
  {q:'🔢 Series: 3, 6, 11, 18, 27, __ = ?',opts:['36','38','40','35'],ans:1,cat:'numerical',diff:'medium',exp:'Differences +3,+5,+7,+9,+11 → 27+11 = 38'},
  {q:'🔢 Fibonacci: 1, 1, 2, 3, 5, 8, 13, __ = ?',opts:['18','21','20','19'],ans:1,cat:'numerical',diff:'easy',exp:'8+13 = 21 (sum of previous two)'},
  {q:'🔢 Series: 1, 2, 6, 24, 120, __ = ?',opts:['600','720','480','240'],ans:1,cat:'numerical',diff:'hard',exp:'Factorials! 120×6 = 720'},
  {q:'🔢 Series: 100, 50, 25, 12.5, __ = ?',opts:['5','6.25','8','10'],ans:1,cat:'numerical',diff:'medium',exp:'÷2 har baar: 12.5÷2 = 6.25'},
  {q:'🔢 25% of 480 = ?',opts:['96','120','100','112'],ans:1,cat:'numerical',diff:'easy',exp:'480÷4 = 120'},
  {q:'🔢 Ek train 75 km/h se 3 ghante chalti hai. Total doori?',opts:['200km','225km','250km','300km'],ans:1,cat:'numerical',diff:'easy',exp:'75×3 = 225 km'},
  {q:'🔢 Ek kaam 12 aadmi 10 din mein karte hain. 15 aadmi kitne din mein?',opts:['6','7','8','9'],ans:2,cat:'numerical',diff:'hard',exp:'12×10 = 120 man-days; 120÷15 = 8 din'},
  {q:'🔢 Kaunse number ka cube 125 hai?',opts:['3','4','5','6'],ans:2,cat:'numerical',diff:'easy',exp:'5³ = 5×5×5 = 125'},
  {q:'🔢 Ek circular track ka circumference 440m. Diameter kitna? (π=22/7)',opts:['100m','120m','140m','160m'],ans:2,cat:'numerical',diff:'hard',exp:'C=πd → d=440×7/22 = 140m'},
  {q:'🔢 3x + 5 = 20. x = ?',opts:['3','4','5','6'],ans:2,cat:'numerical',diff:'easy',exp:'3x=15 → x=5'},
  {q:'🔢 Series: 5, 10, 20, 40, __ = ?',opts:['60','70','80','90'],ans:2,cat:'numerical',diff:'easy',exp:'×2 each: 40×2 = 80'},
  {q:'🔢 Agar 15% discount hai ₹800 pe, to price?',opts:['₹660','₹680','₹700','₹640'],ans:1,cat:'numerical',diff:'medium',exp:'800×0.15=120; 800-120=₹680'},

  /* ---- LOGIC (12 questions) ---- */
  {q:'🧠 Neha, Priya se 3 saal badi hai. 5 saal baad Priya 20 saal hogi. Abhi Neha ki umar?',opts:['15','16','18','20'],ans:2,cat:'logic',diff:'medium',exp:'Priya abhi=15; Neha=15+3=18'},
  {q:'🧠 3 cats 3 mice 3 minutes mein pakadti hain. 9 mice 9 minutes mein — kitni cats chahiye?',opts:['9','3','6','1'],ans:1,cat:'logic',diff:'medium',exp:'1 cat=1 mouse/3min, so 3 cats kaafi hain'},
  {q:'🧠 Sab roses flowers hain. Kuch flowers jaldi fade ho jaate hain. Isliye:',opts:['Sab roses fade honge','Koi rose fade nahi hoga','Kuch roses fade ho sakti hain','Roses flowers nahi hain'],ans:2,cat:'logic',diff:'hard',exp:'Valid inference: kuch roses fade ho sakti hain'},
  {q:'🧠 Aaj Monday hai. 100 din baad kaunsa day hoga?',opts:['Tuesday','Wednesday','Thursday','Friday'],ans:1,cat:'logic',diff:'medium',exp:'100 = 14×7 + 2; Mon+2 = Wednesday'},
  {q:'🧠 Ek ghadi din mein 4 min fast ho jaati hai. Agar 6:00 AM pe sahi thi, to kaun se real time pe 6:08 AM dikhayegi?',opts:['6:05 AM','6:06 AM','6:07 AM','6:08 AM'],ans:1,cat:'logic',diff:'hard',exp:'4min/1440min×real mins; real time=6:06 AM approx'},
  {q:'🧠 5 logon ki row mein Ram 2nd aur right se 4th hai. Row mein kitne log hain?',opts:['5','6','7','8'],ans:0,cat:'logic',diff:'medium',exp:'Left se 2nd + Right se 4th - 1 = 2+4-1 = 5'},
  {q:'🧠 Agar "PENCIL" ko GDQFLP likhte hain, to "PAPER" ka code?',opts:['SDQHU','SDSHQ','SDSHV','SDQHV'],ans:0,cat:'logic',diff:'hard',exp:'+3 each letter: P+3=S, A+3=D, P+3=S, E+3=H, R+3=U = SDSHU'},
  {q:'🧠 Ek shop mein 40% discount hai. Original price ₹1500. Discounted price?',opts:['₹850','₹900','₹950','₹1050'],ans:1,cat:'logic',diff:'medium',exp:'1500×0.40=600; 1500-600=₹900'},
  {q:'🧠 Ek number ko 5 se multiply karo, phir 8 ghataao, to 42. Number?',opts:['8','9','10','11'],ans:2,cat:'logic',diff:'easy',exp:'5n-8=42 → 5n=50 → n=10'},
  {q:'🧠 24 June ka age se 7 days pehle wala day?',opts:['16 June','17 June','18 June','19 June'],ans:1,cat:'logic',diff:'easy',exp:'24-7=17 June'},
  {q:'🧠 A, B se tez hai. C, A se tez hai. Sabse tez kaun?',opts:['A','B','C','Sab equal'],ans:2,cat:'logic',diff:'easy',exp:'C > A > B; C sabse tez hai'},
  {q:'🧠 2 pipes ek tank bharte hain. Pipe A 6h mein, Pipe B 4h mein. Dono saath mein?',opts:['2h','2.4h','3h','3.6h'],ans:1,cat:'logic',diff:'hard',exp:'1/6+1/4=5/12; 12/5=2.4 hours'},

  /* ---- VERBAL (10 questions) ---- */
  {q:'📚 BOOK : READING :: FORK : ?',opts:['Kitchen','Eating','Spoon','Metal'],ans:1,cat:'verbal',diff:'easy',exp:'Book reading ke liye hai, fork eating ke liye'},
  {q:'📚 HOT : COLD :: DARK : ?',opts:['Night','Black','Light','Moon'],ans:2,cat:'verbal',diff:'easy',exp:'Opposites: hot↔cold, dark↔light'},
  {q:'📚 Odd one out: Apple, Mango, Carrot, Banana',opts:['Apple','Mango','Carrot','Banana'],ans:2,cat:'verbal',diff:'easy',exp:'Carrot ek sabzi hai, baaki fruits'},
  {q:'📚 Odd one out: Violin, Guitar, Flute, Sitar',opts:['Violin','Guitar','Flute','Sitar'],ans:2,cat:'verbal',diff:'medium',exp:'Flute wind instrument hai; baki string instruments'},
  {q:'📚 "Ephemeral" ka matlab?',opts:['Permanent','Very brief','Heavy','Brilliant'],ans:1,cat:'verbal',diff:'hard',exp:'Ephemeral = lasting a very short time (kuch ghante/din)'},
  {q:'📚 "Benevolent" ka matlab?',opts:['Angry','Mean','Kind/Generous','Lazy'],ans:2,cat:'verbal',diff:'medium',exp:'Benevolent = well-meaning, generous, kind'},
  {q:'📚 Agar CIPHER ko reverse karo to?',opts:['REHPIC','REPHIC','RHEPIC','REPIHC'],ans:0,cat:'verbal',diff:'medium',exp:'C-I-P-H-E-R reversed = R-E-H-P-I-C'},
  {q:'📚 PEN : INK :: LAMP : ?',opts:['Switch','Bulb','Light','Electricity'],ans:3,cat:'verbal',diff:'medium',exp:'Pen ink se chalta hai, lamp electricity se'},
  {q:'📚 DOCTOR : HOSPITAL :: TEACHER : ?',opts:['Student','Book','School','Class'],ans:2,cat:'verbal',diff:'easy',exp:'Doctor hospital mein kaam karta, teacher school mein'},
  {q:'📚 "Laconic" ka matlab?',opts:['Talkative','Very brief','Funny','Serious'],ans:1,cat:'verbal',diff:'hard',exp:'Laconic = using very few words, concise'},

  /* ---- PATTERN (12 questions) ---- */
  {q:'🔡 Letter series: A, C, E, G, __ = ?',opts:['H','I','J','K'],ans:1,cat:'pattern',diff:'easy',exp:'+2 skip har baar: G ke baad I'},
  {q:'🔡 Letter series: Z, X, V, T, __ = ?',opts:['P','Q','R','S'],ans:2,cat:'pattern',diff:'medium',exp:'-2 har baar: T ke baad R'},
  {q:'🔡 Series: AZ, BY, CX, __ = ?',opts:['DV','DW','EW','DX'],ans:1,cat:'pattern',diff:'medium',exp:'Aage A→D; Peeche Z→W → DW'},
  {q:'🔡 Pattern: 1A, 2B, 3C, 4D, __ = ?',opts:['5E','5F','6E','4E'],ans:0,cat:'pattern',diff:'easy',exp:'Number +1, letter next → 5E'},
  {q:'🔡 Series: J, F, M, A, M, J, J, __ (months)',opts:['A','S','O','N'],ans:0,cat:'pattern',diff:'medium',exp:'Jan,Feb,Mar,Apr,May,Jun,Jul → August = A'},
  {q:'🔡 Number+letter: 2B, 4D, 6F, 8H, __ = ?',opts:['9I','10I','10J','12J'],ans:2,cat:'pattern',diff:'medium',exp:'+2 number, +2 letter: 8+2=10, H+2=J → 10J'},
  {q:'🔡 Series: 1, 1, 2, 3, 5, 8, 13, 21, __ = ?',opts:['30','34','32','28'],ans:1,cat:'pattern',diff:'medium',exp:'Fibonacci: 13+21 = 34'},
  {q:'🔡 Letter-number: A1, C3, E5, G7, __ = ?',opts:['H8','I8','I9','J10'],ans:2,cat:'pattern',diff:'medium',exp:'+2 letter, +2 number: G+2=I, 7+2=9 → I9'},
  {q:'🔡 Series: ▲□▲▲□□▲▲▲□□□ __ = ?',opts:['▲▲▲▲','□□□□','▲□□□','□▲▲▲'],ans:0,cat:'pattern',diff:'hard',exp:'1,2,3,4 pattern: 4 triangles come next'},
  {q:'🔡 Series: 2, 3, 5, 7, 11, 13, __ = ?',opts:['15','17','14','16'],ans:1,cat:'pattern',diff:'medium',exp:'Prime numbers series: next prime after 13 = 17'},
  {q:'🔡 Series: Monday, Wednesday, Friday, __ = ?',opts:['Saturday','Sunday','Tuesday','Thursday'],ans:1,cat:'pattern',diff:'easy',exp:'Skip 1 day: +2 each time → Sunday'},
  {q:'🔡 Code: if 3→9, 4→16, 5→25, then 7→?',opts:['42','47','49','56'],ans:2,cat:'pattern',diff:'easy',exp:'n² pattern: 7² = 49'},

  /* ---- SPATIAL (12 questions) ---- */
  {q:'📐 Ek square ka perimeter 48cm hai. Area kitna?',opts:['96cm²','128cm²','144cm²','196cm²'],ans:2,cat:'spatial',diff:'medium',exp:'Side=48÷4=12; Area=12²=144cm²'},
  {q:'📐 Ek triangle ke 2 angles 60° aur 75° hain. Teesra angle?',opts:['35°','40°','45°','50°'],ans:2,cat:'spatial',diff:'easy',exp:'180-60-75 = 45°'},
  {q:'📐 Ek cube ke kitne faces hote hain?',opts:['4','6','8','12'],ans:1,cat:'spatial',diff:'easy',exp:'Cube = 6 faces (top, bottom, front, back, left, right)'},
  {q:'📐 Ek cube ke kitne vertices (corners)?',opts:['6','8','10','12'],ans:1,cat:'spatial',diff:'easy',exp:'Cube = 8 corners (vertices)'},
  {q:'📐 Ek rectangle 12×5 ka diagonal kitna?',opts:['11','12','13','14'],ans:2,cat:'spatial',diff:'medium',exp:'√(12²+5²) = √(144+25) = √169 = 13'},
  {q:'📐 Ghadi mein 6:00 baje hour aur minute hand ke beech angle?',opts:['90°','120°','150°','180°'],ans:3,cat:'spatial',diff:'easy',exp:'6:00 pe dono ek doosre ke opposite = 180°'},
  {q:'📐 Ek cylinder ki height 10cm, radius 7cm. Volume? (π=22/7)',opts:['1540cm³','1520cm³','1460cm³','1610cm³'],ans:0,cat:'spatial',diff:'hard',exp:'πr²h = 22/7×49×10 = 1540cm³'},
  {q:'📐 "MAPS" ka mirror image kya hoga?',opts:['SPAM','SPAM','SMAP','MAPS'],ans:1,cat:'spatial',diff:'medium',exp:'Mirror image = reverse: M-A-P-S → S-P-A-M'},
  {q:'📐 Ek kagaz ko 3 baar fold karo. Kitni layers?',opts:['6','8','9','12'],ans:1,cat:'spatial',diff:'medium',exp:'2³ = 8 layers'},
  {q:'📐 Ghadi mein 3:00 baje hour aur minute hand ke beech angle?',opts:['60°','75°','90°','120°'],ans:2,cat:'spatial',diff:'easy',exp:'3:00 pe = 3×30° = 90°'},
  {q:'📐 Ek hexagon ke kitne sides?',opts:['5','6','7','8'],ans:1,cat:'spatial',diff:'easy',exp:'Hexagon = 6 sides (hexa = 6)'},
  {q:'📐 Ek regular octagon ke interior angles ka sum?',opts:['900°','1080°','1260°','720°'],ans:1,cat:'spatial',diff:'hard',exp:'(n-2)×180 = 6×180 = 1080°'},
];
const IQ_CATS={
  logic:{label:'🧠 Logic',color:'#7C3AED'},
  numerical:{label:'🔢 Numerical',color:'#4F8EF7'},
  verbal:{label:'📚 Verbal',color:'#34D399'},
  spatial:{label:'📐 Spatial',color:'#F97316'},
  pattern:{label:'🔡 Pattern',color:'#F472B6'}
};
const IQ_DIFF_W={easy:1,medium:1.8,hard:3.0};
const IQ_TIMER={easy:30000,medium:22000,hard:16000};
const IQ_N=15; // 15 questions per test, from pool of 60

function iqClassify(iq){
  if(iq>=145)return{label:'🌟 Genius',pct:99,color:'#F97316'};
  if(iq>=130)return{label:'⚡ Very Superior',pct:98,color:'#7C3AED'};
  if(iq>=120)return{label:'🏆 Superior',pct:91,color:'#4F8EF7'};
  if(iq>=110)return{label:'🧠 Above Average',pct:75,color:'#34D399'};
  if(iq>=90)return{label:'💪 Average',pct:50,color:'#22C55E'};
  if(iq>=80)return{label:'📈 Below Average',pct:25,color:'#EAB308'};
  return{label:'🌱 Keep Practicing',pct:10,color:'#94A3B8'};
}

function playIQTest(body,setScore,end,wrap,startClock){
  // Shuffle pool and pick balanced 15 Qs (3 easy, 7 medium, 5 hard across categories)
  function buildTestSet(){
    const byDiff={easy:[],medium:[],hard:[]};
    IQ_POOL.forEach(q=>{const d=q.diff||'medium';if(byDiff[d])byDiff[d].push(q);});
    byDiff.easy.sort(()=>Math.random()-.5);
    byDiff.medium.sort(()=>Math.random()-.5);
    byDiff.hard.sort(()=>Math.random()-.5);
    return [...byDiff.easy.slice(0,3),...byDiff.medium.slice(0,7),...byDiff.hard.slice(0,5)].sort(()=>Math.random()-.5);
  }
  const QS=buildTestSet();
  let qi=0,correct=0,weightSum=0,weightGot=0,speedSum=0,speedCount=0,fastest=null;
  const catStats={};
  Object.keys(IQ_CATS).forEach(c=>catStats[c]={got:0,total:0});

  const bestIQ=S('nz_iq_best')||0;

  // ---- Intro screen ----
  const introEl=$(`<div class="iq-intro"></div>`);
  introEl.innerHTML=`
    <div class="iq-intro-hero">
      <div style="font-size:60px;margin-bottom:8px;">🧩</div>
      <h2 style="margin:0 0 8px;">IQ Test</h2>
      <p style="font-size:13px;color:var(--text2);margin:0 0 16px;line-height:1.5;">
        ${IQ_N} questions · Logic · Numerical · Verbal · Spatial · Pattern
      </p>
      ${bestIQ?`<div class="iq-best-chip">🏆 Your Best IQ: ${bestIQ}</div>`:''}
    </div>
    <div class="iq-intro-rules">
      <div class="iq-rule"><span>⏱</span><span>Timer per question (faster = better score)</span></div>
      <div class="iq-rule"><span>🎯</span><span>Hard questions = 3× more IQ points</span></div>
      <div class="iq-rule"><span>💡</span><span>Explanation shown after every answer</span></div>
      <div class="iq-rule"><span>📊</span><span>Category breakdown at the end</span></div>
    </div>
    <div class="iq-cat-preview">
      ${Object.entries(IQ_CATS).map(([,v])=>`<span class="iq-cat-chip-sm" style="background:${v.color}22;color:${v.color};border:1px solid ${v.color}44;">${v.label}</span>`).join('')}
    </div>
    <button class="btn-primary" id="iqStart" style="width:100%;margin-top:20px;padding:16px;font-size:16px;">
      Start Test ▶
    </button>
  `;
  body.appendChild(introEl);

  const host=$(`<div class="iq-host"></div>`);
  body.appendChild(host);

  introEl.querySelector('#iqStart').onclick=()=>{
    introEl.style.animation='fadeOut .2s ease forwards';
    setTimeout(()=>{introEl.remove();startClock&&startClock();showQ();},200);
  };

  function finish(){
    const wAcc=weightSum?weightGot/weightSum:0;
    // Speed factor: how fast relative to timer
    const speedFactor=speedCount?Math.max(0,Math.min(1,1-(speedSum/speedCount))):0.5;
    // IQ formula: base 70, accuracy contributes 0-70 pts, speed contributes 0-20 pts
    let iq=Math.round(70+wAcc*70+speedFactor*20);
    iq=Math.max(60,Math.min(155,iq));
    const cls=iqClassify(iq);
    const prevBest=S('nz_iq_best')||0;
    const newPB=iq>prevBest;
    if(newPB)setS('nz_iq_best',iq);
    setS('nz_iq_games',(S('nz_iq_games')||0)+1);
    setScore(iq);
    if(newPB||iq>=120)confetti(70);

    const catRows=Object.keys(catStats).filter(c=>catStats[c].total>0).map(c=>{
      const st=catStats[c];
      const pctv=Math.round(st.got/st.total*100);
      const col=IQ_CATS[c].color;
      return`<div class="iq-cat-row">
        <span class="iq-cat-name" style="color:${col}">${IQ_CATS[c].label}</span>
        <span class="iq-cat-bar"><span class="iq-cat-fill" style="width:${pctv}%;background:${col}"></span></span>
        <span class="iq-cat-val">${st.got}/${st.total}</span>
      </div>`;
    }).join('');

    const gPct=Math.round((iq-60)/(155-60)*100);
    const circ=Math.round(2*Math.PI*52);
    const gauge=`<div class="iq-gauge">
      <svg width="150" height="150" viewBox="0 0 120 120" style="transform:rotate(-90deg);">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>
        <circle id="iqArc" cx="60" cy="60" r="52" fill="none" stroke="url(#iqG)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/>
        <defs><linearGradient id="iqG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${cls.color}"/>
          <stop offset="1" stop-color="#34D399"/>
        </linearGradient></defs>
      </svg>
      <div class="iq-gauge-inner">
        <div class="iq-gauge-num" id="iqNum">0</div>
        <div class="iq-gauge-lbl">IQ</div>
      </div>
    </div>`;

    end({
      title:cls.label,emoji:'🧩',
      sub:`Top ${100-cls.pct}% · ${correct}/${IQ_N} correct${newPB?' · 🏆 New Best!':''}`,
      value:iq,points:Math.max(3,Math.round((iq-60)*0.35)),starThresh:[90,110,130],
      statsHtml:`
        ${gauge}
        <div class="end-stats">
          <div class="row"><span>Estimated IQ</span><span class="val" style="color:${cls.color};font-weight:800;">${iq}</span></div>
          <div class="row"><span>Classification</span><span class="val">${cls.label}</span></div>
          <div class="row"><span>Percentile</span><span class="val">Top ${100-cls.pct}%</span></div>
          <div class="row"><span>Correct</span><span class="val">${correct}/${IQ_N}</span></div>
          <div class="row"><span>Fastest Answer</span><span class="val">${fastest!=null?(fastest/1000).toFixed(1)+'s':'—'}</span></div>
          <div class="row"><span>Personal Best</span><span class="val">${Math.max(iq,prevBest)}${newPB?' 🏆':''}</span></div>
        </div>
        <div class="iq-cats">
          <div class="iq-cats-title">📊 Category Performance</div>
          ${catRows}
        </div>
        ${newPB?'<div class="rec">🎉 New Best IQ Score!</div>':''}
      `
    });

    _st(()=>{
      const arc=wrap.querySelector('#iqArc');
      const num=wrap.querySelector('#iqNum');
      if(arc){arc.style.transition='stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1)';arc.style.strokeDashoffset=circ*(1-gPct/100);}
      if(num){
        const start=performance.now();
        const tick=t=>{const k=Math.min(1,(t-start)/1600);const e=1-Math.pow(1-k,3);num.textContent=Math.round(iq*e);if(k<1)requestAnimationFrame(tick);};
        requestAnimationFrame(tick);
      }
    },80);
  }

  function showQ(){
    if(qi>=QS.length){finish();return;}
    const {q,opts,ans,diff,exp,cat}=QS[qi];
    const w=IQ_DIFF_W[diff]||1;
    weightSum+=w;
    catStats[cat]=catStats[cat]||{got:0,total:0};
    catStats[cat].total++;

    const timeMs=IQ_TIMER[diff]||20000;
    const diffInfo=diff==='easy'?{label:'🟢 Easy',color:'#22C55E'}:diff==='medium'?{label:'🟡 Medium',color:'#EAB308'}:{label:'🔴 Hard',color:'#EF4444'};
    const catInfo=IQ_CATS[cat]||{label:cat,color:'#888'};

    let barT=null,elapsed=0,answered=false;
    const tsStart=Date.now();

    // Progress dots
    const progressDots=Array.from({length:IQ_N},(_,i)=>{
      if(i<qi)return'<span class="iq-dot iq-dot-done"></span>';
      if(i===qi)return'<span class="iq-dot iq-dot-active"></span>';
      return'<span class="iq-dot"></span>';
    }).join('');

    host.innerHTML=`
      <div class="iq-progress-bar-wrap">
        <div class="iq-progress-bar" style="width:${(qi/IQ_N)*100}%;"></div>
      </div>
      <div class="iq-q-header">
        <span class="iq-diff-tag" style="color:${diffInfo.color};border-color:${diffInfo.color}44;">${diffInfo.label}</span>
        <span class="iq-cat-chip" style="background:${catInfo.color}22;color:${catInfo.color};">${catInfo.label}</span>
        <span class="iq-q-num">Q${qi+1}/${IQ_N}</span>
      </div>
      <div class="iq-dots">${progressDots}</div>
      <div class="timer-bar" style="margin-bottom:14px;"><div class="timer-fill timer-green" id="iqBar" style="width:100%"></div></div>
      <div class="iq-question">${q}</div>
      <div class="iq-opts" id="iqOpts">
        ${opts.map((o,i)=>`<button class="iq-opt" data-i="${i}">
          <span class="iq-opt-letter">${String.fromCharCode(65+i)}</span>
          <span class="iq-opt-text">${o}</span>
        </button>`).join('')}
      </div>
    `;

    function showExp(correct,msg){
      const expEl=document.createElement('div');
      expEl.className=`iq-exp-box ${correct?'iq-exp-correct':'iq-exp-wrong'}`;
      expEl.innerHTML=`
        <div class="iq-exp-icon">${correct?'✅':'❌'}</div>
        <div>
          <div style="font-weight:700;font-size:13px;">${msg}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:3px;">💡 ${exp}</div>
        </div>
      `;
      host.appendChild(expEl);
    }

    barT=_si(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/timeMs*100);
      const bar=wrap.querySelector('#iqBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=timeMs&&!answered){
        _cti(barT);answered=true;
        speedSum+=1;speedCount++;
        host.querySelectorAll('.iq-opt').forEach((b,i)=>{
          if(i===ans)b.classList.add('correct-ans');
          b.disabled=true;
        });
        showExp(false,"⏱ Time's up!");
        playSound('wrong');
        qi++;_st(showQ,2000);
      }
    },100);

    host.querySelectorAll('.iq-opt').forEach(b=>{
      b.onclick=()=>{
        if(answered)return;
        _cti(barT);answered=true;
        const elapsedMs=Date.now()-tsStart;
        speedSum+=Math.min(1,elapsedMs/timeMs);
        speedCount++;
        if(fastest==null||elapsedMs<fastest)fastest=elapsedMs;
        const chosen=+b.dataset.i;
        host.querySelectorAll('.iq-opt').forEach(x=>x.disabled=true);
        if(chosen===ans){
          playSound('correct');haptic(15);
          correct++;weightGot+=w;catStats[cat].got++;setScore(correct);
          b.classList.add('correct-ans');
          showExp(true,'Correct!');
        } else {
          playSound('wrong');haptic([20,40,20]);
          b.classList.add('wrong-ans');
          host.querySelectorAll('.iq-opt').forEach((x,i)=>{if(i===ans)x.classList.add('correct-ans');});
          showExp(false,'Wrong!');
        }
        qi++;_st(showQ,2200);
      };
    });
  }
}
