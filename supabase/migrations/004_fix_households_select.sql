-- Fix RLS policy so the creator can SELECT the household immediately after INSERT
-- (before they are added to household_members)

DROP POLICY IF EXISTS "households_select_member" ON households;

CREATE POLICY "households_select_member"
  ON households FOR SELECT
  USING (
    id IN (SELECT get_user_households())
    OR created_by = auth.uid()
  );
