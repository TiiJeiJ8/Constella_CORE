import { UserModel } from '../models/user.model';
import logger from '../config/logger';

/**
 * 用户服务
 */
export class UserService {
    /**
     * 根据 ID 获取用户信息（不含密码）
     */
    async getUserById(id: string) {
        try {
            const user = await UserModel.findById(id);

            if (!user) {
                return null;
            }

            // 移除敏感信息
            const { password_hash, ...userWithoutPassword } = user;

            return userWithoutPassword;
        } catch (error) {
            logger.error('Error getting user by ID:', error);
            throw error;
        }
    }
}

export const userService = new UserService();
