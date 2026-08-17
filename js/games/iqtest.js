/* ============================================================================
 *  IQ TEST v6 — Bilingual Adaptive Cognitive Assessment (NeuroZen)
 *  ---------------------------------------------------------------------------
 *  Entry (unchanged host contract): playIQTest(body, setScore, end, wrap, startClock)
 *  Host globals used (do NOT redefine): $, S, setS, playSound, toast, confetti,
 *    _si, _cti, _st, todayKey, haptic
 *  localStorage keys (extended, never renamed):
 *    nz_iq_best, nz_iq_games, nz_iq_profile, nz_iq_onboard, nz_iq_cbsafe,
 *    nz_iq_lang (new), nz_iq_seed (new), nz_iq_traps (new)
 *  CSS prefixes: .iq5-  /  .iq-svg-   (styles live in css/style.css)
 *
 *  v6 rebuild:
 *   - Bilingual (Hinglish / English). EVERY player-facing string comes from a
 *     lookup; questions carry {hi,en} for every text field and a dev assertion
 *     fails loudly if one side is missing.
 *   - ~100-item question bank, procedurally generated from seeded families, so
 *     the underlying rule stays fixed while the numbers/shapes change. 25 items
 *     are sampled per run, stratified across 4 categories.
 *   - CAT-style adaptive difficulty: 2 right in a row steps up a band, 1 wrong
 *     steps down; never more than one band at a time; category rotation stays
 *     balanced while adapting.
 *   - Smart distractors: every wrong option encodes a named mistake
 *     (near-miss / reverse / off-by-one / surface / over) and the report card
 *     tells the player which trap they fall for.
 *   - Scoring: difficulty-weighted raw score with a guessing correction and a
 *     capped speed bonus, mapped through a normal(100,15) curve, clamped 70-145.
 *   - Post-game: review mode over every miss + per-category cognitive report.
 * ============================================================================ */

/* ---------- Legacy exports kept for compatibility with app.js -------------- */
const IQ_POOL = [];               /* deliberately empty: engine is generated */
const IQ_CATS = {
  pattern : { color:'#7C3AED', icon:'🧩' },
  spatial : { color:'#F97316', icon:'📐' },
  numeric : { color:'#4F8EF7', icon:'🔢' },
  verbal  : { color:'#06B6D4', icon:'🔤' },
  /* legacy aliases so old consumers don't explode */
  logic   : { color:'#4F8EF7', icon:'🔢' },
  memory  : { color:'#06B6D4', icon:'🔤' },
  speed   : { color:'#EAB308', icon:'⚡' }
};
const IQ_CAT_KEYS = ['pattern','spatial','numeric','verbal'];
const IQ_DIFF_W = { 1:1, 2:2, 3:3, 4:4, 5:5, easy:1, medium:3, hard:5 };
const IQ_TIMER  = { 1:16000, 2:18000, 3:20000, 4:22000, 5:25000 };
const IQ_N      = 25;                     /* items shown per run */
const IQ_BANDS  = { min:1, max:5 };
const IQ_TRAPS  = ['near-miss','reverse','off-by-one','surface','over'];

/* ============================================================================
 *  SECTION 0 — SMALL MATH / RNG HELPERS
 * ========================================================================== */

function IQ_clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }

/* Deterministic PRNG (mulberry32) so a run can be replayed from a seed. */
function IQ_rng(seed){
  let a = (seed >>> 0) || 1;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function IQ_rint(rng, lo, hi){ return lo + Math.floor(rng()*(hi-lo+1)); }
function IQ_rpick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
function IQ_rshuffle(rng, arr){
  const x=arr.slice();
  for(let i=x.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; }
  return x;
}
/* Non-seeded conveniences (kept: older code referenced them). */
function IQ_rand(n){ return Math.floor(Math.random()*n); }
function IQ_pick(a){ return a[IQ_rand(a.length)]; }
function IQ_shuffle(a){
  const x=a.slice();
  for(let i=x.length-1;i>0;i--){ const j=IQ_rand(i+1); [x[i],x[j]]=[x[j],x[i]]; }
  return x;
}

/* Standard normal CDF (Abramowitz-Stegun 26.2.17). */
function IQ_normCdf(z){
  const t=1/(1+0.2316419*Math.abs(z));
  const d=0.3989423*Math.exp(-z*z/2);
  const p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
  return z>0 ? 1-p : p;
}
function IQ_bellCurvePctile(iq){
  return IQ_clamp(Math.round(IQ_normCdf((iq-100)/15)*100), 1, 99);
}

function iqClassify(iq){
  if(iq>=140) return { key:'genius',   pct:99, color:'#F97316' };
  if(iq>=130) return { key:'verysup',  pct:98, color:'#7C3AED' };
  if(iq>=120) return { key:'superior', pct:91, color:'#4F8EF7' };
  if(iq>=110) return { key:'above',    pct:75, color:'#34D399' };
  if(iq>=90)  return { key:'average',  pct:50, color:'#22C55E' };
  if(iq>=80)  return { key:'below',    pct:25, color:'#EAB308' };
  return       { key:'practice',       pct:10, color:'#94A3B8' };
}

/* ============================================================================
 *  SECTION 1 — i18n LAYER
 *  ---------------------------------------------------------------------------
 *  Every player-facing string lives here. Hinglish is written the way people
 *  actually speak it (Roman script), not translated English.
 * ========================================================================== */

const IQ_LANGS = ['hi','en'];
const IQ_LANG_DEFAULT = 'hi';           /* Hinglish by default, per spec */

/* {hi,en} constructor. IQ_L('42') → language-neutral text on both sides. */
function IQ_L(hi, en){ return { hi:hi, en:(en===undefined ? hi : en) }; }

function IQ_lang(){
  try{
    const v = S('nz_iq_lang');
    return IQ_LANGS.indexOf(v)>=0 ? v : IQ_LANG_DEFAULT;
  }catch(e){ return IQ_LANG_DEFAULT; }
}
function IQ_setLang(l){
  const v = IQ_LANGS.indexOf(l)>=0 ? l : IQ_LANG_DEFAULT;
  try{ setS('nz_iq_lang', v); }catch(e){}
  return v;
}
/* Resolve a {hi,en} node (or a plain string, tolerated for safety). */
function IQ_tx(node, lang){
  const l = lang || IQ_lang();
  if(node == null) return '';
  if(typeof node === 'string') return node;
  return node[l] != null ? node[l] : (node.en != null ? node.en : node.hi || '');
}

const IQ_UI = {
  /* --- start screen --- */
  'start.title'      : IQ_L('Cognitive Assessment','Cognitive Assessment'),
  'start.sub'        : IQ_L('25 sawaal · adaptive difficulty · bilingual','25 questions · adaptive difficulty · bilingual'),
  'start.langLabel'  : IQ_L('Language / भाषा','Language / भाषा'),
  'start.hinglish'   : IQ_L('Hinglish','Hinglish'),
  'start.english'    : IQ_L('English','English'),
  'start.best'       : IQ_L('Aapka best IQ','Your best IQ'),
  'start.c1t'        : IQ_L('Zyada tar visual','Mostly visual'),
  'start.c1b'        : IQ_L('Chhupa hua rule dhoondho — vocab ya formula ki zaroorat nahi.','Find the hidden rule — no vocabulary, no formulas.'),
  'start.c2t'        : IQ_L('Adaptive difficulty','Adaptive difficulty'),
  'start.c2b'        : IQ_L('Sahi jawab = agla sawaal mushkil. Galat = thoda aasan.','Right answers push the difficulty up, a miss brings it back down.'),
  'start.c3t'        : IQ_L('1 free skip','1 free skip'),
  'start.c3b'        : IQ_L('Atak gaye? Ek baar skip karo — thode points katenge.','Stuck? Skip once — it costs a few points.'),
  'start.cb'         : IQ_L('Colorblind-safe colours','Colorblind-safe palette'),
  'start.go'         : IQ_L('Test shuru karo ▶','Begin Assessment ▶'),
  'start.skipIntro'  : IQ_L('Intro skip karo','Skip intro'),

  /* --- HUD --- */
  'hud.q'            : IQ_L('Sawaal','Q'),
  'hud.of'           : IQ_L('/','/'),
  'hud.band'         : IQ_L('Level','Level'),
  'hud.skip'         : IQ_L('Skip','Skip'),
  'hud.left'         : IQ_L('bacha','left'),
  'hud.target'       : IQ_L('Diya gaya','Target'),
  'hud.memorize'     : IQ_L('Yaad karo','Memorize this'),

  /* --- feedback --- */
  'fx.correct'       : IQ_L('Sahi','Correct'),
  'fx.wrong'         : IQ_L('Galat','Not quite'),
  'fx.timeup'        : IQ_L('Time khatam','Time up'),
  'fx.skipped'       : IQ_L('Skip kiya','Skipped'),
  'fx.pts'           : IQ_L('pts','pts'),
  'fx.tap'           : IQ_L('aage badhne ke liye tap karo ▶','tap to continue ▶'),

  /* --- difficulty bands --- */
  'diff.1'           : IQ_L('Aasan','Easy'),
  'diff.2'           : IQ_L('Saral','Simple'),
  'diff.3'           : IQ_L('Medium','Medium'),
  'diff.4'           : IQ_L('Mushkil','Hard'),
  'diff.5'           : IQ_L('Expert','Expert'),

  /* --- categories --- */
  'cat.pattern'      : IQ_L('🧩 Pattern','🧩 Pattern'),
  'cat.spatial'      : IQ_L('📐 Spatial','📐 Spatial'),
  'cat.numeric'      : IQ_L('🔢 Number & Logic','🔢 Numerical Logic'),
  'cat.verbal'       : IQ_L('🔤 Verbal & Memory','🔤 Verbal / Memory'),
  'cat.short.pattern': IQ_L('Pattern','Pattern Logic'),
  'cat.short.spatial': IQ_L('Spatial','Spatial'),
  'cat.short.numeric': IQ_L('Number','Numerical'),
  'cat.short.verbal' : IQ_L('Verbal','Verbal/Memory'),

  /* --- traps --- */
  'trap.near-miss'   : IQ_L('Aakhri step chhoot gaya','Near-miss'),
  'trap.near-miss.d' : IQ_L('Rule sahi pakda, par aakhri step lagana bhool gaye.','You had the rule but dropped the final step.'),
  'trap.reverse'     : IQ_L('Ulti direction','Reverse'),
  'trap.reverse.d'   : IQ_L('Sahi transformation, par ulti direction mein lagayi.','Right transformation, wrong direction.'),
  'trap.off-by-one'  : IQ_L('Ek se chook','Off-by-one'),
  'trap.off-by-one.d': IQ_L('Rule sahi tha, ginti/hisaab mein 1 ka farak reh gaya.','The rule was right; the arithmetic slipped by one.'),
  'trap.surface'     : IQ_L('Dekhne mein milta-julta','Surface match'),
  'trap.surface.d'   : IQ_L('Dikhne mein similar tha, par rule follow nahi karta.','It looked similar but broke the rule.'),
  'trap.over'        : IQ_L('Ek step zyada','Over-application'),
  'trap.over.d'      : IQ_L('Rule ek step zyada laga diya.','You applied the rule one step too many.'),

  /* --- result screen --- */
  'res.title'        : IQ_L('🧠 Cognitive Report Card','🧠 Cognitive Report Card'),
  'res.iq'           : IQ_L('Estimated IQ','Estimated IQ'),
  'res.iqlabel'      : IQ_L('IQ SCORE','IQ SCORE'),
  'res.better'       : IQ_L('Lagbhag <b>{p}%</b> players se behtar','Better than approximately <b>{p}%</b> of players'),
  'res.breakdown'    : IQ_L('📊 Category-wise Score','📊 Category Breakdown'),
  'res.accuracy'     : IQ_L('Accuracy','Accuracy'),
  'res.correct'      : IQ_L('Sahi jawab','Correct'),
  'res.avgtime'      : IQ_L('Average time / sawaal','Avg time / question'),
  'res.band'         : IQ_L('Highest level pahuncha','Difficulty band reached'),
  'res.streak'       : IQ_L('Best streak','Best streak'),
  'res.pb'           : IQ_L('Personal best','Personal best'),
  'res.trap'         : IQ_L('Sabse common galti','Most common trap'),
  'res.trapnone'     : IQ_L('Koi pattern nahi — galtiyan random thi (ya thi hi nahi 👌)','No clear pattern — your misses were scattered (or there were none 👌)'),
  'res.strong'       : IQ_L('Sabse strong','Strongest'),
  'res.weak'         : IQ_L('Yahan practice karo','Train more'),
  'res.review'       : IQ_L('🔍 Galtiyan dekho ({n})','🔍 Review mistakes ({n})'),
  'res.noreview'     : IQ_L('🎉 Ek bhi galti nahi — review ki zaroorat hi nahi!','🎉 A clean sheet — nothing to review!'),
  'res.share'        : IQ_L('📤 Result share karo','📤 Share Result'),
  'res.caveat'       : IQ_L('⚠️ Ye ek fun estimate hai, clinical IQ test nahi. Score sirf brain-training ke liye hai — isse academic ya professional faisle mat lena.','⚠️ This is a fun estimate, not a clinical IQ test. Use it for brain training only — never for academic or professional decisions.'),
  'res.confidence'   : IQ_L('Confidence: {c} · {n} sawaalon par based (±{e} points)','Confidence: {c} · based on {n} items (±{e} points)'),
  'res.conf.low'     : IQ_L('kam','low'),
  'res.conf.med'     : IQ_L('theek-thaak','moderate'),
  'res.conf.high'    : IQ_L('achhi','good'),

  /* --- verdict labels --- */
  'cls.genius'       : IQ_L('🌟 Genius Level','🌟 Genius Level'),
  'cls.verysup'      : IQ_L('⚡ Bahut Superior','⚡ Very Superior'),
  'cls.superior'     : IQ_L('🏆 Superior','🏆 Superior'),
  'cls.above'        : IQ_L('🧠 Average se upar','🧠 Above Average'),
  'cls.average'      : IQ_L('💪 Average','💪 Average'),
  'cls.below'        : IQ_L('📈 Average se neeche','📈 Below Average'),
  'cls.practice'     : IQ_L('🌱 Practice jaari rakho','🌱 Keep Practicing'),

  /* --- review mode --- */
  'rev.title'        : IQ_L('Galtiyon ka review','Review your mistakes'),
  'rev.of'           : IQ_L('{i} / {n}','{i} / {n}'),
  'rev.your'         : IQ_L('Aapka jawab','Your answer'),
  'rev.correct'      : IQ_L('Sahi jawab','Correct answer'),
  'rev.why'          : IQ_L('Kyun','Why'),
  'rev.trap'         : IQ_L('Trap','Trap'),
  'rev.none'         : IQ_L('Aapne kuch skip/timeout kiya tha','You skipped or ran out of time'),
  'rev.prev'         : IQ_L('◀ Pichla','◀ Prev'),
  'rev.next'         : IQ_L('Agla ▶','Next ▶'),
  'rev.close'        : IQ_L('Band karo','Close'),

  /* --- tips --- */
  'tip.pattern'      : IQ_L('Roz 5 Raven-style matrices karo — pehle count, phir rotation, phir shading check karo.','Do a few Raven-style matrices daily — check count first, then rotation, then shading.'),
  'tip.spatial'      : IQ_L('Mental rotation aur paper-fold puzzles khelo; shape ko mann mein ghumane ki aadat daalo.','Practise mental rotation and paper-folding — get used to turning shapes in your head.'),
  'tip.numeric'      : IQ_L('Series mein pehle differences likho, phir differences ke differences. Zyadatar rule wahin milta hai.','Write the differences first, then the differences of those. Most series rules hide there.'),
  'tip.verbal'       : IQ_L('Odd-one-out mein obvious attribute chhodo — chhupa hua attribute dhoondho.','On odd-one-out, skip the obvious attribute and hunt for the hidden one.'),
  'tip.strength'     : IQ_L('💪 Aapki strength: {c}. Isi ko lead banao.','💪 Your strength: {c}. Lean on it.'),
  'tip.train'        : IQ_L('🎯 Yahan practice karo · {c}: {t}','🎯 Train more · {c}: {t}'),
  'tip.trap'         : IQ_L('🪤 Aap zyadatar "{t}" trap mein fanste ho — {d}','🪤 You mostly fall for the "{t}" trap — {d}')
};

function IQ_t(key, lang, vars){
  const node = IQ_UI[key];
  let s = node ? IQ_tx(node, lang) : key;
  if(vars){ Object.keys(vars).forEach(k=>{ s = s.split('{'+k+'}').join(vars[k]); }); }
  return s;
}

/* ============================================================================
 *  SECTION 2 — SVG TOOLKIT
 *  ---------------------------------------------------------------------------
 *  Every visual is generated from a small data payload. Each <svg> carries an
 *  explicit width/height AND a viewBox, so it always has a definite size to
 *  resolve against (this is the root-cause fix for the blank option tile).
 * ========================================================================== */

function IQ_palette(){
  try{
    const cs=getComputedStyle(document.documentElement);
    let cb=false; try{ cb=!!S('nz_iq_cbsafe'); }catch(e){}
    return {
      ink   : (cs.getPropertyValue('--text')  ||'#0F172A').trim() || '#0F172A',
      muted : (cs.getPropertyValue('--text2') ||'#64748B').trim() || '#64748B',
      line  : (cs.getPropertyValue('--border')||'#E5E7EB').trim() || '#E5E7EB',
      surf  : (cs.getPropertyValue('--card')  ||'#FFFFFF').trim() || '#FFFFFF',
      prim  : (cs.getPropertyValue('--primary')||'#7C3AED').trim()|| '#7C3AED',
      accent: '#4F8EF7',
      good  : cb ? '#2563EB' : '#22C55E',
      bad   : cb ? '#EA580C' : '#EF4444',
      warn  : '#F59E0B',
      cb    : cb
    };
  }catch(e){
    return { ink:'#0F172A', muted:'#64748B', line:'#E5E7EB', surf:'#FFFFFF',
             prim:'#7C3AED', accent:'#4F8EF7', good:'#22C55E', bad:'#EF4444',
             warn:'#F59E0B', cb:false };
  }
}

/* Open an <svg> with BOTH a viewBox and explicit width/height attributes. */
function IQ_svgOpen(w, h, cls){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" '+
         'width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet" '+
         'role="img" class="iq-svg '+cls+'">';
}

/* One primitive shape centred at (cx,cy) inside a bbox of size `sz`.
 * spec: { kind, fill?, stroke?, sw?, rot?, size?, mirror? }
 * `mirror:true` is handled HERE, inside the SVG transform (scale(-1,1)) —
 * never with a CSS-transformed wrapper div, which used to collapse to 0px. */
function IQ_shape(spec, cx, cy, sz){
  const p=IQ_palette();
  const stroke = spec.stroke || p.ink;
  const fill   = spec.fill   || 'none';
  const sw     = spec.sw != null ? spec.sw : 2;
  const rot    = spec.rot || 0;
  const flip   = spec.mirror ? ' scale(-1,1)' : '';
  const s      = (spec.size!=null ? spec.size : 1) * sz * 0.42;
  const g = '<g transform="translate('+cx+' '+cy+') rotate('+rot+')'+flip+'">';
  const attrs = 'fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linejoin="round" stroke-linecap="round"';
  const line = (x1,y1,x2,y2)=> '<path d="M '+x1+' '+y1+' L '+x2+' '+y2+'" fill="none" stroke="'+stroke+'" stroke-width="'+(sw*1.3)+'" stroke-linecap="round"/>';
  let body='';
  switch(spec.kind){
    case 'circle':      body='<circle cx="0" cy="0" r="'+s+'" '+attrs+'/>'; break;
    case 'ring':        body='<circle cx="0" cy="0" r="'+s+'" fill="none" stroke="'+stroke+'" stroke-width="'+sw+'"/>'; break;
    case 'dot':         body='<circle cx="0" cy="0" r="'+(s*0.35)+'" fill="'+stroke+'" stroke="none"/>'; break;
    case 'square':      body='<rect x="'+(-s)+'" y="'+(-s)+'" width="'+(s*2)+'" height="'+(s*2)+'" '+attrs+'/>'; break;
    case 'diamond':     body='<polygon points="0,'+(-s)+' '+s+',0 0,'+s+' '+(-s)+',0" '+attrs+'/>'; break;
    case 'triangle':    body='<polygon points="0,'+(-s)+' '+(s*0.92)+','+(s*0.72)+' '+(-s*0.92)+','+(s*0.72)+'" '+attrs+'/>'; break;
    case 'tri-down':    body='<polygon points="0,'+s+' '+(s*0.92)+','+(-s*0.72)+' '+(-s*0.92)+','+(-s*0.72)+'" '+attrs+'/>'; break;
    case 'hex': {
      const pts=[];for(let i=0;i<6;i++){const a=(Math.PI/3)*i-Math.PI/2;pts.push((Math.cos(a)*s).toFixed(2)+','+(Math.sin(a)*s).toFixed(2));}
      body='<polygon points="'+pts.join(' ')+'" '+attrs+'/>'; break;
    }
    case 'star': {
      const pts=[];for(let i=0;i<10;i++){const a=(Math.PI/5)*i-Math.PI/2;const r=(i%2)?s*0.45:s;pts.push((Math.cos(a)*r).toFixed(2)+','+(Math.sin(a)*r).toFixed(2));}
      body='<polygon points="'+pts.join(' ')+'" '+attrs+'/>'; break;
    }
    case 'cross':       body='<path d="M '+(-s)+' 0 L '+s+' 0 M 0 '+(-s)+' L 0 '+s+'" fill="none" stroke="'+stroke+'" stroke-width="'+(sw*1.4)+'" stroke-linecap="round"/>'; break;
    case 'arrow':       body='<path d="M '+(-s)+' 0 L '+(s*0.7)+' 0 M '+(s*0.7)+' 0 L '+(s*0.2)+' '+(-s*0.5)+' M '+(s*0.7)+' 0 L '+(s*0.2)+' '+(s*0.5)+'" fill="none" stroke="'+stroke+'" stroke-width="'+(sw*1.4)+'" stroke-linecap="round" stroke-linejoin="round"/>'; break;
    case 'halfcircle':  body='<path d="M '+(-s)+' 0 A '+s+' '+s+' 0 0 1 '+s+' 0 Z" '+attrs+'/>'; break;
    case 'plus':        body='<path d="M '+(-s*0.35)+' '+(-s)+' h '+(s*0.7)+' v '+(s*0.65)+' h '+(s*0.65)+' v '+(s*0.7)+' h '+(-s*0.65)+' v '+(s*0.65)+' h '+(-s*0.7)+' v '+(-s*0.65)+' h '+(-s*0.65)+' v '+(-s*0.7)+' h '+(s*0.65)+' Z" '+attrs+'/>'; break;
    /* --- chiral shapes: a mirror image can never be produced by rotation --- */
    /* NOTE: arms are deliberately UNEQUAL. An L with equal arms is symmetric
       about its diagonal, which makes its mirror image reachable by a plain
       rotation — that would break every "find the mirror" question. */
    case 'l-shape':     body='<path d="M '+(-s*0.75)+' '+(-s)+' h '+(s*0.75)+' v '+(s*1.35)+' h '+s+' v '+(s*0.65)+' h '+(-s*1.75)+' Z" '+attrs+'/>'; break;
    case 'flag':        body='<path d="M '+(-s*0.7)+' '+s+' V '+(-s)+' H '+s+' L '+(s*0.25)+' '+(-s*0.45)+' L '+s+' '+(s*0.1)+' H '+(-s*0.7)+'" '+attrs+'/>'; break;
    case 'zig':         body='<path d="M '+(-s)+' '+(-s)+' h '+(s*1.6)+' l '+(-s*1.1)+' '+(s*1.1)+' h '+(s*1.5)+'" fill="none" stroke="'+stroke+'" stroke-width="'+(sw*1.5)+'" stroke-linecap="round" stroke-linejoin="round"/>'; break;
    case 'boot':        body='<path d="M '+(-s*0.5)+' '+(-s)+' h '+(s*0.7)+' v '+(s*1.3)+' h '+(s*0.8)+' v '+(s*0.7)+' h '+(-s*1.5)+' Z" '+attrs+'/>'; break;
    /* --- line primitives used by overlay / XOR matrices --- */
    case 'vline':       body=line(0,-s,0,s); break;
    case 'hline':       body=line(-s,0,s,0); break;
    case 'dline1':      body=line(-s,-s,s,s); break;
    case 'dline2':      body=line(-s,s,s,-s); break;
    default:            body='';
  }
  return g + body + '</g>';
}

/* N copies of a shape spread evenly in one cell — for count progressions. */
function IQ_shapesInCell(spec, count, cx, cy, sz){
  if(count<=0) return '';
  const R = sz*0.28;
  let out='';
  if(count===1){
    out += IQ_shape(Object.assign({}, spec, {size:0.9}), cx, cy, sz);
  }else{
    for(let i=0;i<count;i++){
      const a=(Math.PI*2/count)*i - Math.PI/2;
      out += IQ_shape(Object.assign({}, spec, {size:0.5}), cx+Math.cos(a)*R, cy+Math.sin(a)*R, sz);
    }
  }
  return out;
}

/* One matrix / option cell. cellSpec is one of:
 *   {blank:true} · {kind,...} · {multi:[spec,...]} · {kind,count:n} · null */
function IQ_matrixCell(cellSpec, cx, cy, sz, opts){
  const p=IQ_palette();
  const o = opts||{};
  const bg = o.bg || 'transparent';
  const bc = o.borderColor || p.line;
  const border = o.noBorder ? '' :
    '<rect x="'+(cx-sz/2)+'" y="'+(cy-sz/2)+'" width="'+sz+'" height="'+sz+'" rx="8" ry="8" fill="'+bg+'" stroke="'+bc+'" stroke-width="1.5"/>';
  let content='';
  if(cellSpec && cellSpec.blank){
    content = '<text x="'+cx+'" y="'+(cy+sz*0.14)+'" text-anchor="middle" font-size="'+(sz*0.42)+'" font-weight="800" fill="'+p.muted+'" font-family="system-ui,-apple-system,sans-serif">?</text>';
  }else if(cellSpec && cellSpec.multi){
    for(const s of cellSpec.multi) content += IQ_shape(s, cx, cy, sz);
  }else if(cellSpec && cellSpec.count!=null){
    content = IQ_shapesInCell(cellSpec, cellSpec.count, cx, cy, sz);
  }else if(cellSpec && cellSpec.kind){
    content = IQ_shape(cellSpec, cx, cy, sz);
  }
  return border + content;
}

/* R×C matrix from a flat row-major array of cellSpecs. */
function IQ_drawMatrix(rows, cols, cells, opts){
  const w=240, h=240, pad=10;
  const cw=(w-pad*2)/cols, ch=(h-pad*2)/rows;
  const sz=Math.min(cw,ch)-8;
  let svg=IQ_svgOpen(w,h,'iq-svg-matrix');
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    svg += IQ_matrixCell(cells[r*cols+c], pad+cw*c+cw/2, pad+ch*r+ch/2, sz, opts||{});
  }
  return svg+'</svg>';
}

