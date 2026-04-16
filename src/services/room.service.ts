import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs/promises';
import { RoomModel } from '../models/room.model';
import { RoomMemberModel } from '../models/roomMember.model';
import { UserModel } from '../models/user.model';
import { RoomRole } from '../types/database';
import { config } from '../config';
import logger from '../config/logger';
import { AppError } from '../utils/appError';
import { getYjsWebSocketServer } from '../yjs';

interface CreateRoomParams {
    name: string;
    description?: string;
    is_private?: boolean;
    password?: string;
    settings?: object;
    owner_id: string;
}

interface JoinRoomParams {
    room_id: string;
    user_id: string;
    password?: string;
}

interface InviteUserParams {
    room_id: string;
    inviter_id: string;
    email: string;
    role?: RoomRole;
}

interface UpdatePermissionsParams {
    room_id: string;
    requester_id: string;
    member_id: string;
    new_role: RoomRole;
}

interface RelayTokenPayload {
    room_id: string;
    user_id: string;
    role?: RoomRole;
    can_write?: boolean;
}

interface RoomCapabilities {
    can_view: boolean;
    can_edit: boolean;
    can_manage_members: boolean;
    can_manage_room: boolean;
    can_upload_assets: boolean;
    can_manage_snapshots: boolean;
    can_delete_room: boolean;
}

export class RoomService {
    private getDefaultJoinRole(room: { settings?: any | null }): RoomRole {
        const configuredRole = room?.settings?.permissions?.defaultRole;
        return this.normalizeRole(configuredRole) || RoomRole.EDITOR;
    }

    private normalizeRole(role: RoomRole | string | null | undefined): RoomRole | null {
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

    private buildCapabilities(role: RoomRole | string | null): RoomCapabilities {
        const normalizedRole = this.normalizeRole(role);
        const canView = normalizedRole !== null;
        const canEdit = normalizedRole === RoomRole.OWNER || normalizedRole === RoomRole.ADMIN || normalizedRole === RoomRole.EDITOR;

        return {
            can_view: canView,
            can_edit: canEdit,
            can_manage_members: normalizedRole === RoomRole.OWNER || normalizedRole === RoomRole.ADMIN,
            can_manage_room: normalizedRole === RoomRole.OWNER || normalizedRole === RoomRole.ADMIN,
            can_upload_assets: canEdit,
            can_manage_snapshots: normalizedRole === RoomRole.OWNER || normalizedRole === RoomRole.ADMIN,
            can_delete_room: normalizedRole === RoomRole.OWNER,
        };
    }

    private async getUserRole(roomId: string, userId?: string): Promise<RoomRole | null> {
        if (!userId) {
            return null;
        }

        const membership = await RoomMemberModel.findByRoomAndUser(roomId, userId);
        return this.normalizeRole(membership?.role || null);
    }

    private canAccessRoom(room: { is_private: boolean }, role: RoomRole | null): boolean {
        return !room.is_private || role !== null;
    }

    private getJoinPreview(room: { id: string; name: string; description?: string | null; is_private: boolean; settings?: unknown; owner_id: string; created_at: Date; updated_at: Date }, memberCount: number, userRole: RoomRole | null) {
        return {
            id: room.id,
            name: room.name,
            description: room.description || '',
            is_private: room.is_private,
            owner_id: room.owner_id,
            created_at: room.created_at,
            updated_at: room.updated_at,
            member_count: memberCount,
            user_role: userRole,
            capabilities: this.buildCapabilities(userRole),
            access_scope: userRole ? 'member' : 'preview',
        };
    }

    async createRoom(params: CreateRoomParams) {
        try {
            let hashedPassword = null;
            if (params.is_private && params.password) {
                hashedPassword = await bcrypt.hash(params.password, 10);
            }

            const room = await RoomModel.create({
                name: params.name,
                description: params.description,
                is_private: params.is_private || false,
                password: hashedPassword,
                settings: params.settings,
                owner_id: params.owner_id,
            });

            await RoomMemberModel.create({
                room_id: room.id,
                user_id: params.owner_id,
                role: RoomRole.OWNER,
            });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...roomWithoutPassword } = room;

            return {
                room: roomWithoutPassword,
                user_role: RoomRole.OWNER,
                capabilities: this.buildCapabilities(RoomRole.OWNER),
            };
        } catch (error) {
            logger.error('Error creating room:', error);
            throw error;
        }
    }

