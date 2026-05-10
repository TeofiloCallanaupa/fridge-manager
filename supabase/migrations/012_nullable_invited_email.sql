-- ============================================================================
-- Migration 012: Make invited_email nullable
--
-- The invite system was refactored from email-based to link-based invites
-- (consent-based, single-use tokens). The send-invite Edge Function now
-- creates invites without an email address. This migration aligns the schema
-- with the current application behavior.
--
-- See: docs/architecture.md → How Invites Work
-- ============================================================================

ALTER TABLE household_invites
  ALTER COLUMN invited_email DROP NOT NULL;