/* Option tile — a single cellSpec in its own box, sized explicitly. */
function IQ_optionTile(cellSpec){
  const w=90,h=90;
  let svg=IQ_svgOpen(w,h,'iq-svg-opt');
  svg += IQ_matrixCell(cellSpec, w/2, h/2, w-16, {noBorder:true});
  return svg+'</svg>';
}

/* Visible placeholder — the last-resort guard so no tile is EVER blank. */
function IQ_placeholderTile(){
  const p=IQ_palette();
  const w=90,h=90;
  return IQ_svgOpen(w,h,'iq-svg-opt iq-svg-fallback')+
    '<rect x="8" y="8" width="74" height="74" rx="10" fill="none" stroke="'+p.muted+'" stroke-width="2" stroke-dasharray="5 4"/>'+
    '<text x="45" y="52" text-anchor="middle" font-size="26" font-weight="800" fill="'+p.muted+'" font-family="system-ui,sans-serif">?</text>'+
    '</svg>';
}

/* Horizontal sequence: N frames left→right, last one usually {blank:true}. */
function IQ_drawSequence(cells){
  const p=IQ_palette();
  const n=cells.length, cw=70, gap=8;
  const w=n*cw+(n-1)*gap+20, h=90;
  let svg=IQ_svgOpen(w,h,'iq-svg-seq');
  for(let i=0;i<n;i++){
    const cx=10+i*(cw+gap)+cw/2, cy=h/2;
    svg += IQ_matrixCell(cells[i], cx, cy, cw-8, {});
    if(i<n-1){
      const ax=10+(i+1)*cw+i*gap-2;
      svg += '<path d="M '+ax+' '+cy+' l '+(gap+4)+' 0" stroke="'+p.muted+'" stroke-width="1.5" stroke-linecap="round"/>';
    }
  }
  return svg+'</svg>';
}

/* Cube net drawn as a cross with 6 labelled faces.
 * Face order/positions: 0 top, 1 left, 2 front, 3 right, 4 back, 5 bottom.
 * Opposite pairs in this layout: 0↔5, 1↔3, 2↔4. */
function IQ_drawCubeNet(faceLabels, highlight){
  const p=IQ_palette();
  const s=42, w=s*4+20, h=s*3+20, ox=10, oy=10;
  const pos=[ [1,0],[0,1],[1,1],[2,1],[3,1],[1,2] ];
  let svg=IQ_svgOpen(w,h,'iq-svg-cube');
  for(let i=0;i<6;i++){
    const c=pos[i][0], r=pos[i][1], x=ox+c*s, y=oy+r*s;
    const hot = highlight!=null && faceLabels[i]===highlight;
    svg += '<rect x="'+x+'" y="'+y+'" width="'+s+'" height="'+s+'" rx="4" ry="4" fill="'+(hot?'rgba(124,58,237,.18)':p.surf)+'" stroke="'+(hot?p.prim:p.ink)+'" stroke-width="'+(hot?2.5:1.5)+'"/>';
    if(faceLabels&&faceLabels[i]){
      svg += '<text x="'+(x+s/2)+'" y="'+(y+s/2+6)+'" text-anchor="middle" font-size="17" font-weight="800" fill="'+p.ink+'" font-family="system-ui,sans-serif">'+faceLabels[i]+'</text>';
    }
  }
  return svg+'</svg>';
}

/* Paper-fold storyboard: square → folded → punched. */
function IQ_drawFoldSteps(axis /* 'v' | 'h' */, punches /* [[r,c],...] on the folded half */){
  const p=IQ_palette();
  const w=200,h=96,sz=58;
  let svg=IQ_svgOpen(w,h,'iq-svg-fold');
  svg += '<rect x="10" y="16" width="'+sz+'" height="'+sz+'" fill="'+p.surf+'" stroke="'+p.ink+'" stroke-width="1.5"/>';
  if(axis==='v') svg += '<path d="M '+(10+sz/2)+' 16 v '+sz+'" stroke="'+p.muted+'" stroke-width="1" stroke-dasharray="3 3"/>';
  else           svg += '<path d="M 10 '+(16+sz/2)+' h '+sz+'" stroke="'+p.muted+'" stroke-width="1" stroke-dasharray="3 3"/>';
  const fw = axis==='v' ? sz/2 : sz, fh = axis==='v' ? sz : sz/2;
  const fx = 84, fy = axis==='v' ? 16 : 16+sz/4;
  svg += '<rect x="'+fx+'" y="'+fy+'" width="'+fw+'" height="'+fh+'" fill="'+p.surf+'" stroke="'+p.ink+'" stroke-width="1.5"/>';
  const px = 140, py = axis==='v' ? 16 : 16+sz/4;
  svg += '<rect x="'+px+'" y="'+py+'" width="'+fw+'" height="'+fh+'" fill="'+p.surf+'" stroke="'+p.ink+'" stroke-width="1.5"/>';
  for(const pt of punches){
    const cx = px + (axis==='v' ? fw/2 : (pt[1]+0.5)*(fw/2));
    const cy = py + (axis==='v' ? (pt[0]+0.5)*(fh/2) : fh/2);
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="4" fill="'+p.bad+'"/>';
  }
  svg += '<path d="M 74 45 l 6 0 M 76 42 l 4 3 l -4 3" stroke="'+p.muted+'" stroke-width="1.4" fill="none"/>';
  svg += '<path d="M 128 45 l 6 0 M 130 42 l 4 3 l -4 3" stroke="'+p.muted+'" stroke-width="1.4" fill="none"/>';
  svg += '<text x="39" y="88" text-anchor="middle" font-size="9" fill="'+p.muted+'" font-family="system-ui,sans-serif">fold</text>';
  svg += '<text x="97" y="88" text-anchor="middle" font-size="9" fill="'+p.muted+'" font-family="system-ui,sans-serif">punch</text>';
  svg += '<text x="158" y="88" text-anchor="middle" font-size="9" fill="'+p.muted+'" font-family="system-ui,sans-serif">unfold = ?</text>';
  return svg+'</svg>';
}

/* Unfolded paper option: 2×2 grid with holes at the listed "r,c" keys. */
function IQ_drawUnfolded(holes){
  const p=IQ_palette();
  const w=90,h=90,gs=32,ox=(w-gs*2)/2,oy=(h-gs*2)/2;
  const set = (holes instanceof Set) ? holes : new Set(holes||[]);
  let svg=IQ_svgOpen(w,h,'iq-svg-opt iq-svg-unfold');
  svg += '<rect x="'+ox+'" y="'+oy+'" width="'+(gs*2)+'" height="'+(gs*2)+'" fill="'+p.surf+'" stroke="'+p.ink+'" stroke-width="1.5"/>';
  svg += '<line x1="'+(ox+gs)+'" y1="'+oy+'" x2="'+(ox+gs)+'" y2="'+(oy+gs*2)+'" stroke="'+p.muted+'" stroke-width="1" stroke-dasharray="3 3"/>';
  svg += '<line x1="'+ox+'" y1="'+(oy+gs)+'" x2="'+(ox+gs*2)+'" y2="'+(oy+gs)+'" stroke="'+p.muted+'" stroke-width="1" stroke-dasharray="3 3"/>';
  for(let r=0;r<2;r++)for(let c=0;c<2;c++){
    if(set.has(r+','+c)) svg += '<circle cx="'+(ox+gs*c+gs/2)+'" cy="'+(oy+gs*r+gs/2)+'" r="5.5" fill="'+p.bad+'"/>';
  }
  return svg+'</svg>';
}

/* Circular countdown ring. */
function IQ_makeTimerRing(size){
  const p=IQ_palette();
  const r=size/2-6, c=2*Math.PI*r;
  const el=document.createElement('div');
  el.className='iq-ring-wrap';
  el.style.width=size+'px'; el.style.height=size+'px';
  el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" class="iq-ring">'+
      '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="'+p.line+'" stroke-width="5"/>'+
      '<circle cx="'+(size/2)+'" cy="'+(size/2)+'" r="'+r+'" fill="none" stroke="'+p.good+'" stroke-width="5" stroke-linecap="round" '+
        'stroke-dasharray="'+c+'" stroke-dashoffset="0" transform="rotate(-90 '+(size/2)+' '+(size/2)+')" class="iq-ring-arc"/>'+
    '</svg><div class="iq-ring-num">0</div>';
  const arc=el.querySelector('.iq-ring-arc'), num=el.querySelector('.iq-ring-num');
  return {
    el, arc, num, circumference:c, currentElapsed:function(){ return 0; },
    set(fracLeft, secsLeft){
      arc.setAttribute('stroke-dashoffset', c*(1-fracLeft));
      arc.setAttribute('stroke', fracLeft<0.25 ? p.bad : fracLeft<0.5 ? p.warn : p.good);
      num.textContent = Math.max(0, Math.ceil(secsLeft));
      el.classList.toggle('iq-ring-critical', secsLeft<=3);
    }
  };
}

/* Radar chart over the 4 categories + speed, values already on the IQ scale. */
function IQ_drawRadar(catIq, lang){
  const p=IQ_palette();
  const keys=IQ_CAT_KEYS.concat(['speed']);
  const labels=keys.map(k=> k==='speed' ? (lang==='en'?'Speed':'Speed') : IQ_t('cat.short.'+k, lang));
  const w=250,h=228,cx=w/2,cy=h/2+4,R=74;
  const norm=v=> IQ_clamp((v-70)/(145-70), 0.06, 1);
  const pts=vals=>vals.map((v,i)=>{
    const a=(Math.PI*2/keys.length)*i - Math.PI/2, r=R*norm(v);
    return [cx+Math.cos(a)*r, cy+Math.sin(a)*r];
  });
  let svg=IQ_svgOpen(w,h,'iq-svg-radar');
  for(let k=1;k<=4;k++){
    const rr=R*k/4, ring=[];
    for(let i=0;i<keys.length;i++){const a=(Math.PI*2/keys.length)*i-Math.PI/2;ring.push((cx+Math.cos(a)*rr)+','+(cy+Math.sin(a)*rr));}
    svg += '<polygon points="'+ring.join(' ')+'" fill="none" stroke="'+p.line+'" stroke-width="1"/>';
  }
  for(let i=0;i<keys.length;i++){
    const a=(Math.PI*2/keys.length)*i-Math.PI/2;
    svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+Math.cos(a)*R)+'" y2="'+(cy+Math.sin(a)*R)+'" stroke="'+p.line+'" stroke-width="1"/>';
  }
  const vals=keys.map(k=>catIq[k]||70);
  svg += '<polygon points="'+pts(vals).map(q=>q.join(',')).join(' ')+'" fill="'+p.prim+'33" stroke="'+p.prim+'" stroke-width="2" stroke-linejoin="round"/>';
  for(const q of pts(vals)) svg += '<circle cx="'+q[0]+'" cy="'+q[1]+'" r="3" fill="'+p.prim+'"/>';
  for(let i=0;i<keys.length;i++){
    const a=(Math.PI*2/keys.length)*i-Math.PI/2;
    svg += '<text x="'+(cx+Math.cos(a)*(R+20))+'" y="'+(cy+Math.sin(a)*(R+20)+4)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+p.ink+'" font-family="system-ui,sans-serif">'+labels[i]+'</text>';
  }
  return svg+'</svg>';
}

/* --------------------------------------------------------------------------
 *  RENDER GUARD — after any option render, make sure no tile is blank.
 *  A tile is "bad" when it has no SVG and no text, or an SVG with no children,
 *  or an SVG that resolves to zero width. Bad tiles get a visible placeholder.
 * ------------------------------------------------------------------------ */
function IQ_guardOptionTiles(container){
  if(!container || !container.querySelectorAll) return 0;
  let fixed=0;
  container.querySelectorAll('.iq5-opt-body').forEach(bodyEl=>{
    const svg = bodyEl.querySelector('svg');
    const txt = bodyEl.querySelector('.iq5-opt-text');
    let bad=false;
    if(!svg && !txt) bad=true;
    else if(!svg && txt) bad = !(txt.textContent||'').trim();
    else{
      const kids = svg.childNodes ? svg.childNodes.length : 0;
      const attrW = parseFloat(svg.getAttribute('width')||'0');
      let boxW = 0;
      try{ boxW = svg.getBoundingClientRect().width; }catch(e){ boxW = 0; }
      if(kids===0) bad=true;
      else if(!(attrW>0) && !(boxW>0)) bad=true;
    }
    if(bad){ bodyEl.innerHTML = IQ_placeholderTile(); fixed++; }
  });
  return fixed;
}

