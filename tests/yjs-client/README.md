# YJS 客户端测试项目

## 安装依赖

```bash
cd tests/yjs-client
npm install
```

## 运行开发服务器

```bash
npm run dev
```

这将启动 Vite 开发服务器在 http://localhost:5173

## 使用说明

1. 确保后端服务器正在运行 (`npm run dev` 在项目根目录)
2. 在浏览器打开 http://localhost:5173
3. 输入房间 ID 并点击"连接到房间"
4. 在多个浏览器窗口测试实时协作

## 构建生产版本

```bash
npm run build
```

构建输出将在 `dist` 目录中。
