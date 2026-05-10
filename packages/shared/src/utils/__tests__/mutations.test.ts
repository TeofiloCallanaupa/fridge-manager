/**
 * Regression test: shared mutation types and validation constants.
 *
 * Verifies that the types and constants extracted from web/mobile hooks
 * are importable and have the expected values.
 */
import { describe, it, expect } from 'vitest'
import {
  MAX_NAME_LENGTH,
  MAX_QUANTITY_LENGTH,
} from '../../constants/validation'
import type {
  EditInventoryInput,
  DiscardInput,
  RestoreInput,
  ReAddToGroceryInput,
  ChangeReasonInput,
} from '../../types/mutations'

describe('Shared Validation Constants', () => {
  it('MAX_NAME_LENGTH is 200', () => {
    expect(MAX_NAME_LENGTH).toBe(200)
  })

  it('MAX_QUANTITY_LENGTH is 50', () => {
    expect(MAX_QUANTITY_LENGTH).toBe(50)
  })
})

describe('Shared Mutation Types (compile-time checks)', () => {
  // These tests verify that the types are importable and structurally correct.
  // If any type is missing or has the wrong shape, TypeScript will fail at compile time.

  it('EditInventoryInput has the expected shape', () => {
    const input: EditInventoryInput = {
      itemId: 'test-id',
      householdId: 'test-household',
      updates: {
        name: 'Test Item',
        quantity: '2 lbs',
        expiration_date: '2026-06-01',
        location: 'fridge',
      },
    }
    expect(input.itemId).toBe('test-id')
    expect(input.updates.location).toBe('fridge')
  })

  it('DiscardInput has the expected shape', () => {
    const input: DiscardInput = {
      itemId: 'test-id',
      householdId: 'test-household',
      reason: 'consumed',
    }
    expect(input.reason).toBe('consumed')
  })

  it('RestoreInput has the expected shape', () => {
    const input: RestoreInput = {
      itemId: 'test-id',
      householdId: 'test-household',
    }
    expect(input.householdId).toBe('test-household')
  })

  it('ReAddToGroceryInput has the expected shape', () => {
    const input: ReAddToGroceryInput = {
      name: 'Milk',
      quantity: '1 gallon',
      categoryId: 'cat-id',
      destination: 'fridge',
      householdId: 'test-household',
      addedBy: 'user-id',
    }
    expect(input.destination).toBe('fridge')
  })

  it('ChangeReasonInput has the expected shape', () => {
    const input: ChangeReasonInput = {
      itemId: 'test-id',
      householdId: 'test-household',
      newReason: 'wasted',
    }
    expect(input.newReason).toBe('wasted')
  })
})
