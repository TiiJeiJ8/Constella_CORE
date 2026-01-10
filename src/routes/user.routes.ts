import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/users/:id
 * 获取用户信息（需要认证）
 */
router.get('/:id', authenticateToken, (req, res, next) =>
    userController.getUserById(req, res, next)
);

export default router;
