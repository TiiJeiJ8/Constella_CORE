import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { config } from '../config';
import logger from '../config/logger';
import { RoomMemberModel } from '../models/roomMember.model';
import { RoomRole } from '../types/database';

export interface RelayTokenPayload {
    room_id: string;
    user_id: string;
    role?: string;
    can_write?: boolean;
    exp: number;
}

const TEST_WHITELIST_ROOMS = ['room:test-room', 'room:demo-room'];

function extractToken(request: IncomingMessage): string | null {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) {
        return tokenFromQuery;
    }

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

function normalizeRequestedRoomId(roomId: string): string {
    return roomId.startsWith('room:') ? roomId.substring(5) : roomId;
}

function normalizeRelayRole(role?: string | null): RoomRole | null {
    if (!role) {
        return null;
    }

    if (role === RoomRole.MEMBER || role === 'member') {
        return RoomRole.EDITOR;
    }

    if (role === RoomRole.OWNER || role === RoomRole.ADMIN || role === RoomRole.EDITOR || role === RoomRole.VIEWER) {
        return role;
    }

    return null;
}

export function verifyRelayToken(
    request: IncomingMessage,
    roomId?: string
): RelayTokenPayload | null {
    try {
        if (config.env === 'test' && roomId && TEST_WHITELIST_ROOMS.includes(roomId)) {
            logger.info(`Allowing whitelisted test room: ${roomId}`);
            return {
                room_id: roomId.split(':')[1],
                user_id: 'test-user',
                role: 'owner',
                can_write: true,
                exp: Math.floor(Date.now() / 1000) + 3600,
            };
        }

        const token = extractToken(request);
        if (!token) {
            logger.warn('WebSocket connection attempt without token');
            return null;
        }

        const decoded = jwt.verify(token, config.jwt.secret) as RelayTokenPayload;
        if (!decoded.room_id || !decoded.user_id || !decoded.exp) {
            logger.warn('Invalid relay token payload - missing required fields');
            return null;
        }

        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            logger.warn(`Relay token expired for user ${decoded.user_id} in room ${decoded.room_id}`);
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

export function extractRoomId(url: string): string | null {
    const roomMatch = url.match(/\/ws\/(room:[a-z0-9-]+)/);
    if (roomMatch) {
        return roomMatch[1];
    }

    const uuidMatch = url.match(/\/ws\/([a-f0-9-]{36})/i);
    if (uuidMatch) {
        return uuidMatch[1];
    }

    return null;
}

export function canAccessRoom(payload: RelayTokenPayload, roomId: string): boolean {
    const requestedId = normalizeRequestedRoomId(roomId);

    if (requestedId !== payload.room_id) {
        logger.warn(`Room ID mismatch: token room=${payload.room_id}, requested room=${requestedId}`);
        return false;
    }

    return true;
}

export async function authorizeRoomAccess(
    payload: RelayTokenPayload,
    roomId: string
): Promise<RelayTokenPayload | null> {
    if (!canAccessRoom(payload, roomId)) {
        return null;
    }

    const requestedId = normalizeRequestedRoomId(roomId);
    const membership = await RoomMemberModel.findByRoomAndUser(requestedId, payload.user_id);

    if (!membership) {
        logger.warn(`Room membership missing for user ${payload.user_id} in room ${requestedId}`);
        return null;
    }

    const role = normalizeRelayRole(membership.role);
    const canWrite = role === RoomRole.OWNER || role === RoomRole.ADMIN || role === RoomRole.EDITOR;

    return {
        ...payload,
        room_id: requestedId,
        role: role || payload.role,
        can_write: canWrite,
    };
}
