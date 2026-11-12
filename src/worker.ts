import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('StandaloneWorker');
  logger.log('Starting standalone Analytics Worker process...');
  await NestFactory.createApplicationContext(AppModule);
  logger.log('Standalone Analytics Worker is running and listening for jobs.');
}

bootstrap();

