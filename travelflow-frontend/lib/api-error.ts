export class ApiError extends Error {
  status?: number;
  _rawBody?: string;
  public readonly isApiError = true;

  constructor(message: string, status?: number, _rawBody?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this._rawBody = _rawBody;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
