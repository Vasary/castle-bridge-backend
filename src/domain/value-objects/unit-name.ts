export class UnitName {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Unit name cannot be empty');
    }
    if (value.length > 50) {
      throw new Error('Unit name cannot exceed 50 characters');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UnitName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
