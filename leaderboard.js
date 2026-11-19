/**
 * Sky Runner 3D - Global Online Leaderboard System
 * Supports Daily, Weekly, and All-Time leaderboards with Supabase REST integration,
 * local server fallback, score validation, top 3 player podiums, and player ranking.
 */

class LeaderboardManager {
    constructor() {
        this.NICKNAME_KEY = 'skyrunner_nickname';
        this.LOCAL_SCORES_KEY = 'skyrunner_cached_leaderboard';

        this.nickname = this.loadNickname();
        this.currentFilter = 'all-time'; // 'daily' | 'weekly' | 'all-time'
        this.cachedScores = [];
    }

    loadNickname() {
        let nick = localStorage.getItem(this.NICKNAME_KEY);
        if (!nick) {
            const randomId = Math.floor(1000 + Math.random() * 9000);
            nick = `Runner_${randomId}`;
            localStorage.setItem(this.NICKNAME_KEY, nick);
        }
        return nick;
    }

    setNickname(name) {
        if (!name || name.trim().length === 0) return false;
        this.nickname = name.trim().slice(0, 16);
        localStorage.setItem(this.NICKNAME_KEY, this.nickname);
        return true;
    }

    /**
     * Server-side & client-side anti-cheat validation.
     * Score cannot exceed distance + coins*50 + level*100 with a safety margin.
     */
    validateScore(score, distance, coins, level) {
        if (typeof score !== 'number' || score < 0 || isNaN(score)) return false;
        if (typeof distance !== 'number' || distance < 0) return false;

        const maxPossibleScore = Math.ceil(distance * 1.5 + (coins || 0) * 60 + (level || 1) * 200 + 500);
        if (score > maxPossibleScore) {
            console.warn(`[Anti-Cheat] Suspicious score rejected: ${score} exceeds max possible ${maxPossibleScore}`);
            return false;
        }

        return true;
    }

