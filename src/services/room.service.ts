import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RoomModel } from '../models/room.model';
import { RoomMemberModel } from '../models/roomMember.model';
import { UserModel } from '../models/user.model';
import { RoomRole } from '../types/database';
import { config } from '../config';
import logger from '../config/logger';
import { AppError } from '../utils/appError';

/**
 * 创建房间参数
 */
interface CreateRoomParams {
    name: string;
    description?: string;
    is_private?: boolean;
    password?: string;
    settings?: object;
    owner_id: string;
}

/**
 * 加入房间参数
 */
interface JoinRoomParams {
    room_id: string;
    user_id: string;
    password?: string;
}

/**
 * 邀请用户参数
 */
interface InviteUserParams {
    room_id: string;
    inviter_id: string;
    email: string;
    role?: RoomRole;
}

/**
 * 更新权限参数
 */
interface UpdatePermissionsParams {
    room_id: string;
    requester_id: string;
    member_id: string;
    new_role: RoomRole;
}

/**
 * Relay Token Payload
 */
interface RelayTokenPayload {
    room_id: string;
    user_id: string;
}

/**
 * 房间服务
 */
export class RoomService {
    /**
     * 创建新房间
     */
    async createRoom(params: CreateRoomParams) {
        try {
            // 如果是私有房间且有密码，对密码进行哈希
            let hashedPassword = null;
            if (params.is_private && params.password) {
                const saltRounds = 10;
                hashedPassword = await bcrypt.hash(params.password, saltRounds);
            }

            // 创建房间
            const room = await RoomModel.create({
                name: params.name,
                description: params.description,
                is_private: params.is_private || false,
                password: hashedPassword,
                settings: params.settings,
                owner_id: params.owner_id,
            });

            // 自动将创建者添加为房间成员（owner角色）
            await RoomMemberModel.create({
                room_id: room.id,
                user_id: params.owner_id,
                role: RoomRole.OWNER,
            });

            // 返回时不包含密码
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...roomWithoutPassword } = room;

            return { room: roomWithoutPassword };
        } catch (error) {
            logger.error('Error creating room:', error);
            throw error;
        }
    }

    /**
     * 获取房间列表（支持分页和按用户过滤）
     */
    async getRooms(filterUserId?: string, currentUserId?: string, limit = 50, offset = 0) {
        try {
            let rooms;

            if (filterUserId) {
                // 获取用户参与的所有房间
                const members = await RoomMemberModel.findByUserId(filterUserId);
                const roomIds = members.map((m) => m.room_id);

                if (roomIds.length === 0) {
                    return { rooms: [], total: 0 };
                }

                rooms = await Promise.all(roomIds.map((id) => RoomModel.findById(id)));
                rooms = rooms.filter((r) => r !== null);
            } else {
                // 获取所有公开房间
                rooms = await RoomModel.findPublicRooms(limit, offset);
            }

            // 为每个房间添加额外信息
            const enrichedRooms = await Promise.all(
                rooms.map(async (room) => {
                    if (!room) return null;

                    // 获取房主信息
                    const owner = await UserModel.findById(room.owner_id);

                    // 获取成员数量
                    const members = await RoomMemberModel.findByRoomId(room.id);
                    const member_count = members.length;

                    // 获取当前用户角色（如果提供了 currentUserId）
                    let user_role = null;
                    if (currentUserId) {
                        const membership = members.find((m) => m.user_id === currentUserId);
                        user_role = membership ? membership.role : null;
                    }

                    // 移除密码字段
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { password, ...roomData } = room;

                    return {
                        ...roomData,
                        owner: owner
                            ? {
                                id: owner.id,
                                username: owner.username,
                                email: owner.email,
                            }
                            : null,
                        member_count,
                        user_role,
                    };
                })
            );

            const validRooms = enrichedRooms.filter((r) => r !== null);

            return {
                rooms: validRooms,
                total: validRooms.length,
            };
        } catch (error) {
            logger.error('Error getting rooms:', error);
            throw error;
        }
    }

    /**
     * 获取所有房间（公开+私密）
     */
    async getAllRooms(currentUserId?: string, limit = 50, offset = 0) {
        try {
            // 获取所有房间（不过滤is_private）
            const rooms = await RoomModel.findAllRooms(limit, offset);

            // 为每个房间添加额外信息
            const enrichedRooms = await Promise.all(
                rooms.map(async (room) => {
                    if (!room) return null;

                    // 获取房主信息
                    const owner = await UserModel.findById(room.owner_id);

                    // 获取成员数量
                    const members = await RoomMemberModel.findByRoomId(room.id);
                    const member_count = members.length;

                    // 获取当前用户角色
                    let user_role = null;
                    if (currentUserId) {
                        const membership = members.find((m) => m.user_id === currentUserId);
                        user_role = membership ? membership.role : null;
                    }

                    // 移除密码字段
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { password, ...roomData } = room;

                    return {
                        ...roomData,
                        owner: owner
                            ? {
                                id: owner.id,
                                username: owner.username,
                                email: owner.email,
                            }
                            : null,
                        member_count,
                        user_role,
                    };
                })
            );

            const validRooms = enrichedRooms.filter((r) => r !== null);

            return {
                rooms: validRooms,
                total: validRooms.length,
            };
        } catch (error) {
            logger.error('Error getting all rooms:', error);
            throw error;
        }
    }

    /**
     * 获取房间详情（含权限概览）
     */
    async getRoomById(roomId: string, userId?: string) {
        try {
            const room = await RoomModel.findById(roomId);

            if (!room) {
                throw new AppError('Room not found', 404);
            }

            // 获取房间成员
            const members = await RoomMemberModel.findByRoomId(roomId);

            // 查找当前用户的权限
            let userRole = null;
            if (userId) {
                const userMember = members.find((m) => m.user_id === userId);
                userRole = userMember ? userMember.role : null;
            }

            // 移除密码字段
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...roomWithoutPassword } = room;

            return {
                room: roomWithoutPassword,
                members: members.length,
                user_role: userRole,
            };
        } catch (error) {
            logger.error('Error getting room by id:', error);
            throw error;
        }
    }

    /**
     * 加入房间
     */
    async joinRoom(params: JoinRoomParams) {
        try {
            const { room_id, user_id, password } = params;

            // 检查房间是否存在
            const room = await RoomModel.findById(room_id);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            // 检查用户是否已经是成员
            const existingMember = await RoomMemberModel.findByRoomAndUser(room_id, user_id);
            if (existingMember) {
                throw new AppError('User is already a member of this room', 409);
            }

            // 如果是私有房间，验证密码
            if (room.is_private && room.password) {
                if (!password) {
                    throw new AppError('Password required for private room', 400);
                }

                const isPasswordValid = await bcrypt.compare(password, room.password);
                if (!isPasswordValid) {
                    throw new AppError('Invalid room password', 401);
                }
            }

            // 添加用户为成员
            const member = await RoomMemberModel.create({
                room_id,
                user_id,
                role: RoomRole.MEMBER,
            });

            return { member };
        } catch (error) {
            logger.error('Error joining room:', error);
            throw error;
        }
    }

    /**
     * 邀请用户加入房间（房主或管理员权限）
     */
    async inviteUser(params: InviteUserParams) {
        try {
            const { room_id, inviter_id, email, role } = params;

            // 验证邀请者权限
            const inviterMember = await RoomMemberModel.findByRoomAndUser(room_id, inviter_id);
            if (!inviterMember) {
                throw new AppError('Inviter is not a member of this room', 403);
            }

            if (inviterMember.role !== RoomRole.OWNER && inviterMember.role !== RoomRole.ADMIN) {
                throw new AppError('Only owners and admins can invite users', 403);
            }

            // 查找被邀请用户
            const invitedUser = await UserModel.findByEmail(email);
            if (!invitedUser) {
                throw new AppError('User not found', 404);
            }

            // 检查用户是否已经是成员
            const existingMember = await RoomMemberModel.findByRoomAndUser(room_id, invitedUser.id);
            if (existingMember) {
                throw new AppError('User is already a member of this room', 409);
            }

            // 添加用户为成员
            const member = await RoomMemberModel.create({
                room_id,
                user_id: invitedUser.id,
                role: role || RoomRole.MEMBER,
            });

            return { member };
        } catch (error) {
            logger.error('Error inviting user:', error);
            throw error;
        }
    }

    /**
     * 更新成员权限（房主或管理员权限）
     */
    async updatePermissions(params: UpdatePermissionsParams) {
        try {
            const { room_id, requester_id, member_id, new_role } = params;

            // 验证请求者权限
            const requesterMember = await RoomMemberModel.findByRoomAndUser(room_id, requester_id);
            if (!requesterMember) {
                throw new AppError('Requester is not a member of this room', 403);
            }

            if (
                requesterMember.role !== RoomRole.OWNER &&
                requesterMember.role !== RoomRole.ADMIN
            ) {
                throw new AppError('Only owners and admins can update permissions', 403);
            }

            // 查找目标成员
            const targetMember = await RoomMemberModel.findById(member_id);
            if (!targetMember || targetMember.room_id !== room_id) {
                throw new AppError('Member not found in this room', 404);
            }

            // 不允许修改房主权限（除非自己是房主）
            if (targetMember.role === RoomRole.OWNER && requesterMember.role !== RoomRole.OWNER) {
                throw new AppError('Cannot modify owner permissions', 403);
            }

            // 更新权限
            const updatedMember = await RoomMemberModel.updateRole(member_id, new_role);

            return { member: updatedMember };
        } catch (error) {
            logger.error('Error updating permissions:', error);
            throw error;
        }
    }

    /**
     * 删除房间（仅房主可删除）
     */
    async deleteRoom(params: { room_id: string; user_id: string; password?: string }) {
        try {
            const { room_id, user_id, password } = params;

            // 获取房间信息
            const room = await RoomModel.findById(room_id);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            // 验证是否是房主
            if (room.owner_id !== user_id) {
                throw new AppError('Only room owner can delete the room', 403);
            }

            // 如果是私密房间，验证密码
            if (room.is_private && room.password) {
                if (!password) {
                    throw new AppError('Password required for private room', 400);
                }

                const passwordMatch = await bcrypt.compare(password, room.password);
                if (!passwordMatch) {
                    throw new AppError('Incorrect password', 401);
                }
            }

            // 删除房间（CASCADE 会自动删除关联的成员记录）
            const deleted = await RoomModel.delete(room_id);
            if (!deleted) {
                throw new AppError('Failed to delete room', 500);
            }

            logger.info(`Room ${room_id} deleted by user ${user_id}`);

            return { success: true };
        } catch (error) {
            logger.error('Error deleting room:', error);
            throw error;
        }
    }

    /**
     * 生成短期 Relay Token（用于 WSS 连接）
     */
    async generateRelayToken(params: RelayTokenPayload) {
        try {
            const { room_id, user_id } = params;

            // 验证用户是否是房间成员
            const member = await RoomMemberModel.findByRoomAndUser(room_id, user_id);
            if (!member) {
                throw new AppError('User is not a member of this room', 403);
            }

            // 生成短期 token（15分钟过期）
            const payload: RelayTokenPayload = {
                room_id,
                user_id,
            };

            const token = jwt.sign(payload, config.jwt.secret, {
                expiresIn: '15m',
            });

            return { relay_token: token };
        } catch (error) {
            logger.error('Error generating relay token:', error);
            throw error;
        }
    }
}

export const roomService = new RoomService();
