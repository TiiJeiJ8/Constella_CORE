/**
 * Jest Setup File
 * 在所有测试运行前执行的设置
 */

// 设置测试超时时间
jest.setTimeout(30000);

// Mock 数据存储
const mockUsers = new Map();
const mockRooms = new Map();
const mockRefreshTokens = new Map();

// Mock 数据库查询
jest.mock('../src/config/database', () => {
    const originalModule = jest.requireActual('../src/config/database');

    return {
        ...originalModule,
        db: {
            initialize: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            query: jest.fn().mockImplementation(async (text: string, params?: any[]) => {
                // 根据查询类型返回 mock 数据
                if (text.includes('INSERT INTO users')) {
                    const [username, email, passwordHash] = params || [];
                    const userId = `user_${Date.now()}_${Math.random()}`;
                    mockUsers.set(userId, { id: userId, username, email, passwordHash });
                    return { rows: [{ id: userId, username, email }], rowCount: 1 };
                }

                if (text.includes('SELECT') && text.includes('FROM users WHERE email')) {
                    const [email] = params || [];
                    const user = Array.from(mockUsers.values()).find((u: any) => u.email === email);
                    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
                }

                if (text.includes('SELECT') && text.includes('FROM users WHERE username')) {
                    const [username] = params || [];
                    const user = Array.from(mockUsers.values()).find(
                        (u: any) => u.username === username
                    );
                    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
                }

                if (text.includes('SELECT') && text.includes('FROM users WHERE id')) {
                    const [id] = params || [];
                    const user = mockUsers.get(id);
                    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
                }

                // 默认返回空结果
                return { rows: [], rowCount: 0 };
            }),
            getType: jest.fn().mockReturnValue('memory'),
        },
    };
});

// 全局测试钩子
beforeAll(async () => {
    console.log('🧪 开始运行测试套件...');
});

afterAll(async () => {
    console.log('✅ 测试套件运行完成');
    mockUsers.clear();
    mockRooms.clear();
    mockRefreshTokens.clear();
});

// 每个测试后清理
afterEach(() => {
    jest.clearAllMocks();
});

// 全局错误处理
process.on('unhandledRejection', (error) => {
    console.error('未处理的 Promise 拒绝:', error);
});

// 环境变量设置
process.env.NODE_ENV = 'test';
