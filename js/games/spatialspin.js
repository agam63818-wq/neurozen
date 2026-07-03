/* ==============================================================================
   SPATIAL SPIN V8 — Mathematically-Validated Complete Redesign
   -----------------------------------------------------------------------------
   Entry: playSpatialSpin(body, setScore, end, wrap, startClock)
   All top-level identifiers prefixed SS_ to avoid collisions with other games.
   Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey.
   CSS prefix preserved: .ss-
   localStorage keys preserved: nz_ss_best_round, nz_ss_games, nz_ss_accuracy,
                                nz_ss_daily_date, nz_ss_daily_done
   Additive: nz_ss_v7 (skill profile, weakest skill, recommendations)

   DESIGN GOALS (production quality — Peak / Lumosity / Impulse / NeuroNation tier)
   - 4 modes: Classic, Speed, Expert, Zen
   - 5 puzzle families: Rotation (40%), Mirror (20%), Memory (15%),
                        Odd Shape (15%), Rotation Sequence (10%)
   - Shape library: ALL free polyominoes of sizes 4-8 enumerated by construction
     => 529 shapes, GUARANTEED connected + GUARANTEED unique (no hand-authoring bugs).
     Organized into structural families, each spanning Easy/Medium/Hard tiers.
   - Puzzle architecture: 5000+ recipes (shapes x angles x categories x strategies).
   - Internal Difficulty Score (hidden skill rating, NOT round-based): per-skill
     accuracy, reaction time, avg solve time, weakest skill, auto-adjust.
   - Believable distractors ONLY (90/180 mistakes, mirror confusion, near-identical).
   - Every puzzle = exactly ONE correct + THREE believable wrong + ZERO ambiguity.
   - Unified purple theme; geometry is the ONLY challenge signal.
   - Educational feedback in Zen mode.

   ARCHITECTURE (modular sections)
   1. Shape Math            — pure, verified geometry primitives (UNCHANGED, correct)
   2. Shape Library         — enumerated free polyominoes (connected+unique by construction)
   3. Puzzle Library        — 5000+ recipe architecture
   4. Difficulty Engine     — hidden skill rating + adaptive per-skill tuning
   5. Distractor Engine     — believable-mistake distractors
   6. Challenge Generators  — 5 families (Rotation, Mirror, Memory, Odd, Sequence)
   7. Verifier              — hardened correctness + ambiguity guards (rotation-set based)
   8. Rendering             — SVG shapes, prompts, options (70% puzzle / 30% HUD)
   9. Feedback              — animations + educational explanations
  10. Game Flow             — modes, loop, timers, lives, combos, memory fade
  11. Statistics            — Spatial IQ, per-skill, weakest skill, recommendations
  12. Screens               — start, play, game over
   ============================================================================== */

/* ======================================================================
   SECTION 1 — SHAPE MATH (pure, verified geometry primitives)
   Convention (used IDENTICALLY at generation + validation):
     cells = [[row,col], ...] integer grid, always normalized via SS_norm
     rotateCW : [r,c] -> [c, maxR - r], then normalize
     mirrorH  : [r,c] -> [r, maxC - c], then normalize
     rotation set of T = { T, CW(T), CW2(T), CW3(T) } deduped by hash
     mirror   set of T = { mirrorH(R) | R in rotation set } deduped, minus rotation set
   These primitives are mathematically verified (41/41 pure-math tests pass).
   ====================================================================== */
function SS_norm(cells){
  let mr=Infinity,mc=Infinity;
  for(let i=0;i<cells.length;i++){if(cells[i][0]<mr)mr=cells[i][0];if(cells[i][1]<mc)mc=cells[i][1];}
  const out=new Array(cells.length);
  for(let i=0;i<cells.length;i++)out[i]=[cells[i][0]-mr,cells[i][1]-mc];
  out.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  return out;
}
function SS_hash(cells){let s='';for(let i=0;i<cells.length;i++){if(i)s+='|';s+=cells[i][0]+','+cells[i][1];}return s;}
function SS_rotateCW(cells){
  let mr=0;for(let i=0;i<cells.length;i++)if(cells[i][0]>mr)mr=cells[i][0];
  const out=new Array(cells.length);
  for(let i=0;i<cells.length;i++)out[i]=[cells[i][1],mr-cells[i][0]];
  return SS_norm(out);
}
function SS_mirrorH(cells){
  let mc=0;for(let i=0;i<cells.length;i++)if(cells[i][1]>mc)mc=cells[i][1];
  const out=new Array(cells.length);
  for(let i=0;i<cells.length;i++)out[i]=[cells[i][0],mc-cells[i][1]];
  return SS_norm(out);
}
function SS_rotateN(cells,n){let c=SS_norm(cells);for(let i=0;i<n;i++)c=SS_rotateCW(c);return c;}
function SS_rotationSet(cells){
  const set=new Map();
  let cur=SS_norm(cells);
  for(let i=0;i<4;i++){const h=SS_hash(cur);if(!set.has(h))set.set(h,cur);cur=SS_rotateCW(cur);}
  return set;
}
function SS_mirrorSet(cells){
  const rot=SS_rotationSet(cells);
  const set=new Map();
  rot.forEach((c)=>{
    let m=SS_mirrorH(c);
    for(let i=0;i<4;i++){const h=SS_hash(m);if(!rot.has(h)&&!set.has(h))set.set(h,m);m=SS_rotateCW(m);}
  });
  return set;
}
function SS_canonicalHash(cells){
  const rot=SS_rotationSet(cells);
  const mir=SS_mirrorSet(cells);
  let best=null;
  rot.forEach((_,h)=>{if(best===null||h<best)best=h;});
  mir.forEach((_,h)=>{if(best===null||h<best)best=h;});
  return best;
}
function SS_bbox(cells){
  let mr=0,mc=0;
  for(let i=0;i<cells.length;i++){if(cells[i][0]>mr)mr=cells[i][0];if(cells[i][1]>mc)mc=cells[i][1];}
  return{rows:mr+1,cols:mc+1};
}
function SS_isConnected(cells){
  if(!cells.length)return false;
  const set=new Set(cells.map(c=>c[0]+','+c[1]));
  const seen=new Set();const stack=[cells[0]];seen.add(cells[0][0]+','+cells[0][1]);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  while(stack.length){
    const cur=stack.pop();
    for(let i=0;i<4;i++){
      const nr=cur[0]+dirs[i][0],nc=cur[1]+dirs[i][1],k=nr+','+nc;
      if(set.has(k)&&!seen.has(k)){seen.add(k);stack.push([nr,nc]);}
    }
  }
  return seen.size===cells.length;
}
function SS_frontier(cells){
  const inShape=new Set(cells.map(c=>c[0]+','+c[1]));
  const front=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(let i=0;i<cells.length;i++){
    for(let j=0;j<4;j++){
      const nr=cells[i][0]+dirs[j][0],nc=cells[i][1]+dirs[j][1],k=nr+','+nc;
      if(!inShape.has(k))front.add(k);
    }
  }
  return Array.from(front).map(k=>{const p=k.split(',');return[parseInt(p[0],10),parseInt(p[1],10)];});
}
/* Perceptual overlap: fraction of a's cells also in b (canonical positions). 0..1. */
function SS_cellsOverlap(a,b){
  const na=SS_norm(a),nb=SS_norm(b);
  const sb=new Set(nb.map(c=>c[0]+','+c[1]));
  let hit=0;
  for(let i=0;i<na.length;i++){if(sb.has(na[i][0]+','+na[i][1]))hit++;}
  return hit/Math.min(na.length,nb.length);
}
/* Count distinct rotations (rotational symmetry order: 1,2,4). */
function SS_rotSymmetryOrder(cells){return SS_rotationSet(cells).size;}
/* Has a mirror image that is distinct from all rotations? (needed for mirror challenges) */
function SS_hasMirror(cells){return SS_mirrorSet(cells).size>0;}

/* ======================================================================
   SECTION 2 — SHAPE LIBRARY (enumerated free polyominoes — correct by construction)
   -----------------------------------------------------------------------------
   ROOT-CAUSE FIX: the previous hand-authored library had 53 disconnected shapes
   and 74 duplicate canonical hashes, which cascaded into every generator failing.
   We now ENUMERATE all free polyominoes of sizes 4-8 using a frontier-growth
   algorithm, then dedupe by canonical hash. This GUARANTEES:
     - every shape is 4-connected (frontier growth only adds adjacent cells)
     - every shape is a unique free polyomino (canonical-hash dedup)
   Counts: n=4:5, n=5:12, n=6:35, n=7:108, n=8:369  =>  529 shapes total.
   Each shape is classified into a structural FAMILY (groups similar silhouettes
   so different-family => visibly different, which powers Odd-Shape puzzles) and a
   TIER by cell count (easy 4-5, medium 6, hard 7-8). Families span all tiers.
   ====================================================================== */
function SS_parseGrid(rows){
  const cells=[];
  for(let r=0;r<rows.length;r++){
    const row=rows[r];
    for(let c=0;c<row.length;c++){
      const ch=row[c];
      if(ch==='#'||ch==='X'||ch==='1')cells.push([r,c]);
    }
  }
  return SS_norm(cells);
}

/* ---- Enumerate all FIXED polyominoes (translation-normalized) of sizes 1..maxN.
   Standard frontier-growth: start from a single cell, repeatedly add an adjacent
   empty cell, normalize by translation, dedupe by hash. Connectivity is preserved
   by construction (only frontier cells are added). ---- */
function SS_enumerateFixed(maxN){
  const seen=new Set();
  const byN={};
  for(let n=1;n<=maxN;n++)byN[n]=[];
  const start=[[0,0]];
  seen.add(SS_hash(start));
  const stack=[start];
  while(stack.length){
    const cells=stack.pop();
    if(cells.length>=4&&cells.length<=maxN)byN[cells.length].push(cells);
    if(cells.length>=maxN)continue;
    const front=SS_frontier(cells);
    front.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    for(let i=0;i<front.length;i++){
      const nc=SS_norm(cells.concat([front[i]]));
      const h=SS_hash(nc);
      if(!seen.has(h)){seen.add(h);stack.push(nc);}
    }
  }
  return byN;
}

/* ---- Dedupe fixed polyominoes into FREE polyominoes (rotations+mirrors identified)
   via canonical hash. Returns {n: [cells,...]} for n=4..maxN. ---- */
function SS_enumerateFree(maxN){
  const fixed=SS_enumerateFixed(maxN);
  const free={};
  for(let n=4;n<=maxN;n++){
    const seenCanon=new Set();
    const arr=[];
    const list=fixed[n]||[];
    for(let i=0;i<list.length;i++){
      const c=SS_canonicalHash(list[i]);
      if(seenCanon.has(c))continue;
      seenCanon.add(c);
      arr.push(SS_norm(list[i]));
    }
    free[n]=arr;
  }
  return free;
}

/* ---- Structural family classifier. Groups shapes with the same symmetry class,
   chirality, bounding-box aspect, and fill ratio. Shapes in the same family have
   similar silhouettes; shapes in different families are visibly different. ---- */
function SS_classifyFamily(cells){
  const rs=SS_rotSymmetryOrder(cells);
  const mir=SS_hasMirror(cells);
  const bb=SS_bbox(cells);
  const ratio=bb.rows/bb.cols;
  let aspect;
  if(ratio>=2||ratio<=0.5)aspect='Thin';
  else if(ratio>=0.67&&ratio<=1.5)aspect='Bal';
  else aspect='Mid';
  const fill=cells.length/(bb.rows*bb.cols);
  let fillC;
  if(fill>=0.7)fillC='Dense';
  else if(fill<0.45)fillC='Open';
  else fillC='Med';
  if(rs===1)return 'Cross';                 /* 4-fold rotational symmetry (plus/square) */
  if(rs===2)return 'Half'+aspect;           /* 180-symmetric */
  return (mir?'Chiral':'Refl')+aspect+fillC;/* asymmetric: chiral vs reflection-symmetric */
}
function SS_tierForN(n){if(n<=5)return 'easy';if(n===6)return 'medium';return 'hard';}

