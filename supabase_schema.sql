-- 0. Alles Vorhandene löschen, um sauber neu zu starten
DROP TRIGGER IF EXISTS update_user_settings_timestamp ON public.user_settings;
DROP TRIGGER IF EXISTS update_sessions_timestamp ON public.sessions;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, DOUBLE PRECISION) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_hub_post_like_change() CASCADE;
DROP FUNCTION IF EXISTS public.increment_fork_count(UUID, UUID) CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.hub_post_forks CASCADE;
DROP TABLE IF EXISTS public.hub_post_likes CASCADE;
DROP TABLE IF EXISTS public.hub_reports CASCADE;
DROP TABLE IF EXISTS public.hub_posts CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP EXTENSION IF EXISTS vector CASCADE;

-- 1. Erweiterung für RAG (Vektorspeicher)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Settings & Public Profiles
CREATE TABLE public.user_settings (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  cloud_sync_enabled BOOLEAN DEFAULT true,
  credits DOUBLE PRECISION DEFAULT 0.0,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'verified', 'admin', 'owner', 'moderator')),
  is_verified BOOLEAN DEFAULT false,
  stack JSONB DEFAULT '[]'::jsonb,
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Social Hub Posts
CREATE TABLE public.hub_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_settings(user_id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  response_preview TEXT,
  likes_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sessions & Messages
CREATE TABLE public.sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  tokens JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS & Policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_posts ENABLE ROW LEVEL SECURITY;

-- User Settings Policies
DROP POLICY IF EXISTS "user_settings_select_all" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON user_settings;
CREATE POLICY "user_settings_select_all" ON user_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_settings_update_own" ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Hub Posts Policies
DROP POLICY IF EXISTS "hub_posts_select_policy" ON hub_posts;
DROP POLICY IF EXISTS "hub_posts_insert_policy" ON hub_posts;
DROP POLICY IF EXISTS "hub_posts_owner_policy" ON hub_posts;
CREATE POLICY "hub_posts_select_policy" ON hub_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_posts_insert_policy" ON hub_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_posts_owner_policy" ON hub_posts FOR ALL TO authenticated USING (auth.uid() = user_id OR (SELECT role FROM user_settings WHERE user_id = auth.uid()) IN ('owner', 'admin'));

-- Sessions & Messages Policies
DROP POLICY IF EXISTS "sessions_all_policy" ON sessions;
DROP POLICY IF EXISTS "messages_all_policy" ON messages;
CREATE POLICY "sessions_all_policy" ON sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_all_policy" ON messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Automatisches Setup für neue Benutzer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, display_name, avatar_url, credits, cloud_sync_enabled, role, is_verified, stack)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'user_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    0.0, 
    true, 
    'user', 
    false,
    '[]'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for existing users to fix their names and internal roles
INSERT INTO public.user_settings (user_id, display_name, avatar_url, credits, role, is_verified)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', raw_user_meta_data->>'user_name', email),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'),
  0.0,
  CASE WHEN id = '68a8b25b-c632-430e-b2ef-57bc0d327710' THEN 'owner' ELSE 'user' END,
  CASE WHEN id = '68a8b25b-c632-430e-b2ef-57bc0d327710' THEN true ELSE false END
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified;

-- 7. Sicherheitsfunktion für Guthaben-Abzug
CREATE OR REPLACE FUNCTION public.deduct_credits(user_id_val UUID, amount_val DOUBLE PRECISION)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_settings
  SET credits = credits - amount_val
  WHERE user_id = user_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger für automatische Zeitstempel
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_timestamp BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER update_sessions_timestamp BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 9. Hub Post Likes
CREATE TABLE public.hub_post_likes (
  post_id UUID REFERENCES public.hub_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.hub_post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hub_post_likes_select_all" ON hub_post_likes;
DROP POLICY IF EXISTS "hub_post_likes_insert_own" ON hub_post_likes;
DROP POLICY IF EXISTS "hub_post_likes_delete_own" ON hub_post_likes;
CREATE POLICY "hub_post_likes_select_all" ON hub_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "hub_post_likes_insert_own" ON hub_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hub_post_likes_delete_own" ON hub_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to update likes_count in hub_posts
CREATE OR REPLACE FUNCTION public.handle_hub_post_like_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.hub_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.hub_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_hub_post_like_change
  AFTER INSERT OR DELETE ON public.hub_post_likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_hub_post_like_change();

-- 10. Forks tracking (Unique per user/post)
CREATE TABLE public.hub_post_forks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES hub_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_settings(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(post_id, user_id)
);

ALTER TABLE hub_post_forks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public forks are viewable by everyone" ON hub_post_forks;
DROP POLICY IF EXISTS "Users can track their own forks" ON hub_post_forks;
CREATE POLICY "Public forks are viewable by everyone" ON hub_post_forks FOR SELECT USING (true);
CREATE POLICY "Users can track their own forks" ON hub_post_forks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Atomic Fork Increment function
CREATE OR REPLACE FUNCTION increment_fork_count(post_id_val UUID, user_id_val UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO hub_post_forks (post_id, user_id)
    VALUES (post_id_val, user_id_val)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    
    IF FOUND THEN
        UPDATE hub_posts
        SET forks_count = forks_count + 1
        WHERE id = post_id_val;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Hub Reports
CREATE TABLE public.hub_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.hub_posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES public.user_settings(user_id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hub_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hub_reports_insert_all" ON hub_reports;
DROP POLICY IF EXISTS "hub_reports_owner_access" ON hub_reports;
CREATE POLICY "hub_reports_insert_all" ON hub_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hub_reports_owner_access" ON hub_reports FOR ALL TO authenticated USING (
  (SELECT role FROM user_settings WHERE user_id = auth.uid()) IN ('owner', 'admin')
);

-- ==========================================
-- SOCIAL SYSTEM: FOLLOWS & FRIENDS
-- ==========================================

-- Follows: One-way relationship (Subscriber model)
CREATE TABLE IF NOT EXISTS hub_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES user_settings(user_id) ON DELETE CASCADE,
    following_id UUID REFERENCES user_settings(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(follower_id, following_id)
);

-- Friends: Two-way relationship (Mutual model)
CREATE TABLE IF NOT EXISTS hub_friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_settings(user_id) ON DELETE CASCADE,
    friend_id UUID REFERENCES user_settings(user_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, friend_id)
);

-- RLS Enablement
ALTER TABLE hub_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_friends ENABLE ROW LEVEL SECURITY;

-- Follows Policies
DROP POLICY IF EXISTS "Follows are public" ON hub_follows;
CREATE POLICY "Follows are public" ON hub_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own follows" ON hub_follows;
CREATE POLICY "Users can manage their own follows" ON hub_follows 
    FOR ALL USING (auth.uid() = follower_id);

-- Friends Policies
DROP POLICY IF EXISTS "Friends are visible to involved parties" ON hub_friends;
CREATE POLICY "Friends are visible to involved parties" ON hub_friends 
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can manage their own friend requests" ON hub_friends;
CREATE POLICY "Users can manage their own friend requests" ON hub_friends 
    FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);
-- ==========================================
-- PRIVATE MESSAGING SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS hub_private_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES user_settings(user_id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES user_settings(user_id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hub_private_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own messages" ON hub_private_messages;
CREATE POLICY "Users can see their own messages" ON hub_private_messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON hub_private_messages;
CREATE POLICY "Users can send messages" ON hub_private_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
