import { AttackSpeed } from '../domain/value-objects/attack-speed';
import { Unit, UnitType } from '../domain/entities/unit';
import { UnitId } from '../domain/value-objects/unit-id';
import { UnitName } from '../domain/value-objects/unit-name';
import { Avatar } from '../domain/value-objects/avatar';
import { Power } from '../domain/value-objects/power';
import { Health } from '../domain/value-objects/health';

describe('AttackSpeed Feature', () => {
  describe('AttackSpeed Value Object', () => {
    it('should create attack speed with valid cooldown', () => {
      const attackSpeed = new AttackSpeed(1000);
      expect(attackSpeed.getCooldownMs()).toBe(1000);
      expect(attackSpeed.getCooldownSeconds()).toBe(1);
    });

    it('should throw error for invalid cooldown values', () => {
      expect(() => new AttackSpeed(100)).toThrow(); // Too low
      expect(() => new AttackSpeed(10000)).toThrow(); // Too high
    });

    it('should create random attack speeds within range', () => {
      const attackSpeed = AttackSpeed.createRandom(1000, 2000);
      expect(attackSpeed.getCooldownMs()).toBeGreaterThanOrEqual(1000);
      expect(attackSpeed.getCooldownMs()).toBeLessThanOrEqual(2000);
    });
  });

  describe('Unit Attack Cooldown', () => {
    let hero: Unit;
    let originalMathRandom: () => number;

    beforeEach(() => {
      // Mock Math.random to ensure consistent damage > 0
      originalMathRandom = Math.random;
      Math.random = jest.fn(() => 0.5); // This will give damage = power * 1 = power

      hero = Unit.createHero(
        new UnitId('test-hero'),
        new UnitName('Test Hero'),
        Avatar.createRandom(),
        new Power(10), // Fixed power value for predictable damage
        new AttackSpeed(1000) // 1 second cooldown
      );
    });

    afterEach(() => {
      // Restore original Math.random
      Math.random = originalMathRandom;
    });

    it('should allow attack initially', () => {
      expect(hero.canAttack()).toBe(true);
      expect(hero.getTimeUntilNextAttack()).toBe(0);
    });

    it('should prevent immediate second attack', () => {
      // First attack should work
      const damage1 = hero.attack();
      expect(damage1).toBeGreaterThan(0);
      expect(hero.canAttack()).toBe(false);
      expect(hero.getTimeUntilNextAttack()).toBeGreaterThan(0);

      // Second attack should fail
      expect(() => hero.attack()).toThrow('Unit must wait');
    });

    it('should allow attack after cooldown period', async () => {
      // First attack
      hero.attack();
      expect(hero.canAttack()).toBe(false);

      // Wait for cooldown (simulate time passing)
      const originalDate = global.Date;
      const mockDate = new Date();
      mockDate.setTime(mockDate.getTime() + 1100); // 1.1 seconds later

      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      expect(hero.canAttack()).toBe(true);
      expect(hero.getTimeUntilNextAttack()).toBe(0);

      // Second attack should work
      const damage2 = hero.attack();
      expect(damage2).toBeGreaterThan(0);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Unit Serialization', () => {
    it('should include attack speed info in toPlainObject', () => {
      const hero = Unit.createHero(
        new UnitId('test-hero'),
        new UnitName('Test Hero'),
        Avatar.createRandom(),
        Power.createRandom(),
        new AttackSpeed(1500)
      );

      const plainObject = hero.toPlainObject();
      expect(plainObject.attackSpeed).toBe(1500);
      expect(plainObject.canAttack).toBe(true);
      expect(plainObject.timeUntilNextAttack).toBe(0);
    });
  });
});
