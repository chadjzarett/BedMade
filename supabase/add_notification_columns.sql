-- Add notification preference columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notification_before_goal BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_at_goal BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_after_goal BOOLEAN DEFAULT TRUE;

-- Update existing rows to have default values
UPDATE user_profiles 
SET 
  notification_before_goal = TRUE,
  notification_at_goal = TRUE,
  notification_after_goal = TRUE
WHERE 
  notification_before_goal IS NULL OR
  notification_at_goal IS NULL OR
  notification_after_goal IS NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN user_profiles.notification_before_goal IS 'Whether to send a notification before the user''s daily goal time';
COMMENT ON COLUMN user_profiles.notification_at_goal IS 'Whether to send a notification at the user''s daily goal time';
COMMENT ON COLUMN user_profiles.notification_after_goal IS 'Whether to send a notification after the user''s daily goal time'; 