/* ===================== SPATIAL SPIN v4 — 4-mode mixed-challenge redesign =====================
 *  Entry: playSpatialSpin(body, setScore, end, wrap, startClock)
 *  All top-level identifiers prefixed SS_ to avoid collisions with other games.
 *  Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey.
 *  CSS prefix preserved: .ss-
 *  localStorage keys preserved: nz_ss_best_round, nz_ss_games, nz_ss_accuracy,
 *                               nz_ss_daily_date, nz_ss_daily_done
 *  New keys (additive): nz_ss_v4_seen, nz_ss_skill
 *
 *  Rotation/reflection convention (used IDENTICALLY at generation + validation):
 *    cells = [[row,col], ...] integer grid
 *    rotateCW : [r,c] -> [c, maxR - r], then normalize
 *    mirrorH  : [r,c] -> [r, maxC - c], then normalize
 *    rotation set of shape T = { T, CW(T), CW2(T), CW3(T) } deduped by hash
 *    mirror   set of shape T = { mirrorH(R) | R in rotation set } deduped, minus rotation set
 * ============================================================================ */

/* ---------- MODE DEFS (5 modes, incl. Endless Survival) ---------- */
const SS_MODES={
  classic:{label:'Classic',emoji:'\uD83C\uDFAF',sub:'Mixed challenges \u00B7 all types',time:8000,minTime:4500,decay:180,nMin:4,nMax:7,zen:false,lives:3,combo:false},
  speed  :{label:'Speed',  emoji:'\u26A1',       sub:'4.5s flat \u00B7 chain reflexes',  time:4500,minTime:4500,decay:0,  nMin:4,nMax:5,zen:false,lives:3,combo:true},
  expert :{label:'Expert', emoji:'\uD83D\uDD25',sub:'Hard challenges \u00B7 6-8 blocks', time:7000,minTime:4500,decay:130,nMin:6,nMax:8,zen:false,lives:3,combo:false},
  zen    :{label:'Zen',    emoji:'\uD83E\uDDD8',sub:'No timer \u00B7 learn & explore',   time:0,   minTime:0,   decay:0,  nMin:4,nMax:6,zen:true, lives:Infinity,combo:false},
  endless:{label:'Endless',emoji:'\u267E\uFE0F', sub:'All types \u00B7 timer decays \u00B7 3 lives',time:8500,minTime:3500,decay:140,nMin:4,nMax:8,zen:false,lives:3,combo:true}
};
const SS_MODE_KEYS=['classic','speed','expert','zen','endless'];
const SS_PALETTE=['#7C3AED','#4F8EF7','#34D399','#F97316','#EC4899','#06B6D4','#A855F7','#EF4444'];

/* ---------- CURATED SHAPE LIBRARY ---------- */
/* Each entry is a base polyomino (4-8 cells), hand-picked for visual clarity.
   Organized in families so players start recognizing shape "personalities." */
const SS_SHAPE_LIBRARY={
  L:[
    [[0,0],[1,0],[2,0],[2,1]],
    [[0,0],[0,1],[1,0],[2,0]],
    [[0,0],[1,0],[2,0],[2,1],[2,2]],
  ],
  T:[
    [[0,0],[0,1],[0,2],[1,1]],
    [[0,1],[1,0],[1,1],[1,2],[2,1]],
  ],
  Z:[
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,1],[0,2],[1,0],[1,1]],
  ],
  Arrow:[
    [[0,1],[1,0],[1,1],[1,2],[2,1]],
    [[0,0],[1,0],[1,1],[2,1],[2,2]],
  ],
  Snake:[
    [[0,0],[1,0],[1,1],[2,1],[2,2]],
    [[0,0],[0,1],[1,1],[1,2],[2,2]],
  ],
  Hook:[
    [[0,0],[0,1],[0,2],[1,2],[2,2],[2,1]],
    [[0,0],[1,0],[2,0],[2,1],[2,2],[1,2]],
  ],
  Cross:[
    [[0,1],[1,0],[1,1],[1,2],[2,1]],
  ],
  Bridge:[
    [[0,0],[0,2],[1,0],[1,1],[1,2]],
    [[0,0],[0,1],[0,2],[1,0],[1,2]],
  ],
  Fork:[
    [[0,0],[0,2],[1,0],[1,1],[1,2],[2,1]],
  ],
  Stair:[
    [[0,0],[1,0],[1,1],[2,1],[2,2]],
    [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]],
  ],
};
const SS_SHAPE_FAMILY_KEYS=Object.keys(SS_SHAPE_LIBRARY);

/* V5: SINGLE shape color used for prompt and every option.
   Shape geometry is the only signal that should matter — never color. */
const SS_SHAPE_COLOR='#7C3AED';

/* Pick a random base shape from the library, optionally filtered by min/max cell count */
function SS_pickLibraryShape(minN,maxN){
  const pool=[];
  SS_SHAPE_FAMILY_KEYS.forEach(fam=>{
    SS_SHAPE_LIBRARY[fam].forEach(shape=>{
      if(shape.length>=minN&&shape.length<=maxN)pool.push({family:fam,cells:shape});
    });
  });
  if(!pool.length)return null;
  return pool[Math.floor(Math.random()*pool.length)];
}

/* ---------- CHALLENGE TYPE WEIGHTS PER MODE (V5: 6 categories) ---------- */
/* angle is folded into rotation, chain is folded into memory */
const SS_CHALLENGE_WEIGHTS={
  classic: {rotation:40,mirror:20,completion:15,missing:10,oddoneout:10,memory:5},
  speed:   {rotation:60,mirror:0, completion:0, missing:0, oddoneout:40,memory:0},
  expert:  {rotation:25,mirror:25,completion:10,missing:10,oddoneout:15,memory:15},
  zen:     {rotation:25,mirror:18,completion:18,missing:13,oddoneout:13,memory:13},
  endless: {rotation:35,mirror:18,completion:15,missing:10,oddoneout:12,memory:10}
};

/* ---------- CHALLENGE TYPE META (badge system, V5: unified purple theme) ---------- */
const SS_CHALLENGE_META={
  rotation:  {emoji:'\uD83D\uDD04',name:'ROTATION',     color:'#7C3AED',instruction:'Find the matching rotation'},
  mirror:    {emoji:'\uD83E\uDE9E',name:'MIRROR',       color:'#7C3AED',instruction:'Find the mirrored version'},
  completion:{emoji:'\uD83E\uDDE9',name:'COMPLETE',     color:'#7C3AED',instruction:'Which shape completes the pattern?'},
  missing:   {emoji:'\uD83E\uDDF1',name:'MISSING PIECE',color:'#7C3AED',instruction:'Which chunk fits the gap?'},
  oddoneout: {emoji:'\uD83D\uDC41\uFE0F',name:'ODD SHAPE',color:'#7C3AED',instruction:'Find the shape that doesn\'t belong'},
  memory:    {emoji:'\uD83E\uDDE0',name:'MEMORY',       color:'#7C3AED',instruction:'Remember, then choose'},
};

/* ---------- SHAPE MATH (KEPT EXACTLY — mathematically verified) ---------- */
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
function SS_genRandomShapeFallback(n,opts){
  const branching=opts&&typeof opts.branching==='number'?opts.branching:0.5;
  const cells=[[0,0]];
  while(cells.length<n){
    const front=SS_frontier(cells);
    if(!front.length)break;
    let pick;
    if(Math.random()<branching){
      const last=cells[cells.length-1];
      front.sort((a,b)=>(Math.abs(a[0]-last[0])+Math.abs(a[1]-last[1]))-(Math.abs(b[0]-last[0])+Math.abs(b[1]-last[1])));
      pick=front[0];
    }else{pick=front[Math.floor(Math.random()*front.length)];}
    cells.push(pick);
  }
  return SS_norm(cells);
}
/* Backward-compat alias — kept so any other call sites continue to work. */
function SS_genShape(n,opts){return SS_genRandomShapeFallback(n,opts);}

/* V5: prefer curated library shapes 80% of the time for visual consistency.
   Falls back to procedural generation when the library has no shape in [minN,maxN]
   or 20% of the time for variety. The result is normalized via SS_norm. */
function SS_genTargetShape(minN,maxN,opts){
  if(Math.random()<0.8){
    const lib=SS_pickLibraryShape(minN,maxN);
    if(lib)return SS_norm(lib.cells);
  }
  const n=minN+Math.floor(Math.random()*(maxN-minN+1));
  return SS_genRandomShapeFallback(n,opts);
}
function SS_isDegenerate(cells,opts){
  if(cells.length<3)return true;
  const bb=SS_bbox(cells);
  if(cells.length>=4&&(bb.rows===1||bb.cols===1))return true;
  const rotSet=SS_rotationSet(cells);
  const mirSet=SS_mirrorSet(cells);
  if(rotSet.size===1&&mirSet.size===0&&opts&&opts.banFullSym)return true;
  return false;
}
function SS_silhouetteKey(cells){const bb=SS_bbox(cells);return cells.length+'x'+bb.rows+'x'+bb.cols;}
/* Perceptual overlap: how many cells of a are also in b (canonical positions).
   Returns 0..1 ratio relative to smaller shape. Used to reject visual twins. */
function SS_cellsOverlap(a,b){
  const na=SS_norm(a),nb=SS_norm(b);
  const sb=new Set(nb.map(c=>c[0]+','+c[1]));
  let hit=0;
  for(let i=0;i<na.length;i++){if(sb.has(na[i][0]+','+na[i][1]))hit++;}
  return hit/Math.min(na.length,nb.length);
}

