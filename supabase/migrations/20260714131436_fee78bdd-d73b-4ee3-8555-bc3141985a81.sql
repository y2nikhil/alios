
DROP POLICY IF EXISTS "View groups" ON public.groups;
CREATE POLICY "View groups"
ON public.groups
FOR SELECT
USING (
  is_public = true
  OR auth.uid() = created_by
  OR public.is_group_member(auth.uid(), id)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Assignee deletes own tasks"
ON public.tasks
FOR DELETE
USING (auth.uid() = assigned_to);
