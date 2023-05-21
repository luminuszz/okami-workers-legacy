import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OkamiService {
  constructor(private readonly okamiHttpServicer: HttpService) {}

  async markWorkUnread(worker_id: string) {
    return this.okamiHttpServicer
      .patch(`/worker/${worker_id}/mark-unread`)
      .subscribe();
  }

  async markWorkRead(worker_id: string) {
    return this.okamiHttpServicer
      .patch(`/worker/${worker_id}/mark-read`)
      .subscribe();
  }
}
