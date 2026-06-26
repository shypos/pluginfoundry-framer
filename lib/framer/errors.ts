export class FramerError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = "FramerError";
  }
}

export class FramerConnectionError extends FramerError {
  constructor(message: string, originalError?: any) {
    super("CONNECTION_ERROR", message, originalError);
  }
}

export class FramerAuthError extends FramerError {
  constructor(message: string, originalError?: any) {
    super("AUTH_ERROR", message, originalError);
  }
}

export class FramerValidationError extends FramerError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
  }
}

export class FramerApiLimitError extends FramerError {
  constructor(message: string, originalError?: any) {
    super("RATE_LIMIT_ERROR", message, originalError);
  }
}