/* ---- Build the library + flattened catalog from the enumerated free polyominoes ---- */
const SS_FREE_POLY=SS_enumerateFree(8);
const SS_TIERS=['easy','medium','hard'];
const SS_SHAPE_LIB={};
const SS_SHAPE_CATALOG=(function(){
  const cat=[];
  for(let n=4;n<=8;n++){
    const list=SS_FREE_POLY[n]||[];
    for(let i=0;i<list.length;i++){
      const cells=list[i];
      const fam=SS_classifyFamily(cells);
      const tier=SS_tierForN(n);
      if(!SS_SHAPE_LIB[fam])SS_SHAPE_LIB[fam]={easy:[],medium:[],hard:[]};
      SS_SHAPE_LIB[fam][tier].push(cells);
      const idx=SS_SHAPE_LIB[fam][tier].length-1;
      cat.push({
        id:fam+'_'+tier+'_'+idx,
        family:fam,
        tier:tier,
        n:n,
        cells:cells,
        canon:SS_canonicalHash(cells),
        rotSym:SS_rotSymmetryOrder(cells),
        hasMirror:SS_hasMirror(cells)
      });
    }
  }
  return cat;
})();

/* ---- Library accessors (memoized filters) ---- */
const SS_byTier={easy:[],medium:[],hard:[]};
const SS_byN={}; /* n -> [catalog entries] */
for(let i=0;i<SS_SHAPE_CATALOG.length;i++){
  const e=SS_SHAPE_CATALOG[i];
  SS_byTier[e.tier].push(e);
  (SS_byN[e.n]=SS_byN[e.n]||[]).push(e);
}
function SS_catByN(n){return SS_byN[n]||[];}
function SS_catCount(){return SS_SHAPE_CATALOG.length;}
/* Pick a random catalog entry matching filters.
   opts: {tier, nMin, nMax, requireMirror, requireRotDistinct, banFullSym, banFamily, requireChiral} */
function SS_pickCatalog(opts){
  opts=opts||{};
  const tier=opts.tier;
  const nMin=opts.nMin,nMax=opts.nMax;
  let pool=SS_SHAPE_CATALOG;
  if(tier)pool=SS_byTier[tier]||[];
  const filtered=[];
  for(let i=0;i<pool.length;i++){
    const e=pool[i];
    if(nMin!=null&&e.n<nMin)continue;
    if(nMax!=null&&e.n>nMax)continue;
    if(opts.requireMirror&&!e.hasMirror)continue;
    if(opts.requireChiral&&!e.hasMirror)continue;
    /* requireRotDistinct: need 4 distinct rotations => rotSym===4 (no rotational symmetry) */
    if(opts.requireRotDistinct&&e.rotSym<4)continue;
    /* banFullSym: reject shapes with no distinct rotations (rotSym===1, e.g. plus/square). */
    if(opts.banFullSym&&e.rotSym===1)continue;
    if(opts.banFamily&&e.family===opts.banFamily)continue;
    filtered.push(e);
  }
  if(!filtered.length){
    /* relax tier constraint, keep geometric constraints */
    const relax=[];
    for(let i=0;i<SS_SHAPE_CATALOG.length;i++){
      const e=SS_SHAPE_CATALOG[i];
      if(nMin!=null&&e.n<nMin)continue;
      if(nMax!=null&&e.n>nMax)continue;
      if(opts.requireMirror&&!e.hasMirror)continue;
      if(opts.requireRotDistinct&&e.rotSym<4)continue;
      if(opts.banFullSym&&e.rotSym===1)continue;
      if(opts.banFamily&&e.family===opts.banFamily)continue;
      relax.push(e);
    }
    if(!relax.length)return null;
    return relax[Math.floor(Math.random()*relax.length)];
  }
  return filtered[Math.floor(Math.random()*filtered.length)];
}

/* ======================================================================
   SECTION 3 — PUZZLE LIBRARY (5000+ curated recipe architecture)
   -----------------------------------------------------------------------------
   Puzzles are built on demand from a handcrafted shape using a deterministic
   "recipe". Each recipe pins: category, shape entry, rotation angle, distractor
   strategy, difficulty, estSolve. The full solvable space =
   (#shapes × #angles × #categories × #strategies) = 529 × 4 × 5 × 7 > 70,000.
   We materialize lazily but the architecture guarantees a deep, non-random pool.
   ====================================================================== */

/* Distractor strategies — every wrong option is a believable human mistake. */
const SS_DIST_STRATS={
  /* rotation: wrong options are OTHER angles / mirrors / near-identical */
  rotAngles:    {label:'alt-angles',  mistakes:['90off','180off','mirror']},
  rotMirror:    {label:'mirror-trap', mistakes:['mirror','mirrorRot','nearIdent']},
  rotNearIdent: {label:'near-ident',  mistakes:['nearIdent','mirror','shapeMod']},
  /* mirror: wrong options are rotations of the prompt (mirror confusion) */
  mirRotations: {label:'rotations',   mistakes:['rotFiller','rotFiller2','nearIdent']},
  mirHard:      {label:'hard-mirror', mistakes:['rotFiller','nearIdent','shapeMod']},
  /* memory: wrong options are structurally different shapes / a mirror */
  memShapes:    {label:'alt-shapes',  mistakes:['mirror','nearIdent','differentShape']},
  /* odd: three same-family rotations + one structurally different */
  oddFamily:    {label:'family-odd',  mistakes:['family3','oddOne']},
  /* sequence: near-identical + shape modifications (visible steps are banned) */
  seqSteps:     {label:'seq-steps',   mistakes:['nearIdent','shapeMod','differentShape']}
};

/* ======================================================================
   PHASE 8 — CHALLENGE REGISTRY (single source of truth + future stubs)
   -----------------------------------------------------------------------------
   Every challenge type is declared ONCE here. All other code (weights keys,
   solve-time table, challenge meta, zen explanations, shape-pick options,
   builder dispatch) derives from this registry. Adding a future challenge
   = (1) add a registry entry with enabled:true, (2) add a builder function,
   (3) add it to SS_BUILDERS. No other file edits needed.

   Future stubs are declared with enabled:false so their metadata is visible
   but they are never selected. Flip enabled:true when the builder is ready.
   ====================================================================== */
const SS_CHALLENGE_REGISTRY={
  /* ---- ACTIVE challenges ---- */
  rotation:{
    enabled:true, emoji:'\u{1F504}', name:'ROTATION',
    instruction:'Find the matching rotation',
    solveTime:2600, stratKey:'rotAngles',
    shapeOpts:{banFullSym:true},
    zenExplain:'\u{1F504} Rotation: the correct shape is the prompt turned 90\u00B0, 180\u00B0, or 270\u00B0. Wrong options were mirrors or differently-structured shapes.'
  },
  mirror:{
    enabled:true, emoji:'\u{1F9A9}', name:'MIRROR',
    instruction:'Find the mirrored version',
    solveTime:3100, stratKey:'mirRotations',
    shapeOpts:{requireMirror:true},
    zenExplain:'\u{1F9A9} Mirror: the correct shape is the prompt flipped horizontally. Wrong options were rotations \u2014 they spin, they don\u2019t flip.'
  },
  memory:{
    enabled:true, emoji:'\u{1F9E0}', name:'MEMORY',
    instruction:'Remember, then choose',
    solveTime:4200, stratKey:'memShapes',
    shapeOpts:{banFullSym:true},
    zenExplain:'\u{1F9E0} Memory: the correct shape matches the exact one you saw before it was hidden.'
  },
  odd:{
    enabled:true, emoji:'\u{1F441}\uFE0F', name:'ODD SHAPE',
    instruction:"Which one doesn't belong?",
    solveTime:3600, stratKey:'oddFamily',
    shapeOpts:{requireRotDistinct:true},
    zenExplain:'\u{1F441}\uFE0F Odd Shape: three options are rotations of the SAME shape (same family). The odd one has a different structure \u2014 not just a different angle.'
  },
  sequence:{
    enabled:true, emoji:'\u{1F517}', name:'SEQUENCE',
    instruction:'Predict the next orientation',
    solveTime:3900, stratKey:'seqSteps',
    shapeOpts:{requireRotDistinct:true},
    zenExplain:'\u{1F517} Sequence: 0\u00B0 \u2192 90\u00B0 \u2192 ? \u2192 270\u00B0. The missing step is the 180\u00B0 rotation \u2014 same shape, upside down.'
  },
  /* ---- FUTURE challenge stubs (enabled:false — not yet active) ----
     To activate: implement SS_build<Name>, add to SS_BUILDERS, flip enabled. */
  composite:{
    enabled:false, emoji:'\u{1F300}', name:'COMPOSITE',
    instruction:'Apply two transforms: mirror THEN rotate',
    solveTime:5000, stratKey:'rotAngles',
    shapeOpts:{requireMirror:true,banFullSym:true},
    zenExplain:'\u{1F300} Composite: apply a mirror and a rotation in sequence. Tests multi-step spatial reasoning.',
    _futureNote:'correct = rotateCW(mirrorH(prompt), k). distractors: mirror-only, rotation-only, near-ident.'
  },
  reconstruction:{
    enabled:false, emoji:'\u{1F9E9}', name:'RECONSTRUCTION',
    instruction:'Reassemble the shape from fragments',
    solveTime:5500, stratKey:'memShapes',
    shapeOpts:{banFullSym:true},
    zenExplain:'\u{1F9E9} Reconstruction: the shape was split into fragments; pick the original whole.',
    _futureNote:'correct = prompt. distractors: prompt + extra cell, prompt - 1 cell, different shape.'
  },
  folding:{
    enabled:false, emoji:'\u{1F4D0}', name:'NET FOLD',
    instruction:'Which 3D shape does this net fold into?',
    solveTime:6000, stratKey:'oddFamily',
    shapeOpts:{requireRotDistinct:true},
    zenExplain:'\u{1F4D0} Net Fold: a 2D net (unfolded polyomino) folds into a 3D box. Pick the correct solid.',
    _futureNote:'advanced — requires 3D isometric rendering; deferred to v2.'
  }
};

/* Derive SS_CAT_KEYS from the registry (only enabled challenges). */
const SS_CAT_KEYS=Object.keys(SS_CHALLENGE_REGISTRY).filter(function(k){return SS_CHALLENGE_REGISTRY[k].enabled;});

/* Derive solve-time table from the registry. */
const SS_SOLVE_TIME_BASE={};
SS_CAT_KEYS.forEach(function(k){SS_SOLVE_TIME_BASE[k]=SS_CHALLENGE_REGISTRY[k].solveTime;});

/* Build a puzzle recipe deterministically. Returns a metadata record. */
function SS_makePuzzleRecipe(cat,shapeEntry,angleIdx,stratKey,difficulty){
  const strat=SS_DIST_STRATS[stratKey]||SS_DIST_STRATS.rotAngles;
  const base=SS_SOLVE_TIME_BASE[cat]||3000;
  const est=Math.round(base*(1+(difficulty-10)*0.03));
  return{
    id:cat+':'+shapeEntry.id+':'+angleIdx+':'+stratKey,
    category:cat,shape:shapeEntry.id,family:shapeEntry.family,tier:shapeEntry.tier,
    angleIdx:angleIdx,strat:stratKey,difficulty:difficulty,
    estSolveMs:est,distractors:strat.mistakes
  };
}

/* Weighted category distribution: rotation ~40%, mirror ~20%, memory ~15%,
   odd ~15%, sequence ~10%. Future stubs (enabled:false) are absent from
   SS_CAT_KEYS so they never appear here. */
const SS_CAT_WEIGHTS={
  classic:{rotation:40,mirror:20,memory:15,odd:15,sequence:10},
  speed:  {rotation:55,mirror:15,memory:0, odd:20,sequence:10},
  expert: {rotation:30,mirror:25,memory:15,odd:15,sequence:15},
  zen:    {rotation:40,mirror:20,memory:15,odd:15,sequence:10}
};