/* ============================================================================
 *  SECTION 3 — QUESTION BANK
 *  ---------------------------------------------------------------------------
 *  The bank is PROCEDURALLY GENERATED from a seed. Each family encodes one
 *  fixed rule; the seed only varies the shapes/numbers, so a family can never
 *  drift into ambiguity. Every item carries {hi,en} for every text field and
 *  every wrong option is tagged with the specific mistake it encodes.
 *
 *  Option authoring contract:
 *    options: [ {..., correct:true}, {..., trap:'near-miss'}, ... ]
 *  IQ_finalizeQuestion() then shuffles them to a target position and assigns
 *  the a/b/c/d ids, which is how answer-position balance is guaranteed.
 * ========================================================================== */

const IQ_BASE_TIME = { matrix:20, sequence:18, target:18, oddone:18, paperfold:22,
                       cubenet:25, text:18, memory:20 };
function IQ_timeFor(render, difficulty){
  const base = IQ_BASE_TIME[render] != null ? IQ_BASE_TIME[render] : 18;
  return IQ_clamp(base + (difficulty>=4 ? 3 : difficulty>=3 ? 1 : 0), 15, 28);
}

function IQ_mkQ(o){
  o.options = (o.options||[]).map(op=>{
    if(!op.correct && !op.trap) op.trap = 'surface';
    return op;
  });
  if(o.timeLimit == null) o.timeLimit = IQ_timeFor(o.render, o.difficulty);
  return o;
}

/* Give the correct answer a deterministic target position, then letter the
 * options a..d by their final position. */
function IQ_finalizeQuestion(q, targetPos){
  const opts = q.options.slice();
  const ci = opts.findIndex(o=>o.correct);
  const correctOpt = opts.splice(ci,1)[0];
  const pos = IQ_clamp(targetPos|0, 0, opts.length);
  opts.splice(pos, 0, correctOpt);
  const letters = ['a','b','c','d','e'];
  opts.forEach((o,i)=>{ o.id = letters[i]; });
  q.options = opts;
  q.correct = letters[pos];
  q.correctPos = pos;
  return q;
}

/* ---------------------------------------------------------------------------
 *  3.1 PATTERN — visual matrices, sequences, odd-one-out
 * ------------------------------------------------------------------------- */

const IQ_SHAPE_KINDS = ['circle','square','triangle','diamond','hex','star'];
const IQ_CHIRAL = ['l-shape','flag','zig','boot'];

/* P1 · 3×3 count progression: count = start + row + col. */
function IQ_famMatrixCount(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const kind = IQ_rpick(rng, IQ_SHAPE_KINDS);
    const other = IQ_rpick(rng, IQ_SHAPE_KINDS.filter(k=>k!==kind));
    const start = IQ_rint(rng,1,2);
    const cells=[];
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      cells.push((r===2&&c===2) ? {blank:true} : {kind, count:start+r+c});
    }
    const ans = start+4;
    out.push(IQ_mkQ({
      id:'pat-count-'+i, category:'pattern', difficulty: i<2?1:2, render:'matrix',
      prompt: IQ_L('Wo tile chuno jo pattern complete kare.','Pick the tile that completes the pattern.'),
      payload:{ rows:3, cols:3, cells },
      options:[
        { spec:{kind, count:ans}, correct:true },
        { spec:{kind, count:ans-1}, trap:'near-miss' },
        { spec:{kind, count:ans+1}, trap:'off-by-one' },
        { spec:{kind:other, count:ans}, trap:'surface' }
      ],
      explanation: IQ_L(
        'Har row aur har column mein shape ek-ek badhti hai, isliye aakhri cell mein '+ans+' shapes aayengi.',
        'Each row and column adds one more shape, so the last cell holds '+ans+' shapes.')
    }));
  }
  return out;
}

/* P2 · 3×3 rotation progression: rot = (row+col) × step. */
function IQ_famMatrixRotation(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const kind = IQ_rpick(rng, IQ_CHIRAL);
    const step = IQ_rpick(rng, [45,90]);
    const cells=[];
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      cells.push((r===2&&c===2) ? {blank:true} : {kind, rot:((r+c)*step)%360});
    }
    const ans = (4*step)%360;
    out.push(IQ_mkQ({
      id:'pat-rot-'+i, category:'pattern', difficulty: i<2?2:(i===3?4:3), render:'matrix',
      prompt: IQ_L('Missing tile kaunsa hai?','Which tile completes the matrix?'),
      payload:{ rows:3, cols:3, cells },
      options:[
        { spec:{kind, rot:ans}, correct:true },
        { spec:{kind, rot:(ans-step+360)%360}, trap:'near-miss' },
        { spec:{kind, rot:(ans+step)%360}, trap:'over' },
        { spec:{kind, rot:ans, mirror:true}, trap:'reverse' }
      ],
      explanation: IQ_L(
        'Har step par shape '+step+'° clockwise ghoomti hai (flip nahi hoti). Aakhri cell '+ans+'° par hai.',
        'The shape turns '+step+'° clockwise each step — it never flips. The last cell sits at '+ans+'°.')
    }));
  }
  return out;
}

/* P3 · XOR overlay matrix: column 3 keeps only the parts NOT shared by 1 & 2. */
function IQ_famMatrixXor(rng, n){
  const out=[];
  const parts=['vline','hline','dline1','dline2','ring'];
  for(let i=0;i<n;i++){
    const cells=[];
    let lastRow=null;
    for(let r=0;r<3;r++){
      const trio = IQ_rshuffle(rng, parts).slice(0,3);
      const A=[trio[0],trio[2]], B=[trio[1],trio[2]];
      const X=[trio[0],trio[1]];
      const mk=list=>({ multi:list.map(k=>({kind:k})) });
      cells.push(mk(A), mk(B), r===2 ? {blank:true} : mk(X));
      if(r===2) lastRow={A,B,X,common:trio[2]};
    }
    out.push(IQ_mkQ({
      id:'pat-xor-'+i, category:'pattern', difficulty: i===0?3:(i===2?5:4), render:'matrix',
      prompt: IQ_L('Teesra column pehle do se banta hai. Missing tile kaunsa hai?','The third column is built from the first two. Which tile is missing?'),
      payload:{ rows:3, cols:3, cells },
      options:[
        { spec:{ multi:lastRow.X.map(k=>({kind:k})) }, correct:true },
        { spec:{ multi:[{kind:lastRow.common}] }, trap:'reverse' },
        { spec:{ multi:lastRow.A.concat([lastRow.B[0]]).map(k=>({kind:k})) }, trap:'over' },
        { spec:{ multi:lastRow.A.map(k=>({kind:k})) }, trap:'surface' }
      ],
      explanation: IQ_L(
        'Rule: jo part dono cells mein common hai wo hat jaata hai, sirf alag-alag wale parts bachte hain (XOR).',
        'Rule: parts that appear in BOTH cells cancel out; only the parts unique to one side survive (XOR).')
    }));
  }
  return out;
}

/* P4 · shading × count matrix: fill state runs across columns, count down rows. */
function IQ_famMatrixShade(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const p = IQ_palette();
    const kind = IQ_rpick(rng, ['circle','square','diamond','hex']);
    const other = IQ_rpick(rng, IQ_SHAPE_KINDS.filter(k=>k!==kind));
    const fills = ['none', p.prim+'55', p.prim];
    const cells=[];
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      cells.push((r===2&&c===2) ? {blank:true} : {kind, count:r+1, fill:fills[c]});
    }
    out.push(IQ_mkQ({
      id:'pat-shade-'+i, category:'pattern', difficulty:3, render:'matrix',
      prompt: IQ_L('Do rules ek saath chal rahe hain — missing tile kaunsa hai?','Two rules run at once — which tile is missing?'),
      payload:{ rows:3, cols:3, cells },
      options:[
        { spec:{kind, count:3, fill:fills[2]}, correct:true },
        { spec:{kind, count:3, fill:fills[1]}, trap:'near-miss' },
        { spec:{kind, count:2, fill:fills[2]}, trap:'off-by-one' },
        { spec:{kind:other, count:3, fill:fills[2]}, trap:'surface' }
      ],
      explanation: IQ_L(
        'Column ke saath shading khaali → half → solid hoti hai, aur row ke saath count 1 → 2 → 3. Isliye 3 solid shapes.',
        'Shading goes empty → half → solid across the columns while the count goes 1 → 2 → 3 down the rows, so it is 3 solid shapes.')
    }));
  }
  return out;
}

/* P5 · rotation sequence. */
function IQ_famSeqRotation(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const kind = IQ_rpick(rng, IQ_CHIRAL);
    const step = IQ_rpick(rng,[45,90]);
    const start = IQ_rpick(rng,[0,90,180]);
    const cells=[];
    for(let k=0;k<4;k++) cells.push({kind, rot:(start+k*step)%360});
    cells.push({blank:true});
    const ans=(start+4*step)%360;
    out.push(IQ_mkQ({
      id:'pat-seqrot-'+i, category:'pattern', difficulty: i<2?1:2, render:'sequence',
      prompt: IQ_L('Series mein agla shape kaunsa aayega?','Which shape comes next in the series?'),
      payload:{ cells },
      options:[
        { spec:{kind, rot:ans}, correct:true },
        { spec:{kind, rot:(ans-step+360)%360}, trap:'near-miss' },
        { spec:{kind, rot:(ans+step)%360}, trap:'over' },
        { spec:{kind, rot:ans, mirror:true}, trap:'reverse' }
      ],
      explanation: IQ_L(
        'Har step par shape '+step+'° clockwise ghoomti hai, mirror nahi hoti. Agla step = '+ans+'°.',
        'Each step rotates the shape '+step+'° clockwise — no flipping. The next step is '+ans+'°.')
    }));
  }
  return out;
}

/* P6 · alternating shape + growing size sequence. */
function IQ_famSeqAlternate(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const a = IQ_rpick(rng, IQ_SHAPE_KINDS);
    const b = IQ_rpick(rng, IQ_SHAPE_KINDS.filter(k=>k!==a));
    const sizes=[0.5,0.65,0.8,0.95,1.1];
    const cells=[];
    for(let k=0;k<4;k++) cells.push({kind: k%2 ? b : a, size:sizes[k]});
    cells.push({blank:true});
    out.push(IQ_mkQ({
      id:'pat-seqalt-'+i, category:'pattern', difficulty: i===2?4:3, render:'sequence',
      prompt: IQ_L('Do cheezein ek saath badal rahi hain. Agla kaunsa?','Two things change at once. Which comes next?'),
      payload:{ cells },
      options:[
        { spec:{kind:a, size:sizes[4]}, correct:true },
        { spec:{kind:a, size:sizes[3]}, trap:'near-miss' },
        { spec:{kind:b, size:sizes[4]}, trap:'surface' },
        { spec:{kind:a, size:1.25}, trap:'over' }
      ],
      explanation: IQ_L(
        'Shape ek-ek karke alternate hoti hai (isliye phir se pehli wali shape) aur size har step thoda badhta hai.',
        'The shape alternates every step (so the first shape returns) and the size grows a little each step.')
    }));
  }
  return out;
}

/* P7 · odd-one-out: three rotations of one chiral shape + one mirror. */
function IQ_famOddMirror(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const kind = IQ_rpick(rng, IQ_CHIRAL);
    const rots = IQ_rshuffle(rng,[0,90,180,270]).slice(0,4);
    out.push(IQ_mkQ({
      id:'pat-oddmir-'+i, category:'pattern', difficulty: i===2?4:3, render:'oddone',
      prompt: IQ_L('Inme se kaunsi shape baaki teen se alag hai?','Which of these shapes does not belong with the other three?'),
      payload:{},
      options:[
        { spec:{kind, rot:rots[0], mirror:true}, correct:true },
        { spec:{kind, rot:rots[1]}, trap:'surface' },
        { spec:{kind, rot:rots[2]}, trap:'surface' },
        { spec:{kind, rot:rots[3]}, trap:'surface' }
      ],
      explanation: IQ_L(
        'Teen shapes ek hi shape ko ghuma kar bani hain. Ek shape mirror (ulti) hai — ghuma kar wo kabhi baaki jaisi nahi banegi.',
        'Three of them are just rotations of the same shape. One is a mirror image — no amount of rotating will match it to the others.')
    }));
  }
  return out;
}

/* P8 · odd-one-out by side count (hidden attribute). */
function IQ_famOddSides(rng, n){
  const out=[];
  const four=['square','diamond'], other=['triangle','hex','star','circle'];
  for(let i=0;i<n;i++){
    const odd = IQ_rpick(rng, other);
    const keep = IQ_rshuffle(rng,[four[0],four[1],four[0]]);
    out.push(IQ_mkQ({
      id:'pat-oddside-'+i, category:'pattern', difficulty:2, render:'oddone',
      prompt: IQ_L('Kaunsi shape group mein fit nahi hoti?','Which shape does not fit the group?'),
      payload:{},
      options:[
        { spec:{kind:odd, rot:IQ_rpick(rng,[0,20,40])}, correct:true },
        { spec:{kind:keep[0], rot:0}, trap:'surface' },
        { spec:{kind:keep[1], rot:45}, trap:'surface' },
        { spec:{kind:keep[2], rot:20}, trap:'surface' }
      ],
      explanation: IQ_L(
        'Teen shapes ke 4 sides hain (square/diamond, bas ghumaye hue). Chauthi shape ke 4 sides nahi hain — wahi odd hai.',
        'Three shapes have exactly 4 sides (a square or diamond, just rotated). The fourth does not — that is the odd one.')
    }));
  }
  return out;
}

/* P9 · shrinking count sequence (easy warm-up). */
function IQ_famSeqCount(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const kind = IQ_rpick(rng, IQ_SHAPE_KINDS);
    const start = IQ_rint(rng,5,6);
    const cells=[];
    for(let k=0;k<4;k++) cells.push({kind, count:start-k});
    cells.push({blank:true});
    const ans=start-4;
    out.push(IQ_mkQ({
      id:'pat-seqcount-'+i, category:'pattern', difficulty:1, render:'sequence',
      prompt: IQ_L('Series mein aage kya aayega?','What comes next in the series?'),
      payload:{ cells },
      options:[
        { spec:{kind, count:ans}, correct:true },
        { spec:{kind, count:ans+1}, trap:'near-miss' },
        { spec:{kind, count:Math.max(1,ans-1)}, trap:'off-by-one' },
        { spec:{kind, count:ans+2}, trap:'over' }
      ],
      explanation: IQ_L(
        'Har step par ek shape kam hoti jaati hai, isliye agli tile mein '+ans+' shape'+(ans===1?'':'s')+'.',
        'Each step drops one shape, so the next tile has '+ans+' shape'+(ans===1?'':'s')+'.')
    }));
  }
  return out;
}

/* ---------------------------------------------------------------------------
 *  3.2 SPATIAL — mirror vs rotation, paper folding, cube nets, direction
 * ------------------------------------------------------------------------- */

/* S1 · find the MIRROR image (the only reflection among rotations). */
function IQ_famMirror(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const kind = IQ_rpick(rng, IQ_CHIRAL);
    const base = IQ_rpick(rng,[0,90,180,270]);
    const hard = i>=2;
    const mrot = hard ? (base+IQ_rpick(rng,[90,270]))%360 : base;
    const r = [90,180,270].map(d=>(base+d)%360);
    out.push(IQ_mkQ({
      id:'sp-mirror-'+i, category:'spatial', difficulty: hard?3:(i===0?1:2), render:'target',
      prompt: IQ_L('Neeche di gayi shape ka MIRROR image kaunsa hai? (sirf ghumaya hua nahi)',
                   'Which option is a MIRROR image of the shape below? (not just rotated)'),
      payload:{ target:{kind, rot:base} },
      options:[
        { spec:{kind, rot:mrot, mirror:true}, correct:true },
        { spec:{kind, rot:r[0]}, trap:'surface' },
        { spec:{kind, rot:r[1]}, trap:'reverse' },
        { spec:{kind, rot:r[2]}, trap:'surface' }
      ],
      explanation: IQ_L(
        'Mirror shape ko left↔right palat deta hai. Rotation shape ko wahi rakhta hai, sirf ghumata hai — isliye teen options sirf rotations hain aur ek hi asli mirror hai.',
        'A mirror flips the shape left↔right. Rotation keeps the shape identical and only turns it — three options are plain rotations, only one is a true reflection.')
    }));
  }
  return out;
}

/* S2 · find the pure ROTATION (the only non-reflected match). */
function IQ_famRotationMatch(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const kind = IQ_rpick(rng, IQ_CHIRAL);
    const other = IQ_rpick(rng, IQ_CHIRAL.filter(k=>k!==kind));
    const base = IQ_rpick(rng,[0,90,180,270]);
    const rot = (base+IQ_rpick(rng,[90,180,270]))%360;
    out.push(IQ_mkQ({
      id:'sp-rotmatch-'+i, category:'spatial', difficulty: i<2?2:3, render:'target',
      prompt: IQ_L('Kaunsa option wahi shape hai, bas ghumaya hua? (mirror nahi)',
                   'Which option is the SAME shape, only rotated? (not mirrored)'),
      payload:{ target:{kind, rot:base} },
      options:[
        { spec:{kind, rot}, correct:true },
        { spec:{kind, rot:base, mirror:true}, trap:'reverse' },
        { spec:{kind, rot:(base+90)%360, mirror:true}, trap:'reverse' },
        { spec:{kind:other, rot}, trap:'surface' }
      ],
      explanation: IQ_L(
        'Ghumane par shape ka "haath" nahi badalta. Do options mirror hain (ulti taraf mudte hain) aur ek bilkul alag shape hai.',
        'Rotating never changes a shape\u2019s handedness. Two options are mirrored (they bend the other way) and one is a different shape altogether.')
    }));
  }
  return out;
}

/* S3 · paper folding + punch. Fold in half, punch once, unfold. */
function IQ_famPaperFold(rng, n){
  const out=[];
  const combos=[ ['v',0], ['v',1], ['h',0], ['h',1] ];
  for(let i=0;i<n;i++){
    const cmb = combos[i % combos.length];
    const axis = cmb[0], k = cmb[1];
    let correct, near, reverse;
    if(axis==='v'){
      correct=[k+',0', k+',1']; near=[k+',0']; reverse=[(1-k)+',0',(1-k)+',1'];
    }else{
      correct=['0,'+k, '1,'+k]; near=['0,'+k]; reverse=['0,'+(1-k), '1,'+(1-k)];
    }
    const over=['0,0','0,1','1,0','1,1'];
    const foldTxt = axis==='v'
      ? IQ_L('Kaagaz ko beech se left-right fold kiya','The sheet is folded left over right')
      : IQ_L('Kaagaz ko beech se upar-neeche fold kiya','The sheet is folded top over bottom');
    out.push(IQ_mkQ({
      id:'sp-fold-'+i, category:'spatial', difficulty: i<2?3:(i===3?5:4), render:'paperfold',
      prompt: IQ_L(IQ_tx(foldTxt,'hi')+', phir ek hole punch kiya gaya. Kholne par kaagaz kaisa dikhega?',
                   IQ_tx(foldTxt,'en')+', then one hole is punched. What does it look like unfolded?'),
      payload:{ axis, punches: axis==='v' ? [[k,0]] : [[0,k]] },
      options:[
        { holes:correct, correct:true },
        { holes:near,    trap:'near-miss' },
        { holes:reverse, trap:'reverse' },
        { holes:over,    trap:'over' }
      ],
      explanation: IQ_L(
        'Ek punch fold ke aar-paar dono layers mein jaata hai, isliye kholne par fold line ke dono taraf ek-ek hole banta hai — kul 2 holes.',
        'One punch goes through both layers, so unfolding gives one hole on each side of the fold line — 2 holes in total.')
    }));
  }
  return out;
}

