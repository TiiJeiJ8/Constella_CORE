#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 数据库管理 CLI 工具
 * 迁移功能已禁用（系统改用内存/SQLite数据库）
 * 未来升级到需要迁移的数据库时可恢复此功能
 */

import logger from '../config/logger';

const commands = {
    migrate: async () => {
        logger.info('Migration not required for in-memory/SQLite databases');
        console.log('✓ Database is ready to use');
    },

    rollback: async () => {
        logger.warn('Rollback is not applicable for in-memory/SQLite databases');
        console.log('ℹ No rollback needed');
    },

    reset: async () => {
        logger.warn('⚠️  Reset is not implemented for in-memory databases');
        console.log('ℹ For SQLite, delete the .db file and restart the application');
    },

    status: async () => {
        logger.info('Database migration status check not applicable');
        console.log('\n=== Database Status ===');
        console.log('✓ In-memory/SQLite database is ready');
        console.log('');
    },

    help: () => {
        console.log(`
Constella Database CLI

Note: Migration commands are disabled for in-memory/SQLite databases.

Available commands:
  npm run db:migrate    - Show database status (no migration needed)
  npm run db:rollback   - Show rollback info (not applicable)
  npm run db:reset      - Show reset info
  npm run db:status     - Check database status
  npm run db:help       - Show this help message
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
