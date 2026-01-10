# Constella 测试文档

## 📋 测试文件概览

本项目包含以下测试文件：

### API 测试
- `auth.test.ts` - 认证 API 测试（注册、登录、刷新令牌）
- `health.test.ts` - 健康检查 API 测试 ✅ **全部通过**
- `room.test.ts` - 房间管理 API 测试（创建、加入、邀请、权限等）
- `user.test.ts` - 用户 API 测试（获取用户信息）

### YJS 协作测试
- `yjs-test.html` - YJS 实时协作测试网页

## 🚀 运行测试

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
npm test health.test.ts
```

### 运行测试并生成覆盖率报告
```bash
npm run test:coverage
```

### 监听模式运行测试
```bash
npm run test:watch
```

## 🌐 YJS 实时协作测试

### 使用 YJS 测试网页

1. 启动后端服务器：
```bash
npm run dev
```

2. 在浏览器中打开测试页面：
```
http://localhost:3000/tests/yjs-test.html
```

3. 测试步骤：
   - 输入房间 ID（或使用默认的 test-room）
   - 点击"连接到房间"按钮
   - 在文本框中输入内容
   - 在另一个浏览器窗口/标签页打开相同页面
   - 观察实时同步效果

### YJS 测试功能
- ✅ WebSocket 连接状态显示
- ✅ 房间 ID 管理
- ✅ 在线用户数量统计
- ✅ 实时文本协作编辑
- ✅ 连接日志记录
- ✅ 响应式设计，支持移动端
- ✅ 静态文件服务已配置（开发和测试环境）

## 📊 测试覆盖率

运行 `npm run test:coverage` 后，可以在以下位置查看详细的覆盖率报告：
- 控制台输出：文本格式的覆盖率摘要
- `coverage/lcov-report/index.html`：HTML 格式的详细报告

## ⚙️ 测试配置

测试配置位于 `jest.config.js`，包括：
- 使用 `ts-jest` 预设进行 TypeScript 支持
- 测试文件位于 `tests/` 目录
- 支持路径别名映射
- 自动生成覆盖率报告
- Mock 数据库用于测试

## 🔧 测试环境

测试使用 `NODE_ENV=test` 环境变量运行，确保：
- 使用测试配置 (`config/test.yaml`)
- 使用内存数据库（不影响生产数据）
- Mock 数据库查询
- 每个测试套件独立运行

## 📝 当前状态

### ✅ 已完成
- Health API 测试 - **5/5 通过**
- YJS 测试网页已创建并可访问
- 静态文件服务已配置
- Mock 数据库已设置

### 🔄 待修复
- Auth API 测试 - 需要完善数据库 Mock
- Room API 测试 - 需要完善数据库 Mock
- User API 测试 - 需要完善数据库 Mock

## 🐛 故障排查

### 测试失败
- 确保环境变量 `NODE_ENV=test` 已设置
- 检查 Mock 数据库配置
- 查看错误日志了解详细信息

### 端口冲突
- 确保测试端口 3001 未被占用
- 开发服务器使用 3000 端口

### YJS 测试页面 404
- ✅ **已修复** - 静态文件服务已配置在 `src/app.ts`
- 确保服务器正在运行
- 访问 `http://localhost:3000/tests/yjs-test.html`

### 依赖问题
```bash
# 重新安装依赖
npm install

# 清理缓存
npm cache clean --force
```

## 📚 相关文档
- [Jest 文档](https://jestjs.io/)
- [Supertest 文档](https://github.com/visionmedia/supertest)
- [Yjs 文档](https://docs.yjs.dev/)
