# Reloading Speed Feature Implementation

## Overview
Successfully implemented a reloading speed attribute for heroes and villains in the Castle Bridge game. This feature adds strategic timing to combat by preventing spam attacks and creating cooldown periods between attacks.

## Files Modified

### New Files Created
- `src/domain/value-objects/attack-speed.ts` - New value object for attack cooldown management
- `src/test/attack-speed.spec.ts` - Comprehensive tests for the new feature

### Modified Files
1. **`src/domain/entities/unit.ts`**
   - Added `attackSpeed` property and `lastAttackTime` tracking
   - New methods: `canAttack()`, `getTimeUntilNextAttack()`, `getAttackSpeed()`
   - Enhanced `attack()` method with cooldown validation
   - Updated factory methods to require AttackSpeed parameter
   - Enhanced serialization to include attack timing info

2. **`src/domain/services/unit-factory.service.ts`**
   - Updated `createHero()` and `createVillain()` to include AttackSpeed
   - Heroes: 0.8-2.0 second cooldowns
   - Villains: 1.2-3.0 second cooldowns (slightly slower)
   - Added specialized unit creation methods: `createFastHero()`, `createTankHero()`

3. **`src/domain/services/combat.service.ts`**
   - Enhanced `executeAttack()` with cooldown validation
   - Added `wasBlocked` property to AttackResult interface
   - New utility methods: `canExecuteAttack()`, `getAttackCooldownInfo()`

4. **`src/application/handlers/player-attack.handler.ts`**
   - Added cooldown validation before attack execution
   - Enhanced error handling for cooldown violations
   - Improved logging with cooldown information
   - Added `nextAttackAvailable` timestamp to response

5. **`src/infrastructure/ai/ai.adapter.ts`**
   - Optimized from 1-second intervals to 200ms checks
   - Smart villain selection - only attacks when off cooldown
   - Enhanced logging with attack timing information
   - Proper cleanup with interval management

6. **`src/shared/dto/attack.result.dto.ts`**
   - Added `nextAttackAvailable` timestamp field

7. **`src/shared/contracts/attack-data.ts`**
   - Improved type safety by replacing `any` types
   - Added attack speed and timing information to unit data
   - Added `nextAttackAvailable` field

## Feature Benefits

### Gameplay Improvements
- **Strategic Timing**: Players must time their attacks strategically
- **Prevents Spam**: No more mindless clicking for attacks
- **Unit Variety**: Different unit types with varying attack speeds
- **Tactical Depth**: Fast/weak vs slow/strong unit balance

### Technical Improvements
- **Reduced Server Load**: Invalid attack attempts are blocked early
- **Better AI Behavior**: AI only attacks when ready, more realistic
- **Enhanced Logging**: Detailed attack timing information
- **Type Safety**: Replaced `any` types with proper interfaces

### Performance Optimizations
- **Smart AI Processing**: 200ms checks but only acts when units are ready
- **Early Validation**: Cooldown checks prevent unnecessary processing
- **Memory Efficiency**: Proper cleanup of intervals and timers

## Attack Speed Configuration

### Default Ranges
- **Heroes**: 800ms - 2000ms (0.8 - 2.0 seconds)
- **Villains**: 1200ms - 3000ms (1.2 - 3.0 seconds)

### Specialized Unit Types
- **Fast Hero**: 800ms cooldown, 3-8 power (low damage, high speed)
- **Tank Hero**: 2500ms cooldown, 8-15 power (high damage, low speed)

### Validation
- **Minimum**: 500ms (0.5 seconds)
- **Maximum**: 5000ms (5.0 seconds)

## API Changes

### WebSocket Response Enhancement
```typescript
{
  gameState: GameState,
  attackData: {
    trigger: UnitData,
    target: UnitData,
    attackPower: number,
    nextAttackAvailable: string // ISO timestamp
  }
}
```

### Unit Serialization
```typescript
{
  id: string,
  title: string,
  avatar: string,
  power: number,
  attackSpeed: number, // milliseconds
  health: number,
  type: string,
  canAttack: boolean,
  timeUntilNextAttack: number // milliseconds
}
```

## Testing
- Comprehensive test suite with 7 test cases
- All tests passing ✅
- Covers value object validation, cooldown mechanics, and serialization
- Mocked time and randomness for consistent results

## Build Status
- TypeScript compilation: ✅ Success
- All tests: ✅ Passing (7/7)
- No breaking changes to existing API

## Next Steps
This feature is ready for deployment and provides a solid foundation for future enhancements such as:
- Equipment that modifies attack speed
- Special abilities with different cooldowns
- Attack speed buffs/debuffs
- Unit progression systems
