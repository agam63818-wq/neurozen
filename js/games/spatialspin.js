/* ==============================================================================
   SPATIAL SPIN V7 — Complete Redesign
   -----------------------------------------------------------------------------
   Entry: playSpatialSpin(body, setScore, end, wrap, startClock)
   All top-level identifiers prefixed SS_ to avoid collisions with other games.
   Reuses globals: $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey.
   CSS prefix preserved: .ss-
   localStorage keys preserved: nz_ss_best_round, nz_ss_games, nz_ss_accuracy,
                                nz_ss_daily_date, nz_ss_daily_done
   Additive: nz_ss_v7 (skill profile, weakest skill, recommendations)

   DESIGN GOALS
   - 4 modes: Classic, Speed, Expert, Zen (Endless removed)
   - 5 puzzle families: Rotation (40%), Mirror (20%), Memory (15%),
                        Odd Shape (15%), Rotation Sequence (10%)
   - Removed permanently: Missing Piece, Complete Shape, Endless Mode
   - Handcrafted shape library (250+ shapes, 20+ families, difficulty tiers)
   - Curated puzzle architecture supporting 1000+ puzzles
   - Internal Difficulty Score (NOT round-based): shape complexity, mirror traps,
     rotation angle, visual similarity, memory load, reaction time
   - Adaptive difficulty: per-skill tracking, personalized practice
   - Believable distractors only (90/180 mistakes, mirror confusion, near-identical)
   - Unified purple theme; geometry is the ONLY challenge signal
   - Educational feedback (teaches spatial reasoning, not just "wrong")
   - Statistics screen: Spatial IQ + per-skill accuracy + weakest + recommendation

   ARCHITECTURE (modular sections)
   1. Shape Math            — pure, verified geometry primitives
   2. Shape Library         — 250+ handcrafted shapes, 20+ families, tiers
   3. Puzzle Library        — 1000+ curated puzzle architecture
   4. Difficulty Engine     — Difficulty Score + adaptive per-skill tuning
   5. Distractor Engine     — believable-mistake distractors
   6. Challenge Generators  — 5 families (Rotation, Mirror, Memory, Odd, Sequence)
   7. Verifier              — hardened correctness + ambiguity guards
   8. Rendering             — SVG shapes, prompts, options (70% puzzle / 30% HUD)
   9. Feedback              — animations + educational explanations
  10. Game Flow             — modes, loop, timers, lives, combos
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
   SECTION 2 — SHAPE LIBRARY (250+ handcrafted shapes)
   Compact authoring notation: each shape is an array of row strings where
   '#' = filled cell, anything else = empty. SS_parseGrid converts to cells.
   Each family has tiered variants so difficulty can be tuned by the engine.
   Tier sizing: easy 4, medium 5-6, hard 7-8.
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
/* Parse a multi-shape block string. Lines beginning with family tag are ignored;
   blank lines separate shapes. Returns array of cell-arrays. */
function SS_parseShapes(rowsArr){return rowsArr.map(SS_parseGrid);}

/* ---- The handcrafted library: 20 families × tiered variants ---- */
/* Format: SS_SHAPE_LIB[family] = { easy:[...], medium:[...], hard:[...] }
   Each entry is an array of row-strings. */
