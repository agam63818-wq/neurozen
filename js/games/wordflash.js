/* ===================== WORD FLASH (endless) v2 ===================== */
const WF_T1=[
  ['CALM','CLAM','COAL','LAMB'],['FORM','FROM','ROOM','MOOR'],
  ['SALT','SLAT','LAST','ALTO'],['WORD','WARD','WARM','CORD'],
  ['MILE','LIME','LIMB','MELT'],['TIDE','TIED','DIET','EDIT'],
  ['STAR','RATS','ARTS','TSAR'],['LOOP','POOL','POLO','PLOP'],
  ['BEAR','BARE','BARD','BARN'],['PALE','PEAL','PLEA','LEAP'],
  ['DEAL','LEAD','DALE','DENT'],['NOTE','TONE','TENT','ONTO'],
  ['GAME','MAGE','MEGA','GEM'],['RICE','RACE','RIPE','RIDE'],
  ['SAND','DASH','DANK','SNAP'],['WIND','WING','WINE','WIDE'],
  ['FIRE','RIFE','TIER','REIN'],['BALL','BELL','BILL','BULL'],
  ['CARE','CORE','CURE','CART'],['DATE','GATE','HATE','FATE'],
  ['EARN','EAST','EASY','EDGE'],['FACE','CAFE','FAIL','FAIR'],
  ['GAIN','GAVE','GEAR','GIFT'],['HAND','HANG','HARD','HARM'],
  ['ICE','ACE','ACT','AGE'],['KING','INKY','KICK','KEEP'],
  ['LAMP','PALM','LAND','LANE'],['MAZE','MARE','MATE','MAKE'],
  ['NEST','SENT','TENS','NETS'],['OPEN','PEON','NOPE','PINE'],
  ['PACE','CAPE','ACME','EPIC'],['QUIT','QUIZ','QUAD','QUICK'],
  ['RAIN','NAIL','ARID','GRIN'],['SAFE','SAIL','SALE','SAME'],
  ['TEAM','MATE','MEAT','TAME'],['UNIT','UPON','USED','USER'],
  ['VAST','VOTE','VIEW','VINE'],['WASH','WAVE','WEAR','WEEK'],
  ['YARD','DRAY','YEAR','YELL'],['ZERO','ZONE','ZOOM','ZEAL'],
  ['BARK','DARK','MARK','PARK'],['COLD','BOLD','FOLD','GOLD'],
  ['EACH','ECHO','EDGE','ELSE'],['FAST','FEAR','FEED','FEEL'],
  ['GOAL','GAOL','LOGO','HALO'],['HOLD','HOLE','HOLY','HOME'],
  ['IRON','NOIR','ITEM','IDEA'],['JUMP','JOIN','JUST','JOKE'],
  ['KEEP','KEYS','KICK','KILL']
];
const WF_T2=[
  ['SWIFT','SHIFT','SNIFF','SWIRL'],['QUIET','QUITE','QUOTE','QUILT'],
  ['ANGEL','ANGLE','AGILE','ANKLE'],['BREAD','BEARD','BOARD','BRAND'],
  ['DAIRY','DIARY','DERBY','DIRTY'],['SACRED','SCARED','SEARED','SCORED'],
  ['MARBLE','RAMBLE','MARVEL','MANTLE'],['SILVER','SLIVER','SLIDER','SILKEN'],
  ['TRIAL','TRAIL','TRILL','TIDAL'],['BLAME','BLADE','BLARE','BLAZE'],
  ['STEAM','STEAK','STEAL','STEEL'],['GLARE','LARGE','GLAZE','GRACE'],
  ['CRATE','CARET','CATER','TRACE'],['SPARE','SPEAR','PARSE','SPADE'],
  ['POSE','PORE','POSH','POLE'],['NIGHT','RIGHT','LIGHT','MIGHT'],
  ['THROUGH','TROUGH','THOROUGH','THOUGHT'],['PRECEDE','PROCEED','PRESIDE','PRECISE'],
  ['DESSERT','DESERTS','DISSENT','DISSECT'],['CONVERSE','CONSERVE','CONVERGE','CONVEYED'],
  ['ADAPTER','ADOPTER','ADAPTED','ADOPTED'],['LATERAL','LITERAL','LITERARY','LITERATE'],
  ['EMINENT','IMMINENT','EMIGRANT','ELEGANT'],['CRYSTAL','CRUCIAL','CYNICAL','CLINICAL'],
  ['PERSUADE','PERSPIRE','PERSONAL','PERSIST'],['DECLINE','DECLARE','DECIMAL','DECLAIM'],
  ['ILLUSION','ALLUSION','ELUSION','EVASION'],['STATIONARY','STATIONERY','STATIONER','SITUATION'],
  ['ACCEPT','EXCEPT','EXPECT','ACCESS'],['AFFECT','EFFECT','AFFLICT','EFFORT'],
  ['PRINCIPAL','PRINCIPLE','PRINCESS','PRINTING'],['COMPLEMENT','COMPLIMENT','COMPLACENT','COMMITMENT'],
  ['BLOOM','BROOM','BROOK','GLOOM'],['CHARM','CHART','CHASE','CHAIN'],
  ['DREAM','DRAIN','DRAWN','DRIVE'],['FLAME','FLARE','FLASH','FLAKE'],
  ['GRAPE','GRASP','GRASS','GRAIN'],['HEART','HEARD','HEAVY','HONEY'],
  ['IMAGE','IMPLY','INDEX','INPUT'],['JOINT','JUDGE','JUICE','JELLY'],
  ['KNIFE','KNOCK','KNEEL','KNOWS'],['LEARN','LEAST','LEAVE','LEVEL'],
  ['MEDIA','METAL','MODEL','MONEY'],['NOISE','NORTH','NOTES','NOBLE'],
  ['OCEAN','OFFER','ORDER','OTHER'],['PIECE','PILOT','PITCH','PLACE'],
  ['QUEEN','QUEST','QUICK','QUIET'],['RAISE','RANGE','RATIO','REACH'],
  ['SCALE','SCENE','SCOPE','SCORE'],['SHARE','SHARP','SHELF','SHIFT']
];
const WF_T3=[
  ['ATTENTION','INTENTION','ATTENTIVE','RETENTION'],['PERCEPTION','DECEPTION','RECEPTION','PERFECTION'],
  ['CONSCIENCE','CONSCIENCES','CONSCIENT','CONFERENCE'],['OCCURRENCE','OCCURRENCES','RECURRENCE','COHERENCE'],
  ['MAINTAIN','MOUNTAIN','MAINTAINS','MAINSTAY'],['SEPARATE','SEPARATES','GENERATE','DESPERATE'],
  ['DEFINITION','DEFINITIONS','DEFINITIVE','DEPOSITION'],['RECOMMEND','RECOMMENDS','RECONNECT','RECOUNTED'],
  ['ACCOMMODATE','ACCOMMODATED','ACCOMPANIED','ACCUMULATE'],['EMBARRASSED','EMBARRASSES','EMBARRASSING','HARASSMENT'],
  ['PRIVILEGE','PRIVILEGED','PREVAILING','PREJUDICE'],['ESSENTIAL','ESSENTIALS','POTENTIAL','EXISTENCE'],
  ['GUARANTEE','GUARANTEED','GUARANTOR','QUARANTINE'],['ALGORITHM','ALGORITHMS','LOGARITHM','ARITHMETIC'],
  ['ENVIRONMENT','ENVIRONMENTS','ENRICHMENT','ENFORCEMENT'],['RESPONSIBLE','RESPONSIBLY','RESPONSIVE','RESPECTABLE'],
  ['ACKNOWLEDGE','ACKNOWLEDGED','ACQUAINTANCE','ACQUISITION'],['APPROPRIATE','APPROPRIATED','APPROXIMATE','APPRECIATE'],
  ['BEAUTIFUL','BOUNTIFUL','BEAUTIFIES','BEAUTICIAN'],['CALCULATE','CALCULATED','CALENDAR','CANDIDATE'],
  ['DELIBERATE','DELIBERATED','DEGENERATE','DESPERATE'],['EDUCATION','EDUCATIONS','EVACUATION','MEDIATION'],
  ['FASCINATE','FASCINATED','FASCINATOR','FABRICATE'],['GENERALLY','GENUINELY','GENERATED','GENEROUSLY'],
  ['HESITATE','HESITATED','HERITAGE','HINDRANCE'],['IDENTICAL','IDENTIFIED','IDENTITY','INDICATED'],
  ['JUDGMENT','JUDGMENTS','JUDICIAL','JUSTICES'],['KNOWLEDGE','KNOWINGLY','KNOWABLE','KNIGHTED'],
  ['LABORATORY','LEGITIMATE','LIABILITY','LITERATURE'],['MAGNIFICENT','MAGNIFICENCE','MAINTENANCE','MANUFACTURE'],
  ['NECESSARY','NECESSITY','NEGOTIATE','NOMINATE'],['OBJECTIVE','OBJECTIVES','OBSTACLE','OFFENSIVE'],
  ['PARAGRAPH','PARAGRAPHS','PASSENGER','PERCENTAGE'],['QUALIFIED','QUALIFIER','QUANTIFIED','LIQUEFIED'],
  ['REALISTIC','REALITIES','IDEALISTIC','RELATABLE'],['SACRIFICE','SACRIFICES','SATIRICAL','SCARCITY'],
  ['TECHNIQUE','TECHNICAL','TEMPORARY','TERRITORY'],['ULTIMATUM','ULTIMATUMS','UNANIMOUS','UNDERSTAND'],
  ['VAGUENESS','VALIDATE','VARIATION','VEGETABLE'],['WITHDRAW','WITHDRAWS','WITHHELD','WITHSTAND'],
  ['XENOPHOBIA','XENOPHOBIC','XENOPHOBE','XENOPHILE'],['YESTERDAY','YESTERDAYS','YOUNGSTER','YESTERYEAR'],
  ['ZEALOUSLY','JEALOUSLY','ZIGZAGGED','ZESTFULLY']
];

