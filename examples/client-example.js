/**
 * Castle Bridge Backend - WebSocket Client Example
 *
 * This example demonstrates how to connect to the Castle Bridge game
 * and interact with the WebSocket API.
 *
 * To run this example:
 * 1. Start the Castle Bridge backend: npm run start:dev
 * 2. Install socket.io-client: npm install socket.io-client
 * 3. Run this file: node examples/client-example.js
 */

const { io } = require('socket.io-client');

// Connect to the Castle Bridge backend
// Change localhost to your server IP if running remotely
const socket = io('http://localhost:3000');

// Generate a unique player ID
const playerId = `player-${Math.random().toString(36).substring(2, 11)}`;
const playerName = `Hero${Math.floor(Math.random() * 1000)}`;

console.log(`🎮 Connecting as ${playerName} (${playerId})`);

let gameState = null;
let attackInterval = null;
let canAttack = true;
let nextAttackTime = null;

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to Castle Bridge backend');

  // Join the game with correct payload format
  socket.emit('player.join', {
    playerId: playerId,
    playerName: playerName
  });
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
  if (attackInterval) {
    clearInterval(attackInterval);
  }
});

// Game events
socket.on('player.joined', (data) => {
  console.log(`🦸 ${data.player.name} joined the game!`);
  gameState = data.gameState;

  // Start attacking after joining
  setTimeout(() => {
    console.log('⚔️ Starting to attack enemies...');
    startAttacking();
  }, 1000);
});

socket.on('game.state', (newGameState) => {
  gameState = newGameState;
  console.log('📊 Game State Update:');
  console.log(`  Status: ${gameState.status}`);
  console.log(`  Heroes: ${gameState.heroes.filter(h => h.isAlive).length}/${gameState.heroes.length} alive`);
  console.log(`  Villains: ${gameState.villains.filter(v => v.isAlive).length}/${gameState.villains.length} alive`);

  if (gameState.scores && gameState.scores.length > 0) {
    console.log(`  Current Scores:`);
    gameState.scores.forEach(score => {
      console.log(`    ${score.playerName}: ${score.score} points`);
    });
  }
});

socket.on('unit.attack', (attackData) => {
  const attacker = attackData.trigger;
  const target = attackData.target;
  const damage = attackData.attackPower;

  console.log(`💥 ${attacker.name} attacked ${target.name} for ${damage} damage!`);
  console.log(`   ${target.name} health: ${target.health.current}/${target.health.maximum}`);

  if (!target.isAlive) {
    console.log(`💀 ${target.name} has been defeated!`);
  }

  // Update next attack time if this was our attack
  if (attacker.id === playerId && attackData.nextAttackAvailable) {
    nextAttackTime = new Date(attackData.nextAttackAvailable);
    canAttack = false;

    const cooldownMs = nextAttackTime.getTime() - Date.now();
    console.log(`⏰ Next attack available in ${Math.ceil(cooldownMs / 1000)} seconds`);

    setTimeout(() => {
      canAttack = true;
      console.log('✅ Attack cooldown finished!');
    }, cooldownMs);
  }
});

socket.on('game.over', (data) => {
  console.log('🏁 Game Over!');
  console.log(`🏆 Winner: ${data.winner}`);
  console.log('🎯 Final Scores:');
  data.finalScores.forEach(score => {
    console.log(`  ${score.playerName}: ${score.score} points`);
  });

  if (data.statistics) {
    console.log('📈 Game Statistics:');
    console.log(`  Total Attacks: ${data.statistics.totalAttacks}`);
    console.log(`  Game Duration: ${Math.round(data.statistics.gameDuration / 1000)} seconds`);
    console.log(`  Heroes Alive: ${data.statistics.heroesAlive}`);
    console.log(`  Villains Alive: ${data.statistics.villainsAlive}`);
  }

  // Stop attacking
  if (attackInterval) {
    clearInterval(attackInterval);
    attackInterval = null;
  }
});

socket.on('game.restarted', (newGameState) => {
  console.log('🔄 Game has been restarted!');
  gameState = newGameState;
  canAttack = true;
  nextAttackTime = null;

  // Resume attacking after restart
  setTimeout(() => {
    startAttacking();
  }, 1000);
});

// Attack function with proper error handling
function performAttack() {
  if (!canAttack) {
    const timeLeft = nextAttackTime ? Math.ceil((nextAttackTime.getTime() - Date.now()) / 1000) : 0;
    console.log(`⏳ Still on cooldown, ${timeLeft} seconds remaining`);
    return;
  }

  if (!gameState || gameState.status !== 'active') {
    console.log('⚠️ Game is not active, cannot attack');
    return;
  }

  // Check if there are alive villains
  const aliveVillains = gameState.villains.filter(v => v.isAlive);
  if (aliveVillains.length === 0) {
    console.log('🎉 No villains left to attack!');
    return;
  }

  // Check if our hero is alive
  const ourHero = gameState.heroes.find(h => h.id === playerId);
  if (!ourHero || !ourHero.isAlive) {
    console.log('💀 Our hero is dead, cannot attack');
    return;
  }

  console.log('⚔️ Attempting to attack...');

  // Use callback to handle response
  socket.emit('player.attack', { playerId: playerId }, (response) => {
    if (response && response.error) {
      console.log(`❌ Attack failed: ${response.error}`);
    }
  });
}

function startAttacking() {
  if (attackInterval) {
    clearInterval(attackInterval);
  }

  // Attack every 2 seconds, but respect cooldowns
  attackInterval = setInterval(() => {
    performAttack();
  }, 2000);

  console.log('🗡️ Auto-attack started (every 2 seconds)');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  if (attackInterval) {
    clearInterval(attackInterval);
  }
  socket.disconnect();
  process.exit(0);
});

// Error handling
socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

console.log('🚀 Castle Bridge client started. Press Ctrl+C to exit.');
console.log('📝 This client will:');
console.log('   1. Connect to the game server');
console.log('   2. Join as a random hero');
console.log('   3. Start attacking villains automatically');
console.log('   4. Show real-time game updates');
console.log('   5. Handle cooldowns and errors gracefully');
