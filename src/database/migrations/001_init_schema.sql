-- Constella CORE 数据库初始化脚本
-- PostgreSQL 版本

-- ============================================
-- 1. 创建扩展
-- ============================================

-- 启用 UUID 生成扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. 创建用户表
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. 创建房间表
-- ============================================

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    password VARCHAR(255),
    settings JSONB,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. 创建房间成员表
-- ============================================

CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- ============================================
-- 5. 创建刷新令牌表
-- ============================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. 创建 Yjs 文档持久化表
-- ============================================

CREATE TABLE IF NOT EXISTS room_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    doc_name VARCHAR(100) NOT NULL DEFAULT 'room',
    doc_data BYTEA NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, doc_name)
);

-- ============================================
-- 7. 创建房间邀请表（可选）
-- ============================================

CREATE TABLE IF NOT EXISTS room_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    accepted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (requested_role IN ('owner', 'admin', 'member', 'viewer', 'editor')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- 8. 创建索引
-- ============================================

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 房间表索引
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);

-- 房间成员表索引
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);

-- 刷新令牌表索引
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- 文档持久化表索引
CREATE INDEX IF NOT EXISTS idx_room_documents_room_id ON room_documents(room_id);
CREATE INDEX IF NOT EXISTS idx_room_documents_snapshot ON room_documents(is_snapshot, updated_at);

-- 房间邀请表索引
CREATE INDEX IF NOT EXISTS idx_room_invitations_room_id ON room_invitations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_invitee_email ON room_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_room_invitations_token ON room_invitations(token);
CREATE INDEX IF NOT EXISTS idx_room_join_requests_room_id ON room_join_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_room_join_requests_requester_id ON room_join_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_room_join_requests_status ON room_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_room_audit_logs_room_id ON room_audit_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_room_audit_logs_created_at ON room_audit_logs(created_at);

-- ============================================
-- 9. 创建触发器函数（自动更新 updated_at）
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 10. 为需要的表创建触发器
-- ============================================

-- 用户表触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 房间表触发器
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 文档表触发器
DROP TRIGGER IF EXISTS update_room_documents_updated_at ON room_documents;
CREATE TRIGGER update_room_documents_updated_at
    BEFORE UPDATE ON room_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. 插入测试数据（可选，仅用于开发）
-- ============================================

-- 注意：生产环境请删除此部分

-- 插入测试用户
-- INSERT INTO users (username, email, password_hash)
-- VALUES 
--     ('admin', 'admin@constella.com', '$2b$10$abc123...'),
--     ('user1', 'user1@constella.com', '$2b$10$abc123...');

-- ============================================
-- 完成
-- ============================================

-- 打印完成信息
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Tables created: users, rooms, room_members, refresh_tokens, room_documents, room_invitations, room_join_requests';
    RAISE NOTICE 'Indexes and triggers created successfully.';
END $$;
