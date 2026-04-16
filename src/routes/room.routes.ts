import { Router } from 'express';
import multer from 'multer';
import { roomController } from '../controllers/room.controller';
import { assetController } from '../controllers/asset.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 閰嶇疆 multer 浣跨敤鍐呭瓨瀛樺偍
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

/**
 * POST /api/v1/rooms
 * 鍒涘缓鏂版埧闂达紙闇€瑕佽璇侊級
 */
router.post('/', authenticateToken, (req, res, next) => roomController.createRoom(req, res, next));

/**
 * GET /api/v1/rooms/all
 * 鑾峰彇鎵€鏈夋埧闂达紙鍏紑+绉佸瘑锛岄渶瑕佽璇佷互鑾峰彇瑙掕壊淇℃伅锛? */
router.get('/all', authenticateToken, (req, res, next) => roomController.getAllRooms(req, res, next));

/**
 * GET /api/v1/rooms
 * 鑾峰彇鎴块棿鍒楄〃锛堟敮鎸佸垎椤典笌鎸夌敤鎴疯繃婊わ紝闇€瑕佽璇佷互鑾峰彇瑙掕壊淇℃伅锛? */
router.get('/', authenticateToken, (req, res, next) => roomController.getRooms(req, res, next));

/**
 * GET /api/v1/rooms/:id
 * 鑾峰彇鎴块棿璇︽儏锛堝彲閫夎璇侊紝璁よ瘉鍚庡彲鑾峰彇鐢ㄦ埛瑙掕壊锛? */
/**
 * GET /api/v1/rooms/:id/members
 * Room member list for member management.
 */
router.get('/:id/members', authenticateToken, (req, res, next) => roomController.getRoomMembers(req, res, next));

router.get('/:id', authenticateToken, (req, res, next) => roomController.getRoomById(req, res, next));

/**
 * DELETE /api/v1/rooms/:id
 * 鍒犻櫎鎴块棿锛堥渶瑕佽璇侊紝浠呮埧涓诲彲鍒犻櫎锛? */
router.delete('/:id', authenticateToken, (req, res, next) =>
    roomController.deleteRoom(req, res, next)
);

/**
 * POST /api/v1/rooms/:id/join
 * 鍔犲叆鎴块棿锛堥渶瑕佽璇侊級
 */
router.post('/:id/join', authenticateToken, (req, res, next) =>
    roomController.joinRoom(req, res, next)
);

/**
 * POST /api/v1/rooms/:id/invite
 * 閭€璇风敤鎴峰姞鍏ユ埧闂达紙闇€瑕佽璇侊紝鏉冮檺锛氭埧涓绘垨绠＄悊鍛橈級
 */
router.post('/:id/invite', authenticateToken, (req, res, next) =>
    roomController.inviteUser(req, res, next)
);

/**
 * PUT /api/v1/rooms/:id/permissions
 * 鏇存柊鎴愬憳鏉冮檺锛堥渶瑕佽璇侊紝鏉冮檺锛氭埧涓绘垨绠＄悊鍛橈級
 */
router.put('/:id/permissions', authenticateToken, (req, res, next) =>
    roomController.updatePermissions(req, res, next)
);

/**
 * POST /api/v1/rooms/:id/relay-token
 * 鐢熸垚 Relay Token 鐢ㄤ簬 WSS 杩炴帴锛堥渶瑕佽璇侊級
 */
router.post('/:id/relay-token', authenticateToken, (req, res, next) =>
    roomController.getRelayToken(req, res, next)
);

/**
 * POST /api/v1/rooms/:id/assets
 * 涓婁紶璧勬簮锛堥渶瑕佽璇侊級
 */
router.post('/:id/assets', authenticateToken, upload.single('file'), (req, res, next) =>
    assetController.uploadAsset(req, res, next)
);

/**
 * GET /api/v1/rooms/:id/assets
 * 鑾峰彇鎴块棿璧勬簮鍒楄〃锛堥渶瑕佽璇侊級
 */
router.get('/:id/assets', authenticateToken, (req, res, next) =>
    assetController.getAssets(req, res, next)
);

/**
 * DELETE /api/v1/rooms/:id/assets/:assetId
 * 鍒犻櫎璧勬簮锛堥渶瑕佽璇侊紝浠呯鐞嗗憳锛? */
router.delete('/:id/assets/:assetId', authenticateToken, (req, res, next) =>
    assetController.deleteAsset(req, res, next)
);

export default router;

