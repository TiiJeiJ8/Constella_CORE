import { db } from '../config/database';
import { RoomMember, CreateRoomMemberParams, RoomRole } from '../types/database';
import logger from '../config/logger';

/**
 * 房间成员模型 - 处理房间成员关系的 CRUD 操作
 */
export class RoomMemberModel {
    /**
     * 添加房间成员
     */
    static async create(params: CreateRoomMemberParams): Promise<RoomMember> {
        const query = `
      INSERT INTO room_members (room_id, user_id, role, joined_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;

        try {
            const result = await db.query<RoomMember>(query, [
                params.room_id,
                params.user_id,
                params.role || RoomRole.MEMBER,
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating room member:', error);
            throw error;
        }
    }

    /**
     * 根据 ID 查找房间成员
     */
    static async findById(id: string): Promise<RoomMember | null> {
        const query = 'SELECT * FROM room_members WHERE id = $1';

        try {
            const result = await db.query<RoomMember>(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding room member by id:', error);
            throw error;
        }
    }

    /**
     * 查找房间的所有成员
     */
    static async findByRoomId(roomId: string): Promise<RoomMember[]> {
        const query = `
      SELECT * FROM room_members
      WHERE room_id = $1
      ORDER BY joined_at ASC
    `;

        try {
            const result = await db.query<RoomMember>(query, [roomId]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding room members:', error);
            throw error;
        }
    }

    /**
     * 查找用户参与的所有房间
     */
    static async findByUserId(userId: string): Promise<RoomMember[]> {
        const query = `
      SELECT * FROM room_members
      WHERE user_id = $1
      ORDER BY joined_at DESC
    `;

        try {
            const result = await db.query<RoomMember>(query, [userId]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding user rooms:', error);
            throw error;
        }
    }

    /**
     * 查找特定用户在特定房间的成员记录
     */
    static async findByRoomAndUser(roomId: string, userId: string): Promise<RoomMember | null> {
        const query = `
      SELECT * FROM room_members
      WHERE room_id = $1 AND user_id = $2
    `;

        try {
            const result = await db.query<RoomMember>(query, [roomId, userId]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding room member:', error);
            throw error;
        }
    }

    /**
     * 更新成员角色
     */
    static async updateRole(id: string, role: RoomRole): Promise<RoomMember | null> {
        const query = `
      UPDATE room_members
      SET role = $1
      WHERE id = $2
      RETURNING *
    `;

        try {
            const result = await db.query<RoomMember>(query, [role, id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error updating room member role:', error);
            throw error;
        }
    }

    /**
     * 移除房间成员
     */
    static async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM room_members WHERE id = $1';

        try {
            const result = await db.query(query, [id]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            logger.error('Error deleting room member:', error);
            throw error;
        }
    }

    /**
     * 通过房间和用户 ID 移除成员
     */
    static async deleteByRoomAndUser(roomId: string, userId: string): Promise<boolean> {
        const query = 'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2';

        try {
            const result = await db.query(query, [roomId, userId]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            logger.error('Error deleting room member:', error);
            throw error;
        }
    }

    /**
     * 检查用户是否是房间成员
     */
    static async isMember(roomId: string, userId: string): Promise<boolean> {
        const member = await this.findByRoomAndUser(roomId, userId);
        return member !== null;
    }

    /**
     * 检查用户是否是房间所有者
     */
    static async isOwner(roomId: string, userId: string): Promise<boolean> {
        const member = await this.findByRoomAndUser(roomId, userId);
        return member?.role === RoomRole.OWNER;
    }

    /**
     * 检查用户是否是房间管理员（包括所有者）
     */
    static async isAdmin(roomId: string, userId: string): Promise<boolean> {
        const member = await this.findByRoomAndUser(roomId, userId);
        return member?.role === RoomRole.OWNER || member?.role === RoomRole.ADMIN;
    }

    /**
     * 统计房间成员数量
     */
    static async countByRoomId(roomId: string): Promise<number> {
        const query = 'SELECT COUNT(*) as count FROM room_members WHERE room_id = $1';

        try {
            const result = await db.query<{ count: string }>(query, [roomId]);
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            logger.error('Error counting room members:', error);
            throw error;
        }
    }
}
