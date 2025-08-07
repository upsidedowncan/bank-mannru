-- Setup Game Cheats System
-- Run this in your Supabase SQL editor

-- Create user_cheats table to store cheat settings
CREATE TABLE IF NOT EXISTS user_cheats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  always_win_flip BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies for user_cheats
ALTER TABLE user_cheats ENABLE ROW LEVEL SECURITY;

-- Policies for user_cheats table
-- Allow users to read their own cheat settings
CREATE POLICY "Users can view their own cheat settings" ON user_cheats
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to read all cheat settings
CREATE POLICY "Admins can view all cheat settings" ON user_cheats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Allow admins to update cheat settings
CREATE POLICY "Admins can update cheat settings" ON user_cheats
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Allow admins to insert cheat settings
CREATE POLICY "Admins can insert cheat settings" ON user_cheats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Create function to check if a user has the always_win_flip cheat enabled
CREATE OR REPLACE FUNCTION get_flip_game_cheat_status(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cheat_enabled BOOLEAN;
BEGIN
  SELECT always_win_flip INTO cheat_enabled
  FROM user_cheats
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(cheat_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update the updated_at field
CREATE OR REPLACE FUNCTION update_user_cheats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_cheats_updated_at
BEFORE UPDATE ON user_cheats
FOR EACH ROW EXECUTE FUNCTION update_user_cheats_updated_at();