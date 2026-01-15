import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import logger from '../config/logger';
import { randomUUID } from 'crypto';

/**
 * 内存数据存储
 */
class MemoryStore {
    private tables: Map<string, Map<string, any>> = new Map();

    constructor() {
        // 初始化表
        this.tables.set('users', new Map());
        this.tables.set('rooms', new Map());
        this.tables.set('room_members', new Map());
        this.tables.set('refresh_tokens', new Map());
        this.tables.set('room_documents', new Map());
    }

    /**
     * 解析简单的 SQL INSERT 语句
     */
    executeInsert(sql: string, params: any[]): any {
        // 匹配 INSERT INTO table_name (...) VALUES (...) RETURNING *
        const match = sql.match(/INSERT INTO (\w+)\s*\((.*?)\)\s*VALUES/i);
        if (!match) {
            throw new Error('Unsupported INSERT query');
        }

        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim());

        const table = this.tables.get(tableName);
        if (!table) {
            throw new Error(`Table ${tableName} not found`);
        }

        // 创建新记录
        const record: any = {
            id: randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        // 填充字段值
        columns.forEach((col, index) => {
            if (params[index] !== undefined) {
                record[col] = params[index];
            }
        });

        // 存储记录
        table.set(record.id, record);

        return record;
    }

    /**
     * 解析简单的 SQL SELECT 语句
     */
    executeSelect(sql: string, params: any[]): any[] {
        // 匹配 SELECT * FROM table_name [WHERE ...]
        const tableMatch = sql.match(/SELECT \* FROM (\w+)/i);
        if (!tableMatch) {
            return [];
        }

        const tableName = tableMatch[1];
        const table = this.tables.get(tableName);
        if (!table) {
            return [];
        }

        let records = Array.from(table.values());

        // 解析 WHERE 子句 - 使用 [\s\S] 以支持跨行匹配
        const whereMatch = sql.match(/WHERE\s+([\s\S]+?)(?:ORDER BY|LIMIT|$)/i);
        if (whereMatch) {
            const whereClause = whereMatch[1].trim();

            // 支持多个 AND 条件
            const conditions = whereClause.split(/\s+AND\s+/i);

            conditions.forEach((condition) => {
                // 匹配 field = $n 或 field = 'value'
                const condMatch = condition.match(/(\w+)\s*=\s*\$(\d+)/i);
                if (condMatch) {
                    const field = condMatch[1];
                    const paramIndex = parseInt(condMatch[2]) - 1; // $1 对应 params[0]
                    const value = params[paramIndex];

                    if (value !== undefined) {
                        records = records.filter(r => r[field] === value);
                    }
                }
            });
        }

        return records;
    }

    /**
     * 解析简单的 SQL UPDATE 语句
     */
    executeUpdate(sql: string, params: any[]): any | null {
        // 匹配 UPDATE table_name SET ... WHERE id = $n RETURNING *
        const match = sql.match(/UPDATE (\w+)\s+SET\s+(.*?)\s+WHERE\s+id\s*=\s*\$(\d+)/i);
        if (!match) {
            throw new Error('Unsupported UPDATE query');
        }

        const tableName = match[1];
        const setClause = match[2];
        const idParamIndex = parseInt(match[3]) - 1;

        const table = this.tables.get(tableName);
        if (!table) {
            throw new Error(`Table ${tableName} not found`);
        }

        const id = params[idParamIndex];
        const record = table.get(id);

        if (!record) {
            return null;
        }

        // 解析 SET 子句
        const setPairs = setClause.split(',').map(p => p.trim());
        let paramIndex = 0;

        setPairs.forEach(pair => {
            const [field] = pair.split('=').map(s => s.trim());
            if (field !== 'updated_at') {
                record[field] = params[paramIndex++];
            }
        });

        record.updated_at = new Date().toISOString();
        table.set(id, record);

        return record;
    }

    /**
     * 解析简单的 SQL DELETE 语句
     */
    executeDelete(sql: string, params: any[]): number {
        // 匹配 DELETE FROM table_name WHERE id = $1
        const match = sql.match(/DELETE FROM (\w+)\s+WHERE\s+id\s*=\s*\$1/i);
        if (!match) {
            throw new Error('Unsupported DELETE query');
        }

        const tableName = match[1];
        const table = this.tables.get(tableName);

        if (!table) {
            return 0;
        }

        const id = params[0];
        const deleted = table.delete(id);

        return deleted ? 1 : 0;
    }

