import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import logger from '../config/logger';

/**
 * 数据库连接管理器
 * 支持 PostgreSQL 和内存数据库切换
 */
class DatabaseManager {
    private pool: Pool | null = null;
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
        // 内存数据库不需要实际连接，数据存储在内存对象中
        // 实际使用时可以使用 SQLite in-memory 或其他轻量级方案
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
            // 内存数据库模式：返回模拟结果
            logger.debug('Memory database query:', text);
            return {
                rows: [] as T[],
                command: '',
                rowCount: 0,
                oid: 0,
                fields: [],
            };
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