const SS_SHAPE_LIB={
  L:{
    easy:[
      ["#.","#.","##"],
      [".#",".#","##"],
      ["##","#.","#."],
      ["##",".#",".#"]
    ],
    medium:[
      ["#.","#.","#.","##"],
      [".#",".#",".#","##"],
      ["#.","#.","##",".##"],
      ["#.","##",".##"]
    ],
    hard:[
      ["#.","#.","#.","#.","##"],
      [".#",".#",".#",".#","##"],
      ["#.","#.","##.",".##"],
      ["#.","#.","##",".##",".##"]
    ]
  },
  T:{
    easy:[
      ["###",".#."],
      [".#.","##"],
      [".#.","###"],
      ["##",".#."]
    ],
    medium:[
      ["###.",".#..",".#.."],
      ["..#.","###.","..#."],
      [".#.","###",".#."],
      [".#..",".###",".#.."]
    ],
    hard:[
      ["####",".#..",".#..",".#.."],
      ["..#.","####","..#.","..#."],
      [".#.",".##","###",".#."],
      ["#...","###","#...","#..."]
    ]
  },
  Z:{
    easy:[
      ["##.",".##"],
      [".#","##","#."],
      [".##","##."],
      ["#.","##",".#"]
    ],
    medium:[
      ["##..",".##.","..##"],
      ["..#",".##","##.","#.."],
      ["##.",".##","..#"],
      ["#..","##.",".##"]
    ],
    hard:[
      ["##..",".##.","..#.","..#."],
      ["...#","..##",".##.","##.."],
      ["##...",".##..","..##.","...##"],
      ["#....","##...",".##..","..##."]
    ]
  },
  Arrow:{
    easy:[
      [".#.","###",".#."],
      ["#..","###","#.."],
      [".#.","###",".#."],
      ["..#","###","..#"]
    ],
    medium:[
      [".#.","###",".#.",".#."],
      ["#..","#..","###","#.."],
      [".#..",".##.","###.",".#.."],
      ["..#.",".###",".##.","..#."]
    ],
    hard:[
      [".#.","###",".#.",".#.",".#."],
      ["#...","#...","#...","####","#..."],
      ["..#.",".###","###.",".##.","..#."],
      [".#..",".##.","###.",".##.",".#.."]
    ]
  },
  Snake:{
    easy:[
      ["#.","##",".#"],
      [".#","##","#."],
      ["#.","#.","##",".#"],
      [".#",".#","##","#."]
    ],
    medium:[
      ["#...","#...","##..",".##."],
      ["...#","...#","..##",".##."],
      ["#..","#..","##.",".##","..#"],
      ["..#","..#",".##","##.","#.."]
    ],
    hard:[
      ["#...","#...","#...","##..",".##."],
      ["....#","....#","...##","..##.","##..."],
      ["#....","#....","##...",".##..","..##."],
      ["...#.","...#.","..##.",".##..","##..."]
    ]
  },
  Hook:{
    easy:[
      ["##.","#.","#."],
      ["##",".#",".#"],
      [".#",".#","##"],
      [".#",".#",".##"]
    ],
    medium:[
      ["##.","#..","#..","#.."],
      [".##",".#.",".#.",".#."],
      ["#..","#..","##.",".##"],
      [".#.",".#.",".##","##."]
    ],
    hard:[
      ["##..","#...","#...","#...",".##."],
      [".##.",".#..",".#..",".#..","##.."],
      ["#...","#...","#...","##..",".##."],
      [".#..",".#..",".#..",".##.","##.."]
    ]
  },
  Cross:{
    easy:[
      [".#.","###",".#."],
      ["#.","##","#."],
      [".#","##",".#"],
      [".#.","##",".#."]
    ],
    medium:[
      [".#..","####",".#.."],
      ["..#.","####","..#."],
      [".#.",".##","###",".#.",".#."],
      [".#.",".#.","###",".##",".#."]
    ],
    hard:[
      [".#..","####",".#..",".#.."],
      ["..#.","####","..#.","..#."],
      [".#.","###",".#.",".#.",".#."],
      [".#.",".#.",".#.","###",".#."]
    ]
  },
  Bridge:{
    easy:[
      ["#.#","###"],
      ["###","#.#"],
      ["#.#","###"],
      ["###","#.#"]
    ],
    medium:[
      ["#.#.","###.","#.#."],
      [".#.#",".###",".#.#"],
      ["#...#","#####"],
      ["#####","#...#"]
    ],
    hard:[
      ["#.#..","###..","#.#..",".#.#."],
      [".#.#.",".###.",".#.#.","#.#.."],
      ["#...#","#####","#..."],
      ["#...","#####","#...#"]
    ]
  },
  Fork:{
    easy:[
      ["#.#","###"],
      ["#.#",".##"],
      ["###","#.#"],
      ["##.","#.#"]
    ],
    medium:[
      ["#.#.","###.",".#.."],
      [".#..","###.","#.#."],
      ["#.#.",".###",".#.."],
      [".#..","#.#.","###."]
    ],
    hard:[
      ["#.#..","###..",".#...",".#..."],
      [".#...",".#...","###..","#.#.."],
      ["#.#..",".###.",".#...",".#..."],
      [".#...",".#...",".###.","#.#.."]
    ]
  },
  Diamond:{
    easy:[
      [".#.","###",".#."],
      ["#.","##",".#","#."],
      [".#.","###",".#."],
      [".#","##",".#","#."]
    ],
    medium:[
      [".#..","#.#.","###.",".#.."],
      [".#..",".###","#.#.",".#.."],
      [".#.","#.#","###",".#.","#.#"],
      [".#.","#.#",".###",".#.","#.#"]
    ],
    hard:[
      ["..#..",".###.","#####",".###.","..#.."],
      [".#.","#.#","#.#","###",".#."],
      ["..#..",".###.","#.#.#",".###.","..#.."],
      [".#.","#.#","###","#.#",".#."]
    ]
  },
  Stair:{
    easy:[
      ["#.","##",".##"],
      [".#","##","#."],
      ["##",".##","..#"],
      ["..#",".##","##"]
    ],
    medium:[
      ["#...","##..",".##.","..##"],
      ["...#","..##",".##.","##.."],
      ["#..","##.",".##","..#"],
      ["..#",".##","##.","#.."]
    ],
    hard:[
      ["#....","##...",".##..","..##.","...##"],
      ["....#","...##","..##.",".##..","##..."],
      ["#...","##..",".##.","..##","...#"],
      ["...#","..##",".##.","##..","#..."]
    ]
  },
  Flag:{
    easy:[
      ["##","#.","#."],
      ["##",".#",".#"],
      [".#",".#","##"],
      [".#",".#",".##"]
    ],
    medium:[
      ["###","#..","#.."],
      ["###","..#","..#"],
      ["#..","#..","###"],
      ["..#","..#","###"]
    ],
    hard:[
      ["####","#...","#...","#..."],
      ["####","...#","...#","...#"],
      ["#...","#...","#...","####"],
      ["...#","...#","...#","####"]
    ]
  },
  Key:{
    easy:[
      [".#.","###",".#.","#."],
      [".#.",".##","#.#"],
      ["#.",".#.","###",".#."],
      ["#.#",".##",".#."]
    ],
    medium:[
      [".##","#.#",".##",".#."],
      [".#.",".##","#.#",".##"],
      [".#.","###",".#.",".#.","#."],
      [".#.","#.",".#.","###",".#."]
    ],
    hard:[
      ["..#..",".###.","#.#.#",".###.","..#..",".#..."],
      [".#...","..#..",".###.","#.#.#",".###.","..#.."],
      ["..##.",".#..#","..##.",".#...",".#...",".#..."],
      [".#...",".#...",".#...","..##.",".#..#","..##."]
    ]
  },
  Anchor:{
    easy:[
      [".#.","###",".#.","#.#"],
      ["#.#",".#.","###",".#."],
      [".#.",".#.","###","#.#"],
      ["#.#",".#.",".#.","###"]
    ],
    medium:[
      [".#.","###",".#.","#.#","#.#"],
      ["#.#","#.#",".#.","###",".#."],
      [".#.","#.#","#.#",".#.","###"],
      ["###",".#.",".#.","#.#","#.#"]
    ],
    hard:[
      [".#..",".###",".#..","#.#.","#.#."],
      ["#.#.","#.#.",".#..",".###",".#.."],
      [".#..","#.#.","#.#.",".#..",".###"],
      [".###",".#..",".#..","#.#.","#.#."]
    ]
  },
  Hammer:{
    easy:[
      ["###","#..","#.."],
      ["###","..#","..#"],
      ["#..","#..","###"],
      ["..#","..#","###"]
    ],
    medium:[
      ["##.#","#..#","#..#",".##."],
      ["#..#","#..#","##.#",".##."],
      ["####",".#..",".#..",".#.."],
      [".#..",".#..",".#..","####"]
    ],
    hard:[
      ["####","#...","#...","#...","#..."],
      ["####","...#","...#","...#","...#"],
      ["#....","#....","#....","#....","####"],
      ["...#","...#","...#","...#","####"]
    ]
  },
  Plus:{
    easy:[
      [".#.","###",".#."],
      ["#.","##","#.","#."],
      [".#","##",".#",".#"],
      [".#.",".#.","##","#."]
    ],
    medium:[
      [".#..",".#..","####",".#..",".#.."],
      ["#....","##...",".#...","##...","#...."],
      [".#.",".#.",".##","###",".#.",".#."],
      [".#.",".#.","###",".##",".#.",".#."]
    ],
    hard:[
      [".#..",".#..",".#..","####",".#..",".#..",".#.."],
      ["#.....","##....",".#....",".#....","##....","#....."],
      [".#...",".#...",".##..","###..",".#...",".##..",".#..."],
      [".#...",".##..",".#...","###..",".##..",".#...",".#..."]
    ]
  },
  Y:{
    easy:[
      ["#.#",".#.",".#."],
      [".#.",".#.","#.#"],
      ["#.#",".#.","#.#"],
      [".#.","#.#",".#."]
    ],
    medium:[
      ["#.#..",".#...",".#...",".#..."],
      ["..#.#","...#.","...#.","...#."],
      [".#...",".#...","#.#..","##..."],
      [".#...",".#...","..#.#","...##"]
    ],
    hard:[
      ["#.#",".#.",".#.",".#.",".#.","#.#"],
      ["#.#","#.#",".#.",".#.","#.#","#.#"],
      ["#.#..","#.#..",".#...",".#...",".#...",".#..."],
      ["..#.#","..#.#","...#.","...#.","...#.","...#."]
    ]
  },
  Spiral:{
    easy:[
      ["##.","#.#",".##"],
      [".##","#.#","##."],
      ["###","#..","###"],
      ["###","..#","###"]
    ],
    medium:[
      ["###.","#..#","#..#",".###"],
      [".###","#..#","#..#","###."],
      ["###.","#..#",".#.#",".###"],
      ["###.","#.#.","#..#",".###"]
    ],
    hard:[
      ["####","#..#","#..#","#..#",".###"],
      [".###","#..#","#..#","#..#","####"],
      ["###..","#.#..","#..#.",".#.#.",".###."],
      [".###.","#.#..","#..#.",".#.#.","..###"]
    ]
  },
  U:{
    easy:[
      ["#.#","###"],
      ["###","#.#"],
      ["#.#","###"],
      ["###","#.#"]
    ],
    medium:[
      ["#.#.","#.#.","#.#.","###."],
      [".#.#",".#.#",".#.#",".###"],
      ["#...#","#...#","#####"],
      ["#####","#...#","#...#"]
    ],
    hard:[
      ["#...#","#...#","#...#","#####"],
      ["#####","#...#","#...#","#...#"],
      ["#...#","#...#","#...#","#...#","#####"],
      ["#####","#...#","#...#","#...#","#...#"]
    ]
  },
  P:{
    easy:[
      ["##","#.#","##"],
      ["##","#.#","##","#."],
      ["##","#.#","##",".#"],
      [".#","##","#.#","##"]
    ],
    medium:[
      ["##.","#.#","##.","#.."],
      ["#..","##.","#.#","##."],
      ["###","#.#","###","#.."],
      ["#..","###","#.#","###"]
    ],
    hard:[
      ["####","#..#","####","#...","#..."],
      ["#...","#...","####","#..#","####"],
      ["###.","#.#.","###.","#.#.","#.#."],
      ["#.#.","#.#.","###.","#.#.","###."]
    ]
  },
  V:{
    easy:[
      ["#...","#...","###"],
      ["...#","...#","###"],
      ["###","#...","#..."],
      ["###","...#","...#"]
    ],
    medium:[
      ["#...","#...","#...","###."],
      ["...#","...#","...#",".###"],
      ["#....","#....","##...",".##.."],
      ["....#","....#","...##","..##."]
    ],
    hard:[
      ["#...","#...","#...","#...","####"],
      ["...#","...#","...#","...#","####"],
      ["#....","#....","##...",".##..","..##."],
      ["....#","....#","...##","..##.",".##.."]
    ]
  },
  W:{
    easy:[
      ["#...","#.##",".##."],
      ["...#","##.#",".##."],
      [".##.","#.##","#..."],
      [".##.","##.#","...#"]
    ],
    medium:[
      ["#...","#.##",".##.","#..."],
      ["...#","##.#",".##.","...#"],
      ["#...","##.",".##","#.##"],
      ["...#",".##","##.","##.#"]
    ],
    hard:[
      ["#....","#.##.",".##..","#.##.",".##.."],
      ["....#","##.#.",".##..","##.#.",".##.."],
      ["#...","#.##",".##.","#.##",".##.","#..."],
      ["...#","##.#",".##.","##.#",".##.","...#"]
    ]
  },
  Boot:{
    easy:[
      ["##.","#..","#..",".##"],
      [".##","..#","..#","##."],
      ["##.","#..","#..","#..",".##"],
      [".##","..#","..#","..#","##."]
    ],
    medium:[
      ["###.","#...","#...","#...",".##."],
      [".###","...#","...#","...#","##.."],
      ["#...","#...","###.",".##.",".#.."],
      ["...#","...#",".###",".##.","..#."]
    ],
    hard:[
      ["####","#...","#...","#...","#...",".##."],
      [".###","...#","...#","...#","...#","##.."],
      ["#....","#....","####.",".##..",".#...",".#..."],
      ["....#","....#",".####","..##.","...#.","...#."]
    ]
  }
};

