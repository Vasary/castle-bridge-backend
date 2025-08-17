export class Avatar {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Avatar cannot be empty');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Avatar): boolean {
    return this.value === other.value;
  }

  static createRandom(): Avatar {
    const avatarNumber = Math.floor(Math.random() * 6) + 1;
    return new Avatar(`${avatarNumber}.png`);
  }
}
