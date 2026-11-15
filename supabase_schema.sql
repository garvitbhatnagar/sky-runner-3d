-- ====================================================================
-- SKY RUNNER 3D - Supabase Production Backend Schema (Idempotent)
-- Safe to run repeatedly without errors or data loss.
-- Provides: Global Leaderboard, Anti-Cheat Validation, Guest Support,
-- and Realtime Multiplayer Synchronization.
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. LEADERBOARD TABLE (Global, Daily, Weekly rankings)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(16) NOT NULL DEFAULT 'Runner',
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000000),
    distance INTEGER NOT NULL CHECK (distance >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure server-side anti-cheat mathematical validation constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'valid_score_physics'
          AND conrelid = 'public.leaderboard'::regclass
    ) THEN
        ALTER TABLE public.leaderboard
            ADD CONSTRAINT valid_score_physics CHECK (
                score <= (distance * 2 + coins * 70 + level * 300 + 500)
            );
    END IF;
END $$;

-- Indexes for fast ranking queries (safe to run repeatedly)
CREATE INDEX IF NOT EXISTS idx_leaderboard_alltime ON public.leaderboard (score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created ON public.leaderboard (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_daily ON public.leaderboard (created_at DESC, score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for Leaderboard
DROP POLICY IF EXISTS "Public read leaderboard" ON public.leaderboard;
CREATE POLICY "Public read leaderboard" ON public.leaderboard
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public insert leaderboard" ON public.leaderboard;
CREATE POLICY "Public insert leaderboard" ON public.leaderboard
    FOR INSERT
    WITH CHECK (
        char_length(nickname) >= 1 AND
        char_length(nickname) <= 16 AND
        score >= 0
    );

-- NOTE: No public UPDATE or DELETE policies are granted on leaderboard,
-- ensuring players cannot modify or delete other players' records.

-- ====================================================================
-- 3. MULTIPLAYER ROOMS (Persistent Matchmaking & State)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.multiplayer_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    host_id TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'racing', 'finished')),
    players JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for room lookups
CREATE INDEX IF NOT EXISTS idx_multiplayer_room_code ON public.multiplayer_rooms (room_code);

-- Enable Row Level Security (RLS)
ALTER TABLE public.multiplayer_rooms ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies for Multiplayer Rooms
DROP POLICY IF EXISTS "Public read multiplayer rooms" ON public.multiplayer_rooms;
CREATE POLICY "Public read multiplayer rooms" ON public.multiplayer_rooms
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public insert multiplayer rooms" ON public.multiplayer_rooms;
CREATE POLICY "Public insert multiplayer rooms" ON public.multiplayer_rooms
    FOR INSERT
    WITH CHECK (
        char_length(room_code) >= 4 AND
        char_length(room_code) <= 10
    );

DROP POLICY IF EXISTS "Public update multiplayer rooms" ON public.multiplayer_rooms;
CREATE POLICY "Public update multiplayer rooms" ON public.multiplayer_rooms
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 4. SUPABASE REALTIME REPLICATION (Idempotent)
-- ====================================================================
-- Safely adds table to supabase_realtime publication only if not already added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_rel pr
            JOIN pg_class pc ON pr.prrelid = pc.oid
            JOIN pg_publication p ON pr.prpubid = p.oid
            WHERE p.pubname = 'supabase_realtime'
              AND pc.relname = 'multiplayer_rooms'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_rooms;
        END IF;
    END IF;
END $$;
