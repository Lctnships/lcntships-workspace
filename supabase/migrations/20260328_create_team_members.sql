-- Team members table for account management
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read team members
CREATE POLICY "Authenticated users can read team members" ON team_members
  FOR SELECT USING (true);

-- Allow all authenticated users to insert/update (for invite flow)
CREATE POLICY "Allow insert for team members" ON team_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update for team members" ON team_members
  FOR UPDATE USING (true) WITH CHECK (true);
