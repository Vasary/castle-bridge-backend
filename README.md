
# Castle Bridge Backend

A real-time multiplayer combat game backend built with **NestJS**, following **Domain-Driven Design (DDD)** and **Ports/Adapters (Hexagonal Architecture)** patterns.

## 🎮 Game Overview

Castle Bridge is a real-time multiplayer game where heroes battle against AI-controlled villains. Players can join the game, attack enemies, and compete for the highest scores while AI villains automatically fight back.

### Key Features
- 🚀 **Real-time multiplayer combat** - Players can join and attack enemies instantly
- 🤖 **AI opponents** - Automated villains that attack players periodically
- 🔄 **WebSocket communication** - Real-time updates for all connected clients
- 📊 **Game state management** - Persistent game state with scores and player tracking
- ⚡ **CQRS pattern** - Separate read and write operations for better scalability
- 🏗️ **Clean Architecture** - DDD with Ports/Adapters for maintainability

## 🏛️ Architecture

This project follows clean architecture principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   WebSocket     │ │   AI Adapter    │ │   Persistence   ││
│  │    Gateway      │ │                 │ │   Repository    ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   Commands &    │ │     Handlers    │ │      Ports      ││
│  │    Queries      │ │                 │ │  (Interfaces)   ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │    Entities     │ │ Value Objects   │ │   Aggregates    ││
│  │   (Unit, Score) │ │ (Health, Power) │ │     (Game)      ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 🏗️ Domain Layer (`src/domain/`)
- **Entities**: Core business objects with identity
  - `Unit` - Represents heroes and villains
  - `Score` - Combat result tracking
- **Value Objects**: Immutable domain concepts
  - `UnitId`, `Health`, `Power`, `Avatar`, `UnitName`
- **Aggregates**: Business rule enforcement
  - `Game` - Manages game state and business rules
- **Domain Services**: Complex business logic
  - `UnitFactoryService` - Creates units with proper rules
  - `CombatService` - Handles attack calculations
- **Domain Events**: Important business occurrences
  - `UnitAttackedEvent`, `GameFinishedEvent`
- **Repository Interfaces**: Data persistence contracts

### 🔧 Application Layer (`src/application/`)
- **Commands & Queries**: CQRS implementation
  - Commands: `PlayerJoinCommand`, `PlayerAttackCommand`, etc.
  - Queries: `GameStateQuery`
- **Handlers**: Orchestrate domain operations
  - Command handlers for write operations
  - Query handlers for read operations
- **Ports**: Interfaces for external dependencies
  - `WebSocketPort` - Real-time communication contract
  - `AiPort` - AI behavior contract

### 🔌 Infrastructure Layer (`src/infrastructure/`)
- **Adapters**: Port implementations
  - `WebSocketAdapter` - Socket.IO integration
  - `AiAdapter` - Automated AI behavior
- **Persistence**: Data storage
  - `InMemoryGameRepository` - Game state storage
- **WebSocket Gateway**: Real-time communication
  - `GameGateway` - Handles client connections and events
- **Event Handlers**: Side effect processing
  - Domain event handlers for WebSocket notifications

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd castle-bridge-backend

# Install dependencies
npm install
```

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The application will start on `http://0.0.0.0:3000` with WebSocket support, accessible from any network interface.

### 🌐 Network Configuration

The application listens on `0.0.0.0:3000` by default, making it accessible from:
- **Local development**: `http://localhost:3000`
- **Network access**: `http://[your-ip]:3000`
- **Docker/Container**: Accessible from host machine
- **Production deployment**: Ready for external access

On startup, the application will display all available network interfaces:
```
🚀 Castle Bridge Backend started successfully!
📡 Listening on 0.0.0.0:3000
🌐 Available network interfaces:
   ens3: http://192.168.1.100:3000 (IPv4)
   eth0: http://10.0.0.50:3000 (IPv4)
🎮 WebSocket server ready for game connections
📊 Game logging enabled - watch for player activity below
```

### 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port number for the HTTP server |

Example:
```bash
# Custom port
PORT=8080 npm run start:prod

# The app will run on http://0.0.0.0:8080
```

### 📊 Comprehensive Logging

The application provides detailed real-time logging of all game activities:

#### 🎮 Game Events
```
🦸 PLAYER JOINED: Aragorn (ID: hero-1) | Power: 8 | Heroes: 1 | Villains: 3/3
🎮 GAME STARTED: 2 heroes vs 3 villains | Battle begins!
🤖 AI STARTED: Villains will now attack heroes automatically every 1 second
```

#### ⚔️ Combat Logging
```
⚔️ HERO ATTACK: Aragorn ➤ Dark Lord | Damage: 12 | 100HP ➤ ❤️ 88HP
🤖 AI ATTACK: Shadow Warrior ➤ Legolas | Damage: 8 | 100HP ➤ ❤️ 92HP
⚔️ HERO ATTACK: Gimli ➤ Evil Sorcerer | Damage: 15 | 45HP ➤ 💀 KILLED
```

#### 🌐 Connection Events
```
🔌 CLIENT CONNECTED: abc123 | Total connections: 1
🚪 PLAYER LEFT: hero-2 (def456) | Remaining connections: 2
```

#### 🏁 Game State Changes
```
🏁 GAME OVER: Heroes: 0 | Villains: 2 | Total Scores: 15
🔄 GAME RESTARTED: New battle with 4 fresh villains | All heroes and villains reset to full health
```

### 🧪 Testing Logging

To see the logging in action, run the test script:
```bash
# Start the server
npm run start:prod

# In another terminal, run the logging test
node test-logging.js
```