    /**
     * Submit score to Supabase and local backend
     */
    async submitScore(score, distance, level, coins) {
        if (!this.validateScore(score, distance, coins, level)) {
            return { success: false, reason: 'Score validation failed' };
        }

        const payload = {
            nickname: this.nickname,
            score: Math.floor(score),
            distance: Math.floor(distance),
            level: level || 1,
            coins: coins || 0,
            created_at: new Date().toISOString()
        };

        // 1. Save to local fallback cache
        this.saveLocalScore(payload);

        // 2. Try Supabase REST API
        let onlineSaved = false;
        try {
            const cfg = window.GAME_CONFIG ? window.GAME_CONFIG.SUPABASE : null;
            if (cfg && cfg.URL && cfg.ANON_KEY && !cfg.ANON_KEY.includes('placeholder')) {
                const response = await fetch(`${cfg.URL}/rest/v1/${cfg.TABLE_LEADERBOARD}`, {
                    method: 'POST',
                    headers: {
                        'apikey': cfg.ANON_KEY,
                        'Authorization': `Bearer ${cfg.ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    onlineSaved = true;
                }
            }
        } catch (e) {
            console.warn('[Leaderboard] Supabase submission error:', e);
        }

        // 3. Try Python Local Server API (/api/highscores)
        try {
            await fetch('/api/highscores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) { }

        return { success: true, online: onlineSaved };
    }

    saveLocalScore(payload) {
        let scores = [];
        try {
            scores = JSON.parse(localStorage.getItem(this.LOCAL_SCORES_KEY) || '[]');
        } catch (e) { }

        scores.push(payload);
        // Sort descending by score
        scores.sort((a, b) => b.score - a.score);
        // Keep top 100
        scores = scores.slice(0, 100);
        localStorage.setItem(this.LOCAL_SCORES_KEY, JSON.stringify(scores));
    }

    /**
     * Fetch leaderboard for daily, weekly, or all-time
     */
    async fetchLeaderboard(filter = 'all-time') {
        this.currentFilter = filter;
        let onlineScores = [];
        const cfg = window.GAME_CONFIG ? window.GAME_CONFIG.SUPABASE : null;

        // Try Supabase fetch
        try {
            if (cfg && cfg.URL && cfg.ANON_KEY && !cfg.ANON_KEY.includes('placeholder')) {
                let query = `${cfg.URL}/rest/v1/${cfg.TABLE_LEADERBOARD}?select=*&order=score.desc&limit=50`;

                const now = new Date();
                if (filter === 'daily') {
                    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                    query += `&created_at=gte.${dayAgo}`;
                } else if (filter === 'weekly') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    query += `&created_at=gte.${weekAgo}`;
                }

                const res = await fetch(query, {
                    headers: {
                        'apikey': cfg.ANON_KEY,
                        'Authorization': `Bearer ${cfg.ANON_KEY}`
                    }
                });

                if (res.ok) {
                    onlineScores = await res.json();
                }
            }
        } catch (e) {
            console.warn('[Leaderboard] Could not fetch from Supabase, using local:', e);
        }

        // Try local server /api/highscores if no Supabase response
        if (onlineScores.length === 0) {
            try {
                const res = await fetch('/api/highscores');
                if (res.ok) {
                    const data = await res.json();
                    if (data.history && data.history.length > 0) {
                        onlineScores = data.history.map(h => ({
                            nickname: h.nickname || "Local Runner",
                            score: h.score,
                            distance: h.distance,
                            level: h.level,
                            created_at: h.created_at || new Date().toISOString()
                        }));
                        onlineScores.sort((a, b) => b.score - a.score);
                    }
                }
            } catch (e) { }
        }

        // Fallback to local storage cache if server is unavailable
        if (onlineScores.length === 0) {
            try {
                onlineScores = JSON.parse(localStorage.getItem(this.LOCAL_SCORES_KEY) || '[]');
            } catch (e) { }
        }

        // Filter local / cached scores if Supabase was not used
        if (onlineScores.length > 0 && (!cfg || !cfg.ANON_KEY || cfg.ANON_KEY.includes('placeholder'))) {
            const nowTime = Date.now();
            if (filter === 'daily') {
                const dayAgo = nowTime - 24 * 60 * 60 * 1000;
                onlineScores = onlineScores.filter(s => new Date(s.created_at).getTime() >= dayAgo);
            } else if (filter === 'weekly') {
                const weekAgo = nowTime - 7 * 24 * 60 * 60 * 1000;
                onlineScores = onlineScores.filter(s => new Date(s.created_at).getTime() >= weekAgo);
            }
        }

        this.cachedScores = onlineScores;
        return onlineScores;
    }

    renderLeaderboard(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="modal-content leaderboard-modal-content">
                <div class="leaderboard-header">
                    <span class="modal-badge">🏆 HALL OF FAME</span>
                    <h2 class="modal-title">GLOBAL LEADERBOARD</h2>

                    <!-- Nickname edit bar -->
                    <div class="player-nickname-bar">
                        <span>Your Nickname:</span>
                        <input id="input-leaderboard-nick" type="text" maxlength="16" value="${this.nickname}">
                        <button id="btn-save-nickname" class="btn-sm-primary">SAVE</button>
                    </div>

                    <!-- Timeframe tabs -->
                    <div class="leaderboard-tabs">
                        <button class="lb-tab-btn ${this.currentFilter === 'daily' ? 'active' : ''}" data-filter="daily">DAILY</button>
                        <button class="lb-tab-btn ${this.currentFilter === 'weekly' ? 'active' : ''}" data-filter="weekly">WEEKLY</button>
                        <button class="lb-tab-btn ${this.currentFilter === 'all-time' ? 'active' : ''}" data-filter="all-time">ALL-TIME</button>
                    </div>
                </div>

                <!-- Top 3 Podium Highlights -->
                <div id="lb-podium" class="podium-container">
                    <div class="podium-loading">Loading Champions...</div>
                </div>

                <!-- Rankings List Table -->
                <div class="leaderboard-table-wrapper">
                    <div class="table-header-row">
                        <span class="th-rank">RANK</span>
                        <span class="th-player">PLAYER</span>
                        <span class="th-level">LEVEL</span>
                        <span class="th-dist">DIST</span>
                        <span class="th-score">SCORE</span>
                    </div>
                    <div id="lb-list-rows" class="table-body-rows"></div>
                </div>

                <button id="btn-close-leaderboard" class="btn-secondary" style="margin-top:16px;">CLOSE</button>
            </div>
        `;

        // Wire tabs
        const tabBtns = container.querySelectorAll('.lb-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                const filter = btn.getAttribute('data-filter');
                this.fetchAndDisplay(container, filter);
            });
        });

        // Wire nickname save
        const btnSaveNick = container.querySelector('#btn-save-nickname');
        const inputNick = container.querySelector('#input-leaderboard-nick');
        if (btnSaveNick && inputNick) {
            btnSaveNick.addEventListener('click', () => {
                if (this.setNickname(inputNick.value)) {
                    if (window.soundEngine) window.soundEngine.playClick();
                    btnSaveNick.textContent = "SAVED! ✓";
                    setTimeout(() => { btnSaveNick.textContent = "SAVE"; }, 1500);
                }
            });
        }

        // Wire close button
        const btnClose = container.querySelector('#btn-close-leaderboard');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                container.classList.add('hidden');
            });
        }

