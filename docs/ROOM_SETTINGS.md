# Room Settings 配置文档

## 概述

房间的 `settings` 字段是一个 JSON 对象，用于存储房间的各种配置和偏好设置。该字段是可选的，提供了灵活的扩展能力，可以根据需求添加新的配置项。

---

## Settings 数据结构

### TypeScript 类型定义

```typescript
interface RoomSettings {
    permissions?: PermissionSettings;
    canvas?: CanvasSettings;
    collaboration?: CollaborationSettings;
    versioning?: VersioningSettings;
    appearance?: AppearanceSettings;
    features?: FeatureSettings;
    notifications?: NotificationSettings;
    metadata?: MetadataSettings;
}
```

---

## 配置分类详解

### 1. 权限与访问控制 (permissions)

控制房间的访问权限和成员管理策略。

```typescript
interface PermissionSettings {
    defaultRole?: 'member' | 'viewer';  // 新成员默认角色，默认: 'member'
    allowAnonymous?: boolean;           // 是否允许匿名访问，默认: false
    requireApproval?: boolean;          // 加入是否需要审批，默认: false
    allowInvite?: boolean;              // 成员是否可以邀请他人，默认: true
}
```

**使用场景：**

- 公开演示房间：`{ defaultRole: 'viewer', allowAnonymous: true }`
- 私密团队空间：`{ requireApproval: true, allowInvite: false }`

---

### 2. 画布相关配置 (canvas)

配置无限画布的默认行为和外观。

```typescript
interface CanvasSettings {
    defaultZoom?: number;        // 默认缩放级别，默认: 1.0
    gridEnabled?: boolean;       // 是否显示网格，默认: true
    snapToGrid?: boolean;        // 是否吸附到网格，默认: false
    backgroundColor?: string;    // 画布背景色，默认: '#ffffff'
    maxZoom?: number;           // 最大缩放，默认: 5.0
    minZoom?: number;           // 最小缩放，默认: 0.1
    gridSize?: number;          // 网格大小（像素），默认: 20
    gridColor?: string;         // 网格颜色，默认: '#e0e0e0'
}
```

**使用场景：**

- 设计协作：`{ gridEnabled: true, snapToGrid: true, gridSize: 10 }`
- 自由绘画：`{ gridEnabled: false, backgroundColor: '#f5f5f5' }`

---

### 3. 协作功能 (collaboration)

控制实时协作相关功能的开关。

```typescript
interface CollaborationSettings {
    enableComments?: boolean;       // 是否启用评论，默认: true
    enableChat?: boolean;           // 是否启用聊天，默认: true
    enableCursor?: boolean;         // 是否显示其他用户光标，默认: true
    enablePresence?: boolean;       // 是否显示在线状态，默认: true
    enableNotifications?: boolean;  // 是否启用通知，默认: true
    cursorColor?: 'auto' | string; // 光标颜色模式，默认: 'auto'
}
```

**使用场景：**

- 专注模式：`{ enableChat: false, enableCursor: false }`
- 完整协作：`{ enableComments: true, enableChat: true, enableCursor: true }`

---

### 4. 版本与历史 (versioning)

配置文档的自动保存和版本历史策略。

```typescript
interface VersioningSettings {
    autoSave?: boolean;          // 自动保存，默认: true
    saveInterval?: number;       // 保存间隔（秒），默认: 30
    keepHistory?: boolean;       // 是否保留历史版本，默认: true
    maxHistoryDays?: number;     // 历史保留天数，默认: 30
    maxHistoryCount?: number;    // 最大历史版本数，默认: 100
}
```

**使用场景：**

- 重要文档：`{ autoSave: true, saveInterval: 10, keepHistory: true, maxHistoryDays: 90 }`
- 临时草稿：`{ keepHistory: false, autoSave: true, saveInterval: 60 }`

---

### 5. 外观与主题 (appearance)

自定义房间的视觉外观。

