import app from './app';
import { config } from './config';
import logger from './config/logger';
import { db } from './config/database';
import { YjsWebSocketServer, createPersistence, setYjsWebSocketServer } from './yjs';
import { startLanDiscoveryPublisher, stopLanDiscoveryPublisher } from './discovery';
import { startDatabaseMaintenance } from './maintenance';

const startServer = async () => {
    try {
        logger.info('Initializing database connection...');
        await db.initialize();
        logger.info('Database connection established');

        const server = app.listen(config.port, '0.0.0.0', () => {
            logger.info(`Server is running on port ${config.port}`);
            logger.info(`Environment: ${config.env}`);
            logger.info(`Database type: ${db.getType()}`);
            logger.info(`API available at: http://localhost:${config.port}${config.apiPrefix}`);
            startLanDiscoveryPublisher(config.port);
        });

        logger.info('Initializing YJS WebSocket server...');
        const yjsPersistence = createPersistence(config.yjs.persistence.type, {
            leveldbPath: config.yjs.persistence.leveldbPath,
            fallbackToMemoryOnLock: config.env === 'development',
        });
        const yjsServer = new YjsWebSocketServer(server, {
            path: config.websocket.path,
            pingInterval: config.websocket.pingInterval,
            persistence: yjsPersistence,
        });
        setYjsWebSocketServer(yjsServer);
        logger.info(`YJS WebSocket server initialized at ${config.websocket.path}`);
        const maintenance = startDatabaseMaintenance();

        const gracefulShutdown = async (signal: string) => {
            logger.info(`${signal} received, closing server gracefully`);

            server.close(async () => {
                logger.info('Server closed');

                try {
                    await yjsServer.close();
                    logger.info('YJS WebSocket server closed');
                } catch (error) {
                    logger.error('Error closing YJS server:', error);
                }

                try {
                    await stopLanDiscoveryPublisher();
                } catch (error) {
                    logger.error('Error stopping LAN discovery publisher:', error);
                }

                try {
                    maintenance.stop();
                } catch (error) {
                    logger.error('Error stopping DB maintenance:', error);
                }

                try {
                    await db.close();
                    logger.info('Database connection closed');
                } catch (error) {
                    logger.error('Error closing database:', error);
                }

                process.exit(0);
            });

            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
