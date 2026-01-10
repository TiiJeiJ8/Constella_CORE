import { Response } from 'express';
import { ErrorCode } from '../constants/errorCodes';

interface ValidationError {
    field?: string;
    message: string;
    code?: string;
}

interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T | null;
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
        code: 200,
        message,
        data,
    };
}

/**
 * 错误响应
 */
export function errorResponse(
    message: string,
    statusCode: number = 500,
    errorCode?: ErrorCode
): ApiResponse<ErrorCode | null> {
    return {
        code: statusCode,
        message,
        data: errorCode || null,
    };
}

export class ResponseHandler {
    static success<T>(res: Response, data?: T, message: string = 'Success', statusCode = 200) {
        const response: ApiResponse<T> = {
            code: statusCode,
            message,
            data: data ?? null,
        };
        return res.status(statusCode).json(response);
    }

    static error(
        res: Response,
        message: string = 'Error',
        statusCode = 500,
        errors?: ValidationError[]
    ) {
        const response = {
            code: statusCode,
            message,
            data: null,
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
