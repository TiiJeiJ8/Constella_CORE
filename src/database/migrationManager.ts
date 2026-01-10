import * as fs from 'fs';
import * as path from 'path';
import { PoolClient } from 'pg';
import { db } from '../config/database';
import logger from '../config/logger';

/**
 * 数据库迁移管理器
 * 负责执行数据库架构迁移
 */
export class MigrationManager {
    private migrationsDir: string;

    constructor() {
        this.migrationsDir = path.join(__dirname, 'migrations');
    }

    /**
     * 执行所有待处理的迁移
     */
    async runMigrations(): Promise<void> {
        if (db.getType() === 'memory') {
            logger.info('Skipping migrations for memory database');
            return;
        }

        try {
            // 确保迁移表存在
            await this.ensureMigrationTable();

            // 获取所有迁移文件
            const migrationFiles = this.getMigrationFiles();

            // 获取已执行的迁移
            const executedMigrations = await this.getExecutedMigrations();

            // 执行待处理的迁移
            for (const file of migrationFiles) {
                if (!executedMigrations.includes(file)) {
                    await this.executeMigration(file);
                }
            }

            logger.info('All migrations completed successfully');
        } catch (error) {
            logger.error('Migration failed:', error);
            throw error;
        }
    }

    /**
     * 创建迁移记录表
     */
    private async ensureMigrationTable(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

        await db.query(query);
        logger.debug('Migration table ensured');
    }

    /**
     * 获取所有迁移文件
     */
    private getMigrationFiles(): string[] {
        if (!fs.existsSync(this.migrationsDir)) {
            logger.warn(`Migrations directory not found: ${this.migrationsDir}`);
            return [];
        }

        const files = fs
            .readdirSync(this.migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort();

        return files;
    }

    /**
     * 获取已执行的迁移记录
     */
    private async getExecutedMigrations(): Promise<string[]> {
        const query = 'SELECT name FROM migrations ORDER BY name';

        try {
            const result = await db.query<{ name: string }>(query);
            return result.rows.map((row: { name: string }) => row.name);
        } catch (error) {
            logger.error('Error fetching executed migrations:', error);
            return [];
        }
    }

    /**
     * 执行单个迁移
     */
    private async executeMigration(filename: string): Promise<void> {
        const filePath = path.join(this.migrationsDir, filename);
        const sql = fs.readFileSync(filePath, 'utf8');

        logger.info(`Executing migration: ${filename}`);

        try {
            // 在事务中执行迁移
            await db.transaction(async (client: PoolClient) => {
                // 执行迁移 SQL
                await client.query(sql);

                // 记录迁移
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [filename]);
            });

            logger.info(`Migration completed: ${filename}`);
        } catch (error) {
            logger.error(`Migration failed: ${filename}`, error);
            throw error;
        }
    }

    /**
     * 回滚最后一个迁移（仅支持手动编写的回滚脚本）
     */
    async rollbackLastMigration(): Promise<void> {
        if (db.getType() === 'memory') {
            logger.info('Rollback not supported for memory database');
            return;
        }

        try {
            const query = 'SELECT name FROM migrations ORDER BY executed_at DESC LIMIT 1';
            const result = await db.query<{ name: string }>(query);

            if (result.rows.length === 0) {
                logger.info('No migrations to rollback');
                return;
            }

            const migrationName = result.rows[0].name;
            const rollbackFile = migrationName.replace('.sql', '.rollback.sql');
            const rollbackPath = path.join(this.migrationsDir, rollbackFile);

            if (!fs.existsSync(rollbackPath)) {
                throw new Error(`Rollback file not found: ${rollbackFile}`);
            }

            const sql = fs.readFileSync(rollbackPath, 'utf8');

            await db.transaction(async (client: PoolClient) => {
                // 执行回滚 SQL
                await client.query(sql);

                // 删除迁移记录
                await client.query('DELETE FROM migrations WHERE name = $1', [migrationName]);
            });

            logger.info(`Rollback completed: ${migrationName}`);
        } catch (error) {
            logger.error('Rollback failed:', error);
            throw error;
        }
    }

    /**
     * 重置数据库（删除所有表，谨慎使用！）
     */
    async resetDatabase(): Promise<void> {
        if (db.getType() === 'memory') {
            logger.info('Reset not needed for memory database');
            return;
        }

        logger.warn('Resetting database - all data will be lost!');

        const dropTablesQuery = `
      DROP TABLE IF EXISTS room_invitations CASCADE;
      DROP TABLE IF EXISTS room_documents CASCADE;
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
      DROP TABLE IF EXISTS room_members CASCADE;
      DROP TABLE IF EXISTS rooms CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS migrations CASCADE;
    `;

        try {
            await db.query(dropTablesQuery);
            logger.info('Database reset completed');
        } catch (error) {
            logger.error('Database reset failed:', error);
            throw error;
        }
    }

    /**
     * 获取迁移状态
     */
    async getMigrationStatus(): Promise<{
        executed: string[];
        pending: string[];
    }> {
        const allMigrations = this.getMigrationFiles();
        const executedMigrations = await this.getExecutedMigrations();
        const pendingMigrations = allMigrations.filter(
            (migration) => !executedMigrations.includes(migration)
        );

        return {
            executed: executedMigrations,
            pending: pendingMigrations,
        };
    }
}

// 导出单例实例
export const migrationManager = new MigrationManager();
