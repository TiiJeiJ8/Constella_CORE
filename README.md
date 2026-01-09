# Constella — server（本地开发说明）

简介
- 这是后端服务的本地开发说明，包含启动、迁移与测试的快速命令。

必备环境
- Go 1.20+（或仓库 go.mod 中指定的版本）
- （可选）Postgres 数据库，用于持久化（开发/CI 可选）
- （可选）`migrate` CLI：用于执行 SQL 迁移（https://github.com/golang-migrate/migrate）

主要环境变量
- `PORT`：服务监听端口（默认 3000）
- `DATASTORE`：`memory`（默认）或 `postgres`（选择持久化存储）
- `DATABASE_URL`：Postgres 连接字符串（用于 `DATASTORE=postgres`）
- `CONSTELLA_JWT_SECRET`：JWT 签名密钥（开发默认会回退到 `dev-secret-change-me` 并打印警告）

快速开始（内存仓库，推荐用于日常开发）
```powershell
cd "D:\Learning Material\Git\Constella\server"
go run ./cmd/server
```

切换到 Postgres（持久化）
1. 确保 Postgres 可用并创建数据库（例如 `constella`）。
2. 运行迁移（需安装 `migrate` CLI）：
```powershell
./scripts/migrate.sh up "postgres://user:pass@localhost:5432/constella?sslmode=disable"
# 或 PowerShell
.\scripts\migrate.ps1 -cmd up -db "postgres://user:pass@localhost:5432/constella?sslmode=disable"
```
3. 启动服务（示例）：
```powershell
$env:DATASTORE='postgres'
$env:DATABASE_URL='postgres://user:pass@localhost:5432/constella?sslmode=disable'
$env:CONSTELLA_JWT_SECRET='your-strong-secret'
go run ./cmd/server
```

安装 Postgres 驱动（推荐 `pgx`）
```powershell
go get github.com/jackc/pgx/v5/stdlib
go mod tidy
```

测试
- 快速手动脚本：`./tests/run_manual_tests.ps1`（PowerShell） 或 `./tests/run_manual_tests.sh`（Bash）。
- Go 测试（默认不运行标记为 `integration` 的测试）：
```powershell
# 默认运行（不包含 integration tests）
go test ./...
# 运行带 integration tag 的测试
go test -tags=integration ./...
```

迁移文件位置
- 所有迁移脚本位于 `server/migrations/`。

更多文档
- 设计与迁移说明见 `doc/design/migrations.md` 与 `doc/design/tests.md`。
