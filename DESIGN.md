# Club Anglais Accra — Web App Design

*A game-based English learning app for beginner learners, built for in-person club meetings and solo practice.*

---

## 1. Who it's for

- **Players:** Beginner English learners (French-speaking, Accra).
- **Design consequence:** The interface language is **French**, the content being learned is **English**. Menus, buttons, and instructions appear in French (with English shown too, so players get used to it). Game *content* — the words, sentences, questions — is in English.
- **Setting:** In-person club meetings. One shared screen (projector/laptop) runs the "host" view; each player uses their own phone to join and answer. Also works for a single person practicing alone at home.

---

## 2. The two modes

### Mode A — Group Play (the meeting centerpiece)
**Referee-run, single screen, TV game-show style.** No phones, no accounts, no room codes. Works like this:
1. The **referee** (club leader) opens the app on one device (laptop/phone) connected to a **TV/projector**.
2. Before starting, the referee sets up **teams** — e.g. `Équipe A`, `Équipe B` (or individual players). Just names, added on the spot.
3. The referee picks a game, category, and difficulty.
4. A question appears **big on the TV**. Teams answer **out loud** (or raise hands / buzz in) — the referee decides who answered first.
5. The referee taps **✅ to award points** to the team that got it right (or ❌ / reveal the answer). Scores update on screen.
6. A **scoreboard** is always visible; a **podium celebration** shows the winning team at the end.

**Key point:** the whole game lives in the referee's one device. Everything is controlled by the referee's taps. This makes it dead-simple and works with zero internet.

### Mode B — Solo Practice
Self-paced, single player on one device. Focus on repetition, streaks, and gentle difficulty. Good for homework between meetings. Fully offline.

---

## 3. The games (launch set)

Starting focused, then expanding. **Phase 1** is what we build first.

### Phase 1 — Minimum viable club app
| Game | Mode | Skill | How it works |
|------|------|-------|--------------|
| **Quiz Battle** | Group | Vocabulary, grammar | Question shown big on the TV; teams answer aloud; referee taps who scored. Team scoreboard. The group centerpiece. |
| **Spelling Bee** | Solo / Group | Listening, spelling | Word pronounced via TTS (never shown); type/spell exact word; optional image hint toggle. |
| **Word Match** | Solo | Vocabulary | Match English words to pictures or French meanings. Timed. |
| **Fill in the Blank** | Solo | Grammar | Pick the right word to complete a sentence (a / an / the, is / are, verb tenses). |
| **Anagram Scramble** | Solo / Group | Spelling | Unscramble jumbled letters into an English word (picture hint for beginners). |

### Phase 2 — Add once Phase 1 works
| Game | Mode | Skill |
|------|------|-------|
| **Taboo** | Group | Speaking — describe a word without using forbidden words |
| **Hangman / Word Guess** | Solo or Group | Spelling |
| **Listen & Type** | Solo | Listening — audio plays, type what you hear |
| **Odd One Out** | Solo | Vocabulary — pick the word that doesn't belong |
| **Charades / Act It Out** | Group | Speaking, fun |

### Phase 3 — Nice-to-have
Jeopardy board, Story Chain, Minimal Pairs (pronunciation), speech-recognition "Say It", Pictionary.

---

## 4. Content & difficulty (built for beginners)

- **Skill areas covered:** vocabulary, **grammar** (articles, verb tenses, prepositions, plurals, word order), spelling, listening, and pronunciation.
- **Themes/categories** so content stays relevant: Greetings, Family, Food, Numbers, Colors, Animals, Days & Time, Classroom, Body, Weather, plus **Grammar** categories (e.g. "a / an / the", "is / are / am", "Present simple").
- **Three difficulty levels:** Débutant / Facile / Moyen (Beginner / Easy / Medium). The referee picks a level for group games; solo adjusts automatically.
- **Pictures matter** for beginners — many words paired with simple images.
- **Content is data, not code** — questions live in simple files (JSON), so the club leader can add or edit questions without touching the app.

---

## 5. Screens

**Home** — two big friendly buttons: `Jouer en groupe` (Group / referee mode) · `Jouer seul` (Solo). Plus a small `Gérer le contenu` (Manage content) link for the editor.

