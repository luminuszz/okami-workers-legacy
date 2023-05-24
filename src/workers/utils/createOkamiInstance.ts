import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { OkamiService } from 'src/okami.service';

let okamiService: OkamiService;

export const createOkamiInstance = async (): Promise<OkamiService> => {
  if (!okamiService) {
    const nestApp = await NestFactory.createApplicationContext(AppModule);
    okamiService = await nestApp.resolve<OkamiService>(OkamiService);
  }

  return okamiService;
};
