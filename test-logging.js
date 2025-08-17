/**
 * Test script to demonstrate the comprehensive logging
 * Run this while the server is running to see all the logs in action
 */

const { io } = require('socket.io-client');

console.log('🧪 Starting logging test...');
console.log('📝 Watch the server logs to see detailed game activity');

// Create multiple players to test logging
const players = [
  { id: 'hero-1', name: 'Aragorn' },
  { id: 'hero-2', name: 'Legolas' },
  { id: 'hero-3', name: 'Gimli' }
];

const sockets = [];

// Connect players one by one
players.forEach((player, index) => {
  setTimeout(() => {
    const socket = io('http://localhost:3000');
    sockets.push(socket);
    
    socket.on('connect', () => {
      console.log(`✅ ${player.name} connected`);
      
      // Join the game
      socket.emit('player.join', JSON.stringify({
        id: player.id,
        nickname: player.name
      }));
    });
    
    socket.on('player.join', () => {
      console.log(`🦸 ${player.name} joined the game`);
      
      // Start attacking after a short delay
      setTimeout(() => {
        console.log(`⚔️ ${player.name} starts attacking...`);
        
        // Attack every 3 seconds
        const attackInterval = setInterval(() => {
          socket.emit('unit.attack');
        }, 3000);
        
        // Stop attacking after 15 seconds
        setTimeout(() => {
          clearInterval(attackInterval);
          console.log(`⏹️ ${player.name} stopped attacking`);
        }, 15000);
        
      }, 1000 + (index * 500)); // Stagger the attacks
    });
    
    socket.on('game.over', () => {
      console.log(`🏁 Game over detected by ${player.name}`);
      
      // Restart the game after 2 seconds
      setTimeout(() => {
        console.log(`🔄 ${player.name} is restarting the game...`);
        socket.emit('game.restart');
      }, 2000);
    });
    
  }, index * 2000); // Connect players 2 seconds apart
});

// Cleanup after 30 seconds
setTimeout(() => {
  console.log('🧹 Cleaning up test...');
  sockets.forEach(socket => socket.disconnect());
  console.log('✅ Test completed! Check the server logs for detailed activity.');
  process.exit(0);
}, 30000);

console.log('⏰ Test will run for 30 seconds...');
console.log('👀 Watch the server console for detailed logging!');
