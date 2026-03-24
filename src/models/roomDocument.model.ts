import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { RoomDocument, CreateRoomDocumentParams } from '../types/database';
import logger from '../config/logger';

/**
 * Yjs 房间文档模型 - 处理 Yjs 文档持久化的 CRUD 操作
 */
export class RoomDocumentModel {
    /**
     * 创建或更新房间文档
     */
    static async upsert(params: CreateRoomDocumentParams): Promise<RoomDocument> {
        const docId = randomUUID();
        const docName = params.doc_name || 'room';
        const docData = params.doc_data;
        const version = params.version || 1;
        const isSnapshot = params.is_snapshot || false;

        // 先检查是否存在
        const existing = await this.findByRoomAndDoc(params.room_id, docName);

        if (existing) {
            // 更新现有记录
            const query = `
        UPDATE room_documents
        SET doc_data = $1, version = $2, is_snapshot = $3, updated_at = NOW()
        WHERE room_id = $4 AND doc_name = $5
        RETURNING *
      `;

            try {
                const result = await db.query<RoomDocument>(query, [
                    docData,
                    version,
                    isSnapshot,
                    params.room_id,
                    docName,
                ]);

                return result.rows[0];
            } catch (error) {
                logger.error('Error updating room document:', error);
                throw error;
            }
        } else {
            // 创建新记录
            const query = `
        INSERT INTO room_documents (id, room_id, doc_name, doc_data, version, is_snapshot, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;

            try {
                const result = await db.query<RoomDocument>(query, [
                    docId,
                    params.room_id,
                    docName,
                    docData,
                    version,
                    isSnapshot,
                ]);

                return result.rows[0];
            } catch (error) {
                logger.error('Error creating room document:', error);
                throw error;
            }
        }
    }

    /**
     * 根据房间 ID 和文档名称查找文档
     */
    static async findByRoomAndDoc(roomId: string, docName = 'room'): Promise<RoomDocument | null> {
        const query = `
      SELECT * FROM room_documents
      WHERE room_id = $1 AND doc_name = $2
    `;

        try {
            const result = await db.query<RoomDocument>(query, [roomId, docName]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding room document:', error);
            throw error;
        }
    }

    /**
     * 查找房间的所有文档
     */
    static async findByRoomId(roomId: string): Promise<RoomDocument[]> {
        const query = `
      SELECT * FROM room_documents
      WHERE room_id = $1
      ORDER BY updated_at DESC
    `;

        try {
            const result = await db.query<RoomDocument>(query, [roomId]);
            return result.rows;
        } catch (error) {
            logger.error('Error finding room documents:', error);
            throw error;
        }
    }

    /**
     * 获取房间文档的最新快照
     */
    static async getLatestSnapshot(roomId: string, docName = 'room'): Promise<RoomDocument | null> {
        const query = `
      SELECT * FROM room_documents
      WHERE room_id = $1 AND doc_name = $2 AND is_snapshot = true
      ORDER BY version DESC, updated_at DESC
      LIMIT 1
    `;

        try {
            const result = await db.query<RoomDocument>(query, [roomId, docName]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding latest snapshot:', error);
            throw error;
        }
    }

    /**
     * 创建文档快照
     */
    static async createSnapshot(
        roomId: string,
        docName: string,
        docData: Buffer,
        version: number
    ): Promise<RoomDocument> {
        const query = `
      INSERT INTO room_documents (room_id, doc_name, doc_data, version, is_snapshot, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `;

        try {
            const result = await db.query<RoomDocument>(query, [roomId, docName, docData, version]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating document snapshot:', error);
            throw error;
        }
    }

    /**
     * 更新文档数据和版本
     */
    static async update(
        roomId: string,
        docName: string,
        docData: Buffer,
        version: number
    ): Promise<RoomDocument | null> {
        const query = `
      UPDATE room_documents
      SET doc_data = $3, version = $4, updated_at = NOW()
      WHERE room_id = $1 AND doc_name = $2
      RETURNING *
    `;

        try {
            const result = await db.query<RoomDocument>(query, [roomId, docName, docData, version]);

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error updating room document:', error);
            throw error;
        }
    }

    /**
     * 删除房间文档
     */
    static async delete(roomId: string, docName: string): Promise<boolean> {
        const query = 'DELETE FROM room_documents WHERE room_id = $1 AND doc_name = $2';

        try {
            const result = await db.query(query, [roomId, docName]);
            return (result.rowCount ?? result.rows.length) > 0;
        } catch (error) {
            logger.error('Error deleting room document:', error);
            throw error;
        }
    }

    /**
     * 删除房间的所有文档
     */
    static async deleteByRoomId(roomId: string): Promise<number> {
        const query = 'DELETE FROM room_documents WHERE room_id = $1';

        try {
            const result = await db.query(query, [roomId]);
            return result.rowCount ?? 0;
        } catch (error) {
            logger.error('Error deleting all room documents:', error);
            throw error;
        }
    }

    /**
     * 清理旧快照（保留最近 N 个）
     */
    static async cleanOldSnapshots(
        roomId: string,
        docName: string,
        keepCount = 5
    ): Promise<number> {
        const query = `
      DELETE FROM room_documents
      WHERE id IN (
        SELECT id FROM room_documents
        WHERE room_id = $1 AND doc_name = $2 AND is_snapshot = true
        ORDER BY version DESC, updated_at DESC
        OFFSET $3
      )
    `;

        try {
            const result = await db.query(query, [roomId, docName, keepCount]);
            return result.rowCount ?? 0;
        } catch (error) {
            logger.error('Error cleaning old snapshots:', error);
            throw error;
        }
    }

    /**
     * 获取文档大小统计
     */
    static async getDocumentSize(roomId: string, docName: string): Promise<number> {
        const query = `
      SELECT LENGTH(doc_data) as size
      FROM room_documents
      WHERE room_id = $1 AND doc_name = $2
    `;

        try {
            const result = await db.query<{ size: number }>(query, [roomId, docName]);
            return result.rows[0]?.size || 0;
        } catch (error) {
            logger.error('Error getting document size:', error);
            throw error;
        }
    }
}