```typescript
interface AppearanceSettings {
    theme?: 'light' | 'dark' | 'auto';  // 房间主题，默认: 'auto'
    icon?: string;                       // 房间图标 emoji 或 URL
    coverImage?: string;                 // 封面图片 URL
    accentColor?: string;                // 主题色，默认: '#667eea'
    fontFamily?: string;                 // 字体族
}
```

**使用场景：**

- 品牌定制：`{ accentColor: '#ff6b6b', icon: '🎨' }`
- 夜间模式：`{ theme: 'dark', backgroundColor: '#1a1a1a' }`

---

### 6. 功能开关 (features)

控制高级功能的启用状态。

```typescript
interface FeatureSettings {
    enableAI?: boolean;              // AI 辅助功能，默认: false
    enableTemplates?: boolean;       // 是否启用模板，默认: true
    enableExport?: boolean;          // 是否允许导出，默认: true
    allowedFileTypes?: string[];     // 允许的文件类型，默认: ['image/*', 'application/pdf']
    maxFileSize?: number;            // 最大文件大小（MB），默认: 10
    enablePlugins?: boolean;         // 是否允许插件，默认: false
}
```

**使用场景：**

- 限制性环境：`{ enableExport: false, allowedFileTypes: ['image/png'] }`
- 完整功能：`{ enableAI: true, enableTemplates: true, enablePlugins: true }`

---

### 7. 通知设置 (notifications)

配置房间内的通知行为。

```typescript
interface NotificationSettings {
    mentionNotify?: boolean;     // @提醒通知，默认: true
    editNotify?: boolean;        // 编辑通知，默认: false
    commentNotify?: boolean;     // 评论通知，默认: true
    emailDigest?: boolean;       // 邮件摘要，默认: false
    digestFrequency?: 'daily' | 'weekly' | 'never';  // 摘要频率，默认: 'never'
}
```

**使用场景：**

- 安静模式：`{ mentionNotify: true, editNotify: false, commentNotify: false }`
- 全通知：`{ mentionNotify: true, editNotify: true, emailDigest: true, digestFrequency: 'daily' }`

---

### 8. 自定义元数据 (metadata)

存储自定义的标签、分类等元信息。

```typescript
interface MetadataSettings {
    tags?: string[];                        // 自定义标签
    category?: string;                      // 分类
    priority?: 'low' | 'medium' | 'high';  // 优先级
    archived?: boolean;                     // 是否归档，默认: false
    customFields?: Record<string, any>;    // 自定义字段
}
```

**使用场景：**

- 项目管理：`{ tags: ['sprint-1', 'ui-design'], category: 'design', priority: 'high' }`
- 归档管理：`{ archived: true, tags: ['completed'] }`

---

## 完整示例

### 示例 1: 公开演示房间

```json
{
    "permissions": {
        "defaultRole": "viewer",
        "allowAnonymous": true,
        "allowInvite": false
    },
    "canvas": {
        "gridEnabled": false,
        "backgroundColor": "#ffffff",
        "defaultZoom": 1.0
    },
    "collaboration": {
        "enableComments": true,
        "enableChat": false,
        "enableCursor": false
    },
    "appearance": {
        "theme": "light",
        "icon": "📊",
        "accentColor": "#667eea"
    },
    "features": {
        "enableExport": true,
        "enableTemplates": false
    }
}
```

### 示例 2: 私密协作空间

```json
{
    "permissions": {
        "defaultRole": "member",
        "requireApproval": true,
        "allowInvite": true
    },
    "canvas": {
        "gridEnabled": true,
        "snapToGrid": true,
        "gridSize": 20
    },
    "collaboration": {
        "enableComments": true,
        "enableChat": true,
        "enableCursor": true,
        "enablePresence": true
    },
    "versioning": {
        "autoSave": true,
        "saveInterval": 30,
        "keepHistory": true,
        "maxHistoryDays": 90
    },
    "appearance": {
        "theme": "auto",
        "icon": "💼"
    },
    "notifications": {
        "mentionNotify": true,
        "commentNotify": true,
        "emailDigest": true,
        "digestFrequency": "daily"
    },
    "metadata": {
        "tags": ["team", "project-alpha"],
        "category": "work",
        "priority": "high"
    }
}
```