/* ---------- V5: educational feedback for wrong answers ---------- */
function SS_explainMistake(pickedOption,round){
  const mt=pickedOption&&pickedOption.mistakeType;
  const MSGS={
    wrongAngle:'Close! That\u2019s a different rotation angle \u2014 look again at how far it turned.',
    mirrorConfusion:'That\u2019s a mirror image, not a rotation. Mirrors flip the shape; rotations spin it.',
    differentShape:'That shape doesn\u2019t match at all \u2014 check the block count and arrangement.',
    rotationNotMirror:'That\u2019s a rotation, not a mirror. Try flipping the shape instead of turning it.',
    wrongLocation:'Close, but the missing piece belongs in a different spot \u2014 check the outline shape.',
    almostComplete:'Almost! That option is missing one more block.',
    sameFamily:'That shape belongs to the same family as the others \u2014 the odd one looks structurally different.',
  };
  return MSGS[mt]||'Not quite \u2014 take a closer look at the shape\u2019s orientation.';
}

/* V5: adaptive weight adjustment based on per-category accuracy.
   Boost weak categories (<60%), reduce mastered (>85%), only after 3+ attempts. */
function SS_getAdaptiveWeights(baseWeights,skill){
  const adjusted=Object.assign({},baseWeights);
  Object.keys(adjusted).forEach(ct=>{
    const s=skill[ct];
    if(!s||s.n<3)return;
    const acc=s.ok/s.n;
    if(acc<0.6)adjusted[ct]=adjusted[ct]*1.4;
    else if(acc>0.85)adjusted[ct]=adjusted[ct]*0.7;
  });
  return adjusted;
}

