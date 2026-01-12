import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/v1/rooms
 * 创建新房间（需要认证）
 */
router.post('/', authenticateToken, (req, res, next) => roomController.createRoom(req, res, next));

/**
 * GET /api/v1/rooms/all
 * 获取所有房间（公开+私密，需要认证以获取角色信息）
 */
router.get('/all', authenticateToken, (req, res, next) => roomController.getAllRooms(req, res, next));

/**
 * GET /api/v1/rooms
 * 获取房间列表（支持分页与按用户过滤，需要认证以获取角色信息）
 */
router.get('/', authenticateToken, (req, res, next) => roomController.getRooms(req, res, next));

/**
 * GET /api/v1/rooms/:id
 * 获取房间详情（可选认证，认证后可获取用户角色）
 */
router.get('/:id', authenticateToken, (req, res, next) => roomController.getRoomById(req, res, next));

/**
 * DELETE /api/v1/rooms/:id
 * 删除房间（需要认证，仅房主可删除）
 */
router.delete('/:id', authenticateToken, (req, res, next) =>
    roomController.deleteRoom(req, res, next)
);

/**
 * POST /api/v1/rooms/:id/join
 * 加入房间（需要认证）
 */
router.post('/:id/join', authenticateToken, (req, res, next) =>
    roomController.joinRoom(req, res, next)
);

/**
 * POST /api/v1/rooms/:id/invite
 * 邀请用户加入房间（需要认证，权限：房主或管理员）
 */
router.post('/:id/invite', authenticateToken, (req, res, next) =>
    roomController.inviteUser(req, res, next)
);

/**
 * PUT /api/v1/rooms/:id/permissions
 * 更新成员权限（需要认证，权限：房主或管理员）
 */
router.put('/:id/permissions', authenticateToken, (req, res, next) =>
    roomController.updatePermissions(req, res, next)
);

/**
 * POST /api/v1/rooms/:id/relay-token
 * 生成 Relay Token 用于 WSS 连接（需要认证）
 */
router.post('/:id/relay-token', authenticateToken, (req, res, next) =>
    roomController.getRelayToken(req, res, next)
);

export default router;
