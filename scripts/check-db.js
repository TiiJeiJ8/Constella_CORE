#!/usr/bin/env node

/**
 * SQLite 数据库检查工具
 * 用于验证数据是否正确保存到数据库中
 * 
 * 用法: node scripts/check-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'constella-dev.db');

console.log('\n📊 Constella SQLite 数据库检查工具\n');
console.log('='.repeat(60) + '\n');

try {
    const db = new Database(DB_PATH, { readonly: true });

    // 检查用户表
    console.log('👤 用户表 (users):');
    const users = db.prepare('SELECT * FROM users').all();
    if (users.length > 0) {
        console.log(`   ✓ 找到 ${users.length} 个用户\n`);
        users.forEach((user, idx) => {
            console.log(`   [${idx + 1}] ID: ${user.id}`);
            console.log(`       Username: ${user.username}`);
            console.log(`       Email: ${user.email}`);
            console.log(`       Created: ${user.created_at}\n`);
        });
    } else {
        console.log('   ⚠️  用户表为空\n');
    }

    // 检查房间表
    console.log('🏠 房间表 (rooms):');
    const rooms = db.prepare('SELECT * FROM rooms').all();
    if (rooms.length > 0) {
        console.log(`   ✓ 找到 ${rooms.length} 个房间\n`);
        rooms.forEach((room, idx) => {
            console.log(`   [${idx + 1}] ID: ${room.id}`);
            console.log(`       Name: ${room.name}`);
            console.log(`       Owner: ${room.owner_id}`);
            console.log(`       Private: ${room.is_private ? '是' : '否'}`);
            console.log(`       Created: ${room.created_at}\n`);
        });
    } else {
        console.log('   ⚠️  房间表为空\n');
    }

    // 检查房间成员表
    console.log('👥 房间成员表 (room_members):');
    const members = db.prepare('SELECT * FROM room_members').all();
    if (members.length > 0) {
        console.log(`   ✓ 找到 ${members.length} 个成员关系\n`);
        members.forEach((member, idx) => {
            console.log(`   [${idx + 1}] ID: ${member.id}`);
            console.log(`       Room: ${member.room_id}`);
            console.log(`       User: ${member.user_id}`);
            console.log(`       Role: ${member.role}`);
            console.log(`       Joined: ${member.joined_at}\n`);
        });
    } else {
        console.log('   ⚠️  房间成员表为空\n');
    }

    // 检查刷新令牌表
    console.log('🔑 刷新令牌表 (refresh_tokens):');
    const tokens = db.prepare('SELECT id, user_id, expires_at, revoked FROM refresh_tokens').all();
    if (tokens.length > 0) {
        console.log(`   ✓ 找到 ${tokens.length} 个令牌\n`);
        tokens.forEach((token, idx) => {
            console.log(`   [${idx + 1}] Token ID: ${token.id}`);
            console.log(`       User: ${token.user_id}`);
            console.log(`       Expires: ${token.expires_at}`);
            console.log(`       Revoked: ${token.revoked ? '是' : '否'}\n`);
        });
    } else {
        console.log('   ⚠️  刷新令牌表为空\n');
    }

    // 检查房间文档表
    console.log('📄 房间文档表 (room_documents):');
    const docs = db.prepare('SELECT id, room_id, doc_name, version, is_snapshot FROM room_documents').all();
    if (docs.length > 0) {
        console.log(`   ✓ 找到 ${docs.length} 个文档\n`);
        docs.forEach((doc, idx) => {
            console.log(`   [${idx + 1}] Doc ID: ${doc.id}`);
            console.log(`       Room: ${doc.room_id}`);
            console.log(`       Name: ${doc.doc_name}`);
            console.log(`       Version: ${doc.version}`);
            console.log(`       Snapshot: ${doc.is_snapshot ? '是' : '否'}\n`);
        });
    } else {
        console.log('   ⚠️  房间文档表为空\n');
    }

    // 统计信息
    console.log('📈 数据库统计:');
    console.log(`   用户总数: ${users.length}`);
    console.log(`   房间总数: ${rooms.length}`);
    console.log(`   房间成员总数: ${members.length}`);
    console.log(`   刷新令牌总数: ${tokens.length}`);
    console.log(`   房间文档总数: ${docs.length}`);

    db.close();
    console.log('\n' + '='.repeat(60));
    console.log('✅ 数据库检查完成！\n');

} catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.message.includes('cannot open')) {
        console.error('\n💡 提示: 确保服务器正在运行 (npm run dev:sqlite)');
    }
    process.exit(1);
}
