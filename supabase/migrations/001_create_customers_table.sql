-- Create customers table linked to profiles (users)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin full access" ON public.customers
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create policy for users to view own data
CREATE POLICY "Users view own" ON public.customers
  FOR SELECT USING (auth.uid() = id);

-- Function to sync auth.users to customers
CREATE OR REPLACE FUNCTION public.sync_user_to_customer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (id, user_id, email, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create customer when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_customer();

-- Insert existing users as customers
INSERT INTO public.customers (id, user_id, email, full_name, created_at)
SELECT 
  id,
  id,
  email,
  raw_user_meta_data->>'full_name',
  created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
