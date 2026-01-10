import { db } from '../config/database';
import { Room, CreateRoomParams } from '../types/database';
import logger from '../config/logger';

/**
 * 房间模型 - 处理房间数据的 CRUD 操作
 */
export class RoomModel {
    /**
     * 创建新房间
     */
    static async create(params: CreateRoomParams): Promise<Room> {
        const query = `
      INSERT INTO rooms (name, is_private, password, settings, owner_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

        try {
            const result = await db.query<Room>(query, [
                params.name,
                params.is_private || false,
                params.password || null,
                params.settings ? JSON.stringify(params.settings) : null,
                params.owner_id,
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating room:', error);
            throw error;
        }
    }

    /**
     * 根据 ID 查找房间
     */
    static async findById(id: string): Promise<Room | null> {
        const query = 'SELECT * FROM rooms WHERE id = $1';

        try {
            const result = await db.query<Room>(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding room by id:', error);
            throw error;
        }
    }

    /**
     * 根据房主 ID 查找房间
     */
    static async findByOwnerId(ownerId: string): Promise<Room[]> {
        const query = `
      SELECT * FROM rooms
      WHERE owner_id = $1
      ORDER BY created_at DESC
    `;

        try {
            const result = await db.query<Room>(query, [ownerId]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding rooms by owner:', error);
            throw error;
        }
    }

    /**
     * 获取公开房间列表
     */
    static async findPublicRooms(limit = 50, offset = 0): Promise<Room[]> {
        const query = `
      SELECT * FROM rooms
      WHERE is_private = false
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

        try {
            const result = await db.query<Room>(query, [limit, offset]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding public rooms:', error);
            throw error;
        }
    }

    /**
     * 更新房间信息
     */
    static async update(id: string, updates: Partial<Room>): Promise<Room | null> {
        const allowedFields = ['name', 'is_private', 'password', 'settings'];
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            if (allowedFields.includes(key)) {
                if (key === 'settings' && typeof value === 'object') {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE rooms
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        try {
            const result = await db.query<Room>(query, values);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error updating room:', error);
            throw error;
        }
    }

    /**
     * 删除房间
     */
    static async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM rooms WHERE id = $1';

        try {
            const result = await db.query(query, [id]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            logger.error('Error deleting room:', error);
            throw error;
        }
    }

    /**
     * 获取所有房间（分页）
     */
    static async findAll(limit = 50, offset = 0): Promise<Room[]> {
        const query = `
      SELECT * FROM rooms
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

        try {
            const result = await db.query<Room>(query, [limit, offset]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding all rooms:', error);
            throw error;
        }
    }

    /**
     * 统计房间总数
     */
    static async count(): Promise<number> {
        const query = 'SELECT COUNT(*) as count FROM rooms';

        try {
            const result = await db.query<{ count: string }>(query);
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            logger.error('Error counting rooms:', error);
            throw error;
        }
    }

    /**
     * 搜索房间（按名称）
     */
    static async search(keyword: string, limit = 50): Promise<Room[]> {
        const query = `
      SELECT * FROM rooms
      WHERE name ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

        try {
            const result = await db.query<Room>(query, [`%${keyword}%`, limit]);
            return result.rows;
        } catch (error) {
            logger.error('Error searching rooms:', error);
            throw error;
        }
    }
}
