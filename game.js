/**
 * Sky Runner 3D - Main Game Logic & Controller
 * Implements 10 dynamic environments, infinite speed scaling, multiplayer race sync,
 * sound engine, shop integration, and responsive mobile/desktop controls.
 */

const STATE_MENU = 'MENU';
const STATE_PLAYING = 'PLAYING';
const STATE_PAUSED = 'PAUSED';
const STATE_GAMEOVER = 'GAMEOVER';
const STATE_MULTIPLAYER = 'MULTIPLAYER';

class GameController {
    constructor() {
        this.state = STATE_MENU;

        // Infinite Level & Endless Difficulty System
        this.level = 1;
        this.distance = 0;
        this.distanceInLevel = 0;
        this.levelDistanceTarget = 180; // base meters per level

        // Speed settings
        this.baseSpeed = 20.0;
        this.currentSpeed = this.baseSpeed;
        this.terminalSpeed = 92.0;

        // Score & stats
        this.score = 0;
        this.coins = 0;
        this.highScore = parseInt(localStorage.getItem('skyrunner_highscore') || '0', 10);

        // Graphics quality settings: 'high' | 'medium' | 'low'
        this.graphicsQuality = localStorage.getItem('skyrunner_quality') || 'high';

        // Spawning system
        this.spawnTimer = 0;
        this.spawnInterval = 2.2;

        // Camera shake
        this.shakeAmount = 0;

        // Environment list
        this.envOrder = ['forest', 'snow', 'desert', 'cyber', 'tropical', 'space', 'volcano', 'skycity', 'night', 'temple'];
        this.autoEnvironment = true;

        // Timing
        this.lastTime = performance.now();

        // Initialize 3D Engine & Components
        this.initThree();
        this.initUI();
        this.initInput();

        // Apply saved inventory cosmetics
        if (window.shopManager) {
            this.player.applySkin(window.shopManager.inventory.equippedSkin);
            this.player.applyTrail(window.shopManager.inventory.equippedTrail);
            this.player.applyAccessory(window.shopManager.inventory.equippedAccessory);
        }

        // Render loop
        requestAnimationFrame((t) => this.loop(t));
    }

    initThree() {
        const container = document.getElementById('canvas-container');

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            250
        );
        this.camera.position.set(0, 4.2, 7.8);
        this.camera.lookAt(0, 1.4, -14);

        const isMobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const maxDPR = isMobile ? 1.5 : 2.0;

        this.renderer = new THREE.WebGLRenderer({
            antialias: this.graphicsQuality !== 'low',
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.graphicsQuality === 'high' ? Math.min(window.devicePixelRatio || 1, maxDPR) : 1);
        
        // ACESFilmicToneMapping & sRGB Color Space
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        if (THREE.SRGBColorSpace) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else if (THREE.sRGBEncoding) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }

        this.renderer.shadowMap.enabled = this.graphicsQuality !== 'low';
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Post-processing stack (EffectComposer, Bloom, Cinematic speed pass)
        if (window.PostProcessingManager) {
            this.postProcessor = new window.PostProcessingManager(
                this.renderer,
                this.scene,
                this.camera,
                this.graphicsQuality
            );
        }

        this.physics = new PhysicsEngine();
        this.world = new WorldManager(this.scene, this.renderer);
        this.player = new PlayerCharacter(this.scene);

