# 数据库结构设计

## 概述
本文档描述 Constella CORE 项目的数据库表结构，支持用户认证、房间管理、权限控制和 Yjs 文档持久化。

---

## 表结构

### 1. users（用户表）

存储用户基本信息和认证凭据。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID/BIGINT | PRIMARY KEY | 用户唯一标识 |
| username | VARCHAR(50) | NOT NULL, UNIQUE | 用户名 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 邮箱地址 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希值（bcrypt） |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新时间 |

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (email)
- UNIQUE INDEX (username)

---

### 2. rooms（房间表）

存储房间元数据和配置信息。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID/BIGINT | PRIMARY KEY | 房间唯一标识 |
| name | VARCHAR(100) | NOT NULL | 房间名称 |
| is_private | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否为私密房间 |
| password | VARCHAR(255) | NULL | 房间密码（仅私密房间） |
| settings | JSON/TEXT | NULL | 房间配置（JSON格式） |
| owner_id | UUID/BIGINT | NOT NULL, FOREIGN KEY | 房主用户ID |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新时间 |

**外键：**
- owner_id → users(id) ON DELETE CASCADE

**索引：**
- PRIMARY KEY (id)
- INDEX (owner_id)
- INDEX (created_at)

---

### 3. room_members（房间成员表）

管理房间成员和权限关系。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID/BIGINT | PRIMARY KEY | 记录唯一标识 |
| room_id | UUID/BIGINT | NOT NULL, FOREIGN KEY | 房间ID |
| user_id | UUID/BIGINT | NOT NULL, FOREIGN KEY | 用户ID |
| role | ENUM/VARCHAR(20) | NOT NULL, DEFAULT 'member' | 角色：owner/admin/member/viewer |
| joined_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 加入时间 |

**角色说明：**
- `owner`: 房主，拥有所有权限
- `admin`: 管理员，可管理成员和权限
- `member`: 普通成员，可编辑文档
- `viewer`: 访客，只读权限

**外键：**
- room_id → rooms(id) ON DELETE CASCADE
- user_id → users(id) ON DELETE CASCADE

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (room_id, user_id)
- INDEX (user_id)
- INDEX (room_id)

---

### 4. refresh_tokens（刷新令牌表）

存储用户的刷新令牌，用于无感刷新访问令牌。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID/BIGINT | PRIMARY KEY | 记录唯一标识 |
| user_id | UUID/BIGINT | NOT NULL, FOREIGN KEY | 用户ID |
| token | VARCHAR(500) | NOT NULL, UNIQUE | 刷新令牌（哈希后存储） |
| expires_at | TIMESTAMP | NOT NULL | 过期时间 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| revoked | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否已撤销 |

**外键：**
- user_id → users(id) ON DELETE CASCADE

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (token)
- INDEX (user_id)
- INDEX (expires_at)

---

### 5. room_documents（Yjs 文档持久化表）

存储房间的 Yjs 文档更新数据，支持增量和快照存储。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID/BIGINT | PRIMARY KEY | 记录唯一标识 |
| room_id | UUID/BIGINT | NOT NULL, FOREIGN KEY | 房间ID |
| doc_name | VARCHAR(100) | NOT NULL, DEFAULT 'room' | 文档名称（room:<room_id>） |
| doc_data | BYTEA/BLOB | NOT NULL | Yjs 文档二进制数据 |
| version | INTEGER | NOT NULL, DEFAULT 1 | 文档版本号 |
| is_snapshot | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否为快照 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新时间 |

**说明：**
- 建议使用 LevelDB 或专门的文档存储
- 关系型数据库可用作备份方案
- `doc_data` 存储 Y.encodeStateAsUpdate 的结果

**外键：**
- room_id → rooms(id) ON DELETE CASCADE

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (room_id, doc_name)
- INDEX (room_id)
- INDEX (is_snapshot, updated_at)

---

### 6. room_invitations（房间邀请表）（可选）

管理房间邀请记录。

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID/BIGINT | PRIMARY KEY | 邀请唯一标识 |
| room_id | UUID/BIGINT | NOT NULL, FOREIGN KEY | 房间ID |
| inviter_id | UUID/BIGINT | NOT NULL, FOREIGN KEY | 邀请人ID |
| invitee_email | VARCHAR(255) | NOT NULL | 受邀人邮箱 |
| role | ENUM/VARCHAR(20) | NOT NULL, DEFAULT 'member' | 预设角色 |
| token | VARCHAR(255) | NOT NULL, UNIQUE | 邀请令牌 |
| expires_at | TIMESTAMP | NOT NULL | 过期时间 |
| accepted | BOOLEAN | NOT NULL, DEFAULT FALSE | 是否已接受 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |

**外键：**
- room_id → rooms(id) ON DELETE CASCADE
- inviter_id → users(id) ON DELETE CASCADE

**索引：**
- PRIMARY KEY (id)
- UNIQUE INDEX (token)
- INDEX (room_id)
- INDEX (invitee_email)

---

## 数据库选择建议

### PostgreSQL（推荐）
- 支持 JSON 字段类型
- BYTEA 类型适合存储二进制 Yjs 数据
- 成熟的事务支持
- 丰富的索引类型

### MySQL/MariaDB
- JSON 类型支持（5.7+）
- BLOB 存储二进制数据
- 广泛使用，生态成熟

### Yjs 文档持久化方案
1. **LevelDB**（推荐）：
   - 高性能键值存储
   - y-websocket 原生支持
   - 适合增量更新

2. **PostgreSQL/MySQL**：
   - 作为备份和审计日志
   - 支持跨房间查询

3. **混合方案**：
   - LevelDB 存储实时文档
   - PostgreSQL 定期快照备份

---

## 初始化脚本示例（PostgreSQL）

```sql
-- 创建用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建房间表
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    password VARCHAR(255),
    settings JSON,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建房间成员表
CREATE TABLE room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- 创建刷新令牌表
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 创建文档持久化表
CREATE TABLE room_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    doc_name VARCHAR(100) NOT NULL DEFAULT 'room',
    doc_data BYTEA NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(room_id, doc_name)
);

-- 创建索引
CREATE INDEX idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX idx_room_members_user_id ON room_members(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_room_documents_snapshot ON room_documents(is_snapshot, updated_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_room_documents_updated_at BEFORE UPDATE ON room_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 数据迁移与版本控制

建议使用以下工具进行数据库迁移管理：

- **Prisma**：TypeScript 原生支持，类型安全
- **TypeORM**：成熟的 ORM，支持多种数据库
- **Knex.js**：灵活的查询构建器和迁移工具
- **node-pg-migrate**：轻量级 PostgreSQL 迁移工具

---

## 安全建议

1. **密码存储**：使用 bcrypt（成本因子 ≥ 10）
2. **令牌存储**：刷新令牌需哈希后存储
3. **索引敏感字段**：避免在 password_hash 上建索引
4. **数据加密**：生产环境启用数据库连接 SSL/TLS
5. **定期清理**：自动清理过期的 refresh_tokens 和 invitations
6. **备份策略**：定期备份数据库和 Yjs 文档