const WF_TIERS = [WF_T1, WF_T2, WF_T3];

/* Fail loudly during startup if a content edit can make a question unfair.
   The sorted cross-tier key also catches a recycled group whose option order
   was changed to disguise it. */
function WF_validateWordPools(tiers = WF_TIERS) {
  const errors = [];
  const seenGroups = new Map();
  tiers.forEach((pool, tierIndex) => {
    pool.forEach((group, groupIndex) => {
      const at = `T${tierIndex + 1}[${groupIndex}]`;
      if (group.length !== 4) errors.push(`${at} has ${group.length} words`);
      if (new Set(group).size !== group.length) errors.push(`${at} contains duplicate words`);
      const answerLength = group[0].length;
      if (!group.slice(1).some(word => word.length === answerLength)) {
        errors.push(`${at} has a unique answer length`);
      }
      group.slice(1).forEach(word => {
        if (Math.abs(word.length - answerLength) > 1) {
          errors.push(`${at} distractor ${word} is not length-matched`);
        }
      });
      const key = [...group].sort().join('\u0001');
      if (seenGroups.has(key)) errors.push(`${at} duplicates ${seenGroups.get(key)}`);
      else seenGroups.set(key, at);
    });
  });
  if (errors.length) throw new Error(`Word Flash pool validation failed:\n${errors.join('\n')}`);
  return true;
}
WF_validateWordPools();

/* Smooth tier transitions instead of jumping from four-letter words straight
   to long words. `roll` is injectable so the probe can test every boundary. */
function WF_tierForRound(q, roll = Math.random()) {
  const round = q + 1;
  if (round <= 4) return 1;
  if (round <= 8) return roll < (round - 4) / 4 ? 2 : 1;
  if (round <= 11) return 2;
  if (round <= 16) return roll < (round - 11) / 5 ? 3 : 2;
  return 3;
}

/* Content-aware viewing time. Round pressure and Blink mode can tighten the
   pace, but never below the readability floor of 72ms per visible letter. */
