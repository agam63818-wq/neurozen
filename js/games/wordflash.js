/* ===================== WORD FLASH (endless) v2 ===================== */
const WF_T1=[
  ['CALM','CLAM','COAL','CALF'],['FORM','FROM','FORT','FOAM'],
  ['SALT','SLAT','SLOT','SILT'],['WORD','WARD','WARM','CORD'],
  ['MILE','LIME','MINE','MICE'],['TIDE','TIED','DIET','EDIT'],
  ['STAR','RATS','SCAR','STIR'],['LOOP','POOL','POLO','LOOT'],
  ['BEAR','BARE','BEAD','BEAN'],['PALE','PEAL','PLEA','PALM'],
  ['DEAL','LEAD','DEAR','DENT'],['NOTE','TONE','NONE','NODE'],
  ['GAME','MAGE','GATE','GAZE'],['RICE','RACE','RIPE','RIDE'],
  ['SAND','SEND','BAND','SANE'],['WIND','WING','WINE','WIDE'],
  ['FIRE','FARE','FILE','FIVE'],['BALL','BELL','BILL','BULL'],
  ['CARE','CORE','CURE','CART'],['DATE','GATE','HATE','FATE'],
  ['EARN','EAST','EASY','EDGE'],['FACE','FACT','FAIL','FAIR'],
  ['GAIN','GAVE','GEAR','GIFT'],['HAND','HANG','HARD','HARM'],
  ['ICE','ACE','ACT','AGE'],['KING','KIND','KICK','KEEP'],
  ['LAMP','LAME','LAND','LANE'],['MAZE','MAZE','MARE','MATE'],
  ['NEST','NEWS','NEXT','NEAT'],['OPEN','OVEN','OVER','OWN'],
  ['PACE','PACK','PAGE','PAID'],['QUIT','QUIZ','QUAD','QUICK'],
  ['RAIN','RAIL','RAID','RING'],['SAFE','SAIL','SALE','SAME'],
  ['TEAM','TEAR','TELL','TENT'],['UNIT','UPON','USED','USER'],
  ['VAST','VOTE','VIEW','VINE'],['WASH','WAVE','WEAR','WEEK'],
  ['YARD','YARN','YEAR','YELL'],['ZERO','ZONE','ZOOM','ZEAL'],
  ['BARK','DARK','MARK','PARK'],['COLD','BOLD','FOLD','GOLD'],
  ['EACH','ECHO','EDGE','ELSE'],['FAST','FEAR','FEED','FEEL'],
  ['GOAL','GOAT','GOLD','GOOD'],['HOLD','HOLE','HOLY','HOME'],
  ['IRON','ISLAND','ITEM','IDEA'],['JUMP','JOIN','JUST','JOKE'],
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
  ['POSE','PROSE','POISE','PURSE'],['NIGHT','RIGHT','NIGHTLY','MIGHT'],
  ['THROUGH','TROUGH','THOROUGH','THOUGHT'],['PRECEDE','PROCEED','PRESIDE','PRECISE'],
  ['DESSERT','DESERTS','DISSENT','DISSECT'],['CONVERSE','CONSERVE','CONVERGE','CONVEYED'],
  ['ADAPTER','ADOPTER','ADAPTED','ADOPTED'],['LATERAL','LITERAL','LITERARY','LITERATE'],
  ['EMINENT','IMMINENT','EMIGRANT','ELEGANT'],['CRYSTAL','CRUCIAL','CYNICAL','CLINICAL'],
  ['PERSIST','PERSUADE','PERSPIRE','PERSONAL'],['DECLINE','DECLARE','DECIMAL','DECLAIM'],
  ['ILLUSION','ALLUSION','ELUSION','EVASION'],['STATIONARY','STATIONERY','STATIONS','SITUATION'],
  ['ACCEPT','EXCEPT','EXPECT','ACCESS'],['AFFECT','EFFECT','AFFLICT','EFFORT'],
  ['PRINCIPAL','PRINCIPLE','PRINCESS','PRINTING'],['COMPLEMENT','COMPLIMENT','COMPONENT','COMPLETE'],
  ['BLOOM','BROOM','BLOOM','BROOK'],['CHARM','CHART','CHASE','CHAIN'],
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
  ['THROUGH','TROUGH','THOROUGH','THOUGHT'],['PRECEDE','PROCEED','PRESIDE','PRECISE'],
  ['DESSERT','DESERTS','DISSENT','DISSECT'],['CONVERSE','CONSERVE','CONVERGE','CONVEYED'],
  ['ADAPTER','ADOPTER','ADAPTED','ADOPTED'],['LATERAL','LITERAL','LITERARY','LITERATE'],
  ['EMINENT','IMMINENT','EMIGRANT','ELEGANT'],['CRYSTAL','CRUCIAL','CYNICAL','CLINICAL'],
  ['PERSIST','PERSUADE','PERSPIRE','PERSONAL'],['DECLINE','DECLARE','DECIMAL','DECLAIM'],
  ['ILLUSION','ALLUSION','ELUSION','EVASION'],['STATIONARY','STATIONERY','STATIONS','SITUATION'],
  ['ACCEPT','EXCEPT','EXPECT','ACCESS'],['AFFECT','EFFECT','AFFLICT','EFFORT'],
  ['PRINCIPAL','PRINCIPLE','PRINCESS','PRINTING'],['COMPLEMENT','COMPLIMENT','COMPONENT','COMPLETE'],
  ['ACKNOWLEDGE','ACQUAINTANCE','ACQUISITION','ACCELERATE'],['APPROPRIATE','APPROXIMATE','APPRECIATE','APPEARANCE'],
  ['BEAUTIFUL','BENEFICIAL','BELONGINGS','BELLIGERENT'],['CALCULATE','CALENDAR','CAMPAIGN','CANDIDATE'],
  ['DEFINITELY','DEFICIENT','DELIBERATE','DEMOCRATIC'],['EDUCATION','EFFECTIVE','EFFICIENT','ELABORATE'],
  ['FASCINATE','FAVORITE','FEASIBLE','FICTITIOUS'],['GENERALLY','GENERATE','GENEROUS','GENUINELY'],
  ['HESITATE','HERITAGE','HIGHLIGHT','HINDRANCE'],['IDENTICAL','IDENTIFY','IGNORANT','ILLUSTRATE'],
  ['JUDGMENT','JUSTIFY','JUBILANT','JURISDICTION'],['KNOWLEDGE','KNUCKLE','KIDNAPPER','KINDERGARTEN'],
  ['LABORATORY','LEGITIMATE','LIABILITY','LITERATURE'],['MAGNIFICENT','MAINTENANCE','MANIFESTO','MANUFACTURE'],
  ['NECESSARY','NEGOTIATE','NEUTRAL','NOMINATE'],['OBJECTIVE','OBSTACLE','OCCASION','OFFENSIVE'],
  ['PARAGRAPH','PARTICULAR','PASSENGER','PERCENTAGE'],['QUALIFIED','QUANTITY','QUESTIONNAIRE','QUINTESSENTIAL'],
  ['REALISTIC','REASONABLE','RECIPIENT','RECOMMEND'],['SACRIFICE','SATISFACTION','SCENARIO','SCHEDULE'],
  ['TECHNIQUE','TEMPORARY','TENDENCY','TERRITORY'],['ULTIMATUM','UNANIMOUS','UNDERSTAND','UNIVERSITY'],
  ['VAGUENESS','VALIDATE','VARIATION','VEGETABLE'],['WITHDRAW','WITHSTAND','WITNESS','WONDERFUL'],
  ['XENOPHOBIA','XENOLITH','XEROX','XENOGENY'],['YESTERDAY','YIELDING','YOUNGSTER','YESTERYEAR'],
  ['ZEALOUSLY','ZIGZAGGED','ZOOLOGIST','ZESTFULLY']
];

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

