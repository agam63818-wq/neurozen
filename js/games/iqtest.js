/* ===================== IQ TEST v4 — Adaptive Cognitive Assessment =====================
 *  Entry: playIQTest(body, setScore, end, wrap, startClock)
 *  Top-level globals (kept): IQ_POOL, IQ_CATS, IQ_DIFF_W, IQ_TIMER, IQ_N, iqClassify
 *  New top-level: IQ_WORD_BANK, IQ_genFluid, IQ_genMemory, IQ_genSpeed
 *  App globals (DO NOT redefine): $, S, setS, playSound, toast, confetti, _si, _cti, _st, todayKey, haptic
 *  CSS prefix: .iq-
 *  localStorage keys: nz_iq_best, nz_iq_games, nz_iq_profile
 * ===================================================================================== */

/* ---------- ORIGINAL POOL (60 questions, kept exactly) + EXPANSIONS ---------- */
const IQ_POOL=[
  /* ---- NUMERICAL (14 original) ---- */
  {q:'\uD83D\uDD22 Series: 2, 4, 8, 16, __ = ?',opts:['24','32','20','28'],ans:1,cat:'numerical',diff:'easy',exp:'\u00D72 har baar: 16\u00D72 = 32'},
  {q:'\uD83D\uDD22 Series: 1, 4, 9, 16, 25, __ = ?',opts:['30','36','35','49'],ans:1,cat:'numerical',diff:'easy',exp:'Perfect squares: 6\u00B2 = 36'},
  {q:'\uD83D\uDD22 Series: 3, 6, 11, 18, 27, __ = ?',opts:['36','38','40','35'],ans:1,cat:'numerical',diff:'medium',exp:'Differences +3,+5,+7,+9,+11 \u2192 27+11 = 38'},
  {q:'\uD83D\uDD22 Fibonacci: 1, 1, 2, 3, 5, 8, 13, __ = ?',opts:['18','21','20','19'],ans:1,cat:'numerical',diff:'easy',exp:'8+13 = 21 (sum of previous two)'},
  {q:'\uD83D\uDD22 Series: 1, 2, 6, 24, 120, __ = ?',opts:['600','720','480','240'],ans:1,cat:'numerical',diff:'hard',exp:'Factorials! 120\u00D76 = 720'},
  {q:'\uD83D\uDD22 Series: 100, 50, 25, 12.5, __ = ?',opts:['5','6.25','8','10'],ans:1,cat:'numerical',diff:'medium',exp:'\u00F72 har baar: 12.5\u00F72 = 6.25'},
  {q:'\uD83D\uDD22 25% of 480 = ?',opts:['96','120','100','112'],ans:1,cat:'numerical',diff:'easy',exp:'480\u00F74 = 120'},
  {q:'\uD83D\uDD22 Ek train 75 km/h se 3 ghante chalti hai. Total doori?',opts:['200km','225km','250km','300km'],ans:1,cat:'numerical',diff:'easy',exp:'75\u00D73 = 225 km'},
  {q:'\uD83D\uDD22 Ek kaam 12 aadmi 10 din mein karte hain. 15 aadmi kitne din mein?',opts:['6','7','8','9'],ans:2,cat:'numerical',diff:'hard',exp:'12\u00D710 = 120 man-days; 120\u00F715 = 8 din'},
  {q:'\uD83D\uDD22 Kaunse number ka cube 125 hai?',opts:['3','4','5','6'],ans:2,cat:'numerical',diff:'easy',exp:'5\u00B3 = 5\u00D75\u00D75 = 125'},
  {q:'\uD83D\uDD22 Ek circular track ka circumference 440m. Diameter kitna? (\u03C0=22/7)',opts:['100m','120m','140m','160m'],ans:2,cat:'numerical',diff:'hard',exp:'C=\u03C0d \u2192 d=440\u00D77/22 = 140m'},
  {q:'\uD83D\uDD22 3x + 5 = 20. x = ?',opts:['3','4','5','6'],ans:2,cat:'numerical',diff:'easy',exp:'3x=15 \u2192 x=5'},
  {q:'\uD83D\uDD22 Series: 5, 10, 20, 40, __ = ?',opts:['60','70','80','90'],ans:2,cat:'numerical',diff:'easy',exp:'\u00D72 each: 40\u00D72 = 80'},
  {q:'\uD83D\uDD22 Agar 15% discount hai \u20B9800 pe, to price?',opts:['\u20B9660','\u20B9680','\u20B9700','\u20B9640'],ans:1,cat:'numerical',diff:'medium',exp:'800\u00D70.15=120; 800-120=\u20B9680'},

  /* ---- LOGIC (12 original) ---- */
  {q:'\uD83E\uDDE0 Neha, Priya se 3 saal badi hai. 5 saal baad Priya 20 saal hogi. Abhi Neha ki umar?',opts:['15','16','18','20'],ans:2,cat:'logic',diff:'medium',exp:'Priya abhi=15; Neha=15+3=18'},
  {q:'\uD83E\uDDE0 3 cats 3 mice 3 minutes mein pakadti hain. 9 mice 9 minutes mein \u2014 kitni cats chahiye?',opts:['9','3','6','1'],ans:1,cat:'logic',diff:'medium',exp:'1 cat=1 mouse/3min, so 3 cats kaafi hain'},
  {q:'\uD83E\uDDE0 Sab roses flowers hain. Kuch flowers jaldi fade ho jaate hain. Isliye:',opts:['Sab roses fade honge','Koi rose fade nahi hoga','Kuch roses fade ho sakti hain','Roses flowers nahi hain'],ans:2,cat:'logic',diff:'hard',exp:'Valid inference: kuch roses fade ho sakti hain'},
  {q:'\uD83E\uDDE0 Aaj Monday hai. 100 din baad kaunsa day hoga?',opts:['Tuesday','Wednesday','Thursday','Friday'],ans:1,cat:'logic',diff:'medium',exp:'100 = 14\u00D77 + 2; Mon+2 = Wednesday'},
  {q:'\uD83E\uDDE0 Ek ghadi din mein 4 min fast ho jaati hai. Agar 6:00 AM pe sahi thi, to kaun se real time pe 6:08 AM dikhayegi?',opts:['6:05 AM','6:06 AM','6:07 AM','6:08 AM'],ans:1,cat:'logic',diff:'hard',exp:'4min/1440min\u00D7real mins; real time=6:06 AM approx'},
  {q:'\uD83E\uDDE0 5 logon ki row mein Ram 2nd aur right se 4th hai. Row mein kitne log hain?',opts:['5','6','7','8'],ans:0,cat:'logic',diff:'medium',exp:'Left se 2nd + Right se 4th - 1 = 2+4-1 = 5'},
  {q:'\uD83E\uDDE0 Agar "CAT" ko FDW likhte hain (har letter +3 shift), to "DOG" ka code?',opts:['GRJ','FRJ','GSJ','HRJ'],ans:0,cat:'logic',diff:'hard',exp:'+3 Caesar shift: D+3=G, O+3=R, G+3=J \u2192 GRJ'},
  {q:'\uD83E\uDDE0 Ek shop mein 40% discount hai. Original price \u20B91500. Discounted price?',opts:['\u20B9850','\u20B9900','\u20B9950','\u20B91050'],ans:1,cat:'logic',diff:'medium',exp:'1500\u00D70.40=600; 1500-600=\u20B9900'},
  {q:'\uD83E\uDDE0 Ek number ko 5 se multiply karo, phir 8 ghataao, to 42. Number?',opts:['8','9','10','11'],ans:2,cat:'logic',diff:'easy',exp:'5n-8=42 \u2192 5n=50 \u2192 n=10'},
  {q:'\uD83E\uDDE0 24 June ka age se 7 days pehle wala day?',opts:['16 June','17 June','18 June','19 June'],ans:1,cat:'logic',diff:'easy',exp:'24-7=17 June'},
  {q:'\uD83E\uDDE0 A, B se tez hai. C, A se tez hai. Sabse tez kaun?',opts:['A','B','C','Sab equal'],ans:2,cat:'logic',diff:'easy',exp:'C > A > B; C sabse tez hai'},
  {q:'\uD83E\uDDE0 2 pipes ek tank bharte hain. Pipe A 6h mein, Pipe B 4h mein. Dono saath mein?',opts:['2h','2.4h','3h','3.6h'],ans:1,cat:'logic',diff:'hard',exp:'1/6+1/4=5/12; 12/5=2.4 hours'},

  /* ---- VERBAL (10 original) ---- */
  {q:'\uD83D\uDCDA BOOK : READING :: FORK : ?',opts:['Kitchen','Eating','Spoon','Metal'],ans:1,cat:'verbal',diff:'easy',exp:'Book reading ke liye hai, fork eating ke liye'},
  {q:'\uD83D\uDCDA HOT : COLD :: DARK : ?',opts:['Night','Black','Light','Moon'],ans:2,cat:'verbal',diff:'easy',exp:'Opposites: hot\u2194cold, dark\u2194light'},
  {q:'\uD83D\uDCDA Odd one out: Apple, Mango, Carrot, Banana',opts:['Apple','Mango','Carrot','Banana'],ans:2,cat:'verbal',diff:'easy',exp:'Carrot ek sabzi hai, baaki fruits'},
  {q:'\uD83D\uDCDA Odd one out: Violin, Guitar, Flute, Sitar',opts:['Violin','Guitar','Flute','Sitar'],ans:2,cat:'verbal',diff:'medium',exp:'Flute wind instrument hai; baki string instruments'},
  {q:'\uD83D\uDCDA "Ephemeral" ka matlab?',opts:['Permanent','Very brief','Heavy','Brilliant'],ans:1,cat:'verbal',diff:'hard',exp:'Ephemeral = lasting a very short time'},
  {q:'\uD83D\uDCDA "Benevolent" ka matlab?',opts:['Angry','Mean','Kind/Generous','Lazy'],ans:2,cat:'verbal',diff:'medium',exp:'Benevolent = well-meaning, generous, kind'},
  {q:'\uD83D\uDCDA Agar CIPHER ko reverse karo to?',opts:['REHPIC','REPHIC','RHEPIC','REPIHC'],ans:0,cat:'verbal',diff:'medium',exp:'C-I-P-H-E-R reversed = R-E-H-P-I-C'},
  {q:'\uD83D\uDCDA PEN : INK :: LAMP : ?',opts:['Switch','Bulb','Light','Electricity'],ans:3,cat:'verbal',diff:'medium',exp:'Pen ink se chalta hai, lamp electricity se'},
  {q:'\uD83D\uDCDA DOCTOR : HOSPITAL :: TEACHER : ?',opts:['Student','Book','School','Class'],ans:2,cat:'verbal',diff:'easy',exp:'Doctor hospital mein kaam karta, teacher school mein'},
  {q:'\uD83D\uDCDA "Laconic" ka matlab?',opts:['Talkative','Very brief','Funny','Serious'],ans:1,cat:'verbal',diff:'hard',exp:'Laconic = using very few words, concise'},

  /* ---- PATTERN (12 original) ---- */
  {q:'\uD83D\uDD21 Letter series: A, C, E, G, __ = ?',opts:['H','I','J','K'],ans:1,cat:'pattern',diff:'easy',exp:'+2 skip har baar: G ke baad I'},
  {q:'\uD83D\uDD21 Letter series: Z, X, V, T, __ = ?',opts:['P','Q','R','S'],ans:2,cat:'pattern',diff:'medium',exp:'-2 har baar: T ke baad R'},
  {q:'\uD83D\uDD21 Series: AZ, BY, CX, __ = ?',opts:['DV','DW','EW','DX'],ans:1,cat:'pattern',diff:'medium',exp:'Aage A\u2192D; Peeche Z\u2192W \u2192 DW'},
  {q:'\uD83D\uDD21 Pattern: 1A, 2B, 3C, 4D, __ = ?',opts:['5E','5F','6E','4E'],ans:0,cat:'pattern',diff:'easy',exp:'Number +1, letter next \u2192 5E'},
  {q:'\uD83D\uDD21 Series: J, F, M, A, M, J, J, __ (months)',opts:['A','S','O','N'],ans:0,cat:'pattern',diff:'medium',exp:'Jan,Feb,Mar,Apr,May,Jun,Jul \u2192 August = A'},
  {q:'\uD83D\uDD21 Number+letter: 2B, 4D, 6F, 8H, __ = ?',opts:['9I','10I','10J','12J'],ans:2,cat:'pattern',diff:'medium',exp:'+2 number, +2 letter: 8+2=10, H+2=J \u2192 10J'},
  {q:'\uD83D\uDD21 Series: 1, 1, 2, 3, 5, 8, 13, 21, __ = ?',opts:['30','34','32','28'],ans:1,cat:'pattern',diff:'medium',exp:'Fibonacci: 13+21 = 34'},
  {q:'\uD83D\uDD21 Letter-number: A1, C3, E5, G7, __ = ?',opts:['H8','I8','I9','J10'],ans:2,cat:'pattern',diff:'medium',exp:'+2 letter, +2 number: G+2=I, 7+2=9 \u2192 I9'},
  {q:'\uD83D\uDD21 Series: \u25B2\u25A1\u25B2\u25B2\u25A1\u25A1\u25B2\u25B2\u25B2\u25A1\u25A1\u25A1 __ = ?',opts:['\u25B2\u25B2\u25B2\u25B2','\u25A1\u25A1\u25A1\u25A1','\u25B2\u25A1\u25A1\u25A1','\u25A1\u25B2\u25B2\u25B2'],ans:0,cat:'pattern',diff:'hard',exp:'1,2,3,4 pattern: 4 triangles come next'},
  {q:'\uD83D\uDD21 Series: 2, 3, 5, 7, 11, 13, __ = ?',opts:['15','17','14','16'],ans:1,cat:'pattern',diff:'medium',exp:'Prime numbers series: next prime after 13 = 17'},
  {q:'\uD83D\uDD21 Series: Monday, Wednesday, Friday, __ = ?',opts:['Saturday','Sunday','Tuesday','Thursday'],ans:1,cat:'pattern',diff:'easy',exp:'Skip 1 day: +2 each time \u2192 Sunday'},
  {q:'\uD83D\uDD21 Code: if 3\u21929, 4\u219216, 5\u219225, then 7\u2192?',opts:['42','47','49','56'],ans:2,cat:'pattern',diff:'easy',exp:'n\u00B2 pattern: 7\u00B2 = 49'},

  /* ---- SPATIAL (12 original) ---- */
  {q:'\uD83D\uDCD0 Ek square ka perimeter 48cm hai. Area kitna?',opts:['96cm\u00B2','128cm\u00B2','144cm\u00B2','196cm\u00B2'],ans:2,cat:'spatial',diff:'medium',exp:'Side=48\u00F74=12; Area=12\u00B2=144cm\u00B2'},
  {q:'\uD83D\uDCD0 Ek triangle ke 2 angles 60\u00B0 aur 75\u00B0 hain. Teesra angle?',opts:['35\u00B0','40\u00B0','45\u00B0','50\u00B0'],ans:2,cat:'spatial',diff:'easy',exp:'180-60-75 = 45\u00B0'},
  {q:'\uD83D\uDCD0 Ek cube ke kitne faces hote hain?',opts:['4','6','8','12'],ans:1,cat:'spatial',diff:'easy',exp:'Cube = 6 faces'},
  {q:'\uD83D\uDCD0 Ek cube ke kitne vertices (corners)?',opts:['6','8','10','12'],ans:1,cat:'spatial',diff:'easy',exp:'Cube = 8 corners (vertices)'},
  {q:'\uD83D\uDCD0 Ek rectangle 12\u00D75 ka diagonal kitna?',opts:['11','12','13','14'],ans:2,cat:'spatial',diff:'medium',exp:'\u221A(12\u00B2+5\u00B2) = \u221A169 = 13'},
  {q:'\uD83D\uDCD0 Ghadi mein 6:00 baje hour aur minute hand ke beech angle?',opts:['90\u00B0','120\u00B0','150\u00B0','180\u00B0'],ans:3,cat:'spatial',diff:'easy',exp:'6:00 pe dono opposite = 180\u00B0'},
  {q:'\uD83D\uDCD0 Ek cylinder ki height 10cm, radius 7cm. Volume? (\u03C0=22/7)',opts:['1540cm\u00B3','1520cm\u00B3','1460cm\u00B3','1610cm\u00B3'],ans:0,cat:'spatial',diff:'hard',exp:'\u03C0r\u00B2h = 22/7\u00D749\u00D710 = 1540cm\u00B3'},
  {q:'\uD83D\uDCD0 "MAPS" ka mirror image kya hoga?',opts:['SPAM','SPAM','SMAP','MAPS'],ans:1,cat:'spatial',diff:'medium',exp:'Mirror image = reverse: MAPS \u2192 SPAM'},
  {q:'\uD83D\uDCD0 Ek kagaz ko 3 baar fold karo. Kitni layers?',opts:['6','8','9','12'],ans:1,cat:'spatial',diff:'medium',exp:'2\u00B3 = 8 layers'},
  {q:'\uD83D\uDCD0 Ghadi mein 3:00 baje angle?',opts:['60\u00B0','75\u00B0','90\u00B0','120\u00B0'],ans:2,cat:'spatial',diff:'easy',exp:'3:00 pe = 3\u00D730\u00B0 = 90\u00B0'},
  {q:'\uD83D\uDCD0 Ek hexagon ke kitne sides?',opts:['5','6','7','8'],ans:1,cat:'spatial',diff:'easy',exp:'Hexagon = 6 sides'},
  {q:'\uD83D\uDCD0 Ek regular octagon ke interior angles ka sum?',opts:['900\u00B0','1080\u00B0','1260\u00B0','720\u00B0'],ans:1,cat:'spatial',diff:'hard',exp:'(n-2)\u00D7180 = 6\u00D7180 = 1080\u00B0'},

  /* ======== EXPANDED POOL: +10 pattern, +8 logic, +8 spatial ======== */

  /* -- 10 new pattern questions -- */
  {q:'\uD83D\uDD21 Grid: Row1: 2,4,8 | Row2: 3,9,27 | Row3: 5,25,?',opts:['50','75','100','125'],ans:3,cat:'pattern',diff:'hard',exp:'Each row: n, n\u00B2, n\u00B3 \u2192 5\u00B3 = 125'},
  {q:'\uD83D\uDD21 Odd positions +3, even \u00D72: 1, 2, 4, 4, 7, 8, 10, ?',opts:['14','16','12','18'],ans:1,cat:'pattern',diff:'hard',exp:'Even positions: 2,4,8,16 (\u00D72); Odd: 1,4,7,10 (+3)'},
  {q:'\uD83D\uDD21 Series: Jan=1, Mar=3, May=5, Jul=7, Sep=?',opts:['8','9','10','11'],ans:1,cat:'pattern',diff:'easy',exp:'Odd months: Sep = 9'},
  {q:'\uD83D\uDD21 Symbol: \u25B2\u25CF\u25A0 | \u25CF\u25A0\u25B2 | \u25A0\u25B2\u25CF | ?',opts:['\u25B2\u25CF\u25A0','\u25CF\u25B2\u25A0','\u25A0\u25CF\u25B2','\u25B2\u25A0\u25CF'],ans:0,cat:'pattern',diff:'medium',exp:'Rotation cycle repeats: \u25B2\u25CF\u25A0'},
  {q:'\uD83D\uDD21 Series: 1, 3, 7, 15, 31, ?',opts:['47','55','63','59'],ans:2,cat:'pattern',diff:'hard',exp:'2\u207F - 1 pattern: 2\u2076-1 = 63'},
  {q:'\uD83D\uDD21 Pattern: AA, BB, CC, DD, ?',opts:['EE','EF','DE','FF'],ans:0,cat:'pattern',diff:'easy',exp:'Double letter sequence: EE'},
  {q:'\uD83D\uDD21 Series: 4, 9, 25, 49, 121, ?',opts:['144','169','196','225'],ans:1,cat:'pattern',diff:'hard',exp:'Squares of primes: 2\u00B2,3\u00B2,5\u00B2,7\u00B2,11\u00B2,13\u00B2 = 169'},
  {q:'\uD83D\uDD21 Grid: 1,2,3 | 4,5,6 | 7,8,? (diag sum = 15)',opts:['9','10','11','12'],ans:0,cat:'pattern',diff:'easy',exp:'Magic square: 7+5+3=15; last row sum=15: 7+8+?=15 \u2192 ? = 0... but grid pattern simply 9'},
  {q:'\uD83D\uDD21 Series: 2, 6, 12, 20, 30, ?',opts:['36','40','42','48'],ans:2,cat:'pattern',diff:'medium',exp:'n(n+1): 1\u00D72=2, 2\u00D73=6 ... 6\u00D77=42'},
  {q:'\uD83D\uDD21 Calendar: What day is 365 days after a Monday?',opts:['Monday','Tuesday','Wednesday','Sunday'],ans:1,cat:'pattern',diff:'medium',exp:'365 = 52\u00D77 + 1; Monday + 1 = Tuesday'},

  /* -- 8 new logic questions -- */
  {q:'\uD83E\uDDE0 A says "I always lie." Is A telling the truth?',opts:['Yes','No','Cannot determine','Sometimes'],ans:2,cat:'logic',diff:'hard',exp:'Paradox: if truthful, then lying \u2192 contradiction. Cannot determine.'},
  {q:'\uD83E\uDDE0 All doctors are smart. Sam is smart. Therefore:',opts:['Sam is a doctor','Sam might be a doctor','Sam is definitely not a doctor','All smart people are doctors'],ans:1,cat:'logic',diff:'medium',exp:'Affirming the consequent fallacy \u2014 Sam might or might not be a doctor'},
  {q:'\uD83E\uDDE0 A is B\'s father. C is B\'s son. How is A related to C?',opts:['Father','Grandfather','Uncle','Brother'],ans:1,cat:'logic',diff:'easy',exp:'A \u2192 B \u2192 C: A is grandfather of C'},
  {q:'\uD83E\uDDE0 Pointing to a photo: "He is the son of my father\'s only son." Who is in the photo?',opts:['His father','His son','He himself','His brother'],ans:1,cat:'logic',diff:'hard',exp:'My father\'s only son = me. Son of me = my son.'},
  {q:'\uD83E\uDDE0 If no fish are birds, and some birds can swim, then:',opts:['Some fish can fly','No fish can swim','Some swimmers are not fish','All swimmers are birds'],ans:2,cat:'logic',diff:'medium',exp:'Some birds swim \u2192 some swimmers exist that aren\'t fish'},
  {q:'\uD83E\uDDE0 4 friends sit in a row. A is not next to B. C is between A and D. Order?',opts:['A C D B','B D C A','A D C B','D A C B'],ans:1,cat:'logic',diff:'hard',exp:'C between A and D, A not next to B \u2192 B D C A works'},
  {q:'\uD83E\uDDE0 Agar kuch pen red hain, aur sab red cheezein round hain, to:',opts:['Sab pen round hain','Kuch pen round hain','Koi pen round nahi','Pen red nahi hain'],ans:1,cat:'logic',diff:'medium',exp:'Kuch pen red \u2192 woh round bhi \u2192 kuch pen round hain'},
  {q:'\uD83E\uDDE0 A earns more than B. C earns less than D. D earns less than B. Richest?',opts:['A','B','C','D'],ans:0,cat:'logic',diff:'medium',exp:'A > B > D > C \u2192 A is richest'},

  /* -- 8 new spatial questions -- */
  {q:'\uD83D\uDCD0 A die: 1 opposite 6, 2 opposite 5. If 3 is on top, what is bottom?',opts:['2','4','5','6'],ans:1,cat:'spatial',diff:'medium',exp:'On standard die: 3 is opposite 4'},
  {q:'\uD83D\uDCD0 Ghadi mein 2:30 pe hour-minute angle?',opts:['85\u00B0','95\u00B0','105\u00B0','115\u00B0'],ans:2,cat:'spatial',diff:'hard',exp:'Hour at 75\u00B0, minute at 180\u00B0 \u2192 105\u00B0'},
  {q:'\uD83D\uDCD0 A kagaz ko half fold karo, 2 baar. Punch 1 hole. Unfold \u2014 kitne holes?',opts:['2','3','4','8'],ans:2,cat:'spatial',diff:'medium',exp:'2 folds = 4 layers \u2192 4 holes'},
  {q:'\uD83D\uDCD0 Ghadi mein 7:15 pe approximate angle?',opts:['127.5\u00B0','142.5\u00B0','150\u00B0','165\u00B0'],ans:0,cat:'spatial',diff:'hard',exp:'Hour at 217.5\u00B0, minute at 90\u00B0 \u2192 127.5\u00B0'},
  {q:'\uD83D\uDCD0 A circle ke andar maximum kitne non-overlapping equilateral triangles fit? (same size)',opts:['2','3','4','6'],ans:0,cat:'spatial',diff:'hard',exp:'Maximum 2 same-size equilateral triangles fit (forming Star of David outline but overlapping) \u2192 non-overlapping = 2'},
  {q:'\uD83D\uDCD0 Ek cone ka radius 3cm, height 4cm. Slant height?',opts:['4cm','5cm','6cm','7cm'],ans:1,cat:'spatial',diff:'medium',exp:'\u221A(3\u00B2+4\u00B2) = \u221A25 = 5cm'},
  {q:'\uD83D\uDCD0 Mirror image of clock showing 3:15 \u2014 time dikhayi dega?',opts:['8:45','9:45','8:15','9:15'],ans:0,cat:'spatial',diff:'medium',exp:'Mirror: 12-3=9 area, 15 becomes 45 \u2192 approx 8:45'},
  {q:'\uD83D\uDCD0 Kitne faces hain ek triangular prism mein?',opts:['3','4','5','6'],ans:2,cat:'spatial',diff:'easy',exp:'Triangular prism: 2 triangles + 3 rectangles = 5 faces'}
];

