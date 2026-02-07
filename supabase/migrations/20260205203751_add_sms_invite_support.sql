/*
  # Add SMS Invite Support

  1. Changes to user_invitations table
    - Add `phone` column (text, optional) - for SMS invites
    - Add `invitation_method` column (varchar - email, sms, both)
    - Add `email_status` column (varchar - pending, sent, failed, null)
    - Add `sms_status` column (varchar - pending, sent, failed, null)
    - Update unique constraint to allow either email or phone
    
  2. Notes
    - At least one of email or phone must be provided
    - Kitchen staff rarely check email, so SMS is recommended default
    - Both delivery methods can be used simultaneously
*/

-- Add new columns to user_invitations
DO $$
BEGIN
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'phone'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN phone text;
  END IF;

  -- Add invitation_method column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'invitation_method'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN invitation_method varchar(20) DEFAULT 'email' 
      CHECK (invitation_method IN ('email', 'sms', 'both'));
  END IF;

  -- Add email_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'email_status'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN email_status varchar(20)
      CHECK (email_status IN ('pending', 'sent', 'failed'));
  END IF;

  -- Add sms_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_invitations' AND column_name = 'sms_status'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN sms_status varchar(20)
      CHECK (sms_status IN ('pending', 'sent', 'failed'));
  END IF;
END $$;

-- Drop the old unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_invitations_organization_id_email_status_key'
  ) THEN
    ALTER TABLE user_invitations DROP CONSTRAINT user_invitations_organization_id_email_status_key;
  END IF;
END $$;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_invitations_phone ON user_invitations(phone) WHERE phone IS NOT NULL;

-- Add check constraint to ensure at least email or phone is provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_invitations_contact_check'
  ) THEN
    ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_contact_check 
      CHECK (email IS NOT NULL OR phone IS NOT NULL);
  END IF;
END $$;