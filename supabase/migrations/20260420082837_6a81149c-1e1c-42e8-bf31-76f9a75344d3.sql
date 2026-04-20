CREATE TABLE public.manager_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  body TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8b5cf6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view notes they author or receive"
ON public.manager_notes FOR SELECT
USING (auth.uid() = author_id OR auth.uid() = recipient_id);

CREATE POLICY "Users create notes as author"
ON public.manager_notes FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors update own notes"
ON public.manager_notes FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors delete own notes"
ON public.manager_notes FOR DELETE
USING (auth.uid() = author_id);

CREATE TRIGGER update_manager_notes_updated_at
BEFORE UPDATE ON public.manager_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_manager_notes_recipient ON public.manager_notes(recipient_id, created_at DESC);