import { Router } from 'express';
import healthRouter from './health.routes';
// Import other route modules here

const router = Router();

// Register routes
router.use('/health', healthRouter);
// Add more routes here
// router.use('/users', userRouter);
// router.use('/auth', authRouter);

export default router;
