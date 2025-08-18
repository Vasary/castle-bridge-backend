import { Injectable } from '@nestjs/common';

@Injectable()
export class MutexService {
  private locks: Map<string, Promise<void>> = new Map();

  async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Wait for any existing lock on this key
    const existingLock = this.locks.get(key);
    if (existingLock) {
      await existingLock;
    }

    // Create a new lock
    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    this.locks.set(key, lockPromise);

    try {
      // Execute the operation
      const result = await operation();
      return result;
    } finally {
      // Release the lock
      this.locks.delete(key);
      resolveLock!();
    }
  }

  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  clearAllLocks(): void {
    this.locks.clear();
  }
}
