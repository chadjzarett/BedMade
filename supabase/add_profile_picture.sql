-- Add profile_picture column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN user_profiles.profile_picture IS 'URL or path to the user''s profile picture'; 