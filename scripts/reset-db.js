#!/usr/bin/env node
/**
 * 清理旧数据库文件并准备重新初始化
 * 
 * 用法: node scripts/reset-db.js
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'constella-dev.db');
const dataDir = path.join(__dirname, '..', 'data');

try {
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('✓ 旧数据库文件已删除:', dbPath);
    } else {
        console.log('✓ 数据库文件不存在，无需删除');
    }
} catch (error) {
    console.error('✗ 删除数据库文件失败:', error.message);
    // 继续执行，数据库会在下次启动时被覆盖
}

// 验证 data 目录存在
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✓ 创建 data 目录');
}

console.log('\n✓ 准备完成，现在可以启动服务器');
console.log('运行: npm run dev:sqlite');
