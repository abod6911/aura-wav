-- ==============================================================================
-- AuraWave — Supabase Cloud Sync Schema & Security Policies (RLS)
-- مخطط قاعدة البيانات وسياسات الأمان الصارمة لمزامنة AuraWave عبر الأجهزة
-- ==============================================================================
--
-- [تعليمات التشغيل في Supabase / Instructions]:
-- 1. افتح لوحة تحكم مشروعك في Supabase: https://supabase.com/dashboard/project/_/sql
-- 2. الصق كامل هذا الملف في محرر SQL (SQL Editor).
-- 3. اضغط على زر "Run" (تشغيل).
--
-- هذا الملف مصمم ليكون قابلاً للتنفيذ عدة مرات دون أخطاء أو فقدان بيانات (Idempotent).
-- يفعّل Row Level Security (RLS) بشكل صارم على جميع الجداول، لضمان عزل
-- بيانات كل مستخدم عن الآخر بصورة تامة بواسطة (auth.uid() = user_id).
-- ==============================================================================

-- 1. جدول المفضلة السحابية (User Favorites)
CREATE TABLE IF NOT EXISTS public.user_favorites (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, track_id)
);

-- فهارس تسريع الاستعلام للمفضلة
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id 
    ON public.user_favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at 
    ON public.user_favorites(user_id, created_at DESC);

-- تفعيل سياسات الأمان (RLS)
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_favorites;
CREATE POLICY "Users can view their own favorites"
    ON public.user_favorites FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.user_favorites;
CREATE POLICY "Users can insert their own favorites"
    ON public.user_favorites FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.user_favorites;
CREATE POLICY "Users can delete their own favorites"
    ON public.user_favorites FOR DELETE
    USING ((select auth.uid()) = user_id);


-- 2. جدول قوائم التشغيل السحابية (User Playlists)
CREATE TABLE IF NOT EXISTS public.user_playlists (
    id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    track_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, id)
);

-- فهارس تسريع الاستعلام لقوائم التشغيل
CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id 
    ON public.user_playlists(user_id);

CREATE INDEX IF NOT EXISTS idx_user_playlists_updated_at 
    ON public.user_playlists(user_id, updated_at DESC);

-- تفعيل سياسات الأمان (RLS)
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own playlists" ON public.user_playlists;
CREATE POLICY "Users can view their own playlists"
    ON public.user_playlists FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own playlists" ON public.user_playlists;
CREATE POLICY "Users can insert their own playlists"
    ON public.user_playlists FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own playlists" ON public.user_playlists;
CREATE POLICY "Users can update their own playlists"
    ON public.user_playlists FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own playlists" ON public.user_playlists;
CREATE POLICY "Users can delete their own playlists"
    ON public.user_playlists FOR DELETE
    USING ((select auth.uid()) = user_id);


-- 3. جدول سجل الاستماع السحابي (User History)
CREATE TABLE IF NOT EXISTS public.user_history (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    played_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, track_id)
);

-- فهارس تسريع الاستعلام للسجل
CREATE INDEX IF NOT EXISTS idx_user_history_user_played 
    ON public.user_history(user_id, played_at DESC);

-- تفعيل سياسات الأمان (RLS)
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own history" ON public.user_history;
CREATE POLICY "Users can view their own history"
    ON public.user_history FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert/update their own history" ON public.user_history;
CREATE POLICY "Users can insert/update their own history"
    ON public.user_history FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own history" ON public.user_history;
CREATE POLICY "Users can update their own history"
    ON public.user_history FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own history" ON public.user_history;
CREATE POLICY "Users can delete their own history"
    ON public.user_history FOR DELETE
    USING ((select auth.uid()) = user_id);


-- 4. جدول إعدادات الصوت والتطبيق السحابية (User Settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    eq_gains JSONB DEFAULT '[0,0,0,0,0,0,0,0,0,0]'::jsonb,
    eq_preset TEXT DEFAULT 'flat',
    automix_duration NUMERIC DEFAULT 6,
    automix_style TEXT DEFAULT 'fade',
    shuffle BOOLEAN DEFAULT false,
    repeat_mode TEXT DEFAULT 'off',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- تفعيل سياسات الأمان (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
    ON public.user_settings FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- ==============================================================================
-- انتهى المخطط بنجاح / Schema setup completed successfully.
-- ==============================================================================
