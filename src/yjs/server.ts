import WebSocket, { WebSocketServer } from 'ws';
import * as http from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { IPersistence } from './persistence';
import { verifyRelayToken, extractRoomId, canAccessRoom, RelayTokenPayload } from './auth';
import logger from '../config/logger';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;

// 消息类型常量
const messageSync = 0;
const messageAwareness = 1;
const messageRoomEvent = 4;
const syncMessageStep2 = 1;
const syncMessageUpdate = 2;

export interface RoomRealtimeEvent {
    type: 'room_permissions_updated';
    roomId: string;
    targetUserId: string;
    memberId: string;
    role: string;
    actorUserId: string;
}

/**
 * WebSocket 连接信息
 */
interface WSSharedDoc {
    doc: Y.Doc;
    awareness: awarenessProtocol.Awareness;
    conns: Map<WebSocket, Set<number>>;
    name: string;
}

/**
 * YJS WebSocket 服务器
 */
export class YjsWebSocketServer {
    private wss: WebSocketServer;
    private docs: Map<string, WSSharedDoc> = new Map();
    private persistence: IPersistence;
    private pingInterval: NodeJS.Timeout | null = null;

    constructor(
        private server: http.Server,
        private options: {
            path: string;
            pingInterval?: number;
            persistence: IPersistence;
        }
    ) {
        this.persistence = options.persistence;

        // 创建 WebSocket 服务器
        this.wss = new WebSocketServer({
            noServer: true,
        });

        // 设置二进制类型
        this.wss.on('connection', (ws) => {
            ws.binaryType = 'arraybuffer';
        });

        // 设置 HTTP 服务器的 upgrade 处理
        this.server.on('upgrade', this.handleUpgrade.bind(this));

        // 设置 WebSocket 连接处理
        this.wss.on('connection', this.handleConnection.bind(this));

        // 设置心跳
        if (options.pingInterval) {
            this.setupPing(options.pingInterval);
        }

        logger.info(`YJS WebSocket server initialized on path: ${options.path}`);
    }

    /**
     * 处理 WebSocket 升级请求
     */
    private handleUpgrade(request: http.IncomingMessage, socket: any, head: Buffer): void {
        const url = request.url || '';

        // 检查路径
        if (!url.startsWith(this.options.path)) {
            socket.destroy();
            return;
        }

        // 提取房间 ID（先提取，用于白名单检查）
        const roomId = extractRoomId(url);
        if (!roomId) {
            logger.warn('WebSocket upgrade rejected - invalid room ID format');
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            socket.destroy();
            return;
        }

        // 验证 token（传递 roomId 以支持测试白名单）
        const tokenPayload = verifyRelayToken(request, roomId);
        if (!tokenPayload) {
            logger.warn('WebSocket upgrade rejected - invalid or missing token');
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // 验证权限
        if (!canAccessRoom(tokenPayload, roomId)) {
            logger.warn('WebSocket upgrade rejected - access denied');
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        // 升级连接
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            // 附加用户信息和房间信息到 WebSocket
            (
                ws as WebSocket & {
                    roomId: string;
                    userId: string;
                    canWrite: boolean;
                    tokenPayload: RelayTokenPayload;
                }
            ).roomId = roomId;
            (
                ws as WebSocket & {
                    roomId: string;
                    userId: string;
                    canWrite: boolean;
                    tokenPayload: RelayTokenPayload;
                }
            ).userId = tokenPayload.user_id;
            (
                ws as WebSocket & {
                    roomId: string;
                    userId: string;
                    canWrite: boolean;
                    tokenPayload: RelayTokenPayload;
                }
            ).canWrite = tokenPayload.can_write !== false;
            (
                ws as WebSocket & {
                    roomId: string;
                    userId: string;
                    canWrite: boolean;
                    tokenPayload: RelayTokenPayload;
                }
            ).tokenPayload = tokenPayload;

            this.wss.emit('connection', ws, request);
            logger.info(`WebSocket upgraded for user ${tokenPayload.user_id} in room ${roomId}`);
        });
    }

