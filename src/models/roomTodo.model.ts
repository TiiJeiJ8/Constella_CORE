import { randomUUID } from 'crypto';
import { db } from '../config/database';
import { CreateRoomTodoParams, RoomTodo, UpdateRoomTodoParams } from '../types/database';
import logger from '../config/logger';

function normalizeTodo(todo: RoomTodo): RoomTodo {
    return {
        ...todo,
        done: Boolean(todo.done),
        is_public: Boolean(todo.is_public),
    };
}

export class RoomTodoModel {
    static async create(params: CreateRoomTodoParams): Promise<RoomTodo> {
        const id = randomUUID();
        const query = `
            INSERT INTO room_todos (
                id, room_id, text, done, due_date, assignee_id, assignee_name,
                creator_id, creator_name, is_public, created_at, updated_at
            )
            VALUES ($1, $2, $3, false, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *
        `;

        try {
            const result = await db.query<RoomTodo>(query, [
                id,
                params.room_id,
                params.text,
                params.due_date || null,
                params.assignee_id || null,
                params.assignee_name || null,
                params.creator_id,
                params.creator_name || null,
                Boolean(params.is_public),
            ]);
            return normalizeTodo(result.rows[0]);
        } catch (error) {
            logger.error('Error creating room todo:', error);
            throw error;
        }
    }

    static async findVisibleByRoom(roomId: string, userId: string): Promise<RoomTodo[]> {
        const query = `
            SELECT * FROM room_todos
            WHERE room_id = $1
            ORDER BY done ASC, created_at DESC
        `;

        try {
            const result = await db.query<RoomTodo>(query, [roomId]);
            return result.rows
                .map(normalizeTodo)
                .filter(todo => todo.is_public || todo.creator_id === userId || todo.assignee_id === userId);
        } catch (error) {
            logger.error('Error finding visible room todos:', error);
            throw error;
        }
    }

    static async findById(id: string): Promise<RoomTodo | null> {
        const query = 'SELECT * FROM room_todos WHERE id = $1';

        try {
            const result = await db.query<RoomTodo>(query, [id]);
            return result.rows[0] ? normalizeTodo(result.rows[0]) : null;
        } catch (error) {
            logger.error('Error finding room todo:', error);
            throw error;
        }
    }

    static async update(id: string, params: UpdateRoomTodoParams): Promise<RoomTodo | null> {
        const query = `
            UPDATE room_todos
            SET text = $1,
                done = $2,
                due_date = $3,
                assignee_id = $4,
                assignee_name = $5,
                is_public = $6,
                updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `;

        const current = await this.findById(id);
        if (!current) return null;

        try {
            const result = await db.query<RoomTodo>(query, [
                params.text ?? current.text,
                params.done ?? current.done,
                params.due_date === undefined ? current.due_date || null : params.due_date,
                params.assignee_id === undefined ? current.assignee_id || null : params.assignee_id,
                params.assignee_name === undefined ? current.assignee_name || null : params.assignee_name,
                params.is_public ?? current.is_public,
                id,
            ]);
            return result.rows[0] ? normalizeTodo(result.rows[0]) : null;
        } catch (error) {
            logger.error('Error updating room todo:', error);
            throw error;
        }
    }

    static async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM room_todos WHERE id = $1';

        try {
            const result = await db.query(query, [id]);
            return (result.rowCount || 0) > 0;
        } catch (error) {
            logger.error('Error deleting room todo:', error);
            throw error;
        }
    }
}
