export class UnitId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('UnitId cannot be empty');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UnitId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
