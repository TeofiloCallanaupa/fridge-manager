import type { DiscardReason } from '../types/grocery.js';

// ---------------------------------------------------------------------------
// Discard reason helpers
// ---------------------------------------------------------------------------

export type OppositeReason = {
  label: string;
  newReason: DiscardReason;
};

/**
 * Returns the opposite discard reason for the toggle button.
 * consumed ↔ wasted (we don't toggle to 'expired' since that's auto-detected)
 */
export function getOppositeReason(reason: DiscardReason | null): OppositeReason {
  if (reason === 'consumed') {
    return { label: 'Change to Tossed', newReason: 'wasted' };
  }
  // wasted or expired → switch to consumed
  return { label: 'Change to Used', newReason: 'consumed' };
}

/**
 * Returns a display label for a discard reason.
 * Used for reason chips/badges in the UI.
 */
export function getDiscardReasonLabel(reason: DiscardReason | null): string {
  switch (reason) {
    case 'consumed':
      return 'Used';
    case 'wasted':
      return 'Wasted';
    case 'expired':
      return 'Expired';
    default:
      return 'Removed';
  }
}