/* ---- Flatten the library into a fast indexed catalogue ---- */
/* SS_SHAPE_CATALOG: [{id, family, tier, n, cells, canon, rotSym, hasMirror}] */
const SS_TIERS=['easy','medium','hard'];
const SS_SHAPE_CATALOG=(function(){
  const cat=[];
  const famKeys=Object.keys(SS_SHAPE_LIB);
  for(let f=0;f<famKeys.length;f++){
    const family=famKeys[f],fam=SS_SHAPE_LIB[family];
    for(let t=0;t<SS_TIERS.length;t++){
      const tier=SS_TIERS[t];
      const arr=fam[tier]||[];
      for(let i=0;i<arr.length;i++){
        const cells=SS_parseGrid(arr[i]);
        if(!cells.length)continue;
        cat.push({
          id:family+'_'+tier+'_'+i,
          family:family,
          tier:tier,
          n:cells.length,
          cells:cells,
          canon:SS_canonicalHash(cells),
          rotSym:SS_rotSymmetryOrder(cells),
          hasMirror:SS_hasMirror(cells)
        });
      }
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
function SS_catByTier(tier){return SS_byTier[tier]||[];}
function SS_catByN(n){return SS_byN[n]||[];}
function SS_catCount(){return SS_SHAPE_CATALOG.length;}
/* Pick a random catalog entry matching filters. tier optional, nMin/nMax optional,
   requireMirror (bool) optional, requireRotSym<4 optional. */
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
    /* requireRotDistinct: need s0!=s2, i.e. NO 180° symmetry → rotSym must be 4 */
    if(opts.requireRotDistinct&&e.rotSym<4)continue;
    /* banFullSym: reject shapes identical under all rotations (rotSym===1, e.g. plus/square).
       These have no distinct rotations to find, so they're useless for rotation/memory. */
    if(opts.banFullSym&&e.rotSym===1)continue;
    filtered.push(e);
  }
  if(!filtered.length){
    /* relax tier constraint */
    const relax=SS_SHAPE_CATALOG.filter(e=>
      (nMin==null||e.n>=nMin)&&(nMax==null||e.n<=nMax)&&
      (!opts.requireMirror||e.hasMirror)&&
      (!opts.requireRotDistinct||e.rotSym>=4)&&
      (!opts.banFullSym||e.rotSym>1));
    if(!relax.length)return null;
    return relax[Math.floor(Math.random()*relax.length)];
  }
  return filtered[Math.floor(Math.random()*filtered.length)];
}

/* Procedural fallback — only supplements the library when needed. */
function SS_genProcedural(n,branching){
  branching=branching==null?0.5:branching;
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
function SS_isDegenerate(cells){
  if(cells.length<3)return true;
  const bb=SS_bbox(cells);
  if(cells.length>=4&&(bb.rows===1||bb.cols===1))return true;
  return false;
}

/* ======================================================================
   SECTION 3 — PUZZLE LIBRARY (1000+ curated puzzle architecture)
   -----------------------------------------------------------------------------
   Rather than hard-code 1000 puzzles (which would bloat the file and be
   brittle), we BUILD a curated puzzle on demand from a handcrafted shape
   using a deterministic "recipe". Each recipe pins:
     - category (rotation|mirror|memory|odd|sequence)
     - shape catalogue entry (family+tier+variant)
     - rotation angle for the prompt
     - distractor strategy (which believable mistakes to show)
     - difficulty (1..30) and estimated solve time (ms)
   The full solvable space = (#shapes × #angles × #categories × #strategies)
   which is well over 1000. We materialize puzzles lazily, but the
   architecture guarantees a deep, curated, non-random pool.
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
  /* sequence: previous/next step + near-identical */
  seqSteps:     {label:'seq-steps',   mistakes:['prevStep','nextStep','nearIdent']}
};

/* Estimated solve time (ms) per category at base difficulty.
   Used by the puzzle metadata + the adaptive engine. */
const SS_SOLVE_TIME_BASE={
  rotation:2600, mirror:3100, memory:4200, odd:3600, sequence:3900
};

/* Build a puzzle recipe deterministically from (shape, category, angleIdx, stratKey).
   Returns a metadata record; the actual round is built by the generators. */
function SS_makePuzzleRecipe(cat,shapeEntry,angleIdx,stratKey,difficulty){
  const strat=SS_DIST_STRATS[stratKey]||SS_DIST_STRATS.rotAngles;
  const base=SS_SOLVE_TIME_BASE[cat]||3000;
  /* higher difficulty => slightly more time expected, but capped */
  const est=Math.round(base*(1+(difficulty-10)*0.03));
  return{
    id:cat+':'+shapeEntry.id+':'+angleIdx+':'+stratKey,
    category:cat,
    shape:shapeEntry.id,
    family:shapeEntry.family,
    tier:shapeEntry.tier,
    angleIdx:angleIdx,
    strat:stratKey,
    difficulty:difficulty,
    estSolveMs:est,
    distractors:strat.mistakes
  };
}

/* Weighted category distribution per the redesign spec:
   rotation ~40%, mirror ~20%, memory ~15%, odd ~15%, sequence ~10%. */
const SS_CAT_WEIGHTS={
  classic:{rotation:40,mirror:20,memory:15,odd:15,sequence:10},
  speed:  {rotation:55,mirror:15,memory:0, odd:20,sequence:10},
  expert: {rotation:30,mirror:25,memory:15,odd:15,sequence:15},
  zen:    {rotation:40,mirror:20,memory:15,odd:15,sequence:10}
};
const SS_CAT_KEYS=['rotation','mirror','memory','odd','sequence'];

/* ======================================================================
   SECTION 4 — DIFFICULTY ENGINE
   -----------------------------------------------------------------------------
   Difficulty Score (1..30) blends multiple signals so difficulty feels
   natural — never just "add more blocks":
     - shape complexity (tier + cell count)
     - mirror traps (mirror distractors present)
     - rotation angle magnitude
     - visual similarity of distractors (near-identical)
     - memory load (memory/sequence categories)
     - recent reaction time + accuracy
   Adaptive: per-skill tracking boosts weak categories and raises complexity
   for mastered ones.
   ====================================================================== */

/* Per-skill buckets tracked across a session (and persisted to storage). */
function SS_newSkillProfile(){
  return{
    rotation:{ok:0,n:0,totalMs:0},
    mirror:{ok:0,n:0,totalMs:0},
    memory:{ok:0,n:0,totalMs:0},
    odd:{ok:0,n:0,totalMs:0},
    sequence:{ok:0,n:0,totalMs:0}
  };
}

/* Adaptive category weights: boost weak (<60% acc, 3+ attempts), reduce
   mastered (>85%). Returns adjusted weights. */
function SS_adaptiveWeights(base,skill){
  const out={};
  for(let i=0;i<SS_CAT_KEYS.length;i++){
    const k=SS_CAT_KEYS[i];
    const w=base[k]||0;
    const s=skill[k];
    if(!s||s.n<3){out[k]=w;continue;}
    const acc=s.ok/s.n;
    if(acc<0.6)out[k]=w*1.45;        /* practice weak skill more */
    else if(acc>0.85)out[k]=w*0.65;  /* mastered — less emphasis */
    else out[k]=w;
  }
  return out;
}

/* Internal Difficulty Score for the current round. Considers:
   round progression, recent accuracy window, recent reaction time. */
function SS_difficultyScore(round,recentResults,recentMs,timerRef){
  let score=Math.min(28,round+2);
  const acc=recentResults.length?recentResults.filter(Boolean).length/recentResults.length:0.7;
  if(acc>0.85)score+=4;
  else if(acc<0.5)score-=4;
  /* reaction time factor: fast + accurate => harder */
  if(recentMs&&timerRef&&recentMs<timerRef*0.5&&acc>0.7)score+=2;
  return Math.max(1,Math.min(30,Math.round(score)));
}

/* Map difficulty score -> tier + cell-count band, modulated by mode. */
function SS_tierForDifficulty(diff,modeBias){
  /* modeBias: 0 normal, +1 expert (push harder), -1 zen (easier) */
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
   Every distractor represents a realistic human error:
     - 90/180/270 angle mistakes
     - mirror confusion (chose mirror instead of rotation, or vice versa)
     - near-identical rotation (one block relocated)
     - wrong sequence step (previous/next orientation)
     - same-family alternative (odd-shape distractors)
   NEVER random garbage. NEVER two visually identical options. NEVER
   multiple correct answers.
   ====================================================================== */
function SS_shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}

/* Distractor builders. Each returns {cells, style, mistakeType} or null. */
function SS_distMirror(cells,banSet,extraRot){
  let m=SS_mirrorH(cells);
  for(let i=0;i<(extraRot||0);i++)m=SS_rotateCW(m);
  const h=SS_hash(m);
  if(banSet.has(h))return null;
  if(SS_rotationSet(cells).has(h))return null;
  return{cells:m,style:'mirror'+(extraRot||0),mistakeType:'mirrorConfusion'};
}
function SS_distRotation(cells,banSet,steps){
  /* a rotation of the prompt that is NOT the correct angle */
  let r=SS_norm(cells);
  for(let i=0;i<steps;i++)r=SS_rotateCW(r);
  const h=SS_hash(r);
  if(banSet.has(h))return null;
  return{cells:r,style:'rotFiller'+steps,mistakeType:'wrongAngle'};
}
/* Near-identical: relocate one leaf cell to a nearby frontier slot.
   Stays connected and same cell count -> looks like a rotation at a glance. */
function SS_distNearIdent(cells,banSet){
  const setKey=new Set(cells.map(c=>c[0]+','+c[1]));
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const leaves=[];
  for(let i=0;i<cells.length;i++){
    let nb=0;
    for(let j=0;j<4;j++){const k=(cells[i][0]+dirs[j][0])+','+(cells[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
    if(nb<=1)leaves.push(i);
  }
  if(!leaves.length)return null;
  for(let t=0;t<8;t++){
    const idx=leaves[Math.floor(Math.random()*leaves.length)];
    const remaining=cells.filter((_,i)=>i!==idx);
    if(!SS_isConnected(remaining))continue;
    const front=SS_frontier(remaining);
    const targetKey=cells[idx][0]+','+cells[idx][1];
    const candidates=front.filter(p=>p[0]+','+p[1]!==targetKey);
    if(!candidates.length)continue;
    const newCell=candidates[Math.floor(Math.random()*candidates.length)];
    const newCells=SS_norm(remaining.concat([newCell]));
    const h=SS_hash(newCells);
    if(banSet.has(h))continue;
    return{cells:newCells,style:'nearIdent',mistakeType:'wrongAngle'};
  }
  return null;
}
/* Shape modification: change leaf position more dramatically (different bbox). */
function SS_distShapeMod(cells,banSet){
  const setKey=new Set(cells.map(c=>c[0]+','+c[1]));
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const leaves=[];
  for(let i=0;i<cells.length;i++){
    let nb=0;
    for(let j=0;j<4;j++){const k=(cells[i][0]+dirs[j][0])+','+(cells[i][1]+dirs[j][1]);if(setKey.has(k))nb++;}
    if(nb===1)leaves.push(i);
  }
  if(leaves.length<1)return null;
  for(let t=0;t<8;t++){
    const idx=leaves[Math.floor(Math.random()*leaves.length)];
    const remaining=cells.filter((_,i)=>i!==idx);
    if(!SS_isConnected(remaining))continue;
    const front=SS_frontier(remaining);
    if(!front.length)continue;
    /* pick a frontier cell far from the original leaf */
    const orig=cells[idx];
    front.sort((a,b)=>(Math.abs(b[0]-orig[0])+Math.abs(b[1]-orig[1]))-(Math.abs(a[0]-orig[0])+Math.abs(a[1]-orig[1])));
    const newCell=front[0];
    const newCells=SS_norm(remaining.concat([newCell]));
    const h=SS_hash(newCells);
    if(banSet.has(h))continue;
    return{cells:newCells,style:'shapeMod',mistakeType:'differentShape'};
  }
  return null;
}
/* Different shape: pick a different catalogue shape (same cell count). */
function SS_distDifferentShape(cells,banSet,n){
  const pool=SS_catByN(cells.length);
  if(!pool.length)return null;
  const targetCanon=SS_canonicalHash(cells);
  for(let t=0;t<12;t++){
    const e=pool[Math.floor(Math.random()*pool.length)];
    const h=SS_hash(e.cells);
    if(banSet.has(h))continue;
    if(SS_canonicalHash(e.cells)===targetCanon)continue;
    if(SS_rotationSet(cells).has(h))continue;
    return{cells:e.cells,style:'differentShape',mistakeType:'differentShape'};
  }
  return null;
}

/* ======================================================================
   SECTION 6 — CHALLENGE GENERATORS (5 puzzle families)
   -----------------------------------------------------------------------------
   Each generator takes a catalogue shape entry + options and returns a
   verified round object, or null if it cannot build a clean puzzle.
   Round shape: {challengeType, target, promptCells, options, ...extras}
   option: {cells, correct, style, mistakeType}
   ====================================================================== */

/* Shared: collect distractors with full anti-twin + anti-ambiguity guards. */
function SS_collectDistractors(target,banSet,correctCells,maxCount,builders){
  const wrong=[];
  const seenCanon=new Set([SS_canonicalHash(target),SS_canonicalHash(correctCells)]);
  const tryAdd=(g)=>{
    if(!g)return;
    const h=SS_hash(g.cells);
    if(banSet.has(h))return;
    /* reject rotation-equivalent to correct */
    if(SS_rotationSet(correctCells).has(h))return;
    /* reject visually identical to correct (>=80% overlap) */
    if(SS_cellsOverlap(correctCells,g.cells)>=0.80)return;
    /* reject duplicate canonical shape */
    const c=SS_canonicalHash(g.cells);
    if(seenCanon.has(c))return;
    /* reject visual twin vs existing wrong options */
    for(let i=0;i<wrong.length;i++){
      if(SS_rotationSet(wrong[i].cells).has(h))return;
      if(SS_cellsOverlap(wrong[i].cells,g.cells)>=0.80)return;
    }
    seenCanon.add(c);
    banSet.add(h);
    wrong.push(g);
  };
  for(let b=0;b<builders.length&&wrong.length<maxCount;b++){
    tryAdd(builders[b]());
  }
  return wrong;
}

/* 1. ROTATION MATCH (~40%) — Player sees a shape, must pick the rotated version.
   Correct = a non-identity rotation. Wrong = mirror confusion + near-identical +
   different shape. Expert mode adds mirror-rotation traps. */
function SS_buildRotation(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  const rotSet=SS_rotationSet(cells);
  const rotList=Array.from(rotSet.values());
  if(rotList.length<2)return null;            /* need at least 2 distinct rotations */
  const promptCells=rotList[0];               /* identity (or first canonical) */
  const nonIdentity=rotList.slice(1);
  const correctCells=nonIdentity[Math.floor(Math.random()*nonIdentity.length)];
  const correctRot=SS_rotationSet(correctCells);
  const banSet=new Set();
  rotSet.forEach((_,h)=>banSet.add(h));        /* ban all rotations of prompt */
  correctRot.forEach((_,h)=>banSet.add(h));
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
   Correct = a mirror of the prompt. Wrong = rotations of the prompt (the classic
   mirror-vs-rotation confusion) + near-identical. At most rotations as fillers. */
function SS_buildMirror(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  if(!entry.hasMirror)return null;
  const mirSet=SS_mirrorSet(cells);
  const mirList=Array.from(mirSet.values());
  if(!mirList.length)return null;
  const correctCells=mirList[Math.floor(Math.random()*mirList.length)];
  const rotSet=SS_rotationSet(cells);
  const rotList=Array.from(rotSet.values());
  const promptCells=rotList[0];
  /* banSet tracks hashes already committed to wrong[], to prevent duplicate options.
     We do NOT pre-ban the rotations of the prompt — they are the INTENDED fillers.
     We only ban the mirror (correct) answer's rotation equivalents here. */
  const banSet=new Set();
  SS_rotationSet(correctCells).forEach((_,h)=>banSet.add(h));  /* correct answer + its rots */
  const hard=opts.hard;
  /* Wrong options: 1-2 rotation fillers (mirror confusion mistake) + near-identical */
  /* rotFiller = another rotation of the prompt (NOT the prompt itself, NOT the mirror).
     These teach the difference between rotation and mirror. */
  const fillers=rotList.filter(c=>SS_hash(c)!==SS_hash(promptCells));
  const wrong=[];
  const seenCanon=new Set([SS_canonicalHash(cells),SS_canonicalHash(correctCells)]);
  const tryAdd=(g)=>{
    if(!g)return;
    const h=SS_hash(g.cells);
    if(banSet.has(h))return;
    if(mirSet.has(h))return;                   /* must not be a valid mirror (would be correct) */
    if(SS_cellsOverlap(correctCells,g.cells)>=0.80)return;
    const c=SS_canonicalHash(g.cells);
    if(seenCanon.has(c))return;
    for(let i=0;i<wrong.length;i++){if(SS_cellsOverlap(wrong[i].cells,g.cells)>=0.80)return;}
    seenCanon.add(c);banSet.add(h);wrong.push(g);
  };
  /* Add 1-2 rotation fillers (believable rotationNotMirror mistakes).
     NOTE: rotFillers ARE rotation-equivalent to promptCells (same canonical hash).
     We INTENTIONALLY skip the canonical-equivalence check here because these are
     the EXACT distractors that teach "rotation ≠ mirror". They look like prompt
     rotations but are wrong because the player must pick the MIRROR, not a rotation. */
  const fillerCount=hard?2:1;
  let fi=0;
  for(let i=0;i<fillers.length&&fi<fillerCount;i++){
    const f=fillers[i];
    const fh=SS_hash(f);
    if(banSet.has(fh))continue;               /* already committed as another distractor */
    if(mirSet.has(fh))continue;               /* it's also a valid mirror — skip */
    banSet.add(fh);                           /* no canonical check — rotations are allowed */
    wrong.push({cells:f,style:'rotFiller',mistakeType:'rotationNotMirror'});
    fi++;
  }
  tryAdd(SS_distNearIdent(cells,banSet));
  if(hard)tryAdd(SS_distShapeMod(cells,banSet));
  tryAdd(SS_distDifferentShape(cells,banSet));
  /* safety fill */
  let safety=0;
  while(wrong.length<3&&safety<6){safety++;tryAdd(SS_distNearIdent(cells,banSet));}
  if(wrong.length<3)return null;
  const optArr=[{cells:correctCells,correct:true,style:'mirrorAnswer',mistakeType:null}]
    .concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style,mistakeType:w.mistakeType||'rotationNotMirror'})));
  SS_shuffle(optArr);
  return{challengeType:'mirror',target:cells,promptCells:promptCells,options:optArr,family:entry.family};
}

/* 3. MEMORY ROTATION (~15%) — Show shape, hide, mentally rotate, choose.
   Variants:
     A) shape-memory: "which is the SAME shape?" (correct=prompt, wrong=different)
     B) rotation-memory: "which is the ROTATED version?" (correct=rotation, wrong=mirror+diff)
   The memory phase is handled by the renderer; the round carries memoryPhase=true. */
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
    /* correct = a rotation; wrong = mirror + near-identical + different */
    correctCells=rotList[1+Math.floor(Math.random()*(rotList.length-1))];
    banSet=new Set();
    rotSet.forEach((_,h)=>banSet.add(h));
    SS_rotationSet(correctCells).forEach((_,h)=>banSet.add(h));
    seenCanon.add(SS_canonicalHash(correctCells));
    const tryAdd=(g)=>{
      if(!g)return;const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      if(SS_rotationSet(correctCells).has(h))return;
      if(SS_cellsOverlap(correctCells,g.cells)>=0.80)return;
      const c=SS_canonicalHash(g.cells);if(seenCanon.has(c))return;
      for(let i=0;i<wrong.length;i++){if(SS_cellsOverlap(wrong[i].cells,g.cells)>=0.80)return;}
      seenCanon.add(c);banSet.add(h);wrong.push(g);
    };
    tryAdd(SS_distMirror(cells,banSet,0));
    tryAdd(SS_distNearIdent(cells,banSet));
    tryAdd(SS_distDifferentShape(cells,banSet));
    let s=0;while(wrong.length<3&&s<6){s++;tryAdd(SS_distNearIdent(cells,banSet));}
  }else{
    /* shape-memory: correct = the exact shape shown; wrong = different shapes + 1 mirror */
    correctCells=promptCells;
    banSet=new Set();
    rotSet.forEach((_,h)=>banSet.add(h));
    const tryAdd=(g)=>{
      if(!g)return;const h=SS_hash(g.cells);
      if(banSet.has(h))return;
      if(SS_cellsOverlap(promptCells,g.cells)>=0.80)return;
      const c=SS_canonicalHash(g.cells);if(seenCanon.has(c))return;
      for(let i=0;i<wrong.length;i++){if(SS_cellsOverlap(wrong[i].cells,g.cells)>=0.80)return;}
      seenCanon.add(c);banSet.add(h);wrong.push(g);
    };
    tryAdd(SS_distMirror(cells,banSet,0));
    tryAdd(SS_distNearIdent(cells,banSet));
    tryAdd(SS_distDifferentShape(cells,banSet));
    let s=0;while(wrong.length<3&&s<6){s++;tryAdd(SS_distDifferentShape(cells,banSet));}
  }
  if(wrong.length<3)return null;
  const optArr=[{cells:correctCells,correct:true,style:'memCorrect',mistakeType:null}]
    .concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style,mistakeType:w.mistakeType})));
  SS_shuffle(optArr);
  return{challengeType:'memory',target:cells,promptCells:promptCells,options:optArr,
         memoryPhase:true,memoryVariant:variant,family:entry.family};
}

