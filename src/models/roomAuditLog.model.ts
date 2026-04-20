import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { CreateRoomAuditLogParams, RoomAuditLog } from '../types/database';
import logger from '../config/logger';

export class RoomAuditLogModel {
    private static parseLog(log: any): RoomAuditLog {
        if (!log) return log;

        if (log.metadata && typeof log.metadata === 'string') {
            try {
                log.metadata = JSON.parse(log.metadata);
            } catch (error) {
                logger.error('Error parsing audit metadata:', error);
                log.metadata = null;
            }
        }

        return log;
    }

    static async create(params: CreateRoomAuditLogParams): Promise<RoomAuditLog> {
        const id = randomUUID();
        const query = `
      INSERT INTO room_audit_logs (id, room_id, actor_user_id, target_user_id, action, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

        try {
            const result = await db.query<RoomAuditLog>(query, [
                id,
                params.room_id,
                params.actor_user_id || null,
                params.target_user_id || null,
                params.action,
                params.metadata ? JSON.stringify(params.metadata) : null,
            ]);

            return this.parseLog(result.rows[0]);
        } catch (error) {
            logger.error('Error creating room audit log:', error);
            throw error;
        }
    }

    static async findByRoomId(roomId: string, limit = 100, offset = 0): Promise<RoomAuditLog[]> {
        const query = `
      SELECT * FROM room_audit_logs
      WHERE room_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

        try {
            const result = await db.query<RoomAuditLog>(query, [roomId, limit, offset]);
            return result.rows.map((row) => this.parseLog(row));
        } catch (error) {
            logger.error('Error finding room audit logs:', error);
            throw error;
        }
    }
}
