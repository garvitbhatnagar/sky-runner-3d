/**
 * Sky Runner 3D - Coin Shop & Character Skins Manager
 * Handles skin unlocking, previewing in 3D, cosmetic trails, accessories,
 * coin transactions, and inventory persistence.
 */

class ShopManager {
    constructor() {
        this.STORAGE_KEY = 'skyrunner_inventory';
        this.COIN_STORAGE_KEY = 'skyrunner_coins';

        this.inventory = this.loadInventory();
        this.previewRenderer = null;
        this.previewScene = null;
        this.previewCamera = null;
        this.previewPlayer = null;
        this.previewAnimId = null;

        this.currentTab = 'skins'; // 'skins' | 'trails' | 'accessories'
        this.selectedItemId = this.inventory.equippedSkin;
    }

    loadInventory() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {}
        }

        return {
            ownedSkins: ['horizon'],
            equippedSkin: 'horizon',
            ownedTrails: ['none'],
            equippedTrail: 'none',
            ownedAccessories: ['none'],
            equippedAccessory: 'none'
        };
    }

    saveInventory() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.inventory));
        // Update game player character if active
        if (window.game && window.game.player) {
            window.game.player.applySkin(this.inventory.equippedSkin);
            window.game.player.applyTrail(this.inventory.equippedTrail);
            window.game.player.applyAccessory(this.inventory.equippedAccessory);
        }
    }

    getCoins() {
        return parseInt(localStorage.getItem(this.COIN_STORAGE_KEY) || '0', 10);
    }

    deductCoins(amount) {
        const current = this.getCoins();
        if (current < amount) return false;
        const updated = current - amount;
        localStorage.setItem(this.COIN_STORAGE_KEY, updated.toString());
        window.dispatchEvent(new CustomEvent('coinsUpdated', { detail: { coins: updated } }));
        return true;
    }

    isOwned(type, id) {
        if (type === 'skins') return this.inventory.ownedSkins.includes(id);
        if (type === 'trails') return this.inventory.ownedTrails.includes(id);
        if (type === 'accessories') return this.inventory.ownedAccessories.includes(id);
        return false;
    }

    isEquipped(type, id) {
        if (type === 'skins') return this.inventory.equippedSkin === id;
        if (type === 'trails') return this.inventory.equippedTrail === id;
        if (type === 'accessories') return this.inventory.equippedAccessory === id;
        return false;
    }

    purchaseItem(type, item) {
        if (this.isOwned(type, item.id)) return { success: false, reason: "Already owned" };

        const price = item.price || 0;
        if (this.getCoins() < price) {
            if (typeof alert !== 'undefined') {
                alert(`Not enough coins! You need ${price.toLocaleString()} coins to unlock ${item.name}. Keep running to collect more!`);
            }
            return { success: false, reason: "Insufficient coins" };
        }

        if (this.deductCoins(price)) {
            if (type === 'skins') {
                this.inventory.ownedSkins.push(item.id);
                this.inventory.equippedSkin = item.id;
            } else if (type === 'trails') {
                this.inventory.ownedTrails.push(item.id);
                this.inventory.equippedTrail = item.id;
            } else if (type === 'accessories') {
                this.inventory.ownedAccessories.push(item.id);
                this.inventory.equippedAccessory = item.id;
            }

            this.saveInventory();

            if (window.soundEngine) window.soundEngine.playPurchase();
            return { success: true, item };
        }

        return { success: false, reason: "Transaction failed" };
    }

    equipItem(type, id) {
        if (!this.isOwned(type, id)) return false;

        if (type === 'skins') this.inventory.equippedSkin = id;
        else if (type === 'trails') this.inventory.equippedTrail = id;
        else if (type === 'accessories') this.inventory.equippedAccessory = id;

        this.saveInventory();
        if (window.soundEngine) window.soundEngine.playClick();
        return true;
    }

    // ==========================================
    // 3D PREVIEW ENGINE FOR SHOP
    // ==========================================

    init3DPreview(canvasElement) {
        if (!canvasElement) return;

        if (this.previewRenderer) {
            this.stop3DPreview();
        }

        const width = canvasElement.clientWidth || 320;
        const height = canvasElement.clientHeight || 360;

        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
        this.previewCamera.position.set(0, 1.3, 3.8);
        this.previewCamera.lookAt(0, 1.0, 0);

        this.previewRenderer = new THREE.WebGLRenderer({
            canvas: canvasElement,
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(width, height);
        this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Lighting for preview character
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.9);
        this.previewScene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
        dirLight.position.set(5, 8, 5);
        this.previewScene.add(dirLight);

        const backLight = new THREE.DirectionalLight(0x00d2ff, 0.6);
        backLight.position.set(-5, 4, -5);
        this.previewScene.add(backLight);

        // Preview Player Character
        this.previewPlayer = new PlayerCharacter(this.previewScene, false, "Preview");
        this.previewPlayer.applySkin(this.inventory.equippedSkin);
        this.previewPlayer.applyAccessory(this.inventory.equippedAccessory);
        this.previewPlayer.applyTrail(this.inventory.equippedTrail);

        // Preview Render Loop
        const animate = () => {
            this.previewAnimId = requestAnimationFrame(animate);
            if (this.previewPlayer && this.previewPlayer.group) {
                this.previewPlayer.group.rotation.y += 0.015; // Slow gentle spin
            }
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        };
        animate();
    }

    updatePreview(skinId, accessoryId, trailId) {
        if (!this.previewPlayer) return;
        if (skinId) this.previewPlayer.applySkin(skinId);
        if (accessoryId !== undefined) this.previewPlayer.applyAccessory(accessoryId);
        if (trailId !== undefined) this.previewPlayer.applyTrail(trailId);
    }

    stop3DPreview() {
        if (this.previewAnimId) {
            cancelAnimationFrame(this.previewAnimId);
            this.previewAnimId = null;
        }
        if (this.previewRenderer) {
            this.previewRenderer.dispose();
            this.previewRenderer = null;
        }
        this.previewScene = null;
        this.previewCamera = null;
        this.previewPlayer = null;
    }

    // ==========================================
    // SHOP UI RENDERING
    // ==========================================

    renderShop(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const currentCoins = this.getCoins();

        container.innerHTML = `
            <div class="modal-content shop-modal-content">
                <div class="shop-header">
                    <div class="shop-title-area">
                        <span class="modal-badge">⚡ COSMETIC VAULT</span>
                        <h2 class="modal-title">IN-GAME SHOP</h2>
                    </div>

                    <div class="shop-coins-display">
                        <span class="coin-icon">🪙</span>
                        <span id="shop-coin-count" class="coin-amount">${currentCoins.toLocaleString()}</span>
                    </div>
                </div>

                <div class="shop-tabs">
                    <button class="shop-tab-btn ${this.currentTab === 'skins' ? 'active' : ''}" data-tab="skins">👤 SKINS (${window.GAME_CONFIG.SKINS.length})</button>
                    <button class="shop-tab-btn ${this.currentTab === 'trails' ? 'active' : ''}" data-tab="trails">✨ TRAILS (${window.GAME_CONFIG.TRAILS.length})</button>
                    <button class="shop-tab-btn ${this.currentTab === 'accessories' ? 'active' : ''}" data-tab="accessories">👑 HATS & GEAR (${window.GAME_CONFIG.ACCESSORIES.length})</button>
                </div>

                <div class="shop-body-layout">
                    <!-- Left: 3D Live Character Viewport -->
                    <div class="shop-preview-pane">
                        <canvas id="shop-3d-canvas" class="shop-canvas"></canvas>
                        <div id="shop-preview-info" class="preview-item-info">
                            <h3 id="preview-item-name" class="preview-name">Select an Item</h3>
                            <p id="preview-item-desc" class="preview-desc">Rotate to view outfit in full 3D.</p>
                        </div>
                    </div>

                    <!-- Right: Item Grid -->
                    <div class="shop-catalog-pane">
                        <div id="shop-item-grid" class="shop-grid"></div>
                    </div>
                </div>

                <button id="btn-close-shop" class="btn-secondary" style="margin-top:16px;">BACK TO MENU</button>
            </div>
        `;

        // Wire tabs
        const tabBtns = container.querySelectorAll('.shop-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                this.currentTab = btn.getAttribute('data-tab');
                this.renderShop(containerId);
            });
        });

        // Wire close button
        const btnClose = container.querySelector('#btn-close-shop');
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                if (window.soundEngine) window.soundEngine.playClick();
                this.stop3DPreview();
                container.classList.add('hidden');
            });
        }

        // Initialize 3D Preview Canvas
        setTimeout(() => {
            const canvas = container.querySelector('#shop-3d-canvas');
            if (canvas) {
                this.init3DPreview(canvas);
                this.renderItemGrid(container);
            }
        }, 50);
    }

    renderItemGrid(container) {
        const grid = container.querySelector('#shop-item-grid');
        if (!grid) return;

        let items = [];
        if (this.currentTab === 'skins') items = window.GAME_CONFIG.SKINS;
        else if (this.currentTab === 'trails') items = window.GAME_CONFIG.TRAILS;
        else if (this.currentTab === 'accessories') items = window.GAME_CONFIG.ACCESSORIES;

        let html = '';
        items.forEach(item => {
            const owned = this.isOwned(this.currentTab, item.id);
            const equipped = this.isEquipped(this.currentTab, item.id);

            let actionBtn = '';
            if (equipped) {
                actionBtn = `<button class="btn-shop-action btn-equipped" disabled>EQUIPPED ✓</button>`;
            } else if (owned) {
                actionBtn = `<button class="btn-shop-action btn-equip" data-id="${item.id}" data-type="${this.currentTab}">EQUIP</button>`;
            } else {
                actionBtn = `<button class="btn-shop-action btn-buy" data-id="${item.id}" data-type="${this.currentTab}"><span>🪙</span> ${item.price.toLocaleString()}</button>`;
            }

            html += `
                <div class="shop-card ${equipped ? 'card-equipped' : ''}" data-id="${item.id}" data-type="${this.currentTab}">
                    <div class="card-icon">${item.icon || '👕'}</div>
                    <div class="card-info">
                        <span class="card-title">${item.name}</span>
                        <span class="card-subtitle">${item.subtitle || ''}</span>
                    </div>
                    ${actionBtn}
                </div>
            `;
        });

        grid.innerHTML = html;

        // Wire click for card selection (updates 3D preview)
        const cards = grid.querySelectorAll('.shop-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return; // let button handler execute
                const id = card.getAttribute('data-id');
                const type = card.getAttribute('data-type');
                this.selectItemForPreview(type, id, container);
            });
        });

        // Wire Equip buttons
        const equipBtns = grid.querySelectorAll('.btn-equip');
        equipBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const type = btn.getAttribute('data-type');
                this.equipItem(type, id);
                this.renderItemGrid(container);
                this.selectItemForPreview(type, id, container);
            });
        });

        // Wire Buy buttons
        const buyBtns = grid.querySelectorAll('.btn-buy');
        buyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const type = btn.getAttribute('data-type');
                let itm = items.find(x => x.id === id);
                if (itm) {
                    const confirmBuy = confirm(`Unlock "${itm.name}" for ${itm.price.toLocaleString()} Gold Coins?`);
                    if (confirmBuy) {
                        const res = this.purchaseItem(type, itm);
                        if (res.success) {
                            // Update coin display in header
                            const coinCount = container.querySelector('#shop-coin-count');
                            if (coinCount) coinCount.textContent = this.getCoins().toLocaleString();
                            this.renderItemGrid(container);
                            this.selectItemForPreview(type, id, container);
                        }
                    }
                }
            });
        });

        // Select default preview
        if (items.length > 0) {
            this.selectItemForPreview(this.currentTab, items[0].id, container);
        }
    }

    selectItemForPreview(type, id, container) {
        let itm;
        if (type === 'skins') itm = window.GAME_CONFIG.SKINS.find(s => s.id === id);
        else if (type === 'trails') itm = window.GAME_CONFIG.TRAILS.find(t => t.id === id);
        else if (type === 'accessories') itm = window.GAME_CONFIG.ACCESSORIES.find(a => a.id === id);

        if (!itm) return;

        const nameEl = container.querySelector('#preview-item-name');
        const descEl = container.querySelector('#preview-item-desc');
        if (nameEl) nameEl.textContent = itm.name;
        if (descEl) descEl.textContent = itm.description || itm.subtitle || "Premium cosmetic upgrade.";

        if (type === 'skins') {
            this.updatePreview(id, this.inventory.equippedAccessory, this.inventory.equippedTrail);
        } else if (type === 'accessories') {
            this.updatePreview(this.inventory.equippedSkin, id, this.inventory.equippedTrail);
        } else if (type === 'trails') {
            this.updatePreview(this.inventory.equippedSkin, this.inventory.equippedAccessory, id);
        }
    }
}

window.ShopManager = ShopManager;
window.shopManager = new ShopManager();
