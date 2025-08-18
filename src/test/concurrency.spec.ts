import { Test, TestingModule } from '@nestjs/testing';
import { MutexService } from '../shared/services/mutex.service';
import { PlayerAttackHandler } from '../application/handlers/player-attack.handler';
import { PlayerAttackCommand } from '../application/commands/player-attack.command';
import { CombatService } from '../domain/services/combat.service';
import { UnitFactoryService } from '../domain/services/unit-factory.service';
import { InMemoryGameRepository } from '../infrastructure/persistence/in-memory-game.repository';
import { Game } from '../domain/aggregates/game';
import { Unit, UnitType } from '../domain/entities/unit';
import { UnitId } from '../domain/value-objects/unit-id';
import { UnitName } from '../domain/value-objects/unit-name';
import { Avatar } from '../domain/value-objects/avatar';
import { Power } from '../domain/value-objects/power';
import { AttackSpeed } from '../domain/value-objects/attack-speed';
import { EventBus } from '@nestjs/cqrs';

describe('Concurrency Tests', () => {
  let mutexService: MutexService;
  let playerAttackHandler: PlayerAttackHandler;
  let combatService: CombatService;
  let gameRepository: InMemoryGameRepository;
  let unitFactory: UnitFactoryService;
  let eventBus: EventBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MutexService,
        CombatService,
        UnitFactoryService,
        InMemoryGameRepository,
        PlayerAttackHandler,
        {
          provide: 'GameRepository',
          useClass: InMemoryGameRepository,
        },
        {
          provide: EventBus,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    mutexService = module.get<MutexService>(MutexService);
    playerAttackHandler = module.get<PlayerAttackHandler>(PlayerAttackHandler);
    combatService = module.get<CombatService>(CombatService);
    gameRepository = module.get<InMemoryGameRepository>(InMemoryGameRepository);
    unitFactory = module.get<UnitFactoryService>(UnitFactoryService);
    eventBus = module.get<EventBus>(EventBus);
  });

  describe('MutexService', () => {
    it('should prevent concurrent execution of the same operation', async () => {
      const results: number[] = [];
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const operation = async (id: number) => {
        await delay(50); // Simulate async work
        results.push(id);
        return id;
      };

      // Start multiple operations with the same lock key
      const promises = [
        mutexService.withLock('test-key', () => operation(1)),
        mutexService.withLock('test-key', () => operation(2)),
        mutexService.withLock('test-key', () => operation(3)),
      ];

      await Promise.all(promises);

      // Results should be in order (serialized execution)
      expect(results).toEqual([1, 2, 3]);
    });

    it('should allow concurrent execution with different lock keys', async () => {
      const results: number[] = [];
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const operation = async (id: number) => {
        await delay(50);
        results.push(id);
        return id;
      };

      const startTime = Date.now();

      // Start operations with different lock keys
      const promises = [
        mutexService.withLock('key-1', () => operation(1)),
        mutexService.withLock('key-2', () => operation(2)),
        mutexService.withLock('key-3', () => operation(3)),
      ];

      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete in roughly 50ms (concurrent) rather than 150ms (serial)
      expect(endTime - startTime).toBeLessThan(100);
      expect(results).toHaveLength(3);
    });

    it('should handle errors in locked operations', async () => {
      const operation1 = async () => {
        throw new Error('Test error');
      };

      const operation2 = async () => {
        return 'success';
      };

      // First operation should fail
      await expect(
        mutexService.withLock('test-key', operation1)
      ).rejects.toThrow('Test error');

      // Second operation should still work (lock should be released)
      const result = await mutexService.withLock('test-key', operation2);
      expect(result).toBe('success');
    });
  });

  describe('Unit Attack Concurrency', () => {
    let hero: Unit;

    beforeEach(() => {
      hero = Unit.createHero(
        new UnitId('hero-1'),
        new UnitName('Test Hero'),
        new Avatar('🦸'),
        new Power(10),
        new AttackSpeed(1000) // 1 second cooldown
      );
    });

    it('should prevent double attacks within cooldown period', async () => {
      // First attack should succeed
      const damage1 = hero.attack();
      expect(damage1).toBeGreaterThan(0);

      // Immediate second attack should fail
      expect(() => hero.attack()).toThrow('must wait');

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Third attack should succeed
      const damage3 = hero.attack();
      expect(damage3).toBeGreaterThan(0);
    });

    it('should handle concurrent attack attempts atomically', async () => {
      const attackPromises = [];
      let successCount = 0;
      let errorCount = 0;

      // Try 10 concurrent attacks
      for (let i = 0; i < 10; i++) {
        const promise = new Promise<void>((resolve) => {
          try {
            hero.attack();
            successCount++;
          } catch (error) {
            errorCount++;
          }
          resolve();
        });
        attackPromises.push(promise);
      }

      await Promise.all(attackPromises);

      // Only one attack should succeed, others should fail
      expect(successCount).toBe(1);
      expect(errorCount).toBe(9);
    });
  });

  describe('Game Version Concurrency', () => {
    let game: Game;

    beforeEach(() => {
      const villains = unitFactory.createVillains();
      game = new Game(villains);
    });

    it('should detect concurrent modifications with version checking', () => {
      const initialVersion = game.getVersion();

      // Simulate concurrent modification
      game.start();

      // This should fail because version changed
      expect(() => {
        game.checkVersion(initialVersion);
      }).toThrow('Optimistic lock failure');
    });

    it('should increment version on state changes', () => {
      const initialVersion = game.getVersion();

      game.start();
      expect(game.getVersion()).toBe(initialVersion + 1);

      const hero = Unit.createHero(
        new UnitId('hero-1'),
        new UnitName('Test Hero'),
        new Avatar('🦸'),
        new Power(10),
        new AttackSpeed(1000)
      );

      game.addHero(hero);
      expect(game.getVersion()).toBe(initialVersion + 2);

      game.finish();
      expect(game.getVersion()).toBe(initialVersion + 3);
    });
  });

  describe('PlayerAttackHandler Concurrency', () => {
    let game: Game;
    let hero: Unit;

    beforeEach(async () => {
      // Set up game with hero and villains
      const villains = unitFactory.createVillains();
      game = new Game(villains);

      hero = Unit.createHero(
        new UnitId('player-1'),
        new UnitName('Test Hero'),
        new Avatar('🦸'),
        new Power(10),
        new AttackSpeed(500) // Short cooldown for testing
      );

      game.addHero(hero);
      game.start();
      await gameRepository.save(game);
    });

    it('should prevent concurrent attacks from same player', async () => {
      const command = new PlayerAttackCommand('player-1');

      // Start multiple concurrent attacks
      const attackPromises = [
        playerAttackHandler.execute(command).catch(e => ({ error: e.message })),
        playerAttackHandler.execute(command).catch(e => ({ error: e.message })),
        playerAttackHandler.execute(command).catch(e => ({ error: e.message })),
      ];

      const results = await Promise.all(attackPromises);

      // Count successful vs failed results
      const successful = results.filter(r => !r.error);
      const failed = results.filter(r => r.error);

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);

      // Failed attacks should be due to cooldown
      failed.forEach(result => {
        expect(result.error).toContain('must wait');
      });
    });

    it('should handle optimistic lock failures gracefully', async () => {
      const command = new PlayerAttackCommand('player-1');

      // Mock the game repository to return a game with checkVersion that throws
      const mockGame = Object.create(game);
      mockGame.checkVersion = jest.fn().mockImplementation(() => {
        throw new Error('Optimistic lock failure: expected version 1, but current version is 2');
      });

      jest.spyOn(gameRepository, 'findCurrent').mockResolvedValueOnce(mockGame);

      await expect(playerAttackHandler.execute(command))
        .rejects.toThrow('Attack failed due to concurrent modification');
    });
  });
});
