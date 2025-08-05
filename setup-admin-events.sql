-- Admin Events System Setup
-- Run this in your Supabase SQL editor

-- Create admin_events table
CREATE TABLE IF NOT EXISTS admin_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('notification', 'maintenance', 'promotion', 'system', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  affected_users TEXT[],
  send_notification BOOLEAN NOT NULL DEFAULT true,
  notification_sent BOOLEAN NOT NULL DEFAULT false
);

-- Add RLS policies for admin_events
ALTER TABLE admin_events ENABLE ROW LEVEL SECURITY;

-- Policies for admin_events table
CREATE POLICY "Events are viewable by everyone" ON admin_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert events" ON admin_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update events" ON admin_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can delete events" ON admin_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Add comments
COMMENT ON TABLE admin_events IS 'System events and notifications created by admins';
COMMENT ON COLUMN admin_events.type IS 'Type of event: notification, maintenance, promotion, system, or other';
COMMENT ON COLUMN admin_events.priority IS 'Priority level: low, medium, high, or critical';
COMMENT ON COLUMN admin_events.is_recurring IS 'Whether this event repeats regularly';
COMMENT ON COLUMN admin_events.recurrence_pattern IS 'Pattern for recurring events (daily, weekly, etc.)';
COMMENT ON COLUMN admin_events.affected_users IS 'Array of user IDs affected by this event';
COMMENT ON COLUMN admin_events.send_notification IS 'Whether to send notification to users';
COMMENT ON COLUMN admin_events.notification_sent IS 'Whether notification has been sent to users';

-- Insert sample events
INSERT INTO admin_events (
  title, 
  description, 
  type, 
  priority, 
  start_date, 
  end_date, 
  is_active, 
  created_by,
  is_recurring,
  send_notification
) VALUES 
(
  'Плановое техническое обслуживание', 
  'Банк будет недоступен с 2:00 до 4:00 для технического обслуживания. Приносим извинения за неудобства.',
  'maintenance',
  'medium',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day 2 hours',
  true,
  (SELECT id FROM auth.users LIMIT 1),
  false,
  true
),
(
  'Акция: Бонус за пополнение счета',
  'Получите бонус 5% при пополнении счета на сумму от 1000 МР.',
  'promotion',
  'low',
  NOW(),
  NOW() + INTERVAL '7 days',
  true,
  (SELECT id FROM auth.users LIMIT 1),
  false,
  true
),
(
  'Критическое обновление безопасности',
  'Пожалуйста, обновите свои пароли для повышения безопасности вашего аккаунта.',
  'system',
  'critical',
  NOW() - INTERVAL '1 day',
  null,
  true,
  (SELECT id FROM auth.users LIMIT 1),
  false,
  true
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_events_type ON admin_events(type);
CREATE INDEX IF NOT EXISTS idx_admin_events_priority ON admin_events(priority);
CREATE INDEX IF NOT EXISTS idx_admin_events_is_active ON admin_events(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_events_start_date ON admin_events(start_date);