/**
 * Sky Runner 3D - 3D Player Character & Character Customization
 * Articulated stylized 3D runner with 12 unlockable skins, hats/accessories,
 * dynamic particle trails, running/jumping/sliding animations, and opponent ghost runners.
 */

class PlayerCharacter {
    constructor(scene, isOpponent = false, nickname = "Player") {
        this.scene = scene;
        this.isOpponent = isOpponent;
        this.nickname = nickname;

        this.group = new THREE.Group();
        this.runCycle = 0;
        this.isDead = false;

        // Customization
        this.currentSkinId = 'horizon';
        this.currentTrailId = 'none';
        this.currentAccessoryId = 'none';

        // Materials dictionary
        this.materials = {};

        // Trail particles
        this.trailParticles = [];
        this.trailTimer = 0;

        // Build character
        this.buildMesh();
        this.buildShadow();
        if (this.isOpponent) {
            this.buildNametag(nickname);
        }

        this.scene.add(this.group);
    }

    buildMesh() {
        // Base materials based on default skin
        const skinData = this.getSkinData(this.currentSkinId);
        this.initMaterials(skinData.colors);

        // 1. Torso & Upper Body
        this.torsoGroup = new THREE.Group();
        this.torsoGroup.position.y = 1.0;

        const torsoGeo = new THREE.BoxGeometry(0.70, 0.68, 0.40);
        this.torsoMesh = new THREE.Mesh(torsoGeo, this.materials.jersey);
        this.torsoMesh.castShadow = true;
        this.torsoGroup.add(this.torsoMesh);

        // Invulnerability Shield Bubble (used during grace periods)
        const shieldGeo = new THREE.SphereGeometry(1.2, 16, 16);
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
            transparent: true,
            opacity: 0.35,
            wireframe: true
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.position.y = 1.0;
        this.shieldMesh.visible = false;
        this.group.add(this.shieldMesh);

        // Runner chest stripe / emblem
        const stripeGeo = new THREE.BoxGeometry(0.72, 0.14, 0.42);
        this.stripeMesh = new THREE.Mesh(stripeGeo, this.materials.stripe);
        this.torsoGroup.add(this.stripeMesh);

        // 2. Head & Visor
        this.headGroup = new THREE.Group();
        this.headGroup.position.y = 0.58;

        const headGeo = new THREE.BoxGeometry(0.38, 0.40, 0.38);
        this.headMesh = new THREE.Mesh(headGeo, this.materials.skin);
        this.headMesh.castShadow = true;
        this.headGroup.add(this.headMesh);

        // Hair / Helmet
        const hairGeo = new THREE.BoxGeometry(0.40, 0.16, 0.40);
        this.hairMesh = new THREE.Mesh(hairGeo, this.materials.hair);
        this.hairMesh.position.y = 0.18;
        this.headGroup.add(this.hairMesh);

        // Visor / Glasses
        const visorGeo = new THREE.BoxGeometry(0.42, 0.12, 0.24);
        this.visorMesh = new THREE.Mesh(visorGeo, this.materials.visor);
        this.visorMesh.position.set(0, 0.05, 0.14);
        this.headGroup.add(this.visorMesh);

        // Accessory Slot (Crown, Halo, VR, Headband)
        this.accessoryGroup = new THREE.Group();
        this.accessoryGroup.position.set(0, 0.28, 0);
        this.headGroup.add(this.accessoryGroup);

        this.torsoGroup.add(this.headGroup);

        // 3. Left Arm & Hand
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.46, 0.24, 0);
        const armGeo = new THREE.BoxGeometry(0.19, 0.58, 0.19);
        this.leftArmMesh = new THREE.Mesh(armGeo, this.materials.jersey);
        this.leftArmMesh.position.y = -0.24;
        this.leftArmMesh.castShadow = true;
        this.leftArm.add(this.leftArmMesh);

        const handGeo = new THREE.BoxGeometry(0.17, 0.17, 0.17);
        this.leftHandMesh = new THREE.Mesh(handGeo, this.materials.skin);
        this.leftHandMesh.position.y = -0.56;
        this.leftArm.add(this.leftHandMesh);
        this.torsoGroup.add(this.leftArm);

