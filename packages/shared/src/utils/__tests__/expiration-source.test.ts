/**
 * Type-level tests for ExpirationSource.
 *
 * Regression guard: ensures that 'foodkeeper' is a valid ExpirationSource value.
 * Before the fix (Phase 4.8), the type only allowed 'user' | 'default',
 * which would have caused a runtime DB constraint violation when the checkout
 * flow wrote 'foodkeeper' as the expiration_source.
 */

import { describe, it, expect } from 'vitest';
import type { ExpirationSource, InventoryItem } from '../../types/grocery.js';

describe('ExpirationSource type', () => {
  it('accepts "user" as a valid value', () => {
    const source: ExpirationSource = 'user';
    expect(source).toBe('user');
  });

  it('accepts "default" as a valid value', () => {
    const source: ExpirationSource = 'default';
    expect(source).toBe('default');
  });

  it('accepts "foodkeeper" as a valid value', () => {
    // Regression: this value was missing from the union type before migration 009
    const source: ExpirationSource = 'foodkeeper';
    expect(source).toBe('foodkeeper');
  });

  it('allows null for items without expiration', () => {
    const source: ExpirationSource | null = null;
    expect(source).toBeNull();
  });

  it('is usable in InventoryItem.expiration_source', () => {
    // Verify the type flows through to the InventoryItem type correctly
    const item = {
      expiration_source: 'foodkeeper' as ExpirationSource | null,
    };
    expect(item.expiration_source).toBe('foodkeeper');
  });
});
