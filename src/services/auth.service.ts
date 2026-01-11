import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { RefreshTokenModel } from '../models/refreshToken.model';
import { config } from '../config';
import logger from '../config/logger';
import { AppError } from '../utils/appError';
import { AUTH_ERRORS } from '../constants/errorCodes';

/**
 * 注册参数
 */
interface RegisterParams {
    username: string;
    email: string;
    password: string;
}

/**
 * 登录参数
 */
interface LoginParams {
    email: string;
    password: string;
}

/**
 * JWT Payload
 */
interface JWTPayload {
    userId: string;
    email: string;
}

/**
 * 认证响应
 */
interface AuthResponse {
    user: {
        id: string;
        username: string;
        email: string;
        created_at: Date;
    };
    access_token: string;
    refresh_token: string;
}

/**
 * 认证服务
 */
export class AuthService {
    /**
     * 用户注册
     */
    async register(params: RegisterParams): Promise<AuthResponse> {
        const { username, email, password } = params;

        // 检查用户名是否已存在
        const existingUserByUsername = await UserModel.findByUsername(username);
        if (existingUserByUsername) {
            throw new AppError('Username already taken', 409, AUTH_ERRORS.USERNAME_EXISTS);
        }

        // 密码哈希
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // 创建用户
        const user = await UserModel.create({
            username,
            email,
            password_hash,
        });

        // 生成令牌
        const tokens = await this.generateTokens(user.id, user.email);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at,
            },
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
        };
    }

    /**
     * 用户登录
     */
    async login(params: LoginParams): Promise<AuthResponse> {
        const { email, password } = params;

        // 使用 username 查找用户
        const user = await UserModel.findByUsername(email);

        if (!user) {
            throw new AppError('Invalid username or password', 401, AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // 验证密码
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError('Invalid username or password', 401, AUTH_ERRORS.INVALID_CREDENTIALS);
        }

        // 生成令牌
        const tokens = await this.generateTokens(user.id, user.email);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                created_at: user.created_at,
            },
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
        };
    }

    /**
     * 刷新访问令牌
     */
    async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
        // 查找刷新令牌
        const tokenRecord = await RefreshTokenModel.findByToken(refreshToken);
        if (!tokenRecord) {
            throw new AppError('Invalid refresh token', 401, AUTH_ERRORS.INVALID_TOKEN);
        }

        // 检查令牌是否被撤销
        if (tokenRecord.revoked) {
            throw new AppError('Refresh token has been revoked', 401, AUTH_ERRORS.TOKEN_REVOKED);
        }

        // 检查令牌是否过期
        if (new Date() > tokenRecord.expires_at) {
            throw new AppError('Refresh token has expired', 401, AUTH_ERRORS.TOKEN_EXPIRED);
        }

        // 验证 JWT
        try {
            const payload = jwt.verify(refreshToken, config.jwt.secret) as JWTPayload;

            // 生成新的访问令牌
            const accessToken = jwt.sign(
                {
                    userId: payload.userId,
                    email: payload.email,
                },
                config.jwt.secret,
                {
                    expiresIn: config.jwt.expiresIn,
                } as jwt.SignOptions
            );

            return {
                access_token: accessToken,
            };
        } catch (error) {
            logger.error('JWT verification failed:', error);
            throw new AppError('Invalid refresh token', 401, AUTH_ERRORS.INVALID_TOKEN);
        }
    }

    /**
     * 生成访问令牌和刷新令牌
     */
    private async generateTokens(
        userId: string,
        email: string
    ): Promise<{ accessToken: string; refreshToken: string }> {
        const payload: JWTPayload = {
            userId,
            email,
        };

        // 生成访问令牌
        const accessToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.expiresIn,
        } as jwt.SignOptions);

        // 生成刷新令牌
        const refreshToken = jwt.sign(payload, config.jwt.secret, {
            expiresIn: config.jwt.refreshExpiresIn,
        } as jwt.SignOptions);

        // 计算刷新令牌过期时间
        const refreshExpiresAt = new Date();
        const expiresInMs = this.parseExpiration(config.jwt.refreshExpiresIn);
        refreshExpiresAt.setTime(refreshExpiresAt.getTime() + expiresInMs);

        // 保存刷新令牌到数据库
        await RefreshTokenModel.create({
            user_id: userId,
            token: refreshToken,
            expires_at: refreshExpiresAt,
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * 解析过期时间字符串为毫秒
     * 支持格式: "1h", "7d", "30d" 等
     */
    private parseExpiration(expiration: string): number {
        const match = expiration.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error('Invalid expiration format');
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        const multipliers: Record<string, number> = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
        };

        return value * multipliers[unit];
    }
}

export const authService = new AuthService();
