-- Drop existing RLS policies for user_profiles table
DROP POLICY IF EXISTS "Users can view their own profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON user_profiles;

-- Enable RLS on the table (in case it's not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing profiles
CREATE POLICY "Users can view their own profiles"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Create policy for updating profiles
CREATE POLICY "Users can update their own profiles"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Create policy for inserting profiles
CREATE POLICY "Users can insert their own profiles"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create policy for upsert operations
CREATE POLICY "Users can upsert their own profiles"
ON user_profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 