    /**
     * 获取或创建共享文档
     */
    private async getOrCreateDoc(docName: string): Promise<WSSharedDoc> {
        if (this.docs.has(docName)) {
            logger.debug(`[Yjs] Using cached Y.Doc: ${docName}`);
            return this.docs.get(docName)!;
        }

        // 从持久化加载或创建新文档
        logger.debug(`[Yjs] Loading Y.Doc from persistence: ${docName}`);
        const doc = await this.persistence.getYDoc(docName);

        // 诊断：检查文档是否包含数据
        const nodeMap = doc.getMap('nodes');
        const edgeMap = doc.getMap('edges');
        logger.debug(`[Yjs] Loaded doc content - nodes: ${nodeMap.size}, edges: ${edgeMap.size}`);

        const awareness = new awarenessProtocol.Awareness(doc);

        const wsDoc: WSSharedDoc = {
            doc,
            awareness,
            conns: new Map(),
            name: docName,
        };

        // 监听文档更新
        doc.on('update', async (update: Uint8Array) => {
            // 持久化更新
            try {
                await this.persistence.storeUpdate(docName, update);
            } catch (error) {
                logger.error(`Error persisting update for ${docName}:`, error);
            }

            // 广播更新到所有连接
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            syncProtocol.writeUpdate(encoder, update);
            const message = encoding.toUint8Array(encoder);

            wsDoc.conns.forEach((_, conn) => {
                this.send(conn, message);
            });
        });

        // 监听 awareness 更新
        awareness.on(
            'update',
            ({
                added,
                updated,
                removed,
            }: {
                added: number[];
                updated: number[];
                removed: number[];
            }) => {
                const changedClients = added.concat(updated).concat(removed);
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, messageAwareness);
                encoding.writeVarUint8Array(
                    encoder,
                    awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
                );
                const message = encoding.toUint8Array(encoder);

                wsDoc.conns.forEach((_, conn) => {
                    this.send(conn, message);
                });
            }
        );

        this.docs.set(docName, wsDoc);
        logger.info(`Created shared document: ${docName}`);

