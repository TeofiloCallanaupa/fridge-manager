/**
 * Tests for formatting utilities.
 * TDD: These tests are written BEFORE the implementation.
 * All should FAIL initially (red phase).
 */
import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatQuantity } from '../formatting.js';

describe('formatRelativeTime', () => {
  function minutesAgo(minutes: number): Date {
    return new Date(Date.now() - minutes * 60 * 1000);
  }

  function hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  it('returns "just now" for <1 minute ago', () => {
    expect(formatRelativeTime(new Date())).toBe('just now');
  });

  it('returns "X minutes ago" for recent times', () => {
    expect(formatRelativeTime(minutesAgo(5))).toBe('5 minutes ago');
  });

  it('returns "1 minute ago" for singular', () => {
    expect(formatRelativeTime(minutesAgo(1))).toBe('1 minute ago');
  });

  it('returns "X hours ago" for hours', () => {
    expect(formatRelativeTime(hoursAgo(2))).toBe('2 hours ago');
  });

  it('returns "yesterday" for 1 day ago', () => {
    expect(formatRelativeTime(daysAgo(1))).toBe('yesterday');
  });

  it('returns "X days ago" for multiple days', () => {
    expect(formatRelativeTime(daysAgo(3))).toBe('3 days ago');
  });
});

describe('formatQuantity', () => {
  it('returns the quantity string as-is', () => {
    expect(formatQuantity('2 lbs')).toBe('2 lbs');
  });

  it('returns empty string for null', () => {
    expect(formatQuantity(null)).toBe('');
  });
});
