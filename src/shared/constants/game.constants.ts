export const GAME_CONSTANTS = {
  // AI Configuration
  AI_ACTION_INTERVAL_MS: 200,

  // WebSocket Configuration
  MAX_CLIENT_CONNECTIONS: 1000,
  STALE_CONNECTION_CLEANUP_INTERVAL_MS: 60000, // 1 minute

  // Attack Configuration
  ATTACK_COOLDOWN_CHECK_PRECISION_MS: 1000, // For display purposes

  // Mutex Lock Keys
  MUTEX_KEYS: {
    AI_ATTACK: 'ai-attack',
    PLAYER_ATTACK_PREFIX: 'player-attack-',
  },

  // Error Messages
  ERRORS: {
    NO_ACTIVE_GAME: 'No active game found',
    HERO_NOT_FOUND: 'Hero not found',
    ATTACK_CONCURRENT_MODIFICATION: 'Attack failed due to concurrent modification. Please try again.',
    OPTIMISTIC_LOCK_FAILURE_PREFIX: 'Optimistic lock failure:',
    DEAD_UNITS_CANNOT_ATTACK: 'Dead units cannot attack',
    CANNOT_ATTACK_DEAD_UNITS: 'Cannot attack dead units',
    NO_ALIVE_HEROES: 'No alive heroes available',
    NO_ALIVE_VILLAINS: 'No alive villains available',
    GAME_ALREADY_STARTED: 'Game has already been started',
    ONLY_HEROES_CAN_BE_ADDED: 'Only heroes can be added as heroes',
  },

  // Log Messages
  LOGS: {
    AI_STARTED: '🤖 AI STARTED: Villains will attack when their cooldowns allow',
    AI_STOPPED: '🤖 AI STOPPED: Villains will no longer attack automatically',
    CLIENT_CONNECTED: '🔌 CLIENT CONNECTED',
    CLIENT_DISCONNECTED: '🔌 CLIENT DISCONNECTED',
    PLAYER_LEFT: '🚪 PLAYER LEFT',
    HERO_ATTACK: '⚔️ HERO ATTACK',
    AI_ATTACK: '🤖 AI ATTACK',
    GAME_OVER: '🏁 GAME OVER',
    STALE_CONNECTIONS_CLEANED: '🧹 Cleaned up',
  },

  // Unit Factory Configuration
  UNIT_FACTORY: {
    HERO_ATTACK_SPEED_MIN: 800,
    HERO_ATTACK_SPEED_MAX: 2000,
    VILLAIN_ATTACK_SPEED_MIN: 1200,
    VILLAIN_ATTACK_SPEED_MAX: 3000,
    FAST_HERO_POWER_MIN: 3,
    FAST_HERO_POWER_MAX: 8,
    TANK_HERO_POWER_MIN: 8,
    TANK_HERO_POWER_MAX: 15,
    DEFAULT_VILLAIN_COUNT_MIN: 2,
    DEFAULT_VILLAIN_COUNT_MAX: 5,
    VILLAIN_NAMES: [
      'Antharas', 'Valakas', 'Baium', 'Zaken', 'Orfen',
      'Core', 'Queen Ant', 'Beleth', 'Frintezza', 'Sailren',
      'Lindvior', 'Tiat', 'Ekimus', 'Tauti', 'Octavis',
      'Istina', 'Balok', 'Trasken', 'Baylor', 'Helios',
      'Kelbim', 'Spezion', 'Embryo', 'Ramona', 'Anakim'
    ] as const
  } as const,
} as const;

export type GameConstants = typeof GAME_CONSTANTS;