### 示例 3: 个人笔记空间

```json
{
    "canvas": {
        "defaultZoom": 1.2,
        "gridEnabled": true,
        "backgroundColor": "#fafafa"
    },
    "collaboration": {
        "enableChat": false,
        "enablePresence": false
    },
    "versioning": {
        "autoSave": true,
        "saveInterval": 10,
        "keepHistory": true
    },
    "appearance": {
        "theme": "dark",
        "icon": "📝"
    },
    "features": {
        "enableAI": true,
        "enableTemplates": true
    },
    "metadata": {
        "tags": ["personal", "notes", "learning"],
        "category": "study"
    }
}
```

---

## 默认值策略

如果某个配置项未设置，系统将使用以下默认值：

```typescript
const DEFAULT_SETTINGS: RoomSettings = {
    permissions: {
        defaultRole: 'member',
        allowAnonymous: false,
        requireApproval: false,
        allowInvite: true
    },
    canvas: {
        defaultZoom: 1.0,
        gridEnabled: true,
        snapToGrid: false,
        backgroundColor: '#ffffff',
        maxZoom: 5.0,
        minZoom: 0.1,
        gridSize: 20,
        gridColor: '#e0e0e0'
    },
    collaboration: {
        enableComments: true,
        enableChat: true,
        enableCursor: true,
        enablePresence: true,
        enableNotifications: true
    },
    versioning: {
        autoSave: true,
        saveInterval: 30,
        keepHistory: true,
        maxHistoryDays: 30,
        maxHistoryCount: 100
    },
    appearance: {
        theme: 'auto',
        accentColor: '#667eea'
    },
    features: {
        enableAI: false,
        enableTemplates: true,
        enableExport: true,
        allowedFileTypes: ['image/*', 'application/pdf'],
        maxFileSize: 10
    },
    notifications: {
        mentionNotify: true,
        editNotify: false,
        commentNotify: true,
        emailDigest: false,
        digestFrequency: 'never'
    },
    metadata: {
        archived: false
    }
};
```

---

## API 使用

### 创建房间时设置 settings

```http
POST /api/v1/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "我的项目",
    "description": "项目协作空间",
    "is_private": true,
    "settings": {
        "permissions": {
            "requireApproval": true
        },
        "appearance": {
            "icon": "🚀"
        },
        "metadata": {
            "tags": ["project", "team"]
        }
    }
}
```

### 更新房间 settings

```http
PUT /api/v1/rooms/:id
Authorization: Bearer <token>
Content-Type: application/json

{
    "settings": {
        "canvas": {
            "gridEnabled": false
        },
        "appearance": {
            "theme": "dark"
        }
    }
}
```

**注意**：更新 settings 时会进行深度合并，只更新提供的字段，其他字段保持不变。

---

## 房间安全指南

本指南聚焦私密房间（`is_private = true`）的安全建设，目标是降低未授权访问、暴力破解、误授权和数据泄露风险。

### 1. 威胁模型

重点防御以下风险：

1. 密码过弱或被暴力尝试。
2. 非成员绕过鉴权访问私密房间。
3. 角色配置错误导致越权操作。
4. 开发/测试环境中安全策略被意外放宽。
5. 缺少审计信息导致事后无法追踪。

### 2. 私密房间配置基线

建议将以下配置作为默认安全基线：

```json
{
    "is_private": true,
    "permissions": {
        "defaultRole": "viewer",
        "allowAnonymous": false,
        "requireApproval": true,
        "allowInvite": false
    },
    "features": {
        "enableExport": false,
        "enablePlugins": false
    },
    "versioning": {
        "autoSave": true,
        "keepHistory": true,
        "maxHistoryDays": 30
    }
}
```