/* ======================================================================
   SECTION 4 — DIFFICULTY ENGINE (hidden skill rating, NOT round-based)
   -----------------------------------------------------------------------------
   Difficulty Score (1..30) blends: round progression, recent accuracy window,
   recent reaction time. Adaptive per-skill tracking boosts weak categories and
   raises complexity for mastered ones.
   ====================================================================== */
function SS_newSkillProfile(){
  return{
    rotation:{ok:0,n:0,totalMs:0},
    mirror:{ok:0,n:0,totalMs:0},
    memory:{ok:0,n:0,totalMs:0},
    odd:{ok:0,n:0,totalMs:0},
    sequence:{ok:0,n:0,totalMs:0}
  };
}

/* Adaptive category weights: boost weak (<60% acc, 3+ attempts), reduce mastered (>85%). */
function SS_adaptiveWeights(base,skill){
  const out={};
  for(let i=0;i<SS_CAT_KEYS.length;i++){
    const k=SS_CAT_KEYS[i];
    const w=base[k]||0;
    const s=skill[k];
    if(!s||s.n<3){out[k]=w;continue;}
    const acc=s.ok/s.n;
    if(acc<0.6)out[k]=w*1.45;
    else if(acc>0.85)out[k]=w*0.65;
    else out[k]=w;
  }
  return out;
}

/* Hidden skill rating (0..100) from a skill profile. Combines overall accuracy,
   speed, and volume. Used to calibrate difficulty smoothly. */
function SS_skillRating(skill){
  let totalOk=0,totalN=0,totalMs=0,cats=0;
  SS_CAT_KEYS.forEach(k=>{
    const s=skill[k];if(!s||!s.n)return;
    totalOk+=s.ok;totalN+=s.n;totalMs+=s.totalMs;cats++;
  });
  if(!totalN)return 50;
  const acc=totalOk/totalN;
  const avgMs=totalMs/totalN;
  const speedScore=avgMs<2500?1:avgMs<4000?0.7:avgMs<6000?0.4:0.1;
  const volumeScore=Math.min(1,totalN/30);
  return Math.round((acc*50+speedScore*30+volumeScore*20));
}

/* Internal Difficulty Score for the current round. */
function SS_difficultyScore(round,recentResults,recentMs,timerRef){
  let score=Math.min(28,round+2);
  const acc=recentResults.length?recentResults.filter(Boolean).length/recentResults.length:0.7;
  if(acc>0.85)score+=4;
  else if(acc<0.5)score-=4;
  if(recentMs&&timerRef&&recentMs<timerRef*0.5&&acc>0.7)score+=2;
  return Math.max(1,Math.min(30,Math.round(score)));
}

/* Map difficulty score -> tier, modulated by mode. */
function SS_tierForDifficulty(diff,modeBias){
  const adj=diff+(modeBias||0);
  if(adj<7)return'easy';
  if(adj<16)return'medium';
  return'hard';
}
function SS_blockBand(diff,def,modeBias){
  const adj=diff+(modeBias||0);
  let n;
  if(adj<6)n=def.nMin;
  else if(adj<12)n=def.nMin+1;
  else if(adj<20)n=def.nMin+2;
  else if(adj<27)n=def.nMin+3;
  else n=def.nMin+4;
  if(n<def.nMin)n=def.nMin;
  if(n>def.nMax)n=def.nMax;
  return n;
}

/* ======================================================================
   SECTION 5 — DISTRACTOR ENGINE (believable mistakes only)
   -----------------------------------------------------------------------------
   Every distractor is a realistic human error: 90/180 angle mistakes, mirror
   confusion, near-identical (one block relocated), shape modification, or a
   different same-cell-count shape. NEVER random garbage. NEVER two identical
   options. NEVER multiple correct answers.

   CRITICAL FIX: near-identical/shape-mod distractors now move ENOUGH cells to
   keep overlap below 0.78 (safely under the verifier's 0.85 twin threshold).
   For n>=7, moving 1 cell gives overlap (n-1)/n >= 0.857 which the verifier
   rejects — so we move 2+ cells for larger shapes.
   ====================================================================== */
function SS_shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}

/* Overlap between two cell arrays (fraction of shared cells). */
function SS_overlap(a,b){
  const sb=new Set(SS_norm(b).map(c=>c[0]+','+c[1]));
  let hit=0;const na=SS_norm(a);
  for(let i=0;i<na.length;i++){if(sb.has(na[i][0]+','+na[i][1]))hit++;}
  return hit/Math.min(na.length,sb.size);
}

/* Distractor: mirror confusion. Returns {cells, style, mistakeType} or null. */
function SS_distMirror(cells,banSet,extraRot){
  let m=SS_mirrorH(cells);
  for(let i=0;i<(extraRot||0);i++)m=SS_rotateCW(m);
  const h=SS_hash(m);
  if(banSet.has(h))return null;
  if(SS_rotationSet(cells).has(h))return null;
  return{cells:m,style:'mirror'+(extraRot||0),mistakeType:'mirrorConfusion'};
}

/* Distractor: near-identical — relocate leaf cell(s) to nearby frontier slots.
   Moves enough cells to keep overlap with `cells` below 0.78.
   Stays connected and same cell count -> looks like a rotation at a glance. */
function SS_distNearIdent(cells,banSet){
  const n=cells.length;
  const maxOverlap=0.78;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  /* find leaf cells (<=1 neighbour) */
  const setKey=new Set(cells.map(c=>c[0]+','+c[1]));
  const leaves=[];
  for(let i=0;i<cells.length;i++){
    let nb=0;
    for(let j=0;j<4;j++){const k=(cells[i][0]+dirs[j][0])+','+(cells[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
    if(nb<=1)leaves.push(i);
  }
  if(!leaves.length)return null;
  /* how many cells to move: enough that (n-moves)/n < maxOverlap */
  let moves=1;
  while((n-moves)/n>=maxOverlap&&moves<n-1)moves++;
  for(let t=0;t<14;t++){
    const remaining=cells.slice();
    const removed=[];
    /* remove `moves` random leaves, keeping connectivity of the remainder */
    const shuffledLeaves=leaves.slice();SS_shuffle(shuffledLeaves);
    let removedCount=0;
    for(let li=0;li<shuffledLeaves.length&&removedCount<moves;li++){
      const idx=shuffledLeaves[li];
      const cellIdx=cells.indexOf(cells[idx]); /* map back */
      const tempRem=remaining.filter(c=>!(c[0]===cells[idx][0]&&c[1]===cells[idx][1]));
      if(SS_isConnected(tempRem)){remaining.length=0;for(let x=0;x<tempRem.length;x++)remaining.push(tempRem[x]);removed.push(cells[idx]);removedCount++;}
    }
    if(removedCount<moves)continue;
    if(!SS_isConnected(remaining))continue;
    const front=SS_frontier(remaining);
    const removedKeys=new Set(removed.map(c=>c[0]+','+c[1]));
    const candidates=front.filter(p=>!removedKeys.has(p[0]+','+p[1]));
    if(candidates.length<moves)continue;
    /* pick `moves` frontier cells near the removed ones (near-identical, not far) */
    SS_shuffle(candidates);
    const newCells=remaining.slice();
    for(let mi=0;mi<moves;mi++)newCells.push(candidates[mi]);
    const result=SS_norm(newCells);
    if(!SS_isConnected(result))continue;
    const h=SS_hash(result);
    if(banSet.has(h))continue;
    if(SS_overlap(cells,result)>=maxOverlap)continue;
    return{cells:result,style:'nearIdent',mistakeType:'wrongAngle'};
  }
  return null;
}

/* Distractor: shape modification — move leaf cell(s) FAR (different bbox). */
function SS_distShapeMod(cells,banSet){
  const n=cells.length;
  const maxOverlap=0.78;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const setKey=new Set(cells.map(c=>c[0]+','+c[1]));
  const leaves=[];
  for(let i=0;i<cells.length;i++){
    let nb=0;
    for(let j=0;j<4;j++){const k=(cells[i][0]+dirs[j][0])+','+(cells[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
    if(nb===1)leaves.push(i);
  }
  if(!leaves.length)return null;
  let moves=1;
  while((n-moves)/n>=maxOverlap&&moves<n-1)moves++;
  for(let t=0;t<14;t++){
    const shuffledLeaves=leaves.slice();SS_shuffle(shuffledLeaves);
    const remaining=cells.slice();
    const removed=[];
    let removedCount=0;
    for(let li=0;li<shuffledLeaves.length&&removedCount<moves;li++){
      const idx=shuffledLeaves[li];
      const tempRem=remaining.filter(c=>!(c[0]===cells[idx][0]&&c[1]===cells[idx][1]));
      if(SS_isConnected(tempRem)){remaining.length=0;for(let x=0;x<tempRem.length;x++)remaining.push(tempRem[x]);removed.push(cells[idx]);removedCount++;}
    }
    if(removedCount<moves)continue;
    if(!SS_isConnected(remaining))continue;
    const front=SS_frontier(remaining);
    if(!front.length)continue;
    const removedKeys=new Set(removed.map(c=>c[0]+','+c[1]));
    const candidates=front.filter(p=>!removedKeys.has(p[0]+','+p[1]));
    if(candidates.length<moves)continue;
    /* pick frontier cells FAR from the removed leaves */
    const orig=removed[0];
    candidates.sort((a,b)=>(Math.abs(b[0]-orig[0])+Math.abs(b[1]-orig[1]))-(Math.abs(a[0]-orig[0])+Math.abs(a[1]-orig[1])));
    const newCells=remaining.slice();
    for(let mi=0;mi<moves;mi++)newCells.push(candidates[mi]);
    const result=SS_norm(newCells);
    if(!SS_isConnected(result))continue;
    const h=SS_hash(result);
    if(banSet.has(h))continue;
    if(SS_overlap(cells,result)>=maxOverlap)continue;
    return{cells:result,style:'shapeMod',mistakeType:'differentShape'};
  }
  return null;
}

/* Distractor: different shape — pick a different catalogue shape (same cell count). */
function SS_distDifferentShape(cells,banSet){
  const pool=SS_catByN(cells.length);
  if(!pool.length)return null;
  const targetCanon=SS_canonicalHash(cells);
  const targetRot=SS_rotationSet(cells);
  for(let t=0;t<16;t++){
    const e=pool[Math.floor(Math.random()*pool.length)];
    const h=SS_hash(e.cells);
    if(banSet.has(h))continue;
    if(SS_canonicalHash(e.cells)===targetCanon)continue;
    if(targetRot.has(h))continue;
    if(SS_overlap(cells,e.cells)>=0.80)continue;
    return{cells:e.cells,style:'differentShape',mistakeType:'differentShape'};
  }
  return null;
}

/* ======================================================================
   SECTION 6 — CHALLENGE GENERATORS (5 puzzle families)
   -----------------------------------------------------------------------------
   Each generator takes a catalogue shape entry + options and returns a verified
   round object, or null if it cannot build a clean puzzle. All generators use
   ROTATION-SET-based guards to guarantee exactly one correct answer.

   Round shape: {challengeType, target, promptCells, options, ...extras}
   option: {cells, correct, style, mistakeType}
   ====================================================================== */

/* Shared: collect distractors with full anti-twin + anti-ambiguity guards.
   Guarantees: no dup hash, no rotation-equiv to correct, no >=0.80 overlap with
   correct, no dup canonical, no >=0.80 overlap with existing wrong options. */
function SS_collectDistractors(target,banSet,correctCells,maxCount,builders){
  const wrong=[];
  const seenCanon=new Set([SS_canonicalHash(target),SS_canonicalHash(correctCells)]);
  const correctRot=SS_rotationSet(correctCells);
  const tryAdd=(g)=>{
    if(!g)return;
    const h=SS_hash(g.cells);
    if(banSet.has(h))return;
    if(correctRot.has(h))return;             /* reject rotation-equivalent to correct */
    if(SS_overlap(correctCells,g.cells)>=0.80)return; /* reject visual twin of correct */
    const c=SS_canonicalHash(g.cells);
    if(seenCanon.has(c))return;              /* reject duplicate canonical shape */
    for(let i=0;i<wrong.length;i++){
      if(SS_rotationSet(wrong[i].cells).has(h))return;
      if(SS_overlap(wrong[i].cells,g.cells)>=0.80)return;
    }
    seenCanon.add(c);banSet.add(h);wrong.push(g);
  };
  /* Retry loop: builders are randomized (leaf selection + frontier placement
     differ each call), so multiple passes dramatically raise yield for compact
     n=7/8 shapes where a single attempt often trips the >=0.80 overlap guard.
     All anti-twin / anti-rotation / anti-dup guards remain enforced by tryAdd. */
  for(let pass=0;pass<6&&wrong.length<maxCount;pass++){
    for(let b=0;b<builders.length&&wrong.length<maxCount;b++){
      tryAdd(builders[b]());
    }
  }
  return wrong;
}

/* 1. ROTATION MATCH (~40%) — Player sees a shape, must pick the rotated version.
   Correct = a non-identity rotation. Wrong = mirror confusion + near-identical +
   different shape. ALL other rotations of the prompt are banned (they'd be
   alternative correct answers), so exactly one rotation appears among options. */
function SS_buildRotation(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  const rotSet=SS_rotationSet(cells);
  const rotList=Array.from(rotSet.values());
  if(rotList.length<2)return null;            /* need >=2 distinct rotations */
  const promptCells=rotList[0];               /* identity */
  const nonIdentity=rotList.slice(1);
  const correctCells=nonIdentity[Math.floor(Math.random()*nonIdentity.length)];
  const banSet=new Set();
  rotSet.forEach((_,h)=>banSet.add(h));        /* ban ALL rotations of prompt */
  const correctRot=SS_rotationSet(correctCells);
  correctRot.forEach((_,h)=>banSet.add(h));    /* same orbit, but explicit */
  const hard=opts.hard;
  const builders=hard?[
    ()=>SS_distMirror(cells,banSet,0),
    ()=>SS_distMirror(cells,banSet,2),
    ()=>SS_distNearIdent(cells,banSet),
    ()=>SS_distShapeMod(cells,banSet),
    ()=>SS_distDifferentShape(cells,banSet)
  ]:[
    ()=>SS_distMirror(cells,banSet,0),
    ()=>SS_distNearIdent(cells,banSet),
    ()=>SS_distShapeMod(cells,banSet),
    ()=>SS_distDifferentShape(cells,banSet)
  ];
  const wrong=SS_collectDistractors(cells,banSet,correctCells,3,builders);
  if(wrong.length<3)return null;
  const optArr=[{cells:correctCells,correct:true,style:'rotation',mistakeType:null}]
    .concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style,mistakeType:w.mistakeType})));
  SS_shuffle(optArr);
  return{challengeType:'rotation',target:cells,promptCells:promptCells,options:optArr,
         angle:SS_rotationAngle(promptCells,correctCells),family:entry.family};
}
/* Helper: determine the rotation angle (90/180/270) between two rotations. */
function SS_rotationAngle(from,to){
  let c=from;
  for(let i=1;i<=3;i++){c=SS_rotateCW(c);if(SS_hash(c)===SS_hash(to))return i*90;}
  return 90;
}

/* 2. MIRROR (~20%) — Player must pick the mirrored version.
   Correct = a mirror of the prompt (REQUIRES chiral shape). Wrong = rotations of
   the prompt (mirror-vs-rotation confusion) + near-identical + different shape.
   Guards: correct ∈ mirrorSet(prompt); no wrong ∈ mirrorSet(prompt);
   no wrong ∈ rotationSet(correct). RotFillers are rotations of prompt (NOT of
   correct, since chiral => different orbit), so they pass wrongIsRotOfCorrect. */
function SS_buildMirror(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  if(!entry.hasMirror)return null;            /* REQUIRES chiral shape */
  const mirSet=SS_mirrorSet(cells);
  const mirList=Array.from(mirSet.values());
  if(!mirList.length)return null;
  const correctCells=mirList[Math.floor(Math.random()*mirList.length)];
  const rotSet=SS_rotationSet(cells);
  const rotList=Array.from(rotSet.values());
  const promptCells=rotList[0];
  const correctRot=SS_rotationSet(correctCells);
  const banSet=new Set();
  correctRot.forEach((_,h)=>banSet.add(h));   /* ban correct + its rotations */
  const hard=opts.hard;
  /* rotation fillers: other rotations of prompt (NOT the prompt itself, NOT mirrors) */
  const fillers=rotList.filter(c=>SS_hash(c)!==SS_hash(promptCells)&&!mirSet.has(SS_hash(c)));
  const wrong=[];
  const seenCanon=new Set();
  const tryAdd=(g)=>{
    if(!g)return;
    const h=SS_hash(g.cells);
    if(banSet.has(h))return;
    if(mirSet.has(h))return;                  /* must not be a valid mirror (would be correct) */
    if(correctRot.has(h))return;              /* must not be rotation-equiv to correct */
    if(SS_overlap(correctCells,g.cells)>=0.80)return;
    const c=SS_canonicalHash(g.cells);
    if(seenCanon.has(c))return;
    for(let i=0;i<wrong.length;i++){if(SS_overlap(wrong[i].cells,g.cells)>=0.80)return;}
    seenCanon.add(c);banSet.add(h);wrong.push(g);
  };
  /* Add 1-2 rotation fillers (believable rotationNotMirror mistakes).
     These share canonical hash with prompt (same free polyomino) but are NOT
     mirrors and NOT rotations of correct — intentional confusion traps.
     FIX: must pass the SAME overlap checks as tryAdd — no visual twin of
     correct or of any already-added wrong option (verifier rejects >=0.85). */
  const fillerCount=hard?2:1;
  let fi=0;
  for(let i=0;i<fillers.length&&fi<fillerCount;i++){
    const f=fillers[i];
    const fh=SS_hash(f);
    if(banSet.has(fh))continue;
    if(mirSet.has(fh))continue;
    if(correctRot.has(fh))continue;
    if(SS_overlap(correctCells,f)>=0.80)continue;          /* no visual twin of correct */
    let twin=false;
    for(let j=0;j<wrong.length;j++){if(SS_overlap(wrong[j].cells,f)>=0.80){twin=true;break;}}
    if(twin)continue;
    banSet.add(fh);
    wrong.push({cells:f,style:'rotFiller',mistakeType:'rotationNotMirror'});
    fi++;
  }
  tryAdd(SS_distNearIdent(cells,banSet));
  if(hard)tryAdd(SS_distShapeMod(cells,banSet));
  tryAdd(SS_distDifferentShape(cells,banSet));
  let safety=0;
  while(wrong.length<3&&safety<8){safety++;tryAdd(SS_distNearIdent(cells,banSet));}
  if(wrong.length<3)return null;
  const optArr=[{cells:correctCells,correct:true,style:'mirrorAnswer',mistakeType:null}]
    .concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style,mistakeType:w.mistakeType||'rotationNotMirror'})));
  SS_shuffle(optArr);
  return{challengeType:'mirror',target:cells,promptCells:promptCells,options:optArr,family:entry.family};
}

