import * as Y from 'yjs';
import { Level } from 'level';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../config/logger';

/**
 * YJS 持久化接口
 */
export interface IPersistence {
    /**
     * 获取文档的持久化状态
     */
    getYDoc(docName: string): Promise<Y.Doc>;

    /**
     * 保存文档更新
     */
    storeUpdate(docName: string, update: Uint8Array): Promise<void>;

    /**
     * 获取文档的完整状态
     */
    getStateVector(docName: string): Promise<Uint8Array>;

    /**
     * 清理文档
     */
    clearDocument(docName: string): Promise<void>;

    /**
     * 关闭持久化连接
     */
    close(): Promise<void>;
}

/**
 * 内存持久化实现（开发/测试用）
 */
export class MemoryPersistence implements IPersistence {
    private docs: Map<string, Y.Doc> = new Map();

    async getYDoc(docName: string): Promise<Y.Doc> {
        if (!this.docs.has(docName)) {
            const doc = new Y.Doc();
            this.docs.set(docName, doc);
            logger.info(`Created new in-memory Y.Doc for: ${docName}`);
        }
        return this.docs.get(docName)!;
    }

    async storeUpdate(docName: string, update: Uint8Array): Promise<void> {
        const doc = await this.getYDoc(docName);
        Y.applyUpdate(doc, update);
    }

    async getStateVector(docName: string): Promise<Uint8Array> {
        const doc = await this.getYDoc(docName);
        return Y.encodeStateVector(doc);
    }

    async clearDocument(docName: string): Promise<void> {
        this.docs.delete(docName);
        logger.info(`Cleared in-memory Y.Doc: ${docName}`);
    }

    async close(): Promise<void> {
        this.docs.clear();
        logger.info('Memory persistence closed');
    }
}

/**
 * LevelDB 持久化实现（生产环境推荐）
 */
export class LevelDBPersistence implements IPersistence {
    private db: Level<string, Uint8Array>;
    private docs: Map<string, Y.Doc> = new Map();
    private ready: Promise<void>;
    private isClosed = false;
    private fallback: MemoryPersistence | null = null;
    private openError: unknown = null;

    constructor(
        private dbPath: string,
        private options: { fallbackToMemoryOnLock?: boolean } = {}
    ) {
        // 确保目录存在
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Level<string, Uint8Array>(dbPath, {
            valueEncoding: 'binary',
        });

        this.ready = this.db.open().catch((error: unknown) => {
            if (this.shouldFallbackToMemory(error)) {
                this.fallback = new MemoryPersistence();
                logger.warn(
                    `LevelDB is locked at ${this.dbPath}, falling back to in-memory Yjs persistence for this process`,
                    error
                );
                return;
            }

            this.openError = error;
            logger.error(`Failed to open LevelDB persistence at ${this.dbPath}`, error);
        });

        logger.info(`LevelDB persistence initialized at: ${dbPath}`);
    }

    private getErrorCode(error: unknown): string | undefined {
        if (typeof error !== 'object' || error === null) {
            return undefined;
        }

        const errorWithCode = error as { code?: string; cause?: { code?: string } };
        return errorWithCode.cause?.code || errorWithCode.code;
    }

    private shouldFallbackToMemory(error: unknown): boolean {
        return Boolean(this.options.fallbackToMemoryOnLock) && this.getErrorCode(error) === 'LEVEL_LOCKED';
    }

    private async ensureOpen(): Promise<void> {
        if (this.fallback) {
            return;
        }

        if (this.isClosed) {
            throw new Error('LevelDB persistence is already closed');
        }

        await this.ready;

        if (this.fallback) {
            return;
        }

        if (this.openError) {
            throw this.openError;
        }
    }

    private getUpdateKey(docName: string, index: number): string {
        return `${docName}:update:${index}`;
    }

    private getMetaKey(docName: string): string {
        return `${docName}:meta`;
    }

    async getYDoc(docName: string): Promise<Y.Doc> {
        await this.ensureOpen();

        if (this.fallback) {
            return this.fallback.getYDoc(docName);
        }

        if (this.docs.has(docName)) {
            return this.docs.get(docName)!;
        }

        const doc = new Y.Doc();
        this.docs.set(docName, doc);

        try {
            // 读取元数据
            const metaKey = this.getMetaKey(docName);
            const metaBuffer = await this.db.get(metaKey);

            // 检查是否存在数据
            if (!metaBuffer) {
                // 文档不存在，创建新的
                await this.db.put(
                    metaKey,
                    Buffer.from(JSON.stringify({ updateCount: 0 }))
                );
                logger.info(`Created new Y.Doc in LevelDB: ${docName}`);
                return doc;
            }

            const meta = JSON.parse(Buffer.from(metaBuffer).toString());

            // 应用所有更新
            const updates: Uint8Array[] = [];
            for (let i = 0; i < meta.updateCount; i++) {
                const updateKey = this.getUpdateKey(docName, i);
                const update = await this.db.get(updateKey);
                updates.push(update);
            }

            // 合并所有更新
            if (updates.length > 0) {
                const mergedUpdate = Y.mergeUpdates(updates);
                Y.applyUpdate(doc, mergedUpdate);
                logger.info(`Loaded Y.Doc from LevelDB: ${docName} (${updates.length} updates)`);
            }
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code === 'LEVEL_NOT_FOUND') {
                // 文档不存在，创建新的
                await this.db.put(
                    this.getMetaKey(docName),
                    Buffer.from(JSON.stringify({ updateCount: 0 }))
                );
                logger.info(`Created new Y.Doc in LevelDB: ${docName}`);
            } else {
                logger.error(`Error loading Y.Doc from LevelDB: ${docName}`, error);
                throw error;
            }
        }

