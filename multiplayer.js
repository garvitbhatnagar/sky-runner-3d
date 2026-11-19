/**
 * Sky Runner 3D - Real Online Multiplayer Engine (Up to 4 Players)
 * Genuine real-time room creation, joining via room codes, Supabase Realtime / BroadcastChannel sync,
 * 3D competitor ghost runners with floating nametags, live race ranking HUD, and results screen.
 */

class MultiplayerManager {
    constructor() {
        this.roomCode = null;
        this.isHost = false;
        this.playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        this.nickname = window.leaderboardManager ? window.leaderboardManager.nickname : "Runner";

        // Room state
        this.players = []; // { id, nickname, isHost, isReady, skin, score, distance, isDead, character }
        this.isInRoom = false;
        this.isRacing = false;

        // Realtime channels
        this.supabaseChannel = null;
        this.broadcastChannel = null; // BroadcastChannel for cross-tab local testing
        this.syncInterval = null;

        // Opponent 3D characters dictionary
        this.opponentCharacters = new Map();

        // Cross-tab broadcast channel support
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('skyrunner_mp_local');
            this.broadcastChannel.onmessage = (e) => this.handleNetworkMessage(e.data);
        }
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'SKY-';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // ==========================================
    // ROOM LIFECYCLE
    // ==========================================

    createRoom() {
        this.roomCode = this.generateRoomCode();
        this.isHost = true;
        this.isInRoom = true;
        this.isRacing = false;
        this.nickname = window.leaderboardManager ? window.leaderboardManager.nickname : "Runner";

        this.players = [{
            id: this.playerId,
            nickname: this.nickname,
            isHost: true,
            isReady: true,
            skin: window.shopManager ? window.shopManager.inventory.equippedSkin : 'horizon',
            score: 0,
            distance: 0,
            isDead: false
        }];

        this.connectNetwork(this.roomCode);
        this.broadcastState('player_joined', { player: this.players[0] });

        return this.roomCode;
    }

    joinRoom(code) {
        if (!code || code.trim().length === 0) return { success: false, reason: "Enter a valid room code" };
        this.roomCode = code.trim().toUpperCase();
        this.isHost = false;
        this.isInRoom = true;
        this.isRacing = false;
        this.nickname = window.leaderboardManager ? window.leaderboardManager.nickname : "Runner";

        const selfPlayer = {
            id: this.playerId,
            nickname: this.nickname,
            isHost: false,
            isReady: true,
            skin: window.shopManager ? window.shopManager.inventory.equippedSkin : 'horizon',
            score: 0,
            distance: 0,
            isDead: false
        };

        this.players = [selfPlayer];
        this.connectNetwork(this.roomCode);

        // Announce join
        this.broadcastState('player_joined', { player: selfPlayer });

        return { success: true, roomCode: this.roomCode };
    }

    leaveRoom() {
        if (this.isInRoom) {
            this.broadcastState('player_left', { playerId: this.playerId });
            this.disconnectNetwork();
        }

        this.roomCode = null;
        this.isHost = false;
        this.isInRoom = false;
        this.isRacing = false;
        this.players = [];

        this.clearOpponentCharacters();
    }

    // ==========================================
    // NETWORK COMMUNICATIONS (Supabase + BroadcastChannel)
    // ==========================================

    connectNetwork(roomCode) {
        // 1. Supabase Realtime Channel
        try {
            const cfg = window.GAME_CONFIG ? window.GAME_CONFIG.SUPABASE : null;
            if (window.supabase && cfg && !cfg.ANON_KEY.includes('placeholder')) {
                const client = window.supabase.createClient(cfg.URL, cfg.ANON_KEY);
                this.supabaseChannel = client.channel(`skyrunner_${roomCode}`, {
                    config: { broadcast: { self: false } }
                });

                this.supabaseChannel
                    .on('broadcast', { event: 'game_event' }, (payload) => {
                        this.handleNetworkMessage(payload.payload);
                    })
                    .subscribe((status) => {
                        console.log(`[Multiplayer] Supabase Realtime status: ${status}`);
                    });
            }
        } catch (e) {
            console.warn('[Multiplayer] Supabase Realtime setup notice:', e);
        }

        // 2. Start Position Sync Interval
        this.syncInterval = setInterval(() => {
            if (this.isRacing && window.game && window.game.physics) {
                const p = window.game.physics;
                this.broadcastState('player_pos', {
                    id: this.playerId,
                    x: p.x,
                    y: p.y,
                    z: p.z,
                    roll: p.rollAngle,
                    isSliding: p.isSliding,
                    isGrounded: p.isGrounded,
                    score: window.game.score,
                    distance: Math.floor(window.game.distance),
                    isDead: window.game.player ? window.game.player.isDead : false
                });
            }
        }, 60); // ~16 updates per second
    }

