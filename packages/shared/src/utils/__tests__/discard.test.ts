import { describe, it, expect } from 'vitest';
import { getOppositeReason, getDiscardReasonLabel } from '../../utils/discard';

describe('getOppositeReason', () => {
  it('returns "wasted" for consumed items', () => {
    const result = getOppositeReason('consumed');
    expect(result.newReason).toBe('wasted');
    expect(result.label).toBe('Change to Tossed');
  });

  it('returns "consumed" for wasted items', () => {
    const result = getOppositeReason('wasted');
    expect(result.newReason).toBe('consumed');
    expect(result.label).toBe('Change to Used');
  });

  it('returns "consumed" for expired items', () => {
    const result = getOppositeReason('expired');
    expect(result.newReason).toBe('consumed');
    expect(result.label).toBe('Change to Used');
  });

  it('returns "consumed" for null reason', () => {
    const result = getOppositeReason(null);
    expect(result.newReason).toBe('consumed');
    expect(result.label).toBe('Change to Used');
  });
});

describe('getDiscardReasonLabel', () => {
  it('returns "Used" for consumed', () => {
    expect(getDiscardReasonLabel('consumed')).toBe('Used');
  });

  it('returns "Wasted" for wasted', () => {
    expect(getDiscardReasonLabel('wasted')).toBe('Wasted');
  });

  it('returns "Expired" for expired', () => {
    expect(getDiscardReasonLabel('expired')).toBe('Expired');
  });

  it('returns "Removed" for null', () => {
    expect(getDiscardReasonLabel(null)).toBe('Removed');
  });
});
