import { Request, Response, NextFunction } from 'express';
import { roomService } from '../services/room.service';
import { successResponse, errorResponse } from '../utils/response';
import { RoomRole } from '../types/database';
import logger from '../config/logger';

/**
 * 房间控制器
 */
export class RoomController {
    /**
     * 创建新房间
     * POST /api/v1/rooms
     */
    async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, description, is_private, password, settings } = req.body;
            const owner_id = req.user?.userId;

            // 参数验证
            if (!name) {
                res.status(400).json(errorResponse('Room name is required', 400));
                return;
            }

            if (!owner_id) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            // 调用服务层
            const result = await roomService.createRoom({
                name,
                description,
                is_private,
                password,
                settings,
                owner_id,
            });

            res.status(201).json(successResponse(result, 'Room created successfully'));
        } catch (error) {
            logger.error('Create room error:', error);
            next(error);
        }
    }

    /**
     * 获取房间列表
     * GET /api/v1/rooms
     */
    async getRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const queryUserId = req.query.user_id as string | undefined;
            const currentUserId = req.user?.userId; // 当前登录用户ID（用于获取角色）
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            // 传递 queryUserId 用于过滤，currentUserId 用于获取角色
            const result = await roomService.getRooms(queryUserId, currentUserId, limit, offset);

            res.status(200).json(successResponse(result, 'Rooms retrieved successfully'));
        } catch (error) {
            logger.error('Get rooms error:', error);
            next(error);
        }
    }

    /**
     * 获取所有房间（公开+私密）
     * GET /api/v1/rooms/all
     */
    async getAllRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const currentUserId = req.user?.userId;
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await roomService.getAllRooms(currentUserId, limit, offset);

            res.status(200).json(successResponse(result, 'All rooms retrieved successfully'));
        } catch (error) {
            logger.error('Get all rooms error:', error);
            next(error);
        }
    }

    /**
     * 获取房间详情
     * GET /api/v1/rooms/:id
     */
    async getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            const result = await roomService.getRoomById(id, userId);

            res.status(200).json(successResponse(result, 'Room retrieved successfully'));
        } catch (error) {
            logger.error('Get room error:', error);
            next(error);
        }
    }

    /**
     * 加入房间
     * POST /api/v1/rooms/:id/join
     */
    async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { password } = req.body;
            const user_id = req.user?.userId;

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            if (!user_id) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            const result = await roomService.joinRoom({
                room_id: id,
                user_id,
                password,
            });

            res.status(200).json(successResponse(result, 'Joined room successfully'));
        } catch (error) {
            logger.error('Join room error:', error);
            next(error);
        }
    }

    /**
     * 邀请用户加入房间
     * POST /api/v1/rooms/:id/invite
     */
    async inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { email, role } = req.body;
            const inviter_id = req.user?.userId;

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            if (!email) {
                res.status(400).json(errorResponse('Email is required', 400));
                return;
            }

            if (!inviter_id) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            // 验证 role 是否有效（如果提供）
            if (role && !Object.values(RoomRole).includes(role)) {
                res.status(400).json(errorResponse('Invalid role', 400));
                return;
            }

            const result = await roomService.inviteUser({
                room_id: id,
                inviter_id,
                email,
                role,
            });

            res.status(200).json(successResponse(result, 'User invited successfully'));
        } catch (error) {
            logger.error('Invite user error:', error);
            next(error);
        }
    }

    /**
     * 更新成员权限
     * PUT /api/v1/rooms/:id/permissions
     */
    async updatePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { member_id, new_role } = req.body;
            const requester_id = req.user?.userId;

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            if (!member_id || !new_role) {
                res.status(400).json(errorResponse('Member ID and new role are required', 400));
                return;
            }

            if (!requester_id) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            // 验证 role 是否有效
            if (!Object.values(RoomRole).includes(new_role)) {
                res.status(400).json(errorResponse('Invalid role', 400));
                return;
            }

            const result = await roomService.updatePermissions({
                room_id: id,
                requester_id,
                member_id,
                new_role,
            });

            res.status(200).json(successResponse(result, 'Permissions updated successfully'));
        } catch (error) {
            logger.error('Update permissions error:', error);
            next(error);
        }
    }

    /**
     * 生成 Relay Token（用于 WSS 连接）
     * POST /api/v1/rooms/:id/relay-token
     */
    async getRelayToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = req.user?.userId;

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            if (!user_id) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            const result = await roomService.generateRelayToken({
                room_id: id,
                user_id,
            });

            res.status(200).json(successResponse(result, 'Relay token generated successfully'));
        } catch (error) {
            logger.error('Get relay token error:', error);
            next(error);
        }
    }

    /**
     * 删除房间
     * DELETE /api/v1/rooms/:id
     */
    async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const { password } = req.body;
            const user_id = req.user?.userId;

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            if (!user_id) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            const result = await roomService.deleteRoom({
                room_id: id,
                user_id,
                password,
            });

            res.status(200).json(successResponse(result, 'Room deleted successfully'));
        } catch (error) {
            logger.error('Delete room error:', error);
            next(error);
        }
    }
}

export const roomController = new RoomController();