/* S4 · cube net: which face ends up OPPOSITE the given one?
 * Cross layout indices: 0 top, 1 left, 2 front, 3 right, 4 back, 5 bottom.
 * Opposites are therefore 0↔5, 1↔3, 2↔4 — always exactly one right answer. */
function IQ_famCubeNet(rng, n){
  const out=[];
  const OPP={0:5,1:3,2:4,3:1,4:2,5:0};
  const alphabets=[['A','B','C','D','E','F'],['P','Q','R','S','T','U'],['1','2','3','4','5','6'],['K','L','M','N','O','X']];
  for(let i=0;i<n;i++){
    const labels = IQ_rshuffle(rng, IQ_rpick(rng, alphabets));
    const ask = IQ_rint(rng,0,5);
    const ansIdx = OPP[ask];
    const others = [0,1,2,3,4,5].filter(x=>x!==ask && x!==ansIdx);
    const shuffledOthers = IQ_rshuffle(rng, others);
    out.push(IQ_mkQ({
      id:'sp-cube-'+i, category:'spatial', difficulty: i<2?4:5, render:'cubenet',
      prompt: IQ_L('Is net ko mod kar cube banaya jaaye, to "'+labels[ask]+'" ke bilkul opposite kaunsa face hoga?',
                   'If this net is folded into a cube, which face ends up exactly opposite "'+labels[ask]+'"?'),
      payload:{ faceLabels:labels, highlight:labels[ask] },
      options:[
        { label: IQ_L(labels[ansIdx]), correct:true },
        { label: IQ_L(labels[shuffledOthers[0]]), trap:'surface' },
        { label: IQ_L(labels[shuffledOthers[1]]), trap:'near-miss' },
        { label: IQ_L(labels[shuffledOthers[2]]), trap:'reverse' }
      ],
      explanation: IQ_L(
        'Cross-net mein lambi patti ke faces ek chain banate hain — chain mein do step door wala face opposite hota hai; upar aur neeche wale faces bhi aapas mein opposite hote hain. Isliye "'+labels[ask]+'" ke saamne "'+labels[ansIdx]+'" aayega. Jo faces net mein bilkul bagal hain wo kabhi opposite nahi ho sakte.',
        'In a cross net the long strip forms a ring — faces two steps apart on that ring end up opposite, and the two arms of the cross form the other pair. So "'+labels[ask]+'" faces "'+labels[ansIdx]+'". Faces that touch in the net can never be opposite.')
    }));
  }
  return out;
}

/* S5 · direction after a sequence of turns. */
function IQ_famDirections(rng, n){
  const out=[];
  const DIR=[ IQ_L('Uttar (North)','North'), IQ_L('Poorab (East)','East'),
              IQ_L('Dakshin (South)','South'), IQ_L('Paschim (West)','West') ];
  const TURNS=[
    { d:1, t:IQ_L('90° right mudte ho','you turn 90° right') },
    { d:3, t:IQ_L('90° left mudte ho','you turn 90° left') },
    { d:2, t:IQ_L('180° ghoom jaate ho','you turn 180° around') }
  ];
  for(let i=0;i<n;i++){
    const start = IQ_rint(rng,0,3);
    const steps = [];
    const count = i<2 ? 3 : 4;
    for(let k=0;k<count;k++) steps.push(IQ_rpick(rng, TURNS));
    const sum = steps.reduce((s,x)=>s+x.d,0);
    const ans = (start+sum)%4;
    const rev = ((start-sum)%4+4)%4;
    const near = ((ans-steps[steps.length-1].d)%4+4)%4;
    const tag = idx => idx===rev ? 'reverse' : idx===near ? 'near-miss' : 'surface';
    const opts=[];
    for(let d=0;d<4;d++){
      if(d===ans) opts.push({ label:DIR[d], correct:true });
      else opts.push({ label:DIR[d], trap: tag(d) });
    }
    out.push(IQ_mkQ({
      id:'sp-dir-'+i, category:'spatial', difficulty: i===0?1:(i===1?2:3), render:'text',
      prompt: IQ_L(
        'Tum '+IQ_tx(DIR[start],'hi')+' ki taraf dekh rahe ho. Phir '+steps.map(s=>IQ_tx(s.t,'hi')).join(', ')+'. Ab tum kis direction mein dekh rahe ho?',
        'You are facing '+IQ_tx(DIR[start],'en')+'. Then '+steps.map(s=>IQ_tx(s.t,'en')).join(', ')+'. Which direction are you facing now?'),
      payload:{},
      options: opts,
      explanation: IQ_L(
        'Har 90° right = ek quarter clockwise. Sab turns jodo: total '+(sum%4)+' quarter turns clockwise → '+IQ_tx(DIR[start],'hi')+' se '+IQ_tx(DIR[ans],'hi')+'.',
        'Every 90° right is one quarter turn clockwise. Adding the turns gives '+(sum%4)+' quarter turns clockwise → '+IQ_tx(DIR[start],'en')+' becomes '+IQ_tx(DIR[ans],'en')+'.')
    }));
  }
  return out;
}

/* S6 · cross-sections of solids (curated, 3 items). */
function IQ_famCrossSection(rng, n){
  const items=[
    {
      id:'cyl',
      prompt: IQ_L('Ek belan (cylinder) ko uske base ke bilkul parallel kaata jaaye — cut ki shape kya hogi?',
                   'A cylinder is sliced exactly parallel to its base. What shape is the cut surface?'),
      correct: IQ_L('Circle','Circle'),
      wrong:[ [IQ_L('Rectangle','Rectangle'),'reverse'], [IQ_L('Oval','Oval'),'near-miss'], [IQ_L('Square','Square'),'surface'] ],
      exp: IQ_L('Base ke parallel cut hamesha base jaisi hi shape deta hai — cylinder ka base circle hai. (Rectangle tab milta jab cut khada hota.)',
                'A cut parallel to the base always repeats the base shape, and a cylinder\u2019s base is a circle. (A vertical cut is what gives a rectangle.)')
    },
    {
      id:'cone',
      prompt: IQ_L('Ek cone ko base ke parallel kaata jaaye — cut ki shape kya hogi?',
                   'A cone is sliced parallel to its base. What shape is the cut surface?'),
      correct: IQ_L('Chhota circle','A smaller circle'),
      wrong:[ [IQ_L('Triangle','Triangle'),'reverse'], [IQ_L('Utna hi bada circle','A circle of the same size'),'near-miss'], [IQ_L('Ek point','A single point'),'over'] ],
      exp: IQ_L('Cone upar jaate hue patla hota hai, isliye parallel cut circle hi deta hai — bas base se chhota. Triangle khade cut se milta hai.',
                'A cone narrows towards the tip, so a parallel slice is still a circle — just smaller than the base. A triangle needs a vertical cut.')
    },
    {
      id:'cube',
      prompt: IQ_L('Ek cube ko uske ek face ke parallel kaata jaaye — cut ki shape kya hogi?',
                   'A cube is sliced parallel to one of its faces. What shape is the cut surface?'),
      correct: IQ_L('Square','Square'),
      wrong:[ [IQ_L('Rectangle (square nahi)','Rectangle (not a square)'),'near-miss'], [IQ_L('Triangle','Triangle'),'surface'], [IQ_L('Hexagon','Hexagon'),'over'] ],
      exp: IQ_L('Face ke parallel cut wahi face copy karta hai, aur cube ka har face square hai. Triangle/hexagon tirche cut se aate hain.',
                'A cut parallel to a face copies that face, and every face of a cube is a square. Triangles and hexagons need slanted cuts.')
    }
  ];
  return items.slice(0,n).map((it,i)=> IQ_mkQ({
    id:'sp-xsec-'+it.id, category:'spatial', difficulty:3, render:'text',
    prompt: it.prompt, payload:{},
    options: [{ label:it.correct, correct:true }].concat(it.wrong.map(w=>({ label:w[0], trap:w[1] }))),
    explanation: it.exp
  }));
}

/* ---------------------------------------------------------------------------
 *  3.3 NUMERICAL & LOGICAL — series, analogies, deduction, syllogisms
 * ------------------------------------------------------------------------- */

function IQ_numOpts(correct, traps){
  /* Build 4 numeric options, dropping collisions and topping up if needed. */
  const seen = new Set([correct]);
  const opts = [{ label: IQ_L(String(correct)), correct:true }];
  for(const t of traps){
    const v = Math.round(t[0]);
    if(seen.has(v) || !isFinite(v)) continue;
    seen.add(v);
    opts.push({ label: IQ_L(String(v)), trap:t[1] });
    if(opts.length===4) break;
  }
  let bump = 2;
  while(opts.length<4){
    const v = correct + bump;
    if(!seen.has(v)){ seen.add(v); opts.push({ label: IQ_L(String(v)), trap:'off-by-one' }); }
    bump = bump>0 ? -bump : -bump+2;
  }
  return opts;
}

/* N1 · second-order series: the differences themselves form a series. */
function IQ_famSeries2(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const s = IQ_rint(rng,1,6), d = IQ_rint(rng,2,5), k = IQ_rint(rng,1,4);
    const terms=[s]; const diffs=[];
    for(let j=0;j<5;j++){ const dj=d+j*k; diffs.push(dj); terms.push(terms[j]+dj); }
    const shown = terms.slice(0,5);
    const ans = terms[5];
    out.push(IQ_mkQ({
      id:'num-ser2-'+i, category:'numeric', difficulty: i===0?1:(i===1?2:3), render:'text',
      prompt: IQ_L('Series poori karo:  '+shown.join(', ')+', ?','Complete the series:  '+shown.join(', ')+', ?'),
      payload:{},
      options: IQ_numOpts(ans, [
        [terms[4]+diffs[3],'near-miss'],
        [ans+1,'off-by-one'],
        [terms[4]+diffs[4]+k,'over']
      ]),
      explanation: IQ_L(
        'Differences hain '+diffs.slice(0,4).join(', ')+' — ye khud '+k+'-'+k+' karke badh rahe hain. Agla difference '+diffs[4]+' hoga, isliye '+terms[4]+' + '+diffs[4]+' = '+ans+'.',
        'The differences are '+diffs.slice(0,4).join(', ')+' — they themselves grow by '+k+' each time. The next difference is '+diffs[4]+', so '+terms[4]+' + '+diffs[4]+' = '+ans+'.')
    }));
  }
  return out;
}

/* N2 · alternating operations series (×a then +b). */
function IQ_famSeriesAlt(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const s = IQ_rint(rng,2,6), a = IQ_rint(rng,2,3), b = IQ_rint(rng,3,9);
    const t=[s];
    for(let j=1;j<=5;j++) t.push(j%2 ? t[j-1]*a : t[j-1]+b);
    const shown=t.slice(0,5), ans=t[5];
    out.push(IQ_mkQ({
      id:'num-alt-'+i, category:'numeric', difficulty: i===0?3:4, render:'text',
      prompt: IQ_L('Series poori karo:  '+shown.join(', ')+', ?','Complete the series:  '+shown.join(', ')+', ?'),
      payload:{},
      options: IQ_numOpts(ans, [
        [t[4]+b,'reverse'],
        [ans-1,'off-by-one'],
        [ans*a,'over']
      ]),
      explanation: IQ_L(
        'Do operations baari-baari chalti hain: ×'+a+' phir +'+b+'. Aakhri step ×'+a+' ka tha, isliye '+t[4]+' × '+a+' = '+ans+'.',
        'Two operations alternate: ×'+a+' then +'+b+'. The next step is a ×'+a+' step, so '+t[4]+' × '+a+' = '+ans+'.')
    }));
  }
  return out;
}

/* N3 · geometric series with a twist (×a then −c). */
function IQ_famSeriesTwist(rng, n){
  const out=[];
  for(let i=0;i<n;i++){
    const s = IQ_rint(rng,2,5), a = 2 + (i%2), c = IQ_rint(rng,1,3);
    const t=[s];
    for(let j=1;j<=5;j++) t.push(t[j-1]*a - c);
    const shown=t.slice(0,5), ans=t[5];
    out.push(IQ_mkQ({
      id:'num-twist-'+i, category:'numeric', difficulty: i===1?5:4, render:'text',
      prompt: IQ_L('Series poori karo:  '+shown.join(', ')+', ?','Complete the series:  '+shown.join(', ')+', ?'),
      payload:{},
      options: IQ_numOpts(ans, [
        [t[4]*a,'near-miss'],
        [ans+1,'off-by-one'],
        [ans*a-c,'over']
      ]),
      explanation: IQ_L(
        'Har term = pichla × '+a+' − '+c+'. Isliye '+t[4]+' × '+a+' − '+c+' = '+ans+'. Sirf ×'+a+' karke rukna aam galti hai.',
        'Each term is previous × '+a+' − '+c+', so '+t[4]+' × '+a+' − '+c+' = '+ans+'. Stopping after the ×'+a+' is the usual slip.')
    }));
  }
  return out;
}

/* N4 · letter series with a growing gap. */
function IQ_famLetterSeries(rng, n){
  const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const out=[];
  for(let i=0;i<n;i++){
    const start = IQ_rint(rng,0,3), g = IQ_rint(rng,1,3);
    const idx=[start]; const gaps=[];
    for(let j=0;j<4;j++){ const gj=g+j; gaps.push(gj); idx.push(idx[j]+gj); }
    const shown = idx.slice(0,4).map(x=>A[x%26]);
    const ansI = idx[4];
    const L = x => A[((x%26)+26)%26];
    out.push(IQ_mkQ({
      id:'num-letser-'+i, category:'numeric', difficulty: i<2?2:3, render:'text',
      prompt: IQ_L('Letter series poori karo:  '+shown.join(', ')+', ?','Complete the letter series:  '+shown.join(', ')+', ?'),
      payload:{},
      options:[
        { label: IQ_L(L(ansI)), correct:true },
        { label: IQ_L(L(idx[3]+gaps[2])), trap:'near-miss' },
        { label: IQ_L(L(ansI+1)), trap:'off-by-one' },
        { label: IQ_L(L(ansI+gaps[3]+1)), trap:'over' }
      ],
      explanation: IQ_L(
        'Letters ke beech ka gap har baar 1 badhta hai: '+gaps.join(', ')+'. '+shown[3]+' se '+gaps[3]+' letter aage = '+L(ansI)+'.',
        'The gap between letters grows by one each time: '+gaps.join(', ')+'. Counting '+gaps[3]+' letters on from '+shown[3]+' gives '+L(ansI)+'.')
    }));
  }
  return out;
}

/* N5 · number analogy A:B :: C:? with two worked examples. */
function IQ_famAnalogy(rng, n){
  const rules=[
    { f:x=>x*x+1, near:x=>x*x,    hi:'n² + 1', en:'n² + 1' },
    { f:x=>x*x-1, near:x=>x*x,    hi:'n² − 1', en:'n² − 1' },
    { f:x=>x*(x+1), near:x=>x*x,  hi:'n × (n+1)', en:'n × (n+1)' },
    { f:x=>x*x*x, near:x=>x*x,    hi:'n³', en:'n³' }
  ];
  const out=[];
  for(let i=0;i<n;i++){
    const r = rules[i % rules.length];
    const a = IQ_rint(rng,2,4), b = a+IQ_rint(rng,1,2), c = b+IQ_rint(rng,1,3);
    const ans = r.f(c);
    out.push(IQ_mkQ({
      id:'num-analogy-'+i, category:'numeric', difficulty: i<2?3:(i===3?5:4), render:'text',
      prompt: IQ_L(
        a+' : '+r.f(a)+'  ::  '+b+' : '+r.f(b)+'  ::  '+c+' : ?',
        a+' : '+r.f(a)+'  ::  '+b+' : '+r.f(b)+'  ::  '+c+' : ?'),
      payload:{},
      options: IQ_numOpts(ans, [
        [r.near(c),'near-miss'],
        [ans+1,'off-by-one'],
        [r.f(c+1),'over']
      ]),
      explanation: IQ_L(
        'Dono examples ek hi rule follow karte hain: '+r.hi+'. Isliye '+c+' → '+ans+'.',
        'Both worked pairs follow one rule: '+r.en+'. So '+c+' → '+ans+'.')
    }));
  }
  return out;
}

/* N6 · coding-decoding: word → number (letter positions). */
function IQ_famCoding(rng, n){
  const words=['CAT','DOG','BAT','SUN','PEN','RAT','CAR','BUS','EGG','MAP','FAN','JAR'];
  const val=w=>w.split('').reduce((s,ch)=>s+(ch.charCodeAt(0)-64),0);
  const rval=w=>w.split('').reduce((s,ch)=>s+(27-(ch.charCodeAt(0)-64)),0);
  const out=[];
  for(let i=0;i<n;i++){
    const pool = IQ_rshuffle(rng, words).slice(0,3);
    const mult = i%2 ? 2 : 1;
    const ans = val(pool[2])*mult;
    const last = pool[2].charCodeAt(2)-64;
    out.push(IQ_mkQ({
      id:'num-code-'+i, category:'numeric', difficulty: mult===1?3:4, render:'text',
      prompt: IQ_L(
        'Agar '+pool[0]+' = '+(val(pool[0])*mult)+' aur '+pool[1]+' = '+(val(pool[1])*mult)+', to '+pool[2]+' = ?',
        'If '+pool[0]+' = '+(val(pool[0])*mult)+' and '+pool[1]+' = '+(val(pool[1])*mult)+', then '+pool[2]+' = ?'),
      payload:{},
      options: IQ_numOpts(ans, [
        [ans-last*mult,'near-miss'],
        [rval(pool[2])*mult,'reverse'],
        [ans+1,'off-by-one']
      ]),
      explanation: IQ_L(
        'Har letter ki alphabet position jodo (A=1, B=2, …)'+(mult===2?' aur total ko 2 se multiply karo':'')+'. '+
        pool[2]+' → '+pool[2].split('').map(ch=>ch+'='+(ch.charCodeAt(0)-64)).join(' + ')+' = '+val(pool[2])+(mult===2?' × 2 = '+ans:'')+'.',
        'Add up the alphabet positions of the letters (A=1, B=2, …)'+(mult===2?' and double the total':'')+'. '+
        pool[2]+' → '+pool[2].split('').map(ch=>ch+'='+(ch.charCodeAt(0)-64)).join(' + ')+' = '+val(pool[2])+(mult===2?' × 2 = '+ans:'')+'.')
    }));
  }
  return out;
}

/* N7 · balance / weighing puzzle. */
function IQ_famBalance(rng, n){
  const combos=[ [3,2,300], [2,3,200], [4,3,200], [5,2,250], [3,4,150], [2,5,100] ];
  const out=[];
  for(let i=0;i<n;i++){
    const cm = combos[(i + IQ_rint(rng,0,5)) % combos.length];
    const a=cm[0], b=cm[1], m=cm[2];
    const ans = b*m/a;
    out.push(IQ_mkQ({
      id:'num-bal-'+i, category:'numeric', difficulty:3, render:'text',
      prompt: IQ_L(
        a+' seb ka wazan '+b+' aam ke barabar hai. Ek aam '+m+' gram ka hai. Ek seb kitne gram ka hoga?',
        a+' apples weigh the same as '+b+' mangoes. One mango weighs '+m+' g. How much does one apple weigh?'),
      payload:{},
      options: IQ_numOpts(ans, [
        [a*m/b,'reverse'],
        [b*m,'near-miss'],
        [m,'surface']
      ]).map(o=>({ ...o, label: IQ_L(IQ_tx(o.label,'hi')+' g') })),
      explanation: IQ_L(
        a+' seb = '+b+' aam = '+(b*m)+' g. Ek seb = '+(b*m)+' ÷ '+a+' = '+ans+' g.',
        a+' apples = '+b+' mangoes = '+(b*m)+' g in total. One apple = '+(b*m)+' ÷ '+a+' = '+ans+' g.')
    }));
  }
  return out;
}

