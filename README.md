# Constella Server

Constella 的后端服务，负责认证、房间与权限、资源管理、局域网发现发布，以及 Yjs 协作中继。

[English](./README-en.md) | [前端](https://github.com/TiiJeiJ8/Constella)

## 版本

- 当前后端版本：`1.0.1`

## 运行要求

- Node.js：`22.12.0` (适用于独立服务器部署；Electron 桌面应用捆绑了自己的 Node 运行环境)
- npm：`>=9`

> [!NOTE]
> 从 `v1.0.0` 开始，已移除 `pkg`/`exe` 打包路径。
> 请以 JS 运行时方式发布：`dist/` + `config/` + 生产依赖，并在目标机器安装 Node.js。

## 当前能力

- Express API 服务，统一前缀 `/api/v1`
- 健康检查与 discovery 元数据
- 认证能力：注册、登录、refresh token
- 房间能力：创建/列表/详情/加入/邀请/权限更新/删除
- 资源能力：房间内上传、列表、删除
- Yjs WebSocket 协作中继（与主服务同进程）
- 房间 relay token 生成与校验
- Bonjour/mDNS 局域网发现发布
- 数据维护任务（快照、token、孤立资源清理）

## 当前数据与持久化

- 业务数据库：`memory` 或 `sqlite`
- Yjs 持久化：`leveldb` 或 `memory`

## API 与网络基础

- HTTP 基础地址：`http://<host>:<port>/api/v1`
- 健康检查：`GET /api/v1/health`
- Yjs WebSocket 默认路径：`/ws`

## 配置加载规则

服务配置按以下顺序加载：

1. `config/default.yaml`
2. `config/{NODE_ENV}.yaml`（存在时）
3. 环境变量覆盖配置文件值

## 快速开始

```bash
cd server
npm install
npm run dev
```

## 生产运行

```bash
npm run build
npm run start:prod
```

或直接：

```bash
node dist/server.js
```

## Docker

当前仓库 `docker-compose.yml` 提供单个 `core` 服务：

```bash
docker compose up -d
```

## 常用脚本

- `npm run dev`：开发模式
- `npm run dev:sqlite`：开发模式（sqlite）
- `npm run build`：编译到 `dist/`
- `npm run start`：启动编译产物
- `npm run start:prod`：生产模式启动

## 文档

- [API](./docs/API.md)
- [错误码](./docs/ERROR_CODES.md)
- [房间设置](./docs/ROOM_SETTINGS.md)
- [数据库](./docs/DATABASE.md)
- [数据库使用](./docs/DATABASE_USAGE.md)

## License

MIT
