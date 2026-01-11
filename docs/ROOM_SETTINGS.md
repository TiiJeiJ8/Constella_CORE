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
2. 保持至少一个主版本的兼容期
3. 提供迁移指南
4. 在文档中说明替代方案

---

## 相关文档

- [数据库结构设计](./DATABASE.md)
- [API 设计文档](./API.md)
- [房间权限管理](./PERMISSIONS.md)（待创建）

---

**最后更新**: 2026-01-11
**版本**: 1.0.0