/* N8 · deduction grid: a scrambled chain of comparisons fixes one full order. */
function IQ_famDeduction(rng, n){
  const NAMES=[
    [IQ_L('Aman'),IQ_L('Bina'),IQ_L('Chetan'),IQ_L('Dev')],
    [IQ_L('Riya'),IQ_L('Sahil'),IQ_L('Tara'),IQ_L('Uday')],
    [IQ_L('Kabir'),IQ_L('Meera'),IQ_L('Nikhil'),IQ_L('Pooja')]
  ];
  const out=[];
  for(let i=0;i<n;i++){
    const size = i<2 ? 3 : 4;
    const pool = IQ_rshuffle(rng, IQ_rpick(rng, NAMES)).slice(0,size);
    const order = IQ_rshuffle(rng, pool);           /* order[0] tallest → last shortest */
    const stmts=[];
    for(let k=0;k<size-1;k++) stmts.push([order[k], order[k+1]]);
    const shown = IQ_rshuffle(rng, stmts);
    const askTallest = (i%2===0);
    const ansName = askTallest ? order[0] : order[size-1];
    const opp = askTallest ? order[size-1] : order[0];
    const opts = pool.map(nm=>{
      const isAns = nm === ansName;
      if(isAns) return { label:nm, correct:true };
      if(nm === opp) return { label:nm, trap:'reverse' };
      return { label:nm, trap:'near-miss' };
    });
    /* 3-name version needs a 4th choice: the tempting "not enough info" trap */
    if(opts.length===3) opts.push({ label: IQ_L('Pata nahi chal sakta','Cannot be determined'), trap:'surface' });
    const chainHi = order.map(x=>IQ_tx(x,'hi')).join(' > ');
    const chainEn = order.map(x=>IQ_tx(x,'en')).join(' > ');
    out.push(IQ_mkQ({
      id:'num-ded-'+i, category:'numeric', difficulty: size===3?3:(i===3?5:4), render:'text',
      prompt: IQ_L(
        size+' dost hain. '+shown.map(s=>IQ_tx(s[0],'hi')+', '+IQ_tx(s[1],'hi')+' se lamba hai').join('. ')+'. '+(askTallest?'Sabse lamba kaun hai?':'Sabse chhota kaun hai?'),
        'There are '+size+' friends. '+shown.map(s=>IQ_tx(s[0],'en')+' is taller than '+IQ_tx(s[1],'en')).join('. ')+'. '+(askTallest?'Who is the tallest?':'Who is the shortest?')),
      payload:{},
      options: opts,
      explanation: IQ_L(
        'Sab statements ko jod kar ek chain banti hai: '+chainHi+'. Isliye jawab '+IQ_tx(ansName,'hi')+' hai.',
        'Chaining every statement gives one full order: '+chainEn+'. So the answer is '+IQ_tx(ansName,'en')+'.')
    }));
  }
  return out;
}

/* N9 · rate "paradox" (the classic machines-and-minutes trap). */
function IQ_famRate(rng, n){
  const scenes=[
    { hi:['machine','minute','item'], en:['machines','minutes','items'] },
    { hi:['billi','minute','chuha'],  en:['cats','minutes','mice'] },
    { hi:['mazdoor','din','deewar'],  en:['workers','days','walls'] }
  ];
  const out=[];
  for(let i=0;i<n;i++){
    const sc = scenes[i % scenes.length];
    const a = IQ_rint(rng,3,6);
    const bmul = IQ_rpick(rng,[10,20]);
    const b = a*bmul;
    out.push(IQ_mkQ({
      id:'num-rate-'+i, category:'numeric', difficulty:4, render:'text',
      prompt: IQ_L(
        'Agar '+a+' '+sc.hi[0]+' '+a+' '+sc.hi[1]+' mein '+a+' '+sc.hi[2]+' banati hain, to '+b+' '+sc.hi[0]+' '+b+' '+sc.hi[2]+' kitne '+sc.hi[1]+' mein banayengi?',
        'If '+a+' '+sc.en[0]+' make '+a+' '+sc.en[2]+' in '+a+' '+sc.en[1]+', how many '+sc.en[1]+' do '+b+' '+sc.en[0]+' need to make '+b+' '+sc.en[2]+'?'),
      payload:{},
      options: IQ_numOpts(a, [
        [b,'surface'],
        [bmul,'near-miss'],
        [1,'reverse']
      ]),
      explanation: IQ_L(
        'Ek '+sc.hi[0]+' ek '+sc.hi[2]+' banane mein '+a+' '+sc.hi[1]+' leti hai. '+b+' '+sc.hi[0]+' saath-saath kaam karti hain, isliye time wahi rehta hai: '+a+'.',
        'One '+sc.en[0].replace(/s$/,'')+' takes '+a+' '+sc.en[1]+' for one item. With '+b+' of them working in parallel the time does not change: '+a+'.')
    }));
  }
  return out;
}

/* N10 · clock angle between the hands. */
function IQ_famClock(rng, n){
  const out=[];
  const cand=[];
  for(let h=1;h<=12;h++) for(let m=0;m<60;m+=5){
    let ang=Math.abs(30*(h%12) - 5.5*m);
    if(ang>180) ang=360-ang;
    if(Number.isInteger(ang) && ang>0) cand.push([h,m,ang]);
  }
  const picked = IQ_rshuffle(rng, cand).slice(0, n);
  picked.forEach((c,i)=>{
    const h=c[0], m=c[1], ans=c[2];
    let naive=Math.abs(30*(h%12) - 6*m); if(naive>180) naive=360-naive;
    out.push(IQ_mkQ({
      id:'num-clock-'+i, category:'numeric', difficulty:4, render:'text',
      prompt: IQ_L(
        'Ghadi mein '+h+':'+String(m).padStart(2,'0')+' baje hai. Hour aur minute hand ke beech kitne degree ka angle hai?',
        'A clock shows '+h+':'+String(m).padStart(2,'0')+'. What is the angle between the hour and minute hands?'),
      payload:{},
      options: IQ_numOpts(ans, [
        [naive,'near-miss'],
        [ans+5,'off-by-one'],
        [180-ans>0?180-ans:ans+15,'reverse']
      ]).map(o=>({ ...o, label: IQ_L(IQ_tx(o.label,'hi')+'°') })),
      explanation: IQ_L(
        'Minute hand '+(6*m)+'° par hai. Hour hand '+(30*(h%12))+'° + '+m+'×0.5 = '+(30*(h%12)+0.5*m)+'° par hai (wo bhi khiskta hai!). Farak = '+ans+'°.',
        'The minute hand sits at '+(6*m)+'°. The hour hand sits at '+(30*(h%12))+'° + '+m+'×0.5 = '+(30*(h%12)+0.5*m)+'° — it drifts too. The gap is '+ans+'°.')
    }));
  });
  return out;
}

/* N11 · calendar / day-of-week arithmetic. */
function IQ_famCalendar(rng, n){
  const DAYS=[ IQ_L('Somvaar (Mon)','Monday'), IQ_L('Mangalvaar (Tue)','Tuesday'),
               IQ_L('Budhvaar (Wed)','Wednesday'), IQ_L('Guruvaar (Thu)','Thursday'),
               IQ_L('Shukravaar (Fri)','Friday'), IQ_L('Shanivaar (Sat)','Saturday'),
               IQ_L('Ravivaar (Sun)','Sunday') ];
  const out=[];
  for(let i=0;i<n;i++){
    const start = IQ_rint(rng,0,6);
    const days = IQ_rpick(rng,[23,31,40,45,52,61,75,100]);
    const ans = (start+days)%7;
    const back = ((start-days)%7+7)%7;
    const off = (ans+1)%7;
    const used = new Set([ans]);
    const opts=[{ label:DAYS[ans], correct:true }];
    [[back,'reverse'],[off,'off-by-one'],[start,'surface']].forEach(t=>{
      if(!used.has(t[0]) && opts.length<4){ used.add(t[0]); opts.push({ label:DAYS[t[0]], trap:t[1] }); }
    });
    let f=0;
    while(opts.length<4){ if(!used.has(f)){ used.add(f); opts.push({ label:DAYS[f], trap:'surface' }); } f++; }
    out.push(IQ_mkQ({
      id:'num-cal-'+i, category:'numeric', difficulty:3, render:'text',
      prompt: IQ_L(
        'Aaj '+IQ_tx(DAYS[start],'hi')+' hai. Aaj se '+days+' din baad kaunsa din hoga?',
        'Today is '+IQ_tx(DAYS[start],'en')+'. What day will it be '+days+' days from now?'),
      payload:{},
      options: opts,
      explanation: IQ_L(
        'Har 7 din baad wahi din aata hai. '+days+' ÷ 7 ka remainder '+(days%7)+' hai, isliye '+IQ_tx(DAYS[start],'hi')+' se '+(days%7)+' din aage = '+IQ_tx(DAYS[ans],'hi')+'.',
        'The week repeats every 7 days. '+days+' ÷ 7 leaves a remainder of '+(days%7)+', so count '+(days%7)+' days on from '+IQ_tx(DAYS[start],'en')+' → '+IQ_tx(DAYS[ans],'en')+'.')
    }));
  }
  return out;
}

/* N12 · syllogisms with abstract letters (no world knowledge needed). */
function IQ_famSyllogism(rng, n){
  const sets=[['P','Q','R'],['X','Y','Z'],['M','N','O']];
  const forms=[
    (s)=>({
      diff:4,
      prem: IQ_L('Sabhi '+s[0]+', '+s[1]+' hain. Sabhi '+s[1]+', '+s[2]+' hain.',
                 'All '+s[0]+' are '+s[1]+'. All '+s[1]+' are '+s[2]+'.'),
      correct: IQ_L('Sabhi '+s[0]+', '+s[2]+' hain.','All '+s[0]+' are '+s[2]+'.'),
      wrong:[
        [IQ_L('Sabhi '+s[2]+', '+s[0]+' hain.','All '+s[2]+' are '+s[0]+'.'),'reverse'],
        [IQ_L('Koi '+s[0]+', '+s[2]+' nahi hai.','No '+s[0]+' are '+s[2]+'.'),'surface'],
        [IQ_L('Kuch '+s[2]+', '+s[0]+' nahi hain.','Some '+s[2]+' are not '+s[0]+'.'),'over']
      ],
      exp: IQ_L('Har '+s[0]+' pehle '+s[1]+' banta hai aur har '+s[1]+' '+s[2]+' hai — chain sirf ek hi direction mein chalti hai.',
                'Every '+s[0]+' is a '+s[1]+', and every '+s[1]+' is a '+s[2]+' — the chain only runs one way.')
    }),
    (s)=>({
      diff:5,
      prem: IQ_L('Sabhi '+s[0]+', '+s[1]+' hain. Kuch '+s[1]+', '+s[2]+' hain.',
                 'All '+s[0]+' are '+s[1]+'. Some '+s[1]+' are '+s[2]+'.'),
      correct: IQ_L('In dono se kuch bhi pakka nahi kaha ja sakta.','Nothing certain follows.'),
      wrong:[
        [IQ_L('Kuch '+s[0]+', '+s[2]+' hain.','Some '+s[0]+' are '+s[2]+'.'),'over'],
        [IQ_L('Sabhi '+s[0]+', '+s[2]+' hain.','All '+s[0]+' are '+s[2]+'.'),'surface'],
        [IQ_L('Koi '+s[0]+', '+s[2]+' nahi hai.','No '+s[0]+' are '+s[2]+'.'),'reverse']
      ],
      exp: IQ_L('Jo kuch '+s[1]+', '+s[2]+' hain wo saare '+s[0]+' ke bahar bhi ho sakte hain. Overlap zaroori nahi hai.',
                'The '+s[1]+' that are '+s[2]+' might all sit outside '+s[0]+'. The overlap is not guaranteed.')
    }),
    (s)=>({
      diff:4,
      prem: IQ_L('Koi '+s[0]+', '+s[1]+' nahi hai. Sabhi '+s[2]+', '+s[0]+' hain.',
                 'No '+s[0]+' are '+s[1]+'. All '+s[2]+' are '+s[0]+'.'),
      correct: IQ_L('Koi '+s[2]+', '+s[1]+' nahi hai.','No '+s[2]+' are '+s[1]+'.'),
      wrong:[
        [IQ_L('Kuch '+s[2]+', '+s[1]+' hain.','Some '+s[2]+' are '+s[1]+'.'),'reverse'],
        [IQ_L('Sabhi '+s[1]+', '+s[2]+' hain.','All '+s[1]+' are '+s[2]+'.'),'surface'],
        [IQ_L('Kuch '+s[0]+', '+s[1]+' hain.','Some '+s[0]+' are '+s[1]+'.'),'over']
      ],
      exp: IQ_L('Saare '+s[2]+' '+s[0]+' ke andar hain, aur '+s[0]+' '+s[1]+' se poori tarah alag hai — isliye '+s[2]+' bhi alag rahenge.',
                'Every '+s[2]+' sits inside '+s[0]+', and '+s[0]+' is completely separate from '+s[1]+' — so '+s[2]+' must be separate too.')
    })
  ];
  const out=[];
  for(let i=0;i<n;i++){
    const s = IQ_rpick(rng, sets);
    const f = forms[i % forms.length](s);
    out.push(IQ_mkQ({
      id:'num-syl-'+i, category:'numeric', difficulty:f.diff, render:'text',
      prompt: IQ_L(IQ_tx(f.prem,'hi')+' In statements se kya pakka nikalta hai?',
                   IQ_tx(f.prem,'en')+' What definitely follows?'),
      payload:{},
      options: [{ label:f.correct, correct:true }].concat(f.wrong.map(w=>({ label:w[0], trap:w[1] }))),
      explanation: f.exp
    }));
  }
  return out;
}

/* N13 · age problem with an integer solution. */
function IQ_famAge(rng, n){
  const combos=[ [3,2,5],[4,3,4],[5,3,6],[3,2,10],[4,2,6] ];
  const out=[];
  for(let i=0;i<n;i++){
    const cm = combos[(i+IQ_rint(rng,0,4)) % combos.length];
    const k=cm[0], m=cm[1], t=cm[2];
    const B = t*(m-1)/(k-m);
    const A = k*B;
    out.push(IQ_mkQ({
      id:'num-age-'+i, category:'numeric', difficulty:4, render:'text',
      prompt: IQ_L(
        'Aaj Anil ki umar Bhavna se '+k+' guna hai. '+t+' saal baad wo sirf '+m+' guna reh jaayegi. Bhavna ki abhi umar kya hai?',
        'Today Anil is '+k+' times as old as Bhavna. In '+t+' years he will be only '+m+' times her age. How old is Bhavna now?'),
      payload:{},
      options: IQ_numOpts(B, [
        [A,'near-miss'],
        [B+t,'reverse'],
        [B+1,'off-by-one']
      ]).map(o=>({ ...o, label: IQ_L(IQ_tx(o.label,'hi')+(IQ_tx(o.label,'hi')==='1'?' saal':' saal'), IQ_tx(o.label,'en')+' years') })),
      explanation: IQ_L(
        'Maano Bhavna = b. To '+k+'b + '+t+' = '+m+'(b + '+t+') → b = '+B+'. (Anil abhi '+A+' saal ka hai.)',
        'Let Bhavna be b. Then '+k+'b + '+t+' = '+m+'(b + '+t+') → b = '+B+'. (Anil is '+A+' today.)')
    }));
  }
  return out;
}

/* ---------------------------------------------------------------------------
 *  3.4 VERBAL CLASSIFICATION & MEMORY
 * ------------------------------------------------------------------------- */

/* V1 · odd-one-out by a hidden attribute (curated, bilingual). */
const IQ_ODD_ITEMS = [
  { id:'fruit', d:1,
    correct:[IQ_L('Gajar','Carrot'),'sabzi hai'],
    wrong:[[IQ_L('Aam','Mango')],[IQ_L('Kela','Banana')],[IQ_L('Seb','Apple')]],
    exp:IQ_L('Baaki teen fal hain; gajar ek sabzi hai.','The other three are fruits; a carrot is a vegetable.') },
  { id:'sport', d:2,
    correct:[IQ_L('Shatranj (Chess)','Chess')],
    wrong:[[IQ_L('Cricket','Cricket')],[IQ_L('Hockey','Hockey')],[IQ_L('Football','Football')]],
    exp:IQ_L('Baaki teen maidan mein khele jaane wale physical games hain; chess board par baith kar khela jaata hai.','The other three are outdoor field sports; chess is played sitting at a board.') },
  { id:'metal', d:3,
    correct:[IQ_L('Heera (Diamond)','Diamond')],
    wrong:[[IQ_L('Tamba (Copper)','Copper')],[IQ_L('Loha (Iron)','Iron')],[IQ_L('Sona (Gold)','Gold')]],
    exp:IQ_L('Baaki teen dhaatu (metal) hain; heera carbon ka crystal hai, metal nahi.','The other three are metals; a diamond is a crystal of carbon, not a metal.') },
  { id:'bird', d:3,
    correct:[IQ_L('Chamgadar (Bat)','Bat')],
    wrong:[[IQ_L('Kabootar (Pigeon)','Pigeon')],[IQ_L('Tota (Parrot)','Parrot')],[IQ_L('Kauwa (Crow)','Crow')]],
    exp:IQ_L('Sab udte hain — ye obvious cheez hai. Chhupa hua rule: baaki teen pakshi hain, chamgadar stanpayi (mammal) hai.','They all fly — that is the obvious link. The hidden one: the other three are birds, while a bat is a mammal.') },
  { id:'instr', d:3,
    correct:[IQ_L('Tabla','Tabla')],
    wrong:[[IQ_L('Guitar','Guitar')],[IQ_L('Sitar','Sitar')],[IQ_L('Violin','Violin')]],
    exp:IQ_L('Baaki teen taar (string) waale instrument hain; tabla peet kar bajta hai.','The other three are string instruments; the tabla is a percussion instrument.') },
  { id:'city', d:1,
    correct:[IQ_L('Nepal','Nepal')],
    wrong:[[IQ_L('Delhi','Delhi')],[IQ_L('Mumbai','Mumbai')],[IQ_L('Chennai','Chennai')]],
    exp:IQ_L('Baaki teen shehar hain; Nepal ek desh hai.','The other three are cities; Nepal is a country.') },
  { id:'sense', d:3,
    correct:[IQ_L('Haath (Hand)','Hand')],
    wrong:[[IQ_L('Aankh (Eye)','Eye')],[IQ_L('Kaan (Ear)','Ear')],[IQ_L('Naak (Nose)','Nose')]],
    exp:IQ_L('Sab body parts hain — ye obvious hai. Chhupa hua rule: baaki teen sar par hain aur gyanendriya (sense organ) hain.','They are all body parts — that is the obvious link. The hidden rule: the other three are sense organs on the head.') },
  { id:'month', d:4,
    correct:[IQ_L('June','June')],
    wrong:[[IQ_L('January','January')],[IQ_L('March','March')],[IQ_L('July','July')]],
    exp:IQ_L('Chhupa hua rule mahine ka naam nahi, din hain: January, March aur July mein 31 din hote hain; June mein 30.','The hidden attribute is not the name but the length: January, March and July have 31 days; June has 30.') },
  { id:'shape', d:2,
    correct:[IQ_L('Tribhuj (Triangle)','Triangle')],
    wrong:[[IQ_L('Varg (Square)','Square')],[IQ_L('Aayat (Rectangle)','Rectangle')],[IQ_L('Rhombus','Rhombus')]],
    exp:IQ_L('Baaki teen ke 4 sides hain; triangle ke 3.','The other three have 4 sides; a triangle has 3.') }
];
function IQ_famOddWords(rng, n){
  const picked = IQ_rshuffle(rng, IQ_ODD_ITEMS).slice(0,n);
  return picked.map((it,i)=> IQ_mkQ({
    id:'vb-odd-'+it.id, category:'verbal', difficulty:it.d, render:'text',
    prompt: IQ_L('Inme se kaunsa shabd baaki teen se alag hai?','Which one does not belong with the other three?'),
    payload:{},
    options: [{ label:it.correct[0], correct:true }].concat(it.wrong.map(w=>({ label:w[0], trap:'surface' }))),
    explanation: it.exp
  }));
}