function WF_flashDuration(q, wordsOnScreen, opts = {}) {
  const chars = wordsOnScreen.reduce((sum, word) => sum + word.length, 0);
  const contentMs = 420 + chars * 85;
  const pacePenalty = Math.min(400, q * 12) + (opts.blink ? 110 : 0);
  let duration = Math.max(contentMs - pacePenalty, contentMs * 0.65, chars * 72);
  if (opts.type) duration *= 1.12;
  return Math.round(duration);
}

/* Reading four long look-alikes and typing an exact spelling need different
   answer budgets. Both remain brisk, but long questions no longer share the
   same six-second deadline as four-letter questions. */
function WF_answerDuration(words, typeMode = false) {
  if (typeMode) return Math.min(9000, Math.max(6000, 5200 + words[0].length * 380));
  const chars = words.reduce((sum, word) => sum + word.length, 0);
  return Math.min(10000, Math.max(6000, 5000 + chars * 75));
}

/* Make the second flashed word matter: one answer option comes from its group,
   preferably the exact word that was shown. */
function WF_decoyOptions(askGroup, unaskedGroup, roll = Math.random()) {
  const options = [...askGroup];
  if (!unaskedGroup) return options;
  const decoyWord = unaskedGroup.find(word => !options.includes(word));
  if (!decoyWord) return options;
  const answerLength = options[0].length;
  const safeSlots = [1,2,3].filter(slot =>
    options.some((word, index) => index !== 0 && index !== slot && word.length === answerLength));
  const slots = safeSlots.length ? safeSlots : [1,2,3];
  const replaceAt = slots[Math.min(slots.length - 1, Math.floor(roll * slots.length))];
  options[replaceAt] = decoyWord;
  return options;
}

/* Visual effect helpers */
function shakeScreen(el) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'shakeScreen 0.5s cubic-bezier(.36,.07,.19,.97) both';
  setTimeout(() => { el.style.animation = ''; }, 500);
}

