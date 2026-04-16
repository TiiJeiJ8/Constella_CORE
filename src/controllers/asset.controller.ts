import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { successResponse, errorResponse } from '../utils/response';
import { RoomMemberModel } from '../models/roomMember.model';
import { RoomRole } from '../types/database';
import logger from '../config/logger';

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads');
const ASSETS_DIR = path.join(UPLOAD_BASE_DIR, 'assets');

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
];

const MAX_FILE_SIZE = 30 * 1024 * 1024;

interface AssetMetadata {
    id: string;
    name: string;
    size: number;
    type: string;
    uploadedBy?: string;
    uploadedAt?: string;
}

export class AssetController {
    private async ensureUploadDir(roomId: string): Promise<string> {
        const roomDir = path.join(ASSETS_DIR, roomId);
        await fs.mkdir(roomDir, { recursive: true });
        return roomDir;
    }

    private getMetadataPath(roomDir: string, assetId: string): string {
        return path.join(roomDir, `${assetId}.meta.json`);
    }

    private isMetadataFile(fileName: string): boolean {
        return fileName.endsWith('.meta.json');
    }

    private async writeMetadata(roomDir: string, metadata: AssetMetadata): Promise<void> {
        const metadataPath = this.getMetadataPath(roomDir, metadata.id);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    }

    private async readMetadata(roomDir: string, assetId: string): Promise<AssetMetadata | null> {
        try {
            const metadataPath = this.getMetadataPath(roomDir, assetId);
            const content = await fs.readFile(metadataPath, 'utf8');
            return JSON.parse(content) as AssetMetadata;
        } catch {
            return null;
        }
    }

    private async findAssetFile(roomDir: string, assetId: string): Promise<string | null> {
        const files = await fs.readdir(roomDir);
        const targetFile = files.find((fileName) => {
            if (this.isMetadataFile(fileName)) return false;
            return path.basename(fileName, path.extname(fileName)) === assetId;
        });

        return targetFile || null;
    }

    async uploadAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: roomId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            if (!roomId) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            const member = await RoomMemberModel.findByRoomAndUser(roomId, userId);
            if (!member) {
                res.status(403).json(errorResponse('Access denied: not a room member', 403));
                return;
            }

            if (member.role === RoomRole.VIEWER) {
                res.status(403).json(errorResponse('Access denied: viewer cannot upload assets', 403));
                return;
            }

            const file = (req as any).file;
            if (!file) {
                res.status(400).json(errorResponse('No file uploaded', 400));
                return;
            }

            let originalName = file.originalname;
            try {
                originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            } catch {
                originalName = file.originalname;
            }

            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                res.status(400).json(errorResponse(`File type not allowed: ${file.mimetype}`, 400));
                return;
            }

            if (file.size > MAX_FILE_SIZE) {
                res.status(400).json(errorResponse(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400));
                return;
            }

            const roomDir = await this.ensureUploadDir(roomId);
            const fileExt = path.extname(originalName);
            const assetId = randomUUID();
            const fileName = `${assetId}${fileExt}`;
            const filePath = path.join(roomDir, fileName);

            if (file.buffer) {
                await fs.writeFile(filePath, file.buffer);
            } else if (file.path) {
                await fs.rename(file.path, filePath);
            }

            const uploadedAt = new Date().toISOString();
            const metadata: AssetMetadata = {
                id: assetId,
                name: originalName,
                size: file.size,
                type: file.mimetype,
                uploadedBy: userId,
                uploadedAt,
            };
            await this.writeMetadata(roomDir, metadata);

            const asset = {
                ...metadata,
                url: `/uploads/assets/${roomId}/${fileName}`,
                canDelete: true,
            };

            logger.info(`Asset uploaded: ${assetId} for room ${roomId} by user ${userId}`);
            res.status(201).json(successResponse(asset, 'Asset uploaded successfully'));
        } catch (error) {
            logger.error('Upload asset error:', error);
            next(error);
        }
    }

    async getAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: roomId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            if (!roomId) {
                res.status(400).json(errorResponse('Room ID is required', 400));
                return;
            }

            const member = await RoomMemberModel.findByRoomAndUser(roomId, userId);
            if (!member) {
                res.status(403).json(errorResponse('Access denied: not a room member', 403));
                return;
            }
            const isAdmin = member.role === RoomRole.OWNER || member.role === RoomRole.ADMIN;
            const roomDir = path.join(ASSETS_DIR, roomId);

            try {
                const files = await fs.readdir(roomDir);
                const assets = await Promise.all(
                    files
                        .filter((fileName) => !this.isMetadataFile(fileName))
                        .map(async (fileName) => {
                            const filePath = path.join(roomDir, fileName);
                            const stat = await fs.stat(filePath);
                            const assetId = path.basename(fileName, path.extname(fileName));
                            const metadata = await this.readMetadata(roomDir, assetId);

                            return {
                                id: assetId,
                                name: metadata?.name || fileName,
                                type: metadata?.type,
                                size: metadata?.size || stat.size,
                                url: `/uploads/assets/${roomId}/${fileName}`,
                                uploadedBy: metadata?.uploadedBy,
                                uploadedAt: metadata?.uploadedAt || stat.birthtime.toISOString(),
                                canDelete: isAdmin || metadata?.uploadedBy === userId,
                            };
                        })
                );

                res.status(200).json(successResponse(assets, 'Assets retrieved successfully'));
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    res.status(200).json(successResponse([], 'No assets found'));
                } else {
                    throw err;
                }
            }
        } catch (error) {
            logger.error('Get assets error:', error);
            next(error);
        }
    }

    async deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: roomId, assetId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json(errorResponse('User authentication required', 401));
                return;
            }

            if (!roomId || !assetId) {
                res.status(400).json(errorResponse('Room ID and Asset ID are required', 400));
                return;
            }

            const member = await RoomMemberModel.findByRoomAndUser(roomId, userId);
            if (!member) {
                res.status(403).json(errorResponse('Access denied: not a room member', 403));
                return;
            }

            const isAdmin = member.role === RoomRole.OWNER || member.role === RoomRole.ADMIN;
            const roomDir = path.join(ASSETS_DIR, roomId);

            try {
                const targetFile = await this.findAssetFile(roomDir, assetId);
                const metadata = await this.readMetadata(roomDir, assetId);

                if (!targetFile) {
                    res.status(404).json(errorResponse('Asset not found', 404));
                    return;
                }

                const isUploader = metadata?.uploadedBy === userId;
                if (!isAdmin && !isUploader) {
                    res.status(403).json(errorResponse('Access denied: insufficient permissions to delete this asset', 403));
                    return;
                }

                await fs.unlink(path.join(roomDir, targetFile));
                try {
                    await fs.unlink(this.getMetadataPath(roomDir, assetId));
                } catch {
                    // ignore missing metadata
                }

                logger.info(`Asset deleted: ${assetId} from room ${roomId} by user ${userId}`);
                res.status(200).json(successResponse({ id: assetId }, 'Asset deleted successfully'));
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    res.status(404).json(errorResponse('Asset not found', 404));
                } else {
                    throw err;
                }
            }
        } catch (error) {
            logger.error('Delete asset error:', error);
            next(error);
        }
    }
}

export const assetController = new AssetController();

