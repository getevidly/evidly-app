/*
  # Add Reminder and Notification System Tables
  
  1. New Tables
    - `onboarding_reminders`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `reminder_type` (varchar - day_1, day_3, day_7)
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `document_reminders`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `document_type` (text - the name of missing document)
      - `reminder_count` (integer - how many reminders sent)
      - `last_sent_at` (timestamptz)
      - `snoozed_until` (timestamptz, nullable)
      - `dismissed` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `notification_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `email_enabled` (boolean, default true)
      - `sms_enabled` (boolean, default false)
      - `quiet_hours_start` (time, default 20:00)
      - `quiet_hours_end` (time, default 08:00)
      - `reminder_frequency` (varchar - daily, weekly, per_event)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `document_alerts`
      - `id` (uuid, primary key)
      - `document_id` (uuid) - reference to documents table
      - `organization_id` (uuid, references organizations)
      - `document_name` (text)
      - `expiration_date` (date)
      - `alert_type` (varchar - 30_days, 14_days, 7_days, 1_day, expired, overdue)
      - `sent_at` (timestamptz)
      - `sent_via` (varchar[] - email, sms)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Users can view/manage their own notification settings
    - Admins can view reminders for their organization
*/

-- Onboarding Reminders Table
CREATE TABLE IF NOT EXISTS onboarding_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  reminder_type varchar(20) NOT NULL CHECK (reminder_type IN ('day_1', 'day_3', 'day_7')),
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Document Reminders Table
CREATE TABLE IF NOT EXISTS document_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  reminder_count integer DEFAULT 0,
  last_sent_at timestamptz,
  snoozed_until timestamptz,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '20:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  reminder_frequency varchar(20) DEFAULT 'per_event' CHECK (reminder_frequency IN ('daily', 'weekly', 'per_event')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document Alerts Table
CREATE TABLE IF NOT EXISTS document_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  document_name text NOT NULL,
  expiration_date date NOT NULL,
  alert_type varchar(20) NOT NULL CHECK (alert_type IN ('30_days', '14_days', '7_days', '1_day', 'expired', 'overdue')),
  sent_at timestamptz DEFAULT now(),
  sent_via text[] DEFAULT ARRAY['email'],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE onboarding_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for onboarding_reminders
CREATE POLICY "Admins can view onboarding reminders for their org"
  ON onboarding_reminders FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can manage onboarding reminders"
  ON onboarding_reminders FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Policies for document_reminders
CREATE POLICY "Users can view document reminders for their org"
  ON document_reminders FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage document reminders"
  ON document_reminders FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );

-- Policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for document_alerts
CREATE POLICY "Users can view document alerts for their org"
  ON document_alerts FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage document alerts"
  ON document_alerts FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_location_access WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_reminders_org ON onboarding_reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_reminders_type ON onboarding_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_document_reminders_org ON document_reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_reminders_dismissed ON document_reminders(dismissed);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_document_alerts_org ON document_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_alerts_date ON document_alerts(expiration_date);
