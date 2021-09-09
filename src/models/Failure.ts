export class Failure {
  error: FailureError;

  constructor(error: FailureError) {
    this.error = error;
  }

  static commonErr(err: string): Failure {
    return new Failure(FailureError.commonErr(err));
  }
}

export class FailureError {
  reason: string;
  details: string;

  constructor(reason: string, details: string) {
    this.reason = reason;
    this.details = details;
  }

  static commonErr(err: string): FailureError {
    return new FailureError(err, err);
  }
}
