-- Add notifications_enabled column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false;

-- Update existing rows to have default value
UPDATE user_profiles 
SET notifications_enabled = false
WHERE notifications_enabled IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN user_profiles.notifications_enabled IS 'Whether notifications are enabled for this user'; 