This will simulate multiple players joining, attacking, and demonstrate all logging features.

### 🧪 Testing

```bash
# Run integration tests
npm run test:integration

# Run all tests
npm run test

# Test with coverage
npm run test:cov

# Watch mode for development
npm run test:watch
```

### 🔧 Development

```bash
# Build the application
npm run build

# Lint and fix code
npm run lint

# Format code
npm run format
```

## 🎯 API Endpoints

### WebSocket Events

The game uses WebSocket for real-time communication. Connect to the WebSocket server and use these events:

#### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `player.join` | `{id: string, nickname: string}` | Join the game as a hero |
| `unit.attack` | - | Attack a random villain |
| `game.restart` | - | Restart the game |

#### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `game.state` | `GameState` | Current game state |
| `unit.attack` | `AttackData` | Attack result details |
| `game.over` | `Scores` | Game ended with final scores |
| `game.restarted` | `GameState` | Game has been restarted |
| `player.join` | `Unit` | Player successfully joined |

### Example Usage

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000');

// Join the game
socket.emit('player.join', JSON.stringify({
  id: 'player-123',
  nickname: 'Hero1'
}));

// Attack enemies
socket.emit('unit.attack');

// Listen for game updates
socket.on('game.state', (gameState) => {
  console.log('Game state updated:', gameState);
});

socket.on('unit.attack', (attackData) => {
  console.log('Attack occurred:', attackData);
});
```

## 📁 Project Structure

```
castle-bridge-backend/
├── src/
│   ├── domain/                    # 🏛️ Domain Layer
│   │   ├── aggregates/           # Business rule enforcement
│   │   │   └── game.ts           # Game aggregate
│   │   ├── entities/             # Core business objects
│   │   │   ├── unit.ts           # Hero/Villain entity
│   │   │   └── score.ts          # Combat score entity
│   │   ├── value-objects/        # Immutable domain concepts
│   │   │   ├── unit-id.ts        # Unit identifier
│   │   │   ├── health.ts         # Health value object
│   │   │   ├── power.ts          # Attack power
│   │   │   ├── avatar.ts         # Unit avatar
│   │   │   └── unit-name.ts      # Unit name
│   │   ├── services/             # Domain services
│   │   │   ├── unit-factory.service.ts
│   │   │   └── combat.service.ts
│   │   ├── events/               # Domain events
│   │   │   ├── unit-attacked.event.ts
│   │   │   └── game-finished.event.ts
│   │   ├── repositories/         # Repository interfaces
│   │   │   └── game.repository.ts
│   │   └── domain.module.ts
│   │
│   ├── application/              # 🔧 Application Layer
│   │   ├── commands/             # Write operations
│   │   │   ├── player-join.command.ts
│   │   │   ├── player-attack.command.ts
│   │   │   └── ...
│   │   ├── queries/              # Read operations
│   │   │   └── game-state.query.ts
│   │   ├── handlers/             # Command/Query handlers
│   │   │   ├── player-join.handler.ts
│   │   │   ├── player-attack.handler.ts
│   │   │   └── ...
│   │   ├── ports/                # External dependency interfaces
│   │   │   ├── websocket.port.ts
│   │   │   └── ai.port.ts
│   │   └── application.module.ts
│   │
│   ├── infrastructure/           # 🔌 Infrastructure Layer
│   │   ├── websocket/            # WebSocket implementation
│   │   │   ├── game.gateway.ts   # WebSocket gateway
│   │   │   ├── websocket.adapter.ts
│   │   │   └── event-handlers.ts # Domain event handlers
│   │   ├── ai/                   # AI implementation
│   │   │   └── ai.adapter.ts     # AI behavior adapter
│   │   ├── persistence/          # Data storage
│   │   │   └── in-memory-game.repository.ts
│   │   └── infrastructure.module.ts
│   │
│   ├── shared/                   # 📤 Shared contracts
│   │   ├── contracts/            # Interface definitions
│   │   └── dto/                  # Data transfer objects
│   │
│   ├── test/                     # 🧪 Integration tests
│   │   └── game.integration.spec.ts
│   │
│   ├── app.module.ts             # Main application module
│   └── main.ts                   # Application entry point
│
├── test/                         # Test configuration
├── package.json                  # Project configuration
├── README.md                     # This file
└── [config files]               # TypeScript, NestJS configs
```

## 🛠️ Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) - Progressive Node.js framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Architecture**: Domain-Driven Design (DDD) + Hexagonal Architecture
- **Patterns**: CQRS (Command Query Responsibility Segregation)
- **Real-time**: [Socket.IO](https://socket.io/) - WebSocket communication
- **Testing**: [Jest](https://jestjs.io/) - JavaScript testing framework
- **Code Quality**: ESLint + Prettier

## 🏗️ Design Patterns Used

- **Domain-Driven Design (DDD)**: Business logic encapsulation
- **Hexagonal Architecture**: Ports and Adapters pattern
- **CQRS**: Command Query Responsibility Segregation
- **Event-Driven Architecture**: Domain events for loose coupling
- **Factory Pattern**: Unit creation with business rules
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Loose coupling and testability

## 🔄 Game Flow

1. **Player Joins**: Client connects via WebSocket and joins with nickname
2. **Game Starts**: First player joining triggers game start
3. **Combat Phase**: Players can attack villains, AI attacks back automatically
4. **Real-time Updates**: All clients receive immediate game state updates
5. **Game Over**: When all heroes or villains are defeated
6. **Restart**: Players can restart for a new round

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is [MIT licensed](LICENSE).

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Inspired by Domain-Driven Design principles
- Real-time communication powered by Socket.IO
