import { COMMON_ERRORS, ErrorCode } from '../constants/errorCodes';

/**
 * 应用错误类
 * 包含错误码和 HTTP 状态码
 */
export class AppError extends Error {
    public statusCode: number;
    public errorCode?: ErrorCode;

    private static fallbackErrorCodeByStatus(statusCode: number): ErrorCode {
        if (statusCode === 400) return COMMON_ERRORS.BAD_REQUEST;
        if (statusCode === 401) return COMMON_ERRORS.UNAUTHORIZED;
        if (statusCode === 403) return COMMON_ERRORS.FORBIDDEN;
        if (statusCode === 404) return COMMON_ERRORS.NOT_FOUND;
        if (statusCode === 429) return COMMON_ERRORS.RATE_LIMITED;
        return COMMON_ERRORS.INTERNAL_ERROR;
    }

    constructor(message: string, statusCode: number = 500, errorCode?: ErrorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode || AppError.fallbackErrorCodeByStatus(statusCode);
        this.name = 'AppError';

        // 维护正确的堆栈跟踪
        Error.captureStackTrace(this, this.constructor);
    }
}
