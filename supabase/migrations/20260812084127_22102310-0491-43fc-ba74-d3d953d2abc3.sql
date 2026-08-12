CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _global_channel uuid;
  _display text;
BEGIN
  _display := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, _display);

  INSERT INTO public.aux_statuses (user_id, name, color, category, is_paid, sort_order, shortcut_key, is_default) VALUES
    (NEW.id, 'Available',  '#10b981', 'productive',   true,  1, '1', true),
    (NEW.id, 'Deep Work',  '#8b5cf6', 'productive',   true,  2, '2', true),
    (NEW.id, 'Meeting',    '#3b82f6', 'productive',   true,  3, '3', true),
    (NEW.id, 'Break',      '#f59e0b', 'neutral',      true,  4, '4', true),
    (NEW.id, 'Lunch',      '#fb923c', 'neutral',      true,  5, '5', true),
    (NEW.id, 'Away',       '#94a3b8', 'neutral',      false, 6, '6', true),
    (NEW.id, 'Busy',       '#ef4444', 'unproductive', true,  7, '7', true),
    (NEW.id, 'Idle',       '#64748b', 'unproductive', false, 8, '8', true);

  IF lower(NEW.email) = 'n6nikhil@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  END IF;

  -- Welcome notification
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (
    NEW.id,
    'system'::notification_type,
    'Welcome to ClassLab 👋',
    'Thanks for joining — say hi in #chat-room.',
    '/app/collaborate'
  );

  -- Welcome message in global chat-room
  SELECT id INTO _global_channel FROM public.chat_channels WHERE team_id IS NULL AND name = 'chat-room' LIMIT 1;
  IF _global_channel IS NOT NULL THEN
    INSERT INTO public.chat_messages (channel_id, user_id, body)
    VALUES (_global_channel, NEW.id, '👋 ' || _display || ' just joined ClassLab — welcome!');
  END IF;

  RETURN NEW;
END;
$function$;