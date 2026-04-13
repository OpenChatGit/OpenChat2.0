-- 1. Create Profile Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'verified', 'admin', 'owner')),
  is_verified BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 3. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Everyone can view profiles
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  USING (true);

-- Users can only update their own username/avatar (not their role!)
CREATE POLICY "Users can update own metadata" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    -- Prevent users from changing their own role/verification status
    (SELECT role FROM profiles WHERE id = auth.uid()) = role AND
    (SELECT is_verified FROM profiles WHERE id = auth.uid()) = is_verified
  );

-- 5. Trigger for automatic profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (new.id, new.raw_user_meta_data->>'username', 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Helper for YOU: Promote yourself to Owner (Run this with your actual UUID)
-- UPDATE profiles SET role = 'owner', is_verified = true WHERE id = 'YOUR-UUID-HERE';