/* ====================================================================== */
function playSpatialSpin(body,setScore,end,wrap,startClock){
  let mode='classic';

  const G={
    round:0,lives:3,correctCount:0,attempts:0,comboCount:0,comboMax:0,
    barT:null,roundStart:0,roundOffPause:0,timerMs:0,
    pending:false,
    challengeHistory:[],   /* anti-repetition: last 5 challenge types */
    recentResults:[],      /* V5: last 5 boolean results for difficulty scoring */
    skill:{rotation:{ok:0,n:0,totalMs:0},mirror:{ok:0,n:0,totalMs:0},
           missing:{ok:0,n:0,totalMs:0},completion:{ok:0,n:0,totalMs:0},
           memory:{ok:0,n:0,totalMs:0},oddoneout:{ok:0,n:0,totalMs:0},
           /* legacy buckets kept so older code paths don't crash; not surfaced in UI */
           angle:{ok:0,n:0,totalMs:0},chain:{ok:0,n:0,totalMs:0},
           mirrorErrors:0,nearErrors:0}
  };

  const Fresh={
    canon:[],maxCanon:50,
    silhouettes:[],maxSil:12,
    distrStyles:[],maxStyle:6,
    correctPos:[],maxPos:8,
    perNCount:{},perNMax:{3:1,4:2,5:5,6:12,7:25,8:40},
    addCanon(h,n){
      this.perNCount[n]=(this.perNCount[n]||0)+1;
      this.canon.push({h:h,n:n});
      const limit=this.perNMax[n]||50;
      if(this.perNCount[n]>limit){
        const idx=this.canon.findIndex(e=>e.n===n);
        if(idx>=0){this.canon.splice(idx,1);this.perNCount[n]--;}
      }
      while(this.canon.length>this.maxCanon){
        const e=this.canon.shift();this.perNCount[e.n]--;
      }
    },
    hasCanon(h){return this.canon.some(e=>e.h===h);},
    add(buf,k,cap){buf.push(k);if(buf.length>cap)buf.shift();},
    countIn(buf,k,n){let c=0;const start=Math.max(0,buf.length-n);for(let i=start;i<buf.length;i++)if(buf[i]===k)c++;return c;},
    clear(){this.canon=[];this.silhouettes=[];this.distrStyles=[];this.correctPos=[];this.perNCount={};}
  };

  const Adapt={
    win:[],winSize:8,bias:0,
    record(correct,ms,timerMs){
      this.win.push({c:correct?1:0,ms:ms||0,t:timerMs||5000});
      if(this.win.length>this.winSize)this.win.shift();
      if(this.win.length>=5)this._tune();
    },
    _tune(){
      let acc=0,rt=0,tref=0;
      for(const e of this.win){acc+=e.c;rt+=e.ms;tref+=e.t;}
      acc/=this.win.length;rt/=this.win.length;tref/=this.win.length;
      const fast=tref?rt/tref:1;
      if(acc>=0.85&&fast<=0.5)this.bias=Math.min(2,this.bias+1);
      else if(acc<0.6)this.bias=Math.max(-2,this.bias-1);
    },
    accuracy(){if(!this.win.length)return 1;let a=0;for(const e of this.win)a+=e.c;return a/this.win.length;},
    avgRT(){if(!this.win.length)return 0;let r=0;for(const e of this.win)r+=e.ms;return r/this.win.length;},
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

  /* ---------- shape factory ---------- */
  function SS_shapeOkForChallenge(cells,challengeType){
    if(challengeType==='mirror'&&SS_mirrorSet(cells).size===0)return false;
    if(challengeType==='missing'){
      const setKey=new Set(cells.map(c=>c[0]+','+c[1]));
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      for(let i=0;i<cells.length;i++){let nb=0;for(let j=0;j<4;j++){const k=(cells[i][0]+dirs[j][0])+','+(cells[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}if(nb<=1)return true;}
      return false;
    }
    if(challengeType==='completion'){
      if(cells.length<4)return false;
    }
    return true;
  }
  function SS_makeFreshShape(n,opts){
    let attempts=0;
    while(attempts<10){
      attempts++;
      const branching=opts&&opts.branching!=null?opts.branching:(0.3+Math.random()*0.5);
      /* V5: route through SS_genTargetShape so curated library shapes are preferred.
         Library hit rate ~80%; procedural fallback otherwise. */
      const cells=SS_genTargetShape(n,n,{branching:branching});
      if(cells.length<n)continue;
      if(SS_isDegenerate(cells,{banFullSym:true}))continue;
      const canon=SS_canonicalHash(cells);
      if(Fresh.hasCanon(canon))continue;
      const sil=SS_silhouetteKey(cells);
      if(Fresh.countIn(Fresh.silhouettes,sil,4)>=2)continue;
      return{cells:cells,canon:canon,sil:sil};
    }
    while(attempts<20){
      attempts++;
      const cells=SS_genShape(n,{branching:0.5});
      if(cells.length<n)continue;
      if(SS_isDegenerate(cells,{banFullSym:true}))continue;
      return{cells:cells,canon:SS_canonicalHash(cells),sil:SS_silhouetteKey(cells)};
    }
    const fb=SS_norm([[0,0],[1,0],[1,1]]);
    return{cells:fb,canon:SS_canonicalHash(fb),sil:SS_silhouetteKey(fb)};
  }

  /* ---------- CHALLENGE TYPE PICKER (weighted + anti-repetition + V5 adaptive) ---------- */
  function SS_pickChallengeType(){
    /* V5: boost weak categories, dampen mastered ones */
    const weights=SS_getAdaptiveWeights(SS_CHALLENGE_WEIGHTS[mode],G.skill);
    const types=Object.keys(weights).filter(k=>weights[k]>0);
    if(!types.length)return 'rotation';

    /* anti-repetition: no same type twice in a row */
    const last=G.challengeHistory.length?G.challengeHistory[G.challengeHistory.length-1]:null;
    /* also penalize types that appeared a lot in last 5 */
    const recent5=G.challengeHistory.slice(-5);

    let pool=[];
    let totalW=0;
    for(const t of types){
      if(t===last&&types.length>1)continue; /* never same twice in a row */
      let w=weights[t];
      /* reduce weight if appeared often recently */
      const recentCount=recent5.filter(x=>x===t).length;
      if(recentCount>=2)w*=0.3;
      else if(recentCount>=1)w*=0.6;
      /* early rounds: reduce hard types (chain/angle now folded under memory/rotation) */
      if(G.round<5&&(t==='memory'||t==='completion'))w*=0.3;
      if(w>0){pool.push({type:t,w:w});totalW+=w;}
    }
    if(!pool.length)return types[0];
    let r=Math.random()*totalW;
    for(const p of pool){r-=p.w;if(r<=0)return p.type;}
    return pool[pool.length-1].type;
  }

  /* ---------- distractors ---------- */
  function SS_shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function SS_distRandom(target,banSet){
    const rot=SS_rotationSet(target);
    for(let t=0;t<8;t++){
      const sh=SS_makeFreshShape(target.length,{});
      const h=SS_hash(sh.cells);
      if(banSet.has(h))continue;
      if(rot.has(h))continue;
      return{cells:sh.cells,style:'random'};
    }
    return null;
  }
  function SS_distMirror(target,banSet,extraRot){
    let m=SS_mirrorH(target);
    for(let i=0;i<(extraRot||0);i++)m=SS_rotateCW(m);
    const h=SS_hash(m);
    if(banSet.has(h))return null;
    const rot=SS_rotationSet(target);
    if(rot.has(h))return null;
    return{cells:m,style:'mirror'+(extraRot||0)};
  }
  function SS_distOneBlockMod(target,banSet){
    const leaves=[];
    const setKey=new Set(target.map(c=>c[0]+','+c[1]));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let i=0;i<target.length;i++){
      let nb=0;
      for(let j=0;j<4;j++){const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
      if(nb<=1)leaves.push(i);
    }
    if(!leaves.length)return null;
    for(let t=0;t<6;t++){
      const idx=leaves[Math.floor(Math.random()*leaves.length)];
      const remaining=target.filter((_,i)=>i!==idx);
      if(!SS_isConnected(remaining))continue;
      const front=SS_frontier(remaining);
      const targetKey=target[idx][0]+','+target[idx][1];
      const candidates=front.filter(p=>p[0]+','+p[1]!==targetKey);
      if(!candidates.length)continue;
      const newCell=candidates[Math.floor(Math.random()*candidates.length)];
      const newCells=SS_norm(remaining.concat([newCell]));
      const h=SS_hash(newCells);
      if(banSet.has(h))continue;
      const rot=SS_rotationSet(target);if(rot.has(h))continue;
      return{cells:newCells,style:'oneBlockMod'};
    }
    return null;
  }
  function SS_distNearMatch(target,banSet){
    const targetBB=SS_bbox(target);
    const targetRot=SS_rotationSet(target);
    for(let t=0;t<12;t++){
      const sh=SS_makeFreshShape(target.length,{branching:0.5+Math.random()*0.3});
      const bb=SS_bbox(sh.cells);
      if(Math.abs(bb.rows*bb.cols-targetBB.rows*targetBB.cols)>2)continue;
      const h=SS_hash(sh.cells);
      if(banSet.has(h))continue;
      if(targetRot.has(h))continue;
      /* reject if any rotation of this candidate is already banned (visual dupe) */
      const candRot=SS_rotationSet(sh.cells);
      let clash=false;
      candRot.forEach((_,ch)=>{if(banSet.has(ch))clash=true;});
      if(clash)continue;
      return{cells:sh.cells,style:'nearMatch'};
    }
    return null;
  }
  /* Generate a shape whose bbox visibly differs from target (rows or cols differ by >=2).
     Used so distractors don't look like the same silhouette as the correct answer. */
  function SS_distDifferentShape(target,banSet){
    const targetBB=SS_bbox(target);
    const targetRot=SS_rotationSet(target);
    for(let t=0;t<12;t++){
      const sh=SS_makeFreshShape(target.length,{branching:0.2+Math.random()*0.6});
      const bb=SS_bbox(sh.cells);
      /* must look visibly different in silhouette */
      if(Math.abs(bb.rows-targetBB.rows)+Math.abs(bb.cols-targetBB.cols)<2)continue;
      const h=SS_hash(sh.cells);
      if(banSet.has(h))continue;
      if(targetRot.has(h))continue;
      return{cells:sh.cells,style:'differentShape'};
    }
    return null;
  }
  function SS_distBranchSwap(target,banSet){
    const leaves=[];
    const setKey=new Set(target.map(c=>c[0]+','+c[1]));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    for(let i=0;i<target.length;i++){
      let nb=0;
      for(let j=0;j<4;j++){const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
      if(nb===1)leaves.push(i);
    }
    if(leaves.length<2)return null;
    let bestPair=null,bestD=-1;
    for(let i=0;i<leaves.length;i++){
      for(let j=i+1;j<leaves.length;j++){
        const a=target[leaves[i]],b=target[leaves[j]];
        const d=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
        if(d>bestD){bestD=d;bestPair=[leaves[i],leaves[j]];}
      }
    }
    if(!bestPair)return null;
    const remIdx=bestPair[0],anchor=target[bestPair[1]];
    const remaining=target.filter((_,i)=>i!==remIdx);
    if(!SS_isConnected(remaining))return null;
    const front=SS_frontier(remaining);
    front.sort((a,b)=>(Math.abs(a[0]-anchor[0])+Math.abs(a[1]-anchor[1]))-(Math.abs(b[0]-anchor[0])+Math.abs(b[1]-anchor[1])));
    for(let i=0;i<front.length;i++){
      const newCells=SS_norm(remaining.concat([front[i]]));
      const h=SS_hash(newCells);
      if(banSet.has(h))continue;
      const rot=SS_rotationSet(target);if(rot.has(h))continue;
      return{cells:newCells,style:'branchSwap'};
    }
    return null;
  }

  function SS_avoidStalePos(opts){
    const idx=opts.findIndex(o=>o.correct);
    if(idx<0)return;
    const recent=Fresh.correctPos.slice(-5);
    if(recent.filter(p=>p===idx).length>=2&&opts.length>1){
      let bestSlot=idx,bestC=99;
      for(let i=0;i<opts.length;i++){const c=recent.filter(p=>p===i).length;if(c<bestC){bestC=c;bestSlot=i;}}
      if(bestSlot!==idx){const t=opts[idx];opts[idx]=opts[bestSlot];opts[bestSlot]=t;}
    }
  }

  /* ---------- ROUND BUILDERS for each challenge type ---------- */

  /* V5: map an internal distractor style string to a human-readable mistakeType.
     This lets SS_explainMistake show educational feedback instead of generic "Wrong!". */
  function SS_styleToMistake(style,ct){
    if(!style)return null;
    if(style.indexOf('mirror')===0)return ct==='mirror'?'rotationNotMirror':'mirrorConfusion';
    if(style==='nearMatch')return 'wrongAngle';
    if(style==='differentShape'||style==='random')return 'differentShape';
    if(style==='oneBlockMod'||style==='branchSwap')return 'wrongAngle';
    if(style==='missingWrong')return 'wrongLocation';
    if(style==='altCompletion')return 'almostComplete';
    if(style==='family')return 'sameFamily';
    if(style==='rotationFiller')return 'rotationNotMirror';
    if(style==='chainWrong1'||style==='chainWrong3')return 'wrongAngle';
    return null;
  }
  /* V5: tag every wrong option in a round with mistakeType (post-build, non-invasive). */
  function SS_tagMistakes(round){
    if(!round||!round.options)return round;
    round.options.forEach(o=>{
      if(o&&!o.correct&&!o.mistakeType){
        const mt=SS_styleToMistake(o.style,round.challengeType);
        if(mt)o.mistakeType=mt;
      }
    });
    return round;
  }

  /* 1. ROTATION MATCH */
  function SS_buildRotation(target){
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    if(rotList.length<2)return null;
    const promptCells=rotList[0];
    const nonIdentity=rotList.slice(1);
    const correctCells=nonIdentity[Math.floor(Math.random()*nonIdentity.length)];
    const correctRotSet=SS_rotationSet(correctCells); /* FIX: full rot-equivalence ban */
    const correctMirSet=SS_mirrorSet(correctCells);
    const banSet=new Set();
    rotSet.forEach((_,h)=>banSet.add(h));
    const wrong=[];
    const tryAdd=(g)=>{
      if(!g)return;
      const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      /* FIX: reject if rotation-equivalent to the CORRECT option (was missing). */
      if(correctRotSet.has(h))return;
      /* FIX: reject if visually identical to the CORRECT option (>=80% overlap). */
      if(SS_cellsOverlap(correctCells,g.cells)>=0.80)return;
      /* reject if rotation-equivalent to any existing wrong option */
      for(const w of wrong){
        if(SS_rotationSet(w.cells).has(h))return;
        /* reject visual twin: >=80% cell overlap with any existing wrong option */
        if(SS_cellsOverlap(w.cells,g.cells)>=0.80)return;
      }
      banSet.add(h);
      wrong.push(g);
    };
    /* New mix: mirror + near-match + different-shape — perceptually distinct */
    const isHard=mode==='expert';
    if(isHard){
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distMirror(target,banSet,2)||SS_distBranchSwap(target,banSet));
      tryAdd(SS_distNearMatch(target,banSet));
    }else{
      tryAdd(SS_distMirror(target,banSet,0));
      tryAdd(SS_distNearMatch(target,banSet));
      tryAdd(SS_distDifferentShape(target,banSet)||SS_distRandom(target,banSet));
    }
    let safety=0;
    while(wrong.length<3&&safety<8){
      safety++;
      tryAdd(SS_distRandom(target,banSet));
    }
    if(wrong.length<3)return null;
    const opts=[{cells:correctCells,correct:true,style:'rotation'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return SS_tagMistakes({challengeType:'rotation',target:target,promptCells:promptCells,options:opts});
  }

  /* 2. MIRROR CHALLENGE — NEW: max 1 rotation filler; rest are real shape distractors */
  function SS_buildMirror(target){
    const mirSet=SS_mirrorSet(target);
    const mirList=Array.from(mirSet.values());
    if(!mirList.length)return null;
    const correctCells=mirList[Math.floor(Math.random()*mirList.length)];
    const rotSet=SS_rotationSet(target);
    const banSet=new Set();
    rotSet.forEach((_,h)=>banSet.add(h));
    const correctRot=SS_rotationSet(correctCells);
    correctRot.forEach((_,h)=>banSet.add(h));
    const rotList=Array.from(rotSet.values());
    const promptCells=rotList[0];
    const wrong=[];
    const tryAdd=(g)=>{
      if(!g)return;
      const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      if(mirSet.has(h))return;
      /* FIX: reject if visually identical to the CORRECT mirror answer. */
      if(SS_cellsOverlap(correctCells,g.cells)>=0.80)return;
      /* reject visual twin against any existing wrong option */
      for(const w of wrong){if(SS_cellsOverlap(w.cells,g.cells)>=0.80)return;}
      banSet.add(h);
      wrong.push(g);
    };
    /* AT MOST 1 rotation-of-target filler (was up to 3 — made the mirror answer obvious) */
    const fillers=rotList.filter(c=>SS_hash(c)!==SS_hash(promptCells));
    if(fillers.length){
      wrong.push({cells:fillers[0],style:'rotationFiller'});
      banSet.add(SS_hash(fillers[0]));
    }
    /* Remaining slots: near-match and different-shape for genuine challenge */
    tryAdd(SS_distNearMatch(target,banSet));
    tryAdd(SS_distDifferentShape(target,banSet)||SS_distRandom(target,banSet));
    let safety=0;
    while(wrong.length<3&&safety<8){
      safety++;
      tryAdd(SS_distRandom(target,banSet));
    }
    if(wrong.length<3)return null;
    const opts=[{cells:correctCells,correct:true,style:'mirrorAnswer'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return SS_tagMistakes({challengeType:'mirror',target:target,promptCells:promptCells,options:opts});
  }

  /* 3. MISSING BLOCK */
  function SS_buildMissing(target){
    const setKey=new Set(target.map(c=>c[0]+','+c[1]));
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    const candidates=[];
    for(let i=0;i<target.length;i++){
      let nb=0;
      for(let j=0;j<4;j++){const k=(target[i][0]+dirs[j][0])+','+(target[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
      if(nb===1)candidates.push(i);
    }
    if(!candidates.length)return null;
    const removedIdx=candidates[Math.floor(Math.random()*candidates.length)];
    const removedCell=target[removedIdx];
    const partial=target.filter((_,i)=>i!==removedIdx);
    if(!SS_isConnected(partial))return null;
    let mr=Infinity,mc=Infinity;
    for(let i=0;i<partial.length;i++){if(partial[i][0]<mr)mr=partial[i][0];if(partial[i][1]<mc)mc=partial[i][1];}
    const partialNorm=SS_norm(partial);
    const removedShifted=[removedCell[0]-mr,removedCell[1]-mc];
    const front=SS_frontier(partialNorm);
    const correctPos=removedShifted;
    const targetCanon=SS_canonicalHash(target);
    const distractorPositions=[];
    /* FIX: also track each distractor's canonical hash so two distractors never
       produce the same shape (which would make them ambiguously "correct" to the
       player even though both are technically marked wrong). */
    const seenCanon=new Set([targetCanon]);
    const pool=front.filter(p=>!(p[0]===correctPos[0]&&p[1]===correctPos[1]));
    SS_shuffle(pool);
    for(let i=0;i<pool.length&&distractorPositions.length<3;i++){
      const candCells=SS_norm(partialNorm.concat([pool[i]]));
      const cand=SS_canonicalHash(candCells);
      if(seenCanon.has(cand))continue; /* skip duplicate-shape distractors */
      seenCanon.add(cand);
      distractorPositions.push(pool[i]);
    }
    if(distractorPositions.length<3)return null;
    const opts=[{pos:correctPos,correct:true,style:'missingCorrect'}]
      .concat(distractorPositions.map(p=>({pos:p,correct:false,style:'missingWrong'})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return SS_tagMistakes({challengeType:'missing',target:target,partial:partialNorm,options:opts});
  }

  /* 4. SHAPE MEMORY — NEW: distractors are STRUCTURALLY DIFFERENT shapes,
     not other rotations of the same shape (which was impossible to disambiguate).
     Tests whether you remember the SHAPE, not its orientation. */
  function SS_buildMemory(target){
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    const promptCells=rotList[0];
    const banSet=new Set();
    /* Ban entire rotation set: wrong options must be structurally different shapes */
    rotSet.forEach((_,h)=>banSet.add(h));
    const wrong=[];
    const tryAdd=(g)=>{
      if(!g)return;
      const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      /* FIX: reject if visually identical (>=80%) to the prompt shape. */
      if(SS_cellsOverlap(promptCells,g.cells)>=0.80)return;
      for(const w of wrong){if(SS_cellsOverlap(w.cells,g.cells)>=0.80)return;}
      banSet.add(h);
      wrong.push(g);
    };
    /* 1 mirror (subtle distractor) + 1 near-match + 1 different-shape */
    tryAdd(SS_distMirror(target,banSet,0));
    tryAdd(SS_distNearMatch(target,banSet));
    tryAdd(SS_distDifferentShape(target,banSet)||SS_distRandom(target,banSet));
    let safety=0;
    while(wrong.length<3&&safety<8){
      safety++;
      tryAdd(SS_distRandom(target,banSet));
    }
    if(wrong.length<3)return null;
    const opts=[{cells:promptCells,correct:true,style:'sameShape'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return SS_tagMistakes({challengeType:'memory',target:target,promptCells:promptCells,options:opts,memoryPhase:true});
  }

  /* 5. ANGLE GUESS — 4 sensible options: 90/180/270 + one perceptual distractor (45 or 135) */
  function SS_buildAngle(target){
    const rotSet=SS_rotationSet(target);
    /* If shape has rotational symmetry (e.g. 180° sym → s2 === s0), the angle is ambiguous.
       Require all 4 quarter-turn positions to be distinct so the user can perceive the rotation. */
    if(rotSet.size<4)return null;
    const angles=[90,180,270];
    const angle=angles[Math.floor(Math.random()*angles.length)];
    const promptCells=SS_norm(target);
    let afterCells=promptCells;
    const steps=angle/90;
    for(let i=0;i<steps;i++)afterCells=SS_rotateCW(afterCells);
    /* 4 options: all 3 real angles + one perceptual distractor (45° or 135°) */
    const distractor=Math.random()<0.5?45:135;
    const optAngles=[90,180,270,distractor];
    const opts=optAngles.map(a=>({label:a+'\u00B0',angle:a,correct:a===angle,style:'angle'+a}));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    /* V5: angle is now a variant of rotation; report under the unified badge. */
    return{challengeType:'rotation',angleVariant:true,target:target,promptCells:promptCells,afterCells:afterCells,options:opts,angle:angle};
  }

  /* 6. ODD ONE OUT — odd shape is GUARANTEED visually distinguishable from family.
     Removed the expert-mode near-identical path that caused ambiguity. */
  function SS_buildOddOneOut(target){
    const rotSet=SS_rotationSet(target);
    const rotList=Array.from(rotSet.values());
    if(rotList.length<3)return null;
    SS_shuffle(rotList);
    const familyPicks=rotList.slice(0,3);
    const famHashes=new Set(familyPicks.map(SS_hash));
    if(famHashes.size!==3)return null;
    const targetBB=SS_bbox(target);
    let oddShape=null;
    for(let t=0;t<20;t++){
      const sh=SS_makeFreshShape(target.length,{branching:0.2+Math.random()*0.6});
      if(SS_canonicalHash(sh.cells)===SS_canonicalHash(target))continue;
      const bb=SS_bbox(sh.cells);
      /* require visible silhouette difference: bbox rows OR cols differ by >=1 */
      if(Math.abs(bb.rows-targetBB.rows)+Math.abs(bb.cols-targetBB.cols)<1)continue;
      const oh=SS_hash(sh.cells);
      if(famHashes.has(oh))continue;
      /* reject if odd shape has too-high cell overlap with any family pick (visual twin) */
      let twin=false;
      for(const f of familyPicks){if(SS_cellsOverlap(f,sh.cells)>=0.75){twin=true;break;}}
      if(twin)continue;
      oddShape=sh.cells;break;
    }
    if(!oddShape)return null;
    const opts=familyPicks.map(c=>({cells:c,correct:false,style:'family'}));
    opts.push({cells:oddShape,correct:true,style:'oddOne'});
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return SS_tagMistakes({challengeType:'oddoneout',target:target,options:opts});
  }

  /* 7. ROTATION CHAIN — NEW: removed s0 from distractors (it's already shown in the
     chain at position 0°, so duplicating it as a wrong option confused users). */
  function SS_buildChain(target){
    const s0=SS_norm(target);
    const s1=SS_rotateCW(s0);
    const s2=SS_rotateCW(s1); /* correct = 180° */
    const s3=SS_rotateCW(s2);
    if(SS_hash(s0)===SS_hash(s2))return null;
    if(SS_hash(s1)===SS_hash(s3))return null;
    const banSet=new Set();
    banSet.add(SS_hash(s2));
    /* CRITICAL: also ban s0 since it's visible in the chain. Showing it as a wrong
       option creates a "the prompt is in the options" trap that's just confusing. */
    banSet.add(SS_hash(s0));
    const wrong=[];
    const tryAdd=(g)=>{
      if(!g)return;
      const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      for(const w of wrong){if(SS_cellsOverlap(w.cells,g.cells)>=0.85)return;}
      banSet.add(h);
      wrong.push(g);
    };
    /* Wrong options: s1 (the previous step), s3 (the next step), and a near-match. */
    tryAdd({cells:s1,style:'chainWrong1'});
    tryAdd({cells:s3,style:'chainWrong3'});
    tryAdd(SS_distNearMatch(target,banSet)||SS_distMirror(target,banSet,0)||SS_distRandom(target,banSet));
    let safety=0;
    while(wrong.length<3&&safety<6){
      safety++;
      tryAdd(SS_distRandom(target,banSet));
    }
    if(wrong.length<3)return null;
    const opts=[{cells:s2,correct:true,style:'chainCorrect'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    /* V5: chain is now a variant of memory; report under the unified badge. */
    return{challengeType:'memory',chainVariant:true,target:target,chainSteps:{s0:s0,s1:s1,s2:s2,s3:s3},options:opts};
  }

  /* 8. SHAPE COMPLETION — NEW: distractors are ALTERNATIVE valid completions of the
     same visible base (placing hidden cells in different frontier spots), not random
     shapes. Makes it feel like "which completion is right?" not "which has the right
     block count?" — the old version was trivial because random shapes had visibly
     different silhouettes. */
  function SS_buildCompletion(target){
    if(target.length<4)return null;
    let visible=null,hidden=null,visibleNorm=null;
    for(let attempt=0;attempt<8;attempt++){
      const half=Math.ceil(target.length/2);
      const indices=target.map((_,i)=>i);
      SS_shuffle(indices);
      const visibleIdx=indices.slice(0,half);
      const hiddenIdx=indices.slice(half);
      const vis=visibleIdx.map(i=>target[i]);
      if(SS_isConnected(vis)){
        visible=vis;hidden=hiddenIdx.map(i=>target[i]);
        visibleNorm=SS_norm(visible);
        break;
      }
    }
    if(!visible)return null;
    const targetCanon=SS_canonicalHash(target);
    const targetNorm=SS_norm(target);
    const banSet=new Set();
    banSet.add(SS_hash(targetNorm));
    SS_rotationSet(target).forEach((_,h)=>banSet.add(h));
    /* FIX: track canonical hashes so two distractor completions never reduce to the
       same shape (used to be possible; player would see two identical-shape options). */
    const seenCanon=new Set([targetCanon]);
    const wrong=[];
    const tryAdd=(g)=>{
      if(!g)return;
      const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      const cand=SS_canonicalHash(g.cells);
      if(cand===targetCanon)return;
      if(seenCanon.has(cand))return; /* reject duplicate-shape distractor */
      /* FIX: tighter visual-twin check (was 0.9, now 0.8). */
      if(SS_cellsOverlap(targetNorm,g.cells)>=0.80)return;
      for(const w of wrong){if(SS_cellsOverlap(w.cells,g.cells)>=0.80)return;}
      seenCanon.add(cand);
      banSet.add(h);
      wrong.push(g);
    };
    /* Try to generate up to 2 ALTERNATIVE valid completions of visibleNorm —
       attach hidden cells in different frontier positions to form connected shapes. */
    const hiddenCount=target.length-visible.length;
    for(let attempt=0;attempt<24&&wrong.length<2;attempt++){
      let cur=visibleNorm.slice();
      let ok=true;
      for(let h=0;h<hiddenCount;h++){
        const front=SS_frontier(cur);
        if(!front.length){ok=false;break;}
        const pick=front[Math.floor(Math.random()*front.length)];
        cur.push(pick);
        cur=SS_norm(cur);
      }
      if(!ok||cur.length!==target.length)continue;
      tryAdd({cells:cur,style:'altCompletion'});
    }
    /* Fill remaining slot(s) with near-match for variety */
    while(wrong.length<3){
      const cand=SS_distNearMatch(target,banSet)||SS_distRandom(target,banSet);
      if(!cand)break;
      tryAdd(cand);
    }
    if(wrong.length<3)return null;
    const opts=[{cells:targetNorm,correct:true,style:'completionCorrect'}].concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style})));
    SS_shuffle(opts);SS_avoidStalePos(opts);
    return SS_tagMistakes({challengeType:'completion',target:target,visibleCells:visibleNorm,hiddenCells:hidden,options:opts});
  }

  /* ---------- master round builder (V5: 6 consolidated categories) ----------
     - rotation: 70% standard rotation, 30% angle-guess variant
     - memory:   60% standard memory, 40% rotation-chain variant
     - others:   1:1 mapping */
  function SS_buildRound(challengeType,target){
    switch(challengeType){
      case 'rotation':
        return Math.random()<0.7?SS_buildRotation(target):(SS_buildAngle(target)||SS_buildRotation(target));
      case 'memory':
        return Math.random()<0.6?SS_buildMemory(target):(SS_buildChain(target)||SS_buildMemory(target));
      case 'mirror':     return SS_buildMirror(target);
      case 'missing':    return SS_buildMissing(target);
      case 'oddoneout':  return SS_buildOddOneOut(target);
      case 'completion': return SS_buildCompletion(target);
      default:           return SS_buildRotation(target);
    }
  }

  /* ---------- correctness verifier (hardened) ---------- */
  function SS_verifyRound(round){
    if(!round||!round.options||round.options.length!==4)return false;
    if(round.options.filter(o=>o.correct).length!==1)return false;
    /* Hard guard: no two options share the same hash */
    if(round.options[0].cells){
      const seen=new Set();
      for(const o of round.options){
        if(!o.cells)continue;
        const h=SS_hash(o.cells);
        if(seen.has(h))return false;
        seen.add(h);
      }
      /* FIX: tighter visual-twin guard — was 0.90, now 0.85. */
      for(let i=0;i<round.options.length;i++){
        for(let j=i+1;j<round.options.length;j++){
          if(!round.options[i].cells||!round.options[j].cells)continue;
          if(SS_cellsOverlap(round.options[i].cells,round.options[j].cells)>=0.85)return false;
        }
      }
      /* FIX: no two cell-based options should be canonical-equivalent (same shape
         under rotation/reflection). This catches subtle "two options look like the
         same puzzle piece" bugs that hash + overlap alone could miss. */
      const canon=new Set();
      for(const o of round.options){
        if(!o.cells)continue;
        const c=SS_canonicalHash(o.cells);
        if(canon.has(c))return false;
        canon.add(c);
      }
    }
    /* FIX: for cell-based challenges, ensure no wrong option is rotation-equivalent
       to the correct option. (Was only enforced for 'rotation' below; now universal.) */
    if(round.options[0]&&round.options[0].cells){
      const correct=round.options.find(o=>o.correct);
      if(correct&&correct.cells){
        const cRot=SS_rotationSet(correct.cells);
        for(const o of round.options){
          if(o.correct||!o.cells)continue;
          if(cRot.has(SS_hash(o.cells)))return false;
        }
      }
    }
    /* Rotation: wrong options must NOT be rotation-equivalent to correct */
    if(round.challengeType==='rotation'){
      const correct=round.options.find(o=>o.correct);
      if(!correct||!correct.cells)return false;
      const correctRot=SS_rotationSet(correct.cells);
      for(const o of round.options){
        if(o.correct||!o.cells)continue;
        if(correctRot.has(SS_hash(o.cells)))return false;
      }
    }
    /* Mirror: wrong options must NOT also be mirrors of the prompt */
    if(round.challengeType==='mirror'&&round.promptCells){
      const promptMir=SS_mirrorSet(round.promptCells);
      for(const o of round.options){
        if(o.correct||!o.cells)continue;
        if(promptMir.has(SS_hash(o.cells)))return false;
      }
    }
    /* Memory: wrong options must NOT be ANY rotation of the prompt (else user can't
       distinguish them from the correct answer — they all look like the same shape) */
    if(round.challengeType==='memory'&&round.promptCells){
      const promptRot=SS_rotationSet(round.promptCells);
      for(const o of round.options){
        if(o.correct||!o.cells)continue;
        if(promptRot.has(SS_hash(o.cells)))return false;
      }
    }
    /* Odd-one-out: family must all be in rotation set; odd must NOT be.
       FIX: also reject if the odd shape is rotation-equivalent to the family target. */
    if(round.challengeType==='oddoneout'&&round.target){
      const targetRot=SS_rotationSet(round.target);
      const targetMir=SS_mirrorSet(round.target);
      for(const o of round.options){
        if(!o.cells)continue;
        const h=SS_hash(o.cells);
        const inRot=targetRot.has(h);
        if(o.correct&&inRot)return false;
        if(!o.correct&&!inRot)return false;
        /* odd shape must not be a mirror of the family either — otherwise it's
           visually almost the same as the family members for casual players. */
        if(o.correct&&targetMir.has(h))return false;
      }
    }
    /* Chain: no option equals s0 (the original orientation already shown in chain) */
    if(round.challengeType==='chain'&&round.chainSteps){
      const s0h=SS_hash(round.chainSteps.s0);
      for(const o of round.options){
        if(!o.cells)continue;
        if(SS_hash(o.cells)===s0h)return false;
      }
    }
    return true;
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
    if(round>=21)return{em:'\uD83D\uDC51',txt:'Spatial Master'};
    if(round>=16)return{em:'\u26A1',         txt:'Rotation Expert'};
    if(round>=11)return{em:'\uD83E\uDDE0',txt:'Spatial Thinker'};
    if(round>=6) return{em:'\uD83D\uDCAA',txt:'Getting Oriented'};
    return{em:'\uD83C\uDF31',txt:'Spatial Beginner'};
  }

  /* ---------- complexity engine ---------- */
  /* V5: difficulty score blends round count with recent accuracy so the game eases
     off after a bad streak and pushes harder on a good streak. Result range: 1..30. */
  function SS_getDifficultyScore(){
    const recent=G.recentResults||[];
    const recentAcc=recent.length?recent.filter(Boolean).length/recent.length:0.7;
    let score=Math.min(30,G.round);
    if(recentAcc>0.85)score+=4;
    else if(recentAcc<0.5)score-=4;
    return Math.max(1,Math.min(30,score));
  }
  function SS_blockCountForRound(rn){
    const def=SS_MODES[mode];
    /* V5: tier by difficulty score instead of raw round count */
    const diff=SS_getDifficultyScore();
    let n;
    if(diff<5)n=def.nMin;
    else if(diff<10)n=def.nMin+1;
    else if(diff<20)n=def.nMin+2;
    else if(diff<28)n=def.nMin+3;
    else n=def.nMin+4;
    n+=Adapt.bias;
    if(n<def.nMin)n=def.nMin;
    if(n>def.nMax)n=def.nMax;
    return n;
  }
  function SS_timerForRound(rn){
    const def=SS_MODES[mode];
    if(def.zen)return 0;
    let t=def.time-rn*def.decay;
    t*=1-Adapt.bias*0.05;
    if(t<def.minTime)t=def.minTime;
    if(t>def.time)t=def.time;
    return Math.round(t);
  }

  /* ---------- rendering ---------- */
  function SS_drawShapeSvg(cells,cs,color,opts){
    const nc=SS_norm(cells);
    const bb=SS_bbox(nc);
    const p=3,w=bb.cols*cs+p*2,h=bb.rows*cs+p*2;
    let inner='';
    for(let i=0;i<nc.length;i++){
      inner+='<rect x="'+(nc[i][1]*cs+p)+'" y="'+(nc[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="'+color+'"/>';
    }
    if(opts&&opts.ghostCell){
      const g=opts.ghostCell;
      inner+='<rect x="'+(g[1]*cs+p)+'" y="'+(g[0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="none" stroke="'+(opts.stroke||'#A78BFA')+'" stroke-width="2" stroke-dasharray="4 3"/>';
    }
    if(opts&&opts.dimCells){
      for(let i=0;i<opts.dimCells.length;i++){
        const dc=opts.dimCells[i];
        inner+='<rect x="'+(dc[1]*cs+p)+'" y="'+(dc[0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3 3" opacity=".35"/>';
      }
    }
    return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>';
  }
  function SS_drawMissingPrompt(partial,cs,color){
    /* Cleaner prompt: shows only the partial shape — each option's ghost-cell preview
       is the candidate marker. Previous version showed `?` on EVERY frontier position,
       cluttering the prompt and visually leaking all candidate slots. */
    const partialNorm=SS_norm(partial);
    const bb=SS_bbox(partialNorm);
    const p=3,w=bb.cols*cs+p*2,h=bb.rows*cs+p*2;
    let inner='';
    for(let i=0;i<partialNorm.length;i++){
      inner+='<rect x="'+(partialNorm[i][1]*cs+p)+'" y="'+(partialNorm[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="'+color+'"/>';
    }
    return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>';
  }
  function SS_drawCompletionPrompt(visible,hidden,cs,color){
    const allCells=visible.concat(hidden);
    const nc=SS_norm(allCells);
    const visNorm=SS_norm(visible);
    const visSet=new Set(visNorm.map(c=>c[0]+','+c[1]));
    const bb=SS_bbox(nc);
    const p=3,w=bb.cols*cs+p*2,h=bb.rows*cs+p*2;
    let inner='';
    for(let i=0;i<nc.length;i++){
      const k=nc[i][0]+','+nc[i][1];
      if(visSet.has(k)){
        inner+='<rect x="'+(nc[i][1]*cs+p)+'" y="'+(nc[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="'+color+'"/>';
      }else{
        inner+='<rect x="'+(nc[i][1]*cs+p)+'" y="'+(nc[i][0]*cs+p)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="4" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="3 3"/>';
      }
    }
    return'<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+inner+'</svg>';
  }

  /* ---------- BADGE HTML ---------- */
  function SS_badgeHtml(challengeType){
    const meta=SS_CHALLENGE_META[challengeType]||SS_CHALLENGE_META.rotation;
    return '<div class="ss-badge" style="background:'+meta.color+';">'+
      '<span class="ss-badge-emoji">'+meta.emoji+'</span>'+
      '<div class="ss-badge-info"><div class="ss-badge-name">'+meta.name+'</div>'+
      '<div class="ss-badge-inst">'+meta.instruction+'</div></div></div>';
  }

  /* ---------- start screen ---------- */
  function renderStart(){
    body.innerHTML='';
    const bestRound=S('nz_ss_best_round')||0;
    const games=S('nz_ss_games')||0;
    const accH=S('nz_ss_accuracy')||[];
    const avgAcc=accH.length?Math.round(accH.reduce((a,b)=>a+b,0)/accH.length):0;
    const dc=SS_dailyChallenge();
    const dcDone=SS_dailyDone();
    const screen=$('<div class="ss-start">'+
      '<div class="ss-stats">'+
        '<div class="ss-stat"><div class="v">'+bestRound+'</div><div class="l">Best Round</div></div>'+
        '<div class="ss-stat"><div class="v">'+avgAcc+'%</div><div class="l">Accuracy</div></div>'+
        '<div class="ss-stat"><div class="v">'+games+'</div><div class="l">Games</div></div>'+
      '</div>'+
      '<div class="daily-card '+(dcDone?'done':'')+'" style="margin-bottom:16px;">'+
        '<div style="display:flex;align-items:center;gap:12px;">'+
          '<div class="dc-ico">'+(dcDone?'\u2705':'\uD83C\uDFAF')+'</div>'+
          '<div style="flex:1;"><div class="dc-name">Daily: '+dc.label+'</div><div class="dc-sub">'+(dcDone?'Completed today!':'Complete for 2x XP')+'</div></div>'+
          '<span class="dc-badge">2x XP</span>'+
        '</div>'+
      '</div>'+
      '<div class="ss-mode-title">Choose a Mode</div>'+
      '<div class="ss-modes ss-modes-v4" id="ssModes"></div>'+
      '<button class="btn-primary" id="ssGo" style="margin-top:18px;width:100%;">Start \u25B6</button>'+
    '</div>');
    body.appendChild(screen);
    const modesEl=screen.querySelector('#ssModes');
    const modeDescriptions={
      classic:'Balanced. Mixed challenge types. 3 lives, timer decays.',
      speed:'4.5s flat. Rotation + angle + odd-one-out only. Combos!',
      expert:'Hard challenges only. 6-8 blocks. Mirror traps.',
      zen:'No timer, no lives. All types with explanations.',
      endless:'All 8 types. Timer decays. 3 lives. How far can you go?'
    };
    SS_MODE_KEYS.forEach(k=>{
      const m=SS_MODES[k];
      const card=$('<button class="ss-mode '+(k===mode?'sel':'')+'" data-m="'+k+'">'+
        '<div class="sm-top">'+m.emoji+' '+m.label+'</div>'+
        '<div class="sm-grid">'+(m.zen?'No timer':((m.time/1000).toFixed(1)+'s'))+' \u00B7 '+m.nMin+'-'+m.nMax+' blocks</div>'+
        '<div class="sm-sub">'+modeDescriptions[k]+'</div>'+
      '</button>');
      card.onclick=()=>{playSound('tap');mode=k;modesEl.querySelectorAll('.ss-mode').forEach(c=>c.classList.toggle('sel',c.dataset.m===k));};
      modesEl.appendChild(card);
    });
    screen.querySelector('#ssGo').onclick=()=>{
      playSound('tap');
      setS('nz_ss_v4_seen',1);
      if(startClock)startClock();
      startGame();
    };
  }

  /* ---------- game loop ---------- */
  let host=null;
  let _curRound=null;
  function startGame(){
    G.round=0;G.lives=SS_MODES[mode].lives;G.correctCount=0;G.attempts=0;G.comboCount=0;G.comboMax=0;
    G.pending=false;G.challengeHistory=[];
    /* V5: 6 active categories + totalMs tracking. angle/chain kept as legacy buckets. */
    G.skill={rotation:{ok:0,n:0,totalMs:0},mirror:{ok:0,n:0,totalMs:0},
             missing:{ok:0,n:0,totalMs:0},completion:{ok:0,n:0,totalMs:0},
             memory:{ok:0,n:0,totalMs:0},oddoneout:{ok:0,n:0,totalMs:0},
             angle:{ok:0,n:0,totalMs:0},chain:{ok:0,n:0,totalMs:0},
             mirrorErrors:0,nearErrors:0};
    G.recentResults=[]; /* V5 */
    Fresh.clear();Adapt.reset();
    body.innerHTML='';
    host=$('<div class="ss-play"></div>');
    body.appendChild(host);
    setScore(0);
    nextQ();
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

  function nextQ(){
    if(G.lives<=0||G.pending)return;
    if(G.barT){_cti(G.barT);G.barT=null;}
    const def=SS_MODES[mode];
    const n=SS_blockCountForRound(G.round);

    /* pick challenge type dynamically */
    let challengeType=SS_pickChallengeType();
    let round=null;

    /* Try up to 4 different challenge types if one fails to build cleanly.
       Some challenge types (chain, angle, oddoneout, mirror) reject symmetric shapes,
       so we may need to retry with a fresh shape or a different challenge type. */
    for(let typeAttempt=0;typeAttempt<4&&!round;typeAttempt++){
      if(typeAttempt>0)challengeType=SS_pickChallengeType();

      for(let attempt=0;attempt<10;attempt++){
        const sh=SS_makeFreshShape(n,{branching:0.25+Math.random()*0.5});
        if(!SS_shapeOkForChallenge(sh.cells,challengeType))continue;
        const built=SS_buildRound(challengeType,sh.cells);
        if(!built)continue;
        built.canon=sh.canon;built.sil=sh.sil;
        if(SS_verifyRound(built)){round=built;break;}
      }
    }

    /* emergency fallback: always rotation */
    if(!round){
      challengeType='rotation';
      const fb=SS_norm([[0,0],[1,0],[1,1]]);
      let built=null;
      try{built=SS_buildRotation(fb);}catch(e){}
      if(built&&SS_verifyRound(built)){
        round=built;round.canon=SS_canonicalHash(fb);round.sil=SS_silhouetteKey(fb);
      }else{
        const mc=SS_norm([[0,0],[1,0],[2,0],[2,1]]);
        const mw=[SS_norm([[0,0],[0,1],[0,2],[0,3]]),SS_norm([[0,0],[1,0],[1,1],[2,1]]),SS_norm([[0,0],[0,1],[1,0],[1,1]])];
        const opts=[{cells:SS_rotateCW(mc),correct:true,style:'rotation'}].concat(mw.map(c=>({cells:c,correct:false,style:'random'})));
        SS_shuffle(opts);
        round={challengeType:'rotation',target:mc,promptCells:mc,options:opts,
               canon:SS_canonicalHash(mc),sil:SS_silhouetteKey(mc)};
      }
    }

    G.challengeHistory.push(round.challengeType);
    if(G.challengeHistory.length>10)G.challengeHistory.shift();

    if(round.canon)Fresh.addCanon(round.canon,n);
    if(round.sil)Fresh.add(Fresh.silhouettes,round.sil,Fresh.maxSil);
    const correctIdx=(round.options||[]).findIndex(o=>o.correct);
    if(correctIdx>=0)Fresh.add(Fresh.correctPos,correctIdx,Fresh.maxPos);
    _curRound=round;
    G.timerMs=SS_timerForRound(G.round);
    G.roundStart=Date.now();G.roundOffPause=0;

    /* memory challenge: show then hide */
    if(round.challengeType==='memory'){
      renderMemoryPhase(round);
    }else if(round.challengeType==='angle'&&mode!=='speed'){
      renderAngleAnimation(round);
    }else{
      renderRound(round);
    }
  }

  /* ---------- MEMORY phase: show shape for N seconds based on complexity ---------- */
  function renderMemoryPhase(round){
    const def=SS_MODES[mode];
    const zen=def.zen;
    const cs=26;
    const promptColor=SS_SHAPE_COLOR; /* V5: unified shape color */
    /* Dynamic duration: more blocks = more time to memorize. 4=1800, 5=2200, 6=2600, 7=3000, 8=3400 */
    const blockCount=round.promptCells.length;
    const memDuration=zen?4000:Math.min(3400,1400+blockCount*300);
    const heartsHtml=zen?'<div class="qm-zen-tag">\uD83E\uDDD8 Zen</div>':
      '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>';

    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      heartsHtml+
      '<div class="ss-roundrow"><span>Round <strong>'+(G.round+1)+'</strong></span><span>Correct <strong>'+G.correctCount+'</strong></span></div>'+
      SS_badgeHtml('memory')+
      '<div class="ss-memory-phase"><div class="ss-memory-label">\uD83D\uDCA1 Remember this shape!</div>'+
      '<div class="ss-disp-wrap"><div class="ss-disp" id="ssMemShape">'+SS_drawShapeSvg(round.promptCells,cs,promptColor)+'</div></div>'+
      '<div class="ss-memory-timer" id="ssMemTimer">'+(memDuration/1000).toFixed(1)+'s</div></div>';

    let elapsed=0;
    const memInterval=_si(()=>{
      elapsed+=100;
      const remain=Math.max(0,(memDuration-elapsed)/1000).toFixed(1);
      const timerEl=host.querySelector('#ssMemTimer');
      if(timerEl)timerEl.textContent=remain+'s';
      if(elapsed>=memDuration){
        _cti(memInterval);
        round.memoryPhase=false;
        renderRound(round);
      }
    },100);
  }

  /* ---------- ANGLE animation phase ---------- */
  function renderAngleAnimation(round){
    const def=SS_MODES[mode];
    const zen=def.zen;
    const cs=26;
    const promptColor=SS_SHAPE_COLOR; /* V5: unified shape color */
    const heartsHtml=zen?'<div class="qm-zen-tag">\uD83E\uDDD8 Zen</div>':
      '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>';

    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      heartsHtml+
      '<div class="ss-roundrow"><span>Round <strong>'+(G.round+1)+'</strong></span><span>Correct <strong>'+G.correctCount+'</strong></span></div>'+
      SS_badgeHtml('angle')+
      '<div class="ss-disp-wrap"><div class="ss-disp" id="ssAngleShape" style="transition:transform 0.6s ease-in-out;">'+SS_drawShapeSvg(round.promptCells,cs,promptColor)+'</div></div>'+
      '<div class="ss-angle-label" id="ssAngleLabel">\uD83D\uDD04 Watch it rotate...</div>';

    _st(()=>{
      const shapeEl=host.querySelector('#ssAngleShape');
      if(shapeEl)shapeEl.style.transform='rotate('+round.angle+'deg)';
      _st(()=>{
        const lbl=host.querySelector('#ssAngleLabel');
        if(lbl)lbl.textContent='How much did it rotate?';
        renderRound(round);
      },800);
    },400);
  }

  /* ---------- MAIN RENDER ---------- */
  function renderRound(round){
    const def=SS_MODES[mode];
    const zen=def.zen;
    const cs=24;
    /* V5: ONE color for the prompt AND every option — puzzle is about shape, not hue. */
    const promptColor=SS_SHAPE_COLOR;
    const optColors=[SS_SHAPE_COLOR,SS_SHAPE_COLOR,SS_SHAPE_COLOR,SS_SHAPE_COLOR];
    round.startedAt=Date.now(); /* V5: per-round timestamp for solve-time tracking */
    const heartsHtml=zen?'<div class="qm-zen-tag">\uD83E\uDDD8 Zen \u2014 no timer / lives</div>':
      '<div class="wc-hearts">'+[0,1,2].map(i=>'<span class="wc-heart '+(i>=G.lives?'lost':'')+' '+(G.lives===1&&i===0?'mm-last':'')+'">'+(i>=G.lives?'\uD83D\uDC94':'\u2764\uFE0F')+'</span>').join('')+'</div>';
    const badge=SS_badgeHtml(round.challengeType);

    let promptSvg='';
    let optsHtml='';
    const ct=round.challengeType;

    if(ct==='rotation'||ct==='mirror'){
      promptSvg=SS_drawShapeSvg(round.promptCells,cs,promptColor);
      if(ct==='mirror')promptSvg+='<div class="ss-mirror-line"></div>';
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='missing'){
      promptSvg=SS_drawMissingPrompt(round.partial,cs,promptColor);
      optsHtml=round.options.map((o,i)=>{
        const merged=SS_norm(round.partial.concat([o.pos]));
        return '<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(merged,20,optColors[i],{ghostCell:o.pos,stroke:'#fff'})+'</button>';
      }).join('');
    }else if(ct==='memory'){
      promptSvg='<div class="ss-memory-hidden">\uD83E\uDDE0 What was the shape?</div>';
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='angle'){
      if(mode==='speed'){
        /* speed mode: side by side, no animation */
        promptSvg='<div class="ss-chain-pair">'+
          '<div class="ss-chain-card"><div class="ss-chain-lbl">BEFORE</div>'+SS_drawShapeSvg(round.promptCells,cs,promptColor)+'</div>'+
          '<div class="ss-chain-arrow">\u2192</div>'+
          '<div class="ss-chain-card"><div class="ss-chain-lbl">AFTER</div>'+SS_drawShapeSvg(round.afterCells,cs,SS_SHAPE_COLOR)+'</div></div>';
      }else{
        promptSvg='<div class="ss-angle-q">\uD83E\uDD14 How much did it rotate?</div>';
      }
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt ss-opt-text" data-i="'+i+'"><span class="ss-angle">'+o.label+'</span></button>').join('');
    }else if(ct==='oddoneout'){
      promptSvg='<div class="ss-oddone-label">\uD83D\uDD0D Which one doesn\'t belong?</div>';
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='chain'){
      const st=round.chainSteps;
      /* V5: all chain steps share the same color so only orientation differs visually. */
      promptSvg='<div class="ss-chain-seq">'+
        '<div class="ss-chain-card"><div class="ss-chain-lbl">0\u00B0</div>'+SS_drawShapeSvg(st.s0,18,SS_SHAPE_COLOR)+'</div>'+
        '<div class="ss-chain-arrow">\u2192</div>'+
        '<div class="ss-chain-card"><div class="ss-chain-lbl">90\u00B0</div>'+SS_drawShapeSvg(st.s1,18,SS_SHAPE_COLOR)+'</div>'+
        '<div class="ss-chain-arrow">\u2192</div>'+
        '<div class="ss-chain-card ss-chain-missing"><div class="ss-chain-lbl">180\u00B0</div><div class="ss-chain-q">?</div></div>'+
        '<div class="ss-chain-arrow">\u2192</div>'+
        '<div class="ss-chain-card"><div class="ss-chain-lbl">270\u00B0</div>'+SS_drawShapeSvg(st.s3,18,SS_SHAPE_COLOR)+'</div>'+
      '</div>';
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }else if(ct==='completion'){
      promptSvg=SS_drawCompletionPrompt(round.visibleCells,round.hiddenCells,cs,promptColor);
      optsHtml=round.options.map((o,i)=>'<button class="ss-opt" data-i="'+i+'">'+SS_drawShapeSvg(o.cells,20,optColors[i])+'</button>').join('');
    }

    const comboHtml=(def.combo&&G.comboCount>=2)?'<div class="ss-combo">\uD83D\uDD25 '+G.comboCount+'x Combo!</div>':'';

    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      heartsHtml+
      '<div class="ss-roundrow"><span>Round <strong>'+(G.round+1)+'</strong></span>'+comboHtml+'<span>Correct <strong>'+G.correctCount+'</strong></span></div>'+
      badge+
      '<div class="ss-disp-wrap"><div id="ssDisp" class="ss-disp">'+promptSvg+'</div></div>'+
      '<div class="ss-opts" id="ssOpts">'+optsHtml+'</div>'+
      '<div id="ssFb" class="ss-fb"></div>';

    const optEls=host.querySelectorAll('.ss-opt');
    optEls.forEach(btn=>{
      btn.onclick=()=>{
        if(btn.disabled)return;
        if(G.barT){_cti(G.barT);G.barT=null;}
        optEls.forEach(b=>b.disabled=true);
        const i=parseInt(btn.dataset.i,10);
        _resolve(i,false);
      };
    });
    _startBar();
  }

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
    const pickedStyle=pickedOpt&&pickedOpt.style||null;
    const ct=round.challengeType;
    /* V5: track solve time per category in addition to ok/n */
    if(G.skill[ct]){
      G.skill[ct].n++;
      G.skill[ct].totalMs=(G.skill[ct].totalMs||0)+ms;
      if(isCorrect)G.skill[ct].ok++;
    }
    /* V5: recent results window for adaptive difficulty */
    G.recentResults.push(isCorrect);
    if(G.recentResults.length>5)G.recentResults.shift();
    if(!isCorrect&&pickedStyle&&pickedStyle.indexOf('mirror')===0)G.skill.mirrorErrors++;
    if(!isCorrect&&pickedStyle==='nearMatch')G.skill.nearErrors++;
    Adapt.record(isCorrect,ms,G.timerMs||5000);

    if(isCorrect){
      playSound('correct');try{navigator.vibrate&&navigator.vibrate(10);}catch(e){}
      G.correctCount++;G.comboCount++;
      if(G.comboCount>G.comboMax)G.comboMax=G.comboCount;
      if(optEls[pickedIdx])optEls[pickedIdx].classList.add('ss-correct');
      if(fb){fb.style.color='#22C55E';fb.textContent='\u2705 Correct!';}
      /* animate correct option for rotation on wrong — skipped on correct */
      G.round++;setScore(G.round);
      _st(nextQ,def.zen?500:520);
    }else{
      playSound('wrong');try{navigator.vibrate&&navigator.vibrate([20,40,20]);}catch(e){}
      G.comboCount=0;
      if(pickedIdx>=0&&optEls[pickedIdx]){
        optEls[pickedIdx].classList.add('ss-wrong');
        optEls[pickedIdx].classList.add('wrong-flash'); /* V5: shake feedback */
      }
      if(optEls[correctIdx]){
        optEls[correctIdx].classList.add('ss-correct');
        /* V5: briefly highlight the correct answer so the player learns */
        _st(()=>{if(optEls[correctIdx])optEls[correctIdx].classList.add('correct-flash');},300);
      }
      /* V5: explain WHY using mistakeType, not generic "Wrong!" */
      if(fb){
        fb.style.color='#EF4444';
        const why=timedOut?'\u23F1 Time\u2019s up!':('\u274C '+SS_explainMistake(pickedOpt,round));
        fb.textContent=why;
      }

      /* animate correct answer briefly for learning */
      if(ct==='rotation'&&optEls[correctIdx]){
        optEls[correctIdx].style.transition='transform 0.5s ease';
        optEls[correctIdx].style.transform='rotate(360deg)';
        _st(()=>{if(optEls[correctIdx])optEls[correctIdx].style.transform='';},600);
      }

      if(def.zen){
        const exp=$('<div class="ss-explain">'+SS_explainZen(round,pickedIdx)+'</div>');
        host.appendChild(exp);
        G.round++;_st(nextQ,1700);
        return;
      }
      const dead=_loseLife();
      if(dead){_st(gameOver,950);return;}
      G.round++;
      _st(nextQ,900);
    }
  }

  /* ---------- ZEN explanations ---------- */
  function SS_explainZen(round,pickedIdx){
    const ct=round.challengeType;
    if(pickedIdx<0)return '\u23F1 Time ran out. Correct answer is highlighted in green.';
    if(ct==='rotation')return '\uD83D\uDD04 Rotation match: the correct shape is the prompt rotated by 90\u00B0, 180\u00B0, or 270\u00B0. Wrong options are mirrored or differently-structured shapes.';
    if(ct==='mirror')return '\uD83E\uDE9E Mirror challenge: the correct shape is the prompt flipped horizontally (like in a mirror). Wrong options are only rotations \u2014 they don\'t flip.';
    if(ct==='missing')return '\uD83E\uDDE9 The highlighted position is where the missing block belongs to recreate the original shape.';
    if(ct==='memory')return '\uD83E\uDDE0 Memory recall: the correct shape matches the exact one you saw before it hid.';
    if(ct==='angle'){
      const angle=round.angle;
      return '\uD83D\uDD04 The shape was rotated '+angle+'\u00B0 clockwise. (45\u00B0 and 135\u00B0 are not quarter-turns.)';
    }
    if(ct==='oddoneout')return '\uD83D\uDD0D Three shapes are rotations of each other (same shape, different angles). The odd one has a different structure.';
    if(ct==='chain')return '\uD83D\uDD17 Sequence: 0\u00B0 \u2192 90\u00B0 \u2192 ? \u2192 270\u00B0. The missing step is the 180\u00B0 rotation \u2014 same shape, upside down.';
    if(ct==='completion')return '\uD83D\uDD3A The correct completion fills the dashed positions to recreate the original shape exactly.';
    return 'Correct answer highlighted.';
  }

  function _loseLife(){
    if(SS_MODES[mode].zen)return false;
    G.lives--;
    if(host)host.classList.add('shake-anim');
    _st(()=>{if(host)host.classList.remove('shake-anim');},450);
    return G.lives<=0;
  }

  /* ---------- V5: Spatial IQ computation + card renderer ---------- */
  function SS_computeSpatialIQ(skill){
    const cats=['rotation','mirror','completion','missing','oddoneout','memory'];
    let totalOk=0,totalN=0,totalMs=0;
    cats.forEach(c=>{
      if(!skill[c])return;
      totalOk+=skill[c].ok||0;
      totalN+=skill[c].n||0;
      totalMs+=skill[c].totalMs||0;
    });
    const overallAcc=totalN?totalOk/totalN:0;
    const avgMs=totalN?totalMs/totalN:0;
    const speedBonus=avgMs&&avgMs<3000?10:avgMs&&avgMs<5000?5:0;
    const iq=Math.round(70+overallAcc*50+speedBonus);
    let weakest=null,weakestAcc=1;
    cats.forEach(c=>{
      if(skill[c]&&skill[c].n>=2){
        const acc=skill[c].ok/skill[c].n;
        if(acc<weakestAcc){weakestAcc=acc;weakest=c;}
      }
    });
    return{iq:iq,overallAcc:overallAcc,avgMs:avgMs,weakest:weakest,perCategory:cats.map(c=>({
      cat:c,
      acc:skill[c]&&skill[c].n?Math.round(skill[c].ok/skill[c].n*100):null,
      n:skill[c]?skill[c].n:0
    }))};
  }
  function SS_renderIQCard(stats){
    const catLabels={rotation:'Rotation',mirror:'Mirror',completion:'Completion',missing:'Missing Piece',oddoneout:'Odd Shape',memory:'Memory'};
    const rows=stats.perCategory.filter(c=>c.n>0).map(c=>
      '<div class="ss-iq-row">'+
        '<span>'+(catLabels[c.cat]||c.cat)+'</span>'+
        '<div class="ss-iq-bar"><div class="ss-iq-fill" style="width:'+c.acc+'%"></div></div>'+
        '<span class="ss-iq-pct">'+c.acc+'%</span>'+
      '</div>'
    ).join('');
    const weakLabel=stats.weakest?catLabels[stats.weakest]:null;
    return '<div class="ss-iq-card">'+
      '<div class="ss-iq-headline">'+
        '<span class="ss-iq-emoji">\uD83E\uDDE0</span>'+
        '<div><div class="ss-iq-num">'+stats.iq+'</div><div class="ss-iq-label">Spatial IQ</div></div>'+
      '</div>'+
      '<div class="ss-iq-breakdown">'+rows+'</div>'+
      '<div class="ss-iq-meta"><span>\u23F1 Avg solve: '+(stats.avgMs/1000).toFixed(1)+'s</span></div>'+
      (weakLabel?'<div class="ss-iq-tip">\uD83D\uDCA1 Try more <strong>'+weakLabel+'</strong> puzzles to improve fastest.</div>':'')+
    '</div>';
  }

  /* ---------- game over ---------- */
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
      if(pass){setS('nz_ss_daily_date',todayKey());setS('nz_ss_daily_done',true);_st(()=>toast('\uD83C\uDFAF Daily Challenge complete! 2x XP'),700);}
    }
    const skillStore=S('nz_ss_skill')||{};
    ['rotation','mirror','missing','chain','memory','angle','oddoneout','completion'].forEach(k=>{
      skillStore[k]=skillStore[k]||[0,0];
      skillStore[k][0]+=G.skill[k].ok;
      skillStore[k][1]+=G.skill[k].n;
    });
    setS('nz_ss_skill',skillStore);

    const rank=SS_rank(finalRound);
    const xp=finalRound>=20?48:finalRound>=12?32:finalRound>=6?18:8;
    const insight=SS_buildInsight();
    setScore(finalRound);
    if(newPB)confetti(50);

    /* V5: Spatial IQ card replaces the old challenge-type breakdown rows */
    const iqStats=SS_computeSpatialIQ(G.skill);
    const iqCardHtml=SS_renderIQCard(iqStats);

    end({
      title:rank.em+' '+rank.txt,
      emoji:rank.em,
      sub:'Round '+finalRound+(newPB?' \u00B7 \uD83C\uDFC6 New Best!':''),
      value:finalRound,points:xp,starThresh:[6,12,20],
      statsHtml:'<div class="end-stats">'+
        '<div class="row"><span>Round Reached</span><span class="val">'+finalRound+'</span></div>'+
        '<div class="row"><span>Accuracy</span><span class="val">'+accuracy+'% ('+G.correctCount+'/'+G.attempts+')</span></div>'+
        '<div class="row"><span>Avg Reaction</span><span class="val">'+Math.round(Adapt.avgRT())+' ms</span></div>'+
        '<div class="row"><span>Mode</span><span class="val">'+SS_MODES[mode].emoji+' '+SS_MODES[mode].label+'</span></div>'+
        (G.comboMax>=3?'<div class="row"><span>Best Combo</span><span class="val">\uD83D\uDD25 '+G.comboMax+'x</span></div>':'')+
        '<div class="row"><span>XP Earned</span><span class="val">+'+xp+'</span></div>'+
        '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(finalRound,prevBest)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
      '</div>'+
      iqCardHtml+
      (insight?'<div class="ss-insight">'+insight+'</div>':'')+
      (newPB?'<div class="rec">New Personal Best! \uD83C\uDF89</div>':'')
    });
  }

  function SS_buildInsight(){
    const total=G.attempts;
    if(total<5)return '';
    const mErr=G.skill.mirrorErrors,nErr=G.skill.nearErrors;
    if(mErr>=Math.max(2,total*0.25))return '\uD83E\uDE9E Mirrors confused you '+mErr+' times \u2014 practice in Zen mode with explanations.';
    if(nErr>=Math.max(2,total*0.2))return '\uD83C\uDFAF Near-match traps got you '+nErr+' times \u2014 compare cell-by-cell.';
    const acc=G.correctCount/total;
    if(acc>=0.85&&Adapt.avgRT()<2000)return '\u26A1 Excellent speed AND accuracy. Try Expert mode!';
    if(acc>=0.85)return '\u2705 High accuracy \u2014 try Speed mode for more challenge.';
    if(acc<0.5)return '\uD83C\uDF31 Build foundation in Zen mode \u2014 explanations help you learn patterns.';
    return '';
  }

  renderStart();
}
