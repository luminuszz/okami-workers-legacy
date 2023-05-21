import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = await app.resolve(ConfigService);

  await app.listen(configService.get('API_PORT'));
}
bootstrap();
