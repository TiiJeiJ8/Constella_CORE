import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

let ydoc = null;
let provider = null;
let ytext = null;
let isLocalChange = false;
let currentUserId = null;
let currentUserColor = null;

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
    const wsUrl = `ws://${window.location.hostname}:3000/ws`;

    log('正在连接到房间: ' + roomId, 'info');

    try {
        // 生成用户ID和颜色
        currentUserId = 'user-' + Math.random().toString(36).substr(2, 9);
        currentUserColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        
        // 显示当前用户ID
        document.getElementById('currentUserId').textContent = currentUserId;
        document.getElementById('currentUserId').style.color = currentUserColor;
        
        // 创建 Yjs 文档
        ydoc = new Y.Doc();
        
        // 创建 WebSocket provider
        provider = new WebsocketProvider(wsUrl, roomId, ydoc);
        
        // 设置本地 awareness 状态
        provider.awareness.setLocalState({
            user: {
                id: currentUserId,
                name: currentUserId,
                color: currentUserColor
            },
            cursor: null
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
                // 保存当前光标位置
                const cursorStart = editor.selectionStart;
                const cursorEnd = editor.selectionEnd;
                const hadFocus = document.activeElement === editor;
                
                // 更新内容
                editor.value = ytext.toString();
                
                // 恢复光标位置
                if (hadFocus) {
                    editor.setSelectionRange(cursorStart, cursorEnd);
                }
                
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
            
            // 更新光标位置
            updateCursorPosition();
        });
        
        // 监听光标位置变化
        editor.addEventListener('selectionchange', updateCursorPosition);
        editor.addEventListener('click', updateCursorPosition);
        editor.addEventListener('keyup', updateCursorPosition);

        // 监听 awareness 变化以更新在线用户数和光标
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
            
            // 渲染其他用户的光标
            renderCursors(allStates, localClientId);
        });

    } catch (error) {
        log('❌ 连接失败: ' + error.message, 'error');
        console.error(error);
    }
}

function updateCursorPosition() {
    if (!provider || !provider.awareness) return;
    
    const editor = document.getElementById('editor');
    const cursorPos = editor.selectionStart;
    
    // 更新本地 awareness 状态中的光标位置
    const currentState = provider.awareness.getLocalState();
    provider.awareness.setLocalState({
        ...currentState,
        cursor: {
            position: cursorPos,
            selectionEnd: editor.selectionEnd
        }
    });
}

function renderCursors(allStates, localClientId) {
    const cursorsLayer = document.getElementById('cursors');
    const editor = document.getElementById('editor');
    
    if (!cursorsLayer || !editor) return;
    
    // 清空现有光标
    cursorsLayer.innerHTML = '';
    
    // 获取编辑器的滚动信息
    const scrollTop = editor.scrollTop;
    const scrollLeft = editor.scrollLeft;
    
    // 获取计算样式
    const computedStyle = window.getComputedStyle(editor);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const fontSize = parseFloat(computedStyle.fontSize) || 14;
    const charWidth = fontSize * 0.6; // 更精确的字符宽度估算
    
    // 渲染其他用户的光标
    allStates.forEach((state, clientId) => {
        if (clientId === localClientId || !state || !state.cursor || !state.user) return;
        
        const { position } = state.cursor;
        const { color, name } = state.user;
        
        // 计算光标位置
        const textBeforeCursor = editor.value.substring(0, position);
        const lines = textBeforeCursor.split('\n');
        const lineNumber = lines.length - 1;
        const columnNumber = lines[lines.length - 1].length;
        
        // 计算光标的像素位置
        const top = lineNumber * lineHeight - scrollTop;
        const left = columnNumber * charWidth - scrollLeft;
        
        // 只显示可见区域内的光标
        if (top < -lineHeight || top > editor.clientHeight) return;
        if (left < -100 || left > editor.clientWidth) return;
        
        // 创建光标元素
        const cursorEl = document.createElement('div');
        cursorEl.className = 'remote-cursor';
        cursorEl.style.position = 'absolute';
        cursorEl.style.top = Math.max(0, top) + 'px';
        cursorEl.style.left = Math.max(0, left) + 'px';
        cursorEl.style.borderLeft = `2px solid ${color}`;
        cursorEl.style.height = lineHeight + 'px';
        cursorEl.style.pointerEvents = 'none';
        cursorEl.style.zIndex = '1000';
        
        // 创建用户名标签
        const labelEl = document.createElement('div');
        labelEl.className = 'cursor-label';
        labelEl.textContent = name;
        labelEl.style.position = 'absolute';
        labelEl.style.top = '-22px';
        labelEl.style.left = '0px';
        labelEl.style.backgroundColor = color;
        labelEl.style.color = 'white';
        labelEl.style.padding = '2px 6px';
        labelEl.style.borderRadius = '3px';
        labelEl.style.fontSize = '11px';
        labelEl.style.whiteSpace = 'nowrap';
        labelEl.style.pointerEvents = 'none';
        labelEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        cursorEl.appendChild(labelEl);
        cursorsLayer.appendChild(cursorEl);
    });
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
    document.getElementById('currentUserId').textContent = '-';
    document.getElementById('currentUserId').style.color = '';
    document.getElementById('cursors').innerHTML = '';
    
    currentUserId = null;
    currentUserColor = null;

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