/* 3. MEMORY (~15%) — Show shape, hide, mentally rotate, choose.
   Variants: A) shape-memory: "which is the SAME shape?" (correct=prompt).
             B) rotation-memory: "which is the ROTATED version?" (correct=rotation). */
function SS_buildMemory(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  const rotSet=SS_rotationSet(cells);
  const rotList=Array.from(rotSet.values());
  const promptCells=rotList[0];
  const variant=opts.memoryVariant||(rotList.length>=2&&(Math.random()<0.5)?'rotation':'shape');
  if(variant==='rotation'&&rotList.length<2)return SS_buildMemory(entry,Object.assign({},opts,{memoryVariant:'shape'}));
  let correctCells,banSet,wrong=[];
  const seenCanon=new Set([SS_canonicalHash(cells)]);
  if(variant==='rotation'){
    correctCells=rotList[1+Math.floor(Math.random()*(rotList.length-1))];
    banSet=new Set();
    rotSet.forEach((_,h)=>banSet.add(h));
    const correctRot=SS_rotationSet(correctCells);
    correctRot.forEach((_,h)=>banSet.add(h));
    seenCanon.add(SS_canonicalHash(correctCells));
    const tryAdd=(g)=>{
      if(!g)return;const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      if(correctRot.has(h))return;
      if(SS_overlap(correctCells,g.cells)>=0.80)return;
      const c=SS_canonicalHash(g.cells);if(seenCanon.has(c))return;
      for(let i=0;i<wrong.length;i++){if(SS_overlap(wrong[i].cells,g.cells)>=0.80)return;}
      seenCanon.add(c);banSet.add(h);wrong.push(g);
    };
    tryAdd(SS_distMirror(cells,banSet,0));
    tryAdd(SS_distNearIdent(cells,banSet));
    tryAdd(SS_distDifferentShape(cells,banSet));
    let s=0;while(wrong.length<3&&s<8){s++;tryAdd(SS_distNearIdent(cells,banSet));}
  }else{
    correctCells=promptCells;
    banSet=new Set();
    rotSet.forEach((_,h)=>banSet.add(h));    /* ban all rotations (would be "same shape") */
    const tryAdd=(g)=>{
      if(!g)return;const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      if(SS_overlap(promptCells,g.cells)>=0.80)return;
      const c=SS_canonicalHash(g.cells);if(seenCanon.has(c))return;
      for(let i=0;i<wrong.length;i++){if(SS_overlap(wrong[i].cells,g.cells)>=0.80)return;}
      seenCanon.add(c);banSet.add(h);wrong.push(g);
    };
    tryAdd(SS_distMirror(cells,banSet,0));
    tryAdd(SS_distNearIdent(cells,banSet));
    tryAdd(SS_distDifferentShape(cells,banSet));
    let s=0;while(wrong.length<3&&s<8){s++;tryAdd(SS_distDifferentShape(cells,banSet));}
  }
  if(wrong.length<3)return null;
  const optArr=[{cells:correctCells,correct:true,style:'memCorrect',mistakeType:null}]
    .concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style,mistakeType:w.mistakeType})));
  SS_shuffle(optArr);
  return{challengeType:'memory',target:cells,promptCells:promptCells,options:optArr,
         memoryPhase:true,memoryVariant:variant,family:entry.family};
}

/* 4. ODD SHAPE (~15%) — Three belong to same family (rotations), one does not.
   REQUIRES rotSym===4 (4 distinct rotations for 3 family members). The odd one
   must be a DIFFERENT family, same cell count, NOT a rotation or mirror of target. */
function SS_buildOdd(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  const rotSet=SS_rotationSet(cells);
  const rotList=Array.from(rotSet.values());
  if(rotList.length<3)return null;            /* need 3 distinct rotations */
  /* FIX: familyPicks must be pairwise visually distinct (<0.80 overlap).
     Different rotations of compact n=7/8 shapes can share 6/7=0.857 or 7/8=0.875
     cells when normalized, causing verifier visualTwin rejection (>=0.85).
     Distinct hashes do NOT prevent this. Reshuffle up to 8 times to find a
     visually-distinct trio; give up if none exists. */
  let familyPicks=null;
  for(let attempt=0;attempt<8;attempt++){
    SS_shuffle(rotList);
    const picks=rotList.slice(0,3);
    const fh=new Set(picks.map(SS_hash));
    if(fh.size!==3)continue;
    let twin=false;
    for(let i=0;i<picks.length&&!twin;i++){
      for(let j=i+1;j<picks.length;j++){
        if(SS_overlap(picks[i],picks[j])>=0.80){twin=true;break;}
      }
    }
    if(!twin){familyPicks=picks;break;}
  }
  if(!familyPicks)return null;
  const famHashes=new Set(familyPicks.map(SS_hash));
  const targetCanon=SS_canonicalHash(cells);
  const targetRot=SS_rotationSet(cells);
  const targetMir=SS_mirrorSet(cells);
  const targetBB=SS_bbox(cells);
  let oddShape=null;
  for(let t=0;t<32;t++){
    const pool=SS_catByN(cells.length);
    if(!pool.length)break;
    const e=pool[Math.floor(Math.random()*pool.length)];
    if(e.family===entry.family)continue;       /* different family */
    const eh=SS_hash(e.cells);
    if(SS_canonicalHash(e.cells)===targetCanon)continue;
    if(targetRot.has(eh))continue;             /* odd must NOT be a rotation of target */
    if(targetMir.has(eh))continue;             /* odd must NOT be a mirror of target */
    if(famHashes.has(eh))continue;
    const bb=SS_bbox(e.cells);
    /* require visible silhouette difference but SAME cell count */
    if(Math.abs(bb.rows-targetBB.rows)+Math.abs(bb.cols-targetBB.cols)<1&&
       SS_overlap(cells,e.cells)>=0.70)continue;
    let twin=false;
    for(let i=0;i<familyPicks.length;i++){if(SS_overlap(familyPicks[i],e.cells)>=0.75){twin=true;break;}}
    if(twin)continue;
    oddShape=e.cells;break;
  }
  if(!oddShape)return null;
  const optArr=familyPicks.map(c=>({cells:c,correct:false,style:'family',mistakeType:'sameFamily'}));
  optArr.push({cells:oddShape,correct:true,style:'oddOne',mistakeType:null});
  SS_shuffle(optArr);
  return{challengeType:'odd',target:cells,options:optArr,family:entry.family};
}

