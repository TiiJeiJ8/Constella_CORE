import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { RoomMemberModel } from '../models/roomMember.model';
import logger from '../config/logger';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// 文件上传的基础目录
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads');
const ASSETS_DIR = path.join(UPLOAD_BASE_DIR, 'assets');

// 允许的文件类型
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
];

// 最大文件大小（30MB）
const MAX_FILE_SIZE = 30 * 1024 * 1024;

/**
 * 资源控制器
 */
export class AssetController {
    /**
     * 确保上传目录存在
     */
    private async ensureUploadDir(roomId: string): Promise<string> {
        const roomDir = path.join(ASSETS_DIR, roomId);
        await fs.mkdir(roomDir, { recursive: true });
        return roomDir;
    }

    /**
     * 上传资源
     * POST /api/v1/rooms/:id/assets
     */
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

            // 检查用户是否有权限访问该房间
            const member = await RoomMemberModel.findByRoomAndUser(roomId, userId);
            if (!member) {
                res.status(403).json(errorResponse('Access denied: not a room member', 403));
                return;
            }

            // 检查是否有文件上传
            const file = (req as any).file;
            if (!file) {
                res.status(400).json(errorResponse('No file uploaded', 400));
                return;
            }

            // 修复中文文件名编码问题（multer 默认使用 latin1 编码）
            let originalName = file.originalname;
            try {
                // 尝试将 latin1 编码的字符串转换为 UTF-8
                originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            } catch (e) {
                // 如果转换失败，保持原样
                originalName = file.originalname;
            }

            // 验证文件类型
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                res.status(400).json(errorResponse(`File type not allowed: ${file.mimetype}`, 400));
                return;
            }

            // 验证文件大小
            if (file.size > MAX_FILE_SIZE) {
                res.status(400).json(errorResponse(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400));
                return;
            }

            // 确保上传目录存在
            const roomDir = await this.ensureUploadDir(roomId);

            // 生成唯一文件名（使用原始扩展名）
            const fileExt = path.extname(originalName);
            const assetId = uuidv4();
            const fileName = `${assetId}${fileExt}`;
            const filePath = path.join(roomDir, fileName);

            // 保存文件（如果使用内存存储，需要写入磁盘）
            if (file.buffer) {
                await fs.writeFile(filePath, file.buffer);
            } else if (file.path) {
                // 如果使用磁盘存储，文件已经保存，只需移动
                await fs.rename(file.path, filePath);
            }

            // 构建资源 URL
            const assetUrl = `/uploads/assets/${roomId}/${fileName}`;

            const asset = {
                id: assetId,
                name: originalName,  // 使用修复后的文件名
                type: file.mimetype,
                size: file.size,
                url: assetUrl,
                uploadedBy: userId,
                uploadedAt: new Date().toISOString(),
            };

            logger.info(`Asset uploaded: ${assetId} for room ${roomId} by user ${userId}`);
            res.status(201).json(successResponse(asset, 'Asset uploaded successfully'));
        } catch (error) {
            logger.error('Upload asset error:', error);
            next(error);
        }
    }

    /**
     * 获取房间的资源列表
     * GET /api/v1/rooms/:id/assets
     */
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

            // 检查用户是否有权限访问该房间
            const member = await RoomMemberModel.findByRoomAndUser(roomId, userId);
            if (!member) {
                res.status(403).json(errorResponse('Access denied: not a room member', 403));
                return;
            }

            const roomDir = path.join(ASSETS_DIR, roomId);
            
            try {
                const files = await fs.readdir(roomDir);
                const assets = await Promise.all(
                    files.map(async (fileName) => {
                        const filePath = path.join(roomDir, fileName);
                        const stat = await fs.stat(filePath);
                        const assetId = path.basename(fileName, path.extname(fileName));
                        
                        return {
                            id: assetId,
                            name: fileName,
                            size: stat.size,
                            url: `/uploads/assets/${roomId}/${fileName}`,
                            uploadedAt: stat.birthtime.toISOString(),
                        };
                    })
                );

                res.status(200).json(successResponse(assets, 'Assets retrieved successfully'));
            } catch (err: any) {
                if (err.code === 'ENOENT') {
                    // 目录不存在，返回空数组
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

    /**
     * 删除资源
     * DELETE /api/v1/rooms/:id/assets/:assetId
     */
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

            // 检查用户是否是管理员或房主
            const isAdmin = await RoomMemberModel.isAdmin(roomId, userId);
            if (!isAdmin) {
                res.status(403).json(errorResponse('Access denied: admin privileges required', 403));
                return;
            }

            const roomDir = path.join(ASSETS_DIR, roomId);
            
            try {
                const files = await fs.readdir(roomDir);
                const targetFile = files.find(f => f.startsWith(assetId));
                
                if (!targetFile) {
                    res.status(404).json(errorResponse('Asset not found', 404));
                    return;
                }

                await fs.unlink(path.join(roomDir, targetFile));
                
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