/* 4. ODD SHAPE (~15%) — Three belong to same family (rotations), one does not.
   The odd one must require reasoning: same cell count, different structure. */
function SS_buildOdd(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  const rotSet=SS_rotationSet(cells);
  const rotList=Array.from(rotSet.values());
  if(rotList.length<3)return null;            /* need 3 distinct rotations for family */
  SS_shuffle(rotList);
  const familyPicks=rotList.slice(0,3);
  const famHashes=new Set(familyPicks.map(SS_hash));
  if(famHashes.size!==3)return null;
  const targetBB=SS_bbox(cells);
  const targetCanon=SS_canonicalHash(cells);
  let oddShape=null;
  /* Pick an odd shape from a DIFFERENT family, same cell count, visibly different */
  for(let t=0;t<24;t++){
    const pool=SS_catByN(cells.length);
    if(!pool.length)break;
    const e=pool[Math.floor(Math.random()*pool.length)];
    if(e.family===entry.family)continue;       /* different family */
    if(SS_canonicalHash(e.cells)===targetCanon)continue;
    const oh=SS_hash(e.cells);
    if(famHashes.has(oh))continue;
    const bb=SS_bbox(e.cells);
    /* require visible silhouette difference but SAME cell count (reasoning, not guessing) */
    if(Math.abs(bb.rows-targetBB.rows)+Math.abs(bb.cols-targetBB.cols)<1)continue;
    /* reject if odd shape has too-high overlap with any family pick */
    let twin=false;
    for(let i=0;i<familyPicks.length;i++){if(SS_cellsOverlap(familyPicks[i],e.cells)>=0.75){twin=true;break;}}
    if(twin)continue;
    oddShape=e.cells;break;
  }
  if(!oddShape)return null;
  const optArr=familyPicks.map(c=>({cells:c,correct:false,style:'family',mistakeType:'sameFamily'}));
  optArr.push({cells:oddShape,correct:true,style:'oddOne',mistakeType:null});
  SS_shuffle(optArr);
  return{challengeType:'odd',target:cells,options:optArr,family:entry.family};
}