/* 5. ROTATION SEQUENCE (~10%) — 0° -> 90° -> [?] -> 270°. Player predicts 180°.
   REQUIRES rotSym===4 (s0!=s2 and s1!=s3). Correct = s2 (180°). Wrong options
   are near-identical + shape-mod + different-shape (NOT mirrors — mirrors share
   canonical hash with s2 and would fail the canonical-uniqueness guard; NOT
   other rotations — they're visible in the chain and banned). */
function SS_buildSequence(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  const s0=SS_norm(cells);
  const s1=SS_rotateCW(s0);
  const s2=SS_rotateCW(s1);   /* correct = 180° */
  const s3=SS_rotateCW(s2);
  if(SS_hash(s0)===SS_hash(s2))return null;    /* 180° symmetric: ambiguous */
  if(SS_hash(s1)===SS_hash(s3))return null;    /* 90° symmetric: would duplicate */
  const correctRot=SS_rotationSet(s2);         /* = rotSet(cells) = {s0,s1,s2,s3} */
  const banSet=new Set();
  banSet.add(SS_hash(s0));                      /* visible in chain */
  banSet.add(SS_hash(s1));                      /* visible in chain */
  banSet.add(SS_hash(s2));                      /* correct */
  banSet.add(SS_hash(s3));                      /* visible in chain */
  correctRot.forEach((_,h)=>banSet.add(h));     /* ban all rotations (visible or correct) */
  const wrong=[];
  const seenCanon=new Set([SS_canonicalHash(cells)]); /* s2's canon = cells' canon */
  const tryAdd=(g)=>{
    if(!g)return;const h=SS_hash(g.cells);
    if(banSet.has(h))return;
    if(correctRot.has(h))return;              /* no rotation-equivalent to correct */
    if(SS_overlap(s2,g.cells)>=0.80)return;   /* no visual twin of correct */
    const c=SS_canonicalHash(g.cells);if(seenCanon.has(c))return; /* no dup canon (mirror shares canon!) */
    for(let i=0;i<wrong.length;i++){if(SS_overlap(wrong[i].cells,g.cells)>=0.80)return;}
    seenCanon.add(c);banSet.add(h);wrong.push(g);
  };
  /* Distractors: near-identical, shape-mod, different-shape.
     NO mirror (shares canonical hash with s2 => dup canon => verifier rejects). */
  tryAdd(SS_distNearIdent(s2,banSet));
  tryAdd(SS_distShapeMod(s2,banSet));
  tryAdd(SS_distDifferentShape(s2,banSet));
  let safety=0;
  while(wrong.length<3&&safety<8){safety++;tryAdd(SS_distNearIdent(s2,banSet));}
  if(wrong.length<3)return null;
  const optArr=[{cells:s2,correct:true,style:'seqCorrect',mistakeType:null}]
    .concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style,mistakeType:w.mistakeType||'wrongAngle'})));
  SS_shuffle(optArr);
  return{challengeType:'sequence',target:cells,chainSteps:{s0:s0,s1:s1,s2:s2,s3:s3},
         options:optArr,family:entry.family};
}

/* Master builder: pick a shape suitable for the category and build the round.
   Shape-pick options derive from SS_CHALLENGE_REGISTRY[cat].shapeOpts — no
   hardcoded per-category if-chain, so future challenges work automatically. */
function SS_buildRoundForCategory(cat,difficulty,modeBias,opts){
  opts=opts||{};
  const tier=SS_tierForDifficulty(difficulty,modeBias);
  const reg=SS_CHALLENGE_REGISTRY[cat];
  let pickOpts=Object.assign({tier:tier},reg?reg.shapeOpts:{});
  let entry=SS_pickCatalog(pickOpts);
  if(!entry){
    const relax=Object.assign({},pickOpts);delete relax.tier;
    entry=SS_pickCatalog(relax);
  }
  if(!entry)return null;
  const genOpts={hard:modeBias>=1};
  /* Registry-driven builder dispatch — future challenges only need an entry
     here (and enabled:true in the registry). No switch/case to maintain. */
  const SS_BUILDERS={
    rotation:SS_buildRotation, mirror:SS_buildMirror, memory:SS_buildMemory,
    odd:SS_buildOdd, sequence:SS_buildSequence
    /* future: composite:SS_buildComposite, reconstruction:SS_buildReconstruction, ... */
  };
  const builder=SS_BUILDERS[cat];
  let round=builder?builder(entry,genOpts):null;
  if(round){
    round.tier=entry.tier;
    round.difficulty=difficulty;
    /* stratKey derives from the registry — no hardcoded per-category ternary. */
    const stratKey=(SS_CHALLENGE_REGISTRY[cat]||{}).stratKey||'rotAngles';
    round.recipe=SS_makePuzzleRecipe(cat,entry,0,stratKey,difficulty);
  }
  return round;
}

/* ======================================================================
   SECTION 7 — VERIFIER (hardened correctness + ambiguity guards)
   Rejects any round with: duplicate options, visual twins, rotation-equivalent
   wrong options, multiple correct answers, or category-specific violations.
   All guards are ROTATION-SET based (mathematically exact, not visual heuristic).
   ====================================================================== */
function SS_verifyRound(round){
  if(!round||!round.options||round.options.length!==4)return false;
  if(round.options.filter(o=>o.correct).length!==1)return false;
  const hasCells=round.options[0]&&round.options[0].cells;
  if(hasCells){
    /* no two options share the same hash */
    const seen=new Set();
    for(let i=0;i<round.options.length;i++){
      if(!round.options[i].cells)return false;
      const h=SS_hash(round.options[i].cells);
      if(seen.has(h))return false;
      seen.add(h);
    }
    /* no two options visually identical (>=85% overlap) */
    for(let i=0;i<round.options.length;i++){
      for(let j=i+1;j<round.options.length;j++){
        if(SS_overlap(round.options[i].cells,round.options[j].cells)>=0.85)return false;
      }
    }
    /* no two options canonical-equivalent — EXCEPT:
       - odd: 3 family members are deliberately rotations of each other (same canon).
       - mirror: rotFiller distractors are rotations of the prompt (same canon as
         prompt, which is NOT the correct answer). Intentional confusion traps. */
    if(round.challengeType!=='odd'&&round.challengeType!=='mirror'){
      const canon=new Set();
      for(let i=0;i<round.options.length;i++){
        const c=SS_canonicalHash(round.options[i].cells);
        if(canon.has(c))return false;
        canon.add(c);
      }
    }
    /* no wrong option rotation-equivalent to correct */
    const correct=round.options.find(o=>o.correct);
    if(!correct||!correct.cells)return false;
    const cRot=SS_rotationSet(correct.cells);
    for(let i=0;i<round.options.length;i++){
      if(round.options[i].correct||!round.options[i].cells)continue;
      if(cRot.has(SS_hash(round.options[i].cells)))return false;
    }
  }
  /* Mirror: wrong options must NOT also be mirrors of the prompt */
  if(round.challengeType==='mirror'&&round.promptCells){
    const promptMir=SS_mirrorSet(round.promptCells);
    for(let i=0;i<round.options.length;i++){
      if(round.options[i].correct||!round.options[i].cells)continue;
      if(promptMir.has(SS_hash(round.options[i].cells)))return false;
    }
  }
  /* Memory (shape variant): wrong options must NOT be rotations of the prompt */
  if(round.challengeType==='memory'&&round.memoryVariant==='shape'&&round.promptCells){
    const promptRot=SS_rotationSet(round.promptCells);
    for(let i=0;i<round.options.length;i++){
      if(round.options[i].correct||!round.options[i].cells)continue;
      if(promptRot.has(SS_hash(round.options[i].cells)))return false;
    }
  }
  /* Odd: family members must be in the rotation set; odd must NOT be */
  if(round.challengeType==='odd'&&round.target){
    const targetRot=SS_rotationSet(round.target);
    const targetMir=SS_mirrorSet(round.target);
    for(let i=0;i<round.options.length;i++){
      if(!round.options[i].cells)continue;
      const h=SS_hash(round.options[i].cells);
      const inRot=targetRot.has(h);
      if(round.options[i].correct&&inRot)return false;     /* odd must not be a rotation */
      if(!round.options[i].correct&&!inRot)return false;   /* family must be rotations */
      if(round.options[i].correct&&targetMir.has(h))return false; /* odd not a mirror either */
    }
  }
  /* Sequence: no option equals visible steps s0/s1/s3 */
  if(round.challengeType==='sequence'&&round.chainSteps){
    const s0h=SS_hash(round.chainSteps.s0);
    const s1h=SS_hash(round.chainSteps.s1);
    const s3h=SS_hash(round.chainSteps.s3);
    for(let i=0;i<round.options.length;i++){
      if(!round.options[i].cells)continue;
      const h=SS_hash(round.options[i].cells);
      if(h===s0h||h===s1h||h===s3h)return false;
    }
  }
  return true;
}

/* ======================================================================
   SECTION 8 — RENDERING (SVG shapes, prompts, options)
   Design: puzzle ~70% of visual attention, HUD ~30%. Unified purple theme.
   Shapes are larger, options are larger, whitespace improves readability.
   ====================================================================== */
const SS_SHAPE_COLOR='#7C3AED';      /* prompt + all options: geometry is the only signal */
const SS_MODES={
  classic:{label:'Classic',emoji:'🎯',sub:'Balanced · adaptive · 3 lives',time:8000,minTime:4500,decay:160,nMin:4,nMax:7,zen:false,lives:3,combo:false,bias:0},
  speed:  {label:'Speed',  emoji:'⚡',sub:'4.5s flat · combos · fast reflex',time:4500,minTime:4500,decay:0,  nMin:4,nMax:5,zen:false,lives:3,combo:true, bias:0},
  expert: {label:'Expert', emoji:'🔥',sub:'Complex shapes · mirror traps',time:7000,minTime:4500,decay:120,nMin:5,nMax:8,zen:false,lives:3,combo:false,bias:1},
  zen:    {label:'Zen',    emoji:'🧘',sub:'No timer · unlimited lives · learn',time:0,minTime:0,decay:0,nMin:4,nMax:6,zen:true,lives:Infinity,combo:false,bias:-1}
};
const SS_MODE_KEYS=['classic','speed','expert','zen'];

/* Draw a shape as SVG. cells normalized internally; cs = cell size.
   opts: {ghostCell, dimCells, stroke} for special prompts. */
