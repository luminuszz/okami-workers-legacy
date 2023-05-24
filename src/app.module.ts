import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { FetchForNewChapterToken } from './jobs/fetch-for-new-chapter';
import {
  FetchForNewEpisodeJob,
  fetchWorkEpisodeToken,
} from './jobs/fetch-for-new-episode';
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
        name: fetchWorkEpisodeToken,
      },
      {
        name: FetchForNewChapterToken,
        processors: [
          join(__dirname, 'workers', 'process-fetch-for-new-chapter.js'),
        ],
      },
    ),
  ],
  controllers: [],
  providers: [OkamiService, FetchForNewEpisodeJob],
})
export class AppModule {}
