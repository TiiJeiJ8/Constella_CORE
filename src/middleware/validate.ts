import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { AppError } from '../utils/appError';
import { COMMON_ERRORS } from '../constants/errorCodes';

export const validate = (schema: Schema) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const message = error.details.map((detail) => detail.message).join(', ');
            return next(new AppError(message, 400, COMMON_ERRORS.BAD_REQUEST));
        }

        next();
    };
};
