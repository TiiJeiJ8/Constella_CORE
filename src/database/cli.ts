#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 数据库管理 CLI 工具
 * 用于执行迁移、回滚和重置数据库
 */

import { db } from '../config/database';
import { migrationManager } from './migrationManager';
import logger from '../config/logger';

const commands = {
    migrate: async () => {
        logger.info('Running migrations...');
        await db.initialize();
        await migrationManager.runMigrations();
        await db.close();
        logger.info('Migrations completed successfully');
    },

    rollback: async () => {
        logger.info('Rolling back last migration...');
        await db.initialize();
        await migrationManager.rollbackLastMigration();
        await db.close();
        logger.info('Rollback completed successfully');
    },

    reset: async () => {
        logger.warn('⚠️  WARNING: This will delete all data!');
        logger.info('Resetting database...');
        await db.initialize();
        await migrationManager.resetDatabase();
        await db.close();
        logger.info('Database reset completed');
    },

    status: async () => {
        logger.info('Checking migration status...');
        await db.initialize();
        const status = await migrationManager.getMigrationStatus();
        await db.close();

        console.log('\n=== Migration Status ===');
        console.log('\nExecuted Migrations:');
        if (status.executed.length === 0) {
            console.log('  (none)');
        } else {
            status.executed.forEach((migration) => console.log(`  ✓ ${migration}`));
        }

        console.log('\nPending Migrations:');
        if (status.pending.length === 0) {
            console.log('  (none)');
        } else {
            status.pending.forEach((migration) => console.log(`  ○ ${migration}`));
        }
        console.log('');
    },

    help: () => {
        console.log(`
Constella Database CLI

Usage:
  npm run db:migrate    - Run all pending migrations
  npm run db:rollback   - Rollback the last migration
  npm run db:reset      - Reset database (⚠️  deletes all data)
  npm run db:status     - Check migration status
  npm run db:help       - Show this help message

Examples:
  npm run db:migrate
  npm run db:status
    `);
    },
};

const main = async () => {
    const command = process.argv[2] || 'help';

    if (!(command in commands)) {
        logger.error(`Unknown command: ${command}`);
        commands.help();
        process.exit(1);
    }

    try {
        await commands[command as keyof typeof commands]();
        process.exit(0);
    } catch (error) {
        logger.error('Command failed:', error);
        process.exit(1);
    }
};

main();