        return doc;
    }

    async storeUpdate(docName: string, update: Uint8Array): Promise<void> {
        await this.ensureOpen();

        if (this.fallback) {
            return this.fallback.storeUpdate(docName, update);
        }

        try {
            // 获取当前更新数量
            const metaKey = this.getMetaKey(docName);
            let meta = { updateCount: 0 };

            try {
                const metaBuffer = await this.db.get(metaKey);
                meta = JSON.parse(Buffer.from(metaBuffer).toString());
            } catch (error: unknown) {
                if ((error as NodeJS.ErrnoException).code !== 'LEVEL_NOT_FOUND') {
                    throw error;
                }
            }

            // 存储更新
            const updateKey = this.getUpdateKey(docName, meta.updateCount);
            await this.db.put(updateKey, update);

            // 更新元数据
            meta.updateCount++;
            await this.db.put(metaKey, Buffer.from(JSON.stringify(meta)));

            // 应用更新到内存文档
            const doc = await this.getYDoc(docName);
            Y.applyUpdate(doc, update);

            logger.debug(`Stored update for ${docName} (update #${meta.updateCount})`);
        } catch (error) {
            logger.error(`Error storing update for ${docName}:`, error);
            throw error;
        }
    }

    async getStateVector(docName: string): Promise<Uint8Array> {
        await this.ensureOpen();

        if (this.fallback) {
            return this.fallback.getStateVector(docName);
        }

        const doc = await this.getYDoc(docName);
        return Y.encodeStateVector(doc);
    }

    async clearDocument(docName: string): Promise<void> {
        await this.ensureOpen();

        if (this.fallback) {
            return this.fallback.clearDocument(docName);
        }

        try {
            const metaKey = this.getMetaKey(docName);
            const metaBuffer = await this.db.get(metaKey);
            const meta = JSON.parse(Buffer.from(metaBuffer).toString());

            // 删除所有更新
            for (let i = 0; i < meta.updateCount; i++) {
                await this.db.del(this.getUpdateKey(docName, i));
            }

            // 删除元数据
            await this.db.del(metaKey);

            // 从内存中删除
            this.docs.delete(docName);

            logger.info(`Cleared document from LevelDB: ${docName}`);
        } catch (error: unknown) {
            if ((error as NodeJS.ErrnoException).code !== 'LEVEL_NOT_FOUND') {
                logger.error(`Error clearing document ${docName}:`, error);
                throw error;
            }
        }
    }

    async close(): Promise<void> {
        if (this.isClosed) {
            return;
        }

        this.isClosed = true;

        try {
            await this.ready;
        } catch (error) {
            logger.warn('LevelDB failed to open before close was requested', error);
        }

        if (this.fallback) {
            await this.fallback.close();
            this.fallback = null;
        }

        const status = (this.db as { status?: string }).status;
        if (status === 'open' || status === 'opening') {
            await this.db.close();
        }

        this.docs.clear();
        logger.info('LevelDB persistence closed');
    }

    /**
     * 压缩文档（合并所有更新为单个快照）
     */
    async compactDocument(docName: string): Promise<void> {
        try {
            const doc = await this.getYDoc(docName);
            const snapshot = Y.encodeStateAsUpdate(doc);

            // 清除旧数据
            await this.clearDocument(docName);

            // 保存压缩后的快照
            await this.storeUpdate(docName, snapshot);

            logger.info(`Compacted document: ${docName}`);
        } catch (error) {
            logger.error(`Error compacting document ${docName}:`, error);
            throw error;
        }
    }
}

/**
 * 创建持久化实例
 */
export function createPersistence(type: string, options: Record<string, unknown>): IPersistence {
    switch (type) {
        case 'leveldb':
            return new LevelDBPersistence(options.leveldbPath as string, {
                fallbackToMemoryOnLock: Boolean(options.fallbackToMemoryOnLock),
            });
        case 'memory':
        default:
            return new MemoryPersistence();
    }
}
