import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  FetchForNewChapterJob,
  FetchForNewChapterToken,
} from './jobs/fetch-for-new-chapter';
import {
  FetchForNewEpisodeJob,
  fetchWorkEpisodeToken,
} from './jobs/fetch-for-new-episode';
import { OkamiService } from './okami.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: config.get('OKAMI_BASE_URL'),
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        redis: {
          port: config.get('REDIS_PORT'),
          host: config.get('REDIS_HOST'),
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.registerQueue(
      {
        name: fetchWorkEpisodeToken,
      },
      { name: FetchForNewChapterToken },
    ),
  ],
  controllers: [],
  providers: [OkamiService, FetchForNewEpisodeJob, FetchForNewChapterJob],
})
export class AppModule {}