    disconnectNetwork() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (this.supabaseChannel) {
            try {
                this.supabaseChannel.unsubscribe();
            } catch (e) {}
            this.supabaseChannel = null;
        }
    }

    broadcastState(eventType, data) {
        const payload = {
            roomCode: this.roomCode,
            senderId: this.playerId,
            type: eventType,
            data: data,
            timestamp: Date.now()
        };

        // Broadcast to Supabase Realtime
        if (this.supabaseChannel) {
            try {
                this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'game_event',
                    payload: payload
                });
            } catch (e) {}
        }

        // Broadcast locally (for multi-tab / local network testing)
        if (this.broadcastChannel) {
            try {
                this.broadcastChannel.postMessage(payload);
            } catch (e) {}
        }
    }

    handleNetworkMessage(msg) {
        if (!msg || msg.roomCode !== this.roomCode) return;
        if (msg.senderId === this.playerId) return; // ignore self

        const { type, data } = msg;

        switch (type) {
            case 'player_joined': {
                const existing = this.players.find(p => p.id === data.player.id);
                if (!existing && this.players.length < 4) {
                    this.players.push(data.player);
                    this.updateLobbyUI();

                    // If host, send room state back to newcomer
                    if (this.isHost) {
                        this.broadcastState('room_sync', { players: this.players });
                    }
                }
                break;
            }

            case 'room_sync': {
                data.players.forEach(remoteP => {
                    const exists = this.players.find(p => p.id === remoteP.id);
                    if (!exists && this.players.length < 4) {
                        this.players.push(remoteP);
                    }
                });
                this.updateLobbyUI();
                break;
            }

            case 'player_left': {
                this.players = this.players.filter(p => p.id !== data.playerId);
                this.removeOpponentCharacter(data.playerId);
                this.updateLobbyUI();
                break;
            }

            case 'countdown_start': {
                this.startCountdownRace(data.seconds);
                break;
            }

            case 'player_pos': {
                this.handleRemotePosition(data);
                break;
            }

            case 'player_crashed': {
                const p = this.players.find(x => x.id === data.id);
                if (p) p.isDead = true;
                const char = this.opponentCharacters.get(data.id);
                if (char) char.triggerCrash();
                this.checkRaceEnd();
                break;
            }
        }
    }

    // ==========================================
    // 3D OPPONENT RUNNERS RENDERING
    // ==========================================

    ensureOpponentCharacter(pData) {
        if (pData.id === this.playerId) return null;
        if (!window.game || !window.game.scene) return null;

        if (!this.opponentCharacters.has(pData.id)) {
            const char = new PlayerCharacter(window.game.scene, true, pData.nickname);
            char.applySkin(pData.skin || 'cyber_ninja');
            this.opponentCharacters.set(pData.id, char);
        }
        return this.opponentCharacters.get(pData.id);
    }

    handleRemotePosition(data) {
        let p = this.players.find(x => x.id === data.id);
        if (p) {
            p.score = data.score;
            p.distance = data.distance;
            p.isDead = data.isDead;
        }

        const char = this.ensureOpponentCharacter(data);
        if (char) {
            const mockPhysics = {
                x: data.x,
                y: data.y,
                z: data.z,
                rollAngle: data.roll,
                isSliding: data.isSliding,
                isGrounded: data.isGrounded
            };
            char.update(0.016, mockPhysics, 20.0);
            if (data.isDead && !char.isDead) {
                char.triggerCrash();
            }
        }

        this.updateRaceHUD();
    }

    removeOpponentCharacter(id) {
        const char = this.opponentCharacters.get(id);
        if (char) {
            char.destroy();
            this.opponentCharacters.delete(id);
        }
    }

    clearOpponentCharacters() {
        this.opponentCharacters.forEach(char => char.destroy());
        this.opponentCharacters.clear();
    }

    // ==========================================
    // MATCH FLOW & UI
    // ==========================================

    requestStartRace() {
        if (!this.isHost) return;
        this.broadcastState('countdown_start', { seconds: 3 });
        this.startCountdownRace(3);
    }

    startCountdownRace(seconds) {
        const overlay = document.getElementById('mp-countdown-overlay');
        const countDigit = document.getElementById('mp-count-digit');
        if (overlay) overlay.classList.remove('hidden');

        let remaining = seconds;
        const tick = () => {
            if (remaining > 0) {
                if (countDigit) countDigit.textContent = remaining;
                if (window.soundEngine) window.soundEngine.playCountdown(false);
                remaining--;
                setTimeout(tick, 1000);
            } else {
                if (countDigit) countDigit.textContent = "GO!";
                if (window.soundEngine) window.soundEngine.playCountdown(true);

                setTimeout(() => {
                    if (overlay) overlay.classList.add('hidden');
                    // Hide lobby, start race!
                    document.getElementById('multiplayer-lobby').classList.add('hidden');
                    this.isRacing = true;
                    if (window.game) {
                        window.game.startMultiplayerGame();
                    }
                    this.showRaceHUD();
                }, 600);
            }
        };

        tick();
    }

    checkRaceEnd() {
        const allDead = this.players.every(p => p.isDead);
        if (allDead && this.isRacing) {
            setTimeout(() => this.showResultsScreen(), 1200);
        }
    }

    showRaceHUD() {
        const hud = document.getElementById('mp-race-hud');
        if (hud) hud.classList.remove('hidden');
        this.updateRaceHUD();
    }

    hideRaceHUD() {
        const hud = document.getElementById('mp-race-hud');
        if (hud) hud.classList.add('hidden');
    }

    updateRaceHUD() {
        const listEl = document.getElementById('mp-race-standings');
        if (!listEl) return;

        // Sort players descending by score
        const sorted = [...this.players].sort((a, b) => (b.score || 0) - (a.score || 0));

        let html = '';
        sorted.forEach((p, idx) => {
            const isSelf = p.id === this.playerId;
            html += `
                <div class="mp-standing-row ${isSelf ? 'mp-row-self' : ''}">
                    <span class="mp-rank">#${idx + 1}</span>
                    <span class="mp-name">${p.nickname}</span>
                    <span class="mp-score">${(p.score || 0).toLocaleString()}</span>
                    ${p.isDead ? '<span class="mp-dead">💀</span>' : ''}
                </div>
            `;
        });
        listEl.innerHTML = html;
    }

    showResultsScreen() {
        this.isRacing = false;
        this.hideRaceHUD();

        const modal = document.getElementById('mp-results-modal');
        if (!modal) return;

        const sorted = [...this.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        const resultsList = document.getElementById('mp-results-list');

        let html = '';
        sorted.forEach((p, idx) => {
            const place = idx + 1;
            const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place', '4th Place'];
            const bonusCoins = [300, 150, 75, 25];

            if (p.id === this.playerId && window.shopManager) {
                // Award winner bonus coins!
                window.dailyRewardManager.addCoins(bonusCoins[idx]);
            }

            html += `
                <div class="mp-result-card rank-${place}">
                    <span class="mp-result-place">${medals[idx]}</span>
                    <span class="mp-result-name">${p.nickname}</span>
                    <span class="mp-result-score">${(p.score || 0).toLocaleString()} pts (${Math.floor(p.distance || 0)}m)</span>
                    <span class="mp-result-reward">+${bonusCoins[idx]} 🪙</span>
                </div>
            `;
        });

        if (resultsList) resultsList.innerHTML = html;
        modal.classList.remove('hidden');

        const btnBack = document.getElementById('btn-mp-results-menu');
        if (btnBack) {
            btnBack.onclick = () => {
                modal.classList.add('hidden');
                this.leaveRoom();
                if (window.game) window.game.showMenu();
            };
        }
    }

    renderLobby(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="modal-content mp-lobby-modal-content">
                <div class="modal-header">
                    <span class="modal-badge">🌐 REAL-TIME BATTLE</span>
                    <h2 class="modal-title">MULTIPLAYER LOBBY</h2>
                    <p class="modal-desc">Challenge up to 4 runners worldwide or invite friends with your room code!</p>
                </div>

                <!-- Room Code Display -->
                <div class="mp-code-display-box">
                    <span class="code-label">ROOM CODE</span>
                    <div class="code-row">
                        <span id="mp-display-room-code" class="code-val">${this.roomCode || '------'}</span>
                        <button id="btn-copy-code" class="btn-sm-primary" title="Copy Room Code">COPY</button>
                    </div>
                </div>

                <!-- Player Roster -->
                <div class="mp-roster-section">
                    <span class="roster-header">PLAYERS IN ROOM (<span id="mp-player-count">${this.players.length}</span>/4)</span>
                    <div id="mp-roster-list" class="mp-roster-grid"></div>
                </div>

                <!-- Lobby Action Buttons -->
                <div class="mp-lobby-actions">
                    ${this.isHost ? `
                        <button id="btn-start-race" class="btn-primary btn-claim-glow" ${this.players.length < 1 ? 'disabled' : ''}>
                            <span>▶</span> START RACE NOW
                        </button>
                    ` : `
                        <div class="waiting-host-notice">
                            <span class="pulse-dot"></span> Waiting for host to start the race...
                        </div>
                    `}
                    <button id="btn-leave-room" class="btn-danger" style="margin-top:10px;">LEAVE ROOM</button>
                </div>
            </div>
        `;

        this.updateLobbyUI();

        // Wire Copy Code
        const btnCopy = container.querySelector('#btn-copy-code');
        if (btnCopy) {
            btnCopy.addEventListener('click', () => {
                navigator.clipboard.writeText(this.roomCode).then(() => {
                    btnCopy.textContent = "COPIED! ✓";
                    setTimeout(() => btnCopy.textContent = "COPY", 1500);
                });
            });
        }

        // Wire Start Race (Host only)
        const btnStart = container.querySelector('#btn-start-race');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                this.requestStartRace();
            });
        }

        // Wire Leave Room
        const btnLeave = container.querySelector('#btn-leave-room');
        if (btnLeave) {
            btnLeave.addEventListener('click', () => {
                this.leaveRoom();
                container.classList.add('hidden');
                if (window.game) window.game.showMenu();
            });
        }
    }

    updateLobbyUI() {
        const countEl = document.getElementById('mp-player-count');
        const rosterEl = document.getElementById('mp-roster-list');
        const codeEl = document.getElementById('mp-display-room-code');

        if (countEl) countEl.textContent = this.players.length;
        if (codeEl) codeEl.textContent = this.roomCode || '------';

        if (rosterEl) {
            let html = '';
            for (let i = 0; i < 4; i++) {
                const p = this.players[i];
                if (p) {
                    html += `
                        <div class="roster-slot slot-filled">
                            <div class="slot-avatar">🏃</div>
                            <span class="slot-name">${p.nickname}</span>
                            <span class="slot-badge">${p.isHost ? 'HOST 👑' : 'READY ✓'}</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="roster-slot slot-empty">
                            <div class="slot-avatar">⌛</div>
                            <span class="slot-name">Waiting...</span>
                            <span class="slot-badge">EMPTY</span>
                        </div>
                    `;
                }
            }
            rosterEl.innerHTML = html;
        }
    }
}

window.MultiplayerManager = MultiplayerManager;
window.multiplayerManager = new MultiplayerManager();