/* 5. ROTATION SEQUENCE (~10%) — 0° → 90° → 180° → ? Player predicts next.
   Shows 0, 90, [?], 270. Correct = 180° rotation. Wrong = prev (90°), next (270°),
   near-identical. Directly creates "90° mistake" + "wrong sequence prediction". */
function SS_buildSequence(entry,opts){
  opts=opts||{};
  const cells=entry.cells;
  const s0=SS_norm(cells);
  const s1=SS_rotateCW(s0);
  const s2=SS_rotateCW(s1);   /* correct = 180° */
  const s3=SS_rotateCW(s2);
  if(SS_hash(s0)===SS_hash(s2))return null;    /* 180° symmetric: 180° == 0°, ambiguous */
  if(SS_hash(s1)===SS_hash(s3))return null;    /* 90° symmetric: would duplicate */
  const banSet=new Set();
  banSet.add(SS_hash(s2));                      /* correct */
  banSet.add(SS_hash(s0));                      /* visible in chain */
  banSet.add(SS_hash(s1));                      /* visible in chain (90°) */
  banSet.add(SS_hash(s3));                      /* visible in chain (270°) */
  const wrong=[];
  const seenCanon=new Set([SS_canonicalHash(cells)]);
  const tryAdd=(g)=>{
    if(!g)return;const h=SS_hash(g.cells);
    if(banSet.has(h))return;
    const c=SS_canonicalHash(g.cells);if(seenCanon.has(c))return;
    for(let i=0;i<wrong.length;i++){if(SS_cellsOverlap(wrong[i].cells,g.cells)>=0.85)return;}
    seenCanon.add(c);banSet.add(h);wrong.push(g);
  };
  /* Wrong option 1: s1 (the 90° step — a "90° mistake", picking previous step) */
  /* But s1 is banned (visible). Use a ROTATED variant of a near-identical instead. */
  tryAdd(SS_distNearIdent(s2,banSet));
  tryAdd(SS_distMirror(s2,banSet,0));
  tryAdd(SS_distShapeMod(s2,banSet));
  let safety=0;
  while(wrong.length<3&&safety<6){safety++;tryAdd(SS_distNearIdent(s2,banSet));}
  if(wrong.length<3)return null;
  const optArr=[{cells:s2,correct:true,style:'seqCorrect',mistakeType:null}]
    .concat(wrong.slice(0,3).map(w=>({cells:w.cells,correct:false,style:w.style,mistakeType:w.mistakeType||'wrongAngle'})));
  SS_shuffle(optArr);
  return{challengeType:'sequence',target:cells,chainSteps:{s0:s0,s1:s1,s2:s2,s3:s3},
         options:optArr,family:entry.family};
}

