import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  OnMarkWorkReadError,
  OnMarkWorkUnreadError,
} from './errors/OkamiServerError';

@Injectable()
export class OkamiService {
  constructor(private readonly okamiHttpServicer: HttpService) {}

  async markWorkUnread(worker_id: string) {
    const { status } = (await firstValueFrom(
      this.okamiHttpServicer.patch(`/work/${worker_id}/mark-unread`).pipe(
        catchError(() => {
          throw new OnMarkWorkUnreadError(worker_id);
        }),
      ),
    )) as AxiosResponse<any>;

    return status === 200;
  }

  async markWorkRead(worker_id: string) {
    const { status } = (await firstValueFrom(
      this.okamiHttpServicer.patch(`/work/${worker_id}/mark-read`).pipe(
        catchError(() => {
          throw new OnMarkWorkReadError(worker_id);
        }),
      ),
    )) as AxiosResponse<any>;

    return status === 200;
  }
}
