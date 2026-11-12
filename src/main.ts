// Config MUST be imported first — validates all env vars before any other module loads.
// If a required variable is missing or invalid, the service crashes here with a clear message.
import { config } from './config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interactive Swagger OpenAPI Documentation mounted at /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Resilient URL Shortener API')
    .setDescription(
      'High-throughput URL shortener, cache-aside redirection, and asynchronous telemetry service',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(config.PORT, '0.0.0.0');
}
bootstrap();
