-- Custom feed curation: let Pro users pin/mute sources
CREATE TABLE IF NOT EXISTS user_source_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_handle text NOT NULL,
  preference text NOT NULL CHECK (preference IN ('pinned', 'muted', 'default')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, source_handle)
);

ALTER TABLE user_source_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_source_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_source_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_source_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_source_preferences FOR DELETE USING (auth.uid() = user_id);
