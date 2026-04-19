## 概述

本文档说明 Constella 当前版本的房间权限模型、角色能力边界、接口访问规则与安全建议。

适用范围：

1. 房间成员管理。
2. 房间设置更新与安全设置保护。
3. 房间实时协作 Relay Token 权限。

---

## 角色模型

系统当前角色定义见 `RoomRole`：

- `owner`
- `admin`
- `editor`
- `viewer`
- `member`（兼容别名，运行时会归一化为 `editor`）

说明：

1. 在服务层归一化逻辑中，`member` 会被映射到 `editor`。
2. 建议新实现仅使用 `owner/admin/editor/viewer`，避免歧义。

---

## 能力矩阵

下表对应服务端 `buildCapabilities` 的实际行为。

| 能力                                | owner | admin | editor | viewer |
| ----------------------------------- | ----- | ----- | ------ | ------ |
| 查看房间 (`can_view`)             | 是    | 是    | 是     | 是     |
| 编辑内容 (`can_edit`)             | 是    | 是    | 是     | 否     |
| 管理成员 (`can_manage_members`)   | 是    | 是    | 否     | 否     |
| 管理房间 (`can_manage_room`)      | 是    | 是    | 否     | 否     |
| 上传资源 (`can_upload_assets`)    | 是    | 是    | 是     | 否     |
| 管理快照 (`can_manage_snapshots`) | 是    | 是    | 否     | 否     |
| 删除房间 (`can_delete_room`)      | 是    | 否    | 否     | 否     |

---

## 关键权限规则

### 1. 访问控制

1. 公开房间：允许访问详情。
2. 私密房间：必须是成员才能访问详情。
3. 非成员访问私密房间时，仅允许在受控场景下查看预览，不授予成员能力。

### 2. 邀请成员

允许角色：`owner`、`admin`。

限制：

1. 邀请者必须是房间成员。
2. 被邀请用户必须存在。
3. 被邀请用户不能已是该房间成员。
4. 默认邀请角色为 `editor`。

### 3. 修改成员角色

允许角色：`owner`、`admin`。

限制：

1. `owner` 角色不能通过普通改角色接口变更。
2. `owner` 角色变更只能通过“转移所有权”流程。
3. `admin` 不能将任何成员提升为 `admin`。
4. `admin` 不能修改现有 `admin` 的角色。

### 4. 移除成员

允许角色：`owner`、`admin`。

限制：

1. 不能移除 `owner`。
2. `admin` 不能移除其他 `admin`。

### 5. 转移所有权

允许角色：仅 `owner`。

流程：

1. 当前 `owner` 降级为 `admin`。
2. 目标成员升级为 `owner`。
3. 房间 `owner_id` 同步更新。
4. 广播权限变更与所有权转移事件。

### 6. 更新房间设置

允许角色：`owner`、`admin`。

附加限制：

1. 涉及安全设置（`is_private` 或 `permissions`）时，仅 `owner` 可修改。
2. `admin` 可修改非安全项（如部分 `appearance/canvas/collaboration`）。

### 7. 删除房间

允许角色：仅 `owner`。

附加限制：

1. 私密房间删除需再次校验房间密码。
2. 密码错误返回未授权错误。

### 8. Relay Token（实时协作）

允许角色：房间成员。

规则：

1. 非成员不可获取 Relay Token。
2. Token 中包含 `role` 和 `can_write`。
3. `can_write` 由角色能力 (`can_edit`) 决定。

---

## 接口权限矩阵

以下为房间相关接口的建议使用说明（基于当前代码行为）。

| 接口                                                       | 方法   | 认证 | 允许角色                      |
| ---------------------------------------------------------- | ------ | ---- | ----------------------------- |
| `/api/v1/rooms`                                          | POST   | 需要 | 登录用户                      |
| `/api/v1/rooms/all`                                      | GET    | 需要 | 登录用户                      |
| `/api/v1/rooms/:id`                                      | GET    | 需要 | 成员（私密房间）              |
| `/api/v1/rooms/:id/join`                                 | POST   | 需要 | 登录用户                      |
| `/api/v1/rooms/:id/invite`                               | POST   | 需要 | owner/admin                   |
| `/api/v1/rooms/:id/members`                              | GET    | 需要 | 成员                          |
| `/api/v1/rooms/:id/members/:memberId/role`               | PATCH  | 需要 | owner/admin                   |
| `/api/v1/rooms/:id/members/:memberId`                    | DELETE | 需要 | owner/admin                   |
| `/api/v1/rooms/:id/members/:memberId/transfer-ownership` | POST   | 需要 | owner                         |
| `/api/v1/rooms/:id/settings`                             | PATCH  | 需要 | owner/admin（安全项仅 owner） |
| `/api/v1/rooms/:id/relay-token`                          | POST   | 需要 | 成员                          |
| `/api/v1/rooms/:id`                                      | DELETE | 需要 | owner                         |

说明：

1. 仍保留的旧接口 `PUT /api/v1/rooms/:id/permissions` 会委托到成员角色更新逻辑。
2. 新实现建议优先使用 `PATCH /members/:memberId/role`。

---

## 默认入房角色

当用户加入房间时，系统会读取：

- `settings.permissions.defaultRole`

当前有效值：

1. `editor`
2. `viewer`

若配置缺失或无效，默认使用 `editor`。

---

## 安全建议

1. 私密房间默认把 `defaultRole` 设为 `viewer`。
2. 私密协作启用 `requireApproval = true`。
3. 限制邀请权限，必要时设置 `allowInvite = false`。
4. 对高敏房间定期审计角色变更与成员进出记录。
5. 对“角色提升到 editor/admin”操作做二次确认或审批。
6. 为成员管理与权限变更事件配置告警。

---

## 常见问题

### Q1: 为什么 `member` 看起来和 `editor` 一样？

为兼容历史数据，`member` 在服务端会被归一化为 `editor`。建议后续统一迁移为显式 `editor`。

### Q2: 为什么 admin 不能改 owner？

这是显式安全限制，防止管理员绕过“所有权转移”流程直接接管房间。

### Q3: 为什么 admin 不能修改安全设置？

安全设置（隐私性与权限策略）影响全房间安全边界，因此限定仅 owner 可改。

---

## 相关文档

- 房间配置文档
- 数据库文档
- API 文档
