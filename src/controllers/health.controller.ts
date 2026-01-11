import { Request, Response } from 'express';

export const getHealth = (_req: Request, res: Response) => {
    res.status(200).json({
        code: 200,
        message: 'Server is healthy',
        data: {
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        }
    });
};