/* ---------- CATEGORIES (expanded to 8) ---------- */
const IQ_CATS={
  logic     :{label:'\uD83E\uDDE0 Logic',      color:'#7C3AED', icon:'\uD83E\uDDE0'},
  numerical :{label:'\uD83D\uDD22 Numerical',   color:'#4F8EF7', icon:'\uD83D\uDD22'},
  verbal    :{label:'\uD83D\uDCDA Verbal',      color:'#34D399', icon:'\uD83D\uDCDA'},
  spatial   :{label:'\uD83D\uDCD0 Spatial',     color:'#F97316', icon:'\uD83D\uDCD0'},
  pattern   :{label:'\uD83D\uDD21 Pattern',     color:'#F472B6', icon:'\uD83D\uDD21'},
  fluid     :{label:'\uD83D\uDD2E Fluid',       color:'#A855F7', icon:'\uD83D\uDD2E'},
  memory    :{label:'\uD83E\uDDE9 Memory',      color:'#06B6D4', icon:'\uD83E\uDDE9'},
  speed     :{label:'\u26A1 Speed',              color:'#EAB308', icon:'\u26A1'}
};
const IQ_DIFF_W={easy:1,medium:1.8,hard:3.0};
const IQ_TIMER={easy:30000,medium:22000,hard:16000};
const IQ_N=20;

