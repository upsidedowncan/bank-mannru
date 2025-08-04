-- Complete Giveaway System Setup
-- Run this in your Supabase SQL editor

-- Create giveaways table
CREATE TABLE IF NOT EXISTS giveaways (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prize_amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MR',
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  winner_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create giveaway_participants table
CREATE TABLE IF NOT EXISTS giveaway_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  giveaway_id UUID REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(giveaway_id, user_id)
);

-- Add RLS policies for giveaways
ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_participants ENABLE ROW LEVEL SECURITY;

-- Policies for giveaways table
CREATE POLICY "Giveaways are viewable by everyone" ON giveaways
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert giveaways" ON giveaways
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update giveaways" ON giveaways
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can delete giveaways" ON giveaways
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Policies for giveaway_participants table
CREATE POLICY "Participants are viewable by everyone" ON giveaway_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join giveaways" ON giveaway_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave giveaways" ON giveaway_participants
  FOR DELETE USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE giveaways IS 'Giveaway events created by admins';
COMMENT ON TABLE giveaway_participants IS 'Users participating in giveaways';
COMMENT ON COLUMN giveaways.max_participants IS 'Maximum number of participants. NULL means unlimited.';
COMMENT ON COLUMN giveaways.winner_id IS 'Winner of the giveaway. NULL if not yet drawn.';

-- Add giveaway function to features marketplace
INSERT INTO features_marketplace (title, description, route, icon, is_active, created_at)
VALUES (
  'Розыгрыши',
  'Участвуйте в розыгрышах и выигрывайте призы! Создавайте розыгрыши, присоединяйтесь к существующим и следите за результатами.',
  '/giveaways',
  'Casino',
  true,
  NOW()
) ON CONFLICT DO NOTHING; 