import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

let ydoc = null;
let provider = null;
let ytext = null;
let isLocalChange = false;

function log(message, type = 'info') {
    const logContent = document.getElementById('logContent');
    const logItem = document.createElement('div');
    logItem.className = `log-item log-${type}`;
    
    const time = new Date().toLocaleTimeString('zh-CN');
    logItem.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    
    logContent.appendChild(logItem);
    logContent.scrollTop = logContent.scrollHeight;
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = connected ? '已连接' : '未连接';
    statusElement.className = `status-value ${connected ? 'connected' : 'disconnected'}`;
}

function connectToRoom() {
    const roomInput = document.getElementById('roomInput').value || 'test-room';
    const roomId = roomInput.startsWith('room:') ? roomInput : `room:${roomInput}`;
    const wsUrl = 'ws://192.168.1.161:3000/ws';

    log('正在连接到房间: ' + roomId, 'info');

    try {
        // 创建 Yjs 文档
        ydoc = new Y.Doc();
        
        // 创建 WebSocket provider
        provider = new WebsocketProvider(wsUrl, roomId, ydoc);
        
        // 设置本地 awareness 状态
        provider.awareness.setLocalState({
            user: {
                name: 'User-' + Math.floor(Math.random() * 1000),
                color: '#' + Math.floor(Math.random()*16777215).toString(16)
            }
        });

        // 获取共享文本类型
        ytext = ydoc.getText('content');

        // 监听连接状态
        provider.on('status', event => {
            const connected = event.status === 'connected';
            updateConnectionStatus(connected);
            
            if (connected) {
                log('✅ 成功连接到房间: ' + roomId, 'success');
                document.getElementById('editor').disabled = false;
                document.getElementById('connectBtn').disabled = true;
                document.getElementById('disconnectBtn').disabled = false;
                document.getElementById('roomInput').disabled = true;
                document.getElementById('roomIdDisplay').textContent = roomId;
            } else {
                log('❌ 连接断开', 'error');
            }
        });

        provider.on('sync', synced => {
            if (synced) {
                log('📦 文档已同步', 'success');
            }
        });

        // 监听 Yjs 文本变化
        ytext.observe(event => {
            if (!isLocalChange) {
                const editor = document.getElementById('editor');
                editor.value = ytext.toString();
                log('📥 收到远程更新', 'info');
            }
            isLocalChange = false;
        });

        // 初始化编辑器内容
        const editor = document.getElementById('editor');
        editor.value = ytext.toString();

        // 监听编辑器变化
        editor.addEventListener('input', () => {
            isLocalChange = true;
            const content = editor.value;
            
            // 更新 Yjs 文档
            ydoc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, content);
            });
        });

        // 监听 awareness 变化以更新在线用户数
        provider.awareness.on('change', () => {
            const allStates = provider.awareness.getStates();
            const localClientId = ydoc.clientID;
            
            // 计算在线用户数（包括自己）
            let userCount = 0;
            allStates.forEach((state, clientId) => {
                // 只计算有效的状态（非空对象）
                if (state && Object.keys(state).length > 0) {
                    userCount++;
                }
            });
            
            document.getElementById('userCount').textContent = userCount;
            log(`👥 当前在线: ${userCount} 人`, 'info');
        });

    } catch (error) {
        log('❌ 连接失败: ' + error.message, 'error');
        console.error(error);
    }
}

function disconnectFromRoom() {
    if (provider) {
        provider.destroy();
        provider = null;
    }
    
    if (ydoc) {
        ydoc.destroy();
        ydoc = null;
    }

    ytext = null;
    
    updateConnectionStatus(false);
    document.getElementById('editor').disabled = true;
    document.getElementById('editor').value = '';
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
    document.getElementById('roomInput').disabled = false;
    document.getElementById('roomIdDisplay').textContent = '-';
    document.getElementById('userCount').textContent = '0';

    log('🔌 已断开连接', 'info');
}

// 页面加载完成后的初始化
window.addEventListener('load', () => {
    log('🚀 YJS 测试页面已加载', 'success');
    log('💡 提示: 在多个浏览器窗口打开此页面以测试实时协作', 'info');
    
    // 绑定按钮事件
    document.getElementById('connectBtn').addEventListener('click', connectToRoom);
    document.getElementById('disconnectBtn').addEventListener('click', disconnectFromRoom);
});

// 页面关闭时清理
window.addEventListener('beforeunload', () => {
    disconnectFromRoom();
});
