/*
  # Add Tour Tracking to User Profiles

  1. Changes
    - Add `tour_completed` column to `user_profiles` table
      - Boolean field to track if user has completed the product tour
      - Defaults to false for new users
      - Updated to true when user completes or skips the tour

  2. Purpose
    - Enable automatic tour launch for first-time users
    - Prevent tour from showing again after completion
    - Support "Restart Tour" functionality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'tour_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN tour_completed BOOLEAN DEFAULT false;
  END IF;
END $$;
