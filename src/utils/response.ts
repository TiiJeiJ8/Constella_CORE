import { Response } from 'express';
import { COMMON_ERRORS, ErrorCode } from '../constants/errorCodes';

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

function fallbackErrorCodeByStatus(statusCode: number): ErrorCode {
    if (statusCode === 400) return COMMON_ERRORS.BAD_REQUEST;
    if (statusCode === 401) return COMMON_ERRORS.UNAUTHORIZED;
    if (statusCode === 403) return COMMON_ERRORS.FORBIDDEN;
    if (statusCode === 404) return COMMON_ERRORS.NOT_FOUND;
    if (statusCode === 429) return COMMON_ERRORS.RATE_LIMITED;
    return COMMON_ERRORS.INTERNAL_ERROR;
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
    const resolvedErrorCode = errorCode || fallbackErrorCodeByStatus(statusCode);

    return {
        code: statusCode,
        message,
        data: resolvedErrorCode,
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
