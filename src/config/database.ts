import { config } from '../config';
import logger from '../config/logger';
import { createDatabasePerformanceMonitor } from '../performance';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 查询结果接口
 */
interface QueryResult<T = any> {
    rows: T[];
    rowCount?: number;
    command?: string;
    oid?: number;
    fields?: any[];
}

/**
 * 内存数据存储
 */
class MemoryStore {
    private tables: Map<string, Map<string, any>> = new Map();

    private parseSqlLiteral(rawValue: string): any {
        const value = rawValue.trim();

        if (/^null$/i.test(value)) {
            return null;
        }

        if (/^true$/i.test(value)) {
            return true;
        }

        if (/^false$/i.test(value)) {
            return false;
        }

        if (/^now\(\)$/i.test(value)) {
            return new Date().toISOString();
        }

        const quotedMatch = value.match(/^'(.*)'$/);
        if (quotedMatch) {
            return quotedMatch[1];
        }

        return value;
    }

    constructor() {
        // 初始化表
        this.tables.set('users', new Map());
        this.tables.set('rooms', new Map());
        this.tables.set('room_members', new Map());
        this.tables.set('refresh_tokens', new Map());
        this.tables.set('room_documents', new Map());
        this.tables.set('room_invitations', new Map());
        this.tables.set('room_join_requests', new Map());
        this.tables.set('room_audit_logs', new Map());
    }

