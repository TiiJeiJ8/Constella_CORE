import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { db } from '../config/database';
import logger from '../config/logger';
import { RefreshTokenModel } from '../models/refreshToken.model';
import { RoomModel } from '../models/room.model';

type RoomSnapshotRecord = {
    id: string;
    room_id: string;
    doc_name: string;
    version?: number;
    updated_at?: string | Date;
    is_snapshot?: boolean;
};

const uploadsAssetsDir = path.join(process.cwd(), 'uploads', 'assets');

async function cleanupOldSnapshots(snapshotRetention: number): Promise<number> {
    if (snapshotRetention < 1) return 0;

    const result = await db.query<RoomSnapshotRecord>(
        'SELECT * FROM room_documents WHERE is_snapshot = true'
    );

    const grouped = new Map<string, RoomSnapshotRecord[]>();
    result.rows.forEach((row) => {
        const key = `${row.room_id}::${row.doc_name || 'room'}`;
        const list = grouped.get(key) || [];
        list.push(row);
        grouped.set(key, list);
    });

    let deletedCount = 0;
    for (const [, records] of grouped) {
        records.sort((a, b) => {
            const versionDiff = (Number(b.version) || 0) - (Number(a.version) || 0);
            if (versionDiff !== 0) return versionDiff;

            const aTime = new Date(a.updated_at || 0).getTime() || 0;
            const bTime = new Date(b.updated_at || 0).getTime() || 0;
            return bTime - aTime;
        });

        const staleRecords = records.slice(snapshotRetention);
        for (const stale of staleRecords) {
            await db.query('DELETE FROM room_documents WHERE id = $1', [stale.id]);
            deletedCount++;
        }
    }

    return deletedCount;
}

async function cleanupExpiredTokens(tokenGraceMs: number): Promise<number> {
    const deleted = await RefreshTokenModel.deleteExpired();
    if (tokenGraceMs <= 0) return deleted;

    // Optional second-pass for long-dead revoked tokens.
    const graceThreshold = new Date(Date.now() - tokenGraceMs).toISOString();
    const result = await db.query(
        'DELETE FROM refresh_tokens WHERE revoked = true AND updated_at < $1',
        [graceThreshold]
    );
    return deleted + (result.rowCount || 0);
}

async function cleanupOrphanAssetDirs(orphanMaxAgeMs: number): Promise<number> {
    let roomDirs: string[] = [];
    try {
        roomDirs = await fs.readdir(uploadsAssetsDir);
    } catch {
        return 0;
    }

    let deletedCount = 0;
    for (const roomId of roomDirs) {
        const dirPath = path.join(uploadsAssetsDir, roomId);
        let stat;
        try {
            stat = await fs.stat(dirPath);
            if (!stat.isDirectory()) continue;
        } catch {
            continue;
        }

        const room = await RoomModel.findById(roomId);
        if (room) continue;

        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs < orphanMaxAgeMs) continue;

        await fs.rm(dirPath, { recursive: true, force: true });
        deletedCount++;
    }

    return deletedCount;
}

export function startDatabaseMaintenance() {
    const settings = config.performance.maintenance;
    if (!settings.enabled) {
        logger.info('Database maintenance disabled');
        return {
            stop: () => undefined
        };
    }

    let stopped = false;
    let running = false;
    let timer: NodeJS.Timeout | null = null;

    const runOnce = async () => {
        if (stopped || running) return;
        running = true;

        try {
            const [deletedSnapshots, deletedTokens, deletedAssetDirs] = await Promise.all([
                cleanupOldSnapshots(settings.snapshotRetention),
                cleanupExpiredTokens(settings.tokenGraceMs),
                cleanupOrphanAssetDirs(settings.assetOrphanMaxAgeMs),
            ]);

            if (deletedSnapshots || deletedTokens || deletedAssetDirs) {
                logger.info(
                    `DB maintenance completed (snapshots=${deletedSnapshots}, tokens=${deletedTokens}, orphanAssetDirs=${deletedAssetDirs})`
                );
            } else {
                logger.debug('DB maintenance completed (no changes)');
            }
        } catch (error) {
            logger.error('DB maintenance failed:', error);
        } finally {
            running = false;
        }
    };

    void runOnce();
    timer = setInterval(() => {
        void runOnce();
    }, settings.intervalMs);

    logger.info(
        `Database maintenance started (interval=${settings.intervalMs}ms, snapshotRetention=${settings.snapshotRetention})`
    );

    return {
        stop: () => {
            stopped = true;
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            logger.info('Database maintenance stopped');
        }
    };
}