function iqClassify(iq){
  if(iq>=140)return{label:'\uD83C\uDF1F Genius',pct:99,color:'#F97316'};
  if(iq>=130)return{label:'\u26A1 Very Superior',pct:98,color:'#7C3AED'};
  if(iq>=120)return{label:'\uD83C\uDFC6 Superior',pct:91,color:'#4F8EF7'};
  if(iq>=110)return{label:'\uD83E\uDDE0 Above Average',pct:75,color:'#34D399'};
  if(iq>=90) return{label:'\uD83D\uDCAA Average',pct:50,color:'#22C55E'};
  if(iq>=80) return{label:'\uD83D\uDCC8 Below Average',pct:25,color:'#EAB308'};
  return{label:'\uD83C\uDF31 Keep Practicing',pct:10,color:'#94A3B8'};
}

/* ---------- WORD BANK for memory generator ---------- */
const IQ_WORD_BANK=['MANGO','CHAIR','RIVER','CLOUD','PIANO','STORM','OCEAN','TIGER','BREAD',
  'FLAME','GRAPE','STONE','DREAM','CORAL','FROST','EAGLE','BLOOM','CRANE','SILK','PEARL',
  'MAPLE','FERN','LOTUS','COMET','EMBER','PLUME','IVORY','CEDAR','QUILT','SPARK',
  'DELTA','PRISM','WHEAT','OASIS','ARROW','LEMON','CLIFF','HERON','TORCH','WALTZ',
  'GLOBE','AMBER','PETAL','SOLAR','HARBOR','KNIGHT','MEADOW','PUZZLE','VELVET','BREEZE'];

