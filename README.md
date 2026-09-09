# Accra English Club 🌟 — English learning games app

A web app of games for learning English, in **groups** (on a TV, run by a referee) or **solo**. The whole app is in English. Works **offline**, with no installation.

---

## ▶️ How to run it

**Simplest way:** double-click the **`index.html`** file. It opens in your browser (Chrome, Edge, Firefox…). That's it.

> Meeting tip: connect the computer to the TV/projector, open `index.html`, then go fullscreen (press **F11**).

*Note: some saving features (daily streak, season leaderboard, your content edits) may not persist when you open the file directly. To keep everything, host the folder online (see below) — it's free — or use the editor's "Make permanent" button.*

---

## 🎮 What's in the app

### 🗓️ Meeting Mode — hosts the whole session (recommended)
The **"Meeting Mode"** button guides the host through an entire club meeting:
1. **🔥 Warm-up** — a few words on the TV, to repeat together (with pronunciation).
2. **🏆 The Big Challenge** — the big team game (see below).
3. **🗣️ Speaking game** — English conversation cards; the referee gives participation bonus points.
4. **📚 Word review** — go over the words of the session together.
5. **🥇 Podium** — final ranking with confetti, saved to the season leaderboard.

The **teams** and their **points** carry over from stage to stage. You can choose which stages to include before starting.

### In a group — games on the TV (referee mode)
Open **"Play in a group"**, then pick:

**🏆 The Big Challenge** — a game-show board:
- **8 topics** (Sport, Music, History, Geography, Science, Food, Animals, Cinema).
- Each topic has questions worth **100, 200, 300…** (the more points, the harder).
- The referee creates the **teams**, then each team picks a cell.
- **Chrono Steal**: the team answers during the **green** phase; if they get it wrong or run out of time, the **orange** phase opens the question to the other teams, who can **steal the points**.
- **Mystery gift 🎁**: on some cells, the winning team gets a gift they **keep or give away blindly** (minor point gifts or rare **Major Tier game-changers** like 🔄 Point Swap, 💥 Score Steal %, 🎯 Leader Target, 💣 Bankrupt, 🎁 Jackpot, 🧊 Freeze, 🃏 Reverse Ranking!).
- **Podium** with confetti at the end.

**🐝 Spelling Bee** — a listening and spelling challenge on TV:
- A word is **spoken out loud (TTS)** on the TV, but **never shown**.
- The team spells the word out loud, and the referee types what they said.
- Supports **Beginner mode** (with emoji image hint) and **Medium mode** (audio-only). Correct spelling awards 100 pts.

**🔤 Anagram** — each team gets a time budget. Scrambled words appear one at a time (big colour-friendly tiles); the team says the word and the **referee types it in**. A correct word scores up to 100 points and the next word appears; a **wrong answer cuts 5 seconds** off the clock; each team may **pass up to 3 words**. Stuck? A **💡 hint reveals the next letter** but lowers that word's points (100 → 60 → 30 → 20). Referee typos are forgiven — a close spelling still counts, so a mistype never penalises the team. When time runs out it's the next team's turn.

**📝 Grammar Duel** — a fill-the-gap sentence and its options on the TV. Pick a **topic** (verb tenses, active & passive, modal verbs, tag questions…) or play a mix. Same Chrono Steal rule, 100 points per correct answer.

**🔗 Word Chain** — a starting word appears; each new word must begin with the **last letter** of the previous one. The referee types each word the team says; the app checks the letter and blocks repeats. Every valid word scores points. Two modes:
- **Each team separate** — every team gets its own timed round and builds the longest chain it can.
- **One shared chain (steals)** — teams take turns adding to a single chain; if a team gets **stuck** (runs out of time or passes), the other teams can **steal the points** by supplying the next word.