        return wsDoc;
    }

    /**
     * 处理 WebSocket 连接
     */
    private async handleConnection(conn: WebSocket): Promise<void> {
        const roomId = (conn as WebSocket & { roomId: string }).roomId;
        const userId = (conn as WebSocket & { userId: string }).userId;

        try {
            if (!roomId) {
                conn.close();
                return;
            }

            logger.debug(`[Yjs] Getting/creating doc for room: ${roomId}`);

            // 获取共享文档
            const wsDoc = await this.getOrCreateDoc(roomId);
            wsDoc.conns.set(conn, new Set());

            // 设置消息处理
            conn.on('message', (message: Buffer | ArrayBuffer) => {
                const uint8Array = message instanceof ArrayBuffer
                    ? new Uint8Array(message)
                    : new Uint8Array(message);
                this.handleMessage(conn, wsDoc, uint8Array);
            });

            // 设置关闭处理
            conn.on('close', () => {
                this.handleClose(conn, wsDoc);
            });

            // 设置错误处理
            conn.on('error', (error) => {
                logger.error(`WebSocket error for user ${userId}:`, error);
            });

            // 发送同步步骤 1
            logger.debug(`[Yjs] Sending SyncStep1 to client for room: ${roomId}`);
            {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, messageSync);
                syncProtocol.writeSyncStep1(encoder, wsDoc.doc);
                const message = encoding.toUint8Array(encoder);
                logger.debug(`[Yjs] SyncStep1 message size: ${message.length} bytes`);
                this.send(conn, message);
            }

            // 关键修复：发送完整的文档状态作为更新
            // 这确保客户端在任何情况下都能收到所有历史数据
            {
                const currentState = Y.encodeStateAsUpdate(wsDoc.doc);
                if (currentState.length > 0) {
                    const encoder = encoding.createEncoder();
                    encoding.writeVarUint(encoder, messageSync);
                    syncProtocol.writeUpdate(encoder, currentState);
                    const message = encoding.toUint8Array(encoder);
                    logger.debug(`[Yjs] Sending full document state (${currentState.length} bytes encoded, ${message.length} bytes total)`);
                    this.send(conn, message);
                }
            }

            // 如果存在 awareness 状态，发送给新连接
            if (wsDoc.awareness.getStates().size > 0) {
                logger.debug(`[Yjs] Sending awareness states to client`);
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, messageAwareness);
                encoding.writeVarUint8Array(
                    encoder,
                    awarenessProtocol.encodeAwarenessUpdate(
                        wsDoc.awareness,
                        Array.from(wsDoc.awareness.getStates().keys())
                    )
                );
                this.send(conn, encoding.toUint8Array(encoder));
            }

            logger.info(`User ${userId} connected to room ${roomId} (${wsDoc.conns.size} connections)`);
        } catch (error) {
            logger.error(`Failed to initialize WebSocket connection for user ${userId} in room ${roomId}:`, error);
            conn.close(1011, 'Failed to initialize collaborative document');
        }
    }

    /**
     * 处理 WebSocket 消息
     */
    private handleMessage(conn: WebSocket, wsDoc: WSSharedDoc, message: Uint8Array): void {
        try {
            if (message.length === 0) {
                logger.warn('Received empty message, ignoring');
                return;
            }

            const encoder = encoding.createEncoder();
            const decoder = decoding.createDecoder(message);
            const messageType = decoding.readVarUint(decoder);

            logger.debug(`[Yjs] Received message type: ${messageType}, size: ${message.length} bytes`);

            switch (messageType) {
                case messageSync: {
                    logger.debug(`[Yjs] Processing sync message for room: ${wsDoc.name}`);
                    const syncTypeDecoder = decoding.createDecoder(message);
                    decoding.readVarUint(syncTypeDecoder);
                    const syncSubtype = decoding.readVarUint(syncTypeDecoder);
                    const canWrite = (conn as WebSocket & { canWrite?: boolean }).canWrite !== false;
                    if (!canWrite && (syncSubtype === syncMessageStep2 || syncSubtype === syncMessageUpdate)) {
                        logger.warn(`Blocked read-only sync update in room ${wsDoc.name}`);
                        return;
                    }

                    // Sync protocol 消息
                    encoding.writeVarUint(encoder, messageSync);

                    // 记录处理前的 encoder 长度
                    const encoderLenBefore = encoding.length(encoder);

                    syncProtocol.readSyncMessage(
                        decoder,
                        encoder,
                        wsDoc.doc,
                        conn
                    );

                    // 检查是否有响应
                    const encoderLenAfter = encoding.length(encoder);
                    const hasResponse = encoderLenAfter > encoderLenBefore;

                    logger.debug(`[Yjs] Sync response size: ${encoderLenAfter - encoderLenBefore} bytes${hasResponse ? '' : ' (no data to send)'}`);

                    // 如果有响应，发送回客户端
                    if (hasResponse) {
                        const responseMessage = encoding.toUint8Array(encoder);
                        logger.debug(`[Yjs] Sending sync response (${responseMessage.length} bytes)`);
                        this.send(conn, responseMessage);
                    }
                    break;
                }

                case messageAwareness: {
                    logger.debug(`[Yjs] Processing awareness update`);

                    // Awareness 消息
                    const update = decoding.readVarUint8Array(decoder);
                    const awarenessDecoder = decoding.createDecoder(update);
                    const controlledIds = wsDoc.conns.get(conn);
                    const updateCount = decoding.readVarUint(awarenessDecoder);

                    if (controlledIds) {
                        for (let index = 0; index < updateCount; index += 1) {
                            const clientId = decoding.readVarUint(awarenessDecoder);
                            controlledIds.add(clientId);
                            decoding.readVarUint(awarenessDecoder);
                            const state = JSON.parse(decoding.readVarString(awarenessDecoder));
                            if (state === null) {
                                controlledIds.delete(clientId);
                            }
                        }
                    }

                    awarenessProtocol.applyAwarenessUpdate(
                        wsDoc.awareness,
                        update,
                        conn
                    );
                    break;
                }

                default:
                    logger.warn(`Unknown message type: ${messageType}`);
            }
        } catch (error) {
            logger.error('Error handling WebSocket message:', error);
            // 不要让错误中断连接
        }
    }

    /**
     * 处理连接关闭
     */
    private handleClose(conn: WebSocket, wsDoc: WSSharedDoc): void {
        const userId = (conn as WebSocket & { userId: string }).userId;
        const controlledIds = wsDoc.conns.get(conn);

        wsDoc.conns.delete(conn);

        // 移除 awareness 状态
        if (controlledIds) {
            awarenessProtocol.removeAwarenessStates(
                wsDoc.awareness,
                Array.from(controlledIds),
                null
            );
        }

        logger.info(
            `User ${userId} disconnected from room ${wsDoc.name} (${wsDoc.conns.size} connections remaining)`
        );

        // 如果没有连接了，考虑清理文档（可选）
        if (wsDoc.conns.size === 0) {
            // 保持文档在内存中一段时间，以便快速重连
            // 或者立即清理以节省内存
            // this.docs.delete(wsDoc.name);
        }
    }

    /**
     * 发送消息
     */
    private send(conn: WebSocket, message: Uint8Array): void {
        if (conn.readyState === wsReadyStateConnecting || conn.readyState === wsReadyStateOpen) {
            conn.send(message, (error) => {
                if (error) {
                    logger.error('Error sending WebSocket message:', error);
                }
            });
        }
    }

    broadcastRoomEvent(roomId: string, event: RoomRealtimeEvent): void {
        const wsDoc = this.docs.get(roomId);
        if (!wsDoc || wsDoc.conns.size === 0) {
            return;
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageRoomEvent);
        encoding.writeVarString(encoder, JSON.stringify(event));
        const message = encoding.toUint8Array(encoder);

        wsDoc.conns.forEach((_, conn) => {
            this.send(conn, message);
        });
    }

    /**
     * 设置心跳
     */
    private setupPing(interval: number): void {
        this.pingInterval = setInterval(() => {
            this.wss.clients.forEach((conn) => {
                if (conn.readyState === wsReadyStateOpen) {
                    conn.ping();
                }
            });
        }, interval);
    }

    /**
     * 关闭服务器
     */
    async close(): Promise<void> {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.wss.close();

        // 关闭所有文档
        for (const wsDoc of this.docs.values()) {
            wsDoc.doc.destroy();
            wsDoc.awareness.destroy();
        }
        this.docs.clear();

        // 关闭持久化
        await this.persistence.close();

        logger.info('YJS WebSocket server closed');
    }
}