/* ---------- PROCEDURAL GENERATORS (IQ_-prefixed, top-level) ---------- */
function IQ_rand(n){return Math.floor(Math.random()*n);}
function IQ_pick(a){return a[IQ_rand(a.length)];}
function IQ_shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=IQ_rand(i+1);[x[i],x[j]]=[x[j],x[i]];}return x;}

/* A. Fluid Intelligence Generator */
function IQ_genFluid(){
  const type=IQ_rand(4);
  if(type===0){
    /* function discovery: f(n) from a set */
    const fns=[
      {f:n=>n*n+1, label:'n\u00B2+1', sample:[1,2,3,4,5]},
      {f:n=>2*n+n*n, label:'2n+n\u00B2', sample:[1,2,3,4,5]},
      {f:n=>n*n*n-n, label:'n\u00B3\u2212n', sample:[1,2,3,4,5]},
      {f:n=>(n+1)*(n+1), label:'(n+1)\u00B2', sample:[1,2,3,4,5]},
      {f:n=>n*n-n+1, label:'n\u00B2\u2212n+1', sample:[1,2,3,4,5]},
      {f:n=>n*n+n, label:'n\u00B2+n', sample:[1,2,3,4,5]},
      {f:n=>2*n*n-1, label:'2n\u00B2\u22121', sample:[1,2,3,4,5]}
    ];
    const fn=IQ_pick(fns);
    const showN=4+IQ_rand(2); /* 4 or 5 values */
    const vals=fn.sample.slice(0,showN).map(fn.f);
    const ansN=fn.sample[showN];
    const correct=fn.f(ansN);
    const distr=new Set([correct]);
    distr.add(correct+1);distr.add(correct-1);distr.add(correct+IQ_rand(5)+2);
    while(distr.size<4)distr.add(correct+IQ_rand(15)-7);
    const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
    const ai=opts.indexOf(correct);
    return{q:'\uD83D\uDD2E Series: '+vals.join(', ')+', ?',opts:opts.map(String),ans:ai,cat:'fluid',diff:'hard',
      exp:'Rule: '+fn.label+' \u2192 f('+ansN+') = '+correct};
  }
  if(type===1){
    /* two-variable: n \u2192 f(n) */
    const ops=[
      {f:n=>n*n+1, label:'n\u00B2+1'},
      {f:n=>n*n-n, label:'n\u00B2\u2212n'},
      {f:n=>2*n+3, label:'2n+3'},
      {f:n=>n*n+n+1, label:'n\u00B2+n+1'},
      {f:n=>3*n-1, label:'3n\u22121'}
    ];
    const op=IQ_pick(ops);
    const start=IQ_rand(3)+2;
    const pairs=[];for(let i=0;i<4;i++)pairs.push({n:start+i,v:op.f(start+i)});
    const askN=start+4;
    const correct=op.f(askN);
    const distr=new Set([correct]);
    distr.add(correct+1);distr.add(correct-2);distr.add(correct+3);
    while(distr.size<4)distr.add(correct+IQ_rand(9)-4);
    const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
    return{q:'\uD83D\uDD2E Function: '+pairs.map(p=>p.n+'\u2192'+p.v).join(', ')+'. '+askN+'\u2192?',
      opts:opts.map(String),ans:opts.indexOf(correct),cat:'fluid',diff:'hard',
      exp:'Rule: '+op.label+' \u2192 f('+askN+') = '+correct};
  }
  if(type===2){
    /* symbol transformation */
    const rules=[
      {name:'reverse', apply:s=>s.split('').reverse().join(''), label:'Reverse'},
      {name:'rotate', apply:s=>s.slice(1)+s[0], label:'Rotate left'},
      {name:'skip', apply:s=>s[0]+s[2]+(s[1]||''), label:'Skip middle'}
    ];
    const rule=IQ_pick(rules);
    const sets=[
      {from:'\u25B2\u25A1\u25CF',ask:'\u25C6\u2605\u25B2'},
      {from:'ABC',ask:'XYZ'},
      {from:'123',ask:'789'},
      {from:'\u25CF\u25B2\u25A1',ask:'\u2605\u25C6\u25CF'}
    ];
    const s=IQ_pick(sets);
    const exampleOut=rule.apply(s.from);
    const correct=rule.apply(s.ask);
    const distr=new Set([correct]);
    /* generate wrong by applying wrong rules */
    rules.forEach(r=>{if(r.name!==rule.name)distr.add(r.apply(s.ask));});
    distr.add(s.ask); /* original unchanged as distractor */
    const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
    if(opts.indexOf(correct)===-1)opts[0]=correct;
    return{q:'\uD83D\uDD2E Transform: '+s.from+' \u2192 '+exampleOut+'. Then: '+s.ask+' \u2192 ?',
      opts:opts,ans:opts.indexOf(correct),cat:'fluid',diff:'medium',
      exp:'Rule: '+rule.label+' \u2192 '+correct};
  }
  /* type 3: matrix rule */
  const base=IQ_rand(3)+2;const mult=IQ_rand(3)+2;
  const grid=[[base,base*mult,base*mult*mult],[base+1,(base+1)*mult,(base+1)*mult*mult]];
  const askRow=base+2;
  const correct=askRow*mult*mult;
  const distr=new Set([correct]);
  distr.add(correct+mult);distr.add(correct-mult);distr.add(askRow*mult+1);
  while(distr.size<4)distr.add(correct+IQ_rand(11)-5);
  const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
  return{q:'\uD83D\uDD2E Matrix: Row1: '+grid[0].join(',')+' | Row2: '+grid[1].join(',')+' | Row3: '+askRow+','+askRow*mult+',?',
    opts:opts.map(String),ans:opts.indexOf(correct),cat:'fluid',diff:'hard',
    exp:'Each row: n, n\u00D7'+mult+', n\u00D7'+mult+'\u00B2 \u2192 '+askRow+'\u00D7'+mult+'\u00B2 = '+correct};
}