/* Speed label helper */
function getSpeedLabel(ms) {
  if (ms >= 1000) return '🟢 NORMAL';
  if (ms >= 700) return '🟡 FAST';
  if (ms >= 500) return '🟠 RAPID';
  if (ms >= 300) return '🔴 LIGHTNING';
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

    const tier = q < 5 ? 1 : q < 11 ? 2 : 3;
    /* PROBLEM 1 — New humane timing curve */
    const flashMs = Math.max(450, 1400 - q * 25);
    const decoy = q >= 7;
    const blinkMode = q >= 15;
    const typeMode = q >= 5 && Math.random() < 0.35;
    currentMode = typeMode ? 'type' : 'select';
    if (typeMode) typeModeUnlocked = true;

    const blinkFlashMs = blinkMode ? Math.max(280, flashMs * 0.6) : flashMs;
    let actualFlashMs = typeMode ? Math.max(550, blinkFlashMs * 1.3) : blinkFlashMs;

    /* Decoy mode: more time since brain tracks two words */
    if (decoy) {
      actualFlashMs = Math.round(actualFlashMs * (blinkMode ? 1.5 : 1.3));
    }

    /* Track highest speed label for end screen */
    const label = getSpeedLabel(actualFlashMs);
    if (highestSpeedLabel === '' || ['🟢 NORMAL','🟡 FAST','🟠 RAPID','🔴 LIGHTNING','⚡ BLINK'].indexOf(label) > ['🟢 NORMAL','🟡 FAST','🟠 RAPID','🔴 LIGHTNING','⚡ BLINK'].indexOf(highestSpeedLabel)) {
      highestSpeedLabel = label;
    }

    /* IMPROVEMENT 4 — Mode announcements (before showing the round) */
    if (decoy && !decoyAnnounced && q === 7) {
      decoyAnnounced = true;
      showAnnouncement('🧠 DECOY MODE', 'Two words now! Dono yaad rakho!', '🧠', () => proceedToRound());
      return;
    }
    if (blinkMode && !blinkAnnounced && q === 15) {
      blinkAnnounced = true;
      showAnnouncement('👁️ BLINK MODE', 'Words flash even faster. Stay focused!', '👁️', () => proceedToRound());
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
      const askWord = askGroup[0];

      const modeText = typeMode ? '⌨️ TYPE MODE — Word likho!' : blinkMode ? '👁️ BLINK MODE — Bahut fast!' : '';
      const modeColor = typeMode ? '#F59E0B' : blinkMode ? '#EF4444' : 'var(--primary)';

      /* Streak badge */
      const badge = getStreakBadge(streak);
      const badgeHtml = badge ? `<div class="wf-streak-badge" style="background:${badge.color};box-shadow:0 0 20px ${badge.shadow};">${badge.label}</div>` : '';

      /* PROBLEM 2 — Speed label instead of raw ms */
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

      /* PROBLEM 3 — Warning glow at 75% of flash duration (blink mode) */
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
            showSelectMode(askWord, askGroup, decoy, askSide);
          }
        }, 280));
      }, actualFlashMs);
      activeTimers.push(flashEndTimer);
    }
  }

  function showSelectMode(askWord, askGroup, decoy, askSide) {
    const opts = [...askGroup].sort(() => Math.random() - .5);
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

    /* Answer timeout — 6 seconds to answer */
    if (answerTimeout) clearTimeout(answerTimeout);
    answerTimeout = setTimeout(() => {
      if (!answerTimedOut) {
        answerTimedOut = true;
        toast('⏱️ Too slow!');
        playSound('wrong');
        handleTimeout(askWord, optsEl, askTs);
      }
    }, 6000);
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

    /* Answer timeout — 6 seconds */
    if (answerTimeout) clearTimeout(answerTimeout);
    answerTimeout = setTimeout(() => {
      if (!answerTimedOut) {
        answerTimedOut = true;
        toast('⏱️ Too slow!');
        playSound('wrong');
        handleTimeout(askWord, null, askTs);
      }
    }, 6000);
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
        /* IMPROVEMENT 6 — Streak badge break animation */
        const badgeEl = host.querySelector('.wf-streak-badge');
        if (badgeEl) {
          badgeEl.classList.add('wf-streak-broken');
          setTimeout(() => badgeEl.remove(), 600);
        }
      }

      /* IMPROVEMENT 6 — Highlight correct answer on wrong pick */
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
      activeTimers.push(setTimeout(next, typeModeUnlocked && currentMode === 'type' ? 1200 : 900));
    }
  }

  instrEl.querySelector('#wfStart').onclick = () => {
    if (instrEl._stopDemo) instrEl._stopDemo();
    instrEl.remove();
    startClock && startClock();
    showCountdown(() => next());
  };
}
