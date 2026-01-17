import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import logger from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import routes from './routes';

const app: Application = express();

// Security middleware with CSP configuration
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'", // 允许内联脚本（用于测试页面）
                ],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:', 'http:', 'blob:'],
                connectSrc: ["'self'", 'ws:', 'wss:', 'http:', 'https:'], // 允许 WebSocket 和 HTTP 连接
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' }, // 允许跨域加载资源
    })
);
app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
if (config.env !== 'test') {
    app.use(
        morgan('combined', {
            stream: { write: (message) => logger.info(message.trim()) },
        })
    );
}

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.env,
    });
});

// Static files for uploaded assets (with CORS headers for cross-origin access)
app.use('/uploads', (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
}, express.static(path.join(process.cwd(), 'uploads')));

// Serve frontend static assets (if present)
try {
    const frontendDist = (config as any).frontendDistPath as string;
    if (frontendDist && fs.existsSync(frontendDist)) {
        app.use(express.static(frontendDist));

        // SPA fallback: if request is not for API, return index.html
        app.get('*', (req: Request, res: Response, next: NextFunction) => {
            if (req.path.startsWith(config.apiPrefix) || req.path.startsWith('/uploads')) {
                return next();
            }
            res.sendFile(path.join(frontendDist, 'index.html'));
        });
    }
} catch (err) {
    logger.warn('Failed to mount frontend static assets:', err);
}

// API routes
app.use(config.apiPrefix, routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