        // Load data
        this.fetchAndDisplay(container, this.currentFilter);
    }

    async fetchAndDisplay(container, filter) {
        this.currentFilter = filter;

        // Update tab styles
        const tabBtns = container.querySelectorAll('.lb-tab-btn');
        tabBtns.forEach(b => {
            if (b.getAttribute('data-filter') === filter) b.classList.add('active');
            else b.classList.remove('active');
        });

        const podiumEl = container.querySelector('#lb-podium');
        const listEl = container.querySelector('#lb-list-rows');
        if (podiumEl) podiumEl.innerHTML = '<div class="podium-loading">Loading Champions...</div>';

        const scores = await this.fetchLeaderboard(filter);

        if (!scores || scores.length === 0) {
            if (podiumEl) podiumEl.innerHTML = '<div class="podium-loading">No scores recorded yet. Be the first!</div>';
            if (listEl) listEl.innerHTML = '';
            return;
        }

        // 1. Render Top 3 Podium
        const top1 = scores[0];
        const top2 = scores[1];
        const top3 = scores[2];

        let podiumHtml = '';
        if (top2) {
            podiumHtml += `
                <div class="podium-step step-2">
                    <div class="podium-badge medal-silver">🥈 #2</div>
                    <span class="podium-name">${top2.nickname}</span>
                    <span class="podium-score">${top2.score.toLocaleString()}</span>
                </div>
            `;
        }
        if (top1) {
            podiumHtml += `
                <div class="podium-step step-1">
                    <div class="podium-crown">👑</div>
                    <div class="podium-badge medal-gold">🥇 #1</div>
                    <span class="podium-name">${top1.nickname}</span>
                    <span class="podium-score">${top1.score.toLocaleString()}</span>
                </div>
            `;
        }
        if (top3) {
            podiumHtml += `
                <div class="podium-step step-3">
                    <div class="podium-badge medal-bronze">🥉 #3</div>
                    <span class="podium-name">${top3.nickname}</span>
                    <span class="podium-score">${top3.score.toLocaleString()}</span>
                </div>
            `;
        }
        if (podiumEl) podiumEl.innerHTML = podiumHtml;

        // 2. Render Rankings Table Rows
        let rowsHtml = '';
        scores.forEach((entry, idx) => {
            const rank = idx + 1;
            const isSelf = entry.nickname === this.nickname;

            let rankClass = 'rank-num';
            if (rank === 1) rankClass += ' rank-gold';
            else if (rank === 2) rankClass += ' rank-silver';
            else if (rank === 3) rankClass += ' rank-bronze';

            rowsHtml += `
                <div class="lb-row ${isSelf ? 'lb-row-self' : ''}">
                    <span class="${rankClass}">#${rank}</span>
                    <span class="lb-cell-player">${entry.nickname} ${isSelf ? '<span class="tag-you">YOU</span>' : ''}</span>
                    <span class="lb-cell-level">Lvl ${entry.level || 1}</span>
                    <span class="lb-cell-dist">${Math.floor(entry.distance || 0)}m</span>
                    <span class="lb-cell-score">${(entry.score || 0).toLocaleString()}</span>
                </div>
            `;
        });

        if (listEl) listEl.innerHTML = rowsHtml;
    }
}

window.LeaderboardManager = LeaderboardManager;
window.leaderboardManager = new LeaderboardManager();
