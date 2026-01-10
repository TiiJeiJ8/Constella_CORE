# 数据库使用指南

## 概述

Constella CORE 使用灵活的数据库配置，支持：
- **开发环境**：内存数据库（无需配置）
- **生产环境**：PostgreSQL（完整的持久化存储）

## 配置文件

### 开发环境（默认）
配置文件：[config/default.yaml](../config/default.yaml)

```yaml
database:
  type: memory  # 使用内存数据库
```

### 生产环境
配置文件：[config/production.yaml](../config/production.yaml)

```yaml
database:
  type: postgres
  postgres:
    host: ${DB_HOST}
    port: ${DB_PORT}
    database: ${DB_NAME}
    user: ${DB_USER}
    password: ${DB_PASSWORD}
```

环境变量：
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=constella_core
export DB_USER=postgres
export DB_PASSWORD=your_password
```

## 数据库管理命令

### 查看迁移状态
```bash
npm run db:status
```

### 执行迁移
```bash
npm run db:migrate
```

### 回滚最后一次迁移
```bash
npm run db:rollback
```

### 重置数据库（⚠️ 删除所有数据）
```bash
npm run db:reset
```

### 查看帮助
```bash
npm run db:help
```

## 数据库架构

根据 [DATABASE.md](DATABASE.md) 设计，包含以下表：

1. **users** - 用户表
2. **rooms** - 房间表
3. **room_members** - 房间成员关系表
4. **refresh_tokens** - JWT 刷新令牌表
5. **room_documents** - Yjs 文档持久化表
6. **room_invitations** - 房间邀请表（可选）

## 模型使用示例

### 用户模型

```typescript
import { UserModel } from './models/user.model';

// 创建用户
const user = await UserModel.create({
  username: 'john_doe',
  email: 'john@example.com',
  password_hash: hashedPassword,
});

// 查找用户
const user = await UserModel.findByEmail('john@example.com');

// 更新用户
await UserModel.update(userId, { username: 'new_name' });

// 删除用户
await UserModel.delete(userId);
```

### 房间模型

```typescript
import { RoomModel } from './models/room.model';

// 创建房间
const room = await RoomModel.create({
  name: 'My Room',
  is_private: false,
  owner_id: userId,
});

// 查找公开房间
const publicRooms = await RoomModel.findPublicRooms();

// 搜索房间
const rooms = await RoomModel.search('project');
```

### 房间成员模型

```typescript
import { RoomMemberModel } from './models/roomMember.model';
import { RoomRole } from './types/database';

// 添加成员
await RoomMemberModel.create({
  room_id: roomId,
  user_id: userId,
  role: RoomRole.MEMBER,
});

// 检查权限
const isOwner = await RoomMemberModel.isOwner(roomId, userId);
const isAdmin = await RoomMemberModel.isAdmin(roomId, userId);

// 更新角色
await RoomMemberModel.updateRole(memberId, RoomRole.ADMIN);
```

### Yjs 文档模型

```typescript
import { RoomDocumentModel } from './models/roomDocument.model';

// 保存文档
await RoomDocumentModel.upsert({
  room_id: roomId,
  doc_name: 'room',
  doc_data: yjsUpdateBuffer,
  version: 1,
});

// 获取文档
const doc = await RoomDocumentModel.findByRoomAndDoc(roomId, 'room');

// 创建快照
await RoomDocumentModel.createSnapshot(roomId, 'room', buffer, version);
```

## 部署流程

### 1. 设置 PostgreSQL

```bash
# 使用 Docker
docker run --name postgres \
  -e POSTGRES_DB=constella_core \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=constella_core
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_here
```

### 3. 运行迁移

```bash
npm run db:migrate
```

### 4. 启动服务器

```bash
npm run start:prod
```

## 开发流程

### 1. 启动开发服务器（使用内存数据库）

```bash
npm run dev
```

### 2. 切换到 PostgreSQL 测试

修改 [config/default.yaml](../config/default.yaml)：

```yaml
database:
  type: postgres  # 改为 postgres
```

然后运行迁移：

```bash
npm run db:migrate
npm run dev
```

## 数据库连接管理

数据库连接由 [src/config/database.ts](../src/config/database.ts) 管理：

```typescript
import { db } from './config/database';

// 初始化（在服务器启动时自动调用）
await db.initialize();

// 执行查询
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// 执行事务
await db.transaction(async (client) => {
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO rooms ...');
});

// 关闭连接（在服务器关闭时自动调用）
await db.close();
```

## 故障排查

### 连接失败

检查 PostgreSQL 是否运行：
```bash
docker ps | grep postgres
```

检查配置：
```bash
npm run db:status
```

### 迁移失败

查看日志并重置：
```bash
npm run db:reset
npm run db:migrate
```

### 类型错误

重新编译：
```bash
npm run build
```

## 安全建议

1. **生产环境**：
   - 使用强密码
   - 启用 SSL 连接
   - 限制数据库访问
   - 定期备份

2. **开发环境**：
   - 不要提交 `config/production.yaml`
   - 不要提交 `.env` 文件
   - 使用不同的数据库凭据

3. **密码存储**：
   - 使用 bcrypt 哈希
   - 成本因子 ≥ 10

4. **令牌管理**：
   - 刷新令牌需哈希后存储
   - 定期清理过期令牌
   - 实现令牌撤销机制

## 性能优化

1. **连接池配置**：
```yaml
database:
  postgres:
    pool:
      min: 5
      max: 20
      idleTimeoutMillis: 30000
```

2. **索引优化**：
- 所有外键已自动索引
- 常用查询字段已建索引

3. **查询优化**：
- 使用参数化查询
- 避免 N+1 查询
- 使用分页限制结果

## 更多信息

- [数据库设计文档](DATABASE.md)
- [API 文档](API.md)
- [项目 README](../README.md)