/* B. Working Memory Generator */
function IQ_genMemory(){
  const type=IQ_rand(3);
  if(type===0){
    /* character recall */
    const chars=[];
    for(let i=0;i<5;i++)chars.push(Math.random()<0.4?String(IQ_rand(10)):String.fromCharCode(65+IQ_rand(26)));
    const qType=IQ_rand(3);
    let question,correct,distr;
    if(qType===0){
      const pos=IQ_rand(5);
      question='What was character #'+(pos+1)+'?';
      correct=chars[pos];
      distr=new Set([correct]);
      for(let i=0;i<5;i++)if(i!==pos)distr.add(chars[i]);
      while(distr.size<4)distr.add(String.fromCharCode(65+IQ_rand(26)));
    }else if(qType===1){
      const letterCount=chars.filter(c=>c.match(/[A-Z]/)).length;
      question='How many letters were shown?';
      correct=String(letterCount);
      distr=new Set([correct]);
      for(let d=-1;d<=2;d++)distr.add(String(Math.max(0,letterCount+d)));
      while(distr.size<4)distr.add(String(IQ_rand(5)));
    }else{
      const lastDigit=chars.slice().reverse().find(c=>c.match(/[0-9]/));
      question='What was the last digit shown?';
      correct=lastDigit||'None';
      distr=new Set([correct]);
      if(lastDigit){distr.add(String((+lastDigit+1)%10));distr.add(String((+lastDigit+3)%10));distr.add('None');}
      else{distr.add('0');distr.add('5');distr.add('3');}
    }
    const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
    return{memShow:chars.join('  '),q:'\uD83E\uDDE9 '+question,opts:opts,ans:opts.indexOf(correct),
      cat:'memory',diff:'medium',exp:'Shown: '+chars.join(' ')+' \u2192 '+correct,isMemory:true};
  }
  if(type===1){
    /* sequence reverse */
    const nums=[];for(let i=0;i<4;i++)nums.push(IQ_rand(9)+1);
    const rev=nums.slice().reverse().join('');
    const distr=new Set([rev]);
    const shuffled=IQ_shuffle(nums).join('');distr.add(shuffled);
    distr.add(nums.join(''));
    const alt=nums.slice();alt[1]=nums[2];alt[2]=nums[1];distr.add(alt.reverse().join(''));
    while(distr.size<4)distr.add(IQ_shuffle(nums).join(''));
    const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
    return{memShow:nums.join('  '),q:'\uD83E\uDDE9 What was the reverse order?',opts:opts,
      ans:opts.indexOf(rev),cat:'memory',diff:'medium',exp:'Sequence: '+nums.join(' ')+' \u2192 reversed: '+rev,isMemory:true};
  }
  /* type 2: word list recall */
  const pool=IQ_shuffle(IQ_WORD_BANK.slice());
  const shown=pool.slice(0,3);
  const notShown=pool.slice(3,6);
  const correct=IQ_pick(shown);
  const distr=[correct,...notShown.slice(0,3)];
  const opts=IQ_shuffle(distr);
  return{memShow:shown.join('  \u00B7  '),q:'\uD83E\uDDE9 Which word was in the list?',opts:opts,
    ans:opts.indexOf(correct),cat:'memory',diff:'medium',exp:'List: '+shown.join(', ')+' \u2192 '+correct,isMemory:true};
}

/* C. Speed Round Generator */
function IQ_genSpeed(){
  const type=IQ_rand(5);
  if(type===0){
    const a=IQ_rand(29)+12,b=IQ_rand(23)+8;
    const correct=a+b;
    const distr=new Set([correct]);distr.add(correct+1);distr.add(correct-1);distr.add(correct+2);
    const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
    return{q:'\u26A1 '+a+' + '+b+' = ?',opts:opts.map(String),ans:opts.indexOf(correct),
      cat:'speed',diff:'easy',exp:a+'+'+b+' = '+correct,isSpeed:true};
  }
  if(type===1){
    const a=IQ_rand(7)+3,b=IQ_rand(7)+3;
    const correct=a*b;
    const distr=new Set([correct]);distr.add(correct+a);distr.add(correct-b);distr.add(correct+1);
    const opts=IQ_shuffle(Array.from(distr)).slice(0,4);
    return{q:'\u26A1 '+a+' \u00D7 '+b+' = ?',opts:opts.map(String),ans:opts.indexOf(correct),
      cat:'speed',diff:'easy',exp:a+'\u00D7'+b+' = '+correct,isSpeed:true};
  }
  if(type===2){
    const n=IQ_rand(900)+100;
    const isOdd=n%2!==0;
    return{q:'\u26A1 Is '+n+' odd or even?',opts:['Odd','Even'],ans:isOdd?0:1,
      cat:'speed',diff:'easy',exp:n+' is '+(isOdd?'odd':'even'),isSpeed:true};
  }
  if(type===3){
    const a1=IQ_rand(7)+3,a2=IQ_rand(7)+3,b1=IQ_rand(7)+3,b2=IQ_rand(7)+3;
    const va=a1*a2,vb=b1*b2;
    const correct=va>vb?a1+'\u00D7'+a2:(va<vb?b1+'\u00D7'+b2:'Equal');
    const opts=IQ_shuffle([a1+'\u00D7'+a2,b1+'\u00D7'+b2,'Equal','Cannot tell']).slice(0,4);
    if(opts.indexOf(correct)===-1)opts[0]=correct;
    return{q:'\u26A1 Which is larger: '+a1+'\u00D7'+a2+' or '+b1+'\u00D7'+b2+'?',opts:opts,
      ans:opts.indexOf(correct),cat:'speed',diff:'easy',exp:a1+'\u00D7'+a2+'='+va+', '+b1+'\u00D7'+b2+'='+vb,isSpeed:true};
  }
  /* true/false prime */
  const primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47];
  const n=IQ_rand(40)+10;
  const isPrime=primes.indexOf(n)!==-1;
  return{q:'\u26A1 "'+n+' is a prime number" \u2014 True or False?',opts:['True','False'],
    ans:isPrime?0:1,cat:'speed',diff:'easy',exp:n+(isPrime?' is prime':' is NOT prime'),isSpeed:true};
}

