/* ===================== WORD FLASH (endless) ===================== */
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

function playWordFlash(body, setScore, end, wrap, startClock) {
  let q = 0, score = 0, streak = 0, bestStreak = 0, fastest = null, correctCount = 0, lives = 3;
  let typeModeUnlocked = false, currentMode = 'select'; // 'select' or 'type'
  const record = S('nz_wf_best') || 0;

  // shuffled, recycling pools
  const pools = { 1: [...WF_T1].sort(() => Math.random() - .5), 2: [...WF_T2].sort(() => Math.random() - .5), 3: [...WF_T3].sort(() => Math.random() - .5) };
  const used = { 1: 0, 2: 0, 3: 0 };
  function takeGroup(tier) { const p = pools[tier]; const g = p[used[tier] % p.length]; used[tier]++; if (used[tier] % p.length === 0) p.sort(() => Math.random() - .5); return g; }

  const instrEl = $(`<div class="instr" style="margin-bottom: 14px;">
    <strong style="font-size: 20px;">Word Flash ♾️</strong><br>
    <div style="font-size: 13px; color: var(--text2); line-height: 1.6; margin-top: 8px;">
      Word ek flash mein dikhega — distractors bilkul similar honge!<br>
      <span style="color: var(--primary); font-weight: 600;">Endless:</span> jab tak 3 lives hain khelte raho.
    </div>
    <div style="margin-top: 10px; padding: 10px 14px; background: rgba(167,139,250,0.1); border-radius: 10px; font-size: 12px; color: var(--text2);">
      <span style="color: var(--primary); font-weight: 700;">🎯 NEW:</span> Type Mode (Round 5+), Blink Mode (Round 12+), Milestone Celebrations!
    </div>
    <div style="margin-top: 8px; font-size: 11px; color: var(--primary);">
      ⚡ &lt;500ms = bonus · ❌ galat = -1 life · 🔥 Streak = x1.5
    </div>
    ${record ? `<div style="margin-top: 10px; font-size: 14px; font-weight: 700; color: var(--mint); padding: 6px 12px; background: rgba(52,211,153,0.1); border-radius: 8px; display: inline-block;">🏆 Best: ${record} pts</div>` : ''}
    <br>
    <button style="margin-top: 14px; padding: 14px 32px; background: var(--grad); color: #fff; border-radius: 14px; font-weight: 700; font-size: 16px; box-shadow: var(--shadow); transition: transform 0.2s;" id="wfStart" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">▶ Start Game</button>
  </div>`);
  body.appendChild(instrEl);
  const host = $(`<div></div>`);
  body.appendChild(host);

  function heartsHtml() {
    return `<div class="wc-hearts" id="wfHearts">${[0, 1, 2].map(i => `<span class="wc-heart ${i >= lives ? 'lost' : ''} ${(lives === 1 && i === 0) ? 'mm-last' : ''}" data-idx="${i}">${i >= lives ? '💔' : '❤️'}</span>`).join('')}</div>`;
  }

  function gameOver() {
    const acc = q ? Math.round(correctCount / q * 100) : 0;
    const newPB = score > record;
    if (newPB) setS('nz_wf_best', score);
    setS('nz_wf_games', (S('nz_wf_games') || 0) + 1);
    if (newPB) confetti(80);
    end({
      title: newPB ? '🏆 New Best!' : '📝 Word Flash',
      emoji: '📝', sub: `${score} pts · ${q} rounds · ${acc}%`, value: score, points: Math.max(2, score * 0.7), starThresh: [20, 40, 70],
      statsHtml: `<div class="end-stats">
        <div class="row"><span>Score</span><span class="val">${score} pts</span></div>
        <div class="row"><span>Rounds Survived</span><span class="val">${q}</span></div>
        <div class="row"><span>Accuracy</span><span class="val">${acc}% (${correctCount}/${q})</span></div>
        <div class="row"><span>Fastest Response</span><span class="val">${fastest !== null ? fastest + 'ms' : '—'}</span></div>
        <div class="row"><span>Longest Streak</span><span class="val">${bestStreak} 🔥</span></div>
        <div class="row"><span>Type Mode Used</span><span class="val">${typeModeUnlocked ? '✅' : '❌'}</span></div>
        <div class="row"><span>Personal Best</span><span class="val">${Math.max(score, record)}${newPB ? ' 🏆' : ''}</span></div>
      </div>${newPB ? '<div class="rec">🎉 New Personal Best!</div>' : ''}`
    });
  }

  // Countdown before showing word
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
        _st(tick, 600);
      } else {
        numEl.textContent = 'GO!';
        numEl.style.color = '#34D399';
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = 'countPop 0.5s cubic-bezier(.16,1,.3,1)';
        playSound('complete');
        _st(onDone, 400);
      }
    }
    _st(tick, 600);
  }

  function next() {
    if (lives <= 0) { gameOver(); return; }

    // Milestone celebration every 10 rounds
    if (q > 0 && q % 10 === 0) {
      createMilestoneEffect(q);
      confetti(30);
    }

    // Determine difficulty parameters
    const tier = q < 5 ? 1 : q < 11 ? 2 : 3;
    const flashMs = Math.max(280, 900 - q * 35);
    const decoy = q >= 7;
    const blinkMode = q >= 12; // Ultra-fast flash
    const typeMode = q >= 5 && Math.random() < 0.35; // 35% chance after round 5
    currentMode = typeMode ? 'type' : 'select';
    if (typeMode) typeModeUnlocked = true;

    const blinkFlashMs = blinkMode ? Math.max(150, flashMs * 0.4) : flashMs;
    const actualFlashMs = typeMode ? Math.max(350, blinkFlashMs * 1.2) : blinkFlashMs;

    const group = takeGroup(tier);
    let words = [group[0]], askSide = 0, group2 = null;
    if (decoy) {
      group2 = takeGroup(tier);
      words = [group[0], group2[0]];
      askSide = Math.random() < 0.5 ? 0 : 1;
    }
    const askGroup = decoy && askSide === 1 ? group2 : group;
    const askWord = askGroup[0];

    // Mode indicator text
    const modeText = typeMode ? '⌨️ TYPE MODE — Word likho!' : blinkMode ? '👁️ BLINK MODE — Bahut fast!' : '';
    const modeColor = typeMode ? '#F59E0B' : blinkMode ? '#EF4444' : 'var(--primary)';

    host.innerHTML = `
      ${heartsHtml()}
      <div class="wf-stage">
        <div class="wf-bar"><div class="wf-bar-fill" id="wfBar"></div></div>
        ${modeText ? `<div style="font-size: 11px; font-weight: 700; color: ${modeColor}; margin-bottom: 8px; letter-spacing: 0.08em;">${modeText}</div>` : ''}
        <div class="wf-words" id="wfWords">${words.map((w, wi) => `
          <div class="wf-word" data-side="${wi}" style="font-size: ${decoy ? '28px' : '52px'}; 
            animation: wordFlashIn 0.3s cubic-bezier(.16,1,.3,1) ${wi * 0.08}s both;
            text-shadow: 0 0 30px rgba(167,139,250,0.3), 0 0 60px rgba(79,142,247,0.15);
            letter-spacing: 0.15em; font-weight: 800;">${w}</div>
        `).join('')}</div>
        ${decoy ? '<div style="font-size: 11px; color: rgba(255,255,255,.7); margin-top: 14px; letter-spacing: 0.1em; font-weight: 700;">🧠 DECOY MODE — DONO YAAD RAKHO!</div>' : ''}
      </div>
      <div style="text-align: center; font-size: 13px; color: var(--text2); margin-top: 12px; font-weight: 500;">
        Round ${q + 1} · ${actualFlashMs}ms flash${streak >= 3 ? ' · 🔥 x1.5' : ''}${typeMode ? ' · ⌨️ Type' : ''}
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

    _st(() => {
      // Fade out word with flip effect
      const stage = host.querySelector('.wf-stage');
      const wordsEl = host.querySelector('#wfWords');
      if (wordsEl) {
        wordsEl.style.transition = 'all 0.25s ease';
        wordsEl.style.opacity = '0';
        wordsEl.style.transform = 'scale(0.8) rotateX(20deg)';
      }
      if (stage) stage.style.transition = 'opacity .2s';
      _st(() => {
        // TYPE MODE: user types the word
        if (typeMode) {
          showTypeMode(askWord, askGroup, decoy, askSide);
        } else {
          showSelectMode(askWord, askGroup, decoy, askSide);
        }
      }, 280);
    }, actualFlashMs);
  }

  function showSelectMode(askWord, askGroup, decoy, askSide) {
    const opts = [...askGroup].sort(() => Math.random() - .5);
    const askTs = Date.now();
    host.innerHTML = `
      ${heartsHtml()}
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
  }

  function showTypeMode(askWord, askGroup, decoy, askSide) {
    const askTs = Date.now();
    let typedText = '';
    const displayWord = askWord;

    host.innerHTML = `
      ${heartsHtml()}
      <div class="wf-stage" style="padding: 22px 16px; animation: fadeInUp 0.3s ease;">
        <div style="font-size: 13px; color: #F59E0B; font-weight: 700; margin-bottom: 10px; letter-spacing: 0.1em;">⌨️ TYPE THE WORD</div>
        ${decoy ? `<div style="font-size: 13px; color: #A78BFA; font-weight: 600; margin-bottom: 10px;">${askSide === 0 ? '⬅ LEFT' : 'RIGHT ➡'} wala word type karo</div>` : ''}
        <div id="typeDisplay" style="font-size: 42px; font-weight: 800; color: var(--text); min-height: 56px; letter-spacing: 0.2em; font-family: monospace;">_</div>
        <div style="font-size: 12px; color: var(--text2); margin-top: 10px;">Word type karo aur Enter dabao</div>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;" id="typeHint"></div>
      <div style="text-align: center; font-size: 13px; color: var(--text2); margin-top: 10px; font-weight: 500;">
        Round ${q + 1}${streak >= 3 ? ' · 🔥 STREAK x1.5' : ''}
      </div>
    `;

    const typeDisplay = host.querySelector('#typeDisplay');
    const typeHint = host.querySelector('#typeHint');

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
      let html = '';
      for (let i = 0; i < displayWord.length; i++) {
        if (i < typedText.length) {
          html += `<span style="color: ${typedText[i].toUpperCase() === displayWord[i] ? '#34D399' : '#EF4444'};">${typedText[i].toUpperCase()}</span>`;
        } else {
          html += '<span style="color: rgba(167,139,250,0.3);">_</span>';
        }
      }
      typeDisplay.innerHTML = html;

      // Update slots
      for (let i = 0; i < displayWord.length; i++) {
        const slot = host.querySelector(`#typeSlot_${i}`);
        if (slot) {
          if (i < typedText.length) {
            slot.textContent = typedText[i].toUpperCase();
            slot.style.borderColor = typedText[i].toUpperCase() === displayWord[i] ? '#34D399' : '#EF4444';
            slot.style.background = typedText[i].toUpperCase() === displayWord[i] ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)';
          } else {
            slot.textContent = '';
            slot.style.borderColor = 'rgba(167,139,250,0.3)';
            slot.style.background = 'transparent';
          }
        }
      }
    }

    function submitAnswer() {
      if (typedText.length === 0) return;
      const isCorrect = typedText.toUpperCase().trim() === displayWord.toUpperCase();

      // Create a fake button element for the handler
      const fakeBtn = document.createElement('button');
      fakeBtn.style.display = 'none';
      handleAnswer(isCorrect, fakeBtn, null, askWord, askTs, null);
    }

    // Keyboard handler
    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        typedText = typedText.slice(0, -1);
        updateDisplay();
      } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        e.preventDefault();
        if (typedText.length < displayWord.length) {
          typedText += e.key.toUpperCase();
          updateDisplay();
          playSound('tap');
        }
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Store handler for cleanup
    host._keyHandler = keyHandler;
  }

  function handleAnswer(isCorrect, b, optsEl, askWord, askTs, event) {
    // Cleanup type mode handler if exists
    if (host._keyHandler) {
      document.removeEventListener('keydown', host._keyHandler);
      host._keyHandler = null;
    }

    if (optsEl) {
      optsEl.querySelectorAll('.word-opt').forEach(bb => bb.disabled = true);
    }
    const ms = Date.now() - askTs;

    if (isCorrect) {
      // CORRECT ANSWER
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

      // Visual effects
      if (event) {
        const rect = event.target.getBoundingClientRect();
        createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
        showFloatingText(rect.left + rect.width / 2, rect.top, `+${pts}`, '#34D399');
      } else {
        // Type mode - show effect at center
        const stage = host.querySelector('.wf-stage');
        if (stage) {
          const rect = stage.getBoundingClientRect();
          createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
          showFloatingText(rect.left + rect.width / 2, rect.top, `+${pts}`, '#34D399');
        }
      }

      q++;
      _st(next, 700);
    } else {
      // WRONG ANSWER
      playSound('wrong');
      streak = 0;
      haptic([30, 50, 30]);
      if (b && b.style) b.classList.add('wf-wrong');

      // Show correct answer
      if (optsEl) {
        optsEl.querySelectorAll('.word-opt').forEach(bb => {
          if (bb.dataset.w === askWord) bb.classList.add('wf-correct');
        });
      } else {
        // Type mode - reveal correct word
        const typeDisplay = host.querySelector('#typeDisplay');
        if (typeDisplay) {
          typeDisplay.innerHTML = `<span style="color: #EF4444; text-decoration: line-through;">${typedText || '?'}</span> <span style="color: #34D399;">${askWord}</span>`;
        }
      }

      // Screen shake effect
      shakeScreen(wrap);

      // Life lost animation
      const heartsContainer = host.querySelector('#wfHearts');
      if (heartsContainer) {
        const heartToLose = heartsContainer.querySelector(`.wc-heart:not(.lost)[data-idx="${lives - 1}"]`);
        if (heartToLose) animateHeartLoss(heartToLose);
      }

      lives--;
      toast('💔 -1 Life');

      // Show floating text for wrong
      if (event) {
        const rect = event.target.getBoundingClientRect();
        showFloatingText(rect.left + rect.width / 2, rect.top, '❌', '#EF4444');
      }

      q++;
      _st(next, typeModeUnlocked && currentMode === 'type' ? 1200 : 900);
    }
  }

  instrEl.querySelector('#wfStart').onclick = () => {
    instrEl.remove();
    startClock && startClock();
    showCountdown(() => next());
  };
}
