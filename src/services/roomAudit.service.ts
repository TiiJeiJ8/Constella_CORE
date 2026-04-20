import logger from '../config/logger';
import { RoomAuditAction } from '../types/database';
import { RoomAuditLogModel } from '../models/roomAuditLog.model';

interface RecordRoomAuditParams {
    room_id: string;
    actor_user_id?: string | null;
    target_user_id?: string | null;
    action: RoomAuditAction;
    metadata?: Record<string, any> | null;
}

class RoomAuditService {
    async record(params: RecordRoomAuditParams): Promise<void> {
        try {
            await RoomAuditLogModel.create(params);
        } catch (error) {
            logger.error('Failed to persist room audit log:', error);
        }
    }
}

export const roomAuditService = new RoomAuditService();
