import { Request, Response } from 'express';
import { getDiscoveryMetadata } from '../discovery';

export const getHealth = (_req: Request, res: Response) => {
    res.status(200).json({
        code: 200,
        message: 'Server is healthy',
        data: {
            ...getDiscoveryMetadata(),
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        }
    });
};
