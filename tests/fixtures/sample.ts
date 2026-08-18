/**
 * Adds two numbers together.
 *
 * @param a - The first addend.
 * @param b - The second addend.
 * @returns The sum of both inputs.
 */
export function add(a: number, b: number): number {
  return a + b;
}

/** A minimal counter used by the analyzer tests. */
export class Counter {
  private value = 0;

  /** Increment the counter and return the new value. */
  increment(by = 1): number {
    this.value += by;
    return this.value;
  }
}
