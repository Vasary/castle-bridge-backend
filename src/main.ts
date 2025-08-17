import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Get port from environment variable or default to 3000
  const port = process.env.PORT || 3000;

  // Listen on all network interfaces (0.0.0.0) for production deployment
  await app.listen(port, '0.0.0.0');

  // Log network information
  const networkInterfaces = os.networkInterfaces();
  logger.log(`🚀 Castle Bridge Backend started successfully!`);
  logger.log(`📡 Listening on 0.0.0.0:${port}`);
  logger.log(`🌐 Available network interfaces:`);

  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces?.forEach(iface => {
      if (!iface.internal) {
        logger.log(`   ${interfaceName}: http://${iface.address}:${port} (${iface.family})`);
      }
    });
  });

  logger.log(`🎮 WebSocket server ready for game connections`);
  logger.log(`📊 Game logging enabled - watch for player activity below`);
}
bootstrap();