        // Power-ups and flight ability states
        this.doubleCoinTimer = 0;
        this.isDoubleCoins = false;
        this.jetpackTimer = 0;
        this.isJetpackActive = false;
        this.invulnerableTimer = 0;

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.postProcessor) {
                this.postProcessor.setSize(window.innerWidth, window.innerHeight);
            }
        });
    }

    setQuality(quality) {
        this.graphicsQuality = quality;
        localStorage.setItem('skyrunner_quality', quality);

        const isMobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const maxDPR = isMobile ? 1.5 : 2.0;

        if (this.renderer) {
            this.renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio || 1, maxDPR) : 1);
            this.renderer.shadowMap.enabled = (quality !== 'low');
        }

        if (this.postProcessor) {
            this.postProcessor.setQuality(quality);
        }
    }

    initUI() {
        // UI screens
        this.uiStartMenu = document.getElementById('start-menu');
        this.uiHud = document.getElementById('hud');
        this.uiPauseMenu = document.getElementById('pause-menu');
        this.uiGameOver = document.getElementById('game-over');
        this.uiLevelUpToast = document.getElementById('level-up-toast');

        // Modals
        this.modalLeaderboard = document.getElementById('modal-leaderboard');
        this.modalRewards = document.getElementById('modal-rewards');
        this.modalShop = document.getElementById('modal-shop');
        this.modalSettings = document.getElementById('modal-settings');
        this.modalMultiplayer = document.getElementById('modal-multiplayer');

        // Text displays
        this.txtScore = document.getElementById('hud-score');
        this.txtDistance = document.getElementById('hud-distance');
        this.txtCoins = document.getElementById('hud-coins');
        this.txtLevel = document.getElementById('hud-level');
        this.txtEnvName = document.getElementById('hud-env-name');
        this.txtSpeed = document.getElementById('hud-speed');
        this.barLevelProgress = document.getElementById('hud-level-bar');
        this.txtHighScoreMenu = document.getElementById('menu-high-score');

        // Main Menu Buttons
        document.getElementById('btn-start').addEventListener('click', () => this.startGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitGame());

        // Extra Feature Menu Buttons
        const btnMp = document.getElementById('btn-menu-mp');
        if (btnMp) btnMp.addEventListener('click', () => this.openMultiplayerModal());

        const btnLb = document.getElementById('btn-menu-leaderboard');
        if (btnLb) btnLb.addEventListener('click', () => this.openLeaderboardModal());

        const btnRw = document.getElementById('btn-menu-rewards');
        if (btnRw) btnRw.addEventListener('click', () => this.openRewardsModal());

        const btnSk = document.getElementById('btn-menu-skins');
        if (btnSk) btnSk.addEventListener('click', () => this.openShopModal('skins'));

        const btnSh = document.getElementById('btn-menu-shop');
        if (btnSh) btnSh.addEventListener('click', () => this.openShopModal('skins'));

        const btnSt = document.getElementById('btn-menu-settings');
        if (btnSt) btnSt.addEventListener('click', () => this.openSettingsModal());

        // In-Game Buttons
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
        document.getElementById('btn-menu').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-retry').addEventListener('click', () => this.startGame());
        document.getElementById('btn-gameover-menu').addEventListener('click', () => this.showMenu());

        // Audio toggles
        const btnMute = document.getElementById('btn-music-toggle');
        if (btnMute) {
            btnMute.addEventListener('click', () => {
                const enabled = window.soundEngine.toggleMusic();
                btnMute.textContent = enabled ? '🎵 Music: ON' : '🔇 Music: OFF';
            });
        }

        const btnSfx = document.getElementById('btn-sfx-toggle');
        if (btnSfx) {
            btnSfx.addEventListener('click', () => {
                const enabled = window.soundEngine.toggleSfx();
                btnSfx.textContent = enabled ? '🔊 SFX: ON' : '🔈 SFX: OFF';
            });
        }

        // Display High Score
        if (this.txtHighScoreMenu) {
            this.txtHighScoreMenu.textContent = this.highScore.toLocaleString();
        }

        // Wire coin update event listener to keep all displays in sync
        window.addEventListener('coinsUpdated', (e) => {
            const c = e.detail.coins;
            if (this.txtCoins) this.txtCoins.textContent = c;
            const menuCoins = document.getElementById('menu-coin-balance');
            if (menuCoins) menuCoins.textContent = c.toLocaleString();
        });

        // Initialize coin balance display
        if (window.dailyRewardManager) {
            const currentCoins = window.dailyRewardManager.getCoins();
            const menuCoins = document.getElementById('menu-coin-balance');
            if (menuCoins) menuCoins.textContent = currentCoins.toLocaleString();
        }
    }

    initInput() {
        // Desktop Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.state === STATE_PLAYING || this.state === STATE_MULTIPLAYER) {
                switch (e.key) {
                    case 'ArrowLeft':
                    case 'a':
                    case 'A':
                        this.physics.moveLeft();
                        break;
                    case 'ArrowRight':
                    case 'd':
                    case 'D':
                        this.physics.moveRight();
                        break;
                    case 'ArrowUp':
                    case 'w':
                    case 'W':
                    case ' ':
                        this.physics.jump();
                        break;
                    case 'ArrowDown':
                    case 's':
                    case 'S':
                        this.physics.slide();
                        break;
                    case 'p':
                    case 'P':
                    case 'Escape':
                        if (this.state === STATE_PLAYING) this.togglePause();
                        break;
                }
            } else if (this.state === STATE_PAUSED && (e.key === 'p' || e.key === 'Escape')) {
                this.togglePause();
            }
        });

        // Responsive Full-Screen Mobile Touch Swipe Controls
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        window.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = performance.now();
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (this.state !== STATE_PLAYING && this.state !== STATE_MULTIPLAYER) return;
            if (e.changedTouches && e.changedTouches.length > 0) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);
                const elapsed = performance.now() - touchStartTime;

                // Minimum swipe threshold ~30px within 550ms
                if ((absDx > 30 || absDy > 30) && elapsed < 550) {
                    if (absDx > absDy) {
                        // Horizontal: Left / Right lane switch
                        if (dx > 0) {
                            this.physics.moveRight();
                        } else {
                            this.physics.moveLeft();
                        }
                    } else {
                        // Vertical: Up = Jump, Down = Slide / Roll / Mid-air fast drop
                        if (dy < 0) {
                            this.physics.jump();
                        } else {
                            this.physics.slide();
                        }
                    }
                }
            }
        }, { passive: true });
    }

    // ==========================================
    // MODALS OPENERS
    // ==========================================

    openLeaderboardModal() {
        if (window.soundEngine) window.soundEngine.playClick();
        if (window.leaderboardManager) {
            window.leaderboardManager.renderLeaderboard('modal-leaderboard');
            this.modalLeaderboard.classList.remove('hidden');
        }
    }

    openRewardsModal() {
        if (window.soundEngine) window.soundEngine.playClick();
        if (window.dailyRewardManager) {
            window.dailyRewardManager.renderModal('modal-rewards');
            this.modalRewards.classList.remove('hidden');
        }
    }

    openShopModal(tab = 'skins') {
        if (window.soundEngine) window.soundEngine.playClick();
        if (window.shopManager) {
            window.shopManager.currentTab = tab;
            window.shopManager.renderShop('modal-shop');
            this.modalShop.classList.remove('hidden');
        }
    }

    openSettingsModal() {
        if (window.soundEngine) window.soundEngine.playClick();
        this.renderSettingsModal();
        this.modalSettings.classList.remove('hidden');
    }

    openMultiplayerModal() {
        if (window.soundEngine) window.soundEngine.playClick();
        this.renderMultiplayerDialog();
        this.modalMultiplayer.classList.remove('hidden');
    }

    renderMultiplayerDialog() {
        const modal = this.modalMultiplayer;
        if (!modal) return;

        modal.innerHTML = `
            <div class="modal-content mp-dialog-modal-content">
                <span class="modal-badge">🌐 4-PLAYER BATTLE</span>
                <h2 class="modal-title">ONLINE MULTIPLAYER</h2>
                <p class="modal-desc">Create a room to invite friends, or join an existing race with a room code!</p>

                <div class="mp-choice-boxes">
                    <div class="mp-choice-card">
                        <h3>HOST A RACE</h3>
                        <p>Generate a room code and invite up to 3 competitors.</p>
                        <button id="btn-create-room" class="btn-primary">CREATE ROOM</button>
                    </div>

                    <div class="mp-choice-divider">OR</div>

                    <div class="mp-choice-card">
                        <h3>JOIN WITH CODE</h3>
                        <input id="input-room-code" type="text" placeholder="e.g. SKY-ABCD" maxlength="8" class="mp-room-input">
                        <button id="btn-join-room" class="btn-secondary">JOIN ROOM</button>
                    </div>
                </div>

                <button id="btn-close-mp-dialog" class="btn-secondary" style="margin-top:16px;">CLOSE</button>
            </div>
        `;

        modal.querySelector('#btn-close-mp-dialog').onclick = () => {
            if (window.soundEngine) window.soundEngine.playClick();
            modal.classList.add('hidden');
        };

        modal.querySelector('#btn-create-room').onclick = () => {
            if (window.soundEngine) window.soundEngine.playClick();
            modal.classList.add('hidden');
            window.multiplayerManager.createRoom();
            const lobbyEl = document.getElementById('multiplayer-lobby');
            lobbyEl.classList.remove('hidden');
            window.multiplayerManager.renderLobby('multiplayer-lobby');
        };

        modal.querySelector('#btn-join-room').onclick = () => {
            const code = modal.querySelector('#input-room-code').value;
            if (!code || code.trim().length === 0) {
                alert("Please enter a room code!");
                return;
            }
            if (window.soundEngine) window.soundEngine.playClick();
            const res = window.multiplayerManager.joinRoom(code);
            if (res.success) {
                modal.classList.add('hidden');
                const lobbyEl = document.getElementById('multiplayer-lobby');
                lobbyEl.classList.remove('hidden');
                window.multiplayerManager.renderLobby('multiplayer-lobby');
            }
        };
    }

    renderSettingsModal() {
        const modal = this.modalSettings;
        if (!modal) return;

        const currentNick = window.leaderboardManager ? window.leaderboardManager.nickname : "Runner";

        let envOptions = `<option value="auto" ${this.autoEnvironment ? 'selected' : ''}>✨ Dynamic (Auto-progresses every 2 levels)</option>`;
        if (window.GAME_CONFIG && window.GAME_CONFIG.ENVIRONMENTS) {
            Object.values(window.GAME_CONFIG.ENVIRONMENTS).forEach(env => {
                const sel = (!this.autoEnvironment && this.world.currentEnvId === env.id) ? 'selected' : '';
                envOptions += `<option value="${env.id}" ${sel}>${env.icon} ${env.name}</option>`;
            });
        }

        modal.innerHTML = `
            <div class="modal-content settings-modal-content">
                <span class="modal-badge">⚙️ GAME CONFIGURATION</span>
                <h2 class="modal-title">SETTINGS</h2>

                <div class="settings-grid">
                    <div class="settings-row">
                        <label>Player Nickname:</label>
                        <input id="set-nickname" type="text" maxlength="16" value="${currentNick}">
                    </div>

                    <div class="settings-row">
                        <label>Environment Biome:</label>
                        <select id="set-environment">${envOptions}</select>
                    </div>

                    <div class="settings-row">
                        <label>Graphics Quality:</label>
                        <select id="set-quality">
                            <option value="high" ${this.graphicsQuality === 'high' ? 'selected' : ''}>High (Full Shadows & Antialiasing)</option>
                            <option value="medium" ${this.graphicsQuality === 'medium' ? 'selected' : ''}>Medium (Balanced)</option>
                            <option value="low" ${this.graphicsQuality === 'low' ? 'selected' : ''}>Low (Maximum Performance)</option>
                        </select>
                    </div>

                    <div class="settings-row">
                        <label>Music Volume:</label>
                        <input id="set-music-vol" type="range" min="0" max="100" value="${Math.round(window.soundEngine.musicVolume * 100)}">
                    </div>

                    <div class="settings-row">
                        <label>SFX Volume:</label>
                        <input id="set-sfx-vol" type="range" min="0" max="100" value="${Math.round(window.soundEngine.sfxVolume * 100)}">
                    </div>
                </div>

                <div class="menu-buttons" style="margin-top:20px;">
                    <button id="btn-save-settings" class="btn-primary">SAVE & CLOSE</button>
                </div>
            </div>
        `;

        modal.querySelector('#btn-save-settings').onclick = () => {
            if (window.soundEngine) window.soundEngine.playClick();
            // Save nickname
            const newNick = modal.querySelector('#set-nickname').value;
            if (window.leaderboardManager) window.leaderboardManager.setNickname(newNick);

            // Save environment
            const envVal = modal.querySelector('#set-environment').value;
            if (envVal === 'auto') {
                this.autoEnvironment = true;
            } else {
                this.autoEnvironment = false;
                this.world.setEnvironment(envVal);
            }

            // Save quality
            const qVal = modal.querySelector('#set-quality').value;
            this.setQuality(qVal);

            // Save volume
            const mVol = parseInt(modal.querySelector('#set-music-vol').value, 10) / 100;
            const sVol = parseInt(modal.querySelector('#set-sfx-vol').value, 10) / 100;
            window.soundEngine.setMusicVolume(mVol);
            window.soundEngine.setSfxVolume(sVol);

            modal.classList.add('hidden');
        };
    }

    updateHudPowerups() {
        const hud = document.getElementById('hud-powerups');
        if (!hud) return;

        let html = '';
        if (this.isDoubleCoins && this.doubleCoinTimer > 0) {
            const pct = Math.max(0, Math.min(100, (this.doubleCoinTimer / 12.0) * 100));
            html += `
                <div class="powerup-badge multiplier-2x">
                    <span class="powerup-icon">🪙</span>
                    <div class="powerup-info">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span class="powerup-title">2X COINS</span>
                            <span class="powerup-timer">${this.doubleCoinTimer.toFixed(1)}s</span>
                        </div>
                        <div class="powerup-progress-bg"><div class="powerup-progress-fill" style="width:${pct}%"></div></div>
                    </div>
                </div>
            `;
        }
        if (this.isJetpackActive && this.jetpackTimer > 0) {
            const pct = Math.max(0, Math.min(100, (this.jetpackTimer / 10.0) * 100));
            html += `
                <div class="powerup-badge jetpack">
                    <span class="powerup-icon">🚀</span>
                    <div class="powerup-info">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span class="powerup-title">JETPACK</span>
                            <span class="powerup-timer">${this.jetpackTimer.toFixed(1)}s</span>
                        </div>
                        <div class="powerup-progress-bg"><div class="powerup-progress-fill" style="width:${pct}%"></div></div>
                    </div>
                </div>
            `;
        }
        if (this.invulnerableTimer > 0) {
            const pct = Math.max(0, Math.min(100, (this.invulnerableTimer / 1.5) * 100));
            html += `
                <div class="powerup-badge shield">
                    <span class="powerup-icon">🛡️</span>
                    <div class="powerup-info">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span class="powerup-title">SAFE LANDING</span>
                            <span class="powerup-timer">${this.invulnerableTimer.toFixed(1)}s</span>
                        </div>
                        <div class="powerup-progress-bg"><div class="powerup-progress-fill" style="width:${pct}%"></div></div>
                    </div>
                </div>
            `;
        }
        hud.innerHTML = html;
    }

    // ==========================================
    // GAMEPLAY LOOP & STATE MACHINE
    // ==========================================

    startGame() {
        if (window.soundEngine) {
            window.soundEngine.init();
            window.soundEngine.playClick();
            window.soundEngine.startMusic();
        }

        this.level = 1;
        this.distance = 0;
        this.distanceInLevel = 0;
        this.score = 0;
        this.coins = 0;
        this.spawnTimer = 0.5;
        this.shakeAmount = 0;

        // Reset power-ups & abilities
        this.doubleCoinTimer = 0;
        this.isDoubleCoins = false;
        this.jetpackTimer = 0;
        this.isJetpackActive = false;
        this.invulnerableTimer = 0;
        if (this.physics) {
            this.physics.isFlying = false;
            this.physics.isDescending = false;
            this.physics.isInvulnerable = false;
        }
        this.updateHudPowerups();

        if (this.autoEnvironment) {
            this.world.setEnvironment(this.envOrder[0]);
        }

        this.calculateSpeed();
        this.physics.reset();
        this.player.reset();
        this.world.clearEntities();

        this.uiStartMenu.classList.add('hidden');
        this.uiPauseMenu.classList.add('hidden');
        this.uiGameOver.classList.add('hidden');
        this.uiHud.classList.remove('hidden');

        this.state = STATE_PLAYING;
    }

    startMultiplayerGame() {
        this.startGame();
        this.state = STATE_MULTIPLAYER;
    }

    showMenu() {
        if (window.soundEngine) {
            window.soundEngine.playClick();
            window.soundEngine.stopMusic();
        }

        this.state = STATE_MENU;
        this.uiStartMenu.classList.remove('hidden');
        this.uiHud.classList.add('hidden');
        this.uiPauseMenu.classList.add('hidden');
        this.uiGameOver.classList.add('hidden');

        if (this.txtHighScoreMenu) {
            this.txtHighScoreMenu.textContent = this.highScore.toLocaleString();
        }

        if (window.dailyRewardManager) {
            const menuCoins = document.getElementById('menu-coin-balance');
            if (menuCoins) menuCoins.textContent = window.dailyRewardManager.getCoins().toLocaleString();
        }
    }

    togglePause() {
        if (this.state === STATE_PLAYING) {
            this.state = STATE_PAUSED;
            this.uiPauseMenu.classList.remove('hidden');
            if (window.soundEngine) window.soundEngine.stopMusic();
        } else if (this.state === STATE_PAUSED) {
            this.state = STATE_PLAYING;
            this.uiPauseMenu.classList.add('hidden');
            if (window.soundEngine) window.soundEngine.startMusic();
        }
    }

    quitGame() {
        if (window.soundEngine) window.soundEngine.playClick();
        fetch('/api/quit', { method: 'POST' }).catch(() => {});

        if (window.pywebview) {
            window.pywebview.api.quit();
        } else {
            const quitConfirm = confirm("Are you sure you want to quit Sky Runner 3D?");
            if (quitConfirm) {
                window.close();
                document.body.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0a0e17;color:#fff;font-family:sans-serif;">
                        <h1 style="color:#00d2ff;font-size:2.5rem;margin-bottom:12px;">Thanks for Playing Sky Runner 3D!</h1>
                        <p style="color:#94a3b8;font-size:1.1rem;">You can now close this tab or return anytime.</p>
                        <button onclick="location.reload()" style="margin-top:24px;padding:12px 28px;background:linear-gradient(135deg,#00d2ff,#0072ff);border:none;border-radius:10px;color:#fff;font-weight:bold;cursor:pointer;">Restart Game</button>
                    </div>
                `;
            }
        }
    }

    calculateSpeed() {
        const levelFactor = this.level - 1;
        const speedBoost = 46.0 * (1 - Math.exp(-levelFactor * 0.018)) + levelFactor * 0.12;
        this.currentSpeed = Math.min(this.terminalSpeed, this.baseSpeed + speedBoost);

        this.levelDistanceTarget = 180 + Math.floor(Math.min(350, levelFactor * 4.5));
        this.spawnInterval = Math.max(0.48, 2.2 / (1 + levelFactor * 0.024));

        if (window.soundEngine) {
            window.soundEngine.setMusicSpeed(this.level);
        }
    }

    checkLevelUp() {
        if (this.distanceInLevel >= this.levelDistanceTarget) {
            this.level++;
            this.distanceInLevel = 0;
            this.calculateSpeed();

            // Environment Auto-progression: Changes biome every 2 levels!
            if (this.autoEnvironment) {
                const envIndex = Math.floor((this.level - 1) / 2) % this.envOrder.length;
                const nextEnv = this.envOrder[envIndex];
                if (nextEnv !== this.world.currentEnvId) {
                    this.world.setEnvironment(nextEnv);
                }
            }

            if (window.soundEngine) window.soundEngine.playLevelUp();
            this.showLevelUpToast();
        }
    }

    showLevelUpToast() {
        const toast = this.uiLevelUpToast;
        if (!toast) return;

        const env = this.world.envConfig;
        const envLabel = env ? `${env.icon} ${env.name.toUpperCase()}` : '';

        toast.innerHTML = `⚡ LEVEL ${this.level} - SPEED BOOST! ⚡<br><span style="font-size:1.1rem;color:#fff;">${envLabel}</span>`;
        toast.classList.remove('hidden');
        toast.classList.add('toast-active');

        setTimeout(() => {
            toast.classList.remove('toast-active');
            setTimeout(() => toast.classList.add('hidden'), 350);
        }, 2000);
    }

    spawnProceduralWave() {
        const spawnZ = -85;
        this.world.spawnObstacleWave(spawnZ, this.isJetpackActive);
    }

    onGameOver() {
        const wasMultiplayer = (this.state === STATE_MULTIPLAYER);
        this.state = STATE_GAMEOVER;
        this.player.triggerCrash();
        this.shakeAmount = 0.45;

        if (window.soundEngine) {
            window.soundEngine.playCrash();
            window.soundEngine.stopMusic();
        }

        // Add coins collected this run to player's bank
        if (window.dailyRewardManager && this.coins > 0) {
            window.dailyRewardManager.addCoins(this.coins);
        }

        // Multiplayer event notification
        if (wasMultiplayer && window.multiplayerManager) {
            window.multiplayerManager.broadcastState('player_crashed', {
                id: window.multiplayerManager.playerId,
                score: this.score,
                distance: Math.floor(this.distance)
            });
            window.multiplayerManager.checkRaceEnd();
            return;
        }

        // Save High Score & submit to Global Leaderboard
        const isNewBest = this.score > this.highScore;
        if (isNewBest) {
            this.highScore = this.score;
            localStorage.setItem('skyrunner_highscore', this.highScore.toString());
        }

        if (window.leaderboardManager) {
            window.leaderboardManager.submitScore(this.score, this.distance, this.level, this.coins);
        }

        // Show Game Over Modal
        setTimeout(() => {
            document.getElementById('go-score').textContent = this.score.toLocaleString();
            document.getElementById('go-distance').textContent = `${Math.floor(this.distance)}m`;
            document.getElementById('go-coins').textContent = this.coins;
            document.getElementById('go-level').textContent = `Level ${this.level}`;
            document.getElementById('go-highscore').textContent = this.highScore.toLocaleString();

            const badge = document.getElementById('go-new-best-badge');
            if (badge) {
                if (isNewBest) badge.classList.remove('hidden');
                else badge.classList.add('hidden');
            }

            this.uiGameOver.classList.remove('hidden');
        }, 800);
    }

    loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));

        const dt = Math.min(0.1, (timestamp - this.lastTime) * 0.001);
        this.lastTime = timestamp;

        if (this.state === STATE_PLAYING || this.state === STATE_MULTIPLAYER) {
            // 1. Advance distance & score
            const stepDist = this.currentSpeed * dt;
            this.distance += stepDist;
            this.distanceInLevel += stepDist;
            this.score = Math.floor(this.distance) + (this.coins * 50) + ((this.level - 1) * 100);

            // 2. Check level progression
            this.checkLevelUp();

            // 3. Spawning
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.spawnProceduralWave();
                this.spawnTimer = this.spawnInterval;
            }

            // 3b. Update Power-Up Timers & States
            if (this.doubleCoinTimer > 0) {
                this.doubleCoinTimer -= dt;
                if (this.doubleCoinTimer <= 0) {
                    this.isDoubleCoins = false;
                    this.doubleCoinTimer = 0;
                }
            }

            if (this.jetpackTimer > 0) {
                this.jetpackTimer -= dt;
                if (this.jetpackTimer <= 0 && this.isJetpackActive) {
                    this.isJetpackActive = false;
                    this.jetpackTimer = 0;
                    this.physics.endJetpackFlight();
                    this.invulnerableTimer = 1.5; // 1.5-second landing grace period
                    this.physics.isInvulnerable = true;
                }
            }

            if (this.invulnerableTimer > 0) {
                this.invulnerableTimer -= dt;
                this.physics.isInvulnerable = true;
                if (this.invulnerableTimer <= 0) {
                    this.invulnerableTimer = 0;
                    this.physics.isInvulnerable = false;
                }
            } else if (!this.isJetpackActive) {
                this.physics.isInvulnerable = false;
            }

            this.updateHudPowerups();

            // 4. Update Subsystems
            this.physics.update(dt);
            this.world.update(dt, this.currentSpeed, this.physics.z);
            this.player.update(dt, this.physics, this.currentSpeed);

            // 5. Obstacle Collisions (Bypassed if flying in sky or during landing grace period)
            if (!this.physics.isInvulnerable && !this.isJetpackActive && this.physics.y < 6.0) {
                for (let i = 0; i < this.world.obstacles.length; i++) {
                    const obs = this.world.obstacles[i];
                    if (this.physics.checkObstacleCollision(obs)) {
                        this.world.createRockDebris(obs.x, obs.y, obs.z);
                        this.onGameOver();
                        break;
                    }
                }
            }

            // 5b. Power-up Pickups
            if (this.world.powerups) {
                for (let i = 0; i < this.world.powerups.length; i++) {
                    const p = this.world.powerups[i];
                    if (!p.active) continue;
                    const dx = Math.abs(p.x - this.physics.x);
                    const dz = Math.abs(p.z - this.physics.z);
                    const dy = Math.abs(p.y - this.physics.y);
                    if (dx < 1.1 && dz < 1.2 && dy < 1.8) {
                        p.active = false;
                        p.mesh.visible = false;
                        if (this.world.powerupPool) this.world.powerupPool.push(p);
                        this.world.powerups.splice(i, 1);
                        i--;

                        if (p.powerupType === 'double_coins') {
                            this.isDoubleCoins = true;
                            this.doubleCoinTimer = 12.0;
                            if (window.soundEngine) window.soundEngine.playLevelUp();
                        } else if (p.powerupType === 'jetpack') {
                            this.isJetpackActive = true;
                            this.jetpackTimer = 10.0;
                            this.physics.startJetpackFlight();
                            if (window.soundEngine) window.soundEngine.playLevelUp();
                        }
                        this.updateHudPowerups();
                    }
                }
            }

            // 6. Coin Pickups (Supports Double Coins 2X multiplier)
            for (let i = 0; i < this.world.coins.length; i++) {
                const coin = this.world.coins[i];
                const res = this.physics.checkCoinPickup(coin);

                if (res.collected) {
                    coin.active = false;
                    coin.mesh.visible = false;
                    if (this.world.coinPool) {
                        this.world.coinPool.push(coin);
                    } else {
                        this.scene.remove(coin.mesh);
                    }
                    this.world.coins.splice(i, 1);
                    const coinValue = this.isDoubleCoins ? 2 : 1;
                    this.coins += coinValue;

                    this.world.createCoinSparkles(coin.x, coin.y, coin.z);
                    if (window.soundEngine) window.soundEngine.playCoin();
                    i--;
                } else if (res.attract) {
                    coin.attractDist = { x: res.dx, y: res.dy };
                }
            }

            // 7. Update In-Game HUD
            this.txtScore.textContent = this.score.toLocaleString();
            this.txtDistance.textContent = `${Math.floor(this.distance)}m`;
            this.txtCoins.textContent = this.coins;
            this.txtLevel.textContent = `LVL ${this.level}`;

            if (this.txtEnvName && this.world.envConfig) {
                this.txtEnvName.textContent = `${this.world.envConfig.icon} ${this.world.envConfig.name}`;
            }
            if (this.txtSpeed) {
                this.txtSpeed.textContent = `${Math.round(this.currentSpeed * 3.6)} km/h`;
            }

            const progressPct = Math.min(100, (this.distanceInLevel / this.levelDistanceTarget) * 100);
            this.barLevelProgress.style.width = `${progressPct}%`;

            // 8. Dynamic Camera Tracking (Smoothly follows player in sky or ground)
            const targetCamX = this.physics.x * 0.45;
            const targetCamY = 4.2 + (this.physics.y > 2.0 ? (this.physics.y - 2.0) * 0.85 : this.physics.y * 0.25);
            this.camera.position.x += (targetCamX - this.camera.position.x) * (10.0 * dt);
            this.camera.position.y += (targetCamY - this.camera.position.y) * (8.0 * dt);
            this.camera.position.z = 7.5;

            if (this.shakeAmount > 0) {
                this.camera.position.x += (Math.random() - 0.5) * this.shakeAmount;
                this.camera.position.y += (Math.random() - 0.5) * this.shakeAmount;
                this.shakeAmount = Math.max(0, this.shakeAmount - dt * 1.5);
            }

            const targetLookY = 1.4 + (this.physics.y > 2.0 ? (this.physics.y - 2.0) * 0.8 : 0);
            this.camera.lookAt(this.physics.x * 0.3, targetLookY, -14);

            // 9. Adaptive Performance Monitor
            if (this.graphicsQuality === 'high' && this.postProcessor && this.postProcessor.bloomPass) {
                if (!this.frameTimeHistory) this.frameTimeHistory = [];
                this.frameTimeHistory.push(dt);
                if (this.frameTimeHistory.length > 180) this.frameTimeHistory.shift();
                if (this.frameTimeHistory.length === 180) {
                    const avgDt = this.frameTimeHistory.reduce((a, b) => a + b, 0) / 180;
                    if (avgDt > 0.022 && this.postProcessor.bloomPass.enabled) { // < 45 FPS
                        console.warn('[Performance] Auto-scaling: Throttling bloom to preserve locked 60 FPS.');
                        this.postProcessor.bloomPass.enabled = false;
                    }
                }
            }

        } else if (this.state === STATE_MENU) {
            // Ambient camera orbit in main menu
            const time = timestamp * 0.0004;
            this.camera.position.x = Math.sin(time) * 4.5;
            this.camera.position.y = 3.6 + Math.cos(time * 0.8) * 0.6;
            this.camera.position.z = 7.8;
            this.camera.lookAt(0, 1.2, 0);

            this.world.update(dt, 8.0, 0);
            this.player.update(dt, this.physics, 8.0);

        } else if (this.state === STATE_GAMEOVER) {
            this.world.update(dt, 0, 0);
            this.player.update(dt, this.physics, 0);
        }

        const speedRatio = Math.max(0, Math.min(1.0, (this.currentSpeed - this.baseSpeed) / (this.terminalSpeed - this.baseSpeed)));
        if (this.postProcessor && this.postProcessor.enabled) {
            this.postProcessor.render(dt, speedRatio);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new GameController();
});
