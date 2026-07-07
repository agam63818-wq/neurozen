/* ===================== WORD CHAIN 2.0 (endless) ===================== */
const WC_WORDS=['Apple','Chair','River','Cloud','Music','Tiger','Bread','Stone','Light','Phone','Dream','Water','House','Paper','Green','Earth','Smile','Train','Dance','Maple','Ocean','Clock','Flame','Brain','Sugar','Grass','Pilot','Queen','Frost','Arrow','Lemon','Storm','Movie','Brush','Radio','Pearl','Eagle','Comet','Prize','Unity','Honey','Cabin','Glove','Torch','Wheat','Coral','Piano','Robin','Maze','Vault','Bloom','Crane','Drift','Ember','Fable','Glide','Harbor','Ivory','Jolly','Kite','Lunar','Meadow','Nectar','Onyx','Plume','Quartz','Ridge','Spark','Tide','Vivid','Whale','Zephyr','Amber','Birch','Cedar','Dune','Falcon','Gravel','Hamlet','Igloo','Jungle','Knot','Lantern','Mirror','Noble','Orbit','Pebble','Quill','Raven','Sunset','Tunnel','Umbra','Viking','Walnut','Xenon','Yarrow','Zenith','Acorn','Blossom','Cactus','Fossil','Garnet','Heron','Jasper','Lapis','Mango','Nebula','Prism','Ripple','Sandal','Tundra','Velvet','Willow','Beacon','Cipher','Dagger','Elixir','Forage','Grotto','Impact','Jigsaw','Kernel','Luster','Mantle','Oasis','Paddle','Quarry','Rustle','Shrine','Talon','Vessel','Wander','Apex','Bronze','Canopy','Debris','Epoch','Flint','Glacier','Hollow','Ingot','Jewel','Locket','Mortar','Nomad','Ochre','Relic','Solace','Trophy','Vigil','Wraith','Blaze','Cobalt','Drake','Forge','Glyph','Helix','Joust','Lynx','Mirth','Nadir','Olive','Pixel','Resin','Scout','Ultra','Vapor','Weave','Exile','Abyss','Brink','Crisp','Delve','Fetch','Guise','Haste','Lyric','Mural','Niche','Optic','Prose','Realm','Stave','Trove','Unify','Verge','Wrath','Crest','Bluff','Shrine','Flame','Frost','Storm','Stone','Pearl','Cedar','Comet'];
function playNeuralChain(body,setScore,end,wrap,startClock){
  const FLASH_COLORS=['#7C3AED','#4F8EF7','#34D399'];
  const record=LS.get('nz_wordchain_record',0);
  let round=0,lives=3,totalScore=0,longest=0,mistakes=0;
  let activeTimersWC=[];
  wrap.addEventListener('remove_game', ()=>{activeTimersWC.forEach(t=>clearTimeout(t));activeTimersWC=[];});
  const instrEl=$(`<div class="ss-start wc3-start">
    <div class="wc3-hero">
      <div class="wc3-demo" id="wc3Demo"></div>
      <h1 class="wc3-hero-title">Word Chain</h1>
      <div class="wc3-hero-tag">Memory · Sequencing</div>
      <p class="wc3-hero-quote">Remember the <span>order.</span></p>
      <p class="wc3-hero-sub">Words flash one by one. Recall them in the exact sequence.</p>
    </div>

    <div class="wc3-statgrid">
      <div class="wc3-sg"><div class="v">${record}</div><div class="l">Best Chain</div></div>
      <div class="wc3-sg"><div class="v">${LS.get('nz_wc_games',0)}</div><div class="l">Games</div></div>
      <div class="wc3-sg"><div class="v">${LS.get('nz_wc_total',0)}</div><div class="l">Total Words</div></div>
    </div>

    <div class="wc3-rules">
      <div class="wc3-rule"><span class="wc3-rk">👀</span><div><strong>Watch each flash</strong><small>Words appear one after another</small></div></div>
      <div class="wc3-rule"><span class="wc3-rk">🔗</span><div><strong>Recall in order</strong><small>Chain grows every round</small></div></div>
      <div class="wc3-rule"><span class="wc3-rk">👻</span><div><strong>Beware the distractor</strong><small>From chain 5+ · Speed mode from 6+</small></div></div>
    </div>

    <button class="btn-primary wc3-start-btn" id="wcStart">
      <span>Start Chain</span>
      <span class="wc3-arrow">→</span>
    </button>
  </div>`);
  body.appendChild(instrEl);

  /* ---------- START-SCREEN ANIMATED DEMO ---------- */
  (function wc3Demo(){
    const demo = instrEl.querySelector('#wc3Demo');
    if (!demo) return;
    const demoWords = [
      ['MAPLE','RIVER','CLOUD'],
      ['TIGER','FLAME','OCEAN'],
      ['STORM','QUARTZ','EMBER'],
      ['PIANO','WILLOW','NECTAR'],
      ['CRANE','ORBIT','LUNAR'],
    ];
    const COLORS = ['#7C3AED','#4F8EF7','#34D399'];
    let alive = true;
    let round = 0;
    demo.innerHTML = `
      <div class="wc3-demo-flash" id="wc3DemoFlash"></div>
      <div class="wc3-demo-slots" id="wc3DemoSlots"></div>`;
    const flashEl = demo.querySelector('#wc3DemoFlash');
    const slotsEl = demo.querySelector('#wc3DemoSlots');
    function loop(){
      if (!alive || !document.body.contains(instrEl)) return;
      const words = demoWords[round % demoWords.length];
      round++;
      slotsEl.innerHTML = words.map((w,i)=>`<span class="wc3-demo-slot" data-i="${i}">${w}</span>`).join('<span class="wc3-demo-arrow">→</span>');
      const slots = [...slotsEl.querySelectorAll('.wc3-demo-slot')];
      slots.forEach(s => s.classList.remove('flashed','recalled'));
      /* Phase 1: flash each word */
      let i = 0;
      function flashNext(){
        if (!alive) return;
        if (i >= words.length) { setTimeout(recallPhase, 350); return; }
        flashEl.textContent = words[i];
        flashEl.style.color = COLORS[i % COLORS.length];
        flashEl.className = 'wc3-demo-flash show';
        slots[i].classList.add('flashed');
        const t1 = setTimeout(()=>{ if (!alive) return; flashEl.className = 'wc3-demo-flash'; }, 380);
        i++;
        const t2 = setTimeout(flashNext, 520);
        activeTimersWC.push(t1,t2);
      }
      function recallPhase(){
        if (!alive) return;
        flashEl.textContent = '?';
        flashEl.style.color = 'var(--primary)';
        flashEl.className = 'wc3-demo-flash show recall';
        let j = 0;
        function recallOne(){
          if (!alive) return;
          if (j >= words.length) { setTimeout(loop, 700); return; }
          slots[j].classList.add('recalled');
          j++;
          const t = setTimeout(recallOne, 300);
          activeTimersWC.push(t);
        }
        recallOne();
      }
      flashNext();
    }
    loop();
    instrEl._stopDemo = () => { alive = false; };
  })();

  const host=$(`<div></div>`);
  body.appendChild(host);
  function hudHtml(extra){
    const len=3+round;
    return `<div class="wc-hearts">${[0,1,2].map(i=>`<span class="wc-heart ${i>=lives?'lost':''} ${(lives===1&&i===0)?'mm-last':''}" id="wcH${i}">${i>=lives?'💔':'❤️'}</span>`).join('')}</div>
    <div class="mm-roundrow"><span>Chain <strong>${len}</strong></span><span>Best <strong>${Math.max(record,longest)}</strong></span></div>
    ${extra||''}`;
  }
  function startRound(){
    const len=3+round;
    const speed=len>=6;
    const flashMs=speed?Math.max(420,600-(len-6)*30):800;
    const pool=[...WC_WORDS].sort(()=>Math.random()-.5);
    const chain=pool.slice(0,len);
    const distractor=len>=5?pool[len]:null;
    let idx=0;
    function flashWord(){
      const color=FLASH_COLORS[idx%3];
      host.innerHTML=hudHtml(`<div style="text-align:center;font-size:12px;color:var(--text2);margin-bottom:8px;">Chain ${len} — Word ${idx+1}/${len}${speed?' · ⚡ SPEED MODE':''}</div>`)+
        `<div class="wc-flash" style="background:${color};">${chain[idx]}</div>`;
      idx++;
      if(idx<len)_st(flashWord,flashMs);
      else _st(()=>showRecall(),flashMs);
    }
    function showRecall(){
      let opts=[...chain];
      if(distractor)opts.push(distractor);
      opts.sort(()=>Math.random()-.5);
      let tapped=0;
      host.innerHTML=hudHtml()+`
        <div style="text-align:center;font-size:13px;color:var(--text2);margin-bottom:8px;">Sahi order mein tap karo!${distractor?' <span style="color:#F97316;font-weight:700;">(1 distractor hai 👻)</span>':''}</div>
        <div style="min-height:44px;background:var(--card);border-radius:14px;padding:10px;margin-bottom:14px;box-shadow:var(--shadow);font-size:13px;font-weight:600;color:var(--primary);text-align:center;" id="wcSlots">
          ${chain.map((_,i)=>`<span id="wcSlot${i}" style="opacity:.3;">____</span>`).join(' → ')}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;" id="wcBtns">
          ${opts.map(w=>`<button class="wc-btn" data-w="${w}" style="padding:12px 18px;min-height:44px;background:var(--card);border-radius:12px;font-weight:600;font-size:14px;box-shadow:var(--shadow);border:2px solid var(--border);">${w}</button>`).join('')}
        </div>`;
      host.querySelectorAll('.wc-btn').forEach(btn=>{
        btn.onclick=()=>{
          if(btn.disabled)return;
          const w=btn.dataset.w;
          if(w===chain[tapped]){
            playSound('correct');
            btn.disabled=true;btn.style.opacity='.35';
            const slot=host.querySelector('#wcSlot'+tapped);
            if(slot){slot.textContent=w;slot.style.opacity='1';slot.style.color='#34D399';}
            tapped++;
            if(tapped>=len)roundComplete(len);
          } else {
            mistakes++;
            playSound('wrong');haptic([30,50,30]);
            btn.style.background='#F87171';btn.style.color='#fff';
            host.querySelectorAll('.wc-btn').forEach(b=>b.disabled=true);
            loseLife();
          }
        };
      });
    }
    flashWord();
  }
  function roundComplete(len){
    totalScore+=len;if(len>longest)longest=len;
    setScore(totalScore);
    showCombo('CHAIN COMPLETE! 🔗');
    playSound('complete');
    host.innerHTML=hudHtml()+`
      <div style="text-align:center;padding:24px 0;">
        <div style="display:inline-block;background:var(--grad);color:#fff;padding:14px 26px;border-radius:50px;font-weight:800;font-size:18px;box-shadow:var(--shadow-lg);animation:popIn .4s ease;">🔗 ${len}-WORD CHAIN · +${len}pts</div>
      </div>`;
    round++;
    _st(()=>startRound(),1300);
  }
  function loseLife(){
    lives--;
    showCombo('CHAIN BROKEN! 💔');
    const h=host.querySelector('#wcH'+lives);
    if(h){h.textContent='💔';h.classList.add('crack','lost');}
    if(lives<=0){_st(()=>finish(),1200);return;}
    _st(()=>startRound(),1400);
  }
  function finish(){
    const perfect=mistakes===0;
    let chainPts=totalScore;
    if(perfect)chainPts*=2;
    const livesBonus=lives*5;
    const final=chainPts+livesBonus;
    setScore(final);
    const newRec=longest>record;
    if(newRec)LS.set('nz_wordchain_record',longest);
    LS.set('nz_wc_games',(LS.get('nz_wc_games',0)||0)+1);
    LS.set('nz_wc_total',(LS.get('nz_wc_total',0)||0)+longest);
    if(newRec)confetti(50);
    end({
      title:newRec?'New Record! 🏆':(lives>0?'Chain Master! 🔗':'Chain Over! 💔'),
      emoji:'🔗',
      sub:`Longest chain: ${longest} words${perfect?' · ✨ PERFECT x2':''}`,
      value:final,points:final>=60?45:final>=40?30:final>=20?18:8,starThresh:[20,40,60],
      statsHtml:`<div class="end-stats">
        <div class="row"><span>Longest Chain</span><span class="val">${longest} words</span></div>
        <div class="row"><span>Chain Points${perfect?' (x2 perfect)':''}</span><span class="val">${chainPts}</span></div>
        <div class="row"><span>Lives Bonus</span><span class="val">+${livesBonus} (${lives} ❤️)</span></div>
        <div class="row"><span>Total Score</span><span class="val">${final}</span></div>
        <div class="row"><span>Personal Best</span><span class="val">${Math.max(longest,record)}${newRec?' 🏆':''}</span></div>
      </div>${newRec?'<div class="rec">New Personal Record! 🎉</div>':''}`
    });
  }
  instrEl.querySelector('#wcStart').onclick=()=>{if(instrEl._stopDemo)instrEl._stopDemo();activeTimersWC.forEach(t=>clearTimeout(t));instrEl.remove();startClock&&startClock();startRound();};
}
