# 🧠 NeuroZen — Train Your Brain

A beautiful, mobile-first brain training web app with 10 science-inspired mini-games. No account, no server — all progress is saved locally in your browser.

## ✨ Features

- **10 Brain Games** — Schulte Table, Memory Matrix, Pattern IQ, Word Flash, Word Chain, Quick Math, Color Stroop Xtreme, IQ Test, Reaction Lab, and Spatial Spin
- **Brain Score System** — earn points, level up from Beginner to Master (0–10000)
- **Skill Tracking** — Memory, Focus, Logic & Speed bars that grow as you play
- **Streaks & Daily Goals** — play every day to keep your 🔥 streak alive
- **Daily Challenge** — rotating game-of-the-day with 2× XP bonus
- **15 Achievements** — unlock badges with confetti celebrations
- **XP & Levels** — 10 levels from Novice to Legend
- **Progress Charts** — 7-day brain score history with smooth line charts
- **Relax Mode** — generated ambient soundscapes (rain, ocean, forest, white noise) + box breathing guide
- **Dark Mode** — full light/dark theme support
- **Sound Effects** — Web Audio API generated tones, no audio files needed
- **PWA / Offline-Friendly** — installable, service-worker cached, pure HTML/CSS/JS, data stored in `localStorage`

## 🎮 Games

| Game | Skill | Description |
|------|-------|-------------|
| ▦ Schulte Table | Focus | Tap numbers 1→N in order, multiple modes (Normal, Medium, Hard, Reverse, Ghost, Zen) |
| 🧠 Memory Matrix | Memory | Memorize highlighted cells, then recall them |
| 💡 Pattern IQ | Logic | Color, number & matrix pattern puzzles |
| 📝 Word Flash | Memory | Remember a flashed word under time pressure |
| 🔗 Word Chain | Memory | Recall an ever-growing chain of words in order |
| 🔢 Quick Math | Speed | 5 difficulty tiers, combo multipliers |
| 🎨 Color Stroop Xtreme | Focus | Tap the ink color, not the word |
| 🧩 IQ Test | Reasoning | 15 Hinglish reasoning questions across 5 categories |
| ⚡ Reaction Lab | Speed | Tap the circle the instant it appears — raw reaction speed |
| 🔄 Spatial Spin | Logic | Mentally rotate shapes — 3D visual reasoning |

## 🚀 Run Locally

No build step needed — it's a static site:

```bash
git clone https://gitlab.com/agamroy25-group/neurozen.git
cd neurozen
# open index.html in a browser, or serve it:
python3 -m http.server 8000
```

Then open http://localhost:8000

## 📁 Project Structure

```
neurozen/
├── index.html          # App shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline cache)
├── icon-192.png        # PWA icon
├── css/
│   └── style.css       # All styles (light + dark theme)
├── js/
│   ├── app.js          # State, navigation, screens, XP/achievements/streak, openGame()
│   ├── shared.js       # Shared helpers used across games
│   └── games/
│       ├── schulte.js
│       ├── memory.js
│       ├── pattern.js
│       ├── wordflash.js
│       ├── wordchain.js
│       ├── math.js
│       ├── stroopx.js
│       ├── iqtest.js
│       ├── reactionlab.js
│       └── spatialspin.js
└── README.md
```

## 🛠 Tech Stack

- Vanilla JavaScript (no frameworks, no build step)
- CSS custom properties for theming
- Web Audio API for sounds
- SVG for charts and progress rings
- `localStorage` for persistence
- Service Worker for offline / PWA

## 📄 License

MIT
