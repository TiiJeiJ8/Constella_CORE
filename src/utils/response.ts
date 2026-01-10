import { Response } from 'express';

interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: any[];
}

export class ResponseHandler {
  static success<T>(res: Response, data?: T, message: string = 'Success', statusCode = 200) {
    const response: ApiResponse<T> = {
      status: 'success',
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string = 'Error', statusCode = 500, errors?: any[]) {
    const response: ApiResponse = {
      status: 'error',
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data?: T, message: string = 'Created') {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}
