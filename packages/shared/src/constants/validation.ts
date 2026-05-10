/**
 * Shared validation constants for inventory mutations.
 *
 * Used by both web and mobile to enforce consistent
 * input validation rules across platforms.
 */

/** Max length for item name (matches DB column constraint) */
export const MAX_NAME_LENGTH = 200

/** Max length for quantity string (matches DB column constraint) */
export const MAX_QUANTITY_LENGTH = 50
