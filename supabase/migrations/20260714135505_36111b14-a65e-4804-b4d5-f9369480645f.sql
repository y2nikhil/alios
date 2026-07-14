
-- Extend notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'focus_milestone';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task_completed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'moderation_alert';
