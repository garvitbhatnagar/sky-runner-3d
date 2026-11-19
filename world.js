/**
 * Sky Runner 3D - 3D Environment & World Generator
 * Procedural endless 3-lane road, blue sky, floating 3D clouds, lush greenery, 3D trees, rocks, and gold coins.
 */

class WorldManager {
    constructor(scene, renderer = null) {
        this.scene = scene;
        this.renderer = renderer;

        // Road lanes: Left=-2.7, Center=0, Right=+2.7
        this.LANE_X = [-2.7, 0, 2.7];

        // Recyclable track segments
        this.SEGMENT_LENGTH = 40;
        this.TOTAL_SEGMENTS = 7; // 280 units total visible distance
        this.segments = [];

        // Dynamic entities
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.particles = [];
        this.clouds = [];
        this.envParticles = [];

        // Pools for zero-allocation recycling
        this.hurdlePool = [];
        this.overheadPool = [];
        this.coinPool = [];
        this.powerupPool = [];

        // Current environment
        this.currentEnvId = 'forest';
        this.envConfig = window.GAME_CONFIG ? window.GAME_CONFIG.ENVIRONMENTS['forest'] : null;

        // Materials cache
        this.initMaterials();

        // Procedural PMREM Environment (Fixes metallic PBR reflection on coins)
        this.initProceduralEnvironment();

        // Build environment
        this.initSkyAndLighting();
        this.initTrackSegments();
        this.initClouds();
        this.initBiomeParticles();
        this.initSpeedWindLines();
    }

    createRoadNoiseTexture() {
        if (typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 256, 256);

        const imgData = ctx.getImageData(0, 0, 256, 256);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 65;
            const val = Math.min(255, Math.max(0, 128 + noise));
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
            data[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 20);
        return tex;
    }