    /**
     * 解析简单的 SQL INSERT 语句
     */
    executeInsert(sql: string, params: any[]): any {
        // 兼容多行 INSERT 语句，支持跨行字段列表
        const normalizedSql = sql.replace(/\s+/g, ' ').trim();
        // 匹配 INSERT INTO table_name (...) VALUES (...) RETURNING *
        const match = normalizedSql.match(/INSERT INTO (\w+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/i);
        if (!match) {
            throw new Error('Unsupported INSERT query');
        }

        const tableName = match[1];
        const columns = match[2].split(',').map(c => c.trim());
        const values = match[3].split(',').map(v => v.trim());

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
            const valueToken = values[index];
            const placeholderMatch = valueToken?.match(/^\$(\d+)$/);
            if (placeholderMatch) {
                const paramIndex = parseInt(placeholderMatch[1], 10) - 1;
                if (params[paramIndex] !== undefined) {
                    record[col] = params[paramIndex];
                }
                return;
            }

            if (valueToken !== undefined) {
                record[col] = this.parseSqlLiteral(valueToken);
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

        setPairs.forEach(pair => {
            const [field, rawValue] = pair.split('=').map(s => s.trim());
            if (field === 'updated_at') {
                return;
            }

            const placeholderMatch = rawValue?.match(/^\$(\d+)$/);
            if (placeholderMatch) {
                const nextParamIndex = parseInt(placeholderMatch[1], 10) - 1;
                record[field] = params[nextParamIndex];
                return;
            }

            record[field] = this.parseSqlLiteral(rawValue);
        });

        record.updated_at = new Date().toISOString();
        table.set(id, record);

        return record;
    }

    /**
     * 解析简单的 SQL DELETE 语句
     */
    executeDelete(sql: string, params: any[]): number {
        const normalizedSql = sql.replace(/\s+/g, ' ').trim().replace(/;$/, '');

        // 支持房间文档快照清理语句（DELETE ... WHERE id IN (SELECT ... OFFSET $3)）
        const snapshotCleanupMatch = normalizedSql.match(
            /^DELETE FROM room_documents WHERE id IN \(SELECT id FROM room_documents WHERE room_id = \$1 AND doc_name = \$2 AND is_snapshot = true ORDER BY version DESC, updated_at DESC OFFSET \$3\)$/i
        );

        if (snapshotCleanupMatch) {
            const table = this.tables.get('room_documents');
            if (!table) {
                return 0;
            }

            const roomId = params[0];
            const docName = params[1];
            const keepCount = Math.max(Number(params[2]) || 0, 0);

            const snapshots = Array.from(table.values())
                .filter((record) =>
                    record.room_id === roomId &&
                    record.doc_name === docName &&
                    Boolean(record.is_snapshot)
                )
                .sort((a, b) => {
                    const versionDiff = (Number(b.version) || 0) - (Number(a.version) || 0);
                    if (versionDiff !== 0) {
                        return versionDiff;
                    }

                    const aTime = new Date(a.updated_at).getTime() || 0;
                    const bTime = new Date(b.updated_at).getTime() || 0;
                    return bTime - aTime;
                });

            const idsToDelete = new Set(snapshots.slice(keepCount).map((record) => record.id));
            let deletedCount = 0;

            Array.from(table.entries()).forEach(([id]) => {
                if (idsToDelete.has(id)) {
                    table.delete(id);
                    deletedCount++;
                }
            });

            return deletedCount;
        }

        const deleteMatch = normalizedSql.match(/^DELETE FROM (\w+)(?:\s+WHERE\s+(.+))?$/i);
        if (!deleteMatch) {
            throw new Error('Unsupported DELETE query');
        }

        const tableName = deleteMatch[1];
        const whereClause = deleteMatch[2];
        const table = this.tables.get(tableName);

        if (!table) {
            return 0;
        }

        if (!whereClause) {
            const total = table.size;
            table.clear();
            return total;
        }

        const conditions = whereClause
            .split(/\s+AND\s+/i)
            .map((condition) => condition.trim())
            .filter(Boolean);

        const matchesCondition = (record: any, condition: string): boolean => {
            const placeholderMatch = condition.match(/^(\w+)\s*=\s*\$(\d+)$/i);
            if (placeholderMatch) {
                const field = placeholderMatch[1];
                const paramIndex = parseInt(placeholderMatch[2], 10) - 1;
                return record[field] === params[paramIndex];
            }

            const booleanMatch = condition.match(/^(\w+)\s*=\s*(true|false)$/i);
            if (booleanMatch) {
                const field = booleanMatch[1];
                const expected = booleanMatch[2].toLowerCase() === 'true';
                return Boolean(record[field]) === expected;
            }

            const literalMatch = condition.match(/^(\w+)\s*=\s*'([^']*)'$/i);
            if (literalMatch) {
                const field = literalMatch[1];
                const expected = literalMatch[2];
                return String(record[field] ?? '') === expected;
            }

            const ltNowMatch = condition.match(/^(\w+)\s*<\s*NOW\(\)$/i);
            if (ltNowMatch) {
                const field = ltNowMatch[1];
                const fieldTime = new Date(record[field]).getTime();
                return Number.isFinite(fieldTime) && fieldTime < Date.now();
            }

            const gtNowMatch = condition.match(/^(\w+)\s*>\s*NOW\(\)$/i);
            if (gtNowMatch) {
                const field = gtNowMatch[1];
                const fieldTime = new Date(record[field]).getTime();
                return Number.isFinite(fieldTime) && fieldTime > Date.now();
            }

            throw new Error(`Unsupported DELETE condition: ${condition}`);
        };

        let deletedCount = 0;
        Array.from(table.entries()).forEach(([id, record]) => {
            const shouldDelete = conditions.every((condition) => matchesCondition(record, condition));
            if (shouldDelete) {
                table.delete(id);
                deletedCount++;
            }
        });

        return deletedCount;
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
 * SQLite 数据存储
 * 实现与 MemoryStore 兼容的接口
 */
class SQLiteStore {
    private db: Database.Database;
    private initialized = false;

    constructor(filepath: string) {
        // 确保目录存在
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new Database(filepath);
    }

    /**
     * 初始化数据库 - 创建所有必要的表
     * 方案 A: 自动建表
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            logger.warn('SQLiten database already initialized');
            return;
        }

        try {
            // 创建表 - 基于当前模型定义
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    username TEXT,
                    avatar_url TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS rooms (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    is_private BOOLEAN DEFAULT 0,
                    password TEXT,
                    settings TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (owner_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS room_members (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    role TEXT DEFAULT 'member',
                    joined_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (room_id) REFERENCES rooms(id),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(room_id, user_id)
                );

                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    revoked BOOLEAN DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS room_documents (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    doc_name TEXT NOT NULL,
                    doc_data BLOB,
                    version INTEGER DEFAULT 1,
                    is_snapshot BOOLEAN DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (room_id) REFERENCES rooms(id),
                    UNIQUE(room_id, doc_name)
                );

                CREATE TABLE IF NOT EXISTS room_audit_logs (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    actor_user_id TEXT,
                    target_user_id TEXT,
                    action TEXT NOT NULL,
                    metadata TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (room_id) REFERENCES rooms(id),
                    FOREIGN KEY (actor_user_id) REFERENCES users(id),
                    FOREIGN KEY (target_user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS room_invitations (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    inviter_id TEXT NOT NULL,
                    invitee_email TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'member',
                    token TEXT NOT NULL UNIQUE,
                    expires_at TEXT NOT NULL,
                    accepted BOOLEAN NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (room_id) REFERENCES rooms(id),
                    FOREIGN KEY (inviter_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS room_join_requests (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    requester_id TEXT NOT NULL,
                    requested_role TEXT NOT NULL DEFAULT 'member',
                    status TEXT NOT NULL DEFAULT 'pending',
                    reviewer_id TEXT,
                    reviewed_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (room_id) REFERENCES rooms(id),
                    FOREIGN KEY (requester_id) REFERENCES users(id),
                    FOREIGN KEY (reviewer_id) REFERENCES users(id)
                );
            `);

            this.initialized = true;
            logger.info('SQLite database tables created successfully');
        } catch (error) {
            logger.error('Failed to initialize SQLite database:', error);
            throw error;
        }
    }

    /**
     * 执行查询
     */
    execute(sql: string, params: any[] = []): QueryResult {
        // 清理参数：SQLite 只支持基本类型，需要转换日期、布尔值等
        const cleanParams = params.map(param => {
            if (param === null || param === undefined) {
                return param;
            }
            if (param instanceof Date) {
                return param.toISOString();
            }
            if (typeof param === 'boolean') {
                return param ? 1 : 0;
            }
            if (typeof param === 'object') {
                // 如果是对象，序列化为 JSON 字符串
                return JSON.stringify(param);
            }
            return param;
        });

        // 将 PostgreSQL 特定的 SQL 转换为 SQLite 兼容的 SQL
        let convertedSql = sql;

        // 替换 NOW() 为 SQLite 的 datetime('now')
        convertedSql = convertedSql.replace(/NOW\(\)/gi, "datetime('now')");

        // 转换参数占位符：PostgreSQL $1, $2 -> SQLite ?
        let sqlWithPlaceholders = convertedSql;
        const matches = Array.from(convertedSql.matchAll(/\$(\d+)/g));

        // 按参数号排序以确保正确替换
        const uniqueParams = [...new Set(matches.map(m => parseInt(m[1])))].sort((a, b) => a - b);

        // 如果有参数占位符，进行转换
        if (uniqueParams.length > 0) {
            // 验证参数数量
            const maxParamNum = Math.max(...uniqueParams);
            if (params.length < maxParamNum) {
                throw new Error(`Expected at least ${maxParamNum} parameters, got ${params.length}`);
            }

            // 从后向前替换以避免干扰位置
            for (let i = uniqueParams.length - 1; i >= 0; i--) {
                const paramNum = uniqueParams[i];
                sqlWithPlaceholders = sqlWithPlaceholders.replace(
                    new RegExp(`\\$${paramNum}(?!\\d)`, 'g'),
                    '?'
                );
            }
        }

        const upperSql = sql.trim().toUpperCase();

        try {
            if (upperSql.startsWith('INSERT')) {
                // 处理 INSERT...RETURNING 语句
                const hasReturning = /RETURNING/i.test(convertedSql);
                let stmt = this.db.prepare(sqlWithPlaceholders);
                const info = stmt.run(...cleanParams);

                // 如果是 INSERT...RETURNING，获取插入的行
                if (hasReturning && info.changes > 0) {
                    // 提取表名和 INSERT 的列列表
                    const tableMatch = sql.match(/INSERT INTO (\w+)\s*\((.*?)\)/i);
                    if (tableMatch) {
                        const tableName = tableMatch[1];
                        const columnsStr = tableMatch[2];
                        const columns = columnsStr.split(',').map(c => c.trim());

                        // 检查是否有 id 列，以及它在参数中的位置
                        const idColIndex = columns.findIndex(col => col === 'id');

                        let selectStmt;
                        if (idColIndex >= 0 && cleanParams[idColIndex] !== undefined) {
                            // 如果有 id 列，使用它来查询（最可靠的方法）
                            const idValue = cleanParams[idColIndex];
                            selectStmt = this.db.prepare(
                                `SELECT * FROM ${tableName} WHERE id = ?`
                            );
                            const row = selectStmt.get(idValue);
                            return {
                                rows: row ? [row] : [],
                                command: 'INSERT',
                                rowCount: info.changes,
                                oid: 0,
                                fields: [],
                            };
                        } else {
                            // 如果没有 id 列，回退到 ORDER BY created_at（适用于其他表）
                            selectStmt = this.db.prepare(
                                `SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT 1`
                            );
                            const row = selectStmt.get();
                            return {
                                rows: row ? [row] : [],
                                command: 'INSERT',
                                rowCount: info.changes,
                                oid: 0,
                                fields: [],
                            };
                        }
                    }
                }

                return {
                    rows: [],
                    command: 'INSERT',
                    rowCount: info.changes,
                    oid: 0,
                    fields: [],
                };
            } else if (upperSql.startsWith('SELECT')) {
                const stmt = this.db.prepare(sqlWithPlaceholders);
                const rows = stmt.all(...cleanParams);
                return {
                    rows: rows || [],
                    command: 'SELECT',
                    rowCount: (rows || []).length,
                    oid: 0,
                    fields: [],
                };
            } else if (upperSql.startsWith('UPDATE')) {
                const hasReturning = /RETURNING/i.test(convertedSql);

                // UPDATE ... RETURNING 需要通过 .all() 获取返回行。
                // 之前使用 run()+手动回查会在占位符转换后出现取不到行的问题，导致误判为更新失败。
                if (hasReturning) {
                    const stmt = this.db.prepare(sqlWithPlaceholders);
                    const rows = stmt.all(...cleanParams);
                    return {
                        rows: rows || [],
                        command: 'UPDATE',
                        rowCount: (rows || []).length,
                        oid: 0,
                        fields: [],
                    };
                }

                const stmt = this.db.prepare(sqlWithPlaceholders);
                const info = stmt.run(...cleanParams);
                return {
                    rows: [],
                    command: 'UPDATE',
                    rowCount: info.changes,
                    oid: 0,
                    fields: [],
                };
            } else if (upperSql.startsWith('DELETE')) {
                const stmt = this.db.prepare(sqlWithPlaceholders);
                const info = stmt.run(...cleanParams);
                return {
                    rows: [],
                    command: 'DELETE',
                    rowCount: info.changes,
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
            logger.error('SQLite execution error:', error);
            throw error;
        }
    }

    /**
     * 关闭数据库连接
     */
    close(): void {
        if (this.db) {
            this.db.close();
            logger.info('SQLite database connection closed');
        }
    }
}

/**
 * 数据库连接管理器
 * 支持内存数据库和 SQLite，扩展接口预留给未来的其他数据库类型
 */
class DatabaseManager {
    private memoryStore: MemoryStore | null = null;
    private sqliteStore: SQLiteStore | null = null;
    private isInitialized = false;
    private dbType: string;

    constructor() {
        this.dbType = config.database.type || 'memory';
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
            if (this.dbType === 'memory') {
                await this.initializeMemory();
            } else if (this.dbType === 'sqlite') {
                await this.initializeSqlite();
            } else {
                // 未来支持其他数据库类型时在这里添加
                throw new Error(`Unsupported database type: ${this.dbType}`);
            }

            this.isInitialized = true;
            logger.info(`Database initialized successfully (type: ${this.dbType})`);
        } catch (error) {
            logger.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * 初始化内存数据库
     * 在内存中模拟数据存储
     */
    private async initializeMemory(): Promise<void> {
        logger.info('Using in-memory database');
        this.memoryStore = new MemoryStore();
    }

    /**
     * 初始化 SQLite 数据库
     */
    private async initializeSqlite(): Promise<void> {
        const filepath = config.database.sqlite?.filepath || './data/constella.db';
        logger.info(`Using SQLite database at: ${filepath}`);
        this.sqliteStore = new SQLiteStore(filepath);
        await this.sqliteStore.initialize();
    }

    /**
     * 执行查询
     */
    async query<T extends any = any>(
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
        } else if (this.dbType === 'sqlite') {
            // SQLite 模式：使用 SQLite 存储
            if (!this.sqliteStore) {
                throw new Error('SQLite store not initialized');
            }

            logger.debug('SQLite database query:', text);
            return this.sqliteStore.execute(text, params) as QueryResult<T>;
        }

        // 其他数据库类型不支持
        throw new Error(`Database type '${this.dbType}' is not supported in this build`);
    }

    /**
     * 关闭数据库连接
     */
    async close(): Promise<void> {
        if (this.dbType === 'memory') {
            this.memoryStore = null;
        } else if (this.dbType === 'sqlite') {
            if (this.sqliteStore) {
                this.sqliteStore.close();
                this.sqliteStore = null;
            }
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
    getType(): string {
        return this.dbType;
    }
}

// 导出单例实例
export const db = new DatabaseManager();

const databasePerformanceMonitor = createDatabasePerformanceMonitor(config.performance.database);

const originalDbQuery = db.query.bind(db);
db.query = (async <T>(text: string, params?: any[]): Promise<QueryResult<T>> => {
    return databasePerformanceMonitor.trackQuery(
        {
            databaseType: db.getType(),
            sql: text,
            params,
        },
        () => originalDbQuery<T>(text, params)
    );
}) as typeof db.query;