/* V2 · word analogies (curated, bilingual). */
const IQ_ANALOGY_ITEMS = [
  { id:'doc', d:1, a:IQ_L('Doctor','Doctor'), b:IQ_L('Hospital','Hospital'), c:IQ_L('Teacher','Teacher'),
    correct:IQ_L('School','School'),
    wrong:[[IQ_L('Student','Student'),'surface'],[IQ_L('Kitaab (Book)','Book'),'near-miss'],[IQ_L('Hospital','Hospital'),'reverse']],
    exp:IQ_L('Rishta hai "kaam karne ki jagah": doctor hospital mein, teacher school mein.','The relation is "place of work": a doctor works in a hospital, a teacher in a school.') },
  { id:'bee', d:3, a:IQ_L('Chidiya (Bird)','Bird'), b:IQ_L('Ghosla (Nest)','Nest'), c:IQ_L('Madhumakhi (Bee)','Bee'),
    correct:IQ_L('Chhatta (Hive)','Hive'),
    wrong:[[IQ_L('Shahad (Honey)','Honey'),'near-miss'],[IQ_L('Phool (Flower)','Flower'),'surface'],[IQ_L('Ped (Tree)','Tree'),'surface']],
    exp:IQ_L('Rishta "rehne ki jagah" ka hai, "banaayi hui cheez" ka nahi — chidiya ka ghosla, madhumakhi ka chhatta.','The relation is "home", not "product" — a bird lives in a nest, a bee in a hive.') },
  { id:'knife', d:2, a:IQ_L('Pen','Pen'), b:IQ_L('Likhna (Write)','Write'), c:IQ_L('Chaaku (Knife)','Knife'),
    correct:IQ_L('Kaatna (Cut)','Cut'),
    wrong:[[IQ_L('Tez (Sharp)','Sharp'),'surface'],[IQ_L('Rasoi (Kitchen)','Kitchen'),'surface'],[IQ_L('Dhaatu (Metal)','Metal'),'surface']],
    exp:IQ_L('Rishta "cheez : uska kaam" hai. Pen se likhte hain, chaaku se kaatte hain.','The relation is "tool : its function". A pen writes, a knife cuts.') },
  { id:'thirst', d:3, a:IQ_L('Bhookh (Hunger)','Hunger'), b:IQ_L('Khaana (Food)','Food'), c:IQ_L('Pyaas (Thirst)','Thirst'),
    correct:IQ_L('Paani (Water)','Water'),
    wrong:[[IQ_L('Glass','Glass'),'surface'],[IQ_L('Doodh (Milk)','Milk'),'near-miss'],[IQ_L('Peena (Drink)','Drink'),'reverse']],
    exp:IQ_L('Rishta "zaroorat : usko mitane wali cheez" hai. Bhookh khaane se mitti hai, pyaas paani se.','The relation is "need : what satisfies it". Hunger is satisfied by food, thirst by water.') },
  { id:'glove', d:2, a:IQ_L('Pair (Foot)','Foot'), b:IQ_L('Joota (Shoe)','Shoe'), c:IQ_L('Haath (Hand)','Hand'),
    correct:IQ_L('Dastana (Glove)','Glove'),
    wrong:[[IQ_L('Ungli (Finger)','Finger'),'surface'],[IQ_L('Ring','Ring'),'near-miss'],[IQ_L('Ghadi (Watch)','Watch'),'surface']],
    exp:IQ_L('Rishta "body part : usko poora dhakne wala kapda" hai — pair par joota, haath par dastana.','The relation is "body part : the garment that covers it fully" — a shoe on the foot, a glove on the hand.') },
  { id:'season', d:3, a:IQ_L('Din (Day)','Day'), b:IQ_L('Raat (Night)','Night'), c:IQ_L('Garmi (Summer)','Summer'),
    correct:IQ_L('Sardi (Winter)','Winter'),
    wrong:[[IQ_L('Barsaat (Rain)','Rain'),'near-miss'],[IQ_L('Garam (Hot)','Hot'),'surface'],[IQ_L('Mausam (Season)','Season'),'reverse']],
    exp:IQ_L('Rishta "bilkul ulta jodi" ka hai: din–raat, garmi–sardi.','The relation is "direct opposite pair": day–night, summer–winter.') }
];
function IQ_famAnalogyWords(rng, n){
  const picked = IQ_rshuffle(rng, IQ_ANALOGY_ITEMS).slice(0,n);
  return picked.map(it=> IQ_mkQ({
    id:'vb-anal-'+it.id, category:'verbal', difficulty:it.d, render:'text',
    prompt: IQ_L(
      IQ_tx(it.a,'hi')+' : '+IQ_tx(it.b,'hi')+'  ::  '+IQ_tx(it.c,'hi')+' : ?',
      IQ_tx(it.a,'en')+' : '+IQ_tx(it.b,'en')+'  ::  '+IQ_tx(it.c,'en')+' : ?'),
    payload:{},
    options: [{ label:it.correct, correct:true }].concat(it.wrong.map(w=>({ label:w[0], trap:w[1] }))),
    explanation: it.exp
  }));
}

/* V3 · letter coding-decoding (shift cipher). */
function IQ_famLetterCoding(rng, n){
  const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const words=['BOOK','LAMP','FISH','RICE','MIND','GOLD','WIND','SALT','CARD','NOTE'];
  const shift=(w,k)=>w.split('').map(ch=>A[(A.indexOf(ch)+k+26)%26]).join('');
  const out=[];
  for(let i=0;i<n;i++){
    const pair = IQ_rshuffle(rng, words).slice(0,2);
    const k = IQ_rint(rng,1,3);
    const ans = shift(pair[1], k);
    const partial = shift(pair[1][0],k) + pair[1].slice(1);
    out.push(IQ_mkQ({
      id:'vb-code-'+i, category:'verbal', difficulty: k===1?3:(k===3?5:4), render:'text',
      prompt: IQ_L(
        'Agar '+pair[0]+' ko '+shift(pair[0],k)+' likha jaata hai, to '+pair[1]+' kaise likha jaayega?',
        'If '+pair[0]+' is written as '+shift(pair[0],k)+', how is '+pair[1]+' written?'),
      payload:{},
      options:[
        { label: IQ_L(ans), correct:true },
        { label: IQ_L(shift(pair[1],-k)), trap:'reverse' },
        { label: IQ_L(shift(pair[1],k+1)), trap:'off-by-one' },
        { label: IQ_L(partial), trap:'near-miss' }
      ],
      explanation: IQ_L(
        'Har letter alphabet mein '+k+' step aage khiskta hai (A→'+A[k]+'). '+pair[1]+' → '+ans+'.',
        'Every letter moves '+k+' step'+(k>1?'s':'')+' forward in the alphabet (A→'+A[k]+'). '+pair[1]+' → '+ans+'.')
    }));
  }
  return out;
}

/* V4 · short-term memory recall: a sequence is shown, then asked back. */
function IQ_famMemory(rng, n){
  const LETTERS='BCDFGHJKLMNPQRSTVWXZ';
  const out=[];
  for(let i=0;i<n;i++){
    const len = 5 + (i>=2 ? 1 : 0) + (i>=4 ? 1 : 0);
    const seq=[];
    while(seq.length<len){
      const ch = (seq.length%2===0)
        ? LETTERS[IQ_rint(rng,0,LETTERS.length-1)]
        : String(IQ_rint(rng,1,9));
      if(seq.indexOf(ch)<0) seq.push(ch);
    }
    const mode = i % 3;
    const content = seq.join(' ');
    let prompt, correct, wrongs;
    if(mode===0){
      const pos = IQ_rint(rng,2,len-1);
      const ordM = ['pehla','doosra','teesra','chautha','paanchva','chhatva','saatva'][pos] || (pos+1)+'-va';
      prompt = IQ_L('Us sequence mein '+ordM+' item kaunsa tha?','Which item was in position '+(pos+1)+' of that sequence?');
      correct = seq[pos];
      wrongs = [[seq[pos-1],'off-by-one'],[seq[pos+1]!=null?seq[pos+1]:seq[0],'off-by-one'],[seq[0],'reverse']];
    }else if(mode===1){
      const poolAll = LETTERS.split('').concat('123456789'.split(''));
      const missing = poolAll.filter(ch=>seq.indexOf(ch)<0);
      prompt = IQ_L('In me se kaunsa item us sequence mein NAHI tha?','Which of these was NOT in the sequence?');
      correct = missing[IQ_rint(rng,0,missing.length-1)];
      wrongs = [[seq[1],'surface'],[seq[len-1],'near-miss'],[seq[0],'reverse']];
    }else{
      prompt = IQ_L('Us sequence ka aakhri item kaunsa tha?','What was the LAST item of the sequence?');
      correct = seq[len-1];
      wrongs = [[seq[len-2],'off-by-one'],[seq[0],'reverse'],[seq[1],'surface']];
    }
    const used=new Set([correct]);
    const opts=[{ label: IQ_L(correct), correct:true }];
    for(const w of wrongs){
      if(w[0]!=null && !used.has(w[0]) && opts.length<4){ used.add(w[0]); opts.push({ label: IQ_L(w[0]), trap:w[1] }); }
    }
    let f=0;
    while(opts.length<4){
      const ch = LETTERS[f++];
      if(!used.has(ch)){ used.add(ch); opts.push({ label: IQ_L(ch), trap:'surface' }); }
    }
    out.push(IQ_mkQ({
      id:'vb-mem-'+i, category:'verbal', difficulty: len<=5?2:(len===6?3:5), render:'memory',
      prompt: prompt,
      payload:{ memoryContent:content, memoryDurationMs: 2600 + len*250 },
      options: opts,
      explanation: IQ_L(
        'Sequence thi: '+content+'. Chhote tukdon (chunks) mein yaad karne se recall behtar hota hai.',
        'The sequence was: '+content+'. Grouping items into small chunks makes recall far easier.')
    }));
  }
  return out;
}

/* V5 · dictionary ordering. */
function IQ_famDictOrder(rng, n){
  const words=['Anchor','Basket','Candle','Danger','Engine','Forest','Garden','Hammer','Island','Jacket','Kettle','Ladder'];
  const out=[];
  for(let i=0;i<n;i++){
    const four = IQ_rshuffle(rng, words).slice(0,4);
    const sorted = four.slice().sort();
    const askPos = IQ_rint(rng,1,3);            /* 2nd or 3rd or 4th word */
    const ans = sorted[askPos];
    const ordHi = ['pehla','doosra','teesra','chautha'][askPos];
    const ordEn = ['1st','2nd','3rd','4th'][askPos];
    out.push(IQ_mkQ({
      id:'vb-dict-'+i, category:'verbal', difficulty:3, render:'text',
      prompt: IQ_L(
        'In shabdon ko dictionary (A→Z) order mein rakho. '+ordHi+' shabd kaunsa hoga?  ['+four.join(', ')+']',
        'Put these words in dictionary (A→Z) order. Which word comes '+ordEn+'?  ['+four.join(', ')+']'),
      payload:{},
      options: four.map(w=>({
        label: IQ_L(w),
        correct: w===ans ? true : undefined,
        trap: w===ans ? undefined : (w===sorted[askPos-1] || w===sorted[askPos+1] ? 'off-by-one' : 'surface')
      })),
      explanation: IQ_L(
        'A→Z order: '+sorted.join(' < ')+'. Isliye '+ordHi+' shabd '+ans+' hai.',
        'In A→Z order: '+sorted.join(' < ')+'. So the word at position '+(askPos+1)+' is '+ans+'.')
    }));
  }
  return out;
}

/* V6 · family-relation puzzles (curated, unambiguous by construction). */
const IQ_REL_ITEMS = [
  { id:'sister', d:3,
    prompt:IQ_L('Sita ke pita ke ekmatra bete ka naam Raj hai. Raj, Sita ka kya lagta hai?',
                'The only son of Sita\u2019s father is named Raj. What is Raj to Sita?'),
    correct:IQ_L('Uska bhai','Her brother'),
    wrong:[[IQ_L('Uske pita','Her father'),'reverse'],[IQ_L('Uska beta','Her son'),'surface'],[IQ_L('Uska chacha','Her uncle'),'surface']],
    exp:IQ_L('Ek hi pita ke bachche = bhai-behen. Raj us pita ka beta hai, isliye Sita ka bhai.',
             'Children of the same father are siblings. Raj is that father\u2019s son, so he is Sita\u2019s brother.') },
  { id:'mama', d:4,
    prompt:IQ_L('Amit, Bina ka beta hai. Bina, Chetan ki behen hai. Chetan, Amit ka kya lagta hai?',
                'Amit is Bina\u2019s son. Bina is Chetan\u2019s sister. What is Chetan to Amit?'),
    correct:IQ_L('Uska mama (maa ka bhai)','His maternal uncle (mother\u2019s brother)'),
    wrong:[[IQ_L('Uske pita','His father'),'surface'],[IQ_L('Uska bhai','His brother'),'reverse'],[IQ_L('Uska chacha (pita ka bhai)','His paternal uncle (father\u2019s brother)'),'near-miss']],
    exp:IQ_L('Chetan, Amit ki maa (Bina) ka bhai hai — yaani mama, chacha nahi.',
             'Chetan is the brother of Amit\u2019s mother, which makes him the maternal uncle — not the father\u2019s brother.') },
  { id:'grand', d:3,
    prompt:IQ_L('Ravi ke pita, Mohan ke beta hain. Mohan, Ravi ka kya lagta hai?',
                'Ravi\u2019s father is Mohan\u2019s son. What is Mohan to Ravi?'),
    correct:IQ_L('Uske dada','His grandfather'),
    wrong:[[IQ_L('Uske pita','His father'),'near-miss'],[IQ_L('Uska bhai','His brother'),'surface'],[IQ_L('Uska beta','His son'),'reverse']],
    exp:IQ_L('Ravi → pita → Mohan: do generation upar, isliye Mohan dada hue.',
             'Ravi → father → Mohan is two generations up, so Mohan is the grandfather.') },
  { id:'bua', d:4,
    prompt:IQ_L('Neha, Kiran ki beti hai. Kiran, Suresh ki patni hai. Suresh ki behen Priya, Neha ki kya lagti hai?',
                'Neha is Kiran\u2019s daughter. Kiran is Suresh\u2019s wife. Suresh\u2019s sister Priya is what to Neha?'),
    correct:IQ_L('Uski bua (pita ki behen)','Her paternal aunt (father\u2019s sister)'),
    wrong:[[IQ_L('Uski maasi (maa ki behen)','Her maternal aunt (mother\u2019s sister)'),'reverse'],[IQ_L('Uski behen','Her sister'),'surface'],[IQ_L('Uski maa','Her mother'),'surface']],
    exp:IQ_L('Suresh, Neha ke pita hain (Kiran ke pati). Unki behen matlab pita ki behen = bua.',
             'Suresh is Neha\u2019s father (Kiran\u2019s husband), so his sister is the father\u2019s sister — the paternal aunt.') }
];
function IQ_famRelations(rng, n){
  return IQ_rshuffle(rng, IQ_REL_ITEMS).slice(0,n).map(it=> IQ_mkQ({
    id:'vb-rel-'+it.id, category:'verbal', difficulty:it.d, render:'text',
    prompt:it.prompt, payload:{},
    options: [{ label:it.correct, correct:true }].concat(it.wrong.map(w=>({ label:w[0], trap:w[1] }))),
    explanation: it.exp
  }));
}

/* ---------------------------------------------------------------------------
 *  3.5 BANK BUILDER + DEV ASSERTIONS
 * ------------------------------------------------------------------------- */

const IQ_FAMILIES = [
  /* pattern */
  [IQ_famMatrixCount, 4], [IQ_famMatrixRotation, 4], [IQ_famMatrixXor, 3],
  [IQ_famMatrixShade, 2], [IQ_famSeqRotation, 4], [IQ_famSeqAlternate, 3],
  [IQ_famOddMirror, 3], [IQ_famOddSides, 2], [IQ_famSeqCount, 2],
  /* spatial */
  [IQ_famMirror, 5], [IQ_famRotationMatch, 4], [IQ_famPaperFold, 4],
  [IQ_famCubeNet, 5], [IQ_famDirections, 4], [IQ_famCrossSection, 3],
  /* numeric */
  [IQ_famSeries2, 4], [IQ_famSeriesAlt, 3], [IQ_famSeriesTwist, 2],
  [IQ_famLetterSeries, 3], [IQ_famAnalogy, 4], [IQ_famCoding, 3],
  [IQ_famBalance, 2], [IQ_famDeduction, 4], [IQ_famRate, 2],
  [IQ_famClock, 2], [IQ_famCalendar, 2], [IQ_famSyllogism, 3], [IQ_famAge, 2],
  /* verbal */
  [IQ_famOddWords, 8], [IQ_famAnalogyWords, 6], [IQ_famLetterCoding, 4],
  [IQ_famMemory, 5], [IQ_famDictOrder, 3], [IQ_famRelations, 4]
];

/* Build the whole bank from one seed. Same seed → identical bank (replayable);
 * a new seed reshuffles the parameters of every family. */
function IQ_buildBank(seed){
  const rng = IQ_rng(seed || 20260817);
  let bank = [];
  for(const f of IQ_FAMILIES) bank = bank.concat(f[0](rng, f[1]));

  /* Answer-position balance: hand out target positions in shuffled blocks of
   * four, so A/B/C/D each hold the correct answer ~25% of the time. */
  const targets=[];
  while(targets.length < bank.length) targets.push.apply(targets, IQ_rshuffle(rng,[0,1,2,3]));
  bank.forEach((q,i)=> IQ_finalizeQuestion(q, targets[i]));
  return bank;
}

/* Dev assertion — every question must carry both languages everywhere, exactly
 * one correct option, a trap tag on every wrong option and a sane difficulty. */
function IQ_validateBank(bank){
  const problems=[];
  const seenIds=new Set();
  const bothOk = node => !!(node && typeof node==='object' &&
    typeof node.hi==='string' && node.hi.trim() &&
    typeof node.en==='string' && node.en.trim());
  bank.forEach(q=>{
    const at = m => problems.push(q.id + ': ' + m);
    if(!q.id) problems.push('question without an id');
    if(seenIds.has(q.id)) at('duplicate id');
    seenIds.add(q.id);
    if(IQ_CAT_KEYS.indexOf(q.category)<0) at('unknown category ' + q.category);
    if(!(q.difficulty>=IQ_BANDS.min && q.difficulty<=IQ_BANDS.max)) at('difficulty out of range');
    if(!bothOk(q.prompt)) at('prompt is missing hi/en');
    if(!bothOk(q.explanation)) at('explanation is missing hi/en');
    if(!q.options || q.options.length!==4) at('needs exactly 4 options');
    const correct=(q.options||[]).filter(o=>o.correct);
    if(correct.length!==1) at('must have exactly one correct option, found '+correct.length);
    (q.options||[]).forEach((o,i)=>{
      if(!o.id) at('option '+i+' has no id');
      if(o.label!=null && !bothOk(o.label)) at('option '+i+' label is missing hi/en');
      if(o.label==null && o.spec==null && o.holes==null) at('option '+i+' has no renderable content');
      if(!o.correct && IQ_TRAPS.indexOf(o.trap)<0) at('option '+i+' has no valid trap tag');
    });
    if(!q.correct || !(q.options||[]).some(o=>o.id===q.correct)) at('correct id does not point at an option');
    if(!(q.timeLimit>=10 && q.timeLimit<=40)) at('time limit out of range');
    if(q.render==='memory' && !bothOk(q.prompt)) at('memory item without a bilingual question');
  });
  return problems;
}

