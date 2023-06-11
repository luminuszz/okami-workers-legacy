import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { OkamiService } from './okami.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: config.get('OKAMI_BASE_URL'),
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        return {
          redis: {
            port: config.get('REDIS_PORT'),
            host: config.get('REDIS_HOST'),
            password: config.get('REDIS_PASSWORD'),
            connectTimeout: 30000,
          },
          defaultJobOptions: {
            removeOnComplete: true,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),

    BullModule.registerQueue(
      {
        name: 'find-serie-episode',
        processors: [
          join(__dirname, 'workers', 'process-fetch-for-new-episode.js'),
        ],
        limiter: {
          max: 2,
          duration: 60000,
        },
        settings: {
          retryProcessDelay: 10000,
        },
      },
      {
        name: 'find-comic-cap-by-url',
        processors: [
          join(__dirname, 'workers', 'process-fetch-for-new-chapter.js'),
        ],
        limiter: {
          max: 2,
          duration: 60000,
        },
        settings: {
          retryProcessDelay: 10000,
        },
      },
    ),
  ],
  controllers: [],
  providers: [OkamiService],
})
export class AppModule {}
