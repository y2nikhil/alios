UPDATE public.chat_messages
SET body = REPLACE(body, 'just joined ALIOS', 'just joined ClassLab')
WHERE body ILIKE '%just joined ALIOS%';