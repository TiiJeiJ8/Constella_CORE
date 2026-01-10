import app from './app';
import { config } from './config';
import logger from './config/logger';
import { db } from './config/database';
import { migrationManager } from './database/migrationManager';

const startServer = async () => {
    try {
        // 初始化数据库连接
        logger.info('Initializing database connection...');
        await db.initialize();
        logger.info('Database connection established');

        // 执行数据库迁移
        if (db.getType() === 'postgres') {
            logger.info('Running database migrations...');
            await migrationManager.runMigrations();
            logger.info('Database migrations completed');
        }

        const server = app.listen(config.port, () => {
            logger.info(`Server is running on port ${config.port}`);
            logger.info(`Environment: ${config.env}`);
            logger.info(`Database type: ${db.getType()}`);
            logger.info(`API available at: http://localhost:${config.port}${config.apiPrefix}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`${signal} received, closing server gracefully`);

            server.close(async () => {
                logger.info('Server closed');

                // 关闭数据库连接
                try {
                    await db.close();
                    logger.info('Database connection closed');
                } catch (error) {
                    logger.error('Error closing database:', error);
                }

                process.exit(0);
            });

            // Force close after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Unhandled errors
        process.on('unhandledRejection', (reason: Error) => {
            logger.error('Unhandled Rejection:', reason);
            throw reason;
        });

        process.on('uncaughtException', (error: Error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
