# ⚡ Sky Runner 3D - Endless Horizon

An endless 3D runner game built with **Python**, **Three.js**, **Web Audio**, and **real-time 3D physics**. Designed to run on **Windows**, **Android**, and **iOS**.

---

## 🌟 Key Features

1. **3D Graphics & Visuals**:
   - Vibrant blue sky with drifting procedural 3D white clouds.
   - 3-lane asphalt road with animated speed markings and red/white hazard curbs.
   - Lush rolling green terrain on both sides populated with 3D trees (pines & deciduous) and roadside vegetation.
   - Articulated 3D runner character with dynamic running strides, jumping, sliding, lane-switching bank tilt, and drop shadow.
   - 3D faceted rock obstacles (jumpable rocks and tall boulders).
   - Spinning 3D gold coins with metallic specular shine and pickup particle sparkle bursts.

2. **Real-Time Physics Engine**:
   - Gravity, vertical jump trajectory, and collision detection.
   - Spring-damped lane switching physics across 3 lanes (Left: -2.7, Center: 0.0, Right: +2.7).
   - Dynamic crouching / slide physics to duck under low hazards or pull down quickly from mid-air.
   - Coin attraction / magnet pull physics.

3. **100 Progressive Levels**:
   - Speed dynamically accelerates from Level 1 ($20$ units/s) up to Level 100 ($66$ units/s).
   - Obstacle frequency and pattern complexity scale with each level (dual-lane blockades, staggered lane switches, jump arcs).
   - Level Up fanfare notification toast with speed boost announcements.

4. **Procedural Synthesizer Audio**:
   - Dynamic synthwave / chiptune runner soundtrack generated entirely via Web Audio API oscillators (no external MP3 files needed, 100% offline).
   - Sound effects: Jump whoosh, slide swoosh, dual-tone crystal coin chime, rock collision crunch, and level up fanfare.
   - Toggle buttons for Music and SFX.

5. **Start Menu, HUD & Game Over**:
   - Cinematic Start Menu with animated title, **START GAME** and **QUIT GAME** buttons, controls guide, and high score display.
   - In-game HUD: Level progress bar (1 to 100), Distance counter (m), Coins collected, Score, and Pause button.
   - Pause menu and Game Over modal with score breakdown and high score tracking (`scores.json` + `localStorage`).

---

## 🎮 Controls

| Action | Desktop / Windows | Mobile (Android & iOS) |
| :--- | :--- | :--- |
| **Steer Left** | `A` or `Left Arrow` | Swipe Left or tap `◀` |
| **Steer Right** | `D` or `Right Arrow` | Swipe Right or tap `▶` |
| **Jump** | `Space` / `W` / `Up Arrow` | Swipe Up or tap `▲` |
| **Slide / Crouch** | `S` / `Down Arrow` | Swipe Down or tap `▼` |
| **Pause / Resume** | `P` or `Escape` | Tap Pause button `❚❚` |

---

## 🚀 How to Run

### 1. Run with Custom Domain (https://sky-runner-3d.com)
You can run the game directly under **`https://sky-runner-3d.com`**:
1. **Configure Local Domain**:
   Right-click `setup_local_domain.bat` and select **"Run as Administrator"** (or run `python setup_domain.py`). This adds `sky-runner-3d.com` to your Windows hosts file.
2. **Start the Secure HTTPS Server**:
   ```bash
   python main.py --https
   ```
   Or:
   ```bash
   python https_server.py
   ```
   Your browser will automatically open **`https://sky-runner-3d.com`**!

---

### 2. Standard Windows Desktop Launch
Run:
```bash
python main.py
```
- Automatically launches a native desktop window with hardware acceleration.
- Starts the local server and prints a mobile **QR Code** in your terminal.

If you prefer to play in your default browser:
```bash
python main.py --browser
```

---

### 3. Play on Android & iOS (Instant Mobile Play)
1. Run `python main.py` on your computer while connected to your Wi-Fi.
2. Point your **Android phone camera** or **iPhone / iPad camera** at the **QR Code** in your terminal.
3. Tap the link to play in full screen with smooth touch swipe controls!
4. *(Optional)* Tap **"Add to Home Screen"** in Chrome (Android) or Safari (iOS) to install it as an offline PWA app!

---

### 4. Deploying Live to the World (Global Hosting)
The repository is pre-configured with **zero-config deployment files** for free worldwide hosting:

- **Vercel** (`vercel.json` included):
  Run `npx vercel` or connect your GitHub repository to [Vercel](https://vercel.com). In your project settings, add your custom domain **`sky-runner-3d.com`**.
- **Netlify** (`netlify.toml` included):
  Drag-and-drop this project folder into [Netlify Drop](https://app.netlify.com/drop) or connect via Git, then set your custom domain to **`sky-runner-3d.com`**.
- **GitHub Pages** (`CNAME` included):
  Push this repository to GitHub and enable **GitHub Pages** in Repository Settings -> Pages. It will automatically bind **`sky-runner-3d.com`** with free automatic SSL certificates!

---

### 5. Build a Standalone Windows Executable (.exe)
Run:
```cmd
build_exe.bat
```
Packages the entire game into `dist\SkyRunner3D\SkyRunner3D.exe`.
