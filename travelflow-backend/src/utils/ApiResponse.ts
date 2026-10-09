import { Response } from "express";

export class ApiResponse {
  static success<T>(res: Response, data: T, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created<T>(res: Response, data: T, message = "Created successfully") {
    return ApiResponse.success(res, data, message, 201);
  }
}