    async getRooms(filterUserId?: string, currentUserId?: string, limit = 50, offset = 0) {
        try {
            let rooms;

            if (filterUserId) {
                const members = await RoomMemberModel.findByUserId(filterUserId);
                const roomIds = members.map((m) => m.room_id);

                if (roomIds.length === 0) {
                    return { rooms: [], total: 0 };
                }

                rooms = await Promise.all(roomIds.map((id) => RoomModel.findById(id)));
                rooms = rooms.filter((r) => r !== null);
            } else {
                rooms = await RoomModel.findPublicRooms(limit, offset);
            }

            const enrichedRooms = await Promise.all(
                rooms.map(async (room) => {
                    if (!room) return null;

                    const owner = await UserModel.findById(room.owner_id);
                    const members = await RoomMemberModel.findByRoomId(room.id);
                    const userRole = currentUserId
                        ? this.normalizeRole(members.find((m) => m.user_id === currentUserId)?.role || null)
                        : null;

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
                        member_count: members.length,
                        user_role: userRole,
                        capabilities: this.buildCapabilities(userRole),
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

    async getAllRooms(currentUserId?: string, limit = 50, offset = 0) {
        try {
            const rooms = await RoomModel.findAllRooms(limit, offset);

            const enrichedRooms = await Promise.all(
                rooms.map(async (room) => {
                    if (!room) return null;

                    const userRole = await this.getUserRole(room.id, currentUserId);
                    if (!this.canAccessRoom(room, userRole)) {
                        return null;
                    }

                    const owner = await UserModel.findById(room.owner_id);
                    const members = await RoomMemberModel.findByRoomId(room.id);

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
                        member_count: members.length,
                        user_role: userRole,
                        capabilities: this.buildCapabilities(userRole),
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

    async getRoomById(roomId: string, userId?: string) {
        try {
            const room = await RoomModel.findById(roomId);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            const userRole = await this.getUserRole(roomId, userId);
            if (!this.canAccessRoom(room, userRole)) {
                throw new AppError('Access denied', 403);
            }

            const members = await RoomMemberModel.findByRoomId(roomId);
            const memberCount = members.length;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...roomWithoutPassword } = room;

            if (!userRole) {
                return {
                    room: this.getJoinPreview(roomWithoutPassword, memberCount, null),
                    members: memberCount,
                    user_role: null,
                    capabilities: this.buildCapabilities(null),
                    access_scope: 'preview',
                };
            }

            return {
                room: roomWithoutPassword,
                members: memberCount,
                user_role: userRole,
                capabilities: this.buildCapabilities(userRole),
                access_scope: 'member',
            };
        } catch (error) {
            logger.error('Error getting room by id:', error);
            throw error;
        }
    }

    async getRoomMembers(roomId: string, requesterId?: string) {
        try {
            const requesterRole = await this.getUserRole(roomId, requesterId);
            if (!requesterRole) {
                throw new AppError('Access denied', 403);
            }

            const members = await RoomMemberModel.findByRoomId(roomId);
            const detailedMembers = await RoomMemberModel.findDetailedByRoomId(roomId);
            const detailedByMemberId = new Map(detailedMembers.map((member) => [member.id, member]));

            const enrichedMembers = await Promise.all(
                members.map(async (member) => {
                    const detailedMember = detailedByMemberId.get(member.id);
                    const fallbackUser = detailedMember?.username ? null : await UserModel.findById(member.user_id);
                    const username = detailedMember?.username || fallbackUser?.username || '';
                    const email = detailedMember?.email || fallbackUser?.email || '';

                    return {
                        id: member.id,
                        room_id: member.room_id,
                        user_id: member.user_id,
                        role: this.normalizeRole(member.role) || RoomRole.EDITOR,
                        joined_at: member.joined_at,
                        user: username || email
                            ? {
                                id: member.user_id,
                                username: username || member.user_id,
                                email: email || undefined,
                            }
                            : null,
                    };
                })
            );

            return {
                members: enrichedMembers,
                total: enrichedMembers.length,
                requester_role: requesterRole,
                capabilities: this.buildCapabilities(requesterRole),
            };
        } catch (error) {
            logger.error('Error getting room members:', error);
            throw error;
        }
    }

    async joinRoom(params: JoinRoomParams) {
        try {
            const { room_id, user_id, password } = params;

            const room = await RoomModel.findById(room_id);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            const existingMember = await RoomMemberModel.findByRoomAndUser(room_id, user_id);
            if (existingMember) {
                throw new AppError('User is already a member of this room', 409);
            }

            if (room.is_private && room.password) {
                if (!password) {
                    throw new AppError('Password required for private room', 400);
                }

                const isPasswordValid = await bcrypt.compare(password, room.password);
                if (!isPasswordValid) {
                    throw new AppError('Invalid room password', 401);
                }
            }

            const defaultJoinRole = this.getDefaultJoinRole(room);
            const member = await RoomMemberModel.create({
                room_id,
                user_id,
                role: defaultJoinRole,
            });

            const normalizedRole = this.normalizeRole(member.role) || defaultJoinRole;

            return {
                member: {
                    ...member,
                    role: normalizedRole,
                },
                user_role: normalizedRole,
                capabilities: this.buildCapabilities(normalizedRole),
            };
        } catch (error) {
            logger.error('Error joining room:', error);
            throw error;
        }
    }

    async inviteUser(params: InviteUserParams) {
        try {
            const { room_id, inviter_id, email, role } = params;

            const inviterMember = await RoomMemberModel.findByRoomAndUser(room_id, inviter_id);
            if (!inviterMember) {
                throw new AppError('Inviter is not a member of this room', 403);
            }

            if (inviterMember.role !== RoomRole.OWNER && inviterMember.role !== RoomRole.ADMIN) {
                throw new AppError('Only owners and admins can invite users', 403);
            }

            const invitedUser = await UserModel.findByEmail(email);
            if (!invitedUser) {
                throw new AppError('User not found', 404);
            }

            const existingMember = await RoomMemberModel.findByRoomAndUser(room_id, invitedUser.id);
            if (existingMember) {
                throw new AppError('User is already a member of this room', 409);
            }

            const member = await RoomMemberModel.create({
                room_id,
                user_id: invitedUser.id,
                role: this.normalizeRole(role || RoomRole.EDITOR) || RoomRole.EDITOR,
            });

            return {
                member: {
                    ...member,
                    role: this.normalizeRole(member.role) || RoomRole.EDITOR,
                }
            };
        } catch (error) {
            logger.error('Error inviting user:', error);
            throw error;
        }
    }

    async updatePermissions(params: UpdatePermissionsParams) {
        try {
            const { room_id, requester_id, member_id, new_role } = params;

            const requesterMember = await RoomMemberModel.findByRoomAndUser(room_id, requester_id);
            if (!requesterMember) {
                throw new AppError('Requester is not a member of this room', 403);
            }

            const requesterRole = this.normalizeRole(requesterMember.role);
            if (requesterRole !== RoomRole.OWNER && requesterRole !== RoomRole.ADMIN) {
                throw new AppError('Only owners and admins can update permissions', 403);
            }

            const targetMember = await RoomMemberModel.findById(member_id);
            if (!targetMember || targetMember.room_id !== room_id) {
                throw new AppError('Member not found in this room', 404);
            }

            const targetRole = this.normalizeRole(targetMember.role);
            const nextRole = this.normalizeRole(new_role);

            if (!nextRole) {
                throw new AppError('Invalid role', 400);
            }

            if (targetRole === RoomRole.OWNER && requesterRole !== RoomRole.OWNER) {
                throw new AppError('Cannot modify owner permissions', 403);
            }

            if (requesterRole === RoomRole.ADMIN) {
                if (targetRole === RoomRole.ADMIN || nextRole === RoomRole.ADMIN || targetRole === RoomRole.OWNER || nextRole === RoomRole.OWNER) {
                    throw new AppError('Admins can only manage editors and viewers', 403);
                }
            }

            const updatedMember = await RoomMemberModel.updateRole(member_id, nextRole);

            getYjsWebSocketServer()?.broadcastRoomEvent(room_id, {
                type: 'room_permissions_updated',
                roomId: room_id,
                targetUserId: targetMember.user_id,
                memberId: member_id,
                role: nextRole,
                actorUserId: requester_id,
            });

            return {
                member: updatedMember
                    ? {
                        ...updatedMember,
                        role: this.normalizeRole(updatedMember.role) || nextRole,
                    }
                    : updatedMember
            };
        } catch (error) {
            logger.error('Error updating permissions:', error);
            throw error;
        }
    }

    async deleteRoom(params: { room_id: string; user_id: string; password?: string }) {
        try {
            const { room_id, user_id, password } = params;

            const room = await RoomModel.findById(room_id);
            if (!room) {
                throw new AppError('Room not found', 404);
            }

            if (room.owner_id !== user_id) {
                throw new AppError('Only room owner can delete the room', 403);
            }

            if (room.is_private && room.password) {
                if (!password) {
                    throw new AppError('Password required for private room', 400);
                }

                const passwordMatch = await bcrypt.compare(password, room.password);
                if (!passwordMatch) {
                    throw new AppError('Incorrect password', 401);
                }
            }

            const deleted = await RoomModel.delete(room_id);
            if (!deleted) {
                throw new AppError('Failed to delete room', 500);
            }

            logger.info(`Room ${room_id} deleted by user ${user_id}`);

            try {
                const assetsDir = path.join(process.cwd(), 'uploads', 'assets', room_id);
                await fs.rm(assetsDir, { recursive: true, force: true });
                logger.info(`Assets directory removed for room ${room_id}`);
            } catch (err) {
                logger.error(`Failed to remove assets for room ${room_id}:`, err);
            }

            return { success: true };
        } catch (error) {
            logger.error('Error deleting room:', error);
            throw error;
        }
    }

    async generateRelayToken(params: RelayTokenPayload) {
        try {
            const { room_id, user_id } = params;

            const member = await RoomMemberModel.findByRoomAndUser(room_id, user_id);
            if (!member) {
                throw new AppError('User is not a member of this room', 403);
            }

            const capabilities = this.buildCapabilities(member.role);
            const payload: RelayTokenPayload = {
                room_id,
                user_id,
                role: this.normalizeRole(member.role) || RoomRole.EDITOR,
                can_write: capabilities.can_edit,
            };

            const token = jwt.sign(payload, config.jwt.secret, {
                expiresIn: '15m',
            });

            return {
                relay_token: token,
                user_role: this.normalizeRole(member.role) || RoomRole.EDITOR,
                capabilities,
            };
        } catch (error) {
            logger.error('Error generating relay token:', error);
            throw error;
        }
    }
}

export const roomService = new RoomService();

