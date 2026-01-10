# API 设计（最小集合）

## 统一返回体
```json
{
    "code": 状态码,
    "message": "English message",
    "data": "ERROR_CODE" || {} || [] || null
}
```

### HTTP 状态码

- 200 正常返回
- 201 创建成功
- 400 请求错误
- 401 登录失效/未认证
- 403 权限不足
- 404 未找到
- 409 冲突（如资源已存在）
- 500 服务器错误

### 错误码

所有错误码详见 [ERROR_CODES.md](./ERROR_CODES.md)

**认证相关错误码示例：**
- `AUTH_MISSING_FIELDS` - 必填字段缺失
- `AUTH_EMAIL_EXISTS` - 邮箱已被注册
- `AUTH_USERNAME_EXISTS` - 用户名已被使用
- `AUTH_INVALID_CREDENTIALS` - 登录凭证错误
- `AUTH_INVALID_TOKEN` - 令牌无效
- `AUTH_TOKEN_REVOKED` - 令牌已被撤销
- `AUTH_TOKEN_EXPIRED` - 令牌已过期

**前端多语言处理：**
前端应根据 `data` 字段中的错误码进行多语言映射，不应直接显示 `message` 字段内容。

## 认证
### POST /api/v1/auth/register
注册新用户

**Request Body:**
```json
{
    "username": "string",
    "email": "string",
    "password": "string"
}
```

**Success Response (200):**
```json
{
    "code": 200,
    "message": "Registration successful",
    "data": {
        "user": {
            "id": "uuid",
            "username": "string",
            "email": "string",
            "created_at": "ISO8601"
        },
        "access_token": "string",
        "refresh_token": "string"
    }
}
```

**Error Responses:**
- 400 - Missing fields: `{ "code": 400, "message": "Required fields are missing", "data": "AUTH_MISSING_FIELDS" }`
- 409 - Email exists: `{ "code": 409, "message": "Email already registered", "data": "AUTH_EMAIL_EXISTS" }`
- 409 - Username exists: `{ "code": 409, "message": "Username already taken", "data": "AUTH_USERNAME_EXISTS" }`

### POST /api/v1/auth/login
用户登录

**Request Body:**
```json
{
    "email": "string",
    "password": "string"
}
```

**Success Response (200):**
```json
{
    "code": 200,
    "message": "Login successful",
    "data": {
        "access_token": "string",
        "refresh_token": "string"
    }
}
```

**Error Responses:**
- 400 - Missing fields: `{ "code": 400, "message": "Required fields are missing", "data": "AUTH_MISSING_FIELDS" }`
- 401 - Invalid credentials: `{ "code": 401, "message": "Invalid email or password", "data": "AUTH_INVALID_CREDENTIALS" }`

### POST /api/v1/auth/refresh
刷新访问令牌

**Request Body:**
```json
{
    "refresh_token": "string"
}
```

**Success Response (200):**
```json
{
    "code": 200,
    "message": "Token refresh successful",
    "data": {
        "access_token": "string"
    }
}
```

**Error Responses:**
- 400 - Missing token: `{ "code": 400, "message": "Refresh token is required", "data": "AUTH_TOKEN_MISSING" }`
- 401 - Invalid token: `{ "code": 401, "message": "Invalid refresh token", "data": "AUTH_INVALID_TOKEN" }`
- 401 - Token revoked: `{ "code": 401, "message": "Refresh token has been revoked", "data": "AUTH_TOKEN_REVOKED" }`
- 401 - Token expired: `{ "code": 401, "message": "Refresh token has expired", "data": "AUTH_TOKEN_EXPIRED" }`

## 用户
- GET /api/v1/users/:id
  Auth: Bearer
  返回用户信息（不含 password_hash）

## 房间
- POST /api/v1/rooms
  Auth: Bearer
  body: { name, is_private, password?, settings? }
  返回: { room }

- GET /api/v1/rooms
  支持分页与按用户过滤

- GET /api/v1/rooms/:id
  返回房间元数据（含权限概览）

- POST /api/v1/rooms/:id/join
  body: { password? }
  处理加入与权限校验

- POST /api/v1/rooms/:id/invite
  权限: 房主或管理员
  body: { email, role }

- PUT /api/v1/rooms/:id/permissions
  权限: 房主/管理员，更新成员权限

- POST /api/v1/rooms/:id/relay-token
  Auth: Bearer
  Returns: short-lived token 用于 WSS（包含 room_id, user_id, exp, signature）

## 健康检查
- GET /api/v1/health
  返回 200 OK

## 授权说明
- relay-token 应包含 room_id、user_id、exp 与签名（HMAC 或 JWT）；relay 在 WSS 握手时验证 token。

# Yjs 文档结构与持久化策略

## 命名
- 每个房间对应一个 Y.Doc，标识为 `room:<room_id>`。

## Root 结构（建议）
- root (Y.Map)
  - meta (Y.Map): { title, createdBy, createdAt, version }
  - nodes (Y.Map): key=nodeId -> Y.Map { type, x, y, width, height, data: Y.Map }
  - edges (Y.Map): key=edgeId -> Y.Map { from, to, points: Y.Array, props: Y.Map }
  - layers / zOrder (Y.Array 或 Y.Map)
  - appState (Y.Map): 缩放、偏移、当前工具等

## Awareness
- 使用 y-protocols/awareness，在内存中广播，不持久化到 doc。

## 持久化（建议）
- 使用 `y-websocket` relay + LevelDB 或文件存储：
  - relay 在接收 update 时写入增量到 LevelDB（按 room 存储）。
  - 定期做 snapshot/压缩。
  - 客户端连接时，relay 从持久化加载最新状态并应用。

## 授权与安全
- relay 必须在 WSS 握手时验证短期 token（来自主后端，包含 room_id、user_id、exp、签名）。
- 强制在生产环境使用 WSS（TLS）。
