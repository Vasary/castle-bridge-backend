# Castle Bridge Game - Client Integration Guide

## Overview

Castle Bridge is a real-time multiplayer battle game where heroes fight against AI-controlled villains. The game uses WebSocket connections for real-time communication between the server and clients.

## Game Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   Game Client   │ ◄──────────────► │  Castle Bridge  │
│                 │                  │     Server      │
└─────────────────┘                  └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │   Game Engine   │
                                     │                 │
                                     │ • Heroes        │
                                     │ • Villains      │
                                     │ • Combat System │
                                     │ • AI Controller │
                                     └─────────────────┘
```

## Game Flow

### 1. Connection Phase
1. Client connects to WebSocket server
2. Server acknowledges connection
3. Client receives current game state
4. Player can join as a hero

### 2. Game Initialization
1. Player sends join request with hero details
2. Server validates and adds hero to game
3. Game starts automatically when first hero joins
4. AI begins controlling villains

### 3. Combat Phase
1. Players can attack villains (with cooldown restrictions)
2. AI villains attack heroes automatically
3. Real-time updates sent to all connected clients
4. Game continues until all heroes or villains are defeated

### 4. Game End
1. Game ends when one side is completely defeated
2. Final scores and statistics are broadcast
3. Game can be restarted for new round

## WebSocket Events

### Client → Server Events

#### `player.join`
Join the game as a hero.

**Payload:**
```typescript
{
  playerId: string;    // Unique player identifier
  playerName: string;  // Display name for the hero
}
```

**Example:**
```javascript
socket.emit('player.join', {
  playerId: 'player-123',
  playerName: 'DragonSlayer'
});
```

#### `player.attack`
Attack a random villain (server selects target).

**Payload:**
```typescript
{
  playerId: string;    // Must match the joined player ID
}
```

**Example:**
```javascript
socket.emit('player.attack', {
  playerId: 'player-123'
});
```

### Server → Client Events

#### `game.state`
Complete game state update (sent on connection and major changes).

**Payload:**
```typescript
{
  id: string;
  status: 'waiting' | 'active' | 'finished';
  heroes: Array<{
    id: string;
    name: string;
    avatar: string;
    health: {
      current: number;
      maximum: number;
    };
    power: {
      min: number;
      max: number;
    };
    attackSpeed: {
      cooldownMs: number;
    };
    isAlive: boolean;
    lastAttackTime: string; // ISO timestamp
  }>;
  villains: Array<{
    id: string;
    name: string;
    avatar: string;
    health: {
      current: number;
      maximum: number;
    };
    power: {
      min: number;
      max: number;
    };
    attackSpeed: {
      cooldownMs: number;
    };
    isAlive: boolean;
    lastAttackTime: string; // ISO timestamp
  }>;
  scores: Array<{
    playerId: string;
    playerName: string;
    score: number;
    timestamp: string; // ISO timestamp
  }>;
  version: number; // For optimistic locking
}
```

#### `unit.attack`
Real-time attack event notification.

**Payload:**
```typescript
{
  target: {
    id: string;
    name: string;
    avatar: string;
    health: {
      current: number;
      maximum: number;
    };
    isAlive: boolean;
  };
  trigger: {
    id: string;
    name: string;
    avatar: string;
    health: {
      current: number;
      maximum: number;
    };
    isAlive: boolean;
  };
  attackPower: number;
  nextAttackAvailable?: string; // ISO timestamp (only for player attacks)
}
```

#### `player.joined`
Notification when a new player joins the game.

**Payload:**
```typescript
{
  player: {
    id: string;
    name: string;
    avatar: string;
    health: {
      current: number;
      maximum: number;
    };
    power: {
      min: number;
      max: number;
    };
    attackSpeed: {
      cooldownMs: number;
    };
    isAlive: boolean;
  };
  gameState: {
    // Full game state object (same as game.state)
  };
}
```

#### `game.over`
Game end notification with final results.

**Payload:**
```typescript
{
  winner: 'heroes' | 'villains';
  finalScores: Array<{
    playerId: string;
    playerName: string;
    score: number;
    timestamp: string;
  }>;
  statistics: {
    totalAttacks: number;
    gameDuration: number; // milliseconds
    heroesAlive: number;
    villainsAlive: number;
  };
}
```

#### `game.restarted`
Notification that a new game has started.

**Payload:**
```typescript
{
  // Full game state object (same as game.state)
}
```

## Error Handling

### Attack Errors
When a player attack fails, the server responds with an error object instead of success:

```typescript
{
  error: string; // Error message
}
```

**Common Error Messages:**
- `"Hero must wait X.X seconds before next attack"`
- `"Hero not found"`
- `"No active game found"`
- `"Attack failed due to concurrent modification. Please try again."`

## Client Implementation Example

### Basic WebSocket Client

```javascript
class CastleBridgeClient {
  constructor(serverUrl) {
    this.socket = io(serverUrl);
    this.playerId = null;
    this.gameState = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Receive game state updates
    this.socket.on('game.state', (gameState) => {
      this.gameState = gameState;
      this.onGameStateUpdate(gameState);
    });

    // Receive attack notifications
    this.socket.on('unit.attack', (attackData) => {
      this.onAttackEvent(attackData);
    });

    // Receive player join notifications
    this.socket.on('player.joined', (data) => {
      this.onPlayerJoined(data);
    });

    // Receive game over notifications
    this.socket.on('game.over', (data) => {
      this.onGameOver(data);
    });

    // Handle connection events
    this.socket.on('connect', () => {
      console.log('Connected to Castle Bridge server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  // Join the game as a hero
  joinGame(playerId, playerName) {
    this.playerId = playerId;
    this.socket.emit('player.join', {
      playerId,
      playerName
    });
  }

  // Attack a villain
  async attack() {
    if (!this.playerId) {
      throw new Error('Must join game first');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('player.attack', {
        playerId: this.playerId
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Event handlers (implement these in your UI)
  onGameStateUpdate(gameState) {
    // Update your game UI with new state
    console.log('Game state updated:', gameState);
  }

  onAttackEvent(attackData) {
    // Show attack animation/effects
    console.log('Attack event:', attackData);
  }

  onPlayerJoined(data) {
    // Show new player notification
    console.log('Player joined:', data.player.name);
  }

  onGameOver(data) {
    // Show game over screen with results
    console.log('Game over:', data);
  }
}
```

### Usage Example

```javascript
// Initialize client
const client = new CastleBridgeClient('ws://localhost:3000');

// Join game
client.joinGame('player-123', 'DragonSlayer');

// Attack (with error handling)
document.getElementById('attackButton').addEventListener('click', async () => {
  try {
    const result = await client.attack();
    console.log('Attack successful:', result);
  } catch (error) {
    console.error('Attack failed:', error.message);
    // Show cooldown timer or error message to user
  }
});
```

## Game Rules & Mechanics

### Hero Creation
- Each hero has randomized stats (health, power, attack speed)
- Heroes can be specialized types: Fast (low power, fast attacks) or Tank (high power, slow attacks)
- Attack speed determines cooldown between attacks (800ms - 2000ms for heroes)

### Villain Behavior
- Villains are AI-controlled with automatic attacks
- Slower attack speed than heroes (1200ms - 3000ms)
- Villains attack random alive heroes
- AI respects cooldown rules just like players

### Combat System
- Damage is calculated randomly within power range
- Units die when health reaches 0
- Dead units cannot attack or be attacked
- Attack cooldowns are enforced server-side

### Scoring
- Players earn points for dealing damage
- Bonus points for killing villains
- Scores are tracked per player throughout the game

### Game End Conditions
- **Heroes Win:** All villains are defeated
- **Villains Win:** All heroes are defeated
- Game automatically restarts after completion

## Technical Considerations

### Connection Management
- Server limits concurrent connections (default: 1000)
- Stale connections are cleaned up automatically
- Clients should handle reconnection logic

### Concurrency & Race Conditions
- Server uses mutex locks to prevent concurrent attacks from same player
- Optimistic locking prevents conflicting game state modifications
- Attack cooldowns are enforced atomically

### Performance
- Game state updates are sent efficiently
- Only attack events are broadcast in real-time
- Memory leaks are prevented with proper cleanup

### Error Recovery
- Clients should implement retry logic for failed attacks
- Handle network disconnections gracefully
- Display appropriate error messages to users

## Development Tips

1. **Always handle errors** - Attack requests can fail due to cooldowns or game state
2. **Implement cooldown UI** - Show users when they can attack next
3. **Cache game state** - Don't rely on constant server updates
4. **Handle reconnections** - Implement automatic reconnection with exponential backoff
5. **Validate user input** - Check player ID format and game state before actions
6. **Show real-time feedback** - Use attack events to create engaging combat animations

## Testing Your Client

1. Connect multiple clients to test multiplayer functionality
2. Test attack cooldown enforcement
3. Verify proper handling of game over scenarios
4. Test reconnection after network interruption
5. Validate error handling for invalid requests

This documentation should provide everything needed to build a compatible game client for the Castle Bridge backend.
