import { describe, it, expect } from 'vitest';
import { BudgetTracker } from '../../../src/lib/budget/tracker.js';

describe('BudgetTracker', () => {
  it('allows consumption within budget', () => {
    const tracker = new BudgetTracker(5);
    expect(tracker.consume()).toBe(true);
    expect(tracker.consume()).toBe(true);
    expect(tracker.used()).toBe(2);
    expect(tracker.remaining()).toBe(3);
  });

  it('denies consumption when budget is exhausted', () => {
    const tracker = new BudgetTracker(2);
    expect(tracker.consume()).toBe(true);
    expect(tracker.consume()).toBe(true);
    expect(tracker.consume()).toBe(false);
    expect(tracker.used()).toBe(2);
    expect(tracker.remaining()).toBe(0);
  });

  it('supports custom consumption amounts', () => {
    const tracker = new BudgetTracker(10);
    expect(tracker.consume(5)).toBe(true);
    expect(tracker.remaining()).toBe(5);
    expect(tracker.consume(6)).toBe(false);
    expect(tracker.used()).toBe(5);
  });

  it('handles unlimited budget (-1)', () => {
    const tracker = new BudgetTracker(-1);
    expect(tracker.isUnlimited()).toBe(true);
    expect(tracker.remaining()).toBe(Infinity);
    for (let i = 0; i < 1000; i++) tracker.consume();
    expect(tracker.used()).toBe(1000);
    expect(tracker.remaining()).toBe(Infinity);
  });

  it('reports isUnlimited correctly', () => {
    expect(new BudgetTracker(-1).isUnlimited()).toBe(true);
    expect(new BudgetTracker(100).isUnlimited()).toBe(false);
    expect(new BudgetTracker(0).isUnlimited()).toBe(false);
  });

  it('handles zero budget', () => {
    const tracker = new BudgetTracker(0);
    expect(tracker.remaining()).toBe(0);
    expect(tracker.consume()).toBe(false);
    expect(tracker.used()).toBe(0);
  });
});