/* Loud-but-safe boot check (never breaks the app in production). */
const IQ_QUESTIONS = IQ_buildBank(1);
(function(){
  try{
    const problems = IQ_validateBank(IQ_QUESTIONS);
    if(problems.length && typeof console!=='undefined'){
      console.error('[iqtest] BANK VALIDATION FAILED ('+problems.length+' problems):\n - '+problems.slice(0,20).join('\n - '));
    }
    if(IQ_QUESTIONS.length < 60 && typeof console!=='undefined'){
      console.error('[iqtest] bank too small: '+IQ_QUESTIONS.length+' (need >= 60)');
    }
  }catch(e){ /* never block the game on a dev check */ }
})();

/* ============================================================================
 *  SECTION 4 — ADAPTIVE ENGINE (CAT-style)
 *  ---------------------------------------------------------------------------
 *   · start at band 2
 *   · 2 correct in a row → +1 band     · 1 wrong → −1 band
 *   · never more than one band at a time, clamped to the bank's range
 *   · categories rotate in shuffled blocks so the mix stays balanced while the
 *     difficulty adapts
 * ========================================================================== */
function IQ_makeRun(bank, opts){
  const o = opts||{};
  const total = o.total || IQ_N;
  const rng = IQ_rng(o.seed || 1);
  const state = {
    seed:o.seed||1, total, band:o.startBand||2, run:0, maxBand:o.startBand||2,
    used:new Set(), queue:[], served:[], bandTrace:[]
  };

  function refillQueue(){
    state.queue = state.queue.concat(IQ_rshuffle(rng, IQ_CAT_KEYS));
  }

  function nextCategory(){
    if(!state.queue.length) refillQueue();
    return state.queue.shift();
  }

  function pickFrom(pool){
    /* Prefer the current band, but keep a slightly wider window open so two
     * runs by the same player never serve the same paper. */
    if(!pool.length) return null;
    let bestD = Infinity;
    for(const q of pool) bestD = Math.min(bestD, Math.abs(q.difficulty - state.band));
    const exact = pool.filter(q => Math.abs(q.difficulty - state.band) === bestD);
    const near  = pool.filter(q => Math.abs(q.difficulty - state.band) <= bestD + 1);
    const bucket = (rng() < 0.6 || !near.length) ? exact : near;
    return bucket[Math.floor(rng()*bucket.length)];
  }

  return {
    state,
    /* how many questions are still to come */
    remaining(){ return total - state.served.length; },
    next(){
      if(state.served.length >= total) return null;
      let cat = nextCategory(), q = null, tries = 0;
      while(!q && tries < IQ_CAT_KEYS.length+1){
        const pool = bank.filter(x => x.category===cat && !state.used.has(x.id));
        q = pickFrom(pool);
        if(!q){ cat = nextCategory(); tries++; }
      }
      if(!q) q = pickFrom(bank.filter(x=>!state.used.has(x.id)));
      if(!q) return null;
      state.used.add(q.id);
      state.served.push(q);
      state.bandTrace.push(state.band);
      return q;
    },
    /* feed the result back so the next pick adapts */
    report(correct){
      if(correct){
        state.run = state.run>=0 ? state.run+1 : 1;
        if(state.run >= 2){ state.band = IQ_clamp(state.band+1, IQ_BANDS.min, IQ_BANDS.max); state.run = 0; }
      }else{
        state.band = IQ_clamp(state.band-1, IQ_BANDS.min, IQ_BANDS.max);
        state.run = 0;
      }
      state.maxBand = Math.max(state.maxBand, state.band);
      return state.band;
    }
  };
}

/* ============================================================================
 *  SECTION 5 — SCORING
 *  ---------------------------------------------------------------------------
 *  Per item:  correct → weight(d) × (1 + speed bonus, capped at +20%)
 *             wrong   → −weight(d)/3   (classic guessing correction: blind
 *                       guessing on 4 options is worth exactly 0 on average, so
 *                       hammering hard items can never beat steady accuracy)
 *             timeout / skip → 0
 *  The difficulty-weighted raw score is normalised against a fixed reference
 *  paper (25 items at band 3) and pushed through a normal(100,15) curve.
 *  Output is strictly monotonic in the raw score and bounded to (70,145).
 * ========================================================================== */
const IQ_SPEED_CAP = 0.20;
const IQ_REF_BAND  = 3;

function IQ_itemWeight(difficulty){ return IQ_clamp(difficulty,1,5); }

function IQ_speedBonus(elapsedMs, limitMs){
  if(!(limitMs>0)) return 0;
  const left = 1 - IQ_clamp(elapsedMs/limitMs, 0, 1);
  /* only genuinely fast answers earn anything, and it is capped */
  return IQ_SPEED_CAP * IQ_clamp((left - 0.2) / 0.8, 0, 1);
}

function IQ_itemScore(res){
  const w = IQ_itemWeight(res.difficulty);
  if(res.correct) return w * (1 + IQ_speedBonus(res.elapsedMs, res.limitMs));
  if(res.timedOut || res.skipped) return 0;
  return -w/3;
}

/* Raw → IQ. Smooth, strictly increasing, asymptotic to 70 and 145. */
function IQ_rawToIq(raw, itemCount){
  const n = itemCount || IQ_N;
  const ref = n * IQ_REF_BAND;                 /* an all-correct band-3 paper */
  const norm = raw / (ref || 1);               /* 0.5 ≈ population average */
  const z = (norm - 0.5) / 0.25;               /* z on the ability scale */
  const iq = z <= 0 ? 100 + 30*Math.tanh(z/2)  /* → 70  */
                    : 100 + 45*Math.tanh(z/3); /* → 145 */
  return IQ_clamp(iq, 70, 145);
}

function IQ_scoreRun(results){
  const per = results.map(r=>({ r, s:IQ_itemScore(r) }));
  const raw = per.reduce((a,x)=>a+x.s, 0);
  const iq  = Math.round(IQ_rawToIq(raw, results.length));

  /* per-category IQ on exactly the same curve */
  const catIq={}, catStat={};
  IQ_CAT_KEYS.forEach(c=>{
    const sub = per.filter(x=>x.r.category===c);
    catStat[c] = { n:sub.length, correct:sub.filter(x=>x.r.correct).length };
    catIq[c] = sub.length
      ? Math.round(IQ_rawToIq(sub.reduce((a,x)=>a+x.s,0), sub.length))
      : 100;
  });

  /* a "speed" axis for the radar: how much of the clock was left on correct answers */
  const good = results.filter(r=>r.correct);
  const speedNorm = good.length
    ? good.reduce((a,r)=> a + IQ_clamp(1 - r.elapsedMs/r.limitMs, 0, 1), 0)/good.length
    : 0;
  catIq.speed = Math.round(IQ_clamp(70 + speedNorm*70, 70, 145));

  const total = results.length;
  const correct = results.filter(r=>r.correct).length;
  const avgMs = total ? results.reduce((a,r)=>a+r.elapsedMs,0)/total : 0;

  /* which trap does this player fall for most? */
  const traps={};
  results.forEach(r=>{ if(!r.correct && r.trap){ traps[r.trap]=(traps[r.trap]||0)+1; } });
  const trapTop = Object.keys(traps).sort((a,b)=>traps[b]-traps[a])[0] || null;

  return {
    iq, raw, catIq, catStat, correct, total, avgMs, traps, trapTop,
    accuracy: total ? correct/total : 0,
    pctile: IQ_bellCurvePctile(iq)
  };
}

/* ============================================================================
 *  SECTION 6 — SHARED RENDERERS (used by the test AND by review mode)
 * ========================================================================== */

