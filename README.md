# 🧠 NeuroZen — Train Your Brain

A beautiful, mobile-first brain training web app with 8 science-inspired mini-games. No account, no server — all progress is saved locally in your browser.

## ✨ Features

- **8 Brain Games** — Schulte Table, Memory Matrix, Pattern IQ, Word Flash, Word Chain, Quick Math, Color Stroop Xtreme, and an IQ Test
- **Brain Score System** — earn points, level up from Beginner to Master (0–1000)
- **Skill Tracking** — Memory, Focus, Logic & Speed bars that grow as you play
- **Streaks & Daily Goals** — play every day to keep your 🔥 streak alive
- **15 Achievements** — unlock badges with confetti celebrations
- **Progress Charts** — 7-day brain score history with smooth line charts
- **Relax Mode** — generated ambient soundscapes (rain, ocean, forest, white noise) + box breathing guide
- **Dark Mode** — full light/dark theme support
- **Sound Effects** — Web Audio API generated tones, no audio files needed
- **100% Offline-Friendly** — pure HTML/CSS/JS, data stored in `localStorage`

## 🎮 Games

| Game | Skill | Description |
|------|-------|-------------|
| ▦ Schulte Table | Focus | Tap numbers 1→N in order, 5 difficulty levels (3×3 to 7×7) |
| 🧠 Memory Matrix | Memory | Memorize highlighted cells, then recall them |
| 💡 Pattern IQ | Logic | Color, number & matrix pattern puzzles |
| 📝 Word Flash | Memory | Remember a flashed word under time pressure |
| 🔗 Word Chain | Memory | Recall an ever-growing chain of words in order |
| 🔢 Quick Math | Speed | 5 difficulty tiers, combo multipliers |
| 🎨 Color Stroop Xtreme | Focus | Tap the ink color, not the word |
| 🧩 IQ Test | Reasoning | 15 Hinglish reasoning questions |

## 🚀 Run Locally

No build step needed — it's a static site:

```bash
git clone https://gitlab.com/agam123-group/neurozen.git
cd neurozen
# open index.html in a browser, or serve it:
python3 -m http.server 8000
```

Then open http://localhost:8000

## 📁 Project Structure

```
neurozen/
├── index.html       # App shell
├── css/
│   └── style.css    # All styles (light + dark theme)
├── js/
│   └── app.js       # Game logic, state, rendering
└── README.md
```

## 🛠 Tech Stack

- Vanilla JavaScript (no frameworks)
- CSS custom properties for theming
- Web Audio API for sounds
- SVG for charts and progress rings
- `localStorage` for persistence

## 📄 License

MIT
# neurozen
