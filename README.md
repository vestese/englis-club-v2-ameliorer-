# Accra English Club 🌟 — English Learning Games App

> A web app of games for learning English, in **groups** (on a TV, run by a referee) or **solo**. The whole app is in English. Works **offline**, with no installation.

[![GitHub](https://img.shields.io/badge/GitHub-vestese%2Fenglis--club--v2-181717?logo=github&style=flat-square)](https://github.com/vestese/englis-club-v2-ameliorer-/tree/main)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&style=flat-square)](https://python.org)

---

## 👨‍💻 Concepteur / Designer

| | |
|---|---|
| **Nom** | Steve Kabore Aymar Séraphin |
| **Titre** | 🎓 Ingénieur de Conception — Génie des Systèmes Numériques |
| 📱 **WhatsApp** | [69 65 31 27](https://wa.me/22669653127) |
| 📧 **Email** | [kaboesteven@gmail.com](mailto:kaboesteven@gmail.com) |
| 💻 **GitHub** | [vestese/englis-club-v2-ameliorer-](https://github.com/vestese/englis-club-v2-ameliorer-/tree/main) |

---

## 🚀 Installation & Démarrage

### ✅ Option 1 — Utilisation directe (sans serveur, recommandé pour débuter)

1. **Télécharger** le projet :
   ```bash
   git clone https://github.com/vestese/englis-club-v2-ameliorer-.git
   cd englis-club-v2-ameliorer-
   ```
   > Ou téléchargez le ZIP depuis GitHub → **Code** → **Download ZIP**, puis décompressez.

2. **Double-cliquez** sur le fichier **`index.html`** — il s'ouvre directement dans votre navigateur (Chrome, Edge, Firefox…). C'est tout !

   > 💡 **Astuce réunion** : connectez l'ordinateur au TV/projecteur, ouvrez `index.html`, puis passez en plein écran avec **F11**.

*Note : certaines fonctionnalités (streak quotidien, classement saison, modifications de contenu persistantes) peuvent ne pas être sauvegardées en ouverture directe. Pour tout conserver, hébergez le projet en ligne (voir Options 2 & 3).*

---

### 🐍 Option 2 — Avec le serveur Python local (fonctionnalités complètes)

#### Prérequis

- **Python 3.10+** → [Télécharger Python](https://www.python.org/downloads/)
- **pip** (inclus avec Python)

#### Étapes

1. **Cloner** le dépôt :
   ```bash
   git clone https://github.com/vestese/englis-club-v2-ameliorer-.git
   cd englis-club-v2-ameliorer-
   ```

2. **Créer un environnement virtuel** (recommandé) :
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS / Linux
   source venv/bin/activate
   ```

3. **Installer les dépendances** :
   ```bash
   pip install -r requirements.txt
   ```

4. **Lancer le serveur** :
   ```bash
   python qserver.py
   ```

5. **Ouvrir** dans le navigateur :
   ```
   http://localhost:5000
   ```

#### Dépendances principales (`requirements.txt`)

| Paquet | Rôle |
|--------|------|
| `flask` | Serveur web |
| `flask-socketio` | Multijoueur temps réel |
| `eventlet` | Serveur async |
| `gunicorn` | Production |

---

### ☁️ Option 3 — Hébergement en ligne gratuit (Render / Vercel / Netlify)

#### Render (recommandé pour le mode serveur complet)

1. Créez un compte sur [render.com](https://render.com)
2. Cliquez **New → Web Service**
3. Connectez votre dépôt GitHub
4. Les paramètres sont déjà configurés dans `render.yaml` :
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `gunicorn qserver:app`
5. Cliquez **Deploy** — vous obtenez un lien public 🎉

#### Vercel (mode statique, sans serveur Python)

1. Créez un compte sur [vercel.com](https://vercel.com)
2. **New Project → Import** votre dépôt GitHub
3. La config `vercel.json` est déjà présente
4. Cliquez **Deploy**

#### Netlify (drag & drop)

1. Créez un compte sur [netlify.com](https://netlify.com)
2. Glissez-déposez **le dossier du projet** dans l'interface
3. Partagez le lien obtenu avec le club !

---

## ▶️ Comment utiliser l'application

### 🗓️ Mode Réunion (recommandé pour animer une séance)

Cliquez sur **"Meeting Mode"** — le mode guidé qui enchaîne automatiquement :

1. **🔥 Échauffement** — mots à répéter en groupe avec prononciation
2. **🏆 Le Grand Défi** — plateau de jeu par équipes
3. **🗣️ Jeu oral** — cartes de conversation
4. **📚 Révision des mots** — récap de la session
5. **🥇 Podium** — classement final avec confettis

---

### 👥 En groupe — Jeux sur grand écran (mode arbitre)

Ouvrez **"Jouer en groupe"** et choisissez :

| Jeu | Description |
|-----|-------------|
| 🏆 **Grand Défi** | Plateau 8 thèmes × 5 niveaux, vol de points, cadeaux mystères |
| 🐝 **Spelling Bee** | Un mot est énoncé à voix haute — les équipes l'épellent |
| 🔤 **Anagramme** | Mots mélangés sur tuiles colorées, timer, indices |
| 📝 **Grammar Duel** | Complète la phrase, vole les points (règle Chrono Steal) |
| 🔗 **Word Chain** | Chaîne de mots, chaque mot commence par la dernière lettre |
| 🎡 **Roue** | Roue de défis et de tranches spéciales (JACKPOT, BANKRUPT…) |
| 🎭 **Charades** | Mime sans parler — ton équipe devine |
| 🔡 **Word Builder** | Forme des mots depuis un set de 22+ lettres |

---

### 👤 Solo — Entraînement personnel

| Exercice | Description |
|----------|-------------|
| 🖼️ **Word Match** | Associe image et mot anglais (650+ mots) |
| 🐝 **Spelling Bee** | Écoute → épelle le mot |
| ✍️ **Fill in the Blank** | Grammaire : conjugaisons, articles, prépositions |
| 🔤 **Anagramme** | Version solo avec timer |

> 🔊 Bouton prononciation disponible partout.  
> 📅 Streak quotidien et compteur de mots vus.

---

### 📖 Mode Apprentissage (`/learning.html`)

- Téléversement de leçons PDF (stockées dans `uploads/`)
- Navigation vocabulaire, prononciation, verbes à particule
- Contenu tiré de `content/content.js`

---

## ✏️ Modifier le contenu

### Éditeur visuel (aucun code requis)

Depuis l'écran d'accueil → **"✏️ Gérer le contenu"** :
- **Grand Défi** : ajouter/modifier/supprimer questions et thèmes
- **Vocabulaire** : gérer les mots, emojis, catégories
- **Grammaire** : phrases à trou (`___` = emplacement du blanc)
- **Anagrammes** : liste de mots

| Action | Effet |
|--------|-------|
| ⬇️ Exporter (.json) | Sauvegarde un fichier à partager |
| ⬆️ Importer un pack | Recharge un .json exporté |
| 💾 Rendre permanent | Télécharge `content.js` → à placer dans `/content/` |
| ↺ Réinitialiser | Retour au contenu d'origine |

### À la main (optionnel)

Éditez directement **`content/content.js`** avec un éditeur de texte.
Respectez la structure existante. Ajoutez `gift: true` à une question `grandDefi` pour en faire une cellule cadeau mystère 🎁.

---

## 🗂️ Structure des fichiers

```
englis-club-v2-ameliorer-/
├── index.html              ← Page d'accueil (ouvrir ce fichier)
├── games.html              ← Hub des jeux
├── learning.html           ← Mode apprentissage
├── teaching.html           ← Espace enseignant
├── css/
│   ├── styles.css          ← Système de design principal
│   ├── premium.css         ← Styles premium & glassmorphisme
│   └── arcade-and-stories.css
├── content/
│   ├── content.js          ← LE CONTENU (modifiable)
│   └── description_data.js
├── js/
│   ├── app.js              ← Écran d'accueil
│   ├── util.js             ← Outils (navigation, son, confetti, sauvegarde)
│   ├── solo.js             ← Jeux solo
│   ├── group.js            ← Jeux en groupe
│   ├── multiplayer.js      ← Mode multijoueur temps réel
│   ├── meeting.js          ← Mode réunion complet
│   ├── editor.js           ← Éditeur de contenu visuel
│   └── theme.js            ← Gestion thème clair/sombre
├── qserver.py              ← Serveur Python (Flask + Socket.IO)
├── requirements.txt        ← Dépendances Python
├── render.yaml             ← Config déploiement Render
├── vercel.json             ← Config déploiement Vercel
├── DESIGN.md               ← Document de design complet
└── README.md               ← Ce fichier
```

---

## 🔧 Dépannage

| Problème | Solution |
|----------|----------|
| La page ne s'ouvre pas | Vérifiez que `index.html` est bien dans le bon dossier |
| TTS ne fonctionne pas | Utilisez Chrome ou Edge (meilleur support Web Speech API) |
| Streak non sauvegardé | Hébergez en ligne ou utilisez le serveur Python |
| Socket.IO erreur | Ignoré en mode fichier local, c'est normal |
| Port 5000 occupé | Modifiez le port dans `qserver.py` |

---

## 🌐 Contribuer

1. **Fork** le dépôt sur GitHub
2. Créez une branche : `git checkout -b feature/ma-fonctionnalite`
3. Committez vos changements : `git commit -m "feat: description"`
4. Poussez : `git push origin feature/ma-fonctionnalite`
5. Ouvrez une **Pull Request**

---

*Conçu avec ❤️ par **Steve Kabore Aymar Séraphin** pour l'apprentissage de l'anglais — Accra English Club*

# englis-club-v2-ameliorer-
