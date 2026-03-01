/**
 * Tracks tool invocation count as a proxy for token budget.
 * The budget value represents max invocations per session; -1 means unlimited.
 */
export class BudgetTracker {
  private _used = 0;
  private readonly _budget: number;

  constructor(budget: number) {
    this._budget = budget;
  }

  /** Returns false if consuming would exceed the budget. On success, increments the counter. */
  consume(amount = 1): boolean {
    if (this._budget === -1) {
      this._used += amount;
      return true;
    }
    if (this._used + amount > this._budget) return false;
    this._used += amount;
    return true;
  }

  remaining(): number {
    if (this._budget === -1) return Infinity;
    return Math.max(0, this._budget - this._used);
  }

  used(): number {
    return this._used;
  }

  isUnlimited(): boolean {
    return this._budget === -1;
  }
}
