export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    code = "INTERNAL_ERROR",
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: Record<string, string[]>) {
    return new ApiError(400, message, "BAD_REQUEST", errors);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message, "FORBIDDEN");
  }

  static notFound(resource: string) {
    return new ApiError(404, `${resource} not found`, "NOT_FOUND");
  }

  static conflict(message: string) {
    return new ApiError(409, message, "CONFLICT");
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message, "INTERNAL_ERROR");
  }
}
