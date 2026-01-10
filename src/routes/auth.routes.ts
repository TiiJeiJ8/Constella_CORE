import { Router } from 'express';
import authController from '../controllers/auth.controller';

const router = Router();

/**
 * POST /api/v1/auth/register
 * 用户注册
 */
router.post('/register', (req, res, next) => authController.register(req, res, next));

/**
 * POST /api/v1/auth/login
 * 用户登录
 */
router.post('/login', (req, res, next) => authController.login(req, res, next));

/**
 * POST /api/v1/auth/refresh
 * 刷新访问令牌
 */
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

export default router;
