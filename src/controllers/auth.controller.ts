import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';
import { AUTH_ERRORS } from '../constants/errorCodes';
import logger from '../config/logger';

/**
 * 认证控制器
 */
export class AuthController {
    /**
     * 用户注册
     * POST /api/v1/auth/register
     */
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { username, email, password } = req.body;

            // 参数验证
            if (!username || !email || !password) {
                res.status(400).json(
                    errorResponse('Required fields are missing', 400, AUTH_ERRORS.MISSING_FIELDS)
                );
                return;
            }

            // 调用服务层
            const result = await authService.register({ username, email, password });

            res.status(200).json(successResponse(result, 'Registration successful'));
        } catch (error) {
            logger.error('Register error:', error);
            next(error);
        }
    }

    /**
     * 用户登录
     * POST /api/v1/auth/login
     */
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;

            // 参数验证
            if (!email || !password) {
                res.status(400).json(
                    errorResponse('Required fields are missing', 400, AUTH_ERRORS.MISSING_FIELDS)
                );
                return;
            }

            // 调用服务层
            const result = await authService.login({ email, password });

            res.status(200).json(successResponse(result, 'Login successful'));
        } catch (error) {
            logger.error('Login error:', error);
            next(error);
        }
    }

    /**
     * 刷新访问令牌
     * POST /api/v1/auth/refresh
     */
    async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { refresh_token } = req.body;

            // 参数验证
            if (!refresh_token) {
                res.status(400).json(
                    errorResponse('Refresh token is required', 400, AUTH_ERRORS.TOKEN_MISSING)
                );
                return;
            }

            // 调用服务层
            const result = await authService.refreshAccessToken(refresh_token);

            res.status(200).json(successResponse(result, 'Token refresh successful'));
        } catch (error) {
            logger.error('Refresh token error:', error);
            next(error);
        }
    }
}

export default new AuthController();
