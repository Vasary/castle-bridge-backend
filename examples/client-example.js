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
const socket = io('http://localhost:3000');

// Generate a unique player ID
const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
const playerName = `Hero${Math.floor(Math.random() * 1000)}`;

console.log(`🎮 Connecting as ${playerName} (${playerId})`);

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to Castle Bridge backend');
  
  // Join the game
  socket.emit('player.join', JSON.stringify({
    id: playerId,
    nickname: playerName
  }));
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

// Game events
socket.on('player.join', (player) => {
  console.log(`🦸 ${playerName} joined the game!`, player);
  
  // Start attacking after joining
  setTimeout(() => {
    console.log('⚔️ Starting to attack enemies...');
    attackEnemies();
  }, 1000);
});

socket.on('game.state', (gameState) => {
  console.log('📊 Game State Update:');
  console.log(`  Heroes: ${gameState.heroes.length} alive`);
  console.log(`  Villains: ${gameState.villains.filter(v => v.health > 0).length} alive`);
  console.log(`  Game Started: ${gameState.isStarted}`);
  console.log(`  Game Over: ${gameState.isOver}`);
  
  if (gameState.isOver) {
    console.log('🏁 Game Over! Final scores:', gameState.scores);
    
    // Restart the game after 3 seconds
    setTimeout(() => {
      console.log('🔄 Restarting game...');
      socket.emit('game.restart');
    }, 3000);
  }
});

socket.on('unit.attack', (attackData) => {
  const attacker = attackData.trigger;
  const target = attackData.target;
  const damage = attackData.attackPower;
  
  console.log(`💥 ${attacker.title} attacked ${target.title} for ${damage} damage!`);
  console.log(`   ${target.title} health: ${target.health}`);
  
  if (target.health === 0) {
    console.log(`💀 ${target.title} has been defeated!`);
  }
});

socket.on('game.over', (scores) => {
  console.log('🎯 Final Scores:', scores);
});

socket.on('game.restarted', (gameState) => {
  console.log('🔄 Game has been restarted!');
  
  // Resume attacking after restart
  setTimeout(() => {
    attackEnemies();
  }, 1000);
});

// Attack function
function attackEnemies() {
  const attackInterval = setInterval(() => {
    socket.emit('unit.attack');
  }, 2000); // Attack every 2 seconds
  
  // Stop attacking after 30 seconds
  setTimeout(() => {
    clearInterval(attackInterval);
    console.log('⏹️ Stopped attacking');
  }, 30000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  socket.disconnect();
  process.exit(0);
});

console.log('🚀 Castle Bridge client started. Press Ctrl+C to exit.');
