import { ErrorCode } from '../constants/errorCodes';

/**
 * 应用错误类
 * 包含错误码和 HTTP 状态码
 */
export class AppError extends Error {
    public statusCode: number;
    public errorCode?: ErrorCode;

    constructor(message: string, statusCode: number = 500, errorCode?: ErrorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.name = 'AppError';

        // 维护正确的堆栈跟踪
        Error.captureStackTrace(this, this.constructor);
    }
}
