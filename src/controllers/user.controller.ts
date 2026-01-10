import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../config/logger';

/**
 * 用户控制器
 */
export class UserController {
    /**
     * 获取用户信息
     * GET /api/v1/users/:id
     */
    async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json(errorResponse('User ID is required', 400));
                return;
            }

            const user = await userService.getUserById(id);

            if (!user) {
                res.status(404).json(errorResponse('User not found', 404));
                return;
            }

            res.status(200).json(successResponse(user, 'User retrieved successfully'));
        } catch (error) {
            logger.error('Get user error:', error);
            next(error);
        }
    }
}

export const userController = new UserController();