        // 4. Right Arm & Hand
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.46, 0.24, 0);
        this.rightArmMesh = new THREE.Mesh(armGeo, this.materials.jersey);
        this.rightArmMesh.position.y = -0.24;
        this.rightArmMesh.castShadow = true;
        this.rightArm.add(this.rightArmMesh);

        this.rightHandMesh = new THREE.Mesh(handGeo, this.materials.skin);
        this.rightHandMesh.position.y = -0.56;
        this.rightArm.add(this.rightHandMesh);
        this.torsoGroup.add(this.rightArm);

        this.group.add(this.torsoGroup);

        // 5. Left Leg & Shoe
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.21, 0.72, 0);
        const legGeo = new THREE.BoxGeometry(0.23, 0.62, 0.23);
        this.leftLegMesh = new THREE.Mesh(legGeo, this.materials.pants);
        this.leftLegMesh.position.y = -0.26;
        this.leftLegMesh.castShadow = true;
        this.leftLeg.add(this.leftLegMesh);

        const shoeGeo = new THREE.BoxGeometry(0.25, 0.18, 0.40);
        this.leftShoeMesh = new THREE.Mesh(shoeGeo, this.materials.shoes);
        this.leftShoeMesh.position.set(0, -0.62, 0.08);
        this.leftShoeMesh.castShadow = true;
        this.leftLeg.add(this.leftShoeMesh);
        this.group.add(this.leftLeg);

        // 6. Right Leg & Shoe
        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.21, 0.72, 0);
        this.rightLegMesh = new THREE.Mesh(legGeo, this.materials.pants);
        this.rightLegMesh.position.y = -0.26;
        this.rightLegMesh.castShadow = true;
        this.rightLeg.add(this.rightLegMesh);

        this.rightShoeMesh = new THREE.Mesh(shoeGeo, this.materials.shoes);
        this.rightShoeMesh.position.set(0, -0.62, 0.08);
        this.rightShoeMesh.castShadow = true;
        this.rightLeg.add(this.rightShoeMesh);
        this.group.add(this.rightLeg);
    }

    buildShadow() {
        // High-fidelity soft radial contact shadow texture
        let shadowTex = null;
        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
            grad.addColorStop(0.25, 'rgba(0, 0, 0, 0.55)');
            grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.20)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 128, 128);
            shadowTex = new THREE.CanvasTexture(canvas);
        }

        const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
        shadowGeo.rotateX(-Math.PI / 2);
        const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTex,
            color: 0x000000,
            transparent: true,
            opacity: 0.65,
            depthWrite: false
        });
        this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadowMesh.position.y = 0.02;
        this.scene.add(this.shadowMesh);
    }

    buildNametag(text) {
        // Overhead canvas texture for multiplayer opponent nametag
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(10, 15, 29, 0.75)';
        ctx.roundRect ? ctx.roundRect(4, 4, 248, 56, 12) : ctx.rect(4, 4, 248, 56);
        ctx.fill();

        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.nametagSprite = new THREE.Sprite(spriteMat);
        this.nametagSprite.position.set(0, 2.3, 0);
        this.nametagSprite.scale.set(1.8, 0.45, 1);
        this.group.add(this.nametagSprite);
    }

    updateNametag(text) {
        this.nickname = text;
        if (this.nametagSprite) {
            this.group.remove(this.nametagSprite);
            this.buildNametag(text);
        }
    }

    getSkinData(skinId) {
        if (window.GAME_CONFIG && window.GAME_CONFIG.SKINS) {
            const found = window.GAME_CONFIG.SKINS.find(s => s.id === skinId);
            if (found) return found;
        }
        return {
            colors: {
                skin: 0xffcc99,
                jersey: 0x00d2ff,
                stripe: 0xffaa00,
                pants: 0x1f2430,
                shoes: 0xff3366,
                hair: 0x221a15,
                visor: 0xffaa00,
                trail: 0x00d2ff
            }
        };
    }

    initMaterials(c) {
        this.materials.skin = new THREE.MeshStandardMaterial({ color: c.skin, roughness: 0.7, metalness: 0.1 });
        this.materials.jersey = new THREE.MeshStandardMaterial({ color: c.jersey, roughness: 0.45, metalness: 0.25 });
        this.materials.stripe = new THREE.MeshStandardMaterial({ color: c.stripe, roughness: 0.35, metalness: 0.4 });
        this.materials.pants = new THREE.MeshStandardMaterial({ color: c.pants, roughness: 0.6, metalness: 0.15 });
        this.materials.shoes = new THREE.MeshStandardMaterial({ color: c.shoes, roughness: 0.4, metalness: 0.3 });
        this.materials.hair = new THREE.MeshStandardMaterial({ color: c.hair, roughness: 0.85 });
        this.materials.visor = new THREE.MeshStandardMaterial({ color: c.visor, roughness: 0.2, metalness: 0.7 });
    }

    applySkin(skinId) {
        this.currentSkinId = skinId;
        const skinData = this.getSkinData(skinId);
        const c = skinData.colors;

        this.materials.skin.color.setHex(c.skin);
        this.materials.jersey.color.setHex(c.jersey);
        this.materials.stripe.color.setHex(c.stripe);
        this.materials.pants.color.setHex(c.pants);
        this.materials.shoes.color.setHex(c.shoes);
        this.materials.hair.color.setHex(c.hair);
        this.materials.visor.color.setHex(c.visor);
    }

    applyAccessory(accessoryId) {
        this.currentAccessoryId = accessoryId;
        // Clear previous accessory
        while (this.accessoryGroup.children.length > 0) {
            this.accessoryGroup.remove(this.accessoryGroup.children[0]);
        }

        if (accessoryId === 'crown') {
            // Gold Royal Crown
            const crownGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.14, 5);
            const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
            const crown = new THREE.Mesh(crownGeo, crownMat);
            crown.position.y = 0.05;
            this.accessoryGroup.add(crown);
        } else if (accessoryId === 'halo') {
            // Cyber Angel Torus Halo
            const haloGeo = new THREE.TorusGeometry(0.25, 0.035, 8, 24);
            haloGeo.rotateX(Math.PI / 2);
            const haloMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            halo.position.y = 0.16;
            this.accessoryGroup.add(halo);
        } else if (accessoryId === 'vr_headset') {
            // VR Goggles
            const vrGeo = new THREE.BoxGeometry(0.38, 0.16, 0.24);
            const vrMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.3 });
            const vr = new THREE.Mesh(vrGeo, vrMat);
            vr.position.set(0, -0.15, 0.18);
            this.accessoryGroup.add(vr);
        } else if (accessoryId === 'headband') {
            // Shinobi Headband
            const bandGeo = new THREE.BoxGeometry(0.42, 0.09, 0.42);
            const bandMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
            const band = new THREE.Mesh(bandGeo, bandMat);
            band.position.y = -0.05;
            this.accessoryGroup.add(band);
        }
    }

    applyTrail(trailId) {
        this.currentTrailId = trailId;
    }

    emitTrailParticle() {
        if (this.currentTrailId === 'none' && !this.isOpponent) return;

        let pColor = 0x00d2ff;
        if (window.GAME_CONFIG && window.GAME_CONFIG.TRAILS) {
            const tr = window.GAME_CONFIG.TRAILS.find(t => t.id === this.currentTrailId);
            if (tr) pColor = tr.color;
        }

        const pGeo = new THREE.DodecahedronGeometry(0.10);
        const pMat = new THREE.MeshBasicMaterial({
            color: pColor,
            transparent: true,
            opacity: 0.85
        });

        const p = new THREE.Mesh(pGeo, pMat);
        p.position.set(
            this.group.position.x + (Math.random() - 0.5) * 0.3,
            this.group.position.y + 0.3 + Math.random() * 0.4,
            this.group.position.z + 0.5
        );

        this.scene.add(p);
        this.trailParticles.push({
            mesh: p,
            life: 0.35,
            maxLife: 0.35,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.4 + Math.random() * 0.8,
            vz: 2.0 + Math.random() * 2.0
        });
    }

    reset() {
        this.isDead = false;
        this.group.rotation.set(0, 0, 0);
        this.torsoGroup.position.set(0, 1.0, 0);
        this.torsoGroup.rotation.set(0, 0, 0);
        this.leftArm.rotation.set(0, 0, 0);
        this.rightArm.rotation.set(0, 0, 0);
        this.leftLeg.rotation.set(0, 0, 0);
        this.rightLeg.rotation.set(0, 0, 0);
        this.shadowMesh.visible = true;

        // Clear particles
        for (let p of this.trailParticles) {
            this.scene.remove(p.mesh);
        }
        this.trailParticles = [];
    }

    destroy() {
        this.scene.remove(this.group);
        if (this.shadowMesh) this.scene.remove(this.shadowMesh);
        for (let p of this.trailParticles) {
            this.scene.remove(p.mesh);
        }
        this.trailParticles = [];
    }

    update(dt, physics, gameSpeed) {
        // Update trail particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.trailParticles.splice(i, 1);
            } else {
                p.mesh.position.x += p.vx * dt;
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.z += p.vz * dt;
                const ratio = p.life / p.maxLife;
                p.mesh.scale.set(ratio, ratio, ratio);
                p.mesh.material.opacity = ratio * 0.85;
            }
        }

        if (this.isDead) {
            this.group.rotation.x -= 8.0 * dt;
            this.group.position.y = Math.max(0.3, this.group.position.y - 4.0 * dt);
            return;
        }

        // Emit trail particles periodically when moving fast
        if (gameSpeed > 5 && (this.currentTrailId !== 'none')) {
            this.trailTimer += dt;
            if (this.trailTimer > 0.04) {
                this.emitTrailParticle();
                this.trailTimer = 0;
            }
        }

        // Synchronize with physics position
        this.group.position.x = physics.x;
        this.group.position.y = physics.y;
        this.group.position.z = physics.z;

        // Lean into turns
        this.group.rotation.z = physics.rollAngle;

        // Invulnerability Shield & Mesh Blinking
        if (physics.isInvulnerable) {
            if (this.shieldMesh) {
                this.shieldMesh.visible = true;
                this.shieldMesh.rotation.y += 3.5 * dt;
            }
            const blink = Math.floor(performance.now() * 0.015) % 2 === 0;
            if (this.torsoMesh) this.torsoMesh.visible = blink;
        } else {
            if (this.shieldMesh) this.shieldMesh.visible = false;
            if (this.torsoMesh) this.torsoMesh.visible = true;
        }

        // Update contact drop shadow
        if (this.shadowMesh) {
            if (physics.isFlying || physics.y > 6.0) {
                this.shadowMesh.visible = false;
            } else {
                this.shadowMesh.visible = true;
                this.shadowMesh.position.x = physics.x;
                this.shadowMesh.position.z = physics.z;
                const heightRatio = Math.max(0, 1.0 - (physics.y / 4.0));
                if (physics.isSliding) {
                    this.shadowMesh.scale.set(heightRatio * 1.1, 1.0, heightRatio * 1.5);
                } else {
                    this.shadowMesh.scale.set(heightRatio, 1.0, heightRatio);
                }
                this.shadowMesh.material.opacity = Math.max(0.12, 0.65 * heightRatio);
            }
        }

        // ANIMATIONS & POSES
        if (physics.isFlying || physics.isDescending) {
            // Super aerodynamic flying pose!
            this.torsoGroup.position.y = 1.0;
            this.torsoGroup.rotation.x = 0.55;
            this.leftArm.rotation.x = 2.4;
            this.rightArm.rotation.x = 2.4;
            this.leftLeg.rotation.x = 0.45;
            this.rightLeg.rotation.x = 0.45;

            // Emit dual jetpack thruster flame particles!
            this.emitJetpackThrusterParticles(dt);
        } else if (physics.isSliding) {
            // Slide / Crouch pose
            this.torsoGroup.position.y = 0.45;
            this.torsoGroup.rotation.x = 0.85;
            this.leftLeg.rotation.x = -1.2;
            this.rightLeg.rotation.x = 0.4;
            this.leftArm.rotation.x = -0.5;
            this.rightArm.rotation.x = -0.5;
        } else if (!physics.isGrounded) {
            // Jumping pose
            this.torsoGroup.position.y = 1.0;
            this.torsoGroup.rotation.x = -0.2;
            this.leftArm.rotation.x = -2.2;
            this.rightArm.rotation.x = -2.2;
            this.leftLeg.rotation.x = 0.6;
            this.rightLeg.rotation.x = -0.4;
        } else {
            // Running gait cycle
            this.torsoGroup.position.y = 1.0;
            this.torsoGroup.rotation.x = 0.12;

            this.runCycle += dt * (gameSpeed * 0.55);

            const armSwing = Math.sin(this.runCycle) * 0.95;
            const legSwing = Math.sin(this.runCycle) * 1.05;

            this.leftArm.rotation.x = armSwing;
            this.rightArm.rotation.x = -armSwing;
            this.leftLeg.rotation.x = -legSwing;
            this.rightLeg.rotation.x = legSwing;

            // Subtle vertical bounce of torso
            this.torsoGroup.position.y = 1.0 + Math.abs(Math.sin(this.runCycle * 2)) * 0.08;
        }
    }

    emitJetpackThrusterParticles(dt) {
        if (!this.jetpackParticles) this.jetpackParticles = [];
        this.jetpackTimer = (this.jetpackTimer || 0) + dt;
        if (this.jetpackTimer > 0.035) {
            this.jetpackTimer = 0;
            const pGeo = new THREE.DodecahedronGeometry(0.14);
            const pMat = new THREE.MeshBasicMaterial({
                color: Math.random() < 0.6 ? 0x00f5ff : 0xff7700,
                transparent: true,
                opacity: 0.9
            });
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(
                this.group.position.x + (Math.random() - 0.5) * 0.4,
                this.group.position.y + 0.8,
                this.group.position.z + 0.5
            );
            this.scene.add(p);
            this.jetpackParticles.push({
                mesh: p,
                life: 0.35,
                maxLife: 0.35,
                vy: -3.0 - Math.random() * 2.0,
                vz: 6.0 + Math.random() * 4.0
            });
        }

        for (let i = this.jetpackParticles.length - 1; i >= 0; i--) {
            const jp = this.jetpackParticles[i];
            jp.life -= dt;
            if (jp.life <= 0) {
                this.scene.remove(jp.mesh);
                this.jetpackParticles.splice(i, 1);
            } else {
                jp.mesh.position.y += jp.vy * dt;
                jp.mesh.position.z += jp.vz * dt;
                const ratio = Math.max(0.01, jp.life / jp.maxLife);
                jp.mesh.scale.set(ratio, ratio, ratio);
                jp.mesh.material.opacity = ratio;
            }
        }
    }

    triggerCrash() {
        this.isDead = true;
    }
}

window.PlayerCharacter = PlayerCharacter;
