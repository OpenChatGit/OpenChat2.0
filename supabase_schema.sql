-- 0. Alles Vorhandene löschen, um sauber neu zu starten
DROP TRIGGER IF EXISTS update_user_settings_timestamp ON public.user_settings;
DROP TRIGGER IF EXISTS update_sessions_timestamp ON public.sessions;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP EXTENSION IF EXISTS vector CASCADE;

-- 1. Erweiterung für RAG (Vektorspeicher)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Settings (Mit Guthaben-Spalte & SaaS-Metriken)
CREATE TABLE public.user_settings (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  cloud_sync_enabled BOOLEAN DEFAULT true,
  credits DOUBLE PRECISION DEFAULT 0.0, -- No free credits by default
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Sessions (ID als TEXT für lokale Synchronisation)
CREATE TABLE public.sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Messages (Vollständige Sync-Unterstützung)
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

-- 5. RLS & Policies (Sicherheit)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings access" ON user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Sessions access" ON sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Messages access" ON messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Automatisches Setup für neue Benutzer (WICHTIG für SaaS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, credits, cloud_sync_enabled)
  VALUES (NEW.id, 0.0, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Sicherheitsfunktion für Guthaben-Abzug (Wird von Edge Function gerufen)
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

-- Init für bestehende User (Fix)
INSERT INTO public.user_settings (user_id, credits)
SELECT id, 0.0 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