function IQ_esc(s){
  return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function IQ_renderVisual(q, lang){
  const r=q.render, pl=q.payload||{};
  if(r==='matrix')    return IQ_drawMatrix(pl.rows, pl.cols, pl.cells);
  if(r==='sequence')  return IQ_drawSequence(pl.cells);
  if(r==='target')    return '<div class="iq5-target">'+IQ_optionTile(pl.target)+
                             '<div class="iq5-target-label">'+IQ_esc(IQ_t('hud.target',lang))+'</div></div>';
  if(r==='paperfold') return IQ_drawFoldSteps(pl.axis, pl.punches);
  if(r==='cubenet')   return IQ_drawCubeNet(pl.faceLabels, pl.highlight);
  return '';
}

function IQ_optionInner(o, lang){
  if(o.spec)  return IQ_optionTile(o.spec);
  if(o.holes) return IQ_drawUnfolded(o.holes);
  if(o.label) return '<span class="iq5-opt-text">'+IQ_esc(IQ_tx(o.label,lang))+'</span>';
  return IQ_placeholderTile();
}

function IQ_optionsHtml(q, lang, opts){
  const o = opts||{};
  const isText = q.options.every(x=>x.label && !x.spec && !x.holes);
  const rows = q.options.map((op,i)=>{
    const letter=String.fromCharCode(65+i);
    let cls='iq5-opt';
    if(o.reveal){
      if(op.id===q.correct) cls+=' iq5-opt-correct';
      else if(op.id===o.chosenId) cls+=' iq5-opt-wrong';
    }
    return '<button class="'+cls+'" type="button" data-id="'+op.id+'" data-i="'+i+'" '+
             (o.disabled?'disabled ':'')+'aria-label="Option '+letter+'">'+
             '<span class="iq5-opt-letter">'+letter+'</span>'+
             '<span class="iq5-opt-body">'+IQ_optionInner(op, lang)+'</span>'+
           '</button>';
  }).join('');
  return '<div class="iq5-opts '+(isText?'iq5-opts-text':'iq5-opts-vis')+'">'+rows+'</div>';
}

/* ============================================================================
 *  SECTION 7 — MAIN GAME
 * ========================================================================== */
function playIQTest(body, setScore, end, wrap, startClock){

  let lang = IQ_lang();
  /* Every run is seeded, and the seed is stored — set window.__IQ_SEED__ (or
   * localStorage nz_iq_seed_force) to replay an exact session while debugging. */
  let seed = (Date.now() ^ Math.floor(Math.random()*1e9)) >>> 0;
  try{
    const forced = (typeof window!=='undefined' && window.__IQ_SEED__) || S('nz_iq_seed_force');
    if(forced) seed = (forced>>>0);
  }catch(e){}
  try{ setS('nz_iq_seed', seed); }catch(e){}

  const bank = IQ_buildBank(seed);
  const run  = IQ_makeRun(bank, { seed, total: IQ_N });

  const state = {
    idx:0, current:null, totalRaw:0, streak:0, bestStreak:0, skipsLeft:1,
    results:[], timer:null, timerHandle:null,
    cbSafe: !!S('nz_iq_cbsafe')
  };
  const bestIQ = S('nz_iq_best') || 0;

  let kbdHandler=null;
  const detachKbd=()=>{ if(kbdHandler){ document.removeEventListener('keydown', kbdHandler); kbdHandler=null; } };
  function _cleanup(){
    if(state.timer){ _cti(state.timer); state.timer=null; }
    detachKbd();
  }
  wrap.addEventListener('remove_game', _cleanup);

  const root = $('<div class="iq5 iq-host"></div>');
  body.appendChild(root);

  /* ------------------------------ START SCREEN ---------------------------- */
  function showStart(){
    const cls = bestIQ ? iqClassify(bestIQ) : null;
    root.innerHTML =
      '<div class="iq5-onb">'+
        '<div class="iq5-onb-hero">'+
          '<div class="iq5-onb-emoji">🧠</div>'+
          '<h2>'+IQ_esc(IQ_t('start.title',lang))+'</h2>'+
          '<p class="iq5-onb-sub">'+IQ_esc(IQ_t('start.sub',lang))+'</p>'+
          (bestIQ ? '<div class="iq5-best-chip">🏆 '+IQ_esc(IQ_t('start.best',lang))+': '+bestIQ+' · '+IQ_esc(IQ_t('cls.'+cls.key,lang))+'</div>' : '')+
        '</div>'+
        '<div class="iq5-lang">'+
          '<div class="iq5-lang-label">'+IQ_esc(IQ_t('start.langLabel',lang))+'</div>'+
          '<div class="iq5-lang-row" role="group">'+
            '<button type="button" class="iq5-lang-btn'+(lang==='hi'?' on':'')+'" data-lang="hi">'+IQ_esc(IQ_t('start.hinglish',lang))+'</button>'+
            '<button type="button" class="iq5-lang-btn'+(lang==='en'?' on':'')+'" data-lang="en">'+IQ_esc(IQ_t('start.english',lang))+'</button>'+
          '</div>'+
        '</div>'+
        '<div class="iq5-onb-cards">'+
          ['1','2','3'].map((k,i)=>
            '<div class="iq5-onb-card"><div class="iq5-onb-ico">'+['🖼️','📈','⏭️'][i]+'</div>'+
            '<div><b>'+IQ_esc(IQ_t('start.c'+k+'t',lang))+'</b><div>'+IQ_esc(IQ_t('start.c'+k+'b',lang))+'</div></div></div>').join('')+
        '</div>'+
        '<label class="iq5-onb-toggle"><input type="checkbox" id="iqCbToggle" '+(state.cbSafe?'checked':'')+'/> <span>'+IQ_esc(IQ_t('start.cb',lang))+'</span></label>'+
        '<button class="btn-primary iq5-onb-cta" id="iqOnbGo">'+IQ_esc(IQ_t('start.go',lang))+'</button>'+
      '</div>';

    root.querySelectorAll('.iq5-lang-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        lang = IQ_setLang(btn.getAttribute('data-lang'));
        try{ playSound('click'); }catch(e){}
        showStart();
      });
    });
    const cb = root.querySelector('#iqCbToggle');
    if(cb) cb.addEventListener('change', ()=>{
      state.cbSafe = cb.checked;
      try{ setS('nz_iq_cbsafe', cb.checked ? 1 : 0); }catch(e){}
    });
    root.querySelector('#iqOnbGo').addEventListener('click', ()=>{
      try{ setS('nz_iq_onboard', 1); }catch(e){}
      startTest();
    });
  }

  function startTest(){
    if(startClock) startClock();
    state.idx=0;
    nextQuestion();
  }

  function nextQuestion(){
    const q = run.next();
    if(!q){ finishTest(); return; }
    state.current = q;
    renderQuestion(q);
  }

  /* ------------------------------ QUESTION -------------------------------- */
  function renderQuestion(q){
    detachKbd();
    const catLabel = IQ_t('cat.'+q.category, lang);
    const catInfo  = IQ_CATS[q.category] || IQ_CATS.pattern;
    const diffLabel= IQ_t('diff.'+q.difficulty, lang);

    const dots = Array.from({length: IQ_N}, (_,i)=>
      '<span class="iq5-dot'+(i<state.idx?' iq5-dot-done':(i===state.idx?' iq5-dot-active':''))+'"></span>').join('');
    const ribbon = '<span class="iq5-ribbon">'+[1,2,3,4,5].map(i=>
      '<span class="iq5-ribbon-dot'+(i<=q.difficulty?' on':'')+'"></span>').join('')+'</span>';

    root.innerHTML =
      '<div class="iq5-play">'+
        '<div class="iq5-hud">'+
          '<div class="iq5-qmeta">'+
            '<span class="iq5-cat" style="background:'+catInfo.color+'22;color:'+catInfo.color+';border:1px solid '+catInfo.color+'55;">'+IQ_esc(catLabel)+'</span>'+
            '<span class="iq5-diff iq5-diff-'+Math.min(3,Math.ceil(q.difficulty*3/5))+'">'+IQ_esc(diffLabel)+'</span>'+
          '</div>'+
          '<div class="iq5-qcount">'+IQ_esc(IQ_t('hud.q',lang))+' '+(state.idx+1)+' <span>/ '+IQ_N+'</span></div>'+
        '</div>'+
        '<div class="iq5-dotrow">'+dots+'</div>'+
        '<div class="iq5-curve">'+IQ_esc(IQ_t('hud.band',lang))+' '+ribbon+'</div>'+
        '<div class="iq5-timer-wrap" id="iqTimerHost"></div>'+
        '<div class="iq5-qcard iq5-anim-in">'+
          '<div class="iq5-prompt">'+IQ_esc(IQ_tx(q.prompt,lang))+'</div>'+
          '<div class="iq5-visual" id="iqVisual"></div>'+
        '</div>'+
        '<div id="iqOptsHost"></div>'+
        '<div class="iq5-actions">'+
          '<button class="iq5-skip" type="button" id="iqSkipBtn" '+(state.skipsLeft?'':'disabled')+'>⏭ '+IQ_esc(IQ_t('hud.skip',lang))+' ('+state.skipsLeft+' '+IQ_esc(IQ_t('hud.left',lang))+')</button>'+
        '</div>'+
        '<div class="iq5-fx" id="iqFx" aria-live="polite"></div>'+
      '</div>';

    const ring = IQ_makeTimerRing(58);
    root.querySelector('#iqTimerHost').appendChild(ring.el);
    const visual  = root.querySelector('#iqVisual');
    const optsHost= root.querySelector('#iqOptsHost');

    if(q.render === 'memory'){
      renderMemoryPhase(q, ring, visual, optsHost);
    }else{
      const vis = IQ_renderVisual(q, lang);
      if(vis) visual.innerHTML = vis; else visual.style.display='none';
      paintOptions(q, optsHost);
      startTimer(q, ring, ()=> onAnswer(q, null, true, ring.currentElapsed()));
    }

    const skipBtn = root.querySelector('#iqSkipBtn');
    skipBtn.addEventListener('click', ()=>{
      if(state.skipsLeft<=0) return;
      state.skipsLeft--;
      onAnswer(q, '__skip__', false, ring.currentElapsed());
    });

    kbdHandler = ev=>{
      const k=(ev.key||'').toLowerCase();
      const map={a:0,b:1,c:2,d:3,'1':0,'2':1,'3':2,'4':3};
      if(map[k]!=null){
        const btn = root.querySelectorAll('.iq5-opt')[map[k]];
        if(btn && !btn.disabled) btn.click();
      }
    };
    document.addEventListener('keydown', kbdHandler);
  }

  /* Paint the option row and run the no-blank-tile guard over it. */
  function paintOptions(q, host){
    host.innerHTML = IQ_optionsHtml(q, lang, {});
    IQ_guardOptionTiles(host);
    host.querySelectorAll('.iq5-opt').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(btn.disabled) return;
        const elapsed = state.timerHandle ? state.timerHandle.elapsed() : 0;
        onAnswer(q, btn.getAttribute('data-id'), false, elapsed);
      });
    });
  }

  function renderMemoryPhase(q, ring, visualEl, optsHost){
    visualEl.innerHTML =
      '<div class="iq5-mem-phase">'+
        '<div class="iq5-mem-label">🧠 '+IQ_esc(IQ_t('hud.memorize',lang))+'</div>'+
        '<div class="iq5-mem-content">'+IQ_esc(q.payload.memoryContent)+'</div>'+
        '<div class="iq5-mem-progress"><span id="iqMemBar"></span></div>'+
      '</div>';
    optsHost.innerHTML='';
    const dur = q.payload.memoryDurationMs || 3500;
    const t0 = Date.now();
    const memBar = visualEl.querySelector('#iqMemBar');
    if(state.timer){ _cti(state.timer); }
    state.timer = _si(()=>{
      const el = Date.now()-t0;
      ring.set(Math.max(0,1-el/dur), Math.max(0,(dur-el)/1000));
      if(memBar) memBar.style.width = Math.min(100,100*el/dur)+'%';
      if(el>=dur){
        _cti(state.timer); state.timer=null;
        visualEl.innerHTML = '<div class="iq5-mem-question">'+IQ_esc(IQ_tx(q.prompt,lang))+'</div>';
        paintOptions(q, optsHost);
        startTimer(q, ring, ()=> onAnswer(q, null, true, ring.currentElapsed()));
      }
    }, 40);
  }

  function startTimer(q, ring, onExpire){
    const limitMs = (q.timeLimit||20)*1000;
    if(state.timer){ _cti(state.timer); }
    const t0=Date.now();
    let elapsed=0;
    state.timerHandle = { elapsed: ()=>elapsed };
    ring.currentElapsed = ()=>elapsed;
    ring.set(1, limitMs/1000);
    state.timer = _si(()=>{
      elapsed = Date.now()-t0;
      ring.set(Math.max(0,1-elapsed/limitMs), Math.max(0,(limitMs-elapsed)/1000));
      if(elapsed>=limitMs){
        _cti(state.timer); state.timer=null;
        onExpire();
      }
    }, 100);
  }

  /* ------------------------------ ANSWERING ------------------------------- */
  function onAnswer(q, chosenId, timedOut, elapsedMs){
    if(state.timer){ _cti(state.timer); state.timer=null; }
    detachKbd();

    const skipped   = chosenId === '__skip__';
    const isCorrect = !timedOut && !skipped && chosenId === q.correct;
    const limitMs   = (q.timeLimit||20)*1000;
    const chosen    = q.options.filter(o=>o.id===chosenId)[0] || null;

    const res = {
      id:q.id, category:q.category, difficulty:q.difficulty,
      correct:isCorrect, timedOut:!!timedOut, skipped:!!skipped,
      elapsedMs: IQ_clamp(elapsedMs||0, 0, limitMs), limitMs,
      chosenId: (skipped||timedOut) ? null : chosenId,
      trap: (!isCorrect && chosen) ? chosen.trap : null,
      question:q
    };
    state.results.push(res);
    run.report(isCorrect);

    const gained = IQ_itemScore(res);
    state.totalRaw += gained;
    if(isCorrect){ state.streak++; state.bestStreak=Math.max(state.bestStreak,state.streak); }
    else state.streak=0;
    setScore(Math.max(0, Math.round(state.totalRaw*10)));

    root.querySelectorAll('.iq5-opt').forEach(b=>{
      b.disabled=true;
      const id=b.getAttribute('data-id');
      if(id===q.correct) b.classList.add('iq5-opt-correct');
      if(!isCorrect && id===chosenId && !skipped && !timedOut) b.classList.add('iq5-opt-wrong');
    });

    try{
      if(isCorrect){ playSound('correct'); haptic(15); }
      else         { playSound('wrong');   haptic([20,40,20]); }
    }catch(e){}

    const fx = root.querySelector('#iqFx');
    if(fx){
      const badge = isCorrect
        ? '<span class="iq5-fx-badge iq5-fx-ok">✓ '+IQ_esc(IQ_t('fx.correct',lang))+' +'+Math.round(gained*10)+' '+IQ_esc(IQ_t('fx.pts',lang))+'</span>'
        : timedOut ? '<span class="iq5-fx-badge iq5-fx-time">⏰ '+IQ_esc(IQ_t('fx.timeup',lang))+'</span>'
        : skipped  ? '<span class="iq5-fx-badge iq5-fx-skip">⏭ '+IQ_esc(IQ_t('fx.skipped',lang))+'</span>'
                   : '<span class="iq5-fx-badge iq5-fx-bad">✕ '+IQ_esc(IQ_t('fx.wrong',lang))+'</span>';
      const trapLine = (!isCorrect && res.trap)
        ? '<div class="iq5-explain-trap">🪤 '+IQ_esc(IQ_t('trap.'+res.trap,lang))+' — '+IQ_esc(IQ_t('trap.'+res.trap+'.d',lang))+'</div>' : '';
      fx.innerHTML =
        '<div class="iq5-explain">'+
          '<div class="iq5-explain-head">'+badge+'</div>'+
          '<div class="iq5-explain-body">💡 '+IQ_esc(IQ_tx(q.explanation,lang))+'</div>'+
          trapLine+
          '<div class="iq5-explain-hint">'+IQ_esc(IQ_t('fx.tap',lang))+'</div>'+
        '</div>';
      let advanced=false;
      const cont=()=>{ if(advanced) return; advanced=true; advance(); };
      fx.addEventListener('click', cont, {once:true});
      _st(()=>{ if(root.contains(fx)) cont(); }, isCorrect ? 2200 : 3400);
    }else{
      _st(advance, 1600);
    }
  }

  function advance(){
    state.idx++;
    nextQuestion();
  }

  /* ------------------------------ REVIEW MODE ----------------------------- */
  function openReview(misses){
    if(!misses.length) return;
    let i=0;
    const ov = document.createElement('div');
    ov.className='iq5-review';
    wrap.appendChild(ov);

    function draw(){
      const m = misses[i];
      const q = m.question;
      const chosen = q.options.filter(o=>o.id===m.chosenId)[0];
      const correct= q.options.filter(o=>o.id===q.correct)[0];
      const visual = IQ_renderVisual(q, lang);
      ov.innerHTML =
        '<div class="iq5-rev-sheet">'+
          '<div class="iq5-rev-head">'+
            '<b>🔍 '+IQ_esc(IQ_t('rev.title',lang))+'</b>'+
            '<span class="iq5-rev-count">'+IQ_esc(IQ_t('rev.of',lang,{i:i+1,n:misses.length}))+'</span>'+
            '<button class="iq5-rev-x" type="button" id="iqRevClose" aria-label="close">✕</button>'+
          '</div>'+
          '<div class="iq5-rev-body">'+
            '<div class="iq5-rev-meta">'+
              '<span class="iq5-cat" style="background:'+(IQ_CATS[q.category]||IQ_CATS.pattern).color+'22;color:'+(IQ_CATS[q.category]||IQ_CATS.pattern).color+'">'+IQ_esc(IQ_t('cat.'+q.category,lang))+'</span>'+
              '<span class="iq5-diff iq5-diff-'+Math.min(3,Math.ceil(q.difficulty*3/5))+'">'+IQ_esc(IQ_t('diff.'+q.difficulty,lang))+'</span>'+
            '</div>'+
            '<div class="iq5-prompt">'+IQ_esc(IQ_tx(q.prompt,lang))+'</div>'+
            (visual ? '<div class="iq5-visual">'+visual+'</div>' : '')+
            IQ_optionsHtml(q, lang, {reveal:true, disabled:true, chosenId:m.chosenId})+
            '<div class="iq5-rev-rows">'+
              '<div class="iq5-rev-row"><span>'+IQ_esc(IQ_t('rev.your',lang))+'</span>'+
                '<b class="bad">'+IQ_esc(chosen ? IQ_tx(chosen.label||IQ_L(chosen.id.toUpperCase()),lang) : IQ_t('rev.none',lang))+'</b></div>'+
              '<div class="iq5-rev-row"><span>'+IQ_esc(IQ_t('rev.correct',lang))+'</span>'+
                '<b class="good">'+IQ_esc(correct.label ? IQ_tx(correct.label,lang) : correct.id.toUpperCase())+'</b></div>'+
              (m.trap ? '<div class="iq5-rev-row"><span>'+IQ_esc(IQ_t('rev.trap',lang))+'</span><b>'+IQ_esc(IQ_t('trap.'+m.trap,lang))+'</b></div>' : '')+
            '</div>'+
            '<div class="iq5-explain-body">💡 <b>'+IQ_esc(IQ_t('rev.why',lang))+':</b> '+IQ_esc(IQ_tx(q.explanation,lang))+'</div>'+
          '</div>'+
          '<div class="iq5-rev-nav">'+
            '<button class="iq5-rev-btn" type="button" id="iqRevPrev" '+(i===0?'disabled':'')+'>'+IQ_esc(IQ_t('rev.prev',lang))+'</button>'+
            '<button class="iq5-rev-btn" type="button" id="iqRevNext" '+(i===misses.length-1?'disabled':'')+'>'+IQ_esc(IQ_t('rev.next',lang))+'</button>'+
            '<button class="iq5-rev-btn primary" type="button" id="iqRevDone">'+IQ_esc(IQ_t('rev.close',lang))+'</button>'+
          '</div>'+
        '</div>';
      IQ_guardOptionTiles(ov);
      const close=()=>{ if(ov.parentNode) ov.parentNode.removeChild(ov); };
      ov.querySelector('#iqRevClose').addEventListener('click', close);
      ov.querySelector('#iqRevDone').addEventListener('click', close);
      const prev=ov.querySelector('#iqRevPrev'), next=ov.querySelector('#iqRevNext');
      if(prev) prev.addEventListener('click', ()=>{ if(i>0){ i--; draw(); } });
      if(next) next.addEventListener('click', ()=>{ if(i<misses.length-1){ i++; draw(); } });
    }
    draw();
  }

  /* ------------------------------ FINISH ---------------------------------- */
  function finishTest(){
    _cleanup();
    const sc  = IQ_scoreRun(state.results);
    const cls = iqClassify(sc.iq);
    const clsLabel = IQ_t('cls.'+cls.key, lang);
    const prevBest = S('nz_iq_best') || 0;
    const newPB = sc.iq > prevBest;

    try{
      if(newPB) setS('nz_iq_best', sc.iq);
      setS('nz_iq_games', (S('nz_iq_games')||0)+1);
      setS('nz_iq_profile', { iq:sc.iq, pctile:sc.pctile, catIq:sc.catIq, lang, ts:Date.now() });
      const hist = S('nz_iq_traps') || {};
      Object.keys(sc.traps).forEach(k=>{ hist[k]=(hist[k]||0)+sc.traps[k]; });
      setS('nz_iq_traps', hist);
    }catch(e){}
    try{ if(newPB || sc.iq>=120) confetti(80); }catch(e){}

    setScore(sc.iq);

    const misses = state.results.filter(r=>!r.correct);
    const radar  = IQ_drawRadar(sc.catIq, lang);

    const catRows = IQ_CAT_KEYS.map(k=>{
      const v = sc.catIq[k];
      const pct = IQ_clamp((v-70)/(145-70)*100, 4, 100);
      const col = IQ_CATS[k].color;
      return '<div class="iq5-skill-row">'+
        '<span class="iq5-skill-name" style="color:'+col+'">'+IQ_esc(IQ_t('cat.short.'+k,lang))+'</span>'+
        '<span class="iq5-skill-bar"><span class="iq5-skill-fill" style="width:'+pct+'%;background:'+col+'"></span></span>'+
        '<span class="iq5-skill-val">'+v+'</span>'+
      '</div>';
    }).join('');

    /* personalised coaching from the weakest category + the dominant trap */
    const sorted = IQ_CAT_KEYS.slice().sort((a,b)=>sc.catIq[a]-sc.catIq[b]);
    const weak = sorted[0], strong = sorted[sorted.length-1];
    const tips = [];
    tips.push(IQ_t('tip.train', lang, { c:IQ_t('cat.short.'+weak,lang), t:IQ_t('tip.'+weak,lang) }));
    if(sc.trapTop) tips.push(IQ_t('tip.trap', lang, { t:IQ_t('trap.'+sc.trapTop,lang), d:IQ_t('trap.'+sc.trapTop+'.d',lang) }));
    tips.push(IQ_t('tip.strength', lang, { c:IQ_t('cat.short.'+strong,lang) }));

    const gPct = IQ_clamp((sc.iq-70)/(145-70), 0, 1);
    const circ = Math.round(2*Math.PI*52);
    const gauge =
      '<div class="iq5-gauge">'+
        '<svg xmlns="http://www.w3.org/2000/svg" width="170" height="170" viewBox="0 0 120 120" class="iq5-gauge-svg">'+
          '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>'+
          '<circle id="iqGaugeArc" cx="60" cy="60" r="52" fill="none" stroke="url(#iqGaugeG)" stroke-width="10" stroke-linecap="round" '+
            'stroke-dasharray="'+circ+'" stroke-dashoffset="'+circ+'" transform="rotate(-90 60 60)"/>'+
          '<defs><linearGradient id="iqGaugeG" x1="0" y1="0" x2="1" y2="1">'+
            '<stop offset="0" stop-color="'+cls.color+'"/><stop offset="1" stop-color="#34D399"/>'+
          '</linearGradient></defs>'+
        '</svg>'+
        '<div class="iq5-gauge-inner">'+
          '<div class="iq5-gauge-num" id="iqGaugeNum">0</div>'+
          '<div class="iq5-gauge-lbl">'+IQ_esc(IQ_t('res.iqlabel',lang))+'</div>'+
        '</div>'+
      '</div>';

    const conf = sc.total>=22 ? 'high' : sc.total>=14 ? 'med' : 'low';
    const confErr = sc.total>=22 ? 6 : sc.total>=14 ? 9 : 13;

    const shareCard =
      '<div class="iq5-share-card" id="iqShareCard">'+
        '<div class="iq5-share-brand">NeuroZen · Cognitive Test</div>'+
        '<div class="iq5-share-score" style="color:'+cls.color+'">'+sc.iq+'</div>'+
        '<div class="iq5-share-label">'+IQ_esc(clsLabel)+' · Top '+(100-sc.pctile)+'%</div>'+
        '<div class="iq5-share-radar">'+radar+'</div>'+
        '<div class="iq5-share-foot">'+sc.correct+'/'+sc.total+' · '+Math.round(sc.accuracy*100)+'%</div>'+
      '</div>';

    const statsHtml =
      gauge +
      '<div class="iq5-res-title">'+IQ_esc(IQ_t('res.title',lang))+'</div>'+
      '<div class="iq5-res-sub">'+IQ_esc(IQ_t('res.iq',lang))+': <b style="color:'+cls.color+'">'+sc.iq+'</b> · '+IQ_esc(clsLabel)+'</div>'+
      '<div class="iq5-res-sub">'+IQ_t('res.better',lang,{p:sc.pctile})+'</div>'+
      '<div class="iq5-res-sub iq5-res-conf">'+IQ_esc(IQ_t('res.confidence',lang,{c:IQ_t('res.conf.'+conf,lang), n:sc.total, e:confErr}))+'</div>'+
      '<div class="iq5-radar-host">'+radar+'</div>'+
      '<div class="iq5-skills">'+
        '<div class="iq5-skills-title">'+IQ_esc(IQ_t('res.breakdown',lang))+'</div>'+
        catRows+
      '</div>'+
      '<div class="end-stats">'+
        '<div class="row"><span>'+IQ_esc(IQ_t('res.correct',lang))+'</span><span class="val">'+sc.correct+' / '+sc.total+'</span></div>'+
        '<div class="row"><span>'+IQ_esc(IQ_t('res.accuracy',lang))+'</span><span class="val">'+Math.round(sc.accuracy*100)+'%</span></div>'+
        '<div class="row"><span>'+IQ_esc(IQ_t('res.avgtime',lang))+'</span><span class="val">'+(sc.avgMs/1000).toFixed(1)+'s</span></div>'+
        '<div class="row"><span>'+IQ_esc(IQ_t('res.band',lang))+'</span><span class="val">'+IQ_esc(IQ_t('diff.'+run.state.maxBand,lang))+' ('+run.state.maxBand+'/5)</span></div>'+
        '<div class="row"><span>'+IQ_esc(IQ_t('res.streak',lang))+'</span><span class="val">'+state.bestStreak+' 🔥</span></div>'+
        '<div class="row"><span>'+IQ_esc(IQ_t('res.pb',lang))+'</span><span class="val">'+Math.max(sc.iq, prevBest)+(newPB?' 🏆':'')+'</span></div>'+
        '<div class="row"><span>'+IQ_esc(IQ_t('res.trap',lang))+'</span><span class="val">'+
          (sc.trapTop ? IQ_esc(IQ_t('trap.'+sc.trapTop,lang))+' ×'+sc.traps[sc.trapTop] : '—')+'</span></div>'+
      '</div>'+
      (sc.trapTop ? '' : '<div class="iq5-verdict">'+IQ_esc(IQ_t('res.trapnone',lang))+'</div>')+
      '<div class="iq5-tips">'+tips.map(t=>'<div class="iq5-tip">'+IQ_esc(t)+'</div>').join('')+'</div>'+
      (misses.length
        ? '<button class="iq5-review-btn" type="button" id="iqReviewBtn">'+IQ_esc(IQ_t('res.review',lang,{n:misses.length}))+'</button>'
        : '<div class="iq5-verdict">'+IQ_esc(IQ_t('res.noreview',lang))+'</div>')+
      shareCard+
      '<button class="iq5-share-btn" type="button" id="iqShareBtn">'+IQ_esc(IQ_t('res.share',lang))+'</button>'+
      '<div class="iq5-disclaimer">'+IQ_esc(IQ_t('res.caveat',lang))+'</div>';

    end({
      title: clsLabel,
      emoji: '🧠',
      sub: 'Top '+(100-sc.pctile)+'% · '+sc.correct+'/'+sc.total+(newPB?' · 🏆':''),
      value: sc.iq,
      points: sc.iq>=130 ? 14 : sc.iq>=110 ? 11 : sc.iq>=90 ? 8 : 5,
      starThresh: [90,110,130],
      statsHtml: statsHtml
    });

    _st(()=>{
      const arc = wrap.querySelector('#iqGaugeArc');
      const num = wrap.querySelector('#iqGaugeNum');
      if(arc){
        arc.style.transition='stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1)';
        arc.setAttribute('stroke-dashoffset', String(circ*(1-gPct)));
      }
      if(num){
        const t0=performance.now();
        const step=t=>{
          const k=IQ_clamp((t-t0)/1400,0,1);
          num.textContent = Math.round(sc.iq*(1-Math.pow(1-k,3)));
          if(k<1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      const rev = wrap.querySelector('#iqReviewBtn');
      if(rev) rev.addEventListener('click', ()=> openReview(misses));
      const shareBtn = wrap.querySelector('#iqShareBtn');
      if(shareBtn){
        shareBtn.addEventListener('click', ()=>{
          const text = 'NeuroZen IQ: '+sc.iq+' ('+clsLabel+') — top '+(100-sc.pctile)+'% 🧠';
          if(navigator.share) navigator.share({title:'NeuroZen IQ', text}).catch(()=>{});
          else if(navigator.clipboard) navigator.clipboard.writeText(text).then(()=>toast&&toast('📋 Copied!')).catch(()=>toast&&toast(text));
          else toast && toast(text);
        });
      }
    }, 80);
  }

  /* -------- kick off: the language chooser always comes first -------- */
  showStart();
}

/* ============================================================================
 *  SECTION 8 — EXPORTS + HEADLESS TEST HOOK
 * ========================================================================== */
if(typeof window !== 'undefined'){
  window.playIQTest      = playIQTest;
  window.IQ_POOL         = IQ_POOL;
  window.IQ_CATS         = IQ_CATS;
  window.IQ_TIMER        = IQ_TIMER;
  window.IQ_N            = IQ_N;
  window.iqClassify      = iqClassify;
  window.IQ_QUESTIONS    = IQ_QUESTIONS;
  /* Hook used by tests/iqtest-probe.cjs (mirrors the other games' harnesses) */
  window.__IQ_TEST__ = {
    buildBank      : IQ_buildBank,
    validateBank   : IQ_validateBank,
    makeRun        : IQ_makeRun,
    scoreRun       : IQ_scoreRun,
    rawToIq        : IQ_rawToIq,
    itemScore      : IQ_itemScore,
    speedBonus     : IQ_speedBonus,
    optionsHtml    : IQ_optionsHtml,
    renderVisual   : IQ_renderVisual,
    optionTile     : IQ_optionTile,
    guardTiles     : IQ_guardOptionTiles,
    tx             : IQ_tx,
    t              : IQ_t,
    ui             : IQ_UI,
    cats           : IQ_CAT_KEYS,
    traps          : IQ_TRAPS,
    bands          : IQ_BANDS,
    N              : IQ_N
  };
}