**🎡 Spin the Wheel** — a game-show wheel of **challenges and special slices**. The referee spins; it can land on:
- a **Challenge** (Easy 50 / Medium 100 / Hard 200 pts) — the team must **perform it before a timer runs out**. Succeed and score the stake; **fail and the other teams can steal it**, or (if nobody steals) the team draws a **gage** — a fun forfeit.
- a **Special slice**: **JACKPOT** (+300), **DOUBLE** (a challenge worth double), **STEAL** (take points from the leader), **SWAP** (swap scores with the leader), **BANKRUPT** (lose half), **BONUS** (+150), or **IMMUNITY** (skip your next gage).

The challenges and gages are editable in the content file.

**🎭 Charades** — one actor from the team reads a secret word (everyone else looks away!), then **mimes** it — no talking — while their team guesses before the timer runs out. A correct guess scores points; the word is revealed at the end either way. The word list is editable in the content file.

**🔡 Word Builder** — each team gets its own box of **22+ letters, sorted A→Z** for easy scanning (letters can repeat). The team first looks at the letters, then the referee presses **▶ Start** to begin the timer. Team members call out words made only from those letters — each letter used no more than it appears, minimum 3 letters — and the **referee types each word live** as it's said. **Longer words score more** (a word is worth its length squared), and every valid word scores instantly. Then it's the next team's turn on a fresh box of letters; highest total wins.

### Solo — practice
- **Word Match** — see a picture and choose the matching English word (from 650+ words base).
- **Spelling Bee 🐝** — hear the word spoken out loud via TTS and type the exact spelling (optional image hint toggle).
- **Fill in the Blank** — grammar (verb to be, articles, plurals, prepositions…).
- **Anagram** — a timed challenge: scrambled words appear on big colour-friendly tiles (with a picture + letter-count hint) and you **type** each one. A wrong answer costs 5 seconds and you can pass up to 3 words; solve as many as you can before the clock runs out.
- A **🔊** button everywhere to **hear the English pronunciation**.
- **Daily streak** and a words-seen counter.

---

## ✏️ Editing the content (adding your questions)

### Easiest: the visual editor (no coding)

From the home screen, click **"✏️ Manage content"**. You can:

- **The Big Challenge** — add/edit/delete topics and their questions (question, answers, correct answer, points value, gift cell 🎁).
- **Vocabulary** — add/edit words (word, emoji/picture, category).
 
## Learning mode

Visit `/learning.html` to access the Learning UI. You can upload PDF lessons (stored in `uploads/`) and browse vocabulary, pronunciation and phrasal verbs pulled from `content/content.js`.
- **Grammar** — add fill-in-the-blank sentences (put `___` where the blank goes).
- **Anagrams** — manage the word list.

Your changes are **saved automatically in the browser**. Then:

- **⬇️ Export pack (.json)** — saves a file to keep or **share** with another host.
- **⬆️ Import a pack** — reloads a `.json` file you exported.
- **💾 Make permanent (content.js)** — downloads a `content.js` file; put it in the `content` folder (replace the old one) to keep your changes **for good**, even after clearing the browser.
- **↺ Reset** — go back to the original content.

### By hand (optional)

All the starter content is in **`content/content.js`** (open it with a text editor). Keep the **same structure** as the examples, save, then reload the page. Add `gift: true` to a `grandDefi` question to make it a **mystery gift** cell.

---

## 🌐 Host it online (optional, free)

To share a link and keep all saved data:
1. Create a free account on **Netlify** or **Vercel**.
2. Drag and drop this folder.
3. You get a link to share with the club.

---

## 🗂️ File structure

```
club_anglais_accra/
├── index.html          ← open this file
├── css/styles.css      ← the look
├── content/content.js  ← THE CONTENT (editable)
├── js/
│   ├── util.js         ← tools (navigation, sound, confetti, saving)
│   ├── solo.js         ← the solo games
│   ├── group.js        ← group games (The Big Challenge + Anagram)
│   ├── meeting.js      ← Meeting Mode (full session)
│   ├── editor.js       ← visual content editor
│   └── app.js          ← home screen
├── DESIGN.md           ← the full design document
└── README.md           ← this file
```

---

*Built for the Accra English Club. The interface and all content are in English.*
