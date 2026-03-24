// 修复 pkg 打包后的模块加载路径
if ((process as any).pkg) {
    const path = require('path');
    const Module = require('module');
    const execDir = path.dirname(process.execPath);
    const nodeModulesPath = path.join(execDir, 'node_modules');

    // 修改模块搜索路径
    Module.globalPaths.unshift(nodeModulesPath);

    // 修补 _resolveFilename 以支持从外部 node_modules 加载
    const originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
        try {
            return originalResolveFilename.call(this, request, parent, isMain, options);
        } catch (err: any) {
            // 如果默认解析失败，尝试从外部 node_modules 加载
            if (err.code === 'MODULE_NOT_FOUND') {
                try {
                    // 创建一个临时的父模块来从外部 node_modules 解析
                    const dummyModule = new Module('', null);
                    dummyModule.paths = [nodeModulesPath];
                    return originalResolveFilename.call(this, request, dummyModule, isMain, options);
                } catch (e) {
                    // 忽略并抛出原始错误
                }
            }
            throw err;
        }
    };

    // 修补 fs.realpathSync 以重定向 snapshot 路径到外部 node_modules
    const fs = require('fs');
    const originalRealpathSync = fs.realpathSync;
    fs.realpathSync = function (p: string, options: any) {
        const result = originalRealpathSync.call(this, p, options);
        // 如果路径指向 snapshot 中的 node_modules，重定向到外部
        if (typeof result === 'string' && result.includes('\\snapshot\\CORE\\node_modules')) {
            const relativePath = result.split('\\snapshot\\CORE\\node_modules\\')[1];
            if (relativePath) {
                const externalPath = path.join(nodeModulesPath, relativePath);
                try {
                    if (fs.existsSync(externalPath)) {
                        return externalPath;
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
        return result;
    };
}

import app from './app';
import { config } from './config';
import logger from './config/logger';
import { db } from './config/database';
import { YjsWebSocketServer, createPersistence } from './yjs';

const startServer = async () => {
    try {
        // 初始化数据库连接
        logger.info('Initializing database connection...');
        await db.initialize();
        logger.info('Database connection established');

        const server = app.listen(config.port, '0.0.0.0', () => {
            logger.info(`Server is running on port ${config.port}`);
            logger.info(`Environment: ${config.env}`);
            logger.info(`Database type: ${db.getType()}`);
            logger.info(`API available at: http://localhost:${config.port}${config.apiPrefix}`);
        });

        // 初始化 YJS WebSocket 服务器
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
        logger.info(`YJS WebSocket server initialized at ${config.websocket.path}`);

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            logger.info(`${signal} received, closing server gracefully`);

            server.close(async () => {
                logger.info('Server closed');

                // 关闭 YJS 服务器
                try {
                    await yjsServer.close();
                    logger.info('YJS WebSocket server closed');
                } catch (error) {
                    logger.error('Error closing YJS server:', error);
                }

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