    /**
     * 执行查询
     */
    execute(sql: string, params: any[] = []): QueryResult {
        const upperSql = sql.trim().toUpperCase();

        try {
            if (upperSql.startsWith('INSERT')) {
                const record = this.executeInsert(sql, params);
                return {
                    rows: [record],
                    command: 'INSERT',
                    rowCount: 1,
                    oid: 0,
                    fields: [],
                };
            } else if (upperSql.startsWith('SELECT')) {
                const records = this.executeSelect(sql, params);
                return {
                    rows: records,
                    command: 'SELECT',
                    rowCount: records.length,
                    oid: 0,
                    fields: [],
                };
            } else if (upperSql.startsWith('UPDATE')) {
                const record = this.executeUpdate(sql, params);
                return {
                    rows: record ? [record] : [],
                    command: 'UPDATE',
                    rowCount: record ? 1 : 0,
                    oid: 0,
                    fields: [],
                };
            } else if (upperSql.startsWith('DELETE')) {
                const count = this.executeDelete(sql, params);
                return {
                    rows: [],
                    command: 'DELETE',
                    rowCount: count,
                    oid: 0,
                    fields: [],
                };
            }

            // 其他查询返回空结果
            return {
                rows: [],
                command: '',
                rowCount: 0,
                oid: 0,
                fields: [],
            };
        } catch (error) {
            logger.error('Memory store execution error:', error);
            throw error;
        }
    }

    /**
     * 清空所有数据
     */
    clear(): void {
        this.tables.forEach(table => table.clear());
    }
}

/**
 * 数据库连接管理器
 * 支持 PostgreSQL 和内存数据库切换
 */
class DatabaseManager {
    private pool: Pool | null = null;
    private memoryStore: MemoryStore | null = null;
    private isInitialized = false;
    private dbType: 'postgres' | 'memory';

    constructor() {
        this.dbType = config.database.type as 'postgres' | 'memory';
    }

    /**
     * 初始化数据库连接
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.warn('Database already initialized');
            return;
        }

        try {
            if (this.dbType === 'postgres') {
                await this.initializePostgres();
            } else {
                await this.initializeMemory();
            }

            this.isInitialized = true;
            logger.info(`Database initialized successfully (type: ${this.dbType})`);
        } catch (error) {
            logger.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * 初始化 PostgreSQL 连接池
     */
    private async initializePostgres(): Promise<void> {
        const { postgres } = config.database;

        this.pool = new Pool({
            host: postgres.host,
            port: postgres.port,
            database: postgres.database,
            user: postgres.user,
            password: postgres.password,
            ssl: postgres.ssl ? { rejectUnauthorized: false } : false,
            min: postgres.pool.min,
            max: postgres.pool.max,
            idleTimeoutMillis: postgres.pool.idleTimeoutMillis,
            connectionTimeoutMillis: postgres.pool.connectionTimeoutMillis,
        });

        // 测试连接
        const client = await this.pool.connect();
        try {
            await client.query('SELECT NOW()');
            logger.info('PostgreSQL connection test successful');
        } finally {
            client.release();
        }

        // 监听错误事件
        this.pool.on('error', (err) => {
            logger.error('Unexpected error on idle client', err);
        });
    }

    /**
     * 初始化内存数据库（开发环境）
     * 在内存中模拟数据存储
     */
    private async initializeMemory(): Promise<void> {
        logger.info('Using in-memory database for development');
        this.memoryStore = new MemoryStore();
    }

    /**
     * 执行查询
     */
    async query<T extends QueryResultRow = any>(
        text: string,
        params?: any[]
    ): Promise<QueryResult<T>> {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        if (this.dbType === 'memory') {
            // 内存数据库模式：使用内存存储
            if (!this.memoryStore) {
                throw new Error('Memory store not initialized');
            }

            logger.debug('Memory database query:', text);
            return this.memoryStore.execute(text, params) as QueryResult<T>;
        }

        if (!this.pool) {
            throw new Error('PostgreSQL pool not available');
        }

        try {
            const start = Date.now();
            const result = await this.pool.query<T>(text, params);
            const duration = Date.now() - start;

            logger.debug('Executed query', {
                text,
                duration: `${duration}ms`,
                rows: result.rowCount,
            });

            return result;
        } catch (error) {
            logger.error('Query error:', { text, error });
            throw error;
        }
    }

    /**
     * 获取连接客户端（用于事务）
     */
    async getClient(): Promise<PoolClient> {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }

        if (this.dbType === 'memory') {
            throw new Error('Memory database does not support transactions');
        }

        if (!this.pool) {
            throw new Error('PostgreSQL pool not available');
        }

        return this.pool.connect();
    }

    /**
     * 执行事务
     */
    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.getClient();

        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * 关闭数据库连接
     */
    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        this.isInitialized = false;
        logger.info('Database connection closed');
    }

    /**
     * 检查数据库连接状态
     */
    isConnected(): boolean {
        return this.isInitialized;
    }

    /**
     * 获取数据库类型
     */
    getType(): 'postgres' | 'memory' {
        return this.dbType;
    }
}

// 导出单例实例
export const db = new DatabaseManager();