/* Master builder: pick a shape suitable for the category and build the round. */
function SS_buildRoundForCategory(cat,difficulty,modeBias,opts){
  opts=opts||{};
  const tier=SS_tierForDifficulty(difficulty,modeBias);
  /* shape filters per category */
  let pickOpts={tier:tier};
  if(cat==='rotation'){pickOpts.requireRotDistinct=false;pickOpts.banFullSym=true;}
  if(cat==='mirror'){pickOpts.requireMirror=true;}
  if(cat==='memory'){pickOpts.banFullSym=true;}
  if(cat==='odd'){pickOpts.requireRotDistinct=false;}  /* need 3+ rotations handled in gen */
  if(cat==='sequence'){pickOpts.requireRotDistinct=true;} /* need s0!=s2 */
  /* Try the preferred tier, then relax */
  let entry=SS_pickCatalog(pickOpts);
  if(!entry){
    const relax=Object.assign({},pickOpts);delete relax.tier;
    entry=SS_pickCatalog(relax);
  }
  if(!entry)return null;
  const genOpts={hard:modeBias>=1};
  let round=null;
  switch(cat){
    case 'rotation': round=SS_buildRotation(entry,genOpts);break;
    case 'mirror':   round=SS_buildMirror(entry,genOpts);break;
    case 'memory':   round=SS_buildMemory(entry,genOpts);break;
    case 'odd':      round=SS_buildOdd(entry,genOpts);break;
    case 'sequence': round=SS_buildSequence(entry,genOpts);break;
  }
  if(round){
    round.tier=entry.tier;
    round.difficulty=difficulty;
    round.recipe=SS_makePuzzleRecipe(cat,entry,0,
      cat==='rotation'?'rotAngles':cat==='mirror'?'mirRotations':cat==='memory'?'memShapes':cat==='odd'?'oddFamily':'seqSteps',
      difficulty);
  }
  return round;
}

