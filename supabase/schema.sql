-- ============================================================================
-- Supabase PostgreSQL Schema: Multi-User Spotify Music Architecture
-- Enforces Row-Level Security (RLS), Cascade Deletions, and High-Performance B-Tree Indexes
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. User Profiles Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  preferred_theme TEXT DEFAULT 'spotify-dark',
  audio_quality TEXT DEFAULT 'high', -- 'normal', 'high', 'lossless'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING ((select auth.uid()) = id);

-- ----------------------------------------------------------------------------
-- 2. Liked Songs Table (User Favorites)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.liked_songs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration NUMERIC(8, 2) DEFAULT 0,
  cover_url TEXT,
  audio_url TEXT,
  source TEXT DEFAULT 'online', -- 'online', 'local', 'youtube'
  dominant_color TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, track_id)
);

-- Enable RLS
ALTER TABLE public.liked_songs ENABLE ROW LEVEL SECURITY;

-- Liked Songs Policies
CREATE POLICY "Users can view their own liked songs" 
  ON public.liked_songs FOR SELECT 
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add songs to their liked list" 
  ON public.liked_songs FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove songs from their liked list" 
  ON public.liked_songs FOR DELETE 
  USING ((select auth.uid()) = user_id);

-- Performance Index for sorting by added_at
CREATE INDEX IF NOT EXISTS idx_liked_songs_user_added 
  ON public.liked_songs (user_id, added_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Custom Playlists Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Playlists Policies
CREATE POLICY "Users can view their own playlists or public playlists" 
  ON public.playlists FOR SELECT 
  USING (is_public = TRUE OR (select auth.uid()) = user_id);

CREATE POLICY "Users can create their own playlists" 
  ON public.playlists FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own playlists" 
  ON public.playlists FOR UPDATE 
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own playlists" 
  ON public.playlists FOR DELETE 
  USING ((select auth.uid()) = user_id);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_playlists_user 
  ON public.playlists (user_id, updated_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Playlist Tracks Table (Junction Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration NUMERIC(8, 2) DEFAULT 0,
  cover_url TEXT,
  audio_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, track_id)
);

-- Enable RLS
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Playlist Tracks Policies (Scoped via parent playlist ownership or public status)
CREATE POLICY "Users can view tracks from accessible playlists" 
  ON public.playlist_tracks FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p 
      WHERE p.id = playlist_tracks.playlist_id 
        AND (p.is_public = TRUE OR p.user_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can insert tracks into their own playlists" 
  ON public.playlist_tracks FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p 
      WHERE p.id = playlist_tracks.playlist_id 
        AND p.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete tracks from their own playlists" 
  ON public.playlist_tracks FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p 
      WHERE p.id = playlist_tracks.playlist_id 
        AND p.user_id = (select auth.uid())
    )
  );

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position 
  ON public.playlist_tracks (playlist_id, position ASC);

-- ----------------------------------------------------------------------------
-- 5. Playback History Table (Recent Listening Log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  duration NUMERIC(8, 2) DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- History Policies
CREATE POLICY "Users can view their own playback history" 
  ON public.history FOR SELECT 
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can log their playback history" 
  ON public.history FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can clear their playback history" 
  ON public.history FOR DELETE 
  USING ((select auth.uid()) = user_id);

-- Performance Index for chronological sorting
CREATE INDEX IF NOT EXISTS idx_history_user_played 
  ON public.history (user_id, played_at DESC);

-- ----------------------------------------------------------------------------
-- 6. Trigger: Automatic Profile Creation on auth.users Sign Up
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
