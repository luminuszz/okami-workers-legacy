import { pino } from 'pino';
import PinoPretty from 'pino-pretty';

export const createLogger = (value?: string) => {
  return pino(
    PinoPretty({
      colorize: true,
      colorizeObjects: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss',
    }),
  );
};
