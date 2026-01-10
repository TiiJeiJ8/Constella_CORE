import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../utils/appError';
import { errorResponse } from '../utils/response';
import { COMMON_ERRORS } from '../constants/errorCodes';

export const errorHandler = (
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof AppError) {
        logger.error(`${err.statusCode} - ${err.message} - ${err.errorCode || 'NO_CODE'}`);
        return res
            .status(err.statusCode)
            .json(errorResponse(err.message, err.statusCode, err.errorCode));
    }

    // Unexpected errors
    logger.error('Unexpected error:', err);
    return res
        .status(500)
        .json(errorResponse('Internal server error', 500, COMMON_ERRORS.INTERNAL_ERROR));
};
