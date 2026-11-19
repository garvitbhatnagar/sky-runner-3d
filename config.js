/**
 * Sky Runner 3D - Global Game Configuration & Definitions
 * Environments, Skins, Daily Rewards, Supabase config, and constants.
 */

window.GAME_CONFIG = {
    // Supabase Configuration (Free-Tier Backend)
    // Replace these or enter them in Settings -> Backend to connect to your own Supabase project.
    SUPABASE: {
        URL: "https://ywfkswdowkdeeshiwptc.supabase.co",
        ANON_KEY: "sb_publishable_3iRA4OEEVTRYV6UycZjEZw_56oC2nNl",
        TABLE_LEADERBOARD: "leaderboard",
        TABLE_ROOMS: "multiplayer_rooms",
        CHANNEL_MULTIPLAYER: "skyrunner_mp"
    },

    // Daily Rewards Coin Progression (Days 1 to 7)
    DAILY_REWARDS: [
        { day: 1, coins: 50, label: "Day 1" },
        { day: 2, coins: 75, label: "Day 2" },
        { day: 3, coins: 100, label: "Day 3" },
        { day: 4, coins: 150, label: "Day 4" },
        { day: 5, coins: 200, label: "Day 5" },
        { day: 6, coins: 300, label: "Day 6" },
        { day: 7, coins: 500, label: "Day 7 (MEGA REWARD)" }
    ],

    // 10 Detailed Environments
    ENVIRONMENTS: {
        forest: {
            id: 'forest',
            name: "Green Forest",
            icon: "🌲",
            skyColor: 0x56aaff,
            fogColor: 0x8ac4ff,
            fogNear: 50,
            fogFar: 200,
            sunColor: 0xfffaed,
            sunIntensity: 1.0,
            hemiSky: 0xffffff,
            hemiGround: 0x446688,
            roadColor: 0x242830,
            groundColor: 0x3ea339,
            curbColor1: 0xee3333,
            curbColor2: 0xf5f5f5,
            stripeColor: 0xffffff,
            particleType: 'leaves',
            particleColor: 0x55cc44,
            sceneryTheme: 'forest',
            description: "Sunlit forest trail bordered by lush evergreen pines and rolling hills."
        },
        snow: {
            id: 'snow',
            name: "Snow Mountains",
            icon: "❄️",
            skyColor: 0x9bc2e6,
            fogColor: 0xb5d6f4,
            fogNear: 45,
            fogFar: 180,
            sunColor: 0xeef6ff,
            sunIntensity: 1.1,
            hemiSky: 0xddeeff,
            hemiGround: 0x7799bb,
            roadColor: 0x334155,
            groundColor: 0xe2e8f0,
            curbColor1: 0x0ea5e9,
            curbColor2: 0xf8fafc,
            stripeColor: 0x7dd3fc,
            particleType: 'snow',
            particleColor: 0xffffff,
            sceneryTheme: 'snow',
            description: "Sub-zero alpine pass surrounded by frosty pine peaks and swirling flurries."
        },
        desert: {
            id: 'desert',
            name: "Desert Highway",
            icon: "🏜️",
            skyColor: 0xf59e0b,
            fogColor: 0xfcd34d,
            fogNear: 50,
            fogFar: 190,
            sunColor: 0xffedd5,
            sunIntensity: 1.25,
            hemiSky: 0xfde68a,
            hemiGround: 0xb45309,
            roadColor: 0x3f3f46,
            groundColor: 0xd97706,
            curbColor1: 0xb45309,
            curbColor2: 0xfef3c7,
            stripeColor: 0xfde047,
            particleType: 'dust',
            particleColor: 0xd97706,
            sceneryTheme: 'desert',
            description: "Scorching sunbaked highway cutting through giant saguaro cacti and red dunes."
        },
        cyber: {
            id: 'cyber',
            name: "Neon Cyber City",
            icon: "🌆",
            skyColor: 0x0a051b,
            fogColor: 0x1f0b38,
            fogNear: 40,
            fogFar: 170,
            sunColor: 0x00d2ff,
            sunIntensity: 0.85,
            hemiSky: 0xd946ef,
            hemiGround: 0x0f172a,
            roadColor: 0x111827,
            groundColor: 0x09090b,
            curbColor1: 0xec4899,
            curbColor2: 0x06b6d4,
            stripeColor: 0x00f5ff,
            particleType: 'cyber',
            particleColor: 0x00f5ff,
            sceneryTheme: 'cyber',
            description: "Electrifying synthwave metropolis filled with towering glowing skyscrapers."
        },
        tropical: {
            id: 'tropical',
            name: "Tropical Island",
            icon: "🏝️",
            skyColor: 0x38bdf8,
            fogColor: 0x7dd3fc,
            fogNear: 55,
            fogFar: 200,
            sunColor: 0xfffbeb,
            sunIntensity: 1.15,
            hemiSky: 0xe0f2fe,
            hemiGround: 0x0284c7,
            roadColor: 0xd6c29b,
            groundColor: 0x0284c7, // Turquoise ocean waters on sides!
            curbColor1: 0xf97316,
            curbColor2: 0xffffff,
            stripeColor: 0xffffff,
            particleType: 'leaves',
            particleColor: 0x22c55e,
            sceneryTheme: 'tropical',
            description: "Golden sand causeway flanked by turquoise ocean lagoons and swaying palms."
        },
        space: {
            id: 'space',
            name: "Space Station",
            icon: "🚀",
            skyColor: 0x030712,
            fogColor: 0x0b1329,
            fogNear: 60,
            fogFar: 220,
            sunColor: 0x93c5fd,
            sunIntensity: 0.9,
            hemiSky: 0x3b82f6,
            hemiGround: 0x020617,
            roadColor: 0x1e293b,
            groundColor: 0x020617,
            curbColor1: 0x3b82f6,
            curbColor2: 0x94a3b8,
            stripeColor: 0x60a5fa,
            particleType: 'stars',
            particleColor: 0x93c5fd,
            sceneryTheme: 'space',
            description: "Orbital solar catwalk floating high above Earth with zero-g asteroid hazards."
        },
        volcano: {
            id: 'volcano',
            name: "Volcano Valley",
            icon: "🌋",
            skyColor: 0x260707,
            fogColor: 0x450a0a,
            fogNear: 45,
            fogFar: 180,
            sunColor: 0xf87171,
            sunIntensity: 0.95,
            hemiSky: 0xef4444,
            hemiGround: 0x1c1917,
            roadColor: 0x18181b,
            groundColor: 0x7f1d1d,
            curbColor1: 0xdc2626,
            curbColor2: 0xf97316,
            stripeColor: 0xf59e0b,
            particleType: 'embers',
            particleColor: 0xf97316,
            sceneryTheme: 'volcano',
            description: "Treacherous obsidian highway winding past boiling magma rivers and smoke plumes."
        },
        skycity: {
            id: 'skycity',
            name: "Futuristic Sky City",
            icon: "🏙️",
            skyColor: 0x6366f1,
            fogColor: 0xa5b4fc,
            fogNear: 55,
            fogFar: 210,
            sunColor: 0xfef08a,
            sunIntensity: 1.1,
            hemiSky: 0xc7d2fe,
            hemiGround: 0x4338ca,
            roadColor: 0x312e81,
            groundColor: 0xe0e7ff,
            curbColor1: 0x818cf8,
            curbColor2: 0xf8fafc,
            stripeColor: 0xc7d2fe,
            particleType: 'cyber',
            particleColor: 0x818cf8,
            sceneryTheme: 'skycity',
            description: "Anti-gravity glass skyway suspended above clouds between towering aerodynamic spires."
        },
        night: {
            id: 'night',
            name: "Night Highway",
            icon: "🌙",
            skyColor: 0x050a14,
            fogColor: 0x0a1428,
            fogNear: 50,
            fogFar: 190,
            sunColor: 0xdbeafe,
            sunIntensity: 0.7,
            hemiSky: 0x1e293b,
            hemiGround: 0x090d16,
            roadColor: 0x1e222d,
            groundColor: 0x0f172a,
            curbColor1: 0xf59e0b,
            curbColor2: 0xffffff,
            stripeColor: 0xffffff,
            particleType: 'dust',
            particleColor: 0x38bdf8,
            sceneryTheme: 'night',
            description: "Midnight expressway illuminated by highway streetlights with distant city lights."
        },
        temple: {
            id: 'temple',
            name: "Ancient Temple",
            icon: "🏛️",
            skyColor: 0x475569,
            fogColor: 0x64748b,
            fogNear: 50,
            fogFar: 195,
            sunColor: 0xfef3c7,
            sunIntensity: 1.0,
            hemiSky: 0x94a3b8,
            hemiGround: 0x334155,
            roadColor: 0x57534e,
            groundColor: 0x292524,
            curbColor1: 0xd97706,
            curbColor2: 0x78716c,
            stripeColor: 0xa8a29e,
            particleType: 'dust',
            particleColor: 0xd97706,
            sceneryTheme: 'temple',
            description: "Overgrown stone pathway passing mystic carved pillars, ancient ruins and flame braziers."
        }
    },

    // 12 Unlockable Character Skins
    SKINS: [
        {
            id: 'horizon',
            name: "Horizon Runner",
            subtitle: "Default Athletic Suit",
            price: 0,
            unlocked: true,
            icon: "🏃",
            description: "Classic aerodynamic lightweight athletic racing gear with cyan jersey and hot red runners.",
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
        },
        {
            id: 'cyber_ninja',
            name: "Cyber Ninja",
            subtitle: "Stealth Ops Suit",
            price: 250,
            unlocked: false,
            icon: "🥷",
            description: "Reinforced carbon-nanotube suit with illuminated cyan power lines and crimson stealth optics.",
            colors: {
                skin: 0xd1d5db,
                jersey: 0x0f172a,
                stripe: 0x00f5ff,
                pants: 0x020617,
                shoes: 0x00f5ff,
                hair: 0x000000,
                visor: 0xef4444,
                trail: 0x00f5ff
            }
        },
        {
            id: 'neon_blaze',
            name: "Neon Blaze",
            subtitle: "Synthwave Speedster",
            price: 400,
            unlocked: false,
            icon: "⚡",
            description: "High-octane retro synthwave racing outfit radiating neon magenta and electric purple glow.",
            colors: {
                skin: 0xfed7aa,
                jersey: 0xd946ef,
                stripe: 0xec4899,
                pants: 0x2e1065,
                shoes: 0xf43f5e,
                hair: 0x3b0764,
                visor: 0x06b6d4,
                trail: 0xd946ef
            }
        },
        {
            id: 'arctic_explorer',
            name: "Arctic Explorer",
            subtitle: "Polar Insulation Gear",
            price: 300,
            unlocked: false,
            icon: "❄️",
            description: "Heavy duty thermal parka lined with frost-resistant synthetic fur and glacier ice goggles.",
            colors: {
                skin: 0xfde047,
                jersey: 0xf8fafc,
                stripe: 0x38bdf8,
                pants: 0x334155,
                shoes: 0x0284c7,
                hair: 0x64748b,
                visor: 0x0ea5e9,
                trail: 0x7dd3fc
            }
        },
        {
            id: 'desert_nomad',
            name: "Desert Nomad",
            subtitle: "Wasteland Survivor",
            price: 350,
            unlocked: false,
            icon: "🏜️",
            description: "Rugged desert dust cloak reinforced with salvaged bronze plate and sandstorm filters.",
            colors: {
                skin: 0xb45309,
                jersey: 0x78350f,
                stripe: 0xf59e0b,
                pants: 0x451a03,
                shoes: 0xd97706,
                hair: 0x292524,
                visor: 0xfbbf24,
                trail: 0xf59e0b
            }
        },
        {
            id: 'astronaut',
            name: "Cosmic Astronaut",
            subtitle: "Deep Space EVA Suit",
            price: 500,
            unlocked: false,
            icon: "👨‍🚀",
            description: "Pressurized orbital EVA space suit featuring 24-karat reflective gold solar blast shield.",
            colors: {
                skin: 0xffffff,
                jersey: 0xe2e8f0,
                stripe: 0xef4444,
                pants: 0xcfd8dc,
                shoes: 0x1e293b,
                hair: 0x475569,
                visor: 0xfacc15,
                trail: 0x93c5fd
            }
        },
        {
            id: 'crimson_samurai',
            name: "Crimson Samurai",
            subtitle: "Lacquered Battle Armor",
            price: 600,
            unlocked: false,
            icon: "👺",
            description: "Traditional forged lacquered battle plate adorned with imperial gold trim and kabuto crest.",
            colors: {
                skin: 0xfbbf24,
                jersey: 0x991b1b,
                stripe: 0xf59e0b,
                pants: 0x1c1917,
                shoes: 0xb91c1c,
                hair: 0x000000,
                visor: 0xfacc15,
                trail: 0xef4444
            }
        },
        {
            id: 'golden_champion',
            name: "Golden Champion",
            subtitle: "Prestige Master Suit",
            price: 800,
            unlocked: false,
            icon: "🏆",
            description: "Glorious 24-karat mirror-finish pure gold armor awarded to champion endless runners.",
            colors: {
                skin: 0xfffbeb,
                jersey: 0xf59e0b,
                stripe: 0xfef08a,
                pants: 0x78350f,
                shoes: 0xd97706,
                hair: 0x451a03,
                visor: 0xfef08a,
                trail: 0xfacc15
            }
        },
        {
            id: 'toxic_raider',
            name: "Toxic Raider",
            subtitle: "Biohazard Spec Ops",
            price: 450,
            unlocked: false,
            icon: "☣️",
            description: "High-visibility radioactive hazard suit equipped with military respirator and toxic flare boots.",
            colors: {
                skin: 0x86efac,
                jersey: 0x84cc16,
                stripe: 0x15803d,
                pants: 0x14532d,
                shoes: 0xa3e635,
                hair: 0x052e16,
                visor: 0x4ade80,
                trail: 0x84cc16
            }
        },
        {
            id: 'shadow_phantom',
            name: "Shadow Phantom",
            subtitle: "Void Entity Cloak",
            price: 750,
            unlocked: false,
            icon: "👻",
            description: "Dark matter phantom armor infused with dark nebular energy and piercing violet eyes.",
            colors: {
                skin: 0x3b0764,
                jersey: 0x1e1b4b,
                stripe: 0x8b5cf6,
                pants: 0x0f172a,
                shoes: 0x7c3aed,
                hair: 0x020617,
                visor: 0xa855f7,
                trail: 0xa855f7
            }
        },
        {
            id: 'retro_pixel',
            name: "Retro Arcade",
            subtitle: "1984 Vector Champion",
            price: 350,
            unlocked: false,
            icon: "👾",
            description: "Vibrant multi-colored arcade pixel attire inspired by the golden era of 1980s coin-op cabinets.",
            colors: {
                skin: 0xfde047,
                jersey: 0x3b82f6,
                stripe: 0xef4444,
                pants: 0x10b981,
                shoes: 0xf59e0b,
                hair: 0x8b5cf6,
                visor: 0xfacc15,
                trail: 0x3b82f6
            }
        },
        {
            id: 'mecha_titan',
            name: "Mecha Titan",
            subtitle: "Heavy Exoskeleton Armor",
            price: 1000,
            unlocked: false,
            icon: "🤖",
            description: "Full-body hydraulic exoskeleton designed for planetary exploration and maximum velocity.",
            colors: {
                skin: 0xe2e8f0,
                jersey: 0x2563eb,
                stripe: 0xf59e0b,
                pants: 0x1e293b,
                shoes: 0x3b82f6,
                hair: 0x475569,
                visor: 0x06b6d4,
                trail: 0x2563eb
            }
        }
    ],

    // Unlockable Cosmetic Trails
    TRAILS: [
        { id: 'none', name: "Standard Aerodynamic", price: 0, unlocked: true, icon: "💨", color: 0xffffff },
        { id: 'cyan_sparkle', name: "Cyan Plasma Sparks", price: 150, unlocked: false, icon: "✨", color: 0x00f5ff },
        { id: 'gold_dust', name: "Golden Stardust", price: 300, unlocked: false, icon: "⭐", color: 0xffd700 },
        { id: 'cyber_fire', name: "Neon Cyber Flame", price: 500, unlocked: false, icon: "🔥", color: 0xff0055 },
        { id: 'void_smoke', name: "Void Dark Nebula", price: 600, unlocked: false, icon: "🌌", color: 0xa855f7 }
    ],

    // Unlockable Headwear / Accessories
    ACCESSORIES: [
        { id: 'none', name: "Standard Visor", price: 0, unlocked: true, icon: "🕶️" },
        { id: 'crown', name: "Royal Gold Crown", price: 400, unlocked: false, icon: "👑" },
        { id: 'halo', name: "Cyber Angel Halo", price: 350, unlocked: false, icon: "😇" },
        { id: 'vr_headset', name: "Tactical VR Goggles", price: 250, unlocked: false, icon: "🥽" },
        { id: 'headband', name: "Ninja Shinobi Headband", price: 200, unlocked: false, icon: "🎗️" }
    ]
};
