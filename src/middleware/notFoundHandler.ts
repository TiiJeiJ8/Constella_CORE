import { Request, Response } from 'express';
import { COMMON_ERRORS } from '../constants/errorCodes';
import { errorResponse } from '../utils/response';

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json(errorResponse('Resource not found', 404, COMMON_ERRORS.NOT_FOUND));
};
