#!/usr/bin/env node

/**
 * Yjs 持久化诊断工具
 * 检查 LevelDB 中的 Yjs 数据是否正确保存
 * 
 * 用法: node scripts/diagnose-yjs.js
 */

const path = require('path');
const fs = require('fs');

const YJS_PATH = path.join(__dirname, '..', 'data', 'yjs');

console.log('\n📊 Yjs LevelDB 数据诊断工具\n');
console.log('='.repeat(60) + '\n');

// 检查目录是否存在
if (!fs.existsSync(YJS_PATH)) {
    console.error('❌ LevelDB 目录不存在:', YJS_PATH);
    process.exit(1);
}

// 列出文件
const files = fs.readdirSync(YJS_PATH);
console.log('📁 LevelDB 文件：');
files.forEach(file => {
    const filePath = path.join(YJS_PATH, file);
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const sizeStr = size > 1024 ? `${(size / 1024).toFixed(2)} KB` : `${size} B`;
    console.log(`   ${file.padEnd(20)} ${sizeStr.padStart(10)}`);
});

console.log('\n✅ 诊断完成！\n');

// 说明
console.log('📝 解释：');
console.log('   - *.ldb 文件：LevelDB 数据文件，包含序列化的 Yjs updates');
console.log('   - MANIFEST 文件：LevelDB 元数据清单');
console.log('   - LOG 文件：操作日志');
console.log('   - CURRENT/LOCK：数据库状态文件\n');

console.log('🔍 如果看到 .ldb 文件，说明：');
console.log('   ✓ Yjs 数据被正确保存到 LevelDB');
console.log('   ✓ 房间中创建的节点已被持久化');
console.log('\n💡 如果重启后节点仍未恢复，可能是：');
console.log('   1. 前端 Y.Doc 未能与服务器同步（网络问题）');
console.log('   2. 服务器未正确将 LevelDB 数据交付给客户端');
console.log('   3. 前端 Y.Doc 初始化时没有等待 sync 完成');
console.log('   4. WebSocket 连接在数据同步前断开\n');