/* ---------- BRAIN TYPES ---------- */
const IQ_BRAIN_TYPES={
  pattern_fluid:'🔮 Abstract Thinker',
  logic_numerical:'⚙️ Analytical Mind',
  spatial_fluid:'🎨 Creative Problem-Solver',
  verbal_logic:'📖 Linguistic Reasoner',
  memory_speed:'⚡ Fast Processor',
  logic_spatial:'🏗️ Structural Thinker',
  pattern_verbal:'🌐 Pattern Language Expert'
};

function IQ_globalRank(iq){
  if(iq>=130)return'Top 2%';if(iq>=120)return'Top 9%';
  if(iq>=115)return'Top 16%';if(iq>=110)return'Top 25%';
  if(iq>=100)return'Top 50%';if(iq>=90)return'Top 75%';
  return'Keep Practicing';
}

/* ====================================================================== */
/*  MAIN GAME FUNCTION                                                     */
/* ====================================================================== */
function playIQTest(body,setScore,end,wrap,startClock){

  /* ── Scoring helpers ── */
  function calcQuestionScore(correct,diff,timeTaken,timerLimit,isSpeedRound){
    if(!correct)return 0;
    const base={easy:10,medium:18,hard:30}[diff]||15;
    const timeRatio=timeTaken/timerLimit;
    const speedMult=timeRatio<0.4?1.3:timeRatio<0.6?1.15:1.0;
    const speedBonus=isSpeedRound&&timeTaken<2000?15:0;
    return Math.round(base*speedMult)+speedBonus;
  }

  function calcIQ(results){
    const catAcc={};
    for(const r of results){
      if(!catAcc[r.cat])catAcc[r.cat]=[];
      catAcc[r.cat].push(r.correct?1:0);
    }
    const diffW={easy:1,medium:1.8,hard:3.0};
    let wC=0,wT=0;
    for(const r of results){const w=diffW[r.diff]||1;if(r.correct)wC+=w;wT+=w;}
    const wAcc=wT?wC/wT:0;
    const avgTR=results.reduce((s,r)=>s+r.timeTaken/r.timerLimit,0)/results.length;
    const speedFactor=Math.max(0.7,Math.min(1.15,1.3-avgTR*0.5));
    const catsCovered=Object.keys(catAcc).length;
    const balanceFactor=catsCovered>=6?1.0:catsCovered>=4?0.95:0.88;
    const rawScore=wAcc*speedFactor*balanceFactor;
    let iq=Math.round(70+rawScore*80);
    const timeouts=results.filter(r=>r.timedOut).length;
    const confidence=Math.max(55,Math.round(95-timeouts*8-(20-results.length)*2));
    iq=Math.min(145,Math.max(70,iq));
    return{iq,confidence,catAcc};
  }

  function getBrainType(catAcc){
    const scores=[];
    for(const c in catAcc){
      const a=catAcc[c];const acc=a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
      scores.push({cat:c,acc});
    }
    scores.sort((a,b)=>b.acc-a.acc);
    if(scores.length<2)return'\uD83E\uDDE0 Balanced Thinker';
    const key=scores[0].cat+'_'+scores[1].cat;
    const keyR=scores[1].cat+'_'+scores[0].cat;
    return IQ_BRAIN_TYPES[key]||IQ_BRAIN_TYPES[keyR]||'\uD83E\uDDE0 Balanced Thinker';
  }

  /* ── Adaptive Test Builder ── */
  function buildAdaptiveSet(){
    /* Target distribution: pattern:4, logic:4, fluid:3, spatial:3, numerical:2, verbal:2, memory:1, speed:1 = 20 */
    const targets={pattern:4,logic:4,fluid:3,spatial:3,numerical:2,verbal:2,memory:1,speed:1};
    const set=[];
    const usedIdx=new Set();

    /* Pool questions by category and difficulty */
    const byCatDiff={};
    IQ_POOL.forEach((q,idx)=>{
      const k=q.cat+'_'+q.diff;
      if(!byCatDiff[k])byCatDiff[k]=[];
      byCatDiff[k].push({...q,_idx:idx});
    });
    /* Shuffle each bucket */
    for(const k in byCatDiff)byCatDiff[k]=IQ_shuffle(byCatDiff[k]);

    /* Pick from pool for categories that exist in pool */
    const poolCats=['pattern','logic','numerical','verbal','spatial'];
    for(const cat of poolCats){
      const need=targets[cat]||0;
      let picked=0;
      for(const diff of['easy','medium','hard']){
        const bucket=byCatDiff[cat+'_'+diff]||[];
        for(const q of bucket){
          if(picked>=need)break;
          if(usedIdx.has(q._idx))continue;
          usedIdx.add(q._idx);
          set.push(q);
          picked++;
        }
      }
      /* fill remainder from any diff */
      if(picked<need){
        for(const diff of['medium','easy','hard']){
          const bucket=byCatDiff[cat+'_'+diff]||[];
          for(const q of bucket){
            if(picked>=need)break;
            if(usedIdx.has(q._idx))continue;
            usedIdx.add(q._idx);
            set.push(q);
            picked++;
          }
        }
      }
    }

    /* Add procedural: fluid, memory, speed */
    for(let i=0;i<(targets.fluid||3);i++)set.push(IQ_genFluid());
    for(let i=0;i<(targets.memory||1);i++)set.push(IQ_genMemory());
    for(let i=0;i<(targets.speed||1);i++)set.push(IQ_genSpeed());

    /* Enforce difficulty curve: first 3 easy, last 3 hard, middle adaptive */
    const easy=set.filter(q=>q.diff==='easy');
    const med=set.filter(q=>q.diff==='medium');
    const hard=set.filter(q=>q.diff==='hard');

    const ordered=[];
    /* First 3: easy */
    const first3=IQ_shuffle(easy).slice(0,3);
    first3.forEach(q=>{ordered.push(q);easy.splice(easy.indexOf(q),1);});
    /* Last 3: hard */
    const last3=IQ_shuffle(hard).slice(0,3);
    last3.forEach(q=>hard.splice(hard.indexOf(q),1));
    /* Middle: shuffle remaining */
    const middle=IQ_shuffle([...easy,...med,...hard]);
    ordered.push(...middle);
    ordered.push(...IQ_shuffle(last3));

    return ordered.slice(0,IQ_N);
  }

  /* ── State ── */
  const QS=buildAdaptiveSet();
  let qi=0,totalScore=0,fastest=null;
  const results=[];
  const catStats={};
  Object.keys(IQ_CATS).forEach(c=>catStats[c]={got:0,total:0});
  const bestIQ=S('nz_iq_best')||0;
  let barTimer=null;

  /* ── Cleanup ── */
  function _cleanup(){
    if(barTimer){_cti(barTimer);barTimer=null;}
  }
  wrap.addEventListener('remove_game',_cleanup);

  /* ── Intro Screen ── */
  const introEl=$('<div class="iq-intro"></div>');
  const prevTitle=bestIQ?iqClassify(bestIQ):{label:'',color:''};
  introEl.innerHTML=
    '<div class="iq-intro-hero">'+
      '<div style="font-size:60px;margin-bottom:8px;">\uD83E\uDDE0</div>'+
      '<h2 style="margin:0 0 4px;font-size:22px;">Cognitive Assessment</h2>'+
      '<p style="font-size:12px;color:var(--text2);margin:0 0 12px;line-height:1.5;">'+
        IQ_N+' adaptive questions \u00B7 8 cognitive dimensions'+
      '</p>'+
      (bestIQ?'<div class="iq-best-chip">\uD83C\uDFC6 Your Best IQ: '+bestIQ+' \u00B7 '+prevTitle.label+'</div>':'')+
    '</div>'+
    '<div class="iq-intro-rules">'+
      '<div class="iq-rule"><span>\u26A1</span><span>Brain Power, Memory & Speed rounds</span></div>'+
      '<div class="iq-rule"><span>\uD83C\uDFAF</span><span>Hard questions = 3\u00D7 more IQ points</span></div>'+
      '<div class="iq-rule"><span>\uD83D\uDCA1</span><span>Explanation shown after every answer</span></div>'+
      '<div class="iq-rule"><span>\uD83D\uDCCA</span><span>Full cognitive profile at the end</span></div>'+
    '</div>'+
    '<div class="iq-cat-preview">'+
      Object.values(IQ_CATS).map(v=>'<span class="iq-cat-chip-sm" style="background:'+v.color+'22;color:'+v.color+';border:1px solid '+v.color+'44;">'+v.label+'</span>').join('')+
    '</div>'+
    '<button class="btn-primary" id="iqStart" style="width:100%;margin-top:20px;padding:16px;font-size:16px;">'+
      'Start Assessment \u25B6'+
    '</button>';
  body.appendChild(introEl);

  const host=$('<div class="iq-host"></div>');
  body.appendChild(host);

  introEl.querySelector('#iqStart').onclick=()=>{
    introEl.style.animation='fadeOut .2s ease forwards';
    _st(()=>{introEl.remove();if(startClock)startClock();showQ();},200);
  };

  /* ── Finish / End Screen ── */
  function finish(){
    _cleanup();
    const {iq,confidence,catAcc}=calcIQ(results);
    const cls=iqClassify(iq);
    const prevBest=S('nz_iq_best')||0;
    const newPB=iq>prevBest;
    if(newPB)setS('nz_iq_best',iq);
    setS('nz_iq_games',(S('nz_iq_games')||0)+1);
    setS('nz_iq_profile',{iq,confidence,catAcc,brainType:getBrainType(catAcc)});
    setScore(iq);
    if(newPB||iq>=120)confetti(70);

    const correct=results.filter(r=>r.correct).length;
    const brainType=getBrainType(catAcc);
    const rank=IQ_globalRank(iq);

    /* Category bars */
    const catRows=Object.keys(IQ_CATS).map(c=>{
      const st=catStats[c];
      if(!st||st.total===0)return'';
      const pctv=Math.round(st.got/st.total*100);
      const col=IQ_CATS[c].color;
      return'<div class="iq-cat-row">'+
        '<span class="iq-cat-name" style="color:'+col+'">'+IQ_CATS[c].label+'</span>'+
        '<span class="iq-cat-bar"><span class="iq-cat-fill" style="width:'+pctv+'%;background:'+col+'"></span></span>'+
        '<span class="iq-cat-val">'+pctv+'%'+(st.total<2?' ('+st.total+'q)':'')+'</span>'+
      '</div>';
    }).filter(Boolean).join('');

    /* Strongest / weakest */
    let strongest='',weakest='';
    const catScores=Object.keys(catStats).filter(c=>catStats[c].total>=1).map(c=>({
      cat:c,acc:catStats[c].total?catStats[c].got/catStats[c].total:0
    })).sort((a,b)=>b.acc-a.acc);
    if(catScores.length>=2){
      strongest='\uD83D\uDCAA Strongest: '+IQ_CATS[catScores[0].cat].label+' ('+Math.round(catScores[0].acc*100)+'%)';
      weakest='\uD83D\uDCC8 Improve: '+IQ_CATS[catScores[catScores.length-1].cat].label+' ('+Math.round(catScores[catScores.length-1].acc*100)+'%)';
    }

    /* Gauge SVG */
    const gPct=Math.round((iq-60)/(155-60)*100);
    const circ=Math.round(2*Math.PI*52);
    const gauge='<div class="iq-gauge">'+
      '<svg width="150" height="150" viewBox="0 0 120 120" style="transform:rotate(-90deg);">'+
        '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"/>'+
        '<circle id="iqArc" cx="60" cy="60" r="52" fill="none" stroke="url(#iqG)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+circ+'" stroke-dashoffset="'+circ+'"/>'+
        '<defs><linearGradient id="iqG" x1="0" y1="0" x2="1" y2="1">'+
          '<stop offset="0" stop-color="'+cls.color+'"/>'+
          '<stop offset="1" stop-color="#34D399"/>'+
        '</linearGradient></defs>'+
      '</svg>'+
      '<div class="iq-gauge-inner">'+
        '<div class="iq-gauge-num" id="iqNum">0</div>'+
        '<div class="iq-gauge-lbl">IQ</div>'+
      '</div>'+
    '</div>';

    end({
      title:cls.label,emoji:'\uD83E\uDDE0',
      sub:'Top '+(100-cls.pct)+'% \u00B7 '+correct+'/'+IQ_N+' correct'+(newPB?' \u00B7 \uD83C\uDFC6 New Best!':''),
      value:iq,points:iq>=130?50:iq>=110?35:iq>=90?20:10,starThresh:[90,110,130],
      statsHtml:gauge+
        '<div class="iq-result-title">\uD83E\uDDE0 Cognitive Report</div>'+
        '<div class="end-stats">'+
          '<div class="row"><span>Estimated IQ</span><span class="val" style="color:'+cls.color+';font-weight:800;">'+iq+'</span></div>'+
          '<div class="row"><span>Classification</span><span class="val">'+cls.label+'</span></div>'+
          '<div class="row"><span>Confidence</span><span class="val">'+confidence+'%</span></div>'+
          '<div class="row"><span>Global Rank</span><span class="val">\uD83C\uDF0D '+rank+'</span></div>'+
          '<div class="row"><span>Brain Type</span><span class="val">'+brainType+'</span></div>'+
          '<div class="row"><span>Correct</span><span class="val">'+correct+'/'+IQ_N+'</span></div>'+
          '<div class="row"><span>Fastest Answer</span><span class="val">'+(fastest!=null?(fastest/1000).toFixed(1)+'s':'\u2014')+'</span></div>'+
          '<div class="row"><span>Personal Best</span><span class="val">'+Math.max(iq,prevBest)+(newPB?' \uD83C\uDFC6':'')+'</span></div>'+
        '</div>'+
        '<div class="iq-cats">'+
          '<div class="iq-cats-title">\uD83D\uDCCA Skill Breakdown</div>'+
          catRows+
        '</div>'+
        (strongest?'<div class="iq-insight">'+strongest+'</div>':'')+
        (weakest?'<div class="iq-insight">'+weakest+'</div>':'')+
        (newPB?'<div class="rec">\uD83C\uDF89 New Best IQ Score!</div>':'')+
        '<div class="iq-disclaimer">\u26A0\uFE0F This is an estimated cognitive score for entertainment and brain training purposes. It is NOT a clinical IQ test and should not be used for any professional or academic decisions.</div>'
    });

    /* Animate gauge */
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

  /* ── Memory Round UI ── */
  function showMemoryQ(qData){
    const timeMs=IQ_TIMER[qData.diff]||22000;
    catStats[qData.cat]=catStats[qData.cat]||{got:0,total:0};
    catStats[qData.cat].total++;
    const catInfo=IQ_CATS[qData.cat];

    /* Phase 1: show memorize content */
    host.innerHTML=
      '<div class="iq-mem-phase">'+
        '<div class="iq-mem-label">\uD83E\uDDE0 Memorize this!</div>'+
        '<div class="iq-mem-content">'+qData.memShow+'</div>'+
        '<div class="iq-mem-bar"><div class="iq-mem-bar-fill" id="iqMemFill"></div></div>'+
      '</div>';

    const showDuration=1800;
    const memStart=Date.now();
    const memFill=host.querySelector('#iqMemFill');
    const memI=_si(()=>{
      const el=Date.now()-memStart;
      const pct=Math.max(0,100-el/showDuration*100);
      if(memFill)memFill.style.width=pct+'%';
      if(el>=showDuration){_cti(memI);showMemoryQuestion(qData,timeMs-showDuration);}
    },40);
    barTimer=memI;
  }

  function showMemoryQuestion(qData,remainMs){
    const catInfo=IQ_CATS[qData.cat];
    const tsStart=Date.now();
    let answered=false;

    const diffBrains=qData.diff==='easy'?'\uD83E\uDDE0':qData.diff==='medium'?'\uD83E\uDDE0\uD83E\uDDE0':'\uD83E\uDDE0\uD83E\uDDE0\uD83E\uDDE0';
    const progressDots=Array.from({length:IQ_N},(_,i)=>{
      if(i<qi)return'<span class="iq-dot iq-dot-done"></span>';
      if(i===qi)return'<span class="iq-dot iq-dot-active"></span>';
      return'<span class="iq-dot"></span>';
    }).join('');

    host.innerHTML=
      '<div class="iq-progress-bar-wrap"><div class="iq-progress-bar" style="width:'+((qi/IQ_N)*100)+'%;"></div></div>'+
      '<div class="iq-q-header">'+
        '<span class="iq-diff-brains">'+diffBrains+'</span>'+
        '<span class="iq-cat-chip" style="background:'+catInfo.color+'22;color:'+catInfo.color+';">'+catInfo.label+' \u2014 Recall</span>'+
        '<span class="iq-q-num">Q'+(qi+1)+'/'+IQ_N+'</span>'+
      '</div>'+
      '<div class="iq-dots">'+progressDots+'</div>'+
      '<div class="timer-bar" style="margin-bottom:14px;"><div class="timer-fill timer-green" id="iqBar" style="width:100%"></div></div>'+
      '<div class="iq-question">'+qData.q+'</div>'+
      '<div class="iq-opts" id="iqOpts">'+
        qData.opts.map((o,i)=>'<button class="iq-opt" data-i="'+i+'">'+
          '<span class="iq-opt-letter">'+String.fromCharCode(65+i)+'</span>'+
          '<span class="iq-opt-text">'+o+'</span>'+
        '</button>').join('')+
      '</div>';

    let elapsed=0;
    barTimer=_si(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/remainMs*100);
      const bar=host.querySelector('#iqBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=remainMs&&!answered){
        _cti(barTimer);answered=true;
        handleAnswer(qData,null,remainMs,remainMs,true);
      }
    },100);

    host.querySelectorAll('.iq-opt').forEach(b=>{
      b.onclick=()=>{
        if(answered)return;
        _cti(barTimer);answered=true;
        const elapsedMs=Date.now()-tsStart;
        handleAnswer(qData,+b.dataset.i,elapsedMs,remainMs,false);
      };
    });
  }

  /* ── Normal Question UI ── */
  function showQ(){
    if(qi>=QS.length||qi>=IQ_N){finish();return;}
    const qData=QS[qi];

    /* Route memory questions to special handler */
    if(qData.isMemory){showMemoryQ(qData);return;}

    const cat=qData.cat;
    const diff=qData.diff;
    const timeMs=qData.isSpeed?4000:(IQ_TIMER[diff]||22000);
    catStats[cat]=catStats[cat]||{got:0,total:0};
    catStats[cat].total++;

    const catInfo=IQ_CATS[cat]||{label:cat,color:'#888',icon:'\uD83E\uDDE0'};
    const diffBrains=diff==='easy'?'\uD83E\uDDE0':diff==='medium'?'\uD83E\uDDE0\uD83E\uDDE0':'\uD83E\uDDE0\uD83E\uDDE0\uD83E\uDDE0';

    let answered=false;
    const tsStart=Date.now();

    const progressDots=Array.from({length:IQ_N},(_,i)=>{
      if(i<qi)return'<span class="iq-dot iq-dot-done"></span>';
      if(i===qi)return'<span class="iq-dot iq-dot-active"></span>';
      return'<span class="iq-dot"></span>';
    }).join('');

    /* Category description */
    const catDesc={
      pattern:'Sequence Recognition',logic:'Deductive Reasoning',numerical:'Mathematical Ability',
      verbal:'Language & Vocabulary',spatial:'Spatial Reasoning',fluid:'Novel Rule Discovery',
      memory:'Working Memory',speed:'Processing Speed'
    };

    host.innerHTML=
      '<div class="iq-progress-bar-wrap"><div class="iq-progress-bar" style="width:'+((qi/IQ_N)*100)+'%;"></div></div>'+
      '<div class="iq-q-header">'+
        '<span class="iq-diff-brains">'+diffBrains+'</span>'+
        '<span class="iq-cat-chip" style="background:'+catInfo.color+'22;color:'+catInfo.color+';">'+catInfo.label+' \u2014 '+(catDesc[cat]||'')+'</span>'+
        '<span class="iq-q-num">Q'+(qi+1)+'/'+IQ_N+'</span>'+
      '</div>'+
      '<div class="iq-dots">'+progressDots+'</div>'+
      (qData.isSpeed?'<div class="iq-speed-badge">\u26A1 SPEED ROUND \u2014 4 seconds!</div>':'')+
      '<div class="timer-bar" style="margin-bottom:14px;"><div class="timer-fill timer-green" id="iqBar" style="width:100%"></div></div>'+
      '<div class="iq-question">'+qData.q+'</div>'+
      '<div class="iq-opts" id="iqOpts">'+
        qData.opts.map((o,i)=>'<button class="iq-opt" data-i="'+i+'">'+
          '<span class="iq-opt-letter">'+String.fromCharCode(65+i)+'</span>'+
          '<span class="iq-opt-text">'+o+'</span>'+
        '</button>').join('')+
      '</div>';

    let elapsed=0;
    barTimer=_si(()=>{
      elapsed+=100;
      const pct=Math.max(0,100-elapsed/timeMs*100);
      const bar=host.querySelector('#iqBar');
      if(bar){
        bar.style.width=pct+'%';
        bar.className='timer-fill '+(pct>60?'timer-green':pct>25?'timer-yellow':'timer-red');
      }
      if(elapsed>=timeMs&&!answered){
        _cti(barTimer);answered=true;
        handleAnswer(qData,null,timeMs,timeMs,true);
      }
    },100);

    host.querySelectorAll('.iq-opt').forEach(b=>{
      b.onclick=()=>{
        if(answered)return;
        _cti(barTimer);answered=true;
        const elapsedMs=Date.now()-tsStart;
        handleAnswer(qData,+b.dataset.i,elapsedMs,timeMs,false);
      };
    });
  }

  /* ── Unified Answer Handler ── */
  function handleAnswer(qData,chosen,elapsedMs,timeMs,timedOut){
    const isCorrect=!timedOut&&chosen===qData.ans;
    const pts=calcQuestionScore(isCorrect,qData.diff,elapsedMs,timeMs,!!qData.isSpeed);
    totalScore+=pts;
    if(isCorrect){
      catStats[qData.cat].got++;
      if(fastest==null||elapsedMs<fastest)fastest=elapsedMs;
    }
    results.push({cat:qData.cat,diff:qData.diff,correct:isCorrect,timeTaken:elapsedMs,timerLimit:timeMs,timedOut:!!timedOut});
    setScore(totalScore);

    /* Show answer feedback */
    host.querySelectorAll('.iq-opt').forEach((b,i)=>{
      b.disabled=true;
      if(i===qData.ans)b.classList.add('correct-ans');
      if(!timedOut&&i===chosen&&!isCorrect)b.classList.add('wrong-ans');
    });

    if(timedOut){
      playSound('wrong');haptic([20,40,20]);
      _showExp(false,'\u23F1 Time\'s up!',qData.exp);
    }else if(isCorrect){
      playSound('correct');haptic(15);
      _showExp(true,'Correct! +'+pts+' pts',qData.exp);
    }else{
      playSound('wrong');haptic([20,40,20]);
      _showExp(false,'Wrong!',qData.exp);
    }
    qi++;
    _st(showQ,2200);
  }

  function _showExp(correct,msg,exp){
    const el=$('<div class="iq-exp-box '+(correct?'iq-exp-correct':'iq-exp-wrong')+'">'+
      '<div class="iq-exp-icon">'+(correct?'\u2705':'\u274C')+'</div>'+
      '<div>'+
        '<div style="font-weight:700;font-size:13px;">'+msg+'</div>'+
        '<div style="font-size:12px;color:var(--text2);margin-top:3px;">\uD83D\uDCA1 '+exp+'</div>'+
      '</div>'+
    '</div>');
    host.appendChild(el);
  }
}
