import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { errorResponse } from '../utils/response';
import { AUTH_ERRORS } from '../constants/errorCodes';
import logger from '../config/logger';

/**
 * JWT Payload 接口
 */
interface JWTPayload {
    userId: string;
    email: string;
}

/**
 * 扩展 Express Request 接口以包含用户信息
 */
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
            };
        }
    }
}

/**
 * JWT 认证中间件
 * 验证 Bearer Token 并将用户信息附加到 req.user
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            res.status(401).json(
                errorResponse('Access token is required', 401, AUTH_ERRORS.TOKEN_MISSING)
            );
            return;
        }

        // 验证 token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jwt.verify(token, config.jwt.secret, (err: any, decoded: any) => {
            if (err) {
                logger.error('JWT verification error:', err);

                // 判断是过期还是无效
                if (err.name === 'TokenExpiredError') {
                    res.status(401).json(
                        errorResponse('Access token has expired', 401, AUTH_ERRORS.TOKEN_EXPIRED)
                    );
                } else {
                    res.status(401).json(
                        errorResponse('Invalid access token', 401, AUTH_ERRORS.INVALID_TOKEN)
                    );
                }
                return;
            }

            // 将用户信息附加到请求对象
            const payload = decoded as JWTPayload;
            req.user = {
                userId: payload.userId,
                email: payload.email,
            };

            next();
        });
    } catch (error) {
        logger.error('Authentication middleware error:', error);
        res.status(500).json(errorResponse('Internal server error', 500));
    }
};
