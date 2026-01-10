# Constella — MVP Plan / 最小可行方案

**Short (EN):** Constella — A secure, real-time collaborative infinite canvas for connected notes and diagrams, deployable on your own server.

**简短（中）：** Constella — 一个可部署到自有服务器的安全实时协作无限画布，用于连接笔记与图形。

---

## 特性

- 🖥️ **跨平台桌面应用** - 基于 Electron，支持 Windows/macOS/Linux
- 🎨 **无限画布** - 使用 ReactFlow 构建的可拖拽节点与连线系统
- 🔄 **实时协作** - 基于 Yjs CRDT 实现多用户实时同步
- 💾 **离线支持** - 本地持久化，断线后可继续编辑并自动合并
- 🔐 **安全认证** - JWT 认证 + 可选端到端加密
- 🚀 **易于部署** - Docker Compose 一键部署服务端
- 📒 **卡片设计** - 每个卡片支持不同媒体格式（Markdown、Txt、Latex、Pic(compressed)......）
- 🪡 **思维导图** - 支持自定义连接线颜色，清晰搭建内容间的逻辑关系

## 目标 / Goal

- 快速实现可部署到自有服务器的协作画布（无限画布、可拖拽节点、连线）。
- 支持多用户实时协作（CRDT，使用 Yjs），离线编辑后重连合并。
- 用户注册 + 支持匿名临时会话；初始支持房间邀请（房间密码）。

## 核心功能（MVP）

- 用户注册/登录 + 匿名会话
- 创建/加入房间（room）
- 无界画布：添加节点（标签）、拖拽、连线、编辑文本（Markdown格式，支持Latex公式解析）
- 实时同步（Yjs + y-websocket）与 Awareness（在线用户/光标）
- 本地持久化（IndexedDB / electron-store）与断线重连合并
- 部署：Docker Compose + nginx（TLS）

## 技术栈（建议）

- **前端 / 桌面客户端：** Electron + React + TypeScript + React Flow（或 Konva） — 使用 Electron 主进程管理本地资源和原生 API，渲染进程运行 React 应用作为画布 UI。
- **实时同步：** Yjs（CRDT） + y-websocket（推荐用于跨设备/跨网络同步）；可选 `y-webrtc` 做 P2P 直连（局域网/无需服务器场景）。
- **后端（可选/推荐独立部署）：** Go（Golang） + Gin 或 Echo（认证/房间管理 API）。推荐使用 Go 提供认证、权限与房间管理的 REST API（例如 `gin` + `pgx` 或 `gorm`），并将 Yjs relay 作为独立进程/服务部署以负责 CRDT 实时同步（见下文）。客户端（Electron）通过 WSS 与 relay/服务通信。
- **用户数据：** PostgreSQL（用户/房间/权限）
- **Yjs 持久化：** LevelDB（或文件存储）；在 Electron 环境下也可把 Yjs 文档序列化并持久化到本地文件或 LevelDB（用于离线恢复）。注意：目前最成熟的 Yjs relay 实现是 `y-websocket`（Node.js）；建议在短期内将 `y-websocket` 作为独立服务与 Go API 并行部署（或以容器形式运行）。如需纯 Go 实现，请评估社区实现的成熟度与持久化兼容性，或将 Go API 与 Node relay 通过反向代理/认证层协同工作。
- **本地持久化：** `electron-store` 或 渲染进程的 IndexedDB（用于缓存、离线编辑和断线重连）。
- **安全：** JWT（认证）、HTTPS/WSS；后续可通过 libsodium 在客户端实现 E2E（客户端加密 Yjs update bytes）。
- **打包/部署：**
  - 客户端：`electron-builder`（生成 Windows/macOS/Linux 的安装包或便携版）
  - 服务端（若部署）：Docker + docker-compose + nginx（反向代理 + TLS）

该方案兼顾桌面原生能力（文件系统、系统剪贴板、自动更新）与跨设备实时协作能力；推荐将认证与 Yjs relay 作为独立服务部署，以便桌面客户端与移动/网页客户端均可连接。

## Yjs 文档结构建议

- `nodes` (Y.Map) : nodeId -> { id, x, y, label, meta }
- `edges` (Y.Map) : edgeId -> { id, source, target, points }
- `meta` (Y.Map) : { title, lastEditedBy }
- awareness: 在线用户、选择/光标信息

## 最小 API 设计

- POST `/api/register` { username, password } -> { token }
- POST `/api/login` { username, password } -> { token }
- POST `/api/rooms` { name, isPrivate, password? } -> { roomId }
- GET `/api/rooms` -> list
- WebSocket (Yjs): `wss://your.domain/yjs/:roomId?token=JWT`

## 部署（最小步骤）

1. 在服务器上准备：Docker, Docker Compose
2. 提供 `docker-compose.yml` 启动服务：
   - `server`（Express + y-websocket）
   - `postgres`（用户数据）
   - `leveldb`（Yjs persistence，或直接持久化到磁盘）
   - `nginx`（反向代理 + TLS）
3. 配置环境变量：`JWT_SECRET`, `DATABASE_URL`, `PORT` 等
4. 使用 certbot + nginx 获取 TLS（生产环境必须）

示例 `docker-compose` 启动命令：

```bash
docker compose up -d --build
```

## 开发与测试快速上手（本地）

- 启动后端（示例）:

```bash
# server/
npm install
npm run start
```

- 启动前端（示例）:

```bash
# client/
npm install
npm run dev
```

- 在浏览器打开前端页面，创建房间，复制房间 ID，并在另一台机器或另一个浏览器窗口连接同一 room 测试实时同步。

## E2E 加密（后续可选）

- 客户端用房间密码通过 libsodium 派生对称密钥；在 provider 层对每个 Yjs update bytes 做 secretbox 加密后发送。
- 服务器仅中继/存储加密 blob，无法读取文档内容。
- 注意：实现复杂度与 key rotation、重放防护、备份访问策略相关。

## 估时（粗略）

- 后端基础（auth + y-websocket + persistence）：1–2 天
- 前端基础（画布 + Yjs 集成）：2 天
- 本地持久化/离线测试：0.5–1 天
- Dockerize 与文档：0.5 天
- 总计：约 5–6 天（单人并行可更短）

## 验收标准（MVP）

- 任意两台客户端可在同一房间实时见到对方的节点/连线变动
- 断线后重连能合并本地更改且不丢失数据
- 支持注册/登录与匿名临时会话
- 能以 docker-compose 在自有服务器上部署并运行
