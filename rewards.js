/**
 * Sky Runner 3D - Seven-Day Daily Rewards System
 * Manages consecutive login streaks, claim validation, countdown timers, and coin rewards.
 */

class DailyRewardManager {
    constructor() {
        this.STORAGE_KEY = 'skyrunner_daily_rewards';
        this.COIN_STORAGE_KEY = 'skyrunner_coins';

        this.rewards = window.GAME_CONFIG ? window.GAME_CONFIG.DAILY_REWARDS : [
            { day: 1, coins: 50 },
            { day: 2, coins: 75 },
            { day: 3, coins: 100 },
            { day: 4, coins: 150 },
            { day: 5, coins: 200 },
            { day: 6, coins: 300 },
            { day: 7, coins: 500 }
        ];

        this.state = this.loadState();
        this.timerInterval = null;
    }

    loadState() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {}
        }

        return {
            currentDay: 1, // 1 to 7
            lastClaimTimestamp: 0,
            history: []
        };
    }

    saveState() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    }

    getCoins() {
        return parseInt(localStorage.getItem(this.COIN_STORAGE_KEY) || '0', 10);
    }

    addCoins(amount) {
        const current = this.getCoins();
        const updated = current + amount;
        localStorage.setItem(this.COIN_STORAGE_KEY, updated.toString());

        // Dispatch coin update event so HUD and Shop sync immediately
        window.dispatchEvent(new CustomEvent('coinsUpdated', { detail: { coins: updated } }));
        return updated;
    }

    /**
     * Checks if a reward is ready to claim right now.
     * Rules:
     * - First time playing: Ready immediately (Day 1).
     * - Next claim available 20 hours after last claim (or new calendar day).
     * - If more than 48 hours passed since last claim, streak resets to Day 1.
     */
    checkClaimStatus() {
        const now = Date.now();
        const last = this.state.lastClaimTimestamp;

        if (!last || last === 0) {
            return {
                canClaim: true,
                currentDay: 1,
                remainingMs: 0
            };
        }

        const elapsedMs = now - last;
        const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
        const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

        // If missed streak (> 48h)
        if (elapsedMs > FORTY_EIGHT_HOURS_MS) {
            this.state.currentDay = 1;
            this.saveState();
            return {
                canClaim: true,
                currentDay: 1,
                remainingMs: 0,
                streakReset: true
            };
        }

        // Ready to claim if >= 20 hours elapsed
        if (elapsedMs >= TWENTY_HOURS_MS) {
            return {
                canClaim: true,
                currentDay: this.state.currentDay,
                remainingMs: 0
            };
        }

        // Still cooling down
        return {
            canClaim: false,
            currentDay: this.state.currentDay,
            remainingMs: TWENTY_HOURS_MS - elapsedMs
        };
    }

    claimCurrentReward() {
        const status = this.checkClaimStatus();
        if (!status.canClaim) {
            return { success: false, reason: 'Cooldown active', remainingMs: status.remainingMs };
        }

        const dayIndex = this.state.currentDay - 1;
        const rewardObj = this.rewards[dayIndex] || this.rewards[0];
        const coinAmount = rewardObj.coins;

        // Award coins
        this.addCoins(coinAmount);

        // Update state
        this.state.lastClaimTimestamp = Date.now();
        this.state.history.push({
            day: this.state.currentDay,
            coins: coinAmount,
            claimedAt: new Date().toISOString()
        });

        const claimedDay = this.state.currentDay;

        // Advance to next day (or loop back to 1 after day 7)
        if (this.state.currentDay >= 7) {
            this.state.currentDay = 1;
        } else {
            this.state.currentDay++;
        }

        this.saveState();

        if (window.soundEngine) {
            window.soundEngine.playRewardClaim();
        }

        return {
            success: true,
            day: claimedDay,
            coins: coinAmount,
            newTotalCoins: this.getCoins()
        };
    }

    renderModal(modalContainerId) {
        const container = document.getElementById(modalContainerId);
        if (!container) return;

        const status = this.checkClaimStatus();
        const activeDay = status.canClaim ? this.state.currentDay : ((this.state.currentDay === 1 ? 7 : this.state.currentDay - 1));

        let daysHtml = '';
        for (let i = 1; i <= 7; i++) {
            const reward = this.rewards[i - 1];
            let itemClass = 'reward-day-card';
            let statusBadge = '';

            if (status.canClaim && i === this.state.currentDay) {
                itemClass += ' reward-ready pulse-ready';
                statusBadge = '<span class="reward-tag tag-claimable">READY!</span>';
            } else if (!status.canClaim && i < this.state.currentDay) {
                itemClass += ' reward-claimed';
                statusBadge = '<span class="reward-tag tag-claimed">CLAIMED ✓</span>';
            } else if (i < this.state.currentDay) {
                itemClass += ' reward-claimed';
                statusBadge = '<span class="reward-tag tag-claimed">CLAIMED ✓</span>';
            } else {
                itemClass += ' reward-locked';
                statusBadge = '<span class="reward-tag tag-locked">LOCKED 🔒</span>';
            }

            daysHtml += `
                <div class="${itemClass}" data-day="${i}">
                    <span class="day-number">DAY ${i}</span>
                    <div class="day-coin-icon">🪙</div>
                    <span class="day-coins">+${reward.coins}</span>
                    ${statusBadge}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="modal-content rewards-modal-content">
                <div class="modal-header">
                    <span class="modal-badge">🎁 DAILY LOGIN BONUS</span>
                    <h2 class="modal-title">7-DAY REWARDS</h2>
                    <p class="modal-desc">Log in daily to unlock larger coin rewards! Complete Day 7 for 500 Gold Coins!</p>
                </div>

                <div class="rewards-calendar-grid">
                    ${daysHtml}
                </div>

                <div class="reward-claim-section">
                    ${status.canClaim ? `
                        <button id="btn-claim-daily" class="btn-primary btn-claim-glow">
                            <span>🎁</span> CLAIM DAY ${this.state.currentDay} (+${this.rewards[this.state.currentDay - 1].coins} COINS)
                        </button>
                    ` : `
                        <div class="reward-countdown-box">
                            <span class="countdown-label">Next Daily Reward in:</span>
                            <span id="daily-countdown-timer" class="countdown-digits">00:00:00</span>
                        </div>
                    `}
                </div>

                <button id="btn-close-rewards" class="btn-secondary" style="margin-top:16px;">CLOSE</button>
            </div>
        `;

        // Wire close button
        const btnClose = container.querySelector('#btn-close-rewards');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                container.classList.add('hidden');
                if (this.timerInterval) clearInterval(this.timerInterval);
            });
        }

        // Wire claim button
        const btnClaim = container.querySelector('#btn-claim-daily');
        if (btnClaim) {
            btnClaim.addEventListener('click', () => {
                const res = this.claimCurrentReward();
                if (res.success) {
                    this.showClaimAnimation(res.coins);
                    this.renderModal(modalContainerId);
                }
            });
        }

        // Start countdown timer if cooldown is active
        if (!status.canClaim) {
            this.startCountdown(status.remainingMs, container.querySelector('#daily-countdown-timer'), () => {
                this.renderModal(modalContainerId);
            });
        }
    }

    startCountdown(remainingMs, element, onComplete) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        let left = remainingMs;

        const updateText = () => {
            if (left <= 0) {
                clearInterval(this.timerInterval);
                if (onComplete) onComplete();
                return;
            }
            const hours = Math.floor(left / (1000 * 60 * 60));
            const minutes = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((left % (1000 * 60)) / 1000);

            const pad = (n) => n.toString().padStart(2, '0');
            if (element) {
                element.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
            }
            left -= 1000;
        };

        updateText();
        this.timerInterval = setInterval(updateText, 1000);
    }

    showClaimAnimation(coins) {
        // Floating celebration overlay
        const toast = document.createElement('div');
        toast.className = 'claim-celebration-toast';
        toast.innerHTML = `
            <div class="toast-coin-burst">🪙🪙🪙</div>
            <h2>REWARD CLAIMED!</h2>
            <p>+${coins} Gold Coins Added!</p>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 1800);
    }
}

window.DailyRewardManager = DailyRewardManager;
window.dailyRewardManager = new DailyRewardManager();