**Group / referee flow (all on one screen, shown on the TV):**
1. **Team setup** — add teams (`Équipe A`, `Équipe B`…), pick game + category + difficulty.
2. **Question screen** — big question and answer options, with a persistent **team scoreboard** on the side.
3. **Referee controls** — reveal answer, and **+point / −point buttons per team**; Next question.
4. **Podium** — winning team celebration at the end.

**Solo flow:** pick game → pick category → play → score + streak → "play again".

---

## 6. Recommended tech stack

Because group play is **all on one device** (no phones, no room codes), there is **no backend to build** — this is a big simplification. The whole app runs in the browser and works offline.

- **Frontend:** React + Vite (fast, modern) with Tailwind CSS for quick, colorful, mobile- and TV-friendly styling.
- **No server / no database needed** — game content lives in simple JSON files bundled with the app; scores are kept in memory during a game; solo progress and any custom content are saved in the browser's local storage.
- **Hosting:** Vercel or Netlify — free tier, gives you a shareable web link. Or run it fully offline as an installable PWA.
- **Offline-first:** Built as a PWA so it works even with no club WiFi — install once, play anytime.

---

## 7. Build plan

- **Step 1:** Project scaffold + Home screen + French UI framework + starter content pack (JSON).
- **Step 2:** Solo mode with Word Match + Fill-in-the-Blank + Anagram — quick, playable win.
- **Step 3:** Group **referee mode** — team setup, question screen, scoreboard, +/− scoring, podium.
- **Step 4:** Content editor so the club leader can add/edit questions (saved locally, exportable).
- **Step 5:** Polish — sounds, animations, streaks, offline PWA. Then Phase 2 games (Taboo, Charades, Hangman…).

---

## 8. Decisions (locked in)

1. **No accounts, no nicknames, no logins** — nothing to sign up for. ✅
2. **Content:** ship a **beginner starter pack** *and* build a simple **editor** so the club leader can add their own questions. ✅
3. **Group play:** one device projected to a **TV**, run by a **referee** who awards points to teams. No player phones. ✅

4. **Mystery Gift:** appears on marked "🎁 gift questions"; effects are half good / half bad and small (~±3 pts), editable. ✅

### Still to confirm
- **App name & branding** — "Club Anglais Accra"? Any preferred colors or a logo?

---

## 9. Confirmed feature set

**Learning (turns every game into a mini-lesson):**
- Grammar as a first-class skill area (articles, tenses, prepositions, plurals, word order)
- French translation revealed after each answer
- Pronunciation audio — tap a speaker to hear the English word (browser text-to-speech, free)
- Pictures paired with vocabulary
- Post-game **word review** — recap of the words/rules that came up, for group revision

**Referee / group play:**
- Flexible teams (2–6), editable names, simple **+/− scoring** with custom point values
- **Chrono Steal** two-phase timer (see §10)
- **Mystery Gift** mechanic (see §10)
- Sound effects — correct ding, wrong buzz, timer tick, applause
- Hints / lifelines — 50/50, reveal first letter, picture clue

**Extras:**
- **Content editor** (add/edit questions, import/export packs)
- **Podium + confetti** celebration for the winning team
- **Category wheel** — spin to pick the next topic
- **Solo streaks & progress** — daily streak and "words learned" tracker

---

## 10. Signature group-play mechanics

### ⏱️ Chrono Steal (two-phase timer)
Each question is assigned to one team (their turn). The timer runs in two phases:
- **Phase 1 — "Your turn" (bar green):** only the assigned team may answer.
- **Phase 2 — "Open to all" (bar orange):** if the assigned team didn't answer in Phase 1, any other team can jump in and steal the points.

The referee taps whichever team actually answered to award the points. The timer is a big visual on the TV so everyone feels the pressure. (Referee can adjust phase length, or turn the timer off entirely for very new beginners.)

