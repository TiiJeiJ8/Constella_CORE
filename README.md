# Constella 后端（Server）

[CN](/README.md) | [EN](./README-en.md)

> Constella 实时协作无限画布的**后端核心服务**，负责身份认证、房间与权限管理、实时协作中继、数据持久化以及对外 REST API。

本仓库是 Constella 系统的**中枢与基础设施层**。它并非简单的接口服务，而是围绕「**协作一致性**」「**权限边界**」与「**数据可靠性**」构建的完整后端工程。

本仓库为 **Constella 后端代码库**，前端位于：
👉 [Constella](https://github.com/TiiJeiJ8/Constella)

后端使用 **Node.js + TypeScript** 开发，支持部署在**自有服务器**或 **Docker / Docker Compose** 环境中。

---

## ✨ 核心能力概览

Constella Backend 承担着协作画布运行所需的关键职责：

* 🔐 **用户认证与鉴权**
  支持用户注册 / 登录、JWT 访问令牌与 refresh token 轮换机制。

* 🏠 **房间与权限管理**
  房间创建与加入、公开 / 私密房间、邀请机制、成员与权限控制。

* 🤝 **实时协作中继（Yjs）**
  基于 **Yjs + y-websocket**（或自定义 relay）实现多人实时同步。

* 💾 **数据持久化体系**

  * PostgreSQL：用户、房间等关系型主数据
  * LevelDB：Yjs 文档状态持久化与恢复

* 📑 **REST API 服务**
  提供清晰的接口规范、统一错误码与响应结构（见 `docs/`）。

* 🐳 **面向生产的部署支持**
  内置 Docker Compose，适配反向代理与 TLS 场景。

---

## 🧱 技术栈

* **语言**：TypeScript
* **运行时**：Node.js
* **Web 框架**：Express / Koa（以项目实际实现为准）
* **实时协作**：Yjs + y-websocket
* **数据库**：

  * PostgreSQL（核心业务与关系数据）
  * LevelDB（Yjs 协作数据持久化）
* **测试**：Jest
* **部署**：Docker / Docker Compose

该后端的设计重点在于：

> **并发协作下的数据一致性、权限边界清晰性与系统可恢复性。**

---

## 🚀 快速启动（开发环境）

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 准备配置文件

复制默认配置并按需修改：

```bash
cp config/default.yaml config/local.yaml
# 编辑 config/local.yaml，配置数据库、端口、JWT 密钥、TLS 等
```

> 配置文件包含服务器端口、数据库连接、JWT 密钥以及 Yjs relay 相关设置。

### 3. 启动开发服务

```bash
npm run dev
```

---

## 📦 生产部署（Docker）

项目内置 `docker-compose.yml`，用于快速启动：

* Constella 后端服务
* PostgreSQL 数据库
* Yjs WebSocket 协作服务

### 启动

```bash
docker-compose up -d
```

### 部署注意事项

* 请确保反向代理（如 Nginx）**正确转发 WebSocket**（例如 `/yjs/:roomId`）。
* 代理层不得移除 `Authorization` 请求头。
* 强烈建议启用 TLS 以保护认证信息与协作数据。

---

## 🔧 配置说明

* `config/default.yaml`
  基础配置：端口、数据库连接、JWT 密钥、Yjs relay 参数等。

* `config/local.yaml`
  本地或部署环境的覆盖配置（推荐）。

* **环境变量优先级高于配置文件**，适用于容器化部署。

* 数据库迁移脚本位于：

```text
server/src/database/migrations/
```

首次部署或结构变更后请先执行迁移。

---

## 🔍 文档与参考

* 📘 **API 文档**：`docs/API.md`
* 🚨 **错误码与返回规范**：`docs/ERROR_CODES.md`
* 🏠 **房间与权限模型**：`docs/ROOM_SETTINGS.md`
* 🛠 **部署与开发说明**：`docs/Constella_README.md`

---

## 🛠️ 常见问题与排查

* **401 Unauthorized**
  确认客户端是否正确发送 `Authorization: Bearer <token>`，以及代理是否剥离该请求头。

* **Yjs 无法建立连接**
  检查 WebSocket 路由、token 校验方式，以及是否需要使用 WSS。

* **数据库连接失败**
  核对配置文件中的数据库地址与凭证，并查看服务或容器日志。

---

## 🤝 项目状态与参与贡献

Constella 后端由学生个人发起并持续演进，目前**尚未达到完全成熟的生产级系统**。部分模块仍在迭代中，例如：

* 权限与房间模型的细化
* 协作扩展与性能策略
* 持久化与恢复机制的优化

如果你对以下方向感兴趣，非常欢迎参与共建：

* 实时协作系统（Yjs）
* 后端架构与可扩展性
* 权限模型与多用户系统设计

你可以通过以下方式参与：

* ⭐ Star 项目表示支持
* 🛠 提交 Pull Request 改进或扩展功能
* 💬 提出 Issue 讨论问题与设计方向

---

## 📄 License

MIT
