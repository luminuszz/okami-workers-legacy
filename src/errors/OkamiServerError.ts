export class OkamiServerError extends Error {
  constructor(message: string, public readonly workId: string) {
    super(message);
  }
}

export class OnMarkWorkUnreadError extends OkamiServerError {
  constructor(work_id: string) {
    super('error on mark work unread', work_id);
  }
}

export class OnMarkWorkReadError extends OkamiServerError {
  constructor(work_id: string) {
    super('error on mark work unread', work_id);
  }
}
