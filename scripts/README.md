# 诊断和维护工具

这个目录包含了用于诊断、测试和维护 Constella 系统的实用工具脚本。

## 📋 工具列表

### 1. check-db.js - SQLite 数据库检查

用于验证 SQLite 数据库中的数据是否正确保存。

**用法：**
```bash
node scripts/check-db.js
```

**功能：**
- ✓ 检查用户表中的数据
- ✓ 检查房间表中的数据
- ✓ 检查房间成员关系
- ✓ 检查刷新令牌
- ✓ 检查房间文档
- ✓ 显示数据库统计信息

**何时使用：**
- 验证用户注册/登录是否工作
- 检查房间创建是否保存到数据库
- 确认数据持久化是否正常

---

### 2. diagnose-yjs.js - Yjs LevelDB 诊断

检查 LevelDB 中的 Yjs 持久化数据是否存在。

**用法：**
```bash
node scripts/diagnose-yjs.js
```

**功能：**
- ✓ 列出 LevelDB 中的所有文件
- ✓ 显示文件大小
- ✓ 证实节点数据是否已保存

**输出示例：**
```
📁 LevelDB 文件：
   000007.ldb              1.61 KB
   000010.ldb              1.11 KB
   MANIFEST-000009         0.05 KB
   CURRENT                 0.01 KB
   LOG                     0.12 KB
```

**何时使用：**
- 验证节点/边/聊天内容是否被持久化
- 诊断为什么重启后数据没有恢复
- 确认 Yjs WebSocket 同步是否正常工作

---

### 3. reset-db.js - 数据库重置

清理旧数据库文件，为全新开始做准备。

**用法：**
```bash
node scripts/reset-db.js
```

**功能：**
- ✓ 删除旧的 SQLite 数据库文件
- ✓ 创建 data 目录（如果不存在）
- ✓ 准备环境进行全新初始化

**何时使用：**
- 要重新开始，清除所有用户和房间数据
- 测试全新安装流程
- 恢复到初始状态以进行演示

---

## 🚀 快速诊断流程

如果遇到数据持久化问题，按以下顺序运行工具：

### 1️⃣ 首先确保服务器正在运行
```bash
npm run dev:sqlite
```

### 2️⃣ 检查 SQLite 数据
```bash
node scripts/check-db.js
```

**预期输出：**
- 如果有用户 → ✓ 用户注册/登录工作
- 如果有房间 → ✓ 房间创建工作

### 3️⃣ 检查 Yjs LevelDB 数据
```bash
node scripts/diagnose-yjs.js
```

**预期输出：**
- 应该看到 `.ldb` 文件 → ✓ Yjs 数据被保存
- 文件大小 > 1KB → ✓ 节点数据确实存在

### 4️⃣ 测试恢复流程

1. 关闭服务器 (Ctrl+C)
2. 重启服务器：`npm run dev:sqlite`
3. 进入之前使用的房间
4. **查看浏览器 DevTools（F12）中的日志：**
   ```
   [useYjsNodes] 🔄 Syncing from Yjs, nodesMap size: 3
   [useYjsNodes] ✅ Synced 3 nodes to UI
   ```

如果看到这些日志，说明数据恢复成功！✅

---

## 📝 完整数据流

```
用户创建节点
    ↓
前端 Y.Doc 更新
    ↓
y-websocket 同步到服务器
    ↓
服务器保存到 LevelDB [可用 diagnose-yjs.js 验证]
    ↓
服务器也保存用户/房间到 SQLite [可用 check-db.js 验证]
    ↓
用户关闭浏览器
    ↓
用户重新进入房间
    ↓
服务器从 LevelDB 加载 Y.Doc
    ↓
服务器通过 y-websocket 发送到前端
    ↓
前端 Y.Doc 恢复，节点显示 ✅
```

---

## 🔧 故障排查

### 问题：check-db.js 显示无数据
**检查：** 是否已注册用户？是否已创建房间？

**解决：** 访问前端应用，注册用户并创建房间

### 问题：diagnose-yjs.js 显示无 .ldb 文件
**检查：** 是否在房间中创建了节点？

**解决：** 进入房间，创建几个节点，然后再运行诊断

### 问题：数据在数据库中但重启后未显示
**检查：** Yjs WebSocket 连接是否正常？

**解决：**
1. 打开浏览器 DevTools
2. 检查 Console 中是否有错误
3. 查看 Network → WS 标签中的 WebSocket 连接

---

## 📚 相关文件

- `../src/config/database.ts` - SQLite 配置
- `../src/yjs/server.ts` - Yjs WebSocket 服务器
- `../src/yjs/persistence.ts` - LevelDB 持久化层
- `../../web/src/composables/useYjs.ts` - 前端 Yjs 集成

---

**最后更新：** 2026年3月24日
