# Constella Backend (Server)

[CN](/README.md) | [EN](./README-en.md)

> The **core backend service** of Constella, a real-time collaborative infinite canvas. It is responsible for authentication, room and permission management, real-time collaboration relay, data persistence, and public REST APIs.

This repository represents the **infrastructure and central nervous system** of the Constella system. It is not a simple CRUD API service, but a complete backend engineered around **collaborative consistency**, **clear permission boundaries**, and **data reliability**.

The backend is built with **Node.js + TypeScript** and can be deployed on **self-hosted servers** or via **Docker / Docker Compose**.

---

## ✨ Core Capabilities Overview

The Constella backend is responsible for the key functions required to keep the collaborative canvas running smoothly:

* 🔐 **Authentication & Authorization**
  User registration and login, JWT access tokens, and refresh-token rotation.

* 🏠 **Room & Permission Management**
  Room creation and joining, public/private rooms, invitation mechanisms, member roles, and permission control.

* 🤝 **Real-time Collaboration Relay (Yjs)**
  Multi-user real-time synchronization based on **Yjs + y-websocket** (or a custom relay implementation).

* 💾 **Data Persistence System**

  * PostgreSQL: relational core data such as users and rooms
  * LevelDB: persistence and recovery of Yjs document states

* 📑 **REST API Service**
  Well-defined API contracts with unified error codes and response formats (see `docs/`).

* 🐳 **Production-oriented Deployment Support**
  Built-in Docker Compose configuration, compatible with reverse proxies and TLS setups.

---

## 🧱 Tech Stack

* **Language**: TypeScript
* **Runtime**: Node.js
* **Web Framework**: Express / Koa (depending on the actual implementation)
* **Real-time Collaboration**: Yjs + y-websocket
* **Databases**:

  * PostgreSQL (core business and relational data)
  * LevelDB (Yjs collaboration state persistence)
* **Testing**: Jest
* **Deployment**: Docker / Docker Compose

The backend is designed with a strong focus on:

> **Data consistency under concurrent collaboration, clear permission boundaries, and system recoverability.**

---

## 🚀 Quick Start (Development)

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Prepare Configuration

Copy the default configuration and customize it as needed:

```bash
cp config/default.yaml config/local.yaml
# Edit config/local.yaml to configure database, ports, JWT secrets, TLS, etc.
```

> The configuration includes server ports, database connections, JWT secrets, and Yjs relay settings.

### 3. Start Development Server

```bash
npm run dev
```

---

## 📦 Production Deployment (Docker)

The project includes a `docker-compose.yml` for quickly starting:

* Constella backend service
* PostgreSQL database
* Yjs WebSocket collaboration service

### Start Services

```bash
docker-compose up -d
```

### Deployment Notes

* Ensure that your reverse proxy (e.g., Nginx) **correctly forwards WebSocket connections** (such as `/yjs/:roomId`).
* The proxy must not strip the `Authorization` header.
* Enabling TLS is strongly recommended to protect authentication credentials and collaboration data.

---

## 🔧 Configuration Details

* `config/default.yaml`
  Base configuration: ports, database connections, JWT secrets, Yjs relay parameters, etc.

* `config/local.yaml`
  Environment-specific overrides (recommended).

* **Environment variables take precedence over configuration files**, which is suitable for containerized deployments.

* Database migration scripts are located at:

```text
server/src/database/migrations/
```

Please run migrations before first deployment or after schema changes.

---

## 🔍 Documentation & References

* 📘 **API Documentation**: `docs/API.md`
* 🚨 **Error Codes & Response Specification**: `docs/ERROR_CODES.md`
* 🏠 **Room & Permission Model**: `docs/ROOM_SETTINGS.md`
* 🛠 **Deployment & Development Guide**: `docs/Constella_README.md`

---

## 🛠️ Common Issues & Troubleshooting

* **401 Unauthorized**
  Verify that the client sends `Authorization: Bearer <token>` correctly and that the proxy does not remove this header.

* **Yjs Connection Failure**
  Check WebSocket routing, token validation logic, and whether WSS is required.

* **Database Connection Failure**
  Verify database addresses and credentials in the configuration files and inspect service or container logs.

---

## 🤝 Project Status & Contributing

The Constella backend is initiated and maintained by a student developer and is **not yet a fully mature, production-grade system**. Several areas are still under active iteration, including:

* Refinement of room and permission models
* Collaboration scalability and performance strategies
* Optimization of persistence and recovery mechanisms

Contributions are highly welcome, especially if you are interested in:

* Real-time collaborative systems (Yjs)
* Backend architecture and scalability
* Permission models and multi-user system design

You can participate by:

* ⭐ Starring the project to show support
* 🛠 Submitting Pull Requests to improve or extend functionality
* 💬 Opening Issues to discuss bugs, ideas, or architectural decisions

---

## 📄 License

MIT
