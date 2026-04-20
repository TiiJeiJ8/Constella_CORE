import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { config } from '../config';
import { CreateRoomInvitationParams, RoomInvitation, RoomRole } from '../types/database';
import logger from '../config/logger';

export class RoomInvitationModel {
    static async create(params: CreateRoomInvitationParams): Promise<RoomInvitation> {
        const id = randomUUID();
        const persistedRole = params.role === RoomRole.EDITOR ? RoomRole.MEMBER : params.role;
                const isSqlite = (config.database.type || '').toLowerCase() === 'sqlite';
                const query = isSqlite
                        ? `
            INSERT INTO room_invitations (id, room_id, inviter_id, invitee_email, role, token, expires_at, accepted, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW(), NOW())
            RETURNING *
        `
                        : `
            INSERT INTO room_invitations (id, room_id, inviter_id, invitee_email, role, token, expires_at, accepted, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())
            RETURNING *
        `;

        try {
            const result = await db.query<RoomInvitation>(query, [
                id,
                params.room_id,
                params.inviter_id,
                params.invitee_email,
                persistedRole,
                params.token,
                params.expires_at,
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating room invitation:', error);
            throw error;
        }
    }

    static async findByToken(token: string): Promise<RoomInvitation | null> {
        const query = 'SELECT * FROM room_invitations WHERE token = $1 LIMIT 1';

        try {
            const result = await db.query<RoomInvitation>(query, [token]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error finding room invitation by token:', error);
            throw error;
        }
    }

    static async markAccepted(id: string): Promise<RoomInvitation | null> {
        const query = `
      UPDATE room_invitations
      SET accepted = TRUE
      WHERE id = $1
      RETURNING *
    `;

        try {
            const result = await db.query<RoomInvitation>(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error marking room invitation as accepted:', error);
            throw error;
        }
    }
}