/* ======================================================================
   SECTION 7 — VERIFIER (hardened correctness + ambiguity guards)
   Rejects any round with: duplicate options, visual twins, rotation-equivalent
   wrong options, multiple correct answers, or category-specific violations.
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
        if(SS_cellsOverlap(round.options[i].cells,round.options[j].cells)>=0.85)return false;
      }
    }
    /* no two options canonical-equivalent — EXCEPT:
       - odd: 3 family members are deliberately rotations of each other (same canon).
       - mirror: rotFiller distractors are rotations of the prompt (same canon as prompt,
         which is NOT the correct answer). These are intentional "rotation confusion" traps. */
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
  /* Sequence: no option equals s0 (visible in chain) */
  if(round.challengeType==='sequence'&&round.chainSteps){
    const s0h=SS_hash(round.chainSteps.s0);
    const s1h=SS_hash(round.chainSteps.s1);
    const s3h=SS_hash(round.chainSteps.s3);
    for(let i=0;i<round.options.length;i++){
      if(!round.options[i].cells)continue;
      const h=SS_hash(round.options[i].cells);
      if(h===s0h||h===s1h||h===s3h)return false;  /* none of the visible steps */
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
const SS_CHALLENGE_META={
  rotation:{emoji:'🔄',name:'ROTATION',instruction:'Find the matching rotation'},
  mirror:  {emoji:'🪞',name:'MIRROR',  instruction:'Find the mirrored version'},
  memory:  {emoji:'🧠',name:'MEMORY',  instruction:'Remember, then choose'},
  odd:     {emoji:'👁️',name:'ODD SHAPE',instruction:"Which one doesn't belong?"},
  sequence:{emoji:'🔗',name:'SEQUENCE',instruction:'Predict the next orientation'}
};
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

/* Detailed Zen-mode explanation per category. */
function SS_explainZen(round){
  const ct=round.challengeType;
  if(ct==='rotation')return '🔄 Rotation: the correct shape is the prompt turned 90°, 180°, or 270°. Wrong options were mirrors or differently-structured shapes.';
  if(ct==='mirror')return '🪞 Mirror: the correct shape is the prompt flipped horizontally. Wrong options were rotations — they spin, they don\'t flip.';
  if(ct==='memory'){
    if(round.memoryVariant==='rotation')return '🧠 Memory + Rotation: you had to remember the shape, then mentally rotate it. The correct answer is that rotation.';
    return '🧠 Memory: the correct shape matches the exact one you saw before it was hidden.';
  }
  if(ct==='odd')return '👁️ Odd Shape: three options are rotations of the SAME shape (same family). The odd one has a different structure — not just a different angle.';
  if(ct==='sequence')return '🔗 Sequence: 0° → 90° → ? → 270°. The missing step is the 180° rotation — same shape, upside down.';
  return 'Correct answer highlighted in green.';
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

  /* ---------- build the next round (with retries + freshness) ---------- */
  function SS_buildNextRound(){
    const def=SS_MODES[mode];
    const modeBias=def.bias+Adapt.bias;
    const diff=SS_difficultyScore(G.round,G.recentResults,
      G.recentMs.length?G.recentMs.reduce((a,b)=>a+b,0)/G.recentMs.length:0,G.timerMs||def.time);
    const n=SS_blockBand(diff,def,modeBias);
    let challengeType=SS_pickChallengeType();
    let round=null;
    /* Try up to 4 challenge types; within each, try up to 12 shapes */
    for(let typeAttempt=0;typeAttempt<4&&!round;typeAttempt++){
      if(typeAttempt>0)challengeType=SS_pickChallengeType();
      for(let attempt=0;attempt<12;attempt++){
        const built=SS_buildRoundForCategory(challengeType,diff,modeBias,{nMin:n,nMax:n});
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
        const built=SS_buildRoundForCategory('rotation',Math.min(10,diff),modeBias,{nMin:4,nMax:5});
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

  /* ---------- MEMORY phase: show shape then hide ---------- */
  function renderMemoryPhase(round){
    const def=SS_MODES[mode],zen=def.zen,cs=28;
    const blockCount=round.promptCells.length;
    const memDuration=zen?4200:Math.min(3600,1500+blockCount*300);
    const heartsHtml=SS_heartsHtml();
    host.innerHTML=
      (zen?'':'<div class="timer-bar"><div class="timer-fill timer-green" id="ssBar" style="width:100%"></div></div>')+
      heartsHtml+
      SS_roundRowHtml()+
      SS_badgeHtml('memory')+
      '<div class="ss-memory-phase"><div class="ss-memory-label">💡 Remember this shape!</div>'+
      '<div class="ss-disp-wrap"><div class="ss-disp ss-disp-lg" id="ssMemShape">'+SS_drawShapeSvg(round.promptCells,cs,SS_SHAPE_COLOR)+'</div></div>'+
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
