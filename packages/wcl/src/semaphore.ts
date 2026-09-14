/**
 * Minimal counting semaphore used to cap concurrent API requests.
 *
 * Deliberately dependency-free: the only requirement is that at most N requests
 * are in flight, and that a rejected task still releases its slot.
 */
export class Semaphore {
  #available: number;
  readonly #waiting: (() => void)[] = [];

  constructor(permits: number) {
    if (!Number.isInteger(permits) || permits < 1) {
      throw new Error(`Semaphore needs at least 1 permit, got ${permits}.`);
    }
    this.#available = permits;
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.#acquire();
    try {
      return await task();
    } finally {
      this.#release();
    }
  }

  async #acquire(): Promise<void> {
    if (this.#available > 0) {
      this.#available -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.#waiting.push(resolve));
  }

  #release(): void {
    const next = this.#waiting.shift();
    // Hand the permit straight to the next waiter instead of returning it to
    // the pool, so a waiting task cannot be overtaken by a fresh caller.
    if (next) next();
    else this.#available += 1;
  }
}
