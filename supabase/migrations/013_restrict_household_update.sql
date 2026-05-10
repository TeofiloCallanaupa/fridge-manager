-- ============================================================================
-- Migration 013: Restrict household UPDATE to owners only
--
-- Previously, any household member could update household details (name,
-- timezone). This tightens the policy so only owners can modify household
-- settings, matching the security principle of least privilege.
-- ============================================================================

DROP POLICY "households_update_member" ON households;

CREATE POLICY "households_update_owner"
  ON households FOR UPDATE
  USING (id IN (SELECT get_user_owned_households()))
  WITH CHECK (id IN (SELECT get_user_owned_households()));
