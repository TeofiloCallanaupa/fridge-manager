/**
 * @fridge-manager/shared — barrel export.
 *
 * All types, utilities, and constants are re-exported from here.
 * Import from '@fridge-manager/shared' in apps/web and apps/mobile.
 */

// Database (generated types — source of truth)
export type { Database, Tables, TablesInsert, TablesUpdate } from './types/database.js';

// Types
export type {
  Category,
  GroceryItem,
  InventoryItem,
  InventoryItemWithDetails,
  DefaultShelfDays,
  StorageLocation,
  DiscardReason,
  InventorySource,
  ExpirationSource,
  ExpirationColor,
} from './types/grocery.js';

export type {
  Household,
  HouseholdMember,
  HouseholdInvite,
  HouseholdRole,
  InviteStatus,
} from './types/household.js';

export type {
  Profile,
  NotificationPreferences,
  PushSubscription,
  PushPlatform,
} from './types/profile.js';

export type { AvatarConfig } from './types/avatar.js';

export type {
  NotificationType,
  NotificationLog,
  SystemLogEvent,
  SystemLog,
} from './types/notifications.js';

// Utils
export { calculateExpiration, getDaysSince, getExpirationColor } from './utils/expiration.js';
export { getCategoryEmoji, getDefaultShelfDays } from './utils/categories.js';
export { formatRelativeTime, formatQuantity, formatPurchaseHistory } from './utils/formatting.js';
export { buildAvatarUrl, DEFAULT_AVATAR_CONFIG } from './utils/avatar.js';
export { getOppositeReason, getDiscardReasonLabel } from './utils/discard.js';
export type { OppositeReason } from './utils/discard.js';
export { fuzzyMatchFoodKeeper } from './utils/foodkeeper.js';
export {
  getActiveThresholds,
  isInQuietHours,
  buildNotificationMessage,
} from './utils/notifications.js';
export type {
  NotifiableItem,
  QuietHoursPrefs,
  NotificationMessage,
} from './utils/notifications.js';

// Constants
export {
  CATEGORY_SEED_DATA,
  EXPIRATION_COLORS,
  DEFAULT_SHELF_DAYS,
} from './constants/categories.js';

export {
  NOTIFICATION_THRESHOLDS,
  QUIET_HOURS_DEFAULT,
} from './constants/notifications.js';
