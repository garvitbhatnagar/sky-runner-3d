# ⚡ Sky Runner 3D – Endless Horizon (Pro Edition)

A commercial-grade browser & desktop 3D endless runner built with **Three.js**, **Web Audio**, **Python**, and **Supabase Realtime**.

Deploys seamlessly on **Vercel**, **Netlify**, **GitHub Pages**, and **Windows Desktop** with zero budget and zero external paid dependencies.

---

## 🌟 Upgraded Pro Features

### 1. 🎨 10 Expandable 3D Worlds & Environments
Dynamic biomes with custom sky gradients, horizon fog, ground terrain, lighting, roadside decorations, and atmospheric particle systems:
1. **Green Forest** – Sunlit forest trail bordered by lush evergreen pines and rolling hills.
2. **Snow Mountains** – Alpine pass surrounded by frosted pines and swirling snow flurries.
3. **Desert Highway** – Scorching sunbaked highway flanked by giant saguaro cacti and red dunes.
4. **Neon Cyber City** – Synthwave metropolis with glowing neon grids and cyber skyscrapers.
5. **Tropical Island** – Golden sand road bordered by turquoise ocean waters and coconut palms.
6. **Space Station** – Orbital catwalk floating above Earth with asteroid hazard fields.
7. **Volcano Valley** – Obsidian highway winding past boiling magma rivers and smoke plumes.
8. **Futuristic Sky City** – Glass skyway suspended high in the clouds between aerodynamic spires.
9. **Night Highway** – Midnight expressway illuminated by streetlights with distant skyline views.
10. **Ancient Temple** – Overgrown stone path passing carved ruin pillars and flame braziers.

*Biomes dynamically progress every 2 levels or can be manually selected in Settings.*

---

### 2. 🥷 12 Unlockable Character Skins & 3D Cosmetic Shop
- **12 Unique 3D Runner Skins**:
  - *Horizon Runner* (Default Athletic Suit)
  - *Cyber Ninja* (Stealth Carbon Suit with Cyan Lines)
  - *Neon Blaze* (Synthwave Magenta Speedster)
  - *Arctic Explorer* (Thermal Polar Parka & Goggles)
  - *Desert Nomad* (Wasteland Survivor Cloak)
  - *Cosmic Astronaut* (NASA Space Suit with Gold Visor)
  - *Crimson Samurai* (Lacquered Red Battle Armor)
  - *Golden Champion* (Prestige 24k Pure Gold Plating)
  - *Toxic Raider* (Biohazard Spec Ops Suit)
  - *Shadow Phantom* (Dark Matter Nebula Entity)
  - *Retro Arcade* (1984 8-Bit Pixel Attire)
  - *Mecha Titan* (Heavy Hydraulic Exoskeleton)
- **Cosmetic Speed Trails**: Cyan Plasma, Golden Stardust, Neon Fire, Void Smoke.
- **Headwear & Accessories**: Royal Gold Crown, Cyber Halo, Tactical VR Goggles, Shinobi Headband.
- **Interactive 3D Shop Viewport**: Live spinning 3D character preview rendered inside the shop modal!
- **100% In-Game Earned Coins**: Zero real-money microtransactions.

---

### 3. 🎁 7-Day Daily Rewards System
- Day 1: **+50 Coins**
- Day 2: **+75 Coins**
- Day 3: **+100 Coins**
- Day 4: **+150 Coins**
- Day 5: **+200 Coins**
- Day 6: **+300 Coins**
- Day 7: **+500 Coins (MEGA REWARD)**
- Interactive 7-day visual calendar with claimed badges and glowing claim targets.
- 20-hour anti-cheat cooldown timer with countdown display.
- Coin shower celebration particle animation.

---

### 4. 🏆 Global Online Leaderboard
- **Rankings**: Daily, Weekly, and All-Time leaderboards.
- **Podium Highlights**: Golden Trophy (#1), Silver Medal (#2), and Bronze Medal (#3) podiums.
- **Player Nicknames**: Customizable nicknames with automatic guest ID assignment.
- **Anti-Cheat Validation**: Server and client mathematical score validation rules.
- **Backend**: Supabase free-tier database with local fallback cache.

---

### 5. 🌐 Real-Time Online Multiplayer (Up to 4 Players)
- **Room Creation**: Instant 6-character room code generation (`SKY-XXXX`) with 1-click clipboard copy.
- **Join by Code**: Race against friends or competitors worldwide.
- **Live 3D Competitor Rendering**: Opponents rendered directly on the road with overhead nametags.
- **Real-Time Position Sync**: High-frequency physics, lane switching, jumping, sliding, and score sync.
- **Live Race Standings HUD**: In-race ranking card showing distances, scores, and status.
- **Multiplayer Results Podium**: Placement ranks (1st to 4th), medals, and bonus coin awards.
- Built on **Supabase Realtime** with zero-config local multi-tab/LAN `BroadcastChannel` testing out of the box!

---

### 6. 📱 Responsive Mobile & Tablet Controls
- Touch swipes (Left/Right steer, Up jump, Down slide).
- Ergonomic on-screen tactile button clusters.
- Dynamic screen scaling and DPR capping for smooth 60 FPS on Android and iOS.
- Graphic fidelity selector in Settings (High, Medium, Low).

---

## 🎮 Controls

| Action | Desktop / Windows | Mobile (Android & iOS) |
| :--- | :--- | :--- |
| **Steer Left** | `A` or `Left Arrow` | Swipe Left or tap `◀` |
| **Steer Right** | `D` or `Right Arrow` | Swipe Right or tap `▶` |
| **Jump** | `Space` / `W` / `Up Arrow` | Swipe Up or tap `▲` |
| **Slide / Duck** | `S` / `Down Arrow` | Swipe Down or tap `▼` |
| **Pause / Resume** | `P` or `Escape` | Tap Pause button `❚❚` |

---

## 🚀 How to Run Locally

### 1. Launch with Python
```bash
python main.py
```
- Starts local Python server on `http://localhost:8000`.
- Displays mobile Wi-Fi IP and terminal QR code for phone play.
- Launches native desktop window or default browser.

### 2. Run with Custom HTTPS Domain
```bash
python main.py --https
# Opens https://sky-runner-3d.com
```

### 3. Build Standalone Windows .exe
```cmd
build_exe.bat
```

---

## ☁️ Free-Tier Supabase Backend Setup

To connect your own free Supabase project:
1. Create a free account at [supabase.com](https://supabase.com).
2. Create a new project.
3. Open the **SQL Editor** in Supabase and paste the contents of `supabase_schema.sql`, then click **Run**.
4. In Supabase **Project Settings -> API**, copy your **Project URL** and **anon public key**.
5. Paste them into `js/config.js` under `window.GAME_CONFIG.SUPABASE`.
6. That's it! Leaderboards and Realtime Multiplayer are live globally!

---

## 🌐 Free Deployments (Vercel & Netlify)

- **Vercel**: Pre-configured via `vercel.json` (`outputDirectory: "static"`).
- **Netlify**: Pre-configured via `netlify.toml` (`publish = "static"`).
- **GitHub Pages**: Pre-configured with `CNAME` for `sky-runner-3d.com`.