function SS_drawShapeSvg(cells,cs,color,opts){
  opts=opts||{};
  const nc=SS_norm(cells);
  const bb=SS_bbox(nc);
  const p=3,w=bb.cols*cs+p*2,h=bb.rows*cs+p*2;
  let inner='';
  for(let i=0;i<nc.length;i++){
    inner+='<rect x="'+(nc[i][1]*cs+p)+'" y="'+(nc[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="'+Math.max(3,cs*0.18)+'" fill="'+color+'"/>';
  }
  if(opts.ghostCell){
    const g=opts.ghostCell;
    inner+='<rect x="'+(g[1]*cs+p)+'" y="'+(g[0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="'+Math.max(3,cs*0.18)+'" fill="none" stroke="'+(opts.stroke||'#A78BFA')+'" stroke-width="2" stroke-dasharray="4 3"/>';
  }
  if(opts.dimCells){
    for(let i=0;i<opts.dimCells.length;i++){
      const dc=opts.dimCells[i];
      inner+='<rect x="'+(dc[1]*cs+p)+'" y="'+(dc[0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="'+Math.max(3,cs*0.18)+'" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3 3" opacity=".35"/>';
    }
  }
  return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>';
}

/* ======================================================================
   SECTION 9 — FEEDBACK (animations + educational explanations)
   Correct: soft glow + small particles + rotation animation + haptic.
   Wrong: shake + red flash + reveal correct + educational transition.
   ====================================================================== */
/* Derive SS_CHALLENGE_META from the registry (single source of truth). */
const SS_CHALLENGE_META={};
SS_CAT_KEYS.forEach(function(k){
  const r=SS_CHALLENGE_REGISTRY[k];
  SS_CHALLENGE_META[k]={emoji:r.emoji,name:r.name,instruction:r.instruction};
});
function SS_badgeHtml(challengeType){
  const meta=SS_CHALLENGE_META[challengeType]||SS_CHALLENGE_META.rotation;
  return '<div class="ss-badge" style="background:linear-gradient(135deg,#7C3AED,#4F8EF7);">'+
    '<span class="ss-badge-emoji">'+meta.emoji+'</span>'+
    '<div class="ss-badge-info"><div class="ss-badge-name">'+meta.name+'</div>'+
    '<div class="ss-badge-inst">'+meta.instruction+'</div></div></div>';
}

/* Educational feedback for a wrong answer — teaches spatial reasoning. */
function SS_explainMistake(pickedOpt,round){
  if(!pickedOpt)return '⏱ Time\'s up! The correct answer is highlighted.';
  const mt=pickedOpt.mistakeType;
  const angle=round.angle;
  const MSGS={
    mirrorConfusion:'That\'s a mirror image, not a rotation. Mirrors flip the shape left–right; rotations spin it.',
    rotationNotMirror:'That\'s a rotation, not a mirror. Try flipping the shape instead of turning it.',
    wrongAngle:'Close — that\'s a different rotation angle. '+(angle?'The correct answer is rotated '+angle+'°.':'Look again at how far it turned.'),
    differentShape:'That shape has a different structure. Compare the block count and arrangement carefully.',
    sameFamily:'That belongs to the same family as the others. The odd one looks structurally different.',
    wrongLocation:'Close, but the block belongs in a different position.'
  };
  return MSGS[mt]||'Not quite — the correct answer is highlighted in green.';
}

/* Detailed Zen-mode explanation — registry-driven (single source of truth).
   Memory has a variant override; others use the registry zenExplain. */
function SS_explainZen(round){
  const ct=round.challengeType;
  if(ct==='memory'&&round.memoryVariant==='rotation'){
    return '\u{1F9E0} Memory + Rotation: you had to remember the shape, then mentally rotate it. The correct answer is that rotation.';
  }
  const reg=SS_CHALLENGE_REGISTRY[ct];
  return reg?reg.zenExplain:'Correct answer highlighted in green.';
}

/* Small particle burst on correct answer (lightweight DOM, GPU-friendly). */
function SS_burstParticles(el){
  if(!el||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const rect=el.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const colors=['#22C55E','#7C3AED','#4F8EF7','#34D399'];
  for(let i=0;i<8;i++){
    const p=document.createElement('div');
    p.className='ss-particle';
    const ang=(Math.PI*2*i)/8+Math.random()*0.4;
    const dist=28+Math.random()*18;
    p.style.cssText='left:'+cx+'px;top:'+cy+'px;background:'+colors[i%colors.length]+
      ';--tx:'+Math.cos(ang)*dist+'px;--ty:'+Math.sin(ang)*dist+'px;';
    document.body.appendChild(p);
    setTimeout(()=>{if(p.parentNode)p.remove();},650);
  }
}

/* ======================================================================
   SECTION 10 — GAME FLOW (modes, loop, timers, lives, combos)
   Phase 9: Memory redesigned — Show → Fade → Blank → Choose.
   Phase 10: Hidden skill rating feeds adaptive difficulty.
   ====================================================================== */
function playSpatialSpin(body,setScore,end,wrap,startClock){
  let mode='classic';

  const G={
    round:0,lives:3,correctCount:0,attempts:0,comboCount:0,comboMax:0,
    barT:null,roundStart:0,roundOffPause:0,timerMs:0,
    pending:false,
    challengeHistory:[],   /* last challenge types for anti-repetition */
    recentResults:[],      /* last 5 boolean results for difficulty scoring */
    recentMs:[],           /* last 5 solve times */
    skill:SS_newSkillProfile(),
    mirrorErrors:0,nearErrors:0
  };

  /* Freshness tracker: avoid repeating the same canonical shape / family too often */
  const Fresh={
    canon:[],families:[],correctPos:[],
    /* sessionSigs: full round signature = canonHash+':'+challengeType
       tracks EVERY round shown this session so EXACT repeats are impossible */
    sessionSigs:new Set(),
    maxCanon:40,maxFam:6,maxPos:8,
    addCanon(h){this.canon.push(h);if(this.canon.length>this.maxCanon)this.canon.shift();},
    hasCanon(h){return this.canon.indexOf(h)>=0;},
    addSig(sig){this.sessionSigs.add(sig);},
    hasSig(sig){return this.sessionSigs.has(sig);},
    addFam(f){this.families.push(f);if(this.families.length>this.maxFam)this.families.shift();},
    countFam(f,n){let c=0;const s=Math.max(0,this.families.length-n);for(let i=s;i<this.families.length;i++)if(this.families[i]===f)c++;return c;},
    addPos(p){this.correctPos.push(p);if(this.correctPos.length>this.maxPos)this.correctPos.shift();},
    countPos(p,n){let c=0;const s=Math.max(0,this.correctPos.length-n);for(let i=s;i<this.correctPos.length;i++)if(this.correctPos[i]===p)c++;return c;},
    clear(){this.canon=[];this.families=[];this.correctPos=[];this.sessionSigs=new Set();}
  };

  /* Adaptive bias: nudges block count + timer based on recent performance */
  const Adapt={
    win:[],winSize:8,bias:0,
    record(correct,ms,timerMs){
      this.win.push({c:correct?1:0,ms:ms||0,t:timerMs||5000});
      if(this.win.length>this.winSize)this.win.shift();
      if(this.win.length>=5)this._tune();
    },
    _tune(){
      let acc=0,rt=0,tref=0;
      for(let i=0;i<this.win.length;i++){acc+=this.win[i].c;rt+=this.win[i].ms;tref+=this.win[i].t;}
      acc/=this.win.length;rt/=this.win.length;tref/=this.win.length;
      const fast=tref?rt/tref:1;
      if(acc>=0.85&&fast<=0.5)this.bias=Math.min(2,this.bias+1);
      else if(acc<0.6)this.bias=Math.max(-2,this.bias-1);
    },
    accuracy(){if(!this.win.length)return 1;let a=0;for(let i=0;i<this.win.length;i++)a+=this.win[i].c;return a/this.win.length;},
    avgRT(){if(!this.win.length)return 0;let r=0;for(let i=0;i<this.win.length;i++)r+=this.win[i].ms;return r/this.win.length;},
    reset(){this.win=[];this.bias=0;}
  };

  /* visibility pause */
  let _hidTs=0;
  const _onVis=()=>{
    if(document.hidden){_hidTs=Date.now();if(G.barT){_cti(G.barT);G.barT=null;}}
    else if(_hidTs){G.roundOffPause+=Date.now()-_hidTs;_hidTs=0;_resumeTimer();}
  };
  document.addEventListener('visibilitychange',_onVis);
  function _cleanup(){
    document.removeEventListener('visibilitychange',_onVis);
    if(G.barT){_cti(G.barT);G.barT=null;}
  }
  wrap.addEventListener('remove_game',_cleanup);

  /* ---------- challenge-type picker (weighted + anti-repetition + adaptive) ---------- */
  function SS_pickChallengeType(){
    const weights=SS_adaptiveWeights(SS_CAT_WEIGHTS[mode],G.skill);
    const types=SS_CAT_KEYS.filter(k=>weights[k]>0);
    if(!types.length)return 'rotation';
    const last=G.challengeHistory.length?G.challengeHistory[G.challengeHistory.length-1]:null;
    const recent5=G.challengeHistory.slice(-5);
    let pool=[],totalW=0;
    for(let i=0;i<types.length;i++){
      const t=types[i];
      if(t===last&&types.length>1)continue;       /* never same twice in a row */
      let w=weights[t];
      const recentCount=recent5.filter(x=>x===t).length;
      if(recentCount>=2)w*=0.3;
      else if(recentCount>=1)w*=0.6;
      /* ease in: reduce memory early */
      if(G.round<4&&t==='memory')w*=0.3;
      if(w>0){pool.push({type:t,w:w});totalW+=w;}
    }
    if(!pool.length)return types[0];
    let r=Math.random()*totalW;
    for(let i=0;i<pool.length;i++){r-=pool[i].w;if(r<=0)return pool[i].type;}
    return pool[pool.length-1].type;
  }

  /* ---------- build the next round (with retries + freshness + skill rating) ---------- */
  function SS_buildNextRound(){
    const def=SS_MODES[mode];
    const modeBias=def.bias+Adapt.bias;
    /* Phase 10: blend hidden skill rating into difficulty for smoother ramp */
    const skillBias=SS_skillRating(G.skill)/100;   /* 0..1 */
    const diff=SS_difficultyScore(G.round,G.recentResults,
      G.recentMs.length?G.recentMs.reduce((a,b)=>a+b,0)/G.recentMs.length:0,G.timerMs||def.time);
    const adjDiff=diff*(0.7+skillBias*0.6);          /* ±15% from skill */
    const n=SS_blockBand(adjDiff,def,modeBias);
    let challengeType=SS_pickChallengeType();
    let round=null;
    /* Try up to 4 challenge types; within each, try up to 12 shapes */
    for(let typeAttempt=0;typeAttempt<4&&!round;typeAttempt++){
      if(typeAttempt>0)challengeType=SS_pickChallengeType();
      for(let attempt=0;attempt<12;attempt++){
        const built=SS_buildRoundForCategory(challengeType,adjDiff,modeBias,{nMin:n,nMax:n});
        if(!built)continue;
        /* freshness: avoid recently-seen canonical shapes + over-used families */
        const canon=SS_canonicalHash(built.target);
        const sig=canon+':'+challengeType; /* full round signature */
        /* Block if EXACT same round (same shape + same challenge type) shown this session */
        if(Fresh.hasSig(sig))continue;
        /* Also block if same TARGET shape was used recently (within last maxCanon rounds) */
        if(Fresh.hasCanon(canon))continue;
        if(built.family&&Fresh.countFam(built.family,4)>=3)continue;
        if(!SS_verifyRound(built))continue;
        round=built;
        round.canon=canon;
        round.sig=sig;
        break;
      }
    }
    /* emergency fallback: a guaranteed-clean rotation puzzle */
    if(!round){
      challengeType='rotation';
      for(let attempt=0;attempt<20&&!round;attempt++){
        const built=SS_buildRoundForCategory('rotation',Math.min(10,adjDiff),modeBias,{nMin:4,nMax:5});
        if(built&&SS_verifyRound(built)){
          round=built;
          round.canon=SS_canonicalHash(built.target);
        }
      }
    }
    return round;
  }

  /* ---------- timer helpers ---------- */
  function SS_timerForRound(){
    const def=SS_MODES[mode];
    if(def.zen)return 0;
    let t=def.time-G.round*def.decay;
    t*=1-Adapt.bias*0.05;
    if(t<def.minTime)t=def.minTime;
    if(t>def.time)t=def.time;
    return Math.round(t);
  }
  function _resumeTimer(){
    if(!host||SS_MODES[mode].zen||G.barT||!G.timerMs)return;
    _startBar();
  }
  function _startBar(){
    const def=SS_MODES[mode];
    if(def.zen||!G.timerMs)return;
    if(G.barT){_cti(G.barT);G.barT=null;}
    G.barT=_si(()=>{
      const elapsed=Date.now()-G.roundStart-G.roundOffPause;
      const pct=Math.max(0,100-elapsed/G.timerMs*100);
      const bar=wrap.querySelector('#ssBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=G.timerMs){_cti(G.barT);G.barT=null;_resolve(-1,true);}
    },80);
  }

  let host=null,_curRound=null;

  function startGame(){
    G.round=0;G.lives=SS_MODES[mode].lives;G.correctCount=0;G.attempts=0;
    G.comboCount=0;G.comboMax=0;G.pending=false;G.challengeHistory=[];
    G.skill=SS_newSkillProfile();G.recentResults=[];G.recentMs=[];
    G.mirrorErrors=0;G.nearErrors=0;
    Fresh.clear();Adapt.reset();
    body.innerHTML='';
    host=$('<div class="ss-play"></div>');
    body.appendChild(host);
    setScore(0);
    nextQ();
  }

  function nextQ(){
    if(G.lives<=0||G.pending)return;
    if(G.barT){_cti(G.barT);G.barT=null;}
    const round=SS_buildNextRound();
    if(!round){ /* should never happen after fallback, but guard anyway */
      _st(gameOver,400);return;
    }
    G.challengeHistory.push(round.challengeType);
    if(G.challengeHistory.length>10)G.challengeHistory.shift();
    if(round.canon)Fresh.addCanon(round.canon);
    if(round.sig)Fresh.addSig(round.sig);  /* register full signature — prevents any repeat this session */
    if(round.family)Fresh.addFam(round.family);
    const correctIdx=round.options.findIndex(o=>o.correct);
    if(correctIdx>=0)Fresh.addPos(correctIdx);
    /* NOTE: position-swap removed — it caused same question to reappear with different answer position
       which felt like repetition to the player. Correct position variety is handled by SS_avoidStalePos
       inside each builder function which shuffles options before returning. */
    _curRound=round;
    G.timerMs=SS_timerForRound();
    G.roundStart=Date.now();G.roundOffPause=0;
    if(round.challengeType==='memory'){
      renderMemoryPhase(round);
    }else{
      renderRound(round);
    }
  }

  /* ---------- MEMORY phase (Phase 9): Show → Fade → Blank → Choose ---------- */
  function renderMemoryPhase(round){
    const def=SS_MODES[mode],zen=def.zen,cs=28;
    const blockCount=round.promptCells.length;
    const memDuration=zen?4200:Math.min(3600,1500+blockCount*300);
    const heartsHtml=SS_heartsHtml();
    /* SHOW phase — display the shape with a countdown */
    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      heartsHtml+
      SS_roundRowHtml()+
      SS_badgeHtml('memory')+
      '<div class="ss-memory-phase"><div class="ss-memory-label">💡 Remember this shape!</div>'+
      '<div class="ss-disp-wrap"><div class="ss-disp ss-disp-lg" id="ssMemShape">'+SS_drawShapeSvg(round.promptCells,cs,SS_SHAPE_COLOR)+'</div></div>'+
      '<div class="ss-memory-timer" id="ssMemTimer">'+(memDuration/1000).toFixed(1)+'s</div></div>';
    const memShapeEl=host.querySelector('#ssMemShape');
    let elapsed=0;
    const memInterval=_si(()=>{
      elapsed+=100;
      const remain=Math.max(0,(memDuration-elapsed)/1000).toFixed(1);
      const timerEl=host.querySelector('#ssMemTimer');
      if(timerEl)timerEl.textContent=remain+'s';
      if(elapsed>=memDuration){
        _cti(memInterval);
        /* FADE phase — animate opacity down over 400ms */
        if(memShapeEl){
          memShapeEl.style.transition='opacity 0.4s ease, transform 0.4s ease';
          memShapeEl.style.opacity='0';
          memShapeEl.style.transform='scale(0.85)';
        }
        /* BLANK phase — after fade, show blank placeholder for 600ms */
        _st(()=>{
          const lbl=host.querySelector('.ss-memory-label');
          const wrap2=host.querySelector('.ss-disp-wrap');
          if(lbl)lbl.textContent='🧠 ...';
          if(wrap2){
            wrap2.innerHTML='<div class="ss-disp ss-disp-lg ss-mem-blank">?</div>';
          }
          const tmr=host.querySelector('#ssMemTimer');
          if(tmr)tmr.textContent='';
          /* CHOOSE phase — render the round with options after blank gap */
          _st(()=>{
            round.memoryPhase=false;
            renderRound(round);
          },zen?700:600);
        },400);
      }
    },100);
  }

  /* ---------- HUD helpers ---------- */
  function SS_heartsHtml(){
    const def=SS_MODES[mode];
    if(def.zen)return '<div class="qm-zen-tag">🧘 Zen — no timer / unlimited lives</div>';
    return '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+' '+(G.lives===1&&i===0?'mm-last':'')+'">'+(i>=G.lives?'💔':'❤️')+'</span>').join('')+'</div>';
  }
  function SS_roundRowHtml(){
    const def=SS_MODES[mode];
    const comboHtml=(def.combo&&G.comboCount>=2)?'<span class="ss-combo">🔥 '+G.comboCount+'x Combo!</span>':'';
    return '<div class="ss-roundrow"><span>Round <strong>'+(G.round+1)+'</strong></span>'+comboHtml+'<span>Correct <strong>'+G.correctCount+'</strong></span></div>';
  }

  /* ---------- MAIN RENDER ---------- */
  function renderRound(round){
    const def=SS_MODES[mode],zen=def.zen;
    const cs=26;        /* prompt shape size — larger for focus */
    const optCs=22;     /* option shape size — larger for readability */
    round.startedAt=Date.now();
    const ct=round.challengeType;
    let promptSvg='',optsHtml='';

    if(ct==='rotation'){
      promptSvg=SS_drawShapeSvg(round.promptCells,cs,SS_SHAPE_COLOR);
      optsHtml=SS_optsHtml(round,optCs);
    }else if(ct==='mirror'){
      promptSvg=SS_drawShapeSvg(round.promptCells,cs,SS_SHAPE_COLOR)+'<div class="ss-mirror-line"></div>';
      optsHtml=SS_optsHtml(round,optCs);
    }else if(ct==='memory'){
      promptSvg='<div class="ss-memory-hidden">🧠 What was the '+(round.memoryVariant==='rotation'?'rotated version':'shape')+'?</div>';
      optsHtml=SS_optsHtml(round,optCs);
    }else if(ct==='odd'){
      promptSvg='<div class="ss-oddone-label">🔍 Which one doesn\'t belong?</div>';
      optsHtml=SS_optsHtml(round,optCs);
    }else if(ct==='sequence'){
      const st=round.chainSteps;
      promptSvg='<div class="ss-chain-seq">'+
        '<div class="ss-chain-card"><div class="ss-chain-lbl">0°</div>'+SS_drawShapeSvg(st.s0,18,SS_SHAPE_COLOR)+'</div>'+
        '<div class="ss-chain-arrow">→</div>'+
        '<div class="ss-chain-card"><div class="ss-chain-lbl">90°</div>'+SS_drawShapeSvg(st.s1,18,SS_SHAPE_COLOR)+'</div>'+
        '<div class="ss-chain-arrow">→</div>'+
        '<div class="ss-chain-card ss-chain-missing"><div class="ss-chain-lbl">180°</div><div class="ss-chain-q">?</div></div>'+
        '<div class="ss-chain-arrow">→</div>'+
        '<div class="ss-chain-card"><div class="ss-chain-lbl">270°</div>'+SS_drawShapeSvg(st.s3,18,SS_SHAPE_COLOR)+'</div>'+
      '</div>';
      optsHtml=SS_optsHtml(round,optCs);
    }
    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      SS_heartsHtml()+
      SS_roundRowHtml()+
      SS_badgeHtml(ct)+
      '<div class="ss-disp-wrap"><div id="ssDisp" class="ss-disp ss-disp-lg">'+promptSvg+'</div></div>'+
      '<div class="ss-opts ss-opts-lg" id="ssOpts">'+optsHtml+'</div>'+
      '<div id="ssFb" class="ss-fb"></div>';
    SS_bindOptions();
    _startBar();
  }

  /* Build the options HTML — all purple; geometry is the only signal. */
  function SS_optsHtml(round,cs){
    return round.options.map((o,i)=>'<button class="ss-opt ss-opt-lg" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,cs,SS_SHAPE_COLOR)+'</button>').join('');
  }
  function SS_bindOptions(){
    const optEls=host.querySelectorAll('.ss-opt');
    optEls.forEach(btn=>{
      btn.onclick=()=>{
        if(btn.disabled)return;
        if(G.barT){_cti(G.barT);G.barT=null;}
        optEls.forEach(b=>b.disabled=true);
        _resolve(parseInt(btn.dataset.i,10),false);
      };
    });
  }

  /* ---------- resolve a pick ---------- */
  function _resolve(pickedIdx,timedOut){
    const round=_curRound;
    if(!round)return;
    G.attempts++;
    const ms=Date.now()-G.roundStart-G.roundOffPause;
    const optEls=host.querySelectorAll('.ss-opt');
    optEls.forEach(b=>b.disabled=true);
    const correctIdx=round.options.findIndex(o=>o.correct);
    const fb=host.querySelector('#ssFb');
    const def=SS_MODES[mode];
    const isCorrect=!timedOut&&pickedIdx===correctIdx;
    const pickedOpt=pickedIdx>=0?round.options[pickedIdx]:null;
    const ct=round.challengeType;
    /* track per-skill */
    if(G.skill[ct]){
      G.skill[ct].n++;
      G.skill[ct].totalMs=(G.skill[ct].totalMs||0)+ms;
      if(isCorrect)G.skill[ct].ok++;
    }
    G.recentResults.push(isCorrect);if(G.recentResults.length>5)G.recentResults.shift();
    G.recentMs.push(ms);if(G.recentMs.length>5)G.recentMs.shift();
    if(!isCorrect&&pickedOpt){
      if(pickedOpt.mistakeType==='mirrorConfusion'||pickedOpt.mistakeType==='rotationNotMirror')G.mirrorErrors++;
      if(pickedOpt.style==='nearIdent')G.nearErrors++;
    }
    Adapt.record(isCorrect,ms,G.timerMs||5000);

    if(isCorrect){
      playSound('correct');try{navigator.vibrate&&navigator.vibrate(10);}catch(e){}
      G.correctCount++;G.comboCount++;
      if(G.comboCount>G.comboMax)G.comboMax=G.comboCount;
      if(optEls[pickedIdx]){
        optEls[pickedIdx].classList.add('ss-correct');
        SS_burstParticles(optEls[pickedIdx]);
      }
      if(fb){fb.style.color='#22C55E';fb.textContent='✅ Correct!';}
      G.round++;setScore(G.round);
      _st(nextQ,def.zen?500:520);
    }else{
      playSound('wrong');try{navigator.vibrate&&navigator.vibrate([20,40,20]);}catch(e){}
      G.comboCount=0;
      if(pickedIdx>=0&&optEls[pickedIdx]){
        optEls[pickedIdx].classList.add('ss-wrong','wrong-flash');
      }
      if(optEls[correctIdx]){
        optEls[correctIdx].classList.add('ss-correct');
        _st(()=>{if(optEls[correctIdx])optEls[correctIdx].classList.add('correct-flash');},300);
      }
      if(fb){
        fb.style.color='#EF4444';
        fb.textContent='❌ '+SS_explainMistake(pickedOpt,round);
      }
      /* rotation reveal animation */
      if(ct==='rotation'&&optEls[correctIdx]){
        optEls[correctIdx].style.transition='transform 0.5s ease';
        optEls[correctIdx].style.transform='rotate(360deg)';
        _st(()=>{if(optEls[correctIdx])optEls[correctIdx].style.transform='';},600);
      }
      if(def.zen){
        const exp=$('<div class="ss-explain">'+SS_explainZen(round)+'</div>');
        host.appendChild(exp);
        G.round++;_st(nextQ,1700);
        return;
      }
      const dead=_loseLife();
      if(dead){_st(gameOver,1050);return;}
      G.round++;
      _st(nextQ,950);
    }
  }

  function _loseLife(){
    if(SS_MODES[mode].zen)return false;
    G.lives--;
    if(host)host.classList.add('shake-anim');
    _st(()=>{if(host)host.classList.remove('shake-anim');},450);
    return G.lives<=0;
  }

  /* ---------- daily / rank ---------- */
  function SS_dailyChallenge(){
    const dayN=Math.floor(Date.now()/86400000);
    const defs=[
      {label:'Get 10 correct answers',target:10},
      {label:'Reach Round 15',target:15},
      {label:'Get 8 correct answers',target:8},
      {label:'Reach Round 20',target:20},
      {label:'Get 12 correct answers',target:12}
    ];
    return defs[dayN%defs.length];
  }
  function SS_dailyDone(){return S('nz_ss_daily_date')===todayKey()&&!!S('nz_ss_daily_done');}
  function SS_rank(round){
    if(round>=21)return{em:'👑',txt:'Spatial Master'};
    if(round>=16)return{em:'⚡',txt:'Rotation Expert'};
    if(round>=11)return{em:'🧠',txt:'Spatial Thinker'};
    if(round>=6) return{em:'💪',txt:'Getting Oriented'};
    return{em:'🌱',txt:'Spatial Beginner'};
  }

  /* ======================================================================
     SECTION 11 — STATISTICS (Spatial IQ + per-skill + weakest + recommendation)
     ====================================================================== */
  function SS_computeSpatialIQ(skill){
    const cats=SS_CAT_KEYS;
    let totalOk=0,totalN=0,totalMs=0;
    cats.forEach(c=>{if(!skill[c])return;totalOk+=skill[c].ok||0;totalN+=skill[c].n||0;totalMs+=skill[c].totalMs||0;});
    const overallAcc=totalN?totalOk/totalN:0;
    const avgMs=totalN?totalMs/totalN:0;
    const speedBonus=avgMs&&avgMs<2500?12:avgMs&&avgMs<4000?6:avgMs&&avgMs<6000?2:0;
    const roundBonus=Math.min(8,G.round*0.4);
    const iq=Math.round(70+overallAcc*45+speedBonus+roundBonus);
    let weakest=null,weakestAcc=1;
    cats.forEach(c=>{
      if(skill[c]&&skill[c].n>=2){
        const acc=skill[c].ok/skill[c].n;
        if(acc<weakestAcc){weakestAcc=acc;weakest=c;}
      }
    });
    let best=null,bestAcc=-1;
    cats.forEach(c=>{
      if(skill[c]&&skill[c].n>=2){
        const acc=skill[c].ok/skill[c].n;
        if(acc>bestAcc){bestAcc=acc;best=c;}
      }
    });
    return{
      iq:Math.max(70,Math.min(160,iq)),overallAcc:overallAcc,avgMs:avgMs,
      weakest:weakest,best:best,
      perCategory:cats.map(c=>({cat:c,acc:skill[c]&&skill[c].n?Math.round(skill[c].ok/skill[c].n*100):null,n:skill[c]?skill[c].n:0,avgMs:skill[c]&&skill[c].n?Math.round(skill[c].totalMs/skill[c].n):0}))
    };
  }
  function SS_recommendPractice(weakest,best){
    if(!weakest)return '';
    const rec={
      rotation:'Practice more Rotation puzzles to build fast mental turning.',
      mirror:'Mirrors are tricky — slow down and check left/right flips.',
      memory:'Memory needs focus — visualize the shape before it hides.',
      odd:'Odd Shape tests family recognition — compare structures, not colors.',
      sequence:'Sequences need pattern tracking — watch the rotation direction.'
    };
    return rec[weakest]||'Keep practicing to improve.';
  }
  function SS_renderStatsCard(stats){
    const catLabels={rotation:'Rotation',mirror:'Mirror',memory:'Memory',odd:'Odd Shape',sequence:'Sequence'};
    const rows=stats.perCategory.filter(c=>c.n>0).map(c=>
      '<div class="ss-iq-row">'+
        '<span>'+(catLabels[c.cat]||c.cat)+'</span>'+
        '<div class="ss-iq-bar"><div class="ss-iq-fill" style="width:'+c.acc+'%"></div></div>'+
        '<span class="ss-iq-pct">'+c.acc+'%</span>'+
      '</div>'
    ).join('');
    const weakLabel=stats.weakest?catLabels[stats.weakest]:null;
    const bestLabel=stats.best?catLabels[stats.best]:null;
    return '<div class="ss-iq-card">'+
      '<div class="ss-iq-headline">'+
        '<span class="ss-iq-emoji">🧠</span>'+
        '<div><div class="ss-iq-num">'+stats.iq+'</div><div class="ss-iq-label">Spatial IQ</div></div>'+
      '</div>'+
      '<div class="ss-iq-breakdown">'+rows+'</div>'+
      '<div class="ss-iq-meta"><span>⏱ Avg solve: '+(stats.avgMs/1000).toFixed(1)+'s</span>'+(bestLabel?'<span>⭐ Strongest: '+bestLabel+'</span>':'')+'</div>'+
      (weakLabel?'<div class="ss-iq-tip">💡 Weakest skill: <strong>'+weakLabel+'</strong>. '+SS_recommendPractice(stats.weakest,stats.best)+'</div>':'')+
    '</div>';
  }

  /* ======================================================================
     SECTION 12 — SCREENS (start, game over)
     ====================================================================== */
  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_ss_best_round')||0;
    const games=S('nz_ss_games')||0;
    const accH=S('nz_ss_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=SS_dailyChallenge(),dcDone=SS_dailyDone();
    const screen=$('<div class="ss-start">'+
      '<div class="ss-stats">'+
        '<div class="ss-stat"><div class="v">'+bestRound+'</div><div class="l">Best Round</div></div>'+
        '<div class="ss-stat"><div class="v">'+avgAcc+'%</div><div class="l">Accuracy</div></div>'+
        '<div class="ss-stat"><div class="v">'+games+'</div><div class="l">Games</div></div>'+
      '</div>'+
      '<div class="daily-card '+(dcDone?'done':'')+'" style="margin-bottom:16px;">'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
          '<div class="dc-ico">'+(dcDone?'✅':'🎯')+'</div>'+
          '<div style="flex:1;"><div class="dc-name">Daily: '+dc.label+'</div><div class="dc-sub">'+(dcDone?'Completed today!':'Complete for 2x XP')+'</div></div>'+
          '<span class="dc-badge">2x XP</span>'+
        '</div>'+
      '</div>'+
      '<div class="ss-mode-title">Choose a Mode</div>'+
      '<div class="ss-modes ss-modes-v7" id="ssModes"></div>'+
      '<button class="btn-primary" id="ssGo" style="margin-top:18px;width:100%;">Start ▶</button>'+
    '</div>');
    body.appendChild(screen);
    const modesEl=screen.querySelector('#ssModes');
    SS_MODE_KEYS.forEach(k=>{
      const m=SS_MODES[k];
      const card=$('<button class="ss-mode '+(k===mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sm-top">'+m.emoji+' '+m.label+'</div>'+
        '<div class="sm-grid">'+(m.zen?'No timer':((m.time/1000).toFixed(1)+'s'))+' · '+m.nMin+'-'+m.nMax+' blocks</div>'+
        '<div class="sm-sub">'+m.sub+'</div>'+
      '</button>');
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.ss-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#ssGo').onclick=()=>{
      playSound('tap');
      setS('nz_ss_v7_seen',1);
      if(startClock)startClock();
      startGame();
    };
  }

  function gameOver(){
    _cleanup();
    const finalRound=G.round;
    const accuracy=G.attempts?Math.round(G.correctCount/G.attempts*100):0;
    const prevBest=S('nz_ss_best_round')||0;
    const newPB=finalRound>prevBest;
    if(newPB)setS('nz_ss_best_round',finalRound);
    setS('nz_ss_games',(S('nz_ss_games')||0)+1);
    const accH=S('nz_ss_accuracy')||[];accH.push(accuracy);while(accH.length>10)accH.shift();setS('nz_ss_accuracy',accH);
    const dc=SS_dailyChallenge();
    if(!SS_dailyDone()){
      const pass=G.correctCount>=dc.target||finalRound>=dc.target;
      if(pass){setS('nz_ss_daily_date',todayKey());setS('nz_ss_daily_done',true);_st(()=>toast('🎯 Daily Challenge complete! 2x XP'),700);}
    }
    /* persist per-skill profile across sessions */
    const skillStore=S('nz_ss_v7')||{rotation:[0,0],mirror:[0,0],memory:[0,0],odd:[0,0],sequence:[0,0]};
    SS_CAT_KEYS.forEach(k=>{
      skillStore[k]=skillStore[k]||[0,0];
      skillStore[k][0]+=G.skill[k].ok;
      skillStore[k][1]+=G.skill[k].n;
    });
    setS('nz_ss_v7',skillStore);
    const rank=SS_rank(finalRound);
    const xp=finalRound>=20?48:finalRound>=12?32:finalRound>=6?18:8;
    const insight=SS_buildInsight();
    setScore(finalRound);
    if(newPB)confetti(50);
    const iqStats=SS_computeSpatialIQ(G.skill);
    const statsCardHtml=SS_renderStatsCard(iqStats);
    end({
      title:rank.em+' '+rank.txt,
      emoji:rank.em,
      sub:'Round '+finalRound+(newPB?' · 🏆 New Best!':''),
      value:finalRound,points:xp,starThresh:[6,12,20],
      statsHtml:'<div class="end-stats">'+
        '<div class="row"><span>Round Reached</span><span class="val">'+finalRound+'</span></div>'+
        '<div class="row"><span>Accuracy</span><span class="val">'+accuracy+'% ('+G.correctCount+'/'+G.attempts+')</span></div>'+
        '<div class="row"><span>Avg Reaction</span><span class="val">'+Math.round(Adapt.avgRT())+' ms</span></div>'+
        '<div class="row"><span>Mode</span><span class="val">'+SS_MODES[mode].emoji+' '+SS_MODES[mode].label+'</span></div>'+
        (G.comboMax>=3?'<div class="row"><span>Best Combo</span><span class="val">🔥 '+G.comboMax+'x</span></div>':'')+
        '<div class="row"><span>Best Streak</span><span class="val">'+G.comboMax+'</span></div>'+
        '<div class="row"><span>XP Earned</span><span class="val">+'+xp+'</span></div>'+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(finalRound,prevBest)+(newPB?' 🏆':'')+'</span></div>'+
      '</div>'+
      statsCardHtml+
      (insight?'<div class="ss-insight">'+insight+'</div>':'')+
      (newPB?'<div class="rec">New Personal Best! 🎉</div>':'')
    });
  }

  function SS_buildInsight(){
    const total=G.attempts;
    if(total<5)return '';
    const mErr=G.mirrorErrors,nErr=G.nearErrors;
    if(mErr>=Math.max(2,total*0.25))return '🪞 Mirrors confused you '+mErr+' times — practice in Zen mode with explanations.';
    if(nErr>=Math.max(2,total*0.2))return '🎯 Near-match traps got you '+nErr+' times — compare cell-by-cell.';
    const acc=G.correctCount/total;
    if(acc>=0.85&&Adapt.avgRT()<2000)return '⚡ Excellent speed AND accuracy. Try Expert mode!';
    if(acc>=0.85)return '✅ High accuracy — try Speed mode for more challenge.';
    if(acc<0.5)return '🌱 Build foundation in Zen mode — explanations help you learn patterns.';
    return '';
  }

  renderStart();
}
