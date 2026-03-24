import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { User, CreateUserParams } from '../types/database';
import logger from '../config/logger';

/**
 * 用户模型 - 处理用户数据的 CRUD 操作
 */
export class UserModel {
    /**
     * 创建新用户
     */
    static async create(params: CreateUserParams): Promise<User> {
        const userId = randomUUID();
        const query = `
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

        try {
            const result = await db.query<User>(query, [
                userId,
                params.username,
                params.email,
                params.password_hash,
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * 根据 ID 查找用户
     */
    static async findById(id: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = $1';

        try {
            const result = await db.query<User>(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding user by id:', error);
            throw error;
        }
    }

    /**
     * 根据邮箱查找用户
     */
    static async findByEmail(email: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE email = $1';

        try {
            const result = await db.query<User>(query, [email]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * 根据用户名查找用户
     */
    static async findByUsername(username: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE username = $1';

        try {
            const result = await db.query<User>(query, [username]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding user by username:', error);
            throw error;
        }
    }

    /**
     * 更新用户信息
     */
    static async update(id: string, updates: Partial<User>): Promise<User | null> {
        const allowedFields = ['username', 'email', 'password_hash'];
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            return this.findById(id);
        }

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

        try {
            const result = await db.query<User>(query, values);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * 删除用户
     */
    static async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM users WHERE id = $1';

        try {
            const result = await db.query(query, [id]);
            return (result.rowCount ?? result.rows.length) > 0;
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }

    /**
     * 获取所有用户（分页）
     */
    static async findAll(limit = 50, offset = 0): Promise<User[]> {
        const query = `
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

        try {
            const result = await db.query<User>(query, [limit, offset]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding all users:', error);
            throw error;
        }
    }

    /**
     * 统计用户总数
     */
    static async count(): Promise<number> {
        const query = 'SELECT COUNT(*) as count FROM users';

        try {
            const result = await db.query<{ count: string }>(query);
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            logger.error('Error counting users:', error);
            throw error;
        }
    }
}
