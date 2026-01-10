import { db } from '../config/database';
import { RefreshToken, CreateRefreshTokenParams } from '../types/database';
import logger from '../config/logger';

/**
 * 刷新令牌模型 - 处理刷新令牌的 CRUD 操作
 */
export class RefreshTokenModel {
    /**
     * 创建新的刷新令牌
     */
    static async create(params: CreateRefreshTokenParams): Promise<RefreshToken> {
        const query = `
      INSERT INTO refresh_tokens (user_id, token, expires_at, revoked, created_at)
      VALUES ($1, $2, $3, false, NOW())
      RETURNING *
    `;

        try {
            const result = await db.query<RefreshToken>(query, [
                params.user_id,
                params.token,
                params.expires_at,
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating refresh token:', error);
            throw error;
        }
    }

    /**
     * 根据 token 查找刷新令牌
     */
    static async findByToken(token: string): Promise<RefreshToken | null> {
        const query = 'SELECT * FROM refresh_tokens WHERE token = $1';

        try {
            const result = await db.query<RefreshToken>(query, [token]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding refresh token:', error);
            throw error;
        }
    }

    /**
     * 根据用户 ID 查找所有刷新令牌
     */
    static async findByUserId(userId: string): Promise<RefreshToken[]> {
        const query = `
      SELECT * FROM refresh_tokens
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

        try {
            const result = await db.query<RefreshToken>(query, [userId]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding refresh tokens by user:', error);
            throw error;
        }
    }

    /**
     * 撤销刷新令牌
     */
    static async revoke(token: string): Promise<boolean> {
        const query = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE token = $1
      RETURNING *
    `;

        try {
            const result = await db.query(query, [token]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            logger.error('Error revoking refresh token:', error);
            throw error;
        }
    }

    /**
     * 撤销用户的所有刷新令牌
     */
    static async revokeAllByUserId(userId: string): Promise<number> {
        const query = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE user_id = $1 AND revoked = false
    `;

        try {
            const result = await db.query(query, [userId]);
            return result.rowCount || 0;
        } catch (error) {
            logger.error('Error revoking all user tokens:', error);
            throw error;
        }
    }

    /**
     * 删除过期的刷新令牌
     */
    static async deleteExpired(): Promise<number> {
        const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
    `;

        try {
            const result = await db.query(query);
            return result.rowCount || 0;
        } catch (error) {
            logger.error('Error deleting expired tokens:', error);
            throw error;
        }
    }

    /**
     * 删除刷新令牌
     */
    static async delete(token: string): Promise<boolean> {
        const query = 'DELETE FROM refresh_tokens WHERE token = $1';

        try {
            const result = await db.query(query, [token]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            logger.error('Error deleting refresh token:', error);
            throw error;
        }
    }

    /**
     * 验证刷新令牌是否有效
     */
    static async isValid(token: string): Promise<boolean> {
        const query = `
      SELECT * FROM refresh_tokens
      WHERE token = $1
        AND revoked = false
        AND expires_at > NOW()
    `;

        try {
            const result = await db.query<RefreshToken>(query, [token]);
            return result.rows.length > 0;
        } catch (error) {
            logger.error('Error validating refresh token:', error);
            throw error;
        }
    }

    /**
     * 统计用户的有效令牌数量
     */
    static async countValidByUserId(userId: string): Promise<number> {
        const query = `
      SELECT COUNT(*) as count FROM refresh_tokens
      WHERE user_id = $1
        AND revoked = false
        AND expires_at > NOW()
    `;

        try {
            const result = await db.query<{ count: string }>(query, [userId]);
            return parseInt(result.rows[0].count, 10);
        } catch (error) {
            logger.error('Error counting valid tokens:', error);
            throw error;
        }
    }
}
