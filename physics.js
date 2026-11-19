/**
 * Sky Runner 3D - Real-Time Physics Engine
 * Handles player kinematics, gravity, jumping, lane transitions, momentum, and 3D collision detection.
 */

class PhysicsEngine {
    constructor() {
        // Lane positions along the X-axis
        this.LANE_POSITIONS = [-2.7, 0.0, 2.7]; // Left, Center, Right
        this.currentLane = 1; // 0=Left, 1=Center, 2=Right
        this.targetX = this.LANE_POSITIONS[this.currentLane];

        // Player physics state
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.rollAngle = 0;

        // Kinematic constants
        this.GRAVITY = 44.0;
        this.JUMP_FORCE = 15.2;
        this.LANE_LERP_SPEED = 18.0;

        // States
        this.isGrounded = true;
        this.isJumping = false;
        this.isSliding = false;
        this.slideTimer = 0;
        this.SLIDE_DURATION = 0.7; // seconds

        // Jetpack Flight & Invulnerability States
        this.isFlying = false;
        this.isDescending = false;
        this.flightTargetY = 13.5;
        this.isInvulnerable = false;

        // Bounding dimensions for collision
        this.playerBounds = {
            width: 0.9,
            height: 1.8,
            depth: 0.9
        };
    }

    reset() {
        this.currentLane = 1;
        this.targetX = this.LANE_POSITIONS[this.currentLane];
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.rollAngle = 0;
        this.isGrounded = true;
        this.isJumping = false;
        this.isSliding = false;
        this.isFlying = false;
        this.isDescending = false;
        this.isInvulnerable = false;
        this.slideTimer = 0;
        this.playerBounds.height = 1.8;
    }

    moveLeft() {
        if (this.currentLane > 0) {
            this.currentLane--;
            this.targetX = this.LANE_POSITIONS[this.currentLane];
            if (window.soundEngine) window.soundEngine.playLaneSwitch();
            return true;
        }
        return false;
    }

    moveRight() {
        if (this.currentLane < 2) {
            this.currentLane++;
            this.targetX = this.LANE_POSITIONS[this.currentLane];
            if (window.soundEngine) window.soundEngine.playLaneSwitch();
            return true;
        }
        return false;
    }

    jump() {
        if (this.isGrounded) {
            this.vy = this.JUMP_FORCE;
            this.isGrounded = false;
            this.isJumping = true;
            this.isSliding = false;
            this.playerBounds.height = 1.8;
            if (window.soundEngine) window.soundEngine.playJump();
            return true;
        }
        return false;
    }

    slide() {
        if (!this.isSliding) {
            this.isSliding = true;
            this.slideTimer = this.SLIDE_DURATION;
            // Lower bounding box height during slide
            this.playerBounds.height = 0.85;
            // If in air, immediately trigger fast-drop dive to ground!
            if (!this.isGrounded && !this.isFlying) {
                this.vy = -26.0;
            }
            if (window.soundEngine) window.soundEngine.playSlide();
            return true;
        }
        return false;
    }

    startJetpackFlight() {
        this.isFlying = true;
        this.isDescending = false;
        this.isGrounded = false;
        this.isJumping = false;
        this.isSliding = false;
        this.vy = 0;
        this.playerBounds.height = 1.4;
    }

    endJetpackFlight() {
        this.isFlying = false;
        this.isDescending = true;
    }

    update(dt) {
        // 1. Lane Transition Physics (Spring-damped smooth interpolation)
        const dx = this.targetX - this.x;
        this.x += dx * Math.min(1.0, this.LANE_LERP_SPEED * dt);

        // Subtle banking/lean angle while moving between lanes
        const targetRoll = -dx * 0.12;
        this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1.0, 15.0 * dt);

        // 2. Vertical Kinematics (Jetpack vs Normal Jump/Gravity)
        if (this.isFlying) {
            // Smoothly ascend and hover at sky altitude (Y = 13.5m)
            this.y += (this.flightTargetY - this.y) * Math.min(1.0, 5.5 * dt);
            this.vy = 0;
            this.isGrounded = false;
            this.isJumping = false;
        } else if (this.isDescending) {
            // Smoothly glide back to ground
            this.y += (0 - this.y) * Math.min(1.0, 4.5 * dt);
            if (this.y <= 0.08) {
                this.y = 0;
                this.vy = 0;
                this.isDescending = false;
                this.isGrounded = true;
                this.playerBounds.height = 1.8;
            }
        } else if (!this.isGrounded) {
            this.vy -= this.GRAVITY * dt;
            this.y += this.vy * dt;

            if (this.y <= 0) {
                this.y = 0;
                this.vy = 0;
                this.isGrounded = true;
                this.isJumping = false;
            }
        }

        // 3. Slide Timer Countdown
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.playerBounds.height = 1.8;
            }
        }
    }

    /**
     * 3D Bounding-Box Collision test against modern obstacles & hurdles
     */
    checkObstacleCollision(obstacle) {
        if (!obstacle || !obstacle.active) return false;

        // 0. Invulnerability (grace period after landing or shield)
        if (this.isInvulnerable) return false;

        // 0. While flying in the sky, ground obstacles are completely bypassed!
        if (this.isFlying || this.y > 6.0) return false;

        // Lateral lane & depth proximity test
        const overlapX = Math.abs(this.x - obstacle.x) < (this.playerBounds.width * 0.5 + obstacle.width * 0.5);
        const overlapZ = Math.abs(this.z - obstacle.z) < (this.playerBounds.depth * 0.5 + obstacle.depth * 0.5);
        if (!overlapX || !overlapZ) return false;

        // Archetype 1: LOW HURDLE BARRIER - Player MUST jump over it!
        if (obstacle.type === 'barrier_hurdle') {
            const hurdleHeight = obstacle.height || 1.05;
            // If player's bottom Y is above the hurdle top, hurdle is cleared!
            if (this.y >= hurdleHeight - 0.15) {
                return false; // Cleared!
            }
            return true; // Crash!
        }

        // Archetype 2: HIGH OVERHEAD BARRIER - Player MUST slide/duck underneath!
        if (obstacle.type === 'barrier_overhead' || obstacle.type === 'laser') {
            const clearanceHeight = obstacle.minY !== undefined ? obstacle.minY : 1.15;
            // If player is sliding and grounded, ducked profile passes cleanly under crossbar!
            if (this.isSliding && this.y < 0.25) {
                return false; // Safely ducked under!
            }
            return true; // Crash into overhead beam!
        }

        // Generic fallback 3D AABB overlap
        const pMinY = this.y;
        const pMaxY = this.y + this.playerBounds.height;
        const oMinY = obstacle.minY !== undefined ? obstacle.minY : obstacle.y;
        const oMaxY = obstacle.maxY !== undefined ? obstacle.maxY : (obstacle.y + obstacle.height);

        return pMinY <= oMaxY && pMaxY >= oMinY;
    }

    /**
     * Distance and proximity check for coins
     */
    checkCoinPickup(coin) {
        if (!coin || !coin.active) return { collected: false, attract: false };

        const dx = this.x - coin.x;
        const dy = (this.y + 0.9) - coin.y;
        const dz = this.z - coin.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        // Pickup radius: 1.35 units
        if (distSq < 1.82) {
            return { collected: true, attract: false };
        }
        // Magnetic attraction radius: 3.5 units
        if (distSq < 12.25) {
            return { collected: false, attract: true, dx, dy, dz };
        }

        return { collected: false, attract: false };
    }
}

window.PhysicsEngine = PhysicsEngine;