### 🎁 Mystery Gift
When a team answers correctly on a gift cell, they earn a **Cadeau mystère**:
1. The team **chooses first, blind** — *keep it* or *give it to another team* — without knowing what's inside.
2. The gift is then **revealed** and its effect applied immediately.
3. Effects are split into two distinct tiers:
   - **Minor Tier (frequent, small balance):** ±2 or ±3 points deltas.
   - **Major Tier (rare, high impact game-changers):**
     - 🔄 **Point Swap (`swap`):** Swap total score with another team of choice.
     - 💥 **Score Steal (`steal`):** Steal 35% of the leader's points.
     - 🎯 **Leader Target (`leader_target`):** Leader loses 30% points, distributed to all other teams.
     - ⚡ **Double or Nothing (`double_or_nothing`):** Next turn correct = 2x points, wrong = score resets to 0.
     - 💣 **Bankrupt (`bankrupt`):** Score resets to 0.
     - 🎁 **Jackpot (`jackpot`):** Win +300 bonus points!
     - 🧊 **Freeze (`freeze`):** Frozen for 1 full turn (skip turn).
     - 🃏 **Reverse Ranking (`reverse`):** Total ranking reversal among all teams!

**Confirmed rules:**
- **Frequency:** gifts appear on **marked "🎁 gift questions"** only — special, controlled, dramatic moments the referee sees coming.
- **Rarity balance:** **minor tier** (small ±2-3 pts) for standard gifts, **major tier** (game-changers) reserved for rare high-impact moments.
- All gift effects live in **editable content**, so you can tune, rebalance, or add your own later.

---

## 11. Expanded scope (confirmed additions)

**🗓️ Meeting Mode** — a **session playlist** that runs a whole club meeting end to end: Warm-up → Main Quiz Battle → Speaking game → Word Review → Podium. The app guides the referee through each stage with timers. Ships with a ready-made default session that leaders can customize.

**Grammar games** (dedicated grammar practice):
- **Spot the Error** — find and fix the one mistake in a sentence
- **Build the Sentence** — drag scrambled words into the correct order
- **Tense Race** — put a verb into the right tense, fast
- **Singular ↔ Plural** — quick sorting

**Speaking games** (get beginners talking):
- **Simon Says** — listening + action commands (ideal for beginners)
- **Role-Play cards** — act out real situations (order food, greet someone, ask directions)
- **Word Chain** — last letter of one word starts the next
- **Category Race** — "Name 5 animals in 30 seconds!"

**🌍 Local Accra flavor** — example sentences and **scenario packs** rooted in Ghana/Accra life (market, trotro, jollof, cedis, school, phone call) so English feels relevant and fun.

**🏅 Season leaderboard** — team standings tracked across multiple meetings, e.g. "Champions of the month." (Stored locally on the referee's device.)

> **Note:** these expand the app well beyond the original Phase 1. Suggested sequencing: Phase 1 as before → then Meeting Mode + grammar/speaking games → then local packs + season leaderboard. Build order to be finalized before coding.

---

## 12. Flagship group game — "Le Grand Défi" (The Big Challenge)

A game-show board game — the centerpiece of a club meeting.

### The board
- **8 topic columns** (editable): e.g. Sport, Music, History, Geography, Science, Food, Animals, Cinema.
- Under each topic, **20 questions stacked as point values**, one after another: **100, 200, 300 … up to 2000**.
- **Higher points = harder question** (a difficulty ladder within each topic).
- Displayed as a big grid on the TV (8 columns × 20 point rows).

### How a turn works
1. It's a team's turn. From the board, the **team picks a cell** — a topic **and** a point level (how risky they want to go: 100 = safe/easy, 2000 = hard/big reward).
2. The referee reveals that question big on the TV; the **Chrono** starts.
3. **Answering & stealing:**
   - If the team answers correctly in time → they win the points.
   - If the team **doesn't answer in the first phase of the timer, OR answers wrong** → the question **opens to the other teams**, who can jump in and **steal the full points**.
4. The **cell greys out** — each question is used only **once**.
5. Play passes to the next team.

### End of game
The board plays down until **all cells are cleared** (or the referee ends the session / time runs out). Highest team score wins → podium + confetti.

### Notes / implications
- **8 × 20 = 160 questions per board** — a lot of content. So: (a) the **content editor** is essential here, (b) a board can be played **partially** (referee can end anytime), and (c) boards are **saved packs** you can reuse or swap (e.g. a "Sport & Music night").
- This game reuses the **Chrono Steal** mechanic from §10, extended so a **wrong answer also opens the steal** (not just a timeout).
- **Mystery Gift 🎁** can optionally be attached to specific cells for extra drama.
- Referee controls throughout: reveal, judge correct/wrong, award/steal, next turn, pause.