说明：

1. `defaultRole = viewer`：新成员默认只读，降低误操作与越权风险。
2. `allowAnonymous = false`：禁止匿名访问私密房间。
3. `requireApproval = true`：成员加入需审批。
4. `allowInvite = false`：由管理员集中控制成员扩散。
5. `enableExport = false`：私密协作场景下优先防止数据外流。

### 3. 密码策略

私密房间密码建议满足：

1. 最小长度 8。
2. 同时包含大小写字母、数字、特殊字符。
3. 禁止使用房间名、用户名、常见弱口令。
4. 每 90 天轮换一次高敏感房间密码。
5. 连续失败尝试应触发限流或临时锁定。

### 4. 访问控制策略

建议角色最小权限化：

1. OWNER：仅限房间所有者，数量应尽量少。
2. ADMIN：负责成员管理，不应默认拥有删除房间权限。
3. EDITOR：仅在确有编辑需求时授予。
4. VIEWER：默认角色。

推荐流程：

1. 新成员先以 `viewer` 加入。
2. 根据任务时限临时提升为 `editor`。
3. 任务完成后降权回 `viewer`。

### 5. 鉴权与会话要求

1. HTTP API 与实时协作连接需统一鉴权。
2. 对私密房间，服务端必须校验用户成员关系，而不仅校验房间 ID。
3. 访问令牌过期时间建议短周期（如 1h），刷新令牌可中周期（如 7d）。
4. 登出时应撤销刷新令牌，避免旧会话复用。

### 6. 审计日志要求

建议至少记录以下安全事件：

1. 登录成功/失败（含来源 IP、设备信息、时间戳）。
2. 私密房间密码验证失败。
3. 成员加入、移除、角色变更。
4. 房间隐私状态切换（公开/私密）。
5. 导出、删除、分享等高风险操作。

日志实践：

1. 敏感字段脱敏（例如密码、token、cookie）。
2. 日志保留周期不少于 90 天。
3. 高风险事件可配置告警。

### 7. 开发与部署安全

1. 开发环境不要绕过私密房间鉴权逻辑。
2. 测试数据与生产数据严格隔离。
3. 环境变量与密钥不要写入仓库。
4. 生产环境开启 HTTPS 与安全响应头。
5. 定期进行依赖漏洞扫描。

### 8. 事件响应流程

若发现疑似私密房间泄露：

1. 立即轮换房间密码并撤销可疑会话。
2. 审查最近成员变更和高风险操作日志。
3. 临时将房间权限降级为只读模式。
4. 评估影响范围并通知相关成员。
5. 完成复盘并更新配置基线。

### 9. 上线前安全核查清单

- 私密房间默认开启密码保护。
- 匿名访问在私密房间中默认关闭。
- 角色默认值为 `viewer`。
- 已启用密码复杂度校验和失败限流。
- 已记录关键审计事件并完成脱敏。
- 已验证 API 与实时连接均执行成员校验。
- 已完成开发/测试环境与生产环境隔离检查。

---

## 最佳实践

1. **渐进增强**：从简单配置开始，根据需要逐步添加
2. **合理默认值**：大部分场景使用默认值即可
3. **避免过度配置**：只设置真正需要的配置项
4. **版本兼容**：新增配置项时保持向后兼容
5. **文档同步**：添加新配置时及时更新本文档

---

## 扩展指南

### 添加新配置项

1. 在对应的 interface 中添加新字段
2. 在 DEFAULT_SETTINGS 中添加默认值
3. 更新本文档
4. 在前端实现对应的 UI 控制

### 废弃配置项

1. 标记为 `@deprecated`
2. 保持至少一个主版本的兼容期提供迁移指南
3. 在文档中说明替代方案

---

## 相关文档

- [数据库结构设计](./DATABASE.md)
- [API 设计文档](./API.md)
- [房间权限管理](./PERMISSION.md)
