-- Migration: Add Discord and Slack notification channels
-- This adds support for Discord webhooks and Slack webhooks

-- Update NotificationChannel table to support multiple channel types
ALTER TABLE NotificationChannel ADD COLUMN channelType TEXT DEFAULT 'email';
ALTER TABLE NotificationChannel ADD COLUMN webhookUrl TEXT;
ALTER TABLE NotificationChannel ADD COLUMN channelName TEXT;

-- Update existing records to have channelType = 'email'  
UPDATE NotificationChannel SET channelType = 'email' WHERE channelType IS NULL;

-- Add index for channel type
CREATE INDEX IF NOT EXISTS idx_notification_channel_type ON NotificationChannel(channelType);

-- Add settings table for notification preferences
CREATE TABLE IF NOT EXISTS NotificationSettings (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  preferredChannels TEXT NOT NULL DEFAULT '["email"]', -- JSON array of preferred channels
  discordWebhookUrl TEXT,
  slackWebhookUrl TEXT,
  emailEnabled INTEGER DEFAULT 1,
  discordEnabled INTEGER DEFAULT 0,
  slackEnabled INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for shop lookup
CREATE INDEX IF NOT EXISTS idx_notification_settings_shop ON NotificationSettings(shop);