function createParticles(x, y, color = '#34D399') {
  const colors = ['#34D399', '#60A5FA', '#FBBF24', '#F472B6', '#A78BFA'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px;
      width: 8px; height: 8px; border-radius: 50%;
      background: ${colors[i % colors.length]};
      pointer-events: none; z-index: 10000;
      animation: particleBurst 0.8s ease-out forwards;
      --tx: ${(Math.random() - 0.5) * 120}px;
      --ty: ${(Math.random() - 0.5) * 120 - 30}px;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function createMilestoneEffect(roundNum) {
  const ov = document.createElement('div');
  ov.style.cssText = `
    position: fixed; inset: 0; display: flex; align-items: center;
    justify-content: center; z-index: 10000; pointer-events: none;
  `;
  ov.innerHTML = `
    <div style="text-align: center; animation: milestonePop 1.2s ease-out forwards;">
      <div style="font-size: 64px; margin-bottom: 8px;">🎉</div>
      <div style="font-size: 42px; font-weight: 800; color: #A78BFA; text-shadow: 0 0 30px rgba(167,139,250,0.5);">ROUND ${roundNum}</div>
      <div style="font-size: 16px; color: var(--text2); margin-top: 8px; font-weight: 600;">Keep it up!</div>
    </div>
  `;
  document.body.appendChild(ov);
  setTimeout(() => ov.remove(), 1200);
}

function animateHeartLoss(heartEl) {
  heartEl.style.animation = 'heartShatter 0.6s ease-out forwards';
  setTimeout(() => { heartEl.style.animation = ''; heartEl.textContent = '💔'; }, 600);
}

function showFloatingText(x, y, text, color = '#34D399') {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px; transform: translate(-50%, -50%);
    font-size: 22px; font-weight: 800; color: ${color}; pointer-events: none;
    z-index: 10000; animation: floatUp 1s ease-out forwards;
    text-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/* Speed is content-relative: 1.5 seconds for two long words can be more
   demanding than 700ms for one short word. */
function getSpeedLabel(ms, chars = 1) {
  const perChar = ms / Math.max(1, chars);
  if (perChar >= 150) return '🟢 NORMAL';
  if (perChar >= 110) return '🟡 FAST';
  if (perChar >= 90) return '🟠 RAPID';
  if (perChar >= 78) return '🔴 LIGHTNING';
  return '⚡ BLINK';
}

/* Streak badge config */
function getStreakBadge(streak) {
  if (streak >= 8) return { label: '👑 LOCKED IN', color: '#A78BFA', shadow: 'rgba(167,139,250,0.6)' };
  if (streak >= 5) return { label: '⚡ SHARP', color: '#60A5FA', shadow: 'rgba(96,165,250,0.6)' };
  if (streak >= 3) return { label: '🔥 HOT', color: '#FBBF24', shadow: 'rgba(251,191,36,0.6)' };
  return null;
}

/* Announcement interstitial */
function playWordFlash(body, setScore, end, wrap, startClock) {
  let q = 0, score = 0, streak = 0, bestStreak = 0, fastest = null, correctCount = 0, lives = 3;
  let typeModeUnlocked = false, currentMode = 'select';
  let blinkAnnounced = false, decoyAnnounced = false;
  let highestSpeedLabel = '';
  let currentAskWord = null, currentFlashMs = 0, currentTier = 1;
  let answerTimeout = null;
  let answerTimedOut = false;
  let activeTimers = [];
  const record = S('nz_wf_best') || 0;

  /* Cleanup helper for remove_game */
  function _cleanup() {
    activeTimers.forEach(t => clearTimeout(t));
    activeTimers = [];
    if (answerTimeout) { clearTimeout(answerTimeout); answerTimeout = null; }
    if (host && host._keyHandler) {
      document.removeEventListener('keydown', host._keyHandler);
      host._keyHandler = null;
    }
  }
  wrap.addEventListener('remove_game', _cleanup);

  const pools = { 1: [...WF_T1].sort(() => Math.random() - .5), 2: [...WF_T2].sort(() => Math.random() - .5), 3: [...WF_T3].sort(() => Math.random() - .5) };
  const used = { 1: 0, 2: 0, 3: 0 };
  function takeGroup(tier) { const p = pools[tier]; const g = p[used[tier] % p.length]; used[tier]++; if (used[tier] % p.length === 0) p.sort(() => Math.random() - .5); return g; }

  /* ---------- PREMIUM START SCREEN ---------- */
  const wfGames    = S('nz_wf_games') || 0;
  const wfBestStr  = S('nz_wf_best_streak') || 0;
  const wfBestSpd  = S('nz_wf_best_speed_label') || '—';
  const wfTotalPts = S('nz_wf_total_points') || 0;

  const instrEl = $(`<div class="ss-start wf3-start">
    <div class="wf3-hero">
      <div class="wf3-demo" id="wf3Demo">
        <div class="wf3-demo-flash" id="wf3DemoFlash">FORM</div>
        <div class="wf3-demo-opts" id="wf3DemoOpts">
          <div class="wf3-demo-opt" data-i="0">FROM</div>
          <div class="wf3-demo-opt" data-i="1">FORT</div>
          <div class="wf3-demo-opt correct" data-i="2">FORM</div>
          <div class="wf3-demo-opt" data-i="3">FOAM</div>
        </div>
      </div>
      <h1 class="wf3-hero-title">Word Flash</h1>
      <div class="wf3-hero-tag">Memory · Attention</div>
      <p class="wf3-hero-quote">Blink and you'll <span>miss it.</span></p>
      <p class="wf3-hero-sub">One flash. Four look-alikes. Pick the exact word.</p>
    </div>

    <div class="wf3-statgrid">
      <div class="wf3-sg"><div class="v">${record}</div><div class="l">Best Score</div></div>
      <div class="wf3-sg"><div class="v">${wfBestStr}</div><div class="l">Best Streak</div></div>
      <div class="wf3-sg"><div class="v">${wfGames}</div><div class="l">Games</div></div>
      <div class="wf3-sg"><div class="v">${wfBestSpd}</div><div class="l">Top Speed</div></div>
      <div class="wf3-sg"><div class="v">${wfTotalPts}</div><div class="l">Lifetime Pts</div></div>
      <div class="wf3-sg"><div class="v">3<span class="wf3-heart">❤️</span></div><div class="l">Lives</div></div>
    </div>

    <div class="wf3-rules">
      <div class="wf3-rule"><span class="wf3-rk">⚡</span><div><strong>Watch the flash</strong><small>Word appears for a split second</small></div></div>
      <div class="wf3-rule"><span class="wf3-rk">🎯</span><div><strong>Pick the exact match</strong><small>Distractors are almost identical</small></div></div>
      <div class="wf3-rule"><span class="wf3-rk">🔥</span><div><strong>Chain streaks for ×1.5</strong><small>Speed bonus stacks on top</small></div></div>
    </div>

    <button class="btn-primary wf3-start-btn" id="wfStart">
      <span>Start Game</span>
      <span class="wf3-arrow">→</span>
    </button>
  </div>`);
  body.appendChild(instrEl);
  const host = $(`<div></div>`);
  body.appendChild(host);

  /* ---------- START-SCREEN ANIMATED DEMO ---------- */
  (function startDemoLoop(){
    const demoSets = [
      { flash:'FORM', opts:['FROM','FORT','FORM','FOAM'], correct:2 },
      { flash:'TIDE', opts:['TIED','TIDE','DIET','EDIT'], correct:1 },
      { flash:'BEAR', opts:['BARE','BEAD','BEAR','BEAN'], correct:2 },
      { flash:'PALE', opts:['PLEA','PEAL','PALM','PALE'], correct:3 },
      { flash:'BLADE',opts:['BLAME','BLADE','BLARE','BLAZE'], correct:1 },
    ];
    let idx = 0;
    const flashEl = instrEl.querySelector('#wf3DemoFlash');
    const optsEl  = instrEl.querySelector('#wf3DemoOpts');
    let alive = true;
    function loop(){
      if (!alive || !document.body.contains(instrEl)) return;
      const s = demoSets[idx % demoSets.length];
      idx++;
      // Phase 1: FLASH
      flashEl.textContent = s.flash;
      flashEl.className = 'wf3-demo-flash show';
      const opts = [...optsEl.querySelectorAll('.wf3-demo-opt')];
      opts.forEach((el,i)=>{
        el.textContent = s.opts[i];
        el.className = 'wf3-demo-opt';
      });
      const t1 = setTimeout(()=>{
        if (!alive) return;
        flashEl.className = 'wf3-demo-flash';
      }, 650);
      // Phase 2: Options appear
      const t2 = setTimeout(()=>{
        if (!alive) return;
        opts.forEach(el => el.classList.add('appear'));
      }, 850);
      // Phase 3: Highlight correct
      const t3 = setTimeout(()=>{
        if (!alive) return;
        opts[s.correct].classList.add('correct');
      }, 1650);
      // Phase 4: Reset for next
      const t4 = setTimeout(()=>{
        if (!alive) return;
        opts.forEach(el => el.classList.remove('appear','correct'));
        loop();
      }, 2600);
      activeTimers.push(t1,t2,t3,t4);
    }
    loop();
    // Stop demo when we transition to the game
    instrEl._stopDemo = () => { alive = false; };
  })();

  function showAnnouncement(title, subtitle, icon, onDone) {
    host.innerHTML = `
      <div class="wf-announcement">
        <div class="wf-announce-icon">${icon}</div>
        <div class="wf-announce-title">${title}</div>
        <div class="wf-announce-sub">${subtitle}</div>
      </div>
    `;
    _st(onDone, 1500);
  }

  function heartsHtml() {
    return `<div class="wc-hearts" id="wfHearts">${[0, 1, 2].map(i => `<span class="wc-heart ${i >= lives ? 'lost' : ''} ${(lives === 1 && i === 0) ? 'mm-last' : ''}" data-idx="${i}">${i >= lives ? '💔' : '❤️'}</span>`).join('')}</div>`;
  }

  function gameOver() {
    const acc = q ? Math.round(correctCount / q * 100) : 0;
    const newPB = score > record;
    const speedRow = highestSpeedLabel ? `<div class="row"><span>Speed Reached</span><span class="val">${highestSpeedLabel}</span></div>` : '';
    if (newPB) setS('nz_wf_best', score);
    setS('nz_wf_games', (S('nz_wf_games') || 0) + 1);
    /* Lifetime stats for the new premium start screen */
    if (bestStreak > (S('nz_wf_best_streak') || 0)) setS('nz_wf_best_streak', bestStreak);
    if (highestSpeedLabel) setS('nz_wf_best_speed_label', highestSpeedLabel);
    setS('nz_wf_total_points', (S('nz_wf_total_points') || 0) + score);
    if (newPB) confetti(80);
    end({
      title: newPB ? '🏆 New Best!' : '📝 Word Flash',
      emoji: '📝', sub: `${score} pts · ${q} rounds · ${acc}%`, value: score, points: score>=70?11:score>=40?9:score>=20?7:4, starThresh: [20, 40, 70],
      statsHtml: `<div class="end-stats">
        <div class="row"><span>Score</span><span class="val">${score} pts</span></div>
        <div class="row"><span>Words Seen</span><span class="val">${q}</span></div>
        <div class="row"><span>Accuracy</span><span class="val">${acc}% (${correctCount}/${q})</span></div>
        <div class="row"><span>Fastest Response</span><span class="val">${fastest !== null ? fastest + 'ms' : '—'}</span></div>
        <div class="row"><span>Best Streak</span><span class="val">${bestStreak} 🔥</span></div>
        <div class="row"><span>Type Mode Used</span><span class="val">${typeModeUnlocked ? '✅' : '❌'}</span></div>
        ${speedRow}
        <div class="row"><span>Personal Best</span><span class="val">${Math.max(score, record)}${newPB ? ' 🏆' : ''}</span></div>
      </div>${newPB ? '<div class="rec">🎉 New Personal Best!</div>' : ''}`
    });
  }

  function showCountdown(onDone) {
    let count = 3;
    host.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div id="wfCountdown" style="font-size: 72px; font-weight: 800; color: var(--primary); animation: countPop 0.4s cubic-bezier(.16,1,.3,1);">${count}</div>
        <div style="font-size: 14px; color: var(--text2); margin-top: 12px;">Get ready...</div>
      </div>
    `;
    const numEl = host.querySelector('#wfCountdown');
    function tick() {
      count--;
      if (count > 0) {
        numEl.textContent = count;
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = 'countPop 0.4s cubic-bezier(.16,1,.3,1)';
        activeTimers.push(setTimeout(tick, 600));
      } else {
        numEl.textContent = 'GO!';
        numEl.style.color = '#34D399';
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = 'countPop 0.5s cubic-bezier(.16,1,.3,1)';
        playSound('complete');
        activeTimers.push(setTimeout(onDone, 400));
      }
    }
    activeTimers.push(setTimeout(tick, 600));
  }

  function showAnswerTimeoutBar(durationMs) {
    const existingBar = host.querySelector('#wfAnswerBarWrap');
    if (existingBar) existingBar.remove();
    const wrapBar = document.createElement('div');
    wrapBar.id = 'wfAnswerBarWrap';
    wrapBar.style.cssText = 'height:4px;background:rgba(255,255,255,.1);border-radius:50px;overflow:hidden;margin:10px 20px 0;';
    wrapBar.innerHTML = `<div id="wfAnswerBar" style="height:100%;width:100%;background:linear-gradient(90deg,#EF4444,#F59E0B);border-radius:50px;"></div>`;
    const stage = host.querySelector('.wf-stage');
    if (stage) stage.after(wrapBar);
    const bar = host.querySelector('#wfAnswerBar');
    if (bar) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.transition = `width ${durationMs}ms linear`;
          bar.style.width = '0%';
        });
      });
    }
  }

  function next() {
    if (lives <= 0) { gameOver(); return; }

    if (q > 0 && q % 10 === 0) {
      createMilestoneEffect(q);
      confetti(30);
    }

    const tier = WF_tierForRound(q);
    currentTier = tier;
    // Tier 3 itself counts as a modifier. On periodic late Blink rounds,
    // suppress Decoy so no question ever stacks more than two modifiers.
    const blinkMode = q >= 14 && (tier < 3 || q % 4 === 0);
    const decoy = q >= 9 && !(tier === 3 && blinkMode);

    /* Mode announcements (before showing the round) */
    if (decoy && !decoyAnnounced) {
      decoyAnnounced = true;
      showAnnouncement('🧠 DECOY MODE', 'Two words now! Dono yaad rakho!', '🧠', () => proceedToRound());
      return;
    }
    if (blinkMode && !blinkAnnounced) {
      blinkAnnounced = true;
      showAnnouncement('👁️ BLINK MODE', 'Faster pace, with a fair reading floor.', '👁️', () => proceedToRound());
      return;
    }
    proceedToRound();

    function proceedToRound() {
      if (lives <= 0) { gameOver(); return; }

      const group = takeGroup(tier);
      let words = [group[0]], askSide = 0, group2 = null;
      if (decoy) {
        group2 = takeGroup(tier);
        words = [group[0], group2[0]];
        askSide = Math.random() < 0.5 ? 0 : 1;
      }
      const askGroup = decoy && askSide === 1 ? group2 : group;
      const unaskedGroup = decoy ? (askSide === 1 ? group : group2) : null;
      const askWord = askGroup[0];

      // Type mode is an exact-spelling challenge, so it never stacks with
      // Decoy and never targets words longer than eight characters.
      const typeMode = q >= 4 && !decoy && !blinkMode && askWord.length <= 8 && Math.random() < 0.35;
      currentMode = typeMode ? 'type' : 'select';
      if (typeMode) typeModeUnlocked = true;

      const actualFlashMs = WF_flashDuration(q, words, { blink:blinkMode, type:typeMode });
      currentAskWord = askWord;
      currentFlashMs = actualFlashMs;
      const visibleChars = words.reduce((sum, word) => sum + word.length, 0);
      const label = getSpeedLabel(actualFlashMs, visibleChars);
      const speedOrder = ['🟢 NORMAL','🟡 FAST','🟠 RAPID','🔴 LIGHTNING','⚡ BLINK'];
      if (highestSpeedLabel === '' || speedOrder.indexOf(label) > speedOrder.indexOf(highestSpeedLabel)) {
        highestSpeedLabel = label;
      }

      const modeText = typeMode ? '⌨️ TYPE MODE — Word likho!' : blinkMode ? '👁️ BLINK MODE — Bahut fast!' : '';
      const modeColor = typeMode ? '#F59E0B' : blinkMode ? '#EF4444' : 'var(--primary)';

      /* Streak badge */
      const badge = getStreakBadge(streak);
      const badgeHtml = badge ? `<div class="wf-streak-badge" style="background:${badge.color};box-shadow:0 0 20px ${badge.shadow};">${badge.label}</div>` : '';

      /* Content-relative speed label */
      const roundInfoLabel = `Round ${q + 1} · ${label}${streak >= 3 ? ' · 🔥 x1.5' : ''}${typeMode ? ' · ⌨️ Type' : ''}`;

      host.innerHTML = `
        ${heartsHtml()}
        ${badge ? `<div class="wf-badge-area">${badgeHtml}</div>` : ''}
        <div class="wf-stage">
          <div class="wf-bar"><div class="wf-bar-fill" id="wfBar"></div></div>
          ${modeText ? `<div style="font-size: 11px; font-weight: 700; color: ${modeColor}; margin-bottom: 8px; letter-spacing: 0.08em;">${modeText}</div>` : ''}
          <div class="wf-words" id="wfWords">${words.map((w, wi) => `
            <div class="wf-word${blinkMode ? ' wf-word-blink' : ''}" data-side="${wi}" style="font-size: ${decoy ? '28px' : '52px'}; 
              animation: wordFlashIn 0.3s cubic-bezier(.16,1,.3,1) ${wi * 0.08}s both;
              text-shadow: 0 0 30px rgba(167,139,250,0.3), 0 0 60px rgba(79,142,247,0.15);
              letter-spacing: 0.15em; font-weight: 800;">${w}</div>
          `).join('')}</div>
          ${decoy ? '<div style="font-size: 11px; color: rgba(255,255,255,.7); margin-top: 14px; letter-spacing: 0.1em; font-weight: 700;">🧠 DECOY MODE — DONO YAAD RAKHO!</div>' : ''}
        </div>
        <div style="text-align: center; font-size: 13px; color: var(--text2); margin-top: 12px; font-weight: 500;">
          ${roundInfoLabel}
        </div>
      `;

      const bar = host.querySelector('#wfBar');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (bar) {
            bar.style.transition = `width ${actualFlashMs}ms linear`;
            bar.style.width = '0%';
          }
        });
      });

      /* Warning glow at 75% of the flash duration */
      if (blinkMode) {
        const warnTimer = setTimeout(() => {
          const wordsEl = host.querySelector('#wfWords');
          if (wordsEl) {
            wordsEl.querySelectorAll('.wf-word').forEach(el => {
              el.classList.add('wf-word-warning');
            });
          }
        }, Math.round(actualFlashMs * 0.75));
        activeTimers.push(warnTimer);
      }

      const flashEndTimer = setTimeout(() => {
        const wordsEl = host.querySelector('#wfWords');
        if (wordsEl) {
          wordsEl.style.transition = 'all 0.25s ease';
          wordsEl.style.opacity = '0';
          wordsEl.style.transform = 'scale(0.8) rotateX(20deg)';
        }
        activeTimers.push(setTimeout(() => {
          if (typeMode) {
            showTypeMode(askWord, askGroup, decoy, askSide);
          } else {
            showSelectMode(askWord, askGroup, unaskedGroup, decoy, askSide);
          }
        }, 280));
      }, actualFlashMs);
      activeTimers.push(flashEndTimer);
    }
  }

  function showSelectMode(askWord, askGroup, unaskedGroup, decoy, askSide) {
    const opts = WF_decoyOptions(askGroup, unaskedGroup).sort(() => Math.random() - .5);
    const askTs = Date.now();
    answerTimedOut = false;

    /* Badge */
    const badge = getStreakBadge(streak);
    const badgeHtml = badge ? `<div class="wf-streak-badge" style="background:${badge.color};box-shadow:0 0 20px ${badge.shadow};">${badge.label}</div>` : '';

    host.innerHTML = `
      ${heartsHtml()}
      ${badge ? `<div class="wf-badge-area">${badgeHtml}</div>` : ''}
      <div class="wf-stage" style="padding: 22px 16px; animation: fadeInUp 0.3s ease;">
        <div class="wf-word" style="font-size: 56px; animation: questionPulse 1.5s ease-in-out infinite;">?</div>
        ${decoy ? `<div style="font-size: 13px; color: #A78BFA; font-weight: 700; margin-bottom: 10px; animation: fadeInUp 0.4s ease 0.1s both;">${askSide === 0 ? '⬅ LEFT' : 'RIGHT ➡'} wala word kaunsa tha?</div>` : ''}
        <div style="font-size: 12px; color: var(--text2); margin-top: 8px;">Correct word choose karo</div>
      </div>
      <div class="word-opts" id="wOpts" style="margin-top: 16px;"></div>
      <div style="text-align: center; font-size: 13px; color: var(--text2); margin-top: 10px; font-weight: 500;">
        Round ${q + 1}${streak >= 3 ? ' · 🔥 STREAK x1.5' : ''}
      </div>
    `;
    const optsEl = host.querySelector('#wOpts');
    opts.forEach((w, idx) => {
      const b = $(`<button class="word-opt" data-w="${w}" style="animation: fadeInUp 0.35s ease ${idx * 0.08}s both;">${w}</button>`);
      b.onclick = (e) => handleAnswer(w === askWord, b, optsEl, askWord, askTs, e);
      optsEl.appendChild(b);
    });

    const answerMs = WF_answerDuration(opts);
    showAnswerTimeoutBar(answerMs);
    if (answerTimeout) clearTimeout(answerTimeout);
    answerTimeout = setTimeout(() => {
      if (!answerTimedOut) {
        answerTimedOut = true;
        toast('⏱️ Too slow!');
        playSound('wrong');
        handleTimeout(askWord, optsEl, askTs);
      }
    }, answerMs);
  }

  function showTypeMode(askWord, askGroup, decoy, askSide) {
    const askTs = Date.now();
    answerTimedOut = false;
    let typedText = '';
    const displayWord = askWord;

    /* Badge */
    const badge = getStreakBadge(streak);
    const badgeHtml = badge ? `<div class="wf-streak-badge" style="background:${badge.color};box-shadow:0 0 20px ${badge.shadow};">${badge.label}</div>` : '';

    host.innerHTML = `
      ${heartsHtml()}
      ${badge ? `<div class="wf-badge-area">${badgeHtml}</div>` : ''}
      <div class="wf-stage" style="padding: 22px 16px; animation: fadeInUp 0.3s ease;">
        <div style="font-size: 13px; color: #F59E0B; font-weight: 700; margin-bottom: 10px; letter-spacing: 0.1em;">⌨️ TYPE THE WORD</div>
        ${decoy ? `<div style="font-size: 13px; color: #A78BFA; font-weight: 600; margin-bottom: 10px;">${askSide === 0 ? '⬅ LEFT' : 'RIGHT ➡'} wala word type karo</div>` : ''}
        <div id="typeDisplay" style="font-size: 42px; font-weight: 800; color: var(--text); min-height: 56px; letter-spacing: 0.2em; font-family: monospace;">_</div>
        <input type="text" id="typeInput" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"
          style="width: 100%; max-width: 280px; margin-top: 14px; padding: 14px 18px; font-size: 20px; font-weight: 700; text-align: center;
          letter-spacing: 0.25em; border: 2px solid rgba(167,139,250,0.4); border-radius: 14px; background: var(--card); color: var(--text);
          outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: monospace; caret-color: var(--primary);"
          placeholder="Type here..." maxlength="${displayWord.length}">
        <div style="font-size: 12px; color: var(--text2); margin-top: 10px;">Yaha type karo 👆</div>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;" id="typeHint"></div>
      <div style="text-align: center; font-size: 13px; color: var(--text2); margin-top: 10px; font-weight: 500;">
        Round ${q + 1}${streak >= 3 ? ' · 🔥 STREAK x1.5' : ''}
      </div>
    `;

    const typeDisplay = host.querySelector('#typeDisplay');
    const typeInput = host.querySelector('#typeInput');
    const typeHint = host.querySelector('#typeHint');

    // Auto-focus input after a short delay (to let render complete)
    activeTimers.push(setTimeout(() => {
      if (typeInput) typeInput.focus();
    }, 100));

    // Re-focus if user taps anywhere on the stage
    const stageEl = host.querySelector('.wf-stage');
    if (stageEl) {
      stageEl.addEventListener('click', () => {
        if (typeInput) typeInput.focus();
      });
    }

    // Show letter count hint
    for (let i = 0; i < displayWord.length; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width: 36px; height: 44px; border: 2px solid rgba(167,139,250,0.3);
        border-radius: 8px; display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 700; color: var(--text); transition: all 0.2s;
      `;
      slot.id = `typeSlot_${i}`;
      typeHint.appendChild(slot);
    }

    function updateDisplay() {
      const val = typeInput.value.toUpperCase();
      let html = '';
      for (let i = 0; i < displayWord.length; i++) {
        if (i < val.length) {
          html += `<span style="color: ${val[i] === displayWord[i] ? '#34D399' : '#EF4444'};">${val[i]}</span>`;
        } else {
          html += '<span style="color: rgba(167,139,250,0.3);">_</span>';
        }
      }
      typeDisplay.innerHTML = html;

      for (let i = 0; i < displayWord.length; i++) {
        const slot = host.querySelector(`#typeSlot_${i}`);
        if (slot) {
          if (i < val.length) {
            slot.textContent = val[i];
            slot.style.borderColor = val[i] === displayWord[i] ? '#34D399' : '#EF4444';
            slot.style.background = val[i] === displayWord[i] ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)';
          } else {
            slot.textContent = '';
            slot.style.borderColor = 'rgba(167,139,250,0.3)';
            slot.style.background = 'transparent';
          }
        }
      }
    }

    function submitAnswer() {
      if (answerTimedOut) return;
      const val = typeInput.value.toUpperCase().trim();
      if (!val) return;
      if (answerTimeout) { clearTimeout(answerTimeout); answerTimeout = null; }
      const isCorrect = val === displayWord;
      const fakeBtn = document.createElement('button');
      fakeBtn.style.display = 'none';
      handleAnswer(isCorrect, fakeBtn, null, askWord, askTs, null);
    }

    // Listen to input changes (works with both virtual and physical keyboards)
    typeInput.addEventListener('input', () => {
      if (answerTimedOut) return;
      // Force uppercase
      typeInput.value = typeInput.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (typeInput.value.length > displayWord.length) {
        typeInput.value = typeInput.value.slice(0, displayWord.length);
      }
      updateDisplay();
      playSound('tap');
      // Auto-submit when all letters are filled
      if (typeInput.value.length === displayWord.length) {
        activeTimers.push(setTimeout(submitAnswer, 200));
      }
    });

    // Handle Enter key on physical keyboard
    typeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      }
    });

    // Handle keyboard for backspace etc.
    const keyHandler = (e) => {
      if (e.key === 'Backspace') {
        // Let the default backspace work through input event
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      }
    };
    document.addEventListener('keydown', keyHandler);
    host._keyHandler = keyHandler;
    host._typeInput = typeInput;

    const answerMs = WF_answerDuration([askWord], true);
    showAnswerTimeoutBar(answerMs);
    if (answerTimeout) clearTimeout(answerTimeout);
    answerTimeout = setTimeout(() => {
      if (!answerTimedOut) {
        answerTimedOut = true;
        toast('⏱️ Too slow!');
        playSound('wrong');
        handleTimeout(askWord, null, askTs);
      }
    }, answerMs);
  }

  function showWordReveal(askWord) {
    const stage = host.querySelector('.wf-stage');
    if (!stage) return;
    const old = host.querySelector('.wf-answer-reveal');
    if (old) old.remove();
    const reveal = document.createElement('div');
    reveal.className = 'wf-answer-reveal';
    reveal.innerHTML = `Word was <strong>${askWord}</strong>`;
    stage.appendChild(reveal);
  }

  function handleTimeout(askWord, optsEl, askTs) {
    if (host._keyHandler) {
      document.removeEventListener('keydown', host._keyHandler);
      host._keyHandler = null;
    }
    const ms = Date.now() - askTs;
    streak = 0;
    haptic([30, 50, 30]);

    if (optsEl) {
      optsEl.querySelectorAll('.word-opt').forEach(bb => bb.disabled = true);
    }

    /* Highlight correct answer */
    if (optsEl) {
      optsEl.querySelectorAll('.word-opt').forEach(bb => {
        if (bb.dataset.w === askWord) bb.classList.add('wf-correct');
      });
    } else {
      const typeDisplay = host.querySelector('#typeDisplay');
      if (typeDisplay) {
        typeDisplay.innerHTML = `<span style="color: #34D399;">${askWord}</span>`;
      }
    }
    showWordReveal(askWord);

    shakeScreen(wrap);

    const heartsContainer = host.querySelector('#wfHearts');
    if (heartsContainer) {
      const heartToLose = heartsContainer.querySelector(`.wc-heart:not(.lost)[data-idx="${lives - 1}"]`);
      if (heartToLose) animateHeartLoss(heartToLose);
    }

    lives--;
    const wrapBar = host.querySelector('#wfAnswerBarWrap');
    if (wrapBar) wrapBar.remove();

    q++;
    activeTimers.push(setTimeout(next, 1200));
  }

  function handleAnswer(isCorrect, b, optsEl, askWord, askTs, event) {
    if (answerTimeout) { clearTimeout(answerTimeout); answerTimeout = null; }
    if (answerTimedOut) return;
    answerTimedOut = true;

    if (host._keyHandler) {
      document.removeEventListener('keydown', host._keyHandler);
      host._keyHandler = null;
    }

    if (optsEl) {
      optsEl.querySelectorAll('.word-opt').forEach(bb => bb.disabled = true);
    }
    const ms = Date.now() - askTs;

    /* Remove answer bar */
    const wrapBar = host.querySelector('#wfAnswerBarWrap');
    if (wrapBar) wrapBar.remove();

    if (isCorrect) {
      playSound('correct'); correctCount++;
      const fast = ms < 500;
      if (fastest === null || ms < fastest) fastest = ms;
      let pts = fast ? 3 : 2;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      if (streak === 3) showCombo('+STREAK BONUS x1.5');
      if (streak >= 3) pts = Math.round(pts * 1.5);
      if (fast) showCombo('⚡ SPEED DEMON!');
      score += pts;
      setScore(score);

      if (b && b.style) b.classList.add('wf-correct');

      if (event) {
        const rect = event.target.getBoundingClientRect();
        createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
        showFloatingText(rect.left + rect.width / 2, rect.top, `+${pts}`, '#34D399');
      } else {
        const stage = host.querySelector('.wf-stage');
        if (stage) {
          const rect = stage.getBoundingClientRect();
          createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
          showFloatingText(rect.left + rect.width / 2, rect.top, `+${pts}`, '#34D399');
        }
      }

      q++;
      activeTimers.push(setTimeout(next, 700));
    } else {
      playSound('wrong');
      streak = 0;
      haptic([30, 50, 30]);

      if (b && b.style) {
        b.classList.add('wf-wrong');
        /* Streak badge break animation */
        const badgeEl = host.querySelector('.wf-streak-badge');
        if (badgeEl) {
          badgeEl.classList.add('wf-streak-broken');
          setTimeout(() => badgeEl.remove(), 600);
        }
      }

      /* Highlight and reveal the correct answer on a miss */
      if (optsEl) {
        optsEl.querySelectorAll('.word-opt').forEach(bb => {
          if (bb.dataset.w === askWord) bb.classList.add('wf-correct');
        });
      } else {
        const typeDisplay = host.querySelector('#typeDisplay');
        if (typeDisplay) {
          const inputVal = host._typeInput ? host._typeInput.value.toUpperCase() : '';
          typeDisplay.innerHTML = `<span style="color: #EF4444; text-decoration: line-through;">${inputVal || '?'}</span> <span style="color: #34D399;">${askWord}</span>`;
        }
      }
      showWordReveal(askWord);

      shakeScreen(wrap);

      const heartsContainer = host.querySelector('#wfHearts');
      if (heartsContainer) {
        const heartToLose = heartsContainer.querySelector(`.wc-heart:not(.lost)[data-idx="${lives - 1}"]`);
        if (heartToLose) animateHeartLoss(heartToLose);
      }

      lives--;
      toast('💔 -1 Life');

      if (event) {
        const rect = event.target.getBoundingClientRect();
        showFloatingText(rect.left + rect.width / 2, rect.top, '❌', '#EF4444');
      }

      q++;
      activeTimers.push(setTimeout(next, currentMode === 'type' ? 1500 : 1300));
    }
  }

  /* Test-only state view used by the jsdom full-run probe. The production
     app never defines this object. */
  if (window.__WORDFLASH_TEST__) {
    Object.assign(window.__WORDFLASH_TEST__, {
      getState: () => ({
        q, score, streak, lives, currentMode, currentAskWord,
        currentFlashMs, currentTier, answerTimedOut,
      }),
    });
  }

  instrEl.querySelector('#wfStart').onclick = () => {
    if (instrEl._stopDemo) instrEl._stopDemo();
    instrEl.remove();
    startClock && startClock();
    showCountdown(() => next());
  };
}
