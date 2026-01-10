import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { config } from '../config';
import logger from '../config/logger';

/**
 * Relay Token Payload
 */
export interface RelayTokenPayload {
    room_id: string;
    user_id: string;
    exp: number;
}

/**
 * 从 URL 查询参数或 headers 中提取 token
 */
function extractToken(request: IncomingMessage): string | null {
    // 1. 从查询参数中提取
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) {
        return tokenFromQuery;
    }

    // 2. 从 Authorization header 中提取
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

/**
 * 验证 Relay Token
 * @param request - HTTP 请求对象
 * @returns 解析后的 payload 或 null（如果验证失败）
 */
export function verifyRelayToken(request: IncomingMessage): RelayTokenPayload | null {
    try {
        const token = extractToken(request);

        if (!token) {
            logger.warn('WebSocket connection attempt without token');
            return null;
        }

        // 验证 JWT
        const decoded = jwt.verify(token, config.jwt.secret) as RelayTokenPayload;

        // 验证必需字段
        if (!decoded.room_id || !decoded.user_id || !decoded.exp) {
            logger.warn('Invalid relay token payload - missing required fields');
            return null;
        }

        // 验证过期时间
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            logger.warn(
                `Relay token expired for user ${decoded.user_id} in room ${decoded.room_id}`
            );
            return null;
        }

        logger.info(`Relay token verified for user ${decoded.user_id} in room ${decoded.room_id}`);
        return decoded;
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            logger.warn('Invalid relay token:', error.message);
        } else {
            logger.error('Error verifying relay token:', error);
        }
        return null;
    }
}

/**
 * 从 URL 中提取房间 ID
 */
export function extractRoomId(url: string): string | null {
    // URL 格式: /ws/room:<room_id>
    const match = url.match(/\/ws\/(room:[a-f0-9-]+)/);
    return match ? match[1] : null;
}

/**
 * 验证用户是否有权访问指定房间
 */
export function canAccessRoom(payload: RelayTokenPayload, roomId: string): boolean {
    const expectedRoomId = `room:${payload.room_id}`;
    if (roomId !== expectedRoomId) {
        logger.warn(`Room ID mismatch: token room=${expectedRoomId}, requested room=${roomId}`);
        return false;
    }
    return true;
}
