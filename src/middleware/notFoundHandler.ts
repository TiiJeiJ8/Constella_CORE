import { Request, Response } from 'express';

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({
        status: 500,
        message: 'Internal server error',
        data: 'INTERNAL_ERROR',
    });
};
