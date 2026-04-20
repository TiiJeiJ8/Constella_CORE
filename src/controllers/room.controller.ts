import { Request, Response, NextFunction } from 'express'
import { roomService } from '../services/room.service'
import { successResponse, errorResponse } from '../utils/response'
import { RoomRole } from '../types/database'
import logger from '../config/logger'

export class RoomController {
    async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { name, description, is_private, password, settings } = req.body
            const ownerId = req.user?.userId

            if (!name) {
                res.status(400).json(errorResponse('Room name is required', 400))
                return
            }

            if (!ownerId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.createRoom({
                name,
                description,
                is_private,
                password,
                settings,
                owner_id: ownerId,
            })

            res.status(201).json(successResponse(result, 'Room created successfully'))
        } catch (error) {
            logger.error('Create room error:', error)
            next(error)
        }
    }

    async getRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const queryUserId = req.query.user_id as string | undefined
            const currentUserId = req.user?.userId
            const limit = parseInt(req.query.limit as string, 10) || 50
            const offset = parseInt(req.query.offset as string, 10) || 0

            const result = await roomService.getRooms(queryUserId, currentUserId, limit, offset)
            res.status(200).json(successResponse(result, 'Rooms retrieved successfully'))
        } catch (error) {
            logger.error('Get rooms error:', error)
            next(error)
        }
    }

    async getAllRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const currentUserId = req.user?.userId
            const limit = parseInt(req.query.limit as string, 10) || 50
            const offset = parseInt(req.query.offset as string, 10) || 0

            const result = await roomService.getAllRooms(currentUserId, limit, offset)
            res.status(200).json(successResponse(result, 'All rooms retrieved successfully'))
        } catch (error) {
            logger.error('Get all rooms error:', error)
            next(error)
        }
    }

    async getRoomById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const userId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            const result = await roomService.getRoomById(id, userId)
            res.status(200).json(successResponse(result, 'Room retrieved successfully'))
        } catch (error) {
            logger.error('Get room error:', error)
            next(error)
        }
    }

    async getRoomMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const requesterId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.getRoomMembers(id, requesterId)
            res.status(200).json(successResponse(result, 'Room members retrieved successfully'))
        } catch (error) {
            logger.error('Get room members error:', error)
            next(error)
        }
    }

    async getRoomAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const requesterId = req.user?.userId
            const limit = parseInt(req.query.limit as string, 10) || 100
            const offset = parseInt(req.query.offset as string, 10) || 0

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.getRoomAuditLogs(id, requesterId, limit, offset)
            res.status(200).json(successResponse(result, 'Room audit logs retrieved successfully'))
        } catch (error) {
            logger.error('Get room audit logs error:', error)
            next(error)
        }
    }

    async updateRoomSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const requesterId = req.user?.userId
            const { name, description, is_private, settings } = req.body

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.updateRoomSettings({
                room_id: id,
                requester_id: requesterId,
                name,
                description,
                is_private,
                settings,
            })

            res.status(200).json(successResponse(result, 'Room settings updated successfully'))
        } catch (error) {
            logger.error('Update room settings error:', error)
            next(error)
        }
    }

    async updateRoomPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const requesterId = req.user?.userId
            const { current_password, new_password, is_private } = req.body

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.updateRoomPassword({
                room_id: id,
                requester_id: requesterId,
                current_password,
                new_password,
                is_private,
            })

            res.status(200).json(successResponse(result, 'Room password updated successfully'))
        } catch (error) {
            logger.error('Update room password error:', error)
            next(error)
        }
    }

    async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const { password } = req.body
            const userId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!userId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.joinRoom({
                room_id: id,
                user_id: userId,
                password,
                requester_key: req.ip || req.headers['x-forwarded-for']?.toString(),
            })

            res.status(200).json(successResponse(result, 'Joined room successfully'))
        } catch (error) {
            logger.error('Join room error:', error)
            next(error)
        }
    }

    async inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const { email, role } = req.body
            const inviterId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!email) {
                res.status(400).json(errorResponse('Email is required', 400))
                return
            }

            if (!inviterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            if (role && !Object.values(RoomRole).includes(role)) {
                res.status(400).json(errorResponse('Invalid role', 400))
                return
            }

            const result = await roomService.inviteUser({
                room_id: id,
                inviter_id: inviterId,
                email,
                role,
            })

            res.status(200).json(successResponse(result, 'User invited successfully'))
        } catch (error) {
            logger.error('Invite user error:', error)
            next(error)
        }
    }

    async createInviteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const { role } = req.body
            const inviterId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!inviterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            if (role && role !== RoomRole.EDITOR && role !== RoomRole.VIEWER) {
                res.status(400).json(errorResponse('Invalid role', 400))
                return
            }

            const result = await roomService.createInviteCode({
                room_id: id,
                inviter_id: inviterId,
                role,
            })

            res.status(201).json(successResponse(result, 'Invite code created successfully'))
        } catch (error) {
            logger.error('Create invite code error:', error)
            next(error)
        }
    }

    async joinByInviteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { token } = req.body
            const userId = req.user?.userId

            if (!token) {
                res.status(400).json(errorResponse('Invite code is required', 400))
                return
            }

            if (!userId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.joinRoomByInviteCode({
                token,
                user_id: userId,
            })

            res.status(200).json(successResponse(result, 'Joined room successfully'))
        } catch (error) {
            logger.error('Join by invite code error:', error)
            next(error)
        }
    }

    async updatePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const { member_id, new_role } = req.body
            const requesterId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!member_id || !new_role) {
                res.status(400).json(errorResponse('Member ID and new role are required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            if (!Object.values(RoomRole).includes(new_role)) {
                res.status(400).json(errorResponse('Invalid role', 400))
                return
            }

            const result = await roomService.updatePermissions({
                room_id: id,
                requester_id: requesterId,
                member_id,
                new_role,
            })

            res.status(200).json(successResponse(result, 'Permissions updated successfully'))
        } catch (error) {
            logger.error('Update permissions error:', error)
            next(error)
        }
    }

    async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id, memberId } = req.params
            const { role, new_role } = req.body
            const requesterId = req.user?.userId
            const nextRole = role || new_role

            if (!id || !memberId) {
                res.status(400).json(errorResponse('Room ID and member ID are required', 400))
                return
            }

            if (!nextRole) {
                res.status(400).json(errorResponse('New role is required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            if (!Object.values(RoomRole).includes(nextRole)) {
                res.status(400).json(errorResponse('Invalid role', 400))
                return
            }

            const result = await roomService.updateMemberRole({
                room_id: id,
                requester_id: requesterId,
                member_id: memberId,
                new_role: nextRole,
            })

            res.status(200).json(successResponse(result, 'Member role updated successfully'))
        } catch (error) {
            logger.error('Update member role error:', error)
            next(error)
        }
    }

    async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id, memberId } = req.params
            const requesterId = req.user?.userId

            if (!id || !memberId) {
                res.status(400).json(errorResponse('Room ID and member ID are required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.removeMember({
                room_id: id,
                requester_id: requesterId,
                member_id: memberId,
            })

            res.status(200).json(successResponse(result, 'Member removed successfully'))
        } catch (error) {
            logger.error('Remove member error:', error)
            next(error)
        }
    }

    async transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id, memberId } = req.params
            const requesterId = req.user?.userId

            if (!id || !memberId) {
                res.status(400).json(errorResponse('Room ID and member ID are required', 400))
                return
            }

            if (!requesterId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.transferOwnership({
                room_id: id,
                requester_id: requesterId,
                member_id: memberId,
            })

            res.status(200).json(successResponse(result, 'Ownership transferred successfully'))
        } catch (error) {
            logger.error('Transfer ownership error:', error)
            next(error)
        }
    }

    async getRelayToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const userId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!userId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.generateRelayToken({
                room_id: id,
                user_id: userId,
            })

            res.status(200).json(successResponse(result, 'Relay token generated successfully'))
        } catch (error) {
            logger.error('Get relay token error:', error)
            next(error)
        }
    }

    async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params
            const { password } = req.body
            const userId = req.user?.userId

            if (!id) {
                res.status(400).json(errorResponse('Room ID is required', 400))
                return
            }

            if (!userId) {
                res.status(401).json(errorResponse('User authentication required', 401))
                return
            }

            const result = await roomService.deleteRoom({
                room_id: id,
                user_id: userId,
                password,
            })

            res.status(200).json(successResponse(result, 'Room deleted successfully'))
        } catch (error) {
            logger.error('Delete room error:', error)
            next(error)
        }
    }
}

export const roomController = new RoomController()