    initMaterials() {
        // Procedural road noise
        this.roadNoiseTexture = this.createRoadNoiseTexture();

        // Road asphalt with physical roughness & bump
        this.roadMat = new THREE.MeshStandardMaterial({
            color: 0x22262e,
            roughness: 0.60,
            metalness: 0.22,
            roughnessMap: this.roadNoiseTexture,
            bumpMap: this.roadNoiseTexture,
            bumpScale: 0.03
        });

        // Curbs with metallic sheen
        this.curbMat1 = new THREE.MeshStandardMaterial({ color: 0xee3333, roughness: 0.38, metalness: 0.25 });
        this.curbMat2 = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38, metalness: 0.25 });

        // Lane stripes
        this.stripeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.35,
            metalness: 0.15,
            emissive: 0xdddddd,
            emissiveIntensity: 0.25
        });

        // Grassy terrain
        this.grassMat = new THREE.MeshStandardMaterial({
            color: 0x3ea339,
            roughness: 0.88,
            metalness: 0.05
        });

        // Trees
        this.trunkMat = new THREE.MeshStandardMaterial({
            color: 0x5a3d28,
            roughness: 0.9
        });
        this.foliageMat1 = new THREE.MeshStandardMaterial({
            color: 0x1f7a29,
            roughness: 0.8
        });
        this.foliageMat2 = new THREE.MeshStandardMaterial({
            color: 0x2e9939,
            roughness: 0.8
        });
        this.foliageMat3 = new THREE.MeshStandardMaterial({
            color: 0x155e20,
            roughness: 0.8
        });

        // Cyber materials with bloom emissive glow
        this.cyberBuildingMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.25, metalness: 0.85 });
        this.cyberNeonMat1 = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x00f5ff,
            emissiveIntensity: 2.2
        });
        this.cyberNeonMat2 = new THREE.MeshStandardMaterial({
            color: 0xec4899,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0xec4899,
            emissiveIntensity: 2.2
        });
        this.laserMat = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            roughness: 0.1,
            metalness: 0.5,
            emissive: 0xff0055,
            emissiveIntensity: 2.8,
            transparent: true,
            opacity: 0.90
        });

        // Rocks
        this.rockMat = new THREE.MeshStandardMaterial({
            color: 0x6e727e,
            roughness: 0.88,
            metalness: 0.12,
            flatShading: true
        });

        // Gold Coins with rich specular reflections & PBR shine
        this.coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.7,
            roughness: 0.25,
            emissive: 0x443300,
            emissiveIntensity: 0.3
        });
        this.coinCoreMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            metalness: 0.8,
            roughness: 0.20,
            emissive: 0x553300,
            emissiveIntensity: 0.35
        });

        // Modern Subway Surfers-style Barrier Materials
        this.hurdlePostMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            metalness: 0.8,
            roughness: 0.3
        });
        this.hurdleBarMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            metalness: 0.3,
            roughness: 0.35,
            emissive: 0xd97706,
            emissiveIntensity: 0.35
        });
        this.hurdleStripeMat = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.5
        });
        this.hurdleBeaconMat = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 2.2
        });
        this.overheadGantryMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.85,
            roughness: 0.25
        });
        this.overheadNeonMat = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            emissive: 0xff0055,
            emissiveIntensity: 2.5
        });

        // Power-Up Materials (Double Coins & Jetpack)
        this.powerup2xMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xffaa00,
            emissiveIntensity: 1.2
        });
        this.powerupJetpackMat = new THREE.MeshStandardMaterial({
            color: 0x00f5ff,
            metalness: 0.85,
            roughness: 0.2,
            emissive: 0x00d2ff,
            emissiveIntensity: 1.5
        });
    }

    initProceduralEnvironment() {
        if (!THREE.PMREMGenerator) return;
        try {
            const rend = this.renderer || (window.game ? window.game.renderer : null);
            if (!rend) return;

            const pmrem = new THREE.PMREMGenerator(rend);
            pmrem.compileEquirectangularShader();

            const envScene = new THREE.Scene();
            envScene.background = new THREE.Color(0xa0d2ff);

            const sunLight = new THREE.DirectionalLight(0xfff5ea, 3.0);
            sunLight.position.set(15, 30, 15);
            envScene.add(sunLight);

            const skyFill = new THREE.DirectionalLight(0x00b4d8, 1.6);
            skyFill.position.set(-15, 15, -15);
            envScene.add(skyFill);

            const hemi = new THREE.HemisphereLight(0xffffff, 0x475569, 2.0);
            envScene.add(hemi);

            const skySphere = new THREE.Mesh(
                new THREE.SphereGeometry(60, 16, 8),
                new THREE.MeshBasicMaterial({ color: 0x93c5fd, side: THREE.BackSide })
            );
            envScene.add(skySphere);

            const envTexture = pmrem.fromScene(envScene).texture;
            this.scene.environment = envTexture;
            pmrem.dispose();
        } catch (e) {
            console.warn('[WorldManager] PMREM notice:', e);
        }
    }

    initSkyAndLighting() {
        const env = this.envConfig || {
            skyColor: 0x56aaff,
            fogColor: 0x8ac4ff,
            sunColor: 0xfffaed,
            sunIntensity: 1.15,
            hemiSky: 0xffffff,
            hemiGround: 0x446688
        };

        // 1. Exponential Atmospheric Fog
        this.scene.fog = new THREE.FogExp2(env.fogColor, 0.0075);

        // 2. Dual-tone Hemisphere Light
        this.hemiLight = new THREE.HemisphereLight(env.hemiSky, env.hemiGround, 0.85);
        this.scene.add(this.hemiLight);

        // 3. Directional Sun Light with 2048x2048 Shadow Map
        this.sunLight = new THREE.DirectionalLight(env.sunColor, env.sunIntensity || 1.15);
        this.sunLight.position.set(25, 45, 20);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.bias = -0.0003;
        this.sunLight.shadow.normalBias = 0.04;
        this.sunLight.shadow.camera.near = 1.0;
        this.sunLight.shadow.camera.far = 140;
        this.sunLight.shadow.camera.left = -18;
        this.sunLight.shadow.camera.right = 18;
        this.sunLight.shadow.camera.top = 22;
        this.sunLight.shadow.camera.bottom = -22;
        this.scene.add(this.sunLight);

        // 4. Procedural Dynamic Sky Dome
        this.initSkyDome(env);
    }

    initSkyDome(env) {
        const skyGeo = new THREE.SphereGeometry(240, 32, 16);
        const skyShader = {
            uniforms: {
                uTopColor: { value: new THREE.Color(env.skyColor) },
                uHorizonColor: { value: new THREE.Color(env.fogColor) },
                uBottomColor: { value: new THREE.Color(env.fogColor).multiplyScalar(0.7) },
                uSunDirection: { value: new THREE.Vector3(25, 45, 20).normalize() },
                uSunColor: { value: new THREE.Color(env.sunColor) },
                uTime: { value: 0.0 },
                uSpeed: { value: 1.0 }
            },
            vertexShader: [
                'varying vec3 vWorldPosition;',
                'void main() {',
                '    vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
                '    vWorldPosition = worldPosition.xyz;',
                '    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform vec3 uTopColor;',
                'uniform vec3 uHorizonColor;',
                'uniform vec3 uBottomColor;',
                'uniform vec3 uSunDirection;',
                'uniform vec3 uSunColor;',
                'uniform float uTime;',
                'uniform float uSpeed;',
                'varying vec3 vWorldPosition;',

                'void main() {',
                '    vec3 dir = normalize(vWorldPosition);',
                '    float height = dir.y;',

                // Altitude gradient
                '    vec3 sky = mix(uBottomColor, uHorizonColor, smoothstep(-0.15, 0.25, height));',
                '    sky = mix(sky, uTopColor, smoothstep(0.20, 0.95, height));',

                // Sun disc & atmospheric glare
                '    float sunDot = max(0.0, dot(dir, normalize(uSunDirection)));',
                '    float sunDisc = smoothstep(0.996, 0.9995, sunDot) * 1.8;',
                '    float sunGlow = pow(sunDot, 18.0) * 0.55;',
                '    sky += (uSunColor * (sunDisc + sunGlow));',

                // Procedural scrolling cloud layer
                '    if (height > 0.05) {',
                '        vec2 cloudCoord = dir.xz / (height + 0.15) * 0.25;',
                '        cloudCoord.y += uTime * 0.02 * (0.4 + uSpeed * 0.02);',
                '        float c1 = sin(cloudCoord.x * 3.5 + cloudCoord.y * 2.0);',
                '        float c2 = cos(cloudCoord.x * 2.0 - cloudCoord.y * 3.8);',
                '        float cloud = smoothstep(0.2, 0.85, (c1 + c2) * 0.5);',
                '        sky = mix(sky, vec3(1.0), cloud * 0.24 * smoothstep(0.05, 0.4, height));',
                '    }',

                '    gl_FragColor = vec4(sky, 1.0);',
                '}'
            ].join('\n')
        };

        this.skyMat = new THREE.ShaderMaterial({
            uniforms: skyShader.uniforms,
            vertexShader: skyShader.vertexShader,
            fragmentShader: skyShader.fragmentShader,
            side: THREE.BackSide,
            depthWrite: false
        });

        this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
        this.scene.add(this.skyMesh);
    }

    initSpeedWindLines() {
        const lineCount = 120;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(lineCount * 6);
        this.windLineData = [];

        for (let i = 0; i < lineCount; i++) {
            const x = (Math.random() - 0.5) * 16.0;
            const y = 0.6 + Math.random() * 6.5;
            const z = -Math.random() * 120.0;
            const len = 4.0 + Math.random() * 8.0;

            const idx = i * 6;
            positions[idx] = x;
            positions[idx + 1] = y;
            positions[idx + 2] = z;
            positions[idx + 3] = x;
            positions[idx + 4] = y;
            positions[idx + 5] = z - len;

            this.windLineData.push({ x, y, z, len, speedMult: 0.85 + Math.random() * 0.4 });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({
            color: 0xcceeff,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });

        this.windLines = new THREE.LineSegments(geometry, material);
        this.scene.add(this.windLines);
    }

    initClouds() {
        // Procedural 3D floating clouds
        const cloudGeo = new THREE.DodecahedronGeometry(2.5, 1);
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.95,
            metalness: 0.0,
            flatShading: true,
            transparent: true,
            opacity: 0.92
        });

        for (let i = 0; i < 30; i++) {
            const cloud = new THREE.Group();
            const puffCount = 3 + Math.floor(Math.random() * 4);

            for (let p = 0; p < puffCount; p++) {
                const puff = new THREE.Mesh(cloudGeo, cloudMat);
                const scale = 0.8 + Math.random() * 0.9;
                puff.scale.set(scale * 1.5, scale * 0.7, scale * 1.2);
                puff.position.set(
                    (p - puffCount / 2) * 2.2 + (Math.random() - 0.5),
                    (Math.random() - 0.5) * 0.6,
                    (Math.random() - 0.5) * 1.2
                );
                cloud.add(puff);
            }

            cloud.position.set(
                (Math.random() - 0.5) * 110,
                22 + Math.random() * 20,
                -160 + Math.random() * 240
            );
            cloud.userData = {
                driftSpeed: 0.8 + Math.random() * 1.2
            };

            this.clouds.push(cloud);
            this.scene.add(cloud);
        }
    }

    initBiomeParticles() {
        // Atmospheric floating particles (snow flurries, embers, dust motes)
        const count = 75;
        const pGeo = new THREE.DodecahedronGeometry(0.18, 0);
        const pMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.65
        });

        this.biomeParticleMat = pMat;

        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(
                (Math.random() - 0.5) * 50,
                0.5 + Math.random() * 14,
                -120 + Math.random() * 140
            );
            p.userData = {
                speedY: -(0.5 + Math.random() * 1.5),
                speedX: (Math.random() - 0.5) * 1.0,
                origY: p.position.y
            };
            this.scene.add(p);
            this.envParticles.push(p);
        }
    }

    setEnvironment(envId) {
        if (!window.GAME_CONFIG || !window.GAME_CONFIG.ENVIRONMENTS[envId]) return;
        this.currentEnvId = envId;
        const env = window.GAME_CONFIG.ENVIRONMENTS[envId];
        this.envConfig = env;

        // Update Scene Fog & Background
        if (this.scene.background) this.scene.background.setHex(env.skyColor);
        if (this.scene.fog) {
            this.scene.fog.color.setHex(env.fogColor);
        }

        // Update Sky Dome Shader uniforms
        if (this.skyMat) {
            this.skyMat.uniforms.uTopColor.value.setHex(env.skyColor);
            this.skyMat.uniforms.uHorizonColor.value.setHex(env.fogColor);
            this.skyMat.uniforms.uBottomColor.value.setHex(env.fogColor).multiplyScalar(0.7);
            this.skyMat.uniforms.uSunColor.value.setHex(env.sunColor);
        }

        // Update Lighting
        this.hemiLight.color.setHex(env.hemiSky);
        this.hemiLight.groundColor.setHex(env.hemiGround);
        this.sunLight.color.setHex(env.sunColor);
        this.sunLight.intensity = env.sunIntensity;

        // Update Road & Ground Materials
        this.roadMat.color.setHex(env.roadColor);
        this.groundMat.color.setHex(env.groundColor);
        this.curbMat1.color.setHex(env.curbColor1);
        this.curbMat2.color.setHex(env.curbColor2);
        this.stripeMat.color.setHex(env.stripeColor);

        // Update Biome Atmospheric Particles
        if (this.biomeParticleMat) {
            this.biomeParticleMat.color.setHex(env.particleColor);
        }

        // Rebuild segments scenery with new theme
        for (let seg of this.segments) {
            this.rebuildSegmentScenery(seg.group, env.sceneryTheme);
        }
    }

    initTrackSegments() {
        for (let i = 0; i < this.TOTAL_SEGMENTS; i++) {
            const zPos = 20 - i * this.SEGMENT_LENGTH;
            const segment = this.createSegment(zPos);
            this.segments.push(segment);
            this.scene.add(segment.group);
        }
    }

    createSegment(zCenter) {
        const group = new THREE.Group();
        group.position.z = zCenter;

        // 1. Asphalt Road (Width: 8.8, 3 lanes)
        const roadGeo = new THREE.PlaneGeometry(8.8, this.SEGMENT_LENGTH);
        roadGeo.rotateX(-Math.PI / 2);
        const roadMesh = new THREE.Mesh(roadGeo, this.roadMat);
        roadMesh.receiveShadow = true;
        group.add(roadMesh);

        // 2. Dashed Lane Divider Stripes (At X = -1.35 and X = +1.35)
        const stripeGeo = new THREE.PlaneGeometry(0.16, 2.2);
        stripeGeo.rotateX(-Math.PI / 2);

        const stripeCount = Math.floor(this.SEGMENT_LENGTH / 5);
        for (let s = 0; s < stripeCount; s++) {
            const zOffset = -this.SEGMENT_LENGTH / 2 + s * 5 + 2.5;

            const stripeLeft = new THREE.Mesh(stripeGeo, this.stripeMat);
            stripeLeft.position.set(-1.35, 0.015, zOffset);
            group.add(stripeLeft);

            const stripeRight = new THREE.Mesh(stripeGeo, this.stripeMat);
            stripeRight.position.set(1.35, 0.015, zOffset);
            group.add(stripeRight);
        }

        // 3. Curbs with red & white hazard stripes
        const curbLen = 2.5;
        const curbCount = Math.floor(this.SEGMENT_LENGTH / curbLen);
        const curbGeo = new THREE.BoxGeometry(0.3, 0.18, curbLen);

        for (let c = 0; c < curbCount; c++) {
            const curbZ = -this.SEGMENT_LENGTH / 2 + c * curbLen + curbLen / 2;
            const isRed = c % 2 === 0;
            const mat = isRed ? this.curbRedMat : this.curbWhiteMat;

            const leftCurb = new THREE.Mesh(curbGeo, mat);
            leftCurb.position.set(-4.5, 0.09, curbZ);
            group.add(leftCurb);

            const rightCurb = new THREE.Mesh(curbGeo, mat);
            rightCurb.position.set(4.5, 0.09, curbZ);
            group.add(rightCurb);
        }

        // 4. Lush Grass terrain on left & right
        const grassWidth = 42;
        const grassGeo = new THREE.PlaneGeometry(grassWidth, this.SEGMENT_LENGTH);
        grassGeo.rotateX(-Math.PI / 2);

        const leftGrass = new THREE.Mesh(grassGeo, this.grassMat);
        leftGrass.position.set(-4.65 - grassWidth / 2, -0.01, 0);
        leftGrass.receiveShadow = true;
        group.add(leftGrass);

        const rightGrass = new THREE.Mesh(grassGeo, this.grassMat);
        rightGrass.position.set(4.65 + grassWidth / 2, -0.01, 0);
        rightGrass.receiveShadow = true;
        group.add(rightGrass);

        // 5. Trees & Vegetation on grassy sides
        this.populateSegmentTrees(group);

        return { group, zCenter };
    }

    rebuildSegmentScenery(segmentGroup, theme) {
        const existing = segmentGroup.getObjectByName("scenery");
        if (existing) {
            segmentGroup.remove(existing);
        }
        const sceneryGroup = new THREE.Group();
        sceneryGroup.name = "scenery";
        segmentGroup.add(sceneryGroup);
        this.populateSegmentScenery(sceneryGroup, theme);
    }

    populateSegmentScenery(group, theme) {
        const propCount = 6 + Math.floor(Math.random() * 4);

        // Fallback if BufferGeometryUtils is not loaded
        if (!THREE.BufferGeometryUtils || !THREE.BufferGeometryUtils.mergeBufferGeometries) {
            for (let t = 0; t < propCount; t++) {
                const side = t % 2 === 0 ? -1 : 1;
                const xDist = side * (6.5 + Math.random() * 22);
                const zPos = (Math.random() - 0.5) * (this.SEGMENT_LENGTH - 4);

                const prop = this.createThemeProp(theme);
                if (prop) {
                    prop.position.set(xDist, 0, zPos);
                    group.add(prop);
                }
            }
            return;
        }

        // Geometry Merging: Group transformed geometries by material to minimize draw calls
        const materialGeoms = new Map();

        for (let t = 0; t < propCount; t++) {
            const side = t % 2 === 0 ? -1 : 1;
            const xDist = side * (6.5 + Math.random() * 18);
            const zPos = (Math.random() - 0.5) * (this.SEGMENT_LENGTH - 4);

            const prop = this.createThemeProp(theme);
            if (!prop) continue;

            prop.position.set(xDist, 0, zPos);
            prop.updateMatrix();

            prop.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    child.updateMatrix();
                    const combinedMatrix = new THREE.Matrix4().multiplyMatrices(prop.matrix, child.matrix);
                    const clonedGeo = child.geometry.clone();
                    clonedGeo.applyMatrix4(combinedMatrix);

                    const mat = child.material;
                    if (!materialGeoms.has(mat)) {
                        materialGeoms.set(mat, []);
                    }
                    materialGeoms.get(mat).push(clonedGeo);
                }
            });
        }

        materialGeoms.forEach((geoms, mat) => {
            if (geoms.length > 0) {
                try {
                    const mergedGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, false);
                    if (mergedGeo) {
                        const mergedMesh = new THREE.Mesh(mergedGeo, mat);
                        mergedMesh.castShadow = true;
                        mergedMesh.receiveShadow = true;
                        group.add(mergedMesh);
                    }
                } catch (e) {
                    geoms.forEach(g => {
                        const m = new THREE.Mesh(g, mat);
                        group.add(m);
                    });
                }
            }
        });
    }

    create3DTree() {
        const tree = new THREE.Group();
        const treeType = Math.random() > 0.45 ? 'pine' : 'round';

        // Trunk
        const trunkHeight = 1.8 + Math.random() * 0.8;
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.32, trunkHeight, 6);
        const trunk = new THREE.Mesh(trunkGeo, this.trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        if (treeType === 'pine') {
            // 3-tiered conical pine tree
            const tiers = 3;
            for (let i = 0; i < tiers; i++) {
                const coneRadius = 1.6 - i * 0.35;
                const coneHeight = 1.8 - i * 0.25;
                const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 7);
                const mat = i % 2 === 0 ? this.foliageMat1 : this.foliageMat3;
                const cone = new THREE.Mesh(coneGeo, mat);
                cone.position.y = trunkHeight + i * 1.1 + 0.4;
                cone.castShadow = true;
                tree.add(cone);
            }
        } else {
            // Stylized rounded leafy tree canopy
            const canopyGeo = new THREE.DodecahedronGeometry(1.6 + Math.random() * 0.4, 1);
            const mat = Math.random() > 0.5 ? this.foliageMat2 : this.foliageMat1;
            const canopy = new THREE.Mesh(canopyGeo, mat);
            canopy.position.y = trunkHeight + 1.2;
            canopy.scale.set(1.1, 1.25, 1.1);
            canopy.castShadow = true;
            tree.add(canopy);
        }

        const scale = 0.8 + Math.random() * 0.45;
        tree.scale.set(scale, scale, scale);
        return tree;
    }

    // ==========================================
    // 3D OBSTACLES: ROCKS
    // ==========================================

    createRockMesh(isSmall = false) {
        // Procedural rock with faceted geometry
        const radius = isSmall ? 0.65 : 1.1;
        const geo = new THREE.DodecahedronGeometry(radius, 1);

        // Perturb vertices for rugged jagged boulder silhouette
        const posAttr = geo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i);
            const vz = posAttr.getZ(i);
            const noise = 0.85 + Math.random() * 0.3;
            posAttr.setXYZ(i, vx * noise, vy * (noise * 0.9), vz * noise);
        }
        geo.computeVertexNormals();

        const rock = new THREE.Mesh(geo, this.rockMat);
        rock.castShadow = true;
        rock.receiveShadow = true;

        return {
            mesh: rock,
            isSmall: isSmall,
            width: isSmall ? 1.1 : 1.9,
            height: isSmall ? 0.75 : 1.8,
            depth: isSmall ? 1.1 : 1.9
        };
    }

    // ==========================================
    // SUBWAY SURFERS-STYLE BARRIERS (Jump & Slide)
    // ==========================================

    createHurdleBarrierMesh() {
        const group = new THREE.Group();

        // Left & Right Stand Legs
        const standGeo = new THREE.BoxGeometry(0.18, 1.05, 0.35);
        const standL = new THREE.Mesh(standGeo, this.hurdlePostMat);
        standL.position.set(-1.08, 0.525, 0);
        standL.castShadow = true;
        group.add(standL);

        const standR = new THREE.Mesh(standGeo, this.hurdlePostMat);
        standR.position.set(1.08, 0.525, 0);
        standR.castShadow = true;
        group.add(standR);

        // Feet stabilizers
        const footGeo = new THREE.BoxGeometry(0.24, 0.08, 0.60);
        const footL = new THREE.Mesh(footGeo, this.hurdlePostMat);
        footL.position.set(-1.08, 0.04, 0);
        group.add(footL);

        const footR = new THREE.Mesh(footGeo, this.hurdlePostMat);
        footR.position.set(1.08, 0.04, 0);
        group.add(footR);

        // Main Cross Barricade Board (Height: 0.52m, centered at y = 0.65m)
        const boardGeo = new THREE.BoxGeometry(2.30, 0.52, 0.12);
        const board = new THREE.Mesh(boardGeo, this.hurdleBarMat);
        board.position.set(0, 0.65, 0);
        board.castShadow = true;
        group.add(board);

        // Hazard Chevron Stripes (alternating diagonal black bands)
        for (let s = -3; s <= 3; s++) {
            const stripeGeo = new THREE.BoxGeometry(0.22, 0.53, 0.13);
            const stripe = new THREE.Mesh(stripeGeo, this.hurdleStripeMat);
            stripe.position.set(s * 0.32, 0.65, 0);
            stripe.rotation.z = 0.35;
            group.add(stripe);
        }

        // Top Amber Glowing Beacons on both posts
        const beaconGeo = new THREE.SphereGeometry(0.11, 10, 8);
        const beaconL = new THREE.Mesh(beaconGeo, this.hurdleBeaconMat);
        beaconL.position.set(-1.08, 1.10, 0);
        group.add(beaconL);

        const beaconR = new THREE.Mesh(beaconGeo, this.hurdleBeaconMat);
        beaconR.position.set(1.08, 1.10, 0);
        group.add(beaconR);

        return {
            mesh: group,
            type: 'barrier_hurdle',
            width: 2.3,
            height: 1.05,
            depth: 0.45
        };
    }

    createOverheadBarrierMesh() {
        const group = new THREE.Group();

        // Tall Industrial Side Pillars (Height: 2.6m)
        const pillarGeo = new THREE.BoxGeometry(0.22, 2.6, 0.22);
        const pillarL = new THREE.Mesh(pillarGeo, this.overheadGantryMat);
        pillarL.position.set(-1.12, 1.3, 0);
        pillarL.castShadow = true;
        group.add(pillarL);

        const pillarR = new THREE.Mesh(pillarGeo, this.overheadGantryMat);
        pillarR.position.set(1.12, 1.3, 0);
        pillarR.castShadow = true;
        group.add(pillarR);

        // Elevated Overhead Crossbeam (Occupies y = 1.25m to 2.5m)
        const beamGeo = new THREE.BoxGeometry(2.35, 0.65, 0.24);
        const beam = new THREE.Mesh(beamGeo, this.overheadGantryMat);
        beam.position.set(0, 1.75, 0);
        beam.castShadow = true;
        group.add(beam);

        // Glowing Warning Neon Strip across beam
        const neonGeo = new THREE.BoxGeometry(2.30, 0.10, 0.26);
        const neon = new THREE.Mesh(neonGeo, this.overheadNeonMat);
        neon.position.set(0, 1.48, 0);
        group.add(neon);

        // Hazard Warning Chevron Board
        for (let s = -3; s <= 3; s++) {
            const stripeGeo = new THREE.BoxGeometry(0.20, 0.66, 0.25);
            const stripe = new THREE.Mesh(stripeGeo, this.hurdleBarMat);
            stripe.position.set(s * 0.32, 1.75, 0);
            stripe.rotation.z = -0.35;
            group.add(stripe);
        }

        // Hanging DUCK / SLIDE Warning Sign
        const signGeo = new THREE.BoxGeometry(0.85, 0.28, 0.08);
        const signMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xff0055, emissiveIntensity: 1.2 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 1.28, 0);
        group.add(sign);

        return {
            mesh: group,
            type: 'barrier_overhead',
            width: 2.3,
            minY: 1.15, // Clearance underneath for sliding!
            maxY: 2.60,
            height: 2.60,
            depth: 0.55
        };
    }

    spawnBarrier(laneIndex, zPos, barrierType = 'barrier_hurdle') {
        const laneX = this.LANE_X[laneIndex];
        let barrierData = null;

        if (barrierType === 'barrier_hurdle') {
            if (this.hurdlePool && this.hurdlePool.length > 0) {
                barrierData = this.hurdlePool.pop();
                barrierData.mesh.position.set(laneX, 0, zPos);
                barrierData.mesh.visible = true;
            } else {
                barrierData = this.createHurdleBarrierMesh();
                barrierData.mesh.position.set(laneX, 0, zPos);
                this.scene.add(barrierData.mesh);
            }
        } else {
            if (this.overheadPool && this.overheadPool.length > 0) {
                barrierData = this.overheadPool.pop();
                barrierData.mesh.position.set(laneX, 0, zPos);
                barrierData.mesh.visible = true;
            } else {
                barrierData = this.createOverheadBarrierMesh();
                barrierData.mesh.position.set(laneX, 0, zPos);
                this.scene.add(barrierData.mesh);
            }
        }

        barrierData.x = laneX;
        barrierData.y = 0;
        barrierData.z = zPos;
        barrierData.lane = laneIndex;
        barrierData.active = true;

        this.obstacles.push(barrierData);
        return barrierData;
    }

    spawnObstacle(laneIndex, zPos, forceSmall = false, forceLaser = false) {
        // Automatically selects appropriate modern barrier
        const type = forceLaser ? 'barrier_overhead' : (forceSmall ? 'barrier_hurdle' : (Math.random() < 0.55 ? 'barrier_hurdle' : 'barrier_overhead'));
        return this.spawnBarrier(laneIndex, zPos, type);
    }

    // Fair Path Obstacle Wave Spawning
    spawnObstacleWave(zPos, isSkyFlight = false) {
        if (isSkyFlight) {
            // SKY FLIGHT RULE: No barriers in the sky! Spawn dense aerial coins!
            const pattern = Math.random();
            if (pattern < 0.4) {
                for (let lane = 0; lane < 3; lane++) {
                    for (let c = 0; c < 4; c++) {
                        this.spawnCoin(lane, zPos - c * 3.0, 13.5);
                    }
                }
            } else if (pattern < 0.7) {
                const lanes = [0, 1, 2, 1, 0];
                for (let i = 0; i < lanes.length; i++) {
                    this.spawnCoin(lanes[i], zPos - i * 3.2, 13.5);
                }
            } else {
                const laneA = Math.floor(Math.random() * 3);
                const laneB = (laneA + 1) % 3;
                for (let c = 0; c < 5; c++) {
                    this.spawnCoin(laneA, zPos - c * 2.8, 13.5);
                    this.spawnCoin(laneB, zPos - c * 2.8, 13.5);
                }
            }
            return;
        }

        // GROUND: Fair path spawning ensures player ALWAYS has a navigable lane
        const rand = Math.random();
        let barrierLanes = [];

        if (rand < 0.48) {
            // Single barrier: 2 lanes wide open!
            barrierLanes = [Math.floor(Math.random() * 3)];
        } else if (rand < 0.88) {
            // Double barrier: 1 lane wide open!
            const openLane = Math.floor(Math.random() * 3);
            barrierLanes = [0, 1, 2].filter(l => l !== openLane);
        } else {
            // Triple barrier with 1 Hurdle and 1 Overhead (clear jump / slide options)
            barrierLanes = [0, 1, 2];
        }

        for (let lane of barrierLanes) {
            const isHurdle = Math.random() < 0.52;
            this.spawnBarrier(lane, zPos, isHurdle ? 'barrier_hurdle' : 'barrier_overhead');
        }

        // In open lanes, spawn coins or power-ups!
        const openLanes = [0, 1, 2].filter(l => !barrierLanes.includes(l));
        if (openLanes.length > 0) {
            const chosenLane = openLanes[Math.floor(Math.random() * openLanes.length)];
            // 20% chance of power-up in open lane!
            if (Math.random() < 0.20 && this.powerups.length < 2) {
                const pType = Math.random() < 0.55 ? 'double_coins' : 'jetpack';
                this.spawnPowerup(chosenLane, zPos, pType);
            } else {
                for (let c = 0; c < 3; c++) {
                    this.spawnCoin(chosenLane, zPos - c * 3.0, 1.0);
                }
            }
        }
    }

    // ==========================================
    // POWER-UP COLLECTIBLES (2x Coins & Jetpack)
    // ==========================================

    createPowerupMesh(type) {
        const group = new THREE.Group();

        if (type === 'double_coins') {
            // Golden Multiplier 2X Badge
            const outerRing = new THREE.TorusGeometry(0.55, 0.08, 12, 24);
            const ringMesh = new THREE.Mesh(outerRing, this.powerup2xMat);
            group.add(ringMesh);

            const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);
            coinGeo.rotateX(Math.PI / 2);
            const coinMesh = new THREE.Mesh(coinGeo, this.coinMat);
            group.add(coinMesh);

            const starGeo = new THREE.DodecahedronGeometry(0.24);
            const starMesh = new THREE.Mesh(starGeo, this.powerup2xMat);
            group.add(starMesh);
        } else if (type === 'jetpack') {
            // Futuristic Twin-Rocket Jetpack
            const rocketGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.85, 12);
            const rocketMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.2 });

            const rocketL = new THREE.Mesh(rocketGeo, rocketMat);
            rocketL.position.set(-0.25, 0, 0);
            group.add(rocketL);

            const rocketR = new THREE.Mesh(rocketGeo, rocketMat);
            rocketR.position.set(0.25, 0, 0);
            group.add(rocketR);

            const coneGeo = new THREE.ConeGeometry(0.16, 0.35, 10);
            coneGeo.rotateX(Math.PI);
            const coneL = new THREE.Mesh(coneGeo, this.powerupJetpackMat);
            coneL.position.set(-0.25, -0.5, 0);
            group.add(coneL);

            const coneR = new THREE.Mesh(coneGeo, this.powerupJetpackMat);
            coneR.position.set(0.25, -0.5, 0);
            group.add(coneR);

            const podGeo = new THREE.BoxGeometry(0.65, 0.35, 0.25);
            const podMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
            const pod = new THREE.Mesh(podGeo, podMat);
            pod.position.set(0, 0.05, 0);
            group.add(pod);
        }

        return group;
    }

    spawnPowerup(laneIndex, zPos, type) {
        const laneX = this.LANE_X[laneIndex];
        let pData = null;

        if (this.powerupPool && this.powerupPool.length > 0) {
            pData = this.powerupPool.pop();
            this.scene.remove(pData.mesh);
        }

        const mesh = this.createPowerupMesh(type);
        mesh.position.set(laneX, 1.3, zPos);
        this.scene.add(mesh);

        pData = {
            mesh: mesh,
            powerupType: type,
            type: 'powerup',
            lane: laneIndex,
            x: laneX,
            y: 1.3,
            z: zPos,
            baseY: 1.3,
            width: 1.4,
            height: 1.4,
            depth: 1.4,
            active: true
        };

        this.powerups.push(pData);
        return pData;
    }

    // ==========================================
    // 3D COLLECTIBLES: GOLD COINS
    // ==========================================

    createCoinMesh() {
        const group = new THREE.Group();

        // Upright circular coin disk
        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 22);
        coinGeo.rotateX(Math.PI / 2);
        const coinMesh = new THREE.Mesh(coinGeo, this.coinMat);
        coinMesh.castShadow = true;
        group.add(coinMesh);

        // Raised star/core
        const innerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.16, 6);
        innerGeo.rotateX(Math.PI / 2);
        const innerMesh = new THREE.Mesh(innerGeo, this.coinCoreMat);
        group.add(innerMesh);

        return group;
    }

    spawnCoin(laneIndex, zPos, yPos = 1.0) {
        const laneX = this.LANE_X[laneIndex];
        let coinData;

        if (this.coinPool && this.coinPool.length > 0) {
            coinData = this.coinPool.pop();
            coinData.mesh.position.set(laneX, yPos, zPos);
            coinData.mesh.visible = true;
            coinData.x = laneX;
            coinData.y = yPos;
            coinData.z = zPos;
            coinData.baseY = yPos;
            coinData.active = true;
            coinData.attractDist = null;
        } else {
            const mesh = this.createCoinMesh();
            mesh.position.set(laneX, yPos, zPos);
            this.scene.add(mesh);

            coinData = {
                mesh: mesh,
                x: laneX,
                y: yPos,
                z: zPos,
                active: true,
                rotSpeed: 3.5,
                bobSpeed: 4.0,
                baseY: yPos,
                attractDist: null
            };
        }

        this.coins.push(coinData);
        return coinData;
    }

    spawnCoinPattern(patternType, startZ, laneIndex) {
        switch (patternType) {
            case 'line': {
                for (let i = 0; i < 4; i++) {
                    this.spawnCoin(laneIndex, startZ - i * 3.2, 1.0);
                }
                break;
            }
            case 'jumpArc': {
                const arcHeights = [0.9, 1.6, 2.3, 1.6, 0.9];
                for (let i = 0; i < 5; i++) {
                    this.spawnCoin(laneIndex, startZ - i * 2.8, arcHeights[i]);
                }
                this.spawnObstacle(laneIndex, startZ - 2 * 2.8, true, false);
                break;
            }
            case 'zigzag': {
                const otherLane = laneIndex === 1 ? (Math.random() > 0.5 ? 0 : 2) : 1;
                this.spawnCoin(laneIndex, startZ, 1.0);
                this.spawnCoin(laneIndex, startZ - 3, 1.0);
                this.spawnCoin(otherLane, startZ - 6, 1.0);
                this.spawnCoin(otherLane, startZ - 9, 1.0);
                break;
            }
        }
    }

    // ==========================================
    // PARTICLE EFFECTS
    // ==========================================

    createCoinSparkles(x, y, z) {
        const count = 14;
        const pGeo = new THREE.DodecahedronGeometry(0.12);
        const pMat = new THREE.MeshBasicMaterial({
            color: 0xffea00,
            transparent: true,
            opacity: 1.0
        });

        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(x, y, z);

            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.2) * Math.PI;
            const speed = 3.5 + Math.random() * 4.5;

            const vel = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed + 3.0,
                Math.sin(angle) * Math.cos(elevation) * speed
            );

            this.scene.add(p);
            this.particles.push({
                mesh: p,
                vel: vel,
                life: 0.45,
                maxLife: 0.45
            });
        }
    }

    createRockDebris(x, y, z) {
        const count = 18;
        const pGeo = new THREE.DodecahedronGeometry(0.2);
        const pMat = new THREE.MeshStandardMaterial({
            color: 0x555860,
            roughness: 0.9,
            flatShading: true
        });

        for (let i = 0; i < count; i++) {
            const p = new THREE.Mesh(pGeo, pMat);
            p.position.set(x, y + 0.6, z);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 8.0,
                3.0 + Math.random() * 6.0,
                (Math.random() - 0.5) * 8.0
            );

            this.scene.add(p);
            this.particles.push({
                mesh: p,
                vel: vel,
                life: 0.65,
                maxLife: 0.65
            });
        }
    }

    // ==========================================
    // UPDATE CYCLE & RECYCLING
    // ==========================================

    update(dt, speed, playerZ = 0) {
        // 1. Move road segments & recycle
        const moveDist = speed * dt;

        // 0. Update Sky Dome Shader uniforms & Wind Lines
        if (this.skyMat) {
            this.skyMat.uniforms.uTime.value += dt;
            this.skyMat.uniforms.uSpeed.value = speed * 0.05;
        }

        if (this.windLines) {
            const speedRatio = Math.max(0, (speed - 20) / 72);
            this.windLines.visible = (speedRatio > 0.08);
            this.windLines.material.opacity = Math.min(0.75, speedRatio * 0.85);

            if (this.windLines.visible) {
                const pos = this.windLines.geometry.attributes.position.array;
                for (let i = 0; i < this.windLineData.length; i++) {
                    const line = this.windLineData[i];
                    line.z += speed * dt * 1.5 * line.speedMult;
                    if (line.z > 20) {
                        line.z = -120 - Math.random() * 40;
                        line.x = (Math.random() - 0.5) * 16.0;
                        line.y = 0.6 + Math.random() * 6.5;
                    }
                    const dynamicLen = line.len * (1.0 + speedRatio * 1.8);
                    const idx = i * 6;
                    pos[idx] = line.x;
                    pos[idx + 1] = line.y;
                    pos[idx + 2] = line.z;
                    pos[idx + 3] = line.x;
                    pos[idx + 4] = line.y;
                    pos[idx + 5] = line.z - dynamicLen;
                }
                this.windLines.geometry.attributes.position.needsUpdate = true;
            }
        }

        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            seg.group.position.z += moveDist;

            // When segment passes behind camera (Z > 30), recycle to the far back
            if (seg.group.position.z > 35) {
                // Find furthest back segment
                let minZ = 0;
                for (let j = 0; j < this.segments.length; j++) {
                    if (this.segments[j].group.position.z < minZ) {
                        minZ = this.segments[j].group.position.z;
                    }
                }
                seg.group.position.z = minZ - this.SEGMENT_LENGTH;
            }
        }

        // 2. Drift clouds in the sky
        for (let c = 0; c < this.clouds.length; c++) {
            const cloud = this.clouds[c];
            cloud.position.z += (cloud.userData.driftSpeed + speed * 0.08) * dt;
            if (cloud.position.z > 50) {
                cloud.position.z = -170 - Math.random() * 40;
                cloud.position.x = (Math.random() - 0.5) * 110;
            }
        }

        // 3. Update Biome Atmospheric Particles
        for (let p of this.envParticles) {
            p.position.z += (speed * 0.45 + 2.0) * dt;
            p.position.y += p.userData.speedY * dt;
            p.position.x += p.userData.speedX * dt;

            if (p.position.z > 20 || p.position.y < 0.2) {
                p.position.z = -120 - Math.random() * 30;
                p.position.y = 3.0 + Math.random() * 10;
                p.position.x = (Math.random() - 0.5) * 45;
            }
        }

        // 4. Move & update active obstacles (Object Pooling)
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.z += moveDist;
            obs.mesh.position.z = obs.z;

            // Remove if passed far behind player
            if (obs.z > 25) {
                obs.active = false;
                obs.mesh.visible = false;
                if (obs.type === 'barrier_hurdle') {
                    if (this.hurdlePool) this.hurdlePool.push(obs);
                } else if (obs.type === 'barrier_overhead') {
                    if (this.overheadPool) this.overheadPool.push(obs);
                } else if (obs.type === 'laser') {
                    if (this.laserPool) this.laserPool.push(obs);
                } else if (obs.isSmall) {
                    if (this.rockPoolSmall) this.rockPoolSmall.push(obs);
                } else {
                    if (this.rockPoolLarge) this.rockPoolLarge.push(obs);
                }
                this.obstacles.splice(i, 1);
            }
        }

        // 5. Move & animate powerups (Object Pooling)
        const now = performance.now() * 0.001;
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.z += moveDist;
            p.mesh.position.z = p.z;
            p.mesh.rotation.y += 2.8 * dt;
            p.mesh.position.y = p.baseY + Math.sin(now * 3.5 + p.x) * 0.18;

            // Remove if passed behind player
            if (p.z > 20) {
                p.active = false;
                p.mesh.visible = false;
                if (this.powerupPool) this.powerupPool.push(p);
                this.powerups.splice(i, 1);
            }
        }

        // 6. Move & animate coins (Object Pooling & smooth Y-axis spin)
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.z += moveDist;
            coin.mesh.position.z = coin.z;

            // Smooth Y-axis rotation animation like a real gold coin
            coin.mesh.rotation.y += coin.rotSpeed * dt;
            coin.mesh.position.y = coin.baseY + Math.sin(now * coin.bobSpeed + coin.x) * 0.14;

            // Magnet attraction towards player if active
            if (coin.attractDist) {
                coin.x += coin.attractDist.x * 12.0 * dt;
                coin.y += coin.attractDist.y * 12.0 * dt;
                coin.mesh.position.x = coin.x;
                coin.mesh.position.y = coin.y;
            }

            // Remove if passed behind player
            if (coin.z > 20) {
                coin.active = false;
                coin.mesh.visible = false;
                if (this.coinPool) this.coinPool.push(coin);
                this.coins.splice(i, 1);
            }
        }

        // 7. Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            } else {
                p.vel.y -= 14.0 * dt; // gravity
                p.mesh.position.addScaledVector(p.vel, dt);
                const scale = Math.max(0.01, p.life / p.maxLife);
                p.mesh.scale.set(scale, scale, scale);
            }
        }
    }

    clearEntities() {
        // Remove all obstacles
        for (let obs of this.obstacles) {
            obs.active = false;
            obs.mesh.visible = false;
            if (obs.type === 'barrier_hurdle') {
                if (this.hurdlePool) this.hurdlePool.push(obs);
            } else if (obs.type === 'barrier_overhead') {
                if (this.overheadPool) this.overheadPool.push(obs);
            } else if (obs.type === 'laser') {
                if (this.laserPool) this.laserPool.push(obs);
            } else if (obs.isSmall) {
                if (this.rockPoolSmall) this.rockPoolSmall.push(obs);
            } else {
                if (this.rockPoolLarge) this.rockPoolLarge.push(obs);
            }
        }
        this.obstacles = [];

        // Remove all powerups
        for (let p of this.powerups) {
            p.active = false;
            p.mesh.visible = false;
            if (this.powerupPool) this.powerupPool.push(p);
        }
        this.powerups = [];

        // Remove all coins
        for (let coin of this.coins) {
            coin.active = false;
            coin.mesh.visible = false;
            if (this.coinPool) this.coinPool.push(coin);
        }
        this.coins = [];

        // Remove particles
        for (let p of this.particles) {
            this.scene.remove(p.mesh);
        }
        this.particles = [];
    }
}

window.WorldManager = WorldManager;
